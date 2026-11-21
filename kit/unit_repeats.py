#!/usr/bin/env python3
"""Ruling 43 across a unit — what lib/repeatcheck.py says it does not see ("a repeat across lessons").
    python3 unit_repeats.py u11                   → one finding per line, a count line last; exit 1 on any
    python3 unit_repeats.py u11 --reserved        → for each paper question, what a lesson builder keeps off the lessons
    (--build DIR reads the unit folders of another build folder, as figure_sheets.py does)

(a) A question of the unit's papers (unit.py: the review, the practice test, every form) that a lesson already
    showed or asked: its expression, or its given numbers together with its answer, is on that lesson's warm-up,
    notes or examples (repeatcheck's rules A, C and D, the paper question read as a practice item of the lesson), or
    is a Your Turn, board or set question of the lesson (rules P and Q, the paper question read after the lesson's
    practice). A student who sat the lesson has seen the test question answered.
(b) The same warm-up question in two lessons; the same practice expression (P), or the same givens and answer (Q),
    in two lessons' Your Turns, boards, sets and question banks (ids 7.01/K3, 7.01/A3). (a) reads the banks too.

`repeat_ok=True` on an item (a paper question, a part, a board…) silences it, as in a lesson — with a comment beside
it saying why the repeat is the point. Ids are reader_copy.py's (11.01/B4, P/Q5b, R/Q7).

The rules are repeatcheck's own, run on lessons put together for the purpose — so what repeatcheck cannot see, this
cannot either: a problem re-asked in other words with other numbers that give the same working, and a figure's
geometry (only its labels are read). Read-only: writes nothing into the course.
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import reader_copy as rcopy   # noqa: E402  (the shared loading and walk)


def _head(item):
    """The item with its answer cut to what comes before " — ": "No — 49 + 64 = 113, and 11² = 121" answers No, and
    its 113 is the reason's (A7 6.T2's exterior angle of 113° is not that question's answer)."""
    a = item.get("answer")
    if isinstance(a, str) and " — " in a:
        return dict(item, answer=a.split(" — ")[0])
    return item


def _paper_questions(U):
    """[(id, item as a set question)] — every paper question, a part read with its question's stem."""
    out = []
    for prefix, name, base, secs in rcopy.papers(U):
        n = 0
        for sec in secs:
            for it in sec.get("items") or []:
                if it.get("heading"):
                    continue
                n += 1
                if it.get("parts"):
                    for pi, p in enumerate(it["parts"]):
                        q = dict(p, stem=(it.get("stem") or "") + "   " + (p.get("stem") or ""),
                                 repeat_ok=bool(p.get("repeat_ok") or it.get("repeat_ok")))
                        if not q.get("fig") and it.get("fig"):
                            q["fig"] = it["fig"]
                        out.append((f"{prefix}/Q{n}{p.get('label', rcopy.LETTERS[pi].lower())}", _head(q)))
                else:
                    out.append((f"{prefix}/Q{n}", _head(it)))
    return out


def _practice_only(L):
    """A lesson's practice items, and nothing it showed: its Your Turns (in their Examples' places), boards, set —
    and its two question banks, read as more set questions under their own ids (7.01/K3, 7.01/A3). The banks were
    not read at first: A7 7.07's bank question 5 was the Unit 7 Review's question 14 word for word, and 7.01's bank
    question 2 was the practice test's first table (21 Nov 2026)."""
    banks = []
    for tag, key in (("K", "bank"), ("A", "additional")):
        k = 0
        for it in L.get(key) or []:
            if it.get("heading"):
                continue
            k += 1
            banks.append(dict(_head(it), _id=f"{L.get('code', '?')}/{tag}{k}"))
    return dict(examples=[dict(your_turn=_head(e["your_turn"])) if e.get("your_turn") else {} for e in L.get("examples") or []],
                whiteboard=[_head(b) for b in L.get("whiteboard") or []],
                independent=[_head(s) for s in L.get("independent") or []] + banks)


def _labeler(parts):
    """parts: [(tag, practice-only lesson)] concatenated in order. Returns (the combined lesson, label → (tag, id))."""
    from lib import repeatcheck as rc
    comb = dict(examples=[], whiteboard=[], independent=[])
    owner = {}
    for tag, P in parts:
        code = tag
        for k, e in enumerate(P["examples"]):
            comb["examples"].append(e)
            owner[f"Your Turn {len(comb['examples'])}"] = (tag, f"{code}/YT{k + 1}")
        for k, b in enumerate(P["whiteboard"]):
            comb["whiteboard"].append(b)
            owner[f"whiteboard {len(comb['whiteboard'])}"] = (tag, f"{code}/B{k + 1}")
        k = 0
        for s in P["independent"]:
            comb["independent"].append(s)
            if not s.get("heading"):
                k += 1
                n = sum(1 for x in comb["independent"] if not x.get("heading"))
                owner[f"independent question {n}"] = (tag, s.get("_id") or f"{code}/I{k}")
    assert rc  # the rules are repeatcheck's
    return comb, owner


