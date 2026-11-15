# The build kit

One code base that turns a lesson spec into its deck (PowerPoint and the HTML console), teacher's
edition, lesson plan and question documents — for **both** courses. It was two forks: the accelerated
course's `a7/build/lib` and the copy the on-level course took on 20 September 2026. By 4 October the
lesson builder alone differed by more than eight hundred lines, each side had fixes the other needed
(M7 had no `overlap` check and shipped a wrapped option printed over the one below it; A7 had no
title-line guard and shipped seven title slides whose last line sat on the box's edge), and a third
of M7's rebuilt decks had lost the colour code their slides still talked about. This folder is the
merge. It is published from here and copied into each course repository; neither copy is edited.

## What is in it

| Path | What it is |
|---|---|
| `lib/profile.py` | Reads `build/course.py` — everything a course settles for itself — and hands it to the kit as `C`. A name the course leaves out takes the family default. `python3 -m lib.profile` prints the profile and marks what the course set: that list is "where the courses differ", derived. |
| `lib/lessonbuild.py` | The gates (mathcheck, distractorcheck, capcheck, rulingcheck, balancecheck — each refuses the build) and the builders: the lesson's slides (`_fill_deck`, one function for the pptx and the HTML deck), the whole-unit deck, both teacher's-edition styles, the bank file. |
| `lib/deckkit.py` · `lib/htmlkit.py` · `lib/consolekit.py` | The pptx deck, the HTML deck (KaTeX, one self-contained file) and the console wrapped around the unit deck (Today, the rail, pacing, the whiteboard round, the room). Same interface, so one builder drives all three. |
| `lib/mathimg.py` · `lib/figkit.py` | Expression images (mathtext, one size per surface) and geometry figures drawn from their numbers. A height that ends outside its figure is refused. |
| `lib/names.py` | **Every file name the build writes**, in one place: `<COURSE> <unit>.<lesson> <Lesson Title> - <What it is>[ - Key].<ext>` and `<COURSE> Unit <N> <Unit Title> - <What it is>…`; and the readers (`is_key`, `is_lesson_deck`, …) the checks and the installer use, which read what a file IS from the part after the first ` - `, never from the title. Croix's ruling 34, 4 October 2026. |
| `lib/flow.py`, `lib/flow.js` | **The plan's engine** (Croix, 4 October 2026: "I need the plan to be fluid and adjust on the fly"; his rule: push everything back). `lay` puts a course's sequence — lessons, reviews, tests, in order — on the school days left after the as-run log has taken out the days that went to something else: a test's first day is a Monday or a Thursday and its second the next day, a spiral day fills what has to pass, a flex day is dropped when the class is behind, a unit does not start right before a break. The Python is what each course's calendar tool runs (`apply_log`, `baseline`, `changes`); the JavaScript is the same `lay` for the console, plus `where`: what a period did last, what is next, how far it is from the year's plan, when the unit's test now falls. Windmill's `plan/test_flow.py` holds the two engines to each other. |
| `lib/packkit.py` | **One package layout for both courses**, by lesson: `All Slides/`, `Lessons/<N.NN>/` with its `Keys/` (the lesson's number only — a path that carries the title three times does not unzip on Windows; the install refuses one that would not), `Review Day/` or `Review/`, `Assessment/` (by form), `Handouts/`, `Reference/`; each file placed by its name and compared byte for byte with the build; the zips (the whole folder also in parts when it is over the upload limit); the dates and timing a START HERE derives. Each course's `install_unit.py` calls it and writes its own START HERE. |
| `lib/ixlplan.py` | Ruling 28 as a gate (inside `rulingcheck`): every IXL skill on a slide, and the code a student types beside it, is the course's IXL plan's — read from the spine the course vendors. A lesson the plan lists skills for names exactly those. |
| `lib/unitload.py` | Loads a spec with its own unit's modules (`figs.py`, `data.py`): a process that loads several units never hands one unit another's (15 Nov 2026). Every loader in the kit uses it; a course tool that loads specs should too. |
| `lib/slotmark.py` | The colour code's named slots: `\sA{}` blue, `\sB{}` orange, `\sH{}` teal, marked in the spec where the slot stands, honoured only on slides and only where the teacher shows, stripped everywhere else. |
| `lib/dockit.py` · `lib/tekit.py` · `lib/plankit.py` · `lib/unitbuild.py` | Word documents, the teacher's edition, the Florida lesson plan (two styles), and the unit documents (reference sheet, review, a single paper or parallel forms with keys and worked-answers copies). |
| `checks.py` | Eighteen checks over a built unit, each printing what it looked at. `kitcheck` holds the copy in a course repository to `KIT.sha256`. |
| `build_lesson.py` · `build_unit.py` · `build_all.py` | The drivers. |
| `gates.py` | Every build gate over a unit's specs without building anything, and the kit held to its manifest — no LibreOffice, no browser, so each course's `tools/check.sh` runs it before every push and in CI. |
| `slotaudit.py` · `shuffle_choices.py` · `contact_sheet.py` · `figure_sheets.py` | Read every coloured expression as the renderer reads it; spread the keyed letters; look at every slide; look at every PICTURE beside its words (ruling 44's look-through). |
| `assets/` | KaTeX and the house face, inlined into every HTML deck. |
| `KIT.sha256` | The manifest: every file above with its hash. Written by `tools/kit_manifest.py`. |
| `tests/` | The kit's own tests: every gate shown a spec it must pass and a planted defect it must catch, under a profile shaped like each course's. Run by `tools/check.sh` and CI. |

## Changing it

1. Edit here, in `kit/`. Never in a course repository — `kitcheck` there will refuse the build's output.
2. `python3 tools/kit_manifest.py` and `bash tools/check.sh` (the kit tests run under both profiles).
3. Vendor into each course and rebuild a unit of each: `python3 tools/vendor_into.py <course>/…/build`
   (each course repository's `tools/vendor_windmill.py` calls this).
4. A change is finished when **both** courses rebuild at `checks: 0 findings` and anything that
   moved in either course's output is something the change meant to move.

A course difference is a name in `lib/profile.py` with a family default, set in that course's
`course.py` — never an `if` on the course's name.

## What a course repository owns

`build/course.py` (which also holds each unit's title, `UNITS` — every unit-wide file and folder is
named from it); its unit folders (`uN/lNN.py`, `unit.py`, `review.py`, `manifest.py`, `figs.py`); its
`install_unit.py` (where its packages live and what START HERE says — the layout itself is the kit's);
its rulebook, whose suite tables `suitecheck` reads.

## 15 November 2026 — the kit limits the Unit 11 and Unit 13 builders hit

Croix, 15 Nov, 8:40 am, told what the kit could not do for A7 Unit 11 and M7 Unit 13: *"Fix windmill. Fix the
other kits. Fix everything."* Each fix below has its line in `SPEC SCHEMA.md` and its tests in `tests/test_kit.py`
(a spec it must pass and a planted defect it must catch, under both test profiles).

### Every unit's own `figs.py` (`lib/unitload.py`)
A process that loads several units — `gates.py`, `figure_sheets.py`, `slotaudit.py`, `web_decks.py`, the IXL
gate's look at a day's other decks, a course's `tools/master_sheet.py` — handed the second unit's `import figs`
the first unit's module: Python keeps a module by its name. A7's gates crashed on `figs.strips`, and Unit 11's
module had to be called `figs11`. Every kit loader now goes through `unitload.load(path, name)`: a cached module
that answers to the name of a file in the spec's folder but came from elsewhere is put aside first, and every
module the spec loaded from its own folder is dropped after, so no unit can be handed another's. A course tool
that loads specs itself does `from lib.unitload import load` (with `build/` on its path) and calls
`load(path).L`. `figs11` may stay as it is or go back to `figs`; both now work. Test: "unit modules: two units,
each with its own figs.py, load and gate in one process".

### A line of working may say what it is (`lessonbuild.stepcheck_rows`)
stepcheck refused two lines an equations unit needs: a false numerical ending (`$8 = 5$` — a no-solution equation ends
that way) and an equation with the letter on both sides that is not an identity (`$6x + 8 = 6x + 5$`, `$30 + 5v = 8v$`),
so A7 Unit 11 said them in words. A step may now open with `[equation]` or `[false]` (stripped before the line is set,
by `shown_steps`, on every slide surface). A declared equation is solved (sympy `solveset` over the reals, with the
letters made real — the check's letters are positive, an equation's solution may be negative) and must have the
solution set of the equation step before it; a declared false ending must be false and follow an equation with no
solution; and where a line declares itself the working's last equation must agree with the answer — its value of the
letter, "no solution", "infinitely many solutions". Every undeclared line is checked as before (both courses' specs
gate at 0 findings). Tests: "steps: a declared equation and a declared false ending pass…" and the eight "planted:"
lines after it.

### A figure wherever a question is
A Your Turn, a worked slide, a warm-up question and the six-question set could not carry a figure, so A7 Unit 11's
graph-day Your Turns worked from two tables and M7 Unit 13 wrote some stem-and-leaf plots on one line. Now: a Your
Turn takes `fig` (and `fig_a` for its answer slide, the steps beside it); a worked entry takes `fig`, drawn on that
worked slide with the rows beside it (`Deck.figure_steps`, which now takes the rows' surface); a warm-up question takes
`fig` (`Deck.figure_row`: the figures in a row under the four questions, each under its number, on both warm-up
slides); an independent question takes `fig` on the set's slide under every profile (`independent_set(…, figs=)`: a
right-hand column of figures, the six questions in the column it leaves) and on the printed set where there is one. The
HTML deck (`figure_row`, `figure_steps`, the set's `setfig`) and so the unit deck and the console do the same. The
Teacher Edition prints no figure anywhere, so nothing changed there. `figwords` reads a worked slide's figure against
its Example's problem and its rows; `repeatcheck` counts worked and warm-up figures as shown and a set question's
figure as given; `figure_sheets.py` draws worked figures (marked "shown WITH THE WORKING") and key figures. Tests:
the nine "figures: …" lines under "a figure wherever a question is" and their "planted:" lines.

### A key's own figure (`fig_key`)
A paper's key printed the same figure as its page, so the key of "graph both lines on this grid" showed the empty grid
and A7 Unit 11's 11.07 and 11.08 Independent Set keys gave each crossing in words. `fig_key` on any paper question
(set, bank, additional, review, test, forms, practice test) is printed by the key and the Worked Answers copy in place of
`fig` (`lessonbuild._fmt_q` → `dockit.question(fig_is_key=True)`, which marks the picture `descr="fig_key"`). `keycheck`
now pairs every student paper with its key and Worked Answers twin and holds the key's figures to the page's, position
for position, allowing only a marked key figure to differ (no new check name, so neither course's suite table moves).
`figwords`, `units_agree` and `figure_sheets.py` read `fig_key`. Tests: "fig_key: …" and "planted: a key figure that
differs from its page's with no fig_key is caught".

### A choice board's figure beside its options (`Deck.choices_beside`)
A board with a figure and four options stacked them: the options took about 1.75 in and left the figure 1 to 1.6 in
(M7 13.02 boards 1, 2, 6; 13.04 boards 4, 6). `_wb_body` now asks `choices_beside` first: the figure on the left at the
height the slide leaves above the answer line, the options in a column on its right (stepping 24 → 22 → 20 pt until
they fit), the pair centred. It declines — and the board stacks as before — when the column would leave the figure no
taller than stacking does (a wide, short figure) or the options do not fit beside it. The decision is made at the
answer slide's reserve with every option measured bold, so the question slide and the answer slide lay out alike; the
HTML deck (`figchoices`) follows the PowerPoint's choice (`_pptx_beside`). A Your Turn has no options in the schema, so
this is the boards' (and the review day's boards'). Where stacking could not draw the figure at all (its labels would fall
under 11.5 pt, so the fit refuses), the measure of the stacked layout counts as no room rather than stopping the build,
and the figure goes beside its options (A7 11.07, 15 Nov). Tests: "choices beside: …" (six lines).

### `shuffle_choices.py`: paths, select-all answer lines, and what it cannot rewrite
It took `uN lNN.py` and not a path; it now takes either (`u11/l05.py`, an absolute path, several paths, a unit folder),
with the same seed either way. It rewrote a select-all's answer line only in the form "A, B and C"; it now rewrites any
letter list a spec writes ("A, C and D — …", "A, C, and D", "B, D", "A and E: …"), and reports one whose letters are
not its keyed options instead of rewriting it. It walks a board's `steps`, `te_answer` and `qtext` with the other
prose, and every standalone letter in free prose it cannot safely rewrite (and every letter outside the items) is
printed again at the end under TO FIX BY HAND, with the item's first words and the line. The gate: `distractorcheck`
refuses a select-all whose answer line lists letters other than exactly its keyed ones (both courses' 74 select-alls
pass). Tests: "shuffle: …" (four lines) and "planted: a select-all whose answer line is not its key".

### American English in everything the kit prints
Croix: *"Make sure you are using American english."* The Teacher Edition printed "convince your neighbour" (the lines-style
edition's split-board move, `lessonbuild.SPLIT_MOVE`); it says "neighbor". Every string literal in the kit that is not a
docstring was read for British spellings: the only others were messages the build prints to the console ("answer-colour
run", "slot colour: …", "when coloured", "not centred", slotaudit's `colour.png`), all now American. Comments, docstrings
and identifiers (`render_colour`) were left. `figwords._UNIT` still READS "metres"/"centimetres", so a spec that writes
them is still understood. Test: "American English: no string the kit prints carries a British spelling …", which
tokenizes every kit file and reads every non-docstring string (JS and CSS blocks without their comments), with a planted
line that proves it catches one and passes a comment, a docstring and an identifier.

### Every saved figure trimmed to its ink (`figkit._trim`, `Deck._fit_figure`)
Every figure carried the transparent margin of its axes (on average 8–11% left and right and 9–16% top and bottom in
the two courses' libraries; a display's ink was 76–84% of its picture). The PNG is now cut to its ink and a 0.04-in pad
(`figkit.PAD`); the index records `[frame w, frame h, ink w, ink h]` and `draw` returns the ink's size, scaled as the
frame was — **`in` is read exactly as before (the frame's width), so a figure's ink is the size it was**.
`_fit_figure` holds the INK to the room it is given (a figure asked wider than the room is drawn narrower until its
ink fits), and the two-pass label sizing reads the frame width from the index. `CHECKED` moved to
`label-clear-2/ink-1`, so every figure is redrawn and re-checked once (each course's `figs/` gains a new set of files;
the old ones are no longer embedded and may be deleted). What moves in existing output: on slides, a figure that was
made small to fit (most board, Example and steps figures) comes out larger by up to the margin it dropped, the words
and answers under a figure move up, and a centred figure is centred on its ink; on papers, a figure's ink is the same
size and the space round it shrinks. Tests: "trim: …" (four lines).

### A label on a label (`figkit._struck`)
The struck-label check saw a label on a line and not two labels on each other. It now compares every pair of labels
whose boxes meet (a letter or a digit makes a label; two marks such as a line plot's stacked ×s may touch — M7 Unit
13's line plots stack 69 pairs of them). Surveyed over every figure of both courses in both faces at its own `in`: no
existing figure is refused. **A figure shrunk to fit keeps its labels full size** — that is what keeps them readable —
but where the smaller drawing would put a label on a line or on another label, `_fit_figure` now falls back to making
the checked picture smaller whole (as it already did for a line), down to 11.5-pt labels. Shrinking every figure's
labels with it was not done: it would change every room-limited figure in both courses. Tests: "struck labels: …"
(four lines).

### What the trim asked of the layouts
With every picture its ink, a figure that is made smaller to fit fills the room it is given. A figure's labels keep
their size as the drawing narrows, so one redrawing does not land exactly: as before, a figure on its own may stand a
little taller than its room (one drawing at the size the room asks for — so no figure comes out smaller than it did),
while a figure with something beside or under it that must not move — a board's ask, options or answer, steps, an
Example's ask, a Your Turn's answer, a cell of the set — is held to its room (`_fit_figure(…, strict=True)`: drawn again until it fits, then made
smaller whole). The width is always held exactly (a figure beside steps had pushed them off the slide). Three places
had leaned on the old slack: a board's or a Your Turn's answer
slide now leaves its answer its real height under the figure (`_answer_room`: the gaps and the answer's own height,
not a fixed 0.85 in); a Notes slide whose rows under its figure need more than the spec's `reserve` lets the figure give
up the room a tenth of an inch at a time (A7 11.05 Notes II, M7 4.05 Notes); and the set's figures are drawn to fill
their cells, and left off the slide (with a line on the console) where they are lettered for the page — A7 11.05, 11.07
and 11.08's grids are 9.5 pt — or the six cannot fit beside them, so those three slides are as they were.

### matplotlib 3.11's glyphs (`mathimg.parse`, `norm_glyphs`)
matplotlib 3.11 changed what `MathTextParser("path").parse()` gives for a glyph: `(font, size, char, ox, oy)` became
`(font, size, char, glyph index, ox, oy)`. `_paint` crashed ("too many values to unpack" — Windmill's GitHub check,
which installs the latest matplotlib); `_slot_colors` and `named_colors` read the index as x and x as the baseline, so
the slot colors went wrong without a word (the 1 of a base 10 came out black). Every parse in the kit now goes through
`mathimg.parse`, which normalizes the glyphs once to the five-field shape (`norm_glyphs`: the offsets are always the last
two); `slotaudit.py` uses it too. (The glyphs are read right on any matplotlib; the one the kit draws with is stated below.) Tests: "matplotlib 3.11: …" (four lines: the normalizer on both
shapes, the base 10's two digits blue and its exponent orange, a named slot's glyphs and fraction bar, a named expression
painted). Under 3.11.2 one other kit test fails, for a different reason: "math: at its 95% an expression in Lexend
stands as tall as the STIX one it replaces (within 6%)" — 3.11 sets a stacked fraction about a quarter taller in both
faces (3/4 + 5/8 at the slide size: Lexend 0.590 → 0.730 in, STIX 0.617 → 0.803 in), STIX more than Lexend, so the ratio
moved from 0.96 to 0.91. That is a layout change in matplotlib, not a misread field; the courses build on 3.10.9, where
every test passes. Moving them to 3.11 would make every fraction on a slide taller and needs its own pass.

### The one matplotlib the kit draws with (`mathimg.MATPLOTLIB`)
The taller fraction is not only a test's number: it breaks layouts the kit guarantees. Every lesson deck of both courses
laid out (PowerPoint, nothing saved) on 3.10.9 and on 3.11.2 with this kit: on 3.10.9 none fails; on 3.11.2 five M7 decks
stop — 8.01, 8.03, 9.02 and 9.03 ("a Your Turn's answer slide cannot hold its steps": a Your Turn of stacked fractions is
taller than its slide) and 8.05 (its answer line runs into the footer) — and A7 11.07 stops on board 2's answer slide (3.11
moves a label of its graph onto a line). So the kit states the matplotlib it supports in one place, `MATPLOTLIB = "3.10"`
in `lib/mathimg.py`: `build_lesson.py` and `build_unit.py` call `mathimg.require_matplotlib()` first and stop on another
series with *"matplotlib 3.11.2 is installed; the build kit draws with matplotlib 3.10 … install it: pip install
"matplotlib==3.10.\*""* (`KIT_ANY_MATPLOTLIB=1` builds anyway, with that line as a warning — for the pass that moves the
courses). Windmill's GitHub check reads the same line and installs that series for `tools/check.sh`, then installs the
newest matplotlib and runs `tests/test_matplotlib.py` alone on it (even when the first step failed), so a change in what a
parse hands back is caught the day it ships. The four glyph tests moved into that file (`test_kit.py` runs them with
the rest), with one for the refusal; `test_kit.py` has one more, that it runs on the supported series. The height test
("at its 95% an expression in Lexend stands as tall as the STIX one it replaces") stays as it was: it measures
`LEXEND_SCALE`, a kit constant calibrated on 3.10, and on 3.11 it fails because that calibration no longer holds — what it
should say. Moving to a newer matplotlib: rebuild both courses on it, fix what stops, change the one line.

### Where a board's two slides start, after the trim (`lessonbuild._fit_first`, `Deck.pre_trim`)
One figure came out smaller after the trim: M7 13.08 board 8's answer slide (and its copy in the whole-unit deck), 2.17 →
2.03 in. A board (and a Your Turn) with working on its answer slide is laid out from the first of a few tops at which that
slide fits, tried on a scratch deck. Before the trim, board 8's figure took its frame, sized to a room that left 0.85 in
under it, and its answer then had no room at the usual top, so the board started 0.25 in higher. With the picture its ink,
held to a room that leaves the answer its real height, the usual top fitted — at the cost of the figure. The trial now
lays the figure out as the kit did before the trim (its frame, fitted to the room it had then: `Deck.pre_trim`), so every
board and Your Turn starts where it did; only where no top fitted then (a layout the kit refused) is the slide laid out
from the top, of those that fit now, where its figure stands tallest. Surveyed over every board and Your Turn with a
figure in both courses (87 in M7, 41 in A7), before the trim, after it, and now: board 8 is back at 1.8 in with its figure
2.17 in, nothing else moved, and nothing is smaller than before the trim. Tests: "board top: …" (three lines).
