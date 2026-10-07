"""Unit-wide documents from one spec. What a unit ships is read off the spec, not the course:

  a `reference` and a `review`            → Reference Sheet, Unit Review (+ Key)
  `assessment.sections` alone             → one Unit Assessment (+ Key)            — the single paper
  `assessment.forms` (A, B, practice),    → every form with its Key and its Worked Answers copy
     or `sections` + `practice`             (rulings 32 and 33)                    — the parallel forms

Every item goes through the same mathcheck / distractorcheck / capcheck as the lesson items; the
point ledger is asserted against the declared total and the per-benchmark Score Tracker; parallel
forms are checked position for position, and no question may share an answer across forms.
"""
import os, itertools
from . import names
from .dockit import Doc, GRAY, RED
from .lessonbuild import (mathcheck_item, _flatten, distractorcheck_lesson, capcheck_lesson, arrowcheck,
                          balancecheck_lesson, COURSE, PREFIX, _fmt_q, _ev)
from . import slotmark
from . import figkit

# Ruling 33 (24 September): a unit test ships as Form A and Form B, plus the practice test — three
# parallel forms, no number lining up. A spec may give `assessment.forms = {"A": sections,
# "B": sections, "practice": sections}`; the older `sections` + `practice` pair still builds.
TEST_FORMS = ("A", "B")

# Rulings on the assessment, in the words the student and the key read:
#   27  one paper over two periods    19  follow-through credit    18  the transfer flag on the key
TWO_DAY_LINE = ("This assessment runs over two class periods. Stop when the period ends; you "
                "will continue from where you stopped.")
FOLLOW_THROUGH = ("If an earlier part is wrong, a later part still earns its point when the "
                  "right operation is applied to your own earlier answer — but only if that "
                  "work is on the page.")
TRANSFER_FLAG = ("TRANSFER ITEM — not on the practice test. Same benchmark, a surface nobody "
                 "rehearsed.")
CONTINUES, FOLLOW_THROUGH_STUDENT = TWO_DAY_LINE, FOLLOW_THROUGH


def has_forms(A):
    return "forms" in A or "practice" in A


def unit_forms(A):
    if "forms" in A:
        return dict(A["forms"])
    return {"test": A["sections"], "practice": A["practice"]}


def form_words(form):
    """(document label, subtitle fragment, is_test) for a form key."""
    if form == "practice":
        return "Practice Test", "", False
    if form == "test":
        return "Unit Assessment", "", True
    return "Unit Assessment", f"Form {form}", True


UNSCORED_NOTE = ("HOW TO USE THIS.   This review covers every learning target from the unit — more than the "
                 "assessment does. Work it in parts. If you miss two or more in a part, that part is where to "
                 "spend your study time. The reference sheet has everything you need for each part.")


# ---------------------------------------------------------------- checks
def _items(groups):
    out = []
    for g in groups:
        for it in g:
            if it.get("heading") or it.get("table_only"):
                continue
            out.append(it)
    return out


def check_unit(U):
    """Every value re-derived by sympy; every wrong option a named, cited error; the keyed letters
    spread. On parallel forms, every form is checked."""
    findings = []
    n = 0
    A = U["assessment"]
    # the unit's title has one home (course.py UNITS): every unit-wide file is named from it
    if names.unit_title(U["unit"]) != U["title"]:
        findings.append(f"U{U['unit']}: unit.py's title {U['title']!r} is not course.py UNITS[{U['unit']}] "
                        f"{names.unit_title(U['unit'])!r} — the papers and their file names would disagree")
    if has_forms(A):
        by = {k: _items([s["items"] for s in v]) for k, v in unit_forms(A).items()}
    else:
        by = {"assessment": _items([sec["items"] for sec in A["sections"]])}
    if U.get("review"):
        by = {"review": _items([p["items"] for p in U["review"]]), **by}
    for label, items in by.items():
        for i, it in enumerate(items):
            for f in _flatten(it):
                n += 1
                findings += mathcheck_item(f, f"U{U['unit']} {label}[{i}]")
    if has_forms(A):
        everything = [it for items in by.values() for it in items]
        pseudo = {"code": f"{U['unit']}.U", "bank": everything, "additional": [], "te": {}}
        findings += distractorcheck_lesson(pseudo)
        findings += capcheck_lesson(pseudo)
        for label, items in by.items():           # each paper is its own key; none may be guessable
            findings += balancecheck_lesson({"code": f"{U['unit']}.U {label}", "bank": items})
    else:
        pseudo = {"code": f"{U['unit']}.U", "bank": by.get("review", []), "additional": by["assessment"],
                  "te": {"reference": U.get("reference")}}
        findings += distractorcheck_lesson(pseudo)
        findings += capcheck_lesson(pseudo)
        findings += balancecheck_lesson(pseudo)
    # ruling 42: no arrow on a paper or a reference sheet either
    for part in ("review", "assessment", "reference"):
        findings += arrowcheck(U.get(part), part, f"U{U['unit']}")
        from . import figwords
        findings += figwords.check({part: U.get(part)}, f"U{U['unit']}")      # ruling 44: words and picture agree
    return findings, n


