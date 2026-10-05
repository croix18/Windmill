/* drive/WindyHill.gs, run end to end against stand-ins for Google and GitHub.
 *
 *   node drive/test_windyhill.js [<a7 repo>] [<m7 repo>]   (defaults: ../croix18-windy-hill-a7 and ../windy-hill-m7 beside
 *                                                          this one; without them, the paths kept in fixtures/packages.json)
 *
 * Nothing here reaches Google or GitHub. The script is given fakes that behave as the real services
 * do in the ways it relies on:
 *   - a Drive (folders, files, the trash, modified times, files of the same name side by side);
 *   - a spreadsheet whose cells turn text into numbers unless they are plain text;
 *   - a GitHub that serves what the two course repositories publish at their newest commit (the
 *     real lists of paths and blob names; small stand-in contents, so the test is quick), and can
 *     be told to publish a new commit, refuse a token, hide a repository, fail one download or cut
 *     a list short;
 *   - the Drive service that turns an .xlsx into a Google Sheet (both of its versions, and absent);
 *   - a clock that every operation moves, so the six-minute limit is real;
 *   - triggers, the lock, the private settings, the menu's dialogs.
 * It then lives through a year in small: the first copy over several runs; an hour with nothing new;
 * a new commit (a deck rebuilt, a file added, one withdrawn, a new master sheet — with his IXL ticks
 * carried across); his own copy in My versions; a file he edits in place; his own console in Apps;
 * a file he deletes; every way GitHub can say no. After each it checks what Drive holds, what the
 * Status tab says, and that nothing of his was touched.
 *
 * With the course repositories present it also holds the script to the workbooks: every code a
 * master sheet looks up (drive/codes.py reads them out of its Links tab) is in the tab the script
 * writes, and the Drive file it gives is the one the workbook's fallback names.
 *
 * What it cannot show is that Google's services answer as the fakes do. The first real run is the
 * test of that; the Status tab is what to read.
 */
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto'), { execFileSync } = require('child_process');
const HERE = __dirname;
const ARGS = process.argv.slice(2).filter(a => !a.startsWith('--'));
const A7 = ARGS[0] || path.join(HERE, '..', '..', 'croix18-windy-hill-a7');
const M7 = ARGS[1] || path.join(HERE, '..', '..', 'windy-hill-m7');
const FIXTURE = path.join(HERE, 'fixtures', 'packages.json');
const live = fs.existsSync(path.join(A7, '.git')) && fs.existsSync(path.join(M7, '.git'));
let checks = 0; const bad = [];
function ok(cond, msg) { checks++; if (!cond && bad.length < 60) bad.push(msg); }
const sha1 = s => crypto.createHash('sha1').update(s).digest('hex');
const pyKey = name => 'k' + crypto.createHash('md5').update(Buffer.from(name.normalize('NFC'), 'utf8')).digest('hex').slice(0, 12);

// ---------------------------------------------------------------- what the repositories publish
function git(repo, ...a) { return execFileSync('git', ['-C', repo, ...a], { encoding: 'utf8', maxBuffer: 1 << 28 }); }
function listed(repo, sub) {       // [{path (inside sub), sha, size}] at HEAD
  return git(repo, 'ls-tree', '-r', '-l', '-z', 'HEAD', sub).split('\0').filter(Boolean).map(l => {
    const [meta, p] = l.split('\t'); const [, , sha, size] = meta.split(/\s+/);
    return { path: p.slice(sub.length + 1), sha, size: Number(size) };
  });
}
if (process.argv.includes('--write-fixture')) {
  if (!live) throw new Error('the course repositories are not here');
  fs.mkdirSync(path.dirname(FIXTURE), { recursive: true });
  fs.writeFileSync(FIXTURE, JSON.stringify({ 'a7/packages': listed(A7, 'a7/packages').map(e => 'a7/packages/' + e.path), 'm7/packages': listed(M7, 'm7/packages').map(e => 'm7/packages/' + e.path) }));
  console.log('wrote', FIXTURE); process.exit(0);
}
const kept = live ? null : JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
const SPEC = [
  { course: 'A7', repo: 'croix18-windy-hill-a7', dir: A7, packages: 'a7/packages', sheetDir: 'a7/reference', sheet: 'A7 Master Sheet 2026-27.xlsx' },
  { course: 'M7', repo: 'windy-hill-m7', dir: M7, packages: 'm7/packages', sheetDir: 'm7/reference', sheet: 'M7 Master Sheet 2026-27.xlsx' },
];
// A published file here is a small stand-in for the real one, named as git names it: by the SHA-1 of
// "blob <length>\0<bytes>". The script holds every download to that name, so the stand-ins must be honest.
const BODY = {};                                    // git name -> the bytes
const gitSha = buf => sha1(Buffer.concat([Buffer.from('blob ' + buf.length + '\0'), buf]));
const mk = (seed, size) => { const body = Buffer.from('content of ' + seed); const sha = gitSha(body); BODY[sha] = body; return { sha, size }; };
// the fake GitHub's model of a repository: {head, blobs: {path in packages: {sha, size}}, sheet: {sha, size}}
const HUB = {};
for (const S of SPEC) {
  const blobs = {};
  if (live) for (const e of listed(S.dir, S.packages)) blobs[e.path] = mk(e.sha, e.size);          // the real paths and sizes
  else for (const p of kept[S.packages]) blobs[p.slice(S.packages.length + 1)] = mk('blob ' + p, 20000 + (p.length * 7919) % 900000);
  HUB[S.repo] = { head: sha1('head 1 ' + S.repo), blobs, sheet: mk('sheet 1 ' + S.repo, 180000), spec: S };
}
function publish(repo, change) { change(HUB[repo]); HUB[repo].head = sha1(HUB[repo].head + ' next'); }

// ---------------------------------------------------------------- the clock
let NOW = Date.UTC(2026, 9, 5, 12, 0, 0);
const tick = ms => { NOW += ms; };
class FakeDate extends Date { constructor(...a) { if (a.length) super(...a); else super(NOW); } static now() { return NOW; } }

// ---------------------------------------------------------------- a fake Drive
// Files the test makes belong to HIM (owner 'him'): this account may read, describe and rename them but
// not bin them, as in the real folder (it is his; this account is an editor). What the script makes is 'me'.
let nextId = 0;
const newId = () => '1' + sha1('id' + (nextId++)).slice(0, 20) + (nextId % 7 === 0 ? '-_' : 'xy') + 'AbCdEfGhIj';
const ALL = {};
const DRIVE = { failCreate: null, blind: false, used: 2 * 2 ** 30, creates: 0 };
let KILL = null;                                     // {after: n}: the run is "killed" just after its n-th file is created
function mkFolder(name, parent, owner) { const d = { kind: 'folder', name, id: newId(), parent, trashed: false, updated: NOW, children: [], owner: owner || 'him' }; if (parent) parent.children.push(d); ALL[d.id] = d; return d; }
function mkFile(name, parent, bytes, mime, owner) { const f = { kind: 'file', name, id: newId(), parent, trashed: false, updated: NOW, bytes: bytes || Buffer.alloc(0), mime: mime || 'application/octet-stream', description: '', owner: owner || 'him' }; parent.children.push(f); ALL[f.id] = f; return f; }
const iter = list => { let i = 0; return { hasNext: () => i < list.length, next: () => list[i++] }; };
const gone = x => { for (let d = x; d; d = d.parent) if (d.trashed) return true; return false; };
const signed = buf => Array.from(buf, b => (b > 127 ? b - 256 : b));          // bytes as Apps Script hands them over
function blobOf(bytes, mime, name) { const b = { bytes: Buffer.from(bytes), mime, name, getBytes: () => signed(b.bytes), getContentType: () => b.mime, getName: () => b.name, setContentType: m => { b.mime = m; return b; } }; return b; }
function wrap(x) {
  const base = {
    getName: () => x.name, getId: () => x.id, isTrashed: () => gone(x), getLastUpdated: () => new FakeDate(x.updated),
    setTrashed: t => { tick(150); if (x.owner !== 'me') throw new Error('Access denied: DriveApp.'); x.trashed = t; return base; },
    setName: n => { tick(100); x.name = n; x.updated = NOW; return base; },
  };
  if (x.kind === 'folder') Object.assign(base, {
    getFoldersByName: n => iter(x.children.filter(c => c.kind === 'folder' && c.name === n).map(wrap)),
    getFilesByName: n => iter(x.children.filter(c => c.kind === 'file' && c.name === n).map(wrap)),
    getFiles: () => { tick(120); return iter(x.children.filter(c => c.kind === 'file').map(wrap)); },          // trashed ones too, as the real one does
    getFolders: () => { tick(120); return iter(x.children.filter(c => c.kind === 'folder').map(wrap)); },
    createFolder: n => { tick(400); return wrap(mkFolder(n, x, 'me')); },
    createFile: b => {
      if (DRIVE.failCreate) { const F = DRIVE.failCreate; if (F.skip > 0) F.skip--; else if (F.times > 0) { F.times--; tick(300); throw new Error(F.message); } }
      tick(600 + b.getBytes().length / 2000); DRIVE.creates++;
      const f = mkFile(b.getName(), x, Buffer.from(b.getBytes()), b.getContentType(), 'me');
      if (KILL && !KILL.snap && --KILL.after === 0) KILL.snap = snapshot();                                      // … and here Google stops the run
      return wrap(f);
    },
  });
  else Object.assign(base, {
    getSize: () => x.bytes.length, getMimeType: () => x.mime, getParents: () => iter(x.parent ? [wrap(x.parent)] : []),
    getBlob: () => { tick(60); return blobOf(x.bytes, x.mime, x.name); },
    getDescription: () => { tick(30); return x.description; },
    setDescription: d => { tick(100); x.description = d; x.updated = NOW; return base; },
  });
  return base;
}
const ROOT = mkFolder('My Drive', null);
const HOME_ID = '1wodkpowCt32TQY_kiTpmcO4sn0Yh3Prb';                          // the address the script knows his folder by
const DriveApp = {
  getFoldersByName: n => iter(DRIVE.blind ? [] : Object.values(ALL).filter(x => x.kind === 'folder' && x.name === n).map(wrap)),
  getFileById: id => { tick(110); const x = ALL[id]; if (!x || x.kind !== 'file') throw new Error('no such file'); return wrap(x); },
  getFolderById: id => { tick(110); const x = ALL[id]; if (!x || x.kind !== 'folder' || (DRIVE.blind && id === HOME_ID)) throw new Error('no such folder'); return wrap(x); },
  getStorageUsed: () => DRIVE.used, getStorageLimit: () => 15 * 2 ** 30,
};
const at = p => { let d = ROOT; for (const n of p.split('/')) { d = d && d.children.find(c => c.name === n && !c.trashed); } return d || null; };
const allAt = (dir, name) => dir.children.filter(c => c.name === name && !c.trashed);
const pathOf = x => { const p = []; for (let d = x; d && d !== ROOT; d = d.parent) p.unshift(d.name); return p.join('/'); };
const WH = 'Windy Hill Master Folder', MIR = WH + '/From Claude/';
const M = p => at(MIR + p);

// his Drive before the script ever runs
mkFolder(WH, mkFolder('Old stuff', ROOT));                                    // another folder of the same name, made earlier, without Apps
const wh = mkFolder(WH, ROOT), apps = mkFolder('Apps', wh);
delete ALL[wh.id]; wh.id = HOME_ID; ALL[HOME_ID] = wh;
const his = [
  mkFile('Deckhand.html', apps, Buffer.from('his tool')),
  mkFile('M7 Unit 4 Area - All Slides.html', apps, Buffer.from('a console he uploaded by hand last week')),
  mkFile('M7 4.06 Finding Circumference - Slides.pdf', mkFolder('4.06', mkFolder('M7', wh)), Buffer.from('an old copy he uploaded by hand')),
  mkFile('seating chart.xlsx', wh, Buffer.from('his')),
];
const untouched = () => his.map(f => [f.id, f.name, f.parent.id, f.trashed, f.updated, f.bytes.toString(), f.description].join('|')).join('\n');
const before = untouched();

