"""Builds the Zicco Plumbers static site.  Usage: python3 -I build.py <original-site-dir> <out-dir>"""
import json, os, re, shutil, sys
from html import escape
from urllib.parse import quote
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from content import *  # noqa

SRC, OUT = sys.argv[1], sys.argv[2]
CSS_V = "9"
IMG_DIMS = {}


def wa_link(text="Hi Zicco Plumbers, I found your website and would like a quote."):
    return f"https://wa.me/{WA_NUMBER}?text={quote(text)}"


def icon(name, size=24, sw=2):
    return (f'<svg width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" '
            f'stroke-width="{sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{ICONS[name]}</svg>')


PHONE_SVG = '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M6.6 10.8a15.6 15.6 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.4.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.4c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.4 0 .8-.2 1l-2.2 2.2Z"/></svg>'
WA_SVG = '<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.3 14.2c-.2.6-1.2 1.2-1.7 1.2-.4.1-1 .1-1.6-.1-.4-.1-.9-.3-1.5-.6-2.6-1.1-4.3-3.8-4.4-4-.1-.2-1.1-1.4-1.1-2.7s.7-1.9.9-2.2c.2-.2.5-.3.7-.3h.5c.2 0 .4 0 .6.4l.8 2c.1.2.1.4 0 .6l-.4.6-.4.4c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1.1 2.2 1.4 2.5 1.5.3.1.5.1.7-.1l1-1.2c.2-.3.4-.2.7-.1l1.9.9c.3.1.5.2.6.4 0 .1 0 .7-.2 1.3Z"/></svg>'
QUOTE_SVG = icon("file", 18)
LOGO = '<svg class="brand-mark" width="42" height="42" viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="zpg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2a8fb0"/><stop offset="1" stop-color="#0e3442"/></linearGradient></defs><rect width="64" height="64" rx="16" fill="url(#zpg)"/><path d="M32 13c6 8 10 13.5 10 18.5a10 10 0 0 1-20 0C22 26.5 26 21 32 13z" fill="#f2a93b"/><text x="32" y="56" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="13" font-weight="800" text-anchor="middle" fill="#fff" letter-spacing="1">ZP</text></svg>'


def btn_call(label=None, cls="btn-big"):
    return f'<a class="btn btn-call {cls}" href="tel:{PHONE_TEL}">{PHONE_SVG} {label or "Call " + PHONE_DISPLAY}</a>'


def btn_wa(text=None, label="WhatsApp us", cls="btn-big"):
    return f'<a class="btn btn-wa {cls}" href="{escape(wa_link(text) if text else wa_link())}" rel="noopener">{WA_SVG} {label}</a>'


def btn_quote(label="Request a quote", cls="btn-big", href="/quote/"):
    return f'<a class="btn btn-quote {cls}" href="{href}">{QUOTE_SVG} {label}</a>'


# ---------- images ----------
def prepare_images():
    os.makedirs(f"{OUT}/images", exist_ok=True)
    for key, (fname, _) in IMAGES.items():
        src = f"{SRC}/images/{fname}"
        shutil.copy2(src, f"{OUT}/images/{fname}")
        im = Image.open(src).convert("RGB")
        IMG_DIMS[key] = im.size
        stem = fname.rsplit(".", 1)[0]
        for w in (480, 960, 1600):
            if w > im.width and w != 480:
                continue
            ww = min(w, im.width)
            h = round(im.height * ww / im.width)
            im.resize((ww, h), Image.LANCZOS).save(f"{OUT}/images/{stem}-{w}.webp", "WEBP", quality=74, method=6)


def pic(key, sizes="(min-width: 760px) 33vw, 50vw", lazy=True, cls="", alt=None):
    fname, default_alt = IMAGES[key]
    stem = fname.rsplit(".", 1)[0]
    w, h = IMG_DIMS[key]
    widths = [x for x in (480, 960, 1600) if x <= w or x == 480]
    srcset = ", ".join(f"/images/{stem}-{x}.webp {min(x, w)}w" for x in widths)
    load = 'loading="lazy" decoding="async"' if lazy else 'fetchpriority="high" decoding="async"'
    a = default_alt if alt is None else alt
    c = f' class="{cls}"' if cls else ""
    return (f'<picture{c}><source type="image/webp" srcset="{srcset}" sizes="{sizes}">'
            f'<img src="/images/{fname}" width="{w}" height="{h}" alt="{escape(a)}" {load}></picture>')


# ---------- layout ----------
NAV = [("/services/", "Services"), ("/areas/", "Areas"), ("/projects/", "Projects"), ("/about/", "About"), ("/faq/", "FAQ"), ("/contact/", "Contact")]


CHEVRON = '<svg class="chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>'


def header(path):
    cur = lambda h: ' aria-current="page"' if path.startswith(h) else ""
    svc_links = "".join(f'<a href="/services/{x["slug"]}/"{cur(f"/services/{x["slug"]}/")}>{icon(x["icon"], 18)}<span>{x["name"]}</span></a>' for x in SERVICES)
    dropdown = (f'<div class="nav-dd"><button type="button" class="nav-dd-btn" aria-expanded="false" aria-controls="services-menu"{cur("/services/")}>Services {CHEVRON}</button>'
                f'<div class="nav-dd-panel" id="services-menu">{svc_links}</div></div>')
    home = f'<a href="/"{" aria-current=\"page\"" if path == "/" else ""}>Home</a>'
    links = home + dropdown + "".join(f'<a href="{h}"{cur(h)}>{t}</a>' for h, t in NAV if h != "/services/")
    mobile_svc = "".join(f'<a href="/services/{x["slug"]}/">{x["name"]}</a>' for x in SERVICES)
    mobile = ('<a href="/">Home</a>' + f'<details class="menu-sub"><summary>Services {CHEVRON}</summary><div>{mobile_svc}</div></details>'
              + "".join(f'<a href="{h}">{t}</a>' for h, t in NAV if h != "/services/"))
    return f"""<a class="skip" href="#main">Skip to content</a>
<header class="site-header">
  <div class="wrap header-row">
    <a class="brand" href="/">{LOGO}<span>{NAME}<small>PIRB registered &middot; Johannesburg</small></span></a>
    <nav class="nav" aria-label="Main">{links}</nav>
    <details class="menu"><summary aria-label="Open menu">{icon("menu", 20)} Menu</summary>
      <nav class="menu-panel" aria-label="Mobile">{mobile}{btn_quote("Request a quote", "")}</nav>
    </details>
  </div>
</header>"""


