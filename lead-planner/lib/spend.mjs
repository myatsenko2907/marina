// Расход на рекламу по продуктам: кампании FB → продукт по правилам названия, доли от всех затрат филиала.
// data.spend = { dp: { "2026-10": [["МКА | 31.10.26", 123.4], …] } }, data.spendMeta = { until, source }.

// Правила: первое совпадение побеждает. Ключ до 3 букв — целое слово, длиннее — часть названия.
export const DEFAULT_SPEND_RULES = [
  { name: "Вакансии (HR)", keys: "вакансі, вакансия, пошук викладача" },
  { name: "ШС", productId: "form_schs", keys: "шс" },
  { name: "ПКО (взрослые)", productId: "form_st", keys: "пко, рпз, рпо, кгід, кгид, мік, mic, ді, ди, дизайн інтер, дизайн интерьер, профоріє, профорие, тест-драйв, тест драйв, qa" },
  { name: "Колледж", productId: "form_college", keys: "коледж, колледж, college" },
  { name: "Университет", productId: "form_vuz_11", keys: "університет, университет, university, вуз, внз, хту" },
  { name: "Лагеря", productId: "form_camp", keys: "табір, лагер, lager, camp, кемп, лл" },
  { name: "Школа", productId: "form_school", keys: "школа, school, шкіл" },
  { name: "МКА (дети)", productId: "form_ma", keys: "мка, mka, мк, пу, оу, дцр, kids, roblox, minecraft, майнкрафт, brawl, lego, людина-павук, 99 ночей, gamedev, підготовка до школи, vr, ar" },
  { name: "НМТ", keys: "нмт" },
  { name: "Спецкурсы", productId: "form_year", keys: "ск, sk, спецкурс, курс, ші, ии, ім, штучний інтелект, ai, аі, python, canva, figma, вайб, 3ds, smm, marketing, маркетинг, маркетолог, digital, анімац, моушн, motion, ui ux, 2d, з нуля до, для бізнесу, кібербезпек, кибербезопас, cybersecurity" },
  { name: "Педагогическая академия", keys: "teacher, педагог" },
  { name: "Ивенты без продукта", keys: "event, ивент, івент, мероприят, захід, двд, дод, demo day, party, вебинар, вебінар, воркшоп" },
];
export const UNMATCHED = "Не определено";

const norm = (s) => String(s || "").toLowerCase().replace(/ё/g, "е");
const tokens = (s) => new Set(norm(s).split(/[^\p{L}\p{N}]+/u).filter(Boolean));

export function compileRules(rules = DEFAULT_SPEND_RULES) {
  return rules.map((r) => ({
    name: r.name,
    // продукт CRM для цены лида; у старых сохранённых правил берём из правил по умолчанию
    productId: r.productId !== undefined ? r.productId || null : DEFAULT_SPEND_RULES.find((d) => d.name === r.name)?.productId || null,
    keys: String(r.keys || "")
      .split(",")
      .map((k) => norm(k).trim())
      .filter(Boolean),
  }));
}

export function classifySpend(name, compiled) {
  const n = norm(name);
  const tk = tokens(name);
  for (const r of compiled) for (const k of r.keys) if (k.length <= 3 && !/\s/.test(k) ? tk.has(k) : n.includes(k)) return r.name;
  return UNMATCHED;
}

export const spendMonths = (data) => [...new Set(Object.values(data.spend || {}).flatMap((m) => Object.keys(m)))].sort();

function group(rows, compiled, fallback = null) {
  const by = new Map();
  let total = 0;
  for (const [name, spend, , rowFallback] of rows) {
    let p = classifySpend(name, compiled);
    // продукт филиала по умолчанию для кампаний без продукта в названии (например, Unicorn — школа)
    if (p === UNMATCHED && (rowFallback || fallback)) p = rowFallback || fallback;
    const g = by.get(p) || { name: p, spend: 0, campaigns: new Map() };
    g.spend += spend;
    g.campaigns.set(name, (g.campaigns.get(name) || 0) + spend);
    by.set(p, g);
    total += spend;
  }
  const products = [...by.values()]
    .map((g) => ({
      name: g.name,
      spend: g.spend,
      share: total ? g.spend / total : 0,
      campaigns: [...g.campaigns].map(([name, spend]) => ({ name, spend })).sort((a, b) => b.spend - a.spend),
    }))
    .sort((a, b) => (a.name === UNMATCHED) - (b.name === UNMATCHED) || b.spend - a.spend);
  return { total, products };
}

