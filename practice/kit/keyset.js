/* Practice-test kit: a unit's keys (8 Nov 2026).   node keyset.js <unit folder>   → a JSON list of keypad labels

   Croix, of an A7 Unit 6 lesson set on his phone: "Can you fix the symbols across everything so that they are even looking not
   like stretching across the screen. It's sloppy." A lesson item's keypad had all fourteen keys (− / a/b ^ ( ) π × √ = < ≤ ≥ >)
   on every unit, < ≤ ≥ > on a perimeter question. Now it has the unit's keys: the keys any answer of the unit can use — the
   union over the unit's practice-test families (their keys as a student types them, Unit.keyText, over sets 1–600) and its
   lesson items from Cadence (bank/cadence.json, each typed part's key). Decided per unit, never per question: a key shown
   only when a question's answer needs it would give the answer away (√ only for an answer with a radical).
   A symbol brings its whole family, so nothing hints at which of them an answer uses: any of < ≤ ≥ > brings all four, a
   fraction bar brings the fraction template, either parenthesis both. A key a unit might need is kept: a minus is any
   answer's "-" (a negative number or a subtraction), times is ×, *, · or an x between two numbers.
   build.py runs this and inlines the list (window.KIT_KEYSET); bank.js shows those keys on a lesson item's box, and ui.js leaves
   out of the practice test's keypad a key of the unit's own that no answer of the unit uses (the decimal point is in the list for
   that: a unit's own "." key; it is no lesson item's key). The checks (check/keys_page.js) work the union out again on their own
   and compare. */
'use strict';
const path = require('path'), fs = require('fs');
/* the lesson items' keys (bank.js) and the decimal point, in the keypad's own order */
const VOCAB = ['−', '×', '/', 'a/b', '^', '√', 'π', '.', '(', ')', '=', '<', '≤', '≥', '>'];
const FAMILIES = [
  [/[-−–]/, ['−']],
  [/[×*·]|\d\s*x\s*\d/, ['×']],
  [/\//, ['/', 'a/b']],
  [/\^|[⁰¹²³⁴⁵⁶⁷⁸⁹ⁿ]/, ['^']],
  [/√|sqrt/i, ['√']],
  [/π|\bpi\b/i, ['π']],
  [/\./, ['.']],
  [/[()]/, ['(', ')']],
  [/(^|[^<>!=])=(?!=)/, ['=']],
  [/[<>≤≥]/, ['<', '≤', '≥', '>']]
];
function keysOf(text) { const out = new Set(); for (const [re, ks] of FAMILIES) if (re.test(text)) ks.forEach(k => out.add(k)); return out; }
function bankDir(dir) { return [path.join(dir, 'bank'), path.join(dir, '..', 'bank')].find(d => fs.existsSync(path.join(d, 'cadence.json'))) || null; }
function unitKeys(dir, seeds) {
  dir = path.resolve(dir); const got = new Set(), add = t => keysOf(String(t)).forEach(k => got.add(k));
  const U = require(path.join(dir, 'unit.js'));
  for (let s = 1; s <= (seeds || 600); s++) {
    const g = U.generate(s);
    g.sections.forEach(sec => sec.items.forEach(it => {
      const ps = it.type === 'parts' ? it.parts : it.type === 'solo' ? [it.part] : [];
      ps.forEach(p => { if (!p || p.kind === 'mc' || p.kind === 'nline') return; let k = null; try { k = U.keyText(p); } catch (e) { return; } if (k != null) add(k); });
    }));
  }
  const bd = bankDir(dir);
  if (bd) { const B = JSON.parse(fs.readFileSync(path.join(bd, 'cadence.json'), 'utf8'));
    for (const L of Object.values(B.lessons)) for (const it of L.items) for (const p of ((it.answer || {}).parts || [])) if (p && typeof p.key === 'string' && p.type !== 'select' && p.type !== 'nline') add(p.key); }
  return VOCAB.filter(k => got.has(k));
}
module.exports = { VOCAB, keysOf, unitKeys };
if (require.main === module) {
  if (process.argv.length < 3) { console.error('node keyset.js <unit folder>'); process.exit(2); }
  process.stdout.write(JSON.stringify(unitKeys(process.argv[2])) + '\n');
}
