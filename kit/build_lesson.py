#!/usr/bin/env python3
"""Build one lesson: python3 build_lesson.py u3/l01.py  → out/u3/
(Part of the shared build kit — edit it in croix18/Windmill, kit/.)"""
import sys, os, glob, importlib.util, subprocess
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from lib import lessonbuild, names
src = os.path.abspath(sys.argv[1])
sys.path.insert(0, os.path.dirname(src))            # a unit's own figs.py sits beside its specs
spec = importlib.util.spec_from_file_location("lesson", src)
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
unit = os.path.basename(os.path.dirname(src))
outdir = os.path.join(HERE, "out", unit)
for stale in glob.glob(os.path.join(glob.escape(outdir), names.stale_glob(m.L))):
    os.remove(stale)          # a failed build must not leave yesterday's files for checks.py
out = lessonbuild.build_lesson(m.L, outdir)
# every document gets its PDF twin, each converted by its own command (§0: rebuild each file alone)
for k, path in out.items():
    if path.endswith(".html"):          # the HTML deck is its own final form (prints from the browser)
        print("built", os.path.basename(path)); continue
    subprocess.run(["soffice", "--headless", "--convert-to", "pdf", "--outdir", outdir, path],
                   check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    pdf = path.rsplit(".", 1)[0] + ".pdf"
    assert os.path.exists(pdf), pdf
    print("built", os.path.basename(path), "+ pdf")
