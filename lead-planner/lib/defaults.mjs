// Настройки по умолчанию. Всё редактируется в админке («Настройки»).

export const DEFAULT_SETTINGS = {
  // План лидобалов = план договоров × коэффициент (минимальная норма маркетинга — 90%).
  ballsPlanFactor: 0.9,
  // Статус по темпу (факт / ожидаемое к сегодняшнему дню): ≥ ok — в плане, ≥ risk — риск, ниже — провал.
  thresholds: { ok: 1, risk: 0.85 },
  // Переносить недостачу лидобалов закрытого месяца на следующий месяц набора.
  carryOver: true,

  // Типы лидов = источники CRM. ball — норма конверсии лида в оплаченный договор (= лидобалов за 1 лид).
  // paid — лиды покупаются в рекламе (считается бюджет по CPL кабинета).
  // fbActions — какие действия FB считаются лидами этого типа (для факта из кабинета).
  leadTypes: [
    { id: "call", name: "Входящий звонок", ball: 0.18, paid: false },
    { id: "site", name: "Заявка с сайта", ball: 0.15, paid: true, fbActions: ["offsite_conversion.fb_pixel_lead", "offsite_conversion.fb_pixel_custom*"] },
    { id: "lid_form", name: "Лид-форма", ball: 0.05, paid: true, fbActions: ["onsite_conversion.lead_grouped", "leadgen_grouped"] },
    { id: "messenger", name: "Мессенджер", ball: 0.1, paid: true, fbActions: ["onsite_conversion.messaging_conversation_started_7d"] },
    { id: "study", name: "Заявка на обучение", ball: 0.15, paid: false },
    { id: "demo", name: "Демо", ball: 0.05, paid: false },
    { id: "visit", name: "Визит без заявки", ball: 0.3, paid: false },
    { id: "event", name: "Регистрация на ивент", ball: 0.08, paid: true, kind: "event" },
  ],
  // Доли вклада типов в лидобалы, если нет плана и истории прошлого месяца.
  defaultMix: { call: 0.05, site: 0.35, lid_form: 0.3, messenger: 0.15, study: 0.05, visit: 0.05, demo: 0.05 },
  // Максимальная доля типа в плане лидобалов (лишнее перераспределяется на остальные типы).
  // Входящих звонков мало — на них не больше 5%.
  mixCaps: { call: 0.05 },
  // Нормы по конкретному продукту: { form_ma: { lid_form: 0.04 } }
  ballNorms: {},

  // Продукты = формы обучения CRM. campaignPattern — регулярное выражение по названию кампании FB.
  products: [
    { id: "form_ma", name: "МА — Компьютерная академия (дети)", campaignPattern: "МКА|ЮКА|JCA|Junior|МК " , aliases: ["JCA", "МА"] },
    { id: "form_st", name: "СТ — Стационар", aliases: ["FT"], campaignPattern: "РПО|СиК|КГиД|КГтД|ИМ |ИМ —|Стационар|Кибербез|Fullstack" },
    { id: "form_year", name: "СК — Курсы", aliases: ["SC", "SС"], campaignPattern: "Front-?End|QA|Python|3Ds|Motion|Java|UX|UI|Курс|SMM|Excel|Blender" },
    { id: "form_school", name: "Школа", aliases: ["School"], campaignPattern: "Школ|School|Скул" },
    { id: "form_schs", name: "ШС", aliases: ["HSC"], campaignPattern: "ШС" },
    { id: "form_step", name: "ПШ", aliases: ["FS"], campaignPattern: "ПШ|Професійна школа|Профшкол" },
    { id: "form_college", name: "Колледж", campaignPattern: "Колледж|Коледж|College" },
    { id: "form_vuz_11", name: "ВУЗ", campaignPattern: "ВУЗ|ВНЗ|Университет|Університет|University" },
    { id: "form_camp", name: "Лагерь", campaignPattern: "Лагер|Табір|Camp" },
    { id: "form_ps", name: "ПС", aliases: ["PT"], campaignPattern: "ПС —|ПС -" },
    { id: "form_clubs", name: "Клубы", campaignPattern: "Клуб|Club" },
    { id: "form_dsk", name: "ДСК", campaignPattern: "ДСК|ДЦ|Дитячий центр|Детский центр" },
    { id: "form_course", name: "Курсы (инд)", campaignPattern: "Індивідуальн|Индивидуальн" },
  ],

  // Кампании-ивенты (расход и регистрации не смешиваются с CPL продуктов).
  eventCampaignPattern: "Ивент|Івент|Event|Мероприят|Захід|ДОД|День открытых",
  // Порядок поиска лидов в действиях FB: берётся первое найденное (без двойного счёта).
  leadActionPriority: ["lead", "onsite_conversion.lead_grouped", "offsite_conversion.fb_pixel_lead", "offsite_conversion.fb_pixel_custom*", "onsite_conversion.messaging_conversation_started_7d"],
  // Окно для расчёта CPL и цены регистрации на ивент.
  cplLookbackDays: 30,
  eventLookbackDays: 90,
  metaApiVersion: "v21.0",
};

export const STATUS_LABELS = {
  ok: "В плане",
  risk: "Риск",
  fail: "Провал",
  nodata: "Нет факта",
  future: "Не начался",
};
