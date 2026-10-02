// Собирает одну самостоятельную HTML-страницу (для публикации ссылкой):
// интерфейс + расчёт в браузере + данные хранилища, зашифрованные паролем (PBKDF2 + AES-GCM).
//   node scripts/build-static.mjs <пароль> [выходной файл]
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const password = process.argv[2];
const out = process.argv[3] || path.join(ROOT, "data", "lead-planner.html");
if (!password) throw new Error("Укажите пароль: node scripts/build-static.mjs <пароль>");

const store = JSON.parse(fs.readFileSync(process.env.DATA_FILE || path.join(ROOT, "data", "store.json"), "utf8"));
const data = {
  settings: store.settings,
  branches: store.branches.filter((b) => !b.archived),
  months: store.months,
  seasons: store.seasons,
  events: store.events,
  fb: {},
  updatedAt: [store.lastRefresh?.at, store.imports?.at(-1)?.at].filter(Boolean).sort().at(-1) || new Date().toISOString(),
};

// шифрование
const salt = crypto.randomBytes(16);
const iv = crypto.randomBytes(12);
const iterations = 250000;
const key = crypto.pbkdf2Sync(password, salt, iterations, 32, "sha256");
const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
const enc = Buffer.concat([cipher.update(JSON.stringify(data), "utf8"), cipher.final(), cipher.getAuthTag()]);
const payload = { salt: salt.toString("base64"), iv: iv.toString("base64"), iterations, data: enc.toString("base64") };

// модули → один скрипт: убираем import/export, склеиваем в порядке зависимостей
const strip = (file) =>
  fs
    .readFileSync(path.join(ROOT, file), "utf8")
    .replace(/^import[\s\S]*?from\s+"[^"]+";\s*$/gm, "")
    .replace(/^export\s+(?=(const|function|async function|class|let)\b)/gm, "");
const planner = strip("lib/planner.mjs");
const service = strip("lib/service.mjs").replace(/service\./g, "");
const localapi = strip("lib/localapi.mjs").replace(/service\./g, "");
const app = fs.readFileSync(path.join(ROOT, "public/app.js"), "utf8");
const css = fs.readFileSync(path.join(ROOT, "public/styles.css"), "utf8");

const boot = `
window.LOCAL_MODE = true;
document.documentElement.style.colorScheme = "light";
const PAYLOAD = ${JSON.stringify(payload)};
const b64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const EDITS_KEY = "lp.edits." + PAYLOAD.salt.slice(0, 8);
window.LOCAL_UNLOCK = async (password) => {
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"]);
  const key = await crypto.subtle.deriveKey({ name: "PBKDF2", salt: b64(PAYLOAD.salt), iterations: PAYLOAD.iterations, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
  let plain;
  try {
    plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64(PAYLOAD.iv) }, key, b64(PAYLOAD.data));
  } catch {
    throw new Error("Неверный пароль");
  }
  let data = JSON.parse(new TextDecoder().decode(plain));
  try {
    const saved = localStorage.getItem(EDITS_KEY);
    if (saved) data = { ...data, ...JSON.parse(saved), updatedAt: data.updatedAt };
  } catch {}
  const persist = (d) => {
    try {
      localStorage.setItem(EDITS_KEY, JSON.stringify({ settings: d.settings, branches: d.branches, months: d.months, seasons: d.seasons, events: d.events }));
    } catch {}
  };
  window.LOCAL_API = createLocalApi(data, { persist });
  window.LOCAL_USERS = () => window.LOCAL_API.users();
};
`;

const html = `<title>План лидобалов</title>
<style>${css}</style>
<div id="app"><div class="boot">Загрузка…</div></div>
<div id="tip" class="tip" role="tooltip" hidden></div>
<div id="toast" class="toast" hidden></div>
<script>
(() => {
${planner}
${service}
${localapi}
${boot}
})();
</script>
<script>
(() => {
${app}
})();
</script>`;
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html);
console.log(`Готово: ${out} (${Math.round(html.length / 1024)} КБ)`);
