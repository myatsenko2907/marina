// Сводит расход/лиды кампаний FB по типам: f — лид-форма, l — цель «Лиды» без уточнения (считается с лид-формами),
// s — сайт (пиксель), m — мессенджер, e — ивент/открытый урок/вебинар, x — исключить (HR и т.п.)
// Вход: файлы data/fb/<филиал>.txt со строками "тип расход лиды". Выход: средняя цена лида по типам.
import fs from "node:fs";
import path from "node:path";
const dir = process.argv[2] || "data/fb";
const out = {};
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".txt"))) {
  const b = path.basename(f, ".txt");
  const agg = {};
  for (const line of fs.readFileSync(path.join(dir, f), "utf8").split("\n")) {
    const [t, s, l] = line.trim().split(/\s+/);
    if (!t) continue;
    (agg[t] ||= { spend: 0, leads: 0, n: 0 });
    agg[t].spend += Number(s);
    agg[t].leads += Number(l);
    agg[t].n++;
  }
  const r = (...ks) => {
    const sp = ks.reduce((a, k) => a + (agg[k]?.spend || 0), 0);
    const ld = ks.reduce((a, k) => a + (agg[k]?.leads || 0), 0);
    return ld ? +(sp / ld).toFixed(2) : null;
  };
  const total = ["f", "l", "s", "m"].reduce((a, k) => ({ spend: a.spend + (agg[k]?.spend || 0), leads: a.leads + (agg[k]?.leads || 0) }), { spend: 0, leads: 0 });
  out[b] = {
    cpl: { lid_form: r("f", "l"), site: r("s"), messenger: r("m"), event: r("e") },
    avg: total.leads ? +(total.spend / total.leads).toFixed(2) : null,
    spend: Object.fromEntries(Object.entries(agg).map(([k, v]) => [k, +v.spend.toFixed(0)])),
    leads: Object.fromEntries(Object.entries(agg).map(([k, v]) => [k, v.leads])),
    campaigns: Object.values(agg).reduce((a, v) => a + v.n, 0),
  };
}
console.log(JSON.stringify(out, null, 1));
