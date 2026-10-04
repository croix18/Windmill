"""docx builder for student papers and keys (HOUSE STYLE §2–§6).
Times New Roman 11 pt body (Google-Docs-native), INK/VOCAB/RED/GRAY only, no answer boxes,
no answer lines, no benchmark codes on student paper. Student paper and key come from ONE
content call with key=True/False so they can never drift.

Structure rules baked in (§13c, traps 32/36): no nested tables; every table has a pinned
layout and a 1 pt paragraph after it; a question lives in one single-cell cantSplit table so
it is never split across a page (ruling 8).
"""
import re
from docx import Document
from docx.shared import Pt, Twips, Inches, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
from . import mathimg
from . import slotmark

INK, VOCAB, RED, GRAY, LT, FILL = "1A1A1A", "0B5394", "9E1B32", "6B6B6B", "D9D9D9", "F2F2F0"
BODY_FONT = "Times New Roman"
CW = 9360  # content width, twips


def _rgb(h):
    return RGBColor.from_string(h)


SUP = dict(zip("⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺ᵐⁿ", "0123456789-+mn"))


def _split_sup(text):
    """Unicode superscript digits have no glyph in Times New Roman / Georgia; emit them as real
    superscript runs. Returns [(piece, is_sup), ...]."""
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


def _set_cell_border(cell, **kw):
    tcPr = cell._tc.get_or_add_tcPr()
    borders = OxmlElement("w:tcBorders")
    for edge in ("top", "left", "bottom", "right"):
        val = kw.get(edge, "nil")
        el = OxmlElement(f"w:{edge}")
        if val == "nil":
            el.set(qn("w:val"), "nil")
        else:
            el.set(qn("w:val"), "single"); el.set(qn("w:sz"), str(val)); el.set(qn("w:color"), INK)
        borders.append(el)
    tcPr.append(borders)


def _shade(cell, fill):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear"); shd.set(qn("w:color"), "auto"); shd.set(qn("w:fill"), fill)
    tcPr.append(shd)


def _cell_margins(cell, top=60, bottom=60, left=100, right=100):
    tcPr = cell._tc.get_or_add_tcPr()
    mar = OxmlElement("w:tcMar")
    for k, v in (("top", top), ("left", left), ("bottom", bottom), ("right", right)):
        el = OxmlElement(f"w:{k}"); el.set(qn("w:w"), str(v)); el.set(qn("w:type"), "dxa"); mar.append(el)
    tcPr.append(mar)


def _grid(t, widths):
    tbl = t._tbl
    grid = tbl.tblGrid
    for gc in list(grid):
        grid.remove(gc)
    for w in widths:
        gc = OxmlElement("w:gridCol"); gc.set(qn("w:w"), str(w)); grid.append(gc)
    tblPr = tbl.tblPr
    for old in tblPr.findall(qn("w:tblW")):
        tblPr.remove(old)
    tw = OxmlElement("w:tblW"); tw.set(qn("w:w"), str(sum(widths))); tw.set(qn("w:type"), "dxa"); tblPr.append(tw)


