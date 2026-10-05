/**
 * Windy Hill — the Drive side (version 3, 4 October 2026)
 *
 * WHAT IT DOES, every hour, in this Google account
 * 1. Copies everything Claude has published for A7 and M7 — the unit folders with their slides,
 *    Teacher Editions, lesson plans, handouts, tests and keys, the consoles, and the two master
 *    sheets — from the private GitHub repositories into Windy Hill Master Folder > From Claude.
 *    Only what has changed since the last run. Every file is checked, byte for byte, against the
 *    fingerprint GitHub gives for it before it is put in Drive. You upload nothing.
 * 2. Puts each console (… - All Slides.html) in the master folder's Apps as well, where the panel
 *    opens it.
 * 3. Turns each master sheet into a Google Sheet in the master folder and keeps its links live:
 *    every link opens the document that is in your Drive right now. When a new master sheet is
 *    published the SAME Google Sheet gets the new contents, so its address — and your bookmark —
 *    stays, and your IXL ticks are carried across (they are also kept on the "Kept" tab here).
 * 4. Prefers YOUR copy. Save an edited document under the same file name in the master folder's
 *    My versions and the links open yours. A document you edit in place inside From Claude is
 *    left alone from then on; so is one you move out of it, and a file of your own that you put
 *    in a published one's place. If Claude later publishes a newer version, the Status tab says
 *    so in capitals.
 * 5. Lists whatever you keep in the master folder's My files and My versions on the "My files" tab.
 * 6. Tells you. The Status tab (first tab) says how things stand; the Activity tab keeps a log;
 *    and, if you ask it to (menu Windy Hill > Email me…), it writes to you when something needs
 *    a look — a token about to expire, a copy that keeps failing.
 *
 * WHAT IT TOUCHES
 * It creates, replaces and removes only its own files: the ones it made, and exact copies of a
 * published file (a copy that is byte for byte what Claude published counts as Claude's). A
 * replaced file goes to the Drive trash, where it stays for 30 days. Nothing you wrote is ever
 * changed, moved or deleted. It reads your GitHub token from this account's private settings; the
 * token never appears in a sheet, a log, an email or a file.
 * Google's permission screen asks for all of Drive, your spreadsheets, "connect to an external
 * service" (GitHub), "send email as you" (only used if you turn the emails on) and to run while
 * you are away (the hourly sync): a script that files documents for you cannot ask for less.
 *
 * SET IT UP ONCE (on a laptop, in a private/incognito window signed in ONLY as the Google account
 * made for this — with several accounts signed in, Google's script editor muddles them)
 * 1. Open the spreadsheet "Windy Hill Drive Index" (Windy Hill Master Folder > Apps). Menu
 *    Extensions > Apps Script.
 * 2. Delete whatever is in the editor, paste this whole file, press Save (the disk icon).
 * 3. On the left, next to "Services", press +. Choose "Drive API", press Add.
 * 4. In the bar above the code pick "setup" in the list of functions, press Run, and approve:
 *    Review permissions > this account > Advanced > "Go to … (unsafe)" > Allow. (Google says
 *    "unsafe" of every script it has not reviewed, your own included.)
 * 5. Back in the spreadsheet, reload the page. Menu Windy Hill > Set the GitHub token… and paste
 *    a token made like this: github.com > your picture > Settings > Developer settings > Personal
 *    access tokens > Fine-grained tokens > Generate new token. Repository access: "Only select
 *    repositories" > windy-hill-m7 and croix18-windy-hill-a7. Permissions > Repository
 *    permissions > Contents: Read-only. Expiration: the longest it offers. Paste it ONLY into
 *    that box — never into a chat.
 * 6. (If you like) menu Windy Hill > Email me when something needs a look…
 * The first copy is about 250 MB and takes an hour or so of short runs; the script carries on by
 * itself every minute until it is done, then once an hour. The Status tab says where it is.
 *
 * A NEWER VERSION OF THIS SCRIPT: paste it over this one and press Save. Nothing else — what it
 * has already copied is recognised, not copied again.
 */

var VERSION = 3;                         // of this script
var FORMAT = 'v2';                       // of the Drive tab the master sheets read
var OWNER = 'croix18';
var REPOS = [
  { course: 'A7', repo: 'croix18-windy-hill-a7', packages: 'a7/packages', sheetDir: 'a7/reference', sheet: 'A7 Master Sheet 2026-27.xlsx' },
  { course: 'M7', repo: 'windy-hill-m7', packages: 'm7/packages', sheetDir: 'm7/reference', sheet: 'M7 Master Sheet 2026-27.xlsx' }
];
var HOME_ID = '1wodkpowCt32TQY_kiTpmcO4sn0Yh3Prb';   // Windy Hill Master Folder (shared with this account as an editor)
var HOME = 'Windy Hill Master Folder';   // … found by this name if that address ever changes
var MIRROR = 'From Claude';              // everything published, copied here; this script's to manage
var MINE = 'My versions';                // your edited copies: the same file name, and the links open yours
var EXTRA = 'My files';                  // anything else of yours; listed on the "My files" tab
var APPS = 'Apps';                       // where the panel opens the consoles from
var CONSOLE = / - All Slides\.html$/;
var TZ = 'America/New_York';             // the times on the tabs are Windy Hill's
var TITLE = 'Windy Hill — Drive status';
var BUDGET_MS = 4.5 * 60 * 1000;         // a run stops itself here (Google stops it at 6 minutes) and carries on in the next
var BATCH_BYTES = 8 * 1024 * 1024, BATCH_FILES = 8;   // fetched together
var MAX_BYTES = 45 * 1024 * 1024;        // a file larger than this cannot pass through a script
var HASH_MAX = 16 * 1024 * 1024;         // a file of yours larger than this is not compared byte for byte
var AUDIT = 120;                         // files looked at per run to see that they are still there
var SAVE_EVERY = 25;                     // the record of what is in Drive is written down this often during a long copy
var LOG_LINES = 400;                     // the Activity tab keeps this many
var SHEETS = 'application/vnd.google-apps.spreadsheet';
var NATIVE = {                           // your copy saved as a Google file stands for the Office file of the same name
  'application/vnd.google-apps.presentation': '.pptx', 'application/vnd.google-apps.document': '.docx', 'application/vnd.google-apps.spreadsheet': '.xlsx'
};
var MIME = {
  pdf: 'application/pdf', html: 'text/html', md: 'text/markdown', txt: 'text/plain', csv: 'text/csv', json: 'application/json',
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', svg: 'image/svg+xml', zip: 'application/zip',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
};
var COLS = ['path', 'sha', 'id', 'kind', 'size', 'changed', 'state', 'repo', 'md5'];   // the Mirror tab
var MARK = /^From Claude \(([A-Za-z0-9._-]+) ([0-9a-f]{40}) ([0-9a-f]{32})\)/;          // how a file this script made says so, in its description
var FLAG = 'being replaced';             // written in a live sheet just before its contents are replaced; gone once they are
var GH_ = { left: null, reset: 0, expires: null, dated: false };                       // what GitHub's answers said this run

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Windy Hill')
    .addItem('Sync now', 'syncNow')
    .addItem('Check everything (slower)', 'checkEverything')
    .addSeparator()
    .addItem('Set the GitHub token…', 'setToken')
    .addItem('Forget the GitHub token', 'forgetToken')
    .addItem('Email me when something needs a look…', 'setEmail')
    .addSeparator()
    .addItem('Sync every hour (turn on)', 'everyHour')
    .addItem('Stop the hourly sync', 'stopHourly')
    .addSeparator()
    .addItem('About', 'about')
    .addToUi();
}

/** Run once from the editor: asks for permission, makes the folders, turns the hourly sync on. */
function setup() {
  if (!SpreadsheetApp.getActiveSpreadsheet()) throw new Error('Paste this script into the spreadsheet "Windy Hill Drive Index" (open it, then Extensions > Apps Script) — not into a new project.');
  var mark = PropertiesService.getScriptProperties().getProperty('account');
  if (mark && !mine_()) throw new Error('This script is already set up from another Google account. Sign in as that one (a private window, with only that account signed in, is the sure way). To move the script to THIS account instead, run "takeOver".');
  if (!mark) claim_();
  var home = home_();
  [MIRROR, MINE, EXTRA, APPS].forEach(function (n) { child_(home, n); });
  everyHour();
  sync();
}

/** Run from the editor to move the script to the account you are signed in as. The other account's hourly sync stops itself. */
function takeOver() { claim_(); setup(); }

/**
 * One Google account runs this script: the one that ran setup. The spreadsheet is shared with
 * your other accounts, and its menu shows for them too — but two accounts filing the same folder
 * would trip over each other, so for anyone else the script only says whose it is.
 */
