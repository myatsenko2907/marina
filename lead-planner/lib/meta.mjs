// Клиент Meta Marketing API: статистика кампаний кабинета города.
import { isoDate, monthBounds, DAY } from "./planner.mjs";

async function getAll(url) {
  const rows = [];
  let next = url;
  while (next) {
    const res = await fetch(next);
    const body = await res.json();
    if (!res.ok || body.error) throw new Error(`Meta API: ${body.error?.message || res.status}`);
    rows.push(...(body.data || []));
    next = body.paging?.next || null;
  }
  return rows;
}

/** Расход и действия по кампаниям за период. */
export async function campaignInsights({ adAccountId, token, since, until, version = "v21.0" }) {
  const act = String(adAccountId).startsWith("act_") ? adAccountId : `act_${adAccountId}`;
  const params = new URLSearchParams({
    level: "campaign",
    fields: "campaign_id,campaign_name,spend,actions",
    time_range: JSON.stringify({ since, until }),
    limit: "500",
    access_token: token,
  });
  const rows = await getAll(`https://graph.facebook.com/${version}/${act}/insights?${params}`);
  return rows.map((r) => ({
    id: r.campaign_id,
    name: r.campaign_name,
    spend: Number(r.spend) || 0,
    actions: Object.fromEntries((r.actions || []).map((a) => [a.action_type, Number(a.value) || 0])),
  }));
}

/** Три окна: CPL (последние N дней), ивенты (длиннее), текущий месяц. */
export async function fetchBranchFb({ branch, token, settings, month, today = new Date() }) {
  if (!branch.adAccountId) throw new Error(`У филиала ${branch.name} не указан рекламный кабинет`);
  const until = isoDate(new Date(today.getTime() - DAY)); // вчера — полный день
  const sinceCpl = isoDate(new Date(today.getTime() - settings.cplLookbackDays * DAY));
  const sinceEv = isoDate(new Date(today.getTime() - settings.eventLookbackDays * DAY));
  const { start, end } = monthBounds(month);
  const mtdUntil = isoDate(new Date(Math.min(end.getTime(), today.getTime())));
  const opts = { adAccountId: branch.adAccountId, token, version: settings.metaApiVersion };
  const [cpl, events, mtd] = await Promise.all([
    campaignInsights({ ...opts, since: sinceCpl, until }),
    campaignInsights({ ...opts, since: sinceEv, until }),
    start.getTime() <= today.getTime() ? campaignInsights({ ...opts, since: isoDate(start), until: mtdUntil }) : [],
  ]);
  return {
    fetchedAt: new Date().toISOString(),
    source: "meta_api",
    cpl: { since: sinceCpl, until, campaigns: cpl },
    events: { since: sinceEv, until, campaigns: events },
    mtd: { month, since: isoDate(start), until: mtdUntil, campaigns: mtd },
  };
}
