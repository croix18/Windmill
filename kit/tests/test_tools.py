#!/usr/bin/env python3
"""Tests for the lean tools beside figure_sheets.py: reader_copy, student_view, blind_diff, unit_repeats,
changed_slides. Each is run on a tiny made-up unit in a temp folder, and — where the read-only A7 copy is on this
machine — on A7 Unit 11. No LibreOffice: the PDFs changed_slides reads are drawn with PIL.

    python3 kit/tests/test_tools.py
"""
import contextlib
import io
import json
import os
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
KIT = os.path.normpath(os.path.join(HERE, ".."))
sys.path.insert(0, KIT)
os.environ.setdefault("KIT_COURSE", os.path.join(HERE, "course_acc.py"))
os.environ.setdefault("KIT_SPINE", os.path.normpath(os.path.join(KIT, "..", "spine", "spine.json")))
A7 = os.environ.get("A7_BUILD", "/home/claude/croix18/croix18-windy-hill-a7/a7/build")

import reader_copy, student_view, blind_diff, unit_repeats, changed_slides   # noqa: E402

fails, n = [], 0


def ok(name, cond, detail=""):
    global n
    n += 1
    if not cond:
        fails.append(f"{name}  {detail}")
    print(("  ok   " if cond else "  FAIL ") + name + ("" if cond or not detail else f"   [{str(detail)[:300]}]"))


def run(fn, argv):
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        rc = fn(argv)
    return rc, buf.getvalue()


# ---------------------------------------------------------------- a tiny unit
FIG = ('dict(kind="shapes", fs=22, pt=18, **{"in": 2.0}, shapes=[dict(t="circle", c=(0, 0), r=2), '
       'dict(t="text", xy=(0, -0.3), s="20 cm", va="top")])')
FIG_A = ('dict(kind="shapes", fs=22, pt=18, **{"in": 2.0}, shapes=[dict(t="circle", c=(0, 0), r=2), '
         'dict(t="text", xy=(0, -0.3), s="r = 10 cm", va="top")])')


def lesson(code, warm1="Solve:  $2x + 3 = 11$", warm1_answer="x = 4", base=0):
    k = base
    return f'''L = dict(code="{code}", unit=90, lesson_no={int(code[-1])}, title="Lesson {code}", benchmark="MA.7.AR.4.3",
    target="I can collect like terms.", today="Today.", yesterday="Yesterday.",
    vocab=[("like terms", "terms with the same variable")],
    warmup=[dict(stem="{warm1}", answer="{warm1_answer}", band="b", source="SOURCE-TEACHER"),
            dict(stem="What is {12 + k} plus {5 + k}?", answer="{17 + 2 * k}"),
            dict(stem="A pen costs \\\\$3. How much do {4 + k} pens cost?", answer="\\\\${12 + 3 * k}"),
            dict(stem="Solve:  ${9 + k}y = {9 * (9 + k)}$", answer="y = 9")],
    notes=[dict(numeral="I", head="Collect", min=3, note="NOTE-TEACHER-ONE",
                math=["${4 + k}x + 2x = {6 * (6 + k)}$", "${6 + k}x = {6 * (6 + k)}$", "$x = 6$"], items2=["**Collect, then divide.**"], letters=False)],
    examples=[dict(title="Example 1", sub="", min_q=1, note_q="NOTE-TEACHER-NQ", prompt=["${3 + k}x + 4x = {3 * (7 + k)}$"], ask="Solve it.",
                   worked=[dict(sub="Worked.", note="NOTE-TEACHER-WORKED", rows=[("{3 + k}x + 4x = {3 * (7 + k)}", "GLOSS-TEACHER"), ("x = 3", "divide")], answer="x = 3")],
                   your_turn=dict(note="NOTE-TEACHER-YT", prompt=["${5 + k}x + 2x = {4 * (7 + k)}$"], steps=["Collect:  ${7 + k}x = {4 * (7 + k)}$"], answer="x = 4", fig={FIG}))],
    whiteboard=[
        dict(latex="{8 + k}x - 3x = {7 * (5 + k)}", answer="x = 7", steps=["Collect:  ${5 + k}x = {7 * (5 + k)}$"], note="NOTE-TEACHER-B1", wrong="WRONG-TEACHER"),
        dict(kind="mc", text=["A circle is drawn.", "**What is its diameter?"], choices=["10 cm", "20 cm", "40 cm", "5 cm"], correct=1,
             answer="B — 20 cm", errors={{"A": "ERRORNAME-RADIUS", "C": "ERRORNAME-DOUBLED", "D": "ERRORNAME-QUARTER"}},
             note="NOTE-TEACHER-B2", fig={FIG}, fig_a={FIG_A}),
        dict(kind="written", text=["Why is ${3 + k}x + 4x$ equal to ${7 + k}x$?"], answer="ANSWER-WRITTEN-SECRET", note="n")],
    independent=[dict(heading="For questions 1 and 2, solve."),
                 dict(stem="Solve:  ${11 + k}m - 2m = {9 * (9 + k)}$", answer="m = 9", why="WHY-TEACHER"),
                 dict(stem="Solve:  ${6 + k}p + p = {8 * (7 + k)}$", answer="p = 8")],
    bank=[dict(heading="For questions 1 and 2, solve."),
          dict(stem="Solve:  ${30 + k}w - 10w = {20 + k}0$".replace("{20 + k}0", "BANKRHS"), answer="BANK-ANSWER-ONE", why="WHY-BANK", fig={FIG}),
          dict(stem="Solve each.", parts=[dict(label="a", stem="$2a = 18$", answer="BANK-PART-A"), dict(label="b", stem="$3b = 21$", answer="BANK-PART-B")]),
          dict(heading="Choose one."),
          dict(stem="Which is 6?", choices=["$2 + 3$", "$2(3)$"], correct=1, answer="B", errors={{"A": "ERRORNAME-BANK"}})],
    additional=[dict(heading="For question 1, solve."),
                dict(stem="Solve:  $4z = 44$", answer="ADDITIONAL-ANSWER", fig={FIG}, fig_key={FIG_A})],
    ixl=["Combine like terms — XYZ"],
)
'''


