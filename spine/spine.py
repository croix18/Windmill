#!/usr/bin/env python3
"""Build `spine.json` — the year's plan as one machine-readable file: for every school day and
each course, the lesson, its benchmarks and IXL skills with due dates; the bell schedule and week
colour; the holidays; the benchmark list; the IXL skill → benchmark map.

    python3 spine/spine.py --a7 ../croix18-windy-hill-a7 --m7 ../windy-hill-m7 --deckhand ../Deckhand

It READS the three repositories' own sources and never edits them:
  A7  tools/scope_calendar.py (the day table), a7/reference/ixl_skills_by_lesson.json,
      a7/reference/Florida BEST Grade 8 - Source of Truth.md (benchmark wording, MA.7 and MA.8)
  M7  tools/mkscope.py (the day table, IXL plan), m7/reference/M7 IXL Due Dates 2026-27.csv,
      m7/reference/TRUTH - Grade 7 Benchmarks.md (benchmark labels) — the layout M7 took on 4 Oct 2026,
      the same shape as A7's; a checkout from before that (Windy Hill M7/Reference/) is still read
  Deckhand  the bell block baked into Deckhand.html (periods, times, week rotation, skip weeks)

The plan says where each course SHOULD be on a date. It is the room's `plan` part and the
fallback every tool uses when nothing fresher (Tally, the panel) is present. `validate.py` checks
the output; the generator refuses to write a file that fails it.
"""
import argparse, contextlib, datetime as dt, importlib.util, io, json, os, re, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "spine.json")
VERSION = 1

COURSES = {
    "acc": {"name": "Grade 7 Accelerated Mathematics", "focusCourse": "1205050", "fast": "Grade 8 FAST",
            "smartscore": 67, "periods": [1, 3], "repo": "croix18/croix18-windy-hill-a7"},
    "on": {"name": "Grade 7 Mathematics", "focusCourse": "1205040", "fast": "Grade 7 FAST",
           "smartscore": 60, "periods": [2, 4, 5], "repo": "croix18/windy-hill-m7"},
}
# Period → course. From Tally's notes (27 Sep 2026): 1st and 3rd accelerated; 2nd, 4th, 5th on-level.
# 6th is on the bell schedule and not in Tally — treated as planning until Croix says otherwise.
PERIODS = {1: "acc", 2: "on", 3: "acc", 4: "on", 5: "on", 6: None}

# What the two calendars call a day, mapped onto one vocabulary.
# `extra` and `off` are days the as-run log took out of the sequence (4 Oct 2026): an extra review or
# catch-up day (class met, nothing new), and a day with no class at all (a state test).
A7_KIND = {"L": "lesson", "T": "thread", "X": "exam", "R": "pm3", "F": "flex", "S": "spiral", "W": "pm3", "E": "extra", "O": "off"}
M7_KIND = {"lesson": "lesson", "spiral": "spiral", "review": "review", "test": "exam", "fast": "fast", "post": "post",
           "extra": "extra", "off": "off"}
FLAGS = ("examIn", "need", "absorb", "gone", "free", "base")      # what the engine reads off an item (kit/lib/flow.py)


def flow_engine():
    return load_module(os.path.join(HERE, "..", "kit", "lib", "flow.py"), "flow")


def publish(FLOW, entry):
    """A course's flow as the spine carries it: the same sequence, days, rules and days off its
    calendar tool laid the year from, with every entry in the spine's own vocabulary — so that a
    tool on the panel can lay the rest of the year again from where a period really is
    (kit/lib/flow.js), and so that validate.py can lay it here and demand `days`."""
    def item(it):
        return dict(entry(it), **{k: it[k] for k in FLAGS if k in it})
    fill = FLOW["rules"]["filler"]
    return {"v": 1, "days": list(FLOW["days"]), "breaks": list(FLOW.get("breaks") or []),
            "rules": {"exam": FLOW["rules"]["exam"], "filler": dict({k: v for k, v in fill.items() if k != "entry"}, entry=entry(fill["entry"]))},
            "tail": [dict({k: v for k, v in seg.items() if k != "entry"}, entry=entry(seg["entry"])) for seg in FLOW.get("tail") or []],
            "blocked": {d: dict(entry(b), **{k: b[k] for k in ("meets", "unrecorded") if k in b}) for d, b in sorted((FLOW.get("blocked") or {}).items())},
            "items": [item(it) for it in FLOW["items"]]}


