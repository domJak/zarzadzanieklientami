(function () {
    var statLeads = document.getElementById("dashStatLeads");
    if (!statLeads) return;

    var els = {
        leads: statLeads,
        meetings: document.getElementById("dashStatMeetings"),
        docs: document.getElementById("dashStatDocs"),
        inbox: document.getElementById("dashStatInbox"),
        activity: document.getElementById("dashboardActivity")
    };

    function countUnreadMessages() {
        if (!window.SCMessages) return 0;
        window.SCMessages.ensureInitialData();
        return (window.SCMessages.loadMessages() || []).filter(function (m) {
            return !m.read;
        }).length;
    }

    function countPipelineLeads() {
        if (window.SCCRM && window.SCCRM.countPipelineLeads) {
            return window.SCCRM.countPipelineLeads();
        }
        return 0;
    }

    function countTodayMeetings() {
        if (window.SCCalendar && window.SCCalendar.countTodayEvents) {
            return window.SCCalendar.countTodayEvents();
        }
        return 0;
    }

    function countPendingDocs() {
        if (window.SCDocuments && window.SCDocuments.countPendingSignature) {
            return window.SCDocuments.countPendingSignature();
        }
        return 0;
    }

    function collectActivity() {
        var items = [];

        if (window.SCMessages) {
            window.SCMessages.ensureInitialData();
            (window.SCMessages.loadMessages() || []).slice(0, 8).forEach(function (m) {
                items.push({
                    ts: new Date(m.createdAt).getTime() || 0,
                    html: "<strong>" + window.SCMessages.getChannelLabel(m.channel) + ":</strong> " +
                        (m.fromName || "Nadawca") + " — „" + (m.preview || "") + "”."
                });
            });
        }

        if (window.SCCRM) {
            (window.SCCRM.loadContacts() || []).forEach(function (c) {
                if (String(c.lastActivity || "").indexOf("Dziś") === 0) {
                    items.push({
                        ts: Date.now(),
                        html: "<strong>CRM:</strong> aktywność u " + (c.name || "kontaktu") + " (" + (c.lastActivity || "") + ")."
                    });
                }
            });
        }

        if (window.SCDocuments) {
            (window.SCDocuments.loadDocuments() || []).forEach(function (d) {
                if (d.status === "pending" || d.status === "sent") {
                    items.push({
                        ts: d.updatedAt ? new Date(d.updatedAt).getTime() : 0,
                        html: "<strong>Dokument:</strong> " + (d.name || "Plik") + " oczekuje na podpis (" + (d.contact || "—") + ")."
                    });
                } else if (d.status === "signed") {
                    items.push({
                        ts: d.updatedAt ? new Date(d.updatedAt).getTime() : 0,
                        html: "<strong>Dokument:</strong> " + (d.name || "Plik") + " podpisany."
                    });
                }
            });
        }

        if (window.SCCalendar) {
            var today = window.SCCalendar.toISODate(new Date());
            var events = (window.SCCalendar.loadStore()[today] || []);
            events.forEach(function (ev) {
                items.push({
                    ts: Date.now(),
                    html: "<strong>Kalendarz:</strong> dziś " + (ev.time ? ev.time + " — " : "") + (ev.title || "Spotkanie") + "."
                });
            });
        }

        items.sort(function (a, b) {
            return b.ts - a.ts;
        });

        return items.slice(0, 8);
    }

    function renderActivity() {
        if (!els.activity) return;
        var items = collectActivity();
        els.activity.innerHTML = "";

        if (!items.length) {
            var li = document.createElement("li");
            li.className = "muted";
            li.textContent = "Brak ostatniej aktywności.";
            els.activity.appendChild(li);
            return;
        }

        items.forEach(function (item) {
            var li = document.createElement("li");
            li.innerHTML = item.html;
            els.activity.appendChild(li);
        });
    }

    function renderDashboard() {
        if (els.leads) els.leads.textContent = String(countPipelineLeads());
        if (els.meetings) els.meetings.textContent = String(countTodayMeetings());
        if (els.docs) els.docs.textContent = String(countPendingDocs());
        if (els.inbox) els.inbox.textContent = String(countUnreadMessages());
        renderActivity();
    }

    renderDashboard();

    window.addEventListener("sc-data-change", renderDashboard);
    window.addEventListener("storage", renderDashboard);
    window.addEventListener("hashchange", function () {
        if (window.location.hash.replace("#", "") === "pulpit" || !window.location.hash) {
            renderDashboard();
        }
    });
})();
