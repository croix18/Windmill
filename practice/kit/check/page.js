/* Practice-test kit: the page in a real browser (Playwright).   NODE_PATH=$(npm root -g) node page.js <unit folder>
   A. every key typed (or tapped) on three sets scores N / N first try;
   B. the Apple-review flows: Cancel closes the confirm; the same answer again is not another try; focus after Hint,
      Show me how, Try another, a right answer (Next) and Close; Show this step after two misses; Finish marks typed but
      unchecked answers; results buttons practise in "Check as I go"; test mode says only "can't read this yet";
      tap targets; the keypad is not a tab stop; a bad link does not open another set; no page errors. */
const path = require('path');
const { chromium } = require('playwright');
const dir = path.resolve(process.argv[2] || '.'), U = require(path.join(dir, 'unit.js'));
/* served over http (as on Google Sites), so the browser behaves as it will for students: storage events between tabs, etc. */
const http = require('http'), fs = require('fs');
const server = http.createServer((q, r) => { if (/^\/api\/items\//.test(q.url)) { r.writeHead(200, { 'Content-Type': 'application/json' }); return r.end('{"edits":[],"custom":[],"v":""}'); }   /* the site's edits (edits.js): none, as the site answers a unit without any */ let f = path.join(dir, decodeURIComponent(q.url.split('?')[0].split('#')[0])); if (f.endsWith(path.sep)) f = path.join(f, 'index.html');   /* a folder serves its index.html, as the site does */ if (!f.startsWith(dir) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); fs.createReadStream(f).pipe(r); });
let url = '';
const fails = []; const fail = m => { fails.push(m); };
function itemsOf(seed) {
  const g = U.generate(seed), out = []; let qn = 0;
  g.sections.forEach((sec, si) => sec.items.forEach((it, ii) => { qn++;
    if (it.type === 'parts') it.parts.forEach((p, pi) => out.push({ id: qn + p.label, kind: p.kind === 'mc' ? 'mc' : p.kind === 'nline' ? 'nline' : 'text', x: p, pos: si + '.' + ii + '.' + pi }));
    else if (it.type === 'solo') out.push({ id: String(qn), kind: it.part.kind === 'nline' ? 'nline' : 'text', x: it.part, pos: si + '.' + ii + '.-1' });
    else out.push({ id: String(qn), kind: it.type === 'multi' ? 'multi' : 'mc', x: it, pos: si + '.' + ii + '.-1' });
  }));
  return out;
}
/* a graph the student builds (kit kind nline, 7 Nov 2026): the point by the keyboard (Home, then → a step at a time), the dot
   and the arrow by their own buttons — the way a student without a mouse does it */
const NLK = require('../nline.js');
async function nlFill(p, id, part, g) {
  const Sp = NLK.spec(part), i = NLK.idx(Sp, g.c);
  await p.focus('#nlp' + id); await p.keyboard.press('Home'); for (let k = 0; k < i; k++) await p.keyboard.press('ArrowRight');
  if (g.closed != null) await p.click('[data-nl="' + id + '"][data-nld="' + (g.closed ? 'closed' : 'open') + '"]');
  if (g.dir) await p.click('[data-nl="' + id + '"][data-nla="' + g.dir + '"]');
}
const nlWrong = part => { const Sp = NLK.spec(part), g = NLK.graphOf(part), i = NLK.idx(Sp, g.c); return { c: NLK.kstr(NLK.val(Sp, i < Sp.n ? i + 1 : i - 1)), closed: g.closed, dir: g.dir }; };
/* a wrong answer of any kind: 987654 typed, a graph one tick off, the first choice */
async function wrongOf(p, it) {
  if (it.kind === 'text') await p.fill('#a' + it.id, '987654');
  else if (it.kind === 'nline') await nlFill(p, it.id, it.x, nlWrong(it.x));
  else await p.evaluate(id => { const x = document.querySelector('input[name="q' + id + '"]'); if (x) x.click(); }, it.id);
}
async function answer(p, it) {
  if (it.kind === 'nline') return nlFill(p, it.id, it.x, NLK.graphOf(it.x));
  if (it.kind === 'text') await p.fill('#a' + it.id, U.keyText(it.x));
  else for (const k of (it.kind === 'mc' ? [it.x.correct] : it.x.correct)) await p.evaluate(([q, k]) => document.querySelector('input[name="q' + q + '"][value="' + k + '"]').click(), [it.id, k]);
}
const check = (p, id) => p.evaluate(id => document.querySelector('[data-check="' + id + '"]').click(), id);
const state = (p, seed) => p.evaluate(([pre, seed]) => JSON.parse(localStorage.getItem(pre + 'set.' + seed + '.all') || 'null'), [U.id + '.', seed]);
const active = p => p.evaluate(() => { const a = document.activeElement; return a ? (a.id || '') + '|' + (a.className || '') + '|' + (a.dataset ? JSON.stringify(a.dataset) : '') : ''; });
/* Print, what to practice and the set number live in the ⋯ menu (7 Nov 2026, the site review): a student opens it first, so
   the check does too — every flow below that touches them is the same flow, one tap deeper */
async function more(p) { if (await p.isHidden('#mMenu')) await p.click('#bMore'); }
/* the help ladder (7 Nov 2026): Hint 1, Hint 2, Hint 3 — each a button that opens the next; rungTo opens them up to n */
async function rungTo(p, id, n) { for (let k = 1; k <= n; k++) await p.evaluate(([id, k]) => { const b = document.querySelector('[data-rung="' + id + '"][data-to="' + k + '"]'); if (b) b.click(); }, [id, k]); }
async function fresh(p, seed) { await p.goto(url + '#set-' + seed); await p.evaluate(() => { try { localStorage.clear(); } catch (e) {} }); await p.goto(url + '#set-' + seed); await p.reload(); await p.waitForTimeout(150); }

(async () => {
  await new Promise(res => server.listen(0, '127.0.0.1', res)); url = 'http://127.0.0.1:' + server.address().port + '/preview.html';
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }), p = await ctx.newPage();
  /* KaTeX is inlined by the build; the CDN route stays only so a page built without it still checks offline */
  const VEND = path.join(__dirname, '..', 'vendor', 'katex');
  await ctx.route('https://cdnjs.cloudflare.com/**', route => { const u = route.request().url(); const f = /katex\.min\.js$/.test(u) ? 'katex.min.js' : /katex\.min\.css$/.test(u) ? 'katex.min.css' : null;
    if (f) route.fulfill({ status: 200, contentType: f.endsWith('.js') ? 'application/javascript' : 'text/css', headers: { 'access-control-allow-origin': '*' }, body: fs.readFileSync(path.join(VEND, f)) }); else route.fulfill({ status: 404, body: '' }); });
  const netAsked = []; ctx.on('request', r => { const u = r.url(); if (!/^(http:\/\/127\.0\.0\.1|data:|blob:|about:)/.test(u)) netAsked.push(u); });   /* nothing from the network: the page is an artifact and a download too (7 Nov 2026) */
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/fonts|ERR_TUNNEL|net::/.test(m.text())) errs.push(m.text()); });

  /* the line under the title is the unit's notes and nothing else — hidden when there are none (Croix, 21 Oct 2026: "eliminate
     the little texts that you do in the menu like (Same kinds of questions as the unit test, new numbers every set.)") */
  { if (U.intro) fail('unit.js still has an intro: the page no longer shows one (kit README, the unit interface)');
    await fresh(p, 11);
    const ln = await p.evaluate(() => { const e = document.getElementById('intro'); return { hidden: !e || e.hidden || getComputedStyle(e).display === 'none',
      notes: e ? e.querySelectorAll('.pinote').length : 0, other: e ? Array.from(e.childNodes).filter(n => !(n.nodeType === 1 && n.classList.contains('pinote'))).length : 0 }; });
    const want = (U.notes || []).length;
    if (ln.notes !== want || ln.other) fail('the line under the title is not just the unit’s ' + want + ' notes: ' + JSON.stringify(ln));
    if (ln.hidden === !!want) fail('the line under the title is ' + (ln.hidden ? 'hidden with notes to show' : 'showing with nothing in it'));
    const miss = await p.$eval('#scope option[value="miss"]', o => o.textContent);   /* and no aside in the menu: no "(none yet)" */
    if (miss !== 'My misses, with new numbers') fail('with no misses yet the practice menu says "' + miss + '"'); }

  /* A. every key */
  for (const seed of [11, 4821, 99999]) {
    await fresh(p, seed);
    const its = itemsOf(seed);
    for (const it of its) { await answer(p, it); await check(p, it.id); }
    const sc = await p.$eval('#score', e => e.textContent);
    if (!new RegExp('^' + its.length + ' earned').test(sc) || !new RegExp(its.length + ' of ' + its.length + ' done').test(sc)) fail('set ' + seed + ': typed keys scored "' + sc + '"');
    const notRight = await p.evaluate(() => Array.from(document.querySelectorAll('.fb')).filter(f => f.innerText && !/Correct/.test(f.innerText)).map(f => f.id));
    if (notRight.length) fail('set ' + seed + ': not marked right: ' + notRight.join(' '));
    const secs = await p.$$eval('.pts', es => es.map(e => e.textContent)); if (!secs.every(t => /✓$/.test(t))) fail('section counts not complete: ' + secs.join(' | '));
  }
  console.log('A. keys typed back on 3 sets');

  /* B. flows */
  const seed = 777, its = itemsOf(seed), T = its.filter(i => i.kind === 'text'), M = its.filter(i => i.kind === 'mc');
  await fresh(p, seed);
  /* 1. Cancel closes the confirm; the bar's buttons come back */
  await p.fill('#a' + T[0].id, '1'); await p.click('#bFinish');
  if (!(await p.isVisible('#confirm'))) fail('confirm did not open');
  if (await p.isVisible('#bFinish')) fail('two Finish buttons on screen while confirming');
  await p.click('#cn');
  if (await p.isVisible('#confirm')) fail('Keep working did not close the confirm');
  if (!(await p.isVisible('#bFinish'))) fail('Finish did not come back after Keep working');
  /* 2. the same wrong answer again is not another try */
  await p.fill('#a' + T[0].id, '987654'); for (let k = 0; k < 3; k++) await p.press('#a' + T[0].id, 'Enter');
  let S = await state(p, seed); if (!S || S.res[T[0].id].tries !== 1) fail('Enter ×3 on one answer counted ' + (S && S.res[T[0].id].tries) + ' tries');
  /* 2b. after a wrong answer: the explanation, then exactly two buttons — "Try a similar one" (a fresh one, never the same
     numbers) and "Move on"; nothing is added to the set, however many misses (7 Nov 2026, item 2) */
  { const id = T[0].id, q0 = await p.$$eval('#paper .q[data-q]:not(.xq)', e => e.length), t0 = await p.$eval('#total', e => e.textContent);
    const btns = await p.$$eval('#mo' + id + ' button', es => es.map(e => e.textContent.trim()));
    if (JSON.stringify(btns) !== JSON.stringify(['Try a similar one', 'Move on'])) fail('after a wrong answer the buttons are ' + JSON.stringify(btns) + ', not exactly "Try a similar one" and "Move on"');
    const card = await p.$eval('#fb' + id, e => e.innerText.replace(/\s+/g, ' ').trim());
    if (!/^✗ Not yet \S/.test(card)) fail('after a wrong answer the card does not explain: "' + card.slice(0, 80) + '"');
    if (/Next time:/.test(card)) fail('the wrong card still carries "Next time:" (it is Hint 1 now)');
    if (/usual slips|rule below/.test(card)) fail('the wrong card says "' + card.slice(0, 80) + '" — when nothing names the mistake it is "Look at:" with Hint 1');
    if (!(await p.$('#mo' + id + ' [data-another].go'))) fail('"Try a similar one" is not the primary after a miss');
    const nx = T.find((x, k) => k > 0); await p.click('#mo' + id + ' [data-moveon]'); await p.waitForTimeout(60);
    { const a = await active(p); if (a.split('|')[0] !== 'a' + nx.id && a.split('|')[0] !== '') { const firstOpen = await p.evaluate(() => { const i = document.activeElement; return i && i.id; }); if (!/^a/.test(firstOpen || '')) fail('Move on: focus is ' + a); } }
    /* three fresh ones in a row: each new numbers, each in the question's own box, the set the same size */
    const keys = [U.key(itemsOf(seed).find(x => x.id === id).x)];
    for (let r = 1; r <= 3; r++) {
      await p.click('[data-another="' + id + '"]'); await p.waitForTimeout(40);
      const st = await state(p, seed), m = st.more[id], g = U.generate(m.seed), q = T[0].pos.split('.').map(Number), it = g.sections[q[0]].items[q[1]], pt = it.type === 'parts' ? it.parts[q[2]] : it.type === 'solo' ? it.part : it;
      const k = U.key(pt); if (keys.indexOf(k) >= 0) fail('"Try a similar one" served the same numbers again (round ' + r + ')'); keys.push(k);
      await p.fill('#a' + id + 'x' + m.n, '987654'); await check(p, id + 'x' + m.n);
      const xb = await p.$$eval('#mo' + id + 'x' + m.n + ' button', es => es.map(e => e.textContent.trim())); if (JSON.stringify(xb) !== JSON.stringify(['Try a similar one', 'Move on'])) fail('a fresh one answered wrong offers ' + JSON.stringify(xb));
      const boxes = await p.$$eval('#ag' + id + ' .xq', e => e.length); if (boxes !== 1) fail('the question\'s box holds ' + boxes + ' fresh ones after ' + r + ' (a penalty question?)');
    }
    const q1 = await p.$$eval('#paper .q[data-q]:not(.xq)', e => e.length), t1 = await p.$eval('#total', e => e.textContent);
    if (q1 !== q0 || t1 !== t0) fail('wrong answers grew the set: ' + q0 + ' → ' + q1 + ' questions, "' + t0 + '" → "' + t1 + '"'); }
  /* 3. the ladder: each rung a button that opens the next, the rungs opened stay open, focus goes to the new rung; the last
     is the worked solution, one step per line with a rule between, ending in the answer (7 Nov 2026, item 1) */
  { const id = T[0].id, sol = U.solution(T[0].x, 'text', {}) || [];
    if (!(await p.$('#hs' + id + ' [data-rung][data-to="1"]'))) fail('ladder: no Hint beside Check after a wrong answer on ' + id);
    for (let k = 1; k <= 3; k++) {
      await p.click('[data-rung="' + id + '"][data-to="' + k + '"]');
      const a = await active(p); if (a.split('|')[0] !== 'rg' + id + '-' + k) fail('ladder: after Hint ' + k + ' focus is ' + a);
      const open = await p.$$eval('#st' + id + ' .rung', es => es.map(e => e.querySelector('.rung-h').textContent));
      if (open.length !== k) fail('ladder: ' + open.length + ' rungs open after Hint ' + k + ': ' + open.join(' | '));
      const nextB = await p.$('#st' + id + ' .rung-next [data-rung][data-to="' + (k + 1) + '"]'); if (k < 3 && !nextB) fail('ladder: no button for Hint ' + (k + 1) + ' under rung ' + k);
      if (k === 3 && await p.$('#st' + id + ' .rung-next')) fail('ladder: a next-rung button under the last rung');
    }
    const heads = await p.$$eval('#st' + id + ' .rung-h', es => es.map(e => e.textContent));
    if (JSON.stringify(heads) !== JSON.stringify(['Hint 1 · What to notice', 'Hint 2 · The first step', 'Hint 3 · The worked solution'])) fail('ladder headings: ' + heads.join(' | '));
    const r3 = await p.evaluate(id => { const r = document.getElementById('rg' + id + '-3'), lis = r ? Array.from(r.querySelectorAll('ol.sol > li')) : [];
      return { n: lis.length, ruled: lis.slice(1).every(li => parseFloat(getComputedStyle(li).borderTopWidth) > 0), key: !!(r && r.querySelector('.key')), notice: (document.querySelector('#rg' + id + '-1 .rung-note') || {}).textContent || '' }; }, id);
    if (sol.length && r3.n !== sol.length) fail('ladder: rung 3 shows ' + r3.n + ' steps of ' + sol.length);
    if (r3.n > 1 && !r3.ruled) fail('ladder: rung 3\'s steps have no rule between them');
    if (!r3.key) fail('ladder: rung 3 does not end in the answer');
    if (!r3.notice.trim()) fail('ladder: rung 1 is empty');
    const S0 = await state(p, seed); if (!S0.res[id] || S0.res[id].rung !== 3 || !S0.res[id].shown) fail('ladder: the deepest rung is not kept: ' + JSON.stringify(S0.res[id]));
    if (await p.$('[data-all]')) fail('a "Show me how" button is still on the page'); }
  /* 4. Try another: focus in the new question */
  await p.click('[data-another="' + T[0].id + '"]'); { const a = await active(p); if (!/^a\S*x\d+\|/.test(a)) fail('Try a similar one: focus is ' + a); }
  /* 4b. Try another after a choice question got right on a later try: the new one's choices can be ticked (23 Oct 2026:
     a select-all got right on the second try opened its "another" locked — the right answer's lock reached into the box) */
  { const C = itemsOf(seed).find(x => x.kind === 'mc' || x.kind === 'multi'); if (!C) fail('no choice question to test Try another on');
    else { const wrong = C.kind === 'mc' ? [(C.x.correct + 1) % C.x.opts.length] : [C.x.opts.findIndex((_, k) => !C.x.correct.includes(k))];
      for (const k of wrong) await p.evaluate(([q, k]) => document.querySelector('input[name="q' + q + '"][value="' + k + '"]').click(), [C.id, k]);
      await check(p, C.id); for (const k of wrong) await p.evaluate(([q, k]) => document.querySelector('input[name="q' + q + '"][value="' + k + '"]').click(), [C.id, k]);
      await answer(p, C); await check(p, C.id);
      const fb = await p.$eval('#fb' + C.id, e => e.innerText); if (!/Correct/.test(fb)) fail('choice question ' + C.id + ' not right after the key: ' + fb.slice(0, 60));
      await p.click('[data-another="' + C.id + '"]');
      const locked = await p.$$eval('input[name="q' + C.id + 'x1"]', xs => xs.filter(x => x.disabled).length); if (locked) fail('Try another on ' + C.id + ': ' + locked + ' of the new choices are disabled — the student cannot touch the new question');
      else { await p.click('#ch' + C.id + 'x1A'); const on = await p.$eval('input[name="q' + C.id + 'x1"][value="0"]', x => x.checked); if (!on) fail('Try another on ' + C.id + ': the new choice did not tick'); }
      const still = await p.$$eval('input[name="q' + C.id + '"]', xs => xs.filter(x => !x.disabled).length); if (still) fail('the right answer on ' + C.id + ' no longer locks its own choices'); } }
  /* 5. Hint 2's "Step by step with me" takes focus into the walkthrough; Close gives it back to its button */
  await rungTo(p, T[1].id, 2); await p.click('[data-walk="' + T[1].id + '"]'); { const a = await active(p); if (!/wopt|^wn/.test(a)) fail('Hint: focus is ' + a); }
  const head = await p.$eval('#wl' + T[1].id + ' .wkhead b', e => e.textContent); if (!/^Hint · step 1 of \d+$/.test(head)) fail('Hint heading "' + head + '"');
  await p.click('[data-wclose="' + T[1].id + '"]'); if (!/"walk"/.test(await active(p))) fail('Close: focus is ' + await active(p));
  /* 6. Show this step after two wrong numbers */
  { let found = false;
    for (const it of T.slice(2)) {
      const steps = U.walk(it.x, 'text') || []; const k = steps.findIndex(s => s.type === 'num'); if (k < 0) continue;
      await rungTo(p, it.id, 2); await p.click('[data-walk="' + it.id + '"]');
      for (let j = 0; j < k; j++) { const ok = steps[j].opts.findIndex(o => o.ok); await p.click('[data-wopt="' + it.id + '|' + j + '|' + ok + '"]'); }
      for (let t = 0; t < 2; t++) { await p.fill('#wn' + it.id, '987654'); await p.click('[data-wnum="' + it.id + '"]'); }
      if (!(await p.isVisible('[data-wgive="' + it.id + '"]'))) fail('no "Show this step" after two misses on ' + it.id);
      await p.click('[data-wgive="' + it.id + '"]'); found = true; break;
    }
    if (!found) fail('no walkthrough with a number step to test'); }
  /* 7. a right answer: Next takes the student on, never by itself */
  { const it = T[T.length - 1]; await answer(p, it); await check(p, it.id);
    const a = await active(p); if (!/next/.test(a) && !/"next"/.test(a)) { const nx = await p.$('[data-next="' + it.id + '"]'); if (nx) fail('right answer: focus is ' + a + ', not Next'); } }
  /* 8. tap targets and the keypad */
  await p.focus('#a' + T[2].id);
  const small = await p.evaluate(() => Array.from(document.querySelectorAll('.more button, .chk, .mode button, .keys button, .walk .wclose, #bMore, .hslot button, .rung-next button, .rung-walk button, .nsb button, .nlpt')).filter(e => e.offsetParent).map(e => [e.textContent, Math.round(e.getBoundingClientRect().height)]).filter(x => x[1] < 44));
  if (small.length) fail('tap targets under 44px: ' + JSON.stringify(small.slice(0, 5)));
  const tabbable = await p.evaluate(() => Array.from(document.querySelectorAll('.keys button')).filter(b => b.tabIndex >= 0).length); if (tabbable) fail(tabbable + ' keypad keys are tab stops');
  /* 9. Finish marks a typed answer that was never checked */
  await fresh(p, 778); { const i2 = itemsOf(778).filter(i => i.kind === 'text')[0]; await answer(p, i2); await p.click('#bFinish'); await p.click('#cy');
    const big = await p.$eval('.big b', e => e.textContent); if (!/^1\D/.test(big)) fail('Finish ignored a typed, unchecked right answer: ' + big);
    if (!(await p.isVisible('#result'))) fail('no results after Finish'); }
  /* 9b. the point comes from one on your own (24 Oct 2026): help never earns it, a fresh one solved unaided does; a miss
     clears after two in a row; a blank at Finish is a miss */
  await fresh(p, 781); { const tx = itemsOf(781).filter(i => i.kind === 'text'), [A, B, Cc, Dd, E5] = tx;
    const store = k => p.evaluate(([pre, k]) => JSON.parse(localStorage.getItem(pre + k) || 'null'), [U.id + '.', k]);
    const bar = () => p.$eval('#score', e => e.textContent);
    const resOf = async id => (await state(p, 781)).res[id] || {};
    const fillExtra = async (it, n) => { const m = (await state(p, 781)).more[it.id], g = U.generate(m.seed), q = it.pos.split('.').map(Number);
      const item = g.sections[q[0]].items[q[1]], pt = item.type === 'parts' ? item.parts[q[2]] : item.type === 'solo' ? item.part : item;
      await p.fill('#a' + it.id + 'x' + n, U.keyText(pt)); };
    /* 1. right on the first check, no help → earned and first try */
    await answer(p, A); await check(p, A.id); let R = await resOf(A.id);
    if (!(R.earned === true && R.first === true && !R.helped)) fail('unaided first check: earned/first/helped = ' + [R.earned, R.first, R.helped]);
    if (!/^1 earned/.test(await bar())) fail('bar after one unaided point: ' + await bar());
    /* 6. Show me how after the point: still earned */
    await p.click('[data-rung="' + A.id + '"][data-to="3"]'); R = await resOf(A.id); if (R.earned !== true || R.shown) fail('the worked solution after the point revoked it');
    /* 2. Hint, close it, the key on the first check → not earned, the fresh one offered first */
    await rungTo(p, B.id, 1); await answer(p, B); await check(p, B.id); R = await resOf(B.id);
    if (!(R.earned === false && R.first === true && R.helped === true)) fail('hinted first check: earned/first/helped = ' + [R.earned, R.first, R.helped]);
    if (R.rungFirst !== 1) fail('the rung open at the first check is not kept: ' + R.rungFirst);
    if (!/^1 earned/.test(await bar())) fail('bar after a hinted point: ' + await bar());
    const fbB = await p.$eval('#fb' + B.id, e => e.textContent); if (!/One on your own earns the point/.test(fbB) || /first try/.test(fbB)) fail('hinted right card: ' + fbB);
    if (!(await p.$('[data-another="' + B.id + '"].go'))) fail('after help, Try another is not the primary button');
    if ((await p.$$('#mo' + B.id + ' button.go')).length !== 1) fail('a hinted right answer should have exactly one primary button');
    /* 3. the fresh one right on its first check, no help → the base question's point; the original first try unchanged */
    await p.click('[data-another="' + B.id + '"]'); await fillExtra(B, 1); await check(p, B.id + 'x1'); R = await resOf(B.id); const X = await resOf(B.id + 'x1');
    if (!(X.first === true && R.earned === true && R.first === true && R.helped === true)) fail('fresh one unaided: base earned/first/helped = ' + [R.earned, R.first, R.helped] + ', extra first ' + X.first);
    if (!/^2 earned/.test(await bar())) fail('bar after the fresh one: ' + await bar());
    if (!/point earned/.test(await p.$eval('#fb' + B.id, e => e.textContent))) fail('base card does not say the point is earned');
    /* 4. a fresh one wrong then right on the same one → nothing; the next fresh one right → the point */
    await rungTo(p, Cc.id, 2); await answer(p, Cc); await check(p, Cc.id);
    await p.click('[data-another="' + Cc.id + '"]'); await p.fill('#a' + Cc.id + 'x1', '987654'); await check(p, Cc.id + 'x1');
    await fillExtra(Cc, 1); await check(p, Cc.id + 'x1'); R = await resOf(Cc.id); if (R.earned) fail('a corrected fresh one earned the point');
    if (!(await p.$('[data-another="' + Cc.id + '"]'))) fail('after a wrong fresh one, no way to the next fresh one');
    await p.click('[data-another="' + Cc.id + '"]'); await fillExtra(Cc, 2); await check(p, Cc.id + 'x2'); R = await resOf(Cc.id); if (!R.earned) fail('the next fresh one, right unaided, did not earn the point');
    if (!/^3 earned/.test(await bar())) fail('bar: ' + await bar());
    /* 9. a miss clears after two in a row, not one; a wrong one resets the count */
    await p.fill('#a' + Dd.id, '987654'); await check(p, Dd.id); let ms = await store('misses'); if (!ms || !ms[Dd.pos]) fail('a wrong first check is not on My misses');
    await p.click('[data-another="' + Dd.id + '"]'); await fillExtra(Dd, 1); await check(p, Dd.id + 'x1'); ms = await store('misses'); if (!ms[Dd.pos]) fail('one in a row cleared the miss');
    await p.click('[data-another="' + Dd.id + '"]'); await p.fill('#a' + Dd.id + 'x2', '987654'); await check(p, Dd.id + 'x2'); const st = await store('streaks'); if (st && st[Dd.pos]) fail('a wrong fresh one did not reset the count');
    await p.click('[data-another="' + Dd.id + '"]'); await fillExtra(Dd, 3); await check(p, Dd.id + 'x3');
    await p.click('[data-another="' + Dd.id + '"]'); await fillExtra(Dd, 4); await check(p, Dd.id + 'x4'); ms = await store('misses'); if (ms[Dd.pos]) fail('two in a row did not clear the miss');
    R = await resOf(Dd.id); if (!(R.earned === true && R.first === false)) fail('after two fresh ones: earned/first = ' + [R.earned, R.first]);
    /* the run: two fresh ones in a row on your own show in the bar, and a first run is the device's record */
    if (!/✓✓ 2 in a row/.test(await bar())) fail('bar after two in a row: ' + await bar());
    const xs = await p.$eval('#xs' + Dd.id + 'x4', e => e.textContent); if (!/2 in a row/.test(xs)) fail('the fresh one\'s own count after two: ' + xs);
    /* 10. a blank at Finish (Check as I go) is on My misses; the end panel leads with the points earned */
    await p.click('#bFinish'); await p.click('#cy'); await p.waitForTimeout(100); ms = await store('misses'); if (!ms[E5.pos]) fail('a blank at Finish is not on My misses');
    R = await resOf(E5.id); if (!(R.skipped && R.first === false && !R.earned)) fail('a blank at Finish: skipped/first/earned = ' + [R.skipped, R.first, R.earned]);
    const big = await p.$eval('.big b', e => e.textContent); if (!/^4\D/.test(big)) fail('end panel leads with ' + big + ', not the 4 points earned');
    if (!/Best run this set: 2 in a row — a new record/.test(await p.$eval('#result', e => e.textContent))) fail('end panel has no best run line');
    const rec = await store('record'); if (!rec || rec.n !== 2) fail('the record run was not kept: ' + JSON.stringify(rec));
    const ft = await p.$eval('#result', e => e.textContent); if (!/Right on the first try: 3 \/ /.test(ft)) fail('end panel first-try line: ' + (ft.match(/Right on the first try.{0,12}/) || [''])[0]);
    { const ef = await p.$eval('#result .effort', e => e.textContent).catch(() => ''); if (!/Solved without help: 2 · With a hint: 2 · Saw the solution: 0/.test(ef)) fail('end panel effort line: "' + ef + '" (A on its own, B and C with a hint, D on its own by its fresh ones)'); }
    /* item 5: a chip per section — Secure ≥ 80% right on the first check with no help, Getting there ≥ 50%, else Not yet — as
       a word and an icon, not colour alone */
    { const st = await state(p, 781), its = itemsOf(781), g = U.generate(781), want = g.sections.map((sec, si) => { const mine = its.filter(i => +i.pos.split('.')[0] === si), al = mine.filter(i => { const R = st.res[i.id]; return R && R.first === true && !R.helped; }).length, pc = mine.length ? al / mine.length : 0; return pc >= 0.8 ? 'Secure' : pc >= 0.5 ? 'Getting there' : 'Not yet'; });
      const chips = await p.$$eval('#result .skills .chip', es => es.map(e => ({ word: (e.querySelector('.cl2') || {}).textContent, icon: (e.querySelector('svg.ci') || { innerHTML: '' }).innerHTML.length, title: (e.querySelector('.cs') || {}).textContent })));
      if (JSON.stringify(chips.map(c => c.word)) !== JSON.stringify(want)) fail('end panel chips ' + JSON.stringify(chips.map(c => c.word)) + ', expected ' + JSON.stringify(want));
      if (chips.some(c => !c.icon || !c.title)) fail('a chip without its icon or its section: ' + JSON.stringify(chips)); }
    const nf = Object.entries((await state(p, 781)).res).filter(([k, r]) => !/x\d+$/.test(k) && r.first === true).length; if (nf !== 3) fail('first-try count ' + nf + ', expected 3 (A, B and C were right on their first check)'); }
  /* 10. test mode: only "can't read this yet"; results' buttons practise with checking */
  await fresh(p, 779); await p.click('.mode button[data-mode="test"]');
  { const i3 = itemsOf(779).filter(i => i.kind === 'text')[0]; await p.fill('#a' + i3.id, '((3'); await p.focus('#bFinish');
    const rd = await p.$eval('#rd' + i3.id, e => e.textContent); if (!/^Can’t read this yet/.test(rd)) fail('test mode: no "can’t read this yet" (' + rd + ')');
    const fb = await p.$eval('#fb' + i3.id, e => e.textContent); if (/Correct|Not yet/.test(fb)) fail('test mode shows a verdict before Finish');
    await p.fill('#a' + i3.id, '987654'); await p.press('#a' + i3.id, 'Enter'); await p.waitForTimeout(40);
    if (await p.$('#paper [data-another], #paper [data-moveon], #paper [data-rung]')) fail('test mode: help or "Try a similar one" before Finish');
    await p.click('#bFinish'); await p.click('#cy'); await p.waitForTimeout(100);
    await p.click('#result button[data-new]'); await p.waitForTimeout(200);
    const mode = await p.$eval('.mode button[aria-pressed="true"]', e => e.dataset.mode); if (mode !== 'practice') fail('results button opened in ' + mode + ' mode'); }
  /* 12. every Show me how on a set, and every Hint's first step: no "null", "undefined" or "NaN" anywhere a student can read */
  await fresh(p, 780);
  { const i5 = itemsOf(780);
    for (const it of i5) { await wrongOf(p, it); await check(p, it.id);
      await rungTo(p, it.id, 3); }
    const txt = await p.evaluate(() => document.getElementById('paper').innerText);
    const m = /\b(null|undefined|NaN)\b/.exec(txt); if (m) fail('"' + m[1] + '" on the page: …' + txt.slice(Math.max(0, m.index - 80), m.index + 20).replace(/\s+/g, ' ')); }
  /* 13. a new set never says it "was updated" */
  await more(p); await p.click('details.setbox summary'); await p.click('#bNew'); await p.waitForTimeout(150);
  if (await p.isVisible('#notice')) fail('a new set says: ' + await p.$eval('#notice', e => e.textContent));
  /* 14. the keypad never moves the box being tapped (at the top of the page too) */
  await fresh(p, 781); { const tt = itemsOf(781).filter(i => i.kind === 'text');
    await p.evaluate(() => window.scrollTo(0, 0)); await p.evaluate(id => document.getElementById('a' + id).focus({ preventScroll: true }), tt[0].id);
    const y0 = await p.$eval('#a' + tt[1].id, e => e.getBoundingClientRect().top); await p.evaluate(id => document.getElementById('a' + id).focus({ preventScroll: true }), tt[1].id);
    const y1 = await p.$eval('#a' + tt[1].id, e => e.getBoundingClientRect().top); if (Math.abs(y1 - y0) > 2) fail('the keypad moved the next box by ' + Math.round(y1 - y0) + 'px'); }
  /* 15. two tabs on one set: quiet until one of them changes something, then the other follows once */
  { const p2 = await p.context().newPage(); await p2.goto(url + '#set-781'); await p2.waitForTimeout(300);
    await p2.evaluate(() => { window.__renders = 0; new MutationObserver(() => window.__renders++).observe(document.getElementById('paper'), { childList: true }); });
    await p.waitForTimeout(1500); let r = await p2.evaluate(() => window.__renders); if (r > 0) fail('second tab re-rendered ' + r + ' times while nothing happened');
    const tt = itemsOf(781).filter(i => i.kind === 'text'); await answer(p, tt[0]); await check(p, tt[0].id); await p2.waitForTimeout(600);
    r = await p2.evaluate(() => window.__renders); if (r < 1 || r > 3) fail('second tab re-rendered ' + r + ' times after one check in the first');
    await p2.waitForTimeout(1200); const r2 = await p2.evaluate(() => window.__renders); if (r2 !== r) fail('the two tabs keep re-rendering (' + r2 + ')');
    await p2.close(); }
  /* 16. print in dark mode is dark ink on white */
  await p.emulateMedia({ media: 'print', colorScheme: 'dark' });
  { const c = await p.$eval('#h1', e => getComputedStyle(e).color); const v = c.match(/\d+/g).slice(0, 3).map(Number); if (v[0] + v[1] + v[2] > 200) fail('dark-mode print: the title prints in ' + c); }
  await p.emulateMedia({ media: 'screen', colorScheme: 'light' });
  /* 11. a bad link does not open another set */
  await p.goto(url + '#set-123456'); await p.waitForTimeout(150); { const n = await p.$eval('#setno', e => e.textContent); if (n === '12345') fail('#set-123456 opened set 12345'); }
  /* C. the second language (kit/bilingual.js), when the unit has one: off by default and then the page is exactly the
     English page; on, every block of English has its translation underneath, through every flow, with the same numbers;
     the page's math and marking are untouched; the choice is remembered; off again removes every line. */
  if (U.second) {
    const biNums = h => (String(h).replace(/<svg[\s\S]*?<\/svg>/g, ' ').replace(/<[^>]*>/g, ' ').match(/\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?/g) || []);
    const biAudit = async (where) => {
      const r = await p.evaluate(() => {
        const out = { missing: Object.keys(window.__biMissing || {}), bad: [], nums: [], ids: [], blank: [] };
        document.querySelectorAll('.tr').forEach(t => {
          if (/\b(null|undefined|NaN)\b/.test(t.textContent)) out.bad.push(t.textContent.slice(0, 80));
          if (!t.textContent.trim()) out.blank.push(t.parentNode.className);
          const host = t.parentNode, en = host.cloneNode(true); en.querySelectorAll('.tr').forEach(x => x.remove());
          out.nums.push([en.innerHTML, t.innerHTML]);
        });
        const seen = {}; document.querySelectorAll('[id]').forEach(e => { if (seen[e.id]) out.ids.push(e.id); seen[e.id] = 1; });
        return out; });
      if (r.missing.length) fail(where + ': no Portuguese for ' + r.missing.length + ': ' + r.missing.slice(0, 6).map(x => '"' + x.replace(/\s+/g, ' ').slice(0, 120) + '"').join(' | '));
      if (r.bad.length) fail(where + ': "null/undefined/NaN" in the Portuguese: ' + r.bad[0]);
      if (r.blank.length) fail(where + ': an empty Portuguese line under ' + r.blank[0]);
      if (r.ids.length) fail(where + ': duplicate ids ' + r.ids.slice(0, 5).join(' '));
      for (const [en, pt] of r.nums) { const a = new Set(biNums(en)), b = new Set(biNums(pt)); if ([...a].some(x => !b.has(x)) || [...b].some(x => !a.has(x))) { fail(where + ': numbers differ — EN "' + en.replace(/<[^>]*>/g, '').slice(0, 100) + '" PT "' + pt.replace(/<[^>]*>/g, '').slice(0, 100) + '"'); break; } }
      return r.nums.length;
    };
    await fresh(p, 790);
    if (await p.$$eval('.tr', e => e.length)) fail('second language: lines shown before the toggle is on');
    const tog = await p.$('.bi-toggle'); if (!tog) fail('second language: no toggle'); else {
      if ((await tog.boundingBox()).height < 44) fail('second language: toggle under 44px');
      const en0 = await p.evaluate(() => document.body.innerText);
      await tog.click(); await p.waitForTimeout(100);
      if (await tog.getAttribute('aria-pressed') !== 'true') fail('second language: toggle not pressed after a tap');
      const lang = await p.$eval('.tr', e => e.getAttribute('lang')); if (lang !== U.second.code) fail('second language: lang="' + lang + '"');
      /* every question line, every choice, every section and button on the sheet has its line */
      const bare = await p.evaluate((names) => Array.from(document.querySelectorAll('.stem .st, .line .st, .cv, .sechead h2, #paper button')).filter(e => e.offsetParent && /[A-Za-z]{3}/.test(e.textContent.replace(new RegExp('\\b(?:' + names.join('|') + ')\\b', 'g'), '')) && !e.querySelector('.tr')).map(e => e.textContent.slice(0, 60)), U.second.names || []);
      if (bare.length) fail('second language: no line under ' + bare.length + ': ' + bare.slice(0, 4).join(' | '));
      await biAudit('the sheet');
      /* off again: the page is the English page, to the letter */
      await tog.click(); await p.waitForTimeout(100);
      if (await p.$$eval('.tr', e => e.length)) fail('second language: lines left after turning it off');
      if (await p.evaluate(() => document.body.innerText) !== en0) fail('second language: the English page changed after on → off');
      await tog.click(); await p.waitForTimeout(100);
      /* remembered */
      await p.reload(); await p.waitForTimeout(200);
      if (await p.$eval('.bi-toggle', e => e.getAttribute('aria-pressed')) !== 'true' || !(await p.$$eval('.tr', e => e.length))) fail('second language: not remembered after a reload');
      /* every flow with it on: wrong answers and their feedback, Hint (wrong choice, two wrong numbers, Show this step), Show me how,
         pictures, Try another, a right answer, Finish, the results, the confirm, test mode and its "can't read", the misses menu */
      const its = itemsOf(790), TT = its.filter(i => i.kind === 'text'), MM = its.filter(i => i.kind === 'mc');
      for (const it of its) { if (it.kind === 'text' || it.kind === 'nline') await wrongOf(p, it); else await p.evaluate(([id, c]) => { const x = document.querySelector('input[name="q' + id + '"][value="' + ((c + 1) % 3) + '"]') || document.querySelector('input[name="q' + id + '"]'); x.click(); }, [it.id, it.x.correct]); await check(p, it.id); }
      for (const it of TT.slice(0, 6)) {
        const steps = U.walk(it.x, 'text') || []; if (!steps.length) continue;
        await rungTo(p, it.id, 2); await p.click('[data-walk="' + it.id + '"]');
        for (let j = 0; j < steps.length; j++) {
          if (steps[j].type === 'choice') { const bad = steps[j].opts.findIndex(o => !o.ok), ok = steps[j].opts.findIndex(o => o.ok); if (bad >= 0) await p.click('[data-wopt="' + it.id + '|' + j + '|' + bad + '"]'); await p.click('[data-wopt="' + it.id + '|' + j + '|' + ok + '"]'); }
          else { for (let t = 0; t < 2; t++) { await p.fill('#wn' + it.id, '987654'); await p.click('[data-wnum="' + it.id + '"]'); } await p.fill('#wn' + it.id, 'abc'); await p.click('[data-wnum="' + it.id + '"]'); await p.click('[data-wgive="' + it.id + '"]'); }
        }
      }
      await biAudit('hints');
      for (const it of its) await rungTo(p, it.id, 3);
      await biAudit('the ladder');
      await p.click('[data-another="' + TT[0].id + '"]'); await p.waitForTimeout(80);
      for (const it of [TT[1], MM[0]].filter(Boolean)) { await answer(p, it); await check(p, it.id); }
      await p.click('#bFinish'); await biAudit('the confirm'); await p.click('#cy'); await p.waitForTimeout(100);
      await biAudit('the results');
      await more(p); await p.click('details.setbox summary'); await biAudit('the set box');
      await p.selectOption('#scope', 'p2'); await p.waitForTimeout(100); if (await p.isVisible('#cy')) await p.click('#cy'); await p.waitForTimeout(200);
      await biAudit('one part, two rounds');
      await p.click('.mode button[data-mode="test"]'); if (await p.isVisible('#cy')) await p.click('#cy'); await p.waitForTimeout(100);
      { const t0 = await p.$('#paper input[type=text]'); if (t0) { await t0.fill('((3'); await p.focus('#bFinish'); await p.waitForTimeout(80); } }
      await biAudit('test mode');
      /* typing still works with it on: every key on one set scores N / N */
      await p.click('.mode button[data-mode="practice"]'); if (await p.isVisible('#cy')) await p.click('#cy');
      await p.goto(url + '#set-791'); await p.waitForTimeout(200);
      { const i7 = itemsOf(791); for (const it of i7) { await answer(p, it); await check(p, it.id); }
        const st = await state(p, 791); const n = Object.values(st.res).filter(r => r.first === true).length; if (n !== i7.length) fail('second language on: typed keys scored ' + n + ' / ' + i7.length); }
      await biAudit('a whole set right');
      /* pair answers typed the Portuguese way: "48 e 18" */
      const pr = itemsOf(792).filter(i => i.x.kind === 'pair')[0];
      if (pr) { await p.goto(url + '#set-792'); await p.waitForTimeout(200); const a = pr.x.pairs[0]; const E = require(fs.existsSync(path.join(dir, 'engine.js')) ? path.join(dir, 'engine.js') : path.join(dir, '..', 'engine.js'));
        await p.fill('#a' + pr.id, E.numStr(a[0]).replace(/,/g, '') + ' e ' + E.numStr(a[1]).replace(/,/g, '')); await check(p, pr.id);
        const st = await state(p, 792); if (!st.res[pr.id] || st.res[pr.id].v !== 'right') fail('"a e b" not marked right on the page'); }
      await p.click('.bi-toggle'); await p.waitForTimeout(80); if (await p.$$eval('.tr', e => e.length)) fail('second language: lines left after turning it off (end)');
    }
    console.log('C. second language checked');
  }
  /* D. print: the worksheet is this set (the same stems, every part has its blank or its choices), the key is the key the
     page marks with, the results are this student's, only the printout goes to paper, Close gives the page back. */
  { const seedP = 793, ip = itemsOf(seedP), V = U.view, ENT = { nbsp: ' ', lt: '<', gt: '>', quot: '"', apos: "'", amp: '&' };
    /* a choice's words as the page shows them: tags out, entities decoded (A7 Unit 6, 25 Oct 2026: "4 &lt; x &lt; 14" is
       "4 < x < 14" on paper, and the check failed a correct key) */
    const txt = h => String(h).replace(/<[^>]*>/g, '').replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => e[0] === '#' ? String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : +e.slice(1)) : (ENT[e.toLowerCase()] ?? m)).replace(/\s+/g, ' ').trim();
    await fresh(p, seedP);
    const screenStems = await p.$$eval('.sheet .stem .st', es => es.map(e => e.textContent.replace(/\s+/g, ' ').trim()));
    /* item 6: every question card has its speakable ID, "U9·3" in the whole test's order, and it prints on paper too */
    const UN = (/u(\d+)$/.exec(U.id) || [])[1], screenIds = await p.$$eval('#paper .q[data-q]:not(.xq) > .qid .qn', es => es.map(e => e.textContent));
    const nQ = U.generate(seedP).sections.reduce((t, s0) => t + s0.items.length, 0);
    if (JSON.stringify(screenIds) !== JSON.stringify(Array.from({ length: nQ }, (_, k) => 'U' + UN + '·' + (k + 1)))) fail('IDs on the cards: ' + screenIds.slice(0, 5).join(' ') + '… for ' + nQ + ' questions');
    { const r = await p.evaluate(() => { const q = document.querySelector('#paper .q[data-q] > .qid'), b = q.getBoundingClientRect(), c = q.parentNode.getBoundingClientRect(); return { right: Math.round(c.right - b.right), top: Math.round(b.top - c.top) }; });
      if (r.right > 2 || r.top > 4) fail('the ID is not at the top right of its card: ' + JSON.stringify(r)); }
    await p.emulateMedia({ media: 'print' }); { const d = await p.$eval('#paper .q[data-q] > .qid', e => getComputedStyle(e).display); if (d === 'none') fail('the IDs are hidden when the page itself is printed'); } await p.emulateMedia({ media: 'screen' });
    await more(p); await p.click('#bPrint'); if (!(await p.isVisible('[data-print="wk"]'))) fail('print: no choice after Print');
    await p.click('[data-print="wk"]'); await p.waitForTimeout(100);
    const pr = await p.evaluate(() => ({ stems: Array.from(document.querySelectorAll('#printview .pq .stem .st')).map(e => e.textContent.replace(/\s+/g, ' ').trim()),
      ids: Array.from(document.querySelectorAll('#printview .pq .pqid .qn')).map(e => e.textContent), keyIds: Array.from(document.querySelectorAll('#printview .pkey tr td.pid')).map(e => e.textContent),
      blanks: document.querySelectorAll('#printview .pans').length, groups: document.querySelectorAll('#printview .pchoices').length, lines: document.querySelectorAll('#printview .pnl svg.nlg').length,
      keys: Array.from(document.querySelectorAll('#printview .pkey tr')).map(r => [r.cells[0].textContent.trim(), r.cells[1].textContent.replace(/\s+/g, ' ').trim()]) }));
    if (JSON.stringify(pr.stems) !== JSON.stringify(screenStems)) fail('print: the worksheet questions are not the screen questions');
    if (JSON.stringify(pr.ids) !== JSON.stringify(screenIds)) fail('print: the worksheet IDs ' + pr.ids.slice(0, 4).join(' ') + '… are not the screen\'s');
    { const want = ip.map(it => 'U' + UN + '·' + (+it.id.replace(/\D+$/, '').replace(/\D.*$/, ''))); if (JSON.stringify(pr.keyIds) !== JSON.stringify(want)) fail('print: the key\'s IDs ' + pr.keyIds.slice(0, 4).join(' ') + '… are not its questions\' (' + want.slice(0, 4).join(' ') + '…)'); }
    const nText = ip.filter(i => i.kind === 'text').length, nNl = ip.filter(i => i.kind === 'nline').length, nMc = ip.length - nText - nNl;
    if (pr.blanks !== nText || pr.groups !== nMc || pr.lines !== nNl) fail('print: ' + pr.blanks + ' answer blanks / ' + pr.groups + ' choice lists / ' + pr.lines + ' number lines for ' + nText + ' / ' + nMc + ' / ' + nNl + ' parts');
    if (pr.keys.length !== ip.length) fail('print: the key has ' + pr.keys.length + ' rows for ' + ip.length + ' parts');
    ip.forEach((it, k) => { const want = it.kind === 'text' || it.kind === 'nline' ? txt(V.key(it.x)) : (it.kind === 'mc' ? [it.x.correct] : it.x.correct).map(c => 'ABCDEFGH'[c] + '. ' + txt(V.opt(it.x, c))).join(' ');
      const got = pr.keys[k] ? pr.keys[k][1] : ''; if (got.replace(/\s+/g, '') !== want.replace(/\s+/g, '')) fail('print: key ' + it.id + ' is "' + got + '", the page marks "' + want + '"'); });
    /* make-up tests: on a student page there are none (Croix, 21 Oct 2026: "I don't want the students to be able to print
       the make up tests") — not in the menu, and a forged request prints nothing; on the teacher copy, three forms, each a
       different set; every form's key is that form's own answers (recomputed from the form's set in this browser); the
       page's own set, items and answers are untouched afterwards */
    await p.click('#pvClose');
    const isTeacher = await p.evaluate(() => !!window.TEACHER_TEST);
    if (!isTeacher) {
      await more(p); await p.click('#bPrint');
      const opts = await p.$$eval('[data-print]', es => es.map(e => e.dataset.print));
      if (opts.some(o => /^mk/.test(o))) fail('print: a student page offers make-up tests: ' + opts.join(', '));
      if (['ws', 'wk', 'res'].some(o => opts.indexOf(o) < 0)) fail('print: the student menu is ' + opts.join(', '));
      await p.click('#cn');
      const forged = await p.evaluate(() => { const b = document.createElement('button'); b.dataset.print = 'mk3'; document.body.appendChild(b); b.click(); b.remove();
        const pv = document.getElementById('printview'); return { pv: !!pv && !pv.hidden && pv.innerHTML.length > 0, printing: document.body.classList.contains('printing') }; });
      if (forged.pv || forged.printing) fail('print: a forged make-up request printed on a student page');
    }
    if (isTeacher) {
    await more(p); await p.click('#bPrint'); await p.click('[data-print="mk"]');
    if (!(await p.isVisible('[data-print="mk3"]'))) fail('print: no form count after Make-up tests');
    const before = await p.evaluate(() => ({ h: location.hash, n: document.querySelectorAll('.q').length, first: document.querySelector('.q .stem .st').textContent }));
    await p.click('[data-print="mk3"]'); await p.waitForTimeout(150);
    /* a printed test form (a make-up, or a ruling-49 test) has the paper's shape and no set number: the student page opens any
       set with its worked answers, so the number is on the teacher's key only (A7 Unit 6's review, 25 Oct 2026) */
    const formShape = () => {
      const forms = Array.from(document.querySelectorAll('#printview .pform:not(.pkeyform)')), keys = Array.from(document.querySelectorAll('#printview .pform.pkeyform'));
      return { nf: forms.length, nk: keys.length,
        heads: forms.map(f => f.querySelector('.pt2').textContent.trim()), titles: forms.map(f => f.querySelector('.pt1').textContent.trim()), khead: keys.map(k => k.querySelector('.psec').textContent.trim() + ' ' + k.querySelector('.pmeta').textContent.trim()),
        stems: forms.map(f => Array.from(f.querySelectorAll('.pq .stem .st')).map(e => e.textContent.replace(/\s+/g, ' ').trim())),
        keyrows: keys.map(k => Array.from(k.querySelectorAll('table.pkrows tr')).map(r => r.cells[1].textContent.replace(/\s+/g, ' ').trim())),
        formIds: forms.map(f => Array.from(f.querySelectorAll('.pq .pqid .qn')).map(e => e.textContent)), keyIds: keys.map(k => Array.from(k.querySelectorAll('table.pkrows td.pid')).map(e => e.textContent)),
        names: forms.map(f => f.querySelectorAll('.pname').length),
        sets: forms.map(f => (/\bSet \d/.exec(f.textContent) || [''])[0]),
        answerLines: forms.map(f => f.querySelectorAll('.pans, .pblank').length + (/Answer:/.test(f.textContent) ? 1 : 0)),
        ptLabels: forms.map(f => f.querySelectorAll('.pt').length),
        secPts: forms.map(f => Array.from(f.querySelectorAll('.psec .ppts')).map(e => parseInt(e.textContent, 10))),
        headPts: forms.map(f => (/(\d+) points/.exec(f.querySelector('.pt2').textContent) || [])[1]),
        lines: forms.map(f => Array.from(f.querySelectorAll('.pnotes .pinote')).map(e => e.textContent.replace(/\s+/g, ' ').trim())),
        ft: forms.map(f => Array.from(f.querySelectorAll('.pft')).map(e => e.textContent.replace(/\s+/g, ' ').trim())),
        period: forms.map(f => /class periods?|Stop when the period ends/.test(f.textContent)), oneDay: !!(window.TEACHER_TEST && !window.TEACHER_TEST.two_day),
        tracker: keys.map(k => { const t = k.querySelector('table.ptrack'); if (!t) return null; const rows = Array.from(t.querySelectorAll('tbody tr')); return { n: rows.length, total: rows.length ? parseInt(rows[rows.length - 1].cells[2].textContent, 10) : NaN }; }) };
    };
    const shapeFails = (mk, word) => {
      const nParts = mk.keyrows.map(r => r.length);
      mk.sets.forEach((x, k) => { if (x) fail(word + ': form ' + 'ABCDE'[k] + ' shows its set number ("' + x + '") on the student sheet'); });
      mk.answerLines.forEach((x, k) => { if (x) fail(word + ': form ' + 'ABCDE'[k] + ' prints an answer line (house rule 2: work space, no answer line)'); });
      mk.ptLabels.forEach((x, k) => { if (x !== nParts[k]) fail(word + ': form ' + 'ABCDE'[k] + ' shows ' + x + ' point labels for ' + nParts[k] + ' parts'); });
      mk.secPts.forEach((x, k) => { const sum = x.reduce((a, b) => a + b, 0); if (sum !== nParts[k] || x.some(v => !(v >= 1))) fail(word + ': form ' + 'ABCDE'[k] + ' sections are worth ' + x.join(' + ') + ' for ' + nParts[k] + ' parts'); });
      mk.headPts.forEach((x, k) => { if (+x !== nParts[k]) fail(word + ': form ' + 'ABCDE'[k] + ' is headed ' + x + ' points for ' + nParts[k] + ' parts'); });
      if (mk.oneDay) mk.period.forEach((x, k) => { if (x) fail(word + ': form ' + 'ABCDE'[k] + ' of a one-period test (ruling 51) prints a line about its length'); });
      mk.lines.forEach((ls, k) => { ls.forEach((x, i) => { if (ls.indexOf(x) !== i || mk.ft[k].indexOf(x) >= 0) fail(word + ': form ' + 'ABCDE'[k] + ' prints "' + x.slice(0, 60) + '…" twice'); }); });
      mk.formIds.forEach((ids, k) => { const n = mk.stems[k].length, want = Array.from({ length: n }, (_, j) => 'U' + (/u(\d+)$/.exec(U.id) || [])[1] + '·' + (j + 1)); if (JSON.stringify(ids) !== JSON.stringify(want)) fail(word + ': form ' + 'ABCDE'[k] + ' prints the IDs ' + ids.slice(0, 3).join(' ') + '…'); if (!mk.keyIds[k].length || mk.keyIds[k].some(x => want.indexOf(x) < 0)) fail(word + ': key ' + 'ABCDE'[k] + ' has the IDs ' + mk.keyIds[k].slice(0, 3).join(' ')); });
      mk.tracker.forEach((t, k) => { if (!t || t.total !== nParts[k]) fail(word + ': key ' + 'ABCDE'[k] + ' has ' + (t ? 'a score tracker totalling ' + t.total : 'no score tracker') + ' for ' + nParts[k] + ' parts'); });
    };
    const mk = await p.evaluate(formShape);
    if (mk.nf !== 3 || mk.nk !== 3) fail('make-up: ' + mk.nf + ' forms / ' + mk.nk + ' keys for 3');
    if (mk.names.some(n => n !== 1)) fail('make-up: a form without a name line');
    shapeFails(mk, 'make-up');
    const seeds = mk.khead.map(h => (/Set (\d+)/.exec(h) || [])[1]);
    if (new Set(seeds).size !== 3 || seeds.some(x => !x)) fail('make-up: the forms are not three different sets: ' + mk.khead.join(' | '));
    /* ruling 54: the title says what it is, the line under it the unit's name, the form, the points and the time */
    mk.heads.forEach((h, k) => { if (!h.includes(' · Form ' + 'ABC'[k] + ' · ') || /^(Make-up|Test) ·/.test(h)) fail('make-up: head "' + h + '" for form ' + 'ABC'[k]);
      const t1 = mk.titles[k]; if (/Practice Test/i.test(t1) || !/Make-up Test$/.test(t1)) fail('make-up: the form is titled "' + t1 + '"'); if (!mk.khead[k].startsWith('Answer key — Form ' + 'ABC'[k]) || !mk.khead[k].includes('Set ' + seeds[k])) fail('make-up: key head "' + mk.khead[k] + '" for form ' + 'ABC'[k] + ' set ' + seeds[k]); });
    if (JSON.stringify(mk.stems[0]) === JSON.stringify(mk.stems[1])) fail('make-up: forms A and B have the same questions');
    for (let k = 0; k < 3; k++){                         /* every key row recomputed from that form's set */
      const want = await p.evaluate(s => { const g = Unit.generate(s), out = []; g.sections.forEach(sec => sec.items.forEach(it => {
        if (it.type === 'parts') it.parts.forEach(pp => out.push(pp.kind === 'mc' ? [pp.correct].map(c => 'ABCDEFGH'[c] + '. ' + Unit.view.opt(pp, c)).join(' ') : Unit.view.key(pp)));
        else if (it.type === 'solo') out.push(Unit.view.key(it.part));
        else out.push((it.type === 'multi' ? it.correct : [it.correct]).map(c => 'ABCDEFGH'[c] + '. ' + Unit.view.opt(it, c)).join(' ')); })); return out.map(h => { const d = document.createElement('div'); d.innerHTML = h; return d.textContent.replace(/\s+/g, ''); }); }, +seeds[k]);
      const got = mk.keyrows[k].map(x => x.replace(/\s+/g, ''));
      if (got.length !== want.length) fail('make-up: form ' + 'ABC'[k] + ' key has ' + got.length + ' rows for ' + want.length);
      got.forEach((g, i) => { if (g !== want[i]) fail('make-up: form ' + 'ABC'[k] + ' key row ' + (i + 1) + ' is "' + g + '", the set gives "' + want[i] + '"'); });
    }
    await p.click('#pvClose');
    const after = await p.evaluate(() => ({ h: location.hash, n: document.querySelectorAll('.q').length, first: document.querySelector('.q .stem .st').textContent}));
    if (after.h !== before.h || after.n !== before.n || after.first !== before.first) fail('make-up: the page changed after printing make-ups');
    /* ruling 49 (22 Oct 2026): a teacher copy of a unit with no fixed forms has a bar that prints THE TEST as n random sets,
       headed "Test · Form A" (never "Make-up", never "Practice Test"; the set number on the key only, 25 Oct 2026), each key
       on its own page */
    const random = await p.evaluate(() => !!(window.TEACHER_TEST && window.TEACHER_TEST.random));
    if (random) {
      if (!(await p.isVisible('.teacherbar [data-tforms="2"]'))) fail('ruling 49: the teacher bar has no "2 forms" button');
      await p.click('.teacherbar [data-tforms="2"]'); await p.waitForTimeout(150);
      const rt = await p.evaluate(formShape);
      if (rt.heads.length !== 2 || rt.nk !== 2) fail('ruling 49: ' + rt.heads.length + ' forms / ' + rt.nk + ' keys for 2');
      shapeFails(rt, 'ruling 49');
      rt.heads.forEach((h, k) => { if (!h.includes(' · Form ' + 'AB'[k] + ' · ') || /^(Make-up|Test) ·/.test(h)) fail('ruling 49: a test form is headed "' + h + '"'); });
      rt.khead.forEach((h, k) => { if (!h.startsWith('Answer key — Form ' + 'AB'[k]) || !/Set \d+/.test(h)) fail('ruling 49: a key is headed "' + h + '"'); });
      rt.titles.forEach(t => { if (/Practice|Make-up/i.test(t) || !/ Test$/.test(t)) fail('ruling 49: a printed test is titled "' + t + '"'); });
      /* ruling 54: a section is named, never numbered — question 1 sat under a section "1." (A7 Unit 6, 25 Oct 2026) */
      const secs = await p.evaluate(() => Array.from(document.querySelectorAll('#printview .pform:not(.pkeyform) .psec .bt')).map(e => e.textContent.trim()));
      secs.forEach(s => { if (/^(\d+|[IVX]+|Part \w+)[.:]/i.test(s)) fail('ruling 54: a printed section is numbered: "' + s + '"'); });
      await p.click('#pvClose');
    } else if (await p.isVisible('.teacherbar [data-tforms]')) fail('ruling 49: a unit with fixed forms shows the random-set bar');
    else {   /* the real test's paper (teacher.js): the same IDs as the page, on the test and on its key, a left-out question keeping its gap */
      const tt = await p.evaluate(() => { const T = window.TEACHER; if (!T || !T.testHtml) return null; const f = T.forms[0], keep = T.pick(); const d = document.createElement('div');
        d.innerHTML = T.testHtml(f); const ids = Array.from(d.querySelectorAll('.pqid .qn')).map(e => e.textContent); d.innerHTML = T.keyHtml(f); const kids = Array.from(d.querySelectorAll('td.pid')).map(e => e.textContent);
        T.pick(keep.map((x, i) => i !== 1)); d.innerHTML = T.testHtml(f); const gap = Array.from(d.querySelectorAll('.pqid .qn')).map(e => e.textContent); T.pick(keep); return { ids, kids, gap, n: keep.length, unit: window.TEACHER_TEST.unit }; });
      if (tt) { const want = Array.from({ length: tt.n }, (_, j) => 'U' + tt.unit + '·' + (j + 1));
        if (JSON.stringify(tt.ids) !== JSON.stringify(want)) fail('the real test prints the IDs ' + tt.ids.slice(0, 4).join(' ') + '…');
        if (!tt.kids.length || tt.kids.some(x => want.indexOf(x) < 0) || tt.kids[0] !== want[0]) fail('the real test\'s key has the IDs ' + tt.kids.slice(0, 4).join(' '));
        if (tt.gap[1] !== want[2]) fail('a left-out question renumbered the IDs: ' + tt.gap.slice(0, 3).join(' '));
        if ('U' + tt.unit !== 'U' + (/u(\d+)$/.exec(U.id) || [])[1]) fail('the real test\'s IDs are for unit ' + tt.unit + ', the page\'s for ' + U.id); } }
    }
    await more(p); await p.click('#bPrint'); await p.click('[data-print="wk"]'); await p.waitForTimeout(100);
    await p.emulateMedia({ media: 'print' });
    const vis = await p.evaluate(() => ({ sheet: getComputedStyle(document.querySelector('.sheet')).display, watch: getComputedStyle(document.querySelector('.watch')).display, bar: getComputedStyle(document.querySelector('#printview .pbar')).display, pv: getComputedStyle(document.getElementById('printview')).display }));
    if (vis.sheet !== 'none' || vis.watch !== 'none' || vis.bar !== 'none' || vis.pv === 'none') fail('print: on paper, more than the printout shows ' + JSON.stringify(vis));
    const pdf = await p.pdf({ format: 'Letter' }); const pages = (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length; if (pages < 2 || pages > 14) fail('print: the worksheet and key take ' + pages + ' pages');
    await p.emulateMedia({ media: 'screen' });
    await p.click('#pvClose'); if (await p.evaluate(() => document.body.classList.contains('printing')) || !(await p.isVisible('.sheet'))) fail('print: Close did not give the page back');
    /* results */
    await answer(p, ip[0]); await check(p, ip[0].id); if (ip[1].kind === 'text') { await p.fill('#a' + ip[1].id, '987654'); await check(p, ip[1].id); }
    await more(p); await p.click('#bPrint'); await p.click('[data-print="res"]'); await p.waitForTimeout(100);
    const rs = await p.$$eval('#printview .pans2 tbody tr', rr => rr.map(r => Array.from(r.cells).map(c => c.textContent.replace(/\s+/g, ' ').trim())));
    if (rs.length !== ip.length) fail('print: results list ' + rs.length + ' parts of ' + ip.length);
    if (!rs[0] || !/^✓ First try$/.test(rs[0][2])) fail('print: a first-try right answer shows "' + (rs[0] && rs[0][2]) + '"');
    if (ip[1].kind === 'text' && (!rs[1] || rs[1][1] !== '987654' || !/Not yet/.test(rs[1][2]))) fail('print: a wrong answer shows ' + JSON.stringify(rs[1]));
    if (rs[2] && !/^Blank$/.test(rs[2][2])) fail('print: an unanswered part shows "' + rs[2][2] + '"');
    await p.click('#pvClose');
    /* test mode: the results wait for Finish */
    await p.click('.mode button[data-mode="test"]'); if (await p.isVisible('#cy')) await p.click('#cy');
    await more(p); await p.click('#bPrint'); if (!(await p.$eval('[data-print="res"]', b => b.disabled))) fail('print: results printable in test mode before Finish');
    await p.click('#cn');
    if (U.second) { await p.click('.bi-toggle'); await more(p); await p.click('#bPrint'); await p.click('[data-print="wk"]'); await p.waitForTimeout(150);
      const miss = await p.evaluate(() => Object.keys(window.__biMissing || {})); if (miss.length) fail('print: no Portuguese for ' + miss.slice(0, 4).join(' | '));
      if (!(await p.$$eval('#printview .tr', e => e.length))) fail('print: Portuguese on, but none in the printout');
      await p.click('#pvClose'); await p.click('.bi-toggle'); }
    console.log('D. print checked'); }
  /* E. the math in TeX (kit/tex.js): every math span on the page is drawn by KaTeX (none fell back), and on 60 sets every
     stem, line, option and key converts to TeX that renders with throwOnError and keeps the HTML's digits and letters in order */
  { await fresh(p, 4821); await p.waitForFunction(() => window.Kit && Kit.Tex && Kit.Tex.isReady(), null, { timeout: 8000 }).catch(() => fail('tex: KaTeX did not start'));
    await p.waitForTimeout(300);
    if (!(await p.evaluate(() => !!document.getElementById('katex-css') && !!window.katex))) fail('tex: KaTeX is not inlined in the build');
    const t = await p.evaluate(() => { const all = Array.from(document.querySelectorAll('.m')); return { n: all.length, noShadow: all.filter(e => !e.shadowRoot).length,
      fallback: all.filter(e => e.hasAttribute('data-tex-fallback')).map(e => e.innerHTML).slice(0, 3), katex: all.filter(e => e.shadowRoot && e.shadowRoot.querySelector('.katex')).length,
      bad: all.filter(e => Kit.Tex.skeleton(Kit.Tex.toTex(e)) !== Kit.Tex.skeletonOf(e)).map(e => [e.innerHTML, Kit.Tex.toTex(e)]).slice(0, 3) }; });
    if (t.n === 0) console.log('E. (no math spans on this set\'s page — the 60-set pass below is the check)'); if (t.noShadow) fail('tex: ' + t.noShadow + ' math spans not drawn'); if (t.fallback.length) fail('tex: fell back on ' + JSON.stringify(t.fallback));
    if (t.katex !== t.n) fail('tex: ' + t.katex + ' of ' + t.n + ' spans drawn by KaTeX'); if (t.bad.length) fail('tex: digits/letters changed: ' + JSON.stringify(t.bad));
    const w = await p.evaluate(() => { const out = { n: 0, errs: [], bad: [] }, d = document.createElement('div');
      const one = h => { if (!h || !/class="m"/.test(h)) return; d.innerHTML = h; d.querySelectorAll('.m').forEach(e => { out.n++; const s = Kit.Tex.toTex(e);
        try { katex.renderToString(s, { throwOnError: true, strict: 'ignore', output: 'html' }); } catch (x) { if (out.errs.length < 3) out.errs.push([e.innerHTML, s, String(x.message || x)]); }
        if (Kit.Tex.skeleton(s) !== Kit.Tex.skeletonOf(e) && out.bad.length < 3) out.bad.push([e.innerHTML, s]); }); };
      for (let sd = 1; sd <= 60; sd++) { const g = Unit.generate(sd); g.sections.forEach(sec => sec.items.forEach(it => { one(Unit.view.stem(it));
        const parts = it.type === 'parts' ? it.parts : it.type === 'solo' ? [it.part] : [];
        parts.forEach(pp => { one(Unit.view.line(pp)); if (pp.kind === 'mc') pp.opts.forEach((o, k) => one(Unit.view.opt(pp, k))); else one(Unit.view.key(pp)); });
        if (it.type === 'mc' || it.type === 'multi') it.opts.forEach((o, k) => one(Unit.view.opt(it, k)));
        try { (Unit.solution(it.type === 'parts' ? it.parts[0] : it.type === 'solo' ? it.part : it, it.type === 'parts' || it.type === 'solo' ? 'text' : it.type) || []).forEach(st => { if (st && st.ex) one(Unit.view.ex ? Unit.view.ex(null, st.ex) : ''); }); } catch (x) {} })); }
      return out; });
    if (w.errs.length) fail('tex: KaTeX errors on ' + JSON.stringify(w.errs)); if (w.bad.length) fail('tex: digits/letters changed on ' + JSON.stringify(w.bad));
    console.log('E. tex checked: ' + t.n + ' spans on the page, ' + w.n + ' over 60 sets'); }
  /* G. named distractors (7 Nov 2026, item 4): picking a wrong choice shows that choice's own line — the unit's view.why(x, k),
     the item's whys[k], or the coach's words — and two wrong choices of one question never say the same thing when the unit
     names them; a select-all's wrong pick is named on the first check when the unit names it */
  { await fresh(p, 795); const ig = itemsOf(795); let named = 0;
    for (const it of ig.filter(i => i.kind === 'mc')) {
      const wrong = it.x.opts.map((_, k) => k).filter(k => k !== it.x.correct).slice(0, 2), seen = [];
      for (const k of wrong) {
        await p.evaluate(([q, k]) => document.querySelector('input[name="q' + q + '"][value="' + k + '"]').click(), [it.id, k]); await check(p, it.id);
        const r = await p.evaluate(([id, k, pos]) => { const P = pos.split('.').map(Number), g = Unit.generate(795), item = g.sections[P[0]].items[P[1]], x = item.type === 'parts' ? item.parts[P[2]] : item;
          const w = (Unit.view.why && Unit.view.why(x, k)) || (x.whys && x.whys[k]) || ((Unit.judge.mc(x, k) || {}).what || [])[0] || '', d = document.createElement('div'); d.innerHTML = w;
          return { want: d.textContent.replace(/\s+/g, ' ').trim(), card: document.getElementById('fb' + id).textContent.replace(/\s+/g, ' ').trim() }; }, [it.id, k, it.pos]);
        if (r.want && r.card.indexOf(r.want) < 0) fail('named distractor: ' + it.id + ' choice ' + 'ABCDEFGH'[k] + ' shows "' + r.card.slice(0, 90) + '", not its line "' + r.want.slice(0, 90) + '"');
        if (r.want) { named++; if (seen.indexOf(r.want) >= 0) fail('named distractor: two wrong choices of ' + it.id + ' say the same thing: "' + r.want.slice(0, 80) + '"'); seen.push(r.want); }
      }
    }
    for (const it of ig.filter(i => i.kind === 'multi')) {
      const k = it.x.opts.map((_, j) => j).find(j => it.x.correct.indexOf(j) < 0); if (k == null) continue;
      const w = await p.evaluate(([pos, k]) => { const P = pos.split('.').map(Number), x = Unit.generate(795).sections[P[0]].items[P[1]]; const h = Unit.view.why ? Unit.view.why(x, k) : (x.whys && x.whys[k]) || ''; const d = document.createElement('div'); d.innerHTML = h || ''; return d.textContent.replace(/\s+/g, ' ').trim(); }, [it.pos, k]);
      if (!w) continue;
      for (const c of it.x.correct.concat([k])) await p.evaluate(([q, c]) => document.querySelector('input[name="q' + q + '"][value="' + c + '"]').click(), [it.id, c]);
      await check(p, it.id); const card = await p.$eval('#fb' + it.id, e => e.textContent.replace(/\s+/g, ' ').trim());
      if (card.indexOf(w) < 0) fail('named distractor: select-all ' + it.id + ' picked ' + 'ABCDEFGH'[k] + ' on the first check and shows "' + card.slice(0, 90) + '", not "' + w.slice(0, 90) + '"'); else named++;
    }
    console.log('G. named distractors: ' + named + ' wrong picks shown their own line'); }
  /* F. the site's family (7 Nov 2026, the site review; Croix: "Ok sounds well thought out. Proceed."): the top is quiet — the
     mode toggle and ⋯, and question 1 on a phone's first screen; ⋯ is a real button whose menu opens and closes by keyboard;
     the clock shows only in "Like the real test" and still runs in "Check as I go"; the end panel has "Try a new set"; the way
     back shows only on mrshaffer.org's practice addresses; and the page asks the network for nothing. */
  { await p.setViewportSize({ width: 390, height: 844 }); await fresh(p, 4821);
    const top = await p.evaluate(() => { const q = document.querySelector('#paper .q'), r = q && q.getBoundingClientRect();
      return { q1: r ? Math.round(r.top) : 9999, h1: Math.round(document.getElementById('h1').getBoundingClientRect().top), menu: document.getElementById('mMenu').hidden,
        print: !!document.querySelector('#mMenu #bPrint'), scope: !!document.querySelector('#mMenu #scope'), set: !!document.querySelector('#mMenu details.setbox'),
        noteWeight: (() => { const n = document.querySelector('#intro .pinote'); return n ? +getComputedStyle(n).fontWeight : 0; })(),
        time: getComputedStyle(document.getElementById('time')).display, back: !document.getElementById('back').hidden }; });
    if (!top.menu) fail('the ⋯ menu is open when the page opens');
    if (!top.print || !top.scope || !top.set) fail('the ⋯ menu does not hold Print, what to practice and the set number: ' + JSON.stringify(top));
    if (top.q1 > 844 - 60) fail('on a phone question 1 starts at ' + top.q1 + 'px — not on the first screen');
    if (top.noteWeight > 500) fail('the unit\'s notes are set bold (' + top.noteWeight + '): they are a quiet line');
    if (top.time !== 'none') fail('the clock shows in "Check as I go"');
    if (top.back) fail('the way back shows on a page that is not on mrshaffer.org');
    /* ⋯ by keyboard: Enter opens it with focus inside, Escape closes it and gives focus back to ⋯ */
    const bm = await p.evaluate(() => { const b = document.getElementById('bMore'); return { tag: b.tagName, pop: b.getAttribute('aria-haspopup'), exp: b.getAttribute('aria-expanded'), tab: b.tabIndex }; });
    if (bm.tag !== 'BUTTON' || !bm.pop || bm.exp !== 'false' || bm.tab < 0) fail('⋯ is not a keyboard button with aria-haspopup: ' + JSON.stringify(bm));
    await p.focus('#bMore'); await p.keyboard.press('Enter'); await p.waitForTimeout(50);
    { const o = await p.evaluate(() => ({ open: !document.getElementById('mMenu').hidden, exp: document.getElementById('bMore').getAttribute('aria-expanded'), inside: document.getElementById('mMenu').contains(document.activeElement) }));
      if (!o.open || o.exp !== 'true' || !o.inside) fail('Enter on ⋯ did not open its menu with focus inside: ' + JSON.stringify(o)); }
    await p.keyboard.press('Tab'); { const inside = await p.evaluate(() => document.getElementById('mMenu').contains(document.activeElement)); if (!inside) fail('Tab from the practice menu leaves the ⋯ menu before Print'); }
    await p.keyboard.press('Escape'); await p.waitForTimeout(50);
    { const c = await p.evaluate(() => ({ open: !document.getElementById('mMenu').hidden, exp: document.getElementById('bMore').getAttribute('aria-expanded'), focus: document.activeElement && document.activeElement.id }));
      if (c.open || c.exp !== 'false' || c.focus !== 'bMore') fail('Escape did not close the ⋯ menu back to ⋯: ' + JSON.stringify(c)); }
    await p.click('#bMore'); await p.click('h1'); if (!(await p.isHidden('#mMenu'))) fail('a tap outside does not close the ⋯ menu');
    /* item 5: "Question 4 of 16" — the question holding the focus, as words and a thin turquoise bar in the bar area (not a ring) */
    { const N = await p.$$eval('#paper .q[data-q]:not(.xq)', e => e.length); await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(60);
      const q1 = await p.$eval('#qof', e => e.textContent); if (q1 !== 'Question 1 of ' + N) fail('the bar says "' + q1 + '" at the top of the page, not "Question 1 of ' + N + '"');
      await p.evaluate(() => { const q = document.querySelectorAll('#paper .q[data-q]:not(.xq)')[3]; const f = q && q.querySelector('input'); if (f) f.focus(); }); await p.waitForTimeout(60);
      const q4 = await p.$eval('#qof', e => e.textContent); if (N >= 4 && q4 !== 'Question 4 of ' + N) fail('focus in question 4: the bar says "' + q4 + '"');
      const bar = await p.evaluate(() => { const i = document.getElementById('prog'), b = i.parentNode.getBoundingClientRect(), r = i.getBoundingClientRect(); return { f: parseFloat(i.style.width) / 100, h: b.height, w: b.width, bg: getComputedStyle(i).backgroundColor, radius: getComputedStyle(i.parentNode).borderRadius, inBar: !!i.closest('.watch') }; });
      if (N >= 4 && Math.abs(bar.f - 4 / N) > 0.02) fail('the bar is ' + Math.round(bar.f * 100) + '% full at question 4 of ' + N);
      if (bar.h > 4 || bar.w < 120 || !bar.inBar) fail('the question bar is not a thin bar in the bar area: ' + JSON.stringify(bar));
      if (bar.bg.replace(/\s/g, '') !== 'rgb(64,224,208)') fail('the question bar is ' + bar.bg + ', not turquoise (Deckhand\'s live accent)'); }
    /* the clock: hidden but running in "Check as I go"; shown in "Like the real test" */
    const tx = itemsOf(4821).filter(i => i.kind === 'text'); await p.fill('#a' + tx[0].id, '1'); await p.waitForTimeout(1200);
    { const st = await state(p, 4821); if (!st.running) fail('the clock does not run in "Check as I go" (it is only hidden there)'); }
    if (await p.isVisible('#bPause')) fail('Pause shows in "Check as I go", where the clock is hidden');
    await p.click('.mode button[data-mode="test"]'); if (await p.isVisible('#cy')) await p.click('#cy'); await p.waitForTimeout(80);
    if (!(await p.isVisible('#time'))) fail('the clock is not shown in "Like the real test"');
    /* after Finish: "Try a new set" opens a new random set, the same practice choice, and asks nothing (the set is finished) */
    await fresh(p, 4821); await answer(p, itemsOf(4821)[0]); await check(p, itemsOf(4821)[0].id); await p.click('#bFinish'); await p.click('#cy'); await p.waitForTimeout(100);
    const tn = await p.$$('#result [data-newset]'); if (tn.length !== 1) fail('the end panel has ' + tn.length + ' "Try a new set" buttons');
    else { await tn[0].click(); await p.waitForTimeout(200); const h = await p.evaluate(() => location.hash); if (!/^#set-\d+$/.test(h) || h === '#set-4821') fail('"Try a new set" opened ' + h);
      if (await p.isVisible('#result')) fail('"Try a new set" left the end panel up');
      /* item 5: "Since last time" — two right on the new set after one on the last: up */
      const sd = +(/\d+/.exec(h) || [0])[0], i2 = itemsOf(sd); for (const it of i2.slice(0, 2)) { await answer(p, it); await check(p, it.id); }
      await p.click('#bFinish'); await p.click('#cy'); await p.waitForTimeout(100);
      const since = await p.$eval('#result .since', e => e.textContent.replace(/\s+/g, ' ').trim()).catch(() => '');
      if (!/^Since last time: up — 1 \/ \d+ then, 2 \/ \d+ today\.$/.test(since)) fail('end panel: "' + since + '", not "Since last time: up — 1 / N then, 2 / N today."');
      if (await p.$('#result .confetti, #result canvas')) fail('the end panel celebrates'); }
    /* the way back: on /<course>/practice/unit-N/ only, to ../../unit-N/ with N the unit's own */
    const N = (/u(\d+)$/.exec(U.id) || [])[1];
    if (N) { const sub = path.join(dir, 'm7', 'practice', 'unit-' + N); fs.mkdirSync(sub, { recursive: true }); fs.copyFileSync(path.join(dir, 'preview.html'), path.join(sub, 'index.html'));
      try { await p.goto(url.replace(/preview\.html$/, 'm7/practice/unit-' + N + '/')); await p.waitForTimeout(200);
        const bk = await p.evaluate(() => { const a = document.getElementById('back'); return { shown: !a.hidden && !!a.offsetParent, href: a.getAttribute('href'), text: a.textContent.trim(), h: Math.round(a.getBoundingClientRect().height),
          left: Math.round(a.getBoundingClientRect().left), first: document.querySelector('.watch .in').firstElementChild === a }; });
        if (!bk.shown || bk.href !== '../../unit-' + N + '/' || bk.text !== 'Unit ' + N || !bk.first || bk.h < 44) fail('the way back on the site: ' + JSON.stringify(bk));
      } finally { fs.rmSync(path.join(dir, 'm7'), { recursive: true, force: true }); } }
    console.log('F. the site\'s family checked'); }
  /* H. phone math hygiene (7 Nov 2026, item 7): the keypad only on a touch screen (pointer: coarse), 44 px keys, inserting at the
     caret, the fraction template, never over the box or its Check row, the box not moved when it opens; "Larger text" in the ⋯
     menu, two sizes, remembered on the device and safe without storage; no display of mathematics makes the page scroll
     sideways, at either size. */
  { const tc = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }), t = await tc.newPage();
    tc.on('request', r => { const u = r.url(); if (!/^(http:\/\/127\.0\.0\.1|data:|blob:|about:)/.test(u)) netAsked.push(u); }); t.on('pageerror', e => errs.push(e.message));
    await fresh(t, 4821);
    if (!(await t.evaluate(() => matchMedia('(pointer: coarse)').matches))) fail('keypad check: the touch context is not pointer: coarse');
    const KP = (U.keypad || []).length;
    const boxes = itemsOf(4821).filter(i => i.kind === 'text');
    let tested = false;
    for (const it of boxes) {
      await t.evaluate(id => { window.scrollTo(0, 0); document.getElementById('a' + id).scrollIntoView({ block: 'center' }); }, it.id); await t.waitForTimeout(30);
      const y0 = await t.$eval('#a' + it.id, e => e.getBoundingClientRect().top);
      await t.evaluate(id => document.getElementById('a' + id).focus(), it.id); await t.waitForTimeout(40);
      const k = await t.evaluate(id => { const keys = document.querySelector('.keys'), inp = document.getElementById('a' + id); if (!keys || keys.hidden) return null;
        const vis = Array.from(keys.querySelectorAll('button')).filter(b => !b.hidden && b.offsetParent);
        const kr = keys.getBoundingClientRect(), row = inp.closest('.ans') || inp.closest('.prt'), acts = row.querySelector('.acts') || row, ar = acts.getBoundingClientRect(), ir = inp.getBoundingClientRect();
        const hit = (a, c) => !(a.right <= c.left || c.right <= a.left || a.bottom <= c.top || c.bottom <= a.top);
        return { n: vis.length, small: vis.filter(b => b.getBoundingClientRect().height < 44 || b.getBoundingClientRect().width < 44).map(b => b.dataset.k), coversCheck: hit(kr, ar), coversBox: hit(kr, ir), y: ir.top,
          labels: vis.map(b => b.dataset.k), tabs: vis.filter(b => b.tabIndex >= 0).length }; }, it.id);
      if (!k) continue;
      tested = true;
      if (k.small.length) fail('keypad: keys under 44 px: ' + k.small.join(' '));
      if (k.coversCheck || k.coversBox) fail('keypad: it covers ' + (k.coversBox ? 'the box' : 'the Check row') + ' of ' + it.id);
      if (Math.abs(k.y - y0) > 2) fail('keypad: opening it moved the box ' + it.id + ' by ' + Math.round(k.y - y0) + ' px');
      if (k.tabs) fail('keypad: ' + k.tabs + ' keys are tab stops');
      /* inserting at the caret: a key between "a" and "b" */
      const lab = k.labels.find(l => l !== 'a/b');
      if (lab) { const want = await t.evaluate(([id, lab]) => { const e = document.getElementById('a' + id), K = (Unit.keypad || []).find(x => x.label === lab) || { label: lab }; e.value = 'ab'; e.setSelectionRange(1, 1); const ins = K.ins ? K.ins(e.dataset.kind) : K.label; return 'a' + ins + 'b'; }, [it.id, lab]);
        await t.click('.keys button[data-k="' + lab + '"]'); const got = await t.$eval('#a' + it.id, e => e.value); if (got !== want) fail('keypad: "' + lab + '" at the caret gave "' + got + '", not "' + want + '"'); }
      if (k.labels.indexOf('a/b') >= 0) { await t.evaluate(id => { const e = document.getElementById('a' + id); e.value = ''; e.setSelectionRange(0, 0); }, it.id); await t.click('.keys button[data-k="a/b"]');
        const r = await t.$eval('#a' + it.id, e => [e.value, e.selectionStart]); if (r[0] !== '()/()' || r[1] !== 1) fail('keypad: the fraction template wrote ' + JSON.stringify(r)); }
      await t.fill('#a' + it.id, ''); break;
    }
    if (KP && !tested) fail('keypad: the unit has a keypad but no box on a touch screen showed it');
    /* the fraction template's (3)/(4) reads as 3/4: the key of a fraction answer typed that way is right */
    { const isFr = i => i.kind === 'text' && /^-?\d+\/\d+$/.test(String(U.keyText(i.x))); let sd = [4821, 11, 12, 13].find(x => itemsOf(x).some(isFr)), fr = sd && itemsOf(sd).find(isFr); if (fr) { await fresh(t, sd);
      const [n0, d0] = String(U.keyText(fr.x)).split('/'); await t.fill('#a' + fr.id, '(' + n0 + ')/(' + d0 + ')'); await check(t, fr.id); const v = await t.evaluate(([pre, sd, id]) => (JSON.parse(localStorage.getItem(pre + 'set.' + sd + '.all')).res[id] || {}).v, [U.id + '.', sd, fr.id]); if (v !== 'right') fail('the template\'s (' + n0 + ')/(' + d0 + ') for ' + fr.id + ' (set ' + sd + ') was marked ' + v + ': ' + (await t.$eval('#fb' + fr.id, e => e.textContent)).slice(0, 120) + ' / typed ' + (await t.$eval('#a' + fr.id, e => e.value))); } }
    await t.close(); await tc.close(); }
  { /* a mouse: no keypad at all */
    await p.setViewportSize({ width: 1280, height: 800 }); await fresh(p, 4821); const tb = itemsOf(4821).filter(i => i.kind === 'text')[0];
    await p.focus('#a' + tb.id); await p.waitForTimeout(40); if (await p.evaluate(() => { const k = document.querySelector('.keys'); return !!(k && !k.hidden && k.offsetParent); })) fail('keypad: shown with a mouse (pointer: fine)');
    await p.setViewportSize({ width: 390, height: 844 }); }
  { /* Larger text: in ⋯, two sizes, remembered, and the page never scrolls sideways — with every worked solution open */
    await fresh(p, 780); await more(p);
    if (!(await p.$('#mMenu #bBig'))) fail('Larger text: not in the ⋯ menu');
    const h0 = await p.$eval('#paper .stem', e => e.getBoundingClientRect().height);
    await p.click('#bBig'); await p.waitForTimeout(60);
    const st = await p.evaluate(() => ({ lg: document.documentElement.classList.contains('lg'), pressed: document.getElementById('bBig').getAttribute('aria-pressed'), h: document.querySelector('#paper .stem').getBoundingClientRect().height }));
    if (!st.lg || st.pressed !== 'true' || !(st.h > h0 * 1.08)) fail('Larger text did not make the sheet larger: ' + JSON.stringify(st) + ' from ' + h0);
    await p.reload(); await p.waitForTimeout(200); if (!(await p.evaluate(() => document.documentElement.classList.contains('lg')))) fail('Larger text is not remembered after a reload');
    const over = async (where) => { const r = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth, wide: Array.from(document.querySelectorAll('#paper .ex, #paper .solhead')).filter(e => e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflowX === 'visible').length }));
      if (r.sw > r.iw + 1) fail(where + ': the page scrolls sideways (' + r.sw + ' px in ' + r.iw + ')'); if (r.wide) fail(where + ': ' + r.wide + ' lines of mathematics overflow without scrolling'); };
    for (const it of itemsOf(780)) { await wrongOf(p, it); await check(p, it.id); await rungTo(p, it.id, 3); }
    await over('larger text, every worked solution open');
    await more(p); await p.click('#bBig'); await p.waitForTimeout(60); await over('every worked solution open');
    await p.reload(); await p.waitForTimeout(150); if (await p.evaluate(() => document.documentElement.classList.contains('lg'))) fail('Larger text came back after it was turned off');
    /* storage refused (a private window, blocked site data): the page still opens and the toggle still works */
    const ps = await p.context().newPage(); await ps.addInitScript(() => { const no = () => { throw new Error('blocked'); }; Storage.prototype.getItem = no; Storage.prototype.setItem = no; Storage.prototype.removeItem = no; });
    const e2 = []; ps.on('pageerror', e => e2.push(e.message)); await ps.goto(url + '#set-12'); await ps.waitForTimeout(250);
    await ps.click('#bMore'); await ps.click('#bBig'); const ok2 = await ps.evaluate(() => document.documentElement.classList.contains('lg') && !!document.querySelector('#paper .q'));
    if (!ok2 || e2.length) fail('without storage: Larger text ' + (ok2 ? 'works' : 'fails') + (e2.length ? '; errors: ' + e2[0] : '')); await ps.close();
    console.log('H. keypad, larger text and the width of the mathematics checked'); }
  /* I. true dark and Appearance (7 Nov 2026, Croix: "I want it to be based on the system, also give me an option. But dark mode
     should be true dark mode. Black background not dark teal." — "And white letters."): a dark device with no choice made is a
     black desk, grey (never navy) paper and white ink, the mathematics in the same ink; Light under a dark device is the light
     page; System · Light · Dark is a radiogroup in ⋯ that works by keyboard, is remembered, is applied by the first script in
     <head>, and still works without storage; every figure's lines and words read on the dark paper (≥ 3:1). */
  { const rgb = c => { const v = (String(c).match(/[\d.]+/g) || []).map(Number); return v.length >= 3 ? { r: v[0], g: v[1], b: v[2], a: v.length > 3 ? v[3] : 1 } : null; };
    const lum = c => { const f = x => { x /= 255; return x <= .03928 ? x / 12.92 : Math.pow((x + .055) / 1.055, 2.4); }; return .2126 * f(c.r) + .7152 * f(c.g) + .0722 * f(c.b); };
    const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
    const over = (f, a, bg) => ({ r: f.r * a + bg.r * (1 - a), g: f.g * a + bg.g * (1 - a), b: f.b * a + bg.b * (1 - a) });
    const dc = await b.newContext({ viewport: { width: 390, height: 844 }, colorScheme: 'dark' }), d = await dc.newPage();
    const de = []; d.on('pageerror', e => de.push(e.message));
    await d.goto(url + '#set-4821'); await d.evaluate(() => { try { localStorage.clear(); } catch (e) {} }); await d.reload(); await d.waitForTimeout(200);
    const look = () => d.evaluate(() => { const cs = e => getComputedStyle(e); const k = document.querySelector('#paper .katex'), st = document.querySelector('#paper .stem .st');
      return { attr: document.documentElement.getAttribute('data-theme'), ground: cs(document.body).backgroundColor, paper: cs(document.querySelector('.sheet')).backgroundColor,
        ink: cs(document.getElementById('h1')).color, stem: st ? cs(st).color : null, katex: k ? cs(k).color : null }; });
    let L = await look();
    if (L.attr !== null) fail('dark device, no choice: <html> has data-theme="' + L.attr + '"');
    if (L.ground.replace(/\s/g, '') !== 'rgb(0,0,0)') fail('dark device: the desk is ' + L.ground + ', not black');
    { const pp = rgb(L.paper); if (!pp || Math.max(pp.r, pp.g, pp.b) - Math.min(pp.r, pp.g, pp.b) > 10 || lum(pp) > .03) fail('dark device: the paper is ' + L.paper + ' — not a near-black grey (navy?)'); }
    if (L.ink.replace(/\s/g, '') !== 'rgb(255,255,255)') fail('dark device: the title is ' + L.ink + ', not white');
    if (L.stem && L.stem.replace(/\s/g, '') !== 'rgb(255,255,255)') fail('dark device: a question is ' + L.stem + ', not white');
    if (L.katex && L.katex !== L.stem) fail('dark device: the mathematics is ' + L.katex + ', not the question\'s ink ' + L.stem);
    /* the first script in <head> applies the choice (no flash) */
    const head = await d.evaluate(() => { const s = document.head && document.head.querySelector('script'); return !!s && /practice\.theme/.test(s.textContent) && !document.head.querySelector('style:not(:empty)') ? 'first' : (s && /practice\.theme/.test(s.textContent) ? 'after-style' : 'none'); });
    if (head !== 'first') fail('the Appearance choice is not applied by the first script in <head> (' + head + ')');
    /* the control */
    await more(d);
    const ctl = await d.evaluate(() => { const g = document.querySelector('#mMenu #mTheme'); if (!g) return null; const r = Array.from(g.querySelectorAll('[role=radio]'));
      return { role: g.getAttribute('role'), label: (document.getElementById(g.getAttribute('aria-labelledby') || '') || {}).textContent || '', words: r.map(x => x.textContent.trim()),
        h: Math.min.apply(null, r.map(x => x.getBoundingClientRect().height)), w: Math.min.apply(null, r.map(x => x.getBoundingClientRect().width)),
        checked: r.filter(x => x.getAttribute('aria-checked') === 'true').map(x => x.dataset.themeTo), tabs: r.filter(x => x.tabIndex === 0).length }; });
    if (!ctl) fail('Appearance: no control in the ⋯ menu');
    else {
      if (ctl.role !== 'radiogroup' || !ctl.label) fail('Appearance: not a labelled radiogroup: ' + JSON.stringify(ctl));
      if (ctl.words.join('|').replace(/\s+/g, ' ').indexOf('System') !== 0 || !/Light/.test(ctl.words[1]) || !/Dark/.test(ctl.words[2])) fail('Appearance: the words are ' + JSON.stringify(ctl.words) + ', not System · Light · Dark');
      if (ctl.h < 44 || ctl.w < 44) fail('Appearance: a choice is ' + Math.round(ctl.w) + '×' + Math.round(ctl.h) + ' px, under 44');
      if (ctl.checked.join() !== 'system' || ctl.tabs !== 1) fail('Appearance: with nothing chosen it shows ' + JSON.stringify(ctl.checked) + ' (' + ctl.tabs + ' tab stops), not System');
      /* by keyboard: Tab reaches the chosen one; arrows move and choose */
      await d.focus('#mTheme [aria-checked=true]'); await d.keyboard.press('ArrowRight'); await d.waitForTimeout(40);
      L = await look(); const f1 = await d.evaluate(() => document.activeElement && document.activeElement.dataset.themeTo);
      if (L.attr !== 'light' || f1 !== 'light') fail('Appearance: → from System did not choose Light (data-theme ' + L.attr + ', focus ' + f1 + ')');
      if (L.ground.replace(/\s/g, '') !== 'rgb(248,242,228)') fail('Light under a dark device: the desk is ' + L.ground + ', not the cream');
      if (L.ink.replace(/\s/g, '') !== 'rgb(23,50,77)') fail('Light under a dark device: the title is ' + L.ink + ', not the navy ink');
      await d.keyboard.press('ArrowRight'); await d.waitForTimeout(40); L = await look();
      if (L.attr !== 'dark' || L.ground.replace(/\s/g, '') !== 'rgb(0,0,0)') fail('Appearance: → from Light did not choose Dark: ' + JSON.stringify(L));
      await d.reload(); await d.waitForTimeout(200); L = await look();
      const ck = await d.evaluate(() => (document.querySelector('#mTheme [aria-checked=true]') || {}).dataset);
      if (L.attr !== 'dark' || !ck || ck.themeTo !== 'dark') fail('Appearance: Dark is not remembered after a reload (' + L.attr + ')');
      await more(d); await d.focus('#mTheme [aria-checked=true]'); await d.keyboard.press('Home'); await d.waitForTimeout(40);
      await d.reload(); await d.waitForTimeout(200); L = await look();
      const kept = await d.evaluate(() => { try { return localStorage.getItem('practice.theme'); } catch (e) { return 'x'; } });
      if (L.attr !== null || kept !== null) fail('Appearance: System did not go back to following the device (data-theme ' + L.attr + ', stored ' + kept + ')');
      /* the light device, Dark chosen: the dark page */
      await d.emulateMedia({ colorScheme: 'light' }); await more(d); await d.click('#mTheme [data-theme-to=dark]'); await d.waitForTimeout(40); L = await look();
      if (L.ground.replace(/\s/g, '') !== 'rgb(0,0,0)') fail('Dark under a light device: the desk is ' + L.ground);
      /* print stays dark ink on white whatever the choice */
      await d.emulateMedia({ media: 'print', colorScheme: 'dark' }); L = await look();
      { const v = rgb(L.ink); if (v.r + v.g + v.b > 200) fail('Dark chosen, printed: the title prints in ' + L.ink); }
      await d.emulateMedia({ media: 'screen', colorScheme: 'dark' });
      await d.evaluate(() => { try { localStorage.removeItem('practice.theme'); } catch (e) {} });
    }
    /* storage refused: the control still works for the visit */
    { const ps = await dc.newPage(); await ps.addInitScript(() => { const no = () => { throw new Error('blocked'); }; Storage.prototype.getItem = no; Storage.prototype.setItem = no; Storage.prototype.removeItem = no; });
      const e2 = []; ps.on('pageerror', e => e2.push(e.message)); await ps.goto(url + '#set-12'); await ps.waitForTimeout(250);
      await ps.click('#bMore'); await ps.click('#mTheme [data-theme-to=light]'); await ps.waitForTimeout(40);
      const r = await ps.evaluate(() => ({ attr: document.documentElement.getAttribute('data-theme'), ground: getComputedStyle(document.body).backgroundColor, q: !!document.querySelector('#paper .q'),
        checked: (document.querySelector('#mTheme [aria-checked=true]') || {}).textContent }));
      if (r.attr !== 'light' || r.ground.replace(/\s/g, '') !== 'rgb(248,242,228)' || !r.q || !/Light/.test(r.checked || '') || e2.length) fail('without storage: Appearance does not work for the visit: ' + JSON.stringify(r) + (e2.length ? ' errors: ' + e2[0] : ''));
      await ps.close(); }
    /* the figures on black: every drawn line and word of the first figure found has ≥ 3:1 on the paper (and so on the desk) */
    { let found = null;
      for (let s = 1; s <= 60 && !found; s++) {
        await d.goto(url + '#set-' + s); await d.waitForTimeout(80);
        found = await d.evaluate(() => {
          const svg = Array.from(document.querySelectorAll('#paper svg')).find(v => !v.closest('button, .keys, .chip') && v.getBoundingClientRect().width > 60 && v.querySelector('line, path, polyline, polygon, circle, rect, ellipse, text'));
          if (!svg) return null;
          let host = svg, bg = 'rgba(0, 0, 0, 0)'; while (host && host.nodeType === 1) { const c = getComputedStyle(host).backgroundColor; if (!/rgba\(0, 0, 0, 0\)|transparent/.test(c)) { bg = c; break; } host = host.parentElement; }
          const marks = [];
          svg.querySelectorAll('line, path, polyline, polygon, circle, rect, ellipse, text').forEach(e => {
            const cs = getComputedStyle(e), op = parseFloat(cs.opacity) || 1, txt = e.tagName.toLowerCase() === 'text';
            if (cs.display === 'none' || cs.visibility === 'hidden') return;
            if (!txt && cs.stroke && cs.stroke !== 'none' && parseFloat(cs.strokeWidth) > 0) marks.push({ k: 'stroke', c: cs.stroke, a: op * parseFloat(cs.strokeOpacity), cls: e.getAttribute('class') || e.tagName });
            if (cs.fill && cs.fill !== 'none' && !/url/.test(cs.fill) && (txt || cs.stroke === 'none' || !cs.stroke)) marks.push({ k: 'fill', c: cs.fill, a: op * parseFloat(cs.fillOpacity), cls: e.getAttribute('class') || e.tagName, txt: txt });
          });
          const q = svg.closest('.q'); return { id: q ? 'Q' + (q.getAttribute('data-q') || '?') : '?', bg: bg, marks: marks };
        });
      }
      if (!found) console.log('I. no figure on this unit\'s first 60 sets — the figures check is skipped');
      else {
        const bg = rgb(found.bg), black = { r: 0, g: 0, b: 0 }, low = [];
        let n = 0;
        for (const m of found.marks) { const c = rgb(m.c); if (!c) continue; const a = m.a * c.a;
          if (a < .5 && !m.txt) continue;                       /* a shading or a grid at low alpha: a ground, not a line */
          n++; const seen = over(c, a, bg); const r1 = ratio(seen, bg), r2 = ratio(over(c, a, black), black);
          if (Math.min(r1, r2) < 3) low.push(m.cls + ' ' + m.k + ' ' + m.c + ' at ' + a.toFixed(2) + ': ' + r1.toFixed(2) + ':1'); }
        if (!n) fail('I. the figure in ' + found.id + ' has no line or word to measure');
        if (low.length) fail('figures on black: ' + low.length + ' marks under 3:1 in ' + found.id + ' — ' + low.slice(0, 4).join(' | '));
        console.log('I. a figure (' + found.id + ') on the dark paper: ' + n + ' marks measured, ' + low.length + ' under 3:1');
      }
    }
    if (de.length) fail('dark page errors: ' + de.slice(0, 3).join(' | '));
    await dc.close();
    console.log('I. true dark and Appearance checked'); }
  /* K. no follow-through line anywhere (7 Nov 2026, Croix: "Can you get rid of 'if an earlier part is wrong a later part still
     earns its point' line across everything"): the built page — everything it can show or print is inlined in it — never holds
     it; and which practice this is (Croix: "It was the switching mechanism that confused me"): a chip under the title names the
     choice from What to practice, per scope, and a lesson's line is "Lesson 10.04 · 8 questions · today's practice" */
  { const src = fs.readFileSync(path.join(dir, 'preview.html'), 'utf8'); if (/earlier part is wrong/i.test(src)) fail('K: the built page holds the follow-through line ("earlier part is wrong")');
    const chipOf = async h => { await p.goto(url + h); await p.reload(); await p.waitForTimeout(150); return p.evaluate(() => ({ chip: (document.getElementById('scopechip') || {}).textContent || '', total: document.getElementById('total').textContent, menu: (document.querySelector('#scope option:checked') || {}).textContent || '', cards: document.querySelectorAll('#paper .q[data-q]:not(.xq)').length,
      under: (() => { const c = document.getElementById('scopechip'), h1 = document.getElementById('h1'); return !!(c && h1 && (h1.compareDocumentPosition(c) & Node.DOCUMENT_POSITION_FOLLOWING) && c.getBoundingClientRect().top >= h1.getBoundingClientRect().bottom - 1); })() })); };
    let c = await chipOf('#set-5'); if (c.chip !== 'Whole practice test' || !c.under) fail('K: the whole test\'s chip is "' + c.chip + '"' + (c.under ? '' : ', not under the title'));
    const G = U.generate(5);
    for (let k = 0; k < G.sections.length; k++) { c = await chipOf('#set-5-p' + (k + 1)); const want = G.sections[k].title.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&'); if (c.chip !== want) fail('K: section ' + (k + 1) + '\'s chip is "' + c.chip + '", not "' + want + '"'); }
    await p.evaluate(([pre]) => { localStorage.setItem(pre + 'misses', JSON.stringify({ '0.0.-1': 'x', '0.0.0': 'x' })); }, [U.id + '.']);
    c = await chipOf('#set-6-miss'); if (c.chip !== 'My misses') fail('K: My misses\' chip is "' + c.chip + '"');
    const les = await p.evaluate(() => window.Kit && Kit.Bank ? Kit.Bank.keys().filter(k => Kit.Bank.shown(k)).slice(0, 2) : []);
    for (const k of les) { c = await chipOf('#set-5-' + k); const code = k.replace(/^lesson-/, '');
      if (!new RegExp('^Lesson ' + code.replace(/[.+]/g, '\\$&') + '$', 'i').test(c.chip) && !/^(Lessons |[A-Z]-)/.test(c.chip)) fail('K: lesson ' + code + '\'s chip is "' + c.chip + '"');
      if (c.chip + ' · ' + c.total !== c.chip + ' · ' + c.cards + ' question' + (c.cards === 1 ? '' : 's') + ' · today’s practice') fail('K: lesson ' + code + '\'s line is "' + c.total + '" (' + c.cards + ' cards)');
      if (c.menu.indexOf(c.chip) !== 0) fail('K: the chip "' + c.chip + '" is not the choice in What to practice ("' + c.menu + '")'); }
    await fresh(p, 5);
    console.log('K. no follow-through line; the chip on the whole test, ' + G.sections.length + ' sections, My misses and ' + les.length + ' lessons'); }
  /* J. the graph a student builds (kit kind nline, 7 Nov 2026; Croix: "make them graph inequalities with an open or closed dot and
     an arrow instead of just describing them"): a tap on a tick places the point, a drag moves it, ← → Home End move it by the
     keyboard; Dot and Arrow are radiogroups that work by keyboard; the ray draws as soon as a point and a direction exist; the
     key is ✓ on the first try; each one thing off gets its own line, in the order boundary, dot, arrow; Hint 3 ends on the graph
     drawn; no keypad; 44 px; no sideways scroll at 390; print hides the controls, gives the student paper the blank line and its
     10 mm band, and the key (and the teacher copy's test key) the graph drawn; the dark theme's strokes ≥ 3:1 on the paper. */
  { const sd = [11, 4821, 12, 13, 14, 15].find(x => itemsOf(x).some(i => i.kind === 'nline'));
    if (sd == null) console.log('J. no graph to build on this unit — skipped');
    else {
      /* a page whose clock runs saves its set as it is left; fresh() only changes the hash on the same set, so the save came after
         the storage was cleared — J leaves the page first, so every start is a fresh set */
      const freshJ = async (pg, s0) => { await pg.goto('about:blank'); await fresh(pg, s0); };
      const NI = itemsOf(sd).filter(i => i.kind === 'nline'), it = NI[0], id = it.id, Sp = NLK.spec(it.x), key = NLK.graphOf(it.x), ki = NLK.idx(Sp, key.c);
      const ans = async (pg, s0) => ((await pg.evaluate(([pre, s1]) => JSON.parse(localStorage.getItem(pre + 'set.' + s1 + '.all') || 'null'), [U.id + '.', s0 || sd])) || { ans: {} }).ans[id] || {};
      const zone = (pg, i) => pg.evaluate(([id, i]) => { const z = document.querySelector('#nlp' + id + ' .nzone[data-i="' + i + '"]'); z.scrollIntoView({ block: 'center' }); const r = z.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, h: r.height }; }, [id, i]);
      await p.setViewportSize({ width: 390, height: 844 }); await freshJ(p, sd);
      /* untouched: the line, two radiogroups, nothing checked, nothing drawn */
      const u0 = await p.evaluate(id => { const w = document.querySelector('[data-nlw="' + id + '"]'), pt = document.getElementById('nlp' + id);
        return { w: !!w, role: pt && pt.getAttribute('role'), groups: w ? Array.from(w.querySelectorAll('[role=radiogroup]')).map(g => g.getAttribute('aria-label')) : [], checked: w ? w.querySelectorAll('[aria-checked=true]').length : -1,
          dot: !!(pt && pt.querySelector('.ncl, .nop, .npend')), ray: !!(pt && pt.querySelector('.nray')), h: pt ? pt.getBoundingClientRect().height : 0,
          btnH: w ? Math.min.apply(null, Array.from(w.querySelectorAll('.nsb button')).map(b => b.getBoundingClientRect().height)) : 0, words: w ? Array.from(w.querySelectorAll('.nsb button')).map(b => b.textContent.trim()) : [],
          labels: pt ? Array.from(pt.querySelectorAll('.nlb')).map(t => t.textContent) : [], input: w ? w.querySelectorAll('input').length : -1 }; }, id);
      if (!u0.w || u0.role !== 'slider') fail('J: no number line to build on for ' + id + ': ' + JSON.stringify(u0));
      if (JSON.stringify(u0.groups) !== '["Dot","Arrow"]' || JSON.stringify(u0.words) !== '["Open","Closed","Left","Right"]') fail('J: the controls are ' + JSON.stringify(u0.groups) + ' ' + JSON.stringify(u0.words));
      if (u0.checked || u0.dot || u0.ray) fail('J: an untouched line shows a choice or a mark: ' + JSON.stringify(u0));
      if (u0.h < 44 || u0.btnH < 44) fail('J: targets under 44 px: the line ' + Math.round(u0.h) + ', the buttons ' + Math.round(u0.btnH));
      if (u0.input) fail('J: the graph has a text box (no typing is needed)');
      { const want = NLK.model(it.x).labels.map(l => l.s); if (JSON.stringify(u0.labels) !== JSON.stringify(want)) fail('J: the labels ' + u0.labels.join(' ') + ' are not the line\'s ' + want.join(' ')); }
      /* a tap places the point; no arrow yet, so no ray; the pending point is drawn */
      const tapI = ki >= 2 ? ki - 2 : ki + 2; let z = await zone(p, tapI); if (z.h < 44) fail('J: a tick\'s tap zone is ' + Math.round(z.h) + ' px tall');
      await p.mouse.click(z.x, z.y); let a = await ans(p);
      if (a.c !== NLK.kstr(NLK.val(Sp, tapI))) fail('J: a tap on tick ' + tapI + ' placed ' + JSON.stringify(a));
      { const m = await p.evaluate(id => { const pt = document.getElementById('nlp' + id); return { pend: !!pt.querySelector('.npend'), ray: !!pt.querySelector('.nray'), focus: document.activeElement === pt, now: pt.getAttribute('aria-valuenow') }; }, id);
        if (!m.pend || m.ray) fail('J: after a tap: the point is ' + (m.pend ? '' : 'not ') + 'drawn, ' + (m.ray ? 'a ray already' : 'no ray') + ' (no arrow chosen yet)');
        if (!m.focus || m.now !== a.c) fail('J: after a tap the slider is ' + JSON.stringify(m)); }
      /* a drag moves it */
      { const z0 = await zone(p, tapI), z1 = await zone(p, ki); await p.mouse.move(z0.x, z0.y); await p.mouse.down(); await p.mouse.move((z0.x + z1.x) / 2, z0.y, { steps: 3 }); await p.mouse.move(z1.x, z1.y, { steps: 3 }); await p.mouse.up();
        a = await ans(p); if (a.c !== key.c) fail('J: a drag to tick ' + ki + ' left the point at ' + a.c); }
      /* the keyboard moves it: → ← one step, Home and End the ends */
      await p.focus('#nlp' + id);
      for (const [k, want] of [['ArrowRight', ki + 1], ['ArrowLeft', ki], ['Home', 0], ['End', Sp.n], ['Home', 0]]) { await p.keyboard.press(k); a = await ans(p); if (a.c !== NLK.kstr(NLK.val(Sp, Math.min(Sp.n, want)))) fail('J: ' + k + ' put the point at ' + a.c + ', not ' + NLK.val(Sp, want)); }
      for (let k = 0; k < ki; k++) await p.keyboard.press('ArrowRight');
      /* the controls by keyboard: Tab reaches each group's one stop, the arrows choose */
      await p.keyboard.press('Tab'); { const f = await p.evaluate(() => document.activeElement && document.activeElement.getAttribute('data-nld')); if (f !== 'open') fail('J: Tab from the line reaches ' + f + ', not the Dot group'); }
      await p.keyboard.press(key.closed ? 'ArrowRight' : 'Space'); a = await ans(p);   /* → moves to Closed and chooses it; Space chooses the one in focus */ if (a.closed !== key.closed) fail('J: the arrow keys in Dot gave ' + a.closed);
      { const dotOk = await p.evaluate(([id, c]) => { const pt = document.getElementById('nlp' + id); return !!pt.querySelector(c ? '.ncl' : '.nop') && !pt.querySelector('.npend'); }, [id, key.closed]); if (!dotOk) fail('J: the dot is not drawn ' + (key.closed ? 'closed' : 'open')); }
      await p.keyboard.press('Tab'); { const f = await p.evaluate(() => document.activeElement && document.activeElement.getAttribute('data-nla')); if (f !== 'left') fail('J: Tab from Dot reaches ' + f + ', not the Arrow group'); }
      await p.keyboard.press(key.dir === 'right' ? 'ArrowRight' : 'Home'); a = await ans(p); if (a.dir !== key.dir) fail('J: the keys in Arrow gave ' + a.dir);
      { const r = await p.evaluate(id => { const pt = document.getElementById('nlp' + id), ray = pt.querySelector('.nray'), dot = pt.querySelector('.ncl, .nop'); return ray ? { x1: +ray.getAttribute('x1'), x2: +ray.getAttribute('x2'), cx: +dot.getAttribute('cx'), head: !!pt.querySelector('.nrh') } : null; }, id);
        if (!r || !r.head || Math.abs(r.x1 - r.cx) > 0.2 || (key.dir === 'right') !== (r.x2 > r.x1)) fail('J: the ray is not drawn from the point to the ' + key.dir + ': ' + JSON.stringify(r)); }
      { const sy = await p.$eval('#nls' + id, e => e.textContent), want = 'Boundary at ' + NLK.fmt(key.c) + ', ' + (key.closed ? 'closed' : 'open') + ' dot, arrow to the ' + key.dir + '.'; if (sy !== want) fail('J: the screen reader hears "' + sy + '", not "' + want + '"'); }
      /* no keypad for a graph, on a touch screen either; no sideways scroll */
      if (await p.evaluate(() => { const k = document.querySelector('.keys'); return !!(k && !k.hidden && k.offsetParent); })) fail('J: a keypad shows for a graph');
      if (await p.evaluate(() => document.documentElement.scrollWidth) > 391) fail('J: the page scrolls sideways at 390 with the graph built');
      await check(p, id);
      { const f = await p.$eval('#fb' + id, e => e.textContent); if (!/Correct on the first try/.test(f)) fail('J: the key built is not ✓ on the first try: ' + f.slice(0, 100)); }
      { const lk = await p.evaluate(id => ({ dis: Array.from(document.querySelectorAll('[data-nlw="' + id + '"] .nsb button')).every(b => b.disabled), aria: document.getElementById('nlp' + id).getAttribute('aria-disabled') }), id);
        if (!lk.dis || lk.aria !== 'true') fail('J: a right graph is not locked: ' + JSON.stringify(lk)); }
      /* each one thing off has its own line, in order: boundary, dot, arrow — then the key is right on a later try */
      await freshJ(p, sd);
      const offs = [['boundary', nlWrong(it.x)], ['dot', Object.assign({}, key, { closed: !key.closed })], ['arrow', Object.assign({}, key, { dir: key.dir === 'left' ? 'right' : 'left' })],
        ['boundary', Object.assign(nlWrong(it.x), { closed: !key.closed, dir: key.dir === 'left' ? 'right' : 'left' })], ['dot', Object.assign({}, key, { closed: !key.closed, dir: key.dir === 'left' ? 'right' : 'left' })]];
      const linesSeen = {};
      for (const [which, g] of offs) {
        await nlFill(p, id, it.x, g); await check(p, id);
        const r = await p.evaluate(([id, pos, g]) => { const P = pos.split('.').map(Number), x = Unit.generate(+location.hash.replace(/\D+/g, '')).sections[P[0]].items[P[1]], pt = x.type === 'parts' ? x.parts[P[2]] : x.part;
          const f = Kit.NL.judge(pt, g, { prevOk: false }, Unit.judge.nline), d = document.createElement('div'); d.innerHTML = (f.what || [])[0] || ''; return { which: f.which, want: d.textContent.replace(/\s+/g, ' ').trim(), card: document.getElementById('fb' + id).textContent.replace(/\s+/g, ' ').trim() }; }, [id, it.pos, g]);
        if (r.which !== which) fail('J: a graph with the ' + which + ' off is judged on the ' + r.which);
        if (!/^✗ Not yet/.test(r.card) || r.card.indexOf(r.want) < 0) fail('J: the ' + which + ' card is "' + r.card.slice(0, 120) + '", not its line "' + r.want.slice(0, 120) + '"');
        (linesSeen[which] = linesSeen[which] || []).push(r.want);
      }
      if (new Set([linesSeen.boundary[0], linesSeen.dot[0], linesSeen.arrow[0]]).size !== 3) fail('J: the boundary, dot and arrow lines are not three different lines');
      if (linesSeen.boundary[1] !== linesSeen.boundary[0] && !/^That point is on/.test(linesSeen.boundary[0])) fail('J: with everything off, the card does not name the boundary first');
      /* the ladder: Hint 1 the boundary, Hint 2 the dot, Hint 3 ends on the graph drawn */
      await rungTo(p, id, 3);
      { const L = await p.evaluate(id => ({ r1: (document.querySelector('#rg' + id + '-1 .rung-note') || {}).textContent || '', r2: (document.querySelector('#rg' + id + '-2') || {}).textContent || '',
          drawn: !!document.querySelector('#rg' + id + '-3 .key .nlkey svg.nlg .nray') && !!document.querySelector('#rg' + id + '-3 .key .nlkey svg.nlg .ncl, #rg' + id + '-3 .key .nlkey svg.nlg .nop'), opts: document.querySelectorAll('#rg' + id + '-3 .choices').length }), id);
        if (!/boundary/i.test(L.r1)) fail('J: Hint 1 is not the boundary: ' + L.r1.slice(0, 80)); if (!/open dot/.test(L.r2)) fail('J: Hint 2 is not the dot: ' + L.r2.slice(0, 80));
        if (!L.drawn || L.opts) fail('J: Hint 3 does not end on the finished graph drawn'); }
      await nlFill(p, id, it.x, key); await check(p, id);
      if (!/✓/.test(await p.$eval('#fb' + id, e => e.textContent))) fail('J: the key after the misses is not ✓');
      /* "Try a similar one": a fresh graph on its own line */
      { const b0 = await p.$('[data-another="' + id + '"]'); if (!b0) fail('J: no "Try a similar one" on the graph'); else { await b0.click(); await p.waitForTimeout(60);
        const x1 = await p.evaluate(id => { const w = document.querySelector('#ag' + id + ' .nlw'); return w ? { id: w.dataset.nlw, focus: document.activeElement && document.activeElement.id } : null; }, id);
        if (!x1 || x1.focus !== 'nlp' + x1.id) fail('J: "Try a similar one" did not open a fresh graph with the line in focus: ' + JSON.stringify(x1)); } }
      /* print: the worksheet's blank line with its band, the controls hidden, the key drawn */
      await freshJ(p, sd); await more(p); await p.click('#bPrint'); await p.click('[data-print="wk"]'); await p.waitForTimeout(80);
      await p.emulateMedia({ media: 'print' });
      { const pr = await p.evaluate(() => { const pv = document.getElementById('printview'), band = pv.querySelector('.pnl .pnlband'), ln = pv.querySelector('.pnl svg.nlg');
          return { lines: pv.querySelectorAll('.pnl svg.nlg').length, marks: pv.querySelectorAll('.pnl svg .ncl, .pnl svg .nop, .pnl svg .nray, .pnl svg .npend').length, band: band ? band.getBoundingClientRect().height : 0, ctl: pv.querySelectorAll('.nctl, .nsb, [role=radiogroup]').length,
            ctlSheet: Array.from(document.querySelectorAll('.sheet .nctl')).map(e => getComputedStyle(e).display), ink: ln ? getComputedStyle(ln).color : '', keyDrawn: pv.querySelectorAll('.pkey .nlkey svg .nray').length, ans: pv.querySelectorAll('.pq .pnl').length,
            instr: Array.from(pv.querySelectorAll('.ppart')).filter(pp => pp.querySelector('.pnl')).map(pp => pp.querySelector('.line .st').textContent.trim()) }; });
        if (pr.lines !== NI.length || pr.marks) fail('J: the worksheet prints ' + pr.lines + ' blank lines for ' + NI.length + ' graphs, ' + pr.marks + ' marks on them');
        if (Math.abs(pr.band - 37.8) > 1.5) fail('J: the band to graph on is ' + pr.band.toFixed(1) + ' px, not 10 mm');
        if (pr.ctl || pr.ctlSheet.some(d => d !== 'none')) fail('J: the controls print: ' + JSON.stringify(pr));
        if (pr.ink.replace(/\s/g, '') !== 'rgb(0,0,0)') fail('J: the printed line is ' + pr.ink + ', not black ink');
        if (pr.keyDrawn !== NI.length) fail('J: the key draws ' + pr.keyDrawn + ' graphs of ' + NI.length);
        if (pr.instr.some(t => t !== 'Graph the solution on the number line.')) fail('J: the printed instruction is ' + JSON.stringify(pr.instr)); }
      await p.emulateMedia({ media: 'screen' }); await p.click('#pvClose');
      /* the teacher copy: the key's graph under the item on screen; its printed test has the blank lines, its key the graphs drawn */
      if (await p.evaluate(() => !!window.TEACHER_TEST)) {
        const tk = await p.evaluate(id => !!document.querySelector('[data-host="' + id + '"] .nltk .nlkey svg .nray'), id); if (!tk) fail('J: the teacher copy does not show the key\'s graph under ' + id);
        await more(p); await p.click('#bPrint'); await p.click('[data-print="mk"]'); await p.click('[data-print="mk2"]'); await p.waitForTimeout(120); await p.emulateMedia({ media: 'print' });
        const tp = await p.evaluate(() => ({ blank: Array.from(document.querySelectorAll('#printview .pform:not(.pkeyform)')).map(f => [f.querySelectorAll('.pnl svg.nlg').length, f.querySelectorAll('.pnl .ncl, .pnl .nop, .pnl .nray, .nltk').length, f.querySelectorAll('.pnl .pnlband').length]),
          keys: Array.from(document.querySelectorAll('#printview .pkeyform')).map(k => k.querySelectorAll('.nlkey svg .nray').length) }));
        tp.blank.forEach((b, k) => { if (!b[0] || b[1] || b[2] !== b[0]) fail('J: test form ' + 'AB'[k] + ' prints ' + JSON.stringify(b) + ' (lines, marks, bands)'); if (tp.keys[k] !== b[0]) fail('J: key ' + 'AB'[k] + ' draws ' + tp.keys[k] + ' graphs for ' + b[0]); });
        await p.emulateMedia({ media: 'screen' }); await p.click('#pvClose');
      }
      /* a touch screen: a tap places it, and no keypad */
      { const tc = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }), t = await tc.newPage(); t.on('pageerror', e => errs.push(e.message));
        await freshJ(t, sd); const zt = await zone(t, ki); await t.touchscreen.tap(zt.x, zt.y); await t.waitForTimeout(40);
        const at = await ans(t); if (at.c !== key.c) fail('J: a tap on a touch screen placed ' + JSON.stringify(at));
        await t.tap('[data-nl="' + id + '"][data-nld="open"]');
        if (await t.evaluate(() => { const k = document.querySelector('.keys'); return !!(k && !k.hidden && k.offsetParent); })) fail('J: a keypad shows for a graph on a touch screen');
        if (await t.evaluate(() => document.documentElement.scrollWidth) > 391) fail('J: the touch page scrolls sideways');
        await tc.close(); }
      /* the dark theme: the line, the ticks, the words, the dot and the ray ≥ 3:1 on the paper */
      { const dc = await b.newContext({ viewport: { width: 390, height: 844 }, colorScheme: 'dark' }), d = await dc.newPage(); await freshJ(d, sd); await nlFill(d, id, it.x, key);
        const cs = await d.evaluate(id => { const pt = document.getElementById('nlp' + id), bg = getComputedStyle(document.querySelector('.sheet')).backgroundColor, out = [];
          pt.querySelectorAll('.nax, .ntk, .ntk2, .nlb, .nray, .nrh, .ncl, .nop').forEach(e => { const c = getComputedStyle(e); out.push([e.getAttribute('class'), /nlb|nrh|ncl/.test(e.getAttribute('class')) ? c.fill : c.stroke]); }); return { bg, out }; }, id);
        const rgb = c => (String(c).match(/[\d.]+/g) || []).map(Number), lum = v => { const f = x => { x /= 255; return x <= .03928 ? x / 12.92 : Math.pow((x + .055) / 1.055, 2.4); }; return .2126 * f(v[0]) + .7152 * f(v[1]) + .0722 * f(v[2]); };
        const bg = rgb(cs.bg), low = cs.out.filter(([k, c]) => { const v = rgb(c), x = lum(v), y = lum(bg); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05) < 3; });
        if (!cs.out.length || low.length) fail('J: dark: ' + low.length + ' of ' + cs.out.length + ' marks under 3:1 on ' + cs.bg + ': ' + JSON.stringify(low.slice(0, 3)));
        await dc.close(); }
      console.log('J. the graph a student builds: ' + NI.length + ' on set ' + sd + ', tap, drag, keys, controls, ✓, three lines, the ladder, print, touch, dark');
    } }
  if (netAsked.length) fail('the page asked the network for ' + netAsked.length + ': ' + netAsked.slice(0, 3).join(' | '));
  if (errs.length) fail('page errors: ' + errs.slice(0, 3).join(' | '));
  /* L. the edits layer (edits.js, 7 Nov 2026): a mocked site's edits on the screen, on paper and on the teacher copy's test */
  await require('./edits_page.js')(b, url, U, dir, fail);
  await b.close(); server.close();
  console.log('B. flows checked');
  if (fails.length) { console.log('FAILURES (' + fails.length + '):\n' + fails.join('\n')); process.exit(1); }
  console.log('PAGE CHECKS PASS');
})();
