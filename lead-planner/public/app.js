// Интерфейс планировщика лидобалов (без фреймворков).
const $app = document.getElementById("app");
const $tip = document.getElementById("tip");
const $toast = document.getElementById("toast");

const S = {
  me: null,
  settings: null,
  month: (() => {
    try {
      return localStorage.getItem("lp.month") || new Date().toISOString().slice(0, 7);
    } catch {
      return new Date().toISOString().slice(0, 7);
    }
  })(),
  expanded: new Set(),
};

// ---------- utils ----------
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const nf = (d) => new Intl.NumberFormat("ru-RU", { maximumFractionDigits: d, minimumFractionDigits: 0 });
const fmt = (n, d = 0) => (n == null || !Number.isFinite(n) ? "—" : nf(d).format(n));
const pct = (n, d = 0) => (n == null || !Number.isFinite(n) ? "—" : `${nf(d).format(n * 100)}%`);
const CUR = { USD: "$", EUR: "€", UAH: "₴", KZT: "₸", PLN: "zł", CZK: "Kč", BRL: "R$", GEL: "₾" };
const money = (n, cur = "USD") => (n == null || !Number.isFinite(n) ? "—" : `${CUR[cur] || ""}${nf(Math.abs(n) < 100 ? 2 : 0).format(n)}${CUR[cur] ? "" : " " + cur}`);
const MONTHS = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
const MONTHS_S = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
const monthName = (m) => `${MONTHS[Number(m.slice(5)) - 1]} ${m.slice(0, 4)}`;
const monthShort = (m) => MONTHS_S[Number(m.slice(5)) - 1];
const addMonths = (m, n) => {
  const d = new Date(Date.UTC(Number(m.slice(0, 4)), Number(m.slice(5)) - 1 + n, 1));
  return d.toISOString().slice(0, 7);
};
const SERIES = ["var(--s1)", "var(--s2)", "var(--s3)", "var(--s4)", "var(--s5)", "var(--s6)", "var(--s7)", "var(--s8)"];
const typeColor = (id) => SERIES[Math.max(0, S.settings.leadTypes.findIndex((t) => t.id === id)) % SERIES.length];
const typeName = (id) => S.settings.leadTypes.find((t) => t.id === id)?.name || id;
const STATUS = {
  ok: { label: "В плане", color: "var(--good)", icon: '<path d="M3 8.5l3 3 7-7" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' },
  risk: { label: "Риск", color: "var(--warn)", icon: '<path d="M8 3v6M8 12.5v.5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>' },
  fail: { label: "Провал", color: "var(--bad)", icon: '<path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>' },
  nodata: { label: "Нет факта ЛБ", color: "var(--idle)", icon: '<circle cx="8" cy="8" r="2" fill="currentColor"/>' },
  future: { label: "Не начался", color: "var(--idle)", icon: '<circle cx="8" cy="8" r="5" stroke="currentColor" stroke-width="1.8" fill="none"/>' },
};
const pill = (st) => `<span class="st ${st}"><svg viewBox="0 0 16 16">${STATUS[st].icon}</svg>${STATUS[st].label}</span>`;
const SRC = {
  manual: "вручную",
  fb_product: "FB, кампании продукта",
  fb_branch: "FB, средний по кабинету",
  fb_event: "FB, кампании ивента",
  fb_events_avg: "FB, средняя по ивентам",
  fb_branch_cpl: "FB, CPL кабинета",
  report: "отчёт «Лидобалы»",
  leads: "лиды × нормы",
  fb: "FB-кабинет",
  plan: "план",
  history: "вклад прошлого месяца",
  product: "настройки продукта",
  default: "по умолчанию",
};

function toast(msg, isErr = false) {
  $toast.textContent = msg;
  $toast.className = "toast" + (isErr ? " err" : "");
  $toast.hidden = false;
  clearTimeout(toast.t);
  toast.t = setTimeout(() => ($toast.hidden = true), 3500);
}

