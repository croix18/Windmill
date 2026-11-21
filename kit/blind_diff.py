#!/usr/bin/env python3
"""A blind solver's answers against the key.
    python3 blind_diff.py key.json answers.json        (key.json from student_view.py; answers.json is {id: "answer"})

For every id of the key: agree, DIFFER, or look (cannot be compared by rule). The DIFFER and look rows are printed as
a table — id, the question's first 80 characters, the key, the solver's answer — and a count line last. Exit 1 on any
DIFFER: either the solver is wrong or the key is, and Rule 0 says find out which before the unit ships.

How answers are compared:
  - a choice item (key `correct`): the letters, as a set (a select-all needs exactly its keyed letters). A solver who
    wrote a value instead of a letter is matched to the choice that value is.
  - a written board: always look.
  - otherwise the key's headline (what comes before " — ", without remarks in brackets such as "(both $60)") and the
    solver's answer are read for: yes / no; no solution / infinitely many / one solution; and their numbers and
    expressions, after normalizing — fractions, mixed numbers, decimals and percents are values (1/2 = 0.5 = ½), √n is
    a value, units, degree signs, dollar signs and "x =" are dropped, a point (a, b) keeps its order. Expressions and
    equations in letters are compared with sympy where both sides parse (y = 7x + 15 and y=15+7x agree). Where the key
    says ≈, "about", "estimate" or "nearest", a decimal is matched to its last place.
  - the solver gave some of the key's values and nothing else: look. A value the key does not have: DIFFER.

What it cannot see: whether a sentence answer is right (look), and a solver who reaches the key's number by a wrong
route. Prose in the key after " — " is the key's reason, not compared.
"""
import json
import re
import sys

LETTERS = "ABCDEFGHIJ"
_SUP = str.maketrans("⁰¹²³⁴⁵⁶⁷⁸⁹⁻", "0123456789-")
_VULGAR = {"½": "1/2", "¼": "1/4", "¾": "3/4", "⅓": "1/3", "⅔": "2/3"}
_REL = r"(?:=|<|>|≤|≥|\\leq|\\geq|\\le|\\ge)"


def clean(s):
    """Typography away: TeX to plain, unicode operators to ASCII, money and degree signs and units' marks out."""
    s = str(s)
    s = s.replace("\\$", " ").replace("$", " ")
    s = re.sub(r"\bsqrt\s*(?=\(|\d)", "√", s)
    s = re.sub(r"\\[dt]?frac\{([^{}]*)\}\{([^{}]*)\}", r"(\1)/(\2)", s)
    s = re.sub(r"\\sqrt\{([^{}]*)\}", r"√(\1)", s)
    for a, b in (("\\left", ""), ("\\right", ""), ("\\cdot", "*"), ("\\times", "*"), ("\\div", "/"), ("\\pi", "π"),
                 ("\\approx", "≈"), ("\\leq", "≤"), ("\\geq", "≥"), ("\\le", "≤"), ("\\ge", "≥"), ("\\neq", "≠"),
                 ("\\,", ""), ("\\;", " "), ("\\ ", " "), ("\\!", ""), ("{,}", ","), ("\\text", ""), ("\\mathrm", ""),
                 ("−", "-"), ("–", "-"), ("·", "*"), ("×", "*"), ("÷", "/"), ("°C", " "), ("°F", " "), ("°", " "),
                 ("%", " "), ("\u00a0", " ")):
        s = s.replace(a, b)
    for a, b in _VULGAR.items():
        s = re.sub(r"(\d)" + a, r"\1 " + b, s).replace(a, b)
    s = re.sub(r"\^\{([^{}]*)\}", r"^(\1)", s)
    s = re.sub("[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]+", lambda m: "^(" + m.group(0).translate(_SUP) + ")", s)
    s = re.sub(r"(?<=\d),(?=\d{3}(?!\d))", "", s)          # 1,369 is one number; (4, 3) is two
    s = s.replace("{", "(").replace("}", ")")
    return " ".join(s.split())


