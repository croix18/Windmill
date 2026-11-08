/* Practice-test kit — lesson practice from Cadence (7 Nov 2026).

   Croix: "instead of having the entire practice test, the days should have practice questions directly from that day's
   lessons" and "have it pull Cadence questions … Cadence already tracks by unit and lesson"; then, told the figures needed
   rendering support: "Can you provide rendering support?"

   The unit's bank (bank/cadence.json, made by Windmill tools/cadence_bank.py from Cadence's own generators) and its plan map
   (bank/map.json) are inlined by build.py as window.CADENCE_BANK and window.CADENCE_MAP. This file adds, beside the practice
   test, one practice choice per lesson of the plan — the scope `lesson-<code>` (#lesson-9.03, #set-4821-lesson-9.03): a set
   of 8 of that lesson's Cadence items (6 regular, then 2 high rigor when the lesson has them), never repeating on a device
   until the lesson's bank is used up, then reshuffled. A set number gives the same order to every device that has not used
   the bank yet; a set once drawn on a device keeps its questions there.

   A bank item becomes an ordinary kit item — 'solo' (one box), 'parts' (a box or a choice per claim of Cadence's key), 'mc'
   or 'multi' — with `bank` set, and every function of the unit interface the kit calls (view.*, judge.*, solution, rungs,
   walk, key, keyText) is wrapped here: a bank item is answered by this file, anything else by the unit, unchanged. So the
   whole page works on it as on a native question: the coach card, the help ladder, "Try a similar one" (another unused item
   of the same lesson and the same kind), first-try scoring, the IDs ("U9·L3·7": unit, lesson, the item's place in the
   lesson's bank), the keypad, Larger text and print.

   Rendering is Cadence's. Its stems, choices and solution lines were cut into prose (Cadence's HTML) and math (the TeX
   Cadence hands KaTeX) by Cadence's own converter at export; each math run is a <span class="m" data-tex="…"> that tex.js
   draws with the inlined KaTeX (display runs as display math). Figures are Cadence's SVG, verbatim, in a box that scrolls
   sideways rather than shrink a wide one past reading, capped in height, and drawn light-on-dark in the dark theme (kit.css).

   Answers. A choice is Cadence's key. A typed answer is right when it is the key — or one of the forms Cadence's key itself
   accepts — written any way core.js Kit.Ans reads as the same (3 = x, 0.5 and 1/2, the terms in another order, the box's
   unit typed after it, $ in a money box, a precision the stem names); where Cadence's key allows "an equivalent equation /
   inequality / expression", an answer with the same solution (the same variable, linear, the same root and direction) or the
   same value everywhere is right too. A value that is right but in another form than the stem asks (a decimal for a key in
   terms of π, a standard number for scientific notation) is "Almost". */
