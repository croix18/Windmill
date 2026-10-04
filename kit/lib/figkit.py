"""Geometry figures, drawn from their numbers (first built for M7 Unit 5, MA.7.GR.1.5).

Same contract as mathimg: a figure is fingerprinted by its spec, drawn once into figs/, and
placed at its natural size so every figure in the corpus is drawn at one scale. Nothing here is
traced from Math Nation; the audit found their figures are routinely not drawn to their own
labels (aspect off by 30%, a "scale model" at 70% of the original), so ours are drawn from the
numbers and the drawing IS the check.

Kinds:
  rect      one rectangle, side labels          dict(kind="rect", w=, h=, unit=, name=)
  rects     two rectangles, drawn to scale      dict(kind="rects", a=(w,h), b=(w,h), ...)
  poly      a closed polygon with side labels   dict(kind="poly", pts=[(x,y)...], labels=[...])
  grid      a polygon on a unit grid            dict(kind="grid", cols=, rows=, pts=[...])
Every kind may carry `title`. Lengths are in the figure's own units and the drawing is to scale.
"""
import os, json, hashlib
import matplotlib
matplotlib.use("Agg")
matplotlib.rcParams["font.family"] = "STIXGeneral"
matplotlib.rcParams["mathtext.fontset"] = "stix"
import matplotlib.pyplot as plt
from matplotlib.patches import Polygon as MplPoly
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
FIGS = os.path.normpath(os.path.join(HERE, "..", "figs"))
INDEX = os.path.join(FIGS, "figindex.json")
DPI = 300
INK = "#1A1A1A"
FILL = "#EDEDEA"
GRID = "#C8C8C8"
RED = "#9E1B32"



def _save(idx):
    """Atomic, and safe when several builds run at once: each writer has its own temp file,
    and the index is re-read and merged just before the swap so a parallel build's entries are
    kept rather than overwritten (27 September — two builds sharing one .tmp corrupted it)."""
    os.makedirs(FIGS, exist_ok=True)
    tmp = f"{INDEX}.{os.getpid()}.tmp"
    merged = {}
    try:
        merged = json.load(open(INDEX))
    except Exception:
        merged = {}
    merged.update(idx)
    with open(tmp, "w") as f:
        json.dump(merged, f, indent=0, sort_keys=True)
    os.replace(tmp, INDEX)


def _load():
    try:
        return json.load(open(INDEX)) if os.path.exists(INDEX) else {}
    except Exception:
        return {}


def _in_poly(pt, poly, eps=1e-6):
    """True when pt lies inside the polygon or on its boundary."""
    x, y = pt; n = len(poly); c = False
    for i in range(n):
        (x1, y1), (x2, y2) = poly[i], poly[(i + 1) % n]
        cross = (x2 - x1) * (y - y1) - (y2 - y1) * (x - x1)
        if abs(cross) <= eps * max(1.0, abs(x2 - x1) + abs(y2 - y1)) \
                and min(x1, x2) - eps <= x <= max(x1, x2) + eps and min(y1, y2) - eps <= y <= max(y1, y2) + eps:
            return True
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1:
            c = not c
    return c


def _key(spec):
    return hashlib.sha1(json.dumps(spec, sort_keys=True).encode()).hexdigest()[:16]


def _finish(fig, ax, path, target_in):
    ax.set_aspect("equal"); ax.axis("off")
    fig.savefig(path, dpi=DPI, bbox_inches="tight", pad_inches=0.04, transparent=True)
    plt.close(fig)
    im = Image.open(path)
    w = im.width / DPI
    k = target_in / w if w else 1
    return path, im.width / DPI * k, im.height / DPI * k


def _side_labels(ax, pts, labels, fs):
    n = len(pts)
    cx = sum(p[0] for p in pts) / n
    cy = sum(p[1] for p in pts) / n
    for i, lab in enumerate(labels):
        if not lab:
            continue
        x0, y0 = pts[i]; x1, y1 = pts[(i + 1) % n]
        mx, my = (x0 + x1) / 2, (y0 + y1) / 2
        dx, dy = mx - cx, my - cy
        d = max((dx * dx + dy * dy) ** 0.5, 1e-6)
        off = 0.10 * max(abs(max(p[0] for p in pts) - min(p[0] for p in pts)),
                         abs(max(p[1] for p in pts) - min(p[1] for p in pts)))
        ax.text(mx + dx / d * off, my + dy / d * off, lab, ha="center", va="center",
                fontsize=fs, color=INK)


