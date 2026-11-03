// Загружает расход Google Ads (через API, MCC) по кабинетам филиалов в хранилище: текущий и прошлый месяц
// (прошлый — чтобы он был полным и с поправками Google). Кабинеты филиала — branch.googleAccounts (id без дефисов).
// Гривневые кабинеты пересчитываются в $ по курсу НБУ на последний день месяца (для текущего — на дату данных).
// Доступы — GOOGLE_ADS_* в окружении или файл GOOGLE_ADS_ENV (по умолчанию ~/.config/lead-planner/google-ads.env).
//   node scripts/load-google-ads.mjs [данные по дату YYYY-MM-DD]
//   node scripts/load-google-ads.mjs --map dp=1111111111,2222222222 kiev=3333333333   — задать кабинеты филиалов
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Store } from "../lib/store.mjs";
import { loadCreds, connect } from "../lib/googleads.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const store = new Store(process.env.DATA_FILE || path.join(ROOT, "data", "store.json"));
const args = process.argv.slice(2);

if (args[0] === "--map") {
  for (const a of args.slice(1)) {
    const [id, list = ""] = a.split("=");
    const b = store.branch(id);
    if (!b) throw new Error(`Нет филиала ${id}`);
    b.googleAccounts = list.split(",").map((x) => x.replace(/\D/g, "")).filter(Boolean);
    console.log(`${id}: ${b.googleAccounts.join(", ") || "—"}`);
  }
  store.save();
  process.exit(0);
}

const kyivToday = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Kyiv" }).format(new Date());
const until = /^\d{4}-\d\d-\d\d$/.test(args[0] || "") ? args[0] : kyivToday;
const cur = until.slice(0, 7);
const prevStart = new Date(Date.UTC(Number(cur.slice(0, 4)), Number(cur.slice(5)) - 2, 1)).toISOString().slice(0, 10);
const prev = prevStart.slice(0, 7);
const monthEnd = (m) => new Date(Date.UTC(Number(m.slice(0, 4)), Number(m.slice(5)), 0)).toISOString().slice(0, 10);

async function nbuRate(date) {
  const r = await fetch(`https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?valcode=USD&date=${date.replace(/-/g, "")}&json`);
  const j = await r.json();
  if (!(j[0]?.rate > 0)) throw new Error(`Нет курса НБУ на ${date}`);
  return j[0].rate;
}

const creds = loadCreds(process.env.GOOGLE_ADS_ENV || path.join(os.homedir(), ".config", "lead-planner", "google-ads.env"));
const api = await connect(creds);
const branches = store.data.branches.filter((b) => !b.archived && b.googleAccounts?.length);
if (!branches.length) throw new Error("Ни у одного филиала не заданы кабинеты Google Ads (--map)");

const query =
  "SELECT customer.id, customer.descriptive_name, customer.currency_code, segments.month, campaign.id, campaign.name, " +
  "metrics.cost_micros, metrics.conversions, metrics.clicks FROM campaign " +
  `WHERE segments.date BETWEEN '${prevStart}' AND '${until}' AND metrics.cost_micros > 0`;

store.data.googleSpend ||= {};
const failed = [];
let rows = 0;
for (const b of branches) {
  const fresh = { [prev]: [], [cur]: [] };
  let ok = 0;
  for (const acc of b.googleAccounts) {
    try {
      for (const r of await api.search(acc, query)) {
        const m = r.segments.month.slice(0, 7);
        fresh[m]?.push([String(r.customer.id), r.customer.descriptiveName || String(r.customer.id), r.customer.currencyCode, r.campaign.name, Number(r.metrics.costMicros || 0) / 1e6, Number(r.metrics.conversions || 0), Number(r.metrics.clicks || 0), String(r.campaign.id)]);
        rows++;
      }
      ok++;
    } catch (e) {
      failed.push(`${b.id}/${acc}: ${e.message}`);
    }
  }
  // филиал обновляем, только если ответили все его кабинеты — иначе оставляем прежние данные
  if (ok === b.googleAccounts.length) store.data.googleSpend[b.id] = { ...store.data.googleSpend[b.id], ...fresh };
}

const meta = (store.data.googleMeta ||= { rates: {} });
meta.rates ||= {};
meta.rates[prev] = await nbuRate(monthEnd(prev));
meta.rates[cur] = await nbuRate(until);
meta.until = until;
meta.loadedAt = new Date().toISOString();
store.save();

const total = (m) => branches.reduce((s, b) => s + (store.data.googleSpend[b.id]?.[m] || []).reduce((a, x) => a + (x[2] === "UAH" ? x[4] / meta.rates[m] : x[2] === "USD" ? x[4] : 0), 0), 0);
console.log(`Google Ads: ${branches.length} филиалов, ${rows} строк, данные по ${until}, API ${api.version()}; ${prev}: $${total(prev).toFixed(0)}, ${cur}: $${total(cur).toFixed(0)} (курс ${meta.rates[cur]})`);
if (failed.length) {
  console.error(`Не ответили кабинеты (данные филиала не обновлены):\n  ${failed.join("\n  ")}`);
  process.exitCode = 1;
}
