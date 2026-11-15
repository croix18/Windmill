/* check/page.js part T — several boxes in one part (15 Nov 2026; ui.js "several boxes in one part"), on a unit that has one
   (view.boxes(part) gives two or more over sets 1–300; else skipped). On the student page and the teacher copy:
   - the boxes: one input per box (#a<id>, #a<id>_1 …), each with its label shown and its own name for a screen reader ("Answer to
     question 12, x"), the group named; Tab goes box → box → Check → Hint;
   - the boxes on one line at 360, 390 and 1280 px (they fit there), nothing past the screen's edge;
   - EVERY part with boxes in the unit (each boxed place of the test, from as many sets as it takes), at 360, 390 and 1280 px: each
     box's label and unit on its box's row, the Check button on the screen, nothing past the screen's edge; boxes without a unit
     ("x = ▢  y = ▢") on one line; on a phone (≤ 480 px) boxes with a unit ("after ▢ weeks") a row each (15 Nov 2026, evening);
   - a box left empty is not a try ("Not counted yet", "Fill in every box"); Enter in a box with the next one empty goes to it;
   - the key, one string per box: ✓ Correct on the first try and the point; the saved answer is one string per box, the boxes
     locked; after a reload every box holds its own string;
   - a wrong pair (the key's boxes the other way round, else 987654 in each): ✗ Not yet with the coach's words, one try; the help
     ladder's worked solution; "Try a similar one" with its own boxes, ✓ with its key;
   - Like the real test: one box filled at Finish is a miss that says "Fill in every box"; both filled and right, right at Finish;
   - print: the worksheet has a blank per box with its label; the key's row is the unit's key; My results shows each box;
   - on a touch screen the keypad comes to the box being typed in and a key goes in at its caret;
   - one question at a time (the pager, as students have it): the map says "answered" only when every box is filled. */
