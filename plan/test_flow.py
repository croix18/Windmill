#!/usr/bin/env python3
"""The plan's engine, tested: kit/lib/flow.py against its own rules, and kit/lib/flow.js against it.

    python3 plan/test_flow.py            (tools/check.sh runs it; needs node for the second half)

1. The rules, on small made-up sequences and on both courses' real ones (the flows in
   spine/spine.json) under random losses: every item gets one day and keeps its order, nothing sits
   on a day off, a test starts on a Monday or a Thursday and ends the next day, a flex day gives way
   only when the class is behind, losing a day never moves a lesson or a test earlier, and laying
   from the middle gives the same year as laying from the start.
2. The log: a class that is behind, a class that is ahead, a test the log puts on a Tuesday, and
   the logs the engine must refuse.
3. The two engines: the same few hundred scenarios laid by Python and by JavaScript (plan/test_flow.js),
   compared entry for entry. The console's own questions (`Flow.where`) are tested there too.
"""
import copy, datetime as dt, json, os, random, subprocess, sys, tempfile, importlib.util

HERE = os.path.dirname(os.path.abspath(__file__))
sp = importlib.util.spec_from_file_location("flow", os.path.join(HERE, "..", "kit", "lib", "flow.py"))
flow = importlib.util.module_from_spec(sp); sp.loader.exec_module(flow)
SPINE = json.load(open(os.path.join(HERE, "..", "spine", "spine.json"), encoding="utf-8"))
FAILS, RAN = [], [0]


def check(ok, what):
    RAN[0] += 1
    if not ok:
        FAILS.append(what)


def school_days(first, last, holidays=()):
    d, out = dt.date.fromisoformat(first), []
    while d <= dt.date.fromisoformat(last):
        if d.weekday() < 5 and d.isoformat() not in holidays:
            out.append(d.isoformat())
        d += dt.timedelta(days=1)
    return out


def small(holidays=(), min_before=0, breaks=()):
    """Two short units: three lessons, a review, a two-day test, a flex day; then two lessons and a test."""
    items = [{"kind": "lesson", "code": f"1.0{n}", "title": f"Lesson {n}", "unit": 1} for n in (1, 2, 3)]
    items += [{"kind": "review", "code": "1.R", "title": "Review", "unit": 1, "examIn": 1},
              {"kind": "exam", "code": "1.X1", "title": "Test day 1", "unit": 1, "examIn": 0},
              {"kind": "exam", "code": "1.X2", "title": "Test day 2", "unit": 1},
              {"kind": "flex", "code": "flex", "title": "Flex", "unit": 1, "absorb": True},
              {"kind": "lesson", "code": "2.01", "title": "Lesson 4", "unit": 2, "need": 3},
              {"kind": "lesson", "code": "2.02", "title": "Lesson 5", "unit": 2},
              {"kind": "exam", "code": "2.X1", "title": "Test day 1", "unit": 2, "examIn": 0},
              {"kind": "exam", "code": "2.X2", "title": "Test day 2", "unit": 2}]
    f = {"days": school_days("2026-09-07", "2026-10-30", holidays), "breaks": list(breaks),
         "rules": {"exam": {"weekdays": [0, 3], "minBeforeBreak": min_before},
                   "filler": {"unit": "next", "entry": {"kind": "spiral", "code": "spiral", "title": "Spiral", "unit": None}}},
         "tail": [{"before": "2026-10-19", "count": True, "code": "R{n}", "title": "Review {n}: {t}", "titles": ["a", "b"], "titleRest": "mixed",
                   "entry": {"kind": "pm3", "unit": None}},
                  {"entry": {"kind": "post", "code": None, "title": "After", "unit": None}}],
         "items": items, "blocked": {}}
    return flow.baseline(f)


def at(f, **kw):
    return {f["items"][r["index"]]["code"] + ("" if f["items"][r["index"]]["code"] != "flex" else str(r["index"])): r["date"]
            for r in flow.lay(f, **kw)["rows"] if r["src"] == "item"}


