# SPEC SCHEMA — every field a lesson spec, unit spec and manifest can carry

**One schema for both courses.** This file is part of the shared build kit (published from
`croix18/Windmill`, `kit/`; vendored into each course's `build/` and held there by `KIT.sha256`).
Edit it in Windmill. Where a course differs it is because its `build/course.py` says so — the
section "What the course profile changes" at the end lists every such place, and
`python3 -m lib.profile` prints the profile.

A lesson is one Python file, `build/<unit>/lNN.py`, holding one dict named `L`. The unit
documents are `<unit>/unit.py` holding `U`; the package is described by `<unit>/manifest.py`
holding `M`. **The canonical worked examples:** accelerated — `u3/l04.py` (a numerical lesson),
`u3/l08.py` (word-form items and tagged coefficients), `u3/unit.py`, `u3/manifest.py`; on-level —
`u4/l06.py` (figures and named colour slots), `u5/l03.py` (story boards and the six-question set on
a slide), `u4/unit.py` (parallel forms), `u4/review.py` (the review day built as a lesson).
Copy one and change every field; do not start from a blank file.

Markup that works in every string rendered on paper (`dockit.rich`): `$latex$` becomes an image;
`**bold**`; `__vocab term__` (blue bold). **A `**…**` span may not contain `$`** — write
`"**Reciprocal pairs.**  $x^{3}$ and …"`, never `"**$x^{3}$ is …**"`. On slides, `$…$` inside a
row makes the row a "mixed" row (text + images) that is laid out on one line and **must fit the
slide width** — the build raises "line runs off the slide" if it does not; split the row.

LaTeX goes through matplotlib mathtext for the pptx and the documents, and through KaTeX for the `.html` decks — the same string must satisfy both, so stay inside the intersection: `\frac`, `\cdot`, `\times`, `\left(`, `\right)`,
`\sqrt`, `\sqrt[3]`, `\leq`, `\neq`, `\div`, `\pm`, `\infty`, `\approx` work; `\le`, `\text{}`, `\hbox` do **not**. Write `\frac`, never `\dfrac`: on the slide surfaces the renderer sets every fraction at display size itself (27 Sep 2026), and on the document surfaces text-size fractions are right. Thousands
separators inside math are `1{,}000`. Unicode superscripts (`⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺ᵐⁿ`) may be used in plain
text and are converted to real superscript runs; `⁽ ⁾ ✗` and other exotic characters have no glyph
in the fonts and fail the glyph check. A dollar sign in prose is written `\$` (`"\\$3 for 2 pens"`
in a Python string that is not raw): a bare `$` opens math, and the builders refuse a plain text box that carries one. The word "calculator" and any `MA.x.xx.x.x` code may not appear
on a student surface (docscan fails the build); write "a computer displays 3.5E9". The Reference
Sheet alone may describe the FAST calculator.

## File names — `lib/names.py`

Croix, 4 October 2026: *"Can you normalize all of the naming conventions in a7 and m7. I have file
names with all sorts of stuff. It's tough to find what I need sometimes."* One pattern, both courses,
and no spec or builder types a file name — `lib/names.py` is the only place one is made:

    <COURSE> <unit>.<lesson> <Lesson Title> - <What it is>[ - Key | - Worked Answers].<ext>
    <COURSE> Unit <N> <Unit Title> - <What it is>[ - Key | - Worked Answers].<ext>

    M7 4.06 Finding Circumference - Slides.pptx
    A7 3.08 Writing Large Numbers in Scientific Notation - Question Bank - Key.docx
    M7 Unit 4 Area - All Slides.html            (the console)
    M7 Unit 4 Area - Test Form A - Worked Answers.pdf
    M7 Unit 4 Area - Review Day - Slides.pptx   (a review day built as a lesson)

What a file may be: for a lesson — Slides, Teacher Edition, Lesson Plan, Independent Set, Question
Bank, Additional Question Bank, Handout; for a unit — All Slides, Reference Sheet, Review, Test,
Test Form A / B, Practice Test, Question Bank. Nothing else is invented on the spot. Single spaces;
the pieces are joined by ` - ` and by nothing else; the unit's title comes from `course.py UNITS`.
What a file IS is read from the part after the first ` - `, never from the title (a lesson called
"Key Features of a Graph" is not an answer key) — the checks and the installer use
`names.is_key`, `names.is_lesson_deck` and the rest, never a substring of the whole name.

A unit's package is laid out by lesson (`lib/packkit.py`): `All Slides/`, `Lessons/<N.NN>/` — the
number only: the title is already in the unit's folder and in every file name, and a path that says
it three times does not fit Windows' 260 characters once a zip is extracted — with that lesson's keys
in `Keys/`, `Review Day/` or `Review/`, `Assessment/` (by form where there
are forms), `Handouts/`, `Reference/`; the zips are named the same way.

## `L` — a lesson

| field | type | meaning |
|---|---|---|
| `code` | str | the lesson's number as it stands in every file name: `"3.04"`, `"3.T1"` for a thread day, `"4.R"` for a review day built as a lesson (the plan's own code for that day). Two digits after the point, always — names sort as text. |
| `plan_code` | str, optional | the code the year's plan (Windmill's spine) uses for this day when it is not `code`: a thread day is `3.T1` here and `T-A1` in the plan. The console opens on the plan's lesson and the IXL gate reads the plan's skills through it. A merged day needs none (`4.02` answers to the plan's `4.02+03`). |
| `unit` | int | unit number |
| `lesson_no` | int or str | prints as "Lesson 4"; `"6–7"` for a merged pair |
| `label` | str, optional | overrides "Lesson N" everywhere: `"Thread A · Day 1"` |
| `title` | str | lesson title, as on the title slide and every header — **and in every file name** (see "File names"). A `—` in a title becomes brackets there and a `?` is dropped |
| `benchmark` | str | the ONE benchmark on the title slide, e.g. `"MA.8.NSO.1.3"` |
| `benchmark_text` | str | the benchmark's exact wording (from the Source of Truth) |
| `target` | str | "I can …" — ≤ ~170 characters or the title slide wraps to three lines |
| `yesterday`, `today` | str | the teacher's two connecting lines. **Not on a slide** since 4 Oct 2026 (ruling 37: the title slide has no box); the Teacher's Edition prints `today` in the title slide's note as the one line to say |
| `essential` | str | essential question (TE only) |
| `building_on`, `working_toward` | str | vertical alignment lines (TE) |
| `vocab` | list of (term, definition) | definition may carry `$…$` |
| `ixl` | list of str | `"Skill name — CODE"` or `"Skill name (CODE)"` (each course keeps the spelling its slides have always shown). **The skills and their codes are the course's IXL plan's**, and `rulingcheck` holds them to it (`lib/ixlplan.py`, reading the spine vendored into `assets/windmill/`): a code the plan does not have, a name that is not the plan's name for that code, or — for a lesson the plan lists skills for — any skill more or fewer than the plan's, refuses the build. A lesson the plan lists nothing for (a carry-over day, a thread day, the review) may show any skills the plan knows. Ruling 28: every skill listed is required, so nothing is prefixed "Optional" or "Also consider" |
| `ixl_due` | str | only for a lesson whose skills continue into the next lesson (ruling 28: one assignment covering the run, due after its last lesson). Replaces the slide's and plan's "Due at the start of the next class." — e.g. 4.05: `"This skill continues tomorrow: one assignment, due at the start of the class after 4.06."` |
| `warmup` | list of 4 dicts | see below — bands: yesterday / last week (or "this week") / last unit / prior grade |
| `warmup_note` | str | TE note for the warm-up slide |
| `title_note` | str, optional | TE note for the title slide |
| `notes` | list of dicts | Notes slides, see below (usually three: I, II, III; 3–4 min each) |
| `examples` | list of 2 dicts | see below |
| `whiteboard` | list of exactly 9 dicts | see below; #9 is `kind="written"` |
| `bank`, `additional` | list of item dicts | the two question banks; `additional` mirrors `bank` position by position with new numbers |
| `independent` | list of exactly 6 item dicts | the independent set (ruling 21), unless `no_set=True`. Printed as a handout with a key, or set on one slide with its six answers in the teacher's edition — the profile's `SET` decides **The six questions are on a slide in both courses** (4 Oct 2026: "the individual review portion of the slides needs to put the problems on the board"); `SET` only decides whether they are printed as a page as well. Mathematics in a stem is typeset on the slide and the type steps down until the six fit — a set that does not fit at 16 pt is refused, not split. |
| `no_set` | bool, optional | the lesson carries no six-question set (M7 Unit 4 — Croix, 27 September) |
| `review` | bool, optional | the spec is the review day built as a lesson (`uN/review.py`); it joins the unit deck where the profile's `REVIEW_IN_DECK` is set and writes nothing to the bank |
| `handout` | str, optional | names a printed page the lesson uses that the build does not make (4.05's measuring sheet); printed under Materials |
| `mtr`, `hoq`, `differentiation` | see below | ruling 25 — the build refuses a lesson without them |
| `te` | dict | Teacher Edition prose, see below |

### warm-up question
`dict(stem, answer, band, source, check)` — `stem` may hold `$…$` and must fit one slide line at
23 pt beside its number (≈ 70 characters of text, less with images); `answer` is printed red
beside the stem and wraps to a second line if too wide; `band` is the retrieval band; `source`
names the lesson/unit it retrieves ("3.02 — quotient of powers"); `check` as for items.

### the grey line is gone (ruling 37, 4 October 2026)
No slide carries a line of small grey italic under its rules any more — not "Copy all three
lines.", not "Boards up on three.", not an Example's story. Croix: *"remove the comments … I want
that whole thing eliminated across both slide decks … Remove it everywhere."* Every `sub` below is
therefore **the slide's label in the Teacher's Edition and nothing else**. Whatever a student needs
is in the body: an Example's whole problem in `prompt`; a question a worked slide puts to the room
in that slide's `lead` (one bold line of main text; the build refuses one that does not fit a line).

**And then the rest of the grey went too (the same night).** Shown the rebuilt slides, Croix:
*"But also those comments. Half the box. It's still a rhombus..."* — the hint under "Answer it."
Asked about the two grey things left, he chose **"Remove both"**. So no slide carries:

- a board's `hint` (it was the grey line under "Answer it."; a written board shows only "Write
  your answer in sentences.");
- the remark beside a worked step — the second member of a `rows` tuple `(latex, remark)`;
- a board's or a Your Turn's `gloss` (it was the grey line above the answer on the reveal).

All three **stay in the spec**: they are the author's reasons and the checks still read them. A
reveal shows the answer; a worked slide shows its steps and the answer; a question shows the
question. Nothing on a slide is grey but the footer and a title slide's eyebrow.

**An Example's `ask` is the problem's own question, or it is not there.** *"Also the thing at the
bottom. Nothing on paper yet. Decide the pieces first. That comes off so weird. Get rid of
that."* The bold line under an Example is "Find its area." or "Find both mistakes." — what the
student is to find — never a direction about how the room is to work ("Nothing on paper yet",
"Thirty seconds", "Do not say them yet"). Those are the teacher's to say and belong in `note_q`.
A prompt that already ends in its question takes no `ask`.

### notes slide
`dict(numeral, head, min, sub, note, …)` plus any of: `items` (lettered rows: plain strings,
`"**bold row**"`, or `(term, rest)` vocab tuples), `letters=False` to drop the letters,
`table=(widths_in_inches_list, rows)` with `tsize` (pt, default 16), `math=[…]` (one `$…$` row
per entry, centered), `text=[…]` (plain sentences), `items2` (rows after the math), `size`,
`panel=True` (a boxed first block). `note` is the TE's slide note; a line beginning `OFF:` inside
it is printed in the TE as *OFF THE SLIDE, YOURS TO SAY* — the sentence the teacher says that
is not on the slide. A `not_sci=True` key on a notes dict exempts it from the coefficient scan.

### example
`dict(title, sub, min_q, note_q, prompt=[rows], ask, worked=[…], check, your_turn={…}, yt_check)`.
`prompt` rows: a `$…$` row is centered math; a plain row is centered text (wraps). **The prompt is
the whole problem** — what the thing is and what is to be found, with nothing that leans on another slide ("the fountain", "he"); `sub` is not on the slide. A `your_turn` states its own question in its `prompt`; one whose prompt is a bare expression is given this Example's `ask` on its slides (or its own `ask`).
`ask` is the bold instruction line ("" to omit). Each `worked` entry: `dict(sub, lead, min, note, rows, answer)` where
`lead` (optional) is a question to the room, set bold above the rows, and
`rows` are `(latex, gloss)` tuples — the latex is set at the left, the gray gloss beside it (keep
the gloss ≤ ~45 characters) — or plain strings. `your_turn`: `dict(min, note, prompt=[rows],
gloss, answer | answer_latex)`. `check` and `yt_check` are re-derived by sympy like any item.

### whiteboard question
`dict(kind="free"|"mc"|"written", latex | text=[rows], hint, gloss, answer | answer_latex, note,
check, wrong, …)`. `latex` is set large and centered; `text` rows are centered (a row with `$`
is a mixed row and must fit one line). `hint` prints small and grey under the question on the question slide — **it is a nudge, never the question**: a board whose ask lived in its hint shipped in M7 Unit 5 as a story with no question a student could read from the back of the room. A board with a `**` ask row shows its hint too, when it has one, so leave `hint` off a story board unless the nudge is worth a line.
A `text` row beginning `**` is the ASK and is set bold; a board with any such row (or with `unneeded`) is laid out as a left-aligned 24 pt block — story in roman, ask in bold — not centred lines; keep each row under about 60 characters plus its math. `fig` (a figure from the unit's `figs.py`) and `fig_a` (the figure the reveal shows instead) sit under the text; `te_answer` is the answer as the teacher's edition prints it when the slide's `answer` is too terse. **The ask names a thing in the story and the answer is that thing** ("What fraction of the sheet is the top layer?", "Which drive holds more?"); an ask that begins "Write", "Rewrite" or "What is the value of" on a board with a story is a computation in costume — write that board bare (HOUSE STYLE, ruling 22 in practice). `gloss` is the working in a phrase and `hint` the scaffold: both are kept in the spec and **neither is on a slide** (ruling 37). `note` is the TE note; `note_a` optionally the reveal's.
`wrong` is the TE's named-wrong-answers line for free/written questions: `"value — error name
[benchmark cite]; …"`. **`kind="mc"`** adds `choices` (4 strings, unicode superscripts allowed),
`correct` (index), `answer` ("A — 25m⁶") and **`errors`** — a dict from every wrong letter to
`"what the student did [benchmark or B1G-M cite]"`; the build refuses an mc item with a wrong
option that has no cited error. **The keyed letter must vary** — across a lesson's items, and across a unit's whiteboard rounds every letter is keyed at least once and none more than 40% of the time (gate `balancecheck`; M7's Units 4 and 5 first shipped with no board ever keyed D): write a new item answer-first if that is easier, then run `shuffle_choices.py <unit>` once before the first build (`--seed=N` for another spread; it rewrites `answer`, "Reveal X" and the error keys with the options, and lists every other letter it saw so a variable named A or C is never renamed), and after that write each item's options in their final order. **The letters an item's own words name must be its key**: `distractorcheck` refuses an `answer` line or a "Reveal C." note whose letter is not `correct`, and an `errors` entry on the keyed letter. **`kind="written"`** adds `qtext` (the plain-text question for
the TE) and the answer states the full-credit sentence.

### bank / additional item
`dict(stem, answer, why, check, space)` for a one-part question (`space` = inches of work room);
`dict(stem, parts=[dict(label, stem, answer, why, check, space), …])` for lettered parts;
`dict(stem, choices=[…], correct=i, answer="A", errors={…}, why, check)` for multiple choice;
`correct=[i, j, …]` makes it select-all (square boxes). `dict(heading="…")` prints a bold
instruction line between groups. `lines=n` prints n ruled lines instead of `space`.
`not_sci=True` (first key) marks an item that is ABOUT the coefficient rule. `key_stem` (unit
documents only) is a stem printed on the key in place of `stem` — the SSDD label lives there.

**The two Unit 4 boundary escapes.** `capcheck` also refuses (a) an addition or subtraction whose
two powers of ten are more than 2 apart, the MA.8.NSO.1.5 clarification, and (b) a radicand that
is not a perfect square up to 225 or a perfect cube from −125 to 125. A rational radicand passes
when its numerator and its denominator are each in range, so `∛(1/8)` and `√(1/9)` are fine. An
item that shows a wider gap on purpose — because it is ABOUT the boundary — carries
`not_gap=True`; one that uses a stretch radicand on purpose (a Unit 2 estimation retrieval item,
or the Dotson √200 task) carries `not_bound=True` and says why in its `note` or `source`. Both
flags work like `not_sci`: put them on the item dict and they cover everything inside it.

### `check` — the mathcheck field (mandatory on every item, part, warm-up and example)
A tuple sympy evaluates at build time with `F = Rational`, `sqrt`, `pi`, `abs`, `floor`,
`Float`, `sp` (sympy itself), and the letters `a b c d k m n p q r s t w x y z` as **positive
symbols** (so `x**0` is 1 and quotients cancel; use only these letters as variable bases):
- `sig("0.00470")` returns 3 — the significant digits of a numeral WRITTEN AS A STRING. The
  count depends on how the number is written, not on its value (3.200 and 3.2 are the same
  number and different claims), so the argument is quoted and sympy is never asked directly.
  Every "how many significant digits" item checks its own count this way.
- **A select-all must check its wrong options too**: each option not in `correct` needs a
  `("true", "<that option> != <the target>")` clause. Without it an option that is secretly
  equal to the target passes the build, and a student who selects it is marked wrong for
  being right. `distractorcheck` counts the clauses and refuses if there are too few.
- **No two choices may be the same number.** `distractorcheck` reads every option as an exact
  value (plain unicode like `0.2³ · 0.1²`, or one `$latex$` span, with a trailing unit allowed)
  and refuses (a) a wrong option equal to the key — a student who picks it is right — and (b) on
  a one-answer item, two wrong options equal to each other, which give each other away. It sees
  what the printed-string check cannot: `(3/6)³` and `(1/2)³`, or `(8/7)²` and `(−8/7)²`. An
  option it cannot read (words, "not a real number") switches the check off for that item only.
  **`form_only="B"`** exempts the listed letters, for a question that asks for a FORM: `52 × 10⁶`
  is 52,000,000 and is not scientific notation; `3.20 × 10³` is 3,200 and claims a third
  significant digit. The exemption holds only when the question's own words name the form
  (`scientific notation` or `significant digit`), so "Which is the value of …?" can never use
  it — if the question asks for the value, an option with the value is right.
- `("eq", "expr", "keyed")` — exact symbolic equality. Use `F(2)**-3`, `F(3,4)**2`; never
  Python floats where a rational exists. Variable bases: `("eq", "(3*m**2*n)**3/(9*m**4*n)",
  "3*m**2*n**2")`.
- `("val", …)` — same as eq (kept for readability of decimal answers).
- `("approx", "expr", "keyed", "tol")` — |difference| ≤ tol, for rounded answers.
- `("true", "python boolean over sympy values")` — e.g. `"9**2 < 95 < 10**2"`,
  `"sp.simplify(x**4*x**3 - x**12) != 0"` for "these are NOT equal".
- `("many", check, check, …)` — several of the above; use it for select-all (every correct
  option `eq`, every wrong option `true …!= …`) and for multi-value answers.
An item may carry `ack="reason"` instead of a check **only** for a purely verbal item; do not
use it to skip work.

### `te`
Under **ruling 26** the teacher's edition is **four printed pages or fewer** and `checks.py`
fails a longer one. Only these fields reach it:

- `must` / `must_not` — the benchmark's two lines, quoted from the Source of Truth or the B1G-M
  notes. (If absent, they fall back to `standard_notes`' "Clarification" and "Boundary".)
- **`say=[three strings]`** — the three sentences to say out loud today. They are the last thing
  on page 1 and nothing else goes there.
- `materials` — one line, printed at the end.

Everything else in `te` — `read_first`, `variation`, `audit`, `changes`, `sits`, `lives` — no
longer prints in the teacher's edition. It is written to the unit's **`BANK - Unit N.md`**,
together with every bank answer, and installs into the package's `Reference/` folder. Keep writing
those fields: that file is where the unit's reasoning lives.

Where the profile's `TE_STYLE` is `"table"` (M7) the teacher's edition is one line per slide and
then the boards as a table, and these are also required: **`watch=[…]`** — the misconceptions to
watch, each tied to its board ("Board 6, option B: …"; when the options are re-ordered these lines
move with them); **`close=[…]`** — the "Before You Go" slide's lines (profile `CLOSE`);
`variation` (profile `BANK = "md"`). Optional: `set_note` and `close_note` replace the standing
teacher's-edition notes for the independent set and the close.

### `mtr` and `hoq` — ruling 25
- **`mtr=[("MTR.4.1", "evidence line"), …]`** — the two or three MA.K12.MTR.x.1 the lesson
  actually exercises, each with one line of evidence from the period ("the re-vote on board 5").
  Not all seven. **The build refuses a lesson with no `mtr`.**
- `hoq=[(question, "DOK n"), …]` — the higher-order questions the plan prints with their DOK.
- `differentiation=dict(ese, ell, enrichment)` — one concrete line each — or a list of
  `(label, line)` pairs.

## Colour — the named slots (`\sA{}`, `\sB{}`, `\sH{}`)

HOUSE STYLE §2a: on the slides where the teacher shows — notes, worked rows and their glosses,
every reveal — a formula's slots are colour-coded, and the number that fills a slot carries the
slot's colour, so the match is seen before it is explained. A course whose profile says
`SLOTS = "exponent"` (A7) gets base blue and exponent orange read off the layout and marks nothing.
A course whose profile says `SLOTS = "named"` (M7) marks each slot in the spec, where it stands,
in LaTeX and in plain text alike (in a Python string that is not raw, the backslash is doubled):

| mark | slot | colour |
|---|---|---|
| `\sA{…}` | the first slot — b, b₁, d₁, the circumference | blue 1E5AA8 |
| `\sB{…}` | the second slot — b₂, d₂, the radius or the diameter | orange C05A00 |
| `\sH{…}` | the height (and the apothem) | teal 398080 |

    ("A = \\frac{1}{2}(\\sH{9})(\\sA{18.7} + \\sB{16.3})", "h = 9, the bases 18.7 and 16.3")
    gloss="C = π\\sB{d} = 3.14 × \\sB{12}"

The marks are stripped wherever the student is the one who has to decide — every question slide,
every printed page, the gates — and the text reads as if they were never there. Marks do not nest.
The review day is left black (§2a rule 6). `python3 slotaudit.py <unit>` lists every coloured
expression as the renderer reads it; `checks.py`'s `slotgeometry` renders each one black and
coloured and refuses if more than 0.5% of the ink moved.

## `U` — the unit documents (`unit.py`)

`dict(unit, title, reference_intro, reference=[sections], review=[parts],
assessment=dict(total, tracker_order, tracker, follow_through, sections=[…]))` for one paper, or
`assessment=dict(…, forms={"A": sections, "B": sections, "practice": sections})` for parallel
forms. `reference` and `review` are optional (M7 builds its review day as a lesson instead).

- `reference` sections: `dict(title, right, blocks=[…], not_sci=…)`; a block is a prose string
  (bold lead + sentence), `dict(table=(widths_twips, rows), header=True/False)`,
  `dict(bullets=[…])` or `dict(vocab=[(term, dfn), …])`. Column widths are twips and sum to 9360.
- `review` parts: `dict(letter, title, lessons, benchmark, items=[…])` — items as in banks. One
  item per review carries the **SSDD block**: a stem with four lettered parts on the same
  surface asking four different things, with `key_stem="**SSDD.**   …"` so the label prints on
  the key only. The review is unscored: no points anywhere.
- `assessment.sections`: `[dict(title, benchmark, items=[…])]` — **one paper, numbered straight
  through, with no Day 1 / Day 2 division anywhere** (ruling 27). The paper's front line says it
  runs over two periods and that students continue from where they stopped; the student line for
  follow-through credit (ruling 19) sits under it. Every lettered part is one point; every
  single-part item is one point. `total` and `tracker` (benchmark → points) are asserted against
  the items at build time; `tracker_order` fixes the Score Tracker's row order.
- **Exactly two items carry `transfer=True`** (ruling 18) and the build refuses any other count.
  A transfer item is the same benchmark and the same one-operation demand on a surface that
  appears on no review and in no question bank — not harder, not longer, not a chain. The key
  prints *TRANSFER ITEM — not on the practice test. Same benchmark, a surface nobody rehearsed.*
- **Parallel forms** (ruling 33): Form A, Form B and the practice test are built from one item
  list whose values come from `pick(form, a, b, p)`. Each form ships as its paper, its key and its
  Worked Answers copy (ruling 32). The build checks every form, checks the forms position for
  position (same shape, the transfer items at the same positions and never on the practice test),
  and refuses any question that shares an answer with the same question on another form.
- An item may carry `fig` (a figure from the unit's `figs.py`, drawn from its numbers — a height
  that ends outside its figure is refused) and `table`.

## Answer slides show their steps (ruling 39, 4 October 2026)

*"But the answers should always show easy to follow steps."* A board (`whiteboard` item) and a
Your Turn (`your_turn`) each carry **`steps`: a list of one to five rows**, drawn on the answer
slide above the red answer, in the slide's own black type. A row is plain words with `$latex$`
spans — `"Rectangle:  $14 \\times 8 = 112$"` — one step to a line, the way it would be written on
the board: a short label where it names a piece ("Whole box:", "The a's:"), then the arithmetic.
It is the mathematics, not a remark about it (the grey `gloss` and `hint` stay off the slide).

- With a figure, the steps sit beside it (figure left, steps right); without one, under the
  question. One or two short rows are set as large as a worked line.
- A multiple-choice board's answer slide shows the steps in place of the four options; its
  answer line names the letter and the value.
- **Every step is worked by the build** (`lessonbuild.stepcheck_lesson`): each `=` between two
  sides that compute must be true; `\\approx` is held to the places its right side shows (so write
  `3.14 \\times 14 = 43.96`, not `\\pi`); an `=` between expressions in the same letters must be an
  identity; and the last number the steps reach must be the item's `check` value. A false step
  refuses the build. Keep units outside the `$…$`.
- **The slide fits itself.** A board's or a Your Turn's question slide and answer slide start at
  the same place and set the problem at the same size, chosen by laying the answer slide out on a
  scratch deck: the usual place if everything fits, then higher, then the problem's mathematics
  one size smaller. If nothing fits the build says "cannot hold its steps" — write fewer or
  shorter rows (two tall fraction rows are usually the limit under a tall problem; a label row
  and one chained line of mathematics is shorter than two lines of mathematics).
- A slide without steps is a finding where the course profile says `STEPS = "required"`; until a
  unit's steps are all written it is only counted ("N of M answer slides show their steps").

## The slide font is Lexend (ruling 40, 4 October 2026)

*"Start making every slide in the Google dislexia font."* — Lexend; asked, "words now, math
next". Every word on a slide (PowerPoint, its PDF, the HTML deck, the console's slides) is
Lexend, set at 95% of the size the layout asks for (`deckkit.SCALE`; `size-adjust` in the HTML):
at that size a line is as long as it was in Century Schoolbook, so every measured layout holds,
and the letters are still 7% taller. Nothing on a slide is italic (Lexend has none). A sign Lexend
lacks (→ ∠ △ ✓) is set in DejaVu Sans by name. Printed documents (Teacher's Edition, plans,
papers, handouts) are unchanged. `checks.py glyph` refuses a slide run in any other face, an
italic run, and a deck PDF that does not carry Lexend.

**The mathematics and the figures (5 October — the "math next" half).** A slide's expressions and
the lettering on its figures are Lexend too; a printed page's are STIX, as before, and the two
never share a file (the face is in each image's fingerprint).

- *PowerPoint and PDF* — `mathimg.m(…, "slide…")` sets the expression with matplotlib's `custom`
  math fontset pointed at the kit's own Lexend files, at 95% (`mathimg.LEXEND_SCALE`): a Lexend
  digit then stands as tall as the STIX digit it replaces, so rows keep their height; a row is
  about a tenth longer, and the fit gates (`_yt_fit`, `_wb_fit`, slidefit, overlap) decide what
  still fits. Radicals, grown brackets and arrows are STIX's (Lexend has none). Variables are
  upright. `mathimg.SLIDE_FACE = ""` puts slides back in STIX in one line.
- *Three signs are not Lexend's*, in every surface, and the kit makes the change itself — a spec
  goes on writing `\pi`, `\cdot` and `l`:
  - **π** — Lexend's is a flat-topped box that reads as an n. A slide's π is the π of STIX
    General Bold (the textbook's, at Lexend's weight): `\mathtt{\pi}` in an expression, the
    one-glyph face **WindyPi** (`assets/WindyPi.ttf`, `windypi.woff2`, cut by `make_assets.py
    make_pi`) for a π typed in words or on a figure. `deckkit._by_font` names it for the run; the
    HTML lists it first in every font stack. `checks.py glyph` refuses a π set in anything else.
  - **the multiplication dot** — `\cdot` is drawn with Lexend's own raised dot (U+2219: the size
    of the middle dot a spec types in words and tables, exactly as heavy as Lexend's decimal
    point, and the one dot KaTeX will also take from Lexend). The STIX dot beside Lexend digits
    is fainter than the decimal point next to it. In the browser `\neq` is likewise Lexend's own
    sign (`htmlkit.KMACROS`).
  - **a variable l** — Lexend's is a bare stroke, the mark of an absolute-value bar; it is set as
    the script ℓ. Letters inside `\text{}` are words and are left alone.
- *HTML decks and the console* — KaTeX lays the expression out; `htmlkit.MATHFACE` draws its
  digits, letters and signs in the slide font (KaTeX's own fonts remain for stacked brackets,
  radicals and big operators), `KMACROS` makes `\cdot` the Lexend dot, `_tex` makes a variable l
  the script ℓ.
- *Figures* — a slide draws `figkit.slide(spec)` (the same spec with `face="slide"`): labels in
  Lexend at 95%, a π in a label set as the textbook's. `dockit` draws the plain spec, so a
  handout's figure is unchanged. The struck-label check runs on each face separately.
- **A line of working is one size.** On an answer slide the words of a step and its mathematics
  are set at one size (`deckkit.step_sizes`: 24.5 pt, or 29 pt for one or two short steps; the
  HTML sets the step's KaTeX at `1em`). They used to be two sizes (23 with 26, 26 with 32) —
  invisible across two typefaces, plain in one: the 40 of "40 ft would be" sat smaller than the 40
  of "40 ÷ 5" on the same line. Each pair meets in the middle, so a row is as long as it was.
- **The HTML deck fits itself.** The PowerPoint is laid out by measurement and refuses what does
  not fit; a browser lays the same slide out itself and KaTeX's stacked fractions stand taller. So
  a slide measures itself as it comes onto the screen (`htmlkit` `fitSlide`): if its content is
  taller than the space above its footer rule it is set smaller, whole, by what it needs
  (`data-fit`), and a board's or Your Turn's question slide and answer slide take the smaller of
  their two factors. One slide at a time — never the whole page (a unit console has 350).
  `htmlcheck` counts them and refuses a slide set under 75% (`checks.FIT_FLOOR`): that slide
  carries too much, and it wants fewer or shorter steps.
- **The pi face is measured like Lexend.** `WindyPi` carries Lexend's own ascent and descent and
  is offered for U+03C0 only (`unicode-range`), so a line with a π in it — and a browser's idea of
  the slide font's line — is no taller than its neighbours. (With STIX's metrics every digit KaTeX
  set stood 13 px deeper and M7 Unit 5 ran 4–7 px past the footer rule; `htmlcheck` caught it.)
  `deckkit` reinstalls a face whose bytes differ from the kit's, so a recut face reaches LibreOffice.
- **Working rows and scientific notation.** An item's `steps` may pass through a form that is not
  yet scientific notation (1.3 × 10³ = 0.013 × 10⁵ — matching the powers is the method);
  `capcheck` no longer reads the [1, 10) rule into `steps`. Every such line is still held true by
  `stepcheck`, and the item's answer is still scanned.

## A deck is its Slides file (ruling 41, 5 October 2026)

*"I like running my files in deckhand because I can use deckhands tools like the pen and timers
and stuff. So stop building the html. Keep it as slides files."* Asked how a deck reaches
Deckhand: he uploads the PowerPoint to Drive, it opens as Google Slides, and he pastes that link
into Deckhand's Slides card. Asked about the unit console: drop it with the rest.

- **No HTML is built.** `profile.HTML` is `False` (a course that wants its HTML decks and console
  back sets `HTML = True` in `course.py`; `lib/htmlkit.py` and `lib/consolekit.py` are kept, and
  their tests still run). `build_lesson` writes the `.pptx` (and its PDF); `build_unit_deck`
  writes `All Slides.pptx` and no console. `checks.py` `htmlcheck` holds the other way round: an
  `.html` deck left among the built files is a finding — a stale console beside today's slides.
- **The PowerPoint is what he teaches from, in Google Slides — so it names only faces Google
  Slides has.** Lexend (a Google font) for every word; **Arial** for a sign Lexend lacks (→);
  **Times New Roman, bold** for a π in a run of words — the textbook's π at Lexend's weight, and
  to the eye the π `mathimg` draws in expressions. (For a day the π was WindyPi, a one-glyph face
  cut for the purpose: right in the PDF, unknown to Google Slides, which swaps a face it lacks
  without saying so.) A sign Arial lacks too falls to DejaVu Sans for the PDF. `checks.py glyph`
  refuses any other face on a slide. Mathematics and figures are pictures, so they arrive as
  drawn. **Nothing here can open Google Slides**: the layout is checked in the PDF LibreOffice
  draws from the same file, with the same Lexend.
- **What went with the console**, so nobody looks for it: the Today screen, each period's
  bookmark, the stepped reveal, the whiteboard tally, and the as-run log written from the panel.
  A day is logged from the phone view of the plan (Windmill `HANDOFF.md`, "The plan follows the
  class"). In the PowerPoint a board is two slides — the question, then the question with its
  steps and answer — so the reveal is the next slide.

## An arrow never stands in for an equals sign (ruling 42, 5 October 2026)

*"That needs to be an equal sign not an arrow. This is math."* — Croix, of "diameter × π →
CIRCUMFERENCE" on a slide. And, when the first version of this rule refused every arrow: *"I'm not
anti arrow. Arrows have their place, but they shouldn't be stand ins for equal signs is all I was
saying."*

- **Equal things take `=`.** `rulingcheck` (`arrowcheck`) refuses an arrow on a student page in
  two cases, and only these:
  - its two sides are equal — numbers (`12 \times 9 \rightarrow 108`, `3/4 → 0.75`) or expressions in
    the same letters (`x^{2} \cdot x^{3} \rightarrow x^{5}`);
  - it runs from a calculation to the name or number of its result (`diameter × π →
    CIRCUMFERENCE`, `450 ÷ 25 → 18 in²`).
- **Everything else an arrow is for is left alone**: a statement leading to the next
  (`C = 12π in → d = 12π ÷ π = 12 in` — either side carries its own `=`), a mapping (`x \to 2x`,
  `A → A′`), a change or a rounding (`P = 14 → 28`, `1,868.4 → 1,868`), a label pointing at its
  formula (`Diameter → C = πd`).
- It reads a lesson's `target`, `warmup`, `notes`, `examples`, `whiteboard`, `bank`, `additional`,
  `independent` and `vocab` (figure labels included) and a unit's `review`, `assessment` and
  `reference`; teacher's prose inside them (`note`, `note_q`, `wrong`, `errors`, `why`, `gloss`,
  `hint`, `sub`, `te_answer`) and `te` are not read. `arrow_ok=True` on a block overrules a
  reading the build got wrong.

## Figures — what the kit refuses (ruling 38, 4 October 2026)

A figure is the one place a student reads a number off a picture, so `lib/figkit.py` checks the
picture itself, every time it draws one (lesson figures and unit-paper figures alike):

- **No line through a label.** The figure is drawn with its lines alone and then once for each
  label alone, and the two are compared pixel by pixel. A label that shares ink with a side, a
  dashed height, a dimension line or a circle — or comes within a hair of one — stops the build
  ("a line of this figure runs through its label “6 m”"). A fill is not a line, and neither is the
  pale unit grid. `FIG_REPORT=<file>` turns the refusal into a survey: every struck label in a
  build is appended to the file as a JSON line and nothing is refused.
- **`off` — a label's clearance in its own type size.** A `text` shape may carry
  `off=(dx, dy)`, a step away from its `xy` measured in ems of the label's type. Use it for every
  label that sits beside a line: `_t(w / 2, 0, "14 m", va="top", off=(0, -0.3))` is under the
  bottom side by a third of a line whatever size the figure is drawn. A step written in the
  figure's own units (`-h * 0.16`) shrinks with the figure while the type does not, which is how
  thirteen Unit 4 figures came to have a side through a number.
- **A grid polygon's `name`** is put at the middle of its corners when that point has a unit of
  room, and otherwise at the nearest point inside that does (`_label_point`) — the middle of an
  L's corners is on its notch.
- **Units.** `figkit.units_agree(spec)` runs at the start of every lesson and unit build: an item
  with a `fig` whose words (`text`, `prompt`, `stem`, `answer`, a worked `answer`, …) use a unit
  the figure does not print is refused. A scale problem drawn in centimetres and answered in
  metres carries `units_ok=True`.
- **A length that follows from the others is computed, not typed.** The unit's own `figs.py`
  refuses a slanted side that disagrees with its figure (`figs.trapezoid`, `figs.trapezoid_h` in
  M7 Unit 4): the number that is "not needed" is still a length of that figure.

An Example's question slide starts a little under the rules; when its lines and its figure do not
both fit from there it starts as much higher as it needs (`lessonbuild._example_top`), so the
figure is not the thing made small.

## `M` — the manifest (`manifest.py`)

The manifest belongs to the course's own `install_unit.py` (packaging is each course's), so its
fields are that script's; the unit's title and its folder's name are not among them (they are
`course.py UNITS`). A7: `dict(unit, summary, lessons=[(code, label, title, benchmark,
carry_line)], assessment=(benchmarks, points), naming_note, order_note, before_unit=[bullets])`.
M7: `dict(unit, summary, handouts={code: [(source file, kind, is_key)]}, review_note, order_note,
before_unit=[bullets])` — its lessons, benchmarks and IXL skills are read from the specs. The one field the kit reads is **`lessons`**: when a
manifest has it, it is the teaching order and the printed label and title of each row of the unit
deck; without it the unit deck follows the spec files in order. The timing table on START HERE is
read from the deck side-cars, never typed.

## What the course profile changes

`build/course.py` sets these; `lib/profile.py` holds the family defaults.

| name | accelerated (A7) | on-level (M7) | what it decides |
|---|---|---|---|
| `SET` | `"handout"` | `"slide"` | the six-question independent set is on one slide in both; `"handout"` also prints it as a page with a key (the slide is then titled Independent Set and is the plan's `independent` block), `"slide"` prints its six answers in the teacher's edition |
| `CLOSE` | no | yes | a "Before You Go" slide before IXL (`te.close`) |
| `BANK` | `"docx"` | `"md"` | Question Bank and Additional as documents with keys per lesson, or one `BANK - Unit N.md` per unit |
| `TE_STYLE` | `"lines"` | `"table"` | the teacher's edition's boards inline, or as a table (`te.watch` required) |
| `PLAN_STYLE` | `"sections"` | `"labels"` | the Florida lesson plan as ten numbered sections, or headed paragraphs |
| `UNITS` | units 1–4 | units 2–13 | each unit's title — every unit-wide file and folder is named from it, and `unit.py`'s title must agree |
| `REVIEW_IN_DECK` | no | yes | `uN/review.py` is built like a lesson and closes the unit deck |
| `SLOTS` | `"exponent"` | `"named"` | the colour code: read off the layout, or marked in the spec |
| `CAPS` | fracexp, sci, gap, radicand | fracexp, sci | which benchmark boundaries `capcheck` enforces |
| `IXL_SMARTSCORE` | 67 | 60 | ruling 28 |
| `PERIOD`, `WB_RANGE`, `SET_MIN`, `IXL_MIN`, `TE_MAX_PAGES` | family defaults: 53, (10, 20), 6, 5, 4 | the same | the period's arithmetic and ruling 26 |
