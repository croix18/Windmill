/* Practice-test kit: the test's proctor (proctor.js, 16 Nov 2026; practice/exam/DESIGN.md). Croix, 15 Nov: a test mode — full
   screen, the times a student navigated away shown on screen, the questions hard to copy; of a student who leaves: "Count it
   and show it. Give me the option in the cockpit to turn on lock or end after x amount of times."
   - Full screen at Start: enter() is called inside the Start press (exam.js), the user gesture a browser asks for; Escape is
     kept for the page where the browser allows it (navigator.keyboard.lock), so closing the calculator with Escape does not
     leave full screen — a press and hold still does.
   - Away is: the page hidden ("tab": another tab or app), or the window without focus ("window": document.hasFocus(), polled,
     so a click into the calculator's frame, which is part of this page, is not away), or out of full screen where full screen
     is available ("fullscreen"), or the page loaded again in the middle of the test ("reload"). One leaving is one entry,
     however many signals fire, from the first signal to the press that brings the student back; its kind is the strongest seen
     (reload, then tab, then window, then fullscreen). A loss of focus shorter than GRACE with the page never hidden is logged
     nowhere and counted nowhere, so a stray system pop-up cannot lock a child out.
   - While away the sheet is covered (opaque, everything under it inert) and the cover's one button, Back to the test, brings the
     student back, and back into full screen (its press is the gesture). The bar shows "Left the test: 2" in the kit's alarm
     coral once the count is not zero.
   - The rule comes from the site at start (exam.js hands it on): {leave: 'count' | 'lock' | 'end', after: N}. Count: nothing
     more. Lock: from the Nth leaving on, each leaving locks — the cover says "Locked. Ask your teacher." with one box and
     Unlock; the code goes to the site (exam.js's unlock: POST /api/test/<id>/unlock); a right one lets the student go on, a
     wrong one shakes and clears the box and says nothing, and after the site's five tries a minute (429) the box and Unlock
     wait. End: the Nth leaving finishes the test as it stands (exam.js's finish, ended: 'left').
   - The sheet cannot be selected, copied, cut, dragged, right-clicked, printed or saved (Ctrl/⌘+P, Ctrl/⌘+S, Ctrl/⌘+A outside a
     box, beforeprint; exam.css prints nothing); each attempt is logged (trace.js's blocked). Answer boxes and scratch notes still
     take typing, selection inside them and paste.
   - After the review of the test page (16 Nov 2026, CHANGES-16NOV §11): Ctrl/⌘+F, Ctrl/⌘+G and F3 are stopped and logged as
     "find" (the find bar would take the focus, a leaving the child did not mean); a long press on a touch screen is not a
     "menu"; the screen is kept awake (navigator.wakeLock, asked for in the Start press and each time the page is shown,
     released at Finish); lengths are a steady count (performance.now()); End after N holds across a reload; again() watches
     a child sent back to the test by a Finish that could not be sent (Start first, which counts nothing).
   Its state — the count, the leaving still open, the lock — is kept with the log (trace.js's slot), so a reload cannot shake it
   off; a reload is itself a leaving. Only on the test page, from start() to stop(); nothing here makes a request.
   Its words are DESIGN.md's: Back to the test, Locked. Ask your teacher., Unlock, Start, Left the test: N. */
