// Routes the website's /api/* calls to a backend that isn't on the same server.
//  - Live mode (data-api="<Apps Script web app URL>"): each call is sent to Google Apps Script, which keeps the
//    data in Google Sheets and sends email from Gmail.
//  - Demo mode (no data-api): the backend runs in the browser with sample data (js/demo-backend.js).
(function () {
  var script = document.currentScript;
  var BASE = script.src.replace(/js\/demo-shim\.js.*$/, ""); // e.g. https://user.github.io/zicco-plumbers/
  var basePath = new URL(BASE).pathname.replace(/\/$/, "");
  var API = script.getAttribute("data-api") || "";
  window.__ZP_ENV = {
    SITE_URL: BASE.replace(/\/$/, ""),
    EMAIL_SKIP_REASON: "this is the demo version, so emails are not sent",
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
    if (API) return live(url, init || {});
    return load().then(function (m) { return m.handle(url, init || {}); });
  };

  // ---------- live mode: Google Apps Script ----------
  var TOKEN = "zp-admin-token";
  function token(v) {
    try { if (v === undefined) return localStorage.getItem(TOKEN) || ""; if (v) localStorage.setItem(TOKEN, v); else localStorage.removeItem(TOKEN); } catch (e) {}
    return "";
  }
  function readFile(f) {
    return new Promise(function (resolve) {
      var r = new FileReader();
      r.onload = function () { resolve({ name: f.name, type: f.type, base64: String(r.result).split(",")[1] || "" }); };
      r.onerror = function () { resolve(null); };
      r.readAsDataURL(f);
    });
  }
  function formPayload(fd) {
    var form = {}, files = {}, jobs = [];
    fd.forEach(function (v, k) {
      if (typeof v === "object" && v && "size" in v) { if (v.size) jobs.push(readFile(v).then(function (x) { if (x) files[k] = x; })); return; }
      if (/\[\]$/.test(k)) (form[k] = form[k] || []).push(v); else form[k] = v;
    });
    return Promise.all(jobs).then(function () { return { form: form, files: files }; });
  }
  function toResponse(out) {
    if (out.file) {
      var bin = atob(out.file.base64), bytes = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return new Response(new Blob([bytes], { type: out.file.type }), { status: 200, headers: {
        "content-type": out.file.type, "content-disposition": (out.file.inline ? "inline" : "attachment") + '; filename="' + out.file.name + '"' } });
    }
    return new Response(JSON.stringify(out.json || {}), { status: out.status || 200, headers: { "content-type": "application/json" } });
  }
  function live(url, init) {
    var u = new URL(url), query = {};
    u.searchParams.forEach(function (v, k) { query[k] = v; });
    var payload = { path: u.pathname, method: (init.method || "GET").toUpperCase(), query: query, token: token(), site: BASE.replace(/\/$/, "") };
    var body = init.body, prep = Promise.resolve();
    if (body instanceof FormData) prep = formPayload(body).then(function (p) { payload.form = p.form; payload.files = p.files; });
    else if (typeof body === "string" && body) { try { payload.json = JSON.parse(body); } catch (e) { payload.json = {}; } }
    return prep.then(function () {
      return realFetch(API, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(payload) });
    }).then(function (r) { return r.json(); }).then(function (out) {
      if (u.pathname === "/api/admin/login" && out.json && out.json.token) token(out.json.token);
      if (u.pathname === "/api/admin/logout") token(null);
      if (out.json && out.json.redirect) out.json.redirect = out.json.redirect.replace(/^.*?(\/thank-you\/)/, basePath + "$1");
      return toResponse(out);
    }, function () {
      return new Response(JSON.stringify({ error: "Couldn't reach the server. Please check your connection, or call or WhatsApp us." }), { status: 503, headers: { "content-type": "application/json" } });
    });
  }

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
    if (API) return;
    load().then(function (m) {
      m.resetDemo();
      try { localStorage.removeItem("zpdemo-seeded-v2"); localStorage.removeItem("zpdemo-session"); } catch (e) {}
      location.reload();
    });
  };
})();
