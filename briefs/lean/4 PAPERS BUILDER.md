# U — the unit's papers: A7 Unit 7's Practice Test (the blueprint of the test), Review and Reference Sheet

Read `/home/claude/lean/COMMON.md` first.

You write `u7/unit.py` and `u7/manifest.py`. Five other builders are writing the five lessons at the same time, in copies of their own. The test was settled and reviewed before anyone started: you build exactly the fifteen questions the plan gives.

## Your copy
`/home/claude/lean/b-unit/build` — a copy of the course's build folder (the kit, `u7/figs7.py`, every earlier unit). Work only there.

```sh
export HOME=/home/claude/lean/home-unit; mkdir -p $HOME; export NODE_PATH=$(npm root -g)
cd /home/claude/lean/b-unit/build
```

## Read, in this order — and nothing else unless a gate's message sends you to it
1. The plan — `/home/claude/croix18-windy-hill-a7/a7/reference/A7 Unit 7 Representing Proportional Relationships - Lesson Outlines.md`: "The unit's standing decisions"; **"The test"** (every question, its points, its key, each wrong option's named error); "Shared across the unit"; "The Unit Review and the Reference Sheet"; "Hand-offs". Skim each lesson's Notes and Examples, so the Reference Sheet says what the lessons say, in their words, and the Review uses no number a lesson shows.
2. The model: `u11/unit.py` and `u11/manifest.py` — Unit 11's papers, the newest: `reference`, `review`, and `assessment` with `forms = {"practice": …}` and nothing else (ruling 49: the unit test is a random set of the practice page; the Practice Test paper is its blueprint — no Form A, no Form B, no transfer items), sections by benchmark with points and a tracker, `fig_key` for a key's own figure, a select-all, a choice with reasons.
3. `SPEC SCHEMA.md`: only what it says of `unit.py` (grep `unit.py`, `assessment`, `tracker`, `review`, `reference`, `fig_key`, `select`).
4. `/home/claude/lean/FIELDS.md`: the `unit.py` table — a field marked "no" in its last column is not written any more (the course builds no Teacher Edition).
5. `/home/claude/lean/u7/FIGS7.md` — the unit's figures (`figs7`; do not edit `figs7.py`; a helper of your own goes in `unit.py`).

## What to write
- **The Practice Test:** the plan's fifteen questions, twenty points, sections in the plan's order, tracker AR.4.3 = 4 · AR.4.2 = 4 · AR.4.1 = 3 · MA.8.AR.3.1 = 1 · AR.4.4 = 5 · AR.4.5 = 3. Stems in FAST's style, as Unit 11's paper has them (a short stem — "A table is shown."; "x =" before a typed answer; a select-all whose stem never says how many). Every key by a true `check`; every wrong option of a choice question the plan's named error; question 1(b)'s key prints the drawn graph (`fig_key`). Where the plan gives a scoring rule ("one point for all three"), the key says it.
- **The Review** (goes home Tue 12 Jan): the plan's paragraph, with numbers of its own — none of the paper's and none a lesson shows. Stay clear by using constants the lessons and the paper never use: 1.8, 2.8, 3.6, 5.2, 7.2, 9.6, −3.5, 3/8, 7/4. Its *Same Surface, Different Deep* question is one graph asked four ways, parts a–d.
- **The Reference Sheet:** the plan's list, in the unit's method wording ("Shared across the unit").
- **`manifest.py`** (model: Unit 11's): the summary (five teaching days — seven book lessons, 7.2 with 7.3 and 7.5 with 7.6 each one day; a review sent home Tue 12 Jan; a spiral day Wed 13 Jan; the test as one period on Thu 14 Jan, a random set of the practice page); the lessons, in order, with these file codes, labels and titles exactly — `7.01` "7.01" Graphing Proportional Relationships (MA.7.AR.4.3) · `7.02` "7.02–03" Constant of Proportionality: Table, Graph, Description (MA.7.AR.4.2) · `7.04` "7.04" Is It Proportional? (MA.7.AR.4.1) · `7.05` "7.05–06" Equations of Proportional Relationships; Translating Representations (MA.7.AR.4.4) · `7.07` "7.07" Comparing Proportional Relationships (MA.7.AR.4.5) — each with the one line that carries its day (from the plan); the assessment line; the notes before the unit, from the plan's standing decisions and hand-offs. Nothing in it mentions a Teacher Edition.

## Prove it without the lessons
Your copy has no lesson specs yet, so `gates.py u7` and `build_unit.py` cannot run whole. Instead:
1. The unit gate alone — in your copy's `build` folder:
   ```sh
   python3 - <<'EOF'
   import sys; sys.path.insert(0, '.')
   from lib import unitload, slotmark, unitbuild
   U = slotmark.strip_deep(unitload.load('u7/unit.py', 'u').U)
   f, n = unitbuild.check_unit(U); print(n, 'items checked,', len(f), 'findings'); [print(' ', x) for x in f]
   EOF
   ```
   until it says 0 findings.
2. Build the papers without the unit deck: a short script in your HOME (not in the tree) that does what `build_unit.py`'s first half does — `unitbuild.build_unit(U, 'out/u7')`, then `soffice --headless --convert-to pdf` on each file it returns. Then `python3 checks.py out/u7` as far as it runs; fix what it finds in the papers.
3. Look once at every page of the Practice Test, its key, the Review, its key and the Reference Sheet: `python3 contact_sheet.py "<pdf>" 60 3` (one sheet per paper is enough; a crowded page again at 90 dpi alone). You are looking for a figure too small or cut off, a label on a line, a table that broke across a page, a section heading left alone at the foot of a page (Croix hates that), a number on a picture that the words do not give.

## Hand back (your final message, under 250 words)
The paths; the unit gate's last line; what `checks.py` said; every place the paper differs from the plan, and why; the Review's constants; anything about a question you are not sure is sound — plainly.
