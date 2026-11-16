/* Practice-test kit: the test on the student's device (exam.js, 15 Nov 2026; practice/exam/DESIGN.md). The test page holds the
   kit's page scripts inert (<script type="text/x-kit-held">, written by exam/build_exam.py) and no unit at all; this file gets
   the test from the site and only then makes the stub unit (exam_unit.js) and runs them, in their order. It has:
   - the start screen: the unit's title, the word Test, Start — or "This test isn't open.";
   - the site's routes, exactly as check/exam_site.js writes them down: status, start, the test again by GET (a reload),
     save (at most every 20 s while something changed, a question change being a change, and at once before the page goes),
     read (on a pause in typing and on leaving a box: "Can't read this yet" and the preview), finish, grade until done, seal;
   - the clock from the site's own start; Grading…; the results panel (24 / 36 points, the time, the code, Turn in, and each
     question Right, Not right or Blank when the site shows them), kept on the device so the page reopens on it; New test
     while the test is open, after a confirm;
   - a request that fails says so, with Try again, and loses nothing (every answer is saved on the device first).
   The proctor and the log (16 Nov 2026; proctor.js, trace.js, both on the test page before this file): Kit.Proctor.enter()
   inside the Start press (full screen needs the press), .start({rule, onEnd, unlock}) once the test is on the page (not again
   while it is being finished), .stop() at Finish; Kit.Trace.start({test, api, set}) once the test is on the page, .saw(S) on
   each of the page's saves, .fail() for a save that failed, .take() for the log sent with finish, .clear(test) after the seal.
   The end panel's lines on leaving come from that log (its away list), kept with the result.
   The bar's Finish (and Next on the last question, which presses it) asks here, in the bar, with DESIGN.md's words: Finish, Back.
   After Finish a question with some of its parts right is Not right in the list (pager.js's "1 of 2 right" is not one of them).
   window.KIT_EXAM_CFG (the build's): {course, unit, title, h1, eyebrow, api}. Its words are DESIGN.md's list, New test and
   Copied; nothing else. */
