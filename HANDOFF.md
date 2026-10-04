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
Phases 4–5 are not started. **4 Oct**: the console also shipped for M7 (on-level, course key `on`,
`windy-hill-m7` commit 1fb97b0), so both courses read this reader and spine; M7's Unit 5 gained its
Form B. If a session ends mid-way, every repository is pushed and each handoff's "Windmill and the
room" section says what that tool still owes. Each tool's own handoff carries a "Windmill and the room" note pointing
here (added 3 Oct).

## The plan follows the class (4 Oct 2026, night) — `kit/lib/flow.py`, `kit/lib/flow.js`, `plan/`

Croix: *"I would like the plans to adjust or allow for flexibility but also adjust. For example, I
took Friday as an extra review day, so for a7 Monday, we are working on the variables as bases
lesson. We have another random state test this week, so thatll put us behind again. I need the plan
to be fluid and adjust on the fly."* Asked what gives when a class is behind, he chose **push
everything back**: lessons keep their order; flex and spiral days absorb the loss first; tests move
to the next Monday or Thursday; the end-of-year review shrinks; he is told when a test crosses a
quarter's end or content runs past 30 April. (Ruling 35 in M7's rulebook, §13b(xvi) in A7's.)

- **The dates are no longer typed anywhere.** Each course's calendar tool builds a SEQUENCE (the
  year's lessons, reviews and tests in order, with the rules as flags on the items) and
  `kit/lib/flow.py` lays it on the school days. With an empty log both tools write byte for byte
  what they wrote before (checked before anything else was changed).
- **A lost day is one line in a log.** `a7/reference/A7 As Run 2026-27.csv` and
  `m7/reference/M7 As Run 2026-27.csv`: `date, what, note`, where `what` is `review` (class met,
  nothing new), `off` (no class: a state test) or the code of the lesson the class BEGAN that day —
  an anchor: the engine lays the year so that lesson is on that day, marks the days it has to
  account for as "a day off the plan (the log does not say which)", and lets the log outrank a rule
  (a test Croix gave on a Tuesday stays on its Tuesday). Future days go in the same file (the state
  tests of 14 January and 1 March are there).
- **What a session does when Croix says a day went elsewhere** — in order, nothing skipped:
  1. add the line to that course's as-run CSV (his words in a `#` line above it);
  2. run the course's tool (`python3 tools/scope_calendar.py` in A7, `python3 tools/mkscope.py` in
     M7): it rewrites the scope and sequence and the IXL due-date sheet and ends with "The plan
     follows the class" — the log and what moved. **Read what moved back to him**: a test in
     another quarter, content past 30 April, flex days left;
  3. here: `python3 spine/spine.py --a7 … --m7 …` (it refuses a spine whose flow does not lay to
     its days), `bash tools/check.sh`, push;
  4. in each course: `python3 tools/vendor_windmill.py`, A7 also `python3 tools/master_sheet.py`
     and its recalculation and check; rebuild the units being taught (`build_all.py uN --install` —
     the consoles carry the spine); push; send him the consoles.
