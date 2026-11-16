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
     keeps it on that side) and kept on the screen when the window changes size.
   - Each calculator is laid out once at its natural size (the FAST one 360 × 560, as on the test; the TI-30Xa 389 × 636) and
     never laid out again by this page: a window too short or narrow draws it smaller whole (a transform), so the frame's own
     window never changes size and Desmos never lays itself out again under a student's click (15 Nov 2026; Croix: "it wouldn't
     respond when I was clicking clear"). layout() runs at most once a frame and writes a style only when its value changes.
   - Phones (≤ 600 px wide, or ≤ 460 px tall): a full-height sheet with Close; the page behind it is inert while it is open;
     the calculator scaled to fit, never above its own size.
   - The header, one row: the title, the switch (a radiogroup — the arrows move and choose; the pick is remembered,
     practice.calc.pick) and Close. No way out to another tab (15 Nov 2026: "get rid of open in new tab"). Offline
     (navigator.onLine false) one line under the row says the calculator needs the internet; a frame first opened offline is
     loaded again when the device is back online. A frame that has not loaded shows a quiet loading state; 12 seconds after its
     address was set without a load, "The calculator didn't load." and Try again, which sets the address again.
   - Opening (and picking a calculator by a click) on a wide screen puts focus in the calculator, so typing reaches it at once;
     on the phone's sheet focus goes to the title. Tab goes Close → the switch → the calculator. Escape (focus in the panel's
     header, or on the button) closes it and gives focus back to the button.
   - The drag turns the frames' pointer off only once it has really moved (3 px), and always turns it back on: at the drag's
     end, its cancel, a lost capture, the window losing focus or being hidden, closing, and the next press in the panel.
   - Never printed (kit.css @media print), never over a print preview or the teacher's panels; translate="no", so the kit's own
     second language and a browser's translator leave its words alone (two of them are names).
   Every storage read and write is in try/catch: with storage refused, everything works for the visit.
   window.KitCalc: the checks' hook (layout, and wait, the 12 seconds). */
