# drive/ — Croix's Google Drive, kept by a script in his own account

Four things Croix said on 4 October 2026, in order:

1. *"Anyway to link them to each other inside of the Google drive? I don't get access to GitHub at
   school and would like to be able to quickly pull up the stuff I need."*
2. *"This is the most efficient way of doing this? So if I have to change something, you have to
   rebuild it? Can I set up a file that you can somehow manage? I'd put all of the stuff I need to
   in there."*
3. Asked how automatic: **"Fully automatic"**. Asked what "change something" means, he ticked all
   four: *I edit the documents · I add my own files · The plan moves · You rebuild a unit.*
4. *"Ok, fix anything that needs fixing. Move anything that needs moving. Make sure that script is
   premiumly built. When done, give me a fresh set of instructions on what I need to do on my end."*
   — which is version 3 of the script, below.

## Which Drive, and what a session can do in it (measured 4 October, late)

His files live in **`Windy Hill Master Folder`** (id `1wodkpowCt32TQY_kiTpmcO4sn0Yh3Prb`), owned by
his personal account. That evening he made a separate Google account — *"Mrshaffermath@gmail.com
to handle all of this"* — pointed Claude's Drive connector at it, and shared the master folder with
it as an editor (his school account is an editor too). *"I set it up for you to be able to have
access to everything."*

What is in the master folder now:

| Folder | id | Whose |
|---|---|---|
| `From Claude` | `1UyiZP-_ewoIrdHoJeDLTc8JTy6pigwi8` | the script's: everything published, mirrored |
| `My versions` | `1Zr6-mPDqRCHg4GV_UXbOYtbCHoFNqerw` | his edited copies; same file name → the links open his |
| `My files` | `1Q__F4NHSaGE-KIgnxNMXt_VWgJzS4qmO` | anything else of his; listed on the hub's My files tab |
| `Apps` | `1neOc4-3gWy4n7gqU-V6thv5v0YMTgylb` | Deckhand, Tally, Cadence, Jeopardy, the consoles, **the hub spreadsheet** |
| `A7`, `M7`, `Latest` | | his September uploads (old file names). **His only Drive copies until the script has run** — leave them; once the mirror is verified, offer to move them into an `Archive` folder |
| `Modified`, `Pictures`, `MathNation`, loose files | | his miscellany — not ours to touch |

The three folders in the first rows were made by a session through the connector (4 Oct), so they
exist before the script first runs; the script finds them by name.

**What the connector can do there — each of these was tried:** see everything shared with that
account (`search_files` with `parentId = '<folder id>'`); read a file it did not create; create a
folder or a small file; move or rename **when he has asked for it**.

