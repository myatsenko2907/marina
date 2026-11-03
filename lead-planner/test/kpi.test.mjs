import test from "node:test";
import assert from "node:assert/strict";
import { payoutK, branchKpi, kpiSettings, reviewsPlan, targetBonus, kpiSummary } from "../lib/kpi.mjs";

const ks = kpiSettings({});
const near = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);
const month = (o = {}) => ({ month: "2026-10", elapsedShare: 1, daysLeft: 0, totals: { planContracts: 50, factContracts: 40, baseBalls: 45, factBalls: 45, budget: 1000, ...o } });

test("шкала бонуса: порог 80%, 50% на пороге, ускоритель и потолок", () => {
  assert.equal(payoutK(0.79, ks), 0);
  near(payoutK(0.8, ks), 0.5);
  near(payoutK(0.9, ks), 0.75);
  near(payoutK(1, ks), 1);
  near(payoutK(1.2, ks), 1.3);
  near(payoutK(2, ks), 1.5);
});

test("целевой бонус по плану договоров и свой бонус филиала", () => {
  assert.equal(targetBonus({}, 120, ks).bonus, 12000);
  assert.equal(targetBonus({}, 60, ks).bonus, 9000);
  assert.equal(targetBonus({}, 45, ks).bonus, 7000);
  assert.equal(targetBonus({}, 5, ks).bonus, 5000);
  assert.equal(targetBonus({ kpiBonus: 8000 }, 5, ks).bonus, 8000);
});

test("план отзывов по числу студентов", () => {
  assert.equal(reviewsPlan(600, ks), 25);
  assert.equal(reviewsPlan(250, ks), 20);
  assert.equal(reviewsPlan(150, ks), 15);
  assert.equal(reviewsPlan(80, ks), 10);
  assert.equal(reviewsPlan(null, ks), null);
});

test("KPI закрытого месяца: 100% плана + отзывы выполнены", () => {
  const r = branchKpi({ settings: {}, branch: { id: "dp", name: "Днепр", students: 250 }, m: month(), rec: { kpi: { reviews: 21 } } });
  near(r.pct, 1);
  assert.equal(r.bonusBalls, 7000);
  assert.equal(r.reviewsAmount, 1000);
  assert.equal(r.total, 8000);
  assert.equal(r.status, "ok");
});

test("ниже порога — 0; отзывы не выполнены — минус; маленький филиал — 500", () => {
  const r = branchKpi({ settings: {}, branch: { id: "x", name: "X", students: 80 }, m: month({ factBalls: 20 }), rec: { kpi: { reviews: 3 } } });
  assert.equal(r.k, 0);
  assert.equal(r.reviewsAmount, -500);
  assert.equal(r.status, "fail");
});

test("текущий месяц считается по прогнозу на конец месяца", () => {
  const r = branchKpi({ settings: {}, branch: { id: "x", name: "X" }, m: { ...month({ factBalls: 18 }), elapsedShare: 0.5, daysLeft: 15 }, rec: null });
  near(r.forecastPct, 0.8);
  near(r.k, 0.5);
  near(r.toThreshold, 18);
});

test("ворота: перерасход бюджета режет ускоритель, плохое качество — × 0,8", () => {
  const over = branchKpi({ settings: {}, branch: { id: "x", name: "X" }, m: month({ factBalls: 54 }), rec: null, spendUsd: 1200 });
  near(over.k, 1);
  assert.equal(over.gates[0].id, "budget");
  const ok = branchKpi({ settings: {}, branch: { id: "x", name: "X" }, m: month({ factBalls: 54 }), rec: null, spendUsd: 1050 });
  near(ok.k, 1.3);
  const bad = branchKpi({ settings: {}, branch: { id: "x", name: "X" }, m: month(), rec: null, qualityFlag: "bad" });
  near(bad.k, 0.8);
});

test("доля плана для KPI и калибровка порога", () => {
  const r = branchKpi({ settings: { kpi: { planShare: 0.5 } }, branch: { id: "x", name: "X" }, m: month({ factBalls: 22.5 }), rec: null });
  near(r.planBalls, 22.5);
  near(r.pct, 1);
  const prev = [0.2, 0.3, 0.4].map((p, i) => ({ id: String(i), month: "2026-09", planBalls: 10, factBalls: p * 10, pct: p }));
  const s = kpiSummary([r], prev, {});
  near(s.calib.median, 0.3);
  near(s.calib.suggestShare, 0.375);
  assert.equal(s.calib.reached, 0);
});
