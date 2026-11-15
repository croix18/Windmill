/* check/page.js part V — the circle graph a student builds (kit kind cgraph, cgraph.js; 15 Nov 2026 — MA.7.DP.1.4's first verb is
   construct), on a unit that has one (sets 11, 4821, 12–15, then 1–300; else skipped). On the student page and the teacher copy:
   - untouched: the circle (a slider, one Tab stop) marked every 10° and numbered every 30°, only the 0° line; the sectors' Tab stop
     and the names' radiogroup (the part's categories, a word each, 44 px) with nothing chosen; no text box; nothing past 360 or 390;
   - a tap on a mark draws its line (the ghost and the readout while the pointer is down), the same again erases it, the 0° mark
     never does; a drag moves a line; the keys: ← → a mark at a time, Home, End, Space and Enter draw or erase at the cursor;
   - the sectors: Tab from the circle reaches them, → and Home choose one, a tap inside one chooses it; a name names it; a name
     already on another sector moves; the live line says the lines and every sector in words;
   - the key built through the widget is ✓ on the first try with its point, and locks; not finished is "Not counted yet" and never a
     try (the wrong number of sectors; a sector with no name); a wrong graph names ONE thing, sizes before names, in the unit's own
     words when it gives them; the ladder ends on the graph drawn; "Try a similar one" opens a fresh circle in focus; a reload
     restores the build; one question at a time, the map says "answered" only when every sector is named;
   - print: the worksheet's blank circle (about 60 mm across, no lines but the 0° one, no names, no controls) under "Draw and label
     the circle graph."; the key draws the graph in ink with its words; the teacher copy shows the key's graph under the item, its
     test forms print the blank circle and their keys the graph; the all-multiple-choice paper prints four different graphs;
   - a touch screen: a tap draws, a tap names, no keypad, nothing past the edge; the dark theme: every stroke and word ≥ 3:1.
   KIT_CG_SHOTS=<folder> saves screenshots of each state (390 and 1280, light and dark) for a person to look at. */
