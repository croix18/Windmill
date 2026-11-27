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
         warmup=[dict(stem="9 + 6", answer="15", check=("eq", "9+6", "15"))],     # not a board's sum: ruling 43
         notes=[], examples=[],
         whiteboard=[board(1), board(2), board(3, unneeded="3 minutes"), board(4), board(5), board(6), mc(7, 3), mc(8, 1), board(9, kind="written")],
         independent=[dict(stem=f"{k} + 20", answer=str(k + 20), check=("eq", f"{k}+20", str(k + 20))) for k in range(6)],
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
planted("money written with a bare dollar sign (A7 7.07's qtext, 21 Nov 2026)",
        lambda M: M["whiteboard"][0].__setitem__("qtext", "2 pounds cost $7.00 and 4 pounds cost $14.00. Which costs less?"), "bare $")
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
# rules 5 and 6 on a plan of our own: a day taught from two decks (ruling 50: M7's 9.06+07) and a
# lesson the as-run log moved past (A7's 4.07+08, 23 Oct 2026)
import json, tempfile
from lib import ixlplan
_T = tempfile.mkdtemp(prefix="kitixl"); _K = C.COURSE_KEY
_sk = lambda c, n: (c, {"name": n, "courses": [_K], "benchmarks": [], "lessons": []})
_two = [{"name": "Skill one", "code": "S1A"}, {"name": "Skill two", "code": "S2B"}]
json.dump({"days": {"2026-11-02": {_K: {"code": "90.06+07", "ixl": _two}}, "2026-11-03": {_K: {"code": "91.02+03", "ixl": _two}}},
           "skills": dict([_sk("S1A", "Skill one"), _sk("S2B", "Skill two"), _sk("S3C", "Skill three")]),
           "flow": {_K: {"items": [{"code": "92.05+06", "gone": "covered before 2026-11-09"}]}}},
          open(os.path.join(_T, "spine.json"), "w"))
for _u, _f, _body in (("u90", "l06.py", 'code="90.06", ixl=["Skill one (S1A)"]'), ("u90", "l07.py", 'code="90.07", ixl=["Skill two (S2B)"]'),
                      ("u91", "l02.py", 'code="91.02", ixl=["Skill one (S1A)", "Skill two (S2B)"]')):
    os.makedirs(os.path.join(_T, _u), exist_ok=True)
    open(os.path.join(_T, _u, _f), "w").write(f"L = dict(\n    {_body})\n")
_env = {k: os.environ.get(k) for k in ("KIT_SPINE", "KIT_UNITS")}
os.environ.update(KIT_SPINE=os.path.join(_T, "spine.json"), KIT_UNITS=_T)
try:
    D6, D7 = dict(code="90.06", unit=90, ixl=["Skill one (S1A)"]), dict(code="90.07", unit=90, ixl=["Skill two (S2B)"])
    ok("rule 5: two decks that split their day's skills pass", ixlplan.check(D6) == [] and ixlplan.check(D7) == [], str(ixlplan.check(D6) + ixlplan.check(D7)))
    ok("rule 5 planted: a deck assigns a skill its day does not list",
       any("does not list for 90.06+07" in x for x in ixlplan.check(dict(D7, ixl=["Skill two (S2B)", "Skill three (S3C)"]))))
    ok("rule 5 planted: a skill of the day on neither deck", any("none of its decks" in x and "S1A" in x for x in ixlplan.check(dict(D6, ixl=[]))))
    ok("rule 5: a miss is said once, by the day's first deck", not [x for x in ixlplan.check(D7) if "none of its decks" in x])
    ok("rule 3 still holds a merged day taught from one deck",
       ixlplan.check(dict(code="91.02", unit=91, ixl=["Skill one (S1A)", "Skill two (S2B)"])) == []
       and any("for this lesson and the slide does not" in x for x in ixlplan.check(dict(code="91.02", unit=91, ixl=["Skill one (S1A)"]))))
    G = dict(code="92.05", unit=92, ixl=["Skill dropped with it (S9Z)"])
    ok("rule 6: a lesson the log moved past may name a code the plan dropped with it", ixlplan.check(G) == [], str(ixlplan.check(G)))
    ok("rule 6 planted: the same code on a lesson the plan still teaches",
       any("not in this course's IXL plan" in x for x in ixlplan.check(dict(G, code="90.05", unit=90))))
    ok("rule 6 planted: a skill the plan knows, under another code",
       any("the plan's code for 'Skill one' is S1A" in x for x in ixlplan.check(dict(G, ixl=["Skill one (S1X)"]))))
finally:
    for _k, _v in _env.items():
        if _v is None:
            os.environ.pop(_k, None)
        else:
            os.environ[_k] = _v
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
# ruling 58 (21 Nov 2026): "Answer it." under every board said nothing; a written board alone says how to answer
_written = len([q for q in S_["whiteboard"] if q.get("kind") == "written"])
ok("slides: a board prints no instruction under its question, a written board says how to answer, and a worked slide has its steps and answer",
   "Answer it." not in ptext and "Answer it." not in htext and ptext.count("Write your answer in complete sentences.") == _written
   and htext.count("Write your answer in complete sentences.") == _written and "3 m" in ptext and "3 m" in htext, f"{_written} written board(s)")
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
# ---- the lines an equations unit needs (15 Nov 2026): a false ending, and an equation with the letter on both sides
def _st5(rows, final=None, answer=None):
    return lb.stepcheck_rows(rows, "t", _sp.sympify(final) if final is not None else None, answer)[0]
_none5 = ["[equation] $6x + 8 = 6x + 5$", "Take $6x$ from both sides:", "[false] $8 = 5$, never true"]
ok("steps: undeclared, a false ending and a letter on both sides that is not an identity are refused exactly as before",
   len(_st5(["$6x + 8 = 6x + 5$"])) == 1 and len(_st5(["$8 = 5$"])) == 1 and len(_st5(["$30 + 5v = 8v$"])) == 1)
ok("steps: a declared equation and a declared false ending pass where the answer is no solution, and the declaration is not on the slide",
   _st5(_none5, answer="No solution") == [] and lb.shown_steps(_none5) == ["$6x + 8 = 6x + 5$", "Take $6x$ from both sides:", "$8 = 5$, never true"])
ok("steps: a declared equation is solved and held to the equation before it, to the answer's value",
   _st5(["[equation] $30 + 5v = 8v$", "$30 = 3v$", "$v = 10$"], 10, "v = 10") == []
   and _st5(["[equation] $2(x + 3) = 2x + 6$", "$6 = 6$, always true"], answer="Infinitely many solutions") == [])
ok("planted: a declared false ending that is true", any("is true" in x for x in _st5(["[equation] $6x + 8 = 6x + 8$", "[false] $8 = 8$"], answer="No solution")))
ok("planted: a false ending after an equation that has a solution", any("cannot follow" in x for x in _st5(["[equation] $6x + 8 = 5x + 5$", "[false] $8 = 5$"], answer="No solution")))
ok("planted: a declared equation that changes the solutions", any("changes the solutions" in x for x in _st5(["[equation] $30 + 5v = 8v$", "[equation] $30 = 2v$"], 10, "v = 10")))
ok("planted: a declared equation whose solution is not the keyed value", any("the answer is v = 12" in x for x in _st5(["[equation] $30 + 5v = 8v$", "$v = 10$"], answer="v = 12")))
ok("planted: a working that ends with no solution under an answer that gives one", any("does not say no solution" in x for x in _st5(_none5, answer="x = 3")))
ok("planted: infinitely many keyed over an equation with one solution", any("infinitely many" in x for x in _st5(["[equation] $2(x + 3) = 2x + 3x$"], answer="Infinitely many solutions")))
ok("planted: no solution keyed over an equation with every number for a solution", any("says no solution" in x for x in _st5(["[equation] $2(x + 3) = 2x + 6$"], answer="No solution")))
ok("planted: a negative solution is a solution (the check's letters are positive; an equation's are not)",
   _st5(["[equation] $3x + 4 = x - 2$", "$x = -3$"], answer="x = −3") == [] and len(_st5(["[equation] $3x + 4 = x - 2$"], answer="no solution")) == 1)
_wb5 = copy.deepcopy(L); _wb5["whiteboard"] = copy.deepcopy(_wb5["whiteboard"])
_wb5["whiteboard"][0].update(text=["How many solutions does $4x + 9 = 4x + 2$ have?"], answer="No solution", check=("true", "True"),
                             steps=["[equation] $4x + 9 = 4x + 2$", "[false] $9 = 2$, never true"])
ok("steps: the lesson gate reads a board's declared lines (and its answer)", lb.stepcheck_lesson(slotmark.strip_deep(_wb5))[0] == [], str(lb.stepcheck_lesson(slotmark.strip_deep(_wb5))[0]))
_wb5["whiteboard"][0]["answer"] = "x = 0"
ok("planted: the lesson gate refuses that board keyed with a value", any("does not say no solution" in x for x in lb.stepcheck_lesson(slotmark.strip_deep(_wb5))[0]))
T_ = copy.deepcopy(L)
T_.update(yesterday="y", today="t", no_set=True); T_.pop("independent")
T_["whiteboard"] = copy.deepcopy(T_["whiteboard"])
T_["whiteboard"][0]["steps"] = ["First line of working:  $1 + 1 = 2$"]
T_["whiteboard"][1].update(steps=["[equation] $2x + 2 = x + 4$", "$x = 2$"], answer="x = 2")
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
ok("steps: a line's declaration ([equation], [false]) is never on a slide", "[equation]" not in stext and "[equation]" not in h3 and "2x + 2" not in stext)
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
def _fits(yt, ask, want):
    try:
        return lb._yt_fit(yt, ask) == want
    except RuntimeError:                 # a refusal fails this test, not every test after it
        return False
ok("steps: one that does not is set higher, or with its problem a size smaller",
   _fits(_big, "Write it with one base.", (1.62, "slidebig")) and _fits(_tower, "Write it with one base.", (1.62, "slidemid")))
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
# a minus after a comma is a sign (the A7 Unit 6 second review, 25 Oct 2026: "(−6, − 2)"): the pair renders as wide as with the
# minus braced by hand, and narrower than the binary minus the old code drew
_w_pair = _mi.m(r"(-6, -2)", "slide")[1]; _w_braced = _mi.m(r"(-6, {-}2)", "slide")[1]
_w_binary = _mi._PARSER.parse("$(-6, -2)$", dpi=_mi.DPI, prop=_mi._prop(*_mi.slide_form("(-6, -2)", _mi.SIZES["slide"])[1:])).width / _mi.DPI
ok("math: a minus after a comma sits tight, as a sign (a point's second coordinate)", abs(_w_pair - _w_braced) < 1e-6 and _w_pair < _w_binary - 0.01, f"{_w_pair:.3f} {_w_braced:.3f} {_w_binary:.3f}")
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
# ---- ruling 42: an arrow never stands in for an equals sign — and is welcome everywhere else
def _arrows(**kw):
    X = copy.deepcopy(L); X["whiteboard"] = copy.deepcopy(X["whiteboard"])
    for k, v in kw.items():
        if k == "board":
            X["whiteboard"][0].update(v)
        elif k == "notes":
            X["notes"] = [dict(numeral="I", head="A heading", min=2, sub="", note="n", letters=False, **v)]
        else:
            X[k] = v
    return [x for x in lb.rulingcheck_lesson(slotmark.strip_deep(X)) if "ruling 42" in x]
ok("ruling 42: the lesson as written carries no arrow standing for an equals sign", _arrows() == [])
_a1 = _arrows(notes=dict(items=["diameter × π   →   CIRCUMFERENCE:   multiply"]))
ok("ruling 42: an arrow from a calculation to its result is refused, and the finding says where and why",
   len(_a1) == 1 and "notes[0].items[0]" in _a1[0] and "from a calculation to its result" in _a1[0], str(_a1)[:200])
ok("ruling 42: so is an arrow between two things that are equal — numbers, or expressions in the same letters",
   all(len(_arrows(board=dict(steps=[t]))) == 1 for t in ("$12 \\times 9 \\rightarrow 108$", "$30 \\div 0.08 \\to 375$", "$x^{2} \\cdot x^{3} \\rightarrow x^{5}$", "3/4 -> 0.75", "8⁻³ → 1/8³")))
ok("ruling 42: an arrow keeps its place — a step leading to the next, a mapping, a change, a label, a rounding",
   _arrows(board=dict(steps=["C = 12π in   →   d = 12π ÷ π = 12 in", "$x \\mapsto 2x$", "A(2, 3) → A′(4, 6)", "$P = 14 \\rightarrow 28$",
                                    "Diameter → C = πd", "$1{,}868.4 \\rightarrow 1{,}868$", "4, 3, 2 → 8, 6, 4", "2/3 → 3/2"])) == []
   and _arrows(board=dict(fig=dict(kind="shapes", shapes=[dict(t="text", xy=(0, 0), s="AROUND → circumference")]))) == [])
ok("ruling 42: an equals sign, a 'so', an inequality and a minus sign were never the question",
   _arrows(board=dict(steps=["$14 \\times 2 = 28$", "$C = 12$,   so   $d = 4$", "$x \\geq -3$", "$5 - 3 > 1$", "$a \\leq b$"])) == [])
ok("ruling 42: a teacher's note is not a student page", _arrows(board=dict(note="12 × 9 → 108", wrong="12 × 9 → 108 [Notes I]")) == [])
ok("ruling 42: a block may overrule a reading the build got wrong", _arrows(board=dict(steps=["$12 \\times 9 \\rightarrow 108$"], arrow_ok=True)) == [])
ok("ruling 42: the unit's papers and reference sheet are read the same way",
   len(lb.arrowcheck(dict(blocks=[dict(table=([1, 1], [["Rule", "Example"], ["A product", "$12 \\times 9 \\rightarrow 108$"]]))]), "reference", "U90")) == 1
   and lb.arrowcheck(dict(blocks=[dict(table=([1, 1], [["Rule", "Example"], ["Every nonzero digit counts", "$4{,}207 \\rightarrow 4$"]]))]), "reference", "U90") == [])

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
# ---- ruling 43: a practice problem never repeats what the lesson already showed
from lib import repeatcheck as rc
def _rep(**kw):
    """Ruling 43's findings for a small lesson: notes=[lines], example=dict, warmup=[...], boards=[...], yt=dict, independent=[...]."""
    X = dict(code="90.01", warmup=kw.get("warmup", []), whiteboard=kw.get("boards", []), independent=kw.get("independent", []),
             bank=kw.get("bank", []), additional=[],
             notes=[dict(numeral="I", head="A heading", items=kw["notes"])] if kw.get("notes") else [], examples=[])
    if kw.get("example") or kw.get("yt"):
        e = dict(title="Example 1", prompt=[], worked=[])
        e.update(kw.get("example") or {})
        if kw.get("yt"):
            e["your_turn"] = kw["yt"]
        X["examples"] = [e]
    return rc.check_lesson(slotmark.strip_deep(X))
ok("ruling 43: the test lesson repeats nothing, and through the ruling gate too",
   not [x for x in lb.rulingcheck_lesson(slotmark.strip_deep(L)) if "ruling 43" in x])
_r1 = _rep(notes=["$x^{4}\\cdot x^{-6} = x^{4+(-6)} = x^{-2} = \\frac{1}{x^{2}}$"], boards=[dict(latex="x^{4}\\cdot x^{-6}", answer="C — 1/x²")])
ok("ruling 43: a board that is a notes line is refused, and the finding says which board and which slide",
   len(_r1) == 1 and "whiteboard 1" in _r1[0] and "Notes I" in _r1[0] and "repeat_ok" in _r1[0], str(_r1)[:300])
ok("ruling 43: typography is not a difference — 5⁻² in the notes is 5^{-2} on the board, \\dfrac is \\frac, · is \\cdot",
   len(_rep(notes=["5⁻² = 1/5² = 1/25"], boards=[dict(latex="5^{-2}", answer="B — 1/25")])) == 1
   and len(_rep(notes=["$\\dfrac{m^{3}}{m^{7}} = m^{-4}$"], boards=[dict(latex="\\frac{m^{3}}{m^{7}}", answer_latex="\\frac{1}{m^{4}}")])) == 1
   and len(_rep(notes=["$6^{-2}·6^{5} = 6^{3}$"], boards=[dict(text=["Which expression is equivalent?"], latex="6^{-2}\\cdot 6^{5}", answer="D — 6³")])) == 1)
ok("ruling 43: renaming the letter is not a new problem — (2y⁻³)² in the notes is (2x⁻³)² on the board",
   len(_rep(notes=["$(2y^{-3})^{2} = 2^{2}\\cdot y^{-6} = \\frac{4}{y^{6}}$"], boards=[dict(latex="(2x^{-3})^{2}", answer="D — 4/x⁶")])) == 1)
