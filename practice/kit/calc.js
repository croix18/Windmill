/* Practice-test kit: the calculators (8 Nov 2026). Croix, of the Desmos scientific calculator students get on the Florida FAST
   math test: "if you can get it to load inside the practices and practice tests that would be a dream come true"; then, of Alden
   Bradford's TI-30Xa emulator: "I would also like this t130xa calculator embedded as well … it should be the same as the desmos."

   A Calculator button in the top bar (#bCalc, written by build.py) opens one panel with a switch: FAST (Desmos) | TI-30Xa.
   Each calculator is its author's own page in an iframe, by its address, never copied. These two addresses are the kit's only
   outside requests, and each is made only when a student picks that calculator: no iframe exists until then and nothing is
   prefetched. Afterwards closing only hides the panel, and switching only hides the other calculator, so a student's work in
   either stays while the page is open.
   - Wide screens: a floating window, like the test's own — dragged by its header, docked at the right side at first, never over
     the top bar, its place remembered on the device (practice.calc.pos, from its nearer side, so a window that changes size
     keeps it on that side) and kept on the screen when the window changes size. Each calculator has its own natural size (the
     FAST one 360 × 560, as on the test); in a short window the FAST one gets shorter (Desmos lays itself out again) and the
     TI-30Xa is drawn smaller whole (a picture of a calculator cannot reflow).
   - Phones (≤ 600 px wide, or ≤ 460 px tall): a full-height sheet with Close; the page behind it is inert while it is open.
   - The header: the title and Close; the switch (a radiogroup — the arrows move and choose; the pick is remembered,
     practice.calc.pick); an always-visible "Open in a new tab" link to the calculator shown — if a site refuses to be framed,
     the frame shows the browser's error and the link is the way through. Offline (navigator.onLine false) one line beside the
     link says the calculator needs the internet; a frame first opened offline is loaded again when the device is back online.
   - Opening puts focus on the panel's header; Escape (focus in the panel, or on the button) closes it and gives focus back to
     the button.
   - Never printed (kit.css @media print), never over a print preview or the teacher's panels; translate="no", so the kit's own
     second language and a browser's translator leave its words alone (two of them are names).
   Every storage read and write is in try/catch: with storage refused, everything works for the visit. */
