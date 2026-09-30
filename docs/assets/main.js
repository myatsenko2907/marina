(function () {
  "use strict";

  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };

  /* Mobile menu */
  var burger = document.querySelector(".burger");
  if (burger) {
    burger.addEventListener("click", function () {
      var open = document.body.classList.toggle("menu-open");
      burger.setAttribute("aria-expanded", open ? "true" : "false");
    });
    document.querySelectorAll(".mnav a").forEach(function (a) {
      a.addEventListener("click", function () { document.body.classList.remove("menu-open"); });
    });
  }

  /* EN / KM switch: interface strings carry data-km with the Khmer text */
  function applyLang(lang) {
    document.documentElement.lang = lang === "km" ? "km" : "en";
    document.querySelectorAll("[data-km]").forEach(function (el) {
      if (!el.hasAttribute("data-en")) el.setAttribute("data-en", el.textContent);
      el.textContent = lang === "km" ? el.getAttribute("data-km") : el.getAttribute("data-en");
    });
    document.querySelectorAll(".lang button").forEach(function (b) {
      b.setAttribute("aria-pressed", b.dataset.lang === lang ? "true" : "false");
    });
  }
  document.querySelectorAll(".lang button").forEach(function (b) {
    b.addEventListener("click", function () { store.set("lang", b.dataset.lang); applyLang(b.dataset.lang); });
  });
  applyLang(store.get("lang") || "en");

  /* Tabs */
  document.querySelectorAll("[role=tablist]").forEach(function (list) {
    var tabs = list.querySelectorAll("[role=tab]");
    function select(tab) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute("aria-selected", on ? "true" : "false");
        t.tabIndex = on ? 0 : -1;
        document.getElementById(t.getAttribute("aria-controls")).hidden = !on;
      });
    }
    tabs.forEach(function (t, i) {
      t.addEventListener("click", function () { select(t); });
      t.addEventListener("keydown", function (e) {
        var d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
        if (!d) return;
        var next = tabs[(i + d + tabs.length) % tabs.length];
        next.focus(); select(next);
      });
    });
    var hash = location.hash.slice(1);
    var fromHash = hash && list.querySelector('[aria-controls="' + hash + '"]');
    if (fromHash) select(fromHash);
  });

  /* Short course filters */
  var filters = document.querySelector("[data-filters]");
  if (filters) {
    var cards = document.querySelectorAll("[data-course]");
    var empty = document.querySelector(".empty");
    var run = function () {
      var f = {};
      filters.querySelectorAll("select").forEach(function (s) { f[s.name] = s.value; });
      var openOnly = filters.querySelector("[name=open]").checked;
      var shown = 0;
      cards.forEach(function (c) {
        var ok = Object.keys(f).every(function (k) { return !f[k] || (c.dataset[k] || "").split(" ").indexOf(f[k]) > -1; });
        if (openOnly && c.dataset.open !== "yes") ok = false;
        c.hidden = !ok;
        if (ok) shown++;
      });
      empty.style.display = shown ? "none" : "block";
    };
    filters.addEventListener("change", run);
    run();
  }

  /* Enquiry form (front-end only; connect to CRM / form service via data-endpoint) */
  document.querySelectorAll("form[data-enquiry]").forEach(function (form) {
    var params = new URLSearchParams(location.search);
    var p = params.get("path");
    if (p) {
      var r = form.querySelector('input[name=interest][value="' + p + '"]');
      if (r) r.checked = true;
    }
    var m = params.get("major");
    if (m && form.major) form.major.value = m;

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!form.reportValidity()) return;
      var data = Object.fromEntries(new FormData(form).entries());
      var done = function () {
        form.hidden = true;
        form.parentNode.querySelector(".form-success").classList.add("is-visible");
      };
      var endpoint = form.dataset.endpoint;
      if (endpoint) {
        fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) })
          .then(done, done);
      } else {
        done();
      }
    });
  });
})();
