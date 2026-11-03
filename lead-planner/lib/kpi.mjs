// KPI маркетологов филиалов: бонус по выполнению плана лидобалов + премия за отзывы Google.
// Чистые функции без I/O — работают и на сервере, и на странице по ссылке.
//
// План KPI = план лидобалов месяца из «Плана лидобалов» (план договоров × норма, без переноса недостачи)
//            × доля плана для KPI (по умолчанию 100%).
// Выполнение = факт лидобалов ÷ план KPI.
// Коэффициент бонуса:
//   < порога (80%)        → 0
//   порог … 100%          → линейно от «выплаты на пороге» (50%) до 100%
//   > 100%                → 100% + ускоритель (×1,5 за каждый процент сверх плана), не выше потолка (150%)
// Ворота:
//   бюджет  — сверх 100% платим, только если расход на рекламу ≤ бюджет плана × 1,1;
//   качество — если доля удалённых заявок (спам, дубли) сильно выше сети, коэффициент × 0,8.
// Отзывы Google — отдельная премия по плану от числа студентов (правило с 1 октября 2026).

export const DEFAULT_KPI = {
  currency: "грн",
  threshold: 0.8, // порог выполнения плана лидобалов, с которого начисляется бонус
  floorPayout: 0.5, // доля целевого бонуса на пороге
  accel: 1.5, // ускоритель сверх 100%: +1,5% бонуса за каждый 1% выполнения
  cap: 1.5, // потолок коэффициента
  planShare: 1, // доля плана лидобалов, которая идёт в план KPI
  budgetGate: 1.1, // сверх 100% — только если расход ≤ бюджет × 1,1
  qualityGate: 0.8, // множитель при плохом качестве лидов
  // Целевой бонус (при 100% плана) по размеру филиала — план договоров месяца.
  bonusTiers: [
    { minPlan: 100, bonus: 12000 },
    { minPlan: 60, bonus: 9000 },
    { minPlan: 30, bonus: 7000 },
    { minPlan: 0, bonus: 5000 },
  ],
  reviews: {
    tiers: [
      { minStudents: 500, plan: 25 },
      { minStudents: 200, plan: 20 },
      { minStudents: 100, plan: 15 },
      { minStudents: 0, plan: 10 },
    ],
    reward: 1000,
    rewardSmall: 500, // филиалы до 99 студентов
    smallBelow: 100,
    penalty: true, // план не выполнен — минус сумма премии (правило с 1.10.2026)
  },
};

const knum = (v) => (v == null || v === "" || !Number.isFinite(Number(v)) ? null : Number(v));

export const kpiSettings = (settings) => {
  const k = settings?.kpi || {};
  return { ...DEFAULT_KPI, ...k, reviews: { ...DEFAULT_KPI.reviews, ...(k.reviews || {}) }, bonusTiers: k.bonusTiers?.length ? k.bonusTiers : DEFAULT_KPI.bonusTiers };
};

/** Коэффициент бонуса по выполнению p (0…). */
export function payoutK(p, ks) {
  if (p == null || !Number.isFinite(p)) return null;
  if (p < ks.threshold) return 0;
  if (p < 1) return ks.floorPayout + ((1 - ks.floorPayout) * (p - ks.threshold)) / (1 - ks.threshold);
  return Math.min(ks.cap, 1 + (p - 1) * ks.accel);
}

export function targetBonus(branch, planContracts, ks) {
  if (knum(branch?.kpiBonus) != null) return { bonus: Number(branch.kpiBonus), source: "branch" };
  const tiers = [...ks.bonusTiers].sort((a, b) => b.minPlan - a.minPlan);
  const t = tiers.find((x) => (planContracts || 0) >= x.minPlan) || tiers.at(-1);
  return { bonus: t?.bonus ?? 0, source: "tier", minPlan: t?.minPlan ?? 0 };
}

export function reviewsPlan(students, ks) {
  if (knum(students) == null) return null;
  const tiers = [...ks.reviews.tiers].sort((a, b) => b.minStudents - a.minStudents);
  return (tiers.find((x) => students >= x.minStudents) || tiers.at(-1))?.plan ?? null;
}

/**
 * KPI филиала за месяц.
 * m — результат computeMonth (season.month), rec — запись месяца хранилища,
 * spendUsd — расход FB + Google за месяц ($) или null, qualityFlag — флаг доли удалённых ("bad"/"warn"/null).
 */