def footer():
    links = "".join(f'<a href="{h}">{t}</a>' for h, t in [("/", "Home")] + NAV)
    return f"""<footer class="site-footer">
  <div class="wrap footer-main">
    <div class="footer-id">
      <a class="footer-brand" href="/">{NAME}</a>
      <p>PIRB company no. {PIRB_NO} &middot; Licensed plumber {LICENCE_NO} &middot; Based in Braamfontein, Johannesburg</p>
    </div>
    <nav class="footer-links" aria-label="Footer">{links}</nav>
  </div>
  <div class="wrap legal">
    <span>&copy; 2026 {NAME}</span>
    <span><a href="/privacy/">Privacy</a> &middot; <a href="/sitemap.xml">Sitemap</a> &middot; <a href="https://www.plumberfinder.co.za/plumbers/zicco-plumbers-3315b48d" rel="noopener" target="_blank">Listed on PlumberFinder</a></span>
  </div>
</footer>
<div class="sticky-contact" role="group" aria-label="Contact {NAME}">
  <a class="btn btn-call" href="tel:{PHONE_TEL}">{PHONE_SVG} <span>Call</span></a>
  <a class="btn btn-wa" href="{escape(wa_link())}" rel="noopener">{WA_SVG} <span>WhatsApp</span></a>
</div>"""


BUSINESS_ID = f"{SITE}/#business"


def business_schema():
    return {
        "@context": "https://schema.org",
        "@type": "Plumber",
        "@id": BUSINESS_ID,
        "name": NAME,
        "url": SITE + "/",
        "telephone": PHONE_TEL,
        "image": SITE + "/og.jpg",
        "logo": SITE + "/favicon.svg",
        "address": {"@type": "PostalAddress", "addressLocality": "Braamfontein",
                    "addressRegion": "Gauteng", "addressCountry": "ZA"},
        "areaServed": [{"@type": "Place", "name": a["name"]} for a in AREAS],
        "hasCredential": [
            {"@type": "EducationalOccupationalCredential", "credentialCategory": "PIRB registered company", "identifier": PIRB_NO},
            {"@type": "EducationalOccupationalCredential", "credentialCategory": "Licensed Plumber", "identifier": LICENCE_NO},
        ],
        "hasOfferCatalog": {"@type": "OfferCatalog", "name": "Plumbing services",
                            "itemListElement": [{"@type": "Offer", "itemOffered": {"@type": "Service", "name": s["name"], "url": f"{SITE}/services/{s['slug']}/"}} for s in SERVICES]},
        "sameAs": ["https://www.plumberfinder.co.za/plumbers/zicco-plumbers-3315b48d"],
    }


def breadcrumb_schema(trail):
    return {"@context": "https://schema.org", "@type": "BreadcrumbList",
            "itemListElement": [{"@type": "ListItem", "position": i + 1, "name": n, "item": SITE + p} for i, (n, p) in enumerate(trail)]}


def faq_schema(faqs):
    import re
    return {"@context": "https://schema.org", "@type": "FAQPage",
            "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": re.sub("<[^>]+>", "", a)}} for q, a in faqs]}


def crumbs_html(trail):
    items = []
    for i, (n, p) in enumerate(trail):
        items.append(f"<li>{n}</li>" if i == len(trail) - 1 else f'<li><a href="{p}">{n}</a></li>')
    return f'<nav class="crumbs" aria-label="Breadcrumb"><ol>{"".join(items)}</ol></nav>'


def page(path, title, desc, body, schemas=(), noindex=False, og_image="/og.jpg", quote_href="/quote/"):
    url = SITE + path
    ld = "".join(f'<script type="application/ld+json">{json.dumps(s, ensure_ascii=False)}</script>\n' for s in schemas)
    robots = '<meta name="robots" content="noindex">\n' if noindex else ""
    html = f"""<!DOCTYPE html>
<html lang="en-ZA">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{escape(title)}</title>
<meta name="description" content="{escape(desc)}">
{robots}<link rel="canonical" href="{url}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="{NAME}">
<meta property="og:locale" content="en_ZA">
<meta property="og:url" content="{url}">
<meta property="og:title" content="{escape(title)}">
<meta property="og:description" content="{escape(desc)}">
<meta property="og:image" content="{SITE}{og_image}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#133c4b">
<meta name="format-detection" content="telephone=no">
<script>document.documentElement.classList.add("js");setTimeout(function(){{document.querySelectorAll(".reveal").forEach(function(e){{e.classList.add("in")}})}},4000)</script>
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap">
<link rel="stylesheet" href="/styles.css?v={CSS_V}">
<!-- Google Analytics 4: paste the gtag.js snippet from analytics.google.com here (see README.md). Call, WhatsApp and form events are sent automatically by /js/site.js. -->
{ld}<script src="/js/site.js?v={CSS_V}" defer></script>
</head>
<body>
{header(path)}
<main id="main">
{body}
</main>
{footer()}
</body>
</html>
"""
    out = f"{OUT}{path}index.html" if path.endswith("/") else f"{OUT}{path}"
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "w", encoding="utf-8") as f:
        f.write(html)


