# The test: a unit test taken on the website, graded and signed by the site

Design, 15 Nov 2026 (session `session_01W9n2WyAa6qRsqsdQj871ge`). `HANDOFF.md` (top) has Croix's words and choices;
this file is the plan the builders work from. Change it here first, then build. The changes after the adversarial review of
the site's side (16 Nov, `/home/claude/reviews/CHANGES-16NOV.md`) are folded in, each in its place.

**Built so far** (kit, branch `exam`): `pack.js`, `judge.js`, `exam/server.js` with `check/pack.js` and
`check/exam_server.js` — the page judges through `judge.js` (proved on 16,800 parts, before and after, no difference),
and the site's verdicts are the page's on every unit that packs; the test page (`exam_pool.js`, `exam_unit.js`,
`exam.js`, `exam/build_exam.py`, proved against the Node stand-in `check/exam_site.js`); the lock, `exam/seal.js`
(16 Nov); and the proctor and the log, `proctor.js` and `trace.js` (16 Nov; `BUILD_NOTES.md`). Still to build: the site, the
courses' test pages, Tally.

## What Croix asked for

- 7:12 pm: a test mode — full screen, the times a student navigated away shown on screen, the questions hard to copy —
  *"so I could eventually have the students work off of the website and it would automatically hold them accountable."*
- A student who leaves: *"Count it and show it. Give me the option in the cockpit to turn on lock or end after x amount of
  times."*
- The result: a code the students submit in his Google Form, decoded in Tally. *"I want literally all the data that is
  possible to get, how long on each question, did they change answers, did they utilize the calculators o[r] scratch pad,
  I want this to be as data forward and collecting as possible."* *"The code also has to be something crazy looking that
  is impossible for the students to figure out or fake."*
- Told that a student who can program could fake a code made on the student's own device, and could dig the answers out
  of a page that draws its own questions: 7:52 pm, *"I'm fully on board with a bigger build. Make it airtight."*
- Asked how the record reaches Tally: **a short code; the site keeps the full record locked** (encrypted, no name on it,
  only his Tally can open it).
- Cloudflare: *"Id like to stay on free."* So everything below fits the Workers Free plan (10 ms of CPU per request,
  100,000 requests a day, a 1 second start-up). The paid plan ($5 a month) would only add headroom; it is a switch in the
  dashboard, not a rebuild. (Cloudflare's script limit is no longer 3 MB compressed; the build checks the Worker's size and
  its start-up anyway.)

## What "airtight" means here, and what it does not

1. **No answers on the student's device.** The test page carries no engine, no coach, no key: only the questions as
   already-drawn HTML. Answers are judged on the site, at Finish.
2. **A result only the site can make.** The record is signed with a key that never leaves the site and encrypted to a
   key whose private half never leaves Tally. A student can neither read one, change one nor make one.
3. **The site's clock.** Start and finish are stamped by the site. A test is finished once.
4. **A test exists only while Croix has it open, and belongs to the opening it began in.** Each opening has its own id
   (`exam_open.opened`, ms), copied into a test at Start, and each test has a **time allowed** (the config's `minutes`,
   pinned at Start as its deadline, `started + minutes`), so a test started in 1st period cannot be answered in 6th. A test is
   live only while that opening still exists and its `until` has not passed, **and** its own deadline has not passed; a unit
   opened again is a new opening, and the old one's tests are not live, whatever the unit's state. A test that is not live
   takes no save, read or unlock (`403 {error: 'closed'}`); its finish is taken once and commits the last saved answers,
   `ended: 'teacher'` (the opening ended) or `'time'` (its deadline passed). The page treats a `403 closed` in the middle of a
   test as the end of it: it finishes at once, as Finish does.
5. **A start code.** While a test is open the cockpit shows a four-character code, good for 15 minutes; students type it to
   start. When it lapses nobody can start until Croix presses **New code**; tests already started are untouched. So a
   student at home with the link cannot start one, and a test cannot be started long after the class began.
6. **One start a browser, an opening.** The page makes a random id once (`exam.dev`, 32 hex) and sends it with Start; the
   site keeps its hash on the test. A Start from it while its test in this opening is still open and live answers that test
   again (a fresh token; the old one stops working), so a Start whose answer was lost on the way, or a New test pressed by
   mistake, comes back to the same test; once that test is finished or sealed a second start is refused. A second browser or a cleared one
   still gets a test; this stops New test and the second tab, which is what a child without a script would do. A new opening
   (a retake day) starts clean.
7. **Nothing typed is lost at the end of the time.** The site tells the page when its test stops being live (`ends`); the
   page saves just before it and finishes just before it by the ordinary Finish, on the site's clock, not the device's.
8. **A child who did nothing wrong is never stuck, never loses work, and never looks like they left** (the review of the
   test page, 16 Nov). When the site has ended a test the page ends it too, at once, whatever cover is up (a locked child
   included); a save, a Finish, a grade step and the seal that fail are tried again by themselves until they get through;
   Start is the same test again, not a second one, and New test never takes a result off the device until a new test has
   really started; the screen is kept awake; a reload never loses the rule, the start time or the form link; the find keys
   and a touch long-press do not count as leaving or as a right-click; the log is never too large to keep.

