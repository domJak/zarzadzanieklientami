(function () {
    var tbody = document.getElementById("funnelsTableBody");
    if (!tbody) return;

    var STORAGE_PREFIX = "salescontrol_funnels_";

    var SEED = [
        { name: "Webinar Q2", status: "live", conversion: "3,2%" },
        { name: "Lead magnet — checklista", status: "live", conversion: "5,8%" },
        { name: "Oferta produktowa", status: "draft", conversion: "—" }
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
                conversion: s.conversion
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
        inputName: document.getElementById("funnelInputName"),
        inputStatus: document.getElementById("funnelInputStatus"),
        inputConversion: document.getElementById("funnelInputConversion")
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

    function renderTable() {
        var list = loadFunnels() || [];
        tbody.innerHTML = "";

        if (!list.length) {
            var tr = document.createElement("tr");
            var td = document.createElement("td");
            td.colSpan = 4;
            td.className = "funnels-empty-row muted";
            td.textContent = "Brak lejków — kliknij „Nowy lejek”, aby dodać pierwszy.";
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
            var del = document.createElement("button");
            del.type = "button";
            del.className = "btn btn-ghost btn-sm";
            del.textContent = "Usuń";
            del.addEventListener("click", function (id) {
                return function () {
                    removeFunnel(id);
                };
            }(f.id));
            tdAct.appendChild(del);
            tr.appendChild(tdAct);

            tbody.appendChild(tr);
        });
    }

    function removeFunnel(id) {
        var list = loadFunnels() || [];
        list = list.filter(function (f) {
            return f.id !== id;
        });
        saveFunnels(list);
        renderTable();
    }

    function openDialog() {
        if (els.inputName) {
            els.inputName.value = "";
            els.inputName.focus();
        }
        if (els.inputStatus) els.inputStatus.value = "live";
        if (els.inputConversion) els.inputConversion.value = "";
        if (els.dialog && typeof els.dialog.showModal === "function") {
            els.dialog.showModal();
        }
    }

    function closeDialog() {
        if (els.dialog) els.dialog.close();
    }

    function addFunnel(name, status, conversion) {
        var list = loadFunnels() || [];
        var conv = normalizeConversion(conversion);
        list.push({
            id: newId(),
            name: name.trim(),
            status: status === "draft" ? "draft" : "live",
            conversion: conv
        });
        saveFunnels(list);
        renderTable();
    }

    ensureInitialData();
    renderTable();

    if (els.addBtn) {
        els.addBtn.addEventListener("click", openDialog);
    }
    if (els.closeBtn) {
        els.closeBtn.addEventListener("click", closeDialog);
    }
    if (els.form) {
        els.form.addEventListener("submit", function (e) {
            e.preventDefault();
            var name = els.inputName ? els.inputName.value : "";
            var status = els.inputStatus ? els.inputStatus.value : "live";
            var conversion = els.inputConversion ? els.inputConversion.value : "";
            if (!name || !name.trim()) return;
            addFunnel(name, status, conversion);
            closeDialog();
        });
    }

    window.addEventListener("storage", function (e) {
        if (e.key !== storageKey()) return;
        renderTable();
    });
})();
