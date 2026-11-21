#!/usr/bin/env python3
"""A unit's papers alone (the Review, the Practice Test, their keys, the Reference Sheet) — no unit deck.
Run it from a build folder:   python3 /home/claude/lean/build_papers.py u7   → out/u7/*.docx and *.pdf"""
import os
import subprocess
import sys

sys.path.insert(0, os.getcwd())
from lib import unitload, unitbuild   # noqa: E402

unit = sys.argv[1]
U = unitload.load(f"{unit}/unit.py", "u").U
os.makedirs(f"out/{unit}", exist_ok=True)
out = unitbuild.build_unit(U, f"out/{unit}")
for k, p in out.items():
    subprocess.run(["soffice", "--headless", "--convert-to", "pdf", "--outdir", f"out/{unit}", p],
                   check=True, capture_output=True)
    print(k, p)
