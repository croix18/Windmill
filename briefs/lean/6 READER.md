# R — reading a built unit (three readers, three lenses, text not slides)

Read `/home/claude/lean/COMMON.md` first. You run no build and change no file but your own findings file.

A7 Unit 7 (proportional relationships: five lesson decks, a Practice Test that is the blueprint of the unit test, a Unit Review, a Reference Sheet) has been built by six builders working apart, from a plan that was itself reviewed. Every keyed answer has been re-derived by the build's own checks, and a blind solver has answered every question without the key (the lead compares the two). **So you do not recompute every key.** You read for what a check cannot see, through ONE lens — your task message names it. You have not seen the unit being written; that is the point.

## What you read
- `/home/claude/lean/u7/reader/` — the unit as text, in slide order, with its answers (`python3 reader_copy.py u7 --bank --out …`): `7.01.md`, `7.02.md`, `7.04.md`, `7.05.md`, `7.07.md` (each lesson: title and target, warm-up, vocabulary, notes, examples and Your Turns with their worked lines, the nine whiteboard questions with choices, key, steps and each wrong option's named error, the Independent Set with its key, **and its Question Bank and Additional Question Bank** — they are student pages too) and `Unit 7 papers.md` (the Review, the Practice Test, the Reference Sheet). An item with a picture says `[figure: NNN.png]`.
- `/home/claude/lean/u7/figsheets/` — every picture of the unit beside its words: `sheet_NN.png` (four to a sheet) and `items.txt`. Look at the sheets (Read each PNG once): they are the only images you need. Do not render slides.
- The rules the unit is held to: in the plan `/home/claude/croix18-windy-hill-a7/a7/reference/A7 Unit 7 Representing Proportional Relationships - Lesson Outlines.md`, read "The unit's standing decisions" and "Shared across the unit" (and "The test" if your lens is the test). The benchmarks: `/home/claude/windy-hill-m7/m7/reference/TRUTH - Grade 7 Benchmarks.md`, sections `## MA.7.AR.4.1` to `4.5`.
- Your lens may name one more source. Nothing else: not the specs, not the kit, not the slide files.

## What to write — `/home/claude/lean/u7/review/<your name>.md`
At most 20 findings, most serious first. Each: its id or place; what is wrong; your evidence (a computation, where one is the evidence); the fix in exact words and numbers. Mark each BLOCKER (wrong mathematics; a key two markers could dispute; a question with two defensible answers or none; a picture that disagrees with its words), MAJOR, or MINOR. Do not pad: a finding you cannot defend is worse than none. Where something looks mathematically off, compute it — that is always in scope. End with a short list of what you checked and found sound, so the lead knows your coverage.

## The three lenses (the task message names one)
- **critic** — adversarial. A key two markers could dispute; a question with two defensible answers or none; a picture
  that disagrees with its words; a context whose numbers are absurd (a class can check a snail's speed); a story, table
  or line that the plan reserves for the paper turning up in a lesson or a bank; the same question in two places; an
  Independent Set whose numbering does not match its content.
- **barton** — Craig Barton, the teacher's instructional rules (HOUSE STYLE §16: `grep -n "^## 16"`, that section only).
  Is each Your Turn its Example's structure with new numbers? Where a round says one thing changes, does one thing
  change? Is every wrong option of a choice board one named error, and no two the same error? Is every step a student
  must take taught, with its reason, before it is asked? Are the unit's method sentences said the same way everywhere?
- **fast** — a FAST item committee. Does each item sit inside its benchmark's boundaries (the "Must not ask" lines)? Are
  the parts of a question independent — does one part's stem or options give another away? Could two markers score an
  answer differently? Does the Review rehearse every shape the paper asks? One more source: the Source of Truth of any
  other grade's benchmark the unit teaches.

**Final message (under 200 words):** counts by severity, each BLOCKER and MAJOR in one line, your coverage in a line.