function mine_() {
  var mark = PropertiesService.getScriptProperties().getProperty('account');
  return !!mark && PropertiesService.getUserProperties().getProperty('account') === mark;
}

function claim_() {
  var mark = Utilities.getUuid();
  PropertiesService.getScriptProperties().setProperty('account', mark);
  PropertiesService.getUserProperties().setProperty('account', mark);
}

function whose_() {
  return PropertiesService.getScriptProperties().getProperty('account') ?
    'This script was set up from another Google account: sign in as that one (the account made for Windy Hill) to use it.' :
    'Not set up yet: in the script editor (Extensions > Apps Script), run "setup".';
}

/** For the menu: is this the account that runs the script? If not, say so. */
function allowed_() {
  if (mine_()) return true;
  SpreadsheetApp.getUi().alert(whose_());
  return false;
}

/** Menu: a sync, and a word about how it went. */
function syncNow() {
  var said = sync();
  try { SpreadsheetApp.getActiveSpreadsheet().toast(said, 'Windy Hill', 10); } catch (e) { /* no window to say it in */ }
}

/** Menu: look at every file now (not 120 an hour), list GitHub afresh, write every tab again. */
function checkEverything() {
  if (!allowed_()) return;
  var props = PropertiesService.getUserProperties();
  props.setProperty('full', '1');
  ['full-at', 'inplace', 'tab', 'tab-at', 'own'].forEach(function (k) { props.deleteProperty(k); });
  syncNow();
}

function setToken() {
  if (!allowed_()) return;
  var ui = SpreadsheetApp.getUi();
  var r = ui.prompt('GitHub token', 'Paste the fine-grained token (read-only, the two course repositories). It is kept in this account\'s private settings.', ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  var t = r.getResponseText().replace(/\s+/g, '');
  if (!/^(github_pat_|ghp_)[A-Za-z0-9_]{20,}$/.test(t)) { ui.alert('That does not look like a GitHub token (it starts github_pat_). Nothing was saved.'); return; }
  PropertiesService.getUserProperties().setProperty('GITHUB_TOKEN', t);
  GH_ = { left: null, reset: 0, expires: null, dated: false };
  var read = 0;
  var seen = REPOS.map(function (R) { var h = head_(R, t); if (h.sha) read++; return R.repo + ': ' + (h.sha ? 'can be read' : 'CANNOT be read — ' + h.error); }).join('\n');
  var until = !read ? '' : GH_.expires ? 'It works until ' + day_(GH_.expires) + '.\n\n' : 'It has no expiry date.\n\n';
  ui.alert('Saved.\n\n' + seen + '\n\n' + until + 'The sync starts now and carries on by itself.');
  more_();
}

function forgetToken() {
  if (!allowed_()) return;
  PropertiesService.getUserProperties().deleteProperty('GITHUB_TOKEN');
  SpreadsheetApp.getUi().alert('The token is forgotten. Nothing in Drive is removed; nothing new arrives until you set a token again.');
}

function setEmail() {
  if (!allowed_()) return;
  var ui = SpreadsheetApp.getUi(), props = PropertiesService.getUserProperties(), cur = props.getProperty('EMAIL') || '';
  var r = ui.prompt('Email alerts', 'The address to write to when something needs a look — a token about to expire, a copy that keeps failing. At most one message a day. Leave the box empty to turn the emails off.' + (cur ? '\n\nNow: ' + cur : ''), ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  var a = r.getResponseText().replace(/\s+/g, '');
  if (!a) { props.deleteProperty('EMAIL'); ui.alert('Email alerts are off.'); return; }
  if (!/^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/.test(a)) { ui.alert('That does not look like one email address. Nothing was changed.'); return; }
  props.setProperty('EMAIL', a);
  try {
    MailApp.sendEmail(a, 'Windy Hill: email alerts are on', 'This is the Windy Hill script in your Google account. It will write to this address when something needs a look, and once more when it is back to normal.\n\n' + SpreadsheetApp.getActiveSpreadsheet().getUrl());
    ui.alert('Saved. A test message is on its way to ' + a + '.');
  } catch (e) { ui.alert('Saved, but the test message could not be sent (' + e.message + ').'); }
}

function about() {
  SpreadsheetApp.getUi().alert('Windy Hill script, version ' + VERSION + '\n\n' +
    'Every hour it copies what Claude has published for A7 and M7 into ' + HOME + ' > ' + MIRROR + ', puts the consoles in ' + APPS + ', and keeps the two master sheets\' links pointing at what is in Drive.\n\n' +
    'Your own copy of a document: save it under the same file name in ' + MINE + ', and the links open yours.\n' +
    'Anything else of yours: ' + EXTRA + '.\n\n' +
    'The Status tab says how things stand. PROBLEM lines are for you; everything else mends itself.');
}

function everyHour() {
  stopHourly();
  if (mine_()) ScriptApp.newTrigger('sync').timeBased().everyHours(1).create();
  else SpreadsheetApp.getUi().alert(whose_());
}

function stopHourly() { clear_('sync'); }

function clear_(fn) {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === fn) ScriptApp.deleteTrigger(t); });
}

/** The run that carries a long sync on (its own name, so the hourly trigger is never mistaken for it). */
function syncMore() { sync(); }

function more_() {
  clear_('syncMore');
  ScriptApp.newTrigger('syncMore').timeBased().after(60 * 1000).create();
}

// ------------------------------------------------------------------------------------------ small things

function hex_(bytes) {
  var out = '';
  for (var i = 0; i < bytes.length; i++) {
    var b = bytes[i] & 0xff;                      // digests come back as signed bytes
    out += (b < 16 ? '0' : '') + b.toString(16);
  }
  return out;
}

/** The code a name is filed under: "k" + the first 12 hex digits of the MD5 of the name. */
function key_(name) {
  return 'k' + hex_(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, String(name).normalize('NFC'), Utilities.Charset.UTF_8)).slice(0, 12);
}

function md5Text_(text) { return hex_(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, String(text), Utilities.Charset.UTF_8)); }

/**
 * The name git gives a file's contents — the SHA-1 of "blob <length>\0" and the bytes: what GitHub
 * lists, and what every download is held to. (The few bytes of the heading are put in front of the
 * file's own and taken off again, rather than a second copy made: a console is 8 MB.)
 */
function gitSha_(bytes) {
  var head = Utilities.newBlob('blob ' + bytes.length + '\u0000').getBytes();
  Array.prototype.unshift.apply(bytes, head);
  try { return hex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_1, bytes)); }
  finally { bytes.splice(0, head.length); }
}

function iso_(ms) { return Utilities.formatDate(new Date(ms), 'UTC', "yyyy-MM-dd'T'HH:mm'Z'"); }
function at_(ms) { return Utilities.formatDate(new Date(ms), TZ, 'EEE d MMM, h:mm a'); }
function day_(ms) { return Utilities.formatDate(new Date(ms), TZ, 'EEE d MMM yyyy'); }

function leaf_(p) { return p.split('/').pop().replace(/^Apps:/, ''); }

function live_(f) { try { return !!f && !f.isTrashed(); } catch (e) { return false; } }

function file_(id) { try { var f = DriveApp.getFileById(id); return f.isTrashed() ? null : f; } catch (e) { return null; } }

/** Is this Google saying "enough for today"? (Then the run stops quietly and carries on later.) */
function quota_(e) { return /too many times|quota|rate limit|limit exceeded|user rate|daily limit/i.test(String(e && e.message || e)); }

/** Windy Hill Master Folder: by its address; failing that, the folder of that name that is not in the trash (with an Apps folder in it, if there are several). */
function home_() {
  try { var known = DriveApp.getFolderById(HOME_ID); if (!known.isTrashed()) return known; } catch (e) { /* not shared with this account, or gone: look for it by name */ }
  var it = DriveApp.getFoldersByName(HOME), all = [];
  while (it.hasNext()) { var f = it.next(); if (!f.isTrashed()) all.push(f); }
  for (var i = 0; i < all.length; i++) if (all[i].getFoldersByName(APPS).hasNext()) return all[i];
  if (all.length) return all[0];
  throw new Error('This account cannot see "' + HOME + '": share that folder with this account as an editor, then Windy Hill > Sync now');
}

/** The folder of that name inside a folder; made if it is not there (and then noted in `made`). */
function child_(parent, name, made) {
  var it = parent.getFoldersByName(name);
  while (it.hasNext()) { var f = it.next(); if (!f.isTrashed()) return f; }
  var d = parent.createFolder(name);
  if (made) made[d.getId()] = true;
  return d;
}