# ---------------------------------------------------------------- reference sheet
def build_reference(U, outdir):
    eyebrow = f"{COURSE}  ·  Unit {U['unit']}"
    doc = Doc(eyebrow, "Reference Sheet", f"{U['title']}  —  keep this in your binder")
    doc.instruction(U["reference_intro"])
    for sec in U["reference"]:
        if sec.get("not_sci"):
            pass
        doc.section(sec["title"], sec.get("right", ""))
        for block in sec["blocks"]:
            if isinstance(block, str):
                doc.para(block, before=3, after=4)
            elif block.get("table"):
                widths, rows = block["table"]
                # keep=True: a reference table is read as one thing, so it never straddles a page
                doc.table(widths, rows, header=block.get("header", True), size=block.get("size", 10.5),
                          align_center=True, keep=True)
            elif block.get("bullets"):
                for b in block["bullets"]:
                    doc.para("•   " + b, before=1, after=2, indent=360, hanging=360)
            elif block.get("vocab"):
                for term, dfn in block["vocab"]:
                    doc.para(f"__{term}__   —   {dfn}", before=2, after=3, indent=360, hanging=360)
    name = names.unit(U["unit"], "Reference Sheet", "docx")
    path = os.path.join(outdir, name)
    doc.save(path)
    return path


# ---------------------------------------------------------------- unit review
def build_review(U, outdir, key):
    eyebrow = f"{COURSE}  ·  Unit {U['unit']}"
    doc = Doc(eyebrow, f"Unit {U['unit']} Review", U["title"], key=key)
    doc.instruction("Show your work. Circle your final answer.")
    doc.para(UNSCORED_NOTE, size=9.5, italic=True, color=GRAY, before=0, after=8)
    for part in U["review"]:
        n_q = len([i for i in part["items"] if not i.get("heading")])
        right = f"{part['lessons']}   ·   {n_q} questions"
        if key:  # benchmark codes never print on a student page
            right = f"{part['lessons']}   ·   {part['benchmark']}   ·   {n_q} questions"
        doc.section(f"PART {part['letter']}.   {part['title']}", right)
        for it in part["items"]:
            if it.get("heading"):
                doc.heading(it["heading"])
                continue
            it2 = dict(it)
            if key and it.get("key_stem"):
                it2["stem"] = it["key_stem"]
            _fmt_q(doc, it2, key=key)
    name = names.unit(U["unit"], "Review", "docx", key=key)
    path = os.path.join(outdir, name)
    doc.save(path)
    return path


# ---------------------------------------------------------------- unit assessment
def _points(it):
    if it.get("parts"):
        return [1] * len(it["parts"])
    return 1


# ---- the single paper -------------------------------------------------------------------------
def paper_ledger(U):
    """Ruling 27: ONE paper, numbered straight through, no day sections.
    Returns (total, per_benchmark {bm: (question numbers, points)}, per_section, transfer_qs)."""
    total = 0; n = 0
    per_bm = {}; per_sec = []; transfer = []
    for sec in U["assessment"]["sections"]:
        spts = 0
        for it in sec["items"]:
            if it.get("heading"):
                continue
            n += 1
            if it.get("transfer"):
                transfer.append(n)
            p = _points(it); v = sum(p) if isinstance(p, list) else p
            spts += v
            qs, pts = per_bm.setdefault(sec["benchmark"], ([], 0))
            qs.append(n); per_bm[sec["benchmark"]] = (qs, pts + v)
        per_sec.append((sec["title"], spts)); total += spts
    return total, per_bm, per_sec, transfer


