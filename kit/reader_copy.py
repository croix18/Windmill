#!/usr/bin/env python3
"""A unit's decks and papers as plain text, for a reviewer to read instead of 400 slide images.
    python3 reader_copy.py u11                    → /tmp/reader/u11/11.01.md … and Unit 11 papers.md
    python3 reader_copy.py u11 --out DIR          → somewhere else
    python3 reader_copy.py u11 --teacher          → and the teacher-only prose (notes, glosses, wrong, why, te.say)
    (--build DIR reads the unit folders of another build folder, as figure_sheets.py does)

Each lesson is one file, in slide order: the title and target, the warm-up with its answers, the vocabulary, each
notes slide, each Example with its worked lines, each Your Turn with its steps and answer, each whiteboard question
with its choices, key, steps and named errors, the independent set with its key, the IXL line. The unit's papers
(the review, every form of the assessment, the reference sheet) are one more file. TeX is kept as the spec types it.

Every question has a stable id: 11.01/W2 (warm-up), 11.01/E1 (Example), 11.01/YT1 (Your Turn of Example 1),
11.01/B4 (whiteboard), 11.01/I3 (independent set, headings not counted); on the papers R/Q7 (the review, numbered
straight through as it prints), P/Q5b (the practice test), A/… and B/… (Forms A and B), T/… (a single test paper).
student_view.py, blind_diff.py and unit_repeats.py use the same ids.

A question with a picture says [figure: NNN.png] — the number figure_sheets.py gives that picture when it is run on
the same unit (python3 figure_sheets.py u11), so the reviewer can open it. [answer figure: …] is the picture the
answer slide shows instead; [key figure: …] the one the key prints instead.

What it cannot see: layout. A line that runs off a slide, a figure drawn small, an answer that overlaps — read the
built deck (contact_sheet.py) for those. It reads the specs, not the built files.

Read-only: writes nothing into the course. This file also holds the loading and the walk the other lean tools share.
"""
import contextlib
import glob
import io
import os
import re
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
LETTERS = "ABCDEFGHIJ"
_STEP_KIND = re.compile(r"^\s*\[(false|equation)\]\s*")     # lessonbuild.STEP_KIND: a step's declaration is not shown


# ------------------------------------------------------------------ loading (as figure_sheets.py loads)
def setup(build=None):
    """Put the build folder (then the kit) first on the path, as figure_sheets.py does; returns the build folder."""
    build = os.path.abspath(build or HERE)
    os.environ.setdefault("KIT_COURSE", os.path.join(build, "course.py"))
    for p in (HERE, build):
        while p in sys.path:
            sys.path.remove(p)
    sys.path[:0] = [build, HERE]
    return build


def spec_files(build, unit):
    """The unit's spec files in figure_sheets.py's order: the lessons, then review.py, then unit.py."""
    files = sorted(glob.glob(os.path.join(build, unit, "l[0-9]*.py")))
    return files + [p for p in (os.path.join(build, unit, "review.py"), os.path.join(build, unit, "unit.py")) if os.path.exists(p)]


def load(path):
    """(the spec dict with its slot marks stripped — the words as a student reads them, 'lesson' or 'papers')."""
    from lib import unitload, slotmark
    m = unitload.load(path, "s")
    raw = getattr(m, "L", None)
    if raw is not None:
        return slotmark.strip_deep(raw), "lesson"
    raw = getattr(m, "U", None)
    if raw is not None:
        return slotmark.strip_deep(raw), "papers"
    return None, None


