// Движок расчёта: план набора → план месяца → лидобалы → лиды по типам → бюджет.
// Чистые функции без I/O.
//
// Методика лидобалов (см. README):
//   1 лидобал = 1 ожидаемый оплаченный договор.
//   балл лида типа t = норма конверсии этого типа в договор (звонок 0.18, лид-форма 0.05 …).
//   План лидобалов на месяц = план договоров × ballsPlanFactor (по умолчанию 0.9)
//                             + недостача лидобалов прошлых месяцев этого набора.
//   Лидобалы распределяются по типам лидов по долям вклада (mix),
//   лиды_t = лидобалы_t / балл_t,  бюджет = Σ платные лиды × CPL кабинета города.

export const DAY = 86400000;

export const round = (n, d = 0) => {
  if (n == null || !Number.isFinite(n)) return null;
  const k = 10 ** d;
  return Math.round(n * k) / k;
};

const num = (v) => (v == null || v === "" || !Number.isFinite(Number(v)) ? null : Number(v));

export function monthBounds(month) {
  const [y, m] = month.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m, 0));
  return { start, end, days: end.getUTCDate() };
}

export function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

export function addMonths(month, n) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return d.toISOString().slice(0, 7);
}

/** Набор = полугодие, как в CRM (план набора по halfYear): H1 янв–июн, H2 июл–дек. */
export function seasonOf(month) {
  const [y, m] = month.split("-").map(Number);
  const half = m <= 6 ? 1 : 2;
  const first = `${y}-${half === 1 ? "01" : "07"}`;
  return {
    id: `${y}-H${half}`,
    year: y,
    half,
    name: `Набор ${half === 1 ? "I" : "II"} полугодие ${y}`,
    months: Array.from({ length: 6 }, (_, i) => addMonths(first, i)),
  };
}

/** Доля прошедшего месяца (0…1) на дату today (включительно). */
export function elapsedShare(month, today = new Date()) {
  const { start, end, days } = monthBounds(month);
  const t = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  if (t < start.getTime()) return 0;
  if (t > end.getTime()) return 1;
  return (Math.floor((t - start.getTime()) / DAY) + 1) / days;
}

function toRegex(pattern) {
  if (!pattern) return null;
  try {
    return new RegExp(pattern, "i");
  } catch {
    return null;
  }
}

/** К чему относится кампания FB: ивент, продукт (форма обучения) или прочее. */
export function classifyCampaign(name, settings) {
  const ev = toRegex(settings.eventCampaignPattern);
  if (ev && ev.test(name)) return { kind: "event" };
  for (const p of settings.products) {
    const re = toRegex(p.campaignPattern);
    if (re && re.test(name)) return { kind: "product", productId: p.id };
  }
  return { kind: "other" };
}

/** Сумма действий; шаблон с «*» на конце — префикс. */
export function sumActions(actions = {}, types = []) {
  let s = 0;
  for (const t of types) {
    if (t.endsWith("*")) {
      const pre = t.slice(0, -1);
      for (const [k, v] of Object.entries(actions)) if (k.startsWith(pre)) s += Number(v) || 0;
    } else s += Number(actions[t]) || 0;
  }
  return s;
}

/** Лиды кампании: первый найденный тип действия из списка приоритета (без двойного счёта). */
export function countLeads(actions = {}, priority = []) {
  for (const a of priority) {
    const v = sumActions(actions, [a]);
    if (v > 0) return v;
  }
  return 0;
}