// Отчёт за период [from, to] (месяцы YYYY-MM) по филиалам, которые видит пользователь.
export function spendReport(data, { from, to, branchIds } = {}) {
  const months = spendMonths(data);
  from ||= months[0];
  to ||= months.at(-1);
  if (from > to) [from, to] = [to, from];
  const ruleDefs = data.settings?.spendRules?.length ? data.settings.spendRules : DEFAULT_SPEND_RULES;
  const compiled = compileRules(ruleDefs);
  const all = [];
  const branches = [];
  for (const b of data.branches) {
    if (b.archived || (branchIds && !branchIds.includes(b.id))) continue;
    const rows = Object.entries(data.spend?.[b.id] || {})
      .filter(([m]) => m >= from && m <= to)
      .flatMap(([, r]) => r);
    all.push(...rows.map(([name, spend]) => [name, spend, null, b.spendDefault || null]));
    const byMonth = Object.fromEntries(
      Object.entries(data.spend?.[b.id] || {})
        .filter(([m]) => m >= from && m <= to)
        .map(([m, r]) => [m, r.reduce((a, x) => a + x[1], 0)]),
    );
    branches.push({ id: b.id, name: b.name, currency: b.fbCurrency || "USD", hasData: !!data.spend?.[b.id], byMonth, ...group(rows, compiled, b.spendDefault) });
  }
  branches.sort((a, b) => b.total - a.total);
  return { from, to, months, until: data.spendMeta?.until || null, source: data.spendMeta?.source || null, network: group(all, compiled), branches, rules: compiled.map((r) => r.name).concat(UNMATCHED), ruleDefs };
}

const prevMonth = (m, n = 1) => {
  const d = new Date(Date.UTC(Number(m.slice(0, 4)), Number(m.slice(5)) - 1 - n, 1));
  return d.toISOString().slice(0, 7);
};

/**
 * Цена лида по продуктам для месяца `month` — по расходу и лидам FB за прошлый месяц.
 * Если у продукта в прошлом месяце меньше minLeads лидов, добавляются более ранние месяцы (до maxBack).
 * Кампании ивентов не учитываются: у ивентов своя цена регистрации.
 * → { form_ma: { cpl, spend, leads, months: ["2026-09"], campaigns }, …, __branch: средняя по филиалу }
 */
export function productCplFor(data, branchId, month, { minLeads = 5, maxBack = 3 } = {}) {
  const byMonth = data.spend?.[branchId];
  if (!byMonth) return null;
  const settings = data.settings || {};
  const branch = data.branches?.find((b) => b.id === branchId);
  const compiled = compileRules(settings.spendRules?.length ? settings.spendRules : DEFAULT_SPEND_RULES);
  const ev = settings.eventCampaignPattern ? new RegExp(settings.eventCampaignPattern, "i") : null;
  const out = {};
  for (let n = 1; n <= maxBack; n++) {
    const m = prevMonth(month, n);
    const rows = (byMonth[m] || []).filter((r) => r.length > 2); // только строки с лидами
    if (!rows.length) continue;
    const agg = {};
    for (const [name, spend, leads] of rows) {
      if (ev && ev.test(name)) continue;
      let rn = classifySpend(name, compiled);
      if (rn === UNMATCHED && branch?.spendDefault) rn = branch.spendDefault;
      const rule = compiled.find((r) => r.name === rn);
      if (!rule?.productId) continue;
      // по продукту и в среднем по филиалу (для продуктов без своей рекламы)
      for (const key of [rule.productId, "__branch"]) {
        const a = (agg[key] ||= { spend: 0, leads: 0, campaigns: 0 });
        a.spend += spend;
        a.leads += leads;
        a.campaigns++;
      }
    }
    for (const [pid, a] of Object.entries(agg)) {
      const o = (out[pid] ||= { spend: 0, leads: 0, campaigns: 0, months: [] });
      if (o.leads >= minLeads) continue; // уже хватает данных из более свежих месяцев
      o.spend += a.spend;
      o.leads += a.leads;
      o.campaigns += a.campaigns;
      o.months.push(m);
    }
  }
  for (const [pid, o] of Object.entries(out)) {
    if (o.leads >= minLeads) o.cpl = o.spend / o.leads;
    else delete out[pid];
  }
  return Object.keys(out).length ? out : null;
}
