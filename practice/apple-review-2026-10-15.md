# The Apple review of the practice-test pages (A7 Unit 3, M7 Unit 4), 15–16 Oct 2026

Asked by Croix: an engineer audit, a second engineer checking it, a Jobs review, a Wozniak review; then a closing check of the rebuild. Fixes are marked in the kit's code with these ids.

# Apple review 1 — engineer audit (A7 U3 + M7 U4 practice pages), 15 Oct 2026
Scripts s1–s32.js, screenshots and walks.txt are in this folder.

1. [High] Both — CSS `display:flex` on .confirm/.keys/.fb overrides `[hidden]`. Repro: #set-1234, type 1a, Finish → Cancel: the bar stays (180px sticky header on a phone); after Finish→Finish it stays over the results, and its stale Finish re-runs finish() (test mode #set-2223: 1a tries 1→2). The keypad never hides (even under read-only right answers); "Type an answer first." stays after typing. Fix: `[hidden]{display:none!important}`; keep the .fb live region rendered (empty it instead of hiding); clear the flash on input.
2. [High] Both — focus lost after nearly every action (paintItem/walkHtml rebuild innerHTML; a right Check disables the focused button → BODY). Fix: Hint → first .wopt or #wn; walk pick → next control; Show me how → #st (tabindex -1); Try another → new .xq input; Close → Hint; right → next question's input.
3. [Med] Both — walkthrough dead end: M7 #set-1234 15b, Hint before a try, wrong number 4× → the same hint; no Show me how (needs a try, ui.js:241). Hints that restate the question ("How much are 5 slices?" → "5 slices."; "What is 6 × 4?" → "Multiply 6 by 4."). Fix: after 2 misses on a number step offer "Show this step" (counts as help); offer Show me how while the walk is open; rewrite echo hints as a smaller step.
4. [Med] M7 — typed units ignored, even wrong ones: Q8 circumference accepts "47.1 cm²"; Q13 accepts "153.86 in²". Fix: unit typed ≠ p.unit → form "Circumference is a length, so the unit is cm, not cm²."
5. [Med] M7 — Q4a wrong-pick feedback states Q4b's right option verbatim. Fix: 4a says only how to decide; hold the mistake explanation until 4b is checked.
6. [Med] A7 — typing preview `pretty()` runs exponents into letters: "x^5x^3" → x<sup>5x</sup>…; "x^(5+3)" → "x<sup>5</sup>+3)". Fix: `/\^\(([^()]*)\)|\^(−?\d+|[a-z])/gi`.
7. [Med] Both — tap targets < 44px: Hint 52×27, Show me how / Try another 27 tall, Close 60×25, mode toggle 29, keypad 36×32; Hint 8px below the input (a stray tap marks "with help" for good). Fix: min-height 44px, gap 10px.
8. [Med] Both — screen readers: math read as "2, superscript 7, ·2…", fractions with no "over"; inputs only "Answer to 1a"; 36 identical "Check"/"Hint"; M7 figures aria-label="Figure"; no lang. Fix: spoken labels from the tree; aria-describedby to the stem; "Hint for 1a"; figure alt from its numbers; lang="en".
9. [Med] Both — keypad: 6 extra tab stops per answer (A7), 4 (M7); layout jumps 42px when moving between inputs. Fix: tabindex -1; show only for (pointer:coarse) in a fixed bottom bar; hide for read-only inputs.
10. [Low–Med] Both — re-checking an unchanged answer counts another try ("on try 4" after Enter ×3). Fix: R.lastAns; same answer → re-show, no record().
11. [Low–Med] Both — "My misses (36)" opens 72 (A7) / 48 (M7) questions in two rounds; blanks saved as misses (finish()). Fix: don't add blanks (or "skipped"); label with the count it opens; one round when > ~8 misses.
12. [Low] Both — Try-another input nearly invisible (--field ≈ .xq tint). Fix: `.xq input[type=text]{background:var(--paper)}`.
13. [Low] Both — body 8px default margin around the sticky bar; .fb indent 3.5px off the input (em vs px), M7 4a Check 444 vs radios 435; score line orphans "solved / 0" at 390; multi-line choices center the radio. Fixes: body{margin:0}; one px indent; nowrap per label+number; .ch{align-items:baseline}.
14. [Low] Wording — M7 Q5a stem "Cut the figure into two rectangles" vs accepting whole + corner (coach says pieces must be part of the figure); placeholder "area and area" → "like 20 and 15"; "multiply ITS"; A7 space before "?" after math (engine.js 447, 486, 533, 571, 575); A7 "10^99999" → "That number is too big to check."
15. [Low] Both — the Google-Sites files have no doctype/charset (quirks mode; windows-1252 if the server sends no charset). Fix: `<!doctype html><meta charset="utf-8">` at the start in build.py.
16. [Low] Both — #set-123456 silently opens 12345; replaceState means Back leaves the page; returning to the tab shows Resume (consider auto-resume if it was running).

