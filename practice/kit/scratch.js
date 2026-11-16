/* Practice-test kit: scratch paper (15 Nov 2026). Croix: "add a scratch notes to the practice and fast practice as well as a
   scratch grid." Asked what the grid should be, he chose graph paper to plot on: a click drops a point, points join into lines,
   things can be erased, and it works with a Chromebook's trackpad. The FAST gives a typed notepad per question, so the notes are
   typed and kept per question; students never handwrite on a computer (his ruling), so nothing here is freehand.

   One button in the top bar (#bScratch, written by build.py or the site's tools/released.mjs right after #bCalc) opens one
   panel with a switch, Notes | Grid. It always shows the question on the screen, and closes when no question is (the start, the
   score summary, a print preview, a teacher's view). The page drives it the same way on a kit page (ui.js) and on the site's
   FAST pages (fast.js):
     var scr = Kit.Scratch({where: function(){ return null or {set: "<the set's storage name>", q: "<the question's id>",
                                                              label: "Question 4"}; },
                            set: function(){ return "<the set's storage name>"; }});   // set: for reset() with no question shown
     scr.at();     // whenever the question on the screen may have changed
     scr.reset();  // when the set starts over: its scratch is deleted
   - Wide screens: a floating window, as the calculator's is — dragged by its header, docked at the left under the bar at first
     (the calculator docks right), never over the bar, its place remembered (practice.scratch.pos) and kept on the screen when
     the window changes size. With both open, the one pressed last is on top.
   - Phones (≤ 600 px wide, or ≤ 460 px tall): a bottom sheet, not modal; the page behind gets bottom padding as tall as the
     sheet, so the question scrolls clear above it.
   - Notes: one textarea per question; Clear, then Undo until the next edit.
   - Grid: a 20 × 20 square of graph paper, four quadrants (−10 to 10) or the first (0 to 20); Scale 1 · 2 · 5 · 10 is what one
     square is worth (the numbers and the readout change; what is plotted stays on the paper). Point · Segment · Line · Erase,
     every end on an intersection. The arrow keys move a cursor, Enter or Space plots, Delete erases. Nothing on it computes
     anything for the student: no slope, no equation, no length.
   Saved on the device, one entry per set: practice.scratch.v1.<set> = {t, q: {<q>: {n: notes, g: {v: [4 or 1, scale],
   o: [["p",x,y], ["s",x1,y1,x2,y2], ["l",x1,y1,x2,y2]]}}}} in paper squares from the lower left. Each write reads the entry
   again and replaces only the question on the screen (a second tab keeps its other questions); the 30 sets used last are kept.
   Every read and write is in try/catch: with storage refused it all works for the visit. It never asks the network for
   anything. Never printed; translate="no". */
