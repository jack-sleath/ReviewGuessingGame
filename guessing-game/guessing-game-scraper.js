(function () {
    if (!window.GG) return;
    const GG = window.GG;
    const { config, state } = GG;

    GG.scraper = GG.scraper || {};

    // How many films to fetch in parallel.
    const MAX_CONCURRENT_REQUESTS = 4;

    /**
     * These are now mostly no-ops kept for compatibility.
     * Game.start still calls ensureHiddenIframe + loadNextReviewPage
     * but all real work is done via fetch.
     */
    GG.scraper.ensureHiddenIframe = function ensureHiddenIframe() {
        // No-op in fetch-based scraper
    };

    GG.scraper.destroyHiddenIframe = function destroyHiddenIframe() {
        // No-op in fetch-based scraper
        state.hiddenIframe = null;
        GG.logger.log("Guessing Game hidden iframe disabled (fetch-based scraping)");
    };

    /**
     * Entry point from GG.game.start
     * Kicks off the concurrent fetch pipeline.
     */
    GG.scraper.loadNextReviewPage = function loadNextReviewPage() {
        if (!state.filmQueue.length) {
            GG.logger.log("No films to scrape");
            GG.ui.updateLoading();
            GG.ui.showNoQuestions();
            return;
        }

        GG.logger.log("Starting fetch-based scraping for films:", state.filmQueue);

        state.currentIndex = 0;
        state.activeRequests = 0;

        GG.ui.updateLoading();
        fillRequestSlots();
    };

    /**
     * Fill up concurrency slots until we either:
     * - reach MAX_CONCURRENT_REQUESTS
     * - or run out of films to start
     */
    function fillRequestSlots() {
        while (
            state.activeRequests < MAX_CONCURRENT_REQUESTS &&
            state.currentIndex < state.filmQueue.length
        ) {
            const index = state.currentIndex;
            state.currentIndex += 1;
            state.activeRequests += 1;
            scrapeFilmAt(index);
        }
    }

    /**
     * Scrape a single film (one or two pages, random then fallback to page 1).
     */
    function scrapeFilmAt(index) {
        const filmUrl = state.filmQueue[index];
        const match = filmUrl.match(/\/film\/([^/]+)\//);

        if (!match) {
            GG.logger.warn("Could not extract film slug from URL:", filmUrl);
            onFilmFinished();
            return;
        }

        const slug = match[1];

        // Pick from a small range — most films have plenty of reviews on early
        // pages, and halving cascades from page 100 burn 7 sequential fetches
        // in the worst case. Range 1-10 caps halving at ~4 fetches.
        const randomPage = Math.floor(Math.random() * 10) + 1;
        fetchReviewForSlug(filmUrl, slug, randomPage)
            .then(question => {
                if (question) {
                    state.questionQueue.push(question);
                    GG.logger.log("Added question to queue:", question);

                    // Stream: start the quiz on the first question that lands,
                    // and wake the renderer if the player has caught up and
                    // is staring at a "loading next question" placeholder.
                    if (!state.quizStarted) {
                        state.quizStarted = true;
                        state.currentQuestionIndex = 0;
                        GG.ui.initQuiz();
                    } else if (state.waitingForNext) {
                        state.waitingForNext = false;
                        GG.ui.renderCurrentQuestion();
                    }
                } else {
                    GG.logger.log("No usable review found for film:", filmUrl);
                }
            })
            .catch(err => {
                GG.logger.error("Error fetching review for film:", filmUrl, err);
            })
            .finally(() => {
                GG.ui.updateLoading();
                onFilmFinished();
            });
    }

    /**
     * Called after each film finishes (successfully or not).
     * Decides whether to start more work or finish the whole scrape.
     */
    function onFilmFinished() {
        state.activeRequests -= 1;

        // If there are still films left to start, fill more slots.
        if (state.currentIndex < state.filmQueue.length) {
            fillRequestSlots();
            return;
        }

        // No more films to start; wait for all active requests to finish.
        if (state.activeRequests > 0) {
            return;
        }

        // All films done.
        GG.logger.log("Finished fetching review pages for all films");
        GG.logger.log("Question queue built:", state.questionQueue);

        GG.scraper.destroyHiddenIframe(); // no-op but keeps logs consistent
        state.scrapingComplete = true;

        if (!state.questionQueue.length) {
            // Nothing was ever found — quiz never started, show empty state.
            GG.ui.showNoQuestions();
        } else if (state.waitingForNext) {
            // Player caught up while scraping ran on. Nothing more is coming
            // so jump straight to the final score.
            state.waitingForNext = false;
            GG.ui.showFinalScore();
        }
        // Otherwise the quiz is mid-flight and will surface the final score
        // naturally when the player exhausts the queue.
    }

    // Lowercase and strip diacritics so "n\u00E3o" matches "nao", "tr\u00E8s" matches "tres".
    // Many reviewers omit accents; matching becomes accent-agnostic for both
    // the stopword sets (normalized at load time) and incoming tokens.
    function normalize(s) {
        return (s || '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
    }

    // Common function words + language-distinctive review vocabulary, per language.
    // Reviews are scored against each set; the highest-scoring language wins.
    // Tokens are extracted as whole words (runs of Unicode letters) so partial
    // matches inside other words can't happen \u2014 "a" never matches inside "facade".
    // Avoid cross-language cognates (e.g. "film", "scene") \u2014 they add noise
    // without signal. Sentiment/verb forms boost detection on terse reviews
    // that lack function words ("best ever", "loved it").
    const STOPWORD_SOURCES = {
        en: ['the','a','an','and','or','but','of','in','on','at','to','for','with','is','was','are','were','be','been','this','that','it','its','i','you','he','she','we','they','my','your','his','her','our','their','not','no','so','do','does','did','have','has','had','will','would','can','could','just','very','really','what','when','where','who','why','how','all','some','like','about','from','by','as','if','than','then','good','bad','great','awful','best','worst','love','loved','hate','hated','watch','watched','watching','ever','never','too','also','only','shit','fuck','fucking','damn','hell','ass','bitch','crap','trash'],
        es: ['el','la','los','las','un','una','unos','unas','y','o','pero','de','en','con','por','para','es','son','era','ser','estar','este','esta','esto','ese','esa','eso','que','qu\u00E9','no','me','te','se','lo','le','mi','tu','su','muy','m\u00E1s','menos','todo','tambi\u00E9n','porque','cuando','donde','como','hay','ha','han','bueno','buena','malo','mala','mejor','peor','encanta','odio','vi','vista','genial','incre\u00EDble','horrible','siempre','nunca','aunque','mierda','joder','puta','co\u00F1o','carajo','pendejo'],
        pt: ['o','os','as','um','uma','uns','umas','e','ou','mas','de','em','no','na','nos','nas','para','com','por','\u00E9','s\u00E3o','foi','ser','estar','este','esta','isto','esse','essa','isso','que','n\u00E3o','me','te','se','lhe','meu','teu','seu','muito','mais','menos','tudo','tamb\u00E9m','porque','quando','onde','como','h\u00E1','bom','boa','mau','melhor','pior','adoro','odeio','vi','visto','\u00F3timo','p\u00E9ssimo','sempre','nunca','ainda','merda','porra','caralho','foda','bosta'],
        fr: ['le','la','les','un','une','des','et','ou','mais','de','du','en','au','aux','avec','pour','par','est','sont','\u00E9tait','\u00EAtre','ce','cet','cette','ces','qui','que','quoi','ne','pas','plus','moins','je','tu','il','elle','nous','vous','ils','elles','me','te','se','mon','ton','son','notre','votre','leur','tr\u00E8s','aussi','parce','quand','o\u00F9','comme','bon','bonne','mauvais','meilleur','pire','adore','d\u00E9teste','aim\u00E9','vu','g\u00E9nial','jamais','toujours','merde','putain','con','salaud','salope'],
        de: ['der','die','das','den','dem','des','ein','eine','einen','einem','einer','und','oder','aber','von','im','an','am','auf','mit','f\u00FCr','ist','sind','war','sein','ich','du','er','sie','es','wir','ihr','sich','mein','dein','unser','nicht','nein','ja','sehr','mehr','auch','weil','wenn','wo','wie','gut','schlecht','toll','beste','schlimmste','liebe','hasse','gesehen','immer','nie','schon','aber','noch','schei\u00DFe','scheisse','verdammt','arsch','mist'],
        it: ['il','lo','gli','le','un','uno','una','e','o','ma','di','da','con','per','\u00E8','sono','era','essere','questo','questa','questi','queste','quello','quella','quelli','quelle','che','non','s\u00EC','mi','ti','si','mio','tuo','suo','nostro','vostro','loro','molto','pi\u00F9','meno','anche','perch\u00E9','quando','dove','come','buono','cattivo','ottimo','brutto','migliore','peggiore','adoro','odio','visto','bellissimo','mai','sempre','ancora','cazzo','stronzo','vaffanculo','porca']
    };

    const STOPWORDS = Object.fromEntries(
        Object.entries(STOPWORD_SOURCES).map(([lang, words]) =>
            [lang, new Set(words.map(normalize))]
        )
    );

    const MIN_WORDS_FOR_LANG_DETECT = 5;

    // Returns a language code ('en'/'es'/...) or null if the review is too
    // short to classify reliably or no language scored above zero.
    function detectLanguage(text) {
        const tokens = (text || '').match(/\p{L}+/gu) || [];
        if (tokens.length < MIN_WORDS_FOR_LANG_DETECT) return null;

        const normalized = tokens.map(normalize);

        let bestLang = null;
        let bestScore = 0;
        for (const [lang, set] of Object.entries(STOPWORDS)) {
            let score = 0;
            for (const tok of normalized) if (set.has(tok)) score++;
            if (score > bestScore) {
                bestScore = score;
                bestLang = lang;
            }
        }
        return bestLang;
    }

    GG.scraper.detectLanguage = detectLanguage;
    GG.scraper.SUPPORTED_LANGUAGES = Object.keys(STOPWORDS);

    /**
     * Fetch a review page, halving the page number on each miss until page 1.
     * Returns a Promise that resolves to:
     *  - { filmUrl, filmSlug, reviewText } if a review is found
     *  - null otherwise
     */
    function fetchReviewForSlug(filmUrl, slug, pageToUse) {
        let reviewUrl;
        if (state.currentRating) {
            reviewUrl = `https://letterboxd.com/film/${slug}/reviews/rated/${state.currentRating}/page/${pageToUse}/`;
        } else {
            reviewUrl = `https://letterboxd.com/film/${slug}/reviews/page/${pageToUse}/`;
        }

        GG.logger.log(
            `Fetching reviews for film ${slug}, page ${pageToUse}:`,
            reviewUrl
        );

        return fetch(reviewUrl, {
            credentials: "include" // so logged-in cookies still apply
        })
            .then(resp => {
                if (!resp.ok) {
                    throw new Error(`HTTP ${resp.status}`);
                }
                return resp.text();
            })
            .then(htmlText => {
                const parser = new DOMParser();
                const doc = parser.parseFromString(htmlText, "text/html");

                const paragraphs = doc.querySelectorAll(config.REVIEW_SELECTOR);
                GG.logger.log(
                    "Found review paragraphs via fetch:",
                    paragraphs.length,
                    "for film:",
                    filmUrl
                );

                let usableParagraphs = Array.from(paragraphs);
                const allowed = state.currentLanguages;
                if (allowed && allowed.size) {
                    usableParagraphs = usableParagraphs.filter(p => {
                        const lang = detectLanguage(p.textContent || "");
                        return lang && allowed.has(lang);
                    });
                }

                if (!usableParagraphs.length) {
                    if (pageToUse <= 1) {
                        return null;
                    }

                    const nextPage = Math.max(1, Math.floor(pageToUse / 2));
                    GG.logger.log(
                        `No usable reviews; halving page from ${pageToUse} to ${nextPage}`
                    );
                    return fetchReviewForSlug(filmUrl, slug, nextPage);
                }

                const randomIndex = Math.floor(Math.random() * usableParagraphs.length);
                const randomParagraph = usableParagraphs[randomIndex];
                const reviewText = randomParagraph.textContent.trim();

                const slugMatch = filmUrl.match(/\/film\/([^/]+)\//);
                const filmSlug = slugMatch ? slugMatch[1] : null;

                return {
                    filmUrl,
                    filmSlug,
                    reviewText
                };
            })
            .catch(err => {
                GG.logger.error("Error during fetch/parse for film:", filmUrl, err);
                if (pageToUse <= 1) {
                    return null;
                }
                const nextPage = Math.max(1, Math.floor(pageToUse / 2));
                GG.logger.log(
                    `Retrying film after error; halving page from ${pageToUse} to ${nextPage}`
                );
                return fetchReviewForSlug(filmUrl, slug, nextPage);
            });
    }

    const STATUS_SUFFIX_REGEX =
        /(You watched this film|You(?:'ve)? rewatched this film|Watch this film\??|Rewatch this film\??)\s*$/i;

    function extractFilmTitle(anchor, slug, href) {
        const img = anchor.querySelector("img[alt]");
        if (img) {
            const alt = (img.getAttribute("alt") || "").trim();
            if (alt) return alt;
        }

        const frameTitle = anchor.querySelector(".frame-title");
        if (frameTitle) {
            const ft = (frameTitle.textContent || "").trim();
            if (ft) return ft;
        }

        const raw = (anchor.textContent || "").trim();
        const stripped = raw.replace(STATUS_SUFFIX_REGEX, "").trim();
        return stripped || slug || href;
    }

    /**
     * Collect film URLs and populate state.filmOptions
     * (unchanged from your previous version).
     */
    GG.scraper.collectFilmUrls = function collectFilmUrls() {
        const anchors = document.querySelectorAll(config.MOVIE_SELECTOR);

        const seen = new Set();
        const urls = [];
        state.filmOptions = [];

        anchors.forEach(a => {
            const href = a.getAttribute("href");
            if (!href) return;
            if (seen.has(href)) return;
            seen.add(href);

            const fullUrl = new URL(href, window.location.origin).href;
            urls.push(fullUrl);

            const match = href.match(/\/film\/([^/]+)\//);
            const slug = match ? match[1] : null;
            const title = extractFilmTitle(a, slug, href);

            state.filmOptions.push({
                filmUrl: fullUrl,
                filmSlug: slug,
                title
            });
        });

        return urls;
    };
})();
