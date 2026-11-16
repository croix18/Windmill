"""Read a drawing off the state's page: where a graph's grid is, how long its axes are, where its ticks, lines, dashes and
   dots are (G); a polygon's corners (snap), a circle (circle), the zigzag of a broken axis (zigzag).
   Page coordinates are points from the top-left; graph coordinates are the graph's own. numpy, scipy and scikit-image."""
import numpy as np
from scipy import ndimage
import page as study
class G:
    def __init__(self, doc, page, box, xr, yr, step=(1, 1), thr=None, frac=0.33, cell=None, at=None):
        self.doc, self.page, self.box, self.xr, self.yr, self.step = doc, page, box, xr, yr, step
        self.im, self.items, self.s = study.load(doc, page)
        nx, ny = round((xr[1] - xr[0]) / step[0]) + 1, round((yr[1] - yr[0]) / step[1]) + 1
        self.note = ""; self.gridg = self.gridw = self.axg = None
        if cell is None:
            for th in ([thr] if thr else [215, 190, 228, 170]):          # a shaded graph needs a threshold between its tint and its lines
                LV = study.lines(self.im, self.s, box, 0, frac, th); LH = study.lines(self.im, self.s, box, 1, frac, th)
                if len(LV) == nx and len(LH) == ny: break
            V = [c for c, w, g, f in LV]; H = [c for c, w, g, f in LH]
            if len(V) != nx or len(H) != ny: self.note = f"!! found {len(V)} x {len(H)} lines, wanted {nx} x {ny}: V {['%.1f' % v for v in V]} H {['%.1f' % v for v in H]}"
            fx = np.polyfit(range(len(V)), V, 1); fy = np.polyfit(range(len(H)), H, 1)
            self.cell = (float(fx[0]), float(fy[0])); self.V, self.H = V, H
            thin = [(w, g) for c, w, g, f in LV + LH if g > 110]; dark = [g for c, w, g, f in LV + LH if g <= 110]
            if thin: self.gridw, self.gridg = float(np.median([w for w, g in thin])), int(np.median([g for w, g in thin]))
            if dark: self.axg = int(np.median(dark))
            # uneven: some line is more than a fifth of a point from where even spacing puts it
            even = max(max(abs(v - (fx[1] + fx[0] * i)) for i, v in enumerate(V)), max(abs(h - (fy[1] + fy[0] * i)) for i, h in enumerate(H))) <= 0.2
            self.even = even and len(V) == nx and len(H) == ny
            if self.even: self.at = (float(fx[1]), float(fy[1])); self.V = [self.at[0] + i * self.cell[0] for i in range(nx)]; self.H = [self.at[1] + i * self.cell[1] for i in range(ny)]
            else: self.at = (V[0], H[0])
        else:
            self.cell = tuple(cell) if isinstance(cell, (list, tuple)) else (cell, cell); self.at = tuple(at); self.even = True
            self.V = [self.at[0] + i * self.cell[0] for i in range(nx)]; self.H = [self.at[1] + i * self.cell[1] for i in range(ny)]
    # graph -> page, page -> graph: in proportion between two lines of the grid; beyond the last, the last cell carries on
    @staticmethod
    def _at(L, t): L = np.asarray(L, float); j = np.clip(np.floor(t).astype(int) if isinstance(t, np.ndarray) else int(np.floor(t)), 0, len(L) - 2); return L[j] + (t - j) * (L[j + 1] - L[j])
    @staticmethod
    def _inv(L, p): L = np.asarray(L, float); j = np.clip(np.searchsorted(L, p) - 1, 0, len(L) - 2); return j + (p - L[j]) / (L[j + 1] - L[j])
    def X(self, x): return self._at(self.V, (x - self.xr[0]) / self.step[0])
    def Y(self, y): return self._at(self.H, (self.yr[1] - y) / self.step[1])
    def gx(self, px): return self.xr[0] + self._inv(self.V, px) * self.step[0]
    def gy(self, py): return self.yr[1] - self._inv(self.H, py) * self.step[1]
    def base(self, font=12):
        """the start of a grid's spec: its cell or its uneven lines, its ranges, its grid's weight and grey as measured"""
        d = {"kind": "grid", "cell": [round(self.cell[0], 3), round(self.cell[1], 3)], "x": list(self.xr), "y": list(self.yr), "font": font}
        if self.step != (1, 1): d["step"] = list(self.step)
        if not self.even: d["xs"] = [round(v - self.V[0], 2) for v in self.V]; d["ys"] = [round(h - self.H[0], 2) for h in self.H]
        if self.gridg is not None and (abs(self.gridg - 149) > 12 or abs(self.gridw - 0.62 * font / 12) > 0.1): d["gridc"] = "#" + ("%02x" % min(255, self.gridg)) * 3; d["gridw"] = round(self.gridw, 2)
        if self.axg is not None and self.axg > 60: d["axc"] = "#" + ("%02x" % self.axg) * 3
        return d
    def dark(self, px, py, r=0.75, thr=110):
        s = self.s; a = self.im[max(0, int(round((py - r) * s))):int(round((py + r) * s)) + 1, max(0, int(round((px - r) * s))):int(round((px + r) * s)) + 1]
        return a.size and a.min() < thr
    def run(self, p, q, gap=1.2, reach=600, thr=110, r=0.6):
        """the ink along the line through page points p -> q: how far it runs beyond p backwards and beyond q forwards (points)"""
        ux, uy = q[0] - p[0], q[1] - p[1]; n = float(np.hypot(ux, uy)); ux, uy = ux / n, uy / n
        def walk(o, sg):
            last = 0.0; t = 0.0
            while t < reach:
                t += 0.125
                if self.dark(o[0] + sg * ux * t, o[1] + sg * uy * t, r, thr): last = t
                elif t - last > gap: break
            return last
        return walk(p, -1), walk(q, 1)
    def tips(self, a, b, dashed=False, thr=110):
        """the two ends of the stroke that runs through graph points a and b, in graph coordinates"""
        p, q = (self.X(a[0]), self.Y(a[1])), (self.X(b[0]), self.Y(b[1]))
        ux, uy = q[0] - p[0], q[1] - p[1]; n = float(np.hypot(ux, uy)); ux, uy = ux / n, uy / n
        back, fwd = self.run(p, q, gap=4.2 if dashed else 1.2, thr=thr)
        t0 = (p[0] - ux * back, p[1] - uy * back); t1 = (q[0] + ux * fwd, q[1] + uy * fwd)
        return [round(self.gx(t0[0]), 3), round(self.gy(t0[1]), 3)], [round(self.gx(t1[0]), 3), round(self.gy(t1[1]), 3)]
    def taper(self, o, u, far, thr=110, half=7.0):
        """An arrowhead's tip, from its taper: walking from page point o along unit vector u as far as `far` (the last ink), the
           stroke's width is read across it; the head is where it is widest, and the straight line through its narrowing sides
           reaches zero at the tip. Returns the distance from o to the tip, or None where there is no head to read."""
        v = np.array([-u[1], u[0]]); prof = []
        for d in np.arange(max(0.0, far - 22), far + 0.5, 0.125):
            c = np.asarray(o, float) + np.asarray(u) * d; n = 0
            for sg in (1, -1):
                e = 0.0
                while e < half and self.dark(*(c + v * sg * e), r=0.07, thr=thr): e += 0.0625
                n += e
            prof.append((d, n))
        prof = [(d, w) for d, w in prof if w <= 8.0]                  # wider than any head: a stroke that crosses
        if not prof: return None
        top = max(w for d, w in prof); base = max(d for d, w in prof if w >= 0.93 * top)
        side = [(d, w) for d, w in prof if base < d <= base + 9 and 0.42 * top <= w <= 0.9 * top]       # the wide half of the head: a tick near the tip is not in it
        if top < 2.2 or len(side) < 6: return None
        ds, ws = np.array([d for d, w in side]), np.array([w for d, w in side])
        sl = np.median([(ws[j] - ws[i]) / (ds[j] - ds[i]) for i in range(len(ds)) for j in range(i + 3, len(ds))])        # Theil-Sen: a tick across the head does not pull it
        if sl >= -0.1: return None
        return float(np.median(ds - ws / sl))
    def trace(self, a, b, dashed=False, thr=110, half=3.0, heads=True):
        """the ends of the stroke near graph points a and b, following the stroke itself: its centre is read at many places,
           a line is fitted through those, and the ends are found along that line"""
        p, q = np.array([self.X(a[0]), self.Y(a[1])]), np.array([self.X(b[0]), self.Y(b[1])])
        for _ in range(2):
            u = (q - p) / np.hypot(*(q - p)); v = np.array([-u[1], u[0]]); n = float(np.hypot(*(q - p))); cs = []
            back, fwd = self.run(tuple(p), tuple(q), gap=4.2 if dashed else 1.2, thr=thr, r=1.2)
            for t in np.arange(-back + 8, n + fwd - 8, 1.0):
                c = p + u * t; ds = [d for d in np.arange(-half, half + 0.01, 0.125) if self.dark(*(c + v * d), r=0.13, thr=thr)]
                if ds and 1.0 <= (max(ds) - min(ds)) <= 3.4 and len(ds) >= 0.8 * (max(ds) - min(ds)) / 0.125: cs.append(c + v * (max(ds) + min(ds)) / 2)
            if len(cs) < 6: break
            cs = np.array(cs); m = cs.mean(axis=0); _, _, vt = np.linalg.svd(cs - m); d = vt[0]
            if np.dot(d, u) < 0: d = -d
            p, q = m + d * np.dot(p - m, d), m + d * np.dot(q - m, d)
        back, fwd = self.run(tuple(p), tuple(q), gap=4.2 if dashed else 1.2, thr=thr)
        u = (q - p) / np.hypot(*(q - p))
        tb, tf = (self.taper(p, -u, back, thr), self.taper(q, u, fwd, thr)) if heads else (None, None)          # an arrowhead's tip by its taper: a tick beyond it is not the line
        if tb is not None and abs(tb - back) < 9: back = tb
        if tf is not None and abs(tf - fwd) < 9: fwd = tf
        t0, t1 = p - u * back, q + u * fwd
        return [round(float(self.gx(t0[0])), 3), round(float(self.gy(t0[1])), 3)], [round(float(self.gx(t1[0])), 3), round(float(self.gy(t1[1])), 3)]
    def curve_end(self, f, t0, dt, thr=110, gap=1.4):
        """the end of a drawn curve: f(t) gives a graph point; from t0, step dt at a time while there is ink; returns the last t with ink"""
        t, last, lastp = t0, t0, None
        for _ in range(100000):
            t += dt; g = f(t); p = (self.X(g[0]), self.Y(g[1]))
            if not (self.box[0] - 4 <= p[0] <= self.box[2] + 4 and self.box[1] - 4 <= p[1] <= self.box[3] + 4): break
            if self.dark(p[0], p[1], 0.6, thr): last, lastp = t, p
            elif lastp is not None and np.hypot(p[0] - lastp[0], p[1] - lastp[1]) > gap: break
        return last
    def dashes(self, t0, t1, thr=110):
        """the dashes of a dashed stroke between its two ends (graph points): [start, end] of each run of ink, in points from t0"""
        p, q = np.array([self.X(t0[0]), self.Y(t0[1])]), np.array([self.X(t1[0]), self.Y(t1[1])]); n = float(np.hypot(*(q - p))); u = (q - p) / n
        on = [self.dark(*(p + u * d), r=0.3, thr=thr) for d in np.arange(0, n, 0.125)]
        return [(round(a * 0.125, 2), round((b + 1) * 0.125, 2)) for a, b in study.groups(np.flatnonzero(on))]
    def off(self, a, b, n=9, half=3.0, thr=110):
        """how far the stroke's centre sits from the line a-b, in points, at n places between them (to check the equation)"""
        p, q = np.array([self.X(a[0]), self.Y(a[1])]), np.array([self.X(b[0]), self.Y(b[1])]); u = (q - p) / np.hypot(*(q - p)); v = np.array([-u[1], u[0]]); out = []
        for i in range(1, n + 1):
            c = p + (q - p) * i / (n + 1); ds = [d for d in np.arange(-half, half + 0.01, 0.125) if self.dark(*(c + v * d), r=0.13, thr=thr)]
            out.append(round(float(np.mean(ds)), 2) if ds else None)
        return out
    def span(self, horiz, at, thr=110):
        """an axis: the graph values where its ink starts and ends (walking out from the middle of the grid, so a letter beyond the tip is not counted)"""
        mx, my = (self.xr[0] + self.xr[1]) / 2, (self.yr[0] + self.yr[1]) / 2
        if horiz:
            p = (self.X(mx), self.Y(at)); back, fwd = self.run(p, (p[0] + 1, p[1]), gap=1.0, thr=thr, r=0.3)
            return [round(self.gx(p[0] - back), 3), round(self.gx(p[0] + 1 + fwd), 3)]
        p = (self.X(at), self.Y(my)); back, fwd = self.run(p, (p[0], p[1] - 1), gap=1.0, thr=thr, r=0.3)
        return [round(self.gy(p[1] + back), 3), round(self.gy(p[1] - 1 - fwd), 3)]
    def ticks(self, horiz, at, d=2.4, thr=110):
        """the tick marks of an axis: graph values, read on a line d points to one side of it (and the other)"""
        out = []
        for sg in (-1, 1):
            if horiz:
                y = self.Y(at) + sg * d; row = self.im[int(round(y * self.s)), int(self.box[0] * self.s):int(self.box[2] * self.s)]
                out.append([round(self.gx(self.box[0] + (a + b + 1) / 2 / self.s), 2) for a, b in study.groups(np.flatnonzero(row < thr)) if (b - a + 1) / self.s < 2.5])
            else:
                x = self.X(at) + sg * d; col = self.im[int(self.box[1] * self.s):int(self.box[3] * self.s), int(round(x * self.s))]
                out.append(sorted(round(self.gy(self.box[1] + (a + b + 1) / 2 / self.s), 2) for a, b in study.groups(np.flatnonzero(col < thr)) if (b - a + 1) / self.s < 2.5))
        return out
    def dots(self, lo=1.5, hi=8.0, thr=120):
        x0, y0, x1, y1 = [int(v * self.s) for v in self.box]; reg = self.im[y0:y1, x0:x1] < thr
        opened = ndimage.binary_opening(reg, structure=np.ones((int(lo * self.s), int(lo * self.s)), bool))      # strokes thinner than a dot go
        lab, n = ndimage.label(opened); out = []
        for k, sl in enumerate(ndimage.find_objects(lab), 1):
            h, w = (sl[0].stop - sl[0].start) / self.s, (sl[1].stop - sl[1].start) / self.s
            if lo <= h <= hi and lo <= w <= hi and abs(h - w) < 1.0:
                cy, cx = ndimage.center_of_mass(lab[sl] == k)
                out.append((round(self.gx(self.box[0] + (sl[1].start + cx + 0.5) / self.s), 3), round(self.gy(self.box[1] + (sl[0].start + cy + 0.5) / self.s), 3), round((w + h) / 4, 2)))
        return out
    def fit(self, skip=(), thr=100, band=4.5):
        """the one straight stroke plotted on the grid: (slope, intercept) in graph units, from every dark pixel that is not an
           axis, a tick or text; and how far those pixels sit from the fitted line (points, 95th percentile)"""
        s = self.s; x0, y0, x1, y1 = [int(v * s) for v in self.box]; m = self.im[y0:y1, x0:x1] < thr
        def wipe(px0, py0, px1, py1): m[max(0, int((py0 - self.box[1]) * s)):max(0, int((py1 - self.box[1]) * s)) + 1, max(0, int((px0 - self.box[0]) * s)):max(0, int((px1 - self.box[0]) * s)) + 1] = False
        ax, ay = self.X(0 if self.xr[0] <= 0 <= self.xr[1] else self.xr[0]), self.Y(0 if self.yr[0] <= 0 <= self.yr[1] else self.yr[0])
        wipe(ax - band, self.box[1], ax + band, self.box[3]); wipe(self.box[0], ay - band, self.box[2], ay + band)
        for x, y, w, size, t, f in study.text(self.items, self.box): wipe(x - 1, y - 0.8 * size, x + w + 1, y + 0.25 * size)
        for b in skip: wipe(*b)
        ys, xs = np.nonzero(m); gx, gy = self.gx(self.box[0] + (xs + 0.5) / s), self.gy(self.box[1] + (ys + 0.5) / s)
        if np.ptp(gx) >= np.ptp(gy): a, b = np.polyfit(gx, gy, 1); res = np.abs(gy - (a * gx + b)) / np.hypot(1, a) * self.cell[0]; return ("y", round(float(a), 3), round(float(b), 3), round(float(np.percentile(res, 95)), 2), len(xs))
        a, b = np.polyfit(gy, gx, 1); res = np.abs(gx - (a * gy + b)) / np.hypot(1, a) * self.cell[0]; return ("x", round(float(a), 3), round(float(b), 3), round(float(np.percentile(res, 95)), 2), len(xs))
    def ticklen(self, horiz, at, v, thr=120):
        """a tick mark: (its length, its weight, the ink's grey) at graph value v on the axis that sits at `at`"""
        s = self.s
        if horiz:
            x, y = self.X(v), self.Y(at); col = self.im[int((y - 8) * s):int((y + 8) * s), int(round(x * s - 0.5))]; d = np.flatnonzero(col < thr)
            row = self.im[int(round((y - 2.0) * s)), int((x - 4) * s):int((x + 4) * s)]; w = np.flatnonzero(row < thr)
            return round(len(d) / s, 2), round(len(w) / s, 2), int(col.min())
        x, y = self.X(at), self.Y(v); row = self.im[int(round(y * s - 0.5)), int((x - 8) * s):int((x + 8) * s)]; d = np.flatnonzero(row < thr)
        col = self.im[int((y - 4) * s):int((y + 4) * s), int(round((x - 2.0) * s))]; w = np.flatnonzero(col < thr)
        return round(len(d) / s, 2), round(len(w) / s, 2), int(row.min())
    def weight(self, a, b, thr=None, half=5.0):
        """a stroke through graph points a and b: its weight (points) and its grey, read across it midway"""
        p, q = np.array([self.X(a[0]), self.Y(a[1])]), np.array([self.X(b[0]), self.Y(b[1])]); u = (q - p) / np.hypot(*(q - p)); v = np.array([-u[1], u[0]]); c = (p + q) / 2
        vals = [int(self.im[int(round((c + v * d)[1] * self.s - 0.5)), int(round((c + v * d)[0] * self.s - 0.5))]) for d in np.arange(-half, half + 0.01, 0.0625)]
        lo = min(vals); ink = [255 - x for x in vals]; return round(sum(i for i in ink if i > 0.25 * (255 - lo)) / (255 - lo) * 0.0625, 2), lo
    def head(self, horiz, at, k=1.0, thr=140):
        """the arrowhead at the far end of an axis: [length, width] in points at scale 1, or None where it is the usual 7.6 by 4"""
        tip = self.span(horiz, at)[1]; s = self.s; prof = []
        for d in np.arange(0.25, 16, 0.125):
            if horiz: x, y = self.X(tip) - d, self.Y(at); col = self.im[int((y - 8) * s):int((y + 8) * s), int(round(x * s - 0.5))]
            else: x, y = self.X(at), self.Y(tip) + d; col = self.im[int(round(y * s - 0.5)), int((x - 8) * s):int((x + 8) * s)]
            prof.append((d, (col < thr).sum() / s))
        top, base = 0.0, None                 # from the tip the head widens; where the width falls back to the line's, the head ends
        for d, w in prof:
            if w > top: top = w
            elif top >= 2.4 * k and w < 0.62 * top: base = d - 0.125; break
        if base is None: return None
        L, B = round((base + 0.3) / k, 1), round((top - 0.2) / k, 1)
        if not (6 <= L <= 11 and 3 <= B <= 6.2): return None        # something else was in the way (a tick, a plotted line): the usual size
        return None if abs(L - 7.6) <= 0.7 and abs(B - 4.0) <= 0.5 else [L, B]
    def radius(self, at, thr=128, reach=8.0):
        """a filled dot at graph point `at`: its radius, as the middle of how far its ink runs from its centre in 48 directions
           (a line through the dot makes a few of them long, and they do not count)"""
        c = (self.X(at[0]), self.Y(at[1])); out = []
        for k in range(48):
            t = 2 * np.pi * k / 48; d = 0.0
            while d < reach and self.im[int(round((c[1] + np.sin(t) * d) * self.s - 0.5)), int(round((c[0] + np.cos(t) * d) * self.s - 0.5))] < thr: d += 0.0625
            out.append(d)
        return round(float(np.median(out)), 2)
    def discs(self, R, thr=120, strokes=(), heads=9.0, why=False):
        """filled dots of radius about R (points): what is left of the ink after wearing 0.7 R off it all round is a dot's middle
           (a stroke thinner than a dot wears away). strokes: [tip, tip] of each arrowed stroke, page points: the wide part of
           an arrowhead is not a dot. Returns (x, y, radius): graph units, the radius in points."""
        x0, y0, x1, y1 = [int(v * self.s) for v in self.box]; reg = self.im[y0:y1, x0:x1] < thr
        n = int(round(0.7 * R * self.s)); yy, xx = np.ogrid[-n:n + 1, -n:n + 1]; disk = xx * xx + yy * yy <= n * n
        lab, cnt = ndimage.label(ndimage.binary_erosion(reg, structure=disk)); out = []
        def inhead(px, py):
            for a, b in strokes:
                a, b = np.array(a, float), np.array(b, float); u = (b - a) / np.hypot(*(b - a)); p = np.array([px, py])
                for tip, d in ((a, u), (b, -u)):
                    along = np.dot(p - tip, d); q = p - tip; across = abs(d[0] * q[1] - d[1] * q[0])
                    if -1 <= along <= heads and across < 1.5: return True
            return False
        for k, sl in enumerate(ndimage.find_objects(lab), 1):
            cy, cx = ndimage.center_of_mass(lab[sl] == k); px, py = self.box[0] + (sl[1].start + cx + 0.5) / self.s, self.box[1] + (sl[0].start + cy + 0.5) / self.s
            g = (float(self.gx(px)), float(self.gy(py))); r = self.radius(g); bad = "head" if inhead(px, py) else "" if 0.75 * R <= r <= 1.35 * R else f"r {r}"
            if why and bad: print(f"      left out ({g[0]:.2f}, {g[1]:.2f}): {bad}")
            if not bad: out.append((round(g[0], 3), round(g[1], 3), r))
        return sorted(out)
    def texts(self):
        """the text inside the box: (x, baseline) from the grid's top-left corner, width, size, string"""
        return [(round(x - self.at[0], 2), round(y - self.at[1], 2), w, size, t) for x, y, w, size, t, f in study.text(self.items, self.box)]
    def ref(self): return {"doc": self.doc, "page": self.page, "at": [round(self.at[0], 3), round(self.at[1], 3)]}

