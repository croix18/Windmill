# Tally "Tests", third pass (`62d861c`)

**What I reviewed:** a detached worktree at `/home/claude/reviews/tally-tests/wt3`. I built into `build3/`, and the probes are in
`probes/r3_*` (harness `r3_h.js`). As before: synthetic students only, and one browser at a time.

**Whole suite** (`nice node tests/run.js` in `suite3/`; log `r3_suite.log`):
**`74 suites · 2438 passed · 0 failed · 0 skipped`**.

**Shipped file:** the committed `Tally.html` and `index.html` are one commit stale (R3-L3).

**Counts: Critical 1 · High 1 · Medium 1 · Low 3 · Note 2.**

## Critical

### R3-C1. An edited Full save can bring its own site key, and a test it made up scores as signed by the site
- **What changed:** The R2-H3 fix carries `paired` site keys in the Full save. Any key marked `paired` there is trusted, in this
  browser and in a fresh one (`examChecked` includes `s.paired`). The Full save also holds Tally's own key pair. So whoever can
  edit a save he later opens can do all of this, with nothing checked against the site:
  - make a "site" key and mark it paired;
  - seal a test with it;
  - give the test to any student.
- **Probe:** `r3_p9-forged.js`:
  ```
  save site keys: BIwXE-l- paired, BFwKNADJ paired
  same browser: … 2 CRUZ, DI given by you 36/ 36 100% … | status of the forged test: ok
  fresh browser: status: ok | conn: "Connected to mrshaffer.org (from your Full save of Nov 16)"
     its page says: "… opened and checked with the site's signature today."
  ```
  This reopens the first pass's C4 by a new route.
- **What the teacher sees:** A perfect score that looks exactly like a real one. Copy scores copies it.
- **Smallest fix:** Trust a key marked `paired` in a save only if `GET /api/test/key` serves that same key in this session, or a
  trial in this browser proved it. The lost-laptop day still works, because the site still serves its key. For keys the site
  has since replaced, have the site serve its earlier keys signed by its current key.

## High

### R3-H1. A second paste made while a fetch is still running is never fetched
- **What happens:** `examFetch` returns at once while `examJob.running`. The second paste's rows are kept, but their codes are
  never fetched. Nothing marks them: they are not held and not failed, so they appear in no list and in no part of the count line.
- **Probe:** `r3_p13-ledger.js` 1 (site answering in 0.5 s; three rows pasted, then three more while the first fetch ran):
  ```
  {"held":3,"row":3,"waiting":0,"nobody":0} | requests for the second paste's codes: 0,0,0
  4th list: ["4 TATE, MAX No test turned in","5 COLE, LIAM No test turned in","6 WARD, EMMA No test turned in"] | flags mention them: false
  count: All classes: 3 tests held = 3 with a student + 0 waiting for you + 0 nobody turned in.
  ```
- **What the teacher sees:** Three children with "No test turned in" who did turn one in. If he copies scores then, they go to
  Focus blank. Pasting the same sheet again does fetch them, but nothing tells him to.
- **Smallest fix:** When a fetch finishes, fetch every code on any response row that is neither held nor failed. Until it is
  fetched, show such a code in Waiting for you as "not fetched yet".

## Medium

### R3-M1. A silent wrong placement is still possible past the nickname table and the edit rules
- **When it happens:** Two students share a last name, and one types a variant of their own first name that is exactly the
  other student's first name.
- **Probe:** `r3_p1c-silent.js` (pure). 15 of 31 constructed pairs were placed without asking:
  ```
  "Shawn Lee" typed by Lee, Sean -> placed on Lee, Shawn      (and the reverse)
  "Hank Hill" by Henry · "Peggy" by Margaret · "Ted" by Edward · "Xander" by Alexander · "Sasha" by Alexandra · "Gigi" by Georgina
  "Ty Ng" by Tyler · "Al Wu" by Alan · "Jo Kim" by Joanna · "Bo Li" by Bowen · "Noor Khan" by Nur · "Kathryn Ross" by Katherine
  "Ana Schmidt" typed by Smith, Ana -> placed on Schmidt, Ana
  ```
- **What closed:** every case R2-H1 listed now **suggests** instead of placing (`r3_p1b-rivals.js`; in the browser `r3_p3`:
  "Bobby Doe" → `DOE, BOBBY?` with Robert among the candidates).
- **Rarity:** every case needs both children on Tally's rosters, so this is rare. When it happens it is undoable with Not theirs.
- **The cost in questions** (`r3_p1d-questions.js`):
  - The fixture asks **3** (all deliberate).
  - A synthetic school of 150 with common names, where every child types their own name correctly, asks **8 a test**: Sophia
    and Sofia Thomas, Ella and Ellie Jones, Mia and Mila Anderson, Ellie and Eleanor Johnson.
  - The same 8 come back on every test, because a remembered answer is only offered, never given, while a rival exists. Each
    needs only one click ("as you said before?").
