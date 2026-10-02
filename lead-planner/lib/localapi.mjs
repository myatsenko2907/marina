// API в браузере для опубликованной версии (без сервера): те же маршруты, данные в памяти,
// правки сохраняются в браузере пользователя (localStorage).
import * as service from "./service.mjs";
import { seasonOf } from "./planner.mjs";

const fail = (status, message) => Object.assign(new Error(message), { status });

export function createLocalApi(data, { persist = () => {}, today = () => new Date() } = {}) {
  const users = [
    { id: "admin", login: "admin", name: "Администратор", role: "admin", branches: [] },
    ...data.branches.map((b) => ({ id: `m-${b.id}`, login: `marketer.${b.id}`, name: `Маркетолог: ${b.name}`, role: "marketer", branches: [b.id] })),
    ...(data.extraUsers || []),
  ];
  let me = null;
  const save = () => persist(data);

  async function handle(path, opts = {}) {
    const url = new URL(path, "http://local");
    const p = url.pathname;
    const method = opts.method || "GET";
    const body = opts.body || {};
    const month = /^20\d\d-(0[1-9]|1[0-2])$/.test(url.searchParams.get("month") || "") ? url.searchParams.get("month") : today().toISOString().slice(0, 7);

    if (p === "/api/login") {
      me = users.find((u) => u.id === body.as) || null;
      if (!me) throw fail(401, "Выберите роль");
      return me;
    }
    if (p === "/api/logout") {
      me = null;
      return { ok: true };
    }
    if (!me) throw fail(401, "Требуется вход");
    const isAdmin = me.role === "admin";
    const needAdmin = () => {
      if (!isAdmin) throw fail(403, "Доступно только администратору");
    };
    const branchOr404 = (id) => {
      const b = data.branches.find((x) => x.id === id);
      if (!b || !service.canSee(me, id)) throw fail(404, "Филиал не найден");
      return b;
    };

    if (p === "/api/me") return { ...me, metaConfigured: false };
    if (p === "/api/status") return { updatedAt: data.updatedAt, lastRefresh: null, refreshMinutes: 0, sources: { crm: true }, local: true };
    if (p === "/api/overview") return service.overview(data, me, month, today());
    if (p === "/api/settings") {
      if (method === "PUT") {
        needAdmin();
        data.settings = { ...data.settings, ...body };
        save();
      }
      return data.settings;
    }
    if (p === "/api/branches" && method === "GET") return data.branches.filter((b) => service.canSee(me, b.id));
    if (p === "/api/branches" && method === "POST") {
      needAdmin();
      if (!/^[a-z0-9_-]{2,30}$/.test(body.id || "")) throw fail(400, "Код филиала: латиница/цифры, как alias в CRM");
      if (data.branches.some((b) => b.id === body.id)) throw fail(400, "Такой филиал уже есть");
      const nb = { id: body.id, name: body.name || body.id, adAccountId: body.adAccountId || "", fbCurrency: body.fbCurrency || "USD" };
      data.branches.push(nb);
      save();
      return nb;
    }
    let m = p.match(/^\/api\/branches\/([\w-]+)$/);
    if (m) {
      const b = branchOr404(m[1]);
      if (method === "GET") return service.branchDetail(data, me, b, month, today());
      needAdmin();
      for (const k of service.BRANCH_FIELDS) if (k in body) b[k] = body[k];
      save();
      return b;
    }
    m = p.match(/^\/api\/branches\/([\w-]+)\/(month|season|copy-plan)$/);
    if (m) {
      needAdmin();
      const b = branchOr404(m[1]);
      if (m[2] === "month") {
        const rec = service.ensureMonth(data, b.id, month);
        if (body.plan) rec.plan = body.plan;
        if (body.facts) rec.facts = { ...body.facts, branch: rec.facts.branch };
      } else if (m[2] === "season") {
        data.seasons[`${b.id}|${seasonOf(month).id}`] = { plan: body.plan || {} };
      } else if (!service.copyPlanFromPrev(data, b.id, month)) throw fail(404, "В прошлом месяце нет плана");
      save();
      return { ok: true };
    }
    m = p.match(/^\/api\/branches\/([\w-]+)\/events(?:\/([\w-]+))?$/);
    if (m) {
      const b = branchOr404(m[1]);
      if (method === "POST" && !m[2]) {
        if (!body.name || !/^\d{4}-\d\d-\d\d$/.test(body.date || "")) throw fail(400, "Нужны название и дата ивента");
        const ev = { id: Math.random().toString(36).slice(2, 10), branchId: b.id };
        for (const k of service.EVENT_FIELDS) if (k in body) ev[k] = body[k];
        data.events.push(ev);
        save();
        return ev;
      }
      const ev = data.events.find((e) => e.id === m[2] && e.branchId === b.id);
      if (!ev) throw fail(404, "Ивент не найден");
      if (method === "PUT") for (const k of service.EVENT_FIELDS) if (k in body) ev[k] = body[k];
      if (method === "DELETE") data.events = data.events.filter((e) => e !== ev);
      save();
      return ev;
    }
    if (p === "/api/users") {
      needAdmin();
      if (method === "GET") return users;
      const u = { id: `u-${Date.now()}`, login: body.login, name: body.name || body.login, role: body.role === "admin" ? "admin" : "marketer", branches: body.branches || [] };
      users.push(u);
      return { ...u, password: "задаётся на сервере" };
    }
    m = p.match(/^\/api\/users\/([\w-]+)$/);
    if (m) {
      needAdmin();
      const u = users.find((x) => x.id === m[1]);
      if (!u) throw fail(404, "Пользователь не найден");
      if (method === "DELETE") users.splice(users.indexOf(u), 1);
      else Object.assign(u, { name: body.name ?? u.name, branches: body.branches ?? u.branches, role: body.role ?? u.role, disabled: !!body.disabled });
      return u;
    }
    throw fail(400, "В демо-версии по ссылке это действие недоступно — оно работает на сервере сервиса.");
  }
  handle.users = () => users;
  return handle;
}
