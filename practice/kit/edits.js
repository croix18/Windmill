/* Practice-test kit — the edits layer (7 Nov 2026; Croix: "I also want the ability across the board to edit test questions").

   The questions are generated: a question is a FAMILY (a slot's builder, e.g. M7 Unit 10's "solveAdd/graphAdd") that draws
   ~100,000 sets of numbers. So an edit is never to one set's numbers. The teacher edits, from the cockpit on mrshaffer.org:
     - a family's WORDING — its stem and its parts' lines — as a template in which every generated value is a placeholder,
       {{n1}} {{m1}} {{v1}} {{who}} …; the template is filled with each set's own values when the page draws it;
     - whether a family is HIDDEN (left out of new sets; a set already saved on a device keeps what it had);
     - its POINTS (per lettered part), its HINT 1 ("What to notice"), and a note only he sees;
     - a lesson item from Cadence (its stem, its key, hidden);
     - his own CUSTOM questions (a number, an expression, words, a choice, an inequality, a number-line graph), added to a
       section of the practice test or to "More questions" at its end.
   The edits live in the site's Worker (GET /api/items/<course>/<unit>); the course repositories stay the source of truth.
   This file fetches them on the site and applies them as the page draws, so the student page, its printouts and the
   teacher copy's tests, keys and make-ups all show the same thing. Off the site (a claude.ai artifact, a Google Sites
   download, the checks) it does nothing at all.

   How a template is made (extract) and filled (fill): the stem as the unit's view draws it is cut into the kit's own markup
   and placeholders. Text stays text; a number, an amount of money or a percent in the text becomes {{nK}} (with the "a" or
   "an" before it, which depends on the number); a name or a word the set drew (its parameter object's string values, e.g.
   who: "Kai", item: "guitar") becomes {{<parameter>}}; <i>x</i> becomes {{vK}}; every other element — a math span, a
   "shown" display line, a fraction, a power — becomes {{mK}} whole. <br> is a new line, <b> is **bold**. Filling puts the
   set's own HTML for each placeholder back, so extract → fill is the stem exactly (check/edits.js holds that for every
   family of every published unit). A family whose wording itself varies between sets (its stories) has one template per
   WORDING — the variant's id is a hash of its template — and an edit names the variant it was made for; a family written
   in more than MAXV ways, or whose stem is all generated math, is "wording not editable", and says why.

   The markup of an edit (and of a custom question): words; $…$ for TeX (drawn by tex.js and the inlined KaTeX, as Cadence's
   items are), $$…$$ for a display line; **bold**; a new line; \$ for a dollar sign; {{name}} for a value. Every character
   typed is escaped: nothing typed becomes HTML. */
