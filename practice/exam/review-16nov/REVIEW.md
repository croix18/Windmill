# Adversarial review: the test on the site (branch `exam`, `7157218..96eaec0`)

Reviewed 16 Nov 2026 against Windmill `practice/exam/DESIGN.md`, `kit/check/exam_site.js` and `kit/exam/seal.js`. Read-only on
`/home/claude/site-exam` and `/home/claude/windmill-exam`; nothing was edited, committed, pushed or deployed there. Every probe
below is in this folder (`/home/claude/reviews/site-exam/`). Each one drives the site's real `route()` (exam.js, with the teacher
gate and cookie from teacher.js) and `handle()` against an in-memory `node:sqlite` store, with the two real bundles in
`exam_units.js` (M7 Unit 10, A7 Unit 3). The harness is `h.mjs`, built the same way as `tools/test_exam.mjs`. Run one with
`node <probe>.mjs`; its output is saved beside it as `<probe>.out`. CPU is `process.cpuUsage()` around one request, measured the
way the builder measured it, on this busy 2-core machine (load average 7 to 10).

**Count: Critical 1 · High 3 · Medium 2 · Low 7 · Note 6.**

The cryptographic core holds:
- No key, verdict or packed part reaches a student before the seal.
- The signing key never leaves the store.
- A record is signed, locked, and opens only with the Tally key that was proven when the test opened.
- A test finishes once, and races between requests do not produce two records.

The holes are around the record, not in it:
- A test is not tied to the opening it was started in.
- One student can take as many tests as they like and turn in the best code.
- One crafted log can break the teacher's results list for a whole day.
- One student can drain the pool for everyone.

---

## Critical

### C1. A test outlives its opening: Monday's unfinished test comes back to life when the unit is opened again
**What.** After a close (or `until`), a started test stays `open` in `exam_test` for 7 days. `save`, `read` and `finish` check
only `closedFor()`, which is `!openRow(course, unit, now)`: is *this unit* open now? Nothing checks that it is the same opening
the test began in. When Croix opens the unit again on another day (for make-ups, or after a drained pool), every unfinished test
from the earlier opening can be saved and finished again. The student has had the questions all night: they arrive in full in
`pub` at Start, so the copy-blocking does nothing against a console. The new opening's board does not count these tests in
`started`, but does count them in `finished`.

**Probe.** `p03_resume_across_days.mjs`:
```
Mon start 200 started 2026-11-17T14:00:00.000Z
Mon 10pm save: {"error":"closed"}
Tue GET (the same questions, kept overnight): 200
Tue save of answers worked out overnight: 200 {"ok":true}
Tue seal: 200 points 24 / 24 seconds 64800
clear row: [{"points":24,"of":24,"seconds":64800,"day":"2026-11-18"}]
board: {...,"started":0,"finished":1}
```

**Why it matters.** DESIGN's promise 4 is "A test exists only while Croix has it open." Here a test exists across openings, and
a student gets a better record than they earned. The only sign is `seconds` (18 h) and a `site.started` on an earlier day. Tally
flags "a finish outside the period", not a start on another day.

The same gap exists inside one day. The test is open from morning to 4:15 pm and there is no per-test time limit, so a
6th-period student can Start in 1st period from anywhere, read the test all day, and answer in 6th period. That record shows a
`seconds` of several hours, but nothing refuses it.

**Smallest fix.**
- Stamp each `exam_open` row with an opening id (`opened`, which already exists) and copy it into `exam_test` at Start.
- `closedFor` becomes "no open row, or `open.opened !== t.opened`".
- Optionally add a time limit (for example `until` or `started + 90 min`, whichever comes first), checked in save, read and
  finish.
- Have Tally flag `site.started` outside the period as well as the finish.

## High

