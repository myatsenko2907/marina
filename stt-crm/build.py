#!/usr/bin/env python3
"""Сборка STEP Travel CRM-дашборда.

Читает выгрузки из CRM (stt-crm/raw/*.json) и Meta (stt-crm/raw/meta_*.json),
нормализует их и вшивает в stt-crm/template.html -> stt-crm/dist/index.html.

raw/ и dist/ содержат персональные данные клиентов и не коммитятся (.gitignore).
Паспорта, ИНН, e-mail и адреса из договоров в дашборд НЕ попадают.
"""
import json, re, datetime, collections
from pathlib import Path

ROOT = Path(__file__).parent
RAW = ROOT / "raw"
DIST = ROOT / "dist"
TODAY = datetime.date(2026, 11, 3)

BRANCH_NAMES = {
    "kiev": "Киев", "dp": "Днепр", "kh": "Харьков", "vn": "Винница", "cher": "Чернигов",
    "brovary": "Бровары", "zp": "Запорожье", "od": "Одесса", "hm": "Хмельницкий",
    "kremen": "Кременчуг", "virt": "Виртуальный (облачный)", "bila": "Белая Церковь",
    "rv": "Ровно", "krog": "Кривой Рог", "stt_ukr": "Step2Travel Ukraine",
}

# ключ -> (название страны/направления, регулярка по названию продукта/кампании/договора)
COUNTRIES = [
    ("korea", "Корея", r"коре|korea"),
    ("japan", "Япония", r"япон|japan"),
    ("carpathians", "Карпаты (Украина)", r"карпат|carpath"),
    ("greece", "Греция", r"грец|грец|греция|греці|^gr$"),
    ("bulgaria", "Болгария", r"болгар|bulgar"),
    ("london", "Лондон (Великобритания)", r"лондон|london|англ"),
    ("barcelona", "Испания (Барселона)", r"барсел|іспан|испан|barcelona|spain"),
    ("china", "Китай / Гонконг", r"китай|пекін|пекин|hongkong|beijing"),
    ("seattle", "США: Сиэтл / Калифорния", r"сиэтл|сіетл|калифор|seattle"),
    ("newyork", "США: Нью-Йорк / Флорида", r"нью.?йорк|флорид|new york|usa_2"),
    ("malaysia", "Малайзия / Сингапур", r"малайз|malaysia"),
    ("kyiv_city", "Городской лагерь (Оболонь)", r"оболон"),
    ("webinar", "Вебинар «Как выбрать лагерь»", r"як обрати|как выбрать"),
    ("general", "Общий интерес (без страны)", r"общий|общая|літні табори|^вт\s*-\s*$"),
]


def country_of(text):
    t = (text or "").strip().lower()
    for key, name, rx in COUNTRIES:
        if re.search(rx, t):
            return key
    return "unknown"


COUNTRY_NAME = {k: n for k, n, _ in COUNTRIES}
COUNTRY_NAME["unknown"] = "Не указано"

LEAD_STATUS = {
    "result_no_answer": "Недозвон",
    "wait_call": "Ждёт звонка / перезвон",
    "result_think": "Думает",
    "result_fail": "Отказ",
    "result_deleted": "Удалён",
    None: "Не обработан",
}
LEAD_SOURCE = {
    "irt_facebook": "Meta lead-форма",
    "irt_course": "Сайт: заявка на программу",
    "irt_consultation": "Сайт: консультация",
    "irt_study_form": "Сайт: форма",
    "irt_internet": "Сайт",
}
PAYMENT = {"1": "Оплачен", "0": "Не оплачен", "2": "Отказ / не оплачен в срок", "5": "Аннулирован / переоформлен"}

NOT_LEFT_RX = re.compile(r"не\s*зал[иі]ш|не\s*оставл|помилк|випадков|ошибк|тест", re.I)
EXPENSIVE_RX = re.compile(r"дорог", re.I)
LATER_RX = re.compile(r"наст|на след|наступн|осін|осен|на зим|рік|год", re.I)


def load(name):
    return json.loads((RAW / name).read_text())


