/* Practice-test kit — the kit's own arithmetic hints never state the answer.   node <kit>/check/hints.js
   A hint is one smaller step after a wrong try, so it must not end the step for the student. 14.4 ÷ 1.2 began "Start with
   1.2 × 10 = 12" — and 12 is the answer (found on A7 Unit 6, 25 Oct 2026; core.js hintDiv now asks the plain question
   instead). Runs over whole numbers and one- and two-place decimals: every division hint, and every "× 0.5" multiplication
   hint (which halves), is read for "= <the answer>". run.py runs it before a unit's own checks. */
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
console.log('hints: ' + n + ' division and halving hints read; none states its answer');
