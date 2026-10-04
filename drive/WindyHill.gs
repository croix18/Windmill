/**
 * Windy Hill — the Drive side (version 2, 4 October 2026)
 *
 * WHAT IT DOES, every hour, in your own Google account
 * 1. Copies everything Claude has published for A7 and M7 — the unit folders with their slides,
 *    Teacher Editions, lesson plans, handouts, tests and keys, the consoles, and the two master
 *    sheets — from the private GitHub repositories into Windy Hill Master Folder > From Claude. Only what has
 *    changed since the last run. You upload nothing.
 * 2. Puts each console (… - All Slides.html) in the master folder's Apps as well, where the panel opens it.
 * 3. Turns each master sheet into a Google Sheet in the master folder, and keeps its links
 *    live: every link opens the document that is in your Drive right now.
 * 4. Prefers YOUR copy. Save an edited document under the same file name in the master folder's My
 *    versions and the links open yours. A document you edit in place inside From Claude is left
 *    alone from then on. Nothing of yours is ever changed, moved or deleted.
 * 5. Lists whatever you keep in the master folder's My files and My versions on the "My files" tab.
 *
 * WHAT IT TOUCHES
 * It creates, replaces and removes only the files it made itself (they are listed on the Mirror
 * tab). A replaced file goes to the Drive trash, where it stays for 30 days. It reads your GitHub
 * token from your own account's private settings; the token never appears in a sheet or a log.
 * Google's permission screen asks for all of Drive and for "connect to an external service"
 * (GitHub): a script that files documents for you cannot ask for less.
 *
 * SET IT UP ONCE (on a laptop, signed in as the Google account made for this, which the master folder is shared with)
 * 1. Open the spreadsheet "Windy Hill Drive Index" in that account's My Drive. Menu Extensions > Apps Script.
 * 2. Delete whatever is in the editor, paste this whole file, press Save (the disk icon).
 * 3. On the left, next to "Services", press +. Choose "Drive API", press Add.
 * 4. In the bar above the code pick "setup" in the list of functions, press Run, and approve:
 *    Review permissions > your account > Advanced > "Go to … (unsafe)" > Allow. (Google says
 *    "unsafe" of every script it has not reviewed, your own included.)
 * 5. Back in the spreadsheet, reload the page. Menu Windy Hill > Set the GitHub token… and paste
 *    a token made like this: github.com > your picture > Settings > Developer settings > Personal
 *    access tokens > Fine-grained tokens > Generate new token. Repository access: "Only select
 *    repositories" > windy-hill-m7 and croix18-windy-hill-a7. Permissions > Repository
 *    permissions > Contents: Read-only. Expiration: the longest it offers. Paste it ONLY into
 *    that box — never into a chat.
 * The first copy is about 250 MB and takes several runs; the script carries on by itself every
 * minute until it is done, then once an hour. The Status tab says where it is.
 */

