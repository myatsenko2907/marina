Обнови данные дашборда «Реклама филиалов Украины» (артефакт https://claude.ai/artifact/LBJgdQV67mhMiKFcpCwboZ) расходами из Meta Ads. Работай сам, без вопросов. Пользователю ничего не пиши, кроме короткого итога в конце.

Рабочая папка: создай новую пустую папку в своём scratchpad (дальше — WORK).

1. Список кабинетов. Вызови ArtifactData action "get", url артефакта, collection "config", doc_id "accounts", out_dir WORK. Получится файл WORK/config/accounts.json: branches[] → acc[] с полями id, label. Нужны все acc[].id (около 93 кабинетов).

2. Какие месяцы выгружать. Время считай по Киеву. Всегда: прошлый и текущий месяц. Кроме того, вызови ArtifactData action "list", collection "months", query.limit 100 (без out_dir), и посмотри, каких месяцев с января текущего года нет; их тоже добавь. SINCE = первое число самого раннего из этих месяцев, UNTIL = сегодня (YYYY-MM-DD). Запомни version каждого найденного документа months — он нужен на шаге 5.

3. Выгрузка. Для КАЖДОГО id из шага 1 вызови Meta ads_get_ad_entities с аргументами:
   ad_account_id=<id>, level="campaign", time_range='{"since":"SINCE","until":"UNTIL"}', time_increment="monthly",
   fields=["id","name","amount_spent"], filtering=[{"field":"amount_spent","operator":"GREATER_THAN","value":["0"]}],
   limit=1000, include_additional_context=false; плюс обязательные служебные поля этого инструмента (client_conversation_id и т. д.).
   Если в ответе есть pagination.next_cursor, повтори запрос с cursor. Делай по 8–10 вызовов параллельно в одном сообщении.
   ad_entities — это JSON-строка со списком строк кампания×месяц. Для каждой строки допиши в WORK/rows.tsv одну строку, разделитель TAB:
   <id кабинета>	<YYYY-MM из date_start>	<amount_spent.value>	<amount_spent.unit>	<name кампании, \u-последовательности раскодированы в обычный текст, табы и переводы строк заменены пробелом>
   Дописывай в файл через Bash (cat >> с heredoc в одинарных кавычках) после каждой пачки ответов, чтобы ничего не держать в памяти. Пустой ответ ("[]") — просто ничего не пиши.
   Если вызов для кабинета упал (после одной повторной попытки), допиши в WORK/errors.tsv: <id>	<код или краткая причина>.
   Перепроверь, что обработал все кабинеты из шага 1 и не записал ни один кабинет дважды.

4. Сборка. Сохрани скрипт ниже как WORK/build_months.py и запусти:
   python3 -I WORK/build_months.py WORK/config/accounts.json WORK/rows.tsv WORK/errors.tsv WORK <месяцы из шага 2 через пробел>
   Он создаст WORK/<YYYY-MM>.json для каждого месяца и напечатает итоги.

5. Запись. Одним вызовом ArtifactData action "batch" запиши для каждого месяца op "set", collection "months", doc_id "<YYYY-MM>", file_path "WORK/<YYYY-MM>.json"; для месяцев, которые уже были в months, добавь if_version из шага 2. Если batch отклонён из-за версии — перечитай months и повтори один раз.

6. Итог: одна-две строки — какие месяцы обновлены, общий расход и сколько кабинетов не загрузилось.

Скрипт build_months.py:
```python
import calendar, datetime as dt, json, sys
def main():
    cfg_path, rows_path, err_path, out_dir, *months = sys.argv[1:]
    cfg = json.load(open(cfg_path, encoding="utf-8"))
    rate = float(cfg.get("rate") or 41.5)
    acc = {}
    for b in cfg["branches"]:
        for a in b["acc"]:
            acc[a["id"]] = (b["name"], a["label"], a.get("cur"), a.get("fixed"))
    docs = {m: {} for m in months}; unknown = set()
    with open(rows_path, encoding="utf-8") as f:
        for line in f:
            line = line.rstrip("\n")
            if not line.strip(): continue
            parts = line.split("\t", 4)
            if len(parts) != 5: sys.exit("bad row: " + line)
            aid, month, spend, unit, name = (p.strip() for p in parts)
            if month not in docs: continue
            if aid not in acc: unknown.add(aid); continue
            branch, label, cur, fixed = acc[aid]
            v = float(spend)
            if (unit or cur or "USD").upper() == "UAH": v = v / rate
            if v <= 0: continue
            docs[month].setdefault(branch, {"c": [], "e": []})["c"].append([name, label, fixed, round(v, 2)])
    errors = []
    try:
        with open(err_path, encoding="utf-8") as f:
            for line in f:
                p = line.rstrip("\n").split("\t")
                if p and p[0].strip() in acc:
                    errors.append((p[0].strip(), (p[1].strip() if len(p) > 1 else "") or "upstream_error"))
    except FileNotFoundError:
        pass
    for aid, code in errors:
        branch, label, _, _ = acc[aid]
        for m in months: docs[m].setdefault(branch, {"c": [], "e": []})["e"].append([label, code])
    now = dt.datetime.now(dt.timezone.utc); today = (now + dt.timedelta(hours=3)).date()
    for m in months:
        y, mo = map(int, m.split("-")); last = dt.date(y, mo, calendar.monthrange(y, mo)[1])
        doc = {"month": m, "fetchedAt": now.isoformat(timespec="seconds"), "through": min(last, today).isoformat(), "rate": rate, "branches": docs[m]}
        json.dump(doc, open(f"{out_dir}/{m}.json", "w", encoding="utf-8"), ensure_ascii=False)
        print(f"{m}: {sum(len(b['c']) for b in docs[m].values())} rows, ${sum(c[3] for b in docs[m].values() for c in b['c']):,.0f}")
    if unknown: print("ignored unknown account ids:", ", ".join(sorted(unknown)))
main()
```