def headline(key):
    """The key's answer without its reason: before " — " (unless that leaves nothing comparable), without remarks."""
    s = str(key)
    head = re.split(r"\s+—\s+|\s+--\s+", s)[0]
    head = re.sub(r"\(([^()]*[A-Za-z][^()]*)\)", " ", head)       # "(both $60)", "(exactly √181 m)", "(h = 4)"
    return head


def _opt(s):
    """The remarks in brackets that carry another form of the answer: "(√37)", "(exactly √181 m)", "(x = 0)"."""
    return " ".join(re.findall(r"\(([^()]*)\)", re.split(r"\s+—\s+", str(s))[0]))


def category(s):
    t = s.lower()
    if re.search(r"infinitely many|the same line|every (?:value|number)|all (?:real )?numbers|always true", t):
        return "infinite"
    if re.search(r"no solution|\bnone\b|never|parallel", t):
        return "none"
    if re.search(r"^\s*yes\b", t):
        return "yes"
    if re.search(r"^\s*no\b", t):
        return "no"
    if re.search(r"one solution|^\s*one\b", t):
        return "one"
    return None


_NUM = re.compile(r"(?<![\w.])(-\s?)?(√\(?\d+(?:\.\d+)?\)?|\d+\s+\d+/\d+|\(\d+\)/\(\d+\)|\d+/\d+|\d+(?:\.\d+)?|\.\d+)(?![\w(])")


def _value(tok):
    import sympy as sp
    neg = tok.startswith("-")
    t = tok.lstrip("- ").replace("(", "").replace(")", "")
    if t.startswith("√"):
        v = sp.sqrt(sp.Rational(t[1:]))
    elif " " in t:
        w, f = t.split()
        v = sp.Integer(w) + sp.Rational(f)
    else:
        v = sp.Rational(t)
    return -v if neg else v


def segments(s):
    """Split an answer into its parts: at ; , "and" — but not inside a point's brackets."""
    out, depth, cur = [], 0, ""
    for ch in s:
        depth += ch == "("
        depth -= ch == ")"
        if depth == 0 and ch in ",;":
            out.append(cur)
            cur = ""
        else:
            cur += ch
    out.append(cur)
    res = []
    for o in out:
        res += re.split(r"\s+and\s+|\s+against\s+|\s+or\s+", o)
    return [r.strip() for r in res if r.strip()]


def read(s):
    """(numbers, expressions, points) in an answer: [sympy values], [sympy expressions or equations], [(x, y)]."""
    s = clean(s)
    s = re.sub(r"\b(?:about|approximately|exactly|nearly)\b", " ", s, flags=re.I)
    nums, exprs, points = [], [], []
    for p in re.finditer(r"\(\s*(-?\s?[\d.√/()]+)\s*,\s*(-?\s?[\d.√/()]+)\s*\)", s):
        try:
            points.append((_value(p.group(1).replace(" ", "")), _value(p.group(2).replace(" ", ""))))
        except Exception:
            pass
    s_np = re.sub(r"\(\s*-?\s?[\d.√/()]+\s*,\s*-?\s?[\d.√/()]+\s*\)", " ", s)
    for seg in segments(s_np):
        seg = re.sub(r"[A-Za-z]{2,}", " ", seg)                     # words: units, "both", "weeks", "After"
        seg = re.sub(r"(?<=\d)\s+[A-Za-z](?=\s*$|\s+[^A-Za-z(])", " ", seg)   # a one-letter unit: 13.5 m
        seg = re.sub(r"[:≈~]", " ", seg)
        seg = re.sub(r"^\s*[A-Za-z]\s*" + _REL, " ", seg)            # x = 7  →  7
        seg = re.sub(_REL + r"\s*[A-Za-z]\s*(?=" + _REL + r")", " ", seg)   # 5 < x < 19  →  5 < 19
        seg = seg.strip(" .")
        if re.search(r"[A-Za-z]", seg):
            e = _sym(seg)
            if e is not None:
                exprs.append(e)
            else:
                exprs.append(seg)                                    # unreadable: kept as text
            continue
        for m in _NUM.finditer(seg):
            try:
                nums.append(_value(m.group(0).replace(" ", "") if " " not in m.group(2) else (m.group(1) or "") + m.group(2)))
            except Exception:
                pass
    return nums, exprs, points


