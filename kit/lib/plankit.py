"""Ruling 25: a Florida-format lesson plan per lesson, with the MTRs named and the evidence for
each, one page-set per lesson, one period. Everything that can be read from the deck's side-car
is read, never typed, so the plan cannot drift from the deck.

Two styles carry the same content, and the course's profile picks (C.PLAN_STYLE):
  "sections"  ten numbered sections with tables
  "labels"    headed paragraphs with bold labels — the plan Croix approved for the M7 Unit 3
              review day (tools/mkplan.py)
"""
import os
from docx.shared import Pt
from docx.oxml.ns import qn
from .dockit import Doc, INK, GRAY, RED, VOCAB
from . import tekit
from .profile import C
from .lessonbuild import MTR_TEXT, REVOTE, board_text, differentiation_rows, _plain, _label

COURSE, PREFIX = C.COURSE, C.PREFIX


def build_plan(L, deck_path, outdir):
    return (_plan_labels if C.PLAN_STYLE == "labels" else _plan_sections)(L, deck_path, outdir)

SPLIT_MOVE = ("When a board splits — no option holding about two-thirds of the room — sixty "
              "seconds of “convince the person next to you”, then re-vote, then reveal. "
              "The minute comes out of the whiteboard remainder.")


def _plan_sections(L, deck_path, outdir):
    course, label = COURSE, _label(L)
    rows, wb_min, side, blocks = tekit.plan_from_sidecar(deck_path[:-5] + ".notes.json")
    code = L["code"]
    doc = Doc(f"{course}  ·  Unit {L['unit']}  ·  {label}", L["title"], "Lesson Plan", name_block=False)

    # 1 -------------------------------------------------- info
    doc.section("1.  Lesson Information")
    doc.table([2200, 2400, 2200, 2560], [
        ["Course", f"{COURSE} ({C.COURSE_CODE})", "Unit",
         f"{L['unit']} — {L['unit_title']}" if L.get("unit_title") else str(L["unit"])],
        ["Lesson", f"{label} — {L['title']}", "Date", "____________________"],
        ["Length", f"{tekit.PERIOD} minutes (one period)", "Benchmark(s)", L["benchmark"]],
    ], header=False, size=10)

    # 2 -------------------------------------------------- standards
    blk = doc.block()
    doc.section("2.  Standards", container=blk)
    doc.para(f"**{L['benchmark']}**  {L['benchmark_text']}", size=10.5, before=2, after=4, container=blk)
    T = L["te"]
    notes = dict(T.get("standard_notes", []))
    must = T.get("must") or notes.get("Clarification") or notes.get("Benchmark")
    if must:
        doc.para("**Must.**  " + must, size=10.5, before=0, after=3, container=blk)
    if T.get("must_not") or notes.get("Boundary"):
        doc.para("**Must not.**  " + (T.get("must_not") or notes.get("Boundary")), size=10.5, before=0, after=4, container=blk)
    doc.spacer(1)

    # 3 -------------------------------------------------- MTRs, with evidence
    doc.section("3.  Mathematical Thinking and Reasoning Standards", "the evidence for each, from this period")
    rows_mtr = [["MTR", "What it asks", "The evidence in this lesson"]]
    for mtr, ev in L["mtr"]:
        rows_mtr.append([f"MA.K12.{mtr}", MTR_TEXT.get(mtr, ""), ev])
    doc.table([1500, 3400, 4460], rows_mtr, header=True, size=10)

    # 4 -------------------------------------------------- target and essential question
    blk = doc.block()
    doc.section("4.  Learning Target and Essential Question", container=blk)
    doc.para("**Learning target.**  " + L["target"], size=10.5, before=2, after=3, container=blk)
    doc.para("**Essential question.**  " + L["essential"], size=10.5, before=0, after=3, container=blk)
    doc.para("**Building on.**  " + L["building_on"], size=10, before=0, after=2, container=blk)
    doc.para("**Working toward.**  " + L["working_toward"], size=10, before=0, after=4, container=blk)
    doc.spacer(1)

    # 5 -------------------------------------------------- sequence, read from the deck
    doc.section("5.  Sequence", "read from the deck; never typed")
    seq = [["Segment", "Min", "What the teacher does", "What students do"]]
    for b in blocks:
        first = b["subs"][0]
        seg = b["seg"]
        mins = wb_min if b["kind"] == "wb" else b["min"]
        if b["kind"] == "title":
            t, s_ = "Post the target; say the 'today' line and nothing else yet.", "Copy the target."
        elif b["kind"] == "warmup":
            t, s_ = "Two minutes silent, then reveal. One sentence of reteach per question at most.", "Four retrieval questions, alone, no notes."
        elif b["kind"] == "notes":
            t, s_ = "Teach from the front. Expand once per law; say the OFF line out loud.", "Copy the notes; answer the checks aloud."
        elif b["kind"] == "example":
            t, s_ = "Work the example; name the wrong boards before they appear.", "Watch, then work the Your Turn alone."
        elif b["kind"] == "yourturn":
            t, s_ = "Circulate; reveal and name what a wrong board most likely did.", "Work it alone; boards up on the cue."
        elif b["kind"] == "wb":
            t, s_ = "One question at a time. Boards down until the cue, all up together; scan the back row first.", "Answer on a board; hold it up on three."
        elif b["kind"] == "independent":
            t, s_ = "Silent. Circulate and mark what you see; do not teach.", "Six questions, written, alone."
        else:
            t, s_ = "Assign the day's IXL skills.", "Start the skills; finish tonight."
        seq.append([seg, f"{mins}", t, s_])
    seq.append([{"text": "Total", "bold": True}, {"text": str(tekit.PERIOD), "bold": True}, "", ""])
    doc.table([2300, 620, 3300, 3140], seq, header=True, size=9.5)

    # 6 -------------------------------------------------- gradual release
    blk = doc.block()
    doc.section("6.  Gradual Release", container=blk)
    doc.para("**I do.**  The Notes slides and the worked half of each Example: the teacher writes, the class copies, and the OFF line is said out loud rather than printed.", size=10.5, before=2, after=3, container=blk)
    doc.para("**We do.**  Each Example's Your Turn: the same steps on the student's own numbers, revealed and named a minute later.", size=10.5, before=0, after=3, container=blk)
    doc.para(f"**You do.**  The nine-question whiteboard round ({wb_min} minutes) and then the six-question independent set, silent and written.", size=10.5, before=0, after=4, container=blk)
    doc.spacer(1)

    # 7 -------------------------------------------------- higher-order questions with DOK
    doc.section("7.  Higher-Order Questions")
    hq = [["Question", "DOK"]]
    for q, dok in L.get("hoq", []):
        hq.append([q, dok])
    doc.table([7860, 1500], hq, header=True, size=10)

    # 8 -------------------------------------------------- checks for understanding, with the response
    doc.section("8.  Checks for Understanding", "each board, and what to do about it")
    chk = [["#", "What the board asks", "Answer", "If the board is wrong"]]
    for i, q in enumerate(L["whiteboard"]):
        qt = board_text(q)
        ans = q.get("answer") or ("$" + q.get("answer_latex", "") + "$")
        errs = q.get("errors") or {}
        wrong = "; ".join(f"({k}) {v}" for k, v in errs.items()) if errs else q.get("wrong", "")
        chk.append([str(i + 1), qt, {"text": ans, "bold": True, "italic": True, "color": RED}, wrong])
    doc.table([400, 3100, 1900, 3960], chk, header=True, size=9)
    doc.para("**MTR.4.1 — the one peer move.**  " + SPLIT_MOVE, size=10, before=4, after=4)

    # 9 -------------------------------------------------- differentiation
    blk = doc.block()
    doc.section("9.  Differentiation", container=blk)
    d = differentiation_rows(L)
    for k, (lab, txt) in enumerate(d):
        doc.para(f"**{lab}.**  " + txt, size=10.5, before=2 if k == 0 else 0, after=4 if k == len(d) - 1 else 3, container=blk)
    doc.spacer(1)

    # 10 ------------------------------------------------- closure, vocabulary, materials, homework
    blk = doc.block()
    doc.section("10.  Closure, Vocabulary, Materials, Practice", container=blk)
    doc.para("**Closure.**  " + L.get("closure", "The last board is written work; it is the exit evidence. Read the boards, not the papers."), size=10.5, before=2, after=3, container=blk)
    doc.para("**Vocabulary.**  " + "; ".join(f"__{t}__" for t, _ in L["vocab"]), size=10.5, before=0, after=3, container=blk)
    doc.para("**Materials.**  " + T.get("materials", "Whiteboards and markers."), size=10.5, before=0, after=3, container=blk)
    doc.para("**Practice.**  The six-question independent set is worked silently in class; whatever is not finished goes home. "
             + f"IXL, all skills required to a SmartScore of {C.IXL_SMARTSCORE}, "
             + (L["ixl_due"].rstrip(".")[0].lower() + L["ixl_due"].rstrip(".")[1:] if L.get("ixl_due") else "due at the start of the next class")
             + ": " + "; ".join(L["ixl"]) + ".", size=10.5, before=0, after=4, container=blk)
    doc.spacer(1)

    name = f"{PREFIX} {code}  Lesson Plan.docx"
    path = os.path.join(outdir, name)
    doc.save(path)
    return path