var VERSION = 2;
var OWNER = 'croix18';
var REPOS = [
  { course: 'A7', repo: 'croix18-windy-hill-a7', packages: 'a7/packages', sheetDir: 'a7/reference', sheet: 'A7 Master Sheet 2026-27.xlsx' },
  { course: 'M7', repo: 'windy-hill-m7', packages: 'm7/packages', sheetDir: 'm7/reference', sheet: 'M7 Master Sheet 2026-27.xlsx' }
];
var HOME_ID = '1wodkpowCt32TQY_kiTpmcO4sn0Yh3Prb';   // your Windy Hill Master Folder (the one shared with this account)
var HOME = 'Windy Hill Master Folder';   // … found by this name if that address ever changes
var MIRROR = 'From Claude';              // everything published, copied here; this script's to manage
var MINE = 'My versions';                // your edited copies: the same file name, and the links open yours
var EXTRA = 'My files';                  // anything else of yours; listed on the "My files" tab
var APPS = 'Apps';                       // where the panel opens the consoles from
var CONSOLE = / - All Slides\.html$/;
var BUDGET_MS = 4.5 * 60 * 1000;         // a run stops itself here (Google stops it at 6 minutes) and carries on in the next
var BATCH_BYTES = 12 * 1024 * 1024, BATCH_FILES = 8;
var AUDIT = 120;                         // files looked at per run to see that they are still there
var SHEETS = 'application/vnd.google-apps.spreadsheet';
var MIME = {
  pdf: 'application/pdf', html: 'text/html', md: 'text/markdown', txt: 'text/plain', csv: 'text/csv', json: 'application/json',
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', svg: 'image/svg+xml', zip: 'application/zip',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
};
var COLS = ['path', 'sha', 'id', 'kind', 'size', 'changed', 'state', 'repo'];   // the Mirror tab

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Windy Hill')
    .addItem('Sync now', 'sync')
    .addItem('Set the GitHub token…', 'setToken')
    .addSeparator()
    .addItem('Sync every hour (turn on)', 'everyHour')
    .addItem('Stop the hourly sync', 'stopHourly')
    .addToUi();
}

/** Run once from the editor: asks for permission, makes the folders, turns the hourly sync on. */
function setup() {
  var home = home_();
  [MIRROR, MINE, EXTRA, APPS].forEach(function (n) { child_(home, n); });
  everyHour();
  sync();
}

function setToken() {
  var ui = SpreadsheetApp.getUi();
  var r = ui.prompt('GitHub token', 'Paste the fine-grained token (read-only, the two course repositories). It is kept in your own account\'s private settings.', ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  var t = r.getResponseText().replace(/\s+/g, '');
  if (!/^(github_pat_|ghp_)[A-Za-z0-9_]{20,}$/.test(t)) { ui.alert('That does not look like a GitHub token (it starts github_pat_). Nothing was saved.'); return; }
  PropertiesService.getUserProperties().setProperty('GITHUB_TOKEN', t);
  var seen = REPOS.map(function (R) { return R.repo + ': ' + (head_(R, t).sha ? 'can be read' : 'CANNOT be read'); }).join('\n');
  ui.alert('Saved.\n\n' + seen + '\n\nThe first sync starts now and carries on by itself.');
  more_();
}

function everyHour() {
  stopHourly();
  ScriptApp.newTrigger('sync').timeBased().everyHours(1).create();
}

function stopHourly() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'sync') ScriptApp.deleteTrigger(t); });
}

/** The run that carries a long sync on (its own name, so the hourly trigger is never mistaken for it). */
function syncMore() { sync(); }

function more_() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'syncMore') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('syncMore').timeBased().after(60 * 1000).create();
}

// ------------------------------------------------------------------------------------------ small things

/** The code a name is filed under: "k" + the first 12 hex digits of the MD5 of the name. */
function key_(name) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, String(name).normalize('NFC'), Utilities.Charset.UTF_8);
  var hex = 'k';
  for (var i = 0; i < 6; i++) {
    var b = bytes[i] & 0xff;                    // the digest comes back as signed bytes
    hex += (b < 16 ? '0' : '') + b.toString(16);
  }
  return hex;
}

function iso_(ms) { return Utilities.formatDate(new Date(ms), 'UTC', "yyyy-MM-dd'T'HH:mm'Z'"); }

function live_(f) { try { return f && !f.isTrashed(); } catch (e) { return false; } }

function file_(id) { try { var f = DriveApp.getFileById(id); return f.isTrashed() ? null : f; } catch (e) { return null; } }

/** Your Windy Hill Master Folder: by its address; failing that, the folder of that name that is not in the trash (with an Apps folder in it, if there are several). */
function home_() {
  try { var known = DriveApp.getFolderById(HOME_ID); if (!known.isTrashed()) return known; } catch (e) { /* not shared with this account, or gone: look for it by name */ }
  var it = DriveApp.getFoldersByName(HOME), all = [];
  while (it.hasNext()) { var f = it.next(); if (!f.isTrashed()) all.push(f); }
  for (var i = 0; i < all.length; i++) if (all[i].getFoldersByName(APPS).hasNext()) return all[i];
  return all.length ? all[0] : DriveApp.createFolder(HOME);
}

