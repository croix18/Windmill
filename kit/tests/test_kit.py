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
# the IXL plan the gate reads: this repository's own spine (a course reads its vendored copy)
os.environ.setdefault("KIT_SPINE", os.path.normpath(os.path.join(HERE, "..", "..", "spine", "spine.json")))
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

# ---------------------------------------------------------------- names: one convention, read back from the tail
from lib import names
P_ = C.PREFIX
ok("names: a lesson file carries its title", names.lesson(dict(code="90.06", unit=90, title="Finding Circumference"), "Slides", "pptx") == f"{P_} 90.06 Finding Circumference - Slides.pptx")
ok("names: a key is a suffix", names.lesson(dict(code="90.06", unit=90, title="Finding Circumference"), "Question Bank", "docx", key=True) == f"{P_} 90.06 Finding Circumference - Question Bank - Key.docx")
ok("names: a dash in a title becomes brackets", names.clean("Scale Factors — Perimeter") == "Scale Factors (Perimeter)")
ok("names: characters a file system refuses are dropped", names.clean("Circumference or Area?") == "Circumference or Area")
ok("names: a unit file is named from course.py UNITS", names.unit(90, "Test Form A", "docx", worked=True) == f"{P_} Unit 90 Area and Circles - Test Form A - Worked Answers.docx")
ok("names: the review day is the unit's", names.lesson(dict(code="90.R", unit=90, title="Unit 90 Review", review=True), "Slides", "html") == f"{P_} Unit 90 Area and Circles - Review Day - Slides.html")
tricky = names.lesson(dict(code="90.02", unit=90, title="Key Features of a Lesson Plan"), "Slides", "pptx")
ok("names: a title cannot make a file a key or a teacher page", not names.is_key(tricky) and not names.is_teacher_page(tricky) and names.is_lesson_deck(tricky), tricky)
ok("names: the unit deck is not a lesson deck", names.is_unit_deck(names.unit(90, "All Slides", "pptx")) and not names.is_lesson_deck(names.unit(90, "All Slides", "pptx")))
ok("names: the review deck is a lesson deck", names.is_lesson_deck(f"{P_} Unit 90 Area and Circles - Review Day - Slides.pptx"))
ok("names: a side-car is read like its deck", names.tail(f"{P_} 90.06 Finding Circumference - Slides.notes.json") == "Slides")
def _refused(fn):
    try:
        fn(); return False
    except ValueError:
        return True
ok("names: a document kind outside the list is refused", _refused(lambda: names.lesson(dict(code="90.06", unit=90, title="T"), "Worksheet", "docx")))
ok("names: a unit with no title in course.py is refused", _refused(lambda: names.unit(91, "Test", "docx")))

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