def invariants(f, res, name, start_index=0):
    rows, items = res["rows"], f["items"]
    dates = [r["date"] for r in rows]
    check(dates == sorted(set(dates)), f"{name}: a day twice, or out of order")
    off = set(f.get("blocked") or {})
    for r in rows:
        check((r["date"] in off) == (r["src"] == "blocked"), f"{name}: {r['date']} {r['src']} against the days off")
    seq = [r for r in rows if r["src"] == "item"]
    idx = [r["index"] for r in seq]
    check(idx == sorted(idx) and len(idx) == len(set(idx)), f"{name}: items out of order or laid twice")
    want = [k for k in range(start_index, len(items)) if not items[k].get("gone")]
    check(sorted(idx + res["dropped"] + res["left"]) == want, f"{name}: an item neither laid, dropped nor left")
    by = {r["index"]: n for n, r in enumerate(rows) if r["src"] == "item"}
    teach = [r["date"] for r in rows if r["src"] != "blocked"]
    exam_days = f["rules"]["exam"].get("weekdays", [0, 3])
    for k, it in enumerate(items):
        if k not in by:
            continue
        d = rows[by[k]]["date"]
        partner_gone = k + 1 < len(items) and items[k + 1].get("gone")      # the log says its other half happened elsewhere
        if it.get("examIn") == 0 and not it.get("free") and not partner_gone:
            nxt = teach[teach.index(d) + 1] if teach.index(d) + 1 < len(teach) else None
            check(dt.date.fromisoformat(d).weekday() in exam_days, f"{name}: {it['code']} starts on {d}, not a test day")
            check(nxt and (dt.date.fromisoformat(nxt) - dt.date.fromisoformat(d)).days == 1, f"{name}: {it['code']} on {d} is not followed by the next calendar day")
            check(k + 1 in by and rows[by[k + 1]]["date"] == nxt, f"{name}: {it['code']}'s second day is not the next teaching day")
        if it.get("examIn") == 1 and not it.get("free") and not partner_gone:
            check(k + 1 in by and teach.index(rows[by[k + 1]]["date"]) == teach.index(d) + 1, f"{name}: {it['code']} is not the teaching day before its test")
        if it.get("absorb") and it.get("base"):
            check(d <= it["base"], f"{name}: a flex day kept on {d}, later than its plan day {it['base']}")
    for k in res["dropped"]:
        check(items[k].get("absorb"), f"{name}: dropped an item that is not a flex day")


# ---- 1. the rules ---------------------------------------------------------------------------------
f = small()
a0 = at(f)
check(a0["1.01"] == "2026-09-07" and a0["1.R"] == "2026-09-11" and a0["1.X1"] == "2026-09-14" and a0["1.X2"] == "2026-09-15",
      f"small: lessons Mon–Wed, the review on the teaching day before a Monday test — got {a0}")
r0 = flow.lay(f)
check([r["entry"]["kind"] for r in r0["rows"][:5]] == ["lesson", "lesson", "lesson", "spiral", "review"] and r0["rows"][3]["src"] == "filler"
      and r0["rows"][3]["entry"]["unit"] == 1, "small: the day that has to pass before the review is a spiral day of that unit")
invariants(f, r0, "small")
# one day lost before the test: the spiral day absorbs it or the test moves to the next test day
f1 = copy.deepcopy(f); f1["blocked"]["2026-09-08"] = {"kind": "off", "code": None, "title": "State test", "meets": False}
a1 = at(f1); r1 = flow.lay(f1)
invariants(f1, r1, "small, one day off")
check(a1["1.02"] == "2026-09-09" and a1["1.03"] == "2026-09-10" and a1["1.R"] == "2026-09-11" and a1["1.X1"] == "2026-09-14",
      f"small: a lost day is absorbed by the slack before the test — got {a1}")
