# Test page, stage 2 — running notes (15 Nov 2026)

Working in `/home/claude/windmill-exam` (branch `exam`); course trees in `/home/claude/examwt/m7/m7/practice`,
`/home/claude/examwt/a7/a7/practice` (vendored with `tools/practice_kit.py --vendor`; nothing committed there).

## Done (commits on `exam`)
- Foundation after the rebase: M7 Unit 10 `run.py` ALL CHECKS PASSED; `check/exam_server.js` 720 parts, every verdict the page's.
- A `exam_pool.js` + `PracticeKit.draw` hook in `ui.js`; teacher builds carry `KIT_V`, `pack.js`, `exam/server.js` (shimmed), `exam_pool.js`.
- B `exam_unit.js` (stub unit; `Kit.ExamUnit.make(pub)`, `.judge(J)`, `.unknown`).
- C `ui.js` exam hooks (all commented "the test"): J wrap, PRE, fromHash, fresh mode, save → `EXAM.saved`, HASHV, check guard,
  change → `EXAM.read`, setPreview → `EXAM.preview`, elapsed/pause, paintScore, paintResult → `EXAM.result`, finish →
  `EXAM.finish`, paintItem → `examPaint` after Finish, nlSet/cgSet locked after Finish, no replaceState, `EXAM.page(api)` at the end.
- D `exam.js`, `exam.css`. F `check/exam_site.js`. E `exam/build_exam.py` (+ `build.py --body-to`), `exam_link.js` (+ pager.css rule).
- G `check/exam_page.js` (run by build_exam), `check/exam_link_page.js` (page.js part X). README section + Files rows; manifest.
- `exam/server.js` grade: `{v, almost: true}` for an "Almost".

## Status
- Every packing unit's test built and `check/exam_page.js` passed (M7 4 5 7 8 9 10 13, A7 3 4 5 6); A7 Unit 11 refused (pack).
- Existing checks: M7 U10 teacher copy run.py passed; M7 U10 student run.py failed only in the new part X (pager-off contexts;
  fixed: part X takes rawContext) — rerun in `/home/claude/scratch/batch3.sh` (log `/tmp/exam_batch3.log`, `/tmp/run_u10b.log`),
  which then rebuilds and checks every unit's test on the final kit. A7 U6 run.py: `/tmp/run_a7u6.log`.
- Screenshots: `/home/claude/shots/exam/` (m7u10, a7u3, m7u4).

## Decisions
- Seeds: 32 hex characters passed to `U.generate` as a string (all units draw through `KIT.draw`).
- The draw renders with `teacherPage()` false (no number-line key) and `S.eh = {h: []}` (every kind; the site filters by fams).
- Recording key: `fn|place|args`; place from `ITEMS[].pos`. The stub defines only the view functions the unit has (`pub.views`):
  judge.js asks `view.boxes` only when it exists.
