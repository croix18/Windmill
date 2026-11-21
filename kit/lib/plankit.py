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
from . import names
from . import ixlplan
from .profile import C
from .lessonbuild import MTR_TEXT, REVOTE, board_text, differentiation_rows, _plain, _label

COURSE, PREFIX = C.COURSE, C.PREFIX


# The plan's line for the title slide. A course that builds no Teacher Edition (TEACHER_EDITION = False, 20 Nov 2026)
# has no line to send the teacher to — the edition printed the slide's note and nothing else does — and no off-slide
# sentence printed anywhere, so the plan names neither.
TITLE_MOVE = "Post the learning target and say the one line the Teacher's Edition gives for it. Teaching begins with the warm-up."
TITLE_MOVE_NO_TE = "Post the learning target and read it aloud once."


def build_plan(L, deck_path, outdir):
    return (_plan_labels if C.PLAN_STYLE == "labels" else _plan_sections)(L, deck_path, outdir)

# Ruling 59 (Croix, 21 Nov 2026: the plans are read by "John or admin: write it out"): every sentence the plan prints is
# a whole sentence a reader who did not build the lesson can follow. No shorthand, no build-room note, no ruling number.
SPLIT_MOVE = ("If fewer than about two-thirds of the class choose the same answer to a multiple-choice question, "
              "students have one minute to convince the person next to them. The class then votes again before the "
              "answer is revealed. That minute comes out of the time left for the whiteboard round.")


