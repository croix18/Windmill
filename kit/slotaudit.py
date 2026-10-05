"""Every expression a unit's decks paint in slot colours (HOUSE STYLE §2a), as the renderer reads
it, one line each: [base] in brackets and ^{exponent} marked where the two slots are the base and
the exponent; ⟨A:…⟩ ⟨B:…⟩ ⟨H:…⟩ where a spec names its slots (lib/slotmark.py). Rule 0 — a wrong
slot is a wrong statement about the mathematics — so this list is READ, line by line, after any
change to a spec's notes, worked examples or boards, and after any change to the reading rules.

    python3 slotaudit.py u3              → prints the list; the last line counts refusals
    python3 slotaudit.py u3 --geometry   → also renders each expression black (the renderer whose
        geometry shipped) and in colour, and compares the ink: colour must change the ink's
        colour and nothing else. checks.py runs the same comparison as `slotgeometry`.
"""
import sys, os, re, glob, importlib.util, tempfile
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from lib import mathimg, slotmark
from lib.profile import C
from matplotlib.font_manager import FontProperties

AUTO = C.SLOTS == "exponent"


def _specs(unit):
    fs = sorted(glob.glob(os.path.join(HERE, unit, "l[0-9]*.py")))
    rv = os.path.join(HERE, unit, "review.py")
    return fs + ([rv] if C.REVIEW_IN_DECK and os.path.exists(rv) else [])


def marks_in_specs(unit):
    """How many slot marks the unit's lesson specs carry, read from the source text."""
    return sum(len(re.findall(r"\\+s[ABH]\{", open(f, encoding="utf-8").read())) for f in _specs(unit))


def pieces(row):
    return [p[1:-1] for p in re.split(r"(\$[^$]+\$)", row) if p.startswith("$")]


def collect(unit):
    """(lesson code, surface, latex, point size) for every expression the unit's decks colour —
    the same surfaces lessonbuild._fill_deck marks slots=True."""
    rows = []
    for f in _specs(unit):
        sys.path.insert(0, os.path.dirname(f))
        sp = importlib.util.spec_from_file_location("l", f)
        m = importlib.util.module_from_spec(sp); sp.loader.exec_module(m)
        sys.path.pop(0)
        L = m.L; code = L["code"]
        for n in L["notes"]:
            for r in n.get("math", []):
                rows += [(code, "notes", x, 32) for x in pieces(r)]
            for it in n.get("items", []) + n.get("items2", []):
                t = it if isinstance(it, str) else " ".join(it)
                rows += [(code, "notes", x, 32) for x in pieces(t)]
        for ex in L["examples"]:
            for w in ex["worked"]:
                for r in w["rows"]:
                    if isinstance(r, tuple):
                        rows.append((code, "worked", r[0], 32))
                for it in w.get("items", []):
                    rows += [(code, "worked", x, 32) for x in pieces(it)]
            yt = ex.get("your_turn")
            if yt:
                for r in yt["prompt"]:
                    rows += [(code, "yt-reveal", x, 40) for x in pieces(r)]
        for q in L["whiteboard"]:
            if q.get("latex"):
                rows.append((code, "wb-reveal", q["latex"], 40))
            for r in q.get("text", []):
                rows += [(code, "wb-reveal", x, 32) for x in pieces(r)]
    # where the slots are named, only a marked expression is coloured; where they are read off the
    # layout, every expression on these surfaces is
    return rows if AUTO else [r for r in rows if slotmark.has(r[2])]


def show_named(latex, pt):
    """A marked expression as the renderer coloured it: each run of one slot's glyphs in ⟨…⟩."""
    latex = re.sub(r"\\frac(?![A-Za-z])", r"\\dfrac", latex)
    latex, pt, face = mathimg.slide_form(latex, pt)        # as the slide sets it (ruling 40)
    r, col, rcol = mathimg.named_colors(latex, pt, dpi=72, face=face)
    key = {v: k for k, v in slotmark.SLOT.items()}
    out, prev = [], None
    for g, c in zip(r.glyphs, col):
        tag = key.get(c)
        if tag != prev:
            if prev: out.append("⟩")
            if tag: out.append(f"⟨{tag}:")
        out.append(chr(g[2])); prev = tag
    if prev: out.append("⟩")
    return "".join(out)


