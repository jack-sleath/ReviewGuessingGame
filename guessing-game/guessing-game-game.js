(function () {
    if (!window.GG) return;
    const GG = window.GG;
    const { state } = GG;

    GG.game = GG.game || {};

    GG.game.start = function startGame(rating) {
        console.log("Starting Guessing Game with rating:", rating || "any");

        const filmUrls = GG.scraper.collectFilmUrls();
        console.log("Collected film URLs:", filmUrls);

        if (!filmUrls.length) {
            console.warn("No film URLs found on this page");
            return;
        }

        state.filmQueue = filmUrls;
        state.currentIndex = 0;
        state.currentRating = rating || "";
        state.totalFilms = filmUrls.length;

        state.questionQueue = [];
        state.score = 0;
        state.currentQuestionIndex = 0;

        GG.ui.ensureGameIframe();
        GG.ui.updateLoading();

        GG.scraper.ensureHiddenIframe();
        GG.scraper.loadNextReviewPage();
    };

    GG.game.handleGameClose = function handleGameClose() {
        GG.scraper.destroyHiddenIframe();

        if (state.gameIframe) {
            state.gameIframe.remove();
            state.gameIframe = null;
        }

        state.filmQueue = [];
        state.questionQueue = [];
        state.currentIndex = 0;
        state.currentQuestionIndex = 0;
        state.totalFilms = 0;

        console.log("Guessing Game closed");
    };

    GG.game.handleGuessSubmit = function handleGuessSubmit() {
        const iframe = state.gameIframe;
        if (!iframe) return;
        const doc = iframe.contentDocument;
        if (!doc) return;

        if (state.currentQuestionIndex >= state.questionQueue.length) {
            return;
        }

        const selectEl = doc.getElementById("gg-answer-select");
        const feedbackEl = doc.getElementById("gg-feedback");

        if (!selectEl) return;

        const selectedValue = selectEl.value;
        const question = state.questionQueue[state.currentQuestionIndex];

        const isCorrect = selectedValue &&
            selectedValue === (question.filmSlug || question.filmUrl);

        if (isCorrect) {
            state.score += 1;
            if (feedbackEl) {
                feedbackEl.textContent = "Correct!";
                feedbackEl.style.color = "#38a169";
            }
        } else {
            if (feedbackEl) {
                const filmOpt =
                    state.filmOptions.find(o => o.filmSlug === question.filmSlug) || null;
                const filmTitle = filmOpt ? filmOpt.title : "that film";
                feedbackEl.textContent = `Incorrect. It was: ${filmTitle}`;
                feedbackEl.style.color = "#e53e3e";
            }
        }

        GG.ui.updateScore();

        state.currentQuestionIndex += 1;
        setTimeout(() => {
            GG.ui.renderCurrentQuestion();
        }, 700);
    };
})();