// ---------------------------------------------------------------- fake spreadsheets
function asTyped(v) {
  if (typeof v !== 'string') return v;
  if (/^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(v.trim()) && v.trim() !== '') return Number(v);
  if (/^[=+-]/.test(v)) return '#ERROR!';
  return v;
}
const LOOKS = ['setFontWeight', 'setFontColor', 'setBackground', 'setFontSize', 'setWrap', 'setVerticalAlignment'];   // the Range methods the script may use to dress a tab
function Book(names, id) {
  const B = { sheets: [], toasts: [], active: null, id: id || 'HUB' };
  function Sheet(name) {
    const sh = { name, rows: 3, cols: 2, cells: {}, fmt: {}, formulas: {}, look: {}, hidden: false, widths: {}, frozen: 0 };
    const filled = () => Object.keys(sh.cells).filter(k => sh.cells[k] !== '' && sh.cells[k] !== null && sh.cells[k] !== undefined);
    const api = {
      _: sh,
      getName: () => sh.name, setName: n => { if (B.sheets.some(s => s !== api && s._.name === n)) throw new Error('a sheet named ' + n + ' exists'); sh.name = n; },
      getIndex: () => B.sheets.indexOf(api) + 1,
      clearContents: () => { tick(200); sh.cells = {}; sh.formulas = {}; },
      getMaxRows: () => sh.rows, getMaxColumns: () => sh.cols,
      getLastRow: () => filled().reduce((m, k) => Math.max(m, Number(k.split(',')[0])), 0),
      getLastColumn: () => filled().reduce((m, k) => Math.max(m, Number(k.split(',')[1])), 0),
      insertRowsAfter: (a, n) => { sh.rows += n; }, insertColumnsAfter: (a, n) => { sh.cols += n; },
      hideSheet: () => { if (B.sheets.filter(s => !s._.hidden).length <= 1) throw new Error('You can\'t hide all the sheets in a document'); sh.hidden = true; },
      isSheetHidden: () => sh.hidden,
      setColumnWidth: (c, w) => { if (!(c >= 1 && c <= sh.cols)) throw new Error('no such column'); sh.widths[c] = w; },
      setFrozenRows: n => { sh.frozen = n; },
      getRange: (r, c, nr, nc) => {
        nr = nr || 1; nc = nc || 1;
        const inside = () => { if (!(r >= 1 && c >= 1 && nr >= 1 && nc >= 1) || r + nr - 1 > sh.rows || c + nc - 1 > sh.cols) throw new Error('the range is outside the sheet'); };
        const put = (vals, typed) => {
          inside(); tick(300);
          if (vals.length !== nr || vals.some(v => v.length !== nc)) throw new Error('the data does not match the range');
          for (let i = 0; i < nr; i++) for (let j = 0; j < nc; j++) { const k = (r + i) + ',' + (c + j); sh.cells[k] = typed && sh.fmt[k] !== '@' ? asTyped(vals[i][j]) : vals[i][j]; }
        };
        const read = () => { inside(); tick(200); const out = []; for (let i = 0; i < nr; i++) { const row = []; for (let j = 0; j < nc; j++) row.push(sh.cells[(r + i) + ',' + (c + j)] ?? ''); out.push(row); } return out; };
        const range = {
          setNumberFormat: f => { inside(); for (let i = 0; i < nr; i++) for (let j = 0; j < nc; j++) sh.fmt[(r + i) + ',' + (c + j)] = f; return range; },
          setValues: v => { put(v, true); return range; }, setValue: v => { put([[v]], true); return range; },
          setFormulas: v => { put(v, false); for (let i = 0; i < nr; i++) sh.formulas[(r + i) + ',' + c] = v[i][0]; return range; },
          getValues: read, getValue: () => read()[0][0], getDisplayValues: () => read().map(row => row.map(String)),
        };
        for (const m of LOOKS) range[m] = v => { inside(); for (let i = 0; i < nr; i++) for (let j = 0; j < nc; j++) { const k = (r + i) + ',' + (c + j); (sh.look[k] = sh.look[k] || {})[m] = v; } return range; };
        return range;
      },
      table: () => { const out = []; const last = api.getLastRow(); for (let i = 1; i <= last; i++) { const row = []; for (let j = 1; j <= sh.cols; j++) row.push(sh.cells[i + ',' + j] ?? ''); out.push(row); } return out; },
    };
    return api;
  }
  const api = {
    _: B,
    getSheets: () => B.sheets.slice(), getSheetByName: n => B.sheets.find(s => s._.name === n) || null,
    insertSheet: (n, pos) => { if (!(pos >= 0 && pos <= B.sheets.length)) throw new Error('the sheet index is out of range'); const s = Sheet(n); B.sheets.splice(pos, 0, s); return s; },
    setActiveSheet: s => { B.active = s; }, moveActiveSheet: pos => { B.sheets.splice(B.sheets.indexOf(B.active), 1); B.sheets.splice(pos - 1, 0, B.active); },
    toast: (m, t) => B.toasts.push(t + ': ' + m),
    getUrl: () => 'https://docs.google.com/spreadsheets/d/' + B.id + '/edit', getId: () => B.id,
  };
  names.forEach(n => B.sheets.push(Sheet(n)));
  return api;
}
const HUBSHEET = Book(['Untitled']);
HUBSHEET.getSheets()[0]._.cells['1,1'] = 'Windy Hill Drive Index — the script has not run yet';   // what a session left in it
const BOOKS = {};                                  // the live master sheets, by Drive id
const dialogs = { answer: null, alerts: [] };
const SpreadsheetApp = {
  getActiveSpreadsheet: () => HUBSHEET,
  openById: id => { tick(500); const x = ALL[id]; if (!BOOKS[id] || !x || gone(x)) throw new Error('no such spreadsheet'); return BOOKS[id]; },
  flush: () => {},
  getUi: () => ({
    ButtonSet: { OK_CANCEL: 1 }, Button: { OK: 'OK', CANCEL: 'CANCEL' },
    createMenu: () => { const m = { addItem: (label, fn) => { MENU.push(fn); return m; }, addSeparator: () => m, addToUi: () => {} }; return m; },
    prompt: () => ({ getSelectedButton: () => dialogs.answer === null ? 'CANCEL' : 'OK', getResponseText: () => dialogs.answer }),
    alert: t => { dialogs.alerts.push(t); },
  }),
};
const MENU = [];
const SHEETS = 'application/vnd.google-apps.spreadsheet', XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
let LESSONS = ['4.01–4.02 Deriving', '4.04 Composite', '4.05–4.06 Circles', '4.07 Radius'];     // the rows of the IXL tracker a conversion produces
function freshBook(id) {                            // what Google makes of a master sheet's .xlsx: the Drive tab as the course tools leave it
  const book = Book(['Today', 'IXL tracker', 'Links', 'Drive'], id);
  const ixl = book.getSheetByName('IXL tracker'); ixl._.rows = 6 + LESSONS.length; ixl._.cols = 11;
  LESSONS.forEach((l, k) => { ixl._.cells[(5 + k) + ',1'] = k + 1; ixl._.cells[(5 + k) + ',3'] = l; });
  const d = book.getSheetByName('Drive'); d._.cols = 4; d._.hidden = true; book.getSheetByName('Links')._.hidden = true;
  Object.assign(d._.cells, { '1,1': 'windy-hill-drive', '1,2': 'v2', '1,3': 'not filled yet: the Windy Hill script in your Google account fills this tab every hour', '1,4': 0 });
  return book;
}
const sheetBytes = blob => Buffer.from('google sheet of ' + Buffer.from(blob.getBytes()).toString());
function converted(name, blob, folderId) {         // a new Google Sheet from an uploaded .xlsx
  if (blob.getContentType() !== XLSX) throw new Error('not an xlsx');
  tick(4000);
  const f = mkFile(name, ALL[folderId], sheetBytes(blob), SHEETS, 'me');
  BOOKS[f.id] = freshBook(f.id);
  return { id: f.id, mimeType: SHEETS };
}
// replacing the contents of a sheet that exists: it works ('ok'); it throws; it says yes and does nothing
// ('noop'); or it works but this run still reads the old contents ('late')
const SVC = { update: 'ok', pending: [], updates: 0 };
function updated(id, blob) {
  tick(4000); SVC.updates++;
  const x = ALL[id];
  if (!x || gone(x) || x.mime !== SHEETS) throw new Error('File not found: ' + id);
  if (blob.getContentType() !== XLSX) throw new Error('not an xlsx');
  if (SVC.update === 'throw') throw new Error('Internal Error');
  const swap = () => { x.bytes = sheetBytes(blob); x.updated = NOW; BOOKS[id] = freshBook(id); };
  if (SVC.update === 'late') SVC.pending.push(swap); else if (SVC.update === 'ok') swap();
  return { id, mimeType: SHEETS };
}
function md5Of(id) { tick(100); const x = ALL[id]; if (!x || x.kind !== 'file' || gone(x)) throw new Error('File not found: ' + id); return x.mime.startsWith('application/vnd.google-apps') ? {} : { md5Checksum: crypto.createHash('md5').update(x.bytes).digest('hex') }; }
const DriveV3 = { Files: {
  create: (res, blob) => { if (!res.name || !res.parents || res.mimeType !== SHEETS) throw new Error('bad request'); return converted(res.name, blob, res.parents[0]); },
  update: (res, id, blob, opt) => { if (!res || res.mimeType !== SHEETS || opt !== undefined) throw new Error('bad request'); return updated(id, blob); },
  get: (id, opt) => { if (!opt || !/\bmd5Checksum\b/.test(opt.fields || '')) throw new Error('v3 gives the checksum only when asked for it'); return md5Of(id); },
} };
const DriveV2 = { Files: {
  insert: (res, blob, opt) => { if (!res.title || !res.parents[0].id || !opt.convert) throw new Error('bad request'); return converted(res.title, blob, res.parents[0].id); },
  update: (res, id, blob, opt) => { if (!opt || !opt.convert) throw new Error('bad request'); return updated(id, blob); },
  get: id => md5Of(id),
} };

// ---------------------------------------------------------------- the other services
const TZNAMES = { UTC: 'UTC', 'America/New_York': 'America/New_York' };
function fmtDate(d, tz, f) {
  if (!TZNAMES[tz]) throw new Error('time zone ' + tz);
  if (tz === 'UTC' && f === "yyyy-MM-dd'T'HH:mm'Z'") return new Date(d.getTime()).toISOString().slice(0, 16) + 'Z';
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: tz, weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }).formatToParts(new Date(d.getTime())).map(p => [p.type, p.value]));
  if (f === 'EEE d MMM, h:mm a') return `${parts.weekday} ${parts.day} ${parts.month}, ${parts.hour}:${parts.minute} ${parts.dayPeriod.toLowerCase()}`;
  if (f === 'EEE d MMM yyyy') return `${parts.weekday} ${parts.day} ${parts.month} ${parts.year}`;
  throw new Error('date format ' + f);
}
const Utilities = {
  DigestAlgorithm: { MD5: 'md5', SHA_1: 'sha1' }, Charset: { UTF_8: 'utf8' },
  computeDigest: (alg, data, cs) => { if (typeof data === 'string' ? cs !== 'utf8' : !Array.isArray(data)) throw new Error('computeDigest: text needs a charset, bytes must be an array'); return signed(crypto.createHash(alg).update(typeof data === 'string' ? Buffer.from(data, 'utf8') : Buffer.from(data)).digest()); },
  formatDate: fmtDate,
  getUuid: () => crypto.randomUUID(),
  newBlob: (data, mime, name) => blobOf(typeof data === 'string' ? Buffer.from(data, 'utf8') : Buffer.from(data), mime, name),
  sleep: ms => tick(ms),
};
// Triggers and private settings belong to whoever is signed in. `triggers` and PROPS are the Windy Hill
// account's; USER switches to another of his accounts, which sees neither.
let USER = 'windyhill';
const triggers = [], otherTriggers = [];
const mineT = () => (USER === 'windyhill' ? triggers : otherTriggers);
const ScriptApp = {
  newTrigger: fn => ({ timeBased: () => ({
    everyHours: n => ({ create: () => mineT().push({ fn, every: n, getHandlerFunction: () => fn }) }),
    after: ms => ({ create: () => mineT().push({ fn, after: ms, getHandlerFunction: () => fn }) }),
  }) }),
  getProjectTriggers: () => mineT().slice(), deleteTrigger: t => { if (!mineT().includes(t)) throw new Error('not this account\'s trigger'); mineT().splice(mineT().indexOf(t), 1); },
};
const PROPS = {}, OTHERPROPS = {}, SCRIPTPROPS = {};
const store = P => ({ getProperty: k => (k in P ? P[k] : null), setProperty: (k, v) => { if (String(v).length > 9000) throw new Error('a property is too long'); P[k] = String(v); }, deleteProperty: k => { delete P[k]; } });
const PropertiesService = { getUserProperties: () => store(USER === 'windyhill' ? PROPS : OTHERPROPS), getScriptProperties: () => store(SCRIPTPROPS) };
let locked = false;
const LockService = { getScriptLock: () => ({ tryLock: () => { if (locked) return false; locked = true; return true; }, releaseLock: () => { locked = false; } }) };
const MAIL = []; let MAILFAIL = false;
const MailApp = { sendEmail: (to, subject, body) => { if (MAILFAIL) throw new Error('Service invoked too many times for one day: email.'); if (typeof to !== 'string' || typeof subject !== 'string' || typeof body !== 'string') throw new Error('sendEmail(to, subject, body)'); MAIL.push({ to, subject, body }); } };

// ---------------------------------------------------------------- a fake GitHub
const TOKEN = 'github_pat_' + 'A1b2C3d4E5f6G7h8I9j0K1l2M3n4';
const GH = { calls: 0, blobCalls: 0, hidden: null, failBlob: null, truncate: false, flaky: {}, damage: null, down: false, throwAll: 0, throwFetch: 0, remaining: 5000, metered: false, expiry: null };
function respond(code, body, headers) { const buf = Buffer.isBuffer(body) ? body : Buffer.from(typeof body === 'string' ? body : JSON.stringify(body)); return { getResponseCode: () => code, getContentText: () => buf.toString(), getContent: () => signed(buf), getHeaders: () => headers || {} }; }
function github(q) {
  GH.calls++; tick(250);
  if (!q.muteHttpExceptions) throw new Error('the script would crash on an HTTP error');
  if (GH.down) return respond(503, 'unavailable');
  if (q.headers.Authorization !== 'Bearer ' + TOKEN) return respond(401, { message: 'Bad credentials' });
  if (GH.metered) { if (GH.remaining <= 0) return respond(403, { message: 'API rate limit exceeded' }, { 'x-ratelimit-remaining': '0' }); GH.remaining--; }
  const H = { 'X-RateLimit-Remaining': String(GH.remaining), 'X-RateLimit-Reset': String(Math.floor(NOW / 1000) + 1800) };   // mixed case, as servers may send them
  if (GH.expiry) H['GitHub-Authentication-Token-Expiration'] = GH.expiry;
  const u = new URL(q.url), m = u.pathname.match(/^\/repos\/croix18\/([^/]+)\/(.*)$/);
  if (u.host !== 'api.github.com' || !m || !HUB[m[1]]) return respond(404, {}, H);
  const R = HUB[m[1]], S = R.spec, rest = decodeURIComponent(m[2]);
  if (GH.hidden === m[1]) return respond(404, { message: 'Not Found' }, H);
  if (rest === 'commits/main') return q.headers.Accept === 'application/vnd.github.sha' ? respond(200, R.head, H) : respond(200, { sha: R.head }, H);
  const treeSha = sha1('tree ' + R.head);
  if (rest.startsWith('contents/')) {
    if (u.searchParams.get('ref') !== R.head) return respond(404, {}, H);
    const dir = rest.slice(9);
    if (dir === S.packages.split('/')[0]) return respond(200, [{ name: 'build', type: 'dir', sha: sha1('x') }, { name: 'packages', type: 'dir', sha: treeSha }, { name: 'reference', type: 'dir', sha: sha1('y') }], H);
    if (dir === S.sheetDir) return respond(200, [{ name: 'HOUSE STYLE.md', type: 'file', sha: sha1('hs'), size: 5 }].concat(R.sheet ? [{ name: S.sheet, type: 'file', sha: R.sheet.sha, size: R.sheet.size }] : []), H);
    return respond(404, {}, H);
  }
  if (rest === 'git/trees/' + treeSha) {
    if (u.searchParams.get('recursive') !== '1') return respond(200, { tree: [], truncated: false }, H);
    const tree = [], dirs = new Set();
    for (const p of Object.keys(R.blobs)) { const parts = p.split('/'); for (let k = 1; k < parts.length; k++) dirs.add(parts.slice(0, k).join('/')); tree.push({ path: p, type: 'blob', sha: R.blobs[p].sha, size: R.blobs[p].size }); }
    for (const d of dirs) tree.push({ path: d, type: 'tree', sha: sha1('t' + d) });
    return respond(200, { sha: treeSha, tree, truncated: GH.truncate }, H);
  }
  if (rest.startsWith('git/blobs/')) {
    GH.blobCalls++; const sha = rest.slice(10);
    if (q.headers.Accept !== 'application/vnd.github.raw+json') return respond(200, { content: 'base64…' }, H);   // not the raw bytes
    if (GH.failBlob === sha) return respond(500, {}, H);
    if (GH.flaky[sha] > 0) { GH.flaky[sha]--; return respond(502, 'bad gateway', H); }
    const mine = Object.values(R.blobs).concat(R.sheet ? [R.sheet] : []).filter(b => b.sha === sha);
    tick(mine.length ? mine[0].size / 4000 : 0);
    if (!mine.length) return respond(404, {}, H);
    return respond(200, GH.damage === sha ? BODY[sha].subarray(0, BODY[sha].length - 3) : BODY[sha], H);
  }
  return respond(404, {}, H);
}
const UrlFetchApp = {
  fetch: (url, params) => { if (GH.throwFetch > 0) { GH.throwFetch--; tick(20000); throw new Error('Address unavailable: ' + url); } return github(Object.assign({ url }, params)); },
  fetchAll: reqs => { if (GH.throwAll > 0) { GH.throwAll--; tick(5000); throw new Error('Timeout'); } return reqs.map(github); },
};

