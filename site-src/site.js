// Zicco Plumbers: small enhancements. The quote form also works without this file.
(function () {
  // Send call / WhatsApp / quote clicks to Google Analytics 4, if it is installed.
  function track(name, params) {
    if (typeof window.gtag === "function") window.gtag("event", name, params || {});
  }
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a");
    if (!a) return;
    var href = a.getAttribute("href") || "";
    if (href.indexOf("tel:") === 0) track("phone_call_click", { link_url: href, page_path: location.pathname });
    else if (href.indexOf("wa.me") !== -1) track("whatsapp_click", { link_url: href, page_path: location.pathname });
    else if (href.indexOf("/quote/") === 0) track("quote_button_click", { page_path: location.pathname });
  });

  // Thank-you page: show the ticket number and tracking link.
  if (location.pathname === "/thank-you/") {
    var q = new URLSearchParams(location.search);
    if (q.get("id")) {
      track("generate_lead", { method: "quote_form" });
      var box = document.querySelector(".ticket-ref");
      if (box) {
        box.hidden = false;
        box.querySelector(".ticket-no").textContent = q.get("id");
        box.querySelector(".track-link").href = "/track/?id=" + encodeURIComponent(q.get("id")) + "&k=" + encodeURIComponent(q.get("k") || "");
      }
    }
  }

  // Shrink big phone photos before upload so they send quickly.
  function shrink(file) {
    return new Promise(function (resolve) {
      if (!file || !/^image\/(jpeg|png|webp)$/.test(file.type) || file.size < 1200000) return resolve(file);
      var img = new Image();
      img.onload = function () {
        var scale = Math.min(1, 1800 / Math.max(img.width, img.height));
        var c = document.createElement("canvas");
        c.width = Math.round(img.width * scale);
        c.height = Math.round(img.height * scale);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        c.toBlob(function (b) { resolve(b ? new File([b], "photo.jpg", { type: "image/jpeg" }) : file); }, "image/jpeg", 0.82);
        URL.revokeObjectURL(img.src);
      };
      img.onerror = function () { resolve(file); };
      img.src = URL.createObjectURL(file);
    });
  }

  document.querySelectorAll("form.quote-form").forEach(function (form) {
    var page = form.querySelector('input[name="page"]');
    if (page) page.value = location.pathname;
    var status = form.querySelector(".form-status");
    var btn = form.querySelector('button[type="submit"]');
    function say(msg, bad) {
      if (!status) return;
      status.hidden = !msg;
      status.textContent = msg || "";
      status.style.color = bad ? "#b42318" : "";
    }
    form.addEventListener("submit", function (e) {
      var err = form.querySelector(".service-error");
      if (!form.querySelectorAll('input[name="services[]"]:checked').length) {
        e.preventDefault();
        if (err) { err.hidden = false; err.scrollIntoView({ block: "center", behavior: "smooth" }); }
        return;
      }
      if (err) err.hidden = true;
      if (!window.fetch || !window.FormData) return; // fall back to a normal form post
      e.preventDefault();
      btn.disabled = true;
      btn.textContent = "Sending…";
      say("");
      var data = new FormData(form);
      var photo = data.get("photo");
      shrink(photo && photo.size ? photo : null).then(function (file) {
        if (file) data.set("photo", file, file.name || "photo.jpg"); else data.delete("photo");
        return fetch(form.action, { method: "POST", body: data, headers: { accept: "application/json" } });
      }).then(function (res) {
        return res.json().then(function (body) { return { ok: res.ok, body: body }; });
      }).then(function (r) {
        if (!r.ok) throw new Error(r.body.error || "Something went wrong.");
        location.href = r.body.redirect;
      }).catch(function (ex) {
        btn.disabled = false;
        btn.textContent = "Submit";
        say((ex && ex.message) || "Could not send. Please try again or WhatsApp us.", true);
      });
    });
  });

  // Close the mobile menu after choosing a link.
  document.querySelectorAll(".menu a").forEach(function (a) {
    a.addEventListener("click", function () { var d = a.closest("details"); if (d) d.open = false; });
  });
})();