/** The folder of that name inside a folder; made if it is not there. */
function child_(parent, name) {
  var it = parent.getFoldersByName(name);
  while (it.hasNext()) { var f = it.next(); if (!f.isTrashed()) return f; }
  return parent.createFolder(name);
}

function sheet_(ss, name, position) {
  var sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name, position);
  return sh;
}

/** Rows of text into a tab, as plain text: a code or an address is never read as a number. */
function write_(sh, rows, width) {
  sh.clearContents();
  if (sh.getMaxRows() < rows.length) sh.insertRowsAfter(sh.getMaxRows(), rows.length - sh.getMaxRows());
  if (sh.getMaxColumns() < width) sh.insertColumnsAfter(sh.getMaxColumns(), width - sh.getMaxColumns());
  var range = sh.getRange(1, 1, rows.length, width);
  range.setNumberFormat('@');
  range.setValues(rows.map(function (r) { r = r.slice(); while (r.length < width) r.push(''); return r.map(function (v) { return v === null || v === undefined ? '' : String(v); }); }));
}

// ------------------------------------------------------------------------------------------ the Mirror tab

function readState_(ss) {
  var sh = ss.getSheetByName('Mirror'), state = {};
  if (!sh || sh.getLastRow() < 2) return state;
  sh.getRange(2, 1, sh.getLastRow() - 1, COLS.length).getValues().forEach(function (r) {
    if (!r[0]) return;
    state[String(r[0])] = { sha: String(r[1]), id: String(r[2]), kind: String(r[3]), size: Number(r[4]) || 0, changed: Number(r[5]) || 0, state: String(r[6]) || 'ok', repo: String(r[7]) };
  });
  return state;
}

function writeState_(ss, state) {
  var rows = [COLS];
  Object.keys(state).sort().forEach(function (p) { var s = state[p]; rows.push([p, s.sha, s.id, s.kind, s.size, s.changed, s.state, s.repo]); });
  write_(sheet_(ss, 'Mirror', 3), rows, COLS.length);
}

// ------------------------------------------------------------------------------------------ GitHub

