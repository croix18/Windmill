#!/usr/bin/env python3
"""Build the unit-wide documents and the whole-unit deck: python3 build_unit.py u3/unit.py  → out/u3/

The deck's order is the unit's manifest.py when it has one (teaching order, with each row's printed
label and title), and otherwise the lesson specs in file order; where the course builds its review
day as a lesson (uN/review.py), the review closes the deck.
(Part of the shared build kit — edit it in croix18/Windmill, kit/.)"""
import sys, os, glob, importlib.util, subprocess
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from lib import unitbuild, lessonbuild
from lib.profile import C


def load(path, name):
    spec = importlib.util.spec_from_file_location(name, path)
    m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
    return m


src = os.path.abspath(sys.argv[1])
here = os.path.dirname(src)
sys.path.insert(0, here)                            # a unit's own figs.py sits beside its specs
m = load(src, "unit")
unit = os.path.basename(here)
outdir = os.path.join(HERE, "out", unit)
out = unitbuild.build_unit(m.U, outdir)
# the whole unit as one deck
specs = {}
for f in sorted(glob.glob(os.path.join(here, "l[0-9]*.py"))):
    L = load(f, "lesson").L
    specs[L["code"]] = L
man = os.path.join(here, "manifest.py")
if os.path.exists(man):
    order = load(man, "manifest").M["lessons"]
    missing = set(specs) ^ {row[0] for row in order}
    if missing:
        raise SystemExit(f"unit deck: lesson specs and manifest disagree about {sorted(missing)}")
    lessons = [specs[row[0]] for row in order]
    rows = [(row[1], row[2]) for row in order]
else:
    lessons = [specs[c] for c in sorted(specs)]
    rows = [(L["code"], L["title"]) for L in lessons]
review = os.path.join(here, "review.py")
if C.REVIEW_IN_DECK and os.path.exists(review):
    R = load(review, "review").L
    lessons.append(R); rows.append(("Review", R["title"]))
out["unit_deck"] = lessonbuild.build_unit_deck(lessons, rows, m.U, outdir)
for k, path in out.items():
    if path.endswith(".html"):          # the HTML deck is its own final form (prints from the browser)
        print("built", os.path.basename(path)); continue
    subprocess.run(["soffice", "--headless", "--convert-to", "pdf", "--outdir", outdir, path],
                   check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    pdf = path.rsplit(".", 1)[0] + ".pdf"
    assert os.path.exists(pdf), pdf
    print("built", os.path.basename(path), "+ pdf")