// ---------------------------------------------------------------- a run that Google stops half way
// The world is photographed at the moment of the kill; the run is then let finish (JavaScript offers
// no other way) and the photograph is put back: what the run did after that moment never happened.
function snapshot() {
  return {
    ids: new Set(Object.keys(ALL)), nextId,
    nodes: Object.values(ALL).map(x => ({ x, f: { name: x.name, trashed: x.trashed, updated: x.updated, bytes: x.bytes, mime: x.mime, description: x.description, parent: x.parent }, children: x.children ? x.children.slice() : null })),
    books: [HUBSHEET, ...Object.values(BOOKS)].map(b => ({ b, sheets: b._.sheets.slice(), data: b._.sheets.map(s => ({ s, copy: JSON.stringify(s._) })) })),
    bookIds: Object.keys(BOOKS).map(id => [id, BOOKS[id]]), props: Object.assign({}, PROPS), triggers: triggers.slice(), mail: MAIL.length,
  };
}
function restore(S) {
  for (const id of Object.keys(ALL)) if (!S.ids.has(id)) delete ALL[id];
  for (const n of S.nodes) { Object.assign(n.x, n.f); if (n.children) n.x.children = n.children.slice(); }
  for (const id of Object.keys(BOOKS)) delete BOOKS[id];
  for (const [id, b] of S.bookIds) BOOKS[id] = b;
  for (const B of S.books) { B.b._.sheets.length = 0; B.b._.sheets.push(...B.sheets); for (const d of B.data) Object.assign(d.s._, JSON.parse(d.copy)); }
  for (const k of Object.keys(PROPS)) delete PROPS[k];
  Object.assign(PROPS, S.props);
  triggers.length = 0; triggers.push(...S.triggers); MAIL.length = S.mail;
}

