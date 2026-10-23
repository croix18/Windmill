"""The IXL plan, read from the spine the course vendors (assets/windmill/spine.js).

Ruling 28: every skill IXL lists for a lesson is assigned, nothing more is new, and the code printed
beside a skill is what a student types into IXL's search. The plan has one home per course (A7's
`ixl_skills_by_lesson.json`, M7's `tools/mkscope.py`), Windmill's spine is the view of both, and the
due-date sheets students are handed are generated from the same place — so a slide that names a
skill the plan does not, or a code the plan does not, sends a student to the wrong skill or to none.
M7's Unit 5 shipped that way on 20 September (seven codes that exist nowhere; six lessons whose
skills were not the plan's), found on 4 October when this check was written.

    check(L)  ->  findings, each beginning with the lesson's code

The rules, as facts about the spec:
  1. every entry is `Name (CODE)` or `Name — CODE`;
  2. the code is in the plan, for this course, and the name beside it is the plan's name for it;
  3. a lesson the plan lists skills for names exactly those skills (order is the spec's);
  4. a lesson the plan lists nothing for — a carry-over day, a thread day, a review — assigns
     nothing the plan does not know: rule 2 is the whole test;
  5. a day taught from more than one deck — lessons of a built unit merged into one day afterwards,
     each keeping its own deck (ruling 50: M7's 9.06 and 9.07 on Thu 29 Oct 2026) — is held as one:
     each deck names only skills the plan lists for the day, and between them the decks name every
     one of them. A merged day taught from one deck (ruling 36, a merge made before the unit was
     built: A7's 3.06 is "Lessons 6–7") is rule 3, as before. The unit's decks are its specs beside
     the kit (uN/lNN.py), known by the code each one names — a file's number is not its lesson's
     (A7's u3/l07.py is the thread day 3.T1);
  6. a lesson the plan no longer gives a day — the course's flow marks it `gone`, the as-run log
     having moved past it (A7's 4.07+08 on 23 Oct 2026: a study-guide day and a relationship-building
     day, then the exam) — assigns nothing, and the plan knows its skills only where another day
     assigns them: a code the plan dropped with the lesson is no finding. Rule 1 still holds, and so
     does rule 2 wherever the plan knows the skill (a name the plan lists under another code).
"""
import os, re, json, glob, sys, importlib.util
from .profile import C

# (a spec's `plan_code` is also what the console uses to open the plan's lesson for the day)
HERE = os.path.dirname(os.path.abspath(__file__))
SPINE_JS = os.path.normpath(os.path.join(HERE, "..", "assets", "windmill", "spine.js"))
UNITS = os.path.normpath(os.path.join(HERE, ".."))          # the kit's root: gates.py and the uN/ folders
_ENTRY = re.compile(r"^(.*?)(?: — ([0-9A-Z]{2,4})| \(([0-9A-Z]{2,4})\))$")
_cache, _decks, _deck_ixl = {}, {}, {}


def parse(entry):
    """('Area of circles', 'YA8') from either course's spelling, or None."""
    m = _ENTRY.match(entry.strip())
    return (m.group(1).strip(), m.group(2) or m.group(3)) if m else None


def spine():
    """The plan: KIT_SPINE names a spine.json (the kit's own tests); a course reads its vendored copy."""
    path = os.environ.get("KIT_SPINE") or SPINE_JS
    if path not in _cache:
        if not os.path.exists(path):
            _cache[path] = None
        else:
            txt = open(path, encoding="utf-8").read().strip()
            if txt.startswith("window.SPINE"):
                txt = txt[txt.index("=") + 1:].strip().rstrip(";")
            _cache[path] = json.loads(txt)
    return _cache[path]


def members(day):
    """The lessons a plan day teaches: '9.06+07' → ['9.06', '9.07']; '4.05' → ['4.05']; 'T-A1' → ['T-A1']."""
    m = re.match(r"^(\d+)\.(\d+)((?:\+\d+)*)$", day or "")
    if not m:
        return [day] if day else []
    u, first, rest = m.groups()
    return [f"{u}.{first}"] + [f"{u}.{int(n):0{len(first)}d}" for n in rest.split("+")[1:]]


def days_for(code, S=None, plan_code=None):
    """[(day code, {(name, code)})] for the plan days that teach a lesson: its own code, the code a
    spec names as its `plan_code` (a thread day is 3.T1 in its file names and T-A1 in the plan), or
    a merged day it is one of ('4.02+03' teaches 4.02 and 4.03)."""
    S = S or spine()
    out = []
    for day in S["days"].values():
        o = (day or {}).get(C.COURSE_KEY)
        c = o and o.get("code")
        if c and (c in (code, plan_code) or code in members(c)):
            out.append((c, {(i["name"], i["code"]) for i in o.get("ixl", [])}))
    return out


