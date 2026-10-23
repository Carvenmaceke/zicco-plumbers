// Zicco Plumbers dashboard: tickets, quotes, invoices and settings. Plain JS, no build step.
(function () {
  "use strict";

  // ---------- helpers ----------
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  // Tagged template that escapes values unless they are already safe HTML (from html``).
  class Safe { constructor(s) { this.s = s; } toString() { return this.s; } }
  const html = (strings, ...vals) => new Safe(strings.reduce((out, s, i) => {
    if (i >= vals.length) return out + s;
    const v = vals[i];
    const one = (x) => (x instanceof Safe ? x.s : x === false || x == null ? "" : esc(x));
    return out + s + (Array.isArray(v) ? v.map(one).join("") : one(v));
  }, ""));
  const money = (n) => "R " + (Number(n) || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const dateShort = (d) => (d ? new Date(d.length === 10 ? d + "T00:00:00" : d).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" }) : "");
  const dateLong = (d) => (d ? new Date(d + "T00:00:00").toLocaleDateString("en-ZA", { weekday: "short", day: "numeric", month: "short" }) : "");
  const when = (iso) => new Date(iso).toLocaleString("en-ZA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  const ago = (iso) => {
    const m = Math.round((Date.now() - Date.parse(iso)) / 60000);
    if (m < 1) return "just now";
    if (m < 60) return m + " min ago";
    if (m < 1440) return Math.round(m / 60) + " h ago";
    return Math.round(m / 1440) + " d ago";
  };
  const today = () => new Date(Date.now() + 2 * 3600e3).toISOString().slice(0, 10); // SAST
  const addDays = (d, n) => { const x = new Date(d + "T00:00:00Z"); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
  const waNumber = (p) => { let d = String(p || "").replace(/\D/g, ""); if (d.startsWith("0") && d.length === 10) d = "27" + d.slice(1); return d; };
  const waLink = (phone, text) => `https://wa.me/${waNumber(phone)}?text=${encodeURIComponent(text)}`;

  const STATUS = {
    new: "New", contacted: "Contacted", quoted: "Quote sent", scheduled: "Visit scheduled",
    in_progress: "In progress", completed: "Completed", cancelled: "Cancelled",
  };
  const OPEN = ["new", "contacted", "quoted", "scheduled", "in_progress"];
  const WINDOWS = ["", "07:00-09:00", "08:00-10:00", "09:00-11:00", "10:00-12:00", "12:00-14:00", "14:00-16:00", "Morning", "Afternoon", "All day"];
  const QUICK_REPLIES = [
    ["", "Quick replies…"],
    ["thanks", "Thanks for your request. We'll call you shortly to discuss the job."],
    ["photos", "Please send us a few photos of the problem on WhatsApp ({phone}) so we can give you an accurate quote."],
    ["visit", "We will come on {date} at {time}. Please make sure someone is home to let us in."],
    ["onway", "Our plumber is on the way and should arrive within the next hour."],
    ["parts", "We're waiting for parts to arrive. We'll let you know as soon as we can finish the job."],
    ["done", "The job is complete. Thank you for choosing Zicco Plumbers! Your invoice will follow by email."],
  ];
  // Ready-made line item sets. Descriptions match the price list in Settings.
  const TEMPLATES = {
    "Standard call-out": ["Call-out fee (Johannesburg)", "Labour (per hour)", "Materials and fittings"],
    "Blocked drain": ["Call-out fee (Johannesburg)", "Blocked drain clearing"],
    "Blocked drain with jetting & camera": ["Call-out fee (Johannesburg)", "High-pressure water jetting (per hour)", "Drain camera inspection"],
    "Leak detection & repair": ["Call-out fee (Johannesburg)", "Leak detection", "Labour (per hour)", "Materials and fittings"],
    "Geyser repair": ["Call-out fee (Johannesburg)", "Geyser element and thermostat replacement"],
    "Geyser replacement + COC": ["Call-out fee (Johannesburg)", "Geyser replacement, 150 L (geyser, valves, drip tray and labour)", "Plumbing Certificate of Compliance (COC)"],
    "Heat pump installation + COC": ["Heat pump supply and installation", "Plumbing Certificate of Compliance (COC)"],
    "Subsoil drainage": ["Subsoil drainage (per metre)", "Materials and fittings"],
  };
  const SERVICE_TEMPLATE = {
    "Drains (blocked drain, drain cleaning)": "Blocked drain",
    "Water jetting": "Blocked drain with jetting & camera",
    "Drain camera": "Blocked drain with jetting & camera",
    "Leak detection": "Leak detection & repair",
    "Heat pumps / Geysers": "Geyser repair",
    "Subsoil drainage": "Subsoil drainage",
    "Plumbing COC": "Geyser replacement + COC",
  };

  const state = { me: null, tickets: [], docs: [], settings: null, filter: { status: "open", q: "" }, docFilter: { status: "all", q: "" } };

  function toast(msg, bad) {
    const t = $("#toast");
    t.textContent = msg;
    t.className = "show" + (bad ? " bad" : "");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => { t.className = ""; }, bad ? 6000 : 3500);
  }

  async function api(path, opts = {}) {
    const res = await fetch("/api/admin/" + path, {
      method: opts.method || "GET",
      headers: opts.body ? { "content-type": "application/json" } : {},
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      credentials: "same-origin",
    });
    if (res.status === 401 && path !== "login") { showLogin(); throw new Error("Please log in"); }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Something went wrong");
    return data;
  }

  function modal(inner, onMount) {
    const bg = document.createElement("div");
    bg.className = "modal-bg";
    bg.innerHTML = `<div class="modal" role="dialog" aria-modal="true">${inner}</div>`;
    document.body.appendChild(bg);
    const close = () => bg.remove();
    bg.addEventListener("click", (e) => { if (e.target === bg || e.target.closest("[data-close]")) close(); });
    onMount && onMount(bg, close);
    const first = bg.querySelector("input, textarea, select, button");
    first && first.focus();
    return close;
  }

  const LOGO = `<svg width="34" height="34" viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="14" fill="#1d5c73"/><text x="32" y="42" font-family="Arial" font-size="27" font-weight="700" text-anchor="middle" fill="#fff">ZP</text></svg>`;

  // ---------- login ----------
  function showLogin() {
    $("#app").innerHTML = `<div class="login"><form id="login-form">
      <div class="brand">${LOGO} Zicco Plumbers dashboard</div>
      <div class="field"><label for="u">Username</label><input id="u" name="user" autocomplete="username" required></div>
      <div class="field"><label for="p">Password</label><input id="p" name="password" type="password" autocomplete="current-password" required></div>
      <button class="btn block" type="submit">Log in</button>
      <p class="demo-hint">Demo login: <strong>admin</strong> / <strong>zicco-demo</strong></p>
      <p class="small muted" id="login-err" role="alert"></p>
    </form></div>`;
    $("#login-form").onsubmit = async (e) => {
      e.preventDefault();
      try {
        await api("login", { method: "POST", body: { user: $("#u").value, password: $("#p").value } });
        boot();
      } catch (ex) { $("#login-err").textContent = ex.message; }
    };
  }

  // ---------- shell ----------
  function shell(active, content) {
    const newCount = state.tickets.filter((t) => t.status === "new" || t.unread).length;
    const nav = [["#/", "Dashboard", "dash"], ["#/tickets", "Tickets", "tickets", newCount], ["#/quotes", "Quotes", "quotes"], ["#/invoices", "Invoices", "invoices"], ["#/settings", "Settings", "settings"]];
    $("#app").innerHTML = html`<div class="shell">
      <header class="side">
        <span class="brand">${new Safe(LOGO)}<span>Zicco Plumbers<small>Dashboard</small></span></span>
        <nav>${nav.map(([h, l, k, c]) => html`<a href="${h}" class="${active === k ? "active" : ""}">${l}${c ? html` <span class="count">${c}</span>` : ""}</a>`)}</nav>
        <span class="user">${state.me.user} <button type="button" id="logout">Log out</button></span>
      </header>
      <main>${state.me.emailMode === "off" ? html`<div class="banner"><strong>Email is not set up yet.</strong> Everything works, but emails to customers are not sent until you add Gmail (SMTP) or Resend settings in Netlify. See the README.</div>` : ""}${content}</main>
    </div>`.s;
    $("#logout").onclick = async () => { await api("logout", { method: "POST" }).catch(() => {}); showLogin(); };
    document.title = (newCount ? `(${newCount}) ` : "") + "Dashboard | Zicco Plumbers";
  }

  async function loadLists() {
    const [t, d] = await Promise.all([api("tickets"), api("docs")]);
    state.tickets = t.tickets;
    state.docs = d.docs;
  }

  // ---------- dashboard ----------
  function viewDashboard() {
    const T = state.tickets, D = state.docs;
    const td = today(), week = addDays(td, 7), month = td.slice(0, 7);
    const upcoming = T.filter((t) => t.appointment?.date >= td && t.appointment?.date <= week && OPEN.includes(t.status)).sort((a, b) => (a.appointment.date + a.appointment.time).localeCompare(b.appointment.date + b.appointment.time));
    const unpaid = D.filter((d) => d.type === "invoice" && d.status === "sent");
    const overdue = unpaid.filter((d) => d.dueDate < td);
    const paidMonth = D.filter((d) => d.type === "invoice" && d.status === "paid" && (d.updatedAt || "").slice(0, 7) === month);
    const quotesOut = D.filter((d) => d.type === "quote" && d.status === "sent");
    const stats = [
      ["#/tickets?status=new", T.filter((t) => t.status === "new").length, "New requests", "warn"],
      ["#/tickets?status=open", T.filter((t) => OPEN.includes(t.status)).length, "Open tickets", ""],
      ["#/tickets?status=scheduled", upcoming.length, "Visits in next 7 days", ""],
      ["#/quotes?status=sent", quotesOut.length, `Quotes awaiting reply (${money(quotesOut.reduce((s, d) => s + d.total, 0))})`, ""],
      ["#/invoices?status=sent", money(unpaid.reduce((s, d) => s + d.total, 0)), `Unpaid invoices (${unpaid.length}${overdue.length ? `, ${overdue.length} overdue` : ""})`, overdue.length ? "warn" : ""],
      ["#/invoices?status=paid", money(paidMonth.reduce((s, d) => s + d.total, 0)), "Paid this month", "good"],
    ];
    const recent = T.slice(0, 6);
    const unread = T.filter((t) => t.unread);
    shell("dash", html`
      <div class="page-head"><h1>Good ${new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"}, ${state.me.user}</h1>
        <div class="actions"><a class="btn accent" href="#/new-ticket">+ New ticket</a><a class="btn secondary" href="#/new-doc/quote">+ Quote</a><a class="btn secondary" href="#/new-doc/invoice">+ Invoice</a></div></div>
      <div class="stats">${stats.map(([h, n, l, c]) => html`<a class="stat ${c}" href="${h}"><div class="num">${n}</div><div class="lbl">${l}</div></a>`)}</div>
      <div class="grid2">
        <div class="card"><h2>Upcoming visits</h2>${upcoming.length ? html`<ul class="mini-list">${upcoming.map((t) => html`<li><span><a href="#/t/${t.id}">${t.name} ${t.surname}</a><br><span class="small muted">${t.location} · ${t.services.join(", ")}</span></span><span class="small" style="text-align:right"><strong>${dateLong(t.appointment.date)}</strong><br>${t.appointment.time || t.appointment.window || ""}</span></li>`)}</ul>` : html`<p class="muted">No visits booked for the next 7 days.</p>`}</div>
        <div class="card"><h2>Latest requests</h2>${recent.length ? html`<ul class="mini-list">${recent.map((t) => html`<li><span><a href="#/t/${t.id}">${t.id}</a> ${t.name} ${t.surname}${t.unread ? html`<span class="dot" title="Unread reply"></span>` : ""}<br><span class="small muted">${t.services.join(", ")} · ${ago(t.createdAt)}</span></span><span class="pill ${t.status}">${STATUS[t.status]}</span></li>`)}</ul>` : html`<p class="muted">No requests yet. They appear here when customers use the website form.</p>`}</div>
        ${unread.length ? html`<div class="card"><h2>Unread customer replies</h2><ul class="mini-list">${unread.map((t) => html`<li><a href="#/t/${t.id}">${t.id} ${t.name} ${t.surname}</a><span class="small muted">${ago(t.updatedAt)}</span></li>`)}</ul></div>` : ""}
        ${overdue.length ? html`<div class="card"><h2>Overdue invoices</h2><ul class="mini-list">${overdue.map((d) => html`<li><a href="#/d/${d.number}">${d.number} ${d.clientName}</a><span>${money(d.total)} <span class="pill overdue">due ${dateShort(d.dueDate)}</span></span></li>`)}</ul></div>` : ""}
      </div>`);
  }

  // ---------- tickets list ----------
  function viewTickets(params) {
    if (params.get("status")) state.filter.status = params.get("status");
    const f = state.filter;
    const counts = { all: state.tickets.length, open: state.tickets.filter((t) => OPEN.includes(t.status)).length };
    Object.keys(STATUS).forEach((k) => { counts[k] = state.tickets.filter((t) => t.status === k).length; });
    const q = f.q.toLowerCase();
    const list = state.tickets.filter((t) =>
      (f.status === "all" || (f.status === "open" ? OPEN.includes(t.status) : t.status === f.status)) &&
      (!q || [t.id, t.name, t.surname, t.phone, t.email, t.location, t.services.join(" ")].join(" ").toLowerCase().includes(q)));
    const chips = [["open", "Open"], ["all", "All"], ...Object.entries(STATUS)];
    shell("tickets", html`
      <div class="page-head"><h1>Tickets</h1><div class="actions"><a class="btn secondary" href="/api/admin/export/tickets.csv">Export CSV</a><a class="btn accent" href="#/new-ticket">+ New ticket</a></div></div>
      <div class="filters">${chips.map(([k, l]) => html`<button class="chip ${f.status === k ? "on" : ""}" data-status="${k}">${l}<b>${counts[k]}</b></button>`)}
        <input class="search" type="search" placeholder="Search name, phone, area, ticket…" value="${f.q}"></div>
      ${list.length ? html`<table class="list"><thead><tr><th>Ticket</th><th>Customer</th><th class="hide-sm">Services</th><th>Location</th><th>Visit</th><th>Status</th><th class="hide-sm">Received</th></tr></thead><tbody>
        ${list.map((t) => html`<tr data-href="#/t/${t.id}"><td class="id">${t.id}${t.unread ? html`<span class="dot" title="Unread reply"></span>` : ""}${t.priority === "urgent" ? html` <span class="pill urgent">Urgent</span>` : ""}</td>
          <td><strong>${t.name} ${t.surname}</strong><div class="small muted">${t.phone}</div></td>
          <td class="hide-sm small">${t.services.join(", ")}</td><td>${t.location}</td>
          <td class="small">${t.appointment ? html`<strong>${dateLong(t.appointment.date)}</strong> ${t.appointment.time || ""}` : html`<span class="muted">-</span>`}</td>
          <td><span class="pill ${t.status}">${STATUS[t.status]}</span></td><td class="hide-sm small muted">${ago(t.createdAt)}</td></tr>`)}
      </tbody></table>` : html`<div class="empty">No tickets match this filter.</div>`}`);
    $$(".chip").forEach((c) => (c.onclick = () => { state.filter.status = c.dataset.status; history.replaceState(null, "", "#/tickets"); viewTickets(new URLSearchParams()); }));
    const s = $(".search");
    s.oninput = () => { state.filter.q = s.value; const pos = s.selectionStart; viewTickets(new URLSearchParams()); const n = $(".search"); n.focus(); n.setSelectionRange(pos, pos); };
    $$("tr[data-href]").forEach((r) => (r.onclick = () => { location.hash = r.dataset.href; }));
  }

  // ---------- new ticket ----------
  function viewNewTicket() {
    shell("tickets", html`
      <a class="back" href="#/tickets">&larr; Tickets</a>
      <div class="page-head"><h1>New ticket</h1></div>
      <form class="card" id="nt" style="max-width:760px">
        <p class="muted small">Log a job that came in by phone, WhatsApp or email so everything is in one place.</p>
        <div class="row"><div class="field"><label>Name *</label><input name="name" required></div><div class="field"><label>Surname</label><input name="surname"></div></div>
        <div class="row"><div class="field"><label>Phone *</label><input name="phone" type="tel" required></div><div class="field"><label>Email</label><input name="email" type="email"></div></div>
        <div class="field"><label>Location / address *</label><input name="location" required></div>
        <div class="row"><div class="field"><label>Came in by</label><select name="source">${state.me.sources.filter((s) => s !== "website").map((s) => html`<option>${s}</option>`)}</select></div>
          <div class="field"><label>Priority</label><select name="priority"><option value="normal">Normal</option><option value="urgent">Urgent</option></select></div></div>
        <fieldset class="field"><label>Services</label><div class="checks">${state.me.services.map((s) => html`<label class="check"><input type="checkbox" name="services" value="${s}"> ${s}</label>`)}</div></fieldset>
        <div class="field"><label>Details</label><textarea name="message"></textarea></div>
        <button class="btn" type="submit">Create ticket</button>
      </form>`);
    $("#nt").onsubmit = async (e) => {
      e.preventDefault();
      const f = e.target;
      try {
        const r = await api("tickets", { method: "POST", body: {
          customer: { name: f.name.value, surname: f.surname.value, phone: f.phone.value, email: f.email.value, location: f.location.value },
          source: f.source.value, priority: f.priority.value, message: f.message.value,
          services: $$('input[name="services"]:checked', f).map((c) => c.value),
        } });
        toast(`Ticket ${r.ticket.id} created`);
        location.hash = `#/t/${r.ticket.id}`;
      } catch (ex) { toast(ex.message, true); }
    };
  }

  // ---------- ticket detail ----------
  async function viewTicket(id) {
    const { ticket: t, trackUrl, docs } = await api(`tickets/${id}`);
    const idx = state.tickets.findIndex((x) => x.id === t.id);
    if (idx >= 0) state.tickets[idx].unread = false;
    const c = t.customer;
    const a = t.appointment || {};
    const waText = `Hi ${c.name}, this is Zicco Plumbers about your request ${t.id}. `;
    shell("tickets", html`
      <a class="back" href="#/tickets">&larr; Tickets</a>
      <div class="page-head"><div><h1>${t.id} · ${c.name} ${c.surname}</h1>
        <div class="small muted">Received ${when(t.createdAt)} via ${t.source} · <span class="pill ${t.status}">${STATUS[t.status]}</span>${t.priority === "urgent" ? html` <span class="pill urgent">Urgent</span>` : ""}</div></div>
        <div class="actions"><a class="btn secondary" href="#/new-doc/quote?ticket=${t.id}">+ Quote</a><a class="btn secondary" href="#/new-doc/invoice?ticket=${t.id}">+ Invoice</a></div></div>
      <div class="detail">
        <div>
          <div class="card"><h2>Customer</h2>
            <dl class="kv"><dt>Name</dt><dd>${c.name} ${c.surname}</dd><dt>Phone</dt><dd>${c.phone}</dd><dt>Email</dt><dd>${c.email || html`<span class="muted">Not given</span>`}</dd>
              <dt>Location</dt><dd>${c.location} · <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.location)}" target="_blank" rel="noopener">Map</a></dd>
              <dt>Services</dt><dd>${t.services.join(", ")}</dd>${t.page ? html`<dt>Sent from</dt><dd class="small">${t.page}</dd>` : ""}</dl>
            ${t.message ? html`<h3 style="margin-top:14px">Customer's message</h3><p style="white-space:pre-wrap;margin:0">${t.message}</p>` : ""}
            ${t.photo ? html`<div class="photo"><a href="/api/admin/tickets/${t.id}/photo" target="_blank"><img src="/api/admin/tickets/${t.id}/photo" alt="Photo from customer"></a></div>` : ""}
            <div class="contact-actions"><a class="btn" href="tel:${c.phone}">Call</a><a class="btn green" href="${waLink(c.phone, waText)}" target="_blank" rel="noopener">WhatsApp</a>${c.email ? html`<a class="btn secondary" href="mailto:${c.email}?subject=${encodeURIComponent("Your request " + t.id)}">Email</a>` : ""}
              <button class="btn secondary" id="copy-track" type="button">Copy tracking link</button><button class="btn secondary" id="edit-cust" type="button">Edit details</button></div>
          </div>
          <div class="card"><h2>Quotes &amp; invoices</h2>
            ${docs.length ? html`<ul class="mini-list">${docs.map((d) => html`<li><a href="#/d/${d.number}">${d.number}</a><span>${money(d.total)} <span class="pill ${d.status}">${d.status}</span></span></li>`)}</ul>` : html`<p class="muted">None yet.</p>`}
            <div class="contact-actions"><a class="btn secondary small" href="#/new-doc/quote?ticket=${t.id}">+ Create quote</a><a class="btn secondary small" href="#/new-doc/invoice?ticket=${t.id}">+ Create invoice</a></div>
          </div>
          <div class="card"><h2>Timeline</h2><ol class="timeline">${t.events.slice().reverse().map((e) => html`<li class="${e.type === "note" ? "note" : e.by === "customer" ? "customer" : ""}">
            <div class="meta">${when(e.at)} · ${e.by === "customer" ? "Customer" : e.by}${e.public ? "" : html`<span class="private">PRIVATE</span>`}</div><div class="text">${e.text}</div></li>`)}</ol></div>
        </div>
        <div class="sticky"><form class="card" id="upd"><h2>Update this ticket</h2>
          <div class="field"><label for="st">Status</label><select id="st" name="status">${Object.entries(STATUS).map(([k, l]) => html`<option value="${k}" ${k === t.status ? new Safe("selected") : ""}>${l}</option>`)}</select></div>
          <h3>Visit / "we will come on"</h3>
          <div class="row"><div class="field"><label>Date</label><input type="date" name="date" value="${a.date || ""}"></div><div class="field"><label>Time</label><input type="time" name="time" value="${a.time || ""}"></div></div>
          <div class="field"><label>Arrival window</label><select name="window">${WINDOWS.map((w) => html`<option value="${w}" ${w === (a.window || "") ? new Safe("selected") : ""}>${w || "None"}</option>`)}</select></div>
          <div class="field"><label>Visit note <span class="hint">(shown to customer)</span></label><input name="vnote" value="${a.note || ""}" placeholder="e.g. Please make sure the geyser is accessible"></div>
          ${a.date ? html`<p class="small" style="margin-top:-6px">${a.confirmedAt ? "✔ Customer confirmed this date." : "Waiting for the customer to confirm."} <button type="button" class="btn danger small" id="clear-visit">Cancel visit</button></p>` : ""}
          <h3>Message to customer</h3>
          <div class="field"><select id="qr">${QUICK_REPLIES.map(([k, l]) => html`<option value="${k}">${l.length > 70 ? l.slice(0, 67) + "…" : l}</option>`)}</select>
            <textarea name="message" placeholder="Write a message the customer will see on their tracking page and in their email"></textarea></div>
          <div class="field"><label>Private note <span class="hint">(only your team sees this)</span></label><textarea name="note" style="min-height:60px"></textarea></div>
          <label class="check"><input type="checkbox" name="notify" ${c.email ? new Safe("checked") : new Safe("disabled")}> Email the customer about this update${c.email ? "" : " (no email address; use WhatsApp)"}</label>
          <button class="btn block" type="submit">Save update</button>
          <a class="btn green block" id="wa-send" style="margin-top:8px" target="_blank" rel="noopener" href="${waLink(c.phone, waText)}">Send message on WhatsApp instead</a>
          <hr style="border:0;border-top:1px solid var(--line);margin:16px 0">
          <div class="contact-actions" style="margin:0"><button type="button" class="btn secondary small" id="prio">${t.priority === "urgent" ? "Mark as normal priority" : "Mark as urgent"}</button><button type="button" class="btn danger small" id="del">Delete ticket</button></div>
        </form></div>
      </div>`);

    const form = $("#upd");
    const fill = (txt) => txt.replace("{phone}", "+27 81 440 5778")
      .replace("{date}", form.date.value ? dateLong(form.date.value) : "[date]").replace("{time}", form.time.value || form.window.value || "[time]");
    $("#qr").onchange = (e) => {
      const r = QUICK_REPLIES.find(([k]) => k === e.target.value);
      if (r && r[0]) form.message.value = fill(r[1]);
      e.target.value = "";
      updateWa();
    };
    const updateWa = () => { $("#wa-send").href = waLink(c.phone, form.message.value ? `Hi ${c.name}, ${form.message.value} (Zicco Plumbers, ${t.id})` : waText); };
    form.message.oninput = updateWa;
    $("#copy-track").onclick = () => { navigator.clipboard.writeText(trackUrl).then(() => toast("Tracking link copied")); };

    form.onsubmit = async (e) => {
      e.preventDefault();
      const body = { message: form.message.value, note: form.note.value, notify: form.notify.checked };
      if (form.status.value !== t.status) body.status = form.status.value;
      if (form.date.value && (form.date.value !== (a.date || "") || form.time.value !== (a.time || "") || form.window.value !== (a.window || "") || form.vnote.value !== (a.note || ""))) {
        body.appointment = { date: form.date.value, time: form.time.value, window: form.window.value, note: form.vnote.value };
      }
      const btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      try {
        const r = await api(`tickets/${t.id}`, { method: "POST", body });
        await loadLists();
        if (r.email?.sent) toast("Saved and emailed to the customer");
        else if (r.email) toast("Saved. " + (r.email.error || r.email.skipped), true);
        else toast("Saved");
        viewTicket(t.id);
      } catch (ex) { toast(ex.message, true); btn.disabled = false; }
    };
    const cv = $("#clear-visit");
    if (cv) cv.onclick = async () => {
      if (!confirm("Cancel the booked visit?")) return;
      await api(`tickets/${t.id}`, { method: "POST", body: { appointment: null, notify: form.notify.checked } });
      toast("Visit cancelled"); await loadLists(); viewTicket(t.id);
    };
    $("#prio").onclick = async () => {
      await api(`tickets/${t.id}`, { method: "POST", body: { priority: t.priority === "urgent" ? "normal" : "urgent" } });
      await loadLists(); viewTicket(t.id);
    };
    $("#del").onclick = async () => {
      if (!confirm(`Delete ticket ${t.id} permanently? (Use this for POPIA deletion requests.) Quotes and invoices are kept.`)) return;
      await api(`tickets/${t.id}`, { method: "DELETE" });
      toast("Ticket deleted"); await loadLists(); location.hash = "#/tickets";
    };
    $("#edit-cust").onclick = () => modal(html`<h2>Edit customer details</h2><form id="ec">
      <div class="row"><div class="field"><label>Name</label><input name="name" value="${c.name}"></div><div class="field"><label>Surname</label><input name="surname" value="${c.surname}"></div></div>
      <div class="row"><div class="field"><label>Phone</label><input name="phone" value="${c.phone}"></div><div class="field"><label>Email</label><input name="email" type="email" value="${c.email}"></div></div>
      <div class="field"><label>Location</label><input name="location" value="${c.location}"></div>
      <div class="actions"><button type="button" class="btn secondary" data-close>Cancel</button><button class="btn" type="submit">Save</button></div></form>`.s, (bg, close) => {
      $("#ec", bg).onsubmit = async (e) => {
        e.preventDefault();
        const f = e.target;
        try {
          await api(`tickets/${t.id}`, { method: "POST", body: { customer: { name: f.name.value, surname: f.surname.value, phone: f.phone.value, email: f.email.value, location: f.location.value } } });
          close(); toast("Customer details saved"); await loadLists(); viewTicket(t.id);
        } catch (ex) { toast(ex.message, true); }
      };
    });
  }

  // ---------- quotes & invoices list ----------
  function viewDocs(type, params) {
    if (params.get("status")) state.docFilter.status = params.get("status");
    const f = state.docFilter;
    const td = today();
    const all = state.docs.filter((d) => d.type === type);
    const statuses = type === "quote" ? ["draft", "sent", "accepted", "declined", "cancelled"] : ["draft", "sent", "paid", "cancelled"];
    if (f.status !== "all" && !statuses.includes(f.status) && f.status !== "overdue") f.status = "all";
    const q = f.q.toLowerCase();
    const list = all.filter((d) => (f.status === "all" || (f.status === "overdue" ? d.status === "sent" && d.dueDate < td : d.status === f.status)) &&
      (!q || [d.number, d.clientName, d.clientCompany, d.clientEmail, d.ticketId].join(" ").toLowerCase().includes(q)));
    const chips = [["all", "All"], ...statuses.map((s) => [s, s[0].toUpperCase() + s.slice(1)]), ...(type === "invoice" ? [["overdue", "Overdue"]] : [])];
    const count = (k) => (k === "all" ? all.length : k === "overdue" ? all.filter((d) => d.status === "sent" && d.dueDate < td).length : all.filter((d) => d.status === k).length);
    const title = type === "quote" ? "Quotes" : "Invoices";
    shell(type === "quote" ? "quotes" : "invoices", html`
      <div class="page-head"><h1>${title}</h1><div class="actions"><a class="btn secondary" href="/api/admin/export/docs.csv">Export CSV</a><a class="btn accent" href="#/new-doc/${type}">+ New ${type}</a></div></div>
      <div class="filters">${chips.map(([k, l]) => html`<button class="chip ${f.status === k ? "on" : ""}" data-status="${k}">${l}<b>${count(k)}</b></button>`)}
        <input class="search" type="search" placeholder="Search client, number, ticket…" value="${f.q}"></div>
      ${list.length ? html`<table class="list"><thead><tr><th>Number</th><th>Client</th><th>Date</th><th>${type === "quote" ? "Valid until" : "Due"}</th><th class="num">Total</th><th>Status</th></tr></thead><tbody>
        ${list.map((d) => html`<tr data-href="#/d/${d.number}"><td class="id">${d.number}</td><td><strong>${d.clientName || "(no name)"}</strong>${d.clientCompany ? html`<div class="small muted">${d.clientCompany}</div>` : ""}${d.ticketId ? html`<div class="small muted">${d.ticketId}</div>` : ""}</td>
          <td class="small">${dateShort(d.issueDate)}</td><td class="small">${dateShort(d.dueDate)}${type === "invoice" && d.status === "sent" && d.dueDate < td ? html` <span class="pill overdue">Overdue</span>` : ""}</td>
          <td class="num"><strong>${money(d.total)}</strong></td><td><span class="pill ${d.status}">${d.status}</span></td></tr>`)}
      </tbody></table>` : html`<div class="empty">No ${title.toLowerCase()} here yet. <a href="#/new-doc/${type}">Create one</a>.</div>`}`);
    $$(".chip").forEach((c) => (c.onclick = () => { state.docFilter.status = c.dataset.status; history.replaceState(null, "", "#/" + type + "s"); viewDocs(type, new URLSearchParams()); }));
    const s = $(".search");
    s.oninput = () => { state.docFilter.q = s.value; const pos = s.selectionStart; viewDocs(type, new URLSearchParams()); const n = $(".search"); n.focus(); n.setSelectionRange(pos, pos); };
    $$("tr[data-href]").forEach((r) => (r.onclick = () => { location.hash = r.dataset.href; }));
  }

  // Create from the ready-made template, then open the editor.
  async function newDoc(type, params) {
    const settings = state.settings || (state.settings = (await api("settings")).settings);
    const priceOf = (desc) => (settings.priceList.find((p) => p.description === desc) || { unitPrice: 0 }).unitPrice;
    const ticketId = params.get("ticket");
    let tpl = "Standard call-out";
    if (ticketId) {
      const t = state.tickets.find((x) => x.id === ticketId);
      const match = t && t.services.map((s) => SERVICE_TEMPLATE[s]).find(Boolean);
      if (match) tpl = match;
    }
    const items = TEMPLATES[tpl].map((d) => ({ description: d, qty: 1, unitPrice: priceOf(d) }));
    const r = await api("docs", { method: "POST", body: { type, ticketId, items } });
    await loadLists();
    toast(`${type === "quote" ? "Quote" : "Invoice"} ${r.doc.number} created from the "${tpl}" template`);
    location.replace(`#/d/${r.doc.number}`);
  }

  // ---------- document editor ----------
  async function viewDoc(number) {
    const [{ doc: d, publicUrl }, settings] = await Promise.all([api(`docs/${number}`), state.settings ? Promise.resolve(state.settings) : api("settings").then((r) => (state.settings = r.settings))]);
    const isQuote = d.type === "quote";
    const label = isQuote ? "Quote" : "Invoice";
    const locked = d.status !== "draft";
    const itemRow = (i) => html`<tr><td><textarea class="desc" rows="1">${i.description}</textarea></td><td class="qty"><input class="q" type="number" min="0" step="any" value="${i.qty}"></td>
      <td class="price"><input class="p" type="number" step="0.01" value="${i.unitPrice}"></td><td class="amt">${money(i.qty * i.unitPrice)}</td><td class="rm"><button type="button" title="Remove line">&times;</button></td></tr>`;
    const statusButtons = isQuote
      ? [["accepted", "Mark accepted", "green"], ["declined", "Mark declined", "secondary"], ["cancelled", "Cancel quote", "danger"]]
      : [["paid", "Mark as paid", "green"], ["cancelled", "Cancel invoice", "danger"]];
    shell(isQuote ? "quotes" : "invoices", html`
      <a class="back" href="#/${d.type}s">&larr; ${label}s</a>
      <div class="page-head"><div><h1>${label} ${d.number} <span class="pill ${d.status}">${d.status}</span></h1>
        <div class="small muted">${d.ticketId ? html`For ticket <a href="#/t/${d.ticketId}">${d.ticketId}</a> · ` : ""}${d.fromQuote ? html`From quote <a href="#/d/${d.fromQuote}">${d.fromQuote}</a> · ` : ""}${d.convertedTo ? html`Invoiced as <a href="#/d/${d.convertedTo}">${d.convertedTo}</a> · ` : ""}Created ${when(d.createdAt)}${d.sentAt ? " · Last sent " + when(d.sentAt) : ""}</div></div>
        <div class="actions"><a class="btn secondary" href="/api/admin/docs/${d.number}/pdf" target="_blank" rel="noopener">Preview PDF</a><button class="btn accent" id="send" type="button">${d.sentAt ? "Resend" : "Send"} by email</button></div></div>
      ${locked ? html`<div class="banner">This ${label.toLowerCase()} has been ${d.status}. You can still edit it; resend it afterwards so the client has the latest version.</div>` : ""}
      <div class="detail">
        <form class="card" id="docf">
          <h2>Client details</h2>
          <div class="row"><div class="field"><label>Client name</label><input name="name" value="${d.client.name}"></div><div class="field"><label>Company <span class="hint">(optional)</span></label><input name="company" value="${d.client.company}"></div></div>
          <div class="row"><div class="field"><label>Email <span class="hint">(${label.toLowerCase()} is sent here)</span></label><input name="email" type="email" value="${d.client.email}"></div><div class="field"><label>Phone</label><input name="phone" value="${d.client.phone}"></div></div>
          <div class="field"><label>Address</label><textarea name="address" style="min-height:60px">${d.client.address}</textarea></div>
          <h2 style="margin-top:8px">${label} details</h2>
          <div class="row3"><div class="field"><label>Date</label><input type="date" name="issueDate" value="${d.issueDate}"></div>
            <div class="field"><label>${isQuote ? "Valid until" : "Due date"}</label><input type="date" name="dueDate" value="${d.dueDate}"></div>
            <div class="field"><label>Reference</label><input name="reference" value="${d.reference || ""}" placeholder="${d.ticketId || ""}"></div></div>
          <h2 style="margin-top:8px">Line items</h2>
          <table class="items"><thead><tr><th>Description</th><th>Qty</th><th>Unit price (R)</th><th style="text-align:right">Amount</th><th></th></tr></thead><tbody id="items">${d.items.map(itemRow)}</tbody></table>
          <div class="add-row"><select id="add-price"><option value="">+ Add item from price list…</option>${settings.priceList.map((p, i) => html`<option value="${i}">${p.description} (${money(p.unitPrice)})</option>`)}</select>
            <select id="add-tpl"><option value="">+ Add a template…</option>${Object.keys(TEMPLATES).map((k) => html`<option>${k}</option>`)}</select>
            <button type="button" class="btn secondary small" id="add-line">+ Blank line</button></div>
          <div class="row" style="margin-top:16px;align-items:end"><div class="field"><label>VAT</label><select name="vatRate"><option value="0" ${!Number(d.vatRate) ? new Safe("selected") : ""}>No VAT (not VAT registered)</option><option value="15" ${Number(d.vatRate) === 15 ? new Safe("selected") : ""}>15% VAT</option></select></div>
            <div class="totals" id="totals"></div></div>
          <div class="field"><label>${isQuote ? "Terms" : "Notes"} <span class="hint">(printed on the ${label.toLowerCase()})</span></label><textarea name="notes">${d.notes || ""}</textarea></div>
          <button class="btn" type="submit">Save changes</button>
        </form>
        <div class="sticky">
          <div class="card"><h2>Actions</h2>
            <div class="doc-status-bar">${statusButtons.filter(([s]) => s !== d.status).map(([s, l, c]) => html`<button type="button" class="btn ${c} small" data-st="${s}">${l}</button>`)}</div>
            <div class="contact-actions">${isQuote && !d.convertedTo ? html`<button type="button" class="btn small" id="convert">Convert to invoice</button>` : ""}
              <button type="button" class="btn secondary small" id="dup">Duplicate</button>
              ${d.status !== "draft" ? html`<button type="button" class="btn secondary small" id="copy-link">Copy client link</button><a class="btn secondary small" href="${publicUrl}" target="_blank" rel="noopener">Client view</a>` : ""}
              ${d.client.phone && d.status !== "draft" ? html`<a class="btn green small" target="_blank" rel="noopener" href="${waLink(d.client.phone, `Hi ${d.client.name}, here is your ${label.toLowerCase()} ${d.number} from Zicco Plumbers: ${publicUrl}`)}">Send link on WhatsApp</a>` : ""}
              <button type="button" class="btn danger small" id="deldoc">Delete</button></div>
          </div>
          <div class="card"><h2>History</h2><ol class="timeline">${d.history.slice().reverse().map((h) => html`<li><div class="meta">${when(h.at)} · ${h.by}</div><div class="text">${h.text}</div></li>`)}</ol></div>
        </div>
      </div>`);

    const form = $("#docf");
    const tbody = $("#items");
    const readItems = () => $$("tr", tbody).map((tr) => ({ description: $(".desc", tr).value, qty: Number($(".q", tr).value) || 0, unitPrice: Number($(".p", tr).value) || 0 }));
    const recalc = () => {
      const items = readItems();
      $$("tr", tbody).forEach((tr, i) => { $(".amt", tr).textContent = money(items[i].qty * items[i].unitPrice); });
      const sub = items.reduce((s, i) => s + i.qty * i.unitPrice, 0);
      const vat = sub * Number(form.vatRate.value) / 100;
      $("#totals").innerHTML = html`<div><span>Subtotal</span><span>${money(sub)}</span></div>${vat ? html`<div><span>VAT (${form.vatRate.value}%)</span><span>${money(vat)}</span></div>` : ""}<div class="grand"><span>Total</span><span>${money(sub + vat)}</span></div>`.s;
    };
    const addItem = (i) => { tbody.insertAdjacentHTML("beforeend", itemRow(i).s); recalc(); };
    tbody.addEventListener("input", recalc);
    tbody.addEventListener("click", (e) => { if (e.target.closest(".rm button")) { e.target.closest("tr").remove(); recalc(); } });
    form.vatRate.onchange = recalc;
    $("#add-price").onchange = (e) => { const p = settings.priceList[e.target.value]; if (p) addItem({ description: p.description, qty: 1, unitPrice: p.unitPrice }); e.target.value = ""; };
    $("#add-tpl").onchange = (e) => {
      (TEMPLATES[e.target.value] || []).forEach((desc) => addItem({ description: desc, qty: 1, unitPrice: (settings.priceList.find((p) => p.description === desc) || { unitPrice: 0 }).unitPrice }));
      e.target.value = "";
    };
    $("#add-line").onclick = () => { addItem({ description: "", qty: 1, unitPrice: 0 }); const last = $$("tr", tbody).pop(); $(".desc", last).focus(); };
    recalc();

    const payload = () => ({
      client: { name: form.name.value, company: form.company.value, email: form.email.value, phone: form.phone.value, address: form.address.value },
      issueDate: form.issueDate.value, dueDate: form.dueDate.value, reference: form.reference.value,
      items: readItems(), vatRate: Number(form.vatRate.value), notes: form.notes.value,
    });
    const save = async (quiet) => {
      await api(`docs/${d.number}`, { method: "POST", body: payload() });
      await loadLists();
      if (!quiet) toast("Saved");
    };
    form.onsubmit = async (e) => { e.preventDefault(); try { await save(); viewDoc(d.number); } catch (ex) { toast(ex.message, true); } };

    $("#send").onclick = async () => {
      try { await save(true); } catch (ex) { return toast(ex.message, true); }
      modal(html`<h2>Email ${label.toLowerCase()} ${d.number}</h2>
        <p class="small muted">The client gets an email with the ${label.toLowerCase()}, a PDF attachment and a link to view it online${isQuote ? " and accept it" : ""}.${settings.notifyEmail ? ` A copy goes to ${settings.notifyEmail}.` : ""}</p>
        <div class="field"><label>To</label><input id="send-to" type="email" value="${form.email.value}"></div>
        <div class="field"><label>Personal message <span class="hint">(optional)</span></label><textarea id="send-msg" placeholder="e.g. Thanks for having us today. Here is the ${label.toLowerCase()} we discussed."></textarea></div>
        <div class="actions"><button class="btn secondary" type="button" data-close>Cancel</button><button class="btn accent" type="button" id="do-send">Send email</button></div>`.s, (bg, close) => {
        $("#do-send", bg).onclick = async () => {
          const to = $("#send-to", bg).value;
          const btn = $("#do-send", bg);
          btn.disabled = true; btn.textContent = "Sending…";
          try {
            if (to !== form.email.value) { form.email.value = to; await save(true); }
            const r = await api(`docs/${d.number}/send`, { method: "POST", body: { message: $("#send-msg", bg).value } });
            close();
            if (r.email.sent) toast(`${label} emailed to ${to}`); else toast(`Not emailed: ${r.email.error || r.email.skipped}. The client link still works.`, true);
            await loadLists(); viewDoc(d.number);
          } catch (ex) { toast(ex.message, true); btn.disabled = false; btn.textContent = "Send email"; }
        };
      });
    };

    $$("[data-st]").forEach((b) => (b.onclick = async () => {
      const st = b.dataset.st;
      let body = { status: st };
      if (st === "paid" && form.email.value) body.sendReceipt = confirm("Mark as paid. Email a paid receipt to the client too?");
      else if (!confirm(`${b.textContent}?`)) return;
      try {
        const r = await api(`docs/${d.number}/status`, { method: "POST", body });
        toast(r.email?.sent ? "Updated and receipt emailed" : "Updated");
        await loadLists(); viewDoc(d.number);
      } catch (ex) { toast(ex.message, true); }
    }));
    const conv = $("#convert");
    if (conv) conv.onclick = async () => {
      if (!confirm(`Create an invoice from quote ${d.number}?`)) return;
      try { await save(true); const r = await api(`docs/${d.number}/convert`, { method: "POST", body: {} }); await loadLists(); toast(`Invoice ${r.doc.number} created`); location.hash = `#/d/${r.doc.number}`; } catch (ex) { toast(ex.message, true); }
    };
    $("#dup").onclick = async () => { const r = await api(`docs/${d.number}/duplicate`, { method: "POST", body: {} }); await loadLists(); toast(`Copy ${r.doc.number} created`); location.hash = `#/d/${r.doc.number}`; };
    const cl = $("#copy-link");
    if (cl) cl.onclick = () => navigator.clipboard.writeText(publicUrl).then(() => toast("Client link copied"));
    $("#deldoc").onclick = async () => {
      if (!confirm(`Delete ${d.number} permanently?`)) return;
      await api(`docs/${d.number}`, { method: "DELETE" }); await loadLists(); toast("Deleted"); location.hash = `#/${d.type}s`;
    };
  }

  // ---------- settings ----------
  async function viewSettings() {
    const { settings: s } = await api("settings");
    state.settings = s;
    const f = (name, label, hint, type = "text") => html`<div class="field"><label for="s-${name}">${label}${hint ? html` <span class="hint">${hint}</span>` : ""}</label><input id="s-${name}" name="${name}" type="${type}" value="${s[name] ?? ""}"></div>`;
    const ta = (name, label, hint) => html`<div class="field"><label for="s-${name}">${label}${hint ? html` <span class="hint">${hint}</span>` : ""}</label><textarea id="s-${name}" name="${name}">${s[name] ?? ""}</textarea></div>`;
    const priceRow = (p) => html`<tr><td><input class="pd" value="${p.description}"></td><td style="width:140px"><input class="pp" type="number" step="0.01" value="${p.unitPrice}"></td><td class="rm" style="width:36px"><button type="button" class="btn danger small">&times;</button></td></tr>`;
    shell("settings", html`
      <div class="page-head"><h1>Settings</h1></div>
      ${state.me.demoLogin ? html`<div class="banner">You're using the demo login (admin / zicco-demo). For real use, set <code>ADMIN_USERS</code> and <code>SESSION_SECRET</code> in Netlify (see README).</div>` : ""}
      <form id="sf"><div class="grid2">
        <div class="card"><h2>Business details <span class="hint">(printed on quotes and invoices)</span></h2>
          ${f("businessName", "Business name")}${f("contactPerson", "Contact person")}
          <div class="row">${f("phone", "Phone")}${f("email", "Email", "", "email")}</div>
          ${ta("address", "Address")}${f("website", "Website")}${f("registration", "Registration line")}
          <div class="row">${f("vatNumber", "VAT number", "(leave blank if not registered)")}<div class="field"><label>Default VAT</label><select name="vatRate"><option value="0" ${!Number(s.vatRate) ? new Safe("selected") : ""}>No VAT</option><option value="15" ${Number(s.vatRate) === 15 ? new Safe("selected") : ""}>15%</option></select></div></div>
        </div>
        <div class="card"><h2>Banking details <span class="hint">(printed on invoices)</span></h2>
          ${f("bankName", "Bank")}${f("accountName", "Account name")}<div class="row">${f("accountNumber", "Account number")}${f("branchCode", "Branch code")}</div>
          <h2 style="margin-top:12px">Quotes &amp; invoices</h2>
          <div class="row">${f("quoteValidDays", "Quotes valid for (days)", "", "number")}${f("invoiceDueDays", "Invoices due after (days)", "", "number")}</div>
          ${ta("quoteTerms", "Default quote terms")}${ta("invoiceNotes", "Default invoice notes")}
        </div>
        <div class="card"><h2>Notifications &amp; email</h2>
          ${f("notifyEmail", "Send business notifications to", "(new requests, replies, accepted quotes, daily summary, copies of quotes and invoices)", "email")}
          ${f("googleReviewUrl", "Google review link", "(added to the 'job completed' email)")}
          <p class="small muted">Email sending: <strong>${{ gmail: "Gmail (Google Sheets backend)", smtp: "Gmail / SMTP", resend: "Resend", off: "not set up yet" }[state.me.emailMode]}</strong></p>
          <div class="add-row"><input id="test-to" type="email" placeholder="you@example.com" style="flex:1 1 200px;border:1.5px solid #cfd6dc;border-radius:8px;padding:7px 10px"><button type="button" class="btn secondary small" id="test-email">Send test email</button></div>
          <p class="small muted" style="margin-top:12px">Every morning at 06:00 customers get a reminder the day before their visit, and you get a summary of today's visits, waiting requests and overdue invoices.</p>
          <button type="button" class="btn secondary small" id="run-daily">Run the daily summary now</button>
        </div>
        <div class="card"><h2>Price list <span class="hint">(sample prices for the demo; used by templates and the "add item" menu)</span></h2>
          <table class="price-list" style="width:100%"><tbody id="pl">${s.priceList.map(priceRow)}</tbody></table>
          <button type="button" class="btn secondary small" id="add-price-row" style="margin-top:8px">+ Add item</button>
        </div>
      </div>
      <p style="margin-top:16px"><button class="btn" type="submit">Save settings</button></p></form>`);
    const pl = $("#pl");
    pl.addEventListener("click", (e) => { if (e.target.closest(".rm button")) e.target.closest("tr").remove(); });
    $("#add-price-row").onclick = () => pl.insertAdjacentHTML("beforeend", priceRow({ description: "", unitPrice: 0 }).s);
    $("#sf").onsubmit = async (e) => {
      e.preventDefault();
      const body = Object.fromEntries(new FormData(e.target).entries());
      body.priceList = $$("tr", pl).map((tr) => ({ description: $(".pd", tr).value, unitPrice: Number($(".pp", tr).value) || 0 }));
      try { const r = await api("settings", { method: "POST", body }); state.settings = r.settings; toast("Settings saved"); } catch (ex) { toast(ex.message, true); }
    };
    $("#test-email").onclick = async () => {
      try { const r = await api("test-email", { method: "POST", body: { to: $("#test-to").value } }); toast(r.message); } catch (ex) { toast(ex.message, true); }
    };
    $("#run-daily").onclick = async () => {
      try { const r = await api("run-daily", { method: "POST", body: {} }); toast(`Done: ${r.result.reminders} reminders, ${r.result.today} visits today, ${r.result.waiting} waiting, ${r.result.overdue} overdue`); } catch (ex) { toast(ex.message, true); }
    };
  }

  // ---------- router ----------
  async function route() {
    const [path, qs] = location.hash.replace(/^#/, "").split("?");
    const params = new URLSearchParams(qs || "");
    const parts = (path || "/").split("/").filter(Boolean);
    try {
      if (!parts.length) { await loadLists(); viewDashboard(); }
      else if (parts[0] === "tickets") { await loadLists(); viewTickets(params); }
      else if (parts[0] === "new-ticket") viewNewTicket();
      else if (parts[0] === "t") await viewTicket(parts[1]);
      else if (parts[0] === "quotes") { await loadLists(); viewDocs("quote", params); }
      else if (parts[0] === "invoices") { await loadLists(); viewDocs("invoice", params); }
      else if (parts[0] === "new-doc") await newDoc(parts[1] === "invoice" ? "invoice" : "quote", params);
      else if (parts[0] === "d") await viewDoc(parts[1]);
      else if (parts[0] === "settings") await viewSettings();
      else location.hash = "#/";
      window.scrollTo(0, 0);
    } catch (e) {
      if (e.message !== "Please log in") toast(e.message, true);
    }
  }

  async function boot() {
    try {
      state.me = await api("me");
    } catch { return; }
    await route();
  }

  window.addEventListener("hashchange", route);
  // Refresh the dashboard and ticket list every minute so new requests show up.
  setInterval(() => {
    if (!state.me || document.hidden) return;
    const h = location.hash;
    if (h === "" || h === "#/" || h.startsWith("#/tickets")) route();
  }, 60000);
  boot();
})();
