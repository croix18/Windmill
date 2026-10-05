"""Turn one LESSON spec into its deck (.pptx with side-car, and .html), teacher's edition and
lesson plan, plus whatever the course's profile adds: question banks and their keys, the
independent set as a handout, or one bank file per unit (lib/profile.py).

The gates, each a refusal to build: every item's answer is re-derived by sympy from its `check`
field (mathcheck) — an item with no check and no acknowledged human derivation fails; every
multiple-choice wrong option carries a named error, and no two options are the same number
(distractorcheck, §16 rule 4); the benchmark's boundaries hold (capcheck, ruling 13); the period
has the shape the rulings give it (rulingcheck: 21, 22, 25, 26, 28); and the keyed letters are
not guessable (balancecheck).
"""
import os, re, json, itertools
import sympy as sp
from sympy import Rational as F, sqrt, Integer, nsimplify
from sympy.parsing.sympy_parser import (parse_expr, standard_transformations,
                                        implicit_multiplication_application, convert_xor, rationalize)
from .dockit import Doc, INK, VOCAB, RED, GRAY
from .deckkit import Deck, LM, CW, FOOT_Y, _textw, step_sizes
from . import figkit
from . import mathimg
from .htmlkit import HtmlDeck
from . import tekit
from . import slotmark
from . import names
from .tekit import TE
from .profile import C

COURSE = C.COURSE
PREFIX = C.PREFIX


# ---------------------------------------------------------------- mathcheck
def _sigdigs(num):
    """The significant digits of a numeral WRITTEN AS A STRING. The count depends on how the
    number is written, not on its value — 3.200 and 3.2 are the same number and different claims
    — which is why the argument must be a string and why sympy cannot be asked this directly."""
    s = str(num).strip().replace(",", "").lstrip("+-")
    if not re.fullmatch(r"\d*\.?\d*", s) or not s.strip("."):
        raise ValueError(f"sig() needs a plain numeral written out, not {num!r}")
    if "." in s:
        intp, frac = s.split(".", 1)
        return len((intp + frac).lstrip("0"))          # leading zeros never count; trailing ones do
    return len(s.rstrip("0").lstrip("0"))              # no decimal point: trailing zeros do not count


# ---- reading a multiple-choice option as a number (for the same-value check) ----
_OPT_SUP = str.maketrans("⁰¹²³⁴⁵⁶⁷⁸⁹⁻", "0123456789-")
_OPT_SYMS = {s: sp.Symbol(s, positive=True) for s in "abcdkmnpqrstwxyz"}
_OPT_TR = standard_transformations + (implicit_multiplication_application, convert_xor, rationalize)
_OPT_UNIT = re.compile(r"\s+((?:cm|mm|km|m|kg|mg|g|mL|L|in|ft|yd|mi|lb|s|h)[²³]?)\s*$")
# A question that asks for a FORM may legitimately offer a wrong option equal in value to the key
# (52 × 10⁶ is 52,000,000 and is not scientific notation). form_only is only honoured when the
# question names the form it is asking for, in one of these words.
FORM_WORDS = ("scientific notation", "significant digit")


def _opt_brace(s, j):
    d = 0
    for k in range(j, len(s)):
        d += (s[k] == "{") - (s[k] == "}")
        if d == 0:
            return s[j + 1:k], k + 1
    raise ValueError("unbalanced braces")


def _opt_latex_calls(s):
    """\\frac{A}{B} -> ((A)/(B)), \\sqrt[3]{A} -> cbrt(A), \\sqrt{A} -> sqrt(A); innermost first."""
    while True:
        i, t = max((s.rfind(t), t) for t in ("\\frac", "\\sqrt[3]", "\\sqrt"))
        if i < 0:
            return s
        if t == "\\sqrt" and s.startswith("\\sqrt[3]", i):
            t = "\\sqrt[3]"
        a, j = _opt_brace(s, i + len(t))
        if t == "\\frac":
            b, j = _opt_brace(s, j)
            s = s[:i] + f"(({a})/({b}))" + s[j:]
        else:
            s = s[:i] + ("cbrt(" if t == "\\sqrt[3]" else "sqrt(") + a + ")" + s[j:]


def _optval(opt):
    """The exact value of a choice as sympy — from plain unicode ('0.2³ · 0.1²', '4/x⁶') or one
    $latex$ span, with a trailing unit allowed — or None when the choice is not a plain value
    ('not a real number', 'Rachel only'). None means 'cannot compare', never 'different'."""
    s = _OPT_UNIT.sub("", str(opt).strip())
    if s.startswith("$") and s.endswith("$") and s.count("$") == 2:
        s = s[1:-1].replace("\\left", "").replace("\\right", "").replace("{,}", "")
        s = s.replace("\\cdot", "*").replace("\\times", "*").replace("\\div", "/")
        try:
            s = _opt_latex_calls(s)
        except ValueError:
            return None
        s = re.sub(r"\^\{([^{}]*)\}", r"**(\1)", s)
        s = re.sub(r"\^(\d)", r"**\1", s).replace("{", "(").replace("}", ")")
        if "\\" in s:
            return None
    elif "$" in s:
        return None
    else:
        s = re.sub(r"(?<=\d),(?=\d{3}\b)", "", s)
        s = re.sub(r"([⁰¹²³⁴⁵⁶⁷⁸⁹⁻]+)", lambda m: "**(" + m.group(1).translate(_OPT_SUP) + ")", s)
        s = s.replace("·", "*").replace("×", "*").replace("÷", "/")
        s = re.sub(r"√\(", "sqrt(", s)
        s = re.sub(r"∛\(", "cbrt(", s)
        s = re.sub(r"√(\d+)", r"sqrt(\1)", s)
        s = re.sub(r"∛(-?\d+)", r"cbrt(\1)", s)
    s = s.replace("\u2212", "-").replace("\u2013", "-")
    if re.search(r"[A-Za-z]{2,}", re.sub(r"sqrt|cbrt", "", s)):
        return None
    try:
        e = parse_expr(s, local_dict={**_OPT_SYMS, "sqrt": sp.sqrt, "cbrt": lambda v: sp.real_root(v, 3)},
                       transformations=_OPT_TR, evaluate=True)
        return sp.simplify(e)
    except Exception:
        return None


def _ev(expr):
    env = {"F": F, "sqrt": sp.sqrt, "Integer": Integer, "sp": sp, "Rational": F, "nsimplify": nsimplify,
           "pi": sp.pi, "Abs": sp.Abs, "abs": sp.Abs, "N": sp.N, "floor": sp.floor, "Float": sp.Float,
           "sig": _sigdigs,
           # symbols for the Thread A (MA.8.AR.1.1) algebraic checks. Declared positive so that
           # x**0 -> 1 and x**-n and quotients simplify without a zero-base caveat; the items
           # themselves state "nonzero" where it matters.
           **{s: sp.Symbol(s, positive=True) for s in "abcdkmnpqrstwxyz"}}
    return sp.sympify(eval(expr, {"__builtins__": {}}, env))


def mathcheck_item(item, where):
    """Return list of findings (strings). Empty = verified."""
    out = []
    chk = item.get("check")
    if chk is None:
        if item.get("ack"):
            return []
        return [f"{where}: no check and no ack"]
    kind = chk[0]
    try:
        if kind == "eq":            # two expressions equal exactly
            a, b = _ev(chk[1]), _ev(chk[2])
            if sp.simplify(a - b) != 0:
                out.append(f"{where}: {chk[1]} = {a} but keyed {chk[2]} = {b}")
        elif kind == "val":         # expression equals a decimal/number to stated places
            a = _ev(chk[1]); b = _ev(chk[2])
            if sp.simplify(a - b) != 0:
                out.append(f"{where}: {chk[1]} evaluates to {a}, keyed {b}")
        elif kind == "approx":      # |a-b| <= tol
            a, b, tol = _ev(chk[1]), _ev(chk[2]), _ev(chk[3])
            if abs(float(a - b)) > float(tol):
                out.append(f"{where}: {chk[1]} ≈ {float(a)}, keyed {float(b)}, tol {tol}")
        elif kind == "true":        # a python boolean over sympy values
            if not bool(_ev(chk[1])):
                out.append(f"{where}: assertion false: {chk[1]}")
        elif kind == "many":
            for sub in chk[1:]:
                out += mathcheck_item({"check": sub}, where)
        else:
            out.append(f"{where}: unknown check kind {kind}")
    except Exception as e:
        out.append(f"{where}: UNSOLVED ({e})")
    return out


def mathcheck_lesson(L):
    findings = []
    n = 0
    for grp in ("warmup", "whiteboard", "bank", "additional", "independent"):
        for i, it in enumerate(L.get(grp, [])):
            if it.get("heading") or it.get("table"):
                continue
            for f in _flatten(it):
                n += 1
                findings += mathcheck_item(f, f"{L['code']} {grp}[{i}]")
    for ex in L.get("examples", []):
        for k in ("check", "yt_check"):
            if ex.get(k):
                n += 1
                findings += mathcheck_item({"check": ex[k]}, f"{L['code']} {ex['title']} {k}")
    return findings, n


def _flatten(item):
    if item.get("parts"):
        return [dict(p, _parent=item) for p in item["parts"]]
    return [item]


