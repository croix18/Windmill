#!/usr/bin/env python3
"""Spread the keyed answers of a unit's multiple-choice items across the letters.

    python3 shuffle_choices.py u3            → rewrites u3/l*.py, review.py and unit.py in place, prints every change
    python3 shuffle_choices.py u4 l06.py     → only the named files
    python3 shuffle_choices.py u4 l09.py --seed=2   → another spread for that file (when the unit gate
                                               still finds one letter carrying too many boards)
    python3 shuffle_choices.py u5 --loose    → also remap a capital standing alone ("B is the trap…");
                                               only for a unit whose prose has no A–F variables

Every spec was written with the keyed answer first (correct=0 — a writing convenience), and the
decks and banks printed the options in spec order, so every single-answer item keyed A and every
select-all keyed the first options. Students noticed (3 Oct 2026). This script permutes each
item's options ONCE, in the source, so the spec stays the single readable truth and letter
references in the teacher prose stay literal:

  - `choices` are reordered; `correct` follows; `errors` is re-keyed; `form_only` is re-lettered;
    an `answer` that names the letter ("A", "A — 4⁵", "A, B, C and D") is regenerated.
  - Letters inside the item's OWN teacher prose (note, note_a, why, wrong, the error texts) are
    remapped only where they name an option in so many words — "Reveal C", "option B", "(D)",
    "C: …" — never a capital standing alone, which in a geometry unit is a variable (C = πd).
    Every standalone capital the script left alone is printed as a READ line.
  - Letters are assigned per file from a seeded shuffle so consecutive items differ and no letter
    takes more than its share; select-alls take a seeded permutation of all positions.
  - Letter references OUTSIDE the item (a Teacher Edition line saying "a board full of B on Q5")
    are listed at the end for the author to fix by hand — they are not touched.

The gate `balancecheck` (lessonbuild / unitbuild) refuses a build whose keyed letters cluster.
"""
import ast, sys, os, re, random, glob

HERE = os.path.dirname(os.path.abspath(__file__))
PROSE = ("note", "note_a", "why", "wrong", "hint", "gloss")
# An option is named in prose in a handful of fixed ways, and only those are remapped:
#     "Reveal C."   "option B"   "options A and C"   "(D)"   "C: half the perimeter…"   "B — the …"
# A capital standing alone is NOT assumed to be an option. In a geometry unit C is the
# circumference and A is the area, and the first version of this rule rewrote "C = πd" as
# "A = πd" inside a teaching note (M7 Unit 4, 4 Oct). Every other standalone A–F in an item's
# prose is listed at the end for the author to read.
LETTER = re.compile(r"(?<=Reveal )([A-F])\b"
                    r"|(?<=[Oo]ption )([A-F])\b"
                    r"|(?<=[Oo]ptions )([A-F])(?= and [A-F]\b)|(?<=[Oo]ptions [A-F] and )([A-F])\b"
                    r"|(?<=\()([A-F])(?=\))"
                    r"|(?:(?<=^)|(?<=[.;!?] )|(?<=\"))([A-F])(?=: | — )")
LOOSE = re.compile(r"(?<![A-Za-z0-9.\\])([A-F])(?![A-Za-z0-9'’])")


def remap_text(text, perm_letter):
    """perm_letter: old letter -> new letter. Replaces the references that name an option."""
    def sub(m):
        L = next(g for g in m.groups() if g)
        return perm_letter.get(L, L)
    return LETTER.sub(sub, text)


def loose_letters(text):
    """Standalone capitals A–F that the strict patterns did not touch and that read as an option:
    not a variable in a formula (C = πd, C ÷ d) and not the article (A board, A student) — an A
    counts only before is/was/gives/means/and/or, a dash, a colon, a comma or the end."""
    strict = {m.start(g) for m in LETTER.finditer(text) for g in range(1, len(m.groups()) + 1) if m.group(g)}
    out = []
    for m in LOOSE.finditer(text):
        tail = text[m.end():m.end() + 12]
        if m.start(1) in strict or re.match(r"\s*(=|≈|÷|×|/|\+|−|-\s|\()", tail):
            continue
        if m.group(1) == "A" and not re.match(r"\s+(?:is|was|gives|means|and|or|—|–)\b|\s*(?::|,|\)|—|\.|$)", tail):
            continue
        out.append(m)
    return out


