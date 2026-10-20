import test from "node:test";
import assert from "node:assert/strict";
import { applyCaps, computeMonth, computeSeason, elapsedShare, seasonOf, classifyCampaign, countLeads, aggregateCampaigns } from "../lib/planner.mjs";
import { DEFAULT_SETTINGS } from "../lib/defaults.mjs";
import { parseCsv, tableToRecords, toMonth } from "../lib/importer.mjs";

const settings = { ...structuredClone(DEFAULT_SETTINGS), carryOver: true, budgetCpl: null };
const branch = { id: "dp", name: "Днепр" };
const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);

test("сезон = полугодие, доля прошедшего месяца", () => {
  assert.deepEqual(seasonOf("2026-10").months, ["2026-07", "2026-08", "2026-09", "2026-10", "2026-11", "2026-12"]);
  assert.equal(seasonOf("2026-03").id, "2026-H1");
  near(elapsedShare("2026-10", new Date("2026-10-31T12:00:00Z")), 1);
  near(elapsedShare("2026-10", new Date("2026-10-02T12:00:00Z")), 2 / 31);
  assert.equal(elapsedShare("2026-11", new Date("2026-10-02T12:00:00Z")), 0);
});

test("план лидобалов = 90% плана договоров, лиды = лидобалы ÷ норма", () => {
  const r = computeMonth({
    settings,
    branch,
    month: "2026-10",
    plan: { products: { form_ma: { plan: 20, mix: { site: 0.5, lid_form: 0.5 } } } },
    today: new Date("2026-10-11T12:00:00Z"),
  });
  const p = r.products[0];
  near(p.targetBalls, 18);
  const site = p.byType.find((x) => x.typeId === "site");
  const lf = p.byType.find((x) => x.typeId === "lid_form");
  near(site.balls, 9);
  near(site.leads, 9 / 0.15);
  near(lf.leads, 9 / 0.05);
  assert.equal(p.status, "nodata"); // факта нет
});

test("CPL из кампаний продукта в FB, ивенты не смешиваются", () => {
  const fb = {
    fetchedAt: "x",
    cpl: {
      since: "a",
      until: "b",
      campaigns: [
        { name: "МКА — от 08.01", spend: 100, actions: { lead: 20 } },
        { name: "Ивент - Minecraft - 20.03", spend: 50, actions: { lead: 25 } },
        { name: "Front-End - 26.01", spend: 90, actions: { "offsite_conversion.fb_pixel_lead": 10 } },
      ],
    },
  };
  const agg = aggregateCampaigns(fb.cpl.campaigns, settings);
  near(agg.byProduct.form_ma.spend / agg.byProduct.form_ma.leads, 5);
  near(agg.event.leads, 25);
  const r = computeMonth({
    settings,
    branch,
    month: "2026-10",
    fb,
    plan: { products: { form_ma: { plan: 10, mix: { lid_form: 1 } } } },
    today: new Date("2026-10-11T12:00:00Z"),
  });
  const p = r.products[0];
  near(p.cpl, 5);
  near(p.leads, 9 / 0.05);
  near(p.budget, (9 / 0.05) * 5);
});

test("ивент: регистрации → лидобалы и бюджет, уменьшают нагрузку на остальные типы", () => {
  const r = computeMonth({
    settings,
    branch,
    month: "2026-10",
    plan: { products: { form_ma: { plan: 10, mix: { study: 1 } } } },
    events: [{ id: "e1", name: "Minecraft", date: "2026-10-20", productId: "form_ma", registrationsPlan: 50, cprOverride: 2 }],
    today: new Date("2026-10-11T12:00:00Z"),
  });
  const p = r.products[0];
  near(p.eventBalls, 4); // 50 × 0.08
  near(p.restBalls, 5);
  near(r.events[0].budget, 100);
  near(r.totals.budget, 100); // заявки на обучение — органика
});

