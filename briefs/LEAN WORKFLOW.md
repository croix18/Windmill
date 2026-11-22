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

## A wording pass (ruling 58; first run, A7 Unit 7, 21 November 2026)

When a review changes the words and no number, picture or answer — an outside audit of the slides, the teacher's own
read — the fix pass above is the wrong size for it. Six fixers each read a brief, a spec and the rulings to change
strings the lead had already decided. So:

1. **The lead writes every change as an exact old string and its new one**, a file of edits for each spec, and
   `kit/reword.py EDITS.py` applies them (`--dry` first). The whole list is refused if a string is not in its file as
   often as the edit says. Unit 7: about 470 strings in five lessons, `unit.py` and the manifest.
2. **`gates.py` and `unit_repeats.py`**, as after any change.
3. **A test build of each lesson with no PDFs** (`briefs/lean/try_build.py`: `lessonbuild.build_lesson` into a scratch
   folder; the first refusal of each lesson comes back in seconds). This is where a longer sentence meets the slide:
   a warm-up stem is one line at 23 pt (about 60 characters when it carries mathematics); so is a bold line of a notes
   slide and an answer line under a full set of steps; a board whose words grow a line takes that line from its
   figure. Shorten the sentence; do not shrink the slide. An example's prompt is not one of these rows: the slide
   wraps it, so a whole question fits there (the first run cut Example 2's questions to "Is cost proportional to
   miles?" for no reason, and put them back).
4. **The clean build, and `checks.py out/uN`.**
5. **The reworded questions solved blind.** `student_view.py uN --bank` on the old tree (`git archive`) and on the
   new one names the ids whose words changed; two Opus solvers work those, pictures and all, without the keys
   (`briefs/lean/10 WORDING PASS SOLVER.md`), and `blind_diff.py` reads their answers against the keys. A solver also
   reports every question it could answer only by guessing what was meant. When the student view is cut down to the
   changed ids, a bank's heading must stay above the items it heads: in the first run the cut left each heading under
   the item before it, and both solvers reported headings that did not fit their questions.
6. **The lead looks at every changed slide and every paper** (`changed_slides.py OLD.pdf NEW.pdf --sheet`, and contact
   sheets of the papers). What only the look found: a last word left alone on a second line, an answer slide's graph
   drawn at 60% because the step beside it had grown, an answer that wrapped into two lines.

What it cost: two agent runs, 216,000 tokens, against 847,000 for the fix pass and 176,000 for its re-solve. What they
found: 151 answers against the keys and no wrong key; 27 doubts, of which two were real (a letter in a table that the
words never named; an equation that read as already given) and the rest were the cut's misplaced headings or numbers
left in on purpose (ruling 22).

What a wording pass must not do: change a number, a picture or a key. The gates and the blind solve are what say so.

**A second pass the same day (ruling 59), with no agent at all.** It changed 23 questions by a word or two ("steady"
to "constant", "Give the reason." to "Explain.") and rewrote the five Lesson Plans. `student_view.py` on the old tree
and on the new one showed that no key and no check had moved and that nothing asked had changed, so step 5 had
nothing to solve: run that comparison first, and send solvers only what it shows to be a new question. Steps 3, 4 and
6 still earned their keep. The test build refused an answer line that had grown to two lines. `markup` (checks.py)
refused a literal dollar sign: a vocabulary line had wrapped at the space inside `$(0, 0)$`, so write mathematics that
may fall at a line's end without a space, or in words. The look found one word alone on a second line where
"steady" had become "constant": a one-word swap can still move a line break. A Lesson Plan's fields were given to
`reword.py` by field, not by retyped text: a short script read each old value from the loaded spec, found its
literal in the source and wrote the edit list.

**A third pass that evening, and what only the built pages showed.** Croix asked for the student-facing slides and
handouts to be "perfect", with a fourth outside audit. The audit's list and a full reading of `student_view.py`'s
output changed about 180 spec lines; the faults that were left were all on the pages, not in the words:

- **An equation broken across a line of a paper**, 25 times. No reading of a spec shows where Word will break a line.
  A scan does: `pdftotext -layout` on every PDF, and any line that ends on `= ÷ + · −` or begins with one. The kit now
  prevents it (`dockit.glue`), and the scan is still the proof.
- **A stacked fraction riding above its sentence, with its comma adrift** — on every paper since the papers went to
  Lexend. Look at a page at 200 dpi before believing a paper is set right; a contact sheet does not show it.
- **A last line of one word**, on slides ("cookie?", "mean?") and on papers ("hour?", "y."). The same text scan finds
  them: a line of one or two words under a line of sixty characters. On paper the kit now joins a paragraph's closing
  words; on a slide the sentence is shortened.
- **A gap before an equation on a slide.** A line that ends in `$…$` after forty characters of words shows it; list
  such lines from the specs (split each string on `$…$` and measure the run of words before each expression).
- **An outside audit reads the PDF's text, and a picture of an equation has none.** Gemini asked for the mathematics
  of "x: 2, 1, 4" to be checked: the page prints −2. Take such a finding to the page before the spec.

The order that worked: reword and test-build until no slide refuses; one full build; read every changed slide; scan
and look at the papers; fix; and only then the clean build that is committed. Six full builds were run for this pass,
and three of them were spent finding out, one fault at a time, what the first look should have listed in one go: look
at every kind of page once, list everything, then fix.

**A fourth pass the next day (ruling 60): a refused term put back, and a proof with a hole.** Croix asked what stood
in place of "isolate", read the six places and ruled that "isolate" and "solve for" are the unit's terms. 74 exact
strings, one test build, three full builds, no agent. What it taught:

- **A term an audit asks for is checked against the course before it is refused.** The third pass reasoned that Unit 7
  does not teach "isolate". Unit 1 taught it, and one search of the packages would have said so.
- **When a finding is not taken, the report says what stands in its place**, in the page's own words. He could rule in
  one line because the six places were listed side by side.
- **A scan that proves a rule is written from the rule, not from the cases that prompted it.** "No last line under ten
  characters" was proved by a scan for "one or two words": "x = 1?" is six characters and three words, and it stood
  alone under a line of 7.01's Question Bank through a clean build and a signed proof. The scan now measures
  characters, and `dockit.rich` binds a paragraph's closing words across its pieces.
- **A new phrase brings its own line breaks.** "Solve the equation for / n, the yards in f feet." was on the first
  build of the new wording. Look at the paper page of every reworded stem, not only its slide; the kit now keeps a
  one-letter variable with the word before it (`dockit.tie_letters`).
- **A longer stem can run into what stands beside it.** The Practice Test's 12(b) grew by two characters and touched
  its "1 pt". `pdftotext -layout` shows it as "dollars.1 pt": search a points paper for a mark with no space before it.

**An older unit brought to the same rules (A7 Unit 11, 22 November 2026).** Croix: *"take a wack at 11 with these
changes."* Unit 11 had been built on the old kit on 14 Nov. One lead, no agent: 332 exact strings, five full builds,
one kit fix. What it taught:

- **Build the unit once on the new kit before a word is changed.** That build says what the kit alone breaks, and it
  is not the wording: five figure labels were refused in Lexend lettering, `glyph` found sixteen boxes and thirds (□, ⅓
  and ⅔ are not Lexend glyphs, so in prose a box is "the box" and a third is "(1/3)"), and a standing line
  of the kit wrapped badly for a two-digit unit ("…Due by the Unit 11 / test."). The first mend of the boxes wrote
  them as mathematics, and in a key's worked line and a plan's table cell the picture stood half again as tall as the
  words: a fifth build put those lines into words. Look at one key page and one plan page at 90 dpi before the clean build.
- **An old string is read from the file, not typed.** `briefs/lean/edit_list.py` takes an anchor (`closure="`,
  `("MTR.4.1", "`, the first words of a paragraph) and writes the `reword.py` list with the old literal as it is on
  disk; `reword.py` still refuses the whole list if one does not apply. A plan field is rewritten by giving only the
  new sentence.
- **A second row of words over a figure is paid for out of the figure.** A question split into a sentence and a bold
  question left a graph a quarter of an inch tall above four options (11.08, whiteboard question 4) and others a
  quarter smaller. Keep the words on one row, and measure a candidate before a build: `deckkit._textw(text, size, bold)`
  for words and `Deck.measure(row, "slide", 24, bold=True)` for a row with mathematics, against 11.5 in for a centered
  row, 10.9 in for a word board's row of words, 11.15 in for its row with mathematics and 11.2 in for "Answer:" and its
  line at 32 pt. The kit measures with a 6% margin, so a line that fits by eye can be given two lines' height: a blank
  line under it and a smaller figure.
- **Compare a rebuilt unit's page counts with the old build's.** Lexend is a wider face: plans and keys run a page
  longer, and one student paper went from six pages to eight because two questions missed their pages by a tenth of an
  inch. Two figures 0.2 and 0.3 in smaller put it back.
- **Read each plan sentence against the course, not only against the rule.** "Building on Grade 7: graphing y = px"
  had been false since the unit moved ahead of Unit 7, and a higher-order question asked why a legal step cannot be
  taken. Turning a fragment into a sentence is when such a thing shows.
- **Where a test paper's stems are the state's item shapes and a practice page words its questions the same way, the
  stems are left alone**, and the report says so.

## What it does not do

- It does not build the practice page (the unit test is a random set of it): a separate step, after the paper.
- It does not publish. Nothing reaches mrshaffer.org without Croix's word.
- It does not replace the gates, `checks.py` or the look-through of the figures: they are the floor it stands on.