**Known, and said to Croix** (16 Nov, not built): a wrong and a lapsed start code look the same to a child (the box shakes);
a reload is a leaving, so "just refresh it" counts and, under Lock after N, can lock; students are not shown a countdown.

Not covered, and said to Croix: a phone, a neighbor, someone else doing the mathematics. And everything the student's
device reports about itself — the times away, the time on each question, the tool use — is evidence, not proof: it is
recorded by a page a programmer could tamper with. The answers, the score and the two times are the site's own.

## The shape

```
 cockpit (his browser)            the site (Worker + SiteStore)              a student's Chromebook
 ───────────────────────          ─────────────────────────────              ────────────────────────
 Open test: the unit's   ──pool──▶ exam_pool: 120 drawn tests,
 teacher copy, hidden,             each a public half (questions)
 draws 120 tests and               and a private half (the parts,
 uploads them                      packed, with their keys)
                                   exam_open: this unit, until 4:15
                                                                 ◀──start──  Test page: Start (full screen)
                                   picks an unused test, makes
                                   exam_test, sends the public half ──────▶  the kit's own page code runs on a
                                                                             stub unit that only hands back the
                                                                 ◀──save───  drawn HTML; answers, flags, the log
                                                                 ◀──read───  "can't read this yet", the preview
                                                                 ◀─finish──  Finish: answers and the log
                                   judges 2 parts a request      ◀─grade×N─
                                   seals: record → signed →      ◀──seal───
                                   encrypted → exam_result,
                                   answers with the short code ───────────▶  score, time, times away, the code,
                                                                             Turn in (his Google Form)
 Tally (his laptop)      ◀─result── the locked record, by its code
 opens it with its key,
 checks the site's signature
```

### Why the pool is drawn in his browser
Drawing a test takes 1.4–8.5 ms on average and up to 90 ms cold (measured, all 12 units); the Free plan stops a request
at 10 ms. His browser has no such limit and already has the whole unit behind the password, in the teacher copy. So
*Open test* draws the tests there and hands them to the site. A pool is 120 tests (more than any course's students in a
day), each given to one student only, never twice in a day. Judging is light enough for the site: a whole test is
0.3–5 ms on average and up to 17 ms cold, so the site judges **two parts a request**, and warms each unit's judge when the Worker
starts (a first, cold call of three parts measured up to 9.99 ms on A7 Unit 3; warm, 0.02–0.24 ms).

### Why the page code is the kit's own
The test must look and work exactly as "Like the real test" does on the practice page: the keypad, the boxes, the number
line and circle graph a student builds, one question at a time, Flag for review, the calculator, scratch paper. So the
test page is the kit's page — `ui.js`, `pager.js` and the rest, unchanged in what they draw — running on a **stub unit**
(`exam_unit.js`, the same for every unit) in place of the unit's own scripts. The stub's `generate` returns the test the
site sent; its `view` functions return the HTML the real unit's view functions returned when the test was drawn; it has
no `judge`, `solution`, `walk` or key. `ui.js` gains an exam mode (below) and nothing else changes.

## The pieces

### 1. Kit (`practice/kit/`), all on the practice kit's rules (its own modules, small hooks, checks, README, manifest)

- **`pack.js`** — `pack(part)` / `unpack(text)`: a part as text and back, BigInt kept exact; it refuses a function
  rather than dropping it. **Rule (new, `check/pack.js`): a part survives it** — after `unpack(pack(p))` the part judges
  every answer as before. The check gates a unit's **test page and bundle**, never its practice page. A7 Unit 11's 14(a)
  breaks it today (three functions inside the part: `st.say`, `st.ask`, `st.amt`; 14(b) fails with it, being its
  part (b)); it is fixed in that unit, not worked around here.
- **`judge.js`** — the judging `ui.js` does (`judgeAns`, `equivUp`, `equivBoxes`, `formOf`, `tidy`, `boxAns`,
  `answered`, and what `finish()` does to a part in *Like the real test*), moved out of `ui.js` into one pure module
  that `ui.js` calls and the site calls. One source, so a practice page and a test can never disagree on an answer.