test("перенос недостачи закрытого месяца в следующий месяц набора", () => {
  const data = {
    "2026-08": { plan: { products: { form_ma: { plan: 10 } } }, facts: { products: { form_ma: { balls: 5 } } } },
    "2026-09": { plan: { products: { form_ma: { plan: 10 } } }, facts: { products: { form_ma: { balls: 20 } } } },
    "2026-10": { plan: { products: { form_ma: { plan: 10 } } }, facts: { products: { form_ma: { balls: 1 } } } },
  };
  const s = computeSeason({ settings, branch, month: "2026-10", getMonth: (m) => data[m], today: new Date("2026-10-11T12:00:00Z") });
  const by = Object.fromEntries(s.months.map((m) => [m.month, m]));
  near(by["2026-08"].targetBalls, 9);
  near(by["2026-09"].carryBalls, 4); // 9 − 5
  near(by["2026-09"].targetBalls, 13);
  near(by["2026-10"].carryBalls, 0); // в сентябре перевыполнили
  assert.equal(by["2026-08"].status, "low"); // 5 из 9 = 56%
  assert.equal(by["2026-09"].status, "ok"); // 20 из 13 = 154%
  // октябрь: прошло 11/31, ожидаемо 9 × 11/31 ≈ 3.19, факт 1 → 31% — недостаточно
  assert.equal(s.month.totals.status, "low");
});

test("перенос копится, пока недовыполняют, и не уходит за пределы набора", () => {
  const data = {
    "2026-11": { plan: { products: { form_st: { plan: 10 } } }, facts: { products: { form_st: { balls: 0 } } } },
    "2026-12": { plan: { products: { form_st: { plan: 10 } } }, facts: { products: { form_st: { balls: 0 } } } },
    "2027-01": { plan: { products: { form_st: { plan: 10 } } } },
  };
  const today = new Date("2027-01-05T12:00:00Z");
  const dec = computeSeason({ settings, branch, month: "2026-12", getMonth: (m) => data[m], today });
  near(dec.month.totals.carryBalls, 9);
  near(dec.month.totals.targetBalls, 18);
  const jan = computeSeason({ settings, branch, month: "2027-01", getMonth: (m) => data[m], today });
  near(jan.month.totals.carryBalls, 0);
});

test("классификация кампаний и подсчёт лидов без двойного счёта", () => {
  assert.equal(classifyCampaign("РПО — от 26.01", settings).productId, "form_st");
  assert.equal(classifyCampaign("Python — от 06.12", settings).productId, "form_year");
  assert.equal(classifyCampaign("Ивент ПКО Скул - 10-11.02", settings).kind, "event");
  assert.equal(countLeads({ lead: 7, "offsite_conversion.fb_pixel_lead": 7 }, settings.leadActionPriority), 7);
  assert.equal(countLeads({ "offsite_conversion.fb_pixel_custom.Lead_Verified": 3 }, settings.leadActionPriority), 3);
});

test("импорт отчёта: длинный и широкий формат", () => {
  const branches = [{ id: "dp", name: "Днепр" }, { id: "kiev", name: "Киев" }];
  const long = parseCsv("Филиал;Месяц;Форма;Лидобалы;Договоры\nДнепр;Октябрь 2026;МА;12,5;3\nКиев;2026-10;form_st;7;1\nДнепр;Октябрь 2026;Итого;19,5;4\n");
  const r1 = tableToRecords(long, { settings, branches });
  assert.equal(r1.records.length, 2);
  assert.deepEqual(r1.records[0], { branchId: "dp", month: "2026-10", productId: "form_ma", leads: {}, balls: 12.5, contracts: 3 });
  const wide = parseCsv('Форма,Звонки,Лид-формы,"Заявки с сайта",Лидобалы\nСТ,10,40,5,4.55\n');
  const r2 = tableToRecords(wide, { settings, branches, defaults: { branchId: "kiev", month: "2026-09" } });
  assert.deepEqual(r2.records[0].leads, { call: 10, lid_form: 40, site: 5 });
  assert.equal(r2.records[0].balls, 4.55);
  assert.equal(toMonth("01.09.2026"), "2026-09");
  assert.equal(toMonth("Май 2026"), "2026-05");
});

