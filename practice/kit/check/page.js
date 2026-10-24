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
  /* KaTeX is inlined by the build; the CDN route stays only so a page built without it still checks offline */
  const VEND = path.join(__dirname, '..', 'vendor', 'katex');
  await ctx.route('https://cdnjs.cloudflare.com/**', route => { const u = route.request().url(); const f = /katex\.min\.js$/.test(u) ? 'katex.min.js' : /katex\.min\.css$/.test(u) ? 'katex.min.css' : null;
    if (f) route.fulfill({ status: 200, contentType: f.endsWith('.js') ? 'application/javascript' : 'text/css', headers: { 'access-control-allow-origin': '*' }, body: fs.readFileSync(path.join(VEND, f)) }); else route.fulfill({ status: 404, body: '' }); });
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
  /* 4b. Try another after a choice question got right on a later try: the new one's choices can be ticked (23 Oct 2026:
     a select-all got right on the second try opened its "another" locked — the right answer's lock reached into the box) */
  { const C = itemsOf(seed).find(x => x.kind !== 'text'); if (!C) fail('no choice question to test Try another on');
    else { const wrong = C.kind === 'mc' ? [(C.x.correct + 1) % C.x.opts.length] : [C.x.opts.findIndex((_, k) => !C.x.correct.includes(k))];
      for (const k of wrong) await p.evaluate(([q, k]) => document.querySelector('input[name="q' + q + '"][value="' + k + '"]').click(), [C.id, k]);
      await check(p, C.id); for (const k of wrong) await p.evaluate(([q, k]) => document.querySelector('input[name="q' + q + '"][value="' + k + '"]').click(), [C.id, k]);
      await answer(p, C); await check(p, C.id);
      const fb = await p.$eval('#fb' + C.id, e => e.innerText); if (!/Correct/.test(fb)) fail('choice question ' + C.id + ' not right after the key: ' + fb.slice(0, 60));
      await p.click('[data-another="' + C.id + '"]');
      const locked = await p.$$eval('input[name="q' + C.id + 'x1"]', xs => xs.filter(x => x.disabled).length); if (locked) fail('Try another on ' + C.id + ': ' + locked + ' of the new choices are disabled — the student cannot touch the new question');
      else { await p.click('#ch' + C.id + 'x1A'); const on = await p.$eval('input[name="q' + C.id + 'x1"][value="0"]', x => x.checked); if (!on) fail('Try another on ' + C.id + ': the new choice did not tick'); }
      const still = await p.$$eval('input[name="q' + C.id + '"]', xs => xs.filter(x => !x.disabled).length); if (still) fail('the right answer on ' + C.id + ' no longer locks its own choices'); } }
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
      for (const it of its) { if (it.kind === 'text') await p.fill('#a' + it.id, '987654'); else await p.evaluate(([id, c]) => { const x = document.querySelector('input[name="q' + id + '"][value="' + ((c + 1) % 3) + '"]') || document.querySelector('input[name="q' + id + '"]'); x.click(); }, [it.id, it.x.correct]); await check(p, it.id); }
      for (const it of TT.slice(0, 6)) {
        const steps = U.walk(it.x, 'text') || []; if (!steps.length) continue;
        await p.click('[data-walk="' + it.id + '"]');
        for (let j = 0; j < steps.length; j++) {
          if (steps[j].type === 'choice') { const bad = steps[j].opts.findIndex(o => !o.ok), ok = steps[j].opts.findIndex(o => o.ok); if (bad >= 0) await p.click('[data-wopt="' + it.id + '|' + j + '|' + bad + '"]'); await p.click('[data-wopt="' + it.id + '|' + j + '|' + ok + '"]'); }
          else { for (let t = 0; t < 2; t++) { await p.fill('#wn' + it.id, '987654'); await p.click('[data-wnum="' + it.id + '"]'); } await p.fill('#wn' + it.id, 'abc'); await p.click('[data-wnum="' + it.id + '"]'); await p.click('[data-wgive="' + it.id + '"]'); }
        }
      }
      await biAudit('hints');
      for (const it of its) await p.evaluate(id => { const b = document.querySelector('[data-all="' + id + '"]'); if (b) b.click(); }, it.id);
      await biAudit('Show me how');
      await p.click('[data-another="' + TT[0].id + '"]'); await p.waitForTimeout(80);
      for (const it of [TT[1], MM[0]].filter(Boolean)) { await answer(p, it); await check(p, it.id); }
      await p.click('#bFinish'); await biAudit('the confirm'); await p.click('#cy'); await p.waitForTimeout(100);
      await biAudit('the results');
      await p.click('details.setbox summary'); await biAudit('the set box');
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
  { const seedP = 793, ip = itemsOf(seedP), V = U.view, txt = h => String(h).replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
    await fresh(p, seedP);
    const screenStems = await p.$$eval('.sheet .stem .st', es => es.map(e => e.textContent.replace(/\s+/g, ' ').trim()));
    await p.click('#bPrint'); if (!(await p.isVisible('[data-print="wk"]'))) fail('print: no choice after Print');
    await p.click('[data-print="wk"]'); await p.waitForTimeout(100);
    const pr = await p.evaluate(() => ({ stems: Array.from(document.querySelectorAll('#printview .pq .stem .st')).map(e => e.textContent.replace(/\s+/g, ' ').trim()),
      blanks: document.querySelectorAll('#printview .pans').length, groups: document.querySelectorAll('#printview .pchoices').length,
      keys: Array.from(document.querySelectorAll('#printview .pkey tr')).map(r => [r.cells[0].textContent.trim(), r.cells[1].textContent.replace(/\s+/g, ' ').trim()]) }));
    if (JSON.stringify(pr.stems) !== JSON.stringify(screenStems)) fail('print: the worksheet questions are not the screen questions');
    const nText = ip.filter(i => i.kind === 'text').length, nMc = ip.length - nText;
    if (pr.blanks !== nText || pr.groups !== nMc) fail('print: ' + pr.blanks + ' answer blanks / ' + pr.groups + ' choice lists for ' + nText + ' / ' + nMc + ' parts');
    if (pr.keys.length !== ip.length) fail('print: the key has ' + pr.keys.length + ' rows for ' + ip.length + ' parts');
    ip.forEach((it, k) => { const want = it.kind === 'text' ? txt(V.key(it.x)) : (it.kind === 'mc' ? [it.x.correct] : it.x.correct).map(c => 'ABCDEFGH'[c] + '. ' + txt(V.opt(it.x, c))).join(' ');
      const got = pr.keys[k] ? pr.keys[k][1] : ''; if (got.replace(/\s+/g, '') !== want.replace(/\s+/g, '')) fail('print: key ' + it.id + ' is "' + got + '", the page marks "' + want + '"'); });
    /* make-up tests: on a student page there are none (Croix, 21 Oct 2026: "I don't want the students to be able to print
       the make up tests") — not in the menu, and a forged request prints nothing; on the teacher copy, three forms, each a
       different set; every form's key is that form's own answers (recomputed from the form's set in this browser); the
       page's own set, items and answers are untouched afterwards */
    await p.click('#pvClose');
    const isTeacher = await p.evaluate(() => !!window.TEACHER_TEST);
    if (!isTeacher) {
      await p.click('#bPrint');
      const opts = await p.$$eval('[data-print]', es => es.map(e => e.dataset.print));
      if (opts.some(o => /^mk/.test(o))) fail('print: a student page offers make-up tests: ' + opts.join(', '));
      if (['ws', 'wk', 'res'].some(o => opts.indexOf(o) < 0)) fail('print: the student menu is ' + opts.join(', '));
      await p.click('#cn');
      const forged = await p.evaluate(() => { const b = document.createElement('button'); b.dataset.print = 'mk3'; document.body.appendChild(b); b.click(); b.remove();
        const pv = document.getElementById('printview'); return { pv: !!pv && !pv.hidden && pv.innerHTML.length > 0, printing: document.body.classList.contains('printing') }; });
      if (forged.pv || forged.printing) fail('print: a forged make-up request printed on a student page');
    }
    if (isTeacher) {
    await p.click('#bPrint'); await p.click('[data-print="mk"]');
    if (!(await p.isVisible('[data-print="mk3"]'))) fail('print: no form count after Make-up tests');
    const before = await p.evaluate(() => ({ h: location.hash, n: document.querySelectorAll('.q').length, first: document.querySelector('.q .stem .st').textContent }));
    await p.click('[data-print="mk3"]'); await p.waitForTimeout(150);
    const mk = await p.evaluate(() => {
      const forms = Array.from(document.querySelectorAll('#printview .pform:not(.pkeyform)')), keys = Array.from(document.querySelectorAll('#printview .pform.pkeyform'));
      return { nf: forms.length, nk: keys.length,
        heads: forms.map(f => f.querySelector('.pt2').textContent.trim()), titles: forms.map(f => f.querySelector('.pt1').textContent.trim()), khead: keys.map(k => k.querySelector('.psec').textContent.trim() + ' ' + k.querySelector('.pmeta').textContent.trim()),
        stems: forms.map(f => Array.from(f.querySelectorAll('.pq .stem .st')).map(e => e.textContent.replace(/\s+/g, ' ').trim())),
        keyrows: keys.map(k => Array.from(k.querySelectorAll('tr')).map(r => r.cells[1].textContent.replace(/\s+/g, ' ').trim())),
        names: forms.map(f => f.querySelectorAll('.pname').length) };
    });
    if (mk.nf !== 3 || mk.nk !== 3) fail('make-up: ' + mk.nf + ' forms / ' + mk.nk + ' keys for 3');
    if (mk.names.some(n => n !== 1)) fail('make-up: a form without a name line');
    const seeds = mk.heads.map(h => (/Set (\d+)/.exec(h) || [])[1]);
    if (new Set(seeds).size !== 3 || seeds.some(x => !x)) fail('make-up: the forms are not three different sets: ' + mk.heads.join(' | '));
    mk.heads.forEach((h, k) => { if (!h.startsWith('Make-up · Form ' + 'ABC'[k] + ' · Set ')) fail('make-up: head "' + h + '" for form ' + 'ABC'[k]);
      const t1 = mk.titles[k]; if (/Practice Test/i.test(t1) || !/Test/.test(t1)) fail('make-up: the form is titled "' + t1 + '"'); if (!mk.khead[k].startsWith('Answer key — Form ' + 'ABC'[k]) || !mk.khead[k].includes('Set ' + seeds[k])) fail('make-up: key head "' + mk.khead[k] + '" for form ' + 'ABC'[k] + ' set ' + seeds[k]); });
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
    }
    await p.click('#bPrint'); await p.click('[data-print="wk"]'); await p.waitForTimeout(100);
    await p.emulateMedia({ media: 'print' });
    const vis = await p.evaluate(() => ({ sheet: getComputedStyle(document.querySelector('.sheet')).display, watch: getComputedStyle(document.querySelector('.watch')).display, bar: getComputedStyle(document.querySelector('#printview .pbar')).display, pv: getComputedStyle(document.getElementById('printview')).display }));
    if (vis.sheet !== 'none' || vis.watch !== 'none' || vis.bar !== 'none' || vis.pv === 'none') fail('print: on paper, more than the printout shows ' + JSON.stringify(vis));
    const pdf = await p.pdf({ format: 'Letter' }); const pages = (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length; if (pages < 2 || pages > 14) fail('print: the worksheet and key take ' + pages + ' pages');
    await p.emulateMedia({ media: 'screen' });
    await p.click('#pvClose'); if (await p.evaluate(() => document.body.classList.contains('printing')) || !(await p.isVisible('.sheet'))) fail('print: Close did not give the page back');
    /* results */
    await answer(p, ip[0]); await check(p, ip[0].id); if (ip[1].kind === 'text') { await p.fill('#a' + ip[1].id, '987654'); await check(p, ip[1].id); }
    await p.click('#bPrint'); await p.click('[data-print="res"]'); await p.waitForTimeout(100);
    const rs = await p.$$eval('#printview .pans2 tbody tr', rr => rr.map(r => Array.from(r.cells).map(c => c.textContent.replace(/\s+/g, ' ').trim())));
    if (rs.length !== ip.length) fail('print: results list ' + rs.length + ' parts of ' + ip.length);
    if (!rs[0] || !/^✓ First try$/.test(rs[0][2])) fail('print: a first-try right answer shows "' + (rs[0] && rs[0][2]) + '"');
    if (ip[1].kind === 'text' && (!rs[1] || rs[1][1] !== '987654' || !/Not yet/.test(rs[1][2]))) fail('print: a wrong answer shows ' + JSON.stringify(rs[1]));
    if (rs[2] && !/^Blank$/.test(rs[2][2])) fail('print: an unanswered part shows "' + rs[2][2] + '"');
    await p.click('#pvClose');
    /* test mode: the results wait for Finish */
    await p.click('.mode button[data-mode="test"]'); if (await p.isVisible('#cy')) await p.click('#cy');
    await p.click('#bPrint'); if (!(await p.$eval('[data-print="res"]', b => b.disabled))) fail('print: results printable in test mode before Finish');
    await p.click('#cn');
    if (U.second) { await p.click('.bi-toggle'); await p.click('#bPrint'); await p.click('[data-print="wk"]'); await p.waitForTimeout(150);
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
  if (errs.length) fail('page errors: ' + errs.slice(0, 3).join(' | '));
  await b.close(); server.close();
  console.log('B. flows checked');
  if (fails.length) { console.log('FAILURES (' + fails.length + '):\n' + fails.join('\n')); process.exit(1); }
  console.log('PAGE CHECKS PASS');
})();