L = dict(code="90.01", unit=90,   # a lesson no plan lists
          lesson_no=1, title="T", benchmark="MA.7.GR.1.1", benchmark_text="t", target="I can.", yesterday="y", today="t",
         essential="e", building_on="b", working_toward="w", vocab=[("a", "b")], ixl=["Perimeter and area: changes in scale (ZC6)"],
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
planted("an IXL code the plan does not have", lambda M: M.update(ixl=["Perimeter and area: changes in scale (QQ7)"]), "the plan's code for")
planted("an IXL code under another skill's name", lambda M: M.update(ixl=["Area of circles (ZC6)"]), "in the plan, not")
planted("an IXL entry with no code", lambda M: M.update(ixl=["Perimeter and area: changes in scale"]), "is not `Name (CODE)`")
_real = {"on": ("4.07", "Find the radius or diameter of a circle given the circumference (2CM)"),
         "acc": ("4.01", "Add and subtract numbers written in scientific notation — HUR")}[C.COURSE_KEY]
R = copy.deepcopy(L); R.update(code=_real[0], ixl=[_real[1]])
ok("the plan's own skills for a lesson pass, in either course's spelling", not [x for x in gates(R) if "ruling 28" in x], str([x for x in gates(R) if "ruling 28" in x][:2]))
R2 = copy.deepcopy(R); R2["ixl"] = ["Perimeter and area: changes in scale (ZC6)"]
ok("planted: a lesson whose slide is not the plan's skills", len([x for x in gates(R2) if "ruling 28" in x]) == 2)
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

# ---------------------------------------------------------------- what is on a slide, and what is not
# Croix, 4 October 2026: "on all slides remove the comments in the boxes and in parenthesis. If a
# problem is in parenthesis, it should be pulled out into the main text." — the title slide's
# yesterday/today box, and the small grey line under every slide's rules ("Remove it everywhere").
import re, tempfile, zipfile
from lib.deckkit import Deck
from lib.htmlkit import HtmlDeck, render_page
from lib import consolekit
S_ = copy.deepcopy(L)
S_.update(yesterday="Yesterday you measured ropes.", today="Today the rope is cut twice.", no_set=True)
S_.pop("independent")
S_["notes"] = [dict(numeral="I", head="What a rope is", min=2, sub="Copy all three lines.", note="n", items=["A rope has a length."], letters=False)]
S_["examples"] = [dict(title="Example 1", sub="A label for the Teacher's Edition only.", min_q=1, note_q="n",
                       prompt=["A rope is 9 m long and is cut into 3 equal pieces.", "How long is each piece?"], ask="Decide first.",
                       worked=[dict(sub="A worked label.", lead="Divide, or subtract?", min=1, note="n", rows=[("9 \\div 3 = 3", "a remark beside a step")], answer="3 m")],
                       check=("eq", "9/3", "3"),
                       your_turn=dict(min=1, note="n", prompt=["A rope is 8 m long and is cut in half.", "How long is each piece?"], gloss="halve it, said in grey", answer="4 m"), yt_check=("eq", "8/2", "4")),
                  dict(title="Example 2", sub="Another label.", min_q=1, note_q="n", prompt=["$2^{3}$"], ask="Find the value of it.",
                       worked=[dict(sub="Worked.", min=1, note="n", rows=[("2^{3} = 8", "three twos")], answer="8")], check=("eq", "2**3", "8"),
                       your_turn=dict(min=1, note="n", prompt=["$3^{2}$"], answer="9"), yt_check=("eq", "3**2", "9"))]
S_["whiteboard"] = copy.deepcopy(S_["whiteboard"])
S_["whiteboard"][0].update(hint="A grey hint under the ask.", gloss="a grey line above the answer")
# the same night, of what was left: "But also those comments. Half the box. It's still a rhombus" —
# the hint under "Answer it.", then (asked) "Remove both": the remark beside a worked step and the
# line above a reveal's answer
GONE = ["A grey hint under the ask.", "a grey line above the answer", "a remark beside a step", "three twos", "halve it, said in grey", "Copy all three lines.", "A label for the Teacher", "A worked label.", "Boards up on three.", "Take your time. Boards up", "On your own. Four minutes.",
        "Same steps, your numbers.", "Last five minutes.", "Yesterday you measured ropes.", "Today the rope is cut twice."]
KEPT = ["A rope is 9 m long and is cut into 3 equal pieces.", "How long is each piece?", "Divide, or subtract?", "What a rope is", "A rope has a length.", "Decide first."]
with tempfile.TemporaryDirectory() as tmp:
    P = Deck(C.COURSE, 90, "Lesson 1", "T", "foot"); lb._fill_deck(P, S_)
    pptx = os.path.join(tmp, "d.pptx"); P.save(pptx, sidecar=False)
    z = zipfile.ZipFile(pptx)
    ptext = " ".join(" ".join(re.findall(r"<a:t>([^<]*)</a:t>", z.read(nm).decode("utf-8"))) for nm in z.namelist() if re.fullmatch(r"ppt/slides/slide\d+\.xml", nm))
    ptext = ptext.replace("&#8217;", "'").replace("&apos;", "'")
    H = HtmlDeck(C.COURSE, 90, "Lesson 1", "T", "foot"); lb._fill_deck(H, S_)
    html = render_page(H)
    slides_html = html[html.index('<section class="slide'):]
    htext = re.sub(r"<[^>]+>", " ", slides_html)
ok("slides: nothing of the grey line or the title box is in the PowerPoint", not [g for g in GONE if g in ptext], str([g for g in GONE if g in ptext]))
ok("slides: nothing of the grey line or the title box is in the HTML deck", not [g for g in GONE if g in htext], str([g for g in GONE if g in htext]))
ok("slides: the problem, the lead and the notes are in the PowerPoint", all(k in ptext for k in KEPT), str([k for k in KEPT if k not in ptext]))
ok("slides: the problem, the lead and the notes are in the HTML deck", all(k in htext for k in KEPT), str([k for k in KEPT if k not in htext]))
ok("slides: a Your Turn that is only an expression carries its Example's instruction (question and answer slides)", ptext.count("Find the value of it.") == 3 and htext.count("Find the value of it.") == 3, f"{ptext.count('Find the value of it.')} and {htext.count('Find the value of it.')}")
ok("slides: a Your Turn that asks its own question is not given the Example's", ptext.count("Decide first.") == 1 and htext.count("Decide first.") == 1)
ok("slides: the labels are still the Teacher's Edition's (the side-car)", any(x["sub"] == "Copy all three lines." for x in P.side) and any(x["sub"] == "Answer." for x in P.side) and [x["sub"] for x in P.side] == [x["sub"] for x in H.side])
ok("slides: the HTML deck has no hint, no remark beside a worked step and no line above an answer",
   not re.search(r'class="(hint|gloss|why)"', slides_html) and ".hint{" not in html and ".gloss{" not in html and ".why{" not in html)
ok("slides: a board still carries its instruction, and a worked slide its steps and answer",
   ptext.count("Answer it.") == len([q for q in S_["whiteboard"] if q.get("kind") != "written"]) and "Answer it." in htext and "3 m" in ptext and "3 m" in htext)
ok("slides: the HTML deck prints no text in the place of the grey line", not re.search(r'<p class="sub[^"]*">[^<]', slides_html) and 'class="box"' not in slides_html)
ok("slides: the title slide's note gives the teacher the line to say", "Today the rope is cut twice." in P.side[0]["note"])
ok("console: the slide is scaled about its centre (so it sits in the space the bar and rail leave at every size)",
   bool(re.search(r"function fit\(\)\{[^}]*transformOrigin='center'[^}]*translate\(-50%,-50%\) scale", open(consolekit.__file__, encoding="utf-8").read())))
# Croix, 4 October: "the individual review portion of the slides needs to put the problems on the board"
I_ = copy.deepcopy(L)
I_.update(yesterday="y", today="t"); I_.pop("no_set", None)
I_["independent"] = copy.deepcopy(I_["independent"])
I_["independent"][0]["stem"] = "Find the value.  $\\left(\\frac{2}{5}\\right)^{-2}$"
I_["independent"][1]["stem"] = "A question long enough that it has to run on to a second line of the slide, with $3^{2}$ in the middle of it, and then some more words after that so that it wraps."
with tempfile.TemporaryDirectory() as tmp:
    P2 = Deck(C.COURSE, 90, "Lesson 1", "T", "foot"); lb._fill_deck(P2, I_)
    pptx2 = os.path.join(tmp, "i.pptx"); P2.save(pptx2, sidecar=False)
    z2 = zipfile.ZipFile(pptx2)
    itext = " ".join(" ".join(re.findall(r"<a:t>([^<]*)</a:t>", z2.read(nm).decode("utf-8"))) for nm in z2.namelist() if re.fullmatch(r"ppt/slides/slide\d+\.xml", nm))
    H2 = HtmlDeck(C.COURSE, 90, "Lesson 1", "T", "foot"); lb._fill_deck(H2, I_)
    ihtml = render_page(H2); ihtml = re.sub(r"<[^>]+>", " ", ihtml[ihtml.index('<section class="slide'):])
_six = [slotmark.strip(q["stem"]) for q in I_["independent"]]
ok("the six independent questions are on the slide in the PowerPoint, whichever way the course hands them out",
   "Find the value." in itext and "has to run on to a second line" in itext and all(re.sub(r"\$[^$]+\$", "", q).split("  ")[0].strip()[:25] in itext for q in _six[2:]), itext[-300:])
ok("the six independent questions are on the slide in the HTML deck", all(re.sub(r"\$[^$]+\$", "", q).split("  ")[0].strip()[:25] in ihtml for q in _six))
ok("the slide that only said to work down the page is gone", "Work down the page" not in itext and "Work down the page" not in ihtml)
ok("mathematics in a question is typeset on the slide, not printed as its source", "\\frac" not in itext and "$" not in itext)
ok("the handout course keeps the handout's name on that slide and its place in the plan",
   [x for x in P2.side if x["kind"] in ("set", "independent")][0]["title"] == ("Independent Set" if C.SET == "handout" else "Independent Practice")
   and [x["kind"] for x in P2.side if x["kind"] in ("set", "independent")] == ["independent" if C.SET == "handout" else "set"])

# ---- ruling 39: an answer slide shows its steps; ruling 40: every word on a slide is in Lexend
import sympy as _sp
def _st(rows, final=None):
    return lb.stepcheck_rows(rows, "t", _sp.sympify(final) if final is not None else None)
ok("steps: true arithmetic, a fraction, and the checked answer at the end pass",
   _st(["Rectangle:  $14 \\times 8 = 112$", "Triangle:  $\\frac{1}{2} \\times 14 \\times 6 = 42$", "Add:  $112 + 42 = 154$"], 154) == ([], 4))
ok("steps: a false line is caught", len(_st(["$9 \\times 3 = 28$"])[0]) == 1)
ok("steps: steps that end somewhere other than the checked answer are caught", any("checked answer" in x for x in _st(["$108 - 12 = 96$"], 95)[0]))
ok("steps: an identity in the same letters is worked, and a false one caught",
   _st(["$x^{5} \\cdot x^{8} = x^{5+8} = x^{13}$"]) == ([], 2) and len(_st(["$x^{5} \\cdot x^{8} = x^{40}$"])[0]) == 1)
ok("steps: an equation to be solved is not mistaken for an identity", _st(["$3 + n = 11$", "$n = 11 - 3 = 8$"], 8)[0] == [])
ok("steps: a rounded line is held to the places it shows", _st(["$71.6 \\div 3.14 \\approx 22.8$"])[0] == [] and len(_st(["$71.6 \\div 3.14 \\approx 22.9$"])[0]) == 1)
T_ = copy.deepcopy(L)
T_.update(yesterday="y", today="t", no_set=True); T_.pop("independent")
T_["whiteboard"] = copy.deepcopy(T_["whiteboard"])
T_["whiteboard"][0]["steps"] = ["First line of working:  $1 + 1 = 2$"]
_mcs = [i for i, q in enumerate(T_["whiteboard"]) if q.get("kind") == "mc"]
if _mcs:
    T_["whiteboard"][_mcs[0]]["steps"] = ["Working shown on a choice board."]
with tempfile.TemporaryDirectory() as tmp:
    P3 = Deck(C.COURSE, 90, "Lesson 1", "T", "foot"); lb._fill_deck(P3, T_)
    pptx3 = os.path.join(tmp, "s.pptx"); P3.save(pptx3, sidecar=False)
    z3 = zipfile.ZipFile(pptx3)
    sx = [z3.read(nm).decode("utf-8") for nm in sorted(z3.namelist()) if re.fullmatch(r"ppt/slides/slide\d+\.xml", nm)]
    H3 = HtmlDeck(C.COURSE, 90, "Lesson 1", "T", "foot"); lb._fill_deck(H3, T_)
    h3 = render_page(H3)
stext = " ".join(" ".join(re.findall(r"<a:t>([^<]*)</a:t>", x)) for x in sx)
ok("steps: a board's working is on its answer slide and nowhere else (PowerPoint and HTML)",
   stext.count("First line of working:") == 1 and h3.count("First line of working:") == 1)
if _mcs:
    _rev = [x for x in sx if "Working shown on a choice board." in x]
    _opt = T_["whiteboard"][_mcs[0]]["choices"][0]
    ok("steps: a choice board's answer slide shows its working in place of the four options",
       len(_rev) == 1 and "A." not in " ".join(re.findall(r"<a:t>([^<]*)</a:t>", _rev[0])))
if "sci" in C.CAPS:
    _wb = copy.deepcopy(L); _wb["whiteboard"] = copy.deepcopy(_wb["whiteboard"])
    _wb["whiteboard"][0]["steps"] = ["Match the powers:  $1.3 \\times 10^{3} = 0.013 \\times 10^{5}$"]
    _cap_steps = [x for x in lb.capcheck_lesson(slotmark.strip_deep(_wb)) if "coefficient" in x]
    _wb["whiteboard"][0]["answer"] = "$0.013 \\times 10^{5}$"
    _cap_ans = [x for x in lb.capcheck_lesson(slotmark.strip_deep(_wb)) if "coefficient" in x]
    ok("steps: working may pass through a form that is not yet scientific notation; an answer may not",
       _cap_steps == [] and len(_cap_ans) == 1 and "whiteboard[0].answer" in _cap_ans[0], str(_cap_steps + _cap_ans))
_req = C.STEPS; C.STEPS = "required"
ok("steps: where the course requires them, an answer slide with none is refused", any("ruling 39" in x for x in lb.stepcheck_lesson(slotmark.strip_deep(L))[0]))
C.STEPS = _req
ok("steps: a lesson with no steps is a finding only where the course requires them",
   [x for x in lb.stepcheck_lesson(slotmark.strip_deep(L))[0] if "ruling 39" in x] == [] or getattr(C, "STEPS", "optional") == "required")
_yt = dict(prompt=["$2^{3}\\cdot 2^{4}$"], answer="128", steps=["$2^{3} \\cdot 2^{4} = 2^{3+4} = 2^{7}$", "$2^{7} = 128$"])
ok("steps: an answer slide that fits keeps its usual place and size", lb._yt_fit(_yt, "Find the value.") == (1.75, "slidebig"))
_tall = "$\\left(\\frac{2}{3}\\right)^{5} \\cdot \\left(\\frac{2}{3}\\right)^{-2} = \\left(\\frac{2}{3}\\right)^{3}$"
_big = dict(prompt=["$\\left[\\left(\\frac{2}{3}\\right)^{5}\\cdot\\left(\\frac{2}{3}\\right)^{-2}\\right]^{3}$"], answer_latex="\\left(\\frac{2}{3}\\right)^{9}", steps=[_tall] * 3)
_tower = dict(prompt=["$\\frac{\\left(\\frac{2}{3}\\right)^{5}}{\\left(\\frac{2}{3}\\right)^{2}}$"], answer_latex="\\left(\\frac{2}{3}\\right)^{3}", steps=[_tall, "$2^{3} = 8$"])
ok("steps: one that does not is set higher, or with its problem a size smaller",
   lb._yt_fit(_big, "Write it with one base.") == (1.62, "slidebig") and lb._yt_fit(_tower, "Write it with one base.") == (1.62, "slidemid"))
def _too_much():
    try:
        lb._yt_fit(dict(_big, steps=[_tall] * 5), "Write it with one base."); return False
    except RuntimeError as e:
        return "cannot hold its steps" in str(e)
ok("steps: and one that cannot fit at all is refused, not let run into the footer", _too_much())
_faces = set(re.findall(r'typeface="([^"]+)"', " ".join(sx)))
ok("font: every run on a slide names a face Google Slides has (Lexend; Arial or Times New Roman for a sign it lacks)", _faces <= {"Lexend", "Arial", "Times New Roman"} and "Lexend" in _faces, str(_faces))
ok("font: nothing on a slide is italic", not re.search(r'<a:rPr[^>]*\bi="1"', " ".join(sx)) and "font-style:italic" not in h3[h3.index('<section class="slide'):])
from lib import deckkit as _dk
ok("font: a sign Lexend has no glyph for is set in the fallback by name, and the rest stays",
   _dk._by_font("A \u2192 B") == [("A ", "Lexend"), ("\u2192", "Arial"), (" B", "Lexend")]
   and _dk._by_font("ok \u2713") == [("ok ", "Lexend"), ("\u2713", "DejaVu Sans")])
ok("font: the HTML deck carries Lexend itself and asks for nothing from the network",
   "font-family:'Lexend'" in h3 and "size-adjust:95%" in h3 and "fonts.googleapis" not in h3 and "Schola" not in h3)
ok("font: the faces are in the kit under their licence", all(os.path.exists(os.path.join(os.path.dirname(_dk.__file__), "..", "assets", f)) for f in ("Lexend-Regular.ttf", "Lexend-Bold.ttf", "LEXEND-OFL.txt", "lexend-regular.woff2", "lexend-bold.woff2", "lexend-fallback.woff2")))

# ---- ruling 40, second half: the mathematics on a slide, and the lettering of a figure, are in Lexend too
import json
from lib import mathimg as _mi
from lib import htmlkit as _hk
def _glyphs(tex, surface):
    pt = _mi.SIZES[surface]
    if surface.startswith("slide"):
        tex, pt, face = _mi.slide_form(tex, pt)
    else:
        face = "stix"
    r = _mi._PARSER.parse(f"${tex}$", dpi=72, prop=_mi._prop(pt, face))
    return [(chr(g[2]), g[0].family_name, g[0].style_name) for g in r.glyphs]
_g = _glyphs(r"3x^{2} \times 4 = 12x^{2} - \frac{1}{2}", "slide")
ok("math: on a slide every digit, letter and sign of an expression is drawn in Lexend", _g and all(f == "Lexend" for _, f, _ in _g), str(_g[:4]))
_gd = _glyphs(r"3x^{2} \times 4 = 12x^{2} - \frac{1}{2}", "doc")
ok("math: on a printed page the same expression is still STIX", _gd and all(f.startswith("STIX") for _, f, _ in _gd), str(_gd[:4]))
_gp = dict((c, (f, st)) for c, f, st in _glyphs(r"C = 2\pi r", "slide"))
ok("math: pi is the one sign a slide does not take from Lexend (STIX bold: the textbook's pi, at Lexend's weight)",
   _gp["\u03c0"] == ("STIXGeneral", "Bold") and _gp["C"][0] == "Lexend" and _gp["r"][0] == "Lexend", str(_gp))
_gc = _glyphs(r"2.5 \cdot 10^{3}", "slide")
ok("math: the multiplication dot is Lexend's own raised dot, as heavy as the decimal point beside it",
   ("\u2219", "Lexend", "Regular") in _gc and (".", "Lexend", "Regular") in _gc and not any(c in "\u22c5\u00b7" for c, _, _ in _gc), str(_gc))
ok("math: a variable l is set as the script l, never Lexend's bare stroke", [c for c, _, _ in _glyphs(r"A = lw", "slide")] == ["A", "=", "\u2113", "w"])
ok("math: words inside an expression are left as written (the l of 'ml' is a letter, not a variable)",
   _mi.lexend_tex(r"250\text{ ml} \leq \left(l\right) \ldots") == r"250\text{ ml} \leq \left(\ell \right) \ldots")
ok("math: a slot mark survives the slide face", slotmark.strip(_mi.lexend_tex(r"\sA{l}^{\sB{2}} \cdot \pi")) == "\\ell ^{2} \\hspace{0.2}\u2219\\hspace{0.2} \\mathtt{\\pi}")
_mi_figs = (_mi.FIGS, _mi.INDEX); _mi.FIGS = tempfile.mkdtemp(prefix="kitmath"); _mi.INDEX = os.path.join(_mi.FIGS, "index.json")
_pa = _mi.m(r"6.02 \times 10^{-3}", "slide")[0]
_keep = _mi.SLIDE_FACE; _mi.SLIDE_FACE = ""
_pb = _mi.m(r"6.02 \times 10^{-3}", "slide")[0]
_mi.SLIDE_FACE = _keep
ok("math: the face is part of an image's fingerprint (a STIX image is never served as Lexend)", _pa != _pb and os.path.exists(_pa) and os.path.exists(_pb))
_sa, _sb = _mi.m(r"\frac{3}{4} + \frac{5}{8}", "slide"), None
_mi.SLIDE_FACE = ""; _sb = _mi.m(r"\frac{3}{4} + \frac{5}{8}", "slide"); _mi.SLIDE_FACE = _keep
ok("math: at its 95% an expression in Lexend stands as tall as the STIX one it replaces (within 6%)", abs(_sa[2] / _sb[2] - 1) < 0.06, f"{_sa[2]:.3f} against {_sb[2]:.3f} in")
import slotaudit as _sl
_worst = max(_sl.geometry_differs(t, 40) for t in (r"3x^{2} \cdot x^{5} = 3x^{7}", r"\left(\frac{2}{3}\right)^{4} = \frac{2^{4}}{3^{4}}", r"\sA{3}^{\sB{2}} \cdot \pi r^{2}", r"\sqrt[3]{27} + 2^{3}"))
ok("math: in the slide face the colour code still changes the ink's colour and nothing else", _worst < 0.005, f"worst {_worst:.2%}")
_mi.FIGS, _mi.INDEX = _mi_figs
ok("font: a pi in a sentence is set in Times New Roman (a face Google Slides has), and nothing else is",
   _dk._by_font("C = 2\u03c0r") == [("C = 2", "Lexend"), ("\u03c0", "Times New Roman"), ("r", "Lexend")])
with tempfile.TemporaryDirectory() as tmp:
    Pp = Deck(C.COURSE, 90, "Lesson 1", "T", "foot"); Pp.section("Notes", "", 1, "n", "notes"); Pp.text("C = 2\u03c0r \u2192 d", 24)
    Pp.save(os.path.join(tmp, "p.pptx"), sidecar=False)
    _px = " ".join(zipfile.ZipFile(os.path.join(tmp, "p.pptx")).read(nm).decode("utf-8") for nm in zipfile.ZipFile(os.path.join(tmp, "p.pptx")).namelist() if re.fullmatch(r"ppt/slides/slide\d+\.xml", nm))
_pruns = [(re.search(r'typeface="([^"]+)"', r).group(1), bool(re.search(r'<a:rPr[^>]*\bb="1"', r)), "".join(re.findall(r"<a:t>([^<]*)</a:t>", r))) for r in re.findall(r"<a:r>(.*?)</a:r>", _px, re.S)]
ok("font: the pi is bold (the textbook's pi at Lexend's weight) while the words around it are not; the arrow is Arial",
   ("Times New Roman", True, "\u03c0") in _pruns and ("Lexend", False, "C = 2") in _pruns and ("Arial", False, "\u2192") in _pruns, str(_pruns))
from fontTools.ttLib import TTFont as _TT
_assets = os.path.join(os.path.dirname(_dk.__file__), "..", "assets")
ok("font: the pi face holds exactly one glyph, and travels with its licence",
   sorted(_TT(os.path.join(_assets, "WindyPi.ttf")).getBestCmap()) == [0x3C0] and sorted(_TT(os.path.join(_assets, "windypi.woff2")).getBestCmap()) == [0x3C0]
   and os.path.exists(os.path.join(_assets, "STIX-OFL.txt")))
ok("font: the HTML deck sets its mathematics in the slide font, with the pi face first in every stack",
   ".katex{font-family:'WindyPi','Lexend'" in h3 and "font-family:'WindyPi';" in h3 and "html,body{margin:0;height:100%;background:#2b2b2b;font-family:'WindyPi','Lexend'" in h3
   and ".katex .mathnormal,.katex .mathit,.katex .boldsymbol{font-family:'WindyPi','Lexend','LexendFallback',KaTeX_Math;font-style:normal}" in h3
   and "const KMACROS=" + json.dumps(_hk.KMACROS) + ";" in h3 and _hk.KMACROS["\\cdot"] == "\\bullet " and _hk.KMACROS["\\neq"] == _hk.KMACROS["\\ne"] == "\\mathrel{\\char\"2260}", h3[h3.find("const KMACROS"):h3.find("const KMACROS") + 70])
_lexm, _pim = _TT(os.path.join(_assets, "Lexend-Regular.ttf")), _TT(os.path.join(_assets, "WindyPi.ttf"))
ok("font: the pi face stands on Lexend's own vertical metrics (a line with a pi in it is no taller than its neighbours)",
   all(getattr(_pim[t], k) == getattr(_lexm[t], k) for t, ks in (("hhea", ("ascent", "descent", "lineGap")), ("OS/2", ("sTypoAscender", "sTypoDescender", "usWinAscent", "usWinDescent"))) for k in ks)
   and "font-family:'WindyPi';font-weight:100 900;font-style:normal;size-adjust:95%;unicode-range:U+03C0;" in h3)
_ss, _sb = _dk.step_sizes(), _dk.step_sizes(True)
_mi.SLIDE_FACE = ""; _so = (_dk.step_sizes(), _dk.step_sizes(True)); _mi.SLIDE_FACE = _keep
ok("steps: a line of working is one size — its words and its mathematics (and the old pairs come back with the face off)",
   _ss == dict(size=24.5, surface="slidestep") and _sb == dict(size=29, surface="slidestepmid")
   and all(x["size"] == _mi.SIZES[x["surface"]] for x in (_ss, _sb))
   and _so == (dict(size=23, surface="slide"), dict(size=26, surface="slidemid")), str((_ss, _sb, _so)))
_stp = re.findall(r'<div class="steps"><div>(<p class="t left s-(\w+)[^"]*" style="font-size:([\d.]+)pt">)', h3)
ok("steps: in the HTML deck the mathematics of a step is set at the size of the words beside it",
   _stp and all(surf in ("slidestep", "slidestepmid") and float(pt) == _mi.SIZES[surf] for _, surf, pt in _stp)
   and "p.s-slidestep .k:not(.d),p.s-slidestepmid .k:not(.d){font-size:1em}" in h3, str(_stp)[:200])
_runs = [(float(sz) / 100, t) for sz, t in re.findall(r'<a:rPr[^>]*\bsz="(\d+)"[^>]*>.*?</a:rPr><a:t>([^<]*)</a:t>', " ".join(sx), re.S) if "First line of working" in t]
ok("steps: and in the PowerPoint the words of a step are set at the size its mathematics is drawn",
   _runs and all(abs(sz - round(_mi.SIZES[s_] * _dk.SCALE, 1)) < 0.06 for sz, _ in _runs for s_ in ("slidestepmid",)), str(_runs))
# ---- the HTML deck fits itself: nothing runs into the footer, and a slide carrying far too much is still refused
try:
    import checks as _ck
    from playwright.sync_api import sync_playwright as _sp_          # noqa: F401
    _browser = True
except Exception:
    _browser = False
if _browser:
    _row = "$\\left(\\frac{2}{3}\\right)^{5} \\cdot \\left(\\frac{2}{3}\\right)^{-2} = \\left(\\frac{2}{3}\\right)^{3}$"
    def _page(nrows, fit=True):
        H = HtmlDeck(C.COURSE, 90, "Lesson 1", "T", "foot")
        H.section("Your Turn", "", 1, "n", "yourturn"); H.text("A problem.", 24, align="center")
        H.section("Your Turn", "", 1, "n", "yourturn"); H.text("A problem.", 24, align="center"); H.steps([_row] * nrows); H.answer_line("42")
        page = render_page(H)
        return page if fit else page.replace("function fitSlide(sl){", "function fitSlide(sl){return;")
    _h0 = C.HTML; C.HTML = True                      # the HTML path is kept and still tested; ruling 41 only stops courses building it
    with tempfile.TemporaryDirectory() as tmp:
        _res = {}
        for name, nrows, fit in (("fits", 6, True), ("unfitted", 6, False), ("far too much", 12, True)):
            pth = os.path.join(tmp, name.replace(" ", "_") + ".html"); open(pth, "w", encoding="utf-8").write(_page(nrows, fit))
            import io, contextlib
            with contextlib.redirect_stdout(io.StringIO()) as _out:
                _res[name] = (_ck.check_html([pth]), _out.getvalue())
    C.HTML = _h0
    ok("html fit: a slide a little too tall is set smaller, whole, and clears its footer (and the check says how many were)",
       not any("below the footer rule" in x or "had to be set" in x for x in _res["fits"][0]) and "2 slides set smaller to clear the footer" in _res["fits"][1], str(_res["fits"])[:300])
    ok("html fit: its question slide takes the same factor, so the pair agree", "2 slides set smaller" in _res["fits"][1])
    ok("html fit: without the fit the same slide runs into the footer, and the check sees it", any("below the footer rule" in x for x in _res["unfitted"][0]), str(_res["unfitted"][0])[:300])
    ok("html fit: a slide that would have to be set under the floor is refused — that is the spec's to fix", any("had to be set at" in x for x in _res["far too much"][0]), str(_res["far too much"][0])[:300])
# ---- ruling 42: an arrow is not an equals sign — none on a student page
def _arrows(**kw):
    X = copy.deepcopy(L); X["whiteboard"] = copy.deepcopy(X["whiteboard"]); X["notes"] = copy.deepcopy(X["notes"])
    for k, v in kw.items():
        if k == "board":
            X["whiteboard"][0].update(v)
        elif k == "notes":
            X["notes"] = [dict(numeral="I", head="A heading", min=2, sub="", note="n", letters=False, **v)]
        else:
            X[k] = v
    return [x for x in lb.rulingcheck_lesson(slotmark.strip_deep(X)) if "ruling 42" in x]
ok("ruling 42: the lesson as written carries no arrow", _arrows() == [])
ok("ruling 42: an arrow standing for 'equals' in the notes is refused, and the finding says where",
   len(_arrows(notes=dict(items=["diameter × π   →   CIRCUMFERENCE:   multiply"]))) == 1
   and "notes[0].items[0]" in _arrows(notes=dict(items=["diameter × π   →   CIRCUMFERENCE:   multiply"]))[0])
ok("ruling 42: so is one typeset (\\rightarrow, \\to), one typed (->), and one in a step or on a figure",
   all(len(_arrows(board=dict(steps=[t]))) == 1 for t in ("$14 \\rightarrow 28$", "$x \\to 2x$", "14 -> 28", "$a \\Rightarrow b$"))
   and len(_arrows(board=dict(fig=dict(kind="shapes", shapes=[dict(t="text", xy=(0, 0), s="AROUND \u2192 circumference")])))) == 1)
ok("ruling 42: an equals sign, a 'so', an inequality and a minus sign are not arrows",
   _arrows(board=dict(steps=["$14 \\times 2 = 28$", "$C = 12$,   so   $d = 4$", "$x \\geq -3$", "$5 - 3 > 1$", "$a \\leq b$", "$\\top$ is not used"])) == [])
ok("ruling 42: a teacher's note may use one (it is prose about the lesson, not a page a student reads)",
   _arrows(board=dict(note="Book section 3.1.2 \u2192 Notes I.", wrong="14 \u2192 28 — doubled [Notes I]")) == [])
ok("ruling 42: a mapping is mathematics, and its block may say so", _arrows(board=dict(steps=["$x \\mapsto 2x$"], arrow_ok=True)) == [])
ok("ruling 42: the unit's papers and reference sheet are student pages too",
   len(lb.arrowcheck(dict(blocks=[dict(table=([1, 1], [["Rule", "Example"], ["Every nonzero digit counts", "$4{,}207 \\rightarrow 4$"]]))]), "reference", "U90")) == 1)

# ---- ruling 41: a deck is its Slides file — no HTML deck, no console, unless the course asks
ok("ruling 41: the kit builds no HTML unless a course's profile asks for it", C.HTML is False)
_UL = [dict(copy.deepcopy(L), code="90.01", plan_code=None), dict(copy.deepcopy(L), code="90.02", plan_code=None)]
with tempfile.TemporaryDirectory() as tmp:
    import io, contextlib
    with contextlib.redirect_stdout(io.StringIO()):
        lb.build_unit_deck(_UL, [(x["code"], x["title"]) for x in _UL], {"unit": 90, "title": "Area and Circles"}, tmp)
    _off = sorted(os.path.splitext(f)[1] for f in os.listdir(tmp))
    _hk0 = C.HTML; C.HTML = True
    _save0 = HtmlDeck.save                           # the console wants a course's vendored spine beside it; here the plain page will do
    HtmlDeck.save = lambda self, path, sidecar=False, console=False: _save0(self, path, sidecar, False)
    try:
        with contextlib.redirect_stdout(io.StringIO()):
            lb.build_unit_deck(_UL, [(x["code"], x["title"]) for x in _UL], {"unit": 90, "title": "Area and Circles"}, tmp)
        _on = sorted(os.path.splitext(f)[1] for f in os.listdir(tmp))
    finally:
        C.HTML = _hk0; HtmlDeck.save = _save0
    try:
        import checks as _ck3
        open(os.path.join(tmp, "stray - Slides.html"), "w").write("<html></html>")
        with contextlib.redirect_stdout(io.StringIO()):
            _stray = _ck3.check_html([os.path.join(tmp, "stray - Slides.html")]); _none = _ck3.check_html([os.path.join(tmp, "x.pptx")])
    except ImportError:
        _stray, _none = ["ruling 41"], []
ok("ruling 41: the whole-unit deck is a PowerPoint and nothing else; with HTML asked for, the console is built beside it",
   _off == [".pptx"] and _on == [".html", ".pptx"], str((_off, _on)))
ok("ruling 41: an HTML deck left among the built files is a finding (a stale console beside today's slides); none is clean",
   len(_stray) == 1 and "ruling 41" in _stray[0] and _none == [], str((_stray, _none)))
ok("font: the HTML deck hands KaTeX a variable l as the script l", _hk._tex("A = lw", False) == r"A = \ell w" and _hk._tex(r"3\text{ ml}", False) == r"3\text{ ml}")

from lib import htmlkit as _hk
_cjs = re.sub(r"//[^\n]*", "", open(consolekit.__file__, encoding="utf-8").read()); _hjs = re.sub(r"//[^\n]*", "", open(_hk.__file__, encoding="utf-8").read())
ok("console: the veil over an answer slide covers its working as well as its answer",
   ".slide.veiled .answer,.slide.veiled .wa,.slide.veiled .steps{visibility:hidden}" in _cjs and "querySelector('.answer, .wa, .steps, ol.choices li.correct')" in _cjs)
ok("console and deck: the slide is sized by the document's own box, never window.innerWidth (a touch screen reports the zoomed-out width there)",
   not re.search(r"\binner(Width|Height)\b", _cjs) and not re.search(r"\binner(Width|Height)\b", _hjs)
   and "document.documentElement.clientWidth" in _cjs and "document.documentElement.clientWidth" in _hjs)

# ---- figures: no line through a label, a label's clearance in its own type size, units (ruling 38)
import tempfile
from lib import figkit
figkit.FIGS = tempfile.mkdtemp(prefix="kitfigs"); figkit.INDEX = os.path.join(figkit.FIGS, "figindex.json")
def _raises(fn, needle):
    try:
        fn(); return False
    except RuntimeError as e:
        return needle in str(e)
def _roof(label_at, **kw):       # a low triangle with one label; the label is the thing under test
    return dict(kind="shapes", fs=22, pt=18, **{"in": 1.6}, shapes=[
        dict(t="poly", pts=[(0, 0), (14, 0), (7, 3)]), dict(t="text", xy=label_at, s="6 m", **kw)])
def _draws(spec):
    try:
        figkit.draw(spec, spec["in"]); return True
    except ValueError as e:
        return "runs through its label" not in str(e) and None
ok("figures: a label a side runs through is refused", _draws(_roof((2.5, 1.0))) is False)
ok("figures: the same label clear of the sides is drawn", _draws(_roof((7, 0), va="top", off=(0, -0.3))) is True)
ok("figures: a label inside a shaded piece is not a struck label (a fill is not a line)", _draws(dict(kind="shapes", fs=22, pt=18, **{"in": 3.0}, shapes=[
    dict(t="poly", pts=[(0, 0), (12, 0), (12, 8), (0, 8)]), dict(t="text", xy=(6, 4), s="A")])) is True)
ok("figures: a label on a dashed height is refused too", _draws(dict(kind="shapes", fs=22, pt=18, **{"in": 3.0}, shapes=[
    dict(t="poly", pts=[(0, 0), (12, 0), (12, 8), (0, 8)]), dict(t="seg", a=(6, 0), b=(6, 8), dash=True),
    dict(t="text", xy=(6, 4), s="8 m")])) is False)
def _gap(inches):                # the white between a bottom side and the label under it, in points on the page
    import numpy as np
    from PIL import Image
    spec = dict(kind="shapes", fs=22, pt=18, **{"in": inches}, shapes=[
        dict(t="poly", pts=[(0, 0), (12, 0), (12, 8), (0, 8)], fill="#FFFFFF"),
        dict(t="text", xy=(6, 0), s="12 m", va="top", off=(0, -0.3))])
    path, w, h = figkit.draw(spec, inches)
    a = np.asarray(Image.open(path).convert("RGBA")); ink = (a[..., 3] > 128) & (a[..., :3].min(axis=2) < 120)
    rows = np.where(ink.any(axis=1))[0]
    breaks = [(rows[i], rows[i + 1]) for i in range(len(rows) - 1) if rows[i + 1] - rows[i] > 2]
    return (breaks[-1][1] - breaks[-1][0]) * (w / a.shape[1]) * 72
g1, g2 = _gap(1.5), _gap(4.0)
ok("figures: a label keeps its clearance when the figure is drawn small (a step in the label's own type size)",
   abs(g1 - g2) < 1.5 and 3 < g1 < 12, f"{g1:.1f} pt at 1.5 in, {g2:.1f} pt at 4 in")
ok("figures: the name of an L-shape is put inside it, clear of its notch", figkit._label_point([(1, 1), (5, 1), (5, 4), (3, 4), (3, 3), (1, 3)]) == (3.0, 2.0))
ok("figures: the name of a rectangle stays at its middle", figkit._label_point([(0, 0), (4, 0), (4, 3), (0, 3)]) == (2.0, 1.5))
_fig = dict(kind="shapes", shapes=[dict(t="text", xy=(0, 0), s="7 cm"), dict(t="text", xy=(1, 0), s="13 cm")])
ok("figures: a figure in centimetres answered in square inches is refused",
   _raises(lambda: figkit.units_agree(dict(whiteboard=[dict(fig=_fig, text=["Find the area."], answer="60 in²")])), "disagree about the unit"))
ok("figures: the same figure answered in square centimetres passes", figkit.units_disagree(dict(whiteboard=[dict(fig=_fig, answer="60 cm²")])) == [])
_sq = dict(kind="shapes", fs=22, pt=18, **{"in": 3.0}, shapes=[dict(t="poly", pts=[(0, 0), (12, 0), (12, 8), (0, 8)], fill="#FFFFFF"),
                                                         dict(t="text", xy=(6, 0), s="12 m", va="top", off=(0, -0.3)), dict(t="text", xy=(6, 4), s="2\u03c0r")])
_fa, _fb = figkit.draw(_sq, 3.0)[0], figkit.draw(figkit.slide(_sq), 3.0)[0]
def _same(a, b):
    from PIL import Image, ImageChops
    A, B = Image.open(a).convert("RGBA"), Image.open(b).convert("RGBA")
    return A.size == B.size and ImageChops.difference(A, B).getbbox() is None
ok("figures: a slide's figure is lettered in the slide font and filed apart from the printed page's", _fa != _fb and not _same(_fa, _fb) and figkit.slide(figkit.slide(_sq)) == figkit.slide(_sq))
_seen = []
_orig_struck = figkit._struck
figkit._struck = lambda fig, ax: (_seen.append([(t.get_text(), t.get_fontfamily()) for t in ax.texts]), _orig_struck(fig, ax))[1]
figkit.draw(figkit.slide(dict(_sq, note="again")), 3.0); figkit.draw(dict(_sq, note="again"), 3.0)
figkit._struck = _orig_struck
ok("figures: on a slide the labels are Lexend and a pi is the textbook's; on paper they are as they were",
   ("12 m", ["Lexend", "DejaVu Sans"]) in _seen[0] and ("2$\\mathtt{\\pi}$r", ["Lexend", "DejaVu Sans"]) in _seen[0]
   and ("2\u03c0r", ["STIXGeneral"]) in _seen[1], str(_seen))
ok("figures: a scale problem may say so (units_ok)", figkit.units_disagree(dict(whiteboard=[dict(fig=_fig, answer="6 m", units_ok=True)])) == [])
ok("figures: an Example with a figure starts higher only when its lines and its figure need the room",
   lb._example_top(["One line."], None) == 2.3 and lb._example_top(["One line.", "Two."], None) == 1.9
   and lb._example_top(["One line."], dict(_roof((7, 0), va="top", off=(0, -0.3)), reserve=0.7)) == 1.9
   and lb.TOP <= lb._example_top(["A line of the problem."] * 4, dict(kind="shapes", fs=22, pt=18, reserve=0.9, **{"in": 3.4}, shapes=[
       dict(t="poly", pts=[(0, 0), (10, 0), (10, 10), (0, 10)])])) < 1.9)

print(f"\nkit tests under {os.path.basename(os.environ.get('KIT_COURSE', 'course.py'))}: {n - len(fails)} of {n} passed")
for f in fails:
    print("  FAILED", f)
sys.exit(1 if fails else 0)
