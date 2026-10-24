#!/usr/bin/env python3
"""The slides as web pages, for mrshaffer.org — one self-contained HTML file per lesson of a built unit.
    python3 web_decks.py <outdir> [u4 u5 …]      every unit folder beside this file when none is named

Croix, 24 Oct 2026: "Can you also create the slides as html … I'd like the html slides to be uploaded to the website and
have the calendar link to the days slides." Ruling 41 (5 Oct) retired the HTML deck from the package — a deck is its
Slides file, run as Google Slides in Deckhand — and that stands: this writes nothing into out/ or the package, and
course.py's HTML stays False. It builds the same HtmlDeck (lib/htmlkit, the same slides as the .pptx, KaTeX math) for
the website alone.

Each file is named by the plan's code for the day the lesson is taught, with '+' as '-': 9.06+07 → `9.06-07.html`,
a thread day's `plan_code` (T-A1 → `T-A1.html`), a review day `9.R.html`. The site's calendar links a day to the file
of its code, so a merged day's one deck (ruling 36, ruling 50) is found under the day's own code. The plan is the
course's vendored spine (assets/windmill/spine.js); a lesson no day teaches is written under its own code.
(Part of the shared build kit — edit it in croix18/Windmill, kit/.)"""
import os, re, sys, glob, json, importlib.util
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from lib.profile import C
from lib import lessonbuild as lb


def load(path, name):
    sys.path.insert(0, os.path.dirname(path))
    try:
        sp = importlib.util.spec_from_file_location(name, path)
        m = importlib.util.module_from_spec(sp); sp.loader.exec_module(m)
    finally:
        sys.path.pop(0)
    return m


def plan_days():
    """{lesson code: the plan's day code} for this course, from the vendored spine ('9.06+07' holds 9.06 and 9.07)."""
    p = os.path.join(HERE, "assets", "windmill", "spine.js")
    if not os.path.exists(p):
        return {}
    txt = open(p, encoding="utf-8").read().strip()
    if txt.startswith("window.SPINE"):
        txt = txt[txt.index("=") + 1:].strip().rstrip(";")
    S = json.loads(txt); out = {}
    for day in S["days"].values():
        o = (day or {}).get(C.COURSE_KEY)
        c = o and o.get("code")
        if not c:
            continue
        m = re.match(r"^(\d+)\.(\d+)((?:\+\d+)*)$", c)
        members = [c] if not m else [f"{m.group(1)}.{m.group(2)}"] + [f"{m.group(1)}.{int(n):0{len(m.group(2))}d}" for n in m.group(3).split("+")[1:]]
        for k in members:
            out.setdefault(k, c)
    return out


def slug(code):
    return re.sub(r"[^A-Za-z0-9.\-]", "-", code.replace("+", "-"))


def build(unit, outdir, days):
    specs = sorted(glob.glob(os.path.join(HERE, unit, "l[0-9][0-9].py")))
    review = os.path.join(HERE, unit, "review.py")
    if C.REVIEW_IN_DECK and os.path.exists(review):
        specs.append(review)
    written = []
    for f in specs:
        L = load(f, "l").L
        code = L.get("plan_code") or days.get(L["code"]) or L["code"]
        tmp = os.path.join(outdir, "_build")
        os.makedirs(tmp, exist_ok=True)
        p = lb.build_html_deck(L, tmp)                       # the deck honours the colour slots itself (htmlkit)
        dest = os.path.join(outdir, slug(code) + ".html")
        os.replace(p, dest); written.append((code, L["title"], dest))
    try:
        os.rmdir(os.path.join(outdir, "_build"))
    except OSError:
        pass
    return written


if __name__ == "__main__":
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    outdir = os.path.abspath(sys.argv[1]); os.makedirs(outdir, exist_ok=True)
    units = sys.argv[2:] or sorted(os.path.basename(d) for d in glob.glob(os.path.join(HERE, "u[0-9]*")) if os.path.isdir(d))
    days = plan_days()
    for u in units:
        for code, title, dest in build(u, outdir, days):
            print(f"{C.PREFIX} {code}: {os.path.basename(dest)} ({os.path.getsize(dest) // 1024} KB) — {title}")
