(function () {
    var startBtn = document.getElementById("startBtn");
    var form = document.getElementById("contactForm");
    var statusEl = document.getElementById("formStatus");
    var navRegisterLink = document.getElementById("navRegisterLink");
    var navLoginLink = document.getElementById("navLoginLink");
    var navAppLink = document.getElementById("navAppLink");
    var navLogoutBtn = document.getElementById("navLogoutBtn");

    function setupAuthUI() {
        if (!window.SCAuth) return;
        var loggedIn = window.SCAuth.isLoggedIn();

        if (navRegisterLink) navRegisterLink.hidden = loggedIn;
        if (navLoginLink) navLoginLink.hidden = loggedIn;
        if (navAppLink) navAppLink.hidden = !loggedIn;
        if (navLogoutBtn) navLogoutBtn.hidden = !loggedIn;

        if (navLogoutBtn) {
            navLogoutBtn.addEventListener("click", function (e) {
                e.preventDefault();
                window.SCAuth.logout();
                window.location.reload();
            });
        }
    }

    setupAuthUI();

    if (startBtn) {
        startBtn.addEventListener("click", function () {
            if (statusEl) statusEl.textContent = "";
        });
    }

    if (form) {
        form.addEventListener("submit", function (e) {
            e.preventDefault();
            var name = document.getElementById("name");
            var email = document.getElementById("email");
            var msg = document.getElementById("msg");

            if (!name || !email || !msg) return;

            if (!name.value.trim() || !email.value.trim() || !msg.value.trim()) {
                if (statusEl) {
                    statusEl.textContent = "Uzupełnij wszystkie pola.";
                    statusEl.style.color = "#fca5a5";
                }
                return;
            }

            if (statusEl) {
                statusEl.style.color = "#7dd3fc";
                statusEl.textContent =
                    "Dziękujemy — w tej wersji projektu formularz nie wysyła danych na serwer. Możesz dołączyć backend (np. API) w kolejnym etapie.";
            }
            form.reset();
        });
    }
})();
