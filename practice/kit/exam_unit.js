/* Practice-test kit: the stub unit (exam_unit.js, 15 Nov 2026; practice/exam/DESIGN.md). The test page runs the kit's own page
   code (ui.js, pager.js and the rest) on this in place of the unit's scripts, which never come to a student's device. It is the
   same file for every unit, and it knows only what the site sent (pub, drawn in the teacher copy by exam_pool.js):
     Kit.ExamUnit.make(pub) → the unit: id, contentVersion, title, eyebrow, h1, notes, keypad, generate(), view.*
       generate()  the test's skeleton, whatever the seed: fresh objects each call, each item and part known by its place
       view.*      what the unit's view returned for that call when the test was drawn (pub.calls, keyed by the function, the
                   item or part by its place, and the other arguments); a call that was not recorded returns '' and is
                   counted in Kit.ExamUnit.unknown, so a check fails on it
     Kit.ExamUnit.judge(J) → ui.js's judge with nothing to judge: the form label over a box is the one recorded (its
       skeleton's flab), and judging refuses — the site judges the test at Finish
   No judge, solution, walk, key, keyText, rungs or choices: there is nothing here to work an answer out from. */
(function(){
'use strict';
var K = window.Kit = window.Kit || {};
/* every view function the kit's page may call; key (the answer's HTML) is not one of them */
var VIEWS = ['stem', 'figure', 'line', 'pre', 'unit', 'placeholder', 'opt', 'form', 'boxes', 'pretty', 'mcLine', 'blank', 'why', 'start', 'ex', 'got', 'picture'];
var unknown = [];
function copy(o){ return o == null || typeof o !== 'object' ? o : JSON.parse(JSON.stringify(o)); }
function make(pub){
  var calls = pub.calls || {}, place = new WeakMap(), has = Object.prototype.hasOwnProperty;
  function part(sp, at){
    var o = copy(sp);
    if (o.kind === 'cgraph') o.graph = (o.cats || []).map(function(n){ return {name: n}; });   /* the names, no sizes */
    place.set(o, at); return o;
  }
  function generate(){
    return {sections: pub.skel.sections.map(function(s, si){ return {title: s.title, items: s.items.map(function(it, ii){
      var o = {type: it.type}, at = si + '.' + ii;
      if (it.type === 'parts') o.parts = it.parts.map(function(p, pi){ return part(p, at + '.' + pi); });
      else if (it.type === 'solo') o.part = part(it.part, at + '.-1');
      else o.opts = (it.opts || []).slice();
      place.set(o, at); return o; }) }; })};
  }
  function keyOf(f, args){
    return f + '|' + args.map(function(a){ if (a && typeof a === 'object'){ var p = place.get(a); return p == null ? '@?' : '@' + p; } return a === undefined ? 'u' : JSON.stringify(a); }).join('|');
  }
  var view = {};
  VIEWS.filter(function(f){ return !pub.views || pub.views.indexOf(f) >= 0; }).forEach(function(f){ view[f] = function(){   /* only those the unit has: the page asks some only when they exist */
    var k = keyOf(f, Array.prototype.slice.call(arguments));
    if (!has.call(calls, k)){ unknown.push(k); return ''; }
    if (calls[k].t) throw new Error('view.' + f);                 /* the unit's own view threw here; the page catches it as before */
    return copy(calls[k].r);
  }; });
  var keypad = pub.keypad == null ? null : pub.keypad.map(function(k){
    var o = {label: k.label}; if (k.say != null) o.say = k.say; if (k.tpl != null) o.tpl = k.tpl; if (k.kinds) o.kinds = k.kinds.slice();
    if (k.ins) o.ins = function(kind){ return has.call(k.ins, kind) ? k.ins[kind] : k.label; };
    return o; });
  return {id: pub.id, contentVersion: pub.cv, legacy: [], title: pub.title, eyebrow: pub.eyebrow, h1: pub.h1, notes: (pub.notes || []).slice(), keypad: keypad, generate: generate, view: view};
}
function judge(J){
  var refuse = function(){ throw new Error('the test is judged by the site'); };
  return Object.assign({}, J, {formOf: function(p){ return {label: (p && p.flab) || '', equiv: false, key: ''}; }, judge: refuse, atFinish: refuse, equivUp: refuse, equivBoxes: refuse, boxForm: refuse, boxKeys: function(){ return []; }});
}
K.ExamUnit = {make: make, judge: judge, unknown: unknown};
})();
