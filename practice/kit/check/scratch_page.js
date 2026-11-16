/* check/page.js part W — scratch paper in a real browser (scratch.js, 15 Nov 2026; Croix: "add a scratch notes to the practice
   and fast practice as well as a scratch grid"), as students have it (one question at a time; and once with every question on
   one screen, the checks' switch):
     - the button (#bScratch, right after the Calculator): hidden on the start and the summary, 44 px, the word on a wide screen
       and the icon alone on a phone, aria-expanded and aria-controls, translate="no"; the dot and its label on a question with
       scratch work;
     - opening: docked at the left under the bar, focus in the notes; Escape closes and gives focus back to the button;
     - notes per question across Next and Back and a reload; Clear, then Undo puts the text back;
     - the grid by mouse: a point, a segment by two clicks and by a drag, a line to the paper's edges with its two points, the
       hover's ring and readout, erase (the thing that would go dashed first), Undo, Clear and Undo, both views and the scale
       (the numbers and the readout change, the things stay), per question and after a reload;
     - the grid by keyboard: one tab stop; the arrows, Shift, Enter, Delete; Escape first cancels a half-drawn segment; the
       live region;
     - Start over and a mode switch empty the set's scratch; a new set starts empty; the 30 sets used last are kept;
     - storage refused: it all works for the visit; a second tab on the set keeps the other tab's questions;
     - dragging: never over the bar, remembered, kept inside a smaller window; the one pressed last on top of the calculator;
     - a phone (390 × 844): a bottom sheet, the page behind usable and padded so the question scrolls clear, 44 px targets,
       no sideways scroll; true dark and forced light; print (none of it, the same pages with the panel open), nothing over a
       print preview or a teacher's view; no request off the page; the panel's words are exactly its list.
   The same on a teacher copy (page.js runs every part on it). */
const path = require('path');
const HOSTS = /^https:\/\/(desmosforassessment\.cambiumtds\.com|aldenbradford\.com)(\/|$)/;
const WORDS = ['Scratch paper', 'Close', 'Notes', 'Grid', 'Point', 'Segment', 'Line', 'Erase', 'Scale', 'Undo', 'Clear'];

