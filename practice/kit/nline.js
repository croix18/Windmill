/* Practice-test kit — the number-line graph a student builds (7 Nov 2026).

   Croix: "I'd like the practice tests and tests to make them graph inequalities with an open or closed dot and an arrow instead
   of just describing them. Adjust the practice tests and the tests to reflect this."

   A part of kind 'nline' asks the student to graph a one-variable inequality: put the boundary on the number line, choose an
   open or a closed dot, choose the arrow's direction. The authoring shape (a unit's part, or a Cadence bank part):

       {kind: 'nline', line: {lo, st, n}, graph: {c, closed, dir}}       lo, st, c as numbers or exact strings ("-2.5");
                                                                         n steps of st from lo; dir 'left' | 'right'

   The line is drawn as the unit's number lines are (M7 Unit 10 fig.js: 320 wide, the ends at 24 and 296, a label on every
   tick — on every whole number when the step is ½ — and an arrowhead at each end). The student's answer is the same triple,
   {c, closed, dir}, any of it still null; it is right only when all three are the key's. When it is not, the coach names one
   thing, in this order: the boundary, the dot, the arrow.

   Everything here is pure — strings in, strings out — so the units' checks run it under Node; ui.js wires the events. */
(function (root) {
'use strict';
const W = 320, X0 = 24, X1 = 296, A0 = 6, A1 = 314, Y = 24, LY = 51, H = 62, R = 7, TK = 7, TK2 = 4.5;
const num = v => typeof v === 'number' ? v : typeof v === 'string' ? frac(v) : NaN;
function frac(s) { const t = String(s).trim().replace(/[−–]/g, '-'); const m = /^(-?)(\d+)\/(\d+)$/.exec(t); return m ? (m[1] ? -1 : 1) * (+m[2] / +m[3]) : Number(t); }
const tidy = v => Math.round(v * 1e9) / 1e9;
const isInt = v => Math.abs(v - Math.round(v)) < 1e-9;
function spec(p) {
  const L = (p && (p.line || p)) || {}, lo = num(L.lo), st = num(L.st), n = L.n == null ? 10 : +L.n;
  return { lo, st, n, hi: tidy(lo + st * n), halves: Math.abs(st - 0.5) < 1e-9 };
}
const val = (S, i) => tidy(S.lo + S.st * i);
function idx(S, c) { const v = num(c); if (!isFinite(v)) return -1; const i = Math.round((v - S.lo) / S.st); return i >= 0 && i <= S.n && Math.abs(val(S, i) - v) < 1e-9 ? i : -1; }
const px = (S, v) => X0 + (v - S.lo) / (S.hi - S.lo) * (X1 - X0);
/* numbers as the page prints them: −3, 2.5 (a unicode minus) */
function fmt(v) { v = tidy(num(v)); const a = Math.abs(v), s = isInt(a) ? String(Math.round(a)) : String(a); return (v < 0 ? '−' : '') + s; }
const kstr = v => { v = tidy(num(v)); return isInt(v) ? String(Math.round(v)) : String(v); };
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
const f1 = v => (Math.round(v * 10) / 10).toString();

/* the answer, normalised: {c: a tick's value as a string or null, closed: true | false | null, dir: 'left' | 'right' | null} */
function norm(a) {
  a = a && typeof a === 'object' ? a : {};
  return { c: a.c == null || a.c === '' ? null : kstr(a.c), closed: a.closed == null ? null : !!a.closed, dir: a.dir === 'left' || a.dir === 'right' ? a.dir : null };
}
function graphOf(p) { return norm(p.graph || p.ans || {}); }
const empty = a => { const g = norm(a); return g.c == null && g.closed == null && g.dir == null; };
const complete = a => { const g = norm(a); return g.c != null && g.closed != null && g.dir != null; };

/* ---------------------------------------------------------------- the picture
   o: {mode: 'live' (the student's widget), 'key' (the answer drawn), 'blank' (paper: the line alone), pending: a point placed with
   no dot chosen yet, focus: the tick the keyboard is on} */
function model(p, g) {
  const S = spec(p), ticks = [], labels = [];
  for (let i = 0; i <= S.n; i++) { const v = val(S, i), lab = !S.halves || isInt(v); ticks.push({ i, v, x: px(S, v), major: lab }); if (lab) labels.push({ v, x: px(S, v), s: fmt(v) }); }
  const m = { S, ticks, labels, W, H, y: Y };
  g = norm(g);
  if (g.c != null) { const i = idx(S, g.c); if (i >= 0) m.dot = { i, v: val(S, i), x: px(S, val(S, i)), closed: g.closed }; }
  if (m.dot && g.dir) m.ray = { from: m.dot.x, to: g.dir === 'left' ? A0 : A1, dir: g.dir === 'left' ? -1 : 1 };
  return m;
}
function say(p, g) {                                   /* "Boundary at 3, open dot, arrow to the right" */
  g = norm(g); const S = spec(p);
  if (g.c == null && g.closed == null && g.dir == null) return 'Number line from ' + fmt(S.lo) + ' to ' + fmt(S.hi) + '. No point placed yet.';
  return [g.c == null ? 'No point placed yet' : 'Boundary at ' + fmt(g.c), g.closed == null ? 'no dot chosen' : g.closed ? 'closed dot' : 'open dot', g.dir == null ? 'no arrow yet' : 'arrow to the ' + g.dir].join(', ') + '.';
}
function svg(p, g, o) {
  o = o || {}; const m = model(p, g), mode = o.mode || 'key', els = [];
  els.push('<line class="nax" x1="' + (A0 + 7) + '" y1="' + Y + '" x2="' + (A1 - 7) + '" y2="' + Y + '"/>');
  els.push('<path class="nah" d="M' + A0 + ' ' + Y + 'l9 -5v10z"/><path class="nah" d="M' + A1 + ' ' + Y + 'l-9 -5v10z"/>');
  m.ticks.forEach(t => els.push('<line class="' + (t.major ? 'ntk' : 'ntk2') + '" x1="' + f1(t.x) + '" y1="' + (Y - (t.major ? TK : TK2)) + '" x2="' + f1(t.x) + '" y2="' + (Y + (t.major ? TK : TK2)) + '"/>'));
  m.labels.forEach(l => els.push('<text class="nlb" x="' + f1(l.x) + '" y="' + LY + '">' + l.s + '</text>'));
  if (mode === 'live' && o.focus != null && o.focus >= 0 && o.focus <= m.S.n && !(m.dot && m.dot.i === o.focus)) { const x = px(m.S, val(m.S, o.focus)); els.push('<circle class="nfoc" cx="' + f1(x) + '" cy="' + Y + '" r="' + (R + 3) + '"/>'); }
  if (mode !== 'blank') {
    if (m.ray) { const tip = m.ray.to, back = tip - m.ray.dir * 13;
      els.push('<line class="nray" x1="' + f1(m.ray.from) + '" y1="' + Y + '" x2="' + f1(back) + '" y2="' + Y + '"/>');
      els.push('<path class="nrh" d="M' + f1(tip) + ' ' + Y + 'L' + f1(back) + ' ' + (Y - 8) + 'L' + f1(back) + ' ' + (Y + 8) + 'z"/>'); }
    if (m.dot) els.push(m.dot.closed == null ? '<circle class="npend" cx="' + f1(m.dot.x) + '" cy="' + Y + '" r="' + (R + 1) + '"/><circle class="npend2" cx="' + f1(m.dot.x) + '" cy="' + Y + '" r="2.6"/>'
      : '<circle class="' + (m.dot.closed ? 'ncl' : 'nop') + '" cx="' + f1(m.dot.x) + '" cy="' + Y + '" r="' + R + '"/>');
  }
  /* the tap zones: one per tick, the line's full height (≥ 44 px on a phone), for the pointer and the checks */
  if (mode === 'live') { const dx = (X1 - X0) / m.S.n; m.ticks.forEach(t => els.push('<rect class="nzone" data-i="' + t.i + '" x="' + f1(t.x - dx / 2) + '" y="0" width="' + f1(dx) + '" height="' + H + '"/>')); }
  const alt = mode === 'blank' ? 'Number line from ' + fmt(m.S.lo) + ' to ' + fmt(m.S.hi) + '.' : say(p, g);
  return '<svg class="nlg nl-' + mode + (o.cls ? ' ' + o.cls : '') + '" viewBox="0 0 ' + W + ' ' + H + '"' + (mode === 'live' ? ' aria-hidden="true" focusable="false"' : ' role="img" aria-label="' + esc(alt) + '"') + '>' + els.join('') + '</svg>';
}
/* the key, drawn, with its words under it (the teacher reads both; a screen reader the label) */
function keyHtml(p) {
  const g = graphOf(p);
  return '<span class="nlkey">' + svg(p, g, { mode: 'key' }) + '<span class="nlkw">' + (g.closed ? 'Closed' : 'Open') + ' dot at ' + fmt(g.c) + ', arrow ' + g.dir + '</span></span>';
}
const keyText = g => { g = norm(g); return 'nline:' + g.c + '|' + (g.closed ? 'closed' : 'open') + '|' + g.dir; };

/* ---------------------------------------------------------------- the widget (ui.js draws it, wires it and repaints it) */
const DOT = { open: '<svg class="ng" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="5.4" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
  closed: '<svg class="ng" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.4" fill="currentColor"/></svg>' };
const ARR = { left: '<svg class="ng" viewBox="0 0 18 16" aria-hidden="true"><path d="M16 8H5" stroke="currentColor" stroke-width="2.2" fill="none"/><path d="M1.5 8l6-5v10z" fill="currentColor"/></svg>',
  right: '<svg class="ng" viewBox="0 0 18 16" aria-hidden="true"><path d="M2 8h11" stroke="currentColor" stroke-width="2.2" fill="none"/><path d="M16.5 8l-6-5v10z" fill="currentColor"/></svg>' };
function seg(id, what, label, opts, cur) {
  const any = opts.some(o => o[0] === cur);
  return '<div class="nseg" role="radiogroup" aria-label="' + label + '" id="n' + what + id + '"><span class="nsl" aria-hidden="true">' + label + '</span><span class="nsb">' +
    opts.map((o, k) => { const on = o[0] === cur; return '<button type="button" role="radio" data-nl="' + id + '" data-nl' + what + '="' + o[0] + '" aria-checked="' + on + '" tabindex="' + (on || (!any && k === 0) ? 0 : -1) + '" aria-label="' + o[2] + '">' + o[1] + '</button>'; }).join('') + '</span></div>';
}
function controls(id, g) {
  g = norm(g);
  return seg(id, 'd', 'Dot', [['open', DOT.open + '<span>Open</span>', 'Open dot'], ['closed', DOT.closed + '<span>Closed</span>', 'Closed dot']], g.closed == null ? null : g.closed ? 'closed' : 'open') +
    seg(id, 'a', 'Arrow', [['left', ARR.left + '<span>Left</span>', 'Arrow to the left'], ['right', '<span>Right</span>' + ARR.right, 'Arrow to the right']], g.dir);
}
function widget(id, p, a, o) {
  o = o || {}; const S = spec(p), g = norm(a), i = g.c == null ? -1 : idx(S, g.c);
  return '<div class="nlw" data-nlw="' + id + '"><div class="nlpt" id="nlp' + id + '" role="slider" tabindex="0" data-nl="' + id + '" aria-label="' + esc(o.label || 'Boundary point on the number line') + '" aria-valuemin="' + kstr(S.lo) + '" aria-valuemax="' + kstr(S.hi) + '"' +
    (i >= 0 ? ' aria-valuenow="' + kstr(g.c) + '" aria-valuetext="' + esc(fmt(g.c)) + '"' : ' aria-valuetext="No point yet"') + (o.describedby ? ' aria-describedby="' + o.describedby + '"' : '') + '>' + svg(p, g, { mode: 'live', focus: o.focus }) + '</div>' +
    '<div class="nctl">' + controls(id, g) + '</div><div class="nsay" id="nls' + id + '" aria-live="polite">' + esc(say(p, g)) + '</div></div>';
}
/* the tick nearest a point of the line: x in the svg's own units */
function tickAt(p, x) { const S = spec(p); return Math.max(0, Math.min(S.n, Math.round((x - X0) / ((X1 - X0) / S.n)))); }

/* ---------------------------------------------------------------- paper */
const INSTR = 'Graph the solution on the number line.';
function blankHtml(p) { return '<div class="pnl"><div class="pnlband"></div>' + svg(p, null, { mode: 'blank', cls: 'nl-paper' }) + '</div>'; }

/* ---------------------------------------------------------------- judging
   → {v: right | wrong | unread | blank, what, which: 'boundary' | 'dot' | 'arrow' | null, rule}
   lines(part, which, answer, ctx) may give the unit's own words for the one thing that is off; else the kit's */
const LT = r => r === '<' ? '&lt;' : r === '>' ? '&gt;' : r;
function defaultLine(p, which, a, ctx) {
  const k = graphOf(p), v = (p.v || (p.graph && p.graph.v) || 'x');
  const ex = num(k.c) === 3 ? 5 : 3;                       /* an example that is never the key's own number */
  if (which === 'boundary') return 'The boundary is where the solution starts: solve first — <i>' + esc(v) + '</i> &gt; ' + ex + ' puts it at ' + ex + '.';
  if (which === 'dot') return '&gt; and &lt; leave the boundary out: open dot. ≤ and ≥ include it: closed dot.';
  return '<i>' + esc(v) + '</i> &gt; ' + ex + ' means the numbers bigger than ' + ex + ' — the arrow points right. &lt; points left.';
}
function judge(p, a, ctx, lines) {
  const g = norm(a), k = graphOf(p);
  if (empty(g)) return { v: 'blank', what: [] };
  if (g.c == null) return { v: 'unread', what: ['Tap the number line to place the point.'] };
  if (g.closed == null) return { v: 'unread', what: ['Choose an open or a closed dot.'] };
  if (g.dir == null) return { v: 'unread', what: ['Choose which way the arrow points.'] };
  const which = Math.abs(num(g.c) - num(k.c)) > 1e-9 ? 'boundary' : g.closed !== k.closed ? 'dot' : g.dir !== k.dir ? 'arrow' : null;
  if (!which) return { v: 'right', what: [] };
  let w = ''; try { w = lines ? lines(p, which, g, ctx || {}) || '' : ''; } catch (e) { w = ''; }
  return { v: 'wrong', what: [w || defaultLine(p, which, g, ctx || {})], which, rule: defaultLine(p, 'boundary', g, ctx || {}) };
}
/* the three rungs a part without its own: the boundary, the dot, then every step with the arrow — the graph drawn is the answer */
function rungs(p) {
  const k = graphOf(p);
  return { notice: defaultLine(p, 'boundary'), first: { say: defaultLine(p, 'dot'), ex: null },
    steps: [{ say: defaultLine(p, 'boundary'), ex: null }, { say: defaultLine(p, 'dot'), ex: null }, { say: defaultLine(p, 'arrow'), ex: null }] };
}

const api = { W, H, X0, X1, A0, A1, Y, R, spec, val, idx, px, fmt, kstr, norm, graphOf, empty, complete, model, say, svg, keyHtml, keyText, widget, controls, tickAt, blankHtml, INSTR, judge, rungs, defaultLine };
if (typeof module !== 'undefined' && module.exports) module.exports = api;
else { const K = root.Kit = root.Kit || {}; K.NL = api; }
})(this);
