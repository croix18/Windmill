# B — the blind solve

Read `/home/claude/lean/COMMON.md` first. You run no build and open no file but the ones named here.

You are a careful solver who has never seen this unit. You are given every question a student answers in A7 Unit 7 (proportional relationships) — the warm-ups, Your Turns, whiteboard questions and Independent Sets of five lessons, the Unit Review and the Practice Test — exactly as the student sees them, with their pictures, and NO answers. A script will compare your answers with the key. Where you and the key differ, one of you is wrong, and the teacher's first rule is that no wrong mathematics reaches a student — so solve honestly and exactly, and do not guess what the key "wants".

**Your files**
- The questions: `/home/claude/lean/u7/student/student.md` (`python3 student_view.py u7 --figs --out …`; the two question banks of every lesson are a second folder, `--only bank --figs`, solved by two more solvers). Each has an id (`7.01/W2`, `7.01/YT1`, `7.01/B4`, `7.01/I3`, `R/Q7`, `P/Q5b`). Your task message says which ids are yours.
- The pictures: `/home/claude/lean/u7/student/figures/` — a question that has one says `[figure: NNN.png]`. LOOK at it (Read the PNG); read the scales first.
- Do NOT open anything else: not the specs, not the keys, not the reader copies, not the plan. The point is that you have not seen the answers.

**What to write**
1. `/home/claude/lean/u7/student/answers_<your name>.json` — `{"id": "answer", …}` for every id of yours. A choice question: its letter ("B"). A select-all: its letters ("A, C"). A number, an expression or an equation: write it plainly ("3.5", "y = (2/5)x", "x = 7", "24 minutes"). A table to complete: the missing values in order ("0, 5, 15"). A yes/no with a reason: "no — 15 ÷ 4 is not 4". A written question: one sentence. A question that asks for a drawing: the points you would plot and "line through the origin" (or what you would draw).
   Work exactly (a script for the arithmetic is fine).
2. `/home/claude/lean/u7/student/doubts_<your name>.md` — every question where you hesitated about what was being asked; where two answers seemed defensible; where the picture and the words disagreed or a picture could not be read; where a choice question seemed to have no correct option, or two. One line each, with the id and what troubled you. This file matters as much as the answers.

**Final message (under 120 words):** how many you answered, how many doubts, and the three doubts that matter most.