function sheet_(ss, name, position, hidden) {
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name, Math.min(position, ss.getSheets().length));
    if (hidden) { try { sh.hideSheet(); } catch (e) { /* it stays in view: no harm */ } }
  }
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

/** To the trash — or, if it belongs to another account (only its owner can bin it), out of the way under another name. */
function bin_(f, note) {
  try { f.setTrashed(true); return; } catch (e) { /* not this account's to bin */ }
  try {
    var name = f.getName();
    if (name.indexOf('OLD - ') !== 0) f.setName('OLD - ' + name);
    note.soon.push('An older copy belongs to another account and could not be put in the trash; it is now called "OLD - ' + name + '". Delete it when you like.');
  } catch (e2) { note.errors.push('An older copy of ' + f.getName() + ' could not be removed: delete it by hand'); }
}

// ------------------------------------------------------------------------------------------ the Mirror tab

function row_(sha, id, kind, size, changed, st, repo, md5) {
  return { sha: sha, id: id, kind: kind, size: size, changed: changed, state: st, repo: repo, md5: md5 || '' };
}

function readState_(ss) {
  var sh = ss.getSheetByName('Mirror'), state = {};
  if (!sh || sh.getLastRow() < 2) return state;
  var width = Math.min(COLS.length, sh.getLastColumn());
  sh.getRange(2, 1, sh.getLastRow() - 1, width).getValues().forEach(function (r) {
    if (!r[0]) return;
    state[String(r[0])] = row_(String(r[1]), String(r[2]), String(r[3]), Number(r[4]) || 0, Number(r[5]) || 0, String(r[6]) || 'ok', String(r[7]), String(r[8] === undefined ? '' : r[8]));
  });
  return state;
}

function writeState_(ss, state) {
  var rows = [COLS];
  Object.keys(state).sort().forEach(function (p) { var s = state[p]; rows.push([p, s.sha, s.id, s.kind, s.size, s.changed, s.state, s.repo, s.md5]); });
  write_(sheet_(ss, 'Mirror', 9, true), rows, COLS.length);
}

// ------------------------------------------------------------------------------------------ GitHub

function gh_(path, token, accept) {
  return { url: 'https://api.github.com' + path, headers: { Authorization: 'Bearer ' + token, Accept: accept || 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' }, muteHttpExceptions: true };
}

/** "2027-10-03 16:00:00 UTC" (or "… -0400") -> milliseconds; null if it cannot be read. */
function when_(text) {
  var m = String(text).match(/(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})\s*(UTC|Z|[+-]\d{2}:?\d{2})?/);
  if (!m) return null;
  var ms = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]), z = m[7];
  if (z && z !== 'UTC' && z !== 'Z') { var d = z.replace(':', ''); ms -= (d.charAt(0) === '-' ? -1 : 1) * (+d.slice(1, 3) * 60 + +d.slice(3, 5)) * 60000; }
  return ms;
}

/** What an answer from GitHub says about the token and the hour's allowance. */
function meter_(res) {
  try {
    var h = res.getHeaders(), low = {};
    Object.keys(h).forEach(function (k) { low[k.toLowerCase()] = h[k]; });
    if (low['x-ratelimit-remaining'] !== undefined && low['x-ratelimit-remaining'] !== '') GH_.left = Number(low['x-ratelimit-remaining']);
    if (low['x-ratelimit-reset']) GH_.reset = Number(low['x-ratelimit-reset']) * 1000;
    if (low['github-authentication-token-expiration']) { GH_.expires = when_(low['github-authentication-token-expiration']); GH_.dated = true; }
  } catch (e) { /* an answer without headers: nothing learned */ }
  return res;
}

/** One request; tried again, twice, when the line or GitHub falters. */
function fetch_(q) {
  for (var n = 0; ; n++) {
    var res = null, err = null;
    try { res = UrlFetchApp.fetch(q.url, q); } catch (e) { err = e; }
    var code = res ? res.getResponseCode() : 0;
    if (res && code < 500) return meter_(res);
    if (n >= 2) { if (res) return meter_(res); throw new Error('GitHub could not be reached (' + String(err && err.message || err).slice(0, 120) + ')'); }
    Utilities.sleep(1500 * (n + 1));
  }
}

/** Several downloads at once; whichever fails is asked for again by itself. An entry is null if it cannot be had. */
function fetchAll_(reqs) {
  var out = null;
  try { out = UrlFetchApp.fetchAll(reqs); } catch (e) { out = null; }
  return reqs.map(function (q, k) {
    var r = out ? out[k] : null;
    if (r && r.getResponseCode() < 500) return meter_(r);
    try { return fetch_(q); } catch (e) { return r ? meter_(r) : null; }
  });
}

function get_(path, token, accept) { return fetch_(gh_(path, token, accept)); }

function why_(code) {
  return code === 401 ? 'GitHub refused the token (wrong, or expired): set a new one' :
         (code === 403 || code === 429) && GH_.left === 0 ? 'GitHub\'s hourly allowance of requests is used up' :
         code === 403 ? 'GitHub refused the request (the token lacks Contents: Read)' :
         code === 404 ? 'the token cannot see this repository: add it under "Only select repositories"' : 'GitHub answered ' + code;
}

/** {sha} of the newest commit, or {error}. */
function head_(R, token) {
  var res;
  try { res = get_('/repos/' + OWNER + '/' + R.repo + '/commits/main', token, 'application/vnd.github.sha'); } catch (e) { return { error: e.message }; }
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

/** One run. Returns a sentence about how it went. */
function sync() {
  if (!mine_()) {                                                           // another account's leftover trigger, or its menu: nothing is touched
    try { if (PropertiesService.getScriptProperties().getProperty('account')) { clear_('sync'); clear_('syncMore'); } } catch (e) { /* no matter */ }
    return whose_();
  }
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(3000)) return 'A sync is already at work; it finishes by itself.';
  var started = Date.now(), ss = SpreadsheetApp.getActiveSpreadsheet();
  var props = PropertiesService.getUserProperties(), token = props.getProperty('GITHUB_TOKEN');
  var note = { errors: [], more: 0, soon: [], log: [], put: 0, removed: 0, restored: 0, adopted: 0, converted: 0, looked: 0, todo: 0, again: false, paused: '',
               heads: {}, mine: [], used: [], behind: [], unused: [], clash: [], lines: null };
  var state = {}, loaded = false, was = '';
  var cx = { ss: ss, props: props, note: note, folders: {}, made: {}, names: {}, apps: null, full: props.getProperty('full') === '1', unsaved: 0,
             left: function () { return BUDGET_MS - (Date.now() - started); },
             save: function () { if (!loaded) return; var now = JSON.stringify(state); if (now !== was) { writeState_(ss, state); was = now; } cx.unsaved = 0; } };
  GH_ = { left: null, reset: 0, expires: null, dated: false };
  try { clear_('syncMore'); } catch (e0) { /* the triggers cannot be read: the run goes on */ }
  try {
    if (!ss) throw new Error('this script must live in the spreadsheet "Windy Hill Drive Index" (Extensions > Apps Script)');
    state = readState_(ss); loaded = true; was = JSON.stringify(state);
    if (props.getProperty('running')) note.log.push('The run before this one was cut short; this one picked up where it stopped.');
    props.setProperty('running', String(started));
    var home = home_(), mirror = child_(home, MIRROR), mine = child_(home, MINE), extra = child_(home, EXTRA), apps = child_(home, APPS);
    cx.folders[''] = mirror; cx.apps = apps;
    if (typeof Drive === 'undefined') note.errors.push('The Drive service is not turned on (setup step 3: in the script editor, Services + > Drive API > Add): the master sheets cannot be made');
    if (!token) note.errors.push('No GitHub token yet: menu Windy Hill > Set the GitHub token…');
    else {
      var jobs = [];
      REPOS.forEach(function (R) { try { var j = plan_(R, token, state, cx); if (j) jobs.push(j); } catch (e) { note.errors.push(R.course + ': ' + e.message); } });
      pull_(jobs, state, cx);
    }
    cx.save();
    if (cx.left() > 60000 && !note.todo && !note.paused) audit_(state, cx);
    var masters = REPOS.map(function (R) { try { return master_(R, state, home, cx); } catch (e) { note.errors.push(R.course + ' master sheet: ' + e.message); return null; } });
    var tab = driveTab_(state, mine, note);
    tabs_(ss, state, tab, masters, extra, cx);
    health_(cx);
    status_(ss, state, masters, cx, started);
    alert_(ss, cx);
    log_(ss, cx);
  } catch (e) {
    note.errors.push(String(e && e.message || e));
    try { status_(ss, state, [], cx, started); log_(ss, cx); } catch (e2) { /* the spreadsheet itself is the trouble */ }
  } finally {
    try { cx.save(); } catch (e3) { /* nothing more can be done */ }
    try { props.deleteProperty('running'); } catch (e4) { /* the next run will say this one was cut short; no harm */ }
    // carry on in a minute while there is more to do — unless three runs in a row got nowhere (then the hourly run tries again)
    var goOn = (note.todo > 0 || note.again) && !note.paused && !!token;
    try {
      var moved = note.put + note.removed + note.restored + note.adopted + note.converted + note.looked > 0;
      var idle = goOn && !moved ? Number(props.getProperty('idle') || 0) + 1 : 0;
      if (idle >= 3) { goOn = false; idle = 0; }
      props.setProperty('idle', String(idle));
      if (goOn) more_();
    } catch (e5) { /* the hourly run carries on */ }
    lock.releaseLock();
  }
  return said_(note);
}

