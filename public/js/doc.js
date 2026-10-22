// Online quote / invoice: /doc/?n=Q-0001&k=secret
(function () {
  var q = new URLSearchParams(location.search);
  var n = q.get("n"), k = q.get("k");
  var app = document.getElementById("doc-app");

  function h(tag, attrs, children) {
    var el = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (a) {
      if (a === "text") el.textContent = attrs[a];
      else if (a === "class") el.className = attrs[a];
      else el.setAttribute(a, attrs[a]);
    });
    (children || []).forEach(function (c) { if (c) el.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
    return el;
  }
  function money(v) { return "R " + (Number(v) || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ","); }
  function date(d) { return d ? new Date(d + "T00:00:00").toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" }) : "-"; }
  function lines(text) {
    var frag = document.createDocumentFragment();
    String(text || "").split("\n").forEach(function (l, i) { if (i) frag.appendChild(document.createElement("br")); frag.appendChild(document.createTextNode(l)); });
    return frag;
  }
  function post(action, body) {
    body.n = n; body.k = k;
    return fetch("/api/doc/" + action, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().then(function (b) { if (!r.ok) throw new Error(b.error); return b; }); });
  }

  function render(d) {
    app.innerHTML = "";
    var isQuote = d.type === "quote";
    var pdf = "/api/doc/pdf?n=" + encodeURIComponent(n) + "&k=" + encodeURIComponent(k);

    var bar = h("div", { class: "doc-actions" }, [
      h("a", { class: "btn btn-call", href: pdf, target: "_blank", rel: "noopener", text: "Download PDF" }),
      h("button", { class: "btn btn-ghost", type: "button", text: "Print" }),
      d.trackUrl ? h("a", { class: "btn btn-ghost", href: d.trackUrl, text: "Track your request" }) : null,
    ]);
    bar.querySelector("button").onclick = function () { window.print(); };
    app.appendChild(bar);

    if (isQuote && d.status === "sent") {
      var accept = h("div", { class: "accept-box" }, [
        h("div", {}, [h("h2", { text: "Happy with this quote?" }), h("p", { text: "Accept it online and we'll be in touch to book the work." })]),
      ]);
      var form = h("form", { class: "accept-form" }, [
        h("input", { type: "text", name: "name", placeholder: "Your full name", required: "required", value: d.client.name || "" }),
        h("button", { class: "btn btn-wa", type: "submit", text: "Accept quote" }),
        h("button", { class: "btn btn-ghost decline", type: "button", text: "Decline" }),
      ]);
      form.onsubmit = function (e) { e.preventDefault(); post("accept", { name: form.name.value }).then(render).catch(function (ex) { alert(ex.message); }); };
      form.querySelector(".decline").onclick = function () {
        var reason = prompt("Sorry to hear that. Would you like to tell us why? (optional)");
        if (reason === null) return;
        post("decline", { reason: reason }).then(render).catch(function (ex) { alert(ex.message); });
      };
      accept.appendChild(form);
      app.appendChild(accept);
    }
    if (d.status === "accepted") app.appendChild(h("p", { class: "notice ok", text: "Quote accepted" + (d.acceptedBy ? " by " + d.acceptedBy : "") + ". Thank you! We'll be in touch to book the work." }));
    if (d.status === "declined") app.appendChild(h("p", { class: "notice", text: "This quote was declined. Contact us if you'd like to discuss it." }));
    if (d.status === "paid") app.appendChild(h("p", { class: "notice ok", text: "Paid. Thank you!" }));

    var b = d.business;
    var paper = h("article", { class: "paper" }, [
      h("header", { class: "paper-head" }, [
        h("div", {}, [h("div", { class: "paper-brand", text: b.name }), h("div", { class: "paper-sub", text: b.registration }), b.vatNumber ? h("div", { class: "paper-sub", text: "VAT no. " + b.vatNumber }) : null]),
        h("div", { class: "paper-title" }, [h("div", { text: d.title.toUpperCase() }), h("small", { text: d.number })]),
      ]),
      h("div", { class: "paper-parties" }, [
        h("div", {}, [h("div", { class: "lbl", text: "From" }), h("strong", { text: b.name }), h("p", {}, [lines(b.address)]), h("p", { text: [b.phone, b.email, b.website].filter(Boolean).join(" · ") })]),
        h("div", {}, [h("div", { class: "lbl", text: isQuote ? "Quote for" : "Bill to" }), h("strong", { text: d.client.name }), d.client.company ? h("p", { text: d.client.company }) : null, h("p", {}, [lines(d.client.address)]), h("p", { text: [d.client.phone, d.client.email].filter(Boolean).join(" · ") })]),
      ]),
      h("div", { class: "paper-meta" }, [
        h("div", {}, [h("span", { text: isQuote ? "Quote no." : "Invoice no." }), h("strong", { text: d.number })]),
        h("div", {}, [h("span", { text: "Date" }), h("strong", { text: date(d.issueDate) })]),
        h("div", {}, [h("span", { text: isQuote ? "Valid until" : "Due date" }), h("strong", { text: date(d.dueDate) })]),
        h("div", {}, [h("span", { text: "Reference" }), h("strong", { text: d.reference || "-" })]),
      ]),
    ]);
    var table = h("table", { class: "paper-items" });
    table.appendChild(h("thead", {}, [h("tr", {}, [h("th", { text: "Description" }), h("th", { text: "Qty" }), h("th", { text: "Unit price" }), h("th", { text: "Amount" })])]));
    var tb = h("tbody");
    d.items.forEach(function (i) {
      tb.appendChild(h("tr", {}, [h("td", {}, [lines(i.description)]), h("td", { text: String(i.qty) }), h("td", { text: money(i.unitPrice) }), h("td", { text: money(i.qty * i.unitPrice) })]));
    });
    table.appendChild(tb);
    paper.appendChild(table);
    var totals = h("div", { class: "paper-totals" }, [
      h("div", {}, [h("span", { text: "Subtotal" }), h("span", { text: money(d.totals.subtotal) })]),
      Number(d.vatRate) > 0 ? h("div", {}, [h("span", { text: "VAT (" + d.vatRate + "%)" }), h("span", { text: money(d.totals.vat) })]) : null,
      h("div", { class: "grand" }, [h("span", { text: isQuote ? "Total" : d.status === "paid" ? "Total (paid)" : "Total due" }), h("span", { text: money(d.totals.total) })]),
    ]);
    paper.appendChild(totals);
    if (b.bank && d.status !== "paid") {
      paper.appendChild(h("div", { class: "paper-note" }, [h("div", { class: "lbl", text: "Payment details" }),
        h("p", {}, [lines([b.bank.bankName && "Bank: " + b.bank.bankName, "Account name: " + b.bank.accountName, "Account number: " + b.bank.accountNumber, b.bank.branchCode && "Branch code: " + b.bank.branchCode, "Reference: " + d.number].filter(Boolean).join("\n"))])]));
    }
    if (d.notes) paper.appendChild(h("div", { class: "paper-note" }, [h("div", { class: "lbl", text: isQuote ? "Terms" : "Notes" }), h("p", {}, [lines(d.notes)])]));
    app.appendChild(paper);
    document.title = d.title + " " + d.number + " | " + b.name;
  }

  if (!n || !k) { app.innerHTML = '<h1>Document not found</h1><p>Please use the link in your email.</p>'; return; }
  fetch("/api/doc?n=" + encodeURIComponent(n) + "&k=" + encodeURIComponent(k))
    .then(function (r) { return r.json().then(function (b) { if (!r.ok) throw new Error(b.error); return b; }); })
    .then(render)
    .catch(function (e) { app.innerHTML = ""; app.appendChild(h("h1", { text: "Document not found" })); app.appendChild(h("p", { text: e.message })); });
})();
