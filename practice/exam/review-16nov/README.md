# The test, reviewed (16 Nov 2026)

Four independent reviews of the test taken on the website (`../DESIGN.md`), each by a reviewer that had not built what it
attacked, each finding with a probe that was run. What they found, and what was changed, in the order it happened:

| File | What was attacked | Found |
|---|---|---|
| `REVIEW.md` | the site's side (routes, store, the lock's use) | 1 Critical, 3 High, 2 Medium, 7 Low — the lock, the races and the teacher's routes held; the holes were around the record |
| `REVIEW2.md` | the site again, after its fixes | 2 High, 2 Medium, 4 Low — ten first findings closed by the reviewer's own probes |
| `TEST-PAGE-REVIEW.md` | the test page (a child stuck, work lost, a child wrongly counted as leaving) | 1 Critical, 5 High, 7 Medium, 10 Low; ends with a checklist to try by hand on a real Chromebook |
| `TALLY-REVIEW.md`, `TALLY-REVIEW2.md`, `TALLY-REVIEW3.md` | Tally's Tests (the wrong child gets the score; a test lost) | 4 Critical, 3 High, 5 Medium, 6 Low; after the rework 2 Critical, 3 High, 3 Medium, 3 Low; after that 1 Critical, 1 High, 1 Medium, 3 Low — each round closed by the reviewer's own probes before the next |
| `CHANGES.md` | — | the decision on every finding, section by section (§1–11); all of it is folded into `../DESIGN.md` |

Nothing here has been tried on a real device: Croix's own trial run (a whole test, start to Tally, on a Chromebook and his
tablet) is the next gate, and `TEST-PAGE-REVIEW.md` ends with what to try by hand.
