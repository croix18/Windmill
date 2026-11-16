"""Lay a drawing over the state's own picture and say how far apart they are: its ink (what is darker than the paper or the
   tint around it) each way, its tints, and where each piece of text is set. make.py calls check(); on its own:
     python3 draw/measure/compare.py <outdir> [--fine] [name ...]     (after render.mjs; DRAW_DUMP names the dump)
   writes <name>.over.png: the state's ink in red, the drawing's in blue, black where they agree."""
import sys, glob, json, os
import numpy as np
from PIL import Image
from scipy import ndimage
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import page as _page
S = 4; FINE = False
_pages = {}
def page(doc, p):
    """the page as greys with the circled option letters whited out (they are not part of a picture), and its text record"""
    if (doc, p) not in _pages:
        im, items, s = _page.load(doc, p); im = im.astype(np.uint8).copy()
        if abs(s - S) > 0.01: raise SystemExit(f"{doc} page {p} is {s:.2f} pixels a point; the comparison wants {S} (dump the PDF at 2448 pixels wide)")
        for x, y, w, size, text, font in items["items"]:
            if size == 14 and text in list("ABCDE"):
                im[max(0, int((items["height"] - y - 14) * S)):int((items["height"] - y + 5) * S) + 1, max(0, int((x - 4) * S)):int((x + 16) * S) + 1] = 255
        _pages[(doc, p)] = (im, items)
    return _pages[(doc, p)]
def norm(s): return s.replace("–", "-").replace("−", "-").replace("’", "'").strip()
def texts(out, name):
    """the state's text inside the drawing's box, and the drawing's own: (pairs [ours, theirs, dx, dy], state-only, ours-only)"""
    L = json.load(open(f"{out}/{name}.json")); ref = L["ref"]; im, items = page(ref["doc"], ref["page"]); ax, ay = ref["at"]
    PH = items["height"]; theirs = []
    for x, y, w, size, text, font in items["items"]:
        lx, ly = x - ax, PH - y - ay
        if L["x"] - 2 <= lx <= L["x"] + L["w"] + 2 and L["y"] - 2 <= ly <= L["y"] + L["h"] + 6 and not (size == 14 and text in list("ABCDE")): theirs.append([lx, ly, w, size, text])
    merged = []
    for t in sorted(theirs, key=lambda t: t[0]):          # a number the state set in pieces (a dash, then its digits) is one string
        for m in merged:
            if abs(m[1] - t[1]) <= 1.3 and abs(m[3] - t[3]) < 0.2 and -1.0 <= t[0] - (m[0] + m[2]) <= 1.6 and m[4] in ("–", "-") and t[4][:1].isdigit():
                m[2] = t[0] + t[2] - m[0]; m[4] += t[4]; m[1] = max(m[1], t[1]); break
        else: merged.append(list(t))
    theirs = merged; ours = [dict(t) for t in L["texts"]]; cands = []
    for j, th in enumerate(theirs):
        lx, ly, w, size, text = th
        for i, t in enumerate(ours):
            if norm(t["s"]) != norm(text): continue
            if t["rot"]: dx, dy = t["ax"] - lx, t["y"] + (t["ax"] - t["x"]) - ly          # turned a quarter back: the state gives the baseline's x and the y where the string starts
            else: dx, dy = t["x"] + t["w"] / 2 - lx - w / 2, t["y"] - ly
            if abs(dx) + abs(dy) < 30: cands.append((abs(dx) + abs(dy), j, i, dx, dy))
    pairs = []; used = set(); done = set()
    for d, j, i, dx, dy in sorted(cands):                  # the nearest pairs first
        if i in used or j in done: continue
        used.add(i); done.add(j); pairs.append([ours[i], theirs[j], dx, dy])
    lone = []
    for j, th in enumerate(theirs):
        if j in done: continue
        twin = any(k in done and theirs[k][4] == th[4] and abs(theirs[k][0] - th[0]) < 0.6 and abs(theirs[k][1] - th[1]) < 0.6 for k in range(len(theirs)))
        if not twin: lone.append(th)                       # (the state's page has some numbers twice, one on the other: not a difference)
    return L, pairs, lone, [t for i, t in enumerate(ours) if i not in used], theirs, ours
