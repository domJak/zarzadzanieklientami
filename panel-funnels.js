(function () {
    var tbody = document.getElementById("funnelsTableBody");
    if (!tbody) return;

    var STORAGE_PREFIX = "salescontrol_funnels_";

    var SEED = [
        {
            name: "Webinar Q2",
            status: "live",
            conversion: "3,2%",
            description: "Bezpłatny webinar o skalowaniu sprzedaży online — zapisz się na konsultację po wydarzeniu."
        },
        {
            name: "Lead magnet — checklista",
            status: "live",
            conversion: "5,8%",
            description: "Pobierz checklistę i umów krótkie spotkanie, aby omówić wdrożenie u Ciebie."
        },
        {
            name: "Oferta produktowa",
            status: "draft",
            conversion: "—",
            description: "Kompleksowa oferta produktowa dla firm B2B — strona w przygotowaniu."
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
        return "f_" + Date.now() + "_" + Math.random().toString(36).slice(2, 9);
    }

    function loadFunnels() {
        try {
            var raw = localStorage.getItem(storageKey());
            if (!raw) return null;
            var arr = JSON.parse(raw);
            return Array.isArray(arr) ? arr : null;
        } catch (e) {
            return null;
        }
    }

    function saveFunnels(list) {
        localStorage.setItem(storageKey(), JSON.stringify(list));
    }

    function ensureInitialData() {
        if (loadFunnels() !== null) return;
        var initial = SEED.map(function (s) {
            return {
                id: newId(),
                name: s.name,
                status: s.status,
                conversion: s.conversion,
                description: s.description || ""
            };
        });
        saveFunnels(initial);
    }

    function normalizeConversion(raw) {
        var t = String(raw || "").trim();
        return t || "—";
    }

    var els = {
        addBtn: document.getElementById("addFunnelBtn"),
        dialog: document.getElementById("funnelDialog"),
        form: document.getElementById("funnelAddForm"),
        closeBtn: document.getElementById("funnelDialogClose"),
        titleEl: document.getElementById("funnelDialogTitle"),
        submitBtn: document.getElementById("funnelSubmitBtn"),
        editId: document.getElementById("funnelEditId"),
        inputName: document.getElementById("funnelInputName"),
        inputStatus: document.getElementById("funnelInputStatus"),
        inputConversion: document.getElementById("funnelInputConversion"),
        inputDescription: document.getElementById("funnelInputDescription"),
        searchInput: document.getElementById("funnelSearch"),
        statusFilter: document.getElementById("funnelStatusFilter")
    };

    function statusCell(status) {
        var td = document.createElement("td");
        var span = document.createElement("span");
        if (status === "draft") {
            span.className = "tag tag-draft";
            span.textContent = "Szkic";
        } else {
            span.className = "tag tag-live";
            span.textContent = "Aktywny";
        }
        td.appendChild(span);
        return td;
    }

    function getFilteredFunnels() {
        var list = loadFunnels() || [];
        var q = els.searchInput ? String(els.searchInput.value || "").trim().toLowerCase() : "";
        var status = els.statusFilter ? els.statusFilter.value : "";
        return list.filter(function (f) {
            if (status && f.status !== status) return false;
            if (!q) return true;
            return String(f.name || "").toLowerCase().indexOf(q) !== -1;
        });
    }

    function renderTable() {
        var list = getFilteredFunnels();
        tbody.innerHTML = "";

        if (!list.length) {
            var tr = document.createElement("tr");
            var td = document.createElement("td");
            td.colSpan = 4;
            td.className = "funnels-empty-row muted";
            td.textContent = loadFunnels() && loadFunnels().length
                ? "Brak wyników dla wybranych filtrów."
                : "Brak lejków — kliknij „Nowy lejek”, aby dodać pierwszy.";
            tr.appendChild(td);
            tbody.appendChild(tr);
            return;
        }

        list.forEach(function (f) {
            var tr = document.createElement("tr");

            var tdName = document.createElement("td");
            tdName.textContent = f.name || "";
            tr.appendChild(tdName);

            tr.appendChild(statusCell(f.status));

            var tdConv = document.createElement("td");
            tdConv.textContent = f.conversion != null && f.conversion !== "" ? f.conversion : "—";
            tr.appendChild(tdConv);

            var tdAct = document.createElement("td");
            tdAct.className = "funnels-actions";

            var editBtn = document.createElement("button");
            editBtn.type = "button";
            editBtn.className = "btn btn-ghost btn-sm";
            editBtn.textContent = "Edytuj";
            editBtn.addEventListener("click", function (id) {
                return function () {
                    openEdit(id);
                };
            }(f.id));

            var salesBtn = document.createElement("a");
            salesBtn.className = "btn btn-ghost btn-sm";
            salesBtn.textContent = "Strona oferty";
            salesBtn.href = buildSalespageUrl(f.id);
            salesBtn.target = "_blank";
            salesBtn.rel = "noopener noreferrer";

            var del = document.createElement("button");
            del.type = "button";
            del.className = "btn btn-ghost btn-sm";
            del.textContent = "Usuń";
            del.addEventListener("click", function (id) {
                return function () {
                    removeFunnel(id);
                };
            }(f.id));

            tdAct.appendChild(salesBtn);
            tdAct.appendChild(editBtn);
            tdAct.appendChild(del);
            tr.appendChild(tdAct);

            tbody.appendChild(tr);
        });
    }

    function buildSalespageUrl(funnelId) {
        var url = "salespage.html?id=" + encodeURIComponent(funnelId);
        var em =
            window.SCAuth && window.SCAuth.getSessionEmail
                ? window.SCAuth.getSessionEmail()
                : "";
        if (em) url += "&owner=" + encodeURIComponent(em);
        return url;
    }

    function removeFunnel(id) {
        var list = loadFunnels() || [];
        list = list.filter(function (f) {
            return f.id !== id;
        });
        saveFunnels(list);
        renderTable();
        notifyChange();
    }

    function notifyChange() {
        window.dispatchEvent(new CustomEvent("sc-data-change", { detail: { module: "funnels" } }));
    }

    function openAdd() {
        if (els.editId) els.editId.value = "";
        if (els.titleEl) els.titleEl.textContent = "Nowy lejek";
        if (els.submitBtn) els.submitBtn.textContent = "Dodaj lejek";
        if (els.inputName) {
            els.inputName.value = "";
            els.inputName.focus();
        }
        if (els.inputStatus) els.inputStatus.value = "live";
        if (els.inputConversion) els.inputConversion.value = "";
        if (els.inputDescription) els.inputDescription.value = "";
        if (els.dialog && typeof els.dialog.showModal === "function") {
            els.dialog.showModal();
        }
    }

    function openEdit(id) {
        var list = loadFunnels() || [];
        var funnel = list.filter(function (f) {
            return f.id === id;
        })[0];
        if (!funnel) return;

        if (els.editId) els.editId.value = funnel.id;
        if (els.titleEl) els.titleEl.textContent = "Edytuj lejek";
        if (els.submitBtn) els.submitBtn.textContent = "Zapisz zmiany";
        if (els.inputName) els.inputName.value = funnel.name || "";
        if (els.inputStatus) els.inputStatus.value = funnel.status === "draft" ? "draft" : "live";
        if (els.inputConversion) {
            var conv = funnel.conversion != null && funnel.conversion !== "" && funnel.conversion !== "—"
                ? funnel.conversion
                : "";
            els.inputConversion.value = conv;
        }
        if (els.inputDescription) els.inputDescription.value = funnel.description || "";
        if (els.dialog && typeof els.dialog.showModal === "function") {
            els.dialog.showModal();
        }
        if (els.inputName) els.inputName.focus();
    }

    function closeDialog() {
        if (els.dialog) els.dialog.close();
    }

    function upsertFunnel(id, name, status, conversion, description) {
        var list = loadFunnels() || [];
        var conv = normalizeConversion(conversion);
        var rec = {
            id: id || newId(),
            name: name.trim(),
            status: status === "draft" ? "draft" : "live",
            conversion: conv,
            description: String(description || "").trim()
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
        saveFunnels(list);
        renderTable();
        notifyChange();
    }

    ensureInitialData();
    renderTable();

    if (els.addBtn) {
        els.addBtn.addEventListener("click", openAdd);
    }
    if (els.searchInput) els.searchInput.addEventListener("input", renderTable);
    if (els.statusFilter) els.statusFilter.addEventListener("change", renderTable);
    if (els.closeBtn) {
        els.closeBtn.addEventListener("click", closeDialog);
    }
    if (els.form) {
        els.form.addEventListener("submit", function (e) {
            e.preventDefault();
            var name = els.inputName ? els.inputName.value : "";
            var status = els.inputStatus ? els.inputStatus.value : "live";
            var conversion = els.inputConversion ? els.inputConversion.value : "";
            var description = els.inputDescription ? els.inputDescription.value : "";
            if (!name || !name.trim()) return;
            var editId = els.editId ? els.editId.value.trim() : "";
            upsertFunnel(editId || null, name, status, conversion, description);
            closeDialog();
        });
    }

    window.addEventListener("storage", function (e) {
        if (e.key !== storageKey()) return;
        renderTable();
    });

    function getFunnelById(id) {
        return (loadFunnels() || []).filter(function (f) {
            return f.id === id;
        })[0] || null;
    }

    function findByName(name) {
        var norm = String(name || "").trim().toLowerCase();
        if (!norm) return null;
        return (loadFunnels() || []).filter(function (f) {
            return String(f.name || "").trim().toLowerCase() === norm;
        })[0] || null;
    }

    window.SCFunnels = {
        loadFunnels: function () { ensureInitialData(); return loadFunnels() || []; },
        ensureInitialData: ensureInitialData,
        getFunnelById: getFunnelById,
        findByName: findByName,
        storageKey: storageKey,
        buildSalespageUrl: buildSalespageUrl
    };
})();