def _samevalue(code, grp, i, it, corr):
    """Two choices that are the same NUMBER, which the printed-string check cannot see: (3/6)³ and
    (1/2)³, or (8/7)² and (−8/7)². A wrong option equal to the key marks a right answer wrong. Two
    equal wrong options on a one-answer item give each other away. (On a select-all, two wrong
    options may share a value — each is judged on its own.) The only exemption is form_only: the
    letters of options that are wrong in how they are WRITTEN, on a question that names the form."""
    out = []
    vals = [_optval(c) for c in it["choices"]]
    if any(v is None for v in vals):
        return out
    # the unit is part of the answer: 36 cm and 36 cm² are different options, and a board that
    # offers both is asking exactly that (M7 Unit 4)
    units = [(_OPT_UNIT.search(str(c).strip()) or [None, ""])[1] for c in it["choices"]]
    fo = set(it.get("form_only", ""))
    where = f"{code} {grp}[{i}]"
    if fo:
        q = " ".join(str(it.get(k, "")) for k in ("stem", "text", "qtext", "latex")).lower()
        if not any(w in q for w in FORM_WORDS):
            out.append(f"{where}: form_only={''.join(sorted(fo))} but the question never names the form "
                       f"it asks for ({' / '.join(FORM_WORDS)}) — so an option equal to the key is a right answer")
            fo = set()
        for L_ in sorted(fo):
            if ord(L_) - 65 in corr:
                out.append(f"{where}: form_only lists {L_}, which is a keyed answer")
    multi = len(corr) > 1 or isinstance(it.get("correct"), (list, tuple, set))
    for a, b in itertools.combinations(range(len(vals)), 2):
        try:
            same = sp.simplify(vals[a] - vals[b]) == 0
        except Exception:
            same = False
        if not same or units[a] != units[b]:
            continue
        la, lb = chr(65 + a), chr(65 + b)
        ka, kb = a in corr, b in corr
        if ka and kb:
            continue
        if ka != kb:
            wrong = lb if ka else la
            if wrong not in fo:
                out.append(f"{where}: option {wrong} equals the keyed answer ({it['choices'][a]} = "
                           f"{it['choices'][b]} = {vals[a]}) — a student who picks it is right")
        elif not multi and not ({la, lb} & fo):
            out.append(f"{where}: wrong options {la} and {lb} are the same number ({vals[a]}) — "
                       f"either both are right or both are wrong, and a student can see which")
    return out


def distractorcheck_lesson(L):
    out = []
    for grp in ("whiteboard", "bank", "additional", "independent", "warmup"):
        for i, it in enumerate(L.get(grp, [])):
            if it.get("choices"):
                corr = it["correct"] if isinstance(it["correct"], (list, tuple, set)) else [it["correct"]]
                for k in range(len(it["choices"])):
                    if k in corr:
                        continue
                    letter = chr(65 + k)
                    e = (it.get("errors") or {}).get(letter, "")
                    if not e or "[" not in e:
                        out.append(f"{L['code']} {grp}[{i}] option {letter}: no named error with a benchmark cite")
                # A select-all's wrong options are the ones that go wrong quietly: an option that
                # happens to equal the target is marked wrong for being right. Each wrong option
                # must therefore carry a clause that asserts it is NOT the target value.
                if isinstance(it.get("correct"), (list, tuple, set)):
                    chk = it.get("check") or ()
                    clauses = list(chk[1:]) if chk and chk[0] == "many" else ([chk] if chk else [])
                    nots = sum(1 for c in clauses if c and c[0] == "true" and "!=" in str(c[1]))
                    n_wrong = len(it["choices"]) - len(it["correct"])
                    if nots < n_wrong:
                        out.append(f"{L['code']} {grp}[{i}]: select-all has {n_wrong} wrong options "
                                   f"but only {nots} clauses asserting an option is NOT the target; "
                                   f"every wrong option needs its own (\"true\", \"… != …\") clause")
                # the letters an item's own words name must be the letters its key gives: an answer
                # line, a "Reveal C." and an error keyed to the right option all go stale the moment
                # the options are reordered (shuffle_choices.py rewrites them; this holds them there)
                keyed = "".join(chr(65 + k) for k in sorted(corr))
                extra = sorted(set((it.get("errors") or {})) & {chr(65 + k) for k in corr})
                if extra:
                    out.append(f"{L['code']} {grp}[{i}]: option {', '.join(extra)} is keyed correct and also carries a named error")
                am = re.match(r"^([A-F])(?: —|$)", str(it.get("answer") or ""))
                if am and len(corr) == 1 and am.group(1) != keyed:
                    out.append(f"{L['code']} {grp}[{i}]: the answer line says {am.group(1)} and the key is {keyed}")
                rm = re.search(r"\bReveal ([A-F])\b", str(it.get("note_a") or ""))
                if rm and len(corr) == 1 and rm.group(1) != keyed:
                    out.append(f"{L['code']} {grp}[{i}]: the reveal note says {rm.group(1)} and the key is {keyed}")
                vals = [str(c) for c in it["choices"]]
                if len(set(vals)) != len(vals):
                    out.append(f"{L['code']} {grp}[{i}]: two choices print the same value")
                out += _samevalue(L["code"], grp, i, it, corr)
    return out


_SCI = re.compile(r"(\d+(?:\.\d+)?)\s*(?:\\+times|×)\s*10\s*(?:\^|[⁰¹²³⁴⁵⁶⁷⁸⁹⁻])")

# ---- the two Unit 4 boundaries that are machine-checkable (MA.8.NSO.1.5 / 1.6 / 1.7) ----
_SUP = {"⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4", "⁵": "5",
        "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9", "⁻": "-"}

# one scientific-notation term, with its exponent captured in whichever form it is written
_SCI_TERM = re.compile(r"(\d+(?:\.\d+)?)\s*(?:\\+times|×|\\+cdot)\s*10\s*"
                       r"(?:\^\s*\{\s*(-?\d+)\s*\}|\^\s*(-?\d+)|([⁰¹²³⁴⁵⁶⁷⁸⁹⁻]+))")
_GAP_JUNK = re.compile(r"[\s$]|\\+[,;:!]|\\+quad|\\+qquad|\\+ ")
_ADDSUB = {"+", "-", "\u2212", "\\pm", "\\\\pm"}
_SQRT_TEX = re.compile(r"\\+sqrt\s*(?:\[\s*(\d+)\s*\])?\s*(\{(?:[^{}]|\{[^{}]*\})*\})")
# A unicode root followed by a plain integer, or a plain integer in parentheses. A root written
# in unicode over anything else (√(2³ + 8)) is left to the LaTeX form, which carries its
# structure; guessing a radicand from a prefix is how a check starts lying.
_SQRT_UNI = re.compile("[\u221a\u221b]\\s*(?:\\(\\s*(-?\\d+)\\s*\\)|(-?\\d+)(?![\\d.,^\u00b9\u00b2\u00b3\u2070-\u209f]))")
_SAFE_ARITH = re.compile(r"[0-9+\-*/(). ]*")

SQ_MAX = 225          # MA.8.NSO.1.7 boundary: perfect squares up to 225
CUBE_LO, CUBE_HI = -125, 125   # and perfect cubes from -125 to 125
GAP_MAX = 2           # MA.8.NSO.1.5 clarification: exponents within 2 for + and -


def _sci_exp(m):
    if m.group(2) is not None:
        return int(m.group(2))
    if m.group(3) is not None:
        return int(m.group(3))
    return int("".join(_SUP[c] for c in m.group(4)))


def _radicand_value(tex):
    """The radicand as an exact rational, or None if it is not plain arithmetic on integers.
    A rational radicand is allowed when numerator and denominator are each in range (the book's
    1/8, 1/27, 1/125, 1/9 forms) — the audit asked for this to be told to us, not guessed."""
    t = tex.strip()
    if t.startswith("{") and t.endswith("}"):
        t = t[1:-1]
    t = re.sub(r"\\+[dt]?frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}", r"((\1)/(\2))", t)
    t = t.replace("\\cdot", "*").replace("\\times", "*").replace("^", "**")
    t = t.replace("{", "(").replace("}", ")")
    if not t.strip() or not _SAFE_ARITH.fullmatch(t):
        return None
    try:
        v = sp.nsimplify(sp.sympify(t))
    except Exception:
        return None
    return v if getattr(v, "is_Rational", False) else None


def _in_range(n, deg):
    """One integer, against MA.8.NSO.1.7's list for roots of this degree."""
    if deg == 2:
        return 0 <= n <= SQ_MAX and bool(sp.integer_nthroot(int(n), 2)[1])
    return CUBE_LO <= n <= CUBE_HI and bool(sp.integer_nthroot(abs(int(n)), 3)[1])


def _rad_ok(v, deg):
    p, q = sp.fraction(sp.Rational(v))
    return _in_range(int(p), deg) and _in_range(int(q), deg)


# Keys whose strings are teacher-only prose: the note beside a slide, the named wrong boards, the
# distractor reasons, the retrieval source. Those sentences EXIST to quote what a student got
# wrong, so the boundary scans do not run inside them. Everything a student is asked to work —
# stem, text, latex, choices, answer, why, prompt, math, items2, rows, gloss, hint — is scanned.
TEACHER_PROSE = {"note", "note_q", "wrong", "errors", "source", "warmup_note"}