async function api(path, opts = {}) {
  const res = await fetch(path, {
    method: opts.method || "GET",
    headers: opts.raw ? {} : { "content-type": "application/json" },
    body: opts.raw ? opts.raw : opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = res.headers.get("content-type")?.includes("json") ? await res.json() : await res.text();
  if (res.status === 401 && !path.endsWith("/login")) {
    S.me = null;
    renderLogin();
    throw new Error("Требуется вход");
  }
  if (!res.ok) throw new Error(data?.error || `Ошибка ${res.status}`);
  return data;
}

const setMonth = (m) => {
  S.month = m;
  try {
    localStorage.setItem("lp.month", m);
  } catch {}
  route();
};

// ---------- tooltip ----------
document.addEventListener("mousemove", (e) => {
  const el = e.target.closest?.("[data-tip]");
  if (!el) {
    $tip.hidden = true;
    return;
  }
  $tip.innerHTML = el.getAttribute("data-tip");
  $tip.hidden = false;
  const w = $tip.offsetWidth;
  const h = $tip.offsetHeight;
  let x = e.clientX + 14;
  let y = e.clientY + 14;
  if (x + w > innerWidth - 8) x = e.clientX - w - 14;
  if (y + h > innerHeight - 8) y = e.clientY - h - 14;
  $tip.style.left = x + "px";
  $tip.style.top = y + "px";
});

// ---------- charts (SVG) ----------
/** Горизонтальные бары темпа (% от ожидаемого к сегодня) с опорными линиями. */
function paceChart(rows, { onClickHref } = {}) {
  if (!rows.length) return '<div class="empty">Нет данных</div>';
  const th = S.settings.thresholds;
  const labelW = 150;
  const valW = 64;
  const W = 760;
  const rowH = 30;
  const max = Math.max(1.3, ...rows.map((r) => r.pace || 0));
  const x = (v) => labelW + (Math.min(v, max) / max) * (W - labelW - valW);
  const H = rows.length * rowH + 26;
  let g = "";
  for (const t of [0, 0.5, 1, 1.5, 2].filter((t) => t <= max)) {
    g += `<line class="gridl" x1="${x(t)}" x2="${x(t)}" y1="0" y2="${H - 22}"/><text class="axis" x="${x(t)}" y="${H - 6}" text-anchor="middle">${t * 100}%</text>`;
  }
  rows.forEach((r, i) => {
    const y = i * rowH + 6;
    const st = r.status;
    const v = r.pace ?? 0;
    const w = Math.max(0, x(v) - labelW);
    const tip = `<b>${esc(r.name)}</b><br>Темп: ${pct(r.pace)} · ${STATUS[st].label}<br>Факт: ${fmt(r.factBalls, 1)} из ожидаемых ${fmt(r.expectedBalls, 1)}<br>План месяца: ${fmt(r.targetBalls, 1)} лидобалов`;
    g += `<g class="row" data-tip="${esc(tip)}" ${onClickHref ? `onclick="location.hash='${onClickHref(r)}'" style="cursor:pointer"` : ""}>
      <rect class="hit" x="0" y="${y - 3}" width="${W}" height="${rowH}"/>
      <text x="${labelW - 10}" y="${y + 15}" text-anchor="end">${esc(r.name)}</text>
      ${r.pace == null ? `<text x="${labelW + 6}" y="${y + 15}" class="muted" style="fill:var(--muted)">${STATUS[st].label.toLowerCase()}</text>` : `<rect class="mark" x="${labelW}" y="${y + 3}" width="${w}" height="18" rx="4" fill="${STATUS[st].color}"/>`}
      <text x="${W - 4}" y="${y + 15}" text-anchor="end" style="font-weight:600;fill:var(--ink)">${pct(r.pace)}</text>
    </g>`;
  });
  g += `<line class="ref" x1="${x(th.risk)}" x2="${x(th.risk)}" y1="0" y2="${H - 22}"/><line class="ref" x1="${x(th.ok)}" x2="${x(th.ok)}" y1="0" y2="${H - 22}" style="opacity:.9"/>`;
  g += `<line class="base" x1="${labelW}" x2="${labelW}" y1="0" y2="${H - 22}"/>`;
  return `<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Темп выполнения плана лидобалов">${g}</svg></div>
  <div class="legend"><span>${pill("ok")} ≥ ${pct(th.ok)}</span><span>${pill("risk")} ${pct(th.risk)}–${pct(th.ok)}</span><span>${pill("fail")} &lt; ${pct(th.risk)}</span><span class="muted">пунктир — пороги; темп = факт ÷ (план × прошедшая часть месяца)</span></div>`;
}

/** План vs факт лидобалов по продуктам: дорожка = план месяца, заливка = факт, засечка = ожидаемо к сегодня. */
function planFactChart(products) {
  const rows = products.filter((p) => p.targetBalls > 0 || p.factBalls);
  if (!rows.length) return '<div class="empty">Нет плана по продуктам</div>';
  const labelW = 170;
  const valW = 96;
  const W = 760;
  const rowH = 34;
  const max = Math.max(...rows.map((p) => Math.max(p.targetBalls, p.factBalls || 0))) || 1;
  const x = (v) => labelW + (v / max) * (W - labelW - valW);
  const H = rows.length * rowH + 4;
  let g = "";
  rows.forEach((p, i) => {
    const y = i * rowH + 4;
    const tip = `<b>${esc(p.name)}</b><br>План: ${fmt(p.targetBalls, 1)} лидобалов${p.carryBalls ? ` (в т.ч. перенос ${fmt(p.carryBalls, 1)})` : ""}<br>Ожидаемо к сегодня: ${fmt(p.expectedBalls, 1)}<br>Факт: ${fmt(p.factBalls, 1)} · ${STATUS[p.status].label}`;
    g += `<g data-tip="${esc(tip)}">
      <rect class="hit" x="0" y="${y}" width="${W}" height="${rowH}"/>
      <text x="${labelW - 10}" y="${y + 18}" text-anchor="end">${esc(p.name.split(" — ")[0])}</text>
      <rect x="${labelW}" y="${y + 6}" width="${x(p.targetBalls) - labelW}" height="18" rx="4" fill="var(--idle-soft)"/>
      ${p.carryBalls ? `<rect x="${x(p.baseBalls)}" y="${y + 6}" width="${x(p.targetBalls) - x(p.baseBalls)}" height="18" rx="4" fill="url(#hatch)"/>` : ""}
      ${p.factBalls ? `<rect class="mark" x="${labelW}" y="${y + 9}" width="${Math.max(2, x(p.factBalls) - labelW)}" height="12" rx="4" fill="${STATUS[p.status].color}"/>` : ""}
      ${p.expectedBalls > 0 ? `<line x1="${x(p.expectedBalls)}" x2="${x(p.expectedBalls)}" y1="${y + 3}" y2="${y + 27}" stroke="var(--ink)" stroke-width="2"/>` : ""}
      <text x="${W - 4}" y="${y + 18}" text-anchor="end"><tspan style="font-weight:600;fill:var(--ink)">${fmt(p.factBalls, 0)}</tspan> / ${fmt(p.targetBalls, 0)}</text>
    </g>`;
  });
  return `<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="План и факт лидобалов по продуктам">
    <defs><pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="var(--warn-soft)"/><line x1="0" y1="0" x2="0" y2="6" stroke="var(--warn)" stroke-width="2"/></pattern></defs>${g}</svg></div>
    <div class="legend"><span><i class="dot" style="background:var(--idle-soft);border:1px solid var(--line)"></i>план месяца</span><span><i class="dot" style="background:url(#)"></i><svg width="14" height="10"><rect width="14" height="10" rx="2" fill="var(--warn-soft)" stroke="var(--warn)"/></svg> перенос недостачи</span><span><svg width="14" height="10"><line x1="7" x2="7" y1="0" y2="10" stroke="var(--ink)" stroke-width="2"/></svg> ожидаемо к сегодня</span><span>заливка — факт (цвет = статус)</span></div>`;
}

/** Структура плана лидобалов по типам лидов — одна полоса со стопкой. */
function typeStack(byType) {
  const items = Object.entries(byType).filter(([, v]) => v > 0);
  const total = items.reduce((a, [, v]) => a + v, 0);
  if (!total) return '<div class="empty">Нет плана</div>';
  const W = 760;
  let x = 0;
  let g = "";
  for (const [id, v] of items) {
    const w = (v / total) * W;
    g += `<rect data-tip="${esc(`<b>${esc(typeName(id))}</b><br>${fmt(v, 1)} лидобалов · ${pct(v / total)}`)}" x="${x + 1}" y="0" width="${Math.max(0, w - 2)}" height="26" rx="4" fill="${typeColor(id)}"/>`;
    x += w;
  }
  return `<div class="chart"><svg viewBox="0 0 ${W} 26" role="img" aria-label="Лидобалы по типам лидов">${g}</svg></div>
  <div class="legend">${items.map(([id, v]) => `<span><i class="dot" style="background:${typeColor(id)}"></i>${esc(typeName(id))} — <b>${fmt(v, 1)}</b> <span class="muted">(${pct(v / total)})</span></span>`).join("")}</div>`;
}

/** Набор по месяцам: столбец плана (база + перенос) и столбец факта. */
function seasonChart(months, current) {
  const W = 760;
  const H = 220;
  const top = 10;
  const bottom = 30;
  const left = 36;
  const max = Math.max(1, ...months.map((m) => Math.max(m.targetBalls, m.factBalls || 0, m.factContracts || 0))) * 1.1;
  const y = (v) => H - bottom - (v / max) * (H - top - bottom);
  const slot = (W - left) / months.length;
  const bw = Math.min(26, slot / 3.2);
  let g = "";
  const ticks = 4;
  for (let i = 0; i <= ticks; i++) {
    const v = (max / ticks) * i;
    g += `<line class="gridl" x1="${left}" x2="${W}" y1="${y(v)}" y2="${y(v)}"/><text class="axis" x="${left - 6}" y="${y(v) + 4}" text-anchor="end">${fmt(v)}</text>`;
  }
  months.forEach((m, i) => {
    const cx = left + slot * i + slot / 2;
    const bx = cx - bw - 2;
    const fx = cx + 2;
    const tip = `<b>${monthName(m.month)}</b><br>План договоров: ${fmt(m.planContracts)}<br>План лидобалов: ${fmt(m.baseBalls, 1)}${m.carryBalls ? ` + перенос ${fmt(m.carryBalls, 1)}` : ""}<br>Факт лидобалов: ${fmt(m.factBalls, 1)}<br>Факт договоров: ${fmt(m.factContracts)}<br>${STATUS[m.status].label}${m.pace != null ? " · темп " + pct(m.pace) : ""}`;
    g += `<g data-tip="${esc(tip)}"><rect class="hit" x="${cx - slot / 2}" y="${top}" width="${slot}" height="${H - top}"/>`;
    if (m.baseBalls > 0) g += `<rect x="${bx}" y="${y(m.baseBalls)}" width="${bw}" height="${y(0) - y(m.baseBalls)}" rx="4" fill="var(--s1)"/>`;
    if (m.carryBalls > 0) g += `<rect x="${bx}" y="${y(m.targetBalls)}" width="${bw}" height="${y(m.baseBalls) - y(m.targetBalls) - 2}" rx="4" fill="var(--s2)"/>`;
    if (m.factBalls > 0) g += `<rect x="${fx}" y="${y(m.factBalls)}" width="${bw}" height="${y(0) - y(m.factBalls)}" rx="4" fill="${STATUS[m.status === "future" ? "nodata" : m.status].color}"/>`;
    if (m.factContracts > 0) g += `<line x1="${bx - 4}" x2="${fx + bw + 4}" y1="${y(m.factContracts)}" y2="${y(m.factContracts)}" stroke="var(--ink)" stroke-width="2.5" stroke-linecap="round"/>`;
    g += `<text x="${cx}" y="${H - 10}" text-anchor="middle" style="${m.month === current ? "font-weight:700;fill:var(--ink)" : ""}">${monthShort(m.month)}</text></g>`;
  });
  g += `<line class="base" x1="${left}" x2="${W}" y1="${y(0)}" y2="${y(0)}"/>`;
  return `<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="План и факт лидобалов по месяцам набора">${g}</svg></div>
  <div class="legend"><span><i class="dot" style="background:var(--s1)"></i>план месяца (договоры × норма)</span><span><i class="dot" style="background:var(--s2)"></i>перенос недостачи</span><span><i class="dot" style="background:var(--good)"></i><i class="dot" style="background:var(--warn)"></i><i class="dot" style="background:var(--bad)"></i>факт лидобалов (цвет = статус)</span><span><svg width="16" height="10"><line x1="1" x2="15" y1="5" y2="5" stroke="var(--ink)" stroke-width="2.5" stroke-linecap="round"/></svg> факт договоров (CRM)</span></div>`;
}

// ---------- shell ----------
function shell(active, inner) {
  const isAdmin = S.me.role === "admin";
  const links = [
    ["#/", isAdmin ? "Все филиалы" : "Мои филиалы", "home"],
    ...(isAdmin
      ? [
          ["#/admin/import", "Импорт", "import"],
          ["#/admin/branches", "Филиалы", "branches"],
          ["#/admin/users", "Доступы", "users"],
          ["#/admin/settings", "Настройки", "settings"],
        ]
      : []),
  ];
  $app.innerHTML = `
  <header class="top"><div class="top-in">
    <a class="logo" href="#/"><i><svg width="16" height="16" viewBox="0 0 16 16"><path d="M2 12l4-5 3 2.5L14 3" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></i>План лидобалов</a>
    <nav class="nav">${links.map(([h, t, k]) => `<a href="${h}" class="${k === active ? "on" : ""}">${t}</a>`).join("")}</nav>
    <span class="spacer"></span>
    <span class="upd" id="upd"></span>
    <span class="who"><span class="uname">${esc(S.me.name)}</span> <span class="chip">${isAdmin ? "админ" : "маркетолог"}</span>
    <button class="btn ghost sm" id="pw">Пароль</button><button class="btn ghost sm" id="logout">Выйти</button></span>
  </div></header>
  <main>${inner}</main>`;
  document.getElementById("logout").onclick = async () => {
    await api("/api/logout", { method: "POST" });
    S.me = null;
    renderLogin();
  };
  document.getElementById("pw").onclick = changePassword;
  showStatus();
}

async function showStatus() {
  const el = document.getElementById("upd");
  if (!el) return;
  try {
    const st = await api("/api/status");
    S.status = st;
    const t = st.updatedAt ? new Date(st.updatedAt) : null;
    const today = t && t.toDateString() === new Date().toDateString();
    const label = t ? (today ? "сегодня " : t.toLocaleDateString("ru-RU", { day: "numeric", month: "short" }) + " ") + t.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }) : "нет данных";
    const fbErr = Object.entries(st.lastRefresh?.fb || {}).filter(([, v]) => v !== "ok");
    const tip = [
      st.refreshMinutes ? `Автообновление каждые ${st.refreshMinutes % 60 ? st.refreshMinutes + " мин." : st.refreshMinutes / 60 + " ч."}` : "Автообновление не настроено (нет META_ACCESS_TOKEN / CRM_SNAPSHOT_URL)",
      st.lastRefresh ? `Последний прогон: ${new Date(st.lastRefresh.at).toLocaleString("ru-RU")}` : "",
      st.lastRefresh?.crm ? `CRM: ${st.lastRefresh.crm}` : "",
      fbErr.length ? `Ошибки FB: ${fbErr.map(([k, v]) => `${k}: ${v}`).join("; ")}` : "",
    ].filter(Boolean).join("<br>");
    el.innerHTML = `<i class="live ${today ? "on" : ""}"></i>Данные: ${esc(label)}${S.me.role === "admin" ? ' <button class="btn ghost sm" id="refreshNow" title="Обновить сейчас">↻</button>' : ""}`;
    el.setAttribute("data-tip", esc(tip));
    const rb = document.getElementById("refreshNow");
    if (rb)
      rb.onclick = async () => {
        rb.disabled = true;
        try {
          await api("/api/refresh", { method: "POST" });
          toast("Данные обновлены");
          route();
        } catch (e) {
          toast(e.message, true);
          rb.disabled = false;
        }
      };
  } catch {}
}

