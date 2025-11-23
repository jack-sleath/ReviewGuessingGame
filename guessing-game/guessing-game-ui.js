(function () {
    if (!window.GG) return;
    const GG = window.GG;
    const { state } = GG;

    GG.ui = GG.ui || {};

    // Launcher panel on the Letterboxd page
    GG.ui.createLauncherPanel = function createLauncherPanel() {
        if (document.getElementById("gg-panel")) return;

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

        const title = document.createElement("div");
        title.textContent = "Guessing Game";
        title.style.fontWeight = "600";
        title.style.marginBottom = "4px";

        const label = document.createElement("label");
        label.textContent = "Review rating:";
        label.setAttribute("for", "gg-rating-select");
        label.style.fontSize = "12px";

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

        const buttonsRow = document.createElement("div");
        buttonsRow.style.display = "flex";
        buttonsRow.style.gap = "6px";
        buttonsRow.style.marginTop = "4px";

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
            GG.game.start(select.value);
        });

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
    };

    // Create the game iframe and write the shell HTML once
    GG.ui.ensureGameIframe = function ensureGameIframe() {
        if (state.gameIframe && state.gameIframe.isConnected) return;

        const iframe = document.createElement("iframe");
        iframe.id = "gg-game-iframe";

        iframe.style.position = "fixed";
        iframe.style.top = "5%";
        iframe.style.left = "5%";
        iframe.style.width = "90%";
        iframe.style.height = "90%";
        iframe.style.border = "2px solid #2c7a7b";
        iframe.style.borderRadius = "12px";
        iframe.style.boxShadow = "0 8px 24px rgba(0,0,0,0.6)";
        iframe.style.zIndex = "1000000";
        iframe.style.background = "transparent";

        document.body.appendChild(iframe);
        state.gameIframe = iframe;

        const doc = iframe.contentDocument;
        doc.open();
        doc.write(`
          <!doctype html>
          <html>
            <head>
              <meta charset="utf-8" />
              <style>
                html, body {
                  height: 100%;
                  margin: 0;
                  padding: 0;
                  overflow: hidden; /* prevent outer scrolling */
                }
                body {
                  padding: 16px;
                  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
                  background: rgba(0, 0, 0, 0.94);
                  color: #fff;
                  box-sizing: border-box;
                }
                #gg-container {
                  max-width: 800px;
                  margin: 0 auto;
                  position: relative;
                  height: 100%;
                }
                #gg-close-btn {
                  position: absolute;
                  top: 0;
                  right: 0;
                  background: transparent;
                  border: none;
                  color: #fff;
                  font-size: 18px;
                  cursor: pointer;
                  padding: 0 4px;
                }
                h2 {
                  margin-top: 0;
                  font-size: 20px;
                  margin-bottom: 8px;
                }
                #gg-score {
                  position: absolute;
                  top: 0;
                  right: 32px;
                  font-size: 14px;
                  font-weight: 600;
                  display: none;
                }
                #gg-main-view {
                  margin-top: 16px;
                  /* allow internal scrolling but prevent document scrollbars */
                  height: calc(100% - 56px);
                  overflow: auto;
                }
                /* Loading view */
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
                /* Quiz view */
                #gg-review-box {
                  margin-top: 16px;
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
                #gg-search-input-placeholder { /* styling for the dummy hidden input to stay hidden */
                  position: absolute;
                  left: -9999px;
                  top: -9999px;
                  width: 1px;
                  height: 1px;
                  opacity: 0;
                  border: 0;
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
                /* No-questions view */
                #gg-noq-text {
                  margin-top: 40px;
                  font-size: 14px;
                  opacity: 0.85;
                  text-align: center;
                }
                /* Final score view */
                #gg-final-score {
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  height: 90%;
                  text-align: center;
                }
                #gg-final-score .score-box {
                  padding: 24px;
                  background: rgba(17,17,17,0.9);
                  border-radius: 12px;
                  border: 1px solid #333;
                }
                #gg-final-score .score-number {
                  font-size: 40px;
                  font-weight: 700;
                  margin-bottom: 8px;
                }
                #gg-final-score .score-subtext {
                  font-size: 16px;
                  opacity: 0.9;
                }
              </style>
            </head>
            <body>
              <div id="gg-container">
                <button id="gg-close-btn" type="button">×</button>
                <div id="gg-score">Score: 0</div>
                <h2>Guessing Game</h2>
                <div id="gg-main-view"></div>
              </div>
            </body>
          </html>
        `);
        doc.close();

        GG.ui.attachBaseGameHandlers();

        // default to loading view
        GG.ui.renderLoadingView();
    };

    GG.ui.attachBaseGameHandlers = function attachBaseGameHandlers() {
        const iframe = state.gameIframe;
        if (!iframe) return;
        const doc = iframe.contentDocument;
        if (!doc) return;

        const closeBtn = doc.getElementById("gg-close-btn");
        if (closeBtn) {
            closeBtn.addEventListener("click", GG.game.handleGameClose);
        }
    };

    // View renderers

    GG.ui.renderLoadingView = function renderLoadingView() {
        const iframe = state.gameIframe;
        if (!iframe) return;
        const doc = iframe.contentDocument;
        if (!doc) return;

        const main = doc.getElementById("gg-main-view");
        const scoreEl = doc.getElementById("gg-score");
        if (!main) return;

        if (scoreEl) scoreEl.style.display = "none";

        main.innerHTML = `
          <div id="gg-loading-text">Gathering reviews...</div>
          <div id="gg-progress-outer">
            <div id="gg-progress-inner"></div>
          </div>
        `;
    };

    GG.ui.showNoQuestions = function showNoQuestionsUI() {
        const iframe = state.gameIframe;
        if (!iframe) return;

        const doc = iframe.contentDocument;
        if (!doc) return;

        const main = doc.getElementById("gg-main-view");
        const scoreEl = doc.getElementById("gg-score");
        if (!main) return;

        if (scoreEl) scoreEl.style.display = "none";

        main.innerHTML = `
          <div id="gg-noq-text">
            Could not generate any questions from this list for the selected rating.
          </div>
        `;

        // close button already wired by attachBaseGameHandlers
    };

    GG.ui.initQuiz = function initQuizUI() {
        const iframe = state.gameIframe;
        if (!iframe) return;

        const doc = iframe.contentDocument;
        if (!doc) return;

        const main = doc.getElementById("gg-main-view");
        const scoreEl = doc.getElementById("gg-score");
        if (!main) return;

        if (scoreEl) {
            scoreEl.style.display = "block";
        }

        // generate a unique id/name for the search input each time to avoid browser autofill heuristics
        const uniqueId = `gg-search-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
        state._searchInputId = uniqueId;

        main.innerHTML = `
          <!-- hidden dummy input to further reduce autofill hints -->
          <input id="gg-search-input-placeholder" name="nope" autocomplete="off" type="text" />

          <div id="gg-review-box">
            <div id="gg-review-text"></div>
          </div>

          <div id="gg-answer-area">
            <label for="${uniqueId}">Search for the film:</label>
            <input id="${uniqueId}" name="${uniqueId}" type="text" placeholder="Type to filter films..." autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" />
            <select id="gg-answer-select"></select>
            <button id="gg-submit-btn">Confirm guess</button>
            <div id="gg-feedback"></div>
          </div>
        `;

        GG.ui.attachQuizHandlers();
        GG.ui.renderCurrentQuestion();
        GG.ui.updateScore();
    };

    // Loading progress

    GG.ui.updateLoading = function updateGameLoadingUI() {
        const iframe = state.gameIframe;
        if (!iframe || !state.totalFilms) return;

        const doc = iframe.contentDocument;
        if (!doc) return;

        const done = state.questionQueue.length;
        const pct = Math.max(
            0,
            Math.min(100, Math.round((done / state.totalFilms) * 100))
        );

        const textEl = doc.getElementById("gg-loading-text");
        const barInner = doc.getElementById("gg-progress-inner");

        if (textEl) {
            textEl.textContent = `Gathering reviews: ${done} / ${state.totalFilms} (${pct}%)`;
        }
        if (barInner) {
            barInner.style.width = pct + "%";
        }
    };

    // Quiz behaviour

    GG.ui.attachQuizHandlers = function attachQuizHandlers() {
        const iframe = state.gameIframe;
        if (!iframe) return;
        const doc = iframe.contentDocument;
        if (!doc) return;

        // use the dynamic id if available, otherwise fall back to the legacy id
        const searchInputId = state._searchInputId || 'gg-search-input';
        const searchInput = doc.getElementById(searchInputId);
        const submitBtn = doc.getElementById("gg-submit-btn");

        if (searchInput) {
            searchInput.addEventListener("input", () => {
                GG.ui.updateAnswerOptions(searchInput.value || "");
            });

            // disable browser autocomplete behaviors explicitly on the element as well
            try {
                searchInput.setAttribute('autocomplete', 'off');
                searchInput.setAttribute('autocorrect', 'off');
                searchInput.setAttribute('autocapitalize', 'off');
                searchInput.setAttribute('spellcheck', 'false');
                searchInput.name = searchInputId;
            } catch (e) {
                // ignore
            }
        }

        if (submitBtn) {
            submitBtn.addEventListener("click", GG.game.handleGuessSubmit);
        }

        GG.ui.updateAnswerOptions("");
    };

    GG.ui.updateAnswerOptions = function updateAnswerOptions(filterText) {
        const iframe = state.gameIframe;
        if (!iframe) return;
        const doc = iframe.contentDocument;
        if (!doc) return;

        const selectEl = doc.getElementById("gg-answer-select");
        if (!selectEl) return;

        const term = (filterText || "").toLowerCase();
        selectEl.innerHTML = "";

        state.filmOptions.forEach(opt => {
            const titleLower = opt.title.toLowerCase();
            if (!term || titleLower.includes(term)) {
                const option = doc.createElement("option");
                option.value = opt.filmSlug || opt.filmUrl;
                option.textContent = opt.title;
                selectEl.appendChild(option);
            }
        });
    };

    GG.ui.renderCurrentQuestion = function renderCurrentQuestion() {
        const iframe = state.gameIframe;
        if (!iframe) return;
        const doc = iframe.contentDocument;
        if (!doc) return;

        const reviewBox = doc.getElementById("gg-review-text");
        const feedbackEl = doc.getElementById("gg-feedback");

        // use dynamic id when clearing the search input
        const searchInputId = state._searchInputId || 'gg-search-input';
        const searchInput = doc.getElementById(searchInputId);

        if (!reviewBox) return;

        if (state.currentQuestionIndex >= state.questionQueue.length) {
            // show final score instead of the plain finished text
            GG.ui.showFinalScore();
            if (feedbackEl) {
                feedbackEl.textContent = "";
            }
            return;
        }

        const question = state.questionQueue[state.currentQuestionIndex];
        reviewBox.textContent = question.reviewText;

        if (feedbackEl) {
            feedbackEl.textContent = "";
        }
        if (searchInput) {
            searchInput.value = "";
        }
        GG.ui.updateAnswerOptions("");
    };

    // New: show final score centered in the main view
    GG.ui.showFinalScore = function showFinalScore() {
        const iframe = state.gameIframe;
        if (!iframe) return;
        const doc = iframe.contentDocument;
        if (!doc) return;

        const main = doc.getElementById("gg-main-view");
        const scoreEl = doc.getElementById("gg-score");
        if (!main) return;

        if (scoreEl) scoreEl.style.display = "none";

        const total = state.questionQueue ? state.questionQueue.length : 0;
        const score = typeof state.score === 'number' ? state.score : 0;

        main.innerHTML = `
          <div id="gg-final-score">
            <div class="score-box">
              <div class="score-number">${score} / ${total}</div>
              <div class="score-subtext">Your final score</div>
            </div>
          </div>
        `;
    };

    GG.ui.updateScore = function updateScoreUI() {
        const iframe = state.gameIframe;
        if (!iframe) return;
        const doc = iframe.contentDocument;
        if (!doc) return;

        const scoreEl = doc.getElementById("gg-score");
        if (scoreEl) {
            scoreEl.textContent = `Score: ${state.score}`;
        }
    };
})();