check(all(a1[k] >= a0[k] for k in a0 if k in a1), "small: a lost day moved something earlier")
# two more lost: the test moves to Thursday, the flex day is dropped, unit 2 starts when it did
f2 = copy.deepcopy(f1)
for d in ("2026-09-09", "2026-09-10"):
    f2["blocked"][d] = {"kind": "extra", "code": None, "title": "Review", "meets": True}
a2 = at(f2); r2 = flow.lay(f2)
invariants(f2, r2, "small, three days off")
check(a2["1.X1"] == "2026-09-17" and a2["1.X2"] == "2026-09-18", f"small: the test moves to the next Thursday — got {a2}")
check(len(r2["dropped"]) == 1 and f2["items"][r2["dropped"][0]]["code"] == "flex", "small: the flex day gives way when the class is behind")
check(not r0["dropped"], "small: the flex day stays when nothing is lost")
# a test cannot straddle a holiday: Friday off → a Thursday test is not allowed
f3 = small(holidays=("2026-09-11",))
a3 = at(f3)
invariants(f3, flow.lay(f3), "small, holiday Friday")
check(a3["1.X1"] == "2026-09-14", f"small: Thursday–Friday test across a holiday Friday is refused — got {a3}")
# a unit does not start within three teaching days of a break
f4 = small(breaks=("2026-09-21",))
a4 = at(f4); r4 = flow.lay(f4)
invariants(f4, r4, "small, break")
check(a4["2.01"] == "2026-09-21" and [r["src"] for r in r4["rows"] if "2026-09-17" <= r["date"] <= "2026-09-18"] == ["filler", "filler"],
      f"small: unit 2 waits for the break when fewer than three days are left before it — got {a4}")
# the tail: numbered review days, then what follows
tails = [r for r in r0["rows"] if r["src"] == "tail"]
check(tails and tails[0]["entry"]["code"] == "R1" and tails[0]["entry"]["title"] == "Review 1: a", "small: the first tail day")
check(any(r["entry"]["title"] == "Review 3: mixed" for r in tails), "small: tail titles past the list")
check(tails[-1]["entry"]["kind"] == "post", "small: the last tail segment")
# the year running out
f5 = small(); f5["days"] = f5["days"][:9]
r5 = flow.lay(f5)
check([f5["items"][k]["code"] for k in r5["left"]] == ["2.02", "2.X1", "2.X2"], f"small: a year too short leaves what did not fit — {r5['left']}")
# limit
r6 = flow.lay(f, limit=2)
check(len([r for r in r6["rows"] if r["src"] != "blocked"]) == 2 and not r6["left"], "small: limit")

REAL = {c: SPINE["flow"][c] for c in ("acc", "on")}
rng = random.Random(20261004)
CASES = []
for c, F in REAL.items():
    base = flow.lay(F)
    invariants(F, base, f"{c} as published")
    for trial in range(120):
        G = copy.deepcopy(F)
        lost = rng.sample(G["days"], rng.choice([0, 1, 1, 2, 3, 5, 8, 12]))
        extra = {d: {"kind": rng.choice(["extra", "off"]), "code": None, "title": "lost", "meets": True} for d in lost if d not in G["blocked"]}
        res = flow.lay(G, blocked=extra)
        H = dict(G, blocked=dict(G["blocked"], **extra))
        invariants(H, res, f"{c} trial {trial} ({len(extra)} lost)")
        now = {r["index"]: r["date"] for r in res["rows"] if r["src"] == "item"}
        was = {r["index"]: r["date"] for r in base["rows"] if r["src"] == "item"}
        # (a review day is the exception: it sits on the teaching day before its test, so when its own
        # day is lost it takes the spiral day before it — the slack absorbing the loss)
        pinned = {k for k, it in enumerate(G["items"]) if it.get("examIn") == 1}
        check(all(now[k] >= was[k] for k in now if k in was and k not in pinned), f"{c} trial {trial}: a lost day moved something earlier")
        # one more day lost never moves anything earlier than this
        more = rng.choice([d for d in G["days"] if d not in H["blocked"]])
        res2 = flow.lay(H, blocked={more: {"kind": "off", "code": None, "title": "one more", "meets": False}})
        now2 = {r["index"]: r["date"] for r in res2["rows"] if r["src"] == "item"}
        check(all(now2[k] >= now[k] for k in now2 if k in now and k not in pinned), f"{c} trial {trial}: one more lost day ({more}) moved something earlier")
        CASES.append({"course": c, "blocked": extra, "start": None, "limit": None, "expect": flow.project(res)})
        # from the middle: the same year
        seq = [r for r in res["rows"] if r["src"] == "item"]
        if seq and not res["left"]:
            pick = rng.choice(seq[: max(1, len(seq) - 3)])
            st = {"index": pick["index"], "date": pick["date"]}
            mid = flow.lay(G, start=st, blocked=extra)
            # flex days dropped before the start are not this layout's to report
            full_rows = [r for r in flow.project(res)[:-2] if r[0] >= pick["date"]]
            check(flow.project(mid)[:-2] == full_rows, f"{c} trial {trial}: laying from {st} differs from the year laid whole")
            CASES.append({"course": c, "blocked": extra, "start": st, "limit": None, "expect": flow.project(mid)})
            lim = rng.choice([1, 2, 5, 9])
            CASES.append({"course": c, "blocked": extra, "start": st, "limit": lim, "expect": flow.project(flow.lay(G, start=st, blocked=extra, limit=lim))})