// Живой отчёт: каждые 5 минут перерисовываем текущую страницу (кроме форм ввода и открытых окон).
setInterval(() => {
  if (!S.me || document.hidden || document.querySelector("dialog[open]")) return;
  if (/\/input$|\/admin\//.test(location.hash)) return;
  route();
}, 5 * 60 * 1000);

const monthNav = () => `<div class="monthnav"><button data-m="-1" aria-label="Предыдущий месяц">‹</button><b>${monthName(S.month)}</b><button data-m="1" aria-label="Следующий месяц">›</button></div>`;
function bindMonthNav() {
  document.querySelectorAll(".monthnav button").forEach((b) => (b.onclick = () => setMonth(addMonths(S.month, Number(b.dataset.m)))));
}

function renderLogin() {
  $app.innerHTML = `<div class="login"><form class="card" id="lf">
    <h1>План лидобалов</h1><p class="muted" style="margin:0 0 18px">Планы по лидам, лидобалам и бюджету для маркетологов филиалов</p>
    <div class="grid" style="gap:12px">
      <label class="f">Логин<input type="text" name="login" autocomplete="username" required></label>
      <label class="f">Пароль<input type="password" name="password" autocomplete="current-password" required></label>
      <button class="btn primary">Войти</button>
    </div></form></div>`;
  document.getElementById("lf").onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await api("/api/login", { method: "POST", body: Object.fromEntries(fd) });
      await boot();
    } catch (er) {
      toast(er.message, true);
    }
  };
}

function changePassword() {
  const d = document.createElement("dialog");
  d.innerHTML = `<form method="dialog" class="grid" style="gap:12px"><h2 style="margin:0">Смена пароля</h2>
    <label class="f">Текущий пароль<input type="password" name="oldPassword" required></label>
    <label class="f">Новый пароль (мин. 8 символов)<input type="password" name="newPassword" minlength="8" required></label>
    <div class="row-actions"><button class="btn primary" value="ok">Сохранить</button><button class="btn" value="cancel" formnovalidate>Отмена</button></div></form>`;
  document.body.append(d);
  d.showModal();
  d.querySelector("form").onsubmit = async (e) => {
    if (e.submitter?.value !== "ok") return d.remove();
    e.preventDefault();
    try {
      await api("/api/me/password", { method: "POST", body: Object.fromEntries(new FormData(e.target)) });
      toast("Пароль изменён");
      d.remove();
    } catch (er) {
      toast(er.message, true);
    }
  };
}

