# Tally "Tests": adversarial review (16 Nov 2026)

What I reviewed: `croix18/tally` branch `tests` at `2738dec`, as a detached worktree at `/home/claude/reviews/tally-tests/wt` (read-only).
I built into a copy at `/home/claude/reviews/tally-tests/build`. The shipped `Tally.html` there is byte-identical to the committed one.
Contract: Windmill `practice/exam/DESIGN.md` §3–4 and `reviews/CHANGES-16NOV.md` §4–7 and §9. Lock: `vendor/seal.js`, which matches
`windmill-exam/practice/kit/exam/seal.js` exactly.

How I ran the probes: they are in `/home/claude/reviews/tally-tests/probes/`, and the shared harness is `h.js`. They use synthetic
students and records only, made with the fixtures' generator and fresh keys from `seal.js`. The browser probes drive Chromium
against a stand-in for `https://mrshaffer.org`, served through Playwright routing. Most run on `build/Tally.probe.html`: the test build
plus a `window.__ev` hook and `'unsafe-eval'`, so that a probe can call Tally's internal functions. Everything about the CSP and the
network (p6) runs on the **shipped** `Tally.html`, opened from `file://`. Both Tests suites pass on this commit: `exam-core` 78/78 and
`exam-e2e` 66/66.

**Counts: Critical 4 · High 3 · Medium 5 · Low 6 · Note 6.**

---

## Critical

### C1. A record matched to the wrong student cannot be moved, and the wrong child's score is copied
- **What happens:** When a typed name matches a student, whether exactly, loosely or by a remembered answer, Tests offers no way to
  move the record to another student. The test page of a matched record has one button, "‹ Tests". The "Give it to a student" and
  "Take it back" buttons exist only for a record nobody turned in, or one the teacher pinned himself.
- **Why it matters:** Matching runs against every class (`examRoster`), and an exact match is taken without asking. So a student
  whose name is a shortened form of a classmate's name, even one in another period, is silently given that child's score.
- **Probe:** `p3-wrongchild.js`. In 4th Period, Jonathan Smith types "Jon Smith" and Robert Doe types "Bob Doe". 5th Period has
  Smith, Jon and Doe, Bobby.
  ```
  rows how: [["Jon Smith","exact","SMITH, JON"],["Bob Doe","loose","DOE, BOBBY"],…]
  P4 list:  SMITH, JONATHAN  No test turned in / DOE, ROBERT  No test turned in
  P5 list:  SMITH, JON 30/36 · DOE, BOBBY 30/36
  detail buttons for Jon Smith (P5): ["‹ Tests"]
  P5 Copy scores column: "30\n30\n\n\n\n"
  ```
- **What the teacher sees:** Jonathan and Robert show "No test turned in", with no flag. Jon and Bobby have scores, which Copy
  scores pastes into Focus. If Jon and Bobby really were absent, nothing ever points at the error. If they did take the test, the
  only sign is a "Two tests" flag, and it can only be answered by choosing one test. The other child's test stays under the wrong
  name.
- **Smallest fix:** Put a "Not theirs: give it to another student" action on every placed record. It would pin the record to the
  chosen student and clear the row's `who`, `how` and any alias. Also prefer the class the row's other cells point to before
  taking an exact match in another class.

### C2. "Tally remembers it for that name" gives later tests to the wrong child, silently and forever
- **What happens:** Choosing a student in "Who turned this in?" saves `alias[nameKey(typed)]`. `examMatch` checks that alias
  **before** any name matching. It applies to every later response with the same words, in any class, unit or year. It is also
  applied at once to every other unmatched row with the same name. There is no screen to see or clear an alias. The row is then
  marked `how: 'you'`, so it is never questioned again.
- **Probe:** `p3-wrongchild.js`. In Unit 10, "Ava" (Ava Brooks, P4) is answered as BROOKS, AVA. In Unit 11, Ava Nguyen (P5) types
  "Ava".
  ```
  alias now: {"ava":{"sec":"1205050-7T4A","n":"BROOKS, AVA"}}
  Unit 11 "Ava" (typed by P5 Ava Nguyen) went to: 4th Period · On-level|BROOKS, AVA
  rows how: [… ["Ava","you","BROOKS, AVA"],["ava","you","BROOKS, AVA"]]
  ```
