(function () {
    var params = new URLSearchParams(window.location.search);
    var funnelId = params.get("id") || "";
    var ownerHint = params.get("owner") || "";

    var contentEl = document.getElementById("salespageContent");
    var errorEl = document.getElementById("salespageError");
    var titleEl = document.getElementById("offerTitle");
    var statusEl = document.getElementById("offerStatus");
    var descEl = document.getElementById("offerDesc");
    var metaEl = document.getElementById("offerMeta");
    var bookCta = document.getElementById("bookCta");

    if (!window.SCBooking || !funnelId) {
        if (errorEl) errorEl.hidden = false;
        return;
    }

    var result = window.SCBooking.findFunnelById(funnelId, ownerHint);
    if (!result || !result.funnel) {
        if (errorEl) errorEl.hidden = false;
        return;
    }

    var funnel = result.funnel;
    var ownerEmail = result.ownerEmail;

    document.title = (funnel.name || "Oferta") + " — SalesControl";

    if (titleEl) titleEl.textContent = funnel.name || "Oferta";

    if (statusEl) {
        var isDraft = funnel.status === "draft";
        statusEl.className = isDraft ? "tag tag-draft" : "tag tag-live";
        statusEl.textContent = window.SCBooking.funnelStatusLabel(funnel.status);
    }

    if (descEl) {
        descEl.textContent =
            funnel.description && String(funnel.description).trim()
                ? funnel.description
                : "Poznaj szczegóły oferty i umów bezpłatną konsultację w dogodnym terminie.";
    }

    if (metaEl) {
        metaEl.innerHTML = "";
        if (funnel.conversion && funnel.conversion !== "—") {
            var conv = document.createElement("p");
            conv.className = "salespage-meta-item muted";
            conv.textContent = "Konwersja (ostatnie 7 dni): " + funnel.conversion;
            metaEl.appendChild(conv);
        }
    }

    var bookingUrl =
        "booking.html?id=" +
        encodeURIComponent(funnelId) +
        (ownerEmail ? "&owner=" + encodeURIComponent(ownerEmail) : "");

    if (bookCta) bookCta.href = bookingUrl;

    if (contentEl) contentEl.hidden = false;
})();
