(function () {
    var container = document.getElementById("courseCards");
    if (!container) return;

    var STORAGE_PREFIX = "salescontrol_courses_";

    var SEED = [
        { title: "Onboarding klienta B2B", lessons: 12, extraLine: "86% ukończeń", status: "published" },
        { title: "Produkt — szkolenie sprzedażowe", lessons: 8, extraLine: "", status: "draft" }
    ];

    function storageKey() {
        var em =
            window.SCAuth && window.SCAuth.getSessionEmail
                ? window.SCAuth.getSessionEmail()
                : "";
        return STORAGE_PREFIX + (em || "guest");
    }

    function newId() {
        return "c_" + Date.now() + "_" + Math.random().toString(36).slice(2, 9);
    }

    function loadCourses() {
        try {
            var raw = localStorage.getItem(storageKey());
            if (!raw) return null;
            var arr = JSON.parse(raw);
            return Array.isArray(arr) ? arr : null;
        } catch (e) {
            return null;
        }
    }

    function saveCourses(list) {
        localStorage.setItem(storageKey(), JSON.stringify(list));
    }

    function ensureInitialData() {
        if (loadCourses() !== null) return;
        var initial = SEED.map(function (s) {
            return {
                id: newId(),
                title: s.title,
                lessons: s.lessons,
                extraLine: s.extraLine || "",
                status: s.status === "draft" ? "draft" : "published"
            };
        });
        saveCourses(initial);
    }

    var els = {
        addBtn: document.getElementById("addCourseBtn"),
        dialog: document.getElementById("courseDialog"),
        form: document.getElementById("courseForm"),
        closeBtn: document.getElementById("courseDialogClose"),
        titleEl: document.getElementById("courseDialogTitle"),
        submitBtn: document.getElementById("courseSubmitBtn"),
        editId: document.getElementById("courseEditId"),
        inputTitle: document.getElementById("courseInputTitle"),
        inputLessons: document.getElementById("courseInputLessons"),
        inputExtra: document.getElementById("courseInputExtra"),
        inputStatus: document.getElementById("courseInputStatus")
    };

    function lessonsLabel(n) {
        var x = Number(n);
        if (!isFinite(x) || x < 0) x = 0;
        x = Math.floor(x);
        if (x === 1) return "1 lekcja";
        var mod10 = x % 10;
        var mod100 = x % 100;
        if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
            return x + " lekcje";
        }
        return x + " lekcji";
    }

    function renderCards() {
        var list = loadCourses() || [];
        container.innerHTML = "";

        if (!list.length) {
            var p = document.createElement("p");
            p.className = "courses-empty";
            p.textContent = "Brak kursów — dodaj pierwszy przyciskiem „Nowy kurs”.";
            container.appendChild(p);
            return;
        }

        list.forEach(function (course) {
            var article = document.createElement("article");
            article.className = "course-card";

            var h3 = document.createElement("h3");
            h3.textContent = course.title || "";
            article.appendChild(h3);

            var meta = document.createElement("p");
            meta.className = "muted";
            var bits = [lessonsLabel(course.lessons)];
            var extra = String(course.extraLine || "").trim();
            if (extra) bits.push(extra);
            meta.textContent = bits.join(" · ");
            article.appendChild(meta);

            var tag = document.createElement("span");
            if (course.status === "draft") {
                tag.className = "tag tag-draft";
                tag.textContent = "Szkic";
            } else {
                tag.className = "tag tag-live";
                tag.textContent = "Opublikowany";
            }
            article.appendChild(tag);

            var actions = document.createElement("div");
            actions.className = "course-card-actions";

            var editBtn = document.createElement("button");
            editBtn.type = "button";
            editBtn.className = "btn btn-ghost btn-sm";
            editBtn.textContent = "Edytuj";
            editBtn.addEventListener("click", function (id) {
                return function () {
                    openEdit(id);
                };
            }(course.id));

            var delBtn = document.createElement("button");
            delBtn.type = "button";
            delBtn.className = "btn btn-ghost btn-sm";
            delBtn.textContent = "Usuń";
            delBtn.addEventListener("click", function (id) {
                return function () {
                    removeCourse(id);
                };
            }(course.id));

            actions.appendChild(editBtn);
            actions.appendChild(delBtn);
            article.appendChild(actions);

            container.appendChild(article);
        });
    }

    function openAdd() {
        if (els.editId) els.editId.value = "";
        if (els.titleEl) els.titleEl.textContent = "Nowy kurs";
        if (els.submitBtn) els.submitBtn.textContent = "Dodaj kurs";
        if (els.inputTitle) {
            els.inputTitle.value = "";
            els.inputTitle.focus();
        }
        if (els.inputLessons) els.inputLessons.value = "0";
        if (els.inputExtra) els.inputExtra.value = "";
        if (els.inputStatus) els.inputStatus.value = "published";
        if (els.dialog && typeof els.dialog.showModal === "function") {
            els.dialog.showModal();
        }
    }

    function openEdit(id) {
        var list = loadCourses() || [];
        var course = list.filter(function (c) {
            return c.id === id;
        })[0];
        if (!course) return;

        if (els.editId) els.editId.value = course.id;
        if (els.titleEl) els.titleEl.textContent = "Edytuj kurs";
        if (els.submitBtn) els.submitBtn.textContent = "Zapisz zmiany";
        if (els.inputTitle) els.inputTitle.value = course.title || "";
        if (els.inputLessons) els.inputLessons.value = String(course.lessons != null ? course.lessons : 0);
        if (els.inputExtra) els.inputExtra.value = course.extraLine || "";
        if (els.inputStatus) els.inputStatus.value = course.status === "draft" ? "draft" : "published";
        if (els.dialog && typeof els.dialog.showModal === "function") {
            els.dialog.showModal();
        }
        if (els.inputTitle) els.inputTitle.focus();
    }

    function closeDialog() {
        if (els.dialog) els.dialog.close();
    }

    function removeCourse(id) {
        var list = loadCourses() || [];
        list = list.filter(function (c) {
            return c.id !== id;
        });
        saveCourses(list);
        renderCards();
    }

    function upsertCourse(id, title, lessons, extraLine, status) {
        var list = loadCourses() || [];
        var L = parseInt(lessons, 10);
        if (!isFinite(L) || L < 0) L = 0;
        if (L > 9999) L = 9999;
        var rec = {
            id: id || newId(),
            title: title.trim(),
            lessons: L,
            extraLine: String(extraLine || "").trim(),
            status: status === "draft" ? "draft" : "published"
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
        saveCourses(list);
        renderCards();
    }

    ensureInitialData();
    renderCards();

    if (els.addBtn) {
        els.addBtn.addEventListener("click", openAdd);
    }
    if (els.closeBtn) {
        els.closeBtn.addEventListener("click", closeDialog);
    }
    if (els.form) {
        els.form.addEventListener("submit", function (e) {
            e.preventDefault();
            var title = els.inputTitle ? els.inputTitle.value : "";
            if (!title || !title.trim()) return;
            var lessons = els.inputLessons ? els.inputLessons.value : "0";
            var extra = els.inputExtra ? els.inputExtra.value : "";
            var status = els.inputStatus ? els.inputStatus.value : "published";
            var editId = els.editId ? els.editId.value.trim() : "";
            upsertCourse(editId || null, title, lessons, extra, status);
            closeDialog();
        });
    }

    window.addEventListener("storage", function (e) {
        if (e.key !== storageKey()) return;
        renderCards();
    });
})();