function gh_(path, token, accept) {
  return { url: 'https://api.github.com' + path, headers: { Authorization: 'Bearer ' + token, Accept: accept || 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' }, muteHttpExceptions: true };
}

function get_(path, token, accept) {
  var q = gh_(path, token, accept);
  return UrlFetchApp.fetch(q.url, q);
}

function why_(code) {
  return code === 401 ? 'GitHub refused the token (wrong, or expired): set a new one' :
         code === 403 ? 'GitHub refused the request (the token lacks Contents: Read, or too many requests this hour)' :
         code === 404 ? 'the token cannot see this repository: add it under "Only select repositories"' : 'GitHub answered ' + code;
}

/** {sha} of the newest commit, or {error}. */
function head_(R, token) {
  var res = get_('/repos/' + OWNER + '/' + R.repo + '/commits/main', token, 'application/vnd.github.sha');
  var code = res.getResponseCode(), text = res.getContentText().replace(/\s+/g, '');
  return code === 200 && /^[0-9a-f]{40}$/.test(text) ? { sha: text } : { error: why_(code) };
}

function json_(path, token) {
  var res = get_(path, token);
  if (res.getResponseCode() !== 200) throw new Error(why_(res.getResponseCode()) + ' (' + path.split('?')[0] + ')');
  return JSON.parse(res.getContentText());
}

/** What the repository publishes at this commit: {mirror path: {sha, size}}. */
function published_(R, head, token) {
  var want = {}, base = '/repos/' + OWNER + '/' + R.repo;
  var up = R.packages.split('/'), leaf = up.pop();
  var dir = json_(base + '/contents/' + up.map(encodeURIComponent).join('/') + '?ref=' + head, token).filter(function (e) { return e.name === leaf && e.type === 'dir'; })[0];
  if (!dir) throw new Error(R.repo + ' has no ' + R.packages);
  var tree = json_(base + '/git/trees/' + dir.sha + '?recursive=1', token);
  if (tree.truncated) throw new Error(R.repo + ': GitHub cut the list of files short');
  tree.tree.forEach(function (e) {
    if (e.type !== 'blob') return;
    want[R.course + '/' + e.path] = { sha: e.sha, size: e.size || 0 };
    if (CONSOLE.test(e.path)) want['Apps:' + e.path.split('/').pop()] = { sha: e.sha, size: e.size || 0 };
  });
  var sheet = json_(base + '/contents/' + R.sheetDir.split('/').map(encodeURIComponent).join('/') + '?ref=' + head, token).filter(function (e) { return e.name === R.sheet; })[0];
  if (sheet) want[R.sheet] = { sha: sheet.sha, size: sheet.size || 0 };
  return want;
}

// ------------------------------------------------------------------------------------------ the sync

function sync() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(3000)) return;                                   // another run is at it
  var ss = SpreadsheetApp.getActiveSpreadsheet(), started = Date.now();
  var props = PropertiesService.getUserProperties(), token = props.getProperty('GITHUB_TOKEN');
  var state = readState_(ss), note = { errors: [], put: 0, removed: 0, waiting: 0, heads: {}, restored: 0 };
  var left = function () { return BUDGET_MS - (Date.now() - started); };
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'syncMore') ScriptApp.deleteTrigger(t); });
  try {
    var home = home_(), mirror = child_(home, MIRROR), mine = child_(home, MINE), extra = child_(home, EXTRA), apps = child_(home, APPS);
    var folders = { '': mirror };
    if (!token) note.errors.push('No GitHub token yet: menu Windy Hill > Set the GitHub token…');
    else REPOS.forEach(function (R) { try { pull_(R, token, state, folders, apps, note, left, props); } catch (e) { note.errors.push(R.course + ': ' + e.message); } });
    if (left() > 60000 && !note.waiting) audit_(state, props, note, left);
    var masters = REPOS.map(function (R) { try { return master_(R, state, home, note); } catch (e) { note.errors.push(R.course + ' master sheet: ' + e.message); return null; } });
    var tab = driveTab_(state, mine, note);
    tabs_(ss, state, tab, masters, mine, extra, note, started);
  } catch (e) {
    note.errors.push(String(e && e.message || e));
    try { status_(ss, state, null, [], note, started); } catch (e2) { /* the spreadsheet itself is the trouble */ }
  } finally {
    try { writeState_(ss, state); } catch (e3) { /* nothing more can be done */ }
    if (note.waiting) more_();
    lock.releaseLock();
  }
}

