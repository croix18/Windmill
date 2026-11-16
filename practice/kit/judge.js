/* Practice-test kit: the judge (15 Nov 2026). What ui.js did to judge an answer, moved here unchanged so the practice page and
   the site's side of a test (exam/server.js) judge with one source and can never disagree on an answer: a part's boxes, a
   blank, "can't read this yet", the unit's own judge, equivalent forms (core.js Kit.Ans), and what Finish does to a part in
   "Like the real test". Pure: no DOM, no page state — the context (ui.js ctxOf) is passed in by whoever calls it.
     var J = Kit.Judge({U: window.Unit, V: Unit.view, K: Kit, NL: Kit.NL, CG: Kit.CG});
     J.answered(it, a)              is the part answered (every box filled; a point placed; a circle graph done)
     J.judge(it, a, ctx, tries)     → {v: right|form|wrong|unread|blank, what, …}   (ui.js judgeAns)
     J.atFinish(it, a, ctx, tries)  → {v: right|wrong|blank|unread, f, msg?}   what Finish makes of it on "Like the real test":
                                      a blank or unreadable answer is marked wrong with msg as its note; an "Almost" is not right
   it: {type: 'text'|'mc'|'multi'|'nline'|'cgraph', x: the part (or the item, for mc and multi)}; a: the answer as the page keeps it.
   A browser script (Kit.Judge, after core.js, nline.js and cgraph.js; before ui.js) and a Node module ({Judge, plainText}). */
