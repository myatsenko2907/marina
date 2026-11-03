// Записывает цены лида из сводки FB (scripts/fb-cpl.mjs) в хранилище:
// по филиалу — если по типу ≥ MIN_LEADS лидов, иначе среднее по всем филиалам; среднее — в общие настройки.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Store } from "../lib/store.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIN_LEADS = 10;
const summary = JSON.parse(fs.readFileSync(process.argv[2] || path.join(ROOT, "data/fb/cpl-summary.json"), "utf8"));
const period = process.argv[3] || "";
const store = new Store(process.env.DATA_FILE || path.join(ROOT, "data", "store.json"));
const TYPES = { lid_form: ["f", "l"], site: ["s"], messenger: ["m"], event: ["e"] };

const avg = {};
for (const [t, keys] of Object.entries(TYPES)) {
  let s = 0, l = 0;
  for (const v of Object.values(summary)) for (const k of keys) { s += v.spend[k] || 0; l += v.leads[k] || 0; }
  avg[t] = l ? +(s / l).toFixed(2) : null;
}
store.data.settings.cpl = { ...store.data.settings.cpl, ...avg };

for (const [bid, v] of Object.entries(summary)) {
  const b = store.branch(bid);
  if (!b) continue;
  b.cpl = {};
  for (const [t, keys] of Object.entries(TYPES)) {
    const s = keys.reduce((a, k) => a + (v.spend[k] || 0), 0);
    const l = keys.reduce((a, k) => a + (v.leads[k] || 0), 0);
    b.cpl[t] = l >= MIN_LEADS ? +(s / l).toFixed(2) : avg[t];
  }
  b.cplNote = `FB ${period}: средняя цена лида по кампаниям; типы с < ${MIN_LEADS} лидов — среднее по Украине`;
  console.log(bid, JSON.stringify(b.cpl));
}
console.log("Украина (по умолчанию):", JSON.stringify(avg));
store.save();
