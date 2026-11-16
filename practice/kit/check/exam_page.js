/* Practice-test kit: the test page, checked (check/exam_page.js, 15 Nov 2026; practice/exam/DESIGN.md). Run by exam/build_exam.py.
     NODE_PATH=$(npm root -g) node check/exam_page.js <unit folder> [--sheets 12] [--no-whole] [--shots DIR] [--form URL|none]
   Needs the unit's test page (exam/build_exam.py) and its teacher copy built (<unit>/teacher/preview.html, with exam_pool.js).
   Everything runs against the stand-in for the site (check/exam_site.js) in Chromium:
   1. The pool, drawn by a page that plays the cockpit: the teacher copy in a hidden frame at #exam-pool, its ready message,
      the draw in batches of 5, each batch sent to the stand-in, the test opened.
   2. The sheet is the same sheet: for --sheets drawn tests (12), the test page's question cards are, as HTML, the teacher
      copy's own render of that seed as "Like the real test" (exam_pool.js keeps it). Normalized, because they must differ:
      the pager's class pg-on on the card on the screen (the teacher copy draws off the pager). And the stub was never asked
      for a view call it did not have.
   3. Nothing to steal: the built page holds no line of the unit's scripts; exam_unit.js makes a unit with no judge,
      solution, walk, key, keyText, rungs or choices, and its judge refuses; every pub has only the whitelisted fields
      (exam_pool.js's, read from the teacher copy) and no key, graph or answer field; no response of the stand-in before
      seal holds a priv item, a keyText or a verdict; read answers only {ok, pretty}.
   4. A whole test (--no-whole skips it): not open first; Start; every question answered through the page as a student does —
      the key, a wrong answer, an equivalent form, an unreadable one fixed after "Can't read this yet", a blank, in turn —
      two flagged, Back, Next and the map; a reload mid-test (the same questions, answers and flags); the network lost on a
      save and on Finish (the message, Try again, nothing lost); Finish; the score is exam/server.js's and the practice page's
      judge's for the same set and answers; the code; Turn in (the form's address with the code, or "Copied"); the page
      reopened on its result; New test draws another; a second finish refused; a second device with no token refused;
      closed again, the start screen says so.
   5. At 390 × 844 in dark: the start screen, a question and the results with no sideways scroll and 44 px targets (buttons,
      links, choices, a graph's controls; a text box is the kit's own height, as on the practice page).
   6. The words: exam.js says only DESIGN.md's list, New test and Copied.
   With --shots DIR: the start, a question, a number-line question, Grading and the results at 1366 × 657 light and dark, and at 390. */
'use strict';
const path = require('path'), fs = require('fs');
const KIT = path.join(__dirname, '..'), dir = path.resolve(process.argv[2] || '.');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const SHEETS = +arg('--sheets', 12), WHOLE = process.argv.indexOf('--no-whole') < 0, SHOTS = arg('--shots', ''), FORM = arg('--form', 'https://forms.example/viewform?entry.1=CODE');
const U = require(path.join(dir, 'unit.js')), cfg = JSON.parse(fs.readFileSync(path.join(dir, 'unit.json'), 'utf8'));
const P = require(path.join(KIT, 'pack.js')), SV = require(path.join(KIT, 'exam', 'server.js')), NLK = require(path.join(KIT, 'nline.js'));
const CGF = require('./cgraph.js'), CG = CGF.CG, { Judge } = require(path.join(KIT, 'judge.js'));
const J = Judge({ U, V: U.view, K: require(path.join(KIT, 'core.js')), NL: NLK, CG });
const m = /^([a-z]+\d+)u(\d+)$/.exec(U.id), COURSE = m[1], UNIT = +m[2];
const TESTFILE = fs.readdirSync(dir).find(f => / Test\.html$/.test(f) && !/Practice Test\.html$/.test(f));
const TEACHER = path.join(dir, 'teacher', 'preview.html');
if (!TESTFILE) { console.error('exam_page: build the test first (python3 kit/exam/build_exam.py .)'); process.exit(1); }
if (!fs.existsSync(TEACHER) || fs.readFileSync(TEACHER, 'utf8').indexOf('Kit.ExamPool') < 0) { console.error('exam_page: build the teacher copy on this kit first (teacher/preview.html with exam_pool.js)'); process.exit(1); }
const fails = []; const fail = msg => { if (fails.length < 60) console.log('  FAIL ' + msg); fails.push(msg); };
const ok = msg => console.log('  ok ' + msg);
const TPATH = '/' + COURSE + '/test/unit-' + UNIT + '/', CPATH = '/' + COURSE + '/practice/unit-' + UNIT + '/teacher/';
const NDRAW = SHEETS + (WHOLE ? 4 : 0);
const COCKPIT = '<!doctype html><meta charset="utf-8"><title>cockpit</title><iframe id="f" src="' + CPATH + '#exam-pool" style="display:none"></iframe><script>' +
  'window.batches=[];window.ready=null;window.err=null;window.done=false;' +
  'addEventListener("message",function(e){if(e.origin!==location.origin||e.source!==document.getElementById("f").contentWindow||!e.data||e.data.kit!=="exam-pool")return;' +
  'if(e.data.ready){window.ready=e.data;e.source.postMessage({kit:"exam-pool",draw:' + NDRAW + '},location.origin);}' +
  'else if(e.data.forms){batches.push({n:e.data.forms.length,done:e.data.done,of:e.data.of});' +
  'fetch("/teacher/api/test/pool/' + COURSE + '/' + UNIT + '",{method:"PUT",headers:{"X-Teacher":"pw","Content-Type":"application/json"},body:JSON.stringify({forms:e.data.forms})}).then(function(){if(e.data.done>=e.data.of)window.done=true;});}' +
  'else if(e.data.error)window.err=e.data.error;});</script>';
