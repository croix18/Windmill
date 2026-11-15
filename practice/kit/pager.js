/* Practice-test kit: one question at a time, as on the FAST (pager.js, 14 Nov 2026).
   Croix, 14 Nov 2026: "Can you change my practice tests to be same style that the fast practice on my page is. So one question
   per page in the same style as the actual fast test." — and the lesson sets too: the whole practice test, a section, My misses
   and every lesson set. The look and the flow are the released-test page's (mrshaffer.org /a7/practice/fast-2025/, the site's
   released/kit/fast.js and fast.css): the question's number with Flag for review beside it, Back and Next under it, and the
   map of every question (answered, flagged, the one on screen) — on a phone a drawer under the question, one line until it is
   opened. Check as I go marks on the question's own screen, as before; Like the real test says nothing until Finish. Finish —
   the bar's, or Next on the last question — gives the score (ui.js's end panel, as before) with every question listed under
   it, right or not; a tap opens one to review, and Score summary goes back.
   Its own module: ui.js draws, marks and saves every question exactly as before and hands this a few of its functions
   (Kit.Pager(api), once, at its end); paintAll tells it the sheet was painted, and paintProgress asks it which question is on
   the screen. A coach's button that goes to another question (Next ↓, Move on, a "Not right yet" link) first opens that
   question here. Only the screen pages: print (@media print) and the print previews have every question, as before, and the
   teacher copy's own views are untouched. The question on the screen (S.pg.cur) and the flags (S.pg.flag) are kept in the
   set's own saved record, so a reload or a return opens the same question; a new set, Start over or a mode switch opens
   question 1, and so does a lesson link (#lesson-6.05), which is always a new set.
   The checks' switch: window.KIT_PAGER_OFF, set by check/page.js and check/bank.js before a page loads (nothing on a page sets
   it), leaves every question on one screen — the page as it was before the pager — for the parts that check everything else
   (A–Q); part R (check/pager_page.js) checks the pager itself. */
