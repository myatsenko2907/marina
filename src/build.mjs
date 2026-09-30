// Static site generator: node src/build.mjs  →  writes HTML pages into /docs
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CONFIG, MAJORS, DBAI, COURSES, FAQ } from "./data.mjs";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "docs");
const M = Object.values(MAJORS);
const ext = 'target="_blank" rel="noopener"';

/* ---------- small helpers ---------- */
const t = (en, km) => `<span data-km="${km}">${en}</span>`;
const list = (items) => items.map((i) => `<li>${i}</li>`).join("");
const enquire = (path, major) =>
  `admission.html?${new URLSearchParams({ ...(path && { path }), ...(major && { major }) })}#enquiry`;

const ICONS = {
  tg: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M21.4 3.6 2.9 10.8c-1 .4-1 1.8 0 2.1l4.7 1.5 1.8 5.6c.3.8 1.3 1.1 1.9.5l2.6-2.4 4.9 3.6c.8.6 1.9.1 2.1-.8l3.1-15.4c.2-1.1-.8-2-1.9-1.6ZM9.8 14.5l-.4 3.8-1.3-4.3 9.9-6.6-8.2 7.1Z"/></svg>',
  ms: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2C6.4 2 2 6.1 2 11.6c0 2.9 1.2 5.4 3.2 7.1V22l3-1.7c1.2.3 2.4.5 3.8.5 5.6 0 10-4.1 10-9.6S17.6 2 12 2Zm1 12.9-2.6-2.7-5 2.7 5.5-5.8 2.6 2.7 4.9-2.7-5.4 5.8Z"/></svg>',
  call: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M6.6 10.8a15 15 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1l-2.3 2.2Z"/></svg>',
  caret: '<svg class="caret" viewBox="0 0 10 10" aria-hidden="true"><path d="M1 3l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',
};

/* ---------- navigation (section 2 of the brief) ---------- */
const NAV = [
  {
    label: t("Education", "ការសិក្សា"),
    key: "education",
    items: [
      { href: "choose-your-path.html", text: "Choose your path", title: true },
      { href: "bachelor.html", text: "Bachelor of Computer Science (4 years)", title: true },
      ...M.map((m) => ({ href: m.page, text: m.name, sub: true })),
      { href: "associate-degree.html", text: "Associate Degree (2 years)", title: true },
      ...M.map((m) => ({ href: `associate-degree.html#assoc-${m.slug}`, text: m.name, sub: true })),
      { href: "professional-diploma.html", text: "International Professional Diploma (2.3 years)", title: true },
      ...[...M, DBAI].map((m) => ({ href: `professional-diploma.html#dip-${m.slug}`, text: m.name, sub: true })),
    ],
  },
  {
    label: t("Short Courses", "វគ្គខ្លី"),
    key: "courses",
    items: [
      { href: "short-courses.html", text: "Course catalogue", title: true },
      { href: "short-courses.html#corporate", text: "Corporate Training", title: true },
    ],
  },
  {
    label: t("About STEP", "អំពី STEP"),
    key: "about",
    items: [
      { href: "about.html", text: "Institute and accreditation", title: true },
      { href: CONFIG.legacy.vacancies, text: "Vacancies", ext: true },
      { href: CONFIG.legacy.stories, text: "Student stories", ext: true },
      { href: "contacts.html", text: "Contact and location" },
    ],
  },
  {
    label: t("Admission", "ការចូលរៀន"),
    key: "admission",
    items: [
      { href: "admission.html", text: "Admissions, documents and intakes", title: true },
      { href: "admission.html#fees", text: "Tuition fees" },
      { href: "admission.html#schedule", text: "Study schedule" },
      { href: "contacts.html", text: "Contacts" },
      { href: "admission.html#faq", text: "FAQs" },
    ],
  },
  { label: t("Enroll Now", "ចុះឈ្មោះឥឡូវនេះ"), href: CONFIG.legacy.enrol, ext: true },
  { label: t("News", "ព័ត៌មាន"), href: CONFIG.legacy.news, ext: true },
];

const navLink = (i) =>
  `<a href="${i.href}"${i.ext ? " " + ext : ""} class="${i.title ? "dd-title" : ""}${i.sub ? "dd-sub" : ""}">${i.text}</a>`;

function header(active) {
  const desktop = NAV.map((n) =>
    n.items
      ? `<li><button type="button" aria-haspopup="true"${n.key === active ? ' aria-current="page"' : ""}>${n.label}${ICONS.caret}</button>
          <ul class="dropdown">${n.items.map((i) => `<li>${navLink(i)}</li>`).join("")}</ul></li>`
      : `<li><a href="${n.href}"${n.ext ? " " + ext : ""}>${n.label}</a></li>`
  ).join("");
  const mobile = NAV.map((n) =>
    n.items
      ? `<details${n.key === active ? " open" : ""}><summary>${n.label}</summary><div>${n.items.map(navLink).join("")}</div></details>`
      : `<a href="${n.href}"${n.ext ? " " + ext : ""}>${n.label}</a>`
  ).join("");

  return `
<a class="skip" href="#main">Skip to content</a>
<div class="topline"><div class="wrap">
  <label class="topline__city">📍
    <select aria-label="Choose country / city" onchange="if(this.value)location.href=this.value">
      <option value="" selected>${CONFIG.city}, Cambodia</option>
      <option value="https://itstep.org/">Other countries…</option>
    </select>
  </label>
  <a href="${CONFIG.phoneHref}">${CONFIG.phone}</a>
</div></div>
<header class="header"><div class="wrap">
  <a class="logo" href="index.html" aria-label="IT Academy STEP — home">
    <span class="logo__mark">STEP</span>
    <span class="logo__text">IT Academy STEP<small>Institute · Cambodia</small></span>
  </a>
  <nav class="nav" aria-label="Main"><ul>${desktop}</ul></nav>
  <div class="header__actions">
    <div class="lang" role="group" aria-label="Language">
      <button type="button" data-lang="en" aria-pressed="true">EN</button><button type="button" data-lang="km" aria-pressed="false">KM</button>
    </div>
    <a class="btn btn--primary btn--sm" href="${enquire()}">${t("Apply", "ដាក់ពាក្យ")}</a>
    <button class="burger" type="button" aria-label="Menu" aria-expanded="false"><span></span></button>
  </div>
</div></header>
<nav class="mnav" aria-label="Mobile">
  ${mobile}
  <div class="mnav__contacts">
    <a class="btn btn--primary" href="${enquire()}">${t("Free consultation", "ពិគ្រោះយោបល់ឥតគិតថ្លៃ")}</a>
    <a class="btn btn--ghost" href="${CONFIG.phoneHref}">${CONFIG.phone}</a>
  </div>
</nav>`;
}