/** Bring one repository's published files into the mirror, as far as this run's time allows. */
function pull_(R, token, state, folders, apps, note, left, props) {
  var head = head_(R, token);
  if (head.error) throw new Error(head.error);
  note.heads[R.course] = head.sha;
  var mineOf = function (p) { return state[p].repo === R.repo; };
  var done = props.getProperty('head:' + R.repo) === head.sha;
  // your own console in Apps, once you delete it, makes room for the published one
  Object.keys(state).forEach(function (p) { if (mineOf(p) && state[p].kind === 'theirs' && !file_(state[p].id)) state[p].state = 'gone'; });
  var missing = Object.keys(state).some(function (p) { return mineOf(p) && state[p].state === 'gone'; });
  if (done && !missing) return;
  var want = published_(R, head.sha, token);

  // what is no longer published goes (unless you edited it)
  Object.keys(state).forEach(function (p) {
    var s = state[p];
    if (!mineOf(p) || s.kind !== 'file' || want[p]) return;
    var f = file_(s.id);
    if (s.state.indexOf('yours') === 0 && f) { s.state = 'yours-unpublished'; return; }
    if (f && f.getLastUpdated().getTime() > s.changed + 2000) { s.state = 'yours-unpublished'; return; }   // you edited it: it stays
    if (f) f.setTrashed(true);
    delete state[p]; note.removed++;
  });

  // what is new or changed comes in, in batches
  var todo = Object.keys(want).filter(function (p) { return !state[p] || state[p].state === 'gone' || state[p].sha !== want[p].sha; }).sort();
  var i = 0;
  while (i < todo.length) {
    if (left() < 45000) break;
    var batch = [], bytes = 0;
    while (i < todo.length && batch.length < BATCH_FILES && (bytes + want[todo[i]].size <= BATCH_BYTES || !batch.length)) { batch.push(todo[i]); bytes += want[todo[i]].size; i++; }
    // a file you edited in place is yours: it is never replaced
    batch = batch.filter(function (p) {
      var s = state[p];
      if (!s) return true;
      var f = s.state === 'gone' ? null : file_(s.id);
      if (!f) { delete state[p]; return true; }                     // it is gone (you deleted it): the published one comes back
      if (s.kind === 'theirs') return false;                         // your own console in Apps: see below
      if (s.state.indexOf('yours') === 0 || f.getLastUpdated().getTime() > s.changed + 2000) { s.state = 'yours-behind'; return false; }
      return true;
    });
    // your own copy of a console in Apps is yours too: the script's is not put beside it
    batch = batch.filter(function (p) {
      if (p.indexOf('Apps:') !== 0 || state[p]) return true;
      var it = apps.getFilesByName(p.slice(5));
      while (it.hasNext()) {
        var f = it.next();
        if (!f.isTrashed()) { state[p] = { sha: '', id: f.getId(), kind: 'theirs', size: 0, changed: 0, state: 'yours', repo: R.repo }; return false; }
      }
      return true;
    });
    if (!batch.length) continue;
    var res = UrlFetchApp.fetchAll(batch.map(function (p) { return gh_('/repos/' + OWNER + '/' + R.repo + '/git/blobs/' + want[p].sha, token, 'application/vnd.github.raw+json'); }));
    batch.forEach(function (p, k) {
      if (res[k].getResponseCode() !== 200) { note.errors.push(p + ': ' + why_(res[k].getResponseCode())); return; }
      var name = p.split('/').pop().replace(/^Apps:/, ''), ext = name.split('.').pop().toLowerCase();
      var folder = p.indexOf('Apps:') === 0 ? apps : into_(folders, state, p.split('/').slice(0, -1), R);
      var f = folder.createFile(Utilities.newBlob(res[k].getContent(), MIME[ext] || 'application/octet-stream', name));
      f.setDescription('From Claude (' + R.repo + ' ' + want[p].sha.slice(0, 10) + '). To change it, save your copy under the same name in ' + MINE + '.');
      var old = state[p] && state[p].kind === 'file' && state[p].state !== 'gone' ? file_(state[p].id) : null;
      state[p] = { sha: want[p].sha, id: f.getId(), kind: 'file', size: want[p].size, changed: f.getLastUpdated().getTime(), state: 'ok', repo: R.repo };
      if (old) old.setTrashed(true);
      note.put++;
    });
  }
  note.waiting += todo.length - i;
  if (i >= todo.length && !note.errors.length) props.setProperty('head:' + R.repo, head.sha);
}

/** The mirror's folder for a path, made on the way down and remembered. */
function into_(folders, state, parts, R) {
  var path = '';
  for (var k = 0; k < parts.length; k++) {
    var next = path + parts[k] + '/';
    if (!folders[next]) {
      var s = state[next], f = null;
      if (s) { try { f = DriveApp.getFolderById(s.id); if (f.isTrashed()) f = null; } catch (e) { f = null; } }
      if (!f) f = child_(folders[path], parts[k]);
      folders[next] = f;
      state[next] = { sha: '', id: f.getId(), kind: 'folder', size: 0, changed: 0, state: 'ok', repo: R.repo };
    }
    path = next;
  }
  return folders[path];
}

