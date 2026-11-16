#!/usr/bin/env python3
"""The drawing kit (draw/): its manifest and its copies in the tools that draw with it.

    python3 tools/draw_kit.py                    rewrite draw/DRAW.sha256
    python3 tools/draw_kit.py --check            exit 1 if the manifest is not what the files say
    python3 tools/draw_kit.py --vendor DEST      copy the kit to DEST (a tool's own folder for it) with DRAW.sha256 and DRAW_VERSION
    python3 tools/draw_kit.py --verify DEST      exit 1 if a tool's copy differs from its own manifest

A tool takes what it runs: the kit (draw.js), its face (fonts/), the check that lays drawings over the pictures they were
drawn from (check.mjs) and the tools that read a picture off a page (measure/). The kit's own tests and the font's maker
(test.mjs, tests/, face.py) stay here. Edit the kit here only; then rewrite the manifest, commit, and vendor it into each tool."""
import hashlib, os, shutil, subprocess, sys
ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
KIT = os.path.join(ROOT, "draw")
FILES = ["draw.js", "fonts/draw-sans.woff2", "fonts/draw-sans-bold.woff2", "fonts/draw-sans-oblique.woff2", "fonts/LICENSE-Draw-Sans.txt", "check.mjs",
         "measure/make.py", "measure/spec.py", "measure/measure.py", "measure/shapes.py", "measure/page.py", "measure/compare.py", "measure/render.mjs"]

def manifest(base):
    lines = ["# The drawing kit, file by file (sha256). Written by Windmill's tools/draw_kit.py; never by hand."]
    for rel in FILES:
        with open(os.path.join(base, rel), "rb") as fh:
            lines.append(hashlib.sha256(fh.read()).hexdigest() + "  " + rel)
    return "\n".join(lines) + "\n"

args = sys.argv[1:]
if not args:
    open(os.path.join(KIT, "DRAW.sha256"), "w").write(manifest(KIT)); print("draw/DRAW.sha256 written")
elif args[0] == "--check":
    ok = open(os.path.join(KIT, "DRAW.sha256")).read() == manifest(KIT)
    print("drawing kit manifest " + ("matches" if ok else "IS STALE — run python3 tools/draw_kit.py")); sys.exit(0 if ok else 1)
elif args[0] == "--vendor":
    dest = os.path.abspath(args[1])
    if open(os.path.join(KIT, "DRAW.sha256")).read() != manifest(KIT): sys.exit("vendor: the manifest is stale — rewrite and commit it first")
    for rel in FILES + ["DRAW.sha256"]:
        os.makedirs(os.path.dirname(os.path.join(dest, rel)), exist_ok=True); shutil.copyfile(os.path.join(KIT, rel), os.path.join(dest, rel))
    sha = subprocess.run(["git", "rev-parse", "--short", "HEAD"], cwd=ROOT, capture_output=True, text=True).stdout.strip()
    dirty = subprocess.run(["git", "status", "--porcelain", "draw"], cwd=ROOT, capture_output=True, text=True).stdout.strip()      # a copy of uncommitted changes says so
    open(os.path.join(dest, "DRAW_VERSION"), "w").write("Windmill draw/ at " + sha + (" + uncommitted kit changes" if dirty else "") + " — do not edit here; edit Windmill and vendor again.\n")
    print("vendored into " + dest)
elif args[0] == "--verify":
    dest = os.path.abspath(args[1]); ok = open(os.path.join(dest, "DRAW.sha256")).read() == manifest(dest)
    print("the tool's copy " + ("matches its manifest" if ok else "DIFFERS from its manifest")); sys.exit(0 if ok else 1)
else:
    sys.exit(__doc__)
