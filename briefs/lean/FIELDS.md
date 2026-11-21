# FIELDS — which output reads each spec field

Read from the code of Windmill `lean/s1` (kit `47c9b0a`): every `["key"]`, `.get("key")` and `"key" in` in `kit/lib/*.py` and the
drivers, listed by function (an AST walk), then each function assigned to its output and spot-read. Profiles: **A7** = `TE_STYLE
"lines"`, `PLAN_STYLE "sections"`, `BANK "docx"`, `SET "handout"`, `CLOSE False`; **M7** = `"table"`, `"labels"`, `"md"`, `"slide"`,
`CLOSE True`. A cell naming a profile or style means "only there".

Columns. **Slides** — the lesson `.pptx` (and the same slides in the unit deck). **Side-car** — `Slides.notes.json`, the
per-slide label (`sub`), minutes and teaching note; the pptx has no speaker notes (ruling 12). Its minutes feed the Lesson
Plan's Sequence, START HERE's timing table and `plancheck`; its notes and labels are printed by the Teacher Edition only, and
`plancheck` requires a note on every slide but the title and the boards only where an edition is built (since 47c9b0a). **LP** — Lesson Plan. **IS** — Independent Set and
its key (`SET "handout"`). **QB** — Question Bank and Additional Question Bank with keys (`BANK "docx"`), or the unit's
`Question Bank.md` (`BANK "md"`, `write_bank`). **Gates** — build-time gates (mathcheck, distractorcheck, capcheck,
rulingcheck — which runs arrowcheck/ruling 42, repeatcheck/ruling 43, figwords/ruling 44, align, ixlplan — balancecheck,
stepcheck). **TE** — the Teacher Edition. **TE-only** — the edition was the only output that read it.

Walked whole, not by name: capcheck scans every string of the student blocks and of `te` (the `te` block with every
boundary skip); arrowcheck scans every student block except `NOT_ON_A_STUDENT_PAGE` (note, note_q, wrong, errors, source,
warmup_note, why, gloss, hint, te_answer, sub, check, yt_check, scoring). Under `TEACHER_EDITION = False` capcheck no longer
reads the TE-only fields below.

## `L` — a lesson