def _sym(seg):
    """An expression or an equation in letters, as sympy reads it, or None."""
    import sympy as sp
    from sympy.parsing.sympy_parser import parse_expr, standard_transformations, implicit_multiplication_application, convert_xor
    tr = standard_transformations + (implicit_multiplication_application, convert_xor)
    t = seg.replace("√", "sqrt").replace("π", "pi").strip()
    if re.search(r"[<>≤≥≠]", t):
        return None
    try:
        sides = [parse_expr(x, transformations=tr) for x in t.split("=")]
    except Exception:
        return None
    if len(sides) == 1:
        return sides[0]
    if len(sides) == 2:
        return sp.Eq(sides[0], sides[1], evaluate=False)
    return None


def _same_expr(a, b):
    import sympy as sp
    if isinstance(a, str) or isinstance(b, str):
        return a == b
    try:
        if isinstance(a, sp.Equality) != isinstance(b, sp.Equality):
            return False
        if isinstance(a, sp.Equality):
            da, db = sp.expand(a.lhs - a.rhs), sp.expand(b.lhs - b.rhs)
            if sp.simplify(da - db) == 0 or sp.simplify(da + db) == 0:
                return True
            q = sp.simplify(da / db) if db != 0 else None
            return q is not None and q.is_number and q != 0
        return sp.simplify(a - b) == 0
    except Exception:
        return False


def _tol(key_text, question):
    """How near a solver's number must be to a key's: exact, unless the key or its question says it is rounded."""
    t = (key_text or "") + " " + (question or "")
    if re.search(r"\babout\b|estimate", t, re.I):
        return 1.0
    if re.search(r"≈|\\approx|nearest|round", t, re.I):
        return 0.5
    return 0.0


def _places(v_text):
    m = re.search(r"\.(\d+)", v_text)
    return len(m.group(1)) if m else 0


def _match(s, k, tol, kplaces):
    try:
        if tol == 0.0:
            return bool(abs(float(s - k)) < 1e-9)
        return abs(float(s - k)) <= tol * 10 ** (-kplaces) + 1e-9
    except Exception:
        return False


def compare_value(key, ans, question=""):
    """'agree', 'DIFFER' or 'look' for an answer that is not a choice."""
    head, opt = headline(key), _opt(key)
    ahead, aopt = headline(ans), _opt(ans)
    kc, ac = category(head), category(ahead)
    if kc in ("yes", "no"):
        return ("agree" if ac == kc else "DIFFER") if ac in ("yes", "no") else "look"
    if kc in ("none", "infinite") or ac in ("none", "infinite"):
        if kc != ac:
            return "DIFFER" if (kc or ac) and (kc in ("none", "infinite", "one") or read(head)[0] or read(head)[2]) else "look"
        return "agree"
    try:
        kn, ke, kp = read(head)
        on, oe, op = read(opt) if opt else ([], [], [])
        an, ae, ap = read(ahead)
        if aopt and not (an or ae or ap):
            an, ae, ap = read(aopt)
    except Exception:
        return "look"
    if kc == "one" and ac == "one" and not (kn or ke or kp):
        return "agree"
    try:
        pass
    except Exception:
        return "look"
    if not (kn or ke or kp):
        return "look"
    if not (an or ae or ap):
        return "look"
    tol = _tol(str(key), question)
    places = max([_places(x) for x in re.findall(r"\d+\.\d+", clean(head))] or [0])
    # points: in order
    if kp or ap:
        if kp and ap:
            hit = [any(_match(a[0], k[0], tol, places) and _match(a[1], k[1], tol, places) for k in kp) for a in ap]
            if all(hit) and len(ap) == len(kp) and not an and not ae:
                return "agree"
            if not all(hit):
                return "DIFFER"
            return "look"
        if kp and len(an) == 2 and len(kp) == 1 and _match(an[0], kp[0][0], tol, places) and _match(an[1], kp[0][1], tol, places):
            return "agree"                              # "x = 4, y = −2" for (4, −2)
        if ap and len(kn) == 2 and len(ap) == 1 and _match(ap[0][0], kn[0], tol, places) and _match(ap[0][1], kn[1], tol, places):
            return "agree"
        return "look"
    # expressions: when the key is expressions, the solver's must be the same ones
    if ke and not kn:
        if any(isinstance(e, str) for e in ke + ae):
            return "look"
        if len(ae) == len(ke) and all(any(_same_expr(a, k) for k in ke) for a in ae) and not an:
            return "agree"
        if ae and not all(any(_same_expr(a, k) for k in ke) for a in ae):
            return "DIFFER"
        return "look"
    # numbers: each of the solver's must be one of the key's (or of the key's other forms); all of the key's given
    pool = kn + on
    hit = [any(_match(a, k, tol, places) for k in pool) for a in an]
    if not all(hit):
        return "DIFFER"
    covered = all(any(_match(a, k, tol, places) or _match(k, a, tol, places) for a in an) for k in kn)
    if not covered and len(kn) == 1 and on and an and all(any(_match(a, o, tol, places) for o in on) for a in an):
        covered = True                                  # "√181" for "13.5 m (exactly √181 m)": the key's other form
    if covered and all(any(_same_expr(a, k) for k in ke) for a in ae):
        return "agree"
    return "look"