def load_module(path, name):
    spec = importlib.util.spec_from_file_location(name, path)
    m = importlib.util.module_from_spec(spec)
    with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
        spec.loader.exec_module(m)
    return m


def git_head(repo):
    try:
        return subprocess.run(["git", "-C", repo, "rev-parse", "--short", "HEAD"], capture_output=True, text=True).stdout.strip()
    except OSError:
        return ""


# ---- benchmarks -------------------------------------------------------------------------------
M7_OLD_NAME = {"M7 IXL Due Dates 2026-27.csv": "IXL DUE DATES 2026-2027 - M7.csv"}     # before the 4 Oct 2026 renaming


def m7_ref(m7, name):
    """A file in M7's reference folder: m7/reference/ under its current name (the layout and the
    names M7 took on 4 Oct 2026), else as an older checkout has it."""
    old = M7_OLD_NAME.get(name, name)
    for p in (os.path.join(m7, "m7", "reference", name), os.path.join(m7, "m7", "reference", old),
              os.path.join(m7, "Windy Hill M7", "Reference", old)):
        if os.path.exists(p):
            return p
    return os.path.join(m7, "m7", "reference", name)


def benchmarks(a7, m7):
    """Every benchmark either course carries, with its wording (MA.8 and the MA.7 the A7 Source of
    Truth lists) or its label (the M7 TRUTH headings)."""
    out = {}
    sot = open(os.path.join(a7, "a7", "reference", "Florida BEST Grade 8 - Source of Truth.md"), encoding="utf-8").read()
    for code, text in re.findall(r"^\*\*(MA\.[78]\.[A-Z]+\.\d+\.\d+)\*\* — (.+)$", sot, re.M):
        out.setdefault(code, {})["text"] = re.sub(r"\*\*", "", text).strip()
    truth = open(m7_ref(m7, "TRUTH - Grade 7 Benchmarks.md"), encoding="utf-8").read()
    for code, label in re.findall(r"^## (MA\.7\.[A-Z]+\.\d+\.\d+) — (.+)$", truth, re.M):
        out.setdefault(code, {})["label"] = label.strip()
    for code, e in out.items():
        e["grade"] = int(code.split(".")[1])
        e["strand"] = code.split(".")[2]
        e["courses"] = sorted(c for c, want in (("acc", {7, 8}), ("on", {7})) if e["grade"] in want)
    return dict(sorted(out.items()))


def expand_benchmarks(s, grade_default, known):
    """A calendar's benchmark cell → full codes. A7 writes '7.NSO.1.1 · 8.NSO.1.3', ranges like
    '8.NSO.1.1–1.7' and standard-level '8.AR.2'; M7 writes 'GR.1.3, GR.1.4' (grade 7 implied)."""
    codes = []
    for part in re.split(r"[·,]", s or ""):
        part = part.strip()
        if not part or part == "all" or part.startswith("912."):   # Algebra 1 bridge items: outside both FASTs
            continue
        if not re.match(r"^\d\.", part):
            part = f"{grade_default}.{part}"
        m = re.match(r"^(\d)\.([A-Z]+)\.(\d+)\.(\d+)[–-](?:\d+\.)?(\d+)$", part)
        if m:                                             # a range within one standard
            g, st, a, lo, hi = m.groups()
            codes += [f"MA.{g}.{st}.{a}.{i}" for i in range(int(lo), int(hi) + 1)]
            continue
        m = re.match(r"^(\d)\.([A-Z]+)\.(\d+)$", part)
        if m:                                             # a standard: every benchmark under it
            g, st, a = m.groups()
            codes += [k for k in known if k.startswith(f"MA.{g}.{st}.{a}.")]
            continue
        codes.append("MA." + part)
    seen = []
    for c in codes:
        if c not in seen:
            seen.append(c)
    return seen


# ---- the bell schedule and the week colour -------------------------------------------------------
def bell_from_deckhand(deckhand):
    html = open(os.path.join(deckhand, "Deckhand.html"), encoding="utf-8").read()
    i = html.find('"bell": {')
    j = html.find("\n  }\n}", i)
    bell = json.loads("{" + html[i:j] + "\n  }}")["bell"]
    keep = {k: bell[k] for k in ("anchorMonday", "anchorWeekName", "defaultGroup", "skipWeeks", "autoWeek", "groups")}
    keep["source"] = "Deckhand.html baked config"
    return keep


