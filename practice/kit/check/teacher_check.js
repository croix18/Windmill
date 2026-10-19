/* Practice-test kit — Rule 0 for a teacher page's printout.   node <kit>/check/teacher_check.js <teacher folder>
   Every TeX string of the real test (stems, parts, choices, answers, notes, error notes) renders in KaTeX with throwOnError;
   on every form the printed test lists every item in order with one point label per part; the key has one row per part
   and every choice item's letters are its `correct`; the transfer flag is on the key only; every figure is an <svg>. Runs
   the kit's own teacher.js builders in Node against a stub DOM, so what is checked is what prints. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const dir = path.resolve(process.argv[2] || '.'), KIT = path.join(__dirname, '..');
const katex = require(path.join(KIT, 'vendor', 'katex', 'katex.min.js'));
const win = {}; vm.runInNewContext(fs.readFileSync(path.join(dir, 'test.js'), 'utf8'), { window: win });
const T = win.TEACHER_TEST; const fails = []; const fail = m => fails.push(m);
let n = 0, parts = 0, figs = 0;
const every = (s, where) => { String(s).split('$').forEach((seg, k) => { if (k % 2) { n++; try { katex.renderToString('\\displaystyle ' + seg, { throwOnError: true, strict: 'ignore', output: 'html' }); } catch (e) { fail(where + ': KaTeX refuses "' + seg + '": ' + (e.message || e)); } } }); };
Object.keys(T.forms).forEach(f => { let fp = 0; T.forms[f].forEach((sec, si) => sec.items.forEach((it, ii) => {
  const w = 'form ' + f + ' section ' + (si + 1) + ' item ' + (ii + 1);
  every(it.stem, w);
  if (it.fig != null) { figs++; if (!/^<svg[\s\S]*<\/svg>$/.test(it.fig)) fail(w + ': the figure is not an svg'); }
  if (it.parts) it.parts.forEach(p => { fp++; every(p.stem, w + p.label); every(p.answer, w + p.label + ' answer'); every(p.why, w + p.label + ' why'); });
  else { fp++; if (it.choices) { it.choices.forEach((c, k) => every(c, w + ' choice ' + k)); Object.values(it.errors || {}).forEach(e => every(e, w + ' error note')); } else every(it.answer, w + ' answer'); every(it.why, w + ' why'); }
})); if (fp !== T.total) fail('form ' + f + ' has ' + fp + ' parts for ' + T.total + ' points'); parts += fp; });
const stub = () => ({ className: '', innerHTML: '', hidden: false, dataset: {}, value: '', setAttribute() {}, insertBefore() {}, appendChild() {}, addEventListener() {}, focus() {}, querySelector: () => null, classList: { add() {}, remove() {} } });
const doc = { createElement: () => stub(), querySelector: () => stub(), getElementById: () => null, body: stub(), title: '' };
const ctx = { window: { TEACHER_TEST: T, katex }, document: doc, katex, Math, String, Object, console, setTimeout };
vm.runInNewContext(fs.readFileSync(path.join(KIT, 'teacher.js'), 'utf8'), ctx);
const TE = ctx.window.TEACHER; if (!TE) fail('teacher.js did not mount');
else Object.keys(T.forms).forEach(f => {
  const test = TE.testHtml(f), key = TE.keyHtml(f), W = 'form ' + f + ': ';
  if (TE.errors.length) fail(W + 'KaTeX errors while building: ' + JSON.stringify(TE.errors.slice(0, 3)));
  const nums = [...test.matchAll(/<b class="num">(\d+)\.<\/b>/g)].map(m => +m[1]);
  const want = T.forms[f].reduce((a, s) => a + s.items.length, 0);
  if (nums.length !== want || nums.some((v, i) => v !== i + 1)) fail(W + 'the printed test numbers ' + nums.join(',') + ' for ' + want + ' items');
  const pts = (test.match(/class="pt">1 pt</g) || []).length; if (pts !== T.total) fail(W + 'the printed test shows ' + pts + ' point labels for ' + T.total);
  const rows = (key.match(/<tr><td class="pk">/g) || []).length; if (rows !== T.total) fail(W + 'the key has ' + rows + ' rows for ' + T.total + ' parts');
  let qn = 0; T.forms[f].forEach(s => s.items.forEach(it => { qn++; if (it.choices) { const m = new RegExp('<td class="pk">' + qn + '</td><td class="kv">([\\s\\S]*?)</td>').exec(key); const letters = m ? [...m[1].matchAll(/<b>([A-H])\.<\/b>/g)].map(x => x[1]) : [];
    if (letters.join('') !== it.correct.map(c => 'ABCDEFGH'[c]).join('')) fail(W + 'key row ' + qn + ' letters ' + letters.join('') + ' but correct is ' + it.correct); } }));
  if (!/Name:/.test(test) || !/Date:/.test(test)) fail(W + 'no name/date line');
  if (!test.includes(T.two_day)) fail(W + 'the two-period line is missing');
  if (test.includes('TRANSFER')) fail(W + 'the transfer flag leaked onto the student paper');
  const nTr = T.forms[f].reduce((a, s) => a + s.items.filter(it => it.transfer).length, 0);
  if ((key.match(/TRANSFER ITEM/g) || []).length !== nTr) fail(W + 'the key flags ' + (key.match(/TRANSFER ITEM/g) || []).length + ' transfer items for ' + nTr);
  if ((test.match(/<svg class="tfig"/g) || []).length !== T.forms[f].reduce((a, s) => a + s.items.filter(it => it.fig).length, 0)) fail(W + 'figures printed ≠ figures in the data');
  if (!/Score tracker/.test(key)) fail(W + 'no score tracker on the key');
});
if (fails.length) { console.log('FAILURES (' + fails.length + '):\n' + fails.join('\n')); process.exit(1); }
console.log('teacher page: forms ' + Object.keys(T.forms).join(', ') + '; ' + n + ' TeX strings render, ' + parts + ' parts, ' + figs + ' figures; test and key built; TEACHER CHECKS PASS');
