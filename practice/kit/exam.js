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
   Seams for the next stage, called when present: Kit.Proctor.start({rule, onEnd, unlock}) at the start and .stop() at Finish;
   Kit.Trace.start({test, items}) at the start and Kit.Trace.take() for the log sent with finish.
   window.KIT_EXAM_CFG (the build's): {course, unit, title, h1, eyebrow, api}. Its words are DESIGN.md's list, New test and
   Copied; nothing else. */
(function(){
'use strict';
var K = window.Kit = window.Kit || {}, CFG = window.KIT_EXAM_CFG || {}, API = CFG.api || '/api/test';
var $ = function(id){ return document.getElementById(id); };
var NAME = 'exam.' + CFG.course + '.u' + CFG.unit;          /* this unit's test on this device: {test, token, start, result} */
var WORDS = {net: 'Can’t reach the site. Your answers are saved on this device.', retry: 'Try again', closed: 'This test isn’t open.',
  start: 'Start', test: 'Test', grading: 'Grading…', turnin: 'Turn in', copied: 'Copied', newtest: 'New test', back: 'Back', unread: 'Can’t read this yet'};
function load(){ try { return JSON.parse(localStorage.getItem(NAME) || 'null'); } catch(e){ return null; } }
function keep(){ try { localStorage.setItem(NAME, JSON.stringify(ST)); } catch(e){} }
function esc(s){ return String(s).replace(/[&<>"]/g, function(c){ return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]; }); }
var ST = load() || {}, PAGE = null, SKEW = 0, OPEN = null, PHASE = 'pre';   /* pre · test · grading · done */

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
  go.innerHTML = '<button type="button" class="go" id="exStart" hidden>' + WORDS.start + '</button><p class="exclosed" id="exClosed" hidden>' + WORDS.closed + '</p>';
  var paper = $('paper'); paper.parentNode.insertBefore(go, paper);
  var net = document.createElement('div'); net.className = 'exnet'; net.id = 'exNet'; net.setAttribute('role', 'alert'); net.hidden = true;
  net.innerHTML = '<span>' + WORDS.net + '</span><button type="button" id="exRetry">' + WORDS.retry + '</button>';
  document.body.insertBefore(net, $('result'));
  $('exRetry').addEventListener('click', function(){ var f = RETRY; mended(); if (f) f(); });
  $('exStart').addEventListener('click', startTest);
  var more = $('bMore'); if (more) more.setAttribute('aria-label', 'More');
}
function showGo(open){ OPEN = open; $('exStart').hidden = !open; $('exClosed').hidden = open; }
function status(then){
  call('GET', '/status?course=' + encodeURIComponent(CFG.course) + '&unit=' + encodeURIComponent(CFG.unit), undefined, {anon: true})
    .then(function(r){ mended(); OPEN = !!(r.j && r.j.open); if (then) then(OPEN); }, function(){ fail(function(){ status(then); }); });
}
function startTest(){
  var b = $('exStart'); b.disabled = true;
  call('POST', '/start', {course: CFG.course, unit: CFG.unit}, {anon: true}).then(function(r){
    b.disabled = false; mended();
    if (!r.ok){ showGo(false); return; }
    ST = {test: r.j.test, token: r.j.token, start: strip(r.j), result: null}; SKEW = r.j.now - Date.now(); ST.skew = SKEW; keep();
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
  if (K.Trace && K.Trace.start) try { K.Trace.start({test: ST.test, items: api.items().map(function(it){ return it.id; })}); } catch(e){}
  if (K.Proctor && K.Proctor.start) try { K.Proctor.start({rule: ST.start.rule, onEnd: function(why){ ENDED = why || 'left'; finish(); }, unlock: unlock}); } catch(e){}
  if (ST.finishing) finish();
  setInterval(tick, 1000);
  window.addEventListener('pagehide', function(){ if (DIRTY && PHASE === 'test') send(true); });
  document.addEventListener('visibilitychange', function(){ if (document.hidden && DIRTY && PHASE === 'test') send(true); });
}
function unlock(code, cb){ call('POST', '/' + ST.test + '/unlock', {code: code}).then(function(r){ cb(!!(r.j && r.j.ok)); }, function(){ cb(false); }); }
function elapsed(){
  if (ST.result) return ST.result.seconds || 0;
  return Math.max(0, (Date.now() + (ST.skew || 0) - (ST.start.started || Date.now())) / 1000);
}

/* ---- save: the newest answers and flags, at most every 20 s while something changed; at once before the page goes */
var DIRTY = false, SENT = 0, SEQ = 0, INFLIGHT = false, LAST = null, ENDED = null;
function saved(S){ if (PHASE !== 'test') return; DIRTY = true; var c = S.pg ? S.pg.cur : 0; if (LAST && c !== LAST.cur){ LAST.cur = c; tick(); } }
var GAP = window.KIT_EXAM_GAP || 20000;                   /* the checks' switch (check/exam_page.js sets it before the page loads; nothing on a page does) */
function tick(){ if (DIRTY && !INFLIGHT && !RETRY && PHASE === 'test' && Date.now() - SENT >= GAP) send(false); }
function send(leaving){
  if (!PAGE) return; var S = PAGE.S();
  SEQ = Math.max(SEQ + 1, (ST.n || 0) + 1); ST.n = SEQ; keep();
  var body = {answers: S.ans, flags: (S.pg && S.pg.flag) || {}, n: SEQ};
  DIRTY = false; SENT = Date.now(); INFLIGHT = !leaving;
  call('PUT', '/' + ST.test + '/save', body, {keep: leaving}).then(function(r){ INFLIGHT = false; if (r.ok) mended(); }, function(){ INFLIGHT = false; DIRTY = true; if (!leaving) fail(function(){ send(false); }); });
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
    ST.result = {code: j.code, points: j.points, of: j.of, parts: j.parts || null, seconds: j.seconds, at: Date.now()}; ST.finishing = false; delete ST.token; keep();
    PHASE = 'done'; document.body.classList.remove('exam-grading');
    PAGE.done(partsOf(ST.result), ST.result.at);
    status(function(){ paintResult(); });
  }, function(){ fail(seal); });
}
function partsOf(R){ if (!R || !R.parts) return null; var o = {}; R.parts.forEach(function(p){ o[p.id] = p.v; }); return o; }

/* ---- the results panel */
function code4(c){ c = String(c || '').replace(/[^0-9A-Z]/gi, '').toUpperCase(); return c.replace(/(.{4})(?=.)/g, '$1-'); }
function clock(s){ s = Math.max(0, Math.floor(s || 0)); var m = Math.floor(s / 60), r = s % 60; return m + ':' + (r < 10 ? '0' : '') + r; }
function paintResult(){
  var box = $('result'); if (!box) return;
  document.body.classList.toggle('exam-noparts', PHASE === 'done' && !(ST.result && ST.result.parts));
  if (PHASE === 'grading'){ box.innerHTML = '<p class="exgrading" role="status">' + WORDS.grading + '</p>'; box.hidden = false; return; }
  if (PHASE !== 'done' || !ST.result){ box.hidden = true; box.innerHTML = ''; return; }
  var R = ST.result, away = K.Proctor && K.Proctor.summary ? K.Proctor.summary() : '';
  box.innerHTML = '<p class="exscore"><b>' + R.points + ' / ' + R.of + '</b> points</p><p class="extime" translate="no">' + clock(R.seconds) + '</p>' +
    (away ? '<p class="exaway">' + esc(away) + '</p>' : '') +
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
  var b = $('exNewGo'); b.disabled = true;
  call('POST', '/start', {course: CFG.course, unit: CFG.unit}, {anon: true}).then(function(r){
    b.disabled = false; mended();
    if (!r.ok){ OPEN = false; paintResult(); return; }
    ST = {test: r.j.test, token: r.j.token, start: strip(r.j), result: null, skew: r.j.now - Date.now()}; keep();
    location.reload();                                    /* the page's scripts start again on the new test */
  }, function(){ b.disabled = false; fail(newTest); });
}

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
      ST.start = s0; ST.skew = r.j.now - Date.now(); if (r.j.status && r.j.status !== 'open') ST.finishing = true; keep();
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
