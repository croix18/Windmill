# The lean workflow — how a unit is built from 21 November 2026

Croix, 20 November 2026: the old way "feels extremely inefficient and is burning tons of tokens" — make it cheaper
"without degrading content or quality". This is the way that replaced it, as it was run for the first time on
A7 Unit 7 (Representing Proportional Relationships). The briefs that run used are in `briefs/lean/`, as worked
examples: change the unit, the paths and the plan's section names, and they run again.

## What made the old way expensive

Cost is agents · steps · the context each step carries. Measured on the units built before this:

- A builder's first act was 100,000 tokens of prescribed reading (about 310 KB), most of it history.
- Three reviewers on the largest model each rendered every slide (401 in M7 Unit 7) and recomputed every key —
  and no reviewer had ever found a wrong computed key: the gates derive every key from its `check`.
- The test was decided after the lessons, so M7 Unit 7 was built and reviewed twice.
- One chat held several units, so every step carried all of them.
- A four-page Teacher Edition was written, built and checked for every lesson.

## The rules that keep it lean

1. **One chat, one unit.** The lead (the largest model) plans, rules and looks; it does not build.
2. **A brief is a file, not a message**, and it names what to read. Nobody reads `HOUSE STYLE.md` whole.
3. **Builders read the card** (`kit/BUILDER CARD.md`, 12 KB: the fields, how to write a `check`, the rules in
   force, the gates, the loop), one model lesson, their own section of the plan and the unit's figure note.
4. **Nothing is derived twice by the same kind of reader.** The gates derive every key. One blind solve confirms
   them from the student's side. Reviewers read for what a check cannot see.
5. **Reviewers read text and figure sheets, not slides** (`reader_copy.py --bank`, `figure_sheets.py --grid 4`).
   The lead looks at the handful of slides a finding points at.
6. **The test is settled first**, and the plan is reviewed before a spec exists: a change costs a line then.
7. **One fix pass, then only what changed is checked again** (`changed_slides.py`, the changed ids re-solved).
8. **Builders and reviewers run on Opus; the lead rules.** (Croix: "The reviewers yeah opus then fable.")
9. **No Teacher Edition** (`TEACHER_EDITION = False` in `course.py`), and **Math Nation is read only for scope
   and test item shapes** — one short note, paraphrased, never in a repository.

## The steps

Work in a session folder outside the repositories (here `/home/claude/lean/`), on a branch.

| # | Step | Who | Reads | Makes |
|---|---|---|---|---|
| 0 | Scope | one Opus reader | Math Nation's unit in Drive | `SCOPE.md`: what the unit covers, the shapes of its test items |
| 1 | The plan | the lead | the benchmarks, `SCOPE.md`, the calendar | the unit's Lesson Outlines: standing decisions · **the test, question by question** · the unit sheet · every lesson down to each board |
| 2 | Plan review | two Opus readers (Barton, FAST) | the plan, the benchmarks | findings; the lead rules and fixes the plan |
| 3 | Shared pieces | one Opus builder | the last unit's figure module | `uN/figsN.py` and a one-page note on calling it; `course.py UNITS` |
| 4 | Build | one Opus builder per lesson, one for the papers — each in its own copy (`mkcopy.sh`) | the card, a model lesson, its plan section, the figure note | `uN/lNN.py`, `uN/unit.py`, each at gates 0 and `checks: 0 findings`, looked at once |
| 5 | Integrate | the lead | — | `gates.py uN` → `unit_repeats.py uN` (0) → `build_all.py uN` |
| 6 | Review wave, all at once | Opus: blind solvers (about 75 questions each) and three readers (critic, Barton, FAST) | `student_view.py --figs` (and `--only bank`); `reader_copy.py --bank`; the figure sheets | answers and doubts; `blind_diff.py`; three findings files |
| 7 | Rulings | the lead | the findings, the doubts, the diff tables | `RULINGS.md`: every change in exact words and numbers, by file; what is not taken, and why |
| 8 | Fix pass | one Opus fixer per file, each in its own copy | its section of the rulings, the card | the fixed file at 0 findings; the ids whose question or key changed |
| 9 | Verify what changed | the lead; one Opus solver | — | gates, `unit_repeats.py`, a clean `build_all.py`, the changed ids solved blind again, the changed slides looked at |
| 10 | Package | the lead | — | `install_unit.py`, the master sheet, the notes; commit and push. Publishing waits for Croix's word. |

## What each step must not skip

- **The unit sheet (step 1)** names what is reserved for the paper — stories, tables, lines — and gives the method
  sentences word for word. Give each lesson its own constants too: builders working apart all reach for the same
  "nice" decimals (in Unit 7, 2.5 and 3.5 turned up in four lessons and were the paper's two tables).
- **The plan review (step 2)** is where the expensive findings are cheap. Unit 7's found 3 blockers and 16 majors
  before anything was built.
- **The banks are student pages.** Give the readers `reader_copy.py --bank`, and run `unit_repeats.py` after
  every change: it reads the banks (it did not at first — a bank question was a Review question word for word).
- **The blind solve covers the banks** (`student_view.py --only bank`), not only the decks and the papers.
- **The rulings are the lead's own work.** A reviewer's fix is a proposal: check it against the reserved list, the
  other lessons and plain realism before it becomes a ruling. Half of Unit 7's rulings changed a reviewer's fix.
- **A fixer applies; it does not review.** What it sees and no ruling covers comes back as one line.
- **Before the last build**, clear what the earlier builds left (`git clean` on the figure cache's untracked files,
  the unit's `out/` folder), so the commit holds only the figures the unit uses.

## What the first run cost (A7 Unit 7, 20–21 November 2026)

Tokens as each agent's hand-back reported them; every agent was Claude Opus 5.5.

| Step | Agents | Tokens | Wall clock |
|---|---|---|---|
| 0 Scope | 1 | 119,000 | — |
| 2 Plan review | 2 | 232,000 | together |
| 3 Figures | 1 | 148,000 | — |
| 4 Build: five lessons | 5 | 1,110,000 (184,000 to 258,000 each) | 14 to 31 minutes each, together |
| 4 Build: the papers | 1 | 276,000 | with the lessons |
| 6 Blind solve (decks, papers, banks) | 4 | 421,000 | under 5 minutes, |
| 6 Three readers | 3 | 585,000 | together |
| 8 Fix pass | 6 | 847,000 (101,000 to 174,000 each) | under 10 minutes, together |
| 9 The changed questions solved again | 2 | 176,000 | 1 minute |
| **The unit** | **25** | **3,914,000** | |
| The kit's new tools and the card (once, not per unit) | 3, two of them resumed | 1,536,000 | |

What they found: the plan review, 41 findings (3 blockers) before a spec existed; the blind solves, 351 answers
against the key and not one wrong key; the three readers, 35 findings (1 blocker); the lead's own reading of the
banks and look at the slides, 11 bank questions and 6 layout faults that no reader had been shown.

**Where the rest goes: the lead.** In the last third of the run the lead's chat made 156 requests, and three fifths
of what it spent was its standing instructions and tool list, read again on every one of them (a quarter was the
output of its commands). So the lead works in few, large steps: one command that does five things, not five
commands; a unit's chat starts fresh; and nothing is attached to it that the build does not use.

## What it does not do

- It does not build the practice page (the unit test is a random set of it): a separate step, after the paper.
- It does not publish. Nothing reaches mrshaffer.org without Croix's word.
- It does not replace the gates, `checks.py` or the look-through of the figures: they are the floor it stands on.
