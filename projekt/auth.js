(function () {
    var STORAGE_USERS = "salescontrol_users";
    var SESSION_KEY = "salescontrol_session";

    function getUsers() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_USERS) || "[]");
        } catch (e) {
            return [];
        }
    }

    function saveUsers(users) {
        localStorage.setItem(STORAGE_USERS, JSON.stringify(users));
    }

    function hashPassword(password) {
        if (!window.crypto || !window.crypto.subtle) {
            return Promise.reject(new Error("Brak Web Crypto API"));
        }
        var enc = new TextEncoder().encode(password);
        return crypto.subtle.digest("SHA-256", enc).then(function (buf) {
            var bytes = new Uint8Array(buf);
            var hex = "";
            for (var i = 0; i < bytes.length; i++) {
                hex += bytes[i].toString(16).padStart(2, "0");
            }
            return hex;
        });
    }

    function normalizeEmail(email) {
        return String(email || "").trim().toLowerCase();
    }

    function registerUser(email, password) {
        var norm = normalizeEmail(email);
        if (!norm || !password) {
            return Promise.resolve({ ok: false, error: "Uzupełnij wszystkie pola." });
        }
        var users = getUsers();
        if (users.some(function (u) { return u.email === norm; })) {
            return Promise.resolve({ ok: false, error: "Ten adres e-mail jest już zarejestrowany." });
        }
        return hashPassword(password).then(function (hash) {
            users.push({ email: norm, passwordHash: hash });
            saveUsers(users);
            return { ok: true };
        });
    }

    function loginUser(email, password) {
        var norm = normalizeEmail(email);
        if (!norm || !password) {
            return Promise.resolve({ ok: false, error: "Uzupełnij wszystkie pola." });
        }
        return hashPassword(password).then(function (hash) {
            var users = getUsers();
            var user = users.find(function (u) {
                return u.email === norm && u.passwordHash === hash;
            });
            if (!user) {
                return { ok: false, error: "Nieprawidłowy e-mail lub hasło." };
            }
            sessionStorage.setItem(SESSION_KEY, JSON.stringify({ email: norm }));
            return { ok: true };
        });
    }

    function logout() {
        sessionStorage.removeItem(SESSION_KEY);
    }

    function getSession() {
        try {
            var raw = sessionStorage.getItem(SESSION_KEY);
            if (!raw) return null;
            return JSON.parse(raw);
        } catch (e) {
            return null;
        }
    }

    function isLoggedIn() {
        return !!getSession();
    }

    function getSessionEmail() {
        var s = getSession();
        return s && s.email ? s.email : null;
    }

    /** Dozwolone przekierowanie po zalogowaniu (ochrona przed open redirect). */
    function getSafeNextUrl(paramValue) {
        if (!paramValue) return "panel-demo.html";
        try {
            var decoded = decodeURIComponent(paramValue);
        } catch (e) {
            return "panel-demo.html";
        }
        if (decoded.indexOf("..") !== -1) return "panel-demo.html";
        var allowed = ["panel-demo.html", "index.html"];
        if (allowed.indexOf(decoded) !== -1) return decoded;
        return "panel-demo.html";
    }

    window.SCAuth = {
        registerUser: registerUser,
        loginUser: loginUser,
        logout: logout,
        isLoggedIn: isLoggedIn,
        getSessionEmail: getSessionEmail,
        getSafeNextUrl: getSafeNextUrl
    };
})();