ok("ruling 43: the same law on another expression is another problem",
   _rep(notes=["$x^{4}\\cdot x^{-6} = x^{-2} = \\frac{1}{x^{2}}$", "$(2y^{-3})^{2} = \\frac{4}{y^{6}}$"],
        boards=[dict(latex="x^{3}\\cdot x^{-14}", answer="C — 1/x¹¹"), dict(latex="(3x^{-5})^{2}", answer="D — 9/x¹⁰")]) == [])
ok("ruling 43: a one-operation piece of a larger question is not the question (x² inside x⁻⁵ · xⁿ = x²)",
   _rep(notes=["x²  ‖  x · x", "$x^{-n} = \\frac{1}{x^{n}}$"], boards=[dict(text=["Find the value of $n$:", "$x^{-5}\\cdot x^{n} = x^{2}$"], answer="n = 7")]) == [])
_K = ["$K = \\frac{1}{2}mv^{2}$   with   $m = 60$   and   $v = 10$:", "$\\frac{1}{2}(60)(10)^{2} = 3{,}000$   joules"]
ok("ruling 43: a formula with other values is another problem — given as m = 40, or as a mass and a speed in words",
   _rep(notes=_K, boards=[dict(text=["Evaluate  $\\frac{1}{2}mv^{2}$  when  $m = 40$  and  $v = 3$."], answer="A — 180"),
                          dict(text=["A cyclist has a mass of 70 kilograms and rides at 8 meters per second.", "Kinetic energy is  $K = \\frac{1}{2}mv^{2}$.", "**Find her kinetic energy."], answer="2,240 joules")]) == [])
ok("ruling 43: … and the same formula at the values the notes used is the notes' problem",
   len(_rep(notes=_K, boards=[dict(text=["Evaluate  $\\frac{1}{2}mv^{2}$  when  $m = 60$  and  $v = 10$."], answer="3,000")])) == 1)
_circle = dict(kind="shapes", shapes=[dict(t="circle", c=(0, 0), r=1), dict(t="text", xy=(0, -1.1), s="r = 5 cm")])
_r2 = _rep(notes=["**3.14 × 5² = 3.14 × 25 = 78.5.   But (3.14 × 5)² = 246.49.**"],
           boards=[dict(text=["Find the area. Use 3.14."], fig=_circle, steps=["$A = 3.14 \\times 5^{2} = 3.14 \\times 25 = 78.5$"], answer="78.5 cm²")])
ok("ruling 43: a labelled figure whose working the notes already carried out is refused (Notes II worked 3.14 × 5²; the board was r = 5 cm)",
   len(_r2) == 1 and "working" in _r2[0], str(_r2)[:300])
_r3 = _rep(notes=["An answer written in terms of π is exact:   C = 14.6π in.", "An answer with a number in place of π is approximate:   C ≈ 45.844 in."],
           boards=[dict(text=["A circle has a radius of 7.3 in. Aziyia used C = 2π r with 3.14. Jamal kept π in his answer.", "**Finish both."],
                        answer="45.844 in, 14.6π in, Jamal")])
ok("ruling 43: an answer already written on a notes slide is refused (C ≈ 45.844 in) — and π's own digits are nobody's answer",
   len(_r3) == 1 and "45.844" in _r3[0] and _rep(notes=["Use 3.14 unless the question tells you otherwise."], boards=[dict(text=["What do we use for π?"], answer="3.14")]) == [])
_bulbs = dict(prompt=["A random sample of 600 bulbs was tested. 6 were faulty.", "A shipment holds 4,300 bulbs."],
              worked=[dict(rows=[("\\frac{6}{600} = \\frac{1}{100} = 1\\%", "faulty, out of tested"), ("0.01 \\times 4{,}300 = 43", "the same fraction of the shipment")], answer="About 43 bulbs")])
_r4 = _rep(example=_bulbs, boards=[dict(text=["Same test: 6 faulty in 600. The shipment holds 4,300 bulbs.", "**Predict the number of faulty bulbs in the shipment."], answer="About 43")])
ok("ruling 43: a word problem with an example's numbers and its answer is the example again, whatever the wording",
   len(_r4) == 1 and "Example 1" in _r4[0], str(_r4)[:300])
ok("ruling 43: … and with numbers of its own it is a new problem",
   _rep(example=_bulbs, boards=[dict(text=["A random sample of 280 pens was tested. 14 of them were dry. The order holds 3,400 pens.", "**Predict the number of dry pens."], answer="About 170")]) == [])
ok("ruling 43: one given and its answer together in one notes line is enough (a radius of 5 gives 25π)",
   len(_rep(notes=["In terms of π, a radius of 5 gives 25π. Stop there."], boards=[dict(text=["Find the area in terms of π."], fig=_circle, answer="25π cm²")])) == 1)
ok("ruling 43: the warm-up has been shown too — its answers are revealed before the notes begin",
   len(_rep(warmup=[dict(stem="$12 \\div 3 \\cdot 2$", answer="8")], boards=[dict(text=["$12 \\div 3 \\cdot 2$"], answer="8")])) == 1)
ok("ruling 43: a Your Turn and an independent question are practice as much as a board is",
   len(_rep(example=dict(prompt=["$\\left(\\frac{a^{3}}{4b^{-7}}\\right)^{5}$"]), yt=dict(prompt=["$\\left(\\frac{a^{3}}{4b^{-7}}\\right)^{5}$"], answer_latex="\\frac{a^{15}b^{35}}{1{,}024}"))) == 1
   and len(_rep(notes=["$\\left(\\frac{2}{5}\\right)^{-2} = \\left(\\frac{5}{2}\\right)^{2} = \\frac{25}{4}$"],
                independent=[dict(stem="Find the value.  $\\left(\\frac{2}{5}\\right)^{-2}$", answer="$\\frac{25}{4}$")])) == 1)
_p = _rep(boards=[dict(text=["Which is the value?"], latex="5^{-2}", answer="B — 1/25"), dict(latex="7^{-2}", answer="1/49"),
                  dict(text=["Ellen says the value of  $5^{-2}$  is  −25.", "Explain why she is wrong."], answer="5⁻² = 1/25")])
ok("ruling 43: a board that asks what an earlier board asked is refused — and names the earlier board",
   len(_p) == 1 and "whiteboard 3" in _p[0] and "whiteboard 1" in _p[0], str(_p)[:300])
_q = [dict(text=["A random sample of 50 of the 900 students: 18 ride the bus.", "**Predict how many of the 900 ride the bus."], answer="About 324")]
ok("ruling 43: … and so is a word problem with a Your Turn's numbers and answer",
   len(_rep(yt=dict(prompt=["In a random sample of 50 of a school's 900 students, 18 ride the bus. Predict the number who ride the bus."], answer="About 324"), boards=_q)) == 1)
ok("ruling 43: where the repeat is the point the board says so, and the tag is a field the builders know",
   _rep(notes=["$x^{4}\\cdot x^{-6} = \\frac{1}{x^{2}}$"], boards=[dict(latex="x^{4}\\cdot x^{-6}", answer="C — 1/x²", repeat_ok=True)]) == []
   and "repeat_ok" in lb.WB_FIELDS)
ok("ruling 43: the question banks are the teacher's quiz source, not class work — they are not read",
   _rep(notes=["$x^{4}\\cdot x^{-6} = \\frac{1}{x^{2}}$"], bank=[dict(stem="$x^{4}\\cdot x^{-6}$", answer="$\\frac{1}{x^{2}}$")]) == [])
ok("ruling 43: a teacher's note is not something the class was shown",
   _rep(notes=["Copy the rule."], boards=[dict(latex="9^{-5}\\cdot 9^{3}", answer="1/9²", note="The notes do not work 9⁻⁵ · 9³.")]) == []
   and rc.check_lesson(dict(code="90.01", notes=[dict(numeral="I", head="h", note="9⁻⁵ · 9³ = 9⁻² — say it aloud", items=["Copy the rule."])],
                            whiteboard=[dict(latex="9^{-5}\\cdot 9^{3}", answer="1/9²")])) == [])
planted("a board that asks the warm-up's sum again", lambda M: M["whiteboard"][0].update(text=["Find 9 + 6."], answer="15", check=("eq", "9+6", "15")), "ruling 43")
# ---- ruling 44: the words of a question and its picture agree
from lib import figwords as fw
def _plate(text, labels, **kw):
    fig = dict(kind="shapes", shapes=[dict(t="circle", c=(0, 0), r=2)] + [dict(t="text", xy=(0, -0.2 - i), s=l) for i, l in enumerate(labels)])
    return fw.check(dict(code="90.05", whiteboard=[dict(kind="free", text=text, fig=fig, answer="C = 62.8 cm", **kw)]), "90.05")
_f1 = _plate(["A plate sits on a placemat 30 cm wide.", "**Find the circumference of the plate."], ["20 cm"])
ok("ruling 44: a length in the words that is not on the picture, beside a length on the picture that is not in the words, is refused (the placemat said 30, the plate showed 20)",
   len(_f1) == 1 and "30" in _f1[0] and "20" in _f1[0] and "whiteboard[1]" in _f1[0], str(_f1)[:300])
ok("ruling 44: said in the words and drawn on the picture, both lengths stand — the extra number is still allowed",
   _plate(["A plate 20 cm across sits on a placemat 30 cm wide.", "**Find the circumference of the plate."], ["20 cm", "placemat: 30 cm wide"]) == []
   and _plate(["A plate 20 cm across sits on a placemat 30 cm wide.", "**Find the circumference of the plate."], ["20 cm"]) == [])
ok("ruling 44: an ordinary board is not touched — no length in the words, or the words' length on the picture, or a count that is not a length",
   _plate(["Find the area. Use 3.14."], ["r", "r = 5 cm"]) == []
   and _plate(["A pizza 14 in across is cut into 8 equal slices.", "**Find the area of 3 slices. Use 3.14."], ["14 in across"]) == []
   and _plate(["A 12-inch pizza is cut into 6 equal slices."], ["12 in across"]) == [])
ok("ruling 44: π and thousands do not hide a length (18π in on the picture, a 20 in card in the words)",
   len(_plate(["The disk is cut from a card 20 in wide.", "**Find the radius of the disk."], ["18π in", "?"])) == 1
   and _plate(["A disk with a circumference of $18\\pi$ in is cut from a card 20 in wide."], ["18π in", "?", "card: 20 in wide"]) == []
   and _plate(["A track is 1,200 m around."], ["1,200 m"]) == [])
ok("ruling 44: a number after an equals sign is a result, not a length the words give (Deshawn's = 160 m in an error analysis)",
   _plate(["Deshawn's work:   bottom piece: 16 × 6 = 96    top piece: 16 × 4 = 64", "A = 96 + 64 = 160 m", "Find both mistakes."], ["16 m", "6 m", "7 m", "4 m", "9 m", "10 m"]) == [])
ok("ruling 44: 'in' before a number, an article or a letter is the preposition, not inches ($160 in 4 hours)",
   fw.lengths(["Theo earns \\$160 in 4 hours and e dollars in h hours.", "It fills 12 in a minute and 9 in the hour."]) == set()
   and fw.lengths(["A card 20 in wide and 8 in. tall; a 14 in pizza; a 6 inch nail."]) == {"20", "8", "14", "6"},
   str(fw.lengths(["Theo earns \\$160 in 4 hours and e dollars in h hours.", "A card 20 in wide and 8 in. tall; a 14 in pizza; a 6 inch nail."])))
ok("ruling 44: where the difference is the point the item says so, and the tag is a field the builders know",
   _plate(["A plate sits on a placemat 30 cm wide."], ["20 cm"], figwords_ok=True) == [] and "figwords_ok" in lb.WB_FIELDS)
ok("ruling 44: it reads an example, a notes slide and a test question the same way, and the answer figure too",
   len(fw.check(dict(examples=[dict(prompt=["A fence 40 ft long runs round a pond."], fig=dict(kind="shapes", shapes=[dict(t="text", xy=(0, 0), s="d = 12 ft")]))]), "90.05")) == 1
   and len(fw.check(dict(assessment=dict(sections=[dict(items=[dict(stem="A table is 6 ft across.", parts=[dict(label="a", stem="Find its area.")],
                                                                    fig=dict(kind="shapes", shapes=[dict(t="text", xy=(0, 0), s="8 ft")]))])])), "U90")) == 1
   and len(fw.check(dict(whiteboard=[dict(text=["A rug 6 ft across."], fig=dict(kind="shapes", shapes=[dict(t="text", xy=(0, 0), s="6 ft")]),
                                          fig_a=dict(kind="shapes", shapes=[dict(t="text", xy=(0, 0), s="9 ft")]))]), "90.05")) == 1)
planted("a board whose words give a length its picture does not show",
        lambda M: M["whiteboard"][0].update(text=["A plate sits on a placemat 30 cm wide.", "**Find the circumference of the plate."],
                                            fig=dict(kind="shapes", fs=22, pt=18, **{"in": 2.0}, shapes=[dict(t="circle", c=(0, 0), r=2), dict(t="text", xy=(0, -0.2), s="20 cm")])), "ruling 44")
# ---- START HERE: a woven thread day has a date, like any lesson
from lib import packkit as _pk
import datetime as _dt
with tempfile.TemporaryDirectory() as tmp:
    os.makedirs(os.path.join(tmp, "assets", "windmill"))
    _days = {"2026-09-30": {"kind": "lesson", "code": "3.06+07", "unit": 3}, "2026-10-05": {"kind": "thread", "code": "T-A1", "unit": 3},
             "2026-10-06": {"kind": "thread", "code": "T-A2", "unit": 3}, "2026-10-07": {"kind": "lesson", "code": "3.08", "unit": 3},
             "2026-10-08": {"kind": "off", "code": "off", "unit": 3}, "2026-10-15": {"kind": "exam", "code": "3.X1", "unit": 3}, "2026-10-19": {"kind": "lesson", "code": "4.01", "unit": 4}}
    with open(os.path.join(tmp, "assets", "windmill", "spine.js"), "w", encoding="utf-8") as fh:
        fh.write("window.SPINE = " + json.dumps({"generatedAt": "2026-10-07T00:00:00+00:00", "days": {k: {C.COURSE_KEY: v} for k, v in _days.items()}}) + ";")
    _cal = _pk.calendar(3, tmp)
    ok("START HERE: a woven thread day (T-A1) is dated like any lesson — both of A7 Unit 3's printed a dash in 'Unit at a glance'",
       _cal[0] == {"3.06": _dt.date(2026, 9, 30), "T-A1": _dt.date(2026, 10, 5), "T-A2": _dt.date(2026, 10, 6), "3.08": _dt.date(2026, 10, 7)}
       and _cal[2] == [_dt.date(2026, 10, 15)])
    _calm = _pk.calendar(3, tmp, merged=True)
    ok("START HERE: with merged=True a merged day dates each lesson it holds (M7 9.06+07, ruling 50: a unit built before the merge)",
       _calm[0] == dict(_cal[0], **{"3.07": _dt.date(2026, 9, 30)}))
# ---- ruling 18: two transfer items, or one where the teacher cut one and the paper says so
from lib import unitbuild as _ub18
ok("ruling 18: a paper needs exactly two transfer items — or one, when transfer_cut says who cut the other, when and why, and the key then says so",
   _ub18.transfer_needed({}) == 2 and _ub18.transfer_needed({"transfer_cut": "  "}) == 2
   and _ub18.transfer_needed({"transfer_cut": "Croix, 7 Oct 2026: it needed a step the unit did not teach."}) == 1
   and "questions 10 and 21" in _ub18.transfer_line({}, [10, 21])
   and "question 10." in _ub18.transfer_line({"transfer_cut": "Croix, 7 Oct 2026: cut."}, [10])
   and "Croix, 7 Oct 2026: cut." in _ub18.transfer_line({"transfer_cut": "Croix, 7 Oct 2026: cut."}, [10])
   and _ub18.transfer_needed({"transfer_cut": ["one cut.", "the other cut."]}) == 0 and _ub18.transfer_needed({"transfer_cut": ["one cut.", ""]}) == 1
   and "none on this paper" in _ub18.transfer_line({"transfer_cut": ["one cut.", "the other cut."]}, [])
   and "(2) the other cut." in _ub18.transfer_line({"transfer_cut": ["one cut.", "the other cut."]}, []))
