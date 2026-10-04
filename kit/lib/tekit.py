"""Teacher's edition builder. Georgia 10.5 pt (Docs-native), INK/VOCAB/RED/GRAY.
The timing table and the slide walk are READ FROM THE DECK SIDE-CAR (HOUSE STYLE §9): the
edition owns wording, never slide numbers. A plan that does not total 53 with a whiteboard
remainder inside 10–20 throws (ruling 10)."""
import json
from docx.shared import Pt, Twips
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
from docx.enum.text import WD_BREAK
from .dockit import Doc, INK, VOCAB, RED, GRAY, LT, FILL, _set_cell_border, _cell_margins, _shade
from .profile import C

PERIOD = C.PERIOD
IXL_MIN = C.IXL_MIN


class TE(Doc):
    def __init__(self, eyebrow, title):
        super().__init__(eyebrow, title, "Teacher's Edition", key=False, name_block=False)
        st = self.d.styles["Normal"]
        st.font.name = "Georgia"; st.font.size = Pt(10.5)
        st.element.rPr.rFonts.set(qn("w:eastAsia"), "Georgia")

    def h1(self, text):
        p = self.para(text, size=15, bold=True, before=14, after=6, keep=True)
        self.underline_para(p, 8, 2)

    def h2(self, text, right=""):
        p = self.para("", before=10, after=3, keep=True)
        self._run(p, text, 11.5, bold=True)
        if right:
            self._run(p, "    " + right, 9.5, italic=True, color=GRAY)

    def body(self, text, before=0, after=6, indent=0):
        self.para(text, size=10.5, before=before, after=after, indent=indent)

    def label(self, lab, text, after=5):
        p = self.para("", before=0, after=after)
        self._run(p, lab + "  ", 10.5, bold=True)
        self.rich(p, text, size=10.5)

    def bullets(self, rows, indent=360, after=3):
        for r in rows:
            p = self.para("", before=0, after=after, indent=indent, hanging=220)
            self._run(p, "●  ", 8, color=INK, font="FreeSerif")
            self.rich(p, r, size=10.5)

    def vocab(self, rows):
        for term, defn in rows:
            p = self.para("", before=0, after=4, indent=360, hanging=360)
            self._run(p, term, 10.5, bold=True, color=VOCAB)
            self._run(p, "  —  ", 10.5)
            self.rich(p, defn, size=10.5)

    def numbered_bold(self, rows):
        """The three sentences to say out loud. Numbered, bold, nothing else."""
        for i, r in enumerate(rows):
            p = self.para("", before=0, after=5, indent=360, hanging=300)
            self._run(p, f"{i + 1}.  ", 10.5, bold=True)
            self.rich(p, r, size=10.5, bold=True)

    def slide_line(self, head, line, mins=""):
        """One slide, one line: the heading, then what to say / watch for / the answer."""
        p = self.para("", before=6, after=2, keep=True)
        self._run(p, head, 10.5, bold=True)
        if mins:
            self._run(p, "    " + mins, 9, italic=True, color=GRAY)
        if line:
            q = self.para("", before=0, after=3, indent=300)
            self.rich(q, line, size=10.5)

    def page_break(self):
        p = self.para("", before=0, after=0)
        p.add_run().add_break(WD_BREAK.PAGE)

    def off_slide(self, text):
        p = self.para("", before=0, after=4, indent=360, hanging=220)
        self._run(p, "●  ", 8, color=INK, font="FreeSerif")
        self._run(p, "OFF THE SLIDE, YOURS TO SAY: ", 10.5, bold=True, color=GRAY)
        self.rich(p, text, size=10.5)


def plan_from_sidecar(path):
    """Read the deck side-car; compute the whiteboard remainder; return (rows, wb_minutes, total).
    rows: (segment, slide range, minutes). Throws if the plan does not fit."""
    with open(path) as f:
        side = json.load(f)["slides"]
    # group consecutive slides by segment title (kind wb shares one block)
    blocks = []
    for s in side:
        seg = s["title"] if s["kind"] != "wb" else "Whiteboards"
        if s["kind"] == "title":
            seg = "Settle in; post the learning target"
        if blocks and blocks[-1]["seg"] == seg:
            blocks[-1]["last"] = s["n"]; blocks[-1]["min"] += s["min"]; blocks[-1]["subs"].append(s)
        else:
            blocks.append({"seg": seg, "first": s["n"], "last": s["n"], "min": s["min"], "kind": s["kind"], "subs": [s]})
    fixed = sum(b["min"] for b in blocks if b["kind"] != "wb")
    wb = PERIOD - fixed
    lo, hi = C.WB_RANGE
    if not (lo <= wb <= hi):
        raise RuntimeError(f"plan does not fit: fixed blocks {fixed} min leave whiteboards {wb} (need {lo}–{hi})")
    for b in blocks:
        if b["kind"] == "wb":
            b["min"] = wb
    rows = []
    for b in blocks:
        rng = str(b["first"]) if b["first"] == b["last"] else f"{b['first']}–{b['last']}"
        rows.append((b["seg"], rng, b["min"]))
    total = sum(r[2] for r in rows)
    assert total == PERIOD, total
    return rows, wb, side, blocks


def timing_table(te, rows):
    data = [["Segment", "Slides", "Time"]]
    for seg, rng, mins in rows:
        data.append([seg, rng, f"{mins} min"])
    data.append([{"text": "Total", "bold": True}, "", {"text": f"{PERIOD} min", "bold": True}])
    te.table([6660, 1200, 1500], data, header=True, size=10)
