// Расход Google Ads: data.googleSpend = { dp: { "2026-10": [[id кабинета, кабинет, валюта, кампания, расход, конверсии, клики], …] } },
// data.googleMeta = { until, loadedAt, rates: { "2026-10": 41.6 } } — курс НБУ (грн за $) для пересчёта гривневых кабинетов.
// Загрузка — scripts/load-google-ads.mjs; кабинеты филиала — branch.googleAccounts.
import { compileRules, classifySpend, DEFAULT_SPEND_RULES } from "./spend.mjs";

export const googleMonths = (data) => [...new Set(Object.values(data.googleSpend || {}).flatMap((m) => Object.keys(m)))].sort();

// В долларах: гривна — по курсу НБУ месяца, доллар — как есть, прочие валюты не пересчитываем (null).
export function toUsd(cost, currency, month, rates = {}) {
  if (currency === "USD") return cost;
  if (currency === "UAH" && rates[month] > 0) return cost / rates[month];
  return null;
}

/** Отчёт за период [from, to]: по филиалам — расход ($ и грн), конверсии, кабинеты → кампании, продукты (по правилам расхода). */
export function googleReport(data, { from, to, branchIds } = {}) {
  const months = googleMonths(data);
  if (!months.length) return null;
  from ||= months.at(-1);
  to ||= months.at(-1);
  if (from > to) [from, to] = [to, from];
  const rates = data.googleMeta?.rates || {};
  const compiled = compileRules(data.settings?.spendRules?.length ? data.settings.spendRules : DEFAULT_SPEND_RULES);
  const branches = [];
  for (const b of data.branches) {
    if (b.archived || (branchIds && !branchIds.includes(b.id))) continue;
    const byMonth = data.googleSpend?.[b.id];
    if (!byMonth) continue;
    const accounts = new Map();
    const products = new Map();
    const t = { usd: 0, uah: 0, conv: 0, clicks: 0, byMonth: {} };
    for (const [m, rows] of Object.entries(byMonth)) {
      if (m < from || m > to) continue;
      for (const [accId, accName, currency, campaign, cost, conv, clicks] of rows) {
        const usd = toUsd(cost, currency, m, rates) ?? 0;
        const uah = currency === "UAH" ? cost : rates[m] > 0 && currency === "USD" ? cost * rates[m] : 0;
        const a = accounts.get(accId) || { id: accId, name: accName, currency, usd: 0, uah: 0, conv: 0, clicks: 0, campaigns: new Map() };
        a.usd += usd;
        a.uah += uah;
        a.conv += conv;
        a.clicks += clicks;
        const c = a.campaigns.get(campaign) || { name: campaign, usd: 0, uah: 0, conv: 0 };
        c.usd += usd;
        c.uah += uah;
        c.conv += conv;
        a.campaigns.set(campaign, c);
        accounts.set(accId, a);
        let p = classifySpend(campaign, compiled);
        if (p === "Не определено" && b.spendDefault) p = b.spendDefault;
        const pr = products.get(p) || { name: p, usd: 0, conv: 0 };
        pr.usd += usd;
        pr.conv += conv;
        products.set(p, pr);
        t.usd += usd;
        t.uah += uah;
        t.conv += conv;
        t.clicks += clicks;
        t.byMonth[m] = (t.byMonth[m] || 0) + usd;
      }
    }
    const fb = Object.entries(data.spend?.[b.id] || {})
      .filter(([m]) => m >= from && m <= to)
      .reduce((s, [, r]) => s + r.reduce((a, x) => a + x[1], 0), 0);
    branches.push({
      id: b.id,
      name: b.name,
      ...t,
      cpa: t.conv > 0 ? t.usd / t.conv : null,
      fb,
      accounts: [...accounts.values()]
        .map((a) => ({ ...a, campaigns: [...a.campaigns.values()].sort((x, y) => y.usd - x.usd) }))
        .sort((x, y) => y.usd - x.usd),
      products: [...products.values()].map((p) => ({ ...p, share: t.usd ? p.usd / t.usd : 0 })).sort((x, y) => (x.name === "Не определено") - (y.name === "Не определено") || y.usd - x.usd),
    });
  }
  branches.sort((a, b) => b.usd - a.usd);
  const sum = (k) => branches.reduce((a, b) => a + (b[k] || 0), 0);
  const network = { usd: sum("usd"), uah: sum("uah"), conv: sum("conv"), clicks: sum("clicks"), fb: sum("fb") };
  network.cpa = network.conv > 0 ? network.usd / network.conv : null;
  const usedRates = Object.fromEntries(Object.entries(rates).filter(([m]) => m >= from && m <= to));
  return { from, to, months, until: data.googleMeta?.until || null, rates: usedRates, network, branches };
}