def snap(im, s, pts, box, closed=False, thr=110, wipe=(), reach=3.0, build=None):
    """Move a polyline's corners onto the stroke the state drew: pts are page points; the stroke's centre line (its skeleton)
       inside box is what they are fitted to. Returns the corners and how far the fitted line still is from the stroke (points).
       build makes the corners from the numbers that are free (so some can be held where they are); without it every corner is free."""
    from skimage.morphology import skeletonize
    from scipy.optimize import minimize
    from scipy.spatial import cKDTree
    x0, y0, x1, y1 = [int(v * s) for v in box]; m = im[y0:y1, x0:x1] < thr
    for b in wipe: m[max(0, int((b[1] - box[1]) * s)):max(0, int((b[3] - box[1]) * s)) + 1, max(0, int((b[0] - box[0]) * s)):max(0, int((b[2] - box[0]) * s)) + 1] = False
    sk = skeletonize(m); d = ndimage.distance_transform_edt(~sk) / s
    ys, xs = np.nonzero(sk); SK = np.stack([box[0] + (xs + 0.5) / s, box[1] + (ys + 0.5) / s], 1)
    def sample(P, step=0.25):
        P = np.asarray(P, float); Q = np.vstack([P, P[:1]]) if closed else P; out = []
        for a, b in zip(Q, Q[1:]):
            n = max(2, int(np.hypot(*(b - a)) / step)); out.append(a + (b - a) * np.linspace(0, 1, n)[:, None])
        return np.vstack(out)
    mk = build or (lambda v: np.asarray(v, float).reshape(-1, 2))
    S0 = sample(mk(np.asarray(pts, float).ravel())); near = SK[cKDTree(S0).query(SK)[0] < reach]
    def at(S):
        ix = np.clip(((S[:, 0] - box[0]) * s).astype(int), 0, d.shape[1] - 1); iy = np.clip(((S[:, 1] - box[1]) * s).astype(int), 0, d.shape[0] - 1); return d[iy, ix]
    def cost(v):
        S = sample(mk(v)); return float(np.mean(at(S) ** 2) + (np.mean(cKDTree(S).query(near)[0] ** 2) if len(near) else 0))
    v0 = np.asarray(pts, float).ravel(); r = minimize(cost, v0, method="Powell", options={"xtol": 0.01, "ftol": 1e-6, "maxiter": 6000})
    return [[round(float(a), 2), round(float(b), 2)] for a, b in np.asarray(mk(r.x), float).reshape(-1, 2)], round(float(np.sqrt(r.fun)), 3)