# ---------- shared blocks ----------
def quote_form(heading="Send us a message", intro=None, preselect=None, h_tag="h2", fixed=None):
    intro = intro or "Tell us what you need and where you are. We'll get back to you with the next steps and a quote."
    boxes = "".join(
        f'<label class="consent"><input type="checkbox" name="services[]" value="{escape(s)}"{" checked" if s == preselect else ""}> {escape(s)}</label>'
        for s in FORM_SERVICES)
    if fixed:  # (form value, display name, icon): this form is only for one service
        services_html = (f'<input type="hidden" name="services[]" value="{escape(fixed[0])}">'
                         f'<div class="field span-2"><span class="field-label">Service</span><div class="fixed-service">{icon(fixed[2], 20)}<span>{escape(fixed[1])}</span></div></div>')
    else:
        services_html = f"""<fieldset class="field span-2" style="border:0;padding:0;margin:0">
        <legend>Which service do you require? <span class="req">*</span></legend>
        <div class="form-grid cols-2" style="margin-top:6px;gap:6px 14px">{boxes}</div>
        <p class="small service-error" role="alert" hidden style="color:#b42318;margin:6px 0 0">Please choose at least one service.</p>
      </fieldset>"""
    return f"""<div class="form-card" id="quote">
  <{h_tag}>{heading}</{h_tag}>
  <p class="muted">{intro}</p>
  <form name="quote" method="POST" action="/api/tickets" enctype="multipart/form-data" class="quote-form">
    <input type="hidden" name="page" value="">
    <p class="hidden-field"><label>Leave this empty <input name="company_website" tabindex="-1" autocomplete="off"></label></p>
    <div class="form-grid cols-2">
      <div class="field"><label for="f-name">Name <span class="req">*</span></label><input id="f-name" name="name" autocomplete="given-name" required></div>
      <div class="field"><label for="f-surname">Surname <span class="req">*</span></label><input id="f-surname" name="surname" autocomplete="family-name" required></div>
      <div class="field"><label for="f-email">Email address <span class="hint">(for updates on your request)</span></label><input id="f-email" type="email" name="email" autocomplete="email"></div>
      <div class="field"><label for="f-phone">Contact number <span class="req">*</span></label><input id="f-phone" type="tel" name="phone" autocomplete="tel" inputmode="tel" required></div>
      {services_html}
      <div class="field span-2"><label for="f-where">Where are you situated? <span class="req">*</span></label><input id="f-where" name="location" placeholder="Suburb or address, e.g. Sandton" autocomplete="street-address" required></div>
      <div class="field span-2"><label for="f-msg">Tell us about the job <span class="hint">(optional)</span></label><textarea id="f-msg" name="message" placeholder="What's the problem, or what needs to be installed?"></textarea></div>
      <div class="field span-2"><label for="f-photo">Add a photo <span class="hint">(optional)</span></label><input id="f-photo" type="file" name="photo" accept="image/*"></div>
      <label class="consent span-2"><input type="checkbox" name="consent" value="yes" required> <span>I agree that {NAME} may use these details to contact me about my request, as described in the <a href="/privacy/">privacy policy</a>. <span class="req">*</span></span></label>
      <div class="span-2"><button class="btn btn-call btn-big" type="submit">Submit</button><p class="small form-status" role="status" hidden style="margin:10px 0 0"></p></div>
    </div>
  </form>
  <p class="form-alt">Prefer WhatsApp? <a href="{escape(wa_link())}" rel="noopener">Message us on {PHONE_DISPLAY}</a></p>
</div>"""


def licence_chips():
    return "".join(f'<li>{icon(ic, 16)}<span>{name}</span></li>' for name, ic, _ in LICENSED_DETAIL) + \
        f'<li class="spec">{icon("jet", 16)}<span>{LICENSED_SPECIALISATION} (specialisation)</span></li>'


def trust_card():
    return f"""<a class="plumber-card" href="{PROFILE_PATH}">
  <div class="pc-top">
    <span class="pc-avatar" aria-hidden="true">{icon("shield", 28)}</span>
    <div><span class="pc-badge">{icon("shield", 14)} PIRB registered</span><strong class="pc-name">Our licensed plumber</strong><span class="pc-role">PIRB licence {LICENCE_NO} &middot; Company no. {PIRB_NO}</span></div>
  </div>
  <p class="pc-label">Licensed to issue plumbing COCs for</p>
  <ul class="pc-chips">{licence_chips()}</ul>
  <span class="pc-cta">View licence &amp; profile &rarr;</span>
</a>"""


def service_cards(services=None):
    services = services or SERVICES
    return '<div class="grid grid-3">' + "".join(
        f'<a class="card service-card reveal" href="/services/{s["slug"]}/"><div class="body">'
        f'<span class="icon-blob c{n % 6 + 1}">{icon(s["icon"])}</span>'
        f'<h3>{s["name"]}</h3><p>{s["card"]}</p><span class="more">Learn more &rarr;</span></div></a>'
        for n, s in enumerate(services)) + "</div>"


def cta_band(title="Need a plumber in Johannesburg?", text=None):
    text = text or f"Call or WhatsApp {PHONE_DISPLAY}, or send us the details online."
    return f"""<section class="section"><div class="wrap"><div class="cta-band reveal">
  <div><h2>{title}</h2><p>{text}</p></div>
  <div class="cta-row">{btn_quote()}</div>
</div></div></section>"""


def faq_html(faqs):
    return '<div class="faq">' + "".join(f'<details><summary>{q}</summary><div class="answer"><p>{a}</p></div></details>' for q, a in faqs) + "</div>"


def area_links():
    return '<ul class="area-list">' + "".join(f'<li><a href="/areas/{a["slug"]}/">{a["name"]}</a></li>' for a in AREAS) + "</ul>"


def page_hero(trail, h1, lead, **_):
    return f"""<section class="hero page-hero">
  <div class="wrap hero-inner" style="grid-template-columns:1fr">
    <div>{crumbs_html(trail)}<h1>{h1}</h1><p class="lead">{lead}</p></div>
  </div>
</section>"""


def aside(wa_text=None, related=None, quote_href="/quote/"):
    rel = ""
    if related:
        rel = '<div class="aside-card"><h2>Related services</h2><ul class="aside-links">' + "".join(
            f'<li><a href="/services/{r}/">{SERVICE_BY_SLUG[r]["name"]}</a></li>' for r in related) + '<li><a href="/services/">All services &rarr;</a></li></ul></div>'
    return f"""<aside><div class="aside-sticky">
  <div class="aside-card"><h2>Get a quote</h2><p class="muted small">Send a photo of the problem on WhatsApp for the quickest answer.</p>
    {btn_quote("Request a quote online", "", quote_href)}</div>
  <div class="aside-card"><h2>Registered &amp; licensed</h2><ul class="check-list small" style="margin:0"><li>PIRB company no. {PIRB_NO}</li><li>Licensed plumber, licence {LICENCE_NO}</li><li>Can sign plumbing COCs</li></ul></div>
  {rel}
</div></aside>"""


