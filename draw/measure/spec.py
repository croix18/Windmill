"""What the tests' own files (a7_algebra_1_eoc_2024.py and the others) share: the ways of writing down an axis, a label, a
   dashed line, a free drawing, as a spec for the kit (../draw.js), from what measure.py reads off the page."""
import sys, json
import numpy as np
from measure import G, snap, zigzag, circle
def putter(OUT):
    def put(name, g, spec):
        if spec["kind"] == "grid" and hasattr(g, "head"):          # an arrowhead that is not the usual size
            k = spec["font"] / 12
            for axn, horiz in (("x", True), ("y", False)):
                A = spec.get("axes", {}).get(axn)
                if A and A.get("arrows") != "none" and "head" not in A:
                    at = A.get("at", 0 if (g.yr if horiz else g.xr)[0] <= 0 <= (g.yr if horiz else g.xr)[1] else (g.yr if horiz else g.xr)[0]); h = g.head(horiz, at, k)
                    if h: A["head"] = [float(v) for v in h]
        OUT[name] = {"spec": spec, "ref": g.ref()}; print(name, g.note or "ok")
    return put
def rr(v, n=3): return [round(float(x), n) for x in v]
def rng(a, b, by=1, skip=(0,)): return [v for v in (round(a + i * by, 6) for i in range(int(round((b - a) / by)) + 1)) if v not in skip]
def ints(vs): return [int(v) if float(v).is_integer() else v for v in vs]
def tick(g, horiz, at, v, k=1.0): return round((g.ticklen(horiz, at, v)[0] - 0.25) / 2 / k, 2)
def dashed(g, t):
    """a dashed line between its two ends: its dashes as the state drew them (their length, the gap, where the first one starts)"""
    runs = g.dashes(*t)[1:-1]; L = sorted(b - a for a, b in runs); med = L[len(L) // 2]
    good = [(a, b) for a, b in runs if abs((b - a) - med) < 0.8]              # a dash that a crossing line joins to its neighbour is left out
    steps = [(c - a) for (a, b), (c, d) in zip(good, good[1:])]; per = sorted(steps)[len(steps) // 2]
    n = [round((a - good[0][0]) / per) for a, b in good]; per = (good[-1][0] - good[0][0]) / n[-1]
    d = med - 0.6; ph = sum(((a + 0.3 - i * per) for (a, b), i in zip(good, n))) / len(good)
    return {"line": t, "dash": [round(d, 2), round(per - d, 2)], "phase": round(ph % per, 2)}
def label(g, text, at, **kw):
    """a label of a point: the state's own string, set where the state set it (d is from the point to the start of its baseline)"""
    t = [t for t in g.texts() if t[4] == text][0]
    return dict({"text": text, "at": list(at), "d": [round(t[0] - (g.X(at[0]) - g.at[0]), 2), round(t[1] - (g.Y(at[1]) - g.at[1]), 2)]}, **kw)
def axes4(g, lo, hi, nums, k=1.0, tx=3, ty=-3, ticks=None):
    """the two axes of a four-quadrant grid: their ends as measured, a tick at every line but the frame's, the numbers given"""
    tk = ticks or ints(rng(lo + 1, hi - 1))
    return {"x": {"name": "x", "span": rr(g.span(True, 0)), "ticks": tk, "nums": list(nums), "tick": tick(g, True, 0, tx, k)},
            "y": {"name": "y", "span": rr(g.span(False, 0)), "ticks": tk, "nums": list(nums), "tick": tick(g, False, 0, ty, k)}}
def axes1(g, xn, yn, xt=None, yt=None, **kw):
    """the two axes of a first-quadrant grid: each from the corner to its arrow; a tick at every line between; the numbers given"""
    sx, sy = g.step; x = {"name": "x", "span": [g.xr[0], round(float(g.span(True, g.yr[0])[1]), 3)], "arrows": "end", "ticks": ints(rng(g.xr[0] + sx, g.xr[1] - sx, sx)), "nums": list(xn), "tick": tick(g, True, g.yr[0], g.xr[0] + sx * 5)}
    y = {"name": "y", "span": [g.yr[0], round(float(g.span(False, g.xr[0])[1]), 3)], "arrows": "end", "ticks": ints(rng(g.yr[0] + sy, g.yr[1] - sy, sy)), "nums": list(yn), "tick": tick(g, False, g.xr[0], g.yr[0] + sy * 5)}
    if xt: x["title"] = xt
    if yt: y["title"] = yt
    return {"x": x, "y": y}
class Ref:                      # a drawing that is not a grid: where its own (0, 0) is on the state's page
    def __init__(self, doc, page, at): self.doc, self.page, self.at, self.note = doc, page, at, ""
    def ref(self): return {"doc": self.doc, "page": self.page, "at": [round(self.at[0], 3), round(self.at[1], 3)]}
class Sheet(Ref):
    """A free drawing read off a page. Its items are written in page points and come out measured from `at`."""
    def __init__(self, doc, page, box, at):
        Ref.__init__(self, doc, page, at); self.box = box; self.g = G(doc, page, box, (0, 612), (-792, 0), cell=1, at=(0, 0)); self.im, self.s = self.g.im, self.g.s
        import page; self.T = page.text(self.g.items, box); self.items = []; self.used = set()
    def p(self, q): return [round(q[0] - self.at[0], 2), round(q[1] - self.at[1], 2)]
    def pts(self, qs): return [self.p(q) for q in qs]
    def text(self, s, nth=0, **kw):
        """the state's own string, where the state set it: the nth one on the page with those words (left to right, top to bottom)"""
        m = [t for t in sorted(self.T, key=lambda t: (t[1], t[0])) if t[4] == s][nth]
        it = dict({"text": s, "at": self.p((m[0], m[1]))}, **kw)
        if abs(m[3] - 12) > 0.05: it["size"] = m[3]
        return it
    def add(self, *its): self.items.extend(its); return self
    def trace(self, a, b, **kw): t = self.g.trace((a[0], -a[1]), (b[0], -b[1]), **dict({"heads": False}, **kw)); return [[t[0][0], -t[0][1]], [t[1][0], -t[1][1]]]
    def dashes(self, a, b):
        """a dashed straight stroke from a to b: (dash, gap, phase from a)"""
        runs = self.g.dashes((a[0], -a[1]), (b[0], -b[1])); L = sorted(y - x for x, y in runs); med = L[len(L) // 2]
        good = [(x, y) for x, y in runs if abs((y - x) - med) < 0.8]; steps = sorted(c - x for (x, y), (c, d) in zip(good, good[1:])); per = steps[len(steps) // 2]
        n = [round((x - good[0][0]) / per) for x, y in good]; per = (good[-1][0] - good[0][0]) / max(1, n[-1]); d = med - 0.6
        ph = sum((x + 0.3 - i * per) for (x, y), i in zip(good, n)) / len(good)
        return round(d, 2), round(per - d, 2), round(ph % per, 2)
    def snap(self, pts, closed=False, box=None, **kw):
        wipe = [(x - 1, y - 0.85 * sz, x + w + 1, y + 0.3 * sz) for x, y, w, sz, t, f in self.T]
        return snap(self.im, self.s, pts, box or self.box, closed=closed, wipe=wipe, **kw)