// ---------- overview ----------
async function renderOverview() {
  shell("home", '<div class="empty">Загрузка…</div>');
  const data = await api(`/api/overview?month=${S.month}`);
  const rows = data.branches;
  if (rows.length === 1 && S.me.role !== "admin") {
    location.hash = `#/b/${rows[0].id}`;
    return;
  }
  const active = rows.filter((r) => r.status !== "future");
  const fails = rows.filter((r) => r.status === "fail");
  const risks = rows.filter((r) => r.status === "risk");
  const nodata = rows.filter((r) => r.status === "nodata");
  const sum = (k) => rows.reduce((a, r) => a + (r[k] || 0), 0);
  const fact = sum("factBalls");
  const expected = rows.filter((r) => r.factBalls != null).reduce((a, r) => a + r.expectedBalls, 0);
  const netPace = expected > 0 ? fact / expected : null;
  const curs = [...new Set(rows.map((r) => r.currency))];
  const missingBudget = rows.filter((r) => r.budgetMissing).length;
  const budget = curs.length > 1 ? "разные валюты" : missingBudget === rows.length ? "—" : money(sum("budget"), curs[0]);
  const spent = curs.length === 1 ? money(sum("spentMtd"), curs[0]) : "—";
  const seasonPlan = rows.reduce((a, r) => a + (r.season.seasonPlanContracts || 0), 0);
  const seasonFact = rows.reduce((a, r) => a + (r.season.factContracts || 0), 0);

  const inner = `
  <div class="head"><div><div class="crumbs">${esc(data.season.name)}</div><h1>${S.me.role === "admin" ? "Все филиалы" : "Мои филиалы"}</h1>
    <div class="sub">Темп выполнения плана по лидобалам на сегодня. Провальные филиалы — сверху.</div></div>
    <span class="spacer"></span>${monthNav()}
    ${S.me.role === "admin" && S.me.metaConfigured ? '<button class="btn" id="fbAll">Обновить FB по всем</button>' : ""}</div>

  <div class="grid kpis">
    <div class="card kpi ${fails.length ? "alert" : ""}"><div class="label">Филиалы в провале</div>
      <div class="value" style="color:${fails.length ? "var(--bad-ink)" : "inherit"}">${fails.length} <small>из ${active.length}</small></div>
      <div class="foot">${risks.length} в зоне риска · ${nodata.length} без факта</div></div>
    <div class="card kpi"><div class="label">Лидобалы сети: факт / ожидаемо</div>
      <div class="value">${nodata.length === active.length ? "—" : fmt(fact)} <small>/ ${nodata.length === active.length ? "—" : fmt(expected)}</small></div>
      <div class="foot">Темп сети ${pct(netPace)} · план месяца ${fmt(sum("targetBalls"))}</div>
      <div class="bar-mini"><i style="width:${Math.min(100, (netPace || 0) * 100)}%;background:${netPace == null ? "var(--idle)" : netPace >= S.settings.thresholds.ok ? "var(--good)" : netPace >= S.settings.thresholds.risk ? "var(--warn)" : "var(--bad)"}"></i></div></div>
    <div class="card kpi"><div class="label">План договоров месяца</div>
      <div class="value">${fmt(sum("planContracts"))}</div>
      <div class="foot">Перенос недостачи: +${fmt(sum("carryBalls"))} лидобалов</div></div>
    <div class="card kpi"><div class="label">Бюджет месяца (прогноз)</div>
      <div class="value">${budget}</div><div class="foot">${missingBudget ? `без CPL: ${missingBudget} фил. · ` : ""}потрачено в FB: ${spent}</div></div>
    <div class="card kpi"><div class="label">Набор: договоры</div>
      <div class="value">${fmt(seasonFact)} <small>/ ${fmt(seasonPlan || null)}</small></div>
      <div class="foot">${seasonPlan ? pct(seasonFact / seasonPlan) + " плана набора" : "план набора не загружен"}</div></div>
  </div>

  ${nodata.length ? `<div class="alerts"><div class="alert-row info">Нет факта лидобалов за ${monthName(S.month).toLowerCase()} по ${nodata.length} фил. — ${S.me.role === "admin" ? '<a href="#/admin/import">загрузите выгрузку отчёта CRM «Маркетинг → Лидобалы»</a>' : "администратор загрузит отчёт CRM «Маркетинг → Лидобалы»"}. Без факта статус и перенос недостачи не считаются.</div></div>` : ""}
  ${fails.length ? `<div class="alerts">${fails.map((r) => `<a class="alert-row bad" href="#/b/${r.id}"><b>${esc(r.name)}</b> — провал по лидобалам: ${fmt(r.factBalls, 1)} из ожидаемых ${fmt(r.expectedBalls, 1)} (темп ${pct(r.pace)}), не хватает ${fmt(r.gapBalls, 1)} лидобалов.</a>`).join("")}</div>` : ""}

  <div class="grid cols-2">
    <div class="card"><h2>Темп по лидобалам</h2><div class="hint">Нажмите на филиал, чтобы открыть детальный план</div>
      ${paceChart(active, { onClickHref: (r) => `#/b/${r.id}` })}</div>
    <div class="card"><h2>Филиалы</h2><div class="hint">Месяцы набора: цвет — статус месяца</div>
      <div class="tbl-wrap"><table><thead><tr><th>Филиал</th><th>Статус</th><th class="n">План ЛБ</th><th class="n">Факт</th><th class="n">Темп</th><th>Набор</th></tr></thead><tbody>
      ${rows.map((r) => `<tr class="click ${r.status}" onclick="location.hash='#/b/${r.id}'"><td><b>${esc(r.name)}</b>${r.warnings ? ` <span class="chip" data-tip="Есть предупреждения — откройте филиал">!</span>` : ""}</td>
        <td>${pill(r.status)}</td><td class="n">${fmt(r.targetBalls)}${r.carryBalls ? `<div class="muted" style="font-size:12px">+${fmt(r.carryBalls)} перенос</div>` : ""}</td>
        <td class="n">${fmt(r.factBalls, 1)}</td><td class="n"><b>${pct(r.pace)}</b></td>
        <td><div class="months">${r.seasonMonths.map((m) => `<i class="${m.status} ${m.month === S.month ? "cur" : ""}" data-tip="${esc(`${monthName(m.month)}: ${STATUS[m.status].label}${m.pace != null ? ", темп " + pct(m.pace) : ""}`)}"></i>`).join("")}</div></td></tr>`).join("")}
      </tbody></table></div></div>
  </div>

  <div class="card mt"><h2>Сводка по филиалам</h2><div class="hint">Лидобалы, лиды и бюджет на месяц</div>
    <div class="tbl-wrap"><table><thead><tr><th>Филиал</th><th class="n">План дог.</th><th class="n">Факт дог.</th><th class="n">План ЛБ</th><th class="n">Ожид. к сегодня</th><th class="n">Факт ЛБ</th><th class="n">Отставание</th><th class="n">Лиды нужно</th><th class="n">Регистрации</th><th class="n">Бюджет</th><th class="n">Расход FB</th><th class="n">Прогноз расхода</th></tr></thead><tbody>
    ${rows.map((r) => `<tr class="click ${r.status}" onclick="location.hash='#/b/${r.id}'"><td>${esc(r.name)}</td><td class="n">${fmt(r.planContracts)}</td><td class="n">${fmt(r.factContracts)}</td><td class="n">${fmt(r.targetBalls, 1)}</td><td class="n">${fmt(r.expectedBalls, 1)}</td><td class="n">${fmt(r.factBalls, 1)}</td><td class="n ${r.gapBalls > 0 ? "neg" : ""}">${r.gapBalls ? "−" + fmt(r.gapBalls, 1) : "—"}</td><td class="n">${fmt(r.leads)}</td><td class="n">${fmt(r.registrations)}</td><td class="n">${r.budgetMissing ? '<span class="muted" data-tip="Нет CPL — подключите FB или задайте CPL">—</span>' : money(r.budget, r.currency)}</td><td class="n">${money(r.spentMtd, r.currency)}</td><td class="n">${money(r.projectedSpend, r.currency)}</td></tr>`).join("")}
    </tbody></table></div></div>`;
  shell("home", inner);
  bindMonthNav();
  const fb = document.getElementById("fbAll");
  if (fb)
    fb.onclick = async () => {
      fb.disabled = true;
      fb.textContent = "Обновляю…";
      try {
        const r = await api(`/api/fb-refresh-all?month=${S.month}`, { method: "POST" });
        const bad = Object.entries(r).filter(([, v]) => v !== "ok");
        toast(bad.length ? `Ошибки: ${bad.map(([k, v]) => `${k}: ${v}`).join("; ")}` : "Данные FB обновлены", !!bad.length);
        renderOverview();
      } catch (e) {
        toast(e.message, true);
        fb.disabled = false;
      }
    };
}

// ---------- branch ----------
async function renderBranch(id, tab = "dash") {
  shell("home", '<div class="empty">Загрузка…</div>');
  const data = await api(`/api/branches/${id}?month=${S.month}`);
  const { branch, season, inputs } = data;
  const r = season.month;
  const t = r.totals;
  const cur = r.currency;
  const tabs = [
    ["dash", "Дашборд"],
    ["plan", "План по продуктам"],
    ["events", `Ивенты${r.events.length ? ` (${r.events.length})` : ""}`],
    ["season", "Набор"],
    ...(data.canEdit ? [["input", "Ввод данных"]] : []),
  ];
  const fbInfo = r.fb
    ? `FB: ${new Date(r.fb.fetchedAt).toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" })} · CPL кабинета ${money(r.fb.cpl, cur)} за ${r.fb.period.since} – ${r.fb.period.until}`
    : "FB-кабинет не подключён";

  let body = "";
  if (tab === "dash") body = branchDash(r, season, cur);
  if (tab === "plan") body = branchPlan(r, cur);
  if (tab === "events") body = branchEvents(r, inputs, cur);
  if (tab === "season") body = branchSeason(season, inputs);
  if (tab === "input") body = branchInput(r, inputs, branch, season);

  shell(
    "home",
    `<div class="head"><div><div class="crumbs"><a href="#/">${S.me.role === "admin" ? "Все филиалы" : "Мои филиалы"}</a> / ${esc(season.season.name)}</div>
      <h1>${esc(branch.name)} ${pill(t.status)}</h1><div class="sub">${esc(fbInfo)}</div></div>
      <span class="spacer"></span>${monthNav()}
      ${branch.adAccountId && S.me.metaConfigured ? '<button class="btn" id="fbRef">Обновить из FB</button>' : ""}
      <a class="btn" href="/api/branches/${id}/export.csv?month=${S.month}">Скачать CSV</a></div>
    <nav class="tabs">${tabs.map(([k, n]) => `<a href="#/b/${id}/${k}" class="${k === tab ? "on" : ""}">${n}</a>`).join("")}</nav>
    ${r.warnings.length ? `<div class="alerts">${r.warnings.map((w) => `<div class="alert-row">${esc(w)}</div>`).join("")}</div>` : ""}
    ${body}`,
  );
  bindMonthNav();
  const fb = document.getElementById("fbRef");
  if (fb)
    fb.onclick = async () => {
      fb.disabled = true;
      fb.textContent = "Обновляю…";
      try {
        await api(`/api/branches/${id}/fb-refresh?month=${S.month}`, { method: "POST" });
        toast("Данные FB обновлены");
        renderBranch(id, tab);
      } catch (e) {
        toast(e.message, true);
        fb.disabled = false;
        fb.textContent = "Обновить из FB";
      }
    };
  bindBranch(id, tab, data);
}

function branchDash(r, season, cur) {
  const t = r.totals;
  const byType = {};
  for (const p of r.products) for (const x of p.byType) byType[x.typeId] = (byType[x.typeId] || 0) + x.balls;
  const evType = S.settings.leadTypes.find((x) => x.kind === "event");
  if (evType && t.eventBalls) byType[evType.id] = t.eventBalls;
  const st = t.status;
  const needPerDay = r.daysLeft > 0 && t.factBalls != null ? Math.max(0, t.targetBalls - t.factBalls) / r.daysLeft : null;
  return `
  <div class="grid kpis">
    <div class="card kpi"><div class="label">План лидобалов на месяц</div><div class="value">${fmt(t.targetBalls, 1)}</div>
      <div class="foot">${fmt(t.planContracts)} дог. × ${pct(S.settings.ballsPlanFactor)}${t.carryBalls ? ` + перенос ${fmt(t.carryBalls, 1)}` : ""}</div></div>
    <div class="card kpi ${st === "fail" ? "alert" : ""}"><div class="label">Факт лидобалов</div><div class="value">${fmt(t.factBalls, 1)} <small>/ ${fmt(t.expectedBalls, 1)} ожид.</small></div>
      <div class="foot">${pill(st)} темп ${pct(t.pace)}</div>
      <div class="bar-mini"><i style="width:${Math.min(100, ((t.factBalls || 0) / (t.targetBalls || 1)) * 100)}%;background:${STATUS[st].color}"></i></div></div>
    <div class="card kpi"><div class="label">Нужно в день до конца месяца</div><div class="value">${fmt(needPerDay, 1)}</div>
      <div class="foot">лидобалов · осталось ${r.daysLeft} дн.</div></div>
    <div class="card kpi"><div class="label">Бюджет на месяц (прогноз)</div><div class="value">${money(t.budget, cur)}</div>
      <div class="foot">продукты ${money(t.productBudget, cur)} · ивенты ${money(t.eventBudget, cur)}</div></div>
    <div class="card kpi"><div class="label">Расход FB в этом месяце</div><div class="value">${money(t.spentMtd, cur)}</div>
      <div class="foot">${t.budgetPace != null ? `темп расхода ${pct(t.budgetPace)} · ` : ""}${t.dailyBudgetLeft != null ? `${money(t.dailyBudgetLeft, cur)}/день осталось` : "нет данных FB за месяц"}</div></div>
  </div>
  <div class="grid cols-2">
    <div class="card"><h2>План и факт по продуктам</h2><div class="hint">Лидобалы месяца, включая перенос недостачи</div>${planFactChart(r.products)}</div>
    <div class="card"><h2>Набор: ${esc(season.season.name)}</h2><div class="hint">Недостача закрытого месяца переносится в следующий</div>${seasonChart(season.months, r.month)}</div>
  </div>
  <div class="card mt"><h2>Откуда берём лидобалы</h2><div class="hint">План по типам лидов (доли — вклад источников; события — по плану регистраций)</div>${typeStack(byType)}</div>
  <div class="card mt"><h2>Коротко по продуктам</h2><div class="tbl-wrap"><table><thead><tr><th>Продукт</th><th>Статус</th><th class="n">План дог.</th><th class="n">Факт дог.</th><th class="n">План ЛБ</th><th class="n">Факт ЛБ</th><th class="n">Лидов нужно</th><th class="n">CPL</th><th class="n">Бюджет</th><th class="n">Расход FB</th></tr></thead><tbody>
  ${r.products.map((p) => `<tr class="${p.status}"><td>${esc(p.name)}</td><td>${pill(p.status)}</td><td class="n">${fmt(p.planContracts)}</td><td class="n">${fmt(p.factContracts)}</td><td class="n">${fmt(p.targetBalls, 1)}</td><td class="n">${fmt(p.factBalls, 1)}</td><td class="n">${fmt(p.leads)}</td><td class="n" data-tip="${esc(SRC[p.cplSource] || "")}">${money(p.cpl, cur)}</td><td class="n">${money(p.budget, cur)}</td><td class="n">${money(p.spentMtd, cur)}</td></tr>`).join("")}
  </tbody></table></div></div>`;
}

function branchPlan(r, cur) {
  const types = S.settings.leadTypes.filter((t) => t.kind !== "event");
  return `<div class="card"><h2>План по продуктам и типам лидов</h2>
  <div class="hint">Лидов = лидобалы типа ÷ норма конверсии типа. Бюджет — только по платным типам (CPL из FB-кабинета города). Нажмите на продукт, чтобы раскрыть типы.</div>
  <div class="tbl-wrap"><table><thead><tr><th>Продукт / тип лида</th><th class="n">План дог.</th><th class="n">Доля</th><th class="n">Норма</th><th class="n">Перенос</th><th class="n">Из ивентов</th><th class="n">Лидобалы</th><th class="n">Лиды</th><th class="n">CPL</th><th class="n">Бюджет</th><th class="n">Факт ЛБ</th><th class="n">Темп</th></tr></thead><tbody>
  ${r.products
    .map((p) => {
      const open = S.expanded.has(p.id);
      return `<tr class="click ${p.status}" data-exp="${p.id}"><td><b>${open ? "▾" : "▸"} ${esc(p.name)}</b><div class="muted" style="font-size:12px">${pct(p.factor)} плана · доли: ${esc(SRC[p.mixSource])} · CPL: ${esc(SRC[p.cplSource] || "нет")}${p.fb ? ` · FB ${S.settings.cplLookbackDays} дн.: ${money(p.fb.spend, cur)} / ${fmt(p.fb.leads)} лидов` : ""}</div></td>
      <td class="n">${fmt(p.planContracts)}</td><td></td><td></td><td class="n">${p.carryBalls ? "+" + fmt(p.carryBalls, 1) : "—"}</td><td class="n">${p.eventBalls ? fmt(p.eventBalls, 1) : "—"}</td>
      <td class="n"><b>${fmt(p.targetBalls, 1)}</b></td><td class="n"><b>${fmt(p.leads)}</b></td><td class="n">${money(p.cpl, cur)}</td><td class="n"><b>${money(p.budget, cur)}</b></td><td class="n">${fmt(p.factBalls, 1)}</td><td class="n">${pill(p.status)} ${pct(p.pace)}</td></tr>
      ${open ? p.byType.map((x) => `<tr class="sub"><td style="padding-left:28px"><i class="dot" style="background:${typeColor(x.typeId)}"></i>${esc(typeName(x.typeId))}${x.paid ? "" : ' <span class="chip">органика</span>'}</td><td></td><td class="n">${pct(x.share)}</td><td class="n">${fmt(x.norm, 3)}</td><td></td><td></td><td class="n">${fmt(x.balls, 1)}</td><td class="n">${fmt(x.leads)}</td><td class="n">${x.paid ? money(x.cpl, cur) : "—"}</td><td class="n">${x.paid ? money(x.budget, cur) : "—"}</td><td></td><td></td></tr>`).join("") : ""}`;
    })
    .join("")}
  <tr class="total"><td>Итого продукты</td><td class="n">${fmt(r.totals.planContracts)}</td><td></td><td></td><td class="n">${fmt(r.totals.carryBalls, 1)}</td><td class="n">${fmt(r.totals.eventBalls, 1)}</td><td class="n">${fmt(r.totals.targetBalls, 1)}</td><td class="n">${fmt(r.totals.leads)}</td><td></td><td class="n">${money(r.totals.productBudget, cur)}</td><td class="n">${fmt(r.totals.factBalls, 1)}</td><td class="n">${pct(r.totals.pace)}</td></tr>
  </tbody></table></div>
  <details class="help"><summary>Как считается</summary>
  <p>1 лидобал = 1 ожидаемый оплаченный договор. Балл лида = норма конверсии его типа в договор (${types.map((t) => `${esc(t.name.toLowerCase())} ${fmt(t.ball, 2)}`).join(", ")}).</p>
  <p>План лидобалов = план договоров × ${pct(S.settings.ballsPlanFactor)} + недостача прошлых месяцев набора. Из него вычитаются лидобалы ивентов продукта, остаток делится по типам лидов по долям вклада (по умолчанию — вклад прошлого месяца).</p>
  <p>Лиды = лидобалы типа ÷ норма. Бюджет = платные лиды × CPL продукта из FB-кабинета города (расход ÷ лиды кампаний продукта за ${S.settings.cplLookbackDays} дн.).</p></details></div>`;
}

function branchEvents(r, inputs, cur) {
  const prods = S.settings.products;
  const evById = Object.fromEntries(inputs.events.map((e) => [e.id, e]));
  return `<div class="card"><div class="row-actions"><div><h2>Ивенты месяца</h2><div class="hint" style="margin:0">План регистраций → лидобалы (регистрации × норма ${fmt(S.settings.leadTypes.find((t) => t.kind === "event")?.ball, 2)}) → бюджет по цене регистрации</div></div><button class="btn primary right" id="addEv">+ Ивент</button></div>
  ${r.events.length ? `<div class="tbl-wrap mt"><table><thead><tr><th>Ивент</th><th>Дата</th><th>Продукт</th><th class="n">План рег.</th><th class="n">Факт рег.</th><th class="n">Лидобалы</th><th class="n">Цена рег.</th><th class="n">Бюджет</th><th></th></tr></thead><tbody>
  ${r.events.map((e) => `<tr><td><b>${esc(e.name)}</b>${evById[e.id]?.note ? `<div class="muted" style="font-size:12px">${esc(evById[e.id].note)}</div>` : ""}</td><td>${esc(e.date)}</td><td>${esc(prods.find((p) => p.id === e.productId)?.name || "—")}</td>
    <td class="n">${fmt(e.registrations)}${e.registrationsSource === "target" ? ' <span class="chip" data-tip="Рассчитано из цели по лидобалам">из цели</span>' : ""}</td><td class="n">${fmt(e.registrationsFact)}</td><td class="n">${fmt(e.balls, 1)}</td>
    <td class="n" data-tip="${esc(SRC[e.cprSource] || "нет данных")}">${money(e.cpr, cur)}</td><td class="n"><b>${money(e.budget, cur)}</b></td>
    <td class="n"><button class="btn sm" data-edit="${e.id}">Изменить</button></td></tr>`).join("")}
  </tbody></table></div>` : '<div class="empty">В этом месяце ивентов нет. Добавьте ивент — его регистрации войдут в план лидобалов и бюджет.</div>'}</div>`;
}

function eventDialog(id, ev = {}) {
  const prods = S.settings.products;
  const d = document.createElement("dialog");
  d.innerHTML = `<form class="grid" style="gap:12px"><h2 style="margin:0">${ev.id ? "Ивент" : "Новый ивент"}</h2>
  <label class="f">Название<input type="text" name="name" value="${esc(ev.name || "")}" required></label>
  <div class="form-grid">
    <label class="f">Дата<input type="date" name="date" value="${esc(ev.date || S.month + "-15")}" required></label>
    <label class="f">Продукт<select name="productId"><option value="">— общий —</option>${prods.map((p) => `<option value="${p.id}" ${p.id === ev.productId ? "selected" : ""}>${esc(p.name)}</option>`).join("")}</select></label>
    <label class="f">План регистраций<input type="number" min="0" name="registrationsPlan" value="${esc(ev.registrationsPlan ?? "")}"></label>
    <label class="f">или цель, лидобалов<input type="number" min="0" step="0.1" name="targetBalls" value="${esc(ev.targetBalls ?? "")}"></label>
    <label class="f">Факт регистраций<input type="number" min="0" name="registrationsFact" value="${esc(ev.registrationsFact ?? "")}"></label>
    <label class="f">Доля платных рег.<input type="number" min="0" max="1" step="0.05" name="paidShare" value="${esc(ev.paidShare ?? 1)}"></label>
    <label class="f">Цена регистрации (вручную)<input type="number" min="0" step="0.01" name="cprOverride" value="${esc(ev.cprOverride ?? "")}"></label>
    <label class="f">Кампании FB (часть названия)<input type="text" name="fbCampaignPattern" value="${esc(ev.fbCampaignPattern ?? "")}" placeholder="Minecraft"></label>
  </div>
  <label class="f">Заметка<input type="text" name="note" value="${esc(ev.note || "")}"></label>
  <div class="row-actions"><button class="btn primary" value="save">Сохранить</button><button class="btn" value="cancel" formnovalidate>Отмена</button>${ev.id ? '<button class="btn danger right" value="del" formnovalidate>Удалить</button>' : ""}</div></form>`;
  document.body.append(d);
  d.showModal();
  d.querySelector("form").onsubmit = async (e) => {
    e.preventDefault();
    const act = e.submitter?.value;
    if (act === "cancel") return d.remove();
    try {
      if (act === "del") {
        if (!confirm("Удалить ивент?")) return;
        await api(`/api/branches/${id}/events/${ev.id}`, { method: "DELETE" });
      } else {
        const fd = Object.fromEntries(new FormData(e.target));
        for (const k of ["registrationsPlan", "targetBalls", "registrationsFact", "paidShare", "cprOverride"]) fd[k] = fd[k] === "" ? null : Number(fd[k]);
        await api(`/api/branches/${id}/events${ev.id ? "/" + ev.id : ""}`, { method: ev.id ? "PUT" : "POST", body: fd });
      }
      d.remove();
      if (fdMonth(e.target) && fdMonth(e.target) !== S.month) setMonth(fdMonth(e.target));
      else renderBranch(id, "events");
    } catch (er) {
      toast(er.message, true);
    }
  };
}
const fdMonth = (form) => form.date?.value?.slice(0, 7);

function branchSeason(season, inputs) {
  const t = season.totals;
  return `<div class="grid cols-2">
  <div class="card"><h2>${esc(season.season.name)}</h2><div class="hint">План набора из CRM и выполнение по месяцам</div>
    ${seasonChart(season.months, S.month)}</div>
  <div class="card"><h2>Месяцы набора</h2><div class="tbl-wrap"><table><thead><tr><th>Месяц</th><th class="n">План дог.</th><th class="n">Факт дог.</th><th class="n">План ЛБ</th><th class="n">Перенос</th><th class="n">Факт ЛБ</th><th>Статус</th></tr></thead><tbody>
  ${season.months.map((m) => `<tr class="${m.status}"><td style="white-space:nowrap">${m.month === S.month ? "<b>" : ""}${MONTHS[Number(m.month.slice(5)) - 1]}${m.month === S.month ? "</b>" : ""}</td><td class="n">${fmt(m.planContracts)}</td><td class="n">${fmt(m.factContracts)}</td><td class="n">${fmt(m.baseBalls, 1)}</td><td class="n">${m.carryBalls ? "+" + fmt(m.carryBalls, 1) : "—"}</td><td class="n">${fmt(m.factBalls, 1)}</td><td>${pill(m.status)}</td></tr>`).join("")}
  </tbody></table></div></div></div>
  <div class="card mt"><h2>Набор по продуктам</h2><div class="tbl-wrap"><table><thead><tr><th>Продукт</th><th class="n">План набора (CRM)</th><th class="n">Сумма планов месяцев</th><th class="n">Факт договоров</th><th class="n">Выполнение набора</th><th class="n">План ЛБ</th><th class="n">Факт ЛБ</th><th class="n">Бюджет набора</th></tr></thead><tbody>
  ${season.products.map((p) => `<tr><td>${esc(p.name)}</td><td class="n">${fmt(p.seasonPlanContracts)}</td><td class="n">${fmt(p.monthsPlanContracts)}</td><td class="n">${fmt(p.factContracts)}</td><td class="n">${p.seasonPlanContracts ? pct(p.factContracts / p.seasonPlanContracts) : "—"}</td><td class="n">${fmt(p.planBalls, 1)}</td><td class="n">${fmt(p.factBalls, 1)}</td><td class="n">${money(p.budget, season.month.currency)}</td></tr>`).join("")}
  <tr class="total"><td>Итого</td><td class="n">${fmt(t.seasonPlanContracts)}</td><td class="n">${fmt(t.monthsPlanContracts)}</td><td class="n">${fmt(t.factContracts)}</td><td class="n">${t.seasonPlanContracts ? pct(t.factContracts / t.seasonPlanContracts) : "—"}</td><td class="n">${fmt(t.planBalls, 1)}</td><td class="n">${fmt(t.factBalls, 1)}</td><td class="n">${money(t.budget, season.month.currency)}</td></tr>
  </tbody></table></div></div>`;
}

function branchInput(r, inputs, branch, season) {
  const types = S.settings.leadTypes.filter((t) => t.kind !== "event");
  const prods = S.settings.products;
  const plan = inputs.plan.products || {};
  const facts = inputs.facts.products || {};
  const v = (x) => (x == null ? "" : esc(x));
  return `<form id="inForm">
  <div class="card"><div class="row-actions"><div><h2>План месяца</h2><div class="hint" style="margin:0">План договоров (из CRM), доли вклада типов лидов в лидобалы (%) и ручной CPL. Пустые доли — по вкладу прошлого месяца.</div></div>
  <button type="button" class="btn right" id="copyPrev">Доли и CPL из прошлого месяца</button></div>
  <div class="tbl-wrap mt"><table><thead><tr><th>Продукт</th><th class="n">План дог.</th>${types.map((t) => `<th class="n" title="${esc(t.name)}">${esc(t.name.split(" ")[0])} %</th>`).join("")}<th class="n">CPL вручную</th></tr></thead><tbody>
  ${prods.map((p) => `<tr><td>${esc(p.name)}</td><td class="n"><input class="cell" type="number" min="0" name="plan.${p.id}" value="${v(plan[p.id]?.plan)}"></td>
    ${types.map((t) => `<td class="n"><input class="cell" type="number" min="0" step="1" name="mix.${p.id}.${t.id}" value="${plan[p.id]?.mix ? v(Math.round((plan[p.id].mix[t.id] || 0) * 100)) : ""}"></td>`).join("")}
    <td class="n"><input class="cell" type="number" min="0" step="0.01" name="cpl.${p.id}" value="${v(plan[p.id]?.cplOverride)}"></td></tr>`).join("")}
  </tbody></table></div></div>

  <div class="card mt"><h2>Факт месяца</h2><div class="hint">Лидобалы из отчёта CRM «Маркетинг → Лидобалы» (или загрузите выгрузку в «Импорт»). Если лидобалы пустые — считаются из лидов по типам × нормы, для платных типов — из FB.</div>
  <div class="tbl-wrap"><table><thead><tr><th>Продукт</th><th class="n">Договоры</th><th class="n">Лидобалы</th>${types.map((t) => `<th class="n" title="${esc(t.name)}">${esc(t.name.split(" ")[0])}</th>`).join("")}</tr></thead><tbody>
  ${prods.map((p) => `<tr><td>${esc(p.name)}</td><td class="n"><input class="cell" type="number" min="0" name="fc.${p.id}" value="${v(facts[p.id]?.contracts)}"></td><td class="n"><input class="cell" type="number" min="0" step="0.01" name="fb.${p.id}" value="${v(facts[p.id]?.balls)}"></td>
    ${types.map((t) => `<td class="n"><input class="cell" type="number" min="0" name="fl.${p.id}.${t.id}" value="${v(facts[p.id]?.leads?.[t.id])}"></td>`).join("")}</tr>`).join("")}
  </tbody></table></div></div>

  <div class="grid cols-2 mt">
  <div class="card"><h2>План набора (${esc(season.season.name)})</h2><div class="hint">Договоры на полугодие из CRM</div>
    <div class="form-grid">${prods.map((p) => `<label class="f">${esc(p.name)}<input type="number" min="0" name="season.${p.id}" value="${v(inputs.seasonPlan[p.id])}"></label>`).join("")}</div></div>
  <div class="card"><h2>Настройки филиала</h2><div class="form-grid">
    <label class="f">Рекламный кабинет FB (ID)<input type="text" name="b.adAccountId" value="${v(branch.adAccountId)}"></label>
    <label class="f">Валюта кабинета<input type="text" name="b.fbCurrency" value="${v(branch.fbCurrency || "USD")}"></label>
    <label class="f">Коэф. к CPL (сезонность)<input type="number" step="0.01" min="0" name="b.cplAdjust" value="${v(branch.cplAdjust)}" placeholder="1"></label>
    <label class="f">Норма лидобалов от плана<input type="number" step="0.01" min="0" name="b.ballsPlanFactor" value="${v(branch.ballsPlanFactor)}" placeholder="${S.settings.ballsPlanFactor}"></label>
  </div></div></div>
  <div class="row-actions mt"><button class="btn primary">Сохранить</button><span class="muted">Изменения сразу пересчитают план, перенос и бюджет.</span></div></form>`;
}

function bindBranch(id, tab, data) {
  document.querySelectorAll("[data-exp]").forEach(
    (tr) =>
      (tr.onclick = () => {
        const k = tr.dataset.exp;
        S.expanded.has(k) ? S.expanded.delete(k) : S.expanded.add(k);
        renderBranch(id, tab);
      }),
  );
  const add = document.getElementById("addEv");
  if (add) add.onclick = () => eventDialog(id);
  document.querySelectorAll("[data-edit]").forEach((b) => (b.onclick = () => eventDialog(id, data.inputs.events.find((e) => e.id === b.dataset.edit))));
  const cp = document.getElementById("copyPrev");
  if (cp)
    cp.onclick = async () => {
      try {
        await api(`/api/branches/${id}/copy-plan?month=${S.month}`, { method: "POST" });
        toast("Скопировано");
        renderBranch(id, "input");
      } catch (e) {
        toast(e.message, true);
      }
    };
  const form = document.getElementById("inForm");
  if (form)
    form.onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const n = (x) => (x === "" || x == null ? null : Number(x));
      const plan = { products: {} };
      const facts = { products: {} };
      const season = {};
      const b = {};
      const old = data.inputs.plan;
      for (const [k, val] of fd.entries()) {
        const [kind, pid, tid] = k.split(".");
        if (kind === "plan" && n(val) != null) (plan.products[pid] ||= {}).plan = n(val);
        if (kind === "mix" && n(val) != null) ((plan.products[pid] ||= {}).mix ||= {})[tid] = n(val) / 100;
        if (kind === "cpl" && n(val) != null) (plan.products[pid] ||= {}).cplOverride = n(val);
        if (kind === "fc" && n(val) != null) (facts.products[pid] ||= {}).contracts = n(val);
        if (kind === "fb" && n(val) != null) (facts.products[pid] ||= {}).balls = n(val);
        if (kind === "fl" && n(val) != null) ((facts.products[pid] ||= {}).leads ||= {})[tid] = n(val);
        if (kind === "season" && n(val) != null) season[pid] = n(val);
        if (kind === "b") b[pid] = ["cplAdjust", "ballsPlanFactor"].includes(pid) ? n(val) : val;
      }
      if (old.cplAdjust != null) plan.cplAdjust = old.cplAdjust;
      try {
        await api(`/api/branches/${id}/month?month=${S.month}`, { method: "PUT", body: { plan, facts } });
        await api(`/api/branches/${id}/season?month=${S.month}`, { method: "PUT", body: { plan: season } });
        await api(`/api/branches/${id}`, { method: "PUT", body: b });
        toast("Сохранено");
        renderBranch(id, "dash");
      } catch (er) {
        toast(er.message, true);
      }
    };
}