UNIT = '''U = dict(unit=90, title="Area and Circles",
    review=[dict(letter="A", title="Equations", lessons="Lessons 1-2", benchmark="MA.7.AR.4.3", items=[
        dict(stem="Solve.", parts=[dict(label="a", stem="$13q - 4q = 117$", answer="q = 13"),
                                   dict(label="b", stem="$15r + 6r = 105$", answer="r = 5")])])],
    assessment=dict(total=2, tracker_order=["MA.7.AR.4.3"], tracker={"MA.7.AR.4.3": 2},
        forms={"practice": [dict(title="Equations", benchmark="MA.7.AR.4.3", items=[
            dict(stem="Solve:  PAPER_EXPR", answer="PAPER_ANSWER"),
            dict(stem="Which is the value of $c$ in $20c - 8c = 96$?", choices=["$c = 6$", "$c = 8$", "$c = 4$", "$c = 12$"],
                 correct=1, answer="B", errors={"A": "E", "C": "E", "D": "E"})])]}),
)
'''


def make_unit(root, warm_repeat=False, paper_repeat=False, repeat_ok=False):
    os.makedirs(os.path.join(root, "u90"), exist_ok=True)
    open(os.path.join(root, "u90", "l01.py"), "w").write(lesson("90.01"))
    w = ("Solve:  $2x + 3 = 11$", "x = 4") if warm_repeat else ("Solve:  $5x - 1 = 24$", "x = 5")
    open(os.path.join(root, "u90", "l02.py"), "w").write(lesson("90.02", *w, base=10))
    u = UNIT.replace("PAPER_EXPR", "$4x + 2x = 36$" if paper_repeat else "$17t - 5t = 84$")
    u = u.replace("PAPER_ANSWER", "x = 6" if paper_repeat else "t = 7")
    if repeat_ok:
        u = u.replace('answer="x = 6")', 'answer="x = 6", repeat_ok=True)')
    open(os.path.join(root, "u90", "unit.py"), "w").write(u)


tmp = tempfile.mkdtemp(prefix="tools_")
make_unit(os.path.join(tmp, "clean"))
CLEAN = os.path.join(tmp, "clean")

