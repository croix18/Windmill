#!/usr/bin/env python3
"""Draw EVERY picture of a unit beside the words that go with it, so a person can look at them all.
    python3 figure_sheets.py u4                      → /tmp/figsheets/u4/NNN.png + items.txt
    python3 figure_sheets.py u4 u5 --grid 4          → and contact sheets sheet_NN.png, 4 across
    python3 figure_sheets.py u4 --out /some/dir      → somewhere else
    (--build DIR reads the unit folders of another build folder; the kit's tests use it)
Run it from the course's build folder (it reads that folder's own specs and vendored kit).

The look-through ruling 44 asks for, made repeatable: every item of a unit that carries a picture
(lessons, review, the unit papers) is drawn on its own as NNN.png, and items.txt lists beside each
number the words the student reads, the steps and the answer.

Why this exists (Croix, 6 October 2026, of M7 4.05 board 3): "The question says 30 but the graphic
shows 20 for the diameter. I told you to make sure there were never errors like that." Every
label on that slide was true and every gate passed. The gates check that a label is TRUE; only a
reader can check that a slide can be READ. The first look-through (7 October, M7 Units 4-5, 129
pictures) found a board whose answer could not be reached from its picture, three test figures
whose labels sat beside the wrong side, and two stems that said "every length is marked" when it
was not - none of them refusable by a rule.

How to read the output - for each picture, with its words beside it:
  1. Answer the question FROM THE PICTURE AND THE WORDS ALONE. Can the answer be reached?
  2. Does every number sit ON the thing it measures - could it be read as a neighbouring side?
  3. Is every length the words give on the picture, and every number on the picture explained?
  4. Is anything the words claim about the picture ("every length is marked") true?
A picture that fails any of these is fixed before the unit ships, whatever the gates say.
Better still, hand items.txt and the pictures to a reader who has not seen the unit.

Read-only: writes nothing into the course.
"""
import glob
import importlib.util
import os
import shutil
import sys