// ---------- admin ----------
async function renderUsers() {
  const [users, branches] = await Promise.all([api("/api/users"), api("/api/branches")]);
  const bname = (id) => branches.find((b) => b.id === id)?.name || id;
  shell(
    "users",
    `<div class="head"><div><h1>Доступы</h1><div class="sub">У каждого маркетолога — свой логин и доступ только к своим городам</div></div><span class="spacer"></span><button class="btn primary" id="addU">+ Пользователь</button></div>
  <div class="card"><div class="tbl-wrap"><table><thead><tr><th>Имя</th><th>Логин</th><th>Роль</th><th>Филиалы</th><th></th></tr></thead><tbody>
  ${users.map((u) => `<tr><td><b>${esc(u.name)}</b>${u.disabled ? ' <span class="chip">отключён</span>' : ""}</td><td>${esc(u.login)}</td><td>${u.role === "admin" ? "администратор" : "маркетолог"}</td><td>${u.role === "admin" ? '<span class="muted">все</span>' : u.branches.map((b) => `<span class="chip">${esc(bname(b))}</span>`).join(" ") || '<span class="neg">не назначены</span>'}</td><td class="n"><button class="btn sm" data-u="${u.id}">Изменить</button></td></tr>`).join("")}
  </tbody></table></div></div>`,
  );
  const dlg = (u = null) => {
    const d = document.createElement("dialog");
    d.innerHTML = `<form class="grid" style="gap:12px"><h2 style="margin:0">${u ? "Пользователь" : "Новый пользователь"}</h2>
    <div class="form-grid"><label class="f">Имя<input type="text" name="name" value="${esc(u?.name || "")}" required></label>
    <label class="f">Логин<input type="text" name="login" value="${esc(u?.login || "")}" ${u ? "disabled" : "required"}></label>
    <label class="f">Роль<select name="role"><option value="marketer">маркетолог</option><option value="admin" ${u?.role === "admin" ? "selected" : ""}>администратор</option></select></label></div>
    <div class="f"><span class="muted" style="font-size:13px">Филиалы (для маркетолога)</span><div style="display:flex;flex-wrap:wrap;gap:6px 14px;max-height:200px;overflow:auto">${branches.map((b) => `<label><input type="checkbox" name="br" value="${b.id}" ${u?.branches.includes(b.id) ? "checked" : ""}> ${esc(b.name)}</label>`).join("")}</div></div>
    ${u ? `<label><input type="checkbox" name="disabled" ${u.disabled ? "checked" : ""}> Отключить доступ</label>` : ""}
    <div class="row-actions"><button class="btn primary" value="save">Сохранить</button><button class="btn" value="cancel" formnovalidate>Отмена</button>${u ? '<button class="btn" value="reset" formnovalidate>Сбросить пароль</button><button class="btn danger right" value="del" formnovalidate>Удалить</button>' : ""}</div></form>`;
    document.body.append(d);
    d.showModal();
    d.querySelector("form").onsubmit = async (e) => {
      e.preventDefault();
      const act = e.submitter?.value;
      if (act === "cancel") return d.remove();
      const f = e.target;
      const body = { name: f.name.value, role: f.role.value, branches: [...f.querySelectorAll("[name=br]:checked")].map((x) => x.value) };
      try {
        let res;
        if (act === "del") {
          if (!confirm("Удалить пользователя?")) return;
          await api(`/api/users/${u.id}`, { method: "DELETE" });
        } else if (u) res = await api(`/api/users/${u.id}`, { method: "PUT", body: { ...body, disabled: f.disabled?.checked, resetPassword: act === "reset" } });
        else res = await api("/api/users", { method: "POST", body: { ...body, login: f.login.value } });
        d.remove();
        if (res?.password) prompt(`Пароль для ${res.login} (передайте маркетологу, больше не покажем):`, res.password);
        renderUsers();
      } catch (er) {
        toast(er.message, true);
      }
    };
  };
  document.getElementById("addU").onclick = () => dlg();
  document.querySelectorAll("[data-u]").forEach((b) => (b.onclick = () => dlg(users.find((u) => u.id === b.dataset.u))));
}

