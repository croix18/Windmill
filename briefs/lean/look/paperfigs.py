"""The lettering and the square size of every PRINTED figure of a lesson (Independent Set, both banks), as the page
places it:   python3 WINDMILL/briefs/lean/look/paperfigs.py u10/l06.py
A printed figure is lettered at 8 to 11.5 pt. A plane's squares are 0.24 to 0.31 in on the Independent Set (the
handout a student draws on) and 0.21 to 0.35 in in the banks. Lines marked !! are outside that."""
import sys, os, importlib.util
import numpy as np
from PIL import Image
from scipy import ndimage
sys.path.insert(0, os.getcwd()); sys.path.insert(0, os.path.join(os.getcwd(), os.path.dirname(sys.argv[1])))
from lib import figkit
spec = importlib.util.spec_from_file_location("lesson", sys.argv[1]); m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
L = getattr(m, "L", None) or getattr(m, "U", None)


def runs(mask, gap):
    idx = np.nonzero(mask)[0]
    if not len(idx):
        return []
    out, a, p = [], idx[0], idx[0]
    for i in idx[1:]:
        if i - p > gap:
            out.append((a, p)); a = i
        p = i
    out.append((a, p))
    return out


def measure(fig):
    path, w, h = figkit.draw(figkit.slide(fig), fig.get("in", 2.4))
    im = Image.open(path).convert("RGBA")
    bg = Image.new("RGBA", im.size, "white"); bg.alpha_composite(im)
    rgb = np.asarray(bg.convert("RGB")).astype(int)
    dpi = rgb.shape[1] / w
    gray = rgb.mean(axis=2)
    lab, k = ndimage.label(gray < 120)
    hs = []
    for o in ndimage.find_objects(lab):
        gh, gw = o[0].stop - o[0].start, o[1].stop - o[1].start
        if not (0.05 * dpi <= gh <= 0.45 * dpi and 0.015 * dpi <= gw <= 0.35 * dpi):
            continue
        if abs(gh - gw) <= 0.012 * dpi and (lab[o] > 0).mean() > 0.7:      # a plotted dot
            continue
        if abs(gh - gw) <= 0.02 * dpi and (lab[o] > 0).mean() < 0.45:      # an empty answer box
            continue
        hs.append(gh)
    pt = np.percentile(hs, 80) / dpi * 72 / 0.70 if hs else None
    pale = (abs(rgb[..., 0] - rgb[..., 1]) < 8) & (abs(rgb[..., 1] - rgb[..., 2]) < 8) & (gray > 175) & (gray < 236)
    pale &= ~ndimage.binary_dilation(gray < 110, iterations=3)
    n = int(0.2 * dpi)
    ver = ndimage.binary_opening(pale, structure=np.ones((n, 1)))
    cols = runs(ver.sum(axis=0) > 0.4 * dpi, 2)
    sq = None
    if len(cols) >= 3:
        xs = [(a + b) / 2 for a, b in cols]
        d = np.diff(xs)
        sq = float(np.median(d)) / dpi
    return w, h, pt, sq


def walk(items, tag):
    n = 0
    for it in items or []:
        if it.get("heading") or it.get("table"):
            continue
        n += 1
        if it.get("fig"):
            w, h, pt, sq = measure(it["fig"])
            bad = []
            if pt is not None and not (8.0 <= pt <= 11.5):
                bad.append("lettering")
            empty = it.get("fig_key") is not None
            lo, hi = (0.24, 0.31) if tag == "I" else (0.21, 0.35)
            if sq is not None and not (lo <= sq <= hi):
                bad.append(f"squares (this page: {lo} to {hi} in)")
            print(f"  {tag}{n:<3} {w:4.1f} x {h:4.1f} in   lettering {pt if pt is None else round(pt, 1)} pt   squares {sq if sq is None else round(sq, 2)} in"
                  f"{'   (a grid to draw on)' if empty else ''}{'   !! ' + ', '.join(bad) if bad else ''}")


print("==", sys.argv[1])
if "independent" in L:
    walk(L.get("independent"), "I"); walk(L.get("bank"), "K"); walk(L.get("additional"), "A")
