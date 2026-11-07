/* Practice-test kit — the answer normaliser (core.js Kit.Ans), case by case.   node <kit>/check/norm.js
   The page turns a unit's "not yet" into "right" only when the typed answer IS the key written another way (7 Nov 2026, the
   practice-test deepening, item 3). Every row is [typed, key, form, equivalent?, nudge (a part of it), why]. The rows that
   must NOT be equivalent matter as much as the others: the normaliser never does the arithmetic a question asks for. run.py
   runs this before a unit's own checks. */
const K = require('../core.js'), A = K.Ans;
const Y = true, N = false;
const cases = [
  /* sides of an equation, and of an inequality */
  ['3 = x', 'x = 3', {}, Y, '', 'sides swapped'],
  ['x=3', 'x = 3', {}, Y, '', 'spaces'],
  ['y = 2x + 1', '2x + 1 = y', {}, Y, '', 'an equation, sides swapped'],
  ['3 < x', 'x > 3', {}, Y, '', 'an inequality turned round'],
  ['x >= 4', '4 <= x', {}, Y, '', '>= is ≤ turned round'],
  ['x ≥ 4', 'x >= 4', {}, Y, '', 'the symbol ≥'],
  ['4 =< x', 'x >= 4', {}, Y, '', '=< for ≤'],
  ['14 > x > 4', '4 < x < 14', {}, Y, '', 'a chain turned round'],
  ['x < 3', 'x > 3', {}, N, '', 'the other direction'],
  ['x <= 3', 'x < 3', {}, N, '', 'or equal is not the same'],
  ['3 > x', 'x > 3', {}, N, '', 'swapped sides, sign not flipped'],
  /* one number, written many ways */
  ['0.5', '1/2', {}, Y, '', 'a decimal for a fraction'],
  ['2/4', '1/2', {}, Y, 'Simplify: 2/4 = 1/2', 'an unreduced fraction, with the nudge'],
  ['2/4', '1/2', { simplest: false }, Y, '', 'no nudge when simplest form is not asked'],
  ['1 1/2', '3/2', {}, Y, '', 'a mixed number for an improper fraction'],
  ['3/2', '1 1/2', {}, Y, '', 'and back'],
  ['1.50', '1.5', {}, Y, '', 'a trailing zero'],
  ['117', '117.00', {}, Y, '', 'trailing zeros in the key'],
  ['+5', '5', {}, Y, '', 'a leading plus'],
  ['.5', '0.5', {}, Y, '', 'no leading zero'],
  ['−7', '-7', {}, Y, '', 'the unicode minus'],
  ['–7', '-7', {}, Y, '', 'an en dash for a minus'],
  ['1,652.6', '1652.6', {}, Y, '', 'a thousands comma'],
  ['51,000,000', '51000000', {}, Y, '', 'two thousands commas'],
  ['1,65', '165', {}, N, '', 'a comma that is not a thousands comma'],
  ['-(1/64)', '-1/64', {}, Y, '', 'a minus outside the parentheses'],
  ['½', '1/2', {}, Y, '', 'the ½ character'],
  ['2½', '2 1/2', {}, Y, '', '2½'],
  ['0.33', '1/3', {}, N, '', 'a rounded decimal is not the fraction'],
  ['5/2', '2/5', {}, N, '', 'upside down'],
  /* money and percent, when the box carries them */
  ['$74', '74', { money: true }, Y, '', 'a dollar sign in a money box'],
  ['$1,652.60', '1652.6', { money: true }, Y, '', 'dollars, a comma, cents'],
  ['$74', '74', {}, N, '', 'a dollar sign where the answer is not money'],
  ['45%', '45', { percent: true }, Y, '', 'a percent sign in a percent box'],
  ['45 cm²', '45', { unit: 'cm²' }, Y, '', 'the box’s own unit typed after the number'],
  /* times, divided by, powers */
  ['x*2', '2x', {}, Y, '', 'x*2 is 2x'],
  ['2·x', '2x', {}, Y, '', 'a middle dot'],
  ['2 × x', '2x', {}, Y, '', '×'],
  ['x/2', '1/2x', {}, Y, '', 'x/2 is ½x'],
  ['0.5x', '1/2x', {}, Y, '', 'a decimal coefficient'],
  ['6 ÷ 3', '6/3', {}, Y, '', '÷ is a slash'],
  ['x²', 'x^2', {}, Y, '', 'a superscript 2'],
  ['10⁻⁵', '10^-5', {}, Y, '', 'a superscript minus'],
  ['7.7 × 10^8', '7.7 x 10^8', {}, Y, '', 'x as times between numbers'],
  ['7.7x10^8', '7.7 x 10^8', {}, Y, '', 'x as times, no spaces'],
  ['3.7 × 10^5', '37 × 10^4', {}, N, '', 'equal in value, but not the same scientific notation'],
  ['59049', '9^5', {}, N, '', 'a power is not its value'],
  ['(-3)^2', '-3^2', {}, N, '', 'the negative base is not the negative of the power'],
  ['(4/7)^8', '4/7^8', {}, N, '', 'the parentheses on a fraction’s power matter'],
  ['59π', '59pi', {}, Y, '', 'pi typed as letters'],
  ['π × 59', '59π', {}, Y, '', 'the factors of a product in any order'],
  ['21', '7 × 3', {}, N, '', 'the products the question asks for are not worked out'],
  ['3 × 7', '7 × 3', {}, Y, '', 'a product turned round'],
  /* expressions: the terms in any order, never combined */
  ['-12 + 6b', '6b - 12', {}, Y, '', 'the terms of a sum in any order'],
  ['1 - 2x', '-2x + 1', {}, Y, '', 'a minus travels with its term'],
  ['-x + 4', '4 - x', {}, Y, '', '−x is −1x'],
  ['-1x + 4', '4 - x', {}, Y, '', 'and so is −1x'],
  ['3x + 2x', '5x', {}, N, '', 'like terms are not combined for the student'],
  ['5x + 0', '5x', {}, N, '', 'an extra term'],
  ['1 5/6d - 6', '11/6d - 6', {}, Y, '', 'a mixed coefficient'],
  ['6 - 1 5/6d', '1 5/6d - 6', {}, N, '', 'the signs swapped'],
  ['(9k + 7k) + 1', '9k + (7k + 1)', {}, N, '', 'the grouping is kept: the associative property is the question'],
  ['1 + (7k + 9k)', '(9k + 7k) + 1', {}, Y, '', 'order inside and outside a group'],
  ['2(x + 3)', '(3 + x)2', {}, Y, '', 'a factor and its group in any order'],
  ['2x + 6', '2(x + 3)', {}, N, '', 'distributing is the question, not the normaliser’s'],
  ['21^2(3.6) + 65', '21^2(3.60) + 65', {}, Y, '', 'a trailing zero inside an expression'],
  ['65 + 3.60 × 21^2', '21^2(3.60) + 65', {}, Y, '', 'an expression written the other way round'],
  ['1/(16^5)', '1/16^5', {}, Y, '', 'parentheses around a power'],
  ['16^-5', '1/16^5', {}, N, '', 'a negative exponent is not the positive one the question asks for'],
  /* the variable's own box */
  ['n = 9', '9', { v: 'n' }, Y, '', 'the box already says n ='],
  ['9 = n', '9', { v: 'n' }, Y, '', 'and turned round'],
  ['m = 9', '9', { v: 'n' }, N, '', 'another letter'],
  /* ordered pairs and lists */
  ['(2, 3)', '(2,3)', { expect: 'pair' }, Y, '', 'an ordered pair'],
  ['(3, 2)', '(2, 3)', { expect: 'pair' }, N, '', 'an ordered pair is ordered'],
  ['98, 24', '98 and 24', { expect: 'list' }, Y, '', 'a comma for "and"'],
  ['98 and 24', '98 and 24', {}, Y, '', 'the key itself'],
  /* rounding to a stated precision */
  ['9.2', '9.2', { precision: 0.1 }, Y, '', 'to the nearest tenth'],
  ['9.21', '9.2', { precision: 0.1 }, Y, 'Round to the nearest tenth: 9.2', 'more places than asked: right, with the nudge'],
  ['9.3', '9.2', { precision: 0.1 }, N, '', 'rounded the wrong way'],
  ['9', '9.2', { precision: 0.1 }, N, '', 'rounded too far'],
  ['3.14', '3.14', { precision: 0.01 }, Y, '', 'to the nearest hundredth'],
  ['3.1416', '3.14', { precision: 0.01 }, Y, 'Round to the nearest hundredth', 'unrounded'],
  /* nothing the parser cannot read is ever "the same" */
  ['bus 85.33', 'bus 85.33', {}, N, '', 'words are not read (the unit’s own reader marks them)'],
  ['', '5', {}, N, '', 'blank'],
  ['((3', '3', {}, N, '', 'unbalanced parentheses'],
  ['3 4', '34', {}, N, '', 'two numbers side by side'],
  ['x2', '2x', {}, N, '', 'a number after a letter is not read as a product'],
  ['5', '5', { equiv: false }, N, '', 'a unit can switch it off for a question (it then judges alone)'],
  /* square roots and degrees (7 Nov 2026, the Cadence lesson banks: "√85", "49°") */
  ['√85', '√85', {}, Y, '', 'a square root'],
  ['sqrt(85)', '√85', {}, Y, '', 'sqrt( ) for √'],
  ['√(85)', '√85', {}, Y, '', 'the radicand in parentheses'],
  ['3√2', '3√2', {}, Y, '', 'a coefficient and a root'],
  ['85', '√85', {}, N, '', 'the radicand is not its root'],
  ['√18', '3√2', {}, N, '', 'simplifying a root is the question'],
  ['42°', '42', {}, Y, '', 'the degree sign of an angle box'],
  ['42 °', '42', {}, Y, '', 'a space before the degree sign'],
];
let fails = [], n = 0;
for (const [typed, key, form, want, nudge, why] of cases) {
  n++;
  let r; try { r = A.equiv(typed, key, form); } catch (e) { r = { ok: 'THREW ' + e.message }; }
  if (r.ok !== want) fails.push(`${JSON.stringify(typed)} vs ${JSON.stringify(key)} ${JSON.stringify(form)}: ${r.ok} — expected ${want} (${why})`);
  else if (want && nudge && !(r.nudge || '').startsWith(nudge)) fails.push(`${JSON.stringify(typed)} vs ${JSON.stringify(key)}: nudge "${r.nudge}" — expected "${nudge}…" (${why})`);
  else if (want && !nudge && r.nudge) fails.push(`${JSON.stringify(typed)} vs ${JSON.stringify(key)}: an unexpected nudge "${r.nudge}" (${why})`);
}
/* the form a box expects, read from its key and the box (labels only where they cannot be wrong) */
const forms = [
  ['7.7 x 10^8', {}, 'sci', 'in scientific notation'], ['k > 0.5', {}, 'ineq', 'as an inequality'], ['9^5', {}, 'power', 'as a power'],
  ['49/81', {}, 'fraction', ''], ['6 3/4', {}, 'mixed', ''], ['24', {}, 'number', ''], ['6b - 12', {}, 'expr', ''],
  ['9.2', { placeholder: 'nearest tenth' }, 'number', ''], ['9.2', { declared: { label: 'to the nearest tenth', precision: 0.1 } }, 'number', 'to the nearest tenth'],
  ['5.2 x 10^3', { placeholder: 'like 7.2 x 10^6' }, 'sci', ''], ['13', { pre: '<span class="m"><i>k</i> =</span>' }, 'number', ''],
];
for (const [key, info, shape, label] of forms) {
  n++; const f = A.form(key, info);
  if (f.expect !== shape || (f.label || '') !== label) fails.push(`form of ${JSON.stringify(key)} ${JSON.stringify(info)}: ${f.expect} / "${f.label}" — expected ${shape} / "${label}"`);
}
{ n++; const f = A.form('13', { pre: '<span class="m"><i>k</i> =</span>' }); if (f.v !== 'k') fails.push('the box\'s variable was not read from its pre: ' + f.v); }
{ n++; const f = A.form('21', { pre: '$' }); if (!f.money) fails.push('a $ box is not a money box'); }
const neq = cases.filter(c => !c[3]).length;
if (fails.length) { console.log('NORMALISER CHECK FAILED (' + fails.length + ' of ' + n + '):\n' + fails.join('\n')); process.exit(1); }
console.log('normaliser: ' + n + ' cases (' + neq + ' that must not be equivalent) — all as expected');
