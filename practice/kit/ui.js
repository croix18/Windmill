/* Practice-test kit: the page. One script for every unit; the unit supplies window.Unit (see kit/README.md).
   Design decisions (Croix, Oct 2026) the kit keeps: one Hint (the step-by-step walkthrough, its picture at the step it
   explains), Show me how after a try, Try another like this, the Practice menu (whole test / one part / my misses),
   right on the first check is a point, Hint or not, and a question solved with the Hint gets a small gray bulb (the Hint
   button's own icon) instead of words; the clock pauses when the page is hidden, no tip box, no footer.
   Apple review (15 Oct 2026) changes are marked [R1-n], [R2-Nn], [J-n] (Jobs lens), [W-n] (Wozniak lens). */
(function(){
'use strict';
var U = window.Unit, K = window.Kit, V = U.view;
var SCHEMA = 2, PRE = U.id + '.';                       /* [W-6] one prefix per unit; versions live inside each record */
var $ = function(id){ return document.getElementById(id); };
var LET = 'ABCDEFGH';
function esc(s){ return String(s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
/* a question solved with the Hint is marked with the Hint's bulb, small and gray, and no words; a count goes beside it where
   questions are counted (Croix, 23 Oct 2026: "a more dignified or subtle way to mark the with help questions. Like I'm not
   trying to discourage the students from using the help button when they need it."). Its "tag" class keeps it one piece in
   the second language: it is copied, never translated. */
function bulb(n){ var t = n == null ? 'Hint used' : 'Hint used: ' + n; return '<span class="tag hu" role="img" aria-label="' + t + '" title="' + t + '">' + (n == null ? '' : n) + '</span>'; }
function load(k){ try { return JSON.parse(localStorage.getItem(PRE + k) || 'null'); } catch(e){ return null; } }
function store(k, v){ try { localStorage.setItem(PRE + k, JSON.stringify(v)); } catch(e){} }
function drop(k){ try { localStorage.removeItem(PRE + k); } catch(e){} }
function randomSeed(){ var a = new Uint32Array(1); try { crypto.getRandomValues(a); } catch(e){ a[0] = Math.floor(Math.random()*4294967296); } return 1 + (a[0] % 99999); }
try { document.documentElement.lang = 'en'; } catch(e){}

/* ------------------------------------------------ the unit's sections, scopes and the link */
var G0 = U.generate(1), NSEC = G0.sections.length;
var SCOPES = { all: 'Whole test' };
G0.sections.forEach(function(s, k){ SCOPES['p' + (k + 1)] = 'Part ' + (k + 1) + ' only: ' + s.title; });
SCOPES.miss = 'My misses, with new numbers';
var HASH = new RegExp('^#set-?(\\d{1,5})(?:-(p\\d{1,2}|miss))?$', 'i');        /* [R2-16] anchored; [W-10] any number of parts */
function fromHash(){ var m = HASH.exec(location.hash || ''); return m && +m[1] >= 1 && (!m[2] || SCOPES[m[2].toLowerCase()]) ? {seed: +m[1], scope: (m[2] || 'all').toLowerCase()} : null; }
function hashOf(sd, sc){ return '#set-' + sd + (sc === 'all' ? '' : '-' + sc); }

/* ------------------------------------------------ saved state [W-6]: one record per set and practice choice */
migrate();
var h0 = fromHash(), last = load('last') || {};
var seed = h0 ? h0.seed : (last.seed || randomSeed()), scope = h0 ? h0.scope : (SCOPES[last.scope] ? last.scope : 'all');
var G, ITEMS, DS, EX = {}, S, HASHV = '', FLASH = {};
function key(){ return 'set.' + seed + '.' + scope; }
function fresh(mode){ return {schema: SCHEMA, cv: U.contentVersion, hash: HASHV, mode: mode || 'practice', ans:{}, res:{}, more:{}, walk:{}, walkOpen:{}, acc:0, startedAt:null, running:false, done:false}; }
function save(){
  if (!S) return;
  S.at = Date.now(); store(key(), S); store('last', {seed: seed, scope: scope}); if (scope === 'all') store('lastAll', seed);
  var idx = (load('idx') || []).filter(function(k){ return k !== key(); }); idx.unshift(key());
  while (idx.length > 25) drop(idx.pop());                                            /* keep the 25 most recent sets */
  store('idx', idx);
}
function misses(){ return load('misses') || {}; }
function migrate(){                                       /* earlier versions of this page kept progress under other names */
  (U.legacy || []).forEach(function(pre){
    try {
      var old = JSON.parse(localStorage.getItem(pre + 'misses') || 'null'), ms = misses(), g = U.generate(1);
      if (old) Object.keys(old).forEach(function(pos){ var x = atPos(g, pos); if (x && famOf(x) === old[pos]) ms[pos] = old[pos]; });
      store('misses', ms);
      var gone = []; for (var i = 0; i < localStorage.length; i++){ var k = localStorage.key(i); if (k && k.indexOf(pre) === 0) gone.push(k); }
      gone.forEach(function(k){ localStorage.removeItem(k); });
    } catch(e){}
  });
}
function seed2(n, t){ return ((n * 7919 + 4243 + (t || 0) * 104729) % 99999) + 1; }
function partsOf(it){ return it.type === 'parts' ? it.parts : it.type === 'solo' ? [it.part] : [it]; }
function posKey(si, ii, pi){ return si + '.' + ii + '.' + pi; }
function famOf(o){ return (o.x || o.part || o.item).fam || 1; }
function round2(){                                         /* the second round never repeats a round-1 question */
  var mine = {}; G.sections.forEach(function(sec){ sec.items.forEach(function(it){ partsOf(it).forEach(function(p){ mine[U.key(p)] = 1; }); }); });
  for (var t = 0; t < 40; t++){
    var g = U.generate(seed2(seed, t)), clash = false;
    g.sections.forEach(function(sec){ sec.items.forEach(function(it){ partsOf(it).forEach(function(p){ if (mine[U.key(p)]) clash = true; }); }); });
    if (!clash) return g;
  }
  return U.generate(seed2(seed, 0));
}
function missRounds(){ return 1; }                        /* [R1-11][closing check] one round, so every label says how many questions it opens */
function build(){
  G = U.generate(seed);
  var out = [];
  if (scope === 'all') G.sections.forEach(function(sec, si){ out.push({title: (si + 1) + '.&nbsp; ' + esc(sec.title), items: sec.items.map(function(it, ii){ return {it: it, keep: null, si: si, ii: ii}; })}); });
  else if (scope === 'miss'){
    var pos = S.pos || [], rounds = missRounds(pos.length) === 1 ? [G] : [G, round2()];
    rounds.forEach(function(R, r){
      var items = [];
      R.sections.forEach(function(sec, si){ sec.items.forEach(function(it, ii){
        var keep = partsOf(it).map(function(p, pi){ return pos.indexOf(posKey(si, ii, it.type === 'parts' ? pi : -1)) >= 0; });
        if (keep.some(Boolean)) items.push({it: it, keep: it.type === 'parts' ? keep : null, si: si, ii: ii});
      }); });
      if (items.length) out.push({title: 'Your misses' + (rounds.length > 1 ? ' — round ' + (r + 1) : ''), items: items});
    });
  } else {
    var k = +scope.slice(1) - 1;
    [G, round2()].forEach(function(R, r){ out.push({title: (k + 1) + '.&nbsp; ' + esc(R.sections[k].title) + ' — round ' + (r + 1), items: R.sections[k].items.map(function(it, ii){ return {it: it, keep: null, si: k, ii: ii}; })}); });
  }
  HASHV = K.fnv1a(out.map(function(s){ return s.items.map(function(d){ return partsOf(d.it).map(function(p, pi){ return d.keep && !d.keep[pi] ? '' : U.key(p); }).join(','); }).join(';'); }).join('|') + '#' + U.contentVersion).toString(36);
  return out;
}

/* ------------------------------------------------ drawing the sheet */
function fig(it){ try { return V.figure(it) || ''; } catch(e){ return ''; } }
function inputHtml(p, id, lab){
  var pre = V.pre(p), unit = V.unit(p), ph = V.placeholder(p);
  return '<div class="ans">' + (pre ? '<span class="pre">' + pre + '</span>' : '') +
    '<input type="text" id="a' + id + '" data-kind="' + esc(p.kind) + '" aria-label="Answer to question ' + lab + '" aria-describedby="ln' + id + '" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="done"' + (ph ? ' placeholder="' + esc(ph) + '"' : '') + '>' +
    (unit ? '<span class="unit">' + esc(unit) + '</span>' : '') + '<button type="button" class="chk" data-check="' + id + '" aria-label="Check ' + lab + '">Check</button><span class="hslot" id="hs' + id + '"></span><span class="pv" aria-hidden="true"></span><span class="rd" id="rd' + id + '" aria-live="polite"></span></div>';
}
function tailHtml(id){
  return '<div class="fb" id="fb' + id + '" aria-live="polite"></div><div class="more" id="mo' + id + '"></div>' +
    '<div class="walk" id="wl' + id + '" hidden></div><div class="steps" id="st' + id + '" tabindex="-1" hidden></div><div class="again" id="ag' + id + '" hidden></div>';
}
function choicesHtml(x, id, lab, multi){
  var q = ['<div class="choices" role="' + (multi ? 'group' : 'radiogroup') + '" aria-labelledby="ln' + id + '">'];
  x.opts.forEach(function(o, k){
    q.push('<label class="ch" id="ch' + id + LET[k] + '"><input type="' + (multi ? 'checkbox' : 'radio') + '" name="q' + id + '" value="' + k + '"><span class="box' + (multi ? ' sq' : '') + '"></span><span class="cl">' + LET[k] + '.</span><span class="cv">' + V.opt(x, k) + '</span></label>');
  });
  q.push('</div><div class="ckrow"><button type="button" class="chk" data-check="' + id + '" aria-label="Check ' + lab + '">Check</button><span class="hslot" id="hs' + id + '"></span></div>' + tailHtml(id));
  return q.join('');
}
function partHtml(p, id, solo, lab, lone){
  var line = solo ? '' : '<div class="line" id="ln' + id + '">' + (p.label && !lone ? '<b class="lab">' + p.label + '.</b>' : '<b class="lab" aria-hidden="true"></b>') + '<span class="st">' + V.line(p) + '</span>' + (p.label ? '<span class="pt">1 pt</span>' : '') + '</div>';
  if (p.kind === 'mc') return '<div class="prt mcp" data-host="' + id + '">' + line + choicesHtml(p, id, lab, false) + '</div>';
  return '<div class="prt' + (solo ? ' solo' : '') + '" data-host="' + id + '">' + line + inputHtml(p, id, lab) + tailHtml(id) + '</div>';
}
function textType(p){ return p.kind === 'mc' ? 'mc' : 'text'; }
function render(){
  DS = build(); ITEMS = []; EX = {};
  var h = [], qn = 0;
  if (!DS.length) h.push('<p class="how">No misses saved on this device yet. Finish a set first, then come back to practice the ones you missed.</p>');
  DS.forEach(function(sec, di){
    var pts = 0;
    var body = sec.items.map(function(d){
      var it = d.it; qn++;
      var q = ['<div class="q" data-q="' + qn + '">'];
      if (it.type === 'parts'){
        q.push('<div class="stem"><b class="num">' + qn + '.</b><span class="st">' + V.stem(it) + '</span></div>' + fig(it));
        var shown = it.parts.filter(function(p, pi){ return !d.keep || d.keep[pi]; }).length, lone = shown === 1 && it.parts.length > 1;
        it.parts.forEach(function(p, pi){ if (d.keep && !d.keep[pi]) return; pts++;
          var id = qn + p.label, sib = pi > 0 && (!d.keep || d.keep[0]) ? qn + it.parts[0].label : null;
          ITEMS.push({id: id, lab: lone ? String(qn) : id, sec: di, type: textType(p), x: p, item: it, pos: posKey(d.si, d.ii, pi), sib: sib, sibPart: pi > 0 ? it.parts[0] : null, aShown: !d.keep || d.keep[0]});
          q.push(partHtml(p, id, false, lone ? String(qn) : id, lone)); });
      } else if (it.type === 'solo'){
        pts++; var id = String(qn); ITEMS.push({id: id, lab: id, sec: di, type: 'text', x: it.part, item: it, pos: posKey(d.si, d.ii, -1), aShown: true});
        q.push('<div class="stem" id="ln' + id + '"><b class="num">' + qn + '.</b><span class="st">' + V.stem(it) + '</span><span class="pt">1 pt</span></div>' + fig(it) + partHtml(it.part, id, true, id));
      } else {
        pts++; var id2 = String(qn), multi = it.type === 'multi';
        ITEMS.push({id: id2, lab: id2, sec: di, type: multi ? 'multi' : 'mc', x: it, item: it, pos: posKey(d.si, d.ii, -1), aShown: true});
        q.push('<div class="stem" id="ln' + id2 + '"><b class="num">' + qn + '.</b><span class="st">' + V.stem(it) + '</span><span class="pt">1 pt</span></div>' + fig(it) + '<div class="mcp" data-host="' + id2 + '">' + choicesHtml(it, id2, id2, multi) + '</div>');
      }
      q.push('</div>'); return q.join('');
    }).join('');
    sec.pts = pts;
    h.push('<section class="part" id="sec' + di + '"><div class="sechead"><h2>' + sec.title + '</h2><span class="pts" id="sp' + di + '">' + pts + ' point' + (pts === 1 ? '' : 's') + '</span></div>' + body + '</section>');
  });
  $('paper').innerHTML = h.join('');
  $('setno').textContent = seed; $('setin').value = seed;
  $('total').textContent = ITEMS.length + ' point' + (ITEMS.length === 1 ? '' : 's');
  paintScopes();
  Object.keys(S.more || {}).forEach(function(id){ var b = byIdBase(id); if (b) mountExtra(b); });
}
function paintScopes(){
  var sc = $('scope'), nm = Object.keys(misses()).length;
  sc.innerHTML = Object.keys(SCOPES).map(function(k){
    var lab = SCOPES[k] + (k === 'miss' && nm ? ' (' + nm + ')' : '');      /* how many when there are; no "(none yet)" aside (21 Oct 2026) */
    return '<option value="' + k + '"' + (k === scope ? ' selected' : '') + (k === 'miss' && !nm && scope !== 'miss' ? ' disabled' : '') + '>' + esc(lab) + '</option>'; }).join('');
}

/* ------------------------------------------------ "Try another like this": the same kind of question, new numbers */
function atPos(g, pos){
  var p = pos.split('.').map(Number), sec = g.sections[p[0]], it = sec && sec.items[p[1]]; if (!it) return null;
  if (it.type === 'parts'){ var pt = it.parts[p[2]]; return pt ? {type: textType(pt), part: pt, x: pt, item: it} : null; }
  if (it.type === 'solo') return {type: 'text', part: it.part, x: it.part, item: it};
  return {type: it.type === 'multi' ? 'multi' : 'mc', x: it, item: it};
}
function mountExtra(base){
  var M0 = S.more[base.id]; if (!M0) return;
  var a = atPos(U.generate(M0.seed), base.pos), id = base.id + 'x' + M0.n, it = a.item, h;
  EX[id] = {id: id, lab: base.lab + ' (another)', type: a.type, x: a.x, item: it, base: base.id, extra: true, pos: base.pos, aShown: false};
  var head = '<div class="xq q" data-q="' + id + '"><div class="xhead"><span class="xt">Try another like this</span><span id="xs' + id + '">' + streakHtml(M0) + '</span></div><div class="stem" id="' + (it.type === 'parts' ? 'lx' : 'ln') + id + '"><span class="st">' + V.stem(it) + '</span></div>' + fig(it);
  if (it.type === 'parts') h = head + partHtml(Object.assign({}, a.x, {label: ''}), id, false, EX[id].lab, true) + '</div>';
  else if (it.type === 'solo') h = head + partHtml(a.x, id, true, EX[id].lab) + '</div>';
  else h = head + '<div class="mcp" data-host="' + id + '">' + choicesHtml(it, id, EX[id].lab, it.type === 'multi') + '</div></div>';
  var box = $('ag' + base.id); box.innerHTML = h; box.hidden = false;
  restoreOne(EX[id]); paintItem(EX[id]);
}
function streakHtml(M0){ return M0.streak >= 2 ? ' <span class="streak">✓✓ ' + M0.streak + ' in a row — you’ve got this one</span>' : M0.streak === 1 ? ' <span class="streak">✓ one in a row</span>' : ''; }
function another(baseId){
  var M0 = S.more[baseId] || (S.more[baseId] = {n: 0, seed: 0, streak: 0});
  M0.n++; var s, b0 = byId(baseId), was = M0.seed ? U.key(atPos(U.generate(M0.seed), b0.pos).x) : null, base = U.key(b0.x), tries = 0, k;
  do { s = randomSeed(); tries++; k = U.key(atPos(U.generate(s), b0.pos).x); } while ((s === seed || k === base || k === was) && tries < 60);   /* never the same question again */
  M0.seed = s; save();
  mountExtra(b0); paintItem(b0);
  var nid = baseId + 'x' + M0.n, inp = $('a' + nid) || document.querySelector('input[name="q' + nid + '"]');
  var el = $('ag' + baseId); if (el && el.scrollIntoView) el.scrollIntoView({block: 'nearest'});
  if (inp) inp.focus({preventScroll: true});                                           /* [R1-2] */
}

/* ------------------------------------------------ marking and coaching */
function byIdBase(id){ for (var i = 0; i < ITEMS.length; i++) if (ITEMS[i].id === id) return ITEMS[i]; return null; }
function byId(id){ return byIdBase(id) || EX[id] || null; }
function answered(it){ var a = S.ans[it.id]; return it.type === 'multi' ? !!(a && a.length) : a != null && String(a).trim() !== ''; }
function ctxOf(it){ return it.sib ? {prev: S.ans[it.sib], prevPart: it.sibPart, aShown: it.aShown} : {aShown: it.aShown}; }
function judgeAns(it, a, tries){
  if (it.type === 'multi' ? !(a && a.length) : (a == null || String(a).trim() === '')) return {v: 'blank', what: []};
  try {
    if (it.type === 'text') return U.judge.text(it.x, a, ctxOf(it));
    if (it.type === 'mc') return U.judge.mc(it.x, +a);
    return U.judge.multi(it.x, a, (tries || 0) + 1);
  } catch(e){ return {v: 'unread', what: ['I can’t read that yet. Type just your answer.']}; }
}
function judge(it, tries){ return judgeAns(it, S.ans[it.id], tries); }
function res(it){ return S.res[it.id] || (S.res[it.id] = {tries: 0, first: null, v: null, shown: false, hinted: false, steps: 0}); }
function plainText(h){ var d = document.createElement('div'); d.innerHTML = h; return d.textContent; }
function sameAns(a, b){ return JSON.stringify(a == null ? '' : a) === JSON.stringify(b == null ? '' : b); }
function record(it, f, late){
  var R = res(it);
  if (R.v === 'right') return R;
  R.tries++; R.v = f.v; R.lastAns = S.ans[it.id];
  if (R.first === null){ R.first = (f.v === 'right'); R.helped = R.first && !!R.hinted; if (late) R.late = true; }   /* right on the first check counts, help or not; help is tallied */
  if (it.extra){
    var M0 = S.more[it.base];
    if (f.v === 'right'){ M0.streak = (R.first && !R.hinted) ? M0.streak + 1 : 0; if (M0.streak >= 2){ var ms = misses(); delete ms[it.pos]; store('misses', ms); } }
    else if (R.tries === 1) M0.streak = 0;
  } else if (R.tries === 1){
    var ms2 = misses();
    if (R.first === true && !R.hinted) delete ms2[it.pos]; else ms2[it.pos] = famOf(it);
    store('misses', ms2);
  }
  return R;
}
function check(id){
  var it = byId(id); if (!it) return;
  if (S.mode === 'test' && !S.done && !it.extra) return;
  var R0 = S.res[it.id];
  if (R0 && R0.v && R0.v !== 'right' && sameAns(R0.lastAns, S.ans[it.id])){ paintItem(it); return; }   /* [R1-10] the same answer again is not another try */
  var f = judge(it, R0 ? R0.tries : 0);
  if (f.v === 'blank' || f.v === 'unread'){ flash(it, f); return; }
  if (!S.running && !S.done && !it.extra) start();
  delete FLASH[it.id];
  record(it, f); save(); paintItem(it); paintScore();
  if (it.extra){ var hd = $('xs' + it.id); if (hd) hd.innerHTML = streakHtml(S.more[it.base]); }
  if (f.v === 'right'){ var nx = document.querySelector('[data-next="' + it.id + '"]') || $('mo' + it.id).querySelector('button') || $('fb' + it.id); if (nx){ if (!nx.matches('button')) nx.setAttribute('tabindex', '-1'); nx.focus({preventScroll: true}); } }   /* [J-5][R2-2] focus the one next action, never jump */
}
var TAG = {right: '<span class="tag ok">✓ Correct</span>', form: '<span class="tag fm">Almost</span>', wrong: '<span class="tag no">✗ Not yet</span>', unread: '<span class="tag fm">Not counted yet</span>'};
function flash(it, f){
  FLASH[it.id] = 1;
  $('fb' + it.id).innerHTML = f.v === 'blank' ? '<div class="fbx"><p>' + (it.type === 'text' ? 'Type an answer first.' : 'Pick an answer first.') + '</p></div>'
    : '<div class="fbx"><p>' + TAG.unread + ' ' + (f.what[0] || '') + '</p></div>';
}
function cardHtml(it, R, f){
  var v = R.v;
  if (v === 'right'){
    var line = R.late ? '✓ Correct — checked at Finish' : R.first ? '✓ Correct on the first try' : R.shown ? '✓ Correct after seeing the steps' : '✓ Correct on try ' + R.tries;   /* [J-5] */
    var note = f && f.v === 'right' && f.what && f.what.length ? '<p class="note2">' + f.what.join(' ') + '</p>' : '';
    return '<div class="fbx"><p><span class="tag ok">' + line + '</span>' + (R.first && R.hinted && !R.late ? ' ' + bulb() : '') + '</p>' + note + '</div>';
  }
  f = R.unreadMsg ? {what: [R.unreadMsg], rule: ''} : (f || {what: []});
  var w = (f.what || []).map(function(x){ return S.walkOpen[it.id] ? String(x).replace(/,? or tap Hint to go one step at a time\./, '.').replace(/ Tap Hint[^.]*\./, '') : x; }), tag = TAG[v] || '';
  var body = w.length > 1 ? '<p>' + tag + '</p><ul>' + w.map(function(x){ return '<li>' + x + '</li>'; }).join('') + '</ul>' : '<p>' + tag + (w.length ? ' ' + w[0] : '') + '</p>';   /* [J-4] tag and diagnosis on one line */
  if (v === 'wrong' && f.rule) body += '<p class="rule"><b>Next time:</b> ' + f.rule + '</p>';
  return '<div class="fbx">' + body + '</div>';
}
function keyHtml(it){
  if (it.type === 'mc') return '<b>' + LET[it.x.correct] + '.</b> ' + V.opt(it.x, it.x.correct);
  if (it.type === 'multi') return it.x.correct.map(function(k){ return '<b>' + LET[k] + '.</b> ' + V.opt(it.x, k); }).join('&nbsp;&nbsp; ');
  return V.key(it.x);
}
function solOf(it){ try { return U.solution(it.x, it.type); } catch(e){ return null; } }
function picOf(it){ try { return V.picture(it.x, it.type) || ''; } catch(e){ return ''; } }
function stepsHtml(it, R){
  var sol = solOf(it), n = sol ? sol.length : 0, shown = Math.min(R.steps || 0, n);
  var pic = (shown >= n || R.v === 'right') ? picOf(it) : '';
  var h = '<div class="sthead">Show me how</div>' + (pic ? '<details class="why"' + (R.pic === false ? '' : ' open') + ' data-pic="' + it.id + '"><summary>See why it works</summary>' + pic + '</details>' : '');
  if (!sol) return h + '<div class="key"><span class="kl">Answer</span><span class="kv">' + keyHtml(it) + '</span></div>';
  var f = R.v && R.v !== 'right' ? lastFeedback(it) : null, off = f && f.step != null ? f.step : -1;
  var st = V.start(it.x, it.type); if (st) h += '<div class="solhead"><span class="kl">Start</span> ' + st + '</div>';
  h += '<ol class="sol">' + sol.slice(0, shown).map(function(s, i){
    return '<li class="' + (i === off ? 'off' : '') + '"><div class="say">' + s.say + '</div>' + (s.ex ? '<div class="ex">' + V.ex(it.x, s.ex, it.type) + '</div>' : '') +
      (i === off ? '<div class="offnote">⟵ This is the step where your answer went off.</div>' : '') + '</li>';
  }).join('') + '</ol>';
  if (shown >= n) h += '<div class="key"><span class="kl">Answer</span><span class="kv">' + keyHtml(it) + '</span></div>';
  return h;
}
function lastFeedback(it){ var R = S.res[it.id]; return R && R.v ? judgeAns(it, R.lastAns, R.tries - 1) : null; }   /* [W-6] recomputed, never stored */
function hostOf(it){ return document.querySelector('[data-host="' + it.id + '"]'); }
function nextOpen(it){                                      /* the next part not yet right, after this one */
  var list = ITEMS, i = list.indexOf(it.extra ? byId(it.base) : it);
  for (var k = i + 1; k < list.length; k++){ var R = S.res[list[k].id]; if (!R || R.v !== 'right') return list[k]; }
  return null;
}
function paintItem(it){
  var host = hostOf(it); if (!host) return;
  var R = S.res[it.id], fb = $('fb' + it.id), mo = $('mo' + it.id), st = $('st' + it.id), wl = $('wl' + it.id);
  var testHidden = S.mode === 'test' && !S.done && !it.extra;
  ['is-right','is-wrong','is-form'].forEach(function(c){ host.classList.remove(c); });
  if (testHidden){ if (!FLASH[it.id]) fb.innerHTML = ''; mo.innerHTML = ''; var hs0 = $('hs' + it.id); if (hs0) hs0.innerHTML = ''; st.hidden = true; wl.hidden = true; paintChoices(it, null); return; }
  var sol = solOf(it), n = sol ? sol.length : 1;
  R = R || {tries: 0, v: null, steps: 0};
  if (R.v) host.classList.add(R.v === 'right' ? 'is-right' : R.v === 'form' ? 'is-form' : 'is-wrong');
  if (R.v){ fb.innerHTML = cardHtml(it, R, lastFeedback(it)); delete FLASH[it.id]; } else if (!FLASH[it.id]) fb.innerHTML = '';
  var b = [], all = (R.steps || 0) >= n, walkOn = S.walkOpen[it.id] && R.v !== 'right';
  if (R.v === 'right'){
    var nx = it.extra ? null : nextOpen(it);
    if (nx) b.push('<button type="button" class="go" data-next="' + it.id + '" data-to="' + nx.id + '" aria-label="Next: question ' + nx.lab + '">Next ↓</button>');
    if (!all) b.push('<button type="button" data-all="' + it.id + '" aria-label="Show me how for ' + it.lab + '">Show me how</button>');
  } else {
    if (!all && !walkOn && walkOf(it)) b.push('<button type="button" data-walk="' + it.id + '" aria-label="Hint for ' + it.lab + '">Hint</button>');   /* [J-3] least help first; no Hint once the steps are open */
    if (!all && (R.tries > 0 || S.done)) b.push('<button type="button" data-all="' + it.id + '" aria-label="Show me how for ' + it.lab + '">Show me how</button>');
  }
  var missed = (R.v && R.v !== 'right') || R.shown || (R.v === 'right' && R.first === false);
  if (!it.extra && missed && !S.more[it.id]) b.push('<button type="button" class="' + (R.v === 'right' || all ? 'go' : '') + '" data-another="' + it.id + '">Try another like this</button>');
  if (it.extra && R.v === 'right') b.push('<button type="button" class="go" data-another="' + it.base + '">Try another like this</button>');
  var hs = $('hs' + it.id), hintOnly = b.length === 1 && /data-walk=/.test(b[0]) && !R.v && !(R.tries > 0);   /* [D-8] before any try the Hint sits beside Check, not on a row of its own */
  if (hs) hs.innerHTML = hintOnly ? b[0] : '';
  mo.innerHTML = hintOnly ? '' : b.join('');
  st.hidden = !(R.steps > 0); if (R.steps > 0) st.innerHTML = stepsHtml(it, R);
  wl.hidden = !walkOn; if (walkOn) wl.innerHTML = walkHtml(it);
  paintChoices(it, R.v ? R : null);
  var input = $('a' + it.id); if (input){ input.readOnly = R.v === 'right'; if (R.v === 'right' && keys.target === input) hideKeys(); }
  var btn = host.querySelector('[data-check="' + it.id + '"]'); if (btn) btn.disabled = R.v === 'right';
  /* a right answer locks this question's own choices — not the "Try another" mounted inside its box (23 Oct 2026: a
     student who got a select-all right on her second try asked for another; it opened locked, and she could not touch it) */
  if (it.type !== 'text') Array.prototype.forEach.call(host.querySelectorAll('.ch input'), function(x){ if (x.closest('[data-host]') === host) x.disabled = R.v === 'right'; });
}
function paintChoices(it, R){
  if (it.type === 'text') return;
  it.x.opts.forEach(function(o, k){
    var ch = $('ch' + it.id + LET[k]); if (!ch) return; ch.classList.remove('picked-no', 'is-key');
    if (!R) return;
    var sol = solOf(it), all = sol && R.steps >= sol.length;
    var picked = it.type === 'mc' ? String(R.lastAns) === String(k) : (R.lastAns || []).map(Number).indexOf(k) >= 0;
    var isKey = it.type === 'mc' ? k === it.x.correct : it.x.correct.indexOf(k) >= 0;
    if (R.v === 'right' || all){ if (isKey) ch.classList.add('is-key'); }
    else if (picked && it.type === 'mc' && R.v === 'wrong') ch.classList.add('picked-no');
  });
}
function paintSections(){                                  /* [J-5] each section counts up as the student works */
  if (!DS) return;
  DS.forEach(function(sec, di){
    var el = $('sp' + di); if (!el) return;
    var its = ITEMS.filter(function(x){ return x.sec === di; }), done = its.filter(function(x){ var R = S.res[x.id]; return R && R.v === 'right'; }).length;
    el.textContent = (S.mode === 'test' && !S.done) || (!done && !S.done) ? sec.pts + ' point' + (sec.pts === 1 ? '' : 's') : done + ' / ' + sec.pts + (done === sec.pts ? ' ✓' : '');
    el.classList.toggle('alldone', done === sec.pts);
  });
}

/* ------------------------------------------------ the Hint: the question as a few small questions, one at a time */
function walkPic(it, lead){ var p = picOf(it); return p ? '<div class="wpic"><div class="wpl">' + lead + '</div>' + p + '</div>' : ''; }
function walkOf(it){ try { return U.walk(it.x, it.type); } catch(e){ return null; } }
function wstate(it){ return S.walk[it.id] || (S.walk[it.id] = {i: 0, wrong: {}, typed: {}, bad: {}, miss: {}, gave: {}}); }
function walkHtml(it){
  var st = walkOf(it); if (!st) return '';
  var W = wstate(it); W.miss = W.miss || {}; W.gave = W.gave || {};
  var h = '<div class="wkhead"><b>Hint' + (W.i < st.length ? ' · step ' + (W.i + 1) + ' of ' + st.length : '') + '</b><button type="button" class="wclose" data-wclose="' + it.id + '" aria-label="Close the hint for ' + it.lab + '">Close</button></div>';   /* [J-7] */
  var s0 = V.start(it.x, it.type); if (s0) h += '<div class="solhead"><span class="kl">Start</span> ' + s0 + '</div>';
  h += '<ol class="wsteps">';
  st.forEach(function(s, k){
    if (k > W.i) return;
    var cur = k === W.i;
    h += '<li class="' + (cur ? 'cur' : 'done') + '"><div class="wask">' + s.ask + '</div>';
    if (!cur){
      var got = s.type === 'choice' ? s.opts.filter(function(o){ return o.ok; })[0].label : V.got(s);
      h += '<div class="wgot"><span class="wok">✓</span> ' + got + (W.gave[k] ? ' <span class="wgave">(shown)</span>' : '') + '</div>';
      if (s.then) h += '<div class="ex">' + V.ex(it.x, s.then, it.type) + '</div>';
    } else if (s.type === 'choice'){
      h += '<div class="wopts">' + s.opts.map(function(o, j){ var bad = W.wrong[k + '.' + j];
        return '<button type="button" class="wopt' + (bad ? ' bad' : '') + '" data-wopt="' + it.id + '|' + k + '|' + j + '"' + (bad ? ' disabled' : '') + '>' + o.label + '</button>'; }).join('') + '</div>';
      if (W.bad[k] != null) h += '<div class="wwhy"><span class="wno">✗</span> ' + s.opts[W.bad[k]].why + '</div>' + (s.pic ? walkPic(it, 'Here is a picture of why:') : '');
    } else {
      h += '<div class="wnum"><input type="text" id="wn' + it.id + '" autocomplete="off" autocapitalize="off" spellcheck="false" value="' + esc(W.typed[k] || '') + '" aria-label="Your answer to this step"><button type="button" class="go" data-wnum="' + it.id + '">Check</button></div>';
      if (W.bad[k] === 'read') h += '<div class="wwhy"><span class="wq">?</span> Type just a number, like 12 or 28.26.</div>';
      else if (W.bad[k] != null) h += '<div class="wwhy"><span class="wno">✗</span> Not quite. ' + s.hint + '</div>' + (s.pic ? walkPic(it, 'Here is a picture that shows it:') : '');
      if ((W.miss[k] || 0) >= 2) h += '<div class="wgive"><button type="button" data-wgive="' + it.id + '">Show this step</button></div>';   /* [R1-3] never a dead end */
    }
    h += '</li>';
  });
  h += '</ol>';
  if (W.i >= st.length && picOf(it)) h += '<details class="why" open><summary>See why it works</summary>' + picOf(it) + '</details>';
  if (W.i >= st.length) h += '<p class="wfin done">' + keyHtml(it) + '</p>';
  return h;
}
function walkFocus(it){
  var wl = $('wl' + it.id); if (!wl) return;
  var t = wl.querySelector('li.cur .wopt:not([disabled])') || wl.querySelector('#wn' + it.id) || wl.querySelector('.wclose');
  if (t) t.focus({preventScroll: true});
}
function walkStart(it){ var R = res(it); if (R.tries === 0 && R.v !== 'right' && (!S.done || it.extra)) R.hinted = true; S.walkOpen[it.id] = true; wstate(it); if (!S.running && !S.done && !it.extra) start(); save(); paintItem(it); paintScore(); walkFocus(it); }
function walkPick(id, k, j){ var it = byId(id), st = walkOf(it), W = wstate(it), s = st[k]; if (k !== W.i) return;
  if (s.opts[j].ok){ W.i++; delete W.bad[k]; } else { W.wrong[k + '.' + j] = 1; W.bad[k] = j; }
  save(); paintItem(it); walkFocus(it); }
function walkNum(id){ var it = byId(id), st = walkOf(it), W = wstate(it), s = st[W.i]; if (!s || s.type !== 'num') return;
  var el = $('wn' + id), v = U.readNum(el.value); W.typed[W.i] = el.value; W.miss = W.miss || {};
  if (v && U.numOk(s, v)){ delete W.bad[W.i]; W.i++; }
  else { W.bad[W.i] = v ? 1 : 'read'; if (v) W.miss[W.i] = (W.miss[W.i] || 0) + 1; }
  save(); paintItem(it); walkFocus(it); }
function walkGive(id){ var it = byId(id), W = wstate(it); W.gave = W.gave || {}; W.gave[W.i] = 1; delete W.bad[W.i]; W.i++; save(); paintItem(it); walkFocus(it); }

/* ------------------------------------------------ clicks */
document.addEventListener('click', function(e){
  var t = e.target && e.target.closest ? e.target : null; if (!t) return;
  var b = t.closest('[data-check]'); if (b){ check(b.dataset.check); return; }
  var a = t.closest('[data-all]');
  if (a){ var it2 = byId(a.dataset.all), R2 = res(it2), sol2 = solOf(it2);
    R2.steps = sol2 ? sol2.length : 1; S.walkOpen[it2.id] = false;
    if (R2.v !== 'right'){ R2.shown = true; if (R2.first === null) R2.first = false; }
    if (!S.running && !S.done && !it2.extra) start();
    save(); paintItem(it2); paintScore(); var stp = $('st' + it2.id); if (stp) stp.focus({preventScroll: true}); return; }
  var nx = t.closest('[data-next]'); if (nx){ var to = byId(nx.dataset.to), host = to && hostOf(to);
    if (host){ host.scrollIntoView({block: 'center', behavior: 'smooth'}); var f = $('a' + to.id) || host.querySelector('.ch input'); if (f) f.focus({preventScroll: true}); } return; }
  var an = t.closest('[data-another]'); if (an){ another(an.dataset.another); return; }
  var wa = t.closest('[data-walk]'); if (wa){ walkStart(byId(wa.dataset.walk)); var wl = $('wl' + wa.dataset.walk); if (wl && wl.scrollIntoView) wl.scrollIntoView({block: 'nearest'}); return; }
  var wo = t.closest('[data-wopt]'); if (wo){ var pr = wo.dataset.wopt.split('|'); walkPick(pr[0], +pr[1], +pr[2]); return; }
  var wn = t.closest('[data-wnum]'); if (wn){ walkNum(wn.dataset.wnum); return; }
  var wg = t.closest('[data-wgive]'); if (wg){ walkGive(wg.dataset.wgive); return; }
  var wc = t.closest('[data-wclose]'); if (wc){ var itc = byId(wc.dataset.wclose); S.walkOpen[itc.id] = false; save(); paintItem(itc); var hb = document.querySelector('[data-walk="' + itc.id + '"]'); if (hb) hb.focus({preventScroll: true}); return; }
  var jm = t.closest('[data-jump]'); if (jm){ var ji = byId(jm.dataset.jump), jh = ji && hostOf(ji); if (jh){ jh.scrollIntoView({block: 'center'}); var jf = $('a' + ji.id) || jh.querySelector('.ch input'); if (jf) jf.focus({preventScroll: true}); } return; }
  var nw = t.closest('[data-new]'); if (nw){ var sc = nw.dataset.scope || scope;
    var go = function(){ goSet(randomSeed(), sc, 'practice'); };                     /* [R2-N2] the results' buttons always practise with checking */
    if (started() && !S.done) ask('Leave this set? It stays saved on this device.', 'Leave', go); else go(); return; }
});
document.addEventListener('toggle', function(e){ var d = e.target; if (d && d.dataset && d.dataset.pic){ var it = byId(d.dataset.pic); if (it){ res(it).pic = d.open; save(); } } }, true);

/* ------------------------------------------------ typing */
var keys = document.createElement('div'); keys.className = 'keys'; keys.hidden = true;
(U.keypad || []).forEach(function(k){ var b = document.createElement('button'); b.type = 'button'; b.textContent = k.label; if (k.kinds) b.dataset.kinds = k.kinds.join(' '); b.tabIndex = -1; b.setAttribute('aria-label', 'Insert ' + (k.say || k.label)); b.dataset.k = k.label; keys.appendChild(b); });   /* [R1-9] not a tab stop */
keys.addEventListener('pointerdown', function(e){ if (e.target.dataset.k) e.preventDefault(); });
keys.addEventListener('click', function(e){
  var lab = e.target.dataset.k, el = keys.target; if (!lab || !el || el.readOnly) return;
  var k = (U.keypad || []).filter(function(x){ return x.label === lab; })[0], ins = k.ins ? k.ins(el.dataset.kind) : lab, a = el.selectionStart, b = el.selectionEnd;
  if (a == null){ a = b = el.value.length; }
  el.value = el.value.slice(0, a) + ins + el.value.slice(b); el.focus(); try { el.setSelectionRange(a + ins.length, a + ins.length); } catch(x){}
  el.dispatchEvent(new Event('input', {bubbles: true}));
});
function setPreview(el){ var pv = el.parentNode.querySelector('.pv'); if (!pv) return; var p = ''; try { p = V.pretty(el.value, el.dataset.kind) || ''; } catch(e){} pv.innerHTML = p; }
/* the keypad moves to the box being typed in and otherwise stays where it is: hiding it when a button takes focus moved
   the page under the finger, so the tap missed (found in the kit's page check). When it moves, the page is scrolled by
   the same amount, so the box just tapped stays put under the finger [R1-9]. */
document.addEventListener('focusin', function(e){
  var t = e.target;
  if (!(t.matches && t.matches('#paper input[type=text]') && !t.readOnly && !(t.id && t.id.indexOf('wn') === 0) && (U.keypad || []).length)) return;
  if (keys.target === t && !keys.hidden) return;
  /* only the keys this kind of answer uses (a unit's keypad entry may name its kinds); none → no keypad */
  var kind = t.dataset.kind || '', shown = 0;
  Array.prototype.forEach.call(keys.children, function(b){ var ks = b.dataset.kinds; b.hidden = !!ks && ks.split(' ').indexOf(kind) < 0; if (!b.hidden) shown++; });
  if (!shown){ hideKeys(); keys.target = null; return; }
  var y0 = t.getBoundingClientRect().top;
  var row = t.closest('.ans') || t.parentNode; keys.target = t; row.parentNode.insertBefore(keys, row); keys.hidden = false;
  var dy = t.getBoundingClientRect().top - y0; if (dy) window.scrollBy(0, dy);
});
function hideKeys(){ if (keys.hidden) return; var a = document.activeElement, y0 = a && a.getBoundingClientRect ? a.getBoundingClientRect().top : null; keys.hidden = true; if (y0 != null){ var dy = a.getBoundingClientRect().top - y0; if (dy) window.scrollBy(0, dy); } }
document.addEventListener('input', function(e){
  var t = e.target;
  if (!t.id || t.id.charAt(0) !== 'a' || !t.closest('#paper')) return;
  var it = byId(t.id.slice(1)); if (!it) return;
  if (!S.running && !S.done && !it.extra) start();
  S.ans[it.id] = t.value; setPreview(t);
  if (FLASH[it.id]){ delete FLASH[it.id]; paintItem(it); }                                /* [R1-1] the old note goes when they type */
  var rd = $('rd' + it.id); if (rd) rd.textContent = '';
  save(); paintProgress(); paintScore(true);
});
document.addEventListener('change', function(e){
  var t = e.target;
  if (t.id && t.id.charAt(0) === 'a' && t.closest('#paper') && S.mode === 'test' && !S.done){       /* [W-7] test mode: say only "can't read this yet", nothing about right or wrong */
    var it0 = byId(t.id.slice(1)); if (it0 && !it0.extra){ var f0 = judge(it0, 0), rd = $('rd' + it0.id); if (rd) rd.innerHTML = f0.v === 'unread' ? '<span class="kl">Can’t read this yet:</span> ' + esc(plainText(f0.what[0] || '')) : ''; }
  }
  if (!t.name || t.name.charAt(0) !== 'q' || !t.closest('#paper')) return;
  var id = t.name.slice(1), it = byId(id); if (!it) return;
  if (!S.running && !S.done && !it.extra) start();
  if (t.type === 'radio') S.ans[id] = t.value;
  else S.ans[id] = Array.prototype.map.call(document.querySelectorAll('input[name="q' + id + '"]:checked'), function(x){ return x.value; });
  if (FLASH[id]){ delete FLASH[id]; paintItem(it); }
  save(); paintProgress(); paintScore();
});
document.addEventListener('keydown', function(e){
  if (e.key === 'Escape' && !$('confirm').hidden){ closeAsk(); var bf = $('bFinish'); if (bf) bf.focus(); return; }
  if (e.key === 'Enter' && e.target.id && e.target.id.indexOf('wn') === 0){ e.preventDefault(); walkNum(e.target.id.slice(2)); return; }
  if (e.key === 'Enter' && e.target.matches && e.target.matches('#paper input[type=text]')){ e.preventDefault(); var it = byId(e.target.id.slice(1)); if (it && (S.mode === 'practice' || S.done || it.extra)) check(it.id); }
});

/* ------------------------------------------------ the clock and the score */
function now(){ return Date.now(); }
function elapsed(){ return S.acc + (S.running && S.startedAt ? (now() - S.startedAt) / 1000 : 0); }
function fmt(s){ s = Math.max(0, Math.floor(s)); var m = Math.floor(s / 60), r = s % 60; return m + ':' + (r < 10 ? '0' : '') + r; }   /* [R2-N8] whole seconds */
function start(){ if (S.running || S.done) return; S.running = true; S.startedAt = now(); save(); paintBar(); }
function pause(){ if (!S.running) return; S.acc = elapsed(); S.running = false; S.startedAt = null; save(); paintBar(); }
function tally(){
  var first = 0, helped = 0, done = 0, bySec = DS.map(function(){ return {got: 0, of: 0, help: 0}; });
  ITEMS.forEach(function(it){ var R = S.res[it.id]; bySec[it.sec].of++; if (R && R.first === true){ first++; bySec[it.sec].got++; if (R.helped){ helped++; bySec[it.sec].help++; } } if (R && R.v === 'right') done++; });
  return {first: first, helped: helped, done: done, bySec: bySec};
}
function paintProgress(){ var n = ITEMS.filter(answered).length; $('prog').style.width = (ITEMS.length ? 100 * n / ITEMS.length : 0) + '%'; return n; }
function paintScore(light){
  var t = tally(), sc = $('score'), N = ITEMS.length, nb = function(s){ return '<span class="nw">' + s + '</span>'; };
  if (S.mode === 'test' && !S.done) sc.innerHTML = nb('<b>' + ITEMS.filter(answered).length + ' of ' + N + '</b> answered') + ' · ' + nb('marked when you finish');
  else if (!Object.keys(S.res).length && !S.done) sc.innerHTML = nb('<b>' + N + '</b> part' + (N === 1 ? '' : 's') + ' to answer');
  else sc.innerHTML = nb('<b>' + t.first + '</b> right first try') + (t.helped ? bulb(t.helped) : '') + ' · ' + nb('<b>' + t.done + '</b> of ' + N + ' done');   /* [J-2] */
  if (light) return;
  paintResult(t); paintScopes(); paintSections();
}
function paintBar(){
  $('time').textContent = fmt(elapsed());
  var started0 = elapsed() > 0;
  $('bPause').hidden = S.done || !S.running;                                             /* [J-2] Pause only while it runs */
  $('bResume').hidden = S.done || S.running || !started0;
  $('bFinish').hidden = S.done || !ITEMS.length;
  $('bFinish').textContent = S.mode === 'test' ? 'Finish & mark' : 'Finish';
  document.body.classList.toggle('hidechk', S.mode === 'test' && !S.done);
  Array.prototype.forEach.call(document.querySelectorAll('.mode button'), function(b){ b.setAttribute('aria-pressed', String(b.dataset.mode === S.mode)); });
}
function hist(){ return load('hist') || {}; }
function paintResult(t){
  var box = $('result');
  if (!S.done){ box.hidden = true; return; }
  var N = ITEMS.length, test = S.mode === 'test';
  var rows = DS.map(function(s, k){ return '<tr><td>' + s.title + '</td><td class="r">' + t.bySec[k].got + ' / ' + t.bySec[k].of + '</td>' + (test ? '' : '<td class="r">' + t.bySec[k].help + '</td>') + '</tr>'; }).join('');
  var notYet = ITEMS.filter(function(it){ var R = S.res[it.id]; return !R || R.v !== 'right'; });
  var weak = {}; DS.forEach(function(s, k){ if (scope === 'all' && t.bySec[k].of && t.bySec[k].got / t.bySec[k].of < 0.8) weak[k] = 1; });
  var nm = Object.keys(misses()).length, perfect = t.first === N && N > 0, alone = perfect && !t.helped;
  var btns = perfect ? '<button type="button" class="go" data-new="1" data-scope="all">New whole test</button>'
    : (nm ? '<button type="button" class="go" data-new="1" data-scope="miss">Practice my misses (' + nm + ')</button>' : '') +
      Object.keys(weak).map(function(k){ return '<button type="button" data-new="1" data-scope="p' + (+k + 1) + '">Practice Part ' + (+k + 1) + '</button>'; }).join('') +
      '<button type="button"' + (nm ? '' : ' class="go"') + ' data-new="1" data-scope="all">New whole test</button>';
  var hk = scope + '.' + S.mode, H = hist()[hk] || [], prev = H.filter(function(x){ return !(x.seed === seed && x.at === S.finishedAt); })[0];
  var lastLine = prev ? '<p class="last">Last time: ' + prev.first + ' / ' + prev.of + ' in ' + fmt(prev.time) + '. Today: ' + t.first + ' / ' + N + (prev.of === N ? ' (' + (t.first - prev.first >= 0 ? '+' : '−') + Math.abs(t.first - prev.first) + ')' : '') + '.</p>' : '';   /* [J-10] */
  box.innerHTML = '<h2>Set ' + seed + ' · ' + esc(SCOPES[scope]) + ' · ' + (test ? 'Like the real test' : 'Check as I go') + '</h2>' +
    '<div class="big"><div><b>' + t.first + '<small> / ' + N + '</small></b><span>' + (test ? 'right' : 'right on the first try') + (t.helped ? ' ' + bulb(t.helped) : '') + '</span></div><div><b>' + fmt(S.acc) + '</b><span>time on the clock</span></div></div>' +
    lastLine +
    (alone ? '<p class="perfect">Every one on the first try.</p>' : perfect ? '<p class="perfect">Every one right on the first check.</p>' : '') +
    '<div class="tw"><table><thead><tr><th>Part</th><th class="r">' + (test ? 'Right' : 'First try') + '</th>' + (test ? '' : '<th class="r">' + bulb() + '</th>') + '</tr></thead><tbody>' + rows + '</tbody></table></div>' +
    (notYet.length ? '<p class="note"><span class="nry">Not right yet:</span> ' + notYet.map(function(it){ return '<button type="button" class="jump" data-jump="' + it.id + '">' + it.lab + '</button>'; }).join(' ') + '</p>' +
      '<p class="note"><b>Show me how</b> has the steps; <b>Try another like this</b> gives you a fresh one.</p>' : '') +
    '<div class="btns">' + btns + '</div>';
  box.hidden = false;
}
function finish(){
  if (S.done) return;                                                                  /* [R2-1] */
  closeAsk();
  if (S.running) S.acc = elapsed(); S.running = false; S.startedAt = null; S.done = true; S.finishedAt = now();
  ITEMS.forEach(function(it){
    var R = res(it);
    if (R.v === 'right') return;
    if (S.mode === 'test' || (R.tries === 0 && answered(it))){                           /* [R2-N1] a typed answer never checked is marked now */
      var f = judge(it, R.tries);
      if (f.v === 'blank' || f.v === 'unread'){ if (S.mode === 'test'){ R.first = false; R.v = 'wrong'; R.tries = Math.max(1, R.tries); R.lastAns = S.ans[it.id]; R.unreadMsg = f.v === 'blank' ? 'Left blank.' : (f.what[0] || 'Could not read the answer.'); var ms = misses(); ms[it.pos] = famOf(it); store('misses', ms); } else if (R.first === null) R.first = false; }
      else record(it, f, S.mode !== 'test');
    } else if (R.first === null) R.first = false;                                       /* skipped in practice: not a miss, just not done */
  });
  var t = tally(), H = hist(), hk = scope + '.' + S.mode;
  H[hk] = [{seed: seed, first: t.first, of: ITEMS.length, time: S.acc, at: S.finishedAt}].concat(H[hk] || []).slice(0, 5); store('hist', H);
  save(); paintAll(); window.scrollTo(0, 0); var rb = $('result'); if (rb){ rb.setAttribute('tabindex', '-1'); rb.focus({preventScroll: true}); }
}

/* ------------------------------------------------ sets */
function ask(text, yes, fn){
  var c = $('confirm'); c.hidden = false; document.body.classList.add('asking');            /* [R2-N6] one Finish on screen at a time */
  c.innerHTML = '<span>' + text + '</span><button type="button" class="go" id="cy">' + yes + '</button><button type="button" id="cn">Keep working</button>';
  $('cy').onclick = function(){ closeAsk(); fn(); }; $('cn').onclick = function(){ closeAsk(); var bf = $('bFinish'); if (bf) bf.focus(); };
  $('cy').focus();
}
function closeAsk(){ var c = $('confirm'); c.hidden = true; c.innerHTML = ''; document.body.classList.remove('asking'); }
function started(){ return elapsed() > 0 || ITEMS.some(answered) || Object.keys(S.res).length > 0; }
function goSet(n, sc, mode){ if (mode && S) S.mode = mode; location.hash = hashOf(n, sc); if (fromHash() && (fromHash().seed !== seed || fromHash().scope !== scope)) openSet(n, sc, mode); }   /* [R1-16] Back returns to the set before */
var NOTICE = '';
function openSet(n, sc, mode){
  if (S) pause();
  closeAsk();
  var keepMode = mode || (S && S.mode) || 'practice';
  seed = n; scope = SCOPES[sc] ? sc : 'all';
  var saved = load(key());
  if (scope === 'miss' && !(saved && saved.res)){ var pos = Object.keys(misses()); if (!pos.length){ scope = 'all'; saved = load(key()); } }
  S = fresh(keepMode);
  var loaded = !!(saved && saved.res && saved.schema === SCHEMA); if (loaded) S = saved;
  if (scope === 'miss' && !S.pos) S.pos = Object.keys(misses());
  S.more = S.more || {}; S.walk = S.walk || {}; S.walkOpen = S.walkOpen || {}; S.running = false; S.startedAt = null; FLASH = {};
  render();
  NOTICE = '';
  if (loaded && S.hash && S.hash !== HASHV){ var m0 = S.mode, p0 = S.pos; S = fresh(m0); if (p0) S.pos = p0; render(); NOTICE = 'This set was updated since you last opened it, so it starts fresh.'; }   /* [W-2] never old answers on new questions; only for a set this device saved before [B2] */
  S.hash = HASHV;
  try { history.replaceState(null, '', hashOf(seed, scope)); } catch(e){}
  restore(); save(); paintAll(); window.scrollTo(0, 0);
  $('notice').textContent = NOTICE; $('notice').hidden = !NOTICE;
  var h1 = $('h1'); if (h1 && document.activeElement && document.activeElement !== document.body && !(document.activeElement.closest && document.activeElement.closest('#paper'))) { h1.setAttribute('tabindex', '-1'); h1.focus({preventScroll: true}); }
}
function restoreOne(it){
  var a = S.ans[it.id]; if (a == null) return;
  if (it.type === 'text'){ var el = $('a' + it.id); if (el){ el.value = a; setPreview(el); } }
  else (it.type === 'mc' ? [a] : a).forEach(function(v){ var x = document.querySelector('input[name="q' + it.id + '"][value="' + v + '"]'); if (x) x.checked = true; });
}
function restore(){ ITEMS.forEach(restoreOne); }
function paintAll(){ paintScopes(); paintBar(); paintProgress(); ITEMS.forEach(paintItem); Object.keys(EX).forEach(function(k){ paintItem(EX[k]); }); paintScore(); }
$('bPause').addEventListener('click', pause);
$('bResume').addEventListener('click', start);
$('bFinish').addEventListener('click', function(){
  var left = ITEMS.length - ITEMS.filter(answered).length;
  ask((left ? left + ' of ' + ITEMS.length + ' still blank. ' : '') + (S.mode === 'test' ? 'Stop the clock and mark everything?' : 'Stop the clock and see your score?'), 'Yes, finish', finish);
});
Array.prototype.forEach.call(document.querySelectorAll('.mode button'), function(b){
  b.addEventListener('click', function(){
    var m = b.dataset.mode; if (m === S.mode) return;
    var go = function(){ var pos = S.pos; drop(key()); S = fresh(m); if (pos) S.pos = pos; render(); S.hash = HASHV; save(); paintAll(); };
    if (started()) ask('Switching starts this set over. Your answers will be cleared.', 'Switch', go); else go();
  });
});
$('scope').addEventListener('change', function(){ var v = this.value; if (v === scope) return;
  var to = v === 'all' ? (scope === 'all' ? seed : (load('lastAll') || seed)) : randomSeed();   /* [R2-N3] one part or misses: new numbers; back to the whole test you were on [B6] */
  var go = function(){ goSet(to, v); };
  if (started() && !S.done) ask('Switch to “' + SCOPES[v] + '”? This set stays saved on this device.', 'Switch', go); else go();
  $('scope').value = scope; });
$('setgo').addEventListener('click', function(){ var v = Math.floor(+$('setin').value); if (v >= 1 && v <= 99999) goSet(v, scope); else { $('setin').value = seed; } });
$('setin').addEventListener('keydown', function(e){ if (e.key === 'Enter'){ e.preventDefault(); $('setgo').click(); } });
$('bNew').addEventListener('click', function(){ var go = function(){ goSet(randomSeed(), scope === 'miss' ? 'all' : scope); }; if (started() && !S.done) ask('Leave this set for a new one? This one stays saved on this device.', 'New set', go); else go(); });
$('bAgain').addEventListener('click', function(){ ask('Clear your answers to this set and start it again?', 'Start over', function(){ var m = S.mode, pos = S.pos; drop(key()); S = fresh(m); if (pos) S.pos = pos; render(); S.hash = HASHV; save(); paintAll(); window.scrollTo(0, 0); }); });
window.addEventListener('hashchange', function(){ var h = fromHash(); if (h && (h.seed !== seed || h.scope !== scope)) openSet(h.seed, h.scope); });
window.addEventListener('storage', function(e){                                       /* [R2-N4] two tabs on one set stay in step — without writing back [B1] */
  if (e.key !== PRE + key() || !e.newValue) return;
  var rec; try { rec = JSON.parse(e.newValue); } catch(x){ return; }
  if (!rec || rec.schema !== SCHEMA || rec.hash !== HASHV || (S.at && rec.at && rec.at <= S.at)) return;
  var y = window.scrollY, f = document.activeElement && document.activeElement.id;
  S = rec; S.running = false; S.startedAt = null; FLASH = {};
  render(); restore(); paintAll(); window.scrollTo(0, y); if (f && $(f)) $(f).focus({preventScroll: true});
});
setInterval(function(){ if (S && S.running) $('time').textContent = fmt(elapsed()); }, 250);
window.addEventListener('pagehide', function(){ if (S && S.running){ S.acc = elapsed(); S.startedAt = now(); save(); } });
document.addEventListener('visibilitychange', function(){ if (document.hidden && S && S.running) pause(); });   /* the clock stops when the page is put away */

/* ------------------------------------------------ print (Croix, 16 Oct 2026: "Can I get the ability to print?")
   Print opens a choice: the set as a paper worksheet, the worksheet with its answer key, or this student's results. The
   printout is the same set as the screen (the same items, drawn by the same view functions; the key is the same key the
   page marks with), shown first as a preview with its own Print button. With Português on, its lines print too. */
function pq(d, qn){
  var it = d.it, h = '<div class="pq"><div class="pqh"><div class="stem"><b class="num">' + qn + '.</b><span class="st">' + V.stem(it) + '</span></div>' + fig(it) + '</div>';   /* the stem and its figure stay together; parts may go to the next page */
  var line = function(p, lab){ return '<div class="line">' + (lab ? '<b class="lab">' + lab + '.</b>' : '') + '<span class="st">' + V.line(p) + '</span></div>'; };
  var blank = function(p){ var u = V.unit(p), pre = V.pre(p); return '<div class="pans"><span class="pal bt">Answer:</span> ' + (pre ? '<span class="pre">' + pre + '</span>' : '') + (V.blank ? V.blank(p) || '<span class="pblank"></span>' : '<span class="pblank"></span>') + (u ? ' <span class="unit">' + esc(u) + '</span>' : '') + '</div><div class="pwork"></div>'; };
  var choices = function(x){ return '<div class="pchoices">' + x.opts.map(function(o, k){ return '<div class="pch"><span class="pbox' + (it.type === 'multi' ? ' sq' : '') + '"></span><span class="cl">' + LET[k] + '.</span><span class="cv">' + V.opt(x, k) + '</span></div>'; }).join('') + '</div>'; };
  if (it.type === 'parts') it.parts.forEach(function(p, pi){ if (d.keep && !d.keep[pi]) return; h += '<div class="ppart">' + line(p, p.label) + (p.kind === 'mc' ? choices(p) : blank(p)) + '</div>'; });
  else if (it.type === 'solo') h += '<div class="ppart">' + blank(it.part) + '</div>';
  else h += '<div class="ppart">' + choices(it) + '</div>';
  return h + '</div>';
}
function printHead(title){
  return '<div class="phead"><div class="pt1"><span class="bt">' + esc(U.title) + '</span></div><div class="pt2"><span class="bt">' + title + '</span></div>' +
    '<div class="pname"><span class="bt">Name:</span><span class="pline"></span><span class="bt">Date:</span><span class="pline short"></span></div></div>';
}
function setLine(){ return 'Set ' + seed + ' · ' + esc(SCOPES[scope]); }
function worksheetHtml(){
  var h = [printHead(setLine())], qn = 0;
  var pnotes = U.notesPrint || U.notes;                       /* paper is not a keyboard: a unit may give notes for print */
  if (pnotes && pnotes.length) h.push('<p class="pnotes">' + pnotes.map(function(n){ return '<span class="pinote">' + n + '</span>'; }).join(' ') + '</p>');
  DS.forEach(function(sec){ h.push('<h2 class="psec"><span class="bt">' + sec.title + '</span></h2>'); sec.items.forEach(function(d){ qn++; h.push(pq(d, qn)); }); });
  return h.join('');
}
function keyListHtml(){
  var rows = ITEMS.map(function(it){ return '<tr><td class="pk">' + esc(it.lab) + '</td><td class="kv">' + keyHtml(it) + '</td></tr>'; }).join('');
  return '<div class="pkey"><h2 class="psec"><span class="bt">Answer key</span></h2><p class="pmeta"><span class="bt">' + setLine() + '</span></p><table class="ptab"><tbody>' + rows + '</tbody></table></div>';
}
function yourAnswer(it){
  var a = S.ans[it.id];
  if (it.type === 'text') return a == null || String(a).trim() === '' ? '' : esc(a);
  if (it.type === 'mc') return a == null ? '' : '<b>' + LET[+a] + '.</b> ' + V.opt(it.x, +a);
  return (a || []).map(function(k){ return '<b>' + LET[+k] + '.</b> ' + V.opt(it.x, +k); }).join('; ');
}
function verdict(it){
  var R = S.res[it.id];
  if (!R || !R.v) return answered(it) ? 'Not checked' : 'Blank';
  if (R.v === 'right') return R.late ? '✓ Right at Finish' : R.first ? '✓ First try' + (R.helped ? ' ' + bulb() : '') : R.shown ? '✓ After seeing the steps' : '✓ On try ' + R.tries;
  return R.v === 'form' ? 'Almost' : '✗ Not yet';
}
function resultsHtml(){
  var t = tally(), N = ITEMS.length, test = S.mode === 'test';
  var h = printHead('Results') + '<p class="pmeta"><span class="bt">' + setLine() + ' · ' + (test ? 'Like the real test' : 'Check as I go') + '</span></p>';
  h += '<p class="pscore"><span class="bt"><b>' + t.first + ' / ' + N + '</b> right on the first try' + (t.helped ? ' ' + bulb(t.helped) : '') + '</span><span class="bt">' + t.done + ' of ' + N + ' done · time on the clock ' + fmt(elapsed()) + '</span>' +
    (S.done ? '' : '<span class="bt">Not finished yet.</span>') + '</p>';
  h += '<table class="ptab pres"><thead><tr><th><span class="bt">Part</span></th><th class="r"><span class="bt">' + (test ? 'Right' : 'First try') + '</span></th></tr></thead><tbody>' +
    DS.map(function(s, k){ return '<tr><td><span class="bt">' + s.title + '</span></td><td class="r">' + t.bySec[k].got + ' / ' + t.bySec[k].of + '</td></tr>'; }).join('') + '</tbody></table>';
  h += '<table class="ptab pans2"><thead><tr><th>#</th><th><span class="bt">Your answer</span></th><th><span class="bt">Result</span></th><th><span class="bt">Correct answer</span></th></tr></thead><tbody>' +
    ITEMS.map(function(it){ var R = S.res[it.id], ok = R && R.v === 'right'; return '<tr class="' + (ok ? 'ok' : 'no') + '"><td class="pk">' + esc(it.lab) + '</td><td>' + yourAnswer(it) + '</td><td><span class="bt">' + verdict(it) + '</span></td><td class="kv">' + keyHtml(it) + '</td></tr>'; }).join('') + '</tbody></table>';
  return h;
}
/* Make-up tests print from the teacher copy only (Croix, 21 Oct 2026: "I don't want the students to be able to print the
   make up tests"). A teacher build is the one with the real test in it (test.js sets TEACHER_TEST before this script). */
function teacherPage(){ return !!window.TEACHER_TEST; }
function printMenu(){
  var test = S.mode === 'test' && !S.done;
  ask0('What do you want to print?', [
    ['ws', 'Worksheet'], ['wk', 'Worksheet + answer key']].concat(teacherPage() ? [['mk', 'Make-up tests']] : []).concat([
    ['res', 'My results', test ? 'In “Like the real test” the results print after Finish.' : '']]));
}
/* Make-up tests (Croix, 18 Oct 2026: "print tests or make ups directly from here… I'll need it to print the answer key too"):
   one to five forms, each a different set of the WHOLE unit, headed as a test with a name line and its form letter; every
   form's answer key follows on its own page, labelled with the form letter and set number so the teacher keeps the keys. */
function makeupMenu(){ ask0('How many different forms?', [['mk1', '1'], ['mk2', '2'], ['mk3', '3'], ['mk4', '4'], ['mk5', '5']]); }
function withSet(s, fn){                                   /* run fn with the page's data drawn from set s, then put everything back */
  var o = {seed: seed, scope: scope, G: G, DS: DS, ITEMS: ITEMS, EX: EX, H: HASHV}, out;
  seed = s; scope = 'all';
  try { DS = build(); ITEMS = []; EX = {}; collect(); out = fn(); }
  finally { seed = o.seed; scope = o.scope; G = o.G; DS = o.DS; ITEMS = o.ITEMS; EX = o.EX; HASHV = o.H; }
  return out;
}
function collect(){                                        /* the items of DS, as render() lists them, without touching the page */
  var qn = 0;
  DS.forEach(function(sec, di){ sec.items.forEach(function(d){
    var it = d.it; qn++;
    if (it.type === 'parts'){
      var shown = it.parts.filter(function(p, pi){ return !d.keep || d.keep[pi]; }).length, lone = shown === 1 && it.parts.length > 1;
      it.parts.forEach(function(p, pi){ if (d.keep && !d.keep[pi]) return; var id = qn + p.label;
        ITEMS.push({id: id, lab: lone ? String(qn) : id, sec: di, type: textType(p), x: p, item: it, pos: posKey(d.si, d.ii, pi), aShown: true}); });
    } else if (it.type === 'solo'){ var id1 = String(qn); ITEMS.push({id: id1, lab: id1, sec: di, type: 'text', x: it.part, item: it, pos: posKey(d.si, d.ii, -1), aShown: true}); }
    else { var id2 = String(qn); ITEMS.push({id: id2, lab: id2, sec: di, type: it.type === 'multi' ? 'multi' : 'mc', x: it, item: it, pos: posKey(d.si, d.ii, -1), aShown: true}); }
  }); });
}
function makeupHtml(n){
  var seeds = [seed], guard = 0;
  while (seeds.length < n && guard++ < 50){ var r = randomSeed(); if (seeds.indexOf(r) < 0) seeds.push(r); }
  var forms = seeds.map(function(s, k){ return withSet(s, function(){ return {ws: worksheetHtml(), key: keyListHtml(), form: LET[k], seed: s}; }); });
  var h = forms.map(function(f, k){ return (k ? '<div class="pbreak"></div>' : '') + '<div class="pform" data-form="' + f.form + '">' +
    f.ws.replace(/<div class="pt1"><span class="bt">([^<]*)<\/span>/, function(m, t){ return '<div class="pt1 ptest"><span class="bt">' + t.replace(/\s*Practice Test\b/i, ' Test') + '</span>'; })
        .replace(/<div class="pt2"><span class="bt">[^<]*<\/span>/, '<div class="pt2"><span class="bt">Make-up · Form ' + f.form + ' · Set ' + f.seed + '</span>') + '</div>'; }).join('');
  h += forms.map(function(f){ return '<div class="pbreak"></div><div class="pform pkeyform">' + f.key.replace('Answer key</span>', 'Answer key — Form ' + f.form + '</span>') + '</div>'; }).join('');
  return h;
}
function ask0(text, opts){                                   /* the print choice, in the same bar as the other questions */
  var c = $('confirm'); c.hidden = false; document.body.classList.add('asking');
  c.innerHTML = '<span>' + text + '</span>' + opts.map(function(o){ return '<button type="button" class="go" data-print="' + o[0] + '"' + (o[2] ? ' disabled title="' + esc(o[2]) + '"' : '') + '>' + o[1] + '</button>'; }).join('') + '<button type="button" id="cn">Cancel</button>';
  $('cn').onclick = function(){ closeAsk(); var b = $('bPrint'); if (b) b.focus(); };
  var f = c.querySelector('[data-print]:not([disabled])'); if (f) f.focus();
}
function showPrint(kind){
  if (/^mk/.test(kind) && !teacherPage()) return;            /* no make-up tests on a student page, whatever asks */
  closeAsk();
  var pv = $('printview'); if (!pv){ pv = document.createElement('div'); pv.id = 'printview'; pv.setAttribute('role', 'dialog'); pv.setAttribute('aria-label', 'Print preview'); document.body.appendChild(pv); }
  if (kind === 'mk'){ makeupMenu(); return; }
  var mk = /^mk(\d)$/.exec(kind);
  var body = mk ? makeupHtml(+mk[1]) : kind === 'res' ? resultsHtml() : worksheetHtml() + (kind === 'wk' ? '<div class="pbreak"></div>' + keyListHtml() : '');
  pv.innerHTML = '<div class="pbar"><button type="button" class="go" id="pvPrint">Print</button><button type="button" id="pvClose">Close</button><span class="pvhint bt">If nothing happens, use your browser’s Print (Ctrl + P).</span></div><div class="ppage">' + body + '</div>';
  pv.hidden = false; document.body.classList.add('printing'); window.scrollTo(0, 0);
  $('pvPrint').onclick = function(){ try { window.print(); } catch(e){} };
  $('pvClose').onclick = closePrint;
  $('pvPrint').focus();
}
function closePrint(){ var pv = $('printview'); if (pv){ pv.hidden = true; pv.innerHTML = ''; } document.body.classList.remove('printing'); var b = $('bPrint'); if (b) b.focus(); }
document.addEventListener('click', function(e){ var t = e.target && e.target.closest && e.target.closest('[data-print]'); if (t && !t.disabled) showPrint(t.dataset.print); });
document.addEventListener('keydown', function(e){ if (e.key === 'Escape' && document.body.classList.contains('printing')) closePrint(); });
(function(){ var b = document.createElement('button'); b.type = 'button'; b.id = 'bPrint'; b.className = 'pbtn'; b.textContent = 'Print'; b.addEventListener('click', printMenu); var w = document.querySelector('.ctl'); if (w){ var tl = w.querySelector('.tools'); if (!tl){ tl = document.createElement('div'); tl.className = 'tools'; w.appendChild(tl); } tl.appendChild(b); } })();

/* the page's words, from the unit */
document.title = U.title;
$('eyebrow').innerHTML = U.eyebrow; $('h1').innerHTML = U.h1;
/* No line about the page under the title (Croix, 21 Oct 2026: "eliminate the little texts that you do in the menu like (Same kinds
   of questions as the unit test, new numbers every set.)"): only a unit's notes — how to write an answer — and none at all hides it. */
var notesHtml = (U.notes || []).map(function(n){ return '<span class="pinote">' + n + '</span>'; }).join('');
$('intro').innerHTML = notesHtml; $('intro').hidden = !notesHtml;
openSet(seed, scope);
if (K.Bi && U.second) K.Bi.mount(U, (window.KitLang || {})[U.second.code]);   /* the second-language toggle (kit/bilingual.js), when the unit has one; after the first set is drawn */
})();