# ---- ruling 49: a unit built as the practice test alone (the unit test is a random set of the practice page)
_sec49 = lambda ans, chk: [dict(title="Area", benchmark="MA.7.GR.1.1", points=1, items=[dict(stem="Find $3 \\times 4$.", answer=ans, check=chk, space=0.5)])]
_P49 = {"forms": {"practice": _sec49("$12$", ("val", "3*4", "12"))}}
_T49 = {"forms": {"practice": [dict(title="Area", benchmark="MA.7.GR.1.1", points=1, items=[dict(stem="Find $3 \\times 4$.", answer="$12$", check=("val", "3*4", "12"), space=0.5, transfer=True)])]}}
_AB49 = {"forms": {"A": _sec49("$12$", ("val", "3*4", "12")), "B": _sec49("$12$", ("val", "3*4", "12"))}}
ok("ruling 49: the practice test alone is a complete assessment — no parallel form, no transfer item, no shared-answer check against itself",
   _ub18.practice_only(_P49) and not _ub18.practice_only(_AB49) and not _ub18.practice_only({"sections": [], "practice": []})
   and _ub18.check_forms(_P49) == [] and _ub18.check_distinct(_P49) == []
   and any("ruling 49" in x and "transfer" in x for x in _ub18.check_forms(_T49))
   and any("ruling 18" in x for x in _ub18.check_forms(_AB49)) and any("ruling 33" in x for x in _ub18.check_distinct(_AB49)))
# ---- ruling 44's look-through: every picture of a unit drawn beside its words
import figure_sheets as _fsh
from lib import figkit as _fk44, mathimg as _mi44
with tempfile.TemporaryDirectory() as tmp:
    os.makedirs(os.path.join(tmp, "u90"))
    with open(os.path.join(tmp, "u90", "l01.py"), "w", encoding="utf-8") as fh:
        fh.write('L = dict(code="90.01", whiteboard=[\n'
                 '    dict(kind="free", text=["A plate 20 cm across sits on a placemat 30 cm wide.", "**Find the circumference of the plate."],\n'
                 '         steps=["$C = 3.14 \\\\times 20$"], answer="C = 62.8 cm", unneeded="30 cm",\n'
                 '         fig=dict(kind="shapes", fs=22, pt=18, **{"in": 2.0}, shapes=[dict(t="circle", c=(0, 0), r=2), dict(t="text", xy=(0, -0.3), s="20 cm", va="top")])),\n'
                 '    dict(kind="free", text=["No picture here."], answer="7")])\n')
    _keep = (_fk44.FIGS, _fk44.INDEX, _mi44.FIGS, _mi44.INDEX)
    try:
        _rc = _fsh.main(["u90", "--build", tmp, "--out", os.path.join(tmp, "out"), "--grid", "2"])
    finally:
        _fk44.FIGS, _fk44.INDEX, _mi44.FIGS, _mi44.INDEX = _keep
    _items = open(os.path.join(tmp, "out", "items.txt"), encoding="utf-8").read()
    ok("look-through: figure_sheets draws every item that has a picture, once, with its words, steps, answer and extra number beside it — and a contact sheet",
       _rc == 0 and os.path.exists(os.path.join(tmp, "out", "001.png")) and not os.path.exists(os.path.join(tmp, "out", "002.png"))
       and os.path.exists(os.path.join(tmp, "out", "sheet_01.png"))
       and "A plate 20 cm across" in _items and "62.8" in _items and "30 cm" in _items and "No picture here" not in _items
       and _fsh.main([]) == 2)
ok("figures: an Example with a figure starts higher only when its lines and its figure need the room",
   lb._example_top(["One line."], None) == 2.3 and lb._example_top(["One line.", "Two."], None) == 1.9
   and lb._example_top(["One line."], dict(_roof((7, 0), va="top", off=(0, -0.3)), reserve=0.7)) == 1.9
   and lb.TOP <= lb._example_top(["A line of the problem."] * 4, dict(kind="shapes", fs=22, pt=18, reserve=0.9, **{"in": 3.4}, shapes=[
       dict(t="poly", pts=[(0, 0), (10, 0), (10, 10), (0, 10)])])) < 1.9)

# ---- the IXL slide (A7 6.T1, 25 Oct 2026): a skill name that wraps is given the rows it wraps to — a fixed 0.36-in row printed
# the second line of a long IXL title over the next skill, and checks.py's overlap found it on the built deck
_ixl = ["Identify complementary, supplementary, vertical, adjacent, and congruent angles (HGV)",
        "Find measures of complementary, supplementary, vertical, and adjacent angles (R2B)", "Area of circles (ZC6)"]
_DI = Deck(C.COURSE, 90, "Lesson 1", "T", "foot"); _DI.ixl(_ixl)
_rows = sorted((sh.top / 914400, sh.height / 914400, sh.text_frame.text) for sh in _DI.s.shapes
               if sh.has_text_frame and any(sh.text_frame.text.strip() == x for x in _ixl))
ok("IXL: a skill name that wraps is given two rows", len(_rows) == 3 and _rows[0][1] >= 0.72 - 1e-3 and _rows[1][1] >= 0.72 - 1e-3, str(_rows))
ok("IXL: a name that fits keeps its one 0.36-in row, and each skill starts where the one above it ends",
   len(_rows) == 3 and abs(_rows[2][1] - 0.36) < 1e-3 and all(abs(a[0] + a[1] - b[0]) < 1e-3 for a, b in zip(_rows, _rows[1:])), str(_rows))

# ---- the test's length (ruling 27: one paper over two periods; ruling 51, 23 Oct 2026: every A7 test is one period). A7's
# Unit 4 and Unit 5 papers still printed "two class periods" and the line telling a class to continue the next day (25 Oct)
from lib import unitbuild as _ub51
with tempfile.TemporaryDirectory() as tmp:
    os.makedirs(os.path.join(tmp, "assets", "windmill"))
    _d51 = {"2026-10-26": {"kind": "exam", "code": "4.X", "unit": 4}, "2026-11-19": {"kind": "exam", "code": "10.X", "unit": 10},
            "2026-11-20": {"kind": "exam", "code": "10.X", "unit": 10}, "2026-11-18": {"kind": "lesson", "code": "10.09", "unit": 10}}
    with open(os.path.join(tmp, "assets", "windmill", "spine.js"), "w", encoding="utf-8") as fh:
        fh.write("window.SPINE = " + json.dumps({"generatedAt": "2026-10-25T00:00:00+00:00", "days": {k: {C.COURSE_KEY: v} for k, v in _d51.items()}}) + ";")
    ok("the test's length: the plan's test days decide (one day, one period; two days, two), and a unit the plan gives no test day takes the course's EXAM_PERIODS",
       _ub51.exam_periods({"unit": 4}, tmp) == 1 and _ub51.exam_periods({"unit": 10}, tmp) == 2 and _ub51.exam_periods({"unit": 7}, tmp) == C.EXAM_PERIODS)
_s51 = lambda: [dict(title="Area", benchmark="MA.7.GR.1.1", points=1, items=[dict(stem="Find $3 \\times 4$.", answer="$12$", check=("val", "3*4", "12"), space=0.5)])]
_U51 = {"unit": 90, "title": "Area and Circles", "assessment": {"forms": {"A": _s51(), "B": _s51()}, "total": 1,
        "tracker": {"MA.7.GR.1.1": 1}, "tracker_order": ["MA.7.GR.1.1"]}}
def _doc_text(p):
    with zipfile.ZipFile(p) as z:
        return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", z.read("word/document.xml").decode("utf-8")))
with tempfile.TemporaryDirectory() as tmp:
    _t51 = _doc_text(_ub51.build_form(_U51, tmp, key=False, form="A"))
    _k51 = _doc_text(_ub51.build_form(_U51, tmp, key=True, form="A"))
_two = C.EXAM_PERIODS == 2      # the kit's own test folder has no plan, so the profile's EXAM_PERIODS decides here
ok("the test's length on the paper and its key: 'two class periods' and the continue-tomorrow line only when the test runs two periods; a one-period paper says nothing about its length",
   all(("two class periods" in t) == _two and "one class period" not in t and "one period" not in t and ("Stop working when the first class period ends" in t) == _two for t in (_t51, _k51)),
   _t51[:240])

# ---- ruling 54 (25 Oct 2026, of a printed test whose section "1." sat over question "1."): a section is named, never
# numbered, on a page with numbered questions; a lesson is called by its code
ok("ruling 54: the paper's and the key's sections are named, not 'Part 1.' (question 1 sits under the first)",
   all(" Area " in t and not re.search(r"\bPart\s+\d+\s*\.", t) for t in (_t51, _k51)), _t51[:240])
_U54 = {"unit": 90, "title": "Area and Circles", "review": [dict(letter="A", title="The Triangle Inequality", lessons="Lessons 1–2",
        benchmark="MA.8.GR.1.3", items=[dict(stem="Is 3, 4, 5 a triangle?", answer="yes", space=0.5)])],
        "review_note": "This review covers Lessons 1–8 and Thread B, days 1–2."}
with tempfile.TemporaryDirectory() as tmp:
    _r54 = _doc_text(_ub51.build_review(_U54, tmp, key=False))
ok("ruling 54: the review's sections are named, not 'PART A.', and its lessons are their codes (Lessons 90.01–90.02), a thread's days as written",
   "PART A" not in _r54 and "The Triangle Inequality" in _r54 and "Lessons 90.01–90.02" in _r54 and "Lessons 90.01–90.08" in _r54
   and "Thread B, days 1–2" in _r54 and not re.search(r"Lessons? \d\b", _r54), _r54[:300])

# the single paper (a unit with no forms — A7 Unit 3's kind) under the same ruling: its sections named, its tracker's line by
# section name, not "Section 1"
_U54p = {"unit": 90, "title": "Area and Circles", "assessment": {"sections": _s51(), "total": 1, "tracker": {"MA.7.GR.1.1": 1},
         "tracker_order": ["MA.7.GR.1.1"], "transfer_cut": ["A transfer item cut for the test.", "Another, for the test."],
         "follow_through": "A later part earns its point when the right operation is applied to the student's own earlier answer."}}
with tempfile.TemporaryDirectory() as tmp:
    _p54 = _doc_text(_ub51.build_paper(_U54p, tmp, key=False))
    _pk54 = _doc_text(_ub51.build_paper(_U54p, tmp, key=True))
ok("ruling 54 on the single paper: its sections are named, never '1.', and the key's tracker line names them, not 'Section 1'",
   all(" Area " in t and not re.search(r"(?<![\d.])1\.\s+Area", t) for t in (_p54, _pk54)) and "Section 1" not in _pk54 and "Area — 1" in _pk54, _pk54[:300])

# ---- the Score Tracker stays whole (A7 Unit 6's second review, 25 Oct 2026: the practice test key printed the tracker's
# heading and first row at the foot of a page and the rest on the next): every row but the last keeps with the next
def _tracker_keeps(p):
    with zipfile.ZipFile(p) as z:
        x = z.read("word/document.xml").decode("utf-8")
    tbl = x[x.index("Score Tracker"):]
    tbl = tbl[tbl.index("<w:tbl>"):tbl.index("</w:tbl>")]
    rows = re.findall(r"<w:tr[ >].*?</w:tr>", tbl, flags=re.S)
    return len(rows) >= 3 and all("<w:keepNext/>" in r for r in rows[:-1])
with tempfile.TemporaryDirectory() as tmp:
    _kt = _tracker_keeps(_ub51.build_form(_U51, tmp, key=True, form="A"))
    _kp = _tracker_keeps(_ub51.build_paper(_U54p, tmp, key=True))
ok("the Score Tracker stays whole: on a form's key and on the single paper's key every row but the last keeps with the next",
   _kt and _kp, (_kt, _kp))

# ---- ruling 46 for figures (25 Oct 2026): a Lexend paper letters its figures in Lexend, the slide's face; a page in the
# body face keeps STIX. The papers' figures were lettered in STIX beside Lexend text and Lexend mathematics.
from lib import dockit as _dk46, figkit as _fk46
_faces46, _draw46 = [], _fk46.draw
def _spy46(spec, target_in=None):
    _faces46.append(spec.get("face")); return _draw46(spec, target_in)
_fk46.draw = _spy46
try:
    _fig46 = dict(kind="shapes", fs=14, pt=10, **{"in": 1.8}, shapes=[dict(t="poly", pts=[(0, 0), (4, 0), (0, 3)]),
              dict(t="text", xy=(2, -0.4), s="4 cm", va="top")])
    _first46 = []
    for _font46 in ("Lexend", None):
        del _faces46[:]
        _dk46.Doc("E", "T", "S", font=_font46).question("Find the area.", fig=_fig46)
        _first46.append(_faces46[0] if _faces46 else "nothing drawn")     # the call the page made (a two-pass kind draws again inside)
finally:
    _fk46.draw = _draw46
ok("ruling 46: a figure on a Lexend paper is drawn in the slide's Lexend face; on a page in the body face, in STIX",
   _first46 == ["slide", None], str(_first46))

# ---- a figure wherever a question is (15 Nov 2026): a Your Turn (fig, and fig_a for its answer slide), a worked slide, a
# warm-up question and the six-question set carry one, in the PowerPoint and the HTML deck, and every check that reads a
# board's figure reads these too
import hashlib as _hl
def _box(label, w=10, h=6, **kw):
    return dict(kind="shapes", fs=22, pt=18, **{"in": kw.pop("inches", 3.2)}, shapes=[dict(t="poly", pts=[(0, 0), (w, 0), (w, h), (0, h)]),
                dict(t="text", xy=(w / 2, 0), s=label, va="top", off=(0, -0.3))], **kw)
F_ = copy.deepcopy(S_)
F_["warmup"] = [dict(F_["warmup"][0], stem="Find the area of the rectangle in picture 1.", answer="60 m²", fig=_box("10 m")),
                dict(stem="7 + 8", answer="15", check=("eq", "7+8", "15"))]
F_["examples"] = copy.deepcopy(F_["examples"])
F_["examples"][0]["worked"][0]["fig"] = _box("3 m", 9, 3)
F_["examples"][0]["your_turn"].update(prompt=["A rope 8 m long is cut in half.", "How long is each piece?"], fig=_box("8 m", 8, 2),
                                      fig_a=_box("8 m", 8, 2.5), steps=["$8 \\div 2 = 4$"])
F_.pop("no_set", None)
F_["independent"] = [dict(stem=f"{k} + 30", answer=str(k + 30), check=("eq", f"{k}+30", str(k + 30))) for k in range(6)]
F_["independent"][1].update(stem="Find the perimeter of the rectangle beside question 2.", answer="40 cm", fig=_box("12 cm", 12, 8))
def _shapes_of(pptx):
    from pptx import Presentation
    figs = {_hl.sha1(open(p, "rb").read()).hexdigest() for p in glob.glob(os.path.join(figkit.FIGS, "*.png"))}
    out = []
    for sl in Presentation(pptx).slides:
        pics, others = [], []
        for sh in sl.shapes:
            r = (sh.left / 914400, sh.top / 914400, (sh.left + sh.width) / 914400, (sh.top + sh.height) / 914400)
            if sh.shape_type == 13 and _hl.sha1(sh.image.blob).hexdigest() in figs:
                pics.append((r, _hl.sha1(sh.image.blob).hexdigest()))
            elif sh.has_text_frame and sh.text_frame.text.strip() or sh.shape_type == 13:
                if r[1] < 6.7:                     # the footer's words sit under the rule
                    others.append((r, sh.text_frame.text if sh.has_text_frame else "math"))
        out.append((pics, others, " ".join(sh.text_frame.text for sh in sl.shapes if sh.has_text_frame)))
    return out
def _hits(pics, others):
    return [(t, r) for (p, _) in pics for (r, t) in others
            if min(p[2], r[2]) - max(p[0], r[0]) > 0.02 and min(p[3], r[3]) - max(p[1], r[1]) > 0.02]
import glob
with tempfile.TemporaryDirectory() as tmp:
    PF = Deck(C.COURSE, 90, "Lesson 1", "T", "foot"); lb._fill_deck(PF, F_)
    pf = os.path.join(tmp, "f.pptx"); PF.save(pf, sidecar=False)
    _sl = _shapes_of(pf)
    HF = HtmlDeck(C.COURSE, 90, "Lesson 1", "T", "foot"); lb._fill_deck(HF, F_)
    hf = render_page(HF)
_kinds = [x["kind"] + ":" + (x["sub"] or "") for x in PF.side]
def _at(pred):
    return [i for i, x in enumerate(PF.side) if pred(x)]
_wu = _at(lambda x: x["kind"] == "warmup"); _wk = _at(lambda x: x["sub"] == "A worked label.")
_yt = _at(lambda x: x["kind"] == "yourturn")[:2]; _set = _at(lambda x: x["kind"] in ("set", "independent"))
ok("figures: a warm-up question's figure is on the question slide and the answer slide, under the questions",
   all(len(_sl[i][0]) == 1 for i in _wu) and all("1." in _sl[i][2] for i in _wu), str([len(_sl[i][0]) for i in _wu]))
