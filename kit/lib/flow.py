"""The plan's engine: lay a course's sequence of days onto the school days it actually has.

Croix, 4 October 2026: "I would like the plans to adjust or allow for flexibility but also adjust.
For example, I took Friday as an extra review day ... We have another random state test this week, so
that'll put us behind again. I need the plan to be fluid and adjust on the fly." Asked what should
give when a class falls behind, he chose: **push everything back** — lessons keep their order, flex
and spiral days absorb the loss first, then tests move to the next Monday or Thursday and the
end-of-year review shrinks; and he is told when a test crosses a quarter's end or content runs
past 30 April.

So the plan is no longer a table of dates. It is

    a SEQUENCE   the lessons, reviews and tests of the year, in order            (flow["items"])
    a CALENDAR   every school day                                                (flow["days"])
    the DAYS OFF the school days that did not, or will not, carry the sequence   (flow["blocked"])
    the RULES    how a sequence sits on days                                     (flow["rules"], item flags)

and the dates are what `lay` gives. A lost day is one more entry in `blocked`; everything after it
moves by itself. The same function runs in two places and must give the same answer in both:

    here            each course's calendar tool (A7 tools/scope_calendar.py, M7 tools/mkscope.py)
                    lays the year, and Windmill's spine publishes the result and the flow itself;
    lib/flow.js     the console on the panel lays the rest of the year again from where a period
                    really is, with the days that period has lost, between one build and the next.

Windmill's `plan/test_flow.py` holds the two to each other on both courses' real sequences and on
random losses. Change one, change the other, run the test.

The rules (each is data, so the JS reads the same thing):

  item["examIn"] = n     this item sits exactly n teaching days before an exam's first day (the first
                         exam day itself: 0; M7's review day: 1). An exam's first day is a weekday in
                         rules.exam.weekdays, its second day is the next calendar day, and it is at
                         least rules.exam.minBeforeBreak teaching days before a break. Days that have
                         to pass first are FILLER days (rules.filler: a spiral day).
  item["need"] = n       do not start this item with fewer than n teaching days before a break
                         (M7: a unit does not start three days before a break); filler until then.
  item["absorb"]         a flex day: it is dropped when its day would come later than it did in the
                         plan with nothing lost (item["base"]) — "absorb a lost day".
  item["gone"]           already covered on a day the log does not name; never laid.
  item["free"]           the log put this item on a day the rules would not (a test on a Tuesday): the
                         log wins, the rules are not asked.
  flow["tail"]           what the days after the last item are (the FAST review block, the window).
  blocked[date]          {"kind": "extra" | "off", "title", "meets"}: an extra review or catch-up day
                         (class meets, nothing new), or no class at all (a state test). `meets`
                         decides whether IXL can be due that day.
"""
import csv, datetime as dt, os

V = 1
EXTRA, OFF = "extra", "off"                 # the kinds of a day the sequence does not get


def _date(s):
    return dt.date.fromisoformat(s)


def _weekday(s):                             # Monday 0 … Friday 4
    return _date(s).weekday()