function said_(note) {
  return note.errors.length ? 'NEEDS A LOOK' :
         note.paused ? 'paused — ' + note.paused + '; it carries on by itself' + (note.todo ? ' (' + note.todo + ' files still to come)' : '') :
         note.todo ? 'copying — ' + note.todo + ' files still to come; it carries on by itself' :
         note.again ? 'finishing — one more run in a minute' : 'up to date';
}

function fail_(note, what) { if (note.errors.length < 8) note.errors.push(what); else note.more++; }

/**
 * What one repository has for the mirror. What is no longer published goes at once; what is new
 * or changed is listed — the consoles and the master sheet first — for batch_ to bring in.
 * Null when the repository has nothing new.
 */
function plan_(R, token, state, cx) {
  var note = cx.note, props = cx.props, head = head_(R, token);
  if (head.error) throw new Error(head.error);
  note.heads[R.course] = head.sha;
  var mineOf = function (p) { return state[p].repo === R.repo; };
  var rows = Object.keys(state).filter(mineOf);
  var any = rows.some(function (p) { return state[p].kind === 'file' || state[p].kind === 'theirs'; });
  // a file of yours standing in a published one's place, once you delete it, makes room for the published one
  rows.forEach(function (p) { if (state[p].kind === 'theirs' && !file_(state[p].id)) state[p].state = 'gone'; });
  var missing = rows.some(function (p) { return state[p].state === 'gone'; });
  if (props.getProperty('head:' + R.repo) === head.sha && any && !missing && !cx.full) return null;
  var want = published_(R, head.sha, token), failed = 0, removedHere = 0;

  // what is no longer published goes (unless you edited it)
  rows.forEach(function (p) {
    var s = state[p];
    if (s.kind === 'theirs' && !want[p]) { delete state[p]; return; }      // yours, and no longer anyone's business
    if (s.kind !== 'file' || want[p]) return;
    var f = s.state === 'gone' ? null : file_(s.id);
    if (f && !inPlace_(f, placeId_(p, state, cx))) f = null;                 // you moved it elsewhere: it is yours now, and is left where you put it
    if (f && (s.state.indexOf('yours') === 0 || edited_(s, f))) { s.state = 'yours-unpublished'; return; }   // you edited it: it stays
    if (f) bin_(f, note);
    delete state[p]; note.removed++; removedHere++;
  });
  if (removedHere) prune_(state, R, note);

  // what is new or changed: what you teach from first (the consoles, then the master sheet), then the rest by name
  var rank = function (p) { return p.indexOf('Apps:') === 0 ? 0 : p.indexOf('/') < 0 ? 1 : 2; };
  var todo = Object.keys(want).filter(function (p) {
    if (state[p] && state[p].state !== 'gone' && state[p].sha === want[p].sha) return false;
    if (want[p].size > MAX_BYTES) { failed++; fail_(note, p + ' is too large for the script to carry (' + Math.round(want[p].size / 1048576) + ' MB): tell Claude'); return false; }
    return true;
  }).sort(function (a, b) { return rank(a) - rank(b) || (a < b ? -1 : a > b ? 1 : 0); });
  return { R: R, token: token, want: want, todo: todo, i: 0, first: todo.filter(function (p) { return rank(p) < 2; }).length, failed: failed, head: head.sha, stop: false };
}

/** The next few files of a repository's list. False when no more should be asked of it this run. */
function batch_(job, state, cx) {
  var note = cx.note, R = job.R, want = job.want, todo = job.todo;
  if (job.stop || note.paused || job.i >= todo.length) return false;
  if (cx.left() < 60000) { job.stop = true; return false; }
  if (GH_.left !== null && GH_.left < 30) { note.paused = 'GitHub\'s hourly allowance of requests is used up'; return false; }
  var batch = [], bytes = 0;
  while (job.i < todo.length && batch.length < BATCH_FILES && (bytes + want[todo[job.i]].size <= BATCH_BYTES || !batch.length)) { batch.push(todo[job.i]); bytes += want[todo[job.i]].size; job.i++; }
  // what is already there (yours, or a copy this script made and lost track of) is not fetched
  batch = batch.filter(function (p) {
    try { return needs_(p, want[p], state, R, cx); } catch (e) { job.failed++; fail_(note, p + ': ' + e.message); return false; }
  });
  if (!batch.length) return true;
  var res = fetchAll_(batch.map(function (p) { return gh_('/repos/' + OWNER + '/' + R.repo + '/git/blobs/' + want[p].sha, job.token, 'application/vnd.github.raw+json'); }));
  var refused = 0;
  for (var k = 0; k < batch.length; k++) {
    var p = batch[k], r = res[k], code = r ? r.getResponseCode() : 0;
    if (code !== 200) {
      job.failed++; refused++;
      if ((code === 403 || code === 429) && GH_.left === 0) { note.paused = 'GitHub\'s hourly allowance of requests is used up'; note.todo += batch.length - k; break; }
      fail_(note, p + ': ' + (r ? why_(code) : 'GitHub could not be reached'));
      continue;
    }
    var body = r.getContent();
    if (gitSha_(body) !== want[p].sha) { job.failed++; fail_(note, p + ': arrived damaged and was not put in Drive; it is fetched again next time'); continue; }
    try { put_(p, want[p], body, state, R, cx); }
    catch (e) {
      job.failed++;
      if (/storage/i.test(String(e && e.message))) { note.errors.push('This Google account is out of space: empty its Drive trash (replaced files sit there for 30 days), then Windy Hill > Sync now'); note.paused = 'this Google account is full'; note.todo += batch.length - k; break; }
      if (quota_(e)) { note.paused = 'Google\'s allowance for today is used up'; note.todo += batch.length - k; break; }
      fail_(note, p + ': Drive would not take it (' + e.message + ')');
    }
  }
  if (cx.unsaved >= SAVE_EVERY) cx.save();
  if (refused === batch.length) { job.stop = true; return false; }          // nothing could be had: GitHub is out of reach, so no more is asked this run
  return !note.paused;
}

/** All the courses' lists, as far as this run's time allows: the consoles and master sheets of every course first, then the rest, a few files for each course in turn. */
function pull_(jobs, state, cx) {
  var step = function (j) {
    try { return batch_(j, state, cx); } catch (e) { j.failed++; j.stop = true; cx.note.errors.push(j.R.course + ': ' + e.message); return false; }
  };
  jobs.forEach(function (j) { while (j.i < j.first && step(j)) { /* on to the next few */ } });
  for (var going = true; going;) {
    going = false;
    jobs.forEach(function (j) { if (step(j)) going = true; });
  }
  jobs.forEach(function (j) {
    cx.note.todo += j.todo.length - j.i;
    if (j.i >= j.todo.length && !j.failed && !cx.note.paused) cx.props.setProperty('head:' + j.R.repo, j.head);
  });
}

/**
 * Does this path still have to be fetched? Not if a file of yours stands in its place; not if
 * the file is already there — a copy this script made in a run that was cut short, or one you
 * uploaded that is byte for byte what Claude published. Those are taken on as they are.
 */
