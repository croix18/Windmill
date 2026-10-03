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
| `spine/validate.py` | Every weekday has an entry or a holiday; every benchmark is in the Source of Truth; every IXL skill maps to a benchmark; due dates follow lessons; week colours alternate; the bell has every mapped period. |
| `room/room.schema.json` | **The room**: the small object the tools exchange. Parts `plan`, `tally`, `panel`, `roster`, `log`; one owner each; `at` on every part; data tiers (open · roster · standing-never). |
| `room/room-reader.js` | The reader every tool embeds: merges copies (newest per part), guards the tiers, parses both room-code forms, answers `unit`, `weak`, `bookmark`, `lessonFor`, `age`. Browser script or Node module, no dependencies. |
| `room/benchmarks.json` | The versioned benchmark list the compact room code indexes into. Changing the codes needs a version bump (`BUMP_LIST=1`), or the generator refuses. |
| `room/fixtures/` | Rooms for the conformance test: empty, plan-only, tally, panel, stale, conflicting copies, a newer version, a planted name, a planted score, a roster. Synthetic first names only. |
| `room/test.js` | **The conformance test.** `node room/test.js path/to/your/room-reader.js` — a repo that embeds the reader runs this in its own CI against its copy. |
| `tools/check.sh` | Secrets and names guard, spine regeneration (when the sources are beside this repo) and validation, fixtures against the schema, the conformance test. `tools/push.sh` runs it, commits, pushes and verifies the remote head. |

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

Who owns what, in the sources: the A7 calendar is `tools/scope_calendar.py` in `croix18-windy-hill-a7`;
the M7 calendar is `tools/mkscope.py` in `windy-hill-m7` with the student-facing due dates in
`Windy Hill M7/Reference/IXL DUE DATES 2026-2027 - M7.csv`; the bell schedule is the config block baked into
`Deckhand.html`. Edit the plan there, then regenerate here.

## Rules

Single self-contained files on the school machine; nothing to install. Data travels by tier: open
parts carry counts, codes and times and never a person; the roster part carries first names and
seating by the Drive file (or encrypted on the live road); standing data — grades, scores, FAST
percentiles — is not in the schema and never leaves Tally. No real student names in this repository
or its tests. Tokens live in the git-ignored `.github-token` and never in a chat, a URL or a commit.
