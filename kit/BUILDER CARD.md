# BUILDER CARD — writing one lesson spec

Read this, then `build/models/plain.py` (no figures) and `build/models/figures.py` (graphs and tables, with the unit's
figure module). Copy the nearer one to `uN/lNN.py` and change every field. `SPEC SCHEMA.md` is the reference when a
gate names something this card does not; the gates teach the rest. Rule 0: the mathematics is right, first.

## What a lesson is

One file, one dict `L`. The deck runs in a fixed order: title (1 min) · warm-up, four questions, and its answers (5) ·
Vocabulary (1; only if `vocab`) · Notes I–III (3–4 each) · two Examples, each its question, worked slide(s), then a
Your Turn · nine whiteboard questions, each a question and an answer slide (the remainder: 10–20 min) · the Independent
Set (6) · IXL (5). Period 53. One spec builds the Slides, the Lesson Plan, the Independent Set and its key, the
Question Bank and the Additional Question Bank with their keys. No Teacher Edition: nothing prints a teaching note.

## The spec, field by field (the models' order)

- `code` "11.03" (two digits; a thread day "3.T1", with `plan_code` the plan's code) · `unit` · `lesson_no` (`label` only if not "Lesson N").
- `align="="` — an equations lesson: rows that solve stand on their equals signs (a block may say `align=False`).
- `title` — in every file name, so keep it short: the package's longest path, `<course> Unit N - <unit title>/Lessons/<code>/Keys/<course> <code>
  <title> - Additional Question Bank - Key.pdf`, may not pass 180 characters (the install refuses it — A7 7.05's first title was 4 too long).
  `unit_title` — the unit's title, as `course.py UNITS` has it.
- `benchmark` — the ONE code on the title slide. `benchmark_text` — its exact wording, from the Source of Truth. A lesson that teaches two
  benchmarks adds `benchmarks=[(code, text), (code, text)]`: the Lesson Plan prints both in full; the title slide still names the one.
- `target` — "I can …", ≤ ~170 characters. `essential` — the essential question.
- `building_on`, `working_toward` — the lessons before and after, by code.
- `vocab` — [(term, meaning)] the lesson introduces; `vocab_slide=False` if only carried over.
- `ixl` — "Skill name — CODE", exactly the IXL plan's skills for the lesson (`ixl_due` only if the plan's due line will not do).
- `closure` — which board is the exit evidence and what a full answer says.
- `mtr` — two or three ("MTR.n.1", evidence from this period). `hoq` — [(question, "DOK n")]. `differentiation` — [("ESE / 504", …), ("ELL", …), ("Enrichment", …)], one concrete line each.
- `warmup` — four `dict(stem, answer, check)` (`fig` if pictured); a stem fits one line (~70 characters).
- `notes` — three `dict(numeral, head, min, …)` with `math=[…]`, `items`, `items2`, `text`, `table`, `fig`; `letters=False` drops the letters.
- `examples` — two `dict(title, min_q, prompt=[rows], ask, worked=[dict(min, rows=[(latex, remark)], answer, lead, fig)], check, your_turn=dict(min, prompt, steps, answer, fig, fig_a, ask), yt_check)`.
- `whiteboard` — nine dicts (below). Board 9 is `kind="written"` with `qtext`.
- `independent` — six items; `space` inches of work room. `no_set=True` only for a lesson with none.
- `bank`, `additional` — 12–13 items with `heading` lines between groups; `additional` mirrors `bank` position by position, new numbers.
- `te` — `must`, `must_not` (the benchmark's two lines; the plan prints them), `materials` (one line; a 43-minute day's cut goes here), `variation` (what varies and where the pattern breaks), `audit`, `changes`, `read_first` (these four print in the unit's BANK file).

Not written any more: `yesterday`, `today`, `title_note`, `warmup_note`, `vocab_note`, a slide's `sub` and `note`, `note_q`,
`note_a`, `hint`, `gloss`, `te_answer`, `handout`, a warm-up's `source` and `band`, `te.say`, `te.watch`,
`te.lives`, `te.sits`, `te.set_note`, `te.close`, `te.close_note`, `te.closure`, and `te.standard_notes` when `must`/`must_not` are given.

## Writing an item

**`check` on every item, part, warm-up question, Example (`check`) and Your Turn (`yt_check`)**, written from the
mathematics, not from your answer. sympy runs it; `F(a,b)` is a fraction, `sqrt`, `pi`, `sp`; never a float where a
fraction exists. The letters `a b c d k m n p q r s t w x y z` are POSITIVE symbols.
- a number: `("eq", "3*(-4) + 2", "-10")`; a rounded one `("approx", expr, keyed, tol)`.
- an expression: `("eq", "(3*m**2*n)**3/(9*m**4*n)", "3*m**2*n**2")`.
- an equation's solution (may be negative or zero): a real symbol, as the models' helpers do — `solves`, `same` (infinitely many), `never` (no solution) in plain.py; `crosses`, `never_meet`, `one_line`, `sat`, `fails`, `table_of` in figures.py. Copy them.
- a choice: check the key AND each wrong option from its error: `("many", <key is right>, <option B is not>, …)`; a select-all needs one `!=`/`not` clause per wrong option.
- a set of numbers: `("many", ("eq", …), ("eq", …))`, one per member, or `("true", "sp.solveset(...) == sp.FiniteSet(...)")`.
- several things at once: `("many", …)`. `("true", "python boolean")` for anything else; `sig("0.00470")` counts significant digits.
- `ack="reason"` instead of a check only for a purely verbal item.

**Choices.** `choices` (4; 5 on a select-all), `correct` (index, or a list for select-all), `answer` ("C — (2, 1)").
Options may carry `$…$`. `errors={letter: "what the student
did [cite]"}` on every wrong letter of every choice item — the cite is the B1G-M or the benchmark ("[Florida B1G-M,
AR.2.1: distributing to only one term]") or the lesson's own line ("[Notes II: …]"). A free or written board carries
`wrong="value — what was done [cite]; …"`. Write answer-first if you like, then run `shuffle_choices.py` once.

**`steps`** — every board and Your Turn: one to five lines, one step a line, a short label then the arithmetic
("Distribute:  $8x + 6 = 8x + 6$"). Every "=" is worked; a false ending is tagged `[false]`, the equation it comes
from `[equation]`. The last value must be the checked one.

**`unneeded="8"`** on exactly one board: the number the question does not need, one that would naturally be there.
**`repeat_ok=True`** only with a comment saying why the repeat is the point or a coincidence of values.

**A story board** — `text` rows: the story in roman, the ask a row beginning `**`. One sentence of story (two if the
second is the second quantity); every number the student needs is in it. The ask names a thing in the story and the
answer is that thing; never "What is the value of …" in costume — write that board bare.

**Figures** come from the unit's module (`uN/figs.py`; Unit 11's is `figs11`) and are sized for the slide
(`figs.slide(spec, inches, pt, reserve)`). They stand on: a warm-up question, a Notes slide, an Example's question
slide, a worked entry (beside its rows), a Your Turn (`fig`; `fig_a` on its answer slide), a board (`fig`; `fig_a`
on the reveal), a set, bank or additional item (`fig`; `fig_key` on the key only, e.g. the drawn graph for an empty
grid). Every number on a picture is in the words or explained; every length the words give is on it.

## The rules no gate fully enforces (as of 21 Nov 2026)

1. Build from the benchmark, its clarifications and the B1G-M first; Math Nation is read against the built lesson, never followed (§16, 29).
2. Teach only what the benchmark asks and its test can ask; its boundary goes in `must_not` (13, 29).
3. Notes teach from the front, reasons before procedures; no discovery, no partner work (§16 rule 6, 20).
4. The one peer move: a split choice board gets sixty seconds of "convince your neighbor", then a re-vote (20).
5. Each Example is followed by a Your Turn of the same structure with new numbers (§16 rule 1).
6. Each slide's problem is whole on that slide; `ask` is the problem's own question or absent (37).
7. Warm-up: last lesson, last week, last unit, and the prior-grade prerequisite THIS lesson needs; no new content; no source later on the calendar (§16 rule 5, 31).
8. The round: four free, two diagnostic choice, two more free (one backwards), nine written (10, §16 rule 4).
9. Practice is varied one feature at a time and breaks the pattern once on purpose; `te.variation` says where (§16 rule 2).
10. Every distractor is a named error a student makes — "arithmetic slip" is not a name; no option nobody would pick (§16 rule 4, 29).
11. Story boards pass the ten-second test from the back of the room; "harder" is a bare expression one feature on, not a longer story (45, 22, 15).
12. The extra number is one the situation would naturally carry (22).
13. Practice numbers appear nowhere above it; a renamed letter or swapped order is not a new problem (43).
14. A key names one answer, never two; nothing arguable (9).
15. Steps read the way the board would be written: label, then arithmetic (39).
16. Pictures: every needed length printed or derivable, each on the thing it measures, every number said what it is, every sentence about the picture true (38, 44).
17. A bank `heading` names a group, never numbers it; a lesson is called by its code (54).
18. American English; multiplication is a dot or parentheses, never × (house style).
19. Classroom wording (58). A stem is a whole question or command, never a fragment ("x: 4, 6, 10. Find the constant."), and two sentences are two sentences, not one joined by a colon. A graph shows y "versus" x, never "against". A rate is "per", or "for every 1 unit of x", never "for each 1 of x". Students "explain", "identify" or "write"; they are never told to "say". "Isolate" and "solve for" are the terms (60): a variable alone on one side is isolated, and the equation is solved for it ("Solve the equation for g, the gallons in q quarts.", "Solved for m", "The question tells you which variable to solve for.", "solve for x:  $36 = 2.4x$,  so  $x = 15$", "To isolate x, divide both sides by 1.4."); never "the other way around" (or "round"), "work backward", "the subject" or "an equation for either quantity" for that idea. A table drawn left to right has pairs and columns, not rows. A variable does not open a sentence ("Let e be…"). An answer line is a short whole sentence when it fits. A numeral does not open one either ("Five notebooks cost \$9.00.", "Rice costs \$8.00 for 5 pounds."). A decimal takes a plural unit ("0.8 pounds per dollar"); a fraction takes the singular ("1/24 gallon per mile"). A quantity is called y only where the letters are x and y, or where the page names no letters and the constant is the question ("With gallons as y"): with letters of its own, the equation is "for d" or "solved for d" ("Write the equation for d", "Solved for d, the kilometers:  $d = 1.6m$"). A graph "shows how far a cyclist rides", not "miles versus hours"; "versus" joins two quantities named in full ("the distance, in meters, versus the time, in seconds"). A line "passes through" a point. A comparison's answer line is "Store B (\$3.30 per pound versus \$3.50)". An equation in a paper's prose does not break across a line: the kit joins its signs to their numbers (`dockit.glue`; written in `$…$` it is set the same way), whole when it is 30 characters or fewer and otherwise only before an equals sign, so one long chain is written as two short equations ("Store A costs $3.05(10) = 30.50$ and Store B costs $3.15(10) = 31.50$"). On a paper a sentence does not open with an equation ("The equation $w = 50m$ gives…"). A stacked fraction in a paper's sentence is a picture, which the kit sets close to its words and by its middle (`dockit.img`), so a comma or a period may follow it. "No." is not followed by a numeral, where it reads as "number" ("No, 20 prints would have to cost \$7.00."; "No, because 6 ÷ 1 = 6 but 10 ÷ 2 = 5."). An answer line has no colon after "Answer:" unless it labels two answers ("Taxi: no. Bus: yes."). A choice's reason is a fact about the figure ("Jo. Jo's line is steeper."), not shorthand for one ("The steeper line is faster."). A line that wraps does not leave one word alone. On a paper the kit sees to it (`dockit.bind_tail` keeps a paragraph's last ten characters together); on a slide the builder does ("…in cups of flour per / cookie?"): shorten the line. On a slide, a simple expression that closes a long run of words is written in the sentence's own words, without `$` ("…passes through (5, 13).", "…of the other: y = px"): as a picture it stands half an inch off from the words, because the kit keeps a 6% margin on a run's width, and a comma or semicolon after it stands off again. A fraction or a box stays a picture and goes early in its line ("The point $(7, □)$ is on the graph of copies versus minutes."). An Independent Set's stems keep `$…$` where the slide needs the room: words are measured wider than the picture.
20. Printed for a reader who did not build it (59). The Lesson Plan is read by the teacher next door and by an administrator, so `te.must`, `te.must_not`, each `mtr` line, `building_on`, `working_toward`, `closure`, `te.materials` and `differentiation` are whole sentences ("On whiteboard questions 2, 4 and 6, students convince a neighbor and then vote again."), never fragments strung on semicolons and dashes; they say "whiteboard question 3", not "board 3". Nothing printed carries a ruling number or a word about the build: the wrong answer that uses the unneeded number is cited "[an extra number, included on purpose]".

## The gates (each refuses the build)

- **mathcheck** — a check that disagrees with its key, or none: re-derive by hand; fix whichever is wrong.
- **distractorcheck** — a wrong letter without a cited error, an option equal to the key, two equal wrong options, too few select-all clauses, an answer letter not `correct`: name and cite, or change the option.
- **capcheck** — the benchmark caps (a coefficient outside [1, 10), a ± gap over 2, a radicand out of range): change the numbers; `not_sci` / `not_gap` / `not_bound` only on an item ABOUT the boundary.
- **rulingcheck** — an arrow for "=" (42); a repeat (43, rules A–D, P, Q); words against picture (44, `figwords`); unaligned rows; an unknown board field; no `mtr`/`hoq`/`differentiation` (25); a set of other than six (21); other than one `unneeded` (22); IXL off the plan (28): fix the spec as the message says.
- **balancecheck** — keyed letters bunched in a lesson or a unit round: `shuffle_choices.py` once, before the first build.
- **stepcheck** — no steps, more than five, a false "=", a last value that is not the checked one (39).
- **figkit** — a line through a label, two labels touching, a unit the words do not use, a crossing not on the lines: move it with `off=`, compute the length, give `solution=`.
- **layout** — "line runs off the slide" (split the row), "plan does not fit … whiteboards N" (change `min` so 10–20 remain), a set that will not fit at 16 pt (shorten it).
- **checks.py** — docscan (no MA code, "calculator", partner work on a student page), keycheck, glyph, offpage, markup, footer, plancheck, slidefit, overlap, imagedrift, slotgeometry, pdftwin, kitcheck, suitecheck: a finding is a defect in the spec; never argue with one.

## The loop

    cd <course>/build; export HOME=<your own>; mkdir -p $HOME
    python3 shuffle_choices.py uN/lNN.py        # once, before the first build
    python3 gates.py uN
    python3 build_lesson.py uN/lNN.py
    python3 checks.py out/uN                    # must end "checks: 0 findings"

**Look once**, after the last change: `python3 contact_sheet.py "out/uN/<the Slides.pdf>" 45 4 --pages 1-12`, then
`13-24`, then `25-36` — three sheets in `/tmp/sheets/`, each read once. With figures: `python3 figure_sheets.py uN
--grid 4 --out $HOME/figsheets` (a folder of your own: builders share `/tmp`), every picture beside its words. After a
fix, `python3 changed_slides.py OLD.pdf NEW.pdf --sheet` names the pages to look at again. Look for: a line wrapped where it should not, an answer on three lines, a
crowded or near-empty slide, a figure too small to read from the back row, a label on the wrong thing, an answer that
cannot be reached from the picture and the words, a question split across a page.

## Where the two courses differ (`python3 -m lib.profile`)

| | A7 | M7 |
|---|---|---|
| Teacher Edition | none | built: write the notes, `sub`, `source`/`band`, `te.say` (three), `te.watch` |
| Independent Set (`SET`) | slide and printed page with key | slide only |
| Question Bank (`BANK`) | two .docx with keys per lesson | `BANK - Unit N.md`; `te.variation` required |
| Before You Go (`CLOSE`) | none | slide; `te.close` required |
| Plan (`PLAN_STYLE`) | sections | labels; `te.closure` |
| `TE_STYLE` | lines | table; `te.must`, `te.must_not` required |
| Colour (`SLOTS`) | read off the layout | marked in the spec (`\sA{}` …) |
| `CAPS` | fracexp, sci, gap, radicand | fracexp, sci |
| IXL SmartScore | 67 | 60 |
| Review day in deck | no | yes (`uN/review.py`) |
| Test periods | 1 | 2 |
