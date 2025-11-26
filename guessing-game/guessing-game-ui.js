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

        // Show a debug button when debug mode is enabled so the developer can open the full quiz UI immediately
        try {
            if (GG.config && GG.config.DEBUG) {
                const debugBtn = document.createElement("button");
                debugBtn.textContent = "Debug UI";
                debugBtn.style.flex = "1";
                debugBtn.style.padding = "4px 8px";
                debugBtn.style.border = "none";
                debugBtn.style.borderRadius = "4px";
                debugBtn.style.cursor = "pointer";
                debugBtn.style.background = "#6b46c1";
                debugBtn.style.color = "#fff";
                debugBtn.style.fontSize = "13px";
                debugBtn.addEventListener("click", () => {
                    GG.ui.openDebugUI();
                });

                buttonsRow.appendChild(debugBtn);
            }
        } catch (e) {
            // ignore
        }

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
        iframe.style.top = "0";
        iframe.style.left = "0";
        iframe.style.width = "100%";
        iframe.style.height = "100%";
        iframe.style.border = "none";
        iframe.style.borderRadius = "0";
        iframe.style.boxShadow = "none";
        iframe.style.zIndex = "1000000";
        iframe.style.background = "rgba(0, 0, 0, 0.8)";

        document.body.appendChild(iframe);
        state.gameIframe = iframe;

        const doc = iframe.contentDocument;
        doc.open();
        doc.write(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    :root {
      --bg: #202830;
      --panel: #1a2128;
      --panel-soft: #151b22;
      --border: #2c3742;
      --accent: #40bcf4;
      --primary: #00e054;
      --warning: #ff8000;
      --text-main: #f7f5ff;
      --text-muted: #b0bcc8;
      --shadow-main: 0 18px 40px rgba(0, 0, 0, 0.6);
    }

    * { box-sizing: border-box; margin:0; padding:0; }
    html, body { height:100%; overflow:hidden; }
   body {
  padding: 16px;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  background: transparent;
  color: var(--text-main);
}


    /* Shell */
   #gg-container {
  max-width: 800px;
  margin: 64px auto 32px;
  position: relative;
  padding: 18px 22px 20px;
  border-radius: 24px;
  background: var(--bg);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-main);
    height: calc(100% - 128px);
}


    h2 {
      margin: 0 0 6px;
      font-size: 20px;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--accent);
    }

    /* Close button and score */
    #gg-close-btn {
      position: absolute;
      top: 12px;
      right: 12px;
      width: 28px; height: 28px;
      border-radius: 999px;
      border: 1px solid var(--border);
      background: var(--bg);
      color: #ffffff;
      font-size: 18px; cursor: pointer;
      display: inline-flex; align-items:center; justify-content:center; line-height:1; padding:0;
    }
    #gg-close-btn:hover { background: #2a3440; }

    #gg-score {
      position: absolute; top: 16px; right: 52px; font-size: 12px; font-weight:600;
      padding: 4px 10px; border-radius:999px; background:var(--bg); border:1px solid var(--accent);
      color:var(--accent); display:none;
    }

    /* Main scrolling area */
    #gg-main-view { margin-top:10px; height: calc(100% - 56px); overflow:auto; padding:14px 4px 4px; }

    /* Loading view */
    #gg-loading-text { margin-bottom:10px; font-size:13px; color:var(--text-muted); }
    #gg-progress-outer { width:100%; height:8px; border-radius:999px; background:#151b22; overflow:hidden; border:1px solid var(--border); }
    #gg-progress-inner { height:100%; width:0%; background: linear-gradient(90deg, var(--accent), var(--primary), var(--warning)); transition: width 0.2s ease-out; }

    /* Review box */
    #gg-review-box { margin-top:10px; padding:14px 16px; border-radius:16px; background:var(--panel); line-height:1.6; font-size:14px; border:1px solid var(--border); position:relative; box-shadow: inset 0 0 25px rgba(0,0,0,0.65); max-height:none; overflow-y:visible; }
    #gg-review-box::before { content: "Review"; position:absolute; top:8px; right:16px; font-size:10px; text-transform:uppercase; letter-spacing:0.12em; color: rgba(237,242,255,0.55); }

    #gg-review-text { position:relative; padding-left:20px; }
    #gg-review-text::before { content: "“"; position:absolute; left:0; top:-4px; font-size:26px; color:var(--accent); }

    /* Answer area */
    #gg-answer-area { margin-top:16px; display:flex; flex-direction:column; gap:8px; padding:12px 14px 14px; border-radius:16px; background:var(--panel); border:1px solid var(--border); }

    label { font-size:11px; text-transform:uppercase; letter-spacing:0.18em; color:var(--text-muted); }

    /* Hidden dummy input */
    #gg-search-input-placeholder { position:absolute; left:-9999px; top:-9999px; width:1px; height:1px; opacity:0; border:0; }

    /* Search input and select */
    #gg-answer-area input[type="text"] { padding:7px 10px; border-radius:10px; border:1px solid var(--border); background:var(--panel-soft); color:var(--text-main); font-size:13px; outline:none; }
    #gg-answer-area input[type="text"]::placeholder { color:#8d99a5; }
    #gg-answer-area input[type="text"]:focus { border-color:var(--accent); box-shadow: 0 0 0 1px rgba(64,188,244,0.7), 0 0 0 8px rgba(64,188,244,0.18); }

    /* Dropdown */
    #gg-answer-select { padding:7px 10px; border-radius:10px; border:1px solid var(--border); background:var(--panel-soft); color:var(--text-main); font-size:13px; outline:none; appearance:none; -webkit-appearance:none; -moz-appearance:none; }
    #gg-answer-select:focus { border-color:var(--accent); box-shadow: 0 0 0 1px rgba(64,188,244,0.7), 0 0 0 8px rgba(64,188,244,0.18); }

    /* Primary button */
    #gg-submit-btn { margin-top:6px; padding:8px 14px; border-radius:999px; border:none; background:var(--primary); color:#05130a; font-size:13px; font-weight:600; cursor:pointer; align-self:flex-start; text-transform:uppercase; letter-spacing:0.16em; }
    #gg-submit-btn:hover { background:#00c649; } #gg-submit-btn:active { background:#00ad3f; }

    /* Feedback */
    #gg-feedback { margin-top:6px; font-size:13px; min-height:18px; color:var(--text-muted); }
    #gg-feedback.correct { color:var(--primary); } #gg-feedback.incorrect { color:var(--warning); }

    /* No-questions view */
    #gg-noq-text { margin-top:40px; font-size:14px; opacity:0.85; text-align:center; color:var(--text-muted); }

    /* Final score view */
    #gg-final-score { display:flex; align-items:center; justify-content:center; height:90%; text-align:center; }
    #gg-final-score .score-box { padding:26px 32px; background:var(--panel); border-radius:18px; border:1px solid var(--border); box-shadow:var(--shadow-main); }
    #gg-final-score .score-number { font-size:40px; font-weight:700; margin-bottom:4px; color:var(--primary); }
    #gg-final-score .score-subtext { font-size:14px; opacity:0.9; color:var(--text-muted); }

    /* Scrollbars */
    #gg-main-view::-webkit-scrollbar, #gg-review-box::-webkit-scrollbar { width:6px; }
    #gg-main-view::-webkit-scrollbar-track, #gg-review-box::-webkit-scrollbar-track { background:transparent; }
    #gg-main-view::-webkit-scrollbar-thumb, #gg-review-box::-webkit-scrollbar-thumb { background:var(--border); border-radius:999px; }

    @media (max-width:640px) {
      #gg-container { padding:14px 14px 16px; }
      #gg-main-view { padding-right:2px; }
      #gg-review-box { font-size:13px; }
    }
  </style>
