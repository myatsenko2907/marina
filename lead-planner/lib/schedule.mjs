// Ежедневное расписание в часовом поясе: следующий запуск «каждый день в HH:MM» (по умолчанию 10:00 по Киеву).

// Смещение часового пояса (мс) в момент t: локальное время пояса − UTC.
function tzOffset(t, tz) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }).formatToParts(t).map((x) => [x.type, x.value]));
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - Math.floor(t.getTime() / 1000) * 1000;
}

export function nextDailyRun(hhmm = "10:00", tz = "Europe/Kyiv", from = new Date()) {
  const [h, m] = hhmm.split(":").map(Number);
  const local = new Date(from.getTime() + tzOffset(from, tz));
  for (let add = 0; add < 3; add++) {
    const guess = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + add, h, m);
    // переводим «местное» время в UTC (с учётом перехода на летнее/зимнее время)
    let t = guess - tzOffset(new Date(guess), tz);
    t = guess - tzOffset(new Date(t), tz);
    if (t > from.getTime()) return new Date(t);
  }
  return null;
}
