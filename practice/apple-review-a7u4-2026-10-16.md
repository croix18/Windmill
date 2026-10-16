# The Apple review of the A7 Unit 4 practice page, 16 Oct 2026

Four reviewers (subagents) on the first build: (1) engineer audit, (2) a second engineer checking it and hunting further,
(3) a Jobs lens, (4) a Wozniak lens. No reviewer found a wrong answer key (review 2 ran an independent Python oracle,
88,000 checks over sets 1–2000, 0 failures). What they found, and what was done:

## Math in the words (fixed, each with a check or pin)
- Hint steps echoed a typed decimal as a fraction (8.3 → "83/10") — `view.got` shows decimals.
- A Q11 Hint reason spoke of "the zero after the decimal point in 2.5" (no zero there; 1,248/3000 sets) — reasons built from the digits.
- "(170,000 could be read with fewer significant digits)" was false every time it showed — now only when the typed number shows fewer.
- Every Q9b Hint called a 2-digit rounding "the counting rule" (both masses have 3) — reworded.
- Q6 (the stand-in) kept 3–4 significant digits from 2-digit measurements, so the unit's own rounding was marked wrong — the
  factors are now drawn so the exact product has 2 significant digits (6.5 × 4.0 = 26, as on the review).
- A Q11 distractor said "the power was not raised" when it was two powers off — fixed.
- The Q6 Hint said dividing "would find the amount in ONE second, which you already have" (false) — reworded.
- "This is the step where your answer went off" pointed at the wrong step in five families — corrected.

## Fairness (fixed)
- A readable wrong answer (1/3, 2/3 x 10^5, 9.0/139) crashed into "can't read" — dead code removed; fuzz now covers it.
- `((10^400)^400)^400` froze the tab; "5mmmm…m?" took hours (regex backtracking) — guarded power, `(?![a-z])` in the unit pattern;
  the checks now time every odd input (≤ 250 ms).
- 180.0 / 0.05920 (a different digit count, written out) got Almost — now wrong, as the decision says.
- 8.3(10^6) and "8.3 x 10^6." cost the point; "2.1 x 10-4" was marked wrong — accepted / "Put ^ before the exponent".
- "$" inside the expression, "km/hr", "USD", "cost = …", "≈ …" now read; a rounded decimal for a fraction answer gets "Close — give the exact fraction".
- Q14a accepted "1825.05 + 40" — the expression must show the rate and the area; the commonest slip (no fee) is now a named mistake.
- Q8 never had an answer with a significant end zero (the test's 7.0 × 10¹) — about 1 speed in 4 is now exact like that.
- Q17 roots went to √1681 — now only roots the unit teaches (to 25).

## Patterns a kid could game (fixed)
- The right "explain the mistake" choice was always the longest (Q3, Q5, Q10, Q17, 300/300) — every choice now has the same
  shape (value + reason, or verdict + rule + value); new real distractors with as many digits as the key.
- The right Hint button was on top 95% of the time, often the only one with a reason — every Hint choice is shuffled (fixed per
  question), and labels are plain ("Yes" / "No").
- The select-alls always had the same two traps — now 4 true of 5–6 true forms and 2 false of 3 false forms, drawn per set.

## Product (fixed)
- "Almost — not finished" no longer does the carry for the student: "14.3 is 10 or more… move the point — then what happens to the exponent?"
- The Q8–Q11 Hints open with the unit's real question: multiplying/dividing or adding/subtracting → which rule.
- "Write … over 10⁹" (reads as a fraction) → "Rewrite … as ___ × 10⁹".
- The place rule in plain words: "round to the place where the less precise one ends".
- Paper is not a keyboard: print notes and "___ × 10^__" blanks; a keypad per kind of answer (none on a count).
- Examples on the page never use a test answer (5.7 × 10⁵, 3.2 × 10⁴, −19/4 were all test answers) — now 7.2 × 10⁶ and −13/6.
- Q14 in plain words ("Sealing it costs $2.10 per square foot, plus a $40 delivery fee"); select-all feedback names the value, not "the target".
- Screen readers: every math span carries a spoken label ("2 over 3", "the square root of 49", "10 to the 5").
- At 320 px the Q5 equation no longer forces a sideways scroll; a root over a fraction is drawn tall.

## Checks (strengthened)
- The printed question is read back from the html (own parser) and must give the key — before, both checks recomputed from the
  same numbers the engine used (review 4 proved a printed −6³ with a −6² key passed). sympy reads the printed pure-math stems too.
- Planted errors now include source-level edits loaded fresh (rounding cut off, the end-zero rule, a printed exponent and a printed
  time that disagree with the key): 14/14 caught.
- The multiple-choice keys now carry their option order, so the stability lock sees a reshuffle.

## Kept, for Croix to decide
- **Follow-through (ruling 19):** on Q14b, the value of a wrong Q14a expression is marked ✗ with "Your method for this part is
  right … Fix part (a) first", as on M7 Q5b. On the paper it earns the point. Two reviewers asked for ✓ (with the note).
- **Not done:** Q4/Q16 have no Hint (Show me how works on them); the lock still covers seeds 1–300.
