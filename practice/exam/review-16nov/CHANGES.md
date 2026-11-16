# The test — changes after the adversarial review (16 Nov 2026, 10:15 am)

An independent reviewer attacked the site's side (`REVIEW.md` beside this file; a second pass after the fixes is `REVIEW2.md`).
The test page was attacked next (`TEST-PAGE-REVIEW.md`), and Tally's Tests twice (`TALLY-REVIEW.md`, `TALLY-REVIEW2.md`). Each
reviewer ran a probe for every finding; the probes' essence is in the site's `tools/test_exam.mjs`, the kit's
`check/exam_page.js` and Tally's `tests/exam-*.js`. Paths under `/home/claude/reviews/` in these files were the reviewers'
working folders in the session that ran them.
The lock itself held. The holes are around it. This file is the contract for closing them; it overrides
`practice/exam/DESIGN.md` wherever the two differ, and will be folded into DESIGN.md (the kit's builder does that, §K).
Sections: **S** = the site, **K** = the kit (test page, stand-in), **T** = Tally. Read every section — the pieces must agree.

## 1. A test belongs to its opening (review C1)
- Each opening has an id: `exam_open.opened` (ms). It is copied into the test at Start. A test is **live** only while the
  opening it was started in still exists and `now < until`. A unit opened again is a new opening: tests of the old one are
  not live, whatever the unit's state.
- A test that is not live: `save`, `read`, `unlock` → `403 {error: 'closed'}`; `finish` is taken once and commits the last
  **saved** answers with `ended: 'teacher'` (as now).
- The record gains `site.opened` (the opening's id). The clear results rows gain `opened` and `started`.

## 2. A start code, good for 15 minutes (review H1, H3, and the absent student at home)
Croix opens a test; the cockpit shows a four-character **start code** and how long it is good for; students type it to start.
When it lapses nobody can start until he presses **New code**. Tests already started are untouched.
- **S** `exam_open` gains `pin` and `pin_until`. A code is 4 characters of `23456789ABCDEFGHJKMNPQRSTVWXYZ` (no 0 1 I L O U),
  fresh randomness. `open` makes the first one. `POST /teacher/api/test/pin {course, unit}` → `{pin, until}` makes a new one
  (15 minutes: `START_WINDOW_MS`). The board's rows gain `pin`, `pinUntil`. The config gains `startCode: true | false`
  (default `true`; `PUT` takes it); with it off no code is asked for and starts are as before.
- **S, K** `GET /api/test/status?course=&unit=` → `{open, pin}` (`pin`: a start code is asked for — a boolean, never the
  code). `POST /api/test/start {course, unit, pin}`: with `startCode` on, a missing, wrong or lapsed code → `403 {error:
  'pin'}` (compared after upper-casing and stripping spaces). Wrong codes are limited to 60 a minute per address (`429 wait`).
  A reload (`GET /api/test/<id>`, token) never needs a code.
- **K** The Start screen: when `status.pin` is true, one box of four characters above Start — placeholder `Start code`,
  upper-cased as typed, no other words. A refused code: the box shakes and clears, as the unlock box does. The words list
  gains **Start code** and nothing else. The stand-in gets the same routes (`cfg.startCode`, a pin per opening,
  `POST /teacher/api/test/pin`) so the page check covers: no box when off; refused when empty, wrong and lapsed; accepted
  when right, in lower case and with a space.
- **S** The starts' limit by address goes from 60 to 120 a minute (two classes behind the school's one address).
- **S** The cockpit's card: beside an open test, `Start code  7K4M  · 12:40 left` with **New code**; when it has lapsed,
  `No start code` and **New code**. In the settings: Start code — On · Off.

## 3. The pool can be topped up while a test is open; a test's time can be moved (review H3, L5)
- **S** `PUT …/pool/<course>/<unit>` without `reset` is accepted while the test is open and raises the opening's `n`;
  `reset` while open is still `409 open`. The card offers **Add tests** (draws 60 more) once fewer than 30 are left.
- **S** `POST /teacher/api/test/extend {course, unit, until}` → `{ok, until}` (in the future, at most 18 h ahead): moves an
  open test's `until`. The card: the time beside an open test can be changed.
- **S** (review L1) `open` never answers with an `until` that is not in the future: between 11:59 pm and midnight it is
  `400 {error: 'until'}`.

## 4. No test is lost (review L6)
- **S** A test still `open` whose opening has ended is finished by the site (lazily, on the teacher's requests): the last
  saved answers, `ended: 'teacher'`, `finished` = the moment the opening ended.
- **S** A test finished and not sealed three minutes later (the lid was shut during Grading…) is graded and sealed by the
  site, a few steps a request (keep each request small: at most 3 grade steps or one seal). The board says how many are
  waiting (`pending`), and the card asks again every 5 s while that is not zero. The student's own page still finishes the
  job if it comes back first (same code either way: the seal is once).
- **S** Retention: a row is deleted 7 days after its start only if it is sealed or was never finished and holds no saved
  answer; a finished test is never deleted unsealed.
- **T** A record nobody turned in is shown with its opening and its start and finish times, and Croix can give it to a
  student by hand (and take it back).

## 5. The pairing is proven, not agreed to (review M1)
- **S** `POST /teacher/api/test/trial` → `{code}` only. The cockpit does **not** show the words.
  `POST /teacher/api/test/trial/confirm {code, words}`: the site computes `words(nonce, sitePub, tallyPub)` itself and
  compares (lower-cased, spaces collapsed); wrong → `409 {error: 'words'}`; five wrong tries end that trial (`409
  {error: 'trial'}`; a new trial is needed). Only a Tally that opened the trial knows its words.
- **S** The card: the trial code, a box for "the four words Tally shows", **Confirm**.
- **T** Unchanged in substance: Tally shows the four words. Its line under them says to type them into the cockpit.

## 6. A hostile page cannot break the teacher's side or cost real CPU (review H2, L3, L7, M2)
- **S** `log.away` is counted only from well-formed entries `[at, sec, kind, q]` with `0 ≤ sec ≤ 86400` (a number); `away`
  is their count and `awaySeconds` their sum, capped at the test's own `seconds`. The results answer is built so it is always
  valid JSON (no `Infinity`, no `NaN`). A log that cannot be turned to text (nested too deep) is `null`; the test finishes.
- **S** Input the judge is given is bounded before it is judged: a read's `text` and each typed answer at most 200
  characters; an answer that is an object or list (a choice, a multi-select, boxes, a number line, a circle graph) at most
  2 KB as JSON and each string inside at most 200 characters; anything over is not judged — a read answers
  `{ok: false, pretty: ''}`, a grade step gives `unread`. `save`'s and `finish`'s answers at most 24 KB. The site's own
  timeline at most 1,500 entries. `LOG_MAX` is 64 KB (the honest log's caps add up to well under that).
- **S** (review L2) the seal answers `409 {error: 'unit'}` when the unit's bundle is missing, as grade does.
- **S** (review L4) unlock is limited by address as well (30 a minute) besides 5 a minute a test. `GET /api/test/<id>` gets a
  limit like the reads' (20 at once, then one every 3 s).
- **T** (review N4) `parts[].typed` and everything in `log` are the student's own data inside a genuinely signed record:
  shown as text, never as HTML, never trusted for length or type.

## 7. What Tally flags (review C1, H1, L4)
- **T** A record whose start or finish is far from its class's others: with five or more records in the class for that
  unit and day, a start more than 20 minutes before the class's median start or after its median finish — "taken at
  9:12–9:40 am; the rest of this class took it 1:05–1:50 pm" — and any record whose `site.opened` differs from the class's
  most common one. If Tally knows the class's period, a start or finish outside it too.
- **T** Left the test more times than the rule allowed with nothing to show for it: `rule.leave: 'lock'` and
  `log.away` longer than `rule.after` with `unlocks: 0`; `rule.leave: 'end'` and `log.away` at least `rule.after` with
  `ended` not `'left'`.
- **T** A sitting far longer than the class's (`seconds` over twice the class median), and `ended: 'teacher'` (it did not
  finish: the site closed it with what was saved).

## 8. Folded into DESIGN.md (K does this; these are the site builder's findings, verified by the reviewer)
- A pool chunk is 2 drawn tests a request (five of the largest unit's cost 7–8 ms).
- The pool's private half is one row a drawn test, the packed parts one a line (rows written is the Free plan's tightest
  daily limit).
- Tests go out in the order they were drawn. The rule and Tally's key are pinned to a test at Start and at Open.
- Cloudflare's script limit is no longer 3 MB compressed; the build checks the Worker's size and its start-up anyway.
- Publish a unit's new bundle only while that unit's test is closed.
- The sections above (1–7), each in its place; the words list with **Start code**; the record with `site.opened`; the
  teacher's routes with `pin`, `extend`, the trial's `words`, the config's `startCode`.

## 9. Time allowed (added 10:50 am, after the site's second pass: the same-day half of review C1)
The start code limits when a test can be *started*; a test started in 1st period could still be answered in 6th. So a test
also has a time allowed, set in the cockpit.
- **S** The config gains `minutes`: a whole number from 10 to 600, or `null` for no limit; default **120**. It is pinned to a
  test at Start as its deadline (`started + minutes`). A test is live only while its opening is live **and** its deadline has
  not passed. Past the deadline: `save`, `read`, `unlock` → `403 {error: 'closed'}` (exactly as when the test closes, so the
  page needs nothing new); `finish` commits the last saved answers with `ended: 'time'`; the site's own finishing of
  abandoned tests uses `finished` = the deadline and `ended: 'time'`.
- **S** The record gains `site.limit` (minutes, or `null`). `ended` is now `null | 'left' | 'teacher' | 'time'`.
- **S** The card's settings: **Time allowed** — 60 min · 90 min · 120 min · No limit.
- **S** (found while reading the second pass) The site's own sealing of abandoned tests must not be able to break the
  board: count each try on the test before making it, and leave a test alone after two tries that did not end in a seal
  (its student's page, or a later look, can still seal it). A record built from the largest hostile answers and log is the
  one request that may not fit 10 ms; it must cost its author a code, never the teacher the board.
- **T** `ended: 'time'` is shown and flagged as `'teacher'` is ("ran out of time: the site closed it with what was saved");
  `site.limit` is shown with the rule.
- **K** DESIGN.md only: the config's `minutes`, the record's `site.limit` and `ended: 'time'`, "live" in What airtight means.

## 10. After the second review of the site (11:30 am; `/home/claude/reviews/site-exam/REVIEW2.md`)
- **S** (R2-H1) A limit by address may never refuse a right code. For Start's code and for Unlock: the code is checked
  first; a right one is accepted whatever the address has done; only wrong ones are counted, and past the limit a wrong one
  answers `429 wait` instead of `403`/`{ok: false}`. (The per-test unlock limit, 5 a minute, stays as it is: it can only
  stop that test's own student.) One student with a script must not be able to keep a class from starting or a teacher
  from unlocking.
- **S, K** (R2-H2) **One start a browser, an opening.** The page makes a random id once (`exam.dev` in localStorage, 32 hex)
  and sends it with Start: `POST /api/test/start {course, unit, pin, dev}`. The site keeps its hash on the test and
  refuses a second start from the same id in the same opening: `403 {error: 'again'}`. A missing or malformed `dev` is
  `400 {error: 'body'}`. On the page `again` is shown exactly as a refused code is (the box shakes; with no box, Start
  shakes): no new word. A new opening (a retake day) starts clean. The stand-in does the same. (A second browser or a
  cleared one still gets a test; this stops New test and the second tab, which is what a child without a script would do.)
- **S, K** (R2-M1) **Nothing typed is lost at the end of the time.** Start, the reload and every save's answer carry
  `ends`: the moment (ms, the site's clock) this test stops being live — the sooner of the opening's `until` and the test's
  deadline; it moves when Croix extends the test, and the page takes the newest it is given. The page saves three seconds
  before `ends` and finishes at `ends` (the ordinary Finish path, so those answers are the ones committed). The stand-in
  gets `ends` too (`until` only is enough there) and the check covers it: typed up to the last seconds, all of it in the
  record.
- **S** (R2-M2 and the Lows) The card keeps asking for the board while a test is open, whatever one answer was (a failed
  answer waits longer before the next: 5 s, 10 s, 20 s, at most 60 s; back to normal on the next good one; nothing while the
  tab is hidden). A finished test whose unit has no bundle is `stuck`, not `pending`. A Close after `until` records
  `until`. An opening's id is unique (never the same millisecond twice: the last id + 1 if need be). The card's time-out
  on a draw and upload starts again with every chunk that arrives.
- **S** A check in `tools/test_site.mjs`: for every unit with a bundle, its teacher copy carries the same kit version
  (`window.KIT_V`) and content version as the bundle — a teacher copy and a bundle published out of step would make every
  Open fail with `409 version`.

## 11. After the review of the test page (12:10 pm; `/home/claude/reviews/test-page/REVIEW.md`, probes beside it)
The rule for all of it: **a child who did nothing wrong is never stuck, never loses work, and never looks like they left.**
- **S, K** (C1) **Lock needs a code.** The site refuses the rule `lock` with no unlock code: `PUT …/config` that would leave
  `rule.leave: 'lock'` without a code (in the store or in the same body), or that clears the code while the rule is `lock`,
  → `400 {error: 'unlock'}`; `open` with such a config → `409 {error: 'unlock'}`. The card asks for the code when Lock
  after is chosen. On the page, a locked child whose test ends (below) leaves the lock and gets their results.
- **K** (H1) **When the site has ended a test the page ends it too, at once.** `403 {error: 'closed'}` or
  `409 {error: 'finished'}` on a save, a read, an unlock or a reload's GET → the page goes straight to grading and the
  seal (a `finish` that answers `409 finished` with `steps` is the normal way in), whatever cover is up.
- **K** (H2) **A save that fails is tried again by itself** — after 5 s, 10 s, 20 s, then every 30 s, and at once when the
  browser says it is back online — until one succeeds; the line "Can't reach the site. Your answers are saved on this
  device." stays up meanwhile with Try again, and goes when a save succeeds. Nothing typed after a blip is lost.
- **K** (H3) **Grading never hangs.** A grade step that fails or is refused is tried again (same pace as saves; `409 order`
  takes the site's `next`); the seal likewise; the child never has to reload to get a code.
- **K, S** (H4, L1) **Start is the same test again, not a second one.** S: a Start whose `dev` already has a test in this
  opening that is still open and live answers that test again (a fresh token; the old one stops working) — so a Start whose
  answer was lost on the way, or a New test pressed by mistake, comes back to the same test; if that test is finished or
  sealed it is `403 {error: 'again'}` as before. K: **New test never removes a result from the device until a new test has
  really started**; refused, backed out of or reloaded, the old result and its code are still there.
- **K** (H5) **The screen stays awake** during a test (`navigator.wakeLock`, asked for in the Start press and again each time
  the page is shown; released at Finish; where there is no wake lock, nothing).
- **K** (M1, M2, M4, M7) A reload whose GET is refused for a while (429, 5xx, no network) waits and asks again; it never
  goes on without the rule, the start time and the form link, which are also kept in the device's copy of the test. The
  proctor's count and its rule hold across a reload: End after N ends on the leaving that reaches N, a reload included. A
  Finish that is refused (429, 5xx) is tried again as a save is; if it cannot be sent the child is back in the test with the
  proctor on. The test's id, token and `dev` are kept in sessionStorage as well, so a reload resumes when localStorage is
  full or refused.
- **K** (M3) **A page opened before the test is open** asks the status again every 20 s while it is shown (never while
  hidden) and shows Start when the test opens; every "This test isn't open." has Try again under it.
- **K** (M5, L4) Ctrl/⌘+F, Ctrl/⌘+G and F3 are stopped and logged as `find` (a seventh kind in `blocked`); a long press on
  a touch screen is not logged as `menu`.
- **K** (M6) **The log the page sends is never over 60 KB**: a value in `parts[].vals` is kept to 80 characters; if the
  whole is still too large the middle values of the longest parts go first (`n` still counts them), then the oldest visits
  — never `away`, `blocked` or `device`.
- **K** (L3, L5, L7, L8, L9) Turn in is a real link (`target="_blank"`), so a pop-up blocker cannot stop it, and the code is
  copied on the press with `Copied` shown; lengths in the log come from `performance.now()`, not the device's clock; the
  results are announced (`role="status"`) and focus goes to the code; nothing runs off a 390 px screen at 200%; a second
  tab of a finished test shows the results and the code.
- **T** `how: 'tap'` means chosen (a choice, a number line, a circle graph — by touch, mouse or keyboard): Tally says
  "picked", never "touch". A record with no log (`log: null`) is a note on the test's page: "this device sent no log (or one
  too large to keep)". `blocked` may hold `find`.
- **For Croix** (not built; he should know): a wrong and a lapsed start code look the same to a child (the box shakes); a
  reload is a leaving, so "just refresh it" counts and, under Lock after N, can lock; students are not shown a countdown.