# ---------- pages ----------
def build_home():
    gallery_keys = ["booster", "heatpump", "slab", "geyser", "shower", "stack"]
    gallery = '<div class="gallery">' + "".join(
        f'<figure class="reveal">{pic(k)}<figcaption>{CAPTIONS[k]}</figcaption></figure>' for k in gallery_keys) + "</div>"
    audiences = [
        ("users", "Homeowners & tenants", "Geysers, leaks, blocked drains and repairs, with a COC where it's needed."),
        ("crane", "Contractors & developers", "Complete plumbing installations on new construction sites and high-rise buildings."),
        ("building", "Building owners & body corporates", "Booster pumps, drainage stacks, leak detection and ongoing maintenance."),
        ("home", "Student accommodation", "Metered showers, heat pumps and reliable plumbing for heavily used bathrooms."),
    ]
    aud = '<div class="grid grid-4">' + "".join(
        f'<div class="card audience reveal"><h3><span class="icon-blob c{n % 6 + 1}">{icon(i)}</span> {t}</h3><p>{d}</p></div>' for n, (i, t, d) in enumerate(audiences)) + "</div>"
    body = f"""<section class="hero">
  <div class="hero-bg">{pic("hero", "100vw", lazy=False, alt="")}</div>
  <div class="wrap hero-inner">
    <div>
      <p class="eyebrow">PIRB-registered plumbers &middot; Johannesburg</p>
      <h1>Reliable plumbing, <span class="hl">done right</span> the first time.</h1>
      <p class="lead">{NAME} clears blocked drains, finds hidden leaks, installs geysers and heat pumps, and delivers complete plumbing for new and high-rise buildings across Johannesburg.</p>
      <div class="cta-row">{btn_quote()}</div>
      <ul class="chips"><li>{icon("shield", 18)} PIRB registered company</li><li>{icon("id", 18)} Licensed plumber</li><li>{icon("file", 18)} COC issued</li></ul>
    </div>
    <div class="hero-card">
      <h2>Get your plumbing sorted</h2>
      <ol>
        <li><span><strong>Tell us about the job.</strong> Call, WhatsApp or use the form, and add a photo if you can.</span></li>
        <li><span><strong>Get a clear quote.</strong> We explain what's needed and what it will cost.</span></li>
        <li><span><strong>Job done properly.</strong> Work by a licensed plumber, with a COC where required.</span></li>
      </ol>
    </div>
  </div>
</section>

<section class="trustbar" aria-label="Credentials"><div class="wrap"><ul>
  <li>{icon("shield")}<div>PIRB registered<span>Company no. {PIRB_NO}</span></div></li>
  <li>{icon("id")}<div>Licensed plumber<span>Licence {LICENCE_NO}</span></div></li>
  <li>{icon("file")}<div>Plumbing COCs<span>Signed by our licensed plumber</span></div></li>
  <li>{icon("pin")}<div>Johannesburg based<span>Braamfontein</span></div></li>
</ul></div></section>

<section id="services" class="section">
  <div class="wrap">
    <div class="section-head reveal"><p class="eyebrow">Services</p><h2>Plumbing services in Johannesburg</h2>
    <p>From a blocked drain at home to the full plumbing installation in a new high-rise, one registered plumbing company handles it.</p></div>
    {service_cards()}
  </div>
</section>

<section class="section section-alt">
  <div class="wrap">
    <div class="section-head reveal"><p class="eyebrow">Who we work with</p><h2>Plumbing for homes, buildings and construction sites</h2></div>
    {aud}
  </div>
</section>

<section class="section section-dark">
  <div class="wrap">
    <div class="section-head reveal"><p class="eyebrow" style="color:var(--accent)">How it works</p><h2>Three simple steps</h2></div>
    <ol class="steps">
      <li><h3>Send us the details</h3><p>Use the form, WhatsApp or a phone call. Photos of the problem help us quote accurately.</p></li>
      <li><h3>Get a quote</h3><p>We explain what needs to be done and what it will cost before any work starts.</p></li>
      <li><h3>Work done &amp; certified</h3><p>A licensed plumber does the job, and a plumbing COC is issued where it's required.</p></li>
    </ol>
  </div>
</section>

<section id="gallery" class="section">
  <div class="wrap">
    <div class="section-head reveal"><p class="eyebrow">Our work</p><h2>Recent plumbing projects</h2><p>Booster pumps, heat pumps, new building drainage, geysers and bathrooms.</p></div>
    {gallery}
    <p style="margin-top:20px"><a class="btn btn-ghost" href="/projects/">See all projects &rarr;</a></p>
  </div>
</section>

<section id="about" class="section section-alt">
  <div class="wrap two-col">
    <div>
      <p class="eyebrow">About us</p>
      <h2>About {NAME}</h2>
      <p>{NAME} is a plumbing company based in Braamfontein, Johannesburg. We install plumbing on new construction sites and in high-rise buildings, fit hot water heat pumps, geysers, water booster pumps and metered showers, and handle drains, leaks and repairs for homes and buildings.</p>
      <p>We're a PIRB-registered company with a licensed plumber who can sign Certificates of Compliance, so your work is done to standard and certified.</p>
      <p><a href="/about/">More about us &rarr;</a></p>
    </div>
    {trust_card()}
  </div>
</section>

<section id="areas" class="section">
  <div class="wrap">
    <div class="section-head reveal"><p class="eyebrow">Areas served</p><h2>Plumber across Johannesburg</h2><p>Based in Braamfontein, we work throughout Johannesburg, including:</p></div>
    {area_links()}
  </div>
</section>

<section class="section section-alt">
  <div class="wrap narrow">
    <div class="section-head reveal"><p class="eyebrow">FAQ</p><h2>Frequently asked questions</h2></div>
    {faq_html(HOME_FAQS)}
    <p style="margin-top:18px"><a href="/faq/">More questions &rarr;</a></p>
  </div>
</section>

<section id="contact" class="section">
  <div class="wrap two-col">
    <div>
      <p class="eyebrow">Contact</p>
      <h2>Request a quote</h2>
      <p>Call or send a WhatsApp message, or fill in the form and we'll get back to you.</p>
      <dl class="details"><dt>Based in</dt><dd>{AREA}</dd><dt>Phone &amp; WhatsApp</dt><dd><a href="tel:{PHONE_TEL}">{PHONE_DISPLAY}</a></dd></dl>
    </div>
    {quote_form()}
  </div>
</section>"""
    page("/", "Plumber Johannesburg | Drains, Leaks, Geysers & Heat Pumps | Zicco Plumbers",
         f"PIRB-registered plumber in Johannesburg. Blocked drains, leak detection, geysers, heat pumps, water jetting and new building plumbing. COC issued. Call or WhatsApp {PHONE_DISPLAY}.",
         body, [business_schema(), faq_schema(HOME_FAQS)])


