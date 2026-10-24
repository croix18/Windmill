# Reviewing a unit another chat built, then publishing it

*For the session that takes a finished unit from one of the build chats (24 Oct 2026). Croix: "I'd like for a fable chat
to run over it before it gets pushed for extra redundancy."*

The build chat stopped at the course repository. Nothing is on the website, Google Sites or an artifact until this pass is done.

## 1. Take it in

1. Pull the course repository and Windmill. Read the chat's last message (the commit hash, the judgment calls) and the unit's
   audit (`<course>/reference/<Unit> - Audit.md`), §6–§8. Read `NOTES.md`'s top section.
2. From a clean clone: `bash tools/check.sh` → all checks passed; `cd <course>/build && python3 build_all.py uN` → `checks: 0
   findings` and the package compared byte for byte (`install_unit.py` reports "same"/differences; a difference means the
   package was edited by hand or built from different specs — stop and ask).
3. The practice page: `python3 <course>/practice/kit/check/run.py <course>/practice/uN` and the teacher folder → pass, variety ≥ 100
   per part (or allowed in `unit.json` with a reason you accept).

## 2. Read it as the three readers would — again, independently

The build chat ran a Barton review, an adversarial critic and a FAST master educator. Run your own, fresh (subagents that have
not seen the build), over: every slide PDF (`contact_sheet.py` and then the crowded ones at 80 dpi), every Teacher Edition,
the independent sets and keys, the practice paper and key, the practice page (open it; work three sets; try every Hint path on
the hardest family), the teacher copy's printed test (two forms). What to hunt:
- a keyed value that is right by the check but wrong by the question (the check proved the wrong thing);
- a distractor no student produces, or two options that are the same value;
- a picture whose numbers are not the words' (ruling 44) — `figure_sheets.py uN --grid 4`;
- a practice item that repeats the notes (ruling 43) — `python3 Windmill/tools/dry_run.py <build dir> uN`;
- a benchmark boundary crossed (TRUTH / the Source of Truth decide);
- a practice-page family whose `models` include the right answer under a different form ("Almost" cases), or a Hint that
  states its own answer;
- a slide that wrapped, a gloss that ran into the math, an answer on three lines.
Findings → the audit's §8 (dated, "second review"); fix in the specs; rebuild; `build_all.py uN --install`; master sheet; push.

## 3. Publish

Only when §1–2 are clean:
1. In the course repository: `python3 <course>/build/publish_web.py --site ../mrshaffer-site` (slides as web pages, the practice
   page and teacher copy, the whole package into `units/`).
2. In `mrshaffer-site`: `python3 tools/schedule.py --windmill ../Windmill --m7 ../windy-hill-m7 --a7 ../croix18-windy-hill-a7`,
   `node tools/build.mjs && node tools/test_site.mjs` (SITE CHECKS PASS), commit, push; watch the deploy succeed.
3. Send Croix the Google Sites embed file (`<Course> Unit N Practice Test.html`) and tell him the unit's pages are live
   (`/<course>/unit-N/`, the teacher page, the practice page). Publish the practice page as a claude.ai artifact only if he asks.
4. Windmill `HANDOFF.md`: the unit's line (hashes, what the second review found, what is open). Push.
