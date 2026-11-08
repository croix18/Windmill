/* Practice-test kit — the TEACHER copy (Croix, 19 Oct 2026: "I want to be able to print the test as well, not just make up
   tests" → "Separate teacher page"; 8 Nov 2026: "I don't want to edit the practice questions that generate, I just want to be
   able to approve or disapprove and be able to tweak tests a and b. Otherwise, I don't need that massive setup in the cockpit.
   It was very messy in there.").

   Loaded after the unit's scripts on a teacher build only; build.py adds kit/teacher.css. A teacher page carries the answer
   key in its source, so it is never linked for students; on the website it is behind the teacher password
   (/teacher/<course>/unit-N/practice/). Everything here is the teacher copy's: the student page has none of it.

   THE BAR: Form A | Form B · Print test · Test + key · Key only · Tests A and B · Approve questions, and one line: never share
   this page with students. ?open=tests or ?open=approve (the cockpit's links) opens one of the two at once.

   TESTS A AND B: the unit test's two forms, PINNED — kept on the site (GET/PUT /teacher/api/tests/<course>/<unit>, the Worker's
   tests.js, behind the password), so the same test prints from any computer, today or as a make-up next week.
     - A unit whose test is a random set of the practice page (ruling 49: TEACHER_TEST.random) pins two sets on first use, from
       two different seeds, with no disapproved kind (a place drawn again from another set where its kind is disapproved; a
       place with no approved kind at all is left off). A unit with the build's fixed paper (TEACHER_TEST.forms from unit.py,
       drawn with KaTeX) pins that paper.
     - The editor shows a form as it prints, and under each question: On the test (unticked: off both forms, the test and the
       key; the rest renumber, the points and the score tracker follow — the 2 Nov "Choose questions…" panel, now kept on the
       site; a pick kept on this browser then is moved there once), New version (random forms: that place drawn from another
       set — a key unlike this one and unlike the form's other questions, never a disapproved kind), Edit (that question's
       words, numbers and answer on that form: in place on the paper for a random form — cleaned to the kit's own markup, a
       graph or a choice's letter kept — and as TeX for the fixed paper, with the paper redrawn as it is typed), and Undo
       (back to the form's original). Each form has Start over. A pinned question whose kind has since been disapproved is
       flagged, with New version.
     - Printing — from the bar or the editor — is the pinned, tweaked form; its key is drawn from the same questions. The
       student's sheet never carries a set number (the student page opens any set with its worked answers); the key may.
     - Offline, or as a downloaded file: the last copy kept on this browser (or the build's own), and one line saying changes
       are only on this computer; back on the site, changes made offline go up if the site's copy has not changed since.

   APPROVE QUESTIONS: every kind of question of the practice test (a family) and every lesson item from Cadence, Approved |
   Disapproved, saved at once (PUT /teacher/api/items/<course>/<unit>/approval/<kind>/<target>, {approved}); approvals.js reads
   the list on every page. */
