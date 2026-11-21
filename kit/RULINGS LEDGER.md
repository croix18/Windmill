# RULINGS LEDGER — every ruling 1–57, and where it lives now (21 Nov 2026)

The proof that nothing was dropped on the way to `BUILDER CARD.md`. Numbers are the A7 rulebook's
(`a7/reference/HOUSE STYLE.md` §13b); a ruling A7 does not carry is read from M7's (`m7/reference/HOUSE STYLE.md`)
and marked [M7]. At 29–32 the two rulebooks give one number to different rulings (A7 renumbered its 13–15 as 29–31 on
20 Sep); both are listed. "Card n" is the card's numbered rule list; "card: …" a section of the card; "plan" the
course's year plan (Windmill's spine and the course's scope-and-sequence); "history" a ruling with nothing left for a
builder to do (a shipped unit, a retired paper, a governance or kit matter already done).

| # | subject | status | lives now |
|---|---|---|---|
| 1 | Teach 2.04 by the pattern | IN FORCE | history (A7 Unit 2 shipped, ruling 32) |
| 2 | Calculators allowed; nothing printed about them | IN FORCE | gate docscan |
| 3 | One rulebook; M7 owns the master | IN FORCE | history (governance; suitecheck holds A7's block) |
| 4 | Reference Sheet and Study Guide differ | SUPERSEDED BY 11 | history |
| 5 | One point per lettered part | IN FORCE | unit papers: paper_ledger (unit.py) |
| 6 | Benchmark codes off student pages | IN FORCE | gate docscan |
| 7 | — (no ruling 7 in either rulebook) | — | history |
| 8 | A question never split across pages | IN FORCE | kit (papers keep a question whole); card: look once |
| 9 [M7] | A key names one answer | IN FORCE | card 14 |
| 10 | Slides, boards, IXL; nine boards | IN FORCE | card: what a lesson is; card 8 |
| 11 | No grey bars, no study guides | IN FORCE | history (the kit draws none) |
| 12 | No speaker notes on slides | IN FORCE | history (the pptx carries none) |
| 13 [M7] | Board time only for testable content | IN FORCE | card 2 |
| 13a [M7] | Boards re-asked the worked example | SUPERSEDED BY 43 | gate rulingcheck (repeatcheck) |
| 13b [M7] | Two diagnostic choice boards per round | IN FORCE | card 8; gate distractorcheck |
| 14 [M7] | Labelled answer boxes on assessments | IN FORCE | history (unit papers, kit) |
| 15 [M7] | Cut the reading, keep the math | IN FORCE | card 11 |
| 15a [M7] | Study guide off the assessments | IN FORCE | history (unit papers) |
| 16 [M7] | The M7 Unit 3 blueprint | SUPERSEDED BY 49 | history |
| 16a [M7] | Practice test a true parallel form | SUPERSEDED BY 49 | history |
| 17 [M7] | Unit 3 at 8% DOK 3 | IN FORCE | history (a paper already given) |
| 18 | Two transfer items per test | SUPERSEDED BY 49 | history |
| 19 | Follow-through credit, mechanically | IN FORCE | unit papers (`assessment.follow_through`) |
| 20 | One peer move, split board only | IN FORCE | card 3, card 4 |
| 21 | Six-question independent set | IN FORCE | gate rulingcheck (ruling 21) |
| 21 amended | The set is on a slide | IN FORCE | kit (the set slide); card: the gates, layout |
| 22 | One board's number is not needed | IN FORCE | gate rulingcheck (ruling 22); card 11, 12 |
| 23 [M7] | Math Nation book order | SUPERSEDED BY 52 | plan |
| 24 [M7] | TRUTH document is M7's master | IN FORCE | card: `benchmark_text`; M7 profile `TRUTH` |
| 25 | Florida lesson plan; MTRs named | IN FORCE | gate rulingcheck (ruling 25) |
| 26 | Lean four-page Teacher Edition | SUPERSEDED (A7: no edition, 20 Nov) | M7: checks telength; card: courses table |
| 27 | Every test runs two days | SUPERSEDED BY 51 (A7; M7 in force) | plan |
| 27a | A7: no review day | IN FORCE | plan |
| 28 | Every IXL skill required; SmartScore | IN FORCE (due date: 53) | gate rulingcheck (ixlplan); card: courses table |
| 29 (A7) | Grade 8 B1G-M is the spine | IN FORCE | gate capcheck, distractorcheck; card 1, 2, 10 |
| 29 [M7] | Three files per lesson | IN FORCE [M7] | M7 profile (`SET`, `BANK`); card: courses table |
| 30 (A7) | Book order, three woven threads | SUPERSEDED BY 52 | plan |
| 30 [M7] | Transfer items rehearsed on review | SUPERSEDED BY 49 | history |
| 31 (A7) | No video slot in a period | IN FORCE | card: what a lesson is; card 7 |
| 31 [M7] | Students bring any notes | IN FORCE | history (unit papers) |
| 32 (A7) | A7 Units 1–2 stay shipped | IN FORCE | history |
| 32 [M7] | Worked-answers copy, answers only | SUPERSEDED BY 49 | history |
| 33 [M7] | Test as an A/B pair | SUPERSEDED BY 49 | history |
| 34 | One naming convention, title included | IN FORCE | kit (`lib/names.py`) |
| 35 | The plan follows the class | IN FORCE | plan |
| 36 [M7] | Four changes to M7's plan | IN FORCE | plan |
| 37 | Nothing on a slide but the lesson | IN FORCE | kit (draws no `sub`/`hint`/`gloss`); card 6 |
| 38 | Figure labels readable and true | IN FORCE | gate figkit; card 16 |
| 39 | Answer slides show their steps | IN FORCE | gate stepcheck; card 15 |
| 40 | Slides set in Lexend | IN FORCE | kit; checks glyph |
| 41 | A deck is its Slides file | IN FORCE | `course.py HTML`; checks htmlcheck |
| 42 | No arrow for an equals sign | IN FORCE | gate rulingcheck (arrowcheck) |
| 43 | Practice never repeats the lesson | IN FORCE | gate rulingcheck (repeatcheck); card 13 |
| 44 | Question words and picture agree | IN FORCE | gate rulingcheck (figwords); card 16; card: look once |
| 45 [M7] | A story board: one plain sentence | IN FORCE | card 11 |
| 46 | Assessment papers in Lexend; merged PDFs | IN FORCE — widened 21 Nov: "It should be the lexend font throughout every document" | kit (`PAPER_FONT`; `DOC_FONT` sets every document) |
| 47 | PM2 8 Dec; a week ungraded | IN FORCE | plan |
| 48 | Never test after a long break | IN FORCE | plan |
| 49 | The test is a random practice draw | IN FORCE | unit papers (`assessment.forms`, check_forms) |
| 50 [M7] | A lost day returns in Unit 9 | IN FORCE | plan |
| 51 | A7 tests: one period, not Wednesday | IN FORCE | plan |
| 52 | The year follows the essential benchmarks | IN FORCE | plan |
| 53 | IXL with each lesson, due by test | IN FORCE | gate rulingcheck (ixlplan due line); card: `ixl_due` |
| 54 | One title and numbering hierarchy | IN FORCE | kit (unit papers); card 17 |
| 55 | An interactive practice page per unit | IN FORCE | kit (`publish_web.py`) |
| 56 [M7] | M7 Unit 13 before the break | IN FORCE | plan |
| 57 | PM days are condensed class days | IN FORCE | plan |
| 58 | Classroom wording: plain American questions; no "Answer it." under a board | IN FORCE | kit (the board's instruction, the IXL slide, the cover line); card 19 |
| 59 | A printed page is written for a reader who did not build it: the Lesson Plan in whole sentences; no ruling number and no word about the build on any page; no instruction line on an Independent Set | IN FORCE | kit (`plankit`, the Independent Set, the keys' notes); card 20 |

**§16, how lessons teach (3 Sep 2026), for completeness:** build order — card 1; rule 1 (Example, then Your Turn) — card 5;
rule 2 (declared variation) — card 9, `te.variation`; rule 3 (SSDD on the review) — unit review (`unit.py`), not a lesson
field; rule 4 (diagnostic boards) — card 8, 10, gate distractorcheck; rule 5 (spaced warm-up) — card 7; rule 6 (the
named moves) — card 3.

**Counts.** 69 rows (59 numbers, six lettered or amended rulings, and the second ruling at 29–32). IN FORCE 56 (two
amended: 21 and 28); SUPERSEDED 12; one number never issued (7). Lives in "history": 17 rows (9 in force with nothing
left for a builder, 7 superseded, and 7). Rows that point at the card: 25; at a gate: 16; at the plan: 13.
