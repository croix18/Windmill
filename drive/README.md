# drive/ — Croix's Google Drive, kept by a script in his own account

Three things Croix said on 4 October 2026, in order:

1. *"Anyway to link them to each other inside of the Google drive? I don't get access to GitHub at
   school and would like to be able to quickly pull up the stuff I need."*
2. *"This is the most efficient way of doing this? So if I have to change something, you have to
   rebuild it? Can I set up a file that you can somehow manage? I'd put all of the stuff I need to
   in there."*
3. Asked how automatic: **"Fully automatic"**. Asked what "change something" means, he ticked all
   four: *I edit the documents · I add my own files · The plan moves · You rebuild a unit.*

## Which Drive, and what a session can do in it (measured 4 October, late)

His files live in **`Windy Hill Master Folder`** (id `1wodkpowCt32TQY_kiTpmcO4sn0Yh3Prb`), owned by
his personal account, with `M7`, `A7`, `Apps` (id `1neOc4-3gWy4n7gqU-V6thv5v0YMTgylb` — Deckhand,
Tally, Cadence, the consoles), `Latest`, `Modified`, `Pictures`, `MathNation`. That evening he made
a separate Google account — *"Mrshaffermath@gmail.com to handle all of this"* — pointed Claude's
Drive connector at it, and shared the master folder with it as an editor (his school account is an
editor too). *"I set it up for you to be able to have access to everything."*

**What the connector can do there — each of these was tried:**

- **See everything** shared with that account: every folder and file, with id, owner, size and
  dates (`search_files` with `parentId = '<folder id>'`; `list_recent_files`).
- **Read** a file it did not create (`read_file_content` gave the text of a PDF in `Modified`).
- **Create** a folder or a small file anywhere he has edit rights (`From Claude`, id
  `1UyiZP-_ewoIrdHoJeDLTc8JTy6pigwi8`, was made in the master folder as the test), and read it back.

**What it cannot do:**

- **Carry a document.** `create_file` takes the whole file inside the call, as text a session has to
  write out. A 300 KB PDF is roughly a quarter of a million tokens, twice (read, then written), and
  must be reproduced exactly. Both courses' packages are 250 MB. A session cannot upload them.
- **Change a file's contents** once made (`update_file` is title and folder only; there is no
  Sheets or Docs editor connector in his sessions).
- **Move, rename or trash without his asking.** The tools exist, but a session's safety layer
  refused to move the hub spreadsheet into `Apps` as an "unrequested commit in a connected app".
  Tidying his Drive needs his explicit request, each time.

*Correction to what was written here earlier the same night:* the first tests, made while the
connector pointed at his personal account, returned nothing for his own files, and that was
recorded as "the connector sees only files it created". Whatever limited that connection, it does
not hold for this one. (The first hub spreadsheet, `18TJhEm…`, in his personal account, is
orphaned and his to delete.)

**What follows.** A session can now *look*: what is in his Drive, whether the script has done its
work, which copy of a file he edited. It still cannot *deliver*: documents reach his Drive through
the script below (or his own uploads). What a session manages is GitHub; what manages his Drive is
the script; and a session can check the result directly instead of asking him.

**So the manager is a script in his account, and GitHub is the place a session manages.**

## The pieces

| | |
|---|---|
| `WindyHill.gs` | The script. It lives in the spreadsheet **"Windy Hill Drive Index"** (id `1JMjbk7-wjv0MozXuJKJIZ_vOomcztJgAPu5Tr-Z7Uts`, in the My Drive of the new account, mrshaffermath@…) and works inside the master folder, which it finds by id — he pastes it into Extensions › Apps Script once. It runs every hour as him. |
| `test_windyhill.js` | The script run end to end against stand-ins for Drive, Sheets, the Drive service, triggers, the clock and GitHub (which serves what the two course repositories really publish). `tools/check.sh` runs it. |
| `codes.py` | Reads the codes a master sheet looks up out of its Links tab — the test uses it to hold the script to the workbooks. |
| `hub.py` | A session's way to read the script's Status tab (and `key()`, the code a name is filed under). |
| `fixtures/packages.json` | Both courses' package paths, so the test runs where the course repositories are not (CI). `node drive/test_windyhill.js <a7> <m7> --write-fixture`. |

## What the script does each hour

1. **Mirror.** Asks GitHub for each course repository's newest commit (one request each; if it is
   the commit already mirrored, nothing more). Otherwise lists `a7/packages` / `m7/packages` and
   the master sheet, and brings into **Windy Hill Master Folder › From Claude** what is new or changed (by git
   blob sha), a few files at a time, stopping itself at 4½ minutes and carrying on a minute later
   until done. A file no longer published goes to the Drive trash. Its record is the **Mirror** tab.
2. **Consoles.** Every `… - All Slides.html` is also put in the master folder's **Apps**, where the panel
   opens it — unless he has his own file of that name there (then his stays, and Status says so).
3. **Live master sheets.** Each `… Master Sheet 2026-27.xlsx` is converted (Drive service) into a
   Google Sheet of the same name in the master folder, remade when a new one is published, **with his IXL
   ticks carried across** by lesson. The Status tab links to both.
4. **Live links.** Builds the list *code → Drive id* for everything the master sheets link and
   writes it into each live sheet's hidden **Drive** tab. The sheets' link cells look their
   address up there (the course tools write them as formulas — see each course's
   `tools/master_sheet.py`, "links"), so a link always opens what is in Drive now. No session is
   involved when a file changes.
5. **His version wins.** A file in **My versions** (in the master folder) with the same name as a published
   document takes that document's code: the links open his. If a newer version is published after
   he saved his, his still opens **and the Status tab and the My files tab say so in capitals** —
   a correction of ours must never be silently hidden behind an older copy of his. A file he edits
   in place inside From Claude is recognised (changed after it was put there) and never replaced.
   An old copy he once uploaded by hand somewhere else is ignored.
6. **His own files.** Everything in **My files** and My versions is listed with links
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
- **To see how his Drive stands**: list `From Claude` (`search_files`, `parentId = '1UyiZP-_ewoIrdHoJeDLTc8JTy6pigwi8'`) —
  or `download_file_content` on the hub (CSV), then
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