def remap_loose(text, perm_letter):
    """remap_text, then the standalone letters loose_letters accepts. For a unit whose prose has
    no A–F variables (--loose); every such change is printed."""
    text = remap_text(text, perm_letter)
    b = list(text)
    for m in loose_letters(text):
        b[m.start(1)] = perm_letter.get(m.group(1), m.group(1))
    return "".join(b)


def seg(src, node):
    return ast.get_source_segment(src, node)


def plan_letters(n_items, n_choices_list, rng):
    """One keyed letter per single-answer item: cycle through shuffled blocks of the alphabet so
    consecutive items differ and the counts stay within one of each other."""
    out, block = [], []
    for k in n_choices_list:
        if not block:
            block = list(range(k)); rng.shuffle(block)
            if out and block[0] == out[-1]:
                block.append(block.pop(0))
        v = block.pop(0)
        out.append(v % k)
    return out


def process(path, rng, report, loose=False):
    src = open(path, encoding="utf-8").read()
    tree = ast.parse(src)
    items = []
    for node in ast.walk(tree):
        if isinstance(node, ast.Call) and getattr(node.func, "id", None) == "dict":
            kws = {k.arg: k for k in node.keywords}
            if "choices" in kws and "correct" in kws:
                # only an item written out in the source can be permuted in the source; one whose
                # options are computed (a parallel-forms unit.py) is reported for its author
                if isinstance(kws["choices"].value, ast.List) and isinstance(kws["correct"].value, (ast.Constant, ast.List, ast.Tuple)):
                    items.append((node, kws))
                else:
                    report.append(f"SKIPPED {os.path.basename(path)}:{node.lineno}  options are computed, not literal — spread these by hand")
    items.sort(key=lambda t: (t[0].lineno, t[0].col_offset))
    singles = [(n, k) for n, k in items if not isinstance(k["correct"].value, (ast.List, ast.Tuple))]
    targets = plan_letters(len(singles), [len(k["choices"].value.elts) for n, k in singles], rng)
    target_of = {id(n): t for (n, k), t in zip(singles, targets)}
    edits = []   # (start, end, new_text) as absolute offsets — ast columns count UTF-8 BYTES
    blines = src.encode("utf-8").splitlines(keepends=True)
    offs = [0]
    for ln in blines:
        offs.append(offs[-1] + len(ln))
    def span(node):
        return offs[node.lineno - 1] + node.col_offset, offs[node.end_lineno - 1] + node.end_col_offset

    for node, kws in items:
        choices = kws["choices"].value.elts
        n = len(choices)
        corr_node = kws["correct"].value
        multi = isinstance(corr_node, (ast.List, ast.Tuple))
        old_correct = [c.value for c in corr_node.elts] if multi else [corr_node.value]
        # new order: a permutation `order` where order[new_pos] = old_pos
        if multi:
            order = list(range(n)); rng.shuffle(order)
            # a select-all must not keep the keyed set as a prefix
            tries = 0
            while sorted(i for i, o in enumerate(order) if o in old_correct) == list(range(len(old_correct))) and tries < 50:
                rng.shuffle(order); tries += 1
        else:
            t = target_of[id(node)]
            others = [i for i in range(n) if i != old_correct[0]]
            rng.shuffle(others)
            order = others[:t] + [old_correct[0]] + others[t:]
        new_pos = {o: i for i, o in enumerate(order)}
        perm_letter = {chr(65 + o): chr(65 + i) for o, i in new_pos.items()}
        new_correct = sorted(new_pos[o] for o in old_correct)
        # 1. choices
        ch_src = [seg(src, c) for c in choices]
        s, e = span(kws["choices"].value)
        edits.append((s, e, "[" + ", ".join(ch_src[o] for o in order) + "]"))
        # 2. correct
        s, e = span(corr_node)
        edits.append((s, e, "[" + ", ".join(map(str, new_correct)) + "]" if multi else str(new_correct[0])))
        # 3. errors
        if "errors" in kws and isinstance(kws["errors"].value, ast.Dict):
            d = kws["errors"].value
            pairs = []
            for kn, vn in zip(d.keys, d.values):
                kl = kn.value
                new_k = perm_letter[kl]
                vtxt = seg(src, vn)
                pairs.append((new_k, f'"{new_k}": ' + (remap_loose if loose else remap_text)(vtxt, perm_letter)))
            pairs.sort()
            s, e = span(d)
            edits.append((s, e, "{" + ", ".join(p[1] for p in pairs) + "}"))
        # 4. form_only
        if "form_only" in kws:
            fo = kws["form_only"].value
            s, e = span(fo)
            edits.append((s, e, '"' + "".join(sorted(perm_letter[c] for c in fo.value)) + '"'))
        # 5. answer
        if "answer" in kws and isinstance(kws["answer"].value, ast.Constant):
            a = kws["answer"].value.value
            letters = [chr(65 + i) for i in new_correct]
            if multi:
                m = re.fullmatch(r"([A-F](?:, [A-F])*) and ([A-F])", a)
                if m:
                    new_a = ", ".join(letters[:-1]) + " and " + letters[-1] if len(letters) > 1 else letters[0]
                else:
                    new_a = remap_text(a, perm_letter)
            else:
                m = re.fullmatch(r"([A-F])( — .*)?", a, re.S)
                if m:
                    new_a = letters[0] + (m.group(2) or "")
                else:
                    new_a = remap_text(a, perm_letter)
            if new_a != a:
                s, e = span(kws["answer"].value)
                q = seg(src, kws["answer"].value)[0]
                edits.append((s, e, q + new_a.replace("\\", "\\\\") + q if "\\" in new_a else q + new_a + q))
        # 6. prose
        for fld in PROSE:
            if fld in kws and isinstance(kws[fld].value, ast.Constant) and isinstance(kws[fld].value.value, str):
                txt = seg(src, kws[fld].value)
                new = (remap_loose if loose else remap_text)(txt, perm_letter)
                if new != txt:
                    s, e = span(kws[fld].value)
                    edits.append((s, e, new))
                    for m in LETTER.finditer(txt):
                        L0 = next(g for g in m.groups() if g)
                        report.append(f"{os.path.basename(path)}:{node.lineno} {fld}: …{txt[max(0,m.start()-30):m.end()+30]}…  → {perm_letter.get(L0)}")
                for m in loose_letters(txt):
                    what = f"→ {perm_letter.get(m.group(1))}" if loose else "was left alone"
                    report.append(f"{'LOOSE' if loose else 'READ'} {os.path.basename(path)}:{node.lineno} {fld}: a standalone {m.group(1)} {what} — …{txt[max(0,m.start()-40):m.end()+40]}…")
        report.append(f"{os.path.basename(path)}:{node.lineno}  keyed {','.join(chr(65+c) for c in old_correct)} → {','.join(chr(65+c) for c in new_correct)}   order {order}")
    # apply edits from the end, on the byte string the offsets were measured on
    b = src.encode("utf-8")
    for s, e, new in sorted(edits, key=lambda x: -x[0]):
        b = b[:s] + new.encode("utf-8") + b[e:]
    open(path, "wb").write(b)
    return len(items)