(function(){
'use strict';
var K = window.Kit = window.Kit || {}, U = window.Unit, B = window.CADENCE_BANK, MAP = window.CADENCE_MAP;
if (!U || !B || !MAP || !B.lessons) return;
var V = U.view, O = {}, LET = 'ABCDEFGH';
Object.keys(V).forEach(function(k){ O[k] = V[k]; });
var OJ = {text: U.judge.text, mc: U.judge.mc, multi: U.judge.multi, nline: U.judge.nline}, OSOL = U.solution, ORUNGS = U.rungs, OWALK = U.walk, OKEY = U.key, OKT = U.keyText;
function esc(s){ return String(s == null ? '' : s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
var UNO = (/u(\d+)$/.exec(U.id || '') || [])[1] || String(B.unit || '');

/* ------------------------------------------------ Cadence's segments → the page's HTML */
/* the light DOM of a math span: the TeX read as text (what an old browser, or a failed render, shows; its digits and letters
   are the TeX's, in order, as tex.js's check wants) */
var TT = {'\\times': '×', '\\cdot': '·', '\\div': '÷', '\\le': '≤', '\\ge': '≥', '\\ne': '≠', '\\approx': '≈', '\\pm': '±', '\\pi': 'π', '\\circ': '°', '\\to': '→', '\\infty': '∞', '\\%': '%', '\\$': '$', '\\,': ' ', '\\;': ' ', '\\ ': ' ', '\\left': '', '\\right': '', '\\surd': '√', '\\sqrt': '√', '\\ldots': '…'};
function texText(t){
  var s = String(t).replace(/\\[dt]?frac\{([^{}]*)\}\{([^{}]*)\}/g, '$1/$2').replace(/\\(?:text|mathrm|textbf|mathbf|operatorname)\{([^{}]*)\}/g, '$1');
  s = s.replace(/\\[A-Za-z]+|\\./g, function(m){ return TT[m] != null ? TT[m] : ''; });
  return s.replace(/\^\{([^{}]*)\}/g, '^$1').replace(/_\{([^{}]*)\}/g, '$1').replace(/[{}]/g, '').replace(/\s+/g, ' ').trim();
}
/* Cadence's words are English only (no second language on new material, 24 Oct 2026): translate="no" keeps a unit's
   Português toggle from looking them up */
function segHtml(segs){ var h = segHtml0(segs); return h ? '<span translate="no">' + h + '</span>' : ''; }
function segHtml0(segs){
  if (segs == null) return '';
  if (typeof segs === 'string') return segs;
  return segs.map(function(g){
    if (typeof g === 'string') return g;
    return '<span class="m' + (g[1] ? ' mdisp' : '') + '" data-tex="' + esc(g[0]) + '"' + (g[1] ? ' data-disp=""' : '') + '>' + esc(texText(g[0])) + '</span>';
  }).join('');
}
function segPlain(segs){ return (segs || []).map(function(g){ return typeof g === 'string' ? g.replace(/<[^>]*>/g, ' ') : texText(g[0]); }).join('').replace(/\s+/g, ' ').trim(); }
function figHtml(b){
  if (!b.fig) return '';
  if (hasNline(b)) return '';                               /* a graph to build: the part draws its own number line (kit nline.js), Cadence's blank one is not shown */
  var svg = String(b.fig).replace(/^<svg\b/, '<svg role="img" aria-label="' + esc(b.figText || 'Figure') + '"');
  /* never drawn smaller than 90% of Cadence's own size (its labels are 10 px there): a figure that would be scrolls sideways */
  var vb = /viewBox="[\d.\s-]*?\s([\d.]+)\s+[\d.]+"/.exec(b.fig), w = vb ? Math.round(+vb[1] * 0.9) : 0, wide = w > 380;
  return '<div class="bkfig' + (wide ? ' bkwide' : '') + '" tabindex="0" aria-label="Figure: ' + esc(b.figText || '') + '"><div class="bkfin"' + (w ? ' style="min-width:' + w + 'px"' : '') + '>' + svg + '</div></div>';
}

/* ------------------------------------------------ the lessons and their practice choices */
var LES = B.lessons, ORDER = [];                          /* Cadence lesson id → {title, items, …} */
var BYID = {}; Object.keys(LES).forEach(function(lid){ (LES[lid].items || []).forEach(function(b, k){ b.n = k + 1; BYID[b.id] = b; }); });
var pad2 = function(n){ n = String(n); return n.length < 2 ? '0' + n : n; };
function niceTitle(t){ return String(t || '').replace(/\s*\(as run\)$/, '').replace(/\s+-\s+/g, ' – '); }
/* the practice choices: every plan code the map gives to Cadence; a two-lesson day (9.03+04) is a choice and so is each of its
   lessons (9.03, 9.04); a thread day (T-A1) is one choice */
var SC = {}, SCKEYS = [];
function addScope(key, rec){ if (SC[key]) return; SC[key] = rec; SCKEYS.push(key); }
(MAP.order || []).forEach(function(code){
  var r = MAP.lessons[code]; if (!r || r.status !== 'cadence' || !r.cadence || !r.cadence.length) return;
  var ok = r.cadence.filter(function(l){ return LES[l] && LES[l].items && LES[l].items.length; }); if (!ok.length) return;
  var thread = /^T-/.test(code), parts = niceTitle(r.title).split(/\s*;\s*/);
  if (ok.length > 1 && !thread){
    var m = /^(\d+)\.(\d+)\+(\d+)$/.exec(code);
    ok.forEach(function(l, i){
      var sub = m ? m[1] + '.' + pad2(i ? m[3] : m[2]) : l;
      var t = parts.length === ok.length ? parts[i] : niceTitle(LES[l].title);
      addScope('lesson-' + sub.toLowerCase(), {code: sub, title: t, lessons: [l], show: true});
    });
    addScope('lesson-' + code.toLowerCase(), {code: code, title: niceTitle(r.title), lessons: ok, show: false, day: true});
  } else {
    var tt = niceTitle(r.title), lab = code;
    if (thread){ var tm = /^([^:]+):\s*(.*?)\s*(\([^)]*\))?$/.exec(tt); if (tm){ lab = tm[1]; tt = tm[2].charAt(0).toUpperCase() + tm[2].slice(1); } }
    addScope('lesson-' + code.toLowerCase(), {code: code, label: thread ? lab : null, title: tt, lessons: ok, show: true});
  }
});
function scopeName(k){ var s = SC[k]; return s ? (s.label || (s.day ? 'Lessons ' + s.code.replace('+', '–') : 'Lesson ' + s.code)) + ' · ' + s.title : ''; }

/* ------------------------------------------------ this device's memory (every read and write in try/catch: storage may be refused) */
var PRE = (U.id || 'unit') + '.bank.';
function ld(k){ try { return JSON.parse(localStorage.getItem(PRE + k) || 'null'); } catch(e){ return null; } }
function st(k, v){ try { localStorage.setItem(PRE + k, JSON.stringify(v)); } catch(e){} }
var MEM = {};                                              /* the visit's copy, for a device that refuses storage */
function used(lid){ var u = ld('used.' + lid) || MEM['used.' + lid] || []; return u; }
function markUsed(lid, ids){ var u = used(lid).slice(); ids.forEach(function(id){ if (u.indexOf(id) < 0) u.push(id); }); MEM['used.' + lid] = u; st('used.' + lid, u); }
function resetUsed(lid, keep){ MEM['used.' + lid] = keep.slice(); st('used.' + lid, keep.slice()); }

/* ------------------------------------------------ a set: 8 items, 6 regular then 2 rigor, never repeating until the bank is used */
/* a lesson item the teacher disapproved (approvals.js, 8 Nov 2026) is left out of new sets and of "Try a similar one"; a set this
   device already drew keeps its items (setIds) */
function off(id){ return !!(K.Approvals && K.Approvals.bankHidden(id)); }
function shuffled(list, seedStr){ var r = K.rng(K.fnv1a(seedStr)), a = list.slice(); for (var i = a.length - 1; i > 0; i--){ var j = Math.floor(r() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
function quotas(n){ return n === 1 ? [[6, 2]] : n === 2 ? [[3, 1], [3, 1]] : (function(){ var q = [], left = 8; for (var i = 0; i < n; i++){ var k = Math.round(left / (n - i)); left -= k; q.push([k - Math.round(k / 4), Math.round(k / 4)]); } return q; })(); }
function drawLesson(lid, nReg, nRig, seed){
  var L = LES[lid], all = L.items.filter(function(b){ return !off(b.id); }), reg = all.filter(function(b){ return !b.rigor; }), rig = all.filter(function(b){ return b.rigor; });
  if (!rig.length){ nReg += nRig; nRig = 0; } if (!reg.length){ nRig += nReg; nReg = 0; }
  var u = used(lid), pick = [];
  var take = function(pool, n, salt){
    if (!n) return;
    var order = shuffled(pool, U.id + '|' + lid + '|' + salt + '|' + seed), fresh = order.filter(function(b){ return u.indexOf(b.id) < 0 && pick.indexOf(b) < 0; });
    if (fresh.length < n){                                  /* the bank of this kind is used up on this device: start it over */
      var mine = pool.map(function(b){ return b.id; }); u = u.filter(function(id){ return mine.indexOf(id) < 0; }); resetUsed(lid, u);
      fresh = order.filter(function(b){ return pick.indexOf(b) < 0; });
    }
    /* one of each of Cadence's question templates before any template comes twice */
    var gens = {}, got = [];
    pick.forEach(function(b){ gens[b.sk + ':' + b.gen] = 1; });
    fresh.forEach(function(b){ if (got.length < n && !gens[b.sk + ':' + b.gen]){ gens[b.sk + ':' + b.gen] = 1; got.push(b); } });
    fresh.forEach(function(b){ if (got.length < n && got.indexOf(b) < 0) got.push(b); });
    pick = pick.concat(got);
  };
  take(reg, nReg, 'r'); take(rig, nRig, 'h');
  markUsed(lid, pick.map(function(b){ return b.id; }));
  return pick;
}
function setIds(scope, seed){
  var sets = ld('sets') || MEM.sets || {}, k = scope + '|' + seed;
  if (sets[k] && sets[k].every(function(id){ return BYID[id]; })) return sets[k];
  var s = SC[scope], q = quotas(s.lessons.length), ids = [];
  s.lessons.forEach(function(lid, i){ ids = ids.concat(drawLesson(lid, q[i][0], q[i][1], seed).map(function(b){ return b.id; })); });
  sets[k] = ids; var keys = Object.keys(sets); while (keys.length > 40){ delete sets[keys.shift()]; }
  MEM.sets = sets; st('sets', sets);
  return ids;
}

/* ------------------------------------------------ a bank item as a kit item */
var CACHE = {};
function formLabel(bp, b, onlyOne){
  if (bp.form) return bp.form;
  var t = bp.type, key = String(bp.key || '');
  if (t === 'sci') return 'In scientific notation';
  if (/π/.test(key) && t !== 'number') return 'In terms of π';
  if (t === 'inequality' && onlyOne) return 'As an inequality';
  if (t === 'equation' && bp.equiv) return 'As an equation';
  return '';
}
function hasNline(b){ return !!(b.answer && b.answer.parts && b.answer.parts.some(function(p){ return p.type === 'nline'; })); }
function partOf(b, bp, pi, label){
  var line = bp.labelS ? segHtml(bp.labelS) : esc(bp.label || '');
  /* "graph the solution on the number line" (7 Nov 2026): the student builds it — the point, an open or closed dot, the arrow */
  if (bp.type === 'nline') return {bank: b, bp: bp, bpi: pi, kind: 'nline', label: label, lineHtml: line, line: bp.line, graph: bp.graph, v: bp.v || 'x', fam: 'L' + b.lesson};
  if (bp.type === 'select'){
    return {bank: b, bp: bp, bpi: pi, kind: 'mc', label: label, lineHtml: line, opts: bp.optsS.map(segHtml), correct: bp.key, fam: 'L' + b.lesson};
  }
  return {bank: b, bp: bp, bpi: pi, kind: 'bank', label: label, lineHtml: line, fam: 'L' + b.lesson, imode: bp.type === 'number' && !bp.money && !/[-\/ ]/.test(bp.key) ? 'decimal' : null};
}
function kitItem(b){
  if (CACHE[b.id]) return CACHE[b.id];
  /* Cadence's instruction line, unless the stem already says it ("Select all that apply." over "Select all the correct answers.") */
  var said = b.inst && /select\s*(<\/?b>)?\s*all/i.test(segPlain(b.stem).replace(/<[^>]*>/g, '')) && /select\s*(<\/?b>)?\s*all/i.test(segPlain(b.inst));
  var stem = segHtml(b.stem) + (b.inst && !said ? '<div class="rt-inst">' + segHtml(b.inst) + '</div>' : ''), A = b.answer, it;
  var base = {bank: b, stemHtml: stem, fam: 'L' + b.lesson};
  if (A.kind === 'choice'){
    it = Object.assign(base, {type: 'mc', opts: b.choices.map(function(c){ return segHtml(c.t); }), correct: A.key});
  } else if (A.kind === 'multi'){
    it = Object.assign(base, {type: 'multi', opts: b.choices.map(function(c){ return segHtml(c.t); }), correct: A.key.slice()});
  } else if (A.kind === 'match'){
    var cols = b.cols.map(segHtml);
    it = Object.assign(base, {type: 'parts', parts: b.rows.map(function(r, i){ return {bank: b, bp: {type: 'select', key: A.key[i]}, bpi: i, kind: 'mc', label: 'abcdefgh'.charAt(i), lineHtml: segHtml(r), opts: cols, correct: A.key[i], fam: 'L' + b.lesson}; })});
  } else {
    var ps = A.parts;
    if (ps.length === 1 && ps[0].type === 'select'){ var p0 = partOf(b, ps[0], 0, ''); it = Object.assign(base, {type: 'mc', opts: p0.opts, correct: p0.correct, bp: ps[0]}); }
    else if (ps.length === 1){ it = Object.assign(base, {type: 'solo', part: partOf(b, ps[0], 0, '')}); it.part.flab = formLabel(ps[0], b, true); }
    else it = Object.assign(base, {type: 'parts', parts: ps.map(function(p, i){ var q = partOf(b, p, i, 'abcdefgh'.charAt(i)); q.flab = formLabel(p, b, false); return q; })});
  }
  CACHE[b.id] = it;
  return it;
}

/* ------------------------------------------------ judging a typed answer */
function evalT(t, env){
  switch (t.k){
    case 'num': return Number(t.q.n) / Number(t.q.d);
    case 'var': return t.s === 'π' ? Math.PI : (env[t.s] != null ? env[t.s] : NaN);
    case 'grp': return evalT(t.x, env);
    case 'neg': return -evalT(t.x, env);
    case 'pow': return Math.pow(evalT(t.b, env), evalT(t.e, env));
    case 'mul': return evalT(t.a, env) * evalT(t.b, env);
    case 'div': return evalT(t.a, env) / evalT(t.b, env);
    case 'add': return evalT(t.a, env) + evalT(t.b, env);
    case 'root': return Math.sqrt(evalT(t.x, env));
  }
  return NaN;
}
function varsOf(t, out){ out = out || {}; if (!t || typeof t !== 'object') return out; if (t.k === 'var' && t.s !== 'π') out[t.s] = 1; ['x', 'a', 'b', 'e'].forEach(function(k){ if (t[k] && typeof t[k] === 'object') varsOf(t[k], out); }); (t.sides || t.items || []).forEach(function(y){ varsOf(y, out); }); return out; }
var close = function(a, b){ return isFinite(a) && isFinite(b) && Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b)); };
function line1(rel){            /* a relation of two sides in one letter, linear: → {v, root, op, slope} or null */
  if (!rel || rel.k !== 'rel' || rel.ops.length !== 1) return null;
  var vs = Object.keys(varsOf(rel)); if (vs.length !== 1) return null;
  var v = vs[0], f = function(x){ var e = {}; e[v] = x; return evalT(rel.sides[0], e) - evalT(rel.sides[1], e); };
  var f0 = f(0), f1 = f(1), f2 = f(2), f7 = f(-3.7);
  if (!(close(f2 - f1, f1 - f0) && close(f7 - f0, -3.7 * (f1 - f0))) || close(f1 - f0, 0)) return null;
  return {v: v, root: -f0 / (f1 - f0), op: rel.ops[0], slope: f1 - f0};
}
function sameRel(t, k, kind){
  var a = line1(t), b = line1(k); if (!a || !b || a.v !== b.v || !close(a.root, b.root)) return false;
  if (kind === 'equation') return a.op === '=' && b.op === '=';
  if (a.op === '=' || b.op === '=') return false;
  var truth = function(L, x){ var g = L.slope * (x - L.root); return L.op === '<' ? g < 0 : L.op === '>' ? g > 0 : L.op === '<=' ? g <= 1e-12 : g >= -1e-12; };
  return truth(a, a.root + 1) === truth(b, a.root + 1) && truth(a, a.root) === truth(b, a.root);
}
function sameValue(t, k){
  var vt = varsOf(t), vk = varsOf(k), ks = Object.keys(vk);
  if (Object.keys(vt).some(function(v){ return !vk[v]; })) return false;
  var pts = [[1.37, -2.11, 0.53], [-0.71, 3.19, 2.3], [2.9, 0.41, -1.6]];
  return pts.every(function(P){ var e = {}; ks.forEach(function(v, i){ e[v] = P[i % 3] + i * 0.173; }); return close(evalT(t, e), evalT(k, e)); });
}
function clean(a, bp){
  var s = String(a == null ? '' : a).trim();
  s = s.replace(/^(about|approximately|approx\.?)\s+/i, '').replace(/^≈\s*/, '');
  s = s.replace(/\bsqrt\s*/gi, '√');
  if (bp.unit){                                            /* the box's unit typed after the number, in any of its spellings */
    var u = String(bp.unit).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), u2 = u.replace(/²/g, '(?:²|\\^2|2)').replace(/³/g, '(?:³|\\^3|3)');
    s = s.replace(new RegExp('\\s*(?:' + u2 + ')\\.?$', 'i'), '').trim();
    var w = String(bp.unit).split(' ')[0];
    if (/^[a-z]{3,}$/i.test(w)) s = s.replace(new RegExp('\\s+' + w.replace(/s$/, '') + '\\w*(\\s+\\w+){0,3}$', 'i'), '').trim();
  }
  if (bp.type === 'number' || bp.type === 'sci') s = s.replace(/\s*°$/, '');
  return s;
}
function formFor(bp){ return {money: !!bp.money, percent: !!bp.percent, precision: bp.precision || null, v: bp.pre ? bp.pre.replace(/\s*=\s*$/, '') : null, expect: bp.type === 'number' ? 'number' : null, simplest: true}; }
function judgePart(p, typed){
  var bp = p.bp, s = clean(typed, bp);
  if (!s) return {v: 'blank', what: []};
  var f = formFor(bp), keys = [bp.key].concat(bp.alts || []), o = {money: f.money, percent: f.percent};
  var tt = K.Ans.parse(s, o);
  if (!tt) return {v: 'unread', what: ['I can’t read that yet. Type just your answer' + (bp.unit ? ' (the box already says ' + esc(bp.unit) + ')' : '') + '.']};
  for (var i = 0; i < keys.length; i++){
    var r = null; try { r = K.Ans.equiv(s, String(keys[i]), f); } catch(e){}
    if (r && r.ok) return {v: 'right', what: r.nudge ? [esc(r.nudge)] : []};
    var kt = K.Ans.parse(String(keys[i]), o); if (!kt) continue;
    if ((bp.equiv === 'equation' || bp.equiv === 'inequality') && sameRel(tt, kt, bp.equiv)) return {v: 'right', what: []};
    if (bp.equiv === 'expression' && tt.k !== 'rel' && sameValue(tt, kt)) return {v: 'right', what: []};
  }
  /* the right value in another form than the question asks: "Almost" */
  var kt0 = K.Ans.parse(String(bp.key), o);
  if (kt0 && tt.k !== 'rel' && kt0.k !== 'rel' && !Object.keys(varsOf(tt)).length && !Object.keys(varsOf(kt0)).length){
    var a = evalT(tt, {}), b = evalT(kt0, {}), shape = K.Ans.shape(kt0);
    if (isFinite(a) && isFinite(b) && Math.abs(a - b) <= Math.max(0.005 * Math.abs(b), 1e-9)){
      var hasPi = /π/.test(String(bp.key));
      if (hasPi) return {v: 'form', what: ['That is its value. The question asks for it in terms of π: keep π in the answer.']};
      if (shape === 'sci') return {v: 'form', what: ['That is its value. Write it in scientific notation, like 3.2 × 10^5.']};
      if (shape === 'power') return {v: 'form', what: ['That is its value. The question asks for it as a power.']};
      if (bp.precision && !close(a, b)) return {v: 'wrong', what: []};
      if (shape === 'fraction' || shape === 'mixed') return {v: 'form', what: ['That is close, but not exact. Give the exact value as a fraction.']};
    }
  }
  return {v: 'wrong', what: []};
}
U.judge.text = function(p, typed, ctx){ return p && p.bank ? judgePart(p, typed) : OJ.text(p, typed, ctx); };
U.judge.nline = function(p, which, g, ctx){ return p && p.bank ? '' : (OJ.nline ? OJ.nline(p, which, g, ctx) : ''); };   /* a bank graph: the kit's own three lines */
U.judge.mc = function(x, k){ return x && x.bank ? {v: +k === x.correct ? 'right' : 'wrong', what: []} : OJ.mc(x, k); };
U.judge.multi = function(x, ks, tries){
  if (!(x && x.bank)) return OJ.multi(x, ks, tries);
  var picked = (ks || []).map(Number), C = x.correct, bad = picked.filter(function(k){ return C.indexOf(k) < 0; }), missed = C.filter(function(k){ return picked.indexOf(k) < 0; });
  if (!bad.length && !missed.length) return {v: 'right', what: []};
  var w = [];
  if (bad.length) w.push(bad.length === 1 ? 'One of the choices you picked is not true.' : bad.length + ' of the choices you picked are not true.');
  if (missed.length) w.push(missed.length === 1 ? 'One more choice is right too.' : missed.length + ' more choices are right too.');
  return {v: 'wrong', what: w};
};

/* ------------------------------------------------ the help ladder: Cadence's worked solution, one step per line */
function steps(b){ return (b.solution || []).map(function(sg){ return {say: segHtml(sg), ex: null}; }); }
/* the first sentence of a run of segments, and the rest */
function firstSentence(segs){
  var out = [], rest = [], cut = false;
  (segs || []).forEach(function(g){
    if (cut){ rest.push(g); return; }
    if (typeof g === 'string'){ var m = /^([\s\S]*?[.?!])(\s+[A-Z(][\s\S]*)$/.exec(g); if (m){ out.push(m[1]); rest.push(m[2].replace(/^\s+/, '')); cut = true; return; } }
    out.push(g);
  });
  return {first: out, rest: rest};
}
function hideEnd(segs){                                    /* a step that ends in the answer: its last "= …" kept back */
  var s = (segs || []).slice();
  for (var i = s.length - 1; i >= 0; i--){
    if (typeof s[i] !== 'string' && s[i][0].lastIndexOf('=') > 0){ var t = s[i][0]; return s.slice(0, i).concat([[t.slice(0, t.lastIndexOf('=')) + '= \\;?', s[i][1]]]); }
    if (typeof s[i] === 'string' && /=\s*[^=]*$/.test(s[i]) && s[i].lastIndexOf('=') > 0){ return s.slice(0, i).concat([s[i].slice(0, s[i].lastIndexOf('=')) + '= ?']); }
  }
  return null;
}
function rungsOf(b){
  var sol = b.solution || [], L = LES[b.lesson], sk = (L.skills || [])[b.sk] || '';
  var fs = sol.length ? firstSentence(sol[0]) : {first: [], rest: []};
  var notice = (sk ? '<b>' + esc(sk.charAt(0).toUpperCase() + sk.slice(1)) + '.</b> ' : '') + segHtml(fs.first);
  var first = null;
  if (fs.rest.length && segPlain(fs.rest).length > 2) first = sol.length > 1 ? {say: segHtml(fs.rest)} : {say: segHtml(hideEnd(fs.rest) || fs.rest)};
  else if (sol.length >= 3) first = {say: segHtml(sol[1])};
  else if (sol.length === 2) first = {say: segHtml(hideEnd(sol[1]) || sol[1])};
  return {notice: notice || 'Read the question again: what does it ask for, and what do you know already?', first: first, steps: steps(b)};
}
U.solution = function(x, type, ctx){ return x && x.bank ? steps(x.bank) : OSOL(x, type, ctx); };
U.rungs = function(x, type, ctx){ return x && x.bank ? rungsOf(x.bank) : (ORUNGS ? ORUNGS(x, type, ctx) : null); };
U.walk = function(x, type, ctx){ return x && x.bank ? null : OWALK(x, type, ctx); };

/* ------------------------------------------------ the keys a check types, the sameness key, the view */
function keyTextOf(p){ var bp = p.bp; if (!bp) return ''; return bp.type === 'select' ? '' : bp.type === 'nline' ? K.NL.keyText(bp.graph) : String(bp.key); }
U.key = function(p){ return p && p.bank ? 'bank:' + p.bank.id + ':' + (p.bpi == null ? '' : p.bpi) : OKEY(p); };
U.keyText = function(p){ return p && p.bank ? keyTextOf(p) : (OKT ? OKT(p) : ''); };
function keyHtmlOf(p){
  var bp = p.bp; if (!bp) return '';
  if (bp.type === 'select') return p.opts ? p.opts[p.correct] : '';
  if (bp.type === 'nline') return K.NL.keyHtml(p);
  return (bp.pre ? esc(bp.pre) + ' ' : '') + segHtml(bp.keyS || [String(bp.key)]) + (bp.unit ? ' ' + esc(bp.unit) : '');
}
V.stem = function(it){ return it && it.bank ? it.stemHtml : O.stem(it); };
V.figure = function(it){ return it && it.bank ? figHtml(it.bank) : O.figure(it); };
V.line = function(p){ return p && p.bank ? p.lineHtml || '' : O.line(p); };
V.pre = function(p){ return p && p.bank ? (p.bp && p.bp.pre ? esc(p.bp.pre) : '') : O.pre(p); };
V.unit = function(p){ return p && p.bank ? (p.bp && p.bp.unit || '') : O.unit(p); };
V.placeholder = function(p){ return p && p.bank ? '' : O.placeholder(p); };
V.opt = function(x, k){ return x && x.bank ? x.opts[k] : O.opt(x, k); };
V.why = function(x, k){ return x && x.bank ? '' : (O.why ? O.why(x, k) : ''); };
V.key = function(p){ return p && p.bank ? keyHtmlOf(p) : O.key(p); };
V.form = function(p){ if (p && p.bank){ var bp = p.bp || {}; return {label: p.flab || '', equiv: false, precision: bp.precision || null, money: !!bp.money, percent: !!bp.percent}; } return O.form ? O.form(p) : null; };
V.skill = function(it){ return it && it.bank ? '' : (O.skill ? O.skill(it) : ''); };
V.start = function(x, type){ return x && x.bank ? '' : O.start(x, type); };
V.ex = function(x, ex, type){ return x && x.bank ? ex : O.ex(x, ex, type); };
V.picture = function(x, type){ return x && x.bank ? '' : O.picture(x, type); };
V.pretty = function(t, kind){ return kind === 'bank' ? '' : (O.pretty ? O.pretty(t, kind) : ''); };
if (O.blank) V.blank = function(p){ return p && p.bank ? '' : O.blank(p); };

/* ------------------------------------------------ what ui.js asks */
K.Bank = {
  /* the practice choices, after the unit's own (the menu groups them under "Lessons") */
  scopes: function(SCOPES){ SCKEYS.forEach(function(k){ SCOPES[k] = scopeName(k); }); },
  isLesson: function(scope){ return !!SC[scope]; },
  shown: function(scope){ return !!(SC[scope] && SC[scope].show); },
  keys: function(){ return SCKEYS.slice(); },
  /* the sections of a lesson set: one per Cadence lesson of the choice */
  sections: function(scope, seed){
    var s = SC[scope], ids = setIds(scope, seed), out = [];
    s.lessons.forEach(function(lid){
      var mine = ids.filter(function(id){ return BYID[id].lesson === lid; });
      if (!mine.length) return;
      var title = s.lessons.length > 1 ? (function(){ var k2 = SCKEYS.filter(function(k){ return SC[k].show && SC[k].lessons.length === 1 && SC[k].lessons[0] === lid; })[0]; return k2 ? scopeName(k2) : niceTitle(LES[lid].title); })() : scopeName(scope);
      out.push({title: '<span translate="no">' + esc(title) + '</span>', items: mine.map(function(id){ return {it: kitItem(BYID[id]), keep: null, si: 'b:' + id, ii: 0}; })});
    });
    return out;
  },
  /* "U9·L3·7": the unit, the lesson, the item's place in that lesson's bank (the same in every set and on every printout) */
  qid: function(item){ var b = item.bank, lid = String(b.lesson), m = /^(\d+)\.(\d+)$/.exec(lid); return {id: 'U' + UNO + '·L' + (m && m[1] === UNO ? m[2] : lid) + '·' + b.n}; },
  /* "Try a similar one": another item of the same lesson — the same Cadence template where there is one, the same kind of
     answer (for a part, the same parts), the same rigor — never one in this set or served before for this question; unused on
     this device first */
  similar: function(baseIt, seen, inSet){
    var b = baseIt.item.bank, L = LES[b.lesson], sig = function(x){ var A = x.answer; return A.kind + ':' + (A.parts ? A.parts.map(function(p){ return p.type; }).join(',') : ''); };
    var part = baseIt.item.type === 'parts', u = used(b.lesson), want = sig(b);
    var ok = L.items.filter(function(x){ return x.id !== b.id && !off(x.id) && inSet.indexOf(x.id) < 0 && seen.indexOf(x.id) < 0 && (!part || sig(x) === want) && (part || x.answer.kind === b.answer.kind || (x.answer.kind !== 'free' && b.answer.kind !== 'free')); });
    if (!ok.length) ok = L.items.filter(function(x){ return x.id !== b.id && !off(x.id) && (!part || sig(x) === want); });
    if (!ok.length) return null;
    var score = function(x){ return (x.gen === b.gen ? 4 : 0) + (x.rigor === b.rigor ? 2 : 0) + (u.indexOf(x.id) < 0 ? 1 : 0); };
    var best = Math.max.apply(null, ok.map(score)), top = ok.filter(function(x){ return score(x) === best; });
    var pick = top[Math.floor(Math.random() * top.length)];
    markUsed(b.lesson, [pick.id]);
    return pick.id;
  },
  /* the kit's atPos for a fresh bank item: the item, and the part at the base's place */
  at: function(id, base){
    var b = BYID[id]; if (!b) return null;
    var it = kitItem(b);
    var tt = function(pt){ return pt.kind === 'mc' ? 'mc' : pt.kind === 'nline' ? 'nline' : 'text'; };
    if (it.type === 'parts'){ var pi = base.x && base.x.bpi != null ? base.x.bpi : 0, pt = it.parts[Math.min(pi, it.parts.length - 1)]; return {type: tt(pt), part: pt, x: pt, item: it}; }
    if (it.type === 'solo') return {type: tt(it.part), part: it.part, x: it.part, item: it};
    return {type: it.type === 'multi' ? 'multi' : 'mc', x: it, item: it};
  },
  /* the title and the eyebrow in a lesson choice: "GRADE 7 MATH · UNIT 9 · LESSON 9.03 PRACTICE", the lesson's title */
  head: function(scope){
    var s = SC[scope]; if (!s) return null;
    var what = s.label ? s.label : s.day ? 'Lessons ' + s.code.replace('+', '–') : 'Lesson ' + s.code;
    var eb = /Practice\s*$/.test(U.eyebrow || '') ? String(U.eyebrow).replace(/Practice\s*$/, esc(what) + ' Practice') : (U.eyebrow || '') + ' &nbsp;·&nbsp; ' + esc(what) + ' Practice';
    return {eyebrow: eb, h1: esc(s.title), title: String(U.title || '').replace(/Practice Test\s*$/, '') + what + ' Practice'};
  },
  name: scopeName,
  /* the keypad's keys for a bank box (every key a Cadence answer may need) */
  keypad: [{label: '−', say: 'minus', ins: function(){ return '-'; }, kinds: ['bank']}, {label: '/', say: 'fraction bar', kinds: ['bank']}, {label: 'a/b', say: 'a fraction', tpl: 'frac', kinds: ['bank']},
    {label: '^', say: 'power', kinds: ['bank']}, {label: '(', say: 'open parenthesis', kinds: ['bank']}, {label: ')', say: 'close parenthesis', kinds: ['bank']},
    {label: 'π', say: 'pi', kinds: ['bank']}, {label: '×', say: 'times', ins: function(){ return '*'; }, kinds: ['bank']}, {label: '√', say: 'square root', kinds: ['bank']},
    {label: '=', say: 'equals', kinds: ['bank']},
    {label: '<', say: 'less than', kinds: ['bank']}, {label: '≤', say: 'less than or equal to', kinds: ['bank']}, {label: '≥', say: 'greater than or equal to', kinds: ['bank']}, {label: '>', say: 'greater than', kinds: ['bank']}],
  _judge: judgePart, _lessons: LES, _byId: BYID, _scopes: SC, _kitItem: kitItem, _texText: texText
};
})();
