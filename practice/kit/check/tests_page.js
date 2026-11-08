/* check/page.js part M — Tests A and B on a teacher copy (teacher.js, 8 Nov 2026; Croix: "be able to tweak tests a and b").
   The page is told it is on the site (window.KIT_SITE_BASE = ''); GET/PUT /teacher/api/tests/<course>/<unit> are answered
   here (page.route) by a store of one spec, and /api/items by a list of disapproved kinds:
     - first use pins two forms and PUTs them — random: two different sets, a place whose kind is disapproved drawn again (or
       left off when it has no other kind); fixed: the build's paper (a pick kept on this browser on 2 Nov moved up once);
     - pin → print → reload prints the same forms, test and key; never a set number on the student's sheet; A is not B;
     - New version (random) changes that question and its key rows only, to a key unlike the one before;
     - On the test unticked: off the printed test and key, the rest renumbered, the head's points and the tracker follow;
     - Edit — in place on a random form, the TeX fields on the fixed paper — changes the printed words and the key (and on
       the fixed paper drops the changed part's notes); what is pasted is cleaned to the kit's markup;
     - Undo, and Start over (with its confirm);
     - a pinned question whose kind is disapproved since is flagged;
     - a spec from the site that carries script, a handler or a link is drawn clean;
     - offline: the copy kept on this browser, one line saying changes are only on this computer, a change kept there, and
       sent up when the site is back (its copy unchanged since);
     - ?open=tests opens the editor; Escape closes it, focus back on its button. */
