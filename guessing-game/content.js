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

    let ggGameIframe = null;
    let ggTotalFilms = 0;
    let ggFilmOptions = []; // { filmUrl, filmSlug, title }
    let ggCurrentQuestionIndex = 0;

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
            const rating = select.value;
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
        ggCurrentRating = rating || "";
        ggTotalFilms = filmUrls.length;

        ggQuestionQueue = [];
        ggScore = 0;
        ggCurrentQuestionIndex = 0;

        ensureGameIframe();
        updateGameLoadingUI();

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

    function ensureGameIframe() {
        if (ggGameIframe && ggGameIframe.isConnected) return;

        ggGameIframe = document.createElement("iframe");
        ggGameIframe.id = "gg-game-iframe";

        // Overlay with margin so you can still see Letterboxd behind
        ggGameIframe.style.position = "fixed";
        ggGameIframe.style.top = "5%";
        ggGameIframe.style.left = "5%";
        ggGameIframe.style.width = "90%";
        ggGameIframe.style.height = "90%";
        ggGameIframe.style.border = "2px solid #2c7a7b";
        ggGameIframe.style.borderRadius = "12px";
        ggGameIframe.style.boxShadow = "0 8px 24px rgba(0,0,0,0.6)";
        ggGameIframe.style.zIndex = "1000000";
        ggGameIframe.style.background = "transparent";

        document.body.appendChild(ggGameIframe);

        const doc = ggGameIframe.contentDocument;
        doc.open();
        doc.write(`
          <!doctype html>
          <html>
            <head>
              <meta charset="utf-8" />
              <style>
                body {
                  margin: 0;
                  padding: 16px;
                  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
                  background: rgba(0, 0, 0, 0.94);
                  color: #fff;
                }
                #gg-container {
                  max-width: 800px;
                  margin: 0 auto;
                }
                h2 {
                  margin-top: 0;
                  font-size: 20px;
                }
                #gg-loading-text {
                  margin-bottom: 8px;
                  font-size: 14px;
                }
                #gg-progress-outer {
                  width: 100%;
                  height: 10px;
                  border-radius: 999px;
                  background: #333;
                  overflow: hidden;
                }
                #gg-progress-inner {
                  height: 100%;
                  width: 0%;
                  background: #2c7a7b;
                  transition: width 0.2s ease-out;
                }
              </style>
            </head>
            <body>
              <div id="gg-container">
                <h2>Guessing Game</h2>
                <div id="gg-loading-text">Gathering reviews...</div>
                <div id="gg-progress-outer">
                  <div id="gg-progress-inner"></div>
                </div>
              </div>
            </body>
          </html>
        `);
        doc.close();
    }

    function updateGameLoadingUI() {
        if (!ggGameIframe || !ggTotalFilms) return;

        const doc = ggGameIframe.contentDocument;
        if (!doc) return;

        const done = ggQuestionQueue.length;
        const pct = Math.max(0, Math.min(100, Math.round((done / ggTotalFilms) * 100)));

        const textEl = doc.getElementById("gg-loading-text");
        const barInner = doc.getElementById("gg-progress-inner");

        if (textEl) {
            textEl.textContent = `Gathering reviews: ${done} / ${ggTotalFilms} (${pct}%)`;
        }
        if (barInner) {
            barInner.style.width = pct + "%";
        }
    }

    function loadNextReviewPage() {
        if (!ggFilmQueue.length || ggCurrentIndex >= ggFilmQueue.length) {
            console.log("Finished loading review pages for all films");
            console.log("Question queue built:", ggQuestionQueue);
            updateGameLoadingUI();
            destroyHiddenIframe();

            if (!ggQuestionQueue.length) {
                showNoQuestionsUI();
            } else {
                shuffleArray(ggQuestionQueue);
                ggCurrentQuestionIndex = 0;
                initQuizUI();
            }
            return;
        }

        ggTriedFirstPage = false;
        loadReviewPageForCurrentFilm(false);
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
                updateGameLoadingUI();
                destroyHiddenIframe();
                if (!ggQuestionQueue.length) {
                    showNoQuestionsUI();
                } else {
                    initQuizUI();
                }
                return;
            }

            if (ggCurrentIndex >= ggFilmQueue.length) {
                console.log("Reached end of queue after removals");
                updateGameLoadingUI();
                destroyHiddenIframe();
                if (!ggQuestionQueue.length) {
                    showNoQuestionsUI();
                } else {
                    initQuizUI();
                }
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

        updateGameLoadingUI();

        // Move to next film (this one stays usable in the question queue)
        ggCurrentIndex += 1;
        setTimeout(loadNextReviewPage, 300);
    }

    function collectFilmUrls() {
        const anchors = document.querySelectorAll(MOVIE_SELECTOR);

        const seen = new Set();
        const urls = [];
        ggFilmOptions = [];

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

            ggFilmOptions.push({
                filmUrl: fullUrl,
                filmSlug: slug,
                title
            });
        });

        return urls;
    }

    function showNoQuestionsUI() {
        if (!ggGameIframe) return;

        const doc = ggGameIframe.contentDocument;
        if (!doc) return;

        doc.open();
        doc.write(`
          <!doctype html>
          <html>
            <head>
              <meta charset="utf-8" />
              <style>
                body {
                  margin: 0;
                  padding: 16px;
                  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
                  background: rgba(0, 0, 0, 0.94);
                  color: #fff;
                }
                #gg-container {
                  max-width: 800px;
                  margin: 0 auto;
                  text-align: center;
                }
                h2 {
                  margin-top: 40px;
                  font-size: 20px;
                }
                p {
                  font-size: 14px;
                  opacity: 0.85;
                }
              </style>
            </head>
            <body>
              <div id="gg-container">
                <h2>Guessing Game</h2>
                <p>Could not generate any questions from this list for the selected rating.</p>
              </div>
            </body>
          </html>
        `);
        doc.close();
    }

    function initQuizUI() {
        if (!ggGameIframe) return;

        const doc = ggGameIframe.contentDocument;
        if (!doc) return;

        doc.open();
        doc.write(`
          <!doctype html>
          <html>
            <head>
              <meta charset="utf-8" />
              <style>
                body {
                  margin: 0;
                  padding: 16px;
                  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
                  background: rgba(0, 0, 0, 0.94);
                  color: #fff;
                }
                #gg-container {
                  max-width: 800px;
                  margin: 0 auto;
                  position: relative;
                }
                h2 {
                  margin-top: 0;
                  font-size: 20px;
                  margin-bottom: 12px;
                }
                #gg-score {
                  position: absolute;
                  top: 0;
                  right: 0;
                  font-size: 14px;
                  font-weight: 600;
                }
                #gg-review-box {
                  margin-top: 32px;
                  padding: 12px 14px;
                  border-radius: 8px;
                  background: #111;
                  line-height: 1.5;
                  font-size: 14px;
                  max-height: 200px;
                  overflow-y: auto;
                  border: 1px solid #333;
                }
                #gg-answer-area {
                  margin-top: 16px;
                  display: flex;
                  flex-direction: column;
                  gap: 8px;
                }
                label {
                  font-size: 13px;
                  opacity: 0.9;
                }
                #gg-search-input {
                  padding: 6px 8px;
                  border-radius: 4px;
                  border: 1px solid #444;
                  background: #111;
                  color: #fff;
                  font-size: 13px;
                }
                #gg-answer-select {
                  padding: 6px 8px;
                  border-radius: 4px;
                  border: 1px solid #444;
                  background: #111;
                  color: #fff;
                  font-size: 13px;
                }
                #gg-submit-btn {
                  margin-top: 4px;
                  padding: 8px 10px;
                  border-radius: 4px;
                  border: none;
                  background: #2c7a7b;
                  color: #fff;
                  font-size: 14px;
                  cursor: pointer;
                  align-self: flex-start;
                }
                #gg-feedback {
                  margin-top: 8px;
                  font-size: 13px;
                }
              </style>
            </head>
            <body>
              <div id="gg-container">
                <div id="gg-score">Score: 0</div>
                <h2>Guessing Game</h2>

                <div id="gg-review-box">
                  <div id="gg-review-text"></div>
                </div>

                <div id="gg-answer-area">
                  <label for="gg-search-input">Search for the film:</label>
                  <input id="gg-search-input" type="text" placeholder="Type to filter films..." />
                  <select id="gg-answer-select"></select>
                  <button id="gg-submit-btn">Confirm guess</button>
                  <div id="gg-feedback"></div>
                </div>
              </div>
            </body>
          </html>
        `);
        doc.close();

        attachQuizHandlers();
        renderCurrentQuestion();
        updateScoreUI();
    }

    function attachQuizHandlers() {
        if (!ggGameIframe) return;
        const doc = ggGameIframe.contentDocument;
        if (!doc) return;

        const searchInput = doc.getElementById("gg-search-input");
        const submitBtn = doc.getElementById("gg-submit-btn");

        if (searchInput) {
            searchInput.addEventListener("input", () => {
                updateAnswerOptions(searchInput.value || "");
            });
        }

        if (submitBtn) {
            submitBtn.addEventListener("click", handleGuessSubmit);
        }

        // Initial options
        updateAnswerOptions("");
    }

    function updateAnswerOptions(filterText) {
        if (!ggGameIframe) return;
        const doc = ggGameIframe.contentDocument;
        if (!doc) return;

        const selectEl = doc.getElementById("gg-answer-select");
        if (!selectEl) return;

        const term = (filterText || "").toLowerCase();
        selectEl.innerHTML = "";

        ggFilmOptions.forEach(opt => {
            const titleLower = opt.title.toLowerCase();
            if (!term || titleLower.includes(term)) {
                const option = doc.createElement("option");
                option.value = opt.filmSlug || opt.filmUrl;
                option.textContent = opt.title;
                selectEl.appendChild(option);
            }
        });
    }

    function renderCurrentQuestion() {
        if (!ggGameIframe) return;
        const doc = ggGameIframe.contentDocument;
        if (!doc) return;

        const reviewBox = doc.getElementById("gg-review-text");
        const feedbackEl = doc.getElementById("gg-feedback");
        const searchInput = doc.getElementById("gg-search-input");

        if (!reviewBox) return;

        if (ggCurrentQuestionIndex >= ggQuestionQueue.length) {
            reviewBox.textContent = "No more questions. You finished the quiz!";
            if (feedbackEl) {
                feedbackEl.textContent = "";
            }
            return;
        }

        const question = ggQuestionQueue[ggCurrentQuestionIndex];
        reviewBox.textContent = question.reviewText;

        if (feedbackEl) {
            feedbackEl.textContent = "";
        }
        if (searchInput) {
            searchInput.value = "";
        }
        updateAnswerOptions("");
    }

    function updateScoreUI() {
        if (!ggGameIframe) return;
        const doc = ggGameIframe.contentDocument;
        if (!doc) return;

        const scoreEl = doc.getElementById("gg-score");
        if (scoreEl) {
            scoreEl.textContent = `Score: ${ggScore}`;
        }
    }

    function shuffleArray(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
    }


    function handleGuessSubmit() {
        if (!ggGameIframe) return;
        const doc = ggGameIframe.contentDocument;
        if (!doc) return;

        if (ggCurrentQuestionIndex >= ggQuestionQueue.length) {
            return;
        }

        const selectEl = doc.getElementById("gg-answer-select");
        const feedbackEl = doc.getElementById("gg-feedback");

        if (!selectEl) return;

        const selectedValue = selectEl.value;
        const question = ggQuestionQueue[ggCurrentQuestionIndex];

        const correctSlug = question.filmSlug || question.filmUrl;

        const isCorrect = selectedValue && selectedValue === (question.filmSlug || question.filmUrl);

        if (isCorrect) {
            ggScore += 1;
            if (feedbackEl) {
                feedbackEl.textContent = "Correct!";
                feedbackEl.style.color = "#38a169";
            }
        } else {
            if (feedbackEl) {
                const filmOpt = ggFilmOptions.find(o => o.filmSlug === question.filmSlug) || null;
                const filmTitle = filmOpt ? filmOpt.title : "that film";
                feedbackEl.textContent = `Incorrect. It was: ${filmTitle}`;
                feedbackEl.style.color = "#e53e3e";
            }
        }

        updateScoreUI();

        ggCurrentQuestionIndex += 1;
        setTimeout(() => {
            renderCurrentQuestion();
        }, 700);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", createUI);
    } else {
        createUI();
    }
})();
