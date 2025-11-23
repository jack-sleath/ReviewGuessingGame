(function () {
    if (!window.GG) return;
    const GG = window.GG;
    const { config, state } = GG;

    GG.scraper = GG.scraper || {};

    GG.scraper.ensureHiddenIframe = function ensureHiddenIframe() {
        if (state.hiddenIframe && state.hiddenIframe.isConnected) return;

        const iframe = document.createElement("iframe");
        iframe.id = "gg-hidden-iframe";

        if (config.DEBUG_IFRAME) {
            iframe.style.position = "fixed";
            iframe.style.top = "10%";
            iframe.style.left = "10%";
            iframe.style.width = "80vw";
            iframe.style.height = "80vh";
            iframe.style.border = "2px solid red";
            iframe.style.zIndex = "999999";
            iframe.style.background = "#fff";
            iframe.style.pointerEvents = "auto";
            iframe.style.opacity = "1";
            iframe.style.boxShadow = "0 0 20px rgba(0,0,0,0.6)";
        } else {
            iframe.style.position = "fixed";
            iframe.style.width = "0";
            iframe.style.height = "0";
            iframe.style.border = "0";
            iframe.style.opacity = "0";
            iframe.style.pointerEvents = "none";
            iframe.style.left = "-9999px";
            iframe.style.bottom = "0";
            iframe.style.zIndex = "0";
        }

        iframe.addEventListener("load", GG.scraper.onHiddenIframeLoad);

        document.body.appendChild(iframe);
        state.hiddenIframe = iframe;
    };

    GG.scraper.loadNextReviewPage = function loadNextReviewPage() {
        if (!state.filmQueue.length || state.currentIndex >= state.filmQueue.length) {
            console.log("Finished loading review pages for all films");
            console.log("Question queue built:", state.questionQueue);
            GG.ui.updateLoading();
            GG.scraper.destroyHiddenIframe();

            if (!state.questionQueue.length) {
                GG.ui.showNoQuestions();
            } else {
                GG.utils.shuffleArray(state.questionQueue);
                state.currentQuestionIndex = 0;
                GG.ui.initQuiz();
            }
            return;
        }

        state.triedFirstPage = false;
        GG.scraper.loadReviewPageForCurrentFilm(false);
    };

    GG.scraper.loadReviewPageForCurrentFilm = function loadReviewPageForCurrentFilm(forcePage1) {
        const filmUrl = state.filmQueue[state.currentIndex];
        const match = filmUrl.match(/\/film\/([^/]+)\//);

        if (!match) {
            console.warn("Could not extract film slug from URL:", filmUrl);
            state.currentIndex += 1;
            GG.scraper.loadNextReviewPage();
            return;
        }

        const slug = match[1];
        const randomPage = Math.floor(Math.random() * 100) + 1;
        const pageToUse = forcePage1 ? 1 : randomPage;

        let reviewUrl;
        if (state.currentRating) {
            reviewUrl = `https://letterboxd.com/film/${slug}/reviews/rated/${state.currentRating}/page/${pageToUse}/`;
        } else {
            reviewUrl = `https://letterboxd.com/film/${slug}/reviews/page/${pageToUse}/`;
        }

        console.log(`Loading reviews for film ${slug}, page ${pageToUse}:`, reviewUrl);
        if (state.hiddenIframe) {
            state.hiddenIframe.src = reviewUrl;
        }
    };

    GG.scraper.destroyHiddenIframe = function destroyHiddenIframe() {
        const iframe = state.hiddenIframe;
        if (!iframe) return;

        iframe.removeEventListener("load", GG.scraper.onHiddenIframeLoad);
        iframe.remove();
        state.hiddenIframe = null;

        console.log("Guessing Game hidden iframe destroyed");
    };

    GG.scraper.onHiddenIframeLoad = function onHiddenIframeLoad() {
        const iframe = state.hiddenIframe;
        if (!iframe) {
            console.warn("No hidden iframe present");
            return;
        }

        const doc = iframe.contentDocument;
        if (!doc) {
            console.warn("No contentDocument on hidden iframe");
            state.currentIndex += 1;
            setTimeout(GG.scraper.loadNextReviewPage, config.TIMEOUT_LENGTH);
            return;
        }

        console.log("Iframe loaded:", doc.location.href);

        const paragraphs = doc.querySelectorAll(config.REVIEW_SELECTOR);
        console.log(
            "Found review paragraphs:",
            paragraphs.length,
            "for film:",
            state.filmQueue[state.currentIndex]
        );

        if (!paragraphs.length) {
            console.log("No matching review paragraphs on this page for film:", state.filmQueue[state.currentIndex]);

            if (!state.triedFirstPage) {
                state.triedFirstPage = true;
                console.log("Trying page 1 for this film instead");
                setTimeout(() => GG.scraper.loadReviewPageForCurrentFilm(true), config.TIMEOUT_LENGTH);
                return;
            }

            const removed = state.filmQueue.splice(state.currentIndex, 1);
            console.log("Removing film from queue due to no review text on any page:", removed[0]);

            if (!state.filmQueue.length) {
                console.log("No films left in queue that have reviews");
                GG.ui.updateLoading();
                GG.scraper.destroyHiddenIframe();
                if (!state.questionQueue.length) {
                    GG.ui.showNoQuestions();
                } else {
                    GG.utils.shuffleArray(state.questionQueue);
                    state.currentQuestionIndex = 0;
                    GG.ui.initQuiz();
                }
                return;
            }

            if (state.currentIndex >= state.filmQueue.length) {
                console.log("Reached end of queue after removals");
                GG.ui.updateLoading();
                GG.scraper.destroyHiddenIframe();
                if (!state.questionQueue.length) {
                    GG.ui.showNoQuestions();
                } else {
                    GG.utils.shuffleArray(state.questionQueue);
                    state.currentQuestionIndex = 0;
                    GG.ui.initQuiz();
                }
                return;
            }

            setTimeout(GG.scraper.loadNextReviewPage, config.TIMEOUT_LENGTH);
            return;
        }

        const randomIndex = Math.floor(Math.random() * paragraphs.length);
        const randomParagraph = paragraphs[randomIndex];
        const reviewText = randomParagraph.innerText.trim();

        const filmUrl = state.filmQueue[state.currentIndex];
        const slugMatch = filmUrl.match(/\/film\/([^/]+)\//);
        const filmSlug = slugMatch ? slugMatch[1] : null;

        const question = {
            filmUrl,
            filmSlug,
            reviewText
        };

        state.questionQueue.push(question);

        console.log("Added question to queue:", question);

        GG.ui.updateLoading();

        state.currentIndex += 1;
        setTimeout(GG.scraper.loadNextReviewPage, config.TIMEOUT_LENGTH);
    };

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