def show(latex, pt):
    if slotmark.has(latex):
        return show_named(latex, pt)
    latex = re.sub(r"\\frac(?![A-Za-z])", r"\\dfrac", latex)
    latex, pt, face = mathimg.slide_form(latex, pt)        # as the slide sets it (ruling 40)
    r = mathimg._PARSER.parse(f"${latex}$", dpi=72, prop=mathimg._prop(pt, face))
    col = mathimg._slot_colors(r.glyphs, pt)
    out, prev = [], None
    for g, c in zip(r.glyphs, col):
        tag = {mathimg.CB1: "B", mathimg.CB2: "E"}.get(c, "")
        if tag != prev:
            if prev == "B": out.append("]")
            if prev == "E": out.append("}")
            if tag == "B": out.append("[")
            if tag == "E": out.append("^{")
        out.append(chr(g[2])); prev = tag
    if prev == "B": out.append("]")
    if prev == "E": out.append("}")
    return "".join(out)


def geometry_differs(latex, pt, render_colour=None):
    """Fraction of ink with no ink within 2 px in the other render, at the best alignment within
    3 px. Anti-aliasing and whole-pixel snapping move edges by a pixel; a misplaced bar, glyph or
    line moves them by many, and shows here. (It found, on 28 Sep, fraction bars drawn one
    thickness low and 1 pt too thick: 7.8% and 2.5% of ink displaced. Fixed: 0.12% worst.)"""
    import numpy as np
    from PIL import Image
    latex = re.sub(r"\\frac(?![A-Za-z])", r"\\dfrac", latex)
    d = tempfile.mkdtemp()
    a, b = os.path.join(d, "black.png"), os.path.join(d, "colour.png")
    latex, pt, face = mathimg.slide_form(latex, pt)        # both renders in the slide's own face
    mathimg._render(slotmark.strip(latex), pt, a, "#1A1A1A", face)
    if render_colour:
        render_colour(latex, pt, b)
    else:
        (mathimg._render_named if slotmark.has(latex) else mathimg._render_slots)(latex, pt, b, face)
    A = np.asarray(Image.open(a).split()[-1]) > 128
    B = np.asarray(Image.open(b).split()[-1]) > 128
    if abs(A.shape[0] - B.shape[0]) > 6 or abs(A.shape[1] - B.shape[1]) > 6:
        return 1.0
    H, W = max(A.shape[0], B.shape[0]) + 12, max(A.shape[1], B.shape[1]) + 12
    def place(M, dy=0, dx=0):
        P = np.zeros((H, W), bool)
        P[6 + dy:6 + dy + M.shape[0], 6 + dx:6 + dx + M.shape[1]] = M
        return P
    def grow(P, r=2):
        G = P.copy()
        for yy in range(-r, r + 1):
            for xx in range(-r, r + 1):
                G |= np.roll(np.roll(P, yy, 0), xx, 1)
        return G
    PA = place(A); GA = grow(PA)
    best = 1.0
    for dy in range(-3, 4):
        for dx in range(-3, 4):
            PB = place(B, dy, dx)
            miss = (PA & ~grow(PB)) | (PB & ~GA)
            best = min(best, float(miss.sum()) / max(1, int((PA | PB).sum())))
    return best


def geometry(unit, limit=0.005):
    """[(fraction, code, surface, latex)] for every expression over `limit`, and the worst."""
    worst, flagged, rows = 0.0, [], collect(unit)
    for code, where, latex, pt in rows:
        f = geometry_differs(latex, pt)
        worst = max(worst, f)
        if f > limit:
            flagged.append((f, code, where, latex))
    return sorted(flagged, reverse=True), worst, len(rows)


if __name__ == "__main__":
    unit = sys.argv[1] if len(sys.argv) > 1 else "u3"
    if "--geometry" in sys.argv:
        flagged, worst, n = geometry(unit)
        for f, code, where, latex in flagged:
            print(f"GEOMETRY {f:6.1%}  {code:5} {where:9} {latex}")
        print(f"geometry: {n} expressions rendered black and in colour; worst ink disagreement {worst:.2%}; {len(flagged)} over 0.5%")
        sys.exit(1 if flagged else 0)
    bad = 0
    rows = collect(unit)
    for code, where, latex, pt in rows:
        try:
            print(f"{code:5} {where:9} {show(latex, pt)}")
        except Exception as e:
            bad += 1
            print(f"{code:5} {where:9} REFUSED  {latex}   <- {e}")
    print(f"\n{len(rows)} expressions, {bad} refused")
