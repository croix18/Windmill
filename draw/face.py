"""Draw Sans, the drawing kit's own face (fonts/draw-sans*.woff2): DejaVu Sans 2.37 — the open face nearest Verdana, the
   state's — cut down to the characters a picture's text uses and set on Verdana's advance widths (the kit's own tables in
   draw.js, measured on the state's pages), each character centered in its new width, with no kerning and no ligatures (the
   state's text has neither) and no hinting. A page that shows drawings carries it, for the devices that have no Verdana (a
   Chromebook, an Android phone): there too a number sits where the kit put it.

     python3 draw/face.py [<folder holding DejaVuSans.ttf, DejaVuSans-Bold.ttf, DejaVuSans-Oblique.ttf>]    make the three files
     python3 draw/face.py --tables [<folder>]     print the kit's XR and XB tables, to paste into draw.js
     python3 draw/face.py --check                 hold the three files to the kit's tables, with no DejaVu at hand (exit 1)

   A character the state's pages gave no width for keeps DejaVu's own, and the kit must know it: making stops when the kit's
   XR and XB tables are not those widths. The oblique is set on the book's widths throughout (the kit has one table for both);
   a letter with an accent is as wide as the letter (the kit's rule too).
   DejaVu's license (Bitstream Vera's and Arev's) lets a changed font be given out under another name; it is kept inside
   each file and beside them (fonts/LICENSE-Draw-Sans.txt). fontTools, brotli (for WOFF2), Node (to read the kit's tables)."""
import sys, os, json, subprocess, unicodedata
from fontTools.ttLib import TTFont
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, "fonts")
CHARS = ("".join(chr(c) for c in range(0x20, 0x7F)) + "".join(chr(c) for c in range(0xA0, 0x100))
         + "–—‘’“”•…′″−≈≠≤≥√∞πθΔ∠⊥∥△≅∼")
FACES = [("DejaVuSans.ttf", "draw-sans.woff2", "Book", "regular", "DrawSans-Book"), ("DejaVuSans-Bold.ttf", "draw-sans-bold.woff2", "Bold", "bold", "DrawSans-Bold"),
         ("DejaVuSans-Oblique.ttf", "draw-sans-oblique.woff2", "Oblique", "regular", "DrawSans-Oblique")]      # italic is set on the regular widths
NOTE = "Draw Sans is DejaVu Sans 2.37 cut down to the characters a drawing's text uses and set on other advance widths, without hinting, kerning or ligatures."

def kit():
    js = "const fs=require('fs');const w={};new Function('window',fs.readFileSync(process.argv[1],'utf8'))(w);console.log(JSON.stringify(w.Draw.widths))"
    return json.loads(subprocess.run(["node", "-e", js, os.path.join(HERE, "draw.js")], check=True, capture_output=True, text=True).stdout)

def width(K, table, c):
    """the kit's width for a character, thousandths of an em: the state's, else Draw Sans's own, else its letter's"""
    more = "moreBold" if table == "bold" else "more"
    return K[table].get(c) or K[more].get(c) or K[table].get(unicodedata.normalize("NFD", c)[0])

def make(src, W):
    """the subset of one DejaVu file set on the widths W (thousandths of an em); and DejaVu's own widths for the rest"""
    from fontTools import subset
    from fontTools.pens.recordingPen import DecomposingRecordingPen
    from fontTools.pens.ttGlyphPen import TTGlyphPen
    from fontTools.pens.transformPen import TransformPen
    opt = subset.Options(); opt.layout_features = []; opt.hinting = False; opt.legacy_kern = False; opt.notdef_outline = True; opt.glyph_names = False
    opt.name_IDs = [0, 1, 2, 3, 4, 5, 6, 13, 14]; opt.name_languages = [0x409]; opt.drop_tables += ["FFTM", "MATH", "kern", "GPOS", "GSUB", "GDEF"]
    f = TTFont(src, recalcTimestamp=False); missing = [c for c in CHARS if ord(c) not in f.getBestCmap()]      # DejaVu's own date stays: the same files every time
    if missing: raise SystemExit(f"{os.path.basename(src)} has no {' '.join(hex(ord(c)) for c in missing)}")
    s = subset.Subsetter(opt); s.populate(unicodes=[ord(c) for c in CHARS]); s.subset(f)
    upm = f["head"].unitsPerEm; cmap = f.getBestCmap(); gs = f.getGlyphSet(); glyf = f["glyf"]; hmtx = f["hmtx"]
    want = {}                                                   # glyph name -> its new advance
    for c in CHARS:
        b = c if c in W else unicodedata.normalize("NFD", c)[0]      # a letter with an accent is as wide as the letter
        if b in W: want[cmap[ord(c)]] = round(W[b] * upm / 1000)
    own = {c: round(hmtx[cmap[ord(c)]][0] * 1000 / upm) for c in CHARS if cmap[ord(c)] not in want}
    new = {}
    for g in f.getGlyphOrder():                                  # every glyph as plain outlines, moved to the middle of its new width
        adv = hmtx[g][0]; dx = round((want.get(g, adv) - adv) / 2)
        rec = DecomposingRecordingPen(gs); gs[g].draw(rec); pen = TTGlyphPen(None); rec.replay(TransformPen(pen, (1, 0, 0, 1, dx, 0))); new[g] = pen.glyph()
    for g, gl in new.items():
        glyf[g] = gl; gl.recalcBounds(glyf); hmtx[g] = (want.get(g, hmtx[g][0]), gl.xMin if gl.numberOfContours else 0)
    return f, own