ok("figures: a worked slide carries its own figure, with its working beside it", len(_wk) == 1 and len(_sl[_wk[0]][0]) == 1
   and _sl[_wk[0]][0][0][0][2] <= min(r[0] for r, t in _sl[_wk[0]][1] if t == "math" and r[1] > 1.9) + 0.02, str(_sl[_wk[0]][:2]))
ok("figures: a Your Turn shows its figure on the question slide and fig_a on its answer slide",
   len(_sl[_yt[0]][0]) == 1 and len(_sl[_yt[1]][0]) == 1 and _sl[_yt[0]][0][0][1] != _sl[_yt[1]][0][0][1])
ok("figures: the six-question set carries a question's figure beside the six, under its number",
   len(_set) == 1 and len(_sl[_set[0]][0]) == 1 and _sl[_set[0]][0][0][0][0] > 7.0 and "2." in _sl[_set[0]][2])
ok("figures: on none of those slides does a figure sit on the words", not [h for i in _wu + _wk + _yt + _set for h in _hits(*_sl[i][:2])],
   str([h for i in _wu + _wk + _yt + _set for h in _hits(*_sl[i][:2])][:3]))
ok("figures: the HTML deck carries them too (two warm-up, worked, two Your Turn, the set: seven pictures beyond the board-free deck's)",
   hf.count('<div class="figrow">') == 2 and hf.count('<div class="setfig">') == 1 and hf.count("figsteps") >= 3, f"{hf.count('figrow')} {hf.count('setfig')} {hf.count('figsteps')}")
# the set with a figure on every question (A7 11.07's six grids): two columns of figures; and six that cannot hold their
# figures beside them are refused where the slide is the set, and set without them where the set is also printed
_F6 = copy.deepcopy(F_)
for _k, _q in enumerate(_F6["independent"]):
    _q["fig"] = _box(f"{_k + 4} cm", _k + 4, 3)
with tempfile.TemporaryDirectory() as tmp:
    _D6 = Deck(C.COURSE, 90, "Lesson 1", "T", "foot"); lb._fill_deck(_D6, _F6)
    _p6 = os.path.join(tmp, "s.pptx"); _D6.save(_p6, sidecar=False)
    _s6 = _shapes_of(_p6)[[i for i, x in enumerate(_D6.side) if x["kind"] in ("set", "independent")][0]]
ok("figures: six questions with six figures — the figures in two columns beside the six, nothing on the words",
   len(_s6[0]) == 6 and _hits(*_s6[:2]) == [] and len({round(r[0], 1) for (r, _) in _s6[0]}) == 2, str([r for r, _ in _s6[0]]))
_F7 = copy.deepcopy(_F6)
for _q in _F7["independent"]:
    _q["stem"] = "Find $x$: " + "a question with a great many words in it, " * 3 + "and one more."
def _set7():
    try:
        _D7 = Deck(C.COURSE, 90, "Lesson 1", "T", "foot"); lb._fill_deck(_D7, _F7)
        _i = [i for i, x in enumerate(_D7.side) if x["kind"] in ("set", "independent")][0]
        return "built"
    except RuntimeError as e:
        return str(e)
_r7 = _set7()
ok("figures: six that cannot hold their figures are set without them where the set is printed, and refused where the slide is the set",
   (_r7 == "built") if C.SET == "handout" else ("do not fit one slide" in _r7), _r7[:120])
_F8 = copy.deepcopy(F_)
_F8["independent"][1]["fig"] = dict(_F8["independent"][1]["fig"], pt=9.5)
def _set8():
    try:
        _D8 = Deck(C.COURSE, 90, "Lesson 1", "T", "foot"); lb._fill_deck(_D8, _F8); return "built"
    except RuntimeError as e:
        return str(e)
_r8 = _set8()
ok("figures: a set figure lettered for the page (under 11.5 pt) is not put on the slide — kept to the printed set, or refused where the slide is the set",
   (_r8 == "built") if C.SET == "handout" else ("do not fit one slide" in _r8), _r8[:120])
# the checks that read a board's figure read these too
def _f44(**kw):
    M = copy.deepcopy(F_); M.update(kw); return [x for x in gates(slotmark.strip_deep(M)) if "ruling 44" in x]
ok("figures: ruling 44 passes the lesson with figures in all four new places", _f44() == [], str(_f44()[:2]))
planted("a Your Turn whose words give a length its picture does not show (ruling 44)",
        lambda M: M.update(examples=[dict(F_["examples"][0], your_turn=dict(F_["examples"][0]["your_turn"], prompt=["A rope sits on a mat 30 m wide.", "How long is each piece?"])), F_["examples"][1]],
                           warmup=F_["warmup"], independent=F_["independent"]), "ruling 44")
_F2 = copy.deepcopy(F_); _F2["independent"][1]["stem"] = "A card 30 cm wide holds the rectangle. Find its perimeter."
ok("planted: a set question whose words give a length its picture does not show (ruling 44)", any("independent[2]" in x for x in [y for y in gates(slotmark.strip_deep(_F2)) if "ruling 44" in y]))
_F3 = copy.deepcopy(F_); _F3["warmup"][0]["stem"] = "A mat 40 m wide holds the rectangle in picture 1."
ok("planted: a warm-up question whose words give a length its picture does not show (ruling 44)", any("warmup[1]" in x for x in [y for y in gates(slotmark.strip_deep(_F3)) if "ruling 44" in y]))
_F4 = copy.deepcopy(F_); _F4["examples"][0]["prompt"] = ["A rope sits on a mat 50 m wide.", "How long is each piece?"]; _F4["examples"][0].pop("fig", None); _F4["examples"][0]["worked"][0]["fig"] = _box("7 m", 7, 3)
ok("planted: a worked slide's figure against its Example's words (ruling 44)", any("worked[1]" in x for x in [y for y in gates(slotmark.strip_deep(_F4)) if "ruling 44" in y]))
_sh = {w for w, *_ in rc.shown(F_)}
ok("figures: ruling 43 counts a worked slide's figure and a warm-up figure as shown, and a set question's figure as what it gives",
   any("3 m" in " ".join(lines) for _, _, _, _, lines in rc.shown(F_)) and any("10 m" in " ".join(lines) for _, _, _, _, lines in rc.shown(F_))
   and "12" in [p for p in rc.practice(F_) if p["label"] == "independent question 2"][0]["given"])

# ---- a multiple-choice board with a figure (15 Nov 2026): stacked, the four options took 1.75 in and left the figure 1 to 1.6 in
# tall; beside the figure, the options in a column, whenever that makes the figure taller
_tall3 = dict(kind="shapes", fs=22, pt=18, **{"in": 4.2}, shapes=[dict(t="poly", pts=[(0, 0), (8, 0), (8, 8), (0, 8)]),
              dict(t="text", xy=(4, 0), s="8 cm", va="top", off=(0, -0.3))])
_wide3 = dict(kind="shapes", fs=22, pt=18, **{"in": 4.2}, shapes=[dict(t="poly", pts=[(0, 0), (40, 0), (40, 3), (0, 3)]),
              dict(t="text", xy=(20, 0), s="40 cm", va="top", off=(0, -0.3))])
def _mc3(fig):
    M = copy.deepcopy(S_); M["whiteboard"] = copy.deepcopy(M["whiteboard"])
    M["whiteboard"][6] = mc(7, 2, text=["The square is cut from a card.", "**What is its perimeter?"], fig=fig)
    return M
def _mc3_slides(M):
    with tempfile.TemporaryDirectory() as tmp:
        D3 = Deck(C.COURSE, 90, "Lesson 1", "T", "foot"); lb._fill_deck(D3, M)
        p3 = os.path.join(tmp, "m.pptx"); D3.save(p3, sidecar=False)
        sl = _shapes_of(p3)
    i = [k for k, x in enumerate(D3.side) if x["title"].endswith("Question 7 of 9")]
    return [sl[k] for k in i]
_q3, _a3 = _mc3_slides(_mc3(_tall3))
_figh = lambda sl: sl[0][0][0][3] - sl[0][0][0][1]
_optx = lambda sl: [r[0] for r, t in sl[1] if re.match(r"^[A-D]\.", t.strip())]
ok("choices beside: a tall figure on a choice board is set beside its options, and is taller than stacking leaves it (about 3 in)",
   _figh(_q3) >= 2.6 and _optx(_q3) and min(_optx(_q3)) > _q3[0][0][0][2], f"{_figh(_q3):.2f} in; options at {_optx(_q3)}")
ok("choices beside: the question slide and the answer slide lay the figure out alike, the options too",
   _q3[0][0][0] == _a3[0][0][0] and sorted(_optx(_q3)) == sorted(_optx(_a3)))
ok("choices beside: nothing sits on the figure, on either slide", _hits(*_q3[:2]) == [] and _hits(*_a3[:2]) == [], str(_hits(*_q3[:2])[:2]))
_q3w, _ = _mc3_slides(_mc3(_wide3))
ok("choices beside: a wide, short figure, which stacking serves better, stays stacked over its options",
   _optx(_q3w) and min(_optx(_q3w)) < _q3w[0][0][0][2] and min(r[1] for r, t in _q3w[1] if re.match(r"^[A-D]\.", t.strip())) > _q3w[0][0][0][3] - 0.02)
# a board whose figure stacking cannot draw at all (stacked, its label would sit on a side unless the whole picture
# were made smaller than 11.5-pt labels, and the fit refuses): measuring the stacked layout must not stop the build —
# beside is the only layout (A7 11.07, 15 Nov 2026: a graph on a choice board; the build stopped at "a figure has 0.82 in")
_crowd3 = dict(kind="shapes", fs=22, pt=18, **{"in": 4.2}, shapes=[dict(t="poly", pts=[(0, 0), (8, 0), (8, 8), (0, 8)]),
               dict(t="seg", a=(0, 0), b=(8, 8)), dict(t="text", xy=(6.6, 2.0), s="8 cm")])
try:
    _q3c, _a3c = _mc3_slides(_mc3(_crowd3)); _e3c = ""
except RuntimeError as e:
    _q3c = _a3c = None; _e3c = str(e)
ok("choices beside: a figure that stacking cannot draw at all (its labels under 11.5 pt) is laid out beside its options, not refused",
   _q3c is not None and _figh(_q3c) >= 2.0 and _optx(_q3c) and min(_optx(_q3c)) > _q3c[0][0][0][2],
   _e3c[:120] or (f"{_figh(_q3c):.2f} in" if _q3c else ""))
with tempfile.TemporaryDirectory() as tmp:
    _H3 = HtmlDeck(C.COURSE, 90, "Lesson 1", "T", "foot"); lb._fill_deck(_H3, _mc3(_tall3)); _h3 = render_page(_H3)
    _H3w = HtmlDeck(C.COURSE, 90, "Lesson 1", "T", "foot"); lb._fill_deck(_H3w, _mc3(_wide3)); _h3w = render_page(_H3w)
ok("choices beside: the HTML deck makes the PowerPoint's choice", _h3.count('<div class="figchoices">') == 2 and _h3w.count('<div class="figchoices">') == 0)

# ---- a key's own figure (15 Nov 2026): the key of "graph both lines on this grid" printed the empty grid. `fig_key` on a paper
# question is what the key prints; the page prints `fig`; keycheck lets a key's figures differ from its page's there and only there
import checks as _ck
_ck._figure_library = lambda: {_hl.sha256(open(p, "rb").read()).hexdigest(): os.path.basename(p) for p in glob.glob(os.path.join(figkit.FIGS, "*.png"))}
_K2 = copy.deepcopy(L)
_K2["bank"] = [dict(stem="Draw the rectangle 12 cm long on the grid.", answer="see the key", check=("eq", "1", "1"), fig=_box("12 cm", 12, 8),
                    fig_key=_box("12 cm", 12, 5)),
               dict(stem="Find its perimeter.", answer="40 cm", check=("eq", "2*12+2*8", "40"), fig=_box("12 cm", 12, 8))]
with tempfile.TemporaryDirectory() as tmp:
    _pg = lb.build_bank(_K2, _K2["bank"], "Question Bank", False, tmp)
    _ky = lb.build_bank(_K2, _K2["bank"], "Question Bank", True, tmp)
    _lib2 = _ck._figure_library()
    _fp, _fk = _ck._doc_figures(_pg, _lib2), _ck._doc_figures(_ky, _lib2)
    _clean2 = [x for x in _ck.check_keycheck([_pg, _ky]) if "figure" in x]
    _K3 = copy.deepcopy(_K2); _K3["bank"][1]["fig"] = _box("13 cm", 13, 8)        # a key built from a different figure, unmarked
    _ky3 = lb.build_bank(_K3, _K3["bank"], "Question Bank", True, tmp)
    _bad2 = [x for x in _ck.check_keycheck([_pg, _ky3]) if "figure" in x]
ok("fig_key: the page prints the figure, the key prints the key's own figure, marked, and the other figure as the page does",
   len(_fp) == 2 and len(_fk) == 2 and _fp[0][0] != _fk[0][0] and _fk[0][1] == "fig_key" and _fp[1] == _fk[1] and _fp[0][1] == "", f"{_fp} {_fk}")
ok("fig_key: keycheck lets a key's figure differ from its page's where the spec gave fig_key", _clean2 == [], str(_clean2))
ok("planted: a key figure that differs from its page's with no fig_key is caught", any("figure 2 of" in x for x in _bad2), str(_bad2))
ok("fig_key: ruling 44 and units read a key's own figure too",
   any("key figure" in x for x in fw.check(dict(bank=[dict(stem="A mat 30 cm wide.", fig=_box("30 cm"), fig_key=_box("9 cm"))]), "90.01"))
   and figkit.units_disagree(dict(bank=[dict(stem="Draw it.", answer="12 in", fig=_box("12 in"), fig_key=_box("12 cm"))])) != [])

# ---- shuffle_choices.py (15 Nov 2026): a path or `uN lNN.py`; a select-all's answer line rewritten with its options; a letter in
# free prose it cannot rewrite printed for the author; and the gate refuses a select-all whose answer line is not its key
import shuffle_choices as _sc, random as _rnd
from lib import unitload as _ul
_SA = ('L = dict(code="90.01", bank=[\n'
       '    dict(stem="Which are equal to 3/4?", choices=["6/8", "9/12", "3/5", "0.75", "4/3"], correct=[0, 1, 3],\n'
       '         answer="A, B and D — each is 3/4", why="A and B are fractions; E is upside down.", check=("eq", "1", "1"),\n'
       '         errors={"C": "x [N]", "E": "y [N]"}),\n'
       '    dict(stem="Pick one.", choices=["1", "2", "3", "4"], correct=0, answer="A — 1", note="Reveal A.", check=("eq", "1", "1"),\n'
       '         errors={"B": "x [N]", "C": "x [N]", "D": "x [N]"})])\n')
with tempfile.TemporaryDirectory() as tmp:
    os.makedirs(os.path.join(tmp, "u90"))
    _p7 = os.path.join(tmp, "u90", "l01.py")
    outs = []
    for how in ([_p7], [os.path.join(tmp, "u90"), "l01.py"]):
        open(_p7, "w").write(_SA)
        _todo = _sc.targets(how)
        _rep, _hand = [], []
        for _u, _f in _todo:
            _sc.process(_f, _rnd.Random(f"{_u}/{os.path.basename(_f)}/2026-10-03"), _rep, False, _hand)
        outs.append((open(_p7).read(), _todo, _hand))
    _M7 = _ul.load(_p7).L
_it7 = _M7["bank"][0]
_keyed7 = [chr(65 + c) for c in sorted(_it7["correct"])]
ok("shuffle: a path and `uN lNN.py` name the same file and give the same spread", outs[0][0] == outs[1][0] and outs[0][1][0][0] == outs[1][1][0][0] == "u90", str([o[1] for o in outs]))
ok("shuffle: a select-all's answer line is rewritten to its new keyed letters, in its own form",
   _sc.answer_letters(_it7["answer"])[0] == _keyed7 and " and " in _it7["answer"] and _it7["answer"].endswith("— each is 3/4")
   and not [x for x in lb.distractorcheck_lesson(dict(code="90.01", bank=_M7["bank"])) if "answer line" in x], _it7["answer"])
ok("shuffle: a letter in free prose it cannot rewrite is printed for the author, with its item and its line",
   any("why: a standalone" in h and "Which are equal" in h for h in outs[0][2]), str(outs[0][2]))
ok("shuffle: the letter lists a spec writes are all read", [_sc.answer_letters(a)[0] for a in ("A, C and D", "A, C, and D — x", "B, D", "A and E: y", "C.", "A rectangle")]
   == [["A", "C", "D"], ["A", "C", "D"], ["B", "D"], ["A", "E"], ["C"], None])