# ---- 2. the log --------------------------------------------------------------------------------------
g = small()
flow.apply_log(g, [{"date": "2026-09-11", "what": "review", "note": ""}, {"date": "2026-09-14", "what": "1.03", "note": ""}])
ag = at(g)
check(ag["1.03"] == "2026-09-14" and ag["1.02"] == "2026-09-08", f"log: behind — the anchor holds and the earlier lessons stay put — got {ag}")
unrec = sorted(d for d, b in g["blocked"].items() if b.get("unrecorded"))
check(unrec == ["2026-09-09", "2026-09-10"], f"log: the missing days are the latest free ones before the anchor, and marked unrecorded — got {unrec}")
invariants(g, flow.lay(g), "log, behind")
g = small()
flow.apply_log(g, [{"date": "2026-09-08", "what": "1.03", "note": ""}])
check(g["items"][1].get("gone") and at(g)["1.03"] == "2026-09-08", "log: ahead — the lesson between is marked covered, not laid")
invariants(g, flow.lay(g), "log, ahead")
g = small()
flow.apply_log(g, [{"date": "2026-09-15", "what": "1.X1", "note": "a Tuesday test, allowed"}])
ag = at(g)
check(ag["1.X1"] == "2026-09-15" and g["items"][4].get("free"), f"log: a test on a Tuesday — the log outranks the rule — got {ag}")
g = small()
flow.apply_log(g, [{"date": "2026-10-01", "what": "off", "note": "State test"}])
check(g["blocked"]["2026-10-01"] == {"kind": "off", "code": None, "title": "State test", "meets": False}, "log: a day off, with its note as the title")
for bad, why in (([{"date": "2026-09-12", "what": "review", "note": ""}], "a Saturday"),
                 ([{"date": "2026-09-08", "what": "review", "note": ""}, {"date": "2026-09-08", "what": "off", "note": ""}], "a day twice"),
                 ([{"date": "2026-09-08", "what": "9.99", "note": ""}], "an unknown lesson"),
                 ([{"date": "2026-09-08", "what": "spiral", "note": ""}], "a spiral day, which is not in the sequence"),
                 ([{"date": "08/09/2026", "what": "off", "note": ""}], "a date in another shape"),
                 ([{"date": "2026-09-07", "what": "1.02", "note": ""}, {"date": "2026-09-08", "what": "1.01", "note": ""}], "lessons out of order")):
    try:
        flow.apply_log(small(), bad)
        check(False, f"log: {why} was accepted")
    except SystemExit:
        check(True, "")
