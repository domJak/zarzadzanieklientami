(function () {
    var FUNNEL_PREFIX = "salescontrol_funnels_";
    var CALENDAR_PREFIX = "salescontrol_calendar_";
    var CRM_PREFIX = "salescontrol_crm_";

    var TIME_SLOTS = [
        { start: "08:00", end: "09:00" },
        { start: "09:00", end: "10:00" },
        { start: "10:00", end: "11:00" },
        { start: "11:00", end: "12:00" },
        { start: "12:00", end: "13:00" },
        { start: "13:00", end: "14:00" },
        { start: "14:00", end: "15:00" },
        { start: "15:00", end: "16:00" }
    ];

    function toISODate(d) {
        var y = d.getFullYear();
        var m = String(d.getMonth() + 1).padStart(2, "0");
        var day = String(d.getDate()).padStart(2, "0");
        return y + "-" + m + "-" + day;
    }

    function parseStartTimeFromEvent(ev) {
        if (ev.startTime) return ev.startTime;
        var t = String(ev.time || "").trim();
        var m = t.match(/^(\d{2}:\d{2})/);
        return m ? m[1] : "";
    }

    function loadCalendarStore(ownerEmail) {
        try {
            var raw = localStorage.getItem(CALENDAR_PREFIX + ownerEmail);
            var data = raw ? JSON.parse(raw) : {};
            return data && typeof data === "object" ? data : {};
        } catch (e) {
            return {};
        }
    }

    function saveCalendarStore(ownerEmail, store) {
        localStorage.setItem(CALENDAR_PREFIX + ownerEmail, JSON.stringify(store));
    }

    function loadCrmContacts(ownerEmail) {
        try {
            var raw = localStorage.getItem(CRM_PREFIX + ownerEmail);
            if (!raw) return [];
            var arr = JSON.parse(raw);
            return Array.isArray(arr) ? arr : [];
        } catch (e) {
            return [];
        }
    }

    function saveCrmContacts(ownerEmail, list) {
        localStorage.setItem(CRM_PREFIX + ownerEmail, JSON.stringify(list));
    }

    function newBookingId() {
        return "bk_" + Date.now() + "_" + Math.random().toString(36).slice(2, 9);
    }

    function newCrmId() {
        return "crm_" + Date.now() + "_" + Math.random().toString(36).slice(2, 9);
    }

    function defaultActivityLabel() {
        var now = new Date();
        return "Dziś, " + String(now.getHours()).padStart(2, "0") + ":" + String(now.getMinutes()).padStart(2, "0");
    }

    function findFunnelById(funnelId, ownerHint) {
        if (!funnelId) return null;

        if (ownerHint) {
            try {
                var key = FUNNEL_PREFIX + ownerHint;
                var raw = localStorage.getItem(key);
                if (raw) {
                    var list = JSON.parse(raw);
                    if (Array.isArray(list)) {
                        for (var i = 0; i < list.length; i++) {
                            if (list[i].id === funnelId) {
                                return { funnel: list[i], ownerEmail: ownerHint };
                            }
                        }
                    }
                }
            } catch (e) { /* ignore */ }
        }

        for (var j = 0; j < localStorage.length; j++) {
            var storageKey = localStorage.key(j);
            if (!storageKey || storageKey.indexOf(FUNNEL_PREFIX) !== 0) continue;
            try {
                var funnels = JSON.parse(localStorage.getItem(storageKey));
                if (!Array.isArray(funnels)) continue;
                for (var k = 0; k < funnels.length; k++) {
                    if (funnels[k].id === funnelId) {
                        return {
                            funnel: funnels[k],
                            ownerEmail: storageKey.slice(FUNNEL_PREFIX.length)
                        };
                    }
                }
            } catch (e2) { /* ignore */ }
        }
        return null;
    }

    function getBookedStartTimes(ownerEmail, dateISO) {
        var store = loadCalendarStore(ownerEmail);
        var events = Array.isArray(store[dateISO]) ? store[dateISO] : [];
        var booked = {};
        events.forEach(function (ev) {
            var start = parseStartTimeFromEvent(ev);
            if (start) booked[start] = true;
        });
        return booked;
    }

    function isSlotPast(dateISO, startTime) {
        var today = toISODate(new Date());
        if (dateISO !== today) return false;
        var parts = startTime.split(":");
        var slotStart = new Date();
        slotStart.setHours(Number(parts[0]), Number(parts[1]), 0, 0);
        return slotStart <= new Date();
    }

    function getAvailableSlots(ownerEmail, dateISO) {
        if (!dateISO) return [];
        var booked = getBookedStartTimes(ownerEmail, dateISO);
        return TIME_SLOTS.filter(function (slot) {
            if (booked[slot.start]) return false;
            if (isSlotPast(dateISO, slot.start)) return false;
            return true;
        });
    }

    function funnelStatusLabel(status) {
        return status === "draft" ? "Szkic" : "Aktywny";
    }

    function buildBookingNote(data) {
        var lines = [
            "Status: Zarezerwowane",
            "Lejek: " + data.funnelName,
            "E-mail: " + data.clientEmail
        ];
        if (data.clientMessage) {
            lines.push("Wiadomość: " + data.clientMessage);
        }
        return lines.join("\n");
    }

    function updateCrmFromBooking(ownerEmail, data) {
        var contacts = loadCrmContacts(ownerEmail);
        var normEmail = String(data.clientEmail || "").trim().toLowerCase();
        var meetingLine =
            "Klient wybrał termin spotkania: " +
            data.date +
            ", " +
            data.startTime +
            "–" +
            data.endTime +
            ".";
        if (data.clientMessage) {
            meetingLine += " Wiadomość: " + data.clientMessage;
        }

        var existing = null;
        for (var i = 0; i < contacts.length; i++) {
            if (String(contacts[i].email || "").trim().toLowerCase() === normEmail) {
                existing = contacts[i];
                break;
            }
        }

        if (existing) {
            var tags = String(existing.tags || "")
                .split(",")
                .map(function (t) { return t.trim(); })
                .filter(Boolean);
            if (tags.indexOf("rezerwacja spotkania") === -1) {
                tags.push("rezerwacja spotkania");
            }
            existing.tags = tags.join(", ");
            existing.funnelId = data.funnelId || existing.funnelId || "";
            existing.lastActivity = defaultActivityLabel();
            existing.notes = existing.notes
                ? existing.notes + "\n\n---\n\n" + meetingLine
                : meetingLine;
            if (existing.stage === "new") existing.stage = "qualify";
        } else {
            contacts.push({
                id: newCrmId(),
                name: data.clientName.trim(),
                email: data.clientEmail.trim(),
                phone: "",
                stage: "qualify",
                tags: "rezerwacja spotkania, salespage",
                funnelId: data.funnelId || "",
                lastActivity: defaultActivityLabel(),
                notes: meetingLine,
                sourceMessageId: ""
            });
        }

        saveCrmContacts(ownerEmail, contacts);
    }

    function saveBooking(ownerEmail, funnel, booking) {
        var dateISO = booking.date;
        var startTime = booking.startTime;
        var endTime = booking.endTime;

        var booked = getBookedStartTimes(ownerEmail, dateISO);
        if (booked[startTime]) {
            return { ok: false, error: "Wybrany termin jest już zajęty. Odśwież stronę i wybierz inną godzinę." };
        }

        var store = loadCalendarStore(ownerEmail);
        var list = Array.isArray(store[dateISO]) ? store[dateISO].slice() : [];

        var event = {
            id: newBookingId(),
            title: booking.clientName.trim() + " — " + (funnel.name || "Oferta"),
            time: startTime + "–" + endTime,
            note: buildBookingNote({
                funnelName: funnel.name || "",
                clientEmail: booking.clientEmail,
                clientMessage: booking.clientMessage
            }),
            type: "booking",
            funnelId: funnel.id,
            funnelName: funnel.name || "",
            date: dateISO,
            startTime: startTime,
            endTime: endTime,
            clientName: booking.clientName.trim(),
            clientEmail: booking.clientEmail.trim(),
            clientMessage: String(booking.clientMessage || "").trim(),
            status: "Zarezerwowane"
        };

        list.push(event);
        store[dateISO] = list;
        saveCalendarStore(ownerEmail, store);

        updateCrmFromBooking(ownerEmail, {
            funnelId: funnel.id,
            funnelName: funnel.name || "",
            date: dateISO,
            startTime: startTime,
            endTime: endTime,
            clientName: booking.clientName,
            clientEmail: booking.clientEmail,
            clientMessage: booking.clientMessage
        });

        try {
            window.dispatchEvent(new CustomEvent("sc-data-change", { detail: { module: "calendar" } }));
            window.dispatchEvent(new CustomEvent("sc-data-change", { detail: { module: "crm" } }));
        } catch (e) { /* ignore */ }

        return { ok: true, event: event };
    }

    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
    }

    window.SCBooking = {
        TIME_SLOTS: TIME_SLOTS,
        toISODate: toISODate,
        findFunnelById: findFunnelById,
        getAvailableSlots: getAvailableSlots,
        getBookedStartTimes: getBookedStartTimes,
        saveBooking: saveBooking,
        funnelStatusLabel: funnelStatusLabel,
        isValidEmail: isValidEmail,
        isSlotPast: isSlotPast
    };
})();