if __name__ == "__main__":
    unit = sys.argv[1]
    files = sorted(glob.glob(os.path.join(HERE, unit, "l[0-9]*.py"))) + \
        [f for f in (os.path.join(HERE, unit, "review.py"), os.path.join(HERE, unit, "unit.py")) if os.path.exists(f)]
    loose = "--loose" in sys.argv
    seed = next((a.split("=", 1)[1] for a in sys.argv if a.startswith("--seed=")), "")   # a second spread for a file
    only = [a for a in sys.argv[2:] if not a.startswith("--")]
    if only:                                   # shuffle_choices.py u4 l06.py l07.py — just these files
        files = [f for f in files if os.path.basename(f) in only]
    report, total = [], 0
    for f in files:
        rng = random.Random(f"{unit}/{os.path.basename(f)}/2026-10-03" + seed)
        total += process(f, rng, report, loose)
    print("\n".join(report))
    print(f"\n{total} multiple-choice items permuted in {len(files)} files")
    # letter references outside the items, for the author
    OUT = re.compile(r"\b(?:option|options|full of|shows|picks|chose)\s+([A-F])\b|\b([A-F]) on (?:Q|question|whiteboard|board)")
    for f in files:
        for i, ln in enumerate(open(f, encoding="utf-8"), 1):
            if OUT.search(ln) and "choices=" not in ln and "errors=" not in ln:
                print(f"HAND-CHECK {os.path.basename(f)}:{i}: {ln.strip()[:140]}")
