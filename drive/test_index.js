/* The Drive index script, run end to end against a stand-in for Apps Script.
 *
 *   node drive/test_index.js [<a7 repo>] [<m7 repo>]      (defaults: ../croix18-windy-hill-a7, ../windy-hill-m7 beside this one;
 *                                                          without them, the paths kept in drive/fixtures/packages.json)
 *
 * Nothing here can reach Google: DriveApp, SpreadsheetApp, Utilities and ScriptApp are small fakes
 * that behave as the real ones do in the ways the script relies on — a search by title words, files
 * in the trash, strings that a sheet turns into numbers unless the cell is plain text, digests as
 * signed bytes. The fake Drive is built from the two courses' package folders as he would upload
 * them, plus the mess a real Drive has: an older copy of a unit, a file in the trash, files that
 * are not course documents, a Word file beside its PDF. Then:
 *   - the Index tab, exported as CSV, is parsed by drive/index.py's rules (re-implemented here) and
 *     every document either course ships resolves to the id of its newest copy;
 *   - key_() agrees with Python's key() on every name (python3 is run for that);
 *   - a second run over a changed Drive rewrites the tabs cleanly; the hourly trigger is made once.
 * What it cannot show is that Google's services answer as the fakes do. The first real run is the
 * test of that, and the Status tab is what to read.
 */
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto'), { execFileSync } = require('child_process');
const HERE = __dirname;
const ARGS = process.argv.slice(2).filter(a => !a.startsWith('--'));
const A7 = ARGS[0] || path.join(HERE, '..', '..', 'croix18-windy-hill-a7');
const M7 = ARGS[1] || path.join(HERE, '..', '..', 'windy-hill-m7');
let checks = 0; const bad = [];
function ok(cond, msg) { checks++; if (!cond) bad.push(msg); }

// ---------------------------------------------------------------- a fake Drive
let nextId = 0;
function newId() { return '1' + crypto.createHash('sha1').update('id' + (nextId++)).digest('base64').replace(/[+/=]/g, '_').slice(0, 20) + (nextId % 7 === 0 ? '-' : 'x') + 'AbCdEfGhIjKl'.slice(0, 11); }
const ALL = [];                                    // every file and folder
function mkFolder(name, parent) { const d = { kind: 'folder', name, id: newId(), parent, trashed: false, updated: 1e12, children: [] }; if (parent) parent.children.push(d); ALL.push(d); return d; }
function mkFile(name, parent, updated, trashed, mime) { const f = { kind: 'file', name, id: newId(), parent, trashed: !!trashed, updated, size: 1000 + name.length, mime: mime || 'application/octet-stream' }; parent.children.push(f); ALL.push(f); return f; }
// The package paths: from the course repositories when they are here; otherwise from the list kept in
// drive/fixtures/packages.json (written by `node drive/test_index.js --write-fixture`; paths only).
const FIXTURE = path.join(HERE, 'fixtures', 'packages.json');
const live = fs.existsSync(path.join(A7, '.git')) && fs.existsSync(path.join(M7, '.git'));
const kept = live ? null : JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
function tracked(repo, sub) {
  if (!live) return kept[sub];
  return execFileSync('git', ['-C', repo, 'ls-files', '-z', sub], { encoding: 'utf8', maxBuffer: 1 << 28 }).split('\0').filter(Boolean);
}
if (process.argv.includes('--write-fixture')) {
  if (!live) throw new Error('the course repositories are not here');
  fs.mkdirSync(path.dirname(FIXTURE), { recursive: true });
  fs.writeFileSync(FIXTURE, JSON.stringify({ 'a7/packages': tracked(A7, 'a7/packages'), 'm7/packages': tracked(M7, 'm7/packages') }, null, 0));
  console.log('wrote', FIXTURE); process.exit(0);
}
function upload(repo, sub, into, updated) {
  for (const t of tracked(repo, sub)) {
    const parts = t.slice(sub.length + 1).split('/'); let d = into;
    for (const p of parts.slice(0, -1)) d = d.children.find(c => c.kind === 'folder' && c.name === p) || mkFolder(p, d);
    mkFile(parts[parts.length - 1], d, updated);
  }
}
const root = mkFolder('My Drive', null), wh = mkFolder('Windy Hill', root);
const dA7 = mkFolder('A7', wh), dM7 = mkFolder('M7', wh), apps = mkFolder('Apps', wh), latest = mkFolder('Latest', wh);
upload(A7, 'a7/packages', dA7, 2e12); upload(M7, 'm7/packages', dM7, 2e12);
// the mess
const names = ALL.filter(x => x.kind === 'file').map(x => x.name);
const oldUnit = mkFolder('M7 Unit 4 - Area', latest);                 // an older copy of a unit, elsewhere
const oldLessons = mkFolder('Lessons', oldUnit), old406 = mkFolder('4.06', oldLessons);
mkFile('00 - START HERE.md', oldUnit, 1.5e12);
const sample = names.find(n => /^M7 4\.06 .* - Slides\.pdf$/.test(n));
mkFile(sample, old406, 1.5e12);                                       // … with an older copy of a deck
mkFile(sample, apps, 2.5e12, true);                                   // a newer copy, in the trash
mkFile(sample, apps, 2.6e12, false, 'application/vnd.google-apps.shortcut');   // a shortcut to it: the same name, no file
mkFile('M7 Unit 4 Area - All Slides.html', apps, 2.2e12);             // a console: not something the sheets link
mkFile('A7 seating chart.xlsx', apps, 2.2e12);                        // a course-named file of another kind
mkFile('Budget for M7 trip.pdf', root, 2.2e12);                       // "M7" in the title, not at its start
mkFile('M7 2.01 Exploring Sample Space - Slides.pdf', apps, 2.4e12);  // Unit 2 ships a .pptx only: a PDF he made himself
const DRIVE_OK = () => true;

