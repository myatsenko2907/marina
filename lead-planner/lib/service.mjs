// Общая логика API поверх данных хранилища (store.data). Без I/O — работает и на сервере, и в браузере.
import { computeSeason, seasonOf, addMonths } from "./planner.mjs";
import { spendReport } from "./spend.mjs";

export const canSee = (user, branchId) => user.role === "admin" || (user.branches || []).includes(branchId);

export function seasonFor(data, branch, month, today = new Date()) {
  const s = seasonOf(month);
  return computeSeason({
    settings: data.settings,
    branch,
    month,
    today,
    seasonPlan: data.seasons[`${branch.id}|${s.id}`]?.plan || null,
    getMonth: (m) => {
      const rec = data.months[`${branch.id}|${m}`];
      return {
        plan: rec?.plan,
        facts: rec?.facts,
        events: data.events.filter((e) => e.branchId === branch.id && (e.date || "").slice(0, 7) === m),
        fb: data.fb?.[branch.id] || null,
      };
    },
  });
}

const ORDER = { fail: 0, low: 1, boost: 2, nodata: 3, branch: 3, good: 4, ok: 5, future: 6 };

export function overview(data, user, month, today = new Date()) {
  const rows = [];
  for (const b of data.branches) {
    if (!canSee(user, b.id) || b.archived) continue;
    const s = seasonFor(data, b, month, today);
    const t = s.month.totals;
    rows.push({
      id: b.id,
      name: b.name,
      currency: s.month.currency,
      fbConnected: !!b.adAccountId,
      fbFetchedAt: data.fb?.[b.id]?.fetchedAt || null,
      ...t,
      season: s.totals,
      seasonMonths: s.months.map((m) => ({ month: m.month, status: m.status, pace: m.pace, targetBalls: m.targetBalls, factBalls: m.factBalls })),
      warnings: s.month.warnings.length,
      budgetMissing: t.budget == null,
    });
  }
  rows.sort((a, b) => ORDER[a.status] - ORDER[b.status] || (a.pace ?? 9) - (b.pace ?? 9));
  return { month, season: seasonOf(month), branches: rows };
}

export function branchDetail(data, user, branch, month, today = new Date()) {
  const s = seasonFor(data, branch, month, today);
  const rec = data.months[`${branch.id}|${month}`];
  return {
    branch,
    season: s,
    inputs: {
      plan: rec?.plan || { products: {} },
      facts: rec?.facts || { products: {} },
      seasonPlan: data.seasons[`${branch.id}|${s.season.id}`]?.plan || {},
      events: data.events.filter((e) => e.branchId === branch.id && (e.date || "").slice(0, 7) === month),
    },
    spend: data.spend?.[branch.id] ? spendReport(data, { from: month, to: month, branchIds: [branch.id] }).branches[0] : null,
    spendUntil: data.spendMeta?.until || null,
    canEdit: user.role === "admin",
  };
}

// Расход на рекламу по продуктам за период: только филиалы, доступные пользователю.
export function spendFor(data, user, from, to) {
  const ok = (m) => (/^20\d\d-(0[1-9]|1[0-2])$/.test(m || "") ? m : undefined);
  return spendReport(data, { from: ok(from), to: ok(to), branchIds: data.branches.filter((b) => canSee(user, b.id)).map((b) => b.id) });
}

export const BRANCH_FIELDS = ["name", "adAccountId", "fbCurrency", "aliases", "cplAdjust", "ballsPlanFactor", "archived", "note", "cpl"];
export const EVENT_FIELDS = ["name", "date", "productId", "registrationsPlan", "targetBalls", "registrationsFact", "ball", "paidShare", "cprOverride", "fbCampaignPattern", "note"];

export function ensureMonth(data, branchId, month) {
  const k = `${branchId}|${month}`;
  return (data.months[k] ||= { plan: { products: {} }, facts: { products: {} } });
}

export function copyPlanFromPrev(data, branchId, month) {
  const prev = data.months[`${branchId}|${addMonths(month, -1)}`];
  if (!prev) return null;
  const rec = ensureMonth(data, branchId, month);
  for (const [pid, v] of Object.entries(prev.plan.products || {})) {
    const cur = (rec.plan.products[pid] ||= {});
    if (v.mix && !cur.mix) cur.mix = v.mix;
    if (v.cplOverride && cur.cplOverride == null) cur.cplOverride = v.cplOverride;
  }
  return rec;
}
