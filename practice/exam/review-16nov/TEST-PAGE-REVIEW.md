# Adversarial review: the student test page (16 Nov 2026)

**What was reviewed.** The four built pages (`/home/claude/examwt/…/M7 Unit 10 Test.html`, `M7 Unit 7`, `A7 Unit 3`, `A7 Unit 5`).
Each one holds the kit's `exam.js`, `proctor.js`, `trace.js`, `ui.js`, `pager.js`, `calc.js`, `scratch.js`, `exam_unit.js`,
`exam.css` and `kit.css` byte for byte as they stand at `27a77d2`, so the pages are current with that kit.

I drove them against the stand-in `check/exam_site.js`. **Kit HEAD moved on during the review** (`db76cc0` at 11:23, then
`9585a03` and `90df09b`). The new stand-in refuses a Start without `dev`, so every probe now runs on a read-only snapshot of
`27a77d2` (`kit27/`, made with `git archive`). I reran the earlier probes on that snapshot and they give the same results.
Where HEAD changes a finding, the finding says so, under **At HEAD**. Those notes come from reading the code only: I did not
rebuild or run anything at HEAD.

I also read the real site's code (read-only, `/home/claude/site-exam/exam.js`). It differs from the stand-in in two places that
matter: when a test ends, how `save`, `read` and `unlock` answer, and its per-test 429 buckets.

Probes live in `/home/claude/reviews/test-page/`: `h.js` is the harness, each `pNN_*.js` writes `pNN_*.out`, and the screenshots
are in `shots/`. To run one: `NODE_PATH=$(npm root -g) node pNN_….js`. The pools (30 drawn tests per unit) are cached in
`pool-*.json`. Only one browser ran at a time.

**Count.** 1 Critical · 5 High · 7 Medium · 10 Low · 5 Notes.

---

## Critical

### C1. "Lock after N" with no unlock code: a locked child can never go on and can never finish
- **What happens.** The site lets the teacher choose Lock and leave the unlock code empty (`site-exam/exam.js` `setCfg`
  checks `rule` and `unlock` separately; `unlock: ''` clears the code). After the Nth leaving, the child gets
  `Locked. Ask your teacher.` and one box. No code opens it. The cover has no Finish, so the test cannot be finished from the
  device.
- **Ways it ends today:**
  - On the stand-in, the teacher's Close makes `unlock` answer `403 closed`, and the page then finishes.
  - On the real site, Close sets the test to `finished` at once. `unlock` then answers `200 {ok:false}` for any code, so the
    child stays on the lock cover for good. The site's own chore seals the test, but the page never asks, so the child never
    sees the code. Only a reload shows it, and nothing tells the child to reload.
- **Probe.** `p14_lock_nocode.js`:
  `no unlock code set: 4821→still locked, 1234→still locked, 0000→still locked | anything else on the cover: "Locked. Ask your teacher. Unlock"`.
- **What they see.** The child sees a lock that never opens. The teacher has no code to type. The record comes in with no
  student attached: Tally lists it as "a test nobody claimed", and Croix has to give it to the right student by hand.
- **Smallest fix.** Have the site refuse `rule.leave === 'lock'` while no unlock code is set (`400 {error:'unlock'}`), and have
  the cockpit require the code before Lock can be chosen. On the page, a locked child whose unlock answers anything but a
  plain `{ok}` should ask `GET /api/test/<id>`; if its `status !== 'open'`, the page should go to the finished path (see H1).

## High

### H1. The site ends the test (Close, a new opening, or the time allowed): on the real site the page never notices, and the child keeps working into nothing
- **What happens.** `exam.js` ends a test in the middle only on `403 {error:'closed'}`. The real site ends a test by setting
  its `status` to `finished` (`endOpening` and `timeUp`, `site-exam/exam.js` around lines 246–262). Close does this at once.
  The time allowed is checked lazily, on the teacher's board, which polls every 5 s, and on Start. From then on, `save` and
  `read` answer **`409 {error:'finished'}`**, which `exam.js` ignores. `unlock` answers `200`.
- **The two ways side by side** (`p21_closed.js`):
  - The stand-in's way (opening deleted): `save 200 | read 403 closed` → the page finishes by itself and shows its code.
  - The real site's way (status set to `finished`): `read 409 {"error":"finished"} | save 409 {"error":"finished"}`. Six
    seconds later there is still no Grading… and no message. The child types "22" into 3a. At Finish the record's 3a is `null`
    and `ended` is `teacher`.
