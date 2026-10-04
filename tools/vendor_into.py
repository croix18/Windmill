#!/usr/bin/env python3
"""Put Windmill's shared pieces into a course repository's build folder:

    python3 tools/vendor_into.py /path/to/course-repo/…/build

  the build kit   kit/** → build/ (lib/, checks.py, the drivers, the tools, assets/), with its
                  manifest KIT.sha256 and a KIT_VERSION line naming this commit. A lib/*.py that is
                  not part of the kit is removed: course code lives outside lib/ (build/course.py,
                  the unit folders, install_unit.py).
  the room        room-reader.js and benchmarks.json as they are, spine.json wrapped as spine.js
                  (`window.SPINE = …`), into build/assets/windmill/ with a VERSION line.

Nothing it writes is edited by hand afterwards: change it here, run kit_manifest.py, vendor again.
The course's `kitcheck` (kit/checks.py) refuses a copy that differs from the manifest.
"""
import hashlib, json, os, shutil, subprocess, sys
ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kit_manifest

if len(sys.argv) < 2 or not os.path.isdir(sys.argv[1]):
    sys.exit("usage: vendor_into.py <course build directory>")
DEST = os.path.abspath(sys.argv[1])
KIT = os.path.join(ROOT, "kit")
if open(os.path.join(KIT, "KIT.sha256"), encoding="utf-8").read() != kit_manifest.manifest():
    sys.exit("vendor: kit/KIT.sha256 is stale — run python3 tools/kit_manifest.py and commit first")

kit_files = kit_manifest.files()
for rel in kit_files:
    dst = os.path.join(DEST, rel)
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    shutil.copyfile(os.path.join(KIT, rel), dst)
    if rel.endswith(".py") and "/" not in rel:
        os.chmod(dst, 0o755)
shutil.copyfile(os.path.join(KIT, "KIT.sha256"), os.path.join(DEST, "KIT.sha256"))
removed = []
libdir = os.path.join(DEST, "lib")
for f in sorted(os.listdir(libdir)):
    if f.endswith(".py") and f"lib/{f}" not in kit_files:
        os.remove(os.path.join(libdir, f)); removed.append(f"lib/{f}")
shutil.rmtree(os.path.join(libdir, "__pycache__"), ignore_errors=True)
head = subprocess.run(["git", "-C", ROOT, "rev-parse", "--short", "HEAD"], capture_output=True, text=True).stdout.strip()
dirty = subprocess.run(["git", "-C", ROOT, "status", "--porcelain", "kit"], capture_output=True, text=True).stdout.strip()
digest = hashlib.sha256(open(os.path.join(KIT, "KIT.sha256"), "rb").read()).hexdigest()[:12]
with open(os.path.join(DEST, "KIT_VERSION"), "w") as f:
    f.write(f"Windmill {head}{' + uncommitted kit changes' if dirty else ''} — build kit {digest}, {len(kit_files)} files\n")

W = os.path.join(DEST, "assets", "windmill")
os.makedirs(W, exist_ok=True)
shutil.copyfile(os.path.join(ROOT, "room", "room-reader.js"), os.path.join(W, "room-reader.js"))
shutil.copyfile(os.path.join(ROOT, "room", "benchmarks.json"), os.path.join(W, "benchmarks.json"))
spine = json.load(open(os.path.join(ROOT, "spine", "spine.json"), encoding="utf-8"))
with open(os.path.join(W, "spine.js"), "w", encoding="utf-8") as f:
    f.write("window.SPINE = " + json.dumps(spine, ensure_ascii=False, separators=(",", ":")) + ";\n")
with open(os.path.join(W, "VERSION"), "w") as f:
    f.write(f"Windmill {head} — spine generated {spine['generatedAt']}, benchmark list v{spine['benchmarkList']['version']}, "
            f"{sum(1 for v in spine['days'].values() if 'holiday' not in v)} school days\n")
print(open(os.path.join(DEST, "KIT_VERSION")).read().strip())
print(open(os.path.join(W, "VERSION")).read().strip())
if removed:
    print("removed (not part of the kit):", ", ".join(removed))
