#!/usr/bin/env python3
"""Validate a spine: every school day has an entry for both courses, every benchmark named is in
the benchmark list, every IXL skill maps to a benchmark, due dates follow their lessons, the bell
has every period the period map names, and the two calendars agree about holidays.

    python3 spine/validate.py [spine.json]     → prints problems, exits 1 if any
"""
import datetime as dt, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
KINDS = {"lesson", "thread", "exam", "review", "spiral", "flex", "pm3", "fast", "post", "extra", "off"}
BM = re.compile(r"^MA\.[78]\.[A-Z]+\.\d+\.\d+$")


def validate(s):
    P = []
    known = set(s["benchmarks"])
    courses = set(s["courses"])
    if s.get("v") != 1:
        P.append(f"version {s.get('v')!r}, expected 1")
    for p, c in s["periods"].items():
        if c is not None and c not in courses:
            P.append(f"period {p} maps to unknown course {c!r}")
    for c, info in s["courses"].items():
        for p in info["periods"]:
            if s["periods"].get(str(p)) != c:
                P.append(f"course {c} claims period {p} but the period map says {s['periods'].get(str(p))!r}")
    # the bell: both groups, both day shapes, every mapped period present
    groups = s["bell"]["groups"]
    if len(groups) != 2:
        P.append(f"bell has {len(groups)} groups, expected 2")
    for g in groups:
        for shape in ("regular", "wednesday"):
            labels = {re.sub(r"(st|nd|rd|th)$", "", b["label"]) for b in g[shape]}
            for p, c in s["periods"].items():
                if c and p not in labels:
                    P.append(f"bell group {g['name']} ({shape}) has no block for period {p}")
    # days
    first, last = dt.date.fromisoformat(s["year"]["first"]), dt.date.fromisoformat(s["year"]["last"])
    d = first
    while d <= last:
        key = d.isoformat()
        if d.weekday() < 5:
            e = s["days"].get(key)
            if e is None:
                P.append(f"{key}: weekday with no entry")
            elif "holiday" not in e:
                for c in courses:
                    v = e.get(c)
                    if not v:
                        P.append(f"{key}: no {c} entry")
                        continue
                    if v["kind"] not in KINDS:
                        P.append(f"{key} {c}: unknown kind {v['kind']!r}")
                    if v["kind"] in ("lesson", "thread") and not v["code"]:
                        P.append(f"{key} {c}: a lesson with no code")
                    for b in v["benchmarks"]:
                        if not BM.match(b):
                            P.append(f"{key} {c} {v['code']}: malformed benchmark {b!r}")
                        elif b not in known:
                            P.append(f"{key} {c} {v['code']}: benchmark {b} is not in the Source of Truth")
                        elif c not in s["benchmarks"][b]["courses"]:
                            P.append(f"{key} {c} {v['code']}: benchmark {b} is not a {c} benchmark")
                    for sk in v["ixl"]:
                        if not re.match(r"^[A-Z0-9]{3}$", sk["code"]):
                            P.append(f"{key} {c} {v['code']}: IXL code {sk['code']!r} is not three characters")
                        if sk["due"] and sk["due"] <= key:
                            P.append(f"{key} {c} {v['code']}: IXL {sk['code']} due {sk['due']} is not after the lesson")
                if not e["periods"]:
                    P.append(f"{key}: no periods on the bell")
                if e["wednesday"] != (d.weekday() == 2):
                    P.append(f"{key}: wednesday flag wrong")
                if e["week"] not in {g["name"] for g in groups}:
                    P.append(f"{key}: week {e['week']!r} is not a bell group")
        elif key in s["days"]:
            P.append(f"{key}: a weekend day has an entry")
        d += dt.timedelta(days=1)
    # week colour alternates between consecutive school weeks (skip weeks aside)
    mondays = sorted({(dt.date.fromisoformat(k) - dt.timedelta(days=dt.date.fromisoformat(k).weekday())).isoformat()
                      for k, v in s["days"].items() if "holiday" not in v})
    skips = set(s["bell"]["skipWeeks"])
    prev = None
    for m in mondays:
        if m in skips:
            continue
        wk = s["days"].get(m) or next(v for k, v in sorted(s["days"].items()) if k >= m)
        if prev and prev == wk["week"]:
            P.append(f"week of {m}: colour {wk['week']} repeats the previous school week")
        prev = wk["week"]
    # skills
    for code, sk in s["skills"].items():
        if not sk["benchmarks"]:
            P.append(f"IXL skill {code} ({sk['name']}) maps to no benchmark")
        for b in sk["benchmarks"]:
            if b not in known:
                P.append(f"IXL skill {code}: benchmark {b} unknown")
    # the flow: laid again by the engine, the sequence gives exactly `days` — so a tool that lays the
    # rest of the year from where a period really is starts from the same plan the documents show
    import importlib.util
    sp = importlib.util.spec_from_file_location("flow", os.path.join(HERE, "..", "kit", "lib", "flow.py"))
    flow = importlib.util.module_from_spec(sp); sp.loader.exec_module(flow)
    for c in courses:
        f = (s.get("flow") or {}).get(c)
        if not f:
            P.append(f"flow: none for {c}")
            continue
        res = flow.lay(f)
        if res["left"]:
            P.append(f"flow {c}: the year does not hold the sequence ({len(res['left'])} items have no day)")
        seen = set()
        for r in res["rows"]:
            seen.add(r["date"])
            have = (s["days"].get(r["date"]) or {}).get(c)
            want = {k: r["entry"].get(k) for k in ("kind", "code", "title", "unit")}
            if not have or {k: have.get(k) for k in want} != want:
                P.append(f"flow {c} {r['date']}: the sequence lays {want}, days says {have and {k: have.get(k) for k in want}}")
        for d in f["days"]:
            if d not in seen:
                P.append(f"flow {c} {d}: a school day the sequence leaves empty")
        for d, b in f["blocked"].items():
            if d not in f["days"]:
                P.append(f"flow {c}: a day off on {d}, which is not a school day")
    # every lesson's benchmark list is non-empty
    for key, e in s["days"].items():
        for c in courses:
            v = e.get(c)
            if v and v["kind"] in ("lesson", "thread") and not v["benchmarks"]:
                P.append(f"{key} {c} {v['code']}: a lesson with no benchmark")
    return P


if __name__ == "__main__":
    path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "spine.json")
    s = json.load(open(path, encoding="utf-8"))
    P = validate(s)
    for p in P:
        print("PROBLEM", p)
    n = sum(1 for v in s["days"].values() if "holiday" not in v)
    print(f"validate: {n} school days, {len(s['benchmarks'])} benchmarks, {len(s['skills'])} skills, {len(P)} problems")
    sys.exit(1 if P else 0)