</head>
<body>
  <div id="gg-container">
    <button id="gg-close-btn" type="button">×</button>
    <div id="gg-score" style="display: block;">Score: 0</div>
    <h2>Guessing Game</h2>
    <div id="gg-main-view">
      <input id="gg-search-input-placeholder" name="nope" autocomplete="off" type="text" />

      <div id="gg-review-box">
        <div id="gg-review-text">This is a sample review for Sample Film A. Edit this text to preview the review box UI.</div>
      </div>

      <div id="gg-answer-area">
        <label for="gg-search-1764186865885-3lx7c6">Search for the film:</label>
        <input id="gg-search-1764186865885-3lx7c6" name="gg-search-1764186865885-3lx7c6" type="text" placeholder="Type to filter films..." autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" />
        <select id="gg-answer-select">
          <option value="sample-film-a">Sample Film A</option>
          <option value="sample-film-b">Sample Film B</option>
          <option value="sample-film-c">Sample Film C</option>
        </select>
        <button id="gg-submit-btn">Confirm guess</button>
        <div id="gg-feedback"></div>
      </div>
    </div>
  </div>
</body>
</html>`);
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

    // Debug helper: open the full quiz UI immediately with sample data so UI elements can be inspected/edited
    GG.ui.openDebugUI = function openDebugUI() {
        GG.logger && GG.logger.log && GG.logger.log("GG: opening debug UI");
        GG.ui.ensureGameIframe();

        // Populate filmOptions if empty with sample entries
        if (!state.filmOptions || !state.filmOptions.length) {
            state.filmOptions = [
                { filmSlug: 'sample-film-a', filmUrl: '/film/sample-film-a', title: 'Sample Film A' },
                { filmSlug: 'sample-film-b', filmUrl: '/film/sample-film-b', title: 'Sample Film B' },
                { filmSlug: 'sample-film-c', filmUrl: '/film/sample-film-c', title: 'Sample Film C' }
            ];
        }

        // Populate a simple question queue so renderCurrentQuestion shows content
        if (!state.questionQueue || !state.questionQueue.length) {
            state.questionQueue = [
                { filmSlug: state.filmOptions[0].filmSlug, filmUrl: state.filmOptions[0].filmUrl, reviewText: 'This is a sample review for Sample Film A. Edit this text to preview the review box UI.' },
                { filmSlug: state.filmOptions[1].filmSlug, filmUrl: state.filmOptions[1].filmUrl, reviewText: 'Second sample review for Sample Film B.' }
            ];
        }

        state.currentQuestionIndex = 0;
        state.score = 0;

        // Initialize the quiz view (wires handlers and renders the first question)
        GG.ui.initQuiz();
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
