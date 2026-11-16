"""Make a set of drawings from a dump of the state's PDFs (Cadence's tools/pdf-dump.html at Render scale 4: page images
   2448 pixels wide, 4 pixels a point):

     python3 draw/measure/make.py <dump-folder> [--specs <folder>] [--out <folder>] [set ...] [--only name,name] [--keep]

   A set is a Python file in --specs (the folder this is run from, without it) that reads each picture off its page with the
   helpers here (spec.py, measure.py, shapes.py) and holds
     TEST = "a7/fast-2025"                       where its drawings go, under --out
     OUT  = { name: { "spec": {...}, "ref": {...} } }   each picture's spec for the kit, and where it is on its page
   Without a set named, every such file in --specs. For each set this draws the specs (render.mjs), sets every piece of text
   where the state set it, draws again, lays each drawing over the state's and prints how far apart they are. Then it writes
     <out>/<TEST>/draw.json     the specs, by picture name (what a page's builder hands to draw.js)
     <out>/<TEST>/state/        the state's own pictures, cut from its pages (16 greys), and index.json: where each
                                drawing's (0, 0) is in its picture and the state's text there — what ../check.mjs holds the
                                drawings to, with no dump at hand
   and exits 1 when a drawing has more than 1% of its ink, or of the state's, over 0.75 pt from the other's.
   --only draws some pictures and writes nothing; --keep leaves the working folder (the .over.png overlays) in place.
   numpy, scipy, scikit-image, OpenCV, Pillow; Node and Playwright for the drawing."""
import sys, os, json, subprocess, statistics, importlib, tempfile, shutil
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
BLACK, WHITE = 40, 250       # the page's darkest ink to black and its paper to white; every tint between keeps its place

def render(specs, out, names=None):
    subprocess.run(["node", os.path.join(HERE, "render.mjs"), specs, out] + ([",".join(names)] if names else []), check=True)

def nudge(out, OUT, names):
    """move each piece of text to where the state has it: an axis's numbers together when they are all off the same way, then one by one"""
    moved = 0
    for name in names:
        spec = OUT[name]["spec"]; L, pairs, lone, extra, theirs, ours = compare.texts(out, name)
        off = {p[0]["id"]: (-p[2], -p[3]) for p in pairs if p[0]["id"]}            # what to add to ours
        size = {p[0]["id"]: p[1][3] for p in pairs if p[0]["id"] and abs(p[0]["size"] - p[1][3]) > 0.15}      # a number the state set in another size
        def r(v): return round(v, 2)
        if spec["kind"] == "grid":
            for axn in "xy":
                A = spec.get("axes", {}).get(axn)
                if not A: continue
                ids = [(i, d) for i, d in off.items() if i.startswith(axn + ":")]
                if ids:
                    mx, my = statistics.median(d[0] for i, d in ids), statistics.median(d[1] for i, d in ids)
                    nd = A.get("numd", [0, 0])
                    if abs(mx) > 0.12 or abs(my) > 0.12: A["numd"] = [r(nd[0] + mx), r(nd[1] + my)]; moved += 1
                    else: mx = my = 0
                    nums = []
                    for e in A["nums"]:
                        v = e[0] if isinstance(e, list) else e; d = off.get(f"{axn}:{v}")
                        ex, ey = (e[1], e[2]) if isinstance(e, list) else (0, 0)
                        if d and (abs(d[0] - mx) > 0.3 or abs(d[1] - my) > 0.3): ex, ey = r(ex + d[0] - mx), r(ey + d[1] - my); moved += 1
                        sz = size.get(f"{axn}:{v}") or (e[3] if isinstance(e, list) and len(e) > 3 else None)
                        if sz and not (isinstance(e, list) and len(e) > 3): moved += 1
                        nums.append([v, ex, ey, sz] if sz else [v, ex, ey] if (ex or ey) else v)
                    A["nums"] = nums
                for key, fld in ((axn + "name", "named"), (axn + "title", "titled")):
                    d = off.get(key)
                    if d and (abs(d[0]) > 0.2 or abs(d[1]) > 0.2): o = A.get(fld, [0, 0]); A[fld] = [r(o[0] + d[0]), r(o[1] + d[1])]; moved += 1
                if isinstance(A.get("title"), list):                  # the second line of a title, on its own
                    for j in range(1, len(A["title"])):
                        d = off.get(f"{axn}title{j}")
                        if d and (abs(d[0]) > 0.2 or abs(d[1]) > 0.2): e = A["title"][j]; e = e if isinstance(e, list) else [e, 0, 0]; A["title"][j] = [e[0], r(e[1] + d[0]), r(e[2] + d[1])]; moved += 1
            d = off.get("title")
            if d and (abs(d[0]) > 0.2 or abs(d[1]) > 0.2): o = spec.get("titled", [0, 0]); spec["titled"] = [r(o[0] + d[0]), r(o[1] + d[1])]; moved += 1
            d = off.get("zero")
            if d and (abs(d[0]) > 0.2 or abs(d[1]) > 0.2):
                z = spec.get("zero") if isinstance(spec.get("zero"), dict) else {"d": [0, 0]}; z["d"] = [r(z["d"][0] + d[0]), r(z["d"][1] + d[1])]; spec["zero"] = z; moved += 1
        if spec["kind"] == "numberline":
            ds = [d for i, d in off.items() if i.startswith("n:")]
            if ds and abs(statistics.median(d[1] for d in ds)) > 0.12: spec["numy"] = r(spec.get("numy", 18.15) + statistics.median(d[1] for d in ds)); moved += 1
        if spec["kind"] == "grid":
            for i, p in enumerate(spec.get("plots", [])):
                    d = off.get(f"plot:{i}")
                    if d and (abs(d[0]) > 0.2 or abs(d[1]) > 0.2): o = p.get("d", [0, 0]); p["d"] = [r(o[0] + d[0]), r(o[1] + d[1])]; moved += 1
    return moved

