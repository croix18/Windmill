# Tally "Tests", second pass: the v2 data model (`bba61f8`)

**What I reviewed:** a detached worktree of `tests` at `bba61f8`, at `/home/claude/reviews/tally-tests/wt2`. The shipped
`Tally.html` I built into `build2/` is byte-identical to the committed one.

**How I ran it:**
- The probes are in `probes/`, all named `r2_*`. The harness is `r2_h.js`. They use the same method as the first pass:
  synthetic students only, fresh keys from `seal.js`, and a stand-in site served through Playwright.
- `build2/Tally.probe.html` is the test build plus an eval hook. The network probe (`r2_p6`) runs on the **shipped** file.
- The pure probes run under Node with `TZ=America/New_York`.

**Whole suite** (`nice node tests/run.js` in a separate copy, `suite2/`; log in `r2_suite.log`):
**`73 suites · 2420 passed · 0 failed · 0 skipped`**. This includes exam-core 106, exam-e2e 78 and exam-storage 8.

**Counts: Critical 2 · High 3 · Medium 3 · Low 3 · Note 3.**

---

## Critical

### R2-C1. A test follows a departed student to a different child with the same name, still marked "given by you"
- **What happens:** When a test's student is no longer on any roster, `examRefile` searches every class for one student
  whose name matches by `norm` (`hit.length === 1`), and moves the test to that student. A second John Smith in another
  period counts as "the same student". The original `how` is kept, so even the teacher's own answer moves.
- **Probe:** `r2_p4-roster.js`. Two John Smiths exist (4th and 6th). The teacher answered that the test is 4th's John. Then
  4th's John leaves (new 4th exports without him).
  ```
  answered 4th's John -> 4th|SMITH, JOHN (you)
  B. rosters: ["4th: LEE, MIA; …","5th: …","6th: SMITH, JOHN; VANCE, IDA; WU, AL"]
     4th John's test now -> 6th|SMITH, JOHN (you)
     6th Period list: ["1\tSMITH, JOHN"]          (with the score; Copy scores copies it)
  ```
- **What the teacher sees:** 6th Period's John Smith has a test he never took, labeled as the teacher's own choice. Nothing
  says it moved.
- **Smallest fix:** Follow a student by name only when the name is unique across all rosters both **before and after** the
  import, and never move a `how: 'you'` placement. Otherwise make it "nobody" with its "was" line (which the code already
  does when there is no match).

### R2-C2. "Not theirs", then Cancel, leaves the test where nothing lists it
- **What happens:** Not theirs adds the student to `no` and opens the picker. If he presses **Cancel** (or Undo after giving
  the test to someone), the test is in state `waiting`:
  - It is in no class.
  - It raises no "Who?" flag, because its response row still names the excluded student, so `r.who` is set and the "who" flag
    skips the row.
  - It is not "Nobody turned in", because it is not `nobody`.
  - The only trace is the count line.
- **Probe:** `r2_p3-match.js` (Robert Doe's test had landed on 5th Period's Bobby Doe):
  ```
  2. Not theirs picker offers: ["SMITH, JON","NGUYEN, AVA",…]          (Bobby rightly left out)
     after Cancel: Robert's test -> none was DOE, BOBBY | count: … 3 with a student + 3 waiting for you + 0 nobody
     any flag in any class about it: []
  3. given to Robert -> 4th|DOE, ROBERT (you)
     Undo -> none was DOE, BOBBY | count: … 3 waiting for you …
  ```
- **What the teacher sees:** Robert shows "No test turned in" and Bobby has nothing. "3 waiting for you" leads nowhere. The
  test is lost unless he remembers its code.
- **Smallest fix:** In `flags`, give every record in state `waiting` that no other flag mentions a flag listing it (for
  example "A test waiting for you: <code>, last on <was>", with "Give it to a student"). Or make Cancel in the Not theirs
  picker mean "Nobody yet".

## High

### R2-H1. "Exact and unrivaled" still puts some tests silently on the wrong child
- **What happens:** A name is taken without asking only if no other student is "near" it. But "near" misses nicknames that
  aren't prefixes, transposed letters (an edit distance of 2), last names under 4 letters, and a space inside a last name.
- **Probe:** `r2_p1b-rivals.js` (pure). Each line is typed by the child in the third column:
  ```
  "Bobby Doe"   typed by Doe, Robert      -> pick Doe, Bobby     PLACED SILENTLY ON THE WRONG CHILD
  "Bill Ng"     typed by Ng, William      -> pick Ng, Bill       (same)
  "Liz Park"    typed by Park, Elizabeth  -> pick Park, Liz      (same)
  "Elisa Garcia" typed by Garcia, Elias   -> pick Garcia, Elisa  (same)
  "Sara Khan"   typed by Kahn, Sara       -> pick Khan, Sara     (same)
  "Mia Lee"     typed by Lea, Mia         -> pick Lee, Mia       (same)
  "Tom Vandyke" typed by Van Dyke, Tom    -> pick Vandyke, Tom   (same)
  ```
  In the browser (`r2_p3-match.js`), "Bobby Doe" from 4th's Robert is placed `exact` on 5th's Bobby, and 5th's Copy scores
  column carries his 22.
