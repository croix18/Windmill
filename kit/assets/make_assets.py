"""Regenerate the vendored assets the HTML decks inline (htmlkit.py). Run from this folder:

    python3 make_assets.py /path/to/katex/package/dist      # from `npm pack katex@0.19.0`

Writes katex.min.js (copied), katex.inline.css (katex.min.css with every @font-face source
replaced by its .woff2 as a data URI, so a deck is ONE file that needs no network) and the four
schola-*.woff2 subsets of TeX Gyre Schola (the Century Schoolbook clone the pptx decks render with
under LibreOffice). The subset is a fixed, generous block list — Latin-1, Latin Extended-A,
general punctuation, currency, letterlike, arrows, mathematical operators, Greek — NOT the
characters the current specs happen to use, so a glyph a later unit introduces does not fall back
to a system font. (The decks' own characters are checked against the fonts by checks.py `glyph`.)
"""
import base64, os, re, shutil, sys
from fontTools import subset
from fontTools.ttLib import TTFont

HERE = os.path.dirname(os.path.abspath(__file__))
SCHOLA = "/usr/share/texmf/fonts/opentype/public/tex-gyre"
UNICODES = ("U+0020-007E,U+00A0-017F,U+02C6-02DC,U+0370-03FF,U+2000-206F,U+20A0-20BF,"
            "U+2100-214F,U+2190-21FF,U+2200-22FF,U+2260,U+25A0-25FF,U+2713-2717")


def make_schola():
    for style, name in [("regular", "regular"), ("bold", "bold"), ("italic", "italic"), ("bolditalic", "bolditalic")]:
        src = os.path.join(SCHOLA, f"texgyreschola-{style}.otf")
        dst = os.path.join(HERE, f"schola-{name}.woff2")
        opts = subset.Options(flavor="woff2", layout_features=["kern", "liga"], hinting=False,
                              desubroutinize=True, name_IDs=["*"])
        font = subset.load_font(src, opts)
        s = subset.Subsetter(opts)
        s.populate(unicodes=subset.parse_unicodes(UNICODES))
        s.subset(font)
        subset.save_font(font, dst, opts)
        n = len(TTFont(dst).getBestCmap())
        print(f"{os.path.basename(dst)}: {os.path.getsize(dst)} bytes, {n} code points")


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
    make_schola()
    if len(sys.argv) > 1:
        make_katex(sys.argv[1])
    else:
        print("(KaTeX not regenerated: pass the katex dist folder to do that)")
