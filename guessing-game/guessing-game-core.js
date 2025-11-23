(function () {
    const MOVIE_SELECTOR =
        'a[href^="/film/"]';
    const REVIEW_SELECTOR =
        '#content > div > div > section > div.viewing-list.-marginblockstart > div > article > div > div.js-review > div.body-text.-prose.-reset.js-review-body.js-collapsible-text > p';

    window.GG = window.GG || {};

    const GG = window.GG;

    GG.config = {
        MOVIE_SELECTOR,
        REVIEW_SELECTOR,
        DEBUG_IFRAME: false,
        TIMEOUT_LENGTH: 100
    };

    GG.state = {
        filmQueue: [],
        currentIndex: 0,
        currentRating: "",
        hiddenIframe: null,
        questionQueue: [], // { filmUrl, filmSlug, reviewText }
        score: 0,
        triedFirstPage: false,

        gameIframe: null,
        totalFilms: 0,
        filmOptions: [], // { filmUrl, filmSlug, title }
        currentQuestionIndex: 0
    };

    GG.utils = {
        shuffleArray(arr) {
            for (let i = arr.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [arr[i], arr[j]] = [arr[j], arr[i]];
            }
        }
    };
})();
