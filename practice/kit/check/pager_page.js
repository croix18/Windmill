/* Practice-test kit, page.js part R: one question at a time, as on the FAST (pager.js, 14 Nov 2026), as students have it — the
   checks' switch (window.KIT_PAGER_OFF, which parts A–Q set) is off here. On the whole test and on a lesson set:
   - a start screen with the header once (Start; Keep going when the set has answers), then the question alone — the mode switch
     and the ⋯ menu under it, the typing tip in the ⋯ menu, one progress readout (the number, not the bar too), the section's
     name without its total;
   - one question on the screen, its number ("Question 4 of 16"), Back and Next, focus on the question's number
     after each; the map: a labelled button per question ("Question 2, answered, flagged"), the one on screen marked;
   - Flag for review; the question and the flags, with the answers, after a reload (the set's own saved record);
   - a coach's Next ↓ and Move on open the question they go to, with the focus in its box, as before;
   - every key typed through the pager, Next to the last question, whose Next is Finish: every point, then the summary — the
     end panel and every question listed — and a question opened from it to review, and back;
   - Like the real test: nothing marked before Finish; Blank and Not right after it;
   - a lesson link (#lesson-…) opens that lesson set's first question;
   - on a phone (390 × 844): no sideways scroll on any question, every figure inside the screen, the map a drawer, 44 px targets;
   - print: every question and section on the paper and none of the pager; a print preview or a teacher's view hides the map;
   - with Português (a unit that has it): the pager's own words have their translations.
   Usage (from page.js): await require('./pager_page.js')(newContext, url, U, dir, fail) — newContext without the switch. */
