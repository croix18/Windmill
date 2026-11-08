/* Practice-test kit: the edits layer (edits.js, 7 Nov 2026), under Node.   node edits.js <unit folder> [sets]
   1. every family of the unit, on every set drawn (default 400): its stem and its parts' lines cut into a template and filled
      again with the same set's values are the same HTML (extract → fill, compared as the browser shows it);
   2. the survey: every family's wordings, and the ones that are "wording not editable" with their reason (printed);
   3. a template edit fills every set of that wording, keeps every value, and is refused when a value is missing;
   4. the markup: no HTML from the teacher's words, TeX as data-tex, \$ for a dollar, placeholders checked;
   5. a hidden family is marked on every set (so a new set leaves it out) and the points the page would count drop by its
      parts; a points edit and a custom question in a section and in "More questions" give the totals they should. */
const path = require('path');
const E = require('../edits.js');
const dir = path.resolve(process.argv[2] || '.'), N = +process.argv[3] || 400;
const U = require(path.join(dir, 'unit.js'));
const fails = []; const ok = (c, m) => { if (!c) fails.push(m); };
const parts = it => E.partsOf(it);

/* 1. the round trip */
let fields = 0;
for (let s = 1; s <= N; s++) {
  U.generate(s).sections.forEach(sec => sec.items.forEach(it => {
    const prm = E.prmOf(it);
    E.fieldsOf(it, U.view).forEach(fd => {
      fields++;
      const x = E.extract(fd.html, prm), back = E.fill(x.tpl, x.vals);
      ok(E.canon(back) === E.canon(fd.html), `round trip: set ${s} ${E.famKey(it)} ${fd.f}\n  ${E.canon(fd.html)}\n  ${E.canon(back)}`);
      ok(E.problems(x.tpl, x.ph).length === 0 || !x.tpl.trim(), `the original template of ${E.famKey(it)} ${fd.f} is refused by its own rules: ${E.problems(x.tpl, x.ph)}`);
    });
  }));
}
/* 2. the survey */
const F = E.survey(U, U.view, Math.max(N, 600)), notEd = [];
F.forEach(f => Object.keys(f.fields).forEach(k => { const V = f.fields[k]; if (!V.editable) notEd.push(`${f.fk} ${k === 'stem' ? 'stem' : 'part ' + k.slice(5)}: ${V.why}`); }));
ok(F.length > 0 && F.every(f => f.fields.stem), 'the survey found no families');
/* 3. a template edit, on an editable stem */
const tgt = F.find(f => f.fields.stem.editable && f.fields.stem.variants.length === 1 && f.fields.stem.variants[0].ph.length) || F.find(f => f.fields.stem.editable);
if (tgt) {
  const v = tgt.fields.stem.variants[0], t = 'EDITED · ' + v.tpl;
  E.use({ edits: [{ target_kind: 'family', target: tgt.fk, stem: { [v.vh]: { t, ph: v.ph } } }], custom: [] });
  let n = 0;
  for (let s = 1; s <= 60; s++) {
    const g = E.applySet(U.generate(s), U.view, null);
    g.sections.forEach(sec => sec.items.forEach(it => { if (it._fk !== tgt.fk) return; const x = E.extract(U.view.stem(it), E.prmOf(it)); if (x.vh !== v.vh) return; n++;
      ok(it._est && E.canon(it._est) === E.canon('EDITED · ' + U.view.stem(it)), `an edited stem is not the original with its words changed (set ${s})`);
      ok(it._ed && it._ed.indexOf('wording') >= 0 && !it._edMiss, 'an edited item is not marked edited'); }));
  }
  ok(n > 0, 'the edited family never came up');
  ok(E.problems(v.tpl.replace(/\{\{[a-z0-9_]+\}\}/i, ''), v.ph).some(p => /missing/.test(p)) || !v.ph.length, 'a template that drops a value is not refused');
  E.use({ edits: [{ target_kind: 'family', target: tgt.fk, stem: { [v.vh]: { t: 'x', ph: ['zz9'] } } }], custom: [] });
  const g2 = E.applySet(U.generate(3), U.view, null), it2 = [].concat(...g2.sections.map(s => s.items)).find(i => i._fk === tgt.fk);
  ok(!it2 || (it2._est == null && (it2._edMiss || E.extract(U.view.stem(it2), E.prmOf(it2)).vh !== v.vh)), 'a template whose values are not the question\'s is applied');
}
/* 4. the markup */
ok(E.fill('<script>alert(1)</script> & "q"', null) === '&lt;script&gt;alert(1)&lt;/script&gt; &amp; &quot;q&quot;', 'the teacher\'s words are not escaped');
ok(/^<span class="m" data-tex="\\frac\{1\}\{2\}">1\/2<\/span>$/.test(E.fill('$\\frac{1}{2}$', null)), 'TeX is not drawn as a data-tex span: ' + E.fill('$\\frac{1}{2}$', null));
ok(E.fill('costs \\$5', null) === 'costs $5' && E.problems('costs $5', null).length > 0, '\\$ is not a dollar sign, or a lone $ is accepted');
ok(E.fill('**a**\nb', null) === '<b>a</b><br>b', 'bold and a new line are not drawn');
ok(E.problems('<b>x</b>', null).length && E.problems('$\\href{x}{y}$', null).length && E.problems('{{n1}}', null).length, 'HTML, \\href or a value in a custom question is accepted');
/* 5. hidden families, points, custom questions: the totals the page counts */
const pts = g => [].concat(...g.sections.map(s => s.items)).filter(it => !it._hid).reduce((t, it) => t + parts(it).reduce((u, p) => u + (typeof p._pts === 'number' ? p._pts : 1), 0), 0);
E.use(null);
const g0 = U.generate(7), base = pts(g0), h = F[F.length > 2 ? 1 : 0], hp = h.parts.length;
E.use({ edits: [{ target_kind: 'family', target: h.fk, hidden: true }], custom: [] });
for (const s of [7, 11, 4821]) {
  const g = E.applySet(U.generate(s), U.view, null), its = [].concat(...g.sections.map(x => x.items));
  ok(its.filter(it => it._fk === h.fk).every(it => it._hid), `set ${s}: the hidden family is not marked`);
  ok(E.hiddenFams().join() === h.fk, 'hiddenFams() is not the hidden family');
  if (s === 7) ok(pts(g) === base - (its.some(it => it._fk === h.fk) ? hp : 0), `hiding ${h.fk} does not take its ${hp} point(s) off the total (${pts(g)} of ${base})`);
}
const p2 = F.find(f => f.type === 'parts') || F[0], lab = p2.type === 'parts' ? p2.parts[0].label : '';
E.use({ edits: [{ target_kind: 'family', target: p2.fk, points: { [lab]: 3 } }], custom: [] });
const g3 = E.applySet(U.generate(7), U.view, null), has3 = [].concat(...g3.sections.map(x => x.items)).some(it => it._fk === p2.fk);
ok(pts(g3) === base + (has3 ? 2 : 0), 'a 3-point part does not add 2 to the total');
const kit = b => ({ type: 'solo', part: { bank: b, kind: 'bank', label: '' }, bank: b });
E.use({ edits: [], custom: [{ id: 'aa11', section: '0', stem: 'What is $3 \\times 4$?', type: 'number', key: { answer: '12' }, solution: '', points: 2, position: 0 },
  { id: 'bb22', section: 'extra', stem: 'Which?', type: 'mc', key: { options: ['a', 'b'], correct: 1 }, solution: '', points: 1, position: 1 }] });
