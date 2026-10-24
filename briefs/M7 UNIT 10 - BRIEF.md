# M7 Unit 10 — Equations and Inequalities: the brief

*Read `00 - HOW WE WORK (read first).md` first. This document is the plan for one unit. It is specific on purpose.*

## The unit in one paragraph

Grade 7 on-level, MA.7.AR.2.1 (one-step inequalities: 10.01–10.04) and MA.7.AR.2.2 (two-step equations: 10.05–10.10).
Nine teaching days, **Wed 4 Nov – Tue 17 Nov 2026**, a 43-minute review day **Wed 18 Nov**, the two-day test **Thu–Fri
19–20 Nov**, then Thanksgiving. It is the next unit the class meets; **it must be pushed, reviewed and in its package by
Wednesday 28 October.** Math Nation's 10.09 and 10.10 are taught as one day (ruling 48 — the unit has to finish before the
break). Unit 10 follows Unit 9 (Algebraic Expressions, built, tested Mon–Tue 2–3 Nov): the class knows like terms, the
distributive property and equivalent expressions when it arrives.

Repository: `croix18/windy-hill-m7`. Course profile: `m7/build/course.py` (`UNITS[10] = "Equations and Inequalities"` is
already there). Everything you write goes in `m7/build/u10/`, `m7/practice/u10/`, `m7/reference/` and `NOTES.md`.

## 0. Setup (do this exactly, then stop and verify)

1. Clone `windy-hill-m7` and `Windmill` as HOW WE WORK says; the token in `.github-token`.
2. Environment: `bash ../croix18-windy-hill-a7/tools/setup_env.sh` if you cloned A7 too; otherwise install what it lists
   (`apt`: libreoffice-writer, libreoffice-impress, poppler-utils, fonts-texgyre, fonts-liberation; `pip --break-system-packages`:
   python-docx python-pptx matplotlib sympy fonttools pymupdf pillow). Node and Playwright with Chromium are in the container
   (`node -e "require('playwright')"`; if that fails, `export NODE_PATH=$(npm root -g)`).
3. `bash tools/check.sh` from the repository root — must end `all checks passed`.
4. `cd m7/build && python3 build_all.py u9` — the smoke test; ends `checks: 0 findings` (10–15 minutes; run it in the
   background and read while it runs). `out/` is git-ignored, so a fresh clone has no built output until this runs.
5. Read, in this order: `NOTES.md` (top section); `m7/build/BUILDING A UNIT.md` (all of it); `m7/build/SPEC SCHEMA.md`;
   `m7/reference/TRUTH - Grade 7 Benchmarks.md` §MA.7.AR.2.1 and §MA.7.AR.2.2 (the document of truth — nothing is built
   without its section); `m7/reference/HOUSE STYLE.md` §0, §2a, §13, §13b rulings 36–51 and §16; `m7/packages/M7 Unit 9 -
   Algebraic Expressions/00 - START HERE.md`; then open `u9/l02.py`, `u9/l08.py`, `u9/review.py`, `u9/unit.py`,
   `u9/manifest.py` beside their output in `out/u9/` — that is the standard you are matching. `u4/l06.py` is the model
   for a lesson with figures (you will have few: number lines).
