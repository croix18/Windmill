/**
 * Windy Hill — Drive index (version 1, 4 October 2026)
 *
 * WHAT IT DOES
 * Lists the course documents in your Google Drive — every file whose name starts with "A7 " or
 * "M7 ", and the unit folders ("A7 Unit 3 - …", "M7 Unit 4 - …") with what sits directly inside
 * them — and writes each one's Drive address into THIS spreadsheet. The master sheets are then
 * built with links that open the document itself in one tap.
 *
 * WHAT IT TOUCHES
 * It reads names, dates and addresses. It writes only into this spreadsheet. It does not open,
 * change, move, share or delete any file. (Google's permission screen asks for more than that —
 * "see, edit, create and delete all of your Drive files" — because that is the only permission a
 * script that looks through Drive can ask for. The code below is the whole script.)
 *
 * HOW TO USE IT (once, on a laptop, signed in to the Google account that owns the Windy Hill folder)
 * 1. Open the spreadsheet "Windy Hill Drive Index". Menu Extensions > Apps Script.
 * 2. Delete whatever is in the editor, paste this whole file, and press Save (the disk icon).
 * 3. In the bar above the code, pick "refresh" in the list of functions (it may say "onOpen"),
 *    then press Run. Google asks for permission: Review permissions > your account > "Advanced" >
 *    "Go to … (unsafe)" > Allow. (It says "unsafe" of every script Google has not reviewed,
 *    including your own.) It runs for under a minute.
 * 4. Back in the spreadsheet, reload the page. A "Windy Hill" menu appears: choose
 *    "Refresh every hour (turn on)" so the index follows your uploads by itself.
 * 5. Tell Claude it is done. The Status tab shows what was found.
 *
 * THE TABS
 * Index   — one short line per document: a code made from its name, its Drive address, and how
 *           many files have that name. This is the tab a Claude session reads. Leave it first.
 * Files   — the same documents in words: name, last changed, size, address.
 * Status  — when it last ran, how much it found, and any names that exist more than once.
 */

var VERSION = 1;
var COURSE = /^(A7|M7) /;                       // a course document's name
var UNIT = /^(A7|M7) Unit \d+ - /;              // a unit's folder
var KEEP = /\.(pdf|pptx|md|docx)$/i;            // what the master sheets link to
var NOT_SHORTCUT = " and mimeType != 'application/vnd.google-apps.shortcut'";   // a shortcut has its target's name and no file behind it
var QUERY = "trashed = false and (title contains 'A7' or title contains 'M7')" + NOT_SHORTCUT;
var UNIT_QUERY = "trashed = false and title contains 'Unit' and (title contains 'A7' or title contains 'M7')" + NOT_SHORTCUT;

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Windy Hill')
    .addItem('Refresh the index now', 'refresh')
    .addItem('Refresh every hour (turn on)', 'everyHour')
    .addItem('Stop refreshing every hour', 'stopHourly')
    .addToUi();
}

/** The code a name is filed under: the first 12 hex digits of the MD5 of the name, after a "k". */
function key_(name) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, String(name).normalize('NFC'), Utilities.Charset.UTF_8);
  var hex = 'k';
  for (var i = 0; i < 6; i++) {
    var b = bytes[i] & 0xff;                    // the digest comes back as signed bytes
    hex += (b < 16 ? '0' : '') + b.toString(16);
  }
  return hex;
}

function iso_(ms) {
  return Utilities.formatDate(new Date(ms), 'UTC', "yyyy-MM-dd'T'HH:mm'Z'");
}

/** Every course file in Drive that is not in the trash. */
function listFiles_() {
  var out = [], it = DriveApp.searchFiles(QUERY);
  while (it.hasNext()) {
    var f = it.next(), name = f.getName();
    if (!COURSE.test(name)) continue;
    out.push({ name: name, id: f.getId(), updated: f.getLastUpdated().getTime(), size: f.getSize() });
  }
  return out;
}

/** Every unit folder, with the files and folders directly inside it. */
function listUnits_() {
  var out = [], it = DriveApp.searchFolders(UNIT_QUERY);
  while (it.hasNext()) {
    var d = it.next(), name = d.getName();
    if (!UNIT.test(name)) continue;
    var unit = { name: name, id: d.getId(), stamp: d.getLastUpdated().getTime(), files: [], folders: [] };
    var fi = d.getFiles();
    while (fi.hasNext()) {
      var f = fi.next();
      if (f.isTrashed()) continue;
      var t = f.getLastUpdated().getTime();
      unit.files.push({ name: f.getName(), id: f.getId(), updated: t, size: f.getSize() });
      if (t > unit.stamp) unit.stamp = t;       // a unit folder is as new as the newest file in it
    }
    var di = d.getFolders();
    while (di.hasNext()) {
      var s = di.next();
      if (s.isTrashed()) continue;
      unit.folders.push({ name: s.getName(), id: s.getId() });
    }
    out.push(unit);
  }
  return out;
}

/**
 * The index: {key: {id, t, n, what}}. A name that exists more than once keeps its newest copy,
 * and n says how many there are.
 */