'use strict';
const path = require('path');
const { boxesOf, boxSel } = require('./boxes.js');
module.exports = async function partT(b, rawContext, url, U, dir, fail) {
  const F = m => fail('T. several boxes: ' + m), teacher = /^teacher$/.test(path.basename(dir));
  /* the first set (from 4821, then 1–300) with a part that has boxes */
  const find = seed => { const g = U.generate(seed); let qn = 0, hit = null;
    g.sections.forEach((sec, si) => sec.items.forEach((it, ii) => { qn++; if (hit) return;
      const ps = it.type === 'parts' ? it.parts.map(p => ({ p, id: qn + p.label })) : it.type === 'solo' ? [{ p: it.part, id: String(qn) }] : [];
      ps.forEach(({ p, id }) => { if (!hit && boxesOf(U, p)) hit = { seed, id, x: p, qn, pos: si + '.' + ii }; }); }));
    return hit; };
  let T = find(4821); for (let s = 1; !T && s <= 300; s++) T = find(s);
  if (!T) { console.log('T. no part with several boxes — skipped'); return; }
  const B = boxesOf(U, T.x), n = B.length, key = U.keyText(T.x), id = T.id;
  if (!Array.isArray(key) || key.length !== n) { F('Unit.keyText gives ' + JSON.stringify(key) + ' for a part with ' + n + ' boxes (one string per box)'); return; }
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }), p = await ctx.newPage(), errs = [];
  p.on('pageerror', e => errs.push(e.message));
  /* a clean start: the page saves a running set as it is put away (pagehide, the clock's pause), so: clear, reload, clear, reload */
  const clear = pg => pg.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
  const fresh = async (pg, seed) => { await pg.goto(url + '#set-' + seed); for (let k = 0; k < 2; k++) { await clear(pg); await pg.reload(); await pg.waitForSelector('#paper .q', { state: 'attached' }); } await pg.waitForTimeout(120); };
  /* one box at a time (a Locator's fill: check/boxes.js wires page.fill to fill every box of the part) */
  const put = (pg, sel, v) => pg.locator(sel).fill(v == null ? '' : String(v));
  const fillBoxes = async (pg, pid, vals) => { for (let k = 0; k < n; k++) await put(pg, boxSel(pid, k), vals[k]); };
  const check = (pg, pid) => pg.evaluate(i => document.querySelector('[data-check="' + i + '"]').click(), pid);
  const st = pg => pg.evaluate(([pre, seed]) => JSON.parse(localStorage.getItem(pre + 'set.' + seed + '.all') || 'null'), [U.id + '.', T.seed]);
  const card = (pg, pid) => pg.$eval('#fb' + pid, e => e.innerText.replace(/\s+/g, ' ').trim()).catch(() => '');
  await fresh(p, T.seed);

  /* the boxes, their names and the keyboard's order */
  const dom = await p.evaluate(([id, n]) => { const out = [];
    for (let k = 0; k < n; k++) { const e = document.getElementById('a' + id + (k ? '_' + k : '')); if (!e) { out.push(null); continue; }
      const pre = e.parentNode.querySelector('.pre'); out.push({ label: e.getAttribute('aria-label') || '', part: e.getAttribute('data-part'), box: e.getAttribute('data-box'), pre: pre ? pre.textContent.trim() : '', shown: !!(pre && pre.getBoundingClientRect().width > 0) }); }
    const g = document.getElementById('a' + id) && document.getElementById('a' + id).closest('[role=group]');
    return { boxes: out, group: g ? g.getAttribute('aria-label') : '', extra: !!document.getElementById('a' + id + '_' + n) }; }, [id, n]);
  dom.boxes.forEach((d, k) => {
    if (!d) { F('box ' + (k + 1) + ' of ' + n + ' (#' + boxSel(id, k).slice(1) + ') is not on the page'); return; }
    const say = B[k].say || d.pre.replace(/\s*=\s*$/, '');
    if (!/question \S+/.test(d.label) || (say && d.label.indexOf(say) < 0)) F('box ' + (k + 1) + ' is named "' + d.label + '" (it should say its question and "' + say + '")');
    if (d.part !== id || d.box !== String(k)) F('box ' + (k + 1) + ' is not marked as its part\'s');
    if (B[k].pre && !d.shown) F('box ' + (k + 1) + '\'s label is not shown');
  });
  if (!/\d+ boxes/.test(dom.group)) F('the boxes are not a named group: "' + dom.group + '"');
  if (dom.extra) F('more boxes on the page than the unit gives');
  { await p.focus(boxSel(id, 0)); const order = [];
    for (let k = 0; k < n + 1; k++) { await p.keyboard.press('Tab'); order.push(await p.evaluate(() => { const a = document.activeElement; return a ? (a.id || (a.dataset && (a.dataset.check ? 'check' : a.dataset.rung ? 'hint' : '')) || a.tagName) : ''; })); }
    const want = B.slice(1).map((x, k) => boxSel(id, k + 1).slice(1)).concat(['check', 'hint']);
    if (order.join(',') !== want.join(',')) F('Tab from the first box goes ' + order.join(' → ') + ', not ' + want.join(' → ')); }
  /* one line where they fit, at three widths (boxes with a unit take a row each on a phone: measured below, with every boxed part) */
  const withUnit = B.some(x => x.unit);
  for (const w of (withUnit ? [1280] : [360, 390, 1280])) {
    await p.setViewportSize({ width: w, height: 844 }); await p.waitForTimeout(60);
    const r = await p.evaluate(([id, n]) => { const tops = [], rights = []; for (let k = 0; k < n; k++) { const e = document.getElementById('a' + id + (k ? '_' + k : '')), b = e.getBoundingClientRect(); tops.push(Math.round(b.top)); rights.push(b.right); }
      return { tops, right: Math.max.apply(null, rights), vw: document.documentElement.clientWidth, sw: document.documentElement.scrollWidth, wd: Math.round(document.getElementById('a' + id).getBoundingClientRect().width) }; }, [id, n]);
    if (Math.max.apply(null, r.tops) - Math.min.apply(null, r.tops) > 3) F('at ' + w + ' px the boxes are not on one line (tops ' + r.tops.join(', ') + ')');
    if (r.right > r.vw + 0.5 || r.sw > r.vw + 1) F('at ' + w + ' px a box goes past the screen (' + Math.round(r.right) + ' of ' + r.vw + ')');
    if (r.wd < 44) F('at ' + w + ' px a box is ' + r.wd + ' px wide');
  }
  await p.setViewportSize({ width: 390, height: 844 });

  /* every part with boxes, at three widths: the label and the unit on the box's row, Check on the screen, nothing past the edge;
     no unit → one line; a unit, on a phone → a row each. Each boxed place of the test (section, item, part — and each way its boxes
     are labeled, so a story in dollars and one in centimeters are both measured) is found from set 4821, then 1–300; a set is opened
     once for all its places. */
  { const places = {}, bySeed = {};
    const scan = seed => { const g = U.generate(seed); let qn = 0;
      g.sections.forEach((sec, si) => sec.items.forEach((it, ii) => { qn++;
        const ps = it.type === 'parts' ? it.parts.map(q => ({ q, id: qn + q.label, pl: si + '.' + ii + '.' + q.label })) : it.type === 'solo' ? [{ q: it.part, id: String(qn), pl: si + '.' + ii }] : [];
        ps.forEach(({ q, id, pl }) => { const bx = boxesOf(U, q); if (!bx) return; pl += '|' + bx.map(x => (x.pre || '') + '▢' + (x.unit || '')).join(' '); if (places[pl]) return; places[pl] = 1; (bySeed[seed] = bySeed[seed] || []).push({ id, n: bx.length, unit: bx.map(x => !!x.unit) }); }); })); };
    scan(4821); for (let s = 1; s <= 300; s++) scan(s);
    let nMeas = 0;
    for (const seed of Object.keys(bySeed)) {
      await fresh(p, +seed);
      for (const w of [360, 390, 1280]) {
        await p.setViewportSize({ width: w, height: 844 }); await p.waitForTimeout(60);
        for (const P of bySeed[seed]) {
          const r = await p.evaluate(([id, n]) => { const vw = document.documentElement.clientWidth, out = { vw, sw: document.documentElement.scrollWidth, boxes: [] };
            const R = e => { if (!e) return null; const b = e.getBoundingClientRect(); return b.width || b.height ? { t: b.top, b: b.bottom, l: b.left, r: b.right, m: (b.top + b.bottom) / 2 } : null; };
            for (let k = 0; k < n; k++) { const e = document.getElementById('a' + id + (k ? '_' + k : '')); if (!e) { out.boxes.push(null); continue; } const bx = e.closest('.bx');
              out.boxes.push({ inp: R(e), pre: R(bx && bx.querySelector('.pre')), unit: R(bx && bx.querySelector('.unit')) }); }
            out.chk = R(document.querySelector('[data-check="' + id + '"]')); return out; }, [P.id, P.n]);
          const at = 'part ' + P.id + ' (set ' + seed + ') at ' + w + ' px: '; nMeas++;
          if (r.boxes.some(x => !x || !x.inp)) { F(at + 'a box is not shown'); continue; }
          r.boxes.forEach((x, k) => { const row = y => y.m >= x.inp.t - 2 && y.m <= x.inp.b + 2;
            if (x.pre && !row(x.pre)) F(at + 'box ' + (k + 1) + '\'s label is not on its box\'s row (label ' + Math.round(x.pre.m) + ', box ' + Math.round(x.inp.t) + '–' + Math.round(x.inp.b) + ')');
            if (x.unit && !row(x.unit)) F(at + 'box ' + (k + 1) + '\'s unit is not on its box\'s row (unit ' + Math.round(x.unit.m) + ', box ' + Math.round(x.inp.t) + '–' + Math.round(x.inp.b) + ')');
            [x.inp, x.pre, x.unit].forEach(y => { if (y && (y.r > r.vw + 0.5 || y.l < -0.5)) F(at + 'box ' + (k + 1) + ' goes past the screen\'s edge (' + Math.round(y.r) + ' of ' + r.vw + ')'); }); });
          if (!r.chk || r.chk.r > r.vw + 0.5 || r.chk.l < -0.5) F(at + 'the Check button is off the screen');
          if (r.sw > r.vw + 1) F(at + 'the page scrolls sideways (' + r.sw + ' of ' + r.vw + ')');
          const tops = r.boxes.map(x => Math.round(x.inp.t)), units = P.unit.some(Boolean);
          if (!units && Math.max.apply(null, tops) - Math.min.apply(null, tops) > 3) F(at + 'boxes without a unit are not on one line (tops ' + tops.join(', ') + ')');
          if (units && w <= 480) for (let k = 1; k < tops.length; k++) if (r.boxes[k].inp.t < r.boxes[k - 1].inp.b - 2) F(at + 'boxes with a unit share a row on a phone (tops ' + tops.join(', ') + ')');
        }
      }
    }
    await p.setViewportSize({ width: 390, height: 844 }); await fresh(p, T.seed);
    T.every = Object.keys(places).length + ' boxed places, ' + nMeas + ' measured'; }

  /* a box left empty is not a try; Enter goes on to the empty box */
  await fillBoxes(p, id, [key[0]].concat(Array(n - 1).fill(''))); await check(p, id); await p.waitForTimeout(60);
  { const c = await card(p, id), S = await st(p); if (!/Not counted yet/.test(c) || !/Fill in every box/.test(c)) F('one box filled: the card says "' + c.slice(0, 90) + '"');
    if (S && S.res && S.res[id] && S.res[id].tries) F('one box filled was counted as a try'); }
  await p.focus(boxSel(id, 0)); await p.press(boxSel(id, 0), 'Enter'); await p.waitForTimeout(40);
  { const a = await p.evaluate(() => document.activeElement && document.activeElement.id); if (a !== boxSel(id, 1).slice(1)) F('Enter in the first box with the next one empty went to ' + a); }

  /* a wrong answer: the key's boxes the other way round (a named mistake on most units), else 987654 in each */
  const rev = key.slice().reverse(), wrong = JSON.stringify(rev) !== JSON.stringify(key) && U.judge.text(T.x, rev, { aShown: true, mode: 'practice' }).v === 'wrong' ? rev : key.map(() => '987654');
  await fillBoxes(p, id, wrong); await p.press(boxSel(id, n - 1), 'Enter'); await p.waitForTimeout(60);
  { const c = await card(p, id), S = await st(p); if (!/^✗ Not yet \S/.test(c)) F('a wrong pair ' + JSON.stringify(wrong) + ': the card says "' + c.slice(0, 90) + '"');
    if (!S || !S.res[id] || S.res[id].tries !== 1) F('a wrong pair is not one try: ' + JSON.stringify(S && S.res[id]));
    if (!S || JSON.stringify(S.ans[id]) !== JSON.stringify(wrong)) F('the saved answer is ' + JSON.stringify(S && S.ans[id]) + ', not one string per box');
    const own = U.judge.text(T.x, wrong, { aShown: true, mode: 'practice' }); const w0 = ((own.what || [])[0] || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, 30);
    if (w0 && c.indexOf(w0.slice(0, 20)) < 0) F('the card does not carry the coach\'s words for it ("' + w0 + '")'); }
  for (let k = 1; k <= 3; k++) await p.evaluate(([i, k]) => { const x = document.querySelector('[data-rung="' + i + '"][data-to="' + k + '"]'); if (x) x.click(); }, [id, k]);
  if (!(await p.$('#st' + id + ' ol.sol li'))) F('the help ladder has no worked solution after a wrong pair');
  await p.click('[data-another="' + id + '"]'); await p.waitForTimeout(80);
  { const xid = id + 'x1', xa = await p.$(boxSel(xid, n - 1));
    if (!xa) F('"Try a similar one" has no ' + n + ' boxes');
    else { const xs = await p.evaluate(([pre, seed, base]) => { const S = JSON.parse(localStorage.getItem(pre + 'set.' + seed + '.all')); return S.more[base]; }, [U.id + '.', T.seed, id]);
      const g = U.generate(xs.seed), x = (() => { const [si, ii] = T.pos.split('.').map(Number), it = g.sections[si].items[ii]; return it.type === 'solo' ? it.part : it.parts.find(q => q.label === T.x.label); })();
      await fillBoxes(p, xid, U.keyText(x)); await check(p, xid); await p.waitForTimeout(60);
      const c = await card(p, xid); if (!/✓ Correct/.test(c)) F('the similar one\'s key in its boxes: "' + c.slice(0, 80) + '"'); } }

  /* the key: right on the first try, the point, saved, locked, restored */
  await fresh(p, T.seed); await fillBoxes(p, id, key); await check(p, id); await p.waitForTimeout(60);
  { const c = await card(p, id), S = await st(p); if (!/✓ Correct on the first try/.test(c)) F('the key ' + JSON.stringify(key) + ': "' + c.slice(0, 80) + '"');
    if (!S || !S.res[id] || !S.res[id].earned) F('the key in its boxes did not earn the point');
    const ro = await p.evaluate(([id, n]) => { const o = []; for (let k = 0; k < n; k++) o.push(document.getElementById('a' + id + (k ? '_' + k : '')).readOnly); return o; }, [id, n]);
    if (ro.some(x => !x)) F('a box is still open after a right answer: ' + ro.join(',')); }
  await p.reload(); await p.waitForSelector('#paper .q'); await p.waitForTimeout(100);
  { const vals = await p.evaluate(([id, n]) => { const o = []; for (let k = 0; k < n; k++) o.push(document.getElementById('a' + id + (k ? '_' + k : '')).value); return o; }, [id, n]);
    if (JSON.stringify(vals) !== JSON.stringify(key.map(String))) F('after a reload the boxes hold ' + JSON.stringify(vals));
    if (!/✓ Correct/.test(await card(p, id))) F('after a reload the part is not right'); }

  /* print: the worksheet's blanks, the key, My results */
  await p.click('#bMore'); await p.click('#bPrint'); await p.click('[data-print="wk"]'); await p.waitForTimeout(100);
  { const pr = await p.evaluate(qn => { const q = Array.from(document.querySelectorAll('#printview .pq'))[qn - 1]; if (!q) return null;
      return { boxes: Array.from(q.querySelectorAll('.pboxes .pbx')).map(x => (x.querySelector('.pre') || { textContent: '' }).textContent.trim()), rows: Array.from(document.querySelectorAll('#printview .pkey tr')).map(r => [r.cells[0].textContent.trim(), r.cells[1].textContent.replace(/\s+/g, ' ').trim()]) }; }, T.qn);
    const want = B.map(x => (x.pre || '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim());
    if (!pr || pr.boxes.length !== n || pr.boxes.join('|') !== want.join('|')) F('the worksheet\'s blanks for it: ' + JSON.stringify(pr && pr.boxes) + ', not ' + JSON.stringify(want));
    const row = pr && pr.rows.find(r => r[0] === String(id) || r[0] === String(T.qn)), kv = String(U.view.key(T.x)).replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
    if (!row || row[1] !== kv) F('the key\'s row is "' + (row && row[1]) + '", not the unit\'s key "' + kv + '"'); }
  await p.click('#pvClose'); await p.click('#bMore'); await p.click('#bPrint'); await p.click('[data-print="res"]'); await p.waitForTimeout(100);
  { const t = await p.evaluate(id => { const r = Array.from(document.querySelectorAll('#printview .pans2 tr')).find(x => x.cells[0] && x.cells[0].textContent.trim() === id); return r ? r.cells[1].textContent : ''; }, String(id));
    if (key.some(k => t.replace(/−/g, '-').indexOf(String(k).replace(/−/g, '-')) < 0)) F('My results shows "' + t + '" for the boxes ' + JSON.stringify(key)); }
  await p.click('#pvClose');

  /* Like the real test: one box at Finish is a miss that says why; the key in its boxes is right at Finish */
  for (const full of [false, true]) {
    await fresh(p, T.seed); await p.click('.mode button[data-mode="test"]'); await p.waitForTimeout(60);
    await fillBoxes(p, id, full ? key : [key[0]].concat(Array(n - 1).fill('')));
    await p.click('#bFinish'); await p.click('#cy'); await p.waitForTimeout(120);
    const S = await st(p), R = S && S.res[id];
    if (full ? !(R && R.v === 'right') : !(R && R.v === 'wrong' && /Fill in every box/.test(R.unreadMsg || ''))) F('Like the real test, ' + (full ? 'every box' : 'one box') + ' filled at Finish: ' + JSON.stringify(R));
  }

  /* the keypad on a touch screen: it moves to the box being typed in, and a key goes in at that box's caret */
  { const tc = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }), t = await tc.newPage(); await fresh(t, T.seed);
    await t.focus(boxSel(id, n - 1)); await t.waitForTimeout(60);
    const ks = await t.evaluate(() => { const k = document.querySelector('.keys'); return k && !k.hidden ? Array.from(k.querySelectorAll('button:not([hidden])')).map(b => b.dataset.k) : []; });
    if (ks.length) { const lab = ks[0]; await put(t, boxSel(id, n - 1), '5'); await t.evaluate(i => { const e = document.getElementById(i); e.focus(); e.setSelectionRange(0, 0); }, boxSel(id, n - 1).slice(1));
      await t.click('.keys button[data-k="' + lab + '"]'); const v = await t.$eval(boxSel(id, n - 1), e => e.value), v0 = await t.$eval(boxSel(id, 0), e => e.value);
      if (v.length !== 2 || v0 !== '') F('the keypad key "' + lab + '" in the last box gave "' + v + '" there and "' + v0 + '" in the first'); }
    await tc.close(); }

  /* one question at a time: answered only when every box is filled */
  { const pc = await rawContext({ viewport: { width: 1280, height: 800 } }), q = await pc.newPage(); q.on('pageerror', e => errs.push(e.message));
    await fresh(q, T.seed); await q.waitForTimeout(80);
    const go = await q.$('#pgStart'); if (go) await go.click(); await q.waitForTimeout(80);
    const tap = await q.$('#pgGrid [data-pgi="' + (T.qn - 1) + '"]'); if (tap) { await tap.click(); await q.waitForTimeout(80); }
    const lab = async () => q.$eval('#pgGrid [data-pgi="' + (T.qn - 1) + '"]', e => e.getAttribute('aria-label')).catch(() => '');
    await put(q, boxSel(id, 0), key[0]); await q.waitForTimeout(80); const a1 = await lab();
    for (let k = 1; k < n; k++) await put(q, boxSel(id, k), key[k]); await q.waitForTimeout(80); const a2 = await lab();
    if (!/not answered/.test(a1) || !/, answered/.test(a2)) F('the pager\'s map: one box filled "' + a1 + '", every box "' + a2 + '"');
    await pc.close(); }
  if (errs.length) F('page errors: ' + errs.slice(0, 3).join(' | '));
  await ctx.close();
  console.log('T. several boxes: ' + (teacher ? 'teacher copy, ' : '') + 'U' + (T.qn) + ' (set ' + T.seed + ', ' + n + ' boxes: ' + B.map(x => x.say || '').join(', ') + ') — names, Tab order, one line at 360/390/1280, every boxed part at 360/390/1280 (' + T.every + '), a box left empty, Enter, a wrong pair, the ladder, a similar one, the key, saved and restored, print, Like the real test, the keypad, the pager');
};