function titleHas(name, word) { return name.toLowerCase().split(/[^a-z0-9]+/).some(w => w.startsWith(word.toLowerCase())); }
function matches(q, x) {
  // the two queries the script sends, read literally
  const wants = [...q.matchAll(/title contains '([^']+)'/g)].map(m => m[1]);
  if (!q.startsWith('trashed = false and ')) throw new Error('fake Drive: a query it does not know: ' + q);
  if (x.trashed) return false;
  const not = q.match(/ and mimeType != '([^']+)'$/);
  if (!not) throw new Error('fake Drive: the query lets shortcuts through: ' + q);
  if (x.mime === not[1]) return false;
  if (q.includes("title contains 'Unit' and (")) return titleHas(x.name, 'Unit') && wants.filter(w => w !== 'Unit').some(w => titleHas(x.name, w));
  return wants.some(w => titleHas(x.name, w));
}
function iter(list) { let i = 0; return { hasNext: () => i < list.length, next: () => list[i++] }; }
function wrap(x) {
  return {
    getName: () => x.name, getId: () => x.id, getLastUpdated: () => new Date(x.updated), getSize: () => x.size, isTrashed: () => x.trashed,
    getFiles: () => iter(x.children.filter(c => c.kind === 'file').map(wrap)),              // the real one returns trashed files too
    getFolders: () => iter(x.children.filter(c => c.kind === 'folder').map(wrap)),
  };
}
const DriveApp = {
  searchFiles: q => iter(ALL.filter(x => x.kind === 'file' && matches(q, x)).map(wrap)),
  searchFolders: q => iter(ALL.filter(x => x.kind === 'folder' && matches(q, x)).map(wrap)),
};