const path = require('path');
module.exports = async function partM(b, url, U, dir, fail) {
  const origin = url.replace(/\/preview\.html$/, ''), T = require('vm').runInNewContext(require('fs').readFileSync(path.join(dir, 'test.js'), 'utf8') + ';window.TEACHER_TEST', { window: {} });
  const FIXED = !T.random, M = /^([a-z]\d+)u(\d+)$/i.exec(U.id), course = M[1].toLowerCase(), unit = +M[2];
  const partsOf = it => it.type === 'parts' ? it.parts : it.type === 'solo' ? [it.part] : [it];
  const famKey = it => { const f2 = []; partsOf(it).forEach(p => { const f = p && (p.fam || (p === it.part ? it.fam : '')); if (typeof f === 'string' && f && f2.indexOf(f) < 0) f2.push(f); }); if (!f2.length && typeof it.fam === 'string') f2.push(it.fam); return f2.join('/'); };
  const PP = []; U.generate(1).sections.forEach((sec, si) => sec.items.forEach((it, ii) => PP.push({ k: PP.length, si, ii })));
  const kindsAt = k => { const out = new Set(); for (let s = 1; s <= 160; s++) out.add(famKey(U.generate(s).sections[PP[k].si].items[PP[k].ii])); return [...out]; };
  const NQ = FIXED ? T.forms[Object.keys(T.forms)[0]].reduce((t, s) => t + s.items.length, 0) : PP.length;
  /* the site: one spec, the disapproved kinds */
  let spec = null, updated = null, down = false; const puts = [], off = new Set();
  const ctx = await b.newContext({ viewport: { width: 1000, height: 900 } });
  await ctx.addInitScript(() => { window.KIT_SITE_BASE = ''; });
  await ctx.route(origin + '/api/items/**', r => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'cache-control': 'no-store' }, body: JSON.stringify({ edits: [...off].map(t => ({ target_kind: 'family', target: t, hidden: true })), custom: [], v: String(off.size) }) }));
  await ctx.route(origin + '/teacher/api/items/**', r => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'cache-control': 'no-store' }, body: JSON.stringify({ store: true, edits: [...off].map(t => ({ target_kind: 'family', target: t, hidden: true })) }) }));
  await ctx.route(origin + '/teacher/api/tests/**', r => {
    if (down) return r.abort();
    const q = r.request();
    if (q.method() === 'GET') return r.fulfill({ status: 200, contentType: 'application/json', headers: { 'cache-control': 'no-store' }, body: JSON.stringify({ store: true, spec, updated }) });
    let body = null; try { body = JSON.parse(q.postData() || 'null'); } catch (e) {}
    puts.push({ body, ctype: q.headers()['content-type'] || '', path: new URL(q.url()).pathname });
    spec = body; updated = '2026-11-08T12:00:' + String(puts.length).padStart(2, '0') + '.000Z';
    return r.fulfill({ status: 200, contentType: 'application/json', headers: { 'cache-control': 'no-store' }, body: JSON.stringify({ spec, updated }) });
  });
  const p = await ctx.newPage(), errs = []; p.on('pageerror', e => errs.push(e.message));
  const ready = async () => { await p.waitForFunction(() => window.TEACHER && window.TEACHER.ready && window.TEACHER.ready(), null, { timeout: 10000 }).catch(() => fail('M: the teacher copy did not get ready')); await p.waitForTimeout(150); };
  /* every load is a new document (a query of its own), so no page still open saves over what the check set up */
  let nav = 0;
  const load = async (q) => { await p.goto(url + '?v=' + (++nav) + (q ? '&' + q : '') + '#set-31'); await ready(); };
  /* a printout as text: the student's sheet (heads, numbers, IDs, words) and the key's rows */
  async function printed(kind, f) {
    await p.evaluate(([k, f]) => window.TEACHER.print(k, f), [kind || 'tk', f]); await p.waitForTimeout(250);
    const r = await p.evaluate(() => {
      const pv = document.getElementById('printview'), key = pv.querySelector('.pkeyform') || pv.querySelector('.pkey');
      const qs = Array.from(pv.querySelectorAll('.pq')).filter(q => !q.closest('.pkey') && !q.closest('.pkeyform'));
      const tx = e => e ? e.textContent.replace(/\s+/g, ' ').trim() : '';
      const testText = Array.from(pv.querySelectorAll('.ppage > *, .pform:not(.pkeyform)')).filter(e => !e.closest('.pkey') && !e.classList.contains('pkey') && !e.classList.contains('pkeyform')).map(tx).join(' ');
      const trs = key ? Array.from((key.querySelector('table.pkrows') || key.querySelector('table.ptab')).querySelectorAll('tr')) : [], rows = trs.map(tr => Array.from(tr.cells).map(tx)), kwhy = trs.map(tr => !!tr.querySelector('.kwhy, .kerr'));
      const trk = key && key.querySelector('.ptrack tbody tr:last-child td:nth-child(3)');
      return { head: tx(pv.querySelector('.pt2')), nums: qs.map(q => tx(q.querySelector('.num'))), ids: qs.map(q => tx(q.querySelector('.pqid .qn'))), stems: qs.map(q => tx(q.querySelector('.stem .st'))), whole: qs.map(tx),
        rows, kwhy, tracker: trk ? +tx(trk) : NaN, testText, meta: key ? tx(key.querySelector('.pmeta')) : '', bad: pv.querySelectorAll('script, img, a[href], [onerror], [onclick], [style*="color:red"]').length, html: pv.innerHTML };
    });
    await p.click('#pvClose'); await p.waitForTimeout(100);
    r.points = +((/(\d+) points/.exec(r.head) || [])[1]);
    return r;
  }
  const openEd = async () => { await p.click('.teacherbar [data-topen="tests"]'); await p.waitForTimeout(350); };
  const done = async () => { await p.click('#printview [data-tv="done"]'); await p.waitForTimeout(150); };
  const same = (a, b) => JSON.stringify(a.whole) === JSON.stringify(b.whole) && JSON.stringify(a.rows) === JSON.stringify(b.rows);

  /* 1. first use: pinned and sent up */
  let kD = -1, D = '';
  if (!FIXED) { const two = PP.find(x => kindsAt(x.k).length > 1); kD = two ? two.k : 0; D = kindsAt(kD)[0]; off.add(D); }
  /* a fixed paper: a pick kept on this browser on 2 Nov, there before the page's own scripts run (?pick2=1) */
  else await ctx.addInitScript(([key, val]) => { if (/[?&]pick2=1\b/.test(location.search)) { try { localStorage.setItem(key, val); } catch (e) {} } }, ['teacher.pick.' + T.course + '.' + T.unit, JSON.stringify(Array.from({ length: NQ }, (_, i) => i !== 2))]);
  await load(FIXED ? 'pick2=1' : '');
  const first = puts[0] && puts[0].body;
  if (!first) fail('M: first use did not send the pinned forms up');
  else {
    if (puts[0].path !== '/teacher/api/tests/' + course + '/' + unit || !/^application\/json/.test(puts[0].ctype)) fail('M: the forms went to ' + puts[0].path + ' as ' + puts[0].ctype);
    if (first.v !== 1 || first.kind !== (FIXED ? 'fixed' : 'random') || first.pick.length !== NQ) fail('M: the first spec is ' + JSON.stringify(first).slice(0, 160));
    if (FIXED) {
      if (JSON.stringify(Object.keys(first.forms)) !== JSON.stringify(Object.keys(T.forms))) fail('M: the fixed paper\'s forms are not ' + Object.keys(T.forms).join(', '));
      if (first.pick[2] !== false || first.pick.filter(x => !x).length !== 1) fail('M: the 2 Nov pick kept on this browser was not moved up: ' + JSON.stringify(first.pick));
      /* it leaves this browser once the site has it ("Saved"): wait for that answer, not only for the request */
      const gone = await p.waitForFunction(k => !localStorage.getItem(k), 'teacher.pick.' + T.course + '.' + T.unit, { timeout: 5000 }).then(() => true, () => false);
      if (!gone) fail('M: the 2 Nov pick stays on this browser after it was moved up');
    } else {
      if (!(first.forms.A.seed >= 1) || first.forms.A.seed === first.forms.B.seed) fail('M: Forms A and B are not two different sets: ' + first.forms.A.seed + ', ' + first.forms.B.seed);
      const at = (F, k) => { const s = (F.q && F.q[k] && F.q[k].seed) || (F.base && F.base[k]) || F.seed; return famKey(U.generate(s).sections[PP[k].si].items[PP[k].ii]); };
      ['A', 'B'].forEach(f => { if (first.pick[kD] !== false && at(first.forms[f], kD) === D) fail('M: Form ' + f + ' was pinned with the disapproved kind ' + D); });
    }
  }
  off.clear();
  /* 2. the same forms after a reload; the sheet never prints the set number */
  const A1 = await printed('tk', FIXED ? Object.keys(T.forms)[0] : 'A'), B1 = FIXED && Object.keys(T.forms).length < 2 ? null : await printed('tk', FIXED ? Object.keys(T.forms)[1] : 'B');
  await load();
  const A2 = await printed('tk', FIXED ? Object.keys(T.forms)[0] : 'A'), B2 = B1 ? await printed('tk', FIXED ? Object.keys(T.forms)[1] : 'B') : null;
  if (!same(A1, A2) || (B1 && !same(B1, B2))) fail('M: a reload printed other forms than were pinned');
  if (B1 && JSON.stringify(A1.whole) === JSON.stringify(B1.whole)) fail('M: Forms A and B print the same questions');
  if (/\bSet \d+/.test(A1.testText)) fail('M: the student\'s sheet prints its set number');
  if (!FIXED && !/^Set \d+ · Whole test/.test(A1.meta)) fail('M: the key does not say its set: "' + A1.meta + '"');
  if (A1.nums.some((x, i) => x !== (i + 1) + '.') || A1.tracker !== A1.points || A1.rows.length !== A1.points) fail('M: Form A is numbered ' + A1.nums.slice(0, 3).join(' ') + '…, ' + A1.points + ' points, tracker ' + A1.tracker + ', ' + A1.rows.length + ' key rows');
  const FA = FIXED ? Object.keys(T.forms)[0] : 'A', idOf = k => 'U' + unit + '·' + (k + 1);
  const picked = () => spec.pick.map((x, k) => x ? k : -1).filter(k => k >= 0);

  /* 3. On the test unticked: off the test and the key, the rest renumbered, the points and the tracker follow */
  const kL = picked()[1];
  await openEd(); await p.click('#printview .tvstrip[data-k="' + kL + '"] .tvon'); await p.waitForTimeout(200); await done();
  const A3 = await printed('tk', FA), gone = A2.rows.filter(r => r[2] === idOf(kL)).length;
  if (spec.pick[kL] !== false) fail('M: unticking On the test was not saved');
  if (A3.ids.indexOf(idOf(kL)) >= 0 || A3.rows.some(r => r[2] === idOf(kL))) fail('M: a question left off is still on the test or its key');
  if (A3.nums.length !== A2.nums.length - 1 || A3.nums.some((x, i) => x !== (i + 1) + '.')) fail('M: the questions left are not renumbered: ' + A3.nums.join(' '));
  if (A3.points !== A2.points - gone || A3.tracker !== A3.points || A3.rows.length !== A3.points) fail('M: the points (' + A3.points + ') or the tracker (' + A3.tracker + ') did not follow the ' + gone + ' left off ' + A2.points);

  /* 4. New version (random): that question and its key rows only */
  if (!FIXED) {
    const kN = picked()[3];
    await openEd(); await p.click('#printview [data-tv="new"][data-k="' + kN + '"]'); await p.waitForTimeout(250);
    const tag = await p.evaluate(k => (document.querySelector('#printview .tvstrip[data-k="' + k + '"] .tvtag') || {}).textContent || '', kN);
    if (!/New version/.test(tag) || !/Undo/.test(tag)) fail('M: a new version is not tagged with Undo: "' + tag + '"');
    await done();
    const A4 = await printed('tk', FA), i = A3.ids.indexOf(idOf(kN));
    if (!spec.forms.A.q[kN] || !spec.forms.A.q[kN].seed) fail('M: New version was not saved');
    if (A4.whole[i] === A3.whole[i]) fail('M: New version did not change question ' + idOf(kN));
    if (A4.whole.some((w, j) => j !== i && w !== A3.whole[j])) fail('M: New version changed another question');
    const r3 = A3.rows.filter(r => r[2] === idOf(kN)).map(r => r[1]), r4 = A4.rows.filter(r => r[2] === idOf(kN)).map(r => r[1]);
    if (JSON.stringify(A4.rows.filter(r => r[2] !== idOf(kN))) !== JSON.stringify(A3.rows.filter(r => r[2] !== idOf(kN)))) fail('M: New version changed another key row');
    if (r4.some(x => r3.indexOf(x) >= 0)) fail('M: the new version\'s key is the old one\'s: ' + r4.join(' | '));
    if (!/· 1 question changed/.test(A4.meta)) fail('M: the key does not say a question changed: "' + A4.meta + '"');
    /* a pinned question whose kind is disapproved since: flagged */
    off.add(famKey(U.generate(spec.forms.A.seed).sections[PP[picked()[0]].si].items[PP[picked()[0]].ii]));
    await load(); await openEd();
    const flag = await p.evaluate(k => (document.querySelector('#printview .tvstrip[data-k="' + k + '"] .tvflag') || {}).textContent || '', picked()[0]);
    if (!/Disapproved kind/.test(flag)) fail('M: a pinned question of a disapproved kind is not flagged');
    off.clear(); await done();
  }

  /* 5. Edit: the printed words and the key change; Undo puts them back */
  const before = await printed('tk', FA);
  let kE = -1;
  await openEd();
  if (!FIXED) {
    for (const k of picked()) {
      await p.click('#printview [data-tv="edit"][data-k="' + k + '"]'); await p.waitForTimeout(200);
      if (await p.$('#printview .tvediting [data-ed^="key:"]')) { kE = k; break; }
      await p.click('#printview [data-tv="cancel"]'); await p.waitForTimeout(100);
    }
    if (kE < 0) fail('M: no question of the form has a typed key to edit');
    else {
      const ui = await p.evaluate(() => ({ eds: document.querySelectorAll('#printview .tvediting [contenteditable="true"]').length, figs: document.querySelectorAll('#printview .tvediting svg [contenteditable], #printview .tvediting .tfig[contenteditable]').length, save: !!document.querySelector('#printview .tvediting [data-tv="save"]') }));
      if (!ui.eds || ui.figs || !ui.save) fail('M: Edit is not in place on the paper: ' + JSON.stringify(ui));
      await p.evaluate(() => {
        const s = document.querySelector('#printview .tvediting [data-ed="stem"]'); s.insertAdjacentText('afterbegin', 'EDITED ');
        s.insertAdjacentHTML('beforeend', ' <img alt="" onerror="window.__bad=1"><a href="javascript:alert(1)">link</a> <b style="color:red" onclick="window.__bad=2">bold</b><script>window.__bad=3</script>');   /* as a paste would bring it (no src: nothing loads here) */
        const k = document.querySelector('#printview .tvediting [data-ed^="key:"]'); k.textContent = 'x = 4242';
      });
      await p.click('#printview [data-tv="save"]'); await p.waitForTimeout(250);
      const ed = spec.forms.A.q[kE] && spec.forms.A.q[kE].ed;
      if (!ed || !/^EDITED /.test(ed.stem) || !/<b>bold<\/b>/.test(ed.stem) || /img|onerror|href|style|onclick|script/i.test(ed.stem)) fail('M: an edit was not saved clean: ' + JSON.stringify(ed));
    }
  } else {
    kE = picked()[0];
    await p.click('#printview [data-tv="edit"][data-k="' + kE + '"]'); await p.waitForTimeout(200);
    const fx = await p.evaluate(() => Array.from(document.querySelectorAll('#printview .tvedq [data-fx]')).map(e => e.dataset.fx));
    if (fx.indexOf('stem') < 0) fail('M: Edit on the fixed paper has no field for the question\'s words');
    await p.fill('#printview [data-fx="stem"]', (await p.inputValue('#printview [data-fx="stem"]')) + ' EDITED');
    const ans = fx.find(x => /^(a|p\d+a)$/.test(x)), ch = fx.find(x => /c0$/.test(x));
    if (ans) await p.fill('#printview [data-fx="' + ans + '"]', '$4242$'); else if (ch) await p.fill('#printview [data-fx="' + ch + '"]', '$4242$');
    const prev = await p.evaluate(() => (document.querySelector('#printview .tvedq .tvprev') || {}).textContent || '');
    if (!/EDITED/.test(prev) || !/4242/.test(prev)) fail('M: the paper above the fields did not redraw as they were typed');
    await p.click('#printview [data-tv="save"]'); await p.waitForTimeout(250);
    if (!spec.forms[FA].q[kE] || !spec.forms[FA].q[kE].ed) fail('M: an edit to the fixed paper was not saved');
  }
  await done();
  if (kE >= 0) {
    const A5 = await printed('tk', FA), i = A5.ids.indexOf(idOf(kE)), rows = A5.rows.filter(r => r[2] === idOf(kE)).map(r => r[1]).join(' | ');
    if (!(FIXED ? /EDITED/.test(A5.stems[i]) : /^EDITED /.test(A5.stems[i]))) fail('M: the printed test does not have the edited words: ' + A5.stems[i]);
    if (!/4242/.test(rows)) fail('M: the printed key does not have the edited answer: ' + rows);
    if (A5.bad || /onerror|onclick|javascript:/i.test(A5.html)) fail('M: an edit printed markup the kit does not use');
    if (FIXED){ const j = A5.rows.findIndex(r => r[2] === idOf(kE) && /4242/.test(r[1])); if (j >= 0 && A5.kwhy[j]) fail('M: an answer changed on the fixed paper still prints its old notes'); }
    await openEd(); await p.click('#printview .tvstrip[data-k="' + kE + '"] [data-tv="undo"]'); await p.waitForTimeout(200); await done();
    const A6 = await printed('tk', FA);
    if (!same(A6, before)) fail('M: Undo did not put the question back as it was');
  }

  /* 6. Start over, with its confirm */
  await openEd(); await p.click('#printview [data-tv="edit"][data-k="' + picked()[0] + '"]'); await p.waitForTimeout(150);
  if (FIXED) { await p.fill('#printview [data-fx="stem"]', 'START OVER ME'); } else { await p.evaluate(() => { document.querySelector('#printview .tvediting [data-ed="stem"]').textContent = 'START OVER ME'; }); }
  await p.click('#printview [data-tv="save"]'); await p.waitForTimeout(200);
  const seed0 = spec.forms[FA].seed;
  await p.click('#printview [data-tv="restart"]'); await p.waitForTimeout(100);
  const conf = await p.evaluate(() => { const c = document.getElementById('tvConfirm'); return c && !c.hidden ? c.textContent : ''; });
  if (!/over|back/i.test(conf)) fail('M: Start over did not ask first');
  await p.click('#tvYes'); await p.waitForTimeout(250); await done();
  const A7 = await printed('tk', FA);
  if (A7.testText.indexOf('START OVER ME') >= 0) fail('M: Start over kept an edit');
  if (!FIXED && spec.forms.A.seed === seed0) fail('M: Start over did not draw a new Form A');
  if (FIXED && Object.keys(spec.forms[FA].q).length) fail('M: Start over did not put the paper back');

  /* 7. a spec from the site carrying script, a handler, a link: drawn clean */
  const k0 = picked()[0], evil = FIXED ? { stem: 'Evil <script>window.__y=1</script> <img src=x onerror="window.__x=1"> $\\href{javascript:alert(1)}{x}$' } : { stem: 'Evil <img src="x" onerror="window.__x=1"><script>window.__y=1</script><a href="javascript:alert(1)">link</a> <span class="m" onclick="window.__x=2" style="color:red">2</span>' };
  spec = JSON.parse(JSON.stringify(spec)); spec.forms[FA].q[k0] = { ed: evil };
  await load();
  const A8 = await printed('tk', FA);
  if (!/Evil/.test(A8.testText)) fail('M: a tweak from the site was not drawn');
  if (A8.bad || await p.evaluate(() => window.__x || window.__y)) fail('M: a tweak from the site drew script, a handler or a link');

  /* 8. offline: the copy kept on this browser, the line, a change kept, sent up when the site is back */
  delete spec.forms[FA].q[k0];
  await load(); const A9 = await printed('tk', FA), nPut = puts.length;
  down = true; await load();
  const offl = await p.evaluate(() => ({ mode: window.TEACHER.mode(), note: (document.getElementById('tbNote') || {}).textContent || '', shown: !document.getElementById('tbNote').hidden }));
  if (offl.mode === 'site' || !offl.shown || !/Changes are only on this computer/.test(offl.note)) fail('M: offline, the bar does not say changes are only on this computer: ' + JSON.stringify(offl));
  const A10 = await printed('tk', FA);
  if (!same(A10, A9)) fail('M: offline, the page did not print the copy kept on this browser');
  const kO = picked()[2];
  await openEd(); await p.click('#printview .tvstrip[data-k="' + kO + '"] .tvon'); await p.waitForTimeout(200); await done();
  await load();
  const A11 = await printed('tk', FA);
  if (A11.ids.indexOf(idOf(kO)) >= 0) fail('M: offline, a change was not kept on this browser');
  down = false; await load();
  if (puts.length <= nPut || spec.pick[kO] !== false) fail('M: back on the site, the change made offline was not sent up');

  /* 9. ?open=tests: the editor at once; Escape closes it, focus back on its button */
  await load('open=tests'); await p.waitForTimeout(400);
  const op = await p.evaluate(() => ({ cls: document.getElementById('printview') && document.getElementById('printview').className, small: Array.from(document.querySelectorAll('#printview .tvstrip button, #printview .tvon, #printview .tvacts button')).filter(x => x.getBoundingClientRect().height && x.getBoundingClientRect().height < 44).length }));
  if (!/tv-tests/.test(op.cls)) fail('M: ?open=tests did not open Tests A and B');
  if (op.small) fail('M: ' + op.small + ' of the editor\'s controls are under 44 px');
  await p.keyboard.press('Escape'); await p.waitForTimeout(150);
  const cl = await p.evaluate(() => ({ hidden: document.getElementById('printview').hidden, focus: document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.topen : '' }));
  if (!cl.hidden || cl.focus !== 'tests') fail('M: Escape did not close Tests A and B with the focus back on its button');
  if (errs.length) fail('M: page errors: ' + errs.slice(0, 3).join(' | '));
  await ctx.close();
  console.log('M. Tests A and B checked: ' + (FIXED ? 'the fixed paper (' + Object.keys(T.forms).join(', ') + ')' : 'two random forms') + ', ' + NQ + ' questions, ' + puts.length + ' saves');
};