def quality(l):
    """Качество лида по итогам обработки."""
    res, com = l["result"], " ".join(filter(None, [l.get("comment"), l.get("last_comment")]))
    if res == "result_deleted":
        if l.get("comment") == "delete_fake_tooltip" or NOT_LEFT_RX.search(com):
            return "Фейк / не оставлял"
        if l.get("comment") == "delete_duplicate_tooltip":
            return "Дубль"
        return "Удалён (прочее)"
    if NOT_LEFT_RX.search(com):
        return "Фейк / не оставлял"
    if res in ("wait_call", "result_think"):
        return "Целевой"
    if res == "result_fail":
        return "Целевой, отказ"
    if res == "result_no_answer":
        return "Не дозвонились — неизвестно"
    return "Не обработан"


def loss_reason(l):
    com = " ".join(filter(None, [l.get("comment"), l.get("last_comment")]))
    q = quality(l)
    if q.startswith("Фейк"):
        return "Фейк / случайная заявка"
    if q == "Дубль":
        return "Дубль"
    if l["result"] == "result_deleted":
        return "Удалён без причины"
    if EXPENSIVE_RX.search(com):
        return "Дорого"
    if LATER_RX.search(com):
        return "Неактуально сейчас / на след. сезон"
    if l["result"] == "result_no_answer":
        return "Не дозвонились"
    if l["result"] is None:
        return "Не обработан менеджером"
    if l["result"] == "result_fail":
        return "Отказ (прочее)"
    return ""


def priority(l, days):
    """Чем выше — тем раньше звонить. None — продавать некому."""
    q = quality(l)
    if l["result"] in ("result_deleted", "result_fail") or q.startswith("Фейк"):
        return None
    score = {"result_think": 90, "wait_call": 80, None: 75, "result_no_answer": 50}.get(l["result"], 40)
    com = " ".join(filter(None, [l.get("comment"), l.get("last_comment")]))
    if EXPENSIVE_RX.search(com):
        score -= 15
    if LATER_RX.search(com):
        score += 5  # прямо сказали «на следующий сезон» — сейчас как раз продажи зимы/лета-2027
    if (l.get("count_contacts_ago") or 0) == 0:
        score += 10  # реально ни разу не связывались
    return score


def build_leads():
    leads = []
    for i in (1, 2, 3):
        leads += load(f"stt_p{i}.json")["data"]["leads"]
    out = []
    for l in leads:
        created = l["created_at"][:10]
        days = (TODAY - datetime.date.fromisoformat(created)).days
        c = country_of(l["product_name"])
        utm = (l.get("utm_source") or "").lower()
        placement = "Instagram" if "instagram" in utm else ("Facebook" if "facebook" in utm else "")
        pr = priority(l, days)
        out.append({
            "id": l["id"], "client_id": l["id_uniq"] or None, "date": created, "days": days,
            "name": (l["fio"] or "").strip(), "product": (l["product_name"] or "").strip(),
            "country": c, "source": LEAD_SOURCE.get(l["type"], l["type"]), "placement": placement,
            "status": LEAD_STATUS.get(l["result"], l["result"]), "status_raw": l["result"],
            "quality": quality(l), "loss": loss_reason(l),
            "contacts": l.get("count_contacts_ago") or 0,
            "no_answer": l.get("count_contacts_ago_no_asnwer") or 0,
            "last_result": l.get("last_result") or "",
            "comment": " | ".join(x for x in [l.get("comment"), l.get("last_comment")]
                                  if x and x not in ("no_answer", "delete_fake_tooltip", "delete_duplicate_tooltip", "not_call")),
            "processed": (l.get("processed_at") or "")[:10],
            "crm": l.get("link_client_history"), "fb_lead_id": l.get("fb_lead_id") or "",
            "priority": pr, "potential": pr is not None,
        })
    return out


