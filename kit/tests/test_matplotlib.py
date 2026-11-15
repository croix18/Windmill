#!/usr/bin/env python3
"""What matplotlib hands the kit back, held on ANY matplotlib — not only the series the kit draws with
(lib/mathimg.py MATPLOTLIB). test_kit.py runs these with the rest; Windmill's GitHub check also runs this file alone
on the newest matplotlib, so a change in the shape of what a parse returns is seen the day it ships:

    KIT_COURSE=kit/tests/course_on.py python3 kit/tests/test_matplotlib.py

matplotlib 3.11 (15 Nov 2026): a mathtext parse's glyph was (font, size, char, ox, oy) and is now (font, size, char,
glyph index, ox, oy). _paint crashed on it, and _slot_colors and named_colors read the index as x and x as the baseline —
slot colors gone wrong without a word. mathimg.parse normalizes once; every reader reads the normalized glyphs.
"""
import os, sys, tempfile
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.normpath(os.path.join(HERE, "..")))
os.environ.setdefault("KIT_SPINE", os.path.normpath(os.path.join(HERE, "..", "..", "spine", "spine.json")))
import matplotlib
from lib import slotmark
from lib import mathimg


def _ink(path):
    from PIL import Image
    b = Image.open(path).convert("RGBA").tobytes()
    return {tuple(b[i:i + 3]) for i in range(0, len(b), 4) if b[i + 3] == 255}


def run(ok):
    mi = mathimg
    f = object()
    ok("matplotlib 3.11: the glyph normalizer reads both shapes (3.10's five fields and 3.11's six) the same",
       mi.norm_glyphs([(f, 12.0, 55, 3.5, 7.25), (f, 12.0, 55, 991, 3.5, 7.25)]) == [(f, 12.0, 55, 3.5, 7.25)] * 2)
    r = mi.parse("$10^{3}$", dpi=72, prop=mi._prop(32, None))
    c = mi._slot_colors(r.glyphs, 32)
    got = [(chr(g[2]), k) for g, k in zip(r.glyphs, c)]
    ok("matplotlib 3.11: a colored slot lands on the right glyphs — both digits of the base 10 blue, the exponent orange",
       got == [("1", mi.CB1), ("0", mi.CB1), ("3", mi.CB2)], str(got))
    rn, cn, rcn = mi.named_colors(r"\sA{7\frac{1}{2}} + \sB{9}", 32, dpi=72)
    got = [(chr(g[2]), k) for g, k in zip(rn.glyphs, cn)]
    ok("matplotlib 3.11: a named slot colors its glyphs and the fraction bar inside it, and nothing else",
       got == [("7", slotmark.SLOT["A"]), ("1", slotmark.SLOT["A"]), ("2", slotmark.SLOT["A"]), ("+", mi.SLOT_INK), ("9", slotmark.SLOT["B"])]
       and rcn == [slotmark.SLOT["A"]], f"{got} {rcn}")
    with tempfile.TemporaryDirectory() as tmp:
        p = os.path.join(tmp, "n.png")
        mi._render_named(r"\sA{7\frac{1}{2}} + \sB{9}", 32, p)
        px = _ink(p)
    ok("matplotlib 3.11: a named expression paints (the glyphs unpack) in its slot colors",
       (0x1E, 0x5A, 0xA8) in px and (0xC0, 0x5A, 0x00) in px)
    # the supported series, stated once: a build driver on another stops and says what to install
    real = matplotlib.__version__
    try:
        matplotlib.__version__ = mi.MATPLOTLIB + ".9"
        same = mi.matplotlib_ok() and mi.matplotlib_note() is None
        matplotlib.__version__ = "9.0.0"
        note = mi.matplotlib_note() or ""
        env = os.environ.pop("KIT_ANY_MATPLOTLIB", None)
        try:
            mi.require_matplotlib(); stopped = ""
        except SystemExit as e:
            stopped = str(e)
        finally:
            if env is not None:
                os.environ["KIT_ANY_MATPLOTLIB"] = env
    finally:
        matplotlib.__version__ = real
    ok("matplotlib: on another series a build stops, naming what is installed and what to install",
       same and "9.0.0" in stopped and f'pip install "matplotlib=={mi.MATPLOTLIB}.*"' in stopped and stopped == note,
       stopped or "it did not stop")


if __name__ == "__main__":
    fails = []; n = [0]

    def ok(name, cond, detail=""):
        n[0] += 1
        if not cond:
            fails.append(f"{name}  {detail}")
        print(("  ok   " if cond else "  FAIL ") + name)
    run(ok)
    print(f"\nmatplotlib tests under matplotlib {matplotlib.__version__} (the kit draws with {mathimg.MATPLOTLIB}): {n[0] - len(fails)} of {n[0]} passed")
    for f in fails:
        print("  FAILED", f)
    sys.exit(1 if fails else 0)
