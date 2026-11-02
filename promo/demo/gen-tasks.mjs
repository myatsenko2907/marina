import fs from "node:fs";
const s = JSON.parse(fs.readFileSync("store.json"));
const c = (id, name, spend, leads, type, extra = {}) => ({ id, name, status: "ACTIVE", spend, leads, type, objective: "OUTCOME_LEADS", dailyBudget: 20, lifetimeBudget: null, stop: null, frequency: 1.8, ctr: 0.014, impressions: 12000, ...extra });
const last7 = [c("1","МКА — лид-форма",140,61,"lid_form"), c("2","Стационар РПО — сайт",214,4,"site"), c("3","Курсы Python — сайт",64,0,"site"), c("4","Школа — лид-форма",88,30,"lid_form",{frequency:3.7})];
const prev7 = [c("1","МКА — лид-форма",130,58,"lid_form"), c("2","Стационар РПО — сайт",190,11,"site"), c("3","Курсы Python — сайт",40,3,"site"), c("4","Школа — лид-форма",80,33,"lid_form")];
const days = Object.fromEntries(Array.from({length:21},(_, i)=>[`2026-10-${String(i+1).padStart(2,"0")}`, 45]));
s.adsHealth = { ck: { fb: { asOf: "2026-10-21", last7, prev7 }, google: { asOf: "2026-10-21", accounts: [{ id: "111", name: "Черкассы — основной", currency: "USD", limit: 1000, served: 905, avgDay: 45, lastSpend: "2026-10-21", days }], campaigns: [] } } };
const o = s.months["ck|2026-10"].facts.branch.outcomes; o.processed = Math.round(o.n * 0.74);
fs.writeFileSync("store.json", JSON.stringify(s));
