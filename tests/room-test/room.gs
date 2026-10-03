// Windmill room — Apps Script web app behind a Google Sheet (test 3, and later the live road).
// Setup, on the laptop: new Google Sheet in your school Drive → Extensions → Apps Script → paste this →
// Deploy → New deployment → Web app → Execute as: Me · Who has access: Anyone with the link → Deploy.
// Copy the Web app URL into script-test.html where marked. Change KEY to a long random string first
// and put the same string in script-test.html.
var KEY = 'change-me-to-a-long-random-string';
var PARTS = ['plan', 'tally', 'panel', 'log'];           // the roster part rides this road only encrypted (later)

function sheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet(), sh = ss.getSheetByName('room') || ss.insertSheet('room');
  if (sh.getLastRow() === 0) sh.appendRow(['part', 'json', 'updated']);
  return sh;
}
function readRoom_() {
  var rows = sheet_().getDataRange().getValues(), room = { v: 1 };
  for (var i = 1; i < rows.length; i++) if (rows[i][0] && rows[i][1]) { try { room[rows[i][0]] = JSON.parse(rows[i][1]); } catch (e) {} }
  return room;
}
function writePart_(part, value) {
  var sh = sheet_(), rows = sh.getDataRange().getValues(), now = new Date().toISOString();
  for (var i = 1; i < rows.length; i++) if (rows[i][0] === part) { sh.getRange(i + 1, 2, 1, 2).setValues([[JSON.stringify(value), now]]); return; }
  sh.appendRow([part, JSON.stringify(value), now]);
}
function out_(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }

function doGet(e) {
  if (!e || !e.parameter || e.parameter.k !== KEY) return out_({ error: 'no' });
  var room = readRoom_(); room.servedAt = new Date().toISOString();
  return out_(room);
}
function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents || '{}');
    if (body.k !== KEY) return out_({ error: 'no' });
    var written = [];
    PARTS.forEach(function (p) {
      if (!body[p]) return;
      if (p === 'log') { var log = readRoom_().log || []; writePart_('log', log.concat(body.log).slice(-500)); }
      else writePart_(p, body[p]);
      written.push(p);
    });
    return out_({ ok: true, written: written, at: new Date().toISOString() });
  } catch (err) { return out_({ error: String(err) }); }
}
