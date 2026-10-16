/* Practice-test kit: core. Shared by every unit's engine (in the page and under Node).
   - slot streams: each question slot draws from its own random stream, seeded by (unit, set, slot), so a change to one
     question never moves the numbers of another, and "set 4821" stays the same set as long as the unit's contentVersion
     does (the lock check holds that);
   - hints: one smaller step for a piece of arithmetic, used by walkthrough number steps after a wrong try (every "=" in
     them is re-checked by the claims evaluator). */
(function (root) {
'use strict';

function fnv1a(str) { let h = 0x811c9dc5; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h >>> 0; }
/* the same generator both units used before the kit (integer arithmetic only, so every browser draws the same numbers) */
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function tools(r) {
  const ri = (lo, hi) => lo + Math.floor(r() * (hi - lo + 1));
  const pick = a => a[Math.floor(r() * a.length)];
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const until = (f, ok) => { for (let k = 0; k < 4000; k++) { const x = f(); if (ok(x)) return x; } throw new Error('generator could not find numbers'); };
  return { r, ri, pick, shuffle, until };
}
function slot(unitId, seed, slotName) { return tools(rng(fnv1a(unitId + '|' + seed + '|' + slotName))); }
/* draw one slot's question: build until ok (test-form avoidance, the clean rule); the stream continues across retries,
   so the result depends only on (unit, seed, slot) and the code of this slot */
function draw(unitId, seed, slotName, build, ok, tries) {
  const T = slot(unitId, seed, slotName);
  for (let k = 0; k < (tries || 600); k++) { const it = build(T); if (!ok || ok(it)) return it; }
  throw new Error('slot ' + slotName + ': no question passed its checks');
}

/* ---- exact arithmetic for hints (rationals {n, d} with BigInt, the shape both engines use) */
function gcd(a, b) { a = a < 0n ? -a : a; b = b < 0n ? -b : b; while (b) { const t = a % b; a = b; b = t; } return a; }
function Q(n, d) { n = BigInt(n); d = d === undefined ? 1n : BigInt(d); if (d < 0n) { n = -n; d = -d; } const g = gcd(n, d) || 1n; return { n: n / g, d: d / g }; }
const qmul = (a, b) => Q(a.n * b.n, a.d * b.d), qadd = (a, b) => Q(a.n * b.d + b.n * a.d, a.d * b.d), qsub = (a, b) => Q(a.n * b.d - b.n * a.d, a.d * b.d);
const qdiv = (a, b) => Q(a.n * b.d, a.d * b.n);
function places(q) { let d = q.d, t = 0, f = 0; while (d % 2n === 0n) { d /= 2n; t++; } while (d % 5n === 0n) { d /= 5n; f++; } return d === 1n ? Math.max(t, f) : -1; }
function decStr(q) {
  let neg = q.n < 0n, n = neg ? -q.n : q.n, d = q.d, two = 0, five = 0;
  while (d % 2n === 0n) { d /= 2n; two++; } while (d % 5n === 0n) { d /= 5n; five++; }
  if (d !== 1n) return (neg ? '−' : '') + n + '/' + q.d;
  const k = Math.max(two, five); n *= 2n ** BigInt(k - two) * 5n ** BigInt(k - five);
  let s = n.toString(); if (k > 0) { s = s.padStart(k + 1, '0'); s = s.slice(0, s.length - k) + '.' + s.slice(s.length - k); s = s.replace(/0+$/, '').replace(/\.$/, ''); }
  s = s.replace(/^(\d+)/, m => m.replace(/\B(?=(\d{3})+(?!\d))/g, ','));
  return (neg ? '−' : '') + s;
}
const S = decStr;
const isInt = q => q.d === 1n;
const big = q => q.n >= 0n ? q : Q(-q.n, q.d);
/* split a number by place value: 347 → [300, 40, 7]; 3.14 → [3, 0.14]; 49 → [40, 9] */
function split(q) {
  if (!isInt(q)) { const w = Q(q.n / q.d); return w.n > 0n ? [w, qsub(q, w)] : [q]; }
  const s = q.n.toString(); if (s.length === 1) return [q];
  const head = Q(BigInt(s[0]) * 10n ** BigInt(s.length - 1)), rest = Q(q.n - head.n);
  return rest.n === 0n ? [q] : [head, rest];
}
/* one smaller step for a × b: break one factor by place value, keeping the order the question used (never the final answer) */
function hintMul(a, b) {
  const H = Q(1, 2);
  if (a.n * H.d === H.n * a.d) return 'Times 0.5 is the same as half. ' + hintDiv(b, Q(2));
  if (b.n * H.d === H.n * b.d) return 'Times 0.5 is the same as half. ' + hintDiv(a, Q(2));
  if (isInt(a) && isInt(b) && big(a).n <= 9n && big(b).n <= 9n) {
    const c = b.n <= a.n ? b : a, o = c === b ? a : b;
    if (c.n <= 5n) return S(a) + ' × ' + S(b) + ' = ' + Array(Number(c.n)).fill(S(o)).join(' + ') + '.';
    return S(a) + ' × ' + S(b) + ' = ' + S(o) + ' × ' + S(Q(c.n - 1n)) + ' + ' + S(o) + ' = ' + S(qmul(o, Q(c.n - 1n))) + ' + ' + S(o) + '.';
  }
  /* a round number: 20 × 6 → 2 × 6, then the zeros */
  for (const [r, o] of [[a, b], [b, a]]) {
    if (isInt(r) && isInt(o) && r.n >= 10n) { let k = r.n, z = 0; while (k % 10n === 0n) { k /= 10n; z++; }
      if (z > 0 && k < 10n) return S(a) + ' × ' + S(b) + ': work out ' + S(Q(k)) + ' × ' + S(o) + ', then put ' + (z === 1 ? 'one 0' : z + ' zeros') + ' on the end.'; }
  }
  /* split the decimal factor if there is one, else the bigger one */
  let which = !isInt(a) && isInt(b) ? 0 : !isInt(b) && isInt(a) ? 1 : (big(a).n * big(b).d >= big(b).n * big(a).d ? 0 : 1);
  let parts = split(which === 0 ? a : b);
  if (parts.length < 2) { which = 1 - which; parts = split(which === 0 ? a : b); }
  if (parts.length < 2) return 'Multiply ' + S(a) + ' by ' + S(b) + ' one digit at a time, then place the decimal point.';
  const other = which === 0 ? b : a, term = p => which === 0 ? S(p) + ' × ' + S(other) : S(other) + ' × ' + S(p);
  return 'Break it up: ' + S(a) + ' × ' + S(b) + ' = ' + parts.map(term).join(' + ') + ' = ' + parts.map(p => S(qmul(p, other))).join(' + ') + '. Now add.';
}
/* a ÷ b: a nearby multiple of b as a stepping stone */
function hintDiv(a, b) {
  const qq = qdiv(a, b);
  if (b.d === 1n && b.n === 2n) {
    let parts = split(a);
    if (parts.length < 2) { if (isInt(a) && a.n % 2n === 1n && a.n > 1n) parts = [Q(a.n - 1n), Q(1)]; else return 'Half of ' + S(a) + ': what number added to itself makes ' + S(a) + '?'; }
    return 'Half of ' + S(a) + ': ' + parts.map(p => 'half of ' + S(p) + ' is ' + S(qdiv(p, Q(2)))).join(', and ') + '. Now add.';
  }
  if (isInt(qq) && qq.n >= 10n) { const ten = Q((qq.n / 10n) * 10n); if (ten.n !== qq.n) return 'Think: ' + S(b) + ' × ? = ' + S(a) + '. Start with ' + S(b) + ' × ' + S(ten) + ' = ' + S(qmul(b, ten)) + '; ' + S(a) + ' − ' + S(qmul(b, ten)) + ' = ' + S(qsub(a, qmul(b, ten))) + ' is left.'; }
  if (places(b) > 0) { const k = 10n ** BigInt(places(b)); return 'Move both decimal points ' + places(b) + ' place' + (k === 10n ? '' : 's') + ': ' + S(a) + ' ÷ ' + S(b) + ' is the same as ' + S(qmul(a, Q(k))) + ' ÷ ' + S(qmul(b, Q(k))) + '.'; }
  return 'Think: ' + S(b) + ' × ? = ' + S(a) + '.';
}
function hintAdd(a, b) {
  if (isInt(a) && isInt(b)) { const p = split(b); if (p.length < 2) return 'Count on from ' + S(a) + ' by ' + S(b) + '.'; return S(a) + ' + ' + S(b) + ' = ' + S(a) + ' + ' + p.map(S).join(' + ') + ' = ' + S(qadd(a, p[0])) + ' + ' + S(p[1]) + '.'; }
  return 'Line up the decimal points, then add.';
}
function hintSub(a, b) {
  if (isInt(a) && isInt(b)) { const p = split(b); if (p.length < 2) return 'Count back from ' + S(a) + ' by ' + S(b) + '.'; return S(a) + ' − ' + S(b) + ' = ' + S(a) + ' − ' + p.map(S).join(' − ') + ' = ' + S(qsub(a, p[0])) + ' − ' + S(p[1]) + '.'; }
  return 'Line up the decimal points, then subtract.';
}
function hintSq(a) { const two = a.n === 2n * a.d; return S(a) + '² means ' + S(a) + ' × ' + S(a) + (two ? '' : ' (not ' + S(a) + ' × 2)') + '. ' + hintMul(a, a); }

const api = { fnv1a, rng, tools, slot, draw, hint: { mul: hintMul, div: hintDiv, add: hintAdd, sub: hintSub, sq: hintSq }, Q, decStr };
if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Kit = api;
})(this);