planted("a select-all whose answer line is not its key",
        lambda M: M["bank"].append(dict(stem="Which are even?", choices=["2", "3", "4", "5"], correct=[0, 2], answer="A and D",
                                        check=("many", ("true", "3 != 2"), ("true", "5 != 2")), errors={"B": "x [N]", "D": "y [N]"})), "select-all's answer line says A, D")

# ---- American English in everything the kit prints (Croix: "Make sure you are using American english"; 15 Nov 2026: the
# Teacher Edition printed "neighbour"). Every string literal in the kit that is not a docstring is read — a slide, a paper,
# the TE, the lesson plan, START HERE, the console and every message the build prints are made of them. Comments, docstrings
# and identifiers may stay British; the one exception below is a pattern that READS a spec's spelling.
import ast as _ast, tokenize as _tok, io as _io8
_BRIT = re.compile(r"(?i)\b(neighbour\w*|colou\w+|favour\w*|behaviour\w*|honour\w*|labour\w*|centre\w*|centred|centring|\w*metre\w*|litre\w*|"
                   r"practis\w*|labell\w*|modell\w*|travell\w*|cancell\w*|levell\w*|totall\w*|signall\w*|grey\w*|programme\w*|catalogue|whilst|amongst|"
                   r"learnt|spelt|judgement|defence|licence|offence|ageing|aluminium|cheque|tyre|storey|artefact\w*|focuss\w*|"
                   r"(?:organ|recogn|summar|real|emphas|minim|maxim|categor|apolog|normal|standard|special|util|final|priorit|visual|optim|"
                   r"initial|author|custom|memor|critic|capital|character|general|synchron|penal|harmon|modern|stabil)is(?:e|es|ed|ing|ation)|analys(?:e|ed|es|ing))\b")
_BRIT_OK = re.compile(r"(?i)neighbor\w*")
_READS_SPECS = {("lib/figwords.py", "_UNIT")}      # a regex over a spec's words: it must read "metres" to catch it
def _printed_strings(src):
    tree = _ast.parse(src)
    doc = {n.body[0].value.lineno for n in _ast.walk(tree) if isinstance(n, (_ast.Module, _ast.FunctionDef, _ast.AsyncFunctionDef, _ast.ClassDef))
           and n.body and isinstance(n.body[0], _ast.Expr) and isinstance(n.body[0].value, _ast.Constant) and isinstance(n.body[0].value.value, str)}
    reads = set()
    for n in _ast.walk(tree):                     # the lines of an assignment named in _READS_SPECS
        if isinstance(n, _ast.Assign) and any(getattr(t, "id", "") == "_UNIT" for t in n.targets):
            reads |= set(range(n.lineno, n.end_lineno + 1))
    for t in _tok.generate_tokens(_io8.StringIO(src).readline):
        if t.type in (_tok.STRING, getattr(_tok, "FSTRING_MIDDLE", -1)) and t.start[0] not in doc and t.start[0] not in reads:
            s = re.sub(r"//[^\n]*|/\*.*?\*/", "", t.string, flags=re.S) if "\n" in t.string else t.string   # a JS or CSS block's comments
            yield t.start[0], s
def _british(src):
    return [(ln, m.group(0)) for ln, s in _printed_strings(src) for m in _BRIT.finditer(s) if not _BRIT_OK.fullmatch(m.group(0))]
_kitdir = os.path.normpath(os.path.join(HERE, ".."))
_found8 = []
for _f in sorted(glob.glob(os.path.join(_kitdir, "**", "*.py"), recursive=True)):
    _rel = os.path.relpath(_f, _kitdir).replace(os.sep, "/")
    if _rel.startswith("tests/") or "/figs/" in _rel or _rel.startswith("figs/") or _rel.startswith("out/"):
        continue
    _found8 += [f"{_rel}:{ln} {w}" for ln, w in _british(open(_f, encoding="utf-8").read())]
for _f in glob.glob(os.path.join(_kitdir, "lib", "*.js")):
    _found8 += [f"{os.path.basename(_f)} {m.group(0)}" for m in _BRIT.finditer(re.sub(r"//[^\n]*|/\*.*?\*/", "", open(_f, encoding="utf-8").read(), flags=re.S))]
ok("American English: no string the kit prints carries a British spelling (neighbour, colour, centre, metre, practise, labelled, -ise …)", _found8 == [], str(_found8[:8]))
ok("planted: a British spelling in a printed string is caught, and not in a comment, a docstring or an identifier",
   [w for _, w in _british('"""The colour code."""\ncolour = 1   # colour\nprint("convince your neighbour")\nx = f"slot {colour} colours"\n')] == ["neighbour", "colours"])
from lib import plankit as _pk8
ok("American English: the Teacher Edition's and the plan's line for a split board say neighbor or the person next to you (the TE printed neighbour)",
   "neighbor" in lb.SPLIT_MOVE and not _BRIT.search(lb.SPLIT_MOVE + lb.REVOTE + _pk8.SPLIT_MOVE))

# ---- every figure trimmed to its ink (15 Nov 2026): a saved figure carried its axes' transparent margin, about 16% a side, so a
# display spanned at most ~76% of the width a slide gave it. `in` still names the frame (the ink is drawn exactly as large as
# before); the picture placed is the ink and a small fixed pad, and a layout's room holds the ink.
def _margins(path):
    from PIL import Image
    im = Image.open(path); b = im.getchannel("A").getbbox()
    return [b[0], b[1], im.width - b[2], im.height - b[3]]
_t4 = _box("12 m", 12, 8, inches=3.0)
_p4, _w4, _h4 = figkit.draw(_t4, 3.0)
_n4 = figkit.natural(_t4)
_pad4 = int(round(figkit.PAD * figkit.DPI))
ok("trim: a saved figure keeps only a small fixed pad round its ink", all(m <= _pad4 + 1 for m in _margins(_p4)), str(_margins(_p4)))
ok("trim: `in` still names the frame — the ink is as large as it was — and the size returned is the ink's",
   _n4 and abs(_w4 - 3.0 * _n4[2] / _n4[0]) < 1e-6 and abs(_h4 - 3.0 * _n4[3] / _n4[0]) < 1e-6 and _w4 < 3.0 and _n4[2] < _n4[0], f"{_w4} {_n4}")
_band4 = dict(kind="shapes", fs=22, pt=18, **{"in": 16.0}, shapes=[dict(t="poly", pts=[(0, 0), (40, 0), (40, 2), (0, 2)]),
              dict(t="text", xy=(20, 0), s="40 m", va="top", off=(0, -0.3))])
_D4 = Deck(C.COURSE, 90, "Lesson 1", "T", "foot"); _D4.section("x", "", 0, "", "content"); _D4.cursor = 2.0; _D4.figure(_band4)
_pic4 = [sh for sh in _D4.s.shapes if sh.shape_type == 13][0]
ok("trim: a display asked for wider than the slide spans the slide's whole width (it stopped at about 76%)",
   abs(_pic4.width / 914400 - 11.6) < 0.02 and abs(_pic4.left / 914400 - 0.85) < 0.02, f"{_pic4.width / 914400:.2f} in at {_pic4.left / 914400:.2f}")
_D4b = Deck(C.COURSE, 90, "Lesson 1", "T", "foot"); _D4b.section("x", "", 0, "", "content"); _D4b.cursor = 2.0; _D4b.figure(_t4)
_pic4b = [sh for sh in _D4b.s.shapes if sh.shape_type == 13][0]
ok("trim: a figure with room is placed with its ink exactly as large as before (its `in` times its ink's share of the frame)",
   abs(_pic4b.width / 914400 - _w4) < 0.01)

# ---- where a board's two slides start, after the trim (15 Nov 2026): with every picture its ink and a figure on an answer slide
# held to its room, every top fitted and the first was taken — M7 13.08 board 8 stayed at the usual top, 0.25 in lower than before
# the trim, and its histogram came out 2.17 -> 2.03 in. lessonbuild._fit_first decides as the kit did then (Deck.pre_trim).
def _hist12(H, counts=(3, 5, 2)):
    u, w = H / max(counts) * 0.9, 4.1
    sh = [dict(t="seg", a=(0, 0), b=(w * len(counts) + 0.6, 0)), dict(t="seg", a=(0, 0), b=(0, H))]
    for i, c in enumerate(counts):
        sh += [dict(t="poly", pts=[(i * w, 0), ((i + 1) * w, 0), ((i + 1) * w, c * u), (i * w, c * u)], fill="#CFE0F5"),
               dict(t="text", xy=((i + 0.5) * w, 0), s=f"{30 + 10 * i}–{39 + 10 * i}", va="top", off=(0, -0.5))]
    sh += [dict(t="text", xy=(-0.3, max(counts) * u), s=str(max(counts)), ha="right", off=(-0.3, 0)),
           dict(t="text", xy=(w * len(counts) / 2, 0), s="Loaves sold", va="top", off=(0, -1.85))]
    return dict(kind="shapes", fs=20, pt=19.5, **{"in": 5.04}, shapes=sh)
def _board12(H):
    return dict(kind="free", text=["A bakery sold 41, 35, 52, 47, 38, 44, 56, 49, 40, 33 loaves on 10 days, at \\$4 a loaf.",
                                   "**How many days go in the 40–49 bar of a histogram?"],
                fig_a=_hist12(H), steps=["40–49:  40, 41, 44, 47, 49", "That is 5 days"], answer="5 days", note="n")
def _ink12(q, top, surf="slidebig"):
    """The answer slide's figure, laid out from `top`: its INK height (None if the slide does not fit from there)."""
    from PIL import Image
    D = Deck(C.COURSE, 90, "Lesson 1", "T", "foot"); D.section("x", "", 0, "", "wb"); D.cursor = 2.3 if top is None else top
    try:
        lb._wb_body(D, q, True, surf)
    except RuntimeError:
        return None
    pic = max((sh for sh in D.s.shapes if sh.shape_type == 13), key=lambda sh: sh.width * sh.height)
    im = Image.open(io.BytesIO(pic.image.blob)).convert("RGBA"); bb = im.getchannel("A").getbbox()
    return pic.height / 914400 * (bb[3] - bb[1]) / im.height
import io
_q12 = _board12(5.2); _t12 = lb._wb_fit(_q12)
_a12, _u12 = _ink12(_q12, *_t12), _ink12(_q12, None)
ok("board top: a board whose answer slide did not fit from the usual top before the trim still starts higher, so its figure is not smaller",
   _t12[0] is not None and _u12 is not None and _a12 > _u12 + 0.05, f"{_t12}: {_a12:.2f} in, from the usual top {_u12:.2f} in")
_q12b = _board12(6.5); _t12b = lb._wb_fit(_q12b)
_all12 = [x for x in (_ink12(_q12b, t, sf) for t, sf in ((None, "slidebig"), (1.8, "slidebig"), (1.8, "slidemid"), (1.62, "slidemid"))) if x]
ok("board top: a board the kit refused before the trim starts where its figure stands tallest (not at the first top that fits by squeezing it)",
   _ink12(_q12b, *_t12b) >= max(_all12) - 0.03, f"{_t12b}: {_ink12(_q12b, *_t12b):.2f} in of {[round(x, 2) for x in _all12]}")
_q12c = dict(_board12(5.2), fig_a=_box("12 m", 10, 3, inches=3.0))
ok("board top: a board whose figure has room at the usual top keeps it", lb._wb_fit(_q12c) == (None, "slidebig"), str(lb._wb_fit(_q12c)))

# ---- a label on a label (15 Nov 2026): the struck-label check saw a label on a LINE and not two labels printed on each other
def _two(gap, a="12 m", b="15 m", inches=3.0):
    return dict(kind="shapes", fs=22, pt=18, **{"in": inches}, shapes=[dict(t="poly", pts=[(0, 0), (10, 0), (10, 6), (0, 6)]),
                dict(t="text", xy=(3, 3), s=a), dict(t="text", xy=(3 + gap, 3), s=b)])
def _draw_err(spec):
    try:
        figkit.draw(spec, spec["in"]); return ""
    except ValueError as e:
        return str(e)
ok("struck labels: two labels printed on each other are refused, and named", "printed on each other" in _draw_err(_two(0.6)) and "12 m" in _draw_err(_two(0.6)))
ok("struck labels: the same two labels apart are drawn", _draw_err(_two(5.0)) == "")
ok("struck labels: two marks may touch (a line plot stacks its ×s); a mark on a number may not",
   _draw_err(_two(0.15, "×", "×")) == "" and "printed on each other" in _draw_err(_two(0.3, "×", "4")))
_D9 = Deck(C.COURSE, 90, "Lesson 1", "T", "foot")
try:
    _p9, _w9, _h9 = _D9._fit_figure(_two(2.2, inches=4.0), 11.6, 1.3); _e9 = ""
except Exception as e:
    _e9 = str(e)
ok("struck labels: a figure that, shrunk to fit, would print its labels on each other is made smaller whole instead",
   _e9 == "" and _h9 <= 1.3 + 0.02, _e9 or f"{_h9:.2f}")

# ---- matplotlib: what a parse hands back, on any matplotlib (kit/tests/test_matplotlib.py — Windmill's GitHub check runs
# that file alone on the newest matplotlib too), and the one series the kit draws with (mathimg.MATPLOTLIB)
sys.path.insert(0, HERE)
import test_matplotlib as _tm
_tm.run(ok)
ok(f"matplotlib: these tests run on the series the kit draws with ({_tm.mathimg.MATPLOTLIB})", _tm.mathimg.matplotlib_ok(),
   _tm.mathimg.matplotlib_note() or "")

# ---- every unit's own figs.py (15 Nov 2026): gates.py, figure_sheets.py and a course's master sheet load several units in one
# process, and the second unit's `import figs` was handed the first unit's module (A7's gates crashed on figs.strips, so Unit 11's
# had to be called figs11). lib/unitload.py loads a unit-local module fresh for each unit.
import gates as _gates
from lib import unitload as _ul
with tempfile.TemporaryDirectory() as tmp:
    _spec6 = repr(L)
    for _u, _fn in (("u90", "strips"), ("u91", "bars")):
        os.makedirs(os.path.join(tmp, _u))
        open(os.path.join(tmp, _u, "figs.py"), "w").write(f"def {_fn}():\n    return 'drawn by {_u}'\n")
        open(os.path.join(tmp, _u, "l01.py"), "w").write(f"import figs\nL = {_spec6}\nL['te']['materials'] = figs.{_fn}()\n")
    _seen6 = []
    try:
        for _u in ("u90", "u91", "u90"):
            _seen6.append(_ul.load(os.path.join(tmp, _u, "l01.py")).L["te"]["materials"])
        _g6 = [_gates.unit_findings(_u, root=tmp)[0] for _u in ("u90", "u91")]
    except Exception as _e6:
        _g6 = [[f"crashed: {_e6!r}"]]
    ok("unit modules: two units, each with its own figs.py, load and gate in one process, each with its own figs",
       _seen6 == ["drawn by u90", "drawn by u91", "drawn by u90"] and _g6 == [[], []] and "figs" not in sys.modules, f"{_seen6} {_g6}")
    sys.modules["figs"] = type(sys)("figs")             # a stale module of that name, cached by anyone
    ok("unit modules: a module cached under a unit's file name from somewhere else is not the unit's",
       _ul.load(os.path.join(tmp, "u91", "l01.py")).L["te"]["materials"] == "drawn by u91")
    sys.modules.pop("figs", None)

# ---- worked equations lined up on their signs (15 Nov 2026; lib/align.py). A7 Unit 11's Barton audit: "Worked equations are
# not laid out to be followed. In every deck the equals signs are not aligned." A lesson that says align="=" sets each run of
# rows that are each one relation with the signs in one column — on a Notes slide, a worked slide and an answer slide's steps.
from lib import align as _al
import io as _io, contextlib as _cl
import checks as _ckA
ok("align: a row of an equation being solved is one relation, cut at its sign",
   _al.split("3(2x - 5) + 4 = 25") == ("3(2x - 5) + 4", "=", "25") and _al.split("x \\leq -3") == ("x", "\\leq", "-3")
   and _al.split("\\sA{3}x = 21") == ("\\sA{3}x", "=", "21") and _al.split("\\frac{x}{2} + 3 = \\frac{x}{3} + 5")[1] == "=")
