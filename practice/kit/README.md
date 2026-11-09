# Practice-test kit

This is the shared template for Croix's student practice-test pages. One unit test turns into one practice page. Every unit
uses the same page, the same rules and the same checks. The A7 Unit 3 and M7 Unit 4 pages are built on it, and so is every
unit after them.

The design comes from Croix (10–15 Oct 2026). The Apple review (15 Oct) changed it in places, marked [R1-n] / [R2-Nn] / [J-n] / [W-n]
in the code; the four reports are in the Windmill HANDOFF.

## What a student gets
- **A new set of numbers every time.** The questions are the same kinds as the unit test, in the same order, with the same
  points. `#set-4821` in the link always opens set 4821, so a teacher can say "everyone do set 4821".
  - The real test forms' numbers are not on the page (24 Oct 2026; see "Making the next unit"). A unit built before ruling 49
    keeps its forms' numbers in `test_forms.js` for its checks, which count the parts that print a test part's numbers.
  - **A set never changes under a student.** Each question slot draws from its own random stream (`core.js`: `slot`, `draw`),
    and `check/lock.js` holds the questions of sets 1–300. If any set changes, the unit's `contentVersion` must be bumped.
    Saved answers on a changed set are then cleared, with a notice.
- **Two modes:** *Check as I go*, or *Like the real test*. In test mode nothing is marked until Finish. The only thing said
  before then is "Can't read this yet".
- **The coach.** It names the exact mistake ("That is what you get if you…") and says *Almost* when the value is right but the
  form isn't (and, since 7 Nov 2026, *right* when the form is only another way of writing the key). Its *Next time* rule is
  Hint 1 now.
  - **The clean rule:** no modelled mistake, printed number or other part's answer may equal an answer. The generator
    draws such numbers again, so a wrong method is never marked right.