function contactBar() {
  return `
<aside class="contactbar" aria-label="Chat with a consultant"><div class="wrap">
  <span class="contactbar__label">${t("Questions? Chat with a consultant", "មានសំណួរ? ជជែកជាមួយអ្នកប្រឹក្សា")}</span>
  <a class="cb-btn cb-btn--tg" href="${CONFIG.telegram}" ${ext}>${ICONS.tg}<span class="cb-txt">Telegram</span></a>
  <a class="cb-btn cb-btn--ms" href="${CONFIG.messenger}" ${ext}>${ICONS.ms}<span class="cb-txt">Messenger</span></a>
  <a class="cb-btn cb-btn--call" href="${CONFIG.phoneHref}" aria-label="Call ${CONFIG.phone}">${ICONS.call}</a>
</div></aside>`;
}

function footer() {
  return `
<footer class="footer"><div class="wrap">
  <div class="footer__grid">
    <div>
      <a class="logo" href="index.html"><span class="logo__mark">STEP</span><span class="logo__text">IT Academy STEP Institute</span></a>
      <p class="mt-2">Accredited by the Ministry of Education, Youth and Sport of the Kingdom of Cambodia. Authorised training centre for Cisco and Autodesk.</p>
      <p><a href="${CONFIG.phoneHref}">${CONFIG.phone}</a><br><a href="mailto:${CONFIG.email}">${CONFIG.email}</a></p>
    </div>
    <div><h4>Education</h4><ul>
      <li><a href="bachelor.html">Bachelor of Computer Science</a></li>
      <li><a href="associate-degree.html">Associate Degree</a></li>
      <li><a href="professional-diploma.html">International Professional Diploma</a></li>
      <li><a href="short-courses.html">Short Courses</a></li>
      <li><a href="choose-your-path.html">Choose your path</a></li>
    </ul></div>
    <div><h4>Admission</h4><ul>
      <li><a href="admission.html">How to apply</a></li>
      <li><a href="admission.html#fees">Tuition fees</a></li>
      <li><a href="admission.html#schedule">Study schedule</a></li>
      <li><a href="admission.html#faq">FAQs</a></li>
      <li><a href="${CONFIG.legacy.enrol}" ${ext}>Enroll now</a></li>
    </ul></div>
    <div><h4>About STEP</h4><ul>
      <li><a href="about.html">Institute and accreditation</a></li>
      <li><a href="${CONFIG.legacy.stories}" ${ext}>Student stories</a></li>
      <li><a href="${CONFIG.legacy.vacancies}" ${ext}>Vacancies</a></li>
      <li><a href="${CONFIG.legacy.news}" ${ext}>News</a></li>
      <li><a href="contacts.html">Contacts</a></li>
    </ul></div>
  </div>
  <div class="footer__bottom">
    <span>© ${new Date().getFullYear()} IT Academy STEP Institute, Phnom Penh</span>
    <span><a href="${CONFIG.telegram}" ${ext}>Telegram</a> · <a href="${CONFIG.messenger}" ${ext}>Messenger</a></span>
  </div>
</div></footer>`;
}

