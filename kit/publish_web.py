#!/usr/bin/env python3
"""Publish this course to mrshaffer.org's repository: the slides as web pages, the practice tests, the teacher copies and
every unit's documents. The site's own build (tools/build.mjs there) makes the pages from these.
    python3 publish_web.py --site ../../../mrshaffer-site [u4 u9 …]      every built unit when none is named

    <site>/slides/<course>/<day code>.html            web_decks.py: one page per lesson, named by the plan's day
    <site>/practice/<course>/<Course> Unit N Practice Test.html           the student page (practice/uN/)
    <site>/teacher/<course>/<Course> Unit N Teacher Copy.html             the teacher copy (practice/uN/teacher/)
    <site>/units/<course>/unit-N/…                                        the unit's package (every unit with one, named
                                                                          or not): its PDFs, slides (.pptx) and notes
                                                                          (.md), a .docx only as a PDF made here (a Word
                                                                          file with no PDF beside it — the older units),
                                                                          and unit.json (number, title). The site makes
                                                                          the student page and the teacher page from it
                                                                          (Croix, 24 Oct 2026: "Fill in the latest
                                                                          versions of all my made content").

A unit is "built" when build/uN/ has lesson specs and the package folder exists. Files the site already holds are
compared byte for byte and rewritten only when they differ, so a git status in the site repository shows what moved.
(Part of the shared build kit — edit it in croix18/Windmill, kit/.)"""
import os, re, sys, glob, json, shutil, filecmp, subprocess, tempfile
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from lib.profile import C
from lib import packkit, names

COURSE_DIR = os.path.dirname(HERE)                   # m7/ or a7/
KEY = os.path.basename(COURSE_DIR)                    # "m7" / "a7": the site's folder names
PACKAGES = os.path.join(COURSE_DIR, "packages")
PRACTICE = os.path.join(COURSE_DIR, "practice")
KEEP = (".pdf", ".pptx", ".md")                      # what a package publishes as it is; .docx only as a PDF made here


def put(src, dst):
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    if os.path.exists(dst) and filecmp.cmp(src, dst, shallow=False):
        return "same"
    shutil.copyfile(src, dst); return "written"


def soffice():
    return shutil.which("soffice") or shutil.which("libreoffice")


def docx_to_pdf(src, out_dir):
    """A PDF of the Word file, made by LibreOffice into out_dir; None when it cannot be made."""
    exe = soffice()
    if not exe:
        return None
    r = subprocess.run([exe, "--headless", "--convert-to", "pdf", "--outdir", out_dir, src], capture_output=True, text=True, timeout=300)
    pdf = os.path.join(out_dir, os.path.splitext(os.path.basename(src))[0] + ".pdf")
    return pdf if r.returncode == 0 and os.path.exists(pdf) else None


def publish_package(site, n, counts):
    """The unit's package into <site>/units/<course>/unit-N/: PDFs, .pptx and .md as they are; a .docx with no PDF
    beside it as a PDF made here; nothing else (the Word sources stay in the repository). Files the site holds that
    the package no longer has are removed. Returns the number of Word files that could not be converted."""
    pkg = os.path.join(PACKAGES, packkit.package_folder(n))
    if not os.path.isdir(pkg):
        return 0
    dst = os.path.join(site, "units", KEY, f"unit-{n}")
    want = {}                                       # relative path on the site → source file
    missing = 0
    tmp = tempfile.mkdtemp(prefix="publish_web_")
    for root, dirs, files in os.walk(pkg):
        dirs.sort()
        rel = os.path.relpath(root, pkg)
        for f in sorted(files):
            stem, ext = os.path.splitext(f)
            src = os.path.join(root, f)
            if ext.lower() in KEEP:
                want[os.path.normpath(os.path.join(rel, f))] = src
            elif ext.lower() == ".docx" and not os.path.exists(os.path.join(root, stem + ".pdf")):
                here = os.path.join(dst, os.path.normpath(os.path.join(rel, stem + ".pdf")))
                if os.path.exists(here) and os.path.getmtime(here) >= os.path.getmtime(src):
                    want[os.path.normpath(os.path.join(rel, stem + ".pdf"))] = here      # made on an earlier run, still current
                    continue
                pdf = docx_to_pdf(src, os.path.join(tmp, re.sub(r"[^A-Za-z0-9]+", "_", rel)))
                if pdf:
                    want[os.path.normpath(os.path.join(rel, stem + ".pdf"))] = pdf
                else:
                    missing += 1
    meta = os.path.join(tmp, "unit.json")
    with open(meta, "w", encoding="utf-8") as fh:
        json.dump({"course": C.PREFIX, "unit": n, "title": names.clean(names.unit_title(n)), "folder": os.path.basename(pkg)}, fh, indent=1)
    want["unit.json"] = meta
    for rel, src in want.items():
        target = os.path.join(dst, rel)
        if os.path.abspath(src) == os.path.abspath(target):
            counts["same"] += 1; continue
        counts[put(src, target)] += 1
    if os.path.isdir(dst):
        for root, dirs, files in os.walk(dst, topdown=False):
            for f in files:
                rel = os.path.normpath(os.path.relpath(os.path.join(root, f), dst))
                if rel not in want:
                    os.remove(os.path.join(root, f)); counts["removed"] += 1
            for d in dirs:
                p = os.path.join(root, d)
                if not os.listdir(p):
                    os.rmdir(p)
    shutil.rmtree(tmp, ignore_errors=True)
    return missing


def main():
    args = sys.argv[1:]
    if "--site" not in args:
        raise SystemExit(__doc__)
    k = args.index("--site"); site = os.path.abspath(args[k + 1]); del args[k:k + 2]
    if not os.path.isdir(os.path.join(site, "public")):
        raise SystemExit(f"publish_web: {site} is not the site repository (no public/)")
    units = args or sorted(os.path.basename(d) for d in glob.glob(os.path.join(HERE, "u[0-9]*")) if os.path.isdir(d))
    counts = {"same": 0, "written": 0, "removed": 0}
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
    # every unit's package — the units named, and every other unit that has one (Units 1–2 were made before the kit)
    stale = os.path.join(site, "teacher", "units", KEY)            # where the All in One PDFs went before 24 Oct 2026
    if os.path.isdir(stale):
        shutil.rmtree(stale); counts["removed"] += 1
    missing = 0
    for n in sorted({int(u[1:]) for u in units} | set(C.UNITS)):
        missing += publish_package(site, n, counts)
    print(f"{C.PREFIX} → {site}: {counts['written']} files written, {counts['same']} unchanged, {counts['removed']} removed"
          + (f"; {missing} Word files have no PDF and LibreOffice is not here to make one" if missing else ""))


if __name__ == "__main__":
    main()
