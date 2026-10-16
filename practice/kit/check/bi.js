/* Practice-test kit: the checks for a unit's second language (Rule 0 — the translation must never change the math).
   A unit's own check collects every piece of English the unit can show and calls run() with it. Fails when:
   - a table entry's Portuguese does not use exactly the pieces its English has (every number, math span, name, tag);
   - any piece of English has no translation (coverage is 100%, or the check fails and lists what is missing);
   - a translation has a number the English does not have, or leaves one out;
   - a translation has a different set of "a × b = c" statements from the English, or any of them is false;
   - a translation still has English words in it.
   Usage: require('<kit>/check/bi.js').run({unitTable, kitTable, names, corpus: [[source, html], …], evalSide}) */
'use strict';
const B = require('../bilingual.js');

/* 1. every entry: the same pieces in, the same pieces out */
function checkTable(T, fails) {
  const count = (s, re) => (s.match(re) || []).length;
  for (const k of Object.keys(T)) {
    const v = T[k];
    if (k === 'vp-head' || k === 'vp-join') continue;
    if (typeof v !== 'string' || !v.trim()) { fails.push('empty translation for "' + k + '"'); continue; }
    const kk = k.replace(/^vp:/, '');
    for (const t of ['#', '§', '@', '¤']) {
      const need = count(kk, new RegExp(t, 'g'));
      const explicit = []; v.replace(new RegExp(t + '\\{(\\d+)\\}', 'g'), (m, n) => { explicit.push(+n); return m; });
      const plain = count(v, new RegExp(t + '(?!\\{)', 'g'));
      if (explicit.length) {
        if (plain) fails.push('mixes ' + t + ' and ' + t + '{n} in "' + k + '"');
        for (let n = 1; n <= need; n++) if (explicit.indexOf(n) < 0) fails.push(t + '{' + n + '} never used in "' + k + '"');
        if (explicit.some(n => n < 1 || n > need)) fails.push(t + '{n} out of range in "' + k + '"');
      } else if (plain !== need) fails.push('"' + k + '" has ' + need + ' ' + t + ' but its translation has ' + plain);
    }
    if (/\d/.test(v.replace(/[#§@¤]\{\d+\}/g, '').replace(/<[^>]*>/g, '').replace(/&[a-z]+;/g, '').replace(/[²³]/g, ''))) {
      /* a digit typed into the Portuguese would be a number the English does not have (only "º" after a number is allowed) */
      fails.push('a digit typed in the translation of "' + k + '": ' + v);
    }
  }
}

/* the numbers in a piece of HTML, as a sorted list (inside math spans too; never inside tag attributes) */
function numbers(h) {
  const t = String(h).replace(/<svg[\s\S]*?<\/svg>/g, ' ').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ');
  return (t.match(/\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?/g) || []).sort();
}
/* the "a = b" runs of math in a piece of text */
const MATHCH = /[0-9.,×÷+\-−½²()\/ π=]/;
function strip(s) { return String(s).replace(/<svg[\s\S]*?<\/svg>/g, ' ').replace(/<span class="fr"><span class="nu">(.*?)<\/span><span class="de">(.*?)<\/span><\/span>/g, '($1/$2)').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' '); }
function eqRuns(text) {
  const t = strip(text).replace(/(\d)\s*\/\s*(\d)/g, '$1/$2'), runs = []; let cur = '';
  for (const ch of t) { if (MATHCH.test(ch)) cur += ch; else { if (cur) runs.push(cur); cur = ''; } }
  if (cur) runs.push(cur);
  return runs.filter(r => r.indexOf('=') >= 0).map(r => r.trim().replace(/[.,]+$/, '').replace(/\s+/g, ' ')).sort();
}
/* English words that must not be left in the Portuguese (none of them is also a Portuguese word) */
const EN = ['the', 'is', 'are', 'of', 'and', 'to', 'that', 'you', 'your', 'with', 'what', 'which', 'not', 'if', 'half', 'side', 'height',
  'triangle', 'rectangle', 'circle', 'radius', 'diameter', 'slice', 'slices', 'square', 'around', 'times', 'multiply', 'divide', 'add',
  'find', 'right', 'wrong', 'answer', 'number', 'each', 'one', 'two', 'first', 'then', 'only', 'this', 'it', 'its', 'by', 'for', 'or',
  'at', 'on', 'area', 'whole', 'circumference', 'hint', 'check', 'next', 'show', 'how', 'try', 'another', 'like', 'set', 'test',
  'part', 'parts', 'point', 'points', 'yet', 'correct', 'almost', 'step', 'steps', 'why', 'works', 'missing', 'corner', 'slanted',
  'dashed', 'line', 'leg', 'legs', 'trapezoid', 'parallelogram', 'rhombus', 'semicircle', 'type', 'just', 'here',
  'when', 'because', 'so', 'but', 'too', 'than', 'from', 'into', 'over', 'every', 'all', 'no', 'yes', 'who', 'did', 'does', 'make', 'made'];
/* letters on either side, accents included ("até" is not "at") */
const ENRE = new RegExp('(?<!\\p{L})(?:' + EN.filter(w => w !== 'no').join('|') + ')(?!\\p{L})', 'iu');
function english(pt, names) {
  let t = strip(pt.replace(/<span class="m"[\s\S]*?<\/span>/g, ' '));
  if (names && names.length) t = t.replace(new RegExp('\\b(?:' + names.join('|') + ')\\b', 'g'), ' ');
  const m = ENRE.exec(t); return m ? m[0] : null;
}

function run(o) {
  const fails = [], T = Object.assign({}, o.kitTable || {}, o.unitTable);
  checkTable(T, fails);
  const tr = B.make(T, o.names || []).tr;
  let n = 0, claims = 0;
  const missing = new Map(), add = (k) => missing.set(k, (missing.get(k) || 0) + 1);
  const pieces = [];
  for (const [src, h] of o.corpus) {
    if (src === 'why-pic') (h.match(/<p(?: [^>]*)?>[\s\S]*?<\/p>/g) || []).forEach(p => pieces.push([src, p.replace(/^<p(?: [^>]*)?>|<\/p>$/g, '')]));
    else pieces.push([src, h]);
  }
  for (const [src, en] of pieces) {
    if (!/[A-Za-z]/.test(strip(en))) continue;
    n++;
    const pt = tr(en);
    if (pt == null) { add(src + ': ' + en.slice(0, 300)); continue; }
    if (pt === en) {   /* the same in both: only right when nothing but names, numbers and units is left */
      let rest = strip(en).replace(/\b(?:cm|in|ft|mm|km|yd|m)\b/g, '');
      if (o.names && o.names.length) rest = rest.replace(new RegExp('\\b(?:' + o.names.join('|') + ')\\b', 'g'), '');
      if (/[A-Za-z]{2}/.test(rest)) fails.push('left in English: ' + en.slice(0, 160));
      continue;
    }
    const a = numbers(en).join(' '), b = numbers(pt);
    const bset = new Set(b), aset = new Set(numbers(en));
    if ([...aset].some(x => !bset.has(x)) || [...bset].some(x => !aset.has(x)) || b.length < numbers(en).length)
      fails.push('numbers differ:\n   EN ' + strip(en).slice(0, 200) + '\n   PT ' + strip(pt).slice(0, 200));
    const ea = eqRuns(en), eb = eqRuns(pt);
    if (ea.join(' | ') !== eb.join(' | ')) fails.push('the math statements differ:\n   EN ' + ea.join(' | ') + '\n   PT ' + eb.join(' | '));
    if (o.evalSide) for (const run of eb) {
      const sides = run.split('=');
      for (let i = 0; i + 1 < sides.length; i++) { const x = o.evalSide(sides[i]), y = o.evalSide(sides[i + 1]); if (x && y) { claims++; if (!o.same(x, y)) fails.push('false statement in the Portuguese: "' + run + '"'); } }
    }
    const w = english(pt, o.names); if (w) fails.push('English word "' + w + '" left in: ' + strip(pt).slice(0, 200));
  }
  for (const [k, c] of missing) fails.push('no translation (' + c + '×): ' + k);
  return { fails, pieces: n, claims, entries: Object.keys(T).length };
}
module.exports = { run, checkTable, numbers, eqRuns, english, strip };