# the published flows carry what the JS reads and nothing that is not JSON
for c, F in REAL.items():
    check(json.loads(json.dumps(F)) == F and set(F) == {"v", "days", "breaks", "rules", "tail", "blocked", "items"}, f"{c}: the published flow's shape")
    check(all(it.get("base") or it.get("gone") for it in F["items"]), f"{c}: an item with no baseline day")

# ---- 2b. the log on the published flows: what the phone's page applies (plan/applylog.js) -----------
LOGCASES = []
def random_log(F, rng):
    at_ = {r["index"]: r["date"] for r in flow.lay(F)["rows"] if r["src"] == "item"}
    free = [d for d in F["days"] if d not in F["blocked"]]
    log = [{"date": d, "what": rng.choice(["review", "off"]), "note": rng.choice(["", "State test"])}
           for d in rng.sample(free, rng.choice([0, 1, 1, 2, 3]))]
    lessons = [k for k, it in enumerate(F["items"]) if it["kind"] in ("lesson", "thread") and k in at_]
    for _ in range(rng.choice([0, 1, 1, 2])):
        k = rng.choice(lessons)
        i = F["days"].index(at_[k]) + rng.choice([-3, -2, -1, 0, 1, 2, 3, 5])
        if 0 <= i < len(F["days"]):
            log.append({"date": F["days"][i], "what": F["items"][k]["code"], "note": ""})
    rng.shuffle(log)
    return log
n_ok = n_refused = 0
for c, F in REAL.items():
    for trial in range(150):
        log = random_log(F, rng)
        G = copy.deepcopy(F)
        try:
            flow.apply_log(G, log)
            res = flow.lay(G)
            invariants(G, res, f"{c} log {trial}")
            at_ = {r["entry"]["code"]: r["date"] for r in res["rows"] if r["src"] == "item"}
            for e in log:
                if e["what"] not in ("review", "off"):
                    check(at_.get(e["what"]) == e["date"], f"{c} log {trial}: {e['what']} was to begin on {e['date']}, laid on {at_.get(e['what'])}")
                else:
                    check(G["blocked"][e["date"]]["kind"] == ("extra" if e["what"] == "review" else "off"), f"{c} log {trial}: {e['date']} not taken out")
            LOGCASES.append({"course": c, "log": log, "ok": True, "expect": flow.project(res),
                             "blocked": sorted((d, b["kind"], bool(b.get("unrecorded"))) for d, b in G["blocked"].items()),
                             "gone": [k for k, it in enumerate(G["items"]) if it.get("gone")], "free": [k for k, it in enumerate(G["items"]) if it.get("free")]})
            n_ok += 1
        except SystemExit:
            LOGCASES.append({"course": c, "log": log, "ok": False}); n_refused += 1
check(n_ok > 100 and n_refused > 5, f"logs: {n_ok} honoured, {n_refused} refused — the generator is not exercising both")

# ---- 3. the JavaScript engine -------------------------------------------------------------------------
for name, F2, kw in (("small", small(), {}), ("small-off", f2, {}), ("small-break", f4, {}), ("small-short", f5, {}), ("small-limit", f, {"limit": 2})):
    CASES.append({"flow": F2, "blocked": {}, "start": None, "limit": kw.get("limit"), "expect": flow.project(flow.lay(F2, **kw)), "name": name})
print(f"flow.py: {RAN[0]} checks, {len(FAILS)} failed")
for x in FAILS[:20]:
    print("  FAIL", x)
with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False, encoding="utf-8") as t:
    json.dump({"flows": REAL, "cases": CASES, "logcases": LOGCASES}, t)
try:
    r = subprocess.run(["node", os.path.join(HERE, "test_flow.js"), t.name], capture_output=True, text=True)
    print(r.stdout.strip() or r.stderr.strip())
    js_ok = r.returncode == 0
except FileNotFoundError:
    print("flow.js: NOT TESTED — node is not installed"); js_ok = False
finally:
    os.unlink(t.name)
sys.exit(1 if FAILS or not js_ok else 0)
