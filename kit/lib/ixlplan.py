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
     nothing the plan does not know: rule 2 is the whole test.
"""
import os, re, json
from .profile import C

HERE = os.path.dirname(os.path.abspath(__file__))
SPINE_JS = os.path.normpath(os.path.join(HERE, "..", "assets", "windmill", "spine.js"))
_ENTRY = re.compile(r"^(.*?)(?: — ([0-9A-Z]{2,4})| \(([0-9A-Z]{2,4})\))$")
_cache = {}


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


def plan_for(code, S=None):
    """{(name, code)} the plan lists for a lesson. A merged day's plan code is '4.02+03'; the spec
    that teaches it is 4.02."""
    S = S or spine()
    out = set()
    for day in S["days"].values():
        o = (day or {}).get(C.COURSE_KEY)
        if o and o.get("code") and (o["code"] == code or o["code"].startswith(code + "+")):
            out |= {(i["name"], i["code"]) for i in o.get("ixl", [])}
    return out


def check(L):
    code = L["code"]
    S = spine()
    if S is None:
        return [f"{code}: ruling 28 — no IXL plan to read ({os.path.relpath(SPINE_JS)} is missing; run tools/vendor_windmill.py)"]
    skills, out, listed = S["skills"], [], set()
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
            out.append(f"{code}: ruling 28 — IXL code {c} is not in this course's IXL plan"
                       + (f"; the plan's code for {name!r} is {same[0]}" if same else f", and neither is a skill named {name!r}"))
        elif known["name"] != name:
            out.append(f"{code}: ruling 28 — IXL code {c} is {known['name']!r} in the plan, not {name!r}")
    plan = plan_for(code, S)
    if plan and not out:
        for name, c in sorted(plan - listed):
            out.append(f"{code}: ruling 28 — the plan lists {name} ({c}) for this lesson and the slide does not")
        for name, c in sorted(listed - plan):
            out.append(f"{code}: ruling 28 — the slide assigns {name} ({c}), which the plan does not list for this lesson "
                       f"(the due-date sheet will not carry it)")
    return out