def _plan_sections(L, deck_path, outdir):
    course, label = COURSE, _label(L)
    rows, wb_min, side, blocks = tekit.plan_from_sidecar(deck_path[:-5] + ".notes.json")
    code = L["code"]
    doc = Doc(f"{course}  ·  Unit {L['unit']}  ·  {label}", L["title"], "Lesson Plan", name_block=False, font=getattr(C, "DOC_FONT", None))

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
    T = L.get("te") or {}
    notes = dict(T.get("standard_notes", []))
    must = T.get("must") or notes.get("Clarification") or notes.get("Benchmark")
    if must:
        doc.para("**Required by the benchmark.**  " + must, size=10.5, before=0, after=3, container=blk)
    if T.get("must_not") or notes.get("Boundary"):
        doc.para("**Not part of this lesson.**  " + (T.get("must_not") or notes.get("Boundary")), size=10.5, before=0, after=4, container=blk)
    doc.spacer(1)

    # 3 -------------------------------------------------- MTRs, with evidence
    doc.section("3.  Mathematical Thinking and Reasoning Standards")
    rows_mtr = [["Standard", "What the standard asks", "Where it appears in this lesson"]]
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
    doc.section("5.  Sequence")
    seq = [["Segment", "Min", "What the teacher does", "What students do"]]
    for b in blocks:
        first = b["subs"][0]
        seg = b["seg"]
        mins = wb_min if b["kind"] == "wb" else b["min"]
        if b["kind"] == "title":
            t, s_ = (TITLE_MOVE if C.TEACHER_EDITION else TITLE_MOVE_NO_TE), "Copy the learning target."
        elif b["kind"] == "warmup":
            # silent for the minutes the row gives (the Teacher's Edition says how many); a plan that said "two minutes"
            # beside a Teacher's Edition that said four (the A7 Unit 6 second review, 25 Oct 2026)
            t, s_ = ("Students work in silence. Then reveal each answer and reteach, in one sentence, any question that many students missed.",
                     "Answer four review questions from memory, working alone and without notes.")
            if any(x["kind"] == "vocab" for x in b["subs"]):
                t += " Then read each new term and its meaning aloud once."; s_ += " Then copy the new terms."
        elif b["kind"] == "vocab":
            t, s_ = "Read each new term and its meaning aloud once. The notes that follow use these terms.", "Copy the terms and their meanings."
        elif b["kind"] == "notes":
            # "Expand once per law" was the exponents unit's move, printed in every unit's plan (A7 Unit 6, 25 Oct 2026)
            t, s_ = (("Teach the notes from the board and say aloud the sentence the Teacher's Edition gives for each slide." if C.TEACHER_EDITION
                      else "Teach the notes from the board, one slide at a time."), "Copy the notes and answer the teacher's questions aloud.")
        elif b["kind"] == "example":
            t, s_ = ("Work the example step by step. Before students try the Your Turn, point out the mistakes they are most likely to make.",
                     "Watch the example, then work the Your Turn alone.")
        elif b["kind"] == "yourturn":
            t, s_ = ("Circulate while students work. Then reveal the answer and explain the mistake behind the most common wrong answer.",
                     "Work the problem alone on a whiteboard and hold it up on the teacher's cue.")
        elif b["kind"] == "wb":
            t, s_ = ("Show one question at a time. Students keep their boards down until the cue and then raise them together. Scan the back row first.",
                     "Answer on a whiteboard and hold it up on the count of three.")
        elif b["kind"] == "independent":
            t, s_ = "Students work in silence. Circulate and mark their work without reteaching.", "Answer six questions in writing, working alone."
        else:
            # ruling 53: the skills are started with the lesson and due by the unit's test — not "finish tonight"
            t, s_ = "Assign the day's IXL skills.", "Start the assigned skills, which are " + (lambda x: x[0].lower() + x[1:])((L.get("ixl_due") or ixlplan.due_line(L)).rstrip(".")) + "."
        seq.append([seg, f"{mins}", t, s_])
    seq.append([{"text": "Total", "bold": True}, {"text": str(tekit.PERIOD), "bold": True}, "", ""])
    doc.table([2300, 620, 3300, 3140], seq, header=True, size=9.5)

    # 6 -------------------------------------------------- gradual release
    blk = doc.block()
    doc.section("6.  Gradual Release", container=blk)
    doc.para("**I do.**  The teacher presents the Notes slides and works the first half of each Example while students copy"
             + (", and says aloud the sentence the Teacher's Edition gives for each slide." if C.TEACHER_EDITION else "."), size=10.5, before=2, after=3, container=blk)
    doc.para("**We do.**  After each Example, students try a matching Your Turn problem. The class then checks the answer together and discusses the most common mistake.", size=10.5, before=0, after=3, container=blk)
    doc.para(f"**You do.**  Students answer nine whiteboard questions ({wb_min} minutes) and then complete the six-question Independent Set in writing, working silently.", size=10.5, before=0, after=4, container=blk)
    doc.spacer(1)

    # 7 -------------------------------------------------- higher-order questions with DOK
    doc.section("7.  Higher-Order Questions")
    hq = [["Question", "DOK"]]
    for q, dok in L.get("hoq", []):
        hq.append([q, dok])
    doc.table([7860, 1500], hq, header=True, size=10)

    # 8 -------------------------------------------------- checks for understanding, with the response
    doc.section("8.  Checks for Understanding")
    chk = [["#", "Whiteboard question", "Answer", "Likely wrong answers and their causes"]]
    for i, q in enumerate(L["whiteboard"]):
        qt = board_text(q)
        ans = q.get("answer") or ("$" + q.get("answer_latex", "") + "$")
        errs = q.get("errors") or {}
        wrong = "; ".join(f"({k}) {v}" for k, v in errs.items()) if errs else q.get("wrong", "")
        chk.append([str(i + 1), qt, {"text": ans, "bold": True, "italic": True, "color": RED}, wrong])
    doc.table([400, 3100, 1900, 3960], chk, header=True, size=9)
    doc.para("**Peer discussion (MTR.4.1).**  " + SPLIT_MOVE, size=10, before=4, after=4)

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
    doc.para("**Closure.**  " + L.get("closure", "The last whiteboard question is answered in writing and serves as the exit ticket. Read students' boards rather than their papers."), size=10.5, before=2, after=3, container=blk)
    # a lesson with no new word says so: "Vocabulary." with nothing after it read as a field left empty (A7 7.07, 21 Nov)
    doc.para("**Vocabulary.**  " + ("; ".join(f"__{t}__" for t, _ in L["vocab"]) or "No new terms."), size=10.5, before=0, after=3, container=blk)
    doc.para("**Materials.**  " + T.get("materials", "Whiteboards and markers."), size=10.5, before=0, after=3, container=blk)
    doc.para("**Practice.**  Students begin the six-question Independent Set in class, working silently, and finish any remaining questions at home. "
             + f"On IXL, every listed skill is required to a SmartScore of {C.IXL_SMARTSCORE} and is "
             + (lambda t: t[0].lower() + t[1:])((L.get("ixl_due") or ixlplan.due_line(L)).rstrip("."))
             + ": " + "; ".join(L["ixl"]) + ".", size=10.5, before=0, after=4, container=blk)
    doc.spacer(1)

    name = names.lesson(L, "Lesson Plan", "docx")
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
    T = L.get("te") or {}

    P.table([2100, 2600, 2200, 2460], [
        [{"text": "Teacher", "bold": True}, "Croix Shaffer", {"text": "Course", "bold": True}, f"{COURSE} ({C.COURSE_CODE})"],
        [{"text": "Unit", "bold": True}, f"Unit {L['unit']}", {"text": "Lesson", "bold": True}, f"{L['code']} — {L['title']}"],
        [{"text": "Date", "bold": True}, "", {"text": "Length", "bold": True}, f"{C.PERIOD} minutes"],
    ], header=False, size=10)

    P.h1("Standards")
    for bc, bt in L.get("benchmarks") or [(L["benchmark"], L["benchmark_text"])]:
        P.label(bc, bt)           # a lesson on two benchmarks (4.10) prints both, in full
    if T.get("must"):
        P.label("Required by the benchmark", T["must"])
    if T.get("must_not"):
        P.label("Not part of this lesson", T["must_not"])

    P.h1("Mathematical Thinking and Reasoning")
    P.body("Each standard below is practiced in this lesson. The note after it says where.")
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
    P.label("I do", "The teacher presents the notes and works the first half of each example.")
    P.label("We do", "After each example, students try a matching Your Turn problem on their whiteboards, and the class checks it together.")
    if L.get("no_set"):
        P.label("You do", f"Students answer the whiteboard questions on individual boards ({wb_min} minutes) and then work on IXL ({C.IXL_MIN} minutes).")
    else:
        P.label("You do", f"Students answer the whiteboard questions on individual boards ({wb_min} minutes), complete the six-question "
                          f"Independent Set silently and in writing ({C.SET_MIN} minutes), and then work on IXL ({C.IXL_MIN} minutes).")

    P.h1("Higher-Order Questions")
    for q, dok in L["hoq"]:
        p = P.para("", before=0, after=4, indent=360, hanging=220)
        P._run(p, "●  ", 8, color=INK, font="FreeSerif")
        P.rich(p, q, size=10.5)
        P._run(p, f"   (DOK {dok})", 9.5, italic=True, color=GRAY)

    P.h1("Checks for Understanding")
    data = [["Check", "Correct answer", "Likely wrong answers and their causes"]]
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
    P.body(T.get("closure", "Before students leave, the class says back the one sentence that sums up today's lesson" +
                            ("." if L.get("no_set") else ", and the Independent Set is collected at the door.")))

    P.h1("Vocabulary, Materials, Homework")
    P.label("Vocabulary", "; ".join(t for t, _ in L["vocab"]) or "No new terms.")
    P.label("Materials", T.get("materials", "Whiteboards and markers. Students may use calculators on all work."))
    # derived from the lesson's IXL list and due line, never typed twice (4.06's typed copy had
    # drifted from its own slide — 4 Oct)
    due = L.get("ixl_due") or ixlplan.due_line(L)                    # ruling 53: due by the unit's test
    P.label("Homework", f"IXL: {'; '.join(L['ixl'])}. Each skill is required to a SmartScore of {C.IXL_SMARTSCORE}. {due} "
                        f"Students start in the last five minutes of class and finish the rest before the due date.")

    name = names.lesson(L, "Lesson Plan", "docx")
    path = os.path.join(outdir, name)
    P.save(path)
    return path