class Doc:
    def __init__(self, eyebrow, title, sub, key=False, name_block=True, margins=1440,
                 banner="ANSWER KEY"):
        self.key = key
        self.banner = banner          # ruling 32: a student's copy says WORKED ANSWERS
        self.d = Document()
        st = self.d.styles["Normal"]
        st.font.name = BODY_FONT; st.font.size = Pt(11); st.font.color.rgb = _rgb(INK)
        st.element.rPr.rFonts.set(qn("w:eastAsia"), BODY_FONT)
        st.paragraph_format.space_after = Pt(0)
        sec = self.d.sections[0]
        sec.page_width = Twips(12240); sec.page_height = Twips(15840)
        sec.top_margin = Twips(900); sec.bottom_margin = Twips(900)
        sec.left_margin = Twips(margins); sec.right_margin = Twips(margins)
        self.cw = 12240 - 2 * margins
        self._n = 0
        self._header(eyebrow, title, sub, name_block)

    # ---------- primitives ----------
    def _run(self, p, text, size=11, bold=False, italic=False, color=INK, font=None):
        r = None
        # a printed page is black and white on a copier: a slot mark never colours it (§2a)
        for piece, sup in _split_sup(slotmark.strip(text)):
            r = p.add_run(piece)
            r.font.size = Pt(size); r.font.bold = bold; r.font.italic = italic
            r.font.color.rgb = _rgb(color)
            if sup:
                r.font.superscript = True
            if font:
                r.font.name = font; r._r.get_or_add_rPr().rFonts.set(qn("w:eastAsia"), font)
        return r

    def para(self, text="", size=11, bold=False, italic=False, color=INK, before=0, after=0,
             indent=0, hanging=0, align=None, keep=False, container=None, nowidow=False):
        target = container if container is not None else self.d
        if container is not None and getattr(container, "_fresh", False):
            p = container.paragraphs[0]; container._fresh = False   # a block's first paragraph
        else:
            p = target.add_paragraph()
        pf = p.paragraph_format
        pf.space_before = Pt(before); pf.space_after = Pt(after)
        if indent: pf.left_indent = Twips(indent)
        if hanging: pf.first_line_indent = Twips(-hanging)
        if align == "center": p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        if align == "right": p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        if keep: pf.keep_with_next = True
        if nowidow:
            # LibreOffice drops a heading's keep-with-next when widow/orphan control cannot split
            # the paragraph after it; letting that one paragraph split keeps the heading with it.
            pf.widow_control = False
        if text:
            self.rich(p, text, size=size, bold=bold, italic=italic, color=color)
        return p

    def rich(self, p, text, size=11, bold=False, italic=False, color=INK):
        """Inline markup: $latex$ becomes an image; **bold**; __vocab__ (blue bold)."""
        text = slotmark.strip(text or "").replace("\\$", "\ue000")      # \$ is a literal dollar sign (money)
        parts = re.split(r"(\$[^$]+\$|\*\*[^*]+\*\*|__[^_]+__)", text)
        for part in parts:
            if not part:
                continue
            if part.startswith("$") and part.endswith("$"):
                self.img(p, part[1:-1].replace("\ue000", "\\$"), color=color)
                continue
            part = part.replace("\ue000", "$")
            if part.startswith("**"):
                self._run(p, part[2:-2], size, True, italic, color)
            elif part.startswith("__"):
                self._run(p, part[2:-2], size, True, italic, VOCAB)
            else:
                self._run(p, part, size, bold, italic, color)

    def img(self, p, latex, surface="doc", color=INK):
        path, w, h = mathimg.m(latex, surface, color)
        r = p.add_run()
        r.add_picture(path, width=Inches(w), height=Inches(h))
        return r

    def spacer(self, pt=1):
        p = self.d.add_paragraph()
        p.paragraph_format.space_after = Pt(0); p.paragraph_format.space_before = Pt(0)
        r = p.add_run(); r.font.size = Pt(pt)
        p.paragraph_format.line_spacing = Pt(pt)
        return p

    def rule(self, sz=8, before=2, after=2, keep=False):
        p = self.d.add_paragraph()
        p.paragraph_format.space_before = Pt(before); p.paragraph_format.space_after = Pt(after)
        if keep: p.paragraph_format.keep_with_next = True
        pPr = p._p.get_or_add_pPr()
        bdr = OxmlElement("w:pBdr"); b = OxmlElement("w:bottom")
        b.set(qn("w:val"), "single"); b.set(qn("w:sz"), str(sz)); b.set(qn("w:space"), "1"); b.set(qn("w:color"), INK)
        bdr.append(b); pPr.append(bdr)
        r = p.add_run(); r.font.size = Pt(2)
        return p

    def block(self):
        """A borderless single-cell table that cannot split across pages. Write into it with
        para(..., container=cell) / section(..., container=cell). Used where LibreOffice drops a
        heading's keep-with-next: it leaves a heading alone at the foot of a page whenever not
        even one line of the next paragraph fits."""
        t = self.d.add_table(rows=1, cols=1); t.autofit = False
        lay = OxmlElement("w:tblLayout"); lay.set(qn("w:type"), "fixed"); t._tbl.tblPr.append(lay)
        c = t.rows[0].cells[0]; c.width = Twips(self.cw)
        _set_cell_border(c); _cell_margins(c, 0, 0, 0, 0)
        _grid(t, [self.cw])
        trPr = t.rows[0]._tr.get_or_add_trPr(); trPr.append(OxmlElement("w:cantSplit"))
        c._fresh = True
        return c

    def underline_para(self, p, sz=8, space=1):
        """Bottom border ON the paragraph itself: an empty rule paragraph is not kept with its
        heading by LibreOffice, a border on the heading paragraph always is."""
        pPr = p._p.get_or_add_pPr()
        bdr = OxmlElement("w:pBdr"); b = OxmlElement("w:bottom")
        b.set(qn("w:val"), "single"); b.set(qn("w:sz"), str(sz)); b.set(qn("w:space"), str(space)); b.set(qn("w:color"), INK)
        bdr.append(b); pPr.append(bdr)

    def table(self, widths, rows, header=False, borders=True, align_center=False, size=11,
              shade_header=True, cell_align=None, keep=False):
        """rows: list of lists of cell content strings (rich markup allowed). Returns table."""
        # A math span in a cell is an inline picture: it cannot wrap, so one wider than its column
        # is silently clipped at the cell edge. Text wraps and the row grows, so only the pictures
        # are measured here.
        for ri, row in enumerate(rows):
            for ci, content in enumerate(row):
                txt = content.get("text", "") if isinstance(content, dict) else (content or "")
                txt = slotmark.strip(str(txt)).replace("\\$", "")          # \$ is money, not a math delimiter
                for part in re.findall(r"\$[^$]+\$", txt):
                    _, mw, _ = mathimg.m(part[1:-1], "doc", INK)
                    avail = widths[ci] / 1440 - 200 / 1440
                    if mw > avail:
                        raise RuntimeError(f"math in a table cell is wider than its column "
                                           f"({mw:.2f} in in {widths[ci] / 1440:.2f} in): {part[:50]!r}")
        t = self.d.add_table(rows=0, cols=len(widths))
        t.autofit = False
        tblPr = t._tbl.tblPr
        lay = OxmlElement("w:tblLayout"); lay.set(qn("w:type"), "fixed"); tblPr.append(lay)
        if align_center:
            t.alignment = WD_TABLE_ALIGNMENT.CENTER
        for ri, row in enumerate(rows):
            tr = t.add_row()
            trPr = tr._tr.get_or_add_trPr()
            cs = OxmlElement("w:cantSplit"); trPr.append(cs)
            if header and ri == 0:
                th = OxmlElement("w:tblHeader"); trPr.append(th)
            for ci, content in enumerate(row):
                c = tr.cells[ci]
                c.width = Twips(widths[ci])
                _cell_margins(c)
                if borders:
                    _set_cell_border(c, top=6, left=6, bottom=6, right=6)
                else:
                    _set_cell_border(c)
                if header and ri == 0 and shade_header:
                    _shade(c, LT)
                p = c.paragraphs[0]
                p.paragraph_format.space_after = Pt(0)
                if cell_align == "center" or (header and ri == 0):
                    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                if (keep and ri < len(rows) - 1) or (header and ri == 0 and len(rows) > 1):
                    # keep: every row keeps with the next and the last row lets go. A header row
                    # always keeps with the first body row: LibreOffice has dropped a whole table
                    # body when a page broke right after a repeated header row.
                    p.paragraph_format.keep_with_next = True
                if content is None:
                    continue
                if isinstance(content, dict):
                    self.rich(p, content.get("text", ""), size=content.get("size", size),
                              bold=content.get("bold", header and ri == 0), italic=content.get("italic", False),
                              color=content.get("color", INK))
                    if content.get("align") == "center": p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                else:
                    self.rich(p, content, size=size, bold=(header and ri == 0))
        # widths must be set on every cell AND on the grid for a fixed layout
        for row in t.rows:
            for ci, c in enumerate(row.cells):
                c.width = Twips(widths[ci])
        _grid(t, widths)
        self.spacer(1)  # never let two tables touch (trap 36)
        return t

    # ---------- header ----------
    def _header(self, eyebrow, title, sub, name_block):
        t = self.d.add_table(rows=1, cols=2); t.autofit = False
        lay = OxmlElement("w:tblLayout"); lay.set(qn("w:type"), "fixed"); t._tbl.tblPr.append(lay)
        lw, rw = self.cw - 3540, 3540
        c0, c1 = t.rows[0].cells
        c0.width = Twips(lw); c1.width = Twips(rw)
        for c in (c0, c1):
            _set_cell_border(c); _cell_margins(c, 0, 0, 0, 0)
        _grid(t, [lw, rw])
        p = c0.paragraphs[0]; p.paragraph_format.space_after = Pt(1)
        r = self._run(p, eyebrow, 8.5, color=GRAY); r.font.all_caps = True
        r.font.character_spacing = Pt(1.2) if hasattr(r.font, "character_spacing") else None
        p = c0.add_paragraph(); p.paragraph_format.space_after = Pt(1)
        self._run(p, title, 14, bold=True)
        p = c0.add_paragraph(); p.paragraph_format.space_after = Pt(0)
        self.rich(p, sub, size=9.5, italic=True, color=GRAY)
        if self.key:
            self._run(p, "     " + self.banner, 9.5, bold=True, color=RED)
        p = c1.paragraphs[0]; p.paragraph_format.space_after = Pt(0)
        if name_block:
            for i, lab in enumerate(("Name", "Date", "Period")):
                if i: p = c1.add_paragraph(); p.paragraph_format.space_after = Pt(0)
                self._run(p, lab + ("_" * (26 - len(lab)) if not self.key else ""), 10)
        self.spacer(1)
        self.rule(14, 2, 0); self.rule(4, 0, 4)

    def instruction(self, text):
        self.para(text, size=9.5, italic=True, color=GRAY, before=2, after=8)

    def section(self, title, right="", container=None):
        p = self.para("", before=10, after=6, keep=True, container=container)
        self._run(p, title, 12, bold=True)
        if right:
            p.add_run("\t"); self._run(p, right, 9.5, italic=True, color=GRAY)
            pPr = p._p.get_or_add_pPr(); tabs = OxmlElement("w:tabs"); tab = OxmlElement("w:tab")
            tab.set(qn("w:val"), "right"); tab.set(qn("w:pos"), str(self.cw)); tabs.append(tab); pPr.append(tabs)
        self.underline_para(p, 8, 2)

    def heading(self, text):
        """A bold instruction heading between question groups."""
        self.para(text, bold=True, before=11.5, after=7.5, keep=True)

    # ---------- questions ----------
    def question(self, stem, answer=None, reasoning=None, space=1.0, parts=None, points=None,
                 choices=None, choice_answer=None, table=None, number=None, lines=None, fig=None):
        """One question in one unsplittable block.
        stem: rich text. answer/reasoning: key only. space: inches of work room (student only).
        parts: list of (label, text, answer, reasoning, space). choices: list of rich strings
        (bubbles) with choice_answer the index/indices of the correct one(s).
        points: per-part points printed on assessments (list matching parts, or int).
        table: optional (widths, rows, header) rendered inside the block."""
        self._n += 1
        n = number or self._n
        t = self.d.add_table(rows=1, cols=1); t.autofit = False
        lay = OxmlElement("w:tblLayout"); lay.set(qn("w:type"), "fixed"); t._tbl.tblPr.append(lay)
        c = t.rows[0].cells[0]; c.width = Twips(self.cw)
        _set_cell_border(c); _cell_margins(c, 0, 0, 0, 0)
        _grid(t, [self.cw])
        trPr = t.rows[0]._tr.get_or_add_trPr(); trPr.append(OxmlElement("w:cantSplit"))
        p = c.paragraphs[0]
        pf = p.paragraph_format; pf.space_before = Pt(10); pf.space_after = Pt(6)
        pf.left_indent = Twips(420); pf.first_line_indent = Twips(-420)
        self._run(p, f"{n}.   ", 11, bold=True)
        self.rich(p, stem)
        if points is not None and not parts:
            self._pts(p, points)
        if fig:                                   # a figure drawn from the item's own numbers
            from . import figkit
            path, w, h = figkit.draw(fig, fig.get("in", 2.4))
            fp = c.add_paragraph(); fp.alignment = WD_ALIGN_PARAGRAPH.CENTER
            fp.paragraph_format.space_before = Pt(2); fp.paragraph_format.space_after = Pt(4)
            fp.add_run().add_picture(path, width=Inches(w), height=Inches(h))
        if table:
            widths, rows, hdr = table
            self._inner_table(c, widths, rows, hdr)
        if choices:
            self._choices(c, choices, choice_answer)
        if parts:
            for i, part in enumerate(parts):
                lab, text, ans, why, sp = (list(part) + [None, None, None, None])[:5]
                pp = c.add_paragraph(); pf = pp.paragraph_format
                pf.space_before = Pt(4); pf.space_after = Pt(4)
                pf.left_indent = Twips(900); pf.first_line_indent = Twips(-380)
                self._run(pp, f"{lab}.  ", 11, bold=True); self.rich(pp, text)
                if points is not None:
                    pt = points[i] if isinstance(points, (list, tuple)) else 1
                    self._pts(pp, pt)
                if self.key:
                    self._answer(c, ans, why, indent=900)
                else:
                    self._space(c, sp if sp is not None else space)
        else:
            if self.key:
                self._answer(c, answer, reasoning, indent=420)
            else:
                if lines:
                    for _ in range(lines):
                        self.para("", container=c)
                else:
                    self._space(c, space)
        if self.key and points is not None:
            self._scoring(c, points, parts)
        self.spacer(1)
        return n

    def _pts(self, p, pts):
        p.add_run("\t"); self._run(p, f"{pts} pt" + ("s" if pts != 1 else ""), 9.5, italic=True, color=GRAY)
        pPr = p._p.get_or_add_pPr(); tabs = OxmlElement("w:tabs"); tab = OxmlElement("w:tab")
        tab.set(qn("w:val"), "right"); tab.set(qn("w:pos"), str(self.cw)); tabs.append(tab); pPr.append(tabs)

    def _scoring(self, c, points, parts):
        if parts:
            ptl = points if isinstance(points, (list, tuple)) else [1] * len(parts)
            items = " · ".join(f"{p[0]} {v}" for p, v in zip(parts, ptl))
            total = sum(ptl)
            text = f"Scoring: {items} = {total} point{'s' if total != 1 else ''}."
        else:
            text = f"Scoring: {points} point{'s' if points != 1 else ''}."
        pp = c.add_paragraph(); pp.paragraph_format.space_before = Pt(2); pp.paragraph_format.space_after = Pt(6)
        pp.paragraph_format.left_indent = Twips(420)
        self._run(pp, text, 9.5, italic=True, color=GRAY)

    def _space(self, c, inches):
        if inches and inches > 0:
            pp = c.add_paragraph(); pp.paragraph_format.space_after = Pt(inches * 72)

    def _answer(self, c, ans, why, indent=420):
        if ans:
            pp = c.add_paragraph(); pf = pp.paragraph_format
            pf.space_before = Pt(2); pf.space_after = Pt(3); pf.left_indent = Twips(indent)
            self.rich(pp, ans, bold=True, italic=True, color=RED)
        if why:
            pp = c.add_paragraph(); pf = pp.paragraph_format
            pf.space_before = Pt(0); pf.space_after = Pt(6); pf.left_indent = Twips(indent)
            self.rich(pp, why, size=9.5, italic=True, color=GRAY)

    def _choices(self, c, choices, correct):
        corr = set(correct if isinstance(correct, (list, tuple, set)) else [correct]) if correct is not None else set()
        multi = isinstance(correct, (list, tuple, set))
        for i, ch in enumerate(choices):
            pp = c.add_paragraph(); pf = pp.paragraph_format
            pf.space_before = Pt(2); pf.space_after = Pt(2); pf.left_indent = Twips(1300); pf.first_line_indent = Twips(-380)
            mark = ("☒" if i in corr else "☐") if (self.key and multi) else ("●" if (self.key and i in corr) else ("□" if multi else "○"))
            r = self._run(pp, mark + "   ", 11, color=(RED if (self.key and i in corr) else INK), font="FreeSerif")
            self.rich(pp, f"{chr(65 + i)}.  " + ch, color=(RED if (self.key and i in corr) else INK),
                      bold=(self.key and i in corr))

    def _inner_table(self, c, widths, rows, header):
        """A data table INSIDE a question block. Nested tables break Google Docs (§13c), so the
        question block is closed and the table is emitted at top level, then a new block follows."""
        raise RuntimeError("inner tables are not allowed; use Doc.table() between questions")

    # ---------- finish ----------
    def save(self, path):
        # every paragraph in a question block keeps with next so LibreOffice honours cantSplit
        self.d.save(path)
        return path


def stem_only(doc, text, before=11.5, after=7.5):
    doc.para(text, bold=True, before=before, after=after, keep=True)
