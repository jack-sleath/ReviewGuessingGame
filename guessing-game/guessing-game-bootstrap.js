(function () {
    function boot() {
        if (!window.GG || !window.GG.ui) return;
        window.GG.ui.createLauncherPanel();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", boot);
    } else {
        boot();
    }
})();