def build_services_index():
    groups = [
        ("Drains & leaks", ["blocked-drains-drain-cleaning", "high-pressure-water-jetting", "drain-camera-inspection", "leak-detection"]),
        ("Drainage installations", ["above-ground-drainage", "below-ground-drainage", "rainwater-drainage", "subsoil-drainage"]),
        ("Water supply, hot water & repairs", ["cold-water-installations", "geyser-heat-pump-installation", "plumbing-maintenance-repairs", "plumbing-coc-certificates"]),
        ("New buildings & high-rise", ["new-building-plumbing-installations", "water-booster-pumps", "metered-showers"]),
    ]
    sections = "".join(
        f'<section class="section{" section-alt" if i % 2 else ""}"><div class="wrap"><h2>{g}</h2>{service_cards([SERVICE_BY_SLUG[s] for s in slugs])}</div></section>'
        for i, (g, slugs) in enumerate(groups))
    trail = [("Home", "/"), ("Services", "/services/")]
    body = page_hero(trail, "Plumbing services in Johannesburg",
                     f"Everything {NAME} does, from blocked drains and leak detection to geysers, heat pumps and complete plumbing for new buildings.") + sections + cta_band()
    page("/services/", "Plumbing Services Johannesburg | Zicco Plumbers",
         "All plumbing services from Zicco Plumbers in Johannesburg: blocked drains, water jetting, drain cameras, leak detection, drainage, geysers, heat pumps, booster pumps and new builds.",
         body, [breadcrumb_schema(trail)])


SERVICE_LINK = re.compile(r'<a href="/services/[^"]*">(.*?)</a>')


def unlink_services(html):
    """Turn links to other service pages into plain text, so a service page is only about that service."""
    return SERVICE_LINK.sub(r"\1", html)


def build_service(s):
    path = f"/services/{s['slug']}/"
    trail = [("Home", "/"), ("Services", "/services/"), (s["name"], path)]
    wa_text = f"Hi Zicco Plumbers, I'd like a quote for {s['name'].lower()}."
    form_value = {
        "plumbing-maintenance-repairs": "Plumbing service / maintenance", "blocked-drains-drain-cleaning": "Drains (blocked drain, drain cleaning)",
        "leak-detection": "Leak detection", "subsoil-drainage": "Subsoil drainage", "high-pressure-water-jetting": "Water jetting",
        "geyser-heat-pump-installation": "Heat pumps / Geysers", "drain-camera-inspection": "Drain camera",
        "new-building-plumbing-installations": "New building plumbing installation", "water-booster-pumps": "Water booster pump",
        "metered-showers": "Metered showers", "plumbing-coc-certificates": "Plumbing COC",
        "above-ground-drainage": "Above-ground drainage", "below-ground-drainage": "Below-ground drainage",
        "rainwater-drainage": "Rainwater drainage", "cold-water-installations": "Cold water installation"}[s["slug"]]
    # Keep the page about this one service: mentions of other services stay as plain text, not links.
    secs = "".join(f"<h2>{h}</h2>{unlink_services(html)}" for h, html in s["sections"])
    fig = f'<figure class="figure-wide">{pic(s["img"], "(min-width: 980px) 720px, 100vw")}</figure>' if s.get("img") else ""
    areas = ", ".join(f'<a href="/areas/{a["slug"]}/">{a["name"]}</a>' for a in AREAS)
    body = page_hero(trail, s["h1"], s["lead"], wa_text=wa_text, quote_href="#quote") + f"""
<section class="section"><div class="wrap content-grid">
  <article class="prose">
    {fig}{secs}
    <h2>Areas we cover</h2><p>We're based in Braamfontein and work across Johannesburg, including {areas}.</p>
    <h2>Questions about {s["name"].lower()}</h2>{faq_html(s["faqs"])}
    <div style="margin-top:40px">{quote_form(f"Request a quote for {s['name'].lower()}", f"Tell us about your {s['name'].lower()} job and we'll get back to you.", fixed=(form_value, s["name"], s["icon"]))}</div>
  </article>
  {aside(wa_text, quote_href="#quote")}
</div></section>"""
    schema = {"@context": "https://schema.org", "@type": "Service", "name": s["name"], "serviceType": s["name"],
              "description": s["desc"], "url": SITE + path, "provider": {"@id": BUSINESS_ID},
              "areaServed": [{"@type": "Place", "name": a["name"]} for a in AREAS]}
    page(path, s["title"], s["desc"], body, [business_schema(), schema, breadcrumb_schema(trail), faq_schema(s["faqs"])],
         quote_href="#quote")


def build_areas_index():
    trail = [("Home", "/"), ("Areas", "/areas/")]
    cards = '<div class="grid grid-3">' + "".join(
        f'<a class="card service-card" href="/areas/{a["slug"]}/"><div class="body"><span style="color:var(--brand)">{icon("pin")}</span><h3>Plumber in {a["name"]}</h3><p>{a["intro"][0][:150].rsplit(" ", 1)[0]}&hellip;</p><span class="more">View area &rarr;</span></div></a>'
        for a in AREAS) + "</div>"
    body = page_hero(trail, "Areas we serve in Johannesburg",
                     f"{NAME} is based in Braamfontein and works across Johannesburg.") + f'<section class="section"><div class="wrap">{cards}</div></section>' + cta_band()
    page("/areas/", "Areas Served | Plumber in Johannesburg, Sandton, Randburg, Midrand | Zicco Plumbers",
         "Zicco Plumbers serves Braamfontein, Johannesburg CBD, Sandton, Randburg, Fourways and Midrand. PIRB-registered plumber. Call or WhatsApp +27 81 440 5778.",
         body, [breadcrumb_schema(trail)])


