"""Build the dashboard's monthly documents from a Meta export.

Usage: python3 build_months.py accounts.json rows.tsv errors.tsv OUT_DIR YYYY-MM [YYYY-MM ...]

rows.tsv    one line per campaign-month: account_id, month (YYYY-MM), spend, currency, campaign name
errors.tsv  one line per account that failed: account_id, error code (may be empty)
Writes OUT_DIR/<YYYY-MM>.json for every month given, in the shape the page reads
from the `months` collection.
"""
import calendar
import datetime as dt
import json
import sys


def main():
    cfg_path, rows_path, err_path, out_dir, *months = sys.argv[1:]
    cfg = json.load(open(cfg_path, encoding="utf-8"))
    rate = float(cfg.get("rate") or 41.5)
    acc = {}
    for b in cfg["branches"]:
        for a in b["acc"]:
            acc[a["id"]] = (b["name"], a["label"], a.get("cur"), a.get("fixed"))

    docs = {m: {} for m in months}
    unknown = set()
    with open(rows_path, encoding="utf-8") as f:
        for line in f:
            line = line.rstrip("\n")
            if not line.strip():
                continue
            parts = line.split("\t", 4)
            if len(parts) != 5:
                sys.exit("bad row: " + line)
            aid, month, spend, unit, name = (p.strip() for p in parts)
            if month not in docs:
                continue
            if aid not in acc:
                unknown.add(aid)
                continue
            branch, label, cur, fixed = acc[aid]
            v = float(spend)
            if (unit or cur or "USD").upper() == "UAH":
                v = v / rate
            if v <= 0:
                continue
            br = docs[month].setdefault(branch, {"c": [], "e": []})
            br["c"].append([name, label, fixed, round(v, 2)])

    errors = []
    try:
        with open(err_path, encoding="utf-8") as f:
            for line in f:
                parts = line.rstrip("\n").split("\t")
                if parts and parts[0].strip() in acc:
                    errors.append((parts[0].strip(), (parts[1].strip() if len(parts) > 1 else "") or "upstream_error"))
    except FileNotFoundError:
        pass
    for aid, code in errors:
        branch, label, _, _ = acc[aid]
        for m in months:
            docs[m].setdefault(branch, {"c": [], "e": []})["e"].append([label, code])

    now = dt.datetime.now(dt.timezone.utc)
    today = (now + dt.timedelta(hours=3)).date()  # Kyiv
    for m in months:
        y, mo = map(int, m.split("-"))
        last = dt.date(y, mo, calendar.monthrange(y, mo)[1])
        through = min(last, today - dt.timedelta(days=0))
        doc = {"month": m, "fetchedAt": now.isoformat(timespec="seconds"), "through": through.isoformat(),
               "rate": rate, "branches": docs[m]}
        with open(f"{out_dir}/{m}.json", "w", encoding="utf-8") as f:
            json.dump(doc, f, ensure_ascii=False)
        n = sum(len(b["c"]) for b in docs[m].values())
        total = sum(c[3] for b in docs[m].values() for c in b["c"])
        print(f"{m}: {n} campaign rows, ${total:,.0f}, {len(docs[m])} branches")
    if unknown:
        print("ignored unknown account ids:", ", ".join(sorted(unknown)))


if __name__ == "__main__":
    main()