_WHAT = {"A": "asks {what}, which {where} showed", "C": "its answer {what} is written in {where}",
         "D": "is a problem {where} showed ({what})", "P": "asks {what}, as {where} does",
         "Q": "has {what}, as {where} does"}


def _short(s, n=110):
    s = " ".join(str(s).split())
    return s if len(s) <= n else s[:n - 1] + "…"


def findings(build, unit):
    from lib import repeatcheck as rc
    lessons, U = [], None
    for f in rcopy.spec_files(build, unit):
        top, kind = rcopy.load(f)
        if kind == "lesson":
            lessons.append(top)
        elif kind == "papers":
            U = top
    out = []
    paper = [(i, dict(q, _id=i)) for i, q in _paper_questions(U)] if U else []
    # (a) the papers against each lesson: what it showed (A, C, D), then what it asked (P, Q)
    for L in lessons:
        code = L.get("code", "?")
        shown_only = dict(code=code, warmup=L.get("warmup") or [], notes=L.get("notes") or [],
                          examples=[{k: v for k, v in e.items() if k != "your_turn"} for e in L.get("examples") or []],
                          whiteboard=[], independent=[q for _, q in paper])
        ids = {f"independent question {k + 1}": i for k, (i, _) in enumerate(paper)}
        blocks = {w: (ex, ca, lines) for w, ex, ca, _, lines in rc.shown(shown_only)}
        posed = {p["label"]: p["posed"] for p in rc.practice(shown_only)}
        seen = set()
        for rule, label, what, where in rc.repeats(shown_only):
            if rule not in ("A", "C", "D") or (label, where) in seen:
                continue
            if rule == "A" and not whole(posed[label], *blocks[where][:2]):
                continue            # one line of a system, one side of another equation: not the paper's problem
            if rule == "D" and not _story(what, blocks[where][2], paper_item(paper, ids[label])):
                continue            # the numbers met in a line of arithmetic (a check), not in a problem
            seen.add((label, where))
            out.append((ids[label], f"{code} {where}", rule, _WHAT[rule].format(what=_short(what), where="the lesson")))
        comb, owner = _labeler([(code, _practice_only(L)), ("paper", dict(examples=[], whiteboard=[], independent=[q for _, q in paper]))])
        posed = {p["label"]: p["posed"] for p in rc.practice(comb)}
        seen = set()
        for rule, label, what, where in rc.repeats(comb):
            if rule not in ("P", "Q"):
                continue
            a, b = owner.get(label), owner.get(where)
            if not a or not b or a[0] != "paper" or b[0] != code or (label, where) in seen:
                continue
            if rule == "P" and not whole(posed[label], set(posed[where]), {rc.canon(x) for x in posed[where]}):
                continue
            seen.add((label, where))
            out.append((a[1], b[1], rule, _WHAT[rule].format(what=_short(what), where="the lesson's practice")))
    # (b) two lessons: the warm-ups, then the practice
    for j, Y in enumerate(lessons):
        for X in lessons[:j]:
            for wi, wy in enumerate(Y.get("warmup") or []):
                for xi, wx in enumerate(X.get("warmup") or []):
                    why = same_warmup(wx, wy)
                    if why and not (wx.get("repeat_ok") or wy.get("repeat_ok")):
                        out.append((f"{Y['code']}/W{wi + 1}", f"{X['code']}/W{xi + 1}", "W", "is " + why))
            comb, owner = _labeler([(X["code"], _practice_only(X)), (Y["code"], _practice_only(Y))])
            posed = {p["label"]: p["posed"] for p in rc.practice(comb)}
            seen = set()
            for rule, label, what, where in rc.repeats(comb):
                if rule not in ("P", "Q"):
                    continue
                a, b = owner.get(label), owner.get(where)
                if not a or not b or a[0] != Y["code"] or b[0] != X["code"] or (label, where) in seen:
                    continue
                if rule == "P" and not whole(posed[label], set(posed[where]), {rc.canon(x) for x in posed[where]}):
                    continue
                if _item(Y, a[1]).get("repeat_ok") or _item(X, b[1]).get("repeat_ok"):
                    continue
                seen.add((label, where))
                out.append((a[1], b[1], rule, _WHAT[rule].format(what=_short(what), where="the other lesson")))
    return out, lessons, paper