- **A locked child.** In `p14` (second part), a locked child whose test is over stays on `Locked. Ask your teacher.`. When the
  teacher types the right code, the child goes back into a dead test: `{"cover":false,"code":null,"sheet":"block"}`.
- **What they see.** The child sees nothing change. Every answer typed after the Close is thrown away without a word. The
  child gets no code until they press Finish; if they shut the lid first, they never see one. The teacher sees "a test nobody
  claimed".
- **At HEAD.** `exam.js` now finishes 1 s before `ends` (the opening's `until`, or the deadline), so the time-allowed case and
  the until case are covered. A manual **Close** or a re-Open before `ends` is not covered: `closed()` is unchanged.
- **Smallest fix.**
  - In `exam.js`: `function closed(r){ return r && ((r.status === 403 && r.j && r.j.error === 'closed') || (r.status === 409 && r.j && r.j.error === 'finished')); }`.
  - In `unlock` on the site: answer `409 finished` when `t.status !== 'open'`.

### H2. A network blip stops all saving until the child presses Try again, and the message tells them not to worry
- **What happens.** A failed save sets `RETRY`, and `tick()` will not send while `RETRY` is set. Nothing retries by itself:
  there is no `online` listener and no backoff. Answers stay on the device, and the banner says
  *"Can't reach the site. Your answers are saved on this device."*, so a child has no reason to press anything. If the site
  then ends the test (H1, or the deadline in these 27a77d2 builds), it commits the last answers that reached it, which are
  everything before the blip. Everything after is lost.
- **Probe.** `p23_offline.js`: `banner during the outage: true | 15 s after the network came back, still up: true | the site has: {"2":"1"} | the device has: {"2":"1","5":"4","8":"6","3a":"2","4a":"3","7b":"5"}`.
  Only after `Try again` does the site get them.
- **What they see.** A coral banner that stays up for the rest of the test. The child keeps working. The teacher sees nothing,
  only `fails` in the log.
- **Smallest fix.** Retry by itself:
  - `window.addEventListener('online', function(){ if (RETRY) { var f = RETRY; mended(); f(); } })`.
  - In `tick()`, let a save that failed try again after 15 s even while `RETRY` is set.

### H3. One refused grade step leaves the child on Grading… for good, with the wrong message and a Try again that never works
- **What happens.** `grade()` moves to the next step on any answer that is not `{done:true}`. That includes a 429 (Cloudflare's
  own page when the Free plan's daily limit is hit, error 1027) and a `409 order` or `409 unit`. The page skips the step, runs
  through the rest, which the site refuses as `409 order`, then calls `seal` and gets `409 grading`. `seal()` treats any
  non-ok answer as the network: it shows the banner, and Try again only repeats `seal`, never the grading.
- **Probe.** `p22_grading.js`. A single 429 (or 409) on step 3:
  `grade:200 ×3, grade:409 ×8, seal:409 · after 8 s {"grading":true,"net":true,"netText":"Can’t reach the site. …"} · after Try again ×3: {"grading":true,…,"code":null}`.
  **A reload fixes it:** `after a reload: {"code":"RWT0-BM62-0DBH"}`.
- **What they see.** "Grading…" plus "Can't reach the site", even though the site can be reached. The child has no code and no
  way forward. On the real site the chore seals the test after 3 minutes if the teacher's board is open, and Try again then
  gets the code. If the board is not open, the child stays stuck.
- **Smallest fix.**
  - In `grade()`: go on only when `r.ok`. On `409 order`, go to `j.next`. On any other non-ok answer, `fail(retry the same step)`.
  - In `seal()`: on `409 grading`, start again at `grade(0, steps)`.

### H4. **New test** on the results wipes the child's code from the device, and (in these builds) lets a child retake the test for a better score
- **What happens.** After Finish, the results show **New test**, and pressing it twice starts over. With the start code off,
  the page starts a second test (a new draw) and overwrites `ST`, so the first code is gone from the device. With the start
  code on (the default), it does `ST = {}` and reloads before asking the site, so the code is gone too.
  - New test is not on DESIGN's word list.
  - A child who has just seen `Right / Not right / Blank` can take a fresh draw and turn in only the better code. Tally flags
    "a second test by the same student" only when **both** codes are turned in; the one not turned in shows up only as "a test
    nobody claimed".
- **Probe.** `p27_presses.js`: `New test pressed (twice, as asked): the old code anywhere on this device? false | page shows {"q":true,…}`.
  That is a new test, under the Start cover.
- **What they see.** A curious or confused child loses the code they were meant to turn in. The teacher gets an unclaimed
  record plus a second test.
- **At HEAD.** "One start a browser, an opening" (`403 again`) stops the second start. With the start code on, though,
  `newTest()` still clears `ST` before it asks, so the code is still wiped, and the child is then left on a start screen whose
  Start will only shake.
- **Smallest fix.** Remove New test from the student's page. If it has to stay, never clear `ST.result` until a new start has
  succeeded.

### H5. (Not run on a device: a guess backed by the code.) Nothing stops the Chromebook's screen from locking while a child thinks, and a locked screen counts as leaving
- **What happens.** The page never asks for a Screen Wake Lock (`p24_small.js`: `Screen Wake Lock asked for at Start: false`).
  On a managed Chromebook the screen dims and then locks after several minutes with no input. A child working a problem on
  real paper can hit that. When the screen locks the page becomes hidden. That is a `tab` leaving, counted at once with no
  grace period; under Lock after 1, the child is locked. `p30_sleep_clock.js` shows what the child sees afterwards: one
  `["tab", 3602 s]` leaving, the cover, and `Left the test: 1`.
- **Smallest fix.** At Start, and again on every return to visible, call `navigator.wakeLock.request('screen')`; release it at
  Finish. Chrome, ChromeOS, Android and iPadOS 16.4+ all support it, and it needs no permission prompt.
- **Trial.** Checklist item 3 confirms or rules this out.

## Medium

### M1. A reload whose GET is answered 429 or 409 throws away the rule, the start time and the form link
- **What happens.** `boot()` handles only `401`, `403` and `404`. For any other answer it runs `strip(r.j)` on the error body,
  which leaves `ST.start` holding only `pub`. The real site's GET has a per-test bucket (`GET_BURST 20`, then one every 3 s →
  `429 wait`).
- **Probe.** `p20_reload.js`, with Lock after 2: `GET 429 on reload: … "after":{"skew":null,…} "clock":"0:00" … "count":3,"lockedAfter3Leavings":false`.
  The same happens with 409.
- **What they see.**
  - The bar's clock stays at 0:00 for the rest of the sitting.
  - Lock and End after N are silently off.
  - Turn in no longer opens the form; it only copies.
- **Smallest fix.** In `boot()`, update `ST.start` only on `r.ok`. On any other non-ok answer, `mount(null)` from the device's
  copy, as the offline path already does.

### M2. "End after N" is escaped by a reload
- **What happens.** As a page unloads it becomes hidden. That leaving is counted during the unload, and the End is scheduled
  with `setTimeout(…, 0)`, which dies with the page. After the reload the leaving is already counted, so `Proctor.start` takes
  the `was.open` branch and never looks at the rule again.
- **Probe.** `p13_end_reload.js`: `end after 1: after the reload {"n":1,"cover":"Back to the test","code":null,…} | the child goes on and the site takes the answer: "9" | status open`.
  End after 2, with one real leaving and then a reload, behaves the same.
- **What they see.** The child goes on as if nothing happened. Tally then flags the record ("`end` and `log.away` at least
  `after` with `ended` not `left`"), so a child is reported for something the page did.
- **Smallest fix.** In `Proctor.start`, after taking `was.open`: `if (O.rule && O.rule.leave === 'end' && PR.n >= Math.max(1, +O.rule.after)) setTimeout(function(){ if (ON) O.onEnd('left'); }, 0);`

### M3. A page opened before the teacher presses Open never finds out, and some refusals say "This test isn't open." with no Start
- **What happens.** `status` is asked once, at load.
- **Probe.** `p28_pin.js`:
  - `loaded before Open; 30 s after Open the page shows "This test isn’t open."`.
  - With the start code turned on after the page loaded, Start (which sends no code) gets `403 pin`, and the page shows
    `This test isn’t open.` with Start hidden.
  - A 429 at Start with the code off does the same.
- **What they see.** Children who opened the link at the bell see "This test isn't open." until someone tells them to reload,
  and the page gives no hint.
- **Smallest fix.** While showing "isn't open", ask `status` again every 15 s (the site caches it for 15 s, so it costs
  nothing). Treat `403 pin` with `PIN` false by asking `status` again and showing the box.

### M4. Finish refused (400, 413 or 429) sends the child back to the test without a word, and the proctor stays off
- **What happens.** The `else` branch of `finish()` puts `PHASE` back to `test` but never restarts `Proctor`. The full screen
  is gone, and leavings are no longer counted for the rest of the sitting.
- **Probe.** `p22_grading.js`: `Finish answered 400 once: {"grading":false,"net":false,"fs":false,"proctorCount":0} | then the tab hidden and back: {"cover":false,"away":0}`.
  The same for 413.
- **What they see.** Finish does nothing, and the child presses it again. A dishonest child would find the test unwatched.
- **Smallest fix.** Treat a non-ok finish other than 409 as a failure: `fail(go)`, keeping `PHASE` as `grading`, rather than
  going back to the test.

### M5. (Device behaviour not run; the code was.) Ctrl+F and other browser keys reach the browser, and the find bar takes focus, which very likely counts as leaving
- **What happens.** The proctor keeps Ctrl+P, Ctrl+S and Ctrl+A. Ctrl+F, Ctrl+G, F3, Ctrl+L, Ctrl+N, Ctrl+T and Ctrl+W pass to
  the browser (`p24_small.js`: `Ctrl+F passes to the browser, …`). The find bar takes keyboard focus, so `document.hasFocus()`
  goes false, and after 1 s that is a `window` leaving. Searching the page is a habit, not leaving the test.
- **Smallest fix.** Add `f` and `g` (and `F3`) to the proctor's keydown guard, using `preventDefault()`. Chrome lets a page keep
  these keys.

### M6. A long-enough log is thrown away whole, including every leaving, and a child can make that happen on purpose
- **What happens.** The site keeps a log over 64 KB as `null`. I measured the log at every cap at once (`p41_log_size.js`,
  A7 Unit 3, 36 parts × 12 values):
  - With answers of 8 characters: about 24 KB, plus about 7 KB for the visits, calculator and scratch-paper entries my run did
    not fill (about 32 KB in all). That fits.
  - With 60 characters: about 44 KB. That fits.
  - With 200 characters (the site's own limit for one typed answer): 72 KB measured, and about 79 KB once the unfilled lists
    are added. **The site keeps `null`.**

  The line is about 100 characters a value on the largest unit. An honest child never gets near it. But pasting a long string
  into each box a dozen times erases the record's `away` (and the clear `away` count beside it) without a trace.
- **Smallest fix.** In `trace.js` `take()`: if the JSON is over 60 KB, cut each part's `vals` to the first 2 and last 4 and each
  string to 40 characters. Never touch `away`, `blocked` or `q`.

### M7. Storage full: a reload returns the child to the start screen, and Start draws a second test
- **What happens.** `keep()` fails silently, so the device has no `{test, token}`. On reload, `boot()` goes to `status`.
- **Probe.** `p26_tabs_storage.js`, with 5.2 MB of storage filled: `site has {"2":"5"} | after a reload: {"cover":false,"start":true}`.
  Pressing Start then draws another test, and the first one becomes "a test nobody claimed".
- **What they see.** The child's answers seem to vanish. The message they were shown ("saved on this device") was not true.
- **At HEAD.** `exam.dev` was stored before the quota filled, so this Start is refused as `403 again`: the child gets a shake
  and no way on.
- **Smallest fix.** At Start, test that a write succeeds. If it fails, remove the kit's own old `practice.*` sets (the page's
  own keys) and try again.
- **Storage refused** (`localStorage` throws) **holds** for the visit (`question shown … finish → code`), but a reload loses the
  test in the same way.

## Low
- **L1. Start's answer lost after the site made the test.** Try again makes a second test, and the first is orphaned
  (`p23`: `tests the site made for this one child: 2`). Fix: send an id the device makes once for each Start press, and have
  the site answer the same test again for it. HEAD's `dev` field could carry this.
- **L2. A lapsed code (or a typo) only shakes and clears.** The child cannot tell "wrong" from "the code ran out" and keeps
  retyping (`p28`: `the right code, lapsed … tests made 0`). The words list allows nothing more; Croix should know it looks like
  this.
- **L3. Turn in with pop-ups blocked does nothing visible.** With a form link set, "Copied" is not shown either
  (`p27`: `tabs opened 0`). The code is still on screen. Fix: always show `Copied` after the copy.
- **L4. A touch long-press outside a text box is logged as a blocked `menu`** (`p24`: `[[9,"menu","6"]]`). A child holding a
  number-line point reads in Tally like a right-click attempt. Fix: skip logging when the last pointerdown was
  `pointerType === 'touch'`.
- **L5. A change to the device's clock in the middle of the test throws off the bar's clock and the log** (`p30`: `device clock +1 h: bar 120:09 | site 60:01 … idle [[3608,3602,"1"]]`).
  The log gains an invented idle hour and a visit an hour long. Fix: take `performance.now()` deltas for `sec`, and keep
  `Date.now()` only for `t0` and `t1`.
- **L6. `how` is `tap` for a choice, a number line or a circle graph worked with the keyboard** (`p40`: `a number line: one arrow → … "tap"`).
  This follows the pinned contract, but Tally should not read `tap` as "touch".
- **L7. Screen reader:** after Grading… the score and the code are not announced (`#result` is not a live region), and focus
  lands on `<body>` (`p51`: `results: focus BODY`). Fix: `role="status"` on `.exscore`, and focus `#exCode` or `#exTurn`.
- **L8. 200% zoom on a 390 px phone:** `Back to the test` (min-width 200 px) runs 2 px off both edges, and with Larger text the
  start screen scrolls 26 px sideways (`p50_layout.out`). Everything stays pressable.
- **L9. A second tab, after the first tab finishes,** drops to a summary state with no code and no words (`p26`: `tab B after A finished: {"code":null,…} B now: {… "pg-done pg-sum"}`).
  Answers are not lost, because the tabs share storage.
- **L10. A refused start code can leave the start screen in full screen,** when the refusal comes back before the full-screen
  request settles (`p28`: `the right code, lapsed … "fs":true`). This is harmless.

## Notes
- **N1. HEAD moved during the review** (`db76cc0`, `9585a03`, `90df09b`): `dev` / `403 again`, and `ends` with a finish 1 s
  before. Effect on the findings: H1 is narrowed to a manual Close or a re-Open; H4 is narrowed but the code is still wiped with
  the start code on; M7 gets worse. C1, H2, H3, H5 and M1–M6 are unchanged in the code. **The four built pages are 27a77d2
  pages and need a rebuild before any trial.**
- **N2. No circle graph to test.** None of the four units' pools (30 drawn tests each) has a single `cgraph` part. M7 Unit 7
  is `text` 660 and `mc` 60. The circle graph on the test page was not exercised.
- **N3. A reload is a leaving, by design.** Under Lock after N, a teacher's "just refresh it" locks the child (`p12`:
  `lock after 1, a reload: {"locked":true,…}`). Croix should know before he tells a class to refresh.
- **N4. Focus lost to nowhere counts.** When the calculator's iframe is removed while it has focus, the top document loses
  focus and that counts as `window` (`p10`: `calc frame removed while focused {"n":1,…}`). `calc.js` never removes a frame
  (Close hides the panel, and Try again sets `src`), and both of those held. Nothing reaches this path today; keep it that way.
- **N5. Untestable in headless Chromium:** whether Escape leaves full screen, and whether `navigator.keyboard.lock(['Escape'])`
  holds. Headless never leaves full screen on Escape or F11, whether or not the lock is in place (`p10`).

---

## What held (really tried)
- **Reload at every stage** (`p25`): a keystroke followed by an instant reload is saved (`"45"` on both the device and the
  site). Reloads on the away cover, the lock cover (it stays locked), the Finish question, Grading… (the same code comes back)
  and the results all held. The count is never doubled, and the log keeps `t0` and every value.
- **Double presses** (`p27`): Start ×2 makes 1 test; Unlock ×2 sends 1 request; Finish ×2 sends 1 finish.
- **Leaving and returning:** navigating away and pressing Back counts 1 leaving (locked under Lock after 1), not 2.
- **Signals in odd orders** (`p15`): blur → hidden → shown → focus counts as one leaving. A focus loss of 0.9 s, and five
  losses of 0.8 s each, are not counted.
- **The calculator's frame** (`p10`): focus in it, the panel hidden by script, and the frame reloaded under focus are not
  counted (cross-origin frame, `hasFocus()` true).
- **An hour asleep** (`p30`): one `tab` leaving of 3602 s, no idle entry double-counted, and visits adding up to the sitting
  (3609 of 3609). The bar's clock matches the site's within the probe's clock step.
- **Two tabs of one test** (`p26`): no answer lost; answers typed in either tab reach the record.
- **Storage refused:** the whole test works for the visit.
- **Start code** (`p28`): lower case, spaces, a pasted newline and IME-style insert all start. Five characters and an emoji are
  refused with a shake.
- **The code** (`p27`):
  - It is selectable and copies with Ctrl+C (`user-select: all` once the proctor stops).
  - Turn in opens the form with `entry.1=ZQ2B-J68K-6A41`, again on a second press. With no form set it copies and says
    `Copied`.
  - Tally normalizes a hand-typed O, I or L (`tally/index.html` line 1311).
- **Keyboard only** (`p51`): from the start code to Turn in works. Enter starts the test and Enter unlocks. Focus lands on
  Back to the test or the unlock box, Escape stays on the cover, and Escape closes the Finish question back to Finish.
- **Layout** (`p50`): 1366×657, 200% zoom, 390×844, 390×500 with an on-screen keyboard, Larger text, light and dark. Every
  control is on screen and pressable, except L8.
- **Performance** (`p60`, A7 Unit 3 at CPU ×6): page to Start 1.2 s; Start to the first question 0.7–0.75 s; a key to the next
  frame takes a median of 47 ms (max 74–113 ms); 0–1 long task while typing; `Trace.take()` 2–3 ms; 90 minutes of timers took
  the heap from 3.6 to 3.7 MB and storage from 20.3K to 20.7K characters.
- **Requests** (`p70`): the page, the test routes and Desmos only. **Console errors:** none in any probe apart from the
  resource errors the probes caused themselves.
- **Words** (`p70`): only DESIGN's list, plus the extras the builder declared (the calculator's and scratch paper's panels,
  the ⋯ menu, New test, Copied, Start code, Can't read this yet).
- **The log:** every field of the shape is present. The seconds add up (`p40`: sitting 7 = visits 7 = q 7). Blank-to-blank is
  not a value, and focusing a box and leaving it adds nothing. A choice, a multi-select tick and untick, and a number line are
  all logged. The honest log at every cap fits in about 32 KB (M6).

## What headless Chromium cannot test, and what to try by hand in the trial run
Use one real Chromebook and, if students will use them, one Android tablet and one iPad. Set **Count only** and watch
`Left the test: N`. Each step below should leave the count unchanged unless it says otherwise.

1. **Escape** with the calculator, scratch paper, the ⋯ menu and the Finish question open, and once on the bare sheet. Expect
   no leaving; holding Escape down should leave. Then try **F4** (the full-screen key) and **F11**: these should count.
2. **Ctrl+F** (find) and **Ctrl + / Ctrl −** (zoom), leaving the zoom bubble up for 3 s.
3. **Leave the Chromebook untouched for 10 minutes**, past the screen dimming and turning off. Expect no leaving; if one
   appears, H5 is real.
4. **Close the lid for 1 minute, then open it and sign back in.** Expect 1 leaving and the cover. Note what the child sees.
5. **Chromebook keys:** brightness, volume, the Search/launcher key pressed and pressed again quickly, Alt+Search (caps lock),
   the screenshot key, and the overview key. Note which of them count. The launcher and overview keys will count after 1 s,
   and that cannot be told apart from really leaving.
6. **Touchpad:** a two-finger swipe sideways (back / forward). If it leaves the page it counts, and the page comes back through
   a reload.
7. **Notifications:** have a system notification arrive (low battery, or a GoGuardian/Securly message if the school uses one).
   Don't click it; then click it.
8. **Tablet:** type a whole answer with the on-screen keyboard in full screen, turn the tablet, and long-press a number-line
   point. Expect no leaving.
9. **iPad Safari:** type several answers in full screen. It may warn about typing in full screen or leave full screen; either
   would count.
10. **Close a test under the class (H1):** with a student partway through, press Close in the cockpit and watch that student's
    screen for 30 s. Today nothing happens.
11. **Lock with no unlock code (C1):** check that the cockpit refuses it.
12. **The results screen:** press New test (H4) and watch the code disappear. Also check that the code reads clearly on the
    Chromebook's monospace font (B/8, S/5, Z/2, G/6).