(function (root) {
'use strict';
var node = typeof module !== 'undefined' && module.exports;
var MAXV = 12, MAXLEN = 1200;

/* ------------------------------------------------ HTML → nodes (the kit's own, well-formed HTML) */
var VOID = {br: 1, img: 1, input: 1, wbr: 1, hr: 1};
var ENT = {nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", thinsp: ' ', ensp: ' ', emsp: ' ', minus: '−', times: '×',
  divide: '÷', le: '≤', ge: '≥', middot: '·', hellip: '…', mdash: '—', ndash: '–', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', deg: '°', pi: 'π', frac12: '½', cent: '¢', ne: '≠', asymp: '≈'};
function decode(s){
  return String(s).replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]*);/gi, function(m, e){
    if (e[0] === '#') { var n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); return isFinite(n) ? String.fromCodePoint(n) : m; }
    return ENT[e] != null ? ENT[e] : m;
  });
}
function esc(s){ return String(s == null ? '' : s).replace(/[&<>"]/g, function(c){ return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]; }); }
function nodes(html){
  var s = String(html == null ? '' : html), out = [], i = 0, n = s.length;
  while (i < n){
    var lt = s.indexOf('<', i);
    if (lt < 0){ out.push({t: 'text', v: decode(s.slice(i))}); break; }
    if (lt > i) out.push({t: 'text', v: decode(s.slice(i, lt))});
    var gt = s.indexOf('>', lt); if (gt < 0){ out.push({t: 'text', v: decode(s.slice(lt))}); break; }
    var open = s.slice(lt, gt + 1), m = /^<([a-zA-Z][a-zA-Z0-9]*)/.exec(open);
    if (!m){ out.push({t: 'raw', v: open}); i = gt + 1; continue; }         /* a stray close or comment: kept as it is, never editable */
    var tag = m[1].toLowerCase();
    if (VOID[tag] || /\/>$/.test(open)){ out.push({t: 'el', tag: tag, html: open, inner: ''}); i = gt + 1; continue; }
    var depth = 1, j = gt + 1, re = new RegExp('<(/?)' + tag + '(?=[\\s>/])[^>]*>', 'gi'), mm;
    re.lastIndex = j;
    while (depth && (mm = re.exec(s))){ if (mm[1]) depth--; else if (!/\/>$/.test(mm[0])) depth++; j = re.lastIndex; }
    if (depth){ out.push({t: 'raw', v: s.slice(lt)}); break; }
    out.push({t: 'el', tag: tag, html: s.slice(lt, j), inner: s.slice(gt + 1, j - tag.length - 3)});
    i = j;
  }
  return out;
}

/* ------------------------------------------------ extract: a stem → {tpl, vals, ph} */
var NUMW = 'Zero|One|Two|Three|Four|Five|Six|Seven|Eight|Nine|Ten|Eleven|Twelve';
/* text: numbers (money, percent, fractions, decimals, with commas), the article in front of them, the set's words */
function textTok(s, words, ctr, vals){
  var parts = [], re = new RegExp('(?:\\b(an?|An?) )?(?:(\\$\\d[\\d,]*(?:\\.\\d+)?)|([−-]?\\d[\\d,]*(?:\\.\\d+)?(?:\\/\\d+)?%?)|\\b(' + NUMW + '|' + NUMW.toLowerCase().replace(/^zero\|one\|/, '') + ')\\b' + (words.length ? '|\\b(' + words.map(function(w){ return w.v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }).join('|') + ')\\b' : '') + ')', 'g'), m, last = 0;
  while ((m = re.exec(s))){
    if (!m[0]) { re.lastIndex++; continue; }
    parts.push(lit(s.slice(last, m.index)));
    var name;
    if (m[5]){ var w = words.filter(function(x){ return x.v === m[5]; })[0]; name = w.k; }
    else if (m[4]) name = 'w' + (++ctr.w);
    else name = 'n' + (++ctr.n);
    if (vals[name] != null && vals[name] !== esc(m[0])) name = name + '_' + (++ctr.x);      /* the same word twice with another article */
    vals[name] = esc(m[0]); parts.push('{{' + name + '}}');
    last = re.lastIndex;
  }
  parts.push(lit(s.slice(last)));
  return parts.join('');
}
/* literal text in a template: the markup's own characters escaped; whitespace as the browser shows it */
function lit(s){ return s.replace(/\s*\n\s*/g, ' ').replace(/\\/g, '\\\\').replace(/\$/g, '\\$').replace(/\{\{/g, '\\{{').replace(/\*\*/g, '\\*\\*'); }
/* the set's words: string values of its parameters that are names (Kai) or words of four letters or more (guitar) */
function wordsOf(prm){
  var out = [], seen = {};
  (function walk(o, pre){
    if (!o || typeof o !== 'object') return;
    Object.keys(o).sort().forEach(function(k){
      var v = o[k];
      if (typeof v === 'string' && (/^[A-Z][a-z]{1,}$/.test(v) || /^[a-z]{4,}$/.test(v)) && !seen[v]){ seen[v] = 1; out.push({k: /^[a-z][a-z0-9]*$/i.test(k) ? k.toLowerCase() : 'w', v: v}); }
    });
  })(prm);
  /* the longest first, so "Ana" never takes the start of "Anabel" */
  return out.sort(function(a, b){ return b.v.length - a.v.length; });
}
function extract(html, prm){
  var ctr = {n: 0, m: 0, v: 0, w: 0, x: 0}, vals = {}, words = wordsOf(prm), out = [], raw = false;
  nodes(html).forEach(function(nd){
    if (nd.t === 'text') out.push(textTok(nd.v, words, ctr, vals));
    else if (nd.t === 'raw'){ raw = true; var nm0 = 'm' + (++ctr.m); vals[nm0] = nd.v; out.push('{{' + nm0 + '}}'); }
    else if (nd.tag === 'br') out.push('\n');
    else if ((nd.tag === 'b' || nd.tag === 'strong') && nd.inner.indexOf('<') < 0 && nd.inner.trim()) out.push('**' + textTok(decode(nd.inner), words, ctr, vals) + '**');
    else { var nm = (nd.tag === 'i' ? 'v' + (++ctr.v) : 'm' + (++ctr.m)); vals[nm] = nd.html; out.push('{{' + nm + '}}'); }
  });
  var tpl = out.join('').replace(/^ +| +$/g, '');
  var ph = phOf(tpl);
  return {tpl: tpl, vals: vals, ph: ph, vh: vhash(tpl), raw: raw};
}
function phOf(tpl){ var ph = []; lex(tpl).forEach(function(x){ if (x.k === 'ph' && ph.indexOf(x.v) < 0) ph.push(x.v); }); return ph.sort(); }
function fnv(str){ var h = 0x811c9dc5; for (var i = 0; i < str.length; i++){ h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h >>> 0; }
function vhash(tpl){ return fnv(tpl).toString(36); }
/* is there anything to edit? (a stem that is only generated values has no wording) */
function wordsLeft(tpl){ return tpl.replace(/\{\{[a-z0-9_]+\}\}/gi, '').replace(/[\s.,:;?!()*\\ ]+/g, '').length > 0; }

/* ------------------------------------------------ the markup → HTML (a template filled, or a custom question) */
var TT = {'\\times': '×', '\\cdot': '·', '\\div': '÷', '\\le': '≤', '\\ge': '≥', '\\ne': '≠', '\\approx': '≈', '\\pm': '±', '\\pi': 'π', '\\circ': '°', '\\%': '%', '\\$': '$', '\\,': ' ', '\\;': ' ', '\\ ': ' ', '\\left': '', '\\right': ''};
function texText(t){
  var s = String(t).replace(/\\[dt]?frac\{([^{}]*)\}\{([^{}]*)\}/g, '$1/$2').replace(/\\(?:text|mathrm|textbf|mathbf|operatorname)\{([^{}]*)\}/g, '$1');
  s = s.replace(/\\[A-Za-z]+|\\./g, function(m){ return TT[m] != null ? TT[m] : ''; });
  return s.replace(/\^\{([^{}]*)\}/g, '^$1').replace(/_\{([^{}]*)\}/g, '$1').replace(/[{}]/g, '').replace(/\s+/g, ' ').trim();
}
function texSpan(tex, disp){ return '<span class="m' + (disp ? ' mdisp' : '') + '" data-tex="' + esc(tex) + '"' + (disp ? ' data-disp=""' : '') + '>' + esc(texText(tex)) + '</span>'; }
/* → a list of pieces: {k:'t', v} text, {k:'tex', v, disp}, {k:'ph', v}, {k:'b', on}, {k:'br'} */
function lex(src){
  var s = String(src == null ? '' : src).replace(/\r\n?/g, '\n'), out = [], buf = '', i = 0, n = s.length, bold = false;
  var flush = function(){ if (buf){ out.push({k: 't', v: buf}); buf = ''; } };
  while (i < n){
    var c = s[i];
    if (c === '\\' && i + 1 < n && '\\${*}'.indexOf(s[i + 1]) >= 0){ buf += s[i + 1]; i += 2; continue; }
    if (c === '{' && s[i + 1] === '{'){
      var e = s.indexOf('}}', i + 2), nm = e > 0 ? s.slice(i + 2, e) : '';
      if (e > 0 && /^[a-z][a-z0-9_]*$/i.test(nm)){ flush(); out.push({k: 'ph', v: nm}); i = e + 2; continue; }
    }
    if (c === '$'){
      var disp = s[i + 1] === '$', st = i + (disp ? 2 : 1), close = s.indexOf(disp ? '$$' : '$', st);
      while (close > 0 && s[close - 1] === '\\') close = s.indexOf(disp ? '$$' : '$', close + 1);
      if (close < 0){ out.push({k: 'err', v: 'A $ has no closing $. Write \\$ for a dollar sign.'}); buf += s.slice(i); break; }
      flush(); out.push({k: 'tex', v: s.slice(st, close).trim(), disp: disp}); i = close + (disp ? 2 : 1); continue;
    }
    if (c === '*' && s[i + 1] === '*'){ flush(); bold = !bold; out.push({k: 'b', on: bold}); i += 2; continue; }
    if (c === '\n'){ flush(); out.push({k: 'br'}); i++; continue; }
    buf += c; i++;
  }
  flush();
  if (bold) out.push({k: 'b', on: false, unclosed: true});
  return out;
}
var BADTEX = /\\(href|url|html[A-Za-z]*|includegraphics|def|newcommand|renewcommand|let|input|include|write|class|id|data|style)\b/;
/* what is wrong with a piece of markup, in a sentence each ([] when nothing is) — the Worker says the same (items.js) */
function problems(src, ph, opt){
  opt = opt || {};
  var p = [], s = String(src == null ? '' : src);
  if (!s.trim()) p.push(opt.what ? 'Write the ' + opt.what + '.' : 'Write something.');
  if (s.length > (opt.max || MAXLEN)) p.push('At most ' + (opt.max || MAXLEN) + ' characters (this is ' + s.length + ').');
  if (/<\s*\/?\s*[a-zA-Z!]/.test(s.replace(/\$[^$]*\$/g, ''))) p.push('HTML tags are not allowed: write words, $math$ and **bold**.');
  var L = lex(s), got = [];
  L.forEach(function(x){
    if (x.k === 'err') p.push(x.v);
    if (x.k === 'b' && x.unclosed) p.push('A ** has no closing **.');
    if (x.k === 'tex' && BADTEX.test(x.v)) p.push('That TeX command is not allowed here: ' + BADTEX.exec(x.v)[0] + '.');
    if (x.k === 'tex' && !x.v) p.push('An empty $$ math.');
    if (x.k === 'ph' && got.indexOf(x.v) < 0) got.push(x.v);
  });
  if (ph){
    var miss = ph.filter(function(k){ return got.indexOf(k) < 0; }), extra = got.filter(function(k){ return ph.indexOf(k) < 0; });
    if (miss.length) p.push('Keep every value: ' + miss.map(function(k){ return '{{' + k + '}}'; }).join(' ') + (miss.length === 1 ? ' is' : ' are') + ' missing.');
    if (extra.length) p.push(extra.map(function(k){ return '{{' + k + '}}'; }).join(' ') + (extra.length === 1 ? ' is not a value of this question.' : ' are not values of this question.'));
  } else if (got.length) p.push('{{…}} values belong to the practice test’s own questions; write the numbers here.');
  return p;
}
/* markup → HTML; vals fills the placeholders with the set's own (trusted, kit-made) HTML */
function fill(src, vals){
  var h = [];
  lex(src).forEach(function(x){
    if (x.k === 't') h.push(esc(x.v).replace(/ /g, '&nbsp;'));
    else if (x.k === 'tex') h.push(texSpan(x.v, x.disp));
    else if (x.k === 'ph') h.push(vals && vals[x.v] != null ? vals[x.v] : esc('{{' + x.v + '}}'));
    else if (x.k === 'b') h.push(x.on ? '<b>' : '</b>');
    else if (x.k === 'br') h.push('<br>');
  });
  return h.join('');
}
/* the same HTML as the browser shows it: entities read, whitespace as one space, attributes in order (for the round trip) */
function canon(html){
  return nodes(html).map(function(nd){
    if (nd.t === 'text') return esc(nd.v).replace(/ /g, '&nbsp;').replace(/\s+/g, ' ');
    if (nd.t === 'raw') return nd.v;
    if (nd.tag === 'br') return '<br>';
    return nd.html;
  }).join('').replace(/^ +| +$/g, '');
}

/* ------------------------------------------------ a unit's families */
function partsOf(it){ return it.type === 'parts' ? it.parts : it.type === 'solo' ? [it.part] : [it]; }
function famKey(it){ var fs = []; partsOf(it).forEach(function(p){ var f = p && (p.fam || (p === it.part ? it.fam : '')); if (typeof f === 'string' && f && fs.indexOf(f) < 0) fs.push(f); }); if (!fs.length && typeof it.fam === 'string') fs.push(it.fam); return fs.join('/'); }
function prmOf(it){ var o = {}; [it].concat(partsOf(it)).forEach(function(p){ var x = p && p.prm; if (x && typeof x === 'object') Object.keys(x).forEach(function(k){ if (o[k] == null) o[k] = x[k]; }); }); return o; }
/* the fields of an item a teacher may word: its stem, and the line of each lettered part */
function fieldsOf(it, view){
  var f = [{f: 'stem', html: view.stem(it)}];
  if (it.type === 'parts') it.parts.forEach(function(p){ f.push({f: 'line:' + p.label, html: view.line(p), part: p}); });
  return f;
}
/* every family of a unit, by sampling its sets (the cockpit's list; check/edits.js) */
function survey(U, view, n){
  view = view || U.view; n = n || 600;
  var fams = {}, order = [], g0 = U.generate(1), qord = 0, slots = [];
  g0.sections.forEach(function(sec, si){ sec.items.forEach(function(it, ii){ slots.push({si: si, ii: ii, qn: ++qord}); }); });
  for (var s = 1; s <= n; s++){
    var g = U.generate(s);
    g.sections.forEach(function(sec, si){ sec.items.forEach(function(it, ii){
      var fk = famKey(it), F = fams[fk];
      if (!F){ var sl = slots.filter(function(x){ return x.si === si && x.ii === ii; })[0]; F = fams[fk] = {fk: fk, si: si, ii: ii, qn: sl ? sl.qn : 0, type: it.type, parts: partsOf(it).map(function(p){ return {label: it.type === 'parts' ? p.label : '', kind: p.kind || it.type}; }), fields: {}, n: 0}; order.push(fk); }
      F.n++;
      var prm = prmOf(it);
      fieldsOf(it, view).forEach(function(fd){
        var x = extract(fd.html, prm), V = F.fields[fd.f] || (F.fields[fd.f] = {variants: {}, order: []});
        var v = V.variants[x.vh];
        if (!v){ v = V.variants[x.vh] = {vh: x.vh, tpl: x.tpl, ph: x.ph, count: 0, samples: [], raw: x.raw}; V.order.push(x.vh); }
        v.count++; if (v.samples.length < 3) v.samples.push({seed: s, html: fd.html, vals: x.vals});
      });
    }); });
  }
  return order.map(function(fk){
    var F = fams[fk];
    Object.keys(F.fields).forEach(function(f){
      var V = F.fields[f], vs = V.order.map(function(h){ return V.variants[h]; }).sort(function(a, b){ return b.count - a.count; });
      V.variants = vs; delete V.order;
      if (vs.length > MAXV) V.why = 'Its wording is put together from its numbers: ' + vs.length + ' different wordings came up in ' + n + ' sets, so there is no one sentence to edit.';
      else if (vs.every(function(v){ return !wordsLeft(v.tpl); })) V.why = 'It is all generated mathematics: there are no words in it to change.';
      else if (vs.some(function(v){ return v.raw; })) V.why = 'It is drawn with markup the editor cannot keep.';
      V.editable = !V.why;
    });
    return F;
  });
}

/* ------------------------------------------------ the edits, applied to a generated set */
var DATA = {edits: [], custom: [], v: ''}, BYF = {}, BYB = {};
function use(d){
  DATA = d && typeof d === 'object' ? {edits: d.edits || [], custom: d.custom || [], v: d.v || ''} : {edits: [], custom: [], v: ''};
  BYF = {}; BYB = {};
  DATA.edits.forEach(function(e){ if (e.target_kind === 'family') BYF[e.target] = e; else if (e.target_kind === 'bank') BYB[e.target] = e; });
  if (root.Kit && root.Kit.Bank && root.Kit.Bank._clear) root.Kit.Bank._clear();
}
function any(){ return DATA.edits.length > 0 || DATA.custom.length > 0; }
function hiddenFams(){ return DATA.edits.filter(function(e){ return e.target_kind === 'family' && e.hidden; }).map(function(e){ return e.target; }).sort(); }
function sameSet(a, b){ a = (a || []).slice().sort(); b = (b || []).slice().sort(); return a.length === b.length && a.every(function(x, i){ return x === b[i]; }); }
/* one template of an edit for one field and wording: {t, ph} or null */
function overrideOf(e, field, vh){
  if (!e) return null;
  var m = field === 'stem' ? e.stem : e.label && e.label[field.slice(5)];
  return m && m[vh] && typeof m[vh].t === 'string' ? m[vh] : null;
}
/* an item, edited: _est (the stem's HTML), part._eln (a line's), _pts, _coach, _hid, _ed (what changed), _edMiss (an edit made
   for a wording the item no longer has: not applied, and the teacher copy says so). An edit row's fields (the Worker's
   items.js): stem {<wording id>: {t, ph}}, label {<part letter>: {<wording id>: {t, ph}}}, hidden, points {<letter or ''>: n},
   coach (Hint 1's words), note (the teacher's own; never sent to the page). */
function applyItem(it, view, qn){
  var fk = famKey(it), e = BYF[fk];
  it._fk = fk; if (qn) it._qn = qn;
  if (!e) return it;
  var prm = prmOf(it), ed = [];
  fieldsOf(it, view).forEach(function(fd){
    var x = extract(fd.html, prm), ov = overrideOf(e, fd.f, x.vh);
    if (!ov) return;
    if (!sameSet(ov.ph, x.ph)){ it._edMiss = (it._edMiss || 0) + 1; return; }
    var h = fill(ov.t, x.vals);
    if (fd.f === 'stem') it._est = h; else fd.part._eln = h;
    ed.push(fd.f === 'stem' ? 'wording' : 'part ' + fd.f.slice(5));
  });
  if (e.points && typeof e.points === 'object') partsOf(it).forEach(function(p){ var k = it.type === 'parts' ? p.label : ''; var v = e.points[k]; if (Number.isInteger(v) && v >= 0 && v <= 20 && v !== 1){ p._pts = v; if (ed.indexOf('points') < 0) ed.push('points'); } });
  if (typeof e.coach === 'string' && e.coach.trim()){ var ch = fill(e.coach, null); partsOf(it).forEach(function(p){ p._coach = ch; }); ed.push('hint'); }
  if (e.hidden){ it._hid = true; ed.push('hidden'); }
  if (ed.length) it._ed = ed;
  return it;
}
/* a custom question as an item of Cadence's shape (bank.js draws, judges and helps with it) */
function segsOf(src){
  var segs = [];
  lex(src).forEach(function(x){
    if (x.k === 't') segs.push(esc(x.v));
    else if (x.k === 'tex') segs.push([x.v, x.disp ? 1 : 0]);
    else if (x.k === 'b') segs.push(x.on ? '<b>' : '</b>');
    else if (x.k === 'br') segs.push('<br>');
  });
  return segs;
}
var TYPES = {number: 'A number', expression: 'An expression', text: 'Words', mc: 'A choice', inequality: 'An inequality', nline: 'A graph on a number line'};
function customBank(c, n){
  var b = {id: 'c-' + c.id, lesson: 'custom', rigor: false, gen: 0, n: n, custom: true, stem: segsOf(c.stem), solution: String(c.solution || '').split('\n').map(function(l){ return l.trim(); }).filter(Boolean).map(segsOf)};
  var k = c.key || {};
  if (c.type === 'mc'){ b.choices = (k.options || []).map(function(o){ return {t: segsOf(o)}; }); b.answer = {kind: 'choice', key: k.correct | 0}; }
  else if (c.type === 'nline') b.answer = {kind: 'free', parts: [{type: 'nline', line: {lo: String(k.lo), st: String(k.st || 1), n: 10}, graph: {c: String(k.c), closed: !!k.closed, dir: k.dir === 'left' ? 'left' : 'right'}, v: k.v || 'x', label: ''}]};
  else {
    var P = {type: c.type === 'expression' ? 'expression' : c.type === 'inequality' ? 'inequality' : c.type === 'text' ? 'text' : 'number', key: String(k.answer == null ? '' : k.answer).trim()};
    if (c.type === 'expression') P.equiv = 'expression';
    if (c.type === 'inequality'){ P.equiv = 'inequality'; P.form = 'As an inequality'; }
    if (k.alts && k.alts.length) P.alts = k.alts.map(String);
    if (k.unit) P.unit = String(k.unit);
    if (k.pre) P.pre = String(k.pre);
    P.keyS = c.type === 'text' ? [esc(P.key)] : [[P.key.replace(/<=/g, '\\le ').replace(/>=/g, '\\ge ').replace(/≤/g, '\\le ').replace(/≥/g, '\\ge ').replace(/\*/g, '\\times '), 0]];
    b.answer = {kind: 'free', parts: [P]};
  }
  return b;
}
/* the set as the page draws it: every native item annotated (its family, its place for the ID "U10·3"), and the teacher's own
   questions after the native ones of their section, or in "More questions" at the end */
var EXTRA_TITLE = 'More questions';
function applySet(g, view, kitItem){
  if (!any()) return g;
  var qn = 0, extra = [];
  g.sections.forEach(function(sec){ sec.items.forEach(function(it){ applyItem(it, view, ++qn); }); });
  if (kitItem && DATA.custom.length){
    var cs = DATA.custom.slice().sort(function(a, b){ return a.position - b.position; });
    cs.forEach(function(c, k){
      var it = kitItem(customBank(c, k + 1)); if (!it) return;
      it.custom = {id: c.id, n: k + 1}; it._fk = 'custom:' + c.id;
      var pts = Number.isInteger(c.points) && c.points >= 0 && c.points <= 20 ? c.points : 1;
      partsOf(it).forEach(function(p){ p._pts = pts === 1 ? undefined : pts; });
      var si = /^\d+$/.test(String(c.section)) ? +c.section : -1;
      if (si >= 0 && si < g.sections.length) g.sections[si].items.push(it); else extra.push(it);
    });
    if (extra.length) g.sections.push({title: EXTRA_TITLE, items: extra, extra: true});
  }
  return g;
}
/* a lesson item from Cadence, edited: its stem, its key, hidden */
function bankItem(b){
  var e = BYB[b.id]; if (!e) return b;
  var c = JSON.parse(JSON.stringify(b)); c._ed = [];
  if (typeof e.stem === 'string' && e.stem.trim()){ c.stem = segsOf(e.stem); c._ed.push('wording'); }
  var A = c.answer, k = e.key;
  if (k != null){
    if ((A.kind === 'choice') && Number.isInteger(k.correct) && c.choices && k.correct >= 0 && k.correct < c.choices.length){ A.key = k.correct; c._ed.push('key'); }
    else if (A.kind === 'multi' && Array.isArray(k.correct) && k.correct.length){ A.key = k.correct.filter(function(x){ return Number.isInteger(x) && x >= 0 && x < c.choices.length; }); c._ed.push('key'); }
    else if (A.parts && Array.isArray(k.answers)) A.parts.forEach(function(p, i){
      var v = k.answers[i]; if (typeof v !== 'string' || !v.trim() || p.type === 'nline' || p.type === 'select') return;
      if (String(p.key) === v.trim()) return;
      p.key = v.trim(); delete p.alts; p.keyS = [esc(p.key)]; if (c._ed.indexOf('key') < 0) c._ed.push('key');
    });
  }
  if (e.hidden) c._ed.push('hidden');
  if (!c._ed.length) delete c._ed;
  return c;
}
function bankHidden(id){ var e = BYB[id]; return !!(e && e.hidden); }
/* a lesson item's stem as markup ($…$ for its TeX), or the reason it cannot be edited as words */
function bankSource(b){
  var out = [], why = '';
  (b.stem || []).forEach(function(g){
    if (typeof g !== 'string'){ out.push(g[1] ? '$$' + g[0] + '$$' : '$' + g[0] + '$'); return; }
    nodes(g).forEach(function(nd){
      if (nd.t === 'text') out.push(lit2(nd.v));
      else if (nd.tag === 'br') out.push('\n');
      else if ((nd.tag === 'b' || nd.tag === 'strong') && nd.inner.indexOf('<') < 0) out.push('**' + lit2(decode(nd.inner)) + '**');
      else if (!why) why = 'It is laid out with ' + (nd.tag === 'table' || nd.tag === 'tr' || nd.tag === 'td' ? 'a table' : 'markup (' + (nd.tag || 'raw') + ')') + ' the editor cannot keep.';
    });
  });
  return why ? {why: why} : {src: out.join('')};
}
function lit2(s){ return s.replace(/\\/g, '\\\\').replace(/\$/g, '\\$').replace(/\{\{/g, '\\{{').replace(/\*\*/g, '\\*\\*'); }

var api = {MAXV: MAXV, MAXLEN: MAXLEN, TYPES: TYPES, EXTRA_TITLE: EXTRA_TITLE, nodes: nodes, decode: decode, esc: esc, extract: extract, fill: fill, canon: canon, lex: lex, problems: problems,
  phOf: phOf, vhash: vhash, famKey: famKey, prmOf: prmOf, fieldsOf: fieldsOf, partsOf: partsOf, survey: survey, use: use, any: any, hiddenFams: hiddenFams,
  applyItem: applyItem, applySet: applySet, customBank: customBank, segsOf: segsOf, bankItem: bankItem, bankHidden: bankHidden, bankSource: bankSource, texSpan: texSpan,
  data: function(){ return DATA; }};
if (node){ module.exports = api; return; }

/* ================================================ in the page */
var K = root.Kit = root.Kit || {}, U = root.Unit;
if (!U) return;
var V = U.view, O = {}; Object.keys(V).forEach(function(k){ O[k] = V[k]; });
var OGEN = U.generate, ORUNGS = U.rungs;
var M = /^([a-z]\d+)u(\d+)$/i.exec(U.id || ''), COURSE = M ? M[1].toLowerCase() : '', UNIT = M ? +M[2] : 0;
var PREVIEW = /[?&]kedit=1\b/.test(location.search || '');
var ONSITE = !!root.KIT_EDITS_BASE || /^\/(?:teacher\/)?(m7|a7)\/(?:practice\/)?unit-\d+\/(?:practice\/)?(index\.html)?$/.test(location.pathname || '');
var CACHE_KEY = 'practice.edits.' + (U.id || '');
var waiting = null, ready = false, DRAFT = null;
function kitItem(b){ return K.Bank && K.Bank._kitItem ? K.Bank._kitItem(b) : null; }
/* the unit's view, edited: the stem and lines from the template when there is one */
V.stem = function(it){ return it && it._est != null ? it._est : O.stem(it); };
V.line = function(p){ return p && p._eln != null ? p._eln : O.line(p); };
U.rungs = function(x, type, ctx){
  var r = ORUNGS ? ORUNGS(x, type, ctx) : null;
  if (x && x._coach){ var o = {}; if (r) Object.keys(r).forEach(function(k){ o[k] = r[k]; }); o.notice = x._coach; return o; }
  return r;
};
U.generate = function(seed){ var g = OGEN(seed); return DRAFT ? DRAFT(g, seed) : applySet(g, O, kitItem); };
U.generate.original = OGEN;

function boot(){ ready = true; var w = waiting; waiting = null; if (w) w(); }
function load(){
  try { var c = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null'); if (c && c.edits) use(c); } catch(e){}
  var base = root.KIT_EDITS_BASE || '', url = base + '/api/items/' + COURSE + '/' + UNIT, done = false;
  var finish = function(){ if (done) return; done = true; boot(); };
  var t = setTimeout(finish, 1500);                         /* never more than a moment's wait: offline, the cache (or nothing) */
  try {
    fetch(url, {credentials: 'omit'}).then(function(r){ return r.ok ? r.json() : null; }).then(function(d){
      if (d && Array.isArray(d.edits) && Array.isArray(d.custom)){ use(d); try { localStorage.setItem(CACHE_KEY, JSON.stringify(d)); } catch(e){} }
      clearTimeout(t); finish();
    }, function(){ clearTimeout(t); finish(); });
  } catch(e){ clearTimeout(t); finish(); }
}

/* ---- the cockpit's side: the teacher copy in an iframe, ?kedit=1 (the preview pane) */
function staticHtml(html){                                   /* a stem with its math drawn by KaTeX, for the cockpit's list */
  var d = document.createElement('div'); d.innerHTML = html;
  Array.prototype.forEach.call(d.querySelectorAll('.m'), function(el){
    var tex = K.Tex ? K.Tex.toTex(el) : '', disp = el.hasAttribute('data-disp');
    try { if (root.katex && tex) el.innerHTML = root.katex.renderToString(tex, {throwOnError: true, strict: 'ignore', output: 'html', displayMode: disp}); } catch(e){}
  });
  return d.innerHTML;
}
function famSurvey(n){
  var F = survey({generate: OGEN, view: O}, O, n || 600), G0 = OGEN(1);
  return {course: COURSE, unit: UNIT, id: U.id, title: U.title, h1: U.h1, sections: G0.sections.map(function(s){ return String(s.title).replace(/<[^>]*>/g, ''); }), families: F};
}
function bankList(){
  if (!K.Bank || !K.Bank._lessons) return [];
  var LES = K.Bank._lessons;
  return Object.keys(LES).filter(function(l){ return l !== 'custom'; }).map(function(lid){
    var L = LES[lid];
    return {id: lid, title: L.title, items: L.items.map(function(b){ var s = bankSource(b), q = K.Bank.qid({bank: b}); return {id: b.id, n: b.n, qid: q.id, rigor: !!b.rigor, src: s.src, why: s.why, answer: b.answer, choices: (b.choices || []).map(function(c){ return c.t; }), b: b}; })};
  });
}
var PV = null;
K.Edits = {
  hold: function(fn){ if (ready) return false; waiting = fn; return true; },
  get ready(){ return ready; }, preview: PREVIEW, onSite: ONSITE, course: COURSE, unit: UNIT,
  use: use, any: any, data: function(){ return DATA; }, hiddenFams: hiddenFams, bankItem: bankItem, bankHidden: bankHidden,
  extract: extract, fill: fill, problems: problems, lex: lex, texSpan: texSpan, survey: famSurvey, bank: bankList, staticHtml: staticHtml, TYPES: TYPES, customBank: customBank,
  original: OGEN, view: O, famKey: famKey, prmOf: prmOf,
  /* the cockpit starts a preview page with the saved edits (it reads them as the teacher, hidden questions too) */
  start: function(d){ use(d); if (!ready) boot(); },
  /* the preview pane: the questions the editor is on, drawn by the page itself with the draft applied */
  show: function(spec){ PV = spec; if (root.PracticePreview) root.PracticePreview(); },
  previewSections: function(){
    if (!PV) return [];
    var saved = DATA, out = [];
    try {
      if (PV.data) use(PV.data);
      if (PV.kind === 'family'){
        (PV.seeds || []).forEach(function(seed){
          var g = applySet(OGEN(seed), O, kitItem), sec = g.sections[PV.si], it = sec && sec.items[PV.ii];
          if (it) out.push({title: 'Set ' + seed, items: [{it: it, keep: null, si: PV.si, ii: PV.ii}]});
        });
      } else if (PV.kind === 'custom' && PV.custom){
        var it2 = kitItem(customBank(PV.custom, PV.n || 1)); if (it2){ it2.custom = {id: PV.custom.id || 'draft', n: PV.n || 1}; var pts = PV.custom.points; partsOf(it2).forEach(function(p){ p._pts = Number.isInteger(pts) && pts !== 1 ? pts : undefined; }); out.push({title: PV.title || 'Preview', items: [{it: it2, keep: null, si: 'c', ii: 0}]}); }
      } else if (PV.kind === 'bank' && PV.id && K.Bank){
        var b = K.Bank._byId[PV.id]; if (b){ var it3 = kitItem(Object.assign({}, bankItem(b), {id: b.id + '~pv' + (PV.rev || 0)})); if (it3) out.push({title: PV.title || 'Preview', items: [{it: it3, keep: null, si: 'b:' + b.id, ii: 0}]}); }
      }
    } finally { if (PV.data) use(saved); }
    return out;
  },
  _pv: function(){ return PV; }
};
if (PREVIEW){
  var st = document.createElement('style');
  st.textContent = 'html.kpv .watch,html.kpv .head,html.kpv .ctl,html.kpv #intro,html.kpv .teacherbar,html.kpv #result,html.kpv #notice{display:none!important}html.kpv body{padding-top:0}html.kpv .sheet{margin-top:0}';
  document.head.appendChild(st); document.documentElement.classList.add('kpv');
} else if (ONSITE && COURSE && UNIT) load();
else ready = true;
})(this);
