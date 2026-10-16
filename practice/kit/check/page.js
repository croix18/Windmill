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
const server = http.createServer((q, r) => { const f = path.join(dir, decodeURIComponent(q.url.split('?')[0].split('#')[0])); if (!f.startsWith(dir) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); fs.createReadStream(f).pipe(r); });
let url = '';
const fails = []; const fail = m => { fails.push(m); };
function itemsOf(seed) {
  const g = U.generate(seed), out = []; let qn = 0;
  g.sections.forEach(sec => sec.items.forEach(it => { qn++;
    if (it.type === 'parts') it.parts.forEach(p => out.push({ id: qn + p.label, kind: p.kind === 'mc' ? 'mc' : 'text', x: p }));
    else if (it.type === 'solo') out.push({ id: String(qn), kind: 'text', x: it.part });
    else out.push({ id: String(qn), kind: it.type === 'multi' ? 'multi' : 'mc', x: it });
  }));
  return out;
}
async function answer(p, it) {
  if (it.kind === 'text') await p.fill('#a' + it.id, U.keyText(it.x));
  else for (const k of (it.kind === 'mc' ? [it.x.correct] : it.x.correct)) await p.evaluate(([q, k]) => document.querySelector('input[name="q' + q + '"][value="' + k + '"]').click(), [it.id, k]);
}
const check = (p, id) => p.evaluate(id => document.querySelector('[data-check="' + id + '"]').click(), id);
const state = (p, seed) => p.evaluate(([pre, seed]) => JSON.parse(localStorage.getItem(pre + 'set.' + seed + '.all') || 'null'), [U.id + '.', seed]);
const active = p => p.evaluate(() => { const a = document.activeElement; return a ? (a.id || '') + '|' + (a.className || '') + '|' + (a.dataset ? JSON.stringify(a.dataset) : '') : ''; });
async function fresh(p, seed) { await p.goto(url + '#set-' + seed); await p.evaluate(() => { try { localStorage.clear(); } catch (e) {} }); await p.goto(url + '#set-' + seed); await p.reload(); await p.waitForTimeout(150); }

