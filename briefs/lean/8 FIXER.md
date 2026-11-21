# X — apply the lead's rulings to ONE file of A7 Unit 7

Read `/home/claude/lean/COMMON.md` first.

The unit is built, read by three reviewers and solved blind: every key was right. The lead has ruled on the
findings. You apply the rulings for ONE file — exactly as they are worded, and nothing else. You do not re-review
the lesson, re-derive keys no ruling touches, or improve what no ruling names. Five other fixers are doing the same
for the other files at the same time, in copies of their own.

## Your copy
Your task message gives your NAME, your FILE and your SECTION of the rulings.

```sh
export HOME=/home/claude/lean/home-NAME; mkdir -p $HOME; export NODE_PATH=$(npm root -g)
cd /home/claude/lean/b-NAME/build
```
Work only there. It is a copy of the course's build folder with the whole unit in it (`u7/`); it has no `out/`.
The decks and papers as they were built before the rulings are in
`/home/claude/croix18-windy-hill-a7/a7/build/out/u7/` — read-only, for comparing.

## Read — and nothing else unless a gate's message sends you to it
1. `/home/claude/lean/u7/review/RULINGS.md`: "Holds for every section" and YOUR section. Not the other sections.
2. `BUILDER CARD.md` in your copy: the fields, how a `check` is written, the gates, the loop. (The papers' fixer:
   also `SPEC SCHEMA.md` on `unit.py` — grep `assessment`, `review`, `reference`, `fig_key`, `parts`.)
3. `u7/FIGS7.md`, if a ruling of yours touches a figure.
4. Your file. Use grep to find each item; do not read other lessons' specs.

## Do
- Apply each ruling. Where a slide's room or a gate forces another wording or number, make the smallest change that
  keeps the ruling's intent, and say so in your hand-back. If a ruling cannot be applied at all, say why and leave
  the item as it was.
- A changed number changes the item's `check` (from the mathematics), its steps, its `why`, its named errors and
  any figure. A cite must name a line that exists.
- Do not run `shuffle_choices.py`: the rulings keep every keyed letter where it is.
- **A lesson:** `python3 gates.py u7` → `python3 build_lesson.py u7/lNN.py` → `python3 checks.py out/u7`, until
  gates end at 0 findings and `checks: 0 findings`.
- **The papers:** `python3 gates.py u7`, then `python3 /home/claude/lean/build_papers.py u7` (the papers alone,
  no unit deck), then `python3 checks.py out/u7`, to 0 findings.
- **Then look, only at what changed.** A deck: `python3 changed_slides.py "<the old Slides.pdf>" "out/u7/<the new
  one>" --sheet` and read the sheet(s) it names. A paper (Independent Set, Question Banks, Review, Practice Test,
  keys, Reference Sheet): `python3 contact_sheet.py "<pdf>" 60 3` for the pages your rulings touched. A changed
  figure: `python3 figure_sheets.py u7 --out $HOME/figsheets`, find its number in `items.txt`, open that one
  picture. You are looking for: a point off its grid corner, a figure too small or cut off, a label on a line, an
  option that wrapped badly, a crowded slide, a heading alone at the foot of a page, a number on a picture that the
  words do not give. Fix what you find and look again at that page only.

## Hand back (your final message, under 250 words)
- your file's path (and `u7/figs7.py` if you changed it — what, and that every other call is unchanged);
- the last line of `gates.py` and of `checks.py`;
- for each ruling, by its number: done · done with a change (what, why) · not done (why);
- the ids of every item whose question, numbers or key changed (the blind solver re-solves exactly these);
- anything you saw that is unsound and that no ruling covers — one line each, without fixing it.
