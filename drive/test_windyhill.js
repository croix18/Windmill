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
const content = sha => Buffer.from('content of ' + sha);

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
// the fake GitHub's model of a repository: {head, blobs: {path in packages: {sha, size}}, sheet: {sha, size}}
const HUB = {};
for (const S of SPEC) {
  const blobs = {};
  if (live) for (const e of listed(S.dir, S.packages)) blobs[e.path] = { sha: e.sha, size: e.size };
  else for (const p of kept[S.packages]) blobs[p.slice(S.packages.length + 1)] = { sha: sha1('blob ' + p), size: 20000 + (p.length * 7919) % 900000 };
  HUB[S.repo] = { head: sha1('head 1 ' + S.repo), blobs, sheet: { sha: sha1('sheet 1 ' + S.repo), size: 180000 }, spec: S };
}
function publish(repo, change) { change(HUB[repo]); HUB[repo].head = sha1(HUB[repo].head + ' next'); }

// ---------------------------------------------------------------- the clock
let NOW = Date.UTC(2026, 9, 5, 12, 0, 0);
const tick = ms => { NOW += ms; };
class FakeDate extends Date { constructor(...a) { if (a.length) super(...a); else super(NOW); } static now() { return NOW; } }

// ---------------------------------------------------------------- a fake Drive
let nextId = 0;
const newId = () => '1' + sha1('id' + (nextId++)).slice(0, 20) + (nextId % 7 === 0 ? '-_' : 'xy') + 'AbCdEfGhIj';
const ALL = {};
function mkFolder(name, parent) { const d = { kind: 'folder', name, id: newId(), parent, trashed: false, updated: NOW, children: [] }; if (parent) parent.children.push(d); ALL[d.id] = d; return d; }
function mkFile(name, parent, bytes, mime) { const f = { kind: 'file', name, id: newId(), parent, trashed: false, updated: NOW, bytes: bytes || Buffer.alloc(0), mime: mime || 'application/octet-stream', description: '' }; parent.children.push(f); ALL[f.id] = f; return f; }
const iter = list => { let i = 0; return { hasNext: () => i < list.length, next: () => list[i++] }; };
const gone = x => { for (let d = x; d; d = d.parent) if (d.trashed) return true; return false; };
function blobOf(bytes, mime, name) { const b = { bytes, mime, name, getBytes: () => b.bytes, getContentType: () => b.mime, getName: () => b.name, setContentType: m => { b.mime = m; return b; } }; return b; }
function wrap(x) {
  const base = {
    getName: () => x.name, getId: () => x.id, isTrashed: () => gone(x), getLastUpdated: () => new FakeDate(x.updated),
    setTrashed: t => { tick(150); x.trashed = t; return base; },
  };
  if (x.kind === 'folder') Object.assign(base, {
    getFoldersByName: n => iter(x.children.filter(c => c.kind === 'folder' && c.name === n).map(wrap)),
    getFilesByName: n => iter(x.children.filter(c => c.kind === 'file' && c.name === n).map(wrap)),
    getFiles: () => { tick(120); return iter(x.children.filter(c => c.kind === 'file').map(wrap)); },          // trashed ones too, as the real one does
    getFolders: () => { tick(120); return iter(x.children.filter(c => c.kind === 'folder').map(wrap)); },
    createFolder: n => { tick(400); return wrap(mkFolder(n, x)); },
    createFile: b => { tick(600 + b.getBytes().length / 2000); return wrap(mkFile(b.getName(), x, Buffer.from(b.getBytes()), b.getContentType())); },
  });
  else Object.assign(base, {
    getSize: () => x.bytes.length, getBlob: () => blobOf(x.bytes, x.mime, x.name),
    setDescription: d => { tick(100); x.description = d; x.updated = NOW; return base; },
  });
  return base;
}
const ROOT = mkFolder('My Drive', null);
const DriveApp = {
  getFoldersByName: n => iter(Object.values(ALL).filter(x => x.kind === 'folder' && x.name === n).map(wrap)),
  createFolder: n => wrap(mkFolder(n, ROOT)),
  getFileById: id => { tick(110); const x = ALL[id]; if (!x || x.kind !== 'file') throw new Error('no such file'); return wrap(x); },
  getFolderById: id => { tick(110); const x = ALL[id]; if (!x || x.kind !== 'folder') throw new Error('no such folder'); return wrap(x); },
};
const at = p => { let d = ROOT; for (const n of p.split('/')) { d = d && d.children.find(c => c.name === n && !c.trashed); } return d || null; };
const allAt = (dir, name) => dir.children.filter(c => c.name === name && !c.trashed);
const pathOf = x => { const p = []; for (let d = x; d && d !== ROOT; d = d.parent) p.unshift(d.name); return p.join('/'); };

// his Drive before the script ever runs
mkFolder('Windy Hill Master Folder', mkFolder('Old stuff', ROOT));            // another folder of the same name, made earlier, without Apps
const wh = mkFolder('Windy Hill Master Folder', ROOT), apps = mkFolder('Apps', wh);
const HOME_ID = '1wodkpowCt32TQY_kiTpmcO4sn0Yh3Prb';                          // the address the script knows his folder by
delete ALL[wh.id]; wh.id = HOME_ID; ALL[HOME_ID] = wh;
const his = [
  mkFile('Deckhand.html', apps, Buffer.from('his tool')),
  mkFile('M7 Unit 4 Area - All Slides.html', apps, Buffer.from('a console he uploaded by hand last week')),
  mkFile('M7 4.06 Finding Circumference - Slides.pdf', mkFolder('4.06', mkFolder('M7', wh)), Buffer.from('an old copy he uploaded by hand')),
  mkFile('seating chart.xlsx', wh, Buffer.from('his')),
];
const untouched = () => his.map(f => [f.id, f.name, f.parent.id, f.trashed, f.updated, f.bytes.toString()].join('|')).join('\n');
const before = untouched();

