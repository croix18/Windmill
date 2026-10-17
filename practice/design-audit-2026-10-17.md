# Design audit of the three practice pages, 17 Oct 2026

Croix: *"run an audit on them… Just look at the design elements and make sure they are looking clean and really good and
kid friendly."* Scope: looks only, not the math (the math suites were re-run after, all passed).

Method: Playwright shot every page (A7 U4, A7 U3, M7 U4) at phone (390 px) and desktop (1280 px) in eight states — start,
a wrong answer checked, the Hint, Show me how, Português (M7), the whole sheet, the results card, the print preview — 44
screenshots in all (`scratchpad/design/`). A design-reviewer subagent read all 44 and the kit CSS; I confirmed each finding
on the shots before fixing, then reshot.

## Fixed (kit `kit.css` / `ui.js` / `bilingual.js`, tagged `[D-n]`; A7 U4 `engine.js` for D-1)
- **D-1** A7 U4: a scientific-notation number could break across lines on a phone ("1.9 ×" / "10⁷") — `sciH` wraps each
  number in `.nw`. (The checker's plant "a wrong worked line" edited the first character of the line, now a `<`; it edits the
  first digit instead — 14/14 still caught.)
- **D-2/3** Keypad keys were a fixed 44 px: "× 10^" overflowed its key, and U3's six keys wrapped to an orphan ")" on a phone —
  keys size to their label (min 42 px, 5 px gap).
- **D-4** The control rows rearranged themselves after the first Check (flex wrap): now a grid — mode row, then scope + tools
  (Print and the Português toggle share a `.tools` group so they move together). On a phone with the toggle, the tools take
  their own row; A7 (Print only) keeps Print beside the scope.
- **D-5** M7: "Corrigir na hora" was purple on the dark-blue pressed mode button — unreadable; it inherits the button colour.
- **D-6** M7: "See why it worksVeja por que funciona" ran together — the translation wraps under.
- **D-7** A radio circle sat on the numerator and the letter on the denominator of a fraction choice — both centre on it.
- **D-8** The first Hint stood alone on a row under every part (34 rows on A7 U4) — before any try it sits beside Check
  (`.hslot`); after a try the Hint / Show me how / Try another row is as before. Hidden in print and in test mode.
- **D-10** Results: the "Not right yet" chips zig-zagged — the label gets its own line on a phone and chips share a min width.
- **D-11** M7 phone bar in Português was four lines tall — the score's translation is hidden on a phone; no translation under 12 px.
- Nits: ANSWER tag + value on one line in Show me how; a steadier Check column (unit label min width); the print preview's
  bar lines up with the sheet; on a phone the help buttons share the row evenly.

## Looked at and left
- "Practice my misses (1)" beside 34 "Not right yet" chips: the chips are everything not yet right (incl. untried), the count is
  tried-and-missed. Both are true; a wording change is Croix's call.
- No Finish at the foot of the sheet (the sticky bar has it). Q4/Q16 on A7 U4 have no Hint (by design).
- The reviewer's note on the "1 pt" labels crowding phone stems: kept — the points are part of looking like the test.

## What already looked good (reviewer)
Calm test-sheet hierarchy; consistent feedback stack (Not yet → why → Next time rule → help); one-step-at-a-time Hint
panels with big buttons; crisp figures; clean math typography; restrained colour; clean print output; clear results card.
