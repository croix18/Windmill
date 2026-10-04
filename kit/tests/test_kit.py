#!/usr/bin/env python3
"""The kit's own tests: each gate is shown a spec it must pass and a planted defect it must catch
(HOUSE STYLE §13c — a check that has never failed has never been tested). Run under each test
profile:

    KIT_COURSE=kit/tests/course_on.py  python3 kit/tests/test_kit.py
    KIT_COURSE=kit/tests/course_acc.py python3 kit/tests/test_kit.py
"""
import copy, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.normpath(os.path.join(HERE, "..")))
from lib import slotmark
from lib.profile import C
from lib import lessonbuild as lb

fails = []; n = 0
def ok(name, cond, detail=""):
    global n
    n += 1
    if not cond:
        fails.append(f"{name}  {detail}")
    print(("  ok   " if cond else "  FAIL ") + name)

# ---------------------------------------------------------------- slotmark
s = r"A = \frac{1}{2}(\sH{9})(\sA{18.7} + \sB{16.3})"
ok("slotmark: strip keeps the bodies", slotmark.strip(s) == r"A = \frac{1}{2}(9)(18.7 + 16.3)")
ok("slotmark: spans in order", [k for _, _, k, _ in slotmark.spans(s)] == ["H", "A", "B"])
ok("slotmark: textcolor for KaTeX", r"\textcolor{#398080}{9}" in slotmark.textcolor(s) and r"\textcolor{#1E5AA8}{18.7}" in slotmark.textcolor(s))
ok("slotmark: isolate raises one slot and strips the rest", slotmark.isolate(s, "A") == r"A = \frac{1}{2}(9)({{}^{18.7}} + 16.3)")
ok("slotmark: pieces for a text run", slotmark.pieces(r"base \sA{8.6}, height \sH{10.2}") == [("base ", None), ("8.6", "1E5AA8"), (", height ", None), ("10.2", "398080")])
ok("slotmark: a body may hold braces", slotmark.strip(r"\sA{\frac{22}{7}} \times \sB{7}^2") == r"\frac{22}{7} \times 7^2")
try:
    slotmark.spans(r"\sA{a \sB{b}}"); nested = False
except ValueError:
    nested = True
ok("slotmark: nested marks are refused", nested)
try:
    slotmark.spans(r"\sA{never closed"); unclosed = False
except ValueError:
    unclosed = True
ok("slotmark: an unclosed mark is refused", unclosed)
ok("slotmark: strip_deep walks a spec block", slotmark.strip_deep({"a": [r"\sA{x}", (r"\sH{h}", 2)]}) == {"a": ["x", ("h", 2)]})

# ---------------------------------------------------------------- a lesson the gates accept
def board(i, **kw):
    b = dict(kind="free", text=[f"Find {i} + {i}."], hint="Add.", answer=str(2 * i), gloss="add", note="n", check=("eq", f"{i}+{i}", str(2 * i)), wrong="0 — subtracted [Notes I]")
    b.update(kw); return b

def mc(i, correct, **kw):
    ch = [f"{10 * i + k} cm" for k in range(4)]
    b = dict(kind="mc", text=["A rope is cut.", "**How long is the rope?"], choices=ch, correct=correct, answer=f"{chr(65 + correct)} — {ch[correct]}",
             note="n", note_a=f"Reveal {chr(65 + correct)}.", check=("eq", "1", "1"),
             errors={chr(65 + k): "slipped [Notes I]" for k in range(4) if k != correct})
    b.update(kw); return b

L = dict(code="9.01", unit=9, lesson_no=1, title="T", benchmark="MA.7.GR.1.1", benchmark_text="t", target="I can.", yesterday="y", today="t",
         essential="e", building_on="b", working_toward="w", vocab=[("a", "b")], ixl=["Skill (ABC)"],
         mtr=[("MTR.3.1", "boards")], hoq=[("Why?", 2)], differentiation=[("ELL", "say it")],
         warmup=[dict(stem="1 + 1", answer="2", check=("eq", "1+1", "2"))],
         notes=[], examples=[],
         whiteboard=[board(1), board(2), board(3, unneeded="3 minutes"), board(4), board(5), board(6), mc(7, 3), mc(8, 1), board(9, kind="written")],
         independent=[dict(stem=f"{k} + 1", answer=str(k + 1), check=("eq", f"{k}+1", str(k + 1))) for k in range(6)],
         bank=[], additional=[],
         te=dict(say=["a", "b", "c"], must="m", must_not="n", watch=["w"], close=["c"], variation="v"))