- **`exam_pool.js`** (teacher builds only) — in the unit's teacher copy, on a message from the cockpit: for each of n
  random 128-bit seeds, draw the set as *Like the real test* through the page's own `render()`, and return
  - the **public half**: the stub's data — for every item and part, each string the page asked the unit's view for
    (stem, figure, pre, unit, placeholder, form label and input mode, boxes, choices, the number line's `line`, the
    circle graph's categories), the item ids and labels, sections and points, the unit's title, eyebrow, notes, keypad,
    contentVersion and kit version; never a key, never `graph`, never a part's numbers;
  - the **private half**: `ITEMS` as the page built them — id, type, the part packed, its sibling, position, label —
    and each part's `keyText`;
  - having first proved the test on itself: every key judged right through `unpack(pack())`, and a wrong answer wrong.
  **How the cockpit asks** (same origin, `postMessage`, the origin checked both ways): the cockpit loads the unit's
  teacher copy in a hidden frame at `…/practice/#exam-pool`; the copy says `{kit: 'exam-pool', ready: true, course,
  unit, cv, kitv}`; the cockpit says `{kit: 'exam-pool', draw: n}`; the copy answers in batches of 5 (the cockpit uploads them 2 a request),
  `{kit: 'exam-pool', forms: [{seed, pub, priv, fams}], done, of}` (`priv` an array of packed items, `fams` the kinds
  of question in the test, for the approvals), or `{kit: 'exam-pool', error}`.
- **`exam_unit.js`** — the stub unit (above).
- **`exam.js`** — the test's own behavior on the page: Start (with the start code's one box when the site asks for one, and
  the browser's id; a refused code or a second start from this browser shakes the box, or Start, and says nothing), the end
  of the time (the newest `ends` the site gave, on the site's clock: a save 3 s before it, Finish 1 s before it; a `403
  closed` or `409 finished` on a save, a read, an unlock or the reload's GET goes straight to grading and the seal, whatever
  cover is up), the site's answers (start, resume, save, read, finish, grade, seal; a save, a Finish refused 429 or 5xx, a
  grade step and the seal that fail are tried again by themselves — 5 s, 10 s, 20 s, then every 30 s, and at once when the
  browser is back online — with "Can't reach the site…" and Try again up meanwhile; `409 order` takes the site's `next`, `409
  grading` on the seal grades again; a Finish refused for good puts the child back in the test with the proctor on), the clock
  from the site's start (a steady count, `performance.now()`, so a change to the device's clock moves nothing; a gap that opens while the page is hidden — the lid shut — is taken from the clock, so a sleep has its real length), the results
  panel (announced, `role="status"`, the focus on the code), Turn in (a real link to the form, `target="_blank"`, so a pop-up
  blocker cannot stop it; the code copied on the press and `Copied` shown). A reload whose GET is refused for a while (429,
  5xx, no network) goes on from the device's copy (the rule, the start time and the form link are kept there) and asks again;
  the test's id, token and the browser's id are in sessionStorage too, so a reload resumes when localStorage is full or
  refused. New test never takes the result off the device until a new test has started. The not-open screen asks the status
  again every 20 s while it is shown (never while hidden) and shows Start when the test opens; every "This test isn't open."
  has Try again under it. A second tab of a finished test shows the results and the code.
- **The screen stays awake** during a test (`navigator.wakeLock`, asked for in the Start press and again each time the page
  is shown; released at Finish; where there is no wake lock, nothing) — `proctor.js`.
- **`ui.js`, exam mode** (`window.KIT_EXAM`, set only by the test page): no mode switch, no What to practice, no set
  number, no Print, no Pause, no Start over, no Hint, no worked solution, no Try a similar one, before or after Finish;
  "can't read this yet" and the preview come from the site (`exam.js`), not from a local judge; Finish hands the answers
  to `exam.js` and paints the verdicts it gets back. Everything else is the page as it is.
- **`proctor.js`** — full screen at Start; away = hidden, or the window without focus (`document.hasFocus()`, polled, so
  a click into the calculator's frame is not away), or out of full screen; while away the sheet is covered and on return
  a button brings the student back in; each time away is logged with its length, its kind and the question; the bar
  shows the count in coral once it is not zero (coral is the kit's alarm color and nothing else); no selecting, copy,
  cut, context menu, drag, print or save of the sheet (answer boxes and scratch notes still take typing); the cockpit's
  rule — count only, lock after N (a code typed on the device, checked by the site), end after N (Finish as it stands).
- **`trace.js`** — the log (below).
- **`exam/server.js`** — pure, no DOM, runs under Node and in the Worker: `read(U, item, text, a)` →
  `{ok, pretty}` (`a` = the answer in its part (a), which the page's own reading uses; `pretty` one a box; `ok` false
  only where the page says "Can't read this yet"); `grade(U, items, answers, verdicts, from, n)` → the next verdicts
  `{v, almost}` (a sibling's answer and verdict feed its part, as `ctxOf` does; "Almost" — the value right, the form not
  — is `wrong` with `almost: true`); `summary(items, verdicts)` → points.
- **Builds:** for each unit, beside the page and the teacher copy: the **test page** (kit CSS and code, the unit's own
  CSS, KaTeX, fonts, `calc.js`, `scratch.js`, `exam_unit.js`, `exam.js`, `proctor.js`, `trace.js`; none of the unit's
  scripts) and the **site's bundle** (the unit's scripts and the kit files they require, as they stand in that unit,
  with `judge.js`, `pack.js`, `exam/server.js`).
- **Checks:** the test page's sheet for a drawn test is the practice page's sheet for the same set, question by
  question (the HTML, equal); the site's verdicts are the page's own for every key, a blank, a wrong answer, an
  unreadable one and an equivalent form, on 30 sets; pack and unpack; the built test page holds none of the unit's
  scripts and no key (searched); a whole test taken in Chromium against a small Node stand-in for the site that uses
  `exam/server.js`: start, a reload, leaving three times under each rule, Finish, the code; the practice page and every
  existing check unchanged with `judge.js` in place.
- **The practice page** shows a third choice, **Test**, on its start screen only while the site says the unit's test is
  open; it goes to the test page. On the site only.

### 2. Site (`mrshaffer-site`)

Routes (JSON; this site's Origin only, except the two marked CORS):

| Route | Who | Does |
|---|---|---|
| `GET /api/test/status?course=&unit=` | anyone | `{open, pin}` (`pin`: a start code is asked for — a boolean, never the code); cached 15 s |
| `POST /api/test/start` `{course, unit, pin, dev}` | anyone, while open | `dev` the browser's id (32 hex), missing or malformed → `400 {error: 'body'}`; with the start code on, a missing, wrong or lapsed code → `403 {error: 'pin'}` (compared upper-cased, spaces stripped; the code is checked first — a right one is always taken; only wrong ones are counted, and past 60 a minute an address a wrong one is `429 {error: 'wait'}`); a Start from the same `dev` while its test in this opening is open and live → that test again with a fresh token (the old one stops working); once that test is finished or sealed → `403 {error: 'again'}`; takes the oldest-drawn unused test from the pool that holds no disapproved kind; makes `exam_test` (with the opening's id, the rule and Tally's key pinned to it); → `{test, token, started, now, ends, rule, show, form, pub}` (`pub` = the public half; `ends` the moment, ms on the site's clock, the test stops being live — the sooner of the opening's `until` and the test's deadline; it moves when the test is extended); starts 120 a minute an address |
| `GET /api/test/<id>` | token | the same again (`ends` the newest), with the saved answers (a reload; never needs a code); 20 at once, then one every 3 s |
| `PUT /api/test/<id>/save` `{answers, flags, n}` | token, live (its opening live, its deadline not passed; else `403 {error: 'closed'}`) | → `{ok: true, ends}`; keeps the newest (answers at most 24 KB); notes which parts changed and when (the site's own timeline, at most 1,500 entries) |
| `POST /api/test/<id>/read` `{part, text}` | token, live | `{ok, pretty}` — never right or wrong; a `text` over 200 characters is not judged (`{ok: false, pretty: ''}`) |
| `POST /api/test/<id>/unlock` `{code}` | token, live (a test not open → `409 {error: 'finished'}`) | `{ok}`; 5 tries a minute a test; the code checked first — a right one is always taken, and only wrong ones count toward 30 a minute an address, past which a wrong one is `429 {error: 'wait'}` |
| `POST /api/test/<id>/finish` `{answers, log, ended?}` | token, once | commits (not live: the last saved answers, `ended: 'teacher'`, or `'time'` past the deadline); → `{steps}` |
| `POST /api/test/<id>/grade` `{step}` | token | judges 2 parts; idempotent; → `{done, steps}` |
| `POST /api/test/<id>/seal` | token | builds, signs, encrypts and stores the record; → `{code, points, of, parts:[{id, v}], seconds}` (`parts` only if the cockpit says to show them) |
| `GET /api/test/result/<code>` | anyone, CORS `*` | the locked record (it opens only in Tally) |
| `GET /api/test/key` | anyone, CORS `*` | the site's public signing key |
| `GET/PUT /teacher/api/test/config` | password | the rule and N, the unlock code (kept hashed), what students see after Finish, the form's pre-filled link, Tally's public key, the start code on or off |
| `PUT /teacher/api/test/pool/<course>/<unit>` | password | a chunk of drawn tests (2 a request); more may be added while the test is open |
| `POST /teacher/api/test/open` `{course, unit, until}` / `…/close` | password | opens once the pool is whole, a new opening with its first start code; closes at `until` (4:15 pm school time the same day unless he sets another) |
| `POST /teacher/api/test/pin` `{course, unit}` | password | a new start code, good for 15 minutes |
| `POST /teacher/api/test/extend` `{course, unit, until}` | password | moves an open test's `until` |
| `GET /teacher/api/test/board` | password | for each open test: started, finished, the start code, waiting to be sealed — counts only |
| `GET /teacher/api/test/results?course=&unit=&day=` | password | that day's locked records in one file, for Tally without a network; and each code's score, seconds, times away and finish time in the clear |
| `POST /teacher/api/test/trial` / `…/trial/confirm` | password | a trial record sealed to the key just pasted, and the four words Tally shows for it, typed in (the key is then proven) |

**The teacher's routes, exactly** (pinned 16 Nov; the student's routes are exactly `check/exam_site.js`'s):
- `GET /teacher/api/test/config` → `{rule: {leave: 'count'|'lock'|'end', after: N}, show: 'parts'|'score', form: link|null,
  unlock: bool, tally: {key: 'TALLY1.…'|null, proven: bool, at: ms|null}, site: {key, made}, startCode: bool}`. `PUT` takes
  any of `rule`, `show`, `form`, `unlock` (the code; kept hashed; `''` clears it), `tally` (the key as pasted; `null` clears
  it), `startCode` (`true` | `false`; default `true`; off, no code is asked for and starts are as before), `minutes` (the time
  allowed: a whole number from 10 to 600, or `null` for no limit; default 120; pinned to a test at Start as its deadline) and
  answers the config (which carries `minutes` too). A key that is not a Tally key → `400 {error: 'tally-key'}`. A different key clears `proven`.
  **Lock needs a code** (16 Nov): a `PUT` that would leave `rule.leave: 'lock'` with no unlock code (in the store or in the same
  body), or that clears the code while the rule is `lock`, → `400 {error: 'unlock'}`; `open` with such a config → `409
  {error: 'unlock'}`. The card asks for the code when Lock after is chosen.
- `POST /teacher/api/test/trial` → `{code}`: a trial record (`seal.newTrial`) locked to the pasted key and stored as a
  result under its code, so Tally fetches it as it will fetch a real one; `409 {error: 'no key'}` without a key. The cockpit
  does not show the four words. `POST /teacher/api/test/trial/confirm {code, words}`: the site works out
  `words(nonce, sitePub, tallyPub)` itself and compares (lower-cased, spaces collapsed) → `{proven: true}`; wrong → `409
  {error: 'words'}`; five wrong tries end that trial (`409 {error: 'trial'}`, as for any code but the newest trial's); a new
  trial is needed. Only a Tally that opened the trial knows its words.
- `PUT /teacher/api/test/pool/<course>/<unit>` `{forms: [{seed, pub, priv, fams}], reset?: true}` → `{n}` (the pool's size
  now), 2 drawn tests a request (five of the largest unit's cost 7–8 ms). `reset` on the first chunk empties the unit's pool;
  `reset` while that test is open → `409 {error: 'open'}`; without `reset` a chunk is taken while the test is open and raises
  the opening's `n` (the card's **Add tests**); `409 {error: 'version', cv, kit}` if a test's `pub.cv` or `pub.kit` is not the
  site's bundle's (a stale teacher copy). Tests go out in the order they were drawn.
- `POST /teacher/api/test/open {course, unit, until?, n}` → `{ok, until}`: a new opening (`opened`, its id, never the same
  millisecond twice — the last id + 1 if need be) with its first
  start code; `409 {error: 'unproven'}` until the pairing is proven, `409 {error: 'pool', n}` unless the site holds exactly the
  `n` tests the cockpit drew, `404 {error: 'unit'}` for a unit with no bundle. `until` defaults to 4:15 pm school time
  (America/New_York) that day; an `until` that is not in the future (between 11:59 pm and midnight) → `400 {error: 'until'}`.
  The rule and Tally's key are pinned to the opening at Open and to each test at Start. `POST …/close {course, unit}`.
- `POST /teacher/api/test/pin {course, unit}` → `{pin, until}`: a new start code — 4 characters of
  `23456789ABCDEFGHJKMNPQRSTVWXYZ` (no 0 1 I L O U), fresh randomness — good for 15 minutes (`START_WINDOW_MS`).
- `POST /teacher/api/test/extend {course, unit, until}` → `{ok, until}`: moves an open test's `until` (in the future, at most
  18 hours ahead); each student's `ends` follows on its next answer. A Close after `until` records `until`.
- The kinds a test must not hold are the site's own approvals for that unit (`items.js`): a drawn test with a
  disapproved kind among its `fams` is never handed out. There is no second place to disapprove.
- `GET /teacher/api/test/board` → `{tests: [{course, unit, open, until, pool, started, finished, pin, pinUntil, pending}]}`
  (`pending`: finished and not sealed yet; the card asks again every 5 s while it is not zero; a finished test whose unit has
  no bundle is `stuck`, not `pending`). The card keeps asking for the board while a test is open, whatever one answer was (a
  failed answer waits longer before the next: 5 s, 10 s, 20 s, at most 60 s; back to normal on the next good one; nothing
  while its tab is hidden); its time-out on a draw and upload starts again with every chunk that arrives. A check in
  `tools/test_site.mjs`: every unit's teacher copy carries the same kit version (`window.KIT_V`) and content version as its
  bundle.
- `GET /teacher/api/test/results?course=&unit=&day=YYYY-MM-DD` → `{site: {key}, results: [{code, course, unit, points, of,
  seconds, away, awaySeconds, opened, started, finished, record}]}` (`record` the locked text) — the file Tally opens without
  a network, and the scores that survive a lost key. `away` counts only well-formed `log.away` entries (`[at, sec, kind, q]`,
  `sec` a number from 0 to 86,400) and `awaySeconds` is their sum, capped at the test's own `seconds`; the answer is always
  valid JSON (no `Infinity`, no `NaN`).
- What a hostile page sends is bounded before anything is judged: a read's `text` and each typed answer at most 200
  characters; an answer that is an object or a list (a choice, a multi-select, boxes, a number line, a circle graph) at most
  2 KB as JSON with each string in it at most 200 characters — over that a read answers `{ok: false, pretty: ''}` and a grade
  step gives `unread`; `save`'s and `finish`'s answers at most 24 KB; a log at most 64 KB (`LOG_MAX`), and one that cannot be
  turned to text (nested too deep) is `null` and the test still finishes. The seal answers `409 {error: 'unit'}` when the
  unit's bundle is missing, as grade does.

- **Store** (SiteStore, SQLite): `exam_cfg`, `exam_key` (the signing pair, made on first use, as the push key is),
  `exam_open` (with `opened`, the opening's id, and `pin`, `pin_until`, its start code), `exam_pool` (a row a drawn test;
  its private half in the row, the packed parts one a line — rows written are the Free plan's tightest daily limit),
  `exam_test` (id, token hash, course, unit, the opening it began in, the rule and Tally's key pinned to it, the test's two
  halves copied in at start, answers, verdicts, the site's save timeline, started, finished, status), `exam_result` (code,
  the locked record, course, unit, finished). A pool goes when its test closes; a test's halves go when it is sealed;
  locked records stay.
- **No test is lost.** A test still open whose opening has ended is finished by the site (lazily, on the teacher's
  requests): the last saved answers, `ended: 'teacher'`, finished at the moment the opening ended; one whose deadline has
  passed the same, `ended: 'time'`, finished at the deadline. A test finished and not sealed three minutes later (the lid shut
  during Grading…) is graded and sealed by the site, a few steps a request (at most 3 grade steps or one seal); the student's
  own page still finishes the job if it comes back first — the seal is once, so the code is the same either way. This
  sealing must never break the board: each try on a test is counted before it is made, and a test is left alone after two
  tries that did not end in a seal (its student's page, or a later look, can still seal it). A record built from the largest
  hostile answers and log is the one request that may not fit 10 ms; it must cost its author a code, never the teacher the
  board. A row is deleted 7 days after its start only if it is sealed, or was never finished and
  holds no saved answer; a finished test is never deleted unsealed.
- **The Worker** imports every published unit's bundle statically (start-up: 125 ms for 12 units, measured under Node;
  the limit is 1 s; `tools/build.mjs` measures it and stops the build past 600 ms, and checks the Worker's size).
  Generating, drawing HTML and compressing a pool never happen in the Worker. A unit's new bundle is published only while
  that unit's test is closed.
- **Budget, Free plan:** every request above stays under 10 ms by doing one small thing; a grade step is 2 parts, and
  each unit's bundle carries one drawn test that the Worker judges once at start-up (inside the 1 s start-up allowance), so
  no student's request pays for the judge's first call. A
  student's test is about 60 requests (a save a minute and on a question change, at most one every 20 s; a read a part;
  a dozen grade steps), so 150 students in a day are about 10,000 of the day's 100,000.
- **The cockpit's Test card:** each published unit of each course with **Open** (draws 120 in the hidden teacher copy,
  shows the count going up, uploads, opens) and **Close**, started and finished beside an open one; beside an open test
  `Start code  7K4M  · 12:40 left` with **New code** (lapsed: `No start code` and **New code**), its closing time, which he
  can change, and **Add tests** (60 more) once fewer than 30 are left; **Time allowed** (60 min · 90 min · 120 min · No
  limit); the rule (Count only · Lock after N · End after N) and
  the unlock code; Start code (On · Off); After Finish (Score and which were right · Score only); the form's pre-filled link
  (he fills the code question with `CODE` in Google Forms' own "Get pre-filled link" and pastes the link); Tally's key, and
  for its trial the code, a box for the four words Tally shows, and **Confirm**.
- **Checks:** every route against a local store; a key or a verdict never leaves before seal (every response searched);
  one finish; the token; the password; a whole test through `wrangler dev` with a real bundle; the Free plan's budget
  (each route's CPU measured under Node against a ceiling).

### 3. The record and the code

At seal the site builds the record, as JSON:

```
{v: 1, id, code, course, unit, cv, kit, seed,              // which test: the unit, its version, the drawn test's seed
 site: {opened, limit, started, finished, saves, timeline: [[seconds, part]…]},   // the opening's id; the time allowed
                                                           //   (minutes, or null); the site's own clock and what it saw saved
 rule: {leave, after}, ended: null | "left" | "teacher" | "time", unlocks,   // "teacher": the opening ended first; "time":
                                                           //   the deadline passed (the site finished it with the last saved
                                                           //   answers either way)
 parts: [{id, type, typed, v, almost, key}],               // v: right | wrong | blank | unread; almost: the value right, the form not
 points, of,
 log: {…}}                                                 // the device's own account (below)
```

then: `plain` = the JSON, deflate-raw; `sig` = ECDSA P-256 / SHA-256 over `plain` with the site's key (64 bytes);
an ephemeral ECDH P-256 pair; AES-256-GCM key = HKDF-SHA-256(ECDH(ephemeral, Tally's public key), salt = the ephemeral
public key, info = `windy-hill-result-v1`); the locked record = `01 ‖ ephemeral public key (65) ‖ iv (12) ‖
AES-GCM(sig ‖ plain)`. **The code** is 12 Crockford base-32 characters of fresh randomness, shown `K7QF-2M9D-X4TB`; it
is the record's name on the site and what the student turns in. Tally derives the same key with its private half, opens
the record, checks `sig` against the site key it holds, inflates, reads.

**Pinned by `exam/seal.js`** (16 Nov; the one file both ends use — the site vendors it, Tally carries a copy): a locked
record travels as base64url text (`GET /api/test/result/<code>` → `{code, record}`); the site's public key is base64url of
the 65-byte point (`GET /api/test/key` → `{key, made}`); Tally's public key is `TALLY1.` + the same; a code always holds a
digit; `open` refuses with a reason (`format`, `key`, `signature`, `code`) and takes a list of site keys, so a site key
made again keeps old records readable — Tally keeps every site key it has been paired with. The trial record is
`{v: 1, trial: true, code, nonce, made}` and the four words are `words(nonce, sitePub, tallyPub)`.

**Proving the pairing before it matters** (Croix, 9:03 pm: *"How do I know it'll open on my tally?"*). A test cannot be
opened until the pairing is proven: when Tally's public key is pasted into the cockpit, the site makes a **trial record**
(a made-up test, sealed exactly as a real one) and shows its code; Croix enters the code in Tally; Tally opens it, checks
the site's signature and shows a four-word check; Croix types the four words into the cockpit, which does not show them,
and the site works them out itself and compares; only then is the key marked proven (five wrong tries end the trial). Only a
Tally that opened the trial can know its words, so the pairing is proven, not agreed to. Changing the key starts over. The private half is part of Tally's Full save, so any Tally that
has loaded his Full save — the laptop, the tablet, the panel, a Tally.html downloaded fresh — opens the records.

**If the key is ever lost** (Tally's data gone and no Full save), the locked records cannot be opened by anyone. So
`exam_result` also keeps, in the clear and behind the teacher's password only, each code's score, points possible,
seconds, times away and finish time — no name, no answers — and the cockpit can list them by day. Grades survive a lost
key; the detail does not. Tally says so when it makes the key and offers the Full save then.

**The log** (`trace.js`; kept on the device as it grows, sent at Finish; everything the page can see):
- each question: seconds on screen, visits, seconds before its first answer, flagged at any time and at Finish;
- the visits in order: question, when, how long (up to 300);
- each part: every value it held and when (up to 12), typed or tapped on the keypad, pastes into its box;
- the calculator: each opening — which calculator, the question, how long; what is typed inside a calculator cannot be
  seen (it is another site's page);
- scratch paper: each opening — Notes or Grid, the question, how long; and what was on it at Finish: each question's
  notes and grid (up to 4 KB in all, the longest cut first);
- each time away: when, how long, the kind (another tab or app, the window, out of full screen, a reload), the question;
- each blocked copy, cut, right-click, print and select-all: when, the question;
- each pause of more than a minute with nothing typed or tapped;
- the device: screen and window size, touch or not, the system and browser family and version, dark or light, Larger
  text, zoom, its clock at start and at Finish, saves that failed.

**The log's shape** (pinned 16 Nov, so `trace.js` and Tally are built to one contract; a field the page cannot fill is
`null`, never renamed or left out). Every `at` is whole seconds from `t0` on the device's clock; every `sec` whole seconds.
A question is the number on the sheet (`"4"`); a part is its id in the record's `parts` (`"4a"`, or `"4"` for a question
of one part).

```
{v: 1,
 t0, t1,                                   // the device's clock (ms since 1970) when the test first appeared, and at Finish
 q: {"4": {sec, visits, first, flag, flagEnd}},        // seconds on screen · times visited · seconds on screen before its
                                           //   first answer (null: never answered) · flagged at any time · flagged at Finish
 visits: [["4", at, sec], …],              // in order, at most 300
 parts: {"4a": {vals: [[at, value, how], …], n, pastes}},   // every value the part held (the first 4 and the last 8 kept;
                                           //   n counts them all) · how: "typed" | "keypad" | "tap" (a choice, a number line,
                                           //   a circle graph — chosen, by touch, mouse or keyboard: Tally says "picked") ·
                                           //   pastes into its box · a value is kept to 80 characters
 calc: [[which, "4", at, sec], …],         // each opening: which calculator (the kit's own id for it), the question
 scratch: {opens: [["notes" | "grid", "4", at, sec], …],
           end: {"4": {n: "the notes", g: {v: [4 | 1, scale], o: [["p",x,y], ["s",x1,y1,x2,y2], ["l",x1,y1,x2,y2]]}}},
           cut: false},                    // end: what was on it at Finish, in scratch.js's own saved form, 4 KB in all
                                           //   (the longest notes cut first; cut: true if anything was shortened)
 away: [[at, sec, kind, "4"], …],          // kind: "tab" (another tab or app) | "window" | "fullscreen" | "reload"
 blocked: [[at, what, "4"], …],            // what: "copy" | "cut" | "menu" | "print" | "selectall" | "drag" | "save" |
                                           //   "find" (Ctrl/⌘+F, Ctrl/⌘+G, F3; added 16 Nov) — a touch long-press is not "menu"
 idle: [[at, sec, "4"], …],                // each pause of more than a minute with nothing typed or tapped
 device: {sw, sh, ww, wh, dpr, touch, os, osv, br, brv, dark, large, zoom, tz, fs},   // screen and window in CSS px · touch
                                           //   true/false · system and browser family and version (strings) · dark · the
                                           //   kit's Larger text · zoom (1 = 100%) · the time zone's name · fs: full screen is
                                           //   available on this device (added 16 Nov, with trace.js)
 fails,                                    // saves that failed
 drop: {visits, calc, scratch, away, blocked, idle}}   // entries past each list's cap (300 visits, 100 of each other)
```

The page never sends a log over 60 KB (every string in a value kept to 80 characters; if the whole is still too large, the
middle values of the parts with the most go first — `n` still counts them — then the oldest visits, `drop` counting them;
never `away`, `blocked` or `device`); every length in it is from a steady count (`performance.now()`), and only `t0` and `t1`
are the device's clock. Measured: the honest log at every cap at once with every value 200 characters is 58 KB on A7 Unit 3 (36 parts, the largest),
44 KB on M7 Unit 10.
The site takes the log as it comes (JSON, at most 64 KB — the honest log's caps add up to well under that; a larger or
broken one, or one nested too deep to be turned to text, is kept as `null` and the test still finishes): it is the device's
account, not the site's, and Tally shows everything in it as text, never as HTML, never trusted for length or type. The score
sheet's `Left the test 2 times · 1 min 5 s` is `log.away`'s length and the sum of its seconds; the clear `away` beside a
locked record counts only its well-formed entries (above).

### 4. Tally

*Tests*: **Connect** makes Tally's key pair (the private half stays in Tally and in its Full save), shows the public
half to paste into the cockpit, and reads and keeps the site's signing key. Then: paste or open the form's responses
(time, the student, the code); Tally fetches each locked record by its code (or opens the cockpit's file), opens and
checks it, matches the students to its roster, and shows the class: score, time, times away, and on a tap the whole
record — every question with what was typed, right or not and the key, the time on it, the changes, the tools, the
timeline. It flags what does not add up: a code two students turned in, a code that opens to nothing, a signature that
fails, a second test by the same student, a test nobody claimed, a finish outside the period; a start or finish far from
its class's others (with five or more records for that unit and day, a start more than 20 minutes before the class's median
start or after its median finish — "taken at 9:12–9:40 am; the rest of this class took it 1:05–1:50 pm"), and a record whose
`site.opened` is not the class's most common one (and, where Tally knows the class's period, a start or finish outside it);
leaving more times than the rule allowed with nothing to show for it (`lock` and `log.away` longer than `after` with
`unlocks: 0`; `end` and `log.away` at least `after` with `ended` not `"left"`); a record with no log (`log: null`) is a
note on the test's page, "this device sent no log (or one too large to keep)"; a sitting over twice the class's median
`seconds`; `ended: "teacher"` (the site closed it with what was saved) and `ended: "time"` ("ran out of time: the site closed
it with what was saved"); `site.limit` is shown with the rule. A record nobody turned in is shown with its
opening and its start and finish times, and Croix can give it to a student by hand (and take it back). The student's own
data in a record (`parts[].typed`, everything in `log`) is shown as text, never as HTML. Synthetic rosters only in its
tests.

## The words on the test page (all of them)

Start code · Start · Test · Calculator · Scratch paper · Finish · Flag for review · Back · Next · `3 of 18 answered` ·
`Left the test: 2` · Back to the test · Locked. Ask your teacher. · Unlock · `Test ended: left the test 3 times.` ·
Grading… · `24 / 36 points` · `41:07` · `Left the test 2 times · 1 min 5 s` · the code · Turn in · Right · Not right ·
Blank · This test isn't open. · Can't reach the site. Your answers are saved on this device. · Try again.
No instructions, no legend, no note on how it works (`HANDOFF.md`, "Words on a page").

## Order of building

1. The kit pieces, proved against the Node stand-in (no site needed).
2. The site: routes, store, the cockpit's card, the Worker's bundles.
3. The courses: the test page and bundle built and published for each unit; A7 Unit 11's part made packable.
4. Tally.
5. Croix takes a test himself, start to Tally, before any class does.
