"""pptx builder: the house deck geometry (13.33 x 7.5 in, Century Schoolbook, INK/VOCAB/RED/GRAY,
double rule under the title, footer rule + running title + page number), one kit for both courses.
No speaker notes in the deck (ruling 12): every slide's minutes and teaching note go to a
side-car JSON beside the .pptx, which the teacher's edition reads at build time.

Guards, each one because the thing it refuses once shipped with every check green: $…$ in a plain
text box (prints as LaTeX), a box or figure that crosses the footer rule, a line that runs off the
slide, a partial **bold**, a table cell that wraps out of its row, a title-slide line too long for
its box, an answer line that wraps into the footer, four options that do not fit.
"""
import json, os
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR, MSO_AUTO_SIZE
from pptx.enum.shapes import MSO_SHAPE
from . import mathimg
from . import figkit
from . import slotmark
from .profile import C

INK, VOCAB, RED, GRAY, LT, FILL = "1A1A1A", "0B5394", "9E1B32", "6B6B6B", "D9D9D9", "F2F2F0"
FONT = "Century Schoolbook"

_FONT_FILES = {False: "/usr/share/texmf/fonts/opentype/public/tex-gyre/texgyreschola-regular.otf",
               True: "/usr/share/texmf/fonts/opentype/public/tex-gyre/texgyreschola-bold.otf"}
_FONT_CACHE = {}
def _textw(text, size, bold=False):
    """Width in inches of a text piece at `size` pt, measured with the Schola metrics (the Century
    Schoolbook clone LibreOffice renders with) plus a 6% margin, falling back to the old estimate."""
    try:
        from PIL import ImageFont
        key = (bool(bold), int(size * 4))
        f = _FONT_CACHE.get(key)
        if f is None:
            f = _FONT_CACHE[key] = ImageFont.truetype(_FONT_FILES[bool(bold)], int(size * 4))
        return f.getlength(text) / 4 / 72 * 1.06 + 0.08
    except Exception:
        return len(text) * size / 72 * (0.58 if bold else 0.52) + 0.08

W, H = 13.3333, 7.5
LM, CW = 0.85, 11.6
FOOT_Y = 6.78


def _rgb(h):
    return RGBColor.from_string(h)


SUP = dict(zip("⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺ᵐⁿ", "0123456789-+mn"))


def _split_sup(text):
    """Unicode superscript digits have no glyph in the deck font (glyph check); emit them as
    real superscript runs instead. Returns [(piece, is_sup), ...]."""
    out = []; buf = ""; cur = False
    for ch in text:
        sup = ch in SUP
        if sup != cur and buf:
            out.append((buf, cur)); buf = ""
        cur = sup
        buf += SUP[ch] if sup else ch
    if buf:
        out.append((buf, cur))
    return out