ok("align: words, a check, two relations, a false ending with its words and a bare expression are not",
   all(_al.split(t) is None for t in ("\\text{Check: } 5(7) + 9 = 30", "-10 = -10 \\qquad \\text{always true}", "2x = 8 = 8",
                                       "x = 2, y = 3", "3x + 4", "= 25", "f(x = 2)", "\\sA{x = 2}"))
   and _al.latex_of("$8 = 5$, never true", "row") is None and _al.latex_of("Add 9:  $3x = 24$", "row") is None
   and _al.latex_of("Check: 5(7)", "worked") is None and _al.latex_of(("x = 7", "a gloss"), "worked") == "x = 7")
ok("align: a run is two or more such rows in a row; a row that is not one breaks it",
   _al.runs(["$a = 1$", "$b = 2$", "Check:  $a + b = 3$", "$c = 3$", "$d = 4$", "words", "$e = 5$"]) == [(0, 2), (3, 5)])
# the sign's place in a row's picture, read off mathtext's layout, against where its pixels are (the sign painted alone)
import numpy as _np
from PIL import Image as _Img
def _sign_pixels(tex, surface):
    t, pt, face = _mi._slide_latex(tex, surface)
    r = _mi.parse(f"${t}$", dpi=_mi.DPI, prop=_mi._prop(pt, face))
    tol = 0.12 * pt * _mi.DPI / 72
    col = ["FF0000" if (chr(g[2]) in _mi.RELATION_GLYPHS and abs(g[4]) < tol) else "000000" for g in r.glyphs]
    with tempfile.TemporaryDirectory() as tmp:
        p = os.path.join(tmp, "s.png"); _mi._paint(r, col, ["000000"] * len(r.rects), t, p)
        a = _np.array(_Img.open(p).convert("RGBA")).astype(int)
    xs = _np.where(((a[..., 3] > 60) & (a[..., 0] > 150) & (a[..., 1] < 90)).any(axis=0))[0]
    return (xs.min() + xs.max() + 1) / 2 / _mi.DPI
_px = [(t, s, abs(_mi.sign_offset(t, s) - _sign_pixels(t, s)) * _mi.DPI) for t, s in
       (("6x - 15 + 4 = 25", "slidemid"), ("x = 6", "slidemid"), ("-\\frac{1}{2}(4x - 10) = x - 1", "slidemid"),
        ("x \\leq -3", "slidestep"), ("3.14 \\times 5^{2} \\approx 78.5", "slidestepmid"), ("y \\neq 4", "slidestep"))]
ok("align: the sign's measured place in a picture is where its pixels are (within 2 of the picture's 300 to the inch)",
   all(d < 2 for _, _, d in _px), str([(t, round(d, 2)) for t, _, d in _px]))
ok("align: a colored slot does not move the sign", abs(_mi.sign_offset("\\sA{3}x = 21", "slidemid") - _mi.sign_offset("3x = 21", "slidemid")) < 1e-9
   and abs(_mi.sign_offset("\\sA{5}y = \\sB{45}", "slidestep") - _mi.sign_offset("5y = 45", "slidestep")) < 1e-9)
ok("align: a row whose main line has no single sign has no place to stand", _mi.sign_offset("3x + 4", "slidemid") is None
   and _mi.sign_offset("2x = 8 = 8", "slidemid") is None)
A_ = copy.deepcopy(L); A_["align"] = "="
A_["notes"] = [dict(numeral="I", head="Distribute, then collect", min=3, sub="", note="n", letters=False,
                    math=["$3(2x - 5) + 4 = 25$", "$6x - 15 + 4 = 25$", "$6x - 11 = 25$", "$6x = 36$", "$x = 6$"]),
               dict(numeral="II", head="Two runs", min=3, sub="", note="n", letters=False,
                    math=["$2x + 3 = 11$", "$2x = 8$", "Check:  $2(4) + 3 = 11$", "$5x - 1 = 14$", "$5x = 15$"]),
               dict(numeral="III", head="Not a chain", min=3, sub="", note="n", letters=False, align=False,
                    math=["$4x = 20$", "$x = 5$"])]
A_["examples"] = [dict(title="Example 1", sub="s", min_q=1, note_q="n", prompt=["$5x + 9 - 2x = 30$"], ask="Solve it, then check.",
                       worked=[dict(sub="Worked.", min=2, note="n", answer="x = 7",
                                    rows=[("5x + 9 - 2x = 30", "g"), ("3x + 9 = 30", "g"), ("\\sA{3}x = 21", "g"), ("x = 7", "g"),
                                          ("\\text{Check: } 5(7) + 9 - 2(7) = 30", "g")]),
                               dict(sub="Worked with its picture.", min=1, note="n", answer="x = 4", fig=_box("8 m", 8, 2),
                                    rows=[("2x + 3 = 11", "g"), ("2x = 8", "g"), ("x = 4", "g")])],
                       check=("eq", "1", "1"),
                       your_turn=dict(min=2, note="n", prompt=["$7x - 3 - 4x = 24$", "Solve it, then check."], answer="x = 9",
                                      steps=["$3x - 3 = 24$", "$3x = 27$", "$x = 9$", "Check:  $7(9) - 3 - 4(9) = 24$"]),
                       yt_check=("eq", "1", "1"))]
A_["whiteboard"] = copy.deepcopy(A_["whiteboard"])
A_["whiteboard"][0].update(steps=["$8x = 56$", "$x = 7$"])
A_["whiteboard"][1].update(steps=["$\\sA{5}y + 3 = 48$", "$5y = 45$", "$y = 9$"])
A_["whiteboard"][2].update(steps=["Collect:  $5y + 3 = 48$", "Subtract 3:  $5y = 45$"])    # labeled steps: words beside the mathematics
def _deck_of(spec, tmp, name):
    D = Deck(C.COURSE, 90, "Lesson 1", "T", "foot")
    with _cl.redirect_stdout(_io.StringIO()):
        lb._fill_deck(D, spec)
    p = os.path.join(tmp, name + ".pptx"); D.save(p, sidecar=False)
    Hd = HtmlDeck(C.COURSE, 90, "Lesson 1", "T", "foot"); lb._fill_deck(Hd, spec)
    return D, p, render_page(Hd)
def _slide_xml(p):
    z = zipfile.ZipFile(p)
    return [z.read(nm) for nm in sorted((nm for nm in z.namelist() if re.fullmatch(r"ppt/slides/slide\d+\.xml", nm)),
                                        key=lambda s: int(re.search(r"(\d+)", s.split("/")[-1]).group(1)))]
_atmp = tempfile.mkdtemp(prefix="kitalign")
DA, pA, hA = _deck_of(A_, _atmp, "on")
_runsA = _ckA._aligned_runs(pA)
_kind = {i + 1: x for i, x in enumerate(DA.side)}
_spread = {k: max(v) - min(v) for k, v in _runsA.items()}
_on = collections_counter = {}
for (sn, _r) in _runsA:
    _on[_kind[sn]["kind"] + ":" + (_kind[sn]["sub"] or "")] = _on.get(_kind[sn]["kind"] + ":" + (_kind[sn]["sub"] or ""), 0) + 1
ok("align: in the PowerPoint every run's signs share one x — each picture's place plus its sign, measured again from the deck",
   _runsA and all(s < 0.003 for s in _spread.values()), str(_spread))
ok("align: the runs are the ones the spec asks for — Notes I, Notes II twice (its check breaks it), both worked slides, the Your Turn's and two boards' answers",
   _on == {"notes:": 3, "example:Worked.": 1, "example:Worked with its picture.": 1, "yourturn:Answer.": 1, "wb:Answer.": 2}, str(_on))
ok("align: a run's rows are the rows it holds — a words row breaks the run and is set as before",
   sorted(len(v) for v in _runsA.values()) == [2, 2, 2, 3, 3, 3, 4, 5], str(sorted(len(v) for v in _runsA.values())))
from pptx import Presentation as _Prs
_prsA = _Prs(pA)
def _al_pics(sn):
    return [sh for sh in _prsA.slides[sn - 1].shapes if sh.shape_type == 13 and (sh._element.nvPicPr.cNvPr.get("descr") or "").startswith("align ")]
_nI = [sn for sn, x in _kind.items() if x["kind"] == "notes"][0]
_pI = _al_pics(_nI)
_mid = (min(s.left for s in _pI) + max(s.left + s.width for s in _pI)) / 2 / 914400
ok("align: a Notes run is centered on the slide as its rows were", abs(_mid - (_dk.LM + _dk.CW / 2)) < 0.01, f"{_mid:.3f}")
_wk1 = [sn for sn, x in _kind.items() if x["sub"] == "Worked."][0]
ok("align: a worked run's leftmost ink is at the worked rows' left edge (2.0 in)", abs(min(s.left for s in _al_pics(_wk1)) / 914400 - 2.0) < 0.005)
_nIII = [sn for sn, x in _kind.items() if x["kind"] == "notes"][2]
_pIII = [sh for sh in _prsA.slides[_nIII - 1].shapes if sh.shape_type == 13]
ok("align: a block that says align=False is set as before — each row centered on its own",
   not _al_pics(_nIII) and all(abs((s.left + s.width / 2) / 914400 - (_dk.LM + _dk.CW / 2)) < 0.01 for s in _pIII), str(len(_pIII)))
_wkf = [sn for sn, x in _kind.items() if x["sub"] == "Worked with its picture."][0]
_slA = _shapes_of(pA)[_wkf - 1]
_figR = max(r[2] for r, _ in _slA[0]) if _slA[0] else None
ok("align: rows lined up beside a figure still clear it (nothing on the picture, every row to its right)",
   _slA[0] and _hits(*_slA[:2]) == [] and min(s.left for s in _al_pics(_wkf)) / 914400 > _figR + 0.5, f"{_figR} {[s.left / 914400 for s in _al_pics(_wkf)]}")
ok("align: nothing a slide says changes — the same words on every slide as the deck without the field",
   [b" ".join(re.findall(rb"<a:t>([^<]*)</a:t>", x)) for x in _slide_xml(pA)] ==
   [b" ".join(re.findall(rb"<a:t>([^<]*)</a:t>", x)) for x in _slide_xml(_deck_of(dict(A_, align=None), _atmp, "none")[1])])
# the field absent: the deck the kit built before, nothing marked, nothing on the HTML page that lines rows up
_B = copy.deepcopy(A_); _B.pop("align")
_DB, pB, hB = _deck_of(_B, _atmp, "off")
_DN, pN, hN = _deck_of(dict(_B, align=None), _atmp, "null")
_nB = [sn for sn, x in enumerate(_DB.side, 1) if x["kind"] == "notes"][0]
ok("align: without the field nothing is lined up or marked, and a Notes row is centered on its own as before",
   b'descr="align ' not in b"".join(_slide_xml(pB)) and 'class="eqs' not in hB and ".eqs{" not in hB and _ckA._aligned_runs(pB) == {}
   and all(abs((s.left + s.width / 2) / 914400 - (_dk.LM + _dk.CW / 2)) < 0.01 for s in _Prs(pB).slides[_nB - 1].shapes if s.shape_type == 13))
ok("align: the field absent and the field None build the same deck, slide for slide", _slide_xml(pB) == _slide_xml(pN) and hB == hN)
# a run that would be worse lined up, or does not fit, is set as before — and said
_geo_rows = ["$100x + 250 + 375 = 4$", "$4 = 100x + 250 + 375$"]
with _cl.redirect_stdout(_io.StringIO()) as _o1:
    _p1 = _al.plan(_geo_rows, "row", "slidemid", 11.6, quiet=False)
ok("align: a run that lining up would spread past 1.25 times its widest row is set as before, and the console says so",
   _p1 == {} and "not lined up" in _o1.getvalue() and "widest row" in _o1.getvalue(), _o1.getvalue())
_ch = ["$3(2x - 5) + 4 = 25$", "$6x - 15 + 4 = 25$", "$x = 6$"]
_g = _al.geometry([r[1:-1] for r in _ch], "slidemid"); _full = sum(_al.extent(_g))
with _cl.redirect_stdout(_io.StringIO()) as _o2:
    _p2 = [_al.plan(_ch, "row", "slidemid", _full * f, quiet=False) for f in (1.0, 0.95, 0.88, 0.5)]
ok("align: a run too wide for its room steps down (92%, 85%), then falls back with a line on the console",
   [p[0][1] if p else None for p in _p2] == [1.0, 0.92, 0.85, None] and _o2.getvalue().count("not lined up") == 1, f"{[p and p[0][1] for p in _p2]} {_o2.getvalue()}")
with _cl.redirect_stdout(_io.StringIO()) as _o3:
    _D3 = Deck(C.COURSE, 90, "L", "T", "f"); _D3.section("Notes", "", 1, "n", "notes"); _D3.cursor = 1.6
    _D3.math_rows(_geo_rows, align=True, slots=True)
    _D4 = Deck(C.COURSE, 90, "L", "T", "f"); _D4.section("Notes", "", 1, "n", "notes"); _D4.cursor = 1.6
    for _r in _geo_rows:
        _D4.math_row(_r, slots=True)
_xy = lambda D_: [(s.left, s.top, s.width, s.height) for s in D_.s.shapes if s.shape_type == 13]
ok("align: a run that falls back is placed exactly as the rows were before", _xy(_D3) == _xy(_D4) and "not lined up" in _o3.getvalue())
ok("align: a scratch deck (a layout trial) says nothing on the console", "trial = True" in open(lb.__file__, encoding="utf-8").read())
# planted: one row's picture moved — slidefit refuses the deck
_pp = os.path.join(_atmp, "planted.pptx")
with zipfile.ZipFile(pA) as _zi, zipfile.ZipFile(_pp, "w") as _zo:
    _done = False
    for _nm in _zi.namelist():
        _b = _zi.read(_nm)
        if not _done and re.fullmatch(r"ppt/slides/slide\d+\.xml", _nm) and b'descr="align ' in _b:
            _t = _b.decode(); _m = re.search(r'descr="align [^"]*"/>.*?<a:off x="(\d+)"', _t, re.S)
            _b = (_t[:_m.start(1)] + str(int(_m.group(1)) + 27432) + _t[_m.end(1):]).encode(); _done = True     # 0.03 in
        _zo.writestr(_nm, _b)
with _cl.redirect_stdout(_io.StringIO()) as _o4:
    _f4 = _ckA.check_slidefit([pA]); _f5 = _ckA.check_slidefit([_pp])
ok("align: slidefit measures every aligned run of a sound deck and finds nothing", _f4 == [] and "runs of rows lined up on their signs" in _o4.getvalue(), _o4.getvalue())
ok("planted: one aligned row's picture 0.03 in out of its column is caught (slidefit)", any("not one column" in x for x in _f5), str(_f5))
# the HTML deck: the same runs, as a three-column grid, its signs measured in a real browser
ok("align: the HTML deck sets the same runs as grids (left sides, the sign, right sides): centered on a Notes slide, from the worked rows' edge, at the steps' edge (a worked slide's picture puts its rows in steps)",
   hA.count('<div class="eqs center') == 3 and hA.count('<div class="eqs from') == 1 and hA.count('<div class="eqs left') == 4
   and hA.count('class="k eq eqS"') == sum(len(v) for v in _runsA.values()) and ".eqs{" in hA)
if _browser:
    _h0 = C.HTML; C.HTML = True
    _ha = os.path.join(_atmp, "on.html"); open(_ha, "w", encoding="utf-8").write(hA)
    _hp = os.path.join(_atmp, "planted.html")
    open(_hp, "w", encoding="utf-8").write(hA.replace('<span class="k eq eqS"', '<span style="margin-left:30px" class="k eq eqS"', 1))
    with _cl.redirect_stdout(_io.StringIO()) as _o6:
        _f6 = _ckA.check_html([_ha]); _f7 = _ckA.check_html([_hp])
    C.HTML = _h0
    ok("align: in the browser every grid's signs stand in one column (htmlcheck measures them)",
       not [x for x in _f6 if "aligned run" in x] and "8 runs of rows on their signs measured" in _o6.getvalue(), str(_f6)[:300] + _o6.getvalue()[-300:])
    ok("planted: a row's sign pushed out of its column in the HTML deck is caught (htmlcheck)", any("aligned run's signs are" in x for x in _f7), str(_f7)[:300])
_bad = copy.deepcopy(A_); _bad["align"] = "yes"; _bad["notes"][0]["align"] = "left"
_rb = lb.rulingcheck_lesson(slotmark.strip_deep(_bad))
ok("align: a lesson's or a block's align that is neither \"=\" nor False is refused", len([x for x in _rb if "align=" in x]) == 2, str([x for x in _rb if "align" in x]))
ok("align: a board may carry align (it is a field a builder reads)", "align" in lb.WB_FIELDS)