async function renderBranches() {
  const branches = await api("/api/branches");
  shell(
    "branches",
    `<div class="head"><div><h1>Филиалы</h1><div class="sub">Код = alias филиала в CRM; кабинет FB — ID рекламного аккаунта города</div></div></div>
  <div class="card"><div class="tbl-wrap"><table><thead><tr><th>Код</th><th>Название</th><th>Кабинет FB</th><th>Валюта</th><th>Коэф. CPL</th><th></th></tr></thead><tbody>
  ${branches.map((b) => `<tr><td><span class="chip">${esc(b.id)}</span></td><td><a href="#/b/${b.id}">${esc(b.name)}</a>${b.archived ? ' <span class="chip">архив</span>' : ""}</td><td>${esc(b.adAccountId || "—")}</td><td>${esc(b.fbCurrency || "USD")}</td><td>${esc(b.cplAdjust ?? 1)}</td><td class="n"><button class="btn sm" data-arch="${b.id}">${b.archived ? "Вернуть" : "В архив"}</button></td></tr>`).join("")}
  </tbody></table></div>
  <form id="addB" class="form-grid mt"><label class="f">Код (alias CRM)<input type="text" name="id" required placeholder="lv"></label><label class="f">Название<input type="text" name="name" required placeholder="Львов"></label><label class="f">Кабинет FB<input type="text" name="adAccountId" placeholder="1234567890"></label><label class="f">Валюта<input type="text" name="fbCurrency" value="USD"></label><div class="f" style="align-self:end"><button class="btn primary">Добавить филиал</button></div></form></div>`,
  );
  document.getElementById("addB").onsubmit = async (e) => {
    e.preventDefault();
    try {
      await api("/api/branches", { method: "POST", body: Object.fromEntries(new FormData(e.target)) });
      renderBranches();
    } catch (er) {
      toast(er.message, true);
    }
  };
  document.querySelectorAll("[data-arch]").forEach(
    (b) =>
      (b.onclick = async () => {
        const br = branches.find((x) => x.id === b.dataset.arch);
        await api(`/api/branches/${br.id}`, { method: "PUT", body: { archived: !br.archived } });
        renderBranches();
      }),
  );
}

