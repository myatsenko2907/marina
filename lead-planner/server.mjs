// HTTP-сервер планировщика лидов. Без внешних зависимостей (Node ≥ 20).
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { Store } from "./lib/store.mjs";
import { seasonOf } from "./lib/planner.mjs";
import { fetchBranchFb } from "./lib/meta.mjs";
import { readTable, tableToRecords } from "./lib/importer.mjs";
import { applySnapshot } from "./lib/snapshot.mjs";
import * as service from "./lib/service.mjs";
import * as auth from "./lib/auth.mjs";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 8787);
const store = new Store(process.env.DATA_FILE || path.join(ROOT, "data", "store.json"));
const META_TOKEN = process.env.META_ACCESS_TOKEN || "";
const API_TOKEN = process.env.API_TOKEN || ""; // для автоматической загрузки данных из CRM-скриптов
// Автообновление: FB по всем городам + снимок CRM по URL (если задан).
const REFRESH_MINUTES = Number(process.env.REFRESH_MINUTES || 600); // по умолчанию раз в 10 часов
const CRM_SNAPSHOT_URL = process.env.CRM_SNAPSHOT_URL || "";
const CRM_SNAPSHOT_TOKEN = process.env.CRM_SNAPSHOT_TOKEN || "";

// Первый запуск: создаём администратора.
if (!store.data.users.some((u) => u.role === "admin")) {
  const login = process.env.ADMIN_LOGIN || "admin";
  const password = process.env.ADMIN_PASSWORD || auth.randomPassword();
  store.data.users.push({ id: crypto.randomUUID(), login, name: "Администратор", role: "admin", branches: [], pass: auth.hashPassword(password) });
  store.save();
  console.log(`\n  Создан администратор: ${login} / ${password}\n  (смените пароль в разделе «Пользователи»)\n`);
}

const currentMonth = () => new Date().toISOString().slice(0, 7);
const validMonth = (m) => (/^20\d\d-(0[1-9]|1[0-2])$/.test(m || "") ? m : currentMonth());

// ---------- расчёт ----------
const seasonFor = (branch, month) => service.seasonFor(store.data, branch, month);
const overview = (user, month) => service.overview(store.data, user, month);

// ---------- автообновление ----------
let refreshing = null;
async function refreshAll(reason = "schedule") {
  if (refreshing) return refreshing;
  refreshing = (async () => {
    const month = currentMonth();
    const result = { at: new Date().toISOString(), reason, crm: null, fb: {} };
    if (CRM_SNAPSHOT_URL) {
      try {
        const res = await fetch(CRM_SNAPSHOT_URL, { headers: CRM_SNAPSHOT_TOKEN ? { authorization: `Bearer ${CRM_SNAPSHOT_TOKEN}` } : {} });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const r = applySnapshot(store, await res.json(), month);
        result.crm = `ok: ${r.records} строк`;
      } catch (e) {
        result.crm = `ошибка: ${e.message}`;
      }
    }
    if (META_TOKEN) {
      for (const b of store.data.branches.filter((x) => x.adAccountId && !x.archived)) {
        try {
          store.data.fb[b.id] = await fetchBranchFb({ branch: b, token: META_TOKEN, settings: store.data.settings, month });
          result.fb[b.id] = "ok";
        } catch (e) {
          result.fb[b.id] = e.message;
        }
      }
    }
    store.data.lastRefresh = result;
    store.save();
    return result;
  })().finally(() => (refreshing = null));
  return refreshing;
}

/** Время последнего изменения данных (импорт, FB, автообновление) — для отметки «обновлено». */
function dataUpdatedAt() {
  const times = [store.data.lastRefresh?.at, store.data.imports.at(-1)?.at, ...Object.values(store.data.fb).map((f) => f?.fetchedAt)].filter(Boolean);
  return times.sort().at(-1) || null;
}

if (REFRESH_MINUTES > 0 && (META_TOKEN || CRM_SNAPSHOT_URL)) {
  setTimeout(() => refreshAll("start").catch(console.error), 5000);
  setInterval(() => refreshAll("schedule").catch(console.error), REFRESH_MINUTES * 60 * 1000);
  console.log(`Автообновление данных: каждые ${REFRESH_MINUTES} мин.`);
}