- **On the panel the console does it without a session** (`consolekit`, `flow.js`): it records what
  each period actually did — a lesson once its boards are reached during that period, a day marked
  "review / catch-up" or "testing / no class" on Today, a lesson marked taught by hand — in the
  panel part's `asRun` list (`room.schema.json`), and lays the rest of the year from the last
  lesson in it. Today offers the PERIOD's next lesson, says how many school days the period is
  from the year's plan and when the unit's test now falls. Rules it follows, each tested in
  `plan/test_flow.js`: a day with no deck (a test, a spiral day) is taken as run; a deck lesson
  nobody opened is taken as not taught and the day as lost, with one tap to say it was taught
  without the deck; after more than two such days the panel has simply not been used, so the built
  plan stands and the card says so; a panel that has not taught since the build's last lesson
  defers to the build. **The console does not send anything back**: what it learns stays in that
  browser until Deckhand publishes the panel part (the Room plan's later phase). Until then the
  durable record is the CSV, and Croix telling a session is how it gets there — the Today card has
  "What this panel has recorded" for him to read from.
- **Where the plan stands after the first log** (5 Oct): A7 two days behind and a state test on
  8 Oct — Unit 3's test moves 8–9 Oct → 15–16 Oct (into Q2), five of seven flex days are absorbed,
  content still ends 30 April. M7 two days behind, same test — Unit 4's test moves 15–16 → 19–20
  Oct; with the 14 January and 1 March state tests the log alone put M7's Unit 13 test on 6–7 May,
  past 30 April. **Croix was shown the options and took four (M7's ruling 36)**: tests may run
  Tuesday–Wednesday (M7 only), 8.05+8.06 and 9.03+9.04 are one day each, Unit 11 is trimmed
  (11.02+11.03 one day, 11.09 not taught), Units 8 and 9 have no review day. Unit 13's test is now
  27–28 April and one more lost day anywhere still ends by 30 April. A merged day's code in the
  spine is `8.05+06` (the shape A7 already used). Both courses' scope documents end with what moved.
  That plan is in the spine at `89c91e6` here and in `windy-hill-m7` `937acd5` (Units 4 and 5 rebuilt at
  `checks: 0 findings`). A7 still vendors the spine of `2761626` — its own half is identical; it
  picks the rest up the next time it is vendored.
- **Where it landed** (all pushed and verified against each remote head): the engine and the
  spine here `2761626`; `windy-hill-m7` `03fb7fc`; `croix18-windy-hill-a7` `c8ea8f5`. All four
  kit-built units rebuilt at `checks: 0 findings`; against the builds before 4 October the lessons
  are unchanged (the same documents differ as after the renaming, and only there). Each
  repository's `tools/check.sh` also passes in a clean clone. `spine.json`'s `sources` name the
  course commits the calendar tools were run over, with the log changes then uncommitted — the
  plan in it is the one those two commits hold. Croix pasted a token "with actions turned on" for
  reading CI; the session's safety layer refused to store or use a credential from the chat, so the
  Actions results are still unread — he was told, and to rotate it.
- **Kinds a tool may meet in `days`**: `extra` (an extra review or catch-up day) and `off` (no
  class) are new. Tally, Cadence and Deckhand have not been told; a reader that switches on `kind`
  should treat both as "no lesson today". `spine.flow` is new and optional to every reader.
- **Not done**: Deckhand, Tally, Cadence and Geopardy do not read `flow` or `asRun` yet; nothing
  carries the panel's record back to a session; the phone has no view of the moved plan other than
  A7's master sheet and M7's scope document.

## The build kit (4 Oct 2026) — `kit/`

Croix, 4 Oct: "Adapt m7 to a7 and the family", all four parts — classroom parity, **one shared
toolchain**, the M7 repository laid out like A7, and the family hooks. The toolchain is `kit/`: the
two courses' forked build libraries merged into one code base, published here, vendored into each
course's `build/` by `tools/vendor_into.py` and held there by `KIT.sha256` (`kitcheck` in the
course's own check suite refuses a copy that differs). `kit/README.md` is the manual. What a
takeover needs to know:

- **Edit the kit here, never in a course repository.** Then `python3 tools/kit_manifest.py`,
  `bash tools/check.sh` (the kit's tests run under a profile shaped like each course), vendor into
  both (`python3 tools/vendor_windmill.py` in each course repository), rebuild a unit of each.
- **A course difference is a name in `kit/lib/profile.py`** with a family default, set in that
  course's `build/course.py`. `python3 -m lib.profile` (from a course's `build/`) prints the profile
  and marks what the course set. Today the courses differ on: the independent set (A7 a printed
  handout, M7 a slide), the "Before You Go" slide (M7), the bank (A7 docx, M7 one markdown file),
  the teacher's-edition and lesson-plan styles, the review day inside the unit deck (M7), the colour
  code (A7 base/exponent read off the layout; M7 named slots a spec marks), the capcheck boundaries,
  the IXL SmartScore (67 / 60).
- **Proof it is one kit:** A7 Units 3–4 and M7 Units 4–5 each rebuild at `checks: 0 findings`
  (eighteen checks) from the same 29 files. A7's Unit 3 against its pre-kit output: 100 documents
  identical in structure, 7 differ, every one explained (a title line that used to sit on its box's
  edge; three two-line answer boxes now sized for two lines).
- **`gates.py`** runs every build gate over a unit's specs with no rendering (seconds); each course's
  `tools/check.sh` runs it before every push and in CI. **`SPEC SCHEMA.md`** — every field, for both
  courses — is part of the kit and vendored with it.
- **The IXL plan is a gate** (`lib/ixlplan.py`, inside `rulingcheck`): every skill and code on an IXL
  slide must be the plan's, read from the spine the course vendors; a lesson the plan lists skills
  for names exactly those. It found M7's Unit 5 carrying seven codes that exist nowhere and six
  lessons whose skills were not the plan's (fixed 4 Oct, before the unit was taught). That is the
  "IXL skill → benchmark" hook for Cadence and Tally made safe: every code a deck shows is a key of
  `spine.skills`, which maps it to its benchmarks.
- **Where it landed (4 Oct, all pushed and verified against each remote head):** Windmill `d08938b`
  (the kit both courses were built from), `windy-hill-m7` `73e5a8e`, `croix18-windy-hill-a7`
  `0ba8b9e`, `Geopardy` `7e57e60`. Each course repository's `tools/check.sh` was also run in a
  clean copy of its tree (what CI will do); **the first GitHub Actions runs themselves could not be
  read from the session** — if either course's "check" workflow is red, read its log before
  anything else. `spine.json` was not regenerated (Deckhand's checkout was not beside this one);
  its `sources` still name the 3 Oct commits, and the plan is unchanged.
- **File names and package layout are the kit's too (ruling 34, 4 Oct, later).** Croix: "Can you
  normalize all of the naming conventions in a7 and m7 … It's tough to find what I need sometimes."
  He chose the title in every name and unit folders by lesson in both courses. `lib/names.py` is
  the only place a file name is made (`M7 4.06 Finding Circumference - Slides.pptx`, `A7 Unit 3
  Exponents and Scientific Notation - Test - Key.docx`); `lib/packkit.py` is the one layout and the
  zips; each unit's title lives in the course's `course.py` UNITS; the whole-unit deck is `All
  Slides` in both courses. The four kit-built units were rebuilt under the new names at `checks: 0
  findings` with contents unchanged except where a document names a file; the older packages and the
  reference documents were renamed by `tools/legacy/rename_2026_10_04.py` in each course repository,
  which wrote `reference/<COURSE> Rename List 2026-10-04.csv` (every old name and its new one).
  A spec may carry `plan_code` (the plan's code for the day when it is not the spec's own) and a
  review day's code is the plan's (`4.R`): the console now opens on the plan's lesson on review,
  merged and thread days, which it did not before. `spine.py` reads M7's renamed due-date sheet.
  **A lesson's folder is its number only** (`Lessons/4.06/`), and a unit's zips carry no title
  (`M7 Unit 4 - Complete.zip`): with the title in the folder as well as in every file, paths ran
  past 255 characters as GitHub links (the A7 master sheet's hyperlinks were cut off) and past
  Windows' 260 once a zip was extracted. Croix was asked and chose number-only (4 October).
  `packkit.install` refuses a package whose longest path inside `packages/` exceeds 180.
  **Known and cosmetic:** on an assessment day the console's Today card names the day and says
  "— in another unit's deck"; the test is paper, so there is no deck to open, and the wording
  predates this work. Change it in `consolekit` only with a rebuild of every unit.
  **Where the renaming landed:** kit `fa48994` here; `windy-hill-m7` `d21c9ca`; `croix18-windy-hill-a7`
  `115f7d0` — each verified against its remote head, each course's `tools/check.sh` also run in a
  clean clone (what CI does; the Actions results still cannot be read from a session). All four
  kit-built units were rebuilt at `checks: 0 findings` and compared structurally with the builds
  before the renaming. A7's master sheet now holds every link to 255 characters (a longer one opens
  the lesson's folder and reads "in folder") and its check runs in A7's `check.sh` and CI. Croix's
  Drive keeps the old names until he replaces the folders from the new zips.
- **What the merge found in shipped work** is listed in each course's handoff (M7 `NOTES.md`, A7
  `HOUSE STYLE.md` §8): M7's colour code missing from a third of its decks, M7 boards that never
  keyed D, questions hidden in grey hint lines, a parallelogram's height drawn outside the figure,
  two distractors that were the same number, a misquoted MTR; A7's seven overflowing title lines.

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

- **4 Oct 2026, night (later)** — the plan follows the class: `kit/lib/flow.py`, `kit/lib/flow.js`,
  `plan/test_flow.*`; `spine.flow`; kinds `extra` and `off`; `panel.asRun` in the room and
  `room.asRun()` in the reader; the console offers a period's next lesson; `spine.py` keeps the
  published bell when Deckhand is not beside it; the room test reads 5 October from the spine.
- **4 Oct 2026, night** — `packkit`: lesson folders are the number only, zips are named without
  the unit's title, and an install refuses a path over 180 characters inside `packages/`.
- **4 Oct 2026, evening** — `kit/lib/names.py`, `kit/lib/packkit.py` (ruling 34: one naming
  convention, by-lesson packages); `UNIT_DECK` retired, `UNITS` added to the profile; the console
  matches the plan's code for review, merged and thread days; `spine.py` reads `M7 IXL Due Dates
  2026-27.csv` (falling back to the old name).
- **4 Oct 2026, later** — `kit/gates.py`, `kit/lib/ixlplan.py`, `kit/SPEC SCHEMA.md`; a manifest
  without `lessons` leaves the unit deck's order to the spec files; the `tight` text measure tried
  and withdrawn the same day (a story ran over its ask; `overlap` caught it). `spine.py` reads M7's
  new layout (`m7/reference/`, falling back to the old one) — the plan it writes is unchanged, day
  for day, for both courses. Geopardy gained two M7 units (Circles; Samples & Scale).
- **4 Oct 2026** — `kit/`: the shared build kit (see its section above), `tools/kit_manifest.py`,
  `tools/vendor_into.py`; `check.sh` and CI run the manifest check and the kit tests under both
  course profiles.
- **3 Oct 2026, later** — `tests/room-test/` (the four panel tests and `room.gs`); the reader's header
  comment no longer carries literal script tags (it is inlined into pages, where `</script` would end
  the block — found when the A7 console first loaded it); the console shipped in A7 against this
  reader and spine (vendored by A7's `tools/vendor_windmill.py`, commit recorded in `assets/windmill/VERSION`).
- **3 Oct 2026** — repository created by Croix ("It's called windmill"). First commit: `spine.py`,
  `validate.py`, `spine.json` (150 school days, 74 benchmarks, 253 IXL skills, 28 holidays, bell from
  Deckhand 7.38), `room.schema.json`, `room-reader.js` with both code forms, `benchmarks.json` v1,
  ten fixtures, `test.js` (14 checks), check/push scripts, CI.