# ---------------------------------------------------------------- reader_copy
out = os.path.join(tmp, "reader")
rc, said = run(reader_copy.main, ["u90", "--build", CLEAN, "--out", out])
files = sorted(os.listdir(out)) if os.path.isdir(out) else []
ok("reader_copy: one file per lesson and one for the papers", rc == 0 and files == ["90.01.md", "90.02.md", "Unit 90 papers.md"], files)
r1 = open(os.path.join(out, "90.01.md"), encoding="utf-8").read() if "90.01.md" in files else ""
order = [r1.find(s) for s in ("**Target:**", "## Warm-Up", "## Vocabulary", "## Notes I", "## Example 1", "### Your Turn", "## Whiteboards", "## Independent Set", "## IXL")]
ok("reader_copy: the deck in slide order — target, warm-up, vocabulary, notes, example, Your Turn, boards, set, IXL", all(x >= 0 for x in order) and order == sorted(order), order)
ok("reader_copy: every item has its stable id", all(f"90.01/{i}" in r1 for i in ("W1", "W4", "N1", "E1", "YT1", "B1", "B2", "B3", "I1", "I2")))
ok("reader_copy: the warm-up's answers, the worked lines, the Your Turn's steps, the boards' keys and named errors, the set's key",
   "x = 4" in r1 and "$x = 3$" in r1 and "Collect:  $12x = 44$".replace("12", "7").replace("44", "28") in r1
   and "B — 20 cm" in r1 and "ERRORNAME-RADIUS" in r1 and "m = 9" in r1 and "Combine like terms — XYZ" in r1)
ok("reader_copy: TeX is kept", "$4x + 2x = 36$" in r1 and "$3x + 4x = 21$" in r1)
ok("reader_copy: a question with a picture names figure_sheets.py's picture, and its answer picture",
   "[figure: 001.png]" in r1 and "[figure: 002.png]  [answer figure: 003.png]" in r1, [l for l in r1.splitlines() if "figure" in l])
ok("reader_copy: teacher-only prose stays out", not any(s in r1 for s in ("NOTE-TEACHER", "GLOSS-TEACHER", "WRONG-TEACHER", "WHY-TEACHER", "SOURCE-TEACHER")))
rc, _ = run(reader_copy.main, ["u90", "--build", CLEAN, "--out", out, "--teacher"])
r1t = open(os.path.join(out, "90.01.md"), encoding="utf-8").read()
ok("reader_copy --teacher: the notes, glosses, wrong line and why are in", all(s in r1t for s in ("NOTE-TEACHER-ONE", "GLOSS-TEACHER", "WRONG-TEACHER", "WHY-TEACHER")))
rp = open(os.path.join(out, "Unit 90 papers.md"), encoding="utf-8").read()
ok("reader_copy: the papers, by id — the review numbered through its parts, the practice test", all(s in rp for s in ("R/Q1a", "R/Q1b", "P/Q1", "P/Q2", "q = 13", "$c = 8$ (key)")))
ok("reader_copy: no unit given prints the usage", run(reader_copy.main, [])[0] == 2)

# ---------------------------------------------------------------- student_view
out = os.path.join(tmp, "student")
rc, said = run(student_view.main, ["u90", "--build", CLEAN, "--out", out, "--figs"])
sm = open(os.path.join(out, "student.md"), encoding="utf-8").read()
key = json.load(open(os.path.join(out, "key.json"), encoding="utf-8"))
want = {f"90.0{l}/{i}" for l in (1, 2) for i in ("W1", "W2", "W3", "W4", "YT1", "B1", "B2", "B3", "I1", "I2")} | {"R/Q1a", "R/Q1b", "P/Q1", "P/Q2"}
ok("student_view: every question a student answers is in key.json, by id", rc == 0 and set(key) == want, sorted(set(key) ^ want))
ok("student_view: the questions in the student's words and TeX, choices included", all(s in sm for s in (
    "**90.01/W1**  Solve:  $2x + 3 = 11$", "$11x - 3x = 40$".replace("11x", "8x").replace("40", "35"), "○ B.  20 cm", "**What is its diameter?**",
    "_For questions 1 and 2, solve._", "Solve it.", "$13q - 4q = 117$", "○ B.  $c = 8$", "(Write your answer in sentences.)")))
