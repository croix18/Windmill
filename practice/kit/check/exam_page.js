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
const NDRAW = SHEETS + (WHOLE ? 4 + 14 + 2 + (SHOTS ? 4 : 0) : 0);   /* the whole test's four, the proctor's and the log's (7), the screenshots' */
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
let CLOCK = Date.now(); const stamp = () => (CLOCK += 1000), skip = ms => { CLOCK += ms; };
site.state.now = stamp;                    /* the site's clock, a second a request: every test started later than the one before; skip() moves it on (unlock's minute) */

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
  const ctxOf = async (o) => { const c = await b.newContext(Object.assign({ viewport: { width: 1366, height: 657 } }, o || {})); await c.addInitScript(() => { window.KIT_EXAM_GAP = 1500; window.KIT_EXAM_UNLOCK_WAIT = 1500; }); await mockTeacher(c);
    await c.route(/^https:\/\/(desmosforassessment\.cambiumtds\.com|aldenbradford\.com)\//, r => r.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>calc</title><input id="ci" style="width:300px;height:80px;font-size:30px">' }));   /* the calculators' stand-ins */
    return c; };
  const watch = p => { p.on('pageerror', e => errs.push(e.message)); return p; };

  /* ---- 7. the proctor and the log (proctor.js, trace.js; 16 Nov 2026) ---- */
  /* the words on the test page (DESIGN.md's list), and New test and Copied (stage 2's, noted there): every text the page shows
     outside the test's own content (the question cards and the section titles, the unit's head, the map's numbers, the list's
     section titles and IDs) is made of these */
  const SAY = [/^Start$/, /^Test$/, /^Calculator$/, /^Scratch paper$/, /^Finish$/, /^Flag for review$/, /^Back$/, /^Next$/, /^\d+ of \d+ answered$/,
    /^Left the test: \d+$/, /^Back to the test$/, /^Locked\. Ask your teacher\.$/, /^Unlock$/, /^Test ended: left the test \d+ times?\.$/, /^Grading…$/,
    /^\d+ \/ \d+ points$/, /^\d+:\d\d$/, /^Left the test \d+ times? · (\d+ min( \d+ s)?|\d+ s)$/, /^[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/,
    /^Turn in$/, /^Right$/, /^Not right$/, /^Blank$/, /^This test isn’t open\.$/, /^Can’t reach the site\. Your answers are saved on this device\.$/, /^Try again$/,
    /^New test$/, /^Copied$/, /^Start code$/, /^\d+$/];
  async function shown(p) {                /* every text the page shows, as runs of words, with where each comes from */
    return p.evaluate(() => {
      const own = '#paper, .head, #pgGrid, .pgrt, .pgrid, .pgrn, .kcalc, .kscr', out = [], seen = new Set();
      const gone = el => { for (let e = el; e && e !== document.documentElement; e = e.parentElement) { const st = getComputedStyle(e);
        if (st.display === 'none' || st.visibility === 'hidden' || +st.opacity === 0 || st.clipPath === 'inset(50%)' || (e.clientWidth <= 1 && e.clientHeight <= 1 && st.overflow === 'hidden')) return true; } return false; };
      const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      for (let n = w.nextNode(); n; n = w.nextNode()) {
        const t = n.nodeValue.replace(/\s+/g, ' ').trim(), el = n.parentElement; if (!t || !el || el.closest('script,style,template')) continue;
        const r = document.createRange(); r.selectNodeContents(n); const b = r.getBoundingClientRect(); if (b.width < 1 || b.height < 1 || gone(el)) continue;
        const cover = document.getElementById('exCover'); if (cover && !cover.hidden && !cover.contains(el)) continue;   /* under the cover, nothing is read */
        if (el.closest(own)) continue;
        let box = el; while (box.parentElement && getComputedStyle(box).display === 'inline') box = box.parentElement;   /* a run: the text of one box ("<b>3 of 18</b> answered") */
        const last = out[out.length - 1]; if (last && last.box === box) last.t += ' ' + t; else out.push({ box, t });
      }
      return out.map(x => x.t.replace(/\s+/g, ' ').trim());
    });
  }
  async function sayOnly(p, state) {
    const runs = await shown(p), bad = runs.filter(t => !SAY.some(rx => rx.test(t)));
    if (bad.length) fail('the words, ' + state + ': ' + bad.slice(0, 6).map(t => '“' + t + '”').join(', '));
    return runs;
  }
  const put = (o) => fetch(base + '/teacher/api/test/config', { method: 'PUT', headers: { 'X-Teacher': 'pw', 'Content-Type': 'application/json' }, body: JSON.stringify(o) });
  const hide = p => p.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' }); document.dispatchEvent(new Event('visibilitychange')); });
  const unhide = p => p.evaluate(() => { delete document.hidden; delete document.visibilityState; document.dispatchEvent(new Event('visibilitychange')); });
  const blur = p => p.evaluate(() => { document.hasFocus = () => false; window.dispatchEvent(new Event('blur')); });
  const unblur = p => p.evaluate(() => { delete document.hasFocus; window.dispatchEvent(new Event('focus')); });
  const covered = p => p.evaluate(() => { const c = document.getElementById('exCover'); return !!c && !c.hidden; });
  const count = p => p.evaluate(() => Kit.Proctor.count());
  const take = p => p.evaluate(() => Kit.Trace.take());
  const fsOn = p => p.evaluate(() => !!document.fullscreenElement);
  async function begin(c) {
    const p = watch(await c.newPage());
    await p.addInitScript(() => { window.__fs = 0; const f = Element.prototype.requestFullscreen; Element.prototype.requestFullscreen = function () { window.__fs++; return f.apply(this, arguments); }; });
    await p.goto(base + TPATH); await p.waitForSelector('#exStart:not([hidden])');
    await p.click('#exStart'); await p.waitForSelector('#pgQ'); await p.waitForFunction(() => window.Kit && Kit.Proctor && Kit.Proctor.count, null, { timeout: 15000 });
    await sleep(400);
    return { p, t: newest() };
  }
  async function leave(p, how, ms) {      /* one leaving of a kind; the cover over the sheet while away (read through elementFromPoint) */
    if (how === 'tab') await hide(p); else if (how === 'window') await blur(p); else await p.evaluate(() => document.exitFullscreen());
    await sleep(ms || 1300);
    const under = await p.evaluate(() => { const c = document.getElementById('exCover'), pts = []; for (let i = 1; i < 6; i++) for (let j = 1; j < 6; j++) pts.push([innerWidth * i / 6, innerHeight * j / 6]);
      return { cover: !!c && !c.hidden, all: pts.every(([x, y]) => { const e = document.elementFromPoint(x, y); return e && c.contains(e); }), inert: !!document.querySelector('main.sheet') && !!document.querySelector('main.sheet').closest('[inert]'),
        focus: document.activeElement && document.activeElement.id }; });
    if (how === 'tab') await unhide(p); else if (how === 'window') await unblur(p);
    await sleep(250);
    return under;
  }
  async function back(p) { await p.click('#exBackIn'); await sleep(350); }
  async function toQ(p, i) { await goQ(p, i, 'map'); await sleep(300); }
  const textItem = (items, pred) => items.find(it => it.type === 'text' && !J.boxesOf(it.x) && (!pred || pred(it)));

  async function proctor() {
    await put({ rule: { leave: 'count', after: 3 }, unlock: '4821' });
    /* A. count only, the scripted session: 1366 × 657, light, the clock in the page under the check's hand */
    const c = await ctxOf({ timezoneId: 'America/New_York' }); await c.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: base });
    const asked = []; c.on('request', r => asked.push(r.url()));
    const p0 = watch(await c.newPage()); await p0.goto(base + TPATH); await p0.waitForSelector('#exStart:not([hidden])'); await sayOnly(p0, 'the start');
    if (await p0.isVisible('#exPin')) fail('a start-code box with the start code off'); else ok('the start code off: no box'); await p0.close();
    const { p, t } = await begin(c);
    await p.clock.install().catch(e => fail('the clock: ' + e.message));
    const items = t.priv.map(x => P.unpack(x)), N = await p.evaluate(() => document.querySelectorAll('#paper .q[data-q]').length);
    if (!(await p.evaluate(() => window.__fs)) || !(await fsOn(p))) fail('full screen was not asked for at Start (' + (await p.evaluate(() => window.__fs)) + ' asks, full screen ' + (await fsOn(p)) + ')');
    else ok('full screen asked for inside the Start press, and on');
    await sayOnly(p, 'a question');
    const route = ['1'], go = q => { if (route[route.length - 1] !== q) route.push(q); };   /* the questions on the screen, in order, as the log must have them */
    /* the three kinds, once each, on questions 1, 2 and 3 */
    const A1 = await leave(p, 'tab', 1300);
    if (!A1.cover || !A1.all || !A1.inert || A1.focus !== 'exBackIn') fail('away (another tab): the cover ' + JSON.stringify(A1));
    if (!(await covered(p))) fail('back from another tab, the cover went before Back to the test');
    await p.keyboard.press('Escape'); await p.keyboard.press('Tab');
    if (!(await covered(p)) || await p.evaluate(() => !!(document.activeElement && document.activeElement.closest('#paper, .watch, .pgmap')))) fail('on the cover Escape or Tab reached the sheet');
    if (await p.evaluate(() => { const c = document.getElementById('exCover'); return c.innerText.trim(); }) !== 'Back to the test') fail('the cover says ' + await p.evaluate(() => document.getElementById('exCover').innerText));
    if (SHOTS) await p.screenshot({ path: path.join(SHOTS, U.id + '-away-1366-light.png') });
    await back(p); if (await covered(p)) fail('Back to the test left the cover up');
    await toQ(p, 1); go('2');
    const A2 = await leave(p, 'window', 1500); if (!A2.cover || !A2.all) fail('away (the window): no cover ' + JSON.stringify(A2)); await back(p);
    await toQ(p, 2); go('3');
    const A3 = await leave(p, 'fullscreen', 1200); if (!A3.cover || !A3.all) fail('away (out of full screen): no cover ' + JSON.stringify(A3)); await back(p);
    if (!(await fsOn(p))) fail('Back to the test did not go back into full screen');
    let L = await take(p);
    const kinds = L.away.map(a => a[2] + '@' + a[3]).join(' ');
    if (kinds !== 'tab@1 window@2 fullscreen@3') fail('three leavings logged as ' + kinds);
    L.away.forEach(a => { if (!(a[1] >= 1 && a[1] <= 4)) fail('a leaving of ' + a[1] + ' s: ' + JSON.stringify(a)); });
    if (await count(p) !== 3) fail('three leavings counted ' + await count(p));
    ok('three leavings, one of each kind (' + L.away.map(a => a[2] + ' ' + a[1] + ' s on ' + a[3]).join(', ') + '), counted once each; the cover over the sheet (25 points, the sheet inert, focus on Back to the test; Escape and Tab stay on it); back into full screen');
    /* a blur under a second: nothing; a click into the calculator's frame: nothing */
    await blur(p); await sleep(450); await unblur(p); await sleep(1300);
    if (await count(p) !== 3 || await covered(p) || (await take(p)).away.length !== 3) fail('a blur under a second was counted or covered');
    await p.click('#bCalc'); const fr = p.frameLocator('#kcalc iframe'); await fr.locator('#ci').click(); await fr.locator('#ci').type('12+3');
    await sleep(1500);
    if (await count(p) !== 3 || await covered(p) || !(await p.evaluate(() => document.hasFocus()))) fail('a click into the calculator\'s frame was taken for away');
    await sleep(400); await p.click('#kcalcX');
    ok('a blur of 0.45 s and a click into the calculator\'s frame (1.5 s typing there): nothing logged, nothing counted');
    /* the coral count, and the only coral */
    const coral = await p.evaluate(() => { const C = 'rgb(255, 127, 106)', L = document.getElementById('exLeft'), other = [];
      document.querySelectorAll('body *').forEach(e => { if (e === L || !e.getClientRects().length) return; const st = getComputedStyle(e); if ([st.backgroundColor, st.color, st.borderTopColor].indexOf(C) >= 0) other.push(e.id || e.className || e.tagName); });
      return { text: L && L.textContent, vis: !!(L && L.offsetParent), bg: L && getComputedStyle(L).backgroundColor, other }; });
    if (coral.text !== 'Left the test: 3' || !coral.vis || coral.bg !== 'rgb(255, 127, 106)') fail('the bar\'s count: ' + JSON.stringify(coral));
    if (coral.other.length) fail('coral elsewhere: ' + coral.other.slice(0, 4).join(', '));
    ok('the bar: “Left the test: 3” in coral, and nothing else coral');
    /* blocked: the sheet can't be selected, copied, cut, dragged, right-clicked, printed or saved */
    const stem = '#paper .q.pg-on .stem'; const sb = await p.locator(stem).first().boundingBox();
    await p.evaluate(() => navigator.clipboard.writeText('before'));
    await p.mouse.move(sb.x + 4, sb.y + sb.height / 2); await p.mouse.down(); await p.mouse.move(sb.x + sb.width - 4, sb.y + sb.height / 2, { steps: 6 }); await p.mouse.up();
    const sel1 = await p.evaluate(() => String(getSelection()));
    await p.locator('#pgQ').focus(); await p.keyboard.press('Control+A'); const sel2 = await p.evaluate(() => String(getSelection()));
    await p.evaluate(s => { const r = document.createRange(); r.selectNodeContents(document.querySelector(s)); getSelection().removeAllRanges(); getSelection().addRange(r); }, stem);
    await p.keyboard.press('Control+C'); await p.keyboard.press('Control+X'); await p.evaluate(() => getSelection().removeAllRanges());
    const clip1 = await p.evaluate(() => navigator.clipboard.readText());
    await p.click(stem, { button: 'right' });
    const dragged = await p.evaluate(s => { const e = new DragEvent('dragstart', { bubbles: true, cancelable: true }); document.querySelector(s).dispatchEvent(e); return e.defaultPrevented; }, stem);
    await p.keyboard.press('Control+P'); await p.keyboard.press('Control+S');
    await p.evaluate(() => window.dispatchEvent(new Event('beforeprint')));
    await p.emulateMedia({ media: 'print' }); const printed = await p.evaluate(() => document.body.innerText.trim().length + Array.prototype.filter.call(document.body.children, e => getComputedStyle(e).display !== 'none').length); await p.emulateMedia({ media: 'screen' });
    L = await take(p); const what = L.blocked.map(x => x[1]).join(' ');
    if (sel1 || sel2) fail('the sheet was selected: “' + (sel1 || sel2).slice(0, 40) + '”');
    if (clip1 !== 'before') fail('a copy of the sheet reached the clipboard: ' + clip1.slice(0, 40));
    if (!dragged) fail('a drag was not stopped');
    if (printed) fail('printed, the test page shows something (' + printed + ')');
    if (what !== 'selectall copy cut menu drag print save print') fail('blocked, logged as: ' + what);
    if (L.blocked.some(x => x[2] !== '3')) fail('a blocked attempt not on question 3: ' + JSON.stringify(L.blocked));
    ok('the sheet: a drag across it selects nothing; Ctrl+A, Ctrl+C, Ctrl+X, the context menu, a drag, Ctrl+P, Ctrl+S and the print event do nothing and are logged (' + what + '); printed, nothing');
    /* typing, selecting and pasting in an answer box and in scratch notes */
    const ti = textItem(items), tq = await cardOf(p, ti.id); await toQ(p, tq); go(String(tq + 1));
    await p.click('#a' + ti.id); await p.keyboard.type('12'); await p.keyboard.press('Control+A');
    const bsel = await p.evaluate(i => { const e = document.getElementById('a' + i); return [e.selectionStart, e.selectionEnd]; }, ti.id);
    await p.keyboard.press('Control+C'); await p.evaluate(() => navigator.clipboard.writeText('345')); await p.keyboard.press('End'); await p.keyboard.press('Control+V');
    const bval = await p.inputValue('#a' + ti.id);
    await p.click('#bScratch'); await p.waitForSelector('#kscrN'); await p.click('#kscrS [data-v=notes]');
    await p.click('#kscrN'); await p.keyboard.type('x = 4'); await p.keyboard.press('Control+A');
    const nsel = await p.evaluate(() => { const e = document.getElementById('kscrN'); return [e.selectionStart, e.selectionEnd]; });
    await p.keyboard.press('End'); await p.keyboard.press('Control+V'); const nval = await p.inputValue('#kscrN');
    await sleep(1200);
    await p.click('#kscrS [data-v=grid]'); await sleep(300);
    const gpt = await p.evaluate(() => { const s = document.getElementById('kscrG'), m = s.getScreenCTM(), q = s.createSVGPoint(); q.x = 13 * 18; q.y = 360 - 14 * 18; const o = q.matrixTransform(m); return [o.x, o.y]; });
    await p.mouse.click(gpt[0], gpt[1]); await sleep(1100); await p.click('#kscrX'); await sleep(300);
    L = await take(p);
    if (bsel[0] !== 0 || bsel[1] !== 2 || bval !== '12345') fail('an answer box: selected ' + bsel + ', after a paste “' + bval + '”');
    if (nsel[0] !== 0 || nsel[1] !== 5 || nval !== 'x = 4345') fail('scratch notes: selected ' + nsel + ', after a paste “' + nval + '”');
    if (L.blocked.length !== 8) fail('typing, selecting or pasting in a box was blocked: ' + L.blocked.map(x => x[1]).join(' '));
    if (!L.parts[ti.id] || L.parts[ti.id].pastes !== 1) fail('the paste into ' + ti.id + ' not counted: ' + JSON.stringify(L.parts[ti.id]));
    ok('an answer box and scratch notes take typing, Ctrl+A inside them, copy and paste; the paste into ' + ti.id + ' counted');
    /* a choice tapped, a part typed; an idle stretch (the page's clock moved on 75 s); a calculator opening */
    const mi = items.find(it => it.type === 'mc' || it.type === 'multi'), mq = mi ? await cardOf(p, mi.id) : -1;
    if (mi) { await toQ(p, mq); go(String(mq + 1)); await answer(p, mi, 'key'); }
    await p.clock.fastForward(75000); await sleep(500); await p.mouse.click(5, 300);
    await p.click('#bCalc'); await sleep(1300); await p.click('#kcalcX');
    /* a save that fails (counted in fails) — and the words while it says so */
    await p.route('**/api/test/*/save', r => r.abort()); await p.click('#pgFlag');
    await p.waitForSelector('#exNet:not([hidden])', { timeout: 10000 }).catch(() => fail('a failed save said nothing'));
    await sayOnly(p, 'can’t reach the site');
    await p.unroute('**/api/test/*/save'); await p.click('#exRetry'); await sleep(600);
    /* a reload in the middle: the log kept, and a "reload" */
    const before = await take(p);
    await p.reload(); await p.waitForSelector('#exCover:not([hidden])', { timeout: 15000 }).catch(() => fail('a reload: no cover'));
    if (await p.evaluate(() => document.getElementById('exCover').innerText.trim()) !== 'Back to the test') fail('after a reload the cover says ' + await p.evaluate(() => document.getElementById('exCover').innerText));
    await back(p); const after = await take(p);
    if (after.t0 !== before.t0 || after.away.length !== before.away.length + 1 || after.away[after.away.length - 1][2] !== 'reload' || after.visits.length < before.visits.length - 1 ||
        JSON.stringify(after.parts) !== JSON.stringify(before.parts) || after.blocked.length !== before.blocked.length || after.calc.length < before.calc.length || after.idle.length !== before.idle.length)
      fail('a reload: the log before ' + JSON.stringify({ t0: before.t0, away: before.away.length, visits: before.visits.length, blocked: before.blocked.length }) + ', after ' + JSON.stringify({ t0: after.t0, away: after.away.map(a => a[2]), visits: after.visits.length, blocked: after.blocked.length }));
    else ok('a reload mid-test: the log the same (t0, ' + before.visits.length + ' visits, every value, ' + before.blocked.length + ' blocked, the tools, the idle stretch) and one more leaving, a "reload"');
    if (await p.locator('#exLeft').textContent() !== 'Left the test: 4') fail('after the reload the bar says ' + await p.locator('#exLeft').textContent());
    /* Finish: Finish, Back, in the bar; Grading…; the end panel */
    const zr = await p.evaluate(() => outerWidth / innerWidth);   /* the zoom as the page sees it, still in full screen (a headless window's outer width is not the emulated one) */
    await p.click('#bFinish');
    const conf = await p.evaluate(() => Array.prototype.map.call(document.querySelectorAll('#confirm button'), b => b.textContent).join('|') + '|' + document.getElementById('confirm').innerText.replace(/\s+/g, ' ').trim());
    if (conf !== 'Finish|Back|Finish Back') fail('Finish asks: ' + conf);
    await sayOnly(p, 'Finish asked');
    let held = 0; await p.route('**/api/test/*/grade', async r => { if (held++ === 0) await sleep(1500); return r.continue(); });
    await p.click('#cy'); await p.waitForSelector('.exgrading'); await sayOnly(p, 'grading');
    await p.waitForSelector('#exCode', { timeout: 30000 }); await p.unroute('**/api/test/*/grade');
    const T = site.state.tests[t.id], G = T.log;
    const end = await p.evaluate(() => ({ away: (document.querySelector('.exaway') || {}).textContent || null, ended: !!document.querySelector('.exended') }));
    await sayOnly(p, 'the end panel');
    if (SHOTS) await p.screenshot({ path: path.join(SHOTS, U.id + '-end-1366-light.png') });
    /* the log as the site has it: every field of the pinned shape, and what this session must have made */
    const KEYS = 'v,t0,t1,q,visits,parts,calc,scratch,away,blocked,idle,device,fails,drop';
    if (!G || Object.keys(G).join() !== KEYS) fail('the log\'s fields: ' + (G && Object.keys(G).join()));
    else {
      const len = Math.round((G.t1 - G.t0) / 1000), vsum = G.visits.reduce((s, v) => s + v[2], 0);
      if (G.v !== 1 || !(G.t1 > G.t0)) fail('v, t0, t1: ' + [G.v, G.t0, G.t1]);
      if (Math.abs(vsum - len) > 2) fail('the visits add up to ' + vsum + ' s; the test was ' + len + ' s');
      const order = []; G.visits.forEach(v => { if (order[order.length - 1] !== v[0]) order.push(v[0]); });
      if (order.join(' ') !== route.join(' ')) fail('the visits in order: ' + order.join(' ') + '; the session: ' + route.join(' '));
      let tt = -1; G.visits.forEach(v => { if (!(v[1] >= tt)) fail('a visit out of time order: ' + JSON.stringify(v)); tt = v[1] + v[2]; });
      if (Object.keys(G.q).length !== N) fail('q has ' + Object.keys(G.q).length + ' questions, the test ' + N);
      Object.keys(G.q).forEach(q => { const x = G.q[q]; if (Object.keys(x).join() !== 'sec,visits,first,flag,flagEnd') fail('q ' + q + ': ' + Object.keys(x)); });
      Object.keys(G.q).forEach(q => { const n = G.visits.filter(v => v[0] === q).length; if (G.q[q].visits !== n || G.q[q].sec !== Math.round(G.visits.filter(v => v[0] === q).reduce((s2, v) => s2 + v[2], 0)) && Math.abs(G.q[q].sec - G.visits.filter(v => v[0] === q).reduce((s2, v) => s2 + v[2], 0)) > 1) fail('q ' + q + ': ' + JSON.stringify(G.q[q]) + ', the visits ' + n); });
      if (!(G.q['1'].sec >= 1)) fail('q 1: ' + JSON.stringify(G.q['1']));
      const vq = G.q[String(tq + 1)]; if (!(vq.first >= 0 && vq.first <= vq.sec)) fail('the question typed in: first ' + vq.first + ' of ' + vq.sec + ' s');
      if (!Object.values(G.q).some(x => x.flag && x.flagEnd)) fail('the flag at question ' + route[route.length - 1] + ' not in q');
      const pv = G.parts[ti.id]; if (!pv || pv.n !== pv.vals.length || pv.vals.some(v => v.length !== 3 || v[2] !== 'typed') || pv.vals[pv.vals.length - 1][1] !== '12345') fail(ti.id + '\'s values: ' + JSON.stringify(pv));
      if (mi) { const mv = G.parts[mi.id]; if (!mv || mv.vals.some(v => v[2] !== 'tap') || !mv.n) fail(mi.id + '\'s values (a choice): ' + JSON.stringify(mv)); }
      if (!G.calc.length || G.calc[0][0] !== 'fast' || G.calc.length !== 2 || G.calc.some(x => !(x[3] >= 1) || typeof x[1] !== 'string')) fail('the calculator\'s openings: ' + JSON.stringify(G.calc));
      const so = G.scratch.opens.map(x => x[0] + '@' + x[1]).join(' ');
      if (so !== 'notes@' + (tq + 1) + ' grid@' + (tq + 1) || G.scratch.opens.some(x => !(x[3] >= 1))) fail('scratch paper\'s openings: ' + JSON.stringify(G.scratch.opens));
      const se = G.scratch.end[String(tq + 1)];
      if (!se || se.n !== 'x = 4345' || !se.g || se.g.o.length !== 1 || se.g.o[0][0] !== 'p' || G.scratch.cut !== false || Object.keys(G.scratch).join() !== 'opens,end,cut') fail('scratch paper at Finish: ' + JSON.stringify(G.scratch.end));
      if (G.away.map(a => a[2]).join() !== 'tab,window,fullscreen,reload') fail('away: ' + JSON.stringify(G.away));
      if (G.idle.length !== 1 || !(G.idle[0][1] >= 74 && G.idle[0][1] <= 80)) fail('idle: ' + JSON.stringify(G.idle));
      if (G.blocked.length !== 8) fail('blocked: ' + JSON.stringify(G.blocked));
      const D = G.device, DK = 'sw,sh,ww,wh,dpr,touch,os,osv,br,brv,dark,large,zoom,tz,fs';
      const zw = [0.25, 0.33, 0.5, 0.67, 0.75, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4, 5].find(z => Math.abs(zr - z) <= z * 0.03) || Math.round(zr * 100) / 100;
      if (Object.keys(D).join() !== DK || D.ww !== 1366 || D.wh !== 657 || D.sw !== 1366 || D.touch !== false || D.dark !== false || D.large !== false || D.zoom !== zw || D.tz !== 'America/New_York' || D.fs !== true || typeof D.br !== 'string' || typeof D.os !== 'string' || !(D.dpr > 0))
        fail('the device: ' + JSON.stringify(D) + ' (the page\'s zoom now ' + zw + ')');
      if (!(G.fails >= 1)) fail('fails: ' + G.fails);
      if (JSON.stringify(G.drop) !== '{"visits":0,"calc":0,"scratch":0,"away":0,"blocked":0,"idle":0}') fail('drop: ' + JSON.stringify(G.drop));
      const asum = G.away.reduce((s, a) => s + a[1], 0), want = 'Left the test 4 times · ' + (asum >= 60 ? Math.floor(asum / 60) + ' min' + (asum % 60 ? ' ' + asum % 60 + ' s' : '') : asum + ' s');
      if (end.away !== want || end.ended) fail('the end panel: ' + JSON.stringify(end) + ', the log says ' + want);
      if (await p.evaluate(id => localStorage.getItem('exam.log.' + id), t.id) !== null) fail('the log is still on the device after the seal');
      const rec = site.state.results[T.sealed.code].record; if (JSON.stringify(rec.log) !== JSON.stringify(G) || rec.ended !== null) fail('the record\'s log or ended');
      ok('the log at Finish: every field of the pinned shape; ' + G.visits.length + ' visits in the session\'s order adding up to ' + vsum + ' of ' + len + ' s; values typed and tapped; a paste; the calculator (fast, twice); scratch paper (Notes, then Grid) and its notes and point at Finish; four leavings; ' + G.blocked.length + ' blocked; an idle stretch of ' + G.idle[0][1] + ' s; the device (' + [D.os, D.br, D.brv, D.tz].join(', ') + '); ' + G.fails + ' failed save; nothing dropped');
      ok('the end panel: “' + end.away + '”; the device\'s copy of the log gone after the seal');
      const off = asked.filter(u => !(/^(data|blob):/.test(u) || u === base + TPATH || u.indexOf(base + '/api/test/') === 0 || /^https:\/\/desmosforassessment\.cambiumtds\.com\/TDSCalculator\.html/.test(u)));
      if (off.length) fail('requests besides the test routes (and the calculator opened): ' + off.slice(0, 3).join(' '));
      else ok('the whole session asked for nothing but the page, the test routes (' + asked.filter(u => u.indexOf('/api/test/') >= 0).length + ') and the calculator it opened');
    }
    await c.close();

    /* B. lock after 3, on a touch tablet (1024 × 768): the keypad's values; locked on the third; a wrong code; five tries, then 429; the right code; locked again on the fourth */
    await put({ rule: { leave: 'lock', after: 3 }, unlock: '4821' });
    const cb = await ctxOf({ viewport: { width: 1024, height: 768 }, hasTouch: true, isMobile: true });
    const B = await begin(cb), pb = B.p, ib = B.t.priv.map(x => P.unpack(x));
    /* a part whose kind of box shows keys (a unit may have none at all, as M7 Units 7 and 13, or keys for one kind only, as A7 Unit 5's fraction bar) */
    const keyed = it => U.keypad == null || U.keypad.some(k => !k.kinds || k.kinds.indexOf(it.x.kind) >= 0);
    const ki = textItem(ib, keyed) || textItem(ib), keyless = !keyed(ki), kq = await cardOf(pb, ki.id); await toQ(pb, kq);
    await pb.tap('#a' + ki.id); if (!keyless) await pb.waitForSelector('.keys:not([hidden]) [data-k]', { timeout: 8000 }).catch(() => fail('no keypad on the tablet'));
    const key = await pb.evaluate(() => { const k = Array.prototype.find.call(document.querySelectorAll('.keys [data-k]'), b => !b.hidden && b.offsetParent); return k && k.getAttribute('data-k'); });
    if (key) { await pb.tap('.keys [data-k="' + key + '"]'); await sleep(400); }
    for (let i = 1; i <= 2; i++) { await leave(pb, 'tab', 900); if (await pb.isVisible('#exLock')) fail('locked on leaving ' + i); await back(pb); }
    await leave(pb, 'tab', 900);
    const lk = await pb.evaluate(() => ({ lock: !document.getElementById('exLock').hidden, back: !document.getElementById('exBackIn').hidden, text: document.getElementById('exCover').innerText.replace(/\s+/g, ' ').trim(), focus: document.activeElement && document.activeElement.id }));
    if (!lk.lock || lk.back || lk.text !== 'Locked. Ask your teacher. Unlock' || lk.focus !== 'exUn') fail('locked on the third: ' + JSON.stringify(lk));
    await sayOnly(pb, 'locked');
    if (SHOTS) await pb.screenshot({ path: path.join(SHOTS, U.id + '-locked-1024-touch.png') });
    await pb.keyboard.press('Escape'); if (!(await pb.isVisible('#exLock'))) fail('Escape unlocked');
    await pb.emulateMedia({ reducedMotion: 'reduce' });
    const tries = []; let st = null;
    for (let i = 0; i < 6; i++) {
      await pb.fill('#exUn', '000' + i); const resp = pb.waitForResponse(r => /\/unlock$/.test(r.url())); await pb.click('#exUnGo'); st = (await resp).status(); await sleep(150);
      tries.push(st + ':' + (await pb.inputValue('#exUn')) + ':' + (await pb.evaluate(() => getComputedStyle(document.getElementById('exUn')).animationName)));
      if (i === 0) { await pb.emulateMedia({ reducedMotion: 'no-preference' }); }
    }
    if (tries.slice(0, 5).some(x => !/^200::/.test(x)) || !/^200::none$/.test(tries[0]) || !/^200::exshake$/.test(tries[1]) || !/^429:/.test(tries[5])) fail('wrong codes: ' + tries.join(' '));
    if (!(await pb.isDisabled('#exUn')) || !(await pb.isVisible('#exLock'))) fail('after 429 the box does not wait');
    const lockText = await pb.evaluate(() => document.getElementById('exCover').innerText.replace(/\s+/g, ' ').trim()); if (lockText !== 'Locked. Ask your teacher. Unlock') fail('a wrong code said more: ' + lockText);
    skip(61000); await pb.waitForSelector('#exUn:not([disabled])', { timeout: 8000 }).catch(() => fail('the box never came back after 429'));
    await pb.fill('#exUn', '4821'); await pb.click('#exUnGo'); await pb.waitForSelector('#exCover', { state: 'hidden', timeout: 8000 }).catch(() => fail('the right code did not unlock'));
    if (!(await fsOn(pb))) fail('Unlock did not go back into full screen');
    if (await count(pb) !== 3) fail('the count after Unlock: ' + await count(pb));
    await leave(pb, 'window', 1300);
    if (!(await pb.isVisible('#exLock'))) fail('the fourth leaving did not lock again');
    await pb.fill('#exUn', '4821'); await pb.click('#exUnGo'); await pb.waitForSelector('#exCover', { state: 'hidden', timeout: 8000 }).catch(() => fail('the right code did not unlock the fourth'));
    if (await pb.locator('#exLeft').textContent() !== 'Left the test: 4') fail('the count after the fourth: ' + await pb.locator('#exLeft').textContent());
    await pb.click('#bFinish'); await pb.click('#cy'); await pb.waitForSelector('#exCode', { timeout: 30000 });
    const TB = site.state.tests[B.t.id], GB = TB.log, RB = site.state.results[TB.sealed.code].record;
    const kv = GB.parts[ki.id];
    if (key && (!kv || kv.vals[kv.vals.length - 1][2] !== 'keypad')) fail('a key of the keypad logged as ' + JSON.stringify(kv));
    if (GB.away.length !== 4 || RB.unlocks !== 2 || GB.device.touch !== true) fail('lock: ' + JSON.stringify({ away: GB.away, unlocks: RB.unlocks, touch: GB.device.touch }));
    ok('lock after 3 (a touch tablet): open on leavings 1 and 2; locked on the third (the words, focus in the box, Escape does nothing); five wrong codes each cleared, the box still, no word, shaking only without reduced motion; the sixth try 429 and the box waits; the right code unlocks into full screen; the fourth leaving locks again; the record\'s unlocks 2; ' + (key ? 'the keypad\'s “' + key + '” logged as keypad' : 'no keypad in this unit'));
    await cb.close();

    /* C. end after 3, at 390 × 844 in dark: finished as it stands */
    await put({ rule: { leave: 'end', after: 3 }, unlock: '4821' });
    const cc = await ctxOf({ viewport: { width: 390, height: 844 }, colorScheme: 'dark', hasTouch: true, isMobile: true });
    const C3 = await begin(cc), pc = C3.p, ic = C3.t.priv.map(x => P.unpack(x));
    await answer(pc, ic[0], 'key'); await sleep(300);
    for (let i = 1; i <= 2; i++) { await leave(pc, i === 1 ? 'tab' : 'fullscreen', 900); await back(pc); }
    await hide(pc); await sleep(400);
    await pc.waitForSelector('#exCode', { timeout: 30000 }).catch(() => fail('end after 3: the test did not finish'));
    await unhide(pc); await sleep(300);
    const TC = site.state.tests[C3.t.id], ce = await pc.evaluate(() => ({ ended: (document.querySelector('.exended') || {}).textContent, away: (document.querySelector('.exaway') || {}).textContent, cover: !!document.getElementById('exCover') && !document.getElementById('exCover').hidden }));
    if (TC.ended !== 'left' || site.state.results[TC.sealed.code].record.ended !== 'left') fail('end after 3: the record\'s ended is ' + TC.ended);
    if (ce.ended !== 'Test ended: left the test 3 times.' || !/^Left the test 3 times · \d+ s$/.test(ce.away || '') || ce.cover) fail('end after 3, the end panel: ' + JSON.stringify(ce));
    if (TC.answers[ic[0].id] == null) fail('end after 3: the answer given was not sent');
    await sayOnly(pc, 'the end panel, ended');
    if (SHOTS) await pc.screenshot({ path: path.join(SHOTS, U.id + '-ended-390-dark.png') });
    ok('end after 3 (390 × 844, dark): the third leaving finished the test as it stood; “' + ce.ended + '” and “' + ce.away + '”; the record\'s ended “left”');
    await cc.close();

    /* D. the caps and drop: the caps lowered through the hook for the visits (5) and blocked (3); a part's 15 values; 4 KB of scratch paper */
    await put({ rule: { leave: 'count', after: 3 }, unlock: '4821' });
    const cd = await ctxOf(), D4 = await begin(cd), pd = D4.p, idd = D4.t.priv.map(x => P.unpack(x));
    await pd.evaluate(() => { Kit.Trace.CAP.visits = 5; Kit.Trace.CAP.blocked = 3; });
    for (let i = 1; i <= 8; i++) { await pd.click('#pgNext'); await sleep(320); }
    for (let i = 0; i < 5; i++) await pd.evaluate(() => Kit.Trace.blocked('copy'));
    const di = textItem(idd), dq = await cardOf(pd, di.id); await toQ(pd, dq);
    await pd.click('#a' + di.id); for (let i = 0; i < 15; i++) await pd.keyboard.type(String(i % 10));
    const oq = dq === 0 ? '2' : '1';        /* another question's notes, shorter */
    await pd.evaluate(([set, q, o]) => localStorage.setItem('practice.scratch.v1.' + set, JSON.stringify({ t: Date.now(), q: { [q]: { n: 'a'.repeat(3000), g: { v: [4, 1], o: [] } }, [o]: { n: 'b'.repeat(1500), g: { v: [4, 1], o: [['p', 1, 2]] } } } })), ['exam.' + U.id + '.set.' + D4.t.id + '.all', String(dq + 1), oq]);
    const LD = await take(pd), vals = LD.parts[di.id], bytes = Buffer.byteLength(JSON.stringify(LD.scratch.end));
    const typed = []; for (let i = 0; i < 15; i++) typed.push('0123456789012345'.slice(0, i + 1));
    if (LD.visits.length !== 5 || LD.drop.visits !== LD.visits.length + LD.drop.visits - 5 || !(LD.drop.visits >= 4)) fail('visits capped: ' + LD.visits.length + ' kept, ' + LD.drop.visits + ' dropped');
    if (LD.blocked.length !== 3 || LD.drop.blocked !== 2) fail('blocked capped: ' + LD.blocked.length + ' kept, ' + LD.drop.blocked + ' dropped');
    if (!vals || vals.n !== 15 || vals.vals.length !== 12 || JSON.stringify(vals.vals.map(v => v[1])) !== JSON.stringify(typed.slice(0, 4).concat(typed.slice(7)))) fail('a part\'s values capped: ' + JSON.stringify(vals && { n: vals.n, kept: vals.vals.map(v => v[1]) }));
    const e1 = LD.scratch.end[oq], e2 = LD.scratch.end[String(dq + 1)];
    if (bytes > 4096 || !LD.scratch.cut || !e1 || e1.n.length !== 1500 || e1.g.o.length !== 1 || !e2 || !(e2.n.length < 3000 && e2.n.length >= 1500)) fail('scratch paper capped: ' + bytes + ' bytes, cut ' + LD.scratch.cut + ', notes ' + (e1 && e1.n.length) + ' and ' + (e2 && e2.n.length));
    ok('the caps: visits kept 5 (the hook\'s cap), ' + LD.drop.visits + ' in drop; blocked 3, 2 in drop; a part\'s 15 values: the first 4 and the last 8, n 15; scratch paper ' + bytes + ' bytes, the longest notes cut first (3000 → ' + e2.n.length + ', 1500 kept), cut true');
    await cd.close();
    await put({ rule: { leave: 'count', after: 3 } });

    /* E. screenshots: the start, a question, away, locked and the end panel, light and dark, 1366 × 657 and 390 × 844 (lock after 2) */
    if (SHOTS) for (const [w, h] of [[1366, 657], [390, 844]]) for (const scheme of ['light', 'dark']) {
      await put({ rule: { leave: 'lock', after: 2 }, unlock: '4821' });
      const cs = await ctxOf(Object.assign({ viewport: { width: w, height: h }, colorScheme: scheme }, w < 500 ? { hasTouch: true, isMobile: true } : {})), ps = watch(await cs.newPage()), tag = w + '-' + scheme;
      await ps.goto(base + TPATH); await ps.waitForSelector('#exStart:not([hidden])'); await ps.screenshot({ path: path.join(SHOTS, U.id + '-p-start-' + tag + '.png') });
      await ps.click('#exStart'); await ps.waitForSelector('#pgQ'); await sleep(500); const ts = newest(), its = ts.priv.map(x => P.unpack(x));
      await answer(ps, its[0], 'key'); await sleep(300); await ps.screenshot({ path: path.join(SHOTS, U.id + '-p-question-' + tag + '.png') });
      await hide(ps); await sleep(500); await ps.screenshot({ path: path.join(SHOTS, U.id + '-p-away-' + tag + '.png') }); await unhide(ps); await sleep(300); await back(ps);
      await ps.screenshot({ path: path.join(SHOTS, U.id + '-p-bar-' + tag + '.png') });
      await hide(ps); await sleep(500); await unhide(ps); await sleep(300); await ps.screenshot({ path: path.join(SHOTS, U.id + '-p-locked-' + tag + '.png') });
      await ps.fill('#exUn', '4821'); await ps.click('#exUnGo'); await ps.waitForSelector('#exCover', { state: 'hidden' });
      await ps.click('#bFinish'); await ps.click('#cy'); await ps.waitForSelector('#exCode', { timeout: 30000 }); await sleep(300);
      await ps.screenshot({ path: path.join(SHOTS, U.id + '-p-end-' + tag + '.png'), fullPage: true });
      await cs.close();
    }
    await put({ rule: { leave: 'count', after: 3 } });
  }
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
  await fetch(base + '/teacher/api/test/config', { method: 'PUT', headers: { 'X-Teacher': 'pw', 'Content-Type': 'application/json' }, body: JSON.stringify({ startCode: false, show: 'parts', form: FORM === 'none' ? null : FORM }) });

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
  const page = fs.readFileSync(path.join(dir, TESTFILE), 'utf8'), kitText = ['core.js', 'nline.js', 'cgraph.js', 'judge.js', 'pager.js', 'scratch.js', 'ui.js', 'calc.js', 'tex.js', 'exam_unit.js', 'trace.js', 'proctor.js', 'exam.js'].map(f => fs.readFileSync(path.join(KIT, f), 'utf8')).join('');
  let lines = 0; cfg.scripts.forEach(s => fs.readFileSync(path.join(dir, s), 'utf8').split('\n').forEach(l => { const t = l.trim(); if (t.length >= 40 && !/^(\/\*|\*|\/\/)/.test(t) && kitText.indexOf(t) < 0) { lines++; if (page.indexOf(t) >= 0) fail('the test page holds a line of ' + s + ': ' + t.slice(0, 60)); } }));
  let own = page; ['core.js', 'nline.js', 'cgraph.js', 'judge.js', 'pager.js', 'scratch.js', 'ui.js', 'calc.js', 'tex.js', 'exam_unit.js', 'trace.js', 'proctor.js', 'exam.js', 'vendor/katex/katex.min.js'].forEach(f => { own = own.split(fs.readFileSync(path.join(KIT, f), 'utf8')).join(''); });
  if (/window\.Unit\s*=\s*\{|Unit\.judge|keyText\s*:|solution\s*:|walk\s*:/.test(own)) fail('the test page defines a unit or a judge of its own');
  const stub = await (async () => { const c = await ctxOf(), p = watch(await c.newPage()); await p.goto(base + TPATH);
    const r = await p.evaluate(f => { const u = Kit.ExamUnit.make(f.pub), J = Kit.ExamUnit.judge(Kit.Judge({ U: u, V: u.view, K: Kit, NL: Kit.NL, CG: Kit.CG })); let refused = 0; ['judge', 'atFinish'].forEach(k => { try { J[k]({ type: 'text', x: {} }, '1', {}, 0); } catch (e) { refused++; } });
      return { keys: Object.keys(u), view: Object.keys(u.view), refused }; }, pool[0]); await c.close(); return r; })();
  ['judge', 'solution', 'walk', 'key', 'keyText', 'rungs', 'choices', 'readNum', 'numOk'].forEach(k => { if (stub.keys.indexOf(k) >= 0) fail('the stub unit has ' + k); });
  if (stub.view.indexOf('key') >= 0) fail('the stub\'s view has key'); if (stub.refused !== 2) fail('the stub\'s judge judged');
  ok('nothing to steal: ' + lines + ' lines of the unit\'s scripts searched, none on the page; the stub has ' + stub.keys.join(', ') + '; its judge refuses; every pub on the whitelist');

  /* 4. a whole test */
  /* 7. the proctor and the log (16 Nov 2026); 8. the start code (16 Nov 2026) */
  if (WHOLE) await proctor();
  if (WHOLE) await startCode();
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
  const LIST = ['Start', 'Test', 'Grading…', 'Turn in', 'Copied', 'New test', 'Back', 'Try again', 'This test isn’t open.', 'Can’t reach the site. Your answers are saved on this device.', 'Can’t read this yet',
    'Start code', 'Finish', 'Not right', 'Test ended: left the test ', ' times.', ' time.', 'Left the test ', ' times · ', ' time · ', ' min', ' s'];   /* the end panel's two lines in pieces (16 Nov 2026) */
  (words.match(/'[^']*'/g) || []).map(w => JSON.parse('"' + w.slice(1, -1) + '"')).forEach(w => { if (LIST.indexOf(w) < 0) fail('exam.js says “' + w + '”'); });
  const psrc = fs.readFileSync(path.join(KIT, 'proctor.js'), 'utf8'), pat = psrc.indexOf('var WORDS = {'), pw = psrc.slice(pat, psrc.indexOf('};', pat));
  (pw.match(/'[^']*'/g) || []).map(w => JSON.parse('"' + w.slice(1, -1) + '"')).forEach(w => { if (['Back to the test', 'Locked. Ask your teacher.', 'Unlock', 'Start', 'Left the test: '].indexOf(w) < 0) fail('proctor.js says “' + w + '”'); });
  if (fs.readFileSync(path.join(KIT, 'trace.js'), 'utf8').match(/textContent|innerHTML|innerText/)) fail('trace.js writes on the page');

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
        await p.reload(); await p.waitForSelector('#pgQ'); await p.click('#exBackIn');   /* a reload is a leaving (proctor.js): Back to the test */
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
    await sayOnly(p3, 'closed'); await c3.close(); ok('closed: “This test isn’t open.”, and nothing else');
  }

  /* ---- 8. the start code (16 Nov 2026; CHANGES-16NOV §2): four characters typed above Start while the site asks for one ---- */
  async function startCode() {
    await put({ startCode: true, rule: { leave: 'count', after: 3 } });
    const K8 = COURSE + '/' + UNIT, starts = () => site.log.filter(L => L.path === '/api/test/start' && L.status === 200).length;
    if (SHOTS) for (const [w, h] of [[1366, 657], [390, 844]]) for (const scheme of ['light', 'dark']) {
      const cs = await ctxOf(Object.assign({ viewport: { width: w, height: h }, colorScheme: scheme }, w < 500 ? { hasTouch: true, isMobile: true } : {})), ps = watch(await cs.newPage());
      await ps.goto(base + TPATH); await ps.waitForSelector('#exPin:not([hidden])'); await ps.screenshot({ path: path.join(SHOTS, U.id + '-pin-start-' + w + '-' + scheme + '.png') });
      await ps.keyboard.type('7k4'); await ps.screenshot({ path: path.join(SHOTS, U.id + '-pin-typed-' + w + '-' + scheme + '.png') }); await cs.close();
    }
    const c = await ctxOf(), p = watch(await c.newPage());
    await p.goto(base + TPATH); await p.waitForSelector('#exPin:not([hidden])', { timeout: 10000 }).catch(() => fail('the start code on: no box'));
    const look = await p.evaluate(() => { const b = document.getElementById('exPin'), s = document.getElementById('exStart'); return { focus: document.activeElement === b, ph: b.placeholder, above: b.getBoundingClientRect().bottom <= s.getBoundingClientRect().top + 1 }; });
    if (!look.focus || look.ph !== 'Start code' || !look.above) fail('the box: ' + JSON.stringify(look));
    await sayOnly(p, 'the start, with the start code');
    const n0 = starts();
    const refused = async (what, type) => {
      if (type != null) { await p.fill('#exPin', ''); await p.type('#exPin', type); }
      const r = p.waitForResponse(x => /\/api\/test\/start$/.test(x.url())); if (type == null) await p.click('#exStart'); else await p.press('#exPin', 'Enter');
      const res = await r, j = await res.json().catch(() => ({})); await sleep(120);
      const st = await p.evaluate(() => { const b = document.getElementById('exPin'); return { v: b.value, anim: getComputedStyle(b).animationName, vis: !!b.offsetParent, start: !document.getElementById('exStart').hidden, closed: !document.getElementById('exClosed').hidden, focus: document.activeElement === b }; });
      if (res.status() !== 403 || j.error !== 'pin' || st.v !== '' || st.anim !== 'exshake' || !st.vis || !st.start || st.closed || !st.focus) fail('the start code ' + what + ': ' + res.status() + ' ' + JSON.stringify(j) + ' ' + JSON.stringify(st));
      await sayOnly(p, 'the start code ' + what);
    };
    await refused('empty', null);
    let pin = site.state.open[K8].pin, wrong = pin.split('').reverse().join(''); if (wrong === pin) wrong = pin.slice(0, 3) + (pin[3] === 'Z' ? 'Y' : 'Z');
    await refused('wrong', wrong);
    skip(16 * 60000); await refused('lapsed', pin);
    if (starts() !== n0) fail('a refused start code started a test');
    const np = await (await fetch(base + '/teacher/api/test/pin', { method: 'POST', headers: { 'X-Teacher': 'pw', 'Content-Type': 'application/json' }, body: JSON.stringify({ course: COURSE, unit: UNIT }) })).json();
    pin = np.pin; if (!/^[23456789ABCDEFGHJKMNPQRSTVWXYZ]{4}$/.test(pin || '') || !(np.until > 0)) fail('New code: ' + JSON.stringify(np));
    const typed = pin.slice(0, 2).toLowerCase() + ' ' + pin.slice(2).toLowerCase();
    await p.fill('#exPin', ''); await p.type('#exPin', typed);
    const shownV = await p.inputValue('#exPin'); if (shownV !== typed.toUpperCase()) fail('the box shows ' + shownV + ' for ' + typed);
    const sent = p.waitForRequest(x => /\/api\/test\/start$/.test(x.url())); await p.press('#exPin', 'Enter');
    const body = JSON.parse((await sent).postData() || '{}'); await p.waitForSelector('#pgQ', { timeout: 15000 }).catch(() => fail('the right code did not start the test'));
    if (body.pin !== pin) fail('Start sent ' + JSON.stringify(body));
    const t = newest(), n1 = starts();
    await p.reload(); await p.waitForSelector('#pgQ');
    if (await p.isVisible('#exPin') || newest().id !== t.id || starts() !== n1 || site.log.filter(L => L.path === '/api/test/start').length !== site.log.filter(L => L.path === '/api/test/start').length) fail('a reload after starting asked for the code or started again');
    await c.close();
    ok('the start code on: the box (focused, “Start code”, over Start); empty, wrong and lapsed codes refused (403 pin; the box shakes, clears and keeps the focus; no new words; no test started); New code; “' + typed + '” shown as ' + shownV + ' and sent as ' + body.pin + ', the test started; a reload asks for nothing');
    await put({ startCode: false });
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
