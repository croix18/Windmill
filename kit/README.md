# The build kit

One code base that turns a lesson spec into its deck (PowerPoint and the HTML console), teacher's
edition, lesson plan and question documents — for **both** courses. It was two forks: the accelerated
course's `a7/build/lib` and the copy the on-level course took on 20 September 2026. By 4 October the
lesson builder alone differed by more than eight hundred lines, each side had fixes the other needed
(M7 had no `overlap` check and shipped a wrapped option printed over the one below it; A7 had no
title-line guard and shipped seven title slides whose last line sat on the box's edge), and a third
of M7's rebuilt decks had lost the colour code their slides still talked about. This folder is the
merge. It is published from here and copied into each course repository; neither copy is edited.

## What is in it

| Path | What it is |
|---|---|
| `lib/profile.py` | Reads `build/course.py` — everything a course settles for itself — and hands it to the kit as `C`. A name the course leaves out takes the family default. `python3 -m lib.profile` prints the profile and marks what the course set: that list is "where the courses differ", derived. |
| `lib/lessonbuild.py` | The gates (mathcheck, distractorcheck, capcheck, rulingcheck, balancecheck — each refuses the build) and the builders: the lesson's slides (`_fill_deck`, one function for the pptx and the HTML deck), the whole-unit deck, both teacher's-edition styles, the bank file. |
| `lib/deckkit.py` · `lib/htmlkit.py` · `lib/consolekit.py` | The pptx deck, the HTML deck (KaTeX, one self-contained file) and the console wrapped around the unit deck (Today, the rail, pacing, the whiteboard round, the room). Same interface, so one builder drives all three. |
| `lib/mathimg.py` · `lib/figkit.py` | Expression images (mathtext, one size per surface) and geometry figures drawn from their numbers. A height that ends outside its figure is refused. |
| `lib/names.py` | **Every file name the build writes**, in one place: `<COURSE> <unit>.<lesson> <Lesson Title> - <What it is>[ - Key].<ext>` and `<COURSE> Unit <N> <Unit Title> - <What it is>…`; and the readers (`is_key`, `is_lesson_deck`, …) the checks and the installer use, which read what a file IS from the part after the first ` - `, never from the title. Croix's ruling 34, 4 October 2026. |
| `lib/flow.py`, `lib/flow.js` | **The plan's engine** (Croix, 4 October 2026: "I need the plan to be fluid and adjust on the fly"; his rule: push everything back). `lay` puts a course's sequence — lessons, reviews, tests, in order — on the school days left after the as-run log has taken out the days that went to something else: a test's first day is a Monday or a Thursday and its second the next day, a spiral day fills what has to pass, a flex day is dropped when the class is behind, a unit does not start right before a break. The Python is what each course's calendar tool runs (`apply_log`, `baseline`, `changes`); the JavaScript is the same `lay` for the console, plus `where`: what a period did last, what is next, how far it is from the year's plan, when the unit's test now falls. Windmill's `plan/test_flow.py` holds the two engines to each other. |
| `lib/packkit.py` | **One package layout for both courses**, by lesson: `All Slides/`, `Lessons/<N.NN>/` with its `Keys/` (the lesson's number only — a path that carries the title three times does not unzip on Windows; the install refuses one that would not), `Review Day/` or `Review/`, `Assessment/` (by form), `Handouts/`, `Reference/`; each file placed by its name and compared byte for byte with the build; the zips (the whole folder also in parts when it is over the upload limit); the dates and timing a START HERE derives. Each course's `install_unit.py` calls it and writes its own START HERE. |
| `lib/ixlplan.py` | Ruling 28 as a gate (inside `rulingcheck`): every IXL skill on a slide, and the code a student types beside it, is the course's IXL plan's — read from the spine the course vendors. A lesson the plan lists skills for names exactly those. |
| `lib/slotmark.py` | The colour code's named slots: `\sA{}` blue, `\sB{}` orange, `\sH{}` teal, marked in the spec where the slot stands, honoured only on slides and only where the teacher shows, stripped everywhere else. |
| `lib/dockit.py` · `lib/tekit.py` · `lib/plankit.py` · `lib/unitbuild.py` | Word documents, the teacher's edition, the Florida lesson plan (two styles), and the unit documents (reference sheet, review, a single paper or parallel forms with keys and worked-answers copies). |
| `checks.py` | Eighteen checks over a built unit, each printing what it looked at. `kitcheck` holds the copy in a course repository to `KIT.sha256`. |
| `build_lesson.py` · `build_unit.py` · `build_all.py` | The drivers. |
| `gates.py` | Every build gate over a unit's specs without building anything, and the kit held to its manifest — no LibreOffice, no browser, so each course's `tools/check.sh` runs it before every push and in CI. |
| `slotaudit.py` · `shuffle_choices.py` · `contact_sheet.py` · `figure_sheets.py` | Read every coloured expression as the renderer reads it; spread the keyed letters; look at every slide; look at every PICTURE beside its words (ruling 44's look-through). |
| `assets/` | KaTeX and the house face, inlined into every HTML deck. |
| `KIT.sha256` | The manifest: every file above with its hash. Written by `tools/kit_manifest.py`. |
| `tests/` | The kit's own tests: every gate shown a spec it must pass and a planted defect it must catch, under a profile shaped like each course's. Run by `tools/check.sh` and CI. |

## Changing it

1. Edit here, in `kit/`. Never in a course repository — `kitcheck` there will refuse the build's output.
2. `python3 tools/kit_manifest.py` and `bash tools/check.sh` (the kit tests run under both profiles).
3. Vendor into each course and rebuild a unit of each: `python3 tools/vendor_into.py <course>/…/build`
   (each course repository's `tools/vendor_windmill.py` calls this).
4. A change is finished when **both** courses rebuild at `checks: 0 findings` and anything that
   moved in either course's output is something the change meant to move.

A course difference is a name in `lib/profile.py` with a family default, set in that course's
`course.py` — never an `if` on the course's name.

## What a course repository owns

`build/course.py` (which also holds each unit's title, `UNITS` — every unit-wide file and folder is
named from it); its unit folders (`uN/lNN.py`, `unit.py`, `review.py`, `manifest.py`, `figs.py`); its
`install_unit.py` (where its packages live and what START HERE says — the layout itself is the kit's);
its rulebook, whose suite tables `suitecheck` reads.