const site = require('./exam_site.js').create({ units: { [COURSE + '/' + UNIT]: U }, password: 'pw',
  files: { [TPATH]: path.join(dir, TESTFILE), [CPATH]: TEACHER, '/cockpit.html': { body: COCKPIT } } });
const VARS = ['key', 'wrong', 'equiv', 'unread', 'blank'], REL = { '=': '=', '<': '>', '>': '<', '<=': '>=', '>=': '<=', '≤': '≥', '≥': '≤' };
function eqForm(k) {                    /* the key written another way (as check/exam_server.js) */
  k = String(k); let x = /^([^=<>≤≥]+?)\s*(<=|>=|=|<|>|≤|≥)\s*([^=<>≤≥]+)$/.exec(k);
  if (x) return x[3] + ' ' + REL[x[2]] + ' ' + x[1];
  if (/^-\d/.test(k)) return '−' + k.slice(1);
  if ((x = /^(\d+)\/(\d+)$/.exec(k))) return (2 * x[1]) + '/' + (2 * x[2]);
  if (/^\d*\.\d+$/.test(k)) return k + '0';
  if (/^\d+$/.test(k)) return '+' + k;
  return /\s/.test(k) ? k.replace(/\s+/g, '') : k.replace(/-/g, '−');
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function mockTeacher(ctx) {         /* the teacher copy's own requests (approvals, Tests A and B): the site before its store */
  await ctx.route(/\/api\/items\//, r => r.fulfill({ status: 200, contentType: 'application/json', body: '{"edits":[],"custom":[],"v":""}' }));
  await ctx.route(/\/teacher\/api\/(tests|items)\//, r => r.fulfill({ status: 200, contentType: 'application/json', body: /tests/.test(r.request().url()) ? '{"store":false,"spec":null,"updated":null}' : '{"store":false,"edits":[]}' }));
}
function shot(p, name) { if (!SHOTS) return Promise.resolve(); fs.mkdirSync(SHOTS, { recursive: true }); return p.screenshot({ path: path.join(SHOTS, U.id + '-' + name + '.png') }); }
const newest = () => Object.values(site.state.tests).sort((a, b) => b.started - a.started || (b.n - a.n))[0];
const stamp = (() => { let t = Date.now(); return () => (t += 1000); })();
site.state.now = stamp;                    /* the site's clock, a second a request: every test started later than the one before */

/* the whitelist, from the teacher copy, and the fields a pub may have */
const PUBK = ['v', 'course', 'unit', 'id', 'cv', 'kit', 'title', 'eyebrow', 'h1', 'notes', 'keypad', 'skel', 'calls', 'views'];
const BAD = ['ans', 'graph', 'correct', 'key', 'keyText', 'prm', 'vals', 'fam', 'judge', 'solution', 'walk', 'rungs', 'choices', 'ids', 'rels', 'optRel'];
function checkPub(f, WL) {
  const pub = f.pub, where = 'pub ' + f.seed.slice(0, 6);
  Object.keys(pub).forEach(k => { if (PUBK.indexOf(k) < 0) fail(where + ': a field not on the list: ' + k); });
  const part = (p, at) => Object.keys(p).forEach(k => { if (!(k in WL.part)) fail(where + ' ' + at + ': a part field not on the whitelist: ' + k); });
  pub.skel.sections.forEach((s, si) => { Object.keys(s).forEach(k => { if (k !== 'title' && k !== 'items') fail(where + ': a section field ' + k); });
    s.items.forEach((it, ii) => { Object.keys(it).forEach(k => { if (!(k in WL.item)) fail(where + ' ' + si + '.' + ii + ': an item field not on the whitelist: ' + k); });
      (it.parts || []).forEach((p, pi) => part(p, si + '.' + ii + '.' + pi)); if (it.part) part(it.part, si + '.' + ii);
      if (it.opts && it.opts.some(o => o !== '')) fail(where + ': a choice\'s words in the skeleton'); }); });
  (function deep(o, at) { if (!o || typeof o !== 'object') return; Object.keys(o).forEach(k => { if (BAD.indexOf(k) >= 0 && at.indexOf('.calls.') < 0) fail(where + ': a field named ' + k + ' at ' + at); deep(o[k], at + '.' + k); }); })(Object.assign({}, pub, { calls: undefined }), '');
  Object.keys(pub.calls).forEach(k => { const fn = k.split('|')[0]; if (fn === 'key' || pub.views.indexOf(fn) < 0) fail(where + ': a recorded call of ' + fn); });
}

(async () => {
  const { chromium } = require('playwright');
  const port = await site.listen(), base = 'http://127.0.0.1:' + port;
  const b = await chromium.launch(); require('./boxes.js').wireBrowser(b);
  const errs = [];
  const ctxOf = async (o) => { const c = await b.newContext(Object.assign({ viewport: { width: 1366, height: 657 } }, o || {})); await c.addInitScript(() => { window.KIT_EXAM_GAP = 1500; }); await mockTeacher(c); return c; };
  const watch = p => { p.on('pageerror', e => errs.push(e.message)); return p; };

  /* 1. the pool, through a page that plays the cockpit */
  const tc = await ctxOf(), cp = watch(await tc.newPage());
  const t0 = Date.now();
  await cp.goto(base + '/cockpit.html'); await cp.waitForFunction(() => window.done || window.err, null, { timeout: 240000 });
  const ck = await cp.evaluate(() => ({ ready: window.ready, batches: window.batches, err: window.err }));
  if (ck.err) fail('the pool: ' + ck.err);
  if (!ck.ready || ck.ready.course !== COURSE || ck.ready.unit !== UNIT || ck.ready.cv !== U.contentVersion || !/^[0-9a-f]{12}$/.test(ck.ready.kitv)) fail('the ready message: ' + JSON.stringify(ck.ready));
  if (!ck.batches.length || ck.batches.some(x => x.n > 5) || ck.batches[ck.batches.length - 1].done !== NDRAW) fail('the batches: ' + JSON.stringify(ck.batches));
  const pool = site.state.pools[COURSE + '/' + UNIT] || [];
  if (pool.length !== NDRAW) fail('the stand-in holds ' + pool.length + ' tests, not ' + NDRAW);
  if (new Set(pool.map(f => f.seed)).size !== pool.length || pool.some(f => !/^[0-9a-f]{32}$/.test(f.seed))) fail('the seeds are not 128-bit and distinct');
  ok('the pool: ' + pool.length + ' tests drawn in the hidden teacher copy in ' + ck.batches.length + ' batches (' + ((Date.now() - t0) / 1000).toFixed(1) + ' s)');
  /* the teacher copy's whitelist and its own sheets for the same seeds */
  const fr = cp.frames().find(f => f.url().indexOf(CPATH) >= 0);
  const WL = await fr.evaluate(() => Kit.ExamPool.whitelist);
  const seeds = pool.slice(0, SHEETS).map(f => f.seed);
  const sheets = await fr.evaluate(ss => { const out = {}; Kit.ExamPool.draw(0, ss.slice()); ss.forEach(s => { out[s] = Kit.ExamPool.sheet(s); }); return out; }, seeds);
  pool.forEach(f => checkPub(f, WL));
  /* the practice page's judge, in the teacher copy (ui.js's judge.js, as Finish uses it on "Like the real test") */
  const pageScore = (privs, ans) => fr.evaluate(([privs, ans]) => {
    const J = Kit.Judge({ U: window.Unit, V: Unit.view, K: Kit, NL: Kit.NL, CG: Kit.CG }), items = privs.map(t => Kit.unpack(t)), at = {}, v = [];
    items.forEach((it, i) => { at[it.id] = i; });
    items.forEach((it, i) => { const ctx = it.sib ? { prev: ans[it.sib], prevPart: it.sibPart, prevOk: v[at[it.sib]] === 'right', aShown: it.aShown, extra: false, mode: 'test' } : { aShown: it.aShown, extra: false, mode: 'test' };
      v.push(J.atFinish(it, ans[it.id], ctx, 0).v); });
    return v.filter(x => x === 'right').length;
  }, [privs, ans]);

  /* not open yet: the start screen says so */
  const c0 = await ctxOf(), p0 = watch(await c0.newPage());
  await p0.goto(base + TPATH); await p0.waitForSelector('#exClosed:not([hidden])');
  if (await p0.isVisible('#exStart')) fail('Start shows while the test is not open');
  await c0.close();
  await fetch(base + '/teacher/api/test/open', { method: 'POST', headers: { 'X-Teacher': 'pw', 'Content-Type': 'application/json' }, body: JSON.stringify({ course: COURSE, unit: UNIT }) });
  await fetch(base + '/teacher/api/test/config', { method: 'PUT', headers: { 'X-Teacher': 'pw', 'Content-Type': 'application/json' }, body: JSON.stringify({ show: 'parts', form: FORM === 'none' ? null : FORM }) });

  /* 2. the sheet is the same sheet */
  const norm = h => h.replace(/ class="([^"]*)"/g, (x, c) => { const k = c.split(/\s+/).filter(z => z && z !== 'pg-on').join(' '); return k ? ' class="' + k + '"' : ''; });
  let same = 0;
  for (const s of seeds) {
    const c = await ctxOf(), p = watch(await c.newPage());
    await p.goto(base + TPATH); await p.waitForSelector('#exStart:not([hidden])'); await p.click('#exStart'); await p.waitForSelector('#pgQ');
    const t = newest(); if (t.seed !== s) fail('the stand-in gave ' + t.seed + ', not ' + s);
    const got = await p.evaluate(() => ({ cards: Array.prototype.map.call(document.querySelectorAll('#paper .q[data-q]'), q => q.outerHTML), unknown: Kit.ExamUnit.unknown.slice() }));
    const want = sheets[t.seed] || [];
    if (got.unknown.length) fail('test ' + s.slice(0, 6) + ': the stub was asked ' + got.unknown.length + ' calls it does not have, first ' + got.unknown[0]);
    if (got.cards.length !== want.length) fail('test ' + s.slice(0, 6) + ': ' + got.cards.length + ' cards, the teacher copy ' + want.length);
    let bad = 0;
    got.cards.forEach((h, i) => { if (norm(h) !== norm(want[i] || '')) { bad++; if (bad === 1) { const a = norm(h), w = norm(want[i] || ''); let k = 0; while (k < a.length && a[k] === w[k]) k++; fail('test ' + s.slice(0, 6) + ' question ' + (i + 1) + ' differs at ' + k + ': page …' + a.slice(Math.max(0, k - 40), k + 60) + '… teacher copy …' + w.slice(Math.max(0, k - 40), k + 60) + '…'); } } });
    if (!bad) same++;
    await c.close();
  }
  ok('the same sheet: ' + same + ' of ' + seeds.length + ' tests, every question card the teacher copy\'s HTML (normalized: the pager\'s pg-on)');

  /* 3. nothing to steal */
  const page = fs.readFileSync(path.join(dir, TESTFILE), 'utf8'), kitText = ['core.js', 'nline.js', 'cgraph.js', 'judge.js', 'pager.js', 'scratch.js', 'ui.js', 'calc.js', 'tex.js', 'exam_unit.js', 'exam.js'].map(f => fs.readFileSync(path.join(KIT, f), 'utf8')).join('');
  let lines = 0; cfg.scripts.forEach(s => fs.readFileSync(path.join(dir, s), 'utf8').split('\n').forEach(l => { const t = l.trim(); if (t.length >= 40 && !/^(\/\*|\*|\/\/)/.test(t) && kitText.indexOf(t) < 0) { lines++; if (page.indexOf(t) >= 0) fail('the test page holds a line of ' + s + ': ' + t.slice(0, 60)); } }));
  let own = page; ['core.js', 'nline.js', 'cgraph.js', 'judge.js', 'pager.js', 'scratch.js', 'ui.js', 'calc.js', 'tex.js', 'exam_unit.js', 'exam.js', 'vendor/katex/katex.min.js'].forEach(f => { own = own.split(fs.readFileSync(path.join(KIT, f), 'utf8')).join(''); });
  if (/window\.Unit\s*=\s*\{|Unit\.judge|keyText\s*:|solution\s*:|walk\s*:/.test(own)) fail('the test page defines a unit or a judge of its own');
  const stub = await (async () => { const c = await ctxOf(), p = watch(await c.newPage()); await p.goto(base + TPATH);
    const r = await p.evaluate(f => { const u = Kit.ExamUnit.make(f.pub), J = Kit.ExamUnit.judge(Kit.Judge({ U: u, V: u.view, K: Kit, NL: Kit.NL, CG: Kit.CG })); let refused = 0; ['judge', 'atFinish'].forEach(k => { try { J[k]({ type: 'text', x: {} }, '1', {}, 0); } catch (e) { refused++; } });
      return { keys: Object.keys(u), view: Object.keys(u.view), refused }; }, pool[0]); await c.close(); return r; })();
  ['judge', 'solution', 'walk', 'key', 'keyText', 'rungs', 'choices', 'readNum', 'numOk'].forEach(k => { if (stub.keys.indexOf(k) >= 0) fail('the stub unit has ' + k); });
  if (stub.view.indexOf('key') >= 0) fail('the stub\'s view has key'); if (stub.refused !== 2) fail('the stub\'s judge judged');
  ok('nothing to steal: ' + lines + ' lines of the unit\'s scripts searched, none on the page; the stub has ' + stub.keys.join(', ') + '; its judge refuses; every pub on the whitelist');

  /* 4. a whole test */
  if (WHOLE) await whole();
  /* the stand-in's responses before seal: no priv item, keyText or verdict; read is {ok, pretty} */
  let reads = 0;
  site.log.forEach(L => {
    if (/^\/teacher\//.test(L.path) || /\/seal$/.test(L.path) || /\/result\//.test(L.path)) return;
    if (/"keyText"|"sibPart"|"priv"|"verdicts"|"v":"(right|wrong|blank|unread)"|"almost"/.test(L.body)) fail('a response of ' + L.method + ' ' + L.path + ' before seal: ' + L.body.slice(0, 120));
    if (/\/read$/.test(L.path) && L.status === 200) { reads++; const k = Object.keys(JSON.parse(L.body)).sort().join(','); if (k !== 'ok,pretty') fail('read answered ' + k); }
  });
  ok(site.log.length + ' responses of the stand-in searched; ' + reads + ' reads, each {ok, pretty}');

  /* 6. the words: exam.js's own */
  const src = fs.readFileSync(path.join(KIT, 'exam.js'), 'utf8'), wordsAt = src.indexOf('var WORDS = {'), words = src.slice(wordsAt, src.indexOf('};', wordsAt));
  const LIST = ['Start', 'Test', 'Grading…', 'Turn in', 'Copied', 'New test', 'Back', 'Try again', 'This test isn’t open.', 'Can’t reach the site. Your answers are saved on this device.', 'Can’t read this yet'];
  (words.match(/'[^']*'/g) || []).map(w => JSON.parse('"' + w.slice(1, -1) + '"')).forEach(w => { if (LIST.indexOf(w) < 0) fail('exam.js says “' + w + '”'); });

  if (errs.length) fail('page errors: ' + errs.slice(0, 3).join(' | '));
  await b.close(); await site.close();
  console.log('exam page: ' + (fails.length ? fails.length + ' FAILED' : 'every check passed') + ' (' + U.id + ')');
  process.exit(fails.length ? 1 : 0);

  async function answer(p, it, vr) {
    if (vr === 'blank') return;
    const x = it.x, id = it.id;
    if (it.type === 'text') {
      const B = J.boxesOf(x), k = U.keyText(x), keys = B ? (Array.isArray(k) ? k : [k]).map(String) : [String(k)];
      const put = async vals => { for (let i = 0; i < vals.length; i++) { const sel = '#a' + id + (i ? '_' + i : ''); await p.fill(sel, vals[i]); await p.dispatchEvent(sel, 'change'); } };
      if (vr === 'unread') {
        await put(keys.map(() => '((3'));
        await p.waitForFunction(i => (document.getElementById('rd' + i) || {}).textContent === 'Can’t read this yet', id, { timeout: 8000 }).catch(() => fail(id + ': no “Can’t read this yet” for “((3”'));
        await put(keys);
        await p.waitForFunction(i => !(document.getElementById('rd' + i) || {}).textContent, id, { timeout: 8000 }).catch(() => fail(id + ': “Can’t read this yet” stayed after the key'));
        return;
      }
      return put(vr === 'key' ? keys : vr === 'wrong' ? keys.map(() => '987654') : keys.map(eqForm));
    }
    if (it.type === 'nline') {
      const g = NLK.graphOf(x), Sp = NLK.spec(x), i = NLK.idx(Sp, g.c), w = vr === 'wrong' ? { c: NLK.kstr(NLK.val(Sp, i < Sp.n ? i + 1 : i - 1)), closed: g.closed, dir: g.dir } : g, j = NLK.idx(Sp, w.c);
      await p.focus('#nlp' + id); await p.keyboard.press('Home'); for (let k = 0; k < j; k++) await p.keyboard.press('ArrowRight');
      if (w.closed != null) await p.click('[data-nl="' + id + '"][data-nld="' + (w.closed ? 'closed' : 'open') + '"]');
      if (w.dir) await p.click('[data-nl="' + id + '"][data-nla="' + w.dir + '"]');
      return;
    }
    if (it.type === 'cgraph') { const k = CG.graphOf(x); return CGF.fill(p, id, x, vr === 'wrong' ? CGF.wrong(x) : vr === 'equiv' ? k.slice().reverse() : k); }
    const n = (x.opts || []).length || 4, C = it.type === 'multi' ? x.correct : [x.correct], badk = []; for (let k = 0; k < n; k++) if (C.indexOf(k) < 0) badk.push(k);
    for (const k of (vr === 'wrong' ? [badk[0]] : C)) await p.evaluate(([q, k]) => document.querySelector('#paper input[name="q' + q + '"][value="' + k + '"]').click(), [id, k]);
  }
  async function cardOf(p, id) { return p.evaluate(i => { const h = document.querySelector('[data-host="' + i + '"]'), c = h && h.closest('.q[data-q]'); return Array.prototype.indexOf.call(document.querySelectorAll('#paper .q[data-q]:not(.xq)'), c); }, id); }
  async function at(p) { return p.evaluate(() => +document.getElementById('pgQt').textContent.replace(/^Question (\d+).*/, '$1') - 1); }
  async function goQ(p, i, how) {
    let now = await at(p);
    if (how === 'map') { if (!(await p.isVisible('[data-pgi="' + i + '"]'))) await p.click('#pgMt'); await p.click('[data-pgi="' + i + '"]'); }
    else while (now !== i) { await p.click(now < i ? '#pgNext' : '#pgPrev'); now = await at(p); }
  }
  async function whole() {
    const shotsOn = !!SHOTS;
    const c = await ctxOf(); await c.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: base });
    await c.route(/^https:\/\/forms\.example\//, r => r.fulfill({ status: 200, contentType: 'text/html', body: '<title>form</title>' }));
    const p = watch(await c.newPage());
    await p.goto(base + TPATH); await p.waitForSelector('#exStart:not([hidden])'); await shot(p, 'start-1366-light');
    await p.click('#exStart'); await p.waitForSelector('#pgQ');
    const t = newest(), items = t.priv.map(x => P.unpack(x)), N = await p.evaluate(() => document.querySelectorAll('#paper .q[data-q]').length);
    const vr = items.map((it, j) => VARS[j % 5]);
    await shot(p, 'question-1366-light');
    /* every question, in order with Next (the map for one, Back once) */
    const flagged = []; let backed = false;
    for (let j = 0; j < items.length; j++) {
      const i = await cardOf(p, items[j].id);
      await goQ(p, i, j === 7 ? 'map' : 'next');
      if (j >= 3 && !backed && await at(p) > 0) { backed = true; await p.click('#pgPrev'); await p.click('#pgNext'); }
      await answer(p, items[j], vr[j]);
      if ((j === 2 || j === 9) && flagged.indexOf(i) < 0) { await p.click('#pgFlag'); flagged.push(i); }
      if (items[j].type === 'nline' && shotsOn && !fs.existsSync(path.join(SHOTS, U.id + '-nline-1366-light.png'))) await shot(p, 'nline-1366-light');
      if (j === Math.floor(items.length / 2)) {           /* a reload, mid-test */
        await sleep(300);
        /* the paper as HTML, its previews and readouts emptied (they come again from the site) and each tag's attributes in one order
           (a reload sets them afresh, an answer set them one by one) and an emptied style dropped */
        const before = await p.evaluate(() => ({ html: (() => { const c = document.getElementById('paper').cloneNode(true); c.querySelectorAll('.pv, .rd').forEach(e => { e.innerHTML = ''; }); c.querySelectorAll('*').forEach(e => { const a = Array.prototype.map.call(e.attributes, x => [x.name, x.value]).sort((x, y) => x[0] < y[0] ? -1 : 1); a.forEach(x => e.removeAttribute(x[0])); a.forEach(x => { if (!(x[0] === 'style' && !x[1])) e.setAttribute(x[0], x[1]); }); }); return c.innerHTML.replace(/ pg-on/g, ''); })(), vals: Array.prototype.map.call(document.querySelectorAll('#paper input[type=text]'), e => e.value), map: Array.prototype.map.call(document.querySelectorAll('#pgGrid button'), b => b.className.split(/\s+/).filter(Boolean).sort().join(' ')) }));
        await p.reload(); await p.waitForSelector('#pgQ');
        const after = await p.evaluate(() => ({ html: (() => { const c = document.getElementById('paper').cloneNode(true); c.querySelectorAll('.pv, .rd').forEach(e => { e.innerHTML = ''; }); c.querySelectorAll('*').forEach(e => { const a = Array.prototype.map.call(e.attributes, x => [x.name, x.value]).sort((x, y) => x[0] < y[0] ? -1 : 1); a.forEach(x => e.removeAttribute(x[0])); a.forEach(x => { if (!(x[0] === 'style' && !x[1])) e.setAttribute(x[0], x[1]); }); }); return c.innerHTML.replace(/ pg-on/g, ''); })(), vals: Array.prototype.map.call(document.querySelectorAll('#paper input[type=text]'), e => e.value), map: Array.prototype.map.call(document.querySelectorAll('#pgGrid button'), b => b.className.split(/\s+/).filter(Boolean).sort().join(' ')) }));
        if (newest().id !== t.id) fail('the reload started another test');
        if (JSON.stringify(after.vals) !== JSON.stringify(before.vals)) fail('the answers after a reload are not the same');
        if (JSON.stringify(after.map) !== JSON.stringify(before.map)) fail('the map (answered, flagged) after a reload: ' + JSON.stringify(after.map) + ' was ' + JSON.stringify(before.map));
        if (after.html !== before.html) { let k = 0; while (after.html[k] === before.html[k]) k++; fail('the questions after a reload are not the same: before …' + before.html.slice(Math.max(0, k - 30), k + 90) + '… after …' + after.html.slice(Math.max(0, k - 30), k + 90) + '…'); }
        ok('a reload mid-test: the same test, ' + after.vals.filter(Boolean).length + ' boxes and ' + flagged.length + ' flags back');
      }
    }
    /* the network lost on a save */
    await sleep(1600);
    await p.route('**/api/test/*/save', r => r.abort());
    let fq = 0; while (flagged.indexOf(fq) >= 0) fq++;
    await goQ(p, fq, 'map'); await p.click('#pgFlag'); flagged.push(fq);
    await p.waitForSelector('#exNet:not([hidden])', { timeout: 8000 }).catch(() => fail('a save that failed said nothing'));
    const msg = await p.textContent('#exNet'); if (msg !== 'Can’t reach the site. Your answers are saved on this device.Try again') fail('the message: ' + msg);
    await p.unroute('**/api/test/*/save'); await p.click('#exRetry'); await p.waitForSelector('#exNet', { state: 'hidden' });
    await p.waitForFunction(() => true); await sleep(700);
    const dev = await p.evaluate(k => JSON.parse(localStorage.getItem(k)), 'exam.' + U.id + '.set.' + t.id + '.all');
    if (JSON.stringify(newest().answers) !== JSON.stringify(dev.ans)) fail('after Try again the site does not have the device\'s answers');
    if (Object.keys(newest().flags).length !== flagged.length) fail('the site has ' + Object.keys(newest().flags).length + ' flags, the page ' + flagged.length);
    ok('the network lost on a save: the message, Try again, the site has every answer and flag');
    /* Finish, with the network lost on it */
    const token = (await p.evaluate(k => JSON.parse(localStorage.getItem(k)), 'exam.' + COURSE + '.u' + UNIT)).token;
    await p.route('**/api/test/*/finish', r => r.abort());
    await p.click('#bFinish'); await p.click('#cy');
    await p.waitForSelector('#exNet:not([hidden])', { timeout: 8000 }).catch(() => fail('a Finish that failed said nothing'));
    if (newest().status !== 'open') fail('the site finished a test whose finish never came');
    let held = 0; await p.unroute('**/api/test/*/finish');
    await p.route('**/api/test/*/grade', async r => { if (held++ === 0) await sleep(1200); return r.continue(); });
    await p.click('#exRetry'); await p.waitForSelector('.exgrading'); await shot(p, 'grading-1366-light');
    if (await p.textContent('.exgrading') !== 'Grading…') fail('Grading… is not said');
    await p.waitForSelector('#exCode', { timeout: 30000 });
    const T = Object.values(site.state.tests).find(x => x.id === t.id), sm = SV.summary(items, T.verdicts);
    const shown = await p.evaluate(() => ({ score: document.querySelector('.exscore').textContent, code: document.getElementById('exCode').textContent, time: document.querySelector('.extime').textContent, rows: Array.prototype.map.call(document.querySelectorAll('.pgrow .pgrv'), e => e.textContent) }));
    if (shown.score !== sm.points + ' / ' + sm.of + ' points') fail('the results say ' + shown.score + '; exam/server.js ' + sm.points + ' / ' + sm.of);
    const ps = await pageScore(items.map(x => P.pack(x)), T.answers);
    if (ps !== sm.points) fail('the practice page\'s judge scores ' + ps + ', the site ' + sm.points);
    if (!/^[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/.test(shown.code) || shown.code.replace(/-/g, '') !== T.sealed.code) fail('the code: ' + shown.code);
    if (!/^\d+:\d\d$/.test(shown.time)) fail('the time: ' + shown.time);
    if (shown.rows.length !== N || shown.rows.some(r => !/^(Right|Not right|Blank|\d of \d right)$/.test(r))) fail('the list after Finish: ' + shown.rows.join(', '));
    ok('Finish: the network lost and Try again; Grading…; ' + shown.score + ' (exam/server.js and the practice page\'s judge agree); ' + shown.code + ' in ' + shown.time + '; ' + shown.rows.length + ' questions listed');
    await shot(p, 'results-1366-light');
    if (SHOTS) { await p.emulateMedia({ colorScheme: 'dark' }); await shot(p, 'results-1366-dark'); await p.emulateMedia({ colorScheme: 'light' }); }
    /* Turn in */
    if (FORM !== 'none') {
      const [pop] = await Promise.all([c.waitForEvent('page'), p.click('#exTurn')]);
      await pop.waitForLoadState().catch(() => {});
      if (pop.url() !== FORM.replace('CODE', encodeURIComponent(shown.code))) fail('Turn in opened ' + pop.url());
      await pop.close();
    } else { await p.click('#exTurn'); await p.waitForSelector('#exCopied:has-text("Copied")'); }
    const clip = await p.evaluate(() => navigator.clipboard.readText()); if (clip !== shown.code) fail('Turn in copied ' + clip);
    /* a second finish; a second device */
    const r2 = await fetch(base + '/api/test/' + t.id + '/finish', { method: 'POST', headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }, body: '{"answers":{}}' });
    if (r2.status !== 409) fail('a second finish was answered ' + r2.status);
    const c2 = await ctxOf(), p2 = watch(await c2.newPage()); await p2.goto(base + TPATH);
    const s2 = await p2.evaluate(async id => [(await fetch('/api/test/' + id)).status, (await fetch('/api/test/' + id, { headers: { Authorization: 'Bearer ' + '0'.repeat(32) } })).status, (await fetch('/api/test/' + id + '/read', { method: 'POST', body: '{"part":"1","text":"1"}' })).status], t.id);
    if (s2.some(x => x !== 401)) fail('a second device was answered ' + s2.join(', '));
    await c2.close();
    /* reopened: the result is there */
    await p.reload(); await p.waitForSelector('#exCode');
    if (await p.textContent('#exCode') !== shown.code || await p.textContent('.exscore') !== shown.score) fail('the page reopened without its result');
    ok('Turn in (' + (FORM !== 'none' ? 'the form with the code' : 'Copied') + ', the code copied); a second finish refused; no token, no test; reopened on the result');
    /* New test */
    await p.click('#exNew'); await p.click('#exNewGo'); await p.waitForSelector('#pgQ', { timeout: 20000 });
    if (newest().id === t.id) fail('New test did not draw another');
    ok('New test: another test (' + newest().seed.slice(0, 6) + ')');
    /* 5. at 390 × 844, dark */
    await phone(); await c.close();
    /* closed again: the start screen says so */
    await fetch(base + '/teacher/api/test/close', { method: 'POST', headers: { 'X-Teacher': 'pw', 'Content-Type': 'application/json' }, body: JSON.stringify({ course: COURSE, unit: UNIT }) });
    const c3 = await ctxOf(), p3 = watch(await c3.newPage()); await p3.goto(base + TPATH); await p3.waitForSelector('#exClosed:not([hidden])');
    if (await p3.textContent('#exClosed') !== 'This test isn’t open.') fail('closed: ' + await p3.textContent('#exClosed'));
    await c3.close(); ok('closed: “This test isn’t open.”');
  }
  async function phone() {
    const c = await ctxOf({ viewport: { width: 390, height: 844 }, colorScheme: 'dark', hasTouch: true, isMobile: true }), p = watch(await c.newPage());
    const look = async what => {
      const r = await p.evaluate(() => {
        const sw = document.documentElement.scrollWidth, small = [];
        document.querySelectorAll('button, a[href], .ch, [role=radio], [role=slider]').forEach(e => { const b = e.getBoundingClientRect(), st = getComputedStyle(e);
          if (!b.width || !b.height || st.visibility === 'hidden' || e.closest('[hidden]') || e.closest('.menu') || e.disabled) return;
          if (b.height < 43.5 || b.width < 43.5) small.push((e.id || e.className || e.tagName) + ' ' + Math.round(b.width) + '×' + Math.round(b.height)); });
        return { sw, iw: window.innerWidth, small, dark: getComputedStyle(document.body).backgroundColor };
      });
      if (r.sw > r.iw) fail('390, ' + what + ': sideways scroll (' + r.sw + ' > ' + r.iw + ')');
      if (r.small.length) fail('390, ' + what + ': targets under 44 px: ' + r.small.slice(0, 4).join('; '));
      await shot(p, what + '-390-dark');
    };
    await p.goto(base + TPATH); await p.waitForSelector('#exStart:not([hidden])'); await look('start');
    await p.click('#exStart'); await p.waitForSelector('#pgQ'); await look('question');
    const t = newest(), items = t.priv.map(x => P.unpack(x));
    await answer(p, items[0], 'key');
    await p.click('#bFinish'); await p.click('#cy'); await p.waitForSelector('#exCode', { timeout: 30000 }); await look('results');
    ok('390 × 844, dark: the start, a question and the results — no sideways scroll, 44 px targets');
    if (SHOTS) { const c2 = await ctxOf({ colorScheme: 'dark' }), p2 = watch(await c2.newPage()); await p2.goto(base + TPATH); await p2.waitForSelector('#exStart:not([hidden])'); await p2.screenshot({ path: path.join(SHOTS, U.id + '-start-1366-dark.png') });
      await p2.click('#exStart'); await p2.waitForSelector('#pgQ'); await p2.screenshot({ path: path.join(SHOTS, U.id + '-question-1366-dark.png') });
      const t2 = newest(), it2 = t2.priv.map(x => P.unpack(x)), nl = it2.find(x => x.type === 'nline' || x.type === 'cgraph');
      if (nl) { await goQ(p2, await cardOf(p2, nl.id), 'map'); await answer(p2, nl, 'key'); await p2.screenshot({ path: path.join(SHOTS, U.id + '-' + nl.type + '-1366-dark.png') }); }
      await c2.close(); }
    await c.close();
  }
})().catch(e => { console.error(e); process.exit(1); });