def build_area(a):
    path = f"/areas/{a['slug']}/"
    trail = [("Home", "/"), ("Areas", "/areas/"), (a["name"], path)]
    wa_text = f"Hi Zicco Plumbers, I need a plumber in {a['name']}."
    intro = "".join(f"<p>{p}</p>" for p in a["intro"])
    focus = [SERVICE_BY_SLUG[s] for s in a["focus"]]
    others = ", ".join(f'<a href="/areas/{o["slug"]}/">{o["name"]}</a>' for o in AREAS if o is not a)
    body = page_hero(trail, f"Plumber in {a['name']}",
                     f"PIRB-registered plumbing company serving {a['name']}: drains, leaks, geysers, heat pumps and building plumbing.",
                     wa_text=wa_text) + f"""
<section class="section"><div class="wrap content-grid">
  <article class="prose">
    <h2>Plumbing services in {a["name"]}</h2>{intro}
    <h2>Popular services in {a["name"]}</h2>
  </article>
  {aside(wa_text)}
</div>
<div class="wrap" style="margin-top:8px">{service_cards(focus)}<p style="margin-top:18px"><a href="/services/">See all our services &rarr;</a></p></div>
</section>
<section class="section section-alt"><div class="wrap two-col">
  <div><h2>Registered and licensed</h2><p>{NAME} is a PIRB-registered plumbing company (no. {PIRB_NO}) with a licensed plumber (licence {LICENCE_NO}) who can sign plumbing Certificates of Compliance for work in {a["name"]}.</p>
  <p>We also work in {others}.</p></div>
  {quote_form("Request a quote", f"Need a plumber in {a['name']}? Send us the details.")}
</div></section>"""
    page(path, f"Plumber in {a['name']} | Zicco Plumbers, PIRB Registered",
         f"Need a plumber in {a['name']}? Zicco Plumbers: blocked drains, leak detection, geysers, heat pumps and building plumbing. PIRB registered, COC issued. Call {PHONE_DISPLAY}.",
         body, [business_schema(), breadcrumb_schema(trail)])


def build_projects():
    trail = [("Home", "/"), ("Projects", "/projects/")]
    gallery = '<div class="gallery">' + "".join(
        f'<figure class="reveal">{pic(k)}<figcaption>{CAPTIONS[k]}</figcaption></figure>' for k in IMAGES if k != "hero") + "</div>"
    body = page_hero(trail, "Our plumbing projects",
                     "A selection of work by Zicco Plumbers: booster pumps, heat pumps and geysers, new building drainage, water supply and bathrooms.") + \
        f'<section class="section"><div class="wrap">{gallery}</div></section>' + cta_band("Have a project in mind?", "Send us the drawings or a description of the job and we'll quote.")
    page("/projects/", "Plumbing Projects & Gallery | Zicco Plumbers Johannesburg",
         "Photos of plumbing work by Zicco Plumbers in Johannesburg: booster pumps, heat pumps, geysers, new building drainage and bathrooms.",
         body, [breadcrumb_schema(trail)])


def build_about():
    trail = [("Home", "/"), ("About", "/about/")]
    body = page_hero(trail, f"About {NAME}", "A registered, licensed plumbing company based in Braamfontein, Johannesburg.") + f"""
<section class="section"><div class="wrap two-col">
  <div class="prose">
    <h2>Who we are</h2>
    <p>{NAME} is a plumbing company based in {AREA}. We install plumbing on new construction sites and in high-rise buildings, and fit hot water heat pumps, geysers, water booster pumps and metered showers. We also clear blocked drains, carry out water jetting and drain camera inspections, find leaks, install subsoil drainage and handle plumbing repairs and maintenance.</p>
    <p>Call or WhatsApp {PHONE_DISPLAY} to talk about your job.</p>
    <h2>What you can expect</h2>
    <ul class="check-list"><li>A PIRB-registered company (no. {PIRB_NO})</li><li>A licensed plumber (licence {LICENCE_NO}) who can sign plumbing COCs</li><li>Experience on construction sites and in high-rise buildings</li><li>A quote before work starts</li></ul>
    <h2>Who we work for</h2>
    <p>Homeowners and tenants, contractors and developers, building owners and body corporates, and student accommodation providers across Johannesburg, including <a href="/areas/sandton/">Sandton</a>, <a href="/areas/randburg/">Randburg</a>, <a href="/areas/fourways/">Fourways</a>, <a href="/areas/midrand/">Midrand</a>, the <a href="/areas/johannesburg-cbd/">Johannesburg CBD</a> and <a href="/areas/braamfontein/">Braamfontein</a>.</p>
  </div>
  <div>{trust_card()}<figure class="figure-wide" style="margin-top:20px">{pic("heatpump", "(min-width: 760px) 45vw, 100vw")}</figure></div>
</div></section>""" + cta_band()
    page("/about/", "About Zicco Plumbers | PIRB Registered Plumber in Braamfontein, Johannesburg",
         f"About Zicco Plumbers: PIRB-registered company no. {PIRB_NO}, licensed plumber {LICENCE_NO}, based in Braamfontein. Plumbing for homes, buildings and construction sites.",
         body, [business_schema(), breadcrumb_schema(trail)])


def build_faq():
    trail = [("Home", "/"), ("FAQ", "/faq/")]
    faqs = HOME_FAQS + EXTRA_FAQS
    body = page_hero(trail, "Plumbing questions & answers", f"Answers to common questions about {NAME} and plumbing in Johannesburg.") + \
        f'<section class="section"><div class="wrap narrow">{faq_html(faqs)}</div></section>' + cta_band("Still have a question?", f"Call or WhatsApp {PHONE_DISPLAY}.")
    page("/faq/", "Plumbing FAQ | Zicco Plumbers Johannesburg",
         "Answers about plumbing COCs, burst geysers, leaks, blocked drains, heat pumps and getting a quote from Zicco Plumbers in Johannesburg.",
         body, [breadcrumb_schema(trail), faq_schema(faqs)])


