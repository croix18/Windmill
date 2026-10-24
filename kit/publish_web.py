#!/usr/bin/env python3
"""Publish this course to mrshaffer.org's repository: the slides as web pages, the practice tests, the teacher copies and
the units' teacher documents. The site's own build (tools/build.mjs there) makes the pages from these.
    python3 publish_web.py --site ../../../mrshaffer-site [u4 u9 …]      every built unit when none is named

    <site>/slides/<course>/<day code>.html            web_decks.py: one page per lesson, named by the plan's day
    <site>/practice/<course>/<Course> Unit N Practice Test.html           the student page (practice/uN/)
    <site>/teacher/<course>/<Course> Unit N Teacher Copy.html             the teacher copy (practice/uN/teacher/)
    <site>/teacher/units/<course>/unit-N/<the All in One PDFs>            Teacher Editions, Lesson Plans, Keys, Assessments

A unit is "built" when build/uN/ has lesson specs and the package folder exists. Files the site already holds are
compared byte for byte and rewritten only when they differ, so a git status in the site repository shows what moved.
(Part of the shared build kit — edit it in croix18/Windmill, kit/.)"""
import os, re, sys, glob, shutil, filecmp, subprocess
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from lib.profile import C
from lib import packkit

COURSE_DIR = os.path.dirname(HERE)                   # m7/ or a7/
KEY = os.path.basename(COURSE_DIR)                    # "m7" / "a7": the site's folder names
PACKAGES = os.path.join(COURSE_DIR, "packages")
PRACTICE = os.path.join(COURSE_DIR, "practice")
ALL_IN_ONE = ("All Teacher Editions", "All Lesson Plans", "All Keys", "All Assessments")


def put(src, dst):
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    if os.path.exists(dst) and filecmp.cmp(src, dst, shallow=False):
        return "same"
    shutil.copyfile(src, dst); return "written"


def main():
    args = sys.argv[1:]
    if "--site" not in args:
        raise SystemExit(__doc__)
    k = args.index("--site"); site = os.path.abspath(args[k + 1]); del args[k:k + 2]
    if not os.path.isdir(os.path.join(site, "public")):
        raise SystemExit(f"publish_web: {site} is not the site repository (no public/)")
    units = args or sorted(os.path.basename(d) for d in glob.glob(os.path.join(HERE, "u[0-9]*")) if os.path.isdir(d))
    counts = {"same": 0, "written": 0}
    # the slides
    slides = os.path.join(site, "slides", KEY)
    tmp = os.path.join(HERE, "out", "_web"); shutil.rmtree(tmp, ignore_errors=True)
    r = subprocess.run([sys.executable, os.path.join(HERE, "web_decks.py"), tmp] + units, capture_output=True, text=True)
    if r.returncode:
        sys.exit("publish_web: web_decks.py failed\n" + r.stdout + r.stderr)
    for f in sorted(glob.glob(os.path.join(tmp, "*.html"))):
        counts[put(f, os.path.join(slides, os.path.basename(f)))] += 1
    shutil.rmtree(tmp, ignore_errors=True)
    # the practice tests, the teacher copies, the teacher documents
    for u in units:
        n = int(u[1:])
        for f in glob.glob(os.path.join(PRACTICE, u, f"{C.PREFIX} Unit {n} Practice Test.html")):
            counts[put(f, os.path.join(site, "practice", KEY, os.path.basename(f)))] += 1
        for f in glob.glob(os.path.join(PRACTICE, u, "teacher", f"{C.PREFIX} Unit {n} Teacher Copy.html")):
            counts[put(f, os.path.join(site, "teacher", KEY, os.path.basename(f)))] += 1
        pkg = os.path.join(PACKAGES, packkit.package_folder(n), "All in One")
        if os.path.isdir(pkg):
            for f in sorted(glob.glob(os.path.join(pkg, "*.pdf"))):
                if any(f.endswith(f" - {a}.pdf") for a in ALL_IN_ONE):
                    counts[put(f, os.path.join(site, "teacher", "units", KEY, f"unit-{n}", os.path.basename(f)))] += 1
    print(f"{C.PREFIX} → {site}: {counts['written']} files written, {counts['same']} unchanged")


if __name__ == "__main__":
    main()