test("звонки — не больше 5% плана лидобалов, излишек уходит на другие типы", () => {
  const m = applyCaps({ call: 0.85, site: 0.1, lid_form: 0.05 }, { call: 0.05 });
  near(m.call, 0.05);
  near(m.site + m.lid_form, 0.95);
  near(m.site / m.lid_form, 2);
  const r = computeMonth({
    settings,
    branch,
    month: "2026-10",
    plan: { products: { form_ma: { plan: 20, mix: { call: 0.9, site: 0.1 } } } },
    today: new Date("2026-10-11T12:00:00Z"),
  });
  near(r.products[0].byType.find((x) => x.typeId === "call").balls, 18 * 0.05);
});

test("факт лидобалов по заявкам CRM филиала и перенос недостачи по филиалу", () => {
  const data = {
    "2026-08": { plan: { products: { form_ma: { plan: 10 }, form_st: { plan: 30 } } }, facts: { branch: { leads: { lid_form: 200, site: 40 } } } },
    "2026-09": { plan: { products: { form_ma: { plan: 10 }, form_st: { plan: 30 } } }, facts: { branch: { leads: { lid_form: 100 } } } },
  };
  const s = computeSeason({ settings, branch, month: "2026-09", getMonth: (m) => data[m], today: new Date("2026-09-16T12:00:00Z") });
  const aug = s.months.find((m) => m.month === "2026-08");
  near(aug.factBalls, 200 * 0.05 + 40 * 0.15); // 16
  near(aug.targetBalls, 36);
  const sep = s.month;
  near(sep.totals.carryBalls, 20); // 36 − 16
  near(sep.products.find((p) => p.id === "form_ma").carryBalls, 5); // доля 10/40
  assert.equal(sep.totals.factSource, "crm_requests");
  assert.equal(sep.products[0].status, "branch");
});

test("бюджет по примерной цене лида: филиал → настройки", () => {
  const r = computeMonth({
    settings,
    branch: { id: "x", name: "X", cpl: { lid_form: 3 } },
    month: "2026-10",
    plan: { products: { form_ma: { plan: 10, mix: { lid_form: 0.5, site: 0.5 } } } },
    today: new Date("2026-10-11T12:00:00Z"),
  });
  const p = r.products[0];
  near(p.byType.find((x) => x.typeId === "lid_form").cpl, 3);
  near(p.byType.find((x) => x.typeId === "site").cpl, settings.cpl.site);
  near(p.budget, (4.5 / 0.05) * 3 + (4.5 / 0.15) * settings.cpl.site);
});

test("перенос недостачи выключен по умолчанию", () => {
  const data = {
    "2026-08": { plan: { products: { form_ma: { plan: 10 } } }, facts: { products: { form_ma: { balls: 1 } } } },
    "2026-09": { plan: { products: { form_ma: { plan: 10 } } } },
  };
  const s = computeSeason({ settings: structuredClone(DEFAULT_SETTINGS), branch, month: "2026-09", getMonth: (m) => data[m], today: new Date("2026-09-10T12:00:00Z") });
  near(s.month.totals.carryBalls, 0);
  near(s.month.totals.targetBalls, 9);
});

test("расход на рекламу: продукт по названию кампании и доля от затрат филиала", async () => {
  const { classifySpend, compileRules, spendReport, UNMATCHED } = await import("../lib/spend.mjs");
  const rules = compileRules();
  assert.equal(classifySpend("ШС / Cybersecurity + AI 25.09", rules), "ШС");
  assert.equal(classifySpend("МіК | 25.08.26 [2]", rules), "ПКО (взрослые)");
  assert.equal(classifySpend("Event | МКА | Roblox | 11.08.26", rules), "МКА (дети)");
  assert.equal(classifySpend("Літній табір ДЦР | 31.08.26", rules), "Лагеря");
  assert.equal(classifySpend("Python+AI для підлітків", rules), "Спецкурсы");
  assert.equal(classifySpend("Event / Party 04.09", rules), "Ивенты без продукта");
  assert.equal(classifySpend("Тест ПЗ_01.10", rules), UNMATCHED);
  assert.equal(classifySpend("Школа програмування", rules), "Школа");
  assert.equal(classifySpend("Кімната відпочинку", rules), UNMATCHED); // «мк» — только целое слово
  const data = {
    settings: {},
    branches: [{ id: "dp", name: "Днепр" }, { id: "kh", name: "Харьков" }],
    spend: {
      dp: { "2026-09": [["МКА 1", 30], ["ШС 1", 10]], "2026-10": [["МКА 2", 60]] },
      kh: { "2026-10": [["ПКО", 100]] },
    },
  };
  const r = spendReport(data, { from: "2026-10", to: "2026-10" });
  const dp = r.branches.find((b) => b.id === "dp");
  near(dp.total, 60);
  near(dp.products[0].share, 1);
  near(r.network.total, 160);
  const all = spendReport(data, { branchIds: ["dp"] });
  assert.deepEqual([all.from, all.to], ["2026-09", "2026-10"]);
  near(all.branches[0].products.find((p) => p.name === "МКА (дети)").share, 0.9);
  assert.equal(all.branches[0].products.find((p) => p.name === "МКА (дети)").campaigns.length, 2);
  assert.equal(all.branches.length, 1);
});

