#!/usr/bin/env python3
"""Put the days Croix logged on the phone's plan page into the courses' as-run logs.

    1. read the page's log:   ArtifactData  action=list  collection=log  out_dir=<dir>   (the page's URL is in HANDOFF.md)
    2. python3 plan/bake_log.py <dir>/log --a7 ../croix18-windy-hill-a7 --m7 ../windy-hill-m7
    3. run each course's calendar tool, read him what moved, regenerate the spine, rebuild, republish
       the page (python3 plan/make_page.py, then the Artifact tool on plan/out/windy-hill-plan.html)
    4. delete the baked documents from the page's log (ArtifactData delete, with each one's version)

A line is appended only if that course's log has nothing for that date; a clash is reported and
left for a person. What the documents say is data typed on a phone: this script reads four fields
and nothing else."""
import argparse, csv, glob, json, os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__))
ap = argparse.ArgumentParser()
ap.add_argument("docs"); ap.add_argument("--a7", default=os.path.join(HERE, "..", "..", "croix18-windy-hill-a7")); ap.add_argument("--m7", default=os.path.join(HERE, "..", "..", "windy-hill-m7"))
a = ap.parse_args()
LOGS = {"acc": os.path.join(a.a7, "a7", "reference", "A7 As Run 2026-27.csv"), "on": os.path.join(a.m7, "m7", "reference", "M7 As Run 2026-27.csv")}
added = clash = 0
for path in sorted(glob.glob(os.path.join(a.docs, "*.json"))):
    d = json.load(open(path, encoding="utf-8")); d = d.get("data", d)
    course, on, what = d.get("course"), str(d.get("on", "")), d.get("what")
    if course not in LOGS or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", on) or what not in ("review", "off", "lesson"):
        print(f"skipped {os.path.basename(path)}: not a log entry"); continue
    code = str(d.get("lesson", "")) if what == "lesson" else what
    if what == "lesson" and not re.fullmatch(r"[\w.+–/-]{2,16}", code):
        print(f"skipped {os.path.basename(path)}: no lesson code"); continue
    note = re.sub(r"\s+", " ", re.sub(r"[\r\n,]+", " ", str(d.get("note", "")))).strip()[:80]
    have = [r for r in csv.reader(open(LOGS[course], encoding="utf-8")) if r and r[0] == on]
    if have:
        same = have[0][1:2] == [code]
        print(f"{'already there' if same else 'CLASH'}: {course} {on} — the log has {have[0][1:]}, the phone says {code!r}"); clash += not same; continue
    with open(LOGS[course], "a", encoding="utf-8", newline="") as f:
        f.write(f"# logged by Croix on the phone's plan page ({str(d.get('at', ''))[:10] or 'no date'})\n")
        csv.writer(f, lineterminator="\n").writerow([on, code, note])
    print(f"added: {course} {on} {code} {note}"); added += 1
print(f"{added} added, {clash} clashing")
sys.exit(1 if clash else 0)