function needs_(p, w, state, R, cx) {
  var s = state[p], known = null, note = cx.note;
  if (s) {
    known = s.state === 'gone' ? null : file_(s.id);
    if (!known) { delete state[p]; s = null; }                                // it is gone (you deleted it): the published one comes back
    else if (s.kind === 'theirs') {
      if (!same_(known, w)) return false;                                     // your own file, in the published one's place
      adopt_(p, known, w, state, R, cx); return false;
    } else if (s.state.indexOf('yours') === 0 || edited_(s, known)) { s.state = 'yours-behind'; return false; }   // you edited it: never replaced
  }
  var folder = p.indexOf('Apps:') === 0 ? cx.apps : into_(cx, state, p.split('/').slice(0, -1), R);
  if (known && !inPlace_(known, folder.getId())) { delete state[p]; s = null; known = null; }   // you moved it elsewhere: it is yours now; the published one is put where it belongs
  var there = names_(folder, cx)[leaf_(p)] || [], his = null, got = false;
  there.forEach(function (f) {
    if (!live_(f) || (known && f.getId() === s.id)) return;                   // the copy on record is replaced below, once the new one is in
    var m = mark_(f);
    if (m) {
      var now = md5_(f), untouched = now !== null && now === m.md5;
      if (m.sha === w.sha && !got) {                                          // this script made it, and lost track of it
        var old = known;
        state[p] = row_(w.sha, f.getId(), 'file', w.size, untouched ? f.getLastUpdated().getTime() : 0, 'ok', R.repo, m.md5);
        if (old) bin_(old, note);
        got = true; note.adopted++; cx.unsaved++;
        return;
      }
      if (untouched) { bin_(f, note); return; }                               // an older copy this script made, left behind
    }
    if (!his) his = f;
  });
  if (got) return false;
  if (his && same_(his, w)) {                                               // the published file itself, unlabelled: a run stopped before it could label it, or you uploaded it
    var before = known;
    adopt_(p, his, w, state, R, cx);
    if (before) bin_(before, note);
    return false;
  }
  if (his && !known) { state[p] = row_('', his.getId(), 'theirs', 0, 0, 'yours', R.repo, ''); return false; }   // your own file, in the published one's place
  return true;
}

/** Put one downloaded file in its place; the copy it replaces goes to the trash. */
function put_(p, w, body, state, R, cx) {
  var name = leaf_(p), ext = name.split('.').pop().toLowerCase();
  var folder = p.indexOf('Apps:') === 0 ? cx.apps : into_(cx, state, p.split('/').slice(0, -1), R);
  var md5 = hex_(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, body));
  var f = folder.createFile(Utilities.newBlob(body, MIME[ext] || 'application/octet-stream', name));
  try { f.setDescription(markText_(R, w.sha, md5)); } catch (e) { /* it is still found by its contents */ }
  var old = state[p] && state[p].kind === 'file' && state[p].state !== 'gone' ? file_(state[p].id) : null;
  state[p] = row_(w.sha, f.getId(), 'file', w.size, Math.max(Date.now(), f.getLastUpdated().getTime()), 'ok', R.repo, md5);
  if (old) bin_(old, cx.note);
  cx.note.put++; cx.unsaved++;
}

function markText_(R, sha, md5) { return 'From Claude (' + R.repo + ' ' + sha + ' ' + md5 + '). To change it, save your copy under the same name in ' + MINE + '.'; }

/** What a file's description says, if this script made the file: {repo, sha, md5}; else null. */
function mark_(f) {
  try { var m = String(f.getDescription() || '').match(MARK); return m ? { repo: m[1], sha: m[2], md5: m[3] } : null; } catch (e) { return null; }
}

/** A file's fingerprint as Drive holds it now; null if it cannot be had. */
function md5_(f) {
  try {
    if (typeof Drive !== 'undefined') {
      var meta = Drive.Files.create ? Drive.Files.get(f.getId(), { fields: 'md5Checksum' }) : Drive.Files.get(f.getId());
      if (meta && meta.md5Checksum) return String(meta.md5Checksum);
    }
  } catch (e) { /* then from its bytes */ }
  try { return f.getSize() <= HASH_MAX ? hex_(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, f.getBlob().getBytes())) : null; } catch (e2) { return null; }
}

/** Have you changed this file since it was put there? (Its time says maybe; its fingerprint says.) */
function edited_(s, f) {
  var t = f.getLastUpdated().getTime();
  if (t <= s.changed + 2000) return false;
  var now = s.md5 ? md5_(f) : null;
  if (now !== null && now === s.md5) { s.changed = t; return false; }        // touched — renamed, described — but the same contents
  return true;
}

/** Is this file, byte for byte, the published one? */
function same_(f, w) {
  try { return f.getSize() <= HASH_MAX && gitSha_(f.getBlob().getBytes()) === w.sha; } catch (e) { return false; }
}

/** A file that is exactly the published one is taken on as this script's own. */
function adopt_(p, f, w, state, R, cx) {
  var md5 = md5_(f) || '';
  try { f.setDescription(markText_(R, w.sha, md5)); } catch (e) { /* it belongs to someone else, perhaps: no matter */ }
  state[p] = row_(w.sha, f.getId(), 'file', w.size, md5 ? Math.max(Date.now(), f.getLastUpdated().getTime()) : 0, 'ok', R.repo, md5);
  cx.note.adopted++; cx.unsaved++;
}

/** Is the file still in the folder it was put in? (If that cannot be told, it is taken to be.) */
function inPlace_(f, folderId) {
  if (!folderId) return true;
  try { var it = f.getParents(), any = false; while (it.hasNext()) { any = true; if (it.next().getId() === folderId) return true; } return !any; } catch (e) { return true; }
}

/** The Drive id of the folder a path belongs in, as far as the record knows it; null if it does not. */
function placeId_(p, state, cx) {
  if (p.indexOf('Apps:') === 0) return cx.apps.getId();
  var dir = p.split('/').slice(0, -1).join('/');
  if (!dir) return cx.folders[''].getId();
  return state[dir + '/'] ? state[dir + '/'].id : null;
}

/** The files in a folder by name, read once a run; a folder made this run is known to be empty. */
function names_(folder, cx) {
  var id = folder.getId();
  if (cx.made[id]) return {};
  if (!cx.names[id]) {
    var by = {}, it = folder.getFiles();
    while (it.hasNext()) { var f = it.next(), n = f.getName(); (by[n] = by[n] || []).push(f); }
    cx.names[id] = by;
  }
  return cx.names[id];
}

/** The mirror's folder for a path, made on the way down and remembered. */
function into_(cx, state, parts, R) {
  var folders = cx.folders, path = '';
  for (var k = 0; k < parts.length; k++) {
    var next = path + parts[k] + '/';
    if (!folders[next]) {
      var s = state[next], f = null;
      if (s) { try { f = DriveApp.getFolderById(s.id); if (f.isTrashed()) f = null; } catch (e) { f = null; } }
      if (!f) f = child_(folders[path], parts[k], cx.made);
      folders[next] = f;
      state[next] = row_('', f.getId(), 'folder', 0, 0, 'ok', R.repo, '');
    }
    path = next;
  }
  return folders[path];
}

/** A folder this script made that nothing published lives under any more — a unit renamed or withdrawn — is forgotten, and binned if it is empty. */
function prune_(state, R, note) {
  var dirs = Object.keys(state).filter(function (p) { return state[p].kind === 'folder' && state[p].repo === R.repo; }).sort(function (a, b) { return b.length - a.length; });
  dirs.forEach(function (d) {
    if (d.split('/').length <= 2) return;                                    // "A7/": the course's folder stays
    if (Object.keys(state).some(function (p) { return p !== d && p.indexOf(d) === 0; })) return;
    try {
      var f = DriveApp.getFolderById(state[d].id), it = f.getFiles(), sub = f.getFolders(), empty = true;
      while (empty && it.hasNext()) if (!it.next().isTrashed()) empty = false;      // something of yours is in it: it stays where it is
      while (empty && sub.hasNext()) if (!sub.next().isTrashed()) empty = false;
      if (empty) f.setTrashed(true);
    } catch (e) { /* gone already, or not this account's to bin */ }
    delete state[d];
  });
}

/** A few files a run: is each still in Drive? One that was deleted is fetched again next time. */
function audit_(state, cx) {
  var props = cx.props, note = cx.note;
  var paths = Object.keys(state).filter(function (p) { return state[p].kind === 'file' && state[p].state !== 'gone'; }).sort();
  if (!paths.length) { if (cx.full) { props.deleteProperty('full'); props.deleteProperty('full-at'); } return; }
  var at = cx.full ? Math.min(Number(props.getProperty('full-at') || 0), paths.length) : Number(props.getProperty('audit') || 0) % paths.length;
  var limit = cx.full ? paths.length - at : Math.min(AUDIT, paths.length), n = 0;
  for (; n < limit && cx.left() > 45000; n++) {
    var p = paths[(at + n) % paths.length];
    if (!file_(state[p].id)) { state[p].state = 'gone'; note.restored++; }
  }
  if (cx.full) {
    note.looked += n;
    if (n >= limit) { props.deleteProperty('full'); props.deleteProperty('full-at'); note.log.push('Checked every file: ' + paths.length + ' looked at, ' + note.restored + ' missing and fetched again.'); }
    else { props.setProperty('full-at', String(at + n)); note.again = true; }
  } else props.setProperty('audit', String((at + n) % paths.length));
  if (note.restored) note.todo += note.restored;
}

