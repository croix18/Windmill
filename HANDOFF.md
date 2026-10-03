# Windmill — handoff

Project memory. Read `README.md` for what is here; this file is why, what is decided, what is
assumed, and what is next. Owner: Croix Shaffer, 7th-grade math, Windy Hill Middle School, Lake
County FL. Built in Claude sessions; a new session starts from this file, not from memory.

## The plan, and where each tool stands (3 Oct 2026, end of day)

The design is the *Room Coordination Plan*, a Claude doc Croix owns:
https://claude.ai/code/artifact/9db84d04-9444-48c4-adad-9c68905eefd8 — read it with the docs tool
before changing anything here or in a tool. Phase 1 (tests) is staged in `tests/room-test/` and runs
Monday 5 Oct on the panel. Phase 2 (this repository) is built except Tally's Publish. Phase 3 (the
lesson console) shipped its first slice in the A7 repository (`a7/build/lib/consolekit.py`; the unit
`.html` opens on Today, reads the bell from the spine, keeps a bookmark per period, runs the
whiteboard round with a timer, veil and tally, writes the `panel` part to the browser's store).
Phases 4–5 are not started. Each tool's own handoff carries a "Windmill and the room" note pointing
here (added 3 Oct).

## Why this exists (3 Oct 2026)

Five tools, three layers: curriculum (A7 and M7 repos: specs → decks, teacher editions, assessments),
items (Cadence: 1,387 verified generators by benchmark), live (Deckhand on the Promethean panel;
Geopardy for review day; Tally for grades on the laptop). Croix: "I would like for all of the tools to
talk to each other and coordinate." Tally tracks progress and weak areas; Cadence should produce the
day's bellwork, worksheets and exit tickets from that, spiraling to weak standards; the lesson deck
tracks where each period is; Deckhand runs the room and kicks off into the lesson. The tools stay
separate repositories with their own test suites — merging code was rejected; Windmill is the
contract between them.

Croix's standing instruction for this project: **"Keep it over engineered. I want everything."** All
three transports (room code, Drive file, Apps Script) get built; tests on the panel decide only which
is the default on each device. The *Room Coordination Plan* doc has the whole design, the per-tool
changes, the spiral rule and the build order (about 24 sessions).

## Decided

- **Three sources answer "where are we", and they answer different questions.** The plan (`spine.json`)
  says where a course should be on a date. Tally says which unit a course has assigned
  (`settings.currentUnit[prep]`, its "Working in" selector — Tally knows the unit, not the lesson).
  The panel says where period N actually stopped (the deck's bookmark). A reader prefers the panel
  for the lesson, Tally for the unit and the heat, the plan for everything else.
- **One room, parts with one owner each, newest copy per part, never merged within a part.**
  `plan` (Windmill build), `tally` (Tally), `panel` (Deckhand/the deck), `roster` (Tally's export),
  `log` (append-only on the live road).
- **Data tiers, not a ban.** Croix: "There are absolutely tools that will name students. I've got
  pickers and seating chart builders." Open tier (counts, codes, times) rides every road in the clear;
  roster tier (first names, seating, links, picker history) rides the Drive file — his school Drive,
  where backups with names already live — or an encrypted blob on the live road with the key typed
  once per device; standing tier (grades, scores, FAST percentiles) takes no road and is not in the
  schema. The reader's tier guard and the schema's `additionalProperties: false` enforce it; the
  repos stay name-free (fixtures use synthetic first names in the roster part only).
- **Benchmark codes are the universal key**, exactly as the Source of Truth, Cadence's `STD` registry
  and the IXL skill plans spell them (`MA.8.NSO.1.3`). Shorthand in the readable room code drops the
  dots (`8NSO13`); the compact code indexes `room/benchmarks.json`, whose order is versioned.
- **The compact code carries the list version**, so a tool with an older list decodes the units and
  refuses to place benchmarks rather than misreading an index.
- **`spine.py` reads the source repositories' own calendar modules** (A7 `scope_calendar.py`, M7
  `mkscope.py`) rather than re-deriving the plan: the plan has one home per course and Windmill is a
  view of it. The IXL due-date rule is A7's own (lessons in a row with the same skills are one
  assignment, due the first class day after the run).
- **Regeneration is byte-stable**: the same sources give the same `spine.json`; `generatedAt` moves
  only when content moves.

## Assumed — confirm with Croix

1. **Period map**: 1st and 3rd accelerated, 2nd, 4th, 5th on-level (from Tally's notes, 27 Sep); 6th
   is on the bell schedule and treated as planning. `PERIODS` in `spine.py`.
2. **M7 before 28 Sep**: 23 Sep review, 24–25 Sep the Unit 3 test, per mkscope's comment "24–25 Sep
   went to the Unit 3 test". Filled as `AS_RUN` in `m7_days`.
3. **The A7 PM3 window** (3–28 May) is one row in A7's calendar; the spine repeats it on every school
   day of the window. Algebra 1 bridge codes (`MA.912.*`) in that row are dropped: outside both FASTs.
4. **Quarter ends** from M7's `mkscope.QUARTERS` (Oct 9, Dec 18, Mar 4, May 28) — the same dates Tally
   uses.
5. **Holidays**: the two calendars agree (checked by eye: student holidays 12 Oct, 4–5 Jan, 5 Mar,
   16 Apr; Veterans Day; the three breaks; MLK; Presidents'). M7's names are used; A7 has only dates.
   Both say "verify against the district PDF" — neither has been.
6. **Week colour** follows Deckhand's v7.9 rule (school weeks alternate; `skipWeeks` Mondays do not
   advance; a break week keeps the previous colour) from the anchor week of 31 Aug = Black Week. The
   validator checks that consecutive school weeks alternate. Not checked against the printed sheet.

## Not yet built (the plan's phases 2–5)

- Tally's Publish (File System Access handle → `room.js` in the Drive folder; the Apps Script post;
  both codes shown; heat per benchmark from IXL skills via `spine.skills`).
- The Drive-folder test pair and the Apps Script test page for the panel (plan §"The test afternoon").
- The Apps Script (`room.gs`): a Sheet with `tally`/`panel` JSON cells, GET/POST with a key, the log.
- Deckhand: room code field, Drive folder pick, script link, Geopardy card, hand-off `#period=N`.
- The lesson deck rebuild (today screen, rail, pacing bar, whiteboard round with timer and tally,
  per-period resume) — in the A7 repo's build, reading this reader.
- Cadence: Today (bellwork/worksheet/exit ticket by the spiral rule), class sets seeded from the room,
  set-code QR, Export a Geopardy board, exit-ticket result entry.
- Room inspector page, phone remote, room history, pacing truth, simulator, nightly digest.
- A7 and M7 builds vendor `spine.json` as the decks' fallback; the A7 master sheet reads the spine.

## Pushing from a session

`tools/push.sh "message"` — runs `tools/check.sh`, commits as the no-reply author, pushes with a
preemptive Basic-auth header (the sandbox proxy returns 403 to git's first request), then compares the
remote head with the local head. Token in `.github-token` (git-ignored, chmod 600). Set
`CLAUDE_MODEL_NAME` and `CLAUDE_SESSION_URL` for the trailers. The GitHub API is not reachable from a
session; repositories are created by Croix. A token pasted into a chat is burned — rotate it.

## History

- **3 Oct 2026, later** — `tests/room-test/` (the four panel tests and `room.gs`); the reader's header
  comment no longer carries literal script tags (it is inlined into pages, where `</script` would end
  the block — found when the A7 console first loaded it); the console shipped in A7 against this
  reader and spine (vendored by A7's `tools/vendor_windmill.py`, commit recorded in `assets/windmill/VERSION`).
- **3 Oct 2026** — repository created by Croix ("It's called windmill"). First commit: `spine.py`,
  `validate.py`, `spine.json` (150 school days, 74 benchmarks, 253 IXL skills, 28 holidays, bell from
  Deckhand 7.38), `room.schema.json`, `room-reader.js` with both code forms, `benchmarks.json` v1,
  ten fixtures, `test.js` (14 checks), check/push scripts, CI.
