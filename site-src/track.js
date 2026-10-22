// Customer tracking page: /track/?id=ZP-12345&k=secret
(function () {
  var q = new URLSearchParams(location.search);
  var id = q.get("id"), k = q.get("k");
  var view = document.getElementById("track-view");
  var lookup = document.getElementById("track-lookup");

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
  function when(iso) {
    return new Date(iso).toLocaleString("en-ZA", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }
  function dateLong(d) {
    return new Date(d + "T00:00:00").toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  }
  function money(n) {
    return "R " + (Number(n) || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }
  function api(path, opts) {
    return fetch(path, opts).then(function (r) {
      return r.json().then(function (b) { if (!r.ok) throw new Error(b.error || "Something went wrong"); return b; });
    });
  }
  function post(path, body) {
    return api(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  }

  function render(t) {
    view.hidden = false;
    lookup.hidden = true;
    view.innerHTML = "";
    var cancelled = t.status === "cancelled";
    var idx = t.steps.findIndex(function (s) { return s.key === t.status; });

    view.appendChild(h("h1", { text: "Request " + t.id }));
    view.appendChild(h("p", { class: "lead", text: "Hi " + t.name + ". " + t.statusText }));

    var steps = h("ol", { class: "progress" + (cancelled ? " is-cancelled" : "") });
    t.steps.forEach(function (s, i) {
      steps.appendChild(h("li", { class: i < idx ? "done" : i === idx ? "current" : "" }, [h("span", { text: s.label })]));
    });
    view.appendChild(steps);
    if (cancelled) view.appendChild(h("p", { class: "notice", text: "This request has been closed. Contact us if you still need help." }));

    if (t.appointment && t.appointment.date) {
      var a = t.appointment;
      var card = h("div", { class: "track-card visit" }, [
        h("h2", { text: "We will come on" }),
        h("p", { class: "big", text: dateLong(a.date) + (a.time ? " at " + a.time : "") }),
        a.window ? h("p", { text: "Arrival window: " + a.window }) : null,
        a.note ? h("p", { text: a.note }) : null,
      ]);
      var row = h("div", { class: "cta-row" });
      row.appendChild(h("a", { class: "btn btn-ghost", href: "/api/track/ics?id=" + encodeURIComponent(t.id) + "&k=" + encodeURIComponent(k), text: "Add to calendar" }));
      if (!a.confirmedAt) {
        var conf = h("button", { class: "btn btn-call", type: "button", text: "Confirm this date" });
        conf.onclick = function () { conf.disabled = true; post("/api/track/confirm", { id: t.id, k: k }).then(render).catch(function (e) { alert(e.message); conf.disabled = false; }); };
        row.appendChild(conf);
      } else row.appendChild(h("span", { class: "pill ok", text: "Date confirmed" }));
      card.appendChild(row);
      view.appendChild(card);
    }

    if (t.docs.length) {
      var docs = h("div", { class: "track-card" }, [h("h2", { text: "Quotes and invoices" })]);
      var ul = h("ul", { class: "doc-list" });
      t.docs.forEach(function (d) {
        ul.appendChild(h("li", {}, [
          h("a", { href: d.url, text: (d.type === "quote" ? "Quote " : "Invoice ") + d.number }),
          h("span", { text: money(d.total) }),
          h("span", { class: "pill " + d.status, text: d.status }),
        ]));
      });
      docs.appendChild(ul);
      view.appendChild(docs);
    }

    var details = h("div", { class: "track-card" }, [
      h("h2", { text: "Your request" }),
      h("p", {}, [h("strong", { text: "Services: " }), t.services.join(", ")]),
      h("p", {}, [h("strong", { text: "Location: " }), t.location]),
      t.message ? h("p", {}, [h("strong", { text: "Your message: " }), t.message]) : null,
      h("p", { class: "small", text: "Submitted " + when(t.createdAt) }),
    ]);
    view.appendChild(details);

    var tl = h("div", { class: "track-card" }, [h("h2", { text: "Updates and messages" })]);
    var list = h("ol", { class: "timeline" });
    t.events.slice().reverse().forEach(function (e) {
      list.appendChild(h("li", { class: e.from === "You" ? "mine" : "" }, [
        h("div", { class: "meta", text: e.from + " · " + when(e.at) }),
        h("div", { class: "body", text: e.text }),
      ]));
    });
    tl.appendChild(list);

    var form = h("form", { class: "reply" }, [
      h("label", { for: "reply-msg", text: "Send us a message" }),
      h("textarea", { id: "reply-msg", required: "required", placeholder: "Ask a question or give us more details…" }),
      h("button", { class: "btn btn-call", type: "submit", text: "Send message" }),
    ]);
    form.onsubmit = function (e) {
      e.preventDefault();
      var ta = form.querySelector("textarea"), b = form.querySelector("button");
      if (!ta.value.trim()) return;
      b.disabled = true;
      post("/api/track/reply", { id: t.id, k: k, message: ta.value }).then(render).catch(function (ex) { alert(ex.message); b.disabled = false; });
    };
    tl.appendChild(form);
    view.appendChild(tl);
  }

  function showLookup(msg) {
    lookup.hidden = false;
    if (msg) { var st = lookup.querySelector(".form-status"); st.hidden = false; st.textContent = msg; st.style.color = "#b42318"; }
    if (id) document.getElementById("l-id").value = id;
  }

  document.getElementById("lookup-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var st = lookup.querySelector(".form-status");
    post("/api/track/lookup", { id: document.getElementById("l-id").value, phone: document.getElementById("l-phone").value })
      .then(function (r) { location.href = "/track/?id=" + encodeURIComponent(r.id) + "&k=" + encodeURIComponent(r.k); })
      .catch(function (ex) { st.hidden = false; st.textContent = ex.message; st.style.color = "#b42318"; });
  });

  if (id && k) {
    api("/api/track?id=" + encodeURIComponent(id) + "&k=" + encodeURIComponent(k)).then(render).catch(function (e) { showLookup(e.message); });
  } else showLookup();
})();
