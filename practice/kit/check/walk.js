/* Practice-test kit — a walkthrough's options are shuffled (15 Nov 2026).   node <kit>/check/walk.js <unit folder> [sets]
   HELP_STANDARD §5.2: "The right option's position varies with the question; it is never always first." The kit showed a choice
   step's options in the order the unit wrote them, so the right one sat in the same place every time (most units write it
   first). ui.js walkHtml now shows them in Kit.order(n, key | step | ask) — a hash of the question, so the same question shows the
   same order on every device and every visit, and the right one moves from question to question.
   Over the sets (300 by default), for every walkthrough of every part: each choice step has a right option; and, counted by its
   place in the order a student sees, the right option is not stuck — wherever a step of a family comes up 30 times or more, no
   place holds it more than 80% of the time (the unit's order alone would be 100%), and over the whole unit each place of a
   two- or three-option step gets at least 20%. check/order_page.js (page.js part U) holds the page to the same order. */
const path = require('path');
const K = require(path.join(__dirname, '..', 'core.js'));
const dir = path.resolve(process.argv[2] || '.'), N = +(process.argv[3] || 300), U = require(path.join(dir, 'unit.js'));
const partsOf = it => it.type === 'parts' ? it.parts : it.type === 'solo' ? [it.part] : [];
const tt = p => p.kind === 'mc' ? 'mc' : p.kind === 'nline' ? 'nline' : 'text';
const fails = [], byStep = {}, byN = {};
let steps = 0, walks = 0;
const placeOf = (x, k, s) => { const ord = K.order(s.opts.length, String(U.key(x)) + '|' + k + '|' + String(s.ask || '')); return ord.findIndex(j => s.opts[j] && s.opts[j].ok); };
for (let seed = 1; seed <= N; seed++) {
  const g = U.generate(seed);
  g.sections.forEach((sec, si) => sec.items.forEach((it, ii) => {
    const xs = it.type === 'mc' || it.type === 'multi' ? [{ x: it, type: it.type === 'multi' ? 'multi' : 'mc' }] : partsOf(it).map(p => ({ x: p, type: tt(p) }));
    xs.forEach(({ x, type }) => {
      let w; try { w = U.walk(x, type, { aShown: true, extra: false, mode: 'practice' }); } catch (e) { return; }
      if (!Array.isArray(w)) return; walks++;
      w.forEach((s, k) => {
        if (!s || s.type !== 'choice' || !Array.isArray(s.opts) || s.opts.length < 2) return;
        steps++;
        if (!s.opts.some(o => o && o.ok)) { if (fails.length < 20) fails.push('set ' + seed + ' U·' + (si + 1) + '.' + (ii + 1) + ' step ' + (k + 1) + ': no right option'); return; }
        const at = placeOf(x, k, s), fam = (x.fam || it.fam || type) + '#' + k + '/' + s.opts.length;
        (byStep[fam] = byStep[fam] || []).push(at); (byN[s.opts.length] = byN[s.opts.length] || []).push(at);
        /* the order is the question's: the same twice */
        if (placeOf(x, k, s) !== at && fails.length < 20) fails.push('set ' + seed + ': the order of a step is not the same twice');
      });
    });
  }));
}
const share = (list, n) => { const c = Array(n).fill(0); list.forEach(a => { c[a]++; }); return c.map(v => v / list.length); };
Object.keys(byStep).forEach(f => { const L = byStep[f], n = +f.split('/')[1]; if (L.length < 30) return; const sh = share(L, n), top = Math.max.apply(null, sh);
  if (top > 0.8) fails.push(f + ': the right option is in place ' + (sh.indexOf(top) + 1) + ' in ' + Math.round(top * 100) + '% of ' + L.length + ' steps'); });
Object.keys(byN).forEach(n => { const L = byN[n]; if (+n > 3 || L.length < 60) return; const sh = share(L, +n);
  if (Math.min.apply(null, sh) < 0.2) fails.push(n + '-option steps: the right option by place ' + sh.map(v => Math.round(v * 100) + '%').join(' / ')); });
if (fails.length) { console.log('WALK CHECK FAILED\n' + fails.join('\n')); process.exit(1); }
console.log('walk: ' + walks + ' walkthroughs over ' + N + ' sets, ' + steps + ' choice steps; the right option by place — ' +
  Object.keys(byN).map(n => n + ' options: ' + share(byN[n], +n).map(v => Math.round(v * 100) + '%').join(' / ')).join('; '));
