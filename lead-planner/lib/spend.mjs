// Расход на рекламу по продуктам: кампании FB → продукт по правилам названия, доли от всех затрат филиала.
// data.spend = { dp: { "2026-10": [["МКА | 31.10.26", 123.4], …] } }, data.spendMeta = { until, source }.

// Правила: первое совпадение побеждает. Ключ до 3 букв — целое слово, длиннее — часть названия.
export const DEFAULT_SPEND_RULES = [
  { name: "Вакансии (HR)", keys: "вакансі, вакансия, пошук викладача" },
  { name: "ШС", keys: "шс" },
  { name: "ПКО (взрослые)", keys: "пко, рпз, рпо, кгід, кгид, мік, mic, ді, ди, дизайн інтер, дизайн интерьер, профоріє, профорие, тест-драйв, тест драйв, qa" },
  { name: "Колледж", keys: "коледж, колледж, college" },
  { name: "Университет", keys: "університет, университет, university, вуз, внз, хту" },
  { name: "Лагеря", keys: "табір, лагер, lager, camp, кемп, лл" },
  { name: "Школа", keys: "школа, school, шкіл" },
  { name: "МКА (дети)", keys: "мка, mka, мк, пу, оу, дцр, kids, roblox, minecraft, майнкрафт, brawl, lego, людина-павук, 99 ночей, gamedev, підготовка до школи, vr, ar" },
  { name: "НМТ", keys: "нмт" },
  { name: "Спецкурсы", keys: "ск, sk, спецкурс, курс, ші, ии, ім, штучний інтелект, ai, аі, python, canva, figma, вайб, 3ds, smm, marketing, маркетинг, маркетолог, digital, анімац, моушн, motion, ui ux, 2d, з нуля до, для бізнесу, кібербезпек, кибербезопас, cybersecurity" },
  { name: "Педагогическая академия", keys: "teacher, педагог" },
  { name: "Ивенты без продукта", keys: "event, ивент, івент, мероприят, захід, двд, дод, demo day, party, вебинар, вебінар, воркшоп" },
];
export const UNMATCHED = "Не определено";

const norm = (s) => String(s || "").toLowerCase().replace(/ё/g, "е");
const tokens = (s) => new Set(norm(s).split(/[^\p{L}\p{N}]+/u).filter(Boolean));

export function compileRules(rules = DEFAULT_SPEND_RULES) {
  return rules.map((r) => ({
    name: r.name,
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

function group(rows, compiled) {
  const by = new Map();
  let total = 0;
  for (const [name, spend] of rows) {
    const p = classifySpend(name, compiled);
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
    all.push(...rows);
    const byMonth = Object.fromEntries(
      Object.entries(data.spend?.[b.id] || {})
        .filter(([m]) => m >= from && m <= to)
        .map(([m, r]) => [m, r.reduce((a, x) => a + x[1], 0)]),
    );
    branches.push({ id: b.id, name: b.name, currency: b.fbCurrency || "USD", hasData: !!data.spend?.[b.id], byMonth, ...group(rows, compiled) });
  }
  branches.sort((a, b) => b.total - a.total);
  return { from, to, months, until: data.spendMeta?.until || null, source: data.spendMeta?.source || null, network: group(all, compiled), branches, rules: compiled.map((r) => r.name).concat(UNMATCHED), ruleDefs };
}