def boundcheck_str(s, where, code, caps=("gap", "radicand")):
    """Ruling 13 for Unit 4: addition and subtraction in scientific notation keep the two
    exponents within 2 of each other; radicands are perfect squares up to 225 and perfect cubes
    from -125 to 125. A block that shows a wider gap or a stretch radicand on purpose carries
    not_gap=True or not_bound=True and says why in its note."""
    out = []
    terms = list(_SCI_TERM.finditer(s)) if "gap" in caps else []
    for a, b in zip(terms, terms[1:]):
        if _GAP_JUNK.sub("", s[a.end():b.start()]) in _ADDSUB:
            e1, e2 = _sci_exp(a), _sci_exp(b)
            if abs(e1 - e2) > GAP_MAX:
                out.append(f"{code} {where}: adding or subtracting 10^{e1} and 10^{e2} — a gap of "
                           f"{abs(e1 - e2)}, and MA.8.NSO.1.5 limits it to {GAP_MAX} "
                           f"(tag the block not_gap=True if the item is about the boundary)")
    rads = [(int(m.group(1) or 2), m.group(2)) for m in _SQRT_TEX.finditer(s)] if "radicand" in caps else []
    rads += [(2 if m.group(0)[0] == "\u221a" else 3, m.group(1) or m.group(2))
             for m in _SQRT_UNI.finditer(s)] if "radicand" in caps else []
    for deg, tex in rads:
        if deg not in (2, 3):
            out.append(f"{code} {where}: a {deg}th root — MA.8.NSO.1.7 is square and cube roots only")
            continue
        n = _radicand_value(tex)
        if n is None:
            out.append(f"{code} {where}: radicand {tex!r} is not plain arithmetic on integers, so "
                       f"its bound could not be checked (work it by hand, then tag not_bound=True)")
        elif not _rad_ok(n, deg):
            name = "perfect squares up to %d" % SQ_MAX if deg == 2 else \
                   "perfect cubes from %d to %d" % (CUBE_LO, CUBE_HI)
            root = "\u221a" if deg == 2 else "cube root of "
            out.append(f"{code} {where}: {root}{n} — MA.8.NSO.1.7 is {name} "
                       f"(tag not_bound=True if deliberate, and say why in the note)")
    return out


def capcheck_lesson(L):
    """Ruling 13's caps, the ones the course's profile names (C.CAPS): integer exponents only
    ("fracexp"); sci-notation coefficients in [1,10) ("sci"); and, where MA.8.NSO.1.5 / 1.7 are
    taught, the exponent gap and the radicand bounds ("gap", "radicand"). Walks every item (and
    every notes/example block) of the spec; a block that deliberately shows a coefficient outside
    [1,10) — because it is ABOUT the constraint — carries not_sci=True."""
    out = []
    caps = C.CAPS
    blob = json.dumps(L, ensure_ascii=False, default=str)
    if "fracexp" in caps and (re.search(r"\^\{\s*\\frac", blob) or re.search(r"\^\{\s*\d+/\d+", blob)):
        out.append(f"{L['code']}: fractional exponent found")

    def scan(obj, where, skip=()):
        if isinstance(obj, dict):
            skip = tuple(skip) + tuple(f for f in ("not_sci", "not_gap", "not_bound") if obj.get(f))
            for k, v in obj.items():
                # An item's `steps` are its working (ruling 39), and the working of scientific
                # notation passes through forms that are not yet scientific notation — matching
                # the powers before adding (1.3 × 10³ = 0.013 × 10⁵), renaming a product
                # (20 × 10⁴ = 2 × 10⁵). That is the method, not a wrong answer: every such line
                # is held true by stepcheck, and the item's ANSWER is still scanned here.
                scan(v, f"{where}.{k}", skip + (("not_sci",) if k == "steps" else ()))
        elif isinstance(obj, (list, tuple)):
            for i, v in enumerate(obj):
                scan(v, f"{where}[{i}]", skip)
        elif isinstance(obj, str):
            if "not_sci" not in skip and "sci" in caps:
                for m in _SCI.finditer(obj):
                    v = float(m.group(1))
                    if not (1 <= v < 10):
                        out.append(f"{L['code']} {where}: scientific-notation coefficient {v} outside [1,10) (tag the block not_sci=True if deliberate)")
            key = where.rsplit(".", 1)[-1].split("[")[0]
            for f in ([] if key in TEACHER_PROSE else boundcheck_str(obj, where, L["code"], caps)):
                if ("not_gap" in skip and "a gap of" in f) or ("not_bound" in skip and "MA.8.NSO.1.7" in f) \
                        or ("not_bound" in skip and "could not be checked" in f):
                    continue
                out.append(f)
    for grp in ("warmup", "notes", "examples", "whiteboard", "bank", "additional", "independent", "vocab"):
        scan(L.get(grp), grp)
    # The teacher's edition is prose ABOUT the textbook and about wrong boards: naming the book's
    # own "45 × 10⁶", the guide's "leaving 12 × 10⁹" or the Dotson task's √200 is the point of the
    # sentence, so no scan runs there. Every value the TE prints as an answer comes from an item
    # that was scanned in its own group.
    scan(L.get("te"), "te", skip=("not_sci", "not_gap", "not_bound"))
    return out


def docscan_text(text, surface):
    """Standing rulings on student paper: no benchmark codes, no calculator line, no 'homework',
    no partner/group work."""
    out = []
    if surface == "student":
        if re.search(r"MA\.\d+\.[A-Z]+\.\d+\.\d+", text):
            out.append("benchmark code on student paper")
        if re.search(r"\bcalculator", text, re.I):
            out.append("calculator line on student paper")
        if re.search(r"\bhomework\b", text, re.I):
            out.append("'homework' on student paper")
    if re.search(r"\bpartner|\bgroup work|\bwith your partner|\bteam", text, re.I):
        out.append("partner/group work")
    return out


# ---------------------------------------------------------------- builders
def _fmt_q(doc, it, number=None, key=False, points=None):
    parts = None
    if it.get("parts"):
        parts = [(p["label"], p["stem"], p.get("answer"), p.get("why"), p.get("space")) for p in it["parts"]]
    doc.question(it["stem"], answer=it.get("answer"), reasoning=it.get("why"), space=it.get("space", 1.0),
                 parts=parts, choices=it.get("choices"), choice_answer=it.get("correct"), number=number,
                 lines=it.get("lines"), points=points, fig=it.get("fig"))


def _label(L):
    """'Lesson 4' for book lessons; threads carry their own label ('Thread A · Day 1')."""
    return L.get("label") or f"Lesson {L['lesson_no']}"


def build_bank(L, items, kind, key, outdir):
    """kind: 'Question Bank' or 'Question Bank - Additional'."""
    code = L["code"]
    eyebrow = f"{COURSE}  ·  Unit {L['unit']}  ·  {_label(L)}"
    sub = f"{kind} {code}"
    doc = Doc(eyebrow, L["title"], sub, key=key)
    if kind == "Independent Set":
        doc.instruction("Six questions, on your own, in silence. Show the step that does the work.")
    else:
        doc.instruction("Show your work. Circle your final answer.")
    n = 0
    for it in items:
        if it.get("heading"):
            doc.heading(it["heading"])
            continue
        if it.get("table"):
            doc.table(*it["table"])
            continue
        n += 1
        _fmt_q(doc, it, key=key)
    # the document's own subtitle keeps its wording; the FILE is named from the one list in names.py
    name = names.lesson(L, {"Question Bank - Additional": "Additional Question Bank"}.get(kind, kind), "docx", key=key)
    path = os.path.join(outdir, name)
    doc.save(path)
    return path


def build_deck(L, outdir):
    code = L["code"]
    footer = f"{COURSE} · Unit {L['unit']} · {_label(L)} — {L['title']}"
    D = Deck(COURSE, L["unit"], _label(L), L["title"], footer)
    _fill_deck(D, L)
    name = names.lesson(L, "Slides", "pptx")
    path = os.path.join(outdir, name)
    D.save(path)
    return path


def build_html_deck(L, outdir):
    """The same lesson as one self-contained HTML file (htmlkit): KaTeX math, live colour code."""
    code = L["code"]
    footer = f"{COURSE} · Unit {L['unit']} · {_label(L)} — {L['title']}"
    D = HtmlDeck(COURSE, L["unit"], _label(L), L["title"], footer)
    _fill_deck(D, L)
    path = os.path.join(outdir, names.lesson(L, "Slides", "html"))
    D.save(path)
    return path


