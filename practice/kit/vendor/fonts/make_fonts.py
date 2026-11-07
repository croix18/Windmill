"""The practice page's own fonts, cut small and kept here so the page loads nothing from the network (7 Nov 2026, the site
review: the page joins mrshaffer.org's family; Croix: "Ok sounds well thought out. Proceed.").

    python3 make_fonts.py <Lexend TTF folder> <folder with dm-sans.woff2 and dm-serif-display.woff2>

  lexend-regular.woff2, lexend-bold.woff2   Lexend (ruling 46: the sheet), the two real weights, from the course repos'
                                           assets/Lexend-{Regular,Bold}.ttf — Latin, Greek (pi) and the signs the kit sets
  dm-sans.woff2                            DM Sans (weight 400–700, optical size 14), the site's text face — the top bar and the eyebrow
  dm-serif-display.woff2                   DM Serif Display, the site's display face — the title
All four are under the SIL Open Font License 1.1 (OFL-*.txt beside them). build.py inlines them as data URIs."""
import os, sys
from fontTools import subset
HERE = os.path.dirname(os.path.abspath(__file__))
SHEET = ("U+0020-007E,U+00A0-017F,U+0370-03FF,U+2000-206F,U+20AC,U+2122,U+2190-21FF,U+2200-22FF,U+2300-23FF,"
         "U+25A0-25FF,U+2600-26FF,U+2700-27BF")          # everything Lexend has of these; the rest falls back as before
CHROME = "U+0020-007E,U+00A0-00FF,U+0152-0153,U+2010-2027,U+2030-203A,U+2190-2193,U+2212,U+22EF,U+2026"
def cut(src, dst, unicodes, axes=None):
    o = subset.Options(flavor="woff2", layout_features=["*"], hinting=False, desubroutinize=True, name_IDs=["*"], notdef_outline=True)
    f = subset.load_font(src, o)
    if axes:                                              # DM Sans: optical size pinned at its text size, weight 400–700 only
        from fontTools.varLib import instancer
        f = instancer.instantiateVariableFont(f, axes)
    s = subset.Subsetter(o); s.populate(unicodes=subset.parse_unicodes(unicodes)); s.subset(f)
    subset.save_font(f, os.path.join(HERE, dst), o); print(dst, os.path.getsize(os.path.join(HERE, dst)), "bytes")
if __name__ == "__main__":
    if len(sys.argv) < 3: sys.exit(__doc__)
    lex, site = sys.argv[1], sys.argv[2]
    cut(os.path.join(lex, "Lexend-Regular.ttf"), "lexend-regular.woff2", SHEET)
    cut(os.path.join(lex, "Lexend-Bold.ttf"), "lexend-bold.woff2", SHEET)
    cut(os.path.join(site, "dm-sans.woff2"), "dm-sans.woff2", CHROME, {"opsz": 14, "wght": (400, 700)})
    cut(os.path.join(site, "dm-serif-display.woff2"), "dm-serif-display.woff2", CHROME)
