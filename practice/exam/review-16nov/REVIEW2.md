# Adversarial review, round 2: the test on the site at `e427993`

Reviewed 16 Nov 2026 against `/home/claude/reviews/CHANGES-16NOV.md` (sections 1–9) and the code at HEAD `e427993` (branch
`exam`). The scope was `exam.js` from `0fc66c3` to HEAD, `public/teacher/testcard.js`, `worker.js`'s `flush`, and EXAM_NOTES
decisions 19–31. Nothing in `/home/claude/site-exam` was touched.

The new probes are the `r2_*` files in `/home/claude/reviews/site-exam/`, each run under Node 22 with `node:sqlite` and its output
saved beside it as `.out`. `r2_h.mjs` is round 1's harness with two changes: it pairs by typing Tally's four words (it opens the
trial record with Tally's key to get them), and it starts tests with the opening's start code. CPU is measured as in round 1, on
the same busy 2-core machine (load 8–10).

**Count: Critical 0 · High 2 · Medium 2 · Low 4 · Note 5.**

---

## High

### R2-H1. One student, without the code, can stop everyone behind the school's address from starting (and from being unlocked)
**What.** In `start` the wrong-code limit is checked **before** the code itself:
`if (count("pin", who) >= PIN_LIMIT) return 429`, and only then is the code compared. Once 60 wrong codes have come from one
address in a minute, every start from that address is refused for the rest of the minute, **including starts with the right
code**. The whole school is one address. A one-line loop of 60 wrong codes at the top of each minute needs no knowledge of the
code and keeps the class from starting all period.

`unlock` has the same shape. Once 30 tries from one address (`UNLOCK_ADDR`) have been made in a minute, the teacher typing the
right unlock code on a locked student's Chromebook gets 429.

Honest mistypes add up the same way. Every Start pressed with a lapsed code counts as wrong (`!(now < o.pin_until)` falls into
the same branch). With two classes starting at once, or a whole class retrying a lapsed code before New code is pressed, 60 is
within reach.

**Probes.**
- `r2_p01_recheck.mjs` ("H3 lockout"): `60 wrong codes {"403":60} -> a classmate with the RIGHT code: 429 {"error":"wait"}`,
  then `a minute later: 200`.
- `r2_p03_mistypes.mjs`: `right code refused after 60 wrong codes (and 60 good starts) in one minute`; `59 s later: 429 | 60 s
  later: 200`.
- `r2_p10_unlock_lockout.mjs`: `after 30 wrong tries from one student, the teacher's right code on a classmate's test: 429
  {"error":"wait"}`.

**Why it matters.** This is round 1's H3 (lock the class out) back again, and it is now cheaper: it no longer needs the pool or
the code. Nothing identifies who is doing it, and the teacher's only answer is to turn Start code Off.

**Smallest fix.** Compare the code first. A right code always passes, subject only to `START_LIMIT`. Only a **wrong** code
counts, and only wrong codes are refused once the count reaches 60. That still caps guessing at 60 a minute per address (see the
odds under "What held"). Do the same in `unlock`: a right code always unlocks, and the 30-a-minute limit applies to wrong tries
only.

### R2-H2. Anyone holding the current code can still take many tests and drain the pool (round 1's H1 and H3, narrowed)
**What.** The code limits *who* can start (anyone in the room, or anyone a classmate texts it to, for 15 minutes). It does not
limit *how many*. One browser that has the code gets as many tests as it asks for, up to `START_LIMIT` = 120 a minute per address
(doubled from 60):
- best-of-N codes still works (round 1's H1);
- the 120-test pool is gone in a minute, and every classmate then gets `empty`, and then `wait` (round 1's H3).

Each drained test is later finished at its deadline and sealed by the site through the board (`r2_p05`: about 5 polls and 15 rows
each). So a drain of 120 also leaves about 120 zero-point records in the day's results, and keeps the card polling every 5 s for
roughly 50 minutes.

**Probe.** `r2_p01_recheck.mjs`:
- `H1 one address, with the code, 4 starts: 200 200 200 200 | without the code: 403 {"error":"pin"}`
- `H3 drain with the code, one minute: { taken: 120, wait: 5, other: 0 } | a classmate now: {"error":"wait"}`

**Why it matters.** The attacker most likely to try this is exactly a student in the room, who has the code. **Add tests**
recovers 60 at a time, and the loop takes them again.

**Smallest fix.** One start per browser per opening. The test page keeps a random `device` id in localStorage and sends it with
`start`. The site keeps `sha(device)` per opening and answers a second start from the same device with the **same** test (a
resume) rather than a new one.

A console user can clear localStorage, so also cap starts per opening at the pool's `n`, refusing past "class size × 1.2" until
the teacher raises it. The board already shows `started`. Only a student identifier (round 1's H1(b)) closes this completely.

## Medium

### R2-M1. A student is never told the time allowed, and loses up to 20 s of work at the deadline
**What.** The deadline (`started + minutes`, §9) is pinned at Start but is in no response. `start` and `GET /api/test/<id>` carry
neither `deadline` nor `until`, and past the deadline (before the sweep) GET still says `status: "open"`. The page therefore has
no countdown. When the deadline passes, its next save gets 403 `closed`, and Finish commits only the **last saved** answers.
Everything typed since the last save (the page saves at most every 20 s) is dropped without a word.

**Probes.**
- `r2_p04_openings.mjs`: `GET past the deadline (no sweep yet): status open | keys
  test,started,now,rule,show,form,pub,answers,flags,n,status`.
- `r2_p09_leak_races_paths.mjs`: `deadline` appears in no student response.

**Why it matters.** With 60 minutes set and a long block, honest students hit the deadline unwarned. The record says
`ended: 'time'` and the teacher reads it as "ran out of time", while the student never saw a clock. The same is true of `until`.

**Smallest fix.** Add `deadline` (and `until`) to the start and reload answers. The page (K) shows the time left, saves at 60 s
and at 10 s before, and finishes with what it holds just before the deadline. The site could also accept a Finish whose answers
arrive within a few seconds' grace of the deadline.

### R2-M2. One student's largest record costs the teacher's board request 8–15 ms, and one failed board request stops the card
**What.** The site seals abandoned tests inside `GET /teacher/api/test/board`. A test finished with the largest answers (24 KB),
log (64 KB) and timeline (1,500 entries) the caps allow costs the board request that seals it **8.1–14.8 ms** of CPU under Node.
That is the record "that may not fit 10 ms" which §9 anticipates.

The site side holds: the try is counted and flushed first, so after two failures the test is left alone (`stuck`) and real tests
go on. The card side does not. `loadBoard()`'s error path calls `say()` but **never `schedule()`**, so after one failed board
request the card stops asking. That freezes the counts, stops the sealing of abandoned tests, and stops the refresh of the start
code's row, until the tab is hidden and shown again (or New code is pressed). The same happens after any network blip.

**Probes.**
- `r2_p05_chores.mjs`: `board requests that sealed the largest record, CPU ms: 12.86 10.70 14.76 11.83 9.92 8.14 | record bytes
  95543`.
- The card: read in `testcard.js`, `loadBoard`, where the rejection handler does not reschedule.
- Not tested: whether workerd really stops such a request (CloudFlare does not state a Durable Object's CPU limit on Free).

**Why it matters.** A student who can make the board fail can, through the card, stop the cockpit sealing everyone's abandoned
tests. With R2-H2, they can make many such records.

**Smallest fix.**
- Card: call `schedule()` from the error path too, with a backoff (5, 15, 60 s).
- Site: in the chore, skip a test whose `length(answers) + length(log) + length(timeline)` is over about 32 KB and count it as
  stuck. Its student's own seal still works. Or lower `LOG_MAX` to the honest log's real size.

## Low

### R2-L1. A test whose unit's bundle is missing keeps `pending` above zero forever, and the card polls every 5 s indefinitely
`chore()` returns before counting a try when the bundle is gone (`if (!t || !this.unit(...)) return null`), so the test never
becomes stuck. `r2_p05_chores.mjs`: `bundle gone: after 30 polls pending 1 stuck 0 chores 0`. That is 720 requests an hour from a
visible cockpit tab.

**Fix.** Leave such tests out of `pending` (count them separately, as "waiting for the unit"), or count the try.

### R2-L2. Close pressed after `until` stamps the close time, not `until`, when tidy ran in the last minute
`r2_p11_close_after_until.mjs`: `close 20 s after until, tidy skipped: finished - until = 20 s, ended teacher`. The
`/close` route calls `closeUnit(c, u, ms)`. The first teacher request after `until` does stamp `until` correctly (`= 0 s`).

**Fix.** `closeUnit(c, u, Math.min(ms, o.until))`.

### R2-L3. Two openings can share an id
A Close and an Open in the same millisecond give the new opening the old one's `opened`: `r2_p04_openings.mjs`, `new opened
1794924000000` (equal to the old). This is harmless to the store today: Close has already finished the old opening's tests, and
the same-ms save is refused with `finished`. But two openings' records then carry the same `site.opened`, and Tally's §7 flag
groups classes by it.

**Fix.** Keep the last opening id in `exam_cfg` and use `max(now, last + 1)`.

### R2-L4. The card's 90 s timer covers the whole draw and upload and is never reset on progress
This was read in the code, not run (it needs a browser). The `wait` timeout in `draw()` is set once and cleared only in
`done()`/`stop()`. Drawing 120 tests and sending 60 chunks of about 220 KB over school Wi-Fi can pass 90 s while still
progressing, and the card then says "The teacher copy didn't answer" with a partial pool. That is recoverable: the next Open
resets the pool, and an Add tests that stops halfway leaves only what it added.

**Fix.** Restart the timer on every message from the frame and on every chunk sent.

## Note
- **The start code's odds.** 30 characters, 4 of them. The `% 30` bias makes the most common character 1.14× the least, which
  is 19.62 bits, not 19.63. Under the 60-a-minute wrong-code limit, from `r2_p02_pin.mjs`:
  - one address has **0.111%** per code lifetime (15 min);
  - one address guessing all day (a new code each 15 min) has **3.06%**;
  - 100 addresses on one code have **10.5%**.
  
  Wrong and lapsed codes get the same answer (`{"error":"pin"}`), `status` says only `pin: true`, and the code is in no student
  response. The realistic leak is a classmate's text message, which is outside the promise.
- **Code forms.** Lower case and spaces or line breaks are accepted. Full-width characters, a hyphen inside, and `O` for `0` are
  refused (`r2_p02_pin.mjs`). A hyphen is a plausible thing for a student to type.
- **Words forms.** Case, tabs and non-breaking spaces are accepted. Commas, hyphens and no spaces each cost one of the five tries
  (`r2_p08_words.mjs`).
- **The pool route's nesting guard** costs 13–24 ms on a 4 MB body (`r2_p06_bounds.mjs`, `tooDeep 4 MB …`), before the parse.
  This is behind the password only. A real chunk of 2 is about 220 KB, so `CAP.pool` could be 1 MB.
- **Round 1's notes N1–N3, N5 and N6 are unchanged.** Approvals of kind `bank` are still ignored at Start (only `family`).

---

## Round 1's findings, re-run against HEAD (`r2_p01_recheck.mjs` unless named)

| # | Status | Output |
|---|---|---|
| C1 a test outlives its opening | **Closed** | Across days: `GET 200 finished · save 409 finished · row {"status":"finished","ended":"time","ms":7200000}`. Same day, +5 h: `save 403 {"error":"closed"} · row {"ended":"time","ms":7200000}`. With No limit, Close+Open in the same ms: `old test {"status":"finished","ended":"teacher"} … save: {"error":"finished"}` (`r2_p04`). With "No limit" set, the same-day half is open by the teacher's choice. |
| H1 best of N | **Narrowed** (needs the code); see R2-H2 | `4 starts: 200 200 200 200 · without the code: 403 {"error":"pin"}` |
| H2 Infinity breaks the results | **Closed** | `results JSON.parse: ok · {"away":1,"awaySeconds":0,…}` (the `1e308` entries are not counted; the sum is capped at the test's seconds) |
| H3 drain and lockout | **Narrowed / reopened**: the drain needs the code (R2-H2); the lockout no longer needs it (R2-H1) | `{ taken: 120, wait: 5 }` · `60 wrong codes → RIGHT code: 429` |
| M1 pairing without Tally | **Closed** | `trial answer: {"code":"VX8Y2036R3C4"}` (no words) · `confirm without words: {"error":"words","left":4}` |
| M2 CPU bombs | **Closed** for read and grade; the seal at the caps is still 8–15 ms (R2-M2) | 16 K-character read → 413 at 0.51 ms. Bounded answers grade as `unread` in 1.37 ms. The worst 200-character read has a median of ≤ 4.2 ms (`r2_p07`), and the worst grade step a maximum of 7.3 ms (`r2_p06`). |
| L1 11:59 pm open | **Closed** | `open {"error":"until"}` |
| L2 seal 500 with the bundle gone | **Closed** | `409 {"error":"unit"} · back: 200` |
| L3 deep log | **Closed** | `200 {"steps":12} 0.83 ms · log null` (a deep body commits the *saved* answers, as §6 says) |
| L4 unlock per test only | **Narrowed**: 30 a minute per address, but see R2-H1 | `unlock guesses a minute, one address, 8 tests: 30 refused 18` |
| L5 `until` not movable | **Closed** | `extend after a start: 200 {"ok":true,…}` |
| L6 unsealed test deleted at 7 days | **Closed** | `rows sealed · results 1 · page's seal: {"code":…}` |
| L7 loose away | **Closed** | `away: 1` from six entries, of which only `[0, 86400, "tab", "1"]` is well formed; `awaySeconds` is capped at `seconds` |
| N1–N6 | Unchanged (notes); N4 is Tally's | |

## What held (probed)
- **No leak before the seal.** `r2_p09`: 39 student responses for M7 and 62 for A7, including status, wrong and empty codes,
  reads of the keys, early grade and seal, finish, every grade and the reload. Not found:
  - any keyText (the keys now ride in `meta`, which is never sent);
  - any packed part;
  - `meta`, `deadline`, `pin_until`, `sibPart`, `ans`, `miss`, `prm`, `right`, `wrong` or `almost`;
  - the signing key's `d`;
  - the start code;
  - the trial's nonce.
- **The words never leave the site.** Not in any teacher response either: config, board, results, trial (`r2_p08`).
- **Races still give one result.** `r2_p09`: finish, finish and save at once give `200 409 409`. A seal, a board (chore) and a
  seal at once give one code and one record. 10 starts give 10 different tests.
- **The chore and the student's own grading at once.** `r2_p05`: verdicts stay consistent, the student's next step answers 200,
  and the student's page later gets the chore's code.
- **Path tricks on the new routes.** `/pin` and `/extend` with no cookie, a trailing slash, `%2e%2e`, and Origin `null` or
  another site all give 401 or 403 (`r2_p09`).
- **The start code.** Lapse is exact (1 ms before is 200, at `pin_until` is 403). An earlier opening's code and the code before
  New code are refused. Turning Start code back On without pressing New code leaves no valid code (`board pin: null`).
  `status` gives a boolean only (`r2_p02`).
- **Openings.** Extend on a lapsed opening (not yet tidied) or a closed one gives 409 `closed`. Reset while open gives 409
  `open`. A top-up during concurrent starts keeps `n = pool + started` (`{"n":4,"pool":1,"started":3}`). Re-opening over a used
  opening after the clock went back gives 409 `pool` (`r2_p04`).
- **Time allowed.**
  - It is pinned at Start: the config changed to 10 min after a start still saves at +30 min, and the deadline stays 120.
  - Both orders end correctly: until first gives `teacher` with `finished = until`; the deadline first gives `time` with
    `finished = deadline`.
  - `minutes` accepts 10, 600 and null, and refuses 9, 601, 10.5, `"120"`, 0, −5 and 1e9 (`r2_p04`).
- **Words.** Five tries held under 8 concurrent wrong confirms (4 × `words`, then `trial`). After five, even the right words get
  `trial` and the trial record is gone (404). A new trial resets the tries, and the old trial's code no longer confirms
  (`r2_p08`).
- **Bounds and the nesting guard.** Values over the bounds are not judged. Answers over 24 KB give 413. The nesting guard reads
  128 KB in under 0.8 ms (`r2_p06`).
- **Rows written and idle cost.** An idle cockpit writes 0 rows (24 polls). One abandoned test costs 15 rows to seal. One honest
  test is still 59 rows (plus index rows) and 95 requests, and an Open or Close of 120 is 121 rows each (`r2_p05`, `r2_p12`).
- **The card** (read again):
  - nothing is built with `innerHTML`, `insertAdjacentHTML` or `outerHTML` (grep), and every value goes through `Dash.el`'s
    `textContent`;
  - the `postMessage` listener still checks `e.origin === location.origin` and `e.source === frame.contentWindow`, and posts
    only to `location.origin`;
  - the words are typed, not shown;
  - polling stops while the tab is hidden;
  - a half-sent Open never calls `/open`, and the next Open resets the pool on its first chunk.

## Not tested, and why
- **workerd itself**: whether a Durable Object request over 10 ms is stopped on Free (R2-M2), and whether `ctx.storage.sync()`
  holds the input gate shut during the chore's await (in Node the await lets other requests in; they were harmless in `r2_p05`).
- **The card in a browser** (one shared browser; machine load): R2-L4 and the polling behavior were read in the code, not run.
- **The kit's test page**: whether it sends `pin`, handles 403 `pin`, or warns before a deadline. That is K's work, and the
  site's answers give it nothing to count down with (R2-M1).