def monday(d):
    return d - dt.timedelta(days=d.weekday())


def week_name(d, bell):
    """Deckhand's rule (v7.9): school weeks alternate between the two groups; whole weeks off
    (`skipWeeks`, Mondays) do not advance the rotation; a break week keeps the previous colour."""
    names = [g["name"] for g in bell["groups"]]
    if len(names) < 2 or not bell.get("autoWeek"):
        return bell.get("defaultGroup") or names[0]
    anchor = dt.date.fromisoformat(bell["anchorMonday"])
    skips = sorted(dt.date.fromisoformat(s) for s in bell["skipWeeks"])
    m = monday(d)
    if m in skips:                                        # no school this week: the previous week's colour
        return week_name(m - dt.timedelta(days=7), bell)
    weeks = (m - anchor).days // 7
    if m >= anchor:
        weeks -= sum(1 for s in skips if anchor < s <= m)
    else:
        weeks += sum(1 for s in skips if m < s <= anchor)
    other = next(n for n in names if n != bell["anchorWeekName"])
    return bell["anchorWeekName"] if weeks % 2 == 0 else other


def periods_for(d, bell):
    name = week_name(d, bell)
    g = next(g for g in bell["groups"] if g["name"] == name)
    blocks = g["wednesday"] if d.weekday() == 2 else g["regular"]
    out = []
    for b in blocks:
        m = re.match(r"^(\d)(?:st|nd|rd|th)$", b["label"])
        if m:
            out.append({"period": int(m.group(1)), "start": b["start"], "end": b["end"]})
    return name, out


# ---- the two calendars -----------------------------------------------------------------------------
def a7_days(a7, known):
    SC = load_module(os.path.join(a7, "tools", "scope_calendar.py"), "scope_calendar")
    rows = SC.rows
    days = {}
    for i, (d, unit, code, title, bm, kind) in enumerate(rows):
        e = {"kind": A7_KIND[kind], "code": code, "title": title, "unit": unit or None,
             "benchmarks": expand_benchmarks(bm, 8 if bm.startswith("8") else 7, known)}
        sk = SC.ixl(code)
        # ruling 28: lessons in a row with the same skills are one assignment, due the first day
        # the class meets after the last of them — scope_calendar's own run_end() and due()
        due = SC.due(i)
        e["ixl"] = [{"name": n, "code": c, "due": due.isoformat() if due else None} for n, c in sk]
        days[d] = e
    # A7 writes one row for the whole PM3 window (May 3–28); every school day in it is that row
    last = max(days)
    tail = days[last]
    if tail["code"] == "PM3":
        x = last + dt.timedelta(days=1)
        while x <= dt.date(2027, 5, 28):
            if x.weekday() < 5 and x not in SC.hol:
                days[x] = dict(tail)
            x += dt.timedelta(days=1)
    holidays = {d: "holiday" for d in SC.hol}
    return days, holidays, SC


def a7_flow(SC):
    def entry(e):
        if e["kind"] in ("extra", "off"):                    # a day off: scope_calendar names it by its kind
            return {"kind": e["kind"], "code": e["kind"], "title": e["title"], "unit": None}
        return {"kind": A7_KIND[e["kind"]], "code": e.get("code"), "title": e.get("title"), "unit": e.get("unit") or None}
    return publish(SC.FLOW, entry)


def m7_flow(MK):
    def entry(e):
        return {"kind": M7_KIND[e["kind"]], "code": e.get("code"), "title": e.get("title"), "unit": e.get("unit")}
    return publish(MK.FLOW, entry)


