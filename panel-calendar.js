(function () {
    var grid = document.getElementById("calGrid");
    if (!grid) return;

    var MONTHS = [
        "styczeń", "luty", "marzec", "kwiecień", "maj", "czerwiec",
        "lipiec", "sierpień", "wrzesień", "październik", "listopad", "grudzień"
    ];

    function storageKey() {
        var em =
            window.SCAuth && window.SCAuth.getSessionEmail
                ? window.SCAuth.getSessionEmail()
                : "";
        return "salescontrol_calendar_" + (em || "guest");
    }

    function toISODate(d) {
        var y = d.getFullYear();
        var m = String(d.getMonth() + 1).padStart(2, "0");
        var day = String(d.getDate()).padStart(2, "0");
        return y + "-" + m + "-" + day;
    }

    function getTomorrow() {
        var n = new Date();
        n.setDate(n.getDate() + 1);
        return n;
    }

    function secondsUntilMidnight() {
        var now = new Date();
        var end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
        return Math.max(0, Math.floor((end - now) / 1000));
    }

    function formatHMS(totalSec) {
        var h = Math.floor(totalSec / 3600);
        var m = Math.floor((totalSec % 3600) / 60);
        var s = totalSec % 60;
        return (
            String(h).padStart(2, "0") +
            ":" +
            String(m).padStart(2, "0") +
            ":" +
            String(s).padStart(2, "0")
        );
    }

    function parseISODate(iso) {
        var p = String(iso).split("-");
        return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
    }

    function loadStore() {
        try {
            var raw = localStorage.getItem(storageKey());
            var data = raw ? JSON.parse(raw) : {};
            return data && typeof data === "object" ? data : {};
        } catch (e) {
            return {};
        }
    }

    function saveStore(store) {
        localStorage.setItem(storageKey(), JSON.stringify(store));
    }

    function newId() {
        return "e_" + Date.now() + "_" + Math.random().toString(36).slice(2, 9);
    }

    var now = new Date();
    var state = {
        y: now.getFullYear(),
        m: now.getMonth(),
        selectedISO: null
    };

    var els = {
        monthYear: document.getElementById("calMonthYear"),
        prev: document.getElementById("calPrev"),
        next: document.getElementById("calNext"),
        todayBtn: document.getElementById("calToday"),
        dialog: document.getElementById("calDayDialog"),
        dialogTitle: document.getElementById("calDialogTitle"),
        eventList: document.getElementById("calEventList"),
        addForm: document.getElementById("calAddForm"),
        closeBtn: document.getElementById("calDialogClose"),
        inputTitle: document.getElementById("calInputTitle"),
        inputTime: document.getElementById("calInputTime"),
        inputNote: document.getElementById("calInputNote"),
        todayDateLine: document.getElementById("calTodayDateLine"),
        liveClock: document.getElementById("calLiveClock"),
        todayAgenda: document.getElementById("calTodayAgenda"),
        tomorrowDateLine: document.getElementById("calTomorrowDateLine"),
        tomorrowCountdown: document.getElementById("calTomorrowCountdown"),
        tomorrowAgenda: document.getElementById("calTomorrowAgenda")
    };

    var cachedTodayIso = toISODate(new Date());

    function renderTodayDateLine() {
        if (!els.todayDateLine) return;
        var d = new Date();
        els.todayDateLine.textContent = new Intl.DateTimeFormat("pl-PL", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric"
        }).format(d);
    }

    function renderTomorrowDateLine() {
        if (!els.tomorrowDateLine) return;
        var d = getTomorrow();
        els.tomorrowDateLine.textContent = new Intl.DateTimeFormat("pl-PL", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric"
        }).format(d);
    }

    function tickClock() {
        var d = new Date();
        var iso = toISODate(d);
        if (els.liveClock) {
            els.liveClock.textContent = new Intl.DateTimeFormat("pl-PL", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: false
            }).format(d);
        }
        if (els.tomorrowCountdown) {
            els.tomorrowCountdown.textContent = formatHMS(secondsUntilMidnight());
        }
        if (iso !== cachedTodayIso) {
            cachedTodayIso = iso;
            renderTodayDateLine();
            renderTomorrowDateLine();
            renderTodayAgenda();
            renderTomorrowAgenda();
            renderGrid();
        }
    }

    function sortEvents(list) {
        return list.slice().sort(function (a, b) {
            var ta = a.time || "";
            var tb = b.time || "";
            if (ta !== tb) return ta.localeCompare(tb);
            return (a.title || "").localeCompare(b.title || "");
        });
    }

    function renderAgendaList(ulEl, iso, emptyText) {
        if (!ulEl) return;
        var store = loadStore();
        var list = sortEvents(eventsForDay(store, iso));

        ulEl.innerHTML = "";
        if (!list.length) {
            var empty = document.createElement("li");
            empty.className = "today-panel-empty";
            empty.textContent = emptyText;
            ulEl.appendChild(empty);
            return;
        }

        list.forEach(function (ev) {
            var li = document.createElement("li");
            li.className = "today-panel-item";

            var main = document.createElement("div");
            main.className = "today-panel-item-main";
            if (ev.time) {
                var timeEl = document.createElement("strong");
                timeEl.textContent = ev.time;
                main.appendChild(timeEl);
                main.appendChild(document.createTextNode(" — "));
            }
            var titleEl = document.createElement("span");
            titleEl.textContent = ev.title || "(bez tytułu)";
            main.appendChild(titleEl);
            li.appendChild(main);

            if (ev.note) {
                var note = document.createElement("p");
                note.className = "today-panel-item-note muted";
                note.textContent = ev.note;
                li.appendChild(note);
            }

            var del = document.createElement("button");
            del.type = "button";
            del.className = "btn btn-ghost btn-sm today-panel-item-del";
            del.textContent = "Usuń";
            del.addEventListener("click", function (dayIso, id) {
                return function () {
                    removeEventFromDay(dayIso, id);
                };
            }(iso, ev.id));
            li.appendChild(del);

            ulEl.appendChild(li);
        });
    }

    function renderTodayAgenda() {
        renderAgendaList(
            els.todayAgenda,
            toISODate(new Date()),
            "Nic zaplanowanego — dodaj wydarzenie w kalendarzu na dziś."
        );
    }

    function renderTomorrowAgenda() {
        renderAgendaList(
            els.tomorrowAgenda,
            toISODate(getTomorrow()),
            "Nic zaplanowanego — dodaj wydarzenie w kalendarzu na jutro."
        );
    }

    function monthTitle(y, m) {
        var name = MONTHS[m];
        return name.charAt(0).toUpperCase() + name.slice(1) + " " + y;
    }

    function formatDayHeading(iso) {
        var d = parseISODate(iso);
        return new Intl.DateTimeFormat("pl-PL", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric"
        }).format(d);
    }

    function eventsForDay(store, iso) {
        var list = store[iso];
        return Array.isArray(list) ? list : [];
    }

    function renderGrid() {
        var store = loadStore();
        var y = state.y;
        var m = state.m;
        if (els.monthYear) {
            els.monthYear.textContent = monthTitle(y, m);
        }

        var first = new Date(y, m, 1);
        var lead = (first.getDay() + 6) % 7;
        var cur = new Date(y, m, 1 - lead);
        grid.innerHTML = "";

        for (var row = 0; row < 6; row++) {
            var rowEl = document.createElement("div");
            rowEl.className = "cal-week";
            rowEl.setAttribute("role", "row");

            for (var col = 0; col < 7; col++) {
                var d = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate());
                var iso = toISODate(d);
                var inMonth = d.getMonth() === m && d.getFullYear() === y;
                var isToday = iso === toISODate(new Date());
                var evts = eventsForDay(store, iso);

                var btn = document.createElement("button");
                btn.type = "button";
                btn.className = "cal-day";
                if (!inMonth) btn.classList.add("cal-day--muted");
                if (isToday) btn.classList.add("cal-day--today");
                btn.setAttribute("role", "gridcell");
                btn.setAttribute("data-date", iso);
                btn.setAttribute(
                    "aria-label",
                    d.getDate() + " " + MONTHS[d.getMonth()] + " " + d.getFullYear() +
                        (evts.length ? ", " + evts.length + " wydarzeń" : "")
                );

                var num = document.createElement("span");
                num.className = "cal-day-num";
                num.textContent = String(d.getDate());
                btn.appendChild(num);

                if (evts.length) {
                    var dot = document.createElement("span");
                    dot.className = "cal-day-dots";
                    dot.setAttribute("aria-hidden", "true");
                    var n = Math.min(evts.length, 3);
                    for (var j = 0; j < n; j++) {
                        var dotEl = document.createElement("span");
                        dotEl.className = "cal-day-dot";
                        dot.appendChild(dotEl);
                    }
                    btn.appendChild(dot);
                }

                btn.addEventListener("click", function (is) {
                    return function () {
                        openDay(is);
                    };
                }(iso));

                rowEl.appendChild(btn);
                cur.setDate(cur.getDate() + 1);
            }

            grid.appendChild(rowEl);
        }

        renderTodayAgenda();
        renderTomorrowAgenda();
    }

    function renderEventList() {
        var iso = state.selectedISO;
        if (!iso || !els.eventList) return;

        var store = loadStore();
        var list = sortEvents(eventsForDay(store, iso));

        els.eventList.innerHTML = "";
        if (!list.length) {
            var empty = document.createElement("li");
            empty.className = "cal-event-empty muted";
            empty.textContent = "Brak wydarzeń — dodaj pierwsze poniżej.";
            els.eventList.appendChild(empty);
            return;
        }

        list.forEach(function (ev) {
            var li = document.createElement("li");
            li.className = "cal-event-item";

            var main = document.createElement("div");
            main.className = "cal-event-main";
            if (ev.time) {
                var timeEl = document.createElement("strong");
                timeEl.textContent = ev.time;
                main.appendChild(timeEl);
                main.appendChild(document.createTextNode(" — "));
            }
            var titleEl = document.createElement("span");
            titleEl.textContent = ev.title || "(bez tytułu)";
            main.appendChild(titleEl);
            li.appendChild(main);

            if (ev.note) {
                var note = document.createElement("p");
                note.className = "cal-event-note muted";
                note.textContent = ev.note;
                li.appendChild(note);
            }

            var del = document.createElement("button");
            del.type = "button";
            del.className = "btn btn-ghost btn-sm cal-event-del";
            del.textContent = "Usuń";
            del.addEventListener("click", function (id) {
                return function () {
                    removeEvent(id);
                };
            }(ev.id));
            li.appendChild(del);

            els.eventList.appendChild(li);
        });
    }

    function openDay(iso) {
        state.selectedISO = iso;
        if (els.dialogTitle) {
            els.dialogTitle.textContent = formatDayHeading(iso);
        }
        renderEventList();
        if (els.dialog && typeof els.dialog.showModal === "function") {
            els.dialog.showModal();
        }
        if (els.inputTitle) {
            els.inputTitle.value = "";
            els.inputTitle.focus();
        }
        if (els.inputTime) els.inputTime.value = "";
        if (els.inputNote) els.inputNote.value = "";
    }

    function removeEventFromDay(iso, id) {
        if (!iso) return;
        var store = loadStore();
        var list = eventsForDay(store, iso).filter(function (e) {
            return e.id !== id;
        });
        if (list.length) store[iso] = list;
        else delete store[iso];
        saveStore(store);
        if (state.selectedISO === iso) renderEventList();
        renderGrid();
    }

    function removeEvent(id) {
        removeEventFromDay(state.selectedISO, id);
    }

    function addEvent(title, time, note) {
        var iso = state.selectedISO;
        if (!iso) return;
        var store = loadStore();
        var list = eventsForDay(store, iso);
        list.push({
            id: newId(),
            title: title.trim(),
            time: time || "",
            note: (note || "").trim()
        });
        store[iso] = list;
        saveStore(store);
        renderEventList();
        renderGrid();
    }

    if (els.prev) {
        els.prev.addEventListener("click", function () {
            state.m--;
            if (state.m < 0) {
                state.m = 11;
                state.y--;
            }
            renderGrid();
        });
    }
    if (els.next) {
        els.next.addEventListener("click", function () {
            state.m++;
            if (state.m > 11) {
                state.m = 0;
                state.y++;
            }
            renderGrid();
        });
    }
    if (els.todayBtn) {
        els.todayBtn.addEventListener("click", function () {
            var t = new Date();
            state.y = t.getFullYear();
            state.m = t.getMonth();
            renderGrid();
        });
    }

    if (els.closeBtn && els.dialog) {
        els.closeBtn.addEventListener("click", function () {
            els.dialog.close();
        });
    }

    if (els.addForm) {
        els.addForm.addEventListener("submit", function (e) {
            e.preventDefault();
            var title = els.inputTitle ? els.inputTitle.value : "";
            var time = els.inputTime ? els.inputTime.value : "";
            var note = els.inputNote ? els.inputNote.value : "";
            if (!title || !title.trim()) return;
            addEvent(title, time, note);
            if (els.inputTitle) els.inputTitle.value = "";
            if (els.inputTime) els.inputTime.value = "";
            if (els.inputNote) els.inputNote.value = "";
            if (els.inputTitle) els.inputTitle.focus();
        });
    }

    renderTodayDateLine();
    renderTomorrowDateLine();
    tickClock();
    setInterval(tickClock, 1000);

    document.addEventListener("visibilitychange", function () {
        if (document.visibilityState === "visible") {
            tickClock();
        }
    });

    window.addEventListener("storage", function (e) {
        if (e.key !== storageKey()) return;
        cachedTodayIso = toISODate(new Date());
        renderTodayDateLine();
        renderTomorrowDateLine();
        renderGrid();
        if (state.selectedISO) renderEventList();
    });

    renderGrid();

    window.SCCalendar = {
        storageKey: storageKey,
        loadStore: loadStore,
        toISODate: toISODate,
        countTodayEvents: function () {
            var today = toISODate(new Date());
            var store = loadStore();
            return (store[today] || []).length;
        }
    };
})();
