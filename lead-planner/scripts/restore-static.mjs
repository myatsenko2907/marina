// Восстанавливает хранилище из опубликованной страницы (scripts/build-static.mjs), если data/store.json потерян:
//   node scripts/restore-static.mjs <страница.html> <пароль>
// Берутся настройки, филиалы, планы/факты, наборы, ивенты и расход; пользователи сервера не восстанавливаются.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { Store } from "../lib/store.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const [file, password] = process.argv.slice(2);
if (!file || !password) throw new Error("node scripts/restore-static.mjs <страница.html> <пароль>");
const html = fs.readFileSync(file, "utf8");
const m = html.match(/const PAYLOAD = (\{.*?\});\n/);
if (!m) throw new Error("В файле нет данных страницы (PAYLOAD)");
const p = JSON.parse(m[1]);
const key = crypto.pbkdf2Sync(password, Buffer.from(p.salt, "base64"), p.iterations, 32, "sha256");
const buf = Buffer.from(p.data, "base64");
const d = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(p.iv, "base64"));
d.setAuthTag(buf.subarray(buf.length - 16));
const data = JSON.parse(Buffer.concat([d.update(buf.subarray(0, buf.length - 16)), d.final()]).toString("utf8"));

const store = new Store(process.env.DATA_FILE || path.join(ROOT, "data", "store.json"));
for (const k of ["branches", "months", "seasons", "events", "spend", "spendMeta", "googleSpend", "googleMeta"]) if (data[k] != null) store.data[k] = data[k];
store.data.settings = { ...store.data.settings, ...data.settings };
store.data.imports.push({ at: data.updatedAt, by: "restore-static", file: path.basename(file) });
store.save();
console.log(`Восстановлено: ${store.data.branches.length} филиалов, ${Object.keys(store.data.months).length} месяцев, данные от ${data.updatedAt}`);
