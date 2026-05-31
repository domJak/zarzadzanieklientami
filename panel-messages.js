(function () {
    var listEl = document.getElementById("inboxList");
    if (!listEl || !window.SCMessages) return;

    var els = {
        searchInput: document.getElementById("inboxSearch"),
        channelFilter: document.getElementById("inboxChannelFilter"),
        unreadOnly: document.getElementById("inboxUnreadOnly"),
        detailDialog: document.getElementById("inboxDetailDialog"),
        detailTitle: document.getElementById("inboxDetailTitle"),
        detailMeta: document.getElementById("inboxDetailMeta"),
        detailBody: document.getElementById("inboxDetailBody"),
        replyStatus: document.getElementById("inboxReplyStatus"),
        addToCrmBtn: document.getElementById("inboxAddToCrm"),
        replyMailtoBtn: document.getElementById("inboxReplyMailto"),
        replyCopyBtn: document.getElementById("inboxReplyCopy"),
        detailCloseBtn: document.getElementById("inboxDetailClose"),
        detailDeleteBtn: document.getElementById("inboxDetailDelete")
    };

    var currentMessageId = null;

    function loadMessages() {
        window.SCMessages.ensureInitialData();
        return window.SCMessages.loadMessages() || [];
    }

    function saveMessages(list) {
        window.SCMessages.saveMessages(list);
        notifyChange();
    }

    function notifyChange() {
        window.dispatchEvent(new CustomEvent("sc-data-change", { detail: { module: "messages" } }));
    }

    function getMessageById(id) {
        return loadMessages().filter(function (m) {
            return m.id === id;
        })[0] || null;
    }

    function getFilteredMessages() {
        var list = loadMessages();
        var q = els.searchInput ? String(els.searchInput.value || "").trim().toLowerCase() : "";
        var channel = els.channelFilter ? els.channelFilter.value : "";
        var unreadOnly = els.unreadOnly && els.unreadOnly.checked;

        return list.filter(function (m) {
            if (unreadOnly && m.read) return false;
            if (channel && m.channel !== channel) return false;
            if (!q) return true;
            var hay = (m.fromName + " " + m.fromEmail + " " + m.preview + " " + m.body).toLowerCase();
            return hay.indexOf(q) !== -1;
        });
    }

    function markRead(id) {
        var list = loadMessages();
        var changed = false;
        list.forEach(function (m) {
            if (m.id === id && !m.read) {
                m.read = true;
                changed = true;
            }
        });
        if (changed) saveMessages(list);
    }

    function removeMessage(id) {
        saveMessages(loadMessages().filter(function (m) {
            return m.id !== id;
        }));
        renderInbox();
    }

    function buildReplyTemplate(msg) {
        var greeting = msg.fromName ? "Dzień dobry " + msg.fromName.split(" ")[0] + "," : "Dzień dobry,";
        return (
            greeting + "\n\n" +
            "Dziękujemy za wiadomość.\n\n" +
            "[Tu wpisz odpowiedź]\n\n" +
            "Pozdrawiamy,\n" +
            "Zespół SalesControl"
        );
    }

    function renderInbox() {
        var list = getFilteredMessages();
        listEl.innerHTML = "";

        if (!list.length) {
            var empty = document.createElement("li");
            empty.className = "inbox-item inbox-empty muted";
            empty.textContent = loadMessages().length
                ? "Brak wiadomości dla wybranych filtrów."
                : "Brak wiadomości — zgłoszenia z formularza na stronie pojawią się tutaj.";
            listEl.appendChild(empty);
            return;
        }

        list.forEach(function (msg) {
            var li = document.createElement("li");
            li.className = "inbox-item";
            if (!msg.read) li.classList.add("inbox-item-unread");

            var btn = document.createElement("button");
            btn.type = "button";
            btn.className = "inbox-item-btn";
            btn.setAttribute("aria-label", "Otwórz wiadomość od " + (msg.fromName || "nadawcy"));

            var channel = document.createElement("span");
            channel.className = "inbox-channel";
            if (msg.channel === "form") channel.classList.add("inbox-channel-form");
            channel.textContent = window.SCMessages.getChannelLabel(msg.channel);

            var strong = document.createElement("strong");
            strong.textContent = msg.fromName || "Nieznany nadawca";

            btn.appendChild(channel);
            btn.appendChild(strong);
            btn.appendChild(document.createTextNode(" — „" + (msg.preview || "") + "” "));

            var time = document.createElement("span");
            time.className = "muted";
            time.textContent = "· " + window.SCMessages.formatTimeLabel(msg.createdAt);
            btn.appendChild(time);

            btn.addEventListener("click", function (id) {
                return function () {
                    openDetail(id);
                };
            }(msg.id));

            li.appendChild(btn);
            listEl.appendChild(li);
        });
    }

    function appendMeta(container, label, value) {
        if (!value) return;
        var row = document.createElement("div");
        row.className = "inbox-detail-row";
        var strong = document.createElement("strong");
        strong.textContent = label;
        row.appendChild(strong);
        row.appendChild(document.createTextNode(" " + value));
        container.appendChild(row);
    }

    function updateCrmButton(msg) {
        if (!els.addToCrmBtn) return;
        if (msg.fromEmail && window.SCCRM && window.SCCRM.findByEmail(msg.fromEmail)) {
            els.addToCrmBtn.textContent = "Zaktualizuj w CRM";
        } else {
            els.addToCrmBtn.textContent = "Dodaj do CRM";
        }
    }

    function openDetail(id) {
        var msg = getMessageById(id);
        if (!msg) return;

        currentMessageId = id;
        markRead(id);

        if (els.replyStatus) els.replyStatus.textContent = "";

        if (els.detailTitle) {
            els.detailTitle.textContent = msg.fromName || "Wiadomość";
        }

        if (els.detailMeta) {
            els.detailMeta.innerHTML = "";
            var channelRow = document.createElement("div");
            channelRow.className = "inbox-detail-row";
            var channel = document.createElement("span");
            channel.className = "inbox-channel";
            if (msg.channel === "form") channel.classList.add("inbox-channel-form");
            channel.textContent = window.SCMessages.getChannelLabel(msg.channel);
            channelRow.appendChild(channel);
            els.detailMeta.appendChild(channelRow);

            appendMeta(els.detailMeta, "E-mail:", msg.fromEmail);
            appendMeta(els.detailMeta, "Czas:", window.SCMessages.formatTimeLabel(msg.createdAt));
        }

        if (els.detailBody) {
            els.detailBody.textContent = msg.body || msg.preview || "";
        }

        if (els.replyMailtoBtn) {
            if (msg.fromEmail) {
                els.replyMailtoBtn.hidden = false;
                var subject = encodeURIComponent("Re: " + (msg.preview || "Wiadomość z SalesControl"));
                var body = encodeURIComponent(buildReplyTemplate(msg));
                els.replyMailtoBtn.onclick = function () {
                    window.location.href = "mailto:" + msg.fromEmail + "?subject=" + subject + "&body=" + body;
                };
            } else {
                els.replyMailtoBtn.hidden = true;
            }
        }

        updateCrmButton(msg);

        if (els.detailDialog && typeof els.detailDialog.showModal === "function") {
            els.detailDialog.showModal();
        }

        renderInbox();
    }

    function closeDetail() {
        currentMessageId = null;
        if (els.detailDialog) els.detailDialog.close();
    }

    function deleteCurrentMessage() {
        if (!currentMessageId) return;
        removeMessage(currentMessageId);
        closeDetail();
    }

    function copyReplyTemplate() {
        var msg = getMessageById(currentMessageId);
        if (!msg) return;
        var text = buildReplyTemplate(msg);

        function showOk() {
            if (els.replyStatus) {
                els.replyStatus.textContent = "Skopiowano szablon odpowiedzi do schowka.";
            }
        }

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(showOk).catch(function () {
                window.prompt("Skopiuj szablon odpowiedzi:", text);
            });
        } else {
            window.prompt("Skopiuj szablon odpowiedzi:", text);
            showOk();
        }
    }

    function addCurrentToCrm() {
        var msg = getMessageById(currentMessageId);
        if (!msg || !window.SCCRM || !window.SCCRM.addFromMessage) return;

        var result = window.SCCRM.addFromMessage(msg);
        if (!result.ok) return;

        if (els.replyStatus) {
            els.replyStatus.textContent = result.exists
                ? "Kontakt zaktualizowany w CRM — dodano notatkę z wiadomości."
                : "Kontakt dodany do CRM.";
        }
        updateCrmButton(msg);
    }

    renderInbox();

    if (els.searchInput) els.searchInput.addEventListener("input", renderInbox);
    if (els.channelFilter) els.channelFilter.addEventListener("change", renderInbox);
    if (els.unreadOnly) els.unreadOnly.addEventListener("change", renderInbox);
    if (els.detailCloseBtn) els.detailCloseBtn.addEventListener("click", closeDetail);
    if (els.detailDeleteBtn) els.detailDeleteBtn.addEventListener("click", deleteCurrentMessage);
    if (els.replyCopyBtn) els.replyCopyBtn.addEventListener("click", copyReplyTemplate);
    if (els.addToCrmBtn) els.addToCrmBtn.addEventListener("click", addCurrentToCrm);

    window.addEventListener("storage", function (e) {
        if (e.key !== window.SCMessages.storageKey()) return;
        renderInbox();
    });

    window.addEventListener("sc-data-change", function () {
        renderInbox();
        if (currentMessageId) {
            var msg = getMessageById(currentMessageId);
            if (msg) updateCrmButton(msg);
        }
    });
})();
