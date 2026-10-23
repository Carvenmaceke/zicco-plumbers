// Zicco Plumbers dashboard: jobs, quotes, invoices and settings. Plain JS, no build step.
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
  const sel = (on) => (on ? new Safe("selected") : "");
  const fullName = (t) => `${t.name} ${t.surname}`.trim();

  // Simple line icons.
  const ICONS = {
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>',
    jobs: '<path d="M9 4h6a1 1 0 0 1 1 1v1H8V5a1 1 0 0 1 1-1z"/><path d="M8 5H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><path d="m9 13 2 2 4-4"/>',
    quote: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/>',
    invoice: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6M9 16h3"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/>',
    chat: '<path d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 21l2.1-5.6A8.4 8.4 0 1 1 21 11.5z"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5h13L22 12v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6z"/>',
    cash: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/>',
    check: '<circle cx="12" cy="12" r="10"/><path d="m8 12 3 3 5-6"/>',
    alert: '<circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>',
    send: '<path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/>',
    eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    building: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01"/>',
    bank: '<path d="M3 21h18M5 21V10M19 21V10M9 21V10M15 21V10M2 10l10-7 10 7z"/>',
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/>',
    tag: '<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8z"/><path d="M7 7h.01"/>',
  };
  const icon = (n) => new Safe(`<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n]}</svg>`);

  const STATUS = {
    new: "New", contacted: "Contacted", quoted: "Quote sent", scheduled: "Visit booked",
    in_progress: "In progress", completed: "Done", cancelled: "Cancelled",
  };
  const STEPS = ["new", "contacted", "quoted", "scheduled", "in_progress", "completed"];
  const OPEN = ["new", "contacted", "quoted", "scheduled", "in_progress"];
  const DOC_STATUS = { draft: "Draft", sent: "Sent", accepted: "Accepted", declined: "Declined", paid: "Paid", cancelled: "Cancelled" };
  const WINDOWS = ["", "07:00-09:00", "08:00-10:00", "09:00-11:00", "10:00-12:00", "12:00-14:00", "14:00-16:00", "Morning", "Afternoon", "All day"];
  // Quick replies: [key, button label, message, status it moves the job to]
  const QUICK_REPLIES = [
    ["thanks", "We'll call you", "Thanks for your request. We'll call you shortly to discuss the job.", "contacted"],
    ["photos", "Send photos", "Please send us a few photos of the problem on WhatsApp ({phone}) so we can give you an accurate quote.", "contacted"],
    ["visit", "Visit booked", "We will come on {date} at {time}. Please make sure someone is home to let us in.", "scheduled"],
    ["onway", "On the way", "Our plumber is on the way and should arrive within the next hour.", "in_progress"],
    ["parts", "Waiting for parts", "We're waiting for parts to arrive. We'll let you know as soon as we can finish the job.", "in_progress"],
    ["done", "Job done", "The job is complete. Thank you for choosing Zicco Plumbers! Your invoice will follow by email.", "completed"],
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
  // The live site's shim script carries the Apps Script address; without it this is the browser demo.
  const IS_DEMO = !document.querySelector("script[data-api]");

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

  const LOGO = (s = 36) => new Safe(`<svg width="${s}" height="${s}" viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="16" fill="#1d5c73"/><text x="32" y="42" font-family="Arial" font-size="26" font-weight="700" text-anchor="middle" fill="#fff">ZP</text></svg>`);

  // ---------- login ----------
  function showLogin() {
    $("#app").innerHTML = html`<div class="login"><form id="login-form">
      <div class="brand">${LOGO(44)}<div><strong>Zicco Plumbers</strong><span>Manager dashboard</span></div></div>
      <div class="field"><label for="u">Username</label><input id="u" name="user" autocomplete="username" required></div>
      <div class="field"><label for="p">Password</label><input id="p" name="password" type="password" autocomplete="current-password" required></div>
      <button class="btn big block" type="submit">Log in</button>
      ${IS_DEMO ? html`<p class="demo-hint">Demo login: <strong>admin</strong> / <strong>zicco-demo</strong></p>` : ""}
      <p class="small" id="login-err" role="alert"></p>
    </form></div>`.s;
    $("#login-form").onsubmit = async (e) => {
      e.preventDefault();
      const btn = $("#login-form button");
      btn.disabled = true; btn.textContent = "Logging in…";
      try {
        await api("login", { method: "POST", body: { user: $("#u").value, password: $("#p").value } });
        boot();
      } catch (ex) { $("#login-err").textContent = ex.message; btn.disabled = false; btn.textContent = "Log in"; }
    };
  }

  // ---------- shell ----------
  function shell(active, content) {
    const newCount = state.tickets.filter((t) => t.status === "new" || t.unread).length;
    const nav = [["#/", "Home", "dash", "home"], ["#/tickets", "Jobs", "tickets", "jobs", newCount], ["#/quotes", "Quotes", "quotes", "quote"], ["#/invoices", "Invoices", "invoices", "invoice"], ["#/settings", "Settings", "settings", "settings"]];
    $("#app").innerHTML = html`<div class="layout">
      <div class="topbar">${LOGO(28)}<strong>Zicco Plumbers</strong><button type="button" class="logout">Log out</button></div>
      <aside class="side">
        <div class="brand">${LOGO(36)}<div><strong>Zicco Plumbers</strong><small>Manager dashboard</small></div></div>
        <nav>${nav.map(([h, l, k, ic, c]) => html`<a href="${h}" class="${active === k ? "active" : ""}">${icon(ic)}<span>${l}</span>${c ? html`<span class="count">${c}</span>` : ""}</a>`)}</nav>
        <div class="user"><span class="avatar">${state.me.user.slice(0, 1)}</span><span>${state.me.user}</span><button type="button" class="logout" id="logout" title="Log out">${icon("logout")}</button></div>
      </aside>
      <main>${state.me.emailMode === "off" && !IS_DEMO ? html`<div class="banner">Email sending is not set up yet, so customers won't get emails.</div>` : ""}${content}</main></div>`.s;
    $$(".logout").forEach((b) => (b.onclick = async () => { await api("logout", { method: "POST" }).catch(() => {}); showLogin(); }));
    document.title = (newCount ? `(${newCount}) ` : "") + "Dashboard | Zicco Plumbers";
  }

  async function loadLists() {
    const [t, d] = await Promise.all([api("tickets"), api("docs")]);
    state.tickets = t.tickets;
    state.docs = d.docs;
  }

  // ---------- home ----------
  function viewDashboard() {
    const T = state.tickets, D = state.docs;
    const td = today(), week = addDays(td, 7), month = td.slice(0, 7);
    const upcoming = T.filter((t) => t.appointment?.date >= td && t.appointment?.date <= week && OPEN.includes(t.status)).sort((a, b) => (a.appointment.date + a.appointment.time).localeCompare(b.appointment.date + b.appointment.time));
    const unpaid = D.filter((d) => d.type === "invoice" && d.status === "sent");
    const overdue = unpaid.filter((d) => d.dueDate < td);
    const paidMonth = D.filter((d) => d.type === "invoice" && d.status === "paid" && (d.updatedAt || "").slice(0, 7) === month);
    const newOnes = T.filter((t) => t.status === "new");
    const replies = T.filter((t) => t.unread && t.status !== "new");
    const accepted = D.filter((d) => d.type === "quote" && d.status === "accepted" && !d.convertedTo);
    const stats = [
      ["#/tickets?status=new", newOnes.length, "New requests", newOnes.length ? "warn" : "", "inbox"],
      ["#/tickets?status=scheduled", upcoming.length, "Visits this week", "", "calendar"],
      ["#/invoices?status=sent", money(unpaid.reduce((s, d) => s + d.total, 0)), `Unpaid (${unpaid.length} invoice${unpaid.length === 1 ? "" : "s"})`, overdue.length ? "warn" : "", "invoice"],
      ["#/invoices?status=paid", money(paidMonth.reduce((s, d) => s + d.total, 0)), "Paid this month", "good", "cash"],
    ];
    // One simple to-do list, most important first.
    const todo = [
      ...newOnes.map((t) => ({ href: `#/t/${t.id}`, tag: "warn", ic: "inbox", title: `New request from ${fullName(t)}`, sub: `${t.services.join(", ")} · ${t.location}`, right: ago(t.createdAt) })),
      ...replies.map((t) => ({ href: `#/t/${t.id}`, tag: "green", ic: "chat", title: `${fullName(t)} replied`, sub: `Job ${t.id}`, right: ago(t.updatedAt) })),
      ...accepted.map((d) => ({ href: `#/d/${d.number}`, tag: "green", ic: "check", title: `${d.clientName} accepted quote ${d.number}`, sub: `${money(d.total)} · ready to invoice`, right: "" })),
      ...overdue.map((d) => ({ href: `#/d/${d.number}`, tag: "red", ic: "alert", title: `Invoice ${d.number} is overdue`, sub: `${d.clientName} · ${money(d.total)}`, right: `due ${dateShort(d.dueDate)}` })),
    ];
    const h = new Date().getHours();
    shell("dash", html`
      <div class="page-head"><div><h1>Good ${h < 12 ? "morning" : h < 18 ? "afternoon" : "evening"}, ${state.me.user}</h1>
        <p class="muted">${new Date().toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long" })}</p></div>
        <div class="actions"><a class="btn accent" href="#/new-ticket">${icon("plus")} Log a job</a><a class="btn secondary" href="#/new-doc/quote">${icon("plus")} Quote</a><a class="btn secondary" href="#/new-doc/invoice">${icon("plus")} Invoice</a></div></div>
      <div class="stats">${stats.map(([href, n, l, c, ic]) => html`<a class="stat ${c}" href="${href}"><span class="ic">${icon(ic)}</span><span><span class="num">${n}</span><span class="lbl">${l}</span></span></a>`)}</div>
      <div class="grid2">
        <div class="card"><h2>Needs your attention</h2>
          ${todo.length ? html`<ul class="todo">${todo.map((x) => html`<li><span class="tag ${x.tag}">${icon(x.ic)}</span><a class="what" href="${x.href}" style="color:inherit;text-decoration:none"><strong>${x.title}</strong><span>${x.sub}</span></a><span class="date muted">${x.right}</span></li>`)}</ul>`
            : html`<div class="all-clear">${icon("check")}<strong>All caught up</strong><br><span class="small">New requests and customer replies will show up here.</span></div>`}</div>
        <div class="card"><div class="card-head"><h2>Upcoming visits</h2><a href="#/tickets?status=scheduled">See all</a></div>
          ${upcoming.length ? html`<ul class="todo">${upcoming.map((t) => html`<li><span class="tag">${icon("calendar")}</span><a class="what" href="#/t/${t.id}" style="color:inherit;text-decoration:none"><strong>${fullName(t)}</strong><span>${t.location} · ${t.services.join(", ")}</span></a><span class="date"><strong>${dateLong(t.appointment.date)}</strong><br><span class="muted">${t.appointment.time || t.appointment.window || ""}</span></span></li>`)}</ul>`
            : html`<div class="all-clear"><span class="small">No visits booked for the next 7 days.</span></div>`}</div>
      </div>`);
  }

  // ---------- jobs list ----------
  function viewTickets(params) {
    if (params.get("status")) state.filter.status = params.get("status");
    const f = state.filter;
    const tabs = [["open", "To do"], ["new", "New"], ["scheduled", "Booked"], ["completed", "Done"], ["all", "All"]];
    if (!tabs.some(([k]) => k === f.status)) tabs.splice(4, 0, [f.status, STATUS[f.status] || f.status]);
    const match = (t, k) => k === "all" || (k === "open" ? OPEN.includes(t.status) : t.status === k);
    const q = f.q.toLowerCase();
    const list = state.tickets.filter((t) => match(t, f.status) &&
      (!q || [t.id, t.name, t.surname, t.phone, t.email, t.location, t.services.join(" ")].join(" ").toLowerCase().includes(q)));
    shell("tickets", html`
      <div class="page-head"><div><h1>Jobs</h1><p class="muted">Every request from the website, plus jobs you log yourself.</p></div>
        <div class="actions"><a class="btn accent" href="#/new-ticket">${icon("plus")} Log a job</a></div></div>
      <div class="toolbar"><div class="tabs">${tabs.map(([k, l]) => html`<button class="tab ${f.status === k ? "on" : ""}" data-status="${k}">${l}<b>${state.tickets.filter((t) => match(t, k)).length}</b></button>`)}</div>
        <input class="search" type="search" placeholder="Search name, phone, area…" value="${f.q}"></div>
      ${list.length ? html`<div class="rows">${list.map((t) => html`<a class="row-item" href="#/t/${t.id}">
          <span><strong>${fullName(t)}${t.unread ? html`<span class="dot" title="New reply"></span>` : ""}</strong><span class="sub">${t.services.join(", ")}</span></span>
          <span class="hide-sm"><span class="sub">${t.location}</span><span class="sub">${t.phone}</span></span>
          <span class="hide-sm small">${t.appointment ? html`${icon("calendar")} ${dateLong(t.appointment.date)}` : html`<span class="muted">${ago(t.createdAt)}</span>`}</span>
          <span class="right">${t.priority === "urgent" ? html`<span class="pill urgent">Urgent</span> ` : ""}<span class="pill ${t.status}">${STATUS[t.status]}</span></span></a>`)}</div>`
        : html`<div class="empty">${f.q ? "Nothing matches your search." : "Nothing here right now."}</div>`}
      <p class="list-foot"><a href="/api/admin/export/tickets.csv">Download all jobs (CSV)</a></p>`);
    $$(".tab").forEach((c) => (c.onclick = () => { state.filter.status = c.dataset.status; history.replaceState(null, "", "#/tickets"); viewTickets(new URLSearchParams()); }));
    const s = $(".search");
    s.oninput = () => { state.filter.q = s.value; const pos = s.selectionStart; viewTickets(new URLSearchParams()); const n = $(".search"); n.focus(); n.setSelectionRange(pos, pos); };
  }

  // ---------- log a job ----------
  function viewNewTicket() {
    shell("tickets", html`
      <a class="back" href="#/tickets">&larr; Jobs</a>
      <div class="page-head"><div><h1>Log a job</h1><p class="muted">For jobs that came in by phone, WhatsApp or email, so everything is in one place.</p></div></div>
      <form class="card" id="nt" style="max-width:720px">
        <div class="row"><div class="field"><label>Name *</label><input name="name" required></div><div class="field"><label>Surname</label><input name="surname"></div></div>
        <div class="row"><div class="field"><label>Phone *</label><input name="phone" type="tel" required></div><div class="field"><label>Email <span class="hint">(to email them updates)</span></label><input name="email" type="email"></div></div>
        <div class="field"><label>Area or address *</label><input name="location" required></div>
        <fieldset class="field"><label>What do they need?</label><div class="checks">${state.me.services.map((s) => html`<label class="check"><input type="checkbox" name="services" value="${s}"> ${s}</label>`)}</div></fieldset>
        <div class="field"><label>Details</label><textarea name="message" placeholder="What did the customer tell you?"></textarea></div>
        <div class="row"><div class="field"><label>Came in by</label><select name="source">${state.me.sources.filter((s) => s !== "website").map((s) => html`<option>${s}</option>`)}</select></div>
          <div class="field"><label>Priority</label><select name="priority"><option value="normal">Normal</option><option value="urgent">Urgent</option></select></div></div>
        <button class="btn big" type="submit">Save job</button>
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
        toast(`Job ${r.ticket.id} saved`);
        location.hash = `#/t/${r.ticket.id}`;
      } catch (ex) { toast(ex.message, true); }
    };
  }

  // ---------- job detail ----------
  async function viewTicket(id) {
    const { ticket: t, trackUrl, docs } = await api(`tickets/${id}`);
    const idx = state.tickets.findIndex((x) => x.id === t.id);
    if (idx >= 0) state.tickets[idx].unread = false;
    const c = t.customer;
    const a = t.appointment || {};
    const waText = `Hi ${c.name}, this is Zicco Plumbers about your request ${t.id}. `;
    const stepAt = STEPS.indexOf(t.status);
    shell("tickets", html`
      <a class="back" href="#/tickets">&larr; Jobs</a>
      <div class="page-head"><div><h1>${c.name} ${c.surname}</h1>
        <p class="muted small">Job ${t.id} · received ${when(t.createdAt)} via ${t.source}${t.priority === "urgent" ? html` · <span class="pill urgent">Urgent</span>` : ""}</p></div>
        <div class="actions"><span class="pill ${t.status}" style="font-size:.85rem;padding:6px 14px">${STATUS[t.status]}</span></div></div>
      ${stepAt >= 0 ? html`<div class="progress">${STEPS.map((s, i) => html`<span class="${i < stepAt ? "done" : i === stepAt ? "now" : ""}">${STATUS[s]}</span>`)}</div>` : ""}
      <div class="detail">
        <div>
          <div class="card">
            <div class="who"><span class="avatar">${c.name.slice(0, 1)}</span><div><strong>${c.name} ${c.surname}</strong><span class="muted small">${t.services.join(", ")}</span></div></div>
            <dl class="kv"><dt>Phone</dt><dd>${c.phone}</dd><dt>Email</dt><dd>${c.email || html`<span class="muted">Not given</span>`}</dd>
              <dt>Where</dt><dd>${c.location} · <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.location)}" target="_blank" rel="noopener">Map</a></dd>
              ${a.date ? html`<dt>Visit</dt><dd><strong>${dateLong(a.date)}</strong> ${a.time || a.window || ""} ${a.confirmedAt ? html`<span class="pill completed">Confirmed</span>` : ""}</dd>` : ""}</dl>
            ${t.message ? html`<div class="quote-msg">${t.message}</div>` : ""}
            ${t.photo ? html`<div class="photo"><a href="/api/admin/tickets/${t.id}/photo" target="_blank"><img src="/api/admin/tickets/${t.id}/photo" alt="Photo from customer"></a></div>` : ""}
            <div class="contact-actions"><a class="btn" href="tel:${c.phone}">${icon("phone")} Call</a><a class="btn green" href="${waLink(c.phone, waText)}" target="_blank" rel="noopener">${icon("chat")} WhatsApp</a>${c.email ? html`<a class="btn secondary" href="mailto:${c.email}?subject=${encodeURIComponent("Your request " + t.id)}">${icon("mail")} Email</a>` : ""}</div>
          </div>
          <div class="card"><div class="card-head"><h2>Quotes &amp; invoices</h2></div>
            ${docs.length ? html`<ul class="mini-list" style="margin-bottom:14px">${docs.map((d) => html`<li><a href="#/d/${d.number}">${d.type === "quote" ? "Quote" : "Invoice"} ${d.number}</a><span>${money(d.total)} <span class="pill ${d.status}">${DOC_STATUS[d.status]}</span></span></li>`)}</ul>` : html`<p class="muted small" style="margin-top:0">Nothing yet. Prices are filled in from your price list; you only check them and send.</p>`}
            <div class="contact-actions" style="margin-top:0"><a class="btn secondary small" href="#/new-doc/quote?ticket=${t.id}">${icon("plus")} Create quote</a><a class="btn secondary small" href="#/new-doc/invoice?ticket=${t.id}">${icon("plus")} Create invoice</a></div>
          </div>
          <div class="card"><h2>History</h2><ol class="timeline">${t.events.slice().reverse().map((e) => html`<li class="${e.type === "note" ? "note" : e.by === "customer" ? "customer" : ""}">
            <div class="meta">${when(e.at)} · ${e.by === "customer" ? "Customer" : e.by}${e.public ? "" : html`<span class="private">Only you</span>`}</div><div class="text">${e.text}</div></li>`)}</ol></div>
        </div>
        <div class="sticky"><form class="card" id="upd"><h2>Update the customer</h2>
          <div class="step-label"><span class="n">1</span>Where is this job at?</div>
          <div class="field"><select id="st" name="status" aria-label="Status">${Object.entries(STATUS).map(([k, l]) => html`<option value="${k}" ${sel(k === t.status)}>${l}</option>`)}</select></div>
          <div class="step-label"><span class="n">2</span>Book a visit <span class="hint">(optional)</span></div>
          ${a.date ? html`<div class="visit-box"><span>${a.confirmedAt ? "Customer confirmed this visit." : "Waiting for the customer to confirm."}</span><button type="button" class="link-btn danger" id="clear-visit">Cancel visit</button></div>` : ""}
          <div class="row"><div class="field"><label>Date</label><input type="date" name="date" value="${a.date || ""}"></div><div class="field"><label>Time</label><input type="time" name="time" value="${a.time || ""}"></div></div>
          <details class="more" style="margin-top:0;border:0;padding-top:0"><summary>Arrival window and visit note</summary>
            <div class="field"><label>Arrival window</label><select name="window">${WINDOWS.map((w) => html`<option value="${w}" ${sel(w === (a.window || ""))}>${w || "None"}</option>`)}</select></div>
            <div class="field"><label>Visit note <span class="hint">(the customer sees this)</span></label><input name="vnote" value="${a.note || ""}" placeholder="e.g. Please make sure the geyser is accessible"></div>
          </details>
          <div class="step-label"><span class="n">3</span>Message to the customer</div>
          <div class="chips">${QUICK_REPLIES.map(([k, l]) => html`<button type="button" class="chip" data-qr="${k}">${l}</button>`)}</div>
          <div class="field"><textarea name="message" aria-label="Message" placeholder="Tap a quick reply above, or write your own message"></textarea></div>
          <label class="check"><input type="checkbox" name="notify" ${c.email ? new Safe("checked") : new Safe("disabled")}> Email this update to the customer${c.email ? "" : " (no email address, use WhatsApp)"}</label>
          <button class="btn big block" type="submit">${icon("send")} Save update</button>
          <a class="btn green block" id="wa-send" style="margin-top:8px" target="_blank" rel="noopener" href="${waLink(c.phone, waText)}">${icon("chat")} Send on WhatsApp instead</a>
          <details class="more"><summary>More options</summary>
            <div class="field"><label>Private note <span class="hint">(only your team sees this)</span></label><textarea name="note" style="min-height:60px"></textarea></div>
            <div class="contact-actions" style="margin-top:0">
              <button type="button" class="btn secondary small" id="copy-track">Copy tracking link</button>
              <button type="button" class="btn secondary small" id="edit-cust">Edit customer details</button>
              <button type="button" class="btn secondary small" id="prio">${t.priority === "urgent" ? "Mark as normal" : "Mark as urgent"}</button>
              <button type="button" class="btn danger small" id="del">Delete job</button></div>
          </details>
        </form></div>
      </div>`);

    const form = $("#upd");
    const fill = (txt) => txt.replace("{phone}", "+27 81 440 5778")
      .replace("{date}", form.date.value ? dateLong(form.date.value) : "[date]").replace("{time}", form.time.value || form.window.value || "[time]");
    const updateWa = () => { $("#wa-send").href = waLink(c.phone, form.message.value ? `Hi ${c.name}, ${form.message.value} (Zicco Plumbers, ${t.id})` : waText); };
    // A quick reply fills in the message and moves the job to the matching step.
    $$("[data-qr]").forEach((b) => (b.onclick = () => {
      const [, , text, status] = QUICK_REPLIES.find(([k]) => k === b.dataset.qr);
      form.message.value = fill(text);
      if (status && STEPS.indexOf(status) > STEPS.indexOf(form.status.value)) form.status.value = status;
      if (b.dataset.qr === "visit" && !form.date.value) form.date.focus();
      updateWa();
    }));
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
      if (!confirm(`Delete job ${t.id} permanently? Quotes and invoices are kept.`)) return;
      await api(`tickets/${t.id}`, { method: "DELETE" });
      toast("Job deleted"); await loadLists(); location.hash = "#/tickets";
    };
    $("#edit-cust").onclick = () => modal(html`<h2>Edit customer details</h2><form id="ec">
      <div class="row"><div class="field"><label>Name</label><input name="name" value="${c.name}"></div><div class="field"><label>Surname</label><input name="surname" value="${c.surname}"></div></div>
      <div class="row"><div class="field"><label>Phone</label><input name="phone" value="${c.phone}"></div><div class="field"><label>Email</label><input name="email" type="email" value="${c.email}"></div></div>
      <div class="field"><label>Area or address</label><input name="location" value="${c.location}"></div>
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
    const isOverdue = (d) => d.status === "sent" && d.dueDate < td;
    const all = state.docs.filter((d) => d.type === type);
    const tabs = type === "quote"
      ? [["all", "All"], ["draft", "Drafts"], ["sent", "Waiting for reply"], ["accepted", "Accepted"], ["declined", "Declined"]]
      : [["all", "All"], ["draft", "Drafts"], ["sent", "Unpaid"], ["overdue", "Overdue"], ["paid", "Paid"]];
    if (!tabs.some(([k]) => k === f.status)) f.status = "all";
    const match = (d, k) => k === "all" || (k === "overdue" ? isOverdue(d) : d.status === k);
    const q = f.q.toLowerCase();
    const list = all.filter((d) => match(d, f.status) &&
      (!q || [d.number, d.clientName, d.clientCompany, d.clientEmail, d.ticketId].join(" ").toLowerCase().includes(q)));
    const title = type === "quote" ? "Quotes" : "Invoices";
    shell(type === "quote" ? "quotes" : "invoices", html`
      <div class="page-head"><div><h1>${title}</h1><p class="muted">${type === "quote" ? "Customers can accept a quote online. Turn an accepted quote into an invoice with one click." : "Invoices are emailed as a PDF with your banking details."}</p></div>
        <div class="actions"><a class="btn accent" href="#/new-doc/${type}">${icon("plus")} New ${type}</a></div></div>
      <div class="toolbar"><div class="tabs">${tabs.map(([k, l]) => html`<button class="tab ${f.status === k ? "on" : ""}" data-status="${k}">${l}<b>${all.filter((d) => match(d, k)).length}</b></button>`)}</div>
        <input class="search" type="search" placeholder="Search client or number…" value="${f.q}"></div>
      ${list.length ? html`<div class="rows">${list.map((d) => html`<a class="row-item" href="#/d/${d.number}">
          <span><strong>${d.clientName || "(no name)"}</strong><span class="sub">${d.number}${d.clientCompany ? " · " + d.clientCompany : ""}</span></span>
          <span class="hide-sm small"><span class="sub">${dateShort(d.issueDate)}</span></span>
          <span class="hide-sm small">${isOverdue(d) ? html`<span class="pill overdue">Overdue</span>` : html`<span class="muted">${type === "quote" ? "Valid until" : "Due"} ${dateShort(d.dueDate)}</span>`}</span>
          <span class="right"><span class="money">${money(d.total)}</span><br><span class="pill ${d.status}">${DOC_STATUS[d.status]}</span></span></a>`)}</div>`
        : html`<div class="empty">No ${title.toLowerCase()} here yet. <a href="#/new-doc/${type}">Create one</a>.</div>`}
      <p class="list-foot"><a href="/api/admin/export/docs.csv">Download all quotes &amp; invoices (CSV)</a></p>`);
    $$(".tab").forEach((c) => (c.onclick = () => { state.docFilter.status = c.dataset.status; history.replaceState(null, "", "#/" + type + "s"); viewDocs(type, new URLSearchParams()); }));
    const s = $(".search");
    s.oninput = () => { state.docFilter.q = s.value; const pos = s.selectionStart; viewDocs(type, new URLSearchParams()); const n = $(".search"); n.focus(); n.setSelectionRange(pos, pos); };
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
    toast(`${type === "quote" ? "Quote" : "Invoice"} ${r.doc.number} ready. Check the details, then send.`);
    location.replace(`#/d/${r.doc.number}`);
  }

  // ---------- quote / invoice editor ----------
  async function viewDoc(number) {
    const [{ doc: d, publicUrl }, settings] = await Promise.all([api(`docs/${number}`), state.settings ? Promise.resolve(state.settings) : api("settings").then((r) => (state.settings = r.settings))]);
    const isQuote = d.type === "quote";
    const label = isQuote ? "Quote" : "Invoice";
    const itemRow = (i) => html`<tr><td><textarea class="desc" rows="1" aria-label="Description">${i.description}</textarea></td><td class="qty"><input class="q" type="number" min="0" step="any" value="${i.qty}" aria-label="Quantity"></td>
      <td class="price"><input class="p" type="number" step="0.01" value="${i.unitPrice}" aria-label="Unit price"></td><td class="amt">${money(i.qty * i.unitPrice)}</td><td class="rm"><button type="button" title="Remove line">&times;</button></td></tr>`;
    const statusButtons = isQuote
      ? [["accepted", "Customer accepted", "green"], ["declined", "Customer declined", "secondary"], ["cancelled", "Cancel quote", "danger"]]
      : [["paid", "Mark as paid", "green"], ["cancelled", "Cancel invoice", "danger"]];
    shell(isQuote ? "quotes" : "invoices", html`
      <a class="back" href="#/${d.type}s">&larr; ${label}s</a>
      <div class="page-head"><div><h1>${label} ${d.number} <span class="pill ${d.status}" style="vertical-align:middle">${DOC_STATUS[d.status]}</span></h1>
        <p class="muted small">${d.ticketId ? html`For job <a href="#/t/${d.ticketId}">${d.ticketId}</a> · ` : ""}${d.fromQuote ? html`From quote <a href="#/d/${d.fromQuote}">${d.fromQuote}</a> · ` : ""}${d.convertedTo ? html`Invoiced as <a href="#/d/${d.convertedTo}">${d.convertedTo}</a> · ` : ""}Created ${when(d.createdAt)}${d.sentAt ? " · Last sent " + when(d.sentAt) : ""}</p></div></div>
      <div class="detail">
        <form class="card" id="docf">
          <div class="step-label"><span class="n">1</span>Who is it for?</div>
          <div class="row"><div class="field"><label>Client name</label><input name="name" value="${d.client.name}"></div><div class="field"><label>Email <span class="hint">(sent here)</span></label><input name="email" type="email" value="${d.client.email}"></div></div>
          <div class="row"><div class="field"><label>Phone</label><input name="phone" value="${d.client.phone}"></div><div class="field"><label>Company <span class="hint">(optional)</span></label><input name="company" value="${d.client.company}"></div></div>
          <div class="field"><label>Address</label><textarea name="address" style="min-height:56px">${d.client.address}</textarea></div>
          <div class="step-label"><span class="n">2</span>What's it for?</div>
          <table class="items"><thead><tr><th>Description</th><th>Qty</th><th>Price (R)</th><th style="text-align:right">Amount</th><th></th></tr></thead><tbody id="items">${d.items.map(itemRow)}</tbody></table>
          <div class="add-row"><select id="add-item" aria-label="Add an item"><option value="">+ Add an item…</option>
            <optgroup label="From your price list">${settings.priceList.map((p, i) => html`<option value="p${i}">${p.description} (${money(p.unitPrice)})</option>`)}</optgroup>
            <optgroup label="A set of items">${Object.keys(TEMPLATES).map((k) => html`<option value="t${k}">${k}</option>`)}</optgroup>
            <option value="blank">Blank line (type your own)</option></select></div>
          <div class="row" style="margin-top:18px;align-items:start"><div class="field"><label>VAT</label><select name="vatRate"><option value="0" ${sel(!Number(d.vatRate))}>No VAT</option><option value="15" ${sel(Number(d.vatRate) === 15)}>15% VAT</option></select></div>
            <div class="totals" id="totals"></div></div>
          <details class="more"><summary>Dates, reference and ${isQuote ? "terms" : "notes"}</summary>
            <div class="row3"><div class="field"><label>Date</label><input type="date" name="issueDate" value="${d.issueDate}"></div>
              <div class="field"><label>${isQuote ? "Valid until" : "Due date"}</label><input type="date" name="dueDate" value="${d.dueDate}"></div>
              <div class="field"><label>Reference</label><input name="reference" value="${d.reference || ""}" placeholder="${d.ticketId || ""}"></div></div>
            <div class="field"><label>${isQuote ? "Terms" : "Notes"} <span class="hint">(printed on the ${label.toLowerCase()})</span></label><textarea name="notes">${d.notes || ""}</textarea></div>
          </details>
          <p style="margin:18px 0 0"><button class="btn secondary" type="submit">Save changes</button></p>
        </form>
        <div class="sticky">
          <div class="card"><div class="step-label"><span class="n">3</span>Send it</div>
            <div class="doc-actions">
              <button class="btn accent big" id="send" type="button">${icon("send")} ${d.sentAt ? "Send again" : "Email to client"}</button>
              <a class="btn secondary" href="/api/admin/docs/${d.number}/pdf" target="_blank" rel="noopener">${icon("eye")} Preview PDF</a>
              ${d.client.phone && d.status !== "draft" ? html`<a class="btn green" target="_blank" rel="noopener" href="${waLink(d.client.phone, `Hi ${d.client.name}, here is your ${label.toLowerCase()} ${d.number} from Zicco Plumbers: ${publicUrl}`)}">${icon("chat")} Send link on WhatsApp</a>` : ""}
            </div>
            ${d.status !== "draft" ? html`<h3>Update</h3><div class="doc-actions">
              ${isQuote && !d.convertedTo ? html`<button type="button" class="btn" id="convert">Turn into invoice</button>` : ""}
              ${statusButtons.filter(([s]) => s !== d.status).map(([s, l, c]) => html`<button type="button" class="btn ${c}" data-st="${s}">${l}</button>`)}</div>` : ""}
            <div class="doc-links">
              ${d.status !== "draft" ? html`<button type="button" class="link-btn" id="copy-link">Copy client link</button><a href="${publicUrl}" target="_blank" rel="noopener">Client view</a>` : ""}
              <button type="button" class="link-btn" id="dup">Duplicate</button>
              <button type="button" class="link-btn danger" id="deldoc">Delete</button></div>
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
      $("#totals").innerHTML = html`${vat ? html`<div><span>Subtotal</span><span>${money(sub)}</span></div><div><span>VAT (${form.vatRate.value}%)</span><span>${money(vat)}</span></div>` : ""}<div class="grand"${vat ? "" : new Safe(' style="border:0;margin:0;padding:0"')}><span>Total</span><span>${money(sub + vat)}</span></div>`.s;
    };
    const addItem = (i) => { tbody.insertAdjacentHTML("beforeend", itemRow(i).s); recalc(); };
    const priceOf = (desc) => (settings.priceList.find((p) => p.description === desc) || { unitPrice: 0 }).unitPrice;
    tbody.addEventListener("input", recalc);
    tbody.addEventListener("click", (e) => { if (e.target.closest(".rm button")) { e.target.closest("tr").remove(); recalc(); } });
    form.vatRate.onchange = recalc;
    $("#add-item").onchange = (e) => {
      const v = e.target.value;
      if (v === "blank") { addItem({ description: "", qty: 1, unitPrice: 0 }); $(".desc", $$("tr", tbody).pop()).focus(); }
      else if (v[0] === "p") { const p = settings.priceList[v.slice(1)]; if (p) addItem({ description: p.description, qty: 1, unitPrice: p.unitPrice }); }
      else if (v[0] === "t") (TEMPLATES[v.slice(1)] || []).forEach((desc) => addItem({ description: desc, qty: 1, unitPrice: priceOf(desc) }));
      e.target.value = "";
    };
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
        <p class="small muted">The client gets an email with the ${label.toLowerCase()} as a PDF and a link to view it online${isQuote ? " and accept it" : ""}.${settings.notifyEmail ? ` A copy goes to ${settings.notifyEmail}.` : ""}</p>
        <div class="field"><label>To</label><input id="send-to" type="email" value="${form.email.value}"></div>
        <div class="field"><label>Message <span class="hint">(optional)</span></label><textarea id="send-msg" placeholder="e.g. Thanks for having us today. Here is the ${label.toLowerCase()} we discussed."></textarea></div>
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
    const priceRow = (p) => html`<tr><td><input class="pd" value="${p.description}" aria-label="Item"></td><td style="width:140px"><input class="pp" type="number" step="0.01" value="${p.unitPrice}" aria-label="Price"></td><td class="rm" style="width:36px"><button type="button" title="Remove">&times;</button></td></tr>`;
    const section = (ic, title, sub, body, open) => html`<details ${open ? new Safe("open") : ""}><summary><span class="ic">${icon(ic)}</span><span><strong>${title}</strong><span class="small">${sub}</span></span></summary><div class="body">${body}</div></details>`;
    shell("settings", html`
      <div class="page-head"><div><h1>Settings</h1><p class="muted">Set these once. They're used on every quote, invoice and email.</p></div></div>
      ${state.me.demoLogin && IS_DEMO ? html`<div class="banner">You're using the demo login (admin / zicco-demo).</div>` : ""}
      <form id="sf"><div class="settings">
        ${section("bell", "Emails and notifications", "Where new requests go, and a test email", html`
          ${f("notifyEmail", "Send notifications to", "(new requests, replies, accepted quotes, daily summary)", "email")}
          <p class="small muted">Email sending: <strong>${{ gmail: "Gmail (Google Sheets backend)", smtp: "Gmail / SMTP", resend: "Resend", off: "not set up yet" }[state.me.emailMode]}</strong></p>
          <div class="add-row"><input id="test-to" type="email" placeholder="you@example.com" style="flex:1 1 200px;border:1.5px solid #d5dee3;border-radius:10px;padding:8px 12px"><button type="button" class="btn secondary" id="test-email">Send test email</button></div>
          <p class="small muted" style="margin-top:14px">Every morning at 06:00, customers with a visit the next day get a reminder and you get a summary. <button type="button" class="link-btn" id="run-daily">Run it now</button></p>
          ${f("googleReviewUrl", "Google review link", "(added to the 'job done' email)")}`, true)}
        ${section("tag", "Price list", "Used to fill in quotes and invoices", html`
          <p class="small muted" style="margin-top:0">Sample prices for now. Change them to your real prices.</p>
          <table class="price-list"><tbody id="pl">${s.priceList.map(priceRow)}</tbody></table>
          <button type="button" class="btn secondary small" id="add-price-row" style="margin-top:8px">${icon("plus")} Add item</button>`)}
        ${section("building", "Business details", "Printed on quotes and invoices", html`
          ${f("businessName", "Business name")}${f("contactPerson", "Contact person")}
          <div class="row">${f("phone", "Phone")}${f("email", "Email", "", "email")}</div>
          ${ta("address", "Address")}${f("website", "Website")}${f("registration", "Registration line")}
          <div class="row">${f("vatNumber", "VAT number", "(blank if not registered)")}<div class="field"><label>Default VAT</label><select name="vatRate"><option value="0" ${sel(!Number(s.vatRate))}>No VAT</option><option value="15" ${sel(Number(s.vatRate) === 15)}>15%</option></select></div></div>`)}
        ${section("bank", "Banking details", "Printed on invoices", html`
          ${f("bankName", "Bank")}${f("accountName", "Account name")}<div class="row">${f("accountNumber", "Account number")}${f("branchCode", "Branch code")}</div>`)}
        ${section("quote", "Quote and invoice terms", "Validity, due dates and default wording", html`
          <div class="row">${f("quoteValidDays", "Quotes valid for (days)", "", "number")}${f("invoiceDueDays", "Invoices due after (days)", "", "number")}</div>
          ${ta("quoteTerms", "Default quote terms")}${ta("invoiceNotes", "Default invoice notes")}`)}
      </div>
      <div class="save-bar"><button class="btn big" type="submit">Save settings</button></div></form>`);
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
  // Refresh the home page and job list every minute so new requests show up.
  setInterval(() => {
    if (!state.me || document.hidden) return;
    const h = location.hash;
    if (h === "" || h === "#/" || h.startsWith("#/tickets")) route();
  }, 60000);
  boot();
})();
