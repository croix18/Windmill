"""Ruling 43 — a practice problem never repeats what the lesson already showed.

Croix, 6 October 2026: "There are instances of the exact problem showing up in notes and in your
turn or whiteboards." He was right and it was systematic: a notes line was written, and then the
same line was asked back on a board (A7 3.T2: boards 4, 5 and 7 were Notes II and III verbatim;
M7 4.08: Notes II worked 3.14 × 5² = 78.5 and board 1 was a circle of radius 5; M7 5.03: boards 1,
2 and 4 were Examples 1 and 2 with nothing changed). A student with the notes open copies the
answer; the board measures handwriting.

WHAT A STUDENT HAS BEEN SHOWN by the time the practice starts: the warm-up (its answers are
revealed), every notes slide, every example with its worked solution.
WHAT IS PRACTICE: each Your Turn, each whiteboard question, each question of the independent set,
in deck order. (The question banks are the teacher's quiz source, not class work: not read here.)

A practice item is refused when —

  A  it POSES an expression the lesson already showed: the board's `latex`, or an expression in
     its words, is — after typography is taken away, and with the letters renamed in order — a side
     of some relation on a notes slide, in a worked example or in the warm-up. (An expression with
     one operation counts only when it is all the item asks about: `x²` inside `x⁻⁵ · xⁿ = x²` is
     not a problem; a board that is `5⁻²` and nothing else is.) A formula with values to put in
     (`m = 40`, or for a formula in two or more letters a mass and a speed given in words) is the
     same problem only if the values were shown too: K = ½mv² is asked five times in A7 4.07,
     each time of another mass and another speed, and that is five problems.
  B  its worked STEPS carry out a computation in numbers that the lesson already carried out
     (`3.14 × 5²` on the answer slide of a board that only said "r = 5 cm").
  C  its ANSWER has a number of three or more significant digits that is already on a notes slide
     or in a worked example (Notes III said C ≈ 45.844 in; board 9's answer was 45.844 in).
  D  it poses no expression at all (a word problem, a labelled figure) and its GIVEN NUMBERS and
     its ANSWER are together in one line of what was shown, or — with two or more givens — in one
     block of it.
  P  it poses the same expression as an EARLIER practice item of the lesson.
  Q  it has the same two or more given numbers and the same answer as an earlier practice item.

A finding is a refusal, like a wrong answer. The fix is a new problem of the same kind with every
dependent value re-derived. Where the repeat is the point — board 3 finds the area of board 2's
figure by the other method — the item says so: `repeat_ok=True`, with a comment beside it saying
why. C in particular fires on coincidence (a quarter of one circle and the whole of another are
both 12.56): that is what the tag is for, and a coincidence a student could notice is still worth
a second look before it is tagged.

What this does not see: a problem re-asked in other words with other numbers that happen to give
the same working (it compares what is written, not what is meant), and a repeat across lessons.
"""
import re

SUPS = "⁰¹²³⁴⁵⁶⁷⁸⁹⁻"
_TR = str.maketrans(SUPS, "0123456789-")
_SWAPS = (("\\left", ""), ("\\right", ""), ("\\,", ""), ("\\;", ""), ("\\!", ""), ("\\ ", ""), ("{,}", ""),
          ("\\dfrac", "\\frac"), ("\\tfrac", "\\frac"), ("\\times", "×"), ("\\cdot", "·"), ("\\div", "÷"),
          ("−", "-"), ("–", "-"), ("$", ""), (" ", ""), ("\u00a0", ""), ("\\displaystyle", ""),
          ("½", "\\frac{1}{2}"), ("¼", "\\frac{1}{4}"), ("¾", "\\frac{3}{4}"), ("\\pi", "π"), ("√", "\\sqrt"),
          ("**", ""), ("\\ell", "l"))
_CUT = re.compile(r"=|\\approx|≈|\\neq?(?![a-zA-Z])|≠|\\qquad|\\quad|\\text\{[^}]*\}|,\s|;\s|:\s|\s{3,}"
                  r"|\\to(?![a-z])|\\Rightarrow|\\rightarrow|→|<|>|\\l[et]q?(?![a-z])|\\g[et]q?(?![a-z])|≤|≥")