// ---------- http helpers ----------
function send(res, status, body, headers = {}) {
  const isStr = typeof body === "string" || Buffer.isBuffer(body);
  res.writeHead(status, { "content-type": isStr ? "text/plain; charset=utf-8" : "application/json; charset=utf-8", "cache-control": "no-store", ...headers });
  res.end(isStr ? body : JSON.stringify(body));
}

async function readBody(req, limit = 15 * 1024 * 1024) {
  const chunks = [];
  let size = 0;
  for await (const c of req) {
    size += c.length;
    if (size > limit) throw Object.assign(new Error("Слишком большой запрос"), { status: 413 });
    chunks.push(c);
  }
  return Buffer.concat(chunks);
}

async function readJson(req) {
  const b = await readBody(req);
  if (!b.length) return {};
  try {
    return JSON.parse(b.toString("utf8"));
  } catch {
    throw Object.assign(new Error("Некорректный JSON"), { status: 400 });
  }
}

const err = (status, message) => Object.assign(new Error(message), { status });
const publicUser = (u) => ({ id: u.id, login: u.login, name: u.name, role: u.role, branches: u.branches || [], disabled: !!u.disabled });

const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".ico": "image/x-icon" };

function serveStatic(req, res, pathname) {
  const file = path.normalize(path.join(ROOT, "public", pathname === "/" ? "index.html" : pathname));
  if (!file.startsWith(path.join(ROOT, "public")) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    return serveStatic(req, res, "/"); // SPA
  }
  res.writeHead(200, { "content-type": MIME[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
}

// ---------- импорт ----------
function applyRecords(records, kind) {
  let n = 0;
  for (const r of records) {
    if (!store.branch(r.branchId)) continue;
    const m = store.ensureMonth(r.branchId, r.month);
    if (kind !== "plans") {
      const f = (m.facts.products[r.productId] ||= {});
      if (r.balls != null) f.balls = r.balls;
      if (r.contracts != null) f.contracts = r.contracts;
      if (Object.keys(r.leads || {}).length) f.leads = { ...(f.leads || {}), ...r.leads };
    }
    if (r.plan != null && kind !== "facts") {
      (m.plan.products[r.productId] ||= {}).plan = r.plan;
    }
    n++;
  }
  return n;
}

function importJson(body) {
  // { plans: [{branchId, month, productId, plan}], facts: [{branchId, month, productId, balls, contracts, leads}],
  //   seasons: [{branchId, season:"2026-H2", productId, plan}], fb: {branchId: {...}} }
  let n = 0;
  if (Array.isArray(body.plans)) n += applyRecords(body.plans, "plans");
  if (Array.isArray(body.facts)) n += applyRecords(body.facts, "facts");
  for (const s of body.seasons || []) {
    if (!store.branch(s.branchId)) continue;
    const rec = (store.data.seasons[`${s.branchId}|${s.season}`] ||= { plan: {} });
    rec.plan[s.productId] = Number(s.plan) || 0;
    n++;
  }
  for (const [bid, fb] of Object.entries(body.fb || {})) {
    if (store.branch(bid)) {
      store.data.fb[bid] = fb;
      n++;
    }
  }
  return n;
}

// ---------- маршруты ----------
async function handleApi(req, res, url) {
  const p = url.pathname;
  const method = req.method;
  const cookies = auth.parseCookies(req.headers.cookie);

  if (p === "/api/login" && method === "POST") {
    const { login, password } = await readJson(req);
    const u = store.data.users.find((x) => x.login === String(login || "").trim() && !x.disabled);
    if (!u || !auth.verifyPassword(String(password || ""), u.pass)) throw err(401, "Неверный логин или пароль");
    const token = auth.createSession(u.id);
    return send(res, 200, publicUser(u), { "set-cookie": `sid=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=604800` });
  }
  if (p === "/api/logout" && method === "POST") {
    auth.dropSession(cookies.sid);
    return send(res, 200, { ok: true }, { "set-cookie": "sid=; Path=/; Max-Age=0" });
  }

  // Машинный доступ по токену — только импорт.
  const bearer = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (API_TOKEN && bearer && bearer.length === API_TOKEN.length && crypto.timingSafeEqual(Buffer.from(bearer), Buffer.from(API_TOKEN))) {
    if (p === "/api/import/snapshot" && method === "POST") {
      const r = applySnapshot(store, await readJson(req), currentMonth());
      store.data.imports.push({ at: new Date().toISOString(), by: "api-snapshot", records: r.records });
      store.save();
      return send(res, 200, r);
    }
    if (p === "/api/import" && method === "POST") {
      const n = importJson(await readJson(req));
      store.data.imports.push({ at: new Date().toISOString(), by: "api", records: n });
      store.save();
      return send(res, 200, { imported: n });
    }
    throw err(403, "Токен API даёт доступ только к /api/import и /api/import/snapshot");
  }

  const user = auth.sessionUser(cookies.sid, store.data.users);
  if (!user) throw err(401, "Требуется вход");
  const isAdmin = user.role === "admin";
  const needAdmin = () => {
    if (!isAdmin) throw err(403, "Доступно только администратору");
  };
  const branchOr404 = (id) => {
    const b = store.branch(id);
    if (!b || !auth.canSee(user, id)) throw err(404, "Филиал не найден");
    return b;
  };
  const month = validMonth(url.searchParams.get("month"));

  if (p === "/api/me") return send(res, 200, { ...publicUser(user), metaConfigured: !!META_TOKEN });

  if (p === "/api/status")
    return send(res, 200, {
      updatedAt: dataUpdatedAt(),
      lastRefresh: store.data.lastRefresh || null,
      refreshMinutes: META_TOKEN || CRM_SNAPSHOT_URL ? REFRESH_MINUTES : 0,
      sources: { meta: !!META_TOKEN, crmUrl: !!CRM_SNAPSHOT_URL, apiImport: !!API_TOKEN },
    });

  if (p === "/api/refresh" && method === "POST") {
    needAdmin();
    return send(res, 200, await refreshAll("manual"));
  }

  if (p === "/api/me/password" && method === "POST") {
    const { oldPassword, newPassword } = await readJson(req);
    if (!auth.verifyPassword(String(oldPassword || ""), user.pass)) throw err(400, "Текущий пароль неверный");
    if (String(newPassword || "").length < 8) throw err(400, "Пароль — минимум 8 символов");
    user.pass = auth.hashPassword(newPassword);
    store.save();
    return send(res, 200, { ok: true });
  }

  if (p === "/api/overview") return send(res, 200, overview(user, month));

  if (p === "/api/settings") {
    if (method === "GET") return send(res, 200, store.data.settings);
    if (method === "PUT") {
      needAdmin();
      const body = await readJson(req);
      store.data.settings = { ...store.data.settings, ...body };
      store.save();
      return send(res, 200, store.data.settings);
    }
  }

  // --- филиалы ---
  if (p === "/api/branches" && method === "GET") {
    return send(res, 200, store.data.branches.filter((b) => auth.canSee(user, b.id)));
  }
  if (p === "/api/branches" && method === "POST") {
    needAdmin();
    const b = await readJson(req);
    if (!/^[a-z0-9_-]{2,30}$/.test(b.id || "")) throw err(400, "Код филиала: латиница/цифры, как alias в CRM (dp, kiev…)");
    if (store.branch(b.id)) throw err(400, "Такой филиал уже есть");
    const nb = { id: b.id, name: b.name || b.id, adAccountId: b.adAccountId || "", fbCurrency: b.fbCurrency || "USD", aliases: b.aliases || [] };
    store.data.branches.push(nb);
    store.save();
    return send(res, 200, nb);
  }

  let m = p.match(/^\/api\/branches\/([\w-]+)$/);
  if (m) {
    const b = branchOr404(m[1]);
    if (method === "GET") return send(res, 200, service.branchDetail(store.data, user, b, month));
    if (method === "PUT") {
      needAdmin();
      const body = await readJson(req);
      for (const k of service.BRANCH_FIELDS) if (k in body) b[k] = body[k];
      store.save();
      return send(res, 200, b);
    }
  }

  m = p.match(/^\/api\/branches\/([\w-]+)\/month$/);
  if (m && method === "PUT") {
    needAdmin();
    const b = branchOr404(m[1]);
    const body = await readJson(req);
    const rec = store.ensureMonth(b.id, month);
    if (body.plan) rec.plan = body.plan;
    if (body.facts) rec.facts = body.facts;
    store.save();
    return send(res, 200, rec);
  }

  m = p.match(/^\/api\/branches\/([\w-]+)\/season$/);
  if (m && method === "PUT") {
    needAdmin();
    const b = branchOr404(m[1]);
    const body = await readJson(req);
    const sid = seasonOf(month).id;
    store.data.seasons[`${b.id}|${sid}`] = { plan: body.plan || {} };
    store.save();
    return send(res, 200, { ok: true });
  }

  m = p.match(/^\/api\/branches\/([\w-]+)\/copy-plan$/);
  if (m && method === "POST") {
    // скопировать настройки (mix, CPL) из прошлого месяца
    needAdmin();
    const b = branchOr404(m[1]);
    const rec = service.copyPlanFromPrev(store.data, b.id, month);
    if (!rec) throw err(404, "В прошлом месяце нет плана");
    store.save();
    return send(res, 200, rec);
  }

  // --- ивенты (маркетолог своего филиала тоже может) ---
  m = p.match(/^\/api\/branches\/([\w-]+)\/events(?:\/([\w-]+))?$/);
  if (m) {
    const b = branchOr404(m[1]);
    const fields = service.EVENT_FIELDS;
    if (method === "POST" && !m[2]) {
      const body = await readJson(req);
      if (!body.name || !/^\d{4}-\d\d-\d\d$/.test(body.date || "")) throw err(400, "Нужны название и дата ивента");
      const ev = { id: crypto.randomUUID().slice(0, 8), branchId: b.id };
      for (const k of fields) if (k in body) ev[k] = body[k];
      store.data.events.push(ev);
      store.save();
      return send(res, 200, ev);
    }
    const ev = store.data.events.find((e) => e.id === m[2] && e.branchId === b.id);
    if (!ev) throw err(404, "Ивент не найден");
    if (method === "PUT") {
      const body = await readJson(req);
      for (const k of fields) if (k in body) ev[k] = body[k];
      store.save();
      return send(res, 200, ev);
    }
    if (method === "DELETE") {
      store.data.events = store.data.events.filter((e) => e !== ev);
      store.save();
      return send(res, 200, { ok: true });
    }
  }

  // --- FB ---
  m = p.match(/^\/api\/branches\/([\w-]+)\/fb-refresh$/);
  if (m && method === "POST") {
    const b = branchOr404(m[1]);
    if (!META_TOKEN) throw err(400, "Не задан META_ACCESS_TOKEN на сервере");
    store.data.fb[b.id] = await fetchBranchFb({ branch: b, token: META_TOKEN, settings: store.data.settings, month });
    store.save();
    return send(res, 200, { ok: true, fetchedAt: store.data.fb[b.id].fetchedAt });
  }
  if (p === "/api/fb-refresh-all" && method === "POST") {
    needAdmin();
    if (!META_TOKEN) throw err(400, "Не задан META_ACCESS_TOKEN на сервере");
    const result = {};
    for (const b of store.data.branches.filter((x) => x.adAccountId && !x.archived)) {
      try {
        store.data.fb[b.id] = await fetchBranchFb({ branch: b, token: META_TOKEN, settings: store.data.settings, month });
        result[b.id] = "ok";
      } catch (e) {
        result[b.id] = e.message;
      }
    }
    store.save();
    return send(res, 200, result);
  }

  // --- импорт ---
  if (p === "/api/import" && method === "POST") {
    needAdmin();
    const n = importJson(await readJson(req));
    store.data.imports.push({ at: new Date().toISOString(), by: user.login, records: n });
    store.save();
    return send(res, 200, { imported: n });
  }
  if (p === "/api/import/file" && method === "POST") {
    // тело — файл (CSV/XLSX); ?kind=facts|plans&branch=dp&month=2026-10&dry=1
    needAdmin();
    const buf = await readBody(req);
    const filename = url.searchParams.get("filename") || "";
    const kind = url.searchParams.get("kind") === "plans" ? "plans" : "facts";
    const rows = readTable(buf, filename);
    const parsed = tableToRecords(rows, {
      settings: store.data.settings,
      branches: store.data.branches,
      defaults: { branchId: url.searchParams.get("branch") || null, month: url.searchParams.get("month") || null },
    });
    if (url.searchParams.get("dry") !== "1") {
      const n = applyRecords(parsed.records, kind);
      store.data.imports.push({ at: new Date().toISOString(), by: user.login, file: filename, kind, records: n });
      store.save();
    }
    return send(res, 200, { ...parsed, records: parsed.records.slice(0, 500), total: parsed.records.length });
  }

  // --- экспорт ---
  m = p.match(/^\/api\/branches\/([\w-]+)\/export\.csv$/);
  if (m) {
    const b = branchOr404(m[1]);
    const r = seasonFor(b, month).month;
    const types = store.data.settings.leadTypes.filter((t) => t.kind !== "event");
    const head = ["Продукт", "План договоров", "Норма %", "Перенос лидобалов", "План лидобалов", "Из ивентов", ...types.flatMap((t) => [`${t.name}: лидобалы`, `${t.name}: лиды`]), "CPL", "Бюджет", "Факт лидобалов", "Темп %"];
    const f = (n, d = 1) => (n == null ? "" : String(Math.round(n * 10 ** d) / 10 ** d).replace(".", ","));
    const lines = [head.join(";")];
    for (const pr of r.products) {
      lines.push(
        [pr.name, pr.planContracts, f(pr.factor * 100, 0), f(pr.carryBalls), f(pr.targetBalls), f(pr.eventBalls), ...types.flatMap((t) => {
          const x = pr.byType.find((y) => y.typeId === t.id);
          return [f(x?.balls), f(x?.leads, 0)];
        }), f(pr.cpl, 2), f(pr.budget, 0), f(pr.factBalls), f(pr.pace == null ? null : pr.pace * 100, 0)].join(";"),
      );
    }
    for (const e of r.events) lines.push([`Ивент: ${e.name} (${e.date})`, "", "", "", "", f(e.balls), ...types.flatMap(() => ["", ""]), f(e.cpr, 2), f(e.budget, 0), f(e.ballsFact), ""].join(";"));
    return send(res, 200, "﻿" + lines.join("\n"), { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="plan-${b.id}-${month}.csv"` });
  }

  // --- пользователи ---
  if (p === "/api/users") {
    needAdmin();
    if (method === "GET") return send(res, 200, store.data.users.map(publicUser));
    if (method === "POST") {
      const body = await readJson(req);
      const login = String(body.login || "").trim();
      if (!/^[\w.@-]{3,60}$/.test(login)) throw err(400, "Логин: 3–60 символов (латиница, цифры, . @ -)");
      if (store.data.users.some((u) => u.login === login)) throw err(400, "Такой логин уже есть");
      const password = body.password || auth.randomPassword();
      const u = { id: crypto.randomUUID(), login, name: body.name || login, role: body.role === "admin" ? "admin" : "marketer", branches: body.branches || [], pass: auth.hashPassword(password) };
      store.data.users.push(u);
      store.save();
      return send(res, 200, { ...publicUser(u), password });
    }
  }
  m = p.match(/^\/api\/users\/([\w-]+)$/);
  if (m) {
    needAdmin();
    const u = store.data.users.find((x) => x.id === m[1]);
    if (!u) throw err(404, "Пользователь не найден");
    if (method === "PUT") {
      const body = await readJson(req);
      if ("name" in body) u.name = body.name;
      if ("branches" in body) u.branches = body.branches;
      if ("role" in body && u.id !== user.id) u.role = body.role === "admin" ? "admin" : "marketer";
      if ("disabled" in body && u.id !== user.id) {
        u.disabled = !!body.disabled;
        if (u.disabled) auth.dropUserSessions(u.id);
      }
      let password;
      if (body.resetPassword) {
        password = auth.randomPassword();
        u.pass = auth.hashPassword(password);
        auth.dropUserSessions(u.id);
      }
      store.save();
      return send(res, 200, { ...publicUser(u), password });
    }
    if (method === "DELETE") {
      if (u.id === user.id) throw err(400, "Нельзя удалить себя");
      store.data.users = store.data.users.filter((x) => x !== u);
      auth.dropUserSessions(u.id);
      store.save();
      return send(res, 200, { ok: true });
    }
  }

  throw err(404, "Не найдено");
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  try {
    if (url.pathname.startsWith("/api/")) return await handleApi(req, res, url);
    if (req.method !== "GET") return send(res, 405, "Method not allowed");
    return serveStatic(req, res, url.pathname);
  } catch (e) {
    if (!e.status) console.error(e);
    send(res, e.status || 500, { error: e.status ? e.message : "Внутренняя ошибка: " + e.message });
  }
});

server.listen(PORT, () => console.log(`Планировщик лидов: http://localhost:${PORT}`));
