#!/usr/bin/env python3
"""Build each lesson of a unit (no PDFs) into a scratch folder and print the first thing the kit refuses in each.
For a wording pass (briefs/LEAN WORKFLOW.md): a refusal comes back in seconds, where build_all.py stops at the first.

    python3 try_build.py u7 [l01 l04 ...]      (run from the course's build folder, e.g. a7/build)"""
import os
import sys
import tempfile
import traceback

HERE = os.getcwd()
sys.path.insert(0, HERE)
from lib import lessonbuild, mathimg, unitload   # noqa: E402
mathimg.require_matplotlib()

import glob
unit = sys.argv[1]
names = sys.argv[2:] or sorted(os.path.basename(p)[:-3] for p in glob.glob(os.path.join(HERE, unit, "l*.py")))
bad = 0
for f in names:
    try:
        m = unitload.load(os.path.join(HERE, unit, f + ".py"), "lesson")
        with tempfile.TemporaryDirectory() as t:
            out = lessonbuild.build_lesson(m.L, t)
        print(f"{f}: ok ({len(out)} files)")
    except Exception as e:
        bad += 1
        tb = traceback.extract_tb(e.__traceback__)
        where = " < ".join(f"{os.path.basename(x.filename)}:{x.lineno} {x.name}" for x in tb[-3:])
        print(f"{f}: REFUSED — {str(e)[:420]}\n      at {where}")
sys.exit(1 if bad else 0)