def lay(flow, start=None, blocked=None, limit=None):
    """Lay the sequence. → {"rows": [...], "dropped": [...], "left": [...]}.

    start    {"index": k, "date": iso, "tail": n} — lay from item k on the first school day on or
             after that date (the console: where this period is, from today). Default: the year.
    blocked  more days off, added to flow["blocked"] (the console: days this period lost).
    limit    stop after this many teaching days (enough to answer "what is next").

    rows     one per school day in order: {"date", "src": "item" | "filler" | "tail" | "blocked",
             "index": the item's index or None, "entry": the item / the filler / the day off}.
    dropped  indices of flex days absorbed; left: indices of items that found no day (the year ran out).
    """
    days, items, rules = flow["days"], flow["items"], flow["rules"]
    off = dict(flow.get("blocked") or {})
    off.update(blocked or {})
    k = (start or {}).get("index", 0)
    tail_n = (start or {}).get("tail", 0)
    first = (start or {}).get("date")
    span = [d for d in days if not first or d >= first]
    avail = [d for d in span if d not in off]
    breaks = sorted(flow.get("breaks") or [])
    ex = rules.get("exam") or {}
    exam_days, min_before = ex.get("weekdays", [0, 3]), ex.get("minBeforeBreak", 0)
    fill = rules["filler"]

    def before_break(a):                     # teaching days from avail[a] to the next break
        b = next((b for b in breaks if avail[a] < b), None)
        if b is None:
            return 99
        n = 0
        while a + n < len(avail) and avail[a + n] < b:
            n += 1
        return n

    def exam_ok(a):
        if a + 1 >= len(avail):
            return False
        return (_weekday(avail[a]) in exam_days and (_date(avail[a + 1]) - _date(avail[a])).days == 1
                and before_break(a) >= min_before)

    placed, dropped, a, ran_out = {}, [], 0, False
    stop = len(avail) if limit is None else min(len(avail), limit)

    def filler(it):
        e = dict(fill["entry"])
        if fill.get("unit") == "next":
            e["unit"] = it.get("unit")
        placed[avail[a]] = {"src": "filler", "index": None, "entry": e}

    while k < len(items):
        it = items[k]
        if it.get("gone"):
            k += 1
            continue
        if a >= stop:
            ran_out = a >= len(avail)
            break
        if it.get("absorb") and it.get("base") and avail[a] > it["base"]:
            dropped.append(k)
            k += 1
            continue
        if not it.get("free"):               # `free`: the log put this item on its day; the rules give way
            if it.get("need") and before_break(a) < it["need"]:
                filler(it)
                a += 1
                continue
            if "examIn" in it:
                j = a + it["examIn"]
                while j < len(avail) and not exam_ok(j):
                    j += 1
                if j >= len(avail):
                    ran_out = True           # no two days left for this test: it and what follows are `left`
                    break
                if j - it["examIn"] > a:
                    filler(it)
                    a += 1
                    continue
        placed[avail[a]] = {"src": "item", "index": k, "entry": it}
        a += 1
        k += 1
    left = [j for j in range(k, len(items)) if not items[j].get("gone")] if ran_out else []
    if k >= len(items):
        tail = flow.get("tail") or []
        while a < stop:
            seg = next((s for s in tail if "before" not in s or avail[a] < s["before"]), None)
            if seg is None:
                break
            e = dict(seg["entry"])
            if seg.get("count"):
                tail_n += 1
                titles = seg.get("titles") or []
                t = titles[tail_n - 1] if tail_n <= len(titles) else seg.get("titleRest", "")
                e["code"] = seg["code"].replace("{n}", str(tail_n))
                e["title"] = seg["title"].replace("{n}", str(tail_n)).replace("{t}", t)
            placed[avail[a]] = {"src": "tail", "index": None, "entry": e}
            a += 1
    rows, last = [], (avail[a - 1] if a else None)
    for d in span:
        if d in placed:
            rows.append(dict(placed[d], date=d))
        elif d in off and (limit is None or (last is not None and d <= last)):
            rows.append({"date": d, "src": "blocked", "index": None, "entry": dict(off[d])})
    unit = None                                # a day off belongs to the unit that is waiting
    for r in reversed(rows):
        if r["src"] == "blocked":
            r["entry"]["unit"] = unit
        else:
            unit = r["entry"].get("unit")
    return {"rows": rows, "dropped": dropped, "left": left}


def project(result):
    """The part of a layout that the two engines must agree on, as plain lists."""
    return [[r["date"], r["src"], r["index"], r["entry"].get("kind"), r["entry"].get("code"),
             r["entry"].get("unit"), r["entry"].get("title")] for r in result["rows"]] + \
           [["dropped"] + result["dropped"], ["left"] + result["left"]]


# ---- the plan with nothing lost, and the log of what happened -------------------------------------
def baseline(flow):
    """Stamp every item with the day it has when nothing is lost (item["base"]). Flex days need it
    (absorb), and it is what "two days behind" is measured against."""
    for it in flow["items"]:
        it.pop("base", None)
    clean = dict(flow, blocked={}, items=[{k: v for k, v in it.items() if k not in ("gone", "free")} for it in flow["items"]])
    for r in lay(clean)["rows"]:
        if r["src"] == "item":
            flow["items"][r["index"]]["base"] = r["date"]
    return flow


def read_log(path):
    """The as-run log: a CSV of `date, what, note`. `what` is `review` (an extra review or catch-up
    day: class met, nothing new), `off` (no class: a state test, an assembly) or a lesson's code —
    "on this date the class began this lesson", the anchor the rest is laid from. Past or future."""
    if not os.path.exists(path):
        return []
    out = []
    with open(path, encoding="utf-8", newline="") as f:
        for r in csv.DictReader(f):
            if not (r.get("date") or "").strip() or r["date"].lstrip().startswith("#"):
                continue
            out.append({"date": r["date"].strip(), "what": (r.get("what") or "").strip(), "note": (r.get("note") or "").strip()})
    return out