def build_contact():
    trail = [("Home", "/"), ("Contact", "/contact/")]
    body = page_hero(trail, f"Contact {NAME}", f"Call or WhatsApp {PHONE_DISPLAY}, or send us a message below.") + f"""
<section class="section"><div class="wrap two-col">
  <div>
    <h2>Get in touch</h2>
    <dl class="details"><dt>Phone &amp; WhatsApp</dt><dd><a href="tel:{PHONE_TEL}">{PHONE_DISPLAY}</a></dd><dt>Licensed plumber</dt><dd><a href="{PROFILE_PATH}">View licence &amp; profile</a></dd><dt>Based in</dt><dd>{AREA}</dd><dt>Registration</dt><dd>PIRB company no. {PIRB_NO} &middot; Licence {LICENCE_NO}</dd></dl>
  </div>
  {quote_form()}
</div></section>"""
    page("/contact/", "Contact Zicco Plumbers | Plumber in Braamfontein, Johannesburg",
         f"Contact Zicco Plumbers: call or WhatsApp {PHONE_DISPLAY}. Based in {AREA}, working across Johannesburg.", body, [business_schema(), breadcrumb_schema(trail)])


def build_profile():
    path = PROFILE_PATH
    trail = [("Home", "/"), ("About", "/about/"), (CONTACT_PERSON, path)]
    initials = "".join(w[0] for w in CONTACT_PERSON.split()[:2])
    cats = "".join(
        f'<li><a href="/services/{slug}/">{icon(ic, 20)}<span>{name}</span></a></li>' for name, ic, slug in LICENSED_DETAIL)
    body = page_hero(trail, CONTACT_PERSON, f"Licensed plumber at {NAME}, registered with the PIRB (Plumbing Industry Registration Board).") + f"""
<section class="section"><div class="wrap content-grid">
  <article>
    <div class="licence">
      <div class="lc-head">
        <span class="lc-avatar" aria-hidden="true">{initials}</span>
        <div><span class="lc-kicker">PIRB licensed plumber</span><h2>{CONTACT_PERSON}</h2><span class="lc-verified">{icon("shield", 15)} Licence {LICENCE_NO}</span></div>
      </div>
      <dl class="lc-facts">
        <div><dt>Licence number</dt><dd>{LICENCE_NO}</dd></div>
        <div><dt>Current employer</dt><dd>{NAME}</dd></div>
        <div><dt>Company registration</dt><dd>PIRB company no. {PIRB_NO}</dd></div>
        <div><dt>Certificates of Compliance</dt><dd>Can sign plumbing COCs</dd></div>
      </dl>
      <h3>Licensed to issue plumbing COCs for</h3>
      <ul class="lc-cats">{cats}</ul>
      <div class="lc-spec">{icon("jet", 20)}<div><span>Specialisation</span><strong>{LICENSED_SPECIALISATION}</strong></div></div>
    </div>
    <div class="prose" style="margin-top:36px">
      <h2>What this means for you</h2>
      <ul class="check-list">
        <li>Your work is done by a plumber licensed by the PIRB, the industry body for plumbing in South Africa.</li>
        <li>Work in the categories above can be certified with a plumbing Certificate of Compliance (COC).</li>
        <li>Heat pump installations are a specialisation, so they're handled and certified properly.</li>
      </ul>
      <h2>Check the registration yourself</h2>
      <p>PIRB registrations can be checked at <a href="https://www.pirb.co.za" rel="noopener" target="_blank">pirb.co.za</a> using licence number {LICENCE_NO} or company number {PIRB_NO}.</p>
    </div>
  </article>
  <aside><div class="aside-sticky">
    <div class="aside-card"><h2>Work with {CONTACT_PERSON.split()[0]}</h2><p class="muted small">Tell us about your job and we'll get back to you with a quote.</p>{btn_quote("Request a quote", "")}</div>
  </div></aside>
</div></section>"""
    person = {"@context": "https://schema.org", "@type": "Person", "name": CONTACT_PERSON, "jobTitle": "Licensed Plumber",
              "worksFor": {"@id": BUSINESS_ID}, "url": SITE + path,
              "hasCredential": {"@type": "EducationalOccupationalCredential", "credentialCategory": "PIRB Licensed Plumber", "identifier": LICENCE_NO},
              "knowsAbout": [n for n, _, _ in LICENSED_DETAIL] + [LICENSED_SPECIALISATION]}
    page(path, f"{CONTACT_PERSON}, Licensed Plumber | {NAME}",
         f"{CONTACT_PERSON} is a PIRB licensed plumber (licence {LICENCE_NO}) at {NAME}, licensed for drainage, rainwater, cold and hot water COCs, specialising in heat pumps.",
         body, [person, breadcrumb_schema(trail)])


def build_quote():
    trail = [("Home", "/"), ("Request a quote", "/quote/")]
    body = f"""<section class="section"><div class="wrap two-col">
  <div>{crumbs_html(trail)}<h1>Request a quote</h1>
    <p class="lead">Tell us what you need and where you are, and we'll get back to you. A photo of the problem helps us quote accurately.</p>
    <ul class="check-list"><li>PIRB-registered company no. {PIRB_NO}</li><li>Licensed plumber, licence {LICENCE_NO}</li><li>Plumbing COCs issued</li></ul>
    <p>Rather talk to someone? Call or WhatsApp <a href="tel:{PHONE_TEL}">{PHONE_DISPLAY}</a>.</p>
  </div>
  {quote_form("Send us a message")}
</div></section>"""
    page("/quote/", "Request a Plumbing Quote | Zicco Plumbers Johannesburg",
         "Request a quote from Zicco Plumbers for blocked drains, leaks, geysers, heat pumps, water jetting, subsoil drainage and more in Johannesburg.",
         body, [breadcrumb_schema(trail)])


def build_thanks():
    body = f"""<section class="section"><div class="wrap narrow" style="text-align:center">
  <div style="color:var(--wa);display:flex;justify-content:center;margin-bottom:12px">{icon("shield", 56, 1.6)}</div>
  <h1>Thank you, we've got your request</h1>
  <div class="ticket-ref" hidden><p class="lead">Your ticket number is</p><p class="ticket-no"></p>
    <p>Save this number. You can follow your request, read our replies and send us messages on your tracking page. If you gave us an email address, we've also emailed you the link.</p>
    <p><a class="btn btn-call btn-big track-link" href="/track/">Track your request</a></p></div>
  <p class="lead">{NAME} will be in touch on the number you gave us. If it's urgent, call or WhatsApp us now.</p>
  <p><a href="/">&larr; Back to the home page</a></p>
</div></section>"""
    page("/thank-you/", "Thank You | Zicco Plumbers", "Thanks for contacting Zicco Plumbers.", body, noindex=True)