def check(out, name, show=True):
    L, pairs, lone, extra_t, theirs, ours = texts(out, name); ref = L["ref"]
    mine = np.array(Image.open(f"{out}/{name}.png").convert("L")); H, W = mine.shape
    im, items = page(ref["doc"], ref["page"]); ax, ay = ref["at"]
    X0, Y0 = int(round((ax + L["x"]) * S)), int(round((ay + L["y"]) * S))
    st = im[Y0:Y0 + H, X0:X0 + W]
    if st.shape != mine.shape: st = np.pad(st, ((0, H - st.shape[0]), (0, W - st.shape[1])), constant_values=255)
    notes = [f"state '{t[4]}' @({t[0]:.1f},{t[1]:.1f}) sz {t[3]}" for t in lone]; worst = 0.0
    for t, th, dx, dy in pairs:
        worst = max(worst, abs(dx), abs(dy))
        if abs(dx) > 0.6 or abs(dy) > 0.6 or abs(t["size"] - th[3]) > 0.15: notes.append(f"'{th[4]}' ({t['id']}) off dx {dx:+.1f} dy {dy:+.1f}" + (f" size {t['size']} vs {th[3]}" if abs(t["size"] - th[3]) > 0.15 else ""))
    extra = [t["s"] for t in extra_t]
    # strokes: ink outside every text box, each way
    tm = np.zeros_like(mine, bool)
    def blank(x0, y0, x1, y1):
        tm[max(0, int((y0 - L["y"]) * S)):max(0, int((y1 - L["y"]) * S)) + 1, max(0, int((x0 - L["x"]) * S)):max(0, int((x1 - L["x"]) * S)) + 1] = True
    for lx, ly, w, size, text in theirs: blank(lx - 1.2, ly - 0.8 * size - 1.2, lx + w + 1.2, ly + 0.25 * size + 1.2)
    for t in ours:
        if t["rot"]: y0 = t["y"] + (t["ax"] - t["x"]); blank(t["ax"] - 0.85 * t["size"] - 1.2, y0 - t["w"] - 1.2, t["ax"] + 0.3 * t["size"] + 1.2, y0 + 1.2)   # turned a quarter back: it runs up from y0
        else: blank(t["x"] - 1.2, t["y"] - 0.8 * t["size"] - 1.2, t["x"] + t["w"] + 1.2, t["y"] + 0.25 * t["size"] + 1.2)
    # ink: what is darker than the paper or the tint around it (so a shaded half-plane is not ink, and its grid lines are), and
    # anything dark outright (a filled sector or bar)
    def ink(a): bg = ndimage.grey_closing(a, size=(17, 17)); return ((a.astype(int) < bg.astype(int) - 22) | (a < 150)), bg
    A0, bgA = ink(st); B0, bgB = ink(mine); A, B = A0 & ~tm, B0 & ~tm           # text is compared by where it is set, not by its ink
    tint = 100 * (np.abs(bgA.astype(int) - bgB.astype(int)) > 26).mean()               # where the tints differ: a region shaded in one and not the other
    dA, dB = ndimage.distance_transform_edt(~B0), ndimage.distance_transform_edt(~A0)     # to the drawing's ink; to the state's
    missA, missB = A & (dA > 3), B & (dB > 3)                                             # more than 3/4 of a point away
    def clusters(m, who):
        lab, n = ndimage.label(ndimage.binary_dilation(m, iterations=3)); out = []
        for k, sl in enumerate(ndimage.find_objects(lab), 1):
            c = int((m[sl] & (lab[sl] == k)).sum())
            if c >= 24: out.append((c, f"{who} ({(sl[1].start + sl[1].stop) / 2 / S + L['x']:.0f},{(sl[0].start + sl[0].stop) / 2 / S + L['y']:.0f}) {c}px"))
        return [t for c, t in sorted(out, reverse=True)[:6]]
    pa, pb = 100 * missA.sum() / max(1, A.sum()), 100 * missB.sum() / max(1, B.sum())
    fine = 100 * ((A & (dA > 1.6)).sum() + (B & (dB > 1.6)).sum()) / max(1, A.sum() + B.sum())      # more than 0.4 of a point, either way
    rgb = np.stack([np.where(B, 0, 255), np.where(A & B, 0, np.where(A | B, 110, 255)), np.where(A, 0, 255)], -1).astype(np.uint8)
    Image.fromarray(rgb).save(f"{out}/{name}.over.png")
    line = f"{name}: state ink unmatched {pa:.1f}%  drawing ink unmatched {pb:.1f}%  (over 0.4 pt apart: {fine:.1f}%)  tints differ {tint:.1f}%  text worst {worst:.1f}pt"
    if show:
        print(line)
        for t in clusters(missA, "state-only") + clusters(missB, "drawn-only"): print("     " + t)
        if FINE:
            for t in clusters(A & (dA > 1.6), "state-only>0.4pt") + clusters(B & (dB > 1.6), "drawn-only>0.4pt"): print("       " + t)
        for t in notes[:12]: print("     " + t)
        if extra: print("     drawn text with no match:", extra[:14])
    return pa, pb, worst, len(notes) + len(extra), fine, tint