/** A few files a run: is each still in Drive? One that was deleted is fetched again next time. */
function audit_(state, props, note, left) {
  var paths = Object.keys(state).filter(function (p) { return state[p].kind === 'file' && state[p].state !== 'gone'; }).sort();
  if (!paths.length) return;
  var at = Number(props.getProperty('audit') || 0) % paths.length;
  for (var n = 0; n < Math.min(AUDIT, paths.length) && left() > 45000; n++) {
    var p = paths[(at + n) % paths.length];
    if (!file_(state[p].id)) { state[p].state = 'gone'; note.restored++; }
  }
  props.setProperty('audit', String((at + n) % paths.length));
  if (note.restored) note.waiting += note.restored;
}

// ------------------------------------------------------------------------------------------ the live master sheets

/** xlsx bytes -> a Google Sheet, through the Drive service (step 3 of the setup). Returns its id. */
function convert_(blob, name, folderId) {
  if (typeof Drive === 'undefined') throw new Error('the Drive service is not turned on (setup step 3: Services + > Drive API > Add)');
  if (Drive.Files.create) return Drive.Files.create({ name: name, mimeType: SHEETS, parents: [folderId] }, blob).id;        // Drive API v3
  return Drive.Files.insert({ title: name, mimeType: SHEETS, parents: [{ id: folderId }] }, blob, { convert: true }).id;    // v2
}

/** The course's live Google Sheet, remade when a new master sheet has arrived. Returns {course, id} or null. */
function master_(R, state, home, note) {
  var src = state[R.sheet], key = 'live:' + R.course, cur = state[key];
  if (!src || src.state === 'gone') return cur && file_(cur.id) ? { course: R.course, id: cur.id } : null;
  if (cur && cur.sha === src.sha && file_(cur.id)) return { course: R.course, id: cur.id };
  var xlsx = file_(src.id);
  if (!xlsx) return null;
  var name = R.sheet.replace(/\.xlsx$/, '');
  var id = convert_(xlsx.getBlob().setContentType(MIME.xlsx), name, home.getId());
  var fresh = open_(id);
  var old = cur ? file_(cur.id) : null;
  if (old) {
    try { ticks_(SpreadsheetApp.openById(cur.id), fresh); } catch (e) { note.errors.push(R.course + ': your IXL ticks could not be carried over (' + e.message + '); the old sheet is in the trash'); }
    old.setTrashed(true);
  }
  state[key] = { sha: src.sha, id: id, kind: 'live', size: 0, changed: 0, state: 'ok', repo: R.repo };
  return { course: R.course, id: id };
}

/** A sheet that was converted a moment ago may need a moment before it opens. */
function open_(id) {
  for (var n = 0; ; n++) {
    try { return SpreadsheetApp.openById(id); } catch (e) { if (n >= 4) throw e; Utilities.sleep(3000); }
  }
}

/** Your marks in the IXL tracker (the yellow columns H, I and K), carried from the old sheet to the new by the lesson they sit on. */
function ticks_(from, to) {
  var a = from.getSheetByName('IXL tracker'), b = to.getSheetByName('IXL tracker');
  if (!a || !b || a.getLastRow() < 5 || b.getLastRow() < 5) return;
  var kept = {};
  a.getRange(5, 1, a.getLastRow() - 4, 11).getValues().forEach(function (r) {
    if (r[2] && (r[7] !== '' || r[8] !== '' || r[10] !== '')) kept[String(r[2])] = [r[7], r[8], r[10]];
  });
  b.getRange(5, 1, b.getLastRow() - 4, 11).getValues().forEach(function (r, k) {
    var t = kept[String(r[2])];
    if (!t) return;
    b.getRange(5 + k, 8, 1, 2).setValues([[t[0], t[1]]]);
    b.getRange(5 + k, 11).setValue(t[2]);
  });
}