test("ежедневное обновление в 10:00 по Киеву", async () => {
  const { nextDailyRun } = await import("../lib/schedule.mjs");
  // 14.10.2026 09:30 Киев (UTC+3) → сегодня 10:00 = 07:00 UTC
  assert.equal(nextDailyRun("10:00", "Europe/Kyiv", new Date("2026-10-14T06:30:00Z")).toISOString(), "2026-10-14T07:00:00.000Z");
  // уже после 10:00 → завтра
  assert.equal(nextDailyRun("10:00", "Europe/Kyiv", new Date("2026-10-14T07:00:00Z")).toISOString(), "2026-10-15T07:00:00.000Z");
  // зимнее время (UTC+2): 10:00 = 08:00 UTC
  assert.equal(nextDailyRun("10:00", "Europe/Kyiv", new Date("2026-11-20T10:00:00Z")).toISOString(), "2026-11-21T08:00:00.000Z");
});

test("оценка: <30% провал, 30–60 недостаточно, 61–81 усилиться, 82–100 неплохо, >100 выше плана", async () => {
  const { statusOf } = await import("../lib/planner.mjs");
  const st = (p) => statusOf(p, {}, 0.5);
  assert.deepEqual([0.29, 0.3, 0.6, 0.61, 0.81, 0.82, 1, 1.01, 0.995].map(st), ["fail", "low", "low", "boost", "boost", "good", "good", "ok", "good"]);
  assert.equal(statusOf(0.5, { thresholds: { ok: 1, risk: 0.85 } }, 0.5), "low"); // старые настройки → новая шкала
});

test("оценка филиала по лидам: заявки CRM ÷ ожидаемые лиды", () => {
  const r = computeMonth({
    settings: structuredClone(DEFAULT_SETTINGS),
    branch,
    month: "2026-10",
    plan: { products: { form_ma: { plan: 20, mix: { site: 0.5, lid_form: 0.5 } } } },
    facts: { branch: { leads: { site: 10, lid_form: 30 } } },
    today: new Date("2026-10-16T12:00:00Z"), // прошло 16/31
  });
  const t = r.totals;
  near(t.planLeadsAll, 9 / 0.15 + 9 / 0.05); // 60 + 180
  near(t.expectedLeads, 240 * (16 / 31));
  near(t.leadsPace, 40 / (240 * (16 / 31)));
  assert.equal(t.paceBasis, "leads");
  assert.equal(t.status, "low"); // 40 / 123,9 = 32% → недостаточно
});

test("цена лида продукта — по расходу и лидам FB за прошлый месяц, без ивентов", async () => {
  const { productCplFor } = await import("../lib/spend.mjs");
  const data = {
    settings: { eventCampaignPattern: "Event|Івент" },
    branches: [{ id: "dp", name: "Днепр" }],
    spend: {
      dp: {
        "2026-08": [["ШС_20.08", 100, 10]],
        "2026-09": [["МКА - 01.09", 300, 30], ["МКА лайт", 100, 10], ["Event | МКА | Roblox", 50, 50], ["ШС_05.09", 30, 2], ["Вакансія", 99, 9]],
        "2026-10": [["МКА - 04.10", 999]], // текущий месяц без лидов не используется
      },
    },
  };
  const pc = productCplFor(data, "dp", "2026-10");
  near(pc.form_ma.cpl, 10); // 400 / 40, ивент не учитывается
  assert.deepEqual(pc.form_ma.months, ["2026-09"]);
  near(pc.form_schs.cpl, 130 / 12); // в сентябре 2 лида < 5 → добавлен август
  assert.deepEqual(pc.form_schs.months, ["2026-09", "2026-08"]);
  near(pc.__branch.cpl, 430 / 42);
  const r = computeMonth({
    settings,
    branch,
    month: "2026-10",
    productCpl: pc,
    plan: { products: { form_ma: { plan: 10, mix: { lid_form: 1 } }, form_step: { plan: 10, mix: { lid_form: 1 } } } },
    today: new Date("2026-10-11T12:00:00Z"),
  });
  near(r.products.find((p) => p.id === "form_ma").cpl, 10);
  assert.equal(r.products.find((p) => p.id === "form_ma").cplSource, "prev_month");
  assert.equal(r.products.find((p) => p.id === "form_step").cplSource, "prev_month_branch");
});