- **What held:** a dropped hyphen, a second last name, Jr., reversed names, a middle name used as the first name, a dropped
  two-word first name and an accent-only difference all ask or suggest.
- **What the teacher sees:** A score on the wrong child, with nothing to tell it apart from a certain match. It can now be
  undone with Not theirs, but only if he notices.
- **Smallest fix:**
  - Count a first name as near when it shares a last name and an edit distance of 2 or less, or when it is in a small table
    of common nicknames.
  - Count a last name as near at 3 letters with distance 1, or when it equals the other with spaces removed.
  - Simplest of all: when the matched student and the near student are in different classes, ask.

### R2-H2. A locked text lost from IndexedDB can never be fetched again
- **What happens:** If the browser drops a test's locked text but keeps `tally.v1`, the test shows as "its locked copy is
  missing: fetch it again". But `examFetch` only refetches codes that are new or `legacy`
  (`(!X.recs[c] || X.recs[c].legacy)`), so the button sends nothing.
- **Probe:** `r2_p7-storage.js` C:
  ```
  C. text missing from IndexedDB: status missing | says: "1 test here can't be shown: its locked copy is missing: fetch it again. BELLO, TUNDE (KQ9P-…) Fetch again"
     "Fetch again" pressed: requests made 0 | status now missing | row: "28 BELLO, TUNDE A test that can't be shown: see above"
  ```
- **What the teacher sees:** A button that does nothing, and a student who never gets a score. If his Full save was made
  after the loss, it lacks the text too.
- **Smallest fix:** In `examFetch`, also fetch codes whose status (`xtVer`) is `missing`.

### R2-H3. On a new browser, a Full save scores nothing, and the Connect page says nothing needs doing
- **What happens:** Opening a Full save in a fresh browser leaves every test "unchecked". Site-key trust is per browser
  (`tally.exam.local`), so nothing scores until a trial proves the site's key there.
- **Why he gets stuck:**
  - Connect says the saved key "opens your tests with it; nothing needs pasting".
  - The trial-code box stays disabled until he makes this Tally's own key. Making one moves the cockpit to this browser.
  - Records signed by a site key that has since been replaced can never score on that browser. NOTES lists this among the
    decisions.
- **Probe:** `r2_p7-storage.js` D:
  ```
  D. new browser after the Full save: rows with a score 0 | status: Connected … · this Tally hasn't checked the site's key yet: enter a trial code
     statuses: {"unchecked":280}
     Connect page: "… Your Full save brought a key this Tally did not make … This Tally opens your tests with it; nothing needs pasting. Make a key of this Tally's own only to move the cockpit to this Tally. …"
     round trip: Tests keys that differ: [] | locked texts 280 -> 280 | recs 280 -> 280
  ```
  The round trip itself holds: a Full save loaded and saved again is identical in its Tests parts.
- **What the teacher sees:** After a lost or replaced laptop, which is the disaster the Full save exists for, every test reads
  "can't be shown", and the instructions contradict each other.
- **Smallest fix:**
  - Allow a trial with a key that came in a Full save: show that key to paste, labeled as such. Then say plainly what to do:
    "paste this key into the cockpit, enter the trial code".
  - For replaced site keys, have the site serve its earlier keys signed by its current key, so one trial proves all of them.

## Medium

### R2-M1. Without IndexedDB, H3's failure comes back
- **What happens:** Locked texts fall back to `tally.v1`. At about 2,000 tests the save fails, and a reload holds nothing.
- **Probe:** `r2_p7-storage.js` E (`indexedDB` removed):
  ```
  E. no IndexedDB, 2000 tests put: {"ok":2000,"saved":false,"mode":"here","here":2000} | toast: "Could not save: this browser's storage is full. … What fills the room is each class's IXL history …"
     after reload: tests held 0
  ```
- **Smallest fix:** In this mode, say on the Tests page that tests live only in Tally's own storage and that Full saves are the
  only copy. Start the store warning earlier.

