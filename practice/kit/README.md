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
title, eyebrow, h1, intro, notes: [html],
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
5. Run `python3 practice/kit/check/run.py practice/uN` until it passes.
6. Run the Apple review (four reviewers), fix what it finds, and run again.
7. Publish the artifact and send the download.