def circle(im, s, c, r, box, thr=110, band=2.0, wipe=()):
    """A drawn circle near centre c and radius r (page points): the least-squares circle through the middle of its stroke"""
    from skimage.morphology import skeletonize
    x0, y0, x1, y1 = [int(v * s) for v in box]; m = im[y0:y1, x0:x1] < thr
    for b in wipe: m[max(0, int((b[1] - box[1]) * s)):max(0, int((b[3] - box[1]) * s)) + 1, max(0, int((b[0] - box[0]) * s)):max(0, int((b[2] - box[0]) * s)) + 1] = False
    ys, xs = np.nonzero(skeletonize(m)); P = np.stack([box[0] + (xs + 0.5) / s, box[1] + (ys + 0.5) / s], 1)
    for _ in range(3):
        rr_ = np.hypot(P[:, 0] - c[0], P[:, 1] - c[1]); Q = P[np.abs(rr_ - r) < band]
        A = np.c_[2 * Q[:, 0], 2 * Q[:, 1], np.ones(len(Q))]; sol = np.linalg.lstsq(A, (Q ** 2).sum(1), rcond=None)[0]
        c = (float(sol[0]), float(sol[1])); r = float(np.sqrt(sol[2] + sol[0] ** 2 + sol[1] ** 2)); band = max(0.6, band / 2)
    return (round(c[0], 2), round(c[1], 2)), round(r, 2), len(Q)

def zigzag(g, lo_x, lo_y, guess, box):
    """The break in a y-axis that starts at graph point (lo_x, lo_y): its corners, in points from that corner. The first and
       last corners stay on the axis; guess is the four corners above the corner, as [dx, dy]."""
    ox, oy = g.X(lo_x), g.Y(lo_y)
    def build(v): return np.array([[ox, oy + v[0]], [ox + v[1], oy + v[2]], [ox + v[3], oy + v[4]], [ox, oy + v[5]], [ox, oy]])
    v0 = [guess[0][1], guess[1][0], guess[1][1], guess[2][0], guess[2][1], guess[3][1]]
    P, err = snap(g.im, g.s, v0, box, build=build)
    return [[round(a - ox, 2), round(b - oy, 2)] for a, b in P[:4]], err