(function(){
'use strict';
var K = window.Kit = window.Kit || {};
K.Pager = function(api){
  if (window.KIT_PAGER_OFF) return null;
  var $ = function(id){ return document.getElementById(id); };
  var paper = $('paper'), sheet = paper && paper.closest ? paper.closest('.sheet') : null;
  if (!sheet || !api) return null;
  var make = function(tag, cls, html, attrs){ var e = document.createElement(tag); e.className = cls; e.innerHTML = html; Object.keys(attrs || {}).forEach(function(k){ e.setAttribute(k, attrs[k]); }); return e; };
  /* the words are plain text in each button (the icons are the stylesheet's), so the Português layer translates them whole */
  var head = make('div', 'pghead', '<h2 class="pgq" id="pgQ" tabindex="-1"><span class="bt" id="pgQt"></span><span class="pgchip" id="pgChip" hidden translate="no"></span></h2>' +
    '<button type="button" class="pgflag" id="pgFlag" aria-pressed="false">Flag for review</button>');
  var nav = make('nav', 'pgnav', '<button type="button" class="pgprev" id="pgPrev">Back</button><button type="button" id="pgBack" hidden>Score summary</button>' +
    '<button type="button" class="go pgnext" id="pgNext">Next</button>', {'aria-label': 'Back and Next'});
  var list = make('section', 'pglist', '<ol class="pgrows" id="pgRows"></ol>', {'aria-label': 'Questions'});   /* no heading and no note over it (15 Nov 2026, the words pass) */
  var map = make('section', 'sheet pgmap', '<button type="button" class="pgmt" id="pgMt" aria-expanded="false" aria-controls="pgGrid"></button><div class="pgmh"><h2 class="bt" id="pgMh">Questions</h2><ul class="pglg" aria-hidden="true"><li><i class="a"></i><span class="bt">Answered</span></li>' +
    '<li><i class="f"></i><span class="bt">Flagged</span></li><li><i class="c"></i><span class="bt">On screen</span></li></ul></div>' +
    '<nav class="pgm" id="pgGrid" aria-labelledby="pgMh"></nav>', {'aria-labelledby': 'pgMh'});
  /* the start (Croix, 14 Nov 2026: "Yeah let's build it!"): the page's header — the title, the typing tip, how to practice and
     the ⋯ menu — once, with Start (Keep going when the set has answers); then each screen is the question alone. How to practice
     and the ⋯ menu move to the top of the map card, under the question; the unit's typing tip is in the ⋯ menu too. */
  var start = make('div', 'pgstart', '<p class="pgresume bt" id="pgResume" hidden></p><button type="button" class="go" id="pgStart">Start</button>');
  var ctl = sheet.querySelector('.ctl'), ctlHome = ctl ? ctl.nextSibling : null, intro = $('intro'), menu = $('mMenu');
  if (intro && menu && !intro.hidden && intro.innerHTML.trim()){ var tip = make('div', 'pgtip', intro.innerHTML); menu.insertBefore(tip, menu.firstChild); }
  paper.parentNode.insertBefore(start, $('notice') ? $('notice').nextSibling : paper);
  paper.parentNode.insertBefore(head, paper);
  paper.parentNode.insertBefore(nav, paper.nextSibling);
  nav.parentNode.insertBefore(list, nav.nextSibling);
  sheet.parentNode.insertBefore(map, sheet.nextSibling);
  document.body.classList.add('pg');

  var cards = [], secs = [], ofItem = {}, first = null, cur = 0, view = 'quiz', lastS = null, lastKey = '', lastDone = false;
  /* a lesson link (#lesson-6.05, the calendar's) opens that set's first question, past the start */
  var lessonLink = /^#lesson-/i.test(location.hash || '');
  window.addEventListener('hashchange', function(){ lessonLink = /^#lesson-/i.test(location.hash || ''); }, true);
  /* the questions on the paper (a fresh "A similar one" is part of its question): read again whenever the paper was drawn again */
  function index(){
    var qs = Array.prototype.slice.call(paper.querySelectorAll('.q[data-q]:not(.xq)'));
    if (qs.length === cards.length && qs[0] === first) return false;
    cards = qs; first = qs[0] || null;
    secs = Array.prototype.slice.call(paper.querySelectorAll('section.part'));
    ofItem = {};
    (api.items() || []).forEach(function(it){ var h = api.hostOf(it), c = h && h.closest ? h.closest('.q[data-q]:not(.xq)') : null, i = cards.indexOf(c); if (i >= 0) (ofItem[i] = ofItem[i] || []).push(it); });
    $('pgGrid').innerHTML = cards.map(function(c, i){ return '<button type="button" data-pgi="' + i + '">' + (i + 1) + '</button>'; }).join('');
    return true;
  }
  function itemsOf(i){ return ofItem[i] || []; }
  function qOf(i){ return cards[i] ? cards[i].getAttribute('data-q') : ''; }
  function done(){ var S = api.S(); return !!(S && S.done); }
  function flags(){ var S = api.S(); return S && S.pg ? S.pg.flag : {}; }
  function answeredQ(i){ var its = itemsOf(i); return its.length > 0 && its.every(function(it){ return api.answered(it); }); }
  /* how a question came out, after Finish: every part right, some, or none — and none typed at all is Blank */
  function verdict(i){
    var S = api.S(), its = itemsOf(i), right = 0, blank = 0;
    its.forEach(function(it){ var R = S.res[it.id]; if (R && R.v === 'right') right++; else if (!api.answered(it)) blank++; });
    var v = its.length && right === its.length ? 'ok' : its.length && blank === its.length ? 'na' : 'no';
    return {v: v, word: v === 'ok' ? 'Right' : v === 'na' ? 'Blank' : right && its.length > 1 ? right + ' of ' + its.length + ' right' : 'Not right'};
  }
  function clamp(i){ return Math.max(0, Math.min(cards.length - 1, i | 0)); }
  /* a word changed only when it changes: the Português line under it (bilingual.js) is redrawn only then */
  function setText(el, t){ var f = el.firstChild; if (f && f.nodeType === 3 ? f.nodeValue !== t : el.textContent !== t) el.textContent = t; }

  /* ---- what the screen shows: the one question, its number, the flag, Back and Next, the map; or the summary */
  function apply(){
    var N = cards.length, fin = done(), on = cards[cur] || null, sec = on && on.closest ? on.closest('section.part') : null, b = document.body;
    cards.forEach(function(c){ c.classList.toggle('pg-on', c === on); });
    secs.forEach(function(s){ s.classList.toggle('pg-on', s === sec); });
    b.classList.toggle('pg-none', !N); b.classList.toggle('pg-done', fin);
    b.classList.toggle('pg-sum', fin && view === 'sum'); b.classList.toggle('pg-rev', fin && view === 'quiz');
    b.classList.toggle('pg-start', view === 'start' && !!N); b.classList.toggle('pg-q', view === 'quiz' && !!N);
    if (ctl){ var home = view === 'quiz' && N && !fin ? map : sheet; if (ctl.parentNode !== home){ if (home === map) map.insertBefore(ctl, map.firstChild); else sheet.insertBefore(ctl, ctlHome && ctlHome.parentNode === sheet ? ctlHome : start); } }
    if (!N) return;
    if (view === 'start'){ var S0 = api.S(), na = cards.filter(function(c, i){ return answeredQ(i); }).length, going = na > 0 || (S0 && S0.pg && S0.pg.cur > 0);
      setText($('pgStart'), going ? 'Keep going' : 'Start'); $('pgResume').hidden = !going; if (going) setText($('pgResume'), 'Answered so far: ' + na + ' of ' + N); }
    setText($('pgQt'), 'Question ' + (cur + 1) + ' of ' + N);
    var chip = $('pgChip');
    if (fin){ var vd = verdict(cur); chip.className = 'pgchip ' + vd.v; setText(chip, vd.word); chip.hidden = false; } else chip.hidden = true;
    var fl = $('pgFlag'); fl.hidden = fin; fl.setAttribute('aria-pressed', String(!!flags()[qOf(cur)]));
    $('pgPrev').disabled = cur === 0;
    var nx = $('pgNext'), last = cur === N - 1, word = last ? (fin ? 'Score summary' : 'Finish') : 'Next';
    setText(nx, word);
    nx.classList.toggle('pgend', last);
    $('pgBack').hidden = !fin || last;
    paintMap();
    if (fin && view === 'sum') paintList();
    if (api.progress) api.progress();
  }
  function paintMap(){
    var F = flags(), n = 0, nf = 0;
    Array.prototype.forEach.call($('pgGrid').children, function(btn, i){
      var an = answeredQ(i), fl = !!F[qOf(i)]; if (an) n++; if (fl) nf++;
      btn.classList.toggle('a', an); btn.classList.toggle('f', fl);
      if (i === cur) btn.setAttribute('aria-current', 'step'); else btn.removeAttribute('aria-current');
      btn.setAttribute('aria-label', 'Question ' + (i + 1) + (an ? ', answered' : ', not answered') + (fl ? ', flagged' : ''));
    });
    setText($('pgMt'), 'Questions: ' + n + ' of ' + cards.length + ' answered' + (nf ? ', ' + nf + ' flagged' : ''));
  }
  function paintList(){
    var esc = function(s){ return String(s).replace(/[&<>"]/g, function(c){ return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]; }); };
    $('pgRows').innerHTML = cards.map(function(c, i){
      var vd = verdict(i), id = c.querySelector('.qid .qn'), sh = c.closest('section.part'), st = sh ? sh.querySelector('.sechead h2') : null;
      var idt = id ? id.textContent : '', stt = st ? st.childNodes[0] && st.childNodes[0].nodeType === 3 ? st.childNodes[0].nodeValue : st.textContent : '';
      return '<li><button type="button" class="pgrow ' + vd.v + '" data-pgr="' + i + '" translate="no" aria-label="Question ' + (i + 1) + ', ' + esc(vd.word.toLowerCase()) + (idt ? ', ' + esc(idt) : '') + '">' +
        '<span class="pgri" aria-hidden="true"></span><span class="pgrn">' + (i + 1) + '</span><span class="pgrs"><span class="pgrt">' + esc(stt) + '</span>' + (idt ? '<span class="pgrid">' + esc(idt) + '</span>' : '') + '</span>' +
        '<span class="pgrv">' + esc(vd.word) + '</span><span class="pgchev" aria-hidden="true"></span></button></li>';
    }).join('');
  }
  /* ui.js has painted the sheet: a new set, the same set again (a reload, Start over, a mode switch, another tab), Finish */
  function paint(){
    var S = api.S(); if (!S) return;
    index();
    if (S !== lastS){
      var k = api.key();
      if (!S.pg || typeof S.pg !== 'object') S.pg = {cur: 0, flag: {}};             /* a new set, or this one started over */
      else if (lastS && k === lastKey) S.pg.cur = cur;                                  /* the same set from another tab: this tab stays put */
      if (!S.pg.flag || typeof S.pg.flag !== 'object') S.pg.flag = {};
      var was = lastS; cur = clamp(S.pg.cur);
      view = S.done ? 'sum' : !was ? (lessonLink ? 'quiz' : 'start') : k === lastKey && view === 'start' ? 'start' : 'quiz';
      lastS = S; lastKey = k;
    } else if (!!S.done !== lastDone) view = S.done ? 'sum' : 'quiz';                  /* Finish: the score, with every question under it */
    lastDone = !!S.done; cur = clamp(cur);
    apply();
  }
  /* open question i: on Back, Next, the map, a summary row, or a coach's link to another question */
  function go(i, focus){
    if (!cards.length) return;
    cur = clamp(i); view = 'quiz';
    var S = api.S(); if (S && S.pg && S.pg.cur !== cur){ S.pg.cur = cur; api.save(); }
    apply();
    if (focus){
      var bar = document.querySelector('.watch'), top = bar ? bar.getBoundingClientRect().bottom : 0, r = head.getBoundingClientRect();
      if (r.top < top + 4 || r.top > window.innerHeight * 0.6) window.scrollTo(0, Math.max(0, window.scrollY + r.top - top - 12));
      try { $('pgQ').focus({preventScroll: true}); } catch(e){ $('pgQ').focus(); }
    }
  }
  function summary(){
    view = 'sum'; apply(); window.scrollTo(0, 0);
    var rb = $('result'); if (rb && !rb.hidden){ rb.setAttribute('tabindex', '-1'); try { rb.focus({preventScroll: true}); } catch(e){ rb.focus(); } }
  }

  $('pgPrev').addEventListener('click', function(){ go(cur - 1, true); });
  /* one way forward (Croix, 14 Nov 2026: "I don't want sloppy work"): the coach's Next ↓ after a right answer and its Move on after
     a miss are not shown here (pager.css); the pager's Next does what they did — the next question not right yet, the focus in
     its box — and, when they would not have gone to another question, goes to the next one, as before */
  function coachTo(){ var on = cards[cur], bs = on ? on.querySelectorAll('[data-next],[data-moveon]') : []; return bs.length ? bs[bs.length - 1] : null; }
  $('pgNext').addEventListener('click', function(){
    var cb = view === 'quiz' && coachTo(), was = cur;
    if (cb){ cb.click(); if (cur !== was) return; }
    if (cur < cards.length - 1) go(cur + 1, true);
    else if (done()) summary();
    else { var f = $('bFinish'); if (f && !f.hidden) f.click(); }                        /* ui.js asks, in the bar, as its Finish does */
  });
  $('pgBack').addEventListener('click', summary);
  $('pgStart').addEventListener('click', function(){ go(cur, true); });
  $('pgFlag').addEventListener('click', function(){
    var S = api.S(), q = qOf(cur); if (!S || !S.pg || !q) return;
    if (S.pg.flag[q]) delete S.pg.flag[q]; else S.pg.flag[q] = 1;
    api.save(); this.setAttribute('aria-pressed', String(!!S.pg.flag[q])); paintMap();
  });
  $('pgGrid').addEventListener('click', function(e){ var t = e.target.closest ? e.target.closest('[data-pgi]') : null; if (t) go(+t.getAttribute('data-pgi'), true); });
  $('pgRows').addEventListener('click', function(e){ var t = e.target.closest ? e.target.closest('[data-pgr]') : null; if (t) go(+t.getAttribute('data-pgr'), true); });
  $('pgMt').addEventListener('click', function(){ var o = !map.classList.contains('open'); map.classList.toggle('open', o); this.setAttribute('aria-expanded', String(o)); });
  /* a coach's button that goes to another question (ui.js: Next ↓ after a right answer, Move on after a miss, the end panel's
     "Not right yet" links) opens that question first — in the capture phase, so ui.js then scrolls to it and puts the focus
     in its box as it always has */
  document.addEventListener('click', function(e){
    var t = e.target && e.target.closest ? e.target.closest('[data-next],[data-moveon],[data-jump]') : null; if (!t || !cards.length) return;
    var it = t.hasAttribute('data-next') ? api.byId(t.getAttribute('data-to')) : t.hasAttribute('data-jump') ? api.byId(t.getAttribute('data-jump')) : (function(b){ return b ? api.nextOpen(b) : null; })(api.byId(t.getAttribute('data-moveon')));
    var h = it && api.hostOf(it), c = h && h.closest ? h.closest('.q[data-q]:not(.xq)') : null, i = cards.indexOf(c);
    if (i >= 0 && (i !== cur || view !== 'quiz')) go(i, false);
  }, true);
  /* after a right answer ui.js puts the focus on its Next ↓, which is not shown here: the pager's Next takes it */
  document.addEventListener('click', function(e){
    var t = e.target && e.target.closest ? e.target.closest('[data-check]') : null; if (!t || !cards.length) return;
    var id = t.getAttribute('data-check');
    setTimeout(function(){ if (document.querySelector('[data-next="' + id + '"]')) { try { $('pgNext').focus({preventScroll: true}); } catch(x){ $('pgNext').focus(); } } }, 0);
  });
  /* answered or not, as the student types, taps a choice or builds a graph */
  var raf = 0, later = function(){ if (raf) return; raf = requestAnimationFrame(function(){ raf = 0; if (cards.length) paintMap(); }); };
  ['input', 'change', 'click', 'keyup', 'pointerup'].forEach(function(ev){ paper.addEventListener(ev, later); });
  return {paint: paint, at: function(){ return cards.length ? cur : -1; }};
};
})();
