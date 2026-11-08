/* Practice-test kit — approvals (8 Nov 2026; Croix: "I don't want to edit the practice questions that generate, I just want to
   be able to approve or disapprove and be able to tweak tests a and b. Otherwise, I don't need that massive setup in the
   cockpit. It was very messy in there.").

   This replaces the edits layer of 7 Nov (kit README, "8 Nov 2026 — approve, and Tests A and B"). On a unit's teacher copy
   (teacher.js, Approve questions) the teacher approves or disapproves each kind of question of the practice test (a family:
   ui.js famKey, "solveAdd/graphAdd") and each lesson item from Cadence; every one is approved until he says otherwise. The
   site keeps the disapproved ones (the Worker's items.js: table item_edits, fields.hidden). This file reads that list and
   answers ui.js and bank.js:
     - a disapproved kind is left out of NEW practice sets, misses rounds and "Try a similar one", and out of new random
       test forms; a disapproved lesson item out of new lesson sets;
     - a set already saved on a device keeps its questions (ui.js S.eh; bank.js keeps a lesson set's items).
   On the site (/<course>/practice/unit-N/, /teacher/<course>/unit-N/practice/, or window.KIT_SITE_BASE in the checks) the page
   waits for GET /api/items/<course>/<unit> — at most 1.5 s; offline, the copy this device kept; a failure, nothing left out.
   Only `hidden: true` is read, from any answer and from any copy kept on a device (a copy kept on 7 Nov may still hold that
   day's wordings and the teacher's own questions: they are not used). Off the site nothing is fetched and nothing is left out. */
(function (root) {
'use strict';
var node = typeof module !== 'undefined' && module.exports;

/* ------------------------------------------------ the list: {family: {<famKey>: 1}, bank: {<item id>: 1}} */
var OFF = {family: {}, bank: {}};
/* the hidden rows of any answer or kept copy, and nothing else */
function rowsOf(d){
  var out = [];
  if (d && typeof d === 'object' && Array.isArray(d.edits)) d.edits.forEach(function(e){
    if (e && e.hidden === true && (e.target_kind === 'family' || e.target_kind === 'bank') && typeof e.target === 'string' && e.target && e.target.length <= 200)
      out.push({target_kind: e.target_kind, target: e.target, hidden: true});
  });
  return out;
}
function use(d){ OFF = {family: {}, bank: {}}; rowsOf(d).forEach(function(r){ OFF[r.target_kind][r.target] = 1; }); }
function any(){ return Object.keys(OFF.family).length > 0 || Object.keys(OFF.bank).length > 0; }
function hiddenFams(){ return Object.keys(OFF.family).sort(); }
function famHidden(fk){ return !!(fk && OFF.family[fk]); }
function bankHidden(id){ return !!(id && OFF.bank[id]); }
function set(kind, target, hidden){ if (!OFF[kind]) return; if (hidden) OFF[kind][target] = 1; else delete OFF[kind][target]; }
function rows(){ var out = []; ['family', 'bank'].forEach(function(k){ Object.keys(OFF[k]).sort().forEach(function(t){ out.push({target_kind: k, target: t, hidden: true}); }); }); return out; }

var api = {rowsOf: rowsOf, use: use, any: any, hiddenFams: hiddenFams, famHidden: famHidden, bankHidden: bankHidden, set: set, rows: rows};
if (node){ module.exports = api; return; }

/* ================================================ in the page */
var K = root.Kit = root.Kit || {}, U = root.Unit;
if (!U) return;
var M = /^([a-z]\d+)u(\d+)$/i.exec(U.id || ''), COURSE = M ? M[1].toLowerCase() : '', UNIT = M ? +M[2] : 0;
var BASE = typeof root.KIT_SITE_BASE === 'string' ? root.KIT_SITE_BASE.replace(/\/+$/, '') : null;
var ONSITE = BASE != null || /^\/(?:teacher\/)?(?:m7|a7)\/(?:practice\/)?unit-\d+\/(?:practice\/)?(?:index\.html)?$/.test(location.pathname || '');
var KEY = 'practice.edits.' + (U.id || '');               /* the name kept from 7 Nov 2026: a copy from then is read for its hidden rows only */
var waiting = null, ready = false;
function boot(){ ready = true; var w = waiting; waiting = null; if (w) w(); }
function keep(r){ try { localStorage.setItem(KEY, JSON.stringify({edits: r, custom: [], v: ''})); } catch(e){} }
function load(){
  try { use(JSON.parse(localStorage.getItem(KEY) || 'null')); } catch(e){}
  var done = false, finish = function(){ if (done) return; done = true; boot(); };
  var t = setTimeout(finish, 1500);                         /* never more than a moment's wait: offline, the device's copy (or nothing) */
  try {
    /* the teacher copy reads past the minute's cache, so a reload right after a change shows it */
    fetch((BASE || '') + '/api/items/' + COURSE + '/' + UNIT, {credentials: 'omit', cache: root.TEACHER_TEST ? 'no-store' : 'default'}).then(function(r){ return r.ok ? r.json() : null; }).then(function(d){
      if (d && Array.isArray(d.edits)){ use(d); keep(rowsOf(d)); }
      clearTimeout(t); finish();
    }, function(){ clearTimeout(t); finish(); });
  } catch(e){ clearTimeout(t); finish(); }
}
K.Approvals = {
  hold: function(fn){ if (ready) return false; waiting = fn; return true; },
  get ready(){ return ready; }, onSite: ONSITE, base: BASE || '', course: COURSE, unit: UNIT,
  any: any, hiddenFams: hiddenFams, famHidden: famHidden, bankHidden: bankHidden, rows: rows,
  /* the teacher copy, after its approve panel saved: this page and this device's copy follow at once */
  set: function(kind, target, hidden){ set(kind, target, hidden); keep(rows()); },
  use: function(d){ use(d); keep(rowsOf(d)); }
};
if (ONSITE && COURSE && UNIT) load(); else ready = true;
})(this);