def draw(spec, target_in=None):
    """Render `spec` (a dict) and return (path, width_in, height_in)."""
    idx = _load()
    k = _key(spec)
    path = os.path.join(FIGS, f"g{k}.png")
    kind = spec["kind"]
    tw = target_in or spec.get("in", 3.6)
    if os.path.exists(path) and k in idx:
        w, h = idx[k]
        scale = tw / w
        return path, tw, h * scale

    fs = spec.get("fs", 13)
    if kind in ("rect", "rects"):
        boxes = [spec["a"]] if kind == "rect" else [spec["a"], spec["b"]]
        names = spec.get("names", [""] * len(boxes))
        labs = spec.get("labels", [None] * len(boxes))
        gap = max(b[0] for b in boxes) * 0.45
        fig, ax = plt.subplots(figsize=(6, 4))
        x = 0.0
        for i, (w, h) in enumerate(boxes):
            ax.add_patch(plt.Rectangle((x, 0), w, h, facecolor=FILL, edgecolor=INK, linewidth=1.4))
            lab = labs[i] or (f"{w}", f"{h}")
            ax.text(x + w / 2, -0.10 * max(h, 1), lab[0], ha="center", va="top", fontsize=fs, color=INK)
            ax.text(x - 0.05 * max(w, 1), h / 2, lab[1], ha="right", va="center", fontsize=fs, color=INK)
            if names[i]:
                ax.text(x + w / 2, h + 0.10 * max(h, 1), names[i], ha="center", va="bottom",
                        fontsize=fs + 1, color=INK, fontweight="bold")
            x += w + gap
        ax.autoscale_view()
        ax.set_xlim(-0.3 * max(b[0] for b in boxes), x - gap + 0.3 * max(b[0] for b in boxes))
        ax.set_ylim(-0.45 * max(b[1] for b in boxes), max(b[1] for b in boxes) * 1.35)
    elif kind == "poly":
        pts = [tuple(p) for p in spec["pts"]]
        fig, ax = plt.subplots(figsize=(6, 4))
        ax.add_patch(MplPoly(pts, closed=True, facecolor=FILL, edgecolor=INK, linewidth=1.4))
        _side_labels(ax, pts, spec.get("labels", []), fs)
        xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
        mx = (max(xs) - min(xs)) * 0.28 + 0.4; my = (max(ys) - min(ys)) * 0.28 + 0.4
        ax.set_xlim(min(xs) - mx, max(xs) + mx); ax.set_ylim(min(ys) - my, max(ys) + my)
        if spec.get("title"):
            ax.text((min(xs) + max(xs)) / 2, max(ys) + my * 0.55, spec["title"], ha="center",
                    va="bottom", fontsize=fs + 1, color=INK, fontweight="bold")
    elif kind == "grid":
        cols, rows = spec["cols"], spec["rows"]
        fig, ax = plt.subplots(figsize=(6, 4))
        for i in range(cols + 1):
            ax.plot([i, i], [0, rows], color=GRID, linewidth=0.7, zorder=0)
        for j in range(rows + 1):
            ax.plot([0, cols], [j, j], color=GRID, linewidth=0.7, zorder=0)
        for gp in spec.get("polys", []):
            pts = [tuple(p) for p in gp["pts"]]
            ax.add_patch(MplPoly(pts, closed=True, facecolor=gp.get("fill", FILL),
                                 edgecolor=gp.get("edge", INK), linewidth=1.6, zorder=2))
            if gp.get("name"):
                cx = sum(p[0] for p in pts) / len(pts); cy = sum(p[1] for p in pts) / len(pts)
                ax.text(cx, cy, gp["name"], ha="center", va="center", fontsize=fs + 1,
                        color=INK, fontweight="bold", zorder=3)
        ax.set_xlim(-0.6, cols + 0.6); ax.set_ylim(-0.6, rows + 0.6)
        if spec.get("note"):
            ax.text(cols / 2, -0.55, spec["note"], ha="center", va="top", fontsize=fs, color=INK)
    elif kind == "shapes" and spec.get("pt") and not spec.get("_pass2"):
        # Two passes: draw once to learn the saved width, then redraw with the font size that
        # lands the labels at `pt` points AFTER the figure is scaled to its target width, so every
        # figure in the corpus carries labels of one size whatever its shape.
        probe = dict(spec); probe["_pass2"] = True; probe["fs"] = 20
        ppath, pw, ph = draw(probe, 20.0 / 20.0 * 6.0)      # draw at a nominal width
        im = Image.open(ppath); w0 = im.width / DPI          # natural width at fs 20
        factor = tw / w0
        final = dict(spec); final["_pass2"] = True; final["fs"] = round(spec["pt"] / factor, 2)
        fpath, fw, fh = draw(final, tw)
        idx = _load(); idx[k] = idx.get(_key(final)); _save(idx)
        return fpath, fw, fh
    elif kind == "shapes":
        # A free composition for the area unit (Unit 4): polygons, circles and wedges, dashed
        # heights, right-angle marks and labels, each placed in the figure's own units.
        #   {"t":"poly","pts":[...]}                     filled polygon
        #   {"t":"circle","c":(x,y),"r":R,"a":(a0,a1)}   circle, or the wedge from a0 to a1 degrees
        #   {"t":"seg","a":(x,y),"b":(x,y),"dash":True}  a segment (dashed = a height or diagonal)
        #   {"t":"ra","xy":(x,y),"u":(dx,dy),"v":(dx,dy),"s":k}   right-angle mark at xy
        #   {"t":"text","xy":(x,y),"s":"12 cm","ha":..,"va":..}
        from matplotlib.patches import Wedge, Circle
        fig, ax = plt.subplots(figsize=(6, 4))
        xs, ys = [], []
        for sh in spec["shapes"]:
            t = sh["t"]
            if t == "poly":
                pts = [tuple(q) for q in sh["pts"]]
                ax.add_patch(MplPoly(pts, closed=True, facecolor=sh.get("fill", FILL),
                                     edgecolor=INK, linewidth=1.4, zorder=2))
                xs += [q[0] for q in pts]; ys += [q[1] for q in pts]
            elif t == "circle":
                cx, cy = sh["c"]; r = sh["r"]
                if sh.get("a"):
                    ax.add_patch(Wedge((cx, cy), r, sh["a"][0], sh["a"][1], facecolor=sh.get("fill", FILL),
                                       edgecolor=INK, linewidth=1.4, zorder=2))
                else:
                    ax.add_patch(Circle((cx, cy), r, facecolor=sh.get("fill", FILL), edgecolor=INK,
                                        linewidth=1.4, zorder=2))
                xs += [cx - r, cx + r]; ys += [cy - r, cy + r]
            elif t == "seg":
                (x0, y0), (x1, y1) = sh["a"], sh["b"]
                if sh.get("height"):
                    # a height runs from one side of its figure to the other, inside it. One drawn
                    # at a fixed spot fell beside a steep parallelogram and ended in empty space
                    # (M7 4.01 Example 1; Croix, 4 Oct: "that one won't work").
                    polys = [[tuple(q) for q in o["pts"]] for o in spec["shapes"] if o["t"] == "poly"]
                    for end in ((x0, y0), (x1, y1)):
                        if not any(_in_poly(end, p) for p in polys):
                            raise ValueError(f"a height ends outside its figure at {end}: {sh}")
                ax.plot([x0, x1], [y0, y1], color=sh.get("color", INK), linewidth=1.2,
                        linestyle="--" if sh.get("dash") else "-", zorder=3)
                xs += [x0, x1]; ys += [y0, y1]
            elif t == "ra":
                (x, y), (ux, uy), (vx, vy), sz = sh["xy"], sh["u"], sh["v"], sh.get("s", 0.5)
                nu = (ux * ux + uy * uy) ** 0.5; nv = (vx * vx + vy * vy) ** 0.5
                ux, uy, vx, vy = ux / nu * sz, uy / nu * sz, vx / nv * sz, vy / nv * sz
                ax.plot([x + ux, x + ux + vx, x + vx], [y + uy, y + uy + vy, y + vy],
                        color=INK, linewidth=1.0, zorder=3)
            elif t == "text":
                ax.text(sh["xy"][0], sh["xy"][1], sh["s"], ha=sh.get("ha", "center"),
                        va=sh.get("va", "center"), fontsize=sh.get("fs", fs), color=sh.get("color", INK), zorder=4)
                xs.append(sh["xy"][0]); ys.append(sh["xy"][1])
            else:
                raise ValueError(f"unknown shape {t}")
        mx = (max(xs) - min(xs)) * 0.16 + 0.4; my = (max(ys) - min(ys)) * 0.16 + 0.4
        ax.set_xlim(min(xs) - mx, max(xs) + mx); ax.set_ylim(min(ys) - my, max(ys) + my)
    else:
        raise ValueError(f"unknown figure kind {kind}")

    os.makedirs(FIGS, exist_ok=True)
    ax.set_aspect("equal"); ax.axis("off")
    fig.savefig(path, dpi=DPI, bbox_inches="tight", pad_inches=0.05, transparent=True)
    plt.close(fig)
    im = Image.open(path)
    w0, h0 = im.width / DPI, im.height / DPI
    idx[k] = [w0, h0]; _save(idx)
    scale = tw / w0
    return path, tw, h0 * scale