- **What the teacher sees:** Ava Nguyen's Unit 11 score sits on Ava Brooks's row, and Ava Nguyen shows "No test turned in". No
  question is asked. A flag appears only if Ava Brooks also turns in a test, and then it reads "turned in 2 tests", which C1 means
  cannot be undone.
- **Smallest fix:**
  - Use a remembered answer only when the typed words still match nobody, or more than one student, on their own. Never let it
    override a clear match.
  - Keep it per test, or at least mark rows matched this way as "remembered" and let him undo them.
  - Don't apply the answer silently to the other rows with the same name. Offer it instead.

### C3. A test given by hand disappears when its student changes class (or is renamed or dropped)
- **What happens:** A pinned record whose student is no longer in that class is moved to `loose` by `examRefile`, with `pin` still
  set. The "Nobody turned in" flag skips any record with a pin (`!x.pin`). So the record is shown nowhere: in no class, under no
  flag, in no count.
- **Probe:** `p4-roster.js`. Liam's test, which nobody turned in, is given to Liam by hand in 4th Period. New Focus and IXL exports
  then move Liam to 5th.
  ```
  Liam's test given by hand -> 4th Period · On-level|COLE, LIAM (pin)
  rosters after move: ["4th: LEE, MIA; …","5th: RAY, ZOE; FOX, ELI; KERR, IAN; COLE, LIAM"]
  Liam's pinned test now -> loose
  flags/rows per class: ["4th: [] …","5th: [] rowsWithTest="]
  5th page shows Liam's code anywhere: false | Liam row: 4  COLE, LIAM  No test turned in
  ```
  For comparison, a student matched **by name** who moves is matched again correctly (`p4b-cap.js`: "name-matched Noah after
  moving to 5th -> 5th Period · On-level|PARK, NOAH").
- **What the teacher sees:** "No test turned in" for a student whose test he placed himself. Copy scores leaves the cell blank.
- **Smallest fix:** In `examRefile`, if a pin's student is gone, find them again by name in any class (as rows are). Otherwise
  clear the pin, so the record comes back as "Nobody turned in". In `flags`, treat a `loose` record with a pin as unclaimed.

### C4. A hand-edited Full save is shown as signed by the site (records are never re-verified)
- **What happens:** Records are stored already opened, as plain JSON, and a Full save's `exams` and `loose` are accepted as they
  are (`cleanExamEntry` checks only that `r` is an object). Whoever edits the file chooses the scores. The detail page still says
  "the site's signature held". A Tally key added to the save also becomes "the one to paste" on the Connect page: the saved keys
  keep their order and this Tally's own keys are put before them.
- **Precondition:** Someone must be able to edit a Full save that he then opens (for example from his Drive or Downloads, or a
  file handed to him). The site is never involved.
- **Probe:** `p9-fullsave.js`. A real 12/36 record is edited to 36/36, a test is made up for another student, and a key pair is
  appended.
  ```
  AMES, BO 36/ 36   ·   CRUZ, DI 35/ 36
  detail says: "… Opened today 11:35 AM, from the site; the site's signature held." | score "36 / 36 100%"
  Connect page "the one to paste": … | is the edited save's key: true
  ```
- **What the teacher sees:** Forged scores that look exactly like real ones. If he then pastes "the one to paste" into the
  cockpit, every later record is locked to a key someone else holds.
- **Smallest fix:** Keep each record's **locked text** (base64url) instead of its opened JSON, and open and verify it when it is
  loaded and shown (cache the opened copy in memory only). The locked text is deflated, so this also shrinks storage about 3–4×
  (see H3). Until then: don't say "the site's signature held" for a record that came from a file, and after a Full save is
  opened, keep this Tally's newest key as the one to paste.

## High

### H1. Loose matches are taken silently and are marked nowhere on screen
- **What happens:** `matchName` takes a "forgiving" match (a nickname that starts the same, one slip, a last initial) when no other
  student scores close to it. NOTES says such a match "is marked `how: 'loose'`", but that mark is only in the data. The class
  view, the test page and Copy scores never show it.
- **Probe:** `p1-names.js` (pure) and `p3-wrongchild.js`:
  ```
  "Bob Doe"      -> loose 6:Doe, Bobby        (6:Doe, Robert exists)
  "Jonny Smith"  -> loose 5:Smith, Jon        (4:Smith, John and 4:Smith, Jonathan exist)
  "Jon Smith"    -> exact 5:Smith, Jon        (4:Smith, Jonathan typed it)
  "Alex Parker"  -> loose 5:Parker, Alexander James
  ```
  What held: two Johns, two Avas, Lee Thomas / Thomas Lee, De La Cruz / Cruz, a middle name instead of a first name, a bare first
  or last name, a number, an email address and an empty name all **ask** the teacher. Accents, curly apostrophes, hyphens, tabs,
  quotes, emoji and "Last, First" all read correctly.
- **What the teacher sees:** A score on a student who never typed their own name, with nothing to tell it apart from an exact
  match. Together with C1, it cannot be undone either.
- **Smallest fix:** Show a "Matched loosely: ‘Bob Doe’" chip on the row, with a one-click "Not this student". Or ask whenever the
  forgiving match's student is in a different class from an exact or forgiving candidate.

### H2. After 2,000 responses, older tests lose their students
- **What happens:** `X.rows` is cut to the newest 2,000, in `examTakeSheet` and again at every load. Each record is placed by its
  rows, so every record whose row was dropped becomes "Nobody turned in". With it go the teacher's "Who" answers for those rows.
  About 150 students × 13–14 tests reaches 2,000 rows within the school year. Re-pasting the whole sheet then puts the dropped rows
  back and pushes others out.
- **Probe:** `p4b-cap.js`. Five records are placed in 4th Period, then 2,000 later responses are pasted.
  ```
  rows kept 2000 | records whose student changed after 2000 later responses:
  ["4th Period · On-level|LEE, MIA -> loose", "…RUIZ, ANA -> loose", "…TATE, MAX -> loose", "…VANCE, IDA -> loose", "5th Period · On-level|PARK, NOAH -> loose"]
  4th period, Unit 10: "Nobody turned in" flags now: 5
  ```
- **What the teacher sees:** Old tests turn into "Nobody turned in". Those students show "No test turned in", Copy scores is blank
  for them, and each test has to be given back by hand.
- **Smallest fix:** When a record is placed by name, write its student into the record's entry (`e.n` is already there, and
  `examRefile` overwrites it) and keep it. Drop rows without dropping their effect, or drop only rows whose codes are held and
  placed.

