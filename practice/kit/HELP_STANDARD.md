# The help standard (14 Nov 2026)

The kit's standard for every hint, worked solution, walkthrough step and coach line on a practice page (Windmill `practice/kit/HELP_STANDARD.md`). Units meet it in their `help.js`, which `coach.js` applies at its end; `check/help.js` and `check/help_page.js` (run by `check/run.py` for a unit with `help.js`) hold it. First met by M7 Unit 10 and A7 Unit 6 (14 Nov 2026). Croix's rulings of 14 Nov 2026 are marked **(Croix)**.

Every hint, worked solution, walkthrough step and coach line on a practice page meets this standard, in both courses and on both the practice test and the lesson sets. It rests on what is known to help middle schoolers:
- **Worked examples with self-explanation prompts.** Studying a solved step and then saying why it works beats solving cold (Renkl; Chi; the IES practice guide *Organizing Instruction*, recommendations 2 and 7).
- **Dual coding.** A picture beside the words, not instead of them (Paivio; Mayer's multimedia principle).
- **Signaling.** The same color links a word to its part of the picture (Mayer).
- **Concreteness fading.** Tiles, a balance or a tape first, then symbols (Fyfe, McNeil and colleagues).
- **Explicit vocabulary instruction.** Name the term, define it in plain words, and use it every time after (Marzano; the Florida B.E.S.T. Mathematical Thinking and Reasoning standard MA.K12.MTR.4.1).

## 1. Reading level and sentences
- **Reading level:** grade 6 for the words *around* the math (Flesch–Kincaid ≤ 6.5 on a family's text with the math taken out). The math terms themselves are exempt and required (§3).
- **Sentence length:** at most **20 words**, with a target of 8–14. A sentence that holds an equation counts the equation as one word.
- **One sentence, one claim.** No "—" chains of three clauses, and no "X: Y: Z" strings of colons.
- **Second person, present tense, active voice.** Write "Divide both sides by −3." Not "Both sides are divided".
- **Every pronoun has an antecedent on the same line.** "Says the same thing as **this**" is not allowed.
- **Use the question's own numbers and names.** A general rule ("the number added or subtracted") is said once in Hint 1, followed immediately by this question's instance.
- **American English** (*labeled*, *practice* as a verb, *color*).

## 2. One idea per step: what to do, and why
- **A worked line** (Hint 3) has three parts, in this order:
  - **Do**: an imperative sentence, at most 15 words ("Undo the constant: add 31 to both sides.").
  - **Why**: one sentence, prefixed **Why:**, naming the property, theorem or reason ("the Addition Property of Equality keeps both sides equal").
  - **Math**: the line that results, on its own line.

  A line that is only arithmetic ("Simplify the right side.") may skip the Why.
- **No line does two moves.** Divide and check are two lines.
- **Hint 1 · What to notice** names the *kind* of problem and the *one* idea that unlocks it, in the lesson's words. It has two or three sentences plus a picture, and it never gives away the first move's result.
- **Hint 2 · The first step** gives the first move and its Why, and shows the picture of that move when one exists.
- **Hint 3** ends with a **check or a sense-check** line: substitution for an equation, a test point on each side of the boundary for an inequality, or "a leg is shorter than the hypotenuse" for geometry. Then comes the answer.
- **Use the lesson's method.** If the deck teaches two methods, the help teaches one, and two methods never appear inside one solution. **Parentheses: distribute first** **(Croix)**: "they are terrible at distributing. So let's do distribute."

## 3. Vocabulary
- **Every unit has a glossary** (`Kit.X.gloss`), built from its decks.
  - The terms below are required: where the idea appears, the term appears.
  - Each term gets a plain definition of 15 words or fewer.
- **Every appearance of a term** is named and highlighted: bold, with a dotted underline, its plain definition shown inline only on a tap and hidden on a second tap (`Kit.X.teach`, `[[id]]` in a unit's text). **(Croix)** First "Spell it out first time then Show on tap after"; then, after seeing it live, "Don't spell it out first." Definitions are never written out in the sentence.
- **After that,** the term is used plainly. It never falls back to a substitute word ("the letter", "the number with k").
- **Terms never go inside an option button.** A button can't hold a button. Options use color signaling instead (§4).
- **Required terms.**
  - **M7 Unit 10:**
    - variable, coefficient, constant, term
    - inverse operations
    - Addition/Subtraction/Multiplication/Division Property of Equality
    - two-step equation, Distributive Property, reciprocal
    - solution, solution set, boundary
    - open circle and closed circle (one name each, matching the deck)
    - reverse the inequality symbol, at most / at least
    - rate
  - **A7 Unit 6:**
    - Triangle Inequality Theorem
    - Pythagorean Theorem and its converse
    - leg, hypotenuse, right angle
    - square root, perfect square
    - horizontal distance and vertical distance
    - similar, corresponding sides, scale factor
    - interior angle and exterior angle (Thread B)
  - **Other units:** their decks' bolded terms, gathered the same way before rollout.

## 4. Visuals: when one is required, and which kind
**A picture is required** when:
- the idea is spatial (a figure, a graph, distance or position);
- the idea is a *why* that words can only assert (why the symbol reverses, why equal sides lie flat);
- a story has to become an expression;
- the lesson itself taught the idea with a model.

A picture is optional for pure arithmetic.

| Idea | The picture | Kit builder |
|---|---|---|
| Solving an equation; the Properties of Equality | **A balance**: the equation's terms as chips on two pans. The move puts the same dashed chip on both pans and strikes out the pair that makes 0. | `X.balance` |
| Story to equation (rate, fee, discount, groups, percent off) | **A tape diagram**: equal pieces for the rate, one piece for the one-time amount, under or over the total, with braces giving each part's expression. | `X.tape` (with `cells`) |
| Why a negative multiplier reverses the symbol | **Opposites on a number line**: 2 < 4, then −2 > −4, in two colors. | `X.mirror` |
| An inequality's solution set; test points | **A number line**: the boundary circle (open or closed), the shading, and one test point on each side marked ✓ or ✗. | unit `fig.js` `testPic` (exists) |
| Triangle Inequality | **Bars**: the two shorter sides end to end over the longest side (more, equal = flat, less = short). | `X.tape` rows |
| Pythagorean Theorem in a story | **A right triangle drawn to the story**: the right angle boxed, the hypotenuse solid in color 1, the legs dashed in color 2, each labeled with its name, its number and its story object. | `X.rightTri` |
| A question that has its own figure (similar triangles, a grid, a triangle) | **An annotated copy of that figure**: corresponding parts recolored in matching colors and line styles, the unknown in color 2. | `Fig.figModel` + `B.line(…, 'xs1')` |
| Distance on the coordinate plane | The right triangle under the segment, with its horizontal and vertical legs measured. | unit `fig.js` (exists) |

**Picture rules.**
- **Size (14 Nov 2026 review).** Every help picture is drawn at the full width of the line that holds it, and every label is at least 12.5 px on a 390 px phone, with contrast at least 4.5:1 against the picture's background in light and in dark (`check/help_page.js`; an axis's small tick numbers are exempt). The kit's builders draw on a 280-unit-wide canvas for this; a unit's own figure in the help goes through `Kit.X.big`.
- **Signaling color.** At most three colors: x1 teal, x2 orange, x3 violet, with light and dark values in `explain.css`.
  - Each color comes with its own line style (solid, dashed, dotted). Meaning never rests on color alone.
  - The same color marks the matching words in the text (`X.c(n, …)`).
- **Place the picture in the step it explains.** It goes inside the walkthrough question or the hint, not only under "See why it works".
- **Captions** are at most 2 sentences and name what to look at ("The dashed pair is x and its corresponding side").
- **Alt text** is a sentence that states the relationship, not "image".
- **Pictures never reveal the answer before Hint 3.** Hint 1 uses a neutral example (4, 5, 7) or the question's *given* numbers only.
- **Concreteness fading.** The picture comes before the symbols in Hint 1. Later steps drop the picture and keep the symbols.

## 5. How a walkthrough step is laid out
1. **The ask** is one question, at most 20 words. It names the term in play and, when a picture applies, includes it. Use "The coefficient −3 multiplies k. How do you undo it?", not "Then?".
2. **Options:** 2–3 for a choice step. Each wrong option is a real misconception. Its reason (at most 2 sentences) says what that choice would *mean* and gives the correct idea. The right option's position varies with the question; it is never always first.
3. **A number step** gives one smaller arithmetic step after a miss, never the answer, and offers **Show this step** after two misses (the kit's existing rule).
4. **A "why" question only on the unit's key idea** **(Croix)**, placed right after the move it explains (M7 Unit 10: multiplying or dividing by a negative reverses the symbol; A7 Unit 6: the hypotenuse is the longest side, so a leg comes from subtracting).
5. **A sense-check step** comes last when the answer can be judged ("Is k more than 1 or less than 1, and why?" or "Does your answer make sense?").
6. **Steps:** 3–6. A family that needs more is split at a natural joint.

## 6. How the coach talks about a mistake
- **Pattern:** *That is what you get if you* + **the move the student made** + **. ** + **the idea it broke, in the lesson's words** + **the fix**. Use at most 2 sentences after "if you".
  - Example: "That is what you get if you divided by −0.6 but kept ≥. Dividing both sides by a negative number reverses the symbol: ≥ becomes ≤."
- **Name the specific pick** on a choice or select-all question ("C: 9 + 10 = 19 lies flat"). Never "one of your picks is wrong" without saying which.
- **When no model matches,** use "Look at:" plus Hint 1, then the next action, in the button's real name: "Open Hint, then tap **Step by step with me**." A substitution-only "Check it" line is not enough on its own.
- **Tone:** calm and specific. No "Oops" and no exclamation marks. Never blame the student ("you forgot"); describe the move ("stopped at 84").

## 7. The reviewer's checklist (score each family; ship at 16/16)
**Words**
1. Every sentence ≤ 20 words; the words around the math read at grade 6 or below.
2. No pronoun without a clear antecedent; no symbol-only option ("< or >").
3. American spelling; the deck's own names for every object (closed circle, coefficient, horizontal distance).

**Vocabulary**

4. Every required term for the family appears where its idea appears.
5. Each term is tappable, with a definition of 15 words or fewer behind the tap (never spelled out inline); no substitute words.

**Steps**

6. Hint 1 names the kind of problem and one key idea, in at most 3 sentences, without the first result.
7. Hint 2 is the first move plus its Why.
8. Every Hint 3 line has one move; every non-arithmetic line has a **Why:**.
9. Hint 3 ends with a check or sense-check.
10. The method is the lesson's, and only one method appears.

**Visuals**

11. A required picture (§4) is present, placed in the step it explains, with a caption and alt text.
12. Color signaling links words to picture parts, each color with its own line style; the picture works in dark mode.

**Walkthrough**

13. One question per step; the right option is not always first; every wrong option has a reason that names the misconception.
14. A "why" question appears where the family carries the unit's key idea, and nowhere else.

**Coach**

15. The top 3 modeled mistakes each name the move and the broken idea, using the pattern above.
16. **A fresh-reader pass**, by a reviewer who has not seen the work and tries to misread every family and checks the math line by line, found nothing left unfixed.

## How a unit carries it
- `help.js` (before `coach.js` in `unit.json`; the teacher copy's too): a `SPEC` per family — `terms`, `notice` (Hint 1), `first` (Hint 2), `sol`, `walk`, `coach`, `pic` — and `help(api, walkApi)`, which `coach.js` calls at its end, so the unit's own checks read exactly what a student reads. The mathematics lines stay the coach's own.
- `Unit.rungs` asks `Coach.rungs` first. `Coach.help = {terms, pics}` tells `check/help.js` what to hold.
