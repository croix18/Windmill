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