def greys16(g):
    """The picture in 16 greys chosen for it (a palette PNG, as the Grade 8 test's are): white and the ink's black kept exact,
       the other fourteen put where the picture's tones are (1-D k-means over its histogram), so a flat tint stays one flat tint."""
    g = g.copy(); h = np.bincount(g.ravel(), minlength=256).astype(float); lv = np.arange(256.0)
    # a flat fill (a shaded half-plane, a pie sector, a bar) comes off a lossy page as a few neighbouring greys: make it one
    near = np.convolve(h, np.ones(7), "same"); taken = np.zeros(256, bool); flats = []
    for v in np.argsort(-near):
        if near[v] < 0.012 * g.size: break
        if 12 <= v <= 247 and not taken[max(0, v - 9):v + 10].any():
            pk = int(max(range(max(0, v - 3), min(256, v + 4)), key=lambda i: h[i])); flats.append(pk); taken[max(0, pk - 8):pk + 9] = True
    if flats:
        lut = np.arange(256)
        for pk in flats: lut[max(0, pk - 8):pk + 9] = pk
        g = lut[g].astype(np.uint8); h = np.bincount(g.ravel(), minlength=256).astype(float)
    lo = int(np.flatnonzero(h)[0]); c = np.linspace(lo, 255, 16)
    for j, pk in enumerate(sorted(flats)[:12]): c[1 + j] = pk       # each flat fill gets a grey of its own
    c = np.sort(c); fixed = set(flats)
    w = np.sqrt(h)                                            # the square root: thin lines and edges count beside the big flat areas
    for _ in range(60):
        k = np.abs(lv[:, None] - c[None, :]).argmin(1)
        for j in range(1, 15):
            m = k == j
            if int(round(c[j])) in fixed: continue
            if w[m].sum() > 0: c[j] = (w[m] * lv[m]).sum() / w[m].sum()
        c = np.sort(c); c[0], c[15] = lo, 255
    c = np.unique(np.round(c).astype(int)); k = np.abs(lv[:, None] - c[None, :]).argmin(1).astype(np.uint8)
    out = Image.fromarray(k[g], "P"); out.putpalette(sum([[int(v)] * 3 for v in c], []) + [0] * (768 - 3 * len(c)))
    return out