# ---- a course that builds no Teacher Edition (Croix, 20 Nov 2026, of A7: "You can get rid of the 4 page teacher edition").
# course.py TEACHER_EDITION = False: no edition and no merge of them, one left in out/ removed, every gate and check clean
# without it, a spec that still carries what only the edition printed never refused for it, and everything else built
# exactly as under this profile. Run here under each test profile with the one name switched off.
import shutil as _sh, subprocess as _sub, io as _io0, contextlib as _cl0
from lib import unitbuild as _ub0, packkit as _pk0
import checks as _ck0
_te0 = C.TEACHER_EDITION
ok("no edition: the family default builds the Teacher Edition, so every course that does not say otherwise is untouched", _te0 is True)
NT = copy.deepcopy(L); NT["te"] = {k: v for k, v in NT["te"].items() if k not in ("say", "watch")}
NT["te"]["say"] = ["The exponent $x^{1/2}$ is a fraction."]          # what only the edition printed: fracexp would refuse it
NT["handout"] = "A sheet with $2^{1/2}$ on it."
_gate_te = [x for x in gates(NT) if "te.say" in x or "te.watch" in x or "fractional exponent" in x]
C.TEACHER_EDITION = False
try:
    _gate_no = gates(NT)
    _bare = copy.deepcopy(L); _bare.pop("te")
    if C.TE_STYLE == "table" or C.CLOSE or C.BANK == "md":
        _bare["te"] = {k: v for k, v in L["te"].items() if k in ("must", "must_not", "close", "variation")}
    _gate_bare = gates(_bare)
    _kept = [x for x in gates(dict(copy.deepcopy(L), te={})) if "te." in x]
finally:
    C.TEACHER_EDITION = _te0
ok("no edition: the gates ask for te.say and te.watch only where the edition is built, and its prose is not refused where it is not",
   _gate_te and _gate_no == [] and _gate_bare == [], str((_gate_te, _gate_no, _gate_bare))[:400])
_want_kept = (["must", "must_not"] if C.TE_STYLE == "table" else []) + (["close"] if C.CLOSE else []) + (["variation"] if C.BANK == "md" else [])
ok("no edition: what the Lesson Plan, the slides or the bank read from te is still required (" + (", ".join(_want_kept) or "none under this profile") + ")",
   sorted(x.split("te.")[1].split(" ")[0] for x in _kept) == sorted(_want_kept), str(_kept))

E_ = copy.deepcopy(S_); E_.pop("no_set", None); E_["independent"] = copy.deepcopy(L["independent"]); E_["hoq"] = [("Why is it 3 m?", "2")]
E_["notes"] = [dict(numeral=nm, head=f"Rope fact {nm}", min=3, sub="Copy it.", note="OFF: say it twice.", items=[f"A rope has a length ({nm})."], letters=False)
               for nm in ("I", "II", "III")]
_U0 = {"unit": 90, "title": "Area and Circles", "assessment": {"forms": {"practice": _s51()}, "total": 1,
       "tracker": {"MA.7.GR.1.1": 1}, "tracker_order": ["MA.7.GR.1.1"]}}
def _parts0(p):
    """What a built file says: its document or its slides and side-car — not its zip's dates."""
    if p.endswith((".md", ".json")):
        return open(p, encoding="utf-8").read()
    with zipfile.ZipFile(p) as z:
        return [(nm, z.read(nm)) for nm in sorted(z.namelist()) if re.fullmatch(r"word/document\.xml|ppt/slides/slide\d+\.xml|word/media/.*|ppt/media/.*", nm)]
E_["notes"][0]["math"] = ["$2^{3} \\cdot 2^{4} = 2^{7}$"]          # a coloured expression, for slotgeometry
# the build of the course that builds none sits where checks.py finds its unit's specs (slotgeometry reads them): <root>/u90, <root>/out/u90
_root0 = tempfile.mkdtemp(prefix="kitte_root")
_tA, _tB = tempfile.mkdtemp(prefix="kitte_on"), os.path.join(_root0, "out", "u90")
os.makedirs(_tB); os.makedirs(os.path.join(_root0, "u90"))
# the lesson as a course that builds no edition may write it: every field that only the edition or the side-car's notes
# read taken out (FIELDS.md "written today: no") — the notes, the say lines, the warm-up's retrieval lines, the hints
_NOTE_KEYS = ("note", "note_q", "note_a", "sub", "hint", "gloss", "source", "band")
def _strip_no(X):
    if isinstance(X, dict):
        return {k: _strip_no(v) for k, v in X.items() if k not in _NOTE_KEYS}
    if isinstance(X, list):
        return [_strip_no(v) for v in X]
    return X
EN_ = _strip_no(E_)
for _k in ("yesterday", "today", "title_note", "warmup_note", "vocab_note", "handout"):
    EN_.pop(_k, None)
EN_["te"] = {k: v for k, v in E_["te"].items() if k not in ("say", "watch", "lives", "read_first", "set_note", "close_note", "sits")}
open(os.path.join(_root0, "u90", "l01.py"), "w", encoding="utf-8").write("L = " + repr(EN_) + "\n")
import slotaudit as _sa0
try:
    with _cl0.redirect_stdout(_io0.StringIO()):
        _bA = lb.build_lesson(E_, _tA)
    _edA = sorted(f for f in os.listdir(_tA) if names.is_edition(f))
    # an earlier build's edition, its merge and an All Documents with an edition inside, all left in out/
    _stem0 = names.lesson_stem(E_)
    for f in _edA:
        _sh.copy(os.path.join(_tA, f), os.path.join(_tB, f)); _sh.copy(os.path.join(_tA, f), os.path.join(_tB, f[:-5] + ".pdf"))
    from pypdf import PdfWriter as _PW0
    for kind, mark in (("All Teacher Editions", "Teacher Edition"), ("All Documents", "Teacher Edition"), ("All Lesson Plans", "Lesson Plan")):
        w0 = _PW0(); w0.add_blank_page(612, 792); w0.add_outline_item(mark, 0)
        with open(os.path.join(_tB, f"{C.PREFIX} Unit 90 Area and Circles - {kind}.pdf"), "wb") as fh:
            w0.write(fh)
    C.TEACHER_EDITION = False
    try:
        with _cl0.redirect_stdout(_io0.StringIO()) as _o0:
            _gEN = gates(EN_)
            _bB = lb.build_lesson(EN_, _tB)
        _left0 = sorted(f for f in os.listdir(_tB) if names.is_edition(f) or "All Documents" in f)
        _plans0 = os.path.exists(os.path.join(_tB, f"{C.PREFIX} Unit 90 Area and Circles - All Lesson Plans.pdf"))
        os.remove(os.path.join(_tB, f"{C.PREFIX} Unit 90 Area and Circles - All Lesson Plans.pdf"))    # a stand-in, not a merge
        with _cl0.redirect_stdout(_io0.StringIO()):
            _uB = _ub0.build_unit(_U0, _tB)
            _uB["unit_deck"] = lb.build_unit_deck([EN_], [(E_["code"], E_["title"])], _U0, _tB)
        _srcs = [p for p in list(_bB.values()) + list(_uB.values()) if p.endswith((".docx", ".pptx"))]
        _cv = _sub.run(["soffice", "--headless", "--convert-to", "pdf", "--outdir", _tB] + _srcs, stdout=_sub.DEVNULL, stderr=_sub.DEVNULL)
        with _cl0.redirect_stdout(_io0.StringIO()) as _om:
            _merged = _ub0.merge_pdfs(_tB, [E_], _U0)
        _suite = os.path.join(tempfile.mkdtemp(prefix="kitte_suite"), "suite.md")      # beside the build, not one of its files
        _rows = lambda label, xs: f"| {label} | what |\n|---|---|\n" + "".join(f"| `{x}` | it |\n" for x in xs)
        _alias = {"gdoc": "gdoccheck", "pages": "pagecheck", "plan": "plancheck", "suite": "suitecheck", "html": "htmlcheck", "kit": "kitcheck"}
        open(_suite, "w").write("<!-- suite:t -->\n\n" + _rows(f"gate ({C.PREFIX}, at build)", _ck0.BUILD_GATES) + "\n"
                                + _rows(f"check ({C.PREFIX}, checks.py)", [_alias.get(fn.__name__[6:], fn.__name__[6:]) for fn in _ck0.RUN_LIST]))
        _sd0 = (C.SUITE_DOC, C.SUITE_BLOCK); C.SUITE_DOC, C.SUITE_BLOCK = _suite, "suite:t"
        _sa_here = _sa0.HERE; _sa0.HERE = _root0
        try:
            with _cl0.redirect_stdout(_io0.StringIO()) as _oc:
                _fB = _ck0.run(_tB)
        finally:
            C.SUITE_DOC, C.SUITE_BLOCK = _sd0; _sa0.HERE = _sa_here
        try:
            _pk0.place(f"{_stem0} - Teacher Edition.pdf", [E_]); _placed0 = True
        except SystemExit:
            _placed0 = False
        _named0 = _refused(lambda: names.lesson(E_, "Teacher Edition", "pdf")) and _refused(lambda: names.unit(90, "All Teacher Editions", "pdf"))
    finally:
        C.TEACHER_EDITION = _te0
    _filesB = sorted(os.listdir(_tB))
    ok("no edition: a lesson builds with no Teacher Edition, docx or pdf; under the profile itself it builds one",
       _edA == [f"{_stem0} - Teacher Edition.docx"] and "te" in _bA and "te" not in _bB and not [f for f in _filesB if "Teacher Edition" in f],
       str((_edA, [f for f in _filesB if "Teacher" in f])))
    ok("no edition: an edition, its merge and an All Documents with an edition in it, left in out/ by an earlier build, are removed (an All Lesson Plans is not)",
       _left0 == [] and _plans0 and "Teacher Edition file(s) from an earlier build removed" in _o0.getvalue(), str(_left0))
    ok("no edition: the unit merges no All Teacher Editions, and its All Documents holds the lesson plan and the papers only",
       "All Teacher Editions" not in _merged and "All Documents" in _merged and _cv.returncode == 0
       and [o.title for o in __import__("pypdf").PdfReader(_merged["All Documents"]).outline][:1] == ["Lesson Plan"], str(_merged))
    from lib import plankit as _plk0
    # the plan's sentences as ruling 59 writes them (21 Nov 2026): whole sentences, in both plan styles
    _drop0 = [(_plk0.TITLE_MOVE, _plk0.TITLE_MOVE_NO_TE),
              ("Teach the notes from the board and say aloud the sentence the Teacher's Edition gives for each slide.", "Teach the notes from the board, one slide at a time."),
              (", and says aloud the sentence the Teacher's Edition gives for each slide.", ".")]
    def _words0(p):
        with zipfile.ZipFile(p) as z:
            # the words, not where a line may break: dockit joins a paragraph's closing words with non-breaking spaces,
            # and a sentence taken out of a paragraph moves which words those are
            return "".join(t for nm in sorted(z.namelist()) if re.fullmatch(r"word/document\.xml|ppt/slides/slide\d+\.xml", nm)
                           for t in re.findall(r"<[aw]:t(?: [^>]*)?>([^<]*)</[aw]:t>", z.read(nm).decode("utf-8"))).replace("\u00a0", " ")
    _planA = _words0(_bA["plan"])
    _dropped0 = [a for a, b in _drop0 if a in _planA]
    for a, b in _drop0:
        _planA = _planA.replace(a, b)
    _same = {k: _parts0(_bA[k]) == _parts0(_bB[k]) for k in _bB if k != "plan"}
    _side = lambda p: [(x["n"], x["title"], x["min"], x["kind"]) for x in json.load(open(p[:-5] + ".notes.json"))["slides"]]
    ok("no edition, every teaching note left out: the slides, the set, the banks and every key are exactly as under the profile, and so are the side-car's minutes",
       _gEN == [] and set(_bB) == set(_bA) - {"te"} and all(_same.values()) and _side(_bA["deck"]) == _side(_bB["deck"]),
       str((_gEN[:3], [k for k, v in _same.items() if not v])))
    ok("no edition: the Lesson Plan is as under the profile but for the sentences that sent the teacher to the edition or to a line printed nowhere",
       _dropped0 and _words0(_bB["plan"]) == _planA, str(_dropped0))
    _printed0 = {os.path.basename(p): _words0(p) for p in _srcs}
    ok("no edition: nothing printed names the Teacher's Edition or an off-slide sentence",
       not [f for f, t in _printed0.items() if re.search(r"Teacher.?s Edition|Teacher Edition|teacher.s edition|off-slide", t)],
       str([f for f, t in _printed0.items() if re.search(r"Teacher.?s Edition|Teacher Edition|teacher.s edition|off-slide", t)]))
    _nn = os.path.join(_tA, "n.notes.json"); json.dump({"slides": [{"n": 1, "title": "Notes", "sub": "", "min": 43, "note": "", "kind": "notes"}]}, open(_nn, "w"))
    with _cl0.redirect_stdout(_io0.StringIO()):
        _pn1 = _ck0.check_plan([_nn]); C.TEACHER_EDITION = False; _pn0 = _ck0.check_plan([_nn]); C.TEACHER_EDITION = _te0
    ok("plancheck: a slide with no teaching note is a finding where the edition is built, and none where it is not",
       any("no teaching note" in x for x in _pn1) and not any("no teaching note" in x for x in _pn0), str((_pn1, _pn0)))
    ok("no edition: every check over the built lesson and unit is at 0 findings, and telength says it measured none",
       _fB == [] and "the course builds no Teacher Edition, so none is measured; 0 found" in _oc.getvalue()
       and "checks: 0 findings" in _oc.getvalue(), str(_fB)[:600])
    ok("no edition: no name for one, and the package has no place for one", _named0 and not _placed0)
    C.TEACHER_EDITION = False
    try:
        with _cl0.redirect_stdout(_io0.StringIO()):
            _stale0 = _ck0.check_telength([os.path.join(_tA, _edA[0])])
    finally:
        C.TEACHER_EDITION = _te0
    ok("planted: an edition among the built files of a course that builds none is a finding", len(_stale0) == 1 and "builds none" in _stale0[0], str(_stale0))
finally:
    C.TEACHER_EDITION = _te0
    _sh.rmtree(_tA, ignore_errors=True); _sh.rmtree(_root0, ignore_errors=True)

# 21 Nov 2026: a short expression in a Lexend paper's prose is one unbreakable piece; a long one may still break
from lib import dockit as _dkn
_dn = _dkn.Doc("E", "T", "S", font="Lexend")
_pn = _dn.para("It is $y = 1.4x + 2$ here, and $3.15(10) - 3.05(10) = 31.50 - 30.50 = 1.00$ there.")
_rn = [r.text for r in _pn.runs]
ok("dockit: a short linear expression has no breaking space, and a long one breaks only before an equals sign",
   "y\u00a0=\u00a01.4x\u00a0+\u00a02" in _rn
   and "3.15(10)\u00a0\u2212\u00a03.05(10) =\u00a031.50\u00a0\u2212\u00a030.50 =\u00a01.00" in _rn, str(_rn))
_NBk = "\u00a0"
_glued = {
    "She wrote 5 \u00f7 1 = 5 and 10 \u00f7 2 = 5 and said it is proportional.":
        "She wrote 5_\u00f7_1_=_5 and 10_\u00f7_2_=_5 and said it is proportional.",
    "In 6 hours: 62(6) = 372 and 58(6) = 348; 372 \u2212 348 = 24.": "In 6 hours: 62(6)_=_372 and 58(6)_=_348; 372_\u2212_348_=_24.",
    "y \u00f7 x is the same for every pair": "y_\u00f7_x is the same for every pair",
    "10.40 \u00f7 2 = 26.00 \u00f7 5 = 31.20 \u00f7 6 = 5.20, but 16.60 \u00f7 3 is not 5.20":
        "10.40_\u00f7_2 =_26.00_\u00f7_5 =_31.20_\u00f7_6 =_5.20, but 16.60_\u00f7_3 is not 5.20",
    "The line passes through (8, 3) and (16, 6).": "The line passes through (8,_3) and (16,_6).",
    "6 \u00b7 0, 6 \u00b7 1 and 6 \u00b7 5": "6_\u00b7_0, 6_\u00b7_1 and 6_\u00b7_5",
    "Grade 7 Accelerated \u00b7 Unit 7 \u00b7 Lesson 1": "Grade 7 Accelerated \u00b7 Unit 7 \u00b7 Lesson 1",
    "   Write the equation  (two spaces, no equation)": "   Write the equation  (two spaces, no equation)",
    "= 5 is where it ends, and it ends with =": "= 5 is where it ends, and it ends with =",
}
_gbad = {k: _dkn.glue(k) for k, v in _glued.items() if _dkn.glue(k) != v.replace("_", _NBk)}
ok("dockit: an equation written in the paper's own words keeps its signs off the ends of a line, and nothing else changes",
   not _gbad and all(_dkn.glue(k).replace(_NBk, " ") == k for k in _glued), str(_gbad))