(async () => {
  await new Promise(res => server.listen(0, '127.0.0.1', res)); url = 'http://127.0.0.1:' + server.address().port + '/preview.html';
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }), p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/fonts|ERR_TUNNEL|net::/.test(m.text())) errs.push(m.text()); });

  /* A. every key */
  for (const seed of [11, 4821, 99999]) {
    await fresh(p, seed);
    const its = itemsOf(seed);
    for (const it of its) { await answer(p, it); await check(p, it.id); }
    const sc = await p.$eval('#score', e => e.textContent);
    if (!new RegExp('^' + its.length + ' right first try').test(sc) || !new RegExp(its.length + ' of ' + its.length + ' done').test(sc)) fail('set ' + seed + ': typed keys scored "' + sc + '"');
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
  /* 3. Show me how takes focus to the steps */
  await p.click('[data-all="' + T[0].id + '"]'); if (!/^st/.test(await active(p))) fail('Show me how: focus is ' + await active(p));
  /* 4. Try another: focus in the new question */
  await p.click('[data-another="' + T[0].id + '"]'); { const a = await active(p); if (!/^a.*x1|q.*x1/.test(a) && !/x1/.test(a)) fail('Try another: focus is ' + a); }
  /* 5. Hint takes focus into the walkthrough; Close gives it back to Hint */
  await p.click('[data-walk="' + T[1].id + '"]'); { const a = await active(p); if (!/wopt|^wn/.test(a)) fail('Hint: focus is ' + a); }
  const head = await p.$eval('#wl' + T[1].id + ' .wkhead b', e => e.textContent); if (!/^Hint · step 1 of \d+$/.test(head)) fail('Hint heading "' + head + '"');
  await p.click('[data-wclose="' + T[1].id + '"]'); if (!/"walk"/.test(await active(p))) fail('Close: focus is ' + await active(p));
  /* 6. Show this step after two wrong numbers */
  { let found = false;
    for (const it of T.slice(2)) {
      const steps = U.walk(it.x, 'text') || []; const k = steps.findIndex(s => s.type === 'num'); if (k < 0) continue;
      await p.click('[data-walk="' + it.id + '"]');
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
  const small = await p.evaluate(() => Array.from(document.querySelectorAll('.more button, .chk, .mode button, .keys button, .walk .wclose')).filter(e => e.offsetParent).map(e => [e.textContent, Math.round(e.getBoundingClientRect().height)]).filter(x => x[1] < 44));
  if (small.length) fail('tap targets under 44px: ' + JSON.stringify(small.slice(0, 5)));
  const tabbable = await p.evaluate(() => Array.from(document.querySelectorAll('.keys button')).filter(b => b.tabIndex >= 0).length); if (tabbable) fail(tabbable + ' keypad keys are tab stops');
  /* 9. Finish marks a typed answer that was never checked */
  await fresh(p, 778); { const i2 = itemsOf(778).filter(i => i.kind === 'text')[0]; await answer(p, i2); await p.click('#bFinish'); await p.click('#cy');
    const big = await p.$eval('.big b', e => e.textContent); if (!/^1\D/.test(big)) fail('Finish ignored a typed, unchecked right answer: ' + big);
    if (!(await p.isVisible('#result'))) fail('no results after Finish'); }
  /* 10. test mode: only "can't read this yet"; results' buttons practise with checking */
  await fresh(p, 779); await p.click('.mode button[data-mode="test"]');
  { const i3 = itemsOf(779).filter(i => i.kind === 'text')[0]; await p.fill('#a' + i3.id, '((3'); await p.focus('#bFinish');
    const rd = await p.$eval('#rd' + i3.id, e => e.textContent); if (!/^Can’t read this yet/.test(rd)) fail('test mode: no "can’t read this yet" (' + rd + ')');
    const fb = await p.$eval('#fb' + i3.id, e => e.textContent); if (/Correct|Not yet/.test(fb)) fail('test mode shows a verdict before Finish');
    await p.click('#bFinish'); await p.click('#cy'); await p.waitForTimeout(100);
    await p.click('#result button[data-new]'); await p.waitForTimeout(200);
    const mode = await p.$eval('.mode button[aria-pressed="true"]', e => e.dataset.mode); if (mode !== 'practice') fail('results button opened in ' + mode + ' mode'); }
  /* 12. every Show me how on a set, and every Hint's first step: no "null", "undefined" or "NaN" anywhere a student can read */
  await fresh(p, 780);
  { const i5 = itemsOf(780);
    for (const it of i5) { if (it.kind === 'text') await p.fill('#a' + it.id, '987654'); else await p.evaluate(id => { const x = document.querySelector('input[name="q' + id + '"]'); if (x) x.click(); }, it.id); await check(p, it.id);
      await p.evaluate(id => { const b = document.querySelector('[data-all="' + id + '"]'); if (b) b.click(); }, it.id); }
    const txt = await p.evaluate(() => document.getElementById('paper').innerText);
    const m = /\b(null|undefined|NaN)\b/.exec(txt); if (m) fail('"' + m[1] + '" on the page: …' + txt.slice(Math.max(0, m.index - 80), m.index + 20).replace(/\s+/g, ' ')); }
  /* 13. a new set never says it "was updated" */
  await p.click('details.setbox summary'); await p.click('#bNew'); await p.waitForTimeout(150);
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
  if (errs.length) fail('page errors: ' + errs.slice(0, 3).join(' | '));
  await b.close(); server.close();
  console.log('B. flows checked');
  if (fails.length) { console.log('FAILURES (' + fails.length + '):\n' + fails.join('\n')); process.exit(1); }
  console.log('PAGE CHECKS PASS');
})();