Already excellent: generous answer reading; specific correct coach messages; robust to storage failure / huge input; fast (generate 3–8ms at 6× CPU throttle; 188–222 KB single file); state survives reload; figures and pictures correct; dark mode complete; no horizontal scroll at 390; Try another never repeats; misses come back with new numbers.

# Apple review 2 — second engineer, 15 Oct 2026 (scripts/screens in ../apple2/)

## Part A — review 1's findings
1 CONFIRMED (stale confirm re-runs finish: 1a tries 1→2). `[hidden]{display:none!important}` hides nothing that should show. Also: `if (S.done) return;` at the top of finish(); `.fb:empty{margin:0}` (empty fb adds 8px).
2 CONFIRMED. Correction: after a right answer keep focus on the answered input / Correct card — don't jump (phone scroll + keyboard).
3 CONFIRMED. Echo hints at coach.js 48, 74, 92, 108, 164, 196. "Show this step" only on number steps after 2 misses (choice steps can't stall).
4 CONFIRMED ("47.1 cm²", "47.1 m", "153.86 cm" all Correct). Unit is printed next to the box → keep Correct (it counts) + a one-line note; not Almost.
5 CONFIRMED and wider: 4a Show me how ("(Mateo used the slanted side…)"), 4a Hint's last step, and "Neither" in 4a gives 4a away ("…= 42. Who said that?"). Fix: until 4b is right, 4a says only how to decide; strip the mistake sentence from 4a steps/Hint.
6 CONFIRMED → High: "(2^6)^3" previews "(2⁶³", "(5t^4)^2" → "(5t⁴²" (test types 1b, 9c). Review 1's regex fixes both.
7 CONFIRMED (Show me how 119×27, Check 73×32, Close 60×25, toggle 29, choice rows 36).
8 CONFIRMED (M7 figures "Figure"; no lang).
9 PARTLY: tabindex=-1 and hide on read-only only; NOT a fixed bottom bar (fights the iOS keyboard; touchscreen Chromebooks lose the keys).
10 CONFIRMED (double tap → "on try 2"); fix right.
11 PARTLY: label/size right (36 → 72; M7 24 → 48); blanks become misses only in test mode — defensible. Fix the label; one round when > ~8 misses.
12 CONFIRMED. 13 PARTLY (8px body margin confirmed; others not re-measured).
14 CONFIRMED + "2^1000" gets the misleading "exponents whole numbers… 0 to the 0" message; A7 "times" message shows literal "3 × 10^3" (engine.js 338).
15 PLAUSIBLE: Sites may wrap; check compatMode in the published embed; `<meta charset="utf-8">` harmless.
16 PARTLY: anchor `/^#set-?(\d{1,5})(?:-(p[1-4]|miss))?$/i`; reject auto-resume (typing restarts the clock).

## Part B — new
N1 [High] Both — "Check as I go": Finish ignores typed-but-unchecked answers (confirm counts them answered; result 0/36, empty cards; checking later says "✓ Correct on try 1", not counted, saved as a miss). Fix: practice finish() records typed-unchecked items via judge (as test mode); truly skipped → "after Finish (not counted)"; misses from verdict + help.
N2 [Med] Both — after a test-style set, results buttons (Practice Part 2 / My misses) open in test mode (no Check, no Hint). Fix: always "Check as I go".
N3 [Med] Both — Practice menu "Part N only" keeps the current set number → round 1 repeats just-finished questions. Fix: new numbers, like misses.
N4 [Med] Both — two tabs on one set overwrite each other. Fix: `storage` event on this key → reload + repaint.
N5 [Med] M7 — "part a" referenced when part a isn't shown (misses sets, Try another): "The whole pizza is part a…", "1,386 cm² (part a)". coach.js 100, 207, 366, 370, 374, 408, 414, 417. Fix: drop "(part a)" when absent or show part a read-only; hide the letter on a lone part (A7 shows a lone "c.").
N6 [Low–Med] Both — two Finish buttons during the confirm (320px: bar 182/568px). Fix: hide bar buttons while confirming; "Yes, finish" / "Keep working".
N7 [Low–Med] Both — no print stylesheet (dark mode prints grey on white; blue buttons white-on-white; keypad/stopwatch/controls/confirm print; A7 8 pages). Fix: print block forcing light colors, hiding controls, keeping results.
N8 [Low] Both — clock rounds (0:01 at 0.76s; Pause at 3.58s jumps 0:03→0:04). Fix: Math.floor, 250ms tick.
N9 [Low] Both — wording mismatches: test results say "right on the first try"; results heading "TEST STYLE / CHECKED AS YOU WENT" vs toggle "Like the real test / Check as I go"; "See why it works" vs "Why it works"; unmatched-wrong message differs (A7 "does not match a common slip. Tap Hint…" vs M7 "Not this one. Go back to the rule below…"); title "Unit 3 Practice Test" should say A7.
Fine: 320px and 200% zoom no h-scroll; wrapping; M7 walk steps need no "/" or "−" (3,000 sets); streak logic; round 2 never repeats; misses + Try another + mode switch no errors; finished set restores.

# Apple reviews 3 (Jobs lens) and 4 (Wozniak lens), 15 Oct 2026

## 3 — product (screens in ../apple3/)
Verdict: the core (coach diagnosis, the off-step marker, the pictures, Try another) is excellent; the packaging fights it: nine controls before any math, Q1 below the fold on a phone, every moment offers several equal choices, a right answer feels like nothing happened.
1. Arrival: drop Start (typing starts the clock); mode toggle + Practice menu on one row; set row → one line "Set 44579 · Change ▸" (<details>); one intro line; Q1a visible at 390×844.
2. Sticky bar one row: time | score | Finish; Pause only while running (Resume after). Score: "9 right first try (2 with help) · 12 of 36 done"; before any answer "36 questions".
3. After a wrong answer: Hint → Show me how → Try another (grey until right or steps shown, then blue); hide Hint once Show me how is open.
4. Wrong card: "✗ Not yet. <diagnosis>" on one line + the Next-time rule; delete "Tap Show me how to see the step…".
5. Right: "✓ Correct on the first try" / "✓ Correct, with help — still a point" / "✓ Correct on try 4"; one blue Next ↓ (tap moves on; focus never jumps by itself); section headings count up ("4 / 9", "9 / 9 ✓").
6. End: perfect → "Every one on the first try." + New whole test; else jump links "Not right yet: 1b · 3c", Practice my misses (N) blue, part buttons only under 80% (grey), New whole test grey.
7. One name per thing: Hint panel "Hint · step 2 of 3"; "See the steps" → Show me how; "Another one" → Try another like this.
8. Cut the "1 pt" labels. (Kept: they mirror the real test paper — teacher's call.)
9. M7: every labeled length in a figure distinct (base = height in ~4%; leg = base).
10. Remember last time: "Last time: 22 / 36 in 31:10. Today: 28 / 36 (+6)."
Protect: the diagnosis, "This is the step where your answer went off", the pictures, Try another + streak, small checked Hint steps, Almost, generous reading, one shared design, new numbers every set.

## 4 — engineering (scripts in ../apple4/)
Kit spec: shared core (exact, rng with per-slot streams slotRng(unit, seed, slot) = rng(fnv1a(...))), readers, judge pipeline, pictures, ui/walk/keypad/store, css, check harness (answers re-derived + oracle, keys typed back, clean rule at generate, chains, claims, figure labels + real getBBox, canonical test-form comparison, planted errors, stability lock sets.lock.json + contentVersion, generator float lint), build to one file with doctype/lang/charset and BUILD info; saved state keyed <unitId>., records {schema, contentVersion, setHash, …}, feedback recomputed (not stored), migrations, misses by slot, LRU 25 sets. Unit supplies unit.json, families, forms, oracle, css.
1 [High] A7 marks known mistakes right in most sets (dropFalseMistakes): (2²)²/2³ — adding exponents gives the same 2. Fix: M7's clean rule at generate.
2 [High] Set numbers unstable (one shared stream; M7 generate depends on coach): one new model changed 118/3,000 sets; saved answers land on different questions. Fix: per-slot streams, lock file, setHash.
3 [Med] Following the Hint to the end shows the answer; copying it counts "first try (with help)". (Kept: the teacher's decision — the walk ends with the answer; with-help is tallied.)
4 [Med] M7 "don't round" never stated but costs points. Fix: page note.
5 [Med] A7 test-form check compares strings: 2³·2⁴ (test 2⁴·2³) gets through (250/14,286). Fix: canonical comparison.
6 [Med] Saved state stores rendered feedback HTML (~17 KB/set), never evicts, VER bumps orphan keys, misses positional. Fix: the store spec.
7 [Med] Test mode: unreadable answers only revealed at Finish. Fix: "can't read this yet" on blur (reader only).
8 [Low–Med] A7 family knowledge scattered in four switch blocks; port to family objects (deferred).
9 [Low] A7 dead code (checkWork, Help-me-solve UI, data-hint); stale comments; picture checker counts failures not plants; test_engine has no plants; look3 hard-codes a path.
10 [Low] Four parts hard-coded (/p[1-4]/, charAt(1)); qkey falls back to Math.random.
11 [Low, verify] Google Sites: replacing an embed may change its origin (progress resets) — update in place; iPhone may clear third-party-frame storage.
Protect: exact BigInt + sympy oracle; clean rule, plant(), F[fam]; integer-only RNG; pictures only once answered/shown; follow-through; unreadable never counts; single file.

# Closing check (review 5, 16 Oct 2026) — after the rebuild on the kit (scripts in ../apple5/)
Holds: R1-1, 3, 6, 8, 10, 12–16; R2-N1–N3, N5, N6, N8, N9; J-1, 4–7, 9, 10; W-1, 2, 4–7, 9, 10.
Partly → fixed: R1-2 (focus to BODY after a right last part / Keep working / Switch / Start over / New); R1-4 (km, mm units);
R1-5 (4a's Show me how and picture still named the slanted side); R1-7 (jump links, "Set · Change", "See why it works" < 44px);
R1-11 (results "(1)" opened 2 — misses are now one round everywhere); R2-N7 / B3 (dark-mode print: dark rules now screen-only);
J-2 (M7 bar wrapped — stale build); J-3 (Hint panel and Show me how open together — Show me how now closes the Hint).
New → fixed: B1 [High] two tabs looped forever (storage handler re-saved) — now adopts a newer record quietly, never writes back;
B2 [High] false "This set was updated" on new sets (fresh() stamped the old hash) — only for a record this device saved;
B4 M7 build stale — rerun; B5 M7 15b Show me how showed "null" (an echo-hint rewrite caught a solution sentence) — fixed, and
the checks now fail on any null/undefined/NaN on the page; B6 back to Whole test lost the set — the whole-test set is remembered;
B7 keypad shifted the page at the top — the keypad now sits above the box, so moving down never moves the box tapped;
B8 "2² means 2 × 2 (not 2 × 2)" — clause left out for 2; B9 entities in test mode's message; B10 "tap Hint" while the Hint is
open; B11 "a picture of why" not true everywhere; B12 duplicate id, Escape, Close alignment, lone-part indent, "3**17" preview;
C: "36 parts to answer", "Every one on the first try" only without help, no With-help column in test mode, streak counts on,
"the ribbon is a length".
Each has a check: kit/check/page.js (two tabs quiet, no false notice, keypad never moves the next box, dark print, no null text),
m7_check (no empty solution or walk text, km/mm notes).