6. Read `m7/reference/M7 Unit 9 Algebraic Expressions - Audit.md` — it is the model for the audit you will write, including
   §7 (Croix's decisions) and §8 (the review pass).

## 1. Intake and audit (day one)

**Math Nation, from Drive.** Folder *Windy Hill master › MathNation › FL 7th Grade › Unit 10 - Equations and Inequalities*,
Drive folder id **`1QhzQ30kMKzhNEexTsZOAki62Db5uMNbA`**. Inside: `Lesson 01 - Exploring Inequalities - Part 1` …
`Lesson 10 - Writing and Solving Equations in Real-World Context` and `Unit Resources` (7.10 Assessment, Assessment Key,
Assessment Guide). Each lesson folder: `7.10.NN Teacher Edition.pdf`, `7.10.NN Student Edition.pdf`, `7.10.NN Additional
Practice.pdf` and its answer key. Download every PDF to `/root/mn/unit10/` (HOW WE WORK §2). Lesson 01's folder id is
`1ugDpN3FVFGaeIBGQIilfM-WwIkC11xVp` and Unit Resources is `1VZN0s3bPQoHuFEGY-Pkji67pcqEA4_-U`; list the rest with
`search_files` on the unit folder.

**Work every problem** in the package with sympy — the lessons, the additional practice, the unit test. Write
`m7/reference/M7 Unit 10 Equations and Inequalities - Audit.md` in the Unit 9 audit's shape: §1 defects that are
student-facing or in a key (numbered, with page); §2 teacher-facing slips; §3 conflicts with the rulings and TRUTH; §4
what the benchmark expects that the book never asks (AR.2.1's clarifications: inequalities with rational coefficients,
the flip when multiplying or dividing by a negative, solutions graphed on a number line; AR.2.2's two forms px ± q = r and
p(x ± q) = r, rational numbers, real-world contexts); §5 the state's own item shapes from the Math Nation test; §6 judgment
calls — only genuine ones. Push it. **Benchmark and FAST item specifications first, Math Nation second, as an audit target
(§16).**

**Outline every lesson from the benchmarks** before you write a spec: `m7/reference/M7 Unit 10 Equations and Inequalities -
Lesson Outlines.md` — for each of the nine days: the learning target, what the notes teach, the two worked examples, the nine
whiteboard questions as one line each (the mistake each diagnostic board catches), the six independent questions as kinds.
Hold the outline to §16 (the Barton rules) and to ruling 43 (no practice item repeats the notes or an example). Push it.
Message Croix: the audit's §1 count, the outline's link, any §6 call you need him for. Then start building. Do not wait.

## 2. The plan — copy these, do not retype them

Dates are the plan's as laid on 24 Oct 2026 (`m7/reference/M7 Scope and Sequence 2026-27.md`; `tools/mkscope.py` is the
source). The IXL skills and codes are the plan's: **the build refuses any other** (ruling 28). A lesson with none listed
carries the unit's skills so far and says so in `ixl_due` (BUILDING A UNIT §5 step 5).

| Day | Spec | `code` | `lesson_no` | Title | Benchmark | IXL — exactly these |
|---|---|---|---|---|---|---|
| Wed 4 Nov (43 min) | `l01.py` | `10.01` | 1 | Exploring Inequalities – Part 1 | MA.7.AR.2.1 | Solutions to inequalities (8BA); Graph inequalities on number lines (VLU); Write inequalities from number lines (JNL) |
| Thu 5 Nov | `l02.py` | `10.02` | 2 | Solving One-Step Inequalities Using Addition and Subtraction | MA.7.AR.2.1 | Solve one-step addition and subtraction inequalities (7MP); Solve and graph one-step addition and subtraction inequalities (9WP); Solve one-step addition and subtraction inequalities: word problems (9GC) |
| Fri 6 Nov | `l03.py` | `10.03` | 3 | Exploring Inequalities – Part 2 | MA.7.AR.2.1 | *none listed — the unit's skills so far, said in `ixl_due`* |
| Mon 9 Nov | `l04.py` | `10.04` | 4 | Solving One-Step Inequalities Using Multiplication and Division | MA.7.AR.2.1 | Solve one-step multiplication and division inequalities (E9Q); Solve and graph one-step multiplication and division inequalities (PFK); One-step multiplication and division inequalities: word problems (JDA); Solve one-step inequalities (QWH); Graph solutions to one-step inequalities (TFK) |
| Tue 10 Nov | `l05.py` | `10.05` | 5 | Solving Two-Step Equations Using Properties of Equality | MA.7.AR.2.2 | Solve two-step equations: complete the solution (X2L); Which x satisfies an equation? (DJS); Solve two-step equations using algebra tiles (R9E) |
| Thu 12 Nov | `l06.py` | `10.06` | 6 | Solving Two-Step Equations | MA.7.AR.2.2 | Solve two-step equations without parentheses (CMX); Solve equations of the form px + q = r with fractions (Y6Q) |
| Fri 13 Nov | `l07.py` | `10.07` | 7 | Solving Equations Involving the Distributive Property | MA.7.AR.2.2 | Solve two-step equations with parentheses (NSH); Solve equations of the form p(x + q) = r with fractions (A8D); Solve two-step equations with integers (QEB); Solve equations involving like terms (VSW) |
| Mon 16 Nov | `l08.py` | `10.08` | 8 | Solving Real-World Problems With Two-Step Equations | MA.7.AR.2.2 | Choose two-step equations: word problems (8NH) |
| Tue 17 Nov | `l09.py` | `10.09` | `"9–10"` | Writing and Solving Two-Step Equations From Real-World Contexts | MA.7.AR.2.2 | Solve two-step equations: word problems (D2Y) |
| Wed 18 Nov (43 min) | `review.py` | `10.R` | 11 | Unit 10 Review (`review=True`) | both | the unit's skills (see `u4/review.py`) |
| Thu–Fri 19–20 Nov | — | — | — | the test: a random set of the practice page (ruling 49), two periods | | |

