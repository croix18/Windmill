/* Practice-test kit: the test's log (trace.js, 16 Nov 2026; practice/exam/DESIGN.md, "The log" and "The log's shape").
   Everything the test page can see of how the test was taken, in exactly the pinned shape, kept on the device as it grows and
   sent with the answers at Finish (exam.js). It is the device's account, not the site's: evidence, not proof.
     {v: 1, t0, t1, q, visits, parts, calc, scratch, away, blocked, idle, device, fails, drop}
   A field the page cannot fill is null, never renamed or left out. Every `at` is whole seconds from t0 on the device's clock and
   every `sec` the difference of two such `at`s, so a run of visits adds up to the test's length exactly.
   - Kept under exam.log.<test id> (localStorage), written half a second after a change, every 5 s, and when the page goes; a
     reload reads it back and loses nothing. Removed after the seal (exam.js calls clear()). Another test's log is removed
     when a test starts (the device holds one test at a time).
   - It watches from outside: the question on the screen (the page's own at()), the calculator's panel (#kcalc and its
     switch) and scratch paper's (#kscr, Notes or Grid), polled four times a second; each value a part holds comes from the
     page's own save (exam.js hands it S); how it was put there from the input events (a keyboard is "typed"; the kit's
     on-screen keypad dispatches its own input, which a keyboard's is not, so "keypad"; a choice, a number line, a circle
     graph "tap"); pastes into an answer box; what is on scratch paper at Finish from scratch.js's own saved entry.
   - proctor.js tells it each time away (away()), each blocked attempt (blocked()), and when an away begins and ends (hold()),
     so a stretch away is not also an idle stretch. It keeps proctor.js's small state with the log (slot()), so a reload
     cannot shake off a count or a lock.
   - Never over 60 KB (16 Nov 2026, CHANGES-16NOV §11, M6): a value kept to 80 characters; then the middle values of the parts
     with the most, then the oldest visits — never away, blocked or device. Lengths are a steady count (performance.now()).
   Nothing here makes a request, and nothing here shows anything. */