module.exports = async function partW(newContext, switched, url, U, dir, fail) {
  try { await run(newContext, switched, url, U, dir, fail); } catch (e) { fail('W: the check stopped: ' + String(e && e.message || e).split('\n').slice(0, 9).join(' ')); }
};
async function run(newContext, switched, url, U, dir, fail) {
  const teacher = /^teacher$/.test(path.basename(dir)), F = m => fail('W. scratch paper' + (teacher ? ' (teacher copy)' : '') + ': ' + m);
  const SEED = 4821, KEY = 'practice.scratch.v1.' + U.id + '.set.' + SEED + '.all', off = [], errs = [];
  const said = [];
  async function context(opts, mk) {
    const ctx = await (mk || newContext)(Object.assign({ viewport: { width: 1280, height: 800 } }, opts || {}));
    ctx.on('request', r => { const u = r.url(); if (!/^(http:\/\/127\.0\.0\.1[:/]|data:|blob:|about:)/.test(u) && !HOSTS.test(u)) off.push(u); });
    await ctx.route(HOSTS, r => r.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>calculator</title><p>calculator</p>' }));
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
    return { ctx, p };
  }
  const go = async (p, seed) => { await p.goto(url + '#set-' + (seed || SEED)); await p.waitForTimeout(120); };
  const begin = async p => { await p.waitForSelector('#pgStart:visible, #pgNext:visible', { timeout: 8000 }); if (await p.locator('#pgStart').isVisible()) await p.click('#pgStart'); await p.waitForSelector('#pgNext:visible', { timeout: 8000 }); await p.waitForTimeout(60); };
  /* Back and Next by the keyboard: the floating panel, docked at the left, can sit over Back on a short window */
  const nav = async (p, id) => { await p.focus(id); await p.keyboard.press('Enter'); };
  const fresh = async p => { await go(p); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(150); };
  const stored = (p, k) => p.evaluate(k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return 'refused'; } }, k || KEY);
  const look = p => p.evaluate(() => {
    const $ = id => document.getElementById(id), b = $('bScratch'), k = $('kscr'), r = e => { const x = e.getBoundingClientRect(); return { l: x.left, t: x.top, w: x.width, h: x.height, r: x.right, b: x.bottom }; };
    const vis = e => !!e && getComputedStyle(e).display !== 'none' && e.getClientRects().length > 0, a = document.activeElement;
    return { btn: vis(b), bbox: b && r(b), word: vis(b && b.querySelector('.cw')), icon: vis(b && b.querySelector('svg')), exp: b && b.getAttribute('aria-expanded'), ctl: b && b.getAttribute('aria-controls'),
      label: b && b.getAttribute('aria-label'), used: !!b && b.classList.contains('used'), tr: b && b.getAttribute('translate'), after: b && b.previousElementSibling && b.previousElementSibling.id,
      open: vis(k), panel: k && r(k), bar: document.querySelector('.watch').getBoundingClientRect().bottom, chip: k ? $('kscrQ').textContent : '', notes: k ? $('kscrN').value : '',
      focus: a ? a.id || a.tagName : '', sheet: !!k && k.classList.contains('kssheet'), vw: document.documentElement.clientWidth, vh: innerHeight, sw: document.documentElement.scrollWidth,
      ro: k ? $('kscrR').textContent : '', live: k ? $('kscrL').textContent : '', z: k ? +getComputedStyle(k).zIndex : 0, qof: ($('pgQt') || {}).textContent || '' };
  });
  /* a paper square (0–20 from the lower left) on the screen */
  const at = (p, x, y) => p.evaluate(([x, y]) => { const s = document.getElementById('kscrG'), m = s.getScreenCTM(), q = s.createSVGPoint(); q.x = x * 18; q.y = 360 - y * 18; const o = q.matrixTransform(m); return [o.x, o.y]; }, [x, y]);
  const click = async (p, x, y) => { const c = await at(p, x, y); await p.mouse.click(c[0], c[1]); };
  const tool = (p, v) => p.click('#kscr [role=radio][data-v="' + v + '"]');
  const things = async p => { await p.waitForTimeout(380); const s = await stored(p); const q = s && s.q && s.q[await p.evaluate(() => { const c = document.querySelector('.q.pg-on[data-q]') || document.querySelector('.q[data-q]'); return c.getAttribute('data-q'); })]; return JSON.stringify(q ? q.g.o : []); };

  /* ---- 1. the button and opening */
  let { ctx, p } = await context();
  await fresh(p);
  let L = await look(p);
  if (L.btn) F('the button shows on the start screen');
  await begin(p); L = await look(p);
  if (!L.btn || L.bbox.h < 44 || !L.word || !L.icon || L.exp !== 'false' || L.tr !== 'no' || L.after !== 'bCalc' || L.label !== 'Scratch paper') F('the button: ' + JSON.stringify(L));
  await p.click('#bScratch'); await p.waitForTimeout(80); L = await look(p);
  if (!L.open || L.exp !== 'true' || L.ctl !== 'kscr' || L.focus !== 'kscrN' || L.chip !== 'Question 1') F('opened: ' + JSON.stringify(L));
  if (L.panel.l > 40 || L.panel.t < L.bar || L.panel.b > L.vh) F('not docked at the left under the bar: ' + JSON.stringify(L.panel));
  const dlg = await p.evaluate(() => { const k = document.getElementById('kscr'); return [k.getAttribute('role'), k.getAttribute('translate'), !!document.getElementById(k.getAttribute('aria-labelledby'))]; });
  if (dlg[0] !== 'dialog' || dlg[1] !== 'no' || !dlg[2]) F('the panel is not a labelled dialog with translate="no": ' + dlg);
  await p.keyboard.press('Escape'); L = await look(p);
  if (L.open || L.focus !== 'bScratch') F('Escape did not close it with focus back on the button: ' + JSON.stringify(L));
  /* Tab order: Close, the switch, the notes, Clear */
  await p.click('#bScratch'); await p.focus('#kscrX'); const order = [];
  for (let i = 0; i < 3; i++) { await p.keyboard.press('Tab'); order.push(await p.evaluate(() => { const a = document.activeElement; return a.id || a.getAttribute('data-v') || a.tagName; })); }
  if (order.slice(0, 2).join() !== 'notes,kscrN') F('Tab order from Close: ' + order.join());

  /* ---- 2. notes per question, the dot, a reload, Clear and Undo */
  await p.focus('#kscrN'); await p.keyboard.type('3x + 4 = 19');
  L = await look(p); if (!L.used || L.label !== 'Scratch paper, used on this question') F('no dot on a question with notes: ' + JSON.stringify(L));
  await nav(p, '#pgNext'); await p.waitForTimeout(80); L = await look(p);
  if (!L.open || L.chip !== 'Question 2' || L.notes !== '' || L.used) F('Next did not show question 2\'s own (empty) notes: ' + JSON.stringify(L));
  await p.focus('#kscrN'); await p.keyboard.type('two');
  await nav(p, '#pgPrev'); await p.waitForTimeout(80); L = await look(p);
  if (L.notes !== '3x + 4 = 19' || L.chip !== 'Question 1') F('Back did not bring question 1\'s notes: ' + JSON.stringify(L));
  await p.waitForTimeout(350); await p.reload(); await p.waitForTimeout(150); await begin(p); await p.click('#bScratch'); await p.waitForTimeout(60); L = await look(p);
  if (L.notes !== '3x + 4 = 19' || !L.used) F('after a reload the notes are gone: ' + JSON.stringify(L));
  const s0 = await stored(p); if (!s0 || !s0.q || !s0.q['1'] || s0.q['2'].n !== 'two' || !(s0.t > 0)) F('stored: ' + JSON.stringify(s0));
  await p.click('#kscrNC'); L = await look(p); const w1 = await p.textContent('#kscrNC');
  if (L.notes !== '' || w1 !== 'Undo') F('Clear: ' + JSON.stringify([L.notes, w1]));
  await p.click('#kscrNC'); L = await look(p); const w2 = await p.textContent('#kscrNC');
  if (L.notes !== '3x + 4 = 19' || w2 !== 'Clear') F('Undo after Clear: ' + JSON.stringify([L.notes, w2]));

  /* ---- 3. the grid by mouse (four quadrants: paper 10,10 is the origin) */
  await p.click('#kscr [data-v="grid"]'); await p.waitForTimeout(60);
  if (await p.evaluate(() => getComputedStyle(document.getElementById('kscrG')).touchAction) !== 'none') F('the graph is not touch-action: none');
  await tool(p, 'p'); await click(p, 13, 8);
  { const c = await at(p, 13, 8); await p.mouse.move(c[0] + 3, c[1] - 2); L = await look(p);
    if (L.ro !== '(3, −2)') F('the readout at (3, −2) says "' + L.ro + '"');
    if (!await p.$('#kscrG .ksring')) F('no ring at the intersection under the pointer'); }
  await tool(p, 's'); await click(p, 4, 4); await click(p, 12, 14);
  { const a = await at(p, 10, 10), b = await at(p, 14, 6); await p.mouse.move(a[0], a[1]); await p.mouse.down(); await p.mouse.move(b[0], b[1], { steps: 4 });
    if (!await p.$('#kscrG .kspv')) F('no dashed preview while a segment is drawn'); await p.mouse.up(); }
  await tool(p, 'l'); await click(p, 10, 11); await click(p, 12, 15);
  let o = await things(p);
  if (o !== JSON.stringify([['p', 13, 8], ['s', 4, 4, 12, 14], ['s', 10, 10, 14, 6], ['l', 10, 11, 12, 15]])) F('plotted by mouse: ' + o);
  { const ln = await p.evaluate(() => { const l = document.querySelectorAll('#kscrG .ksitems line.kspen')[2]; return l && [+l.getAttribute('x1'), +l.getAttribute('y1'), +l.getAttribute('x2'), +l.getAttribute('y2')]; });
    const edge = (x, y) => Math.min(Math.abs(x), Math.abs(360 - x), Math.abs(y), Math.abs(360 - y)) < 8;
    if (!ln || !edge(ln[0], ln[1]) || !edge(ln[2], ln[3])) F('the line does not run to the paper\'s edges: ' + ln);
    const n = await p.evaluate(() => [document.querySelectorAll('#kscrG .ksitems .ksarr').length, document.querySelectorAll('#kscrG .ksitems .ksdot').length]);
    if (n[0] !== 2 || n[1] !== 7) F('arrowheads and points: ' + n + ' (2 arrowheads; 1 point + 2 × 3 ends)'); }
  await tool(p, 'e'); { const c = await at(p, 13, 8); await p.mouse.move(c[0] + 2, c[1] + 2); }
  if (!await p.$('#kscrG .ksitems .ksgo')) F('Erase does not show what would go');
  await click(p, 13, 8); o = await things(p);
  if (o !== JSON.stringify([['s', 4, 4, 12, 14], ['s', 10, 10, 14, 6], ['l', 10, 11, 12, 15]])) F('erase: ' + o);
  await p.click('#kscrU'); o = await things(p); if (!o.includes('["p",13,8]')) F('Undo did not bring the point back: ' + o);
  await p.click('#kscrC'); o = await things(p); if (o !== '[]' || !await p.isDisabled('#kscrC')) F('Clear: ' + o);
  await p.click('#kscrU'); o = await things(p); if (JSON.parse(o).length !== 4) F('Undo after Clear: ' + o);
  /* the views and the scale: the numbers and the readout change, the things stay */
  const nums = () => p.evaluate(() => Array.from(document.querySelectorAll('#kscrG .ksn')).map(t => t.textContent));
  let ns = await nums(); if (!ns.includes('−10') || !ns.includes('10') || ns.includes('20')) F('four quadrants\' numbers: ' + ns.join(' '));
  await p.click('#kscr [data-v="5"]'); ns = await nums();
  if (!ns.includes('−50') || !ns.includes('50')) F('Scale 5\'s numbers: ' + ns.join(' '));
  { await tool(p, 'p'); const c = await at(p, 13, 8); await p.mouse.move(c[0], c[1]); L = await look(p); if (L.ro !== '(15, −10)') F('Scale 5\'s readout at paper (13, 8): ' + L.ro); }
  await p.click('#kscr [aria-label="First quadrant"]'); ns = await nums();
  if (!ns.includes('100') || ns.some(n => n.startsWith('−'))) F('first quadrant at Scale 5: ' + ns.join(' '));
  o = await things(p); if (JSON.parse(o).length !== 4) F('a change of view moved what was plotted: ' + o);
  { const s = await stored(p); if (JSON.stringify(s.q['1'].g.v) !== '[1,5]') F('the view and scale are not kept: ' + JSON.stringify(s.q['1'].g.v)); }
  await p.reload(); await p.waitForTimeout(150); await begin(p); await p.click('#bScratch'); await p.waitForTimeout(80);
  if (!await p.isVisible('#kscrG') || JSON.stringify(await nums()).indexOf('100') < 0 || (await p.$$('#kscrG .ksitems line.kspen')).length !== 3) F('after a reload the grid (tab, view, scale or things) is not back');
  await nav(p, '#pgNext'); await p.waitForTimeout(80);
  if ((await p.$$('#kscrG .ksitems > *')).length || (await nums()).includes('100')) F('question 2 shows question 1\'s grid');

  /* ---- 4. the grid by keyboard, on question 2 */
  await p.focus('#kscrG'); await tool(p, 'p'); await p.focus('#kscrG');
  await p.keyboard.press('ArrowRight'); await p.keyboard.press('ArrowRight'); await p.keyboard.press('Shift+ArrowUp'); L = await look(p);
  if (L.ro !== '(2, 5)') F('the arrows and Shift put the cursor at ' + L.ro);
  await p.keyboard.press('Enter'); await p.waitForTimeout(80); L = await look(p);
  if (!/Point \(2, 5\)/.test(L.live)) F('the live region after a point: "' + L.live + '"');
  await tool(p, 's'); await p.focus('#kscrG'); await p.keyboard.press('Enter'); await p.keyboard.press('ArrowDown'); await p.keyboard.press('ArrowDown'); await p.keyboard.press('Space');
  await tool(p, 'l'); await p.focus('#kscrG'); await p.keyboard.press('Enter'); await p.keyboard.press('ArrowLeft'); await p.keyboard.press('Escape');
  L = await look(p); if (!L.open || await p.$('#kscrG .kslive .ksdot')) F('Escape did not cancel the half-drawn line first');
  o = await things(p); if (o !== JSON.stringify([['p', 12, 15], ['s', 12, 15, 12, 13]])) F('plotted by keyboard: ' + o);
  await p.keyboard.press('ArrowRight'); await p.keyboard.press('ArrowUp'); await p.keyboard.press('ArrowUp'); await p.keyboard.press('Delete');
  o = await things(p); if (o !== JSON.stringify([['s', 12, 15, 12, 13]])) F('Delete at the cursor: ' + o);
  { const a = await p.evaluate(() => { const g = document.getElementById('kscrG'); return [g.getAttribute('tabindex'), g.getAttribute('role'), g.getAttribute('aria-label')]; });
    if (a.join('|') !== '0|application|Graph paper, Question 2') F('the graph\'s tab stop and name: ' + a.join('|')); }
  await p.keyboard.press('Escape'); L = await look(p); if (L.open || L.focus !== 'bScratch') F('Escape on the graph did not close the panel');

  /* ---- 5. Start over and a mode switch empty the set; a new set starts empty */
  await p.evaluate(() => { const m = document.getElementById('mMenu'); if (m && m.hidden) document.getElementById('bMore').click(); document.querySelector('.setbox').open = true; });
  await p.click('#bAgain'); await p.click('#cy'); await p.waitForTimeout(150);
  if (await stored(p)) F('Start over left the set\'s scratch: ' + JSON.stringify(await stored(p)));
  await begin(p); await p.click('#bScratch'); await p.click('#kscr [data-v="notes"]'); L = await look(p);
  if (L.notes !== '' || L.used) F('after Start over question 1 still has notes');
  await p.focus('#kscrN'); await p.keyboard.type('m'); await p.waitForTimeout(350);
  { const other = await p.evaluate(() => document.querySelector('.mode button:not([aria-pressed="true"])') ? document.querySelector('.mode button:not([aria-pressed="true"])').dataset.mode : '');
    if (other) { await p.evaluate(m => document.querySelector('.mode button[data-mode="' + m + '"]').click(), other); if (await p.isVisible('#cy')) await p.click('#cy'); await p.waitForTimeout(150);
      if (await stored(p)) F('a switch of mode that clears the answers left the scratch'); } }
  await go(p, SEED + 1); await begin(p); L = await look(p); if (L.used) F('a new set starts with a dot');
  if (!L.btn) F('no button on a new set\'s question'); else { if (!L.open) await p.click('#bScratch'); L = await look(p); if (L.notes !== '' || L.chip !== 'Question 1') F('a new set starts with notes: ' + JSON.stringify(L)); }
  /* the 30 sets used last are kept */
  await p.evaluate(() => { for (let i = 0; i < 34; i++) localStorage.setItem('practice.scratch.v1.old.' + i, JSON.stringify({ t: 1000 + i, q: { 1: { n: 'x', g: { v: [4, 1], o: [] } } } })); });
  await p.focus('#kscrN'); await p.keyboard.type('new'); await p.waitForTimeout(400);
  { const ks = await p.evaluate(() => Object.keys(localStorage).filter(k => k.indexOf('practice.scratch.v1.') === 0));
    if (ks.length !== 30 || ks.includes('practice.scratch.v1.old.0') || !ks.includes('practice.scratch.v1.old.33') || !ks.includes('practice.scratch.v1.' + U.id + '.set.' + (SEED + 1) + '.all')) F('pruning kept ' + ks.length + ' sets'); }
  await ctx.close();

  /* ---- 6. a second tab on the same set keeps the other tab's questions */
  ({ ctx, p } = await context());
  await fresh(p); await begin(p);
  const p2 = await ctx.newPage(); p2.on('pageerror', e => errs.push(e.message)); await go(p2); await begin(p2);
  await p.click('#bScratch'); await p.keyboard.type('tab one'); await p.waitForTimeout(350);
  await nav(p2, '#pgNext'); await p2.waitForTimeout(60); await p2.click('#bScratch'); await p2.keyboard.type('tab two'); await p2.waitForTimeout(350);
  await p.focus('#kscrN'); await p.keyboard.type('!'); await p.waitForTimeout(350);
  { const s = await stored(p); if (!s || !s.q['1'] || s.q['1'].n !== 'tab one!' || !s.q['2'] || s.q['2'].n !== 'tab two') F('two tabs: ' + JSON.stringify(s)); }
  await nav(p2, '#pgPrev'); await p2.waitForTimeout(80); if ((await look(p2)).notes !== 'tab one!') F('the second tab does not show the first tab\'s notes for question 1');

  /* ---- 7. dragging, the window, and the calculator */
  await p.close(); p = p2; await p.click('#kscr [data-v="grid"]');
  const drag = async (dx, dy) => { const h = await p.evaluate(() => { const r = document.getElementById('kscrT').getBoundingClientRect(); return [r.right + 30, r.top + r.height / 2]; });
    await p.mouse.move(h[0], h[1]); await p.mouse.down(); await p.mouse.move(h[0] + dx, h[1] + dy, { steps: 6 }); await p.mouse.up(); await p.waitForTimeout(60); return look(p); };
  const L0 = await look(p); L = await drag(300, 40);
  if (Math.abs(L.panel.l - L0.panel.l - 300) > 2) F('dragging by the header did not move it: ' + L0.panel.l + ' → ' + L.panel.l);
  L = await drag(0, -400); if (L.panel.t < L.bar) F('dragged over the bar: top ' + L.panel.t + ', bar ' + L.bar);
  const kept = L.panel; await p.click('#kscrX'); await p.reload(); await p.waitForTimeout(150); await begin(p); await p.click('#bScratch'); await p.waitForTimeout(80); L = await look(p);
  if (Math.abs(L.panel.l - kept.l) > 2 || Math.abs(L.panel.t - kept.t) > 2) F('the place is not remembered: ' + JSON.stringify([kept, L.panel]));
  await p.setViewportSize({ width: 800, height: 640 }); await p.waitForTimeout(150); L = await look(p);
  if (L.panel.r > L.vw + 1 || L.panel.l < 0 || L.panel.t < L.bar) F('a smaller window does not keep it inside: ' + JSON.stringify(L.panel));
  await p.setViewportSize({ width: 1280, height: 800 }); await p.waitForTimeout(100);
  await p.click('#bCalc'); await p.waitForTimeout(150);
  { const zc = () => p.evaluate(() => [+getComputedStyle(document.getElementById('kscr')).zIndex, +getComputedStyle(document.getElementById('kcalc')).zIndex]);
    let z = await zc(); if (!(z[1] > z[0])) F('the calculator, pressed last, is not on top: ' + z);
    await p.click('#kscrT'); z = await zc(); if (!(z[0] > z[1])) F('the scratch paper, pressed last, is not on top: ' + z);
    await p.click('#kcalcT'); z = await zc(); if (!(z[1] > z[0])) F('the calculator, pressed again, is not on top: ' + z); }
  await ctx.close();

  /* ---- 8. a phone: the bottom sheet, true dark; forced light */
  ({ ctx, p } = await context({ viewport: { width: 390, height: 844 }, colorScheme: 'dark' }));
  await fresh(p); await begin(p); L = await look(p);
  if (!L.btn || L.word || !L.icon || L.bbox.w < 44 || L.bbox.h < 44) F('the phone\'s button: ' + JSON.stringify(L));
  await p.click('#bScratch'); await p.waitForTimeout(100); L = await look(p);
  if (!L.sheet || Math.abs(L.panel.b - 844) > 1 || L.panel.h > 844 * 0.8 || L.focus !== 'kscrT' || L.sw > L.vw) F('the phone\'s sheet: ' + JSON.stringify(L));
  for (const tab of ['notes', 'grid']) {
    await p.click('#kscr [data-v="' + tab + '"]'); await p.waitForTimeout(80);
    const small = await p.evaluate(() => Array.from(document.querySelectorAll('#kscr button')).filter(e => e.offsetParent).map(e => { const r = e.getBoundingClientRect(); return [e.id || e.getAttribute('data-v'), Math.round(r.width), Math.round(r.height)]; }).filter(x => x[1] < 44 || x[2] < 44));
    if (small.length) F('targets under 44 px on the ' + tab + ' sheet: ' + JSON.stringify(small));
    L = await look(p); if (L.sw > L.vw) F('sideways scroll with the ' + tab + ' sheet');
    const clear = await p.evaluate(() => { window.scrollTo(0, document.documentElement.scrollHeight); const k = document.getElementById('kscr').getBoundingClientRect(), q = document.querySelector('.pgnav') || document.querySelector('.q.pg-on');
      return { pad: parseFloat(getComputedStyle(document.body).paddingBottom), h: k.height, nav: q.getBoundingClientRect().bottom, top: k.top }; });
    if (clear.pad < clear.h || clear.nav > clear.top) F('the question cannot scroll clear of the ' + tab + ' sheet: ' + JSON.stringify(clear));
  }
  { const dk = await p.evaluate(() => { const c = getComputedStyle(document.getElementById('kscr')), t = getComputedStyle(document.getElementById('kscrT')); return [c.backgroundColor, t.color]; });
    const v = (dk[0].match(/[\d.]+/g) || []).map(Number); if (!(v[0] < 40 && v[1] < 40 && v[2] < 45 && v[2] - v[0] < 15) || !/255, 255, 255/.test(dk[1])) F('dark is not true dark: ' + dk.join(' / ')); }
  await p.evaluate(() => { const n = document.getElementById('pgNext').getBoundingClientRect(), k = document.getElementById('kscr').getBoundingClientRect(); window.scrollBy(0, n.bottom - k.top + 12); });
  await p.click('#pgNext'); await p.waitForTimeout(80); L = await look(p);
  if (!L.open || L.chip !== 'Question 2') F('the page behind the sheet is not usable (Next): ' + JSON.stringify(L));
  await p.click('#kscrX'); L = await look(p);
  if (L.open || L.focus !== 'bScratch' || await p.evaluate(() => document.documentElement.classList.contains('kscr-pad'))) F('Close on the phone: ' + JSON.stringify(L));
  await p.evaluate(() => localStorage.setItem('practice.theme', 'light')); await p.reload(); await p.waitForTimeout(150); await begin(p); await p.click('#bScratch');
  { const lt = await p.evaluate(() => getComputedStyle(document.getElementById('kscr')).backgroundColor); const v = (lt.match(/[\d.]+/g) || []).map(Number).map(x => /^color\(/.test(lt) ? x * 255 : x); if (!(v[0] > 200 && v[1] > 200 && v[2] > 190)) F('forced light under a dark device: ' + lt); }
  await ctx.close();

  /* ---- 9. print, a print preview, a teacher's view; the words; the checks' switch */
  ({ ctx, p } = await context());
  await fresh(p); await begin(p); await p.click('#bScratch'); await p.keyboard.type('n');
  { const words = await p.evaluate(() => { const out = [], k = document.getElementById('kscr');
      document.getElementById('kscrNP').hidden = false; document.getElementById('kscrGP').hidden = false;
      const w = document.createTreeWalker(k, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) { const t = n.nodeValue.trim(); if (t && !n.parentNode.closest('svg') && n.parentNode.id !== 'kscrN' && n.parentNode.id !== 'kscrR' && n.parentNode.id !== 'kscrL') out.push(t); }
      const svg = Array.from(k.querySelectorAll('svg text')).map(t => t.textContent);
      document.getElementById('kscrGP').hidden = true; return { out, svg }; });
    const bad = words.out.filter(t => WORDS.indexOf(t) < 0 && !/^Question \d+$/.test(t) && !/^(1|2|5|10)$/.test(t));
    if (bad.length) F('words in the panel beyond its list: ' + JSON.stringify(bad));
    if (words.svg.some(t => !/^(x|y|0|−?\d+)$/.test(t))) F('the graph holds words: ' + JSON.stringify(words.svg.filter(t => !/^(x|y|0|−?\d+)$/.test(t)))); }
  await p.emulateMedia({ media: 'print' });
  { const pr = await p.evaluate(() => [getComputedStyle(document.getElementById('bScratch')).display, getComputedStyle(document.getElementById('kscr')).display]); if (pr[0] !== 'none' || pr[1] !== 'none') F('printed, the page shows scratch paper: ' + pr); }
  const pdfPages = async () => { await p.emulateMedia({ media: 'print' }); const pdf = await p.pdf({ format: 'Letter' }); await p.emulateMedia({ media: 'screen' }); return (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length; };
  { const a = await pdfPages(); await p.click('#kscrX'); const b2 = await pdfPages(); if (a !== b2 || !a) F('the page prints ' + a + ' pages with the panel open and ' + b2 + ' with it closed'); }
  await p.click('#bScratch');
  for (const c of teacher ? ['printing', 'tview'] : ['printing']) {
    const r = await p.evaluate(async c => { document.body.classList.add(c); await new Promise(r => setTimeout(r, 30)); const k = document.getElementById('kscr'), v = [getComputedStyle(k).display, k.hidden, document.getElementById('bScratch').hidden]; document.body.classList.remove(c); await new Promise(r => setTimeout(r, 30)); return v; }, c);
    if (r[0] !== 'none' || !r[1] || !r[2]) F('scratch paper shows over ' + (c === 'tview' ? 'a teacher\'s view' : 'a print preview') + ': ' + r);
  }
  /* the summary: Finish, then no button */
  await p.evaluate(() => document.getElementById('bFinish').click()); await p.waitForTimeout(60); if (await p.isVisible('#cy')) await p.click('#cy'); await p.waitForTimeout(150);
  if ((await look(p)).btn) F('the button shows on the score summary');
  await ctx.close();
  /* every question on one screen (the checks' switch): it follows the bar's "Question N of M" */
  ({ ctx, p } = await context({}, switched));
  await go(p);
  { const q = await p.evaluate(() => { const c = document.querySelectorAll('#paper .q[data-q]:not(.xq)'); const t = c[Math.min(2, c.length - 1)]; window.scrollTo(0, t.getBoundingClientRect().top + scrollY - 120); return c.length; }); await p.waitForTimeout(200);
    L = await look(p); const qof = await p.textContent('#qof');
    if (!L.btn) F('with every question on one screen the button is hidden');
    else { await p.click('#bScratch'); L = await look(p); const n = (qof.match(/Question (\d+)/) || [])[1]; if (L.chip !== 'Question ' + n) F('with every question on one screen it names "' + L.chip + '", the bar "' + qof + '"'); } }
  await ctx.close();

  /* ---- 10. storage refused: it all works for the visit */
  ({ ctx, p } = await context());
  await ctx.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw new Error('refused'); } }); });
  await go(p); await p.reload(); await p.waitForTimeout(120); await begin(p); await p.click('#bScratch'); await p.keyboard.type('kept'); await nav(p, '#pgNext'); await nav(p, '#pgPrev'); await p.waitForTimeout(60);
  L = await look(p); if (L.notes !== 'kept' || !L.used) F('with storage refused the notes are not kept for the visit: ' + JSON.stringify(L));
  await p.click('#kscr [data-v="grid"]'); await click(p, 10, 10); if ((await p.$$('#kscrG .ksitems .ksdot')).length !== 1) F('with storage refused the grid does not plot');
  await ctx.close();

  if (off.length) F('asked the network for ' + off.length + ': ' + off.slice(0, 3).join(' | '));
  if (errs.length) F('page errors: ' + errs.slice(0, 3).join(' | '));
  console.log('W. scratch paper' + (teacher ? ' (teacher copy)' : '') + ': the button, notes and grid per question (mouse, keyboard), reload, Start over, 30 sets, two tabs, drag, phone sheet, dark, print, words, storage refused');
}