def solver_letters(ans):
    head = re.split(r"\s+—\s+|\s+--\s+|:", str(ans))[0]
    return sorted(set(re.findall(r"(?<![A-Za-z])([A-J])(?![A-Za-z])", head)))


def compare(entry, ans):
    if ans is None or str(ans).strip() == "":
        return "look"
    kind = entry.get("kind", "")
    if kind == "board-written":
        return "look"
    if entry.get("correct"):
        got = solver_letters(ans)
        if not got and entry.get("choices"):
            got = sorted(LETTERS[i] for i, c in enumerate(entry["choices"]) if compare_value(c, ans) == "agree")
        if not got:
            return "look"
        return "agree" if got == sorted(entry["correct"]) else "DIFFER"
    if entry.get("answer") is None:
        return "look"
    return compare_value(entry["answer"], ans, entry.get("question", ""))


def main(argv):
    if len(argv) != 2:
        print(__doc__)
        return 2
    key = json.load(open(argv[0], encoding="utf-8"))
    answers = json.load(open(argv[1], encoding="utf-8"))
    rows, counts, missing = [], {"agree": 0, "DIFFER": 0, "look": 0}, 0
    for qid, entry in key.items():
        ans = answers.get(qid)
        missing += ans is None
        verdict = compare(entry, ans)
        counts[verdict] += 1
        if verdict != "agree":
            k = ", ".join(entry["correct"]) if entry.get("correct") else entry.get("answer")
            rows.append((verdict, qid, (entry.get("question") or "")[:80], str(k), "(no answer)" if ans is None else str(ans)))
    rows.sort(key=lambda r: (r[0] != "DIFFER",))
    if rows:
        w = [max(len(r[i]) for r in rows) for i in range(5)]
        w = [min(x, 80) for x in w]
        print(" | ".join(h.ljust(w[i]) for i, h in enumerate(("", "id", "question", "key", "solver"))))
        for r in rows:
            print(" | ".join(str(c)[:80].ljust(w[i]) for i, c in enumerate(r)))
    extra = [q for q in answers if q not in key]
    if extra:
        print(f"answers for ids the key does not have: {', '.join(extra[:20])}{' …' if len(extra) > 20 else ''}")
    print(f"{len(key)} ids: {counts['agree']} agree, {counts['DIFFER']} DIFFER, {counts['look']} look"
          + (f" ({missing} with no answer)" if missing else ""))
    return 1 if counts["DIFFER"] else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
