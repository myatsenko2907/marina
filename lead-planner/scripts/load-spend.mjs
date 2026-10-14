// Загружает расход кампаний FB по месяцам в хранилище: data/spend/<филиал>.tsv
// Строка файла: YYYY-MM<TAB>расход<TAB>название кампании.
// Месяцы из файлов заменяются целиком, остальные месяцы в хранилище остаются (для ежедневного обновления
// достаточно файлов только с текущим месяцем).
//   node scripts/load-spend.mjs [папка] [данные по дату YYYY-MM-DD]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Store } from "../lib/store.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const dir = process.argv[2] || path.join(ROOT, "data", "spend");
const until = process.argv[3] || new Date().toISOString().slice(0, 10);
const store = new Store(process.env.DATA_FILE || path.join(ROOT, "data", "store.json"));
store.data.spend ||= {};
let rows = 0;
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".tsv"))) {
  const id = path.basename(f, ".tsv");
  if (!store.branch(id)) {
    console.warn(`Нет филиала ${id} — пропущен`);
    continue;
  }
  const fresh = {};
  for (const line of fs.readFileSync(path.join(dir, f), "utf8").split("\n")) {
    const [m, s, ...name] = line.split("\t");
    if (!/^\d{4}-\d\d$/.test(m || "") || !Number(s)) continue;
    (fresh[m] ||= []).push([name.join("\t").trim(), Number(s)]);
    rows++;
  }
  store.data.spend[id] = { ...store.data.spend[id], ...fresh };
}
store.data.spendMeta = { until, source: "FB Ads", loadedAt: new Date().toISOString() };
store.save();
console.log(`Загружено: ${Object.keys(store.data.spend).length} филиалов, ${rows} строк, данные по ${until}`);