function build_(files, units) {
  var best = {}, clash = [];
  function offer(what, id, t) {
    var k = key_(what), b = best[k];
    if (!b) { best[k] = { id: id, t: t, n: 1, what: what }; return; }
    if (b.what !== what) { clash.push(what + '  /  ' + b.what); return; }   // two names, one code: never seen, reported if it happens
    if (b.id === id) return;
    b.n++;
    if (t > b.t) { b.id = id; b.t = t; }
  }
  var hasPdf = {};
  files.forEach(function (f) { if (/\.pdf$/i.test(f.name)) hasPdf[f.name.replace(/\.pdf$/i, '')] = true; });
  files.forEach(function (f) {
    if (!KEEP.test(f.name)) return;
    if (/\.docx$/i.test(f.name) && hasPdf[f.name.replace(/\.docx$/i, '')]) return;   // the PDF is the one linked
    offer(f.name, f.id, f.updated);
  });
  units.forEach(function (u) {
    offer(u.name, u.id, u.stamp);
    u.files.forEach(function (f) { if (KEEP.test(f.name)) offer(u.name + '/' + f.name, f.id, f.updated); });
    u.folders.forEach(function (s) { offer(u.name + '/' + s.name, s.id, u.stamp); });
  });
  return { best: best, clash: clash };
}

function sheet_(ss, name, position) {
  var sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name, position);
  return sh;
}

function write_(sh, rows, width) {
  sh.clearContents();
  if (sh.getMaxRows() < rows.length) sh.insertRowsAfter(sh.getMaxRows(), rows.length - sh.getMaxRows());
  if (sh.getMaxColumns() < width) sh.insertColumnsAfter(sh.getMaxColumns(), width - sh.getMaxColumns());
  var range = sh.getRange(1, 1, rows.length, width);
  range.setNumberFormat('@');                   // plain text: a code or an address is never read as a number
  range.setValues(rows.map(function (r) { r = r.slice(); while (r.length < width) r.push(''); return r.map(String); }));
}

function refresh() {
  var started = Date.now();
  var files = listFiles_(), units = listUnits_();
  var built = build_(files, units), best = built.best;
  var keys = Object.keys(best).sort();
  var now = iso_(Date.now());
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // Index — the first tab; what a session reads
  var index = ss.getSheetByName('Index') || ss.getSheets()[0];
  if (index.getName() !== 'Index') index.setName('Index');
  if (index.getIndex() !== 1) {
    try { ss.setActiveSheet(index); ss.moveActiveSheet(1); } catch (e) { /* the hourly run has no active sheet to move */ }
  }
  var rows = [['windy-hill-index', 'v' + VERSION, now, String(keys.length)]];
  keys.forEach(function (k) { rows.push([k, best[k].id, best[k].n > 1 ? String(best[k].n) : '']); });
  write_(index, rows, 4);

  // Files — the same, readable
  var count = {};
  files.forEach(function (f) { count[f.name] = (count[f.name] || 0) + 1; });
  var frows = [['name', 'last changed (UTC)', 'size', 'copies with this name', 'address']];
  files.slice().sort(function (a, b) { return a.name < b.name ? -1 : a.name > b.name ? 1 : b.updated - a.updated; })
    .forEach(function (f) { frows.push([f.name, iso_(f.updated), String(f.size), String(count[f.name]), f.id]); });
  units.forEach(function (u) { frows.push([u.name + '/', iso_(u.stamp), '', '', u.id]); });
  write_(sheet_(ss, 'Files', 1), frows, 5);

  // Status
  var twice = Object.keys(count).filter(function (n) { return count[n] > 1; }).sort();
  var srows = [
    ['Windy Hill Drive index', 'version ' + VERSION],
    ['Last refreshed (UTC)', now],
    ['Course files found', String(files.length)],
    ['Unit folders found', units.map(function (u) { return u.name; }).sort().join(' · ') || 'none'],
    ['Lines in the Index tab', String(keys.length)],
    ['Names that exist more than once', String(twice.length) + (twice.length ? ' — the newest copy is the one linked; delete the others when you can' : '')],
    ['Seconds it took', String(Math.round((Date.now() - started) / 1000))],
    ['', '']
  ];
  twice.slice(0, 200).forEach(function (n) { srows.push(['more than once', n + '  ×' + count[n]]); });
  built.clash.forEach(function (c) { srows.push(['TELL CLAUDE: two names share a code', c]); });
  write_(sheet_(ss, 'Status', 2), srows, 2);

  try { ss.toast(files.length + ' files, ' + units.length + ' unit folders', 'Windy Hill index refreshed', 8); } catch (e) { /* no one is looking: the hourly run */ }
}

function everyHour() {
  stopHourly();
  ScriptApp.newTrigger('refresh').timeBased().everyHours(1).create();
  SpreadsheetApp.getActiveSpreadsheet().toast('The index now refreshes every hour.', 'Windy Hill', 8);
}

function stopHourly() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'refresh') ScriptApp.deleteTrigger(t);
  });
}
