// Импорт выгрузок CRM (отчёт «Маркетинг → Лидобалы», планы) из CSV или XLSX.
// Понимает «длинный» формат (строка = филиал × месяц × форма [× тип лида])
// и «широкий» (колонки по типам лидов). Заголовки распознаются по ключевым словам.
import zlib from "node:zlib";

// ---------- CSV ----------
export function parseCsv(text) {
  text = text.replace(/^﻿/, "");
  const firstLine = text.split(/\r?\n/, 1)[0];
  const delim = [";", "\t", ","].map((d) => [d, firstLine.split(d).length]).sort((a, b) => b[1] - a[1])[0][0];
  const rows = [];
  let row = [];
  let cell = "";
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === delim) {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => String(c).trim() !== ""));
}

// ---------- XLSX (zip + sheet1 XML, без зависимостей) ----------
function unzip(buf) {
  const files = {};
  let eocd = buf.length - 22;
  while (eocd >= 0 && buf.readUInt32LE(eocd) !== 0x06054b50) eocd--;
  if (eocd < 0) throw new Error("Файл не похож на XLSX");
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  for (let i = 0; i < count; i++) {
    const method = buf.readUInt16LE(p + 10);
    const csize = buf.readUInt32LE(p + 20);
    const nlen = buf.readUInt16LE(p + 28);
    const elen = buf.readUInt16LE(p + 30);
    const clen = buf.readUInt16LE(p + 32);
    const off = buf.readUInt32LE(p + 42);
    const name = buf.toString("utf8", p + 46, p + 46 + nlen);
    const lnlen = buf.readUInt16LE(off + 26);
    const lelen = buf.readUInt16LE(off + 28);
    const data = buf.subarray(off + 30 + lnlen + lelen, off + 30 + lnlen + lelen + csize);
    files[name] = method === 8 ? zlib.inflateRawSync(data) : data;
    p += 46 + nlen + elen + clen;
  }
  return files;
}

const xmlText = (s) =>
  s
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");