(function(){
'use strict';
var T = window.TEACHER_TEST; if (!T) return;
var LET = 'ABCDEFGH', FIXED = !T.random, FORMS = FIXED ? Object.keys(T.forms) : ['A', 'B'];
function esc(s){ return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function own(o, k){ return !!o && typeof o === 'object' && Object.prototype.hasOwnProperty.call(o, k); }
function qidOf(k){ return 'U' + T.unit + '·' + (k + 1); }      /* the speakable ID: the question's place in the whole test, never renumbered */

/* ================================================ the fixed paper — a pure part (check/teacher_check.js runs it in Node)
   Form A / Form B (ruling 33; an older unit has one "test"): stems and answers are TeX, drawn by KaTeX (inlined by the build);
   figures are the paper's own shape specs drawn as SVG. A form is drawn with a spec's choices: the questions left off, and the
   form's edits — the TeX of a question's words, each part's words and answer, its choices and which is right. An answer
   changed drops that part's printed notes (why, error notes) from the key. */
var errors = [];
function tex(s){                                          /* "text $math$ text" → html; the math by KaTeX */
  return String(s == null ? '' : s).split('$').map(function(seg, k){
    if (!(k % 2)) return esc(seg).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
    try { return katex.renderToString('\\displaystyle ' + seg, {throwOnError: true, strict: 'ignore', output: 'html'}); }
    catch(e){ errors.push([seg, String(e.message || e)]); return '<code>' + esc(seg) + '</code>'; }
  }).join('');
}
var POSF = [];                                            /* the paper's places: [{k, si, ii, title, benchmark}] — the forms share them */
if (FIXED) T.forms[FORMS[0]].forEach(function(sec, si){ sec.items.forEach(function(it, ii){ POSF.push({k: POSF.length, si: si, ii: ii, title: sec.title, benchmark: sec.benchmark}); }); });
function sameArr(a, b){ return JSON.stringify(a) === JSON.stringify(b); }
function applyFixed(it, e){
  var c = JSON.parse(JSON.stringify(it));
  if (typeof e.stem === 'string') c.stem = e.stem;
  if (c.parts){
    (Array.isArray(e.parts) ? e.parts : []).forEach(function(x, i){
      var p = c.parts[i]; if (!p || !x || typeof x !== 'object') return;
      if (typeof x.stem === 'string') p.stem = x.stem;
      if (typeof x.answer === 'string' && x.answer !== p.answer){ p.answer = x.answer; p.why = ''; }
      if (p.choices && Array.isArray(x.choices) && x.choices.length === p.choices.length && !sameArr(x.choices, p.choices)){ p.choices = x.choices.map(String); p.why = ''; }
      if (p.choices && Array.isArray(x.correct) && x.correct.length && !sameArr(x.correct, p.correct)){ p.correct = x.correct.slice(); p.why = ''; }
    });
  } else if (c.choices){
    if (Array.isArray(e.choices) && e.choices.length === c.choices.length && !sameArr(e.choices, c.choices)){ c.choices = e.choices.map(String); c.why = ''; c.errors = {}; }
    if (Array.isArray(e.correct) && e.correct.length && !sameArr(e.correct, c.correct)){ c.correct = e.correct.slice(); c.why = ''; c.errors = {}; }
  } else if (typeof e.answer === 'string' && e.answer !== c.answer){ c.answer = e.answer; c.why = ''; }
  return c;
}
function fq(spec, f, k){ var F = spec && spec.forms && spec.forms[f]; return F && own(F.q, k) ? F.q[k] : null; }
function onTest(spec, k){ return !(spec && spec.pick && spec.pick[k] === false); }
function fixedAt(f, k, spec){ var p = POSF[k], sec = T.forms[f] && T.forms[f][p.si], it = sec && sec.items[p.ii]; if (!it) return null; var q = fq(spec, f, k); return q && q.ed ? applyFixed(it, q.ed) : it; }
function fixedSecs(f, spec, editor){
  var secs = [];
  POSF.forEach(function(p){
    var on = onTest(spec, p.k), it; if (!on && !editor) return; it = fixedAt(f, p.k, spec); if (!it) return;
    var s = secs[secs.length - 1]; if (!s || s.si !== p.si) secs.push(s = {si: p.si, title: p.title, benchmark: p.benchmark, items: [], points: 0});
    s.items.push({k: p.k, it: it, out: !on}); if (on) s.points += it.parts ? it.parts.length : 1;
  });
  return secs;
}
function total(f, spec){ return fixedSecs(f, spec, false).reduce(function(t, s){ return t + s.points; }, 0); }
function formWord(f){ return f === 'test' ? '' : 'Form ' + f; }
function head(f, key, spec){
  var sub = [formWord(f), total(f, spec) + ' points', key ? 'ANSWER KEY' : T.two_day ? 'two class periods' : ''].filter(Boolean).join(' · ');   /* ruling 51: an empty two_day is a one-period test, which says nothing about its length (Croix, 25 Oct 2026: "I don't need that text at all") */
  return '<div class="phead"><div class="pt1 ptest">' + esc(T.course + ' Unit ' + T.unit + ' Test') + '</div><div class="pt2">' + esc(T.title) + ' · ' + esc(sub) + '</div>' +
    (key ? '' : '<div class="pname">Name:<span class="pline"></span>Date:<span class="pline short"></span>Period:<span class="pline short"></span></div>') + '</div>';   /* the paper's Name, Date and Period (ruling 54) */
}
function work(inches){ return '<div class="pwork" style="height:' + (Math.max(0.4, +inches || 0.6) * 0.9).toFixed(2) + 'in"></div>'; }
function choices(c, multi){
  return '<div class="pchoices">' + c.choices.map(function(x, k){ return '<div class="pch"><span class="pbox' + (multi ? ' sq' : '') + '"></span><span class="cl">' + LET[k] + '.</span><span class="cv">' + tex(x) + '</span></div>'; }).join('') + '</div>';
}
/* one question of the paper, numbered qn, at place k (work space and no answer line, as the paper: house rule 2) */
function qHtml(it, qn, k){
  var q = '<div class="pq" data-k="' + k + '"><div class="pqh"><div class="pqid" translate="no"><span class="qn">' + qidOf(k) + '</span></div><div class="stem"><b class="num">' + qn + '.</b><span class="st">' + tex(it.stem) + '</span>' + (it.parts ? '' : '<span class="pt">1 pt</span>') + '</div>' + (it.fig || '') + '</div>';
  if (it.parts) it.parts.forEach(function(p, pi){ q += '<div class="ppart" data-p="' + pi + '"><div class="line"><b class="lab">' + esc(p.label) + '.</b><span class="st">' + tex(p.stem) + '</span><span class="pt">1 pt</span></div>' + (p.choices ? choices(p, false) : work(p.space)) + '</div>'; });   /* a part may have choices (2 Nov 2026) */
  else if (it.choices) q += '<div class="ppart" data-p="0">' + choices(it, it.multi) + '</div>';
  else q += '<div class="ppart" data-p="0">' + work(it.space) + '</div>';
  return q + '</div>';
}
/* the test; in the editor (editor true) a question left off keeps an empty place, .pqout, for its row */
function testHtml(f, spec, editor){
  var h = [head(f, false, spec)], qn = 0;
  h.push('<p class="pnotes">' + (T.two_day ? '<span class="pinote">' + esc(T.two_day) + '</span>' : '') + (T.notes || []).map(function(n){ return '<span class="pinote">' + esc(n) + '</span>'; }).join('') + '</p>');
  fixedSecs(f, spec, editor).forEach(function(sec){
    h.push('<h2 class="psec" data-si="' + sec.si + '">' + esc(sec.title) + (sec.points ? '<span class="ppts">' + sec.points + ' points</span>' : '') + '</h2>');   /* ruling 54: named, never numbered */
    sec.items.forEach(function(d){ if (d.out){ h.push('<div class="pq pqout" data-k="' + d.k + '"></div>'); return; } qn++; h.push(qHtml(d.it, qn, d.k)); });
  });
  return h.join('');
}
/* a part's answer on the key: a choice's letters (and words), else the answer's TeX */
function ansHtml(it, p){
  var ch = it.choices ? it : p.choices ? p : null;
  return ch ? ch.correct.map(function(c){ return '<b>' + LET[c] + '.</b> ' + tex(ch.choices[c]); }).join('&nbsp;&nbsp; ') : tex(p.answer);
}
function keyHtml(f, spec){
  var rows = [], qn = 0, byBm = {};
  fixedSecs(f, spec, false).forEach(function(sec){ sec.items.forEach(function(d){
    var it = d.it; qn++; var units = it.parts || [it];
    byBm[sec.benchmark] = byBm[sec.benchmark] || {qs: [], pts: 0}; byBm[sec.benchmark].qs.push(qn); byBm[sec.benchmark].pts += units.length;
    units.forEach(function(p, pi){
      var lab = qn + (it.parts ? p.label : '');
      var why = (it.transfer && pi === 0 ? '<div class="kflag">' + esc(T.transfer_flag) + '</div>' : '') + (p.why ? '<div class="kwhy">' + tex(p.why) + '</div>' : '') +
        (it.errors && Object.keys(it.errors).length ? '<div class="kerr">' + Object.keys(it.errors).map(function(L){ return '<b>' + L + '</b> ' + tex(it.errors[L]); }).join('<br>') + '</div>' : '');
      rows.push('<tr><td class="pk">' + lab + '</td><td class="kv">' + ansHtml(it, p) + why + '</td><td class="pid">' + qidOf(d.k) + '</td></tr>');
    });
  }); });
  var tracker = '<div class="ptrk"><h2 class="psec">Score tracker</h2><table class="ptab ptrack"><thead><tr><th>Benchmark</th><th>Questions</th><th>Possible</th><th>Earned</th></tr></thead><tbody>' +
    (T.tracker_order || Object.keys(T.tracker)).map(function(bm){ var b = byBm[bm] || {qs: [], pts: 0}; return '<tr><td>' + esc(bm) + '</td><td>' + b.qs.join(', ') + '</td><td>' + b.pts + '</td><td></td></tr>'; }).join('') +
    '<tr><td><b>Total</b></td><td></td><td><b>' + total(f, spec) + '</b></td><td></td></tr></tbody></table></div>';   /* no follow-through line (7 Nov 2026, Croix) */
  return '<div class="pkey">' + head(f, true, spec) + (T.follow_through_key ? '<p class="pmeta kft">' + esc(T.follow_through_key) + '</p>' : '') + '<table class="ptab"><tbody>' + rows.join('') + '</tbody></table>' + tracker + '</div>';
}

/* what the checks and the page's other parts read; filled in as the page mounts */
var SPEC = null;
var API = window.TEACHER = {random: !FIXED, forms: FORMS, errors: errors,
  testHtml: function(f){ return FIXED ? testHtml(f, SPEC, false) : ''; }, keyHtml: function(f){ return FIXED ? keyHtml(f, SPEC) : ''; },
  spec: function(){ return SPEC; }};

/* ================================================ the page */
(function boot(tries){
  if (!window.PracticeKit || !window.Unit || !document.querySelector('.sheet') || (FIXED && !window.katex)){ if ((tries || 0) < 400) setTimeout(function(){ boot((tries || 0) + 1); }, 25); return; }
  mount(window.PracticeKit);
})(0);

function mount(PK){
var K = window.Kit || {}, AP = K.Approvals || null, Unit = window.Unit, V = Unit.view, NL = K.NL;
var ONSITE = !!(AP && AP.onSite), BASE = AP ? AP.base : '', COURSE = (AP && AP.course) || String(T.course).toLowerCase(), UNITN = (AP && AP.unit) || T.unit;
var API_T = BASE + '/teacher/api/tests/' + COURSE + '/' + UNITN, API_I = BASE + '/teacher/api/items/' + COURSE + '/' + UNITN;
var LKEY = 'teacher.tests.' + COURSE + '.' + UNITN, PICK_KEY = 'teacher.pick.' + T.course + '.' + T.unit;
var $ = function(id){ return document.getElementById(id); };
function plain(h){ var d = document.createElement('div'); d.innerHTML = h; return d.textContent.replace(/\s+/g, ' ').trim(); }
function fnv(s){ return K.fnv1a ? K.fnv1a(s).toString(36) : String(s.length); }

/* ---- the practice page's places ([{k, si, ii, title}]) — the kinds of question; and for a random unit the test's too */
var PP = []; Unit.generate(1).sections.forEach(function(sec, si){ sec.items.forEach(function(it, ii){ PP.push({k: PP.length, si: si, ii: ii, title: sec.title}); }); });
var TP = FIXED ? POSF : PP;
var CV = FIXED ? fnv(JSON.stringify(T.forms)) : String(Unit.contentVersion == null ? '' : Unit.contentVersion);
var GEN = {}, GENQ = [];
function gen(s){ if (!GEN[s]){ GEN[s] = Unit.generate(s); GENQ.push(s); if (GENQ.length > 80) delete GEN[GENQ.shift()]; } return GEN[s]; }
function rawAt(s, k){ var p = PP[k], sec = gen(s).sections[p.si]; return sec ? sec.items[p.ii] : null; }
function famOff(it){ return !!(AP && it && AP.famHidden(PK.famKey(it))); }
function randSeed(){ var a = new Uint32Array(1); try { crypto.getRandomValues(a); } catch(e){ a[0] = Math.floor(Math.random() * 4294967296); } return 1 + (a[0] % 99999); }
function okSeed(s){ return typeof s === 'number' && s >= 1 && s <= 99999 && Math.floor(s) === s; }
function okK(k){ return /^\d{1,2}$/.test(String(k)) && +k < TP.length; }

/* ---- the kit's own markup (8 Nov 2026): what a tweak on a random form may hold — span, i, b, sup, sub and br, each with a class
   and nothing else. No style, no handler, no link, no role or aria-label (a tweaked number would make a math span's spoken label
   wrong); a pasted block is a new line; script, style and the like go with what is inside them. On every save and every draw. */
var OKTAG = {SPAN: 1, I: 1, B: 1, SUP: 1, SUB: 1, BR: 1}, DROP = {SCRIPT: 1, STYLE: 1, TEMPLATE: 1, TEXTAREA: 1, NOSCRIPT: 1, TITLE: 1, IFRAME: 1, OBJECT: 1, EMBED: 1, SVG: 1, MATH: 1, HEAD: 1, LINK: 1, META: 1, IMG: 1, VIDEO: 1, AUDIO: 1, CANVAS: 1, INPUT: 1, BUTTON: 1, SELECT: 1, FORM: 1};
function clean(html){
  var t = document.createElement('template'); t.innerHTML = String(html == null ? '' : html).slice(0, 20000);
  var out = document.createElement('div');
  (function walk(from, to){
    Array.prototype.forEach.call(from.childNodes, function(n){
      if (n.nodeType === 3){ to.appendChild(document.createTextNode(n.nodeValue)); return; }
      if (n.nodeType !== 1) return;
      var tag = String(n.tagName).toUpperCase();
      if (DROP[tag]) return;
      if (!OKTAG[tag]){ if ((tag === 'DIV' || tag === 'P' || tag === 'LI') && to.childNodes.length) to.appendChild(document.createElement('br')); walk(n, to); return; }
      var e = document.createElement(tag.toLowerCase()), cls = String(n.getAttribute('class') || '').split(/\s+/).filter(function(c){ return /^[a-z][a-z0-9-]{0,23}$/i.test(c); }).join(' ');
      if (cls) e.setAttribute('class', cls);
      if (tag !== 'BR') walk(n, e);
      to.appendChild(e);
    });
  })(t.content, out);
  return out.innerHTML.replace(/^(?:\s|<br>)+|(?:\s|<br>)+$/g, '');
}

/* ================================================ the spec: {v: 1, kind, cv, pick: [bool], forms: {A, B}}
   random: a form is {seed, base: {k: seed}, q: {k: {seed?, ed?}}} — base, the places pinned from another set because their kind
   was disapproved (the original); q, the teacher's tweaks: a New version's seed, an edit {stem, line: {a}, key: {a}, opt: {a: []}}
   (kit markup; '' is a question with no lettered parts). fixed: a form is {q: {k: {ed: {stem, answer, choices, correct, parts:
   [{stem, answer, choices, correct}]}}}} (TeX). k is the question's place in the whole test, from 0. */
function edRandom(e){
  if (!e || typeof e !== 'object') return null;
  var o = {}, lab = /^[a-h]?$/;
  if (typeof e.stem === 'string') o.stem = clean(e.stem);
  ['line', 'key'].forEach(function(w){ if (e[w] && typeof e[w] === 'object'){ var m = {}; Object.keys(e[w]).forEach(function(l){ if (lab.test(l) && typeof e[w][l] === 'string') m[l] = clean(e[w][l]); }); if (Object.keys(m).length) o[w] = m; } });
  if (e.opt && typeof e.opt === 'object'){ var m2 = {}; Object.keys(e.opt).forEach(function(l){ if (lab.test(l) && Array.isArray(e.opt[l]) && e.opt[l].length <= 8) m2[l] = e.opt[l].map(function(h){ return typeof h === 'string' ? clean(h) : null; }); }); if (Object.keys(m2).length) o.opt = m2; }
  return Object.keys(o).length ? o : null;
}
function edFixed(e){
  if (!e || typeof e !== 'object') return null;
  var o = {}, str = function(x){ return typeof x === 'string' && x.length <= 2000; }, ints = function(a){ return Array.isArray(a) && a.length && a.length <= 8 && a.every(function(x){ return x === (x | 0) && x >= 0 && x < 8; }); };
  if (str(e.stem)) o.stem = e.stem;
  if (str(e.answer)) o.answer = e.answer;
  if (Array.isArray(e.choices) && e.choices.length <= 8 && e.choices.every(str)) o.choices = e.choices.slice();
  if (ints(e.correct)) o.correct = e.correct.slice();
  if (Array.isArray(e.parts) && e.parts.length <= 8) o.parts = e.parts.map(function(x){ var p = {}; if (!x || typeof x !== 'object') return null; if (str(x.stem)) p.stem = x.stem; if (str(x.answer)) p.answer = x.answer; if (Array.isArray(x.choices) && x.choices.length <= 8 && x.choices.every(str)) p.choices = x.choices.slice(); if (ints(x.correct)) p.correct = x.correct.slice(); return Object.keys(p).length ? p : null; });
  return Object.keys(o).length ? o : null;
}
/* a spec read from the site or this browser, checked and cleaned (the kit cleans again here, whatever the Worker let through) */
function normSpec(s){
  if (!s || typeof s !== 'object' || s.v !== 1 || s.kind !== (FIXED ? 'fixed' : 'random') || !s.forms || typeof s.forms !== 'object') return null;
  var o = {v: 1, kind: s.kind, cv: String(s.cv == null ? '' : s.cv).slice(0, 40), pick: TP.map(function(p){ return !(Array.isArray(s.pick) && s.pick[p.k] === false); }), forms: {}};
  FORMS.forEach(function(f){
    var F = s.forms[f] && typeof s.forms[f] === 'object' ? s.forms[f] : null, out = {q: {}};
    if (!FIXED){
      if (!F || !okSeed(F.seed)){ out = null; return; }
      out.seed = F.seed; out.base = {};
      Object.keys(F.base && typeof F.base === 'object' ? F.base : {}).forEach(function(k){ if (okK(k) && okSeed(F.base[k])) out.base[k] = F.base[k]; });
    }
    Object.keys(F && F.q && typeof F.q === 'object' ? F.q : {}).forEach(function(k){
      var q = F.q[k], v = {}; if (!okK(k) || !q || typeof q !== 'object') return;
      if (!FIXED && okSeed(q.seed)) v.seed = q.seed;
      var e = q.ed ? (FIXED ? edFixed(q.ed) : edRandom(q.ed)) : null; if (e) v.ed = e;
      if (v.seed || v.ed) out.q[k] = v;
    });
    o.forms[f] = out;
  });
  FORMS.forEach(function(f){ if (!o.forms[f]) o.forms[f] = pinRandom(FORMS.filter(function(g){ return o.forms[g]; }).map(function(g){ return o.forms[g].seed; }), o.pick); });
  return o;
}

/* ---- a random form: which set each place comes from, its question, its keys */
function srcOf(F, k){ var q = F.q && F.q[k]; return q && q.seed ? q.seed : F.base && F.base[k] ? F.base[k] : F.seed; }
function withEd(it, ed){
  var c = Object.assign({}, it);
  if (it.parts) c.parts = it.parts.map(function(p){ return Object.assign({}, p); });
  if (it.part) c.part = Object.assign({}, it.part);
  if (typeof ed.stem === 'string') c._est = clean(ed.stem);
  PK.partsOf(c).forEach(function(p){
    var lab = c.type === 'parts' ? p.label : '', choice = p.kind === 'mc' || c.type === 'mc' || c.type === 'multi';
    if (ed.line && typeof ed.line[lab] === 'string') p._eln = clean(ed.line[lab]);
    if (ed.key && typeof ed.key[lab] === 'string' && p.kind !== 'nline' && !choice) p._ekey = clean(ed.key[lab]);
    if (ed.opt && Array.isArray(ed.opt[lab]) && choice) p._eopt = ed.opt[lab].map(function(h){ return typeof h === 'string' ? clean(h) : null; });
  });
  return c;
}
function itemOf(F, k){ var it = rawAt(srcOf(F, k), k), q = F.q && F.q[k]; return it && q && q.ed ? withEd(it, q.ed) : it; }
/* what a question's answers are, to tell two apart: each part's typed key, a graph, a choice's words */
function keysOf(it){
  if (!it) return [];
  return PK.partsOf(it).map(function(p){ try {
    if (p.kind === 'nline') return 'g:' + NL.keyText(NL.graphOf(p));
    if (it.type === 'mc' || p.kind === 'mc') return 'c:' + plain(V.opt(p, p.correct));
    if (it.type === 'multi') return 'm:' + p.correct.map(function(c){ return plain(V.opt(p, c)); }).sort().join('|');
    return 't:' + String(Unit.keyText(p)).replace(/\s+/g, '');
  } catch(e){ return ''; } }).filter(Boolean);
}
function sameQ(it){ return PK.partsOf(it).map(function(p){ return Unit.key(p); }).join('|'); }
/* a set to draw place k from: an approved kind, not this question, a key unlike this one's and unlike the form's others */
function drawAt(F, k, pick){
  var cur = itemOf(F, k), curK = keysOf(cur), curQ = cur ? sameQ(cur) : '', others = [];
  TP.forEach(function(p){ if (p.k !== k && pick[p.k] !== false) others = others.concat(keysOf(itemOf(F, p.k))); });
  for (var t = 0; t < 400; t++){
    var s = randSeed(); if (s === F.seed || s === srcOf(F, k)) continue;
    var it = rawAt(s, k); if (!it || famOff(it) || sameQ(it) === curQ) continue;
    var ks = keysOf(it);
    if (ks.some(function(x){ return curK.indexOf(x) >= 0 || others.indexOf(x) >= 0; })) continue;
    return s;
  }
  return 0;
}
/* a new pinned random form: a seed unlike the other form's, every disapproved place drawn again (pick false: no approved kind there) */
function pinRandom(avoid, pick){
  var s, g = 0; do { s = randSeed(); } while (avoid.indexOf(s) >= 0 && g++ < 50);
  var F = {seed: s, base: {}, q: {}};
  TP.forEach(function(p){
    if (!famOff(rawAt(s, p.k))) return;
    var alt = drawAt(F, p.k, pick); if (alt) F.base[p.k] = alt; else if (!approvedAt(p.k)) pick[p.k] = false;
  });
  return F;
}
var KINDSAT = {};
function kindsAt(k){ if (KINDSAT[k]) return KINDSAT[k]; var out = []; for (var s = 1; s <= 160; s++){ var f = PK.famKey(rawAt(s, k)); if (out.indexOf(f) < 0) out.push(f); } return (KINDSAT[k] = out); }
function approvedAt(k){ return kindsAt(k).some(function(f){ return !(AP && AP.famHidden(f)); }); }
function freshSpec(){
  var s = {v: 1, kind: FIXED ? 'fixed' : 'random', cv: CV, pick: TP.map(function(){ return true; }), forms: {}};
  if (FIXED){
    /* the 2 Nov leave-out, kept on this browser then (Croix: "Can I get the opportunity to edit which test questions get printed on
       the test"): moved to the site once */
    try { var lp = JSON.parse(localStorage.getItem(PICK_KEY) || 'null'); if (Array.isArray(lp) && lp.length === TP.length){ s.pick = lp.map(function(x){ return x !== false; }); s.migrated = true; } } catch(e){}
    FORMS.forEach(function(f){ s.forms[f] = {q: {}}; });
  } else {
    s.forms.A = pinRandom([], s.pick);
    s.forms.B = pinRandom([s.forms.A.seed], s.pick);
  }
  return s;
}
function changedOn(f){ var F = SPEC.forms[f], n = 0; TP.forEach(function(p){ if (SPEC.pick[p.k] === false) return; var q = F.q[p.k]; if ((q && (q.seed || q.ed)) || (!FIXED && srcOf(F, p.k) !== F.seed)) n++; }); return n; }
/* a form drawn: the paper (editor: with the empty places of the questions left off) and its key */
function draw(f, editor){
  if (FIXED) return {test: testHtml(f, SPEC, editor), key: keyHtml(f, SPEC), points: total(f, SPEC)};
  var F = SPEC.forms[f], secs = [];
  TP.forEach(function(p){
    var on = SPEC.pick[p.k] !== false; if (!on && !editor) return;
    var s = secs[secs.length - 1]; if (!s || s.si !== p.si) secs.push(s = {title: esc(p.title), si: p.si, items: []});
    s.items.push({it: itemOf(F, p.k), keep: null, si: p.si, ii: p.ii, k: p.k, out: !on});
  });
  var n = changedOn(f);
  return PK.form(secs, {label: 'Test', form: f, meta: 'Set ' + F.seed + ' · Whole test' + (n ? ' · ' + n + (n === 1 ? ' question' : ' questions') + ' changed' : '')});
}
function nOn(){ return SPEC.pick.filter(function(x){ return x !== false; }).length; }

/* ================================================ the site, and this browser's copy */
var MODE = '', SITE_UPDATED = null, READY = false, QUEUE = [];
function local(){ try { return JSON.parse(localStorage.getItem(LKEY) || 'null'); } catch(e){ return null; } }
var LOST = false;                                           /* changes made here offline that the site's newer copy replaced */
function keepLocal(dirty){ try { localStorage.setItem(LKEY, JSON.stringify({spec: SPEC, base: SITE_UPDATED, dirty: !!dirty})); } catch(e){} }
function call(method, url, body){
  return fetch(url, {method: method, credentials: 'same-origin', cache: 'no-store', headers: body ? {'content-type': 'application/json'} : {}, body: body ? JSON.stringify(body) : undefined})
    .then(function(r){ return r.json().catch(function(){ return null; }).then(function(j){ return {ok: r.ok, status: r.status, j: j}; }); });
}
function whenReady(fn){ if (READY) fn(); else QUEUE.push(fn); }
function ready(mode){ MODE = mode; READY = true; paintBar(); var q = QUEUE; QUEUE = []; q.forEach(function(fn){ fn(); }); }
function fromLocal(mode){ var L = local(), s = L && normSpec(L.spec); if (s && L.base) SITE_UPDATED = L.base; SPEC = s || freshSpec(); if (!s) keepLocal(true); ready(mode); }   /* the site's version it came from stays with it, for the way back */
function load(){
  if (!ONSITE){ fromLocal('local'); return; }
  var timer = setTimeout(function(){ if (!READY) fromLocal('offline'); }, 5000);
  call('GET', API_T).then(function(r){
    clearTimeout(timer); if (READY) return;
    if (!(r.ok && r.j && r.j.store !== false && 'spec' in r.j)){ fromLocal(r.status === 401 ? 'signedout' : 'offline'); return; }
    SITE_UPDATED = r.j.updated || null;
    var L = local(), mine = L && L.dirty && (L.base || null) === SITE_UPDATED ? normSpec(L.spec) : null, theirs = r.j.spec ? normSpec(r.j.spec) : null;
    if (mine){ SPEC = mine; ready('site'); save(); }                 /* changes made here offline, and the site's copy unchanged since: they go up */
    else if (theirs){ LOST = !!(L && L.dirty && L.spec); SPEC = theirs; keepLocal(false); ready('site'); }   /* the site's copy changed elsewhere since: it wins, and the bar says so */
    else { SPEC = freshSpec(); ready('site'); save(); }              /* the first use: pinned now */
  }, function(){ clearTimeout(timer); if (!READY) fromLocal('offline'); });
}
var SAVING = 0;
function save(){
  var mig = !!SPEC.migrated; delete SPEC.migrated;
  keepLocal(true);
  if (MODE !== 'site'){ status('Saved on this computer'); return; }
  var n = ++SAVING; status('Saving…');
  call('PUT', API_T, SPEC).then(function(r){
    if (n !== SAVING) return;
    if (r.ok && r.j && r.j.updated){ SITE_UPDATED = r.j.updated; keepLocal(false); status('Saved'); if (mig) try { localStorage.removeItem(PICK_KEY); } catch(e){} }
    else status(r.status === 401 ? 'Signed out — saved on this computer' : 'Couldn’t save — try again', true);
  }, function(){ if (n === SAVING) status('Couldn’t save — try again', true); });
}

/* ================================================ the bar */
var FORM = FORMS[0], bar = document.createElement('div');
bar.className = 'teacherbar'; bar.setAttribute('translate', 'no'); bar.setAttribute('role', 'region'); bar.setAttribute('aria-label', 'Teacher copy');
var TESTS_LABEL = FORMS.length > 1 ? 'Tests A and B' : 'Edit test';
bar.innerHTML = '<p class="tbtxt"><b>Teacher copy</b> · Never share this page with students.</p>' +
  '<div class="tbrow"><div class="tbgrp">' +
  (FORMS.length > 1 ? '<div class="tbseg" role="radiogroup" aria-label="Which form">' + FORMS.map(function(f, i){ return '<button type="button" role="radio" data-form="' + f + '" aria-checked="' + (i === 0) + '" tabindex="' + (i === 0 ? 0 : -1) + '">' + esc(formWord(f)) + '</button>'; }).join('') + '</div>' : '') +
  '<button type="button" class="go" data-tprint="test">Print test</button><button type="button" data-tprint="tk">Test + key</button><button type="button" data-tprint="key">Key only</button></div>' +
  '<div class="tbgrp"><button type="button" data-topen="tests" aria-haspopup="dialog">' + TESTS_LABEL + '</button><button type="button" data-topen="approve" aria-haspopup="dialog">Approve questions</button></div></div>' +
  '<p class="tbnote" id="tbNote" hidden></p>';
var sheet = document.querySelector('.sheet'); if (sheet) sheet.insertBefore(bar, sheet.firstChild);
document.title = T.course + ' Unit ' + T.unit + ' — Teacher copy';
function setForm(f){ if (FORMS.indexOf(f) < 0) return; FORM = f; Array.prototype.forEach.call(bar.querySelectorAll('[data-form]'), function(b){ var on = b.dataset.form === f; b.setAttribute('aria-checked', String(on)); b.tabIndex = on ? 0 : -1; }); }
function noteLine(){
  if (!READY) return '';
  if (MODE !== 'site') return 'Changes are only on this computer.';
  if (LOST) return 'Changes made here offline were not kept: the test was changed on another computer.';
  if (SPEC && SPEC.cv !== CV) return 'This unit was rebuilt after Tests A and B were pinned: look them over.';
  return '';
}
function paintBar(){ var n = $('tbNote'), t = noteLine(); n.textContent = t; n.hidden = !t; }
bar.addEventListener('click', function(e){
  var b = e.target.closest('button'); if (!b) return;
  if (b.dataset.form){ setForm(b.dataset.form); return; }
  if (b.dataset.tprint){ var k = b.dataset.tprint; whenReady(function(){ showPrint(k, FORM, b, null); }); return; }
  if (b.dataset.topen === 'tests') whenReady(function(){ openTests(FORM, b); });
  if (b.dataset.topen === 'approve') openApprove(b);
});
bar.addEventListener('keydown', function(e){
  var b = e.target.closest && e.target.closest('[data-form]'); if (!b) return;
  var all = Array.prototype.slice.call(bar.querySelectorAll('[data-form]')), i = all.indexOf(b), j = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? (i + 1) % all.length : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? (i + all.length - 1) % all.length : -1;
  if (j < 0) return; e.preventDefault(); setForm(all[j].dataset.form); all[j].focus();
});

/* ================================================ overlays: the kit's #printview — a print preview (body.printing), or the teacher's
   panels (body.tview, the page's own theme). Escape closes (an edit first, a confirm first); focus goes back to what opened it. */
var OV = null;
function overlay(kind, label, opener){
  var pv = $('printview'); if (!pv){ pv = document.createElement('div'); pv.id = 'printview'; document.body.appendChild(pv); }
  pv.setAttribute('role', 'dialog'); pv.setAttribute('aria-modal', 'true'); pv.setAttribute('aria-label', label); pv.setAttribute('translate', 'no');
  pv.className = kind === 'print' ? '' : 'tv tv-' + kind;
  document.body.classList.toggle('printing', kind === 'print'); document.body.classList.toggle('tview', kind !== 'print');
  pv.hidden = false; window.scrollTo(0, 0);
  OV = {kind: kind, opener: opener || (OV && OV.opener) || null, pv: pv};
  return pv;
}
function closeOverlay(){
  var pv = $('printview'), o = OV; OV = null; EDIT = null;
  if (pv){ pv.hidden = true; pv.innerHTML = ''; pv.className = ''; }
  document.body.classList.remove('printing'); document.body.classList.remove('tview');
  var to = o && o.opener; if (to && document.body.contains(to)) to.focus(); else { var b = bar.querySelector('button'); if (b) b.focus(); }
}
window.addEventListener('keydown', function(e){
  if (e.key !== 'Escape' || !OV) return;
  e.stopPropagation(); e.preventDefault();
  if (OV.kind === 'tests' && $('tvConfirm') && !$('tvConfirm').hidden){ confirmOff(); return; }
  if (OV.kind === 'tests' && EDIT){ EDIT = null; paintTests(); return; }
  if (OV.back) OV.back(); else closeOverlay();
}, true);
function status(t, bad){
  var s = OV && OV.pv.querySelector('.tvst'); if (!s) return;
  s.textContent = t; s.classList.toggle('bad', !!bad);
  clearTimeout(status.t); if (!bad && /^Saved/.test(t)) status.t = setTimeout(function(){ if (s.textContent === t) s.textContent = ''; }, 2600);
}

/* ---- print: the pinned form as the paper, the test, the test with its key, or the key alone */
function showPrint(kind, f, opener, back){
  var r = draw(f, false), body;
  if (FIXED) body = kind === 'key' ? r.key : r.test + (kind === 'tk' ? '<div class="pbreak"></div>' + r.key : '');
  else body = kind === 'key' ? '<div class="pform pkeyform tpage">' + r.key + '</div>' : '<div class="pform tpage" data-form="' + f + '">' + r.test + '</div>' + (kind === 'tk' ? '<div class="pbreak"></div><div class="pform pkeyform tpage">' + r.key + '</div>' : '');
  var pv = overlay('print', 'Print preview', opener);
  OV.back = back || null;
  pv.innerHTML = '<div class="pbar"><button type="button" class="go" id="pvPrint">Print</button><button type="button" id="pvClose">' + (back ? 'Back' : 'Close') + '</button><span class="pvhint">If nothing happens, use your browser’s Print (Ctrl + P).</span></div><div class="ppage' + (FIXED ? ' tpage' : '') + '">' + body + '</div>';
  $('pvPrint').onclick = function(){ try { window.print(); } catch(e){} };
  $('pvClose').onclick = function(){ if (back) back(); else closeOverlay(); };
  $('pvPrint').focus();
}

/* ================================================ Tests A and B */
var EF = FORMS[0], EDIT = null;
function openTests(f, opener){
  EF = f || EF; EDIT = null;
  var pv = overlay('tests', FORMS.length > 1 ? 'Tests A and B' : 'The test', opener);
  pv.innerHTML = '<div class="tvbar"><div class="tvtop">' +
    (FORMS.length > 1 ? '<div class="tvtabs" role="tablist" aria-label="Forms">' + FORMS.map(function(g){ return '<button type="button" role="tab" id="tvTab' + g + '" data-tvform="' + g + '" aria-controls="tvPaper">' + esc(formWord(g)) + '</button>'; }).join('') + '</div>' : '<h2 class="tvh">The test</h2>') +
    '<span class="tvsum" id="tvSum"></span><span class="tvst" role="status" aria-live="polite"></span>' +
    '<span class="tvacts"><button type="button" data-tv="print">Print</button><button type="button" class="go" data-tv="done">Done</button></span></div>' +
    '<p class="tvnote" id="tvNote" hidden></p></div>' +
    '<div class="ppage tpage tvpaper" id="tvPaper" role="tabpanel"></div>' +
    '<div class="tvfoot"><button type="button" data-tv="restart" id="tvRestart"></button><div class="tvconfirm" id="tvConfirm" role="alertdialog" hidden></div></div>';
  pv.onclick = testsClick; pv.onchange = testsChange; pv.oninput = testsInput;
  pv.onkeydown = function(e){ var b = e.target.closest && e.target.closest('[data-tvform]'); if (!b) return; var all = Array.prototype.slice.call(pv.querySelectorAll('[data-tvform]')), i = all.indexOf(b), j = e.key === 'ArrowRight' ? (i + 1) % all.length : e.key === 'ArrowLeft' ? (i + all.length - 1) % all.length : -1; if (j < 0) return; e.preventDefault(); EF = all[j].dataset.tvform; EDIT = null; paintTests(); all[j].focus(); };
  paintTests();
  var first = pv.querySelector('[data-tvform][aria-selected="true"]') || pv.querySelector('[data-tv="done"]'); if (first) first.focus();
}
function rowsByK(r){ var m = {}; (r.rows || []).forEach(function(x){ (m[x.k] = m[x.k] || []).push(x); }); return m; }
function keyLine(f, k, rows, item){
  var it, parts = [];
  if (FIXED){ it = item || fixedAt(f, k, SPEC); (it.parts || [it]).forEach(function(p){ parts.push([it.parts ? p.label : '', ansHtml(it, p)]); }); }
  else (rows || []).forEach(function(x){ var h = x.key; if (x.type === 'nline'){ var d = document.createElement('div'); d.innerHTML = h; var w = d.querySelector('.nlkw'); h = w ? esc(w.textContent) : h; } parts.push([x.label, h]); });
  return parts.length ? '<div class="tvkey"><span class="kl">Key</span>' + parts.map(function(x){ return '<span class="tvk">' + (x[0] ? '<b>' + esc(x[0]) + '.</b> ' : '') + x[1] + '</span>'; }).join('') + '</div>' : '';
}
function stripHtml(f, k){
  var F = SPEC.forms[f], q = F.q[k], on = SPEC.pick[k] !== false, flag = '', tag = '';
  if (!FIXED && on){ var raw = rawAt(srcOf(F, k), k); if (famOff(raw)) flag = approvedAt(k) ? '<span class="tvflag">Disapproved kind<button type="button" data-tv="new" data-k="' + k + '">New version</button></span>' : '<span class="tvflag">Disapproved kind<button type="button" data-tv="leave" data-k="' + k + '">Leave it out</button></span>'; }
  if (q && on) tag = '<span class="tvtag">' + (q.seed && q.ed ? 'New version, edited' : q.ed ? 'Edited' : 'New version') + '<button type="button" data-tv="undo" data-k="' + k + '">Undo</button></span>';
  return '<div class="tvstrip" data-k="' + k + '"><label class="tvon"><input type="checkbox" data-tv="on" data-k="' + k + '"' + (on ? ' checked' : '') + '><span>On the test</span></label>' +
    (on ? (FIXED || flag ? '' : '<button type="button" data-tv="new" data-k="' + k + '">New version</button>') + '<button type="button" data-tv="edit" data-k="' + k + '">Edit</button>' : '') + tag + flag + '</div>';
}
function outRow(f, k){
  var it = FIXED ? fixedAt(f, k, SPEC) : itemOf(SPEC.forms[f], k), words = FIXED ? plain(tex(it.stem)) : plain(it._est != null ? it._est : V.stem(it));
  return '<div class="tvout"><span class="qn">' + qidOf(k) + '</span><span class="tvoutw">' + esc(words.length > 96 ? words.slice(0, 94) + '…' : words) + '</span><span class="tvoutl">Left out</span></div>' + stripHtml(f, k);
}
function paintTests(){
  if (!OV || OV.kind !== 'tests') return;
  var pv = OV.pv, y = window.scrollY, a = document.activeElement, fk = a && a.dataset ? [a.dataset.tv, a.dataset.k, a.dataset.tvform] : null;
  var r = draw(EF, true), paper = $('tvPaper'), byK = rowsByK(r);
  paper.innerHTML = r.test;
  paper.setAttribute('aria-labelledby', 'tvTab' + EF);
  Array.prototype.forEach.call(paper.querySelectorAll('.pq[data-k]'), function(el){
    var k = +el.dataset.k;
    if (el.classList.contains('pqout')){ el.innerHTML = outRow(EF, k); return; }
    el.insertAdjacentHTML('beforeend', keyLine(EF, k, byK[k]) + stripHtml(EF, k));
    if (!FIXED && SPEC.pick[k] !== false && SPEC.forms[EF].q[k]) el.classList.add('tvchg');
    if (FIXED && SPEC.forms[EF].q[k]) el.classList.add('tvchg');
  });
  if (EDIT && EDIT.f === EF){ var tgt = paper.querySelector('.pq[data-k="' + EDIT.k + '"]:not(.pqout)'); if (tgt) (FIXED ? editFixed : editRandom)(tgt, EDIT.k); else EDIT = null; }
  Array.prototype.forEach.call(pv.querySelectorAll('[data-tvform]'), function(b){ var on = b.dataset.tvform === EF; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; });
  var n = nOn();
  $('tvSum').textContent = n + (n === 1 ? ' question' : ' questions') + ' · ' + r.points + (r.points === 1 ? ' point' : ' points');
  var note = MODE !== 'site' ? 'Changes are only on this computer.' : SPEC.cv !== CV ? 'This unit was rebuilt after these forms were pinned: look them over.' : '';
  $('tvNote').textContent = note; $('tvNote').hidden = !note;
  $('tvRestart').textContent = 'Start ' + (FORMS.length > 1 ? formWord(EF) : 'the test') + ' over';
  window.scrollTo(0, y);
  if (fk && !EDIT){ var back = fk[2] ? pv.querySelector('[data-tvform="' + fk[2] + '"]') : fk[0] ? pv.querySelector('[data-tv="' + fk[0] + '"][data-k="' + fk[1] + '"]') || pv.querySelector('.tvstrip[data-k="' + fk[1] + '"] [data-tv="on"]') : null; if (back) back.focus({preventScroll: true}); }
}
function confirmOn(text, yes, fn){
  var c = $('tvConfirm'); c.hidden = false;
  c.innerHTML = '<span>' + esc(text) + '</span><button type="button" class="go" id="tvYes">' + esc(yes) + '</button><button type="button" id="tvNo">Keep it</button>';
  $('tvYes').onclick = function(){ confirmOff(); fn(); }; $('tvNo').onclick = function(){ confirmOff(); var b = $('tvRestart'); if (b) b.focus(); };
  $('tvYes').focus();
}
function confirmOff(){ var c = $('tvConfirm'); if (c){ c.hidden = true; c.innerHTML = ''; } }
function testsClick(e){
  var b = e.target.closest && e.target.closest('button'); if (!b) return;
  if (b.dataset.tvform){ EF = b.dataset.tvform; EDIT = null; paintTests(); return; }
  var w = b.dataset.tv, k = b.dataset.k != null ? +b.dataset.k : null, F = SPEC.forms[EF];
  if (w === 'done'){ closeOverlay(); return; }
  if (w === 'print'){ var f0 = EF, op = OV.opener; showPrint('tk', f0, op, function(){ openTests(f0, op); }); return; }
  if (w === 'restart'){
    confirmOn(FIXED ? 'Put ' + (FORMS.length > 1 ? formWord(EF) : 'the test') + ' back to the built paper? Its edits go.' : 'Start ' + formWord(EF) + ' over? A new random ' + formWord(EF) + ' replaces this one.', 'Start over', function(){
      if (FIXED) SPEC.forms[EF] = {q: {}};
      else SPEC.forms[EF] = pinRandom(FORMS.filter(function(g){ return g !== EF; }).map(function(g){ return SPEC.forms[g].seed; }), SPEC.pick);
      EDIT = null; save(); paintTests(); var r0 = $('tvRestart'); if (r0) r0.focus();
    });
    return;
  }
  if (w === 'new' && k != null){
    var s = drawAt(F, k, SPEC.pick);
    if (!s){ status('No other version found — try again', true); return; }
    F.q[k] = {seed: s}; EDIT = null; save(); paintTests(); return;
  }
  if (w === 'undo' && k != null){ delete F.q[k]; if (EDIT && EDIT.k === k) EDIT = null; save(); paintTests(); return; }
  if (w === 'leave' && k != null){ SPEC.pick[k] = false; save(); paintTests(); return; }
  if (w === 'edit' && k != null){ EDIT = {f: EF, k: k}; paintTests(); return; }
  if (w === 'cancel'){ EDIT = null; paintTests(); focusStrip(k, 'edit'); return; }
  if (w === 'save' && EDIT){ var kk = EDIT.k; (FIXED ? saveFixed : saveRandom)(); EDIT = null; save(); paintTests(); focusStrip(kk, 'edit'); return; }
}
function focusStrip(k, w){ var el = OV && OV.pv.querySelector('[data-tv="' + w + '"][data-k="' + k + '"]'); if (el) el.focus({preventScroll: true}); }
function testsChange(e){
  var c = e.target; if (c && c.dataset && c.dataset.fx != null){ testsInput(e); return; }
  if (!c || c.dataset.tv !== 'on') return;
  var k = +c.dataset.k; SPEC.pick[k] = !!c.checked; if (EDIT && EDIT.k === k) EDIT = null;
  save(); paintTests();
  var el = OV.pv.querySelector('[data-tv="on"][data-k="' + k + '"]'); if (el) el.focus({preventScroll: true});
}

/* ---- Edit on a random form: in place on the paper. The question's words, each part's line and each choice's words become
   editable (figures are not), and each part's key is shown under it, editable; a graph or a choice's letter stays. */
function edVal(el){ return clean(el.innerHTML); }
function edSpan(html, what, label){ return '<span class="tved" contenteditable="true" spellcheck="false" data-tex-off="" data-ed="' + what + '" role="textbox" aria-multiline="true" aria-label="' + esc(label) + '">' + clean(html) + '</span>'; }
function editRandom(el, k){
  var F = SPEC.forms[EF], it = itemOf(F, k), num = (el.querySelector('.num') || {}).textContent || '', n = num.replace(/\.$/, '');
  var stem = it._est != null ? it._est : V.stem(it), figure = ''; try { figure = V.figure(it) || ''; } catch(e){}
  var h = '<div class="pqh"><div class="pqid" translate="no"><span class="qn">' + qidOf(k) + '</span></div><div class="stem"><b class="num">' + esc(num) + '</b>' + edSpan(stem, 'stem', 'Question ' + n + ', its words') + '</div>' + figure + '</div>';
  var stays = function(t){ return '<p class="tvstays">' + t + '</p>'; };
  var chs = function(x, lab, multi){ return '<div class="pchoices">' + x.opts.map(function(o, i){ return '<div class="pch"><span class="pbox' + (multi ? ' sq' : '') + '"></span><span class="cl">' + LET[i] + '.</span>' + edSpan(x._eopt && x._eopt[i] != null ? x._eopt[i] : V.opt(x, i), 'opt:' + lab + ':' + i, 'Choice ' + LET[i] + (lab ? ' of part ' + lab : '')) + '</div>'; }).join('') + '</div>'; };
  var right = function(x, multi){ var c = multi ? x.correct : [x.correct]; return stays('The right answer stays ' + c.map(function(i){ return LET[i]; }).join(' and ') + '.'); };
  var keyEd = function(p, lab){ return '<div class="tvkeyed"><span class="kl">Key</span>' + edSpan(p._ekey != null ? p._ekey : V.key(p), 'key:' + lab, 'Key' + (lab ? ' for part ' + lab : '')) + '</div>'; };
  var graph = function(p){ return '<div class="tvkeyed"><span class="kl">Key</span>' + NL.keyHtml(p) + '</div>' + stays('The graph stays. To change its numbers, use New version.'); };
  if (it.type === 'parts') it.parts.forEach(function(p){
    h += '<div class="ppart"><div class="line"><b class="lab">' + esc(p.label) + '.</b>' + edSpan(p._eln != null ? p._eln : V.line(p), 'line:' + p.label, 'Part ' + p.label + ', its words') + '</div>' +
      (p.kind === 'mc' ? chs(p, p.label, false) + right(p, false) : p.kind === 'nline' ? graph(p) : keyEd(p, p.label)) + '</div>';
  });
  else if (it.type === 'solo') h += '<div class="ppart">' + (it.part.kind === 'nline' ? '<div class="line">' + edSpan(it.part._eln != null ? it.part._eln : V.line(it.part), 'line:', 'Its words') + '</div>' + graph(it.part) : keyEd(it.part, '')) + '</div>';
  else h += '<div class="ppart">' + chs(it, '', it.type === 'multi') + right(it, it.type === 'multi') + '</div>';
  h += '<div class="tvedbar"><button type="button" class="go" data-tv="save">Save</button><button type="button" data-tv="cancel" data-k="' + k + '">Cancel</button></div>';
  el.innerHTML = h; el.classList.add('tvediting');
  if (el.scrollIntoView) el.scrollIntoView({block: 'start'});
  var first = el.querySelector('.tved'); if (first) first.focus({preventScroll: true});
}
function saveRandom(){
  var F = SPEC.forms[EF], k = EDIT.k, raw = rawAt(srcOf(F, k), k), el = OV.pv.querySelector('.pq.tvediting'); if (!el || !raw) return;
  var ed = {}, ps = PK.partsOf(raw);
  Array.prototype.forEach.call(el.querySelectorAll('[data-ed]'), function(x){
    var w = x.dataset.ed.split(':'), v = edVal(x), was;
    if (w[0] === 'stem'){ was = clean(V.stem(raw)); if (v !== was) ed.stem = v; return; }
    var lab = w[1] || '', p = raw.type === 'parts' ? ps.filter(function(q){ return q.label === lab; })[0] : ps[0]; if (!p) return;
    if (w[0] === 'line'){ was = clean(V.line(p)); if (v !== was) (ed.line = ed.line || {})[lab] = v; }
    else if (w[0] === 'key'){ was = clean(V.key(p)); if (v !== was) (ed.key = ed.key || {})[lab] = v; }
    else if (w[0] === 'opt'){ var i = +w[2]; was = clean(V.opt(p, i)); var arr = (ed.opt = ed.opt || {}); arr[lab] = arr[lab] || p.opts.map(function(){ return null; }); if (v !== was) arr[lab][i] = v; }
  });
  if (ed.opt) Object.keys(ed.opt).forEach(function(l){ if (ed.opt[l].every(function(x){ return x == null; })) delete ed.opt[l]; });
  if (ed.opt && !Object.keys(ed.opt).length) delete ed.opt;
  var q = F.q[k] || {}; if (Object.keys(ed).length) q.ed = ed; else delete q.ed;
  if (q.seed || q.ed) F.q[k] = q; else delete F.q[k];
}

/* ---- Edit on the fixed paper: the TeX under the question — its words, each part's words and answer, each choice and which one
   is right — and the paper redrawn above it as it is typed */
function draftOf(it){ return JSON.parse(JSON.stringify(it)); }
function fieldsFixed(d, k){
  var f = function(lab, key, val, area){ return '<label class="tvf"><span>' + esc(lab) + '</span>' + (area ? '<textarea rows="2" data-fx="' + key + '" spellcheck="false">' + esc(val) + '</textarea>' : '<input type="text" data-fx="' + key + '" value="' + esc(val) + '" spellcheck="false">') + '</label>'; };
  var choiceRows = function(c, pre, multi){ return '<fieldset class="tvch"><legend>Choices</legend>' + c.choices.map(function(x, i){ return '<div class="tvchr"><label class="tvright"><input type="' + (multi ? 'checkbox' : 'radio') + '" name="tvr' + pre + '" data-fx="' + pre + 'r' + i + '"' + (c.correct.indexOf(i) >= 0 ? ' checked' : '') + '><span>' + LET[i] + '</span></label><input type="text" data-fx="' + pre + 'c' + i + '" value="' + esc(x) + '" spellcheck="false" aria-label="Choice ' + LET[i] + '"></div>'; }).join('') + '</fieldset>'; };
  var h = f('Question', 'stem', d.stem, true);
  if (d.parts) d.parts.forEach(function(p, i){ h += '<div class="tvpart">' + f('Part ' + p.label, 'p' + i + 's', p.stem, true) + (p.choices ? choiceRows(p, 'p' + i, false) : f('Answer', 'p' + i + 'a', p.answer, false)) + '</div>'; });
  else if (d.choices) h += choiceRows(d, 'i', d.multi);
  else h += f('Answer', 'a', d.answer, false);
  return '<div class="tvfields">' + h + '<p class="tvhint">Math goes between $ signs.</p><p class="tvbad" id="tvBad" hidden></p><div class="tvedbar"><button type="button" class="go" data-tv="save">Save</button><button type="button" data-tv="cancel" data-k="' + k + '">Cancel</button></div></div>';
}
function editFixed(el, k){
  var it = fixedAt(EF, k, SPEC), num = +(((el.querySelector('.num') || {}).textContent || '').replace(/\D/g, '')) || 1;
  EDIT.draft = draftOf(it); EDIT.num = num;
  var w = document.createElement('div'); w.className = 'tvedq'; w.dataset.k = k;
  w.innerHTML = '<div class="tvprev">' + qHtml(it, num, k) + keyLine(EF, k, null, it) + '</div>' + fieldsFixed(EDIT.draft, k);
  el.parentNode.replaceChild(w, el);
  if (w.scrollIntoView) w.scrollIntoView({block: 'start'});
  var first = w.querySelector('[data-fx]'); if (first) first.focus({preventScroll: true});
}
function readFixed(){
  var d = EDIT.draft, root = OV.pv.querySelector('.tvedq'); if (!root) return d;
  var v = function(key){ var x = root.querySelector('[data-fx="' + key + '"]'); return x ? (x.type === 'radio' || x.type === 'checkbox' ? x.checked : x.value) : null; };
  var ch = function(c, pre){ c.choices = c.choices.map(function(x, i){ var t = v(pre + 'c' + i); return t == null ? x : t; }); var r = []; c.choices.forEach(function(x, i){ if (v(pre + 'r' + i)) r.push(i); }); if (r.length) c.correct = r; };
  if (v('stem') != null) d.stem = v('stem');
  if (d.parts) d.parts.forEach(function(p, i){ if (v('p' + i + 's') != null) p.stem = v('p' + i + 's'); if (p.choices) ch(p, 'p' + i); else if (v('p' + i + 'a') != null) p.answer = v('p' + i + 'a'); });
  else if (d.choices) ch(d, 'i');
  else if (v('a') != null) d.answer = v('a');
  return d;
}
function testsInput(e){
  if (!EDIT || !FIXED || !e.target.dataset || e.target.dataset.fx == null) return;
  var d = readFixed(), prev = OV.pv.querySelector('.tvedq .tvprev'), n0 = errors.length;
  prev.innerHTML = qHtml(d, EDIT.num, EDIT.k) + keyLine(EF, EDIT.k, null, d);
  var bad = $('tvBad'), errs = errors.slice(n0); errors.length = n0;   /* a draft's math that does not draw is said here, not kept as the paper's */
  bad.textContent = errs.length ? 'This math does not draw yet: $' + errs[0][0] + '$' : ''; bad.hidden = !errs.length;
}
function saveFixed(){
  var k = EDIT.k, orig = T.forms[EF][POSF[k].si].items[POSF[k].ii], d = readFixed(), ed = {};
  if (d.stem !== orig.stem) ed.stem = d.stem;
  if (orig.parts){ var ps = d.parts.map(function(p, i){ var o = orig.parts[i], x = {}; if (p.stem !== o.stem) x.stem = p.stem; if (o.choices){ if (!sameArr(p.choices, o.choices)) x.choices = p.choices; if (!sameArr(p.correct, o.correct)) x.correct = p.correct; } else if (p.answer !== o.answer) x.answer = p.answer; return Object.keys(x).length ? x : null; });
    if (ps.some(Boolean)) ed.parts = ps; }
  else if (orig.choices){ if (!sameArr(d.choices, orig.choices)) ed.choices = d.choices; if (!sameArr(d.correct, orig.correct)) ed.correct = d.correct; }
  else if (d.answer !== orig.answer) ed.answer = d.answer;
  var F = SPEC.forms[EF]; if (Object.keys(ed).length) F.q[k] = {ed: ed}; else delete F.q[k];
}

/* ================================================ Approve questions */
var KINDS = null, ATAB = 'test', ALES = null;
function survey(){
  if (KINDS) return KINDS;
  var by = {}, order = [], KOF = {}; PP.forEach(function(p){ KOF[p.si + '.' + p.ii] = p.k; });
  for (var s = 1; s <= 240; s++) Unit.generate(s).sections.forEach(function(sec, si){ sec.items.forEach(function(it, ii){
    var fk = PK.famKey(it), k = KOF[si + '.' + ii], K0 = by[fk];
    if (!K0){ K0 = by[fk] = {fk: fk, si: si, ks: [], samples: [], cur: 0}; order.push(fk); }
    if (K0.ks.indexOf(k) < 0) K0.ks.push(k);
    if (K0.samples.length < 8) K0.samples.push({seed: s, k: k});
  }); });
  KINDS = order.map(function(fk){ return by[fk]; }).sort(function(a, b){ return Math.min.apply(null, a.ks) - Math.min.apply(null, b.ks); });
  return KINDS;
}
function lessons(){
  if (ALES) return ALES;
  var B = K.Bank; if (!B || !B._lessons) return (ALES = []);
  var L = B._lessons, SC = B._scopes || {}, keys = B.keys ? B.keys() : [];
  ALES = Object.keys(L).map(function(lid){ var sk = keys.filter(function(k){ var s = SC[k]; return s && s.show && s.lessons.length === 1 && s.lessons[0] === lid; })[0];
    return {lid: lid, label: sk ? B.name(sk) : 'Lesson ' + lid + ' · ' + L[lid].title, items: L[lid].items}; });
  return ALES;
}
function segHtml(kind, target, off, label){
  return '<div class="apseg" role="group" aria-label="' + esc(label) + '"><button type="button" data-ap="on" data-kind="' + kind + '" data-target="' + esc(target) + '" aria-pressed="' + !off + '">Approved</button>' +
    '<button type="button" data-ap="off" data-kind="' + kind + '" data-target="' + esc(target) + '" aria-pressed="' + off + '">Disapproved</button></div>';
}
function keysHtml(keys){ return '<div class="apkey"><span class="kl">Answer</span>' + keys.map(function(x){ return '<span class="apk">' + (x.lab ? '<b>' + esc(x.lab) + '.</b> ' : '') + x.key + '</span>'; }).join('') + '</div>'; }
function kindRow(K0){
  var off = !!(AP && AP.famHidden(K0.fk)), sm = K0.samples[K0.cur % K0.samples.length], p = PP[sm.k], it = Unit.generate(sm.seed).sections[p.si].items[p.ii], S = PK.sample(it), q = PK.qid(p.si, p.ii, it) || {};
  var ids = K0.ks.slice().sort(function(a, b){ return a - b; }).map(qidOf).join(' · ');
  return '<div class="aprow' + (off ? ' off' : '') + '" data-fk="' + esc(K0.fk) + '"><div class="apcard"><div class="apid" translate="no"><span class="qn">' + ids + '</span>' + (q.sk ? ' <span class="qsk">· ' + esc(q.sk) + '</span>' : '') + '</div>' +
    '<div class="apq">' + S.html + '</div>' + keysHtml(S.keys) + '</div>' +
    '<div class="apctl">' + segHtml('family', K0.fk, off, ids) + (K0.samples.length > 1 ? '<button type="button" class="apmore" data-ap="more" data-fk="' + esc(K0.fk) + '">Another example</button>' : '') +
    (off ? '<p class="apoff">Left out of new sets.</p>' : '') + '</div></div>';
}
function itemRow(b){
  var off = !!(AP && AP.bankHidden(b.id)), it = K.Bank._kitItem(b), S = PK.sample(it), q = K.Bank.qid({bank: b});
  return '<div class="aprow' + (off ? ' off' : '') + '" data-bid="' + esc(b.id) + '"><div class="apcard"><div class="apid" translate="no"><span class="qn">' + esc(q.id) + '</span>' + (b.rigor ? ' <span class="qsk">· high rigor</span>' : '') + '</div>' +
    '<div class="apq">' + S.html + '</div>' + keysHtml(S.keys) + '</div><div class="apctl">' + segHtml('bank', b.id, off, q.id) + (off ? '<p class="apoff">Left out of new sets.</p>' : '') + '</div></div>';
}
function openApprove(opener){
  var pv = overlay('approve', 'Approve questions', opener), hasBank = lessons().length > 0;
  pv.innerHTML = '<div class="tvbar"><div class="tvtop"><h2 class="tvh" id="apH">Approve questions</h2>' +
    (hasBank ? '<div class="tvtabs" role="tablist" aria-label="Which questions"><button type="button" role="tab" id="apTabtest" data-aptab="test" aria-controls="apBody">Practice test</button><button type="button" role="tab" id="apTablessons" data-aptab="lessons" aria-controls="apBody">Lesson sets</button></div>' : '') +
    '<span class="tvst" role="status" aria-live="polite"></span><span class="tvacts"><button type="button" class="go" data-ap="done">Done</button></span></div></div>' +
    '<div class="apbody" id="apBody"' + (hasBank ? ' role="tabpanel"' : '') + '><p class="apsum">…</p></div>';
  pv.onclick = approveClick; pv.onchange = function(e){ if (e.target && e.target.id === 'apLesson'){ ALES.cur = e.target.value; paintApprove(); var s = $('apLesson'); if (s) s.focus(); } };
  pv.onkeydown = function(e){ var b = e.target.closest && e.target.closest('[data-aptab]'); if (!b) return; if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return; e.preventDefault(); ATAB = ATAB === 'test' ? 'lessons' : 'test'; paintApprove(); var t = $('apTab' + ATAB); if (t) t.focus(); };
  /* the teacher's own read (never the public one's minute of cache): what is disapproved now */
  if (ONSITE) call('GET', API_I).then(function(r){ if (r.ok && r.j && Array.isArray(r.j.edits) && AP){ AP.use({edits: r.j.edits}); if (OV && OV.kind === 'approve') paintApprove(); } }, function(){});
  setTimeout(function(){ paintApprove(); var t = pv.querySelector('[data-aptab][aria-selected="true"]') || pv.querySelector('[data-ap="done"]'); if (t) t.focus(); }, 0);
}
function paintApprove(){
  if (!OV || OV.kind !== 'approve') return;
  var pv = OV.pv, body = $('apBody'), h = [], y = window.scrollY;
  Array.prototype.forEach.call(pv.querySelectorAll('[data-aptab]'), function(b){ var on = b.dataset.aptab === ATAB; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; });
  if (body.hasAttribute('role')) body.setAttribute('aria-labelledby', 'apTab' + ATAB);
  var why = '<p class="apwhy">Disapproved questions are left out of new practice sets and new tests.</p>' + (ONSITE ? '' : '<p class="apwhy">Approvals are saved on mrshaffer.org: open this page there to change them.</p>');
  if (ATAB === 'test'){
    var ks = survey(), nOff = ks.filter(function(x){ return AP && AP.famHidden(x.fk); }).length;
    h.push('<p class="apsum"><b>' + ks.length + (ks.length === 1 ? ' kind' : ' kinds') + ' of question</b> · ' + nOff + ' disapproved</p>' + why);
    PK.sections.forEach(function(sec){ var mine = ks.filter(function(x){ return x.si === sec.si; }); if (!mine.length) return; h.push('<h3 class="apsec">' + esc(sec.title) + '</h3>' + mine.map(kindRow).join('')); });
  } else {
    var L = lessons(), cur = L.filter(function(x){ return x.lid === ALES.cur; })[0] || L[0]; ALES.cur = cur.lid;
    var off = cur.items.filter(function(b){ return AP && AP.bankHidden(b.id); }).length, all = 0;
    L.forEach(function(x){ all += x.items.filter(function(b){ return AP && AP.bankHidden(b.id); }).length; });
    h.push('<p class="apsum"><b>' + cur.items.length + ' items in this lesson</b> · ' + off + ' disapproved' + (all > off ? ' (' + all + ' in all lessons)' : '') + '</p>' + why);
    h.push('<div class="aplesson"><label for="apLesson">Lesson</label><select id="apLesson">' + L.map(function(x){ return '<option value="' + esc(x.lid) + '"' + (x === cur ? ' selected' : '') + '>' + esc(x.label) + '</option>'; }).join('') + '</select></div>');
    h.push(cur.items.map(itemRow).join(''));
  }
  body.innerHTML = h.join('');
  window.scrollTo(0, y);
  pv.querySelectorAll('.apseg button').forEach(function(b){ b.disabled = !ONSITE; });
}
function approveClick(e){
  var b = e.target.closest && e.target.closest('button'); if (!b) return;
  if (b.dataset.ap === 'done'){ closeOverlay(); return; }
  if (b.dataset.aptab){ ATAB = b.dataset.aptab; paintApprove(); var t = $('apTab' + ATAB); if (t) t.focus(); return; }
  if (b.dataset.ap === 'more'){ var K0 = survey().filter(function(x){ return x.fk === b.dataset.fk; })[0]; if (!K0) return; K0.cur++; var row = b.closest('.aprow'); row.outerHTML = kindRow(K0); var nb = OV.pv.querySelector('.aprow[data-fk="' + cssq(K0.fk) + '"] [data-ap="more"]'); if (nb) nb.focus(); return; }
  if (b.dataset.ap === 'on' || b.dataset.ap === 'off'){
    var kind = b.dataset.kind, target = b.dataset.target, hide = b.dataset.ap === 'off', was = kind === 'family' ? AP.famHidden(target) : AP.bankHidden(target);
    if (hide === was) return;
    AP.set(kind, target, hide); paintApprove(); refocus(kind, target, b.dataset.ap); status('Saving…');
    call('PUT', API_I + '/approval/' + kind + '/' + encodeURIComponent(target), {approved: !hide}).then(function(r){
      if (r.ok && r.j && r.j.target === target){ status('Saved'); return; }
      AP.set(kind, target, was); paintApprove(); refocus(kind, target, b.dataset.ap); status(r.status === 401 ? 'Signed out — sign in again to save' : 'Couldn’t save — try again', true);
    }, function(){ AP.set(kind, target, was); paintApprove(); refocus(kind, target, b.dataset.ap); status('Couldn’t save — try again', true); });
  }
}
function cssq(s){ return String(s).replace(/["\\]/g, '\\$&'); }
function refocus(kind, target, w){ var el = OV && OV.pv.querySelector('[data-ap="' + w + '"][data-kind="' + kind + '"][data-target="' + cssq(target) + '"]'); if (el) el.focus({preventScroll: true}); }

/* ---- the checks' handle */
API.ready = function(){ return READY; }; API.mode = function(){ return MODE; }; API.setForm = setForm; API.form = function(){ return FORM; };
API.print = function(kind, f){ whenReady(function(){ showPrint(kind || 'tk', f || FORM, bar.querySelector('[data-tprint]'), null); }); };
API.open = function(which){ if (which === 'approve') openApprove(bar.querySelector('[data-topen="approve"]')); else whenReady(function(){ openTests(FORM, bar.querySelector('[data-topen="tests"]')); }); };
API.clean = clean; API.draw = function(f){ return draw(f || FORM, false); };
/* which questions are on the test: read, or set for this page (the checks) — the editor's On the test saves */
API.pick = function(v){ if (v && SPEC) SPEC.pick = TP.map(function(p){ return v[p.k] !== false; }); return SPEC ? SPEC.pick.slice() : TP.map(function(){ return true; }); };

load();
/* the cockpit's links: ?open=tests, ?open=approve */
var m = /[?&]open=(tests|approve)\b/.exec(location.search || '');
if (m) whenReady(function(){ API.open(m[1]); });
}
})();