ok("student_view: no answers, steps, notes or error names", not any(s in sm for s in (
    "x = 4\n", "B — 20 cm", "ERRORNAME", "NOTE-TEACHER", "Collect:", "ANSWER-WRITTEN-SECRET", "q = 13", "m = 9", "Answer:", "(key)")))
ok("student_view: pictures as [figure: NNN.png], the question's only — never the answer slide's",
   "[figure: 001.png]" in sm and "[figure: 002.png]" in sm and "003.png" not in sm
   and sorted(os.listdir(os.path.join(out, "figures"))) == ["001.png", "002.png", "007.png", "008.png"], os.listdir(os.path.join(out, "figures")))
ok("student_view: key.json carries the kind, the answer as printed, the keyed letters and the check",
   key["90.01/B2"]["correct"] == ["B"] and key["90.01/B2"]["answer"] == "B — 20 cm" and key["90.01/B2"]["kind"] == "board-mc"
   and key["P/Q2"]["correct"] == ["B"] and key["90.01/W1"]["answer"] == "x = 4" and "check" in key["90.01/W1"], key.get("90.01/B2"))

ok("student_view: without --bank, no bank item", not any("/K" in i or "/A" in i.split("/")[-1][:1] for i in key) and "BANK" not in sm and "Question Bank" not in sm)
outb = os.path.join(tmp, "student_bank")
rc, said = run(student_view.main, ["u90", "--build", CLEAN, "--out", outb, "--bank"])
keyb = json.load(open(os.path.join(outb, "key.json"), encoding="utf-8"))
bank_ids = {f"90.0{l}/{i}" for l in (1, 2) for i in ("K1", "K2a", "K2b", "K3", "A1")}
ok("student_view --bank: every bank and additional item by id (K3, A1, a part K2b), added to everything else",
   rc == 0 and set(keyb) == want | bank_ids, sorted(set(keyb) ^ (want | bank_ids)))
ok("student_view --bank: keyed — the answer as printed, a choice's letter", keyb["90.01/K2b"]["answer"] == "BANK-PART-B" and keyb["90.01/K3"]["correct"] == ["B"]
   and keyb["90.02/A1"]["answer"] == "ADDITIONAL-ANSWER" and "Solve each." in keyb["90.01/K2a"]["question"])
outo = os.path.join(tmp, "student_only")
rc, said = run(student_view.main, ["u90", "--build", CLEAN, "--out", outo, "--only", "bank", "--figs"])
so = open(os.path.join(outo, "student.md"), encoding="utf-8").read()
keyo = json.load(open(os.path.join(outo, "key.json"), encoding="utf-8"))
ok("student_view --only bank: only the two banks, with their headings between groups", rc == 0 and set(keyo) == bank_ids
   and all(s in so for s in ("### Question Bank", "### Additional Question Bank", "_For questions 1 and 2, solve._", "_Choose one._", "**90.01/K2b**  $3b = 21$", "○ B.  $2(3)$"))
   and "Warm-Up" not in so and "Practice Test" not in so, sorted(keyo))
ok("student_view --only bank: no answers, reasons or error names; the question pictures only, never the key's",
   not any(s in so for s in ("BANK-ANSWER", "BANK-PART", "WHY-BANK", "ERRORNAME", "ADDITIONAL-ANSWER"))
   and sorted(os.listdir(os.path.join(outo, "figures"))) == ["004.png", "005.png", "010.png", "011.png"], os.listdir(os.path.join(outo, "figures")))
ok("student_view: --only takes bank and nothing else", run(student_view.main, ["u90", "--build", CLEAN, "--only", "boards"])[0] == 2)
outr = os.path.join(tmp, "reader_bank")
rc, said = run(reader_copy.main, ["u90", "--build", CLEAN, "--out", outr, "--bank"])
rb = open(os.path.join(outr, "90.01.md"), encoding="utf-8").read()
ok("reader_copy --bank: the two banks, with keys, after the independent set",
   rc == 0 and rb.find("## Independent Set") < rb.find("## Question Bank") < rb.find("## Additional Question Bank") < rb.find("## IXL")
   and all(s in rb for s in ("**90.01/K1**", "BANK-ANSWER-ONE", "BANK-PART-B", "$2(3)$ (key)", "ERRORNAME-BANK", "[figure: 005.png]  [key figure: 006.png]"))
   and "WHY-BANK" not in rb and "Question Bank" not in r1, rb[rb.find("## Question Bank"):][:600])