_PLAIN = re.compile(r"[\d(π][\d.,()\s×÷·+\-−/²³⁰¹⁴-⁹⁻½¼¾π]*[×÷·+\-−²³⁰¹⁴-⁹⁻][\d.,()\s×÷·+\-−/²³⁰¹⁴-⁹⁻½¼¾π]*[\d)²³⁰¹⁴-⁹π]")
_UNIT = re.compile(r"(?:cm|mm|km|in|ft|yd|mi|m|units?)\^\{[23]\}")
_FRACTION = re.compile(r"-?\d+/\d+|-?\d*\\frac\{\d+\}\{\d+\}")
_SCI = re.compile(r"-?[\d.]+×10\^\{-?\d+\}")
_NUM = re.compile(r"(?<![\w.])\d[\d,]*(?:\.\d+)?(?:\s?[½¼¾]|\s\d+/\d+)?|(?<![\w.])\d+/\d+")
_ASSIGN = re.compile(r"(?<![A-Za-z\\])([A-Za-z])\$?\s*=\s*\$?\s*(-?\d[\d,]*(?:\.\d+)?)")
PI_NUMBERS = {"3.14", "22/7", "3.14159265", "3.14159", "3.1416", "3.142"}
SHOWN_NOTES = ("items", "items2", "math", "table", "text", "panel", "rows")


def _balanced(s):
    d = 0
    for ch in s:
        d += ch == "("
        d -= ch == ")"
        if d < 0:
            return False
    return d == 0


def norm(e):
    """An expression with its typography taken away: 5⁻², 5^{-2} and 5^-2 are one thing."""
    e = re.sub("[" + SUPS + "]+", lambda m: "^{" + m.group(0).translate(_TR) + "}", e)
    for a, b in _SWAPS:
        e = e.replace(a, b)
    e = re.sub(r"\^(-?\w)(?![\w{])", r"^{\1}", e)
    e = re.sub(r"(?<=\d),(?=\d{3})", "", e)
    e = e.strip(".,;:?")
    while e.startswith("(") and e.endswith(")") and _balanced(e[1:-1]):
        e = e[1:-1]
    return e


def canon(e):
    """…and with its letters renamed in order of appearance: (2y⁻³)² is (2x⁻³)²."""
    seen = {}

    def rename(m):
        t = m.group(0)
        if t.startswith("\\"):
            return t
        return seen.setdefault(t, "\u27e8%d\u27e9" % (len(seen) + 1))
    return re.sub(r"\\[a-zA-Z]+|[a-zA-Z]", rename, e)


def ops(n):
    return len(re.findall(r"[×÷·+/^]|\\frac|\\sqrt|(?<=[\w)}])-", n))


def _spans(s, bare=False):
    s = s.replace("\\$", "")
    if bare:
        return [s]
    out = re.findall(r"\$([^$]+)\$", s)
    return out + _PLAIN.findall(re.sub(r"\$[^$]+\$", " ", s))


def pieces(s, bare=False):
    """The sides of every relation written in s — each an expression somebody wrote down."""
    out = []
    for sp in _spans(s, bare):
        for piece in _CUT.split(sp):
            n = norm(piece)
            if len(n) >= 3 and ops(n) and not _UNIT.fullmatch(n) and not _FRACTION.fullmatch(n):
                out.append(n)
    return out


def numbers(s):
    """The quantities written in s. An exponent is not a quantity."""
    s = s.replace("{,}", ",").replace("\\,", "")
    s = re.sub(r"(\d)\s*\\[dt]?frac\{(\d+)\}\{(\d+)\}", r"\1 \2/\3", s)
    s = re.sub(r"\\[dt]?frac\{(\d+)\}\{(\d+)\}", r" \1/\2 ", s)
    s = re.sub("[" + SUPS + "]+", " ", s)
    s = re.sub(r"\^\{?-?\d+\}?", " ", s)
    return {re.sub(r"\s+", " ", m.group(0).replace(",", "")).rstrip(".") for m in _NUM.finditer(s)}


def distinctive(n):
    """A number nobody arrives at by accident: three or more significant digits, and not π."""
    return n not in PI_NUMBERS and len(re.sub(r"[^\d]", "", n).strip("0")) >= 3


def _strs(o, keys=None):
    if o is None:
        return
    if isinstance(o, str):
        yield o
    elif isinstance(o, dict):
        for k, v in o.items():
            if keys is None or k in keys:
                yield from _strs(v)
    elif isinstance(o, (list, tuple)):
        for v in o:
            yield from _strs(v, keys)