_tails = {
    "What is the constant of proportionality, in miles per hour?": "in miles_per_hour?",
    "Choose three x-values that give whole-number y-values, and find each y.": "and find_each_y.",
    "What equation gives c in terms of n?": "in terms_of_n?",
    "Graph cups of flour versus batches.": "flour versus_batches.",
    "It passes through the origin, so the relationship is proportional.": "is proportional.",
    "Answer:  7 cups": "Answer:  7_cups",
    "Find p.  Then": "Find p.  Then",
    "a rate with nothing added at the extraordinarily-long-windedness end": "the extraordinarily-long-windedness end",
}
_tbad = {k: _dkn.bind_tail(k.replace("_", " ")) for k, v in _tails.items() if not _dkn.bind_tail(k.replace("_", " ")).endswith(v.replace("_", _NBk)) or _dkn.bind_tail(k.replace("_", " ")).replace(_NBk, " ") != k.replace("_", " ")}
ok("dockit: the words that close a paragraph stay together until they make ten characters, and no longer group is made",
   not _tbad and _dkn.bind_tail("It passes through the origin, so the relationship is proportional.").count(_NBk) == 0, str(_tbad))
_pt = _dn.para("The table shows the miles she paddles. What is the constant of proportionality, in miles per hour?")
_pb = _dn.para("**Test every pair.**  Two pairs that agree are not enough, so test them all the way to the end of it.")
ok("dockit: a paragraph's closing words are joined in its last run only",
   _pt.runs[-1].text.endswith("miles" + _NBk + "per" + _NBk + "hour?") and _NBk not in _pb.runs[0].text and _pb.runs[-1].text.endswith("end" + _NBk + "of" + _NBk + "it."),
   str([r.text for r in _pt.runs + _pb.runs]))
_pf = _dn.para("Graph  $y = \\frac{1}{4}x$.  Choose x-values, then compare $x^{2}$.")
_pe = _dn.para("The area is $x^{2}$ here.")
from docx.oxml.ns import qn as _qn
_inl = _pf._p.xpath(".//wp:inline") + _pe._p.xpath(".//wp:inline")
_ta = lambda par: (par._p.pPr.find(_qn("w:textAlignment")).get(_qn("w:val")) if par._p.pPr is not None and par._p.pPr.find(_qn("w:textAlignment")) is not None else None)
ok("dockit: a picture in a line stands close to its words, and a stacked fraction is set by its middle (an exponent is not)",
   len(_inl) == 3 and all(i.get("distL") == "0" and i.get("distR") == "0" for i in _inl) and _ta(_pf) == "center" and _ta(_pe) is None,
   str([(i.get("distL"), i.get("distR")) for i in _inl]) + " " + str((_ta(_pf), _ta(_pe))))
_pg = _dn.para("**Test every pair.**  For x: 1, 2, 3 the pairs give 3 \u00f7 1 = 3 but 7 \u00f7 2 = 3.5.")
# a page's title too long for its line is broken by length, not left to strand its last word (A7 Unit 10, 27 Nov 2026)
_room = (9360 - 3540 - 220) / 1440
def _tb(t, font="Lexend"):
    c = _dkn.title_break(t, _room, 14, font)
    return t if c is None else (t[:c], t[c + 1:])
ok("dockit: a title that fits its line is left alone",
   _tb("Linear and Proportional Relationships") == "Linear and Proportional Relationships" and _tb("Slope in Context") == "Slope in Context")
ok("dockit: a long title breaks where its two lines are alike, and never strands one word",
   _tb("Slope from Graphs, Tables and Two Points") == ("Slope from Graphs,", "Tables and Two Points")
   and _tb("Slope-Intercept Form and Graphing a Line") == ("Slope-Intercept Form", "and Graphing a Line"), str(_tb("Slope from Graphs, Tables and Two Points")))
ok("dockit: no line of a broken title ends in a joining word, and the first line is the longer by preference",
   _tb("Equations with Like Terms and the Distributive Property") == ("Equations with Like Terms", "and the Distributive Property")
   and _tb("Equations with Variables on Both Sides") == ("Equations with Variables", "on Both Sides")
   and _tb("One Solution, No Solution, Infinitely Many") == ("One Solution, No Solution,", "Infinitely Many"))
ok("dockit: a title that would not fit on two lines, or has no space, is left to the page",
   _tb("A Very Long Title That Would Never Ever Fit On Two Lines Of The Header Cell At All No Matter What").startswith("A Very")
   and _tb("Supercalifragilisticexpialidociousandthensomemore") == "Supercalifragilisticexpialidociousandthensomemore")
_dt = _dkn.Doc("E", "Slope from Graphs, Tables and Two Points", "S", font="Lexend")
_tp = _dt.d.tables[0].rows[0].cells[0].paragraphs[1]
ok("dockit: the header sets a broken title as one paragraph with one line break, its words unchanged",
   _tp._p.xml.count("<w:br") == 1 and _tp.text.replace("\n", " ") == "Slope from Graphs, Tables and Two Points", repr(_tp.text))
_dt1 = _dkn.Doc("E", "Slope in Context", "S", font="Lexend")
ok("dockit: a short title's paragraph has no line break",
   _dt1.d.tables[0].rows[0].cells[0].paragraphs[1]._p.xml.count("<w:br") == 0)
ok("dockit: a paragraph's plain words and its bold words are both glued",
   any("3" + _NBk + "\u00f7" + _NBk + "1" + _NBk + "=" + _NBk + "3 but" in r.text for r in _pg.runs), str([r.text for r in _pg.runs]))

# 22 Nov 2026: "Solve the equation for" closed a line of A7 7.05's Independent Set and "n, the yards in f feet." was the next
_tied = {
    "Solve the equation for n, the yards in f feet.": "Solve the equation for_n, the yards in_f feet.",
    "the cost c, in dollars, of w pounds": "the cost_c, in dollars, of_w pounds",
    "a ladybug crawls in t seconds.": "a ladybug crawls in_t seconds.",
    "x to get y), the table": "x to get_y), the table",
    "A car goes a mile, and I saw a car.": "A car goes a mile, and I saw a car.",
    "Bold.  y is 2 here": "Bold.  y is 2 here",
    "Store A and Plan P": "Store A and Plan P",
}
_tibad = {k: _dkn.tie_letters(k) for k, v in _tied.items() if _dkn.tie_letters(k) != v.replace("_", _NBk)}
ok("dockit: a one-letter variable stays with the word before it, and an article or a name's letter is left alone",
   not _tibad and all(_dkn.tie_letters(k).replace(_NBk, " ") == k for k in _tied), str(_tibad))
_px = _dn.para("The graph of a proportional relationship passes through $(5, 19)$. What is y when $x = 1$?")
_pv = _dn.para("There are 3 feet in 1 yard, so $f = 3n$ gives the feet f in n yards. Solve the equation for n, the yards in f feet.")
_tx = "".join(r.text for r in _px.runs); _tv = "".join(r.text for r in _pv.runs)
ok("dockit: the two rules reach across a paragraph's pieces: the words before a closing equation stay with it, and so does a letter after one",
   _tx.endswith("What is" + _NBk + "y when" + _NBk + "x" + _NBk + "=" + _NBk + "1?") and ("for" + _NBk + "n, the yards") in _tv
   and ("feet" + _NBk + "f in" + _NBk + "n yards") in _tv and _tx.replace(_NBk, " ").endswith("passes through (5, 19). What is y when x = 1?"),
   repr(_tx[-40:]) + " " + repr(_tv[-70:]))

# 22 Nov 2026: on the web deck a tall graph beside an answer's steps ran over the question above it and the answer below
from lib import htmlkit as _hk22
ok("htmlkit: a figure beside its steps is fitted to the room between the question and the answer line",
   ".figsteps{display:flex;align-items:center;justify-content:center;gap:80px;min-height:0;flex:1 1 0}" in _hk22.CSS
   and ".figsteps .fig{flex:0 1 auto;min-width:0;min-height:0;margin:0;height:100%}" in _hk22.CSS
   and ".fig img{max-width:100%;max-height:100%" in _hk22.CSS, "the .figsteps rules")

# 22 Nov 2026: "…Due by the Unit 11 / test." The IXL slide's third line left one word alone on every IXL slide of a two-digit unit
from lib import deckkit as _dk22
import inspect as _in22
_i3 = _dk22.ixl_third(67, "Due by the Unit 11 test.")
_i3long = _dk22.ixl_third(67, "This skill continues tomorrow: one assignment, due at the start of the class after 4.06.")
ok("deckkit: the IXL slide's due sentence wraps whole, in the PowerPoint and on the web deck; a long due line of a spec's own is left alone",
   _i3 == "Complete every listed skill to a SmartScore of at least 67. Due\u00a0by\u00a0the\u00a0Unit\u00a011\u00a0test."
   and "\u00a0" not in _i3long and _i3long.endswith("after 4.06.")
   and "ixl_third(ss, due)" in _in22.getsource(_dk22.Deck.ixl) and "ixl_third(ss, due)" in _in22.getsource(_hk22.HtmlDeck.ixl), repr(_i3))

# 22 Nov 2026: "Similar triangles: 6/9 = x/12. Find x." A warm-up question had to fit one line, and what fitted was a label and
# its data. A long question takes a second line now, broken after a sentence where one ends in the first.
_dw = _dk22.Deck(C.COURSE, 0, "trial", "trial", "trial"); _dw.trial = True
_wx = _dk22.LM + 1.2
_w1 = _dw.stem_rows("1.   Two angles of a triangle are 47° and 68°. Find the third angle.", _wx)
_w2 = _dw.stem_rows("2.   The remote interior angles are 50° and 65°. Find the exterior angle.", _wx)
_w3 = _dw.stem_rows("3.   A right triangle has a hypotenuse of 13 units and one leg of 5 units, so how long is its other leg?", _wx)
try:
    _dw.stem_rows("4.   " + "A" * 150, _wx); _w4 = "set"
except RuntimeError as _e:
    _w4 = str(_e)
ok("deckkit: a warm-up question that fits one line is one row; a longer one is two, broken after a sentence or at a space that leaves a dozen characters; one with no such place is refused",
   _w1 == (["1.   Two angles of a triangle are 47° and 68°. Find the third angle."], _wx)
   and _w2[0] == ["2.   The remote interior angles are 50° and 65°.", "Find the exterior angle."] and 0.3 < _w2[1] - _wx < 0.7
   and len(_w3[0]) == 2 and " ".join(_w3[0]) == "3.   A right triangle has a hypotenuse of 13 units and one leg of 5 units, so how long is its other leg?" and len(_w3[0][1]) >= 12
   and "does not break into two" in _w4, repr((_w2, _w3, _w4))[:300])
ok("deckkit: a row is broken only at a space outside its mathematics, and a \\$ is a dollar sign",
   _dk22.break_points("A $x + 1$ b \\$5 c") == [1, 9, 11, 15], repr(_dk22.break_points("A $x + 1$ b \\$5 c")))
import lib.lessonbuild as _lb22
ok("lessonbuild and both decks: the warm-up's questions are drawn by warmup_question",
   "D.warmup_question(" in _in22.getsource(_lb22) and hasattr(_hk22.HtmlDeck, "warmup_question") and hasattr(_dk22.Deck, "warmup_question"), "")

# 27 Nov 2026, A7 Unit 11's web deck: the Vocabulary slide's "3x and 5x" stood at twice the size of the definition round it, and
# a long warm-up question's second line began under its number. The page follows the PowerPoint's two rules now.
_hd27 = _hk22.HtmlDeck(C.COURSE, 0, "trial", "trial", "trial")
_hd27.section("Warm-Up", "", 0, "", "warmup")
_hd27.warmup_question("3.   A map's scale is 1 cm : 20 km. What distance does $3$ cm on the map represent?")
_hd27.warmup_answers([("4.   Solve for x: $3x + 5 = 26$", "$x = 7$")])
_hd27.math_row("terms with the same variable: $3x$ and $5x$ are like terms", surface="slidemid", size=16, align="left")
_hd27.math_row("$3x + 5 = 26$", surface="slidemid", size=26)
_b27 = "".join(_hd27.s["body"]) if isinstance(_hd27.s.get("body"), list) else str(_hd27.s)
ok("htmlkit: an expression inside a sentence is set at the sentence's size (26/24 of its words, never above the surface's own size); a row that is all mathematics keeps its surface",
   _hk22.inline_pt("the $-4$ in $8x - 4$", "slidemid", 16) == 17.3 and _hk22.inline_pt("Solve the system $y = 4x$ and $y = 2x + 3$.", "slidemid", 26) == 28.2
   and _hk22.inline_pt("so $x$ is $5$", "slide", 26) == 26 and _hk22.inline_pt("$3x + 5 = 26$", "slidemid", 26) is None
   and _hk22.inline_pt("Check the sum.", "slidemid", 26) is None and _hk22.inline_pt("so $x = 5$", "slidestep", 24.5) is None
   and _hk22.inline_pt("it costs \\$5 in all", "slidemid", 24) is None
   and 'class="t left s-slidemid inl" style="font-size:16pt;color:#1A1A1A;--k:17.3pt;"' in _b27
   and 'class="t center s-slidemid" style="font-size:26pt;color:#1A1A1A;"' in _b27
   and "p.t.inl .k:not(.d){font-size:var(--k)}" in _in22.getsource(_hk22), _b27[:400])
ok("htmlkit: a warm-up question's number stands in a box of its own, so its second line hangs under its first word; the answers slide is the same paragraph with its answer, which moves to the next line whole",
   '<p class="t left s-slide wq inl" style="font-size:23pt;--k:24.9pt;"><span class="wn">3.</span>A map' in _b27
   and '<span class="wn">4.</span>Solve for x: ' in _b27 and '<span class="wa"><span class="k"' in _b27
   and "p.wq .wn{display:inline-block;width:2.3em;text-indent:0}" in _in22.getsource(_hk22)
   and ".wa{color:#RED;font-weight:700;margin-left:.9em;display:inline-block;text-indent:0}" in _in22.getsource(_hk22), _b27[:400])

# 27 Nov 2026, A7 11.07's Independent Set slide: "… Use x = −2, −1 and" / "0." in the PowerPoint, "y = −5 +" / "2x" on the web deck
_q27 = "Solve by graphing:   $y = x - 1$   and   $y = -2x - 4$.   Use $x = -2$, $-1$ and $0$."
_fl = lambda q, w: [" ".join(p[1].strip() if p[0] == "txt" else "#" for p in ln) for ln in _dw._flow_lines(q, w, 23)]
_cut27 = [" ".join(p[1].strip() if p[0] == "txt" else "#" for p in ln) for ln in _dw._wrap(_q27, 10.75, 23)]
_g27 = "A long question in words that runs past the end of its line and leaves only one last little word here ok."
ok("deckkit: a flowed paragraph does not end on a lone short piece — the break moves up to a sentence end, or else brings words down; a paragraph that ends well is cut as before",
   _cut27[-1] == "# ." and _fl(_q27, 10.75) == ["Solve by graphing: # and # .", "Use # , # and # ."]
   and len(_fl(_g27, 10.75)) == 2 and len(_fl(_g27, 10.75)[-1]) >= 10 and " ".join(_fl(_g27, 10.75)) == _g27
   and _fl("Is $(3, -1)$ a solution of the system $y = 2x - 7$ and $y = -x + 2$?", 10.75) == ["Is # a solution of the system # and # ?"]
   and _dw._flow_first(_q27, 10.75, 23) == max([0.45] + [p[3] for p in _dw._flow_lines(_q27, 10.75, 23)[0] if p[0] == "img"]),
   repr((_cut27, _fl(_q27, 10.75), _fl(_g27, 10.75))))
_hs27 = _hk22.HtmlDeck(C.COURSE, 0, "trial", "trial", "trial")
_hs27.independent_set(6, "", ["Solve by graphing:   $y = 2x - 5$   and   $y = -5 + 2x$"] * 6, title="Independent Set", figs=[(1, dict(kind="grid", pt=9.5))])
ok("htmlkit: an expression is never broken inside, a last line is kept from a lone word where the browser can, and figures lettered for the page stay off the Independent Set slide",
   ".k:not(.d){white-space:nowrap}" in _in22.getsource(_hk22) and "text-wrap:pretty" in _in22.getsource(_hk22)
   and "setfig" not in "".join(_hs27.s["body"]) and "<ol" in "".join(_hs27.s["body"]), "".join(_hs27.s["body"])[:200])

print(f"\nkit tests under {os.path.basename(os.environ.get('KIT_COURSE', 'course.py'))}: {n - len(fails)} of {n} passed")
for f in fails:
    print("  FAILED", f)
sys.exit(1 if fails else 0)
