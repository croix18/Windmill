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
| `lib/slotmark.py` | The colour code's named slots: `\sA{}` blue, `\sB{}` orange, `\sH{}` teal, marked in the spec where the slot stands, honoured only on slides and only where the teacher shows, stripped everywhere else. |
| `lib/dockit.py` · `lib/tekit.py` · `lib/plankit.py` · `lib/unitbuild.py` | Word documents, the teacher's edition, the Florida lesson plan (two styles), and the unit documents (reference sheet, review, a single paper or parallel forms with keys and worked-answers copies). |
| `checks.py` | Eighteen checks over a built unit, each printing what it looked at. `kitcheck` holds the copy in a course repository to `KIT.sha256`. |
| `build_lesson.py` · `build_unit.py` · `build_all.py` | The drivers. |
| `slotaudit.py` · `shuffle_choices.py` · `contact_sheet.py` | Read every coloured expression as the renderer reads it; spread the keyed letters; look at every slide. |
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

`build/course.py`; its unit folders (`uN/lNN.py`, `unit.py`, `review.py`, `manifest.py`, `figs.py`);
its packaging (`install_unit.py`); its rulebook, whose suite tables `suitecheck` reads.