async function renderSettings() {
  const s = S.settings;
  shell(
    "settings",
    `<div class="head"><div><h1>Настройки расчёта</h1><div class="sub">Нормы конверсии (лидобалы за лид), пороги статусов, сопоставление кампаний FB с продуктами</div></div></div>
  <form id="sf">
  <div class="grid cols-2">
  <div class="card"><h2>План и статусы</h2><div class="form-grid">
    <label class="f">Норма лидобалов от плана договоров<input type="number" step="0.01" name="ballsPlanFactor" value="${s.ballsPlanFactor}"></label>
    <label class="f">«В плане» — темп от<input type="number" step="0.01" name="th.ok" value="${s.thresholds.ok}"></label>
    <label class="f">«Риск» — темп от (ниже — провал)<input type="number" step="0.01" name="th.risk" value="${s.thresholds.risk}"></label>
    <label class="f">Окно CPL, дней<input type="number" name="cplLookbackDays" value="${s.cplLookbackDays}"></label>
    <label class="f">Окно цены ивента, дней<input type="number" name="eventLookbackDays" value="${s.eventLookbackDays}"></label>
    <label class="f" style="align-self:end"><span><input type="checkbox" name="carryOver" ${s.carryOver !== false ? "checked" : ""}> Переносить недостачу в следующий месяц</span></label>
  </div></div>
  <div class="card"><h2>Типы лидов и нормы</h2><div class="hint">Норма = доля лидов этого типа, которые становятся оплаченным договором (= лидобалов за 1 лид). Макс. доля — потолок типа в плане лидобалов, излишек уходит на другие типы.</div>
  <table><thead><tr><th>Тип</th><th class="n">Норма</th><th>Платный</th><th>Доля по умолч., %</th><th>Макс. доля, %</th></tr></thead><tbody>
  ${s.leadTypes.map((t) => `<tr><td><i class="dot" style="background:${typeColor(t.id)}"></i>${esc(t.name)}</td><td class="n"><input class="cell" type="number" step="0.001" name="lt.${t.id}.ball" value="${t.ball}"></td><td><input type="checkbox" name="lt.${t.id}.paid" ${t.paid ? "checked" : ""}></td>${t.kind === "event" ? '<td colspan="2"><span class="muted">по плану ивентов</span></td>' : `<td><input class="cell" type="number" step="1" name="mix.${t.id}" value="${Math.round((s.defaultMix[t.id] || 0) * 100)}"></td><td><input class="cell" type="number" step="1" min="0" max="100" name="cap.${t.id}" value="${s.mixCaps?.[t.id] != null ? Math.round(s.mixCaps[t.id] * 100) : ""}" placeholder="—"></td>`}</tr>`).join("")}
  </tbody></table></div></div>
  <div class="card mt"><h2>Продукты и кампании FB</h2><div class="hint">Регулярное выражение по названию кампании (без учёта регистра). Кампании ивентов: <input type="text" name="eventCampaignPattern" value="${esc(s.eventCampaignPattern)}" style="max-width:420px"></div>
  <table><thead><tr><th>Код CRM</th><th>Название</th><th>Шаблон кампаний</th></tr></thead><tbody>
  ${s.products.map((p) => `<tr><td><span class="chip">${esc(p.id)}</span></td><td><input type="text" name="pr.${p.id}.name" value="${esc(p.name)}"></td><td><input type="text" name="pr.${p.id}.campaignPattern" value="${esc(p.campaignPattern || "")}"></td></tr>`).join("")}
  </tbody></table></div>
  <div class="row-actions mt"><button class="btn primary">Сохранить настройки</button></div></form>`,
  );
  document.getElementById("sf").onsubmit = async (e) => {
    e.preventDefault();
    const f = e.target;
    const g = (n) => f.elements[n];
    const next = structuredClone(s);
    next.ballsPlanFactor = Number(g("ballsPlanFactor").value);
    next.thresholds = { ok: Number(g("th.ok").value), risk: Number(g("th.risk").value) };
    next.cplLookbackDays = Number(g("cplLookbackDays").value);
    next.eventLookbackDays = Number(g("eventLookbackDays").value);
    next.carryOver = g("carryOver").checked;
    next.eventCampaignPattern = g("eventCampaignPattern").value;
    for (const t of next.leadTypes) {
      t.ball = Number(g(`lt.${t.id}.ball`).value);
      t.paid = g(`lt.${t.id}.paid`).checked;
      if (g(`mix.${t.id}`)) next.defaultMix[t.id] = Number(g(`mix.${t.id}`).value) / 100;
      if (g(`cap.${t.id}`)) {
        next.mixCaps ||= {};
        if (g(`cap.${t.id}`).value === "") delete next.mixCaps[t.id];
        else next.mixCaps[t.id] = Number(g(`cap.${t.id}`).value) / 100;
      }
    }
    for (const p of next.products) {
      p.name = g(`pr.${p.id}.name`).value;
      p.campaignPattern = g(`pr.${p.id}.campaignPattern`).value;
    }
    try {
      S.settings = await api("/api/settings", { method: "PUT", body: next });
      toast("Настройки сохранены");
    } catch (er) {
      toast(er.message, true);
    }
  };
}