(function(){
'use strict';
var K = window.Kit = window.Kit || {};
var CAP = {visits: 300, calc: 100, scratch: 100, away: 100, blocked: 100, idle: 100};
var HEAD = 4, TAIL = 8, IDLE = 60000, SCRATCH_BYTES = 4096, POLL = 250, BEAT = 5000;
var LOG_BYTES = 60 * 1024, VAL_CHARS = 80;                /* the log sent is never over 60 KB (the site keeps 64 KB); a value kept to 80 characters (§11, M6) */
var PRE = 'exam.log.';
var R = null, API = null, NAME = '', TIMER = 0, LAST_WRITE = 0, HOW = {}, KP = 0, RESUMED = false, SEEN = 0, HELD = false, ON = false;
var MONO = Date.now() - performance.now();
function now(){ return MONO + performance.now(); }        /* a steady count, set by the device's clock once a page load: a change to the clock in the middle of the test moves no length (§11, L5) */
function get(k){ try { return localStorage.getItem(k); } catch(e){ return null; } }
function put(k, v){ try { localStorage.setItem(k, v); } catch(e){} }
function blank(v){ return v == null || (Array.isArray(v) ? v.every(function(x){ return !String(x == null ? '' : x).trim(); }) : typeof v === 'object' ? false : !String(v).trim()); }
function qOfPart(id){ var m = /^\d+/.exec(String(id)); return m ? m[0] : String(id); }

/* ---- the record on the device: the log's lists in milliseconds, and what is open */
function fresh(test){
  return {v: 1, test: test, t0: now(), seen: now(),
    visits: [], calc: [], scratch: [], away: [], blocked: [], idle: [], drop: {visits: 0, calc: 0, scratch: 0, away: 0, blocked: 0, idle: 0},
    q: {}, parts: {}, fails: 0,
    open: {visit: null, calc: null, scr: null}, act: {t: now(), q: null}, pr: null};
}
function write(){ if (!R) return; R.seen = now(); LAST_WRITE = R.seen; put(NAME, JSON.stringify(R)); }
function soon(){ if (TIMER) return; TIMER = setTimeout(function(){ TIMER = 0; write(); }, 500); }
function add(list, e){ if (R[list].length < CAP[list]) R[list].push(e); else R.drop[list]++; soon(); }

/* ---- the question on the screen: a visit, and its seconds on the screen */
function qNow(){
  if (!API) return null;
  var i = -1; try { i = API.at(); } catch(e){}
  if (i < 0) return null;
  var c = document.querySelectorAll('#paper .q[data-q]:not(.xq)')[i];
  return c ? c.getAttribute('data-q') : String(i + 1);
}
function qrec(q){ return R.q[q] || (R.q[q] = {ms: 0, visits: 0, first: null, flag: false}); }
function closeVisit(t){
  var v = R.open.visit; if (!v) return;
  qrec(v.q).ms += Math.max(0, t - v.t); add('visits', [v.q, v.t, t]); R.open.visit = null;
}
function openVisit(q, t){ if (q == null) return; R.open.visit = {q: q, t: t}; qrec(q).visits++; soon(); }
/* the calculator's panel: which of the kit's calculators (calc.js's own ids, "fast" or "ti") and for which question */
function calcNow(){
  var P = document.getElementById('kcalc'); if (!P || P.hidden) return null;
  var b = P.querySelector('.kcsw [aria-checked="true"]'); return b ? b.getAttribute('data-calc') : null;
}
/* scratch paper's panel: Notes or Grid */
function scrNow(){
  var P = document.getElementById('kscr'); if (!P || P.hidden) return null;
  var n = document.getElementById('kscrNP'); return n && !n.hidden ? 'notes' : 'grid';
}
function seg(kind, what, q, t){                            /* a calculator or scratch-paper stretch: [which, q, from, to] */
  var o = R.open[kind], key = what == null || q == null ? null : what + '|' + q;
  if (o && o.k === key) return;
  if (o){ add(kind === 'calc' ? 'calc' : 'scratch', [o.w, o.q, o.t, t]); R.open[kind] = null; }
  if (key) R.open[kind] = {k: key, w: what, q: q, t: t};
  soon();
}
function poll(){
  if (!R || !ON) return;
  var t = now(), q = qNow(), v = R.open.visit;
  if (!v || v.q !== q){ closeVisit(t); openVisit(q, t); }
  seg('calc', calcNow(), q, t); seg('scr', scrNow(), q, t);
  if (t - LAST_WRITE >= BEAT) write();
}

/* ---- nothing typed or tapped for more than a minute */
function act(){
  if (!R || !ON) return;
  var t = now(); if (!HELD) closeIdle(t);
  R.act = {t: t, q: qNow()};
}
function closeIdle(t){ var a = R.act; if (a && t - a.t > IDLE) add('idle', [a.t, t, a.q]); }
function hold(on){                                         /* proctor.js: an away begins (true) or ends (false) */
  if (!R) return; var t = now();
  if (on && !HELD) closeIdle(t);
  HELD = !!on; R.act = {t: t, q: qNow()}; soon();
}

/* ---- each value a part holds, and how it got there */
function partOf(el){
  if (!el || !el.id || el.id.charAt(0) !== 'a' || !el.closest || !el.closest('#paper')) return null;
  var bp = el.getAttribute('data-part'); return bp != null ? bp : el.id.slice(1);
}
function prec(id){ return R.parts[id] || (R.parts[id] = {head: [], tail: [], n: 0, pastes: 0, last: null}); }
function saw(S){
  if (!R || !ON || !API || !S) return;
  var t = now(), its = []; try { its = API.items() || []; } catch(e){}
  its.forEach(function(it){
    var v = S.ans[it.id], j = JSON.stringify(v === undefined ? null : v), p = prec(it.id);
    if (p.last === j) return;
    var was = p.last; p.last = j;
    if (was === null && blank(v)) return;                  /* nothing yet, and still nothing */
    var how = it.type === 'text' ? (HOW[it.id] || 'typed') : 'tap', e = [t, v === undefined ? null : JSON.parse(j), how];
    p.n++; if (p.head.length < HEAD) p.head.push(e); else { p.tail.push(e); if (p.tail.length > TAIL) p.tail.shift(); }
    var q = qOfPart(it.id), Q = qrec(q);
    if (Q.first == null && !blank(v)){ var o = R.open.visit; Q.first = Q.ms + (o && o.q === q ? Math.max(0, t - o.t) : 0); }
  });
  var F = S.pg && S.pg.flag ? S.pg.flag : {}; Object.keys(F).forEach(function(q){ if (F[q]) qrec(q).flag = true; });
  soon();
}
function listen(){
  document.addEventListener('pointerdown', function(e){ if (e.target && e.target.closest && e.target.closest('.keys [data-k]')) KP = now(); act(); }, true);
  document.addEventListener('click', function(e){ if (e.target && e.target.closest && e.target.closest('.keys [data-k]')) KP = now(); }, true);
  document.addEventListener('keydown', act, true);
  document.addEventListener('input', function(e){
    var id = partOf(e.target); if (id != null) HOW[id] = !e.isTrusted && now() - KP < 1500 ? 'keypad' : 'typed';
    if (e.isTrusted) act();
  }, true);
  document.addEventListener('paste', function(e){ var id = partOf(e.target); if (id != null && R){ prec(id).pastes++; soon(); } }, true);
  window.addEventListener('pagehide', function(){ if (R && ON) write(); });
  document.addEventListener('visibilitychange', function(){ if (R && ON && document.hidden) write(); });
}

/* ---- the device */
function brandOf(list){
  var bs = (list || []).filter(function(b){ return !/not.?a.?brand/i.test(b.brand); });
  var pick = bs.filter(function(b){ return b.brand !== 'Chromium'; })[0] || bs[0];
  return pick ? {br: pick.brand, brv: pick.version} : null;
}
function fromUA(ua){
  var m, os = null, osv = null, br = null, brv = null;
  if ((m = /CrOS \S+ ([\d.]+)/.exec(ua))){ os = 'ChromeOS'; osv = m[1]; }
  else if ((m = /Windows NT ([\d.]+)/.exec(ua))){ os = 'Windows'; osv = m[1]; }
  else if ((m = /(iPhone|iPad|iPod).*? OS ([\d_]+)/.exec(ua))){ os = 'iOS'; osv = m[2].replace(/_/g, '.'); }
  else if ((m = /Android ([\d.]+)/.exec(ua))){ os = 'Android'; osv = m[1]; }
  else if ((m = /Mac OS X ([\d_.]+)/.exec(ua))){ os = 'macOS'; osv = m[1].replace(/_/g, '.'); }
  else if (/Linux/.test(ua)) os = 'Linux';
  if ((m = /Edg(?:e|A|iOS)?\/([\d.]+)/.exec(ua))){ br = 'Edge'; brv = m[1]; }
  else if ((m = /(?:Firefox|FxiOS)\/([\d.]+)/.exec(ua))){ br = 'Firefox'; brv = m[1]; }
  else if ((m = /(?:Chrome|CriOS)\/([\d.]+)/.exec(ua))){ br = 'Chrome'; brv = m[1]; }
  else if ((m = /Version\/([\d.]+).*Safari/.exec(ua))){ br = 'Safari'; brv = m[1]; }
  return {os: os, osv: osv, br: br, brv: brv};
}
var HIGH = null;                                           /* the system's and the browser's exact versions, where the browser tells them */
function askHigh(){
  var d = navigator.userAgentData; if (!d || !d.getHighEntropyValues) return;
  try { d.getHighEntropyValues(['platformVersion', 'fullVersionList']).then(function(h){ HIGH = h; if (R){ R.high = h; soon(); } }, function(){}); } catch(e){}
}
function device(){
  var d = navigator.userAgentData, ua = navigator.userAgent || '', u = fromUA(ua), h = HIGH || (R && R.high) || null;
  var os = u.os, osv = u.osv, br = u.br, brv = u.brv;
  if (d){
    if (d.platform) os = d.platform === 'Chrome OS' ? 'ChromeOS' : d.platform;
    var b = brandOf(h && h.fullVersionList) || brandOf(d.brands); if (b){ br = b.br; brv = b.brv; }
    if (h && h.platformVersion) osv = h.platformVersion;
  }
  var de = document.documentElement, th = de.getAttribute('data-theme');
  var dark = th === 'dark' ? true : th === 'light' ? false : !!(window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
  var vv = window.visualViewport, zoom = (vv && vv.scale ? vv.scale : 1) * (window.outerWidth && window.innerWidth ? window.outerWidth / window.innerWidth : 1);
  var tz = null; try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || null; } catch(e){}
  var fs = K.Proctor && K.Proctor.fs ? !!K.Proctor.fs() : !!(document.fullscreenEnabled || document.webkitFullscreenEnabled);
  return {sw: screen.width, sh: screen.height, ww: window.innerWidth, wh: window.innerHeight, dpr: window.devicePixelRatio || 1,
    touch: !!(navigator.maxTouchPoints > 0 || 'ontouchstart' in window), os: os || null, osv: osv || null, br: br || null, brv: brv || null,
    dark: dark, large: de.classList.contains('lg'), zoom: zoomOf(zoom), tz: tz, fs: fs};
}

/* zoom: the window's outer width over its inner one (a browser's zoom changes only the inner), times a pinch's scale; a window's
   frame makes it a little over 1, so a value within 3% of one of the browser's zoom steps is that step */
var STEPS = [0.25, 0.33, 0.5, 0.67, 0.75, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4, 5];
function zoomOf(z){ if (!(z > 0) || !isFinite(z)) return null; for (var i = 0; i < STEPS.length; i++) if (Math.abs(z - STEPS[i]) <= STEPS[i] * 0.03) return STEPS[i]; return Math.round(z * 100) / 100; }

/* ---- scratch paper at Finish, in scratch.js's own saved form, 4 KB in all: the longest notes cut first, then the largest grid */
function bytes(o){ var s = JSON.stringify(o); try { return new TextEncoder().encode(s).length; } catch(e){ return unescape(encodeURIComponent(s)).length; } }
function scratchEnd(){
  var set = null; try { set = API && API.set ? API.set() : null; } catch(e){}
  var e = null; try { e = JSON.parse(get('practice.scratch.v1.' + set) || 'null'); } catch(x){}
  var end = {}, cut = false;
  if (e && e.q) Object.keys(e.q).forEach(function(q){
    var x = e.q[q] || {}, n = typeof x.n === 'string' ? x.n : '', g = x.g && x.g.o ? {v: x.g.v, o: x.g.o.slice()} : {v: [4, 1], o: []};
    if (n || g.o.length) end[q] = {n: n, g: g};
  });
  if (bytes(end) <= SCRATCH_BYTES) return {end: end, cut: false};
  /* the longest notes cut first: every note cut to the longest length that fits (a level found by halving); if no notes fit,
     the same for the grids' things, the last drawn going first */
  var ks = Object.keys(end), level = function(c, gc){ var o = {}; ks.forEach(function(q){ o[q] = {n: end[q].n.slice(0, c), g: {v: end[q].g.v, o: end[q].g.o.slice(0, gc)}}; }); return o; };
  var maxN = 0, maxG = 0; ks.forEach(function(q){ maxN = Math.max(maxN, end[q].n.length); maxG = Math.max(maxG, end[q].g.o.length); });
  var best = function(hi, f){ var lo = 0; while (lo < hi){ var mid = Math.ceil((lo + hi) / 2); if (bytes(f(mid)) <= SCRATCH_BYTES) lo = mid; else hi = mid - 1; } return lo; };
  var out;
  if (bytes(level(0, maxG)) <= SCRATCH_BYTES) out = level(best(maxN, function(c){ return level(c, maxG); }), maxG);
  else out = level(0, best(maxG, function(g){ return level(0, g); }));
  Object.keys(out).forEach(function(q){ if (!out[q].n && !out[q].g.o.length) delete out[q]; });
  end = out; cut = true;
  return {end: end, cut: cut};
}

/* ---- the log, in the pinned shape, as it stands now (nothing that is open is closed for good: the test may go on) */
function take(){
  if (!R) return null;
  var t1 = now(), t0 = R.t0, at = function(t){ return Math.max(0, Math.round((t - t0) / 1000)); };
  var visits = R.visits.slice(), calc = R.calc.slice(), scr = R.scratch.slice(), idle = R.idle.slice(), drop = JSON.parse(JSON.stringify(R.drop));
  var push = function(list, name, e){ if (list.length < CAP[name]) list.push(e); else drop[name]++; };
  var qms = {}; Object.keys(R.q).forEach(function(q){ qms[q] = R.q[q].ms; });
  if (R.open.visit){ push(visits, 'visits', [R.open.visit.q, R.open.visit.t, t1]); qms[R.open.visit.q] = (qms[R.open.visit.q] || 0) + Math.max(0, t1 - R.open.visit.t); }
  if (R.open.calc) push(calc, 'calc', [R.open.calc.w, R.open.calc.q, R.open.calc.t, t1]);
  if (R.open.scr) push(scr, 'scratch', [R.open.scr.w, R.open.scr.q, R.open.scr.t, t1]);
  if (!HELD && R.act && t1 - R.act.t > IDLE) push(idle, 'idle', [R.act.t, t1, R.act.q]);
  var flagEnd = {}; try { var S = API.S(), F = S && S.pg && S.pg.flag || {}; Object.keys(F).forEach(function(q){ if (F[q]) flagEnd[q] = true; }); } catch(e){}
  var qs = {}, all = questions(); Object.keys(R.q).forEach(function(q){ if (all.indexOf(q) < 0) all.push(q); });
  all.forEach(function(q){ var Q = R.q[q] || {ms: 0, visits: 0, first: null, flag: false};
    qs[q] = {sec: Math.round((qms[q] || 0) / 1000), visits: Q.visits, first: Q.first == null ? null : Math.round(Q.first / 1000), flag: !!(Q.flag || flagEnd[q]), flagEnd: !!flagEnd[q]}; });
  var parts = {}; Object.keys(R.parts).forEach(function(id){ var p = R.parts[id];
    parts[id] = {vals: p.head.concat(p.tail).map(function(e){ return [at(e[0]), e[1], e[2]]; }), n: p.n, pastes: p.pastes}; });
  var se = scratchEnd();
  return fit({v: 1, t0: t0, t1: t1, q: qs,
    visits: visits.map(function(e){ return [e[0], at(e[1]), at(e[2]) - at(e[1])]; }),
    parts: parts,
    calc: calc.map(function(e){ return [e[0], e[1], at(e[2]), at(e[3]) - at(e[2])]; }),
    scratch: {opens: scr.map(function(e){ return [e[0], e[1], at(e[2]), at(e[3]) - at(e[2])]; }), end: se.end, cut: se.cut},
    away: R.away.map(function(e){ return [at(e[0]), at(e[1]) - at(e[0]), e[2], e[3]]; }),
    blocked: R.blocked.map(function(e){ return [at(e[0]), e[1], e[2]]; }),
    idle: idle.map(function(e){ return [at(e[0]), at(e[1]) - at(e[0]), e[2]]; }),
    device: device(), fails: R.fails, drop: drop});
}
/* the log within LOG_BYTES: every string in a value cut to VAL_CHARS; then, while it is still too large, the middle value of the
   part with the most (n still counts them all), then the oldest visits (drop counts them) — never away, blocked or device */
function short(v){ if (typeof v === 'string') return v.length > VAL_CHARS ? v.slice(0, VAL_CHARS) : v; if (Array.isArray(v)) return v.map(short);
  if (v && typeof v === 'object'){ var o = {}; Object.keys(v).forEach(function(k){ o[k] = short(v[k]); }); return o; } return v; }
function fit(L){
  Object.keys(L.parts).forEach(function(id){ L.parts[id].vals.forEach(function(e){ e[1] = short(e[1]); }); });
  var size = bytes(L), guard = 0;
  while (size > LOG_BYTES && guard++ < 20){
    var ids = Object.keys(L.parts);
    while (size > LOG_BYTES){
      var big = null; ids.forEach(function(id){ var n = L.parts[id].vals.length; if (n > 2 && (!big || n > L.parts[big].vals.length)) big = id; });
      if (!big) break;
      var vs = L.parts[big].vals, cut = vs.splice(Math.floor(vs.length / 2), 1)[0]; size -= bytes(cut) + 1;
    }
    while (size > LOG_BYTES && L.visits.length){ var g = L.visits.shift(); L.drop.visits++; size -= bytes(g) + 1; }
    size = bytes(L);
    if (!L.visits.length && !Object.keys(L.parts).some(function(id){ return L.parts[id].vals.length > 2; })) break;
  }
  return L;
}
function questions(){ return Array.prototype.map.call(document.querySelectorAll('#paper .q[data-q]:not(.xq)'), function(c){ return c.getAttribute('data-q'); }); }

/* ---- the seams: exam.js and proctor.js */
var LISTENING = false;
K.Trace = {
  /* exam.js, once the page is up: {test, api: the page's (S, items, at), set: the set's storage name for scratch paper} */
  start: function(o){
    API = o.api || null; NAME = PRE + o.test;
    if (o.set) API = Object.assign({}, API, {set: function(){ return o.set; }});
    var was = null; try { was = JSON.parse(get(NAME) || 'null'); } catch(e){}
    RESUMED = !!(was && was.v === 1 && was.test === o.test && was.t0);
    R = RESUMED ? was : fresh(o.test); SEEN = RESUMED ? (was.seen || now()) : 0;
    try { for (var i = localStorage.length - 1; i >= 0; i--){ var k = localStorage.key(i); if (k && k.indexOf(PRE) === 0 && k !== NAME) localStorage.removeItem(k); } } catch(e){}
    ON = true; HELD = false;
    if (!LISTENING){ LISTENING = true; listen(); setInterval(poll, POLL); }
    if (RESUMED) ['calc', 'scr'].forEach(function(k){ var x = R.open[k]; if (x){ add(k === 'calc' ? 'calc' : 'scratch', [x.w, x.q, x.t, Math.max(x.t, SEEN)]); R.open[k] = null; } });   /* a panel open when the page went closed then */
    if (!RESUMED){ R.act = {t: R.t0, q: qNow()}; openVisit(qNow(), R.t0); }
    else { R.act = {t: now(), q: qNow()}; if (R.open.visit && R.open.visit.q !== qNow()){ closeVisit(now()); openVisit(qNow(), now()); } if (!R.open.visit) openVisit(qNow(), now()); }
    try { var S = API.S(); (API.items() || []).forEach(function(it){ var p = prec(it.id); if (p.last == null){ var v = S.ans[it.id]; p.last = blank(v) ? null : JSON.stringify(v); } }); } catch(e){}
    askHigh(); write();
    return {resumed: RESUMED, seen: SEEN};
  },
  saw: saw,                                                /* exam.js: the page saved S (an answer, a flag, the question) */
  fail: function(){ if (R){ R.fails++; soon(); } },        /* exam.js: a save that failed */
  q: qNow,
  /* proctor.js */
  away: function(from, to, kind, q){ if (R){ add('away', [from, to, kind, q == null ? null : q]); write(); } },
  blocked: function(what){ if (R && ON){ add('blocked', [now(), what, qNow()]); } },
  hold: hold,
  slot: function(v){ if (!R) return null; if (v !== undefined){ R.pr = v; write(); } return R.pr; },
  resumed: function(){ return RESUMED; }, seen: function(){ return SEEN; },
  take: take,
  stop: function(){ if (R){ poll(); write(); } ON = false; },
  clear: function(test){ ON = false; R = null; try { localStorage.removeItem(PRE + test); } catch(e){} },
  CAP: CAP,
  rec: function(){ return R; }                             /* the checks' hook (check/exam_page.js fills the log to every cap through it) */
};
})();
