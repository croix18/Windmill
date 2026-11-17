/* Practice-test kit: a test on one lesson (exam_lesson.js, 16 Nov 2026; practice/exam/DESIGN.md, "Lesson tests"). Teacher builds
   only (a teacher copy's own: hashed for a teacher copy only), and under Node for exam/build_exam.py (the lessons and a sample).
   Croix, 16 Nov, 8:12 pm: "apply that across all of the practice tests, so I can test on a specific unit or lesson to test on";
   its size, "8, like a practice set".
   - A lesson test is the 8 items a practice set of that lesson would hold — 6 regular and 2 high rigor (a two-lesson day 3+1
     and 3+1), one of each of Cadence's question templates before any comes twice — drawn as a pure function of the unit, the
     scope (bank.js's own ids: "lesson-10.03", "lesson-10.09+10") and a 128-bit seed: nothing of the device's "used" memory,
     every item whatever the approvals (the site leaves out a form holding a disapproved item, by form.bank), and no practice
     link can open one (the seed is salted "test" and a practice seed is a number).
   - Drawn on this page by the pool (Kit.ExamPool.draw, exam_pool.js, untouched): for the seed being drawn, Unit.generate gives
     the lesson's items as one section (bank.js's own kit items), so the pool records, packs and proves a lesson form exactly as
     it does a unit form; any other seed — the page putting itself back — is the unit's own. The form gains scope and bank (the
     Cadence ids); its pub the lesson's head (title, h1, eyebrow), lesson {scope, code, title, name}, qids (each item's ID,
     "U10·L3·7", which the test page shows as this page does) and the lesson keypad.
   - The cockpit asks {kit:'exam-pool', lessonDraw: n, scope}; the copy answers {kit:'exam-pool', scope, forms, done, of} in
     fives, or {kit:'exam-pool', scope, error}. Right after the pool's ready it says {kit:'exam-pool', lessons:[{scope, code,
     title, name, day}]}.
   - Kit.ExamLesson: lessons(), draw(n, scope, seeds), sheet(seed) (the cards, as Kit.ExamPool.sheet), items(scope, seed) (the
     Cadence ids), withSet(scope, seeds, fn) (fn run with those seeds drawing the lesson's set: See the test's keys). */
