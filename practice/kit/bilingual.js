/* Practice-test kit: a second language, shown under the English (Croix, 16 Oct 2026: "a Portuguese version of the
   question and explanation for my kids from Brazil … toggle it on and off"; everything, both stacked).

   The English is never changed. When the toggle is on, every block of English on the page gets its translation
   underneath, in a softer colour, marked lang="pt-BR" (or whatever the unit's second language is). When it is off, nothing
   is added at all: the page is exactly the English page.

   How a translation is made (so the numbers can never change):
   1. protect(): every number, every math span (<span class="m">…</span>), every figure (<svg>), every student name and
      every small labelled piece (a ✓/✗ tag, a jump button) is lifted out and replaced by a marker:
          #  a number        §  a math span or figure, kept exactly        @  a name        ¤  a piece translated on its own
   2. The marked English is looked up in the table — first whole, then sentence by sentence. Sentences that start
      "That is what you get if you …" are looked up as their verb phrase ("vp:…"), and so are the "— or if you …" pieces
      that join two mistakes, so each phrase is written once.
   3. The Portuguese template is filled with the same pieces, in order (#{2} picks the second number when a sentence
      needs them in another order). A piece is never re-typed, so every number in the Portuguese is the English one.
   4. Anything the table does not know gives no translation (never a guess); the checks list every such sentence.
   The tables: kit/lang/<code>.js has the page's own words (buttons, scores, menus); the unit adds its questions,
   feedback, hints and worked steps (Unit.second.table). */
(function (root) {
'use strict';
var TOK = /\u0000(\d+)\u0000/g;
function tokOf(i){ return '\u0000' + i + '\u0000'; }

/* a math span may hold one level of nested spans (fractions) */
var MATH = /<span class="m"[^>]*>(?:[^<]|<(?!\/?span)[^>]*>|<span[^>]*>(?:[^<]|<(?!\/?span)[^>]*>|<span[^>]*>[^<]*<\/span>)*<\/span>)*<\/span>/g;
var ATOM = /<(span|button|b) class="(?:tag[^"]*|nw|nw streak|streak|alt|kl|wgave|chg|wok|wno|wq)"[^>]*>(?:[^<]|<(?!\/?(?:span|button)\b)[^>]*>|<span class="m"[^>]*>[^<]*<\/span>)*<\/\1>|<button[^>]*class="jump"[^>]*>[^<]*<\/button>|<b>[A-H]\.<\/b>|<b>[A-Z][a-z ]{1,24}:<\/b>/g;
var NUM = /(?<![\w\u0000])\d{1,3}(?:,\d{3})+(?:\.\d+)?(?![\w])|(?<![\w\u0000])\d+(?:\.\d+)?/g;

function protect(html, names){
  var keep = [], type = [];
  var put = function(t){ return function(m){ keep.push(m); type.push(t); return tokOf(keep.length - 1); }; };
  var s = String(html);
  s = s.replace(/<svg[\s\S]*?<\/svg>/g, put('§'));
  s = s.replace(ATOM, put('¤'));
  s = s.replace(MATH, put('§'));
  if (names && names.length) s = s.replace(new RegExp('\\b(?:' + names.join('|') + ')\\b', 'g'), put('@'));
  s = s.replace(NUM, put('#'));
  return {s: s, keep: keep, type: type};
}
function keyOf(s, P){ return s.replace(TOK, function(m, i){ return P.type[+i]; }); }

