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
        console.log("Guessing Game hidden iframe disabled (fetch-based scraping)");
    };

    /**
     * Entry point from GG.game.start
     * Kicks off the concurrent fetch pipeline.
     */
    GG.scraper.loadNextReviewPage = function loadNextReviewPage() {
        if (!state.filmQueue.length) {
            console.log("No films to scrape");
            GG.ui.updateLoading();
            GG.ui.showNoQuestions();
            return;
        }

        console.log("Starting fetch-based scraping for films:", state.filmQueue);

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
            console.warn("Could not extract film slug from URL:", filmUrl);
            onFilmFinished();
            return;
        }

        const slug = match[1];

        fetchReviewForSlug(filmUrl, slug, false)
            .then(question => {
                if (question) {
                    state.questionQueue.push(question);
                    console.log("Added question to queue:", question);
                } else {
                    console.log("No usable review found for film:", filmUrl);
                }
            })
            .catch(err => {
                console.error("Error fetching review for film:", filmUrl, err);
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
        console.log("Finished fetching review pages for all films");
        console.log("Question queue built:", state.questionQueue);

        GG.scraper.destroyHiddenIframe(); // no-op but keeps logs consistent

        if (!state.questionQueue.length) {
            GG.ui.showNoQuestions();
        } else {
            GG.utils.shuffleArray(state.questionQueue);
            state.currentQuestionIndex = 0;
            GG.ui.initQuiz();
        }
    }

    /**
     * Fetch a review page (random page first, then fallback to page 1 if needed).
     * Returns a Promise that resolves to:
     *  - { filmUrl, filmSlug, reviewText } if a review is found
     *  - null otherwise
     */
    function fetchReviewForSlug(filmUrl, slug, triedFirstPage) {
        const randomPage = Math.floor(Math.random() * 100) + 1;
        const pageToUse = triedFirstPage ? 1 : randomPage;

        let reviewUrl;
        if (state.currentRating) {
            reviewUrl = `https://letterboxd.com/film/${slug}/reviews/rated/${state.currentRating}/page/${pageToUse}/`;
        } else {
            reviewUrl = `https://letterboxd.com/film/${slug}/reviews/page/${pageToUse}/`;
        }

        console.log(
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
                console.log(
                    "Found review paragraphs via fetch:",
                    paragraphs.length,
                    "for film:",
                    filmUrl
                );

                if (!paragraphs.length) {
                    // No reviews on this page; if we haven't tried page 1 yet, do that once.
                    if (!triedFirstPage) {
                        console.log("No reviews; trying page 1 for this film instead");
                        return fetchReviewForSlug(filmUrl, slug, true);
                    }
                    // Already tried page 1; give up on this film.
                    return null;
                }

                const randomIndex = Math.floor(Math.random() * paragraphs.length);
                const randomParagraph = paragraphs[randomIndex];
                const reviewText = randomParagraph.innerText.trim();

                const slugMatch = filmUrl.match(/\/film\/([^/]+)\//);
                const filmSlug = slugMatch ? slugMatch[1] : null;

                return {
                    filmUrl,
                    filmSlug,
                    reviewText
                };
            })
            .catch(err => {
                console.error("Error during fetch/parse for film:", filmUrl, err);
                // If random page failed and we haven't yet tried page 1, we can attempt that too
                if (!triedFirstPage) {
                    console.log("Retrying film on page 1 after error");
                    return fetchReviewForSlug(filmUrl, slug, true);
                }
                return null;
            });
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
            const title = (a.textContent || "").trim() || slug || href;

            state.filmOptions.push({
                filmUrl: fullUrl,
                filmSlug: slug,
                title
            });
        });

        return urls;
    };
})();
