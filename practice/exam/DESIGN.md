# The test: a unit test taken on the website, graded and signed by the site

Design, 15 Nov 2026 (session `session_01W9n2WyAa6qRsqsdQj871ge`). `HANDOFF.md` (top) has Croix's words and choices;
this file is the plan the builders work from. Change it here first, then build.

**Built so far** (kit, branch `exam`): `pack.js`, `judge.js`, `exam/server.js` with `check/pack.js` and
`check/exam_server.js` — the page judges through `judge.js` (proved on 16,800 parts, before and after, no difference),
and the site's verdicts are the page's on every unit that packs; the test page (`exam_pool.js`, `exam_unit.js`,
`exam.js`, `exam/build_exam.py`, proved against the Node stand-in `check/exam_site.js`); and the lock, `exam/seal.js`
(16 Nov). Still to build: `proctor.js`, `trace.js`, the site, the courses' test pages, Tally.

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
  100,000 requests a day, a 1 second start-up, a 3 MB script). The paid plan ($5 a month) would only add headroom; it is
  a switch in the dashboard, not a rebuild.

## What "airtight" means here, and what it does not

1. **No answers on the student's device.** The test page carries no engine, no coach, no key: only the questions as
   already-drawn HTML. Answers are judged on the site, at Finish.
2. **A result only the site can make.** The record is signed with a key that never leaves the site and encrypted to a
   key whose private half never leaves Tally. A student can neither read one, change one nor make one.
