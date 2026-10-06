#!/usr/bin/env python3
"""A two-minute rehearsal of a fifteen-minute build.

    python3 tools/dry_run.py <course build dir> <unit> [<unit> …] [--vendored] [--keep DIR]

    python3 tools/dry_run.py /root/m7/m7/build u4 u5
    python3 tools/dry_run.py /root/windy-hill/a7/build u3 u4

For every lesson spec of the units named it runs EVERY gate `build_lesson` runs (units, mathcheck,
distractorcheck, capcheck, rulingcheck, balancecheck, stepcheck), lays the lesson out as a
PowerPoint exactly as the build would (so "cannot hold its steps", "a line of this figure runs
through its label" and "line runs off the slide" all show), builds each unit's whole-unit deck
the way `build_unit.py` does (the unit balance check with it), and reads every PowerPoint with
the real `checks.check_glyph`: every run in a face Google Slides has, every sign in a face that
carries it, nothing italic.

Where a course still builds HTML (`HTML = True` in its course.py — neither does since ruling 41)
it also lays each lesson out as an HTML deck, builds the unit console, and opens them all in a
browser with the real `checks.check_html`.

It needs no LibreOffice and writes nothing into the course: decks and images go to a scratch
folder (`--keep DIR` to look at them afterwards). By default it uses the kit AS IT STANDS IN THIS
REPOSITORY, so a kit change is rehearsed before it is vendored; `--vendored` uses the course's own
copy instead.

Why this exists (5 October 2026): three full rebuilds were lost in one morning to refusals that
only showed at the end of the build — `capcheck` reading the scientific-notation rule into
`steps`, the HTML check finding the pi face's line metrics, KaTeX's multiplication dot coming from
the wrong font. Each would have shown here in two minutes. What it does NOT cover: anything read
off the rendered PDFs (slidefit, overlap, footer, pages, glyph's PDF fonts) and the unit papers.
Run it before `build_all.py`, not instead of it.
"""
import glob, importlib.util, os, sys, tempfile, time

args = [a for a in sys.argv[1:] if not a.startswith("--")]
flags = [a for a in sys.argv[1:] if a.startswith("--")]
if len(args) < 2:
    sys.exit(__doc__)
keep = None
if "--keep" in sys.argv:
    keep = sys.argv[sys.argv.index("--keep") + 1]
    args = [a for a in args if a != keep]
build, units = os.path.abspath(args[0]), args[1:]
HERE = os.path.dirname(os.path.abspath(__file__))
kit = build if "--vendored" in flags else os.path.normpath(os.path.join(HERE, "..", "kit"))
os.environ["KIT_COURSE"] = os.path.join(build, "course.py")
os.environ.setdefault("KIT_SPINE", os.path.join(build, "assets", "windmill", "spine.json")
                      if os.path.exists(os.path.join(build, "assets", "windmill", "spine.json"))
                      else os.path.normpath(os.path.join(HERE, "..", "spine", "spine.json")))
sys.path.insert(0, kit)
from lib import lessonbuild as lb, slotmark, deckkit, figkit, mathimg, htmlkit, consolekit   # noqa: E402
from lib.profile import C                                                                    # noqa: E402

out = keep or tempfile.mkdtemp(prefix="dryrun_")
os.makedirs(out, exist_ok=True)
# nothing is drawn into the course: its figure and expression libraries are fingerprinted and checked
figkit.FIGS = os.path.join(out, "figs"); figkit.INDEX = os.path.join(figkit.FIGS, "figindex.json")
mathimg.FIGS = os.path.join(out, "math"); mathimg.INDEX = os.path.join(mathimg.FIGS, "index.json")
os.makedirs(figkit.FIGS, exist_ok=True); os.makedirs(mathimg.FIGS, exist_ok=True)
consolekit.WM = os.path.join(build, "assets", "windmill")


def load(path):
    sys.path.insert(0, os.path.dirname(path))
    try:
        sp = importlib.util.spec_from_file_location("dry_spec", path)
        m = importlib.util.module_from_spec(sp); sp.loader.exec_module(m)
        return m.L
    finally:
        sys.path.pop(0)


