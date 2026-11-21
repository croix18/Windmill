#!/usr/bin/env python3
"""A wording pass applied the cheap way (the pass of ruling 58, 21 Nov 2026): the lead writes each old string and the
string that replaces it, and this applies them. The whole list is refused, and nothing is written, if any old string
is not in its file exactly as many times as the edit says — so a string that was mistyped, or that turned out to be in
two places, is found before a build and not after one.

    python3 reword.py EDITS.py [--root DIR] [--dry]

EDITS.py holds EDITS, a list of (file, old, new) or (file, old, new, count). `file` is relative to --root (default: the
folder this tool is in). `count` is 1 unless it is given; "all" takes every occurrence and needs at least one. The edits
are applied in order to one text per file, so a later edit sees what the earlier ones made. An edit whose old and new
strings are equal is refused. --dry checks the list and writes nothing.

What this does not do: it does not know a spec from any other text, so the gates, the build and a blind solve of the
reworded questions still follow it (briefs/LEAN WORKFLOW.md).
"""
import argparse
import os
import runpy


def main(argv=None):
    ap = argparse.ArgumentParser(description="Apply a list of exact old-to-new strings; refuse the list if one does not apply.")
    ap.add_argument("edits", help="a Python file that defines EDITS")
    ap.add_argument("--root", default=os.path.dirname(os.path.abspath(__file__)))
    ap.add_argument("--dry", action="store_true")
    a = ap.parse_args(argv)
    edits = runpy.run_path(a.edits)["EDITS"]
    texts, done, bad = {}, {}, []
    for k, e in enumerate(edits, 1):
        f, old, new = e[0], e[1], e[2]
        want = e[3] if len(e) > 3 else 1
        if f not in texts:
            path = os.path.join(a.root, f)
            if not os.path.isfile(path):
                bad.append(f"{k}. {f}: no such file")
                continue
            texts[f] = open(path, encoding="utf-8").read()
        got = texts[f].count(old)
        if old == new:
            bad.append(f"{k}. {f}: the old and new strings are the same — {old[:80]!r}")
        elif not old:
            bad.append(f"{k}. {f}: an empty old string")
        elif (want == "all" and got == 0) or (want != "all" and got != want):
            bad.append(f"{k}. {f}: found {got}, wanted {want} — {old[:110]!r}")
        else:
            texts[f] = texts[f].replace(old, new)
            done[f] = done.get(f, 0) + got
    if bad:
        print("\n".join(bad))
        print(f"refused: {len(bad)} of {len(edits)} edits do not apply; nothing is written")
        return 1
    if not a.dry:
        for f in done:
            with open(os.path.join(a.root, f), "w", encoding="utf-8") as fh:
                fh.write(texts[f])
    for f in sorted(done):
        print(f"{f}: {done[f]} replacement(s)")
    print(f"{len(edits)} edits applied" + (" (dry run: nothing is written)" if a.dry else ""))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