def plan_for(code, S=None, plan_code=None):
    """{(name, code)} the plan lists for a lesson's days."""
    out = set()
    for _, sk in days_for(code, S, plan_code):
        out |= sk
    return out


def gone(code, S=None, plan_code=None):
    """Why the plan no longer gives a lesson a day (its flow item's `gone`), or None (rule 6)."""
    S = S or spine()
    for it in (((S.get("flow") or {}).get(C.COURSE_KEY) or {}).get("items") or []):
        c = it.get("code") or ""
        if it.get("gone") and (c in (code, plan_code) or code in members(c)):
            return it["gone"]
    return None


def decks(unit):
    """{lesson code: spec path} for a unit's lesson specs beside the kit, each known by the `code=`
    it names (KIT_UNITS names another folder of uN/ units: the kit's own tests)."""
    root = os.environ.get("KIT_UNITS") or UNITS
    key = (root, str(unit))
    if key not in _decks:
        out = {}
        for p in sorted(glob.glob(os.path.join(root, f"u{unit}", "l[0-9][0-9].py"))):
            m = re.search(r'^\s*code="([^"]+)"', open(p, encoding="utf-8").read(), re.M)
            if m:
                out[m.group(1)] = p
        _decks[key] = out
    return _decks[key]


def deck_ixl(path):
    """{(name, code)} a spec's IXL slide names, the spec run the way gates.py runs it."""
    if path not in _deck_ixl:
        from . import slotmark
        sys.path.insert(0, os.path.dirname(path))          # a spec may import its unit's figs.py
        try:
            sp = importlib.util.spec_from_file_location("ixlplan_deck", path)
            m = importlib.util.module_from_spec(sp); sp.loader.exec_module(m)
        finally:
            sys.path.pop(0)
        _deck_ixl[path] = {p for p in (parse(slotmark.strip(e)) for e in m.L.get("ixl", [])) if p}
    return _deck_ixl[path]


def check(L):
    code = L["code"]
    S = spine()
    if S is None:
        return [f"{code}: ruling 28 — no IXL plan to read ({os.path.relpath(SPINE_JS)} is missing; run tools/vendor_windmill.py)"]
    skills, out, listed = S["skills"], [], set()
    why_gone = gone(code, S, L.get("plan_code"))
    for entry in L.get("ixl", []):
        p = parse(entry)
        if not p:
            out.append(f"{code}: ruling 28 — IXL entry {entry!r} is not `Name (CODE)` or `Name — CODE`")
            continue
        name, c = p
        listed.add(p)
        known = skills.get(c)
        if not known or C.COURSE_KEY not in known["courses"]:
            same = sorted(k for k, v in skills.items() if v["name"] == name and C.COURSE_KEY in v["courses"])
            if why_gone and not same:                      # rule 6: the plan dropped the lesson, and its skills with it
                continue
            out.append(f"{code}: ruling 28 — IXL code {c} is not in this course's IXL plan"
                       + (f"; the plan's code for {name!r} is {same[0]}" if same else f", and neither is a skill named {name!r}"))
        elif known["name"] != name:
            out.append(f"{code}: ruling 28 — IXL code {c} is {known['name']!r} in the plan, not {name!r}")
    if out:
        return out
    days = days_for(code, S, L.get("plan_code"))
    mine = decks(L.get("unit")) if L.get("unit") is not None else {}
    shared = [(day, sk, [m for m in members(day) if m != code and m in mine]) for day, sk in days]
    shared = [x for x in shared if x[2]]
    if shared:                                             # rule 5: the day is taught from several decks
        for day, plan, others in shared:
            for name, c in sorted(listed - plan):
                out.append(f"{code}: ruling 28 — the slide assigns {name} ({c}), which the plan does not list for "
                           f"{day}, the day this deck shares with {', '.join(others)} (the due-date sheet will not carry it)")
            if next((m for m in members(day) if m == code or m in mine), code) == code:   # said once, by the day's first deck
                theirs = set()
                for o in others:
                    try:
                        theirs |= deck_ixl(mine[o])
                    except Exception as e:                 # a deck that does not run cannot hold its share
                        out.append(f"{code}: ruling 28 — could not read {o}'s spec to hold {day}'s IXL: {e}")
                for name, c in sorted(plan - listed - theirs):
                    out.append(f"{code}: ruling 28 — the plan lists {name} ({c}) for {day} and none of its decks "
                               f"({', '.join([code] + others)}) assigns it")
        return out
    plan = set()
    for _, sk in days:
        plan |= sk
    if plan:
        for name, c in sorted(plan - listed):
            out.append(f"{code}: ruling 28 — the plan lists {name} ({c}) for this lesson and the slide does not")
        for name, c in sorted(listed - plan):
            out.append(f"{code}: ruling 28 — the slide assigns {name} ({c}), which the plan does not list for this lesson "
                       f"(the due-date sheet will not carry it)")
    return out