def figure_numbers(build, unit):
    """{(spec file name, path, which): NNN} — the number figure_sheets.py gives each picture of the unit, read from its
    own walk (it is run with drawing switched off, into a scratch folder). `which` is fig, fig_a, fig_key or worked."""
    import figure_sheets
    from lib import figkit, mathimg
    keep = (figkit.draw, figkit.FIGS, figkit.INDEX, mathimg.FIGS, mathimg.INDEX)

    real = figkit.draw

    def no_draw(*a, **k):
        # only figure_sheets.py's own call is skipped: a unit's figs.py may draw while it loads, to measure (A7 u6)
        if sys._getframe(1).f_code is figure_sheets.main.__code__:
            raise RuntimeError("not drawn")
        return real(*a, **k)
    out = {}
    with tempfile.TemporaryDirectory() as tmp:
        figkit.draw = no_draw
        try:
            with contextlib.redirect_stdout(io.StringIO()):
                figure_sheets.main([unit, "--build", build, "--out", tmp])
        finally:
            figkit.draw, figkit.FIGS, figkit.INDEX, mathimg.FIGS, mathimg.INDEX = keep
        text = open(os.path.join(tmp, "items.txt"), encoding="utf-8").read()
    for line in text.splitlines():
        if not line.startswith("### ITEM "):
            continue
        parts = line.split(" — ")
        n = int(parts[0][len("### ITEM "):])
        fname = parts[1].split("/", 1)[1]
        tail = " — ".join(parts[3:])
        path = tail.split(" (")[0].strip()
        which = ("fig_a" if "WITH THE ANSWER" in tail else "fig_key" if "THE KEY PRINTS" in tail
                 else "worked" if "WITH THE WORKING" in tail else "fig")
        out[(fname, path, which)] = n
    return out


