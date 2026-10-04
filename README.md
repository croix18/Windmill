# Windmill

The shared contract for Croix Shaffer's classroom tools — Deckhand, Cadence, Tally, Geopardy and the
Windy Hill lesson builds (A7 and M7) — so they can coordinate across the laptop and the Promethean
panel without merging into one app. Windmill holds the things every tool must agree on and nothing
else: the year's plan, the room, and the tests that prove a tool reads them the same way.

The full design is the *Room Coordination Plan* (a Claude doc, 3 Oct 2026); `HANDOFF.md` here is the
project memory.

## What is here

| Path | What it is |
|---|---|
| `spine/spine.json` | **The plan.** Every school day from 23 Sep 2026 to 28 May 2027: for each course the lesson, its benchmarks and IXL skills with due dates; the bell blocks and week colour for the day; holidays; the benchmark list with wording; the IXL skill → benchmark map. Generated, committed, validated. |
| `spine/spine.py` | Builds it from the three source repositories (A7's `tools/scope_calendar.py`, M7's `tools/mkscope.py` and IXL due-date CSV, Deckhand's baked bell block). Reads, never edits. Refuses to write a spine that fails `validate.py`. |
| `spine/spine.json` → `flow` | **The plan as a sequence** (4 Oct 2026: the plan follows the class). Per course: the lessons, reviews and tests in order, the school days, the rules (a test starts on a Monday or a Thursday; a flex day gives way when the class is behind), and the days the as-run log took out. `days` is this sequence laid by `kit/lib/flow.py`; a tool on the panel lays the rest of the year again from where a period really is with `kit/lib/flow.js`. |
| `plan/page.html`, `plan/make_page.py`, `plan/pagecore.js`, `plan/applylog.js`, `plan/bake_log.py` | **The plan on a phone.** `make_page.py` writes one self-contained page from the spine (both courses' year as the engine lays it, each day's benchmarks and IXL skills with the due date); it is published as a private claude.ai artifact (link in `HANDOFF.md`). On it Croix logs a day — a review day, a day with no class, "we began this lesson" — and the page lays the year again at once with the same engine. What he logs is kept in the artifact's database (`log`), where a session reads it and `bake_log.py` appends it to the courses' as-run CSVs. `plan/test_page.js` holds what the page shows to the spine, day for day and due date for due date. |
| `plan/test_flow.py`, `plan/test_flow.js` | The engine's tests: the rules on made-up and real sequences under random losses, the as-run log, and the Python and JavaScript engines against each other on some seven hundred scenarios. |
| `spine/validate.py` | The flow, laid again, gives exactly `days`. Every weekday has an entry or a holiday; every benchmark is in the Source of Truth; every IXL skill maps to a benchmark; due dates follow lessons; week colours alternate; the bell has every mapped period. |
| `room/room.schema.json` | **The room**: the small object the tools exchange. Parts `plan`, `tally`, `panel`, `roster`, `log`; one owner each; `at` on every part; data tiers (open · roster · standing-never). |
| `room/room-reader.js` | The reader every tool embeds: merges copies (newest per part), guards the tiers, parses both room-code forms, answers `unit`, `weak`, `bookmark`, `lessonFor`, `age`. Browser script or Node module, no dependencies. |
| `room/benchmarks.json` | The versioned benchmark list the compact room code indexes into. Changing the codes needs a version bump (`BUMP_LIST=1`), or the generator refuses. |
| `room/fixtures/` | Rooms for the conformance test: empty, plan-only, tally, panel, stale, conflicting copies, a newer version, a planted name, a planted score, a roster. Synthetic first names only. |
| `room/test.js` | **The conformance test.** `node room/test.js path/to/your/room-reader.js` — a repo that embeds the reader runs this in its own CI against its copy. |
| `kit/` | **The build kit.** The one code base that turns a lesson spec into its deck (pptx and the HTML console), teacher's edition, lesson plan and question documents, for both courses — gates, checks, drivers. Vendored into each course's `build/` by `tools/vendor_into.py`, held there by `kit/KIT.sha256`. Edit it here only. See `kit/README.md`. |
| `tools/check.sh` | Secrets and names guard, spine regeneration (when the sources are beside this repo) and validation, fixtures against the schema, the conformance test, the kit's manifest and its tests under both course profiles. `tools/push.sh` runs it, commits, pushes and verifies the remote head. |

## The room codes

Tally shows both. The readable line is typed on the panel:

    A3 W 8NSO13 8NSO14 7NSO11 O4 W 7GR13 7GR11

accelerated in Unit 3, its weakest benchmarks in order; on-level in Unit 4, likewise. The compact code
(Crockford base 32, a check character, the benchmark-list version inside) fits a QR on a printed sheet:

    4CG2-P5CD-3Q5T-AWG

A typo fails the check character; `O`/`0` and `I`/`1` are forgiven; a code made against another list
version decodes the units and refuses to place the benchmarks.

## Using the reader in a tool

```html
<script src="spine.js"></script>        <!-- window.SPINE = {...}  (vendored at build) -->
<script src="room.js"></script>         <!-- window.ROOM — written by Tally into the Drive folder (optional) -->
<script src="room.panel.js"></script>   <!-- window.ROOM_PANEL — written on the panel (optional) -->
<script src="room-reader.js"></script>
<script>
  const room = Room.load({ win: window, code: savedRoomCode, scriptJson: liveCopyIfAny, list: BENCHMARK_LIST });
  room.unit('acc');                              // 3, or null
  room.weak('acc', 3);                           // [{benchmark, atGoal, n, source}, ...] weakest first
  room.lessonFor('acc', today, period, SPINE);   // {lesson, stop, from: 'panel' | 'plan' | 'none'}
  room.age('tally');                             // days since Tally last published (Infinity if never)
  room.source;                                   // which copy each part came from
</script>
```

A missing script tag fails silently and the reader falls back to the plan. `Room.load` throws when a
copy carries a name in an open part, a score in the roster part, or a room version newer than the
reader; pass `allowProblems: true` to read the known fields anyway and show `room.problems`.

## Regenerating the spine

```sh
# with the three repositories checked out beside this one
python3 spine/spine.py            # or --a7 … --m7 … --deckhand …
bash tools/check.sh
```

**When a class loses a day** (or gains one), nothing here is edited by hand: add a line to the course's as-run log — `a7/reference/A7 As Run 2026-27.csv`, `m7/reference/M7 As Run 2026-27.csv`: a date and `review`, `off` or the code of the lesson the class began that day — run that course's calendar tool, then regenerate here. Everything after the date moves. Without Deckhand beside this repository the bell is kept from the spine already published.

Who owns what, in the sources: the A7 calendar is `tools/scope_calendar.py` in `croix18-windy-hill-a7`;
the M7 calendar is `tools/mkscope.py` in `windy-hill-m7` with the student-facing due dates in
`m7/reference/M7 IXL Due Dates 2026-27.csv`; the bell schedule is the config block baked into
`Deckhand.html`. Edit the plan there, then regenerate here.

## Rules

Single self-contained files on the school machine; nothing to install. Data travels by tier: open
parts carry counts, codes and times and never a person; the roster part carries first names and
seating by the Drive file (or encrypted on the live road); standing data — grades, scores, FAST
percentiles — is not in the schema and never leaves Tally. No real student names in this repository
or its tests. Tokens live in the git-ignored `.github-token` and never in a chat, a URL or a commit.
