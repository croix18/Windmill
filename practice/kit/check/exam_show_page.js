/* Practice-test kit: the test as drawn, checked (check/exam_show_page.js, 16 Nov 2026; kit/exam_show.js). Run by check/run.py
   for a teacher copy:   NODE_PATH=$(npm root -g) node check/exam_show_page.js <teacher unit folder> [--shots DIR]
   Against the copy's own preview.html, served at a path like the site's, in Chromium:
   - a seed drawn on that page (Kit.ExamPool.draw) made into the payload Tally makes; the copy opened at #test=…: the cards shown
     are that seed's sheet (Kit.ExamPool.sheet, the cards check/exam_page.js holds the test page to), in order; every part has
     its verdict, its answer as text and its key; an answer that looks like markup stays text and runs nothing; nothing in a
     card can take the focus; the address still reads #test=…, and a reload shows the same;
   - nothing in localStorage or sessionStorage changed, and no request left the page;
   - refused, with its one line and no card: a key changed, another unit's payload, junk; a content version that differs: the
     test with its one quiet line;
   - without #test= nothing is different: no view, #set-N as before;
   - the student page (the folder above) does not hold exam_show.js.
   With --shots: light, dark, 400 px, the print as a PDF, and a refused line. */
'use strict';
const path = require('path'), fs = require('fs'), http = require('http');
const dir = path.resolve(process.argv[2] || '.'), arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const SHOTS = arg('--shots', ''), KIT = path.join(__dirname, '..');
const U = require(path.join(dir, 'unit.js')), m = /^([a-z]+\d+)u(\d+)$/.exec(U.id || '');
const fails = [], fail = s => { fails.push(s); console.log('  FAIL ' + s); }, ok = s => console.log('  ok ' + s);
const AT = '/teacher/' + (m ? m[1] : 'x') + '/unit-' + (m ? m[2] : 0) + '/practice/';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const b64u = s => Buffer.from(s, 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
if (!m) { console.log('exam show: not a unit id'); process.exit(1); }
(async () => {
  const page = fs.readFileSync(path.join(dir, 'preview.html'));
  if (page.indexOf('the test as drawn (exam_show.js') < 0) { fail('the teacher copy does not hold exam_show.js'); }
  const asked = [];
  const server = http.createServer((q, r) => { asked.push(q.method + ' ' + q.url); if (q.url.split('?')[0] === AT) { r.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); return r.end(page); } r.writeHead(404); r.end(); });
  await new Promise(res => server.listen(0, '127.0.0.1', res));
  const base = 'http://127.0.0.1:' + server.address().port + AT;
  const { chromium } = require('playwright'); const b = await chromium.launch();
  const errs = [];
  const ctxOf = async o => { const c = await b.newContext(Object.assign({ viewport: { width: 1280, height: 900 } }, o || {})); return c; };
  const watch = p => { p.on('pageerror', e => errs.push(e.message)); return p; };
  const storage = p => p.evaluate(() => { const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); o['L:' + k] = localStorage.getItem(k); } for (let i = 0; i < sessionStorage.length; i++) { const k = sessionStorage.key(i); o['S:' + k] = sessionStorage.getItem(k); } return JSON.stringify(Object.keys(o).sort().map(k => [k, o[k]])); });
  const shown = p => p.waitForFunction(() => window.Kit && Kit.ExamShow, null, { timeout: 60000 }).then(() => p.evaluate(() => ({ state: Kit.ExamShow.state, line: Kit.ExamShow.line || null, cards: document.querySelectorAll('#xShow .q[data-q]').length, hash: location.hash })));

  /* the page as it always is, and a test drawn on it */
  const c = await ctxOf(), p0 = watch(await c.newPage());
  await p0.goto(base); await p0.waitForFunction(() => window.Kit && Kit.ExamPool && window.PracticeKit, null, { timeout: 60000 }); await sleep(500);
  const plain = await p0.evaluate(() => ({ show: !!window.Kit.ExamShow, view: !!document.getElementById('xShow'), cls: document.documentElement.className, hash: location.hash }));
  if (plain.show || plain.view || /xshow/.test(plain.cls) || !/^#set-\d+$/.test(plain.hash)) fail('without #test= the page is not as before: ' + JSON.stringify(plain));
  const T = await p0.evaluate(() => { const f = Kit.ExamPool.draw(1)[0], items = f.priv.map(t => Kit.unpack(t)); return { seed: f.seed, cv: f.pub.cv, kit: f.pub.kit, items: items.map(it => ({ id: it.id, type: it.type, key: it.keyText })), sheet: Kit.ExamPool.sheet(f.seed) }; });
  await p0.goto(base + '#set-4821'); await p0.reload(); await p0.waitForFunction(() => window.PracticeKit, null, { timeout: 60000 }); await sleep(400);
  const set4821 = await p0.evaluate(() => ({ hash: location.hash, show: !!document.getElementById('xShow') }));
  if (set4821.hash !== '#set-4821' || set4821.show) fail('#set-4821 is not as before: ' + JSON.stringify(set4821));
  else ok('without #test= nothing is different (no view; #set-N as before)');
  await p0.close();                                    /* its own last save, on pagehide, goes first */
  const origin = base.replace(AT, '/'), snap = async () => { const q = await c.newPage(); await q.goto(origin + 'nothing-here'); const v = await storage(q); await q.close(); return v; };
  const before = await snap();
  const RES = ['right', 'almost', 'wrong', 'blank', 'unread'];
  const MARK = ['<img src=x onerror="window.__pwn=1">', '<script>window.__pwn=2</script>', '<b>bold?</b> & "quotes"'];
  const parts = T.items.map((it, i) => [it.id, i < MARK.length ? MARK[i] : RES[i % 5] === 'blank' ? '' : (Array.isArray(it.key) ? it.key.join(', ') : String(it.key)), RES[i % 5], it.key]);
  const payload = o => b64u(JSON.stringify(Object.assign({ v: 1, course: m[1], unit: +m[2], seed: T.seed, cv: T.cv, kit: T.kit, code: 'K7QF2M9DX4TB', points: 17, of: T.items.length, parts }, o || {})));

  /* the test as drawn */
  const n0 = asked.length, p = watch(await c.newPage());
  await p.goto(base + '#test=' + payload()); const s = await shown(p);
  if (s.state !== 'shown') fail('a payload drawn on this page was not shown: ' + JSON.stringify(s));
  const r = await p.evaluate(([sheet, items, MARK]) => {
    const strip = h => { const t = document.createElement('template'); t.innerHTML = h; const e = t.content.firstElementChild; [e].concat(Array.from(e.querySelectorAll('*'))).forEach(x => ['tabindex', 'disabled', 'aria-disabled'].forEach(a => x.removeAttribute(a))); return e.outerHTML; };
    const cards = Array.from(document.querySelectorAll('#xShow .q[data-q]')).map(q => { const cl = q.cloneNode(true); cl.querySelectorAll('.xsa').forEach(x => x.remove()); return strip(cl.outerHTML); });
    const same = cards.length === sheet.length && cards.every((h, i) => h === strip(sheet[i])) && JSON.stringify(Kit.ExamShow.cards) === JSON.stringify(sheet);
    const rows = items.map(it => { const row = document.querySelector('#xShow [data-xs="' + it.id + '"]'); if (!row) return null; return { v: row.querySelector('.xsv').textContent, a: row.querySelector('.xst').textContent, aEls: row.querySelector('.xst').children.length, k: row.querySelector('.xskv').textContent.trim().length }; });
    const focus = Array.from(document.querySelectorAll('#xShow .q *')).filter(e => e.tabIndex >= 0 && !e.disabled && e.getClientRects().length);
    /* a unit's own figure may carry the class q (A7's svg.fig.q): the sheet's rules are for the question cards (.q[data-q]) only, so
       nothing else in the view takes a card's rule line */
    const lined = Array.from(document.querySelectorAll('#xShow .q:not([data-q])')).filter(e => getComputedStyle(e).borderBottomStyle !== 'none').length;
    return { same, lined, n: cards.length, rows, pwn: window.__pwn || null, focus: focus.map(e => e.tagName + '.' + e.className).slice(0, 3), hash: location.hash.slice(0, 6), head: document.querySelector('#xShow .xshead').textContent };
  }, [T.sheet, T.items, MARK]);
  if (!r.same) fail('the cards shown are not the seed\'s sheet (' + r.n + ' of ' + T.sheet.length + ')');
  if (r.lined) fail(r.lined + ' element(s) inside a card take the card\'s rule line (a figure classed q is not a card)');
  const WORD = { right: 'Right', almost: 'Almost', wrong: 'Not right', blank: 'Blank', unread: 'Can’t read' };
  r.rows.forEach((row, i) => { const want = parts[i]; if (!row) return fail(want[0] + ': no row');
    if (row.v !== WORD[want[2]] || row.a !== (want[1] === '' ? 'Blank' : want[1]) || row.aEls || !row.k) fail(want[0] + ': ' + JSON.stringify(row)); });
  if (r.pwn) fail('an answer that looks like markup ran: ' + r.pwn);
  if (r.focus.length) fail('something in a card takes the focus: ' + r.focus.join(', '));
  if (r.hash !== '#test=') fail('the address does not read #test=…');
  if (!/Test as drawn/.test(r.head) || !/K7QF-2M9D-X4TB/.test(r.head) || !/17 \/ \d+ points/.test(r.head)) fail('the head: ' + r.head.replace(/\s+/g, ' '));
  ok('the test as drawn: ' + r.n + ' cards, the seed\'s sheet exactly; ' + r.rows.length + ' parts, each with its verdict, its answer as text and its key; markup in an answer stays text; nothing in a card takes the focus; the head with the code and the score');
  await p.reload(); const s2 = await shown(p);
  if (s2.state !== 'shown' || s2.cards !== T.sheet.length || !/^#test=/.test(s2.hash)) fail('a reload: ' + JSON.stringify(s2)); else ok('a reload shows the same');
  if (SHOTS) {
    fs.mkdirSync(SHOTS, { recursive: true });
    await p.screenshot({ path: path.join(SHOTS, U.id + '-show-light.png'), fullPage: true });
    await p.emulateMedia({ colorScheme: 'dark' }); await p.screenshot({ path: path.join(SHOTS, U.id + '-show-dark.png'), fullPage: true }); await p.emulateMedia({ colorScheme: 'light' });
    await p.pdf({ path: path.join(SHOTS, U.id + '-show-print.pdf'), format: 'Letter', printBackground: false, margin: { top: '0.5in', bottom: '0.5in', left: '0.5in', right: '0.5in' } });
    await p.emulateMedia({ media: 'print' }); await p.screenshot({ path: path.join(SHOTS, U.id + '-show-print.png'), fullPage: true }); await p.emulateMedia({ media: 'screen' });
  }
  await p.close(); const after = await snap();
  if (after !== before) { const A = new Map(JSON.parse(after)), B = new Map(JSON.parse(before)), d = [];
    A.forEach((v, k) => { if (B.get(k) !== v) d.push(k + (B.has(k) ? ' changed' : ' added')); }); B.forEach((v, k) => { if (!A.has(k)) d.push(k + ' removed'); });
    fail('the device\'s storage changed: ' + d.slice(0, 5).join(', ')); }
  const off = asked.slice(n0).filter(x => { const u = x.split(' ')[1].split('?')[0]; return u !== AT && u !== '/nothing-here'; });   /* the snapshot's own page aside */
  if (off.length) fail('requests: ' + off.slice(0, 4).join(', '));
  if (after === before && !off.length) ok('nothing in localStorage or sessionStorage changed (the page closed, its pagehide too); no request but the page itself');
  /* narrow, dark: Croix's tablet */
  if (SHOTS) { const cn = await ctxOf({ viewport: { width: 400, height: 860 }, colorScheme: 'dark', hasTouch: true, isMobile: true }), pn = watch(await cn.newPage()); await pn.goto(base + '#test=' + payload()); await shown(pn);
    const sw = await pn.evaluate(() => document.documentElement.scrollWidth - innerWidth); if (sw > 0) fail('400 px: sideways scroll ' + sw);
    await pn.screenshot({ path: path.join(SHOTS, U.id + '-show-400-dark.png'), fullPage: true });
    const cl = await ctxOf({ viewport: { width: 400, height: 860 }, hasTouch: true, isMobile: true }), pl = watch(await cl.newPage()); await pl.goto(base + '#test=' + payload()); await shown(pl); await pl.screenshot({ path: path.join(SHOTS, U.id + '-show-400-light.png'), fullPage: false });
    await cn.close(); await cl.close(); }
  /* refused, with its line, and never a card */
  const k1 = parts.map((x, i) => i === Math.min(5, parts.length - 1) ? [x[0], x[1], x[2], Array.isArray(x[3]) ? x[3].concat('1') : x[3] + '1'] : x);
  const cases = [
    ['one key changed', payload({ parts: k1 }), /has changed since this test was taken/],
    ['another unit\'s payload', payload({ course: m[1] === 'a7' ? 'm7' : 'a7', unit: 6 }), /^This link is for (A7|M7) Unit 6; this is /],
    ['another seed', payload({ seed: 'f'.repeat(32) }), /has changed since this test was taken/],
    ['junk', 'abc$%', /doesn’t hold a test/], ['not JSON', b64u('hello'), /doesn’t hold a test/], ['no parts', payload({ parts: [] }), /doesn’t hold a test/],
    ['too many parts', payload({ parts: Array.from({ length: 201 }, (x, i) => ['1', '', 'right', 'x']) }), /doesn’t hold a test/]
  ];
  for (const [what, pay, rx] of cases) {
    const pr = watch(await c.newPage()); await pr.goto(base + '#test=' + pay);
    const x = await shown(pr), back = await pr.evaluate(() => { const a = document.querySelector('#xShow .xsback'); return a && a.getAttribute('href'); });
    if (x.state !== 'refused' || x.cards || !rx.test(x.line || '') || back !== AT) fail(what + ': ' + JSON.stringify(x) + ' back ' + back);
    if (what === 'one key changed' && SHOTS) await pr.screenshot({ path: path.join(SHOTS, U.id + '-show-refused.png') });
    await pr.close();
  }
  ok('refused with one line, a link back and no card: a key changed, another unit\'s, another seed, not JSON, no parts, too many parts, junk');
  const pv = watch(await c.newPage()); await pv.goto(base + '#test=' + payload({ cv: 'older' })); const sv = await shown(pv);
  const note = await pv.evaluate(() => (document.querySelector('#xShow .xsnote') || {}).textContent || '');
  if (sv.state !== 'shown' || !/may have been edited/.test(note)) fail('a content version that differs: ' + JSON.stringify(sv) + ' ' + note); else ok('a content version that differs: the test, with its one quiet line');
  await pv.close();
  /* the student page does not hold it */
  const stu = path.join(dir, '..', 'preview.html');
  if (fs.existsSync(stu)) { if (fs.readFileSync(stu, 'utf8').indexOf('the test as drawn (exam_show.js') >= 0) fail('the student page holds exam_show.js'); else ok('the student page (' + path.basename(path.dirname(dir)) + '/preview.html) does not hold exam_show.js'); }
  if (errs.length) fail('page errors: ' + errs.slice(0, 3).join(' | '));
  await c.close(); await b.close(); server.close();
  console.log('exam show: ' + (fails.length ? fails.length + ' FAILED' : 'every check passed') + ' (' + U.id + ')');
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