(function(){
'use strict';
var K = window.Kit = window.Kit || {};
K.Scratch = function(host){
  var btn = document.getElementById('bScratch');
  if (!btn || !host || typeof host.where !== 'function') return null;
  /* the page makes room for a docked panel (15 Nov 2026): window.KitDock, the same lines in calc.js and scratch.js, defined by the
     first to load. A panel within 24 px of the window's left or right edge reports how far it reaches in; the page gets that
     much plus a 12 px gap at that side (--dockL, --dockR on <html>; kit.css's calculator block), unless under 520 px would be
     left between the panels, when nothing is reserved and they float. */
  var DOCK = window.KitDock || (window.KitDock = (function(){
    var R = {}, cur = '';
    function paint(){
      var W = document.documentElement.clientWidth, l = 0, r = 0, s = document.documentElement.style;
      Object.keys(R).forEach(function(k){ if (R[k].s === 'l') l = Math.max(l, R[k].e); else r = Math.max(r, R[k].e); });
      if (W - l - r < 520) l = r = 0;
      var L = l ? Math.round(l - 4) : 0, Rt = r ? Math.round(r - 4) : 0, key = L + ',' + Rt;   /* the body's own 16 px padding stays */
      if (key === cur) return; cur = key;
      if (L) s.setProperty('--dockL', L + 'px'); else s.removeProperty('--dockL');
      if (Rt) s.setProperty('--dockR', Rt + 'px'); else s.removeProperty('--dockR');
      document.documentElement.classList.toggle('kdock', !!(L || Rt)); document.documentElement.classList.toggle('kdock2', !!(L && Rt));   /* both: the bar's two buttons are icons */
    }
    return {set: function(id, side, reach){ if (side) R[id] = {s: side, e: reach}; else delete R[id]; paint(); }, paint: paint};
  })());

  var PRE = 'practice.scratch.v1.', TABKEY = 'practice.scratch.tab', POSKEY = 'practice.scratch.pos', KEEP = 30, MAXO = 200, MAXU = 200;
  var GAP = 8, PHONE = '(max-width: 600px), (max-height: 460px)', NS = 'http://www.w3.org/2000/svg';
  var N = 20, C = 18, PP = N * C, M = 26, SCALES = [1, 2, 5, 10];
  var $ = function(id){ return document.getElementById(id); };
  function get(k){ try { return localStorage.getItem(k); } catch(e){ return null; } }
  function put(k, v){ try { localStorage.setItem(k, v); } catch(e){} }
  function vw(){ return document.documentElement.clientWidth || window.innerWidth; }
  function vh(){ return window.innerHeight || document.documentElement.clientHeight; }
  function phone(){ return !!(window.matchMedia && window.matchMedia(PHONE).matches); }
  function barBottom(){ var w = document.querySelector('.watch'); if (!w) return 0; var r = w.getBoundingClientRect(); return r.height ? Math.max(0, Math.round(r.bottom)) : 0; }
  function focusNo(el){ if (!el) return; try { el.focus({preventScroll: true}); } catch(e){ el.focus(); } }
  function esc(s){ return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }
  function isEsc(e){ return e.key === 'Escape' || e.key === 'Esc'; }

  /* ---------------------------------------------------------------- what is kept for one question */
  function blank(){ return {n: '', g: {v: [4, 1], o: []}}; }
  function int(v){ return typeof v === 'number' && v === Math.round(v) && v >= 0 && v <= N; }
  function okThing(t){ return Array.isArray(t) && ((t[0] === 'p' && t.length === 3 && int(t[1]) && int(t[2])) ||
    ((t[0] === 's' || t[0] === 'l') && t.length === 5 && int(t[1]) && int(t[2]) && int(t[3]) && int(t[4]) && (t[1] !== t[3] || t[2] !== t[4]))); }
  function cleanQ(x){
    var d = blank(); if (!x || typeof x !== 'object') return d;
    if (typeof x.n === 'string') d.n = x.n.slice(0, 2000);
    var g = x.g && typeof x.g === 'object' ? x.g : {}, v = Array.isArray(g.v) ? g.v : [];
    d.g.v = [v[0] === 1 ? 1 : 4, SCALES.indexOf(v[1]) >= 0 ? v[1] : 1];
    d.g.o = (Array.isArray(g.o) ? g.o : []).filter(okThing).slice(0, MAXO).map(function(t){ return t.slice(); });
    return d;
  }
  function used(d){ return !!(d && ((d.n && d.n.trim()) || d.g.o.length)); }
  function bare(d){ return !d.n && !d.g.o.length && d.g.v[0] === 4 && d.g.v[1] === 1; }

  /* ---------------------------------------------------------------- the device's copy */
  var MEM = {};                                                 /* storage refused: the visit's own copy */
  function readSet(set){
    var o; try { o = JSON.parse(localStorage.getItem(PRE + set) || 'null'); } catch(e){ return MEM[set] || null; }
    return o && typeof o === 'object' && o.q && typeof o.q === 'object' && !Array.isArray(o.q) ? o : null;
  }
  function prune(keep, mine){
    try {
      var all = [];
      for (var i = 0; i < localStorage.length; i++){ var k = localStorage.key(i); if (k && k.indexOf(PRE) === 0 && k !== mine){ var t = 0; try { t = +(JSON.parse(localStorage.getItem(k) || '{}') || {}).t || 0; } catch(e){} all.push({k: k, t: t}); } }
      all.sort(function(a, b){ return b.t - a.t; });
      all.slice(Math.max(0, keep - (mine ? 1 : 0))).forEach(function(x){ localStorage.removeItem(x.k); });
    } catch(e){}
  }
  function write(){
    if (!CUR) return;
    var k = PRE + CUR.set, e = readSet(CUR.set) || {t: 0, q: {}};
    if (bare(DATA)) delete e.q[CUR.q]; else e.q[CUR.q] = {n: DATA.n, g: {v: DATA.g.v.slice(), o: DATA.g.o.map(function(t){ return t.slice(); })}};
    e.t = Date.now();
    var s = JSON.stringify(e), any = Object.keys(e.q).length > 0; MEM[CUR.set] = e;
    try { if (any) localStorage.setItem(k, s); else localStorage.removeItem(k); }
    catch(err){ prune(10, k); try { localStorage.setItem(k, s); } catch(err2){} }   /* full: the older sets go, then once more */
    if (any) prune(KEEP, k);
  }
  var TIMER = 0, DIRTY = false;
  function later(){ DIRTY = true; clearTimeout(TIMER); TIMER = setTimeout(flush, 300); }
  function flush(){ clearTimeout(TIMER); TIMER = 0; if (DIRTY){ DIRTY = false; write(); } }

  /* ---------------------------------------------------------------- state */
  var CUR = null, DATA = blank(), TAB = get(TABKEY) === 'grid' ? 'grid' : 'notes', TOOL = 'p';
  var UNDO = {}, NUNDO = null, PEND = null, CX = 10, CY = 10, HOVER = false, KB = false, PDOWN = false, GO = -1;
  var P = null, POS = null, D = null, BASEPAD = null, SVG = null;
  function ukey(){ return CUR ? CUR.set + '\n' + CUR.q : ''; }
  function stack(){ var k = ukey(); return UNDO[k] || (UNDO[k] = []); }

  /* ---------------------------------------------------------------- the button */
  function mark(){
    var u = used(DATA) && !!CUR;
    btn.classList.toggle('used', u);
    btn.setAttribute('aria-label', u ? 'Scratch paper, used on this question' : 'Scratch paper');
  }

  /* ---------------------------------------------------------------- the panel, made on the first open */
  var I = {
    p: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle class="f" cx="12" cy="12" r="3.4"/></svg>',
    s: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 17.5l11-11"/><circle class="f" cx="6.5" cy="17.5" r="2.3"/><circle class="f" cx="17.5" cy="6.5" r="2.3"/></svg>',
    l: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20L20 4M14.5 4H20v5.5M9.5 20H4v-5.5"/><circle class="f" cx="9.5" cy="14.5" r="1.9"/><circle class="f" cx="14.5" cy="9.5" r="1.9"/></svg>',
    e: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.6 4.9l5.5 5.5-8.3 8.3H6.9l-2.6-2.6a1.4 1.4 0 010-2z"/><path d="M9.1 9.4l5.5 5.5M11.5 18.7h8"/></svg>',
    q4: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect class="o" x="4" y="4" width="16" height="16" rx="1.5"/><path d="M12 4v16M4 12h16"/></svg>',
    q1: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect class="o" x="4" y="4" width="16" height="16" rx="1.5"/><path d="M5 4v15h15"/></svg>'
  };
  var TOOLS = [['p', 'Point'], ['s', 'Segment'], ['l', 'Line'], ['e', 'Erase']];
  function radios(list, cls){ return list.map(function(r){ return '<button type="button" role="radio" class="' + cls + '" data-v="' + r[0] + '" aria-checked="false" tabindex="-1"' + (r[2] ? ' aria-label="' + r[2] + '"' : '') + '>' + r[1] + '</button>'; }).join(''); }
  function build(){
    if (P) return P;
    P = document.createElement('div'); P.className = 'kscr'; P.id = 'kscr'; P.hidden = true;
    P.setAttribute('role', 'dialog'); P.setAttribute('aria-labelledby', 'kscrT'); P.setAttribute('translate', 'no');
    P.innerHTML = '<div class="ksh" id="kscrH">' +
        '<div class="ksbar"><h2 class="kst" id="kscrT" tabindex="-1">Scratch paper</h2><span class="ksq" id="kscrQ"></span><button type="button" class="ksbtn ksx" id="kscrX">Close</button></div>' +
        '<div class="kssw" role="radiogroup" aria-label="Notes or grid" id="kscrS">' + radios([['notes', 'Notes'], ['grid', 'Grid']], 'kstab') + '</div>' +
      '</div>' +
      '<div class="ksb">' +
        '<div class="ksnotes" id="kscrNP"><textarea class="ksta" id="kscrN" spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off" maxlength="2000"></textarea>' +
          '<div class="ksf"><span></span><span class="ksfb"><button type="button" class="ksbtn" id="kscrNC">Clear</button></span></div></div>' +
        '<div class="ksgrid" id="kscrGP" hidden>' +
          '<div class="kstools" role="radiogroup" aria-label="Tool" id="kscrTo">' + radios(TOOLS.map(function(t){ return [t[0], I[t[0]] + '<span>' + t[1] + '</span>']; }), 'kstool') + '</div>' +
          '<div class="ksopts"><div class="ksseg ksview" role="radiogroup" aria-label="View" id="kscrV">' + radios([['4', I.q4, 'Four quadrants'], ['1', I.q1, 'First quadrant']], 'ksic') + '</div>' +
            '<div class="ksscale"><span class="kslab" id="kscrSL">Scale</span><div class="ksseg" role="radiogroup" aria-labelledby="kscrSL" id="kscrSc">' + radios(SCALES.map(function(s){ return [String(s), String(s)]; }), 'ksnum') + '</div></div></div>' +
          '<div class="ksgw"><svg class="ksg" id="kscrG" xmlns="' + NS + '" viewBox="' + (-M) + ' ' + (-M) + ' ' + (PP + 2 * M) + ' ' + (PP + 2 * M) + '" tabindex="0" role="application" focusable="true"></svg></div>' +
          '<div class="ksf"><span class="ksro" id="kscrR" aria-hidden="true"></span><span class="ksfb"><button type="button" class="ksbtn" id="kscrU">Undo</button><button type="button" class="ksbtn" id="kscrC">Clear</button></span></div>' +
          '<div class="kssr" id="kscrL" aria-live="polite"></div>' +
        '</div>' +
      '</div>';
    var bar = document.querySelector('.watch');
    if (bar && bar.parentNode) bar.parentNode.insertBefore(P, bar.nextSibling); else document.body.appendChild(P);
    btn.setAttribute('aria-controls', 'kscr');
    SVG = $('kscrG');

    $('kscrX').addEventListener('click', function(){ close(true); });
    P.addEventListener('keydown', function(e){ if (isEsc(e)){ e.preventDefault(); e.stopPropagation(); close(true); } });
    group($('kscrS'), function(v){ setTab(v, true); });
    group($('kscrTo'), function(v){ TOOL = v; PEND = null; GO = -1; paintTools(); drawLive(); });
    group($('kscrV'), function(v){ DATA.g.v[0] = +v; later(); paintOpts(); draw(); });
    group($('kscrSc'), function(v){ DATA.g.v[1] = +v; later(); paintOpts(); draw(); });

    var ta = $('kscrN');
    ta.addEventListener('input', function(){ DATA.n = ta.value.slice(0, 2000); NUNDO = null; later(); paintNotes(); mark(); });
    ta.addEventListener('blur', flush);
    $('kscrNC').addEventListener('click', function(){
      if (NUNDO != null){ DATA.n = NUNDO; NUNDO = null; } else { if (!DATA.n) return; NUNDO = DATA.n; DATA.n = ''; }
      ta.value = DATA.n; later(); paintNotes(); mark();
    });
    $('kscrU').addEventListener('click', function(){ undo(); keepFocus(); });
    $('kscrC').addEventListener('click', function(){ clearAll(); keepFocus(); });
    graphEvents();

    /* dragging (wide screens): by the header, not by its buttons */
    var hd = $('kscrH');
    hd.addEventListener('pointerdown', function(e){
      if (P.classList.contains('kssheet') || (e.button != null && e.button !== 0) || (e.target.closest && e.target.closest('button'))) return;
      var r = P.getBoundingClientRect(); D = {id: e.pointerId, dx: e.clientX - r.left, dy: e.clientY - r.top};
      try { hd.setPointerCapture(e.pointerId); } catch(err){}
      P.classList.add('ksdrag'); e.preventDefault();
    });
    hd.addEventListener('pointermove', function(e){ if (D && e.pointerId === D.id) moveTo(e.clientX - D.dx, e.clientY - D.dy, true); });
    var end = function(e){ if (!D || e.pointerId !== D.id) return; D = null; P.classList.remove('ksdrag'); if (POS) put(POSKEY, JSON.stringify(POS)); };
    hd.addEventListener('pointerup', end); hd.addEventListener('pointercancel', end); hd.addEventListener('lostpointercapture', end);

    /* the one pressed last is on top: this panel or the calculator's */
    P.addEventListener('pointerdown', function(){ P.style.zIndex = '31'; }, true);
    document.addEventListener('pointerdown', function(e){ var c = $('kcalc'); if (c && e.target && c.contains(e.target)) P.style.zIndex = '29'; }, true);
    var cb = $('bCalc'); if (cb) cb.addEventListener('click', function(){ P.style.zIndex = '29'; });

    window.addEventListener('resize', layout);
    if (window.ResizeObserver){ var ro = new ResizeObserver(function(){ if (P.classList.contains('kssheet')) pad(true); }); ro.observe(P); if (bar) new ResizeObserver(layout).observe(bar); }
    try { POS = JSON.parse(get(POSKEY) || 'null'); } catch(e){ POS = null; }
    if (!POS || (POS.s !== 'l' && POS.s !== 'r') || !isFinite(POS.x) || !isFinite(POS.y)) POS = null;
    return P;
  }
  /* a radiogroup: a click picks; the arrows, Home and End move and pick */
  function group(el, pick){
    var all = function(){ return Array.prototype.slice.call(el.querySelectorAll('[role=radio]')); };
    el.addEventListener('click', function(e){ var b = e.target.closest && e.target.closest('[role=radio]'); if (b) pick(b.getAttribute('data-v')); });
    el.addEventListener('keydown', function(e){
      var o = all(), i = o.indexOf(e.target.closest ? e.target.closest('[role=radio]') : null); if (i < 0) return;
      var j = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? (i + 1) % o.length : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? (i + o.length - 1) % o.length : e.key === 'Home' ? 0 : e.key === 'End' ? o.length - 1 : -1;
      if (j < 0) return; e.preventDefault(); pick(o[j].getAttribute('data-v')); o[j].focus(); });
  }
  function check(el, v){ Array.prototype.forEach.call(el.querySelectorAll('[role=radio]'), function(b){ var on = b.getAttribute('data-v') === String(v); b.setAttribute('aria-checked', String(on)); b.tabIndex = on ? 0 : -1; }); }
  function keepFocus(){ var a = document.activeElement; if (a && a.disabled) focusNo(!$('kscrU').disabled ? $('kscrU') : SVG); }

  /* ---------------------------------------------------------------- painting the panel */
  function paint(){
    if (!P || !CUR) return;
    $('kscrQ').textContent = CUR.label || '';
    $('kscrN').setAttribute('aria-label', 'Notes' + (CUR.label ? ', ' + CUR.label : ''));
    SVG.setAttribute('aria-label', 'Graph paper' + (CUR.label ? ', ' + CUR.label : ''));
    if ($('kscrN').value !== DATA.n) $('kscrN').value = DATA.n;
    check($('kscrS'), TAB); $('kscrNP').hidden = TAB !== 'notes'; $('kscrGP').hidden = TAB !== 'grid';
    paintNotes(); paintTools(); paintOpts(); draw();
  }
  function paintNotes(){ var b = $('kscrNC'); b.textContent = NUNDO != null ? 'Undo' : 'Clear'; b.disabled = NUNDO == null && !DATA.n; }
  function paintTools(){ check($('kscrTo'), TOOL); SVG.setAttribute('data-tool', TOOL); }
  function paintOpts(){ check($('kscrV'), DATA.g.v[0]); check($('kscrSc'), DATA.g.v[1]); }
  function paintFoot(){ $('kscrU').disabled = !stack().length; $('kscrC').disabled = !DATA.g.o.length; }
  function setTab(v, keep){
    TAB = v === 'grid' ? 'grid' : 'notes'; if (keep) put(TABKEY, TAB);
    PEND = null; GO = -1;
    if (P && !P.hidden){ paint(); layout(); }
  }

  /* ---------------------------------------------------------------- the graph paper */
  function quad(){ return DATA.g.v[0] === 4; }
  function val(g, axis){ var s = DATA.g.v[1]; return (quad() ? g - 10 : g) * s; }
  function num(n){ return n < 0 ? '−' + (-n) : String(n); }
  function pt(x, y){ return '(' + num(val(x)) + ', ' + num(val(y)) + ')'; }
  function X(g){ return g * C; } function Y(g){ return PP - g * C; }
  function arrow(x, y, dx, dy, cls){
    var L = Math.sqrt(dx * dx + dy * dy) || 1, ux = dx / L, uy = dy / L, a = 9, b = 4.6;
    return '<path class="' + cls + '" d="M' + f(x) + ' ' + f(y) + 'L' + f(x - ux * a - uy * b) + ' ' + f(y - uy * a + ux * b) + 'L' + f(x - ux * a + uy * b) + ' ' + f(y - uy * a - ux * b) + 'Z"/>';
  }
  function f(n){ return Math.round(n * 100) / 100; }
  function paperSvg(){
    var h = ['<rect class="kspp" x="0" y="0" width="' + PP + '" height="' + PP + '"/>'], d = '', i;
    for (i = 0; i <= N; i++) d += 'M' + i * C + ' 0V' + PP + 'M0 ' + i * C + 'H' + PP;
    h.push('<path class="ksgl" d="' + d + '"/>');
    var q = quad(), ax = q ? X(10) : 0, ay = q ? Y(10) : PP, E = 11, s = DATA.g.v[1];
    h.push('<path class="ksax" d="M' + (q ? -E + 4 : 0) + ' ' + ay + 'H' + (PP + E - 4) + 'M' + ax + ' ' + (q ? PP + E - 4 : PP) + 'V' + (-E + 4) + '"/>');
    h.push(arrow(PP + E, ay, 1, 0, 'ksah') + arrow(ax, -E, 0, -1, 'ksah'));
    if (q) h.push(arrow(-E, ay, -1, 0, 'ksah') + arrow(ax, PP + E, 0, 1, 'ksah'));
    h.push('<text class="ksxy" x="' + (PP + E + 3) + '" y="' + (ay + 4.5) + '">x</text><text class="ksxy" x="' + (ax + 7) + '" y="' + (-E + 4) + '">y</text>');
    var t = [], halo = q ? ' h' : '';
    for (i = q ? -10 : 2; i <= (q ? 10 : 20); i += 2){
      if (!i) continue;
      t.push('<text class="ksn' + halo + '" x="' + (ax + i * C) + '" y="' + (ay + 15) + '" text-anchor="middle">' + num(i * s) + '</text>');
      t.push('<text class="ksn' + halo + '" x="' + (ax - 5) + '" y="' + (ay - i * C + 4) + '" text-anchor="end">' + num(i * s) + '</text>');
    }
    if (!q) t.push('<text class="ksn" x="' + (ax - 5) + '" y="' + (ay + 15) + '" text-anchor="end">0</text>');   /* four quadrants: no 0 crowding the origin */
    h.push('<g aria-hidden="true">' + t.join('') + '</g>');
    return h.join('');
  }
  /* a line through two points, to the paper's edges */
  function clip(t){
    var x1 = t[1], y1 = t[2], dx = t[3] - x1, dy = t[4] - y1, lo = -Infinity, hi = Infinity;
    [[dx, x1], [dy, y1]].forEach(function(a){ if (a[0] === 0) return; var u = (0 - a[1]) / a[0], v = (N - a[1]) / a[0]; lo = Math.max(lo, Math.min(u, v)); hi = Math.min(hi, Math.max(u, v)); });
    return [x1 + dx * lo, y1 + dy * lo, x1 + dx * hi, y1 + dy * hi];
  }
  function thingSvg(t, cls){
    var k = cls ? ' ' + cls : '';
    if (t[0] === 'p') return cls ? '<circle class="ksdo' + k + '" cx="' + X(t[1]) + '" cy="' + Y(t[2]) + '" r="5"/>' : '<circle class="ksdot" cx="' + X(t[1]) + '" cy="' + Y(t[2]) + '" r="4.6"/>';
    var ends = '<circle class="ksdot' + k + '" cx="' + X(t[1]) + '" cy="' + Y(t[2]) + '" r="3.6"/><circle class="ksdot' + k + '" cx="' + X(t[3]) + '" cy="' + Y(t[4]) + '" r="3.6"/>';
    if (t[0] === 's') return '<line class="kspen' + k + '" x1="' + X(t[1]) + '" y1="' + Y(t[2]) + '" x2="' + X(t[3]) + '" y2="' + Y(t[4]) + '"/>' + ends;
    var c = clip(t), ax = X(c[0]), ay = Y(c[1]), bx = X(c[2]), by = Y(c[3]), dx = bx - ax, dy = by - ay, L = Math.sqrt(dx * dx + dy * dy) || 1, ux = dx / L, uy = dy / L;
    return '<line class="kspen' + k + '" x1="' + f(ax + ux * 6) + '" y1="' + f(ay + uy * 6) + '" x2="' + f(bx - ux * 6) + '" y2="' + f(by - uy * 6) + '"/>' +
      arrow(bx, by, ux, uy, 'ksarr' + k) + arrow(ax, ay, -ux, -uy, 'ksarr' + k) + ends;
  }
  function draw(){
    if (!SVG) return;
    SVG.innerHTML = '<g class="ksbase">' + paperSvg() + '</g><g class="ksitems"></g><g class="kslive"></g>';
    drawItems(); paintFoot();
  }
  function drawItems(){
    var g = SVG && SVG.querySelector('.ksitems'); if (!g) return;
    var o = DATA.g.o, h = [];
    o.forEach(function(t, i){ if (t[0] !== 'p') h.push(thingSvg(t, i === GO ? 'ksgo' : '')); });
    o.forEach(function(t, i){ if (t[0] === 'p') h.push(thingSvg(t, i === GO ? 'ksgo' : '')); });   /* points over lines */
    g.innerHTML = h.join('');
    drawLive();
  }
  function drawLive(){
    var g = SVG && SVG.querySelector('.kslive'); if (!g) return;
    var on = HOVER || (KB && document.activeElement === SVG), h = [];
    if (PEND && on && (PEND[0] !== CX || PEND[1] !== CY)){
      var t = [TOOL, PEND[0], PEND[1], CX, CY];
      if (TOOL === 'l'){ var c = clip(t); h.push('<line class="kspv" x1="' + f(X(c[0])) + '" y1="' + f(Y(c[1])) + '" x2="' + f(X(c[2])) + '" y2="' + f(Y(c[3])) + '"/>'); }
      else h.push('<line class="kspv" x1="' + X(PEND[0]) + '" y1="' + Y(PEND[1]) + '" x2="' + X(CX) + '" y2="' + Y(CY) + '"/>');
    }
    if (PEND) h.push('<circle class="ksdot" cx="' + X(PEND[0]) + '" cy="' + Y(PEND[1]) + '" r="3.6"/>');
    if (on){
      if (KB) h.push('<circle class="ksring2" cx="' + X(CX) + '" cy="' + Y(CY) + '" r="9.6"/>');
      h.push('<circle class="ksring" cx="' + X(CX) + '" cy="' + Y(CY) + '" r="7.6"/>');
    }
    g.innerHTML = h.join('');
    SVG.classList.toggle('kb', KB && document.activeElement === SVG);
    $('kscrR').textContent = on ? pt(CX, CY) : '';
  }

  /* what is near: a point before a segment or a line; within tol squares */
  function dist(t, x, y){
    if (t[0] === 'p') return Math.hypot(t[1] - x, t[2] - y);
    var ax = t[1], ay = t[2], dx = t[3] - ax, dy = t[4] - ay, L = dx * dx + dy * dy, u = ((x - ax) * dx + (y - ay) * dy) / L;
    if (t[0] === 's') u = Math.max(0, Math.min(1, u));
    return Math.hypot(ax + u * dx - x, ay + u * dy - y);
  }
  function near(x, y, tol){
    var best = -1, bd = Infinity, pass;
    for (pass = 0; pass < 2; pass++){
      DATA.g.o.forEach(function(t, i){ if ((t[0] === 'p') !== !pass) return; var d = dist(t, x, y); if (d <= tol && d < bd){ bd = d; best = i; } });
      if (best >= 0) return best;
    }
    return -1;
  }
  function same(a, b){
    if (a[0] !== b[0]) return false;
    if (a[0] === 'p') return a[1] === b[1] && a[2] === b[2];
    if (a[0] === 's') return (a[1] === b[1] && a[2] === b[2] && a[3] === b[3] && a[4] === b[4]) || (a[1] === b[3] && a[2] === b[4] && a[3] === b[1] && a[4] === b[2]);
    var cr = function(x, y){ return (a[3] - a[1]) * (y - a[2]) - (a[4] - a[2]) * (x - a[1]); };
    return cr(b[1], b[2]) === 0 && cr(b[3], b[4]) === 0;   /* the same line through other points */
  }
  function add(t){
    if (DATA.g.o.length >= MAXO || DATA.g.o.some(function(o){ return same(o, t); })) return;
    DATA.g.o.push(t); push({a: 'add', t: t}); changed();
  }
  function eraseAt(i){ if (i < 0) return; var t = DATA.g.o.splice(i, 1)[0]; push({a: 'del', t: t, i: i}); GO = -1; changed(); }
  function clearAll(){ if (!DATA.g.o.length) return; push({a: 'clr', o: DATA.g.o.slice()}); DATA.g.o = []; PEND = null; GO = -1; changed(); }
  function push(u){ var s = stack(); s.push(u); if (s.length > MAXU) s.shift(); }
  function undo(){
    var u = stack().pop(); if (!u) return;
    if (u.a === 'add'){ var i = DATA.g.o.lastIndexOf(u.t); if (i >= 0) DATA.g.o.splice(i, 1); }
    else if (u.a === 'del') DATA.g.o.splice(Math.min(u.i, DATA.g.o.length), 0, u.t);
    else DATA.g.o = u.o.slice();
    GO = -1; changed();
  }
  function describe(t){
    if (t[0] === 'p') return 'Point ' + pt(t[1], t[2]);
    if (t[0] === 's') return 'Segment ' + pt(t[1], t[2]) + ' to ' + pt(t[3], t[4]);
    return 'Line through ' + pt(t[1], t[2]) + ' and ' + pt(t[3], t[4]);
  }
  function say(s){ var l = $('kscrL'); if (!l) return; l.textContent = ''; setTimeout(function(){ l.textContent = s; }, 30); }
  function changed(){
    later(); drawItems(); paintFoot(); mark();
    say(DATA.g.o.length ? DATA.g.o.map(describe).join('. ') + '.' : 'Nothing on the graph paper.');
  }
  function sayCursor(){
    var at = DATA.g.o.filter(function(t){ return dist(t, CX, CY) < 0.01; }).map(function(t){ return t[0] === 'p' ? 'point' : t[0] === 's' ? 'segment' : 'line'; });
    say(pt(CX, CY) + (at.length ? ', ' + at.join(', ') : '') + (PEND ? ', from ' + pt(PEND[0], PEND[1]) : ''));
  }
  function act(x, y){
    if (TOOL === 'p') add(['p', x, y]);
    else if (TOOL === 'e') eraseAt(GO >= 0 ? GO : near(x, y, 0.35));
    else if (!PEND){ PEND = [x, y]; drawLive(); }
    else if (PEND[0] !== x || PEND[1] !== y){ var p = PEND; PEND = null; add([TOOL, p[0], p[1], x, y]); }
  }
  function toPaper(e){
    var m = SVG.getScreenCTM(); if (!m) return null;
    var p = SVG.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; p = p.matrixTransform(m.inverse());
    return {x: p.x / C, y: (PP - p.y) / C, px: Math.abs(m.a) * C};
  }
  function snapTo(p){ CX = Math.max(0, Math.min(N, Math.round(p.x))); CY = Math.max(0, Math.min(N, Math.round(p.y))); }
  function graphEvents(){
    var downAt = null;
    var hover = function(p){ var g = TOOL === 'e' ? near(p.x, p.y, 10 / p.px) : -1; if (g !== GO){ GO = g; drawItems(); } else drawLive(); };
    SVG.addEventListener('pointerdown', function(e){
      if (e.button != null && e.button !== 0) return;
      PDOWN = true; KB = false; var p = toPaper(e); if (!p) return;
      HOVER = true; snapTo(p); hover(p); downAt = [CX, CY, GO];
      try { SVG.setPointerCapture(e.pointerId); } catch(err){}
      if ((TOOL === 's' || TOOL === 'l') && !PEND){ PEND = [CX, CY]; downAt.push(1); drawLive(); }
      focusNo(SVG); PDOWN = false; e.preventDefault();
    });
    SVG.addEventListener('pointermove', function(e){ var p = toPaper(e); if (!p) return; var was = HOVER, x = CX, y = CY; HOVER = true; snapTo(p); if (!was || x !== CX || y !== CY || TOOL === 'e') hover(p); });
    SVG.addEventListener('pointerup', function(e){
      if (!downAt) return; var d = downAt; downAt = null; var p = toPaper(e); if (p) snapTo(p);
      if (TOOL === 'p') add(['p', d[0], d[1]]);
      else if (TOOL === 'e') eraseAt(d[2]);
      else if (PEND && (PEND[0] !== CX || PEND[1] !== CY)){ var a = PEND; PEND = null; add([TOOL, a[0], a[1], CX, CY]); }
      if (e.pointerType && e.pointerType !== 'mouse'){ HOVER = false; GO = -1; drawItems(); }
    });
    SVG.addEventListener('pointercancel', function(){ downAt = null; HOVER = false; drawLive(); });
    SVG.addEventListener('pointerleave', function(){ if (downAt) return; HOVER = false; if (GO >= 0){ GO = -1; drawItems(); } else drawLive(); });
    SVG.addEventListener('focus', function(){ if (!PDOWN){ KB = true; drawLive(); } });
    SVG.addEventListener('blur', function(){ KB = false; if (GO >= 0 && !HOVER){ GO = -1; drawItems(); } else drawLive(); });
    SVG.addEventListener('keydown', function(e){
      var k = e.key, st = e.shiftKey ? 5 : 1, mv = {ArrowLeft: [-st, 0], ArrowRight: [st, 0], ArrowUp: [0, st], ArrowDown: [0, -st]}[k];
      if (mv){ e.preventDefault(); KB = true; CX = Math.max(0, Math.min(N, CX + mv[0])); CY = Math.max(0, Math.min(N, CY + mv[1]));
        var g = TOOL === 'e' ? near(CX, CY, 0.35) : -1; if (g !== GO){ GO = g; drawItems(); } else drawLive(); sayCursor(); return; }
      if (k === 'Enter' || k === ' ' || k === 'Spacebar'){ e.preventDefault(); KB = true; act(CX, CY); if (PEND) sayCursor(); return; }
      if (k === 'Backspace' || k === 'Delete'){ e.preventDefault(); KB = true; eraseAt(near(CX, CY, 0.35)); return; }
      if (isEsc(e) && PEND){ e.preventDefault(); e.stopPropagation(); PEND = null; drawLive(); sayCursor(); }
    });
  }

  /* ---------------------------------------------------------------- the place and the size */
  function layout(){
    if (!P || P.hidden) return;
    var sheet = phone();
    P.classList.toggle('kssheet', sheet);
    fit(sheet); place(sheet); pad(sheet);
  }
  function fit(sheet){
    var top = sheet ? 0 : barBottom() + GAP, room = sheet ? Math.floor(vh() * (TAB === 'grid' ? 0.7 : 0.6)) : vh() - top - GAP;
    P.style.maxHeight = room + 'px';
    if (TAB !== 'grid'){ P.style.setProperty('--ksgs', ''); return; }
    var w = sheet ? Math.min(vw() - 24, 420) : 372;
    P.style.setProperty('--ksgs', w + 'px');
    var over = P.scrollHeight - room;
    if (over > 0) P.style.setProperty('--ksgs', Math.max(200, w - over) + 'px');
  }
  function place(sheet){
    if (sheet){ P.style.left = ''; P.style.top = ''; DOCK.set('scratch', null); return; }
    if (POS) moveTo(POS.s === 'l' ? POS.x : vw() - P.offsetWidth - POS.x, POS.y, false); else moveTo(2 * GAP, barBottom() + GAP + 4, false);
  }
  function moveTo(x, y, remember){
    var w = P.offsetWidth, h = P.offsetHeight, top0 = barBottom() + GAP, W = vw(), H = vh();
    x = Math.round(Math.min(Math.max(x, GAP), Math.max(GAP, W - w - GAP)));
    y = Math.round(Math.min(Math.max(y, top0), Math.max(top0, H - h - GAP)));
    P.style.left = x + 'px'; P.style.top = y + 'px';
    if (remember){ var r = W - x - w; POS = r < x ? {s: 'r', x: Math.max(0, r), y: y} : {s: 'l', x: x, y: y}; }
    DOCK.set('scratch', x <= 24 ? 'l' : W - x - w <= 24 ? 'r' : null, x <= 24 ? x + w : W - x);
  }
  /* the phone's sheet: the page gets room under it (screen only, so paper is never changed) */
  function pad(on){
    var de = document.documentElement;
    if (on && P && !P.hidden){
      if (BASEPAD == null){ de.classList.remove('kscr-pad'); BASEPAD = parseFloat(getComputedStyle(document.body).paddingBottom) || 0; }
      de.style.setProperty('--kscrpad', Math.ceil(BASEPAD + P.offsetHeight) + 'px'); de.classList.add('kscr-pad');
    } else { de.classList.remove('kscr-pad'); de.style.removeProperty('--kscrpad'); BASEPAD = null; }
  }

  /* ---------------------------------------------------------------- open and close */
  function open(){
    if (!CUR) return;
    build(); P.hidden = false; btn.setAttribute('aria-expanded', 'true'); P.style.zIndex = '31';
    paint(); layout();
    focusNo(phone() ? $('kscrT') : TAB === 'grid' ? SVG : $('kscrN'));
  }
  function close(back){
    if (!P || P.hidden) return;
    flush(); PEND = null; GO = -1; HOVER = false;
    P.hidden = true; btn.setAttribute('aria-expanded', 'false'); pad(false); DOCK.set('scratch', null);
    if (D){ D = null; P.classList.remove('ksdrag'); }
    if (back && !btn.hidden) focusNo(btn);
  }
  btn.addEventListener('click', function(){ if (P && !P.hidden) close(true); else open(); });
  btn.addEventListener('keydown', function(e){ if (isEsc(e) && P && !P.hidden){ e.preventDefault(); e.stopPropagation(); close(true); } });

  /* ---------------------------------------------------------------- following the page */
  function loadQ(){ var e = CUR && readSet(CUR.set); return cleanQ(e && e.q[CUR.q]); }
  function at(){
    var w = null; try { w = host.where(); } catch(e){ w = null; }
    if (w && (w.set == null || w.q == null)) w = null;
    btn.hidden = !w;
    if (!w){ close(false); flush(); CUR = null; DATA = blank(); mark(); return; }
    var q = String(w.q), set = String(w.set);
    if (!CUR || CUR.set !== set || CUR.q !== q){
      flush();
      CUR = {set: set, q: q, label: w.label || ''}; DATA = loadQ(); NUNDO = null; PEND = null; GO = -1;
      CX = quad() ? 10 : 0; CY = CX;
      if (P && !P.hidden){ paint(); layout(); }
    } else if (CUR.label !== (w.label || '')){ CUR.label = w.label || ''; if (P && !P.hidden) paint(); }
    mark();
  }
  function reset(){
    var set = null; try { set = host.set ? host.set() : null; } catch(e){}
    if (set == null && CUR) set = CUR.set;
    if (set == null) return;
    set = String(set);
    clearTimeout(TIMER); TIMER = 0;
    if (CUR && CUR.set === set) DIRTY = false;
    delete MEM[set]; try { localStorage.removeItem(PRE + set); } catch(e){}
    Object.keys(UNDO).forEach(function(k){ if (k.indexOf(set + '\n') === 0) delete UNDO[k]; });
    if (CUR && CUR.set === set){ CUR = null; DATA = blank(); }
    at();
  }
  window.addEventListener('pagehide', flush);
  window.addEventListener('storage', function(e){
    if (!CUR || (e.key !== null && e.key !== PRE + CUR.set)) return;
    if (P && !P.hidden && P.contains(document.activeElement)) return;
    flush(); DATA = loadQ(); NUNDO = null; PEND = null; GO = -1; mark(); if (P && !P.hidden) paint();
  });
  if (window.MutationObserver) new MutationObserver(at).observe(document.body, {attributes: true, attributeFilter: ['class', 'data-view']});
  at();
  return {at: at, reset: reset};
};
})();
