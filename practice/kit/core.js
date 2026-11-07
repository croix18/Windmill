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
/* a ÷ b: a nearby multiple of b as a stepping stone — never one that states the quotient. 14.4 ÷ 1.2 began "Start with
   1.2 × 10 = 12", and 12 is the answer; when the hint would say "= <the answer>" it asks the plain question instead
   (A7 Unit 6 guarded this in its own coach; in the kit since 25 Oct 2026, check/hints.js) */
function hintDiv(a, b) {
  const h = hintDivStep(a, b), q = S(qdiv(a, b)).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp('= ' + q + '(?![\\d.])').test(h) ? 'Think: ' + S(b) + ' × ? = ' + S(a) + '.' : h;
}
function hintDivStep(a, b) {
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

/* ---- equivalent forms of an answer (7 Nov 2026, the practice-test deepening, item 3; the survey's "x=3 was not accepted unless
   written as 3=x"). A small safe parser — no eval — reads a typed answer and the unit's own key into one canonical form and
   compares them. It is STRUCTURAL: it never does the arithmetic a question asks for. 3 = x is x = 3; 0.5, 1/2 and 2/4 are one
   number; 1 1/2 is 3/2; x*2, 2x and 2·x are one term; the terms of a sum and the factors of a product may come in any order;
   3 < x is x > 3; (2, 3) is an ordered pair. But 3x + 2x is not 5x, 7 × 3 is not 21, 9^5 is not 59049, (a + b) + c keeps its
   grouping, and 37 × 10^4 is not 3.7 × 10^5 — those are what a question asks, and the unit's coach marks them. The page uses
   it only to turn a unit's "not yet" into "right" when the typed answer IS the key written another way (ui.js judgeAns). */
const SUPS = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁻': '-', '⁺': '+' };
const VULGAR = { '½': '1/2', '⅓': '1/3', '⅔': '2/3', '¼': '1/4', '¾': '3/4', '⅕': '1/5', '⅖': '2/5', '⅗': '3/5', '⅘': '4/5', '⅙': '1/6', '⅚': '5/6', '⅛': '1/8', '⅜': '3/8', '⅝': '5/8', '⅞': '7/8' };
function ansPrep(text) {
  let s = String(text == null ? '' : text).replace(/[    ]/g, ' ');
  s = s.replace(/[−‐‑‒–—﹣－]/g, '-');            /* unicode minus and dashes */
  s = s.replace(/[×✕✖⋅·∙•]/g, '*').replace(/[÷⁄∕]/g, '/');                              /* times, divided by, the fraction slash */
  s = s.replace(/[≤⩽]/g, '<=').replace(/[≥⩾]/g, '>=').replace(/=</g, '<=').replace(/=>/g, '>=').replace(/≠/g, '!=');
  s = s.replace(/(\d)\s*([½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞])/g, '$1 $2').replace(/[½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]/g, c => VULGAR[c]);
  s = s.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺]+/g, m => '^(' + m.split('').map(c => SUPS[c]).join('') + ')');   /* x² is x^2 */
  s = s.replace(/(^|[^A-Za-z])pi(?![A-Za-z])/gi, '$1π');
  return s.trim();
}
/* tokens: n (a number, its text kept), mix (a mixed number), v (a letter), pi, op (+ - * / ^), ( ), rel (= < > <= >= !=), sep */
function ansTokens(s, o) {
  const out = []; let i = 0;
  const isD = c => c >= '0' && c <= '9';
  while (i < s.length) {
    const c = s[i];
    if (c === ' ') { i++; continue; }
    if (isD(c) || (c === '.' && isD(s[i + 1] || ''))) {
      let j = i, t = '', grp = 0, groups = 0;
      for (;;) {                                     /* digits, a thousands comma (1,652.6 — when the answer is not a list), a point */
        grp = 0; while (j < s.length && isD(s[j])) { t += s[j++]; grp++; }
        if (!o.list && s[j] === ',' && /^\d{3}(?![\d])/.test(s.slice(j + 1)) && (groups ? grp === 3 : grp >= 1 && grp <= 3)) { j++; groups++; continue; }
        break;
      }
      if (s[j] === '.') { t += '.'; j++; while (j < s.length && isD(s[j])) t += s[j++]; }
      /* a mixed number: a whole number, a space, a fraction of whole numbers — 2 4/9 */
      const mm = /^\s+(\d+)\s*\/\s*(\d+)(?![\d.])/.exec(s.slice(j));
      if (mm && /^\d+$/.test(t) && !(out.length && out[out.length - 1].t === 'op' && out[out.length - 1].s === '/')) { out.push({ t: 'mix', w: t, n: mm[1], d: mm[2] }); i = j + mm[0].length; continue; }
      out.push({ t: 'n', s: t }); i = j; continue;
    }
    if (/[A-Za-z]/.test(c)) {
      let j = i; while (j < s.length && /[A-Za-z]/.test(s[j])) j++;
      const w = s.slice(i, j), lw = w.toLowerCase();
      if (lw === 'and') { out.push({ t: 'sep' }); i = j; continue; }
      if (w.length > 1) return null;                                 /* a word: not an answer this reads */
      /* x as "times" between two numbers: 7.7 x 10^8 */
      const prev = out[out.length - 1];
      if ((w === 'x' || w === 'X') && prev && (prev.t === 'n' || prev.t === ')') && /^\s*[\d(]/.test(s.slice(j)) && (/\s/.test(s[i - 1] || '') || /^\s/.test(s.slice(j)) || /^\d/.test(s.slice(j)))) { out.push({ t: 'op', s: '*' }); i = j; continue; }
      out.push({ t: 'v', s: w }); i = j; continue;
    }
    if (c === 'π') { out.push({ t: 'pi' }); i++; continue; }
    if (c === '<' || c === '>' || c === '=' || c === '!') {
      if ((c === '<' || c === '>' || c === '!') && s[i + 1] === '=') { out.push({ t: 'rel', s: c + '=' }); i += 2; continue; }
      if (c === '!') return null;
      out.push({ t: 'rel', s: c }); i++; continue;
    }
    if ('+-*/^'.indexOf(c) >= 0) { out.push({ t: 'op', s: c }); i++; continue; }
    if (c === '(' || c === ')' || c === '[' || c === ']') { out.push({ t: c === '[' ? '(' : c === ']' ? ')' : c }); i++; continue; }
    if (c === ',' || c === ';' || c === '&') { out.push({ t: 'sep' }); i++; continue; }
    if (c === '$' && o.money) { i++; continue; }
    if (c === '%' && o.percent) { i++; continue; }
    return null;
  }
  return out;
}
/* the parser: list → relation chain → sum → product (×, ÷, side by side, left to right) → unary minus → power → atom */
function ansParse(text, o) {
  o = o || {};
  let s = ansPrep(text);
  if (o.unit) { const u = String(o.unit).replace(/<[^>]*>/g, '').trim(); if (u) { const ue = ansPrep(u).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); s = s.replace(new RegExp('\\s*' + ue + '\\.?$', 'i'), '').trim(); } }
  if (!s) return null;
  const T = ansTokens(s, o); if (!T || !T.length) return null;
  let k = 0;
  const peek = () => T[k], take = () => T[k++];
  const isOp = (t, x) => t && t.t === 'op' && t.s === x;
  function atom() {
    const t = take(); if (!t) throw 0;
    if (t.t === 'n') return { k: 'num', q: numQ(t.s), dec: t.s.indexOf('.') >= 0, text: t.s };
    if (t.t === 'mix') { const d = BigInt(t.d); if (d === 0n) throw 0; return { k: 'num', q: Q(BigInt(t.w) * d + BigInt(t.n), d), mixed: true, text: t.w + ' ' + t.n + '/' + t.d, unred: gcd(BigInt(t.n), d) > 1n ? [t.n + '/' + t.d, Q(BigInt(t.n), d)] : null }; }
    if (t.t === 'v') return { k: 'var', s: t.s };
    if (t.t === 'pi') return { k: 'var', s: 'π' };
    if (t.t === '(') { let e = sum(); if (peek() && peek().t === 'sep') {   /* an ordered pair, (2, 3) */ const items = [e]; while (peek() && peek().t === 'sep') { take(); items.push(sum()); } e = { k: 'list', items }; }
      if (!peek() || peek().t !== ')') throw 0; take(); return { k: 'grp', x: e }; }
    throw 0;
  }
  function power() {
    const b = atom();
    if (isOp(peek(), '^')) { take(); let neg = false; if (isOp(peek(), '-')) { take(); neg = true; } else if (isOp(peek(), '+')) take(); let e = power(); if (neg) e = { k: 'neg', x: e }; return { k: 'pow', b, e }; }
    return b;
  }
  function unary() { if (isOp(peek(), '-')) { take(); return { k: 'neg', x: unary() }; } if (isOp(peek(), '+')) { take(); return unary(); } return power(); }
  const starts = t => t && (t.t === 'n' || t.t === 'mix' || t.t === 'v' || t.t === 'pi' || t.t === '(');
  function product() {
    let a = unary();
    for (;;) {
      const t = peek();
      if (isOp(t, '*')) { take(); a = { k: 'mul', a, b: unary() }; continue; }
      if (isOp(t, '/')) { take(); a = { k: 'div', a, b: unary() }; continue; }
      /* side by side: 2x, 3(x + 1), 59π, x(2) — but never a number straight after a letter or a number (x2, 3 4) */
      if (starts(t) && !((t.t === 'n' || t.t === 'mix') && (a.k === 'var' || a.k === 'num' || a.k === 'pow' || a.k === 'mul' || a.k === 'div'))) { a = { k: 'mul', a, b: power() }; continue; }
      return a;
    }
  }
  function sum() {
    let a = product();
    for (;;) { const t = peek(); if (isOp(t, '+')) { take(); a = { k: 'add', a, b: product() }; continue; } if (isOp(t, '-')) { take(); a = { k: 'add', a, b: { k: 'neg', x: product() } }; continue; } return a; }
  }
  function rel() {
    const sides = [sum()], ops = [];
    while (peek() && peek().t === 'rel') { ops.push(take().s); sides.push(sum()); }
    return ops.length ? { k: 'rel', sides, ops } : sides[0];
  }
  function list() {
    const items = [rel()]; while (peek() && peek().t === 'sep') { take(); items.push(rel()); }
    return items.length > 1 ? { k: 'list', items } : items[0];
  }
  try {
    let tree = list(); if (k !== T.length) return null;
    if (tree.k === 'grp' && tree.x.k === 'list') tree = tree.x;          /* an ordered pair written (2, 3) */
    return tree;
  } catch (e) { return null; }
}
function numQ(t) { const m = /^(\d*)(?:\.(\d*))?$/.exec(t); const w = m[1] || '0', f = m[2] || ''; return Q(BigInt(w + f), 10n ** BigInt(f.length)); }
/* canonical form: a string the same for two equivalent answers, and the notes for a nudge (an unreduced fraction, decimals) */
function ansCanon(tree) {
  const notes = { unred: [], dec: false, frac: false, mixed: false };
  const qs = q => q.d === 1n ? q.n.toString() : q.n + '/' + q.d;
  const lit = q => ({ c: 'n', q, s: qs(q) });
  function C(x) {
    switch (x.k) {
      case 'num': if (x.dec) notes.dec = true; if (x.mixed) notes.mixed = true; if (x.unred) notes.unred.push(x.unred); return lit(x.q);
      case 'var': return { c: 'v', s: x.s };
      case 'grp': { const y = C(x.x); return y.c === 'sum' ? { c: 'g', y, s: 'G(' + y.s + ')' } : y; }   /* a group keeps its grouping only around a sum */
      case 'neg': return negC(C(x.x));
      case 'pow': { const b = C(x.b), e = C(x.e); return { c: 'p', s: 'P(' + b.s + '^' + e.s + ')' }; }
      case 'mul': return mulC([C(x.a), C(x.b)]);
      case 'div': {
        const a = C(x.a), b = C(x.b);
        if (a.c === 'n' && b.c === 'n' && b.q.n !== 0n) {          /* a fraction written with a slash: one number */
          const ia = x.a.k === 'num' && !x.a.dec && !x.a.mixed, ib = x.b.k === 'num' && !x.b.dec && !x.b.mixed;
          if (ia && ib) { notes.frac = true; const g = gcd(x.a.q.n, x.b.q.n); if (g > 1n) notes.unred.push([x.a.text + '/' + x.b.text, qdiv(a.q, b.q)]); }
          return lit(qdiv(a.q, b.q));
        }
        if (b.c === 'n' && b.q.n !== 0n) return mulC([a, lit(qdiv(Q(1), b.q))]);   /* x/2 is ½x */
        return { c: 'd', s: 'D(' + a.s + '|' + b.s + ')' };
      }
      case 'add': { const ts = []; const flat = y => { if (y.k === 'add') { flat(y.a); flat(y.b); } else ts.push(C(y)); }; flat(x);
        const parts = []; ts.forEach(t => { if (t.c === 'sum') parts.push.apply(parts, t.ts); else parts.push(t); });
        parts.sort((p, q) => p.s < q.s ? -1 : p.s > q.s ? 1 : 0);
        return { c: 'sum', ts: parts, s: 'S(' + parts.map(p => p.s).join('+') + ')' }; }
      case 'rel': {
        let sides = x.sides.map(C), ops = x.ops.slice();
        if (ops.every(o => o === '>' || o === '>=')) { sides = sides.reverse(); ops = ops.reverse().map(o => o === '>' ? '<' : '<='); }   /* 3 < x is x > 3 */
        if (ops.some(o => o === '>' || o === '>=') && ops.some(o => o === '<' || o === '<=')) return { c: 'rel', s: 'R?' + Math.random() };   /* a mixed chain: never equal */
        if (ops.every(o => o === '=' || o === '!=') && ops.length === 1) { const a = sides[0].s, b = sides[1].s; return { c: 'rel', s: 'R(' + [a, b].sort().join(ops[0]) + ')', sides }; }   /* 3 = x is x = 3 */
        let f = sides.map(y => y.s), str = 'R(' + f.map((y, i) => (i ? ops[i - 1] : '') + y).join('') + ')';
        if (ops.every(o => o === '=')) { const r = 'R(' + f.slice().reverse().join('=') + ')'; if (r < str) str = r; }
        return { c: 'rel', s: str, sides };
      }
      case 'list': { const it = x.items.map(C); return { c: 'list', its: it, s: 'L(' + it.map(y => y.s).join(';') + ')' }; }
    }
    throw new Error('canon');
  }
  function negC(y) {
    if (y.c === 'n') return lit(Q(-y.q.n, y.q.d));
    if (y.c === 'sum') return mulC([lit(Q(-1)), { c: 'g', y, s: 'G(' + y.s + ')' }]);
    return mulC([lit(Q(-1)), y]);
  }
  /* a product: its factors in any order, one sign for the whole term — (−2)·x, −(2x), 2·(−x) and −2x are one term, and −x is
     −1·x. The numbers in it are kept as they are (7 × 3 stays 7 × 3), and so is a 1 the student wrote (1x is not x). */
  function mulC(list) {
    let fs = []; list.forEach(f => { if (f.c === 'm') fs.push.apply(fs, f.fs); else fs.push(f); });
    let neg = false;
    fs = fs.filter(f => { if (f.c === 'n' && f.q.n < 0n) { neg = !neg; return !(f.q.n === -1n && f.q.d === 1n); } return true; })
      .map(f => f.c === 'n' && f.q.n < 0n ? lit(Q(-f.q.n, f.q.d)) : f);
    fs.sort((p, q) => { const a = (p.c === 'n' ? '0' : '1') + p.s, b = (q.c === 'n' ? '0' : '1') + q.s; return a < b ? -1 : a > b ? 1 : 0; });
    if (neg) { const i = fs.findIndex(f => f.c === 'n'); if (i >= 0) fs[i] = lit(Q(-fs[i].q.n, fs[i].q.d)); else fs.unshift(lit(Q(-1))); }
    if (!fs.length) return lit(Q(neg ? -1 : 1));
    if (fs.length === 1) return fs[0];
    return { c: 'm', fs, s: 'M(' + fs.map(f => f.s).join('*') + ')' };
  }
  const r = C(tree);
  return { s: r.s, node: r, notes };
}
/* what form an answer has, read from the key: list, ineq, eq, sci, power, fraction, mixed, number, expr */
function ansShape(tree) {
  if (!tree) return null;
  let t = tree; while (t.k === 'grp') t = t.x;
  if (t.k === 'list') return 'list';
  if (t.k === 'rel') return t.ops.some(o => o !== '=') ? 'ineq' : 'eq';
  const isNum = y => y.k === 'num' || (y.k === 'neg' && isNum(y.x)) || (y.k === 'grp' && isNum(y.x));
  if (t.k === 'mul' && isNum(t.a) && t.b.k === 'pow' && t.b.b.k === 'num' && t.b.b.q.n === 10n && t.b.b.q.d === 1n) return 'sci';
  if (t.k === 'pow' || (t.k === 'neg' && t.x.k === 'pow')) return 'power';
  if (t.k === 'div' && t.a.k === 'num' && t.b.k === 'num' && !t.a.dec && !t.b.dec) return 'fraction';
  if (t.k === 'neg' && t.x.k === 'div' && t.x.a.k === 'num' && t.x.b.k === 'num') return 'fraction';
  if (t.k === 'num') return t.mixed ? 'mixed' : 'number';
  if (t.k === 'neg' && t.x.k === 'num') return t.x.mixed ? 'mixed' : 'number';
  return 'expr';
}
const PREC = { 'whole number': 1, 'one': 1, 'tenth': 0.1, 'hundredth': 0.01, 'thousandth': 0.001 };
/* the form a box expects: what the unit declares (view.form), else what the key and the box say (its pre, unit, placeholder) */
function ansForm(key, info) {
  info = info || {};
  const d = info.declared || {}, ph = String(info.placeholder || ''), pre = String(info.pre || '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim(), unit = String(info.unit || '').replace(/<[^>]*>/g, '').trim();
  const f = Object.assign({}, d);
  f.declaredFraction = d.expect === 'fraction';
  const pm = /nearest (whole number|one|tenth|hundredth|thousandth)/i.exec((d.label || '') + ' ' + ph);
  if (f.precision == null && pm) f.precision = PREC[pm[1].toLowerCase()];
  if (f.money == null) f.money = pre === '$' || /dollar|\$/i.test(unit) || /\$/.test(String(key));
  if (f.percent == null) f.percent = unit === '%' || /%/.test(String(key));
  if (f.v == null) { const vm = /^([A-Za-z])\s*=$/.exec(pre); if (vm) f.v = vm[1]; }
  if (f.unit == null && unit && !/^[%$]$/.test(unit)) f.unit = unit;
  const kt = ansParse(key, { money: f.money, percent: f.percent, list: f.expect === 'list' });
  if (!f.expect) f.expect = ansShape(kt) || 'none';
  if (f.label == null) {                                  /* inferred, and only when it cannot be wrong: else nothing */
    f.label = ph ? '' : f.precision ? 'to the nearest ' + Object.keys(PREC).filter(w => PREC[w] === f.precision && w !== 'one')[0] : f.expect === 'sci' ? 'in scientific notation' : f.expect === 'ineq' ? 'as an inequality' : f.expect === 'power' ? 'as a power' : '';
    f.inferred = true;
  }
  return f;
}
/* Is `typed` the key written another way? → {ok, nudge}. The nudge is a quiet note under a right answer: "Simplify: 2/4 = 1/2." */
function ansEquiv(typed, key, form) {
  const f = form || {}, o = { money: !!f.money, percent: !!f.percent, unit: f.unit, list: f.expect === 'list' || f.expect === 'pair' };
  if (f.equiv === false) return { ok: false };
  const kt = ansParse(key, o); if (!kt) return { ok: false };
  let tt = ansParse(typed, o); if (!tt) return { ok: false };
  const kc = ansCanon(kt);
  /* a bare value for "x = 3", or "x = 3" (or "3 = x") for a box that already says "x =" */
  if (kt.k !== 'rel' && tt.k === 'rel' && tt.ops.length === 1 && tt.ops[0] === '=') {
    const sv = tt.sides.map(y => { while (y.k === 'grp') y = y.x; return y; });
    const vi = sv.findIndex(y => y.k === 'var' && (!f.v || y.s === f.v));
    if (vi >= 0 && sv[1 - vi].k !== 'var' && (f.v || f.expect === 'number' || f.expect === 'fraction' || f.expect === 'mixed')) tt = tt.sides[1 - vi];
  }
  const tc = ansCanon(tt);
  let ok = tc.s === kc.s, nudge = '';
  if (!ok && f.precision && kc.node.c === 'n' && tc.node.c === 'n') {        /* to the nearest tenth: within half a tenth */
    const kv = Number(kc.node.q.n) / Number(kc.node.q.d), tv = Number(tc.node.q.n) / Number(tc.node.q.d);
    if (Math.abs(kv - tv) <= f.precision / 2 + 1e-9 * Math.max(1, Math.abs(kv))) {
      ok = true;
      const pl = Math.round(-Math.log10(f.precision)), tp = places(tc.node.q);
      if (tp < 0 || tp > Math.max(0, pl)) nudge = 'Round to the nearest ' + Object.keys(PREC).filter(w => PREC[w] === f.precision && w !== 'one')[0] + ': ' + decStr(kc.node.q).replace(/−/g, '-') + '.';
    }
  }
  if (!ok) return { ok: false };
  if (!nudge && tc.notes.unred.length && !kc.notes.unred.length && f.simplest !== false) { const u = tc.notes.unred[0]; nudge = 'Simplify: ' + u[0] + ' = ' + (u[1].d === 1n ? u[1].n : u[1].n + '/' + u[1].d) + '.'; }
  if (!nudge && f.expect === 'fraction' && f.declaredFraction && tc.notes.dec && !kc.notes.dec) nudge = 'As a fraction: ' + String(key).trim() + '.';
  return { ok: true, nudge };
}
const Ans = { prep: ansPrep, parse: ansParse, canon: (t, o) => { const x = typeof t === 'string' ? ansParse(t, o) : t; return x ? ansCanon(x).s : null; }, shape: ansShape, form: ansForm, equiv: ansEquiv };

const api = { fnv1a, rng, tools, slot, draw, hint: { mul: hintMul, div: hintDiv, add: hintAdd, sub: hintSub, sq: hintSq }, Q, decStr, Ans };
if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Kit = api;
})(this);