// ---------------------------------------------------------------- fake spreadsheets
function asTyped(v) {
  if (typeof v !== 'string') return v;
  if (/^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(v.trim()) && v.trim() !== '') return Number(v);
  if (/^[=+-]/.test(v)) return '#ERROR!';
  return v;
}
function Book(names) {
  const B = { sheets: [], toasts: [], active: null };
  function Sheet(name) {
    const sh = { name, rows: 3, cols: 2, cells: {}, fmt: {}, formulas: {} };
    const api = {
      _: sh,
      getName: () => sh.name, setName: n => { if (B.sheets.some(s => s !== api && s._.name === n)) throw new Error('a sheet named ' + n + ' exists'); sh.name = n; },
      getIndex: () => B.sheets.indexOf(api) + 1,
      clearContents: () => { tick(200); sh.cells = {}; sh.formulas = {}; },
      getMaxRows: () => sh.rows, getMaxColumns: () => sh.cols,
      getLastRow: () => Object.keys(sh.cells).filter(k => sh.cells[k] !== '' && sh.cells[k] !== null).reduce((m, k) => Math.max(m, Number(k.split(',')[0])), 0),
      insertRowsAfter: (a, n) => { sh.rows += n; }, insertColumnsAfter: (a, n) => { sh.cols += n; },
      getRange: (r, c, nr, nc) => {
        nr = nr || 1; nc = nc || 1;
        const inside = () => { if (r < 1 || c < 1 || r + nr - 1 > sh.rows || c + nc - 1 > sh.cols) throw new Error('the range is outside the sheet'); };
        const put = (vals, typed) => {
          inside(); tick(300);
          if (vals.length !== nr || vals.some(v => v.length !== nc)) throw new Error('the data does not match the range');
          for (let i = 0; i < nr; i++) for (let j = 0; j < nc; j++) { const k = (r + i) + ',' + (c + j); sh.cells[k] = typed && sh.fmt[k] !== '@' ? asTyped(vals[i][j]) : vals[i][j]; }
        };
        return {
          setNumberFormat: f => { inside(); for (let i = 0; i < nr; i++) for (let j = 0; j < nc; j++) sh.fmt[(r + i) + ',' + (c + j)] = f; },
          setValues: v => put(v, true), setValue: v => put([[v]], true),
          setFormulas: v => { put(v, false); for (let i = 0; i < nr; i++) sh.formulas[(r + i) + ',' + c] = v[i][0]; },
          getValues: () => { inside(); tick(200); const out = []; for (let i = 0; i < nr; i++) { const row = []; for (let j = 0; j < nc; j++) row.push(sh.cells[(r + i) + ',' + (c + j)] ?? ''); out.push(row); } return out; },
        };
      },
      table: () => { const out = []; const last = api.getLastRow(); for (let i = 1; i <= last; i++) { const row = []; for (let j = 1; j <= sh.cols; j++) row.push(sh.cells[i + ',' + j] ?? ''); out.push(row); } return out; },
    };
    return api;
  }
  const api = {
    _: B,
    getSheets: () => B.sheets.slice(), getSheetByName: n => B.sheets.find(s => s._.name === n) || null,
    insertSheet: (n, pos) => { const s = Sheet(n); B.sheets.splice(Math.min(pos, B.sheets.length), 0, s); return s; },
    setActiveSheet: s => { B.active = s; }, moveActiveSheet: pos => { B.sheets.splice(B.sheets.indexOf(B.active), 1); B.sheets.splice(pos - 1, 0, B.active); },
    toast: (m, t) => B.toasts.push(t + ': ' + m),
  };
  names.forEach(n => B.sheets.push(Sheet(n)));
  return api;
}
const HUBSHEET = Book(['Untitled']);
const BOOKS = {};                                  // converted master sheets, by Drive id
const dialogs = { answer: null, alerts: [] };
const SpreadsheetApp = {
  getActiveSpreadsheet: () => HUBSHEET,
  openById: id => { tick(500); const x = ALL[id]; if (!BOOKS[id] || !x || gone(x)) throw new Error('no such spreadsheet'); return BOOKS[id]; },
  getUi: () => ({
    ButtonSet: { OK_CANCEL: 1 }, Button: { OK: 'OK', CANCEL: 'CANCEL' },
    createMenu: () => { const m = { addItem: () => m, addSeparator: () => m, addToUi: () => {} }; return m; },
    prompt: () => ({ getSelectedButton: () => dialogs.answer === null ? 'CANCEL' : 'OK', getResponseText: () => dialogs.answer }),
    alert: t => { dialogs.alerts.push(t); },
  }),
};
const SHEETS = 'application/vnd.google-apps.spreadsheet';
function converted(name, blob, folderId) {         // what Google makes of an uploaded .xlsx
  if (blob.getContentType() !== 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') throw new Error('not an xlsx');
  tick(4000);
  const f = mkFile(name, ALL[folderId], Buffer.from('google sheet of ' + blob.getBytes().toString()), SHEETS);
  const book = Book(['Today', 'IXL tracker', 'Links', 'Drive']);
  const ixl = book.getSheetByName('IXL tracker'); ixl._.rows = 12; ixl._.cols = 11;
  ['4.01–4.02 Deriving', '4.04 Composite', '4.05–4.06 Circles', '4.07 Radius'].forEach((l, k) => { ixl._.cells[(5 + k) + ',1'] = k + 1; ixl._.cells[(5 + k) + ',3'] = l; });
  book.getSheetByName('Drive')._.cells['1,1'] = 'windy-hill-drive';
  BOOKS[f.id] = book;
  return { id: f.id };
}
const DriveV3 = { Files: { create: (res, blob) => { if (!res.name || !res.parents || res.mimeType !== SHEETS) throw new Error('bad request'); return converted(res.name, blob, res.parents[0]); } } };
const DriveV2 = { Files: { insert: (res, blob, opt) => { if (!res.title || !res.parents[0].id || !opt.convert) throw new Error('bad request'); return converted(res.title, blob, res.parents[0].id); } } };

// ---------------------------------------------------------------- the other services
const Utilities = {
  DigestAlgorithm: { MD5: 'md5' }, Charset: { UTF_8: 'utf8' },
  computeDigest: (alg, s, cs) => [...crypto.createHash(alg).update(Buffer.from(s, cs)).digest()].map(b => b > 127 ? b - 256 : b),
  formatDate: (d, tz, f) => { if (tz !== 'UTC' || f !== "yyyy-MM-dd'T'HH:mm'Z'") throw new Error('format'); return new Date(d.getTime()).toISOString().slice(0, 16) + 'Z'; },
  newBlob: (bytes, mime, name) => blobOf(bytes, mime, name),
  sleep: ms => tick(ms),
};
const triggers = [];
const ScriptApp = {
  newTrigger: fn => ({ timeBased: () => ({
    everyHours: n => ({ create: () => triggers.push({ fn, every: n, getHandlerFunction: () => fn }) }),
    after: ms => ({ create: () => triggers.push({ fn, after: ms, getHandlerFunction: () => fn }) }),
  }) }),
  getProjectTriggers: () => triggers.slice(), deleteTrigger: t => triggers.splice(triggers.indexOf(t), 1),
};
const PROPS = {};
const PropertiesService = { getUserProperties: () => ({ getProperty: k => (k in PROPS ? PROPS[k] : null), setProperty: (k, v) => { PROPS[k] = String(v); } }) };
let locked = false;
const LockService = { getScriptLock: () => ({ tryLock: () => { if (locked) return false; locked = true; return true; }, releaseLock: () => { locked = false; } }) };

// ---------------------------------------------------------------- a fake GitHub
const TOKEN = 'github_pat_' + 'A1b2C3d4E5f6G7h8I9j0K1l2M3n4';
const GH = { calls: 0, blobCalls: 0, hidden: null, failBlob: null, truncate: false, log: [] };
function respond(code, body) { const buf = Buffer.isBuffer(body) ? body : Buffer.from(typeof body === 'string' ? body : JSON.stringify(body)); return { getResponseCode: () => code, getContentText: () => buf.toString(), getContent: () => [...buf] }; }
function github(q) {
  GH.calls++; tick(250);
  if (!q.muteHttpExceptions) throw new Error('the script would crash on an HTTP error');
  if (q.headers.Authorization !== 'Bearer ' + TOKEN) return respond(401, { message: 'Bad credentials' });
  const u = new URL(q.url), m = u.pathname.match(/^\/repos\/croix18\/([^/]+)\/(.*)$/);
  if (u.host !== 'api.github.com' || !m || !HUB[m[1]]) return respond(404, {});
  const R = HUB[m[1]], S = R.spec, rest = decodeURIComponent(m[2]);
  if (GH.hidden === m[1]) return respond(404, { message: 'Not Found' });
  if (rest === 'commits/main') return q.headers.Accept === 'application/vnd.github.sha' ? respond(200, R.head) : respond(200, { sha: R.head });
  const treeSha = sha1('tree ' + R.head);
  if (rest.startsWith('contents/')) {
    if (u.searchParams.get('ref') !== R.head) return respond(404, {});
    const dir = rest.slice(9);
    if (dir === S.packages.split('/')[0]) return respond(200, [{ name: 'build', type: 'dir', sha: sha1('x') }, { name: 'packages', type: 'dir', sha: treeSha }, { name: 'reference', type: 'dir', sha: sha1('y') }]);
    if (dir === S.sheetDir) return respond(200, [{ name: 'HOUSE STYLE.md', type: 'file', sha: sha1('hs'), size: 5 }].concat(R.sheet ? [{ name: S.sheet, type: 'file', sha: R.sheet.sha, size: R.sheet.size }] : []));
    return respond(404, {});
  }
  if (rest === 'git/trees/' + treeSha) {
    if (u.searchParams.get('recursive') !== '1') return respond(200, { tree: [], truncated: false });
    const tree = [], dirs = new Set();
    for (const p of Object.keys(R.blobs)) { const parts = p.split('/'); for (let k = 1; k < parts.length; k++) dirs.add(parts.slice(0, k).join('/')); tree.push({ path: p, type: 'blob', sha: R.blobs[p].sha, size: R.blobs[p].size }); }
    for (const d of dirs) tree.push({ path: d, type: 'tree', sha: sha1('t' + d) });
    return respond(200, { sha: treeSha, tree, truncated: GH.truncate });
  }
  if (rest.startsWith('git/blobs/')) {
    GH.blobCalls++; const sha = rest.slice(10);
    if (q.headers.Accept !== 'application/vnd.github.raw+json') return respond(200, { content: 'base64…' });   // not the raw bytes
    if (GH.failBlob === sha) return respond(500, {});
    const known = Object.values(R.blobs).some(b => b.sha === sha) || (R.sheet && R.sheet.sha === sha);
    tick(Object.values(R.blobs).concat(R.sheet ? [R.sheet] : []).filter(b => b.sha === sha).map(b => b.size / 4000)[0] || 0);
    return known ? respond(200, content(sha)) : respond(404, {});
  }
  return respond(404, {});
}
const UrlFetchApp = { fetch: (url, params) => github(Object.assign({ url }, params)), fetchAll: reqs => reqs.map(github) };

// ---------------------------------------------------------------- load the script
const src = fs.readFileSync(path.join(HERE, 'WindyHill.gs'), 'utf8');
function load(Drive) {
  return new Function('DriveApp', 'SpreadsheetApp', 'Utilities', 'ScriptApp', 'PropertiesService', 'LockService', 'UrlFetchApp', 'Date', 'Drive',
    src + '\nreturn { sync, syncMore, setup, setToken, everyHour, stopHourly, onOpen, key_, home_, HOME_ID, BUDGET_MS, MIRROR, MINE, EXTRA };')(
    DriveApp, SpreadsheetApp, Utilities, ScriptApp, PropertiesService, LockService, UrlFetchApp, FakeDate, Drive);
}
let G = load(DriveV3);
const tab = name => { const s = HUBSHEET.getSheetByName(name); return s ? s.table() : []; };
const status = () => tab('Status');
const line = label => status().filter(r => r[0] === label);
const stateOf = () => Object.fromEntries(tab('Mirror').slice(1).map(r => [r[0], { sha: r[1], id: r[2], kind: r[3], state: r[6] }]));
function run(fn) {                                  // one execution, as Google would allow it
  const t0 = NOW; (fn || G.sync)(); const took = NOW - t0;
  ok(took < 6 * 60 * 1000, 'a run took ' + Math.round(took / 1000) + ' s: Google would have stopped it');
  ok(!locked, 'the lock was not released');
  return took;
}
function settle(max) {                               // run until nothing waits, as the one-minute triggers would
  let n = 0;
  for (; n < (max || 40); n++) {
    run(); tick(60000);
    if (!triggers.some(t => t.fn === 'syncMore')) break;
    ok(triggers.filter(t => t.fn === 'syncMore').length === 1, 'more than one carry-on trigger');
  }
  return n + 1;
}
const wantPaths = () => {                            // every path the mirror should hold, with its blob
  const out = {};
  for (const R of Object.values(HUB)) {
    for (const [p, b] of Object.entries(R.blobs)) out['Windy Hill Master Folder/From Claude/' + R.spec.course + '/' + p] = b;
    if (R.sheet) out['Windy Hill Master Folder/From Claude/' + R.spec.sheet] = R.sheet;
  }
  return out;
};
const MIMES = { pdf: 'application/pdf', html: 'text/html', md: 'text/markdown', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
function mirrorIsRight(when, except) {
  const want = wantPaths(); let n = 0;
  for (const [p, b] of Object.entries(want)) {
    if (except && except.includes(p)) continue;
    const dir = at(path.posix.dirname(p)), hits = dir ? allAt(dir, path.posix.basename(p)) : [];
    n++;
    if (hits.length !== 1) { ok(false, `${when}: ${hits.length} copies of ${p}`); continue; }
    if (!hits[0].bytes.equals(content(b.sha))) ok(false, `${when}: ${p} holds another version`);
    const ext = p.split('.').pop();
    if (MIMES[ext] && hits[0].mime !== MIMES[ext]) ok(false, `${when}: ${p} is filed as ${hits[0].mime}`);
  }
  ok(n > 800, `${when}: only ${n} paths looked at`);
  // and nothing in the mirror that is not published
  const extra = [];
  (function walk(d, p) { for (const c of d.children) { if (c.trashed) continue; const q = p + '/' + c.name; if (c.kind === 'folder') walk(c, q); else if (!(q in want) && !(except || []).includes(q)) extra.push(q); } })(at('Windy Hill Master Folder/From Claude'), 'Windy Hill Master Folder/From Claude');
  ok(!extra.length, `${when}: in the mirror and not published: ${extra.slice(0, 3)}`);
  ok(untouched() === before || when.includes('his'), `${when}: something of his was touched`);
}
const consoles = () => Object.values(HUB).flatMap(R => Object.keys(R.blobs).filter(p => / - All Slides\.html$/.test(p)).map(p => [path.posix.basename(p), R.blobs[p]]));
const driveTab = () => Object.fromEntries(tab('Index').slice(1).map(r => [r[0], r[1]]));
const sheetsCells = () => [HUBSHEET, ...Object.values(BOOKS)].flatMap(b => b._.sheets.flatMap(s => Object.values(s._.cells))).map(String).join('\n');

// ================================================================ A. before there is a token
ok(G.HOME_ID === HOME_ID && G.home_().getId() === HOME_ID, 'the script should find his folder by its address');
delete ALL[HOME_ID]; wh.id = 'moved' + HOME_ID; ALL[wh.id] = wh;               // the address stops working: found by name, the one with Apps in it
ok(G.home_().getId() === wh.id, 'without the address the script should find his folder by name (the one with Apps)');
delete ALL[wh.id]; wh.id = HOME_ID; ALL[HOME_ID] = wh;
G.onOpen();
run(G.setup);
ok(triggers.filter(t => t.fn === 'sync' && t.every === 1).length === 1, 'setup should turn the hourly sync on, once');
ok(at('Windy Hill Master Folder/From Claude') && at('Windy Hill Master Folder/My versions') && at('Windy Hill Master Folder/My files'), 'setup should make the three folders in HIS master folder');
ok(Object.values(ALL).filter(x => x.kind === 'folder' && x.name === 'Apps' && !x.trashed).length === 1, 'a second Apps folder was made');
ok(status()[0][0] === 'windy-hill-status' && HUBSHEET.getSheets()[0].getName() === 'Status', 'the first tab should be Status');
ok(line('PROBLEM').some(r => /No GitHub token yet/.test(r[1])) && line('State')[0][1] === 'NEEDS A LOOK', 'without a token the Status tab should say so');
ok(GH.calls === 0, 'GitHub was called without a token');

// ================================================================ B. the token dialog
dialogs.answer = 'hello'; G.setToken();
ok(!('GITHUB_TOKEN' in PROPS) && /does not look like/.test(dialogs.alerts.pop()), 'a string that is not a token was saved');
dialogs.answer = null; G.setToken(); ok(!('GITHUB_TOKEN' in PROPS), 'cancel saved something');
dialogs.answer = 'github_pat_' + 'Z'.repeat(40); G.setToken();                 // a real-looking token GitHub does not know
ok(/CANNOT be read/.test(dialogs.alerts.pop()), 'a refused token should be reported in the dialog');
run(); ok(line('PROBLEM').some(r => /GitHub refused the token/.test(r[1])), 'a refused token should be on the Status tab: ' + JSON.stringify(line('PROBLEM')));
GH.hidden = 'windy-hill-m7';                                                   // a token that was not given one repository
dialogs.answer = '  ' + TOKEN + '\n'; G.setToken();
const said = dialogs.alerts.pop();
ok(PROPS.GITHUB_TOKEN === TOKEN && /croix18-windy-hill-a7: can be read/.test(said) && /windy-hill-m7: CANNOT be read/.test(said), 'the dialog should say which repositories the token reads: ' + said);
ok(triggers.some(t => t.fn === 'syncMore'), 'saving the token should start the first sync');

// ================================================================ C. the first copy, over several runs; one repository hidden
let runs = settle();
ok(line('PROBLEM').some(r => /^M7: the token cannot see this repository/.test(r[1])), 'the hidden repository should be named: ' + JSON.stringify(line('PROBLEM')));
ok(Object.keys(HUB['croix18-windy-hill-a7'].blobs).every(p => at('Windy Hill Master Folder/From Claude/A7/' + p)), 'A7 should be copied although M7 cannot be read');
ok(!at('Windy Hill Master Folder/From Claude/M7'), 'M7 was copied though the token cannot see it');
GH.hidden = null;
runs += settle();
ok(runs >= 4, 'the first copy fitted in ' + runs + ' runs: the time limit is not being honoured (or the fake is too fast)');
ok(!triggers.some(t => t.fn === 'syncMore') && triggers.filter(t => t.fn === 'sync').length === 1, 'after the last run only the hourly trigger should be left');
ok(line('State')[0][1] === 'up to date' && !line('PROBLEM').length, 'after the first copy: ' + JSON.stringify(status().slice(0, 12)));
mirrorIsRight('first copy');
const firstBlobCalls = GH.blobCalls;
ok(firstBlobCalls === Object.keys(wantPaths()).length + consoles().length - 1, `the first copy downloaded ${firstBlobCalls} files for ${Object.keys(wantPaths()).length} paths and ${consoles().length} consoles (one console is his own)`);
// consoles in Apps — except the one he keeps there himself
for (const [name, b] of consoles()) {
  const hits = allAt(apps, name);
  if (name === 'M7 Unit 4 Area - All Slides.html') ok(hits.length === 1 && hits[0] === his[1], 'his own console in Apps should be the only one of its name');
  else ok(hits.length === 1 && hits[0].bytes.equals(content(b.sha)) && hits[0].mime === 'text/html', 'console not in Apps: ' + name);
}
ok(line('Your own copy in Apps').length === 1 && line('Your own copy in Apps')[0][1] === 'M7 Unit 4 Area - All Slides.html', 'his own console should be named on the Status tab');
// the live master sheets
const liveLine = c => line(c + ' master sheet (live)')[0];
for (const S of SPEC) {
  const l = liveLine(S.course), id = l && (l[2].match(/\/d\/([^/]+)\/edit/) || [])[1], f = ALL[id];
  ok(f && f.parent === wh && f.mime === SHEETS && f.name === S.sheet.replace('.xlsx', '') && !gone(f), S.course + ': no live master sheet in Windy Hill: ' + JSON.stringify(l));
  if (BOOKS[id]) ok(JSON.stringify(BOOKS[id].getSheetByName('Drive').table()) === JSON.stringify(tab('Index')), S.course + ': the live sheet\'s Drive tab is not the index');
}
// the Drive tab: every code, by the rule the workbooks use
const dt = driveTab(), idx = tab('Index');
ok(idx[0][0] === 'windy-hill-drive' && idx[0][1] === 'v2' && Number(idx[0][3]) === idx.length - 1 && idx.length > 500, 'Index header: ' + idx[0]);
ok(idx.slice(1).every(r => /^k[0-9a-f]{12}$/.test(r[0]) && /^[A-Za-z0-9_-]{20,60}$/.test(r[1])) && new Set(idx.slice(1).map(r => r[0])).size === idx.length - 1, 'an Index line that is not a code and an id, or a code twice');
ok([HUBSHEET, ...Object.values(BOOKS)].every(b => b._.sheets.every(s => Object.values(s._.cells).every(v => typeof v !== 'number' || s._.name === 'IXL tracker'))), 'a cell the script wrote was read as a number');
let coded = 0;
for (const R of Object.values(HUB)) {
  const c = R.spec.course, paths = Object.keys(R.blobs), count = {};
  const dirs = new Set(); for (const p of paths) { const parts = p.split('/'); for (let k = 1; k < parts.length; k++) dirs.add(parts.slice(0, k).join('/')); }
  for (const p of [...paths, ...dirs]) { const n = p.split('/').pop(); count[n] = (count[n] || 0) + 1; }
  for (const p of [...paths, ...dirs]) {
    const parts = p.split('/'), name = parts[parts.length - 1], node = at(`Windy Hill Master Folder/From Claude/${c}/${p}`), codes = [];
    if (parts.length === 1 || (count[name] === 1 && name.startsWith(c + ' '))) codes.push(pyKey(name));
    if (parts.length === 2) codes.push(pyKey(parts[0] + '/' + name));
    for (const k of codes) { coded++; if (!(dt[k] === node.id || (name === his[2].name && false))) ok(false, `the Drive tab does not give ${c}/${p} under ${k}`); }
  }
}
ok(coded > 900, 'only ' + coded + ' codes checked');
ok(idx.length - 1 === new Set(Object.values(HUB).flatMap(R => { const out = []; const paths = Object.keys(R.blobs), dirs = new Set(), count = {}; for (const p of paths) { const parts = p.split('/'); for (let k = 1; k < parts.length; k++) dirs.add(parts.slice(0, k).join('/')); } for (const p of [...paths, ...dirs]) { const n = p.split('/').pop(); count[n] = (count[n] || 0) + 1; } for (const p of [...paths, ...dirs]) { const parts = p.split('/'), n = parts[parts.length - 1]; if (parts.length === 1 || (count[n] === 1 && n.startsWith(R.spec.course + ' '))) out.push(pyKey(n)); if (parts.length === 2) out.push(pyKey(parts[0] + '/' + n)); } return out; })).size, 'the Drive tab holds codes nothing is filed under');
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
// the code, against Python's (drive/hub.py), on names of every kind
const someNames = [...new Set(Object.values(ALL).map(x => x.name))].slice(0, 400).concat(['é accent', 'e\u0301 accent', 'M7 5.03 Making Population Predictions – Part 1 - Slides.pdf', 'A7 Unit 2 - Real Numbers, Square Roots and Cube Roots/00 - START HERE.md']);
const pyKeys = JSON.parse(execFileSync('python3', ['-c', 'import sys,json\nsys.path.insert(0, sys.argv[1])\nimport hub\nprint(json.dumps([hub.key(n) for n in json.load(sys.stdin)]))', HERE], { input: JSON.stringify(someNames), encoding: 'utf8', maxBuffer: 1 << 26 }));
someNames.forEach((n, i) => ok(G.key_(n) === pyKeys[i] && pyKeys[i] === pyKey(n), 'the code differs between the script and Python for ' + n));
ok(G.key_('é accent') === G.key_('e\u0301 accent'), 'two spellings of one name should share a code');
// the Status tab, read as a session reads it
const csvText = status().map(r => r.map(v => /[",\n]/.test(String(v)) ? '"' + String(v).replace(/"/g, '""') + '"' : String(v)).join(',')).join('\r\n');
fs.writeFileSync(path.join(HERE, 'out_status.csv'), csvText);
const read = execFileSync('python3', [path.join(HERE, 'hub.py'), 'status', '--csv', path.join(HERE, 'out_status.csv')], { encoding: 'utf8' });
fs.unlinkSync(path.join(HERE, 'out_status.csv'));
ok(/State\s+up to date/.test(read) && /M7 master sheet \(live\)/.test(read), 'drive/hub.py does not read the Status tab: ' + read.slice(0, 200));
ok(!sheetsCells().includes(TOKEN) && !Object.values(ALL).some(x => (x.description || '').includes(TOKEN)), 'the token is written somewhere it can be read');

// ================================================================ D. an hour later: nothing new
tick(3600e3);
let c0 = GH.calls, b0 = GH.blobCalls, ids0 = JSON.stringify(stateOf());
run();
ok(GH.calls - c0 === 2 && GH.blobCalls === b0, `an hour with nothing new made ${GH.calls - c0} requests and ${GH.blobCalls - b0} downloads (2 and 0 expected)`);
ok(JSON.stringify(stateOf()) === ids0 && line('State')[0][1] === 'up to date', 'an hour with nothing new changed the mirror');
mirrorIsRight('nothing new');

// ================================================================ E. a new commit: a deck rebuilt, a file added, one withdrawn, a new master sheet
const m7 = HUB['windy-hill-m7'], deck = Object.keys(m7.blobs).find(p => /Lessons\/4\.06\/.* - Slides\.pdf$/.test(p)), gonePath = Object.keys(m7.blobs).find(p => /Lessons\/4\.07\/.* - Lesson Plan\.pdf$/.test(p));
const added = 'M7 Unit 4 - Area/Lessons/4.06/M7 4.06 Finding Circumference - Handout.pdf';
const oldDeck = at('Windy Hill Master Folder/From Claude/M7/' + deck), oldGone = at('Windy Hill Master Folder/From Claude/M7/' + gonePath);
const oldLive = liveLine('M7')[2].match(/\/d\/([^/]+)/)[1];
// his ticks in the old live sheet
BOOKS[oldLive].getSheetByName('IXL tracker')._.cells['6,8'] = '✓'; BOOKS[oldLive].getSheetByName('IXL tracker')._.cells['6,9'] = '✓'; BOOKS[oldLive].getSheetByName('IXL tracker')._.cells['7,11'] = 'redo with period 3';
publish('windy-hill-m7', R => { R.blobs[deck] = { sha: sha1('deck v2'), size: 400000 }; R.blobs[added] = { sha: sha1('added'), size: 50000 }; delete R.blobs[gonePath]; R.sheet = { sha: sha1('sheet 2'), size: 181000 }; });
tick(3600e3); b0 = GH.blobCalls; settle();
ok(GH.blobCalls - b0 === 3, `the new commit downloaded ${GH.blobCalls - b0} files (the deck, the new handout, the master sheet)`);
mirrorIsRight('new commit');
ok(oldDeck.trashed && oldGone.trashed, 'the replaced deck and the withdrawn file should be in the trash');
ok(dt[pyKey(path.posix.basename(deck))] === oldDeck.id && driveTab()[pyKey(path.posix.basename(deck))] === at('Windy Hill Master Folder/From Claude/M7/' + deck).id && driveTab()[pyKey(path.posix.basename(deck))] !== oldDeck.id, 'the Drive tab should give the rebuilt deck\'s new id');
ok(driveTab()[pyKey(path.posix.basename(added))] && !(pyKey(path.posix.basename(gonePath)) in driveTab()), 'the new file should be in the Drive tab and the withdrawn one out of it');
const newLive = liveLine('M7')[2].match(/\/d\/([^/]+)/)[1];
ok(newLive !== oldLive && ALL[oldLive].trashed && !gone(ALL[newLive]) && allAt(wh, 'M7 Master Sheet 2026-27').length === 1, 'a new master sheet should replace the live one');
const tk = BOOKS[newLive].getSheetByName('IXL tracker')._.cells;
ok(tk['6,8'] === '✓' && tk['6,9'] === '✓' && tk['7,11'] === 'redo with period 3' && tk['5,8'] === undefined, 'his IXL ticks were not carried to the new sheet: ' + JSON.stringify([tk['6,8'], tk['6,9'], tk['7,11']]));
ok(JSON.stringify(BOOKS[newLive].getSheetByName('Drive').table()) === JSON.stringify(tab('Index')), 'the new live sheet\'s Drive tab is not filled');
ok(liveLine('A7')[2].includes(Object.keys(BOOKS).find(id => ALL[id].name.startsWith('A7') && !gone(ALL[id]))), 'A7\'s live sheet should be untouched by M7\'s commit');

// ================================================================ F. his own copy in My versions
const mine = at('Windy Hill Master Folder/My versions'), deckName = path.posix.basename(deck);
tick(3600e3);
const hisDeck = mkFile(deckName, mkFolder('Unit 4', mine), Buffer.from('his edited deck'), 'application/pdf');
const hisOther = mkFile('M7 4.06 warm-up I made.pdf', at('Windy Hill Master Folder/My files'), Buffer.from('his own'), 'application/pdf');
const frozen = () => [hisDeck, hisOther].map(f => [f.id, f.trashed, f.updated, f.bytes.toString(), f.parent.id].join('|')).join('\n'), frozen0 = frozen();
b0 = GH.blobCalls; run();
ok(driveTab()[pyKey(deckName)] === hisDeck.id, 'his copy in My versions should take the link');
ok(BOOKS[newLive].getSheetByName('Drive').table().some(r => r[1] === hisDeck.id), 'the live sheet should open his copy');
ok(line('Your copies the links open')[0][1] === '1' && !line('A NEWER VERSION IS PUBLISHED').length, 'Status should count his copy: ' + JSON.stringify(line('Your copies the links open')));
const mf = tab('My files');
ok(mf.length === 3 && mf.some(r => r[1] === deckName && /^yes — the links open this$/.test(r[4])) && mf.some(r => r[1] === hisOther.name && r[0] === 'My files' && r[4] === ''), 'My files tab: ' + JSON.stringify(mf));
ok(HUBSHEET.getSheetByName('My files')._.formulas['2,4'].startsWith('=HYPERLINK("https://drive.google.com/file/d/'), 'My files should carry a link to each file');
mirrorIsRight('his copy (his)');
// … and Claude then publishes a newer version of that deck: his still opens, and he is told
tick(3600e3);
publish('windy-hill-m7', R => { R.blobs[deck] = { sha: sha1('deck v3 — a correction'), size: 400000 }; });
settle();
ok(driveTab()[pyKey(deckName)] === hisDeck.id, 'his copy should still take the link after a newer one is published');
ok(at('Windy Hill Master Folder/From Claude/M7/' + deck).bytes.equals(content(sha1('deck v3 — a correction'))), 'the newer published deck should be in the mirror all the same');
ok(line('A NEWER VERSION IS PUBLISHED').some(r => r[1] === deckName) && tab('My files').some(r => r[1] === deckName && /CLAUDE HAS PUBLISHED A NEWER VERSION SINCE/.test(r[4])), 'he should be told a newer version exists: ' + JSON.stringify(line('A NEWER VERSION IS PUBLISHED')));
ok(frozen() === frozen0, 'his files in My versions and My files were touched');
// he deletes his copy: ours opens again
hisDeck.trashed = true; tick(3600e3); run();
ok(driveTab()[pyKey(deckName)] === at('Windy Hill Master Folder/From Claude/M7/' + deck).id && !line('A NEWER VERSION IS PUBLISHED').length, 'with his copy deleted the published deck should open');

// ================================================================ G. a file he edits in place, inside From Claude
const te = Object.keys(m7.blobs).find(p => /Lessons\/4\.05\/.* - Teacher Edition\.pdf$/.test(p)), teFile = at('Windy Hill Master Folder/From Claude/M7/' + te);
tick(3600e3); teFile.bytes = Buffer.from('he wrote notes into it'); teFile.updated = NOW;
publish('windy-hill-m7', R => { R.blobs[te] = { sha: sha1('te v2'), size: 300000 }; });
tick(600e3); settle();
ok(!teFile.trashed && teFile.bytes.toString() === 'he wrote notes into it' && allAt(teFile.parent, teFile.name).length === 1, 'a file he edited in place was replaced');
ok(line('A NEWER VERSION IS PUBLISHED').some(r => r[1] === 'M7/' + te), 'he should be told his edited file is behind: ' + JSON.stringify(line('A NEWER VERSION IS PUBLISHED')));
ok(driveTab()[pyKey(path.posix.basename(te))] === teFile.id, 'the link should still open the file he edited');
mirrorIsRight('edited in place (his)', ['Windy Hill Master Folder/From Claude/M7/' + te]);
tick(3600e3); run();
ok(line('A NEWER VERSION IS PUBLISHED').some(r => r[1] === 'M7/' + te), 'the note about his edited file should not vanish an hour later');
// he deletes it: the published version comes back by itself (the audit finds it gone)
teFile.trashed = true;
for (let n = 0; n < 12 && !at('Windy Hill Master Folder/From Claude/M7/' + te); n++) { tick(3600e3); settle(); }
ok(at('Windy Hill Master Folder/From Claude/M7/' + te) && at('Windy Hill Master Folder/From Claude/M7/' + te).bytes.equals(content(sha1('te v2'))), 'after he deleted his edited file the published one should return');
ok(!line('A NEWER VERSION IS PUBLISHED').length, 'the note should go once the published file is back');
mirrorIsRight('edited file deleted');

// ================================================================ H. a published file he deletes by accident; a withdrawn file he had edited
const lp = Object.keys(m7.blobs).find(p => /Lessons\/4\.03\/.* - Lesson Plan\.pdf$/.test(p));
at('Windy Hill Master Folder/From Claude/M7/' + lp).trashed = true;
let back = 0; for (; back < 12 && !at('Windy Hill Master Folder/From Claude/M7/' + lp); back++) { tick(3600e3); settle(); }
ok(at('Windy Hill Master Folder/From Claude/M7/' + lp), 'a published file he deleted should come back within a day');
ok(driveTab()[pyKey(path.posix.basename(lp))] === at('Windy Hill Master Folder/From Claude/M7/' + lp).id, 'the Drive tab should give the restored file');
const wd = Object.keys(m7.blobs).find(p => /Lessons\/4\.02\/.* - Lesson Plan\.pdf$/.test(p)), wdFile = at('Windy Hill Master Folder/From Claude/M7/' + wd);
tick(3600e3); wdFile.bytes = Buffer.from('his notes'); wdFile.updated = NOW;
publish('windy-hill-m7', R => { delete R.blobs[wd]; });
tick(600e3); settle();
ok(!wdFile.trashed && line('Edited by you, kept').some(r => r[1] === 'M7/' + wd), 'a withdrawn file he had edited should be kept, and said so');
mirrorIsRight('withdrawn but edited (his)', ['Windy Hill Master Folder/From Claude/M7/' + wd]);

// ================================================================ I. his own console in Apps, then deleted
his[1].trashed = true; tick(3600e3); settle();
const con = allAt(apps, 'M7 Unit 4 Area - All Slides.html');
ok(con.length === 1 && con[0] !== his[1] && con[0].mime === 'text/html' && !line('Your own copy in Apps').length, 'once he deletes his own console the published one should take its place');
his[1].trashed = false;                              // (put back, so "nothing of his was touched" still compares like with like)
con[0].trashed = true;

// ================================================================ J. GitHub says no, in every way
tick(3600e3);
const bigDeck = Object.keys(m7.blobs).find(p => /Lessons\/4\.08\/.* - Slides\.pptx$/.test(p));
publish('windy-hill-m7', R => { R.blobs[bigDeck] = { sha: sha1('pptx v2'), size: 900000 }; });
GH.failBlob = sha1('pptx v2'); run();
ok(line('PROBLEM').some(r => /GitHub answered 500/.test(r[1])) && line('State')[0][1] === 'NEEDS A LOOK', 'a failed download should be reported');
ok(at('Windy Hill Master Folder/From Claude/M7/' + bigDeck) && !at('Windy Hill Master Folder/From Claude/M7/' + bigDeck).bytes.equals(content(sha1('pptx v2'))), 'a failed download should leave the old file in place');
GH.failBlob = null; tick(3600e3); settle();
ok(at('Windy Hill Master Folder/From Claude/M7/' + bigDeck).bytes.equals(content(sha1('pptx v2'))) && !line('PROBLEM').length, 'the failed download should be fetched on the next run');
publish('croix18-windy-hill-a7', R => { R.blobs['A7 Unit 9 - New/Lessons/9.01/A7 9.01 New - Slides.pdf'] = { sha: sha1('a7 new'), size: 1000 }; });
GH.truncate = true; tick(3600e3); run();
ok(line('PROBLEM').some(r => /GitHub cut the list of files short/.test(r[1])) && !at('Windy Hill Master Folder/From Claude/A7/A7 Unit 9 - New'), 'a list cut short must not be acted on');
GH.truncate = false; tick(3600e3); settle();
ok(at('Windy Hill Master Folder/From Claude/A7/A7 Unit 9 - New/Lessons/9.01/A7 9.01 New - Slides.pdf') && driveTab()[pyKey('A7 Unit 9 - New')] === at('Windy Hill Master Folder/From Claude/A7/A7 Unit 9 - New').id, 'a new unit should arrive, folder and all, and be in the Drive tab');
const realToken = PROPS.GITHUB_TOKEN; PROPS.GITHUB_TOKEN = 'github_pat_' + 'expired'.repeat(5);
tick(3600e3); run();
ok(line('PROBLEM').filter(r => /GitHub refused the token/.test(r[1])).length === 2, 'an expired token should be reported for both courses');
ok(tab('Index').length > 500 && liveLine('M7')[2], 'with GitHub out of reach the Drive side should carry on');
PROPS.GITHUB_TOKEN = realToken; tick(3600e3); run();
ok(!line('PROBLEM').length, 'problems should clear once the token works again');
mirrorIsRight('after the refusals (his)', ['Windy Hill Master Folder/From Claude/M7/' + wd]);

// ================================================================ K. the Drive service: its older version, and absent
G = load(DriveV2);
publish('croix18-windy-hill-a7', R => { R.sheet = { sha: sha1('a7 sheet 2'), size: 200000 }; });
const a7Old = liveLine('A7')[2].match(/\/d\/([^/]+)/)[1];
tick(3600e3); settle();
ok(liveLine('A7')[2] && !liveLine('A7')[2].includes(a7Old) && ALL[a7Old].trashed, 'the older Drive service should convert the new A7 master sheet too');
G = load(undefined);
publish('croix18-windy-hill-a7', R => { R.sheet = { sha: sha1('a7 sheet 3'), size: 200000 }; });
const a7Mid = liveLine('A7')[2].match(/\/d\/([^/]+)/)[1];
tick(3600e3); settle();
ok(line('PROBLEM').some(r => /the Drive service is not turned on/.test(r[1])), 'without the Drive service the Status tab should say how to turn it on');
ok(!ALL[a7Mid].trashed && at('Windy Hill Master Folder/From Claude/A7 Master Sheet 2026-27.xlsx').bytes.equals(content(sha1('a7 sheet 3'))), 'without the Drive service the new .xlsx should still arrive and the old live sheet stay');
G = load(DriveV3); tick(3600e3); settle();
ok(!line('PROBLEM').length && !liveLine('A7')[2].includes(a7Mid), 'with the service back the new sheet should be converted');

// ================================================================ L. two runs at once; the hourly trigger; the end state
locked = true; c0 = GH.calls; G.sync(); ok(GH.calls === c0, 'a second run should stand back while one is at work'); locked = false;
G.everyHour(); G.everyHour(); ok(triggers.filter(t => t.fn === 'sync').length === 1, 'the hourly trigger should exist once');
G.stopHourly(); ok(!triggers.some(t => t.fn === 'sync'), 'stopHourly');
ok(untouched() === before, 'something of his was touched');
ok(frozen().split('\n')[1] === frozen0.split('\n')[1], 'his file in My files was touched');
ok(!sheetsCells().includes(TOKEN) && !sheetsCells().includes('expired'), 'a token is in a sheet');
const st = stateOf(), dup = Object.values(st).map(x => x.id);
ok(new Set(dup).size === dup.length, 'two lines of the Mirror tab share an id');
ok(Object.values(ALL).filter(x => x.kind === 'folder' && !gone(x) && ['From Claude', 'My versions', 'My files', 'Apps'].includes(x.name)).length === 4, 'a managed folder was made twice');
mirrorIsRight('the end (his)', ['Windy Hill Master Folder/From Claude/M7/' + wd]);

console.log(bad.length ? bad.join('\n') + `\n${bad.length} problems` : `Drive script: ${checks} checks passed${live ? '' : ' on the kept list of package paths'} — first copy in ${runs} runs (${firstBlobCalls} files), ${GH.calls} GitHub requests in all, ${Object.keys(BOOKS).length} master sheets converted`);
process.exit(bad.length ? 1 : 0);
