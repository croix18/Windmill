# Common ground (every agent reads this first; it is short on purpose)

- **Who it is for.** Croix Shaffer teaches 7th-grade math at Windy Hill Middle School (Florida, B.E.S.T. benchmarks). A7 is Grade 7 Accelerated (MA.7 and MA.8 benchmarks; its students sit the Grade 8 FAST). M7 is on-level.
- **Rule 0 (Croix):** "math errors are unacceptable… the stuff that touches students needs to be completely mathematically sound. everything else is secondary."
- **Repositories on this machine.** `/home/claude/windmill` — Windmill, the shared build kit (`kit/`), branch `claude/lean-workflow`. `/home/claude/croix18-windy-hill-a7` — the A7 course (`a7/build/` is the build: `lib/`, `checks.py` and the drivers are the kit, vendored; `uN/` are the unit's lesson specs), same branch name. `/home/claude/croix18/croix18-windy-hill-a7` and `/home/claude/windy-hill-m7` are READ-ONLY copies for looking things up.
- **Git.** You never push, never pull, never change branches. Commit only if your brief says so. The lead does the rest.
- **Machine.** Two CPUs, shared with other agents. Anything that runs LibreOffice (`build_lesson.py`, `build_unit.py`, `build_all.py`, the kit's tests) needs a HOME of your own: your brief names it (`export HOME=…; mkdir -p $HOME`). Python: matplotlib is pinned at 3.10.x — never upgrade it. `export NODE_PATH=$(npm root -g)` before Node.
- **Words.** American English. Multiplication is a dot or parentheses, never ×. Plain titles; no taglines.
- **Reading discipline.** Read what your brief names and what you need to do the job, with grep and line ranges for the big files (`HOUSE STYLE.md` is 285 KB of history: never read it whole).
- **Your final message** is read by the lead, not by Croix: facts, numbers, file paths; no recap of the brief.