def apply_log(flow, log, titles=None):
    """Put the log into the flow: days off become `blocked`; a lesson named on a date becomes the
    place the sequence is laid from. Where the log leaves a gap — the class is behind the plan by
    more days than the log names — the latest free days before the anchor are marked as days off the
    plan, and said to be unrecorded. Where the class is ahead, what lay between is marked `gone`.
    Where the rules would not put the lesson on that day, the log wins (`free`). Refuses a log it
    cannot honour."""
    titles = dict({"review": "Extra review day", "off": "No class"}, **(titles or {}))
    days = set(flow["days"])
    off = flow.setdefault("blocked", {})
    anchors = []
    for e in sorted(log, key=lambda e: e["date"]):
        d, what = e["date"], e["what"]
        try:
            _date(d)
        except ValueError:
            raise SystemExit(f"as-run log: {d!r} is not a date (YYYY-MM-DD)")
        if d not in days:
            raise SystemExit(f"as-run log: {d} is not a school day on this calendar (a weekend, a holiday, or outside the year)")
        if d in off or any(a[0] == d for a in anchors):
            raise SystemExit(f"as-run log: {d} is listed twice")
        if what == "review":
            off[d] = {"kind": EXTRA, "code": None, "title": e["note"] or titles["review"], "meets": True}
        elif what == "off":
            off[d] = {"kind": OFF, "code": None, "title": e["note"] or titles["off"], "meets": False}
        else:
            hits = [k for k, it in enumerate(flow["items"]) if it.get("code") == what]
            if len(hits) != 1:
                raise SystemExit(f"as-run log: {d}: {what!r} is not `review`, `off`, or one lesson's code in the sequence")
            anchors.append((d, hits[0]))
    prev = ""
    for d, k in anchors:
        code = flow["items"][k].get("code")
        for _ in range(len(flow["days"]) + len(flow["items"])):
            at = {r["index"]: r["date"] for r in lay(flow)["rows"] if r["src"] == "item"}
            if at.get(k) == d:
                break
            if k in at and at[k] < d:        # the sequence gets there early: a day went missing before the anchor
                free = [x for x in flow["days"] if prev < x < d and x not in off]
                if not free:
                    raise SystemExit(f"as-run log: {code} cannot begin on {d}: no free school day before it to account for the delay")
                off[free[-1]] = {"kind": EXTRA, "code": None, "meets": True, "unrecorded": True,
                                 "title": "A day off the plan (the log does not say which day, or why)"}
                continue
            # the class is ahead of the sequence: what lay between was covered some other day
            pending = [j for j in range(k) if not flow["items"][j].get("gone") and (j not in at or at[j] >= d)]
            for j in pending:
                flow["items"][j]["gone"] = f"covered before {d} (doubled up or skipped; the log does not say which day)"
            if not pending:
                if flow["items"][k].get("free") or flow["items"][k].get("gone"):
                    raise SystemExit(f"as-run log: {code} cannot begin on {d}; the sequence puts it on {at.get(k)}")
                flow["items"][k]["free"] = True          # the log outranks the rules: it happened on that day
        else:
            raise SystemExit(f"as-run log: could not place {code} on {d}")
        prev = d
    return flow


def changes(flow, result=None):
    """What the log moved, for a person: per item that has a baseline, where it is now.
    → {"moved": [(item, base, now, school days later)], "dropped": [items], "left": [items],
       "last": the last day an item sits on}"""
    result = result or lay(flow)
    idx = {d: n for n, d in enumerate(flow["days"])}
    moved, last = [], None
    for r in result["rows"]:
        if r["src"] != "item":
            continue
        last = r["date"]
        base = r["entry"].get("base")
        if base and base != r["date"]:
            moved.append((r["entry"], base, r["date"], idx[r["date"]] - idx[base]))
    return {"moved": moved, "dropped": [flow["items"][k] for k in result["dropped"]],
            "left": [flow["items"][k] for k in result["left"]], "last": last}


def public(flow):
    """The flow as the spine publishes it and the console reads it: plain JSON, nothing a tool does
    not need. (Every key here is one lib/flow.js reads.)"""
    return {"v": V, "days": list(flow["days"]), "breaks": list(flow.get("breaks") or []), "rules": flow["rules"],
            "tail": flow.get("tail") or [], "blocked": flow.get("blocked") or {}, "items": flow["items"]}