'use strict';
const path = require('path');
const NLK = require('../nline.js'), CGF = require('./cgraph.js');
module.exports = async function (newContext, url, U, dir, fail) {
  const teacher = /^teacher$/.test(path.basename(dir)), F = m => fail('R. pager: ' + m);
  const byQ = seed => { const g = U.generate(seed), out = {}; let qn = 0;
    g.sections.forEach(sec => sec.items.forEach(it => { qn++; const a = out[qn] = [];
      if (it.type === 'parts') it.parts.forEach(p => a.push({ id: qn + p.label, kind: p.kind === 'mc' ? 'mc' : p.kind === 'nline' ? 'nline' : p.kind === 'cgraph' ? 'cgraph' : 'text', x: p }));
      else if (it.type === 'solo') a.push({ id: String(qn), kind: it.part.kind === 'nline' ? 'nline' : it.part.kind === 'cgraph' ? 'cgraph' : 'text', x: it.part });
      else a.push({ id: String(qn), kind: it.type === 'multi' ? 'multi' : 'mc', x: it }); }));
    return out; };
  async function answer(p, it) {
    if (it.kind === 'nline') { const g = NLK.graphOf(it.x), Sp = NLK.spec(it.x), i = NLK.idx(Sp, g.c);
      await p.focus('#nlp' + it.id); await p.keyboard.press('Home'); for (let k = 0; k < i; k++) await p.keyboard.press('ArrowRight');
      if (g.closed != null) await p.click('[data-nl="' + it.id + '"][data-nld="' + (g.closed ? 'closed' : 'open') + '"]');
      if (g.dir) await p.click('[data-nl="' + it.id + '"][data-nla="' + g.dir + '"]'); return; }
    if (it.kind === 'cgraph') return CGF.fill(p, it.id, it.x);
    if (it.kind === 'text') return p.fill('#a' + it.id, U.keyText(it.x));
    for (const k of (it.kind === 'mc' ? [it.x.correct] : it.x.correct)) await p.evaluate(([q, k]) => document.querySelector('input[name="q' + q + '"][value="' + k + '"]').click(), [it.id, k]);
  }
  const check = (p, id) => p.evaluate(id => document.querySelector('[data-check="' + id + '"]').click(), id);
  const look = p => p.evaluate(() => {
    const $ = id => document.getElementById(id), vis = e => !!e && getComputedStyle(e).display !== 'none' && e.getClientRects().length > 0;
    const cards = [...document.querySelectorAll('#paper .q[data-q]:not(.xq)')], grid = [...document.querySelectorAll('#pgGrid button')], a = document.activeElement;
    const on = cards.find(vis), own = s => { const e = $(s); return e ? (e.firstChild && e.firstChild.nodeType === 3 ? e.firstChild.nodeValue : e.textContent) : ''; };
    return { n: cards.length, shown: cards.filter(vis).map(c => +c.dataset.q), secs: [...document.querySelectorAll('#paper section.part')].filter(vis).length,
      badge: own('pgQt'), qof: $('qof').textContent, focus: a ? a.id : '', inCard: a && on ? on.contains(a) : false,
      cur: grid.findIndex(b => b.getAttribute('aria-current') === 'step'), labels: grid.map(b => b.getAttribute('aria-label')),
      flag: $('pgFlag') ? $('pgFlag').getAttribute('aria-pressed') : null, next: own('pgNext'), prevOff: !!($('pgPrev') && $('pgPrev').disabled),
      sum: document.body.classList.contains('pg-sum'), rev: document.body.classList.contains('pg-rev'), result: vis($('result')), paper: vis($('paper')),
      back: vis($('pgBack')), map: vis(document.querySelector('.pgmap')), grid: vis($('pgGrid')), chip: vis($('pgChip')) ? $('pgChip').textContent : '',
      rows: [...document.querySelectorAll('#pgRows .pgrow')].map(r => r.className.replace(/^pgrow /, '')), sx: document.documentElement.scrollWidth - window.innerWidth,
      fbs: [...document.querySelectorAll('#paper .fb')].map(f => f.innerText.trim()).filter(Boolean).length, score: $('score').textContent,
      start: vis($('pgStart')), startWord: own('pgStart'), h1: vis($('h1')), intro: vis($('intro')), ctlInMap: !!document.querySelector('.pgmap > .ctl') && vis(document.querySelector('.pgmap > .ctl')),
      qofVis: vis($('qof')), pts: on ? [...on.closest('section.part').querySelectorAll('.sechead .pts')].some(vis) : null, secName: on ? vis(on.closest('section.part').querySelector('.sechead h2')) : null };
  });
  const fresh = async (p, hash) => { await p.goto(url + hash); await p.evaluate(() => { try { localStorage.clear(); } catch (e) {} }); await p.goto('about:blank'); await p.goto(url + hash); await p.waitForTimeout(200); };
  const tap = async (p, sel) => { await p.click(sel); await p.waitForTimeout(60); };
  const begin = async p => { if (await p.isVisible('#pgStart')) await tap(p, '#pgStart'); };
  const finish = async p => { await tap(p, '#bFinish'); await tap(p, '#cy'); };
  const errs = [];
  const ctx = await newContext({ viewport: { width: 1280, height: 800 } }), p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));

  /* the whole test: one question, Back and Next, the map, the flag, the reload */
  const Q = byQ(11), N = Object.keys(Q).length;
  await fresh(p, '#set-11');
  let L = await look(p);
  /* the start: the header once, with Start; then the question alone — the controls under it, one readout, no section total */
  if (!L.start || L.startWord !== 'Start' || !L.h1 || L.paper || L.shown.length) F('the first screen is not the start: ' + JSON.stringify({ start: L.start, word: L.startWord, h1: L.h1, paper: L.paper }));
  await tap(p, '#pgStart'); L = await look(p);
  if (L.h1 || L.intro || !L.ctlInMap || L.focus !== 'pgQ') F('after Start the header is still over the question, or the controls are not under it: ' + JSON.stringify({ h1: L.h1, intro: L.intro, ctlInMap: L.ctlInMap, focus: L.focus }));
  if (L.qofVis) F('two progress readouts: the bar still says "' + L.qof + '" over the question’s number');
  if (L.pts || !L.secName) F('the section’s total over a one-question screen: total ' + L.pts + ', name ' + L.secName);
  if (U.notes && U.notes.length && !(await p.$('#mMenu .pgtip .pinote'))) F('the unit’s typing tip is not in the ⋯ menu');
  if (L.n !== N) F('set 11 has ' + L.n + ' questions on the page, the unit draws ' + N);
  if (L.shown.join() !== '1' || L.badge !== 'Question 1 of ' + N || L.cur !== 0 || !L.prevOff || L.next !== 'Next' || !L.map)
    F('the first screen is not question 1 alone: ' + JSON.stringify({ shown: L.shown, badge: L.badge, qof: L.qof, cur: L.cur, prevOff: L.prevOff, next: L.next, map: L.map }));
  if (L.labels.length !== N || L.labels.some((t, i) => t !== 'Question ' + (i + 1) + ', not answered')) F('the map’s labels: ' + L.labels.slice(0, 3).join(' | '));
  if (L.secs !== 1) F(L.secs + ' sections on the screen');
  await tap(p, '#pgNext'); L = await look(p);
  if (L.shown.join() !== '2' || L.badge !== 'Question 2 of ' + N || L.focus !== 'pgQ' || L.cur !== 1) F('Next did not open question 2 with the focus on its number: ' + JSON.stringify(L).slice(0, 300));
  for (const it of Q[2]) await answer(p, it); await p.waitForTimeout(80);
  L = await look(p); if (L.labels[1] !== 'Question 2, answered') F('question 2 answered, the map says "' + L.labels[1] + '"');
  await tap(p, '#pgFlag'); L = await look(p);
  if (L.flag !== 'true' || L.labels[1] !== 'Question 2, answered, flagged') F('Flag for review: ' + L.flag + ' / "' + L.labels[1] + '"');
  await tap(p, '#pgGrid [data-pgi="' + Math.min(4, N - 1) + '"]'); L = await look(p);
  if (L.shown.join() !== String(Math.min(5, N)) || L.focus !== 'pgQ' || L.flag !== 'false') F('the map’s button did not open question ' + Math.min(5, N) + ': ' + JSON.stringify(L).slice(0, 200));
  await tap(p, '#pgPrev'); L = await look(p);
  if (L.shown.join() !== String(Math.min(4, N - 1)) || L.focus !== 'pgQ') F('Back did not open the question before');
  await p.reload(); await p.waitForTimeout(250); L = await look(p);
  if (!L.start || L.startWord !== 'Keep going') F('a set with answers reopens on "' + L.startWord + '", not Keep going');
  await begin(p); L = await look(p);
  if (L.shown.join() !== String(Math.min(4, N - 1)) || L.labels[1] !== 'Question 2, answered, flagged') F('after a reload: question ' + L.shown.join() + ' on the screen, the map says "' + L.labels[1] + '"');
  /* a coach's Next ↓ after a right answer opens the next question not right yet, the focus in its box */
  await tap(p, '#pgGrid [data-pgi="1"]');
  for (const it of Q[2]) await check(p, it.id); await p.waitForTimeout(60);
  const fwd = () => p.evaluate(() => [...document.querySelectorAll('[data-next],[data-moveon],#pgNext,#bFinish')].filter(e => e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden' && (e.id !== 'bFinish')).map(e => e.id || e.textContent.trim()));
  let fw = await fwd(); L = await look(p);
  if (fw.join() !== 'pgNext') F('after a right answer the ways forward on screen are: ' + fw.join(' | '));
  if (L.focus !== 'pgNext') F('after a right answer the focus is on "' + L.focus + '", not Next');
  if (!(await p.$('[data-next="' + Q[2][Q[2].length - 1].id + '"]'))) F('no next question offered after question 2 was right');
  await tap(p, '#pgNext'); await p.waitForTimeout(250); L = await look(p); if (L.shown.join() !== '3' || !L.inCard) F('Next after a right question 2: question ' + L.shown.join() + ', focus ' + (L.inCard ? 'in it' : 'not in it'));
  /* Next after a miss does what Move on did: the next question, the focus in it — the only way forward on screen */
  const solo = Object.keys(Q).map(Number).find(k => k >= 3 && k < N && Q[k].length === 1 && Q[k][0].kind === 'text');
  if (solo) { await tap(p, '#pgGrid [data-pgi="' + (solo - 1) + '"]'); await p.fill('#a' + Q[solo][0].id, '987654'); await check(p, Q[solo][0].id); await p.waitForTimeout(60);
    fw = await fwd(); if (fw.join() !== 'pgNext') F('after a miss the ways forward on screen are: ' + fw.join(' | '));
    await tap(p, '#pgNext'); await p.waitForTimeout(250); L = await look(p); if (L.shown.join() !== String(solo + 1) || !L.inCard) F('Next after a miss on question ' + solo + ': question ' + L.shown.join()); }

  /* every key typed through the pager, Next to the end, Finish there: every point, then the summary and a question reviewed */
  if (!teacher) {
    const Q2 = byQ(4821), N2 = Object.keys(Q2).length; let parts = 0;
    await fresh(p, '#set-4821'); await begin(p);
    for (let q = 1; q <= N2; q++) {
      L = await look(p); if (L.shown.join() !== String(q)) { F('stepping through set 4821: question ' + L.shown.join() + ' where ' + q + ' was due'); break; }
      for (const it of Q2[q]) { await answer(p, it); await check(p, it.id); parts++; }
      if (q < N2) await tap(p, '#pgNext');
    }
    L = await look(p);
    if (L.next !== 'Finish') F('the last question’s Next says "' + L.next + '"');
    if (!new RegExp('^' + parts + ' earned').test(L.score) || !new RegExp(parts + ' of ' + parts + ' done').test(L.score)) F('every key through the pager scored "' + L.score + '"');
    await tap(p, '#pgNext'); if (await p.isHidden('#confirm')) F('Next on the last question did not ask to finish'); else await tap(p, '#cy');
    L = await look(p);
    if (!L.sum || !L.result || L.paper || L.map || L.rows.length !== N2 || L.rows.some(r => r !== 'ok')) F('the summary: ' + JSON.stringify({ sum: L.sum, result: L.result, paper: L.paper, map: L.map, rows: L.rows.slice(0, 4), n: L.rows.length }));
    await tap(p, '#pgRows [data-pgr="2"]'); L = await look(p);
    if (!L.rev || L.shown.join() !== '3' || L.chip !== 'Right' || L.result || !L.back || L.focus !== 'pgQ') F('a question opened from the summary: ' + JSON.stringify({ rev: L.rev, shown: L.shown, chip: L.chip, result: L.result, back: L.back, focus: L.focus }));
    await tap(p, '#pgBack'); L = await look(p);
    if (!L.sum || L.focus !== 'result') F('Score summary did not go back to the summary (focus ' + L.focus + ')');
    await p.reload(); await p.waitForTimeout(250); L = await look(p); if (!L.sum) F('a finished set reloads to its question, not its summary');
  }
  /* Like the real test: nothing marked before Finish; then Not right and Blank */
  await fresh(p, '#set-12'); await tap(p, '.mode [data-mode="test"]'); await begin(p);
  { const Q3 = byQ(12), first = Q3[1][0];
    if (first.kind === 'text') await p.fill('#a' + first.id, '987654'); else await answer(p, first);
    await tap(p, '#pgNext'); await tap(p, '#pgPrev');
    L = await look(p); if (L.fbs || L.chip) F('Like the real test said something before Finish: ' + L.fbs + ' feedback card(s)');
    await finish(p); L = await look(p);
    if (!L.sum || L.rows.length !== Object.keys(Q3).length || L.rows.slice(1).some(r => r !== 'na') || (first.kind === 'text' && Q3[1].length === 1 && L.rows[0] !== 'no')) F('Like the real test, after Finish: ' + L.rows.slice(0, 4).join(' '));
    await tap(p, '#pgRows [data-pgr="1"]'); L = await look(p); if (L.chip !== 'Blank') F('a blank question reviewed says "' + L.chip + '"'); }

  /* a lesson set: the link opens its first question; Next, the flag, the reload, Finish, the summary, a question reviewed */
  const lessons = await p.evaluate(() => window.Kit && Kit.Bank ? Kit.Bank.keys() : []);
  if (lessons.length) {
    await fresh(p, '#' + lessons[0]); L = await look(p);
    const M = L.n;
    if (L.start) F('#' + lessons[0] + ' stopped at the start screen');
    if (!M || L.shown.join() !== '1' || L.badge !== 'Question 1 of ' + M || L.labels.length !== M) F('#' + lessons[0] + ' did not open its first question: ' + JSON.stringify({ shown: L.shown, badge: L.badge, n: M }));
    await tap(p, '#pgNext'); await tap(p, '#pgFlag'); await p.reload(); await p.waitForTimeout(250); await begin(p); L = await look(p);
    if (L.shown.join() !== '2' || L.flag !== 'true') F('a lesson set after a reload: question ' + L.shown.join() + ', flag ' + L.flag);
    await finish(p); L = await look(p);
    if (!L.sum || L.rows.length !== M) F('a lesson set’s summary: ' + L.rows.length + ' rows for ' + M + ' questions');
    await tap(p, '#pgRows [data-pgr="1"]'); L = await look(p); if (!L.rev || L.shown.join() !== '2') F('a lesson question opened from the summary: ' + L.shown.join());
  }
  /* print: every question and section, none of the pager; a print preview or a teacher's view hides the map */
  await fresh(p, '#set-11'); await begin(p); await tap(p, '#pgNext');
  await p.emulateMedia({ media: 'print' });
  { const r = await p.evaluate(() => { const vis = e => getComputedStyle(e).display !== 'none';
      return { cards: [...document.querySelectorAll('#paper .q[data-q]:not(.xq)')].filter(vis).length, secs: [...document.querySelectorAll('#paper section.part')].filter(vis).length,
        all: document.querySelectorAll('#paper section.part').length, chrome: [...document.querySelectorAll('.pghead,.pgnav,.pgmap,.pglist,.pgstart')].filter(vis).length,
        pts: [...document.querySelectorAll('#paper .sechead .pts')].filter(vis).length, h1: vis(document.getElementById('h1')) }; });
    if (r.cards !== N || r.secs !== r.all || r.chrome || r.pts !== r.all || !r.h1) F('print: ' + JSON.stringify(r)); }
  await p.emulateMedia({ media: 'screen' });
  for (const c of teacher ? ['printing', 'tview'] : ['printing']) { const shown = await p.evaluate(c => { document.body.classList.add(c); const v = getComputedStyle(document.querySelector('.pgmap')).display !== 'none'; document.body.classList.remove(c); return v; }, c);
    if (shown) F('the map shows over ' + (c === 'tview' ? 'a teacher’s view' : 'a print preview')); }
  /* Português: the pager's own words have their translations */
  if (U.second && await p.$('.bi-toggle')) {
    await tap(p, '.bi-toggle'); await tap(p, '#pgNext'); await p.waitForTimeout(150);
    const miss = await p.evaluate(() => Object.keys(window.__biMissing || {}).filter(k => /Flag for review|^Back$|^Next$|^Finish$|Questions|Question \d+ of|Answered|Flagged|On screen|Every question|Score summary|Tap a question/.test(k)));
    const flagTr = await p.evaluate(() => { const t = document.querySelector('#pgFlag .tr'); return t ? t.textContent : ''; });
    if (miss.length || !/revisão/.test(flagTr)) F('Português: missing ' + miss.slice(0, 4).join(' | ') + ' · the flag says "' + flagTr + '"');
    await tap(p, '.bi-toggle');
  }
  await ctx.close();

  /* a phone: no sideways scroll, every figure inside the screen, the map a drawer, 44 px targets — the test and a lesson set */
  const pc = await newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }), m = await pc.newPage(); m.on('pageerror', e => errs.push(e.message));
  for (const hash of ['#set-4821'].concat(lessons.length && !teacher ? ['#' + lessons[lessons.length - 1]] : [])) {
    await fresh(m, hash); if (await m.isVisible('#pgStart')) await m.tap('#pgStart'); const n = (await look(m)).n;
    for (let q = 1; q <= n; q++) {
      const r = await m.evaluate(() => { const on = [...document.querySelectorAll('#paper .q[data-q]:not(.xq)')].find(c => getComputedStyle(c).display !== 'none');
        const out = [...on.querySelectorAll('svg, img, table, canvas')].filter(e => e.getClientRects().length && !e.closest('.tw, .keys, [hidden]')).map(e => e.getBoundingClientRect()).filter(b => b.width && (b.right > innerWidth + 0.5 || b.left < -0.5)).length;
        return { sx: document.documentElement.scrollWidth - innerWidth, out }; });
      if (r.sx > 0 || r.out) F('390 px, ' + hash + ' question ' + q + ': ' + (r.sx > 0 ? r.sx + ' px of sideways scroll ' : '') + (r.out ? r.out + ' figure(s) past the edge' : ''));
      if (q < n) await m.tap('#pgNext');
    }
    L = await look(m); if (L.grid) F('390 px: the map is open before it is asked for');
    await m.tap('#pgMt'); L = await look(m); const ex = await m.getAttribute('#pgMt', 'aria-expanded');
    if (!L.grid || ex !== 'true') F('390 px: the map’s drawer did not open');
    const small = await m.evaluate(() => [...document.querySelectorAll('#pgPrev, #pgNext, #pgFlag, #pgMt, #pgGrid button')].filter(e => e.getClientRects().length).map(e => e.getBoundingClientRect()).filter(b => b.height < 44 || b.width < 44).length);
    if (small) F('390 px: ' + small + ' of the pager’s targets under 44 px');
  }
  await pc.close();
  if (errs.length) F('page errors: ' + errs.slice(0, 3).join(' | '));
  console.log('R. one question at a time: the test' + (lessons.length ? ' and a lesson set' : '') + (teacher ? ' (teacher copy)' : ''));
};
