#!/usr/bin/env python3
"""Write kit/KIT.sha256 — the hash of every file in the build kit, the list a course repository's
`kitcheck` holds its copy against.

    python3 tools/kit_manifest.py            rewrite the manifest
    python3 tools/kit_manifest.py --check    exit 1 if the manifest is not what the files say
"""
import hashlib, os, sys
ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
KIT = os.path.join(ROOT, "kit")
SKIP_DIRS = {"__pycache__", "tests", "figs", "out"}
SKIP_FILES = {"KIT.sha256", "README.md"}


def files():
    out = []
    for d, dirs, fs in os.walk(KIT):
        dirs[:] = sorted(x for x in dirs if x not in SKIP_DIRS)
        for f in sorted(fs):
            rel = os.path.relpath(os.path.join(d, f), KIT).replace(os.sep, "/")
            if f.endswith(".pyc") or rel in SKIP_FILES:
                continue
            out.append(rel)
    return out


def manifest():
    lines = ["# The build kit, file by file (sha256). Written by Windmill's tools/kit_manifest.py; never by hand."]
    for rel in files():
        with open(os.path.join(KIT, rel), "rb") as fh:
            lines.append(f"{hashlib.sha256(fh.read()).hexdigest()}  {rel}")
    return "\n".join(lines) + "\n"


if __name__ == "__main__":
    path = os.path.join(KIT, "KIT.sha256")
    want = manifest()
    if "--check" in sys.argv:
        have = open(path, encoding="utf-8").read() if os.path.exists(path) else ""
        if have != want:
            sys.exit("kit: KIT.sha256 is stale — run python3 tools/kit_manifest.py")
        print(f"kit: manifest current ({len(files())} files)")
    else:
        open(path, "w", encoding="utf-8").write(want)
        print(f"kit: wrote KIT.sha256 ({len(files())} files)")