// ---------------------------------------------------------------- a fake spreadsheet
function asTyped(v) {                              // what Sheets does with a string that is not in a plain-text cell
  if (typeof v !== 'string') return v;
  if (/^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(v.trim()) && v.trim() !== '') return Number(v);
  if (/^[=+-]/.test(v)) return '#ERROR!';
  return v;
}
function Sheet(ss, name) {
  const sh = { name, rows: 3, cols: 2, cells: {}, fmt: {} };
  const api = {
    _: sh,
    getName: () => sh.name, setName: n => { if (ss.sheets.some(s => s !== api && s._.name === n)) throw new Error('a sheet named ' + n + ' exists'); sh.name = n; },
    getIndex: () => ss.sheets.indexOf(api) + 1,
    clearContents: () => { sh.cells = {}; },
    getMaxRows: () => sh.rows, getMaxColumns: () => sh.cols,
    insertRowsAfter: (at, n) => { sh.rows += n; }, insertColumnsAfter: (at, n) => { sh.cols += n; },
    getRange: (r, c, nr, nc) => ({
      setNumberFormat: f => { for (let i = 0; i < nr; i++) for (let j = 0; j < nc; j++) sh.fmt[(r + i) + ',' + (c + j)] = f; },
      setValues: vals => {
        if (r + nr - 1 > sh.rows || c + nc - 1 > sh.cols) throw new Error('the range is outside the sheet');
        if (vals.length !== nr || vals.some(v => v.length !== nc)) throw new Error('the data does not match the range');
        for (let i = 0; i < nr; i++) for (let j = 0; j < nc; j++) {
          const k = (r + i) + ',' + (c + j); sh.cells[k] = sh.fmt[k] === '@' ? vals[i][j] : asTyped(vals[i][j]);
        }
      },
    }),
    csv: () => {
      let maxR = 0, maxC = 0;
      for (const k of Object.keys(sh.cells)) if (sh.cells[k] !== '') { const [a, b] = k.split(',').map(Number); maxR = Math.max(maxR, a); maxC = Math.max(maxC, b); }
      const out = [];
      for (let i = 1; i <= maxR; i++) { const row = []; for (let j = 1; j <= maxC; j++) { const v = String(sh.cells[i + ',' + j] ?? ''); row.push(/[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v); } out.push(row.join(',')); }
      return out.join('\r\n');
    },
  };
  return api;
}
const SS = { sheets: [], toasts: [] };
SS.sheets.push(Sheet(SS, 'Untitled'));
const ssApi = {
  getSheets: () => SS.sheets.slice(), getSheetByName: n => SS.sheets.find(s => s._.name === n) || null,
  insertSheet: (n, at) => { const s = Sheet(SS, n); SS.sheets.splice(at, 0, s); return s; },
  setActiveSheet: s => { SS.active = s; }, moveActiveSheet: pos => { SS.sheets.splice(SS.sheets.indexOf(SS.active), 1); SS.sheets.splice(pos - 1, 0, SS.active); },
  toast: (m, t) => SS.toasts.push(t + ': ' + m),
};
const SpreadsheetApp = { getActiveSpreadsheet: () => ssApi, getUi: () => { throw new Error('no UI in a test'); } };
const Utilities = {
  DigestAlgorithm: { MD5: 'md5' }, Charset: { UTF_8: 'utf8' },
  computeDigest: (alg, s, cs) => [...crypto.createHash(alg).update(Buffer.from(s, cs)).digest()].map(b => b > 127 ? b - 256 : b),
  formatDate: (d, tz, f) => { if (tz !== 'UTC' || f !== "yyyy-MM-dd'T'HH:mm'Z'") throw new Error('format'); return d.toISOString().slice(0, 16) + 'Z'; },
};
const triggers = [];
const ScriptApp = {
  newTrigger: fn => ({ timeBased: () => ({ everyHours: n => ({ create: () => triggers.push({ fn, n, getHandlerFunction: () => fn }) }) }) }),
  getProjectTriggers: () => triggers.slice(), deleteTrigger: t => triggers.splice(triggers.indexOf(t), 1),
};

const src = fs.readFileSync(path.join(HERE, 'WindyHillIndex.gs'), 'utf8');
const G = new Function('DriveApp', 'SpreadsheetApp', 'Utilities', 'ScriptApp',
  src + '\nreturn { refresh, everyHour, stopHourly, key_, build_, listFiles_, listUnits_ };')(DriveApp, SpreadsheetApp, Utilities, ScriptApp);

// ---------------------------------------------------------------- run it
G.refresh();
ok(SS.sheets.map(s => s._.name).join() === 'Index,Files,Status', 'tabs: ' + SS.sheets.map(s => s._.name).join());
const csv = SS.sheets[0].csv();
fs.writeFileSync(path.join(HERE, 'out_test_index.csv'), csv);

// read it back by index.py's rules
function pyKey(name) { return 'k' + crypto.createHash('md5').update(Buffer.from(name.normalize('NFC'), 'utf8')).digest('hex').slice(0, 12); }
const lines = csv.split('\r\n').map(l => l.split(','));
ok(lines[0][0] === 'windy-hill-index' && lines[0][1] === 'v1' && /^\d{4}-\d\d-\d\dT\d\d:\d\dZ$/.test(lines[0][2]), 'header line: ' + lines[0]);
const idx = {};
for (const r of lines.slice(1)) {
  ok(/^k[0-9a-f]{12}$/.test(r[0]) && /^[A-Za-z0-9_-]{20,60}$/.test(r[1]) && /^\d*$/.test(r[2] || ''), 'a line that is not a code and an address: ' + r);
  ok(!(r[0] in idx), 'a code twice: ' + r[0]); idx[r[0]] = { id: r[1], n: Number(r[2] || 1) };
}
ok(Number(lines[0][3]) === Object.keys(idx).length, 'the header counts ' + lines[0][3] + ' and there are ' + Object.keys(idx).length);

// every document either course ships resolves to its newest copy that is not in the trash
const byId = Object.fromEntries(ALL.map(x => [x.id, x]));
function pathOf(x) { const p = []; for (let d = x; d && d !== root; d = d.parent) p.unshift(d.name); return p.join('/'); }
let docs = 0, folders = 0;
for (const [repo, sub, top] of [[A7, 'a7/packages', 'Windy Hill/A7'], [M7, 'm7/packages', 'Windy Hill/M7']]) {
  const files = tracked(repo, sub), stems = new Set(files.filter(t => t.endsWith('.pdf')).map(t => path.basename(t, '.pdf')));
  const count = {}; files.forEach(t => { count[path.basename(t)] = (count[path.basename(t)] || 0) + 1; });
  for (const t of files) {
    const name = path.basename(t), rel = t.slice(sub.length + 1), parts = rel.split('/');
    const linked = /\.(pdf|pptx|md)$/.test(name) || (name.endsWith('.docx') && !stems.has(path.basename(name, '.docx')));
    if (!linked) { ok(!(pyKey(name) in idx) || count[name] > 1, 'indexed though the sheets never link it: ' + name); continue; }
    // by name when the name is one of a kind; by "<unit folder>/<name>" when it sits directly in the unit folder
    const keys = [];
    if (count[name] === 1 && /^(A7|M7) /.test(name)) keys.push(pyKey(name));
    if (parts.length === 2) keys.push(pyKey(parts[0] + '/' + name));
    for (const k of keys) {
      const hit = idx[k]; docs++;
      ok(hit && byId[hit.id] && byId[hit.id].name === name && !byId[hit.id].trashed, 'not resolved: ' + rel);
      if (hit && byId[hit.id]) ok(pathOf(byId[hit.id]) === top + '/' + rel, 'resolved to another copy: ' + rel + ' -> ' + pathOf(byId[hit.id]));
    }
    if (!keys.length) ok(count[name] > 1 || !/^(A7|M7) /.test(name), 'no way to reach ' + rel);
  }
  const units = new Set(files.map(t => t.slice(sub.length + 1).split('/')[0]));
  for (const u of units) {
    const hit = idx[pyKey(u)]; folders++;
    ok(hit && pathOf(byId[hit.id]) === top + '/' + u, 'unit folder not resolved to the current copy: ' + u + (hit ? ' -> ' + pathOf(byId[hit.id]) : ''));
    const subs = new Set(files.filter(t => t.startsWith(sub + '/' + u + '/') && t.slice(sub.length + u.length + 2).includes('/')).map(t => t.slice(sub.length + u.length + 2).split('/')[0]));
    for (const s of subs) { const h = idx[pyKey(u + '/' + s)]; folders++; ok(h && pathOf(byId[h.id]) === top + '/' + u + '/' + s, 'folder not resolved: ' + u + '/' + s); }
  }
}
// the mess is handled as it should be
ok(idx[pyKey(sample)].n === 2, 'the deck with an older copy should count 2 (the trashed one is not a copy): ' + idx[pyKey(sample)].n);
ok(idx[pyKey('M7 Unit 4 - Area')].n === 2, 'the unit with an older copy should count 2');
ok(!(pyKey('M7 Unit 4 Area - All Slides.html') in idx) && !(pyKey('A7 seating chart.xlsx') in idx) && !(pyKey('Budget for M7 trip.pdf') in idx), 'something that is not a linked document is in the index');
ok(pyKey('M7 2.01 Exploring Sample Space - Slides.pdf') in idx, 'a PDF he made himself for a lesson that ships none should be indexed');
// the key function against Python, on every name there is
const all = [...new Set(ALL.map(x => x.name).concat(['é accent', 'e\u0301 accent', 'M7 5.03 Making Population Predictions – Part 1 - Slides.pdf']))];
const py = execFileSync('python3', ['-c', 'import sys,json\nsys.path.insert(0, sys.argv[1])\nimport index\nprint(json.dumps([index.key(n) for n in json.load(sys.stdin)]))', HERE], { input: JSON.stringify(all), encoding: 'utf8', maxBuffer: 1 << 28 });
const pk = JSON.parse(py);
all.forEach((n, i) => ok(G.key_(n) === pk[i] && pk[i] === pyKey(n), 'key differs for ' + n));
ok(G.key_('é accent') === G.key_('e\u0301 accent'), 'two spellings of one name should share a code');
ok(new Set(all.map(pyKey)).size === new Set(all.map(n => n.normalize('NFC'))).size, 'two names share a code');
// the Files and Status tabs
const files = SS.sheets[1].csv().split('\r\n'), status = SS.sheets[2].csv();
ok(files[0] === 'name,last changed (UTC),size,copies with this name,address' && files.length > 500, 'Files tab: ' + files[0] + ' / ' + files.length);
ok(/Names that exist more than once,\d+ — the newest copy/.test(status) && status.includes('more than once,' + sample) && !/TELL CLAUDE/.test(status), 'Status tab');
ok(SS.toasts.length === 1, 'toast');
// python reads the same CSV
const shown = execFileSync('python3', ['-c', 'import sys\nsys.path.insert(0, sys.argv[1])\nimport index\nh, i = index.parse(open(sys.argv[2], encoding="utf-8").read())\nprint(len(i), h["version"])', HERE, path.join(HERE, 'out_test_index.csv')], { encoding: 'utf8' }).trim();
ok(shown === Object.keys(idx).length + ' v1', 'index.py reads it as ' + shown);

// a second run: he deletes the old copy and uploads a rebuilt deck; the tabs are rewritten, not appended to
oldUnit.trashed = true; ALL.filter(x => { for (let d = x.parent; d; d = d.parent) if (d === oldUnit) return true; return false; }).forEach(x => { x.trashed = true; });
const cur = ALL.find(x => x.name === sample && !x.trashed && pathOf(x).startsWith('Windy Hill/M7/'));
const rebuilt = mkFile(sample, cur.parent, 3e12);
const before = Object.keys(idx).length;
G.refresh();
const lines2 = SS.sheets[0].csv().split('\r\n').map(l => l.split(','));
const idx2 = Object.fromEntries(lines2.slice(1).map(r => [r[0], r]));
ok(lines2.length - 1 === before, 'second run: ' + (lines2.length - 1) + ' lines, was ' + before);
ok(idx2[pyKey(sample)][1] === rebuilt.id && idx2[pyKey(sample)][2] === '2', 'second run: the rebuilt deck is the one linked, and its older copy is counted');
ok((idx2[pyKey('M7 Unit 4 - Area')][2] || '') === '', 'second run: the unit has one copy again');
ok(SS.sheets.length === 3, 'second run made new tabs');
// the hourly trigger is made once however often it is asked for
G.everyHour(); G.everyHour();
ok(triggers.length === 1 && triggers[0].fn === 'refresh' && triggers[0].n === 1, 'triggers: ' + triggers.length);
G.stopHourly(); ok(triggers.length === 0, 'stopHourly');
// a sheet that was never set to plain text would have ruined a numeric-looking code: the fake shows the script guards it
ok(asTyped('123456789012') === 123456789012 && asTyped('-abc') === '#ERROR!', 'the fake sheet types like Sheets');
ok(Object.values(SS.sheets[0]._.cells).every(v => typeof v === 'string'), 'a cell of the Index tab is not text');

fs.unlinkSync(path.join(HERE, 'out_test_index.csv'));
console.log(bad.length ? bad.slice(0, 25).join('\n') : `drive index: ${checks} checks passed${live ? '' : ' on the kept list of package paths'} (${docs} documents and ${folders} folders resolved; ${Object.keys(idx).length} lines, ${csv.length} bytes of CSV)`);
process.exit(bad.length ? 1 : 0);