/* sentences: split after . ? ! … when the next thing starts a sentence */
function sentences(s){
  var out = [], re = /([.?!…])(\s+)(?=[A-Z“"(\u0000½]|$)/g, last = 0, m;
  while ((m = re.exec(s))){ out.push(s.slice(last, m.index + 1)); last = m.index + 1 + m[2].length; }
  if (last < s.length) out.push(s.slice(last));
  return out.filter(function(x){ return x.trim() !== ''; });
}

function make(table, names){
  var T = table, cache = {};
  function fill(tpl, toks, P){
    var q = {'#': [], '§': [], '@': [], '¤': []};
    toks.forEach(function(i){ q[P.type[i]].push(i); });
    var used = {'#': 0, '§': 0, '@': 0, '¤': 0}, bad = false;
    var out = tpl.replace(/([#§@¤])(?:\{(\d+)\})?/g, function(m, t, n){
      var k = n ? +n - 1 : used[t]++, i = q[t][k];
      if (i == null){ bad = true; return ''; }
      return t === '¤' ? (atom(P.keep[i]) || P.keep[i]) : P.keep[i];
    });
    return bad ? null : out;
  }
  function look(key, piece, P){
    var tpl = T[key]; if (tpl == null) return null;
    var toks = []; piece.replace(TOK, function(m, i){ toks.push(+i); return m; });
    return fill(tpl, toks, P);
  }
  /* one sentence: whole, or its verb phrase after "That is what you get if you" */
  var VP = 'That is what you get if you ';
  function sentence(x, P){
    var k = keyOf(x, P), r = look(k, x, P); if (r != null) return r;
    if (x.indexOf(VP) === 0){ var rest = x.slice(VP.length), v = look('vp:' + keyOf(rest, P), rest, P); if (v != null) return look('vp-head', '', P) + v; }
    return null;
  }
  /* a run of text: whole, else joined mistakes, else sentence by sentence */
  function run(s, P){
    var k = keyOf(s, P), r = look(k, s, P); if (r != null) return r;
    if (!/[A-Za-z]/.test(k.replace(/<[^>]*>/g, '').replace(/&[a-z]+;/g, '')))   /* only numbers, math, symbols: as they are */
      return s.replace(TOK, function(m, i){ return P.type[+i] === '¤' ? (atom(P.keep[+i]) || P.keep[+i]) : P.keep[+i]; });
    var one = /^\u0000(\d+)\u0000$/.exec(s);                       /* nothing but one labelled piece */
    if (one && P.type[+one[1]] === '¤') return atom(P.keep[+one[1]]);
    /* pieces joined by " · " (the score, a result heading) */
    if (s.indexOf(' · ') > 0){ var dot = s.split(' · '), dd = [], okd = true;
      for (var d = 0; d < dot.length && okd; d++){ var rd = run(dot[d], P); if (rd == null) okd = false; else dd.push(rd); }
      if (okd) return dd.join(' · '); }
    /* a labelled piece at the start or the end (a ✓/✗ tag, "(shown)"): on its own, then the rest */
    var a0 = /^\u0000(\d+)\u0000(\s*)([\s\S]+)$/.exec(s);
    if (a0 && P.type[+a0[1]] === '¤'){ var r0 = run(a0[3], P), t0 = atom(P.keep[+a0[1]]); if (r0 != null) return (t0 || P.keep[+a0[1]]) + a0[2] + r0; }
    var a1 = /^([\s\S]+?)(\s*)\u0000(\d+)\u0000$/.exec(s);
    if (a1 && P.type[+a1[3]] === '¤'){ var r1 = run(a1[1], P), t1 = atom(P.keep[+a1[3]]); if (r1 != null) return r1 + a1[2] + (t1 || P.keep[+a1[3]]); }
    /* a numbered heading, "2.&nbsp; Composite figures": the number stays, the words are translated */
    var np = /^(\u0000(\d+)\u0000\.(?:&nbsp;|\s)+)([\s\S]+)$/.exec(s);
    if (np && P.type[+np[2]] === '#'){ var rn = run(np[3], P); if (rn != null) return P.keep[+np[2]] + np[1].slice(np[1].indexOf('.')) + rn; }
    var j = s.split(' — or if you ');
    if (j.length > 1){
      var first = run(j[0], P); if (first == null) return null;
      for (var a = 1; a < j.length; a++){
        var ss = sentences(j[a]), head = ss.shift(), v = look('vp:' + keyOf(head, P), head, P); if (v == null) return null;
        var tail = ss.length ? run(ss.join(' '), P) : ''; if (tail == null) return null;
        first = first.replace(/[.]$/, '') + look('vp-join', '', P) + v + (tail ? ' ' + tail : '');
      }
      return first;
    }
    var parts = sentences(s); if (parts.length < 2) return sentence(s, P);
    var out = [];
    for (var i = 0; i < parts.length; i++){ var t = sentence(parts[i], P); if (t == null) return null; out.push(t); }
    return out.join(' ');
  }
  /* a labelled piece (a tag, a jump button): keep its tag, translate what is inside */
  function atom(h){
    var m = /^(<[^>]+>)([\s\S]*)(<\/[a-z]+>)$/.exec(h); if (!m) return null;
    var inner = tr(m[2]); return inner == null ? null : m[1] + inner + m[3];
  }
  function tr(html){
    if (html == null) return null;
    html = String(html);
    if (Object.prototype.hasOwnProperty.call(cache, html)) return cache[html];
    var lead = /^\s*/.exec(html)[0], trail = /\s*$/.exec(html)[0], core = html.trim(), r;
    if (!core) r = html;
    else if (!/[A-Za-z]/.test(core.replace(/<[^>]*>/g, ' ').replace(/&[a-z]+;/g, ' ').replace(/\b(?:cm|m|in|ft|yd|km|mm)\b\.?/g, ''))) r = html;   /* numbers, math, a unit: the same in both */
    else { var P = protect(core, names), t = run(P.s, P); r = t == null ? null : lead + t + trail; }
    cache[html] = r; return r;
  }
  return {tr: tr, protect: function(h){ return protect(h, names); }, keyOf: keyOf, sentences: sentences};
}

/* ------------------------------------------------ the page: the toggle, and the translation under each block */
/* the blocks that carry words; buttons get theirs as a second small line inside the button */
var BLOCK = ['#eyebrow', '#h1', '.itx', '.pinote', '#total', '.setbox summary', '.setrow label', '#notice', '#confirm > span', '.how',
  '.sechead h2', '.sechead .pts', '.stem .st', '.line .st', '.cv', '.xhead .xt', '.xhead .streak', '.fbx p', '.fbx li', '.note2', '.rd',
  '.sthead', '.solhead .kl', '.say', '.offnote', '.key .kl', '.key .kv', '.why > summary', '.vis .cap', '.vis p', '.wpl',
  '.wkhead b', '.wask', '.wgot', '.wwhy', '.wfin', '#score', '#result h2', '#result .big span', '#result .last',
  '.bt', '#result .perfect', '#result .nry', '#result .note:not(:has(.nry))', '#result th', '#result td:first-child'].join(',');
var BUTTON = 'button:not(.jump):not([data-k]):not(.bi-toggle)';

function mount(U, lang){
  var sec = U.second; if (!sec) return null;
  var T = Object.assign({}, lang || {}, sec.table || {}), B = make(T, sec.names || []);
  var KEY = U.id + '.lang', on = false;
  try { on = localStorage.getItem(KEY) === sec.code; } catch(e){}
  var btn = document.createElement('button');
  btn.type = 'button'; btn.className = 'bi-toggle'; btn.setAttribute('lang', sec.code);
  btn.innerHTML = '<span class="bi-dot" aria-hidden="true"></span>' + sec.name;
  var where = document.querySelector('.ctl'); if (where){ var tl = where.querySelector('.tools'); if (!tl){ tl = document.createElement('div'); tl.className = 'tools'; where.appendChild(tl); } tl.appendChild(btn); }
  var missing = root.__biMissing = root.__biMissing || {};
  function add(el, inner){
    if (el.querySelector(':scope > .tr')) return;
    if (el.closest && el.closest('[translate="no"]')) return;          /* the teacher's own bar and paper stay in English */
    var src = el.innerHTML; if (!/[A-Za-z]/.test(el.textContent)) return;
    var t = B.tr(src);
    if (t == null){ missing[src] = (missing[src] || 0) + 1; return; }
    if (t === src) return;
    var sp = document.createElement('span'); sp.className = inner ? 'tr trb' : 'tr'; sp.setAttribute('lang', sec.code); sp.innerHTML = t;
    Array.prototype.forEach.call(sp.querySelectorAll('[id],[for],[aria-live],[tabindex]'), function(x){ ['id', 'for', 'aria-live', 'tabindex'].forEach(function(a){ x.removeAttribute(a); }); });   /* a copy never takes an id, a label or focus */
    el.appendChild(sp);
  }
  function apply(scope){
    if (!on) return;
    var base = scope && scope.querySelectorAll ? scope : document;
    var list = [];
    if (base.matches && base.matches(BLOCK)) list.push([base, false]);
    if (base.matches && base.matches(BUTTON)) list.push([base, true]);
    Array.prototype.forEach.call(base.querySelectorAll(BLOCK), function(el){ list.push([el, false]); });
    Array.prototype.forEach.call(base.querySelectorAll(BUTTON), function(el){ list.push([el, true]); });
    list.forEach(function(p){ if (!p[0].closest('.tr') && !p[0].closest('.keys')) add(p[0], p[1]); });
    selectOptions(); placeholders();
  }
  function selectOptions(){
    Array.prototype.forEach.call(document.querySelectorAll('select option'), function(o){
      if (o.closest('[translate="no"]')) return;
      var en = o.getAttribute('data-en') || o.textContent;
      if (!on){ if (o.hasAttribute('data-en')){ o.textContent = en; o.removeAttribute('data-en'); } return; }
      if (o.hasAttribute('data-en')) return;
      var t = B.tr(en); if (t == null){ missing[en] = (missing[en] || 0) + 1; return; }
      if (t !== en){ o.setAttribute('data-en', en); var d = document.createElement('div'); d.innerHTML = t; o.textContent = en + ' · ' + d.textContent; }
    });
  }
  function placeholders(){
    Array.prototype.forEach.call(document.querySelectorAll('input[placeholder]'), function(i){
      var en = i.getAttribute('data-en-ph') || i.getAttribute('placeholder');
      if (!on){ if (i.hasAttribute('data-en-ph')){ i.setAttribute('placeholder', en); i.removeAttribute('data-en-ph'); } return; }
      if (i.hasAttribute('data-en-ph')) return;
      var t = B.tr(en); if (t && t !== en){ i.setAttribute('data-en-ph', en); i.setAttribute('placeholder', en + ' · ' + t.replace(/<[^>]*>/g, '')); }
    });
  }
  function clear(){ Array.prototype.forEach.call(document.querySelectorAll('.tr'), function(x){ x.parentNode.removeChild(x); }); selectOptions(); placeholders(); }
  var busy = false;
  var mo = new MutationObserver(function(recs){
    if (!on || busy) return; busy = true;
    try {
      recs.forEach(function(r){
        if (r.target.closest && r.target.closest('.tr')) return;
        if (r.type === 'childList'){
          Array.prototype.forEach.call(r.addedNodes, function(n){ if (n.nodeType === 1 && !n.classList.contains('tr')) apply(n); });
          var el = r.target.nodeType === 1 ? r.target : r.target.parentNode;
          var host = el && el.closest && (el.closest(BLOCK) || el.closest(BUTTON));
          if (host && !host.closest('.keys')){ var old = host.querySelector(':scope > .tr'); if (old && !Array.prototype.some.call(r.addedNodes, function(n){ return n === old; })) { /* the English changed under an old translation */ old.parentNode.removeChild(old); } add(host, host.matches(BUTTON)); }
        } else if (r.type === 'characterData'){
          var h2 = r.target.parentNode && r.target.parentNode.closest && (r.target.parentNode.closest(BLOCK) || r.target.parentNode.closest(BUTTON));
          if (h2){ var o2 = h2.querySelector(':scope > .tr'); if (o2) o2.parentNode.removeChild(o2); add(h2, h2.matches(BUTTON)); }
        }
      });
    } finally { mo.takeRecords(); busy = false; }
  });
  function set(v){
    on = v; btn.setAttribute('aria-pressed', String(on)); document.body.classList.toggle('bi', on);
    try { if (on) localStorage.setItem(KEY, sec.code); else localStorage.removeItem(KEY); } catch(e){}
    if (on){ busy = true; apply(document); mo.takeRecords(); busy = false; } else clear();
  }
  btn.addEventListener('click', function(){ set(!on); });
  mo.observe(document.body, {childList: true, subtree: true, characterData: true});
  set(on);
  return {tr: B.tr, isOn: function(){ return on; }, set: set, missing: missing};
}

var api = {make: make, protect: protect, sentences: sentences, mount: mount};
if (typeof module !== 'undefined' && module.exports) module.exports = api; else { root.Kit = root.Kit || {}; root.Kit.Bi = api; }
})(this);
