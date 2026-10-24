# How we work — read this before anything else

*Written 24 October 2026 by the head-engineer session for the two chats that build the next units: one builds M7 Unit 10,
the other builds A7 Unit 6 and then Thread B. You are the muscle on a plan that is already made. Follow it in order. When the
plan and your judgment disagree, do what the plan says and tell Croix, in one line, why you wanted to differ.*

## Who you are working for, and how he reads

Croix Shaffer teaches 7th-grade math at Windy Hill Middle School (Lake County, FL): **M7** is on-level (course 1205040, MA.7
benchmarks, Grade 7 FAST) and **A7** is accelerated (course 1205050, MA.7 + MA.8, Grade 8 FAST). Periods are 53 minutes;
Wednesdays are 43. He reads your messages on his phone between classes. So:

- **Short messages, bottom line first.** What you did, what you decided, what you need. No recaps of the plan.
- **Judgment calls are one line each, reversible, and listed.** "I merged X and Y because the plan does; say so and I split them."
- **Ask only when the plan cannot answer.** A ruling conflict, a benchmark boundary, a Math Nation page that is missing, a
  check that looks wrong. Everything else is in the repository: look there first.
- **He may be asleep or teaching.** Do not stop for approval unless this document or the brief says to. Send the message, keep going.

## Rule 0

> "math errors are unacceptable… the stuff that touches students needs to be completely mathematically sound. everything
> else is secondary… the second I get associated with bad math is the second I utterly fail." — Croix

Every number on every student page is re-derived by sympy from a `check` you write. The build refuses to run without one.
That is the floor. You also read every item as a student would and look at every rendered slide and page. "The checks
passed" is never the whole answer.

## The two things that are weird here, explained from zero

### 1. GitHub: the token, the file, the header

You are in a Claude chat with a shell. The repositories are private and the sandbox's proxy breaks git's normal login dance,
so every push and clone sends the token up front as a Basic header. The repositories already carry a script that does it
(`tools/push.sh`). You only have to put the token in the right place once.

**Croix's first message after this brief will be the token.** Do this with it, and nothing else:

```sh
mkdir -p /root/work && cd /root/work
T='<paste the token here, inside the quotes>'
B=$(printf 'x-access-token:%s' "$T" | base64 -w0)
git -c "http.https://github.com/.extraheader=Authorization: Basic $B" clone https://github.com/croix18/<REPO>.git
cd <REPO>
printf '%s' "$T" > .github-token && chmod 600 .github-token      # git-ignored; the push script reads it
git check-ignore -q .github-token && echo "token file is ignored (good)"
unset T B
```

`<REPO>` is `windy-hill-m7` for the M7 chat and `croix18-windy-hill-a7` for the A7 chat. Also clone `croix18/Windmill`
beside it (same command) — the shared kit and the spine live there; you read it, you do not edit it.

Rules about the token, no exceptions: it goes in `.github-token` and nowhere else — never in the remote URL, never in a
commit, never printed in a message (not even to confirm it "looks right"). If a push fails with 401 on the probe below,
the token is wrong or revoked: tell Croix and wait; do not debug it.

```sh
curl -s -o /dev/null -w "%{http_code}\n" -u "x-access-token:$(cat .github-token)" \
  "https://github.com/croix18/<REPO>.git/info/refs?service=git-receive-pack"      # 200 = can push; 401 = ask Croix
```

**Pushing:** always `bash tools/push.sh "message"` from the repository root. It runs the repository's checks first
(nothing unchecked is pushed), commits as Croix with a co-author trailer, pushes, then compares the remote head to the local
one and prints `pushed: <hash>` or `PUSH FAILED`. Trust that line, not git's own chatter. Before your first push:

```sh
export CLAUDE_MODEL_NAME="Claude Opus 5.5"      # the co-author trailer names the model that did the work
```

**Nothing exists until it is pushed.** Push after every lesson. A build that is not pushed did not happen (a container was
reclaimed once with a week of work in it).

Full detail, if something odd happens: `a7/reference/GITHUB FROM A SESSION.md` in the A7 repository.

### 2. Math Nation: read from Google Drive, never into git

Math Nation's pages are copyrighted. They are your audit target — you read them, you never copy them into a repository.
You have a Google Drive tool in this chat. The brief gives you the folder IDs. For each lesson folder:

1. `search_files` with `parentId = '<folder id>'` to list it (Teacher Edition PDF, Student Edition PDF, Additional Practice
   and its key, a Presentation Slides .pptx you do not need).
