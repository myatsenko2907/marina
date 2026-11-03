// Хранилище: один JSON-файл (data/store.json). Запись атомарная (tmp + rename).
import fs from "node:fs";
import path from "node:path";
import { DEFAULT_SETTINGS } from "./defaults.mjs";

const EMPTY = () => ({
  settings: structuredClone(DEFAULT_SETTINGS),
  branches: [],
  months: {}, // "dp|2026-10" → { plan: { products: { form_ma: { plan, mix, cplOverride } } }, facts: { products: { form_ma: { contracts, balls, leads } } } }
  seasons: {}, // "dp|2026-H2" → { plan: { form_ma: 165 } }
  events: [],
  fb: {}, // branchId → { fetchedAt, cpl, events, mtd }
  users: [],
  imports: [],
  spend: {}, // branchId → { "2026-10": [[название кампании, расход], …] } — scripts/load-spend.mjs
  spendMeta: null,
  googleSpend: {}, // branchId → { "2026-10": [[id кабинета, кабинет, валюта, кампания, расход, конверсии, клики], …] } — scripts/load-google-ads.mjs
  googleMeta: null, // { until, loadedAt, rates: { "2026-10": грн за $ } }
});

export class Store {
  constructor(file) {
    this.file = file;
    fs.mkdirSync(path.dirname(file), { recursive: true });
    if (fs.existsSync(file)) {
      this.data = { ...EMPTY(), ...JSON.parse(fs.readFileSync(file, "utf8")) };
      // новые ключи настроек подтягиваем из дефолтов
      this.data.settings = { ...structuredClone(DEFAULT_SETTINGS), ...this.data.settings };
      // старая шкала {ok, risk} → новая пятиуровневая
      if (this.data.settings.thresholds?.boost == null) this.data.settings.thresholds = structuredClone(DEFAULT_SETTINGS.thresholds);
    } else {
      this.data = EMPTY();
    }
  }

  save() {
    const tmp = `${this.file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.data, null, 1));
    fs.renameSync(tmp, this.file);
  }

  branch(id) {
    return this.data.branches.find((b) => b.id === id) || null;
  }

  month(branchId, month) {
    return this.data.months[`${branchId}|${month}`] || null;
  }

  ensureMonth(branchId, month) {
    const k = `${branchId}|${month}`;
    return (this.data.months[k] ||= { plan: { products: {} }, facts: { products: {} } });
  }

  seasonPlan(branchId, seasonId) {
    return this.data.seasons[`${branchId}|${seasonId}`]?.plan || null;
  }

  eventsFor(branchId, month) {
    return this.data.events.filter((e) => e.branchId === branchId && (e.date || "").slice(0, 7) === month);
  }
}
