(function () {
    if (!window.SCBooking) return;

    var params = new URLSearchParams(window.location.search);
    var funnelId = params.get("id") || "";
    var ownerHint = params.get("owner") || "";

    var formWrap = document.getElementById("bookingFormWrap");
    var successWrap = document.getElementById("bookingSuccess");
    var errorWrap = document.getElementById("bookingError");
    var offerTitleEl = document.getElementById("bookingOfferTitle");
    var backToOffer = document.getElementById("backToOffer");
    var successBackOffer = document.getElementById("successBackOffer");
    var form = document.getElementById("bookingForm");
    var dateInput = document.getElementById("bookingDate");
    var timeInput = document.getElementById("bookingTime");
    var slotGrid = document.getElementById("slotGrid");
    var slotHint = document.getElementById("slotHint");
    var statusEl = document.getElementById("bookingStatus");
    var successDetail = document.getElementById("successDetail");

    var selectedSlot = null;
    var funnel = null;
    var ownerEmail = "";

    function showError(msg) {
        if (errorWrap) {
            var txt = document.getElementById("bookingErrorText");
            if (txt) txt.textContent = msg || "Nie znaleziono oferty.";
            errorWrap.hidden = false;
        }
        if (formWrap) formWrap.hidden = true;
    }

    function salespageUrl() {
        return (
            "salespage.html?id=" +
            encodeURIComponent(funnelId) +
            (ownerEmail ? "&owner=" + encodeURIComponent(ownerEmail) : "")
        );
    }

    function setMinDate() {
        if (!dateInput) return;
        dateInput.min = window.SCBooking.toISODate(new Date());
    }

    function clearFieldErrors() {
        ["dateError", "timeError", "nameError", "emailError"].forEach(function (id) {
            var el = document.getElementById(id);
            if (el) el.hidden = true;
        });
        if (statusEl) statusEl.textContent = "";
    }

    function showFieldError(id, msg) {
        var el = document.getElementById(id);
        if (el) {
            el.textContent = msg;
            el.hidden = false;
        }
    }

    function renderSlots() {
        if (!slotGrid || !dateInput) return;
        var dateISO = dateInput.value;
        selectedSlot = null;
        if (timeInput) timeInput.value = "";
        slotGrid.innerHTML = "";

        if (!dateISO) {
            if (slotHint) slotHint.textContent = "Najpierw wybierz datę.";
            return;
        }

        var slots = window.SCBooking.getAvailableSlots(ownerEmail, dateISO);
        if (!slots.length) {
            if (slotHint) slotHint.textContent = "Brak wolnych terminów w wybranym dniu.";
            return;
        }

        if (slotHint) slotHint.textContent = "Kliknij godzinę, aby wybrać termin.";

        slots.forEach(function (slot) {
            var btn = document.createElement("button");
            btn.type = "button";
            btn.className = "slot-btn";
            btn.setAttribute("role", "radio");
            btn.setAttribute("aria-checked", "false");
            btn.textContent = slot.start + "–" + slot.end;
            btn.addEventListener("click", function () {
                selectedSlot = slot;
                if (timeInput) timeInput.value = slot.start;
                slotGrid.querySelectorAll(".slot-btn").forEach(function (b) {
                    b.classList.remove("is-selected");
                    b.setAttribute("aria-checked", "false");
                });
                btn.classList.add("is-selected");
                btn.setAttribute("aria-checked", "true");
            });
            slotGrid.appendChild(btn);
        });
    }

    function validateForm() {
        clearFieldErrors();
        var valid = true;
        var dateISO = dateInput ? dateInput.value : "";
        var name = document.getElementById("bookingName");
        var email = document.getElementById("bookingEmail");
        var nameVal = name ? name.value.trim() : "";
        var emailVal = email ? email.value.trim() : "";

        if (!dateISO) {
            showFieldError("dateError", "Wybierz datę spotkania.");
            valid = false;
        }

        if (!selectedSlot || !timeInput || !timeInput.value) {
            showFieldError("timeError", "Wybierz godzinę spotkania.");
            valid = false;
        }

        if (!nameVal) {
            showFieldError("nameError", "Podaj imię i nazwisko.");
            valid = false;
        }

        if (!emailVal) {
            showFieldError("emailError", "Podaj adres e-mail.");
            valid = false;
        } else if (!window.SCBooking.isValidEmail(emailVal)) {
            showFieldError("emailError", "Podaj poprawny adres e-mail.");
            valid = false;
        }

        return valid
            ? {
                  ok: true,
                  date: dateISO,
                  startTime: selectedSlot.start,
                  endTime: selectedSlot.end,
                  clientName: nameVal,
                  clientEmail: emailVal,
                  clientMessage: document.getElementById("bookingMessage")
                      ? document.getElementById("bookingMessage").value
                      : ""
              }
            : { ok: false };
    }

    function formatDatePL(iso) {
        var p = iso.split("-");
        var d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
        return new Intl.DateTimeFormat("pl-PL", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric"
        }).format(d);
    }

    if (!funnelId) {
        showError("Brak identyfikatora lejka w adresie URL.");
        return;
    }

    var found = window.SCBooking.findFunnelById(funnelId, ownerHint);
    if (!found || !found.funnel) {
        showError("Nie znaleziono oferty powiązanej z tym linkiem.");
        return;
    }

    funnel = found.funnel;
    ownerEmail = found.ownerEmail;

    document.title = "Rezerwacja — " + (funnel.name || "Oferta");

    if (offerTitleEl) offerTitleEl.textContent = funnel.name || "Oferta";
    if (backToOffer) backToOffer.href = salespageUrl();
    if (successBackOffer) successBackOffer.href = salespageUrl();
    if (formWrap) formWrap.hidden = false;

    setMinDate();

    if (dateInput) {
        dateInput.addEventListener("change", renderSlots);
        dateInput.addEventListener("input", renderSlots);
    }

    if (form) {
        form.addEventListener("submit", function (e) {
            e.preventDefault();
            var data = validateForm();
            if (!data.ok) return;

            if (statusEl) {
                statusEl.style.color = "#94a3b8";
                statusEl.textContent = "Zapisywanie rezerwacji…";
            }

            var result = window.SCBooking.saveBooking(ownerEmail, funnel, {
                date: data.date,
                startTime: data.startTime,
                endTime: data.endTime,
                clientName: data.clientName,
                clientEmail: data.clientEmail,
                clientMessage: data.clientMessage
            });

            if (!result.ok) {
                if (statusEl) {
                    statusEl.style.color = "#fca5a5";
                    statusEl.textContent = result.error || "Nie udało się zarezerwować terminu.";
                }
                renderSlots();
                return;
            }

            if (formWrap) formWrap.hidden = true;
            if (successWrap) successWrap.hidden = false;
            if (successDetail) {
                successDetail.textContent =
                    data.clientName +
                    ", spotkanie dotyczące „" +
                    (funnel.name || "oferty") +
                    "” zaplanowano na " +
                    formatDatePL(data.date) +
                    ", godz. " +
                    data.startTime +
                    "–" +
                    data.endTime +
                    ".";
            }
        });
    }
})();
