(function () {
    const MOVIE_SELECTOR =
        'a[href^="/film/"]';
    const REVIEW_SELECTOR =
        '#content > div > div > section > div.viewing-list.-marginblockstart > div > article > div > div.js-review > div.body-text.-prose.-reset.js-review-body.js-collapsible-text > p';

    window.GG = window.GG || {};

    const GG = window.GG;

    // Determine initial DEBUG value from (in order): existing global, URL param, localStorage, default false
    function detectDebug() {
        // If already set on GG.config prior to this script, respect it
        if (GG.config && typeof GG.config.DEBUG === 'boolean') {
            return GG.config.DEBUG;
        }

        // Check URL query parameter gg_debug=1 or gg_debug=true
        try {
            const params = new URLSearchParams(window.location.search || '');
            if (params.has('gg_debug')) {
                const v = params.get('gg_debug');
                if (v === '1' || v === 'true') return true;
                if (v === '0' || v === 'false') return false;
            }
        } catch (e) {
            // ignore
        }

        // Check localStorage key 'gg_debug'
        try {
            const stored = localStorage.getItem('gg_debug');
            if (stored === '1' || stored === 'true') return true;
            if (stored === '0' || stored === 'false') return false;
        } catch (e) {
            // ignore
        }

        return false;
    }

    GG.config = {
        MOVIE_SELECTOR,
        REVIEW_SELECTOR,
        DEBUG_IFRAME: false,
        TIMEOUT_LENGTH: 100,
        DEBUG: detectDebug() // set to true to enable console logging
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

    // Allow runtime control of debug mode
    GG.setDebug = function setDebug(enabled) {
        GG.config.DEBUG = !!enabled;
        try {
            localStorage.setItem('gg_debug', GG.config.DEBUG ? '1' : '0');
        } catch (e) {
            // ignore
        }
    };

    // Simple logger wrapper that respects GG.config.DEBUG
    GG.logger = {
        log(...args) {
            if (GG.config && GG.config.DEBUG) {
                console.log(...args);
            }
        },
        info(...args) {
            if (GG.config && GG.config.DEBUG) {
                console.info(...args);
            }
        },
        warn(...args) {
            if (GG.config && GG.config.DEBUG) {
                console.warn(...args);
            }
        },
        error(...args) {
            if (GG.config && GG.config.DEBUG) {
                console.error(...args);
            }
        }
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