test("бюджет плана — по средней цене лида из настроек ($10)", () => {
  const r = computeMonth({
    settings: structuredClone(DEFAULT_SETTINGS),
    branch: { id: "x", name: "X", cpl: { lid_form: 3 } },
    month: "2026-10",
    productCpl: { form_ma: { cpl: 44, spend: 440, leads: 10, months: ["2026-09"] } },
    plan: { products: { form_ma: { plan: 10, mix: { lid_form: 0.5, site: 0.5 } } } },
    today: new Date("2026-10-11T12:00:00Z"),
  });
  const p = r.products[0];
  near(p.cpl, 14);
  near(p.budget, (4.5 / 0.05 + 4.5 / 0.15) * 14);
  assert.equal(p.cplBasis, null);
});

test("качество лидов: доли от всех заявок и подсветка против сети", async () => {
  const { qualityFor } = await import("../lib/service.mjs");
  const q = (total, deleted, reject, unanswered) => ({ facts: { branch: { quality: { total, deleted, spam: deleted, dup: 0, other: 0, reject, unanswered } } } });
  const data = {
    branches: [{ id: "a", name: "A" }, { id: "b", name: "B" }, { id: "c", name: "C" }],
    months: { "a|2026-10": q(100, 5, 10, 10), "b|2026-10": q(100, 5, 10, 10), "c|2026-10": q(100, 40, 10, 10) },
  };
  const r = qualityFor(data, { role: "admin" }, "2026-10");
  near(r.network.shares.deleted, 50 / 300);
  const c = r.branches.find((x) => x.id === "c");
  near(c.shares.deleted, 0.4);
  assert.equal(c.flags.deleted, "bad"); // 40% против 16,7%
  assert.equal(c.flags.reject, null);
  const m = qualityFor(data, { role: "marketer", branches: ["a"] }, "2026-10");
  assert.deepEqual(m.branches.map((x) => x.id), ["a"]);
  near(m.network.total, 300); // сеть считается по всем филиалам
  // период: суммы по месяцам, вместе с судьбой лидов
  data.months["a|2026-09"] = q(50, 5, 0, 0);
  data.months["a|2026-09"].facts.branch.outcomes = { n: 45, processed: 40, firstReject: 4, laterReject: 2, noAnswerFirst: 10, noAnswerReached: 5, noAnswerNever: 5, noAnswerLost: 1 };
  data.months["a|2026-10"].facts.branch.outcomes = { n: 95, processed: 60, firstReject: 6, laterReject: 3, noAnswerFirst: 10, noAnswerReached: 7, noAnswerNever: 3, noAnswerLost: 0 };
  const p = qualityFor(data, { role: "admin" }, "2026-10", "2026-09");
  assert.deepEqual([p.from, p.to, p.months], ["2026-09", "2026-10", ["2026-09", "2026-10"]]);
  const a = p.branches.find((x) => x.id === "a");
  assert.equal(a.total, 150);
  assert.equal(a.outcomes.firstReject, 10);
  near(a.outcomes.firstRejectShare, 0.1);
  near(a.outcomes.reachedShare, 0.6);
});