// ------------------------------------------------------------------------------------------ the live master sheets

/** xlsx bytes -> a new Google Sheet, through the Drive service (step 3 of the setup). Returns its id. */
function convert_(blob, name, folderId) {
  if (Drive.Files.create) return Drive.Files.create({ name: name, mimeType: SHEETS, parents: [folderId] }, blob).id;        // Drive API v3
  return Drive.Files.insert({ title: name, mimeType: SHEETS, parents: [{ id: folderId }] }, blob, { convert: true }).id;    // v2
}

/** xlsx bytes -> the contents of a Google Sheet that already exists: its address stays. */
function replace_(id, blob) {
  if (Drive.Files.create) Drive.Files.update({ mimeType: SHEETS }, id, blob);                                                // v3
  else Drive.Files.update({ mimeType: SHEETS }, id, blob, { convert: true });                                                // v2
}

/** A sheet that was converted a moment ago may need a moment before it opens. */
function open_(id) {
  for (var n = 0; ; n++) {
    try { return SpreadsheetApp.openById(id); } catch (e) { if (n >= 4) throw e; Utilities.sleep(3000); }
  }
}

/** Mark a live sheet (cell E1 of its Drive tab) so that it can be seen, afterwards, whether its contents were replaced. */
function flag_(ss) {
  var d = ss.getSheetByName('Drive');
  if (!d) throw new Error('it has no Drive tab');
  if (d.getMaxColumns() < 5) d.insertColumnsAfter(d.getMaxColumns(), 5 - d.getMaxColumns());
  d.getRange(1, 5).setValue(FLAG);
}

function flagged_(ss) {
  var d = ss.getSheetByName('Drive');
  if (!d) throw new Error('it has no Drive tab');
  return d.getMaxColumns() >= 5 && String(d.getRange(1, 5).getValue()) === FLAG;
}

/**
 * The course's live Google Sheet, given the new contents when a new master sheet has arrived.
 * Returns {course, id, filling} or null. Your IXL ticks are put by on the Kept tab first, the
 * sheet's contents are replaced (so its address stays), and the ticks are written back. If
 * Google will not replace the contents, a new sheet is made and the old one goes to the trash.
 */
function master_(R, state, home, cx) {
  var note = cx.note, props = cx.props, src = state[R.sheet], key = 'live:' + R.course, cur = state[key];
  var curFile = cur ? file_(cur.id) : null;
  if (cur && !curFile) { delete state[key]; cur = null; }                    // you deleted the live sheet: it is made again, with your ticks from the Kept tab
  var here = function () { cur = state[key]; return cur ? { course: R.course, id: cur.id, filling: cur.state === 'verify' } : null; };
  if (!cur) {                                                                // one this script made and lost track of is taken on, not made a second time
    var found = liveByName_(home, R.sheet.replace(/\.xlsx$/, ''));
    if (found) { cur = state[key] = row_('', found.getId(), 'live', 0, 0, 'ok', R.repo, ''); curFile = found; }
  }
  if (!src || src.state === 'gone' || typeof Drive === 'undefined') return here();

  if (cur && cur.state === 'verify') {                                       // its contents were replaced last run: did that take?
    var took = false;
    try { took = !flagged_(open_(cur.id)); } catch (e) { took = false; }
    if (took) { cur.state = 'ticks'; props.setProperty('inplace', 'yes'); note.log.push(R.course + ' master sheet: the new one is in, at the same address.'); }
    else { cur.sha = ''; cur.state = 'ok'; props.setProperty('inplace', 'no'); note.log.push(R.course + ' master sheet: Google would not replace its contents; a new sheet is made instead (its address changes).'); }
  }
  if (cur && cur.sha === src.sha) {
    if (cur.state === 'ticks') restore_(R, cur, cx);
    else keep_(R, cur, cx);
    return here();
  }
  if (cx.left() < 30000) { note.again = true; return here(); }
  var xlsx = file_(src.id);
  if (!xlsx) return here();
  var blob = xlsx.getBlob().setContentType(MIME.xlsx), name = R.sheet.replace(/\.xlsx$/, '');

  var safe = true;                                                           // your ticks first
  if (cur && cur.state !== 'ticks') safe = keep_(R, cur, cx);
  if (cur && safe && props.getProperty('inplace') !== 'no') {
    try {
      flag_(SpreadsheetApp.openById(cur.id));
      SpreadsheetApp.flush();
      replace_(cur.id, blob);
      cur.sha = src.sha; cur.state = 'verify'; note.converted++;
      try { if (!flagged_(open_(cur.id))) { cur.state = 'ticks'; props.setProperty('inplace', 'yes'); note.log.push(R.course + ' master sheet: the new one is in, at the same address.'); } } catch (e) { /* looked at again next run */ }
      if (cur.state === 'ticks') restore_(R, cur, cx); else note.again = true;
      return here();
    } catch (e) { note.log.push(R.course + ' master sheet: replacing its contents failed (' + e.message + '); a new sheet is made instead.'); }
  }
  var id = convert_(blob, name, home.getId());
  if (curFile) bin_(curFile, note);
  state[key] = row_(src.sha, id, 'live', 0, 0, 'ticks', R.repo, '');
  note.converted++;
  note.log.push(R.course + ' master sheet: made as a Google Sheet' + (curFile ? ' (a new one; the old one is in the trash)' : '') + '.');
  restore_(R, state[key], cx);
  return here();
}

/** The Google Sheet of that name in the master folder that is a master sheet (it has the Drive tab); the newest, if there are several. */
function liveByName_(home, name) {
  var it = home.getFilesByName(name), best = null;
  while (it.hasNext()) {
    var f = it.next();
    try {
      if (f.isTrashed() || f.getMimeType() !== SHEETS) continue;
      var d = SpreadsheetApp.openById(f.getId()).getSheetByName('Drive');
      if (!d || String(d.getRange(1, 1).getValue()) !== 'windy-hill-drive') continue;
      if (!best || f.getLastUpdated().getTime() > best.getLastUpdated().getTime()) best = f;
    } catch (e) { /* not one of ours */ }
  }
  return best;
}

/** Your marks in a live sheet's IXL tracker (the yellow columns H, I and K), by the lesson they sit on: [[lesson, H, I, K]]. */
function ticksRead_(ss) {
  var sh = ss.getSheetByName('IXL tracker'), out = [], seen = {};
  if (!sh || sh.getLastRow() < 5 || sh.getMaxColumns() < 11) return out;
  sh.getRange(5, 1, sh.getLastRow() - 4, 11).getDisplayValues().forEach(function (r) {
    var l = String(r[2]);
    if (!l) return;
    seen[l] = (seen[l] || 0) + 1;
    if (r[7] !== '' || r[8] !== '' || r[10] !== '') out.push([l + ' #' + seen[l], String(r[7]), String(r[8]), String(r[10])]);
  });
  return out;
}

/** … written back, lesson by lesson. Returns the ones whose lesson has no row any more. */
function ticksWrite_(ss, kept) {
  var sh = ss.getSheetByName('IXL tracker'), by = {}, seen = {};
  kept.forEach(function (t) { by[t[0]] = t; });
  if (sh && sh.getLastRow() >= 5 && sh.getMaxColumns() >= 11) {
    sh.getRange(5, 1, sh.getLastRow() - 4, 11).getDisplayValues().forEach(function (r, k) {
      var l = String(r[2]);
      if (!l) return;
      seen[l] = (seen[l] || 0) + 1;
      var t = by[l + ' #' + seen[l]];
      if (!t) return;
      sh.getRange(5 + k, 8, 1, 2).setValues([[t[1], t[2]]]);
      sh.getRange(5 + k, 11).setValue(t[3]);
      delete by[l + ' #' + seen[l]];
    });
  }
  return Object.keys(by).map(function (k) { return by[k]; });
}

function keptRows_(ss) {
  var sh = ss.getSheetByName('Kept');
  if (!sh || sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, Math.min(5, sh.getLastColumn())).getDisplayValues().map(function (r) { while (r.length < 5) r.push(''); return r.map(String); }).filter(function (r) { return r[0]; });
}

/** Put a live sheet's ticks by on the Kept tab (only written when they have changed). True if they are safe. */
function keep_(R, cur, cx) {
  try {
    var ticks = ticksRead_(SpreadsheetApp.openById(cur.id)), all = keptRows_(cx.ss);
    var mine = all.filter(function (r) { return r[0] === R.course; }).map(function (r) { return r.slice(1); });
    if (JSON.stringify(mine) === JSON.stringify(ticks)) return true;
    var rows = [['Course', 'Lesson', 'Set up in IXL', 'Scores checked', 'Notes']].concat(all.filter(function (r) { return r[0] !== R.course; }), ticks.map(function (t) { return [R.course].concat(t); }));
    write_(sheet_(cx.ss, 'Kept', 9, true), rows, 5);
    return true;
  } catch (e) { cx.note.soon.push(R.course + ': your IXL ticks could not be read from the live sheet (' + e.message + '); a new master sheet will be made beside it rather than over it'); return false; }
}