(function(){
'use strict';
var K = window.Kit = window.Kit || {}, CFG = window.KIT_EXAM_CFG || {}, API = CFG.api || '/api/test';
var $ = function(id){ return document.getElementById(id); };
var NAME = 'exam.' + CFG.course + '.u' + CFG.unit;          /* this unit's test on this device: {test, token, start, result} */
var WORDS = {net: 'Can’t reach the site. Your answers are saved on this device.', retry: 'Try again', closed: 'This test isn’t open.',
  start: 'Start', test: 'Test', grading: 'Grading…', turnin: 'Turn in', copied: 'Copied', newtest: 'New test', back: 'Back', unread: 'Can’t read this yet',
  code: 'Start code', finish: 'Finish', notright: 'Not right', ended: 'Test ended: left the test ', times: ' times.', time: ' time.', leftN: 'Left the test ', leftT: ' times · ', leftT1: ' time · ', min: ' min', sec: ' s'};
function load(){ try { return JSON.parse(localStorage.getItem(NAME) || 'null'); } catch(e){ return null; } }
function keep(){ try { localStorage.setItem(NAME, JSON.stringify(ST)); } catch(e){} }
function esc(s){ return String(s).replace(/[&<>"]/g, function(c){ return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]; }); }
var ST = load() || {}, PAGE = null, SKEW = 0, OPEN = null, PIN = false, PHASE = 'pre';
var WAIT = window.KIT_EXAM_UNLOCK_WAIT || 60000;
/* one start a browser, an opening (16 Nov 2026, CHANGES-16NOV §10): a random id made once and sent with Start; the site refuses
   a second start from it in the same opening (403 again), shown as a refused code is. In memory only if storage is refused. */
var DEV = (function(){
  var d = null; try { d = localStorage.getItem('exam.dev'); } catch(e){}
  if (d && /^[0-9a-f]{32}$/.test(d)) return d;
  var b = new Uint8Array(16); (window.crypto || window.msCrypto).getRandomValues(b);
  d = Array.prototype.map.call(b, function(x){ return (x < 16 ? '0' : '') + x.toString(16); }).join('');
  try { localStorage.setItem('exam.dev', d); } catch(e){}
  return d;
})();
/* the end of the time (CHANGES-16NOV §10): the site says when this test stops being live (ends, ms, its clock), on Start, a
   reload and every save; the newest one is kept. The page saves SAVE_BEFORE before it and finishes END_BEFORE before it, by the
   ordinary Finish, so what was typed up to then is what the site commits (a finish that came after ends would commit only the
   last save). The site's clock is the device's plus the offset kept from the site's own now. */
var SAVE_BEFORE = 3000, END_BEFORE = 1000, ENDT = 0, PRESAVED = null;          /* after the site's 429, the box and Start wait (the checks' switch shortens it) */   /* pre · test · grading · done */

/* ---- the site */
function call(method, path, body, o){
  o = o || {};
  var h = {'Content-Type': 'application/json'}; if (ST.token && !o.anon) h.Authorization = 'Bearer ' + ST.token;
  return fetch(API + path, {method: method, headers: h, body: body === undefined ? undefined : JSON.stringify(body), keepalive: !!o.keep, credentials: 'same-origin', cache: 'no-store'})
    .then(function(r){ return r.json().catch(function(){ return {}; }).then(function(j){ if (r.status >= 500) throw new Error('site ' + r.status); return {status: r.status, ok: r.ok, j: j}; }); });
}
/* one failed request at a time is said, with the way to go on */
var RETRY = null;
function fail(again){ RETRY = again; var n = $('exNet'); n.hidden = false; }
function mended(){ RETRY = null; $('exNet').hidden = true; }

/* ---- the page before the test: the head, and Start or "not open" */
function headInit(){
  var eb = $('eyebrow'), h1 = $('h1'), tot = $('total');
  if (eb) eb.innerHTML = CFG.eyebrow || ''; if (h1) h1.innerHTML = CFG.h1 || ''; if (tot) tot.textContent = '';
  var chip = document.createElement('span'); chip.className = 'scopechip exchip'; chip.id = 'exChip'; chip.setAttribute('translate', 'no'); chip.textContent = WORDS.test;
  if (tot && tot.parentNode) tot.parentNode.insertBefore(chip, tot);
  var go = document.createElement('div'); go.className = 'exgo'; go.id = 'exGo';
  go.innerHTML = '<input type="text" class="expin" id="exPin" hidden placeholder="' + WORDS.code + '" aria-label="' + WORDS.code + '" maxlength="12" autocomplete="off" autocapitalize="characters" autocorrect="off" spellcheck="false" enterkeyhint="go">' +
    '<button type="button" class="go" id="exStart" hidden>' + WORDS.start + '</button><p class="exclosed" id="exClosed" hidden>' + WORDS.closed + '</p>';
  var paper = $('paper'); paper.parentNode.insertBefore(go, paper);
  var net = document.createElement('div'); net.className = 'exnet'; net.id = 'exNet'; net.setAttribute('role', 'alert'); net.hidden = true;
  net.innerHTML = '<span>' + WORDS.net + '</span><button type="button" id="exRetry">' + WORDS.retry + '</button>';
  document.body.insertBefore(net, $('result'));
  $('exRetry').addEventListener('click', function(){ var f = RETRY; mended(); if (f) f(); });
  $('exStart').addEventListener('click', startTest);
  /* the start code (16 Nov 2026): upper-cased as typed; Enter starts */
  $('exPin').addEventListener('input', function(){ var a = this.selectionStart, v = this.value.toUpperCase(); if (v !== this.value){ this.value = v; try { this.setSelectionRange(a, a); } catch(e){} } });
  $('exPin').addEventListener('keydown', function(e){ if (e.key === 'Enter'){ e.preventDefault(); if (!$('exStart').disabled) startTest(); } });
  var more = $('bMore'); if (more) more.setAttribute('aria-label', 'More');
}
function showGo(open){
  OPEN = open; $('exStart').hidden = !open; $('exClosed').hidden = open;
  var p = $('exPin'), was = p.hidden; p.hidden = !(open && PIN); if (!p.hidden && was) try { p.focus(); } catch(e){}
}
function shake(el){ if ('value' in el && el.tagName === 'INPUT') el.value = ''; el.classList.remove('exshake'); void el.offsetWidth; el.classList.add('exshake'); try { el.focus(); } catch(e){} }
function status(then){
  call('GET', '/status?course=' + encodeURIComponent(CFG.course) + '&unit=' + encodeURIComponent(CFG.unit), undefined, {anon: true})
    .then(function(r){ mended(); OPEN = !!(r.j && r.j.open); PIN = OPEN && !!(r.j && r.j.pin); if (then) then(OPEN); }, function(){ fail(function(){ status(then); }); });
}
function startTest(){
  if (K.Proctor && K.Proctor.enter) try { K.Proctor.enter(); } catch(e){}   /* full screen needs this press */
  var b = $('exStart'), box = $('exPin'); b.disabled = true;
  var body = {course: CFG.course, unit: CFG.unit, dev: DEV}; if (PIN) body.pin = box.value.toUpperCase().replace(/\s+/g, '');
  call('POST', '/start', body, {anon: true}).then(function(r){
    b.disabled = false; mended();
    var why = r.j && r.j.error;
    if (!r.ok && ((PIN && r.status === 429) || (r.status === 403 && (why === 'pin' || why === 'again')))){   /* a code refused, or a second start from this browser: the box (or Start) shakes, no words; 429 waits */
      if (K.Proctor && K.Proctor.leave) K.Proctor.leave();
      if (r.status === 429){ box.value = ''; box.disabled = b.disabled = true; setTimeout(function(){ box.disabled = b.disabled = false; try { box.focus(); } catch(e){} }, WAIT); }
      else shake(PIN ? box : b);
      return;
    }
    if (!r.ok){ showGo(false); if (K.Proctor && K.Proctor.leave) K.Proctor.leave(); return; }
    ST = {test: r.j.test, token: r.j.token, start: strip(r.j), result: null}; SKEW = r.j.now - Date.now(); ST.skew = SKEW; ends(r.j.ends); keep();
    mount(r.j);
  }, function(){ b.disabled = false; fail(startTest); });
}
function strip(j){ var o = {}; ['test', 'started', 'rule', 'show', 'form', 'pub', 'n'].forEach(function(k){ if (j[k] !== undefined) o[k] = j[k]; }); return o; }

/* ---- the test: the stub unit made, the page's scripts run */
function setKey(){ return 'exam.' + ST.start.pub.id + '.set.' + ST.test + '.all'; }
function seedSet(j){                                       /* a device that lost its copy of the answers gets the site's */
  var k = setKey(); try { if (localStorage.getItem(k)) return; } catch(e){ return; }
  if (!j || !j.answers) return;
  var rec = {schema: 2, cv: ST.start.pub.cv, hash: 'exam-' + ST.test, mode: 'test', ans: j.answers, res: {}, more: {}, walk: {}, walkOpen: {}, acc: 0, startedAt: null, running: false, done: false, pg: {cur: 0, flag: j.flags || {}}, at: Date.now()};
  try { localStorage.setItem(k, JSON.stringify(rec)); } catch(e){}
}
function mount(j){
  var pub = ST.start.pub;
  seedSet(j);
  var eb = String(pub.eyebrow || '').replace(/(\s|&nbsp;)*·(\s|&nbsp;)*Practice(\s+Test)?\s*$/i, '');
  window.Unit = K.ExamUnit.make(Object.assign({}, pub, {eyebrow: eb, title: CFG.title || pub.title}));
  window.KIT_EXAM = {id: ST.test, page: page, saved: saved, read: read, preview: preview, elapsed: elapsed, finish: finish, result: paintResult};
  document.body.classList.remove('exam-pre');
  Array.prototype.forEach.call(document.querySelectorAll('script[type="text/x-kit-held"]'), function(s){
    var x = document.createElement('script'); x.textContent = s.textContent; s.parentNode.replaceChild(x, s); });
}
function page(api){
  PAGE = api;
  var S = api.S();
  if (ST.result && !S.done) api.done(partsOf(ST.result), ST.result.at);
  if (S.done){ PHASE = 'done'; paintResult(); return; }
  PHASE = 'test'; S.running = true; api.paint();
  var ps = $('pgStart'); if (ps && document.body.classList.contains('pg-start')) ps.click();
  LAST = {cur: S.pg ? S.pg.cur : 0};
  if (K.Trace && K.Trace.start) try { K.Trace.start({test: ST.test, api: api, set: setKey()}); } catch(e){}
  if (K.Proctor && K.Proctor.start && !ST.finishing) try { K.Proctor.start({rule: ST.start.rule, onEnd: function(why){ ENDED = why || 'left'; finish(); }, unlock: unlock}); } catch(e){}
  if (ST.finishing) finish();
  setInterval(tick, 1000); plan();
  window.addEventListener('pagehide', function(){ if (DIRTY && PHASE === 'test') send(true); });
  document.addEventListener('visibilitychange', function(){ if (document.hidden && DIRTY && PHASE === 'test') send(true); });
}
function unlock(code, cb){ call('POST', '/' + ST.test + '/unlock', {code: code}).then(function(r){ if (closed(r)) return over(); cb(!!(r.ok && r.j && r.j.ok), r.status); }, function(){ cb(false, 0); }); }
/* the site says the test is over (16 Nov 2026: Croix closed it, opened it again, or its time allowed ran out): a save, a read or
   an unlock answers 403 closed. The page finishes at once, as Finish does; the site commits what it last saved. */
function closed(r){ return r && r.status === 403 && r.j && r.j.error === 'closed'; }
function over(){ if (PHASE === 'test') finish(); }
function elapsed(){
  if (ST.result) return ST.result.seconds || 0;
  return Math.max(0, (Date.now() + (ST.skew || 0) - (ST.start.started || Date.now())) / 1000);
}

/* ---- save: the newest answers and flags, at most every 20 s while something changed; at once before the page goes */
var DIRTY = false, SENT = 0, SEQ = 0, INFLIGHT = false, LAST = null, ENDED = null;
function saved(S){ if (PHASE !== 'test') return; DIRTY = true; if (K.Trace && K.Trace.saw) try { K.Trace.saw(S); } catch(e){} var c = S.pg ? S.pg.cur : 0; if (LAST && c !== LAST.cur){ LAST.cur = c; tick(); } }
var GAP = window.KIT_EXAM_GAP || 20000;                   /* the checks' switch (check/exam_page.js sets it before the page loads; nothing on a page does) */
function siteNow(){ return Date.now() + (ST.skew || 0); }
function ends(v){ if (typeof v !== 'number' || !isFinite(v)) return; if (ST.ends !== v){ ST.ends = v; PRESAVED = null; keep(); } plan(); }
function plan(){
  clearTimeout(ENDT); ENDT = 0; if (PHASE !== 'test' || !PAGE || typeof ST.ends !== 'number') return;
  var left = ST.ends - siteNow();
  if (left <= END_BEFORE) return finish();
  if (left <= SAVE_BEFORE && PRESAVED !== ST.ends){ PRESAVED = ST.ends; if (!INFLIGHT) send(false); }
  ENDT = setTimeout(plan, Math.max(50, Math.min(left - (PRESAVED === ST.ends ? END_BEFORE : SAVE_BEFORE), 60000)));
}
function tick(){ if (DIRTY && !INFLIGHT && !RETRY && PHASE === 'test' && Date.now() - SENT >= GAP) send(false); }
function send(leaving){
  if (!PAGE) return; var S = PAGE.S();
  SEQ = Math.max(SEQ + 1, (ST.n || 0) + 1); ST.n = SEQ; keep();
  var body = {answers: S.ans, flags: (S.pg && S.pg.flag) || {}, n: SEQ};
  DIRTY = false; SENT = Date.now(); INFLIGHT = !leaving;
  call('PUT', '/' + ST.test + '/save', body, {keep: leaving}).then(function(r){ INFLIGHT = false; if (r.ok){ mended(); if (r.j) ends(r.j.ends); } else if (closed(r)) over(); }, function(){ INFLIGHT = false; DIRTY = true; if (K.Trace && K.Trace.fail) K.Trace.fail(); if (!leaving) fail(function(){ send(false); }); });
}

/* ---- read: "can't read this yet" and the preview, from the site */
var PV = {}, TIMERS = {};
function itemOf(id){ var its = PAGE ? PAGE.items() : []; for (var i = 0; i < its.length; i++) if (its[i].id === id) return its[i]; return null; }
function blankOf(a){ return Array.isArray(a) ? a.every(function(v){ return !String(v || '').trim(); }) : !String(a == null ? '' : a).trim(); }
function paintPv(id, r){
  var boxes = document.querySelectorAll('[data-part="' + id + '"]'), els = boxes.length ? Array.prototype.slice.call(boxes) : [$('a' + id)].filter(Boolean);
  els.forEach(function(el, k){ var pv = el.parentNode.querySelector('.pv'); if (pv) pv.innerHTML = r ? (Array.isArray(r.pretty) ? r.pretty[k] || '' : r.pretty || '') : ''; });
}
function ask(it, then){
  var S = PAGE.S(), text = S.ans[it.id], a = it.sib ? S.ans[it.sib] : undefined, key = JSON.stringify([text, a === undefined ? null : a]);
  if (blankOf(text)){ paintPv(it.id, null); if (then) then({ok: true, pretty: ''}); return; }
  if (PV[it.id] && PV[it.id].k === key){ paintPv(it.id, PV[it.id].r); if (then) then(PV[it.id].r); return; }
  var body = {part: it.id, text: text}; if (a !== undefined) body.a = a;
  call('POST', '/' + ST.test + '/read', body).then(function(r){
    if (closed(r)) return over();
    if (!r.ok || !r.j) return; var now = JSON.stringify([PAGE.S().ans[it.id], it.sib ? PAGE.S().ans[it.sib] : null]);
    var res = {ok: r.j.ok !== false, pretty: r.j.pretty == null ? '' : r.j.pretty}; PV[it.id] = {k: key, r: res};
    if (now === key){ paintPv(it.id, res); if (then) then(res); }
  }, function(){});                                        /* a preview that does not come is no loss: the next change asks again */
}
function preview(el){
  if (!PAGE || PHASE !== 'test') return;
  var id = el.getAttribute('data-part') != null ? el.getAttribute('data-part') : el.id.slice(1), it = itemOf(id); if (!it) return;
  clearTimeout(TIMERS[id]); TIMERS[id] = setTimeout(function(){ ask(it); }, 700);
}
function read(it, a, sib, rd){
  if (!PAGE || PHASE !== 'test') return;
  clearTimeout(TIMERS[it.id]);
  ask(it, function(r){ if (rd) rd.innerHTML = r.ok ? '' : '<span class="kl">' + WORDS.unread + '</span>'; });
}

/* ---- Finish: the answers to the site, the steps graded, the record sealed */
function finish(){
  if (PHASE === 'grading' || PHASE === 'done') return;
  if (K.Proctor && K.Proctor.stop) try { K.Proctor.stop(); } catch(e){}
  PHASE = 'grading'; ST.finishing = true; keep(); document.body.classList.add('exam-grading'); paintResult(); window.scrollTo(0, 0);
  var S = PAGE.S(), log = null; if (K.Trace && K.Trace.take) try { log = K.Trace.take(); } catch(e){}
  if (ENDED) ST.ended = ENDED; else ENDED = ST.ended || null;
  if (log && log.away) ST.left = {n: log.away.length + ((log.drop && log.drop.away) || 0), sec: log.away.reduce(function(s, a){ return s + (a[1] || 0); }, 0)};
  keep();
  var body = {answers: S.ans, log: log}; if (ENDED) body.ended = ENDED;
  var go = function(){
    call('POST', '/' + ST.test + '/finish', body).then(function(r){
      if (r.ok || r.status === 409){ mended(); grade(0, (r.j && r.j.steps) || 0); }
      else { mended(); PHASE = 'test'; ST.finishing = false; keep(); document.body.classList.remove('exam-grading'); paintResult(); }
    }, function(){ fail(go); });
  };
  go();
}
function grade(step, steps){
  if (step >= steps && steps) return seal();
  call('POST', '/' + ST.test + '/grade', {step: step}).then(function(r){
    mended(); var j = r.j || {};
    if (j.done) return seal();
    grade(step + 1, j.steps || steps);
  }, function(){ fail(function(){ grade(step, steps); }); });
}
function seal(){
  call('POST', '/' + ST.test + '/seal').then(function(r){
    if (!r.ok){ fail(seal); return; }
    mended(); var j = r.j;
    ST.result = {code: j.code, points: j.points, of: j.of, parts: j.parts || null, seconds: j.seconds, at: Date.now(), left: ST.left || null, ended: ST.ended || null}; ST.finishing = false; delete ST.token; keep();
    if (K.Trace && K.Trace.clear) try { K.Trace.clear(ST.test); } catch(e){}   /* sent and sealed: the device's copy of the log goes */
    PHASE = 'done'; document.body.classList.remove('exam-grading');
    PAGE.done(partsOf(ST.result), ST.result.at);
    status(function(){ paintResult(); });
  }, function(){ fail(seal); });
}
function partsOf(R){ if (!R || !R.parts) return null; var o = {}; R.parts.forEach(function(p){ o[p.id] = p.v; }); return o; }

/* ---- the results panel */
function span(s){ s = Math.max(0, Math.round(s || 0)); var m = Math.floor(s / 60), r = s % 60; return m ? m + WORDS.min + (r ? ' ' + r + WORDS.sec : '') : r + WORDS.sec; }   /* 1 min 5 s */
function code4(c){ c = String(c || '').replace(/[^0-9A-Z]/gi, '').toUpperCase(); return c.replace(/(.{4})(?=.)/g, '$1-'); }
function clock(s){ s = Math.max(0, Math.floor(s || 0)); var m = Math.floor(s / 60), r = s % 60; return m + ':' + (r < 10 ? '0' : '') + r; }
function paintResult(){
  var box = $('result'); if (!box) return;
  document.body.classList.toggle('exam-noparts', PHASE === 'done' && !(ST.result && ST.result.parts));
  if (PHASE === 'grading'){ box.innerHTML = '<p class="exgrading" role="status">' + WORDS.grading + '</p>'; box.hidden = false; return; }
  if (PHASE !== 'done' || !ST.result){ box.hidden = true; box.innerHTML = ''; return; }
  var R = ST.result, rule = ST.start && ST.start.rule || {}, L = R.left || {n: 0, sec: 0};
  box.innerHTML = '<p class="exscore"><b>' + R.points + ' / ' + R.of + '</b> points</p><p class="extime" translate="no">' + clock(R.seconds) + '</p>' +
    (R.ended === 'left' ? '<p class="exended">' + esc(WORDS.ended + (rule.after || L.n) + ((rule.after || L.n) === 1 ? WORDS.time : WORDS.times)) + '</p>' : '') +
    (L.n ? '<p class="exaway">' + esc(WORDS.leftN + L.n + (L.n === 1 ? WORDS.leftT1 : WORDS.leftT) + span(L.sec)) + '</p>' : '') +
    '<p class="excode" translate="no" id="exCode">' + code4(R.code) + '</p>' +
    '<div class="btns exbtns"><button type="button" class="go" id="exTurn">' + WORDS.turnin + '</button><span class="excopied" id="exCopied" role="status"></span>' +
    (OPEN ? '<button type="button" id="exNew">' + WORDS.newtest + '</button>' : '') + '</div>' +
    '<div class="btns exsure" id="exSure" hidden><button type="button" class="go" id="exNewGo">' + WORDS.newtest + '</button><button type="button" id="exNewNo">' + WORDS.back + '</button></div>';
  box.hidden = false;
  $('exTurn').addEventListener('click', turnIn);
  if ($('exNew')) $('exNew').addEventListener('click', function(){ $('exSure').hidden = false; this.hidden = true; $('exNewGo').focus(); });
  $('exNewNo').addEventListener('click', function(){ $('exSure').hidden = true; $('exNew').hidden = false; $('exNew').focus(); });
  $('exNewGo').addEventListener('click', newTest);
}
function copy(t){
  if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(t).catch(function(){ return copyOld(t); });
  return Promise.resolve(copyOld(t));
}
function copyOld(t){ var a = document.createElement('textarea'); a.value = t; a.setAttribute('readonly', ''); a.style.position = 'fixed'; a.style.opacity = '0'; document.body.appendChild(a); a.select(); try { document.execCommand('copy'); } catch(e){} a.remove(); }
function turnIn(){
  var c = code4(ST.result.code), form = ST.start && ST.start.form;
  if (form) window.open(String(form).split('CODE').join(encodeURIComponent(c)), '_blank', 'noopener');
  copy(c).then(function(){ if (!form){ var s = $('exCopied'); if (s) s.textContent = WORDS.copied; } });
}
function newTest(){
  if (PIN){ ST = {}; keep(); location.reload(); return; }   /* a start code is asked for: the start screen, with its box */
  var b = $('exNewGo'); b.disabled = true;
  call('POST', '/start', {course: CFG.course, unit: CFG.unit, dev: DEV}, {anon: true}).then(function(r){
    b.disabled = false; mended();
    if (r.status === 403 && r.j && r.j.error === 'again') return shake(b);   /* this browser has had its test in this opening */
    if (!r.ok){ OPEN = false; paintResult(); return; }
    ST = {test: r.j.test, token: r.j.token, start: strip(r.j), result: null, skew: r.j.now - Date.now(), ends: typeof r.j.ends === 'number' ? r.j.ends : null}; keep();
    location.reload();                                    /* the page's scripts start again on the new test */
  }, function(){ b.disabled = false; fail(newTest); });
}

/* Finish asks in the bar with the list's words: Finish, Back (ui.js's own question says how many are blank, and Keep working) */
function asking(on){ document.body.classList.toggle('asking', on); }
document.addEventListener('click', function(e){
  var t = e.target && e.target.closest ? e.target.closest('#bFinish') : null; if (!t || PHASE !== 'test') return;
  e.stopImmediatePropagation(); e.preventDefault();
  var c = $('confirm'); c.hidden = false; asking(true);
  c.innerHTML = '<button type="button" class="go" id="cy">' + WORDS.finish + '</button><button type="button" id="cn">' + WORDS.back + '</button>';
  var shut = function(){ c.hidden = true; c.innerHTML = ''; asking(false); };
  $('cy').onclick = function(){ shut(); finish(); };
  $('cn').onclick = function(){ shut(); var bf = $('bFinish'); if (bf) bf.focus(); };
  $('cy').focus();
}, true);
/* a question with some of its parts right is Not right in the list after Finish */
(function(){ var rows = null, mend = function(){ rows = rows || $('pgRows'); if (!rows) return;
  Array.prototype.forEach.call(rows.querySelectorAll('.pgrv'), function(v){ if (/^\d+ of \d+ right$/.test(v.textContent)){ v.textContent = WORDS.notright; var b = v.closest('[aria-label]'); if (b) b.setAttribute('aria-label', b.getAttribute('aria-label').replace(/\d+ of \d+ right/, 'not right')); } }); };
  if (window.MutationObserver) new MutationObserver(function(m, ob){ if ($('pgRows')){ ob.disconnect(); rows = $('pgRows'); new MutationObserver(mend).observe(rows, {childList: true, subtree: true}); mend(); } }).observe(document.body, {childList: true, subtree: true});
})();
/* the list of questions after Finish is read, never opened (opening one would bring the review's own words) */
document.addEventListener('click', function(e){ if (e.target && e.target.closest && e.target.closest('[data-pgr]')){ e.stopImmediatePropagation(); e.preventDefault(); } }, true);
/* ---- the first screen */
document.body.classList.add('exam', 'exam-pre');
headInit();
function boot(){
  if (ST.result && ST.start && ST.start.pub){ mount(null); status(function(){ paintResult(); }); return; }
  if (ST.result){ PHASE = 'done'; status(function(){ paintResult(); }); paintResult(); return; }
  if (ST.test && ST.token){
    call('GET', '/' + ST.test).then(function(r){
      mended();
      if (r.status === 401 || r.status === 403 || r.status === 404){ ST = {}; keep(); return status(showGo); }
      var s0 = strip(r.j); if (!s0.pub && ST.start) s0.pub = ST.start.pub;   /* a sealed test's halves are gone from the site: this device's copy draws it */
      ST.start = s0; ST.skew = r.j.now - Date.now(); ends(r.j.ends); if (r.j.status && r.j.status !== 'open') ST.finishing = true; keep();
      if (!ST.start.pub){ ST = {}; keep(); return status(showGo); }
      mount(r.j);
    }, function(){
      if (ST.start && ST.start.pub){ mount(null); fail(function(){ DIRTY = true; tick(); }); }   /* offline: the test goes on from this device; a save tries again */
      else fail(boot);
    });
    return;
  }
  status(showGo);
}
boot();
})();
