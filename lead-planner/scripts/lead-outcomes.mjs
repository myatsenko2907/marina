// Судьба лидов по истории интернет-заявок CRM (crm_internet_requests, mode=history):
// отказ сразу / отказ позже, недозвон при первой обработке → потом дозвонились / так и не дозвонились.
//   node scripts/lead-outcomes.mjs <выход.json> <филиал> <YYYY-MM> <файл ответа> [<файл ответа> …] [-- <филиал> <YYYY-MM> <файлы…>]
// Файл ответа — сохранённый ответ инструмента (JSON или [{type:"text", text:"…"}]); страницы одного месяца
// передаются вместе, дубликаты по id отбрасываются. Результат загружается: node scripts/load-snapshot.mjs <выход.json>
import fs from "node:fs";

// Те же типы заявок, что в сводке «Интернет-заявки» (из неё считаются лиды и лидобалы).
const TYPES = new Set(["irt_facebook", "irt_course", "irt_consultation", "irt_study_form", "irt_ai_bot", "irt_event", "irt_demo", "irt_call", "irt_contact", "irt_internet"]);

const load = (file) => {
  let d = JSON.parse(fs.readFileSync(file, "utf8"));
  if (Array.isArray(d)) d = JSON.parse(d[0].text);
  return d;
};
const ts = (s) => (s ? new Date(/[+Z]/.test(s.slice(10)) ? s.replace(" ", "T") : s.replace(" ", "T") + "+03:00") : null);
const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : null;
};

export function outcomes(leads) {
  const live = leads.filter((x) => TYPES.has(x.type) && x.result !== "result_deleted");
  const proc = live.filter((x) => x.result);
  const firstReject = proc.filter((x) => x.result === "result_fail");
  const laterReject = proc.filter((x) => x.result !== "result_fail" && x.last_result === "Closed lost");
  const na = proc.filter((x) => x.result === "result_no_answer");
  const reached = na.filter((x) => (x.count_contacts_ago || 0) - (x.count_contacts_ago_no_asnwer || 0) > 0);
  const days = laterReject.filter((x) => x.reject_at && x.processed_at).map((x) => (ts(x.reject_at) - ts(x.processed_at)) / 864e5);
  const m = median(days);
  return {
    n: live.length,
    processed: proc.length,
    firstReject: firstReject.length,
    laterReject: laterReject.length,
    laterRejectDays: m == null ? null : Math.round(m * 10) / 10,
    noAnswerFirst: na.length,
    noAnswerReached: reached.length,
    noAnswerNever: na.length - reached.length,
    noAnswerLost: na.filter((x) => x.last_result === "Closed lost").length,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [out, ...rest] = process.argv.slice(2);
  const groups = [];
  let cur = null;
  for (const a of rest) {
    if (a === "--") cur = null;
    else if (!cur) groups.push((cur = { branch: a, month: null, files: [] }));
    else if (!cur.month) cur.month = a;
    else cur.files.push(a);
  }
  const res = {};
  for (const g of groups) {
    const byId = new Map();
    let countAll = null;
    for (const f of g.files) {
      const d = load(f);
      countAll = d.pagination?.count_all ?? countAll;
      for (const x of d.data.leads) byId.set(x.id, x);
    }
    if (countAll != null && byId.size < countAll) console.warn(`${g.branch} ${g.month}: загружено ${byId.size} из ${countAll} заявок — не хватает страниц (по 200 на страницу)`);
    (res[g.branch] ||= {})[g.month] = outcomes([...byId.values()]);
    console.log(g.branch, g.month, JSON.stringify(res[g.branch][g.month]));
  }
  fs.writeFileSync(out, JSON.stringify({ fetchedAt: new Date().toISOString(), outcomes: res }));
}