def gates(L):
    f, _ = lb.mathcheck_lesson(L)
    return f + lb.distractorcheck_lesson(L) + lb.capcheck_lesson(L) + lb.rulingcheck_lesson(L) + lb.balancecheck_lesson(L)

ok("gates: a sound lesson passes every gate", gates(L) == [], str(gates(L)[:3]))

def planted(name, mutate, needle):
    M = copy.deepcopy(L); mutate(M)
    found = [x for x in gates(M) if needle in x]
    ok(f"planted: {name}", bool(found), f"no finding containing {needle!r}")

planted("a wrong answer", lambda M: M["whiteboard"][0].update(check=("eq", "1+1", "3")), "keyed")
planted("an item with no check", lambda M: M["whiteboard"][1].pop("check"), "no check and no ack")
planted("a wrong option with no named error", lambda M: M["whiteboard"][6]["errors"].pop("A"), "no named error")
planted("two wrong options that are the same number", lambda M: M["whiteboard"][6].update(choices=["70 cm", "35 × 2 cm", "9 cm", "73 cm"], correct=3, answer="D — 73 cm", note_a="Reveal D.", errors={"A": "x [N]", "B": "x [N]", "C": "x [N]"}), "same number")
M2 = copy.deepcopy(L); M2["whiteboard"][6].update(choices=["36 cm", "36 cm²", "9 cm", "73 cm"], correct=1, answer="B — 36 cm²", note_a="Reveal B.", errors={"A": "x [N]", "C": "x [N]", "D": "x [N]"})
ok("the unit is part of the answer: 36 cm and 36 cm² are different options", not [x for x in gates(M2) if "same" in x or "equals the keyed" in x], str(gates(M2)[:2]))
planted("an answer line whose letter is not the key", lambda M: M["whiteboard"][6].update(answer="A — 70 cm"), "the answer line says A")
planted("a reveal note whose letter is not the key", lambda M: M["whiteboard"][7].update(note_a="Reveal D."), "the reveal note says D")
planted("an error keyed to the right answer", lambda M: M["whiteboard"][6]["errors"].update(D="x [N]"), "keyed correct and also carries")
planted("a board field no builder reads", lambda M: M["whiteboard"][0].update(colour="red"), "not read by any builder")
planted("no board with a number the question does not need", lambda M: M["whiteboard"][2].pop("unneeded"), "ruling 22")
planted("five independent questions", lambda M: M["independent"].pop(), "ruling 21")
planted("an IXL skill marked 'also consider'", lambda M: M["ixl"].append("Also consider: Other (XYZ)"), "ruling 28")
planted("no MTR named", lambda M: M.pop("mtr"), "ruling 25")
planted("two things to say, not three", lambda M: M["te"].update(say=["a", "b"]), "ruling 26")
planted("every single-answer item keyed alike", lambda M: (M["whiteboard"][7].update(correct=3, answer="D — 83 cm", note_a="Reveal D.", errors={k: "x [N]" for k in "ABC"}),
                                                       M["bank"].append(dict(stem="q", choices=["1", "2", "3", "4"], correct=3, answer="D", check=("eq", "1", "1"), errors={k: "x [N]" for k in "ABC"}))), "keyed D")
if "sci" in C.CAPS:
    planted("a scientific-notation coefficient of 12", lambda M: M["whiteboard"][3].update(text=["Write 12 × 10⁴ another way."]), "outside [1,10)")
if "radicand" in C.CAPS:
    planted("a radicand outside the benchmark", lambda M: M["whiteboard"][3].update(text=["Find $\\sqrt{200}$."]), "MA.8.NSO.1.7")
N = copy.deepcopy(L); N["no_set"] = True; N.pop("independent")
ok("a lesson that carries no set needs no independent questions", not [x for x in gates(N) if "ruling 21" in x])

# ---------------------------------------------------------------- the unit-level key spread
def unit(keys):
    return [dict(whiteboard=[mc(7, k)]) for k in keys]
ok("unit balance: an even spread passes", lb.balancecheck_unit(unit([0, 1, 2, 3, 0, 1, 2, 3])) == [])
ok("unit balance: a unit that never keys D is caught", any("keyed D" in x for x in lb.balancecheck_unit(unit([0, 1, 2, 0, 1, 2, 0, 1, 2]))))
ok("unit balance: one letter on half the boards is caught", any("are keyed A" in x for x in lb.balancecheck_unit(unit([0, 0, 0, 0, 0, 1, 2, 3, 1, 2]))))

print(f"\nkit tests under {os.path.basename(os.environ.get('KIT_COURSE', 'course.py'))}: {n - len(fails)} of {n} passed")
for f in fails:
    print("  FAILED", f)
sys.exit(1 if fails else 0)
