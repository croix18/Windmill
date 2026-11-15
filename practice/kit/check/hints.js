/* Practice-test kit — the kit's own arithmetic hints never state the answer.   node <kit>/check/hints.js
   A hint is one smaller step after a wrong try, so it must not end the step for the student. 14.4 ÷ 1.2 began "Start with
   1.2 × 10 = 12" — and 12 is the answer (found on A7 Unit 6, 25 Oct 2026; core.js hintDiv now asks the plain question
   instead). Runs over whole numbers and one- and two-place decimals: every division hint, and every "× 0.5" multiplication
   hint (which halves), is read for "= <the answer>". And since 15 Nov 2026 no hint of any kind writes × (a dot instead).
   run.py runs it before a unit's own checks. */
const K = require('../core.js');
const Q = K.Q, S = K.decStr;
const mul = (a, b) => Q(a.n * b.n, a.d * b.d);
const seen = new Map();
for (let i = 1; i <= 240; i++) seen.set(S(Q(i)), Q(i));
for (let i = 1; i <= 400; i++) seen.set(S(Q(i, 10)), Q(i, 10));
for (let i = 1; i <= 300; i += 7) seen.set(S(Q(i, 100)), Q(i, 100));
const nums = [...seen.values()];
const says = (h, q) => new RegExp('= ' + S(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![\\d.])').test(h);
let n = 0; const fails = [];
for (const b of nums) for (const q of nums) {          // a = b × q: every division whose answer is one of these numbers
  if (q.n > 400n * q.d) continue;
  const a = mul(b, q), h = K.hint.div(a, b); n++;
  if (says(h, q)) fails.push(S(a) + ' ÷ ' + S(b) + ': "' + h + '"');
  if (fails.length > 20) break;
}
const half = Q(1, 2);
for (const a of nums) { const h = K.hint.mul(a, half), p = mul(a, half); n++; if (says(h, p)) fails.push(S(a) + ' × 0.5: "' + h + '"'); }
if (fails.length) { console.log('HINT CHECK FAILED — a hint states its own answer:\n' + fails.slice(0, 20).join('\n')); process.exit(1); }
/* never × (15 Nov 2026; Croix's classroom rule — x is always a variable, so multiplication is a dot or parentheses): every hint the
   kit writes, of every kind, over the same numbers and their negatives, is read for "×" (the division hint wrote "Think: 3 × ? = 12") */
const TIMES = /[×✕✖]/; let m = 0; const tfails = [];
K.slot('kit-check', 1, 'times');                       /* a unit not on core.js LEGACY_TIMES: the dot */
const signed = nums.filter((x, i) => i % 3 === 0).concat(nums.filter((x, i) => i % 11 === 0).map(x => Q(-x.n, x.d)));
for (const a of signed) for (const b of signed) {
  if (tfails.length > 20) break;
  const hs = [['×', () => K.hint.mul(a, b)], ['+', () => K.hint.add(a, b)], ['−', () => K.hint.sub(a, b)], ['÷', () => b.n ? K.hint.div(a, b) : '']];
  for (const [op, f] of hs) { let h = ''; try { h = String(f()); } catch (e) { continue; } m++; if (TIMES.test(h)) tfails.push(S(a) + ' ' + op + ' ' + S(b) + ': "' + h + '"'); }
}
for (const a of signed) { const h = K.hint.sq(a); m++; if (TIMES.test(h)) tfails.push(S(a) + '²: "' + h + '"'); }
/* a unit built before the rule (core.js LEGACY_TIMES) keeps its × hints word for word: its readers and translations hold them */
K.slot(K.LEGACY_TIMES[0], 1, 'times');
[[K.hint.div(Q(12), Q(3)), 'Think: 3 × ? = 12.'], [K.hint.mul(Q(26), Q(14, 10)), 'Break it up: 26 × 1.4 = 26 × 1 + 26 × 0.4 = 26 + 10.4. Now add.'], [K.hint.sq(Q(7)), '7² means 7 × 7 (not 7 × 2). 7 × 7 = 7 × 6 + 7 = 42 + 7.']]
  .forEach(([got, want]) => { if (got !== want) tfails.push('a unit on LEGACY_TIMES: "' + got + '", not "' + want + '" as before'); });
K.slot('kit-check', 1, 'times');
[[K.hint.div(Q(12), Q(3)), 'Think: 3 · ? = 12.'], [K.hint.mul(Q(26), Q(14, 10)), 'Break it up: 26 · 1.4 = 26 · 1 + 26 · 0.4 = 26 + 10.4. Now add.']]
  .forEach(([got, want]) => { if (got !== want) tfails.push('a unit not on LEGACY_TIMES: "' + got + '", not "' + want + '"'); });
if (tfails.length) { console.log('HINT CHECK FAILED — a hint writes × for multiplication (write a dot or parentheses):\n' + tfails.slice(0, 20).join('\n')); process.exit(1); }
console.log('hints: ' + n + ' division and halving hints read; none states its answer; ' + m + ' hints of every kind read, none writes ×');