3. **The site's clock.** Start and finish are stamped by the site. A test is finished once.
4. **A test exists only while Croix has it open.**

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
  unit, cv, kitv}`; the cockpit says `{kit: 'exam-pool', draw: n}`; the copy answers in batches of 5,
  `{kit: 'exam-pool', forms: [{seed, pub, priv, fams}], done, of}` (`priv` an array of packed items, `fams` the kinds
  of question in the test, for the approvals), or `{kit: 'exam-pool', error}`.
- **`exam_unit.js`** — the stub unit (above).
- **`exam.js`** — the test's own behavior on the page: Start, the site's answers (start, resume, save, read, finish,
  grade, seal), the clock from the site's start, the results panel, Turn in.
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
| `GET /api/test/status?course=&unit=` | anyone | `{open}`; cached 15 s |
| `POST /api/test/start` `{course, unit}` | anyone, while open | takes an unused test from the pool that holds no disapproved kind; makes `exam_test`; → `{test, token, started, now, rule, show, form, pub}` (`pub` = the public half) |
| `GET /api/test/<id>` | token | the same again, with the saved answers (a reload) |
| `PUT /api/test/<id>/save` `{answers, flags, n}` | token | keeps the newest; notes which parts changed and when (the site's own timeline) |
| `POST /api/test/<id>/read` `{part, text}` | token | `{ok, pretty}` — never right or wrong |
| `POST /api/test/<id>/unlock` `{code}` | token | `{ok}`; 5 tries a minute |
| `POST /api/test/<id>/finish` `{answers, log, ended?}` | token, once | commits; → `{steps}` |
| `POST /api/test/<id>/grade` `{step}` | token | judges 2 parts; idempotent; → `{done, steps}` |
| `POST /api/test/<id>/seal` | token | builds, signs, encrypts and stores the record; → `{code, points, of, parts:[{id, v}], seconds}` (`parts` only if the cockpit says to show them) |
| `GET /api/test/result/<code>` | anyone, CORS `*` | the locked record (it opens only in Tally) |
| `GET /api/test/key` | anyone, CORS `*` | the site's public signing key |
| `GET/PUT /teacher/api/test/config` | password | the rule and N, the unlock code (kept hashed), what students see after Finish, the form's pre-filled link, Tally's public key |
| `PUT /teacher/api/test/pool/<course>/<unit>` | password | a chunk of drawn tests (5 a request) |
| `POST /teacher/api/test/open` `{course, unit, until}` / `…/close` | password | opens once the pool is whole; closes at `until` (4:15 pm school time the same day unless he sets another) |
| `GET /teacher/api/test/board` | password | for each open test: started, finished — counts only |
| `GET /teacher/api/test/results?course=&unit=&day=` | password | that day's locked records in one file, for Tally without a network; and each code's score, seconds, times away and finish time in the clear |
| `POST /teacher/api/test/trial` / `…/trial/confirm` | password | a trial record sealed to the key just pasted, and the confirmation that Tally opened it (the key is then proven) |

- **Store** (SiteStore, SQLite): `exam_cfg`, `exam_key` (the signing pair, made on first use, as the push key is),
  `exam_open`, `exam_pool` (a row a drawn test; the private half one packed part a row so a grade step reads three),
  `exam_test` (id, token hash, course, unit, the test's two halves copied in at start, answers, verdicts, the site's
  save timeline, started, finished, status), `exam_result` (code, the locked record, course, unit, finished). A pool
  goes when its test closes; a test's halves go when it is sealed; an unfinished test goes after 7 days; locked records
  stay.
- **The Worker** imports every published unit's bundle statically (start-up: 125 ms for 12 units, measured under Node;
  the limit is 1 s; `tools/build.mjs` measures it and stops the build past 600 ms). Generating, drawing HTML and
  compressing a pool never happen in the Worker.
- **Budget, Free plan:** every request above stays under 10 ms by doing one small thing; a grade step is 2 parts, and
  each unit's bundle carries one drawn test that the Worker judges once at start-up (inside the 1 s start-up allowance), so
  no student's request pays for the judge's first call. A
  student's test is about 60 requests (a save a minute and on a question change, at most one every 20 s; a read a part;
  a dozen grade steps), so 150 students in a day are about 10,000 of the day's 100,000.
- **The cockpit's Test card:** each published unit of each course with **Open** (draws 120 in the hidden teacher copy,
  shows the count going up, uploads, opens) and **Close**, started and finished beside an open one; the rule (Count only
  · Lock after N · End after N) and the unlock code; After Finish (Score and which were right · Score only); the form's
  pre-filled link (he fills the code question with `CODE` in Google Forms' own "Get pre-filled link" and pastes the
  link); Tally's key.
- **Checks:** every route against a local store; a key or a verdict never leaves before seal (every response searched);
  one finish; the token; the password; a whole test through `wrangler dev` with a real bundle; the Free plan's budget
  (each route's CPU measured under Node against a ceiling).

### 3. The record and the code

At seal the site builds the record, as JSON:

```
{v: 1, id, code, course, unit, cv, kit, seed,              // which test: the unit, its version, the drawn test's seed
 site: {started, finished, saves, timeline: [[seconds, part]…]},   // the site's own clock and what it saw saved
 rule: {leave, after}, ended: null | "left" | "teacher", unlocks,
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
the site's signature and shows a four-word check that the cockpit shows too; only after he confirms it in the cockpit is
the key marked proven. Changing the key starts over. The private half is part of Tally's Full save, so any Tally that
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

### 4. Tally

*Tests*: **Connect** makes Tally's key pair (the private half stays in Tally and in its Full save), shows the public
half to paste into the cockpit, and reads and keeps the site's signing key. Then: paste or open the form's responses
(time, the student, the code); Tally fetches each locked record by its code (or opens the cockpit's file), opens and
checks it, matches the students to its roster, and shows the class: score, time, times away, and on a tap the whole
record — every question with what was typed, right or not and the key, the time on it, the changes, the tools, the
timeline. It flags what does not add up: a code two students turned in, a code that opens to nothing, a signature that
fails, a second test by the same student, a test nobody claimed, a finish outside the period. Synthetic rosters only in
its tests.

## The words on the test page (all of them)

Start · Test · Calculator · Scratch paper · Finish · Flag for review · Back · Next · `3 of 18 answered` ·
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
