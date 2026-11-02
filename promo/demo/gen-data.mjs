// Синтетические демо-данные для съёмки интерфейса (не реальные цифры).
import fs from "node:fs";
const cities = [
  ["kiev","Киев",1.18],["dp","Днепр",1.05],["kh","Харьков",0.93],["od","Одесса",0.88],["lv","Львов",0.74],
  ["zp","Запорожье",0.66],["vn","Винница",0.97],["pl","Полтава",0.52],["mk","Николаев",0.41],["ck","Черкассы",0.22],
  ["zt","Житомир",0.79],["rv","Ровно",1.02],["if","Ивано-Франковск",0.58],["sm","Сумы",0.36]];
const forms = { form_ma:[1,0.6], form_st:[1,0.25], form_year:[1,0.2], form_school:[1,0.1], form_college:[1,0.08] };
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const snap = { branches:{}, season:{}, months:{}, requests:{}, quality:{}, outcomes:{} };
const spend = {};
for (const [id, name, k] of cities) {
  const size = 0.6 + rnd() * 1.2;
  snap.branches[id] = { name };
  const plan = {}, prev = {};
  for (const [f,[,w]] of Object.entries(forms)) {
    const p = Math.max(2, Math.round(70 * w * size));
    plan[f] = [p, Math.round(p * k * 0.55 * (0.8 + rnd()*0.4))];
    prev[f] = [p, Math.round(p * (0.7 + rnd()*0.5))];
  }
  snap.season[id] = Object.fromEntries(Object.entries(plan).map(([f,[p]]) => [f, p*6]));
  snap.months[id] = { "2026-09": prev, "2026-10": plan };
  const req = (mult) => {
    const base = 1080 * size * mult;
    return { Facebook:[Math.round(base*0.45),Math.round(base*0.06),3], internet:[Math.round(base*0.25),Math.round(base*0.02),4],
      course:[Math.round(base*0.08),1,1], call:[Math.round(base*0.05),0,2], "study-form":[Math.round(base*0.05),0,1],
      ai_bot:[Math.round(base*0.08),Math.round(base*0.01),1], event:[Math.round(base*0.04),0,0] };
  };
  snap.requests[id] = { "2026-09": req(0.7+rnd()*0.5), "2026-10": req(k*0.69) };
  for (const m of ["2026-09","2026-10"]) {
    const t = Object.values(snap.requests[id][m]).reduce((s,[a])=>s+a,0);
    const bad = k < 0.5 ? 1.7 : 1;
    snap.quality[id] = { ...(snap.quality[id]||{}), [m]: { total:t, deleted:Math.round(t*0.08*bad), spam:Math.round(t*0.04*bad), dup:Math.round(t*0.03), other:Math.round(t*0.01), reject:Math.round(t*0.14*bad), unanswered:Math.round(t*0.11*bad), contracts:Math.round(t*0.04) } };
    const n = Math.round(t*0.9);
    snap.outcomes[id] = { ...(snap.outcomes[id]||{}), [m]: { n, processed:n, firstReject:Math.round(n*0.07*bad), laterReject:Math.round(n*0.12), laterRejectDays:6, noAnswerFirst:Math.round(n*0.2), noAnswerReached:Math.round(n*0.13), noAnswerNever:Math.round(n*0.07*bad) } };
  }
  const camps = [["МКА — лид-форма",0.38],["Стационар РПО — сайт",0.22],["Курсы Python — сайт",0.12],["Школа — лид-форма",0.1],["Колледж — сайт",0.08],["Ивент ДОД",0.05]];
  const lines = [];
  for (const [m,mult] of [["2026-09",1],["2026-10",0.7]]) for (const [c,w] of camps) {
    const s = Math.round(2600*size*w*mult*(0.8+rnd()*0.4)); lines.push(`${m}\t${s}\t${c}\t${Math.round(s/(9+rnd()*10))}`);
  }
  spend[id] = lines.join("\n") + "\n";
}
fs.writeFileSync("snapshot.json", JSON.stringify(snap));
fs.mkdirSync("spend", { recursive: true });
for (const [id, t] of Object.entries(spend)) fs.writeFileSync(`spend/${id}.tsv`, t);