print(f"dry run of {C.COURSE} {' '.join(units)} with the kit in {kit}")
bad = 0; decks = []; pptx = []
for u in units:
    unit_lessons = []
    specs = sorted(glob.glob(os.path.join(build, u, "l[0-9]*.py")))
    rv = os.path.join(build, u, "review.py")
    if C.REVIEW_IN_DECK and os.path.exists(rv):
        specs.append(rv)
    if not specs:
        print(f"  {u}: no lesson specs in {os.path.join(build, u)}"); bad += 1
    for f in specs:
        t0 = time.time(); found = []
        try:
            L = load(f)
        except Exception as e:
            print(f"  {u}/{os.path.basename(f)}: the spec does not load — {str(e)[:300]}"); bad += 1; continue
        P = slotmark.strip_deep(L)
        try:
            figkit.units_agree(P)
            found += lb.mathcheck_lesson(P)[0] + lb.distractorcheck_lesson(P) + lb.capcheck_lesson(P) \
                + lb.rulingcheck_lesson(P) + lb.balancecheck_lesson(P)
            st, have, total, eqs = lb.stepcheck_lesson(P)
            found += st
        except Exception as e:
            have = total = eqs = 0
            found.append(f"a gate stopped: {str(e)[:400]}")
        stem = f"{u}_{os.path.basename(f)[:-3]}"
        try:
            D = deckkit.Deck(C.COURSE, L["unit"], "Lesson", L["title"], "dry run"); lb._fill_deck(D, L)
            D.save(os.path.join(out, stem + ".pptx"), sidecar=False)
            unit_lessons.append(L); pptx.append(os.path.join(out, stem + ".pptx"))
        except (Exception, SystemExit) as e:
            found.append(f"PowerPoint: {str(e)[:400]}")
        if C.HTML:
            try:
                H = htmlkit.HtmlDeck(C.COURSE, L["unit"], "Lesson", L["title"], "dry run"); lb._fill_deck(H, L)
                H.save(os.path.join(out, stem + ".html")); decks.append(os.path.join(out, stem + ".html"))
            except (Exception, SystemExit) as e:
                found.append(f"HTML deck: {str(e)[:400]}")
        bad += len(found)
        print(f"  {L.get('code', stem):6} {have} of {total} answer slides with steps, {eqs} equalities worked, {len(found)} findings   [{time.time() - t0:.0f} s]", flush=True)
        for x in found:
            print("       " + x)
    # the whole-unit deck (and, where the course builds HTML, its console), by the build's own
    # function (a console made from one lesson has no lesson index, and its Today screen then fails
    # at some hours of the day and not at others — which is how this tool first reported a fault
    # that was its own, 5 October)
    if unit_lessons:
        try:
            n = unit_lessons[0]["unit"]
            rows = [("Review" if L.get("review") else L["code"], L["title"]) for L in unit_lessons]
            udir = os.path.join(out, u + "_unit"); os.makedirs(udir, exist_ok=True)
            lb.build_unit_deck(unit_lessons, rows, {"unit": n, "title": getattr(C, "UNITS", {}).get(n, f"Unit {n}")}, udir)
            decks += glob.glob(os.path.join(udir, "*.html")); pptx += glob.glob(os.path.join(udir, "*.pptx"))
            print(f"  {u}: whole-unit deck built ({len(unit_lessons)} lessons)" + (", and its console" if C.HTML else ""), flush=True)
        except (Exception, SystemExit) as e:
            print(f"  {u}: the whole-unit deck could not be built — {str(e)[:400]}"); bad += 1

import checks                                                    # noqa: E402
found = list(checks.check_glyph(pptx)) if pptx else []
if C.HTML and decks:
    found += list(checks.check_html(decks))
bad += len(found)
for x in found:
    print("   " + x)

print(f"dry run: {bad} findings" + (f"; decks kept in {out}" if keep else ""))
sys.exit(1 if bad else 0)