(function (root) {
'use strict';
function esc(s){ return String(s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
/* an element's textContent after innerHTML = h, without a DOM (a box's "Fill in every box" line names it by its pre or unit):
   comments and tags out, character references decoded; a "<" that does not open a tag stays, as the HTML parser keeps it */
var NAMED = {amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00a0', minus: '\u2212', times: '\u00d7', divide: '\u00f7', middot: '\u00b7',
  le: '\u2264', ge: '\u2265', ne: '\u2260', deg: '\u00b0', pi: '\u03c0', thinsp: '\u2009', ensp: '\u2002', emsp: '\u2003', ndash: '\u2013', mdash: '\u2014',
  hellip: '\u2026', rsquo: '\u2019', lsquo: '\u2018', rdquo: '\u201d', ldquo: '\u201c', frac12: '\u00bd', frac14: '\u00bc', frac34: '\u00be', sup2: '\u00b2', sup3: '\u00b3', cent: '\u00a2', ZeroWidthSpace: '\u200b'};
function plainText(h){
  return String(h == null ? '' : h).replace(/<!--[\s\S]*?(?:-->|$)/g, '').replace(/<\/?[A-Za-z][^>]*>/g, '').replace(/&(#[xX][0-9A-Fa-f]+|#\d+|[A-Za-z][A-Za-z0-9]*);/g, function(m, e){
    if (e.charAt(0) === '#'){ var n = e.charAt(1) === 'x' || e.charAt(1) === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); try { return n === 0 || n > 0x10FFFF ? '\ufffd' : String.fromCodePoint(n); } catch(x){ return m; } }
    return Object.prototype.hasOwnProperty.call(NAMED, e) ? NAMED[e] : m; }).replace(/&(amp|lt|gt|quot|nbsp)(?![A-Za-z0-9;])/g, function(m, e){ return NAMED[e]; });   /* the old ones a parser reads without their ";" */
}
function Judge(o){
var U = o.U, V = o.V || U.view, K = o.K, NL = o.NL || K.NL, CG = o.CG || K.CG;
/* ---- several boxes in one part (ui.js, 15 Nov 2026): view.boxes(part), two or more; fewer is the one box of before */
var BOXES = typeof WeakMap === 'function' ? new WeakMap() : null;
function boxesOf(p){
  if (!p || p.kind === 'mc' || p.kind === 'nline' || p.kind === 'cgraph') return null;
  if (BOXES && BOXES.has(p)) return BOXES.get(p);
  var b = null; try { b = V.boxes ? V.boxes(p) : null; } catch(e){ b = null; }
  if (!b && Array.isArray(p.boxes)) b = p.boxes;
  b = Array.isArray(b) && b.length >= 2 ? b.map(function(x){ return x || {}; }) : null;
  if (BOXES) BOXES.set(p, b); return b;
}
function boxAns(p, a){                                     /* a part's answer as one string per box (a string saved before is dropped) */
  var B = boxesOf(p); if (!B) return a;
  return B.map(function(x, k){ return Array.isArray(a) && a[k] != null ? String(a[k]) : ''; });
}
function boxSay(bx, k){ var s = bx.say || plainText(bx.pre || '').replace(/\s*=\s*$/, '').trim() || plainText(bx.unit || '').trim(); return s || 'box ' + (k + 1); }
function answered(it, a){ if (it.type === 'text' && boxesOf(it.x)) return boxAns(it.x, a).every(function(v){ return v.trim() !== ''; });   /* several boxes: every one filled */
  return it.type === 'multi' ? !!(a && a.length) : it.type === 'nline' ? !NL.empty(a) : it.type === 'cgraph' ? CG.done(it.x, a) : a != null && String(a).trim() !== ''; }
function judge(it, a, ctx, tries){
  if (it.type === 'nline'){ try { return NL.judge(it.x, a, ctx, U.judge.nline); } catch(e){ return {v: 'unread', what: ['Place the point, then choose a dot and an arrow.']}; } }
  if (it.type === 'cgraph'){ try { return CG.judge(it.x, a, ctx, U.judge.cgraph); } catch(e){ return {v: 'unread', what: ['Draw the lines, then name every sector.']}; } }
  var B = it.type === 'text' ? boxesOf(it.x) : null;
  if (B){                                                   /* several boxes: all blank is blank; some blank is not a try yet */
    var bs = boxAns(it.x, a), empty = bs.map(function(v){ return v.trim() === ''; });
    if (empty.every(Boolean)) return {v: 'blank', what: []};
    if (empty.some(Boolean)) return {v: 'unread', partial: true, what: ['Fill in every box: ' + B.map(function(x, k){ return empty[k] ? '<b>' + esc(boxSay(x, k)) + '</b>' : ''; }).filter(Boolean).join(' and ') + (empty.filter(Boolean).length === 1 ? ' is' : ' are') + ' still empty.']};
    try { bs = bs.map(tidy); return equivUp(it, bs, U.judge.text(it.x, bs, ctx)); }
    catch(e){ return {v: 'unread', what: ['I can’t read that yet. Type just your answer in each box.']}; }
  }
  if (it.type === 'multi' ? !(a && a.length) : (a == null || String(a).trim() === '')) return {v: 'blank', what: []};
  try {
    if (it.type === 'text'){ a = tidy(a); return equivUp(it, a, U.judge.text(it.x, a, ctx)); }
    if (it.type === 'mc') return U.judge.mc(it.x, +a);
    return U.judge.multi(it.x, a, (tries || 0) + 1);
  } catch(e){ return {v: 'unread', what: ['I can’t read that yet. Type just your answer.']}; }
}
/* what Finish does to a part on "Like the real test" (ui.js finish): it is judged as it stands; a blank or an answer that cannot
   be read is marked wrong, with "Left blank." or the reader's own line as its note; an "Almost" earns no point */
function atFinish(it, a, ctx, tries){
  var f = judge(it, a, ctx, tries);
  if (f.v === 'blank') return {v: 'blank', f: f, msg: 'Left blank.'};
  if (f.v === 'unread') return {v: 'unread', f: f, msg: f.what[0] || 'Could not read the answer.'};
  return {v: f.v === 'right' ? 'right' : 'wrong', f: f};
}
/* ---- equivalent forms (7 Nov 2026, the practice-test deepening, item 3): the unit's coach judges first; when it says "not
   yet" (or "almost", or cannot read it) and the typed answer IS the key written another way — 3 = x for x = 3, 2/4 for 1/2,
   1 1/2 for 3/2, the terms in another order, a unicode minus, a $ in a money box (core.js Kit.Ans) — it is right, with a quiet
   nudge where the form could be tidier. The normaliser never does the arithmetic the question asks for (3x + 2x is not 5x).
   A unit declares a box's expected form with view.form(part) → {label, expect, precision, simplest, equiv: false, …}; with
   none, the form is read from the key and the box, and its label shows only where it cannot be wrong. */
var FORMS = typeof WeakMap === 'function' ? new WeakMap() : null;
function formOf(p){
  if (FORMS && FORMS.has(p)) return FORMS.get(p);
  var d = null, key = '', f; try { d = V.form ? V.form(p) : null; } catch(e){}
  try { key = U.keyText ? String(U.keyText(p)) : ''; } catch(e){}
  try { f = K.Ans.form(key, {declared: Object.assign({}, p.form || {}, d || {}), placeholder: V.placeholder(p), pre: V.pre(p), unit: V.unit(p)}); } catch(e){ f = {label: '', equiv: false}; }
  f.key = key; if (FORMS) FORMS.set(p, f); return f;
}
/* the keypad's fraction template writes ()/(); a unit's reader need not know it: (3)/(4) is 3/4 */
function tidy(a){
  if (typeof a !== 'string' || a.indexOf(')/(') < 0) return a;
  return a.replace(/\(\s*(-?\d+(?:\.\d+)?)\s*\)\s*\/\s*\(\s*(-?\d+(?:\.\d+)?)\s*\)(\s*\^)?/g, function(m, n, d, pow, at, all){
    var before = all.slice(0, at).replace(/\s+$/, ''), glued = /[\w).π]$/.test(before) && !/\s$/.test(all.slice(0, at));
    return pow || glued ? '(' + n + '/' + d + ')' + (pow || '') : n + '/' + d; });   /* (4)/(7)^8 is (4/7)^8; 2 (3)/(4) is 2 3/4 */
}
function equivUp(it, a, f){
  if (!f || f.v === 'right' || f.v === 'blank' || !K.Ans) return f;
  if (Array.isArray(a)) return equivBoxes(it, a, f);
  var fm = formOf(it.x), r; if (!fm.key) return f;
  try { r = K.Ans.equiv(a, fm.key, fm); } catch(e){ return f; }
  if (!r || !r.ok) return f;
  var nudge = r.nudge ? esc(r.nudge) : f.v === 'form' && f.what && f.what[0] ? f.what[0] : '';   /* a unit's own "almost" words become the nudge */
  return {v: 'right', what: nudge ? [nudge] : [], equiv: true};
}
/* several boxes: right when every box is its key written another way (each box's own form: its pre "x =", its unit, its form) */
function boxForm(p, k){
  var B = boxesOf(p), bx = B[k] || {}, keys = boxKeys(p), f;
  try { f = K.Ans.form(keys[k] || '', {declared: Object.assign({}, bx.form || {}), placeholder: bx.placeholder || '', pre: bx.pre || '', unit: bx.unit || ''}); } catch(e){ f = {equiv: false}; }
  f.key = keys[k] || ''; return f;
}
function boxKeys(p){ var t = null; try { t = U.keyText ? U.keyText(p) : null; } catch(e){} return Array.isArray(t) ? t.map(String) : []; }
function equivBoxes(it, a, f){
  var B = boxesOf(it.x), d = formOf(it.x); if (!B || d.equiv === false || boxKeys(it.x).length !== B.length) return f;
  var nudges = [];
  for (var k = 0; k < B.length; k++){ var fk = boxForm(it.x, k), r; if (!fk.key) return f; try { r = K.Ans.equiv(a[k], fk.key, fk); } catch(e){ return f; } if (!r || !r.ok) return f; if (r.nudge) nudges.push(esc(r.nudge)); }
  if (!nudges.length && f.v === 'form' && f.what && f.what[0]) nudges.push(f.what[0]);
  return {v: 'right', what: nudges, equiv: true};
}
return {boxesOf: boxesOf, boxAns: boxAns, boxSay: boxSay, answered: answered, judge: judge, atFinish: atFinish, formOf: formOf, tidy: tidy, equivUp: equivUp, boxForm: boxForm, boxKeys: boxKeys, equivBoxes: equivBoxes, plainText: plainText};
}
Judge.plainText = plainText;
if (typeof module !== 'undefined' && module.exports) module.exports = {Judge: Judge, plainText: plainText};
else { var Kt = root.Kit = root.Kit || {}; Kt.Judge = Judge; }
})(this);
