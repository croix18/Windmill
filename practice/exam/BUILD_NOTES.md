# Test page, stage 2 — running notes (15 Nov 2026)

Working in `/home/claude/windmill-exam` (branch `exam`); course trees in `/home/claude/examwt/m7/m7/practice`,
`/home/claude/examwt/a7/a7/practice` (vendored with `tools/practice_kit.py --vendor`).

## Done
- (see git log on `exam`)

## Next
A exam_pool.js · B exam_unit.js · C ui.js exam hooks · D exam.js · F check/exam_site.js · E build_exam.py · G checks · README

## Decisions
- Seeds: 32 hex characters (128 bits) passed to `U.generate` as a string; every unit draws through `KIT.draw`, which hashes
  `unit|seed|slot`, so a string seed is a set no practice link can open. exam_pool refuses a batch with two equal sets.
- The draw is a teacher-only hook in ui.js (`PracticeKit.draw(seeds, fn)`): render + paint on the page's own paper in
  Like the real test, `teacherPage()` false while drawing (so no number-line key), every kind kept (`S.eh = {h: []}`; the
  site filters by `fams`), then the page is put back.
- Recording: `U.view`'s functions are wrapped while drawing; each call's result is kept under `fn|place|args`, place =
  `si.ii` (item) / `si.ii.pi` (part; `-1` for a solo item's part), from `ITEMS[].pos`.
- The form label (`formOf(p).label`) comes from the key, so it is recorded as the skeleton's `flab`; in exam mode ui.js's
  judge is wrapped by `Kit.ExamUnit.judge(J)`: `formOf` gives `flab`, `judge`/`atFinish`/`equivUp` refuse.
- `fam` is NOT in the skeleton: no kit code reads it in exam mode, and it names the method.