// ------------------------------------------------------------------------------------------ the Drive tab

/** Every file in a folder and below it: [{name, id, changed, path}]. */
function walk_(folder, path, out) {
  var fi = folder.getFiles();
  while (fi.hasNext()) { var f = fi.next(); if (!f.isTrashed()) out.push({ name: f.getName(), id: f.getId(), changed: f.getLastUpdated().getTime(), path: path }); }
  var di = folder.getFolders();
  while (di.hasNext()) { var d = di.next(); if (!d.isTrashed()) walk_(d, path + '/' + d.getName(), out); }
  return out;
}

/**
 * code -> Drive id, for everything the master sheets link. A document is filed under its file name
 * when it is named for its course and no other has that name; what sits directly in a unit's folder also under
 * "<unit folder>/<name>"; a unit's folder under its name. Your copy in My versions, by file name,
 * takes the code from ours.
 */
function driveTab_(state, mine, note) {
  var tab = {}, count = {}, clash = [];
  var paths = Object.keys(state).filter(function (p) { return /^(A7|M7)\//.test(p) && state[p].state !== 'gone'; });
  paths.forEach(function (p) {
    var parts = p.replace(/\/$/, '').split('/'), c = parts[0] + '|' + parts[parts.length - 1];
    if (parts.length > 1) count[c] = (count[c] || 0) + 1;
  });
  function file(what, id) {
    var k = key_(what);
    if (tab[k] && tab[k].what !== what) { clash.push(what + ' / ' + tab[k].what); return; }
    tab[k] = { id: id, what: what };
  }
  paths.forEach(function (p) {
    var parts = p.replace(/\/$/, '').split('/'), name = parts[parts.length - 1], s = state[p];
    if (parts.length < 2) return;
    // a unit's folder, or a document named for its course ("M7 4.06 …") that no other shares; a bare name is not enough
    if (parts.length === 2 || (count[parts[0] + '|' + name] === 1 && name.indexOf(parts[0] + ' ') === 0)) file(name, s.id);
    if (parts.length === 3) file(parts[1] + '/' + name, s.id);                                // directly in its unit's folder
  });
  note.mine = walk_(mine, MINE, []);
  var newest = {};
  note.mine.forEach(function (f) { if (!newest[f.name] || f.changed > newest[f.name].changed) newest[f.name] = f; });
  var published = {};                               // file name -> when our copy of it arrived
  paths.forEach(function (p) { if (state[p].kind === 'file') published[p.split('/').pop()] = state[p].changed; });
  note.used = []; note.behind = [];
  Object.keys(newest).forEach(function (name) {
    var k = key_(name);
    if (!tab[k] || tab[k].what !== name) return;
    tab[k].id = newest[name].id; note.used.push(name);
    if (published[name] > newest[name].changed) note.behind.push(name);   // Claude has published a newer one since you saved yours
  });
  note.clash = clash;
  return tab;
}

// ------------------------------------------------------------------------------------------ the tabs of this spreadsheet

function tabs_(ss, state, tab, masters, mine, extra, note, started) {
  var keys = Object.keys(tab).sort(), now = iso_(Date.now());
  var rows = [['windy-hill-drive', 'v' + VERSION, now, String(keys.length)]];
  keys.forEach(function (k) { rows.push([k, tab[k].id]); });
  // each live master sheet looks its links up in its own Drive tab
  masters.forEach(function (m) {
    if (!m) return;
    try {
      var sh = SpreadsheetApp.openById(m.id).getSheetByName('Drive');
      if (!sh) throw new Error('it has no Drive tab');
      write_(sh, rows, 4);
    } catch (e) { note.errors.push(m.course + ' master sheet: its links could not be refreshed (' + e.message + ')'); }
  });
  status_(ss, state, rows, masters, note, started);
  write_(sheet_(ss, 'Index', 1), rows, 4);
  // My files: what you keep in My files and My versions
  var own = (note.mine || []).concat(walk_(extra, EXTRA, []));
  own.sort(function (a, b) { return (a.path + '/' + a.name) < (b.path + '/' + b.name) ? -1 : 1; });
  var mf = sheet_(ss, 'My files', 2), frows = [['Folder', 'File', 'Last changed (UTC)', 'Open', 'Used by the master sheets']];
  own.forEach(function (f) {
    var used = (note.used || []).indexOf(f.name) >= 0 && f.path.indexOf(MINE) === 0;
    frows.push([f.path, f.name, iso_(f.changed), '', !used ? '' : (note.behind || []).indexOf(f.name) >= 0 ?
      'yes — the links open this. CLAUDE HAS PUBLISHED A NEWER VERSION SINCE: compare, then update or delete yours' : 'yes — the links open this']);
  });
  write_(mf, frows, 5);
  if (own.length) mf.getRange(2, 4, own.length, 1).setFormulas(own.map(function (f) { return ['=HYPERLINK("https://drive.google.com/file/d/' + f.id + '/view","open")']; }));
}

/** The first tab: what a person, or a Claude session, reads to see how things stand. */
function status_(ss, state, rows, masters, note, started) {
  var files = Object.keys(state).filter(function (p) { return state[p].kind === 'file'; });
  var st = ss.getSheetByName('Status') || ss.getSheets()[0];
  if (st.getName() !== 'Status') st.setName('Status');
  if (st.getIndex() !== 1) { try { ss.setActiveSheet(st); ss.moveActiveSheet(1); } catch (e) { /* the hourly run has no active sheet to move */ } }
  var s = [
    ['windy-hill-status', 'v' + VERSION, iso_(Date.now())],
    ['State', note.errors.length ? 'NEEDS A LOOK' : (note.waiting ? 'copying — ' + note.waiting + ' files still to come; it carries on by itself' : 'up to date'), ''],
    ['Files in From Claude', String(files.length), ''],
    ['This run', note.put + ' copied in, ' + note.removed + ' removed, ' + note.restored + ' found missing and queued again', ''],
    ['Seconds it took', String(Math.round((Date.now() - started) / 1000)), '']
  ];
  REPOS.forEach(function (R) { s.push([R.course + ' published at', note.heads[R.course] ? note.heads[R.course].slice(0, 10) : '(not read this run)', '']); });
  (masters || []).forEach(function (m, k) {
    s.push([REPOS[k].course + ' master sheet (live)', m ? REPOS[k].sheet.replace(/\.xlsx$/, '') : 'not made yet', m ? 'https://docs.google.com/spreadsheets/d/' + m.id + '/edit' : '']);
  });
  s.push(['Lines in the Drive tab', rows ? String(rows.length - 1) : '', '']);
  s.push(['Your copies the links open', String((note.used || []).length), (note.used || []).slice(0, 50).join(' · ')]);
  (note.behind || []).forEach(function (e) { s.push(['A NEWER VERSION IS PUBLISHED', e, 'your copy in ' + MINE + ' is what the links open: compare, then update or delete yours']); });
  note.errors.forEach(function (e) { s.push(['PROBLEM', e, '']); });
  Object.keys(state).sort().forEach(function (p) {
    var x = state[p];
    if (x.kind === 'theirs') s.push(['Your own copy in Apps', p.slice(5), 'delete it and the script keeps this console current']);
    else if (x.state === 'yours-behind') s.push(['A NEWER VERSION IS PUBLISHED', p, 'you edited this file in From Claude, so it is left alone: delete it to get the new one']);
    else if (x.state === 'yours-unpublished') s.push(['Edited by you, kept', p, 'no longer published by Claude']);
  });
  (note.clash || []).forEach(function (e) { s.push(['TELL CLAUDE: two names share a code', e, '']); });
  write_(st, s, 3);
}
