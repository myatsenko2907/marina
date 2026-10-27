// Состояние кампаний FB для задач маркетолога: ответы Meta (ads_get_ad_entities, level=campaign) за последние 7 дней
// и за прошлые 7 → store.data.adsHealth[филиал].fb. Поля запроса: name, effective_status, daily_budget, lifetime_budget,
// amount_spent, results, lead, frequency, ctr, impressions, objective, stop_time (для прошлых 7 дней хватит name, amount_spent, results, lead).
//   node scripts/load-fb-health.mjs <по дату YYYY-MM-DD> <филиал> last7=<файл>[,<файл>…] prev7=<файл>[,…]
// Файл — ответ Meta целиком ({"ad_entities":"[…]"}) или сам массив кампаний; несколько файлов — несколько кабинетов/страниц.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Store } from "../lib/store.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const store = new Store(process.env.DATA_FILE || path.join(ROOT, "data", "store.json"));
const [until, branchId, ...rest] = process.argv.slice(2);
if (!/^\d{4}-\d\d-\d\d$/.test(until || "") || !store.branch(branchId)) throw new Error("Использование: load-fb-health.mjs <YYYY-MM-DD> <филиал> last7=<файл> prev7=<файл>");
const files = Object.fromEntries(rest.map((a) => a.split("=")).map(([k, v]) => [k, (v || "").split(",").filter(Boolean)]));

const num = (v) => (v == null || v === "Not available" ? 0 : Number(String(v).replace(",", ".").replace("%", "")) || 0);
const money = (x) => (x && typeof x === "object" ? num(x.value) : num(x));
// лид-тип по показателю результата кампании: сайт, лид-форма, мессенджер (иначе — по полю lead)
const leadType = (ind = "") =>
  /fb_pixel_lead|fb_pixel_custom|offsite|Lead_Verified/i.test(ind) ? "site" : /leadgen|lead_grouped/i.test(ind) ? "lid_form" : /messaging/i.test(ind) ? "messenger" : /lead/i.test(ind) ? "lead" : null;

function read(list = []) {
  const rows = [];
  for (const f of list) {
    let j = JSON.parse(fs.readFileSync(f, "utf8"));
    if (typeof j.ad_entities === "string") j = JSON.parse(j.ad_entities);
    rows.push(...(Array.isArray(j) ? j : j.ad_entities || []));
  }
  return rows.map((r) => {
    const ind = r.results?.indicator || "";
    const rv = r.results?.values ? num(r.results.values[0]?.value) : num(r.results?.value);
    const type = leadType(ind);
    return {
      id: String(r.id),
      name: r.name,
      status: r.effective_status || null,
      spend: money(r.amount_spent),
      leads: Math.max(num(r.lead), type ? rv : 0),
      type,
      objective: r.objective || null,
      dailyBudget: r.daily_budget ? money(r.daily_budget) : null,
      lifetimeBudget: r.lifetime_budget ? money(r.lifetime_budget) : null,
      stop: r.stop_time ? r.stop_time.slice(0, 10) : null,
      frequency: r.frequency != null ? num(r.frequency) : null,
      ctr: r.ctr != null ? num(r.ctr) / 100 : null,
      impressions: r.impressions != null ? num(r.impressions) : null,
    };
  });
}

const last7 = read(files.last7);
const prev7 = read(files.prev7);
store.data.adsHealth ||= {};
store.data.adsHealth[branchId] = { ...store.data.adsHealth[branchId], fb: { asOf: until, last7, prev7 } };
store.save();
const sum = (a) => a.reduce((s, x) => s + x.spend, 0).toFixed(2);
console.log(`${branchId}: FB 7 дн. — ${last7.length} кампаний, $${sum(last7)}; прошлые 7 дн. — ${prev7.length}, $${sum(prev7)}`);
