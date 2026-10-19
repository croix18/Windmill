#!/usr/bin/env python3
"""The practice-test kit (practice/kit/): its manifest and its copies in the course repositories.

    python3 tools/practice_kit.py                    rewrite practice/kit/KIT.sha256
    python3 tools/practice_kit.py --check            exit 1 if the manifest is not what the files say
    python3 tools/practice_kit.py --vendor DEST      copy the kit to DEST (a course's practice/kit) with KIT.sha256 and KIT_VERSION
    python3 tools/practice_kit.py --verify DEST      exit 1 if a course's copy differs from its own manifest

Edit the kit here only; then rewrite the manifest, commit, and vendor it into each course."""
import hashlib, os, shutil, subprocess, sys
ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
KIT = os.path.join(ROOT, "practice", "kit")
FILES = ["core.js", "bilingual.js", "ui.js", "tex.js", "teacher.js", "teacher_gen.py", "check/teacher_check.js", "kit.css", "vendor/katex/katex.min.js", "vendor/katex/katex.min.css", "vendor/katex/fonts/KaTeX_Main-Regular.woff2", "vendor/katex/fonts/KaTeX_Main-Bold.woff2", "vendor/katex/fonts/KaTeX_Math-Italic.woff2", "vendor/katex/fonts/KaTeX_Size1-Regular.woff2", "vendor/katex/fonts/KaTeX_Size2-Regular.woff2", "vendor/katex/fonts/KaTeX_Size3-Regular.woff2", "vendor/katex/fonts/KaTeX_Size4-Regular.woff2", "vendor/katex/fonts/KaTeX_AMS-Regular.woff2", "lang/pt-BR.js", "build.py", "README.md", "check/run.py", "check/lock.js", "check/page.js", "check/bi.js"]

def manifest(base):
    lines = ["# The practice-test kit, file by file (sha256). Written by Windmill's tools/practice_kit.py; never by hand."]
    for rel in FILES:
        with open(os.path.join(base, rel), "rb") as fh:
            lines.append(hashlib.sha256(fh.read()).hexdigest() + "  " + rel)
    return "\n".join(lines) + "\n"

args = sys.argv[1:]
if not args:
    open(os.path.join(KIT, "KIT.sha256"), "w").write(manifest(KIT)); print("practice/kit/KIT.sha256 written")
elif args[0] == "--check":
    ok = open(os.path.join(KIT, "KIT.sha256")).read() == manifest(KIT)
    print("practice kit manifest " + ("matches" if ok else "IS STALE — run python3 tools/practice_kit.py")); sys.exit(0 if ok else 1)
elif args[0] == "--vendor":
    dest = os.path.abspath(args[1])
    if open(os.path.join(KIT, "KIT.sha256")).read() != manifest(KIT): sys.exit("vendor: the manifest is stale — rewrite and commit it first")
    for rel in FILES + ["KIT.sha256"]:
        os.makedirs(os.path.dirname(os.path.join(dest, rel)), exist_ok=True); shutil.copyfile(os.path.join(KIT, rel), os.path.join(dest, rel))
    sha = subprocess.run(["git", "rev-parse", "--short", "HEAD"], cwd=ROOT, capture_output=True, text=True).stdout.strip()
    open(os.path.join(dest, "KIT_VERSION"), "w").write("Windmill practice/kit at " + sha + " — do not edit here; edit Windmill and vendor again.\n")
    print("vendored into " + dest)
elif args[0] == "--verify":
    dest = os.path.abspath(args[1]); ok = open(os.path.join(dest, "KIT.sha256")).read() == manifest(dest)
    print("course copy " + ("matches its manifest" if ok else "DIFFERS from its manifest")); sys.exit(0 if ok else 1)
