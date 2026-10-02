// Применение снимка данных CRM к хранилищу (общий код для скрипта и автообновления).
// Формат снимка:
//   branches: { alias: { name, adAccountId } }
//   season:   { alias: { form: план набора } }                    — план набора текущего полугодия
//   months:   { alias: { "YYYY-MM": { form: [план, факт договоров] } } }
//   balls:    { alias: { "YYYY-MM": { form: факт лидобалов } } }  — отчёт «Маркетинг → Лидобалы» (необязательно)
//   requests: { alias: { "YYYY-MM": { type_request: [всего, удалено, договоров] } } } — заявки CRM по типам
//             (crm_internet_requests); факт лидобалов филиала = заявки × норма типа
import { seasonOf } from "./planner.mjs";

export function applySnapshot(store, snap, seasonMonth = new Date().toISOString().slice(0, 7)) {
  for (const [id, b] of Object.entries(snap.branches || {})) {
    const cur = store.branch(id);
    if (cur) Object.assign(cur, { name: b.name || cur.name, adAccountId: b.adAccountId || cur.adAccountId });
    else store.data.branches.push({ id, name: b.name || id, adAccountId: b.adAccountId || "", fbCurrency: b.fbCurrency || "USD", aliases: b.aliases || [] });
  }
  const sid = snap.seasonId || seasonOf(seasonMonth).id;
  for (const [id, plan] of Object.entries(snap.season || {})) store.data.seasons[`${id}|${sid}`] = { plan };
  let n = 0;
  for (const [id, months] of Object.entries(snap.months || {})) {
    for (const [m, forms] of Object.entries(months)) {
      const rec = store.ensureMonth(id, m);
      for (const [form, [plan, fact]] of Object.entries(forms)) {
        (rec.plan.products[form] ||= {}).plan = plan;
        if (fact != null) (rec.facts.products[form] ||= {}).contracts = fact;
        n++;
      }
    }
  }
  for (const [id, months] of Object.entries(snap.balls || {})) {
    for (const [m, forms] of Object.entries(months)) {
      const rec = store.ensureMonth(id, m);
      for (const [form, balls] of Object.entries(forms)) {
        (rec.facts.products[form] ||= {}).balls = balls;
        n++;
      }
    }
  }
  // Заявки CRM по типам: { alias: { "YYYY-MM": { type_request: [всего, удалено, договоров] } } }
  const map = store.data.settings.requestTypeMap || {};
  for (const [id, months] of Object.entries(snap.requests || {})) {
    for (const [m, types] of Object.entries(months)) {
      const rec = store.ensureMonth(id, m);
      const leads = {};
      const requests = {};
      for (const [type, [total, deleted = 0, contracts = 0]] of Object.entries(types)) {
        const net = Math.max(0, total - deleted);
        requests[type] = { net, contracts, typeId: map[type] || null };
        if (map[type]) leads[map[type]] = (leads[map[type]] || 0) + net;
      }
      rec.facts.branch = { leads, requests, source: "crm_requests" };
      n++;
    }
  }
  return { branches: Object.keys(snap.branches || {}).length, records: n, season: sid };
}