/** Write the ticks on the Kept tab into a live sheet that has new contents. */
function restore_(R, cur, cx) {
  try {
    var kept = keptRows_(cx.ss).filter(function (r) { return r[0] === R.course; }).map(function (r) { return r.slice(1); });
    if (kept.length) {
      ticksWrite_(open_(cur.id), kept).forEach(function (t) {
        cx.note.log.push(R.course + ': a tick has no row in the new IXL tracker — "' + t[0].replace(/ #\d+$/, '') + '": set up ' + (t[1] || '–') + ', checked ' + (t[2] || '–') + (t[3] ? ', note "' + t[3] + '"' : ''));
      });
    }
    cur.state = 'ok';
  } catch (e) { cx.note.soon.push(R.course + ': your IXL ticks are safe on the Kept tab but could not be written into the new master sheet yet (' + e.message + '); it is tried again each hour'); }
}

// ------------------------------------------------------------------------------------------ the Drive tab

/** Every file in a folder and below it: [{name, id, changed, path, mime}]. */
function walk_(folder, path, out) {
  var fi = folder.getFiles();
  while (fi.hasNext()) { var f = fi.next(); if (!f.isTrashed()) out.push({ name: f.getName(), id: f.getId(), changed: f.getLastUpdated().getTime(), path: path, mime: f.getMimeType() }); }
  var di = folder.getFolders();
  while (di.hasNext()) { var d = di.next(); if (!d.isTrashed()) walk_(d, path + '/' + d.getName(), out); }
  return out;
}

/**
 * code -> Drive id, for everything the master sheets link. A document is filed under its file name
 * when it is named for its course and no other has that name; what sits directly in a unit's folder also under
 * "<unit folder>/<name>"; a unit's folder under its name. Your copy in My versions, by file name
 * (a Google Slides, Docs or Sheets copy stands for the .pptx, .docx or .xlsx), takes the code from ours.
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
  var newest = {};                                  // the published name each of your copies stands for -> your newest copy
  note.mine.forEach(function (f) {
    var stands = f.name, k = key_(f.name);
    if (!(tab[k] && tab[k].what === f.name) && NATIVE[f.mime]) stands = f.name + NATIVE[f.mime];
    f.stands = stands;
    if (!newest[stands] || f.changed > newest[stands].changed) newest[stands] = f;
  });
  var published = {};                               // file name -> when our copy of it arrived
  paths.forEach(function (p) { if (state[p].kind === 'file') published[p.split('/').pop()] = state[p].changed; });
  note.used = []; note.behind = []; note.usedIds = {};
  Object.keys(newest).forEach(function (name) {
    var k = key_(name);
    if (!tab[k] || tab[k].what !== name) return;
    tab[k].id = newest[name].id; note.used.push(name); note.usedIds[newest[name].id] = name;
    if (published[name] > newest[name].changed) note.behind.push(name);   // Claude has published a newer one since you saved yours
  });
  note.clash = clash;
  return tab;
}

// ------------------------------------------------------------------------------------------ the tabs of this spreadsheet

function tabs_(ss, state, tab, masters, extra, cx) {
  var note = cx.note, props = cx.props, keys = Object.keys(tab).sort();
  var body = keys.map(function (k) { return [k, tab[k].id]; }), digest = md5Text_(JSON.stringify(body));
  var changed = props.getProperty('tab') !== digest || !props.getProperty('tab-at') || !ss.getSheetByName('Index');
  var stamp = changed ? iso_(Date.now()) : props.getProperty('tab-at');
  var rows = [['windy-hill-drive', FORMAT, stamp, String(keys.length)]].concat(body);
  note.lines = keys.length;
  // each live master sheet looks its links up in its own Drive tab: written when the list has changed, or the tab is not as it was left
  masters.forEach(function (m) {
    if (!m || m.filling) return;
    try {
      var sh = SpreadsheetApp.openById(m.id).getSheetByName('Drive');
      if (!sh) throw new Error('it has no Drive tab');
      var top = sh.getRange(1, 1, 1, Math.min(4, sh.getMaxColumns())).getValues()[0].map(String);
      if (top[0] === rows[0][0] && top[1] === FORMAT && top[2] === stamp && top[3] === rows[0][3] && sh.getLastRow() === rows.length) return;
      write_(sh, rows, 4);
    } catch (e) { note.errors.push(m.course + ' master sheet: its links could not be refreshed (' + e.message + ')'); }
  });
  if (changed) { write_(sheet_(ss, 'Index', 9, true), rows, 4); props.setProperty('tab', digest); props.setProperty('tab-at', stamp); }
  // My files: what you keep in My files and My versions
  var own = (note.mine || []).concat(walk_(extra, EXTRA, []));
  own.sort(function (a, b) { return (a.path + '/' + a.name) < (b.path + '/' + b.name) ? -1 : 1; });
  var frows = [['Folder', 'File', 'Last changed', 'Open', 'Used by the master sheets']];
  own.forEach(function (f) {
    var mineHere = f.path.indexOf(MINE) === 0, stands = note.usedIds && note.usedIds[f.id];
    frows.push([f.path, f.name, at_(f.changed), '', !mineHere ? '' : !stands ? 'no — its name matches no published document (or a newer copy of yours has the same name)' :
      (note.behind || []).indexOf(stands) >= 0 ? 'yes — the links open this. CLAUDE HAS PUBLISHED A NEWER VERSION SINCE: compare, then update or delete yours' : 'yes — the links open this']);
  });
  var ownDigest = md5Text_(JSON.stringify([frows, own.map(function (f) { return f.id; })]));
  if (props.getProperty('own') !== ownDigest || !ss.getSheetByName('My files')) {
    var mf = sheet_(ss, 'My files', 1);
    write_(mf, frows, 5);
    if (own.length) mf.getRange(2, 4, own.length, 1).setFormulas(own.map(function (f) { return ['=HYPERLINK("https://drive.google.com/file/d/' + f.id + '/view","open")']; }));
    props.setProperty('own', ownDigest);
  }
}

/** Things worth saying that are not failures: the token's date, the account's space, the hourly run. */
function health_(cx) {
  var note = cx.note;
  if (GH_.expires) {
    var days = Math.floor((GH_.expires - Date.now()) / 86400000);
    note.token = 'works until ' + day_(GH_.expires);
    if (days <= 14) note.soon.push('The GitHub token stops working ' + (days <= 0 ? 'today' : days <= 3 ? 'in ' + days + (days === 1 ? ' day' : ' days') : days <= 7 ? 'within a week' : 'within two weeks') +
      ' (' + day_(GH_.expires) + '): make a new one the same way and set it in the menu');
  } else if (GH_.left !== null && !note.errors.some(function (e) { return /refused the token/.test(e); })) note.token = 'works; it has no expiry date';
  try {
    var used = DriveApp.getStorageUsed(), limit = DriveApp.getStorageLimit();
    if (limit > 0) {
      note.space = (used / 1073741824).toFixed(1) + ' GB of ' + Math.round(limit / 1073741824) + ' GB used';
      if (used / limit > 0.85) note.soon.push('This Google account is nearly full (' + note.space + '): empty its Drive trash, or tell Claude');
    }
  } catch (e) { /* not said, then */ }
  try {
    note.hourly = ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'sync'; });
    if (!note.hourly) note.soon.push('The hourly sync is off: menu Windy Hill > Sync every hour (turn on)');
  } catch (e2) { /* not said, then */ }
}