function page({ file, title, description, active, body }) {
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${title} | IT Academy STEP Cambodia</title>
<meta name="description" content="${description}">
<meta property="og:title" content="${title} | IT Academy STEP Cambodia">
<meta property="og:description" content="${description}">
<meta name="theme-color" content="#11163a">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&family=Noto+Sans+Khmer:wght@400;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="assets/styles.css">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%23ff5a1f'/%3E%3Ctext x='16' y='21' font-size='11' font-family='Arial' font-weight='700' fill='white' text-anchor='middle'%3ESTEP%3C/text%3E%3C/svg%3E">
</head>
<body>
${header(active)}
<main id="main">
${body}
</main>
${footer()}
${contactBar()}
<script src="assets/main.js"></script>
</body>
</html>
`;
  writeFileSync(join(OUT, file), html);
  console.log("  ✓", file);
}

/* ---------- shared blocks ---------- */
const hero = ({ crumbs, eyebrow, title, text, facts, buttons }) => `
<section class="hero hero--page"><div class="wrap">
  ${crumbs ? `<div class="breadcrumbs"><a href="index.html">Home</a> / ${crumbs}</div>` : ""}
  ${eyebrow ? `<span class="eyebrow">${eyebrow}</span>` : ""}
  <h1>${title}</h1>
  ${text ? `<p>${text}</p>` : ""}
  ${facts ? `<ul class="facts">${list(facts)}</ul>` : ""}
  ${buttons ? `<div class="btn-row">${buttons}</div>` : ""}
</div></section>`;

const ctaBand = (title = "Not sure which path fits you?", text = "Tell us what interests you and what you want to achieve. We’ll help you compare programmes, entry requirements, fees, and upcoming intakes.", href = enquire()) => `
<section class="section"><div class="wrap"><div class="cta">
  <div><h2>${title}</h2><p class="mt-0">${text}</p></div>
  <div class="btn-row">
    <a class="btn btn--light" href="${href}">${t("Free consultation", "ពិគ្រោះយោបល់ឥតគិតថ្លៃ")}</a>
    <a class="btn btn--ghost" style="color:#fff" href="${CONFIG.telegram}" ${ext}>Ask in Telegram</a>
  </div>
</div></div></section>`;

const yearsGrid = (years, from = 0, to = 4) => `
<div class="years">${years
  .slice(from, to)
  .map((y, i) => `<div class="year"><h4>Year ${from + i + 1}</h4><ul>${list(y)}</ul></div>`)
  .join("")}</div>`;

const download = (href, title, note = "PDF") => `
<a class="download" href="${href}" download><span class="download__ico">PDF</span><span>${title}<small>${note}</small></span></a>`;

const tabsFor = (id, items, render) => `
<div class="tabs" role="tablist" aria-label="Majors">${items
  .map((m, i) => `<button type="button" role="tab" id="${id}-tab-${m.slug}" aria-controls="${id}-${m.slug}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}">${m.name}</button>`)
  .join("")}</div>
${items
  .map((m, i) => `<div role="tabpanel" id="${id}-${m.slug}" aria-labelledby="${id}-tab-${m.slug}"${i ? " hidden" : ""}>${render(m)}</div>`)
  .join("")}`;

/* ---------- pages ---------- */
const PATHS = [
  { title: "Bachelor’s Degree", time: "4 years", award: "Bachelor’s Degree · choose 1 of 3 majors", text: "4 years. Choose Software Development, Computer Graphics and Design, or Digital Marketing and Communication.", btn: "View Bachelor’s Degree", href: "bachelor.html", icon: "4" },
  { title: "Associate Degree", time: "2 years", award: "Associate Degree · choose 1 of 3 majors", text: "Start with 2 years in one of the three majors. Continue to the Bachelor’s Degree in the same major if you choose.", btn: "View Associate Degree", href: "associate-degree.html", icon: "2" },
  { title: "International Professional Diploma", time: "2 years + project", award: "International Professional Diploma · choose 1 of 4 majors", text: "2 years of practical study and an international diploma from STEP. Choose from four fields, including Digital Business and AI.", btn: "View Diplomas", href: "professional-diploma.html", icon: "★" },
  { title: "Short Courses", time: "Varies by course", award: "Course certificate", text: "Learn one skill at a time. Explore current courses and schedules.", btn: "See Short Courses", href: "short-courses.html", icon: "✓" },
];

function home() {
  page({
    file: "index.html",
    title: "Build the skills for your future in tech and creative media",
    description: "Bachelor’s Degree, Associate Degree, International Professional Diploma and short courses in software development, design and digital marketing in Phnom Penh.",
    body: `
<section class="hero"><div class="wrap">
  <span class="eyebrow">IT Academy STEP Institute · Phnom Penh</span>
  <h1>Build the skills for your future in tech and creative media.</h1>
  <p>Learn from experts in the field, follow an international curriculum, and build real projects. Choose your path: a Bachelor’s Degree, an Associate Degree, an International Professional Diploma, or a short course.</p>
  <div class="btn-row">
    <a class="btn btn--primary" href="#paths">${t("Explore programmes", "ស្វែងរកកម្មវិធីសិក្សា")}</a>
    <a class="btn btn--ghost" href="${CONFIG.legacy.enrol}" ${ext}>${t("See open intakes", "មើលវគ្គដែលកំពុងទទួល")}</a>
  </div>
  <ul class="facts"><li>Accredited by MoEYS</li><li>Cisco &amp; Autodesk training centre</li><li>2 campuses in Phnom Penh</li></ul>
</div></section>

<section class="section" id="paths"><div class="wrap">
  <div class="section-head"><span class="eyebrow">Our programmes</span><h2>${t("What do you want to study?", "តើអ្នកចង់រៀនអ្វី?")}</h2></div>
  <div class="grid grid--4">${PATHS.map((p) => `
    <article class="card card--path">
      <div class="card__meta"><span class="tag">${p.time}</span></div>
      <h3>${p.title}</h3>
      <p>${p.text}</p>
      <small style="color:var(--muted)">${p.award}</small>
      <a class="btn btn--ghost btn--sm mt-2" href="${p.href}">${p.btn}</a>
    </article>`).join("")}
  </div>
  <p class="mt-3"><a href="choose-your-path.html">Compare all paths side by side →</a></p>
</div></section>

<section class="section section--soft"><div class="wrap split">
  <div>
    <span class="eyebrow">Why STEP?</span>
    <h2>Skills employers look for. A portfolio that proves it.</h2>
    <p class="lead">Build the skills employers look for and a portfolio that proves what you can do. Create apps, visual designs, or digital campaigns through real projects, guided by professionals who work in the industry every day.</p>
    <a class="btn btn--primary mt-2" href="about.html">About STEP</a>
  </div>
  <div class="stats">
    <div class="stat"><b>98%</b><span>of graduates would recommend STEP as the best place to study technology in Cambodia</span></div>
    <div class="stat"><b>90%</b><span>of graduates are employed even before graduation</span></div>
    <div class="stat"><b>2015</b><span>international IT education in Cambodia since</span></div>
    <div class="stat"><b>1999</b><span>STEP IT Academy founded; graduates around the world</span></div>
  </div>
</div></section>

<section class="section"><div class="wrap">
  <div class="section-head"><span class="eyebrow">Three fields, two degree options</span><h2>Start with 2 years. Go on to 4.</h2>
  <p class="lead">Choose one of three majors. Complete two years of study and the graduation requirements to earn an Associate Degree. Want a Bachelor’s Degree? Continue in the same major through four years of study and complete your thesis to earn a Bachelor of Computer Science. Both degree programmes are accredited by MoEYS.</p></div>
  <div class="grid grid--2">
    <div class="panel"><span class="tag tag--blue">Years 1–2</span><h3 class="mt-2">Associate Degree</h3><p>Graduation project and final exams. Start working sooner — or continue.</p></div>
    <div class="panel"><span class="tag">Years 1–4 + thesis</span><h3 class="mt-2">Bachelor of Computer Science</h3><p>Same major all the way. Internship period and graduation thesis included.</p></div>
  </div>
  <div class="grid grid--3 mt-3">${M.map((m) => `
    <a class="card" href="${m.page}"><div class="card__icon">${m.name[0]}</div><h3>${m.name}</h3><p>${m.short}</p><span style="color:var(--brand);font-weight:700">Explore major →</span></a>`).join("")}
  </div>
  <p class="note mt-3">Each programme includes a modern curriculum, covers essential AI skills and prepares you for successful employment.</p>
</div></section>
${ctaBand()}`,
  });
}

function choosePath() {
  const rows = [
    ["Earn a Bachelor’s Degree", "Bachelor of Computer Science", "bachelor.html", "4 years", "Bachelor’s Degree, with a selected major that supports your interests and talents."],
    ["Start with a degree and decide later", "Associate Degree", "associate-degree.html", "2 years", "Associate Degree, with the option to continue in the same major. Only 2 years, and you can decide to transition to a Bachelor’s Degree in your second year."],
    ["Train for a profession over 2 years", "International Professional Diploma", "professional-diploma.html", "2 years + 3-month project", "International Professional Diploma. No MoEYS exams — awarded on your performance and graduation project."],
    ["Learn one specific skill", "Short Course", "short-courses.html", "Varies by course", "If you want to develop a specific skill and learn a specific technology, a short course is for you. Course certificate, subject to course rules."],
  ];
  page({
    file: "choose-your-path.html",
    title: "Choose your path",
    description: "Compare study time and qualifications: Bachelor’s Degree, Associate Degree, International Professional Diploma or a short course.",
    active: "education",
    body: `
${hero({ crumbs: "Choose your path", title: "Find the right way to study at IT Academy STEP Institute", text: "Start with your goal. You can compare the study time and qualification below." })}
<section class="section"><div class="wrap">
  <div class="table-wrap"><table class="table--stack table--compare">
    <thead><tr><th>I want to…</th><th>Recommended path</th><th>Study time</th><th>What I receive</th></tr></thead>
    <tbody>${rows.map((r) => `
      <tr><td data-label="I want to…">${r[0]}</td><td data-label="Recommended path"><a href="${r[2]}"><b>${r[1]}</b></a></td><td data-label="Study time">${r[3]}</td><td data-label="What I receive">${r[4]}</td></tr>`).join("")}
    </tbody>
  </table></div>
</div></section>
${ctaBand("Still deciding?", "Our admissions team will help you compare programmes, entry requirements, fees and upcoming intakes — free of charge.")}`,
  });
}

function bachelor() {
  page({
    file: "bachelor.html",
    title: "Bachelor of Computer Science",
    description: "4-year Bachelor of Computer Science accredited by MoEYS. Majors: Software Development, Computer Graphics and Design, Digital Marketing and Communication.",
    active: "education",
    body: `
${hero({
  crumbs: "Education / Bachelor",
  eyebrow: "Bachelor’s Degree",
  title: "Bachelor of Computer Science",
  text: "Choose your major. Build practical skills. Graduate with a Bachelor’s Degree.",
  facts: ["4 years of study", "8 semesters", "Phnom Penh", "Select 1 of 3 majors"],
  buttons: `<a class="btn btn--primary" href="#majors">Explore majors</a><a class="btn btn--ghost" href="${enquire("bachelor")}">${t("Free consultation", "ពិគ្រោះយោបល់ឥតគិតថ្លៃ")}</a>`,
})}
<section class="section"><div class="wrap split">
  <div>
    <span class="eyebrow">What you earn</span>
    <h2>An accredited Bachelor’s Degree</h2>
    <p class="lead">A Bachelor of Computer Science, accredited by the Ministry of Education, Youth and Sport of the Kingdom of Cambodia, upon completing the full programme and degree requirements.</p>
  </div>
  <div class="panel"><ul class="checklist">
    <li>4 study years, 8 semesters, one major all the way through</li>
    <li>Internship period included</li>
    <li>Graduation thesis period follows the four study years</li>
    <li>International Cisco and Autodesk certificates included in the study fee, depending on the major</li>
    <li>Verified by the Cambodia Government Verification Agency (<a href="https://verify.gov.kh/" ${ext}>verify.gov.kh</a>)</li>
  </ul></div>
</div></section>
<section class="section section--soft" id="majors"><div class="wrap">
  <div class="section-head"><span class="eyebrow">Choose a major</span><h2>Three majors</h2></div>
  <div class="grid grid--3">${M.map((m) => `
    <article class="card"><div class="card__icon">${m.name[0]}</div><h3>${m.name}</h3><p>${m.intro.split(". ")[0]}.</p>
    <div class="card__meta"><span class="tag">4 years</span><span class="tag tag--blue">${m.credits} credits</span></div>
    <a class="btn btn--primary btn--sm mt-2" href="${m.page}">View major</a></article>`).join("")}
  </div>
</div></section>
${ctaBand("Which major is right for you?", "Tell us what you enjoy and what you want to do after graduation. We’ll help you choose.", enquire("bachelor"))}`,
  });
}

function majorPage(m) {
  page({
    file: m.page,
    title: `${m.name} — Bachelor of Computer Science`,
    description: `${m.name} major of the 4-year Bachelor of Computer Science at IT Academy STEP Institute, Phnom Penh. ${m.credits} credits.`,
    active: "education",
    body: `
${hero({
  crumbs: `<a href="bachelor.html">Bachelor</a> / ${m.name}`,
  eyebrow: "Bachelor of Computer Science",
  title: m.name,
  text: m.intro,
  facts: ["Bachelor of Computer Science", `${m.name} major`, "4 years", `${m.credits} credits`],
  buttons: `<a class="btn btn--primary" href="${enquire("bachelor", m.slug)}">${t("Free consultation", "ពិគ្រោះយោបល់ឥតគិតថ្លៃ")}</a><a class="btn btn--ghost" href="${m.pdf}" download>Download curriculum</a>`,
})}
<section class="section"><div class="wrap grid grid--2">
  <div class="panel"><span class="eyebrow">You will study</span><p class="lead mt-0">${m.study}</p></div>
  <div class="panel"><span class="eyebrow">You can build</span><p class="lead mt-0">${m.build}</p></div>
</div></section>
<section class="section section--soft"><div class="wrap">
  <div class="section-head"><span class="eyebrow">Curriculum</span><h2>What you study, year by year</h2></div>
  <details class="acc" open><summary>Years 1–2 · foundation (also the Associate Degree)</summary><div class="acc__body">${yearsGrid(m.years, 0, 2)}</div></details>
  <details class="acc"><summary>Years 3–4 · specialisation, research and thesis</summary><div class="acc__body">${yearsGrid(m.years, 2, 4)}</div></details>
  <div class="downloads mt-3">${download(m.pdf, "Download Full Curriculum", `${m.name} · Bachelor`)}</div>
</div></section>
<section class="section"><div class="wrap">
  <div class="section-head"><h2>Other majors</h2></div>
  <div class="grid grid--2">${M.filter((x) => x !== m).map((x) => `<a class="card" href="${x.page}"><h3>${x.name}</h3><p>${x.short}</p><span style="color:var(--brand);font-weight:700">View major →</span></a>`).join("")}</div>
</div></section>
${ctaBand(`Interested in ${m.name}?`, "Ask about entry requirements, fees and the next intake.", enquire("bachelor", m.slug))}`,
  });
}

function associate() {
  page({
    file: "associate-degree.html",
    title: "Associate Degree",
    description: "2-year Associate Degree accredited by MoEYS in Software Development, Computer Graphics and Design, or Digital Marketing and Communication — with an option to continue to a Bachelor’s Degree.",
    active: "education",
    body: `
${hero({
  crumbs: "Education / Associate Degree",
  eyebrow: "Associate Degree · 2 years",
  title: "Start with an Associate Degree. Keep the Bachelor’s option open.",
  text: "Choose Software Development, Computer Graphics and Design, or Digital Marketing and Communication. Study for 2 years, complete the graduation project and final exams, and earn the Associate Degree when you meet the requirements.",
  facts: ["2 years of study + final exams", "Accredited by MoEYS", "Official degree diploma", "1 of 3 majors"],
  buttons: `<a class="btn btn--primary" href="${enquire("associate")}">${t("Free consultation", "ពិគ្រោះយោបល់ឥតគិតថ្លៃ")}</a>`,
})}
<section class="section"><div class="wrap split">
  <div>
    <span class="eyebrow">Who it’s for</span>
    <h2>Start working faster — or keep going</h2>
    <p class="lead">Best if you want to start working faster, or want to keep opportunities open if you did not pass the BAC II exam: after graduating with an Associate Degree you may continue to a Bachelor’s Degree.</p>
  </div>
  <div class="panel">
    <h3>Next step: want to continue?</h3>
    <p>Stay in the same major for Years 3–4 of the Bachelor of Computer Science pathway.</p>
    <ol class="ladder">
      <li><b>Years 1–2</b> — Associate Degree: graduation project and final exams</li>
      <li><b>Years 3–4</b> — continue in the same major</li>
      <li><b>Thesis</b> — earn the Bachelor of Computer Science</li>
    </ol>
  </div>
</div></section>
<section class="section section--soft"><div class="wrap">
  <div class="section-head"><span class="eyebrow">Curriculum</span><h2>Three majors</h2><p class="lead">This programme is accredited by the Ministry of Education, Youth and Sport and leads to an official degree diploma upon completing the full programme and degree requirements.</p></div>
  ${tabsFor("assoc", M, (m) => `<h3>${m.name}</h3><p>${m.intro.split(". ")[0]}.</p>${yearsGrid(m.years, 0, 2)}<div class="btn-row"><a class="btn btn--ghost btn--sm" href="files/curriculum-associate-${m.page.replace("bachelor-", "").replace(".html", "")}.pdf" download>Download curriculum (PDF)</a><a class="btn btn--primary btn--sm" href="${enquire("associate", m.slug)}">Ask about this major</a></div>`)}
  <h3 class="mt-4">Download Full Curriculum</h3>
  <div class="downloads">${M.map((m) => download(`files/curriculum-associate-${m.page.replace("bachelor-", "").replace(".html", "")}.pdf`, m.name, "Associate Degree · PDF")).join("")}</div>
</div></section>
${ctaBand("Is the Associate Degree right for you?", "Admissions will check your eligibility and explain the route to a Bachelor’s Degree.", enquire("associate"))}`,
  });
}

function diploma() {
  const all = [...M, DBAI];
  page({
    file: "professional-diploma.html",
    title: "International Professional Diploma",
    description: "2-year International Professional Diploma from STEP in Software Development, Computer Graphics and Design, Digital Marketing and Communication, or Digital Business and AI.",
    active: "education",
    body: `
${hero({
  crumbs: "Education / International Professional Diploma",
  eyebrow: "International Professional Diploma",
  title: "Practical training for the work you want to do.",
  text: "Get an International Professional Diploma over 2 years. Choose a field and build practical skills through the programme.",
  facts: ["2 years + 3-month graduation project", "No MoEYS exams", "Issued by STEP IT Global", "1 of 4 majors"],
  buttons: `<a class="btn btn--primary" href="${enquire("diploma")}">${t("Free consultation", "ពិគ្រោះយោបល់ឥតគិតថ្លៃ")}</a>`,
})}
<section class="section"><div class="wrap">
  <div class="section-head"><span class="eyebrow">Choose a field</span><h2>Four majors</h2></div>
  <div class="grid grid--4">${all.map((m) => `
    <article class="card card--path" id="dip-${m.slug}"><h3>${m.name}</h3><p>${m.short}</p><a class="btn btn--ghost btn--sm" href="${enquire("diploma", m.slug)}">Ask about this field</a></article>`).join("")}
  </div>
</div></section>
<section class="section section--soft"><div class="wrap split">
  <div>
    <span class="eyebrow">How it works</span>
    <h2>Graduate on your performance and your project</h2>
    <p class="lead">The International Professional Diploma does not require MoEYS exams. It is awarded based on your performance and a 3-month graduation project.</p>
  </div>
  <div class="panel"><ul class="checklist">
    <li>Same practical curriculum as the Associate Degree in the three shared majors</li>
    <li>Issued by IT Academy STEP Head Office (STEP IT Global)</li>
    <li>Verified online at <a href="https://diploma.itstep.org/" ${ext}>diploma.itstep.org</a></li>
    <li>Cisco and Autodesk certificates included, depending on the major</li>
  </ul></div>
</div></section>
<section class="section"><div class="wrap">
  <h2>Download Full Curriculum</h2>
  <div class="downloads">${all.map((m) => download(`files/curriculum-diploma-${m.slug}.pdf`, m.name, "International Professional Diploma · PDF")).join("")}</div>
</div></section>
${ctaBand("Diploma or degree?", "We’ll explain the difference and help you choose the best pathway for your goals.", enquire("diploma"))}`,
  });
}

function shortCourses() {
  const topics = { programming: "Programming", design: "Design", marketing: "Marketing", business: "Business", tools: "Digital tools" };
  const levels = { beginner: "Beginner", intermediate: "Intermediate" };
  const schedules = { morning: "Morning", evening: "Evening", weekend: "Weekend" };
  const campuses = { toulkork: "Toul Kork", olympic: "Olympic" };
  const opts = (o, all) => `<option value="">${all}</option>` + Object.entries(o).map(([k, v]) => `<option value="${k}">${v}</option>`).join("");
  page({
    file: "short-courses.html",
    title: "Short Courses",
    description: "Short courses in programming, design, marketing, business and digital tools in Phnom Penh.",
    active: "courses",
    body: `
${hero({ crumbs: "Short Courses", eyebrow: "Short Courses", title: "Learn a skill. Put it to work.", text: "Explore short courses in programming, design, marketing, business, and digital tools. Find a course that fits your goal and schedule." })}
<section class="section"><div class="wrap">
  <form class="filters" data-filters aria-label="Filter courses" onsubmit="return false">
    <select name="topic" aria-label="Topic">${opts(topics, "All topics")}</select>
    <select name="level" aria-label="Skill level">${opts(levels, "Any skill level")}</select>
    <select name="schedule" aria-label="Schedule">${opts(schedules, "Any schedule")}</select>
    <select name="campus" aria-label="Campus">${opts(campuses, "Any campus")}</select>
    <label class="toggle"><input type="checkbox" name="open"> Open for enrolment</label>
  </form>
  <div class="grid grid--3">${COURSES.map((c) => `
    <article class="card" data-course data-topic="${c.topic}" data-level="${c.level}" data-schedule="${c.schedule}" data-campus="${c.campus}" data-open="${c.open ? "yes" : "no"}">
      <div class="card__meta"><span class="tag tag--blue">${topics[c.topic]}</span>${c.open ? '<span class="tag tag--green">Open for enrolment</span>' : ""}</div>
      <h3>${c.title}</h3>
      <p>${levels[c.level]} · ${schedules[c.schedule]} · ${campuses[c.campus]} campus · ${c.length}</p>
      <a class="btn btn--ghost btn--sm" href="${enquire("course", c.title)}">Enquire</a>
    </article>`).join("")}
  </div>
  <p class="empty">No courses match these filters. <a href="${CONFIG.telegram}" ${ext}>Ask us in Telegram</a> about upcoming courses.</p>
  <p class="mt-3"><a href="${CONFIG.legacy.courses}" ${ext}>See the full course list with dates and prices →</a></p>
</div></section>
<section class="section section--soft" id="corporate"><div class="wrap split">
  <div><span class="eyebrow">For companies</span><h2>Corporate Training</h2>
  <p class="lead">Upskill your team in programming, design, digital marketing, AI tools and office software. Programmes are tailored to your goals and can run at our campus or at your office.</p></div>
  <div class="panel"><ul class="checklist"><li>Needs assessment and custom programme</li><li>Flexible schedule for working teams</li><li>Certificates for every participant</li></ul>
  <a class="btn btn--primary mt-3" href="${enquire("course", "Corporate Training")}">Request a proposal</a></div>
</div></section>
${ctaBand("Need help choosing a course?", "Tell us your goal and schedule — we’ll suggest the right course.", enquire("course"))}`,
  });
}

function enquiryForm() {
  return `
<div class="panel" id="enquiry">
  <h2>Send an enquiry</h2>
  <form class="form" data-enquiry${CONFIG.formEndpoint ? ` data-endpoint="${CONFIG.formEndpoint}"` : ""}>
    <fieldset class="field" style="border:0;padding:0;margin:0"><legend style="font-weight:700;font-size:14px;margin-bottom:6px">What interests you?</legend>
      <div class="chips">
        <label><input type="radio" name="interest" value="bachelor" required><span>Bachelor</span></label>
        <label><input type="radio" name="interest" value="associate"><span>Associate</span></label>
        <label><input type="radio" name="interest" value="diploma"><span>Professional Diploma</span></label>
        <label><input type="radio" name="interest" value="course"><span>Short Course</span></label>
      </div>
    </fieldset>
    <div class="field"><label for="f-major">Major or course</label>
      <input id="f-major" name="major" list="majors-list" placeholder="e.g. Software Development">
      <datalist id="majors-list">${[...M, DBAI].map((m) => `<option value="${m.name}">`).join("")}</datalist></div>
    <div class="field"><label for="f-name">Your name</label><input id="f-name" name="name" autocomplete="name" required></div>
    <div class="field"><label for="f-contact">Phone or messaging contact</label><input id="f-contact" name="contact" autocomplete="tel" placeholder="Phone, Telegram @username…" required></div>
    <fieldset class="field" style="border:0;padding:0;margin:0"><legend style="font-weight:700;font-size:14px;margin-bottom:6px">Preferred language</legend>
      <div class="chips">
        <label><input type="radio" name="language" value="km" checked><span>Khmer</span></label>
        <label><input type="radio" name="language" value="en"><span>English</span></label>
      </div>
    </fieldset>
    <button class="btn btn--primary" type="submit">Send enquiry</button>
    <small class="hint">Prefer to chat? Write to us in <a href="${CONFIG.telegram}" ${ext}>Telegram</a> or <a href="${CONFIG.messenger}" ${ext}>Messenger</a>.</small>
  </form>
  <div class="form-success" role="status"><h3>Thank you!</h3><p class="mt-0">Our admissions team will contact you about your selected programme.</p></div>
</div>`;
}

function admission() {
  const fees = [
    ["Admission (one-time when enrolling)", "$50", "$50", "$50"],
    ["Material fee (one-time when enrolling)", "$25", "$25", "$25"],
    ["Degree fee (one-time when enrolling)", "$300", "$300", "$100"],
    ["Study fee if paid per year", "$1,850", "$1,850", "$1,850"],
    ["Study fee if paid per term (2 times a year)", "$960", "$960", "$960"],
    ["Graduation fee (one-time when graduating)", "$450", "$200", "$350"],
  ];
  const cols = ["Bachelor’s Degree · 4 years", "Associate Degree · 2 years", "Int. Professional Diploma · 2.3 years"];
  const schedule = [
    ["Morning", "Weekdays", "8:30 am – 11:30 am"],
    ["Afternoon", "Weekdays", "1:30 pm – 4:20 pm"],
    ["Evening", "Weekdays", "6:00 pm – 8:50 pm"],
    ["Weekend", "Weekend", "Saturday 1:00 pm – 5:20 pm & Sunday 8:00 am – 12:20 pm"],
  ];
  page({
    file: "admission.html",
    title: "Admissions, tuition fees and FAQ",
    description: "How to apply to IT Academy STEP Institute: steps, tuition fees for 2027/2028, study schedule, FAQ and enquiry form.",
    active: "admission",
    body: `
${hero({ crumbs: "Admission", eyebrow: "Admission", title: "Ready to study at STEP?", text: "Three simple steps from choosing a path to your first day on campus.", buttons: `<a class="btn btn--primary" href="#enquiry">Send an enquiry</a><a class="btn btn--ghost" href="${CONFIG.legacy.enrol}" ${ext}>Open intakes</a>` })}
<section class="section" id="steps"><div class="wrap">
  <ol class="ladder grid grid--3">
    <li><h3>Choose a path and major</h3><p class="mt-0">Depending on your interests and future career goals, choose a major and pathway. If you need a consultation, contact us and we will help you make this important decision.</p></li>
    <li><h3>Ask admissions</h3><p class="mt-0">Ask about entry requirements, fees, and the next intake. Visit our campus for a free consultation so we can discuss your admission and available groups to join.</p></li>
    <li><h3>Apply and submit documents</h3><p class="mt-0">Depending on the pathway you choose, we will advise you on the document requirements and enrolment procedure.</p></li>
  </ol>
</div></section>
<section class="section section--soft" id="fees"><div class="wrap">
  <div class="section-head"><span class="eyebrow">Tuition fees 2027/2028</span><h2>Choose a degree pathway that fits your needs</h2>
  <p class="lead">The tuition fee structure for the 2027/2028 academic year applies to all majors. Pay in full for a year, or split payments into 2 parts and pay by term — twice a year.</p></div>
  <div class="table-wrap"><table class="table--stack">
    <thead><tr><th>Fee</th>${cols.map((c) => `<th>${c}</th>`).join("")}</tr></thead>
    <tbody>${fees.map((r) => `<tr><th scope="row">${r[0]}</th>${r.slice(1).map((v, i) => `<td class="num" data-label="${cols[i]}">${v}</td>`).join("")}</tr>`).join("")}</tbody>
  </table></div>
  <div class="grid grid--3 mt-3">
    <div class="note note--brand"><b>Certificates included.</b> All programmes include international certifications from Cisco and Autodesk, depending on the major — granted on successful completion of the relevant courses at no extra charge.</div>
    <div class="note">The Bachelor’s and Associate Degree in Computer Science are accredited by MoEYS and verified by the Cambodia Government Verification Agency: <a href="https://verify.gov.kh/" ${ext}>verify.gov.kh</a>.</div>
    <div class="note">The International Professional Diploma is issued and verified by STEP Global at <a href="https://diploma.itstep.org/" ${ext}>diploma.itstep.org</a>.</div>
  </div>
</div></section>
<section class="section" id="schedule"><div class="wrap">
  <div class="section-head"><span class="eyebrow">Study schedule</span><h2>Fits a busy schedule</h2>
  <p class="lead">Students normally study 3 days a week on campus and spend at least 2 days a week on self-study: individual assignments, team projects, research and preparation.</p></div>
  <div class="table-wrap"><table class="table--stack">
    <thead><tr><th>Group</th><th>Days</th><th>Schedule</th></tr></thead>
    <tbody>${schedule.map((r) => `<tr><td data-label="Group"><b>${r[0]}</b></td><td data-label="Days">${r[1]}</td><td data-label="Schedule">${r[2]}</td></tr>`).join("")}</tbody>
  </table></div>
</div></section>
<section class="section section--soft"><div class="wrap split" style="align-items:start">
  <div id="faq">
    <span class="eyebrow">FAQ</span><h2>Frequently asked questions</h2>
    ${FAQ.map(([q, a]) => `<details class="acc"><summary>${q}</summary><div class="acc__body"><p>${a}</p></div></details>`).join("")}
  </div>
  ${enquiryForm()}
</div></section>`,
  });
}

const CAMPUSES = [
  { name: "Toul Kork Branch", address: "Toul Kork, Phnom Penh — full address to be added", hours: "Mon–Sat 8:00 am – 9:00 pm, Sun 8:00 am – 5:00 pm", programmes: "Degree programmes, diplomas and short courses", map: "Toul+Kork,+Phnom+Penh" },
  { name: "Olympic Branch", address: "Olympic area, Phnom Penh — full address to be added", hours: "Mon–Sat 8:00 am – 9:00 pm, Sun 8:00 am – 5:00 pm", programmes: "Degree programmes, diplomas and short courses", map: "Olympic+Stadium,+Phnom+Penh" },
];
const campusCards = () => CAMPUSES.map((c) => `
  <article class="card">
    <iframe class="map" loading="lazy" title="Map: ${c.name}" src="https://www.google.com/maps?q=${c.map}&output=embed"></iframe>
    <h3>${c.name}</h3>
    <p><b>Address:</b> ${c.address}<br><b>Opening hours:</b> ${c.hours}<br><b>Programmes:</b> ${c.programmes}</p>
    <a class="btn btn--ghost btn--sm" href="https://www.google.com/maps/search/?api=1&query=IT+STEP+${c.map}" ${ext}>Get directions</a>
  </article>`).join("");

function about() {
  page({
    file: "about.html",
    title: "About STEP",
    description: "IT Academy STEP Institute: international IT education in Cambodia since 2015, accredited by MoEYS, authorised Cisco and Autodesk training centre.",
    active: "about",
    body: `
${hero({ crumbs: "About STEP", eyebrow: "About STEP", title: "International experience. Real skills. Your successful future in tech.", buttons: `<a class="btn btn--primary" href="choose-your-path.html">Explore programmes</a><a class="btn btn--ghost" href="${CONFIG.legacy.stories}" ${ext}>See student stories</a>` })}
<section class="section"><div class="wrap split">
  <div>
    <p class="lead">STEP IT Academy was first established in Ukraine in 1999. We are the largest international educational institution, with hundreds of thousands of graduates around the world.</p>
    <p>Our education is focused on quality and practical skills. We make sure that graduates find successful employment in the best international companies.</p>
    <p>Since 2015, STEP IT Academy has provided international IT education in Cambodia. At our Phnom Penh campuses, students learn from field experts, work on projects, and build skills they can demonstrate.</p>
  </div>
  <div class="stats">
    <div class="stat"><b>98%</b><span>of graduates would recommend STEP as the best place to study technology in Cambodia</span></div>
    <div class="stat"><b>90%</b><span>employed before graduation, with salaries above the market average for fresh graduates</span></div>
    <div class="stat"><b>1999</b><span>STEP founded</span></div>
    <div class="stat"><b>2015</b><span>STEP in Cambodia</span></div>
  </div>
</div></section>
<section class="section section--dark"><div class="wrap grid grid--2">
  <div><span class="eyebrow">Our mission</span><h2>Practical tech education with an international outlook</h2><p>To provide students in Cambodia with practical tech education and an international outlook. We help students learn from experts, build real projects, and prepare for opportunities in the digital economy.</p></div>
  <div><span class="eyebrow">Our vision</span><h2>Every student can succeed in tech</h2><p>A Cambodia where every student with an interest in tech can build useful skills, create solutions for their community, and succeed internationally.</p></div>
</div></section>
<section class="section" id="accreditation"><div class="wrap grid grid--2">
  <div class="panel"><span class="eyebrow">Accreditation</span><h3>Accredited by MoEYS</h3>
    <p>IT Academy STEP Institute is accredited by the Ministry of Education, Youth and Sport of the Kingdom of Cambodia and offers accredited Bachelor’s Degree and Associate Degree programmes in Computer Science. Students may also choose a pathway to an International Professional Diploma, issued by STEP IT Global.</p>
    <a href="https://verify.gov.kh/" ${ext}>Verify a degree at verify.gov.kh →</a></div>
  <div class="panel"><span class="eyebrow">Industry learning</span><h3>Cisco &amp; Autodesk training centre</h3>
    <p>IT Academy STEP Institute is an authorised training centre for Cisco and Autodesk. Students may pursue these companies’ certificates by meeting their separate exam requirements. Each programme page shows which subjects and exams apply.</p></div>
</div></section>
<section class="section section--soft"><div class="wrap split">
  <div><span class="eyebrow">Contributing to Cambodia’s development</span><h2>Sisters of Code</h2>
  <p class="lead">Since 2019, STEP has established and run Sisters of Code, a non-profit educational programme that offers free coding education to girls and young women across Cambodia. The programme helps participants build skills and confidence while opening more paths into tech. Its contribution to education and gender inclusion has earned recognition in Cambodia and internationally.</p>
  <a class="btn btn--primary" href="${CONFIG.sistersOfCode}" ${ext}>Visit Sisters of Code</a></div>
  <div class="panel"><div class="stats"><div class="stat"><b>2019</b><span>programme started</span></div><div class="stat"><b>Free</b><span>coding education for girls and young women</span></div></div></div>
</div></section>
<section class="section" id="campuses"><div class="wrap">
  <div class="section-head"><span class="eyebrow">Campuses</span><h2>Study at STEP in Phnom Penh</h2></div>
  <div class="grid grid--2">${campusCards()}</div>
</div></section>
${ctaBand()}`,
  });
}

function contacts() {
  page({
    file: "contacts.html",
    title: "Contacts and location",
    description: "Contact IT Academy STEP Institute in Phnom Penh: Toul Kork and Olympic campuses, phone, Telegram and Messenger.",
    active: "about",
    body: `
${hero({ crumbs: "Contacts", eyebrow: "Contacts", title: "Talk to our admissions team", text: "Call us, chat with a consultant in Telegram or Messenger, or visit one of our campuses in Phnom Penh.", buttons: `<a class="btn btn--primary" href="${CONFIG.telegram}" ${ext}>Chat in Telegram</a><a class="btn btn--ghost" href="${CONFIG.messenger}" ${ext}>Messenger</a>` })}
<section class="section"><div class="wrap">
  <div class="grid grid--3 mb-3">
    <a class="card" href="${CONFIG.phoneHref}"><span class="eyebrow">Phone</span><h3>${CONFIG.phone}</h3></a>
    <a class="card" href="mailto:${CONFIG.email}"><span class="eyebrow">Email</span><h3>${CONFIG.email}</h3></a>
    <a class="card" href="${CONFIG.telegram}" ${ext}><span class="eyebrow">Chat</span><h3>Telegram · Messenger</h3></a>
  </div>
  <div class="grid grid--2">${campusCards()}</div>
</div></section>
<section class="section section--soft"><div class="wrap" style="max-width:720px">${enquiryForm()}</div></section>`,
  });
}

home();
choosePath();
bachelor();
M.forEach(majorPage);
associate();
diploma();
shortCourses();
admission();
about();
contacts();

// Curriculum data for scripts/make_pdfs.py
writeFileSync(
  join(OUT, "..", "src", "curricula.json"),
  JSON.stringify({ majors: M, dbai: DBAI }, null, 2) + "\n"
);
