// GitHub Pages demo: sends /api/* calls to the backend running in the browser (js/demo-backend.js)
// instead of the network, so the form, tracking page and dashboard work without a server.
(function () {
  var script = document.currentScript;
  var BASE = script.src.replace(/js\/demo-shim\.js.*$/, ""); // e.g. https://user.github.io/zicco-plumbers/
  var basePath = new URL(BASE).pathname.replace(/\/$/, "");
  window.__ZP_ENV = {
    SITE_URL: BASE.replace(/\/$/, ""),
    EMAIL_SKIP_REASON: "this is the GitHub Pages demo, so emails are not sent (they are on the live Netlify version)",
  };
  var apiRe = new RegExp("^(" + basePath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")?/api/");
  var backend = null;
  var V = script.getAttribute("data-v") || "";
  function load() { return (backend = backend || import(BASE + "js/demo-backend.js" + (V ? "?v=" + V : ""))); }

  function apiUrl(input) {
    var u = new URL(typeof input === "string" ? input : input.url, location.href);
    if (u.origin !== location.origin || !apiRe.test(u.pathname)) return null;
    return location.origin + u.pathname.replace(apiRe, "/api/") + u.search;
  }

  var realFetch = window.fetch.bind(window);
  window.fetch = function (input, init) {
    var url = apiUrl(input);
    if (!url) return realFetch(input, init);
    return load().then(function (m) { return m.handle(url, init || {}); });
  };

  // Links to API files (PDFs, CSV exports, calendar files) open from the in-browser backend.
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a[href]");
    if (!a) return;
    var url = apiUrl(a.getAttribute("href"));
    if (!url) return;
    e.preventDefault();
    var win = a.target === "_blank" ? window.open("", "_blank") : null;
    window.fetch(url).then(function (res) {
      var cd = res.headers.get("content-disposition") || "";
      var name = (cd.match(/filename="?([^";]+)/) || [])[1] || "download";
      return res.blob().then(function (blob) {
        var href = URL.createObjectURL(blob);
        if (win) { win.location = href; return; }
        var dl = document.createElement("a");
        dl.href = href; dl.download = name;
        document.body.appendChild(dl); dl.click(); dl.remove();
      });
    });
  }, true);

  // Images served by the API (customer photos in the dashboard).
  function fixImages(root) {
    (root.querySelectorAll ? root.querySelectorAll("img[src]") : []).forEach(function (img) {
      var url = apiUrl(img.getAttribute("src"));
      if (!url || img.dataset.demo) return;
      img.dataset.demo = "1";
      img.removeAttribute("src");
      window.fetch(url).then(function (r) { return r.blob(); }).then(function (b) { img.src = URL.createObjectURL(b); });
    });
  }
  new MutationObserver(function (list) { list.forEach(function (m) { m.addedNodes.forEach(function (n) { if (n.nodeType === 1) fixImages(n.parentNode || n); }); }); })
    .observe(document.documentElement, { childList: true, subtree: true });

  window.zpResetDemo = function () {
    load().then(function (m) {
      m.resetDemo();
      try { localStorage.removeItem("zpdemo-seeded-v1"); localStorage.removeItem("zpdemo-session"); } catch (e) {}
      location.reload();
    });
  };
})();
