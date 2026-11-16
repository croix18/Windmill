# The test — changes after the adversarial review (16 Nov 2026, 10:15 am)

An independent reviewer attacked the site's side (`REVIEW.md` beside this file; its probes were run against the site branch and their essence is in the site's `tools/test_exam.mjs`).
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
