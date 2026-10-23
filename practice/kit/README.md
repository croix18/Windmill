# Practice-test kit

This is the shared template for Croix's student practice-test pages. One unit test turns into one practice page. Every unit
uses the same page, the same rules and the same checks. The A7 Unit 3 and M7 Unit 4 pages are built on it, and so is every
unit after them.

The design comes from Croix (10–15 Oct 2026). The Apple review (15 Oct) changed it in places, marked [R1-n] / [R2-Nn] / [J-n] / [W-n]
in the code; the four reports are in the Windmill HANDOFF.

## What a student gets
- **A new set of numbers every time.** The questions are the same kinds as the unit test, in the same order, with the same
  points. `#set-4821` in the link always opens set 4821, so a teacher can say "everyone do set 4821".
  - No question is ever one from the real test forms, including the same question written backwards or with its factors
    swapped.
  - **A set never changes under a student.** Each question slot draws from its own random stream (`core.js`: `slot`, `draw`),
    and `check/lock.js` holds the questions of sets 1–300. If any set changes, the unit's `contentVersion` must be bumped.
    Saved answers on a changed set are then cleared, with a notice.
- **Two modes:** *Check as I go*, or *Like the real test*. In test mode nothing is marked until Finish. The only thing said
  before then is "Can't read this yet".
- **The coach.** It names the exact mistake ("That is what you get if you…"), gives a *Next time* rule, and says *Almost* when
  the value is right but the form isn't.
  - **The clean rule:** no modelled mistake, printed number or other part's answer may equal an answer. The generator
    draws such numbers again, so a wrong method is never marked right.
- **Hint:** one button opens a step-by-step walkthrough ("Hint · step 2 of 5").
  - Tap-a-choice steps give a reason for every wrong choice.
  - Type-a-number steps give a smaller step after a miss, and after two misses offer *Show this step*.
  - The picture appears at the step it explains. The walkthrough ends with the answer, as Croix chose.
- **After an answer:**
  - **Show me how** (after a try): every step, the step where the student's answer went off, and "See why it works".
  - **Try another like this:** the same kind of question with new numbers, never a repeat. Two right in a row on your
    own clears it from misses.
  - **Next ↓** after a right answer. Focus never jumps by itself.
- **Scoring:** right on the first check is a point, help or not. "With help" is counted separately: "9 right first try
  (2 with help) · 12 of 36 done". Each section counts up ("4 / 9", then "9 / 9 ✓").
- **Practice menu:** whole test, one part (two rounds with new numbers), or my misses (new numbers; one round if there
  are more than 8).
- **The end:**
  - "Every one on the first try." when it's perfect.
  - Otherwise, jump links to the parts not right yet, "Practice my misses", and the parts under 80%.
  - "Last time: … Today: … (+6)".
- **The clock:** it starts with the first answer and pauses when the page is hidden (Resume brings it back).
- **Progress:** each device keeps its last 25 sets in its own browser storage. Nothing is sent anywhere.
- **Made on purpose to be absent:** no Start button, no typing-tip box, no footer, no "Help me solve this".

## Files
| Kit (`practice/kit/`) | |
|---|---|
| `core.js` | `slot(unit, seed, slotName)`, `draw(unit, seed, slot, build, ok)`, `fnv1a`, and `hint.mul/div/add/sub/sq` (one smaller step of arithmetic, never the final answer) |
| `ui.js` | the whole page: sets, scopes, the coach card, Hint, Show me how, Try another, scoring, the clock, saved state, focus, keypad |
| `kit.css` | the sheet: light and dark mode, 44px tap targets, print |
| `build.py` | `python3 kit/build.py <unit>` writes `<file>` (the claude.ai artifact body) and `preview.html` plus `<download>` (a complete page for Google Sites or Netlify Drop). It refuses to build unless the checks passed on these exact sources. |
| `check/run.py` | `python3 kit/check/run.py <unit>`: the unit's own checks, then the lock, then the browser checks. If all pass it writes `CHECKED` and builds. |
| `check/lock.js` | set stability (see above) |
| `check/variety.js` | the variety floor (ruling 49): over set numbers 1–20000 every question part comes in at least `floor` versions (unit.json `"variety"`; default 100; `--all` counts all 99,999; `--list` prints every part). A version is the question's numbers and symbols as the page shows them, words left out: a new name, object or letter, or the same choices shuffled, is not a new version. A part that cannot be wider is allowed there, with its reason |
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
view: {stem(item), figure(item), line(part), pre(part), unit(part), placeholder(part), opt(x, k), key(part),
       start(x, type), ex(x, ast, type), got(step), picture(x, type), pretty(text, kind)}
judge: {text(part, typed, ctx), mc(item, k), multi(item, ks, tries)} → {v: right|form|wrong|unread|blank, what: [html], rule, step}
   ctx = {prev: the student's part (a) answer, prevPart, aShown}
solution(x, type) → [{say, ex}]               // every ex equals the answer (checked)
walk(x, type) → steps: {type: 'choice', ask, opts: [{label, ok, why}], then?, pic} | {type: 'num', ask, ans, hint, then?}
readNum(text) → rational | null, numOk(step, value) → bool
keyText(part) → what a student would type (for the checks)
```

## Making the next unit (the skill "practice-test-from-unit-test" walks through it)
1. Read the unit's test spec (`build/uN/unit.py`): every question, its points, its numbers on Form A, Form B and the
   paper practice form, and the rulings. Transfer items stay off the practice page.
2. Copy the closest unit folder. Write each question kind as a generator plus its family: models, rule, solution and walk.
3. Fill in `unit.json` and `unit.js`. Set `contentVersion: 1`.
4. Write the unit's checks to the same standard, plus the sympy oracle.
5. Run `python3 practice/kit/check/run.py practice/uN` until it passes. **Since ruling 49 (22 Oct 2026) the unit test is a
   random set of this page**, so every question part needs many versions: the variety check fails a part with fewer than
   100 over 20,000 set numbers. Widen its numbers inside the benchmark's limits — the same question, more versions.
6. Run the Apple review (four reviewers), fix what it finds, and run again.
7. Publish the artifact and send the download.


## A second language under the English (16 Oct 2026)
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
  no keypad at all when none apply (a "how many significant digits" box gets none).
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
current set is Form A), headed "<unit> Test" / "Make-up · Form A · Set 4821" with a name and date line; every form's answer
key follows on its own page, "Answer key — Form A · Set 4821", so the keys stay with the teacher. The forms are drawn with
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
two-period line, "Show your work…" (+ the π line), follow-through note, work space per part, the key with notes, transfer
flags and the score tracker. `check/teacher_check.js` is Rule 0 for the printout. The bar and the paper are `translate="no"`.
Never for Google Sites; each teacher page is its own private artifact. A unit with one `sections` (no Form A/B) prints as
"the test". A check's variables (a, b, m, n, x, y, …) are sympy symbols declared positive, exactly as the build kit's gate
declares them, so a check passes in `teacher_gen.py` exactly when it passes in the build (21 Oct 2026, for A7 Unit 3's
variable bases — the first teacher copy of a test with algebra in it).