async function renderImport() {
  const branches = await api("/api/branches");
  shell(
    "import",
    `<div class="head"><div><h1>Импорт из CRM</h1><div class="sub">Выгрузка отчёта «Отчёты → Маркетинг → Лидобалы» или планов (CSV / XLSX)</div></div></div>
  <div class="card"><form id="imf" class="grid" style="gap:14px">
    <div class="form-grid">
      <label class="f">Файл<input type="file" name="file" accept=".csv,.xlsx,.txt" required></label>
      <label class="f">Что загружаем<select name="kind"><option value="facts">Факт: лидобалы / лиды / договоры</option><option value="plans">План договоров</option></select></label>
      <label class="f">Месяц (если нет в файле)<input type="text" name="month" value="${S.month}" placeholder="2026-10"></label>
      <label class="f">Филиал (если нет в файле)<select name="branch"><option value="">— из файла —</option>${branches.map((b) => `<option value="${b.id}">${esc(b.name)}</option>`).join("")}</select></label>
    </div>
    <div class="row-actions"><button class="btn" value="dry">Проверить</button><button class="btn primary" value="go">Загрузить</button></div>
  </form>
  <details class="help"><summary>Какие колонки понимает импорт</summary>
  <p>Заголовки распознаются по словам: <b>Филиал/Город</b>, <b>Месяц/Дата</b>, <b>Форма/Направление/Продукт</b> (МА, СТ, СК, Школа… или form_ma), <b>Лидобалы</b>, <b>Договоры</b>, <b>План</b>, <b>Тип/Источник</b> + <b>Лиды</b>, или колонки по типам лидов (Звонки, Сайт, Лид-формы, Мессенджеры, Ивенты, Демо, Визиты).</p>
  <p>Для автоматической загрузки есть <code>POST /api/import</code> с заголовком <code>Authorization: Bearer API_TOKEN</code> (см. README).</p></details>
  <div id="imres"></div></div>`,
  );
  document.getElementById("imf").onsubmit = async (e) => {
    e.preventDefault();
    const f = e.target;
    const file = f.file.files[0];
    if (!file) return;
    const q = new URLSearchParams({ filename: file.name, kind: f.kind.value, month: f.month.value, branch: f.branch.value, dry: e.submitter?.value === "dry" ? "1" : "0" });
    try {
      const r = await api(`/api/import/file?${q}`, { method: "POST", raw: await file.arrayBuffer() });
      document.getElementById("imres").innerHTML = `<div class="mt"><div class="alert-row info">${e.submitter?.value === "dry" ? "Проверка" : "Загружено"}: ${r.total} записей. Колонки: ${r.columns.map((c) => `${esc(c.header)} → <b>${c.role ? esc(c.typeId ? typeName(c.typeId) : c.role) : "—"}</b>`).join(", ")}</div>
        ${r.skipped.length ? `<div class="alert-row mt">Пропущено строк: ${r.skipped.length}. ${r.skipped.slice(0, 8).map((s) => `стр. ${s.row}: ${esc(s.reason)}`).join("; ")}</div>` : ""}
        <div class="tbl-wrap mt"><table><thead><tr><th>Филиал</th><th>Месяц</th><th>Продукт</th><th class="n">План</th><th class="n">Договоры</th><th class="n">Лидобалы</th><th>Лиды по типам</th></tr></thead><tbody>
        ${r.records.slice(0, 100).map((x) => `<tr><td>${esc(x.branchId)}</td><td>${esc(x.month)}</td><td>${esc(x.productId)}</td><td class="n">${fmt(x.plan)}</td><td class="n">${fmt(x.contracts)}</td><td class="n">${fmt(x.balls, 2)}</td><td>${Object.entries(x.leads).map(([k, v]) => `${esc(typeName(k))}: ${fmt(v)}`).join(", ")}</td></tr>`).join("")}
        </tbody></table></div></div>`;
      if (e.submitter?.value !== "dry") toast("Импорт выполнен");
    } catch (er) {
      toast(er.message, true);
    }
  };
}

// ---------- router ----------
async function route() {
  if (!S.me) return renderLogin();
  const h = location.hash.replace(/^#/, "") || "/";
  try {
    let m;
    if ((m = h.match(/^\/b\/([\w-]+)(?:\/(\w+))?/))) return await renderBranch(m[1], m[2] || "dash");
    if (S.me.role === "admin") {
      if (h === "/admin/users") return await renderUsers();
      if (h === "/admin/branches") return await renderBranches();
      if (h === "/admin/settings") return await renderSettings();
      if (h === "/admin/import") return await renderImport();
    }
    return await renderOverview();
  } catch (e) {
    if (S.me) toast(e.message, true);
  }
}

async function boot() {
  try {
    S.me = await api("/api/me");
    S.settings = await api("/api/settings");
    route();
  } catch {
    renderLogin();
  }
}

window.addEventListener("hashchange", route);
boot();