### R2-M2. A dismissed flag silences other flags later
- **What happens:** A flag's id is built as `kind|code|names|line`, and some kinds leave out what makes them unique.
- **Probe:** `r2_p12b-ids.js` (pure):
  ```
  Unit 10, two tests: twice id="twice||BROOKS, AVA|"     Unit 11, two tests: twice id="twice||BROOKS, AVA|"
  other id="other|||"  (every "another test" note)        badcode id="badcode||LEE, MIA|3" (row 3 of any paste)
  net id="net|P4"  (every network note in that class, forever)
  ```
- **What the teacher sees:** If he dismisses "two tests" for Ava once, he is never told again that she has two tests in
  another unit. Her row still says "2 tests: choose", and Copy leaves her blank.
- **Smallest fix:** Put the test (`course/unit`) into every id, and the response's code or time into `badcode`. Let the `net`
  and `other` ids lapse when their cause changes.

### R2-M3. Copy scores during the session's check
- **What happens:** Copy uses only records already checked this session, and its toast says nothing about the ones still
  being checked.
- **Probe:** `r2_p7-storage.js` B: "Copy right after reload: 0 scores of 28 | toast: \"No scores for On-level Unit 10 in 4th
  Period · On-level yet.\" | once checked: 28".
- **The partial case:** I read this from the code and did not run it. In the window while some records are checked and some
  are not (3.4 s at 2,250 records, `r2_p11`), Copy would copy a partial column, blank for the unchecked students, with no
  word about it.
- **Smallest fix:** While `xtVerJob` runs, have Copy wait for it, or refuse with "still checking N tests".

## Low

- **R2-L1. The "Give it to a student" and "Whose test is this?" dialogs show an unverified summary.** For a test made up in an
  edited Full save, the dialog says "ZZZZ-2222-ZZZZ: 35 / 36, taken 9:40 am–10:07 am …". The test itself is never scored or
  shown (`r2_p9-saves.js` B). The fix is to show `sum` only when `xtOk(code)`.
- **R2-L2. A v1 test that belonged to nobody stays "kept by an earlier build".** The migration keeps it, and "Fetch again" is
  offered only per class, so this test never reaches it (`r2_p9` A: "legacy left 1"). Answering its "Who?" row puts it in a
  class, where it can be fetched again.
- **R2-L3. The class hint ("started 9:40 am with 4th Period's tests") checks only classes that already have placed tests.**
  - What I saw: in `r2_p3`, the hint was correctly withheld, but only because a wrongly placed test (R2-H1) made both classes
    look possible.
  - From reading the code: when the right class has nothing placed yet, its window is never checked. The hint can then name
    the other class if the start time falls within 30 minutes of that class's starts.
  - The fix is to give no hint unless every candidate class has placed tests of this test.

## Notes

- **Copy copies `points` above `of`.** Unchanged from the first pass (N3): 40 / 36 is copied as 40, and the toast notes the
  mixed totals (`r2_p8`).
- **With Hide names on, a remembered name is still in the page's markup.** It sits in a Forget button's `data-xforget`
  attribute: not visible, but there. Every visible place is masked (`r2_p10-ui.js`, located with an attribute scan).
- **A grouped code with spaces is found only beside other rows.** "K7 QF 2M 9D X4 TB" alone in a one-row sheet is still not
  found; with other rows it is read by `readCode`.

---

## The first pass's findings, one by one