| field | Slides | Side-car | LP | IS | QB | Gates | TE | TE-only | written today (A7, no edition) |
|---|---|---|---|---|---|---|---|---|---|
| `code` | — (file name) | — | labels: Lesson row | — | md: section head | all (messages); ixlplan | — | no | yes |
| `plan_code` | IXL slide due line (ixlplan.due_line) | — | due line | — | — | ixlplan | — | no | only if the lesson's plan day has another code (a thread day) |
| `unit` | footer, eyebrow | — | both | eyebrow | eyebrow; md file | ixlplan | eyebrow | no | yes |
| `lesson_no` | footer, eyebrow (via `_label`) | — | sections: Lesson row | eyebrow | eyebrow | — | eyebrow | no | yes |
| `label` | footer, eyebrow, unit-deck row | — | sections: Lesson row | eyebrow | eyebrow | — | eyebrow | no | only if not "Lesson N" |
| `title` | title slide, footer; every file name | — | both | header | header; md head | mathcheck/stepcheck (messages) | header | no | yes |
| `benchmark` | title slide | — | both | — | md: section head | — | page 1 | no | yes |
| `benchmarks` | — (HTML console tag only) | — | labels | — | — | — | table: page 1 | no (A7: read by nothing) | no |
| `benchmark_text` | — | — | both | — | — | — | page 1 | no | yes |
| `target` | title slide | — | both | — | — | capcheck, arrowcheck | page 1 | no | yes |
| `yesterday` | passed to `title_slide`, not drawn | — | — | — | — | — | — | read by nothing | no |
| `today` | — | title slide's note when there is no `title_note` | — | — | — | — | via side-car | no (side-car) | no |
| `essential` | — | — | both | — | — | — | — | no | yes |
| `building_on`, `working_toward` | — | — | both | — | — | — | — | no | yes |
| `unit_title` | — | — | sections: Unit row | — | — | — | — | no | yes |
| `closure` | — | — | sections: Closure | — | — | — | — | no | yes |
| `vocab` | Vocabulary slide | — | both: Vocabulary line | — | — | capcheck, arrowcheck | — | no | yes |
| `vocab_slide` | Vocabulary slide on/off | — | — | — | — | — | — | no | only to leave the slide out |
| `vocab_note` | — | Vocabulary slide's note | — | — | — | — | via side-car | no (side-car) | no |
| `ixl` | IXL slide | — | both: Practice/Homework | — | — | rulingcheck (ruling 28, ixlplan) | — | no | yes |
| `ixl_due` | IXL slide | — | both | — | — | — | — | no | only if the plan's due line will not do |
| `warmup` (list) | warm-up + answers slides | — | — | — | — | mathcheck, capcheck, arrowcheck, repeatcheck | lines: the reveal's answers | no | yes |
| `warmup[].stem`, `.answer`, `.fig` | yes | — | — | — | — | repeatcheck, figwords; `answer` capcheck | lines: `answer` | no | yes (`fig` only if the question has a picture) |
| `warmup[].check` | — | — | — | — | — | mathcheck | — | no | yes |
| `warmup[].source`, `.band` | — | — | — | — | — | (capcheck walk) | "N retrieves …" lines | **yes** | no |
| `warmup_note` | — | warm-up slide's note | — | — | — | — | via side-car | no (side-car) | no |
| `title_note` | — | title slide's note | — | — | — | — | via side-car | no (side-car) | no |
| `notes[]`: `numeral`, `head`, `items`, `letters`, `table`, `tsize`, `math`, `text`, `items2`, `size`, `panel`, `fig` | Notes slide | — | — | — | — | repeatcheck (shown), figwords, capcheck, arrowcheck | — | no | yes (each only as the slide needs it) |
| `notes[].min` | — | minutes | Sequence | — | — | — | via side-car | no | yes |
| `notes[].sub` | not drawn | label | — | — | — | — | slide line head | no (side-car) | no |
| `notes[].note` (with `OFF:`) | — | note | — | — | — | (plancheck: non-empty, only where an edition is built) | slide line | no (side-car) | no |
| `notes[].not_sci`, `.align` | `align`: rows on their signs | — | — | — | — | capcheck; rulingcheck (align) | — | no | only if needed |
| `examples[]`: `title`, `prompt`, `ask`, `fig` | Example slides | `title` | — | — | — | repeatcheck, figwords, capcheck, arrowcheck | via side-car | no | yes (`ask`, `fig` only if needed) |
| `examples[].sub`, `.min_q`, `.note_q` | — | label, minutes, note | minutes | — | — | — | via side-car | no (side-car) | `min_q` yes; `sub`, `note_q` no |
| `examples[].check`, `.yt_check` | — | — | — | — | — | mathcheck; stepcheck (final value) | — | no | yes |
| `examples[].worked[]`: `lead`, `rows`, `answer`, `fig`, `items`, `align` | worked slide | — | — | — | — | figwords, repeatcheck, rulingcheck (align) | — | no | yes (`lead`, `fig`, `items`, `align` only if needed) |
| `examples[].worked[]`: `sub`, `min`, `note` | — | label, minutes, note | minutes | — | — | — | via side-car | no (side-car) | `min` yes (default 2); `sub`, `note` no |
| `examples[].your_turn`: `prompt`, `ask`, `answer`/`answer_latex`, `steps`, `fig`, `fig_a`, `align` | Your Turn slides | — | — | — | — | stepcheck, repeatcheck, capcheck | — | no | yes (`ask`, `fig`, `fig_a`, `align` only if needed) |
| `examples[].your_turn`: `min`, `note` | — | minutes, note | minutes | — | — | — | via side-car | no (side-car) | `min` yes (default 2); `note` no |
| `examples[].your_turn.gloss` | — | — | — | — | — | (capcheck walk) | — | read by nothing | no |
| `whiteboard[]`: `kind`, `latex`, `text`, `choices`, `correct`, `fig`, `fig_a`, `steps`, `answer`/`answer_latex`, `align` | board slides | — | `answer`/`answer_latex`; sections: `latex`/`text` (board_text) | — | — | mathcheck, distractorcheck, balancecheck, stepcheck, capcheck, repeatcheck, figwords | yes | no | yes (`choices`/`correct` on a choice board; `fig`, `fig_a`, `align` only if needed) |
| `whiteboard[].qtext` | — | — | sections (board_text) | — | — | — | yes (board_text) | no | only on a written board |
| `whiteboard[].te_answer` | — | — | labels | — | — | — | table | no (A7: read by nothing) | no |
| `whiteboard[].note` | — | question slide's note | — | — | — | (plancheck exempts boards) | — (neither style prints a board's note) | no (side-car; printed nowhere, before or after) | no |
| `whiteboard[].note_a` | — | reveal slide's note | — | — | — | distractorcheck ("Reveal X") | — | no | no |
| `whiteboard[].errors` | — (HTML console tag) | — | both: "If the board is wrong" | — | — | distractorcheck | yes | no | yes, on every choice board (cited) |
| `whiteboard[].wrong` | — | — | both | — | — | — | yes | no | yes, on a free or written board |
| `whiteboard[].unneeded` | — | — | — | — | — | rulingcheck (ruling 22: exactly one); repeatcheck | "The X is not needed" | printed only by TE; still required by ruling 22 | yes, on exactly one board |
| `whiteboard[].check`, `.ack`, `.form_only`, `.not_sci`, `.not_gap`, `.not_bound`, `.arrow_ok`, `.repeat_ok`, `.figwords_ok` | — | — | — | — | — | mathcheck / distractorcheck / capcheck / arrowcheck / repeatcheck / figwords | — | no | `check` yes; the rest only if needed |
| `whiteboard[].hint`, `.gloss` | — | — | — | — | — | (capcheck walk) | — | read by nothing | no |
| `bank`, `additional` (items: `stem`, `answer`, `why`, `space`, `lines`, `parts`, `choices`, `correct`, `heading`, `table`, `fig`, `fig_key`) | — | — | — | — | docx and keys; md (`errors` too) | mathcheck, distractorcheck, capcheck, balancecheck, arrowcheck | — | no | yes |
| `independent` (items as `bank`) | set slide (`stem`, `fig`) | — | — | page and key | md: "the six in-class questions" | rulingcheck (ruling 21: six), mathcheck, capcheck, repeatcheck | table: the six answers | no | yes |
| `no_set` | no set slide | — | labels: You do | none built | — | rulingcheck | table | no | only if the lesson has no set |
| `align` | rows on their signs | — | — | — | — | rulingcheck (align) | — | no | only for an equations lesson |
| `review` | file names ("Review Day" stem); closes the unit deck (REVIEW_IN_DECK) | — | — | — | md: skipped | — | table: no "More questions" line | no | only on a review day |
| `handout` | — | — | — | — | — | (capcheck blob) | table: Materials line | **yes** | no |
| `mtr` | — | — | both | — | — | rulingcheck (ruling 25) | page 1 (locators) | no | yes |
| `hoq` | — | — | both | — | — | rulingcheck (ruling 25) | — | no | yes |
| `differentiation` | — | — | both | — | — | rulingcheck (ruling 25) | — | no | yes |
| `te.say` | — | — | — | — | — | rulingcheck (ruling 26: three) — only where an edition is built | page 1 | **yes** | no |
| `te.watch` | — | — | — | — | — | rulingcheck (table) — only where an edition is built | table: Misconceptions | **yes** | no |
| `te.lives` | — | — | — | — | — | — | lines: fallback for `say` | **yes** | no |
| `te.read_first` | — | — | — | — | — (A7's own `bank_file.py` prints it in Reference/BANK) | — | lines: fallback for `say` | kit: yes; A7: no | only if wanted in the unit's Reference BANK file |
| `te.must`, `te.must_not` | — | — | both | — | — | rulingcheck (table: required) | page 1 | no | yes (the Lesson Plan's Must / Must not) |
| `te.standard_notes` | — | — | sections (fallback for must/must_not) | — | — | — | lines (fallback) | no | only as the plan's fallback for must / must_not |
| `te.materials` | — | — | both (A7's 43-minute cut lists live here) | — | — | — | lines | no | yes |
| `te.variation` | — | — | — | — | md: per lesson (A7's `bank_file.py` too) | rulingcheck (md: required) | yes | no | yes (A7's BANK file) |
| `te.set_note` | — | set slide's note | — | — | — | — | via side-car | no (side-car) | no |
| `te.close` | Before You Go slide (CLOSE) | — | — | — | — | rulingcheck (CLOSE: required) | — | no | no (only if CLOSE) |
| `te.close_note` | — | Before You Go slide's note | — | — | — | — | via side-car | no (side-car) | no |
| `te.closure` | — | — | labels: Closure | — | — | — | — | no | no (labels-style plan only) |
| `te.audit`, `te.changes`, `te.sits` | — | — | — | — | — (A7's `bank_file.py` prints audit, changes) | (capcheck walk) | — | kit: read by nothing | `audit`, `changes` yes (A7's BANK file); `sits` no |

**TE-only, every profile:** `te.say`, `te.watch`, `te.lives`, `handout`, `warmup[].source`, `warmup[].band` (and `te.read_first`
in the kit; A7's `bank_file.py` prints it). **Printed only by the TE but still required:** `whiteboard[].unneeded` (ruling 22).
**Read by nothing in any profile:** `yesterday`, `hint`, `gloss`, `te.sits` (A7 also `te_answer`, `benchmarks`).
**Side-car only once the TE is gone:** every slide label and note (`today`, `title_note`, `warmup_note`, `vocab_note`, `sub`,
`note`, `note_q`, `note_a`, `te.set_note`, `te.close_note`) — printed nowhere and required by nothing; a spec without them builds at
0 findings (proved on A7 11.03 with every "no" field stripped: `/home/claude/lean/b-s1b/build/u11/l03.py`).

**Written today = "no" (A7, no edition):** `yesterday`, `today`, `title_note`, `warmup_note`, `vocab_note`, `handout`, `benchmarks`,
`warmup[].source`, `.band`, `notes[].sub`, `.note`, `examples[].sub`, `.note_q`, `worked[].sub`, `.note`, `your_turn.note`, `.gloss`,
`whiteboard[].note`, `.note_a`, `.hint`, `.gloss`, `.te_answer`, `te.say`, `.watch`, `.lives`, `.set_note`, `.close`, `.close_note`,
`.closure`, `.sits`; in `unit.py`, `review[].letter` and a section's `points`.

## `U` — the unit (`unit.py`)

| field | read by | gates | written today (A7, no edition) |
|---|---|---|---|
| `unit` | every unit file name, every paper's eyebrow, the merges, the unit deck | check_unit | yes |
| `title` | every paper's header, the unit deck cover | check_unit (must equal `course.py UNITS`) | yes |
| `reference_intro` | Reference Sheet | — | only if there is a Reference Sheet |
| `reference` sections: `title`, `right`, `blocks` (prose, `table`+`header`, `bullets`, `vocab`), `not_sci` | Reference Sheet | check_unit (capcheck, arrowcheck, figwords) | only if there is a Reference Sheet |
| `review` parts: `title`, `lessons`, `benchmark` (key only), `items` (`key_stem` on the key) | Review and its key; All Assessments, All Keys | check_unit (mathcheck, distractorcheck, capcheck, balancecheck) | yes (A7: the Review paper) |
| `review[].letter` | — | read by nothing | no |
| `review_note` | Review (its HOW TO USE THIS note) | — | only if the review leaves a target out |
| `assessment.sections`: `title`, `benchmark`, `items` (`transfer`, `key_stem`, `fig_key`) | Test and its key | check_unit; paper_ledger | only for a single paper |
| `assessment.forms` (`A`, `B`, `practice`), `.practice` | each form, its key, its Worked Answers (not for practice-only); All Assessments | check_forms, check_distinct | yes (practice alone, ruling 49) |
| `assessment.total`, `.tracker`, `.tracker_order` | keys' Score Tracker | asserted against the items (paper_ledger) | yes |
| `assessment.follow_through` | the single paper's key | — | only for a single paper |
| `assessment.transfer_cut` | key (transfer line) | transfer count (ruling 18) | only if a transfer item was cut |
| `assessment.pi_line` | forms' instruction line | — | only if the forms need a π line |
| section `points` | — | read by nothing (points come from the items) | no |

No `unit.py` field is read by the Teacher Edition; nothing in `U` changes under `TEACHER_EDITION = False`.