### H3. Tests fill the browser's storage within months, and then all of Tally stops saving, with a toast that blames IXL
- **What happens:** Each opened record is kept as JSON in `localStorage`, and every `save()` writes all of Tally as one string.
- **Probe:** `p7-storage.js` and `p11-perf.js`:
  ```
  class of 28 x 10 tests: tally.v1 13297 -> 1721534 chars (+1.63 MB), save ok=true
  700 records: … stored 4.27 MB
  + 1120 more records: save ok=false; held in memory: 1400
  toast: "Could not save: this browser's storage is full. … What fills the room is each class's IXL history, best scores and grade history …"
  after reload, records held: 280
  ```
  NOTES admits the size ("~8 MB … past the ~5 MB"). What NOTES does not cover is how it fails.
- **What the teacher sees:** At about 750–800 tests, a little over five unit tests for 150 students, every save fails. That
  includes his IXL imports and grades, not just Tests. The message points him at the wrong cause. A reload brings back only what
  was saved before the limit.
- **Smallest fix:** Store the locked text (C4's fix), which is several times smaller, or keep records in IndexedDB. Name Tests in
  the "storage full" message. Warn in Tests at about 70% full.

## Medium

### M1. "Apart from the class" cries wolf on two equal sittings and on a make-up, and its words go beyond the evidence
- **Probe:** `p5-flags.js` (`TZ=America/New_York`):
  ```
  10 records: 5 at 9:40, 5 at 1:05 pm (two equal clusters)  apart ×10, opening ×5
  6 records: 3 at 9:40, 3 at 1:05 pm                        apart ×6
  make-up alone at 2:30 pm, own opening (teacher-made)       apart:S9, opening:S9
  opening tie: 3 in opening A, 3 in opening B               opening ×3 (whichever key happened to come first)
  ```
- **What the teacher sees:** Every student of a class that sat in two groups on the same day is told, in a warning: "A test taken
  apart from the class **may have been taken at home while it was open, or started early to see the questions.**" A make-up he
  arranged himself gets the same sentence, plus an "opening" flag.
- **What held:** 4 vs 5 records (no flag at 4), 19 vs 21 minutes before the median start, every student identical, a missing
  `site.opened` (left alone), a sitting at exactly twice the median (no flag) against one just over.
- **Smallest fix:**
  - Skip "apart" and "opening" when no single group holds a clear majority (for example, when the largest group is under 60%).
    Break ties in `opening` by saying "two openings" rather than flagging half the class.
  - Word it as fact: "started at 1:05 pm, 3 h after the rest of the class". Keep "at home" out of a warning, or move it to the
    test's own page as one possibility among several, make-ups included.

### M2. Flags never go away after the cause is fixed, and a re-submitted form makes a "shared code" flag that holds back the score
- **Probe:** `p12-stale.js` (pure):
  ```
  1. typo row + corrected row:   ["none: No test on the site has the code K7QF-2M9D-X4TA (BROOKS, AVA)."]  (forever)
  2. "Ava" then "Ava Brooks", same code: ["shared: Two students turned in the same code: Ava and BROOKS, AVA."]  placeAll: {…: null}
  3. not-a-code row + fixed row:  ["badcode: “K7QF 2M9D” (BROOKS, AVA) is not a code …"]  (forever)
  ```
- **What the teacher sees:** Warnings that stay in the tab's count after he has done what they asked. A student who sent the form
  twice is accused of sharing a code, and their score is held from Copy until he answers. Responses and failed codes cannot be
  dismissed or deleted.
- **Smallest fix:**
  - Leave out "none" and "badcode" for a student who already holds a test of this unit.
  - In `placeAll`, treat an unmatched row as the same student when its words are a subset of the matched row's name.
  - Add a "Dismiss" to these flags.

### M3. A school filter or a missing route turns every code into "not a record" or "a typo", and Try again skips them
- **Probe:** `p6-network.js`, on the shipped file:
  ```
  html (200 text/html "Blocked by your school web filter") -> "… opens to something that is not a test record."  (why: format)
  txt404 (404 text/html)                                    -> "No test on the site has the code … " (why: none; "Most likely a typo")
  Try again refetched: ["c500","redir"]   html-answer code still failed as: { why: 'format' }
  ```
- **What the teacher sees:** If his network blocks the route, or the site is not deployed yet, each of 150 codes gets "Ask the
  student for the code on their screen", and each needs its own "Fetch again".
- **Smallest fix:** Treat a non-JSON answer, or a 404 whose body isn't the site's `{error:'none'}`, as `net`. Have the toast say
  "the site answered with something else". Try again should include `format` failures.

### M4. Hide names shows a name a student typed into the code box
- **Probe:** `p10-ui.js` and `p10b.js` (screenshot `probes/hide-names-badcode.png`). With Hide names on:
  ```
  “Bart Kowalczyk” (B. K.) is not a code: a code is 12 letters and digits, like K7QF-2M9D-X4TB.
  ```
  The `badcode` flag puts `r.raw` on screen exactly as typed. It shows in the class view, under "N more", and on the board behind
  the dialogs. Every other place Tests shows a student (rows, test page, "Who", "Two tests", toasts) was masked.
- **Smallest fix:** When `hideNames` is on, show only a mask of `raw` (for example its length), or nothing.

### M5. A hostile log of a few thousand entries freezes a test's page
- **Probe:** `p8-hostile.js`. A record with 10,000 visits, times away and timeline entries:
  ```
  seconds 1e9 and 10,000 entries  rendered=true ms=28248 text chars=3891101
  ```
  The site caps a log at 64 KB, which still allows roughly 4,000 well-formed entries. The honest page caps its lists at 100 and 300.
- **Smallest fix:** In `readRecord`, cap each list at the design's caps (300 visits, 100 each other) and add the rest to `drop`.
  Cut `paper.notes` and the device strings, as answers already are.

## Low

- **L1. `findCodes` (Windmill `seal.js`) reads "code K7QF-2M9D-X4TB" as `C0DE-K7QF-2M9D`.** The real code is lost, and a "typo"
  flag is raised for the wrong one (`p2b-codes.js`). "my code is …", "Code: …" and en or em dashes read correctly. A cell whose
  only readable form is "K7QF - 2M9D - X4TB" (spaces around hyphens), dots or slashes is not found unless other rows set up the
  column. The fix belongs in Windmill (prefer a grouped run containing a digit in each group), not in Tally's copy.
- **L2. The name column is the first one whose header has "name" in it.** A form with "Partner name (if any)" before "Your name"
  files every test under the partner (`p2-sheet.js`). The fix is to prefer "your/full/student" over other "name" headers.
- **L3. A form that only collects email addresses (no name question) makes every row "has a code and no name"** (`p2-sheet.js`).
  The email's local part could be offered as the name, marked as a guess.
- **L4. Opening the cockpit's results file on a Tally with no site key yet (offline) reports every record as "not a test
  record".** The `nosite` error is mapped to `format` (`exams.js` `examOpenFile`).
- **L5. The period flag gives a minute's grace after the bell but none before it, and mixes clock styles.** A start at 9:39:30 for
  a 9:40 period is flagged. Its text says "(09:40–10:30)" next to "1:05 pm" (`p5-flags.js`).
- **L6. A new site key is trusted the first time Tally sees it, and nothing says so.** After a signature fails, Tally fetches
  `/api/test/key` and keeps whatever comes back for good, with "pairing checked" still shown. DESIGN says Tally keeps every key
  "it has been paired with"; a key made again was never paired. The fix is to say "The site's key changed" in the Connect status
  and offer the trial again.

## Notes

- **N1.** The "rule" flag says "The site should have locked it … the page may have been tampered with". It is the page
  (`proctor.js`) that locks, not the site. The logic itself held against `proctor.js`: away entries are closed only by "Back to
  the test" or an unlock, so an honest page cannot produce more than `after` times away with no unlocks.
- **N2.** The "long" flag (over twice the median) catches extended time, an ESE accommodation, with "may have been left open and
  come back to". It is hedged, but it could mention accommodations.
- **N3.** Copy scores copies `points` even when `points > of` or `of = 0`. The toast says the tests are not all out of the same
  points. Only a signed record can carry such values, so this is safe today.
- **N4.** A response row that matched nobody is never matched again when the roster later gains that student. The "Who" flag
  still asks, so nothing is lost silently.
- **N5.** "Clear all Tally data" does not mention Tests' key. It does download a Full save first when there is unsaved work, which
  covers a newly made key (`p9-fullsave.js`).
- **N6.** A scratch grid with absurd coordinates draws `NaN` and `Infinity` attributes. That logs SVG console errors, and nothing
  else happens (`p8-hostile.js`).

---

## Attacked and held (each with a run)

- **No HTML from a record anywhere** (`p8-hostile.js`). I tested markup and attribute breakers in every string field: part ids,
  types, typed answers, keys, `cv`, `kit`, `seed`, `id`, device fields, calculator, away, blocked, idle, scratch notes, keys of
  `log.q` and `log.parts`, and the timeline. Wrong types too: `log:"x"`, `parts:null`, `points:"24"`, `site` fields as strings or
  negative, `rule:"lock"`, `ended:{}`, `log.away:{}`. Also junk `parts` entries, a 400-deep answer and 500 parts. The page made 0
  `img` elements and 0 event handlers, the title never changed, every page rendered and the class view stayed whole.
- **The network** (`p6-network.js`, shipped file):
  - The CSP is `connect-src https://mrshaffer.org` only.
  - All 151 requests were `GET /api/test/key` or `GET /api/test/result/<12>`, three at a time at most. No cookie, referrer or
    authorization was sent; the only extra header was `Origin: null`. No name was ever sent; the row that matched nobody was
    fetched by its code alone.
  - A 302 to another host was blocked by the CSP and counted as network.
  - A 500 counts as network and is retried by Try again. A 10 MB body is "not a record", with no crash.
  - Offline, the toast says "0 of 3 fetched … Try again".
  - The address setting can be changed, but the shipped page can still reach only mrshaffer.org (by its own CSP, and it says so).
- **The lock's use:**
  - A record whose signature fails, one locked to another Tally, or one carrying another code's name is never kept or shown. This
    is covered by `exam-e2e` (the forged perfect score is shown nowhere) and the `examFetch`/`examOpen` code paths.
  - A trial record is never taken as a result (`rec.trial` becomes `format`), and a real record can't pass as a trial (that needs
    `trial === true` and a `nonce`).
  - The four words match the cockpit's (`p6`: "barn snail canyon tree" on both sides).
  - The results file's own `site.key` is never trusted.
  - Opening a Full save keeps this Tally's keys.