def build_paper(U, outdir, key):
    A = U["assessment"]
    total, per_bm, per_sec, transfer = paper_ledger(U)
    assert total == A["total"], f"assessment ledger {total} != declared {A['total']}"
    for bm, (qs, pts) in per_bm.items():
        assert A["tracker"][bm] == pts, f"tracker {bm}: declared {A['tracker'][bm]}, ledger {pts}"
    assert sum(A["tracker"].values()) == total
    # Ruling 18: exactly two transfer items on every unit assessment.
    assert len(transfer) == 2, f"ruling 18: {len(transfer)} transfer items, need exactly 2 (questions {transfer})"
    eyebrow = f"{COURSE}  ·  Unit {U['unit']}  ·  Assessment"
    sub = f"{total} points" + ("  ·  two periods; students continue the same paper" if key else "")
    doc = Doc(eyebrow, U["title"], sub, key=key)
    doc.instruction("Show your work. Circle your final answer.")
    doc.para(CONTINUES, size=10, bold=True, before=0, after=3)
    doc.para(FOLLOW_THROUGH_STUDENT, size=9.5, italic=True, color=GRAY, before=0, after=8)
    si = 0; n = 0
    for sec in A["sections"]:
        si += 1
        doc.section(f"{si}.  {sec['title']}", f"{per_sec[si - 1][1]} points")
        for it in sec["items"]:
            if it.get("heading"):
                doc.heading(it["heading"]); continue
            n += 1
            it2 = dict(it)
            if key and it.get("key_stem"):
                it2["stem"] = it["key_stem"]
            if key and it.get("transfer"):
                it2["why"] = (it.get("why", "") + "  " if it.get("why") else "") + "**" + TRANSFER_FLAG + "**"
            _fmt_q(doc, it2, key=key, points=_points(it), number=n)
    if key:
        doc.section("Score Tracker")
        doc.para(f"{total} points, one point per lettered part.  " + "  ·  ".join(f"Section {i + 1} — {p}" for i, (t, p) in enumerate(per_sec)),
                 size=10, before=2, after=6)
        rows = [["Benchmark", "Questions", "Possible", "Earned"]]
        for bm in A["tracker_order"]:
            qs, pts = per_bm[bm]
            rows.append([bm, ",  ".join(str(q) for q in qs), str(pts), ""])
        rows.append([{"text": "Total", "bold": True}, "", {"text": str(total), "bold": True}, ""])
        doc.table([2600, 3600, 1500, 1660], rows, header=True, size=10.5)
        doc.para(A["follow_through"], size=9.5, italic=True, color=GRAY, before=6, after=4)
        doc.para(f"Transfer items (ruling 18): questions {transfer[0]} and {transfer[1]}. Neither surface appears on the "
                 f"review or in any question bank.", size=9.5, italic=True, color=GRAY, before=2, after=4)
    name = names.unit(U["unit"], "Test", "docx", key=key)
    path = os.path.join(outdir, name)
    doc.save(path)
    return path


# ---- parallel forms ---------------------------------------------------------------------------
# Rulings, all enforced here:
#   5/19  one point per lettered part; follow-through credit, told to the student
#   14    labelled answer boxes allowed (the item's `space`)
#   18    exactly two TRANSFER items on the test, flagged on the key, never on the practice test
#   27    ONE paper over two periods: sections by benchmark, numbered straight through, no days
#   32    the WORKED ANSWERS copy that goes back to the class carries no codes, flags or tracker
#   33    Form A, Form B and the practice test: parallel, and no answer shared
def assessment_ledger(sections):
    """(total, per_benchmark {bm: (question numbers, points)}, per_section)."""
    total = 0; n = 0
    per_bm = {}; per_sec = []
    for sec in sections:
        spts = 0
        for it in sec["items"]:
            if it.get("heading"):
                continue
            n += 1
            p = _points(it); v = sum(p) if isinstance(p, list) else p
            spts += v
            qs, pts = per_bm.setdefault(sec["benchmark"], ([], 0))
            qs.append(n); per_bm[sec["benchmark"]] = (qs, pts + v)
        per_sec.append((sec["title"], spts)); total += spts
    return total, per_bm, per_sec