/** Сводит кампании кабинета по продуктам и ивентам. */
export function aggregateCampaigns(campaigns = [], settings) {
  const byProduct = {};
  const event = { spend: 0, leads: 0, campaigns: [] };
  const other = { spend: 0, leads: 0, campaigns: [] };
  let spend = 0;
  let leads = 0;
  for (const c of campaigns) {
    const cls = classifyCampaign(c.name || "", settings);
    const l = countLeads(c.actions, settings.leadActionPriority);
    const s = Number(c.spend) || 0;
    if (cls.kind === "event") {
      event.spend += s;
      event.leads += l;
      event.campaigns.push({ ...c, leads: l });
      continue; // ивенты не искажают CPL продуктов
    }
    spend += s;
    leads += l;
    if (cls.kind === "product") {
      const b = (byProduct[cls.productId] ||= { spend: 0, leads: 0, actions: {}, campaigns: 0 });
      b.spend += s;
      b.leads += l;
      b.campaigns += 1;
      for (const [k, v] of Object.entries(c.actions || {})) b.actions[k] = (b.actions[k] || 0) + (Number(v) || 0);
    } else {
      other.spend += s;
      other.leads += l;
      if (s > 0) other.campaigns.push(c.name);
    }
  }
  return { byProduct, event, other, spend, leads };
}

/** Ограничивает доли сверху (caps) и перераспределяет излишек пропорционально на остальные типы. */
export function applyCaps(mix, caps = {}) {
  const out = { ...mix };
  const capped = new Set();
  for (let i = 0; i < 10; i++) {
    let excess = 0;
    for (const [id, cap] of Object.entries(caps)) {
      if (id in out && out[id] > cap + 1e-12) {
        excess += out[id] - cap;
        out[id] = cap;
        capped.add(id);
      }
    }
    if (excess <= 0) break;
    const free = Object.keys(out).filter((id) => !capped.has(id));
    const base = free.reduce((a, id) => a + out[id], 0);
    if (!free.length) break;
    for (const id of free) out[id] += base > 0 ? (excess * out[id]) / base : excess / free.length;
  }
  return out;
}

function normalize(weights, ids) {
  const out = {};
  let sum = 0;
  for (const id of ids) sum += Math.max(0, Number(weights?.[id]) || 0);
  for (const id of ids) out[id] = sum > 0 ? Math.max(0, Number(weights?.[id]) || 0) / sum : 1 / ids.length;
  return out;
}

/** Статус по темпу: pace = факт / (план × прошедшая доля месяца). */
export function statusOf(pace, settings, share) {
  if (!share || pace == null) return "future";
  const th = settings.thresholds || { ok: 1, risk: 0.85 };
  if (pace >= th.ok) return "ok";
  if (pace >= th.risk) return "risk";
  return "fail";
}

export function ballNorm(settings, productId, typeId, overrides) {
  const o = overrides?.[productId]?.[typeId] ?? settings.ballNorms?.[productId]?.[typeId];
  if (num(o) != null) return Number(o);
  return Number(settings.leadTypes.find((t) => t.id === typeId)?.ball) || 0;
}

/** Факт лидобалов продукта за месяц: из отчёта KPI → из лидов по типам → из FB. */
export function factBallsOf(fact, ctx) {
  const { settings, productId, regularTypes, mtdp, normOverrides } = ctx;
  if (num(fact?.balls) != null) return { balls: Number(fact.balls), source: "report", byType: null };
  const byType = {};
  let any = false;
  let total = 0;
  for (const t of regularTypes) {
    let leads = num(fact?.leads?.[t.id]);
    let src = leads != null ? "manual" : null;
    if (leads == null && t.fbActions?.length && mtdp) {
      leads = sumActions(mtdp.actions, t.fbActions);
      src = "fb";
    }
    if (leads == null) continue;
    any = true;
    const b = leads * ballNorm(settings, productId, t.id, normOverrides);
    byType[t.id] = { leads, balls: b, source: src };
    total += b;
  }
  return any ? { balls: total, source: Object.values(byType).some((x) => x.source === "manual") ? "leads" : "fb", byType } : { balls: null, source: null, byType: null };
}