- **The key stays home** (`p9-fullsave.js`). The private half is only in `localStorage['tally.v1']` and the Full save. It is not in
  sessionStorage, the DOM or the URL. The Board save carries nothing of Tests (`/"exam"|"exams"|TALLY1\.|"pairs"|"priv"/` found
  nothing). Copy key and Copy words copy only the public key and the words.
- **The response sheet** (`p2-sheet.js`):
  - Columns in any order, no header row, extra columns, an email column, a "Teacher" or "Period" column, quoted CSV with commas and
    newlines inside, CRLF, a BOM, tabs, a 12-hour timestamp and two codes in one row all read correctly.
  - 500 rows are read in 12 ms.
  - Re-pasting the same sheet, the same rows as CSV, or the same row with the name in other case adds nothing (5 rows stay 5;
    `p4b-cap.js`).
  - Opening the same results file twice counts "already here".
- **Name matching** held in every case listed under H1, and a name-matched student who changes period is matched again correctly
  (`p4b-cap.js`).
- **Flags** (`p5-flags.js`):
  - The thresholds sit exactly where the contract puts them: five records, 20 minutes, twice the median, `lock`: more than
    `after` with no unlocks, `end`: `after` or more and not `left`.
  - The period flag allows one minute's grace after the bell, and a make-up on another day inside the period is not flagged.
  - Midnight and the 1 Nov time change behave sensibly.
  - `ended: 'time'` and `site.limit` are worded as CHANGES §9 says.