def draw_figures(build, unit, numbers, out):
    """Draw the unit's pictures with figure_sheets.py into a scratch folder and copy the ones numbered in `numbers`
    into `out` (a blind solver is given the question's pictures and never the answer's)."""
    import shutil
    import figure_sheets
    os.makedirs(out, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        with contextlib.redirect_stdout(io.StringIO()):
            figure_sheets.main([unit, "--build", build, "--out", tmp])
        for n in sorted(numbers):
            src = os.path.join(tmp, f"{n:03d}.png")
            if os.path.exists(src):
                shutil.copy(src, os.path.join(out, f"{n:03d}.png"))


# ------------------------------------------------------------------ the items, in slide order
def strs(o):
    if o is None:
        return []
    if isinstance(o, str):
        return [o]
    if isinstance(o, (list, tuple)):
        return [s for v in o for s in strs(v)]
    return [str(o)]


def step_text(r):
    return _STEP_KIND.sub("", r, count=1) if isinstance(r, str) else r


def bare_math(row):
    """lessonbuild._bare_math: a row that is one expression and nothing else."""
    r = row.replace("\\$", "").strip()
    return r.startswith("$") and r.endswith("$") and r.count("$") == 2


def ask_row(r):
    """A board row that begins ** is its ask, set bold on the slide (lessonbuild._wb_body strips the marks)."""
    if isinstance(r, str) and r.startswith("**"):
        body = r.lstrip("*")
        body = body[:-2] if body.endswith("**") else body
        return f"**{body.strip()}**"
    return r


def letters_of(correct):
    if correct is None:
        return []
    cs = correct if isinstance(correct, (list, tuple)) else [correct]
    return [LETTERS[i] for i in cs]


def _figs(fname, path, item, figmap):
    out = {}
    for k in ("fig", "fig_a", "fig_key"):
        if isinstance(item.get(k), dict):
            n = figmap.get((fname, path, k))
            out[k] = f"{n:03d}.png" if n else "(a picture figure_sheets.py did not number)"
    return out


def rec(id, kind, where, item, q, figs, answer=None, steps=None, choices=None, correct=None, check=None,
        errors=None, teacher=None, parts_of=None):
    return dict(id=id, kind=kind, where=where, item=item, q=q, figs=figs, answer=answer, steps=steps or [],
                choices=choices, correct=letters_of(correct), multi=isinstance(correct, (list, tuple)),
                check=check, errors=errors or {}, teacher=[t for t in (teacher or []) if t[1]], parts_of=parts_of)


def lesson_items(L, fname, figmap):
    """Every question a student answers in one lesson, in deck order: warm-up, Your Turns, boards, the set."""
    code, out = L.get("code", "?"), []
    for i, w in enumerate(L.get("warmup") or []):
        out.append(rec(f"{code}/W{i + 1}", "warmup", "Warm-Up", w, [w.get("stem", "")], _figs(fname, f"warmup[{i + 1}]", w, figmap),
                       answer=w.get("answer"), check=w.get("check"),
                       teacher=[("band", w.get("band")), ("source", w.get("source"))]))
    for i, ex in enumerate(L.get("examples") or []):
        yt = ex.get("your_turn")
        if not yt:
            continue
        ask = yt.get("ask", ex.get("ask") if all(bare_math(r) for r in yt.get("prompt") or []) else None)
        out.append(rec(f"{code}/YT{i + 1}", "yourturn", f"Your Turn (Example {i + 1})", yt, list(yt.get("prompt") or []) + ([f"**{ask}**"] if ask else []),
                       _figs(fname, f"examples[{i + 1}].your_turn", yt, figmap),
                       answer=yt.get("answer_latex") and f"${yt['answer_latex']}$" or yt.get("answer"),
                       steps=[step_text(s) for s in yt.get("steps") or []], check=ex.get("yt_check"),
                       teacher=[("note", yt.get("note")), ("gloss", yt.get("gloss"))]))
    for i, b in enumerate(L.get("whiteboard") or []):
        kind = b.get("kind", "free")
        q = ([f"${b['latex']}$"] if b.get("latex") else []) + [ask_row(r) for r in b.get("text") or []]
        out.append(rec(f"{code}/B{i + 1}", f"board-{kind}", f"Whiteboard {i + 1}", b, q, _figs(fname, f"whiteboard[{i + 1}]", b, figmap),
                       answer=b.get("answer_latex") and f"${b['answer_latex']}$" or b.get("answer"),
                       steps=[step_text(s) for s in b.get("steps") or []], choices=b.get("choices"),
                       correct=b.get("correct") if b.get("choices") else None, check=b.get("check"), errors=b.get("errors"),
                       teacher=[("hint", b.get("hint")), ("gloss", b.get("gloss")), ("unneeded (on purpose)", b.get("unneeded")),
                                ("note", b.get("note")), ("note on the reveal", b.get("note_a")), ("teacher's answer", b.get("te_answer")),
                                ("wrong", b.get("wrong")), ("repeat_ok", "yes" if b.get("repeat_ok") else None)]))
    n = 0
    for i, s in enumerate(L.get("independent") or []):
        if s.get("heading"):
            out.append(dict(heading=s["heading"], group="independent"))
            continue
        n += 1
        out.append(rec(f"{code}/I{n}", "independent", "Independent Set", s, [s.get("stem", "")], _figs(fname, f"independent[{i + 1}]", s, figmap),
                       answer=s.get("answer"), choices=s.get("choices"), correct=s.get("correct") if s.get("choices") else None,
                       check=s.get("check"), errors=s.get("errors"), teacher=[("why", s.get("why"))]))
    return out


FORM_PREFIX = {"practice": "P", "test": "T", "A": "A", "B": "B"}


def papers(U):
    """[(prefix, paper name, path of its sections, sections)] — the review, then every form of the assessment."""
    out = []
    if U.get("review"):
        out.append(("R", f"Unit {U.get('unit')} Review", "review", [dict(title=p.get("title"), items=p.get("items") or [],
                                                                           lessons=p.get("lessons"), benchmark=p.get("benchmark"))
                                                                      for p in U["review"]]))
    A = U.get("assessment") or {}
    if "forms" in A:
        for f, secs in A["forms"].items():
            out.append((FORM_PREFIX.get(f, f), "Practice Test" if f == "practice" else f"Test Form {f}", f"assessment.forms.{f}", secs))
    else:
        if A.get("sections"):
            out.append(("T", "Unit Test", "assessment.sections", A["sections"]))
        if A.get("practice"):
            out.append(("P", "Practice Test", "assessment.practice", A["practice"]))
    return out


def paper_items(U, fname, figmap):
    """Every question of every paper, numbered as it prints (straight through each paper, headings not counted)."""
    out = []
    for prefix, name, base, secs in papers(U):
        n = 0
        out.append(dict(paper=name, prefix=prefix))
        for si, sec in enumerate(secs):
            out.append(dict(section=sec.get("title"), right=sec.get("lessons") or sec.get("benchmark"), prefix=prefix))
            for ii, it in enumerate(sec.get("items") or []):
                path = (f"review[{si + 1}].items[{ii + 1}]" if prefix == "R" else f"{base}[{si + 1}].items[{ii + 1}]")
                if it.get("heading"):
                    out.append(dict(heading=it["heading"], group=prefix))
                    continue
                n += 1
                qid = f"{prefix}/Q{n}"
                figs = _figs(fname, path, it, figmap)
                if it.get("parts"):
                    out.append(rec(qid, "paper", name, it, [it.get("stem", "")], figs, teacher=[("why", it.get("why"))],
                                   parts_of=True))
                    for pi, p in enumerate(it["parts"]):
                        out.append(rec(f"{qid}{p.get('label', LETTERS[pi].lower())}", "paper-part", name, p, [p.get("stem", "")],
                                       _figs(fname, f"{path}.parts[{pi + 1}]", p, figmap), answer=p.get("answer"),
                                       choices=p.get("choices"), correct=p.get("correct") if p.get("choices") else None,
                                       check=p.get("check"), errors=p.get("errors"), teacher=[("why", p.get("why"))]))
                else:
                    out.append(rec(qid, "paper", name, it, [it.get("stem", "")], figs, answer=it.get("answer"),
                                   choices=it.get("choices"), correct=it.get("correct") if it.get("choices") else None,
                                   check=it.get("check"), errors=it.get("errors"),
                                   teacher=[("why", it.get("why")), ("transfer item", "yes" if it.get("transfer") else None)]))
    return out


def unit_model(build, unit):
    """([(spec file name, kind, spec, items)] for the whole unit, the figure numbers)."""
    figmap = figure_numbers(build, unit)
    out = []
    for f in spec_files(build, unit):
        top, kind = load(f)
        if top is None:
            continue
        fname = os.path.basename(f)
        out.append((fname, kind, top, lesson_items(top, fname, figmap) if kind == "lesson" else paper_items(top, fname, figmap)))
    return out, figmap


# ------------------------------------------------------------------ the reader copy
def _fig_line(figs, student=False):
    bits = [f"[figure: {figs['fig']}]"] if figs.get("fig") else []
    if not student:
        if figs.get("fig_a"):
            bits.append(f"[answer figure: {figs['fig_a']}]")
        if figs.get("fig_key"):
            bits.append(f"[key figure: {figs['fig_key']}]")
    return "  ".join(bits)


def _row(r):
    if isinstance(r, (tuple, list)):
        return f"{r[0]}  —  {r[1]}" if len(r) > 1 else str(r[0])
    return str(r)


def _teacher(lines, r, on):
    if on:
        for k, v in r["teacher"]:
            lines.append(f"    _{k}:_ {v}")


def _item_md(r, teacher, show_q=True):
    lines = []
    head = f"**{r['id']}**"
    q = [x for x in r["q"] if x]
    if show_q:
        if len(q) == 1 and not r["choices"]:
            lines.append(f"- {head}  {q[0]}")
        else:
            lines.append(f"- {head}")
            lines += [f"    {x}" for x in q]
    fl = _fig_line(r["figs"])
    if fl:
        lines.append(f"    {fl}")
    for k, c in enumerate(r["choices"] or []):
        mark = " (key)" if LETTERS[k] in r["correct"] else ""
        lines.append(f"    {'□' if r['multi'] else '○'} {LETTERS[k]}.  {c}{mark}")
    if r["steps"]:
        lines.append("    Steps:")
        lines += [f"      {s}" for s in r["steps"]]
    if r["answer"] is not None:
        lines.append(f"    Answer: {r['answer']}")
    for letter, e in sorted((r["errors"] or {}).items()):
        lines.append(f"    Error {letter}: {e}")
    _teacher(lines, r, teacher)
    return lines


def lesson_md(L, items, teacher=False, fname="", figmap=None):
    """One lesson's deck as text, in slide order."""
    code = L.get("code", "?")

    def by_fig(path, which="fig"):
        n = (figmap or {}).get((fname, path, which))
        return f"{n:03d}.png" if n else "(a picture figure_sheets.py did not number)"
    by = {r["id"]: r for r in items if "id" in r}
    md = [f"# {code} {L.get('title', '')}", "",
          f"{L.get('label') or 'Lesson ' + str(L.get('lesson_no', ''))} · Unit {L.get('unit')} · {L.get('benchmark', '')}",
          "", f"**Target:** {L.get('target', '')}", ""]
    if teacher:
        md += [f"_Benchmark:_ {L.get('benchmark_text', '')}", f"_Today:_ {L.get('today', '')}", ""]
    md += ["## Warm-Up", ""]
    for i, w in enumerate(L.get("warmup") or []):
        md += _item_md(by[f"{code}/W{i + 1}"], teacher)
    if teacher and L.get("warmup_note"):
        md += [f"    _warm-up note:_ {L['warmup_note']}"]
    if L.get("vocab") and L.get("vocab_slide", True):
        md += ["", "## Vocabulary", ""]
        md += [f"- **{t}** — {d}" for t, d in L["vocab"]]
    for i, n in enumerate(L.get("notes") or []):
        md += ["", f"## Notes {n.get('numeral', i + 1)} — {n.get('head', '')}  ({code}/N{i + 1})", ""]
        lettered = n.get("letters", True)
        k = 0
        for key in ("items", "table", "fig", "math", "text", "items2"):
            v = n.get(key)
            if not v:
                continue
            if key in ("items", "items2"):
                for it in v:
                    s = f"**{it[0]}** — {it[1]}" if isinstance(it, (tuple, list)) else str(it)
                    md.append(f"- {LETTERS[k].lower()}. {s}" if lettered else f"- {s}")
                    k += 1
            elif key == "table":
                rows = v[1] if isinstance(v, (tuple, list)) and len(v) == 2 else v
                for ri, row in enumerate(rows):
                    cells = [str(c.get("text", c) if isinstance(c, dict) else c) for c in (row if isinstance(row, (list, tuple)) else [row])]
                    md.append("| " + " | ".join(cells) + " |")
                    if ri == 0:
                        md.append("|" + "---|" * len(cells))
            elif key == "fig":
                md.append(f"[figure: {by_fig(f'notes[{i + 1}]')}]")
            elif key == "math":
                md += [f"    {m}" for m in v]
            elif key == "text":
                md += [str(t) for t in v]
        if teacher and n.get("note"):
            md.append(f"    _note:_ {n['note']}")
    for i, ex in enumerate(L.get("examples") or []):
        md += ["", f"## {ex.get('title', f'Example {i + 1}')}  ({code}/E{i + 1})", ""]
        md += [str(r) for r in ex.get("prompt") or []]
        if ex.get("fig"):
            md.append(f"[figure: {by_fig(f'examples[{i + 1}]')}]")
        if ex.get("ask"):
            md.append(f"**{ex['ask']}**")
        if teacher and ex.get("note_q"):
            md.append(f"    _note:_ {ex['note_q']}")
        for wi, w in enumerate(ex.get("worked") or []):
            md += ["", f"Worked{f' ({wi + 1})' if len(ex['worked']) > 1 else ''}:"]
            if w.get("lead"):
                md.append(f"**{w['lead']}**")
            if w.get("fig"):
                md.append(f"[figure: {by_fig(f'examples[{i + 1}].worked[{wi + 1}]', 'worked')}]")
            for r in w.get("rows") or []:
                if isinstance(r, (tuple, list)):
                    md.append(f"    ${r[0]}$" + (f"      _({r[1]})_" if teacher and len(r) > 1 and r[1] else ""))
                else:
                    md.append(f"    {r}")
            for it in w.get("items") or []:
                md.append(f"    {it}")
            if w.get("answer"):
                md.append(f"    Answer: {w['answer']}")
            if teacher and w.get("note"):
                md.append(f"    _note:_ {w['note']}")
        if ex.get("your_turn"):
            r = by[f"{code}/YT{i + 1}"]
            md += ["", f"### Your Turn  ({code}/YT{i + 1})"] + [f"    {x}" for x in r["q"]]
            md += _item_md(r, teacher, show_q=False)
    md += ["", "## Whiteboards", ""]
    for i, b in enumerate(L.get("whiteboard") or []):
        r = by[f"{code}/B{i + 1}"]
        md += [f"### {code}/B{i + 1}  ({b.get('kind', 'free')})"]
        md += [f"    {x}" for x in r["q"]]
        md += _item_md(r, teacher, show_q=False)
        if b.get("kind") == "written":
            md.append("    (the slide says: Write your answer in sentences.)")
        md.append("")
    if not L.get("no_set"):
        md += ["## Independent Set", ""]
        for r in items:
            if r.get("group") == "independent":
                md.append(f"_{r['heading']}_")
            elif r.get("kind") == "independent":
                md += _item_md(r, teacher)
    close = (L.get("te") or {}).get("close")
    if close:
        md += ["", "## Before You Go", ""] + [f"- {c}" for c in close]
    md += ["", "## IXL", ""] + [f"- {s}" for s in L.get("ixl") or []]
    md.append(f"- {L.get('ixl_due') or _due(L)}")
    if teacher and (L.get("te") or {}).get("say"):
        md += ["", "## Teacher: the three sentences to say", ""] + [f"- {s}" for s in L["te"]["say"]]
    return "\n".join(md) + "\n"



def _due(L):
    try:
        from lib import ixlplan
        return ixlplan.due_line(L)
    except Exception:
        return "Due by the unit test."


def papers_md(U, items, teacher=False):
    md = [f"# Unit {U.get('unit')} {U.get('title', '')} — the papers", ""]
    for r in items:
        if "paper" in r:
            md += ["", f"## {r['paper']}  ({r['prefix']}/…)", ""]
        elif "section" in r:
            md += ["", f"### {r['section']}" + (f"  · {r['right']}" if r.get("right") else ""), ""]
        elif "heading" in r:
            md.append(f"_{r['heading']}_")
        elif r.get("parts_of"):
            md.append(f"- **{r['id']}**  {r['q'][0]}")
            fl = _fig_line(r["figs"])
            if fl:
                md.append(f"    {fl}")
            _teacher(md, r, teacher)
        elif r["kind"] == "paper-part":
            md += ["  " + x for x in _item_md(r, teacher)]
        else:
            md += _item_md(r, teacher)
    if U.get("reference"):
        md += ["", "## Reference Sheet", ""]
        if U.get("reference_intro"):
            md += [U["reference_intro"], ""]
        for sec in U["reference"]:
            md += ["", f"### {sec.get('title', '')}" + (f"  · {sec['right']}" if sec.get("right") else ""), ""]
            for b in sec.get("blocks") or []:
                if isinstance(b, str):
                    md.append(b)
                elif isinstance(b, dict) and b.get("table"):
                    for ri, row in enumerate(b["table"][1]):
                        cells = [str(c.get("text", c) if isinstance(c, dict) else c) for c in row]
                        md.append("| " + " | ".join(cells) + " |")
                        if ri == 0:
                            md.append("|" + "---|" * len(cells))
                elif isinstance(b, dict) and b.get("bullets"):
                    md += [f"- {x}" for x in b["bullets"]]
                elif isinstance(b, dict) and b.get("vocab"):
                    md += [f"- **{t}** — {d}" for t, d in b["vocab"]]
                md.append("")
    return "\n".join(md) + "\n"


def main(argv):
    opts, args, it = {}, [], iter(argv)
    for a in it:
        if a in ("--out", "--build"):
            opts[a] = next(it, None)
        elif a == "--teacher":
            opts[a] = True
        else:
            args.append(a)
    if len(args) != 1 or args[0].startswith("--"):
        print(__doc__)
        return 2
    unit = args[0]
    build = setup(opts.get("--build"))
    out = os.path.abspath(opts.get("--out") or os.path.join("/tmp/reader", unit))
    os.makedirs(out, exist_ok=True)
    teacher = bool(opts.get("--teacher"))
    model, figmap = unit_model(build, unit)
    written = []
    for fname, kind, top, items in model:
        if kind == "lesson":
            name = f"{top.get('code', fname[:-3])}.md"
            text = lesson_md(top, items, teacher, fname, figmap)
        else:
            name = f"Unit {top.get('unit')} papers.md"
            text = papers_md(top, items, teacher)
        p = os.path.join(out, name)
        open(p, "w", encoding="utf-8").write(text)
        written.append((p, len(text.encode("utf-8"))))
    for p, size in written:
        print(f"{size:8d}  {p}")
    print(f"{len(written)} files → {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