(function(root){
'use strict';
var BATCH = 5, SALT = 'test';
/* bank.js's quotas: a set of 8 over a choice's lessons */
function quotas(n){ return n === 1 ? [[6, 2]] : n === 2 ? [[3, 1], [3, 1]] : (function(){ var q = [], left = 8; for (var i = 0; i < n; i++){ var k = Math.round(left / (n - i)); left -= k; q.push([k - Math.round(k / 4), Math.round(k / 4)]); } return q; })(); }
function shuffled(K, list, seedStr){ var r = K.rng(K.fnv1a(seedStr)), a = list.slice(); for (var i = a.length - 1; i > 0; i--){ var j = Math.floor(r() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
/* the ids of a lesson test: bank.js's drawLesson with nothing used and nothing hidden */
function pickIds(K, uid, SC, LES, scope, seed){
  var s = SC[scope]; if (!s) throw new Error('no lesson choice ' + scope);
  var q = quotas(s.lessons.length), ids = [];
  s.lessons.forEach(function(lid, li){
    var L = LES[lid], all = L.items.slice(), reg = all.filter(function(b){ return !b.rigor; }), rig = all.filter(function(b){ return b.rigor; });
    var nReg = q[li][0], nRig = q[li][1], pick = [];
    if (!rig.length){ nReg += nRig; nRig = 0; } if (!reg.length){ nRig += nReg; nReg = 0; }
    var take = function(pool, n, salt){
      if (!n) return;
      var order = shuffled(K, pool, uid + '|' + lid + '|' + salt + '|' + SALT + '|' + seed), fresh = order.filter(function(b){ return pick.indexOf(b) < 0; });
      var gens = {}, got = [];
      pick.forEach(function(b){ gens[b.sk + ':' + b.gen] = 1; });
      fresh.forEach(function(b){ if (got.length < n && !gens[b.sk + ':' + b.gen]){ gens[b.sk + ':' + b.gen] = 1; got.push(b); } });
      fresh.forEach(function(b){ if (got.length < n && got.indexOf(b) < 0) got.push(b); });
      pick = pick.concat(got);
    };
    take(reg, nReg, 'r'); take(rig, nRig, 'h');
    ids = ids.concat(pick.map(function(b){ return b.id; }));
  });
  return ids;
}
/* a kit item made fresh (bank.js keeps one per Cadence item; the pool wants new objects each draw) */
function fresh(it){
  var o = Object.assign({}, it);
  if (it.parts) o.parts = it.parts.map(function(p){ return Object.assign({}, p); });
  if (it.part) o.part = Object.assign({}, it.part);
  if (it.opts) o.opts = it.opts.slice();
  if (Array.isArray(it.correct)) o.correct = it.correct.slice();
  return o;
}
/* the lessons, in the plan's order: every choice bank.js makes (the menu's and the two-lesson days) */
function lessonsOf(KB){ return KB.keys().map(function(k){ var s = KB._scopes[k]; return {scope: k, code: s.code, title: s.title, name: KB.name(k), day: !!s.day}; }); }
/* the set as Unit.generate gives it: one section, the lesson's name over it */
function setOf(K, uid, KB, scope, seed){
  var ids = pickIds(K, uid, KB._scopes, KB._lessons, scope, seed);
  return {sections: [{title: KB.name(scope), items: ids.map(function(id){ return fresh(KB._kitItem(KB._byId[id])); })}]};
}
var api = {quotas: quotas, pickIds: pickIds, lessonsOf: lessonsOf, setOf: setOf, fresh: fresh};
if (typeof module !== 'undefined' && module.exports){ module.exports = api; return; }

/* ---------------------------------------------------------------- in the teacher copy */
var W = root;
function K(){ return W.Kit; }
function U(){ return W.Unit; }
function KB(){ return K() && K().Bank; }
/* the keypad a lesson set has (bank.js's, filtered by the unit's keys), as the pool writes a keypad: data, what each key types */
function lessonKeypad(base){
  var out = (base || []).slice(), have = {}; out.forEach(function(k){ have[k.label + '|' + (k.kinds || []).join(',')] = 1; });
  (KB().keypad || []).forEach(function(k){
    var o = {label: k.label}; if (k.say != null) o.say = k.say; if (k.tpl != null) o.tpl = k.tpl; o.kinds = (k.kinds || ['bank']).slice();
    if (typeof k.ins === 'function'){ o.ins = {}; try { o.ins.bank = String(k.ins('bank')); } catch(e){} }
    if (!have[o.label + '|' + o.kinds.join(',')]) out.push(o);
  });
  return out;
}
/* fn run with Unit.generate giving these seeds the lesson's set (and any other seed the unit's own, as always) */
function withSet(scope, seeds, fn){
  var u = U(), kb = KB(), mine = {}, orig = u.generate;
  seeds.forEach(function(s){ mine[s] = 1; });
  u.generate = function(s){ return typeof s === 'string' && mine[s] ? setOf(K(), u.id, kb, scope, s) : orig.apply(this, arguments); };
  try { return fn(); } finally { u.generate = orig; }
}
function draw(n, scope, seeds){
  var u = U(), kb = KB(); if (!kb || !kb._scopes[scope]) throw new Error('this unit has no lesson ' + scope);
  seeds = (seeds || []).slice();
  var made = [];
  while (seeds.length < n){ var a = new Uint8Array(16); crypto.getRandomValues(a); seeds.push(Array.prototype.map.call(a, function(b){ return (b < 16 ? '0' : '') + b.toString(16); }).join('')); }
  withSet(scope, seeds, function(){ made = K().ExamPool.draw(seeds.length, seeds); });
  var s = kb._scopes[scope], head = kb.head(scope), name = kb.name(scope);
  return made.map(function(f){
    var items = f.priv.map(function(t){ return K().unpack(t); });
    var bank = []; items.forEach(function(it){ var b = (it.x && it.x.bank) || (it.sibPart && it.sibPart.bank); if (b && bank.indexOf(b.id) < 0) bank.push(b.id); });
    var g = setOf(K(), u.id, kb, scope, f.seed), qids = g.sections[0].items.map(function(it){ return kb.qid(it).id; });
    /* the eyebrow's "LESSON&nbsp;3.07" kept on one line */
    var pub = Object.assign({}, f.pub, {scope: scope, lesson: {scope: scope, code: s.code, title: s.title, name: name}, qids: qids,
      title: String(head.title).replace(/\s*Practice\s*$/, ' Test'), h1: head.h1, eyebrow: String(head.eyebrow).replace(/\s*Practice\s*$/, '').replace(/(Lessons?) (\S+)$/, '$1&nbsp;$2'), keypad: lessonKeypad(f.pub.keypad)});
    return {seed: f.seed, scope: scope, pub: pub, priv: f.priv, fams: f.fams, bank: bank};
  });
}
function init(){
  var kb = KB();
  if (!kb){ if (/^#exam-pool$/.test(POOLHASH) && W.parent !== W) W.parent.postMessage({kit: 'exam-pool', lessons: []}, location.origin); return; }
  K().ExamLesson = {lessons: function(){ return lessonsOf(kb); }, draw: draw, sheet: function(seed){ return K().ExamPool.sheet(seed); },
    withSet: withSet,
    items: function(scope, seed){ return pickIds(K(), U().id, kb._scopes, kb._lessons, scope, seed); }};
  if (!/^#exam-pool$/.test(POOLHASH) || W.parent === W) return;
  var say = function(m){ m.kit = 'exam-pool'; W.parent.postMessage(m, location.origin); };
  W.addEventListener('message', function(e){
    if (e.origin !== location.origin || e.source !== W.parent || !e.data || e.data.kit !== 'exam-pool' || !(e.data.lessonDraw > 0)) return;
    var scope = String(e.data.scope || ''), n = Math.min(500, e.data.lessonDraw | 0), done = 0;
    if (!kb._scopes[scope]) return say({scope: scope, error: 'no lesson ' + scope + ' in this unit'});
    var step = function(){
      try { var f = draw(Math.min(BATCH, n - done), scope); done += f.length; say({scope: scope, forms: f, done: done, of: n}); }
      catch(err){ say({scope: scope, error: String(err && err.message || err)}); return; }
      if (done < n) setTimeout(step, 0);
    };
    setTimeout(step, 0);
  });
  say({lessons: lessonsOf(kb)});                         /* after the pool's ready (init waits for Kit.ExamPool, which says it first) */
}
var POOLHASH = location.hash || '';                        /* read before ui.js runs: openSet writes the set's own link */
/* the pool and bank.js come up with the page (ui.js may wait for the approvals): start once both exist */
(function wait(n){ var k = K(); if (k && k.ExamPool && W.PracticeKit) { init(); return; } if (n < 600) setTimeout(function(){ wait(n + 1); }, 50); })(0);
})(typeof window !== 'undefined' ? window : this);
