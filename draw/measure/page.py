"""A page of one of the state's PDFs, as Cadence's tools/pdf-dump.html writes it out (Render scale 4): its picture (pages/pNNN.webp) and its text with
   where each piece sits (<name>.items.jsonl: x, baseline from the page's bottom, width, size, string, font). The pages must
   be rendered at 4 pixels a point or better (2448 pixels wide for a letter page), or the measures here are too coarse.
   Points here are from the page's top-left corner.
     page.py lines <doc> <page> x0 y0 x1 y1 [fraction]    the long straight lines in a region: where, how thick, how grey
     page.py text  <doc> <page> x0 y0 x1 y1               the text in a region
   <doc> is any part of the dump folder's name; the dump itself is the folder in DRAW_DUMP (make.py sets it)."""
import sys, os, glob, json
import numpy as np
from PIL import Image
DUMP = os.environ.get("DRAW_DUMP", "")
_cache = {}
def folder(doc):
    d = [g for g in sorted(glob.glob(DUMP + "/*/")) if doc in g]
    if not d: raise SystemExit(f"no dump folder with '{doc}' in its name under {DUMP or '(DRAW_DUMP is not set)'}")
    return d[0]
def load(doc, page):
    """(the page as greys, its text record, pixels per point)"""
    if (doc, page) not in _cache:
        d = folder(doc); f = glob.glob(f"{d}pages/p{page:03d}.*")
        if not f: raise SystemExit(f"{d} has no picture of page {page}: dump the PDF again with page images")
        im = np.array(Image.open(f[0]).convert("L")).astype(int)
        items = next(r for r in map(json.loads, open(glob.glob(d + "*.items.jsonl")[0], encoding="utf-8")) if r["page"] == page)
        _cache[(doc, page)] = (im, items, im.shape[1] / items["width"])
    return _cache[(doc, page)]
def groups(idx):
    out = []
    for i in idx:
        if out and i - out[-1][1] <= 1: out[-1][1] = i
        else: out.append([i, i])
    return out
def lines(im, s, box, axis, frac=0.45, thr=215):
    """axis 0: vertical lines (scan columns); axis 1: horizontal lines. Returns (centre pt, thickness pt, median grey, extent frac)."""
    x0, y0, x1, y1 = [int(round(v * s)) for v in box]; reg = im[y0:y1, x0:x1]
    dark = reg < thr; cover = dark.mean(axis=0 if axis == 0 else 1)
    out = []
    for a, b in groups(np.flatnonzero(cover >= frac)):
        strip = reg[:, a:b + 1] if axis == 0 else reg[a:b + 1, :]
        prof = strip.min(axis=1 if axis == 0 else 0)          # along the line: the darkest across its thickness
        core = strip.mean(axis=0 if axis == 0 else 1)         # across the line
        # thickness: area under (255 - mean grey) / (255 - darkest), a sub-pixel width
        ink = 255 - core; w = ink.sum() / max(1, ink.max())
        c = (np.arange(a, b + 1) * ink).sum() / max(1, ink.sum())
        out.append(((c + 0.5) / s + (box[0] if axis == 0 else box[1]), w / s, int(np.median(prof)), float(cover[a:b + 1].max())))
    return out
def text(items, box):
    H = items["height"]; out = []
    for x, y, w, size, t, font in items["items"]:
        if box[0] <= x <= box[2] and box[1] <= H - y <= box[3]: out.append((round(x, 2), round(H - y, 2), round(w, 2), size, t, font[-4:]))
    return sorted(out, key=lambda r: (r[1], r[0]))
if __name__ == "__main__":
    cmd, doc, page = sys.argv[1], sys.argv[2], int(sys.argv[3]); box = [float(v) for v in sys.argv[4:8]]
    im, items, s = load(doc, page)
    if cmd == "lines":
        for ax, name in ((0, "vertical"), (1, "horizontal")):
            L = lines(im, s, box, ax, float(sys.argv[8]) if len(sys.argv) > 8 else 0.45)
            print(name + ":", "  ".join(f"{c:.2f}/{w:.2f}/{g}" for c, w, g, f in L))
            cs = [c for c, w, g, f in L]
            if len(cs) > 2: print("   gaps:", " ".join(f"{b - a:.2f}" for a, b in zip(cs, cs[1:])))
    else:
        for r in text(items, box): print("  ", r)