def state(out, name, dst):
    """the state's own picture of a drawing: its page cut 3 points wider than the drawing all round; and where the drawing's
       (0, 0) is in it, with the state's text there"""
    L, pairs, lone, extra, theirs, ours = compare.texts(out, name); ref = L["ref"]; im, items = compare.page(ref["doc"], ref["page"]); S = compare.S
    x0, y0 = ref["at"][0] + L["x"] - 3, ref["at"][1] + L["y"] - 3
    a = im[int(round(y0 * S)):int(round((y0 + L["h"] + 6) * S)), int(round(x0 * S)):int(round((x0 + L["w"] + 6) * S))].astype(float)
    a = np.clip((a - BLACK) * 255.0 / (WHITE - BLACK), 0, 255).round().astype(np.uint8)
    greys16(a).save(os.path.join(dst, name + ".png"), optimize=True)
    return {"o": [round(ref["at"][0] - x0, 2), round(ref["at"][1] - y0, 2)], "texts": [[round(t[0], 2), round(t[1], 2), round(t[2], 2), t[3], t[4]] for t in theirs]}

if __name__ == "__main__":
    args = sys.argv[1:]; keep = "--keep" in args; opt = {"--only": None, "--specs": ".", "--out": "."}
    for k in opt:
        if k in args: i = args.index(k); opt[k] = args[i + 1]; del args[i:i + 2]
    args = [a for a in args if a != "--keep"]; only = opt["--only"].split(",") if opt["--only"] else None
    if not args: raise SystemExit(__doc__)
    os.environ["DRAW_DUMP"] = os.path.abspath(args[0]); SPECS, DEST = os.path.abspath(opt["--specs"]), os.path.abspath(opt["--out"])
    sys.path.insert(0, SPECS)
    import compare
    sets = args[1:] or sorted(f[:-3] for f in os.listdir(SPECS) if f.endswith(".py") and not f.startswith("_") and "\nTEST = " in "\n" + open(os.path.join(SPECS, f), encoding="utf-8").read())
    if not sets: raise SystemExit(f"no set of drawings in {SPECS}: a Python file there that holds TEST and OUT")
    worst = 0.0
    for t in sets:
        mod = importlib.import_module(t); OUT = mod.OUT; names = [n for n in OUT if not only or n in only]
        out = tempfile.mkdtemp(prefix="draw-" + t + "-"); specs = os.path.join(out, "specs.json")
        def save(): json.dump(OUT, open(specs, "w", encoding="utf-8"), ensure_ascii=False)
        save(); render(specs, out, names)
        for _ in range(3):
            if not nudge(out, OUT, names): break
            save(); render(specs, out, names)
        res = [compare.check(out, n) for n in names]; worst = max([worst] + [max(r[0], r[1]) for r in res])
        print(f"{t}: {len(names)} drawings; ink more than 0.75 pt from the other's: the state's {max(r[0] for r in res):.1f}%, the drawing's {max(r[1] for r in res):.1f}% at worst; "
              f"more than 0.4 pt, {max(r[4] for r in res):.1f}%; tints {max(r[5] for r in res):.1f}%; text {max(r[2] for r in res):.1f} pt")
        if not only:
            dst = os.path.join(DEST, *mod.TEST.split("/")); sd = os.path.join(dst, "state"); os.makedirs(sd, exist_ok=True)
            for f in os.listdir(sd): os.remove(os.path.join(sd, f))
            index = {n: state(out, n, sd) for n in names}
            with open(os.path.join(sd, "index.json"), "w", encoding="utf-8") as f: f.write("{\n" + ",\n".join(f" {json.dumps(n)}: {json.dumps(v, ensure_ascii=False)}" for n, v in index.items()) + "\n}\n")
            with open(os.path.join(dst, "draw.json"), "w", encoding="utf-8") as f: f.write("{\n" + ",\n".join(f" {json.dumps(n)}: {json.dumps(OUT[n]['spec'], ensure_ascii=False)}" for n in names) + "\n}\n")
            print(f"   wrote {os.path.relpath(dst)}/draw.json and state/ ({len(names)} pictures)")
        if keep: print("   working folder:", out)
        else: shutil.rmtree(out, ignore_errors=True)
    sys.exit(1 if worst > 1.0 else 0)