- **Smallest fix:** Treat as rivals any two students with the same last name whose first names start with the same letter, or
  where one is a prefix of 2 letters or more of the other. Add the missing common pairs to `NICKNAMES`.

## Low

- **R3-L1. The Student-ID binding with unstable IDs, or an ID given to another child.**
  - With stable IDs (`r3_p4-ids.js`), placements held:
    - A child who withdrew → `none was SMITH, JOHN`.
    - A move → `5th|PARK, NOAH`.
    - 6th's namesake → "No test turned in".
  - With IDs that shift by row position, the case the coordinator asked me to keep: every placement left its student
    (`Mia -> none was LEE, MIA`, and the same for Noah, Ana and Max). The teacher would see every test in "Nobody turned in" or
    "Waiting for you", marked "had been given to" the very child still on the roster. Nothing goes to a wrong child.
  - An ID re-used for a sibling, or for a "… Jr" (`r3_p4b-idattack.js`): the test moves to that child for a moment. Its
    response row ("John Smith") then contradicts it, and it ends in Waiting `was SMITH, JANE`. A test given by hand, with no
    row to contradict it, would stay on the sibling; I read this from the code and did not run it. Real Focus Student IDs are
    stable and not re-used.
- **R3-L2. A question dialog left open while a Full save opens over the data is answered into the new data.** The ledger
  stayed consistent (`r3_p13` 5: `sum ok: true`), but the stale answer sets a remembered name.
- **R3-L3. The committed `Tally.html` and `index.html` are not built from `62d861c`.** They differ from a fresh build only by
  `ccd32f0`'s `--r-pill` (they keep `999px`). This is cosmetic, but the shipped file should be rebuilt before it goes out.

## Notes

- **The ledger held in every sequence I tried that isn't R3-H1** (`r3_p13`):
  - Two rows naming one code, answered in opposite orders: it stays in Waiting, which is right.
  - Deleting a class that holds a waiting test: 5 = 3 + 2 + 0.
  - Undo after a roster import: it is gone, and says so.
  - A Full save opened mid-question: `sum ok: true`.
  - Not theirs, then Cancel, Undo or Nobody yet: all correct (`r3_p3b-notheirs.js`).
- **Saves from other Tallys** (`r3_p9-forged.js`):
  - An **older** save (no `paired`, a trial on record) scores on a new browser.
  - A save with **no site keys** says "this Tally hasn't checked the site's key yet: enter a trial code" and scores nothing,
    which is right.

## The second pass's findings

| # | Status | Output |
|---|---|---|
| R2-C1 a test follows a namesake | **Closed** with stable IDs (R3-L1 for unstable ones) | `John withdrew -> none was SMITH, JOHN`; `6th list: SMITH, JOHN No test turned in`; `Noah moved to 5th -> 5th\|PARK, NOAH` |
| R2-C2 limbo after Not theirs → Cancel | **Closed** | `Not theirs → Cancel: 4th\|LEE, MIA (exact) \| … 1 with a student`; Undo restores; Nobody yet → listed under Nobody turned in |
| R2-H1 silent nickname / transposition / short or spaced names | **Closed** for every listed case; residual **R3-M1** | `"Bobby Doe" -> suggest Doe, Bobby`, `"Sara Khan" -> suggest`, `"Tom Vandyke" -> suggest` |
| R2-H2 missing locked copy can't be fetched | **Closed** | `"Fetch again" pressed: requests made 1 \| status now ok \| row: "28 BELLO, TUNDE 25/ 36"` |
| R2-H3 a new browser scores nothing | **Closed in function** (`rows with a score 28 … statuses {"ok":280}`), **but opens R3-C1** | — |
| R2-M1 no IndexedDB | **Narrowed** (the notice and the 40% warning are from NOTES; I didn't check them) | Still `2000 tests put … saved:false`, and after a reload `tests held 0` if the warnings are ignored |
| R2-M2 dismissed-flag ids collide | **Closed** | `twice …\|m7/10\|AAAA1,AAAA2` vs `…\|m7/11\|BBBB1,BBBB2`; `other`, `badcode` and `net` ids carry the test and codes |
| R2-M3 Copy during the check | **Closed** | `Copy right after reload: 28 scores of 28` |
| R2-L1 unverified score in dialogs | **Closed** | `give dialog …: "ZZZZ-2222-ZZZZ. Nobody turned this code in."` |
| R2-L2 v1 nobody's test stays legacy | **Closed** | `legacy left 0` |
| R2-L3 the class hint | **Closed** (seen once) | `“Jon Smith” — SMITH, JON? The test started 9:40 am with 4th Period's tests.` (correct) |

Also re-checked:
- Hide names: no name on screen or in markup. The one hit was a toast written before Hide names was turned on.
- The tab fits at 1366, 900 and 768 px.
- The shipped file loads in 168 ms.
- No console errors.