if __name__ == "__main__":
    if "--fine" in sys.argv: FINE = True; sys.argv.remove("--fine")
    out = sys.argv[1]; names = sys.argv[2:] or sorted(os.path.basename(f)[:-5] for f in glob.glob(out + "/*.json"))
    for n in names: check(out, n)

def glyphs(out, name, grow=2.5):
    """For a picture whose text the dump does not have: for each piece of the drawing's text, how far the state's ink there is
       from the drawing's own (the middles of their boxes, state minus drawing, in points)."""
    L = json.load(open(f"{out}/{name}.json")); ref = L["ref"]; mine = np.array(Image.open(f"{out}/{name}.png").convert("L")); H, W = mine.shape
    im, items = page(ref["doc"], ref["page"]); X0, Y0 = int(round((ref["at"][0] + L["x"]) * S)), int(round((ref["at"][1] + L["y"]) * S)); st = im[Y0:Y0 + H, X0:X0 + W]
    for t in L["texts"]:
        if t["rot"]: y0 = t["y"] + (t["ax"] - t["x"]); b = [t["ax"] - 0.8 * t["size"] - grow, y0 - t["w"] - grow, t["ax"] + 0.25 * t["size"] + grow, y0 + grow]
        else: b = [t["x"] - grow, t["y"] - 0.8 * t["size"] - grow, t["x"] + t["w"] + grow, t["y"] + 0.25 * t["size"] + grow]
        x0, y0, x1, y1 = [int((v - o) * S) for v, o in zip(b, (L["x"], L["y"], L["x"], L["y"]))]; x0, y0 = max(0, x0), max(0, y0)
        def bb(a):
            ys, xs = np.nonzero(a[y0:y1, x0:x1] < 140)
            return None if not len(ys) else ((xs.min() + xs.max() + 1) / 2 / S, (ys.min() + ys.max() + 1) / 2 / S, (xs.max() + 1 - xs.min()) / S, (ys.max() + 1 - ys.min()) / S)
        A, B = bb(st), bb(mine)
        if A and B: print(f"   {t['id'] or t['s']!r:12} '{t['s'][:18]}' state-minus-drawing dx {A[0] - B[0]:+.2f} dy {A[1] - B[1]:+.2f}   box {A[2]:.1f}x{A[3]:.1f} vs {B[2]:.1f}x{B[3]:.1f}")
        else: print(f"   {t['id']!r} '{t['s'][:18]}': no ink", "in the state's" if not A else "in the drawing")
