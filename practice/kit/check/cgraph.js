/* Practice-test kit checks: answering a circle graph the student builds (kit kind cgraph, 15 Nov 2026) through the page, the way
   a student without a mouse does it — the circle in focus, Home, → a mark at a time and Space for each line; then the sectors'
   Tab stop, Home and → to each sector, and its name's button. Every page check that answers questions with their keys uses it.
     const CGF = require('./cgraph.js');  await CGF.fill(page, id, part, graph)   (graph: [{name, deg}] clockwise from 0°)
     CGF.kind(part) → 'cgraph' for such a part;  CGF.wrong(part) → a graph one mark off (its size wrong) */
'use strict';
const CG = require('../cgraph.js');
async function fill(p, id, part, g) {
  await p.evaluate(id => { const b = document.querySelector('[data-cg="' + id + '"][data-cgclr]'); if (b && !b.disabled) b.click(); }, id);
  g = g || CG.graphOf(part); const st = CG.spec(part).step;
  await p.focus('#cgc' + id); await p.keyboard.press('Home');
  let at = 0, t = 0;
  for (let i = 0; i < g.length - 1; i++) { t += g[i].deg; for (; at < t; at += st) await p.keyboard.press('ArrowRight'); await p.keyboard.press('Space'); }
  for (let i = 0; i < g.length; i++) { if (g[i].name == null) continue;
    await p.focus('#cgp' + id); await p.keyboard.press('Home'); for (let k = 0; k < i; k++) await p.keyboard.press('ArrowRight');
    await p.click('[data-cg="' + id + '"][data-cgn="' + String(g[i].name).replace(/"/g, '\\"') + '"]'); }
}
const kind = part => part && part.kind === 'cgraph' ? 'cgraph' : null;
function wrong(part) { const k = CG.graphOf(part), st = CG.spec(part).step, a = k.map(s => ({ name: s.name, deg: s.deg }));
  const j = a.findIndex((s, i) => i < a.length - 1 && a[i + 1].deg > st && a[i + 1].deg - st !== s.deg && s.deg + st !== a[i + 1].deg);
  const i = j >= 0 ? j : 0; a[i].deg += st; a[i + 1].deg -= st; return a; }
module.exports = { fill, kind, wrong, CG };