/** Расчёт плана одного ивента. */
export function computeEvent(ev, ctx) {
  const { settings, fbEvents, branchCpl, adjust } = ctx;
  const evType = settings.leadTypes.find((t) => t.kind === "event") || { ball: 0.08 };
  const ball = num(ev.ball) ?? evType.ball;
  const warnings = [];
  let regs = num(ev.registrationsPlan) || 0;
  let regsSource = "plan";
  if (!regs && num(ev.targetBalls) > 0 && ball > 0) {
    regs = Math.ceil(Number(ev.targetBalls) / ball);
    regsSource = "target";
  }

  // Цена регистрации: ручная → кампании этого ивента → средняя по ивентам кабинета → CPL кабинета.
  let cpr = null;
  let cprSource = null;
  let matched = null;
  if (num(ev.cprOverride) != null) {
    cpr = Number(ev.cprOverride);
    cprSource = "manual";
  } else {
    const re = toRegex(ev.fbCampaignPattern);
    if (re && fbEvents) {
      matched = fbEvents.campaigns.filter((c) => re.test(c.name));
      const s = matched.reduce((a, c) => a + (Number(c.spend) || 0), 0);
      const l = matched.reduce((a, c) => a + c.leads, 0);
      if (l > 0) {
        cpr = s / l;
        cprSource = "fb_event";
      }
    }
    if (cpr == null && fbEvents?.leads > 0) {
      cpr = fbEvents.spend / fbEvents.leads;
      cprSource = "fb_events_avg";
    }
    if (cpr == null && branchCpl != null) {
      cpr = branchCpl;
      cprSource = "fb_branch_cpl";
    }
    if (cpr != null) cpr *= adjust;
  }
  if (cpr == null) warnings.push(`Ивент «${ev.name}»: нет цены регистрации — укажите вручную или обновите FB`);

  const paidShare = num(ev.paidShare) ?? 1;
  const budget = cpr == null ? null : regs * paidShare * cpr;
  let regsFact = num(ev.registrationsFact);
  let regsFactSource = regsFact != null ? "manual" : null;
  if (regsFact == null && matched?.length) {
    regsFact = matched.reduce((a, c) => a + c.leads, 0);
    regsFactSource = "fb";
  }

  return {
    id: ev.id,
    name: ev.name,
    date: ev.date,
    productId: ev.productId || null,
    ball,
    paidShare,
    registrations: regs,
    registrationsSource: regsSource,
    registrationsFact: regsFact,
    registrationsFactSource: regsFactSource,
    balls: regs * ball,
    ballsFact: (regsFact || 0) * ball,
    cpr,
    cprSource,
    budget,
    warnings,
  };
}

/**
 * План филиала на один месяц.
 * carry — { productId: недостача лидобалов, перенесённая из прошлых месяцев набора }.
 */
