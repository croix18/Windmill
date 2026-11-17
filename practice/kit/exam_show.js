/* Practice-test kit: the test as drawn (exam_show.js, 16 Nov 2026; practice/exam/DESIGN.md, "See the test"). Teacher builds only.
   Croix, 16 Nov, 6:34 pm, after his first dummy run: "Is there any way to have it be able to show me the exact questions as well?"
   Tally opens the unit's teacher copy at …/practice/#test=<payload> in a new tab; this page then shows, in place of the practice
   page, every question of that student's test exactly as the page drew it for the record's seed, with what the student
   answered, the verdict and the key under each part.
     payload = base64url(UTF-8 JSON) {v: 1, course, unit, seed, cv, kit, code, points, of, parts: [[id, answer, result, key], …],
               scope?}   scope: a lesson test's ("lesson-10.03"; DESIGN.md "Lesson tests", 16 Nov 2026), drawn again from the seed
               and the scope (Kit.ExamLesson, exam_lesson.js), and the head says the lesson; none or '' for the unit's test
   - Read before ui.js runs (openSet writes #set-N); the address is put back to #test=… once the page is drawn, so a reload shows
     the same thing. Without #test= this file does nothing at all.
   - The seed is drawn again with the page's own machinery (Kit.ExamPool.draw, as the cockpit's pool was drawn: the same cards
     check/exam_page.js holds the test page to) and PROVED to be that test before anything is shown: the same number of parts,
     the same ids in the same order, and each part's key (exam_pool.js's keyTextOf) equal to the record's, a string or a list,
     exactly. Anything else — a payload that cannot be read, another unit's, a unit changed since — shows one plain line and a
     link back, and never a question. A content version that differs while the proof holds: the test, with one quiet line.
   - Everything from the payload goes on the page as text, capped (200 KB, 200 parts, 400 characters a string shown). No name is
     shown or asked for. While it shows a test this page makes no request (fetch and XMLHttpRequest refuse) and writes nothing
     that outlives it: localStorage and sessionStorage are kept in memory for the visit, so the practice page's own saved state
     is exactly what it was. */