- **The rest of Tally** (`p10-ui.js`, `p13-veil.js`):
  - The sixth tab fits on one row at 1366, 1024, 900 and 768 px wide, with no horizontal scroll.
  - Keyboard only: Tab reaches a student row, Enter opens it, Escape returns, and the flag buttons are focusable.
  - The privacy screen covers a test's page.
  - The shipped file loads in 315 ms.
  - No console errors in normal use. The only errors were N6's, in the hostile run.
  - With 700 records, the Tests tab renders in about 110 ms and one save takes 256 ms (`p11-perf.js`).

## Not tested, and why

- **Real Google Forms exports:** I can't use real files, so I used synthetic sheets in the shapes Forms produces. A real
  "Download CSV" file may name its columns differently.
- **The real site, other browsers, the tablet:** I did not run against the real site, Safari or Firefox, or the Galaxy Tab
  (`content://`). The real Chrome OS storage quota is also untested; Chromium's own limit gave the failure above.
- **Two Tallys at once:** I did not run two Tallys with different keys at the same time. I read the "locked to another Tally"
  path, and the e2e suite covers it.
- **Real time zone and DST on the laptop:** the flags were run in Node with `TZ=America/New_York`, not on his laptop's settings.
- **The full Tally suite:** I did not run it, as instructed. Only the two Tests suites and my probes ran.
