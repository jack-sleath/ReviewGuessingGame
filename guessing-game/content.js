(function () {
    const MOVIE_SELECTOR = 'a[href^="/film/"]';
    const GG_REVIEW_SELECTOR = '#content > div > div > section > div.viewing-list.-marginblockstart > div > article > div > div.js-review > div.body-text.-prose.-reset.js-review-body.js-collapsible-text > p';
    const GG_DEBUG_IFRAME = false; // set to false later to hide iframe again
    let ggFilmQueue = [];
    let ggCurrentIndex = 0;
    let ggCurrentRating = "";
    let ggHiddenIframe = null;
    let ggQuestionQueue = []; // { filmUrl, filmSlug, reviewText }
    let ggScore = 0;
    let ggTriedFirstPage = false;



    function createUI() {
        if (document.getElementById("gg-panel")) return;

        // Panel
        const panel = document.createElement("div");
        panel.id = "gg-panel";

        panel.style.position = "fixed";
        panel.style.bottom = "20px";
        panel.style.right = "20px";
        panel.style.padding = "10px 12px";
        panel.style.background = "rgba(0, 0, 0, 0.85)";
        panel.style.color = "#fff";
        panel.style.borderRadius = "8px";
        panel.style.fontSize = "13px";
        panel.style.fontFamily = "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
        panel.style.zIndex = "999999";
        panel.style.boxShadow = "0 4px 12px rgba(0,0,0,0.4)";
        panel.style.display = "flex";
        panel.style.flexDirection = "column";
        panel.style.gap = "6px";
        panel.style.maxWidth = "220px";

        // Title
        const title = document.createElement("div");
        title.textContent = "Guessing Game";
        title.style.fontWeight = "600";
        title.style.marginBottom = "4px";

        // Rating label
        const label = document.createElement("label");
        label.textContent = "Review rating:";
        label.setAttribute("for", "gg-rating-select");
        label.style.fontSize = "12px";

        // Rating select
        const select = document.createElement("select");
        select.id = "gg-rating-select";
        select.style.width = "100%";
        select.style.padding = "4px 6px";
        select.style.borderRadius = "4px";
        select.style.border = "1px solid #444";
        select.style.background = "#111";
        select.style.color = "#fff";

        const ratings = [
            { value: "0.5", label: "0.5 stars" },
            { value: "1", label: "1 star" },
            { value: "1.5", label: "1.5 stars" },
            { value: "2", label: "2 stars" },
            { value: "2.5", label: "2.5 stars" },
            { value: "3", label: "3 stars" },
            { value: "3.5", label: "3.5 stars" },
            { value: "4", label: "4 stars" },
            { value: "4.5", label: "4.5 stars" },
            { value: "5", label: "5 stars" }
        ];

        ratings.forEach(r => {
            const opt = document.createElement("option");
            opt.value = r.value;
            opt.textContent = r.label;
            select.appendChild(opt);
        });

        // Buttons row
        const buttonsRow = document.createElement("div");
        buttonsRow.style.display = "flex";
        buttonsRow.style.gap = "6px";
        buttonsRow.style.marginTop = "4px";

        // Start button
        const startBtn = document.createElement("button");
        startBtn.textContent = "Start";
        startBtn.style.flex = "1";
        startBtn.style.padding = "4px 8px";
        startBtn.style.border = "none";
        startBtn.style.borderRadius = "4px";
        startBtn.style.cursor = "pointer";
        startBtn.style.background = "#2c7a7b";
        startBtn.style.color = "#fff";
        startBtn.style.fontSize = "13px";
        startBtn.addEventListener("click", () => {
            const rating = select.value; // empty string means "any"
            onStartGame(rating);
        });

        // Close button
        const closeBtn = document.createElement("button");
        closeBtn.textContent = "×";
        closeBtn.style.width = "28px";
        closeBtn.style.padding = "4px";
        closeBtn.style.border = "none";
        closeBtn.style.borderRadius = "4px";
        closeBtn.style.cursor = "pointer";
        closeBtn.style.background = "#444";
        closeBtn.style.color = "#fff";
        closeBtn.style.fontSize = "16px";
        closeBtn.style.lineHeight = "1";
        closeBtn.addEventListener("click", () => {
            panel.remove();
        });

        buttonsRow.appendChild(startBtn);
        buttonsRow.appendChild(closeBtn);

        panel.appendChild(title);
        panel.appendChild(label);
        panel.appendChild(select);
        panel.appendChild(buttonsRow);

        document.body.appendChild(panel);
    }

    function onStartGame(rating) {
        console.log("Starting Guessing Game with rating:", rating || "any");

        const filmUrls = collectFilmUrls();
        console.log("Collected film URLs:", filmUrls);

        if (!filmUrls.length) {
            console.warn("No film URLs found on this page");
            return;
        }

        ggFilmQueue = filmUrls;
        ggCurrentIndex = 0;
        ggCurrentRating = rating || ""; // empty means any rating

        // NEW:
        ggQuestionQueue = [];
        ggScore = 0;

        ensureHiddenIframe();
        loadNextReviewPage();
    }


    function ensureHiddenIframe() {
        if (ggHiddenIframe && ggHiddenIframe.isConnected) return;

        ggHiddenIframe = document.createElement("iframe");
        ggHiddenIframe.id = "gg-hidden-iframe";

        if (GG_DEBUG_IFRAME) {
            // Debug: visible overlay
            ggHiddenIframe.style.position = "fixed";
            ggHiddenIframe.style.top = "10%";
            ggHiddenIframe.style.left = "10%";
            ggHiddenIframe.style.width = "80vw";
            ggHiddenIframe.style.height = "80vh";
            ggHiddenIframe.style.border = "2px solid red";
            ggHiddenIframe.style.zIndex = "999999";
            ggHiddenIframe.style.background = "#fff";
            ggHiddenIframe.style.pointerEvents = "auto";
            ggHiddenIframe.style.opacity = "1";
            ggHiddenIframe.style.boxShadow = "0 0 20px rgba(0,0,0,0.6)";
        } else {
            // Normal: hidden off-screen
            ggHiddenIframe.style.position = "fixed";
            ggHiddenIframe.style.width = "0";
            ggHiddenIframe.style.height = "0";
            ggHiddenIframe.style.border = "0";
            ggHiddenIframe.style.opacity = "0";
            ggHiddenIframe.style.pointerEvents = "none";
            ggHiddenIframe.style.left = "-9999px";
            ggHiddenIframe.style.bottom = "0";
            ggHiddenIframe.style.zIndex = "0";
        }

        ggHiddenIframe.addEventListener("load", onHiddenIframeLoad);

        document.body.appendChild(ggHiddenIframe);
    }



    function loadNextReviewPage() {
        if (!ggFilmQueue.length || ggCurrentIndex >= ggFilmQueue.length) {
            console.log("Finished loading review pages for all films");
            console.log("Question queue built:", ggQuestionQueue);
            destroyHiddenIframe();
            // TODO: start the actual game UI using ggQuestionQueue[0]
            return;
        }

        ggTriedFirstPage = false; // reset for this film
        loadReviewPageForCurrentFilm(false); // random page first
    }

    function loadReviewPageForCurrentFilm(forcePage1) {
        const filmUrl = ggFilmQueue[ggCurrentIndex];
        const match = filmUrl.match(/\/film\/([^/]+)\//);

        if (!match) {
            console.warn("Could not extract film slug from URL:", filmUrl);
            ggCurrentIndex += 1;
            loadNextReviewPage();
            return;
        }

        const slug = match[1];
        const randomPage = Math.floor(Math.random() * 100) + 1;
        const pageToUse = forcePage1 ? 1 : randomPage;

        let reviewUrl;
        if (ggCurrentRating) {
            reviewUrl = `https://letterboxd.com/film/${slug}/reviews/rated/${ggCurrentRating}/page/${pageToUse}/`;
        } else {
            reviewUrl = `https://letterboxd.com/film/${slug}/reviews/page/${pageToUse}/`;
        }

        console.log(`Loading reviews for film ${slug}, page ${pageToUse}:`, reviewUrl);
        ggHiddenIframe.src = reviewUrl;
    }


    function destroyHiddenIframe() {
        if (!ggHiddenIframe) return;

        ggHiddenIframe.removeEventListener("load", onHiddenIframeLoad);
        ggHiddenIframe.remove();
        ggHiddenIframe = null;

        console.log("Guessing Game iframe destroyed");
    }


    function onHiddenIframeLoad() {
        const doc = ggHiddenIframe.contentDocument;
        if (!doc) {
            console.warn("No contentDocument on hidden iframe");
            ggCurrentIndex += 1;
            setTimeout(loadNextReviewPage, 300);
            return;
        }

        console.log("Iframe loaded:", doc.location.href);

        const paragraphs = doc.querySelectorAll(GG_REVIEW_SELECTOR);
        console.log("Found review paragraphs:", paragraphs.length, "for film:", ggFilmQueue[ggCurrentIndex]);

        if (!paragraphs.length) {
            console.log("No matching review paragraphs on this page for film:", ggFilmQueue[ggCurrentIndex]);

            if (!ggTriedFirstPage) {
                ggTriedFirstPage = true;
                console.log("Trying page 1 for this film instead");
                setTimeout(() => loadReviewPageForCurrentFilm(true), 200);
                return;
            }

            // Already tried page 1 as well: remove film from queue
            const removed = ggFilmQueue.splice(ggCurrentIndex, 1);
            console.log("Removing film from queue due to no review text on any page:", removed[0]);

            if (!ggFilmQueue.length) {
                console.log("No films left in queue that have reviews");
                destroyHiddenIframe();
                return;
            }

            if (ggCurrentIndex >= ggFilmQueue.length) {
                console.log("Reached end of queue after removals");
                destroyHiddenIframe();
                return;
            }

            setTimeout(loadNextReviewPage, 300);
            return;
        }


        const randomIndex = Math.floor(Math.random() * paragraphs.length);
        const randomParagraph = paragraphs[randomIndex];
        const reviewText = randomParagraph.innerText.trim();

        const filmUrl = ggFilmQueue[ggCurrentIndex];
        const slugMatch = filmUrl.match(/\/film\/([^/]+)\//);
        const filmSlug = slugMatch ? slugMatch[1] : null;

        const question = {
            filmUrl,
            filmSlug,
            reviewText
        };

        ggQuestionQueue.push(question);

        console.log("Added question to queue:", question);

        // Move to next film (this one stays usable in the question queue)
        ggCurrentIndex += 1;
        setTimeout(loadNextReviewPage, 300);

    }

    function collectFilmUrls() {
        const anchors = document.querySelectorAll(MOVIE_SELECTOR);

        const urls = Array.from(anchors)
            .map(a => a.getAttribute("href"))
            .filter(Boolean)
            .filter((href, index, arr) => arr.indexOf(href) === index)
            .map(href => new URL(href, window.location.origin).href);

        return urls;
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", createUI);
    } else {
        createUI();
    }
})();