function colIndex(ref) {
  const letters = ref.match(/^[A-Z]+/)[0];
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

export function parseXlsx(buf) {
  const files = unzip(buf);
  const shared = [];
  const ss = files["xl/sharedStrings.xml"]?.toString("utf8") || "";
  for (const m of ss.matchAll(/<si>([\s\S]*?)<\/si>/g)) shared.push(xmlText(m[1]));
  const sheetName = Object.keys(files).filter((n) => /^xl\/worksheets\/sheet\d+\.xml$/.test(n)).sort()[0];
  if (!sheetName) throw new Error("В XLSX нет листов");
  const xml = files[sheetName].toString("utf8");
  const rows = [];
  for (const rm of xml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
    const row = [];
    for (const cm of rm[1].matchAll(/<c ([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = cm[1];
      const ref = attrs.match(/r="([A-Z]+\d+)"/)?.[1];
      const t = attrs.match(/t="(\w+)"/)?.[1];
      const inner = cm[2] || "";
      let v = inner.match(/<v>([\s\S]*?)<\/v>/)?.[1];
      if (t === "s") v = shared[Number(v)];
      else if (t === "inlineStr") v = xmlText(inner);
      else if (v != null) v = xmlText(v);
      row[ref ? colIndex(ref) : row.length] = v ?? "";
    }
    rows.push(Array.from(row, (c) => c ?? ""));
  }
  return rows.filter((r) => r.some((c) => String(c).trim() !== ""));
}

// ---------- Распознавание ----------
const norm = (s) => String(s ?? "").toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ").trim();

export function toNumber(v) {
  if (v == null) return null;
  const s = String(v).replace(/\s| /g, "").replace(",", ".").replace(/%$/, "");
  if (s === "" || s === "-") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

const MONTHS = ["январ", "феврал", "март", "апрел", "ма", "июн", "июл", "август", "сентябр", "октябр", "ноябр", "декабр"];
const MONTHS_UK = ["січ", "лют", "берез", "квіт", "трав", "черв", "лип", "серп", "верес", "жовт", "листоп", "груд"];

export function toMonth(v) {
  if (v == null || v === "") return null;
  const s = norm(v);
  let m = s.match(/(20\d\d)[-./](\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}`;
  m = s.match(/(\d{1,2})[-./](\d{1,2})[-./](20\d\d)/); // дд.мм.гггг
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}`;
  m = s.match(/^(\d{1,2})[-./](20\d\d)$/);
  if (m) return `${m[2]}-${m[1].padStart(2, "0")}`;
  if (/^\d{5}$/.test(s)) {
    // серийная дата Excel
    const d = new Date(Date.UTC(1899, 11, 30) + Number(s) * 86400000);
    return d.toISOString().slice(0, 7);
  }
  const year = s.match(/20\d\d/)?.[0];
  if (year) {
    // «май» короче остальных — проверяем последним
    const order = [...MONTHS.keys()].sort((a, b) => MONTHS[b].length - MONTHS[a].length);
    for (const i of order) if (s.includes(MONTHS[i]) || s.includes(MONTHS_UK[i])) return `${year}-${String(i + 1).padStart(2, "0")}`;
  }
  return null;
}

function headerRole(h, settings) {
  const s = norm(h);
  if (!s) return null;
  if (/филиал|філія|город|місто|branch|city/.test(s)) return { role: "branch" };
  if (/месяц|місяць|month|период|період|дата|date/.test(s)) return { role: "month" };
  if (/форма|направлен|напрям|продукт|product|form/.test(s)) return { role: "product" };
  if (/тип|источник|джерело|source/.test(s) && !/лидобал|лідобал/.test(s)) return { role: "type" };
  if (/план.*лидобал|план.*лідобал|цель.*лидобал/.test(s)) return { role: "ballsPlan" };
  if (/лидобал|лідобал|lead ?ball/.test(s)) return { role: "balls" };
  if (/план/.test(s)) return { role: "plan" };
  if (/договор|договір|contract/.test(s)) return { role: "contracts" };
  const t = matchType(s, settings);
  if (t) return { role: "typeLeads", typeId: t };
  if (/^лид|^лід|заявк|leads?$|количество|кількість/.test(s)) return { role: "leads" };
  return null;
}

const TYPE_WORDS = {
  call: ["звон", "дзвін", "call"],
  site: ["сайт", "онлайн", "site", "online", "интернет"],
  lid_form: ["лид форм", "лид-форм", "лід форм", "лід-форм", "lead form", "lid_form", "лидформ"],
  messenger: ["мессендж", "месендж", "messenger", "telegram", "чат"],
  study: ["обучен", "навчан", "study"],
  demo: ["демо", "demo"],
  visit: ["визит", "візит", "visit"],
  event: ["ивент", "івент", "мероприят", "захід", "заход", "event"],
};

export function matchType(s, settings) {
  s = norm(s).replace(/^source_type_/, "");
  for (const t of settings.leadTypes) if (s === t.id || s === norm(t.name)) return t.id;
  for (const [id, words] of Object.entries(TYPE_WORDS)) if (words.some((w) => s.includes(w)) && settings.leadTypes.some((t) => t.id === id)) return id;
  return null;
}

export function matchProduct(v, settings) {
  const s = norm(v);
  if (!s) return null;
  for (const p of settings.products) {
    if (s === p.id || s === p.id.replace("form_", "")) return p.id;
    const short = norm(p.name.split(" — ")[0]);
    if (s === short || s === norm(p.name)) return p.id;
    if ((p.aliases || []).some((a) => norm(a) === s)) return p.id;
  }
  return null;
}

export function matchBranch(v, branches) {
  const s = norm(v);
  if (!s) return null;
  return (
    branches.find((b) => norm(b.id) === s || norm(b.name) === s || (b.aliases || []).some((a) => norm(a) === s))?.id || null
  );
}

/**
 * Превращает таблицу в записи фактов/планов.
 * defaults — { branchId, month } если в файле нет таких колонок.
 * Возвращает { records: [{branchId, month, productId, contracts, balls, plan, leads:{type:n}}], skipped, columns }
 */
export function tableToRecords(rows, { settings, branches, defaults = {} }) {
  // ищем строку заголовков: первая строка, где распознано ≥ 2 колонки
  let hi = 0;
  let roles = [];
  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    const r = rows[i].map((h) => headerRole(h, settings));
    if (r.filter(Boolean).length >= 2) {
      hi = i;
      roles = r;
      break;
    }
  }
  if (!roles.length) throw new Error("Не удалось распознать заголовки таблицы");
  const columns = rows[hi].map((h, i) => ({ header: h, ...(roles[i] || { role: null }) }));
  const recs = new Map();
  const skipped = [];
  let lastBranch = defaults.branchId || null;
  for (let i = hi + 1; i < rows.length; i++) {
    const r = rows[i];
    const get = (role) => {
      const idx = roles.findIndex((x) => x?.role === role);
      return idx >= 0 ? r[idx] : undefined;
    };
    const bRaw = get("branch");
    const branchId = bRaw != null && String(bRaw).trim() !== "" ? matchBranch(bRaw, branches) : lastBranch;
    if (bRaw && !branchId) {
      skipped.push({ row: i + 1, reason: `неизвестный филиал «${bRaw}»` });
      continue;
    }
    lastBranch = branchId;
    const month = toMonth(get("month")) || defaults.month;
    const pRaw = get("product");
    const productId = matchProduct(pRaw, settings);
    if (!branchId || !month || !productId) {
      if (pRaw && !/итог|всего|total|разом/i.test(String(pRaw))) skipped.push({ row: i + 1, reason: `не распознаны филиал/месяц/форма («${pRaw}»)` });
      continue;
    }
    const key = `${branchId}|${month}|${productId}`;
    const rec = recs.get(key) || { branchId, month, productId, leads: {} };
    const typeId = get("type") != null ? matchType(get("type"), settings) : null;
    roles.forEach((role, idx) => {
      if (!role) return;
      const n = toNumber(r[idx]);
      if (n == null) return;
      if (role.role === "typeLeads") rec.leads[role.typeId] = (rec.leads[role.typeId] || 0) + n;
      else if (role.role === "leads" && typeId) rec.leads[typeId] = (rec.leads[typeId] || 0) + n;
      else if (role.role === "balls") rec.balls = (rec.balls || 0) + n;
      else if (role.role === "contracts") rec.contracts = typeId ? rec.contracts : (rec.contracts || 0) + n;
      else if (role.role === "plan") rec.plan = n;
      else if (role.role === "ballsPlan") rec.ballsPlan = n;
    });
    recs.set(key, rec);
  }
  return { records: [...recs.values()], skipped, columns: columns.map((c) => ({ header: c.header, role: c.role, typeId: c.typeId })) };
}

export function readTable(buf, filename = "") {
  if (/\.xlsx$/i.test(filename) || (buf[0] === 0x50 && buf[1] === 0x4b)) return parseXlsx(buf);
  return parseCsv(buf.toString("utf8"));
}