def _shape(sections):
    """The position-by-position shape of a form: points per question, in order."""
    out = []
    for sec in sections:
        for it in sec["items"]:
            if not it.get("heading"):
                v = _points(it); out.append(sum(v) if isinstance(v, list) else v)
    return out


def _transfer_positions(sections):
    pos = []; n = 0
    for s in sections:
        for it in s["items"]:
            if it.get("heading"):
                continue
            n += 1
            if it.get("transfer"):
                pos.append(n)
    return pos


def check_forms(A):
    """Every form is a true parallel of every other (ruling 16a), position for position. The two
    transfer items (ruling 18) sit at the same positions on every test form and never on the
    practice test."""
    f = []
    forms = unit_forms(A)
    prac = forms["practice"]
    tests = {k: v for k, v in forms.items() if k != "practice"}
    for k, secs in tests.items():
        if _shape(secs) != _shape(prac):
            f.append(f"form {k} is not parallel to the practice test: {_shape(secs)} vs {_shape(prac)}")
        tp = _transfer_positions(secs)
        if len(tp) != 2:
            f.append(f"ruling 18: form {k} carries exactly two transfer items, found {len(tp)}")
    tps = {k: tuple(_transfer_positions(v)) for k, v in tests.items()}
    if len(set(tps.values())) > 1:
        f.append(f"ruling 33: the transfer items sit at different positions across forms: {tps}")
    npr = len(_transfer_positions(prac))
    if npr:
        f.append(f"ruling 18: a transfer item may never appear on the practice test, found {npr}")
    return f


def _keyed_values(sections):
    """Per question position, the exact keyed value(s) of every part, from the check tuples."""
    out = []
    for s in sections:
        for it in s["items"]:
            if it.get("heading"):
                continue
            vals = []
            for part in _flatten(it):
                chk = part.get("check")
                if chk and chk[0] in ("eq", "val"):
                    try:
                        vals.append(_ev(chk[2]))
                    except Exception:
                        pass
                elif chk and chk[0] == "many":
                    for sub_ in chk[1:]:
                        if sub_[0] in ("eq", "val"):
                            try:
                                vals.append(_ev(sub_[2]))
                            except Exception:
                                pass
            out.append(vals)
    return out


def check_distinct(A):
    """Ruling 33: no question's keyed value on one form equals the same question's keyed value on
    any other form. Multiple-choice letters and verbal items carry no value and are skipped."""
    f = []
    forms = unit_forms(A)
    keyed = {k: _keyed_values(v) for k, v in forms.items()}
    for x, y in itertools.combinations(keyed, 2):
        for q, (vx, vy) in enumerate(zip(keyed[x], keyed[y]), 1):
            shared = [v for v in vx if any(v == w for w in vy)]
            if shared:
                f.append(f"ruling 33: question {q} has the same answer on forms {x} and {y}: {shared}")
    return f


