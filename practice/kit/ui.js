/* Practice-test kit: the page. One script for every unit; the unit supplies window.Unit (see kit/README.md).
   Design decisions (Croix, Oct 2026) the kit keeps: help as a ladder of three rungs (7 Nov 2026: what to notice, the first
   step with the step-by-step walkthrough, its picture at the step it explains, then the worked solution), Try another like this, the Practice menu (whole test / one part / my misses),
   right on the first check is a point, Hint or not, and a question solved with the Hint gets a small gray bulb (the Hint
   button's own icon) instead of words; the clock pauses when the page is hidden, no tip box, no footer.
   Apple review (15 Oct 2026) changes are marked [R1-n], [R2-Nn], [J-n] (Jobs lens), [W-n] (Wozniak lens). */
(function kitPage(){
'use strict';
/* approvals (approvals.js, 8 Nov 2026): on the site the page waits for the list of disapproved questions (at most a moment) before it draws */
if (window.Kit && window.Kit.Approvals && window.Kit.Approvals.hold(kitPage)) return;
var U = window.Unit, K = window.Kit, V = U.view, AP = K.Approvals || null;
var SCHEMA = 2, PRE = U.id + '.';                       /* [W-6] one prefix per unit; versions live inside each record */
var $ = function(id){ return document.getElementById(id); };
var LET = 'ABCDEFGH';
function esc(s){ return String(s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
/* a question solved with the Hint is marked with the Hint's bulb, small and gray, and no words; a count goes beside it where
   questions are counted (Croix, 23 Oct 2026: "a more dignified or subtle way to mark the with help questions. Like I'm not
   trying to discourage the students from using the help button when they need it."). Its "tag" class keeps it one piece in
   the second language: it is copied, never translated. */
function bulb(n){ var t = n == null ? 'Hint used' : 'Hint used: ' + n; return '<span class="tag hu" role="img" aria-label="' + t + '" title="' + t + '">' + (n == null ? '' : n) + '</span>'; }
function load(k){ try { return JSON.parse(localStorage.getItem(PRE + k) || 'null'); } catch(e){ return null; } }
function store(k, v){ try { localStorage.setItem(PRE + k, JSON.stringify(v)); } catch(e){} }
function drop(k){ try { localStorage.removeItem(PRE + k); } catch(e){} }
function randomSeed(){ var a = new Uint32Array(1); try { crypto.getRandomValues(a); } catch(e){ a[0] = Math.floor(Math.random()*4294967296); } return 1 + (a[0] % 99999); }
try { document.documentElement.lang = 'en'; } catch(e){}

/* ------------------------------------------------ the unit's sections, scopes and the link */
var G0 = U.generate(1), NSEC = G0.sections.length;
var SCOPES = { all: 'Whole test' };
G0.sections.forEach(function(s, k){ SCOPES['p' + (k + 1)] = s.title + ' only'; });   /* ruling 54: a section is named, never numbered */
SCOPES.miss = 'My misses, with new numbers';
/* a lesson's practice from Cadence (bank.js, 7 Nov 2026): one choice per lesson of the plan, after the test's own */
if (K.Bank) K.Bank.scopes(SCOPES);
function lessonScope(sc){ return !!(K.Bank && K.Bank.isLesson(sc)); }
/* speakable IDs (7 Nov 2026, item 6): "U9·3" — the unit, then the question's place in the whole test — so a teacher can say "look
   at U9·3". Stable across sets, practice choices and rounds; the same on the screen, on every printout and on the teacher
   copy's keys (teacher.js writes them on the real test too). The ID alone (8 Nov 2026): the kind code that followed it
   ("U10·3 · solveAdd/graphAdd") printed on the student's test and cued the method, so nothing follows it anywhere. */
var UNO = (/u(\d+)$/.exec(U.id || '') || [])[1] || '', QORD = [];
(function(){ var c = 0; G0.sections.forEach(function(s, si){ QORD[si] = s.items.map(function(){ return ++c; }); }); })();
function qidOf(si, ii, item){
  if (item && item.bank && K.Bank) return K.Bank.qid(item);                          /* a lesson item: "U9·L3·7" */
  var n = QORD[si] && QORD[si][ii]; if (!n) return null;
  return {id: 'U' + UNO + '·' + n};
}
/* a kind of question — a FAMILY: the family code(s) of its parts ("solveAdd/graphAdd"), what the teacher approves or disapproves
   (approvals.js, 8 Nov 2026); never shown beside an ID */
function famKey(item){ var fs = []; partsOf(item).forEach(function(p){ var f = p && (p.fam || (p === item.part ? item.fam : '')); if (typeof f === 'string' && f && fs.indexOf(f) < 0) fs.push(f); }); if (!fs.length && typeof item.fam === 'string') fs.push(item.fam); return fs.join('/'); }
function famOff(item){ return !!(AP && item && !item.bank && AP.famHidden(famKey(item))); }
function qidHtml(q, cls){ return q ? '<div class="' + cls + '" translate="no"><span class="qn">' + q.id + '</span></div>' : ''; }
function qidOfItem(it){ var p = String(it.pos || '').split('.').map(Number); return qidOf(p[0], p[1], it.item); }
var HASH = new RegExp('^#set-?(\\d{1,5})(?:-(p\\d{1,2}|miss|lesson-[a-z0-9.+-]+))?$', 'i');        /* [R2-16] anchored; [W-10] any number of parts; a lesson (7 Nov 2026) */
var LHASH = /^#lesson-([a-z0-9.+-]+)$/i, LSEED = 0;            /* the site's link to a day's lesson, #lesson-9.03: a new set of it */
function fromHash(){ var h = location.hash || '', m = HASH.exec(h), l = LHASH.exec(h);
  if (!m && l && SCOPES['lesson-' + l[1].toLowerCase()]){ if (!LSEED) LSEED = randomSeed(); return {seed: LSEED, scope: 'lesson-' + l[1].toLowerCase(), bare: true}; }
  return m && +m[1] >= 1 && (!m[2] || SCOPES[m[2].toLowerCase()]) ? {seed: +m[1], scope: (m[2] || 'all').toLowerCase()} : null; }
function hashOf(sd, sc){ return '#set-' + sd + (sc === 'all' ? '' : '-' + sc); }

/* ------------------------------------------------ saved state [W-6]: one record per set and practice choice */
migrate();
var h0 = fromHash(), last = load('last') || {};
var seed = h0 ? h0.seed : (last.seed || randomSeed()), scope = h0 ? h0.scope : (SCOPES[last.scope] ? last.scope : 'all');
var G, ITEMS, DS, EX = {}, S, HASHV = '', FLASH = {};
function key(){ return 'set.' + seed + '.' + scope; }
function fresh(mode){ var o = {schema: SCHEMA, cv: U.contentVersion, hash: HASHV, mode: mode || 'practice', ans:{}, res:{}, more:{}, walk:{}, walkOpen:{}, acc:0, startedAt:null, running:false, done:false}; if (AP && AP.any()) o.eh = compNow(); return o; }
/* what a NEW set leaves out (approvals.js, 8 Nov 2026): the kinds of question the teacher disapproved. A set saved on a device
   keeps the composition it was opened with (S.eh) until "Try a new set" or "Start over"; a set saved before any kind was
   disapproved had none. Printing a make-up test (withSet) always uses the current one. */
var CURCOMP = false;
function compNow(){ return {h: AP ? AP.hiddenFams() : []}; }
function comp(){ return CURCOMP || !S ? compNow() : S.eh || {h: []}; }
function keepIt(it, C){ return !(C.h && C.h.length && C.h.indexOf(famKey(it)) >= 0); }
function save(){
  if (!S) return;
  S.at = Date.now(); store(key(), S); store('last', {seed: seed, scope: scope}); if (scope === 'all') store('lastAll', seed);
  var idx = (load('idx') || []).filter(function(k){ return k !== key(); }); idx.unshift(key());
  while (idx.length > 25) drop(idx.pop());                                            /* keep the 25 most recent sets */
  store('idx', idx);
}
function misses(){ return load('misses') || {}; }
function streaks(){ return load('streaks') || {}; }
/* The one rule for clearing a miss (24 Oct 2026): a first check right with no help is one in a row; two in a row clear the
   miss. Any other first check — wrong, or right after the Hint or Show me how — adds the miss and starts the count over. The
   base question and every "Try another like this" of it count alike. */
function streakStep(pos, fam, indep){
  var bk = String(pos).indexOf('b:') === 0, sk = bk ? 'bstreaks' : 'streaks', mk = bk ? 'bmisses' : 'misses';   /* a lesson item's count is kept apart: My misses is the test's */
  var st = load(sk) || {}, ms = load(mk) || {}, n = indep ? (st[pos] || 0) + 1 : 0;
  if (n >= 2) delete ms[pos]; else if (!indep) ms[pos] = fam;             /* the second in a row clears the miss; the count goes on (24 Oct) */
  if (n) st[pos] = n; else delete st[pos];
  store(sk, st); store(mk, ms); return n;
}
function migrate(){                                       /* earlier versions of this page kept progress under other names */
  (U.legacy || []).forEach(function(pre){
    try {
      var old = JSON.parse(localStorage.getItem(pre + 'misses') || 'null'), ms = misses(), g = U.generate(1);
      if (old) Object.keys(old).forEach(function(pos){ var x = atPos(g, pos); if (x && famOf(x) === old[pos]) ms[pos] = old[pos]; });
      store('misses', ms);
      var gone = []; for (var i = 0; i < localStorage.length; i++){ var k = localStorage.key(i); if (k && k.indexOf(pre) === 0) gone.push(k); }
      gone.forEach(function(k){ localStorage.removeItem(k); });
    } catch(e){}
  });
}
function seed2(n, t){ return ((n * 7919 + 4243 + (t || 0) * 104729) % 99999) + 1; }
function partsOf(it){ return it.type === 'parts' ? it.parts : it.type === 'solo' ? [it.part] : [it]; }
function posKey(si, ii, pi){ return si + '.' + ii + '.' + pi; }
function famOf(o){ return (o.x || o.part || o.item).fam || 1; }
function round2(){                                         /* the second round never repeats a round-1 question */
  var mine = {}; G.sections.forEach(function(sec){ sec.items.forEach(function(it){ partsOf(it).forEach(function(p){ mine[U.key(p)] = 1; }); }); });
  for (var t = 0; t < 40; t++){
    var g = U.generate(seed2(seed, t)), clash = false;
    g.sections.forEach(function(sec){ sec.items.forEach(function(it){ partsOf(it).forEach(function(p){ if (mine[U.key(p)]) clash = true; }); }); });
    if (!clash) return g;
  }
  return U.generate(seed2(seed, 0));
}
function missRounds(){ return 1; }                        /* [R1-11][closing check] one round, so every label says how many questions it opens */
function build(){
  G = U.generate(seed);
  var out = [], C = comp(), kept = function(list){ return list.filter(function(d){ return keepIt(d.it, C); }); };
  if (scope === 'all') G.sections.forEach(function(sec, si){ var its = kept(sec.items.map(function(it, ii){ return {it: it, keep: null, si: si, ii: ii}; })); if (its.length) out.push({title: esc(sec.title), items: its, si: si}); });
  else if (lessonScope(scope)) out = K.Bank.sections(scope, seed);                /* a lesson's set: 8 of its Cadence items */
  else if (scope === 'miss'){
    var pos = S.pos || [], rounds = missRounds(pos.length) === 1 ? [G] : [G, round2()];
    rounds.forEach(function(R, r){
      var items = [];
      R.sections.forEach(function(sec, si){ sec.items.forEach(function(it, ii){
        var keep = partsOf(it).map(function(p, pi){ return pos.indexOf(posKey(si, ii, it.type === 'parts' ? pi : -1)) >= 0; });
        if (keep.some(Boolean) && keepIt(it, C)) items.push({it: it, keep: it.type === 'parts' ? keep : null, si: si, ii: ii});
      }); });
      if (items.length) out.push({title: 'Your misses' + (rounds.length > 1 ? ' — round ' + (r + 1) : ''), items: items});
    });
  } else {
    var k = +scope.slice(1) - 1;
    [G, round2()].forEach(function(R, r){ var sec = R.sections[k]; if (!sec) return; var its = kept(sec.items.map(function(it, ii){ return {it: it, keep: null, si: k, ii: ii}; })); if (its.length) out.push({title: esc(sec.title) + ' — round ' + (r + 1), items: its, si: k}); });
  }
  HASHV = K.fnv1a(out.map(function(s){ return s.items.map(function(d){ return partsOf(d.it).map(function(p, pi){ return d.keep && !d.keep[pi] ? '' : U.key(p); }).join(','); }).join(';'); }).join('|') + '#' + U.contentVersion).toString(36);
  return out;
}

/* ------------------------------------------------ drawing the sheet */
function fig(it){ try { return V.figure(it) || ''; } catch(e){ return ''; } }
function flabHtml(p, id){ var fm = formOf(p); return fm.label ? '<div class="flab" id="fl' + id + '">' + esc(fm.label.charAt(0).toUpperCase() + fm.label.slice(1)) + '</div>' : ''; }
function inputHtml(p, id, lab){
  var pre = V.pre(p), unit = V.unit(p), ph = V.placeholder(p), fl = formOf(p).label;
  return flabHtml(p, id) + '<div class="ans">' + (pre ? '<span class="pre">' + pre + '</span>' : '') +
    '<input type="text" id="a' + id + '" data-kind="' + esc(p.kind) + '" aria-label="Answer to question ' + lab + '" aria-describedby="ln' + id + (fl ? ' fl' + id : '') + '" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="done"' + (p.imode ? ' inputmode="' + esc(p.imode) + '"' : '') + (ph ? ' placeholder="' + esc(ph) + '"' : '') + '>' +
    (unit ? '<span class="unit">' + esc(unit) + '</span>' : '') + '<span class="acts"><button type="button" class="chk go" data-check="' + id + '" aria-label="Check ' + lab + '">Check</button><span class="hslot" id="hs' + id + '"></span></span><span class="pv" aria-hidden="true"></span><span class="rd" id="rd' + id + '" aria-live="polite"></span></div>';
}
function tailHtml(id){
  return '<div class="fb" id="fb' + id + '" aria-live="polite"></div><div class="more" id="mo' + id + '"></div>' +
    '<div class="walk" id="wl' + id + '" hidden></div><div class="steps" id="st' + id + '" tabindex="-1" hidden></div><div class="again" id="ag' + id + '" hidden></div>';
}
function choicesHtml(x, id, lab, multi){
  var q = ['<div class="choices" role="' + (multi ? 'group' : 'radiogroup') + '" aria-labelledby="ln' + id + '">'];
  x.opts.forEach(function(o, k){
    q.push('<label class="ch" id="ch' + id + LET[k] + '"><input type="' + (multi ? 'checkbox' : 'radio') + '" name="q' + id + '" value="' + k + '"><span class="box' + (multi ? ' sq' : '') + '"></span><span class="cl">' + LET[k] + '.</span><span class="cv">' + V.opt(x, k) + '</span></label>');
  });
  q.push('</div><div class="ckrow"><button type="button" class="chk go" data-check="' + id + '" aria-label="Check ' + lab + '">Check</button><span class="hslot" id="hs' + id + '"></span></div>' + tailHtml(id));
  return q.join('');
}
function partHtml(p, id, solo, lab, lone){
  /* a lone graph to build (a Cadence item with one part) still says what to do: its line, without a second "1 pt" */
  if (solo && p.kind === 'nline') return '<div class="prt nlp solo" data-host="' + id + '"><div class="line nlsolo"><span class="st">' + V.line(p) + '</span></div>' + nlHtml(p, id, lab) + '</div>';
  var line = solo ? '' : '<div class="line" id="ln' + id + '">' + (p.label && !lone ? '<b class="lab">' + p.label + '.</b>' : '<b class="lab" aria-hidden="true"></b>') + '<span class="st">' + V.line(p) + '</span>' + (p.label ? '<span class="pt">1 pt</span>' : '') + '</div>';
  if (p.kind === 'mc') return '<div class="prt mcp" data-host="' + id + '">' + line + choicesHtml(p, id, lab, false) + '</div>';
  if (p.kind === 'nline') return '<div class="prt nlp' + (solo ? ' solo' : '') + '" data-host="' + id + '">' + line + nlHtml(p, id, lab) + '</div>';
  return '<div class="prt' + (solo ? ' solo' : '') + '" data-host="' + id + '">' + line + inputHtml(p, id, lab) + tailHtml(id) + '</div>';
}
function textType(p){ return p.kind === 'mc' ? 'mc' : p.kind === 'nline' ? 'nline' : 'text'; }
/* ---- a number-line graph the student builds (kind 'nline', kit/nline.js; 7 Nov 2026, Croix: "make them graph inequalities with
   an open or closed dot and an arrow instead of just describing them"): the line with a tap zone per tick (or drag, or ← → on
   the keyboard), then Dot · Open | Closed and Arrow · Left | Right; the ray draws as soon as a point and a direction exist. No
   typing, so no keypad. The answer is {c, closed, dir}; Check and the ladder are the kit's, as for any part. The teacher copy
   shows the key's graph under it. */
var NL = K.NL;
function nlHtml(p, id, lab){
  var tk = teacherPage() ? '<div class="nltk" translate="no"><span class="kl">Key</span>' + NL.keyHtml(p) + '</div>' : '';
  return NL.widget(id, p, S && S.ans[id], {label: 'Boundary point, question ' + lab}) + '<div class="ckrow"><button type="button" class="chk go" data-check="' + id + '" aria-label="Check ' + lab + '">Check</button><span class="hslot" id="hs' + id + '"></span></div>' + tk + tailHtml(id);
}
function nlPaint(it){
  var w = document.querySelector('[data-nlw="' + it.id + '"]'); if (!w) return;
  var g = NL.norm(S.ans[it.id]), R = S.res[it.id], lock = !!(R && R.v === 'right'), pt = $('nlp' + it.id), Sp = NL.spec(it.x), i = g.c == null ? -1 : NL.idx(Sp, g.c);
  pt.innerHTML = NL.svg(it.x, g, {mode: 'live'});
  if (i >= 0){ pt.setAttribute('aria-valuenow', NL.kstr(g.c)); pt.setAttribute('aria-valuetext', NL.fmt(g.c)); } else { pt.removeAttribute('aria-valuenow'); pt.setAttribute('aria-valuetext', 'No point yet'); }
  pt.setAttribute('aria-disabled', String(lock)); w.classList.toggle('locked', lock);
  var cur = {d: g.closed == null ? null : g.closed ? 'closed' : 'open', a: g.dir};
  ['d', 'a'].forEach(function(k){ var bs = w.querySelectorAll('[data-nl' + k + ']'), any = false;
    Array.prototype.forEach.call(bs, function(b){ var on = b.getAttribute('data-nl' + k) === cur[k]; any = any || on; b.setAttribute('aria-checked', String(on)); b.tabIndex = on ? 0 : -1; b.disabled = lock; });
    if (!any && bs[0]) bs[0].tabIndex = 0; });
  var sy = $('nls' + it.id); if (sy) sy.textContent = NL.say(it.x, g);
}
function nlSet(id, patch){
  var it = byId(id); if (!it || it.type !== 'nline') return;
  var R = S.res[id]; if (R && R.v === 'right') return;
  var g = NL.norm(S.ans[id]); Object.keys(patch).forEach(function(k){ g[k] = patch[k]; }); g = NL.norm(g);
  if (sameAns(NL.norm(S.ans[id]), g) && S.ans[id]) return;
  S.ans[id] = {c: g.c, closed: g.closed, dir: g.dir};
  if (!S.running && !S.done && !it.extra) start();
  if (FLASH[id]){ delete FLASH[id]; paintItem(it); }
  nlPaint(it); save(); paintProgress(); paintScore(true);
}
var NLDRAG = null;
function nlAt(pt, ev){ var it = byId(pt.dataset.nl), svg = pt.querySelector('svg'); if (!it || !svg) return; var r = svg.getBoundingClientRect(); if (!r.width) return;
  var i = NL.tickAt(it.x, (ev.clientX - r.left) / r.width * NL.W); nlSet(it.id, {c: NL.kstr(NL.val(NL.spec(it.x), i))}); }
document.addEventListener('pointerdown', function(e){
  var pt = e.target && e.target.closest && e.target.closest('.nlpt'); if (!pt || pt.getAttribute('aria-disabled') === 'true') return;
  if (e.button != null && e.button > 0) return;
  e.preventDefault(); pt.focus({preventScroll: true}); nlAt(pt, e);
  try { pt.setPointerCapture(e.pointerId); } catch(x){} NLDRAG = {pt: pt, id: e.pointerId};
});
document.addEventListener('pointermove', function(e){ if (NLDRAG && e.pointerId === NLDRAG.id) nlAt(NLDRAG.pt, e); });
document.addEventListener('pointerup', function(e){ if (NLDRAG && e.pointerId === NLDRAG.id) NLDRAG = null; });
document.addEventListener('pointercancel', function(){ NLDRAG = null; });
document.addEventListener('click', function(e){
  var b = e.target && e.target.closest && e.target.closest('[data-nld],[data-nla]'); if (!b || b.disabled) return;
  if (b.hasAttribute('data-nld')) nlSet(b.dataset.nl, {closed: b.getAttribute('data-nld') === 'closed'}); else nlSet(b.dataset.nl, {dir: b.getAttribute('data-nla')});
});
document.addEventListener('keydown', function(e){
  var t = e.target; if (!t || !t.closest) return;
  var pt = t.closest('.nlpt');
  if (pt && pt === t){
    var it = byId(pt.dataset.nl); if (!it || pt.getAttribute('aria-disabled') === 'true') return;
    var Sp = NL.spec(it.x), g = NL.norm(S.ans[it.id]), i = g.c == null ? -1 : NL.idx(Sp, g.c), mid = Math.round(Sp.n / 2), j = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') j = i < 0 ? mid : Math.min(Sp.n, i + 1);
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') j = i < 0 ? mid : Math.max(0, i - 1);
    else if (e.key === 'Home') j = 0; else if (e.key === 'End') j = Sp.n;
    else if ((e.key === ' ' || e.key === 'Enter') && i < 0) j = mid;
    if (j == null) return; e.preventDefault(); nlSet(it.id, {c: NL.kstr(NL.val(Sp, j))}); return;
  }
  var rb = t.closest('[data-nld],[data-nla]'); if (!rb) return;
  var grp = Array.prototype.slice.call(rb.parentNode.querySelectorAll('[role=radio]')), k = grp.indexOf(rb);
  var to = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? (k + 1) % grp.length : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? (k + grp.length - 1) % grp.length : e.key === 'Home' ? 0 : e.key === 'End' ? grp.length - 1 : -1;
  if (to < 0 || grp[to].disabled) return; e.preventDefault(); grp[to].click(); grp[to].focus();
});
/* the place a student is sent to in a question: its box, its first choice, or its number line */
function fieldOf(host, id){ return $('a' + id) || host.querySelector('.ch input') || host.querySelector('.nlpt'); }
function render(){
  DS = build(); ITEMS = []; EX = {}; RULES = {};
  var h = [], qn = 0;
  if (!DS.length) h.push('<p class="how">' + (scope === 'miss' ? 'No misses saved on this device yet. Finish a set first, then come back to practice the ones you missed.' : 'No questions here right now.') + '</p>');
  DS.forEach(function(sec, di){
    var pts = 0;
    var body = sec.items.map(function(d){
      var it = d.it; qn++;
      var q = ['<div class="q" data-q="' + qn + '">' + qidHtml(qidOf(d.si, d.ii, it), 'qid')];
      if (it.type === 'parts'){
        q.push('<div class="stem"><b class="num">' + qn + '.</b><span class="st">' + V.stem(it) + '</span></div>' + fig(it));
        var shown = it.parts.filter(function(p, pi){ return !d.keep || d.keep[pi]; }).length, lone = shown === 1 && it.parts.length > 1;
        it.parts.forEach(function(p, pi){ if (d.keep && !d.keep[pi]) return; pts++;
          var id = qn + p.label, sib = pi > 0 && (!d.keep || d.keep[0]) ? qn + it.parts[0].label : null;
          ITEMS.push({id: id, lab: lone ? String(qn) : id, sec: di, type: textType(p), x: p, item: it, pos: posKey(d.si, d.ii, pi), sib: sib, sibPart: pi > 0 ? it.parts[0] : null, aShown: !d.keep || d.keep[0]});
          q.push(partHtml(p, id, false, lone ? String(qn) : id, lone)); });
      } else if (it.type === 'solo'){
        pts++; var id = String(qn); ITEMS.push({id: id, lab: id, sec: di, type: textType(it.part), x: it.part, item: it, pos: posKey(d.si, d.ii, -1), aShown: true});
        q.push('<div class="stem" id="ln' + id + '"><b class="num">' + qn + '.</b><span class="st">' + V.stem(it) + '</span><span class="pt">1 pt</span></div>' + fig(it) + partHtml(it.part, id, true, id));
      } else {
        pts++; var id2 = String(qn), multi = it.type === 'multi';
        ITEMS.push({id: id2, lab: id2, sec: di, type: multi ? 'multi' : 'mc', x: it, item: it, pos: posKey(d.si, d.ii, -1), aShown: true});
        q.push('<div class="stem" id="ln' + id2 + '"><b class="num">' + qn + '.</b><span class="st">' + V.stem(it) + '</span><span class="pt">1 pt</span></div>' + fig(it) + '<div class="mcp" data-host="' + id2 + '">' + choicesHtml(it, id2, id2, multi) + '</div>');
      }
      q.push('</div>'); return q.join('');
    }).join('');
    sec.pts = pts;
    h.push('<section class="part" id="sec' + di + '"><div class="sechead"><h2>' + sec.title + '</h2><span class="pts" id="sp' + di + '">' + pts + ' point' + (pts === 1 ? '' : 's') + '</span></div>' + body + '</section>');
  });
  $('paper').innerHTML = h.join('');
  $('setno').textContent = seed; $('setin').value = seed;
  /* which practice this is, always in sight (7 Nov 2026, Croix: "It was the switching mechanism that confused me. I would assume
     that if I open a specific lesson it would open to that section. Likewise if I open the full practice test."): a chip under the
     title names the choice from What to practice, and a lesson's line says what it is — "Lesson 10.04 · 8 questions · today's
     practice" */
  $('total').textContent = lessonScope(scope) ? qn + ' question' + (qn === 1 ? '' : 's') + ' · today’s practice' : ITEMS.length + ' point' + (ITEMS.length === 1 ? '' : 's');
  paintChip();
  paintScopes();
  Object.keys(S.more || {}).forEach(function(id){ var b = byIdBase(id); if (b) mountExtra(b); });
}
function paintScopes(){
  var sc = $('scope'), nm = Object.keys(misses()).length;
  var opt = function(k){
    var lab = SCOPES[k] + (k === 'miss' && nm ? ' (' + nm + ')' : '');      /* how many when there are; no "(none yet)" aside (21 Oct 2026) */
    return '<option value="' + k + '"' + (k === scope ? ' selected' : '') + (k === 'miss' && !nm && scope !== 'miss' ? ' disabled' : '') + '>' + esc(lab) + '</option>'; };
  var ks = Object.keys(SCOPES), test = ks.filter(function(k){ return !lessonScope(k); }), les = ks.filter(function(k){ return lessonScope(k) && (K.Bank.shown(k) || k === scope); });
  /* the lessons after the test's own choices, as their own group (a two-lesson day's choice only while it is open) */
  sc.innerHTML = les.length ? '<optgroup label="Practice test">' + test.map(opt).join('') + '</optgroup><optgroup label="Lessons" translate="no">' + les.map(opt).join('') + '</optgroup>' : test.map(opt).join('');
}
function scopeChip(){
  if (scope === 'all') return 'Whole practice test';
  if (scope === 'miss') return 'My misses';
  if (lessonScope(scope)) return String(K.Bank.name(scope) || '').split(' · ')[0];
  var k = +String(scope).slice(1) - 1; return G0.sections[k] ? plainText(G0.sections[k].title) : String(SCOPES[scope] || '');
}
function paintChip(){
  var c = $('scopechip'), h = $('h1'); if (!h) return;
  /* on the line under the title, before the points (its own row pushed question 1 off a phone's first screen on a teacher copy) */
  var t = $('total'), row = t && t.parentNode;
  if (!c){ c = document.createElement('span'); c.id = 'scopechip'; c.className = 'scopechip'; c.setAttribute('translate', 'no'); if (row) row.insertBefore(c, t); else h.parentNode.insertBefore(c, h.nextSibling); }
  c.textContent = scopeChip(); c.setAttribute('aria-label', 'Practising: ' + scopeChip());
}
/* the eyebrow and the title: the unit's, or in a lesson choice the lesson's ("GRADE 7 MATH · UNIT 9 · LESSON 9.03 PRACTICE") */
function paintHead(){
  var h = lessonScope(scope) ? K.Bank.head(scope) : null;
  $('eyebrow').innerHTML = h ? h.eyebrow : U.eyebrow; $('h1').innerHTML = h ? h.h1 : U.h1;
  document.title = h ? h.title : U.title;
}

/* ------------------------------------------------ "Try a similar one" (was "Try another like this"): the same kind of question, new numbers */
function atPos(g, pos){
  var p = pos.split('.').map(Number), sec = g.sections[p[0]], it = sec && sec.items[p[1]]; if (!it) return null;
  if (it.type === 'parts'){ var pt = it.parts[p[2]]; return pt ? {type: textType(pt), part: pt, x: pt, item: it} : null; }
  if (it.type === 'solo') return {type: textType(it.part), part: it.part, x: it.part, item: it};
  return {type: it.type === 'multi' ? 'multi' : 'mc', x: it, item: it};
}
function mountExtra(base){
  var M0 = S.more[base.id]; if (!M0) return;
  var a = M0.bank ? K.Bank.at(M0.bank, base) : atPos(U.generate(M0.seed), base.pos), id = base.id + 'x' + M0.n, it, h; if (!a) return; it = a.item;
  delete RULES[id];
  EX[id] = {id: id, lab: base.lab + ' (another)', type: a.type, x: a.x, item: it, base: base.id, extra: true, pos: base.pos, aShown: false};
  var head = '<div class="xq q" data-q="' + id + '"><div class="xhead"><span class="xt">A similar one</span><span id="xs' + id + '">' + streakHtml(M0) + '</span></div><div class="stem" id="' + (it.type === 'parts' ? 'lx' : 'ln') + id + '"><span class="st">' + V.stem(it) + '</span></div>' + fig(it);
  if (it.type === 'parts') h = head + partHtml(Object.assign({}, a.x, {label: ''}), id, false, EX[id].lab, true) + '</div>';
  else if (it.type === 'solo') h = head + partHtml(a.x, id, true, EX[id].lab) + '</div>';
  else h = head + '<div class="mcp" data-host="' + id + '">' + choicesHtml(it, id, EX[id].lab, it.type === 'multi') + '</div></div>';
  var box = $('ag' + base.id); box.innerHTML = h; box.hidden = false;
  restoreOne(EX[id]); paintItem(EX[id]);
}
/* "Try a similar one" never brings a disapproved kind (approvals.js, 8 Nov 2026). A question of a disapproved kind can still be on
   the screen, in a set saved before (it keeps its questions): it gets a fresh one only where another kind of question at its
   place is approved — the kinds a place draws are read once, from the first sets. */
var KINDS = {};
function kindsAt(pos){
  var p = String(pos).split('.').slice(0, 2).join('.'); if (KINDS[p]) return KINDS[p];
  var out = []; for (var s = 1; s <= 120; s++){ var a = atPos(U.generate(s), pos); if (a){ var f = famKey(a.item); if (out.indexOf(f) < 0) out.push(f); } }
  return (KINDS[p] = out);
}
function similarOk(it){
  if (!it || !AP || !AP.any() || (it.item && it.item.bank) || !famOff(it.item)) return true;
  return kindsAt(it.pos).some(function(f){ return !AP.famHidden(f); });
}
function streakHtml(M0){ return M0.streak >= 3 ? ' <span class="streak">✓✓ ' + M0.streak + ' in a row</span>' : M0.streak === 2 ? ' <span class="streak">✓✓ 2 in a row — you’ve got this one</span>' : M0.streak === 1 ? ' <span class="streak">✓ one in a row</span>' : M0.earned ? ' <span class="streak">✓ point earned</span>' : ''; }
/* The run (24 Oct 2026; "several kids loved the streak"): first checks right on your own, in a row, across the set — the
   questions and their fresh ones alike, in the order they are checked. A wrong first check, or a right one after help, ends
   it; a second try changes nothing. Shown from two. The device keeps the unit's record run. */
function runStep(indep){ if (S.mode === 'test') return; if (indep){ S.run = (S.run || 0) + 1; if (S.run > (S.best || 0)) S.best = S.run; } else S.run = 0; }
function record_(){ return load('record') || {n: 0}; }
function runHtml(){ return S.mode === 'test' || !(S.run >= 2) ? '' : ' · <span class="nw streak">✓✓ ' + S.run + ' in a row</span>'; }   /* one atom for the translator: no span inside a span */   /* short: the bar is one phone line per piece; the record is told at the end */
function another(baseId){
  var b0 = byId(baseId); if (!b0 || !similarOk(b0)) return;
  var M0 = S.more[baseId] || (S.more[baseId] = {n: 0, seed: 0, streak: (load(String(b0.pos).indexOf('b:') === 0 ? 'bstreaks' : 'streaks') || {})[b0.pos] || 0, earned: !!res(b0).earned});
  if (b0.item && b0.item.bank){                                /* a lesson item: another unused item of the same lesson and kind */
    var seenB = M0.seen || (M0.seen = []); if (M0.bank && seenB.indexOf(M0.bank) < 0) seenB.push(M0.bank);
    var inSet = ITEMS.map(function(x){ return x.item && x.item.bank ? x.item.bank.id : null; }).filter(Boolean), nb = K.Bank.similar(b0, seenB, inSet);
    if (!nb) return;
    M0.n++; M0.bank = nb; seenB.push(nb); if (seenB.length > 40) seenB.shift(); save();
    mountExtra(b0); paintItem(b0);
    var nidB = baseId + 'x' + M0.n, inpB = $('a' + nidB) || document.querySelector('input[name="q' + nidB + '"]') || $('nlp' + nidB), elB = $('ag' + baseId);
    if (elB && elB.scrollIntoView) elB.scrollIntoView({block: 'nearest'}); if (inpB) inpB.focus({preventScroll: true});
    return;
  }
  M0.n++; var s, was = M0.seed ? U.key(atPos(U.generate(M0.seed), b0.pos).x) : null, base = U.key(b0.x), tries = 0, k;
  var seen = M0.seen || (M0.seen = []); if (was && seen.indexOf(was) < 0) seen.push(was);          /* never numbers served before (7 Nov 2026, item 2) */
  var ansOf = function(x){ try { return x && x.kind === 'nline' ? NL.keyText(NL.graphOf(x)) : U.keyText && x && x.kind !== 'mc' ? String(U.keyText(x)) : null; } catch(e){ return null; } }, baseAns = ansOf(b0.x), k2, a2;
  /* never a disapproved kind (approvals.js, 8 Nov 2026): the draw goes on until the kind is approved (similarOk said one is) */
  do { s = randomSeed(); tries++; a2 = atPos(U.generate(s), b0.pos); k2 = a2.x; k = U.key(k2); } while ((famOff(a2.item) && tries < 400) || ((s === seed || k === base || k === was || (seen.indexOf(k) >= 0 && tries < 40) || (baseAns != null && ansOf(k2) === baseAns)) && tries < 60));
  if (famOff(a2.item)){ M0.n--; if (!M0.n && !M0.seed) delete S.more[baseId]; return; }
  seen.push(k); if (seen.length > 40) seen.shift();   /* never the same question again — nor the same answer (30 Oct 2026: a Hint that ended "5 tanks" was followed by a fresh one whose answer was 5) */
  M0.seed = s; save();
  mountExtra(b0); paintItem(b0);
  var nid = baseId + 'x' + M0.n, inp = $('a' + nid) || document.querySelector('input[name="q' + nid + '"]') || $('nlp' + nid);
  var el = $('ag' + baseId); if (el && el.scrollIntoView) el.scrollIntoView({block: 'nearest'});
  if (inp) inp.focus({preventScroll: true});                                           /* [R1-2] */
}

/* ------------------------------------------------ marking and coaching */
function byIdBase(id){ for (var i = 0; i < ITEMS.length; i++) if (ITEMS[i].id === id) return ITEMS[i]; return null; }
function byId(id){ return byIdBase(id) || EX[id] || null; }
function answered(it){ var a = S.ans[it.id]; return it.type === 'multi' ? !!(a && a.length) : it.type === 'nline' ? !NL.empty(a) : a != null && String(a).trim() !== ''; }
/* the mode rides along (25 Oct 2026): on "Like the real test" a part done right from a wrong part (a) earns its point, as the
   printed test's follow-through line says (ruling 19); in practice the coach says fix part (a) first */
/* what the coach may know about a part: the student's part (a) and whether it is right yet, whether this is a fresh one
   ("Try another": no part (a) of its own), what has been shown, and the mode (30 Oct 2026: a fresh 16(b)'s Hint said
   "your part (a)", and 16(b)'s Show me how printed part (a)'s answer before (a) was right) */
function ctxOf(it){
  var sib = it.sib ? byId(it.sib) : null, prevOk = sib ? !!(S.res[sib.id] && S.res[sib.id].v === 'right') : null;   /* false until part (a) is checked right — unanswered counts as not right */
  return it.sib ? {prev: S.ans[it.sib], prevPart: it.sibPart, prevOk: prevOk, aShown: it.aShown, extra: !!it.extra, mode: S.mode} : {aShown: it.aShown, extra: !!it.extra, mode: S.mode};
}
function judgeAns(it, a, tries){
  if (it.type === 'nline'){ try { return NL.judge(it.x, a, ctxOf(it), U.judge.nline); } catch(e){ return {v: 'unread', what: ['Place the point, then choose a dot and an arrow.']}; } }
  if (it.type === 'multi' ? !(a && a.length) : (a == null || String(a).trim() === '')) return {v: 'blank', what: []};
  try {
    if (it.type === 'text'){ a = tidy(a); return equivUp(it, a, U.judge.text(it.x, a, ctxOf(it))); }
    if (it.type === 'mc') return U.judge.mc(it.x, +a);
    return U.judge.multi(it.x, a, (tries || 0) + 1);
  } catch(e){ return {v: 'unread', what: ['I can’t read that yet. Type just your answer.']}; }
}
function judge(it, tries){ return judgeAns(it, S.ans[it.id], tries); }
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
  var fm = formOf(it.x), r; if (!fm.key) return f;
  try { r = K.Ans.equiv(a, fm.key, fm); } catch(e){ return f; }
  if (!r || !r.ok) return f;
  var nudge = r.nudge ? esc(r.nudge) : f.v === 'form' && f.what && f.what[0] ? f.what[0] : '';   /* a unit's own "almost" words become the nudge */
  return {v: 'right', what: nudge ? [nudge] : [], equiv: true};
}
function res(it){ return S.res[it.id] || (S.res[it.id] = {tries: 0, first: null, v: null, shown: false, hinted: false, steps: 0}); }
function plainText(h){ var d = document.createElement('div'); d.innerHTML = h; return d.textContent; }
function sameAns(a, b){ return JSON.stringify(a == null ? '' : a) === JSON.stringify(b == null ? '' : b); }
function record(it, f, late){
  var R = res(it);
  if (R.v === 'right') return R;
  R.tries++; R.v = f.v; R.lastAns = S.ans[it.id];
  var indep = f.v === 'right' && R.tries === 1 && !R.hinted && !R.shown;            /* right on the first check, on your own */
  if (R.first === null){ R.first = (f.v === 'right'); R.helped = R.first && !!(R.hinted || R.shown); R.rungFirst = R.rung || 0; if (late) R.late = true; }   /* what happened on the first check: kept, never rewritten */
  if (R.tries === 1){
    var n = streakStep(it.pos, famOf(it), indep);                                    /* the one miss rule, base question or "another" */
    if (!late) runStep(indep);                                                        /* the run across the set (not a check Finish made) */
    if (it.extra){ var M0 = S.more[it.base], B = res(byId(it.base)); M0.streak = n; if (indep && S.mode !== 'test' && !B.earned){ B.earned = true; M0.earned = true; B.earnedBy = it.id; } }
    else R.earned = indep;                                                           /* the point: right on the first check with no help, or on a fresh one (above) */
  }
  return R;
}
function check(id){
  var it = byId(id); if (!it) return;
  if (S.mode === 'test' && !S.done && !it.extra) return;
  var R0 = S.res[it.id];
  if (R0 && R0.v && R0.v !== 'right' && sameAns(R0.lastAns, S.ans[it.id])){ paintItem(it); return; }   /* [R1-10] the same answer again is not another try */
  var f = judge(it, R0 ? R0.tries : 0);
  if (f.v === 'blank' || f.v === 'unread'){ flash(it, f); return; }
  if (!S.running && !S.done && !it.extra) start();
  delete FLASH[it.id];
  record(it, f); save(); paintItem(it); paintScore();
  if (it.extra){ var hd = $('xs' + it.id); if (hd) hd.innerHTML = streakHtml(S.more[it.base]); paintItem(byId(it.base)); }   /* the base question's card may now say 'point earned' */
  if (f.v === 'right'){ var nx = document.querySelector('[data-next="' + it.id + '"]') || $('mo' + it.id).querySelector('button') || $('fb' + it.id); if (nx){ if (!nx.matches('button')) nx.setAttribute('tabindex', '-1'); nx.focus({preventScroll: true}); } }   /* [J-5][R2-2] focus the one next action, never jump */
}
var TAG = {right: '<span class="tag ok">✓ Correct</span>', form: '<span class="tag fm">Almost</span>', wrong: '<span class="tag no">✗ Not yet</span>', unread: '<span class="tag fm">Not counted yet</span>'};
function flash(it, f){
  FLASH[it.id] = 1;
  $('fb' + it.id).innerHTML = f.v === 'blank' ? '<div class="fbx"><p>' + (it.type === 'text' ? 'Type an answer first.' : it.type === 'nline' ? 'Tap the number line to place the point first.' : 'Pick an answer first.') + '</p></div>'
    : '<div class="fbx"><p>' + TAG.unread + ' ' + (f.what[0] || '') + '</p></div>';
}
/* a choice's named misconception (7 Nov 2026, item 4; the survey after Diagnostic Questions: every distractor exposes one
   misconception). A unit gives it with view.why(x, k), or as the item's whys[k]; picking that wrong choice shows that line
   ("You added the exponents — for a power of a power, multiply them"). With neither, the coach's own words stand. */
function whyOf(x, k){ var w = ''; try { w = V.why ? V.why(x, k) || '' : ''; } catch(e){} if (!w && x && x.whys && x.whys[k]) w = x.whys[k]; return w; }
function namedWhat(it, R){
  if (R.v !== 'wrong') return null;
  if (it.type === 'mc'){ var w = whyOf(it.x, +R.lastAns); return w ? [w] : null; }
  if (it.type === 'multi'){
    var picked = (R.lastAns || []).map(Number), C = it.x.correct, bad = picked.filter(function(k){ return C.indexOf(k) < 0; }), missed = C.filter(function(k){ return picked.indexOf(k) < 0; });
    var names = bad.map(function(k){ return whyOf(it.x, k); });
    if (!bad.length || names.some(function(n){ return !n; })) return null;
    return names.concat(missed.length ? [missed.length === 1 ? 'One more choice is right too.' : missed.length + ' more choices are right too.'] : []);
  }
  return null;
}
function cardHtml(it, R, f){
  var v = R.v;
  if (v === 'right'){
    var own = R.first && !R.helped, line = R.late ? '✓ Correct — checked at Finish' : own ? (it.extra ? '✓ Correct on your own' : '✓ Correct on the first try') : R.first ? '✓ Correct' : R.shown ? '✓ Correct after seeing the steps' : '✓ Correct on try ' + R.tries;   /* [J-5] */
    var note = f && f.v === 'right' && f.what && f.what.length ? '<p class="note2">' + f.what.join(' ') + '</p>' : '';
    var pt = S.mode === 'test' ? '' : !it.extra && R.earned && !own ? ' <span class="tag ok">point earned</span>' : '';
    var next = S.mode === 'test' || own || R.earned || (it.extra && res(byId(it.base)).earned) ? '' : '<p class="note2">One on your own earns the point.</p>';
    return '<div class="fbx"><p><span class="tag ok">' + line + '</span>' + (R.first && R.helped && !R.late ? ' ' + bulb() : '') + pt + '</p>' + note + next + '</div>';
  }
  f = R.unreadMsg ? {what: [R.unreadMsg], rule: ''} : (f || {what: []});
  var nmd = R.unreadMsg ? null : namedWhat(it, R); if (nmd) f = {what: nmd, rule: f.rule};
  var w = (f.what || []).map(function(x){ return S.walkOpen[it.id] || R.rung ? String(x).replace(/,? or tap Hint to go one step at a time\./, '.').replace(/ Tap Hint[^.]*\./, '') : x; }), tag = TAG[v] || '';
  /* nothing named — no line, or the units' own "Not one of the usual slips." (which pointed to the rule paragraph that is Hint 1
     now) — the generic line, from Hint 1: "✗ Not yet  Look at: <what to notice>" (item 2) */
  var GEN = /^Not one of the usual slips\.\s*(?:Check each step against the rule below(?:, or tap Hint to go one step at a time)?\.|Tap Hint to go one step at a time\.)?\s*/;
  if ((v === 'wrong' || v === 'form') && (!w.length || GEN.test(String(w[0])))){ var nt = rungsOf(it).notice, rest = w.length ? String(w[0]).replace(GEN, '') : ''; if (nt) w = ['<b>Look at:</b> ' + nt + (rest ? ' ' + rest : '')].concat(w.slice(1)); }
  var body = w.length > 1 ? '<p>' + tag + '</p><ul>' + w.map(function(x){ return '<li>' + x + '</li>'; }).join('') + '</ul>' : '<p>' + tag + (w.length ? ' ' + w[0] : '') + '</p>';   /* [J-4] tag and diagnosis on one line; the rule is Hint 1 now (7 Nov 2026), not a second paragraph */
  return '<div class="fbx">' + body + '</div>';
}
function keyHtml(it){
  if (it.type === 'nline') return NL.keyHtml(it.x);
  if (it.type === 'mc') return '<b>' + LET[it.x.correct] + '.</b> ' + vOpt(it.x, it.x.correct);
  if (it.type === 'multi') return it.x.correct.map(function(k){ return '<b>' + LET[k] + '.</b> ' + vOpt(it.x, k); }).join('&nbsp;&nbsp; ');
  return it.x && it.x._ekey != null ? it.x._ekey : V.key(it.x);      /* a pinned test's tweaked key (teacher.js) */
}
function solOf(it){ try { var a = authored(it); return a && a.steps ? a.steps : U.solution(it.x, it.type, ctxOf(it)) || (it.type === 'nline' ? NL.rungs(it.x).steps : null); } catch(e){ return it.type === 'nline' ? NL.rungs(it.x).steps : null; } }
function authored(it){ try { var a = U.rungs ? U.rungs(it.x, it.type, ctxOf(it)) || null : null; return a || (it.type === 'nline' ? NL.rungs(it.x) : null); } catch(e){ return it.type === 'nline' ? NL.rungs(it.x) : null; } }
function picOf(it){ try { return V.picture(it.x, it.type) || ''; } catch(e){ return ''; } }
function stepsHtml(it, R){
  var sol = solOf(it), n = sol ? sol.length : 0, shown = Math.min(R.steps || 0, n);
  var pic = (shown >= n || R.v === 'right') ? picOf(it) : '';
  var h = (pic ? '<details class="why"' + (R.pic === false ? '' : ' open') + ' data-pic="' + it.id + '"><summary>See why it works</summary>' + pic + '</details>' : '');
  if (!sol) return h + '<div class="key"><span class="kl">Answer</span><span class="kv">' + keyHtml(it) + '</span></div>';
  var f = R.v && R.v !== 'right' ? lastFeedback(it) : null, off = f && f.step != null ? f.step : -1;
  var st = V.start(it.x, it.type); if (st) h += '<div class="solhead"><span class="kl">Start</span> ' + st + '</div>';
  h += '<ol class="sol">' + sol.slice(0, shown).map(function(s, i){
    return '<li class="' + (i === off ? 'off' : '') + '"><div class="say">' + s.say + '</div>' + (s.ex ? '<div class="ex">' + V.ex(it.x, s.ex, it.type) + '</div>' : '') +
      (i === off ? '<div class="offnote">⟵ This is the step where your answer went off.</div>' : '') + '</li>';
  }).join('') + '</ol>';
  if (shown >= n) h += '<div class="key"><span class="kl">Answer</span><span class="kv">' + keyHtml(it) + '</span></div>';
  return h;
}
/* ---- the help ladder (7 Nov 2026, the practice-test deepening, item 1; the survey after Khan: "a hint for each step … viewing
   all the hints gives a worked example"). Three rungs, each a button that opens the next; the rungs opened stay open:
     Hint 1 · What to notice — the unit's rule for this kind of question (the coach's "Next time" line),
     Hint 2 · The first step — the worked solution's first line (and "Step by step with me": the walkthrough, as before),
     Hint 3 · The worked solution — every line, one per line with a thin rule between them, the step where the student's answer
       went off, the picture, the answer (what "Show me how" was).
   A unit may write all three: Unit.rungs(x, type, ctx) → {notice, first: {say, ex}, steps: [{say, ex}]} (any of them; the rest
   are derived). The deepest rung opened is kept per attempt (R.rung; R.rungFirst is the rung open at the first check). The
   scoring rule is the same: a point is earned only on a first check with no rung open. */
var RULES = {};
function ruleOf(it){                                       /* the coach's rule for this question, as it gives it after a miss */
  if (Object.prototype.hasOwnProperty.call(RULES, it.id)) return RULES[it.id];
  var r = '';
  try {
    var probe = function(a){ var f = U.judge.text(it.x, a, ctxOf(it)); return f && f.rule || ''; };
    if (it.type === 'text') r = probe('987654') || probe('-987654') || probe('0');
    else if (it.type === 'nline') r = '';
    else if (it.type === 'mc'){ for (var k = 0; k < it.x.opts.length && !r; k++) if (k !== it.x.correct){ var f = U.judge.mc(it.x, k); r = f && f.rule || ''; } }
    else { var g = U.judge.multi(it.x, [], 1); r = g && g.rule || ''; }
  } catch(e){}
  return (RULES[it.id] = r);
}
function rungsOf(it){
  var a = authored(it) || {}, sol = solOf(it), w = walkOf(it), s0 = w && w[0], s1 = w && w[1];
  var stepOf = function(s){ return s ? {say: s.ask, got: s.type === 'choice' ? ((s.opts.filter(function(o){ return o.ok; })[0] || {}).label || '') : V.got(s), ex: s.then || null} : null; };
  var notice = a.notice || ruleOf(it) || (s0 ? s0.ask : '') || 'Read the question again: what does it ask for, and what do you know already?';
  var first = a.first || (sol && sol.length >= 2 ? sol[0] : s0 && s0.ask !== notice ? stepOf(s0) : s1 ? stepOf(s1) : sol && sol[0] ? sol[0] : null);
  return {notice: notice, first: first};
}
function rungBtn(it, to, after){
  var lab = after ? 'See the worked solution' : to === 1 ? 'Hint' : to === 2 ? 'Hint 2: the first step' : 'Hint 3: the whole solution';
  return '<button type="button" data-rung="' + it.id + '" data-to="' + to + '" aria-label="' + lab + ', question ' + esc(it.lab) + '">' + lab + '</button>';
}
var RH = ['', 'Hint 1 · What to notice', 'Hint 2 · The first step', 'Hint 3 · The worked solution'];
function ladderHtml(it, R){
  var g = rungsOf(it), n = Math.min(3, R.rung || 0), h = '<div class="helpl">';
  var head = function(k){ return '<div class="rung r' + k + '" id="rg' + it.id + '-' + k + '" tabindex="-1"><div class="rung-h">' + RH[k] + '</div>'; };
  if (n >= 1) h += head(1) + '<p class="rung-note">' + g.notice + '</p></div>';
  if (n >= 2){ var f = g.first;
    h += head(2) + (f ? '<div class="say">' + f.say + '</div>' + (f.got ? '<div class="wgot"><span class="wok">✓</span> ' + f.got + '</div>' : '') + (f.ex ? '<div class="ex">' + V.ex(it.x, f.ex, it.type) + '</div>' : '') : '') +
      (n < 3 && R.v !== 'right' && walkOf(it) && !S.walkOpen[it.id] ? '<div class="rung-walk"><button type="button" data-walk="' + it.id + '" aria-label="Step by step with me, question ' + esc(it.lab) + '">Step by step with me</button></div>' : '') + '</div>'; }
  if (n >= 3) h += head(3) + stepsHtml(it, R) + '</div>';
  if (n >= 1 && n < 3 && R.v !== 'right') h += '<div class="rung-next">' + rungBtn(it, n + 1) + '</div>';
  return h + '</div>';
}
function openRung(it, to){
  if (!it) return; var R = res(it); to = Math.max(1, Math.min(3, to | 0));
  if ((R.rung || 0) < to){
    R.rung = to;
    if (R.v !== 'right'){ R.hinted = true; if (to >= 3){ R.shown = true; if (R.first === null) R.first = false; } }   /* help before the point: the point then comes from one on your own */
    if (to >= 3){ var sol = solOf(it); R.steps = sol ? sol.length : 1; S.walkOpen[it.id] = false; }
    if (!S.running && !S.done && !it.extra) start();
    save(); paintItem(it); paintScore();
  }
  var el = $('rg' + it.id + '-' + to); if (el){ el.focus({preventScroll: true}); if (el.scrollIntoView) el.scrollIntoView({block: 'nearest'}); }
}
function lastFeedback(it){ var R = S.res[it.id]; return R && R.v ? judgeAns(it, R.lastAns, R.tries - 1) : null; }   /* [W-6] recomputed, never stored */
function hostOf(it){ return document.querySelector('[data-host="' + it.id + '"]'); }
function nextOpen(it){                                      /* the next part not yet right, after this one */
  var list = ITEMS, i = list.indexOf(it.extra ? byId(it.base) : it);
  for (var k = i + 1; k < list.length; k++){ var R = S.res[list[k].id]; if (!R || R.v !== 'right') return list[k]; }
  return null;
}
function paintItem(it){
  var host = hostOf(it); if (!host) return;
  var R = S.res[it.id], fb = $('fb' + it.id), mo = $('mo' + it.id), st = $('st' + it.id), wl = $('wl' + it.id);
  var testHidden = S.mode === 'test' && !S.done && !it.extra;
  ['is-right','is-wrong','is-form'].forEach(function(c){ host.classList.remove(c); });
  if (testHidden){ if (!FLASH[it.id]) fb.innerHTML = ''; mo.innerHTML = ''; var hs0 = $('hs' + it.id); if (hs0) hs0.innerHTML = ''; st.hidden = true; wl.hidden = true; paintChoices(it, null); return; }
  var sol = solOf(it), n = sol ? sol.length : 1;
  R = R || {tries: 0, v: null, steps: 0};
  if (R.v) host.classList.add(R.v === 'right' ? 'is-right' : R.v === 'form' ? 'is-form' : 'is-wrong');
  if (R.v){ fb.innerHTML = cardHtml(it, R, lastFeedback(it)); delete FLASH[it.id]; } else if (!FLASH[it.id]) fb.innerHTML = '';
  var b = [], rung = R.rung || ((R.steps || 0) >= n ? 3 : 0), all = rung >= 3, walkOn = S.walkOpen[it.id] && R.v !== 'right';
  var owed = S.mode !== 'test' && !R.earned && (R.v || R.shown || R.hinted);            /* the point is not earned yet: a fresh one is the way (24 Oct 2026) */
  if (R.v === 'right'){
    var nx = it.extra ? null : nextOpen(it);
    if (nx) b.push('<button type="button" class="' + (owed ? '' : 'go') + '" data-next="' + it.id + '" data-to="' + nx.id + '" aria-label="Next: question ' + nx.lab + '">Next ↓</button>');   /* one primary button: Try another when the point is owed */
    if (!all) b.push(rungBtn(it, 3, true));                                             /* after a right answer: the worked solution, one tap */
  }
  var missed = (R.v && R.v !== 'right') || R.shown || (R.v === 'right' && R.first === false);
  /* after a check that is not right (item 2; the survey after ALEKS: explain, then "Work on something else" or "Try again"):
     the card names the mistake, and exactly two buttons follow — a fresh one of the same kind (never the same numbers) or
     move on. No penalty question, ever: a fresh one replaces the last in the question's own box, and nothing is added to
     the set. The ladder stays beside Check for a second try. */
  var simB = function(base, go){ return '<button type="button"' + (go ? ' class="go"' : '') + ' data-another="' + base + '">Try a similar one</button>'; };
  var none = !similarOk(it.extra ? byId(it.base) : it);                                 /* every kind of this question is disapproved (approvals.js): no fresh one */
  if (R.v && R.v !== 'right'){ b = none ? ['<button type="button" class="go" data-moveon="' + (it.extra ? it.base : it.id) + '">Move on</button>'] : [simB(it.extra ? it.base : it.id, true), '<button type="button" data-moveon="' + (it.extra ? it.base : it.id) + '">Move on</button>']; }
  else if (none){}
  else if (!it.extra && (missed || owed) && !S.more[it.id]) b.push(simB(it.id, R.v === 'right' || all || owed));
  else if (it.extra && (R.v || R.shown)) b.push(simB(it.base, R.v === 'right' || !res(byId(it.base)).earned));
  /* the ladder's first rung sits beside Check ([D-8]); once open, the next rung's button is at the foot of the rungs */
  var hs = $('hs' + it.id); if (hs) hs.innerHTML = R.v !== 'right' && !rung ? rungBtn(it, 1) : '';
  mo.innerHTML = b.join('');
  st.hidden = !rung; if (rung) st.innerHTML = ladderHtml(it, R);
  wl.hidden = !walkOn; if (walkOn) wl.innerHTML = walkHtml(it);
  paintChoices(it, R.v ? R : null);
  var input = $('a' + it.id); if (input){ input.readOnly = R.v === 'right'; if (R.v === 'right' && keys.target === input) hideKeys(); }
  var btn = host.querySelector('[data-check="' + it.id + '"]'); if (btn){ btn.disabled = R.v === 'right';
    /* Check is the primary (navy, as button.go) — it was the greyest thing on the page — but one primary at a time: when
       "Try another like this" or "Next ↓" is the primary under this part, Check steps back (7 Nov 2026, the site review) */
    btn.classList.toggle('go', R.v !== 'right' && !mo.querySelector('button.go')); }
  /* a right answer locks this question's own choices — not the "Try another" mounted inside its box (23 Oct 2026: a
     student who got a select-all right on her second try asked for another; it opened locked, and she could not touch it) */
  if (it.type !== 'text' && it.type !== 'nline') Array.prototype.forEach.call(host.querySelectorAll('.ch input'), function(x){ if (x.closest('[data-host]') === host) x.disabled = R.v === 'right'; });
}
function paintChoices(it, R){
  if (it.type === 'nline') nlPaint(it);
  if (it.type === 'text' || it.type === 'nline') return;
  it.x.opts.forEach(function(o, k){
    var ch = $('ch' + it.id + LET[k]); if (!ch) return; ch.classList.remove('picked-no', 'is-key');
    if (!R) return;
    var sol = solOf(it), all = sol && R.steps >= sol.length;
    var picked = it.type === 'mc' ? String(R.lastAns) === String(k) : (R.lastAns || []).map(Number).indexOf(k) >= 0;
    var isKey = it.type === 'mc' ? k === it.x.correct : it.x.correct.indexOf(k) >= 0;
    if (R.v === 'right' || all){ if (isKey) ch.classList.add('is-key'); }
    else if (picked && it.type === 'mc' && R.v === 'wrong') ch.classList.add('picked-no');
  });
}
function paintSections(){                                  /* [J-5] each section counts up as the student works */
  if (!DS) return;
  DS.forEach(function(sec, di){
    var el = $('sp' + di); if (!el) return;
    var its = ITEMS.filter(function(x){ return x.sec === di; }), done = its.filter(function(x){ var R = S.res[x.id]; return R && R.v === 'right'; }).length;
    el.textContent = (S.mode === 'test' && !S.done) || (!done && !S.done) ? sec.pts + ' point' + (sec.pts === 1 ? '' : 's') : done + ' / ' + sec.pts + (done === sec.pts ? ' ✓' : '');
    el.classList.toggle('alldone', done === sec.pts);
  });
}

/* ------------------------------------------------ the Hint: the question as a few small questions, one at a time */
function walkPic(it, lead){ var p = picOf(it); return p ? '<div class="wpic"><div class="wpl">' + lead + '</div>' + p + '</div>' : ''; }
function walkOf(it){ try { return U.walk(it.x, it.type, ctxOf(it)); } catch(e){ return null; } }
function wstate(it){ return S.walk[it.id] || (S.walk[it.id] = {i: 0, wrong: {}, typed: {}, bad: {}, miss: {}, gave: {}}); }
function walkHtml(it){
  var st = walkOf(it); if (!st) return '';
  var W = wstate(it); W.miss = W.miss || {}; W.gave = W.gave || {};
  var h = '<div class="wkhead"><b>Hint' + (W.i < st.length ? ' · step ' + (W.i + 1) + ' of ' + st.length : '') + '</b><button type="button" class="wclose" data-wclose="' + it.id + '" aria-label="Close the hint for ' + it.lab + '">Close</button></div>';   /* [J-7] */
  var s0 = V.start(it.x, it.type); if (s0) h += '<div class="solhead"><span class="kl">Start</span> ' + s0 + '</div>';
  h += '<ol class="wsteps">';
  st.forEach(function(s, k){
    if (k > W.i) return;
    var cur = k === W.i;
    h += '<li class="' + (cur ? 'cur' : 'done') + '"><div class="wask">' + s.ask + '</div>';
    if (!cur){
      var got = s.type === 'choice' ? s.opts.filter(function(o){ return o.ok; })[0].label : V.got(s);
      h += '<div class="wgot"><span class="wok">✓</span> ' + got + (W.gave[k] ? ' <span class="wgave">(shown)</span>' : '') + '</div>';
      if (s.then) h += '<div class="ex">' + V.ex(it.x, s.then, it.type) + '</div>';
    } else if (s.type === 'choice'){
      h += '<div class="wopts">' + s.opts.map(function(o, j){ var bad = W.wrong[k + '.' + j];
        return '<button type="button" class="wopt' + (bad ? ' bad' : '') + '" data-wopt="' + it.id + '|' + k + '|' + j + '"' + (bad ? ' disabled' : '') + '>' + o.label + '</button>'; }).join('') + '</div>';
      if (W.bad[k] != null) h += '<div class="wwhy"><span class="wno">✗</span> ' + s.opts[W.bad[k]].why + '</div>' + (s.pic ? walkPic(it, 'Here is a picture of why:') : '');
    } else {
      h += '<div class="wnum"><input type="text" id="wn' + it.id + '" autocomplete="off" autocapitalize="off" spellcheck="false" value="' + esc(W.typed[k] || '') + '" aria-label="Your answer to this step"><button type="button" class="go" data-wnum="' + it.id + '">Check</button></div>';
      if (W.bad[k] === 'read') h += '<div class="wwhy"><span class="wq">?</span> Type just a number, like 12 or 28.26.</div>';
      else if (W.bad[k] != null) h += '<div class="wwhy"><span class="wno">✗</span> Not quite. ' + s.hint + '</div>' + (s.pic ? walkPic(it, 'Here is a picture that shows it:') : '');
      if ((W.miss[k] || 0) >= 2) h += '<div class="wgive"><button type="button" data-wgive="' + it.id + '">Show this step</button></div>';   /* [R1-3] never a dead end */
    }
    h += '</li>';
  });
  h += '</ol>';
  if (W.i >= st.length && picOf(it)) h += '<details class="why" open><summary>See why it works</summary>' + picOf(it) + '</details>';
  if (W.i >= st.length) h += '<p class="wfin done">' + keyHtml(it) + '</p>';
  return h;
}
function walkFocus(it){
  var wl = $('wl' + it.id); if (!wl) return;
  var t = wl.querySelector('li.cur .wopt:not([disabled])') || wl.querySelector('#wn' + it.id) || wl.querySelector('.wclose');
  if (t) t.focus({preventScroll: true});
}
function walkStart(it){ var R = res(it); if (R.v !== 'right') R.hinted = true;                  /* help before the point: the point then comes from one on your own */ S.walkOpen[it.id] = true; wstate(it); if (!S.running && !S.done && !it.extra) start(); save(); paintItem(it); paintScore(); walkFocus(it); }
function walkPick(id, k, j){ var it = byId(id), st = walkOf(it), W = wstate(it), s = st[k]; if (k !== W.i) return;
  if (s.opts[j].ok){ W.i++; delete W.bad[k]; } else { W.wrong[k + '.' + j] = 1; W.bad[k] = j; }
  save(); paintItem(it); walkFocus(it); }
function walkNum(id){ var it = byId(id), st = walkOf(it), W = wstate(it), s = st[W.i]; if (!s || s.type !== 'num') return;
  var el = $('wn' + id), v = U.readNum(el.value); W.typed[W.i] = el.value; W.miss = W.miss || {};
  if (v && U.numOk(s, v)){ delete W.bad[W.i]; W.i++; }
  else { W.bad[W.i] = v ? 1 : 'read'; if (v) W.miss[W.i] = (W.miss[W.i] || 0) + 1; }
  save(); paintItem(it); walkFocus(it); }
function walkGive(id){ var it = byId(id), W = wstate(it); W.gave = W.gave || {}; W.gave[W.i] = 1; delete W.bad[W.i]; W.i++; save(); paintItem(it); walkFocus(it); }

/* ------------------------------------------------ clicks */
document.addEventListener('click', function(e){
  var t = e.target && e.target.closest ? e.target : null; if (!t) return;
  var b = t.closest('[data-check]'); if (b){ check(b.dataset.check); return; }
  var rg = t.closest('[data-rung]'); if (rg){ openRung(byId(rg.dataset.rung), +rg.dataset.to); return; }
  var nx = t.closest('[data-next]'); if (nx){ var to = byId(nx.dataset.to), host = to && hostOf(to);
    if (host){ host.scrollIntoView({block: 'center', behavior: 'smooth'}); var f = fieldOf(host, to.id); if (f) f.focus({preventScroll: true}); } return; }
  var an = t.closest('[data-another]'); if (an){ another(an.dataset.another); return; }
  var mv = t.closest('[data-moveon]'); if (mv){ var mb = byId(mv.dataset.moveon), mn = mb && nextOpen(mb), mh = mn && hostOf(mn);
    if (mh){ mh.scrollIntoView({block: 'center', behavior: 'smooth'}); var mf = fieldOf(mh, mn.id); if (mf) mf.focus({preventScroll: true}); }
    else { var bf = $('bFinish'); if (bf && !bf.hidden) bf.focus(); }
    return; }
  var wa = t.closest('[data-walk]'); if (wa){ walkStart(byId(wa.dataset.walk)); var wl = $('wl' + wa.dataset.walk); if (wl && wl.scrollIntoView) wl.scrollIntoView({block: 'nearest'}); return; }
  var wo = t.closest('[data-wopt]'); if (wo){ var pr = wo.dataset.wopt.split('|'); walkPick(pr[0], +pr[1], +pr[2]); return; }
  var wn = t.closest('[data-wnum]'); if (wn){ walkNum(wn.dataset.wnum); return; }
  var wg = t.closest('[data-wgive]'); if (wg){ walkGive(wg.dataset.wgive); return; }
  var wc = t.closest('[data-wclose]'); if (wc){ var itc = byId(wc.dataset.wclose); S.walkOpen[itc.id] = false; save(); paintItem(itc); var hb = document.querySelector('[data-walk="' + itc.id + '"]'); if (hb) hb.focus({preventScroll: true}); return; }
  var jm = t.closest('[data-jump]'); if (jm){ var ji = byId(jm.dataset.jump), jh = ji && hostOf(ji); if (jh){ jh.scrollIntoView({block: 'center'}); var jf = fieldOf(jh, ji.id); if (jf) jf.focus({preventScroll: true}); } return; }
  var nw = t.closest('[data-new]'); if (nw){ var sc = nw.dataset.scope || scope;
    var go = function(){ goSet(randomSeed(), sc, 'practice'); };                     /* [R2-N2] the results' buttons always practise with checking */
    if (started() && !S.done) ask('Leave this set? It stays saved on this device.', 'Leave', go); else go(); return; }
});
document.addEventListener('toggle', function(e){ var d = e.target; if (d && d.dataset && d.dataset.pic){ var it = byId(d.dataset.pic); if (it){ res(it).pic = d.open; save(); } } }, true);

/* ------------------------------------------------ typing */
/* the keypad (7 Nov 2026, item 7; the survey after MathLive's virtual keyboard): compact, and only on a touch screen
   (pointer: coarse) — a keyboard has these keys. The unit's keys for the box's kind (−, /, ^, ( ), π, ×·, ≤ …), and beside a
   fraction bar the fraction template, which writes ()/() with the caret in the top; each inserts at the caret. 44 px keys,
   above the box in the page's flow, so they never cover the box or its Check row. A unit with no keypad at all gets the
   kit's: − / a/b ^ ( ) π ×.
   Even and tidy (8 Nov 2026; Croix, of an A7 Unit 6 lesson set on his phone: "Can you fix the symbols across everything so that
   they are even looking not like stretching across the screen. It's sloppy."): the keys are in one stable order, operations
   first (− × / a/b ^ √ π), then grouping and relations (( ) = < ≤ ≥ >), a little more space between the two groups where they
   share a row; every key keeps its own fixed size (44 × 44, a wider label its own width) and is never stretched; the block
   starts where the box starts, and the keys go into as few rows as fit beside the box, split evenly (14 keys in two rows are
   7 + 7, nine are 5 + 4: never a long row and a stray key), one row whenever they fit. A lesson item's keys are the unit's
   (bank.js, from build.py's KIT_KEYSET): the same on every lesson item of the unit, so a key never hints at an answer; and
   the practice test's own keys (by kind, as before) are only those an answer of the unit can use. */
var KEYPAD = (U.keypad == null ? [{label: '−', say: 'minus', ins: function(){ return '-'; }}, {label: '/', say: 'fraction bar'}, {label: '^', say: 'power'}, {label: '(', say: 'open parenthesis'}, {label: ')', say: 'close parenthesis'}, {label: 'π', say: 'pi'}, {label: '×', say: 'times', ins: function(){ return '*'; }}] : U.keypad).slice();
(function(){ var fi = -1; KEYPAD.forEach(function(k, i){ if (fi < 0 && k.label === '/' && /fraction/i.test(k.say || '')) fi = i; });
  if (fi >= 0 && !KEYPAD.some(function(k){ return k.tpl; })) KEYPAD.splice(fi + 1, 0, {label: 'a/b', say: 'a fraction', tpl: 'frac', kinds: KEYPAD[fi].kinds}); })();
if (K.Bank) KEYPAD = KEYPAD.concat(K.Bank.keypad);              /* a lesson item's box: the unit's keys, after the unit's own (bank.js) */
/* only the unit's keys (8 Nov 2026): a key no answer of the unit can use is left out (window.KIT_KEYSET, build.py; "× 10^" needs × and ^,
   "xⁿ" a power, the fraction template a fraction bar); a key the list does not speak of is kept */
var KSET = window.KIT_KEYSET || null, KNOWN = ['−', '×', '/', 'a/b', '^', '√', 'π', '.', '(', ')', '=', '<', '≤', '≥', '>'];
function used(k){ if (!KSET) return true; var need = k.label === '× 10^' ? ['×', '^'] : k.label === 'xⁿ' ? ['^'] : [k.label]; return need.every(function(x){ return KNOWN.indexOf(x) < 0 || KSET.indexOf(x) >= 0; }); }
KEYPAD = KEYPAD.filter(used);
/* the one order: operations, then grouping and relations; a key the kit does not know goes at the end of the operations */
var KORDER = ['−', '×', '× 10^', '/', 'a/b', '^', 'xⁿ', '√', 'π', '.', '(', ')', '=', '<', '≤', '≥', '>'], KREL = KORDER.indexOf('(');
function krank(k){ var i = KORDER.indexOf(k.label); return i < 0 ? KREL - 0.5 : i; }
KEYPAD = KEYPAD.map(function(k, i){ return [k, i]; }).sort(function(a, b){ return krank(a[0]) - krank(b[0]) || a[1] - b[1]; }).map(function(x){ return x[0]; });
function coarse(){ try { return !!(window.matchMedia && matchMedia('(pointer: coarse)').matches); } catch(e){ return false; } }
var keys = document.createElement('div'); keys.className = 'keys'; keys.hidden = true;
var KEYBTNS = KEYPAD.map(function(k){ var b = document.createElement('button'); b.type = 'button'; if (k.tpl) { b.className = 'ktpl'; b.innerHTML = '<span class="kfr" aria-hidden="true"><i></i><i></i></span>'; } else { b.textContent = k.label; if (k.label.length > 2) b.className = 'kwide'; } if (k.kinds) b.dataset.kinds = k.kinds.join(' '); b.tabIndex = -1; b.setAttribute('aria-label', 'Insert ' + (k.say || k.label)); b.dataset.k = k.label; b.dataset.g = krank(k) < KREL ? 'op' : 'rel'; keys.appendChild(b); return b; });   /* [R1-9] not a tab stop */
/* the rows: the keys this box shows, in as few rows as fit between the box's left edge and the row's right edge, split evenly */
var KGAP = 6, KGROUP = 14;
function px(v){ return parseFloat(v) || 0; }
function layoutKeys(t){
  var vis = KEYBTNS.filter(function(b){ return !b.hidden; });
  keys.textContent = ''; var flat = document.createElement('div'); flat.className = 'krow'; keys.appendChild(flat);
  KEYBTNS.forEach(function(b){ b.classList.remove('kgap'); flat.appendChild(b); });
  keys.style.marginLeft = '0px';
  var host = keys.parentNode, hr = host.getBoundingClientRect(), hs = getComputedStyle(host), x0 = hr.left + px(hs.paddingLeft) + px(hs.borderLeftWidth);
  var ir = t.getBoundingClientRect(), row = t.closest('.ans') || t.parentNode, rr = row.getBoundingClientRect();
  var left = Math.max(0, Math.round(ir.left - x0)); keys.style.marginLeft = left + 'px';
  var W = Math.floor(Math.min(Math.max(rr.right, ir.right), x0 + host.clientWidth - px(hs.paddingLeft) - px(hs.paddingRight)) - (x0 + left));
  var w = vis.map(function(b){ return b.getBoundingClientRect().width; }), g = vis.map(function(b){ return b.dataset.g; }), n = vis.length;
  var fits = function(a, z){ var s = 0; for (var i = a; i < z; i++) s += w[i] + (i > a ? (g[i] !== g[i - 1] ? KGROUP : KGAP) : 0); return s <= W + 0.5; };
  var sizes = [n];
  for (var r = 1; r <= n; r++){
    var q = Math.floor(n / r), extra = n % r, sz = [], a = 0, ok = true;
    for (var j = 0; j < r; j++) sz.push(q + (j < extra ? 1 : 0));
    for (j = 0; j < r && ok; j++){ ok = fits(a, a + sz[j]); a += sz[j]; }
    sizes = sz; if (ok) break;
  }
  keys.textContent = ''; var at = 0;
  sizes.forEach(function(m){ var rw = document.createElement('div'); rw.className = 'krow';
    for (var i = at; i < at + m; i++){ if (i > at && g[i] !== g[i - 1]) vis[i].classList.add('kgap'); rw.appendChild(vis[i]); }
    at += m; keys.appendChild(rw); });
  var last = keys.lastChild || keys.appendChild(document.createElement('div')); KEYBTNS.forEach(function(b){ if (b.hidden) last.appendChild(b); });   /* the keys this box does not show stay in the keypad */
}
keys.addEventListener('pointerdown', function(e){ var kb = e.target.closest && e.target.closest('[data-k]'); if (kb) e.preventDefault(); });
keys.addEventListener('click', function(e){
  var kb = e.target.closest && e.target.closest('[data-k]'), lab = kb && kb.dataset.k, el = keys.target; if (!lab || !el || el.readOnly) return;
  var k = KEYPAD.filter(function(x){ return x.label === lab; })[0], ins = k.tpl ? '()/()' : k.ins ? k.ins(el.dataset.kind) : lab, at = k.tpl ? 1 : ins.length, a = el.selectionStart, b = el.selectionEnd;
  if (a == null){ a = b = el.value.length; }
  el.value = el.value.slice(0, a) + ins + el.value.slice(b); el.focus(); try { el.setSelectionRange(a + at, a + at); } catch(x){}
  el.dispatchEvent(new Event('input', {bubbles: true}));
});
function setPreview(el){ var pv = el.parentNode.querySelector('.pv'); if (!pv) return; var p = ''; try { p = V.pretty(el.value, el.dataset.kind) || ''; } catch(e){} pv.innerHTML = p; }
/* the keypad moves to the box being typed in and otherwise stays where it is: hiding it when a button takes focus moved
   the page under the finger, so the tap missed (found in the kit's page check). When it moves, the page is scrolled by
   the same amount, so the box just tapped stays put under the finger [R1-9]. */
document.addEventListener('focusin', function(e){
  var t = e.target;
  if (!(t.matches && t.matches('#paper input[type=text]') && !t.readOnly && !(t.id && t.id.indexOf('wn') === 0) && KEYPAD.length)) return;
  if (!coarse()){ hideKeys(); keys.target = null; return; }                               /* a mouse and a keyboard: no keypad (item 7) */
  if (keys.target === t && !keys.hidden) return;
  /* only the keys this kind of answer uses (a unit's keypad entry may name its kinds); none → no keypad */
  var kind = t.dataset.kind || '', shown = 0;
  KEYBTNS.forEach(function(b){ var ks = b.dataset.kinds; b.hidden = kind === 'bank' ? !(ks && ks.split(' ').indexOf('bank') >= 0) : !!ks && ks.split(' ').indexOf(kind) < 0; if (!b.hidden) shown++; });
  if (!shown){ hideKeys(); keys.target = null; return; }
  var y0 = t.getBoundingClientRect().top;
  var row = t.closest('.ans') || t.parentNode; keys.target = t; row.parentNode.insertBefore(keys, row); keys.hidden = false;
  layoutKeys(t);
  var dy = t.getBoundingClientRect().top - y0; if (dy) window.scrollBy(0, dy);
});
/* a turned phone or a resized window: the same keys, laid out again for the new width, the box kept where it was */
window.addEventListener('resize', function(){ var t = keys.target; if (keys.hidden || !t || !document.body.contains(t)) return; var y0 = t.getBoundingClientRect().top; layoutKeys(t); var dy = t.getBoundingClientRect().top - y0; if (dy) window.scrollBy(0, dy); });
function hideKeys(){ if (keys.hidden) return; var a = document.activeElement, y0 = a && a.getBoundingClientRect ? a.getBoundingClientRect().top : null; keys.hidden = true; if (y0 != null){ var dy = a.getBoundingClientRect().top - y0; if (dy) window.scrollBy(0, dy); } }
document.addEventListener('input', function(e){
  var t = e.target;
  if (!t.id || t.id.charAt(0) !== 'a' || !t.closest('#paper')) return;
  var it = byId(t.id.slice(1)); if (!it) return;
  if (!S.running && !S.done && !it.extra) start();
  S.ans[it.id] = t.value; setPreview(t);
  if (FLASH[it.id]){ delete FLASH[it.id]; paintItem(it); }                                /* [R1-1] the old note goes when they type */
  var rd = $('rd' + it.id); if (rd) rd.textContent = '';
  save(); paintProgress(); paintScore(true);
});
document.addEventListener('change', function(e){
  var t = e.target;
  if (t.id && t.id.charAt(0) === 'a' && t.closest('#paper') && S.mode === 'test' && !S.done){       /* [W-7] test mode: say only "can't read this yet", nothing about right or wrong */
    var it0 = byId(t.id.slice(1)); if (it0 && !it0.extra){ var f0 = judge(it0, 0), rd = $('rd' + it0.id); if (rd) rd.innerHTML = f0.v === 'unread' ? '<span class="kl">Can’t read this yet:</span> ' + esc(plainText(f0.what[0] || '')) : ''; }
  }
  if (!t.name || t.name.charAt(0) !== 'q' || !t.closest('#paper')) return;
  var id = t.name.slice(1), it = byId(id); if (!it) return;
  if (!S.running && !S.done && !it.extra) start();
  if (t.type === 'radio') S.ans[id] = t.value;
  else S.ans[id] = Array.prototype.map.call(document.querySelectorAll('input[name="q' + id + '"]:checked'), function(x){ return x.value; });
  if (FLASH[id]){ delete FLASH[id]; paintItem(it); }
  save(); paintProgress(); paintScore();
});
document.addEventListener('keydown', function(e){
  if (e.key === 'Escape' && !$('confirm').hidden){ closeAsk(); var bf = $('bFinish'); if (bf) bf.focus(); return; }
  if (e.key === 'Enter' && e.target.id && e.target.id.indexOf('wn') === 0){ e.preventDefault(); walkNum(e.target.id.slice(2)); return; }
  if (e.key === 'Enter' && e.target.matches && e.target.matches('#paper input[type=text]')){ e.preventDefault(); var it = byId(e.target.id.slice(1)); if (it && (S.mode === 'practice' || S.done || it.extra)) check(it.id); }
});

/* ------------------------------------------------ the clock and the score */
function now(){ return Date.now(); }
function elapsed(){ return S.acc + (S.running && S.startedAt ? (now() - S.startedAt) / 1000 : 0); }
function fmt(s){ s = Math.max(0, Math.floor(s)); var m = Math.floor(s / 60), r = s % 60; return m + ':' + (r < 10 ? '0' : '') + r; }   /* [R2-N8] whole seconds */
function start(){ if (S.running || S.done) return; S.running = true; S.startedAt = now(); save(); paintBar(); }
function pause(){ if (!S.running) return; S.acc = elapsed(); S.running = false; S.startedAt = null; save(); paintBar(); }
function tally(){
  var first = 0, helped = 0, done = 0, earned = 0, bySec = DS.map(function(){ return {got: 0, of: 0, help: 0, earned: 0, alone: 0}; });
  ITEMS.forEach(function(it){ var R = S.res[it.id]; bySec[it.sec].of++; if (R && R.first === true){ first++; bySec[it.sec].got++; if (R.helped){ helped++; bySec[it.sec].help++; } else bySec[it.sec].alone++; } if (R && R.earned){ earned++; bySec[it.sec].earned++; } if (R && R.v === 'right') done++; });
  return {first: first, helped: helped, done: done, earned: earned, bySec: bySec};
}
/* "Question 4 of 16" (7 Nov 2026, item 5): where the student is, as words and a thin navy bar in the bar area (never a ring) —
   the question holding the focus, else the first one on the screen. Questions, not parts; a fresh one is not counted. */
function cards(){ return Array.prototype.slice.call(document.querySelectorAll('#paper .q[data-q]:not(.xq)')); }
function paintProgress(){
  var qs = cards(), N = qs.length, a = document.activeElement, cur = a && a.closest && a.closest('#paper') ? a.closest('.q[data-q]:not(.xq)') || (a.closest('.xq') && a.closest('.xq').parentNode.closest('.q[data-q]:not(.xq)')) : null;
  var i = cur ? qs.indexOf(cur) : -1;
  if (i < 0){ var top = document.querySelector('.watch').getBoundingClientRect().bottom + 8, lim = Math.max(top + 40, window.innerHeight * 0.35);
    for (var k = 0; k < N; k++){ var r = qs[k].getBoundingClientRect(); if (r.bottom > lim){ i = k; break; } } if (i < 0) i = N - 1; }
  var n = N ? i + 1 : 0, q = $('qof'); if (q) q.textContent = N ? 'Question ' + n + ' of ' + N : '';
  $('prog').style.width = (N ? 100 * n / N : 0) + '%';
  return ITEMS.filter(answered).length;
}
var progRaf = 0; window.addEventListener('scroll', function(){ if (progRaf) return; progRaf = requestAnimationFrame(function(){ progRaf = 0; if (DS) paintProgress(); }); }, {passive: true});
document.addEventListener('focusin', function(e){ if (DS && e.target && e.target.closest && e.target.closest('#paper')) paintProgress(); });
function paintScore(light){
  var t = tally(), sc = $('score'), N = ITEMS.length, nb = function(s){ return '<span class="nw">' + s + '</span>'; };
  if (S.mode === 'test' && !S.done) sc.innerHTML = nb('<b>' + ITEMS.filter(answered).length + ' of ' + N + '</b> answered') + ' · ' + nb('marked when you finish');
  else if (!Object.keys(S.res).length && !S.done) sc.innerHTML = nb('<b>' + N + '</b> part' + (N === 1 ? '' : 's') + ' to answer');
  else sc.innerHTML = nb('<b>' + t.earned + '</b> ' + (S.mode === 'test' ? 'right' : 'earned')) + (t.helped ? bulb(t.helped) : '') + ' · ' + nb('<b>' + t.done + '</b> of ' + N + ' done') + runHtml();   /* [J-2]; the points earned on your own (24 Oct 2026) */
  if (light) return;
  paintResult(t); paintScopes(); paintSections();
}
function paintBar(){
  $('time').textContent = fmt(elapsed());
  var started0 = elapsed() > 0;
  /* the clock is shown only in "Like the real test" (7 Nov 2026, the site review: Croix: "Ok sounds well thought out.
     Proceed."). In "Check as I go" it still runs — the end panel's time and the saved history are as before — but the time,
     and its Pause and Resume, are not shown; the next answer starts it again after the page was put away, as before. */
  var testMode = S.mode === 'test'; document.body.classList.toggle('mode-test', testMode);
  $('bPause').hidden = S.done || !S.running || !testMode;                                /* [J-2] Pause only while it runs */
  $('bResume').hidden = S.done || S.running || !started0 || !testMode;
  $('bFinish').hidden = S.done || !ITEMS.length;
  $('bFinish').textContent = S.mode === 'test' ? 'Finish & mark' : 'Finish';
  document.body.classList.toggle('hidechk', S.mode === 'test' && !S.done);
  Array.prototype.forEach.call(document.querySelectorAll('.mode button'), function(b){ b.setAttribute('aria-pressed', String(b.dataset.mode === S.mode)); });
}
function hist(){ return load('hist') || {}; }
function paintResult(t){
  var box = $('result');
  if (!S.done){ box.hidden = true; return; }
  var N = ITEMS.length, test = S.mode === 'test';
  var rows = DS.map(function(s, k){ return '<tr><td>' + s.title + '</td><td class="r">' + (test ? t.bySec[k].got : t.bySec[k].earned) + ' / ' + t.bySec[k].of + '</td>' + (test ? '' : '<td class="r">' + t.bySec[k].got + '</td><td class="r">' + t.bySec[k].help + '</td>') + '</tr>'; }).join('');
  var notYet = ITEMS.filter(function(it){ var R = S.res[it.id]; return !R || R.v !== 'right'; });
  var weak = {}; DS.forEach(function(s, k){ if (scope === 'all' && t.bySec[k].of && t.bySec[k].got / t.bySec[k].of < 0.8 && s.si != null && s.si >= 0 && G0.sections[s.si]) weak[s.si] = 1; });   /* by the unit's section (a section whose every kind is disapproved is not drawn) */
  var nm = Object.keys(misses()).length, perfect = t.earned === N && N > 0, alone = perfect && t.first === N && !t.helped;
  /* "Try a new set" (7 Nov 2026, the site review): what New set does behind Set · Change — a new random set, this practice
     choice and this mode (My misses opens the whole test, as New set does). In "Check as I go" on the whole test it is the
     same as New whole test, so it takes that button's place (and its primary) rather than standing beside its twin. */
  var twin = scope === 'all' && !test, newSet = function(go){ return '<button type="button"' + (go ? ' class="go"' : '') + ' data-newset="1">Try a new set</button>'; };
  var btns = lessonScope(scope) ? '<button type="button" class="go" data-new="1" data-scope="' + esc(scope) + '">Another set from this lesson</button><button type="button" data-new="1" data-scope="all">The whole practice test</button>' : perfect ? (twin ? newSet(true) : '<button type="button" class="go" data-new="1" data-scope="all">New whole test</button>' + newSet(false))
    : (nm ? '<button type="button" class="go" data-new="1" data-scope="miss">Practice my misses (' + nm + ')</button>' : '') +
      Object.keys(weak).map(function(k){ return '<button type="button" data-new="1" data-scope="p' + (+k + 1) + '">Practice: ' + esc(G0.sections[+k].title) + '</button>'; }).join('') +
      (twin ? newSet(!nm) : '<button type="button"' + (nm ? '' : ' class="go"') + ' data-new="1" data-scope="all">New whole test</button>' + newSet(false));
  var hk = scope + '.' + S.mode, H = hist()[hk] || [], prev = H.filter(function(x){ return !(x.seed === seed && x.at === S.finishedAt); })[0];
  var pe = prev ? (prev.earned == null ? prev.first : prev.earned) : 0;
  /* "Since last time: up / down / the same" (item 5; the survey after Khan's session summary), from this device's history of
     the same practice choice and mode — as a share of the points when the sets differ in size */
  var dir = prev ? (prev.of === N ? Math.sign(t.earned - pe) : Math.sign(t.earned / N - pe / prev.of)) : 0;
  var lastLine = prev ? '<p class="last since">Since last time: <b>' + (dir > 0 ? 'up' : dir < 0 ? 'down' : 'the same') + '</b> — ' + pe + ' / ' + prev.of + ' then, ' + t.earned + ' / ' + N + ' today.</p>' : '';   /* [J-10] */
  /* per skill — the unit's sections — as text and an icon, never colour alone (item 5; the survey after ALEKS's labelled
     pie): Secure at 80% or more right on the first check with no help, Getting there at 50%, else Not yet */
  var ICON = function(fill){ return '<svg class="ci" viewBox="0 0 12 12" aria-hidden="true"><circle cx="6" cy="6" r="4.6" fill="none" stroke="currentColor" stroke-width="1.6"/>' + (fill === 2 ? '<circle cx="6" cy="6" r="4.6" fill="currentColor"/>' : fill === 1 ? '<path d="M6 1.4a4.6 4.6 0 0 1 0 9.2z" fill="currentColor"/>' : '') + '</svg>'; };   /* empty, half, full: a shape as well as a word */
  var LV = [['not', 'Not yet', 0], ['get', 'Getting there', 1], ['sec', 'Secure', 2]];
  var chips = '<ul class="skills" aria-label="By skill">' + DS.map(function(s, k){ var b = t.bySec[k], pc = b.of ? b.alone / b.of : 0, lv = LV[pc >= 0.8 ? 2 : pc >= 0.5 ? 1 : 0];
    return '<li class="chip ' + lv[0] + '"><span class="cpill">' + ICON(lv[2]) + '<b class="cl2">' + lv[1] + '</b></span><span class="cs">' + s.title + '</span><span class="cn">' + b.alone + ' / ' + b.of + '</span></li>'; }).join('') + '</ul>';
  var firstLine = test ? '' : '<p class="last">Right on the first try: ' + t.first + ' / ' + N + (t.helped ? ' ' + bulb(t.helped) : '') + '</p>';
  /* effort, beside correctness and never mixed with it (item 1; the survey after Mathspace's effort stars): how each question
     was worked — on your own, with a hint (rung 1 or 2, or the walkthrough), or after the worked solution (rung 3) — before
     it was right. A help opened after a right answer is not counted. */
  var ef = effort(), effortLine = test ? '' : '<p class="last effort">Solved without help: <b>' + ef.own + '</b> · With a hint: <b>' + ef.hint + '</b> · Saw the solution: <b>' + ef.saw + '</b></p>';
  var rec = record_(), runLine = test || !(S.best >= 2) ? '' : '<p class="last">Best run this set: <b>' + S.best + '</b> in a row' + (S.newRecord ? ' — a new record' : rec.n > S.best ? ' · your record: ' + rec.n : '') + '</p>';
  box.innerHTML = '<h2>Set ' + seed + ' · ' + esc(SCOPES[scope]) + ' · ' + (test ? 'Like the real test' : 'Check as I go') + '</h2>' +
    '<div class="big"><div><b>' + t.earned + '<small> / ' + N + '</small></b><span>' + (test ? 'right' : 'points earned on your own') + '</span></div><div><b>' + fmt(S.acc) + '</b><span>time on the clock</span></div></div>' +
    firstLine + effortLine + runLine + lastLine +
    (alone ? '<p class="perfect">Every one on the first try.</p>' : perfect ? '<p class="perfect">Every point earned.</p>' : '') + chips +
    '<div class="tw"><table><thead><tr><th>Section</th><th class="r">' + (test ? 'Right' : 'Earned') + '</th>' + (test ? '' : '<th class="r">First try</th><th class="r">' + bulb() + '</th>') + '</tr></thead><tbody>' + rows + '</tbody></table></div>' +
    (notYet.length ? '<p class="note"><span class="nry">Not right yet:</span> ' + notYet.map(function(it){ return '<button type="button" class="jump" data-jump="' + it.id + '">' + it.lab + '</button>'; }).join(' ') + '</p>' +
      '<p class="note"><b>Hint</b> goes one step at a time, up to the worked solution; <b>Try a similar one</b> gives you a fresh one.</p>' : '') +
    '<div class="btns">' + btns + '</div>';
  box.hidden = false;
}
function effort(){
  var own = 0, hint = 0, saw = 0;
  ITEMS.forEach(function(it){
    var Rs = Object.keys(S.res).filter(function(k){ return k === it.id || (k.indexOf(it.id + 'x') === 0 && /^\d+$/.test(k.slice(it.id.length + 1))); }).map(function(k){ return S.res[k]; });
    var R0 = S.res[it.id];
    if (Rs.some(function(R){ return R && R.shown; })) saw++;
    else if (Rs.some(function(R){ return R && R.hinted; })) hint++;
    else if (R0 && (R0.v === 'right' || R0.earned)) own++;
  });
  return {own: own, hint: hint, saw: saw};
}
function finish(){
  if (S.done) return;                                                                  /* [R2-1] */
  closeAsk();
  if (S.running) S.acc = elapsed(); S.running = false; S.startedAt = null; S.done = true; S.finishedAt = now();
  ITEMS.forEach(function(it){
    var R = res(it);
    if (R.v === 'right') return;
    if (S.mode === 'test' || (R.tries === 0 && answered(it))){                           /* [R2-N1] a typed answer never checked is marked now */
      var f = judge(it, R.tries);
      if (f.v === 'blank' || f.v === 'unread'){ if (S.mode === 'test'){ R.first = false; R.v = 'wrong'; R.tries = Math.max(1, R.tries); R.lastAns = S.ans[it.id]; R.unreadMsg = f.v === 'blank' ? 'Left blank.' : (f.what[0] || 'Could not read the answer.'); var ms = misses(); ms[it.pos] = famOf(it); store('misses', ms); } else if (R.first === null) R.first = false; }
      else record(it, f, S.mode !== 'test');
    } else if (R.first === null){ R.first = false; R.skipped = true; streakStep(it.pos, famOf(it), false); }   /* skipped in practice: on My misses, like a miss (24 Oct 2026) */
  });
  if (S.mode !== 'test' && (S.best || 0) >= 2 && S.best > record_().n){ store('record', {n: S.best, seed: seed, at: S.finishedAt}); S.newRecord = true; }   /* the device's record run for this unit */
  var t = tally(), H = hist(), hk = scope + '.' + S.mode;
  H[hk] = [{seed: seed, first: t.first, earned: t.earned, of: ITEMS.length, time: S.acc, at: S.finishedAt}].concat(H[hk] || []).slice(0, 5); store('hist', H);
  save(); paintAll(); window.scrollTo(0, 0); var rb = $('result'); if (rb){ rb.setAttribute('tabindex', '-1'); rb.focus({preventScroll: true}); }
}

/* ------------------------------------------------ sets */
function ask(text, yes, fn){
  var c = $('confirm'); c.hidden = false; document.body.classList.add('asking');            /* [R2-N6] one Finish on screen at a time */
  c.innerHTML = '<span>' + text + '</span><button type="button" class="go" id="cy">' + yes + '</button><button type="button" id="cn">Keep working</button>';
  $('cy').onclick = function(){ closeAsk(); fn(); }; $('cn').onclick = function(){ closeAsk(); var bf = $('bFinish'); if (bf) bf.focus(); };
  $('cy').focus();
}
function closeAsk(){ var c = $('confirm'); c.hidden = true; c.innerHTML = ''; document.body.classList.remove('asking'); }
function started(){ return elapsed() > 0 || ITEMS.some(answered) || Object.keys(S.res).length > 0; }
function goSet(n, sc, mode){ if (mode && S) S.mode = mode; location.hash = hashOf(n, sc); if (fromHash() && (fromHash().seed !== seed || fromHash().scope !== scope)) openSet(n, sc, mode); }   /* [R1-16] Back returns to the set before */
var NOTICE = '';
function openSet(n, sc, mode){
  if (S) pause();
  closeAsk();
  var keepMode = mode || (S && S.mode) || 'practice';
  seed = n; scope = SCOPES[sc] ? sc : 'all';
  var saved = load(key());
  if (scope === 'miss' && !(saved && saved.res)){ var pos = Object.keys(misses()); if (!pos.length){ scope = 'all'; saved = load(key()); } }
  S = fresh(keepMode);
  var loaded = !!(saved && saved.res && saved.schema === SCHEMA); if (loaded){ S = earnedOf(saved); if (!S.eh) S.eh = {h: []}; }   /* a set saved before any kind was disapproved keeps all its questions */
  if (scope === 'miss' && !S.pos) S.pos = Object.keys(misses());
  S.more = S.more || {}; S.walk = S.walk || {}; S.walkOpen = S.walkOpen || {}; S.running = false; S.startedAt = null; FLASH = {};
  render(); paintHead();
  NOTICE = '';
  if (loaded && S.hash && S.hash !== HASHV){ var m0 = S.mode, p0 = S.pos; S = fresh(m0); if (p0) S.pos = p0; render(); NOTICE = 'This set was updated since you last opened it, so it starts fresh.'; }   /* [W-2] never old answers on new questions; only for a set this device saved before [B2] */
  S.hash = HASHV;
  try { history.replaceState(null, '', hashOf(seed, scope)); } catch(e){}
  LSEED = 0;
  restore(); save(); paintAll(); window.scrollTo(0, 0);
  $('notice').textContent = NOTICE; $('notice').hidden = !NOTICE;
  var h1 = $('h1'); if (h1 && document.activeElement && document.activeElement !== document.body && !(document.activeElement.closest && document.activeElement.closest('#paper'))) { h1.setAttribute('tabindex', '-1'); h1.focus({preventScroll: true}); }
}
function earnedOf(rec){                                   /* a set saved before 24 Oct 2026: the point as it was then scored, never rewritten */
  Object.keys(rec.res || {}).forEach(function(k){ var R = rec.res[k]; if (R && R.earned === undefined && !/x\d+$/.test(k)) R.earned = R.first === true && !R.helped;
    if (R && R.rung == null){ if (R.steps > 0) R.rung = 3; else if (R.hinted) R.rung = 1; } });   /* a set saved before the ladder (7 Nov 2026): Show me how was the worked solution, the Hint the first help */
  return rec;
}
function restoreOne(it){
  var a = S.ans[it.id]; if (a == null) return;
  if (it.type === 'text'){ var el = $('a' + it.id); if (el){ el.value = a; setPreview(el); } }
  else if (it.type === 'nline') nlPaint(it);
  else (it.type === 'mc' ? [a] : a).forEach(function(v){ var x = document.querySelector('input[name="q' + it.id + '"][value="' + v + '"]'); if (x) x.checked = true; });
}
function restore(){ ITEMS.forEach(restoreOne); }
function paintAll(){ paintScopes(); paintBar(); paintProgress(); ITEMS.forEach(paintItem); Object.keys(EX).forEach(function(k){ paintItem(EX[k]); }); paintScore(); }
$('bPause').addEventListener('click', pause);
$('bResume').addEventListener('click', start);
$('bFinish').addEventListener('click', function(){
  var left = ITEMS.length - ITEMS.filter(answered).length;
  ask((left ? left + ' of ' + ITEMS.length + ' still blank. ' : '') + (S.mode === 'test' ? 'Stop the clock and mark everything?' : 'Stop the clock and see your score?'), 'Yes, finish', finish);
});
Array.prototype.forEach.call(document.querySelectorAll('.mode button'), function(b){
  b.addEventListener('click', function(){
    var m = b.dataset.mode; if (m === S.mode) return;
    var go = function(){ var pos = S.pos; drop(key()); S = fresh(m); if (pos) S.pos = pos; render(); S.hash = HASHV; save(); paintAll(); };
    if (started()) ask('Switching starts this set over. Your answers will be cleared.', 'Switch', go); else go();
  });
});
$('scope').addEventListener('change', function(){ var v = this.value; if (v === scope) return; moreClose();
  var to = v === 'all' ? (scope === 'all' ? seed : (load('lastAll') || seed)) : randomSeed();   /* [R2-N3] one part or misses: new numbers; back to the whole test you were on [B6] */
  var go = function(){ goSet(to, v); };
  if (started() && !S.done) ask('Switch to “' + SCOPES[v] + '”? This set stays saved on this device.', 'Switch', go); else go();
  $('scope').value = scope; });
$('setgo').addEventListener('click', function(){ var v = Math.floor(+$('setin').value); if (v >= 1 && v <= 99999){ moreClose(); goSet(v, scope); } else { $('setin').value = seed; } });
$('setin').addEventListener('keydown', function(e){ if (e.key === 'Enter'){ e.preventDefault(); $('setgo').click(); } });
function newSet(){ var go = function(){ goSet(randomSeed(), scope === 'miss' ? 'all' : scope); }; if (started() && !S.done) ask('Leave this set for a new one? This one stays saved on this device.', 'New set', go); else go(); }
$('bNew').addEventListener('click', function(){ moreClose(); newSet(); });
document.addEventListener('click', function(e){ if (e.target && e.target.closest && e.target.closest('[data-newset]')) newSet(); });   /* the end panel's "Try a new set" */
$('bAgain').addEventListener('click', function(){ moreClose(); ask('Clear your answers to this set and start it again?', 'Start over', function(){ var m = S.mode, pos = S.pos; drop(key()); S = fresh(m); if (pos) S.pos = pos; render(); S.hash = HASHV; save(); paintAll(); window.scrollTo(0, 0); }); });
/* Ruling 49 (22 Oct 2026): on a unit whose test is a random set of this page, the teacher bar (teacher.js) prints the
   TEST as n forms — the make-up printing, headed "Test · Form A" instead of "Make-up" (the set number on the key only,
   25 Oct 2026). Teacher copies only. */
window.PracticePrint = {forms: function(n, label, mc){ if (teacherPage()) showPrint((mc ? 'mc' : 'mk') + Math.min(5, Math.max(1, n | 0)), label || 'Test'); }};
/* the teacher copy's tools (teacher.js: Approve questions, Tests A and B) draw with this page: a teacher page only */
if (teacherPage()) window.PracticeKit = {famKey: famKey, partsOf: partsOf, textType: textType, keyHtml: function(it){ return keyHtml(it); }, sample: sampleOf, form: pinnedForm, canMC: canMC, mcOf: mcOf,
  qid: function(si, ii, item){ return qidOf(si, ii, item); }, plain: plainText, LET: LET, sections: G0.sections.map(function(s, si){ return {title: s.title, si: si, n: s.items.length}; })};
window.addEventListener('hashchange', function(){ var h = fromHash(); if (h && (h.seed !== seed || h.scope !== scope)) openSet(h.seed, h.scope); });
window.addEventListener('storage', function(e){                                       /* [R2-N4] two tabs on one set stay in step — without writing back [B1] */
  if (e.key !== PRE + key() || !e.newValue) return;
  var rec; try { rec = JSON.parse(e.newValue); } catch(x){ return; }
  if (!rec || rec.schema !== SCHEMA || rec.hash !== HASHV || (S.at && rec.at && rec.at <= S.at)) return;
  var y = window.scrollY, f = document.activeElement && document.activeElement.id;
  S = earnedOf(rec); S.running = false; S.startedAt = null; FLASH = {};
  render(); restore(); paintAll(); window.scrollTo(0, y); if (f && $(f)) $(f).focus({preventScroll: true});
});
setInterval(function(){ if (S && S.running) $('time').textContent = fmt(elapsed()); }, 250);
window.addEventListener('pagehide', function(){ if (S && S.running){ S.acc = elapsed(); S.startedAt = now(); save(); } });
document.addEventListener('visibilitychange', function(){ if (document.hidden && S && S.running) pause(); });   /* the clock stops when the page is put away */

/* ------------------------------------------------ print (Croix, 16 Oct 2026: "Can I get the ability to print?")
   Print opens a choice: the set as a paper worksheet, the worksheet with its answer key, or this student's results. The
   printout is the same set as the screen (the same items, drawn by the same view functions; the key is the same key the
   page marks with), shown first as a preview with its own Print button. With Português on, its lines print too. */
function pq(d, qn){
  var it = d.it, h = '<div class="pq"><div class="pqh">' + qidHtml(qidOf(d.si, d.ii, it), 'pqid') + '<div class="stem"><b class="num">' + qn + '.</b><span class="st">' + V.stem(it) + '</span></div>' + fig(it) + '</div>';   /* the stem and its figure stay together; parts may go to the next page */
  var line = function(p, lab){ return '<div class="line">' + (lab ? '<b class="lab">' + lab + '.</b>' : '') + '<span class="st">' + V.line(p) + '</span></div>'; };
  var blank = function(p){ var u = V.unit(p), pre = V.pre(p); return '<div class="pans"><span class="pal bt">Answer:</span> ' + (pre ? '<span class="pre">' + pre + '</span>' : '') + (V.blank ? V.blank(p) || '<span class="pblank"></span>' : '<span class="pblank"></span>') + (u ? ' <span class="unit">' + esc(u) + '</span>' : '') + '</div><div class="pwork"></div>'; };
  var choices = function(x){ return '<div class="pchoices">' + x.opts.map(function(o, k){ return '<div class="pch"><span class="pbox' + (it.type === 'multi' ? ' sq' : '') + '"></span><span class="cl">' + LET[k] + '.</span><span class="cv">' + V.opt(x, k) + '</span></div>'; }).join('') + '</div>'; };
  if (it.type === 'parts') it.parts.forEach(function(p, pi){ if (d.keep && !d.keep[pi]) return; h += '<div class="ppart">' + line(p, p.label) + (p.kind === 'mc' ? choices(p) : p.kind === 'nline' ? NL.blankHtml(p) : blank(p)) + '</div>'; });
  else if (it.type === 'solo') h += '<div class="ppart">' + (it.part.kind === 'nline' ? line(it.part, '') + NL.blankHtml(it.part) : blank(it.part)) + '</div>';
  else h += '<div class="ppart">' + choices(it) + '</div>';
  return h + '</div>';
}
function printHead(title){
  return '<div class="phead"><div class="pt1"><span class="bt">' + esc(U.title) + '</span></div><div class="pt2"><span class="bt">' + title + '</span></div>' +
    '<div class="pname"><span class="bt">Name:</span><span class="pline"></span><span class="bt">Date:</span><span class="pline short"></span><span class="bt">Period:</span><span class="pline short"></span></div></div>';   /* the paper's Name, Date and Period (ruling 54) */
}
function setLine(){ return 'Set ' + seed + ' · ' + esc(SCOPES[scope]); }
function worksheetHtml(){
  var h = [printHead(setLine())], qn = 0;
  var pnotes = U.notesPrint || U.notes;                       /* paper is not a keyboard: a unit may give notes for print */
  if (pnotes && pnotes.length) h.push('<p class="pnotes">' + pnotes.map(function(n){ return '<span class="pinote">' + n + '</span>'; }).join(' ') + '</p>');
  /* a section's name never prints alone at the foot of a page: it is kept with its first question (.pkeep; Croix, 14 Nov 2026) */
  DS.forEach(function(sec){ h.push('<div class="pkeep"><h2 class="psec"><span class="bt">' + sec.title + '</span></h2>'); sec.items.forEach(function(d, i){ qn++; h.push(pq(d, qn) + (i ? '' : '</div>')); }); if (!sec.items.length) h.push('</div>'); });
  return h.join('');
}
function keyListHtml(){
  var rows = ITEMS.map(function(it){ var q = qidOfItem(it); return '<tr><td class="pk">' + esc(it.lab) + '</td><td class="kv">' + keyHtml(it) + '</td><td class="pid" translate="no">' + (q ? q.id : '') + '</td></tr>'; }).join('');
  return '<div class="pkey"><h2 class="psec"><span class="bt">Answer key</span></h2><p class="pmeta"><span class="bt">' + setLine() + '</span></p><table class="ptab"><tbody>' + rows + '</tbody></table></div>';
}
function yourAnswer(it){
  var a = S.ans[it.id];
  if (it.type === 'text') return a == null || String(a).trim() === '' ? '' : esc(a);
  if (it.type === 'nline') return NL.empty(a) ? '' : NL.svg(it.x, a, {mode: 'key', cls: 'nl-small'}) + '<span class="nlkw">' + esc(NL.say(it.x, a)) + '</span>';
  if (it.type === 'mc') return a == null ? '' : '<b>' + LET[+a] + '.</b> ' + V.opt(it.x, +a);
  return (a || []).map(function(k){ return '<b>' + LET[+k] + '.</b> ' + V.opt(it.x, +k); }).join('; ');
}
function verdict(it){
  var R = S.res[it.id];
  if (!R || !R.v) return answered(it) ? 'Not checked' : 'Blank';
  if (R.v === 'right') return (R.late ? '✓ Right at Finish' : R.first && !R.helped ? '✓ First try' : R.first ? '✓ First check ' + bulb() : R.shown ? '✓ After seeing the steps' : '✓ On try ' + R.tries) + (R.earned && !(R.first && !R.helped) && S.mode !== 'test' ? ' · point earned' : '');
  return R.v === 'form' ? 'Almost' : '✗ Not yet';
}
function resultsHtml(){
  var t = tally(), N = ITEMS.length, test = S.mode === 'test';
  var h = printHead('Results') + '<p class="pmeta"><span class="bt">' + setLine() + ' · ' + (test ? 'Like the real test' : 'Check as I go') + '</span></p>';
  h += '<p class="pscore"><span class="bt"><b>' + t.earned + ' / ' + N + '</b> ' + (test ? 'right' : 'points earned on your own') + '</span>' + (test ? '' : '<span class="bt">' + t.first + ' / ' + N + ' right on the first try' + (t.helped ? ' ' + bulb(t.helped) : '') + '</span>') + '<span class="bt">' + t.done + ' of ' + N + ' done · time on the clock ' + fmt(elapsed()) + '</span>' +
    (S.done ? '' : '<span class="bt">Not finished yet.</span>') + '</p>';
  h += '<table class="ptab pres"><thead><tr><th><span class="bt">Section</span></th><th class="r"><span class="bt">' + (test ? 'Right' : 'Earned') + '</span></th></tr></thead><tbody>' +
    DS.map(function(s, k){ return '<tr><td><span class="bt">' + s.title + '</span></td><td class="r">' + (test ? t.bySec[k].got : t.bySec[k].earned) + ' / ' + t.bySec[k].of + '</td></tr>'; }).join('') + '</tbody></table>';
  h += '<table class="ptab pans2"><thead><tr><th>#</th><th><span class="bt">Your answer</span></th><th><span class="bt">Result</span></th><th><span class="bt">Correct answer</span></th></tr></thead><tbody>' +
    ITEMS.map(function(it){ var R = S.res[it.id], ok = R && R.v === 'right'; return '<tr class="' + (ok ? 'ok' : 'no') + '"><td class="pk">' + esc(it.lab) + '</td><td>' + yourAnswer(it) + '</td><td><span class="bt">' + verdict(it) + '</span></td><td class="kv">' + keyHtml(it) + '</td></tr>'; }).join('') + '</tbody></table>';
  return h;
}
/* Make-up tests print from the teacher copy only (Croix, 21 Oct 2026: "I don't want the students to be able to print the
   make up tests"). A teacher build is the one with the real test in it (test.js sets TEACHER_TEST before this script). */
function teacherPage(){ return !!window.TEACHER_TEST; }
function printMenu(){
  var test = S.mode === 'test' && !S.done;
  ask0('What do you want to print?', [
    ['ws', 'Worksheet'], ['wk', 'Worksheet + answer key']].concat(teacherPage() ? [['mk', 'Make-up tests']].concat(canMC() ? [['mc', 'Make-up tests, all multiple choice']] : []) : []).concat([
    ['res', 'My results', test ? 'In “Like the real test” the results print after Finish.' : '']]));
}
/* Make-up tests (Croix, 18 Oct 2026: "print tests or make ups directly from here… I'll need it to print the answer key too"):
   one to five forms, each a different set of the WHOLE unit, headed as a test with a name line and its form letter; every
   form's answer key follows on its own page, labelled with the form letter and set number so the teacher keeps the keys. */
function makeupMenu(mc){ var k = mc ? 'mc' : 'mk'; ask0('How many different forms?', [[k + '1', '1'], [k + '2', '2'], [k + '3', '3'], [k + '4', '4'], [k + '5', '5']]); }
function withSet(s, fn){                                   /* run fn with the page's data drawn from set s, then put everything back */
  var o = {seed: seed, scope: scope, G: G, DS: DS, ITEMS: ITEMS, EX: EX, H: HASHV}, out;
  seed = s; scope = 'all'; CURCOMP = true;
  try { DS = build(); ITEMS = []; EX = {}; collect(); out = fn(); }
  finally { seed = o.seed; scope = o.scope; G = o.G; DS = o.DS; ITEMS = o.ITEMS; EX = o.EX; HASHV = o.H; CURCOMP = false; }
  return out;
}
function collect(){                                        /* the items of DS, as render() lists them, without touching the page */
  var qn = 0;
  DS.forEach(function(sec, di){ sec.items.forEach(function(d){
    if (d.out) return;                                     /* a question the teacher left off a pinned test (teacher.js): no number, no point */
    var it = d.it; qn++;
    if (it.type === 'parts'){
      var shown = it.parts.filter(function(p, pi){ return !d.keep || d.keep[pi]; }).length, lone = shown === 1 && it.parts.length > 1;
      it.parts.forEach(function(p, pi){ if (d.keep && !d.keep[pi]) return; var id = qn + p.label;
        ITEMS.push({id: id, lab: lone ? String(qn) : id, sec: di, type: textType(p), x: p, item: it, pos: posKey(d.si, d.ii, pi), aShown: true, k: d.k}); });
    } else if (it.type === 'solo'){ var id1 = String(qn); ITEMS.push({id: id1, lab: id1, sec: di, type: textType(it.part), x: it.part, item: it, pos: posKey(d.si, d.ii, -1), aShown: true, k: d.k}); }
    else { var id2 = String(qn); ITEMS.push({id: id2, lab: id2, sec: di, type: it.type === 'multi' ? 'multi' : 'mc', x: it, item: it, pos: posKey(d.si, d.ii, -1), aShown: true, k: d.k}); }
  }); });
}
/* a pinned test's own words (teacher.js, Tests A and B, 8 Nov 2026): a question the teacher tweaked carries them — its words
   (_est), a part's line (_eln), a part's key (_ekey), a choice's words (_eopt); teacher.js has cleaned them to the kit's own markup.
   Everything else is the unit's. Only the items of a pinned form ever carry them. */
function vStem(it){ return it && it._est != null ? it._est : V.stem(it); }
function vLine(p){ return p && p._eln != null ? p._eln : V.line(p); }
function vOpt(x, k){ return x && x._eopt && x._eopt[k] != null ? x._eopt[k] : V.opt(x, k); }
/* ---- an all-multiple-choice test (Croix, 14 Nov 2026: "I'd like the retakes that I print up to be all multiple choice").
   A teacher copy's make-up tests and its Tests A and B can print with every part as a choice of four: a typed part's three
   wrong answers are the unit's own mistakes (Unit.choices(part) → the wrong answers as its key would show them, the likeliest
   first: its coach's mistake models, so every wrong choice is what a named slip gives); a number line to graph becomes four
   graphs — the key, its arrow turned round, its dot changed, and both (Croix chose "pick from 4 graphs"). The right choice's
   place comes from the question itself (mcOrder), so the paper and its key, printed a week apart, agree. A choice that reads
   as the key, or as another choice, is dropped here whatever the unit gave; a part left with fewer than three wrong choices
   prints as it was written, with its work space. A choice question, and a select-all, are untouched. Paper only: the page a
   student answers on never offers it. */
var ALLMC = false;
function canMC(){ return typeof U.choices === 'function'; }
function mcHash(s){ var h = 2166136261; for (var i = 0; i < s.length; i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function mcOrder(n, s){                                     /* 0..n-1 in an order fixed by the words s */
  var a = [], h = mcHash(s), i, j, t; for (i = 0; i < n; i++) a.push(i);
  for (i = n - 1; i > 0; i--){ h = (Math.imul(h, 1664525) + 1013904223) >>> 0; j = (h >>> 8) % (i + 1); t = a[i]; a[i] = a[j]; a[j] = t; }
  return a;
}
function mcSame(h){ return plainText(h).replace(/\s+/g, '').replace(/−/g, '-'); }
function mcOf(p){
  if (!p || p.kind === 'mc' || !canMC()) return null;
  var all, tag;
  try {
    if (p.kind === 'nline'){
      var g = NL.graphOf(p), turn = g.dir === 'left' ? 'right' : 'left';
      if (!NL.complete(g)) return null;
      all = [g, {c: g.c, closed: g.closed, dir: turn}, {c: g.c, closed: !g.closed, dir: g.dir}, {c: g.c, closed: !g.closed, dir: turn}]
        .map(function(x){ return '<span class="pnlc">' + NL.svg(p, x, {mode: 'key'}) + '</span>'; });
      tag = 'nline:' + NL.keyText(g);
    } else {
      var key = p._ekey != null ? p._ekey : V.key(p), seen = [mcSame(key)], wrong = [];
      (U.choices(p) || []).forEach(function(h){ var t = typeof h === 'string' ? mcSame(h) : ''; if (!t || seen.indexOf(t) >= 0 || wrong.length >= 3) return; seen.push(t); wrong.push(h); });
      if (wrong.length < 3) return null;
      all = [key].concat(wrong); tag = seen[0];
    }
  } catch(e){ return null; }
  var ord = mcOrder(4, String(U.key(p)) + '|' + (p.label || '') + '|' + tag);
  return {opts: ord.map(function(k){ return all[k]; }), correct: ord.indexOf(0), nline: p.kind === 'nline'};
}
function mcChoices(p){                                      /* a part's four choices on the paper, or '' when it stays as written */
  var m = ALLMC ? mcOf(p) : null; if (!m) return '';
  return (m.nline ? '' : '<div class="pwork pwmc"></div>') + '<div class="pchoices pmc ' + (m.nline ? 'pgr' : 'p2') + '">' + m.opts.map(function(o, k){ return '<div class="pch"><span class="pbox"></span><span class="cl">' + LET[k] + '.</span><span class="cv">' + o + '</span></div>'; }).join('') + '</div>';
}
function mcKey(it){                                         /* its row on the key: the letter, then the answer */
  var m = ALLMC && (it.type === 'text' || it.type === 'nline') ? mcOf(it.x) : null;
  return m ? '<b>' + LET[m.correct] + '.</b> ' + (m.nline ? NL.keyHtml(it.x) : m.opts[m.correct]) : '';
}
/* A printed test form — a ruling-49 test or a make-up — has the paper's shape (A7 Unit 6's review, 25 Oct 2026): the points
   on the head, on every section and on every part; the show-your-work and follow-through lines the paper prints (from the
   teacher copy's TEACHER_TEST); work space and no answer line (house rule 2). The student's sheet carries NO set number: the
   student page opens any set with its worked answers (#set-N), so a set number on a test is its answer key. The number is on
   the teacher's key, with a score tracker by benchmark. */
function pqTest(d, qn){
  var it = d.it, one = '<span class="pt">1 pt</span>';
  var h = '<div class="pq"' + (d.k != null ? ' data-k="' + d.k + '"' : '') + '><div class="pqh">' + qidHtml(qidOf(d.si, d.ii, it), 'pqid') + '<div class="stem"><b class="num">' + qn + '.</b><span class="st">' + vStem(it) + '</span>' + (it.type === 'parts' ? '' : one) + '</div>' + fig(it) + '</div>';
  var line = function(p, lab){ return '<div class="line">' + (lab ? '<b class="lab">' + lab + '.</b>' : '') + '<span class="st">' + vLine(p) + '</span>' + one + '</div>'; };
  var choices = function(x){ return '<div class="pchoices">' + x.opts.map(function(o, k){ return '<div class="pch"><span class="pbox' + (it.type === 'multi' ? ' sq' : '') + '"></span><span class="cl">' + LET[k] + '.</span><span class="cv">' + vOpt(x, k) + '</span></div>'; }).join('') + '</div>'; };
  if (it.type === 'parts') it.parts.forEach(function(p, pi){ if (d.keep && !d.keep[pi]) return; h += '<div class="ppart" data-p="' + pi + '">' + line(p, p.label) + (p.kind === 'mc' ? choices(p) : mcChoices(p) || (p.kind === 'nline' ? NL.blankHtml(p) : '<div class="pwork"></div>')) + '</div>'; });
  else if (it.type === 'solo') h += '<div class="ppart" data-p="0">' + (it.part.kind === 'nline' ? '<div class="line"><span class="st">' + vLine(it.part) + '</span></div>' + (mcChoices(it.part) || NL.blankHtml(it.part)) : mcChoices(it.part) || '<div class="pwork"></div>') + '</div>';
  else h += '<div class="ppart" data-p="0">' + choices(it) + '</div>';
  return h + '</div>';
}
function testFormHtml(label, form){
  var T = window.TEACHER_TEST || {}, h = [], qn = 0, total = ITEMS.length;
  /* ruling 54 (25 Oct 2026): the title says what it is ("A7 Unit 6 Test", "… Make-up Test"); the line under it, the unit's
     name, the form and the points — and "two class periods" for a two-period test; a one-period test says nothing about
     its length (Croix, 25 Oct 2026: "I don't need that text at all") — as the paper's head and teacher.js's */
  var when = T.two_day ? 'two class periods' : '';
  h.push('<div class="phead"><div class="pt1 ptest"><span class="bt">' + esc(U.title).replace(/\s*Practice Test\b/i, label === 'Test' ? ' Test' : ' ' + label + ' Test') + '</span></div>' +
    '<div class="pt2"><span class="bt">' + [plainText(U.h1 || ''), 'Form ' + form, total + ' points', when].filter(Boolean).map(esc).join(' · ') + '</span></div>' +
    '<div class="pname"><span class="bt">Name:</span><span class="pline"></span><span class="bt">Date:</span><span class="pline short"></span><span class="bt">Period:</span><span class="pline short"></span></div></div>');
  /* each of the paper's lines once: the teacher copy's ("Show your work…", the π line), then the unit's print notes; a unit
     that prints the scoring lines itself (M7 Unit 10's notesPrint) does not get them twice, and the follow-through line
     prints under its sections, as on the paper (teacher.js), not again here */
  var said = [], notes = [], same = function(x){ return plainText(x).replace(/\s+/g, ' ').trim(); };
  (T.notes || []).map(esc).concat(U.notesPrint || U.notes || []).forEach(function(n){ var t = same(n); if (t && said.indexOf(t) < 0){ said.push(t); notes.push(n); } });
  if (notes.length) h.push('<p class="pnotes">' + notes.map(function(n){ return '<span class="pinote">' + n + '</span>'; }).join(' ') + '</p>');
  DS.forEach(function(sec, si){
    var pts = ITEMS.filter(function(it){ return it.sec === si; }).length;
    /* a section's name never prints alone at the foot of a page (Croix, 14 Nov 2026: "The tests are littered with that and I hate
       it"): the name and its first question are one block (.pkeep), which moves to the next page whole */
    h.push('<div class="pkeep"><h2 class="psec"' + (sec.si != null ? ' data-si="' + sec.si + '"' : '') + '><span class="bt">' + sec.title + '</span>' + (pts ? '<span class="ppts">' + pts + (pts === 1 ? ' point' : ' points') + '</span>' : '') + '</h2>');
    /* no follow-through line under a section, nor anywhere (7 Nov 2026, Croix: the line goes "across everything"; ruling 19's scoring stands) */
    sec.items.forEach(function(d, i){ if (d.out) h.push('<div class="pq pqout" data-k="' + d.k + '"></div>'); else { qn++; h.push(pqTest(d, qn)); } if (!i) h.push('</div>'); });
    if (!sec.items.length) h.push('</div>');
  });
  return h.join('');
}
function testKeyHtml(form, meta){
  var T = window.TEACHER_TEST || {};
  var rows = ITEMS.map(function(it){ var q = qidOfItem(it); return '<tr><td class="pk">' + esc(it.lab) + '</td><td class="kv">' + (mcKey(it) || keyHtml(it)) + '</td><td class="pid" translate="no">' + (q ? q.id : '') + '</td></tr>'; }).join('');
  var bySec = DS.map(function(sec, si){ var its = ITEMS.filter(function(it){ return it.sec === si; }), qs = [];
    its.forEach(function(it){ var q = String(it.lab).replace(/[a-z]+$/, ''); if (qs.indexOf(q) < 0) qs.push(q); }); return {title: sec.title, si: sec.si, qs: qs, pts: its.length}; }).filter(function(b){ return b.pts; });
  /* the test's benchmarks, section by section, where the spec's tracker agrees with the unit's own sections (their points on
     every set): a section with a question left off (Tests A and B) or a kind disapproved keeps its benchmark, with the points
     this form has */
  var order = T.tracker_order || [], tr = T.tracker || {}, full = G0.sections.map(function(s){ return s.items.reduce(function(t, it){ return t + partsOf(it).length; }, 0); });
  var byBm = order.length === full.length && order.every(function(bm, k){ return tr[bm] === full[k]; }) && bySec.every(function(b){ return b.si != null && b.si >= 0 && b.si < order.length; });
  var tracker = '<div class="ptrk"><h2 class="psec"><span class="bt">Score tracker</span></h2><table class="ptab ptrack"><thead><tr><th>' + (byBm ? 'Benchmark' : 'Section') + '</th><th>Questions</th><th>Possible</th><th>Earned</th></tr></thead><tbody>' +
    bySec.map(function(b){ return '<tr><td>' + (byBm ? esc(order[b.si]) : b.title) + '</td><td>' + b.qs.join(', ') + '</td><td>' + b.pts + '</td><td></td></tr>'; }).join('') +
    '<tr><td><b>Total</b></td><td></td><td><b>' + ITEMS.length + '</b></td><td></td></tr></tbody></table></div>';
  return '<div class="pkey"><h2 class="psec"><span class="bt">Answer key — Form ' + form + '</span></h2>' + (meta ? '<p class="pmeta"><span class="bt">' + meta + '</span></p>' : '') +
    (T.follow_through_key ? '<p class="pmeta kft">' + esc(T.follow_through_key) + '</p>' : '') + '<table class="ptab pkrows"><tbody>' + rows + '</tbody></table>' + tracker + '</div>';
}
function makeupHtml(n, label, mc){
  label = label || 'Make-up';                              /* 'Test' on a ruling-49 teacher copy: the unit test IS a random set of this page */
  var seeds = [seed], guard = 0;
  while (seeds.length < n && guard++ < 50){ var r = randomSeed(); if (seeds.indexOf(r) < 0) seeds.push(r); }
  var forms;
  ALLMC = !!mc && canMC();                                   /* every part a choice of four (14 Nov 2026) */
  try { forms = seeds.map(function(s, k){ return withSet(s, function(){ return {ws: testFormHtml(label, LET[k]), key: testKeyHtml(LET[k], 'Set ' + s + ' · ' + esc(SCOPES[scope]) + (ALLMC ? ' · All multiple choice' : '')), form: LET[k], seed: s}; }); }); }
  finally { ALLMC = false; }
  var h = forms.map(function(f, k){ return (k ? '<div class="pbreak"></div>' : '') + '<div class="pform tpage" data-form="' + f.form + '">' + f.ws + '</div>'; }).join('');
  h += forms.map(function(f){ return '<div class="pbreak"></div><div class="pform pkeyform tpage"' + (mc && canMC() ? ' data-mc="1"' : '') + '>' + f.key + '</div>'; }).join('');
  return h;
}
/* ---- what the teacher copy's own tools draw with (teacher.js, 8 Nov 2026: Approve questions, Tests A and B) — on a teacher page
   only. The tools are teacher.js's; this page lends them its drawing, so a sample, a pinned form and its key are exactly what a
   student sees and what prints. */
/* a pinned test form: the sections teacher.js gives ([{title, si, items: [{it, si, ii, k, out}]}]) as the paper and its key, with
   the make-ups' own builders (a left-off question, out, is an empty .pqout in its place for the editor to fill) */
function pinnedForm(secs, o){
  var keep = {DS: DS, ITEMS: ITEMS, EX: EX}, out;
  try {
    DS = secs; ITEMS = []; EX = {}; collect(); ALLMC = !!o.mc && canMC();
    out = {test: testFormHtml(o.label || 'Test', o.form), key: testKeyHtml(o.form, o.meta || ''), points: ITEMS.length,
      rows: ITEMS.map(function(it){ return {k: it.k, lab: it.lab, type: it.type, label: it.x && it.x.label || '', key: keyHtml(it)}; })};
  } finally { DS = keep.DS; ITEMS = keep.ITEMS; EX = keep.EX; ALLMC = false; }
  return out;
}
/* a question as students see it, with nothing to answer: its words, its figure, each part's line, its choices, a number line
   to graph on; and its answer, part by part */
function sampleOf(it){
  var lineOf = function(p, lab){ return '<div class="line">' + (lab ? '<b class="lab">' + lab + '.</b>' : '') + '<span class="st">' + V.line(p) + '</span></div>'; };
  var chs = function(x, multi){ return '<div class="choices">' + x.opts.map(function(o, k){ return '<div class="ch"><span class="box' + (multi ? ' sq' : '') + '"></span><span class="cl">' + LET[k] + '.</span><span class="cv">' + V.opt(x, k) + '</span></div>'; }).join('') + '</div>'; };
  var nl = function(p){ return '<div class="nlw">' + NL.svg(p, null, {mode: 'blank'}) + '</div>'; };
  var h = '<div class="stem"><span class="st">' + V.stem(it) + '</span></div>' + fig(it), keys = [];
  if (it.type === 'parts') it.parts.forEach(function(p){ h += '<div class="prt' + (p.kind === 'mc' ? ' mcp' : p.kind === 'nline' ? ' nlp' : '') + '">' + lineOf(p, p.label) + (p.kind === 'mc' ? chs(p, false) : p.kind === 'nline' ? nl(p) : '') + '</div>'; keys.push({lab: p.label, key: keyHtml({type: textType(p), x: p})}); });
  else if (it.type === 'solo'){ if (it.part.kind === 'nline') h += '<div class="prt nlp solo">' + lineOf(it.part, '') + nl(it.part) + '</div>'; keys.push({lab: '', key: keyHtml({type: textType(it.part), x: it.part})}); }
  else { h += '<div class="mcp">' + chs(it, it.type === 'multi') + '</div>'; keys.push({lab: '', key: keyHtml({type: it.type === 'multi' ? 'multi' : 'mc', x: it})}); }
  return {html: h, keys: keys};
}
function ask0(text, opts){                                   /* the print choice, in the same bar as the other questions */
  var c = $('confirm'); c.hidden = false; document.body.classList.add('asking');
  c.innerHTML = '<span>' + text + '</span>' + opts.map(function(o){ return '<button type="button" class="go" data-print="' + o[0] + '"' + (o[2] ? ' disabled title="' + esc(o[2]) + '"' : '') + '>' + o[1] + '</button>'; }).join('') + '<button type="button" id="cn">Cancel</button>';
  $('cn').onclick = function(){ closeAsk(); moreFocus(); };
  var f = c.querySelector('[data-print]:not([disabled])'); if (f) f.focus();
}
function showPrint(kind, label){
  if (/^m[kc]/.test(kind) && !teacherPage()) return;         /* no make-up tests on a student page, whatever asks */
  closeAsk();
  var pv = $('printview'); if (!pv){ pv = document.createElement('div'); pv.id = 'printview'; pv.setAttribute('role', 'dialog'); pv.setAttribute('aria-label', 'Print preview'); document.body.appendChild(pv); }
  if (kind === 'mk' || kind === 'mc'){ makeupMenu(kind === 'mc'); return; }
  var mk = /^m([kc])(\d)$/.exec(kind);
  var body = mk ? makeupHtml(+mk[2], label, mk[1] === 'c') : kind === 'res' ? resultsHtml() : worksheetHtml() + (kind === 'wk' ? '<div class="pbreak"></div>' + keyListHtml() : '');
  pv.innerHTML = '<div class="pbar"><button type="button" class="go" id="pvPrint">Print</button><button type="button" id="pvClose">Close</button><span class="pvhint bt">If nothing happens, use your browser’s Print (Ctrl + P).</span></div><div class="ppage">' + body + '</div>';
  pv.hidden = false; document.body.classList.add('printing'); window.scrollTo(0, 0);
  $('pvPrint').onclick = function(){ try { window.print(); } catch(e){} };
  $('pvClose').onclick = closePrint;
  $('pvPrint').focus();
}
function closePrint(){ var pv = $('printview'); if (pv){ pv.hidden = true; pv.innerHTML = ''; } document.body.classList.remove('printing'); moreFocus(); }
document.addEventListener('click', function(e){ var t = e.target && e.target.closest && e.target.closest('[data-print]'); if (t && !t.disabled) showPrint(t.dataset.print); });
document.addEventListener('keydown', function(e){ if (e.key === 'Escape' && document.body.classList.contains('printing')) closePrint(); });
(function(){ var b = document.createElement('button'); b.type = 'button'; b.id = 'bPrint'; b.className = 'pbtn'; b.textContent = 'Print'; b.addEventListener('click', function(){ moreClose(); printMenu(); });
  var w = document.querySelector('#mMenu .mprint') || document.querySelector('.ctl'); if (w) w.appendChild(b); })();   /* in the ⋯ menu (7 Nov 2026) */

/* ------------------------------------------------ the ⋯ menu (7 Nov 2026, the site review: "Quiet the top" — Croix: "Ok sounds
   well thought out. Proceed."). Four rows of controls stood before question 1; the mode toggle stays, and what to practice,
   Print and the set number (Set · Change) sit in one menu beside it. Their own functions are unchanged; the menu only opens,
   closes (Escape, a tap outside, or once one of them acts) and gives focus back to ⋯. */
function moreBtn(){ return $('bMore'); }
function moreOpen(){ var m = $('mMenu'), b = moreBtn(); if (!m || !b) return; m.hidden = false; b.setAttribute('aria-expanded', 'true'); var f = $('scope'); if (f) f.focus(); }
function moreClose(back){ var m = $('mMenu'), b = moreBtn(); if (!m || m.hidden) return; m.hidden = true; if (b){ b.setAttribute('aria-expanded', 'false'); if (back) b.focus(); } }
function moreFocus(){ var b = $('bPrint'); if (b && b.offsetParent) b.focus(); else if (moreBtn()) moreBtn().focus(); }
if (moreBtn()){
  moreBtn().addEventListener('click', function(){ if ($('mMenu').hidden) moreOpen(); else moreClose(true); });
  document.addEventListener('keydown', function(e){ if (e.key === 'Escape' && !$('mMenu').hidden){ e.stopPropagation(); moreClose(true); } }, true);
  document.addEventListener('pointerdown', function(e){ var w = moreBtn().parentNode; if (!$('mMenu').hidden && !(e.target && e.target.closest && w.contains(e.target))) moreClose(); }, true);
  document.addEventListener('focusin', function(e){ var w = moreBtn().parentNode; if (!$('mMenu').hidden && !w.contains(e.target)) moreClose(); });
}
/* "Larger text" (7 Nov 2026, item 7; the survey after Desmos: one toggle, not the browser's zoom): two sizes, in the ⋯ menu,
   remembered on this device (any unit); the sheet and the end panel grow, the bar stays. Storage may be refused: then it is
   just this visit's. */
var BIGKEY = 'practice.textsize';
function setBig(on, keep){ document.documentElement.classList.toggle('lg', !!on); var b = $('bBig'); if (b) b.setAttribute('aria-pressed', String(!!on)); if (keep){ try { if (on) localStorage.setItem(BIGKEY, 'large'); else localStorage.removeItem(BIGKEY); } catch(e){} } }
(function(){ var w = document.querySelector('#mMenu .mprint'); if (!w) return;
  var row = document.createElement('div'); row.className = 'mtext'; row.innerHTML = '<button type="button" id="bBig" aria-pressed="false">Larger text</button>';
  w.parentNode.insertBefore(row, w.nextSibling);
  $('bBig').addEventListener('click', function(){ setBig(!document.documentElement.classList.contains('lg'), true); });
  var on = false; try { on = localStorage.getItem(BIGKEY) === 'large'; } catch(e){}
  setBig(on, false); })();
/* Appearance (7 Nov 2026, Croix in dark mode on his tablet: "I want it to be based on the system, also give me an option. But dark
   mode should be true dark mode."): System · Light · Dark in the ⋯ menu, one radiogroup (arrows move and choose, Tab leaves).
   Light and Dark set data-theme on <html>; System removes it and the page follows the device. Remembered on this device (any
   unit) under THEMEKEY; build.py's first script applies it before the first paint, so nothing flashes. Storage may be refused:
   then the choice is just this visit's. */
var THEMEKEY = 'practice.theme';
function themeNow(){ var t = document.documentElement.getAttribute('data-theme'); return t === 'light' || t === 'dark' ? t : 'system'; }
function setTheme(t, keep){
  var r = document.documentElement; if (t === 'light' || t === 'dark') r.setAttribute('data-theme', t); else { t = 'system'; r.removeAttribute('data-theme'); }
  Array.prototype.forEach.call(document.querySelectorAll('#mTheme [role=radio]'), function(b){ var on = b.getAttribute('data-theme-to') === t; b.setAttribute('aria-checked', String(on)); b.tabIndex = on ? 0 : -1; });
  if (keep){ try { if (t === 'system') localStorage.removeItem(THEMEKEY); else localStorage.setItem(THEMEKEY, t); } catch(e){} }
}
(function(){ var w = document.querySelector('#mMenu .mtext') || document.querySelector('#mMenu .mprint'); if (!w) return;
  var lab = document.createElement('div'); lab.className = 'mlab'; lab.id = 'mThemeL'; lab.textContent = 'Appearance';
  var g = document.createElement('div'); g.className = 'mtheme'; g.id = 'mTheme'; g.setAttribute('role', 'radiogroup'); g.setAttribute('aria-labelledby', 'mThemeL');
  g.innerHTML = [['system', 'System'], ['light', 'Light'], ['dark', 'Dark']].map(function(o){ return '<button type="button" role="radio" data-theme-to="' + o[0] + '" aria-checked="false">' + o[1] + '</button>'; }).join('');
  w.parentNode.insertBefore(g, w.nextSibling); w.parentNode.insertBefore(lab, g);
  var opts = function(){ return Array.prototype.slice.call(g.querySelectorAll('[role=radio]')); };
  g.addEventListener('click', function(e){ var b = e.target.closest && e.target.closest('[role=radio]'); if (b) setTheme(b.getAttribute('data-theme-to'), true); });
  g.addEventListener('keydown', function(e){
    var o = opts(), i = o.indexOf(e.target.closest ? e.target.closest('[role=radio]') : null); if (i < 0) return;
    var j = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? (i + 1) % o.length : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? (i + o.length - 1) % o.length : e.key === 'Home' ? 0 : e.key === 'End' ? o.length - 1 : -1;
    if (j < 0) return; e.preventDefault(); setTheme(o[j].getAttribute('data-theme-to'), true); o[j].focus(); });
  setTheme(themeNow(), false); })();
/* the way back (7 Nov 2026, the site review): on mrshaffer.org a practice test is /<course>/practice/unit-N/, and its unit's
   page is /<course>/unit-N/ — the bar's far left gets "‹ Unit N" there, as the site's own top bar has its way back. As a
   claude.ai artifact or a Google Sites download there is no unit page to go back to, so it stays hidden. N is the unit's
   (Unit.id, "m7u9"), never read from the address. */
(function(){
  var a = $('back'), n = /u(\d+)$/.exec(U.id || ''), onSite = /^\/(m7|a7)\/practice\/unit-\d+\/(index\.html)?$/.test(location.pathname || '');
  if (!a || !n || !onSite) return;
  a.href = '../../unit-' + n[1] + '/'; $('backl').textContent = 'Unit ' + n[1]; a.setAttribute('aria-label', 'Back to Unit ' + n[1]); a.hidden = false;
})();

/* the page's words, from the unit */
document.title = U.title;
$('eyebrow').innerHTML = U.eyebrow; $('h1').innerHTML = U.h1;   /* openSet repaints them for a lesson choice (paintHead) */
/* No line about the page under the title (Croix, 21 Oct 2026: "eliminate the little texts that you do in the menu like (Same kinds
   of questions as the unit test, new numbers every set.)"): only a unit's notes — how to write an answer — and none at all hides it. */
var notesHtml = (U.notes || []).map(function(n){ return '<span class="pinote">' + n + '</span>'; }).join('');
$('intro').innerHTML = notesHtml; $('intro').hidden = !notesHtml;
openSet(seed, scope);
if (K.Bi && U.second) K.Bi.mount(U, (window.KitLang || {})[U.second.code]);   /* the second-language toggle (kit/bilingual.js), when the unit has one; after the first set is drawn */
})();