(function(){
'use strict';
var btn = document.getElementById('bCalc'); if (!btn) return;

var CALCS = {
  /* the FAST test's calculator (Cambium's Desmos for assessment, its restricted scientific mode): a live app that fills the size
     it is given, so it is sized, never scaled */
  fast: {name: 'FAST (Desmos)', title: 'FAST calculator (Desmos scientific)', url: 'https://desmosforassessment.cambiumtds.com/TDSCalculator.html?mode=tds_dc_scirestricted', w: 360, h: 560, fluid: true},
  /* Alden Bradford's TI-30Xa emulator (github.com/AldenMB/calculator_emulator, GPL-3.0; the photo of the calculator is Texas
     Instruments'): a fixed 315.6 × 600 picture, 28 px into its page — 372 px wide, and 17 more so that a classic scrollbar in
     the frame never pushes the right-hand keys out of sight; 636 px down shows the whole calculator */
  ti: {name: 'TI-30Xa', title: 'TI-30Xa calculator', url: 'https://aldenbradford.com/calculator_emulator/', w: 389, h: 636, fluid: false,
       credit: 'TI-30Xa emulator by Alden Bradford'}
};
var ORDER = ['fast', 'ti'];
var PICKKEY = 'practice.calc.pick', POSKEY = 'practice.calc.pos';
var GAP = 8, MINW = 372, PHONE = '(max-width: 600px), (max-height: 460px)';

function get(k){ try { return localStorage.getItem(k); } catch(e){ return null; } }
function put(k, v){ try { localStorage.setItem(k, v); } catch(e){} }
function vw(){ return document.documentElement.clientWidth || window.innerWidth; }
function vh(){ return window.innerHeight || document.documentElement.clientHeight; }
function phone(){ return !!(window.matchMedia && window.matchMedia(PHONE).matches); }
function barBottom(){ var w = document.querySelector('.watch'); if (!w) return 0; var r = w.getBoundingClientRect(); return r.height ? Math.max(0, Math.round(r.bottom)) : 0; }
function esc(s){ return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }
function px(v){ return parseFloat(v) || 0; }
function focusNo(el){ try { el.focus({preventScroll: true}); } catch(e){ el.focus(); } }

var P = null, F = {}, pick = null, POS = null, INERT = [], D = null;
var EXT = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 16L16 8M9 8h7v7"/></svg>';

/* the panel: made on the first open and placed right after the top bar (Tab goes from the bar's buttons into it, then on to the
   sheet); no iframe yet — frame() makes each one when its calculator is first picked */
function build(){
  if (P) return P;
  P = document.createElement('div'); P.className = 'kcalc'; P.id = 'kcalc'; P.hidden = true;
  P.setAttribute('role', 'dialog'); P.setAttribute('aria-labelledby', 'kcalcT'); P.setAttribute('translate', 'no');
  P.innerHTML = '<div class="kch" id="kcalcH">' +
      '<div class="kcbar"><h2 class="kct" id="kcalcT" tabindex="-1">Calculator</h2><button type="button" class="kcx" id="kcalcX">Close</button></div>' +
      '<div class="kcrow"><div class="kcsw" role="radiogroup" aria-label="Which calculator">' +
        ORDER.map(function(k){ return '<button type="button" role="radio" data-calc="' + k + '" aria-checked="false" tabindex="-1">' + esc(CALCS[k].name) + '</button>'; }).join('') +
      '</div><div class="kcl"><span class="kcoff" id="kcalcO" role="status" hidden>The calculator needs the internet.</span>' +
        '<a class="kcnew" id="kcalcN" href="' + esc(CALCS.fast.url) + '" target="_blank" rel="noopener noreferrer">Open in a new tab<span class="kcsr" id="kcalcNs"></span>' + EXT + '</a></div></div>' +
    '</div><div class="kcb" id="kcalcB"></div>';
  var bar = document.querySelector('.watch');
  if (bar && bar.parentNode) bar.parentNode.insertBefore(P, bar.nextSibling); else document.body.appendChild(P);
  btn.setAttribute('aria-controls', 'kcalc');

  P.querySelector('#kcalcX').addEventListener('click', function(){ close(true); });
  P.addEventListener('keydown', function(e){ if (e.key === 'Escape' || e.key === 'Esc'){ e.preventDefault(); e.stopPropagation(); close(true); } });
  var sw = P.querySelector('.kcsw'), radios = function(){ return Array.prototype.slice.call(sw.querySelectorAll('[role=radio]')); };
  sw.addEventListener('click', function(e){ var b = e.target.closest && e.target.closest('[role=radio]'); if (b) setPick(b.getAttribute('data-calc'), true); });
  sw.addEventListener('keydown', function(e){
    var o = radios(), i = o.indexOf(e.target.closest ? e.target.closest('[role=radio]') : null); if (i < 0) return;
    var j = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? (i + 1) % o.length : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? (i + o.length - 1) % o.length : e.key === 'Home' ? 0 : e.key === 'End' ? o.length - 1 : -1;
    if (j < 0) return; e.preventDefault(); setPick(o[j].getAttribute('data-calc'), true); o[j].focus(); });

  /* dragging (wide screens): by the header, not by its controls; the frames take no pointer while it moves */
  var hd = P.querySelector('#kcalcH');
  hd.addEventListener('pointerdown', function(e){
    if (P.classList.contains('kcfull') || (e.button != null && e.button !== 0) || (e.target.closest && e.target.closest('button,a'))) return;
    var r = P.getBoundingClientRect(); D = {id: e.pointerId, dx: e.clientX - r.left, dy: e.clientY - r.top};
    try { hd.setPointerCapture(e.pointerId); } catch(err){}
    P.classList.add('kcdrag'); e.preventDefault();
  });
  hd.addEventListener('pointermove', function(e){ if (D && e.pointerId === D.id) moveTo(e.clientX - D.dx, e.clientY - D.dy, true); });
  var end = function(e){ if (!D || e.pointerId !== D.id) return; D = null; P.classList.remove('kcdrag'); if (POS) put(POSKEY, JSON.stringify(POS)); };
  hd.addEventListener('pointerup', end); hd.addEventListener('pointercancel', end); hd.addEventListener('lostpointercapture', end);

  window.addEventListener('resize', layout);
  if (window.ResizeObserver && bar) new ResizeObserver(layout).observe(bar);
  window.addEventListener('offline', net);
  window.addEventListener('online', function(){ net(); ORDER.forEach(function(k){ var f = F[k]; if (f && f.offline){ f.offline = false; f.f.setAttribute('src', CALCS[k].url); } }); });
  try { POS = JSON.parse(get(POSKEY) || 'null'); } catch(e){ POS = null; }
  if (!POS || (POS.s !== 'l' && POS.s !== 'r') || !isFinite(POS.x) || !isFinite(POS.y)) POS = null;
  return P;
}

/* a calculator's frame, made the first time it is picked: no referrer, its own title, its exact address */
function frame(k){
  if (F[k]) return F[k];
  var c = CALCS[k], wrap = document.createElement('div'); wrap.className = 'kcfr'; wrap.setAttribute('data-calc', k);
  var sc = document.createElement('div'); sc.className = 'kcsc';
  var f = document.createElement('iframe');
  f.setAttribute('referrerpolicy', 'no-referrer'); f.setAttribute('title', c.title); f.setAttribute('src', c.url);
  sc.appendChild(f); wrap.appendChild(sc);
  if (c.credit){ var p = document.createElement('p'); p.className = 'kccr'; p.innerHTML = '<a href="' + esc(c.url) + '" target="_blank" rel="noopener noreferrer">' + esc(c.credit) + '</a>'; wrap.appendChild(p); }
  P.querySelector('#kcalcB').appendChild(wrap);
  return (F[k] = {wrap: wrap, sc: sc, f: f, offline: navigator.onLine === false});
}

function setPick(k, keep){
  if (!CALCS[k]) k = 'fast';
  pick = k; frame(k);
  ORDER.forEach(function(x){ if (F[x]) F[x].wrap.hidden = x !== k; });
  Array.prototype.forEach.call(P.querySelectorAll('.kcsw [role=radio]'), function(b){ var on = b.getAttribute('data-calc') === k; b.setAttribute('aria-checked', String(on)); b.tabIndex = on ? 0 : -1; });
  P.querySelector('#kcalcN').setAttribute('href', CALCS[k].url); P.querySelector('#kcalcNs').textContent = ': ' + CALCS[k].name;
  if (keep) put(PICKKEY, k);
  layout();
}

function net(){ if (P) P.querySelector('#kcalcO').hidden = navigator.onLine !== false; }

/* the size: each calculator at its natural size when the window has room; else the FAST one shorter (and as wide as a phone)
   and the TI-30Xa scaled down whole. Two passes, since the header's height depends on the panel's width. */
function size(){
  var c = CALCS[pick], fr = F[pick], sheet = phone();
  P.classList.toggle('kcfull', sheet); P.setAttribute('aria-modal', String(sheet));
  document.documentElement.classList.toggle('kcalc-lock', sheet); inert(sheet);
  var ps = getComputedStyle(P), bs = getComputedStyle(P.querySelector('#kcalcB'));
  var chromeW = P.offsetWidth - P.clientWidth + px(ps.paddingLeft) + px(ps.paddingRight) + px(bs.paddingLeft) + px(bs.paddingRight);
  var fw = c.w, fh = c.h, s = 1;
  for (var pass = 0; pass < 3; pass++){
    apply(fr, c, fw, fh, s); P.style.width = sheet ? '' : Math.max(MINW, Math.ceil(fw + chromeW)) + 'px';
    if (pass === 2) break;
    var chromeH = P.offsetHeight - P.clientHeight + px(ps.paddingTop) + px(ps.paddingBottom) + P.querySelector('#kcalcH').offsetHeight + px(bs.paddingTop) + px(bs.paddingBottom) + fr.wrap.offsetHeight - fr.sc.offsetHeight;
    var aw = (sheet ? vw() : vw() - 2 * GAP) - chromeW, ah = (sheet ? vh() : vh() - barBottom() - 2 * GAP) - chromeH;
    if (c.fluid){ s = 1; fw = Math.max(200, sheet ? aw : Math.min(c.w, aw)); fh = Math.max(200, sheet ? ah : Math.min(c.h, ah)); }
    else { s = Math.max(0.3, Math.min(1, aw / c.w, ah / c.h)); fw = c.w * s; fh = c.h * s; }
  }
}
function apply(fr, c, fw, fh, s){
  fr.sc.style.width = Math.floor(fw) + 'px'; fr.sc.style.height = Math.floor(fh) + 'px';
  fr.f.style.width = (c.fluid ? Math.floor(fw) : c.w) + 'px'; fr.f.style.height = (c.fluid ? Math.floor(fh) : c.h) + 'px';
  fr.f.style.transform = !c.fluid && s < 1 ? 'scale(' + s.toFixed(4) + ')' : '';
}

/* the place: the remembered one, else docked at the right just under the bar — always inside the window, never over the bar */
function place(){
  if (P.classList.contains('kcfull')){ P.style.left = ''; P.style.top = ''; return; }
  var w = P.offsetWidth, top0 = barBottom() + GAP;
  if (POS) moveTo(POS.s === 'l' ? POS.x : vw() - w - POS.x, POS.y, false); else moveTo(vw() - w - 2 * GAP, top0 + 4, false);
}
function moveTo(x, y, remember){
  var w = P.offsetWidth, h = P.offsetHeight, top0 = barBottom() + GAP, W = vw(), H = vh();
  x = Math.round(Math.min(Math.max(x, GAP), Math.max(GAP, W - w - GAP)));
  y = Math.round(Math.min(Math.max(y, top0), Math.max(top0, H - h - GAP)));
  P.style.left = x + 'px'; P.style.top = y + 'px';
  if (remember){ var r = W - x - w; POS = r < x ? {s: 'r', x: Math.max(0, r), y: y} : {s: 'l', x: x, y: y}; }
}
function layout(){ if (!P || P.hidden || !pick) return; size(); place(); }

/* the phone's sheet covers the page: the rest is inert while it is open, and given back exactly as it was */
function inert(on){
  if (on && !INERT.length) Array.prototype.forEach.call(document.body.children, function(el){ if (el !== P && !/^(SCRIPT|STYLE)$/.test(el.tagName) && !el.inert){ el.inert = true; INERT.push(el); } });
  else if (!on && INERT.length){ INERT.forEach(function(el){ el.inert = false; }); INERT = []; }
}

function open(){
  build();
  P.hidden = false; btn.setAttribute('aria-expanded', 'true');
  net();
  setPick(pick || get(PICKKEY) || 'fast', false);
  focusNo(P.querySelector('#kcalcT'));
}
function close(back){
  if (!P || P.hidden) return;
  inert(false); document.documentElement.classList.remove('kcalc-lock');
  P.hidden = true; btn.setAttribute('aria-expanded', 'false');
  if (D){ D = null; P.classList.remove('kcdrag'); }
  if (back) focusNo(btn);
}
btn.addEventListener('click', function(){ if (P && !P.hidden) close(true); else open(); });
btn.addEventListener('keydown', function(e){ if ((e.key === 'Escape' || e.key === 'Esc') && P && !P.hidden){ e.preventDefault(); e.stopPropagation(); close(true); } });
})();
