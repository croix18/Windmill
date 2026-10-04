#!/usr/bin/env python3
"""Write the phone's plan page: plan/out/windy-hill-plan.html, from spine/spine.json.

    python3 plan/make_page.py        then publish plan/out/windy-hill-plan.html with the Artifact tool
                                     (the same artifact every time — its link is in HANDOFF.md)

The page is plan/page.html with four things put in: the DATA below, the engine (kit/lib/flow.js),
the log (plan/applylog.js) and the view (plan/pagecore.js). It shows each course's year as the
engine lays it, lets Croix log a day from his phone (a review day, a day with no class, "we began
this lesson") and lays the year again at once. What he logs is kept in the artifact's own database
(collection `log`), where a session reads it and puts it into the course's as-run CSV.
Nothing here names a student."""
import json, os, re
HERE = os.path.dirname(os.path.abspath(__file__))
S = json.load(open(os.path.join(HERE, "..", "spine", "spine.json"), encoding="utf-8"))
LABEL = {"on": ("M7", "Grade 7 Mathematics"), "acc": ("A7", "Grade 7 Accelerated")}
QUARTERS = [{"end": "2026-10-09", "name": "Q1"}, {"end": "2026-12-18", "name": "Q2"}, {"end": "2027-03-04", "name": "Q3"}, {"end": "2027-05-28", "name": "Q4"}]

courses = {}
for c in ("on", "acc"):
    detail = {}
    for d, day in sorted(S["days"].items()):
        e = day.get(c)
        if e and e.get("code") and e["code"] not in detail and (e["benchmarks"] or e["ixl"]):
            detail[e["code"]] = {"b": e["benchmarks"], "x": [[x["name"], x["code"]] for x in e["ixl"]]}
    courses[c] = {"label": LABEL[c][0], "name": LABEL[c][1], "smartscore": S["courses"][c]["smartscore"], "flow": S["flow"][c], "detail": detail}
DATA = {"generatedAt": S["generatedAt"], "built": S["generatedAt"][:10], "quarters": QUARTERS, "contentEnds": "2027-04-30",
        "holidays": S["holidays"], "courses": courses,
        "days": {d: {"week": v["week"], "wed": v["wednesday"]} for d, v in S["days"].items() if "holiday" not in v},
        # the due dates the spine holds, for plan/test_page.py only (the page works them out itself)
        }
read = lambda *p: open(os.path.join(HERE, *p), encoding="utf-8").read()
js = lambda s: s.replace("</script", "<\\/script")
page = read("page.html")
for mark, text in (("/*DATA*/", "window.PLAN = " + json.dumps(DATA, ensure_ascii=False, separators=(",", ":")) + ";"),
                   ("/*FLOW*/", read("..", "kit", "lib", "flow.js")), ("/*APPLYLOG*/", read("applylog.js")), ("/*CORE*/", read("pagecore.js"))):
    assert page.count(mark) == 1, mark
    page = page.replace(mark, js(text))
os.makedirs(os.path.join(HERE, "out"), exist_ok=True)
out = os.path.join(HERE, "out", "windy-hill-plan.html")
open(out, "w", encoding="utf-8").write(page)
json.dump(DATA, open(os.path.join(HERE, "out", "data.json"), "w", encoding="utf-8"), ensure_ascii=False)
print(f"wrote {os.path.relpath(out)}: {len(page) // 1024} KB, plan built {DATA['built']}, "
      + ", ".join(f"{v['label']} {len(v['flow']['items'])} items" for v in courses.values()))
