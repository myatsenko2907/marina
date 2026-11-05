import test from "node:test";
import assert from "node:assert/strict";
import { marketerTasks, plural } from "../lib/tasks.mjs";
import { DEFAULT_SETTINGS } from "../lib/defaults.mjs";

const settings = structuredClone(DEFAULT_SETTINGS);
const branch = { id: "kiev", name: "Киев" };
const report = {
  month: "2026-10",
  daysLeft: 4,
  totals: { targetBalls: 100, factBalls: 40, pace: 0.45 },
  products: [{ id: "form_ma", name: "МКА", planContracts: 30, targetBalls: 27, leads: 300, cpl: 14 }, { id: "form_year", name: "СК", planContracts: 30, targetBalls: 27, leads: 300, cpl: 14 }],
  sources: [],
};
const fbRow = (o) => ({ id: o.name, status: "ACTIVE", type: "site", frequency: 1.5, ctr: 0.015, impressions: 5000, ...o });

test("склонение", () => {
  assert.equal(plural(1, ["лид", "лида", "лидов"]), "1 лид");
  assert.equal(plural(3, ["лид", "лида", "лидов"]), "3 лида");
  assert.equal(plural(12, ["лид", "лида", "лидов"]), "12 лидов");
  assert.equal(plural(74, ["заявка", "заявки", "заявок"]), "74 заявки");
});

test("задачи: исчерпанный бюджет Google, продукт без рекламы, кампания без лидов", () => {
  const data = {
    settings,
    months: {},
    googleMeta: { rates: { "2026-10": 41 } },
    adsHealth: {
      kiev: {
        google: {
          asOf: "2026-10-27",
          accounts: [{ id: "1", name: "Киев", currency: "UAH", limit: 1000, served: 1003, lastSpend: "2026-10-13", days: { "2026-10-12": 900, "2026-10-13": 800 } }],
          campaigns: [{ acc: "1", id: "9", name: "PMax МКА", reasons: [], cost7: 0, costPrev7: 0, conv7: 0, budget: 400 }],
        },
        fb: {
          asOf: "2026-10-27",
          last7: [fbRow({ name: "СК / Python", spend: 100, leads: 10 }), fbRow({ name: "СК / Дизайн", spend: 60, leads: 0 })],
          prev7: [fbRow({ name: "МКА / Сайт", status: "PAUSED", spend: 50, leads: 5 })],
        },
      },
    },
  };
  const r = marketerTasks(data, branch, report);
  const ids = r.tasks.map((x) => x.id);
  assert.equal(ids[0], "g-budget");
  assert.ok(ids.includes("fb-noprod-form_ma"), ids.join());
  assert.ok(!ids.includes("fb-noprod-form_year"));
  assert.ok(ids.includes("fb-zero-СК / Дизайн"));
  assert.match(r.tasks.find((x) => x.id === "fb-noprod-form_ma").steps[0], /МКА \/ Сайт/);
  assert.equal(Math.round(r.gap.gap), 60);
});

test("задачи по прошлому месяцу не строятся", () => {
  const data = { settings, months: {}, adsHealth: { kiev: { fb: { asOf: "2026-11-02", last7: [], prev7: [] } } } };
  assert.equal(marketerTasks(data, branch, report).stale, true);
  assert.equal(marketerTasks({ settings, months: {} }, branch, report).stale, true);
});

test("без данных кабинетов задачи строятся по плану и заявкам CRM", () => {
  const months = { "kiev|2026-10": { facts: { branch: { quality: { total: 100, fetchedAt: "2026-10-27T09:00:00+02:00" } } } } };
  const rep = { ...report, elapsedShare: 0.5, sources: [{ typeId: "site", planLeads: 200, factLeads: 10, planBalls: 30 }] };
  const r = marketerTasks({ settings, months }, branch, rep);
  assert.equal(r.stale, undefined);
  assert.equal(r.asOf, "2026-10-27");
  assert.deepEqual(r.sources, { fb: false, google: false });
  assert.ok(r.tasks.length > 0);
  // устаревшие данные кабинетов (прошлый месяц) не мешают задачам по CRM
  const old = marketerTasks({ settings, months, adsHealth: { kiev: { fb: { asOf: "2026-09-30", last7: [], prev7: [] } } } }, branch, rep);
  assert.equal(old.sources.fb, false);
  assert.ok(old.tasks.length > 0);
});

test("задачи под план: дневная норма, контрольная точка, отстающий источник, замена, закончившиеся кампании", () => {
  const rep = {
    ...report,
    elapsedShare: 0.5,
    sources: [
      { typeId: "site", planLeads: 200, factLeads: 10, planBalls: 30 },
      { typeId: "lid_form", planLeads: 100, factLeads: 60, planBalls: 5 },
    ],
  };
  const data = {
    settings,
    months: {},
    adsHealth: {
      kiev: {
        fb: {
          asOf: "2026-10-27",
          last7: [
            fbRow({ name: "СК / Python", spend: 100, leads: 10, stop: "2026-10-29T23:59:00+0200" }),
            fbRow({ name: "СК / Старый", spend: 80, leads: 0, stop: "2026-10-20T23:59:00+0200" }),
          ],
          prev7: [],
        },
      },
    },
  };
  const r = marketerTasks(data, branch, rep);
  const ids = r.tasks.map((x) => x.id);
  assert.ok(ids.includes("plan-day"), ids.join());
  assert.ok(ids.some((x) => x.startsWith("plan-week-")));
  assert.ok(ids.includes("src-site"));
  assert.ok(!ids.includes("src-lid_form")); // 60 из ожидаемых 50 — не отстаёт
  assert.ok(ids.includes("fb-ending-СК / Python"));
  assert.ok(!ids.includes("fb-zero-СК / Старый")); // закончилась 20.10 — не трогаем
  assert.match(r.tasks.find((x) => x.id === "plan-day").title, /ЛБ в день/);
});