/** The first tab: what a person, or a Claude session, reads to see how things stand. */
function status_(ss, state, masters, cx, started) {
  var note = cx.note, files = Object.keys(state).filter(function (p) { return state[p].kind === 'file'; });
  var st = ss.getSheetByName('Status') || ss.getSheets()[0];
  if (st.getName() !== 'Status') st.setName('Status');
  if (st.getIndex() !== 1) { try { ss.setActiveSheet(st); ss.moveActiveSheet(1); } catch (e) { /* the hourly run has no active sheet to move */ } }
  var said = said_(note);
  var s = [
    [TITLE, 'script v' + VERSION, 'checked ' + at_(Date.now())],
    ['State', said, note.errors.length ? 'the PROBLEM lines say what to do' : said === 'up to date' ? 'nothing for you to do' : 'nothing for you to do: watch it count down']
  ];
  note.errors.forEach(function (e) { s.push(['PROBLEM', e, '']); });
  if (note.more) s.push(['PROBLEM', '… and ' + note.more + ' more of the same', '']);
  note.soon.forEach(function (e) { s.push(['DO SOON', e, '']); });
  (note.behind || []).forEach(function (e) { s.push(['A NEWER VERSION IS PUBLISHED', e, 'your copy in ' + MINE + ' is what the links open: compare, then update or delete yours']); });
  Object.keys(state).sort().forEach(function (p) {
    if (state[p].state === 'yours-behind') s.push(['A NEWER VERSION IS PUBLISHED', p, 'you edited this file in ' + MIRROR + ', so it is left alone: delete it to get the new one']);
  });
  (note.clash || []).forEach(function (e) { s.push(['TELL CLAUDE: two names share a code', e, '']); });
  s.push(['', '', '']);
  (masters || []).forEach(function (m, k) {
    s.push([REPOS[k].course + ' master sheet (live)', m ? REPOS[k].sheet.replace(/\.xlsx$/, '') + (m.filling ? ' — new contents arriving' : '') : 'not made yet', m ? 'https://docs.google.com/spreadsheets/d/' + m.id + '/edit' : '']);
  });
  s.push(['Files in ' + MIRROR, String(files.length), '']);
  s.push(['This run', note.put + ' copied in, ' + note.removed + ' removed, ' + note.restored + ' found missing and queued again' + (note.adopted ? ', ' + note.adopted + ' already there and taken on' : ''), Math.round((Date.now() - started) / 1000) + ' seconds']);
  REPOS.forEach(function (R) { s.push([R.course + ' published at', note.heads[R.course] ? note.heads[R.course].slice(0, 10) : '(not read this run)', '']); });
  s.push(['Lines in the Drive tab', note.lines === null ? '' : String(note.lines), '']);
  s.push(['Your copies the links open', String((note.used || []).length), (note.used || []).slice(0, 50).join(' · ')]);
  s.push(['GitHub token', note.token || (cx.props.getProperty('GITHUB_TOKEN') ? 'see the PROBLEM lines' : 'not set'), GH_.left !== null ? GH_.left + ' requests left this hour' : '']);
  s.push(['Hourly sync', note.hourly === undefined ? '' : note.hourly ? 'on' : 'OFF', '']);
  s.push(['Email alerts', cx.props.getProperty('EMAIL') ? 'on' : 'off (menu Windy Hill > Email me…)', '']);
  if (note.space) s.push(['Space in this Google account', note.space, '']);
  s.push(['', '', '']);
  Object.keys(state).sort().forEach(function (p) {
    var x = state[p];
    if (x.kind === 'theirs' && p.indexOf('Apps:') === 0) s.push(['Your own copy in Apps', p.slice(5), 'it is not the published console: delete it and the script keeps this console current']);
    else if (x.kind === 'theirs') s.push(['Your own file, in a published one\'s place', p, 'the links open yours: delete it, or move it to ' + MINE + ', and the published one comes back']);
    else if (x.state === 'yours-unpublished') s.push(['Edited by you, kept', p, 'no longer published by Claude']);
  });
  write_(st, s, 3);
  dress_(st, s, cx);
}

/** Make the Status tab easy to read. Looks only: if any of it fails, the words are still there. */
function dress_(st, s, cx) {
  try {
    var n = s.length;
    st.getRange(1, 1, n, 3).setFontWeight('normal').setFontColor('#202124').setBackground('#ffffff').setFontSize(10).setWrap(true).setVerticalAlignment('top');
    st.getRange(1, 1, 1, 3).setFontWeight('bold').setFontSize(13);
    st.getRange(1, 2, 1, 2).setFontWeight('normal').setFontSize(10).setFontColor('#5f6368');
    var good = s[1][1] === 'up to date', bad = s[1][1] === 'NEEDS A LOOK';
    st.getRange(2, 1, 1, 3).setFontWeight('bold').setFontSize(12).setBackground(bad ? '#f4c7c3' : good ? '#d9ead3' : '#fff2cc');
    for (var i = 2; i < n; i++) {
      var label = s[i][0];
      if (label === 'PROBLEM' || label.indexOf('TELL CLAUDE') === 0) st.getRange(i + 1, 1, 1, 3).setFontColor('#a50e0e').setFontWeight('bold');
      else if (label === 'DO SOON' || label === 'A NEWER VERSION IS PUBLISHED') st.getRange(i + 1, 1, 1, 3).setFontColor('#b06000').setFontWeight('bold');
      else if (label) st.getRange(i + 1, 1).setFontColor('#5f6368');
    }
    if (cx.props.getProperty('dressed') !== String(VERSION)) {
      st.setColumnWidth(1, 250); st.setColumnWidth(2, 480); st.setColumnWidth(3, 520); st.setFrozenRows(1);
      cx.props.setProperty('dressed', String(VERSION));
    }
  } catch (e) { /* plain, then */ }
}

/** Write to you when something has needed a look for most of an hour; and once more when it is well again. */
function alert_(ss, cx) {
  var props = cx.props, note = cx.note, to = props.getProperty('EMAIL'), now = Date.now();
  var lines = note.errors.map(function (e) { return 'PROBLEM: ' + e; }).concat(note.soon.map(function (e) { return 'DO SOON: ' + e; }));
  if (!lines.length) {
    if (props.getProperty('mailed') && to) { try { MailApp.sendEmail(to, 'Windy Hill: back to normal', 'Everything the last message spoke of is settled.\n\n' + ss.getUrl()); } catch (e) { /* no matter */ } }
    props.deleteProperty('trouble'); props.deleteProperty('mailed');
    return;
  }
  var since = Number(props.getProperty('trouble') || 0);
  if (!since) { props.setProperty('trouble', String(now)); return; }          // first seen now: most things mend themselves within the hour
  if (!to || now - since < 45 * 60000) return;
  var digest = md5Text_(lines.join('\n')), last = (props.getProperty('mailed') || '|0').split('|'), ago = now - Number(last[1]);
  if (ago < 6 * 3600000) return;                                              // never more than one in six hours
  if (last[0] === digest && ago < (note.errors.length ? 24 : 72) * 3600000) return;   // the same thing: once a day; a "do soon": every three days
  try {
    MailApp.sendEmail(to, 'Windy Hill: ' + (note.errors.length ? 'something needs a look' : 'something to do soon'),
      lines.join('\n\n') + '\n\nThe Status tab has the rest:\n' + ss.getUrl() + '\n\n(From the Windy Hill script in your Google account. To stop these: menu Windy Hill > Email me…, and empty the box.)');
    props.setProperty('mailed', digest + '|' + now);
  } catch (e2) { note.log.push('An email could not be sent (' + e2.message + ').'); }
}

/** The Activity tab: what happened, newest first. A quiet run writes nothing. */
function log_(ss, cx) {
  var note = cx.note, props = cx.props, lines = note.log.slice();
  var did = [];
  if (note.put) did.push(note.put + ' copied in');
  if (note.adopted) did.push(note.adopted + ' already there and taken on');
  if (note.removed) did.push(note.removed + ' removed');
  if (note.restored) did.push(note.restored + ' found missing and queued again');
  if (did.length) lines.unshift(did.join(', ') + (note.todo ? '; ' + note.todo + ' still to come' : '') + '.');
  if (note.paused) lines.push('Paused: ' + note.paused + '.');
  var trouble = note.errors.length ? md5Text_(note.errors.join('\n')) : '';
  if (trouble !== (props.getProperty('logged') || '')) {
    if (trouble) note.errors.forEach(function (e) { lines.push('PROBLEM: ' + e); }); else lines.push('The problems are cleared.');
    props.setProperty('logged', trouble);
  }
  if (!lines.length) return;
  var sh = sheet_(ss, 'Activity', 2), old = [];
  if (sh.getLastRow() >= 2) old = sh.getRange(2, 1, sh.getLastRow() - 1, Math.min(2, sh.getLastColumn())).getDisplayValues().map(function (r) { return [String(r[0]), String(r[1] === undefined ? '' : r[1])]; });
  var when = at_(Date.now());
  var rows = [['When', 'What happened']].concat(lines.map(function (l) { return [when, l]; }), old).slice(0, LOG_LINES + 1);
  write_(sh, rows, 2);
  if (props.getProperty('logged-look') !== String(VERSION)) {
    try { sh.setColumnWidth(1, 150); sh.setColumnWidth(2, 900); sh.setFrozenRows(1); sh.getRange(1, 1, 1, 2).setFontWeight('bold'); props.setProperty('logged-look', String(VERSION)); } catch (e) { /* plain, then */ }
  }
}