def m7_days(m7, known):
    MK = load_module(os.path.join(m7, "tools", "mkscope.py"), "mkscope")
    sched = MK.build()
    # IXL due dates from the student-facing CSV (assigned, due, lesson range, skill, code)
    due_by_lesson = {}
    import csv
    with open(m7_ref(m7, "M7 IXL Due Dates 2026-27.csv"), encoding="utf-8") as f:
        for r in csv.DictReader(f):
            m = re.match(r"^(\d+)\.(\d+)(?:[–-](\d+)\.(\d+))?$", r["lesson"].strip())
            if not m:
                continue
            u, a, _, b = m.groups()
            for n in range(int(a), int(b or a) + 1):
                due_by_lesson.setdefault(f"{u}.{n:02d}", []).append({"name": r["ixl skill"], "code": r["ixl code"], "due": r["due"]})
    days = {}
    # before mkscope's start (28 Sep): the Unit 3 test as it was actually run (Croix, 27 Sep:
    # "24–25 Sep went to the Unit 3 test"; 23 Sep was its review day)
    AS_RUN = {dt.date(2026, 9, 23): ("review", "Unit 3 review day (as run)"),
              dt.date(2026, 9, 24): ("test", "Unit 3 assessment, day 1 (as run)"),
              dt.date(2026, 9, 25): ("test", "Unit 3 assessment, day 2 (as run)")}
    sched = {**AS_RUN, **sched}
    waiting = {r["date"]: r["entry"].get("unit") for r in MK.LAID["rows"] if r["src"] == "blocked"}
    for d, v in sched.items():
        kind = M7_KIND[v[0]]
        e = {"kind": kind, "code": None, "title": v[1], "unit": None, "benchmarks": [], "ixl": []}
        if kind == "lesson":
            m = re.match(r"^(\d+)\.(\d+)\s+(.*)$", v[1])
            e["code"], e["title"], e["unit"] = f"{m.group(1)}.{m.group(2)}", m.group(3), int(m.group(1))
            e["benchmarks"] = expand_benchmarks(v[2], 7, known)
            e["ixl"] = due_by_lesson.get(e["code"], [])
        elif kind in ("review", "exam"):
            m = re.search(r"Unit (\d+)", v[1])
            e["unit"] = int(m.group(1)) if m else None
            e["code"] = f"{e['unit']}.R" if kind == "review" else f"{e['unit']}.X{'1' if 'day 1' in v[1] else '2'}"
        elif kind in ("extra", "off"):                     # a day the log took: it belongs to the unit that is waiting
            e["unit"] = waiting.get(d.isoformat())
        days[d] = e
    holidays = dict(MK.HOL)
    return days, holidays, MK


def skills_map(a7_days_, m7_days_):
    """IXL skill code → name, courses, benchmarks, lessons. This is what maps IXL at-goal counts
    onto the benchmark heat in the room."""
    out = {}
    for course, days in (("acc", a7_days_), ("on", m7_days_)):
        for d, e in sorted(days.items()):
            for s in e["ixl"]:
                k = out.setdefault(s["code"], {"name": s["name"], "courses": [], "benchmarks": [], "lessons": []})
                if course not in k["courses"]:
                    k["courses"].append(course)
                for b in e["benchmarks"]:
                    if b not in k["benchmarks"]:
                        k["benchmarks"].append(b)
                if e["code"] and f"{course}:{e['code']}" not in k["lessons"]:
                    k["lessons"].append(f"{course}:{e['code']}")
    return dict(sorted(out.items()))


def quarter_of(d):
    ends = [(dt.date(2026, 10, 9), 1), (dt.date(2026, 12, 18), 2), (dt.date(2027, 3, 4), 3), (dt.date(2027, 5, 28), 4)]
    return next((q for end, q in ends if d <= end), 4)


