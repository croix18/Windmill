/* Practice-test kit: the test's pool, drawn in the teacher copy (exam_pool.js, 15 Nov 2026; practice/exam/DESIGN.md, "The
   pieces → 1. Kit"). Teacher builds only. The cockpit opens the unit's teacher copy in a hidden frame at …/#exam-pool and asks
   it for n drawn tests: drawing takes longer than the site may spend on a request, and the teacher copy already holds the
   whole unit behind the password.
     the copy says     {kit: 'exam-pool', ready: true, course, unit, cv, kitv}
     the cockpit says  {kit: 'exam-pool', draw: n}
     the copy answers  {kit: 'exam-pool', forms: [{seed, pub, priv, fams}], done, of}   in batches of 5, or {kit: 'exam-pool', error}
   Same origin both ways (postMessage to location.origin; a message is read only from the parent, on this origin).
   Each test is a random 128-bit seed (32 hex characters; every unit draws through Kit.draw, which hashes unit|seed|slot, so no
   practice link #set-N can open it), drawn as "Like the real test" through the page's own render() and paint
   (PracticeKit.draw, ui.js), as a student page draws it, with every kind of question (the site leaves out a disapproved one
   by fams):
   - pub, what the stub unit (exam_unit.js) needs to draw the same sheet: every call the page made to the unit's view while
     it rendered and painted, its result kept under the function, the item or part by its place in the set, and the other
     arguments (REC below); a skeleton of the set with only the fields the kit's own code reads (SKEL below); the unit's
     words (title, eyebrow, h1, notes), its keypad as data, contentVersion and the kit's version. Never a key, a graph, an
     answer or a part's numbers.
   - priv, the page's ITEMS, each packed (pack.js) with its keyText, in order: what the site judges with exam/server.js.
   - fams, the kinds of question in the test (PracticeKit.famKey), which the approvals name.
   Every test proves itself before it goes: unpacked from its priv, every part's key is right and a wrong answer is not, by
   exam/server.js itself (build.py gives a teacher page Kit.ExamServer). A test that does not is an error, never sent.
   For the checks: Kit.ExamPool.draw(n) → the same forms; Kit.ExamPool.sheet(seed) → the question cards as this page drew
   them for that seed (check/exam_page.js holds the test page's cards to them). */
