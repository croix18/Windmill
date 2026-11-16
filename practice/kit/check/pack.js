/* Practice-test kit: a part survives being sent as text (pack.js, 15 Nov 2026).   node check/pack.js <unit folder> [sets]
   Over 60 sets (or [sets]), every part is judged by the kit's judge (judge.js) as drawn and again after unpack(pack(part)):
   its key right, a wrong answer wrong, each multiple-choice option, a number line and a circle graph by their keys — every
   verdict and every word the same. Prints each kind of part that fails and why; exit 1 if any does.
   Not one of run.py's steps (a practice page does not need it): it gates the test page's build (practice/exam/DESIGN.md). */
'use strict';
const path = require('path');
const dir = path.resolve(process.argv[2] || '.'), SETS = +process.argv[3] || 60;
const KIT = path.join(__dirname, '..');
const U = require(path.join(dir, 'unit.js')), K = require(path.join(KIT, 'core.js')), NL = require(path.join(KIT, 'nline.js')), CG = require(path.join(KIT, 'cgraph.js'));
const { Judge } = require(path.join(KIT, 'judge.js')), { pack, unpack, problems } = require(path.join(KIT, 'pack.js'));
const J = Judge({ U, V: U.view, K, NL, CG });
const show = v => JSON.stringify(v, (k, x) => typeof x === 'bigint' ? x + 'n' : typeof x === 'function' ? '(fn)' : x === undefined ? '(undef)' : x);
const typeOf = p => p.kind === 'mc' ? 'mc' : p.kind === 'nline' ? 'nline' : p.kind === 'cgraph' ? 'cgraph' : 'text';
/* the set's parts as the page draws them (ui.js render, the whole test) */
function itemsOf(seed) {
  const g = U.generate(seed), out = []; let qn = 0;
  g.sections.forEach(sec => sec.items.forEach(it => { qn++;
    if (it.type === 'parts') it.parts.forEach((p, pi) => out.push({ id: qn + p.label, type: typeOf(p), x: p, kind: p.fam || it.fam || typeOf(p), sib: pi > 0 ? qn + it.parts[0].label : null, sibPart: pi > 0 ? it.parts[0] : null, aShown: true }));
    else if (it.type === 'solo') out.push({ id: String(qn), type: typeOf(it.part), x: it.part, kind: it.part.fam || it.fam || typeOf(it.part), sib: null, sibPart: null, aShown: true });
    else out.push({ id: String(qn), type: it.type === 'multi' ? 'multi' : 'mc', x: it, kind: it.fam || it.type, sib: null, sibPart: null, aShown: true });
  }));
  return out;
}
const key = (it) => it.type === 'nline' ? NL.graphOf(it.x) : it.type === 'cgraph' ? CG.graphOf(it.x) : it.type === 'mc' ? it.x.correct : it.type === 'multi' ? it.x.correct.slice() : U.keyText(it.x);
function wrong(it) {
  if (it.type === 'nline') { const Sp = NL.spec(it.x), g = NL.graphOf(it.x), i = NL.idx(Sp, g.c); return { c: NL.kstr(NL.val(Sp, i < Sp.n ? i + 1 : i - 1)), closed: g.closed, dir: g.dir }; }
  if (it.type === 'cgraph') { const k = CG.graphOf(it.x), st = CG.spec(it.x).step, a = k.map(s => ({ name: s.name, deg: s.deg })); a[0].deg += st; a[1].deg -= st; return a; }
  const B = J.boxesOf(it.x); return B ? B.map(() => '987654') : '987654';
}
/* the answers each part is tried with: [label, answer, must be right?, must not be right?] */
function tries(it) {
  if (it.type === 'mc' || it.type === 'multi') { const n = (it.x.opts || it.x.choices || []).length || 4, out = [];
    for (let k = 0; k < n; k++) out.push(['option ' + 'ABCDEFGH'[k], it.type === 'multi' ? [k] : k, false, false]);
    out.push(['the key', key(it), true, false]); return out; }
  return [['the key', key(it), true, false], ['a wrong answer', wrong(it), false, true]];
}
const fails = {}; let parts = 0, seen = new Set();
function fail(kind, why, where) { const k = kind + ' — ' + why; if (!fails[k]) fails[k] = { n: 0, where }; fails[k].n++; }
for (let s = 0; s < SETS; s++) {
  const seed = 1 + (s * 1667) % 99999, items = itemsOf(seed), byId = {}; items.forEach(it => { byId[it.id] = it; });
  for (const it of items) {
    parts++; seen.add(it.kind); const where = 'set ' + seed + ', ' + it.id;
    const bad = problems(it.x).concat(it.sibPart ? problems(it.sibPart).map(x => 'its part (a) ' + x) : []);
    if (bad.length) { fail(it.kind, 'cannot be packed: ' + bad.join('; '), where); continue; }
    let y, ys; try { y = unpack(pack(it.x)); ys = it.sibPart ? unpack(pack(it.sibPart)) : null; } catch (e) { fail(it.kind, 'pack/unpack threw: ' + e.message, where); continue; }
    const it2 = Object.assign({}, it, { x: y, sibPart: ys });
    const ctx = i => i.sib ? { prev: key({ type: typeOf(i.sibPart), x: i.sibPart }), prevPart: i.sibPart, prevOk: true, aShown: true, extra: false, mode: 'test' } : { aShown: true, extra: false, mode: 'test' };
    let c1, c2; try { c1 = ctx(it); c2 = ctx(it2); } catch (e) { fail(it.kind, 'its part (a) key: ' + e.message, where); continue; }
    if (show(c1.prev) !== show(c2.prev)) fail(it.kind, 'its part (a) key changed', where);
    for (const [lab, a, mustRight, mustNot] of tries(it)) {
      const f1 = J.judge(it, a, c1, 0), f2 = J.judge(it2, a, c2, 0);
      if (mustRight && f1.v !== 'right') fail(it.kind, lab + ' is not right even as drawn (' + f1.v + ')', where);
      if (mustNot && f1.v === 'right') fail(it.kind, lab + ' is right as drawn', where);
      if (show(f1) !== show(f2)) fail(it.kind, lab + ': ' + f1.v + ' as drawn, ' + f2.v + ' after unpack' + (f1.v === f2.v ? ' (its words differ)' : ''), where);
    }
    const k1 = it.type === 'text' ? show(U.keyText(it.x)) : '', k2 = it.type === 'text' ? show(U.keyText(y)) : '';
    if (k1 !== k2) fail(it.kind, 'its keyText changed', where);
  }
}
const ks = Object.keys(fails);
console.log('pack: ' + parts + ' parts over ' + SETS + ' sets, ' + seen.size + ' kinds' + (ks.length ? '' : ' — every part judges the same after unpack(pack())'));
ks.forEach(k => console.log('  FAIL ' + k + '  (' + fails[k].n + '×; first: ' + fails[k].where + ')'));
process.exit(ks.length ? 1 : 0);
