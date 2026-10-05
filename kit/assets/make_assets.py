"""Regenerate the vendored assets the HTML decks inline (htmlkit.py). Run from this folder:

    python3 make_assets.py /path/to/katex/package/dist      # from `npm pack katex@0.19.0`

Writes katex.min.js (copied), katex.inline.css (katex.min.css with every @font-face source
replaced by its .woff2 as a data URI, so a deck is ONE file that needs no network) and the web
faces of the slide font: lexend-regular.woff2 and lexend-bold.woff2 (Lexend, whole) and
lexend-fallback.woff2 (the signs of a fixed, generous block list — arrows, mathematical operators,
geometric shapes, the tick — that Lexend has no glyph for, cut from DejaVu Sans), and WindyPi
(WindyPi.ttf, windypi.woff2): a face of ONE glyph, the pi of STIX General Bold, which slides use
in place of Lexend's own. The decks' own characters are checked against the fonts by checks.py
`glyph`.
"""
import base64, os, re, shutil, sys
from fontTools import subset
from fontTools.ttLib import TTFont

HERE = os.path.dirname(os.path.abspath(__file__))
UNICODES = ("U+0020-007E,U+00A0-017F,U+02C6-02DC,U+0370-03FF,U+2000-206F,U+20A0-20BF,"
            "U+2100-214F,U+2190-21FF,U+2200-22FF,U+2260,U+25A0-25FF,U+2713-2717")


LEXEND_FALLBACK = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"


def _subset(src, dst, unicodes):
    opts = subset.Options(flavor="woff2", layout_features=["kern", "liga"], hinting=False,
                          desubroutinize=True, name_IDs=["*"])
    font = subset.load_font(src, opts)
    s = subset.Subsetter(opts)
    s.populate(unicodes=unicodes)
    s.subset(font)
    subset.save_font(font, dst, opts)
    n = len(TTFont(dst).getBestCmap())
    print(f"{os.path.basename(dst)}: {os.path.getsize(dst)} bytes, {n} code points")


def make_lexend():
    """The slide font (ruling 40): Lexend Regular and Bold, whole, as woff2 for the HTML decks; and
    one small face cut from DejaVu Sans holding only the signs of the block list that Lexend has
    no glyph for (arrows, the angle and triangle signs, the tick), so that none of them falls
    back to whatever the browser happens to have."""
    have = set()
    for style in ("Regular", "Bold"):
        src = os.path.join(HERE, f"Lexend-{style}.ttf")
        have |= set(TTFont(src).getBestCmap())
        _subset(src, os.path.join(HERE, f"lexend-{style.lower()}.woff2"), sorted(TTFont(src).getBestCmap()))
    want = set(subset.parse_unicodes(UNICODES)) & set(TTFont(LEXEND_FALLBACK).getBestCmap())
    _subset(LEXEND_FALLBACK, os.path.join(HERE, "lexend-fallback.woff2"), sorted(want - have))


def make_pi():
    """WindyPi: one glyph, pi (U+03C0), cut from STIX General Bold as matplotlib ships it — the
    very glyph mathimg sets in a slide's expressions — under a family name of its own, so the
    PowerPoint can name it for a run and the HTML decks can list it first in every font stack.
    Lexend's pi is a flat-topped box; this is the pi of the textbook, at Lexend's weight. (STIX is
    under the SIL Open Font License, STIX-OFL.txt; the cut is renamed, as the licence asks.)"""
    import matplotlib
    d = os.path.join(matplotlib.get_data_path(), "fonts", "ttf")
    src = os.path.join(d, "STIXGeneralBol.ttf")
    shutil.copy2(os.path.join(d, "LICENSE_STIX"), os.path.join(HERE, "STIX-OFL.txt"))
    for dst, flavor in (("WindyPi.ttf", None), ("windypi.woff2", "woff2")):
        opts = subset.Options(flavor=flavor, hinting=False, desubroutinize=True, name_IDs=[1, 2, 3, 4, 6],
                              notdef_outline=True, layout_features=[])
        font = subset.load_font(src, opts)
        sub = subset.Subsetter(opts)
        sub.populate(unicodes=[0x3C0])
        sub.subset(font)
        for rec in font["name"].names:
            rec.string = {1: "WindyPi", 2: "Regular", 3: "WindyPi: pi of STIX General Bold", 4: "WindyPi", 6: "WindyPi"}[rec.nameID]
        font["OS/2"].usWeightClass = 400          # offered as the regular face: never emboldened twice
        font["OS/2"].fsSelection = 0x40
        font["head"].macStyle = 0
        subset.save_font(font, os.path.join(HERE, dst), opts)
        print(f"{dst}: {os.path.getsize(os.path.join(HERE, dst))} bytes, {sorted(TTFont(os.path.join(HERE, dst)).getBestCmap())}")


def make_katex(dist):
    shutil.copy2(os.path.join(dist, "katex.min.js"), os.path.join(HERE, "katex.min.js"))
    css = open(os.path.join(dist, "katex.min.css"), encoding="utf-8").read()

    def inline(m):
        path = os.path.join(dist, m.group(1))
        b = base64.b64encode(open(path, "rb").read()).decode()
        return f"url(data:font/woff2;base64,{b}) format(\"woff2\")"
    # keep only the woff2 source of every @font-face; drop the woff and ttf fallbacks
    css = re.sub(r"url\((fonts/[^)]+\.woff2)\) format\(\"woff2\"\)", inline, css)
    css = re.sub(r",url\(fonts/[^)]+\.(?:woff|ttf)\) format\(\"(?:woff|truetype)\"\)", "", css)
    assert "url(fonts/" not in css, "a font source was not inlined"
    open(os.path.join(HERE, "katex.inline.css"), "w", encoding="utf-8").write(css)
    for lic in ("LICENSE", "LICENSE.txt"):
        p = os.path.join(dist, "..", lic)
        if os.path.exists(p):
            shutil.copy2(p, os.path.join(HERE, "KATEX-LICENSE"))
    print("katex.inline.css:", os.path.getsize(os.path.join(HERE, "katex.inline.css")), "bytes")


if __name__ == "__main__":
    make_lexend()
    make_pi()
    if len(sys.argv) > 1:
        make_katex(sys.argv[1])
    else:
        print("(KaTeX not regenerated: pass the katex dist folder to do that)")