(function(){
'use strict';
var btn = document.getElementById('bCalc'); if (!btn) return;

var CALCS = {
  /* the FAST test's calculator (Cambium's Desmos for assessment, its restricted scientific mode): a live app, laid out once at
     the test's 360 × 560 and drawn smaller whole when the window is short, never sized again */
  fast: {name: 'FAST (Desmos)', title: 'FAST calculator (Desmos scientific)', url: 'https://desmosforassessment.cambiumtds.com/TDSCalculator.html?mode=tds_dc_scirestricted', w: 360, h: 560},
  /* Alden Bradford's TI-30Xa emulator (github.com/AldenMB/calculator_emulator, GPL-3.0; the photo of the calculator is Texas
     Instruments'): a fixed 315.6 × 600 picture, 28 px into its page — 372 px wide, and 17 more so that a classic scrollbar in
     the frame never pushes the right-hand keys out of sight; 636 px down shows the whole calculator */
  ti: {name: 'TI-30Xa', title: 'TI-30Xa calculator', url: 'https://aldenbradford.com/calculator_emulator/', w: 389, h: 636,
       credit: 'TI-30Xa emulator by Alden Bradford'}
};
var ORDER = ['fast', 'ti'];
var PICKKEY = 'practice.calc.pick', POSKEY = 'practice.calc.pos';
var GAP = 8, MINW = 372, MOVE = 3, PHONE = '(max-width: 600px), (max-height: 460px)';
var API = window.KitCalc = {wait: 12000, layout: function(){ layout(); }};

function get(k){ try { return localStorage.getItem(k); } catch(e){ return null; } }
function put(k, v){ try { localStorage.setItem(k, v); } catch(e){} }
function vw(){ return document.documentElement.clientWidth || window.innerWidth; }
function vh(){ return window.innerHeight || document.documentElement.clientHeight; }
function phone(){ return !!(window.matchMedia && window.matchMedia(PHONE).matches); }
function barBottom(){ var w = document.querySelector('.watch'); if (!w) return 0; var r = w.getBoundingClientRect(); return r.height ? Math.max(0, Math.round(r.bottom)) : 0; }
function esc(s){ return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }
function px(v){ return parseFloat(v) || 0; }
function focusNo(el){ try { el.focus({preventScroll: true}); } catch(e){ el.focus(); } }
/* a style written only when its value changes, so a layout that finds nothing new touches nothing */
function st(el, k, v){ if (el.style[k] !== v) el.style[k] = v; }
function attr(el, k, v){ if (el.getAttribute(k) !== v) el.setAttribute(k, v); }

var P = null, F = {}, pick = null, POS = null, INERT = [], D = null, RAF = 0;

/* the panel: made on the first open and placed right after the top bar (Tab goes from the bar's buttons into it, then on to the
   sheet); no iframe yet — frame() makes each one when its calculator is first picked. Close comes before the switch in the
   markup (Tab: Close, the switch, the calculator) and after it on the screen. */
function build(){
  if (P) return P;
  P = document.createElement('div'); P.className = 'kcalc'; P.id = 'kcalc'; P.hidden = true;
  P.setAttribute('role', 'dialog'); P.setAttribute('aria-labelledby', 'kcalcT'); P.setAttribute('translate', 'no');
  P.innerHTML = '<div class="kch" id="kcalcH"><div class="kcbar">' +
      '<h2 class="kct" id="kcalcT" tabindex="-1">Calculator</h2>' +
      '<button type="button" class="kcx" id="kcalcX">Close</button>' +
      '<div class="kcsw" role="radiogroup" aria-label="Which calculator">' +
        ORDER.map(function(k){ return '<button type="button" role="radio" data-calc="' + k + '" aria-checked="false" tabindex="-1">' + esc(CALCS[k].name) + '</button>'; }).join('') +
      '</div></div>' +
      '<p class="kcoff" id="kcalcO" role="status" hidden>The calculator needs the internet.</p>' +
    '</div><div class="kcb" id="kcalcB"></div>';
  var bar = document.querySelector('.watch');
  if (bar && bar.parentNode) bar.parentNode.insertBefore(P, bar.nextSibling); else document.body.appendChild(P);
  btn.setAttribute('aria-controls', 'kcalc');

  P.querySelector('#kcalcX').addEventListener('click', function(){ close(true); });
  P.addEventListener('keydown', function(e){ if (e.key === 'Escape' || e.key === 'Esc'){ e.preventDefault(); e.stopPropagation(); close(true); } });
  var sw = P.querySelector('.kcsw'), radios = function(){ return Array.prototype.slice.call(sw.querySelectorAll('[role=radio]')); };
  sw.addEventListener('click', function(e){ var b = e.target.closest && e.target.closest('[role=radio]'); if (!b) return; setPick(b.getAttribute('data-calc'), true); if (!phone()) into(); });
  sw.addEventListener('keydown', function(e){
    var o = radios(), i = o.indexOf(e.target.closest ? e.target.closest('[role=radio]') : null); if (i < 0) return;
    var j = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? (i + 1) % o.length : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? (i + o.length - 1) % o.length : e.key === 'Home' ? 0 : e.key === 'End' ? o.length - 1 : -1;
    if (j < 0) return; e.preventDefault(); setPick(o[j].getAttribute('data-calc'), true); o[j].focus(); });

  /* dragging (wide screens): by the header, not by its controls. A press alone changes nothing; only a move of 3 px starts the
     drag and turns the frames' pointer off (kcdrag), and every way a drag can end turns it on again. */
  var hd = P.querySelector('#kcalcH');
  P.addEventListener('pointerdown', function(){ unstick(false); }, true);
  hd.addEventListener('pointerdown', function(e){
    if (P.classList.contains('kcfull') || (e.button != null && e.button !== 0) || (e.target.closest && e.target.closest('button,a'))) return;
    var r = P.getBoundingClientRect(); D = {id: e.pointerId, x: e.clientX, y: e.clientY, dx: e.clientX - r.left, dy: e.clientY - r.top, moved: false};
    try { hd.setPointerCapture(e.pointerId); } catch(err){}
    e.preventDefault();
  });
  hd.addEventListener('pointermove', function(e){
    if (!D || e.pointerId !== D.id) return;
    if (!D.moved){ if (Math.abs(e.clientX - D.x) < MOVE && Math.abs(e.clientY - D.y) < MOVE) return; D.moved = true; P.classList.add('kcdrag'); }
    moveTo(e.clientX - D.dx, e.clientY - D.dy, true);
  });
  var end = function(e){ if (D && e.pointerId === D.id) unstick(true); };
  hd.addEventListener('pointerup', end); hd.addEventListener('pointercancel', end); hd.addEventListener('lostpointercapture', end);
  window.addEventListener('blur', function(){ unstick(true); });
  document.addEventListener('visibilitychange', function(){ unstick(true); });

  window.addEventListener('resize', layout);
  if (window.ResizeObserver && bar) new ResizeObserver(layout).observe(bar);
  window.addEventListener('offline', net);
  window.addEventListener('online', function(){ net(); ORDER.forEach(function(k){ var f = F[k]; if (f && f.offline){ f.offline = false; load(k, false); } }); });
  try { POS = JSON.parse(get(POSKEY) || 'null'); } catch(e){ POS = null; }
  if (!POS || (POS.s !== 'l' && POS.s !== 'r') || !isFinite(POS.x) || !isFinite(POS.y)) POS = null;
  return P;
}
/* the drag over, however it ended: the frames take the pointer again; a drag that moved keeps its place */
function unstick(keep){
  var moved = D && D.moved; D = null;
  if (P) P.classList.remove('kcdrag');
  if (keep && moved && POS) put(POSKEY, JSON.stringify(POS));
}

/* a calculator's frame, made the first time it is picked: no referrer, its own title, its exact address; until it loads a quiet
   loading state, and if it has not loaded 12 seconds after its address was set, a line and Try again */
function frame(k){
  if (F[k]) return F[k];
  var c = CALCS[k], wrap = document.createElement('div'); wrap.className = 'kcfr kcload'; wrap.setAttribute('data-calc', k);
  var sc = document.createElement('div'); sc.className = 'kcsc';
  var no = document.createElement('div'); no.className = 'kcno'; no.hidden = true;
  no.innerHTML = '<p role="alert">The calculator didn’t load.</p><button type="button" class="kcx">Try again</button>';
  sc.appendChild(no); wrap.appendChild(sc);
  if (c.credit){ var p = document.createElement('p'); p.className = 'kccr'; p.textContent = c.credit; wrap.appendChild(p); }
  P.querySelector('#kcalcB').appendChild(wrap);
  F[k] = {wrap: wrap, sc: sc, f: null, no: no, timer: 0, offline: navigator.onLine === false};
  no.querySelector('button').addEventListener('click', function(){ load(k, true); if (!phone()) into(); });
  load(k, true);
  return F[k];
}
/* the frame itself, at its own size once and never sized again. A first load and Try again make a new one (a frame stuck on
   its first request would not ask again for the same address); back online, the same frame asks again. */
function load(k, fresh){
  var x = F[k], c = CALCS[k], f = x.f; clearTimeout(x.timer);
  if (fresh){
    f = document.createElement('iframe');
    f.setAttribute('referrerpolicy', 'no-referrer'); f.setAttribute('title', c.title);
    f.style.width = c.w + 'px'; f.style.height = c.h + 'px';
    var old = x.f, tf = old && old.style.transform; if (tf) f.style.transform = tf;
    f.addEventListener('load', function(){ if (x.f !== f) return; clearTimeout(x.timer); x.wrap.classList.remove('kcload'); x.wrap.removeAttribute('aria-busy'); x.no.hidden = true;
      if (document.activeElement === f) try { f.contentWindow.focus(); } catch(e){} });
    if (old) x.sc.replaceChild(f, old); else x.sc.insertBefore(f, x.no);
    x.f = f;
  }
  x.wrap.classList.add('kcload'); x.wrap.setAttribute('aria-busy', 'true'); x.no.hidden = true;
  f.setAttribute('src', c.url);
  x.timer = setTimeout(function(){ if (x.f === f && x.wrap.classList.contains('kcload') && navigator.onLine !== false) x.no.hidden = false; }, API.wait);
}

/* focus into the calculator shown, so a key reaches it without a click first */
function into(){
  var x = F[pick]; if (!x || P.hidden) return;
  focusNo(x.f); try { x.f.contentWindow.focus(); } catch(e){}
}

function setPick(k, keep){
  if (!CALCS[k]) k = 'fast';
  pick = k; frame(k);
  ORDER.forEach(function(x){ if (F[x]) F[x].wrap.hidden = x !== k; });
  Array.prototype.forEach.call(P.querySelectorAll('.kcsw [role=radio]'), function(b){ var on = b.getAttribute('data-calc') === k; attr(b, 'aria-checked', String(on)); b.tabIndex = on ? 0 : -1; });
  if (keep) put(PICKKEY, k);
  now();
}

function net(){ if (P){ P.querySelector('#kcalcO').hidden = navigator.onLine !== false; layout(); } }

/* the size: the calculator always at its own size inside (its frame is never resized), drawn smaller whole when the window has
   no room for it. Three passes, since the header's height depends on the panel's width. */
function size(){
  var c = CALCS[pick], fr = F[pick], sheet = phone();
  if (P.classList.contains('kcfull') !== sheet) P.classList.toggle('kcfull', sheet);
  attr(P, 'aria-modal', String(sheet));
  if (document.documentElement.classList.contains('kcalc-lock') !== sheet) document.documentElement.classList.toggle('kcalc-lock', sheet);
  inert(sheet);
  var ps = getComputedStyle(P), bs = getComputedStyle(P.querySelector('#kcalcB'));
  var chromeW = P.offsetWidth - P.clientWidth + px(ps.paddingLeft) + px(ps.paddingRight) + px(bs.paddingLeft) + px(bs.paddingRight);
  /* the header's one row, at its natural width; a panel narrower than that puts the switch under the title and Close */
  var row = P.querySelector('.kcbar'), rs = getComputedStyle(row), gap = px(rs.columnGap), hs = getComputedStyle(P.querySelector('#kcalcH'));
  var need = Math.ceil(P.querySelector('#kcalcT').offsetWidth + P.querySelector('.kcsw').offsetWidth + P.querySelector('#kcalcX').offsetWidth + 2 * gap +
    px(rs.paddingLeft) + px(hs.paddingLeft) + px(hs.paddingRight) + P.offsetWidth - P.clientWidth + px(ps.paddingLeft) + px(ps.paddingRight)) + 1;
  var room = sheet ? vw() : vw() - 2 * GAP;
  if (P.classList.contains('kcwrap') !== need > room) P.classList.toggle('kcwrap', need > room);
  var s = 1;
  for (var pass = 0; pass < 3; pass++){
    apply(fr, c, s); st(P, 'width', sheet ? '' : Math.min(room, Math.max(MINW, need, Math.ceil(Math.floor(c.w * s) + chromeW))) + 'px');
    if (pass === 2) break;
    var chromeH = P.offsetHeight - P.clientHeight + px(ps.paddingTop) + px(ps.paddingBottom) + P.querySelector('#kcalcH').offsetHeight + px(bs.paddingTop) + px(bs.paddingBottom) + fr.wrap.offsetHeight - fr.sc.offsetHeight;
    var aw = (sheet ? vw() : vw() - 2 * GAP) - chromeW, ah = (sheet ? vh() : vh() - barBottom() - 2 * GAP) - chromeH;
    s = Math.max(0.3, Math.min(1, aw / c.w, ah / c.h));
  }
}
function apply(fr, c, s){
  st(fr.sc, 'width', Math.floor(c.w * s) + 'px'); st(fr.sc, 'height', Math.floor(c.h * s) + 'px');
  st(fr.f, 'transform', s < 1 ? 'scale(' + s.toFixed(4) + ')' : '');
}

/* the place: the remembered one, else docked at the right just under the bar — always inside the window, never over the bar */
function place(){
  if (P.classList.contains('kcfull')){ st(P, 'left', ''); st(P, 'top', ''); return; }
  var w = P.offsetWidth, top0 = barBottom() + GAP;
  if (POS) moveTo(POS.s === 'l' ? POS.x : vw() - w - POS.x, POS.y, false); else moveTo(vw() - w - 2 * GAP, top0 + 4, false);
}
function moveTo(x, y, remember){
  var w = P.offsetWidth, h = P.offsetHeight, top0 = barBottom() + GAP, W = vw(), H = vh();
  x = Math.round(Math.min(Math.max(x, GAP), Math.max(GAP, W - w - GAP)));
  y = Math.round(Math.min(Math.max(y, top0), Math.max(top0, H - h - GAP)));
  st(P, 'left', x + 'px'); st(P, 'top', y + 'px');
  if (remember){ var r = W - x - w; POS = r < x ? {s: 'r', x: Math.max(0, r), y: y} : {s: 'l', x: x, y: y}; }
}
/* at most once a frame, however many resizes and bar changes ask */
function layout(){ if (!RAF && P && !P.hidden) RAF = requestAnimationFrame(now); }
function now(){ if (RAF){ cancelAnimationFrame(RAF); RAF = 0; } if (!P || P.hidden || !pick) return; size(); place(); }

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
  if (phone()) focusNo(P.querySelector('#kcalcT')); else into();
}
function close(back){
  if (!P || P.hidden) return;
  unstick(true);
  inert(false); document.documentElement.classList.remove('kcalc-lock');
  P.hidden = true; btn.setAttribute('aria-expanded', 'false');
  if (back) focusNo(btn);
}
btn.addEventListener('click', function(){ if (P && !P.hidden) close(true); else open(); });
btn.addEventListener('keydown', function(e){ if ((e.key === 'Escape' || e.key === 'Esc') && P && !P.hidden){ e.preventDefault(); e.stopPropagation(); close(true); } });
})();