# ------------------------------------------------------------------ the labels style
class Plan(Doc):
    def __init__(self, eyebrow, title):
        super().__init__(eyebrow, title, "Lesson Plan", key=False, name_block=False)
        st = self.d.styles["Normal"]
        st.font.name = "Georgia"; st.font.size = Pt(10.5)
        st.element.rPr.rFonts.set(qn("w:eastAsia"), "Georgia")

    def h1(self, text):
        p = self.para(text, size=13.5, bold=True, before=13, after=5, keep=True)
        self.underline_para(p, 8, 2)

    def label(self, lab, text, after=5, indent=0):
        p = self.para("", before=0, after=after, indent=indent)
        self._run(p, lab + "  ", 10.5, bold=True)
        self.rich(p, text, size=10.5)

    def body(self, text, before=0, after=5, indent=0):
        self.para(text, size=10.5, before=before, after=after, indent=indent)

    def bullets(self, rows, indent=360, after=3):
        for r in rows:
            p = self.para("", before=0, after=after, indent=indent, hanging=220)
            self._run(p, "●  ", 8, color=INK, font="FreeSerif")
            self.rich(p, r, size=10.5)


def _gradual_release(blocks):
    """Map the period's blocks onto I do / we do / you do from what the deck actually contains."""
    names = {b["seg"] for b in blocks}
    i_do = [b["seg"] for b in blocks if b["kind"] in ("notes",)]
    we_do = [b["seg"] for b in blocks if b["kind"] in ("example", "yourturn")]
    you_do = [b["seg"] for b in blocks if b["kind"] in ("wb", "set", "ixl")]
    return i_do, we_do, you_do