Notes on the table:
- **10.09+10 is one spec**, `code="10.09"`, `lesson_no="9–10"`, as `u9/l03.py` does for 9.03+04 and `u9/l06.py` for 9.06+07
  (ruling 50 explains why a merged day is one deck). Title as above. Its plan is Math Nation 10.9 (write the equation) and
  10.10 (write and solve) in one 53-minute period: the notes teach writing from a context, the boards solve.
- Wednesday decks (10.01, the review) are built for **43 minutes**: `course.py` sets the period; the spec's `min` fields have to
  fit it (`plan does not fit` is the message when they don't).
- 10.01 and 10.03 are the book's two "Exploring" days. The outline decides what each teaches from AR.2.1 — do not pad an
  exploring day; if the benchmark's content for AR.2.1 is better spread as 10.01 solutions-and-graphs, 10.02 add/subtract,
  10.03 the flip (multiply or divide by a negative, read from a number line, which side the solutions lie), 10.04 multiply/divide
  with rational coefficients and word problems, say so in the outline and build it that way. The plan's titles stay (they are
  the master sheet's).
- **The MA.7.AR.2.2 learning plan** (Croix's Deliberate Practice Plan with his dad) sits on 10.05–10.10: its exit tickets
  already exist (`m7/for Croix/Learning Plans/M7 Exit Tickets MA.7.AR.2.2.pdf` and key; `m7/build/plan/exit_tickets.py`
  wrote them). The plan's **CFA 1** falls on 10.07, its **CFA 1 response** on the review day, its **CSA** is the unit test.
  You do not rebuild the plan or the tickets. You do: read the learning plan PDF in that folder; keep each lesson's learning
  target consistent with the plan's targets (LT1–LT3); name the CFA 1 ticket in 10.07's Teacher Edition (`te.notes`) and the
  response in the review's; and put the plan's equation forms on the review deck's notes slide.

## 3. Lessons, one at a time

BUILDING A UNIT §5, exactly. For each spec: copy the nearest model (`u9/l02.py` for a lesson with no figures; `u4/l06.py`
for one with figures). **Number lines are figures and the kit has no number-line primitive**: draw one as a `kind="shapes"`
spec — a `seg` for the line with small `seg` ticks, a `circle` at the boundary (white `fill` for open, ink for closed), a thick
`seg` for the ray, `text` labels under the ticks — and put the helper that builds it from (boundary, open/closed, direction,
window) in `u10/figs.py` so every board draws it the same way; look at the first one on a contact sheet before writing the
second. Ruling 44 means every number on a drawn number line is in the words. Change every field, decide the items before the prose,
write the `check` with each item, nine boards with the ninth written and exactly one `unneeded` board (ruling 22), six
independent questions (ruling 21), `shuffle_choices.py` once, then

```sh
cd m7/build
python3 gates.py u10                      # seconds; every gate, no building
python3 build_lesson.py u10/l01.py        # the five gates again, then Slides .pptx/.pdf, Teacher Edition, Lesson Plan, the bank section
python3 checks.py out/u10                 # must end "checks: 0 findings"
python3 contact_sheet.py "out/u10/M7 10.01 Exploring Inequalities – Part 1 - Slides.pdf"   # then LOOK at it, and at any crowded slide at 60–80 dpi, and at the Teacher Edition
python3 figure_sheets.py u10 --grid 4     # when the lesson has a picture: every picture beside its words
cd ../.. && bash tools/push.sh "M7 Unit 10: lesson 10.01 (AR.2.1) — one line on what is notable"
```

Unit-specific rules you will meet:
- **Inequalities on number lines** are the only figures in 10.01–10.04. Open circle for < and >, closed for ≤ and ≥, the arrow
  the right way, the number under the circle. A board that asks "write the inequality from the graph" draws the graph; one that
  asks "graph the solution" shows the graph on the answer slide only.
- **The flip** (10.03/10.04): every multiple-choice board on dividing by a negative has the un-flipped inequality as a named
  error, cited to AR.2.1's clarification. No negative coefficients before the flip is taught.
- **Two-step equations**: rational numbers mean fractions and decimals, not only integers (AR.2.2 clarification); Math Nation
  under-asks fractions — the audit's §4 says by how much, and the lessons make it up. Both forms, px + q = r and p(x + q) = r,
  with p, q, r rational; at least one board per two-step lesson has a negative p.
- **Real-world boards (10.08, 10.09+10)** are one plain sentence of story then the ask (ruling 45); "write the equation" and
  "solve it" are two parts of one item where the plan says write-and-solve.
- **Ruling 43**: once the notes and examples are written, every practice number is new. `rulingcheck` refuses a repeat;
  `python3 /root/work/Windmill/tools/dry_run.py /root/work/windy-hill-m7/m7/build u10` shows one in seconds.
- No benchmark code on a student page; no "calculator"; the deck's title slide and the keys carry the codes.

## 4. The review day and the unit documents

1. **`u10/review.py`** — `u4/review.py` is the model (M7's review day is a deck built like a lesson, `review=True`, `code="10.R"`,
   43 minutes on Wed 18 Nov). Every board is a practice-test shape with a third set of numbers; **no transfer types** (ruling 49
   retired them — ignore ruling 30 here); the CFA 1 response is named in its TE notes. Build and check it like a lesson.
2. **`u10/unit.py`** — model `u9/unit.py` for shape, but:
   - `assessment.forms = {"practice": _sections("practice")}` and **nothing else**. Write `_sections` for the practice form only
     (one value per item; no `pick(form, …)`), sections by benchmark in order (AR.2.1 then AR.2.2), `total`, `tracker`,
     `tracker_order`, `points` per section. No `transfer=True` anywhere. No Form A/B.
   - The practice paper is the **blueprint of the test**: its questions, in its order, with its points, are what the practice page
     (§6) generates with new numbers, and what the master sheet maps. Size it for **two periods** (M7's test is two days):
     Unit 9's is 24 points over 16 questions; aim near that, weighted to the benchmarks' days (4 : 6).
   - M7 ships **no reference sheet and no review paper** (`u9/unit.py` is `unit`, `title`, `assessment` and nothing else; the
     review is the deck). Keep it that way. (The "put the plan's forms on the reference sheet" line in §2 therefore means: on
     the review deck's notes slide.)
   - `python3 build_unit.py u10/unit.py` → the Reference Sheet, the Practice Test paper and its key, All Slides; it prints
     `forms: the practice test alone (ruling 49 …)`. Then `python3 checks.py out/u10` → 0 findings.
3. **`u10/manifest.py`** — model `u9/manifest.py`; `summary` says the test is a random set of the practice page.
4. **`python3 build_all.py u10 --install`** — the shipping gate: rebuilds everything, 0 findings, writes the package in
   `m7/packages/M7 Unit 10 - Equations and Inequalities/` with its START HERE (it will say the test is a random set) and the zips.
5. **The master sheet**, from the repository root:
   `python3 tools/master_sheet.py` → `python3 /mnt/skills/public/xlsx/scripts/recalc.py "m7/reference/M7 Master Sheet 2026-27.xlsx"`
   (0 errors) → `python3 tools/check_master_sheet.py --sweep` (0 problems). The sheet's Unit tests tab will say "random set of
   the practice page" for Unit 10 and map the practice test; `check.sh` refuses the push until it does.
6. Push.

## 5. The practice page (the test comes from here)

The student practice page is a web page built on the shared practice kit: `m7/practice/kit/` (read its `README.md`, all of it,
and the section "Making the next unit"). The latest unit on the kit in this repository is `m7/practice/u4/`; the latest anywhere
is A7's `a7/practice/u4/` (24 Oct: the point is earned on one on your own; streaks). Model yours on `m7/practice/u4/` for the
M7 look and on A7 Unit 4's `engine.js`/`coach.js` for the newest patterns.

1. `mkdir m7/practice/u10` and copy `unit.json`, `unit.js`, `unit.css`, `engine.js`, `coach.js`, `preview.html` from the model;
   remove `pt.js`, `bi_check.js` and `"second"` (no Portuguese on a new unit); `contentVersion: 1`.
2. **One generator + family per question of the practice paper**, in the paper's order and points (the page's `u10_check.js`
   reads the titles from `build/u10/unit.py`, as `m7_check.js` does). Each family: `models` (the named mistakes: the un-flipped
   inequality, the sign lost in subtraction, dividing before subtracting, distributing to one term only…), `rule`, `solution`
   (the worked lines), `walk` (the Hint steps). Number lines as the kit's figures (`fig.js` in the model).
3. **Variety**: every part ≥ 100 versions over 20,000 sets. Design the number spaces wide from the start (coefficients 2–12,
   constants to 50, fractions with small denominators, decimals to tenths) inside AR.2.1/AR.2.2's limits.
4. **The checks**, at the Unit 4 standard: `u10_check.js` (3,000 sets: shape, every key typed back right, every modelled mistake
   wrong and named, every Hint step carries the answer…), `verify_m7.py` (the sympy oracle reading the HTML back), a
   `plant_check.py` with planted errors the checks must catch. `unit.json` lists them. Then
   `python3 m7/practice/kit/check/run.py m7/practice/u10` — unit checks, the lock, the variety check, the browser checks
   (`check/page.js`) — until it passes. It writes `CHECKED`.
5. **The teacher copy**: `m7/practice/u10/teacher/` from `m7/practice/u4/teacher/` (its `unit.json`, `gen_test.py` pointing at
   `../../../build/u10/unit.py`, `unit.js`). `python3 gen_test.py` writes `test.js` with `random: true` (no fixed forms); the
   bar on the page prints the test as 1–5 random sets with keys. `python3 ../../kit/check/run.py .` in that folder.
6. `python3 m7/practice/kit/build.py m7/practice/u10` and the teacher folder → `M7 Unit 10 Practice Test.html` and
   `M7 Unit 10 Teacher Copy.html`. Open both in Playwright, screenshot, look. Commit the folder (not the artifacts — nothing is
   published by you). Push.

## 6. The review pass, before you call it done

Croix asked for this on Units 9 and 5 and it found real defects each time. Run three independent readers (subagents that have
not seen the specs being written) over the built unit — slides PDFs, Teacher Editions, the practice paper and key, the practice
page's questions:
- a **Barton review** (Craig Barton's principles: one thing changes at a time, example–problem pairs, diagnostic distractors each
  from a single misconception, no cognitive overload on a slide);
- an **adversarial critic** (tries to find a wrong key, an ambiguous stem, a distractor no student would produce, a board that
  needs a step the unit has not taught, a picture that disagrees with its words);
- a **Florida master educator who has sat FAST item committees** (benchmark boundaries, FAST item shapes, clarification language).
Put their findings and what you did in the audit's §8; fix; rebuild (`build_all.py u10 --install`); master sheet; push.

## 7. Handoff

- `NOTES.md`: a new top section "State of the work — <date>", in the shape of the 18 October one: what was built and installed
  (hash), the review pass, kit or toolchain notes, judgment calls, what is open.
- Your last message to Croix (HOW WE WORK, "When you are done"). Name the commit. Then stop — the review session publishes.

## If something blocks you

- A Math Nation page is missing or unreadable → say which, build from the benchmark and the audit, note it in §6.
- A gate refuses something you believe is right → read the message's table in BUILDING A UNIT §5 first; if it is the kit that is
  wrong, say so to Croix with the message, and move to the next item. Never edit the kit, never `ack`.
- The master sheet check refuses the push over something not about Unit 10 → tell Croix the exact line; do not change the checker.
- You are unsure whether a question is inside AR.2.1/AR.2.2 → TRUTH's Boundaries decide; if TRUTH is silent, leave it out and list it.
