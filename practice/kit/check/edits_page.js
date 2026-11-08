/* check/page.js part L — the edits layer in a real browser (edits.js, 7 Nov 2026). The page is told the site is at
   https://edits.test (window.KIT_EDITS_BASE) and that address is answered here (page.route) with edits made from the unit's
   own survey: one family's stem reworded, one family hidden, a part worth 2, and two custom questions (a number in the first
   section, a choice in "More questions"). Then:
     the edited stem is on the screen, on the printed worksheet and in its key's place; the hidden family is not in a new set
     and its points are gone from the total (and the edited part's extra point is in it); the custom number question is in
     its section with its ID U<n>·C1, its key typed is ✓ on the first check and a wrong answer is not; the choice question is
     in "More questions"; no request leaves the page but the one for the edits; a set saved before the edits keeps its
     composition (the hidden family stays in it) until "Start over"; with the address failing the page is the plain page.
   On a teacher copy: the printed test (one form) has the edited stem, without the hidden family, with the custom questions,
   and its key marks the edited question "Edited" and the custom ones "Added". */
const E = require('../edits.js');
module.exports = async function partK(b, url, U, dir, fail) {
  const F = E.survey(U, U.view, 400);
  const famT = F.find(f => f.fields.stem.editable && f.fields.stem.variants.length === 1 && f.fields.stem.variants[0].ph.length && f.si === 0) || F.find(f => f.fields.stem.editable && f.fields.stem.variants.length === 1);
  const famH = F.find(f => f !== famT && f.si === 0 && f.type !== 'parts') || F.find(f => f !== famT);
  const famP = F.find(f => f !== famT && f !== famH && f.type === 'parts');
  if (!famT || !famH) { fail('L: the survey found no family to edit'); return; }
  const v = famT.fields.stem.variants[0], WORD = 'Edited by the teacher:';
  const data = { edits: [
      { target_kind: 'family', target: famT.fk, stem: { [v.vh]: { t: WORD + ' ' + v.tpl, ph: v.ph } } },
      { target_kind: 'family', target: famH.fk, hidden: true }].concat(famP ? [{ target_kind: 'family', target: famP.fk, points: { [famP.parts[0].label]: 2 } }] : []),
    custom: [{ id: 'aa11bb22', section: '0', stem: 'What is $3 \\times 4$, plus one?', type: 'number', key: { answer: '13' }, solution: '$3 \\times 4 = 12$\n$12 + 1 = 13$', points: 1, position: 0 },
      { id: 'cc33dd44', section: 'extra', stem: 'Which is greater?', type: 'mc', key: { options: ['$\\frac{1}{2}$', '$\\frac{2}{3}$'], correct: 1 }, solution: 'Compare $\\frac{3}{6}$ and $\\frac{4}{6}$.', points: 1, position: 1 }], v: 'k1' };
  const teacher = /teacher/.test(require('path').basename(dir));
  const ctx = await b.newContext({ viewport: { width: 1000, height: 900 } });
  await ctx.addInitScript(() => { window.KIT_EDITS_BASE = 'https://edits.test'; });
  let calls = 0, off = [];
  await ctx.route('https://edits.test/**', r => { calls++; return r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(data) }); });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  p.on('request', r => { const u = r.url(); if (!u.startsWith(url.split('/preview.html')[0]) && !u.startsWith('https://edits.test') && !u.startsWith('data:')) off.push(u); });
  /* the plain page first (the total before the edits): a context that is not told about the site */
  const ctx0 = await b.newContext(); const p0 = await ctx0.newPage(); await p0.goto(url + '#set-4821'); await p0.waitForTimeout(400);
  const plain = await p0.evaluate(() => ({ total: parseInt(document.getElementById('total').textContent, 10) })); await ctx0.close();
  const fresh = async seed => { await p.evaluate(() => { try { localStorage.clear(); } catch (e) {} }); await p.goto(url + '#set-' + seed); await p.reload(); await p.waitForTimeout(500); };
  await fresh(4821);
  const s = await p.evaluate(([fk, hk]) => {
    const qs = Array.from(document.querySelectorAll('#paper .q[data-q]:not(.xq)'));
    return { calls: 0, total: parseInt(document.getElementById('total').textContent, 10), stems: qs.map(q => (q.querySelector('.stem .st') || {}).textContent || ''),
      skills: qs.map(q => (q.querySelector('.qid .qsk') || {}).textContent || ''), ids: qs.map(q => (q.querySelector('.qid .qn') || {}).textContent || ''),
      secs: Array.from(document.querySelectorAll('.sechead h2')).map(h => h.textContent), marks: document.querySelectorAll('.qed').length };
  }, [famT.fk, famH.fk]);
  if (calls < 1) fail('L: the page did not ask the site for its edits');
  if (!s.stems.some(t => t.startsWith(WORD))) fail('L: the edited stem is not on the screen: ' + s.stems.slice(0, 4).join(' | '));
  if (s.skills.some(t => t.replace(/^·\s*/, '') === famH.fk)) fail('L: the hidden family ' + famH.fk + ' is in a new set');
  const want = plain.total - famH.parts.length + (famP ? 1 : 0) + 2;
  if (s.total !== want) fail(`L: the total is ${s.total}, not ${want} (${plain.total} − ${famH.parts.length} hidden + ${famP ? 1 : 0} extra + 2 custom)`);
  if (!s.ids.includes('U' + (U.id.match(/u(\d+)$/) || [])[1] + '·C1') || !s.ids.includes('U' + (U.id.match(/u(\d+)$/) || [])[1] + '·C2')) fail('L: the custom questions are not U·C1 and U·C2: ' + s.ids.join(' '));
  if (s.secs[s.secs.length - 1] !== 'More questions') fail('L: no "More questions" section at the end: ' + s.secs.join(' | '));
  if (!teacher && s.marks) fail('L: a student page shows the "Edited" marker');
  if (teacher && !s.marks) fail('L: the teacher copy does not mark the edited questions');
  /* the custom number question: its key, then a wrong answer on a fresh page */
  const cid = await p.evaluate(() => { const q = Array.from(document.querySelectorAll('#paper .q[data-q]')).find(x => /·C1$/.test((x.querySelector('.qid .qn') || {}).textContent || '')); return q ? q.getAttribute('data-q') : null; });
  if (!cid) fail('L: the custom question is not on the page');
  else {
    if (!teacher) {
      await p.fill('#a' + cid, '13'); await p.evaluate(id => document.querySelector('[data-check="' + id + '"]').click(), cid); await p.waitForTimeout(150);
      const r = await p.evaluate(id => { const h = document.querySelector('[data-host="' + id + '"]'); return { right: h.classList.contains('is-right'), sim: !!document.querySelector('[data-another="' + id + '"]') }; }, cid);
      if (!r.right) fail('L: the custom question\'s key is not right on the first check');
      if (r.sim) fail('L: a custom question offers "Try a similar one"');
      await fresh(4822);
      await p.fill('#a' + cid, '12'); await p.evaluate(id => document.querySelector('[data-check="' + id + '"]').click(), cid); await p.waitForTimeout(150);
      if (!(await p.evaluate(id => document.querySelector('[data-host="' + id + '"]').classList.contains('is-wrong'), cid))) fail('L: a wrong answer to the custom question is not marked wrong');
      await fresh(4823);
      /* the printed worksheet and its key */
      await p.click('#bMore'); await p.click('#bPrint'); await p.click('[data-print="wk"]'); await p.waitForTimeout(150);
      const pr = await p.evaluate(() => ({ stems: Array.from(document.querySelectorAll('#printview .pq .stem .st')).map(e => e.textContent), keys: Array.from(document.querySelectorAll('#printview .pkey tr')).map(r => r.textContent) }));
      if (!pr.stems.some(t => t.startsWith(WORD))) fail('L: the printed worksheet does not have the edited stem');
      if (!pr.keys.some(t => /13/.test(t) && /·C1/.test(t))) fail('L: the worksheet\'s key has no row for the custom question with its key 13');
      await p.evaluate(() => { const c = document.getElementById('pvClose'); if (c) c.click(); });
    } else {
      await p.evaluate(() => window.PracticePrint.forms(1, 'Test')); await p.waitForTimeout(250);
      const pr = await p.evaluate(() => ({ stems: Array.from(document.querySelectorAll('#printview .pform:not(.pkeyform) .pq .stem .st')).map(e => e.textContent), keys: Array.from(document.querySelectorAll('#printview .pkeyform tr')).map(r => r.textContent), head: (document.querySelector('#printview .pt2') || {}).textContent || '' }));
      if (!pr.stems.some(t => t.startsWith(WORD))) fail('L: the teacher copy\'s printed test does not have the edited stem');
      if (!pr.keys.some(t => /Edited/.test(t))) fail('L: the printed key does not mark the edited question');
      if (!pr.keys.some(t => /13/.test(t) && /Added/.test(t))) fail('L: the printed key has no "Added" row for the custom question with its key');
      if (!new RegExp('\\b' + want + ' points').test(pr.head)) fail('L: the printed test\'s head does not say ' + want + ' points: ' + pr.head);
    }
  }
  /* a set saved before the edits keeps its composition until Start over */
  const ctx2 = await b.newContext({ viewport: { width: 1000, height: 900 } }); const p2 = await ctx2.newPage();
  await p2.goto(url + '#set-777'); await p2.waitForTimeout(300);
  const first = await p2.evaluate(() => { const i = document.querySelector('#paper input[type=text]'); return i ? i.id : null; });
  if (first) { await p2.fill('#' + first, '1'); await p2.evaluate(id => document.querySelector('[data-check="' + id.slice(1) + '"]').click(), first); await p2.waitForTimeout(100); }
  await ctx2.addInitScript(() => { window.KIT_EDITS_BASE = 'https://edits.test'; });
  await ctx2.route('https://edits.test/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) }));
  await p2.goto(url + '#set-777'); await p2.reload(); await p2.waitForTimeout(500);
  const kept = await p2.evaluate(fk => ({ hid: Array.from(document.querySelectorAll('.qid .qsk')).some(e => e.textContent.replace(/^·\s*/, '') === fk), notice: !document.getElementById('notice').hidden }), famH.fk);
  if (first && (!kept.hid || kept.notice)) fail('L: a set saved before the edits did not keep its composition (the hidden family) or was reset');
  /* the edits address failing: the plain page */
  const ctx3 = await b.newContext(); await ctx3.addInitScript(() => { window.KIT_EDITS_BASE = 'https://edits.test'; });
  await ctx3.route('https://edits.test/**', r => r.abort()); const p3 = await ctx3.newPage(); const e3 = []; p3.on('pageerror', e => e3.push(e.message));
  await p3.goto(url + '#set-4821'); await p3.waitForTimeout(600);
  const t3 = await p3.evaluate(() => parseInt(document.getElementById('total').textContent, 10));
  if (t3 !== plain.total || e3.length) fail('L: with the edits address failing the page is not the plain page (' + t3 + ', ' + e3.join('; ') + ')');
  if (off.length) fail('L: the page asked for something off the page: ' + off.slice(0, 3).join(' '));
  if (errs.length) fail('L: page errors: ' + errs.slice(0, 3).join(' | '));
  await ctx.close(); await ctx2.close(); await ctx3.close();
  console.log(`page L (edits): ${famT.fk} reworded, ${famH.fk} hidden, ${famP ? famP.fk + ' part ' + famP.parts[0].label + ' worth 2, ' : ''}two custom questions — total ${want} (was ${plain.total})`);
};