test("расход по продуктам: договоры CRM формы за период и расход на договор", async () => {
  const { spendReport } = await import("../lib/spend.mjs");
  const data = {
    settings: {},
    branches: [{ id: "dp", name: "Днепр" }],
    spend: { dp: { "2026-09": [["МКА 1", 300], ["ШС 1", 100]] } },
    months: { "dp|2026-09": { facts: { products: { form_ma: { contracts: 10 }, form_st: { contracts: 2 } }, branch: { quality: { contracts: 4 } } } } },
  };
  const b = spendReport(data, { from: "2026-09", to: "2026-09" }).branches[0];
  assert.equal(b.products.find((p) => p.name === "МКА (дети)").contracts, 10);
  assert.equal(b.products.find((p) => p.name === "ШС").contracts, null); // у ШС нет факта договоров
  assert.equal(b.contracts, 12);
  assert.equal(b.contractsFromRequests, 4);
});

test("судьба лидов: отказ сразу / позже, недозвон → дозвонились", async () => {
  const { outcomes } = await import("../scripts/lead-outcomes.mjs");
  const L = (o) => ({ type: "irt_facebook", ...o });
  const o = outcomes([
    L({ id: 1, result: "result_fail", last_result: "Closed lost" }),
    L({ id: 2, result: "result_think", last_result: "Closed lost", processed_at: "2026-10-01 10:00:00", reject_at: "2026-10-05 10:00:00" }),
    L({ id: 3, result: "result_no_answer", count_contacts_ago: 3, count_contacts_ago_no_asnwer: 1 }),
    L({ id: 4, result: "result_no_answer", count_contacts_ago: 2, count_contacts_ago_no_asnwer: 2, last_result: "Closed lost" }),
    L({ id: 5, result: null }),
    L({ id: 6, result: "result_deleted" }),
    { id: 7, type: "download_invoice", result: "result_fail" },
  ]);
  assert.equal(o.n, 5);
  assert.equal(o.processed, 4);
  assert.equal(o.firstReject, 1);
  assert.equal(o.laterReject, 2); // думает → отказ и недозвон → отказ
  assert.equal(o.noAnswerFirst, 2);
  assert.equal(o.noAnswerReached, 1);
  assert.equal(o.noAnswerNever, 1);
  assert.equal(o.noAnswerLost, 1);
});

test("отказы сразу не входят в лиды филиала", async () => {
  const { rebuildBranchLeads } = await import("../lib/snapshot.mjs");
  const fb = rebuildBranchLeads({
    requests: { Facebook: { net: 10, typeId: "lid_form" }, "study-form": { net: 3, typeId: "study" }, course: { net: 4, typeId: "site" } },
    outcomes: { firstRejectByType: { facebook: 2, study_form: 5 } },
  });
  assert.deepEqual(fb.leads, { lid_form: 8, study: 0, site: 4 });
  assert.equal(fb.requests.Facebook.firstReject, 2);
});

test("Google Ads: гривна по курсу НБУ месяца, кабинеты и FB рядом", async () => {
  const { googleReport } = await import("../lib/googlespend.mjs");
  const data = {
    settings: {},
    branches: [{ id: "dp", name: "Днепр" }, { id: "kh", name: "Харьков" }],
    spend: { dp: { "2026-10": [["ШС", 100]] } },
    googleSpend: {
      dp: {
        "2026-09": [["1", "Днепр (Юр.о)", "UAH", "ШС поиск", 4000, 2, 50]],
        "2026-10": [
          ["1", "Днепр (Юр.о)", "UAH", "ШС поиск", 4500, 3, 60],
          ["2", "Днепр школа", "USD", "Школа", 50, 0, 10],
        ],
      },
    },
    googleMeta: { until: "2026-10-20", rates: { "2026-09": 40, "2026-10": 45 } },
  };
  const r = googleReport(data, { from: "2026-10", to: "2026-10" });
  assert.equal(r.branches.length, 1);
  const b = r.branches[0];
  near(b.usd, 4500 / 45 + 50);
  near(b.uah, 4500 + 50 * 45);
  assert.equal(b.conv, 3);
  assert.equal(b.fb, 100);
  assert.equal(b.accounts[0].name, "Днепр (Юр.о)");
  assert.equal(b.products.find((p) => p.name === "ШС").usd, 100);
  near(googleReport(data, { from: "2026-09", to: "2026-10" }).network.usd, 4000 / 40 + 4500 / 45 + 50);
});