# ---------------------------------------------------------------- blind_diff
ok("blind_diff: 1/2 and 0.5 agree", blind_diff.compare(dict(kind="independent", answer="1/2"), "0.5") == "agree")
ok("blind_diff: \"x = 7\" and \"7\" agree", blind_diff.compare(dict(kind="board-free", answer="x = 7"), "7") == "agree")
ok("blind_diff: B and C differ", blind_diff.compare(dict(kind="board-mc", answer="B — 20 cm", correct=["B"]), "C") == "DIFFER")
ok("blind_diff: a select-all needs exactly its letters", blind_diff.compare(dict(kind="paper", correct=["A", "C"]), "A and C") == "agree"
   and blind_diff.compare(dict(kind="paper", correct=["A", "C"]), "A") == "DIFFER")
ok("blind_diff: units, mixed numbers, percents, TeX fractions and √ are normalized",
   [blind_diff.compare_value(k, a) for k, a in (("60 km", "60"), ("2 1/2", "5/2"), ("$\\frac{3}{4}$", "0.75"), ("25%", "25"),
                                                 ("√105 in ≈ 10.2 in", "sqrt(105)"), ("h = −7", "-7"), ("65°", "65"))] == ["agree"] * 7)
ok("blind_diff: a wrong value, a wrong sign, a wrong ending and a point read backwards differ",
   [blind_diff.compare_value(k, a) for k, a in (("x = 7", "x = 8"), ("h = −7", "7"), ("No solution", "infinitely many"), ("(2, 4)", "(4, 2)"))] == ["DIFFER"] * 4)
ok("blind_diff: expressions compared by sympy", blind_diff.compare_value("y = 7x + 15  and  y = 12x", "y = 12x and y = 15 + 7x") == "agree"
   and blind_diff.compare_value("y = x + 6", "y = x + 7") == "DIFFER")
ok("blind_diff: a written board, and a sentence it cannot read, are look",
   blind_diff.compare(dict(kind="board-written", answer="x = 7"), "x = 7") == "look" and blind_diff.compare_value("Club A: \\$24 against \\$30.", "Club A") == "look")
ok("blind_diff: a solver who gives the value of a choice is matched to its letter",
   blind_diff.compare(dict(kind="paper", correct=["B"], choices=["$c = 6$", "$c = 8$"]), "c = 8") == "agree")
answers = {i: (", ".join(v["correct"]) if v.get("correct") else v["answer"]) for i, v in key.items()}
open(os.path.join(tmp, "a_ok.json"), "w").write(json.dumps(answers))
rc_ok, said_ok = run(blind_diff.main, [os.path.join(out, "key.json"), os.path.join(tmp, "a_ok.json")])
answers["90.01/B2"], answers["90.02/W1"] = "C", "x = 6"
open(os.path.join(tmp, "a_bad.json"), "w").write(json.dumps(answers))
rc_bad, said_bad = run(blind_diff.main, [os.path.join(out, "key.json"), os.path.join(tmp, "a_bad.json")])
ok("blind_diff: the key's own answers agree (exit 0); two wrong ones are the DIFFER rows (exit 1), with a count line last",
   rc_ok == 0 and rc_bad == 1 and said_bad.count("DIFFER |") == 2 and "90.01/B2" in said_bad and "What is its diameter" in said_bad
   and said_bad.strip().splitlines()[-1].startswith(f"{len(key)} ids:") and " 2 DIFFER" in said_bad, said_bad)