- `flab` in the skeleton (formOf's label needs the key); `fam` left out.
- `judge.js` stays on the test page: `ui.js` builds its judge at load; the stub's wrapper refuses to judge.
- Page scripts held as `<script type="text/x-kit-held">`, re-created in order by `exam.js` after the test arrives.
- Routes: token as `Authorization: Bearer`; `read` takes an optional `a` (part (a)'s answer on the device); GET adds `status`;
  a second finish is `409 {error: 'finished', steps}` (so a lost finish response can go on to grading).
- After Finish the pager's list is shown but not opened (its review screen has words outside DESIGN's list).
- New test's confirm: a second New test with Back (no sentence).
- Reads that fail are dropped silently (the next change asks again); save/finish/grade/seal/start failures show the message.
- 390 px target check covers buttons, links, choices, a graph's controls; a text box keeps the kit's own height (37 px on A7 U3).
- The reload check compares the paper with previews/readouts emptied, attributes sorted and an emptied style dropped
  (the practice page itself reorders attributes and leaves style="" behind).
- The pool proof tries a part (b) wrong beside its part (a)'s key: a wrong (a) carried into (b) is right on Like the real
  test (M7 Unit 9's 5b).

# Stage 1, finished: the proctor and the log (16 Nov 2026)

`proctor.js`, `trace.js` (test page only, before `exam.js`); `exam.js`, `exam.css`, `exam/build_exam.py`, `check/exam_page.js` part 7;
`tools/practice_kit.py` FILES; README "16 Nov 2026 — the proctor and the log"; DESIGN.md "Built so far" and `device.fs`.
No hook in `ui.js`, `pager.js`, `calc.js`, `scratch.js` or `kit.css`: both files watch from outside (the page's `at()` and saves
through `exam.js`, the calculator's and scratch paper's panels, input/paste/keydown events, `scratch.js`'s saved entry).

## Step 0 (the base after this morning's rebase)
- `build_exam.py` M7 U10: TEST BUILT AND CHECKED. `run.py` M7 U10 first failed in page.js part X ("the Test link while open:
  null"). Not the rebase: a race in `exam_link.js` — on the site `ui.js` draws only after the approvals answer, so on a busy
  machine the status answer came first and the link was never added (1 run in 12 with three in parallel). Fixed (it waits
  for the start screen; 12 of 12), committed alone; `run.py` M7 U10 then ALL CHECKS PASSED. `seal.js`: ALL SOUND.

## The start code (CHANGES-16NOV §1–2, K), and the stand-in agreeing with the site
- Page: one box over Start while `status.pin` is true (`Start code` its placeholder and `aria-label`, focused, upper-cased as
  typed, Enter starts, up to 12 characters accepted so a space or a stray character still reaches the site); Start sends the
  code upper-cased with spaces stripped. `403 {error: 'pin'}` shakes and clears the box (no motion with reduced motion) and
  leaves full screen; `429` empties the box and makes it and Start wait 60 s (the same constant and checks' switch as the
  unlock's, `window.KIT_EXAM_UNLOCK_WAIT`). A reload of a started test never asks. **Decision:** with a start code asked
  for, New test on the results panel clears this device's test and goes back to the start screen (its box), since a second
  start needs the code too.
- Stand-in: `cfg.startCode` (default true; part 1–7 of the check turn it off at the start), a code per opening with 15
  minutes on its clock, `status → {open, pin}`, `start → 403 pin`, 60 wrong codes a minute an address then `429`,
  `POST /teacher/api/test/pin`, the board's `pin`, `pinUntil`. A test belongs to its opening there too (`opened` per opening;
  save, read, unlock `403 closed` when not live; finish then commits the last saved answers with `ended: 'teacher'`; the
  record's `site.opened`). The rest of CHANGES-16NOV (S, T) is not in the stand-in.
- DESIGN.md: the whole of CHANGES-16NOV folded in, each in its place (its own commits), §9 (time allowed) included.
- **Decision (a `403 closed` mid-test, now what a student sees when time runs out):** before, the page said nothing — saves
  and reads failed silently, the student kept answering into nothing, and a locked student's Unlock only shook (stuck on the
  cover). Now a `403 {error: 'closed'}` on a save, a read or an unlock finishes the test at once, as Finish does: Grading…,
  then the results and the code; the site commits its last saved answers (`ended` `'teacher'` or `'time'`). Checked.

- Found on the last run: the stand-in read a request's body as text chunk by chunk, so a character split between two chunks
  (M7 U7's `°` in a pool's upload) came out as two replacement characters and the test page's sheet differed from the teacher
  copy's. The stand-in's own bug, not the page's: it now decodes the body once (`check/exam_site.js`). The real site reads
  `request.json()` and cannot have it.

## CHANGES-16NOV §10 (K): one start a browser, an opening; the end of the time
- `exam.dev` (32 hex, `crypto.getRandomValues`, in memory if storage is refused) sent with Start and New test; `403 again`
  shakes the box, or Start, or New test's button — no word. **Decision:** the page finishes **1 s before** `ends`, not at it,
  and saves 3 s before: a finish that reached the site after `ends` would find the test not live and commit only the last
  save, so "finishes at `ends`" is done one second early to make the typed answers the committed ones (in the check it
  finished 0.9 s before). The newest `ends` received is kept (later or earlier).
- A second tab in the same browser opens the browser's own test (the device keeps it), as before; a Start from the same
  browser is refused only when the device's copy of its test is gone — that is what the check does to show it.
- Not proven: `ends` from the site's deadline (the stand-in has no time allowed; `ends` there is the opening's `until`);
  the `429` on wrong codes past the address limit is not driven by the check.

## CHANGES-16NOV §11 (K): the review of the test page — each finding, and the probe's line at HEAD
The reviewer's probes were re-run (a copy, its harness pointed at /home/claude/examwt2) against this kit; their essence is
check/exam_page.js part 10.
- **C1** (page half): a locked child whose test the site ended: unlock answers `409 finished` (stand-in) or the page asks the
  test's status after a refused code → the lock goes, Grading…, the code. Check part 10 C1. The stand-in refuses Lock with no
  code (`400 unlock`; p14 now cannot even set it up).
- **H1**: `409 finished` joins `403 closed` (save, read, unlock, the reload's GET) → straight to grading. p21, the real site's
  way: `6 s after typing: {"code":"BMQE-ZX77-PQY0"}` — finished by itself (was: no Grading…, no code).
- **H2**: retries by itself, 5/10/20/30 s and at once on `online`. p23: `15 s after the network came back, still up: false |
  the site has: {…every answer…}` (was: still up, the site had only the first).
- **H3**: a refused grade step tried again, `409 order` takes `next`, `409 grading` grades again. p22: `after 8 s: {"code":
  "DJZK-AY8T-7SGE"}` for both the 429 and the 409 (was: Grading… for good).
- **H4/L1**: New test never removes the result until a new test has started (p27: New test after Finish → `403 again`, the
  code stays; part 10 checks a reload after it). The stand-in answers a Start whose `dev` has an open, live test with that
  test and a fresh token (old token dead); part 10 L1: a lost Start answer and Try again make one test.
- **H5**: the wake lock, in the Start press, on each return to visible, released at Finish. p24: `Screen Wake Lock asked for at
  Start: true`. Not tried on a device (headless).
- **M1**: a refused reload GET goes on from the device's copy and asks again. p20: after a 429 and a 409 on the reload the
  rule, start, form and skew are all still there; part 10 M1: locked on the reload under Lock after 2, the clock running.
- **M2**: End after N holds across a reload. p12: `end after 2, one leaving then a reload: … record ended left`; p13 now
  ends the test on the reload (the probe itself then fails reading a log that was sent and cleared).
- **M3**: the not-open screen asks again every 20 s; Try again under the words. p28: `loaded before Open; 30 s after Open the
  page shows "Start"`; `code turned on after load; Start → pinShown: true`.
- **M4**: a Finish refused 429/5xx is retried; refused for good, back in the test with the proctor on under Start. p22:
  `Finish answered 400 once: … then the tab hidden and back: {"cover":true,…}` (was: no cover, count 0).
- **M5, L4**: Ctrl/⌘+F, Ctrl/⌘+G, F3 → `find`; a touch long-press is not `menu`. p24: `Ctrl+F kept, Ctrl+G kept`; the long
  press logged nothing (the two entries are the Ctrl+F and Ctrl+G).
- **M6**: never over 60 KB. p41: 200-character values → `41955 bytes (fits)` (was 72 KB, kept as null). Part 10: the honest
  log at every cap at once with every value 200 characters: **59,426 bytes on A7 U3** (36 parts, the largest), 45,4xx on
  the other three; with 120 more parts than any test, at most 61,423 bytes (the middle values cut, `n` kept).
- The circle graph, answered through the test page (M7 U7), showed that the reload check compared the widget's own place —
  the keyboard cursor, the selected sector, which name is checked — which a reload sets back to the first sector, as the
  practice page does; the answer is the same. The check now leaves those out and compares the set's saved answers too.
- **M7**: id, token and `dev` in sessionStorage too. p26: storage full, a reload → the test resumed under its cover (was:
  the start screen and a second test).
- **L3**: Turn in is a real link; Copied always. p27: `Turn in with pop-ups blocked: tabs opened 1 | … Copied`.
- **L5**: lengths and the bar's clock from `performance.now()`. p30: `device clock +1 h: bar 60:10 | site 60:01 | idle []`
  (was: bar 120:09 and an invented idle hour).
- **L7**: the results in a live region, the focus on the code. p51: `results: focus exCode`.
- **L8**: p50 at 195 px with Larger text: Back to the test inside the screen; the start screen's 26 px sideways scroll was the
  start code's Start (min-width 10rem with Larger text): now `min(10rem, 100%)`, 0 px (re-measured after p50 ran).
- **L9**: p26: `tab B after A finished: {"code":"VKS5-7H9M-T1PQ"}` (was: no code).
- L2, L6, L10 and the notes: nothing built (L2 and N3 are in DESIGN's "Known, and said to Croix").
- p11 (a tablet's long press and rotation) did not run here: `setViewportSize` refuses a full-screen window in this
  Playwright. p70's words: only the declared extras.
- **A circle graph on the test page:** the M7 Unit 7 in /home/claude/examwt was an old copy (before 4e839b2, no circle graph);
  the course's M7 Unit 7 draws one in every test (slot 4(b)). examwt2's M7 Unit 7 is a copy of that (copied, read only, from
  windy-hill-m7), so the four units' checks answer a circle graph through the test page.

## Decisions the design did not make
- A leaving ends when the student presses Back to the test (or Unlock with a right code), not when the signals clear: time on
  the cover is time away. Its kind is the strongest seen, reload ranked above tab, window, full screen.
- A reload is a leaving (it counts for the bar, the lock and the end). It runs from the moment the page went (its hidden signal,
  else the log's last write, at most 5 s before) to Back to the test. The question's visit runs on through it, so the visits
  still add up to the test's length. The lock and the open leaving survive a reload (kept in the log's record, not sent).
- Lock after N: every leaving from the Nth on locks, as written. After `429` the box and Unlock wait 60 s (a constant; the
  checks shorten it through `window.KIT_EXAM_UNLOCK_WAIT`). Unlock pressed asks for full screen at once (the press is the
  gesture), whatever the code. An unlock that cannot reach the site is treated as a wrong code (cleared, no words).
- End after N finishes at the moment the Nth leaving counts; that leaving's length is the time until then.
- A test begun without a press (New test reloads the page) opens under a cover with **Start** (a word on the list), which
  enters full screen and counts nothing. A reload while the test is being finished starts no proctor (no extra leaving).
- Escape is kept for the page in full screen where the browser allows it (`navigator.keyboard.lock(['Escape'])`; press and hold
  leaves), so closing the calculator with Escape is not a leaving. Not proved by the check (headless).
- Finish exits full screen and the bar's count goes (the end panel says it).
- Idle is not counted while away (closed at the leaving's start, started again at the return). Typing inside a calculator is
  another site's page and cannot be seen, so a long calculator stretch can show as idle; its `calc` entry overlaps it.
- A calculator or scratch-paper opening is one entry per (calculator or tab, question): switching either, or the question
  changing while it is open, starts a new entry.
- A part's values: blank to blank is not a value; a paste is `"typed"` (and counted in `pastes`). `q.first` is the seconds on
  screen before the first non-blank value of any of its parts; `flag` is true if the question was flagged at any save.
- `device` is read at Finish (screen and window then, in full screen as a rule). `zoom` is the window's outer width over its
  inner times a pinch's scale, snapped to a browser zoom step within 3%: evidence only (a headless window gives 0.59). `osv`
  is null where the user-agent string has no version (Linux). `fs` is the Fullscreen API present and not refused.
- Scratch paper over 4 KB: every note cut to the one longest length that fits ("the longest cut first"); if notes alone cannot
  fit, the grids' things the same way, the last drawn going first.
- Another test's stored log is removed when a test starts (the device holds one test at a time).
- The end panel says `Left the test 1 time · 5 s` for one, `1 min` for exactly 60 s, `Test ended: left the test 1 time.` for N = 1.

## Words wanted and done without (for Croix)
- `Question 4 of 16` over the question: now for a screen reader only (the number is on the question and on the map).
- The map's heading and legend (`Questions`, `Answered`, `Flagged`, `On screen`) — hidden; on a phone the drawer's line
  (`Questions: 5 of 16 answered, 1 flagged`) is replaced by the map's buttons.
- Finish's question (`3 of 24 still blank. Finish anyway?`, `Yes, finish`, `Keep working`): now **Finish** and **Back**.
- After Finish, `1 of 2 right` for a question partly right: now **Not right**.
- The unit's typing tip (M7 U10: `Type ≤ and ≥ with the keys above the box, or as <= and >=.`): hidden on the test page.
- Kept, not on the list, because the tools need them: the calculator's panel (`FAST (Desmos)`, `TI-30Xa`, `Close`, `The calculator
  needs the internet.`, `The calculator didn't load.`, `Try again`, `TI-30Xa emulator by Alden Bradford`), scratch paper's panel
  (`Scratch paper`, `QUESTION 1`, `Close`, `Notes`, `Grid`, `Clear`, `Undo`, `Point`, `Segment`, `Line`, `Erase`, `Scale`) and the
  ⋯ menu (`Larger text`, `APPEARANCE`, `System`, `Light`, `Dark`); `Can't read this yet` under a box; stage 2's `New test` and
  `Copied`; and on each question card the unit's own `1 pt`, section name and ID (the card is the teacher copy's HTML).

## Status (16 Nov, end of stage 1)
- `run.py` ALL CHECKS PASSED on M7 U10 page and teacher copy and A7 U6 page and teacher copy, on kit `460db7e` (the files a
  practice page or teacher copy is built from or checked by are the same at `4f19284`; only test-page files, the stand-in, the
  check and the docs changed after it).
- `build_exam.py` with its check: every packing unit (M7 4 5 7 8 9 10 13, A7 3 4 5 6) TEST BUILT AND CHECKED on `460db7e`
  (without the start code); on the final kit, four units (M7 10 and 7, A7 3 and 5) — see the report; A7 U11 refused (pack),
  by design.
- Screenshots: `/home/claude/shots/exam/` (`m7u10-p-*` the proctor's states, `m7u10-pin-*` the start code, light and dark,
  1366 × 657 and 390 × 844; `m7u10-locked-1024-touch`, `m7u10-ended-390-dark`).

## Left
- The `tab` and `window` kinds are proved with the signals simulated (`document.hidden` and `document.hasFocus` overridden,
  the events dispatched); leaving full screen is real. Not tried on a real Chromebook, iPad or phone. Escape kept by
  `navigator.keyboard.lock` is not proved (headless).
- `device.zoom` is a ratio, evidence only. On an iPhone there is no full screen (`fs` false): only tab and window count.
- An unlock or a start that cannot reach the site is treated as a refused code (no words): Croix may want the network line.
- (§11, L5) Lengths now come from `performance.now()`. On ChromeOS (and Linux) that clock may stop while the device is
  suspended (the lid shut), so a leaving that spans a closed lid is still counted, but its seconds may be short. Not proven
  either way (headless); worth watching on the trial Chromebook (the review's checklist item 4).
