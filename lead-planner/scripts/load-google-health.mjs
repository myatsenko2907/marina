// Состояние кабинетов Google Ads для задач маркетолога: лимит бюджета аккаунта, расход по дням за 30 дней,
// включённые кампании (статус показа и причины, дневной бюджет), расход и конверсии за 7 дней против прошлых 7.
// Пишет store.data.adsHealth[филиал].google. Доступы — как у load-google-ads.mjs.
//   node scripts/load-google-health.mjs [по дату YYYY-MM-DD] [филиалы…]   — без филиалов: все с кабинетами Google
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Store } from "../lib/store.mjs";
import { loadCreds, connect } from "../lib/googleads.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const store = new Store(process.env.DATA_FILE || path.join(ROOT, "data", "store.json"));
const args = process.argv.slice(2);
const kyivToday = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Kyiv" }).format(new Date());
const until = /^\d{4}-\d\d-\d\d$/.test(args[0] || "") ? args.shift() : kyivToday;
const only = new Set(args);
const day = (d, n) => new Date(Date.parse(d + "T00:00:00Z") + n * 864e5).toISOString().slice(0, 10);
const from14 = day(until, -13);
const from30 = day(until, -29);
const from7 = day(until, -6);

const api = await connect(loadCreds(process.env.GOOGLE_ADS_ENV || path.join(os.homedir(), ".config", "lead-planner", "google-ads.env")));
const branches = store.data.branches.filter((b) => !b.archived && b.googleAccounts?.length && (!only.size || only.has(b.id)));
const micros = (x) => Number(x || 0) / 1e6;

store.data.adsHealth ||= {};
const failed = [];
for (const b of branches) {
  const accounts = [];
  const campaigns = [];
  for (const acc of b.googleAccounts) {
    try {
      const [info] = await api.search(acc, "SELECT customer.descriptive_name, customer.currency_code FROM customer");
      const daily = await api.search(acc, `SELECT segments.date, metrics.cost_micros, metrics.conversions FROM customer WHERE segments.date BETWEEN '${from30}' AND '${until}'`);
      const budgets = await api.search(
        acc,
        "SELECT account_budget.status, account_budget.approved_spending_limit_micros, account_budget.approved_spending_limit_type, account_budget.amount_served_micros, account_budget.approved_start_date_time, account_budget.approved_end_date_time FROM account_budget WHERE account_budget.status = 'APPROVED'",
      ).catch(() => []);
      // действующий бюджет аккаунта — без даты окончания или с окончанием позже сегодняшнего дня
      const live = budgets.map((r) => r.accountBudget).filter((x) => !x.approvedEndDateTime || x.approvedEndDateTime.slice(0, 10) >= until);
      const cur = live.sort((x, y) => String(y.approvedStartDateTime).localeCompare(String(x.approvedStartDateTime)))[0];
      const days = Object.fromEntries(daily.map((r) => [r.segments.date, micros(r.metrics.costMicros)]));
      // последний «нормальный» день: расход не меньше 10% от максимального дня за 30 дней (копейки после остановки не в счёт)
      const max = Math.max(0, ...Object.values(days));
      const lastSpend = Object.keys(days).filter((d) => days[d] >= Math.max(1, max * 0.1)).sort().at(-1) || null;
      accounts.push({
        id: acc,
        name: info.customer.descriptiveName || acc,
        currency: info.customer.currencyCode,
        limit: cur && cur.approvedSpendingLimitType !== "INFINITE" ? micros(cur.approvedSpendingLimitMicros) : null,
        served: cur ? micros(cur.amountServedMicros) : null,
        days,
        lastSpend,
      });
      const q = (since, to) =>
        api.search(
          acc,
          "SELECT campaign.id, campaign.name, campaign.status, campaign.primary_status, campaign.primary_status_reasons, campaign.advertising_channel_type, campaign_budget.amount_micros, " +
            `metrics.cost_micros, metrics.conversions, metrics.clicks, metrics.search_budget_lost_impression_share FROM campaign WHERE segments.date BETWEEN '${since}' AND '${to}' AND campaign.status = 'ENABLED'`,
        );
      const prev = Object.fromEntries((await q(from14, day(until, -7))).map((r) => [r.campaign.id, r.metrics]));
      for (const r of await q(from7, until)) {
        const c = r.campaign;
        if ((c.primaryStatusReasons || []).includes("CAMPAIGN_ENDED")) continue;
        campaigns.push({
          acc,
          id: String(c.id),
          name: c.name,
          channel: c.advertisingChannelType,
          primary: c.primaryStatus,
          reasons: c.primaryStatusReasons || [],
          budget: micros(r.campaignBudget?.amountMicros),
          cost7: micros(r.metrics.costMicros),
          conv7: Number(r.metrics.conversions || 0),
          costPrev7: micros(prev[c.id]?.costMicros),
          convPrev7: Number(prev[c.id]?.conversions || 0),
          budgetLost: r.metrics.searchBudgetLostImpressionShare ?? null,
        });
      }
    } catch (e) {
      failed.push(`${b.id}/${acc}: ${e.message}`);
    }
  }
  store.data.adsHealth[b.id] = { ...store.data.adsHealth[b.id], google: { asOf: until, accounts, campaigns } };
  const stopped = accounts.filter((a) => a.lastSpend && a.lastSpend < day(until, -2));
  console.log(`${b.id}: кабинетов ${accounts.length}, кампаний ${campaigns.length}${stopped.length ? `, без расхода: ${stopped.map((a) => `${a.name} с ${a.lastSpend}`).join("; ")}` : ""}`);
}
store.save();
if (failed.length) console.log("Не ответили кабинеты:\n" + failed.join("\n"));