# ---------------------------------------------------------------- unit_repeats
rc, said = run(unit_repeats.main, ["u90", "--build", CLEAN])
ok("unit_repeats: a clean unit passes", rc == 0 and said.strip().splitlines()[-1].startswith("0 cross-unit repeats"), said)
P = os.path.join(tmp, "planted")
make_unit(P, warm_repeat=True, paper_repeat=True)
rc, said = run(unit_repeats.main, ["u90", "--build", P])
lines = said.strip().splitlines()
ok("unit_repeats: FINDS a paper question a lesson's notes showed", any(l.startswith("P/Q1  ·  90.01 Notes I") and "(A)" in l for l in lines), said)
ok("unit_repeats: FINDS the same warm-up question in two lessons", any(l.startswith("90.02/W1  ·  90.01/W1") for l in lines), said)
ok("unit_repeats: one finding per line, a count line last, exit 1", rc == 1 and lines[-1].startswith(f"{len(lines) - 1} cross-unit repeats"), said)
Q = os.path.join(tmp, "practice")
make_unit(Q)
open(os.path.join(Q, "u90", "unit.py"), "w").write(UNIT.replace("PAPER_EXPR", "$12x - 3x = 40$".replace("12x", "8x").replace("40", "35"))
                                                  .replace("PAPER_ANSWER", "x = 7"))
rc, said = run(unit_repeats.main, ["u90", "--build", Q])
ok("unit_repeats: FINDS a paper question a lesson asked on a board", rc == 1 and any(l.startswith("P/Q1  ·  90.01/B1") for l in said.splitlines()), said)
BK = os.path.join(tmp, "bankrepeat")
make_unit(BK)
src = open(os.path.join(BK, "u90", "l01.py")).read()
open(os.path.join(BK, "u90", "l01.py"), "w").write(src.replace("Solve:  $4z = 44$", "Solve:  $14t - 5t = 81$").replace("ADDITIONAL-ANSWER", "t = 9"))
open(os.path.join(BK, "u90", "unit.py"), "w").write(UNIT.replace("PAPER_EXPR", "$14t - 5t = 81$").replace("PAPER_ANSWER", "t = 9"))
rc, said = run(unit_repeats.main, ["u90", "--build", BK])
ok("unit_repeats: FINDS a paper question that is in a lesson's question bank (A7 7.07's bank 5 was the Review's 14)",
   "Solve:  $14t - 5t = 81$" in open(os.path.join(BK, "u90", "l01.py")).read() and rc == 1
   and any(l.startswith("P/Q1  ·  90.01/A1") for l in said.splitlines()), said)
X = os.path.join(tmp, "cross")
make_unit(X)
open(os.path.join(X, "u90", "l02.py"), "w").write(lesson("90.02", "Solve:  $5x - 1 = 24$", "x = 5", base=0).replace("What is 12 plus 5?", "What is 30 plus 6?")
    .replace("How much do 4 pens", "How much do 9 pens").replace("$9y = 81$", "$4y = 36$"))
rc, said = run(unit_repeats.main, ["u90", "--build", X])
ok("unit_repeats: FINDS the same practice expression in two lessons", any(l.startswith("90.02/B1  ·  90.01/B1") and "(P)" in l for l in said.splitlines()), said)
S = os.path.join(tmp, "silenced")
make_unit(S, paper_repeat=True, repeat_ok=True)
rc, said = run(unit_repeats.main, ["u90", "--build", S])
ok("unit_repeats: repeat_ok=True silences it", rc == 0, said)
rc, said = run(unit_repeats.main, ["u90", "--build", P, "--reserved"])
ok("unit_repeats --reserved: each paper question's expressions, givens and answer", rc == 0 and "P/Q1:  expressions 4x+2x" in said and "R/Q1a:" in said, said)

# ---------------------------------------------------------------- changed_slides
from PIL import Image, ImageDraw   # noqa: E402


def pdf(path, texts):
    ims = []
    for t in texts:
        im = Image.new("RGB", (1000, 562), "white")
        d = ImageDraw.Draw(im)
        d.rectangle([40, 40, 960, 120], fill=(30, 90, 168))
        d.text((60, 200), t, fill="black", font_size=60)
        ims.append(im)
    ims[0].save(path, save_all=True, append_images=ims[1:], resolution=100)


