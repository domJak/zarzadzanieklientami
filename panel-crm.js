(function () {
    var tbody = document.getElementById("crmTableBody");
    if (!tbody) return;

    var STORAGE_PREFIX = "salescontrol_crm_";
    var detailContactId = null;

    var STAGES = {
        new: { label: "Nowy lead", className: "tag tag-wait" },
        qualify: { label: "Kwalifikacja", className: "tag tag-live" },
        offer: { label: "Oferta", className: "tag tag-ok" },
        negotiation: { label: "Negocjacje", className: "tag tag-ok" },
        won: { label: "Wygrany", className: "tag tag-live" },
        lost: { label: "Przegrany", className: "tag tag-draft" }
    };

    var SEED = [
        {
            name: "Anna Kowalska",
            email: "anna@example.com",
            phone: "+48 600 111 222",
            stage: "qualify",
            tags: "webinar, B2C",
            funnelSeedName: "Webinar Q2",
            lastActivity: "Dziś, 09:12",
            notes: "Zapisała się z landing page Webinar Q2. Wysłano follow-up e-mail."
        },
        {
            name: "ACME Sp. z o.o.",
            email: "kontakt@acme.pl",
            phone: "+48 22 123 45 67",
            stage: "offer",
            tags: "B2B, enterprise",
            funnelSeedName: "",
            lastActivity: "Wczoraj",
            notes: "Oczekuje na wycenę wdrożenia. Spotkanie zaplanowane w kalendarzu."
        },
        {
            name: "Marek Nowak",
            email: "m.nowak@firma.eu",
            phone: "",
            stage: "new",
            tags: "lead magnet",
            funnelSeedName: "Lead magnet — checklista",
            lastActivity: "2 dni temu",
            notes: "Pobrał checklistę z lejka. Brak odpowiedzi na pierwszy e-mail."
        }
    ];

    function storageKey() {
        var em =
            window.SCAuth && window.SCAuth.getSessionEmail
                ? window.SCAuth.getSessionEmail()
                : "";
        return STORAGE_PREFIX + (em || "guest");
    }

    function newId() {
        return "crm_" + Date.now() + "_" + Math.random().toString(36).slice(2, 9);
    }

    function loadContacts() {
        try {
            var raw = localStorage.getItem(storageKey());
            if (!raw) return null;
            var arr = JSON.parse(raw);
            return Array.isArray(arr) ? arr : null;
        } catch (e) {
            return null;
        }
    }

    function saveContacts(list) {
        localStorage.setItem(storageKey(), JSON.stringify(list));
    }

    function resolveFunnelIdByName(name) {
        if (!name || !window.SCFunnels || !window.SCFunnels.findByName) return "";
        var f = window.SCFunnels.findByName(name);
        return f ? f.id : "";
    }

    function ensureInitialData() {
        if (loadContacts() !== null) {
            migrateContacts();
            return;
        }
        if (window.SCFunnels && window.SCFunnels.ensureInitialData) {
            window.SCFunnels.ensureInitialData();
        }
        var initial = SEED.map(function (s) {
            return {
                id: newId(),
                name: s.name,
                email: s.email,
                phone: s.phone || "",
                stage: s.stage,
                tags: s.tags || "",
                funnelId: resolveFunnelIdByName(s.funnelSeedName || ""),
                lastActivity: s.lastActivity || "—",
                notes: s.notes || "",
                sourceMessageId: ""
            };
        });
        saveContacts(initial);
    }

    function migrateContacts() {
        var list = loadContacts();
        if (!list) return;
        var changed = false;
        list.forEach(function (c) {
            if (c.funnelId === undefined) {
                c.funnelId = resolveFunnelIdByName(
                    c.notes && c.notes.indexOf("Webinar Q2") !== -1 ? "Webinar Q2" :
                    c.notes && c.notes.indexOf("checklist") !== -1 ? "Lead magnet — checklista" : ""
                );
                changed = true;
            }
            if (c.sourceMessageId === undefined) {
                c.sourceMessageId = "";
                changed = true;
            }
        });
        if (changed) saveContacts(list);
    }

    function getContactById(id) {
        return (loadContacts() || []).filter(function (c) {
            return c.id === id;
        })[0] || null;
    }

    function findByEmail(email) {
        var norm = String(email || "").trim().toLowerCase();
        if (!norm) return null;
        return (loadContacts() || []).filter(function (c) {
            return String(c.email || "").trim().toLowerCase() === norm;
        })[0] || null;
    }

    function parseTags(raw) {
        return String(raw || "")
            .split(",")
            .map(function (t) {
                return t.trim();
            })
            .filter(Boolean);
    }

    function tagsToString(tags) {
        if (Array.isArray(tags)) return tags.join(", ");
        return String(tags || "").trim();
    }

    function defaultActivityLabel() {
        var now = new Date();
        return "Dziś, " + String(now.getHours()).padStart(2, "0") + ":" + String(now.getMinutes()).padStart(2, "0");
    }

    function populateFunnelSelect(selectedId) {
        if (!els.inputFunnel) return;
        var current = selectedId || "";
        els.inputFunnel.innerHTML = "";
        var empty = document.createElement("option");
        empty.value = "";
        empty.textContent = "— brak —";
        els.inputFunnel.appendChild(empty);

        var funnels = window.SCFunnels && window.SCFunnels.loadFunnels ? window.SCFunnels.loadFunnels() || [] : [];
        funnels.forEach(function (f) {
            var opt = document.createElement("option");
            opt.value = f.id;
            opt.textContent = f.name || f.id;
            if (f.id === current) opt.selected = true;
            els.inputFunnel.appendChild(opt);
        });
    }

    var els = {
        addBtn: document.getElementById("addContactBtn"),
        dialog: document.getElementById("contactDialog"),
        form: document.getElementById("contactForm"),
        closeBtn: document.getElementById("contactDialogClose"),
        titleEl: document.getElementById("contactDialogTitle"),
        submitBtn: document.getElementById("contactSubmitBtn"),
        editId: document.getElementById("contactEditId"),
        inputName: document.getElementById("contactInputName"),
        inputEmail: document.getElementById("contactInputEmail"),
        inputPhone: document.getElementById("contactInputPhone"),
        inputStage: document.getElementById("contactInputStage"),
        inputFunnel: document.getElementById("contactInputFunnel"),
        inputTags: document.getElementById("contactInputTags"),
        inputActivity: document.getElementById("contactInputActivity"),
        inputNotes: document.getElementById("contactInputNotes"),
        searchInput: document.getElementById("crmSearch"),
        stageFilter: document.getElementById("crmStageFilter"),
        detailDialog: document.getElementById("contactDetailDialog"),
        detailTitle: document.getElementById("contactDetailTitle"),
        detailMeta: document.getElementById("contactDetailMeta"),
        detailLinks: document.getElementById("contactDetailLinks"),
        detailNotes: document.getElementById("contactDetailNotes"),
        detailCloseBtn: document.getElementById("contactDetailClose"),
        detailEditBtn: document.getElementById("contactDetailEdit")
    };

    function getFilteredContacts() {
        var list = loadContacts() || [];
        var q = els.searchInput ? String(els.searchInput.value || "").trim().toLowerCase() : "";
        var stage = els.stageFilter ? els.stageFilter.value : "";

        return list.filter(function (c) {
            if (stage && c.stage !== stage) return false;
            if (!q) return true;
            var hay = (c.name + " " + c.email + " " + c.tags + " " + c.notes).toLowerCase();
            return hay.indexOf(q) !== -1;
        });
    }

    function stageCell(stage) {
        var td = document.createElement("td");
        var info = STAGES[stage] || STAGES.new;
        var span = document.createElement("span");
        span.className = info.className;
        span.textContent = info.label;
        td.appendChild(span);
        return td;
    }

    function contactNameCell(contact) {
        var td = document.createElement("td");
        td.appendChild(document.createTextNode(contact.name || ""));
        if (contact.email) {
            td.appendChild(document.createTextNode(" "));
            var email = document.createElement("span");
            email.className = "muted";
            email.textContent = contact.email;
            td.appendChild(email);
        }
        return td;
    }

    function renderTable() {
        var list = getFilteredContacts();
        tbody.innerHTML = "";

        if (!list.length) {
            var tr = document.createElement("tr");
            var td = document.createElement("td");
            td.colSpan = 4;
            td.className = "crm-empty-row muted";
            td.textContent = loadContacts() && loadContacts().length
                ? "Brak wyników dla wybranych filtrów."
                : "Brak kontaktów — kliknij „Nowy kontakt”, aby dodać pierwszy.";
            tr.appendChild(td);
            tbody.appendChild(tr);
            return;
        }

        list.forEach(function (contact) {
            var tr = document.createElement("tr");
            tr.appendChild(contactNameCell(contact));
            tr.appendChild(stageCell(contact.stage));

            var tdActTime = document.createElement("td");
            tdActTime.textContent = contact.lastActivity || "—";
            tr.appendChild(tdActTime);

            var tdAct = document.createElement("td");
            tdAct.className = "crm-actions";

            ["Szczegóły", "Edytuj", "Usuń"].forEach(function (label, i) {
                var btn = document.createElement("button");
                btn.type = "button";
                btn.className = "btn btn-ghost btn-sm";
                btn.textContent = label;
                btn.addEventListener("click", function (id, action) {
                    return function () {
                        if (action === "detail") openDetail(id);
                        else if (action === "edit") openEdit(id);
                        else removeContact(id);
                    };
                }(contact.id, ["detail", "edit", "delete"][i]));
                tdAct.appendChild(btn);
            });
            tr.appendChild(tdAct);
            tbody.appendChild(tr);
        });
    }

    function openAdd(prefill) {
        prefill = prefill || {};
        if (els.editId) els.editId.value = "";
        if (els.titleEl) els.titleEl.textContent = "Nowy kontakt";
        if (els.submitBtn) els.submitBtn.textContent = "Dodaj kontakt";
        populateFunnelSelect(prefill.funnelId || "");
        if (els.inputName) {
            els.inputName.value = prefill.name || "";
            els.inputName.focus();
        }
        if (els.inputEmail) els.inputEmail.value = prefill.email || "";
        if (els.inputPhone) els.inputPhone.value = prefill.phone || "";
        if (els.inputStage) els.inputStage.value = prefill.stage || "new";
        if (els.inputTags) els.inputTags.value = prefill.tags || "";
        if (els.inputActivity) els.inputActivity.value = prefill.lastActivity || defaultActivityLabel();
        if (els.inputNotes) els.inputNotes.value = prefill.notes || "";
        if (els.dialog && typeof els.dialog.showModal === "function") {
            els.dialog.showModal();
        }
    }

    function openEdit(id) {
        var contact = getContactById(id);
        if (!contact) return;
        if (els.detailDialog && els.detailDialog.open) els.detailDialog.close();

        if (els.editId) els.editId.value = contact.id;
        if (els.titleEl) els.titleEl.textContent = "Edytuj kontakt";
        if (els.submitBtn) els.submitBtn.textContent = "Zapisz zmiany";
        populateFunnelSelect(contact.funnelId || "");
        if (els.inputName) els.inputName.value = contact.name || "";
        if (els.inputEmail) els.inputEmail.value = contact.email || "";
        if (els.inputPhone) els.inputPhone.value = contact.phone || "";
        if (els.inputStage) els.inputStage.value = STAGES[contact.stage] ? contact.stage : "new";
        if (els.inputTags) els.inputTags.value = tagsToString(contact.tags);
        if (els.inputActivity) els.inputActivity.value = contact.lastActivity === "—" ? "" : contact.lastActivity || "";
        if (els.inputNotes) els.inputNotes.value = contact.notes || "";
        if (els.dialog && typeof els.dialog.showModal === "function") els.dialog.showModal();
        if (els.inputName) els.inputName.focus();
    }

    function closeDialog() {
        if (els.dialog) els.dialog.close();
    }

    function removeContact(id) {
        saveContacts((loadContacts() || []).filter(function (c) {
            return c.id !== id;
        }));
        renderTable();
        notifyChange();
    }

    function upsertContact(id, data) {
        var list = loadContacts() || [];
        var existing = id ? getContactById(id) : null;
        var rec = {
            id: id || newId(),
            name: data.name.trim(),
            email: data.email.trim(),
            phone: String(data.phone || "").trim(),
            stage: STAGES[data.stage] ? data.stage : "new",
            tags: tagsToString(data.tags),
            funnelId: String(data.funnelId || "").trim(),
            lastActivity: String(data.lastActivity || "").trim() || "—",
            notes: String(data.notes || "").trim(),
            sourceMessageId: existing && existing.sourceMessageId ? existing.sourceMessageId : String(data.sourceMessageId || "").trim()
        };

        if (id) {
            var idx = -1;
            for (var i = 0; i < list.length; i++) {
                if (list[i].id === id) {
                    idx = i;
                    break;
                }
            }
            if (idx >= 0) list[idx] = rec;
        } else {
            list.push(rec);
        }
        saveContacts(list);
        renderTable();
        notifyChange();
        return rec;
    }

    function appendMetaRow(container, label, value) {
        if (!value) return;
        var row = document.createElement("div");
        row.className = "crm-detail-row";
        var strong = document.createElement("strong");
        strong.textContent = label;
        row.appendChild(strong);
        row.appendChild(document.createTextNode(" " + value));
        container.appendChild(row);
    }

    function renderDetailLinks(contact) {
        if (!els.detailLinks) return;
        els.detailLinks.innerHTML = "";

        var heading = document.createElement("h4");
        heading.className = "crm-links-heading";
        heading.textContent = "Powiązania";
        els.detailLinks.appendChild(heading);

        var list = document.createElement("ul");
        list.className = "crm-links-list";

        if (contact.funnelId && window.SCFunnels && window.SCFunnels.getFunnelById) {
            var funnel = window.SCFunnels.getFunnelById(contact.funnelId);
            if (funnel) {
                var liF = document.createElement("li");
                var aF = document.createElement("a");
                aF.href = "#lejki";
                aF.textContent = "Lejek: " + funnel.name;
                liF.appendChild(aF);
                list.appendChild(liF);
            }
        }

        if (window.SCDocuments && window.SCDocuments.findByContact) {
            var docs = window.SCDocuments.findByContact(contact);
            docs.forEach(function (doc) {
                var liD = document.createElement("li");
                var btn = document.createElement("button");
                btn.type = "button";
                btn.className = "link-btn";
                btn.textContent = "Dokument: " + doc.name;
                btn.addEventListener("click", function (docId) {
                    return function () {
                        if (window.SCDocuments.openViewer) window.SCDocuments.openViewer(docId);
                    };
                }(doc.id));
                liD.appendChild(btn);
                list.appendChild(liD);
            });
        }

        if (!list.children.length) {
            var liEmpty = document.createElement("li");
            liEmpty.className = "muted";
            liEmpty.textContent = "Brak powiązanych lejków i dokumentów.";
            list.appendChild(liEmpty);
        }

        els.detailLinks.appendChild(list);
    }

    function openDetail(id) {
        var contact = getContactById(id);
        if (!contact) return;

        detailContactId = contact.id;
        var stageInfo = STAGES[contact.stage] || STAGES.new;

        if (els.detailTitle) els.detailTitle.textContent = contact.name || "Szczegóły kontaktu";

        if (els.detailMeta) {
            els.detailMeta.innerHTML = "";
            var stageWrap = document.createElement("div");
            stageWrap.className = "crm-detail-row";
            var stageSpan = document.createElement("span");
            stageSpan.className = stageInfo.className;
            stageSpan.textContent = stageInfo.label;
            stageWrap.appendChild(stageSpan);
            els.detailMeta.appendChild(stageWrap);

            appendMetaRow(els.detailMeta, "E-mail:", contact.email);
            appendMetaRow(els.detailMeta, "Telefon:", contact.phone);
            appendMetaRow(els.detailMeta, "Ostatnia aktywność:", contact.lastActivity !== "—" ? contact.lastActivity : "");

            var tags = parseTags(contact.tags);
            if (tags.length) {
                var tagRow = document.createElement("div");
                tagRow.className = "crm-detail-tags";
                tags.forEach(function (tag) {
                    var chip = document.createElement("span");
                    chip.className = "crm-tag-chip";
                    chip.textContent = tag;
                    tagRow.appendChild(chip);
                });
                els.detailMeta.appendChild(tagRow);
            }
        }

        renderDetailLinks(contact);

        if (els.detailNotes) {
            els.detailNotes.textContent = contact.notes || "Brak notatek dla tego kontaktu.";
        }

        if (els.detailDialog && typeof els.detailDialog.showModal === "function") {
            els.detailDialog.showModal();
        }
    }

    function closeDetail() {
        detailContactId = null;
        if (els.detailDialog) els.detailDialog.close();
    }

    function editFromDetail() {
        if (!detailContactId) return;
        var id = detailContactId;
        closeDetail();
        openEdit(id);
    }

    function addFromMessage(msg) {
        if (!msg) return { ok: false, error: "Brak wiadomości." };

        var channelLabel = window.SCMessages ? window.SCMessages.getChannelLabel(msg.channel) : msg.channel;
        var noteBlock = "Wiadomość (" + channelLabel + ", " + (window.SCMessages ? window.SCMessages.formatTimeLabel(msg.createdAt) : "") + "):\n" + (msg.body || msg.preview || "");

        if (msg.fromEmail) {
            var existing = findByEmail(msg.fromEmail);
            if (existing) {
                var mergedNotes = existing.notes ? existing.notes + "\n\n---\n\n" + noteBlock : noteBlock;
                upsertContact(existing.id, {
                    name: existing.name,
                    email: existing.email,
                    phone: existing.phone,
                    stage: existing.stage,
                    tags: existing.tags,
                    funnelId: existing.funnelId,
                    lastActivity: defaultActivityLabel(),
                    notes: mergedNotes,
                    sourceMessageId: msg.id
                });
                return { ok: true, exists: true, contact: existing };
            }
        }

        var tags = msg.channel === "form" ? "formularz www" : "";
        var contact = upsertContact(null, {
            name: msg.fromName || "Nieznany nadawca",
            email: msg.fromEmail || "",
            phone: "",
            stage: "new",
            tags: tags,
            funnelId: "",
            lastActivity: defaultActivityLabel(),
            notes: noteBlock,
            sourceMessageId: msg.id
        });
        return { ok: true, exists: false, contact: contact };
    }

    function countPipelineLeads() {
        return (loadContacts() || []).filter(function (c) {
            return c.stage !== "won" && c.stage !== "lost";
        }).length;
    }

    function notifyChange() {
        window.dispatchEvent(new CustomEvent("sc-data-change", { detail: { module: "crm" } }));
    }

    ensureInitialData();
    renderTable();

    if (els.addBtn) els.addBtn.addEventListener("click", function () { openAdd(); });
    if (els.closeBtn) els.closeBtn.addEventListener("click", closeDialog);
    if (els.detailCloseBtn) els.detailCloseBtn.addEventListener("click", closeDetail);
    if (els.detailEditBtn) els.detailEditBtn.addEventListener("click", editFromDetail);
    if (els.searchInput) els.searchInput.addEventListener("input", renderTable);
    if (els.stageFilter) els.stageFilter.addEventListener("change", renderTable);

    if (els.form) {
        els.form.addEventListener("submit", function (e) {
            e.preventDefault();
            var name = els.inputName ? els.inputName.value : "";
            var email = els.inputEmail ? els.inputEmail.value : "";
            if (!name.trim() || !email.trim()) return;
            var editId = els.editId ? els.editId.value.trim() : "";
            upsertContact(editId || null, {
                name: name,
                email: email,
                phone: els.inputPhone ? els.inputPhone.value : "",
                stage: els.inputStage ? els.inputStage.value : "new",
                tags: els.inputTags ? els.inputTags.value : "",
                funnelId: els.inputFunnel ? els.inputFunnel.value : "",
                lastActivity: els.inputActivity ? els.inputActivity.value : "",
                notes: els.inputNotes ? els.inputNotes.value : ""
            });
            closeDialog();
        });
    }

    window.addEventListener("storage", function (e) {
        if (e.key !== storageKey()) return;
        renderTable();
    });

    window.addEventListener("sc-data-change", function () {
        renderTable();
    });

    window.SCCRM = {
        loadContacts: function () { ensureInitialData(); return loadContacts() || []; },
        getContactById: getContactById,
        findByEmail: findByEmail,
        addFromMessage: addFromMessage,
        openAddPrefill: openAdd,
        openDetail: openDetail,
        countPipelineLeads: countPipelineLeads,
        storageKey: storageKey,
        STAGES: STAGES
    };
})();
