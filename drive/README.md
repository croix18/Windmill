# drive/ — Croix's Google Drive, kept by a script in his own account

Three things Croix said on 4 October 2026, in order:

1. *"Anyway to link them to each other inside of the Google drive? I don't get access to GitHub at
   school and would like to be able to quickly pull up the stuff I need."*
2. *"This is the most efficient way of doing this? So if I have to change something, you have to
   rebuild it? Can I set up a file that you can somehow manage? I'd put all of the stuff I need to
   in there."*
3. Asked how automatic: **"Fully automatic"**. Asked what "change something" means, he ticked all
   four: *I edit the documents · I add my own files · The plan moves · You rebuild a unit.*

## Which Drive

Late on 4 October he made a separate Google account for this — *"Mrshaffermath@gmail.com to handle
all of this"* — and connected Claude's Drive connector to it. Checked the same hour: the connector
now creates files owned by that account, and can read back what it creates; the account's Drive
was empty; the hub made earlier in his personal account (`18TJhEm…`) is no longer reachable from a
session and is his to delete. **Everything below happens in the new account**: he pastes the
script there, the script makes `Windy Hill` there (there is none to find), and he shares that
folder with his school account (which cannot run scripts) and his personal one. His own tools
(Deckhand, Tally, Cadence) still sit in his personal Drive's `Windy Hill › Apps` unless he moves them.

## What a session can and cannot do in his Drive

The Drive connector in his sessions sees **only files it created itself** (a search of his own
files returns nothing; a file made with `create_file` is found). It can create a file from text
passed in the call — so nothing bigger than a few kilobytes, and never generated content, which
would have to be retyped — and it cannot edit one afterwards. So a session cannot list his Drive,
cannot upload a document, cannot manage a folder he fills. What a session CAN do is push to GitHub.

**So the manager is a script in his account, and GitHub is the place a session manages.**

## The pieces

| | |
|---|---|
| `WindyHill.gs` | The script. It lives in the spreadsheet **"Windy Hill Drive Index"** (id `1JMjbk7-wjv0MozXuJKJIZ_vOomcztJgAPu5Tr-Z7Uts`; a session created it on 4 Oct so that sessions can read it — in **the Google account he opened that evening to hold all of this, mrshaffermath@…**, to which his Claude Drive connection now points) — he pastes it into Extensions › Apps Script once. It runs every hour as him. |
| `test_windyhill.js` | The script run end to end against stand-ins for Drive, Sheets, the Drive service, triggers, the clock and GitHub (which serves what the two course repositories really publish). `tools/check.sh` runs it. |
| `codes.py` | Reads the codes a master sheet looks up out of its Links tab — the test uses it to hold the script to the workbooks. |
| `hub.py` | A session's way to read the script's Status tab (and `key()`, the code a name is filed under). |
| `fixtures/packages.json` | Both courses' package paths, so the test runs where the course repositories are not (CI). `node drive/test_windyhill.js <a7> <m7> --write-fixture`. |

## What the script does each hour

1. **Mirror.** Asks GitHub for each course repository's newest commit (one request each; if it is
   the commit already mirrored, nothing more). Otherwise lists `a7/packages` / `m7/packages` and
   the master sheet, and brings into **Windy Hill › From Claude** what is new or changed (by git
   blob sha), a few files at a time, stopping itself at 4½ minutes and carrying on a minute later
   until done. A file no longer published goes to the Drive trash. Its record is the **Mirror** tab.
2. **Consoles.** Every `… - All Slides.html` is also put in **Windy Hill › Apps**, where the panel
   opens it — unless he has his own file of that name there (then his stays, and Status says so).
3. **Live master sheets.** Each `… Master Sheet 2026-27.xlsx` is converted (Drive service) into a
   Google Sheet of the same name in Windy Hill, remade when a new one is published, **with his IXL
   ticks carried across** by lesson. The Status tab links to both.
4. **Live links.** Builds the list *code → Drive id* for everything the master sheets link and
   writes it into each live sheet's hidden **Drive** tab. The sheets' link cells look their
   address up there (the course tools write them as formulas — see each course's
   `tools/master_sheet.py`, "links"), so a link always opens what is in Drive now. No session is
   involved when a file changes.
