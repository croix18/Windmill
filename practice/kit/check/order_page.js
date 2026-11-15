/* check/page.js part U (15 Nov 2026) — on every page, student and teacher:
   - A WALKTHROUGH'S OPTIONS SHUFFLED (HELP_STANDARD §5.2): on set 4821, the first choice step of every walkthrough shows its
     options in Kit.order(n, key | step | ask) — the order worked out here in Node from the unit — the same after a reload, and
     over the set the right option is not always in the same place (check/walk.js counts it over 300 sets);
   - NO × FOR MULTIPLICATION (Croix's classroom rule): with every question's worked solution open, the sheet; the worksheet and
     its key; My results; and on a teacher copy a make-up test with its key and (a unit with Unit.choices) the all-multiple-choice
     paper — none prints ×. A unit on core.js LEGACY_TIMES (its own words used × before the rule) is counted and reported. */
'use strict';
const path = require('path');
const K = require('../core.js');
module.exports = async function partU(b, url, U, dir, fail) {
  const F = m => fail('U. ' + m), teacher = /^teacher$/.test(path.basename(dir)), legacy = K.LEGACY_TIMES.indexOf(U.id) >= 0;
  const ctx = await b.newContext({ viewport: { width: 1000, height: 900 } }), p = await ctx.newPage(), errs = [];
  p.on('pageerror', e => errs.push(e.message));
  const seed = 4821, g = U.generate(seed), items = []; let qn = 0;
  g.sections.forEach(sec => sec.items.forEach(it => { qn++;
    if (it.type === 'parts') it.parts.forEach(x => items.push({ id: qn + x.label, x, type: x.kind === 'mc' ? 'mc' : x.kind === 'nline' ? 'nline' : x.kind === 'cgraph' ? 'cgraph' : 'text' }));
    else if (it.type === 'solo') items.push({ id: String(qn), x: it.part, type: it.part.kind === 'nline' ? 'nline' : it.part.kind === 'cgraph' ? 'cgraph' : 'text' });
    else items.push({ id: String(qn), x: it, type: it.type === 'multi' ? 'multi' : 'mc' }); }));
  await p.goto(url + '#set-' + seed); await p.evaluate(() => { try { localStorage.clear(); } catch (e) {} }); await p.goto(url + '#set-' + seed); await p.reload(); await p.waitForSelector('#paper .q'); await p.waitForTimeout(150);
  if (teacher) await p.waitForFunction(() => window.TEACHER && window.TEACHER.ready && window.TEACHER.ready(), null, { timeout: 8000 }).catch(() => {});

  /* the walkthrough's first choice step, in the question's order */
  const want = {}, placed = [];
  items.forEach(it => { let w; try { w = U.walk(it.x, it.type, { aShown: true, extra: false, mode: 'practice' }); } catch (e) { return; }
    if (!Array.isArray(w) || !w[0] || w[0].type !== 'choice' || !(w[0].opts || []).length) return;
    want[it.id] = K.order(w[0].opts.length, String(U.key(it.x)) + '|0|' + String(w[0].ask || '')); placed.push(want[it.id].findIndex(j => w[0].opts[j].ok)); });
  const shown = async () => { const out = {};
    for (const id of Object.keys(want)) {
      await p.evaluate(id => { for (let k = 1; k <= 2; k++) { const x = document.querySelector('[data-rung="' + id + '"][data-to="' + k + '"]'); if (x) x.click(); } const w = document.querySelector('[data-walk="' + id + '"]'); if (w) w.click(); }, id);
      out[id] = await p.evaluate(id => Array.from(document.querySelectorAll('#wl' + id + ' li.cur .wopt')).map(x => +x.dataset.wopt.split('|')[2]), id);
    }
    return out; };
  const a = await shown();
  Object.keys(want).forEach(id => { if (a[id] && a[id].length && a[id].join(',') !== want[id].join(',')) F('walkthrough ' + id + ' shows its options ' + a[id].join(',') + ', not ' + want[id].join(',')); });
  const nShown = Object.keys(a).filter(id => a[id] && a[id].length).length;
  if (!nShown && Object.keys(want).length) F('no walkthrough opened to check its order');
  await p.reload(); await p.waitForSelector('#paper .q'); await p.waitForTimeout(150);
  { const a2 = await shown(); Object.keys(a2).forEach(id => { if (a[id] && a2[id] && a2[id].join(',') !== a[id].join(',')) F('walkthrough ' + id + ' is in another order after a reload'); }); }
  if (placed.length >= 6 && new Set(placed).size < 2) F('every walkthrough of set ' + seed + ' has its right option in place ' + (placed[0] + 1));

  /* no × anywhere a student or the paper reads it */
  const count = async where => { const t = await p.evaluate(sel => { const e = document.querySelector(sel); if (!e) return ''; const c = e.cloneNode(true); c.querySelectorAll('.keys,script,style').forEach(x => x.remove()); return c.textContent; }, where); return (t.match(/[×✕✖]/g) || []).length; };
  for (const it of items) for (let k = 1; k <= 3; k++) await p.evaluate(([id, k]) => { const x = document.querySelector('[data-rung="' + id + '"][data-to="' + k + '"]'); if (x) x.click(); }, [it.id, k]);
  const seen = {}; seen.sheet = await count('#paper');
  const print = async kind => { await p.click('#bMore'); await p.click('#bPrint'); if (/^m[kc]\d/.test(kind)) await p.click('[data-print="' + kind.slice(0, 2) + '"]'); await p.click('[data-print="' + kind + '"]'); await p.waitForTimeout(150); const n = await count('#printview'); await p.click('#pvClose'); return n; };
  seen.worksheet = await print('wk'); seen.results = await print('res');
  if (teacher) { seen.makeup = await print('mk1'); if (typeof U.choices === 'function') seen.allMC = await print('mc1'); }
  const total = Object.values(seen).reduce((s, v) => s + v, 0), list = Object.keys(seen).map(k => k + ' ' + seen[k]).join(', ');
  if (total && !legacy) F('× is printed for multiplication (write a dot or parentheses): ' + list);
  if (errs.length) F('page errors: ' + errs.slice(0, 3).join(' | '));
  await ctx.close();
  console.log('U. walkthroughs in the question\'s order (' + nShown + ' checked on set ' + seed + ', the right option in places ' + Array.from(new Set(placed.map(x => x + 1))).sort().join(', ') + '); × ' +
    (total ? 'printed ' + total + ' times (' + list + ') — ' + U.id + ' is on core.js LEGACY_TIMES, reported' : 'nowhere (' + list + ')'));
};