def figtext(fig):
    """The words and numbers drawn on a figure (its labels), not its geometry."""
    out = []

    def walk(o):
        if isinstance(o, dict):
            if isinstance(o.get("s"), str):
                out.append(o["s"])
            for k, v in o.items():
                if k in ("labels", "label", "title", "caption") and isinstance(v, (str, list, tuple)):
                    out.extend(_strs(v))
                elif isinstance(v, (dict, list, tuple)):
                    walk(v)
        elif isinstance(o, (list, tuple)):
            for v in o:
                walk(v)
    walk(fig)
    return out


def _union(sets):
    out = set()
    for s in sets:
        out |= s
    return out


def shown(L):
    """[(where, expressions, canonical expressions, numbers, lines)] — the warm-up, the notes, the examples."""
    blocks = []
    for i, w in enumerate(L.get("warmup") or []):
        blocks.append((f"warm-up question {i + 1}", list(_strs(w.get("stem"))) + list(_strs(w.get("answer"))), []))
    for i, n in enumerate(L.get("notes") or []):
        ss = list(_strs(n, SHOWN_NOTES)) + figtext(n.get("fig"))
        blocks.append((f"Notes {n['numeral']}" if n.get("numeral") else f"the notes slide “{n.get('head', i + 1)}”", ss, []))
    for i, e in enumerate(L.get("examples") or []):
        ss = list(_strs(e.get("prompt"))) + figtext(e.get("fig"))
        bare = []
        for w in e.get("worked") or []:
            for r in w.get("rows") or []:
                if isinstance(r, (tuple, list)):
                    bare.append(r[0])
                    ss += [x for x in r[1:] if isinstance(x, str)]
                else:
                    ss.append(r)
            ss += list(_strs(w.get("answer"))) + list(_strs(w.get("lead")))
        blocks.append((e.get("title") or f"Example {i + 1}", ss, bare))
    out = []
    for where, ss, bare in blocks:
        ex = {p for s in ss for p in pieces(s)} | {p for s in bare for p in pieces(s, True)}
        out.append((where, ex, {canon(x) for x in ex}, _union(numbers(s) for s in ss + bare), ss + bare))
    return out


def practice(L):
    """Every Your Turn, board and independent question, in deck order, as what it poses and what it comes to."""
    out = []

    def add(label, item, q, bare, steps, ans):
        posed = list(dict.fromkeys([p for s in bare for p in pieces(s, True)] + [p for s in q for p in pieces(s)]))
        text = " ".join(q + bare)
        out.append(dict(
            label=label, item=item, posed=posed, q=q + bare,
            done=list(dict.fromkeys(p for s in steps for p in pieces(s))),
            given=_union(numbers(s) for s in q + bare) - PI_NUMBERS - numbers(item.get("unneeded") or ""),
            got=_union(numbers(s) for s in ans),
            assigned={(a, v.replace(",", "")) for a, v in _ASSIGN.findall(text.replace("{,}", ","))},
            ok=bool(item.get("repeat_ok"))))
    for i, e in enumerate(L.get("examples") or []):
        yt = e.get("your_turn")
        if yt:
            add(f"Your Turn {i + 1}", yt, list(_strs(yt.get("prompt"))) + figtext(yt.get("fig")), [],
                list(_strs(yt.get("steps"))), list(_strs(yt.get("answer"))) + list(_strs(yt.get("answer_latex"))))
    for i, b in enumerate(L.get("whiteboard") or []):
        add(f"whiteboard {i + 1}", b, list(_strs(b.get("text"))) + figtext(b.get("fig")), [b["latex"]] if b.get("latex") else [],
            list(_strs(b.get("steps"))), list(_strs(b.get("answer"))) + list(_strs(b.get("answer_latex"))))
    n = 0
    for q in L.get("independent") or []:
        if q.get("heading"):
            continue
        n += 1
        add(f"independent question {n}", q, list(_strs(q.get("stem"))), [], list(_strs(q.get("steps"))), list(_strs(q.get("answer"))))
    return out