def build_track():
    body = f"""<section class="section"><div class="wrap narrow" id="track-app">
  <p class="eyebrow">Track your request</p>
  <div id="track-lookup" hidden>
    <h1>Find your request</h1>
    <p class="lead">Enter your ticket number and the phone number you used on the form.</p>
    <form class="form-card" id="lookup-form"><div class="form-grid cols-2">
      <div class="field"><label for="l-id">Ticket number</label><input id="l-id" name="id" placeholder="ZP-12345" required></div>
      <div class="field"><label for="l-phone">Phone number</label><input id="l-phone" name="phone" type="tel" required></div>
      <div class="span-2"><button class="btn btn-call btn-big" type="submit">Find my request</button><p class="small form-status" role="status" hidden></p></div>
    </div></form>
  </div>
  <div id="track-view" hidden></div>
</div></section>
<script src="/js/track.js?v={CSS_V}" defer></script>"""
    page("/track/", "Track Your Request | Zicco Plumbers", "Follow the progress of your plumbing request with Zicco Plumbers.", body, noindex=True)


def build_doc():
    body = f"""<section class="section doc-section"><div class="wrap" style="max-width:900px" id="doc-app">
  <p class="doc-loading">Loading&hellip;</p>
</div></section>
<script src="/js/doc.js?v={CSS_V}" defer></script>"""
    page("/doc/", "Quote / Invoice | Zicco Plumbers", "Your quote or invoice from Zicco Plumbers.", body, noindex=True)


def build_privacy():
    trail = [("Home", "/"), ("Privacy", "/privacy/")]
    body = f"""<section class="section prose"><div class="wrap narrow">
  {crumbs_html(trail)}
  <h1>Privacy</h1>
  <p class="muted">Last updated 22 October 2026</p>
  <p>This is the website of {NAME}, based in {AREA}. This page explains what information this website handles, in line with South Africa&rsquo;s Protection of Personal Information Act (POPIA).</p>
  <h2>Quote and contact form</h2>
  <p>If you use the quote form, we receive the details you enter: your name, surname, contact number, email address (if given), location, the services you need, your message and any photo you attach. We use this only to respond to your request, quote for and carry out the work, and keep a record of the job.</p>
  <p>Your request is stored securely with Netlify, the company that hosts this website, and we email you a private link where you can follow your request. Quotes and invoices we send you are stored the same way. Emails are sent through our email provider. We keep your details for as long as we need them for your job, our accounting records and the law.</p>
  <h2>When you call or WhatsApp us</h2>
  <p>If you call or send a WhatsApp message, {NAME} receives your phone number and whatever you tell us, so we can reply and quote for the job. Phone calls and WhatsApp messages also pass through your mobile network and Meta (WhatsApp), who handle them under their own privacy policies.</p>
  <h2>What we don't do</h2>
  <p>We do not sell your details or share them with other companies for marketing. This website has no user accounts or advertising trackers.</p>
  <h2>Links to other sites</h2>
  <p>This site links to other sites, such as PlumberFinder and pirb.co.za. We are not responsible for their content or privacy practices.</p>
  <h2>Your rights</h2>
  <p>You may ask us what personal information we hold about you, ask us to correct it, or ask us to delete it. Contact us on {PHONE_DISPLAY} (call or WhatsApp). If you are unhappy with how your information is handled, you can complain to the Information Regulator of South Africa at <a href="https://inforegulator.org.za" rel="noopener">inforegulator.org.za</a>.</p>
  <p><a href="/">&larr; Back to the home page</a></p>
</div></section>"""
    page("/privacy/", "Privacy | Zicco Plumbers", "How the Zicco Plumbers website handles your personal information under POPIA.", body, [breadcrumb_schema(trail)])


def build_404():
    body = f"""<section class="section"><div class="wrap narrow" style="text-align:center">
  <h1>Page not found</h1>
  <p class="lead">Sorry, that page doesn't exist. Need a plumber? We're one call away.</p>
  <p><a href="/">Home</a> &middot; <a href="/services/">Services</a> &middot; <a href="/contact/">Contact</a></p>
</div></section>"""
    page("/404.html", "Page Not Found | Zicco Plumbers", "Page not found.", body, noindex=True)


def build_static():
    for f in ("favicon.svg", "og.jpg"):
        shutil.copy2(f"{SRC}/{f}", f"{OUT}/{f}")
    here = os.path.dirname(os.path.abspath(__file__))
    shutil.copy2(f"{here}/styles.css", f"{OUT}/styles.css")
    os.makedirs(f"{OUT}/js", exist_ok=True)
    for js in ("site.js", "track.js", "doc.js"):
        shutil.copy2(f"{here}/{js}", f"{OUT}/js/{js}")
    shutil.copytree(f"{here}/admin", f"{OUT}/admin")
    paths = ["/", "/services/"] + [f"/services/{s['slug']}/" for s in SERVICES] + ["/areas/"] + \
        [f"/areas/{a['slug']}/" for a in AREAS] + ["/projects/", "/about/", PROFILE_PATH, "/faq/", "/contact/", "/quote/", "/privacy/"]
    urls = "\n".join(f"  <url><loc>{SITE}{p}</loc><lastmod>{UPDATED}</lastmod></url>" for p in paths)
    with open(f"{OUT}/sitemap.xml", "w") as f:
        f.write(f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{urls}\n</urlset>\n')
    with open(f"{OUT}/robots.txt", "w") as f:
        f.write(f"User-agent: *\nAllow: /\nDisallow: /thank-you/\nDisallow: /track/\nDisallow: /doc/\nDisallow: /admin/\nDisallow: /api/\n\nSitemap: {SITE}/sitemap.xml\n")


if __name__ == "__main__":
    if os.path.exists(OUT):
        shutil.rmtree(OUT)
    os.makedirs(OUT)
    prepare_images()
    build_home(); build_services_index(); build_areas_index()
    for s in SERVICES:
        build_service(s)
    for a in AREAS:
        build_area(a)
    build_projects(); build_about(); build_faq(); build_contact(); build_profile(); build_quote(); build_thanks(); build_track(); build_doc(); build_privacy(); build_404()
    build_static()
    print("built", sum(len(fs) for _, _, fs in os.walk(OUT)), "files")
