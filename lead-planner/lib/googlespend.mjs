// Расход Google Ads: data.googleSpend = { dp: { "2026-10": [[id кабинета, кабинет, валюта, кампания, расход, конверсии, клики, id кампании], …] } },
// data.googleMeta = { until, loadedAt, rates: { "2026-10": 41.6 } } — курс НБУ (грн за $) для пересчёта гривневых кабинетов.
// Загрузка — scripts/load-google-ads.mjs; кабинеты филиала — branch.googleAccounts.
// Заявки и договоры из Google — из истории заявок CRM (outcomes.google, scripts/lead-outcomes.mjs): по utm_campaign = id кампании.
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
    // заявки и договоры из Google по CRM за месяцы периода
    const crm = { leads: 0, contracts: 0, months: [], byCampaign: {} };
    for (const [k, rec] of Object.entries(data.months || {})) {
      const m = k.slice(-7);
      const g = rec.facts?.branch?.outcomes?.google;
      if (!k.startsWith(b.id + "|") || m < from || m > to || !g) continue;
      crm.leads += g.leads;
      crm.contracts += g.contracts;
      crm.months.push(m);
      for (const [cid, v] of Object.entries(g.byCampaign || {})) {
        const x = (crm.byCampaign[cid] ||= { leads: 0, contracts: 0 });
        x.leads += v.leads;
        x.contracts += v.contracts;
      }
    }
    const campOf = new Map(); // id кампании → кабинет
    for (const [m, rows] of Object.entries(byMonth)) {
      if (m < from || m > to) continue;
      for (const [accId, accName, currency, campaign, cost, conv, clicks, campId] of rows) {
        if (campId) campOf.set(campId, accId);
        const usd = toUsd(cost, currency, m, rates) ?? 0;
        const uah = currency === "UAH" ? cost : rates[m] > 0 && currency === "USD" ? cost * rates[m] : 0;
        const a = accounts.get(accId) || { id: accId, name: accName, currency, usd: 0, uah: 0, conv: 0, clicks: 0, campaigns: new Map() };
        a.usd += usd;
        a.uah += uah;
        a.conv += conv;
        a.clicks += clicks;
        const c = a.campaigns.get(campaign) || { name: campaign, ids: new Set(), usd: 0, uah: 0, conv: 0 };
        if (campId) c.ids.add(campId);
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
    const hasCrm = crm.months.length > 0;
    const sumCamp = (ids, k) => [...ids].reduce((s, id) => s + (crm.byCampaign[id]?.[k] || 0), 0);
    const accs = [...accounts.values()].map((a) => {
      const campaigns = [...a.campaigns.values()]
        .map(({ ids, ...c }) => ({ ...c, leads: hasCrm ? sumCamp(ids, "leads") : null, contracts: hasCrm ? sumCamp(ids, "contracts") : null }))
        .sort((x, y) => y.usd - x.usd);
      const ids = [...campOf].filter(([, acc]) => acc === a.id).map(([cid]) => cid);
      return { ...a, campaigns, leads: hasCrm ? sumCamp(ids, "leads") : null, contracts: hasCrm ? sumCamp(ids, "contracts") : null };
    });
    // договоры по кампаниям без расхода в периоде или без id кампании в заявке
    const known = new Set(campOf.keys());
    const other = Object.entries(crm.byCampaign).filter(([cid]) => !known.has(cid));
    branches.push({
      id: b.id,
      name: b.name,
      ...t,
      cpa: t.conv > 0 ? t.usd / t.conv : null,
      leads: hasCrm ? crm.leads : null,
      contracts: hasCrm ? crm.contracts : null,
      cpc: hasCrm && crm.contracts > 0 ? t.usd / crm.contracts : null,
      crmMonths: crm.months.sort(),
      otherCampaigns: hasCrm ? { leads: other.reduce((s, [, v]) => s + v.leads, 0), contracts: other.reduce((s, [, v]) => s + v.contracts, 0) } : null,
      fb,
      accounts: accs.sort((x, y) => y.usd - x.usd),
      products: [...products.values()].map((p) => ({ ...p, share: t.usd ? p.usd / t.usd : 0 })).sort((x, y) => (x.name === "Не определено") - (y.name === "Не определено") || y.usd - x.usd),
    });
  }
  branches.sort((a, b) => b.usd - a.usd);
  const sum = (k) => branches.reduce((a, b) => a + (b[k] || 0), 0);
  const network = { usd: sum("usd"), uah: sum("uah"), conv: sum("conv"), clicks: sum("clicks"), fb: sum("fb") };
  network.cpa = network.conv > 0 ? network.usd / network.conv : null;
  const withCrm = branches.filter((b) => b.contracts != null);
  network.leads = withCrm.length ? withCrm.reduce((a, b) => a + b.leads, 0) : null;
  network.contracts = withCrm.length ? withCrm.reduce((a, b) => a + b.contracts, 0) : null;
  network.cpc = network.contracts > 0 ? withCrm.reduce((a, b) => a + b.usd, 0) / network.contracts : null;
  const usedRates = Object.fromEntries(Object.entries(rates).filter(([m]) => m >= from && m <= to));
  return { from, to, months, until: data.googleMeta?.until || null, rates: usedRates, network, branches };
}
