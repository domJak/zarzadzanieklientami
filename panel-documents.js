(function () {
    var tbody = document.getElementById("documentsTableBody");
    if (!tbody) return;

    var STORAGE_PREFIX = "salescontrol_documents_";
    var currentDocId = null;

    var SEED = [
        {
            name: "Umowa ND — ACME.pdf",
            status: "signed",
            contact: "ACME Sp. z o.o.",
            contactEmail: "kontakt@acme.pl",
            updatedAt: "2026-05-28",
            content:
                "UMOWA O ZACHOWANIU POUFNOŚCI\n\n" +
                "zawarta w dniu 15 maja 2026 r. pomiędzy:\n\n" +
                "SalesControl Sp. z o.o., ul. Przykładowa 12, 00-001 Warszawa\n" +
                "a\n" +
                "ACME Sp. z o.o., ul. Biznesowa 8, 02-222 Warszawa\n\n" +
                "§1. Strony zobowiązują się do zachowania w poufności informacji technicznych, handlowych i organizacyjnych uzyskanych w związku ze współpracą.\n\n" +
                "§2. Obowiązek poufności obowiązuje przez okres 3 lat od daty zakończenia współpracy.\n\n" +
                "§3. Umowa podpisana elektronicznie przez obie strony.\n\n" +
                "Podpis: ACME Sp. z o.o. — 28.05.2026\n" +
                "Podpis: SalesControl Sp. z o.o. — 28.05.2026"
        },
        {
            name: "Zgody marketingowe.pdf",
            status: "pending",
            contact: "Anna Kowalska",
            contactEmail: "anna@example.com",
            updatedAt: "2026-05-30",
            content:
                "ZGODA NA KOMUNIKACJĘ MARKETINGOWĄ\n\n" +
                "Imię i nazwisko: Anna Kowalska\n" +
                "Adres e-mail: anna.kowalska@example.com\n\n" +
                "Wyrażam zgodę na otrzymywanie informacji handlowych drogą elektroniczną oraz kontakt telefoniczny w sprawach ofert i szkoleń.\n\n" +
                "Zgoda może być wycofana w dowolnym momencie.\n\n" +
                "Status: oczekuje na podpis odbiorcy.\n" +
                "Link do podpisu wysłany: 30.05.2026"
        },
        {
            name: "Regulamin usługi.pdf",
            status: "sent",
            contact: "Marek Nowak",
            contactEmail: "m.nowak@firma.eu",
            updatedAt: "2026-05-29",
            content:
                "REGULAMIN ŚWIADCZENIA USŁUG DROGĄ ELEKTRONICZNĄ\n\n" +
                "§1. Usługodawca: SalesControl Sp. z o.o.\n" +
                "§2. Usługobiorca: Marek Nowak\n\n" +
                "§3. Zakres usługi obejmuje dostęp do platformy CRM, modułu kursów oraz kalendarza spotkań zgodnie z wybranym planem.\n\n" +
                "§4. Płatności realizowane są z góry za okres rozliczeniowy wskazany w zamówieniu.\n\n" +
                "§5. Reklamacje należy zgłaszać na adres kontakt@salescontrol.example.\n\n" +
                "Status: dokument wysłany do podpisu — 29.05.2026"
        }
    ];

    var STATUS_LABELS = {
        signed: { className: "tag tag-ok", text: "Podpisana" },
        pending: { className: "tag tag-wait", text: "Oczekuje" },
        sent: { className: "tag tag-wait", text: "Wysłany" }
    };

    function storageKey() {
        var em =
            window.SCAuth && window.SCAuth.getSessionEmail
                ? window.SCAuth.getSessionEmail()
                : "";
        return STORAGE_PREFIX + (em || "guest");
    }

    function newId() {
        return "d_" + Date.now() + "_" + Math.random().toString(36).slice(2, 9);
    }

    function loadDocuments() {
        try {
            var raw = localStorage.getItem(storageKey());
            if (!raw) return null;
            var arr = JSON.parse(raw);
            return Array.isArray(arr) ? arr : null;
        } catch (e) {
            return null;
        }
    }

    function saveDocuments(list) {
        localStorage.setItem(storageKey(), JSON.stringify(list));
    }

    function ensureInitialData() {
        if (loadDocuments() !== null) {
            migrateDocuments();
            return;
        }
        var initial = SEED.map(function (s) {
            return {
                id: newId(),
                name: s.name,
                status: s.status,
                contact: s.contact,
                contactEmail: s.contactEmail || "",
                updatedAt: s.updatedAt || "",
                content: s.content || ""
            };
        });
        saveDocuments(initial);
    }

    function migrateDocuments() {
        var list = loadDocuments();
        if (!list) return;
        var emailMap = {
            "ACME Sp. z o.o.": "kontakt@acme.pl",
            "Anna Kowalska": "anna@example.com",
            "Marek Nowak": "m.nowak@firma.eu"
        };
        var changed = false;
        list.forEach(function (d) {
            if (!d.contactEmail && d.contact && emailMap[d.contact]) {
                d.contactEmail = emailMap[d.contact];
                changed = true;
            }
            if (d.contactEmail === undefined) {
                d.contactEmail = "";
                changed = true;
            }
        });
        if (changed) saveDocuments(list);
    }

    function getDocumentById(id) {
        var list = loadDocuments() || [];
        return list.filter(function (d) {
            return d.id === id;
        })[0] || null;
    }

    function findByContact(contact) {
        if (!contact) return [];
        var email = String(contact.email || "").trim().toLowerCase();
        var name = String(contact.name || "").trim().toLowerCase();
        return (loadDocuments() || []).filter(function (d) {
            if (email && String(d.contactEmail || "").trim().toLowerCase() === email) return true;
            if (name && String(d.contact || "").trim().toLowerCase() === name) return true;
            return false;
        });
    }

    function findCrmContactForDoc(doc) {
        if (!window.SCCRM || !doc) return null;
        if (doc.contactEmail && window.SCCRM.findByEmail) {
            var byEmail = window.SCCRM.findByEmail(doc.contactEmail);
            if (byEmail) return byEmail;
        }
        return (window.SCCRM.loadContacts() || []).filter(function (c) {
            return String(c.name || "").trim().toLowerCase() === String(doc.contact || "").trim().toLowerCase();
        })[0] || null;
    }

    function countPendingSignature() {
        return (loadDocuments() || []).filter(function (d) {
            return d.status === "pending" || d.status === "sent";
        }).length;
    }

    function notifyChange() {
        window.dispatchEvent(new CustomEvent("sc-data-change", { detail: { module: "documents" } }));
    }

    var els = {
        dialog: document.getElementById("docViewerDialog"),
        title: document.getElementById("docViewerTitle"),
        meta: document.getElementById("docViewerMeta"),
        preview: document.getElementById("docViewerPreview"),
        statusBtn: document.getElementById("docViewerStatus"),
        downloadBtn: document.getElementById("docViewerDownload"),
        closeBtn: document.getElementById("docViewerClose"),
        statusDialog: document.getElementById("docStatusDialog"),
        statusForm: document.getElementById("docStatusForm"),
        statusEditId: document.getElementById("docStatusEditId"),
        statusInput: document.getElementById("docStatusInput"),
        statusDocName: document.getElementById("docStatusDocName"),
        statusCloseBtn: document.getElementById("docStatusDialogClose")
    };

    function statusCell(status) {
        var td = document.createElement("td");
        var info = STATUS_LABELS[status] || STATUS_LABELS.sent;
        var span = document.createElement("span");
        span.className = info.className;
        span.textContent = info.text;
        td.appendChild(span);
        return td;
    }

    function renderTable() {
        var list = loadDocuments() || [];
        tbody.innerHTML = "";

        if (!list.length) {
            var tr = document.createElement("tr");
            var td = document.createElement("td");
            td.colSpan = 4;
            td.className = "documents-empty-row muted";
            td.textContent = "Brak dokumentów do wyświetlenia.";
            tr.appendChild(td);
            tbody.appendChild(tr);
            return;
        }

        list.forEach(function (doc) {
            var tr = document.createElement("tr");

            var tdName = document.createElement("td");
            tdName.textContent = doc.name || "";
            tr.appendChild(tdName);

            tr.appendChild(statusCell(doc.status));

            var tdContact = document.createElement("td");
            tdContact.textContent = doc.contact || "—";
            tr.appendChild(tdContact);

            var tdAct = document.createElement("td");
            tdAct.className = "documents-actions";

            var viewBtn = document.createElement("button");
            viewBtn.type = "button";
            viewBtn.className = "btn btn-ghost btn-sm";
            viewBtn.textContent = "Przeglądaj";
            viewBtn.addEventListener("click", function (id) {
                return function () {
                    openViewer(id);
                };
            }(doc.id));

            var pdfBtn = document.createElement("button");
            pdfBtn.type = "button";
            pdfBtn.className = "btn btn-ghost btn-sm";
            pdfBtn.textContent = "PDF";
            pdfBtn.addEventListener("click", function (id) {
                return function () {
                    var item = getDocumentById(id);
                    if (item) downloadPdf(item);
                };
            }(doc.id));

            var statusBtn = document.createElement("button");
            statusBtn.type = "button";
            statusBtn.className = "btn btn-ghost btn-sm";
            statusBtn.textContent = "Status";
            statusBtn.addEventListener("click", function (id) {
                return function () {
                    openStatusDialog(id);
                };
            }(doc.id));

            tdAct.appendChild(viewBtn);
            tdAct.appendChild(statusBtn);
            tdAct.appendChild(pdfBtn);
            tr.appendChild(tdAct);

            tbody.appendChild(tr);
        });
    }

    function formatDate(iso) {
        if (!iso) return "";
        var parts = String(iso).split("-");
        if (parts.length !== 3) return iso;
        return parts[2] + "." + parts[1] + "." + parts[0];
    }

    function todayISO() {
        var d = new Date();
        var m = String(d.getMonth() + 1).padStart(2, "0");
        var day = String(d.getDate()).padStart(2, "0");
        return d.getFullYear() + "-" + m + "-" + day;
    }

    function normalizeStatus(status) {
        return STATUS_LABELS[status] ? status : "sent";
    }

    function updateDocumentStatus(id, status) {
        var list = loadDocuments() || [];
        var idx = -1;
        for (var i = 0; i < list.length; i++) {
            if (list[i].id === id) {
                idx = i;
                break;
            }
        }
        if (idx < 0) return null;

        list[idx].status = normalizeStatus(status);
        list[idx].updatedAt = todayISO();
        saveDocuments(list);
        notifyChange();
        renderTable();
        return list[idx];
    }

    function renderViewerMeta(doc) {
        if (!els.meta || !doc) return;

        els.meta.innerHTML = "";
        var statusInfo = STATUS_LABELS[doc.status] || STATUS_LABELS.sent;
        var statusSpan = document.createElement("span");
        statusSpan.className = statusInfo.className;
        statusSpan.textContent = statusInfo.text;
        els.meta.appendChild(statusSpan);

        if (doc.contact) {
            var contact = document.createElement("span");
            contact.className = "doc-viewer-meta-item";
            contact.textContent = "Kontakt: " + doc.contact;
            els.meta.appendChild(contact);
        }

        var crmContact = findCrmContactForDoc(doc);
        if (crmContact && window.SCCRM && window.SCCRM.openDetail) {
            var crmBtn = document.createElement("button");
            crmBtn.type = "button";
            crmBtn.className = "link-btn doc-crm-link";
            crmBtn.textContent = "Zobacz w CRM →";
            crmBtn.addEventListener("click", function (cid) {
                return function () {
                    closeViewer();
                    window.location.hash = "crm";
                    window.SCCRM.openDetail(cid);
                };
            }(crmContact.id));
            els.meta.appendChild(crmBtn);
        }

        if (doc.updatedAt) {
            var updated = document.createElement("span");
            updated.className = "doc-viewer-meta-item muted";
            updated.textContent = "Aktualizacja: " + formatDate(doc.updatedAt);
            els.meta.appendChild(updated);
        }
    }

    function openStatusDialog(id) {
        var doc = getDocumentById(id);
        if (!doc) return;

        if (els.statusEditId) els.statusEditId.value = doc.id;
        if (els.statusDocName) els.statusDocName.textContent = doc.name || "";
        if (els.statusInput) els.statusInput.value = normalizeStatus(doc.status);
        if (els.statusDialog && typeof els.statusDialog.showModal === "function") {
            els.statusDialog.showModal();
        }
    }

    function closeStatusDialog() {
        if (els.statusDialog) els.statusDialog.close();
    }

    function sanitizeFilename(name) {
        var base = String(name || "dokument").replace(/[<>:"/\\|?*]/g, "-").trim();
        if (!base) base = "dokument";
        if (!/\.pdf$/i.test(base)) base += ".pdf";
        return base;
    }

    function downloadPdf(doc) {
        if (!window.pdfMake) {
            window.alert("Nie udało się załadować generatora PDF. Odśwież stronę i spróbuj ponownie.");
            return;
        }

        var statusInfo = STATUS_LABELS[doc.status] || STATUS_LABELS.sent;
        var content = [
            { text: doc.name || "Dokument", style: "title", margin: [0, 0, 0, 14] },
            { text: "Status: " + statusInfo.text, margin: [0, 0, 0, 6] }
        ];

        if (doc.contact) {
            content.push({ text: "Kontakt: " + doc.contact, margin: [0, 0, 0, 6], color: "#333333" });
        }
        if (doc.updatedAt) {
            content.push({
                text: "Aktualizacja: " + formatDate(doc.updatedAt),
                margin: [0, 0, 0, 6],
                color: "#555555"
            });
        }

        content.push({ text: " ", margin: [0, 0, 0, 10] });
        content.push({
            text: doc.content || "Brak treści dokumentu.",
            preserveLeadingSpaces: true
        });

        var docDefinition = {
            content: content,
            defaultStyle: {
                font: "Roboto",
                fontSize: 11,
                lineHeight: 1.35
            },
            styles: {
                title: { fontSize: 16, bold: true }
            },
            pageMargins: [48, 48, 48, 48]
        };

        window.pdfMake.createPdf(docDefinition).download(sanitizeFilename(doc.name));
    }

    function openViewer(id) {
        var doc = getDocumentById(id);
        if (!doc) return;

        currentDocId = doc.id;

        if (els.title) els.title.textContent = doc.name || "Podgląd dokumentu";
        renderViewerMeta(doc);

        if (els.preview) {
            els.preview.textContent = doc.content || "Brak treści podglądu dla tego dokumentu.";
        }

        if (els.dialog && typeof els.dialog.showModal === "function") {
            els.dialog.showModal();
        }
        if (els.preview) els.preview.focus();
    }

    function closeViewer() {
        currentDocId = null;
        if (els.dialog) els.dialog.close();
    }

    function downloadCurrentDoc() {
        if (!currentDocId) return;
        var doc = getDocumentById(currentDocId);
        if (doc) downloadPdf(doc);
    }

    ensureInitialData();
    renderTable();

    if (els.downloadBtn) {
        els.downloadBtn.addEventListener("click", downloadCurrentDoc);
    }
    if (els.statusBtn) {
        els.statusBtn.addEventListener("click", function () {
            if (currentDocId) openStatusDialog(currentDocId);
        });
    }
    if (els.closeBtn) {
        els.closeBtn.addEventListener("click", closeViewer);
    }
    if (els.statusCloseBtn) {
        els.statusCloseBtn.addEventListener("click", closeStatusDialog);
    }
    if (els.statusForm) {
        els.statusForm.addEventListener("submit", function (e) {
            e.preventDefault();
            var id = els.statusEditId ? els.statusEditId.value.trim() : "";
            var status = els.statusInput ? els.statusInput.value : "sent";
            if (!id) return;
            var updated = updateDocumentStatus(id, status);
            closeStatusDialog();
            if (updated && currentDocId === id) {
                renderViewerMeta(updated);
            }
        });
    }

    window.addEventListener("storage", function (e) {
        if (e.key !== storageKey()) return;
        renderTable();
    });

    window.addEventListener("sc-data-change", function () {
        renderTable();
    });

    window.SCDocuments = {
        loadDocuments: function () { ensureInitialData(); return loadDocuments() || []; },
        findByContact: findByContact,
        openViewer: openViewer,
        countPendingSignature: countPendingSignature,
        storageKey: storageKey
    };
})();