def build_unit_deck(lessons, rows, U, outdir):
    """The whole unit as one file, in teaching order: a cover, a contents slide whose rows jump to
    each lesson's title slide, then every lesson's slides exactly as its own deck draws them (the
    review day too, where the course builds it as a lesson). The per-lesson decks stay — their
    side-cars feed the Teacher Editions and the lesson plans — so this file carries no side-car
    of its own. The .html twin is the console (lib/consolekit.py)."""
    unit = U["unit"]
    bal = balancecheck_unit(lessons)
    for f in bal:
        print("  ", f)
    if bal:
        raise SystemExit("unit deck: build refused (balancecheck)")
    count = ["No", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve"]
    taught = [L for L in lessons if not L.get("review")]
    n = count[len(taught)] if len(taught) < len(count) else str(len(taught))
    what = f"{n} lessons" + (" and the review day," if len(taught) < len(lessons) else "") + " in teaching order"
    paths = []
    for cls, ext in ((Deck, "pptx"), (HtmlDeck, "html")):
        D = cls(COURSE, unit, f"Unit {unit}", U["title"], f"{COURSE} · Unit {unit} — {U['title']}")
        D.unit_cover(U["title"], [f"{what}  ·  the next slide jumps to each one"])
        contents = D.section("Contents", "Click a lesson to jump to it. Each lesson numbers its slides from 1, as its Teacher Edition does.", 0, "", "contents")
        starts = []
        for L in lessons:
            starts.append(D.count())                  # the lesson's title slide, 0-based
            D.start_lesson(_label(L), L["title"], f"{COURSE} · Unit {L['unit']} · {_label(L)} — {L['title']}", code=L["code"], plan=L.get("plan_code"))
            _fill_deck(D, L)
        pitch = min(0.46, (FOOT_Y - 0.12 - 1.95) / max(1, len(rows)))     # eleven rows still end above the footer
        y = 1.95
        for (label, title), i in zip(rows, starts):
            D.link_row(contents, y, (label, title), f"slide {i + 1}", D.slide_ref(i), pitch=pitch)
            y += pitch
        path = os.path.join(outdir, names.unit(unit, "All Slides", ext))
        D.save(path, sidecar=False, **({"console": True} if ext == "html" else {}))
        paths.append(path)
    return paths[0]


def _math_row(row):
    """A row with real $…$ math in it (\\$ is money, not math)."""
    return "$" in row.replace("\\$", "")


TOP = 1.6      # where a slide's body starts when it starts straight under the rules (the PowerPoint's inches)


def _steps_size(rows):
    """One or two short steps on a slide with room are set as large as a worked line; more, or
    longer, at the size of the slide's ordinary text."""
    plain = max(len(re.sub(r"\$[^$]+\$", "x" * 9, slotmark.strip(r))) for r in rows)
    big = len(rows) <= 2 and plain <= 48
    return dict(gap=0.14 if big else 0.1, **step_sizes(big))


def _example_top(prompt, fig):
    """Where an Example's question slide starts. Its usual place is a little way under the rules;
    when the problem's lines and its figure do not both fit from there, it starts as much higher
    as it needs — up to straight under the rules — so the figure is the one thing that is not
    made small to pay for the words above it (M7 4.04 Example 1: three lines of problem left the
    barn 1.5 inches wide, and its roof ran through its own height label)."""
    start = 1.9 if len(prompt) > 1 or fig else 2.3
    if not fig:
        return start
    rows = 0.0
    for row in prompt:
        if _math_row(row):
            rows += 0.9
        else:
            wid = _textw(slotmark.strip(row).replace("\\$", "$"), 24)
            rows += 0.45 * max(1, -(-int(wid * 100) // int((CW - 0.1) * 100))) * (24 / 23) + 0.12
    h = figkit.draw(figkit.slide(fig), fig.get("in", 4.2))[2]
    return max(TOP, min(start, FOOT_Y - rows - h - fig.get("reserve", 0.7)))


def _bare_math(row):
    """A row that is one expression and nothing else: "$2^{3}\\cdot 2^{4}$"."""
    r = row.replace("\\$", "").strip()
    return r.startswith("$") and r.endswith("$") and r.count("$") == 2


def _fill_deck(D, L):
    """Every slide of one lesson, appended to D. Colour (the slots, HOUSE STYLE §2a) goes on the
    surfaces where the teacher shows — Notes, worked examples, and every reveal — and is withheld
    wherever the student still has to decide: warm-up, example and Your Turn prompts, whiteboard
    questions (rules 4 and 6)."""
    D.title_slide(L["benchmark"], L["target"], L["yesterday"], L["today"], minutes=1,
                  note=L.get("title_note", f"Post the learning target. Say one line and nothing else yet: \u201c{L['today']}\u201d"))
    # ---- warm-up: four retrieval questions, one slide; reveal slide after
    wu = L["warmup"]
    # (the second argument of section() is the slide's label in the Teacher's Edition; it is not drawn —
    #  deckkit._new. A slide that reads from the top — warm-up, notes — starts straight under the rules.)
    D.section("Warm-Up", "On your own. Four minutes. No notes.", 4, L.get("warmup_note", "Spaced retrieval. Two minutes silent, then reveal. One sentence of reteach per question at most."), "warmup")
    D.no_band(); D.cursor = TOP
    for i, q in enumerate(wu):
        D.math_row(f"{i + 1}.   " + q["stem"], surface="slide", gap=0.22, size=23, align="left", x=LM + 1.2)
    D.section("Warm-Up", "Answers.", 1, "Reveal. Ask for the band each question came from only if time allows.", "warmup")
    D.no_band(); D.cursor = TOP
    D.warmup_answers([(f"{i + 1}.   " + q["stem"], q["answer"]) for i, q in enumerate(wu)])
    # ---- notes
    for ni, note in enumerate(L["notes"]):
        D.section("Notes", note.get("sub", ""), note["min"], note["note"], "notes")
        D.no_band(); D.cursor = TOP - 0.08
        D.head(note["head"], note.get("numeral"))
        if note.get("items"):
            D.items(note["items"], size=note.get("size", 23), panel=note.get("panel", False), letters=note.get("letters", True), slots=True)
        if note.get("table"):
            D.table(*note["table"], size=note.get("tsize", 16))
        if note.get("fig"):
            D.figure(note["fig"])
        if note.get("math"):
            for mrow in note["math"]:
                D.math_row(mrow, surface="slidemid", gap=0.3, slots=True)
        if note.get("text"):
            for t in note["text"]:
                D.text(t, 22, slots=True)
        if note.get("items2"):
            D.items(note["items2"], size=note.get("size", 23), letters=note.get("letters", True), start=len(note.get("items", [])), slots=True)
    # ---- examples: question slide, worked slide(s), your turn q + reveal
    # An Example's `sub` is its label in the Teacher's Edition; it is not on the slide. The whole
    # problem — the story, the givens, the question — is in `prompt` (Croix, 4 October 2026: "If a
    # problem is in [the grey line], it should be pulled out into the main text"). The question
    # slide starts under the rules, so a prompt that carries its story has the room.
    for ex in L["examples"]:
        D.section(ex["title"], ex.get("sub", ""), ex["min_q"], ex["note_q"], "example")
        D.no_band()
        fig = ex.get("fig")
        if fig and ex.get("ask"):           # the figure gives up what the bold line under it needs (one line, or two)
            ask_h = 0.47 * max(1, -(-len(ex["ask"]) // 76))
            fig = dict(fig, reserve=max(fig.get("reserve", 0.7), 0.16 + 0.2 + ask_h + 0.14))    # and the ask stands clear of the footer rule
        D.cursor = _example_top(ex["prompt"], fig)
        for row in ex["prompt"]:
            D.math_row(row, surface="slidemid", gap=0.35) if _math_row(row) else D.text(row, 24, align="center")
        if fig:
            D.figure(fig)
        if ex.get("ask"):
            D.cursor += 0.2
            D.text(ex["ask"], 24, bold=True, align="center")
        for wi, w in enumerate(ex["worked"]):
            D.section(ex["title"], w.get("sub", "Worked."), w.get("min", 2), w["note"], "example")
            if w.get("lead"):               # a question this worked slide puts to the room: main text, one bold line
                D.lead(w["lead"])
            D.cursor = 2.1
            for row in w["rows"]:
                if isinstance(row, tuple):
                    latex, gloss = row
                    D.worked_row(latex, gloss, slots=True)
                else:
                    D.text(row, 23, slots=True)
            if w.get("answer"):
                D.answer_line(w["answer"], y=max(D.cursor + 0.2, 5.0))
            if w.get("items"):
                D.items(w["items"], size=23, slots=True)
        yt = ex.get("your_turn")
        if yt:
            # A Your Turn says what to do. The grey line used to ("Same steps, your numbers."), and a
            # Your Turn that was only an expression leaned on it: such a one now carries its Example's
            # bold instruction ("Which law? Then find the value."), or its own `ask` when it has one.
            yt_ask = yt.get("ask", ex.get("ask") if all(_bare_math(r) for r in yt["prompt"]) else None)
            top, surf = _yt_fit(yt, yt_ask)
            D.section("Your Turn", "Same steps, your numbers. Boards up when done.", yt.get("min", 2), yt["note"], "yourturn")
            _yt_body(D, yt, yt_ask, False, top, surf)
            D.section("Your Turn", "Answer.", 1, "Reveal; name what a wrong board most likely did (see the note above).", "yourturn")
            _yt_body(D, yt, yt_ask, True, top, surf)
    # ---- whiteboards: nine questions, question + reveal each
    wb = L["whiteboard"]
    N = C.WB_COUNT
    assert len(wb) == N, f"{L['code']}: whiteboard round must be {N} questions, got {len(wb)}"
    for qi, q in enumerate(wb):
        last = qi == N - 1
        title = f"Whiteboards   ·   Question {qi + 1} of {N}"
        subq = "Take your time. Boards up when you have written it." if last else "Boards up on three."
        meta = _board_meta(L, qi, q)
        top, surf = _wb_fit(q)             # where both of its slides start, and how large its expression is set
        D.section(title, subq, 0, q["note"], "wb")
        D.tag(wb=dict(meta, reveal=False))
        D.cursor = 2.4 if top is None else top
        _wb_body(D, q, reveal=False, surface=surf)
        D.section(title, "Answer.", 0, q.get("note_a", "Reveal. Scan the back row first; question the blank boards before the wrong ones."), "wb")
        D.tag(wb=dict(meta, reveal=True))
        D.cursor = 2.3 if top is None else top
        _wb_body(D, q, reveal=True, surface=surf)
    # ---- the independent set (ruling 21), the close where the course has one, then IXL last
    T = L["te"]
    if not L.get("no_set"):           # Croix, 27 September: the M7 Unit 4 lessons carry no six-question set
        # the six questions are ON the slide in both courses (Croix, 4 October: "the individual
        # review portion of the slides needs to put the problems on the board"). Where the course
        # also prints them (SET == "handout") the slide keeps the handout's name and its block in
        # the plan; the page and its key are still built.
        qs = [slotmark.strip(q["stem"]) for q in L["independent"] if not q.get("heading")]
        assert len(qs) == 6, f"{L['code']}: the independent set is six questions, got {len(qs)}"
        if C.SET == "handout":
            D.independent_set(INDEP_MIN, T.get("set_note", "Hand out the Independent Set; the same six questions are on the board. "
                                               "Silent work. Circulate and mark what you see; do not teach. "
                                               "Whatever is not finished goes home."), qs, title="Independent Set", kind="independent")
        else:
            D.independent_set(INDEP_MIN, T.get("set_note", "Silent, on paper, at their own pace. Circulate and "
                                               "mark the first two only; what is not finished goes home."), qs)
    if C.CLOSE:
        D.close(T["close"], 1, T.get("close_note", "Say it, then have the room say it back." +
                                     ("" if (L.get("no_set") or C.SET == "handout") else " Collect the set on the way out.")))
    D.ixl(L["ixl"], IXL_MIN, **({"due": L["ixl_due"]} if L.get("ixl_due") else {}))


IXL_MIN = C.IXL_MIN
INDEP_MIN = C.SET_MIN    # ruling 21: six questions, six minutes, after the boards


def _board_meta(L, qi, q):
    """What the console needs to run a board: its number, kind, the letters and the keyed one(s),
    the spec's error key per wrong option (the misconception each tally counts), the benchmark
    (the lesson's first, when it names two)."""
    kind = q.get("kind", "free")
    bm = (L.get("benchmarks") or [(L["benchmark"], "")])[0][0]
    meta = {"i": qi + 1, "kind": kind, "benchmark": bm.split("·")[0].split(",")[0].strip(), "lesson": L["code"]}
    if kind == "mc":
        letters = [chr(65 + k) for k in range(len(q["choices"]))]
        c = q["correct"]
        key = "".join(letters[k] for k in (c if isinstance(c, (list, tuple)) else [c]))
        meta.update(letters=letters, key=key,
                    errors={k: slotmark.strip(v).split("[")[0].strip() for k, v in q.get("errors", {}).items()})
    return meta


def _yt_body(D, yt, yt_ask, reveal, top, surf):
    """A Your Turn's slide: its problem, its instruction and — on the answer slide — its steps and
    the answer. `top` and `surf` come from _yt_fit, the same for both slides, so nothing moves
    when the answer is shown."""
    D.cursor = top
    for row in yt["prompt"]:
        D.math_row(row, surface=surf, gap=0.35, slots=reveal) if _math_row(row) else D.text(row, 24, align="center", slots=reveal)
    if yt_ask:
        D.cursor += 0.2
        D.text(yt_ask, 24, bold=True, align="center")
    if not reveal:
        return
    if yt.get("steps"):
        D.steps(yt["steps"], **_steps_size(yt["steps"]))
        _room_for_answer(D, yt)
        if yt.get("answer_latex"):
            D.answer_math(yt["answer_latex"], y=max(D.cursor + 0.15, 4.9))
        else:
            D.answer_line(yt["answer"], y=max(D.cursor + 0.15, 5.0))
    elif yt.get("answer_latex"):
        D.answer_math(yt["answer_latex"], y=max(D.cursor + 0.2, 4.9))
    else:
        D.answer_line(yt["answer"], y=max(D.cursor + 0.2, 5.0))


def _room_for_answer(D, q):
    """Refuse an answer slide whose steps leave the answer no room above the footer (the PowerPoint
    has a real cursor; the HTML deck lays itself out and is measured by htmlcheck)."""
    if not isinstance(D, Deck):
        return
    ah = mathimg.m(slotmark.strip(q["answer_latex"]), "slidebig", RED)[2] if q.get("answer_latex") else \
        0.59 * max(1, -(-int(D.measure("Answer:   " + q["answer"], "slide", 32, bold=True) * 100) // int((CW - 0.4) * 100)))
    if D.cursor + 0.15 + ah > FOOT_Y + 0.02:
        raise RuntimeError(f"the answer has no room under its steps (they end at {D.cursor:.2f} in and the answer is {ah:.2f} in tall)")


_SCRATCH = []


def _trial(draw):
    """Does this layout fit a slide? Drawn on a scratch PowerPoint that is never saved."""
    if not _SCRATCH:
        _SCRATCH.append(Deck(C.COURSE, 0, "trial", "trial", "trial"))
    S = _SCRATCH[0]
    S.section("trial", "", 0, "", "content")
    try:
        draw(S)
        return True
    except RuntimeError:
        return False


def _yt_fit(yt, yt_ask):
    """(top, surface) for a Your Turn's two slides: the usual place and size when the answer slide
    — problem, instruction, steps, answer — fits from there, and otherwise higher, then with the
    problem's mathematics one size smaller. The first that fits; the build refuses if none does."""
    if not yt.get("steps"):
        return 2.4, "slidebig"
    for top, surf in ((1.75, "slidebig"), (1.62, "slidebig"), (1.62, "slidemid")):
        if _trial(lambda S: _yt_body(S, yt, yt_ask, True, top, surf)):
            return top, surf
    raise RuntimeError(f"a Your Turn's answer slide cannot hold its steps \u2014 fewer or shorter steps: {yt['prompt'][0][:60]}")


def _wb_fit(q):
    """(top, surface) for a board's two slides, by the same trial. top None = the usual places."""
    if not q.get("steps") or q.get("fig"):
        return None, "slidebig"
    def draw(top, surf):
        def go(S):
            S.cursor = top
            _wb_body(S, q, True, surf)
        return go
    for top, surf in ((2.3, "slidebig"), (1.8, "slidebig"), (1.8, "slidemid"), (1.62, "slidemid")):
        if _trial(draw(top, surf)):
            return (None if top == 2.3 else top), surf
    raise RuntimeError(f"a board's answer slide cannot hold its steps \u2014 fewer or shorter steps: {board_text(q)[:70]}")


def _wb_body(D, q, reveal, surface="slidebig"):
    kind = q.get("kind", "free")
    if q.get("latex"):
        D.math(q["latex"], surface, slots=reveal)
    rows = q.get("text", [])
    word = any(r.startswith("**") for r in rows)
    if word:
        # A word board reads like a page, not a poster: a left-aligned block, 24 pt, the setup in
        # roman and the ask in bold on its own line(s) — a row that begins with **. Croix skipped
        # every centred version ("the formatting is horrible, I often don't understand what they
        # are asking", 3 Oct). The ask is ON the slide, in the text: M7's first decks kept it in
        # the grey hint under "Answer it.", or only in the teacher's edition (found 4 Oct).
        D.cursor = min(D.cursor, 2.05)
        for r in rows:
            bold = r.startswith("**")
            r = r.lstrip("*")
            if _math_row(r):
                D.math_row(r, surface="slide", gap=0.22, size=24, align="left", x=LM + 0.5, bold=bold, slots=reveal)
            else:
                D.text(r, 24, bold=bold, align="left", x=LM + 0.5, w=CW - 0.6, slots=reveal)
        D.cursor += 0.05
    else:
        for row in rows:
            if _math_row(row):
                D.math_row(row, surface="slidemid", gap=0.3, size=26, slots=reveal)
            else:
                D.text(row, 26 if len(row) < 60 else 23, align="center", slots=reveal)
    # fig_a: the reveal may show a different picture — M7 4.10 colours the rim for a circumference
    # and the face for an area, so the answer slide says what was measured before the number
    fig = q.get("fig_a") if (reveal and q.get("fig_a")) else q.get("fig")
    if fig:
        # the figure is the flexible block: it keeps the room what follows it needs — the answer
        # on a reveal, the ask on the question, the options on either
        # — and is drawn smaller rather than pushing them into each other (4.06 boards 1–3)
        below = 0.85 if reveal else 0.75
        below += 1.75 if kind == "mc" and not (reveal and q.get("steps")) else 0.0
        if reveal and q.get("steps"):      # the answer slide: the picture, and its working beside it
            D.figure_steps(dict(fig, reserve=max(fig.get("reserve", 0.7), below)), q["steps"])
        else:
            D.figure(dict(fig, reserve=max(fig.get("reserve", 0.7), below)))
    if kind == "mc" and not (reveal and q.get("steps")):
        # the four options are on the question slide; an answer slide that shows its working shows
        # the working in their place, and its answer line names the letter and the value
        D.cursor += 0.1
        D.choices(q["choices"], correct=(q["correct"] if reveal else None))
    if not reveal:
        # the instruction and nothing under it: a board's `hint` and `gloss` stay in the spec — the
        # grey hint under the ask and the grey line above a reveal's answer are not on a slide
        # (ruling 37 as widened: "But also those comments. Half the box. It's still a rhombus")
        D.ask("Write your answer in sentences." if kind == "written" else "Answer it.")
    else:
        if q.get("steps") and not fig:     # the working, then the answer under it (beside the figure when there is one)
            D.steps(q["steps"], **_steps_size(q["steps"]))
        if q.get("steps"):
            _room_for_answer(D, q)
        y = max(D.cursor + 0.15, 5.1) if q.get("steps") else min(max(D.cursor + 0.15, 5.1), FOOT_Y - 0.62)
        if q.get("answer_latex"):
            D.answer_math(q["answer_latex"], y=y)
        else:
            D.answer_line(q["answer"], y=y)


def board_text(q, sep="  "):
    """The board's question as prose: its latex and its text lines, in the order they appear."""
    if q.get("qtext"):
        return q["qtext"]
    bits = []
    if q.get("latex"):
        bits.append("$" + q["latex"] + "$")
    bits += [t.lstrip("*") for t in q.get("text", [])]
    return sep.join(bits)


def _first_sentence(t):
    t = (t or "").split("\n")[0].strip()
    for stop in (". ", "? ", "! "):
        if stop in t:
            return t[:t.index(stop) + 1].strip()
    return t


def _slide_line(s):
    """Ruling 26: one line per slide, in the voice of someone standing beside the teacher.
    An OFF: line IS the line (the phrase 'OFF THE SLIDE, YOURS TO SAY' retires)."""
    note = s.get("note") or ""
    for line in note.split("\n"):
        if line.startswith("OFF:"):
            return line[4:].strip().strip("'\u2018\u2019")
    return _first_sentence(note)


SPLIT_MOVE = ("Split (no option near two-thirds)? Sixty seconds, convince your neighbour, "
              "re-vote, then reveal.")
# ruling 20 — the one peer move, as the table-style edition and the labels-style plan print it
REVOTE = getattr(C, "REVOTE", "Split — no option near two-thirds? Sixty seconds, convince the person next to you, "
                              "re-vote, then reveal.")


def _locator(ev):
    """An MTR's evidence reads '<where> — <what happens there>'. Page 1 of the Teacher Edition
    carries only the <where>; the whole sentence is section 3 of the Lesson Plan (ruling 25)."""
    return ev.split(" — ")[0].strip() if " — " in ev else _first_sentence(ev)


def build_te(L, deck_path, outdir):
    """Ruling 26: the lean teacher's edition, four pages or fewer, in the course's style."""
    L = slotmark.strip_deep(L)          # a printed page carries no colour (§2a)
    return (_te_table if C.TE_STYLE == "table" else _te_lines)(L, deck_path, outdir)


def _te_lines(L, deck_path, outdir):
    """Page 1 is the period; then one line per slide, each board inline with its answer and its
    named wrong answers; then Misconceptions to Watch. No keys, no bank commentary, no paragraphs."""
    code = L["code"]
    side_path = deck_path[:-5] + ".notes.json"
    rows, wb_min, side, blocks = tekit.plan_from_sidecar(side_path)
    eyebrow = f"{COURSE}  ·  Unit {L['unit']}  ·  {_label(L)}"
    te = TE(eyebrow, L["title"])
    T = L["te"]

    # ---------------- page 1: the period, and nothing else
    te.h1("The Period")
    te.label(L["benchmark"], L["benchmark_text"])
    notes = dict(T.get("standard_notes", []))
    must = T.get("must") or notes.get("Clarification") or notes.get("Benchmark") or ""
    must_not = T.get("must_not") or notes.get("Boundary") or ""
    if must:
        te.label("Must", must)
    if must_not:
        te.label("Must not", must_not)
    te.label("Target", L["target"])
    mtr = L.get("mtr") or []
    if mtr:
        te.label("MTR", "   ·   ".join(f"**{m}** — {_locator(ev)}" for m, ev in mtr))
    tekit.timing_table(te, rows)
    te.h2("Say these three things out loud today")
    say = T.get("say") or [x for x in (T.get("lives"), *(T.get("read_first") or [])) if x][:3]
    for i, line in enumerate(say[:3]):
        p = te.para("", before=1, after=4, indent=360, hanging=360)
        te._run(p, f"{i + 1}.  ", 10.5, bold=True)
        te.rich(p, line, size=10.5)
    te.d.add_page_break()

    # ---------------- one line per slide, in slide order
    te.h1("Slide by Slide")
    wb_seen = 0
    i = 0
    while i < len(side):
        s = side[i]
        if s["kind"] == "wb":
            # a board is two slides (question, reveal); one line covers both
            q = L["whiteboard"][wb_seen]
            rev = side[i + 1] if i + 1 < len(side) and side[i + 1]["kind"] == "wb" else s
            qt = board_text(q)
            ans = q.get("answer") or ("$" + q.get("answer_latex", "") + "$")
            errs = q.get("errors") or {}
            wrong = "; ".join(f"({k}) {v}" for k, v in errs.items()) if errs else q.get("wrong", "")
            p = te.para("", before=1, after=3, indent=470, hanging=470)
            te._run(p, f"{s['n']}\u2013{rev['n']}.  ", 10.5, bold=True)
            te._run(p, f"Board {wb_seen + 1}.  ", 10.5, bold=True)
            te.rich(p, qt + "  \u2192  ", size=10.5)
            te.rich(p, ans, size=10.5, bold=True, italic=True, color=RED)
            if q.get("unneeded"):
                te.rich(p, f"   The {q['unneeded']} is not needed.", size=10, italic=True, color=GRAY)
            if wrong:
                te.rich(p, "   " + wrong, size=9.5, italic=True, color=GRAY)
            if q.get("kind") == "mc":
                te.rich(p, "   " + SPLIT_MOVE, size=9.5, italic=True, color=GRAY)
            wb_seen += 1
            i += 2
            continue
        line = _slide_line(s)
        if s["kind"] == "warmup" and "Answers" in (s.get("sub") or ""):
            line = "Reveal.  " + "   ".join(f"{k + 1}. {w['answer']}" for k, w in enumerate(L["warmup"]))
        p = te.para("", before=1, after=3, indent=470, hanging=470)
        te._run(p, f"{s['n']}.  ", 10.5, bold=True)
        head = s["title"] + (f" \u2014 {s['sub']}" if s.get("sub") else "")
        te._run(p, head + ("  " if head.endswith((".", "?", "!")) else ".  "), 10.5, bold=True)   # no ".." after a subtitle that ends in a period
        te.rich(p, line, size=10.5)
        i += 1

    # ---------------- misconceptions, tied to the board that surfaces each
    te.h1("Misconceptions to Watch")
    for i, q in enumerate(L["whiteboard"]):
        errs = q.get("errors") or {}
        src = "; ".join(v for v in errs.values()) if errs else q.get("wrong", "")
        if not src:
            continue
        first = src.split(";")[0].strip()
        p = te.para("", before=0, after=2, indent=360, hanging=360)
        te._run(p, f"Board {i + 1}.  ", 10, bold=True)
        te.rich(p, first, size=10)
    if T.get("materials"):
        te.label("Materials", T["materials"], after=2)
    name = names.lesson(L, "Teacher Edition", "docx")
    path = os.path.join(outdir, name)
    te.save(path)
    return path


def _te_table(L, deck_path, outdir):
    """Page 1 is the period: standards and target with TRUTH's must / must-not lines, the MTR, the
    timing table, and the three sentences to say out loud. Then one line per slide, in slide
    order, and the boards as one table. Keys are not here — they are in Answer Keys, and the bank
    commentary is in Reference/BANK. Four pages or fewer, checked after the render."""
    code = L["code"]
    side_path = deck_path[:-5] + ".notes.json"
    rows, wb_min, side, blocks = tekit.plan_from_sidecar(side_path)
    eyebrow = f"{COURSE}  ·  Unit {L['unit']}  ·  {_label(L)}"
    te = TE(eyebrow, L["title"])
    T = L["te"]

    # ---- page 1: the period, and nothing else
    te.h1("The Period")
    for bc, bt in L.get("benchmarks") or [(L["benchmark"], L["benchmark_text"])]:
        te.label(bc, bt)          # a lesson on two benchmarks (4.10) prints both, in full
    if T.get("must"):
        te.label("Must", T["must"])
    if T.get("must_not"):
        te.label("Must not", T["must_not"])
    te.label("Target", L["target"])
    mtrs = L.get("mtr", [])
    if mtrs:
        # codes and the evidence only — the state's full wording is in the lesson plan (ruling 25)
        te.label("MTR", "; ".join(f"**{c}** {why}" for c, why in mtrs))
    # a Your Turn is part of its example as far as the person reading this at 8:05 is concerned
    disp = []
    for seg, rng, mins in rows:
        if seg.startswith("Your Turn") and disp and disp[-1][0].startswith("Example"):
            a, r0, m0 = disp[-1]
            disp[-1] = (a, f"{r0.split(chr(8211))[0]}\u2013{rng.split(chr(8211))[-1]}", m0 + mins)
        else:
            disp.append((seg, rng, mins))
    tekit.timing_table(te, disp)
    te.body(f"The board round is the remainder — **{wb_min} min** here; slide numbers are read from the deck.")
    te.h2("Say these three out loud today")
    te.numbered_bold(T["say"])
    te.page_break()

    # ---- one line per slide. A reveal slide is not its own line (it is the same slide with the
    # answer on it), and the board round is one line because the table below carries every board.
    te.h1("The Slides, One Line Each")
    for b in blocks:
        if b["kind"] == "wb":
            te.slide_line(f"{b['first']}–{b['last']}. The board round",
                          "One board at a time, boards down until the cue. Every board, its answer "
                          "and its named wrong answers are in the table below.",
                          f"{wb_min} min")
            continue
        for s_ in b["subs"]:
            if (s_.get("sub") or "").strip() in ("Answer.", "Answers."):
                continue
            head = f"{s_['n']}. {s_['title']}" + (f" — {s_['sub']}" if s_["sub"] else "")
            line = (s_["note"] or "").replace("OFF:", "").strip()
            line = " ".join(x.strip() for x in line.split("\n") if x.strip())
            te.slide_line(head, line, f"{s_['min']} min" if s_["min"] else "")

    # ---- the boards: answer, named wrong answers, what to say on a split
    te.h1("The Boards")
    data = [["#", "Question", "Answer", "A wrong board says"]]
    for i, q in enumerate(L["whiteboard"]):
        qt = board_text(q, " ")
        ans = q.get("te_answer") or q.get("answer") or _plain(q.get("answer_latex", ""))
        errs = q.get("errors") or {}
        et = "; ".join(f"({k}) {v}" for k, v in errs.items()) if errs else q.get("wrong", "")
        if q.get("unneeded"):
            et = (et + "; " if et else "") + f"[{q['unneeded']} is not needed — ruling 22]"
        data.append([str(i + 1), qt, {"text": ans, "bold": True, "italic": True, "color": RED}, et])
    te.table([340, 2860, 2140, 4020], data, header=True, size=9)
    te.body(f"**On a split:** {REVOTE}")

    # ---- the six in-class questions, answers only (they are on the slide, not a handout)
    if not L.get("no_set"):
        te.h2("Independent practice — the six answers")
        te.body("  ".join(f"**{i+1}.** {_plain((q.get('answer') or '').strip())}"
                          for i, q in enumerate(L["independent"])))

    # ---- misconceptions, each tied to its board
    te.h1("Misconceptions to Watch")
    te.bullets(T["watch"])
    if not L.get("review"):
        te.body(f"More questions on this lesson, with answers and the variation behind them, are in "
                f"the unit's **Question Bank** file (Reference). " +
                (f"Handout: {L['handout']}." if L.get("handout") else "Nothing in this lesson is a handout."))

    name = names.lesson(L, "Teacher Edition", "docx")
    path = os.path.join(outdir, name)
    te.save(path)
    return path


_FRAC = re.compile(r"\\d?frac\{([^{}]*)\}\{([^{}]*)\}")


def _plain(latex):
    """A one-line, image-free rendering of an answer for the teacher's edition table. A stacked
    fraction set as a picture blows the row height out and costs a page (ruling 26)."""
    t = _FRAC.sub(r"\1/\2", (latex or "").replace("\\$", "\ue000"))
    t = t.replace("\\cdot", "·").replace("\\times", "×").replace("$", "").strip()
    return t.replace("\ue000", "\\$")               # money stays escaped for rich()


def _answers_list(te, items, title):
    te.h2(title)
    n = 0
    for it in items:
        if it.get("heading") or it.get("table"):
            continue
        n += 1
        p = te.para("", before=0, after=3, indent=360, hanging=360)
        te._run(p, f"{n}.  ", 10, bold=True)
        if it.get("parts"):
            te.rich(p, "  ".join(f"({pp['label']}) " + (pp.get('answer') or '') for pp in it["parts"]), size=10, bold=True, italic=True, color=RED)
        elif it.get("choices"):
            corr = it["correct"] if isinstance(it["correct"], (list, tuple)) else [it["correct"]]
            te.rich(p, ", ".join(chr(65 + c) for c in corr) + "  " + (it.get("answer") or ""), size=10, bold=True, italic=True, color=RED)
        else:
            te.rich(p, it.get("answer") or "", size=10, bold=True, italic=True, color=RED)



def balancecheck_lesson(L):
    """The keyed letter must not be guessable. Students noticed (3 Oct 2026) that every
    multiple-choice answer was A: the specs were written answer-first and printed in spec order.
    shuffle_choices.py spread them; this gate keeps them spread. Over a lesson's single-answer
    items (round, bank, additional, independent): no three in a row in one group keyed alike,
    no letter over 60% when there are four or more, and never all alike when there are three or
    more. Over its select-alls: the keyed set may not be the first k options in more than half."""
    out = []
    singles, multis = [], []
    for grp in ("whiteboard", "bank", "additional", "independent"):
        run = []
        for i, it in enumerate(L.get(grp, [])):
            if not it.get("choices"):
                continue
            if isinstance(it["correct"], (list, tuple, set)):
                multis.append((grp, i, sorted(it["correct"]) == list(range(len(it["correct"])))))
                continue
            L_ = chr(65 + it["correct"])
            singles.append(L_)
            run.append(L_)
            if len(run) >= 3 and len(set(run[-3:])) == 1:
                out.append(f"{L['code']} {grp}[{i}]: three single-answer items in a row keyed {L_} — spread them (shuffle_choices.py)")
    if len(singles) >= 3 and len(set(singles)) == 1:
        out.append(f"{L['code']}: every single-answer item is keyed {singles[0]} — the key is guessable; run shuffle_choices.py")
    if len(singles) >= 4:
        top = max(set(singles), key=singles.count)
        if singles.count(top) / len(singles) > 0.6:
            out.append(f"{L['code']}: {singles.count(top)} of {len(singles)} single-answer items are keyed {top} — spread them")
    prefix = [m for m in multis if m[2]]
    if multis and len(prefix) * 2 > len(multis):
        out.append(f"{L['code']}: {len(prefix)} of {len(multis)} select-alls key the first options (A, B, C…) — spread them")
    return out


# The seven Mathematical Thinking and Reasoning standards, in the state's own words (ruling 25).
MTR_TEXT = {
    "MTR.1.1": "Actively participate in effortful learning both individually and collectively.",
    "MTR.2.1": "Demonstrate understanding by representing problems in multiple ways.",
    "MTR.3.1": "Complete tasks with mathematical fluency.",
    "MTR.4.1": "Engage in discussions that reflect on the mathematical thinking of self and others.",
    "MTR.5.1": "Use patterns and structure to help understand and connect mathematical concepts.",
    "MTR.6.1": "Assess the reasonableness of solutions.",
    "MTR.7.1": "Apply mathematics to real-world contexts.",
}

# Every field a board may carry. A field no builder reads would ship as nothing — it is refused.
WB_FIELDS = {"kind", "latex", "text", "hint", "gloss", "steps", "answer", "answer_latex", "te_answer", "fig", "fig_a",
             "note", "note_a", "check", "wrong", "choices", "correct", "errors", "qtext", "unneeded", "ack",
             "form_only", "not_sci", "not_gap", "not_bound"}


def differentiation_rows(L):
    """[(label, text)] from either shape a spec may give: a list of pairs, or a dict with
    ese / ell / enrichment."""
    d = L.get("differentiation") or []
    if isinstance(d, dict):
        return [(lab, d[k]) for lab, k in (("ESE / IEP", "ese"), ("ELL", "ell"), ("Enrichment", "enrichment")) if d.get(k)]
    return list(d)


def balancecheck_unit(lessons):
    """Across a whole unit's whiteboard rounds, every letter the boards offer is keyed at least
    once and none carries more than 40% — a class that never sees D keyed stops reading D (M7
    Units 4 and 5 shipped that way: A, B and C only, on every board, found 4 Oct)."""
    keyed, offered = [], set()
    for L in lessons:
        for q in L.get("whiteboard", []):
            if q.get("choices") and not isinstance(q["correct"], (list, tuple, set)):
                keyed.append(chr(65 + q["correct"]))
                offered |= {chr(65 + k) for k in range(len(q["choices"]))}
    out = []
    if len(keyed) >= 8:
        for L_ in sorted(offered - set(keyed)):
            out.append(f"unit: no whiteboard question is keyed {L_} ({len(keyed)} single-answer boards) — spread the keys (shuffle_choices.py)")
        top = max(set(keyed), key=keyed.count)
        if keyed.count(top) / len(keyed) > 0.4:
            out.append(f"unit: {keyed.count(top)} of {len(keyed)} whiteboard questions are keyed {top} — spread the keys")
    return out


def rulingcheck_lesson(L):
    """Rulings 21, 22, 25, 26 and 28 as facts about the spec, refused at build time like a math error."""
    out = []
    code = L["code"]
    for i, q in enumerate(L.get("whiteboard", [])):
        for k in sorted(set(q) - WB_FIELDS):
            out.append(f"{code} whiteboard[{i}]: field '{k}' is not read by any builder — "
                       f"it would ship as nothing; remove it or wire it up")
    if not L.get("mtr"):
        out.append(f"{code}: ruling 25 — no `mtr`; name the two or three MTRs this lesson exercises, each with its evidence")
    for c, _ in L.get("mtr") or []:
        if c not in MTR_TEXT:
            out.append(f"{code}: unknown MTR code {c}")
    if not L.get("hoq"):
        out.append(f"{code}: ruling 25 — higher-order questions with DOK are missing")
    if not differentiation_rows(L):
        out.append(f"{code}: ruling 25 — differentiation (ESE / ELL / enrichment) is missing")
    if not L.get("no_set"):
        ind = L.get("independent") or []
        n_ind = len([i for i in ind if not i.get("heading")])
        if n_ind != 6:
            out.append(f"{code}: ruling 21 — the independent set has {n_ind} questions, needs exactly 6")
    unneeded = [i for i, q in enumerate(L["whiteboard"]) if q.get("unneeded")]
    if len(unneeded) != 1:
        out.append(f"{code}: ruling 22 — {len(unneeded)} boards carry a figure the question does not need, needs exactly 1"
                   + (f" (boards {[u + 1 for u in unneeded]})" if unneeded else ""))
    T = L["te"]
    if not (T.get("say") and len(T["say"]) == 3):
        out.append(f"{code}: ruling 26 — te.say must be the three sentences to say out loud today")
    need = (("must", "must_not", "watch") if C.TE_STYLE == "table" else ()) \
        + (("close",) if C.CLOSE else ()) + (("variation",) if C.BANK == "md" else ())
    for f in need:
        if not T.get(f):
            out.append(f"{code}: te.{f} is required")
    # Ruling 28: every IXL skill listed is required — "nothing on the list is optional". The slide
    # prints "all required" over the list, so a skill marked optional contradicts it on the screen.
    for s in L.get("ixl", []):
        if re.search(r"\boptional\b|also consider", s, re.I):
            out.append(f"{code}: ruling 28 — an IXL skill is marked optional or 'also consider' ({s!r}); every listed skill is required, so drop the words or the skill")
    # ... and the skills and their codes are the IXL plan's (lib/ixlplan.py): the slide, the
    # due-date sheet and the room all read one plan.
    from . import ixlplan
    out += ixlplan.check(L)
    return out


def _stepval(side):
    """One side of a step's equation as sympy, or None when it is not something to compute
    (a name being given a value — 'A', 'k' — or words). \\pi is π; \\text{…} and units are dropped."""
    s = side.strip()
    s = re.sub(r"\\text\{[^{}]*\}", "", s)
    s = s.replace("\\left", "").replace("\\right", "").replace("{,}", "").replace("\\,", "").replace("\\;", "").replace("\\!", "")
    s = s.replace("\\cdot", "*").replace("\\times", "*").replace("\\div", "/").replace("\\pi", " pi ").replace("\\%", "/100")
    s = s.replace("\u2212", "-").replace("\u2013", "-")
    try:
        s = _opt_latex_calls(s)
    except ValueError:
        return None
    s = re.sub(r"\^\{([^{}]*)\}", r"**(\1)", s)
    s = re.sub(r"\^(-?\d)", r"**(\1)", s).replace("{", "(").replace("}", ")")
    s = re.sub(r"(?<=\d),(?=\d{3}\b)", "", s)
    if not s.strip() or "\\" in s or re.search(r"[A-Za-z]{2,}", re.sub(r"sqrt|cbrt|pi", "", s)):
        return None
    try:
        return sp.simplify(parse_expr(s, local_dict={**_OPT_SYMS, "pi": sp.pi, "sqrt": sp.sqrt, "cbrt": lambda v: sp.real_root(v, 3)},
                                      transformations=_OPT_TR, evaluate=True))
    except Exception:
        return None


def stepcheck_rows(rows, where, final=None):
    """Every equation in an answer slide's steps, worked: each '=' between two sides that can be
    computed must be true (exactly; '≈' to the places the right side shows), each '=' between two
    expressions in the same letters must be an identity, and the last number the steps arrive at
    must be the item's checked value. Returns (findings, how many equalities were verified)."""
    out = []; n = 0; last = None; reached = []
    for row in rows:
        for span in re.findall(r"\$([^$]+)\$", slotmark.strip(row).replace("\\$", "")):
            parts = re.split(r"(=|\\approx)", span)
            sides = parts[0::2]; ops = parts[1::2]
            vals = [_stepval(x) for x in sides]
            for a, op, b, sa, sb in zip(vals, ops, vals[1:], sides, sides[1:]):
                if a is None or b is None:
                    continue
                fa, fb = a.free_symbols, b.free_symbols
                if not fa and not fb:
                    n += 1
                    if op == "=":
                        good = sp.simplify(a - b) == 0
                    else:
                        m = re.fullmatch(r"\s*-?[\d,]*\.?(\d*)\s*", sb)
                        tol = sp.Rational(1, 2) * sp.Rational(1, 10) ** len(m.group(1)) if m else abs(b) / 200
                        good = abs(sp.N(a - b)) <= sp.N(tol) + 1e-12
                    if not good:
                        sign = "=" if op == "=" else "\u2248"
                        out.append(f"{where}: a step is not true \u2014 {sa.strip()} {sign} {sb.strip()}  ({sp.nsimplify(a)} against {sp.nsimplify(b)})")
                elif fa and fb and fa == fb and len(sides[0].strip()) > 1:
                    n += 1
                    if sp.simplify(a - b) != 0:
                        out.append(f"{where}: a step is not an identity \u2014 {sa.strip()} = {sb.strip()}")
            nums = [v for v in vals if v is not None and not v.free_symbols]
            reached += nums
            if nums:
                last = nums[-1]
    # the checked value is somewhere the steps arrive — usually their last number, but a check
    # may hold the 25 of an answer written 25π, or the 4 of "four times board 1"
    if final is not None and last is not None and not final.free_symbols:
        n += 1
        if not any(abs(sp.N(v - final)) <= 1e-9 for v in reached):
            out.append(f"{where}: the steps end at {sp.nsimplify(last)} and never reach the checked answer, {sp.nsimplify(final)}")
    return out, n


def stepcheck_lesson(L):
    """Ruling 39: every answer slide — each board's reveal and each Your Turn's — shows its steps.
    Returns (findings, slides with steps, slides in all, equalities verified). A slide without
    steps is a finding only where the course profile says STEPS = "required"; wrong steps always are."""
    out = []; have = 0; total = 0; eqs = 0
    def final_of(chk):
        try:
            return _ev(chk[2]) if chk and chk[0] == "eq" else None
        except Exception:
            return None
    items = [(f"{L['code']} board {i + 1}", q, q.get("check")) for i, q in enumerate(L.get("whiteboard", []))]
    items += [(f"{L['code']} {ex['title']} Your Turn", ex["your_turn"], ex.get("yt_check")) for ex in L.get("examples", []) if ex.get("your_turn")]
    for where, q, chk in items:
        total += 1
        rows = q.get("steps")
        if not rows:
            if getattr(C, "STEPS", "optional") == "required":
                out.append(f"{where}: ruling 39 \u2014 the answer slide shows no steps")
            continue
        have += 1
        if not (1 <= len(rows) <= 5):
            out.append(f"{where}: {len(rows)} steps \u2014 an answer slide carries one to five lines of working")
        f, k = stepcheck_rows(rows, where, final_of(chk))
        out += f; eqs += k
    return out, have, total, eqs


def build_lesson(L, outdir):
    os.makedirs(outdir, exist_ok=True)
    P = slotmark.strip_deep(L)          # the gates and every printed page read the spec without its colour marks
    figkit.units_agree(P)               # a figure in centimetres is not answered in square inches
    findings, n = mathcheck_lesson(P)
    d = distractorcheck_lesson(P)
    c = capcheck_lesson(P)
    r = rulingcheck_lesson(P) + balancecheck_lesson(P)
    st, have, total, eqs = stepcheck_lesson(P)
    print(f"mathcheck {L['code']}: {n} items checked, {len(findings)} findings")
    print(f"stepcheck {L['code']}: {have} of {total} answer slides show their steps, {eqs} equalities worked, {len(st)} findings")
    for f in findings + d + c + r + st:
        print("  ", f)
    if findings or d or c or r or st:
        raise SystemExit(f"{L['code']}: build refused")
    from . import plankit
    out = {}
    if C.BANK == "docx":
        out["bank"] = build_bank(P, P["bank"], "Question Bank", False, outdir)
        out["bank_key"] = build_bank(P, P["bank"], "Question Bank", True, outdir)
        out["add"] = build_bank(P, P["additional"], "Question Bank - Additional", False, outdir)
        out["add_key"] = build_bank(P, P["additional"], "Question Bank - Additional", True, outdir)
    if C.SET == "handout" and not L.get("no_set"):
        out["indep"] = build_bank(P, P["independent"], "Independent Set", False, outdir)
        out["indep_key"] = build_bank(P, P["independent"], "Independent Set", True, outdir)
    out["deck"] = build_deck(L, outdir)
    out["html"] = build_html_deck(L, outdir)
    out["te"] = build_te(L, out["deck"], outdir)
    out["plan"] = plankit.build_plan(P, out["deck"], outdir)
    if C.BANK == "md" and not L.get("review"):
        write_bank(P, outdir)
    return out


def write_bank(L, outdir):
    """The question bank is not a per-lesson document any more (Croix, 20 September: slides,
    teacher's edition, lesson plan, and nothing else). It accumulates in one markdown file per
    unit under Reference — ruling 26's home for it — so the questions are there when he wants
    them without four more files in every folder."""
    path = os.path.join(outdir, names.unit(L["unit"], "Question Bank", "md"))
    head = f"# Question bank \u2014 Unit {L['unit']}\n\n*Generated by the build. Not a handout: draw from it for re-teaching, an exit ticket or a quiz. Every answer here is the one the build re-derived.*\n"
    # one section per lesson, replaced in place on a rebuild (it used to append, and ten lessons
    # rebuilt thirty times made a 33-section bank)
    sections = {}
    if os.path.exists(path):
        cur = None
        for line in open(path).read().split("\n"):
            m = re.match(r"^## (\d+\.\d+)\b", line)
            if m:
                cur = m.group(1); sections[cur] = []
            if cur:
                sections[cur].append(line)
        sections = {k: "\n".join(v).rstrip() + "\n" for k, v in sections.items()}
    body = [f"## {L['code']}  {L['title']}  \u2014  {L['benchmark']}\n",
            f"\n**Variation.** {L['te']['variation']}\n"]
    for name, items in (("Bank", L["bank"]), ("Additional (same shapes, new numbers)", L["additional"]),
                        ("The six in-class questions (on the slide)", L.get("independent", []))):
        body.append(f"\n### {name}\n\n")
        n = 0
        for it in items:
            if it.get("heading"):
                body.append(f"\n*{it['heading']}*\n\n"); continue
            n += 1
            if it.get("parts"):
                body.append(f"{n}. {it['stem']}\n")
                for pp in it["parts"]:
                    body.append(f"   - **({pp['label']})** {pp['stem']}  \u2192  **{pp.get('answer','')}**"
                                + (f"  *({pp['why']})*" if pp.get("why") else "") + "\n")
            elif it.get("choices"):
                body.append(f"{n}. {it['stem']}\n")
                for k, ch in enumerate(it["choices"]):
                    mark = "**\u2713**" if k == it["correct"] else "\u2003"
                    err = (it.get("errors") or {}).get(chr(65 + k), "")
                    body.append(f"   - {mark} {chr(65+k)}. {ch}" + (f"  \u2014 *{err}*" if err else "") + "\n")
            else:
                body.append(f"{n}. {it['stem']}  \u2192  **{it.get('answer','')}**"
                            + (f"  *({it['why']})*" if it.get("why") else "") + "\n")
    sections[L["code"]] = "".join(body).lstrip("\n").rstrip() + "\n"
    order = sorted(sections, key=lambda c: tuple(int(x) for x in c.split(".")))
    open(path, "w").write(head + "".join("\n" + sections[c] for c in order))
    return path
