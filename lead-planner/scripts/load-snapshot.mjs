// Загружает снимок данных CRM (data/crm-snapshot.json) в хранилище сервиса.
// Формат снимка:
//   branches: { alias: { name, adAccountId } }
//   season:   { alias: { form: план набора } }          — план набора (CRM «dial plans»)
//   months:   { alias: { "YYYY-MM": { form: [план, факт договоров] } } }
//   balls:    { alias: { "YYYY-MM": { form: факт лидобалов } } }   — из отчёта «Маркетинг → Лидобалы» (необязательно)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Store } from "../lib/store.mjs";
import { seasonOf } from "../lib/planner.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const file = process.argv[2] || path.join(ROOT, "data", "crm-snapshot.json");
const seasonMonth = process.argv[3] || new Date().toISOString().slice(0, 7);
const snap = JSON.parse(fs.readFileSync(file, "utf8"));
const store = new Store(process.env.DATA_FILE || path.join(ROOT, "data", "store.json"));

for (const [id, b] of Object.entries(snap.branches)) {
  const cur = store.branch(id);
  if (cur) Object.assign(cur, { name: b.name, adAccountId: b.adAccountId || cur.adAccountId });
  else store.data.branches.push({ id, name: b.name, adAccountId: b.adAccountId || "", fbCurrency: b.fbCurrency || "USD", aliases: b.aliases || [] });
}
const sid = seasonOf(seasonMonth).id;
for (const [id, plan] of Object.entries(snap.season || {})) store.data.seasons[`${id}|${sid}`] = { plan };
let n = 0;
for (const [id, months] of Object.entries(snap.months || {})) {
  for (const [m, forms] of Object.entries(months)) {
    const rec = store.ensureMonth(id, m);
    for (const [form, [plan, fact]] of Object.entries(forms)) {
      (rec.plan.products[form] ||= {}).plan = plan;
      (rec.facts.products[form] ||= {}).contracts = fact;
      n++;
    }
  }
}
for (const [id, months] of Object.entries(snap.balls || {})) {
  for (const [m, forms] of Object.entries(months)) {
    const rec = store.ensureMonth(id, m);
    for (const [form, balls] of Object.entries(forms)) (rec.facts.products[form] ||= {}).balls = balls;
  }
}
store.data.imports.push({ at: new Date().toISOString(), by: "load-snapshot", file: path.basename(file), records: n });
store.save();
console.log(`Загружено: ${Object.keys(snap.branches).length} филиалов, ${n} строк план/факт, набор ${sid}`);
