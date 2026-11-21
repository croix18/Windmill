#!/usr/bin/env python3
"""Which pages of a deck changed between two builds.
    python3 changed_slides.py OLD.pdf NEW.pdf            → the changed pages, and pages added or removed
    python3 changed_slides.py OLD.pdf NEW.pdf --sheet    → and a contact sheet of the changed pages in /tmp/sheets/

Both files are rendered with pdftoppm at 30 dpi and compared pixel by pixel: a page has changed when more than
0.05% of its pixels differ by more than 40 (of 255) in any channel — anti-aliasing noise is under that, a changed
digit is over it. Pages are lined up first (the fewest edits), so a slide inserted near the
front is reported as one page added, not as every later page changed. Page numbers are NEW's, except a removed
page, which is OLD's. --sheet draws the changed and added pages of NEW at 60 dpi, 3 across, numbered, and prints the
sheet's path (several sheets for many pages). Exit 0 either way: a change is information, not a failure.

What it cannot see: a change smaller than a 30-dpi pixel (a thin rule moved a hair, a colour a shade off), and
anything a PDF does not draw (speaker notes, the side-car, timings). Read-only: writes only to a scratch folder and
/tmp/sheets/.
"""
import glob
import os
import subprocess
import sys
import tempfile

DPI, SHEET_DPI, COLS = 30, 60, 3
LEVEL, SHARE = 40, 0.0005


def render(pdf, out, dpi=DPI, first=None, last=None):
    """The pages of pdf as PNG files, in order."""
    os.makedirs(out, exist_ok=True)
    cmd = ["pdftoppm", "-r", str(dpi), "-png"]
    if first:
        cmd += ["-f", str(first), "-l", str(last or first)]
    subprocess.run(cmd + [pdf, os.path.join(out, "p")], check=True, capture_output=True)
    return sorted(glob.glob(os.path.join(out, "p-*.png")), key=lambda p: int(p.rsplit("-", 1)[1][:-4]))


def _rgb(path):
    from PIL import Image
    im = Image.open(path)
    if im.mode != "RGB":
        im = im.convert("RGB")
    return im


def differs(a, b):
    """True when two renderings of a page differ by more than the tolerance."""
    from PIL import ImageChops
    if a.size != b.size:
        return True
    d = ImageChops.difference(a, b).convert("L").point(lambda v: 255 if v > LEVEL else 0)
    return d.histogram()[255] > SHARE * a.size[0] * a.size[1]


def compare(old_pdf, new_pdf):
    """(changed new page numbers, added new page numbers, removed old page numbers, pages in old, pages in new).
    The pages are lined up by the fewest edits: a page kept as it was costs 0, a page changed costs 1, a page added
    or removed costs 1 — so an inserted slide is one page added, and a page that changed is paired with its old self."""
    with tempfile.TemporaryDirectory() as tmp:
        po, pn = render(old_pdf, os.path.join(tmp, "old")), render(new_pdf, os.path.join(tmp, "new"))
        bo, bn = [open(p, "rb").read() for p in po], [open(p, "rb").read() for p in pn]
        io_, in_ = [_rgb(p) for p in po], [_rgb(p) for p in pn]
    memo = {}

    def cost(i, j):
        if (i, j) not in memo:
            memo[i, j] = 0 if bo[i] == bn[j] else (1 if differs(io_[i], in_[j]) else 0)
        return memo[i, j]
    no, nn = len(io_), len(in_)
    band = abs(no - nn) + 8                     # a deck is edited in place: pages move a few places at most
    INF = float("inf")
    D = [[INF] * (nn + 1) for _ in range(no + 1)]
    D[0] = list(range(nn + 1))
    for i in range(1, no + 1):
        D[i][0] = i
        for j in range(max(1, i - band), min(nn, i + band) + 1):
            D[i][j] = min(D[i - 1][j] + 1, D[i][j - 1] + 1, D[i - 1][j - 1] + 1.0 * cost(i - 1, j - 1) + 0.001)
    changed, added, removed = [], [], []
    i, j = no, nn
    while i > 0 or j > 0:
        if i > 0 and j > 0 and D[i][j] == D[i - 1][j - 1] + cost(i - 1, j - 1) + 0.001:
            if cost(i - 1, j - 1):
                changed.append(j)
            i, j = i - 1, j - 1
        elif j > 0 and D[i][j] == D[i][j - 1] + 1:
            added.append(j)
            j -= 1
        else:
            removed.append(i)
            i -= 1
    return sorted(changed), sorted(added), sorted(removed), no, nn


def _ranges(ns):
    out, ns = [], sorted(ns)
    i = 0
    while i < len(ns):
        j = i
        while j + 1 < len(ns) and ns[j + 1] == ns[j] + 1:
            j += 1
        out.append(str(ns[i]) if i == j else f"{ns[i]}–{ns[j]}")
        i = j + 1
    return ", ".join(out) or "none"


def sheet(new_pdf, pages, tag="NEW"):
    """Contact sheets of the given pages of new_pdf at 60 dpi, 3 across, 12 to a sheet; returns their paths."""
    from PIL import Image, ImageDraw
    os.makedirs("/tmp/sheets", exist_ok=True)
    base = os.path.splitext(os.path.basename(new_pdf))[0]
    paths = []
    with tempfile.TemporaryDirectory() as tmp:
        ims = []
        for p in pages:
            got = render(new_pdf, os.path.join(tmp, str(p)), SHEET_DPI, p, p)
            if got:
                ims.append((p, _rgb(got[0])))
        per = COLS * 4
        for s, i0 in enumerate(range(0, len(ims), per), 1):
            chunk = ims[i0:i0 + per]
            cw = max(im.width for _, im in chunk) + 12
            ch = max(im.height for _, im in chunk) + 30
            cols = min(COLS, len(chunk))
            rows = (len(chunk) + cols - 1) // cols
            out = Image.new("RGB", (cols * cw, rows * ch), "white")
            dr = ImageDraw.Draw(out)
            for k, (p, im) in enumerate(chunk):
                x, y = (k % cols) * cw, (k // cols) * ch
                out.paste(im, (x + 6, y + 24))
                dr.text((x + 8, y + 6), f"page {p}", fill="red")
                dr.rectangle([x + 5, y + 23, x + 6 + im.width, y + 24 + im.height], outline="#999999")
            path = os.path.join("/tmp/sheets", f"{base} - changed{'' if len(ims) <= per else f' {s:02d}'}.png")
            out.save(path)
            paths.append(path)
    return paths


def main(argv):
    flags = [a for a in argv if a.startswith("--")]
    args = [a for a in argv if not a.startswith("--")]
    if len(args) != 2 or any(f != "--sheet" for f in flags):
        print(__doc__)
        return 2
    old, new = args
    changed, added, removed, no, nn = compare(old, new)
    print(f"changed: {_ranges(changed)}")
    if added:
        print(f"added (NEW's pages): {_ranges(added)}")
    if removed:
        print(f"removed (OLD's pages): {_ranges(removed)}")
    if "--sheet" in flags:
        pages = sorted(set(changed) | set(added))
        if pages:
            for p in sheet(new, pages):
                print(f"sheet: {p}")
        else:
            print("sheet: nothing changed, no sheet")
    print(f"{len(changed)} changed, {len(added)} added, {len(removed)} removed  ({no} pages → {nn} pages)")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
