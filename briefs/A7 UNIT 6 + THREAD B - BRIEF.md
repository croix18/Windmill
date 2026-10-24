# A7 Unit 6 — Relationships in Triangles, then Thread B: the brief

*Read `00 - HOW WE WORK (read first).md` first. This document is the plan for one unit and the two thread days after it.*

## The unit in one paragraph

Grade 7 accelerated (Grade 8 FAST). Unit 6 is **MA.8.GR.1.3** (the Triangle Inequality Theorem and the converse of the
Pythagorean Theorem), **MA.8.GR.1.1** (the Pythagorean Theorem, mathematical and real-world), **MA.8.GR.1.2** (distance on the
coordinate plane) and **MA.8.GR.2.4** (similar triangles; indirect measurement). Six teaching days, **Fri 6 Nov – Mon 16 Nov
2026** (Math Nation's eight lessons, two pairs merged by the plan), the one-period test **Tue 17 Nov** (ruling 51: every A7
test is one period, any day but a Wednesday). Then **Thread B**, two days that belong to Unit 16's angle work but are taught now
so they are in play for the rest of the year: **T-B1 Wed 18 Nov (43 minutes)** angle pairs — MA.8.GR.1.4; **T-B2 Thu 19 Nov**
interior and exterior angles of a triangle — MA.8.GR.1.5. Then Thanksgiving; Unit 7 opens 30 Nov. **Unit 6 must be pushed,
reviewed and in its package by Friday 30 October**; Thread B by 6 November. Unit 6 follows Unit 5 (built, tested Thu 5 Nov):
the class has just done scale drawings and scale factor — the similar-triangles days build on that.