def _plan_labels(L, deck_path, outdir):
    side_path = deck_path[:-5] + ".notes.json"
    rows, wb_min, side, blocks = tekit.plan_from_sidecar(side_path)
    eyebrow = f"{COURSE}  ·  Unit {L['unit']}"
    P = Plan(eyebrow, L["title"])
    T = L["te"]

    P.table([2100, 2600, 2200, 2460], [
        [{"text": "Teacher", "bold": True}, "Croix Shaffer", {"text": "Course", "bold": True}, f"{COURSE} ({C.COURSE_CODE})"],
        [{"text": "Unit", "bold": True}, f"Unit {L['unit']}", {"text": "Lesson", "bold": True}, f"{L['code']} — {L['title']}"],
        [{"text": "Date", "bold": True}, "", {"text": "Length", "bold": True}, f"{C.PERIOD} minutes"],
    ], header=False, size=10)

    P.h1("Standards")
    for bc, bt in L.get("benchmarks") or [(L["benchmark"], L["benchmark_text"])]:
        P.label(bc, bt)           # a lesson on two benchmarks (4.10) prints both, in full
    if T.get("must"):
        P.label("Instruction must", T["must"])
    if T.get("must_not"):
        P.label("Must not ask", T["must_not"])

    P.h1("Mathematical Thinking and Reasoning")
    P.body("Named because the period exercises them, with where:")
    P.bullets([f"**{c}** {MTR_TEXT.get(c, '').rstrip('.')} — {why}" for c, why in L["mtr"]])

    P.h1("Learning Target and Essential Question")
    tgt = L["target"]
    if tgt.lower().startswith("i can "):
        tgt = tgt[6:]
    P.label("I can", tgt)
    P.label("Essential question", L["essential"])
    P.label("Building on", L["building_on"])
    P.label("Working toward", L["working_toward"])

    P.h1("Sequence")
    data = [["Segment", "Min", "Teacher", "Students"]]
    for b in blocks:
        mins = wb_min if b["kind"] == "wb" else b["min"]
        t, s = _moves(b)
        data.append([b["seg"], str(mins), t, s])
    data.append([{"text": "Total", "bold": True}, {"text": str(C.PERIOD), "bold": True}, "", ""])
    P.table([2000, 520, 3420, 3420], data, header=True, size=9)

    P.h1("Gradual Release")
    i_do, we_do, you_do = _gradual_release(blocks)
    P.label("I do", "Notes I–III, taught from the front; each worked example's first pass.")
    P.label("We do", "Each example's Your Turn — same steps, their numbers, boards up when done.")
    if L.get("no_set"):
        P.label("You do", f"The whiteboard round ({wb_min} min, individual boards) and IXL ({C.IXL_MIN} min).")
    else:
        P.label("You do", f"The whiteboard round ({wb_min} min, individual boards), the six-question "
                          f"independent set ({C.SET_MIN} min, silent, in writing), and IXL ({C.IXL_MIN} min).")

    P.h1("Higher-Order Questions")
    for q, dok in L["hoq"]:
        p = P.para("", before=0, after=4, indent=360, hanging=220)
        P._run(p, "●  ", 8, color=INK, font="FreeSerif")
        P.rich(p, q, size=10.5)
        P._run(p, f"   (DOK {dok})", 9.5, italic=True, color=GRAY)

    P.h1("Checks for Understanding — and the response to each")
    data = [["Check", "Looks like", "If it is wrong"]]
    for i, q in enumerate(L["whiteboard"]):
        ans = q.get("te_answer") or q.get("answer") or _plain(q.get("answer_latex", ""))
        errs = q.get("errors") or {}
        resp = "; ".join(f"({k}) {v}" for k, v in errs.items()) if errs else q.get("wrong", "")
        if q.get("kind") == "mc":
            resp = (resp + "  " if resp else "") + REVOTE
        data.append([f"Board {i + 1}", {"text": ans, "bold": True, "color": RED}, resp])
    P.table([1100, 2000, 6260], data, header=True, size=9)

    P.h1("Differentiation")
    for lab, txt in differentiation_rows(L):
        P.label(lab, txt)

    P.h1("Closure")
    P.body(T.get("closure", "Before You Go: the one sentence today lives on, said back to the room" +
                            ("." if L.get("no_set") else ", then the independent set is collected on the way out.")))

    P.h1("Vocabulary, Materials, Homework")
    P.label("Vocabulary", "; ".join(t for t, _ in L["vocab"]))
    P.label("Materials", T.get("materials", "Whiteboards and markers. Calculators are allowed on "
                                            "everything and are printed on nothing."))
    # derived from the lesson's IXL list and due line, never typed twice (4.06's typed copy had
    # drifted from its own slide — 4 Oct)
    due = L.get("ixl_due") or "Due at the start of the next class."
    P.label("Homework", f"IXL: {'; '.join(L['ixl'])} — SmartScore {C.IXL_SMARTSCORE} on each. {due} "
                        f"Whatever is not finished in the last five minutes is tonight's work.")

    name = f"{PREFIX} {L['code']}  Lesson Plan.docx"
    path = os.path.join(outdir, name)
    P.save(path)
    return path


def _moves(b):
    """What the teacher does and what students do, per segment kind."""
    k = b["kind"]
    return {
        "title": ("Post the target; say the 'today' line and nothing else yet.", "Settle, copy the target."),
        "warmup": ("Two minutes silent, then reveal; one sentence of reteach per question at most.",
                   "Four retrieval questions from memory, on their own, no notes."),
        "notes": ("Teach from the front; the off-slide sentence is said, not shown.",
                  "Copy the notes; answer the questioning prompts on a count."),
        "example": ("Work the example aloud, naming the step before doing it.",
                    "Watch, then write the same steps."),
        "yourturn": ("Circulate; name what a wrong board most likely did.",
                     "Same steps, their numbers; boards up when done."),
        "wb": ("One board at a time, boards down until the cue, all up together; scan the back row "
               "first and question the blank boards before the wrong ones. On a split, the re-vote.",
               "Individual whiteboards; question 9 is written in sentences."),
        "set": ("Silent. Circulate and mark the first two questions only.",
                "Six questions, at their own pace, in writing."),
        "ixl": ("Post the codes; check SmartScore as they go.",
                f"Open the listed skills and work to SmartScore {C.IXL_SMARTSCORE}."),
    }.get(k, ("", ""))