5. **His version wins.** A file in **Windy Hill › My versions** with the same name as a published
   document takes that document's code: the links open his. If a newer version is published after
   he saved his, his still opens **and the Status tab and the My files tab say so in capitals** —
   a correction of ours must never be silently hidden behind an older copy of his. A file he edits
   in place inside From Claude is recognised (changed after it was put there) and never replaced.
   An old copy he once uploaded by hand somewhere else is ignored.
6. **His own files.** Everything in **Windy Hill › My files** and My versions is listed with links
   on the **My files** tab. On the master sheets, each lesson's row has "Everything for this
   lesson": a Drive search for `"M7 4.06"` — ours, his copies, and anything of his own named that way.
7. **Looks after the mirror.** Each quiet run checks 120 files are still there; one he deleted comes
   back at the next run.

Nothing of his is ever changed, moved or deleted: the script trashes only files it created
itself and that he has not edited. The GitHub token sits in his account's private script
properties — never in a sheet, a log, a file's description, or this repository.

## The code a document is filed under

`"k"` + the first 12 hex digits of `MD5(name)` (UTF-8, NFC). A document is filed under its **file
name** when it is named for its course (`"M7 …"`) and no other package file shares the name; a
unit's folder under its name; and whatever sits directly inside a unit folder also under
`"<unit folder>/<name>"` — how `00 - START HERE.md` and `Lessons`, names every unit has, are told
apart. A bare name (`2.01`, both courses have one) is never a code. Three implementations must
agree — `key_()` in the script, `key()`/`filed()` in each course's generator, `filed()`/`codes_of()`
in each course's check — and the test holds them to each other through the real workbooks.

## His one-time setup (he was sent these steps with the script)

Open the spreadsheet › Extensions › Apps Script › paste › Save · Services **+** › Drive API › Add ·
run `setup` and approve · reload the sheet › Windy Hill › Set the GitHub token… (a fine-grained
token, *Only select repositories*: `windy-hill-m7`, `croix18-windy-hill-a7`; *Contents: Read-only*).
**The token goes into that dialog only. If he pastes one into a chat, do not use it; tell him to
revoke it.**

## What a session does now

- **To publish anything** — a rebuilt unit, a moved plan, a new master sheet: commit and push the
  course repository, as always. It is in his Drive within the hour. Nothing to send, nothing for
  him to upload. (Sending the files in the chat as well is still kind: he sees them at once.)
- **To see how his Drive stands**: `download_file_content` on the hub (CSV), then
  `python3 drive/hub.py status <this session's transcript .jsonl>`. `State` is `up to date`,
  `copying — N files still to come`, or `NEEDS A LOOK` with `PROBLEM` lines (a token refused or
  expired, the Drive service off, GitHub unreachable). `A NEWER VERSION IS PUBLISHED` lines name
  documents where his own copy is hiding a newer one of ours — **if that newer one fixed an error,
  tell him**.
- **If the script must change**: edit `WindyHill.gs`, run the test, push, and send him the file to
  paste over the old one. Bump `VERSION`.

## What to know before trusting it

- **The script has never run against Google or GitHub from a session** — there is no way to. The
  stand-in proves the logic (1,219 checks; 24 ways of breaking the script, each noticed). The first
  real run proves the rest; if it throws, the Apps Script editor shows the line and the Status tab
  the message.
- Likeliest surprises, in order: the Drive service's `Files.create` conversion (v3) or
  `Files.insert` (v2) — both are written; Google's limits on creating ~900 files in a day (the
  sync just carries on the next hour); a GitHub token made without *Contents: Read*.
- The first copy is about 250 MB (eight units) and grows to perhaps 1 GB by May. A replaced file
  sits in his Drive trash for 30 days.
- The `.xlsx` copies of the master sheets (in the repository, in the mirror, or sent in a chat)
  have an empty Drive tab: every link in them is its fallback, the search by exact title. Only the
  Google Sheets the script makes are live.