(function(){
'use strict';
var K = window.Kit = window.Kit || {};
var GRACE = 1000;                                          /* a loss of focus shorter than this, the page never hidden, is nothing */
var POLL = 200, WAIT = window.KIT_EXAM_UNLOCK_WAIT || 60000;   /* the checks' switch (check/exam_page.js; nothing on a page sets it): the site's 429 wait */
var RANK = {fullscreen: 1, window: 2, tab: 3, reload: 4};
var WORDS = {back: 'Back to the test', locked: 'Locked. Ask your teacher.', unlock: 'Unlock', start: 'Start', left: 'Left the test: '};
var $ = function(id){ return document.getElementById(id); };
var de = document.documentElement;
var FSAPI = !!(document.fullscreenEnabled || document.webkitFullscreenEnabled), REFUSED = false, PENDING = false;
var ON = false, O = null, PR = null, OPEN = null, MODE = null, INERT = [], TICK = 0, WAITING = 0, WAKE = null, TOUCH = 0;
/* the device's clock as a steady count (§11, L5): a change to the clock in the middle of the test moves no length. A device
   that slept (the lid shut) may have a steady count that stood still meanwhile, so a gap that opens while the page is hidden is
   taken from the clock (16 Nov 2026). The same lines in trace.js, proctor.js and exam.js; the first to load makes it. */
var CLOCK = window.KitExamClock || (window.KitExamClock = (function(){
  var mono = Date.now() - performance.now(), d0 = Date.now(), p0 = performance.now(), hid = document.visibilityState === 'hidden';
  function wake(){ var d = Date.now(), p = performance.now(), gap = (d - d0) - (p - p0); d0 = d; p0 = p;
    if (hid && gap > 2000 && gap < 864e5) mono += gap; hid = document.visibilityState === 'hidden'; }
  document.addEventListener('visibilitychange', function(){ if (document.visibilityState === 'hidden') hid = true; wake(); });
  document.addEventListener('freeze', function(){ hid = true; }); document.addEventListener('resume', wake);
  window.addEventListener('pageshow', wake); window.addEventListener('focus', wake); setInterval(wake, 1000);
  return {now: function(){ return mono + performance.now(); }};
})());
function now(){ return CLOCK.now(); }
/* the screen stays awake during a test (§11, H5): asked for in the Start press, again each time the page is shown; released at
   Finish; where there is no wake lock, nothing */
function wake(){
  if (!navigator.wakeLock || !navigator.wakeLock.request || WAKE || document.hidden) return;
  try { navigator.wakeLock.request('screen').then(function(w){ if (!ON && MODE !== 'pending'){ try { w.release(); } catch(e){} return; } WAKE = w; w.addEventListener('release', function(){ if (WAKE === w) WAKE = null; }); }, function(){}); } catch(e){}
}
function sleepOk(){ var w = WAKE; WAKE = null; if (w) try { w.release(); } catch(e){} }
function fsEl(){ return document.fullscreenElement || document.webkitFullscreenElement || null; }
function fs(){ return FSAPI && !REFUSED; }
function trace(){ return K.Trace || null; }
function qNow(){ var T = trace(); return T && T.q ? T.q() : null; }
function save(){ var T = trace(); if (T && T.slot) T.slot({n: PR.n, sec: PR.sec, locked: PR.locked, open: OPEN && OPEN.counted ? OPEN : null}); }
function inBox(el){ return !!(el && el.closest && el.closest('input[type=text], input:not([type]), textarea')); }

/* ---- full screen: asked for inside a press */
function enter(){
  if (!ON) MODE = MODE || 'pending'; wake();
  if (!FSAPI || fsEl()) return;
  var f = de.requestFullscreen || de.webkitRequestFullscreen; if (!f) return;
  PENDING = true;
  var done = function(){ PENDING = false; lockEsc(); check(); }, no = function(){ PENDING = false; REFUSED = true; check(); };
  try { var p = f.call(de, {navigationUI: 'hide'}); if (p && p.then) p.then(done, no); else setTimeout(function(){ PENDING = false; check(); }, 1000); }
  catch(e){ no(); }
}
function lockEsc(){ try { if (navigator.keyboard && navigator.keyboard.lock) navigator.keyboard.lock(['Escape']).catch(function(){}); } catch(e){} }
function leaveFs(){
  try { if (navigator.keyboard && navigator.keyboard.unlock) navigator.keyboard.unlock(); } catch(e){}
  try { if (fsEl()) (document.exitFullscreen || document.webkitExitFullscreen).call(document).catch(function(){}); } catch(e){}
}

/* ---- the cover */
function build(){
  if ($('exCover')) return;
  var c = document.createElement('div'); c.className = 'excover'; c.id = 'exCover'; c.hidden = true;
  c.setAttribute('role', 'dialog'); c.setAttribute('aria-modal', 'true'); c.setAttribute('aria-label', 'Test');
  c.innerHTML = '<div class="excin">' +
    '<button type="button" class="go" id="exBackIn">' + WORDS.back + '</button>' +
    '<button type="button" class="go" id="exGoIn" hidden>' + WORDS.start + '</button>' +
    '<form class="exlock" id="exLock" hidden autocomplete="off"><p class="exlockt" id="exLockT">' + WORDS.locked + '</p>' +
      '<div class="exlockr"><input type="text" id="exUn" aria-labelledby="exLockT" autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="40">' +
      '<button type="submit" class="go" id="exUnGo">' + WORDS.unlock + '</button></div></form></div>';
  document.body.appendChild(c);
  $('exBackIn').addEventListener('click', function(){ enter(); back(); });
  $('exGoIn').addEventListener('click', function(){ enter(); MODE = null; paint(); });
  $('exLock').addEventListener('submit', function(e){ e.preventDefault(); tryCode(); });
  var bar = document.querySelector('.watch .in'), score = $('score');
  if (bar && !$('exLeft')){ var s = document.createElement('span'); s.className = 'exleft'; s.id = 'exLeft'; s.hidden = true; s.setAttribute('role', 'status'); s.setAttribute('translate', 'no');
    if (score && score.parentNode === bar) bar.insertBefore(s, score.nextSibling); else bar.appendChild(s); }
}
function cover(on){
  var c = $('exCover'); if (!c) return;
  if (on && c.hidden){
    c.hidden = false; document.body.classList.add('exam-away');
    Array.prototype.forEach.call(document.body.children, function(el){ if (el !== c && el.id !== 'exNet' && el.tagName !== 'SCRIPT' && !el.inert){ el.inert = true; el.setAttribute('inert', ''); INERT.push(el); } });
  } else if (!on && !c.hidden){
    c.hidden = true; document.body.classList.remove('exam-away');
    INERT.forEach(function(el){ el.inert = false; el.removeAttribute('inert'); }); INERT = [];
  }
}
function paint(){
  var away = !!(OPEN && OPEN.counted), locked = away && PR.locked, show = ON && (away || MODE === 'start');
  var was = $('exCover') && !$('exCover').hidden;
  cover(show);
  if (show){
    $('exBackIn').hidden = !away || locked; $('exGoIn').hidden = away; $('exLock').hidden = !locked;
    var f = locked ? $('exUn') : away ? $('exBackIn') : $('exGoIn');
    if (!was || !$('exCover').contains(document.activeElement)) try { f.focus({preventScroll: true}); } catch(e){ f.focus(); }
  }
  var L = $('exLeft'); if (L){ L.hidden = !ON || !PR || !PR.n; if (PR && PR.n) L.textContent = WORDS.left + PR.n; }   /* after Finish the end panel says it */
}

/* ---- away: the signals, one leaving at a time */
function signal(){
  if (document.hidden) return 'tab';
  if (!document.hasFocus()) return 'window';
  if (fs() && !PENDING && !fsEl()) return 'fullscreen';
  return null;
}
function check(){
  if (!ON || MODE === 'start') return;
  var s = signal(), t = now();
  if (!OPEN){ if (!s) return; OPEN = {t: t, kind: s, q: qNow(), counted: false, hid: s === 'tab'}; }
  else if (s && RANK[s] > RANK[OPEN.kind]){ OPEN.kind = s; if (OPEN.counted) save(); }
  if (s === 'tab') OPEN.hid = true;
  if (!OPEN.counted){
    if (!s){ OPEN = null; return; }                        /* back within the grace, never hidden: nothing happened */
    if (OPEN.hid || OPEN.kind !== 'window' || t - OPEN.t >= GRACE) count();
  }
}
function endIfDue(){ var r = O.rule || {}; if (r.leave === 'end' && PR.n >= Math.max(1, +r.after || 0) && O.onEnd){ var f = O.onEnd; setTimeout(function(){ if (ON) f('left'); }, 0); } }
function count(){
  OPEN.counted = true; PR.n++;
  var T = trace(); if (T && T.hold) T.hold(true);
  var r = O.rule || {}, after = Math.max(1, +r.after || 0);
  if (r.leave === 'lock' && PR.n >= after) PR.locked = true;
  save(); paint();
  if (r.leave === 'end' && PR.n >= after && O.onEnd){ var f = O.onEnd; setTimeout(function(){ if (ON) f('left'); }, 0); }
}
function close(t){
  if (!OPEN) return;
  if (OPEN.counted){ var T = trace(); if (T && T.away) T.away(OPEN.t, t, OPEN.kind, OPEN.q); PR.sec += Math.max(0, t - OPEN.t); if (T && T.hold) T.hold(false); }
  OPEN = null; save();
}
function back(){
  if (!OPEN || !OPEN.counted || PR.locked) return;
  close(now()); paint();
  var q = $('pgQ'); if (q) try { q.focus({preventScroll: true}); } catch(e){}
}
function tryCode(){
  var box = $('exUn'), go = $('exUnGo'), code = box.value.trim(); if (!code || WAITING || !O.unlock) return;
  enter();                                                 /* the press is the gesture: back into full screen now, whatever the site says */
  go.disabled = true;
  O.unlock(code, function(ok, status){
    go.disabled = false;
    if (ok){ PR.locked = false; box.value = ''; close(now()); paint(); var q = $('pgQ'); if (q) try { q.focus({preventScroll: true}); } catch(e){} return; }
    box.value = '';
    if (status === 429){ WAITING = setTimeout(function(){ WAITING = 0; box.disabled = false; go.disabled = false; try { box.focus(); } catch(e){} }, WAIT); box.disabled = true; go.disabled = true; return; }
    box.classList.remove('exshake'); void box.offsetWidth; box.classList.add('exshake'); try { box.focus(); } catch(e){}
  });
}

/* ---- the sheet cannot be selected, copied, cut, dragged, right-clicked, printed or saved */
function block(e, what){ e.preventDefault(); var T = trace(); if (T && T.blocked) T.blocked(what); }
function guards(){
  document.addEventListener('copy', function(e){ if (ON && !inBox(e.target)) block(e, 'copy'); }, true);
  document.addEventListener('cut', function(e){ if (ON && !inBox(e.target)) block(e, 'cut'); }, true);
  document.addEventListener('pointerdown', function(e){ if (e.pointerType === 'touch') TOUCH = now(); }, true);
  document.addEventListener('contextmenu', function(e){ if (!ON || inBox(e.target)) return; if (now() - TOUCH < 2000){ e.preventDefault(); return; } block(e, 'menu'); }, true);   /* a long press on a touch screen is not a right-click (L4) */
  document.addEventListener('dragstart', function(e){ if (ON && !inBox(e.target)) block(e, 'drag'); }, true);
  document.addEventListener('selectstart', function(e){ if (ON && !inBox(e.target)) e.preventDefault(); }, true);
  document.addEventListener('keydown', function(e){
    if (!ON || !(e.ctrlKey || e.metaKey) || e.altKey) return;
    var k = String(e.key || '').toLowerCase();
    if (k === 'p') block(e, 'print'); else if (k === 's') block(e, 'save'); else if (k === 'a' && !inBox(e.target)) block(e, 'selectall');
    else if (k === 'f' || k === 'g') block(e, 'find');   /* the find bar would take the focus: a leaving the child did not mean (M5) */
  }, true);
  document.addEventListener('keydown', function(e){ if (ON && e.key === 'F3') block(e, 'find'); }, true);
  window.addEventListener('beforeprint', function(){ if (ON){ var T = trace(); if (T && T.blocked) T.blocked('print'); } });
  document.addEventListener('visibilitychange', function(){ check(); if (ON && !document.hidden) wake(); });
  window.addEventListener('blur', function(){ setTimeout(check, 0); });
  window.addEventListener('focus', check);
  document.addEventListener('fullscreenchange', check); document.addEventListener('webkitfullscreenchange', function(){ PENDING = false; check(); });
}
var GUARDED = false;

K.Proctor = {
  GRACE: GRACE,
  enter: enter,                                            /* exam.js, inside the Start press */
  leave: function(){ leaveFs(); if (!ON){ MODE = null; sleepOk(); } },                                          /* exam.js: Start was refused (the test is not open) */
  /* exam.js, once the test is on the page: {rule, onEnd(why), unlock(code, cb(ok, status))} */
  start: function(o){
    O = o || {}; build();
    var T = trace(), was = T && T.slot ? T.slot() : null;
    PR = {n: was && was.n || 0, sec: was && was.sec || 0, locked: !!(was && was.locked)};
    ON = true; MODE = null; OPEN = null;
    document.body.classList.add('exam-on');
    if (!GUARDED){ GUARDED = true; guards(); }
    if (T && T.resumed && T.resumed()){                    /* the page loaded again in the middle of the test: a leaving */
      if (was && was.open){ OPEN = was.open; OPEN.kind = 'reload'; if (T.hold) T.hold(true); save(); paint(); endIfDue(); }   /* counted as the page went: End after N still ends (M2) */
      else { OPEN = {t: (T.seen && T.seen()) || now(), kind: 'reload', q: qNow(), counted: false, hid: true}; count(); }
    } else if (fs() && !PENDING && !fsEl()) MODE = 'start';   /* a test begun without a press (New test): Start, then full screen */
    paint(); wake();
    clearInterval(TICK); TICK = setInterval(check, POLL);
  },
  /* exam.js: a Finish that could not be sent — back to the test, watched again (M4). Full screen went with Finish, so Start
     (no leaving counted) brings it back. */
  again: function(o){
    if (ON) return; O = o || O || {}; build(); ON = true; OPEN = null;
    document.body.classList.add('exam-on');
    MODE = fs() ? 'start' : null;   /* full screen was left at Finish (or is on its way out) */
    paint(); wake();
    clearInterval(TICK); TICK = setInterval(check, POLL);
  },
  stop: function(){
    if (!ON) return;
    close(now()); ON = false; MODE = null; clearInterval(TICK);
    if (WAITING){ clearTimeout(WAITING); WAITING = 0; }
    paint(); document.body.classList.remove('exam-on'); leaveFs(); sleepOk();
  },
  fs: fs,
  count: function(){ return PR ? PR.n : 0; }
};
})();