old, new, rem = (os.path.join(tmp, f) for f in ("old.pdf", "new.pdf", "rem.pdf"))
pdf(old, ["One", "Two: x = 7", "Three", "Four", "Five"])
pdf(new, ["One", "Two: x = 8", "Three", "Inserted", "Four", "Five"])
pdf(rem, ["One", "Two: x = 7", "Four", "Five"])
c = changed_slides.compare(old, new)
ok("changed_slides: a changed page, and an inserted page reported as added (not every page after it changed)", c[:3] == ([2], [4], []), c)
ok("changed_slides: a removed page is OLD's number", changed_slides.compare(old, rem)[:3] == ([], [], [3]))
ok("changed_slides: the same file has no changes", changed_slides.compare(old, old)[:3] == ([], [], []))
def pdf_small(path, frac):
    im = Image.new("RGB", (1333, 750), "white")
    d = ImageDraw.Draw(im)
    d.rectangle([40, 40, 1290, 120], fill=(30, 90, 168))
    d.text((60, 200), "Write the fraction as a decimal.", fill="black", font_size=40)
    d.text((900, 205), frac, fill="black", font_size=22)
    im.save(path, resolution=100)


s1, s2 = os.path.join(tmp, "small1.pdf"), os.path.join(tmp, "small2.pdf")
pdf_small(s1, "3/8"); pdf_small(s2, "7/8")
ok("changed_slides: one digit of small type changed is a changed page (A7 7.02's warm-up, 21 Nov 2026)", changed_slides.compare(s1, s2)[:3] == ([1], [], []), changed_slides.compare(s1, s2))
rc, said = run(changed_slides.main, [old, new, "--sheet"])
sheet = [l.split("sheet: ", 1)[1] for l in said.splitlines() if l.startswith("sheet: ")]
ok("changed_slides --sheet: a contact sheet of the changed pages in /tmp/sheets/", rc == 0 and sheet and sheet[0].startswith("/tmp/sheets/") and os.path.exists(sheet[0]), said)

# ---------------------------------------------------------------- A7 Unit 11, read-only
if os.path.isdir(os.path.join(A7, "u11")):
    env = {k: v for k, v in os.environ.items() if k not in ("KIT_COURSE", "KIT_SPINE")}

    def tool(name, *args):
        p = subprocess.run([sys.executable, os.path.join(KIT, name), *args], capture_output=True, text=True, env=env, cwd=tmp)
        return p.returncode, p.stdout + p.stderr
    o = os.path.join(tmp, "a7")
    rc, said = tool("reader_copy.py", "u11", "--build", A7, "--out", os.path.join(o, "reader"))
    lessons = [f for f in os.listdir(os.path.join(A7, "u11")) if f.startswith("l") and f.endswith(".py")]
    ok("A7 u11: reader_copy writes a file per lesson and one for the papers", rc == 0 and len(os.listdir(os.path.join(o, "reader"))) == len(lessons) + 1, said[-400:])
    rc, said = tool("student_view.py", "u11", "--build", A7, "--out", os.path.join(o, "student"))
    k11 = json.load(open(os.path.join(o, "student", "key.json"), encoding="utf-8")) if rc == 0 else {}
    s11 = open(os.path.join(o, "student", "student.md"), encoding="utf-8").read() if rc == 0 else ""
    ok("A7 u11: student_view — every lesson's 4 + YT + 9 boards + 6, and the papers' questions, with no answer printed",
       rc == 0 and sum(1 for i in k11 if "/B" in i) == 9 * len(lessons) and any(i.startswith("P/Q") for i in k11)
       and "Answer:" not in s11 and "Steps:" not in s11, said[-400:])
    open(os.path.join(o, "self.json"), "w").write(json.dumps({i: (", ".join(v["correct"]) if v.get("correct") else v["answer"]) for i, v in k11.items()}))
    rc, said = tool("blind_diff.py", os.path.join(o, "student", "key.json"), os.path.join(o, "self.json"))
    ok("A7 u11: blind_diff — the key against itself has no DIFFER", rc == 0 and " 0 DIFFER" in said, said[-600:])
    rc, said = tool("unit_repeats.py", "u11", "--build", A7)
    ok("A7 u11: unit_repeats runs and ends on its count line", rc in (0, 1) and "cross-unit repeats in u11" in said.strip().splitlines()[-1], said[-400:])
else:
    print("  (A7 u11 not on this machine: its runs are skipped)")

import shutil   # noqa: E402
shutil.rmtree(tmp, ignore_errors=True)
print(f"\n{n - len(fails)}/{n} passed" + (f" — {len(fails)} FAILED" if fails else ""))
sys.exit(1 if fails else 0)
