# briefs/lean — the briefs of the lean workflow, as they were run

`../LEAN WORKFLOW.md` is the procedure. These are the briefs it was first run with — A7 Unit 7, 20–21 November 2026 —
kept as worked examples. The number at the front of a name is the step of the workflow's table.

To run them for another unit: copy the folder into the session's workspace (these say `/home/claude/lean/`), and change
the unit's name and number, the course's paths, the plan's file name and section names, the benchmarks, and the model
lesson. Keep them short: a brief names what to read, what to write, how to prove it and what to hand back — nothing else.

| File | Step | Given to |
|---|---|---|
| `COMMON.md` | every step | every agent, first |
| `0 SCOPE (Math Nation).md` | 0 | one reader: scope and test item shapes, paraphrased, never in a repository |
| `2 PLAN REVIEW - Barton.md`, `2 PLAN REVIEW - FAST.md` | 2 | two readers of the plan, before any spec exists |
| `3 FIGURES.md` | 3 | one builder: the unit's figure module and the one-page note on calling it |
| `4 LESSON BUILDER.md` | 4 | one builder per lesson (its task message gives its lesson) |
| `4 PAPERS BUILDER.md` | 4 | one builder: the Practice Test, the Review, the Reference Sheet, the manifest |
| `6 BLIND SOLVER.md` | 6 and 9 | solvers who see no answer (the task message gives each its ids) |
| `6 READER.md` | 6 | three readers, one lens each: critic, barton, fast |
| `8 FIXER.md` | 8 | one fixer per file (the task message gives its name, file and section of the rulings) |
| `FIELDS.md` | — | which outputs read each spec field, and which fields are still written with no Teacher Edition |
| `mkcopy.sh` | 4, 8 | `bash mkcopy.sh NAME` → an isolated copy of a course's build folder and a HOME for LibreOffice |
| `build_papers.py` | 4, 8 | a unit's papers alone, from a build folder, without the unit deck |
| `10 WORDING PASS SOLVER.md` | a wording pass | two solvers of the reworded questions, who also report what they had to guess (`../LEAN WORKFLOW.md`, "A wording pass") |
| `try_build.py` | a wording pass | `python3 try_build.py u7` from a build folder → each lesson built with no PDFs; the first thing the kit refuses in each |
| `look/slidefigs.py` | 4, 8, 9 | from a build folder: every picture on every slide of a built deck — its lettering (pt) and each coordinate plane's size, grid edge to grid edge; `!!` below the floors |
| `look/paperfigs.py` | 4, 8, 9 | from a build folder: every printed picture of a lesson (set and banks) — lettering and grid squares, as the page places them |
| `look/footgap.py` | 9 | how close each slide's lowest ink comes to the footer rule (`!!` under 0.15 in) |
| `look/phantom.py` | 9 | text the kit gave a blank line's room it does not take (a gap under a line that just fits) |
| `look/mosaic.py` | 6, 9 | chosen slides or pages side by side, to look at |

The lead's own two documents for a unit are not briefs and live with the course: the plan
(`aN/reference/… - Lesson Outlines.md`) and the rulings on the review of the built unit
(`aN/reference/… - Review Rulings.md`).