def build(a7, m7, deckhand, previous=None):
    bench = benchmarks(a7, m7)
    acc, hol_a, SC = a7_days(a7, bench)
    on, hol_m, MK = m7_days(m7, bench)
    if os.path.exists(os.path.join(deckhand, "Deckhand.html")):
        bell = bell_from_deckhand(deckhand)
    elif previous:                                        # the plan moves more often than the bell: without
        bell = previous["bell"]                           # Deckhand beside us, keep the bell already published
    else:
        sys.exit(f"spine: no Deckhand.html in {deckhand} and no earlier spine to take the bell from")
    first = min(min(acc), min(on))
    last = dt.date(2027, 5, 28)
    holidays = {}
    for d in sorted(set(hol_a) | set(hol_m)):
        if first <= d <= last and d.weekday() < 5:
            holidays[d.isoformat()] = hol_m.get(d, "holiday")
    days = {}
    d = first
    while d <= last:
        if d.weekday() < 5:
            name, periods = periods_for(d, bell)
            entry = {"week": name, "wednesday": d.weekday() == 2, "quarter": quarter_of(d),
                     "periods": periods, "events": []}
            if d.isoformat() in holidays:
                entry["holiday"] = holidays[d.isoformat()]
            else:
                entry["acc"] = acc.get(d)
                entry["on"] = on.get(d)
            ev = MK.EVENTS.get(d) if hasattr(MK, "EVENTS") else None
            if ev:
                entry["events"].append(ev)
            if d in getattr(MK, "QUARTERS", {}):
                entry["events"].append(MK.QUARTERS[d])
            days[d.isoformat()] = entry
        d += dt.timedelta(days=1)
    spine = {
        "v": VERSION,
        "generatedAt": dt.datetime.now().astimezone().isoformat(timespec="seconds"),
        "sources": {"a7": git_head(a7), "m7": git_head(m7),
                    "deckhand": git_head(deckhand) if os.path.exists(os.path.join(deckhand, "Deckhand.html")) else previous["sources"]["deckhand"]},
        "year": {"first": first.isoformat(), "last": last.isoformat(), "district": "Lake County Schools 2026-27",
                 "note": "Units 1–2 (A7) and Units 1–3 (M7) ran before these calendars begin; the plan covers the rest of the year."},
        "courses": COURSES,
        "periods": {str(k): v for k, v in PERIODS.items()},
        "bell": bell,
        "holidays": holidays,
        "benchmarks": bench,
        "skills": skills_map(acc, on),
        "days": days,
        # the plan as a sequence, so it can be laid again (4 Oct 2026: "I need the plan to be fluid")
        "flow": {"acc": a7_flow(SC), "on": m7_flow(MK)},
    }
    return spine


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--a7", default=os.path.join(HERE, "..", "..", "croix18-windy-hill-a7"))
    ap.add_argument("--m7", default=os.path.join(HERE, "..", "..", "windy-hill-m7"))
    ap.add_argument("--deckhand", default=os.path.join(HERE, "..", "..", "Deckhand"))
    ap.add_argument("-o", "--out", default=OUT)
    a = ap.parse_args()
    previous = json.load(open(a.out, encoding="utf-8")) if os.path.exists(a.out) else None
    spine = build(os.path.abspath(a.a7), os.path.abspath(a.m7), os.path.abspath(a.deckhand), previous)
    sys.path.insert(0, HERE)
    import validate
    problems = validate.validate(spine)
    for p in problems:
        print("  PROBLEM", p)
    if problems:
        sys.exit(f"spine: {len(problems)} problems — not written")
    # the benchmark LIST the compact room code indexes into: its order never changes silently.
    # A change to the codes needs a version bump here, or the generator refuses — a code made
    # against list v1 must never be decoded against a different v1.
    lst = os.path.join(HERE, "..", "room", "benchmarks.json")
    codes = list(spine["benchmarks"])
    old = json.load(open(lst)) if os.path.exists(lst) else {"version": 0, "codes": []}
    if codes != old["codes"]:
        if old["codes"] and os.environ.get("BUMP_LIST") != "1":
            sys.exit(f"spine: the benchmark list changed ({len(old['codes'])} → {len(codes)} codes); rerun with BUMP_LIST=1 to publish it as v{old['version'] + 1}")
        json.dump({"version": old["version"] + 1, "codes": codes}, open(lst, "w"), indent=1)
        print(f"benchmark list v{old['version'] + 1} written ({len(codes)} codes)")
    spine["benchmarkList"] = {"version": json.load(open(lst))["version"], "count": len(codes)}
    # same inputs, same bytes: keep the previous timestamp when nothing but the clock changed
    if os.path.exists(a.out):
        prev = json.load(open(a.out, encoding="utf-8"))
        if {k: v for k, v in prev.items() if k != "generatedAt"} == {k: v for k, v in spine.items() if k != "generatedAt"}:
            spine["generatedAt"] = prev["generatedAt"]
    with open(a.out, "w", encoding="utf-8") as f:
        json.dump(spine, f, indent=1, ensure_ascii=False, sort_keys=False)
        f.write("\n")
    n_days = sum(1 for v in spine["days"].values() if "holiday" not in v)
    print(f"wrote {os.path.relpath(a.out)}: {n_days} school days, {len(spine['benchmarks'])} benchmarks, "
          f"{len(spine['skills'])} IXL skills, {len(spine['holidays'])} holidays, bell from Deckhand ({spine['sources']['deckhand']})")
