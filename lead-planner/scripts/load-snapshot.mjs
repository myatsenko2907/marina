// Загружает снимок данных CRM (data/crm-snapshot.json) в хранилище сервиса.
// Формат снимка — см. lib/snapshot.mjs.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Store } from "../lib/store.mjs";
import { applySnapshot } from "../lib/snapshot.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const file = process.argv[2] || path.join(ROOT, "data", "crm-snapshot.json");
const store = new Store(process.env.DATA_FILE || path.join(ROOT, "data", "store.json"));
const r = applySnapshot(store, JSON.parse(fs.readFileSync(file, "utf8")), process.argv[3]);
store.data.imports.push({ at: new Date().toISOString(), by: "load-snapshot", file: path.basename(file), records: r.records });
store.save();
console.log(`Загружено: ${r.branches} филиалов, ${r.records} строк, набор ${r.season}`);
