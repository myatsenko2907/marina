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
  assert.equal(marketerTasks({ settings, months: {} }, branch, report), null);
});