def whole(posed, exprs, canons):
    """Across lessons a repeat is the whole problem: EVERY expression the question poses was there, not one line of a
    system (y = ½x − 1 beside another line) or one side of another equation (¼(8x + 12) = x + 9 against = 2v − 1).
    repeatcheck, inside one lesson, refuses on any one of them; across a unit that is the same topic, not the same problem."""
    from lib import repeatcheck as rc
    return all(x in exprs or rc.canon(x) in canons for x in posed if rc.ops(x) >= 1)


def paper_item(paper, iid):
    return next(q for i, q in paper if i == iid)


def _prose(line):
    """A line with words in it, outside its mathematics and its \\text{Check:} — a problem, not a computation."""
    import re
    t = re.sub(r"\$[^$]*\$", " ", str(line).replace("\\$", " "))
    t = re.sub(r"\\text\{[^}]*\}|\\[a-zA-Z]+", " ", t)
    t = re.sub(r"\b(?:Check|check|so|and|the|is|both|sides)\b", " ", t)
    return bool(re.search(r"[A-Za-z]{3,}", t))


def _story(what, lines, item):
    """Rule D across a unit: the givens and the answer met in a line — or, for the block form, in the block's
    lines — that is a problem in words, not only in a line of arithmetic such as a check."""
    from lib import repeatcheck as rc
    if not what.startswith("its numbers "):
        return _prose(what)
    given = rc.numbers(" ".join(rc._strs(item.get("stem")))) - rc.PI_NUMBERS
    return any(_prose(ln) and len(given & rc.numbers(ln)) >= 2 for ln in lines)


def _item(L, iid):
    kind = iid.split("/")[1]
    if kind.startswith("YT"):
        return (L["examples"][int(kind[2:]) - 1].get("your_turn") or {})
    if kind.startswith("B"):
        return L["whiteboard"][int(kind[1:]) - 1]
    if kind[0] in "KA":
        bank = [s for s in L.get("bank" if kind[0] == "K" else "additional") or [] if not s.get("heading")]
        return bank[int(kind[1:]) - 1]
    six = [s for s in L.get("independent") or [] if not s.get("heading")]
    return six[int(kind[1:]) - 1]


def same_warmup(a, b):
    """Why two warm-up questions are the same question, or ''."""
    from lib import repeatcheck as rc
    sa, sb = a.get("stem") or "", b.get("stem") or ""
    if rc.norm(sa).lower() == rc.norm(sb).lower():
        return "the same question, word for word"
    na, nb = rc.numbers(" ".join(rc._strs(a.get("answer")))), rc.numbers(" ".join(rc._strs(b.get("answer"))))
    pa, pb = set(rc.pieces(sa)), set(rc.pieces(sb))
    if pa and pa == pb and na == nb:
        return "the same expression, " + _short(" and ".join(sorted(pa)), 80) + ", with the same answer"
    ga = rc.numbers(sa) | set(rc.numbers(" ".join(rc.figtext(a.get("fig")))))
    gb = rc.numbers(sb) | set(rc.numbers(" ".join(rc.figtext(b.get("fig")))))
    if not pa and not pb and len(ga) >= 2 and ga == gb and na and na == nb:
        return "the same numbers, " + ", ".join(sorted(ga)) + ", and the same answer, " + ", ".join(sorted(na))
    return ""


def reserved(paper):
    """[(id, expressions, given numbers, answer numbers)] for every paper question."""
    from lib import repeatcheck as rc
    P = rc.practice(dict(independent=[q for _, q in paper]))
    return [(i, p["posed"], sorted(p["given"]), sorted(p["got"])) for (i, _), p in zip(paper, P)]


def main(argv):
    opts, args, it = {}, [], iter(argv)
    for a in it:
        if a == "--build":
            opts[a] = next(it, None)
        elif a == "--reserved":
            opts[a] = True
        else:
            args.append(a)
    if len(args) != 1 or args[0].startswith("--"):
        print(__doc__)
        return 2
    unit = args[0]
    build = rcopy.setup(opts.get("--build"))
    out, lessons, paper = findings(build, unit)
    if opts.get("--reserved"):
        for i, ex, giv, got in reserved(paper):
            print(f"{i}:  expressions {', '.join(ex) or '—'}  ·  given {', '.join(giv) or '—'}  ·  answer {', '.join(got) or '—'}")
        print(f"{len(paper)} paper questions; a lesson of {unit} keeps their expressions off its slides, and never shows "
              f"a question's given numbers together with its answer")
        return 0
    for a, b, rule, say in out:
        print(f"{a}  ·  {b}  ·  ruling 43 ({rule}): {a} {say}")
    print(f"{len(out)} cross-unit repeats in {unit} ({len(lessons)} lessons, {len(paper)} paper questions)")
    return 1 if out else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
