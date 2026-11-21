#!/usr/bin/env python3
"""Every question a student answers in a unit, in the words and TeX the student sees — and nothing else — for a blind
solver; and the key, for blind_diff.py.
    python3 student_view.py u11                   → /tmp/student/u11/student.md and key.json
    python3 student_view.py u11 --out DIR         → somewhere else
    python3 student_view.py u11 --figs            → and the question pictures (never the answer's) in OUT/figures/
    (--build DIR reads the unit folders of another build folder, as figure_sheets.py does)

student.md covers the warm-up, the Your Turns, the whiteboards, the independent set of every lesson and every part
of every paper in unit.py (the review and each form of the assessment), by id (reader_copy.py's ids: 11.01/W2,
11.01/YT1, 11.01/B4, 11.01/I3, R/Q7, P/Q5b). It carries the question, its choices (○ one answer, □ select all, as
the page prints them), the instruction lines a page prints between groups, and [figure: NNN.png] for a picture —
figure_sheets.py's number. It carries NO answer, step, note, hint or error name. A Your Turn that is a bare
expression carries the bold instruction its slides give it (its Example's ask), as the deck does.

key.json: id → {kind, question, answer (as printed), correct (the keyed letters of a choice item), check (the spec's)}.

Give the solver student.md and the pictures and nothing else; turn its answers into {id: "answer"} and run
blind_diff.py key.json answers.json.

What it cannot see: anything a student reads that the spec does not hold as words — a label drawn on a picture (the
solver reads that from the picture), the page's layout, a table built by the document code. Read-only: writes
nothing into the course.
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import reader_copy as rcopy   # noqa: E402  (the shared loading and walk)


GROUPS = {"warmup": "Warm-Up", "yourturn": "Your Turns", "independent": "Independent Set"}


def _q_md(r, indent=""):
    lines = []
    q = [x for x in r["q"] if x]
    if len(q) == 1:
        lines.append(f"{indent}- **{r['id']}**  {q[0]}")
    else:
        lines.append(f"{indent}- **{r['id']}**")
        lines += [f"{indent}    {x}" for x in q]
    if r["figs"].get("fig"):
        lines.append(f"{indent}    [figure: {r['figs']['fig']}]")
    for k, c in enumerate(r["choices"] or []):
        lines.append(f"{indent}    {'□' if r['multi'] else '○'} {rcopy.LETTERS[k]}.  {c}")
    if r["kind"] == "board-written":
        lines.append(f"{indent}    (Write your answer in sentences.)")
    return lines


def _plain(r, parent=None):
    s = " ".join(x for x in ([parent] if parent else []) + r["q"] if x)
    return " ".join(s.replace("**", "").split())


def build(build_dir, unit):
    model, figmap = rcopy.unit_model(build_dir, unit)
    md, key, figs = [f"# Unit {unit[1:]} — the questions", "",
                     "Answer every question below. Give each answer with its id. A choice question: give the letter "
                     "(□ means select every one that applies). A picture named [figure: NNN.png] is in the pictures you were given.", ""], {}, set()
    for fname, kind, top, items in model:
        if kind == "lesson":
            md += ["", f"## {top.get('code')} {top.get('title', '')}", ""]
            group = None
            for r in items:
                g = GROUPS.get(r.get("kind") or r.get("group"), "Whiteboards")
                if g != group:
                    md += ["", f"### {g}", ""]
                    group = g
                if "heading" in r:
                    md.append(f"_{r['heading']}_")
                    continue
                md += _q_md(r)
                key[r["id"]] = r
        else:
            parent = None
            for r in items:
                if "paper" in r:
                    md += ["", f"## {r['paper']}", ""]
                elif "section" in r:
                    md += ["", f"### {r['section']}", ""]
                elif "heading" in r:
                    md.append(f"_{r['heading']}_")
                elif r.get("parts_of"):
                    parent = r
                    md += _q_md(r)
                elif r["kind"] == "paper-part":
                    md += _q_md(r, "    ")
                    r["_parent"] = _plain(parent) if parent else None
                    key[r["id"]] = r
                else:
                    parent = None
                    md += _q_md(r)
                    key[r["id"]] = r
    out = {}
    for i, r in key.items():
        if r["figs"].get("fig", "").endswith(".png"):
            figs.add(int(r["figs"]["fig"][:3]))
        out[i] = dict(kind=r["kind"], question=_plain(r, r.get("_parent")), answer=r["answer"],
                      **({"correct": r["correct"], "multi": r["multi"]} if r["choices"] else {}), check=r["check"])
    # a parent stem with its own picture (a matching grid shared by its parts) is a question picture too
    for fname, kind, top, items in model:
        for r in items:
            if r.get("parts_of") and r["figs"].get("fig", "").endswith(".png"):
                figs.add(int(r["figs"]["fig"][:3]))
    return "\n".join(md) + "\n", out, figs


def main(argv):
    opts, args, it = {}, [], iter(argv)
    for a in it:
        if a in ("--out", "--build"):
            opts[a] = next(it, None)
        elif a == "--figs":
            opts[a] = True
        else:
            args.append(a)
    if len(args) != 1 or args[0].startswith("--"):
        print(__doc__)
        return 2
    unit = args[0]
    b = rcopy.setup(opts.get("--build"))
    out = os.path.abspath(opts.get("--out") or os.path.join("/tmp/student", unit))
    os.makedirs(out, exist_ok=True)
    md, key, figs = build(b, unit)
    p1, p2 = os.path.join(out, "student.md"), os.path.join(out, "key.json")
    open(p1, "w", encoding="utf-8").write(md)
    open(p2, "w", encoding="utf-8").write(json.dumps(key, ensure_ascii=False, indent=1, default=str))
    print(f"{os.path.getsize(p1):8d}  {p1}")
    print(f"{os.path.getsize(p2):8d}  {p2}   ({len(key)} ids)")
    if opts.get("--figs"):
        rcopy.draw_figures(b, unit, figs, os.path.join(out, "figures"))
        print(f"{len(figs):8d}  pictures → {os.path.join(out, 'figures')}")
    else:
        print(f"{len(figs)} question pictures named (--figs draws them)")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