def _moves(b):
    """What the teacher does and what students do, per segment kind."""
    k = b["kind"]
    return {
        "title": (TITLE_MOVE if C.TEACHER_EDITION else TITLE_MOVE_NO_TE, "Settle in and copy the learning target."),
        "warmup": ("Students work in silence. Then reveal each answer and reteach, in one sentence, any question that many students missed.",
                   "Answer four review questions from memory, working alone and without notes."),
        "vocab": ("Read each new term and its meaning aloud once. The notes that follow use these terms.", "Copy the terms and their meanings."),
        "notes": ("Teach the notes from the board and say aloud the sentence the Teacher's Edition gives for each slide." if C.TEACHER_EDITION
                  else "Teach the notes from the board, one slide at a time.",
                  "Copy the notes and answer the teacher's questions when called on."),
        "example": ("Work the example aloud, naming each step before doing it.",
                    "Watch the example, then write the same steps."),
        "yourturn": ("Circulate while students work, then explain the mistake behind the most common wrong answer.",
                     "Follow the same steps with new numbers and hold up the whiteboard when finished."),
        "wb": ("Show one question at a time. Students keep their boards down until the cue and then raise them together. "
               "Scan the back row first, and ask about blank boards before wrong ones. If the class is divided, students discuss and vote again.",
               "Answer on individual whiteboards. Question 9 is answered in complete sentences."),
        "set": ("Students work in silence. Circulate and mark the first two questions only.",
                "Answer six questions in writing, at their own pace."),
        "ixl": ("Post the skill codes and check SmartScores as students work.",
                f"Open the listed skills and work to a SmartScore of {C.IXL_SMARTSCORE}."),
    }.get(k, ("", ""))
