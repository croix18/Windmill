/* Practice-test kit: a part as text and back (15 Nov 2026), for the test the site judges (practice/exam/DESIGN.md): the parts
   are drawn in the teacher's browser and judged on the site, so each goes there as text. JSON with the few things JSON loses
   kept exact: a BigInt (the units' exact arithmetic), undefined, NaN, ±Infinity and −0. Anything else that is not data — a
   function, a symbol, a Date, a Map, an object made by a class, an object inside itself — is refused, with where it is, since
   the part would not judge the same after it (check/pack.js holds every unit to that).
     Kit.pack(part) → text        Kit.unpack(text) → part        Kit.pack.problems(part) → ['.st.say: a function', …]
   Pure. A browser script (Kit.pack, Kit.unpack) and a Node module ({pack, unpack, problems}). */
(function (root) {
'use strict';
var OP = Object.prototype;
function plain(o){ var p = Object.getPrototypeOf(o); return p === OP || p === null; }
function walk(v, at, stack, bad){
  var t = typeof v;
  if (v === null || t === 'boolean' || t === 'string') return v;
  if (t === 'number'){ if (v !== v) return {$: 'n', v: 'NaN'}; if (v === Infinity) return {$: 'n', v: 'Infinity'}; if (v === -Infinity) return {$: 'n', v: '-Infinity'}; if (v === 0 && 1 / v < 0) return {$: 'n', v: '-0'}; return v; }
  if (t === 'bigint') return {$: 'b', v: v.toString()};
  if (t === 'undefined') return {$: 'u'};
  if (t === 'function'){ bad.push((at || '(the part)') + ': a function'); return null; }
  if (t !== 'object'){ bad.push((at || '(the part)') + ': a ' + t); return null; }
  if (stack.indexOf(v) >= 0){ bad.push((at || '(the part)') + ': an object inside itself'); return null; }
  stack.push(v);
  var out;
  if (Array.isArray(v)){ out = []; for (var i = 0; i < v.length; i++) out.push(walk(v[i], at + '[' + i + ']', stack, bad)); }
  else if (!plain(v)){ bad.push((at || '(the part)') + ': a ' + ((v.constructor && v.constructor.name) || 'non-plain object')); out = null; }
  else {
    var o = {}, ks = Object.keys(v);
    for (var k = 0; k < ks.length; k++) o[ks[k]] = walk(v[ks[k]], at + '.' + ks[k], stack, bad);
    out = Object.prototype.hasOwnProperty.call(v, '$') ? {$: 'o', v: o} : o;       /* an object of its own with a "$" key */
  }
  stack.pop(); return out;
}
function problems(v){ var bad = []; walk(v, '', [], bad); return bad; }
function pack(v){
  var bad = [], t = walk(v, '', [], bad);
  if (bad.length) throw new Error('pack: not data — ' + bad.join('; '));
  return JSON.stringify(t);
}
function put(o, k, x){ if (k === '__proto__') Object.defineProperty(o, k, {value: x, enumerable: true, writable: true, configurable: true}); else o[k] = x; }
function back(t){
  if (t === null || typeof t !== 'object') return t;
  if (Array.isArray(t)) return t.map(back);
  if (Object.prototype.hasOwnProperty.call(t, '$')){
    if (t.$ === 'b') return BigInt(t.v);
    if (t.$ === 'u') return undefined;
    if (t.$ === 'n') return t.v === 'NaN' ? NaN : t.v === 'Infinity' ? Infinity : t.v === '-Infinity' ? -Infinity : -0;
    if (t.$ === 'o') t = t.v;
    else throw new Error('unpack: unknown tag ' + t.$);
  }
  var o = {}, ks = Object.keys(t); for (var k = 0; k < ks.length; k++) put(o, ks[k], back(t[ks[k]]));
  return o;
}
function unpack(text){ return back(JSON.parse(text)); }
pack.problems = problems;
if (typeof module !== 'undefined' && module.exports) module.exports = {pack: pack, unpack: unpack, problems: problems};
else { var K = root.Kit = root.Kit || {}; K.pack = pack; K.unpack = unpack; }
})(this);
