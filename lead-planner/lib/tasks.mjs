// Задачи маркетолога филиала: что сделать сегодня, чтобы выйти на план лидобалов.
// Источники: расчёт месяца (план/факт лидобалов, источники), состояние кабинетов (data.adsHealth[филиал]: fb — кампании
// за 7 дней и прошлые 7, google — лимиты бюджета, расход по дням, кампании) и итоги заявок CRM (недозвоны, Google по кампаниям).
// Без I/O — работает и на сервере, и в браузере.
import { compileRules, classifySpend } from "./spend.mjs";
import { toUsd } from "./googlespend.mjs";

const DAY_MS = 864e5;
const addDays = (d, n) => new Date(Date.parse(d + "T00:00:00Z") + n * DAY_MS).toISOString().slice(0, 10);
const dm = (d) => `${d.slice(8, 10)}.${d.slice(5, 7)}`;
const usd = (x) => `$${Math.round(x).toLocaleString("ru-RU")}`;
const n1 = (x) => (Math.round(x * 10) / 10).toLocaleString("ru-RU");
const pc = (x) => `${Math.round(x * 100)}%`;
const b2 = (x) => x.toLocaleString("ru-RU", { maximumFractionDigits: 2 });
// 1 заявка, 2 заявки, 5 заявок
export const plural = (n, [one, few, many]) => {
  const a = Math.abs(Math.round(n)) % 100, b = a % 10;
  return `${Math.round(n).toLocaleString("ru-RU")} ${a > 10 && a < 20 ? many : b === 1 ? one : b >= 2 && b <= 4 ? few : many}`;
};
const LEADS = ["лид", "лида", "лидов"];
const REQS = ["заявка", "заявки", "заявок"];
const CONTR = ["договор", "договора", "договоров"];
const median = (a) => {
  const s = [...a].sort((x, y) => x - y);
  return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : null;
};
const EVENT_RX = /event|ивент|івент|вебинар|вебінар|webinar|воркшоп|party|дод\b|demo day/i;

// пороги правил
export const TASK_RULES = {
  zeroLeadsMinSpend: 25, // $ за 7 дней без единого лида → остановить/пересобрать
  cplJump: 1.5, // CPL вырос в 1,5 раза к прошлой неделе
  cplExpensive: 3, // CPL в 3 раза выше среднего по кабинету
  freqMax: 3, // частота за 7 дней
  ctrMin: 0.008, // CTR ниже 0,8%
  minImpr: 2000,
  winnerShare: 0.7, // цена лидобала ≤ 70% медианы → масштабировать
  spendDrop: 0.25, // расход FB упал на 25%+ при отставании
  productMinShare: 0.1, // продукт с планом от 10% договоров филиала — должен рекламироваться
  noAnswerMin: 15,
  unprocessedMin: 20, // необработанных заявок месяца
  unprocessedShare: 0.15,
  fbRejectMin: 10,
};

/**
 * Каждая задача — утверждение: одно действие с цифрами, шаги без «если можно» и критерий готовности (check).
 * @returns {{asOf, month, gap, tasks: {id, prio, area, title, why, steps: string[], check: string, dueDate, due, impact?: string}[]} | null}
 */