(function(){
'use strict';
var K = window.Kit = window.Kit || {};
var POOL = /^#exam-pool$/.test(location.hash || '');           /* read before ui.js runs: openSet writes the set's own link */
var U, J, LET = 'ABCDEFGH';

/* ---- the skeleton: the fields of the set the kit's own code reads off an item or a part when it draws and paints it in
   exam mode (audited: ui.js build/render/partHtml/choicesHtml/nlHtml/cgHtml/paintItem/paintChoices/nlPaint/cgPaint/
   restoreOne, pager.js, nline.js spec/widget/svg/say, cgraph.js spec/norm/widget/svg/namesHtml/say/done, judge.js
   boxesOf/boxAns/answered). Nothing else of an item or a part leaves the teacher copy. */
var ITEM = {
  type: 'parts | solo | mc | multi: build() and render() pick the card, and ITEMS the part type, by it',
  opts: 'mc and multi: only how many choices (choicesHtml and paintChoices loop over it); each choice is view.opt, recorded',
  parts: 'parts: its parts, each by PART',
  part: 'solo: its one part, by PART'
};
var PART = {
  label: 'the part\'s letter: its id (3a), its line ("a.") and its "1 pt"',
  kind: 'textType (mc, nline, cgraph or a box), the box\'s data-kind for the keypad, the box\'s kind for the boxes',
  imode: 'the box\'s inputmode for a phone\'s keyboard',
  opts: 'a multiple-choice part: only how many choices, as an item\'s',
  line: 'a number line: {lo, st, n}, the axis the student graphs on (nline.js spec), as numbers',
  circle: 'a circle graph: {step}, its marks (cgraph.js spec)',
  cats: 'a circle graph: its categories\' names, as the names row lists them; the stub makes graph = [{name}] of them, no sizes',
  boxes: 'declared boxes ([{pre, unit, say, placeholder, imode, kind, form}]), judge.js boxesOf\'s fallback to view.boxes',
  form: 'the declared form ({label, expect, precision, simplest, equiv}), what a box is to be written as',
  flab: 'not the unit\'s: the form label the page shows over the box (judge.js formOf(p).label, worked out here from the key, as the page does)'
};
var FORMK = ['label', 'expect', 'precision', 'simplest', 'equiv'], BOXK = ['pre', 'unit', 'say', 'placeholder', 'imode', 'kind', 'form'];
function plain(o){ return o && typeof o === 'object' && !Array.isArray(o); }
function pick(o, ks){ var out = {}; ks.forEach(function(k){ if (o[k] != null && typeof o[k] !== 'function') out[k] = plain(o[k]) ? pick(o[k], FORMK) : o[k]; }); return out; }
function skelPart(p){
  var o = {};
  if (p.label != null) o.label = String(p.label);
  if (p.kind != null) o.kind = String(p.kind);
  if (typeof p.imode === 'string') o.imode = p.imode;
  if (Array.isArray(p.opts)) o.opts = p.opts.map(function(){ return ''; });
  if (p.kind === 'nline'){ var S = K.NL.spec(p); o.line = {lo: S.lo, st: S.st, n: S.n}; }
  if (p.kind === 'cgraph'){ var C = K.CG.spec(p); o.circle = {step: C.step}; o.cats = C.cats.slice(); }
  if (Array.isArray(p.boxes)) o.boxes = p.boxes.map(function(b){ return pick(b || {}, BOXK); });
  if (plain(p.form)) o.form = pick(p.form, FORMK);
  if (p.kind !== 'mc' && p.kind !== 'nline' && p.kind !== 'cgraph'){ var fl = ''; try { fl = J.formOf(p).label || ''; } catch(e){} if (fl) o.flab = fl; }
  return o;
}
function skelItem(it){
  var o = {type: it.type};
  if (it.type === 'parts') o.parts = it.parts.map(skelPart);
  else if (it.type === 'solo') o.part = skelPart(it.part);
  else o.opts = (it.opts || []).map(function(){ return ''; });
  return o;
}
function skel(g){ return {sections: g.sections.map(function(s){ return {title: String(s.title), items: s.items.map(skelItem)}; })}; }

/* ---- the recording: U.view wrapped once; while a test is drawn every call is kept */
var REC = null;
function wrapView(){
  var V = U.view;
  Object.keys(V).forEach(function(f){
    var fn = V[f]; if (typeof fn !== 'function' || fn.__examRec) return;
    var w = function(){
      var args = Array.prototype.slice.call(arguments), r, threw = false;
      try { r = fn.apply(this, args); } catch(e){ threw = true; if (REC) REC.push({f: f, a: args, t: 1}); throw e; }
      if (REC && !threw) REC.push({f: f, a: args, r: r});
      return r;
    };
    w.__examRec = true; V[f] = w;
  });
}
/* a call's name: the function, then each argument — an item or a part by its place (si.ii, si.ii.pi, a solo part si.ii.-1) */
function callKey(f, args, place){
  return f + '|' + args.map(function(a){
    if (a && typeof a === 'object'){ var p = place.get(a); if (p == null) throw new Error('view.' + f + ' was asked about something not in the set'); return '@' + p; }
    return a === undefined ? 'u' : JSON.stringify(a);
  }).join('|');
}
function placesOf(items){
  var m = new Map();
  items.forEach(function(it){
    var p = String(it.pos).split('.'), ip = p[0] + '.' + p[1];
    if (it.item && !m.has(it.item)) m.set(it.item, ip);
    if (it.x !== it.item) m.set(it.x, it.pos);
  });
  return m;
}
/* the unit's keypad as data: each key's label, words and kinds, and what it types for each kind of box in this test */
function keypadOf(kinds){
  if (U.keypad == null) return null;
  return U.keypad.map(function(k){
    var o = {}; ['label', 'say', 'tpl'].forEach(function(f){ if (k[f] != null) o[f] = k[f]; });
    if (Array.isArray(k.kinds)) o.kinds = k.kinds.slice();
    if (typeof k.ins === 'function'){ o.ins = {}; kinds.forEach(function(kd){ try { o.ins[kd] = String(k.ins(kd)); } catch(e){} }); }
    return o;
  });
}
function keyTextOf(it){
  var x = it.x;
  if (it.type === 'nline') return K.NL.keyText(K.NL.graphOf(x));
  if (it.type === 'cgraph') return K.CG.keyText(K.CG.graphOf(x));
  if (it.type === 'mc') return LET[x.correct];
  if (it.type === 'multi') return x.correct.map(function(k){ return LET[k]; }).join(',');
  var t = U.keyText(x); return Array.isArray(t) ? t.map(String) : String(t);
}
/* the answers a proof tries (check/pack.js's): the key, and a wrong answer */
function keyAns(it){ var x = it.x; return it.type === 'nline' ? K.NL.graphOf(x) : it.type === 'cgraph' ? K.CG.graphOf(x) : it.type === 'mc' ? x.correct : it.type === 'multi' ? x.correct.slice() : U.keyText(x); }
function wrongAns(it){
  var x = it.x;
  if (it.type === 'nline'){ var Sp = K.NL.spec(x), g = K.NL.graphOf(x), i = K.NL.idx(Sp, g.c); return {c: K.NL.kstr(K.NL.val(Sp, i < Sp.n ? i + 1 : i - 1)), closed: g.closed, dir: g.dir}; }
  if (it.type === 'cgraph'){ var k = K.CG.graphOf(x), st = K.CG.spec(x).step, a = k.map(function(s){ return {name: s.name, deg: s.deg}; }); a[0].deg += st; a[1].deg -= st; return a; }
  if (it.type === 'mc' || it.type === 'multi'){ var n = (x.opts || []).length, C = it.type === 'mc' ? [x.correct] : x.correct, b = 0; while (C.indexOf(b) >= 0 && b < n) b++; return it.type === 'mc' ? b : [b]; }
  var B = J.boxesOf(x); return B ? B.map(function(){ return '987654'; }) : '987654';
}
function prove(priv){
  var SV = K.ExamServer; if (!SV) throw new Error('exam/server.js is not on this page');
  var items = priv.map(function(t){ return K.unpack(t); }), right = {}, wrong = {}, vs = [], vw = [];
  items.forEach(function(it){ right[it.id] = keyAns(it); wrong[it.id] = wrongAns(it); });
  for (var i = 0; i < items.length; i += 2){ vs = vs.concat(SV.grade(U, items, right, vs, i, 2)); vw = vw.concat(SV.grade(U, items, wrong, vw, i, 2)); }
  items.forEach(function(it, k){
    if (!vs[k] || vs[k].v !== 'right') throw new Error(it.id + ': its key is ' + (vs[k] && vs[k].v) + ' after unpack');
    if (!vw[k] || vw[k].v === 'right') throw new Error(it.id + ': a wrong answer is right after unpack');
  });
  var sm = SV.summary(items, vs); if (sm.points !== items.length) throw new Error('the keys score ' + sm.points + ' / ' + sm.of);
}
function seed128(){ var a = new Uint8Array(16); crypto.getRandomValues(a); return Array.prototype.map.call(a, function(b){ return (b < 16 ? '0' : '') + b.toString(16); }).join(''); }
function courseOf(){ var m = /^([a-z]+\d+)u(\d+)$/.exec(U.id || ''); return m ? {course: m[1], unit: +m[2]} : {course: '', unit: 0}; }

var SHEETS = {};
/* draw these seeds; for each: {seed, pub, priv, fams} */
function drawAll(seeds, keepSheet){
  var PK = window.PracticeKit, out = [], seen = {};
  PK.draw(seeds, function(seed, drawn){
    var rec = REC; REC = null;
    var items = K.items(), place = placesOf(drawn), calls = {};
    rec.forEach(function(c){ var k = callKey(c.f, c.a, place); calls[k] = c.t ? {t: 1} : {r: c.r === undefined ? null : c.r}; });
    var bad = K.pack.problems(calls); if (bad.length) throw new Error('a view result is not data: ' + bad[0]);
    var g = U.generate(seed), kinds = [];
    items.forEach(function(it){ if (it.type === 'text'){ if (kinds.indexOf(it.x.kind) < 0) kinds.push(it.x.kind); (J.boxesOf(it.x) || []).forEach(function(b){ if (b.kind && kinds.indexOf(b.kind) < 0) kinds.push(b.kind); }); } });
    var priv = items.map(function(it){ var o = {id: it.id, type: it.type, x: it.x, sib: it.sib, sibPart: it.sibPart, aShown: it.aShown, pos: it.pos, lab: it.lab, keyText: keyTextOf(it)}; return K.pack(o); });
    var sig = items.map(function(it){ try { return String(U.key(it.x)); } catch(e){ return it.id; } }).join(';');
    if (seen[sig]) throw new Error('two seeds drew the same set'); seen[sig] = 1;
    prove(priv);
    var fams = []; g.sections.forEach(function(s){ s.items.forEach(function(it){ var f = PK.famKey(it); if (f && fams.indexOf(f) < 0) fams.push(f); }); });
    var c = courseOf();
    var pub = {v: 1, course: c.course, unit: c.unit, id: U.id, cv: U.contentVersion, kit: window.KIT_V || '', title: U.title, eyebrow: U.eyebrow, h1: U.h1,
      notes: (U.notes || []).slice(), keypad: keypadOf(kinds), skel: skel(g), calls: calls};
    if (keepSheet) SHEETS[seed] = Array.prototype.map.call(document.querySelectorAll('#paper .q[data-q]'), function(q){ return q.outerHTML; });
    out.push({seed: seed, pub: pub, priv: priv, fams: fams});
  }, function(){ REC = []; });
  return out;
}
function init(){
  U = window.Unit; J = K.Judge({U: U, V: U.view, K: K, NL: K.NL, CG: K.CG});
  wrapView();
  var c = courseOf();
  var api = {
    draw: function(n, seeds){ seeds = seeds || []; while (seeds.length < n) seeds.push(seed128()); return drawAll(seeds, true); },
    sheet: function(seed){ return SHEETS[seed] || null; },
    whitelist: {item: ITEM, part: PART}
  };
  K.ExamPool = api;
  if (!POOL || window.parent === window) return;
  var say = function(m){ m.kit = 'exam-pool'; window.parent.postMessage(m, location.origin); };
  window.addEventListener('message', function(e){
    if (e.origin !== location.origin || e.source !== window.parent || !e.data || e.data.kit !== 'exam-pool' || !(e.data.draw > 0)) return;
    var n = Math.min(500, e.data.draw | 0), done = 0;
    var step = function(){
      try { var f = drawAll(Array.apply(null, Array(Math.min(5, n - done))).map(seed128), false); done += f.length; say({forms: f, done: done, of: n}); }
      catch(err){ say({error: String(err && err.message || err)}); return; }
      if (done < n) setTimeout(step, 0);
    };
    setTimeout(step, 0);
  });
  say({ready: true, course: c.course, unit: c.unit, cv: U.contentVersion, kitv: window.KIT_V || ''});
}
/* ui.js may wait for the approvals before it draws: start once its PracticeKit exists */
(function wait(n){ if (window.PracticeKit && window.PracticeKit.draw) init(); else if (n < 600) setTimeout(function(){ wait(n + 1); }, 50); })(0);
})();