def name(f, style, ps):
    n = f["name"]
    for nid, text in ((1, "Draw Sans"), (2, style), (3, f"Draw Sans {style} 1.0 (DejaVu Sans 2.37)"), (4, "Draw Sans" + ("" if style == "Book" else " " + style)), (5, "Version 1.0; DejaVu Sans 2.37"), (6, ps), (10, NOTE)):
        n.setName(text, nid, 3, 1, 0x409)
    n.names = [r for r in n.names if r.platformID == 3]

def check():
    """the files in fonts/ against the kit: every character there at the kit's width for it (to half a thousandth), under the
       name Draw Sans with DejaVu's license inside, with no kerning or substitution tables; the license beside them"""
    K = kit(); bad = []
    for _, out, style, table, ps in FACES:
        f = TTFont(os.path.join(OUT, out)); cmap = f.getBestCmap(); hm = f["hmtx"]; upm = f["head"].unitsPerEm; n = f["name"]
        for c in CHARS:
            if ord(c) not in cmap: bad.append(f"{out} has no {c!r}"); continue
            w = width(K, table, c); got = hm[cmap[ord(c)]][0]
            if w is None or abs(got * 1000 / upm - w) > 0.5: bad.append(f"{out}: {c!r} is {got * 1000 / upm:.0f} thousandths wide; the kit sets it on {w}")
        if n.getDebugName(1) != "Draw Sans" or n.getDebugName(6) != ps: bad.append(f"{out} is named {n.getDebugName(1)!r} / {n.getDebugName(6)!r}")
        if "Bitstream Vera" not in (n.getDebugName(13) or "") or "Bitstream" not in (n.getDebugName(0) or ""): bad.append(f"{out} does not carry its license and copyright")
        for t in ("kern", "GPOS", "GSUB"):
            if t in f: bad.append(f"{out} has a {t} table")
    lic = open(os.path.join(OUT, "LICENSE-Draw-Sans.txt"), encoding="utf-8").read()
    if "Bitstream Vera Fonts Copyright" not in lic or "Arev Fonts Copyright" not in lic: bad.append("fonts/LICENSE-Draw-Sans.txt is not DejaVu's license")
    return bad

if __name__ == "__main__":
    if "--check" in sys.argv:
        bad = check()
        for b in bad[:12]: print("face:", b)
        print("Draw Sans " + ("IS NOT on the kit's widths" if bad else f"is on the kit's widths: {len(CHARS)} characters in each of {len(FACES)} files"))
        sys.exit(1 if bad else 0)
    args = [a for a in sys.argv[1:] if not a.startswith("--")]; src = args[0] if args else "/usr/share/fonts/truetype/dejavu"
    K = kit(); built = []; tables = {}
    for file, out, style, table, ps in FACES:
        # the oblique is set on the book's widths throughout: the kit has one table for both
        f, own = make(os.path.join(src, file), {**tables.get("regular", {}), **K[table]} if style == "Oblique" else K[table]); name(f, style, ps); tables.setdefault(table, own); built.append((f, out))
    def js(t): return "{ " + ", ".join(f"{json.dumps(c, ensure_ascii=False)}: {w}" for c, w in t.items()) + " }"
    if "--tables" in sys.argv: print("  var XR = " + js(tables["regular"]) + ";\n  var XB = " + js(tables["bold"]) + ";"); sys.exit(0)
    if K["more"] != tables["regular"] or K["moreBold"] != tables["bold"]: raise SystemExit("draw.js's XR and XB are not Draw Sans's own widths: python3 draw/face.py --tables prints them")
    for f, out in built:
        f.flavor = "woff2"; f.save(os.path.join(OUT, out)); print(out, os.path.getsize(os.path.join(OUT, out)), "bytes,", len(f.getGlyphOrder()), "glyphs")