def build_contracts():
    rows = []
    for f, b in [("kiev_contracts_p1.json", "kiev"), ("kiev_contracts_p2.json", "kiev"),
                 ("kiev_contracts_p3.json", "kiev"), ("dp_contracts.json", "dp"), ("kh_contracts.json", "kh")]:
        for x in load(f)["items"]:
            d = x["docsClients"] or {}
            note = " ".join(filter(None, [d.get("special"), d.get("stream"), d.get("timeless")])).strip()
            rows.append({
                "branch": b, "id": x["id_source"], "client_id": x["id_uniq"], "date": x["date_time"][:10],
                "customer": (x["fio_customer"] or "").strip(), "child": (x["fio_listener"] or "").strip(),
                "age": (x.get("contacts") or {}).get("age"), "product": x["product"],
                "country": country_of(x["product"]) if country_of(x["product"]) != "unknown" else country_of(note),
                "note": note, "sum": float(d.get("total_cost_of_the_contract") or 0),
                "payment": PAYMENT.get(x["payments"]["payment"], x["payments"]["payment"]),
                "paid": x["payments"]["payment"] == "1",
                "pay_date": (x["payments"].get("date_payment") or "")[:10],
                "manager": (x.get("users") or {}).get("fio_user") or "",
                "type": "Переоформление" if x["contract_type"] == 2 or "reissuance" in x["contract_type_name"] else "Новый",
                "crm": f"https://crm.itstep.org/clients/{x['id_uniq']}",
            })
    for m in load("other_contracts_manual.json"):
        rows.append({
            "branch": m["branch"], "id": m["id"], "client_id": None, "date": m["date"],
            "customer": m["customer"], "child": m["child"], "age": m["age"], "product": m["product"],
            "country": country_of(m["product"]), "note": m["note"], "sum": float(m["sum"]),
            "payment": PAYMENT.get(m["payment"], m["payment"]), "paid": m["payment"] == "1",
            "pay_date": "", "manager": m["manager"], "type": "Новый", "crm": None,
        })
    for r in rows:
        r["branch_name"] = BRANCH_NAMES.get(r["branch"], r["branch"])
    return rows


def norm_tokens(s):
    return [t for t in re.split(r"[\s.\-']+", (s or "").lower().replace("ё", "е")) if len(t) >= 4]


def match_sales(leads, contracts):
    """Сопоставление лид -> договор по фамилии + стране (CRM их не связывает)."""
    # Совпадение = минимум 2 общих слова (имя + фамилия) в ФИО лида и заказчика,
    # договор не раньше лида и по той же стране (или лид без страны).
    ctoks = [(c, set(norm_tokens(c["customer"]))) for c in contracts]
    for l in leads:
        l["sale"] = None
        lt = set(norm_tokens(l["name"]))
        if l["status_raw"] == "result_deleted" or len(lt) < 2:
            continue
        for c, ct in ctoks:
            if len(lt & ct) >= 2 and c["date"] >= l["date"] and (
                    c["country"] == l["country"] or l["country"] in ("general", "webinar", "unknown")):
                l["sale"] = {"id": c["id"], "branch": c["branch_name"], "date": c["date"],
                             "sum": c["sum"], "paid": c["paid"], "country": c["country"]}
                break


def build_meta():
    camps = load("meta_campaigns.json")
    br = load("meta_breakdowns.json")
    for c in camps["campaigns"]:
        c["country"] = country_of(c["name"])
        if c["objective"] != "OUTCOME_LEADS":
            c["country"] = "smm"
    COUNTRY_NAME["smm"] = "SMM (трафик / вовлечённость)"
    return {"account": camps["account"], "period": camps["period"], "campaigns": camps["campaigns"],
            "platform": br["platform"], "monthly": br["monthly"]}


def main():
    leads = build_leads()
    contracts = build_contracts()
    match_sales(leads, contracts)
    meta = build_meta()
    survey = load("branch_survey.json")
    data = {
        "generated": TODAY.isoformat(), "period_from": "2026-04-01",
        "countries": COUNTRY_NAME, "branches": BRANCH_NAMES,
        "leads": leads, "contracts": contracts, "meta": meta, "survey": survey,
    }
    DIST.mkdir(exist_ok=True)
    html = (ROOT / "template.html").read_text().replace(
        "/*__DATA__*/null", json.dumps(data, ensure_ascii=False))
    (DIST / "index.html").write_text(html)
    pot = sum(1 for l in leads if l["potential"])
    print(f"leads={len(leads)} potential={pot} contracts={len(contracts)} "
          f"matched={sum(1 for l in leads if l['sale'])} -> {DIST / 'index.html'}")


if __name__ == "__main__":
    main()