export function computeMonth({ settings, branch, month, plan = {}, facts = {}, events = [], fb = null, carry = {}, mixHint = {}, today = new Date() }) {
  const warnings = [];
  const share = elapsedShare(month, today);
  const factor = num(plan.ballsPlanFactor) ?? num(branch.ballsPlanFactor) ?? settings.ballsPlanFactor ?? 0.9;
  const adjust = num(plan.cplAdjust) ?? num(branch.cplAdjust) ?? 1;
  const regularTypes = settings.leadTypes.filter((t) => t.kind !== "event");
  const typeIds = regularTypes.map((t) => t.id);

  const fbAgg = fb?.cpl ? aggregateCampaigns(fb.cpl.campaigns, settings) : null;
  const fbEv = fb?.events ? aggregateCampaigns(fb.events.campaigns, settings).event : fbAgg?.event;
  const fbMtd = fb?.mtd && fb.mtd.month === month ? aggregateCampaigns(fb.mtd.campaigns, settings) : null;
  const branchCpl = fbAgg && fbAgg.leads > 0 ? fbAgg.spend / fbAgg.leads : null;

  const evs = events.map((e) => computeEvent(e, { settings, fbEvents: fbEv, branchCpl, adjust }));
  for (const e of evs) warnings.push(...e.warnings);

  const productIds = new Set([
    ...Object.keys(plan.products || {}),
    ...Object.keys(facts.products || {}),
    ...Object.keys(carry),
    ...evs.map((e) => e.productId).filter(Boolean),
  ]);

  const products = [];
  const noCpl = [];
  for (const prod of settings.products) {
    if (!productIds.has(prod.id)) continue;
    const inp = plan.products?.[prod.id] || {};
    const fact = facts.products?.[prod.id] || {};
    const planContracts = num(inp.plan) || 0;
    const carryBalls = Math.max(0, Number(carry[prod.id]) || 0);
    const baseBalls = planContracts * factor;
    const targetBalls = baseBalls + carryBalls;
    const productEvents = evs.filter((e) => e.productId === prod.id);
    const eventBalls = productEvents.reduce((a, e) => a + e.balls, 0);
    const restBalls = Math.max(0, targetBalls - eventBalls);
    if (!targetBalls && !productEvents.length && num(fact.contracts) == null && num(fact.balls) == null) continue;

    const mixSrc = inp.mix ? "plan" : mixHint[prod.id] ? "history" : prod.mix ? "product" : "default";
    const mix = applyCaps(normalize(inp.mix || mixHint[prod.id] || prod.mix || settings.defaultMix, typeIds), settings.mixCaps);

    // CPL продукта
    let cpl = null;
    let cplSource = null;
    const fbp = fbAgg?.byProduct[prod.id];
    if (num(inp.cplOverride) != null) {
      cpl = Number(inp.cplOverride);
      cplSource = "manual";
    } else {
      if (fbp && fbp.leads > 0) {
        cpl = fbp.spend / fbp.leads;
        cplSource = "fb_product";
      } else if (branchCpl != null) {
        cpl = branchCpl;
        cplSource = "fb_branch";
      }
      if (cpl != null) cpl *= adjust;
    }

    const byType = regularTypes.map((t) => {
      const norm = ballNorm(settings, prod.id, t.id, plan.ballNorms);
      const balls = restBalls * mix[t.id];
      const leads = norm > 0 ? balls / norm : 0;
      const unitCost = t.paid ? (num(t.cpl) != null ? Number(t.cpl) : cpl != null ? cpl * (num(t.cplFactor) ?? 1) : null) : 0;
      return {
        typeId: t.id,
        share: mix[t.id],
        norm,
        balls,
        leads,
        paid: !!t.paid,
        cpl: unitCost,
        budget: unitCost == null ? null : leads * unitCost,
      };
    });
    if (restBalls > 0 && byType.some((r) => r.paid && r.leads > 0 && r.cpl == null)) noCpl.push(prod.name.split(" — ")[0]);

    const mtdp = fbMtd?.byProduct[prod.id];
    const fb_ = factBallsOf(fact, { settings, productId: prod.id, regularTypes, mtdp, normOverrides: plan.ballNorms });
    const eventFact = productEvents.reduce((a, e) => a + e.ballsFact, 0);
    const factBalls = fb_.balls == null ? (eventFact || null) : fb_.balls + (fb_.source === "report" ? 0 : eventFact);
    const expected = targetBalls * share;
    const pace = expected > 0 && factBalls != null ? factBalls / expected : null;
    const budget = byType.reduce((a, r) => (r.budget == null || a == null ? (r.paid && r.leads > 0 ? null : a) : a + r.budget), 0);
    const eventBudget = productEvents.reduce((a, e) => a + (e.budget || 0), 0);

    products.push({
      id: prod.id,
      name: prod.name,
      planContracts,
      factContracts: num(fact.contracts),
      factor,
      baseBalls,
      carryBalls,
      targetBalls,
      eventBalls,
      restBalls,
      factBalls,
      factBallsSource: fb_.source,
      expectedBalls: expected,
      gapBalls: factBalls == null ? null : targetBalls - factBalls,
      pace,
      status: factBalls == null && share > 0 ? "nodata" : statusOf(pace, settings, share),
      mix,
      mixSource: mixSrc,
      leads: byType.reduce((a, r) => a + r.leads, 0),
      paidLeads: byType.filter((r) => r.paid).reduce((a, r) => a + r.leads, 0),
      cpl,
      cplSource,
      fb: fbp ? { spend: fbp.spend, leads: fbp.leads, campaigns: fbp.campaigns } : null,
      spentMtd: mtdp ? mtdp.spend : null,
      fbLeadsMtd: mtdp ? mtdp.leads : null,
      budget,
      eventBudget,
      byType,
    });
  }

  if (noCpl.length)
    warnings.push(
      fbAgg
        ? `Нет CPL для: ${noCpl.join(", ")} — в FB-кабинете нет лидов по этим продуктам. Задайте CPL вручную или проверьте шаблоны кампаний в настройках.`
        : `Бюджет не рассчитан: нет данных FB-кабинета (${noCpl.join(", ")}). Нажмите «Обновить из FB» или задайте CPL вручную во «Вводе данных».`,
    );
  const sum = (arr, k) => arr.reduce((a, x) => a + (Number(x[k]) || 0), 0);
  const known = products.filter((p) => p.factBalls != null);
  const targetBalls = sum(products, "targetBalls");
  const factBalls = known.length ? sum(products, "factBalls") : null;
  const expectedBalls = targetBalls * share;
  const pace = expectedBalls > 0 && factBalls != null ? factBalls / expectedBalls : null;
  const productBudget = products.some((p) => p.budget == null && p.paidLeads > 0) ? null : sum(products, "budget");
  const eventBudget = sum(evs, "budget");
  const budget = productBudget == null ? null : productBudget + eventBudget;
  const spentMtd = fbMtd ? fbMtd.spend + fbMtd.event.spend : null;
  const daysLeft = Math.max(0, Math.round((1 - share) * monthBounds(month).days));

  return {
    branchId: branch.id,
    branchName: branch.name,
    currency: branch.fbCurrency || "USD",
    month,
    elapsedShare: share,
    daysLeft,
    products,
    events: evs,
    fb: fbAgg
      ? {
          fetchedAt: fb.fetchedAt,
          period: { since: fb.cpl.since, until: fb.cpl.until },
          spend: fbAgg.spend,
          leads: fbAgg.leads,
          cpl: branchCpl,
          eventSpend: fbEv?.spend ?? 0,
          eventLeads: fbEv?.leads ?? 0,
          unmappedSpend: fbAgg.other.spend,
          unmappedCampaigns: fbAgg.other.campaigns.slice(0, 20),
        }
      : null,
    totals: {
      planContracts: sum(products, "planContracts"),
      factContracts: products.some((p) => p.factContracts != null) ? sum(products, "factContracts") : null,
      baseBalls: sum(products, "baseBalls"),
      carryBalls: sum(products, "carryBalls"),
      targetBalls,
      eventBalls: sum(evs, "balls"),
      factBalls,
      expectedBalls,
      gapBalls: factBalls == null ? null : Math.max(0, expectedBalls - factBalls),
      pace,
      status: factBalls == null && share > 0 ? "nodata" : statusOf(pace, settings, share),
      leads: sum(products, "leads"),
      paidLeads: sum(products, "paidLeads"),
      registrations: sum(evs, "registrations"),
      productBudget,
      eventBudget,
      budget,
      spentMtd,
      fbLeadsMtd: fbMtd ? fbMtd.leads + fbMtd.event.leads : null,
      projectedSpend: spentMtd != null && share > 0 ? spentMtd / share : null,
      budgetPace: budget > 0 && spentMtd != null && share > 0 ? spentMtd / (budget * share) : null,
      dailyBudgetLeft: budget > 0 && spentMtd != null && daysLeft > 0 ? Math.max(0, budget - spentMtd) / daysLeft : null,
    },
    warnings: [...new Set(warnings)],
  };
}