**What it cannot do:** carry a document (a file travels inside the call as text a session writes
out; the packages are 250 MB); change a file's contents; move, rename or trash without his asking
(a session's safety layer refuses an "unrequested commit in a connected app" — he then said "I
request for you to move it" and the same call went through).

*Correction to what was written here earlier the same night:* the first tests, made while the
connector pointed at his personal account, returned nothing for his own files, and that was
recorded as "the connector sees only files it created". It does not hold for this connection.
(The first hub spreadsheet, `18TJhEm…`, in his personal account, is orphaned and his to delete.)

**So: what a session manages is GitHub; what manages his Drive is the script; and a session can
look at the result directly instead of asking him.**

## The pieces

| | |
|---|---|
| `WindyHill.gs` | The script, **version 3**. It lives in the spreadsheet **"Windy Hill Drive Index"** (id `1JMjbk7-wjv0MozXuJKJIZ_vOomcztJgAPu5Tr-Z7Uts`, owned by mrshaffermath@…, in the master folder's `Apps`) — he pastes it into Extensions › Apps Script once. It runs every hour as that account. |
| `test_windyhill.js` | The script run end to end against stand-ins for Drive, Sheets, the Drive service, mail, triggers, the clock and GitHub (which serves what the two course repositories really publish). `tools/check.sh` runs it. `WINDYHILL_GS=<file>` runs it on another copy of the script (how its sensitivity is measured: break the script, see the test notice). |
| `mutations.py` | Breaks the script one line at a time, in every way listed there, and requires the test to notice each. Slow (ten minutes); run it after changing the script or the test. |
| `codes.py` | Reads the codes a master sheet looks up out of its Links tab — the test uses it to hold the script to the workbooks. |
| `hub.py` | A session's way to read the script's Status tab (and `key()`, the code a name is filed under). |
| `fixtures/packages.json` | Both courses' package paths, so the test runs where the course repositories are not (CI). `node drive/test_windyhill.js <a7> <m7> --write-fixture`. |

## What the script does each hour

1. **Mirror.** Asks GitHub for each course repository's newest commit (one request each; if it is
   the commit already mirrored, nothing more). Otherwise lists `a7/packages` / `m7/packages` and
   the master sheet, and brings into **From Claude** what is new or changed (by git blob sha), a
   few files at a time, stopping itself at 4½ minutes and carrying on a minute later until done.
   **Every download is held to its git name** — the SHA-1 GitHub lists for it — before it is put
   in Drive; one that arrives damaged is not stored. A file no longer published goes to the trash;
   a unit folder left empty goes with it. Its record is the hidden **Mirror** tab.
2. **Consoles.** Every `… - All Slides.html` is also put in **Apps**, where the panel opens it.
3. **Live master sheets.** Each `… Master Sheet 2026-27.xlsx` becomes a Google Sheet of the same
   name in the master folder. When a new one is published **the same Google Sheet gets the new
   contents** (Drive service `Files.update`), so its address and his bookmark stay; his IXL ticks
   (the yellow columns H, I, K) are put by on the hidden **Kept** tab first — and every hour — and
   written back by lesson. If Google will not replace a sheet's contents, a new sheet is made and
   the old one binned (and it does not try again until "Check everything").
4. **Live links.** Builds the list *code → Drive id* for everything the master sheets link and
   writes it into each live sheet's hidden **Drive** tab, whenever the list changes or the tab is
   not as it was left. The sheets' link cells look their address up there.
5. **His version wins.**
   - A file in **My versions** with a published document's name takes that document's code (a
     Google Slides / Docs / Sheets copy stands for the `.pptx` / `.docx` / `.xlsx`). If a newer
     version is then published, his still opens **and Status says so in capitals**.
   - A file he **edits in place** inside From Claude is recognised by its fingerprint (MD5, not
     just its date) and never replaced.
   - A file he **moves** out of From Claude is his from then on and never binned; the published
     one is put back where it belongs.
   - A file **of his own in a published one's place** (same folder, same name, other contents) is
     left alone; the links open his; Status names it.
   - A copy that is **byte for byte the published file** — one he uploaded by hand — counts as
     the published file: it is taken on, not doubled, and replaced by the next edition. (His
     account owns it and this one cannot bin it: it is renamed `OLD - …` and he is told.)
6. **His own files.** Everything in **My files** and My versions is on the **My files** tab, with
   whether the links use it.
7. **Looks after itself.**
   - 120 files an hour are checked for still being there (all of them at once: menu *Check
     everything*); one he deleted comes back.
   - Every file carries, in its Drive description, the repository, git name and MD5 it was made
     from. **If the record is lost, or a run is stopped half way, the next run reads those and
     takes the files on** — nothing is downloaded twice, nothing exists twice.
   - A passing fault at GitHub is retried; GitHub's or Google's allowance running out is a
     *pause*, not a problem; a full Google account, a refused token, a missing Drive service are
     **PROBLEM** lines that say what to do.
8. **Tells him.** **Status** (first tab; coloured: green, amber, red): State, PROBLEM, DO SOON (the
   token's expiry within two weeks, a nearly full account, the hourly sync off), what was copied,
   links to the live sheets. **Activity**: a log, newest first, 400 lines. **Email**, if he turns
   it on in the menu: when something has needed a look for most of an hour, at most once in six
   hours, once more when it is well again.

The menu **Windy Hill**: Sync now · Check everything (slower) · Set the GitHub token… · Forget the
GitHub token · Email me when something needs a look… · Sync every hour (turn on) · Stop the hourly
sync · About.

Nothing he wrote is ever changed, moved or deleted. The GitHub token sits in that account's
private script properties — never in a sheet, a log, an email, a dialog, a file's description, or
this repository (the test looks in all of them).

## The code a document is filed under

`"k"` + the first 12 hex digits of `MD5(name)` (UTF-8, NFC). A document is filed under its **file
name** when it is named for its course (`"M7 …"`) and no other package file shares the name; a
unit's folder under its name; and whatever sits directly inside a unit folder also under
`"<unit folder>/<name>"` — how `00 - START HERE.md` and `Lessons`, names every unit has, are told
apart. A bare name (`2.01`, both courses have one) is never a code. Three implementations must
agree — `key_()` in the script, `key()`/`filed()` in each course's generator, `filed()`/`codes_of()`
in each course's check — and the test holds them to each other through the real workbooks.

## His one-time setup (he was sent these steps with the script, 4 Oct)

On a laptop, signed in as mrshaffermath@…: open **Windy Hill Drive Index** (master folder › Apps) ›
Extensions › Apps Script › paste › Save · Services **+** › Drive API › Add · run `setup` and approve ·
reload the sheet › Windy Hill › Set the GitHub token… (a fine-grained token, *Only select
repositories*: `windy-hill-m7`, `croix18-windy-hill-a7`; *Contents: Read-only*) · optionally Windy
Hill › Email me….
**The token goes into that dialog only. If he pastes one into a chat, do not use it; tell him to
revoke it.**

To give him a newer script: he pastes it over the old one and saves. Nothing else: files already
copied are recognised.

## What a session does now

- **To publish anything** — a rebuilt unit, a moved plan, a new master sheet: commit and push the
  course repository, as always. It is in his Drive within the hour. Nothing to send, nothing for
  him to upload. (Sending the files in the chat as well is still kind: he sees them at once.)
- **To see how his Drive stands**: list `From Claude` (`search_files`, `parentId = '1UyiZP-…'`) —
  or `download_file_content` on the hub (CSV), then
  `python3 drive/hub.py status <this session's transcript .jsonl>`. `State` is `up to date`,
  `copying — N files still to come`, `finishing — one more run in a minute`, `paused — …`, or
  `NEEDS A LOOK` with `PROBLEM` lines. `A NEWER VERSION IS PUBLISHED` lines name documents where
  his own copy is hiding a newer one of ours — **if that newer one fixed an error, tell him**.
- **If the script must change**: edit `WindyHill.gs`, run the test, run `python3 drive/mutations.py`,
  push, and send him the file to paste over the old one. Bump `VERSION`.
  (`FORMAT` is the Drive tab's, which the course tools write as `v2`: change it only with them.)

## What to know before trusting it

- **The script has never run against Google or GitHub** — a session has no way to. The stand-ins
  prove the logic (the test's last line gives the count of checks; `mutations.py` the ways of
  breaking the script that it notices). The first real run proves the rest; if it throws, the
  Apps Script editor shows the line and the Status tab the message.
- **What the stand-ins assume and Google may not do**, likeliest first:
  1. `Drive.Files.update` replacing a Google Sheet's contents from `.xlsx` bytes. The script marks
     the sheet first (cell E1 of its Drive tab) and looks afterwards whether the mark is gone; if
     it is still there a run later, it makes a new sheet instead and stops trying. So the worst
     case is version 2's behaviour: the live sheet's address changes with each new master sheet.
  2. The byte arrays `UrlFetchApp` returns behaving as JavaScript arrays (`head.concat(bytes)` in
     `gitSha_`). If they do not, every download reads as "arrived damaged" and nothing is copied:
     eight PROBLEM lines saying so on the first run.
  3. Only a file's owner being able to bin it (so his own uploads are renamed, not binned). If an
     editor can bin them after all, exact copies he uploaded go to *his* trash when replaced.
  4. Google's daily allowances for a consumer account (90 minutes of triggered runtime; creating
     ~900 files): the first copy may spread over two days. It says "paused" and carries on.
  5. `title:"…"` Drive searches — the fallback every link has while the Drive tab is empty.
- The first copy is about 250 MB (eight units) and grows to perhaps 1 GB by May, in a 15 GB
  account. A replaced file sits in the Drive trash for 30 days and counts until then; Status warns
  at 85 % full.
- The `.xlsx` copies of the master sheets (in the repository, in the mirror, or sent in a chat)
  have an empty Drive tab: every link in them is its fallback, the search by exact title. Only the
  Google Sheets the script makes are live. In a live sheet only the IXL tracker's yellow cells are
  his to type in: anything else he types there is gone with the next master sheet (Google's
  version history has it).
- **As of 4 October there are no consoles and no master sheets in his Drive at all** — only
  September's copies under their old names. Until he sets the script up, he uploads as before.