export function branchKpi({ settings, branch, m, rec, spendUsd = null, qualityFlag = null }) {
  const ks = kpiSettings(settings);
  const t = m.totals;
  const share = m.elapsedShare;
  const planBalls = (t.baseBalls || 0) * ks.planShare;
  const factBalls = t.factBalls;
  const closed = share >= 1;
  const started = share > 0;
  const pct = planBalls > 0 && factBalls != null ? factBalls / planBalls : null;
  const forecastBalls = !closed && started && factBalls != null ? factBalls / share : factBalls;
  const forecastPct = planBalls > 0 && forecastBalls != null ? forecastBalls / planBalls : null;
  const usePct = closed ? pct : forecastPct; // для текущего месяца — по прогнозу на конец месяца

  const tb = targetBonus(branch, t.planContracts, ks);
  let k = planBalls > 0 ? payoutK(usePct, ks) : null;
  const gates = [];
  const budget = t.budget;
  if (k != null && k > 1 && spendUsd != null && budget > 0 && spendUsd > budget * ks.budgetGate) {
    k = 1;
    gates.push({ id: "budget", text: `Расход $${Math.round(spendUsd)} выше бюджета плана $${Math.round(budget)} больше чем на ${Math.round((ks.budgetGate - 1) * 100)}% — сверх 100% не начисляется` });
  }
  if (k != null && k > 0 && qualityFlag === "bad") {
    k *= ks.qualityGate;
    gates.push({ id: "quality", text: `Доля удалённых заявок (спам, дубли) намного выше сети — бонус × ${String(ks.qualityGate).replace(".", ",")}` });
  }
  const bonusBalls = k == null ? null : tb.bonus * k;

  // отзывы
  const students = knum(branch.students);
  const rPlan = reviewsPlan(students, ks);
  const rFact = knum(rec?.kpi?.reviews);
  const reward = students != null && students < ks.reviews.smallBelow ? ks.reviews.rewardSmall : ks.reviews.reward;
  let reviewsAmount = null;
  if (rPlan != null && rFact != null) reviewsAmount = rFact >= rPlan ? reward : ks.reviews.penalty ? -reward : 0;

  const need = (p) => (planBalls > 0 && factBalls != null ? Math.max(0, planBalls * p - factBalls) : null);
  return {
    id: branch.id,
    name: branch.name,
    month: m.month,
    closed,
    started,
    elapsedShare: share,
    daysLeft: m.daysLeft,
    planContracts: t.planContracts,
    factContracts: t.factContracts,
    planBalls,
    factBalls,
    pct,
    forecastBalls,
    forecastPct,
    usePct,
    toThreshold: need(ks.threshold),
    toPlan: need(1),
    targetBonus: tb.bonus,
    targetSource: tb.source,
    k,
    bonusBalls,
    gates,
    budget,
    spendUsd,
    perBall: bonusBalls > 0 && factBalls > 0 ? bonusBalls / (closed ? factBalls : forecastBalls) : null,
    students,
    reviewsPlan: rPlan,
    reviewsFact: rFact,
    reviewsReward: reward,
    reviewsAmount,
    total: bonusBalls == null && reviewsAmount == null ? null : (bonusBalls || 0) + (reviewsAmount || 0),
    status: planBalls <= 0 ? "noplan" : usePct == null ? "nodata" : usePct >= 1 ? "ok" : usePct >= ks.threshold ? "good" : usePct >= ks.threshold * 0.75 ? "boost" : "fail",
  };
}

const kMedian = (a) => {
  const s = a.filter((x) => x != null && Number.isFinite(x)).sort((x, y) => x - y);
  if (!s.length) return null;
  const i = s.length >> 1;
  return s.length % 2 ? s[i] : (s[i - 1] + s[i]) / 2;
};

/** Сводка по сети + калибровка порога. rows — branchKpi по филиалам, prevRows — за прошлый (закрытый) месяц. */
export function kpiSummary(rows, prevRows, settings) {
  const ks = kpiSettings(settings);
  const withPlan = rows.filter((r) => r.planBalls > 0);
  const sum = (a, k) => a.reduce((s, r) => s + (Number(r[k]) || 0), 0);
  const calib = (() => {
    const base = (prevRows || []).filter((r) => r.planBalls > 0 && r.factBalls != null);
    if (!base.length) return null;
    const pcts = base.map((r) => r.pct);
    const med = kMedian(pcts);
    const reached = base.filter((r) => r.pct >= ks.threshold).length;
    // доля плана, при которой половина филиалов дошла бы до порога
    const suggestShare = med != null ? Math.min(1, (med * ks.planShare) / ks.threshold) : null;
    return { month: base[0].month, n: base.length, reached, median: med, suggestShare };
  })();
  return {
    settings: ks,
    branches: withPlan.length,
    reached: withPlan.filter((r) => r.usePct != null && r.usePct >= ks.threshold).length,
    reachedPlan: withPlan.filter((r) => r.usePct != null && r.usePct >= 1).length,
    median: kMedian(withPlan.map((r) => r.usePct)),
    targetFund: sum(withPlan, "targetBonus"),
    bonusFund: sum(rows, "bonusBalls"),
    reviewsFund: sum(rows, "reviewsAmount"),
    total: sum(rows, "total"),
    factBalls: sum(withPlan, "factBalls"),
    planBalls: sum(withPlan, "planBalls"),
    reviewsKnown: rows.filter((r) => r.reviewsFact != null && r.reviewsPlan != null).length,
    reviewsDone: rows.filter((r) => r.reviewsFact != null && r.reviewsPlan != null && r.reviewsFact >= r.reviewsPlan).length,
    calib,
  };
}