2. `download_file_content` on each **PDF** (the .pptx is 80 MB; skip it) — the result is base64 — and write it to
   `/root/mn/<unit>/<name>.pdf`. `/root/mn/` is outside every repository. Read the PDFs with PyMuPDF (`fitz`).
3. Work every problem in the package with sympy. Write the audit (the brief names the file). Nothing from the PDFs goes in it
   verbatim beyond what an audit needs to cite.

## The procedure you are following

The whole procedure is in the repository: **`<course>/build/BUILDING A UNIT.md`** (M7's is the current one; the kit is shared,
so it is A7's procedure too — A7's own copy is older and says the same things). Read it once, start to finish, before the
first spec. Then **`SPEC SCHEMA.md`** beside it (every field), the rulebook **`<course>/reference/HOUSE STYLE.md`** §13b (the
rulings — read every ruling from 41 on; they are the newest), and the last built unit's specs beside their output (the brief
names them). Your brief tells you what is specific to your unit and what changed after those documents were written.

The order, which the brief repeats with your unit's particulars:

1. **Set up and smoke-test** (clone, environment, `bash tools/check.sh`, rebuild the last unit; all green before you write a line).
2. **Intake and audit**: Math Nation from Drive, every problem worked, the audit written and pushed, the lesson outlines written
   from the benchmarks and pushed. Message Croix. Carry on.
3. **One lesson at a time**: spec → gates → build → checks → contact sheet (look!) → push. Never start the next lesson with
   the last one unpushed.
4. **The unit documents**: the reference sheet, the review, and the assessment **as the practice test alone** (ruling 49,
   below). Build, check, push.
5. **The package**: `build_all.py uN --install`, the master sheet regenerated and checked, push.
6. **The practice page** (the student web page the unit test is drawn from), its teacher copy, its checks. Push.
7. **The review pass**: three independent readers over everything (the brief says who), their findings fixed, rebuilt, pushed.
8. **Handoff**: the notes file updated, one message to Croix with the commit hashes and the judgment calls. **Stop there.**
   You do not publish to the website, Google Sites or any artifact: a separate session reviews the unit first, then publishes.

## What changed after the documents you are reading were written

- **Ruling 49 (22 Oct): the unit test is a random set of the practice page.** For a new unit, `unit.py` gives
  `assessment.forms = {"practice": sections}` and nothing else: **no Form A, no Form B, no transfer items, no worked-answers
  copy.** The build writes the Practice Test paper and its key (the blueprint of the test), START HERE and the master sheet say
  the test is a random set, and the practice page's teacher copy prints the test as 1–5 random sets. Anything in BUILDING A
  UNIT, HOUSE STYLE or a model `unit.py` about parallel forms, transfer items (ruling 18), Worked Answers (ruling 32) or
  "rehearse the transfer types on the last lesson's boards" **does not apply to you**. The practice page must give every
  question part at least 100 versions (the kit's variety check fails the build under that).
- **Ruling 51 (24 Oct, A7 only): every A7 unit test is one period, on any day but a Wednesday.** The A7 brief has the dates.
- **Ruling 41: no HTML console; a deck is its `Slides.pptx`.** Anything about "the console" is history.
- **Ruling 43: no practice item repeats what the lesson showed. Ruling 44: words and picture agree.** Both are gates; read them in HOUSE STYLE.
- **No Portuguese on a new practice page** (24 Oct): no `"second"` in `unit.json`, no `pt.js`.
- **The kit changed on 24 Oct** to allow the practice-only assessment. Your clone has it. Do not edit anything under
  `build/lib/`, `build/checks.py`, the drivers, `practice/kit/` — `kitcheck` refuses a changed copy. If the kit is wrong, say so to Croix.

## Never

- Never put a Math Nation page, a student name or a score in a repository.
- Never write an answer without a `check`; never use `ack` to skip one; never edit a check to match an answer.
- Never print a benchmark code, the word "calculator", "homework", or partner/group work on a student page.
- Never edit a file in `<course>/packages/` by hand (the installer writes them), or a kit file, or `HOUSE STYLE.md`
  except to record a ruling Croix actually gave, quoted and dated.
- Never leave a lesson unpushed while starting the next one. Never trust `git push`'s message over `push.sh`'s verdict.
- Never publish anything outside the course repository. Never message students' materials to anyone but Croix.

## When you are done

Your last message to Croix names: the final commit hash; what was built (lessons, documents, practice page); the book's
defects you did not reproduce; every judgment call, one line each; and what is open. Then stop. The review session takes it from there.