(function(){
'use strict';
var m = /^#test=(.*)$/.exec(location.hash || '');
if (!m) return;                                            /* not the test as drawn: nothing at all */
var RAW = m[1], MAXB = 200 * 1024, MAXP = 200, MAXS = 400;

/* ---- for the visit: no request, nothing written to the device's storage */
(function(){
  var real = {get: Storage.prototype.getItem, set: Storage.prototype.setItem, rm: Storage.prototype.removeItem, key: Storage.prototype.key, clear: Storage.prototype.clear}, mem = new Map();
  var mine = function(s){ try { return s === window.localStorage || s === window.sessionStorage; } catch(e){ return false; } };
  var box = function(s){ if (!mem.has(s)) mem.set(s, {}); return mem.get(s); };
  Storage.prototype.setItem = function(k, v){ if (!mine(this)) return real.set.call(this, k, v); box(this)[k] = String(v); };
  Storage.prototype.getItem = function(k){ if (!mine(this)) return real.get.call(this, k); var b = box(this); if (Object.prototype.hasOwnProperty.call(b, k)) return b[k]; return real.get.call(this, k); };
  Storage.prototype.removeItem = function(k){ if (!mine(this)) return real.rm.call(this, k); box(this)[k] = null; };
  Storage.prototype.clear = function(){ if (!mine(this)) return real.clear.call(this); };
  window.fetch = function(){ return Promise.reject(new TypeError('the test as drawn makes no request')); };
  if (window.XMLHttpRequest) window.XMLHttpRequest.prototype.send = function(){ throw new Error('the test as drawn makes no request'); };
  if (navigator.sendBeacon) navigator.sendBeacon = function(){ return false; };
})();
document.documentElement.classList.add('xshowing');       /* the practice page stays out of sight while it draws */

/* ---- the payload, read with care: never throws, never trusts a length or a type */
function txt(v){ var s = v == null ? '' : typeof v === 'string' ? v : typeof v === 'number' || typeof v === 'boolean' ? String(v) : ''; return s.length > MAXS ? s.slice(0, MAXS) + '…' : s; }
function readPayload(raw){
  if (!raw || raw.length > MAXB * 4 / 3 + 4 || !/^[A-Za-z0-9_-]+$/.test(raw)) return null;
  try {
    var b64 = raw.replace(/-/g, '+').replace(/_/g, '/'); while (b64.length % 4) b64 += '=';
    var bin = atob(b64); if (bin.length > MAXB) return null;
    var bytes = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    var o = JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(bytes));
    if (!o || typeof o !== 'object' || Array.isArray(o) || o.v !== 1) return null;
    if (typeof o.course !== 'string' || !/^[a-z]+\d+$/.test(o.course) || typeof o.unit !== 'number' || !(o.unit >= 0) || typeof o.seed !== 'string' || !/^[0-9a-f]{32}$/.test(o.seed)) return null;
    if (!Array.isArray(o.parts) || !o.parts.length || o.parts.length > MAXP) return null;
    var parts = [];
    for (var j = 0; j < o.parts.length; j++){
      var p = o.parts[j]; if (!Array.isArray(p) || typeof p[0] !== 'string' || p[0].length > 20) return null;
      var key = p[3]; if (!(typeof key === 'string' || (Array.isArray(key) && key.length <= 50 && key.every(function(k){ return typeof k === 'string'; })))) return null;
      parts.push({id: p[0], answer: p[1] == null ? '' : txt(p[1]), result: ['right', 'almost', 'wrong', 'blank', 'unread'].indexOf(p[2]) >= 0 ? p[2] : 'unread', key: key});
    }
    if (o.scope != null && o.scope !== '' && (typeof o.scope !== 'string' || !/^lesson-[0-9A-Za-z.+-]{1,40}$/.test(o.scope))) return null;
    return {scope: o.scope || '', course: o.course, unit: o.unit, seed: o.seed, cv: o.cv, kit: txt(o.kit), code: txt(o.code).replace(/[^0-9A-Za-z]/g, '').toUpperCase().slice(0, 12),
      points: typeof o.points === 'number' && isFinite(o.points) ? o.points : null, of: typeof o.of === 'number' && isFinite(o.of) ? o.of : null, parts: parts};
  } catch(e){ return null; }
}

/* ---- the page */
var WORDS = {right: 'Right', almost: 'Almost', wrong: 'Not right', blank: 'Blank', unread: 'Can’t read'};
function el(tag, cls, text){ var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
function code4(c){ return c.replace(/(.{4})(?=.)/g, '$1-'); }
function backHref(){ return location.pathname + location.search; }
function keepAddress(){ try { history.replaceState(null, '', backHref() + '#test=' + RAW); } catch(e){} }
function unitName(U){ var t = String(U && U.title || '').replace(/\s*[—-]\s*Teacher copy\s*$/i, '').replace(/\s*Practice Test\s*$/i, ''); return t; }
function shell(U){
  var w = document.getElementById('xShow'); if (w) w.remove();
  w = el('div', 'xshow'); w.id = 'xShow'; w.setAttribute('translate', 'no');
  document.body.appendChild(w); document.body.classList.add('xshow');
  return w;
}
function back(){ var a = el('a', 'xsback', 'Back to the teacher copy'); a.href = backHref(); return a; }
function refuse(U, line){
  var w = shell(U), main = el('main', 'xsheet xsno');
  main.appendChild(el('p', 'xseye', 'Test as drawn'));
  var p = el('p', 'xsline', line); p.setAttribute('role', 'status'); main.appendChild(p);
  main.appendChild(back()); w.appendChild(main);
  document.documentElement.classList.remove('xshowing'); keepAddress();
  window.Kit.ExamShow = {state: 'refused', line: line, cards: []};
}
function sameKey(a, b){ return JSON.stringify(a) === JSON.stringify(b); }
function show(){
  var U = window.Unit, P = readPayload(RAW);
  if (!P) return refuse(U, 'This link doesn’t hold a test.');
  var mu = /^([a-z]+\d+)u(\d+)$/.exec(U.id || ''), here = mu ? mu[1].toUpperCase() + ' Unit ' + mu[2] : 'this unit';
  if (!mu || mu[1] !== P.course || +mu[2] !== P.unit) return refuse(U, 'This link is for ' + P.course.toUpperCase() + ' Unit ' + P.unit + '; this is ' + here + '.');
  var form, items, sheet, keys = {}, EL = window.Kit.ExamLesson;
  if (P.scope && !(EL && EL.lessons().some(function(l){ return l.scope === P.scope; }))) return refuse(U, 'This unit has changed since this test was taken, so its questions can’t be redrawn here. Tally still has every answer and key.');
  try {
    var keysOf = function(){ window.PracticeKit.draw([P.seed], function(seed, ITEMS){ ITEMS.forEach(function(it){ try { keys[it.id] = window.PracticeKit.keyHtml(it); } catch(e){} }); }); };
    if (P.scope){ form = EL.draw(1, P.scope, [P.seed])[0]; EL.withSet(P.scope, [P.seed], keysOf); }
    else { form = window.Kit.ExamPool.draw(1, [P.seed])[0]; keysOf(); }
    items = form.priv.map(function(t){ return window.Kit.unpack(t); }); sheet = window.Kit.ExamPool.sheet(P.seed);
  } catch(e){ return refuse(U, 'This unit has changed since this test was taken, so its questions can’t be redrawn here. Tally still has every answer and key.'); }
  var proved = sheet && items.length === P.parts.length && items.every(function(it, i){ return it.id === P.parts[i].id && sameKey(it.keyText, P.parts[i].key); });
  if (!proved) return refuse(U, 'This unit has changed since this test was taken, so its questions can’t be redrawn here. Tally still has every answer and key.');
  draw(U, P, form, items, sheet, keys);
}
function draw(U, P, form, items, sheet, keys){
  var w = shell(U), main = el('main', 'xsheet');
  var head = el('header', 'xshead'), top = el('div', 'xstop');
  var titles = el('div', 'xstitles');
  titles.appendChild(el('p', 'xseye', 'Test as drawn'));
  var L = P.scope && form.pub && form.pub.lesson, nm = L ? String(L.name || '') : '', cut = nm.indexOf(' · ');   /* a lesson test: "M7 Unit 10 · Lesson 10.03", its title */
  var what = L ? (cut > 0 ? nm.slice(0, cut) : nm) : '', name = (unitName(U) || (P.course.toUpperCase() + ' Unit ' + P.unit)) + (what ? ' · ' + what : '');
  titles.appendChild(el('h1', 'xsh1', name));
  var h1 = document.createElement('div'); h1.innerHTML = L ? form.pub.h1 || '' : U.h1 || ''; var sub = (h1.textContent || '').trim(); if (sub) titles.appendChild(el('p', 'xssub', sub));
  top.appendChild(titles);
  var acts = el('div', 'xsacts'), pr = el('button', 'go xsprint', 'Print'); pr.type = 'button'; pr.addEventListener('click', function(){ window.print(); });
  acts.appendChild(pr); acts.appendChild(back()); top.appendChild(acts); head.appendChild(top);
  var facts = el('dl', 'xsfacts');
  var fact = function(k, v, cls){ var d = el('div', 'xsfact' + (cls ? ' ' + cls : '')); d.appendChild(el('dt', null, k)); d.appendChild(el('dd', null, v)); facts.appendChild(d); };
  if (P.points != null && P.of != null) fact('Score', P.points + ' / ' + P.of + ' points', 'xsscore');
  if (P.code) fact('Code', code4(P.code), 'xscode');
  fact('Questions', String(sheet.length));
  head.appendChild(facts);
  if (P.cv != null && String(P.cv) !== String(U.contentVersion)) head.appendChild(el('p', 'xsnote', 'This unit’s wording may have been edited since this test was taken. Its numbers and keys are the same.'));
  main.appendChild(head);
  /* the cards, as the page drew them, under their sections' names */
  var by = {}; P.parts.forEach(function(p){ by[p.id] = p; });
  var secs = form.pub && form.pub.skel ? form.pub.skel.sections : [], k = 0, list = el('div', 'xscards');
  var cards = [];
  secs.forEach(function(s){
    var sec = el('section', 'xssec'); sec.appendChild(el('h2', 'xssech', String(s.title || '')));
    s.items.forEach(function(){ var html = sheet[k++]; if (html == null) return; var hold = document.createElement('div'); hold.innerHTML = html; var card = hold.firstElementChild; if (!card) return; cards.push(html); sec.appendChild(card); });
    list.appendChild(sec);
  });
  while (k < sheet.length){ var hold = document.createElement('div'); hold.innerHTML = sheet[k]; cards.push(sheet[k]); k++; if (hold.firstElementChild) list.appendChild(hold.firstElementChild); }
  main.appendChild(list); w.appendChild(main);
  /* nothing in a card does anything here: no box, choice, slider or button takes a press or the focus */
  Array.prototype.forEach.call(list.querySelectorAll('input, button, select, textarea, [tabindex], [role=slider], [role=radio], [role=button], a[href]'), function(c){
    if ('disabled' in c && /^(INPUT|BUTTON|SELECT|TEXTAREA)$/.test(c.tagName)) c.disabled = true;
    c.setAttribute('tabindex', '-1'); c.setAttribute('aria-disabled', 'true');
  });
  /* under each part: its verdict, what the student answered, the key */
  items.forEach(function(it){
    var p = by[it.id], host = list.querySelector('[data-host="' + it.id + '"]') || list.querySelector('.q[data-q="' + it.id + '"]'); if (!p || !host) return;
    var row = el('div', 'xsa xs-' + p.result); row.setAttribute('data-xs', it.id);
    row.appendChild(el('span', 'xsv', WORDS[p.result]));
    var a = el('div', 'xsans'); a.appendChild(el('span', 'xsl', 'Answered')); var at = el('span', 'xst' + (p.answer.trim() ? '' : ' xsblank'), p.answer.trim() ? p.answer : 'Blank'); a.appendChild(at); row.appendChild(a);
    var kk = el('div', 'xskey'); kk.appendChild(el('span', 'xsl', 'Key'));
    var kv = el('span', 'xskv');
    if (keys[it.id]) kv.innerHTML = keys[it.id];          /* the page's own key, typeset: the unit's own HTML, never the payload's */
    else kv.textContent = Array.isArray(p.key) ? p.key.join('   ') : p.key;
    kk.appendChild(kv); row.appendChild(kk);
    host.appendChild(row);
  });
  document.title = 'Test as drawn · ' + name + (P.code ? ' · ' + code4(P.code) : '');
  document.documentElement.classList.remove('xshowing'); keepAddress(); window.scrollTo(0, 0);
  window.Kit.ExamShow = {state: 'shown', cards: cards, seed: P.seed, scope: P.scope};
}
/* once the page and its pool are up (ui.js may wait for the approvals first, which here refuse at once) */
(function wait(n){
  var P0 = readPayload(RAW), lesson = !!(P0 && P0.scope);   /* a lesson test waits for exam_lesson.js too (it starts once the pool is up) */
  if (window.PracticeKit && window.PracticeKit.draw && window.Kit.ExamPool && window.Unit && (!lesson || window.Kit.ExamLesson || (n > 40 && !window.Kit.Bank))) return setTimeout(function(){ try { show(); } catch(e){ refuse(window.Unit, 'This test can’t be shown here. Tally still has every answer and key.'); } }, 0);
  if (n < 600) setTimeout(function(){ wait(n + 1); }, 50);
  else refuse(window.Unit, 'This test can’t be shown here. Tally still has every answer and key.');
})(0);
})();
