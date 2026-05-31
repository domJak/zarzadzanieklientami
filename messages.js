(function () {
    var STORAGE_KEY = "salescontrol_inbox";

    var CHANNELS = {
        email: "E-mail",
        sms: "SMS",
        messenger: "Messenger",
        form: "Formularz WWW"
    };

    var SEED = [
        {
            channel: "email",
            fromName: "ACME",
            fromEmail: "kontakt@acme.pl",
            preview: "Pytanie o wdrożenie",
            body: "Dzień dobry,\n\ninteresuje nas wdrożenie SalesControl dla zespołu ok. 15 osób. Prosimy o informację o czasie startu i kosztach planu Pro.\n\nPozdrawiamy,\nZespół ACME",
            hoursAgo: 2
        },
        {
            channel: "sms",
            fromName: "+48 *** *** 102",
            fromEmail: "",
            preview: "Potwierdzam spotkanie",
            body: "Potwierdzam spotkanie w czwartek o 14:00. Proszę o link do wideokonferencji.",
            hoursAgo: 3
        },
        {
            channel: "messenger",
            fromName: "Lead: Webinar",
            fromEmail: "",
            preview: "Czy nagranie będzie dostępne?",
            body: "Cześć! Zapisałem się na webinar Q2 — czy nagranie będzie dostępne po zakończeniu?",
            daysAgo: 1
        }
    ];

    function newId() {
        return "m_" + Date.now() + "_" + Math.random().toString(36).slice(2, 9);
    }

    function pad(n) {
        return String(n).padStart(2, "0");
    }

    function loadMessages() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return null;
            var arr = JSON.parse(raw);
            return Array.isArray(arr) ? arr : null;
        } catch (e) {
            return null;
        }
    }

    function saveMessages(list) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    }

    function previewText(text, maxLen) {
        var t = String(text || "").replace(/\s+/g, " ").trim();
        if (!t) return "";
        var limit = maxLen || 80;
        if (t.length <= limit) return t;
        return t.slice(0, limit - 1).trim() + "…";
    }

    function formatTimeLabel(iso) {
        var d = new Date(iso);
        if (isNaN(d.getTime())) return String(iso || "");

        var now = new Date();
        var startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        var startMsg = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        var diffDays = Math.round((startToday - startMsg) / 86400000);

        if (diffDays === 0) {
            return "Dziś, " + pad(d.getHours()) + ":" + pad(d.getMinutes());
        }
        if (diffDays === 1) return "Wczoraj";
        if (diffDays > 1 && diffDays < 7) return diffDays + " dni temu";
        return pad(d.getDate()) + "." + pad(d.getMonth() + 1) + "." + d.getFullYear();
    }

    function ensureInitialData() {
        if (loadMessages() !== null) return;

        var now = Date.now();
        var initial = SEED.map(function (s) {
            var offsetMs = 0;
            if (s.hoursAgo != null) offsetMs = s.hoursAgo * 3600000;
            else if (s.daysAgo != null) offsetMs = s.daysAgo * 86400000;

            return {
                id: newId(),
                channel: s.channel,
                fromName: s.fromName,
                fromEmail: s.fromEmail || "",
                preview: s.preview,
                body: s.body || s.preview,
                createdAt: new Date(now - offsetMs).toISOString(),
                read: true
            };
        });
        saveMessages(initial);
    }

    function addFromForm(name, email, message) {
        ensureInitialData();
        var list = loadMessages() || [];
        var trimmedName = String(name || "").trim();
        var trimmedEmail = String(email || "").trim();
        var trimmedMsg = String(message || "").trim();

        list.unshift({
            id: newId(),
            channel: "form",
            fromName: trimmedName,
            fromEmail: trimmedEmail,
            preview: previewText(trimmedMsg, 72),
            body: trimmedMsg,
            createdAt: new Date().toISOString(),
            read: false
        });
        saveMessages(list);
        window.dispatchEvent(new CustomEvent("sc-data-change", { detail: { module: "messages" } }));
        return list[0];
    }

    function getChannelLabel(channel) {
        return CHANNELS[channel] || channel || "Wiadomość";
    }

    window.SCMessages = {
        loadMessages: loadMessages,
        saveMessages: saveMessages,
        ensureInitialData: ensureInitialData,
        addFromForm: addFromForm,
        previewText: previewText,
        formatTimeLabel: formatTimeLabel,
        getChannelLabel: getChannelLabel,
        storageKey: function () {
            return STORAGE_KEY;
        }
    };
})();