def build_form(U, outdir, key, form="test", student=False):
    """student=True writes the copy that goes back to the class: the same answers, but no
    benchmark codes, no TRANSFER flag and no Score Tracker (ruling 32) — nothing about how a
    question was built is printed on a page a student holds."""
    A = U["assessment"]
    sections = unit_forms(A)[form]
    total, per_bm, per_sec = assessment_ledger(sections)
    assert total == A["total"], f"assessment ledger {total} != declared {A['total']}"
    for bm, (qs, pts) in per_bm.items():
        assert A["tracker"][bm] == pts, f"tracker {bm}: declared {A['tracker'][bm]}, ledger {pts}"
    assert sum(A["tracker"].values()) == total
    label, formword, is_test = form_words(form)
    what = "Assessment" if is_test else "Practice Test"
    eyebrow = f"{COURSE}  \u00b7  Unit {U['unit']}  \u00b7  {what}"
    sub = (formword + "  \u00b7  " if formword else "") + f"{total} points" + ("  \u00b7  two class periods" if is_test else "")
    doc = Doc(eyebrow, U["title"], sub, key=key, name_block=not student,
              banner="WORKED ANSWERS" if student else "ANSWER KEY")
    if is_test:
        doc.instruction(TWO_DAY_LINE)
    doc.instruction("Show your work. One point for each lettered part." + (("  " + A["pi_line"]) if A.get("pi_line") else ""))
    n = 0
    for si, sec in enumerate(sections):
        right = f"{per_sec[si][1]} points" + (f"   {sec['benchmark']}" if key and not student else "")
        doc.section(f"Part {si + 1}.  {sec['title']}", right)
        if any(it.get("parts") for it in sec["items"]):
            doc.para(FOLLOW_THROUGH, size=9.5, italic=True, color=GRAY, before=0, after=6)
        for it in sec["items"]:
            if it.get("heading"):
                doc.heading(it["heading"]); continue
            n += 1
            it2 = dict(it)
            if key and not student and it.get("transfer"):
                if it.get("parts"):          # the flag rides on the first part's reasoning line
                    ps = [dict(x) for x in it["parts"]]
                    ps[0]["why"] = (TRANSFER_FLAG + "  " + (ps[0].get("why") or "")).strip()
                    it2["parts"] = ps
                else:
                    it2["why"] = (TRANSFER_FLAG + "  " + (it.get("why") or "")).strip()
            _fmt_q(doc, it2, key=key, points=_points(it))
    if key and not student:
        doc.section("Score Tracker")
        rows = [["Benchmark", "Questions", "Possible", "Earned"]]
        for bm in A["tracker_order"]:
            qs, pts = per_bm[bm]
            rows.append([bm, ",  ".join(str(q) for q in qs), str(pts), ""])
        rows.append([{"text": "Total", "bold": True}, "", {"text": str(total), "bold": True}, ""])
        doc.table([2600, 3600, 1500, 1660], rows, header=True, size=10.5)
        doc.para(FOLLOW_THROUGH + "  Nothing is weighed and nothing is arguable: apply the "
                 "part's operation to the student's own earlier value and tick if that is what is written.",
                 size=9.5, italic=True, color=GRAY, before=6, after=4)
    kind = "Practice Test" if form == "practice" else ("Test" if form == "test" else f"Test Form {form}")
    name = names.unit(U["unit"], kind, "docx", key=key and not student, worked=student)
    path = os.path.join(outdir, name)
    doc.save(path)
    return path


def build_unit(U, outdir):
    U = slotmark.strip_deep(U)          # every unit document is a printed page: no colour marks
    figkit.units_agree(U)               # a figure in centimetres is not answered in square inches
    findings, n = check_unit(U)
    print(f"unitcheck U{U['unit']}: {n} items checked, {len(findings)} findings")
    for f in findings:
        print("  ", f)
    if findings:
        raise SystemExit("unit documents: build refused")
    A = U["assessment"]
    out = {}
    if U.get("reference"):
        out["reference"] = build_reference(U, outdir)
    if U.get("review"):
        out["review"] = build_review(U, outdir, key=False)
        out["review_key"] = build_review(U, outdir, key=True)
    if not has_forms(A):
        out["exam"] = build_paper(U, outdir, key=False)
        out["exam_key"] = build_paper(U, outdir, key=True)
        return out
    ff = check_forms(A) + check_distinct(A)
    for f in ff:
        print("  ", f)
    if ff:
        raise SystemExit("unit documents: build refused (forms)")
    for form in unit_forms(A):
        out[f"{form}"] = build_form(U, outdir, key=False, form=form)
        out[f"{form}_key"] = build_form(U, outdir, key=True, form=form)
        out[f"{form}_wa"] = build_form(U, outdir, key=True, form=form, student=True)   # ruling 32
    print(f"forms: {', '.join(unit_forms(A))} — parallel, transfer positions agree, no answer shared")
    return out