| # | Status | Evidence (r2 probe → output) |
|---|---|---|
| C1 no way to move a matched test | **Closed** (but see R2-C2) | `r2_p3`: Not theirs leaves out the current student, Undo works; "Jon Smith" with Jon and Jonathan → `suggest SMITH, JON` (asks) |
| C2 remembered name applied silently | **Closed** | `r2_p3` 4: unit-11 "Ava" by Ava Nguyen → `none`, row `remember: BROOKS, AVA` (offered); Forget clears; the remembered place lists it |
| C3 a test given by hand disappears on a class move | **Closed for a move**, **reopened as R2-C1** | `r2_p4` C: Noah moved → `5th|PARK, NOAH`; class deleted → `none was PARK, NOAH` with a Who? flag; but a namesake takes the test (R2-C1) |
| C4 edited Full save shown as signed | **Closed**; residue R2-L1 | `r2_p9` B: Bo's edited 36 → shown `21/36` (checked again); swapped text → `code`, not shown; the save's key not offered to paste |
| H1 loose matches unmarked | **Closed** for loose; **narrowed** by R2-H1 | `r2_p3`: a suggestion counts for nobody until he answers; 5th's Copy is blank for Jon |
| H2 2,000-row cap un-files tests | **Closed** (read, not rerun) | The student is kept on the record; rows are pruned only past 6,000, and only placed or nobody's rows; `r2_p4` placements survive imports |
| H3 storage fills | **Closed with IndexedDB**, **narrowed** to R2-M1 | `r2_p11`: 2,250 tests = `tally.v1 0.96 MB`, usage 8.64 MB, Full save 6.27 MB; `r2_p7` A: 747 B a test in `tally.v1` |
| M1 apart / two groups | **Closed** | `r2_p5`: equal clusters → `groups(info)`; make-up → `makeup(info)`; `r2_p5b`: 3 groups → a note; 60/40 and exactly 60% → apart with times stated as facts; 59% → a note |
| M2 stale flags | **Closed** | `r2_p12-stale`: all three cases → `[]`, placed correctly (new: R2-M2) |
| M3 filter page / HTML 404 | **Closed** | `r2_p6` (shipped): html, txt404, 500 and redirect → `net`; Try again refetched all four |
| M4 Hide names in a bad code | **Closed** | `r2_p10`: nothing visible; the dismissed list reads "Not a code" |
| M5 a huge log freezes the page | **Closed** | `r2_p8`: 10,000 entries render in 177 ms (was 28 s); no `img` elements, no handlers |
| L1 "code K7QF-…" | **Closed** | `r2_p2b`: `findCodes= K7QF2M9DX4TB`; slashes and underscores read too |
| L2 partner's name column | **Closed** | `r2_p2-sheet`: names from "Your name"; two plausible columns are asked about |
| L3 email-only form | **Closed** | names from the email's local part, offered only as suggestions |
| L4 results file with no site key | **Closed** (read) | `examOpenFile` now says to connect first |
| L5 period grace and clock style | **Closed** | `r2_p5`: a minute's grace on both sides; "9:40 am–10:30 am" |
| L6 new site key trusted silently | **Closed** (it led to R2-H3) | `r2_p7` D: an unchecked key scores nothing; the status says to enter a trial code |
| N1 rule-flag wording | **Closed** | "the page on that device did not lock" |
| N2 long-sitting wording | **Closed** | "sat for 1 h 20 min; the class's typical time was 35 min" |
| N3 points above `of` copied | **Open** (Note) | `r2_p8` Copy column holds 40 for 40 / 36 |
| N4 unmatched rows never matched again | **Closed** | `examRefile` matches every unplaced row again |
| N5 Clear all data and the key | **Closed** (read) | The warning names the key; it also clears `tally.exam.local` and IndexedDB |
| N6 SVG NaN errors | **Closed** | `r2_p8`: no console errors |

## Attacked and held

- **The network** (`r2_p6`, shipped file):
  - The CSP is still `connect-src https://mrshaffer.org`.
  - The trial's four words match.
  - 151 GETs, three at a time, no cookie or referrer. The redirect to another host was blocked by the CSP.
  - Offline, the toast says "0 of 3 fetched … Try again".
- **Matching held** where R2-H1 lists it: hyphens, second last names, Jr., reversed names, middle names, accents.
- **Remembered names** are offered, not given, when another student could be meant. Forget works. With Hide names on, the
  remembered-names list is masked (`“a.” is A. B.`).
- **The count line** "held = with a student + waiting + nobody" added up in every state I reached (`r2_p4` D): mid-fetch
  (11 = 4 + 7 + 0), after a failed fetch, after dismissing every "Who?" flag (17 = 4 + 13 + 0), and after deleting a class.
- **Verification:**
  - A record that fails its check is never in the list or in Copy (`r2_p9` B).
  - The Connect page never offers a key that came in a file.
  - A summary edited in a save is recomputed from the locked text.
- **The v1 → v2 migration** (`r2_p9` A, real v1 data from the first-pass build in the same `file://` origin): all six tests
  were kept with their students, including the one given by hand, which was kept as `you`. Nothing was duplicated, and every
  one was "kept by an earlier build" until fetched again.
- **Hostile records** (`r2_p8`): nothing was injected, and every page rendered in under 0.25 s.
- **Scale** (`r2_p11`, 2,250 tests):
  - A save takes 19 ms and a reload 202 ms.
  - Opening Tests takes 787 ms, and checking all 2,250 this session takes 3.4 s.
  - A draw takes 34 ms.
- **Width, load time and errors** (`r2_p10`): the tab fits at 1366, 900 and 768 px with no horizontal scroll. The shipped file
  loads in 214 ms. No console errors.
- **The rest of Tally:** the whole suite passes, 73 suites, 2,420 passed, 0 failed.

## Not tested, and why

- **Two Tally tabs at once** (the cross-tab merge with IndexedDB).
- **Two Tallys' Full saves opened one after the other:** only the key half was covered, by the earlier e2e and C4's key check.
- **IndexedDB cleared while localStorage survives:** I covered one dropped text (R2-H2), not a whole cleared store.
- **A real quota event in IndexedDB.**
- **The class hint across overlapping periods:** only partly (R2-L3).
- **The tablet, Safari or Firefox, and the real site.**
