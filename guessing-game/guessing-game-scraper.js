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

        const randomPage = Math.floor(Math.random() * 100) + 1;
        fetchReviewForSlug(filmUrl, slug, randomPage)
            .then(question => {
                if (question) {
                    state.questionQueue.push(question);
                    GG.logger.log("Added question to queue:", question);
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

        if (!state.questionQueue.length) {
            GG.ui.showNoQuestions();
        } else {
            GG.utils.shuffleArray(state.questionQueue);
            state.currentQuestionIndex = 0;
            GG.ui.initQuiz();
        }
    }

    const ACCENTED_CHARS_REGEX = /[\u00C0-\u024F\u1E00-\u1EFF]/;

    function isLikelyEnglishReview(text) {
        return !ACCENTED_CHARS_REGEX.test(text);
    }

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
                if (state.currentEnglishOnly) {
                    usableParagraphs = usableParagraphs.filter(p =>
                        isLikelyEnglishReview(p.textContent || "")
                    );
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