def main(argv):
    opts = {}
    args = []
    it = iter(argv)
    for a in it:
        if a in ("--grid", "--out", "--build"):
            opts[a] = next(it, None)
        else:
            args.append(a)
    if not args or any(a.startswith("--") for a in args):
        print(__doc__); return 2
    units = args
    cols = int(opts.get("--grid") or 0)
    here = os.path.dirname(os.path.abspath(__file__))
    build = os.path.abspath(opts.get("--build") or here)          # --build: the kit's own tests point it at a fixture
    out = os.path.abspath(opts.get("--out") or os.path.join("/tmp/figsheets", "_".join(units)))
    os.environ.setdefault("KIT_COURSE", os.path.join(build, "course.py"))
    for p in (build, here):
        if p not in sys.path:
            sys.path.insert(0, p)
    from lib import slotmark, figkit, mathimg, repeatcheck as rc
    os.makedirs(out, exist_ok=True)
    figkit.FIGS = os.path.join(out, "figs"); figkit.INDEX = os.path.join(figkit.FIGS, "figindex.json")
    mathimg.FIGS = os.path.join(out, "math"); mathimg.INDEX = os.path.join(mathimg.FIGS, "index.json")
    os.makedirs(figkit.FIGS, exist_ok=True); os.makedirs(mathimg.FIGS, exist_ok=True)

    rows = []

    def walk(o, path, raw):
        if isinstance(o, dict):
            for k in ("fig", "fig_a"):
                if isinstance(o.get(k), dict):
                    rows.append((path, k, o, raw))
            for kk, v in o.items():
                if kk not in ("fig", "fig_a"):
                    walk(v, f"{path}.{kk}" if path else kk, raw[kk] if isinstance(raw, dict) else raw)
        elif isinstance(o, (list, tuple)):
            for i, v in enumerate(o):
                walk(v, f"{path}[{i + 1}]", raw[i])

    n, lines, drawn = 0, [], []
    for u in units:
        files = sorted(glob.glob(os.path.join(build, u, "l[0-9]*.py")))
        files += [p for p in (os.path.join(build, u, "review.py"), os.path.join(build, u, "unit.py")) if os.path.exists(p)]
        for f in files:
            sys.path.insert(0, os.path.dirname(f))
            sp = importlib.util.spec_from_file_location("s", f)
            m = importlib.util.module_from_spec(sp); sp.loader.exec_module(m)
            sys.path.pop(0)
            top_raw = getattr(m, "L", None) or getattr(m, "U", None)
            if top_raw is None:
                continue
            top = slotmark.strip_deep(top_raw)
            rows.clear(); walk(top, "", top_raw)
            code = top.get("code") or f"Unit {top.get('unit')} papers"
            for path, k, o, raw in rows:
                n += 1
                try:
                    png = os.path.join(out, f"{n:03d}.png")
                    shutil.copy(figkit.draw(raw[k])[0], png); drawn.append(n)
                except Exception as e:                      # a figure the kit refuses is itself a finding
                    png = f"(COULD NOT DRAW: {str(e)[:160]})"
                words = []
                for w in ("text", "prompt", "stem", "latex", "ask", "items", "items2", "math"):
                    words += list(rc._strs(o.get(w)))
                for p in o.get("parts") or []:
                    if isinstance(p, dict):
                        words.append(f"({p.get('label')}) {p.get('stem')}  → {p.get('answer')}")
                worked = []
                for w in o.get("worked") or []:
                    for r in w.get("rows") or []:
                        worked.append(r[0] + "  (" + " ".join(x for x in r[1:] if isinstance(x, str)) + ")"
                                      if isinstance(r, (tuple, list)) else r)
                    if w.get("answer"):
                        worked.append("ANSWER: " + str(w["answer"]))
                steps = list(rc._strs(o.get("steps"))) + worked
                ans = o.get("answer") or o.get("answer_latex")
                lines.append(
                    f"### ITEM {n:03d} — {u}/{os.path.basename(f)} — {code} — {path}"
                    + (" (the figure shown WITH THE ANSWER)" if k == "fig_a" else "")
                    + f"\nPICTURE: {png}\nLABELS ON THE PICTURE (as typed): {rc.figtext(o[k])}\nWORDS THE STUDENT READS:\n"
                    + "\n".join("   " + w for w in words)
                    + ("\nSTEPS SHOWN WITH THE ANSWER:\n" + "\n".join("   " + s for s in steps) if steps else "")
                    + (f"\nANSWER: {ans}" if ans else "")
                    + (f"\nMULTIPLE CHOICE: {o.get('choices')}  correct index {o.get('correct')}" if o.get("choices") else "")
                    + (f"\nNUMBER THE QUESTION DOES NOT NEED (on purpose, ruling 22): {o.get('unneeded')}" if o.get("unneeded") else "")
                    + ("\nTAGGED figwords_ok (ruling 44 exception — read its comment in the spec)" if o.get("figwords_ok") else "")
                    + "\n")
    open(os.path.join(out, "items.txt"), "w", encoding="utf-8").write("\n".join(lines))
    print(f"{n} pictures → {out}/NNN.png, words beside each in {out}/items.txt")

    if cols and drawn:
        from PIL import Image, ImageDraw
        cell, per = 520, cols * 3
        for s, i0 in enumerate(range(0, len(drawn), per), 1):
            chunk = drawn[i0:i0 + per]
            nrows = (len(chunk) + cols - 1) // cols
            sheet = Image.new("RGB", (cols * cell, nrows * (cell + 22)), "white")
            dr = ImageDraw.Draw(sheet)
            for i, k in enumerate(chunk):
                im = Image.open(os.path.join(out, f"{k:03d}.png")).convert("RGBA")
                bg = Image.new("RGBA", im.size, "white"); bg.alpha_composite(im); im = bg.convert("RGB")
                im.thumbnail((cell - 16, cell - 16))
                x, y = (i % cols) * cell, (i // cols) * (cell + 22)
                sheet.paste(im, (x + (cell - im.width) // 2, y + 22 + (cell - im.height) // 2))
                dr.text((x + 6, y + 4), f"{k:03d}", fill="red")
                dr.rectangle([x, y, x + cell - 1, y + cell + 21], outline="#cccccc")
            sheet.save(os.path.join(out, f"sheet_{s:02d}.png"))
        print(f"contact sheets: {out}/sheet_NN.png ({cols} across, {per} to a sheet)")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