const g4 = E.applySet(U.generate(7), U.view, kit);
ok(g4.sections[0].items.slice(-1)[0].custom && g4.sections[0].items.slice(-1)[0].custom.n === 1 && g4.sections.slice(-1)[0].title === E.EXTRA_TITLE && g4.sections.slice(-1)[0].items[0].custom.n === 2, 'custom questions are not in their section and in More questions');
ok(pts(g4) === base + 3, `two custom questions (2 + 1 points) do not add 3 (${pts(g4)} of ${base})`);
ok([].concat(...g4.sections.map(s => s.items)).filter(it => !it.custom).every((it, i) => it._qn === i + 1), 'the native questions do not keep their IDs (U·1, U·2 …) with custom questions added');
const types = { number: { answer: '12' }, expression: { answer: '3x + 2' }, text: { answer: 'commutative', alts: ['commutative property'] }, mc: { options: ['$\\frac12$', 'b'], correct: 0 }, inequality: { answer: 'x >= 3' }, nline: { lo: '-5', st: '1', c: '2', closed: true, dir: 'left' } };
for (const [t, key] of Object.entries(types)) {
  const b = E.customBank({ id: 't' + t, stem: 'Q $x$', type: t, key, solution: 'one\ntwo $y$' }, 1);
  ok(b.id === 'c-t' + t && b.stem.length === 2 && b.solution.length === 2, `a custom ${t} question is not a Cadence-shaped item`);
  ok(t === 'mc' ? b.answer.kind === 'choice' && b.answer.key === 0 && b.choices.length === 2 : b.answer.kind === 'free' && b.answer.parts[0].type === (t === 'nline' ? 'nline' : t), `a custom ${t} question's answer is wrong: ${JSON.stringify(b.answer)}`);
}
E.use(null);

console.log(`edits: ${F.length} families, ${fields} fields over ${N} sets — extract → fill the same HTML; templates, markup, hidden families, points and custom questions checked`);
console.log(notEd.length ? 'wording not editable:\n  ' + notEd.join('\n  ') : 'wording not editable: none');
if (fails.length) { console.log('EDITS CHECK FAILED (' + fails.length + '):\n' + fails.slice(0, 20).join('\n')); process.exit(1); }