// ---------------------------------------------------------------- load the script
const src = fs.readFileSync(process.env.WINDYHILL_GS || path.join(HERE, 'WindyHill.gs'), 'utf8');      // (WINDYHILL_GS: a deliberately broken copy, to see that this test notices)
function load(Drive) {
  return new Function('DriveApp', 'SpreadsheetApp', 'Utilities', 'ScriptApp', 'PropertiesService', 'LockService', 'UrlFetchApp', 'MailApp', 'Date', 'Drive',
    src + '\nreturn { sync, syncMore, syncNow, checkEverything, setup, takeOver, setToken, forgetToken, setEmail, about, everyHour, stopHourly, onOpen, key_, home_, gitSha_, when_, HOME_ID, BUDGET_MS, MIRROR, MINE, EXTRA, TITLE, VERSION };')(
    DriveApp, SpreadsheetApp, Utilities, ScriptApp, PropertiesService, LockService, UrlFetchApp, MailApp, FakeDate, Drive);
}
let G = load(DriveV3);
const tab = name => { const s = HUBSHEET.getSheetByName(name); return s ? s.table() : []; };
const status = () => tab('Status');
const line = label => status().filter(r => r[0] === label);
const said = () => line('State')[0][1];
const activity = () => tab('Activity').map(r => r[1]).join('\n');
const stateOf = () => Object.fromEntries(tab('Mirror').slice(1).map(r => [r[0], { sha: r[1], id: r[2], kind: r[3], state: r[6], md5: r[8] }]));
function run(fn) {                                  // one execution, as Google would allow it
  const t0 = NOW; const out = (fn || G.sync)(); const took = NOW - t0;
  SVC.pending.splice(0).forEach(f => f());
  if (KILL) { if (KILL.snap) { restore(KILL.snap); locked = false; } KILL = null; }
  ok(took < 6 * 60 * 1000, 'a run took ' + Math.round(took / 1000) + ' s: Google would have stopped it');
  ok(!locked, 'the lock was not released');
  return out;
}
function settle(max) {                               // run until nothing waits, as the one-minute triggers would
  let n = 0;
  for (; n < (max || 40); n++) {
    run(); tick(60000);
    if (!triggers.some(t => t.fn === 'syncMore')) break;
    ok(triggers.filter(t => t.fn === 'syncMore').length === 1, 'more than one carry-on trigger');
  }
  ok(n < (max || 40), 'the carry-on runs never came to an end');
  return n + 1;
}
const hour = () => tick(3600e3);
const wantPaths = () => {                            // every path the mirror should hold, with its blob
  const out = {};
  for (const R of Object.values(HUB)) {
    for (const [p, b] of Object.entries(R.blobs)) out[MIR + R.spec.course + '/' + p] = b;
    if (R.sheet) out[MIR + R.spec.sheet] = R.sheet;
  }
  return out;
};
const MIMES = { pdf: 'application/pdf', html: 'text/html', md: 'text/markdown', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', xlsx: XLSX };
function mirrorIsRight(when, except) {
  const want = wantPaths(); let n = 0;
  for (const [p, b] of Object.entries(want)) {
    if (except && except.includes(p)) continue;
    const dir = at(path.posix.dirname(p)), hits = dir ? allAt(dir, path.posix.basename(p)) : [];
    n++;
    if (hits.length !== 1) { ok(false, `${when}: ${hits.length} copies of ${p}`); continue; }
    if (!hits[0].bytes.equals(BODY[b.sha])) ok(false, `${when}: ${p} holds another version`);
    const ext = p.split('.').pop();
    if (MIMES[ext] && hits[0].mime !== MIMES[ext]) ok(false, `${when}: ${p} is filed as ${hits[0].mime}`);
  }
  ok(n > 800, `${when}: only ${n} paths looked at`);
  // and nothing in the mirror that is not published
  const extra = [];
  (function walk(d, p) { for (const c of d.children) { if (c.trashed) continue; const q = p + '/' + c.name; if (c.kind === 'folder') walk(c, q); else if (!(q in want) && !(except || []).includes(q)) extra.push(q); } })(at(WH + '/From Claude'), WH + '/From Claude');
  ok(!extra.length, `${when}: in the mirror and not published: ${extra.slice(0, 3)}`);
  ok(untouched() === before || when.includes('his'), `${when}: something of his was touched`);
  // no two folders of one name side by side
  let twins = 0;
  (function walk(d) { const seen = new Set(); for (const c of d.children) { if (c.trashed || c.kind !== 'folder') continue; if (seen.has(c.name)) twins++; seen.add(c.name); walk(c); } })(wh);
  ok(!twins, `${when}: ${twins} folders exist twice`);
}
const consoles = () => Object.values(HUB).flatMap(R => Object.keys(R.blobs).filter(p => / - All Slides\.html$/.test(p)).map(p => [path.posix.basename(p), R.blobs[p]]));
const driveTab = () => Object.fromEntries(tab('Index').slice(1).map(r => [r[0], r[1]]));
const sheetsCells = () => [HUBSHEET, ...Object.values(BOOKS)].flatMap(b => b._.sheets.flatMap(s => Object.values(s._.cells))).map(String).join('\n');
const look = (sheet, r, c) => (HUBSHEET.getSheetByName(sheet)._.look[r + ',' + c] || {});
const liveLine = c => line(c + ' master sheet (live)')[0];
const liveId = c => ((liveLine(c) || ['', '', ''])[2].match(/\/d\/([^/]+)\/edit/) || [])[1];
const base = p => path.posix.basename(p);

// ================================================================ A. before there is a token
ok(G.HOME_ID === HOME_ID && G.home_().getId() === HOME_ID, 'the script should find his folder by its address');
delete ALL[HOME_ID]; wh.id = 'moved' + HOME_ID; ALL[wh.id] = wh;               // the address stops working: found by name, the one with Apps in it
ok(G.home_().getId() === wh.id, 'without the address the script should find his folder by name (the one with Apps)');
delete ALL[wh.id]; wh.id = HOME_ID; ALL[HOME_ID] = wh;
// an account the folder is not shared with: say so, and make nothing
ok(/Not set up yet/.test(G.sync()) && !HUBSHEET.getSheetByName('Status') && GH.calls === 0, 'before setup, a sync should do nothing but say so');
DRIVE.blind = true;
const nodes0 = Object.keys(ALL).length;
let threw = ''; try { G.setup(); } catch (e) { threw = e.message; }
ok(/cannot see "Windy Hill Master Folder": share that folder/.test(threw) && !triggers.length, 'setup, when the folder cannot be seen, should stop and say so: ' + threw);
run();
ok(line('PROBLEM').some(r => /cannot see "Windy Hill Master Folder"/.test(r[1])) && Object.keys(ALL).length === nodes0, 'a sync that cannot see the master folder should say so and make nothing');
DRIVE.blind = false;
G.onOpen();
ok(MENU.length >= 8 && MENU.every(fn => typeof G[fn] === 'function'), 'a menu item names a function that does not exist: ' + MENU.filter(fn => typeof G[fn] !== 'function'));
run(G.setup);
ok(triggers.filter(t => t.fn === 'sync' && t.every === 1).length === 1, 'setup should turn the hourly sync on, once');
ok(at(WH + '/From Claude') && at(WH + '/My versions') && at(WH + '/My files'), 'setup should make the three folders in HIS master folder');
ok(Object.values(ALL).filter(x => x.kind === 'folder' && x.name === 'Apps' && !x.trashed).length === 1, 'a second Apps folder was made');
ok(status()[0][0] === G.TITLE && status()[0][1] === 'script v' + G.VERSION && HUBSHEET.getSheets()[0].getName() === 'Status', 'the first tab should be Status: ' + status()[0]);
ok(line('PROBLEM').some(r => /No GitHub token yet/.test(r[1])) && said() === 'NEEDS A LOOK', 'without a token the Status tab should say so');
ok(line('GitHub token')[0][1] === 'not set' && line('Hourly sync')[0][1] === 'on' && /^off/.test(line('Email alerts')[0][1]) && /GB of 15 GB used/.test(line('Space in this Google account')[0][1]), 'the Status tab should say how the token, the hourly run, the emails and the space stand');
ok(look('Status', 2, 1).setBackground === '#f4c7c3' && look('Status', 2, 2).setFontWeight === 'bold' && look('Status', 1, 1).setFontSize === 13, 'the State line should stand out in red while something needs a look');
const probRow = status().findIndex(r => r[0] === 'PROBLEM') + 1;
ok(look('Status', probRow, 2).setFontColor === '#a50e0e', 'a PROBLEM line should be in red');
const stSheet = HUBSHEET.getSheetByName('Status')._;
ok(stSheet.widths[1] === 250 && stSheet.widths[2] === 480 && stSheet.frozen === 1, 'the Status tab should be laid out to be read');
ok(GH.calls === 0, 'GitHub was called without a token');
ok(/No GitHub token yet/.test(activity()), 'the Activity tab should record the first problem');

// ================================================================ B. the token dialog
dialogs.answer = 'hello'; G.setToken();
ok(!('GITHUB_TOKEN' in PROPS) && /does not look like/.test(dialogs.alerts.pop()), 'a string that is not a token was saved');
dialogs.answer = null; G.setToken(); ok(!('GITHUB_TOKEN' in PROPS), 'cancel saved something');
dialogs.answer = 'github_pat_' + 'Z'.repeat(40); G.setToken();                 // a real-looking token GitHub does not know
let told = dialogs.alerts.pop();
ok(/CANNOT be read/.test(told) && !/expiry|works until/.test(told), 'a refused token should be reported in the dialog, with nothing said of its date: ' + told);
run(); ok(line('PROBLEM').some(r => /GitHub refused the token/.test(r[1])) && line('GitHub token')[0][1] === 'see the PROBLEM lines', 'a refused token should be on the Status tab: ' + JSON.stringify(line('PROBLEM')));
GH.hidden = 'windy-hill-m7';                                                   // a token that was not given one repository
GH.expiry = '2027-10-03 16:00:00 UTC';
dialogs.answer = '  ' + TOKEN + '\n'; G.setToken();
told = dialogs.alerts.pop();
ok(!told.includes(TOKEN) && !told.includes('github_pat_'), 'the dialog shows the token');
ok(PROPS.GITHUB_TOKEN === TOKEN && /croix18-windy-hill-a7: can be read/.test(told) && /windy-hill-m7: CANNOT be read/.test(told) && /It works until Sun 3 Oct 2027/.test(told), 'the dialog should say which repositories the token reads, and until when: ' + told);
ok(triggers.some(t => t.fn === 'syncMore'), 'saving the token should start the first sync');
ok(G.when_('2027-10-03 16:00:00 UTC') === Date.UTC(2027, 9, 3, 16) && G.when_('2027-10-03 12:00:00 -0400') === Date.UTC(2027, 9, 3, 16) && G.when_('2027-10-03T18:00:00+02:00') === Date.UTC(2027, 9, 3, 16) && G.when_('soon') === null, 'the token\'s date, as GitHub writes it, is not read rightly');
GH.expiry = null;

// ================================================================ C. the first copy, over several runs; one repository hidden
run(); tick(60000);
// what he teaches from is there after the first few minutes: the consoles in Apps and the live master sheet, though most files are still to come
const a7Consoles = Object.keys(HUB['croix18-windy-hill-a7'].blobs).filter(p => / - All Slides\.html$/.test(p)).map(p => path.posix.basename(p));
ok(a7Consoles.length >= 2 && a7Consoles.every(n => allAt(apps, n).length === 1) && liveId('A7') && BOOKS[liveId('A7')] && Object.keys(HUB['croix18-windy-hill-a7'].blobs).filter(p => !M('A7/' + p)).length > 200, 'after the first run the A7 consoles and the live A7 master sheet should be there already, with most files still to come');
let runs = 1 + settle();
ok(line('PROBLEM').some(r => /^M7: the token cannot see this repository/.test(r[1])), 'the hidden repository should be named: ' + JSON.stringify(line('PROBLEM')));
ok(Object.keys(HUB['croix18-windy-hill-a7'].blobs).every(p => M('A7/' + p)), 'A7 should be copied although M7 cannot be read');
ok(!M('M7'), 'M7 was copied though the token cannot see it');
GH.hidden = null;
runs += settle();
ok(runs >= 4, 'the first copy fitted in ' + runs + ' runs: the time limit is not being honoured (or the fake is too fast)');
ok(!triggers.some(t => t.fn === 'syncMore') && triggers.filter(t => t.fn === 'sync').length === 1, 'after the last run only the hourly trigger should be left');
ok(said() === 'up to date' && !line('PROBLEM').length && !line('DO SOON').length, 'after the first copy: ' + JSON.stringify(status().slice(0, 12)));
ok(look('Status', 2, 1).setBackground === '#d9ead3' && line('GitHub token')[0][1] === 'works; it has no expiry date' && /requests left this hour/.test(line('GitHub token')[0][2]), 'when all is well the State line should be green and the token said to work: ' + JSON.stringify(line('GitHub token')));
mirrorIsRight('first copy');
if (!liveId('A7') || !liveId('M7')) { console.log(bad.join('\n') + '\nthe first copy did not end with both live master sheets: nothing further can be tested'); process.exit(1); }
const firstBlobCalls = GH.blobCalls;
ok(firstBlobCalls === Object.keys(wantPaths()).length + consoles().length - 1, `the first copy downloaded ${firstBlobCalls} files for ${Object.keys(wantPaths()).length} paths and ${consoles().length} consoles (one console is his own)`);
ok(DRIVE.creates === firstBlobCalls, `the first copy made ${DRIVE.creates} files from ${firstBlobCalls} downloads`);
// every file says, in its description, what it is — which is how it is found again if the record is lost
ok(Object.values(stateOf()).filter(x => x.kind === 'file').every(x => { const m = (ALL[x.id].description || '').match(/^From Claude \(([\w.-]+) ([0-9a-f]{40}) ([0-9a-f]{32})\)/); return m && m[2] === x.sha && m[3] === x.md5 && m[3] === crypto.createHash('md5').update(ALL[x.id].bytes).digest('hex'); }), 'a file in the mirror does not carry its own name and fingerprint');
// consoles in Apps — except the one he keeps there himself
for (const [name, b] of consoles()) {
  const hits = allAt(apps, name);
  if (name === 'M7 Unit 4 Area - All Slides.html') ok(hits.length === 1 && hits[0] === his[1], 'his own console in Apps should be the only one of its name');
  else ok(hits.length === 1 && hits[0].bytes.equals(BODY[b.sha]) && hits[0].mime === 'text/html', 'console not in Apps: ' + name);
}
ok(line('Your own copy in Apps').length === 1 && line('Your own copy in Apps')[0][1] === 'M7 Unit 4 Area - All Slides.html', 'his own console should be named on the Status tab');
// the live master sheets
for (const S of SPEC) {
  const l = liveLine(S.course), id = liveId(S.course), f = ALL[id];
  ok(f && f.parent === wh && f.mime === SHEETS && f.name === S.sheet.replace('.xlsx', '') && !gone(f), S.course + ': no live master sheet in Windy Hill: ' + JSON.stringify(l));
  if (BOOKS[id]) ok(JSON.stringify(BOOKS[id].getSheetByName('Drive').table()) === JSON.stringify(tab('Index')), S.course + ': the live sheet\'s Drive tab is not the index');
}
ok(['Mirror', 'Index', 'Kept'].every(n => !HUBSHEET.getSheetByName(n) || HUBSHEET.getSheetByName(n).isSheetHidden()) && HUBSHEET.getSheetByName('Mirror') && !HUBSHEET.getSheetByName('Status').isSheetHidden(), 'the tabs that are the script\'s own workings should be out of sight');
// the Drive tab: every code, by the rule the workbooks use
const dt = driveTab(), idx = tab('Index');
ok(idx[0][0] === 'windy-hill-drive' && idx[0][1] === 'v2' && Number(idx[0][3]) === idx.length - 1 && idx.length > 500, 'Index header: ' + idx[0]);
ok(idx.slice(1).every(r => /^k[0-9a-f]{12}$/.test(r[0]) && /^[A-Za-z0-9_-]{20,60}$/.test(r[1])) && new Set(idx.slice(1).map(r => r[0])).size === idx.length - 1, 'an Index line that is not a code and an id, or a code twice');
ok([HUBSHEET, ...Object.values(BOOKS)].every(b => b._.sheets.every(s => Object.values(s._.cells).every(v => typeof v !== 'number' || s._.name === 'IXL tracker'))), 'a cell the script wrote was read as a number');
const codesOf = () => {                              // what the Drive tab must hold: [code, the path's node]
  const out = [];
  for (const R of Object.values(HUB)) {
    const c = R.spec.course, paths = Object.keys(R.blobs), count = {}, dirs = new Set();
    for (const p of paths) { const parts = p.split('/'); for (let k = 1; k < parts.length; k++) dirs.add(parts.slice(0, k).join('/')); }
    for (const p of [...paths, ...dirs]) { const n = p.split('/').pop(); count[n] = (count[n] || 0) + 1; }
    for (const p of [...paths, ...dirs]) {
      const parts = p.split('/'), name = parts[parts.length - 1];
      if (parts.length === 1 || (count[name] === 1 && name.startsWith(c + ' '))) out.push([pyKey(name), c + '/' + p]);
      if (parts.length === 2) out.push([pyKey(parts[0] + '/' + name), c + '/' + p]);
    }
  }
  return out;
};
let coded = 0;
for (const [k, p] of codesOf()) { coded++; if (!M(p) || dt[k] !== M(p).id) ok(false, `the Drive tab does not give ${p} under ${k}`); }
ok(coded > 900, 'only ' + coded + ' codes checked');
ok(idx.length - 1 === new Set(codesOf().map(c => c[0])).size, 'the Drive tab holds codes nothing is filed under');
ok(dt[pyKey(his[2].name)] !== his[2].id, 'an old copy he uploaded by hand, outside My versions, must not take the link');
// the script against the workbooks themselves
if (live) {
  for (const S of SPEC) {
    const codes = JSON.parse(execFileSync('python3', [path.join(HERE, 'codes.py'), path.join(S.dir, S.sheetDir, S.sheet)], { encoding: 'utf8', maxBuffer: 1 << 26 }));
    ok(codes.length > 200, S.course + ': the workbook looks up only ' + codes.length + ' codes');
    for (const c of codes) {
      const f = ALL[dt[c.code]];
      if (!f) { ok(false, `${S.course}: the workbook looks up ${c.code} (${c.phrase}) and the script's tab does not have it`); continue; }
      if ((f.kind === 'folder') !== c.folder) ok(false, `${S.course}: ${c.code} is a ${f.kind} in Drive and the workbook opens it as a ${c.folder ? 'folder' : 'file'}`);
      // the fallback names the thing itself, or (a name every unit has) the unit folder it is in
      const unit = pathOf(f).split('/')[3];
      if (!(f.name === c.phrase && c.folder_search === c.folder) && !(c.folder_search && c.phrase === unit)) ok(false, `${S.course}: ${c.code} is ${pathOf(f)} in Drive; the workbook's fallback searches for ${c.phrase}`);
      checks++;
    }
  }
}
// the code, and git's name for a file, against Python's and git's own
const someNames = [...new Set(Object.values(ALL).map(x => x.name))].slice(0, 400).concat(['é accent', 'é accent', 'M7 5.03 Making Population Predictions – Part 1 - Slides.pdf', 'A7 Unit 2 - Real Numbers, Square Roots and Cube Roots/00 - START HERE.md']);
const pyKeys = JSON.parse(execFileSync('python3', ['-c', 'import sys,json\nsys.path.insert(0, sys.argv[1])\nimport hub\nprint(json.dumps([hub.key(n) for n in json.load(sys.stdin)]))', HERE], { input: JSON.stringify(someNames), encoding: 'utf8', maxBuffer: 1 << 26 }));
someNames.forEach((n, i) => ok(G.key_(n) === pyKeys[i] && pyKeys[i] === pyKey(n), 'the code differs between the script and Python for ' + n));
ok(G.key_('é accent') === G.key_('é accent'), 'two spellings of one name should share a code');
for (const text of ['', 'hello\n', 'é\u0000binaryÿ'.repeat(300)]) {
  const buf = Buffer.from(text, 'latin1'), real = execFileSync('git', ['hash-object', '--stdin'], { input: buf, encoding: 'utf8' }).trim();
  const given = signed(buf), kept = JSON.stringify(given);
  ok(G.gitSha_(given) === real && gitSha(buf) === real, 'the script does not name a file\'s contents as git does (' + buf.length + ' bytes)');
  ok(JSON.stringify(given) === kept, 'naming a file\'s contents changed them');
}
// the Status tab, read as a session reads it
function hubReads() {
  const csvText = status().map(r => r.map(v => /[",\n]/.test(String(v)) ? '"' + String(v).replace(/"/g, '""') + '"' : String(v)).join(',')).join('\r\n');
  const tmp = path.join(require('os').tmpdir(), 'windyhill_status_' + process.pid + '.csv');
  fs.writeFileSync(tmp, csvText);
  try { return execFileSync('python3', [path.join(HERE, 'hub.py'), 'status', '--csv', tmp], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); } catch (e) { return 'hub.py could not read it: ' + e.stderr; } finally { fs.unlinkSync(tmp); }
}
const read = hubReads();
ok(/State\s+up to date/.test(read) && /M7 master sheet \(live\)/.test(read), 'drive/hub.py does not read the Status tab: ' + read.slice(0, 200));
const nowhere = t => !sheetsCells().includes(t) && !Object.values(ALL).some(x => (x.description || '').includes(t) || x.name.includes(t)) && !MAIL.some(m => (m.subject + m.body).includes(t)) && !dialogs.alerts.some(a => a.includes(t)) && !HUBSHEET._.toasts.some(a => a.includes(t));
ok(nowhere(TOKEN), 'the token is written somewhere it can be read');

// ================================================================ D. an hour later: nothing new
hour();
let c0 = GH.calls, b0 = GH.blobCalls, ids0 = JSON.stringify(stateOf()), idxAt = tab('Index')[0][2], log0 = tab('Activity').length;
const quiet = NOW; ok(run() === 'up to date', 'sync() should say how it went');
ok(GH.calls - c0 === 2 && GH.blobCalls === b0, `an hour with nothing new made ${GH.calls - c0} requests and ${GH.blobCalls - b0} downloads (2 and 0 expected)`);
ok(JSON.stringify(stateOf()) === ids0 && said() === 'up to date', 'an hour with nothing new changed the mirror');
ok(tab('Index')[0][2] === idxAt && tab('Activity').length === log0, 'an hour with nothing new should rewrite neither the Drive tab nor the Activity tab');
ok(NOW - quiet < 60000, 'a quiet hourly run took ' + Math.round((NOW - quiet) / 1000) + ' s: Google allows scripts 90 minutes a day in all');
mirrorIsRight('nothing new');
G.syncNow(); ok(/^Windy Hill: up to date/.test(HUBSHEET._.toasts.pop() || ''), '"Sync now" should say how it went');
// someone clears a live sheet's Drive tab: it is filled again
BOOKS[liveId('A7')].getSheetByName('Drive')._.cells = {};
hour(); run();
ok(JSON.stringify(BOOKS[liveId('A7')].getSheetByName('Drive').table()) === JSON.stringify(tab('Index')), 'a live sheet\'s Drive tab that was emptied should be filled again');

// the spreadsheet falters while the record is being read: the run says so and leaves the record as it was
{
  const getSheet = HUBSHEET.getSheetByName, record = JSON.stringify(tab('Mirror')); let once = true;
  HUBSHEET.getSheetByName = n => { if (n === 'Mirror' && once) { once = false; throw new Error('Service Spreadsheets failed while accessing the document'); } return getSheet(n); };
  hour(); run();
  HUBSHEET.getSheetByName = getSheet;
  ok(line('PROBLEM').some(r => /Service Spreadsheets failed/.test(r[1])) && JSON.stringify(tab('Mirror')) === record && tab('Mirror').length > 900, 'a run that could not read the record must not write an empty one over it: ' + tab('Mirror').length + ' lines');
  hour(); run();
  ok(said() === 'up to date' && JSON.stringify(tab('Mirror')) === record, 'and the next run should be as if nothing had happened');
}

// ================================================================ E. a new commit: a deck rebuilt, a file added, one withdrawn, a new master sheet
const m7 = HUB['windy-hill-m7'], a7 = HUB['croix18-windy-hill-a7'];
const deck = Object.keys(m7.blobs).find(p => /Lessons\/4\.06\/.* - Slides\.pdf$/.test(p)), gonePath = Object.keys(m7.blobs).find(p => /Lessons\/4\.07\/.* - Lesson Plan\.pdf$/.test(p));
const added = 'M7 Unit 4 - Area/Lessons/4.06/M7 4.06 Finding Circumference - Handout.pdf';
const oldDeck = M('M7/' + deck), oldGone = M('M7/' + gonePath);
const oldLive = liveId('M7');
// his ticks in the live sheet
const tracker = id => BOOKS[id].getSheetByName('IXL tracker')._.cells;
Object.assign(tracker(oldLive), { '6,8': '✓', '6,9': '✓', '7,11': 'redo with period 3' });
publish('windy-hill-m7', R => { R.blobs[deck] = mk('deck v2', 400000); R.blobs[added] = mk('added', 50000); delete R.blobs[gonePath]; R.sheet = mk('sheet 2', 181000); });
hour(); b0 = GH.blobCalls; settle();
ok(GH.blobCalls - b0 === 3, `the new commit downloaded ${GH.blobCalls - b0} files (the deck, the new handout, the master sheet)`);
mirrorIsRight('new commit');
ok(oldDeck.trashed && oldGone.trashed, 'the replaced deck and the withdrawn file should be in the trash');
ok(dt[pyKey(base(deck))] === oldDeck.id && driveTab()[pyKey(base(deck))] === M('M7/' + deck).id && driveTab()[pyKey(base(deck))] !== oldDeck.id, 'the Drive tab should give the rebuilt deck\'s new id');
ok(driveTab()[pyKey(base(added))] && !(pyKey(base(gonePath)) in driveTab()), 'the new file should be in the Drive tab and the withdrawn one out of it');
// the live sheet keeps its address (his bookmark), gets the new contents, and his ticks are carried
ok(liveId('M7') === oldLive && !gone(ALL[oldLive]) && allAt(wh, 'M7 Master Sheet 2026-27').length === 1 && ALL[oldLive].bytes.toString() === 'google sheet of ' + BODY[m7.sheet.sha], 'a new master sheet should go into the same Google Sheet: ' + JSON.stringify(liveLine('M7')));
let tk = tracker(oldLive);
ok(tk['6,8'] === '✓' && tk['6,9'] === '✓' && tk['7,11'] === 'redo with period 3' && tk['5,8'] === undefined, 'his IXL ticks were not carried into the new contents: ' + JSON.stringify([tk['6,8'], tk['6,9'], tk['7,11']]));
ok(JSON.stringify(tab('Kept').slice(1)) === JSON.stringify([['M7', '4.04 Composite #1', '✓', '✓', ''], ['M7', '4.05–4.06 Circles #1', '', '', 'redo with period 3']]), 'his ticks should be put by on the Kept tab: ' + JSON.stringify(tab('Kept')));
ok(JSON.stringify(BOOKS[oldLive].getSheetByName('Drive').table()) === JSON.stringify(tab('Index')), 'the live sheet\'s Drive tab is not filled after its contents were replaced');
ok(liveId('A7') === Object.keys(BOOKS).find(id => ALL[id].name.startsWith('A7') && !gone(ALL[id])) && SVC.updates === 1, 'A7\'s live sheet should be untouched by M7\'s commit');
ok(/M7 master sheet: the new one is in, at the same address/.test(activity()) && /3 copied in, 1 removed/.test(activity()), 'the Activity tab should say what the commit brought: ' + activity().slice(0, 300));

// ================================================================ F. his own copy in My versions
const mine = at(WH + '/My versions'), deckName = base(deck);
hour();
const hisDeck = mkFile(deckName, mkFolder('Unit 4', mine), Buffer.from('his edited deck'), 'application/pdf');
const hisOther = mkFile('M7 4.06 warm-up I made.pdf', at(WH + '/My files'), Buffer.from('his own'), 'application/pdf');
const hisOdd = mkFile('M7 4.06 Finding Circumference - Slides (my try).pdf', mine, Buffer.from('his, under a name of his own'), 'application/pdf');
const frozen = () => [hisDeck, hisOther, hisOdd].map(f => [f.id, f.name, f.trashed, f.updated, f.bytes.toString(), f.parent.id, f.description].join('|')).join('\n'), frozen0 = frozen();
b0 = GH.blobCalls; run();
ok(driveTab()[pyKey(deckName)] === hisDeck.id, 'his copy in My versions should take the link');
ok(BOOKS[oldLive].getSheetByName('Drive').table().some(r => r[1] === hisDeck.id), 'the live sheet should open his copy');
ok(line('Your copies the links open')[0][1] === '1' && !line('A NEWER VERSION IS PUBLISHED').length, 'Status should count his copy: ' + JSON.stringify(line('Your copies the links open')));
let mf = tab('My files');
ok(mf.length === 4 && mf.some(r => r[1] === deckName && /^yes — the links open this$/.test(r[4])) && mf.some(r => r[1] === hisOther.name && r[0] === 'My files' && r[4] === '') && mf.some(r => r[1] === hisOdd.name && /^no — its name matches no published document/.test(r[4])), 'My files tab: ' + JSON.stringify(mf));
ok(HUBSHEET.getSheetByName('My files')._.formulas['2,4'].startsWith('=HYPERLINK("https://drive.google.com/file/d/'), 'My files should carry a link to each file');
mirrorIsRight('his copy (his)');
// … and Claude then publishes a newer version of that deck: his still opens, and he is told
hour();
publish('windy-hill-m7', R => { R.blobs[deck] = mk('deck v3 — a correction', 400000); });
settle();
ok(driveTab()[pyKey(deckName)] === hisDeck.id, 'his copy should still take the link after a newer one is published');
ok(M('M7/' + deck).bytes.equals(BODY[m7.blobs[deck].sha]), 'the newer published deck should be in the mirror all the same');
ok(line('A NEWER VERSION IS PUBLISHED').some(r => r[1] === deckName) && tab('My files').some(r => r[1] === deckName && /CLAUDE HAS PUBLISHED A NEWER VERSION SINCE/.test(r[4])), 'he should be told a newer version exists: ' + JSON.stringify(line('A NEWER VERSION IS PUBLISHED')));
ok(look('Status', status().findIndex(r => r[0] === 'A NEWER VERSION IS PUBLISHED') + 1, 1).setFontColor === '#b06000' && said() === 'up to date', 'that line should stand out, without the State calling for a look');
ok(frozen() === frozen0, 'his files in My versions and My files were touched');
// he deletes his copy: ours opens again
hisDeck.trashed = true; hour(); run();
ok(driveTab()[pyKey(deckName)] === M('M7/' + deck).id && !line('A NEWER VERSION IS PUBLISHED').length, 'with his copy deleted the published deck should open');
// a copy he saved as Google Slides (no ".pptx" in its name) stands for the PowerPoint
const pptx = Object.keys(m7.blobs).find(p => /Lessons\/4\.08\/.* - Slides\.pptx$/.test(p));
const hisSlides = mkFile(base(pptx).replace(/\.pptx$/, ''), mine, Buffer.from('google slides'), 'application/vnd.google-apps.presentation');
hour(); run();
ok(driveTab()[pyKey(base(pptx))] === hisSlides.id && tab('My files').some(r => r[1] === hisSlides.name && /^yes — the links open this/.test(r[4])), 'his Google Slides copy in My versions should stand for the .pptx');
ok(driveTab()[pyKey(base(pptx).replace(/pptx$/, 'pdf'))] === M('M7/' + pptx.replace(/pptx$/, 'pdf')).id, 'and the PDF of the same deck should still be ours');
hisSlides.trashed = true; hour(); run();
ok(driveTab()[pyKey(base(pptx))] === M('M7/' + pptx).id, 'with his Slides copy deleted the published .pptx should open');

// ================================================================ G. a file he edits in place, inside From Claude
const te = Object.keys(m7.blobs).find(p => /Lessons\/4\.05\/.* - Teacher Edition\.pdf$/.test(p)), teFile = M('M7/' + te);
const touched = Object.keys(m7.blobs).find(p => /Lessons\/4\.09\/.* - Teacher Edition\.pdf$/.test(p)), touchedFile = M('M7/' + touched);
hour(); teFile.bytes = Buffer.from('he wrote notes into it'); teFile.updated = NOW;
touchedFile.updated = NOW;                                                     // opened, starred, moved back: its time changes, its contents do not
publish('windy-hill-m7', R => { R.blobs[te] = mk('te v2', 300000); R.blobs[touched] = mk('touched v2', 300000); });
tick(600e3); settle();
ok(!teFile.trashed && teFile.bytes.toString() === 'he wrote notes into it' && allAt(teFile.parent, teFile.name).length === 1, 'a file he edited in place was replaced');
ok(line('A NEWER VERSION IS PUBLISHED').some(r => r[1] === 'M7/' + te), 'he should be told his edited file is behind: ' + JSON.stringify(line('A NEWER VERSION IS PUBLISHED')));
ok(driveTab()[pyKey(base(te))] === teFile.id, 'the link should still open the file he edited');
ok(touchedFile.trashed && M('M7/' + touched).bytes.equals(BODY[m7.blobs[touched].sha]) && !line('A NEWER VERSION IS PUBLISHED').some(r => r[1] === 'M7/' + touched), 'a file whose time changed but whose contents did not is not his: it should be replaced');
mirrorIsRight('edited in place (his)', [MIR + 'M7/' + te]);
hour(); run();
ok(line('A NEWER VERSION IS PUBLISHED').some(r => r[1] === 'M7/' + te), 'the note about his edited file should not vanish an hour later');
// he deletes it: the published version comes back by itself (the audit finds it gone)
teFile.trashed = true;
for (let n = 0; n < 12 && !M('M7/' + te); n++) { hour(); settle(); }
ok(M('M7/' + te) && M('M7/' + te).bytes.equals(BODY[m7.blobs[te].sha]), 'after he deleted his edited file the published one should return');
ok(!line('A NEWER VERSION IS PUBLISHED').length, 'the note should go once the published file is back');
mirrorIsRight('edited file deleted');

// a published file he drags into My versions (not edited): it is his from then on — never binned — and the published one returns to its place
const dragged = Object.keys(m7.blobs).find(p => /Lessons\/4\.01\/.* - Slides\.pdf$/.test(p)), draggedFile = M('M7/' + dragged), draggedHome = draggedFile.parent;
const dragged2 = Object.keys(m7.blobs).find(p => /Lessons\/4\.01\/.* - Lesson Plan\.pdf$/.test(p)), dragged2File = M('M7/' + dragged2);
const move = (f, to) => { f.parent.children.splice(f.parent.children.indexOf(f), 1); to.children.push(f); f.parent = to; };
move(draggedFile, mine); move(dragged2File, at(WH + '/My files'));
hour(); run();
ok(driveTab()[pyKey(base(dragged))] === draggedFile.id, 'a file he moved should still be what the link opens');
publish('windy-hill-m7', R => { R.blobs[dragged] = mk('dragged v2', 200000); delete R.blobs[dragged2]; });
hour(); settle();
ok(!draggedFile.trashed && draggedFile.parent === mine && !dragged2File.trashed, 'a file he moved out of From Claude was binned when a new edition came (or when it was withdrawn)');
ok(M('M7/' + dragged) && M('M7/' + dragged).bytes.equals(BODY[m7.blobs[dragged].sha]) && driveTab()[pyKey(base(dragged))] === draggedFile.id && line('A NEWER VERSION IS PUBLISHED').some(r => r[1] === base(dragged)), 'the new edition should be in its place, his moved copy still what the links open, and he told: ' + JSON.stringify(line('A NEWER VERSION IS PUBLISHED')));
draggedFile.trashed = true; dragged2File.trashed = true; hour(); run();
ok(driveTab()[pyKey(base(dragged))] === M('M7/' + dragged).id && !line('A NEWER VERSION IS PUBLISHED').length, 'with his moved copy deleted the published one should open');
mirrorIsRight('a file he moved (his)');

// ================================================================ H. a published file he deletes by accident; a withdrawn file he had edited
const lp = Object.keys(m7.blobs).find(p => /Lessons\/4\.03\/.* - Lesson Plan\.pdf$/.test(p));
M('M7/' + lp).trashed = true;
let back = 0; for (; back < 12 && !M('M7/' + lp); back++) { hour(); settle(); }
ok(M('M7/' + lp), 'a published file he deleted should come back within a day');
ok(driveTab()[pyKey(base(lp))] === M('M7/' + lp).id, 'the Drive tab should give the restored file');
const wd = Object.keys(m7.blobs).find(p => /Lessons\/4\.02\/.* - Lesson Plan\.pdf$/.test(p)), wdFile = M('M7/' + wd);
hour(); wdFile.bytes = Buffer.from('his notes'); wdFile.updated = NOW;
publish('windy-hill-m7', R => { delete R.blobs[wd]; });
tick(600e3); settle();
ok(!wdFile.trashed && line('Edited by you, kept').some(r => r[1] === 'M7/' + wd), 'a withdrawn file he had edited should be kept, and said so');
mirrorIsRight('withdrawn but edited (his)', [MIR + 'M7/' + wd]);

// ================================================================ I. his own console in Apps, then deleted
his[1].trashed = true; hour(); settle();
const con = allAt(apps, 'M7 Unit 4 Area - All Slides.html');
ok(con.length === 1 && con[0] !== his[1] && con[0].mime === 'text/html' && !line('Your own copy in Apps').length, 'once he deletes his own console the published one should take its place');
his[1].trashed = false;                              // (put back, so "nothing of his was touched" still compares like with like)
con[0].trashed = true;

// ================================================================ J. GitHub says no, in every way
hour();
const bigDeck = pptx;
publish('windy-hill-m7', R => { R.blobs[bigDeck] = mk('pptx v2', 900000); });
GH.failBlob = m7.blobs[bigDeck].sha; run();
ok(line('PROBLEM').some(r => /GitHub answered 500/.test(r[1])) && said() === 'NEEDS A LOOK', 'a failed download should be reported');
ok(M('M7/' + bigDeck) && !M('M7/' + bigDeck).bytes.equals(BODY[m7.blobs[bigDeck].sha]), 'a failed download should leave the old file in place');
GH.failBlob = null; hour(); settle();
ok(M('M7/' + bigDeck).bytes.equals(BODY[m7.blobs[bigDeck].sha]) && !line('PROBLEM').length, 'the failed download should be fetched on the next run');
ok(/The problems are cleared/.test(activity()), 'the Activity tab should say when a problem has cleared');
publish('croix18-windy-hill-a7', R => { R.blobs['A7 Unit 9 - New/Lessons/9.01/A7 9.01 New - Slides.pdf'] = mk('a7 new', 1000); });
GH.truncate = true; hour(); run();
ok(line('PROBLEM').some(r => /GitHub cut the list of files short/.test(r[1])) && !M('A7/A7 Unit 9 - New'), 'a list cut short must not be acted on');
GH.truncate = false; hour(); settle();
ok(M('A7/A7 Unit 9 - New/Lessons/9.01/A7 9.01 New - Slides.pdf') && driveTab()[pyKey('A7 Unit 9 - New')] === M('A7/A7 Unit 9 - New').id, 'a new unit should arrive, folder and all, and be in the Drive tab');
const realToken = PROPS.GITHUB_TOKEN, deadToken = 'github_pat_' + 'expired'.repeat(5); PROPS.GITHUB_TOKEN = deadToken;
hour(); run();
ok(line('PROBLEM').filter(r => /GitHub refused the token/.test(r[1])).length === 2, 'an expired token should be reported for both courses');
ok(tab('Index').length > 500 && liveLine('M7')[2], 'with GitHub out of reach the Drive side should carry on');
PROPS.GITHUB_TOKEN = realToken; hour(); run();
ok(!line('PROBLEM').length, 'problems should clear once the token works again');
// a hiccup — a bad gateway twice, a batch that times out, a line that drops once — is not a problem: it is tried again
const hic = Object.keys(m7.blobs).filter(p => /Lessons\/4\.1\d\//.test(p)).slice(0, 5);
publish('windy-hill-m7', R => hic.forEach((p, n) => { R.blobs[p] = mk('hiccup ' + n, 60000); }));
GH.flaky[m7.blobs[hic[0]].sha] = 2;                                             // one file of the batch: 502, 502, then there
hour(); settle();
ok(!line('PROBLEM').length && hic.every(p => M('M7/' + p).bytes.equals(BODY[m7.blobs[p].sha])) && !GH.flaky[m7.blobs[hic[0]].sha], 'a bad gateway for one file of a batch should be ridden out: ' + JSON.stringify(line('PROBLEM')));
publish('windy-hill-m7', R => hic.forEach((p, n) => { R.blobs[p] = mk('hiccup, second ' + n, 60000); }));
GH.throwAll = 1; GH.throwFetch = 1;                                            // the whole batch times out; and the line drops once
hour(); settle();
ok(!line('PROBLEM').length && hic.every(p => M('M7/' + p).bytes.equals(BODY[m7.blobs[p].sha])) && !GH.throwAll && !GH.throwFetch, 'a passing fault at GitHub should be ridden out: ' + JSON.stringify(line('PROBLEM')));
// GitHub out of reach altogether: said once per course, not once per file, and the mirror is left as it is
publish('windy-hill-m7', R => hic.forEach((p, n) => { R.blobs[p] = mk('hiccup again ' + n, 60000); }));
GH.down = true; hour(); settle();
ok(line('PROBLEM').length === 2 && line('PROBLEM').every(r => /GitHub answered 503/.test(r[1])) && !triggers.some(t => t.fn === 'syncMore'), 'with GitHub down there should be one line per course and no minute-by-minute retrying: ' + JSON.stringify(line('PROBLEM')));
GH.down = false; GH.throwFetch = 3; hour(); run();                             // the line itself drops: three tries, then it is said
ok(line('PROBLEM').some(r => /^A7: GitHub could not be reached/.test(r[1])) && nowhere(TOKEN), 'a dropped line should be reported, without the token: ' + JSON.stringify(line('PROBLEM')));
hour(); settle();
ok(!line('PROBLEM').length && hic.every(p => M('M7/' + p).bytes.equals(BODY[m7.blobs[p].sha])), 'once GitHub answers again everything should arrive');
// a download that arrives damaged is not put in Drive
publish('windy-hill-m7', R => { R.blobs[hic[1]] = mk('must arrive whole', 60000); });
const whole = M('M7/' + hic[1]);
GH.damage = m7.blobs[hic[1]].sha; hour(); run();
ok(line('PROBLEM').some(r => /arrived damaged and was not put in Drive/.test(r[1])) && M('M7/' + hic[1]) === whole && !whole.trashed, 'a damaged download must not replace the good file: ' + JSON.stringify(line('PROBLEM')));
GH.damage = null; hour(); settle();
ok(M('M7/' + hic[1]).bytes.equals(BODY[m7.blobs[hic[1]].sha]) && !line('PROBLEM').length, 'the damaged file should be fetched again, whole');
mirrorIsRight('after the refusals (his)', [MIR + 'M7/' + wd]);

// ================================================================ K. the Drive service: its older version, and absent
G = load(DriveV2);
publish('croix18-windy-hill-a7', R => { R.sheet = mk('a7 sheet 2', 200000); });
const a7Live = liveId('A7');
hour(); settle();
ok(liveId('A7') === a7Live && ALL[a7Live].bytes.toString() === 'google sheet of ' + BODY[a7.sheet.sha], 'the older Drive service should put the new A7 master sheet into the same Google Sheet too');
G = load(undefined);
publish('croix18-windy-hill-a7', R => { R.sheet = mk('a7 sheet 3', 200000); });
hour(); settle();
ok(line('PROBLEM').some(r => /The Drive service is not turned on/.test(r[1])), 'without the Drive service the Status tab should say how to turn it on');
ok(liveId('A7') === a7Live && !ALL[a7Live].bytes.toString().includes(BODY[a7.sheet.sha].toString()) && M('A7 Master Sheet 2026-27.xlsx').bytes.equals(BODY[a7.sheet.sha]), 'without the Drive service the new .xlsx should still arrive and the live sheet stay as it was');
// … and without it the script tells an edited file from an untouched one by reading the file itself
const te2 = Object.keys(a7.blobs).find(p => / - Teacher Edition\.pdf$/.test(p)), te2File = M('A7/' + te2), same2 = Object.keys(a7.blobs).find(p => / - Lesson Plan\.pdf$/.test(p)), same2File = M('A7/' + same2);
te2File.bytes = Buffer.from('his notes, again'); te2File.updated = NOW; same2File.updated = NOW;
publish('croix18-windy-hill-a7', R => { R.blobs[te2] = mk('a7 te v2', 1000); R.blobs[same2] = mk('a7 lp v2', 1000); });
hour(); settle();
ok(!te2File.trashed && line('A NEWER VERSION IS PUBLISHED').some(r => r[1] === 'A7/' + te2) && same2File.trashed && M('A7/' + same2).bytes.equals(BODY[a7.blobs[same2].sha]), 'without the Drive service, an edited file should still be told from a touched one');
te2File.trashed = true;
G = load(DriveV3); for (let n = 0; n < 12 && !M('A7/' + te2); n++) { hour(); settle(); }
ok(!line('PROBLEM').length && liveId('A7') === a7Live && ALL[a7Live].bytes.toString() === 'google sheet of ' + BODY[a7.sheet.sha], 'with the service back the new sheet should be converted: ' + JSON.stringify(line('PROBLEM')));

// ================================================================ M. a run that Google stops half way
const many = Array.from({ length: 40 }, (_, n) => `A7 Unit 9 - New/Lessons/9.${String(n + 2).padStart(2, '0')}/A7 9.${String(n + 2).padStart(2, '0')} Lesson - Slides.pdf`);
publish('croix18-windy-hill-a7', R => many.forEach((p, n) => { R.blobs[p] = mk('cut short ' + n, 300000); }));
hour(); KILL = { after: 36 }; run();                                           // stopped just after the 36th file landed
ok(PROPS.running && many.filter(p => M('A7/' + p)).length === 36 && many.filter(p => stateOf()['A7/' + p]).length === 32 && M('A7/' + many[35]).description === '' && M('A7/' + many[34]).description !== '',
  `the stand-in for a run cut short is not what it should be: ${many.filter(p => M('A7/' + p)).length} files in Drive, ${many.filter(p => stateOf()['A7/' + p]).length} on record (36 and 32: the record is written down every 25 files or so)`);
hour(); b0 = GH.blobCalls; let made0 = DRIVE.creates; settle();
ok(GH.blobCalls - b0 === 4 && DRIVE.creates - made0 === 4, `after a run was cut short at 36 of 40 files, ${GH.blobCalls - b0} were downloaded and ${DRIVE.creates - made0} made (4 and 4: what was already there is taken on)`);
ok(many.every(p => stateOf()['A7/' + p] && stateOf()['A7/' + p].id === M('A7/' + p).id) && /^From Claude \(/.test(M('A7/' + many[35]).description), 'every file of the cut-short run should be on record, and the one without a description given one');
ok(/The run before this one was cut short/.test(activity()) && /4 copied in, 4 already there and taken on/.test(activity()) && !PROPS.running, 'the Activity tab should say the run was cut short and what was taken on: ' + activity().slice(0, 200));
mirrorIsRight('after a run cut short (his)', [MIR + 'M7/' + wd]);
// … and a run stopped while REPLACING files: the first has its new copy and its old one binned, the second has both copies side by side
const redo = many.slice(0, 3), olds = redo.map(p => M('A7/' + p));
publish('croix18-windy-hill-a7', R => redo.forEach((p, n) => { R.blobs[p] = mk('cut short, second edition ' + n, 300000); }));
hour(); KILL = { after: 2 }; run();
ok(olds[0].trashed && !olds[1].trashed && allAt(olds[1].parent, base(redo[1])).length === 2 && stateOf()['A7/' + redo[0]].id === olds[0].id, 'the stand-in for a replacement cut short is not what it should be');
hour(); b0 = GH.blobCalls; settle();
ok(GH.blobCalls - b0 === 1 && olds.every(f => f.trashed), `after a replacement was cut short, ${GH.blobCalls - b0} files were downloaded (1: the third)`);
mirrorIsRight('after a replacement cut short (his)', [MIR + 'M7/' + wd]);
// … and one stopped, with a NEWER edition published before the next run: the copy left behind is of neither edition now, and goes
publish('croix18-windy-hill-a7', R => { R.blobs[redo[0]] = mk('third edition', 300000); R.blobs[redo[1]] = mk('third edition b', 300000); });
hour(); KILL = { after: 2 }; run();
const left = allAt(olds[1].parent, base(redo[1])).find(f => !f.description);
left.description = M('A7/' + redo[0]).description.replace(/\(([\w.-]+) [0-9a-f]{40} [0-9a-f]{32}\)/, (m, repo) => `(${repo} ${gitSha(left.bytes)} ${crypto.createHash('md5').update(left.bytes).digest('hex')})`);   // (as if the run had got as far as labelling it)
publish('croix18-windy-hill-a7', R => { R.blobs[redo[1]] = mk('fourth edition b', 300000); });
hour(); settle();
ok(left.trashed && allAt(olds[1].parent, base(redo[1])).length === 1, 'a labelled copy left behind by a stopped run, of an edition no longer published, should go');
mirrorIsRight('after a stopped run and a newer edition (his)', [MIR + 'M7/' + wd]);

// ================================================================ N. the record is lost: the Mirror tab is emptied
const idsBefore = Object.fromEntries(Object.entries(stateOf()).filter(([, x]) => x.kind === 'file').map(([p, x]) => [p, x.id]));
const livesBefore = [liveId('A7'), liveId('M7')];
tracker(livesBefore[1])['5,8'] = '✓';
HUBSHEET.getSheetByName('Mirror')._.cells = {};
hour(); b0 = GH.blobCalls; made0 = DRIVE.creates; settle();
const idsAfter = Object.fromEntries(Object.entries(stateOf()).filter(([, x]) => x.kind === 'file').map(([p, x]) => [p, x.id]));
ok(GH.blobCalls === b0 && DRIVE.creates === made0, `with the record lost, ${GH.blobCalls - b0} files were downloaded again and ${DRIVE.creates - made0} made (none should be: each file says what it is)`);
ok(Object.keys(idsBefore).filter(p => idsAfter[p] !== idsBefore[p]).every(p => p === 'M7/' + wd) && Object.keys(idsAfter).length === Object.keys(idsBefore).length - 1, 'the rebuilt record should name the same files (but for the withdrawn one he edited): ' + Object.keys(idsBefore).filter(p => idsAfter[p] !== idsBefore[p]).slice(0, 3));
ok(liveId('A7') === livesBefore[0] && liveId('M7') === livesBefore[1] && allAt(wh, 'M7 Master Sheet 2026-27').length === 1 && allAt(wh, 'A7 Master Sheet 2026-27').length === 1, 'the live sheets should be found again, not made a second time');
ok(tracker(liveId('M7'))['5,8'] === '✓' && tracker(liveId('M7'))['6,8'] === '✓', 'his ticks should survive the record being rebuilt');
ok(line('Your own copy in Apps').length === 1 && said() === 'up to date', 'his own console should be recognised again: ' + JSON.stringify(status().slice(0, 6)));
mirrorIsRight('record rebuilt (his)', [MIR + 'M7/' + wd]);

// ================================================================ O. a new master sheet, when Google is awkward about replacing a sheet's contents
const newSheet = (seed) => { publish('windy-hill-m7', R => { R.sheet = mk(seed, 181000); }); hour(); };
const liveIs = id => liveId('M7') === id && !gone(ALL[id]) && ALL[id].bytes.toString() === 'google sheet of ' + BODY[m7.sheet.sha] && allAt(wh, 'M7 Master Sheet 2026-27').length === 1 && JSON.stringify(BOOKS[id].getSheetByName('Drive').table()) === JSON.stringify(tab('Index'));
const ticked = id => tracker(id)['5,8'] === '✓' && tracker(id)['6,9'] === '✓' && tracker(id)['7,11'] === 'redo with period 3';
let liveM7 = liveId('M7');
// 1. the new contents are not visible until the run is over: it waits a minute and looks again
SVC.update = 'late'; newSheet('sheet late'); run();
ok(/new contents arriving/.test(liveLine('M7')[1]) && said() === 'finishing — one more run in a minute' && triggers.some(t => t.fn === 'syncMore'), 'while a sheet\'s new contents cannot be seen yet, the script should wait and look again: ' + JSON.stringify(liveLine('M7')));
tick(60000); settle();
ok(liveIs(liveM7) && ticked(liveM7) && PROPS.inplace === 'yes' && said() === 'up to date', 'a late replacement should be recognised a minute later, ticks and links in place');
// 2. Google says yes and does nothing: a new sheet is made, the old one binned, and it is not tried that way again
SVC.update = 'noop'; publish('windy-hill-m7', R => { R.blobs['M7 Unit 4 - Area/Lessons/4.06/M7 4.06 Finding Circumference - One More.pdf'] = mk('one more', 20000); }); newSheet('sheet noop'); settle();
ok(liveId('M7') !== liveM7 && ALL[liveM7].trashed && liveIs(liveId('M7')) && ticked(liveId('M7')) && PROPS.inplace === 'no' && /would not replace its contents/.test(activity()), 'a replacement that does not take should fall back to a new sheet: ' + JSON.stringify(liveLine('M7')));
liveM7 = liveId('M7'); let ups = SVC.updates;
newSheet('sheet after noop'); settle();
ok(SVC.updates === ups && liveId('M7') !== liveM7 && ALL[liveM7].trashed && liveIs(liveId('M7')) && ticked(liveId('M7')), 'once replacing in place has failed, new sheets should be made directly');
// 3. "Check everything" lets it try again; this time Google throws: a new sheet, in the same run
liveM7 = liveId('M7'); SVC.update = 'throw'; newSheet('sheet throw'); run(G.checkEverything); tick(60000); settle();
ok(liveId('M7') !== liveM7 && liveIs(liveId('M7')) && ticked(liveId('M7')) && PROPS.inplace !== 'no' && /replacing its contents failed/.test(activity()), 'a replacement that throws should fall back to a new sheet at once');
// 4. back to normal; the tracker's rows change — a lesson gone, one twice
liveM7 = liveId('M7'); SVC.update = 'ok';
LESSONS = ['4.01–4.02 Deriving', '4.04 Composite', '4.04 Composite', '4.07 Radius'];
newSheet('sheet new rows'); settle();
tk = tracker(liveM7);
ok(liveIs(liveM7) && tk['5,8'] === '✓' && tk['6,9'] === '✓' && tk['7,8'] === undefined && tk['7,11'] === undefined, 'ticks should follow their lesson when the rows change: ' + JSON.stringify(tk));
ok(/M7: a tick has no row in the new IXL tracker — "4\.05–4\.06 Circles".*note "redo with period 3"/.test(activity()), 'a tick whose lesson has gone should be written down, not lost: ' + activity().slice(0, 400));
tk['7,8'] = '✓'; tk['8,11'] = 'done early';                                    // the second "4.04 Composite", and 4.07
newSheet('sheet same rows'); settle();
tk = tracker(liveM7);
ok(liveIs(liveM7) && tk['7,8'] === '✓' && tk['6,8'] === '✓' && tk['8,11'] === 'done early', 'two rows for one lesson should each keep their own tick: ' + JSON.stringify(tk));
// 5. he deletes the live sheet: it is made again, with his ticks from the Kept tab
ALL[liveM7].trashed = true; hour(); settle();
ok(liveId('M7') !== liveM7 && liveIs(liveId('M7')) && tracker(liveId('M7'))['7,8'] === '✓' && tracker(liveId('M7'))['8,11'] === 'done early', 'a live sheet he deleted should be made again with his ticks');
// 6. the ticks cannot be written back yet: said, kept, and done the next hour
liveM7 = liveId('M7'); tracker(liveM7)['5,9'] = '✓';
const realIxl = () => BOOKS[liveM7].getSheetByName('IXL tracker');
newSheet('sheet ticks later'); hour();
let jam = true; const openById = SpreadsheetApp.openById;
SpreadsheetApp.openById = id => { const b = openById(id); if (!jam || id !== liveM7 || !SVC.jammed) return b; return Object.assign({}, b, { getSheetByName: n => { if (n === 'IXL tracker') throw new Error('Service error: Spreadsheets'); return b.getSheetByName(n); } }); };
const upd = DriveV3.Files.update; DriveV3.Files.update = (...a) => { const r = upd(...a); SVC.jammed = true; return r; };
settle();
ok(liveIs(liveM7) && tracker(liveM7)['5,9'] === undefined && line('DO SOON').some(r => /your IXL ticks are safe on the Kept tab/.test(r[1])) && said() === 'up to date', 'ticks that cannot be written back should be said to be safe: ' + JSON.stringify(line('DO SOON')));
jam = false; hour(); run();
ok(tracker(liveM7)['5,9'] === '✓' && tracker(liveM7)['7,8'] === '✓' && !line('DO SOON').length, 'the ticks should be written back the next hour');
SpreadsheetApp.openById = openById; DriveV3.Files.update = upd; delete SVC.jammed;

// ================================================================ P. a file he uploaded himself that is exactly the published one
const con2 = 'M7 Unit 4 - Area/M7 Unit 4 Review - All Slides.html', hand = 'M7 Unit 4 - Area/Lessons/4.06/M7 4.06 Finding Circumference - Exit Ticket.pdf';
publish('windy-hill-m7', R => { R.blobs[con2] = mk('review console', 500000); R.blobs[hand] = mk('exit ticket', 40000); });
const upCon = mkFile(base(con2), apps, BODY[m7.blobs[con2].sha], 'text/html'), upHand = mkFile(base(hand), M('M7/M7 Unit 4 - Area/Lessons/4.06'), BODY[m7.blobs[hand].sha], 'application/pdf');
hour(); b0 = GH.blobCalls; settle();
ok(GH.blobCalls - b0 === 1 && allAt(apps, base(con2)).length === 1 && allAt(apps, base(con2))[0] === upCon && M('M7/' + hand) === upHand, `his exact copies should be taken on, not doubled (${GH.blobCalls - b0} downloads; 1 expected, the console's place in the unit folder)`);
ok(!line('Your own copy in Apps').some(r => r[1] === base(con2)) && stateOf()['Apps:' + base(con2)].kind === 'file' && /^From Claude \(/.test(upCon.description) && driveTab()[pyKey(base(hand))] === upHand.id, 'a copy that is exactly the published file should count as the published file');
// … so the next version replaces it. His copy belongs to his own account and cannot be binned by this one: it is renamed out of the way
publish('windy-hill-m7', R => { R.blobs[con2] = mk('review console v2', 500000); });
hour(); settle();
ok(allAt(apps, base(con2)).length === 1 && allAt(apps, base(con2))[0].bytes.equals(BODY[m7.blobs[con2].sha]) && upCon.name === 'OLD - ' + base(con2) && !upCon.trashed, 'the new console should stand alone under its name, the copy it replaces renamed: ' + upCon.name);
ok(line('DO SOON').some(r => r[1].includes('OLD - ' + base(con2))) && said() === 'up to date', 'he should be told about the copy that could not be binned: ' + JSON.stringify(line('DO SOON')));
upCon.trashed = true;
// a file of his own in a published one's place — not the same bytes — is his: the links open it, and the published one is not put beside it
const stood = Object.keys(m7.blobs).find(p => /Lessons\/4\.10\/.* - Lesson Plan\.pdf$/.test(p)), stoodOurs = M('M7/' + stood);
stoodOurs.trashed = true;
const stoodHis = mkFile(base(stood), stoodOurs.parent, Buffer.from('the plan as he rewrote it'), 'application/pdf');
hour(); b0 = GH.blobCalls; run(G.checkEverything); tick(60000); settle();
const ownLine = () => line('Your own file, in a published one\'s place');
ok(GH.blobCalls === b0 && allAt(stoodHis.parent, base(stood)).length === 1 && ownLine().some(r => r[1] === 'M7/' + stood) && driveTab()[pyKey(base(stood))] === stoodHis.id && stoodHis.description === '', 'his own file in a published one\'s place should stay, alone, with the links on it: ' + JSON.stringify(ownLine()));
ok(/Checked every file/.test(activity()) && !PROPS.full && /^Windy Hill: /.test(HUBSHEET._.toasts.pop() || ''), '"Check everything" should run to the end and say so');
mirrorIsRight('his file in a published one\'s place (his)', [MIR + 'M7/' + wd, MIR + 'M7/' + stood]);
// he replaces its contents with the published file (Drive's "upload new version"): it is the published file now, and is kept current again
stoodHis.bytes = Buffer.from(BODY[m7.blobs[stood].sha]); stoodHis.updated = NOW;
hour(); b0 = GH.blobCalls; run(G.checkEverything); tick(60000); settle();
ok(GH.blobCalls === b0 && !ownLine().length && stateOf()['M7/' + stood].kind === 'file' && stateOf()['M7/' + stood].id === stoodHis.id, 'his file, once it is exactly the published one, should count as the published one');
publish('windy-hill-m7', R => { R.blobs[stood] = mk('lesson plan, next edition', 90000); });
hour(); settle();
ok(M('M7/' + stood).bytes.equals(BODY[m7.blobs[stood].sha]) && allAt(stoodHis.parent, base(stood)).length === 1 && stoodHis.name === 'OLD - ' + base(stood), 'and the next edition should take its place');
stoodHis.trashed = true;
// and a second file of his: deleted, the published one comes back
const stood2 = Object.keys(m7.blobs).find(p => /Lessons\/5\.02\/.* - Lesson Plan\.pdf$/.test(p)); M('M7/' + stood2).trashed = true;
const stood2His = mkFile(base(stood2), M('M7/' + path.posix.dirname(stood2)), Buffer.from('another of his'), 'application/pdf');
hour(); run(G.checkEverything); tick(60000); settle();
ok(ownLine().some(r => r[1] === 'M7/' + stood2), 'a second file of his in a published one\'s place should be named too');
stood2His.trashed = true; hour(); run(G.checkEverything); tick(60000); settle();
ok(M('M7/' + stood2) && M('M7/' + stood2).bytes.equals(BODY[m7.blobs[stood2].sha]) && !ownLine().length, 'once he deletes it the published file should come back');

// ================================================================ Q. "Check everything": every missing file back at once
const lost = Object.keys(a7.blobs).filter(p => / - Slides\.pdf$/.test(p)).slice(0, 7);
lost.forEach(p => { M('A7/' + p).trashed = true; });
hour(); run(G.checkEverything); tick(60000); settle();
ok(lost.every(p => M('A7/' + p) && M('A7/' + p).bytes.equals(BODY[a7.blobs[p].sha])) && /7 missing and fetched again/.test(activity()), 'after "Check everything" the seven deleted files should be back');
mirrorIsRight('check everything (his)', [MIR + 'M7/' + wd]);

// ================================================================ R. a unit renamed: its old folders go, unless something of his is in them
const hisNote = mkFile('my note.txt', M('A7/A7 Unit 9 - New/Lessons/9.01'), Buffer.from('his'), 'text/plain');
publish('croix18-windy-hill-a7', R => { for (const p of Object.keys(R.blobs)) if (p.startsWith('A7 Unit 9 - New/')) { R.blobs[p.replace('A7 Unit 9 - New/', 'A7 Unit 9 - Renamed/')] = R.blobs[p]; delete R.blobs[p]; } });
hour(); settle();
ok(M('A7/A7 Unit 9 - Renamed/Lessons/9.02') && !M('A7/A7 Unit 9 - New/Lessons/9.02') && M('A7/A7 Unit 9 - New/Lessons/9.01/my note.txt') === hisNote && !hisNote.trashed, 'a renamed unit\'s empty folders should go; the one holding his note should stay');
ok(driveTab()[pyKey('A7 Unit 9 - Renamed')] === M('A7/A7 Unit 9 - Renamed').id && !(pyKey('A7 Unit 9 - New') in driveTab()) && !Object.keys(stateOf()).some(p => p.startsWith('A7/A7 Unit 9 - New/')), 'the Drive tab and the record should know the unit by its new name only');
mirrorIsRight('unit renamed (his)', [MIR + 'M7/' + wd, MIR + 'A7/A7 Unit 9 - New/Lessons/9.01/my note.txt']);
hisNote.trashed = true;

// ================================================================ S. the day's allowances run out: it pauses, says so, and carries on later
const burst = n => { const ps = Array.from({ length: n }, (_, k) => `M7 Unit 4 - Area/Lessons/4.06/M7 4.06 Finding Circumference - Extra ${nextId}-${k}.pdf`); publish('windy-hill-m7', R => ps.forEach(p => { R.blobs[p] = mk('extra ' + p, 30000); })); return ps; };
// first, two courses with a lot to fetch and room for only some of it: each course gets its turn
const both = Array.from({ length: 40 }, (_, k) => `Unit 4 extras/Extra ${k}.pdf`);
publish('windy-hill-m7', R => both.forEach(p => { R.blobs['M7 Unit 4 - Area/' + p] = mk('m7 turn ' + p, 30000); }));
publish('croix18-windy-hill-a7', R => both.forEach(p => { R.blobs['A7 Unit 9 - Renamed/' + p] = mk('a7 turn ' + p, 30000); }));
GH.metered = true; GH.remaining = 75; hour(); run();
const gotA = both.filter(p => M('A7/A7 Unit 9 - Renamed/' + p)).length, gotM = both.filter(p => M('M7/M7 Unit 4 - Area/' + p)).length;
ok(/^paused — GitHub/.test(said()) && gotA >= 8 && gotM >= 8 && gotA + gotM < 80 && Math.abs(gotA - gotM) <= 8, `with room for only some files, each course should get its turn (A7 ${gotA}, M7 ${gotM} of 40 each)`);
GH.metered = false; GH.remaining = 5000; hour(); settle();
ok(said() === 'up to date' && both.every(p => M('A7/A7 Unit 9 - Renamed/' + p) && M('M7/M7 Unit 4 - Area/' + p)), 'and the rest should follow');
// the spreadsheet falters while one course's record is being written down mid-copy: that course stops for this run, the other goes on
publish('windy-hill-m7', R => both.forEach(p => { R.blobs['M7 Unit 4 - Area/' + p] = mk('m7 falter ' + p, 30000); }));
publish('croix18-windy-hill-a7', R => both.forEach(p => { R.blobs['A7 Unit 9 - Renamed/' + p] = mk('a7 falter ' + p, 30000); }));
{
  const mir = HUBSHEET.getSheetByName('Mirror'), clear = mir.clearContents; let once = true;
  mir.clearContents = () => { if (once) { once = false; throw new Error('Service Spreadsheets timed out while accessing the document'); } clear(); };
  hour(); run(); mir.clearContents = clear;
  const okA = both.filter(p => M('A7/A7 Unit 9 - Renamed/' + p).bytes.equals(BODY[a7.blobs['A7 Unit 9 - Renamed/' + p].sha])).length, okM = both.filter(p => M('M7/M7 Unit 4 - Area/' + p).bytes.equals(BODY[m7.blobs['M7 Unit 4 - Area/' + p].sha])).length;
  ok(!once && line('PROBLEM').length === 1 && /^(A7|M7): Service Spreadsheets timed out/.test(line('PROBLEM')[0][1]) && Math.max(okA, okM) === 40 && Math.min(okA, okM) < 40, `a fault while one course was being copied should stop that course only (A7 ${okA}, M7 ${okM} of 40; ${JSON.stringify(line('PROBLEM'))})`);
  hour(); settle();
  ok(said() === 'up to date' && both.every(p => M('A7/A7 Unit 9 - Renamed/' + p).bytes.equals(BODY[a7.blobs['A7 Unit 9 - Renamed/' + p].sha]) && M('M7/M7 Unit 4 - Area/' + p).bytes.equals(BODY[m7.blobs['M7 Unit 4 - Area/' + p].sha])), 'and the next hour that course should finish');
  mirrorIsRight('after a fault mid-copy (his)', [MIR + 'M7/' + wd]);
}
let extra = burst(30);
GH.metered = true; GH.remaining = 45; hour(); run();
ok(/^paused — GitHub's hourly allowance of requests is used up/.test(said()) && !line('PROBLEM').length && !triggers.some(t => t.fn === 'syncMore') && extra.filter(p => M('M7/' + p)).length > 7 && extra.filter(p => M('M7/' + p)).length < 24, `GitHub's allowance nearly gone: the script should stop asking and say so (${extra.filter(p => M('M7/' + p)).length} of 30 in; "${said()}")`);
ok(look('Status', 2, 1).setBackground === '#fff2cc' && /Paused: GitHub/.test(activity()), 'a pause should be amber on the Status tab and in the Activity tab');
GH.metered = false; GH.remaining = 5000; hour(); settle();
ok(said() === 'up to date' && extra.every(p => M('M7/' + p)), 'the next hour the rest should arrive');
extra = burst(12);
DRIVE.failCreate = { skip: 3, times: 1e9, message: 'Service invoked too many times for one day: drive.' }; hour(); run();
ok(/^paused — Google's allowance for today is used up/.test(said()) && !line('PROBLEM').length && !triggers.some(t => t.fn === 'syncMore') && extra.filter(p => M('M7/' + p)).length === 3, `Google's allowance gone: the script should stop and say so ("${said()}")`);
DRIVE.failCreate = null; hour(); settle();
ok(said() === 'up to date' && extra.every(p => M('M7/' + p)), 'the next day the rest should arrive');
extra = burst(5);
DRIVE.failCreate = { skip: 2, times: 1e9, message: 'Drive storage quota has been exceeded.' }; hour(); run();
ok(line('PROBLEM').length === 1 && /out of space: empty its Drive trash/.test(line('PROBLEM')[0][1]) && said() === 'NEEDS A LOOK' && !triggers.some(t => t.fn === 'syncMore') && extra.filter(p => M('M7/' + p)).length === 2, 'a full account should be said as what it is, once: ' + JSON.stringify(line('PROBLEM')));
DRIVE.failCreate = null; hour(); settle();
ok(said() === 'up to date' && extra.every(p => M('M7/' + p)), 'with room made the rest should arrive');
extra = burst(4);
DRIVE.failCreate = { skip: 1, times: 1, message: 'We\'re sorry, a server error occurred. Please wait a bit and try again.' }; hour(); settle();
ok(line('PROBLEM').length === 1 && /Drive would not take it/.test(line('PROBLEM')[0][1]) && extra.filter(p => M('M7/' + p)).length === 3, 'one file Drive refuses should be one PROBLEM line; the rest should arrive: ' + JSON.stringify(line('PROBLEM')));
DRIVE.failCreate = null; hour(); settle();
ok(said() === 'up to date' && extra.every(p => M('M7/' + p)), 'the refused file should arrive the next hour');
const huge = 'M7 Unit 4 - Area/a film of the lesson.mp4';
publish('windy-hill-m7', R => { R.blobs[huge] = mk('huge', 60 * 2 ** 20); });
hour(); b0 = GH.blobCalls; settle();
ok(GH.blobCalls === b0 && line('PROBLEM').length === 1 && /is too large for the script to carry \(60 MB\): tell Claude/.test(line('PROBLEM')[0][1]) && !M('M7/' + huge), 'a file too large to pass through a script should be said, not tried: ' + JSON.stringify(line('PROBLEM')));
publish('windy-hill-m7', R => { delete R.blobs[huge]; }); hour(); settle();
mirrorIsRight('after the pauses (his)', [MIR + 'M7/' + wd]);

// ================================================================ T. telling him: the token's date, the emails
hour(); run();
ok(!PROPS.trouble && !PROPS.mailed && !MAIL.length, 'with nothing wrong nothing should be pending for an email');
dialogs.answer = 'not an address'; G.setEmail(); ok(!PROPS.EMAIL && /does not look like one email address/.test(dialogs.alerts.pop()), 'a string that is not an address was saved');
dialogs.answer = ' teacher@example.org '; G.setEmail();
ok(PROPS.EMAIL === 'teacher@example.org' && MAIL.length === 1 && MAIL[0].to === 'teacher@example.org' && /alerts are on/.test(MAIL[0].subject) && /test message is on its way/.test(dialogs.alerts.pop()), 'turning the emails on should send a test message');
MAIL.length = 0;
const inDays = d => new Date(NOW + d * 86400e3).toISOString().slice(0, 19).replace('T', ' ') + ' UTC';
GH.expiry = inDays(200); hour(); run();
ok(/^works until \w{3} \d{1,2} \w{3} 20\d\d$/.test(line('GitHub token')[0][1]) && !line('DO SOON').length && line('Email alerts')[0][1] === 'on', 'a token with months to run should just be dated: ' + JSON.stringify(line('GitHub token')));
GH.expiry = inDays(10.5); hour(); run();
ok(line('DO SOON').some(r => /The GitHub token stops working within two weeks/.test(r[1])) && said() === 'up to date' && !MAIL.length, 'a token with ten days to run should be a DO SOON line, and no email in the first hour: ' + JSON.stringify(line('DO SOON')));
hour(); run();
ok(MAIL.length === 1 && /something to do soon/.test(MAIL[0].subject) && /DO SOON: The GitHub token stops working/.test(MAIL[0].body) && MAIL[0].body.includes(HUBSHEET.getUrl()), 'an hour later he should be written to, once: ' + JSON.stringify(MAIL.map(m => m.subject)));
for (let n = 0; n < 30; n++) { hour(); run(); }
ok(MAIL.length === 1, 'the same thing should not be said again within three days (' + MAIL.length + ' emails in 31 hours)');
tick(48 * 3600e3); run();
ok(MAIL.length === 2 && /within two weeks|within a week/.test(MAIL[1].body), 'after three days it should be said again');
GH.expiry = inDays(2.5); tick(7 * 3600e3); run();
ok(line('DO SOON').some(r => /in 2 days/.test(r[1])) && MAIL.length === 3, 'when the days run short the wording and the email should follow: ' + JSON.stringify(line('DO SOON')));
GH.expiry = inDays(300); hour(); run();                                        // he sets a new token
ok(!line('DO SOON').length && MAIL.length === 4 && /back to normal/.test(MAIL[3].subject) && !PROPS.trouble && !PROPS.mailed, 'when it is settled he should be told once: ' + JSON.stringify(MAIL.map(m => m.subject)));
PROPS.GITHUB_TOKEN = deadToken; hour(); run(); const firstSeen = MAIL.length;
hour(); run();
ok(firstSeen === 4 && MAIL.length === 5 && /something needs a look/.test(MAIL[4].subject) && /PROBLEM: A7: GitHub refused the token/.test(MAIL[4].body), 'a problem that lasts an hour should be written about: ' + JSON.stringify(MAIL.map(m => m.subject)));
for (let n = 0; n < 3; n++) { hour(); run(); }
PROPS.GITHUB_TOKEN = realToken; GH.hidden = 'windy-hill-m7'; hour(); run();     // another problem takes its place
PROPS.GITHUB_TOKEN = deadToken; GH.hidden = null; hour(); run();
ok(MAIL.length === 5, 'not more than one email in six hours, whatever the problem: ' + JSON.stringify(MAIL.map(m => m.subject)));
tick(20 * 3600e3); run(); ok(MAIL.length === 6, 'a problem that lasts is written about once a day');
MAILFAIL = true; tick(25 * 3600e3); run(); MAILFAIL = false;
ok(MAIL.length === 6 && /An email could not be sent/.test(activity()) && line('PROBLEM').length === 2, 'an email that cannot be sent should not stop the run');
PROPS.GITHUB_TOKEN = realToken; hour(); run();
ok(MAIL.length === 7 && /back to normal/.test(MAIL[6].subject) && said() === 'up to date', 'and the all-clear sent when the token works again');
ok(nowhere(TOKEN) && nowhere(deadToken), 'a token is in an email, a sheet, a dialog or a file');
dialogs.answer = ''; G.setEmail(); ok(!PROPS.EMAIL && /are off/.test(dialogs.alerts.pop()), 'an empty box should turn the emails off');
PROPS.GITHUB_TOKEN = deadToken; hour(); run(); hour(); run(); PROPS.GITHUB_TOKEN = realToken; hour(); run();
ok(MAIL.length === 7, 'with the emails off nothing should be sent');
GH.expiry = null;
G.forgetToken(); ok(!PROPS.GITHUB_TOKEN && /forgotten/.test(dialogs.alerts.pop()), 'forgetToken'); hour(); run();
ok(line('PROBLEM').some(r => /No GitHub token yet/.test(r[1])) && line('GitHub token')[0][1] === 'not set', 'with the token forgotten the Status tab should ask for one');
PROPS.GITHUB_TOKEN = realToken; hour(); run();
G.stopHourly(); hour(); run();
ok(line('DO SOON').some(r => /The hourly sync is off/.test(r[1])) && line('Hourly sync')[0][1] === 'OFF', 'with the hourly sync off the Status tab should say so');
G.everyHour(); DRIVE.used = 13.5 * 2 ** 30; hour(); run();
ok(line('DO SOON').length === 1 && /nearly full \(13\.5 GB of 15 GB used\)/.test(line('DO SOON')[0][1]), 'a nearly full account should be said: ' + JSON.stringify(line('DO SOON')));
DRIVE.used = 2 * 2 ** 30; hour(); run();
G.about(); ok(/version 3/.test(dialogs.alerts.pop()), 'About');
ok(/State\s+up to date/.test(hubReads()), 'drive/hub.py should still read the Status tab');

// ================================================================ U. the spreadsheet is shared: another of his accounts opens it and uses the menu
{
  const world = () => JSON.stringify([Object.values(ALL).map(x => [x.id, x.name, x.trashed, x.updated, x.description]), tab('Status'), tab('Mirror').length, PROPS, triggers.length]);
  const w0 = world(); c0 = GH.calls;
  USER = 'personal';
  G.onOpen();
  ok(/set up from another Google account/.test(G.sync()), 'another account\'s sync should only say whose the script is');
  G.syncNow(); ok(/set up from another Google account/.test(HUBSHEET._.toasts.pop() || ''), '"Sync now" from another account should say whose the script is');
  dialogs.answer = TOKEN; G.setToken(); const t1 = dialogs.alerts.pop();
  dialogs.answer = 'someone@example.org'; G.setEmail(); const t2 = dialogs.alerts.pop();
  G.checkEverything(); const t3 = dialogs.alerts.pop(); G.forgetToken(); const t4 = dialogs.alerts.pop(); G.everyHour(); const t5 = dialogs.alerts.pop();
  ok([t1, t2, t3, t4, t5].every(t => /set up from another Google account/.test(t || '')) && !Object.keys(OTHERPROPS).length && !otherTriggers.length, 'every menu item, from another account, should refuse: ' + JSON.stringify([t1, t2, t3, t4, t5]) + JSON.stringify(OTHERPROPS));
  let no = ''; try { G.setup(); } catch (e) { no = e.message; }
  ok(/already set up from another Google account/.test(no) && /takeOver/.test(no), 'setup from another account should refuse and say how to move the script: ' + no);
  otherTriggers.push({ fn: 'sync', every: 1, getHandlerFunction: () => 'sync' });        // (a trigger that account made before the script was moved away from it)
  G.sync(); ok(!otherTriggers.length, 'an account that no longer runs the script should drop its own hourly trigger');
  USER = 'windyhill';
  ok(world() === w0 && GH.calls === c0 && MAIL.length === 7, 'another account using the menu changed something');
  hour(); run(); ok(said() === 'up to date', 'and the Windy Hill account carries on');
  // he moves the script to his personal account on purpose
  USER = 'personal'; run(G.takeOver);
  ok(OTHERPROPS.account === SCRIPTPROPS.account && otherTriggers.filter(t => t.fn === 'sync').length === 1 && line('PROBLEM').some(r => /No GitHub token yet/.test(r[1])), 'takeOver should make this account the one that runs the script (and ask it for a token)');
  USER = 'windyhill'; hour(); const w1 = world().replace(/,\d+\]$/, ''); G.sync();
  ok(!triggers.length && world().replace(/,\d+\]$/, '') === w1, 'the account it was moved away from should stop, touching nothing');
  USER = 'personal'; G.stopHourly(); for (const k of Object.keys(OTHERPROPS)) delete OTHERPROPS[k];
  USER = 'windyhill'; SCRIPTPROPS.account = PROPS.account; G.everyHour(); hour(); run();          // … and back again
  ok(said() === 'up to date' && triggers.filter(t => t.fn === 'sync').length === 1, 'back in the Windy Hill account all should be as it was: ' + said());
}

// ================================================================ L. two runs at once; the hourly trigger; the end state
locked = true; c0 = GH.calls; ok(/already at work/.test(G.sync()) && GH.calls === c0, 'a second run should stand back while one is at work'); locked = false;
G.everyHour(); G.everyHour(); ok(triggers.filter(t => t.fn === 'sync').length === 1, 'the hourly trigger should exist once');
G.stopHourly(); ok(!triggers.some(t => t.fn === 'sync'), 'stopHourly');
ok(untouched() === before, 'something of his was touched');
ok(frozen().split('\n').slice(1).join() === frozen0.split('\n').slice(1).join(), 'his files in My files and My versions were touched');
ok(nowhere(TOKEN) && nowhere(deadToken) && nowhere('github_pat_'), 'a token is in a sheet, a file, an email or a dialog');
const st = stateOf(), dup = Object.values(st).map(x => x.id);
ok(new Set(dup).size === dup.length, 'two lines of the Mirror tab share an id');
ok(Object.values(ALL).filter(x => x.kind === 'folder' && !gone(x) && ['From Claude', 'My versions', 'My files', 'Apps'].includes(x.name)).length === 4, 'a managed folder was made twice');
G.everyHour();
{ // a year of small troubles coming and going: the Activity tab keeps its newest 400 lines
  const act = HUBSHEET.getSheetByName('Activity')._, had = tab('Activity').length;
  for (let r = had + 1; r <= 420; r++) { act.cells[r + ',1'] = 'long ago'; act.cells[r + ',2'] = 'old line ' + r; }
  act.rows = Math.max(act.rows, 420);
  GH.hidden = 'windy-hill-m7'; hour(); run(); GH.hidden = null; hour(); run();
  const now = tab('Activity');
  ok(now.length === 401 && now[0][0] === 'When' && now[1][1] === 'The problems are cleared.' && /^PROBLEM: M7/.test(now[2][1]) && now[400][1] === 'old line 399' && said() === 'up to date', 'the Activity tab should keep its newest 400 lines: ' + now.length + ' / ' + now[400]);
}
G.stopHourly();
ok(Object.keys(PROPS).every(k => /^(account|GITHUB_TOKEN|EMAIL|head:[\w-]+|audit|tab|tab-at|own|idle|inplace|dressed|logged|logged-look|trouble|mailed|full|full-at|running)$/.test(k)), 'a setting the test does not know: ' + Object.keys(PROPS));
mirrorIsRight('the end (his)', [MIR + 'M7/' + wd]);
// a console he keeps his own copy of is withdrawn: his copy is no longer anyone's business
const conPath = Object.keys(m7.blobs).find(p => base(p) === his[1].name);
G.everyHour(); publish('windy-hill-m7', R => { delete R.blobs[conPath]; }); hour(); settle();
ok(!line('Your own copy in Apps').length && !('Apps:' + his[1].name in stateOf()) && untouched() === before && !M('M7/' + conPath), 'once a console is withdrawn, his own copy of it in Apps should be left alone and no longer listed');
mirrorIsRight('the very end (his)', [MIR + 'M7/' + wd]);

console.log(bad.length ? bad.join('\n') + `\n${bad.length} problems` : `Drive script: ${checks} checks passed${live ? '' : ' on the kept list of package paths'} — first copy in ${runs} runs (${firstBlobCalls} files), ${GH.calls} GitHub requests in all, ${MAIL.length} emails, ${SVC.updates} master sheets replaced in place`);
process.exit(bad.length ? 1 : 0);