'use strict';
const path = require('path'), fs = require('fs');
const CGF = require('./cgraph.js'), CG = CGF.CG;
module.exports = async function partV(b, rawContext, url, U, dir, fail) {
  const F = m => fail('V. circle graph: ' + m), teacher = /^teacher$/.test(path.basename(dir)), SHOTS = process.env.KIT_CG_SHOTS || '';
  const find = seed => { const g = U.generate(seed); let qn = 0, hit = null;
    g.sections.forEach((sec, si) => sec.items.forEach((it, ii) => { qn++; if (hit) return;
      const ps = it.type === 'parts' ? it.parts.map((p, pi) => ({ p, id: qn + p.label, pi })) : it.type === 'solo' ? [{ p: it.part, id: String(qn), pi: -1 }] : [];
      ps.forEach(({ p, id, pi }) => { if (!hit && p.kind === 'cgraph') hit = { seed, id, x: p, qn, item: it, pos: si + '.' + ii + '.' + pi }; }); }));
    return hit; };
  let T = null; for (const s of [11, 4821, 12, 13, 14, 15]) if (!T) T = find(s); for (let s = 1; !T && s <= 300; s++) T = find(s);
  if (!T) { console.log('V. no circle graph to build on this unit — skipped'); return; }
  const id = T.id, key = CG.graphOf(T.x), n = key.length, cats = key.map(s => s.name), errs = [];
  const cum = []; { let t = 0; key.forEach((s, i) => { t += s.deg; if (i < n - 1) cum.push(t); }); }
  const pre = U.id + '.';
  const fresh = async (pg, s0) => { await pg.goto('about:blank'); await pg.goto(url + '#set-' + (s0 || T.seed)); await pg.evaluate(() => { try { localStorage.clear(); } catch (e) {} }); await pg.goto(url + '#set-' + (s0 || T.seed)); await pg.reload(); await pg.waitForSelector('#paper .q', { state: 'attached' }); await pg.waitForTimeout(150);
    if (teacher) await pg.waitForFunction(() => window.TEACHER && window.TEACHER.ready && window.TEACHER.ready(), null, { timeout: 8000 }).catch(() => {}); };
  const st = pg => pg.evaluate(([k, s]) => JSON.parse(localStorage.getItem(k + 'set.' + s + '.all') || 'null'), [pre, T.seed]);
  const ans = async pg => { const s = await st(pg); return CG.norm(T.x, s && s.ans ? s.ans[id] : null); };
  const resOf = async pg => { const s = await st(pg); return (s && s.res && s.res[id]) || {}; };
  const mark = (pg, d) => pg.evaluate(([id, d]) => { const m = document.querySelector('#cgc' + id + ' .cgm[data-d="' + d + '"]'); document.getElementById('cgc' + id).scrollIntoView({ block: 'center' }); const r = m.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, [id, d]);
  const inside = (pg, ang, rr) => pg.evaluate(([id, ang, rr, W, H, CX, CY, R]) => { const s = document.querySelector('#cgc' + id + ' svg'); const r = s.getBoundingClientRect(), k = r.width / W, a = ang * Math.PI / 180;
    return { x: r.left + (CX + rr * R * Math.sin(a)) * k, y: r.top + (CY - rr * R * Math.cos(a)) * k }; }, [id, ang, rr, CG.W, CG.H, CG.CX, CG.CY, CG.R]);
  const check = (pg, i) => pg.evaluate(i => document.querySelector('[data-check="' + i + '"]').click(), i || id);
  const card = pg => pg.$eval('#fb' + id, e => e.textContent.replace(/\s+/g, ' ').trim());
  const more = async pg => { if (await pg.isHidden('#mMenu')) await pg.click('#bMore'); };
  const look = pg => pg.evaluate(id => { const w = document.querySelector('[data-cgw="' + id + '"]'), c = document.getElementById('cgc' + id);
    return { w: !!w, role: c && c.getAttribute('role'), lines: c ? Array.from(c.querySelectorAll('.cgl')).map(l => +l.dataset.d) : [], zero: c ? c.querySelectorAll('.cgz').length : 0,
      names: c ? Array.from(c.querySelectorAll('.cgn')).map(t => t.textContent) : [], ghost: c ? c.querySelectorAll('.cggh').length : 0, rd: (document.getElementById('cgr' + id) || {}).textContent || '',
      rdOn: !!(document.getElementById('cgr' + id) && getComputedStyle(document.getElementById('cgr' + id)).visibility === 'visible'), say: (document.getElementById('cgy' + id) || {}).textContent || '',
      pick: (document.getElementById('cgp' + id) || {}).textContent || '', focus: document.activeElement ? document.activeElement.id || document.activeElement.getAttribute('data-cgn') || '' : '',
      checked: w ? Array.from(w.querySelectorAll('[data-cgn][aria-checked=true]')).map(x => x.getAttribute('data-cgn')) : [], nums: c ? Array.from(c.querySelectorAll('.cgb')).map(t => t.textContent) : [],
      ticks: c ? c.querySelectorAll('.cgk, .cgk2').length : 0, input: w ? w.querySelectorAll('input').length : -1, sel: c ? c.querySelectorAll('.cgsel').length : 0,
      btns: w ? Array.from(w.querySelectorAll('[data-cgn]')).map(x => ({ t: x.textContent, h: x.getBoundingClientRect().height, dis: x.disabled })) : [],
      other: w ? ['.cgpk', '.cgpv', '.cgnx', '.cgclr'].map(s => { const e = w.querySelector(s); return e ? Math.round(e.getBoundingClientRect().height) : 0; }) : [],
      groups: w ? Array.from(w.querySelectorAll('[role=radiogroup]')).map(g => g.getAttribute('aria-label')) : [], sx: document.documentElement.scrollWidth,
      lock: c ? c.getAttribute('aria-disabled') : null }; }, id);
  const shot = async (pg, name) => { if (!SHOTS) return; try { fs.mkdirSync(SHOTS, { recursive: true }); const q = await pg.$('.q:has([data-host="' + id + '"])'); if (q) await q.screenshot({ path: path.join(SHOTS, name + '.png') }); } catch (e) {} };
  const judgeIn = (pg, g) => pg.evaluate(([pos, g]) => { const P = pos.split('.').map(Number), x = Unit.generate(+location.hash.replace(/\D+/g, '')).sections[P[0]].items[P[1]], pt = P[2] >= 0 ? x.parts[P[2]] : x.part;
    const f = Kit.CG.judge(pt, g, { prevOk: false }, Unit.judge.cgraph), d = document.createElement('div'); d.innerHTML = (f.what || [])[0] || ''; return { v: f.v, which: f.which, want: d.textContent.replace(/\s+/g, ' ').trim() }; }, [T.pos, g]);

  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }), p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await fresh(p);
  /* untouched */
  { const L = await look(p);
    if (!L.w || L.role !== 'slider') F('no circle to build on for ' + id + ': ' + JSON.stringify(L).slice(0, 200));
    if (L.lines.length || L.zero !== 1 || L.names.length || L.checked.length || L.sel) F('an untouched circle shows ' + JSON.stringify({ lines: L.lines, zero: L.zero, names: L.names, checked: L.checked, sel: L.sel }));
    const want = []; for (let d = 0; d < 360; d += 30) want.push(d + '°'); if (JSON.stringify(L.nums) !== JSON.stringify(want)) F('the numbers are ' + L.nums.join(' '));
    if (L.ticks !== 360 / CG.spec(T.x).step) F(L.ticks + ' marks on the circle');
    if (JSON.stringify(L.btns.map(x => x.t)) !== JSON.stringify(cats)) F('the names are ' + L.btns.map(x => x.t).join(' | ') + ', not ' + cats.join(' | '));
    if (JSON.stringify(L.groups) !== '["Name for the sector"]') F('the radiogroups are ' + JSON.stringify(L.groups));
    if (L.btns.some(x => x.h < 44) || L.other.some(h => h < 44)) F('targets under 44 px: names ' + L.btns.map(x => Math.round(x.h)).join(',') + ', others ' + L.other.join(','));
    if (L.btns.some(x => !x.dis)) F('a name can be chosen before there are sectors');
    if (L.input) F('the graph has a text box');
    if (L.sx > 391) F('the page scrolls sideways at 390 (' + L.sx + ')'); }
  await shot(p, '390-light-1-empty');
  /* a tap on a mark: the ghost and the readout while down, the line on release; the same again erases it; the 0° mark never */
  { const d1 = cum[0]; let m = await mark(p, d1); await p.mouse.move(m.x, m.y); await p.mouse.down(); await p.waitForTimeout(30);
    let L = await look(p); if (!L.ghost || L.rd !== d1 + '°' || !L.rdOn) F('pointer down on ' + d1 + '°: ghost ' + L.ghost + ', readout "' + L.rd + '" ' + (L.rdOn ? 'shown' : 'hidden'));
    await shot(p, '390-light-2-ghost');
    await p.mouse.up(); await p.waitForTimeout(30); L = await look(p);
    if (L.ghost || L.rdOn) F('the ghost or the readout stays after release');
    if (JSON.stringify(L.lines) !== JSON.stringify([d1])) F('a tap on ' + d1 + '° drew ' + JSON.stringify(L.lines));
    if (L.focus !== 'cgc' + id) F('after a tap the focus is on ' + L.focus);
    const a = await ans(p); if (a.length !== 2 || a[0].deg !== d1) F('a tap saved ' + JSON.stringify(a));
    if (L.say !== CG.say(T.x, a)) F('the live line says "' + L.say + '", not "' + CG.say(T.x, a) + '"');
    if (!/^2 lines: 0°, /.test(L.say)) F('the live line is "' + L.say + '"');
    m = await mark(p, d1); await p.mouse.click(m.x, m.y); await p.waitForTimeout(30); L = await look(p); if (L.lines.length) F('a second tap on ' + d1 + '° left ' + JSON.stringify(L.lines));
    m = await mark(p, 0); await p.mouse.click(m.x, m.y); await p.waitForTimeout(30); L = await look(p); if (L.lines.length || L.zero !== 1) F('a tap on 0° changed the 0° line: ' + JSON.stringify(L.lines)); }
  /* a drag moves a line: drawn a mark or two off, then dragged to its place */
  { const d1 = cum[0], off = d1 + 20 < 360 ? d1 + 20 : d1 - 20; let m = await mark(p, off); await p.mouse.click(m.x, m.y); await p.waitForTimeout(30);
    const m0 = await mark(p, off), m1 = await mark(p, d1); await p.mouse.move(m0.x, m0.y); await p.mouse.down(); await p.mouse.move((m0.x + m1.x) / 2, (m0.y + m1.y) / 2, { steps: 3 }); await p.mouse.move(m1.x, m1.y, { steps: 3 });
    const mid = await look(p); if (!mid.ghost || mid.rd !== d1 + '°') F('dragging: the ghost ' + mid.ghost + ', readout "' + mid.rd + '"');
    await p.mouse.up(); await p.waitForTimeout(30); const L = await look(p); if (JSON.stringify(L.lines) !== JSON.stringify([d1])) F('a drag from ' + off + '° to ' + d1 + '° left ' + JSON.stringify(L.lines)); }
  /* the keys: the circle in focus, → ← a mark, Home, End, Space and Enter draw or erase */
  { await p.focus('#cgc' + id); await p.keyboard.press('Home'); const step = CG.spec(T.x).step;
    const now = () => p.$eval('#cgc' + id, e => +e.getAttribute('aria-valuenow'));
    await p.keyboard.press('ArrowRight'); if (await now() !== step) F('→ from 0° is at ' + await now());
    await p.keyboard.press('ArrowLeft'); await p.keyboard.press('ArrowLeft'); if (await now() !== 360 - step) F('← ← from ' + step + '° is at ' + await now());
    await p.keyboard.press('Home'); if (await now() !== 0) F('Home is at ' + await now());
    await p.keyboard.press('End'); if (await now() !== 360 - step) F('End is at ' + await now());
    await p.keyboard.press('Space'); let L = await look(p); if (L.lines.indexOf(360 - step) < 0) F('Space at ' + (360 - step) + '° drew no line');
    await p.keyboard.press('Enter'); L = await look(p); if (L.lines.indexOf(360 - step) >= 0) F('Enter on a line did not erase it');
    await p.keyboard.press('Home'); await p.keyboard.press('Space'); L = await look(p); if (L.zero !== 1 || L.lines.indexOf(0) >= 0) F('Space at 0° changed the 0° line');
    /* the rest of the key's lines by the keys */
    let at = 0; for (let i = 1; i < cum.length; i++) { for (; at < cum[i]; at += step) await p.keyboard.press('ArrowRight'); await p.keyboard.press('Space'); }
    L = await look(p); if (JSON.stringify(L.lines.slice().sort((x, y) => x - y)) !== JSON.stringify(cum)) F('the keys drew ' + JSON.stringify(L.lines) + ', not ' + JSON.stringify(cum)); }
  await shot(p, '390-light-3-lines');
  /* the sectors and their names: Tab reaches the sectors, → chooses, a name names; a name moves; a tap inside a sector chooses it */
  { await p.keyboard.press('Tab'); let f = await p.evaluate(() => document.activeElement && document.activeElement.id); if (f !== 'cgp' + id) F('Tab from the circle reaches ' + f + ', not the sectors');
    await p.keyboard.press('Home'); await p.keyboard.press('ArrowRight'); let L = await look(p);
    if (!new RegExp('^Sector 2 of ' + n + ': ' + cum[0] + '° to ' + cum[1] + '°').test(L.pick)) F('→ on the sectors shows "' + L.pick + '"');
    await p.keyboard.press('Tab'); f = await p.evaluate(() => document.activeElement && document.activeElement.getAttribute('data-cgn')); if (f !== cats[0]) F('Tab from the sectors reaches ' + f + ', not the names');
    await p.keyboard.press('Space'); let a = await ans(p); if (a[1].name !== cats[0]) F('Space on ' + cats[0] + ' named sector 2 ' + a[1].name);
    await p.keyboard.press('ArrowRight'); a = await ans(p); if (a[1].name !== cats[1]) F('→ in the names named sector 2 ' + a[1].name + ', not ' + cats[1]);
    f = await p.evaluate(() => document.activeElement && document.activeElement.getAttribute('data-cgn')); if (f !== cats[1]) F('→ in the names left the focus on ' + f);
    /* a tap inside the first sector chooses it; naming it with sector 2's name moves the name */
    const c = await inside(p, key[0].deg / 2, 0.42); await p.mouse.click(c.x, c.y); await p.waitForTimeout(30); L = await look(p);
    if (!/^Sector 1 of /.test(L.pick) || !L.sel) F('a tap inside sector 1 shows "' + L.pick + '"');
    await p.click('[data-cg="' + id + '"][data-cgn="' + cats[1] + '"]'); a = await ans(p);
    if (a[0].name !== cats[1] || a[1].name != null) F('a name already on sector 2 did not move to sector 1: ' + JSON.stringify(a));
    await shot(p, '390-light-4-half');
    /* not finished: a sector with no name is not a try */
    await check(p); let cd = await card(p), R = await resOf(p);
    if (!/Not counted yet/.test(cd) || !/Name every sector\./.test(cd) || (R.tries || 0) !== 0) F('a sector with no name: "' + cd.slice(0, 100) + '", tries ' + R.tries);
    /* the rest by the widget, through the sectors' Tab stop and the name buttons */
    for (let i = 0; i < n; i++) { await p.focus('#cgp' + id); await p.keyboard.press('Home'); for (let k = 0; k < i; k++) await p.keyboard.press('ArrowRight'); await p.click('[data-cg="' + id + '"][data-cgn="' + cats[i] + '"]'); }
    a = await ans(p); if (CG.keyText(a) !== CG.keyText(key)) F('the build saved ' + CG.keyText(a));
    L = await look(p); if (L.say !== CG.say(T.x, key)) F('the live line says "' + L.say + '"');
    if (JSON.stringify(L.names.slice().sort()) !== JSON.stringify(cats.slice().sort())) F('the circle shows the names ' + L.names.join(', '));
    if (L.sx > 391) F('the page scrolls sideways at 390 with the graph built');
    if (await p.evaluate(() => { const k = document.querySelector('.keys'); return !!(k && !k.hidden && k.offsetParent); })) F('a keypad shows for a circle graph');
    await shot(p, '390-light-5-built');
    /* a reload restores the build */
    await p.reload(); await p.waitForSelector('#paper .q'); await p.waitForTimeout(150); L = await look(p); a = await ans(p);
    if (JSON.stringify(L.lines.slice().sort((x, y) => x - y)) !== JSON.stringify(cum) || CG.keyText(a) !== CG.keyText(key) || L.names.length !== n) F('after a reload: lines ' + JSON.stringify(L.lines) + ', names ' + L.names.join(','));
    if (L.say !== CG.say(T.x, key)) F('after a reload the live line says "' + L.say + '"');
    /* ✓ on the first try, the point, locked */
    await check(p); cd = await card(p); R = await resOf(p);
    if (!/Correct on the first try/.test(cd) || R.earned !== true) F('the key built is not ✓ on the first try with its point: "' + cd.slice(0, 80) + '" earned ' + R.earned);
    L = await look(p); if (L.lock !== 'true' || L.btns.some(x => !x.dis)) F('a right graph is not locked: ' + L.lock); }
  /* not finished, then each one thing off: sizes before names; then the key */
  await fresh(p);
  { await p.focus('#cgc' + id); await p.keyboard.press('Home'); for (let d = 0; d < cum[0]; d += CG.spec(T.x).step) await p.keyboard.press('ArrowRight'); await p.keyboard.press('Space');
    await check(p); let cd = await card(p), R = await resOf(p);
    if (!/Not counted yet/.test(cd) || cd.indexOf('Draw one sector for each category: ' + n + ' sectors.') < 0 || (R.tries || 0) !== 0) F('too few sectors: "' + cd.slice(0, 100) + '", tries ' + R.tries);
    const trade = (g, i, j) => g.map((s, m) => ({ name: m === i ? g[j].name : m === j ? g[i].name : s.name, deg: s.deg }));
    const j = key.findIndex(s => s.deg !== key[0].deg), w = CGF.wrong(T.x), both = trade(w, 0, j > 0 ? j : 1);
    const seen = {};
    for (const [which, g] of [['size', w], ['names', trade(key, 0, j)], ['size', both]]) {
      await CGF.fill(p, id, T.x, g); await check(p); const r = await judgeIn(p, g), cd2 = await card(p);
      if (r.which !== which) F('a graph with the ' + which + ' off is judged on the ' + r.which);
      if (!/^✗ Not yet/.test(cd2) || cd2.indexOf(r.want) < 0) F('the ' + which + ' card is "' + cd2.slice(0, 140) + '", not its line "' + r.want.slice(0, 140) + '"');
      if (which === 'size' && !seen.size) await shot(p, '390-light-6-wrong');
      (seen[which] = seen[which] || []).push(r.want);
    }
    if (seen.size && seen.names && seen.size[0] === seen.names[0]) F('the size and the names lines are the same line');
    const R2 = await resOf(p); if (R2.tries !== 3) F('three wrong graphs made ' + R2.tries + ' tries');
    /* the ladder: Hint 3 ends on the graph drawn */
    for (let k = 1; k <= 3; k++) await p.evaluate(([id, k]) => { const x = document.querySelector('[data-rung="' + id + '"][data-to="' + k + '"]'); if (x) x.click(); }, [id, k]);
    const H = await p.evaluate(id => { const k = document.querySelector('#rg' + id + '-3 .key .cgkey svg.cgg'); return k ? { lines: k.querySelectorAll('.cgl').length, names: Array.from(k.querySelectorAll('.cgn')).map(t => t.textContent), words: (document.querySelector('#rg' + id + '-3 .key .cgkw') || {}).textContent || '' } : null; }, id);
    if (!H || H.lines !== n - 1 || JSON.stringify(H.names.slice().sort()) !== JSON.stringify(cats.slice().sort())) F('Hint 3 does not end on the finished graph drawn: ' + JSON.stringify(H));
    else if (H.words !== CG.keyWords(T.x)) F('the drawn key says "' + H.words + '"');
    await CGF.fill(p, id, T.x); await check(p); if (!/✓/.test(await card(p))) F('the key after the misses is not ✓');
    /* Try a similar one: a fresh circle on its own, in focus */
    const b0 = await p.$('[data-another="' + id + '"]'); if (!b0) F('no "Try a similar one" on the graph'); else { await b0.click(); await p.waitForTimeout(80);
      const x1 = await p.evaluate(id => { const w = document.querySelector('#ag' + id + ' .cgw'); return w ? { id: w.dataset.cgw, focus: document.activeElement && document.activeElement.id, lines: w.querySelectorAll('.cgl').length } : null; }, id);
      if (!x1 || x1.focus !== 'cgc' + x1.id || x1.lines) F('"Try a similar one" did not open a fresh circle in focus: ' + JSON.stringify(x1)); } }
  /* print: the worksheet's blank circle and the key's graph */
  await p.setViewportSize({ width: 1280, height: 900 });   /* the paper's width, not a phone's */
  await fresh(p); await more(p); await p.click('#bPrint'); await p.click('[data-print="wk"]'); await p.waitForTimeout(100); await p.emulateMedia({ media: 'print' });
  { const pr = await p.evaluate(() => { const pv = document.getElementById('printview'), c = pv.querySelector('.pcg svg.cgg'), r = c ? c.getBoundingClientRect() : null;
      return { n: pv.querySelectorAll('.pcg svg.cgg').length, drawn: pv.querySelectorAll('.pcg .cgl, .pcg .cgn, .pcg .cgsel').length, zero: pv.querySelectorAll('.pcg .cgz').length, w: r ? r.width : 0, ink: c ? getComputedStyle(c).color : '',
        ctl: pv.querySelectorAll('.cgctl, [role=radiogroup]').length, sheet: Array.from(document.querySelectorAll('.sheet .cgctl')).map(e => getComputedStyle(e).display),
        instr: Array.from(pv.querySelectorAll('.ppart')).filter(pp => pp.querySelector('.pcg')).map(pp => pp.querySelector('.line .st').textContent.trim()),
        key: Array.from(pv.querySelectorAll('.pkey .cgkey')).map(k => ({ lines: k.querySelectorAll('svg .cgl').length, words: (k.querySelector('.cgkw') || {}).textContent || '' })) }; });
    if (pr.n !== 1 || pr.drawn || pr.zero !== 1) F('the worksheet prints ' + pr.n + ' circles, ' + pr.drawn + ' marks drawn on them, ' + pr.zero + ' 0° lines');
    const dia = pr.w * 208 / 400 / 96 * 25.4; if (Math.abs(dia - 60) > 6) F('the printed circle is ' + dia.toFixed(1) + ' mm across, not about 60');
    if (pr.ctl || pr.sheet.some(d => d !== 'none')) F('the controls print: ' + JSON.stringify(pr.sheet));
    if (pr.ink.replace(/\s/g, '') !== 'rgb(0,0,0)') F('the printed circle is ' + pr.ink + ', not black ink');
    if (JSON.stringify(pr.instr) !== '["Draw and label the circle graph."]') F('the printed line is ' + JSON.stringify(pr.instr));
    if (pr.key.length !== 1 || pr.key[0].lines !== n - 1 || pr.key[0].words !== CG.keyWords(T.x)) F('the printed key is ' + JSON.stringify(pr.key)); }
  if (SHOTS) { const pv = await p.$('#printview .pq:has(.pcg)'); if (pv) await pv.screenshot({ path: path.join(SHOTS, 'print-blank.png') }); const pk = await p.$('#printview .pkey tr:has(.cgkey)'); if (pk) await pk.screenshot({ path: path.join(SHOTS, 'print-key.png') }); }
  await p.emulateMedia({ media: 'screen' }); await p.click('#pvClose');
  /* the teacher copy: the key's graph under the item; its test forms' blank circles and their keys' graphs; four graphs on the
     all-multiple-choice paper */
  if (teacher) {
    const tk = await p.evaluate(id => { const k = document.querySelector('[data-host="' + id + '"] .cgtk .cgkey svg'); return k ? k.querySelectorAll('.cgl').length : -1; }, id);
    if (tk !== n - 1) F('the teacher copy does not show the key\'s graph under ' + id + ' (' + tk + ')');
    await more(p); await p.click('#bPrint'); await p.click('[data-print="mk"]'); await p.click('[data-print="mk2"]'); await p.waitForTimeout(150); await p.emulateMedia({ media: 'print' });
    const tp = await p.evaluate(() => ({ forms: Array.from(document.querySelectorAll('#printview .pform:not(.pkeyform)')).map(f => [f.querySelectorAll('.pcg svg.cgg').length, f.querySelectorAll('.pcg .cgl, .pcg .cgn, .cgtk').length]),
      keys: Array.from(document.querySelectorAll('#printview .pkeyform')).map(k => k.querySelectorAll('.cgkey svg .cgl').length > 0 ? k.querySelectorAll('.cgkey').length : 0) }));
    tp.forms.forEach((f, k) => { if (f[0] !== 1 || f[1]) F('test form ' + 'AB'[k] + ' prints ' + JSON.stringify(f) + ' (circles, marks)'); if (tp.keys[k] !== 1) F('key ' + 'AB'[k] + ' draws ' + tp.keys[k] + ' graphs'); });
    await p.emulateMedia({ media: 'screen' }); await p.click('#pvClose');
    if (typeof U.choices === 'function') {
      await more(p); await p.click('#bPrint'); await p.click('[data-print="mc"]'); await p.click('[data-print="mc1"]'); await p.waitForTimeout(150); await p.emulateMedia({ media: 'print' });
      const mc = await p.evaluate(() => { const pp = Array.from(document.querySelectorAll('#printview .pform:not(.pkeyform) .ppart')).find(x => x.querySelector('.pcgc'));
        return pp ? { line: (pp.querySelector('.line .st') || {}).textContent.trim(), alts: Array.from(pp.querySelectorAll('.pcgc svg.cgg')).map(s => s.getAttribute('aria-label')), blank: pp.querySelectorAll('.pcg').length,
          lines: Array.from(pp.querySelectorAll('.pcgc svg.cgg')).map(s => s.querySelectorAll('.cgl').length) } : null; });
      if (!mc) F('the all-multiple-choice paper has no four graphs');
      else { if (mc.alts.length !== 4 || new Set(mc.alts).size !== 4) F('the all-multiple-choice paper\'s graphs: ' + JSON.stringify(mc.alts));
        { const want = U.view.mcLine ? U.view.mcLine(T.x) : 'Which graph shows the data?'; if (mc.line !== want) F('the all-multiple-choice line is "' + mc.line + '", not "' + want + '"'); }
        if (mc.blank) F('the all-multiple-choice paper still prints the blank circle');
        if (SHOTS) { const e = await p.$('#printview .pform:not(.pkeyform) .ppart:has(.pcgc)'); if (e) await e.screenshot({ path: path.join(SHOTS, 'print-four-graphs.png') }); } }
      await p.emulateMedia({ media: 'screen' }); await p.click('#pvClose');
    }
  }
  await ctx.close();
  /* a touch screen at 390 and 360: a tap draws, a tap names, no keypad, nothing past the edge */
  for (const w of [390, 360]) {
    const tc = await b.newContext({ viewport: { width: w, height: 800 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }), t = await tc.newPage(); t.on('pageerror', e => errs.push(e.message));
    await fresh(t); const m = await mark(t, cum[0]); await t.touchscreen.tap(m.x, m.y); await t.waitForTimeout(40);
    const a = await ans(t); if (a.length !== 2 || a[0].deg !== cum[0]) F(w + ' px touch: a tap drew ' + JSON.stringify(a));
    await t.tap('[data-cg="' + id + '"][data-cgn="' + cats[0] + '"]'); const a2 = await ans(t); if (a2[0].name !== cats[0]) F(w + ' px touch: a tap on ' + cats[0] + ' named ' + JSON.stringify(a2));
    if (await t.evaluate(() => { const k = document.querySelector('.keys'); return !!(k && !k.hidden && k.offsetParent); })) F(w + ' px touch: a keypad shows for a circle graph');
    const sx = await t.evaluate(() => document.documentElement.scrollWidth); if (sx > w + 1) F(w + ' px touch: the page scrolls sideways (' + sx + ')');
    await tc.close(); }
  /* the pager (one question at a time, as students have it): answered only when every sector is named */
  { const pc = await rawContext({ viewport: { width: 1280, height: 800 } }), q = await pc.newPage(); q.on('pageerror', e => errs.push(e.message));
    await fresh(q); const go = await q.$('#pgStart'); if (go) await go.click(); await q.waitForTimeout(80);
    const tap = await q.$('#pgGrid [data-pgi="' + (T.qn - 1) + '"]'); if (tap) { await tap.click(); await q.waitForTimeout(80); }
    const lab = () => q.$eval('#pgGrid [data-pgi="' + (T.qn - 1) + '"]', e => e.getAttribute('aria-label')).catch(() => '');
    const g = U.generate(T.seed); let qn = 0; for (const sec of g.sections) for (const it of sec.items) { qn++; if (qn !== T.qn || it.type !== 'parts') continue;
      for (const pt of it.parts) { const pid = qn + pt.label; if (pt.kind === 'cgraph') continue; if (pt.kind === 'mc') await q.evaluate(([i, k]) => document.querySelector('input[name="q' + i + '"][value="' + k + '"]').click(), [pid, pt.correct]); else if (pt.kind !== 'nline') await q.fill('#a' + pid, String(U.keyText(pt))); } }
    await CGF.fill(q, id, T.x, key.map((s, i) => ({ name: i === n - 1 ? null : s.name, deg: s.deg }))); await q.waitForTimeout(80); const a1 = await lab();
    await CGF.fill(q, id, T.x); await q.waitForTimeout(80); const a2 = await lab();
    if (!/not answered/.test(a1) || !/, answered/.test(a2)) F('the pager\'s map: one sector unnamed "' + a1 + '", every sector named "' + a2 + '"');
    await pc.close(); }
  /* the dark theme: every stroke and word of the built graph ≥ 3:1 on the paper; and the screenshots at 1280 */
  for (const [w, scheme] of [[390, 'dark'], [1280, 'light'], [1280, 'dark']]) {
    const dc = await b.newContext({ viewport: { width: w, height: 900 }, colorScheme: scheme }), d = await dc.newPage(); d.on('pageerror', e => errs.push(e.message)); await fresh(d);
    const tag = w + '-' + scheme; await shot(d, tag + '-1-empty');
    const half = key.map((s, i) => ({ name: i < 2 ? s.name : null, deg: s.deg })); await CGF.fill(d, id, T.x, half); await shot(d, tag + '-4-half');
    await CGF.fill(d, id, T.x); await d.focus('#cgp' + id); await d.keyboard.press('Home');
    if (scheme === 'dark') {
      const cs = await d.evaluate(id => { const c = document.getElementById('cgc' + id), bg = getComputedStyle(document.querySelector('.sheet')).backgroundColor, out = [];
        c.querySelectorAll('.cgo, .cgk, .cgk2, .cgb, .cgz, .cgl, .cgn, .cgld').forEach(e => { const k = e.getAttribute('class'), s = getComputedStyle(e); out.push([k, /cgb|cgn/.test(k) ? s.fill : s.stroke]); }); return { bg, out }; }, id);
      const rgb = c => (String(c).match(/[\d.]+/g) || []).map(Number), lum = v => { const f = x => { x /= 255; return x <= .03928 ? x / 12.92 : Math.pow((x + .055) / 1.055, 2.4); }; return .2126 * f(v[0]) + .7152 * f(v[1]) + .0722 * f(v[2]); };
      const bg = rgb(cs.bg), low = cs.out.filter(([k, c]) => { const x = lum(rgb(c)), y = lum(bg); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05) < 3; });
      if (!cs.out.length || low.length) F(tag + ': ' + low.length + ' of ' + cs.out.length + ' marks under 3:1 on ' + cs.bg + ': ' + JSON.stringify(low.slice(0, 3)));
    }
    await shot(d, tag + '-5-built');
    await CGF.fill(d, id, T.x, CGF.wrong(T.x)); await check(d); await shot(d, tag + '-6-wrong');
    await dc.close(); }
  if (errs.length) F('page errors: ' + errs.slice(0, 3).join(' | '));
  console.log('V. circle graph: ' + (teacher ? 'teacher copy, ' : '') + id + ' on set ' + T.seed + ' (' + CG.keyText(key) + ') — marks, numbers, tap, ghost and readout, drag, keys, sectors, names, the live line, not finished, size then names, ✓ first try, the ladder, a similar one, reload, print, ' +
    (teacher ? 'teacher key and forms, the four graphs, ' : '') + 'touch at 390 and 360, the pager\'s map, dark ≥ 3:1');
};
