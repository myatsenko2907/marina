"""Build the planning dashboard's monthly CRM documents.

Usage: python3 build_crm.py accounts.json plan.tsv req.tsv OUT_DIR YYYY-MM [YYYY-MM ...]

plan.tsv  alias, YYYY-MM, form key (incl. "total"), plan, fact      (crm_plan_month_check rows)
req.tsv   alias, period, type_request (incl. "ALL"), total_requests, deleted_requests,
          count_contract_for_90_days, total_contracts                 (crm_internet_requests list rows)
Writes OUT_DIR/crm-<YYYY-MM>.json: {month, fetchedAt, through, branches: {name: {f: {form: [plan, fact]},
r: {type: [total, deleted, contracts90, contracts]}}}} — encrypt it with encrypt_months.py.
"""
import calendar
import datetime as dt
import json
import sys


def num(s):
    s = (s or "").strip()
    return float(s) if s not in ("", "-") else 0.0


def main():
    cfg_path, plan_path, req_path, out_dir, *months = sys.argv[1:]
    cfg = json.load(open(cfg_path, encoding="utf-8"))
    names = {b["alias"]: b["name"] for b in cfg["branches"]}
    docs = {m: {} for m in months}
    for line in open(plan_path, encoding="utf-8"):
        p = line.rstrip("\n").split("\t")
        if len(p) != 5 or p[1] not in docs or p[0] not in names:
            continue
        br = docs[p[1]].setdefault(names[p[0]], {"f": {}, "r": {}})
        br["f"][p[2]] = [num(p[3]), num(p[4])]
    for line in open(req_path, encoding="utf-8"):
        p = line.rstrip("\n").split("\t")
        if len(p) != 7 or p[1] not in docs or p[0] not in names or p[2] == "ALL":
            continue
        br = docs[p[1]].setdefault(names[p[0]], {"f": {}, "r": {}})
        br["r"][p[2]] = [num(p[3]), num(p[4]), num(p[5]), num(p[6])]
    now = dt.datetime.now(dt.timezone.utc)
    today = (now + dt.timedelta(hours=3)).date()
    for m in months:
        y, mo = map(int, m.split("-"))
        through = min(dt.date(y, mo, calendar.monthrange(y, mo)[1]), today)
        # drop branches with nothing at all (no plan, no fact, no requests)
        br = {n: d for n, d in docs[m].items()
              if any(v[0] or v[1] for v in d["f"].values()) or any(v[0] for v in d["r"].values())}
        doc = {"month": m, "fetchedAt": now.isoformat(timespec="seconds"), "through": through.isoformat(), "branches": br}
        with open(f"{out_dir}/crm-{m}.json", "w", encoding="utf-8") as f:
            json.dump(doc, f, ensure_ascii=False)
        tot = sum(d["f"].get("total", [0, 0])[0] for d in br.values())
        fact = sum(d["f"].get("total", [0, 0])[1] for d in br.values())
        print(f"{m}: {len(br)} branches, plan {tot:.0f} contracts, fact {fact:.0f}")


if __name__ == "__main__":
    main()