export function marketerTasks(data, branch, r, today = new Date()) {
  const h = data.adsHealth?.[branch.id];
  if (!h) return null;
  const asOf = [h.fb?.asOf, h.google?.asOf].filter(Boolean).sort().at(-1);
  if (!asOf || asOf.slice(0, 7) !== r.month) return { asOf, month: r.month, stale: true, tasks: [] };

  const S = data.settings;
  const ball = Object.fromEntries(S.leadTypes.map((t) => [t.id, t.ball]));
  const typeName = Object.fromEntries(S.leadTypes.map((t) => [t.id, t.name]));
  const rules = compileRules(S.spendRules);
  const ruleOf = (name) => rules.find((x) => x.name === classifySpend(name, rules));
  const t = r.totals;
  const tasks = [];
  const add = (x) => tasks.push(x);
  const rec = data.months?.[`${branch.id}|${r.month}`];
  const outcomes = rec?.facts?.branch?.outcomes || null;
  const daysLeft = Math.max(1, r.daysLeft || 1);

  // ---------- план: сколько не хватает ----------
  const gap = t.targetBalls != null && t.factBalls != null ? Math.max(0, t.targetBalls - t.factBalls) : null;
  const elapsedDays = Math.max(1, Number(asOf.slice(8, 10)));
  const gapInfo =
    gap != null
      ? { gap, needPerDay: gap / daysLeft, runRate: t.factBalls / elapsedDays, forecast: (t.factBalls + (t.factBalls / elapsedDays) * daysLeft) / t.targetBalls }
      : null;

  // ---------- Google ----------
  const g = h.google;
  const gRates = data.googleMeta?.rates || {};
  const gUsd = (x, cur) => toUsd(x, cur, r.month, gRates) ?? x;
  const gCrm = outcomes?.google || null;
  if (g?.accounts?.length) {
    const dead = g.accounts.filter((a) => a.limit != null && a.served >= a.limit * 0.995 && (!a.lastSpend || a.lastSpend < addDays(asOf, -1)));
    if (dead.length) {
      const enabled = g.campaigns.filter((c) => dead.some((a) => a.id === c.acc));
      const lostDays = dead.map((a) => {
        const vals = Object.entries(a.days || {}).filter(([d]) => a.lastSpend && d <= a.lastSpend).sort().map(([, v]) => v).filter((v) => v > 0);
        const avg = vals.length ? vals.slice(-14).reduce((s, v) => s + v, 0) / Math.min(14, vals.length) : 0;
        const days = a.lastSpend ? Math.round((Date.parse(asOf) - Date.parse(a.lastSpend)) / DAY_MS) : null;
        return { a, avg: gUsd(avg, a.currency), avgCur: avg, days };
      });
      const best = Object.entries(gCrm?.byCampaign || {})
        .map(([id, v]) => ({ id, ...v, name: g.campaigns.find((c) => c.id === id)?.name }))
        .filter((x) => x.contracts > 0 && x.name)
        .sort((x, y) => y.contracts - x.contracts);
      add({
        id: "g-budget",
        prio: 1,
        area: "Google Ads",
        title: `Пополнить бюджет аккаунта Google — реклама стоит${dead.length > 1 ? ` в ${dead.length} кабинетах` : ""}`,
        why: lostDays
          .map(({ a, days }) => `«${a.name}»: лимит ${Math.round(a.limit).toLocaleString("ru-RU")} ${a.currency} исчерпан (потрачено ${Math.round(a.served).toLocaleString("ru-RU")}), показов нет${a.lastSpend ? ` с ${dm(addDays(a.lastSpend, 1))} — ${days} дн.` : a.lastMonth ? ` больше 30 дней (последний месяц с расходом — ${monthLow(a.lastMonth)} ${a.lastMonth.slice(0, 4)})` : " больше 30 дней"}`)
          .join("; "),
        steps: [
          ...lostDays.map(({ a, avgCur }) => {
            const perDay = avgCur > 0 ? avgCur : enabled.filter((c) => c.acc === a.id).reduce((s, c) => s + (c.budget || 0), 0);
            const basis = avgCur > 0 ? "средний расход до остановки" : "сумма дневных бюджетов включённых кампаний";
            return `«${a.name}»: Google Ads → Инструменты → Оплата → Бюджеты аккаунта → поднять лимит на ${perDay > 0 ? `${Math.round(perDay * daysLeft).toLocaleString("ru-RU")} ${a.currency} (${Math.round(perDay).toLocaleString("ru-RU")} ${a.currency}/день — ${basis} — × ${plural(daysLeft, ["день", "дня", "дней"])} до конца месяца)` : "расход до конца месяца"}.`;
          }),
          "Оплата по счёту — счёт передаётся бухгалтерии сегодня; оплата картой — пополнение сразу.",
        ],
        impact: [
          gCrm?.leads ? `За ${monthLow(r.month)} Google дал ${plural(gCrm.leads, REQS)} и ${plural(gCrm.contracts, CONTR)}` + (best.length ? ` (лучшие: ${best.slice(0, 2).map((x) => `«${x.name}» — ${x.contracts} дог. из ${plural(x.leads, REQS)}`).join(", ")})` : "") : null,
          lostDays.some((x) => x.avg > 1) ? `до остановки Google тратил ≈ ${usd(lostDays.reduce((s, x) => s + x.avg, 0))}/день — эти показы сейчас теряются` : null,
        ]
          .filter(Boolean)
          .join("; "),
        check: enabled.length ? `у кампаний ${enabled.slice(0, 3).map((c) => `«${c.name}»`).join(", ")}${enabled.length > 3 ? ` и ещё ${enabled.length - 3}` : ""} снова идут показы` : "лимит бюджета аккаунта увеличен, показы идут",
      });
    }
    for (const a of g.accounts.filter((a) => !dead.includes(a) && a.limit != null && a.avgDay > 0)) {
      const left = (a.limit - a.served) / a.avgDay;
      if (left < 7) {
        const need = Math.max(0, Math.round(a.avgDay * daysLeft - (a.limit - a.served)));
        const by = addDays(asOf, Math.max(0, Math.floor(left) - 1));
        add({ id: `g-soon-${a.id}`, prio: left < 3 ? 1 : 2, area: "Google Ads", title: `Увеличить лимит бюджета Google «${a.name}»${need ? ` на ${need.toLocaleString("ru-RU")} ${a.currency}` : ""} до ${dm(by)}`, why: `Осталось ${Math.round(a.limit - a.served).toLocaleString("ru-RU")} ${a.currency} из лимита ${Math.round(a.limit).toLocaleString("ru-RU")} при расходе ≈ ${Math.round(a.avgDay).toLocaleString("ru-RU")} ${a.currency}/день — это ${plural(Math.max(0, Math.floor(left)), ["день", "дня", "дней"])} показов.`, steps: [`Google Ads → Инструменты → Оплата → Бюджеты аккаунта → лимит ${Math.round(a.limit).toLocaleString("ru-RU")} → ${Math.round(a.limit + need).toLocaleString("ru-RU")} ${a.currency} (хватит до конца месяца).`, "Оплата по счёту — счёт передаётся бухгалтерии сегодня."], check: `лимит бюджета «${a.name}» увеличен до ${Math.round(a.limit + need).toLocaleString("ru-RU")} ${a.currency}`, dueDate: by });
      }
    }
    const deadIds = new Set(dead.map((a) => a.id));
    for (const c of g.campaigns.filter((c) => !deadIds.has(c.acc))) {
      const acc = g.accounts.find((a) => a.id === c.acc);
      const crm = gCrm?.byCampaign?.[c.id];
      if (c.reasons.includes("HAS_ADS_DISAPPROVED"))
        add({ id: `g-dis-${c.id}`, prio: 1, area: "Google Ads", title: `Исправить отклонённые объявления в «${c.name}» и отправить на проверку`, why: `Кампания включена, но часть объявлений отклонена Google (${acc?.name || c.acc}) — они не показываются.`, steps: ["Кампания → Объявления → фильтр «Статус: отклонено».", "По каждому объявлению исправить текст или ссылку по причине отклонения и нажать «Отправить на проверку»."], check: "в кампании нет отклонённых объявлений" });
      else if (c.reasons.includes("BUDGET_CONSTRAINED") && (crm?.contracts > 0 || c.conv7 > 0))
        add({
          id: `g-lim-${c.id}`,
          prio: 2,
          area: "Google Ads",
          title: `Поднять дневной бюджет «${c.name}»: ${Math.round(c.budget)} → ${Math.round(c.budget * 1.3)} ${acc?.currency || ""}/день`,
          why: `Кампания ограничена бюджетом (${Math.round(c.budget)} ${acc?.currency || ""}/день)${crm ? `, а по CRM даёт ${plural(crm.leads, REQS)} и ${plural(crm.contracts, CONTR)} за месяц` : `, конверсий за 7 дней: ${n1(c.conv7)}`}.`,
          steps: [`Кампания → Настройки → Бюджет: ${Math.round(c.budget)} → ${Math.round(c.budget * 1.3)} ${acc?.currency || ""}/день.`, `${dm(addDays(asOf, 3))} сравнить цену заявки с прошлой неделей; выросла больше чем на 30% — вернуть ${Math.round(c.budget)}.`],
          check: `дневной бюджет «${c.name}» — ${Math.round(c.budget * 1.3)} ${acc?.currency || ""}`,
        });
      else if (c.cost7 < 1 && c.costPrev7 > 10)
        add({ id: `g-stop-${c.id}`, prio: 1, area: "Google Ads", title: `Вернуть показы кампании «${c.name}»`, why: `Прошлая неделя — ${Math.round(c.costPrev7)} ${acc?.currency || ""}, эта — 0. Статус: ${c.primary}${c.reasons.length ? ` (${c.reasons.join(", ")})` : ""}.`, steps: [`Кампания → статус «${c.primary}»: устранить указанную причину (объявления, ставки, расписание, бюджет).`, "Включить кампанию, если она на паузе."], check: `у «${c.name}» есть расход за вчера` });
    }
    // бюджет-лимитированные кампании в остановленных кабинетах — напомнить в пополнении
    const limitedDead = g.campaigns.filter((c) => deadIds.has(c.acc) && c.reasons.includes("BUDGET_CONSTRAINED"));
    const gb = tasks.find((x) => x.id === "g-budget");
    if (gb && limitedDead.length) gb.steps.push(...limitedDead.map((c) => { const cur = g.accounts.find((a) => a.id === c.acc)?.currency || ""; return `После пополнения: дневной бюджет «${c.name}» ${Math.round(c.budget)} → ${Math.round(c.budget * 1.25)} ${cur}/день (до остановки упиралась в бюджет).`; }));
  }
  const gDead = new Set(tasks.find((x) => x.id === "g-budget") ? (g?.accounts || []).filter((a) => a.limit != null && a.served >= a.limit * 0.995).map((a) => a.id) : []);
  const gLive = (rule) => (g?.campaigns || []).filter((c) => c.cost7 > 1 && ruleOf(c.name)?.name === rule);

  // ---------- Facebook ----------
  const fb = h.fb;
  if (fb) {
    const prev = Object.fromEntries((fb.prev7 || []).map((c) => [c.id, c]));
    const active = fb.last7.filter((c) => c.status === "ACTIVE" && c.spend > 0);
    const isEvent = (c) => EVENT_RX.test(c.name) || ruleOf(c.name)?.name === "Ивенты без продукта";
    const ballOf = (c) => (isEvent(c) ? ball.event : c.type === "site" ? ball.site : c.type === "messenger" ? ball.messenger : ball.lid_form);
    const cpb = (c) => (c.leads > 0 ? c.spend / (c.leads * ballOf(c)) : null);
    const cpl = (c) => (c.leads > 0 ? c.spend / c.leads : null);
    const allSpend = fb.last7.reduce((s, c) => s + c.spend, 0);
    const allLeads = fb.last7.reduce((s, c) => s + c.leads, 0);
    const avgCpl = allLeads ? allSpend / allLeads : null;

    // продукты плана без активной рекламы
    const planTotal = r.products.reduce((s, p) => s + (p.planContracts || 0), 0);
    for (const p of [...r.products].sort((a, b) => (b.planContracts || 0) - (a.planContracts || 0))) {
      if (!p.planContracts || p.planContracts / planTotal < TASK_RULES.productMinShare) continue;
      const rule = rules.find((x) => x.productId === p.id);
      if (!rule) continue;
      const onFb = active.filter((c) => ruleOf(c.name)?.name === rule.name);
      const onG = gLive(rule.name);
      if (onFb.length || onG.length) continue;
      const gStopped = (g?.campaigns || []).filter((c) => gDead.has(c.acc) && ruleOf(c.name)?.name === rule.name);
      const paused = [...fb.last7, ...(fb.prev7 || [])].filter((c) => ruleOf(c.name)?.name === rule.name && c.status !== "ACTIVE" && c.spend > 0);
      const bestPaused = Object.values(Object.fromEntries(paused.map((c) => [c.id, c]))).filter((c) => c.leads > 0).sort((a, b) => cpb(a) - cpb(b))[0];
      const share = p.planContracts / planTotal;
      const needLeads = Math.ceil(((p.leads || 0) * daysLeft) / daysIn(r.month));
      const unit = p.cpl || avgCpl;
      const perDay = unit && needLeads ? (needLeads * unit) / daysLeft : null;
      add({
        id: `fb-noprod-${p.id}`,
        prio: share >= 0.2 ? 1 : 2,
        area: "Facebook",
        title: bestPaused ? `Запустить рекламу на «${p.name}»: включить «${bestPaused.name}»` : `Запустить рекламу на «${p.name}»: новая кампания «Лиды на сайте»`,
        why: `План ${p.planContracts} дог. (${pc(share)} плана филиала, ${n1(p.targetBalls)} ЛБ), но за последние 7 дней ни одна кампания FB или Google на продукт не крутится${paused.length ? `: на паузе ${[...new Set(paused.map((c) => `«${c.name}»`))].slice(0, 3).join(", ")}` : ""}.`,
        steps: [
          bestPaused ? `Включить «${bestPaused.name}» — лучшая по цене лида среди приостановленных: ${usd(bestPaused.spend)} → ${plural(bestPaused.leads, LEADS)} (${usd(cpl(bestPaused))}/лид).` : `Создать кампанию на «${p.name}» с целью «Лиды на сайте» (лидобал заявки с сайта ${b2(ball.site)} против ${b2(ball.lid_form)} у лид-формы).`,
          perDay ? `Дневной бюджет — ${usd(perDay)}: до конца месяца нужно ещё ${plural(needLeads, LEADS)} по ~${usd(unit)}.` : null,
          gStopped.length ? `Google-кампания ${gStopped.map((c) => `«${c.name}»`).join(", ")} на этот продукт заработает после пополнения бюджета аккаунта (отдельная задача).` : null,
          daysLeft <= 5 ? "До конца месяца мало дней — запуск сейчас работает и на план следующего месяца." : null,
        ].filter(Boolean),
        check: `кампания на «${p.name}» активна и тратит бюджет`,
      });
    }

    for (const c of active) {
      const pc7 = prev[c.id];
      if (c.leads === 0 && c.spend >= Math.max(TASK_RULES.zeroLeadsMinSpend, 2 * (avgCpl || 0)))
        add({ id: `fb-zero-${c.id}`, prio: 2, area: "Facebook", title: `Остановить «${c.name}»: ${usd(c.spend)} за 7 дней без лидов`, why: `При средней цене лида филиала ${avgCpl ? usd(avgCpl) : "—"} кампания уже должна была дать ${avgCpl ? plural(Math.floor(c.spend / avgCpl), LEADS) : "несколько лидов"}. CTR ${c.ctr != null ? (c.ctr * 100).toFixed(2) + "%" : "—"}.`, steps: ["Отправить тестовую заявку через форму или сайт кампании и найти её в CRM.", "Заявка не дошла — исправить форму или пиксель и оставить кампанию включённой. Заявка дошла — выключить кампанию, её бюджет перенести на кампанию из задачи «Поднять бюджет».", c.ctr != null && c.ctr < TASK_RULES.ctrMin ? `Замена — с новым креативом и первым экраном: CTR ${(c.ctr * 100).toFixed(2)}% ниже нормы.` : "Замена — с другой посадочной или формой: кликают нормально, теряем после клика."], check: "кампания выключена, либо тестовая заявка пришла в CRM после исправления формы" });
      else if (c.leads > 0 && avgCpl && cpl(c) > avgCpl * TASK_RULES.cplExpensive && c.spend >= 50 && !(pc7?.leads > 0 && cpl(c) > cpl(pc7) * TASK_RULES.cplJump))
        add({ id: `fb-exp-${c.id}`, prio: 2, area: "Facebook", title: `Урезать бюджет «${c.name}» вдвое: лид по ${usd(cpl(c))} — в ${n1(cpl(c) / avgCpl)} раза дороже среднего`, why: `${usd(c.spend)} за 7 дней → ${plural(c.leads, LEADS)}; средняя цена лида по кабинету ${usd(avgCpl)}. CTR ${c.ctr != null ? (c.ctr * 100).toFixed(2) + "%" : "—"}.`, steps: [c.dailyBudget ? `Дневной бюджет: ${usd(c.dailyBudget)} → ${usd(c.dailyBudget / 2)}.` : c.lifetimeBudget ? `Бюджет на весь срок: ${usd(c.lifetimeBudget)} → ${usd(c.spend + (c.lifetimeBudget - c.spend) / 2)}.` : "Бюджет кампании — вдвое меньше текущего.", "Добавить 2 новых креатива с другим оффером.", "Освободившийся бюджет — на кампанию из задачи «Поднять бюджет»."], check: "бюджет снижен вдвое, 2 новых креатива запущены" });
      else if (pc7?.leads > 0 && c.leads > 0 && cpl(c) > cpl(pc7) * TASK_RULES.cplJump && c.spend >= 30)
        add({ id: `fb-cpl-${c.id}`, prio: 2, area: "Facebook", title: `Выключить дорогие объявления в «${c.name}»: лид подорожал с ${usd(cpl(pc7))} до ${usd(cpl(c))}`, why: `Прошлая неделя: ${usd(pc7.spend)} → ${plural(pc7.leads, LEADS)}; эта: ${usd(c.spend)} → ${plural(c.leads, LEADS)}.`, steps: [`Кампания → Объявления, период 7 дней: выключить объявления с ценой лида выше ${usd(cpl(c) * 2)}.`, "Добавить 2 новых креатива."], check: "дорогие объявления выключены, 2 новых креатива запущены" });
      if (c.frequency >= TASK_RULES.freqMax && (c.impressions || 0) >= TASK_RULES.minImpr)
        add({ id: `fb-freq-${c.id}`, prio: 3, area: "Facebook", title: `Заменить креативы в «${c.name}»: частота ${n1(c.frequency)}`, why: `Каждый человек видел рекламу в среднем ${n1(c.frequency)} раза за 7 дней — цена лида скоро начнёт расти.`, steps: ["Добавить 2–3 новых креатива, объявления с частотой выше 3 выключить.", "Аудиторию расширить: широкий таргет или лукалайк по договорам."], check: "в кампании работают новые креативы" });
      else if (c.ctr != null && c.ctr < TASK_RULES.ctrMin && (c.impressions || 0) >= TASK_RULES.minImpr * 1.5 && c.leads > 0)
        add({ id: `fb-ctr-${c.id}`, prio: 3, area: "Facebook", title: `Запустить новый креатив в «${c.name}»: CTR ${(c.ctr * 100).toFixed(2)}%`, why: "Объявление мало кликают — цена лида завышена.", steps: ["Новый креатив: другой первый кадр, оффер в заголовке, видео до 15 сек.", "Старое объявление с самым низким CTR выключить."], check: "новый креатив активен" });
    }

    // лучшие по цене лидобала — масштабировать
    const withCpb = active.filter((c) => c.leads >= 5).map((c) => ({ c, v: cpb(c) }));
    const med = median(withCpb.map((x) => x.v));
    for (const { c, v } of withCpb.filter((x) => med && x.v <= med * TASK_RULES.winnerShare)) {
      const ending = c.stop && c.stop <= addDays(asOf, 3);
      add({
        id: `fb-win-${c.id}`,
        prio: 2,
        area: "Facebook",
        title: ending ? `Продлить «${c.name}» до ${dm(addDays(c.stop.slice(0, 10), 14))}: кампания заканчивается ${dm(c.stop)}` : `Поднять бюджет «${c.name}» на 30%${c.dailyBudget ? `: ${usd(c.dailyBudget)} → ${usd(c.dailyBudget * 1.3)}/день` : ""}`,
        why: `Лидобал обходится в ${usd(v)} при медиане по активным кампаниям ${usd(med)}: ${usd(c.spend)} → ${plural(c.leads, LEADS)} за 7 дней (${usd(cpl(c))}/лид, тип «${typeName[isEvent(c) ? "event" : c.type === "lead" ? "lid_form" : c.type] || "лид"}»).`,
        steps: ending ? [`Дата окончания → ${dm(addDays(c.stop.slice(0, 10), 14))}, бюджет +30%.`, "Ивент уже прошёл — запустить следующий с тем же креативом и аудиторией."] : [c.dailyBudget ? `Дневной бюджет: ${usd(c.dailyBudget)} → ${usd(c.dailyBudget * 1.3)}.` : c.lifetimeBudget ? `Бюджет на весь срок: ${usd(c.lifetimeBudget)} → ${usd(c.lifetimeBudget * 1.3)}.` : "Бюджет кампании +30%.", `Следующее повышение — не раньше ${dm(addDays(asOf, 3))} и не больше +30%.`],
        check: ending ? `«${c.name}» работает после ${dm(c.stop)}` : "бюджет поднят на 30%",
      });
    }

    // лид-формы против сайта: цена лидобала по типам
    const byType = {};
    for (const c of active.filter((c) => c.leads > 0 && !isEvent(c))) {
      const k = c.type === "site" ? "site" : c.type === "messenger" ? "messenger" : "lid_form";
      const x = (byType[k] ||= { spend: 0, leads: 0 });
      x.spend += c.spend;
      x.leads += c.leads;
    }
    const cpbType = (k) => (byType[k]?.leads ? byType[k].spend / (byType[k].leads * ball[k]) : null);
    const facts = rec?.facts?.branch?.leads || {};
    const paidFact = (facts.lid_form || 0) + (facts.site || 0) + (facts.messenger || 0);
    if (cpbType("site") && cpbType("lid_form") && cpbType("lid_form") > cpbType("site") * 1.3 && paidFact && (facts.lid_form || 0) / paidFact > 0.5)
      add({
        id: "fb-forms",
        prio: 3,
        area: "Facebook",
        title: "Перевести 30% бюджета лид-форм на кампании «Лиды на сайте»",
        why: `Лид-формы дают ${pc(facts.lid_form / paidFact)} платных лидов месяца, но лидобал из лид-формы стоит ${usd(cpbType("lid_form"))}, а с сайта — ${usd(cpbType("site"))} (балл лида: форма ${b2(ball.lid_form)}, сайт ${b2(ball.site)}).`,
        steps: ["Новые кампании — с целью «Лиды на сайте» (пиксель); лид-формы — только для ивентов.", "В действующих лид-формах включить тип «Повышенное намерение» (экран подтверждения)."],
        check: "30% бюджета лид-форм перенесено, в лид-формах включено «Повышенное намерение»",
      });

    const prevSpend = (fb.prev7 || []).reduce((s, c) => s + c.spend, 0);
    if (prevSpend > 0 && allSpend < prevSpend * (1 - TASK_RULES.spendDrop) && (t.pace ?? 1) < 0.9)
      add({ id: "fb-drop", prio: 2, area: "Facebook", title: `Вернуть расход FB к ${usd(prevSpend)} в неделю: упал на ${pc(1 - allSpend / prevSpend)} при отставании от плана`, why: `${usd(prevSpend)} на прошлой неделе против ${usd(allSpend)} на этой, темп плана ${pc(t.pace)}.`, steps: ["Включить лучшие приостановленные кампании и поднять бюджет у кампаний из задач «Поднять бюджет».", `Дневной расход кабинета — ${usd(prevSpend / 7)}.`], check: `расход FB за день — не меньше ${usd(prevSpend / 7)}` });
  }

  // ---------- план по типам лидов ----------
  for (const s of r.sources || []) {
    if (s.planLeads >= 20 && !s.factLeads && s.typeId !== "event")
      add({ id: `plan-type-${s.typeId}`, prio: 2, area: "План", title: `Запустить источник заявок «${typeName[s.typeId] || s.typeId}»: план ${Math.round(s.planLeads)}, факт 0`, why: `В плане на этот тип ${n1(s.planBalls)} ЛБ, факта нет — либо такие заявки не создаются в CRM, либо их не собирают.`, steps: [s.typeId === "demo" ? "Запустить кампанию «Пробный урок» с формой записи." : "Запланировать источник этого типа: кампанию, ивент или обзвон.", `Эти заявки заводятся в CRM типом «${typeName[s.typeId] || s.typeId}».`], check: `в CRM есть заявки типа «${typeName[s.typeId] || s.typeId}» за месяц` });
  }

  // ---------- продажи: лиды теряются после рекламы ----------
  const unproc = outcomes ? (outcomes.n || 0) - (outcomes.processed || 0) : 0;
  if (unproc >= TASK_RULES.unprocessedMin && unproc / outcomes.n >= TASK_RULES.unprocessedShare)
    add({ id: "sales-unprocessed", prio: 1, area: "Продажи", title: `Передать руководителю продаж ${plural(unproc, ["необработанную заявку", "необработанные заявки", "необработанных заявок"])} сегодня`, why: `По истории CRM из ${plural(outcomes.n, REQS)} за месяц результат обработки есть только у ${outcomes.processed} (${pc(outcomes.processed / outcomes.n)}). Необработанная заявка остывает за 1–2 дня — реклама уже оплачена, а договора не будет.`, steps: ["Отправить руководителю продаж список интернет-заявок месяца без результата (CRM → Интернет-заявки), начиная с самых свежих.", "Заявкам без ответственного назначить менеджера."], check: "необработанных заявок месяца меньше 10" });
  if (outcomes?.noAnswerNever >= TASK_RULES.noAnswerMin)
    add({ id: "sales-noanswer", prio: 2, area: "Продажи", title: `Передать на повторный обзвон ${plural(outcomes.noAnswerNever, ["заявку-недозвон", "заявки-недозвона", "заявок-недозвонов"])}`, why: `При первой обработке не дозвонились по ${outcomes.noAnswerFirst} из ${plural(outcomes.processed, REQS)} месяца (${pc(outcomes.noAnswerFirst / outcomes.processed)}), по ${outcomes.noAnswerNever} — так и не дозвонились. Это оплаченные рекламой лиды.`, steps: ["Выгрузить из CRM заявки месяца со статусом «недозвон» и передать руководителю продаж: звонок в другое время суток плюс сообщение в мессенджер.", "В лид-формы FB добавить вопрос «Удобное время для звонка»."], check: "список передан, вопрос о времени звонка добавлен в лид-формы" });
  const fbRej = outcomes?.firstRejectByType?.facebook || 0;
  if (fbRej >= TASK_RULES.fbRejectMin)
    add({ id: "sales-fbreject", prio: 3, area: "Facebook", title: `Собрать у отдела продаж 3 причины отказа по заявкам FB и обновить лид-форму: ${plural(fbRej, REQS)} — отказ при первом звонке`, why: "Люди оставляют заявку, но при звонке отказываются — часто это нецелевой таргет или непонятный оффер в форме.", steps: ["Получить у руководителя продаж 3 самые частые причины отказа.", "Под каждую причину поправить оффер или добавить вопрос в лид-форму (возраст ребёнка, район)."], check: "лид-форма обновлена" });

  tasks.sort((a, b) => a.prio - b.prio);
  for (const x of tasks) {
    x.dueDate ||= x.prio === 1 ? asOf : x.prio === 2 ? addDays(asOf, 2) : addDays(asOf, 6);
    x.due = x.dueDate === asOf ? "сегодня" : `до ${dm(x.dueDate)}`;
  }
  return { asOf, month: r.month, gap: gapInfo, tasks };
}

const daysIn = (m) => new Date(Date.UTC(Number(m.slice(0, 4)), Number(m.slice(5)), 0)).getUTCDate();
const MONTHS_GEN = ["январь", "февраль", "март", "апрель", "май", "июнь", "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь"];
const monthLow = (m) => MONTHS_GEN[Number(m.slice(5)) - 1];