/** Доли вклада типов лидов по факту месяца (для подсказки mix следующему месяцу). */
export function mixFromFacts(facts, settings) {
  const out = {};
  const regular = settings.leadTypes.filter((t) => t.kind !== "event");
  for (const [pid, f] of Object.entries(facts?.products || {})) {
    if (!f?.leads) continue;
    const w = {};
    let s = 0;
    for (const t of regular) {
      const v = (num(f.leads[t.id]) || 0) * ballNorm(settings, pid, t.id);
      w[t.id] = v;
      s += v;
    }
    if (s > 0) out[pid] = w;
  }
  return out;
}

/**
 * План набора: считает все месяцы полугодия по порядку и переносит недостачу
 * лидобалов закрытых месяцев в следующий месяц (по каждому продукту).
 * getMonth(month) → { plan, facts, events, fb }
 */
export function computeSeason({ settings, branch, month, getMonth, seasonPlan = null, today = new Date() }) {
  const season = seasonOf(month);
  const months = [];
  let carry = {};
  let prevFacts = null;
  for (const m of season.months) {
    const src = getMonth(m) || {};
    const mixHint = prevFacts ? mixFromFacts(prevFacts, settings) : {};
    const r = computeMonth({ settings, branch, month: m, carry, mixHint, today, ...src });
    months.push(r);
    // Недостачу переносим только из закрытых месяцев с известным фактом.
    const next = {};
    if (r.elapsedShare >= 1) {
      for (const p of r.products) {
        if (p.factBalls == null) continue;
        const gap = p.targetBalls - p.factBalls;
        if (gap > 0) next[p.id] = gap;
      }
    }
    carry = settings.carryOver === false ? {} : next;
    prevFacts = src.facts || null;
  }

  // Итоги набора
  const totals = {};
  const productIds = new Set([...months.flatMap((r) => r.products.map((p) => p.id)), ...Object.keys(seasonPlan || {})]);
  for (const pid of productIds) {
    const rows = months.map((r) => r.products.find((p) => p.id === pid)).filter(Boolean);
    const seasonPlanContracts = num(seasonPlan?.[pid]);
    totals[pid] = {
      id: pid,
      name: settings.products.find((p) => p.id === pid)?.name || pid,
      order: settings.products.findIndex((p) => p.id === pid),
      seasonPlanContracts,
      monthsPlanContracts: rows.reduce((a, p) => a + p.planContracts, 0),
      factContracts: rows.reduce((a, p) => a + (p.factContracts || 0), 0),
      planBalls: rows.reduce((a, p) => a + p.baseBalls, 0),
      factBalls: rows.some((p) => p.factBalls != null) ? rows.reduce((a, p) => a + (p.factBalls || 0), 0) : null,
      budget: rows.some((p) => p.budget == null && p.paidLeads > 0) ? null : rows.reduce((a, p) => a + (p.budget || 0), 0),
    };
  }
  const list = Object.values(totals).sort((a, b) => (a.order < 0 ? 99 : a.order) - (b.order < 0 ? 99 : b.order));
  const current = months.find((r) => r.month === month);
  return {
    season,
    month: current,
    months: months.map((r) => ({
      month: r.month,
      elapsedShare: r.elapsedShare,
      planContracts: r.totals.planContracts,
      factContracts: r.totals.factContracts,
      baseBalls: r.totals.baseBalls,
      carryBalls: r.totals.carryBalls,
      targetBalls: r.totals.targetBalls,
      factBalls: r.totals.factBalls,
      pace: r.totals.pace,
      status: r.totals.status,
      budget: r.totals.budget,
      spentMtd: r.totals.spentMtd,
    })),
    products: list,
    totals: {
      seasonPlanContracts: list.some((p) => p.seasonPlanContracts != null) ? list.reduce((a, p) => a + (p.seasonPlanContracts || 0), 0) : null,
      monthsPlanContracts: list.reduce((a, p) => a + p.monthsPlanContracts, 0),
      factContracts: list.reduce((a, p) => a + p.factContracts, 0),
      planBalls: list.reduce((a, p) => a + p.planBalls, 0),
      factBalls: list.some((p) => p.factBalls != null) ? list.reduce((a, p) => a + (p.factBalls || 0), 0) : null,
      budget: list.some((p) => p.budget == null) ? null : list.reduce((a, p) => a + p.budget, 0),
    },
  };
}
