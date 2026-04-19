(function () {
    if (!window.SCAuth || !window.SCAuth.isLoggedIn()) {
        window.location.replace("logowanie.html?next=" + encodeURIComponent("panel-demo.html"));
        return;
    }

    var VIEW_IDS = ["pulpit", "lejki", "crm", "wiadomosci", "kursy", "dokumenty", "kalendarz"];
    var TITLES = {
        pulpit: "Pulpit",
        lejki: "Lejki sprzedaży",
        crm: "CRM — kontakty",
        wiadomosci: "Wiadomości",
        kursy: "Kursy",
        dokumenty: "Dokumenty",
        kalendarz: "Kalendarz"
    };

    function normalizeView(raw) {
        var id = String(raw || "")
            .replace(/^#/, "")
            .toLowerCase()
            .trim();
        if (VIEW_IDS.indexOf(id) === -1) return "pulpit";
        return id;
    }

    function getViewFromHash() {
        return normalizeView(window.location.hash);
    }

    function showView(viewId) {
        var id = normalizeView(viewId);
        document.querySelectorAll(".panel-view").forEach(function (el) {
            el.hidden = el.id !== "view-" + id;
        });
        document.querySelectorAll(".app-nav a[data-view]").forEach(function (a) {
            if (a.getAttribute("data-view") === id) {
                a.classList.add("is-active");
                a.setAttribute("aria-current", "page");
            } else {
                a.classList.remove("is-active");
                a.removeAttribute("aria-current");
            }
        });
        var titleEl = document.getElementById("appTitle");
        if (titleEl) {
            titleEl.textContent = TITLES[id] || "Panel";
        }
        var main = document.querySelector(".app-content");
        if (main) main.scrollTop = 0;
    }

    function onHashChange() {
        showView(getViewFromHash());
    }

    window.addEventListener("hashchange", onHashChange);

    var email = window.SCAuth.getSessionEmail();
    var userPill = document.getElementById("userPill");
    var logoutBtn = document.getElementById("logoutBtn");
    if (userPill && email) {
        userPill.textContent = email;
        userPill.hidden = false;
    }
    if (logoutBtn) {
        logoutBtn.hidden = false;
        logoutBtn.addEventListener("click", function () {
            window.SCAuth.logout();
            window.location.href = "logowanie.html";
        });
    }

    if (!window.location.hash || window.location.hash === "#") {
        history.replaceState(null, "", "#pulpit");
    }
    showView(getViewFromHash());
})();