Repository: `croix18/croix18-windy-hill-a7`. Course profile: `a7/build/course.py`. **First edit: add `6: "Relationships in
Triangles"` to `UNITS`** — every unit-wide file and the package folder are named from it (keep the title short: paths over
180 characters do not unzip on Windows; `install_unit.py` refuses them). Everything you write goes in `a7/build/u6/`,
`a7/practice/u6/`, `a7/reference/` and a new `NOTES.md` at the repository root (M7's is the model).

## 0. Setup (do this exactly, then stop and verify)

1. Clone `croix18-windy-hill-a7` and `Windmill` as HOW WE WORK says; the token in `.github-token`. Clone `croix18/windy-hill-m7`
   too, read-only (the same token opens it): its `m7/build/BUILDING A UNIT.md` is the current procedure and its
   `m7/practice/u4/fig.js` + `fig.css` are how a practice page draws figures.
2. `bash tools/setup_env.sh` (apt, pip, fonts; verifies). Node and Playwright with Chromium are in the container
   (`node -e "require('playwright')"`; if that fails, `export NODE_PATH=$(npm root -g)`).
3. `bash tools/check.sh` from the repository root — must end `all checks passed`.
4. `cd a7/build && python3 build_all.py u5` — the smoke test; ends `checks: 0 findings` (10–15 minutes; background it and
   read while it runs). `out/` is git-ignored, so a fresh clone has nothing built until this runs.
5. Read, in this order: `../windy-hill-m7/m7/build/BUILDING A UNIT.md` (the current procedure; the kit is shared, so it is A7's
   too) and `a7/build/BUILDING A UNIT.md` §5 (A7's figure rules and history); `a7/build/SPEC SCHEMA.md`; `a7/reference/Florida BEST Grade 8 - Source of Truth.md` §MA.8.GR.1.1,
   1.2, 1.3, 1.4, 1.5 and MA.8.GR.2.4 (the document of truth for A7's grade-8 benchmarks); `a7/reference/HOUSE STYLE.md` §0,
   §2a, §13, §13b rulings 27, 27a, 30, 33–51 and §16; `a7/packages/A7 Unit 5 - Multi-Step Proportional Relationships/00 - START
   HERE.md`; then open `u5/l02.py` (a figure lesson), `u5/l10.py`, `u5/unit.py`, `u5/manifest.py` beside their output in
   `out/u5/`, and `u3/l07.py` (Thread A, day 1 — the model for a thread day) — that is the standard you are matching.
6. Read `a7/reference/A7 Unit 5 Multi-Step Proportional Relationships - Audit.md` — the model for the audit you will write,
   including §7 (Croix's decisions) and §8 (the review pass).
7. `python3 -m lib.profile` (from `a7/build`) prints how A7 differs from M7: an **Independent Set is a printed handout** with its
   key (`SET = "handout"`, six questions), the Teacher Edition is the lines style, `STEPS` are required on answer slides, the
   papers are Lexend, the practice test is the web page, **no review day** (ruling 27a — the Unit Review paper goes home).

## 1. Intake and audit (day one)

**Math Nation, from Drive.** *Windy Hill master › MathNation › FL 7th Grade Accelerated › Unit 06 - Relationships in
Triangles*, Drive folder id **`1zHNbt1F2osMJLuFTnS34MZqAC6MhjTSs`**: `Lesson 01 - The Triangle Inequality Theorem and the
Converse of the Pythagorean Theorem` (id `1pH0CDC2JcOv0F9D1tFZEc4F8tg-Xs6U0`), `Lesson 02 - Applying the Triangle Inequality
Theorem`, `Lesson 03 - Pythagorean Theorem`, `Lesson 04 - Using the Pythagorean Theorem to Solve Real-World Problems`,
`Lesson 05 - Finding Distances on the Coordinate Plane`, `Lesson 06 - Solving Real-World Problems on a Coordinate Plane with
the Pythagorean Theorem`, `Lesson 07 - Proportional Relationships and Similar Triangles`, `Lesson 08 - Solving Real-World
Problems Using Similar Triangles`, and `Unit Resources` (id `1_fmKKUMz4Y1pIaM7uWbVJLZNaQBUMX-p`: the 8.06 assessment, key,
guide). **Thread B's source** is *Unit 16 - Properties and Theorems of Angles*, folder id **`1B9nlUOOCETnbfKrIZq-uV4uyKn961SzP`**:
its Lesson 01 (16.1 angle relationships) and Lesson 02 (16.2 angle relationships in triangles) only. Download every PDF
(not the .pptx) to `/root/mn/unit06/` and `/root/mn/unit16/` (HOW WE WORK §2).

**Work every problem** in both packages with sympy — every lesson, the additional practice, the Unit 6 test, 16.1–16.2. Write
`a7/reference/A7 Unit 6 Relationships in Triangles - Audit.md` in Unit 5's shape: §1 student-facing defects and key errors
(numbered, with page); §2 teacher-facing slips; §3 conflicts with the rulings and the Source of Truth; §4 what each benchmark
expects that the book never asks; §5 the state's item shapes from the Math Nation test; §6 judgment calls — only genuine ones.
A short §9 for Thread B (16.1–16.2 against GR.1.4 and GR.1.5). Push it. **Benchmarks and FAST item specifications first, Math
Nation second, as an audit target (§16).**

**Outline every day from the benchmarks** before you write a spec: `a7/reference/A7 Unit 6 Relationships in Triangles -
Lesson Outlines.md` — for each of the six days and the two thread days: learning target, what the notes teach, the two worked
examples, the nine whiteboard questions as one line each (the mistake each diagnostic board catches), the six independent-set
questions as kinds. Hold it to §16 and ruling 43. Push it. Message Croix: the audit's §1 count, the outline, any §6 call you
need him for. Then start building. Do not wait.

## 2. The plan — copy these, do not retype them

Dates are the plan's as laid on 24 Oct 2026 (`a7/reference/A7 Scope and Sequence 2026-27.md`; `tools/scope_calendar.py` is the
source). The IXL skills and codes are the plan's: **the build refuses any other** (ruling 28). The IXL due date is the next class
day (ruling 28; the sheet is `a7/reference/A7 IXL Due Dates 2026-27.md`). SmartScore 67.

| Day | Spec | `code` | `lesson_no` | Title | Benchmark | IXL — exactly these |
|---|---|---|---|---|---|---|
| Fri 6 Nov | `l01.py` | `6.01` | `"1–2"` | Triangle Inequality Theorem; Converse of the Pythagorean Theorem | MA.8.GR.1.3 | Triangle inequality — 2N5; Converse of the Pythagorean theorem: is it a right triangle? — EQZ |
| Mon 9 Nov | `l03.py` | `6.03` | 3 | Pythagorean Theorem | MA.8.GR.1.1 | Pythagorean theorem: find the missing leg or hypotenuse length — MTM |
| Tue 10 Nov | `l04.py` | `6.04` | 4 | Pythagorean Theorem in Real-World Problems | MA.8.GR.1.1 | Pythagorean theorem: word problems — 87U |
| Thu 12 Nov | `l05.py` | `6.05` | 5 | Distance on the Coordinate Plane | MA.8.GR.1.2 | Find the distance between two points on a horizontal or vertical line — L9V; Find the distance between two points — ZBP |
| Fri 13 Nov | `l06.py` | `6.06` | 6 | Real-World Coordinate-Plane Problems; Perimeter | MA.8.GR.1.2 | Pythagorean theorem: find the perimeter — VGE |
| Mon 16 Nov | `l07.py` | `6.07` | `"7–8"` | Similar Triangles; Indirect Measurement | MA.8.GR.2.4 | Side lengths of similar triangles — QSK; Similar triangles and indirect measurement — 88W; Identify similar triangles — 6PD |
| Tue 17 Nov | — | `6.X` | — | **the test: one period, a random set of the practice page** (rulings 49, 51) | | |
| Wed 18 Nov (43 min) | `l09.py` | `6.T1` | `"T-B1"` | Angle Pairs: Supplementary, Complementary, Vertical, Adjacent (`plan_code="T-B1"`, `label="Thread B · Day 1"`) | MA.8.GR.1.4 | Identify complementary, supplementary, vertical, adjacent, and congruent angles — HGV; Find measures of complementary, supplementary, vertical, and adjacent angles — R2B; Write and solve equations using angle relationships — DBV |
| Thu 19 Nov | `l10.py` | `6.T2` | `"T-B2"` | Interior and Exterior Angles of a Triangle (`plan_code="T-B2"`, `label="Thread B · Day 2"`) | MA.8.GR.1.5 | Find missing angles in triangles — JFJ; Exterior Angle Theorem — FMP; Triangle Angle-Sum Theorem — 6Q6 |

Notes on the table:
- **Merged days are one spec each**, named by the first lesson (`6.01` with `lesson_no="1–2"`, `6.07` with `"7–8"`), as `u5/l02.py`
  is 5.02–03. One 53-minute period each. The plan merged them because Math Nation's 6.2 is 6.1's practice and 6.8 is 6.7's.
- **The thread days live in Unit 6's folder and package**, as Thread A lives in Unit 3's (`u3/l07.py`, `u3/l08.py`): `code="6.T1"`,
  `plan_code="T-B1"`, `unit=6`, `lesson_no="T-B1"`. They are not on the Unit 6 test. T-B1 is a **43-minute** deck.
- Write `ixl=[…]` exactly as the scope prints the skills (name — CODE); the plan's spelling is what `rulingcheck` compares.
- **No review day** (ruling 27a). The Unit Review paper and its key are `unit.py`'s; it goes home **Mon 16 Nov** with 6.07's
  independent set; the test is the next day.

## 3. Lessons, one at a time

BUILDING A UNIT §5, exactly. This unit is **all figures**: triangles with labelled sides, right-angle marks, coordinate grids,
similar triangles, shadows and ramps. The rules you will live by:
- **Every figure is drawn from its numbers** (`figkit`, `kind="shapes"` specs; `u5/figs.py` and M7's `u4/figs.py` are the helper
  models; put Unit 6's helpers in `u6/figs.py`: a right triangle from its legs with the right-angle mark, a triangle from three
  sides, a coordinate grid with two points and the dashed legs, two similar triangles side by side). A height or a leg that ends
  outside its figure is refused by the kit. **Ruling 44: every length the words give is on the picture and every number on the
  picture is in the words**; `python3 figure_sheets.py u6 --grid 4` draws every picture beside its words — look at all of them
  before the unit ships.
- **Pythagorean triples and non-triples**: when the answer is a whole number the sides are a triple; when the benchmark wants a
  square root, the answer is left as a simplified radical **and** as a decimal to the nearest tenth only where the context asks
  for a measurement (GR.1.1's clarification; the Source of Truth's boundary). The hypotenuse is never a leg: every multiple-choice
  board on a missing leg has "added instead of subtracted" as a named error.
- **The converse** (6.01): a² + b² = c² tests the *largest* side; a board where the longest side is not listed last catches that.
  **The Triangle Inequality** (6.01): the two smaller sides' sum against the largest — "can these be a triangle?" with the
  equals case as a named error.
- **Distance** (6.05–06): the horizontal and vertical legs are read from coordinates first (L9V), then the slanted distance;
  perimeter of a figure on the grid sums distances, some of them slanted.
- **Similar triangles** (6.07): proportional sides, the scale factor the class met in Unit 5; indirect measurement as one plain
  sentence of story (ruling 45) with the picture; the corresponding-sides match is what the diagnostic boards test.
- **Thread B**: T-B1 names the four angle pairs and finds a measure from each (equations in one unknown for the pairs — GR.1.4
  allows that); T-B2 is the Triangle Angle-Sum and the Exterior Angle Theorem, with the exterior-angle-equals-the-two-remote-interior-
  angles mistake ("equals the adjacent interior") as a named error. Diagrams with angle arcs and degree labels are figures too.
- Ruling 43: once the notes and examples are written, every practice number is new; `rulingcheck` refuses a repeat
  (`python3 /root/work/Windmill/tools/dry_run.py /root/work/croix18-windy-hill-a7/a7/build u6` shows one in seconds).
- No benchmark code, no "calculator", no "homework" on a student page. Calculators are allowed on every test (ruling 2), so
  radicals may be approximated where the words ask for a measurement.

For each spec: copy the nearest model, change every field, decide the items before the prose, write the `check` with each item
(a `check` can be `("eq", "sqrt(3**2+4**2)", "5")`; irrational answers check the exact form and the rounding separately —
SPEC SCHEMA has `approx`), nine boards with the ninth written and exactly one `unneeded` board (ruling 22), the six-question
independent set (A7 prints it as a handout with its key), `shuffle_choices.py` once, then

```sh
cd a7/build
python3 gates.py u6
python3 build_lesson.py u6/l01.py
python3 checks.py out/u6                  # must end "checks: 0 findings"
python3 contact_sheet.py "out/u6/A7 6.01 <Title> - Slides.pdf"    # then LOOK, and at the Teacher Edition and the Independent Set
python3 figure_sheets.py u6 --grid 4
cd ../.. && bash tools/push.sh "A7 Unit 6: lesson 6.01 (GR.1.3) — one line on what is notable"
```

## 4. The unit documents

1. **`u6/unit.py`** — model `u5/unit.py` for shape, but:
   - `assessment.forms = {"practice": _sections("practice")}` and **nothing else** (ruling 49): one value per item, sections by
     benchmark in the order GR.1.3 · GR.1.1 · GR.1.2 · GR.2.4, `total`, `tracker`, `tracker_order`. No `transfer=True`, no Form A/B,
     no `pick(form, …)`. The practice paper is the **blueprint of the test**: its questions in its order with its points are what the
     practice page generates with new numbers and what the master sheet maps. **Size it for one period** (ruling 51): Unit 5's
     two-period paper was 19 questions / 24 points; aim for about 12–14 questions, 16–18 points, weighted to the days (1 : 2 : 2 : 1).
   - `reference` — the Reference Sheet (ruling 13: studied from, not used on the test): the Triangle Inequality, the Pythagorean
     Theorem and its converse, the distance idea (legs from coordinates), similar triangles' proportional sides, Thread B's angle
     facts once they are taught (list them; the sheet goes home with the unit).
   - `review` — the Unit Review paper (unscored, goes home Mon 16 Nov) with its SSDD block, as Unit 5's has.
   - `python3 build_unit.py u6/unit.py` → Reference Sheet, Review and key, the Practice Test paper and key, All Slides; it prints
     `forms: the practice test alone (ruling 49 …)`. `python3 checks.py out/u6` → 0 findings.
2. **`u6/manifest.py`** — model `u5/manifest.py`; `summary` says "the test as one period on Tue 17 Nov (a random set of the practice
   page)"; `lessons` lists the six days and the two thread days with their printed labels (`6.01–02`, `6.03`, …, `T-B1`, `T-B2`).
3. **`python3 build_all.py u6 --install`** — the shipping gate: everything rebuilt at 0 findings, the package in
   `a7/packages/A7 Unit 6 - Relationships in Triangles/` with its START HERE (it will say the test is one period and a random set)
   and the zips.
4. **The master sheet**, from the repository root: `python3 tools/master_sheet.py` →
   `python3 /mnt/skills/public/xlsx/scripts/recalc.py "a7/reference/A7 Master Sheet 2026-27.xlsx"` (0 errors) →
   `python3 tools/check_master_sheet.py` (0 problems). `check.sh` refuses the push until it passes.
5. Push.

## 5. The practice page (the test comes from here)

The shared practice kit is `a7/practice/kit/` (read its `README.md`, all of it, and "Making the next unit"). The latest unit is
**`a7/practice/u4/`** (24 Oct: the point is earned on one on your own, the streaks, no test numbers on the page) — model yours on it.

1. `mkdir a7/practice/u6`; copy `unit.json`, `unit.js`, `unit.css`, `engine.js`, `coach.js`, `preview.html` from `u4`; remove
   `pt.js`, `bi_check.js`, `test_forms.js` and `"second"` (no Portuguese, no fixed forms on a new unit); `contentVersion: 1`.
2. **One generator + family per question of the practice paper**, in its order and points (`u6_check.js` reads the titles from
   `build/u6/unit.py` as `u4_check.js` does). Figures on the page: a unit draws its own as SVG (M7's `m7/practice/u4/fig.js` and `fig.css` are the model — A7 Unit 4 has no
   figures; copy that pair in as `fig.js`/`fig.css` and list them in `unit.json`) — a right triangle with its labels, a grid with two
   points, two similar triangles. Each family: `models` (the named mistakes: added the squares when a leg was asked, took the
   hypotenuse as a leg, forgot the square root, tested the wrong side in the converse, summed the wrong pair for the inequality,
   matched non-corresponding sides…), `rule`, `solution`, `walk`.
3. **Variety**: every part ≥ 100 versions over 20,000 sets. Triples alone will not do it (Unit 4 had to allow one part under the
   floor for exactly this reason — read `unit.json` "variety" in `u4`): mix whole-number answers (scaled triples: 3-4-5 × k, 5-12-13
   × k, 8-15-17, 7-24-25) with radical answers (legs to 15, answer as √n simplified, or rounded where the words say "to the nearest
   tenth"), coordinates on a −10…10 grid, scale factors as fractions and decimals. If a part's natural space is small, allow it in
   `unit.json` with its reason — only then.
4. **The checks** at the Unit 4 standard: `u6_check.js`, `verify.py` (the sympy oracle reading the HTML back), `plant_check.py`
   (planted errors the checks must catch). `python3 a7/practice/kit/check/run.py a7/practice/u6` until it passes; it writes `CHECKED`.
5. **The teacher copy**: `a7/practice/u6/teacher/` from `a7/practice/u4/teacher/` (`unit.json`, `gen_test.py` pointing at
   `../../../build/u6/unit.py`, `unit.js`). `python3 gen_test.py` writes `test.js` with `random: true`; the bar prints the test as
   1–5 random sets. `python3 ../../kit/check/run.py .` there.
6. `python3 a7/practice/kit/build.py a7/practice/u6` and the teacher folder → `A7 Unit 6 Practice Test.html`, `A7 Unit 6 Teacher
   Copy.html`. Open both in Playwright, screenshot, look (a figure on a phone-width screen too). Commit; push. You publish nothing.

## 6. The review pass, before you call it done

Three independent readers (subagents that have not seen the specs being written) over the built unit — slides, Teacher Editions,
independent sets and keys, the review, the practice paper and key, the practice page's questions: a **Barton review**; an
**adversarial critic** (a wrong key, an ambiguous stem, a distractor no student produces, a board needing an untaught step, a
picture that disagrees with its words, a radical left unsimplified in a key); a **Florida master educator who has sat FAST item
committees** (Grade 8 benchmark boundaries — e.g. GR.1.1 does not go to 3-D distances, GR.2.4 is similar triangles only — and
FAST item shapes). Findings and fixes in the audit's §8; rebuild (`build_all.py u6 --install`); master sheet; push.

## 7. Handoff

- Create `NOTES.md` at the repository root in the shape of M7's (its top section): what was built and installed (hash), the review
  pass, toolchain notes, judgment calls, what is open. Push.
- Your last message to Croix (HOW WE WORK, "When you are done"). Name the commit. Then stop — the review session publishes.

## If something blocks you

- A Math Nation page is missing or unreadable → say which, build from the benchmark and the audit, note it in §6.
- A gate refuses something you believe is right → BUILDING A UNIT §5's table first; if the kit is wrong, tell Croix the exact
  message and move on. Never edit the kit, never `ack`.
- `install_unit.py` refuses a path as too long → shorten the lesson title, not the layout.
- The master sheet check refuses the push over something not about Unit 6 → tell Croix the exact line; do not change the checker.
- You are unsure whether a question is inside a benchmark → the Source of Truth's boundaries decide; if it is silent, leave it out and list it.