class Deck:
    def __init__(self, course, unit, lesson_label, title, footer):
        self.p = Presentation()
        self.p.slide_width = Inches(W); self.p.slide_height = Inches(H)
        self.blank = self.p.slide_layouts[6]
        self.footer = footer
        self.course, self.unit, self.lesson_label, self.title = course, unit, lesson_label, title
        self.side = []   # side-car records
        self.s = None
        self.cursor = 0.0
        self._n = 0

    # ---------- primitives ----------
    def _text(self, x, y, w, h, text, size=23, bold=False, italic=False, color=INK, align="left",
              anchor="top", runs=None, wrap=True, foot=False, slots=False):
        # _text draws type, not mathematics: a $…$ span here would print its LaTeX verbatim and
        # every check would pass (M7, 20 Sep — "Answer: 240 ft$^2$" shipped that way). Use
        # _mixed/math_row for real math, or a unicode superscript for a unit. \$ is money.
        for t in ([text] if text else []) + [r[0] for r in (runs or [])]:
            if t and t.replace("\\$", "").count("$") >= 2:
                raise RuntimeError(f"$…$ math in a plain text box — it would print as LaTeX: {t[:60]}")
        if not foot and y + h > FOOT_Y + 0.02:
            raise RuntimeError(f"text box runs into the footer (bottom {y + h:.2f} in): {(text or (runs and runs[0][0]) or '')[:50]}")
        if x < 0 or x + w > W + 0.01:
            raise RuntimeError(f"text box off the slide horizontally: {(text or '')[:50]}")
        tb = self.s.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
        tf = tb.text_frame; tf.word_wrap = wrap
        if not wrap:
            tf.auto_size = MSO_AUTO_SIZE.NONE
        tf.margin_left = tf.margin_right = Inches(0.05); tf.margin_top = tf.margin_bottom = Inches(0.02)
        tf.vertical_anchor = {"top": MSO_ANCHOR.TOP, "middle": MSO_ANCHOR.MIDDLE}[anchor]
        para = tf.paragraphs[0]
        para.alignment = {"left": PP_ALIGN.LEFT, "center": PP_ALIGN.CENTER, "right": PP_ALIGN.RIGHT}[align]
        for (t, sz, b, i, c) in (runs or [(text, size, bold, italic, color)]):
            # a named slot (\sA{} \sB{} \sH{}) is its own run in its own colour where the teacher
            # shows; anywhere else the mark is dropped and the words stay (lib/slotmark.py)
            for part, slot in (slotmark.pieces(t) if slots else [(slotmark.strip(t), None)]):
                for piece, sup in _split_sup(part):
                    r = para.add_run(); r.text = piece.replace("\\$", "$")   # \$ = a literal dollar sign
                    r.font.name = FONT; r.font.size = Pt(sz); r.font.bold = b; r.font.italic = i
                    r.font.color.rgb = _rgb(slot or c)
                    if sup:
                        r.font._element.set("baseline", "30000")
        return tb

    def _line(self, x, y, w, weight=1.5, color=INK):
        ln = self.s.shapes.add_connector(1, Inches(x), Inches(y), Inches(x + w), Inches(y))
        ln.line.color.rgb = _rgb(color); ln.line.width = Pt(weight)
        return ln

    def _rect(self, x, y, w, h, fill=FILL, line=None):
        r = self.s.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(x), Inches(y), Inches(w), Inches(h))
        r.fill.solid(); r.fill.fore_color.rgb = _rgb(fill)
        if line:
            r.line.color.rgb = _rgb(line); r.line.width = Pt(0.75)
        else:
            r.line.fill.background()
        r.shadow.inherit = False
        return r

    def _foot(self):
        self._line(LM, FOOT_Y, CW, 0.75, GRAY)
        self._text(LM, FOOT_Y + 0.08, 10.6, 0.3, self.footer, 11, italic=True, color=GRAY, foot=True)
        self._text(11.75, FOOT_Y + 0.08, 0.7, 0.3, str(self._n), 11, color=GRAY, align="right", foot=True)

    def _new(self, title, sub, minutes, note, kind):
        self.s = self.p.slides.add_slide(self.blank)
        self._n += 1
        self.side.append({"n": self._n, "title": title, "sub": sub, "min": minutes, "note": note, "kind": kind})
        self._text(LM, 0.4, CW, 0.7, title, 36 if len(title) < 30 else 34, bold=True)
        self._line(LM, 1.2, CW, 1.5); self._line(LM, 1.29, CW, 0.75)
        if sub:
            self._text(LM, 1.38, CW, 0.34, sub, 17, italic=True, color=GRAY)
        self.cursor = 1.9
        self._foot()
        return self.s

    # ---------- slide types ----------
    def title_slide(self, benchmark, target, yesterday, today, minutes=1, note=""):
        # the yesterday/today box holds one 17-pt line each; a longer line wraps out of the box
        # (M7 4.01's first deck did — 28 Sep). Measured against the box, not counted.
        for line, bold in ((yesterday, False), (today, True)):
            wid = (_textw(line, 17, bold) - 0.08) / 1.06      # the font's own width, without _textw's safety margin
            if wid > 7.6 - 0.1:
                raise RuntimeError(f"title-slide line does not fit its box ({wid:.2f} in of 7.5): {line}")
        self.s = self.p.slides.add_slide(self.blank); self._n += 1
        self.side.append({"n": self._n, "title": self.title, "sub": "", "min": minutes, "note": note, "kind": "title"})
        eyebrow = f"{self.course}  ·  UNIT {self.unit}  ·  {self.lesson_label}".upper()
        self._text(LM, 1.85, CW, 0.38, eyebrow, 15, color=GRAY, align="center")
        self._text(LM, 2.24, CW, 1.1, self.title, 34, bold=True, align="center", anchor="middle")
        self._line(3.6, 3.56, 6.1, 1.5); self._line(3.6, 3.65, 6.1, 0.75)
        self._text(LM, 3.83, CW, 0.34, benchmark, 16, bold=True, align="center")
        tl = max(1, -(-len(target) // 84))
        self._text(LM, 4.2, CW, 0.4 * tl, target, 19, italic=True, align="center")
        by = 4.8 + 0.38 * (tl - 1)
        self._rect(2.6, by, 8.1, 1.15, FILL, "BFBFBF")
        self._text(2.85, by + 0.17, 7.6, 0.4, yesterday, 17, italic=True, color=GRAY, align="center")
        self._text(2.85, by + 0.59, 7.6, 0.4, today, 17, bold=True, align="center")
        self._foot()

    def section(self, title, sub="", minutes=0, note="", kind="content"):
        return self._new(title, sub, minutes, note, kind)

    # ---------- the whole-unit deck ----------
    def count(self):
        return len(self.p.slides)

    def slide_ref(self, i):
        return self.p.slides[i]

    def start_lesson(self, lesson_label, title, footer, code=None):
        """Switch the running title and footer to the next lesson and restart its slide numbers,
        so a lesson inside the unit deck is numbered exactly as its own deck and its Teacher
        Edition number it."""
        self.lesson_label, self.title, self.footer = lesson_label, title, footer
        self._n = 0

    def tag(self, **kw):
        """Metadata on the current slide (board kind, choices, benchmark) — the HTML console reads
        it; a PowerPoint slide has nowhere to keep it, so this is a no-op here."""
        return None

    def unit_cover(self, title, lines):
        """The unit deck's first slide: eyebrow, title, double rule, a few centred lines."""
        self.s = self.p.slides.add_slide(self.blank); self._n += 1
        self.side.append({"n": self._n, "title": title, "sub": "", "min": 0, "note": "", "kind": "title"})
        self._text(LM, 1.95, CW, 0.38, f"{self.course}  ·  UNIT {self.unit}".upper(), 15, color=GRAY, align="center")
        self._text(LM, 2.34, CW, 1.1, title, 38, bold=True, align="center", anchor="middle")
        self._line(3.6, 3.66, 6.1, 1.5); self._line(3.6, 3.75, 6.1, 0.75)
        y = 4.05
        for ln in lines:
            self._text(LM, y, CW, 0.42, ln, 19, italic=True, color=GRAY, align="center")
            y += 0.46
        self._foot()
        return self.s

    def link_row(self, slide, y, left, right, target, pitch=0.46):
        """One contents row that jumps to `target` when clicked: label and title on the left,
        the slide's position in the file on the right. `pitch` is the row spacing: a unit with
        more than ten rows closes it up (and steps the type down) so the last row clears the footer."""
        prev = self.s
        self.s = slide
        tight = pitch < 0.455
        h, sz = (pitch - 0.03, 20) if tight else (0.44, 22)
        a = self._text(LM + 0.4, y, 1.45, h, left[0], sz, bold=True, anchor="middle")
        b = self._text(LM + 1.95, y, 7.6, h, left[1], sz, anchor="middle")
        c = self._text(LM + 9.6, y, 1.6, h, right, 17 if not tight else 16, italic=True, color=GRAY, align="right", anchor="middle")
        for shape in (a, b, c):
            shape.click_action.target_slide = target
        self._line(LM + 0.4, y + (0.5 if not tight else pitch - 0.005), CW - 0.8, 0.5, LT)
        self.s = prev

    def head(self, text, numeral=None):
        """A bold sub-heading with a thin rule (Notes I. / II.)."""
        label = (f"{numeral}.  " if numeral else "") + text
        self._text(LM, self.cursor, CW, 0.44, label, 25, bold=True)
        self._line(LM, self.cursor + 0.48, CW, 0.75)
        self.cursor += 0.66

    def items(self, rows, size=23, panel=False, letters=True, x=None, w=None, gap=0.1, start=0, slots=False):
        """Lettered rows. Each row: plain string, or (term, rest) for a vocab row (term blue bold),
        or ("**bold**", ...) — a row beginning with ** is set bold. Returns bottom y."""
        x = LM + 0.11 if x is None else x
        w = CW - 0.22 if w is None else w
        y = self.cursor
        for i, row in enumerate(rows):
            if isinstance(row, tuple):
                term, rest = row
                runs = [(term, size + 2, True, False, VOCAB), ("   —   " + rest, size, False, False, INK)]
                text = term + "   —   " + rest
            else:
                bold = row.startswith("**")
                text = row.strip("*")
                if "**" in text:
                    # the deck bolds a whole row or nothing; a ** inside a row prints literally
                    # (M7, 20 Sep: it shipped on 5.01 and again on the Unit 5 review)
                    raise RuntimeError(f"partial **bold** in a slide row prints literally: {row[:60]}")
                runs = [(text, size, bold, False, INK)]
            if "$" in text.replace("\\$", ""):
                xx = x + (0.77 if letters else 0.12)
                if letters:
                    self._text(x + 0.12, y + 0.07, 0.6, 0.42, f"{chr(65 + start + i)}.", size, color=INK)
                tw, h = self._mixed(text, xx, y + 0.05, "slidemid", size, INK, bold, slots=slots)
                y += h + 0.18 + gap
                continue
            lines = max(1, int(len(slotmark.strip(text)) * (size / 23) / 82) + 1)
            h = 0.52 * lines
            if panel:
                self._rect(x - 0.03, y - 0.02, w, h + 0.12)
            if letters:
                self._text(x + 0.12, y + 0.07, 0.6, 0.42, f"{chr(65 + start + i)}.", size, color=INK)
                self._text(x + 0.77, y + 0.07, w - 0.95, h, "", size, runs=runs, slots=slots)
            else:
                self._text(x + 0.12, y + 0.07, w - 0.3, h, "", size, runs=runs, slots=slots)
            y += h + 0.18 + gap
        self.cursor = y
        return y

    def numbered(self, rows, size=21, x=1.05, w=11.4, gap=0.2):
        y = self.cursor
        for i, text in enumerate(rows):
            cpl = int((w - 0.65) * 72 / (size * 0.50))
            lines = max(1, -(-len(text) // cpl))
            h = 0.39 * lines + 0.06
            self._text(x, y, 0.6, 0.39, f"{i + 1}.", size, bold=True, color=VOCAB)
            self._text(x + 0.65, y, w - 0.65, h, text, size)
            y += h + gap
        self.cursor = y

    def text(self, text, size=23, bold=False, italic=False, color=INK, align="left", h=None, x=None, w=None, slots=False):
        x = LM if x is None else x; w = CW if w is None else w
        # _textw carries a 6% margin and it stays: words do not fill a line to its last point, so a
        # paragraph measured at the font's bare width wraps one line further than it was given
        # (tried 4 October as `tight`; 4.04 board 9's story ran over its ask, and `overlap` said so)
        wid = _textw(slotmark.strip(text).replace("\\$", "$"), size, bold)
        lines = max(1, -(-int(wid * 100) // int((w - 0.1) * 100)))   # measured, not counted
        h = h or (0.45 * lines * (size / 23))
        self._text(x, self.cursor, w, h, text, size, bold, italic, color, align, slots=slots)
        self.cursor += h + 0.12
        return self.cursor

    def table(self, widths, rows, size=15, header=True, x=None, row_h=0.42):
        """Simple table: widths in inches; rows of strings. Header row shaded."""
        x = LM + (CW - sum(widths)) / 2 if x is None else x
        # Row height is fixed, so a cell whose text has to wrap draws its second line outside the
        # cell border and over whatever is below. The same character-count estimate _mixed uses
        # decides it here, before anything is drawn.
        for ri, row in enumerate(rows):
            for ci, val in enumerate(row):
                est = len(str(val)) * size / 72 * (0.58 if (header and ri == 0) else 0.52)
                if est > widths[ci] - 0.16:
                    raise RuntimeError(f"table cell wraps out of its row (needs about {est:.2f} in, "
                                       f"column is {widths[ci]:.2f} in): {str(val)[:50]!r}")
        shp = self.s.shapes.add_table(len(rows), len(widths), Inches(x), Inches(self.cursor),
                                      Inches(sum(widths)), Inches(row_h * len(rows)))
        tbl = shp.table
        tbl.first_row = False; tbl.horz_banding = False
        for ci, wv in enumerate(widths):
            tbl.columns[ci].width = Inches(wv)
        for ri, row in enumerate(rows):
            tbl.rows[ri].height = Inches(row_h)
            for ci, val in enumerate(row):
                cell = tbl.cell(ri, ci)
                cell.fill.solid(); cell.fill.fore_color.rgb = _rgb(LT if (header and ri == 0) else "FFFFFF")
                cell.margin_left = cell.margin_right = Inches(0.08)
                cell.margin_top = cell.margin_bottom = Inches(0.03)
                cell.vertical_anchor = MSO_ANCHOR.MIDDLE
                tf = cell.text_frame; tf.word_wrap = True
                para = tf.paragraphs[0]; para.alignment = PP_ALIGN.CENTER
                for piece, sup in _split_sup(val):
                    r = para.add_run(); r.text = piece
                    r.font.name = FONT; r.font.size = Pt(size); r.font.bold = (header and ri == 0)
                    r.font.color.rgb = _rgb(INK)
                    if sup:
                        r.font._element.set("baseline", "30000")
        # borders: python-pptx has no API; set via XML
        from pptx.oxml.ns import qn
        from lxml import etree
        for ri in range(len(rows)):
            for ci in range(len(widths)):
                tc = tbl.cell(ri, ci)._tc
                tcPr = tc.get_or_add_tcPr()
                for edge in ("a:lnL", "a:lnR", "a:lnT", "a:lnB"):
                    ln = etree.SubElement(tcPr, qn(edge), w="9525", cap="flat", cmpd="sng", algn="ctr")
                    sf = etree.SubElement(ln, qn("a:solidFill"))
                    etree.SubElement(sf, qn("a:srgbClr"), val=INK)
                    etree.SubElement(ln, qn("a:prstDash"), val="solid")
        self.cursor += row_h * len(rows) + 0.25
        return tbl

    def math(self, latex, surface="slidebig", align="center", x=None, y=None, color=INK, gap=0.25, slots=False):
        path, w, h = mathimg.m(latex, surface, color, slots)
        yy = self.cursor if y is None else y
        if yy + h > FOOT_Y:
            raise RuntimeError(f"figure runs into the footer: {latex[:40]}")
        xx = x if x is not None else (LM + (CW - w) / 2 if align == "center" else LM + 0.3)
        self.s.shapes.add_picture(path, Inches(xx), Inches(yy), Inches(w), Inches(h))
        if y is None:
            self.cursor = yy + h + gap
        return w, h

    def _mixed(self, text, x, y, surface="slidemid", size=26, color=INK, bold=False, align="left", width=None, slots=False):
        """Lay out one line mixing text and $latex$ pieces, images vertically centred on the text.
        Returns (total_width, line_height). Text width is estimated from character count and the
        pieces are placed left to right; align='center' centres the whole line inside [x, x+width]."""
        import re
        pieces = []
        total = 0.0; maxh = 0.45
        for part in re.split(r"(\$[^$]+\$)", text.replace("\\$", "\ue000")):
            if not part:
                continue
            if part.startswith("$"):
                path, w, h = mathimg.m(part[1:-1].replace("\ue000", "\\$"), surface, color, slots)
                pieces.append(("img", path, w, h)); total += w; maxh = max(maxh, h)
            else:
                w = _textw(slotmark.strip(part).replace("\ue000", "$"), size, bold)
                pieces.append(("txt", part.replace("\ue000", "\\$"), w, 0.5)); total += w   # _text prints \$ as $
        if align == "center":
            x = x + ((width if width else CW) - total) / 2
        if x + total > LM + CW + 0.05:
            raise RuntimeError(f"line runs off the slide ({x + total:.2f} in): {text[:60]}")
        for kind, val, w, h in pieces:
            if kind == "img":
                self.s.shapes.add_picture(val, Inches(x), Inches(y + (maxh - h) / 2), Inches(w), Inches(h))
            else:
                self._text(x, y + (maxh - 0.5) / 2, w + 0.15, 0.5, val, size, bold=bold, color=color, anchor="middle", wrap=False, slots=slots)
            x += w
        return total, maxh

    def measure(self, text, surface="slidemid", size=26, bold=False):
        """Width in inches a mixed line would take, without drawing it."""
        import re
        total = 0.0
        for part in re.split(r"(\$[^$]+\$)", text.replace("\\$", "\ue000")):
            if not part:
                continue
            if part.startswith("$"):
                _, w, h = mathimg.m(part[1:-1].replace("\ue000", "\\$"), surface, INK)
                total += w
            else:
                total += _textw(slotmark.strip(part).replace("\ue000", "$"), size, bold)
        return total

    def math_row(self, parts, surface="slidemid", y=None, gap=0.35, size=26, color=INK, bold=False, align="center", x=None, slots=False):
        """A row mixing text and $latex$ pieces, vertically aligned; centered unless align='left'."""
        yy = self.cursor if y is None else y
        total, maxh = self._mixed(parts, LM if x is None else x, yy, surface, size, color, bold, align=align, slots=slots)
        if y is None:
            self.cursor = yy + maxh + gap
        return maxh

    # ---------- composed rows shared with the HTML deck (lessonbuild calls only these) ----------
    def warmup_answers(self, pairs, x=None):
        """Each (stem, answer): the answer in red after the stem if it fits, else on the next line."""
        x = LM + 1.2 if x is None else x
        for stem, answer in pairs:
            y0 = self.cursor
            tw, hh = self._mixed(stem, x, y0, "slide", 23, INK)
            aw = self.measure(answer, "slide", 23, bold=True)
            if x + tw + 0.6 + aw <= LM + CW:
                self._mixed(answer, x + tw + 0.6, y0, "slide", 23, RED, True)
                self.cursor = y0 + hh + 0.22
            else:
                _, h2 = self._mixed(answer, LM + 2.0, y0 + hh + 0.05, "slide", 23, RED, True)
                self.cursor = y0 + hh + 0.05 + h2 + 0.22

    def worked_row(self, latex, gloss, slots=False):
        """A worked line: the expression at the left, its one-phrase reason in grey beside it."""
        y0 = self.cursor
        wdt, hgt = self.math(latex, "slidemid", align="left", x=2.0, slots=slots)
        gx = 2.0 + wdt + 0.5
        self._text(gx, y0 + (hgt - 0.5) / 2, min(7.0, LM + CW - gx), 0.55, gloss, 21, italic=True, color=GRAY, anchor="middle", slots=slots)
        self.cursor = y0 + hgt + 0.3

    def ask(self, text, hint=None, y=None):
        """The board's standing instruction, low on the slide, with an optional grey hint under it."""
        y = max(self.cursor + 0.15, 4.75) if y is None else y
        y = min(y, FOOT_Y - 0.56 - (0.45 if hint else 0))
        self._text(0.85, y, 11.6, 0.5, text, 26, bold=True, align="center")
        if hint:
            self._text(0.85, y + 0.53, 11.6, 0.4, hint, 19, italic=True, color=GRAY, align="center")

    def gloss(self, text):
        """The grey one-liner above a reveal's answer. A reveal is where the teacher shows, so a
        named slot in it is coloured."""
        self._text(2.0, self.cursor + 0.05, 9.3, 0.6, text, 24, color=GRAY, align="center", slots=True)
        self.cursor += 0.7

    def answer_line(self, text, y=5.2):
        """The red answer under a question. A long answer wraps, and a box sized for one line lets
        the second fall into the footer — so it is measured, and refused if it will not fit (M7,
        20 Sep: board 9 shipped a reveal whose last word sat on the footer rule, every check green)."""
        full = "Answer:   " + text
        wid = self.measure(full, "slide", 32, bold=True)
        lines = max(1, int(-(-wid // (CW - 0.4))))
        need = lines * 32 * 1.32 / 72
        if y + need > FOOT_Y + 0.02:
            raise RuntimeError(f"answer line needs {lines} lines ({y + need:.2f} in) and runs into "
                               f"the footer \u2014 shorten it: {text[:60]}")
        self._text(LM, y, CW, max(0.6, need), full, 32, bold=True, color=RED, align="center")

    def answer_math(self, latex, y=5.1):
        path, w, h = mathimg.m(latex, "slidebig", RED)
        lw = 2.1
        x = LM + (CW - w - lw) / 2
        self._text(x, y + (h - 0.6) / 2, lw, 0.6, "Answer:", 32, bold=True, color=RED, anchor="middle")
        self.s.shapes.add_picture(path, Inches(x + lw), Inches(y), Inches(w), Inches(h))

    def figure(self, spec, gap=0.16):
        """Place a geometry figure, centred, at the cursor. The figure is drawn from the numbers
        (lib/figkit), so a drawing that disagrees with its own labels cannot happen."""
        avail = FOOT_Y - self.cursor - spec.get("reserve", 0.7)
        path, w, h = figkit.draw(spec, spec.get("in", 4.2))
        if h > avail and avail > 0.4:
            path, w, h = figkit.draw(spec, spec.get("in", 4.2) * (avail / h))
        if self.cursor + h > FOOT_Y:
            raise RuntimeError(f"figure does not fit the slide ({h:.2f} in tall): {spec}")
        self.s.shapes.add_picture(path, Inches(LM + (CW - w) / 2), Inches(self.cursor),
                                  Inches(w), Inches(h))
        self.cursor += h + gap

    def choices(self, opts, size=24, correct=None, two_col=True):
        """A–D options. On an answer slide pass correct=index to colour it red.

        An option may carry $…$ math; those are laid out with a row pitch read from the rendered
        height, because a stacked fraction is taller than a line of type. A text option longer than
        its column wraps onto the row below it (M7 5.07 board 6 shipped with B's third line printed
        over D — found 4 Oct): every option is measured with the real font, two columns are used
        only when all four fit on one line each, and otherwise the options go one per line, the
        type stepping down until they end above the ask — or the build refuses."""
        y = self.cursor
        n = len(opts)
        if any("$" in o.replace("\\$", "") for o in opts):
            cols = [(LM + 1.0, 5.0), (LM + 6.3, 5.0)]
            hmax = [0.0, 0.0]
            for i, o in enumerate(opts):
                cx, _ = cols[i % 2]
                r = i // 2
                col = RED if correct == i else INK
                yy = y + (hmax[0] + 0.22 if r else 0.0)
                self._text(cx, yy + 0.06, 0.65, 0.5, f"{chr(65 + i)}.", size, bold=True, color=col)
                _, hh = self._mixed(o, cx + 0.62, yy, "slidemid", size, col, correct == i)
                hmax[r] = max(hmax[r], hh)
            self.cursor = y + hmax[0] + 0.22 + hmax[1] + 0.2
            return

        def lines_in(o, width, i, sz=size):
            w = _textw(f"{chr(65 + i)}.   " + o.replace("\\$", "$"), sz, bold=(correct == i))   # the keyed option is set bold on the reveal
            return max(1, -(-w // (width + 0.15)))     # the +6% in _textw is conservative: 5.04 in measured fits a 5.0 in column

        def run(i, o, sz, col):
            return [(f"{chr(65 + i)}.   ", sz, True, False, col), (o, sz, correct == i, False, col)]

        if two_col and n == 4 and all(lines_in(o, 5.0, i) == 1 for i, o in enumerate(opts)):
            cols = [(LM + 1.2, 5.0), (LM + 6.4, 5.0)]
            for i, o in enumerate(opts):
                cx, cw_ = cols[i % 2]
                row = i // 2
                col = RED if correct == i else INK
                self._text(cx, y + row * 0.75, cw_, 0.6, "", size, runs=run(i, o, size, col))
            self.cursor = y + 2 * 0.75 + 0.2
            return
        if all(lines_in(o, CW - 1.5, i) == 1 for i, o in enumerate(opts)) and y + n * 0.62 <= 5.42 + 0.2:
            # one per line at the full size and the open pitch, when nothing wraps and it fits
            for i, o in enumerate(opts):
                col = RED if correct == i else INK
                self._text(LM + 1.2, y + i * 0.62, CW - 1.5, 0.55, "", size, runs=run(i, o, size, col))
            self.cursor = y + n * 0.62 + 0.2
            return
        # one column, fitted: the type steps down until the options end above the ask zone (the
        # ask and its hint need the slide from 5.7 in; a reveal's answer line sits lower)
        for sz in (size, 22, 20, 19, 18):
            rows = []
            for i, o in enumerate(opts):
                k = lines_in(o, CW - 1.5, i, sz)
                rows.append((k, k * sz * 1.25 / 72 + 0.06))      # a line is 1.25 × the size, plus the box margins
            total = sum(h for _, h in rows) + 0.07 * (n - 1)
            if y + total <= 5.42:                          # + 0.2 gap, + 0.15 to the ask, + 0.93 for the ask and its hint = 6.70
                break
        else:
            raise RuntimeError(f"the options do not fit one slide even at 18 pt — shorten them: {opts[0][:40]}…")
        for i, o in enumerate(opts):
            col = RED if correct == i else INK
            h = rows[i][1]
            self._text(LM + 1.2, y, CW - 1.5, h, "", sz, runs=run(i, o, sz, col))
            y += h + 0.07
        self.cursor = y + 0.2

    def independent(self, minutes=6):
        """Ruling 21, the set as a handout: six questions, silent, written, after the boards and
        before IXL. The slide gives the instructions; the questions are on the printed page."""
        self.section("Independent Set", "Six questions. On your own, in silence.", minutes,
                     "Hand out the Independent Set. Silent work. Circulate and mark what you see; do not teach. "
                     "Whatever is not finished goes home.", "independent")
        self.cursor = 2.2
        self.numbered(["Six questions. Work down the page.",
                       "Show the step that does the work, not just the answer.",
                       "Silence until the six minutes are up."], gap=0.14)

    def independent_set(self, minutes, note, questions):
        """Ruling 21, the set on the slide: the six questions themselves, no handout (Croix,
        20 September: three files per lesson, the bank kept in Reference)."""
        self.section("Independent Practice", "Six questions. On your own, in writing.", minutes, note, "set")
        # the six have to fit one slide — shrink the type rather than split the set across two,
        # because ruling 21 is that a student works all six at their own pace
        for size, gap in ((19, 0.10), (18, 0.08), (17, 0.06), (16, 0.05)):
            n = len(self.s.shapes._spTree)
            self.cursor = 1.72
            try:
                self.numbered(questions, size=size, gap=gap)
                break
            except RuntimeError:
                tree = self.s.shapes._spTree
                for sp in list(tree)[n:]:
                    tree.remove(sp)
        else:
            raise RuntimeError("the six questions do not fit one slide even at 16 pt \u2014 shorten them")

    def close(self, lines, minutes=1, note=""):
        """Before You Go — the one thing today lives on, said back to the room."""
        self.section("Before You Go", "", minutes, note, "close")
        self.cursor = 2.1
        for ln in lines:
            self.text(ln, 24)
            self.cursor += 0.12

    def ixl(self, skills, minutes=5, due="Due at the start of the next class."):
        """Ruling 28. `due` is the third line; a lesson whose skills continue into the next lesson
        passes its own (one assignment covering the run, due after its last lesson)."""
        ss = C.IXL_SMARTSCORE
        self.section("IXL", "Last five minutes.", minutes, f"IXL: every listed skill is required, SmartScore {ss}. " + due, "ixl")
        rows = ["Open IXL and start today's skills.",
                "Work on paper where the question needs work. The answer box does not show it.",
                f"Every skill listed is required, to a SmartScore of {ss}. " + due]
        self.cursor = 2.0
        self.numbered(rows, gap=0.1)
        self.cursor += 0.05
        self._text(LM + 0.2, self.cursor, CW - 0.4, 0.4, "Today's skills — all required", 21, bold=True)
        self.cursor += 0.45
        for s in skills:
            self._text(LM + 0.6, self.cursor, CW - 1.0, 0.36, s, 19, color=INK)
            self.cursor += 0.36

    # ---------- finish ----------
    def save(self, path, sidecar=True):
        """sidecar=False for the whole-unit deck: its minutes are the lessons' minutes, already
        recorded beside each lesson's own deck, and the timing check reads one period per file."""
        self.p.save(path)
        if sidecar:
            with open(path[:-5] + ".notes.json", "w") as f:
                json.dump({"deck": os.path.basename(path), "slides": self.side}, f, indent=1)
        return path
