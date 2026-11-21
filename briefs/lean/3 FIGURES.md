# F0 — the figure helpers for A7 Unit 7, built before the lessons

Read `/home/claude/lean/COMMON.md` first. Your HOME for anything that draws or builds: `/home/claude/lean/home-figs`.

Five lesson builders and a test-paper builder are about to write A7 Unit 7 (proportional relationships). They must all draw the same way, so the unit's figure module exists before they start. You write it, prove it, and write a one-page note on how to call it.

**Where:** your own copy of the course's build folder, `/home/claude/lean/b-figs/build/` (the kit in `lib/`, the drivers, `u3`…`u11`). Write `u7/figs7.py` there and nothing else in that tree; the lead copies it into the course. Do not edit `lib/` or any other unit.

**Start from** `u11/figs11.py` (Unit 11's module: `plane`, `table`, `row`, `match_grid`, `slide` — read all of it, and look at how `u11/l07.py`, `u11/l08.py` and `u11/unit.py` call it, how a spec loads it, and how a figure is put on a notes slide, an example, a Your Turn, a board, an answer slide, the Independent Set's handout and a paper's key). `SPEC SCHEMA.md` says where a figure may go (grep `fig`). Keep `figs11`'s way of doing things; change only what Unit 7 needs.

**What Unit 7 draws** (the plan is `/home/claude/croix18-windy-hill-a7/a7/reference/A7 Unit 7 Representing Proportional Relationships - Lesson Outlines.md` — read "Shared across the unit" and skim the figures the lessons and the test name):
1. A first-quadrant plane with NAMED axes (pounds, cost in dollars…) and its OWN scale on each axis (1, 2, 4, 5, 10, 20 a grid line), holding any of: a line through the origin given by its constant; plotted points, with or without the line; a point's label; a line that is NOT proportional (from (0, 2), for the contrast); two to four lines on one grid, each lettered or named.
2. A four-quadrant plane for y = px with a negative constant (a line falling through the origin).
3. A ratio table with named rows (x and y, or hours and pay), a blank (▢) where a value is asked.
4. A row of four small graphs lettered A–D for a choice board ("which graph shows it?"), each still readable.
5. An empty grid with named, scaled axes for the handout and the test paper (the student draws), and the same grid with the answer drawn for the key.
6. Three small pictures side by side for one notes slide (a line through the origin; a line from (0, 2); a curve through the origin).

**The standard:** on a question slide the lettering is 18 pt or more and a graph a student reads is at least 2.6 in tall; tick numbers never sit on a line; a label never crosses a line; every number on a picture is the number the words give (ruling 44). Draw each kind at slide size, render it (the kit's figkit writes the PNG; `figure_sheets.py` shows how to render a spec's figure), and LOOK at each once — one sheet of all six kinds is enough. Fix what is ugly or unreadable.

**Then write `/home/claude/lean/u7/FIGS7.md`** (under 70 lines): each function, its arguments in one line, and one worked call for each of the six kinds above, exactly as a spec would write it — including how a spec loads `figs7` and how the figure is placed (`slide(...)`). A builder reads this note instead of your source.

**Final message (under 150 words):** the functions you added or changed from `figs11`; the path of the sheet you looked at; anything the kit cannot draw at the standard (say the smallest lettering you got on the four-graph row).