### H1. One student can take any number of tests and turn in the best code
**What.** `start` has no idea who is starting. Within the limit of 60 a minute per address, one browser can start test after
test of the same unit. Each finishes on its own, and each seal shows the score (and, with "Score and which were right", every
part's verdict). The student turns in whichever code they like. A throwaway test also works as a practice run that reports
right/wrong, on the same kinds of question, before the real one. Nothing in a record ties it to a person, so Tally can only see
"codes nobody claimed", and cannot see who made them.

**Probe.** `p02_many_tests.mjs`: three starts from one address all give 200 and three codes. The board says `started: 3,
finished: 3`. The clear results list three unrelated codes.

**Why it matters.** This is a better record than earned, with no attribution. Detection rests on Croix noticing that `started`
exceeds the number of students in the room, or that Tally shows unclaimed codes.

**Smallest fix.** Croix's decision, because it touches "no name kept anywhere":
- **(a) Start PIN.** The cockpit shows a short start PIN, changed each period. `/start` requires it, and refuses a second start
  from the same browser within the opening (a cookie or a localStorage token). This is cheap but does not fully close the hole.
- **(b) Student number.** `/start` takes the student's Focus number. The site keeps only a salted hash of it, allows one start
  per number per unit per day, and the record carries the hash so Tally can match it to its roster. This closes the hole and is
  still not a name.

### H2. One crafted log makes the day's results unreadable, permanently
**What.** At the seal, `awaySec` is the sum of `log.away[i][1]` where each value is `Number.isFinite` and `> 0`. Two values of
`1e308` are each finite, but their sum is `Infinity`. SQLite stores that as REAL `Inf`. `results()` then writes the JSON by
string concatenation, so `"awaySeconds":Infinity` ends up in it, which is not valid JSON.

**Probe.** `p01_away_infinity.mjs`:
```
row: [...{"code":"Q2V2TYH6QQ0Y","away":2,"away_sec":null,"ty":"real"}]
results records=0 200 JSON.parse FAILS: Unexpected token 'I', ..."ySeconds":Infinity,""... is not valid JSON
results (with records) 200 JSON.parse FAILS: ...
row3: [{"away":4,"away_sec":100000000000000000000}]
```

**Why it matters.**
- In the cockpit's Results row, `r.json()` fails. `call()` turns that into `{}`, and `j.results.length` then throws, so the list
  and **Download for Tally** stop working for that day, for every student.
- The records are kept forever, so that day stays broken.
- These are exactly "the scores that survive a lost key".
- The course and unit filters do not help, because the bad row is in the same course and unit as everyone else's.

Not tested in workerd: if the Durable Object's SQLite refuses to bind `Infinity` instead, that student's seal fails with a 500
and they never get a code. That would hurt only the attacker.

**Smallest fix.**
- At the seal, clamp each away length to `0..86400` with `Math.min`, and the sum to the test's own `seconds`.
- In `results()`, write numbers with `JSON.stringify(Number.isFinite(x) ? x : null)`, or build the objects and stringify them.

### H3. One student's loop empties the pool and locks the class out (disclosed, not closed)
**What.** Starts are limited to 60 a minute per address, and the whole school shares one address. A three-line console loop
uses up the 60 each minute, so every classmate gets 429 for that minute. It takes all 120 tests in about 2 minutes, after which
everyone gets 409 `empty`. Croix's remedy, Close and Open again, costs 62 requests and 240 rows written, and the loop just does
it again. Nothing identifies who did it.

**Probe.** `p12_drain.mjs`:
```
a classmate's start in minute 1, same address: 429 {"error":"wait"}
{ startsTaken: 120, refused429: 3, emptyAfter: 77, minutesUsed: 4 }
a classmate's start now: 409 {"error":"empty"}
board: {..."pool":0,"started":120,"finished":0}
```

**Why it matters.** One student can cancel test day for everyone. EXAM_NOTES discloses this ("not closed off"), but it is the
easiest attack on the list.

**Smallest fix.** The same start PIN as H1(a): only someone in the room can start a test, so a loop from home or from another
class gets nothing. Also add a Pause starts control on the cockpit's card.

## Medium

### M1. "Proven" pairing is not proof: the code `/trial/confirm` wants is in the cockpit's own `/trial` answer
**What.** `confirm` checks only that `code` equals the newest trial's code. The cockpit gets that code from `/trial` and shows
it, along with the four words. Clicking **It matches** without Tally ever opening the trial marks the key proven, and the test
can then be opened. A key whose private half nobody holds is accepted.

**Probe.** `p18_pairing.mjs`: a key whose private half was thrown away gets `confirm` 200 `{"proven":true}`, and `open` then
succeeds.

**Why it matters.** "A record is never sealed to an unproven key" depends entirely on Croix comparing the words correctly. If he
mis-clicks after pasting the wrong key, a whole day's records cannot be opened. Only the clear scores survive.

**Smallest fix.**
- Do not show the words in the cockpit.
- `confirm` takes the four words as Tally shows them. The site recomputes `words(nonce, sitePub, tallyPub)` and compares.
- Only a Tally that opened the trial knows the nonce.

### M2. Requests that cost far more than 10 ms of CPU (and block the single object)
**What.** The judge runs on whatever text arrives, up to the route caps: 16 KB for a read, 64 KB of answers at Finish.
Exponent towers are bounded, so they are cheap. Long flat expressions are not.

**Probes.**
- `p13_read_bomb.mjs` (`.out` for M7 and A7): one `read` of `1+1+…` (8,000 terms) costs 21–51 ms. `1/1/…` (5,000) costs
  10–36 ms. Brackets 8,000 deep cost 4–21 ms. A real answer costs about 1 ms.
- `p14_grade_bomb.mjs`: a grade step whose two parts each hold about 30 KB of `1+1+…` costs **89 ms** (M7) and **99 ms** (A7).
- `p06_cpu_hostile.mjs`: the largest seal the caps allow (64 KB of incompressible answers, a 96 KB incompressible log and a
  3,000-entry timeline; the record is 171 KB) costs 12.5–21 ms, median 14.7 ms. The builder's worst case was 6 ms with a 96 KB
  log only.

**Why it matters.**
- If the object is held to 10 ms on Free, the attacker's own grade or seal fails. That hurts only them.
- If it is not (Cloudflare's page says 30 s), each such request holds the one SiteStore. That store also serves announcements,
  the FAQ, approvals and push. One test sends 40 reads at once, then one every 1.5 s, which is about 2 s of blocking per burst,
  and the attacker can repeat it with every test they start (H1).

**Smallest fix.** Refuse oversized input before judging. No 7th-grade answer is long, so for example:
- a read's `text`: at most 200 characters;
- each `answers` value at Finish: at most 200 characters, or 400 for box arrays (anything longer is `unread`);
- the save and finish answers cap: 8 KB;
- the timeline: at most about 600 entries.

## Low

### L1. Opening a test between 11:59 and midnight gives an `until` already past, and `open` still answers `ok`
`p08_time.mjs`: `now 11/17/2026, 23:59:30 -> until 11/17/2026, 23:59:00 <-- NOT IN THE FUTURE`. The test opens already closed,
and the card says "open until 11:59 PM". DST days are fine: 8 Mar and 1 Nov 2026 all give 4:15 pm.

**Fix.** If `untilDefault(now) <= now`, use `now + 15 min`, or refuse with 400.

### L2. The seal is a 500 forever while a unit's bundle is missing
`p17_unit_gone.mjs`: grading answers 409 `unit`, which is fine, but the seal answers `500 {"error":"server"}` on every try,
because `B.server.summary` is read from a null bundle. This happens if a deploy leaves out a unit while its tests are finished
but not yet sealed. It recovers once the bundle is back.

**Fix.** At the seal, answer 409 `unit` when `B` is null, as grade does.

### L3. A deeply nested log makes Finish a 500, contrary to "a broken log is kept as null"
`p06_cpu_hostile.mjs`: a log nested 60,000 deep gives `500 {"error":"server"}` (12.7 ms), and the test stays open.
`JSON.stringify` overflows the stack inside the `try`. Only a hostile page sends this.

**Fix.** Wrap the stringify in its own `try` and fall back to `log = null`.

### L4. The unlock code: 5 tries a minute *per test*, and the site enforces no lock at all
`p16_unlock.mjs`: with 10 tests started in the same minute, one address gets 22 guesses before the minute is out, and in
general about 5 × 60 = 300 a minute (each start also uses up a pool test).
- The site keeps no lock state. A "locked" test still saves and finishes, because the cover is only on the device.
- "End after N" relies on the page sending `ended: "left"`; a page that leaves it out gets `ended: null`.

DESIGN does call the device's account evidence, but the cockpit's wording suggests the site enforces the lock. The record does
carry `rule`, `unlocks` and `log.away`, so Tally can show "left 5 times under Lock after 2, unlocked 0 times."

**Fix.**
- Have Tally flag `log.away.length > rule.after` together with `unlocks == 0` or `ended == null`.
- Rate-limit unlock per address as well as per test.

### L5. `until` cannot be changed once anyone has started
`p21_until_retention.mjs` (a): reopening with a later `until` gives `409 {"error":"pool","n":3}`, because `open` requires every
pool test to be unused. To give a class extra time, Croix has to Close, which commits everyone's last save, and then Open again
with a new pool. With C1, reopening also revives every in-progress test.

**Fix.** Add a `POST …/extend {course, unit, until}` that only moves `until`.

### L6. A test finished but never sealed disappears after 7 days with no record and no clear score
`p21_until_retention.mjs` (b): finished but not sealed (for example, the Chromebook was shut during "Grading…"). Its answers and
the device log sit in the clear for 7 days, then the row is deleted. Nothing is left in `exam_result`, and the page's seal then
gets 404. The board counted it as finished, so Croix never learns that a grade is missing.

**Fix.** Have the tidy step seal these tests itself (grading what remains) before deleting them, or at least list them on the
board.

### L7. The clear `away` and `awaySeconds` are computed loosely from a hostile `log.away`
`p01_away_infinity.mjs` row3: `away: 4` counts a string entry `"x"`, and `awaySeconds` adds `"7"` as 7 and drops -50. Tally's
own count from the opened log can disagree with the clear summary. This is device evidence either way.

**Fix.** Count only well-formed `[at, sec, kind, q]` entries with `0 ≤ sec ≤ 86400`, in both places.

## Note

- **N1. A read's CPU depends slightly on correctness** (`p05_read_timing.mjs`). For the key against a wrong answer of the same
  form on M7 part 9, the medians are 0.72 and 0.93 ms, so about 0.2 ms apart. Detecting 0.2 ms through Chromebook Wi‑Fi jitter of
  10 ms or more, at the read limiter's 1 every 1.5 s, would take thousands of samples per guess, so it is not practical. `ok` and
  `pretty` themselves never depend on correctness (`p04_read_oracle.mjs`: 0 of 45 text parts read the key and a one-digit-wrong
  answer differently).
- **N2. The judge's coercions** (`p19_hostile_answers.mjs`, 725 hostile answers). It accepts `true` for choice 1, `"3"` or `[3]`
  for choice 3, `["16"]` for "16", `"x = 16"` or `"16=16"` for 16, a multi-select with its choices repeated or reordered, and a
  number line with extra fields. Every accepted answer is the same answer in another shape. Nothing that is not the key was
  judged right: all choices at once, "16 or 1", two answers in one box, and an MC index out of range are all wrong.
- **N3. Records by code are public (CORS `*`).** 60 random bits, so they cannot be guessed. A code shown over someone's shoulder
  can be turned in as one's own. Tally's duplicate-code flag is the only defense, as DESIGN says.
- **N4. For Tally's builder.** `parts[].typed` and the whole `log` are student-controlled data inside a genuinely signed
  record. Tally must render them as text, never as HTML. (The site's `read.pretty` is HTML that the student's own page puts in
  with `innerHTML`, which is only self-XSS. The markup probes in `p14` returned empty.)
- **N5. The public practice page carries the unit's whole engine (generator, keys, solutions).** A student who can program could
  solve the drawn questions with it. That is the same class as Photomath or "someone else doing the mathematics", which DESIGN
  already excludes. I did not review what `pub` holds (see below).
- **N6. Approvals of kind `bank` are ignored at Start** (only `family` is checked, `exam.js` start). This is harmless only if a
  "Like the real test" set never holds a bank item. That was reasoned from the code, not run.

---

## The Free plan
- **Claims checked.** `p11_rows.mjs`:
  - An Open of 120 writes 121 rows (240 with the primary-key index), and a Close the same.
  - One honest test (40 saves, 40 reads, Finish, 12 grade steps, the seal) writes 59 rows, plus about 6 index rows, so about 65.
    That matches EXAM_NOTES.
  - That test is 95 requests, against the claim's ~100.
  - 150 students is about 10,000 rows written and about 15,000 requests a day, against 100,000 of each. The claims hold.
- **Not covered by the budget.**
  - Any visitor can spend the day's 100,000 requests by looping any route (disclosed).
  - `GET /api/test/<id>` has no limiter and returns the whole public half (10–27 KB, about 100 KB for A7 U3) every time.
  - The hostile CPU costs in M2.
- **The single most likely way a normal day hits a limit.**
  - Not Cloudflare's: on an honest day every Free counter stays under a fifth.
  - It is the site's own **60 starts a minute per address**. The school is one address, so if more than 60 students press Start
    in the same minute, the 61st onward get 429 for the rest of that minute. That means two full classes starting together, or a
    class plus anyone else at Windy Hill on the site. The page reports this as a failure to reach the site.
  - Among Cloudflare's limits, the closest is the seal's CPU with a near-96 KB log (builder: median 4–6 ms, tail about 11 ms under
    Node). That matters only if a Durable Object on Free is held to 10 ms, which Cloudflare's page does not say and which I could
    not test.

## Builder's claims I checked and found TRUE
- `exam/seal.js` is byte-identical to Windmill's `kit/exam/seal.js` (`cmp`).
- Nothing to steal before the seal. `p20_presel_leak.mjs` searched 49 responses for M7 and 89 for A7 (start, get, save, every
  read, unlock, early grade and seal, finish, every grade, get). It found no keyText, no packed-part prefix, no `sibPart`, `ans`,
  `miss`, `prm`, `right`, `wrong` or `almost`, and not the signing key's `d`. 500s say only `{"error":"server"}`.
- `read` is never right or wrong: `ok` follows readability only (`p04`).
- One finish, one record. Under `Promise.all` (`p10_races.mjs`):
  - finish, finish and save at once give 200, 409, 409;
  - grade steps 0,0,0,1,1 at once give 4 verdicts and no double judging;
  - three seals at once give one code and one record;
  - 10 starts at once give 10 different tests.
- The record is DESIGN's, field for field (`p15_record.mjs`): `v,id,code,course,unit,cv,kit,seed,site,rule,ended,unlocks,parts,
  points,of,log`, with part fields `id,type,typed,v,almost,key`.
  - `rule` is pinned at Start: changing it afterwards did not change the record.
  - The record is locked to the key proven at Open. A key pasted mid-day does not open it (`key`), and the original key does.
  - The clear row agrees with the record for an honest log.
  - After the seal, the test row keeps no answers, halves, log or verdicts.
- The teacher's routes reject every trick tried (`p09_paths.mjs`):
  - no cookie, a forged cookie, Origin `null` or another site's Origin, and a body that is not JSON;
  - `//`, a doubled `//` inside the path, a trailing slash, upper case, `%63onfig`, `..` and `%2e%2e`, `..%2f`, and HEAD, PUT,
    POST and OPTIONS against GET routes;
  - every result is 401, 403, 415, 404, or a path that never reaches `exam.js`.
- SQL: every value is bound. The only string-built SQL takes column names from a fixed set and fixed `AND …` fragments.
- `__proto__` and `constructor` keys in answers or the log do not pollute anything (`p06`). 10,000 answer keys are refused by
  the 64 KB cap (`p06`, `p07`). A string log is kept as given (`p06`). 500 KB of junk beside a small log is fine, at 1.6 ms
  (`p06`).
- `untilDefault` gives 4:15 pm school time on both DST change days and around them (`p08`).
- The cockpit's card builds everything with `textContent` (`Dash.el`), and none of the `innerHTML` in `testcard.js` takes data.
  The `postMessage` listener checks `e.origin === location.origin` and `e.source === frame.contentWindow`, and posts only to
  `location.origin`. This was checked by reading the code.
- Privacy, by reading the code and `p21`:
  - No address is stored: a salted hash, with the salt made per object, is held in memory for a minute for the start limit.
  - No user agent is stored by the site, and no name.
  - Answers and the device log are in the clear only until the seal, or for at most 7 days if the test is never sealed (L6).
  - A visitor without the password can list nothing.
- Tokens are 128 random bits, stored only as SHA-256. Test ids are 64 bits. Codes are 60 bits.
- Rows written and requests per test match EXAM_NOTES (above).

## What I could not test, and why
- **workerd itself.** How DO SQLite binds `Infinity` (H2), the CPU limit a Durable Object actually gets on Free (M2 and the
  seal), and `caches.default` for the status. Everything ran under Node 22 with `node:sqlite`, as the builder's checks do, and
  not through `wrangler dev`, to keep the machine free.
- **The real public half (`pub`)** that `exam_pool.js` draws in a teacher copy (it needs Chromium and the teacher copy). The
  probes use the bundles' samples with a synthetic `pub`. Whether a real `pub` holds anything answer-shaped is the kit's
  `exam_pool.js` and its check. I read `skel` and saw no key, but did not run it.
- **The test page and the cockpit in a browser** (one shared browser was ruled out). The card was reviewed by reading the code.
- **Edge caching or poisoning of `/api/test/status`.** Reasoned only. The cache key is the path plus `course` and `unit` as
  given, and the object answers from the same two parameters, so they cannot disagree.