- **Help is a ladder of three rungs** (7 Nov 2026; see "The help ladder" below): **Hint** beside Check opens *Hint 1 · What to
  notice*; under it *Hint 2: the first step*, then *Hint 3: the whole solution* — the worked solution that "Show me how" was
  (every step, the step where the student's answer went off, "See why it works", the answer). The rungs opened stay open.
  - Hint 2 also offers **Step by step with me**: the walkthrough as before ("Hint · step 2 of 5"). Tap-a-choice steps give a
    reason for every wrong choice; type-a-number steps give a smaller step after a miss, and after two misses offer *Show this
    step*; the picture appears at the step it explains; it ends with the answer, as Croix chose.
- **After an answer:**
  - **See the worked solution** after a right answer (rung 3 in one tap).
  - **After a miss — explain, then two buttons** (7 Nov 2026, item 2): the card names that wrong answer ("That is what you get
    if you…", a choice's own misconception), or, when nothing names it, says *Look at:* with Hint 1; then exactly **Try a
    similar one** (the primary) and **Move on** (to the next question not right yet, else Finish). The ladder stays beside
    Check for a second try. No penalty questions, ever: nothing is added to the set for a miss.
  - **Try a similar one** (was "Try another like this"): the same kind of question with new numbers, never a repeat, in the
    question's own box ("A similar one"), replacing the last. It is offered after a miss and whenever the question's point is
    not earned yet (then as the primary button), and on a fresh one after any check.
  - **Next ↓** after a right answer. Focus never jumps by itself.
- **Scoring — the point comes from one on your own (24 Oct 2026).** A question's point is earned by a right answer on the
  first check with no Hint and no Show me how — on the question itself, or on a fresh one of the same kind ("Try another like
  this") solved that way. Help is unlimited and never shamed: a question solved with the Hint says "✓ Correct" with the small
  gray bulb (the Hint button's own icon, no words) and "One on your own earns the point."; its fresh one, right unaided, earns
  it, and the question's card then says "point earned". A fresh one answered wrong and then corrected earns nothing; the next
  fresh one can. Two measures, never conflated: the bar and the end panel lead with the points earned ("9 earned 💡2 · 12 of
  36 done"; "9 / 36 points earned on your own"); "Right on the first try: 7 / 36" is kept beneath as what happened on the
  original first check, and is never rewritten. Help after the point is earned changes nothing. Croix brought the rule from a
  ChatGPT review of the A7 Unit 4 page (24 Oct): "The student may learn with as much help as needed. The final practice point
  must represent a complete and independent solution to a fresh problem, not merely recognition of an answer they just saw."
  (Before, from 11 Oct: right on the first check was a point, Hint or not; 23 Oct: the bulb in place of "with help".) Each
  section counts up ("4 / 9", then "9 / 9 ✓").
  - **One rule for misses:** a first check right with no help is one in a row; two in a row clear the miss. Any other first
    check — wrong, or right after help — adds the miss and starts the count over. The question itself and its fresh ones count
    alike (before: one unaided first try on the question cleared it; a fresh one needed two). A blank left at Finish in
    Check-as-I-go is a miss too (before: "not done", and not practised).
  - *Like the real test* is untouched: no help before Finish, so its score is what was right at Finish; help and fresh ones
    after Finish never change it.
- **Two streaks** (24 Oct 2026; Croix: "Several kids loved the streak of getting multiple questions right in a row. Can you
  make sure that's well thought out and implemented well."):
  - **A question's own count**, in the "Try another" header: fresh ones of that question in a row solved on your own, kept on
    the device across sets. "✓ one in a row", "✓✓ 2 in a row — you've got this one" (the second clears the miss), then
    "✓✓ 5 in a row" — the count goes on; it never drops to nothing while the kid is on a roll.
  - **The run**, in the bar: first checks right on your own in a row across the set, questions and fresh ones alike, in the
    order checked. A wrong first check, or a right one after help, ends it; second tries change nothing. Shown from two
    ("✓✓ 4 in a row"), short enough for a phone's bar. The end panel says "Best run this set: 7 in a row", with "— a new
    record" or "· your record: 12" (the device keeps the unit's record run). Not in test mode before Finish: nothing there
    says right or wrong until then.
  - One primary button at a time: when the point is still owed, "Try another like this" is the primary and "Next ↓" is not.
- **Where you are, and how it went** (7 Nov 2026, item 5): the bar says *"Question 4 of 16"* over a thin turquoise line (the question
  holding the focus, else the first on the screen; questions, not parts). The end panel keeps the first-try score and adds a
  chip per skill (the unit's sections) — **● Secure** (80% or more right on the first check with no help), **◐ Getting there**
  (50% or more), **○ Not yet** — a word and an icon, never colour alone; and *"Since last time: up — 12 / 36 then, 18 / 36
  today."* (down, the same) from this device's history of the same practice choice and mode, as a share when the sizes differ.
  Calm: no confetti, nothing that nags.
- **Practice menu:** whole test, one part (two rounds with new numbers), or my misses (new numbers; one round if there
  are more than 8).
- **The end:**
  - "Every one on the first try." when it's perfect; "Every point earned." when every point came, some from a fresh one.
  - Otherwise, jump links to the parts not right yet, "Practice my misses", and the parts under 80%.
  - "Since last time: up — … then, … today." (it was "Last time: … Today: … (+6)").
- **The clock:** it starts with the first answer and pauses when the page is hidden (Resume brings it back). It is shown only in
  *Like the real test* (7 Nov 2026); in *Check as I go* it runs unseen, so the end panel still has the time.
- **Progress:** each device keeps its last 25 sets in its own browser storage. Nothing is sent anywhere.
- **Made on purpose to be absent:** no Start button, no typing-tip box, no footer, no "Help me solve this", no row of controls
  above question 1 (what to practice, Print and the set number are in the ⋯ menu), no clock in *Check as I go*, no font or
  anything else from the network — but for the two calculators, each only once a student opens it (8 Nov 2026, below).

## The look: mrshaffer.org's family (7 Nov 2026)
Croix asked *"What would you change about the practice tests?"*, was given five changes, and said *"Ok sounds well thought out.
Proceed."* The page is a practice test on mrshaffer.org, so it now looks like the site:
- **The palette** is Deckhand's, as the site's is (re-themed the same day; Croix: *"use my color palette from deckhand
  instead"*; the tokens are `public/site.css` `:root`, at the top of `kit.css`): a cream desk (`#F8F2E4`), white paper, navy
  ink and pen (`#17324D`); teal ink (`#0F6B74`) for links, the item IDs and the small caps (the eyebrow, the menu's labels, the
  rung headings); **turquoise** (`#40E0D0`, navy on it) is the one live accent and stays small — the "Question 4 of 16" line,
  the pressed mode (with a navy edge, so the state is not colour alone), the keypad key being pressed, Larger text when on;
  **sand** at low alpha for every quiet fill (the Hint panel, the walkthrough, ⋯ and its menu, the coach's rule box, the
  secondary buttons, the teacher bar); **pale turquoise** beside the live thing (Hint 3 · the worked solution, the "A similar
  one" box); **navy** for the one primary button (Check / Try a similar one / Next), white words; **green** for right;
  **coral ink** (`#AD3B28`) on a coral-pale tint for a miss — never solid coral; solid coral (`#FF7F6A`, navy words) only for
  the alarm (the "this set was updated" notice). The skill chips: Not yet a navy outline, Getting there teal, Secure green —
  never turquoise. Nothing yellow. Every text colour is measured at ≥ 4.5:1 on each surface it sits on (≥ 3:1 for a control's
  edge). Print is dark ink on white, whatever the theme.
- **Dark is true dark (7 Nov 2026).** Croix, on his tablet in dark mode, of the navy desk with navy cards: *"That's entirely
  too difficult to look at"* — *"dark mode should be true dark mode. Black background not dark teal."* — *"And white
  letters."* It is Apple's dark mode: a **black** desk (`#000000`), **near-black grey** paper (`#121418` — never navy), the ⋯
  menu a step lighter (`#181B21`); **white** ink and pen (`#FFFFFF`) for the title, the questions, the answers and the coach,
  a light grey (`#B4B9C2`) only for the quiet lines; the primary is **white with black words**; turquoise (`#40E0D0`, black
  words) only where something is live, as in light; a lighter teal (`#5FD9CC`) for links, the IDs and the small caps; right
  `#7EE2A7`; a miss `#FF9B8A` on a coral tint; the alarm solid coral with black words; the bar black glass. The quiet fills are
  white at 6 % and 10 %; the answer boxes' underline is white at 42 % (`--edge`, ≥ 3:1 on the paper — the hairline `--rule`
  is not a control's edge). The figures (number lines, triangles, the coordinate plane) are drawn in the tokens, so they turn
  white with the ink; KaTeX inherits it. Every text pair is measured ≥ 4.5:1, every control edge and figure line ≥ 3:1.
- **Appearance: System · Light · Dark**, in the ⋯ menu under Larger text — one radiogroup (each choice 44 px; Tab reaches the
  chosen one, the arrows, Home and End move and choose). **System** follows the device (no attribute); **Light** and **Dark**
  set `data-theme` on `<html>`. The choice is remembered on this device for every unit and the teacher copy
  (`localStorage` `practice.theme`, in try/catch); `build.py` puts a one-line script first in `<head>` that applies it before
  the first paint, so nothing flashes. Storage refused (a private window): the control still works for the visit. The chosen
  word has the ink's edge and weight — not turquoise, nothing about it is live. `check/page.js` part I checks it: a dark
  device is black with grey paper and white ink, the mathematics in the same ink; Light under a dark device is the light
  page; the control by keyboard, remembered across a reload, back to System; Dark printed is still dark on white; without
  storage; and every line and word of a figure found in the unit's first sets ≥ 3:1 on the dark paper.
- **Fonts:** Lexend stays on the sheet (ruling 46 — questions, answers, coach, buttons); the title is the site's DM Serif Display,
  the bar and the eyebrow its DM Sans. All four faces are in `vendor/fonts/` (cut by `make_fonts.py`; SIL OFL 1.1, the licences
  beside them) and `build.py` inlines them as data URIs — the Google Fonts `<link>` is gone; the page loads nothing (`page.js` F
  fails any request off the page; the calculators, opened only by a student, are part N's — 8 Nov 2026, below). Lexend's 500 draws as its Regular and 600 as its Bold; no faux weights.
- **A quiet top:** the eyebrow, the title, the points, the unit's `notes` as a small muted line, then the mode toggle and **⋯**.
  ⋯ is a button (`aria-haspopup`, `aria-expanded`) whose menu holds *What to practice*, **Print** and **Set N · Change** — the
  same controls with the same ids and functions as before. Enter opens it with focus inside; Escape, a tap outside, or any of
  them acting closes it, and focus goes back to ⋯. On a phone question 1 is on the first screen.
- **The clock** shows only in *Like the real test* (above).
- **Answering on a phone:** the box takes the width; Check and Hint share one row under it (a/b parts too). **Check is the
  primary** (navy) until "Try another like this" or "Next ↓" is — still one primary button at a time.
- **After Finish:** "Try a new set" — New set from behind Set · Change: a new random set, the same practice choice and mode. On
  the whole test in *Check as I go* it takes the place of "New whole test", its twin.
- **The way back (the site only):** on `/<course>/practice/unit-N/` the bar's far left has the site's "‹ Unit N", to
  `../../unit-N/`, with N from `Unit.id`. As an artifact or a Google Sites download it is hidden.
`check/page.js` part F checks all of this; the flows that use Print, the practice menu or the set box open ⋯ first.

## The help ladder (7 Nov 2026, the practice-test deepening, item 1)
From the survey (Khan: *"a hint for each step … viewing all the hints gives a worked example"*): one ladder in place of Hint
and Show me how. **Hint 1 · What to notice** is the coach's rule for the kind of question (what "Next time:" said after a
miss); **Hint 2 · The first step** is the worked solution's first line (with "Step by step with me", the walkthrough);
**Hint 3 · The worked solution** is every line, one per line with a thin rule between them, never a paragraph.
- **The authoring API:** `Unit.rungs(x, type, ctx) → {notice, first: {say, ex}, steps: [{say, ex}]}`, any of the three. What a
  unit leaves out is derived: `notice` from the coach's `rule` (else the walkthrough's first question), `first` from
  `solution()[0]` (a one-line solution takes the walkthrough's first step and its answer instead), `steps` is `solution()`.
- **Kept per attempt:** `R.rung`, the deepest rung opened (the question and each fresh one has its own), and `R.rungFirst`, the
  rung open at the first check. A set saved before the ladder reads its Show me how as rung 3 and its Hint as rung 1.
- **Scoring is unchanged:** the point is earned only by a first check with no rung open, on the question or a fresh one; a
  rung opened before the first check is the bulb; rung 3 before any check makes the first try "not first" (as Show me how
  did). The first-try store is never rewritten. A rung opened after a right answer changes nothing.
- **Effort, beside correctness:** the end panel says *"Solved without help: 7 · With a hint: 2 · Saw the solution: 1"* — each
  question counted once, by the most help opened before it was right (its fresh ones too); in *Check as I go* only.

## Named distractors (7 Nov 2026, the practice-test deepening, item 4)
From the survey (Diagnostic Questions: *"the three distractors are designed to expose specific misconceptions"*): each wrong
choice may carry its misconception line, and picking it shows that line on the card — *"✗ Not yet That adds the exponents.
(13⁵)³ is 3 factors of 13⁵ … multiply, 5 × 3."* The authoring field is **`view.why(x, k)`** (a function of the item and the
choice) or **`whys: [line per choice]`** on the item (`''` for the right one); with neither, the coach's own words stand. On a
select-all, the wrong picks are named on the first check, and missed ones are counted ("One more choice is right too.").
- **Already named before 7 Nov** (the coach's `mcFeedback` names every wrong choice): every single-answer choice question of
  M7 Units 4, 8, 9 and 10 and A7 Units 3–6, and M7 Unit 8's, 9's and 10's select-alls.
- **Named from 7 Nov:** the select-alls that waited for the second try — A7 Unit 3 Q8, Unit 4 Q4 and Q13, Unit 5 Q3 and Q10,
  Unit 6 Q2 — by `view.why` returning the coach's own second-try line for that choice (no new sentence).
- `check/page.js` part G picks two wrong choices of every choice question on a set and each select-all's first wrong choice,
  and fails a card that does not show that choice's line, or two choices of one question that say the same thing.

## Speakable IDs (7 Nov 2026, the practice-test deepening, item 6)
*8 Nov 2026 (the review of Tests A and B): **the ID alone** — no skill or family code follows it anywhere (on a student's printed
test "U10·3 · solveAdd/graphAdd" cued the method, and it was jargon on the page); and on paper it sits on its own line at the
top right of its question, as on the card, so a one-part question's "1 pt" stays at the right of its line.*
From the survey's don't-do table (badge codes that need a legend): every question card has a short stable ID, quiet at its
top right — **U9·3**, the unit and the question's place in the whole test — then the generator's skill code
(`view.skill(item)` if the unit gives one, else the item's family codes: "U9·4 · sumDec/diffDec"). A teacher can say "look at
U9·3": the ID is the same in every set, practice choice and round, on the printed worksheet (top right of each question), in
every answer key's last column (the worksheet's, the make-ups', the ruling-49 test's) and on the teacher copy's real test and
its key (`teacher.js`, ID only — the paper has no generator). A question left out of the real test keeps its ID; only the
printed numbers close up. The print styles keep them (`.qid`, `.pqid`, `td.pid`). `page.js` part D checks the cards, the
worksheet, the keys, the test forms and the real paper.

## On a phone (7 Nov 2026, the practice-test deepening, item 7)
- **Mathematics never widens the page:** a worked line, a Start line, a key and a long choice scroll sideways inside
  themselves (`overflow-x: auto`), and the choices' grid cannot grow past the sheet. KaTeX stays inlined.
- **Worked steps one per line,** a thin rule between them (rung 3).
- **The keypad only on a touch screen** (`pointer: coarse`; a mouse and keyboard get none): the unit's keys for the box's
  kind, and beside a fraction bar the **fraction template**, which writes `()/()` with the caret in the top (the page reads
  `(3)/(4)` as `3/4` before the coach sees it, and `(4)/(7)^8` as `(4/7)^8`). Keys are 44 px, insert at the caret, are not
  tab stops, and sit above the box in the page's flow, so they never cover it or its Check row. A unit with no `keypad` at
  all gets the kit's: − / a/b ^ ( ) π ×.
- **Larger text** in the ⋯ menu: two sizes (the sheet and the end panel at 116%), remembered on the device for every unit
  (`practice.textsize`, every read and write in try/catch: with storage refused it lasts the visit).
- `check/page.js` part H, in a touch context and a mouse one: the keypad's presence, its key sizes, insertion at the caret,
  the template, nothing covered or moved; Larger text in the menu, larger, remembered, off again, and safe without storage;
  no sideways scroll at either size with every worked solution of a set open. Part F already fails any request off the page.

## Equivalent forms are right (7 Nov 2026, the practice-test deepening, item 3)
From the 170-site survey (its items 14–19, which Croix approved): the most concrete failure it found was *"x=3 was not
accepted unless written as 3=x"*. The unit's coach still judges first — its mistake models, its "Almost" — and then, when it
says not yet, `core.js` **`Kit.Ans`** asks whether the typed answer *is* the key (`keyText`) written another way. If it is,
it is right (and counts as right on the first check), with a quiet nudge under ✓ where the form could be tidier.
- **The same:** `3 = x` and `x = 3`; `0.5`, `1/2` and `2/4` (nudge *"Simplify: 2/4 = 1/2."* when the key is in lowest terms
  and the box does not say `simplest: false`); `1 1/2` and `3/2`; trailing zeros, spaces, a leading `+`, `.5`; the unicode
  minus and dashes; `×`, `*`, `·` and `x` between two numbers; `÷` and `/`; `^` and superscript digits; `pi` and `π`; thousands
  commas; `$` in a money box and `%` in a percent box; the box's own unit typed after the number; `x*2`, `2x` and `2·x`;
  the terms of a sum and the factors of a product in any order; one sign for a term (`−(2x)`, `(−2)x`, `−2x`); `x/2` and
  `½x`; the sides of an inequality turned round with its sign (`3 < x` is `x > 3`, chains too); an ordered pair `(2, 3)`, or
  `98, 24` for `98 and 24`; `n = 9` (or `9 = n`) in a box that already says `n =`; a template's `(3)/(4)`.
- **Never the same** (the question asks for these, so the coach marks them): like terms combined (`3x + 2x` is not `5x`),
  products worked out (`7 × 3` is not `21`), a power and its value (`9^5`, `59049`), `(−3)^2` and `−3^2`, the grouping of a
  sum (`(a + b) + c` is not `a + (b + c)`), one scientific notation and another, a negative exponent for a positive one,
  distributing, a rounded decimal for a fraction (`0.33`, `1/3`), words, two numbers side by side, a number after a letter.
- **Rounding:** a box that declares a precision (or whose placeholder says "nearest tenth") takes any answer within half of
  it; more places than asked is right with *"Round to the nearest tenth: 9.2."*
- **The form label:** every box may carry a quiet line over it — *"To the nearest tenth"*, *"In scientific notation"*, *"As an
  inequality"*, *"As a power"*. A unit declares it with **`view.form(part) → {label, expect, precision, simplest, money,
  percent, v, equiv}`** (or `part.form`); with no declaration the label is read from the key only where it cannot be wrong, and
  a box with a placeholder gets none. `expect: 'fraction'` with `label: 'as a fraction a/b'` also nudges a decimal; `equiv:
  false` leaves a box to its coach alone (M7 Unit 9's associative-property question, where the grouping is the answer).
- **Checked:** `check/norm.js` (run by `run.py`) — 101 cases, 28 of them answers that must *not* be the same.
- **Known limits:** it reads one-letter variables only (a word, "bus 85.33", is the unit's reader's); it does not combine
  numbers (`2·3x` is not `6x`); `x` is "times" only between two numbers; a fraction bar binds left to right (`1/2x` is `½x`,
  as the units write it); `|x|` and roots are not read.

## A lesson's practice from Cadence (7 Nov 2026)
Croix: *"instead of having the entire practice test, the days should have practice questions directly from that day's lessons"*
and *"have it pull Cadence questions … Cadence already tracks by unit and lesson"*; told the figures needed rendering support:
*"Can you provide rendering support?"*
- **The bank.** Windmill `tools/cadence_bank.py` runs Cadence (its one file) headlessly and writes `<unit>/bank/`: `cadence.json`
  (per Cadence lesson of the unit's plan days, 60 of Cadence's own items — 45 regular, then 15 high rigor where the skill has
  them — each with its stem, figure, choices, key read into checkable parts, worked solution and a stable id), `map.json` (every
  lesson code of the unit on the plan → its Cadence lessons, `cadence`, or `whole-unit` with the reason: a review day, a test
  day, no Cadence lesson, a title that does not agree, too few items), `BANK.sha256` and a README. `build.py` inlines the two
  files (refusing them if they do not match their hashes) with `bank.js`, before `ui.js`; benchmark codes stay out of the page.
- **The practice choices.** *What to practice* lists, under **Lessons**, "Lesson 9.03 · Title" for every lesson of the plan the
  map gives to Cadence (a two-lesson day, 9.03+04, is a choice too, opened by its link; a thread day is one choice). The scope is
  `lesson-<code>`: `#lesson-9.03` (the site's link: a new set) or `#set-4821-lesson-9.03`. The eyebrow reads "Grade 7 Math ·
  Unit 9 · Lesson 9.03 Practice" and the lesson's title replaces the unit's. The whole test, its sections and My misses are
  untouched.
- **A set** is 8 items: 6 regular, then 2 high rigor when the lesson has them (a two-lesson day: 3 + 1 of each), one of each of
  Cadence's templates before any comes twice, never repeating on this device until the lesson's bank is used up, then
  reshuffled. A set number gives the same order to any device that has not used the bank; a set once drawn on a device keeps
  its questions there (`<unit id>.bank.sets`, `.bank.used.<lesson>`, every read and write in try/catch). The end panel offers
  **Another set from this lesson** and **The whole practice test**.
- **An item is a native card.** `bank.js` turns a Cadence item into a kit item — one box (`solo`), a box or a choice per claim of
  Cadence's key (`parts`: "shorter base 11 cm; longer base 16 cm" is two boxes, "Step 3; the correct expression is …" a choice
  of step and a box, a matching grid one choice per row), `mc` or `multi` — and wraps the unit interface (view, judge,
  solution, rungs, walk, key, keyText) so a bank item is answered by it and anything else by the unit, unchanged. So the coach
  card, first-try scoring, the IDs, the keypad (of its own keys − / a/b ^ ( ) π × √ = < ≤ ≥ >, the unit's — the same on every lesson
  item of the unit; since 8 Nov 2026, "The keypad, even and tidy" below), Larger text and print work as for
  native questions. The ID is **U9·L3·7**: the unit, the lesson, the item's place in the lesson's bank.
- **The help ladder** for a bank item: Hint 1 · What to notice is the skill's name and the first sentence of Cadence's
  solution; Hint 2 · The first step is the solution's next step (its final "= …" kept back when it would be the answer); Hint 3
  is Cadence's whole worked solution, one step per line. **Try a similar one** is another item of the same lesson — the same
  Cadence template where there is one, the same kind of answer, never one in this set or served before for the question.
- **Answers.** A choice is Cadence's key. A typed answer is right when it is the key, or a form Cadence's key itself accepts
  ("(or 4.75)", "(28.00 also accepted)"), written any way `Kit.Ans` reads as the same — the box's unit typed after it, `$` in a
  money box, a precision the stem names; where Cadence allows "an equivalent equation / inequality / expression", the same
  solution (one letter, linear, the same root and direction) or the same value everywhere is right too. The right value in
  another form than asked is *Almost* (a decimal for an answer in terms of π, a standard number for scientific notation).
  `Kit.Ans` reads square roots (√85, √(85), sqrt(85); √18 is not 3√2) and drops a degree sign since 7 Nov 2026 (`norm.js`).
- **Rendering is Cadence's.** Its strings were cut into prose and TeX by Cadence's own converter at export; each math run is a
  `<span class="m" data-tex>` that `tex.js` draws with the inlined KaTeX (a display line at the margin, set smaller down to 72%
  before it scrolls sideways on a phone). Figures are Cadence's SVG, verbatim: up to 420 px wide and 320 px tall, a wide one
  (four graphs to choose from) scrolling sideways in its own box, never clipped; light on dark in the dark theme (inverted,
  the hues turned back); dark on white on paper. Its tables take the sheet's rules.
- **Checked** by `check/bank.js` (run by `run.py` on a unit with a bank): the schema and the hashes; every lesson code of the
  plan (the course's `build/assets/windmill/spine.js`) in the map, resolved; at least 20 items per `cadence` lesson; every item
  of every lesson drawn at 390 px in light and dark — no error, no request, no sideways scroll, every TeX run drawn, a figure
  wherever the item has one, light on dark in dark, its ID; 30 items at random answered through the page with Cadence's key,
  ✓ on the first try; a wrong answer not; the three rungs; a similar one; the end panel; the print keeping the IDs; on a touch
  screen the keypad is the unit's keys (44 px, even rows at 390 px), a key in at the caret, and where the unit has inequalities
  = < ≤ ≥ > among them and an inequality's key typed tight with its sign tapped ("c<-16.5" for U10·L4·58) ✓ on the first try.

## A graph the student builds (7 Nov 2026)
Croix: *"I'd like the practice tests and tests to make them graph inequalities with an open or closed dot and an arrow instead of
just describing them. Adjust the practice tests and the tests to reflect this."* A part of kind **`nline`** (`nline.js`) asks for
the graph of a one-variable inequality, built, not chosen:
- **The authoring shape:** `{kind: 'nline', line: {lo, st, n}, graph: {c, closed, dir}}` (`dir` `'left' | 'right'`; numbers or exact
  strings). The line is drawn as M7 Unit 10's number lines are (ten steps, a label on every tick — on every whole number when the
  step is ½ — an arrowhead at each end). The student's answer is the same triple; `keyText` is `nline:c|open|right`.
- **On the screen:** the line, its tap zone per tick the line's full height (≥ 44 px on a phone); a tap places the point, a drag
  moves it, ← → move it a step and Home / End to the ends (the line is a `role=slider`). Under it **Dot · Open | Closed** and
  **Arrow · Left | Right**, a word and a glyph each, 44 px radiogroups (Tab reaches each group's one stop, the arrows move and
  choose). The ray draws from the point to the edge as soon as a point and a direction exist; a point with no dot yet is the one
  live thing (turquoise with the ink's edge). A visually hidden live line says "Boundary at 3, open dot, arrow to the right." No
  typing, so no keypad. Strokes are the pen (`currentColor`): white on the dark paper, a 2 px ring for open, filled for closed.
- **Judging:** right only when all three match. Not finished is *Not counted yet* ("Choose which way the arrow points."). When
  wrong, the card names ONE thing, in the order **boundary → dot → arrow**; a unit gives its own words with
  `judge.nline(part, which, answer, ctx)` (M7 Unit 10 names the wrong operation's or a lost sign's boundary, and the arrow read
  from the unwritten side), else the kit's three lines. The rungs follow the same order (a unit's `rungs`, else the kit's), and
  Hint 3 ends on the graph drawn. Unlimited help; the point only on a clean first check (unchanged).
- **Paper:** the worksheet and every printed test form print the part's line ("Graph the solution on the number line.") over the
  empty number line with a 10 mm band — nothing else; the keys (the worksheet's, the make-ups', the ruling-49 test's) draw the
  graph in ink with its words ("Open dot at −7, arrow left"). The teacher copy shows the key's graph under the item on screen.
- **Bank items:** Cadence's "graph: open circle at 4, shaded to the right" keys on its blank number line are exported as `nline`
  parts by `tools/cadence_bank.py` (the line read from Cadence's own figure, exactly, or the four described graphs stay a choice
  and are counted); so are Cadence's choice items whose options are all described graphs ("Which number line shows the
  solution? A. Closed circle at 2, shaded right …"): the question leaves the stem, the part asks it, keyed from the right
  option, on Cadence's figure or, with none, ten steps of 1 or ½ with the boundary in the middle (a boundary off every tick
  stays a choice, counted). The page then hides Cadence's blank line, since the part draws its own.
- **Checked:** `check/page.js` part J (tap, drag, keys, both radiogroups, the live ray, ✓, the three lines in order, the ladder,
  "Try a similar one", print with the band and the drawn key, the teacher copy's test and key, a touch screen with no keypad,
  ≥ 3:1 in dark, 44 px, no sideways scroll at 390); `check/bank.js` builds a bank's graphs through the page; `check/variety.js`
  counts a graph's line among its numbers.

## Two rulings of 7 Nov 2026 (evening)
- **7 Nov 2026 — the follow-through line is not printed or shown anywhere (Croix).** *"Can you get rid of 'if an earlier part is
  wrong a later part still earns its point' line across everything."* The line is gone from the student pages' notes, the
  worksheets, the teacher copies, every printed test form and make-up, and the keys (`teacher_gen.py` writes
  `follow_through_student` empty; `ui.js` and `teacher.js` print nothing for it; each unit's `notesPrint` drops it). The policy
  stands: ruling 19's scoring — a later part right from the student's own earlier answer in *Like the real test* — is code in the
  units' coaches and is unchanged, and a key's own grading note (`follow_through_key`, the teacher's instruction, where a unit's
  spec has one) still prints on the teacher's key. `check/page.js` part K fails a built page that holds "earlier part is wrong".
- **Which practice this is, always in sight.** Croix: *"It was the switching mechanism that confused me. I would assume that if I
  open a specific lesson it would open to that section. Likewise if I open the full practice test."* A chip under the title names
  the choice from What to practice — "Whole practice test", the section's name, "My misses", "Lesson 10.04" — and in a lesson the
  line under the title reads "[Lesson 10.04] 8 questions · today's practice", the chip leading it (the count is the set's).
  A lone graph to build says its instruction line on the screen and on paper. Teacher copies the same.
  `check/page.js` part K checks the chip per scope and the lesson line against the cards.

## 7 Nov 2026 — edits layer (`edits.js`)
*Superseded on 8 Nov 2026 (the next section): of all this, only Hide is left, as **Disapproved**.*

Croix: *"I also want the ability across the board to edit test questions."* — from the cockpit on mrshaffer.org, without a
rebuild. The ruling: **the edits are a layer, stored in the site's Worker (`items.js`, `GET /api/items/<course>/<unit>`) and
applied by the kit when a page is drawn; the course repositories stay the source of truth.**
- **A question is a family**, not one instance: its numbers are generated and are never hand-edited. What is edited:
  a family's **wording** (its stem and each lettered part's line) as a **template** — the stem the unit's view draws, cut into
  the kit's markup and placeholders: a number, money or a percent in the text is `{{nK}}` (with its "a"/"an"), a word the set
  drew (a parameter's string value: a name, an item) is `{{<parameter>}}`, `<i>x</i>` is `{{vK}}`, any other element (a math
  span, a "shown" line, a fraction) is `{{mK}}` whole; `<br>` is a new line, `<b>` is `**bold**`. Filling puts the set's own
  HTML back, so **extract → fill is the stem exactly** (`check/edits.js`, every field of every family on 300+ sets). A family
  whose stories are worded differently has one template per **wording**, keyed by a hash of its original template; an edit
  names the wording it was made for, and is not applied (the teacher copy says *Edit not applied*) if the unit's wording
  changes. More than 12 wordings, or nothing but generated mathematics: **"wording not editable"**, with the reason.
- **Also**: **hidden** (the family is left out of NEW sets: `ui.js` `build()` filters by the set's composition `S.eh`, snapshotted
  when a set is first opened, so a set saved on a device keeps its questions — and its saved answers — until "Try a new set" or
  "Start over"; printing always uses the current composition); **points** per lettered part (0–20; the sheet, the totals, the
  score, the history and every printed form count them — `pw()`; 1 stays "1 pt"); **Hint 1** (the coach's "What to notice");
  a **lesson item** from Cadence (its stem, its key, hidden: `bank.js` `kitItem` and the draw); the teacher's **own questions**
  (number, expression, words, choice, inequality, number line) — Cadence-shaped items that `bank.js` draws, judges and helps
  with — after the native questions of their section or in "More questions" at the end, numbered **U10·C1** (the native IDs
  keep their places: `_qn`), part of Like the real test and every printed test, with no "Try a similar one".
- **The page**: on the site (`/<course>/practice/unit-N/`, `/teacher/<course>/unit-N/practice/`, or `window.KIT_EDITS_BASE` in
  the checks) `ui.js` waits for the edits — at most 1.5 s; offline, the last copy kept on the device; a failure, the plain page.
  Off the site nothing is fetched and nothing changes. The teacher copy marks a changed question **Edited** (its own questions
  **Added**) on the screen and in its keys' ID column; the student page and every student sheet never do. A teacher copy whose
  real test is the build's fixed Forms A/B (M7 U4, U9; A7 U3–U5) says its edits reach the page, worksheets and make-ups only.
- **The cockpit's preview pane** is the unit's teacher copy at `?kedit=1`: `Kit.Edits` there lists the families (`survey(1500)`),
  the lesson items (`bank()`), fills and checks templates, and draws the question being edited with `window.PracticePreview`
  exactly as students see it (nothing is saved under the teacher's own practice state: storage prefix `<unit>.kedit.`).
- **Checked**: `check/edits.js` (run by `run.py`): the round trip, the survey and its not-editable list, a template applied and a
  wrong one refused, the markup (no HTML from the teacher's words), hidden-family and points totals, custom questions of every
  type; `check/page.js` part L (`check/edits_page.js`), with a mocked `/api/items` (page.route): an edited stem on the screen,
  on the worksheet and its key; a hidden family absent from a new set and its points gone from the total; a custom question in
  its section, ✓ with its key and ✗ otherwise; "More questions"; a set saved before the edits keeping its composition; the
  address failing → the plain page; on a teacher copy the printed test and key with the edit, "Edited" and "Added".

## 8 Nov 2026 — approve, and Tests A and B (`approvals.js`, `teacher.js`)
Croix, of the edits layer: *"I don't want to edit the practice questions that generate, I just want to be able to approve or
disapprove and be able to tweak tests a and b. Otherwise, I don't need that massive setup in the cockpit. It was very messy in
there."* The ruling: **the generated questions are approved or disapproved, never reworded; a unit's test is two pinned forms,
A and B, that can be tweaked; both live on the unit's teacher copy, where the tests print. Nothing of it is on the cockpit
but two ways in.**
- **Gone:** a family's wording as a template, points per part, Hint 1, notes, his own questions, a lesson item's stem and key,
  the cockpit's Test questions section and its `?kedit=1` preview, the teacher bar's line about edits, the 2 Nov *Choose
  questions…* panel (now the editor's *On the test*), and the random units' *1–5 forms* buttons (make-ups stay under ⋯ → Print).
- **Approve questions** (the teacher bar): every **kind** of question of the practice test — a family, `ui.js` `famKey`, found
  over sets 1–240 — by section, each with a sample drawn as students see it (static: no box, no Check) and its answer, *Another
  example*, and **Approved | Disapproved** (`aria-pressed`, 44 px); a tab **Lesson sets** (a unit with a bank) does the same for
  every lesson item, by lesson. Every one is approved until he says otherwise. A press saves at once — `PUT
  /teacher/api/items/<course>/<unit>/approval/<family|bank>/<target>` `{approved}` — with a quiet *Saved* or *Couldn't save —
  try again* (the row goes back). A disapproved row dims and says it is left out of new sets.
- **Disapproved** means what 7 Nov's Hide meant: out of **new** practice sets, misses rounds and *Try a similar one* (`ui.js`
  `keepIt`, `similarOk`: where every kind of a place is disapproved there is no fresh one), out of new lesson sets (`bank.js`),
  and out of new random test forms; a set already saved on a device keeps its questions (`S.eh`; a lesson set's saved items).
  `approvals.js` reads `GET /api/items/<course>/<unit>` on the site — at most 1.5 s, the device's copy offline — and honours
  only `hidden: true`, from any answer or any copy a device kept on 7 Nov (`practice.edits.<unit>`): a wording or a question of
  his own from then is never used.
- **Tests A and B** (the teacher bar; *Edit test* where the paper has one form): the unit test's two forms, **pinned** and kept
  on the site — `GET`/`PUT /teacher/api/tests/<course>/<unit>`, both behind the teacher password — so the same test prints from
  any computer, today or as a make-up next week. A random unit (ruling 49) pins two sets on first use, from two different
  seeds, no disapproved kind (that place drawn again from another set; a place with no approved kind left off); a fixed unit
  (Forms A/B from `unit.py`) pins the build's paper. The editor shows a form as it prints (`ui.js` draws a random form with the
  make-ups' own builders), and under each question its key and **On the test** (unticked: off both forms, the test and the
  key; the rest renumber; the points and the score tracker follow — the tracker keeps its benchmarks), **New version** (random:
  the same place from another set, a key unlike this one and unlike the form's others, never a disapproved kind), **Edit**
  (random: in place on the paper — the words, each part's line, each choice and each typed key editable, the figures not; a
  graph or a choice's letter stays, and says so; saved as the kit's own markup, `span i b sup sub br` with a class and nothing
  else — fixed: the TeX of the words, each part's words and answer, each choice and which is right, the paper redrawn as it is
  typed; an answer changed drops that part's printed notes), **Undo** (back to the form's original) and per form **Start
  over** (asked once more). A pinned question whose kind has been disapproved since is flagged, with *New version*. Printing
  — from the bar (Form A | Form B · Print test · Test + key · Key only) or the editor — is the pinned, tweaked form; the key is
  drawn from the same questions and says how many were changed. The student's sheet never prints a set number.
- **Offline, or as a download:** the last copy kept on this browser (`teacher.tests.<course>.<unit>`), else the build's own, and
  one line: *Changes are only on this computer.* Back on the site, changes made offline go up when the site's copy has not
  changed since (otherwise the site's wins, and the bar says so). A pick kept on the browser on 2 Nov
  (`teacher.pick.<course>.<unit>`) moves up once.
- **The cockpit:** no section; each unit with a teacher copy has *Tests A·B* and *Approve* beside its links, to
  `…/practice/?open=tests` and `?open=approve` (a query: the page's `#` is its set and lesson router).
- **From the review (8 Nov 2026):** a question's ID is the ID alone — "U10·3", a lesson item's "U10·L1·7" (Approve questions
  adds "· high rigor" to a lesson item's row, which means something) — on the card, every printout, the editor and Approve
  questions; on paper it is on its own line at the top right, the points at the right of their line. The editor's and the
  panel's sticky bar is opaque in light and dark (`--ground`), so no question shows through it on a phone.
- **The student page carries only the filter.** The bar, the panels, their styles (`teacher.css`, added by `build.py` to a
  teacher build) and `window.PracticeKit` (what `ui.js` lends the teacher's tools to draw with) are on the teacher copy only.
- **Checked:** `check/page.js` part L (`check/approve_page.js`, a mocked `/api/items` and `/teacher/api/items`): a disapproved
  kind out of a new set and kept in a saved one, no fresh one of it, a two-kind place's fresh ones, a disapproved lesson item
  out of a new lesson set, 7 Nov's copy read for its hidden rows only, the address down; the panel's rows and its PUTs, a
  failed save; the student page with none of the teacher's tools. Part M (`check/tests_page.js`, teacher copies, a mocked
  `/teacher/api/tests`): pinned and sent up; the same forms after a reload; New version on one question and its key rows only;
  On the test renumbering with the points and the tracker; Edit (in place, and the fixed paper's TeX) on the printed words and
  key; Undo; Start over; a flagged kind; a hostile spec drawn clean; offline and back; `?open=tests`. `check/teacher_check.js`
  runs the paper's builders under Node, as before.

## 8 Nov 2026 — the FAST calculator (`calc.js`)
Croix, of the Desmos scientific calculator students get on the Florida FAST math test: *"if you can get it to load inside the
practices and practice tests that would be a dream come true."* Then, of Alden Bradford's TI-30Xa emulator: *"I would also like
this t130xa calculator embedded as well … it should be the same as the desmos."* The ruling: **every practice page and teacher
copy — the whole practice test, its sections and every lesson set — has a Calculator in its top bar, with the two calculators in
one panel. They are the kit's only outside requests, each made only when a student opens that calculator:**
- **FAST (Desmos):** `https://desmosforassessment.cambiumtds.com/TDSCalculator.html?mode=tds_dc_scirestricted`
- **TI-30Xa:** `https://aldenbradford.com/calculator_emulator/`

Until then the page holds the two addresses as text in `calc.js` and nothing else: no iframe, no link, no prefetch, so a student
who never opens a calculator makes no request at all (`page.js` F still fails any request off the page in every other flow).
- **The button** (`#bCalc`, written by `build.py` into the bar's buttons, before Pause and Finish): the bar's own quiet button, a
  calculator icon and the word on a wide screen, the icon alone on a phone, 44 px, `aria-expanded` and `aria-controls`; open, it
  has the ink's edge (nothing live about it, so never turquoise).
- **The panel:** a switch in its header, **FAST (Desmos) | TI-30Xa** (a radiogroup — the arrows move and choose); FAST is the
  first pick, and the last pick is remembered on the device (`practice.calc.pick`). Each calculator's iframe is made the first
  time it is picked — `referrerpolicy="no-referrer"`, `title="FAST calculator (Desmos scientific)"` or `"TI-30Xa calculator"`,
  its exact address — and after that closing only hides the panel and switching only hides the other one, so a student's work
  in either stays while the page is open. Each has its own natural size: the FAST one 360 × 560, as on the test; the TI-30Xa
  389 × 636 (the emulator's 315.6 × 600 picture 28 px into its page, with room for a scrollbar). In a short window the FAST one
  gets shorter (Desmos lays itself out again) and the TI-30Xa is drawn smaller, whole.
- **The header** holds the title, Close, the switch and an always-visible **Open in a new tab** (`target="_blank"`,
  `rel="noopener noreferrer"`) to the calculator shown. Whether either site lets itself be framed could not be checked from the
  build's sandbox, which cannot reach them: if one refuses, its frame shows the browser's error and the link is the way through.
  Offline (`navigator.onLine` false) one line beside the link says *The calculator needs the internet.*; a frame first opened
  offline loads again when the device is back online.
- **Wide screens:** a floating window, as the test's own calculator is — dragged by its header, docked at the right side at
  first, never over the top bar, its place remembered on the device (`practice.calc.pos`, from its nearer side) and kept on the
  screen when the window changes size. It floats over the page, as the test's does; a student drags it where it helps.
- **Phones** (≤ 600 px wide or ≤ 460 px tall): a full-height sheet with Close; the page behind it is inert while it is open.
- **Keyboard:** opening puts focus on the panel's header; Tab goes Close → the switch → the link → the calculator; Escape (in the
  panel, or on the button) closes it and gives focus back to the button. The panel and the button are `translate="no"`.
- **Never printed:** the button and the panel are hidden in `@media print` and never show over a print preview or the teacher's
  panels; the worksheets, keys and tests print exactly as before.
- **Embedded, never copied:** each calculator is its author's page in a frame, by its address. No file of either — not the
  emulator's code (GPL-3.0, github.com/AldenMB/calculator_emulator) nor its photo of the calculator, which is Texas Instruments'
  — is in Windmill or a course repository. Under the TI-30Xa the panel credits it: *TI-30Xa emulator by Alden Bradford*,
  linking to its page.
- **The look:** the ⋯ menu's surface (true dark in dark: a neutral near-black with white words, never navy), the Appearance
  row's switch, teal ink for the links, DM Sans as the bar. What the calculators draw inside their frames is their own.
- **Checked:** `check/page.js` part N (`check/calc_page.js`), both addresses answered by small stand-in pages (`page.route`): no
  iframe and no request to either host before it is picked, and nothing in the built page that could fetch one; the button
  (44 px, the word on a wide screen, the icon alone on a phone); the FAST frame's exact address, attributes and 360 × 560, asked
  once with no Referer, docked at the right under the bar; focus on the header; Tab order; Escape back to the button; the same
  frame again with what was typed in it; the TI-30Xa made only when picked, with its credit, both frames kept through switching
  and neither loaded again, the new-tab link following the calculator shown, the pick after a reload; dragging (never over the
  bar, remembered across closing and a reload, kept inside a smaller window); the phone's sheet at 390 (whole screen, the page
  inert, Close 44 px back to the button); the offline line beside the link; print (neither prints, a worksheet's pages the same
  with the panel open, nothing over a print preview); true dark; a lesson set. On student pages and teacher copies alike.

## 8 Nov 2026 — the keypad, even and tidy (`ui.js`, `keyset.js`)
Croix, of an A7 Unit 6 lesson set on his phone: *"Can you fix the symbols across everything so that they are even looking not
like stretching across the screen. It's sloppy."* His screenshot: a lesson item's fourteen keys (− / a/b ^ ( ) π × √ = < ≤ ≥ >)
in a row of twelve and a row of two, edge to edge, on a perimeter question. The ruling, for every keypad (practice tests and
lesson sets, student pages and teacher copies):
- **Even rows, never ragged.** `ui.js` puts the keys in as few rows as fit between the box's left edge and its row's right edge,
  and splits them evenly, the longer rows first (14 keys at 390 px in two rows are 7 + 7; 9 are 5 + 4); one row whenever they
  fit, as on a tablet. Each key keeps its fixed size — 44 × 44, a longer label ("× 10^") its own width — and is never stretched
  to fill the width; the block starts where the box starts. A turned phone lays the keys out again.
- **Grouped, in one order:** operations first (− × / a/b ^ √ π), then grouping and relations (( ) = < ≤ ≥ >), 6 px between keys
  and 14 px where the two groups meet in a row. A unit's own key the kit does not know goes at the end of the operations.
- **Only the unit's keys.** A lesson item's box shows the keys any answer of its unit can use: the union over the unit's
  practice-test families (their keys as a student types them, `Unit.keyText`, sets 1–600) and its lesson items from Cadence
  (each typed part's key), worked out by `keyset.js` when the page is built and inlined as `window.KIT_KEYSET`. Decided per
  unit, never per question: a key shown only when a question's answer needs it would give the answer away. A symbol brings its
  family (any of < ≤ ≥ > all four, a fraction bar the fraction template, either parenthesis both), and a key a unit's answers
  might need is kept. So A7 Unit 6's lesson items have √ alone, and M7 Unit 10's keep − / a/b ( ) = < ≤ ≥ >. The practice
  test's own boxes keep the unit's own keys for each kind of answer (16 Oct 2026, "Keypad by kind"), in the new order and rows,
  less any that no answer of the unit uses (`ui.js`: M7 Unit 4's × and /, which none of its answers has; "× 10^" counts as × and
  ^, "xⁿ" as a power; the decimal point is in `KIT_KEYSET` for this, though it is no lesson item's key; a key the list does not
  speak of is kept).
- **Unchanged:** the keypad only on a touch screen, above the box, never covering it or its Check row and never moving it;
  44 px keys that insert at the caret and are not tab stops; the fraction template; the keys' own look, light and dark.
- **Checked:** `check/page.js` part O (`check/keys_page.js`): the unit's keys worked out again on their own (sets 1–1500 and every
  lesson item) and equal to the page's and to a lesson item's keypad; no practice-test key that no answer uses; < ≤ ≥ > wherever
  the unit has an inequality; at 320, 360, 390, 412 and 768 px on a lesson item's box and the practice test's boxes, rows of
  even length, as few as fit, one when they fit, starting at the box and ending inside its row, every key 44 × 44 and the same
  width at every width, the order and the gaps, no sideways scroll; and a lesson item's key typed with its symbols tapped from
  the keypad, ✓ on the first try.
  `check/bank.js` F: the unit's keys on a lesson item, even rows at 390, a key at the caret, and an inequality's sign tapped.

## Files
| Kit (`practice/kit/`) | |
|---|---|
| `core.js` | `slot(unit, seed, slotName)`, `draw(unit, seed, slot, build, ok)`, `fnv1a`, `hint.mul/div/add/sub/sq` (one smaller step of arithmetic, never the final answer), and `Ans` (the answer normaliser: `parse`, `canon`, `form`, `equiv`) |
| `nline.js` | the number-line graph a student builds (kind `nline`): the line, the widget, judging, paper; pure, so a unit's Node checks use it |
| `ui.js` | the whole page: sets, scopes, the coach card, Hint, Show me how, Try another, scoring, the clock, saved state, focus, keypad |
| `kit.css` | the sheet: light and dark mode (the site's palette), 44px tap targets, print |
| `vendor/fonts/` | Lexend, DM Sans, DM Serif Display as small woff2 (SIL OFL), inlined by `build.py`; `make_fonts.py` cuts them |
| `build.py` | `python3 kit/build.py <unit>` writes `<file>` (the claude.ai artifact body) and `preview.html` plus `<download>` (a complete page for Google Sites or Netlify Drop). It refuses to build unless the checks passed on these exact sources. |
| `check/run.py` | `python3 kit/check/run.py <unit>`: the unit's own checks, then the lock, then the browser checks. If all pass it writes `CHECKED` and builds. |
| `check/hints.js` | the kit's own arithmetic hints (`core.js` `hint.div`, and `hint.mul` by 0.5) never state their answer: 400,000 divisions read for "= the answer" (25 Oct 2026 — "45 ÷ 3: Start with 3 × 10 = 30; 45 − 30 = 15 is left", and 15 is the answer). `run.py` runs it first |
| `check/norm.js` | the answer normaliser's cases (≥ 60; the ones that must not be equivalent too). `run.py` runs it second |
| `check/lock.js` | set stability (see above) |
| `check/variety.js` | the variety floor (ruling 49): over set numbers 1–20000 every question part comes in at least `floor` versions (unit.json `"variety"`; default 100; `--all` counts all 99,999; `--list` prints every part). A version is the question's numbers and symbols as the page shows them, words left out: a new name, object or letter, or the same choices shuffled, is not a new version. A part that cannot be wider is allowed there, with its reason |
| `approvals.js` | which kinds of question and lesson items are disapproved, from the site (8 Nov 2026, above); was 7 Nov's `edits.js` |
| `calc.js` | the Calculator in the top bar: the FAST (Desmos) and TI-30Xa panel, each calculator's frame made only when a student picks it (8 Nov 2026, above) |
| `keyset.js` | a unit's keys — the keypad keys any of its answers can use — for its lesson items, run by `build.py` under Node (8 Nov 2026, above) |
| `teacher.js`, `teacher.css` | the teacher copy: the bar, the real test's paper, Tests A and B, Approve questions (8 Nov 2026, above); `teacher.css` is in teacher builds only |
| `check/approve_page.js`, `check/tests_page.js` | page.js parts L (approvals) and M (Tests A and B), against a mocked site |
| `check/calc_page.js`, `check/keys_page.js` | page.js parts N (the calculators, against stand-ins for both addresses) and O (the keypad: the unit's keys, even rows at five widths, typing through it) |
| `bank.js` | a lesson's practice from Cadence: the bank's practice choices, sets, items, judging and help (above) |
| `check/bank.js` | a unit's lesson bank: schema, map against the plan, every item drawn light and dark, 30 answered through the page, the keypad's = < ≤ ≥ > on a touch screen ("c<-16.5" with its sign tapped, ✓) |
| `check/page.js` | **in a real browser** (Playwright): every key typed on 3 sets scores N / N; then the flows: Cancel, re-checking the same answer, focus after Hint / Show me how / Try another / Next / Close, Show this step, Finish marking typed-but-unchecked answers, test mode, tap targets, the keypad not being a tab stop, bad links |

| A unit (`practice/u4/`, …) | |
|---|---|
| `unit.json` | title, the artifact file name, the download name, CSS, scripts (in load order, `unit.js` last), and the check commands |
| `engine.js` | exact arithmetic, the answer reader, `generate(seed)`. Each question is drawn with `KIT.draw(UNIT_ID, seed, 'qN', build, ok)`, where ok checks the test forms and the clean rule. |
| `coach.js` | per kind of question: mistake models, rule, worked solution, walkthrough steps; `feedback(part, typed, ctx)`; `clean(item)` registered with `E.setClean` |
| pictures | A7 `visual.js` (counting tiles, the ladder, the decimal hop); M7 `fig.js` (figures drawn to scale; every label checked against its segment) |
| `unit.js` | **the unit interface** (below) |
| checks | the unit's own exhaustive checks plus an independent sympy oracle (A7: test_engine, coach_check, steps_check, verify, verify_coach; M7: m7_check, verify_m7) |
| `sets.lock.json` | written by `check/lock.js` |

## The unit interface (`window.Unit`, `module.exports` under Node)
```
id, contentVersion, legacy: [old storage prefixes, migrated once],
title, eyebrow, h1, notes: [html],
keypad: [{label, say, ins(kind) → text}],
generate(seed) → {sections: [{title, items}]}
   item: {type: 'parts' | 'solo' | 'mc' | 'multi', stem, fig?, parts | part | opts+correct}
   part: {label, kind ('mc' for a lettered multiple choice), fam, prm, …}
key(partOrItem) → string                      // what makes two questions the same
view: {stem(item), figure(item), line(part), pre(part), unit(part), placeholder(part), opt(x, k), why?(x, k), key(part), form?(part),
       start(x, type), ex(x, ast, type), got(step), picture(x, type), pretty(text, kind)}
judge: {text(part, typed, ctx), mc(item, k), multi(item, ks, tries)} → {v: right|form|wrong|unread|blank, what: [html], rule, step}
   ctx = {prev: the student's part (a) answer, prevPart, prevOk (is part (a) right yet), extra (a fresh "Try another", with no
          part (a) of its own), aShown, mode}
   part.imode: an inputmode for the phone's keyboard ('decimal' for a box that never needs a space, a slash or a minus)
rungs?(x, type, ctx) → {notice, first, steps}   // the help ladder's three rungs, any of them (else derived)
solution(x, type, ctx) → [{say, ex}]          // every ex equals the answer (checked); ctx as judge's — a part (b) can keep part (a)'s
                                                // number out of its lines until part (a) is right
walk(x, type, ctx) → steps: {type: 'choice', ask, opts: [{label, ok, why}], then?, pic} | {type: 'num', ask, ans, hint, then?}
readNum(text) → rational | null, numOk(step, value) → bool
keyText(part) → what a student would type (for the checks)
```

## Making the next unit (the skill "practice-test-from-unit-test" walks through it)
1. Read the unit's test spec (`build/uN/unit.py`): every question, its points, and the rulings. Transfer items stay off the
   practice page. **The test's own numbers never go on the page** (24 Oct 2026): a unit with fixed forms keeps them in
   `test_forms.js`, which only a check may load (and then only as a count — a check must generate what the page generates);
   `build.py` refuses a page that holds that file's name or a line of its data. Since ruling 49 the test is a random set of
   the page, so a new unit has no forms to keep off it.
2. Copy the closest unit folder. Write each question kind as a generator plus its family: models, rule, solution and walk.
3. Fill in `unit.json` and `unit.js`. Set `contentVersion: 1`.
4. Write the unit's checks to the same standard, plus the sympy oracle.
5. Run `python3 practice/kit/check/run.py practice/uN` until it passes. **Since ruling 49 (22 Oct 2026) the unit test is a
   random set of this page**, so every question part needs many versions: the variety check fails a part with fewer than
   100 over 20,000 set numbers. Widen its numbers inside the benchmark's limits — the same question, more versions.
6. Run the Apple review (four reviewers), fix what it finds, and run again.
7. Publish the artifact and send the download.
8. **No second language on a new unit** (Croix, 24 Oct 2026: "Drop the Portuguese. You don't have to change it retroactively
   but you don't need it going forward."): no `"second"` in `unit.json`, no `pt.js`. A7 Units 3–4 and M7 Unit 4 keep theirs.


## A second language under the English (16 Oct 2026; not for new units since 24 Oct)
Croix: *"a Portuguese version of the question and explanation for my kids from Brazil … toggle it on and off."* He chose
everything on the page, with both languages stacked (the English stays; the translation sits under each line).

- **Turn it on for a unit:** add `"second": "pt-BR"` to `unit.json`, add the unit's table (`pt.js`) to its scripts, and give
  `Unit.second = {code, name, table, names}`. The kit adds a **Português** button by the menus; the choice is remembered on the device.
- **Off is exactly the English page** — nothing is added. **On**, `bilingual.js` watches the page and puts the translation
  under every block of words (questions, choices, feedback, hints, Show me how, picture captions, buttons, scores, results).
- **The math cannot change:** every number, math span, figure and name is lifted out of the English before the lookup and put
  back into the Portuguese template unchanged (`#`, `§`, `@`; `#{2}` reorders). A sentence the table does not know shows
  nothing (never a guess).
- **Tables:** `lang/pt-BR.js` has the page's own words; the unit's `pt.js` has its questions and coaching. Keys are the
  English with `#` for numbers; "That is what you get if you …" is looked up as its verb phrase (`vp:…`).
- **Checks:** `check/bi.js` (called from the unit's `bi_check.js`): every sentence the unit produces is translated, the same
  numbers appear, the "a = b" statements are the same and true, no English words left, every table entry uses exactly its
  English's pieces. `check/page.js` part C: off adds nothing and on → off restores the English to the letter; through every flow
  no sentence is missing, no duplicate ids, the numbers under each line match; typing still scores N / N with it on.
- Decimals stay with a point (as on the test, and as the answer box reads them); "48 e 18" is read like "48 and 18".

## Print (16 Oct 2026)
Croix: *"Can I get the ability to print?"* A **Print** button by the menus offers: **Worksheet** (this set on paper: name and date
lines, every question with its figure, an answer blank or choice circles, room to work), **Worksheet + answer key** (the key
on a new page — the same key the page marks with), and **My results** (score, time, each section, and every part: the
student's answer, how it went, the right answer; in "Like the real test" only after Finish). A preview opens first with its
own Print button; on paper only the printout shows, dark on white. With Português on, the printout has it too.
Checked by `check/page.js` part D (same stems as the screen, a blank or choices for every part, the key equals what the page
marks right, results match, only the printout on paper, Close restores the page, Portuguese covered).

## Small kit additions from the A7 Unit 4 review (16 Oct 2026)
- **Keypad by kind:** a keypad entry may carry `kinds: ['sci', 'num', …]`; a box shows only the keys for its part's kind, and
  no keypad at all when none apply (a "how many significant digits" box gets none). Since 7 Nov 2026 only on a touch screen.
- **Hint number boxes** are plain text boxes: a phone's decimal pad has no minus and no slash, and many Hint steps need them.
- **Print:** a unit may give `notesPrint` (paper is not a keyboard) and `view.blank(part)` (e.g. "___ × 10^__" for
  scientific-notation answers).
- **No line about the page (21 Oct 2026).** Croix: *"eliminate the little texts that you do in the menu like (Same kinds of
  questions as the unit test, new numbers every set.)"* Under the title there is only the unit's `notes` — how to write an
  answer ("Use 3.14 for π…") — and nothing at all when it has none; the old `intro` is not read. He added *"And this line
  'Same kinds of questions as the unit test, new numbers every set.'"*, so the menus' asides went too: the make-up prompt is
  just "How many different forms?", and the practice menu's "My misses, with new numbers" has no "(none yet)" (it still
  shows how many when there are some).

## Make-up tests (18 Oct 2026)
Croix: *"I want the print function to be able to just print tests or make ups directly from here… I'll need it to print the
answer key too."* Print → **Make-up tests** → how many forms (1–5). Each form is a different set of the whole unit (the
current set is Form A), headed "<unit> Test" / "Make-up · Form A · 18 points" with a name and date line; every form's answer
key follows on its own page, "Answer key — Form A" over "Set 4821 · Whole test", so the keys stay with the teacher (the set
number is on the key only since 25 Oct — see "The printed test" below). The forms are drawn with
`withSet()` (the page's own data drawn from another set, then put back) and the usual worksheet and key builders, so a form
is exactly what a student would see on screen for that set number — a student can also be sent to `#set-4821` to practise
the same form. page.js part D checks three forms: three different sets, one name line each, every key row recomputed from
that form's set, and the page unchanged afterwards.

**Teacher copy only (21 Oct 2026).** Croix: *"I don't want the students to be able to print the make up tests."* The option
shows only on a teacher build (the page with `TEACHER_TEST` in it); a student page's Print menu is Worksheet, Worksheet +
answer key and My results, and a make-up request there prints nothing. page.js part D checks both: no make-up tests on a
student page (in the menu or forged), the three-form check on the teacher copy.

## Lexend and the math in TeX (17–18 Oct 2026)
Croix: *"Can you make it in the lexend font?"* then *"Make the math in latex."* The page is set in Lexend (ruling 46;
no italics anywhere — Lexend has none; variables upright). The math is drawn by KaTeX: `tex.js` gives every `<span class="m">`
a shadow root, converts the kit's math HTML inside it (fractions `.fr/.nu/.de`, radicals `.rad/.rc/.ri`, `<sup>`, `<i>`
variables, the symbols × · ÷ − ≈ π …) to a TeX string with `toTex()`, and renders it there. **The HTML is not changed** —
checks, keys, the Português engine and screen readers read the same markup as before; only the picture changes. KaTeX
(0.16.11) is **inlined by the build** from `vendor/katex/` with eight woff2 faces as data URIs (~+450 KB; claude.ai artifacts and
filtered school networks block CDNs); without it (an old browser, a string KaTeX refuses) the span shows the kit's own
HTML through a `<slot>` — the 17 Oct look. page.js part E (no network needed) requires: every
math span on the page drawn by KaTeX, none fallen back; and over 60 sets every stem, line, option, key and worked line
renders with `throwOnError` and its TeX keeps the HTML's digits and letters in order (`Kit.Tex.skeleton`). Rule of thumb
for unit authors: write math as the kit's HTML inside `M()`; TeX comes for free. Text in a math span becomes `\text{…}`;
`<i>` is a variable; parentheses grow around a fraction or root.

## The teacher copy (19 Oct 2026)
Croix: *"I want to be able to print the test as well, not just make up tests"* — a **separate teacher page** per unit (the key
must never sit in the student page's source). A `teacher/` folder beside the unit holds `unit.json` (the student scripts by
`../` path, then `test.js` and `../../kit/teacher.js`), a two-line `gen_test.py` calling kit `teacher_gen.py` (the unit's
assessment from the course's `build/<unit>/unit.py` → `test.js`: every form, stems/answers in TeX, figures as SVG from the
paper's shape specs; `--check` re-runs every `check` tuple under sympy and refuses a stale test.js), and a `unit.js` shim for
Node. `kit/teacher.js` adds the bar (Form A/B, Test, Test + key, Key only) and prints the paper with the kit's print classes:
the two-period line when the test runs two periods, "Show your work…" (+ the π line), follow-through note, work space per
part (no answer line — house rule 2, as the paper, 25 Oct 2026), the key with notes, transfer flags and the score tracker.
**The test's length (25 Oct 2026):** `teacher_gen.py` reads it as the build kit's paper does — the plan's test days for the
unit (`<build>/assets/windmill/spine.js`), else the course's `EXAM_PERIODS` — and writes `two_day` empty for a one-period
test (ruling 51: every A7 test is one period), so nothing on the paper speaks of its length — no "one class period"
(Croix, 25 Oct 2026: "I don't need that text at all") and no continue-tomorrow line.
`check/teacher_check.js` is Rule 0 for the printout (the period line both ways, no answer line). The bar and the paper are `translate="no"`.
The bar tells the teacher that students use the student page, on the class website or Google Sites; on the website a
teacher copy sits behind the teacher password (`/teacher/<course>/unit-N/practice/`).
Never for Google Sites or anywhere a student can open it (22 Oct 2026: the website keeps it behind the teacher
password). A unit with one `sections` (no Form A/B) prints as
"the test". A check's variables (a, b, m, n, x, y, …) are sympy symbols declared positive, exactly as the build kit's gate
declares them, so a check passes in `teacher_gen.py` exactly when it passes in the build (21 Oct 2026, for A7 Unit 3's
variable bases — the first teacher copy of a test with algebra in it).

## The printed test: a random set on paper (25 Oct 2026)
*Since 8 Nov 2026 a random unit's test is its two pinned forms, Tests A and B (above), not 1–5 fresh forms; what follows is
still the shape of every printed form.*
Since ruling 49 the unit test is the teacher copy's bar → *1–5 forms*, each form a random set of the page. Building A7 Unit 6
showed that print was the make-up worksheet with a test's name on it, so Croix said *"Fix it. I give you permission"* to
this list: the student's sheet printed "Set N", and the student page opens any set with its worked answers (`#set-N`), so
the number on a test paper was its answer key; and it had no points, no follow-through line, no score tracker, and
"Answer:" labels (house rule 2: no answer lines, leave work space). Now every printed form — the ruling-49 test and the
make-ups — has the paper's shape (`ui.js` `testFormHtml`, `testKeyHtml`, `pqTest`):
- **The student's sheet:** "<unit> Test" (the title's "Practice Test" made "Test") over "Test · Form A · 18 points", name and
  date; the teacher copy's notes ("Show your work…", the π line) then the unit's print notes, each line once (M7 Unit 10's
  `notesPrint` already carries the scoring lines and, on a teacher page, the two-period line); each section with its points;
  the follow-through line under a section that has parts (`TEACHER_TEST.follow_through_student`), not again in the notes;
  "1 pt" on every part; work space under every typed part, choice boxes for a choice; **no set number anywhere and no
  answer line.**
- **The key, on its own page:** "Answer key — Form A", then "Set 4821 · Whole test" (the only place the number prints), the
  key's grading note (`follow_through_key`, where the spec has one), a row per part, and the **score tracker** — by benchmark when the spec's
  `tracker` agrees with the page's points section by section (`tracker_order`), by section otherwise; questions, possible,
  earned, the total. The tracker never splits across a page.
`check/page.js` part D checks the shape on the make-ups and on the ruling-49 test: no "Set N" on a student sheet, no answer
line, no line printed twice, a point label per part, section points and the head's points equal to the parts, the
tracker's total equal to the parts; on the make-ups (the same builder) every key row is recomputed from its form's set.
The same commit fixed `page.js` reading "&lt;" in a choice as four characters (its text is now decoded the way a browser
shows it).