def _same_posed(p, exprs, canons):
    """The expressions p poses that are in exprs (or, letters renamed, in canons)."""
    sole = len(p["posed"]) == 1
    return [x for x in p["posed"] if (ops(x) >= 2 or sole) and (x in exprs or (re.search(r"[a-zA-Z]", x.replace("\\frac", "").replace("\\sqrt", "")) and canon(x) in canons))]


def _letters(x):
    return set(re.findall(r"[a-zA-Z]", re.sub(r"\\[a-zA-Z]+", "", x)))


def _other_values(p, x, nums):
    """True when x is a formula the item evaluates at values the block never showed — the same formula with
    other values is another problem. The values are the item's `m = 40` assignments; for a formula in two
    or more letters they are also every number in the question outside the formula (a mass and a speed
    given in words)."""
    values = {v for _, v in p["assigned"]}
    if len(_letters(x)) >= 2:
        values |= p["given"] - numbers(x.replace("\\frac{", " \\frac{"))
    return bool(values) and not values <= nums


def repeats(L):
    """[(rule, label, what, where)] for one lesson — see the module's docstring for the rules."""
    S, P, out = shown(L), practice(L), []
    for k, p in enumerate(P):
        if p["ok"]:
            continue
        for where, exprs, canons, nums, lines in S:
            a = [x for x in _same_posed(p, exprs, canons) if not _other_values(p, x, nums)]
            b = [x for x in p["done"] if x in exprs and x not in a and not re.search(r"[a-zA-Z]", x.replace("\\frac", "").replace("\\sqrt", ""))
                 and len(re.sub(r"\D", "", x)) >= 4 and not _SCI.fullmatch(x)]
            c = sorted(n for n in p["got"] if distinctive(n) and n in nums)
            d = ""
            if not p["posed"] and p["given"] and p["got"] and not (a or b or c):
                for line in lines:
                    ln = numbers(line)
                    if p["given"] <= ln and p["got"] <= ln and (len(p["given"]) > 1 or p["got"] != p["given"] or any(len(re.sub(r"\D", "", n)) > 1 for n in p["given"])):
                        d = line
                        break
                if not d and len(p["given"]) >= 2 and p["given"] <= nums and p["got"] <= nums:
                    d = "its numbers " + ", ".join(sorted(p["given"])) + " and its answer " + ", ".join(sorted(p["got"]))
            if a:
                out.append(("A", p["label"], " and ".join(a), where))
            if b:
                out.append(("B", p["label"], " and ".join(b), where))
            if c and not (a or b):
                out.append(("C", p["label"], ", ".join(c), where))
            if d:
                out.append(("D", p["label"], d, where))
        for q in P[:k]:
            a = [x for x in _same_posed(p, set(q["posed"]), {canon(x) for x in q["posed"]})
                 if ops(x) >= 2 or len(q["posed"]) == 1]
            if a and p["assigned"] == q["assigned"] and not any(_other_values(p, x, _union(numbers(t) for t in q["q"])) for x in a):
                out.append(("P", p["label"], " and ".join(a), q["label"]))
            elif not a and not p["posed"] and not q["posed"] and len(p["given"]) >= 2 and p["given"] == q["given"] and p["got"] and p["got"] == q["got"]:
                out.append(("Q", p["label"], "the numbers " + ", ".join(sorted(p["given"])) + " and the answer " + ", ".join(sorted(p["got"])), q["label"]))
    return out


_SAY = {
    "A": "{label} asks {what} — {where} already showed it, answer and all",
    "B": "{label}'s working is {what} — {where} already carried that out",
    "C": "{label}'s answer {what} is already written in {where}",
    "D": "{label} is a problem {where} already showed ({what})",
    "P": "{label} asks {what} — {where} already asked it",
    "Q": "{label} has {what} — the same as {where}",
}


def check_lesson(L):
    """Ruling 43 as a refusal: one finding per practice item and place it repeats."""
    code, out, seen = L.get("code", "?"), [], set()
    for rule, label, what, where in repeats(L):
        if (label, where) in seen:
            continue
        seen.add((label, where))
        say = _SAY[rule].format(label=label, what=what if len(what) <= 120 else what[:117] + "…", where=where)
        out.append(f"{code}: ruling 43 — {say}. A practice problem never repeats what the lesson already showed: "
                   f"give it numbers of its own (and re-derive its answer, steps, check and distractors), "
                   f"or tag it repeat_ok=True with a comment saying why the repeat is the point.")
    return out
