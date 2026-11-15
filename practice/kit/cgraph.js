/* Practice-test kit — the circle graph a student builds (15 Nov 2026).

   Croix, 7 Nov 2026, of number lines: "I'd like the practice tests and tests to make them graph … instead of just describing
   them." MA.7.DP.1.4's first verb is construct: in class students draw circle graphs on a printed circle marked every 10° (no
   protractor), with a line already drawn from the center to 0° at the top, and the data are chosen so that every central angle
   is a multiple of 10°. A part of kind 'cgraph' asks for that graph, built, not chosen. The authoring shape:

       {kind: 'cgraph', circle: {step: 10}, graph: [{name: 'Fruit', deg: 160}, {name: 'Chips', deg: 90}, …], title?: '…'}

   2 to 6 categories, every deg a positive multiple of step, the degs summing to 360 (check() says what is wrong with a part that
   is not; a unit's checks refuse it). The student's answer is a list in the same shape — the sectors as built, clockwise from
   0°, a name null while the sector has none ([] when nothing is drawn). It is right when every category names exactly one
   sector and that sector is the key's size; the order of the sectors is free. When it is not, the coach names one thing:
   the sizes first, then the names.

   Everything here is pure — strings in, strings out — so a unit's Node checks run it; ui.js wires the events. */
(function (root) {
'use strict';
const W = 400, H = 340, CX = 200, CY = 170, R = 104, RN = R + 18, RING0 = 0.7 * R, RING1 = R + 30, RL = R + 36, FS = 15, FN = 14.5;
const f1 = v => (Math.round(v * 10) / 10).toString();
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
const rad = d => d * Math.PI / 180;
const pt = (d, r) => [CX + r * Math.sin(rad(d)), CY - r * Math.cos(rad(d))];          /* clockwise from the top */
const deg = d => d + '°';

/* ---------------------------------------------------------------- the part */
function spec(p) {
  const step = +((p && p.circle && p.circle.step) || 10), key = ((p && p.graph) || []).map(s => ({ name: String(s.name), deg: +s.deg }));
  return { step, n: Math.round(360 / step), key, cats: key.map(s => s.name) };
}
/* what is wrong with a part as authored ('' when nothing): a unit's checks call it on every part they make */
function check(p) {
  const S = spec(p), k = S.key, bad = [];
  if (!(S.step > 0) || 360 % S.step) bad.push('the step ' + S.step + ' does not divide 360');
  if (k.length < 2 || k.length > 6) bad.push(k.length + ' categories (2 to 6)');
  if (new Set(k.map(s => s.name.toLowerCase())).size !== k.length) bad.push('a category named twice');
  if (k.some(s => !s.name.trim())) bad.push('a category with no name');
  k.forEach(s => { if (!(Number.isInteger(s.deg) && s.deg > 0 && s.deg % S.step === 0)) bad.push(s.name + ' = ' + s.deg + '° is not a positive multiple of ' + S.step + '°'); });
  const sum = k.reduce((a, s) => a + s.deg, 0); if (sum !== 360) bad.push('the angles add to ' + sum + '°, not 360°');
  return bad.join('; ');
}
const graphOf = p => spec(p).key;
/* the answer, normalised: sectors clockwise from 0° whose sizes are positive multiples of the step adding to 360, each name one
   of the part's categories and on one sector at most — or [] (nothing drawn) */
function norm(p, a) {
  const S = spec(p); let list = Array.isArray(a) ? a : a && Array.isArray(a.graph) ? a.graph : [];
  list = list.map(s => ({ name: s && s.name != null && S.cats.indexOf(String(s.name)) >= 0 ? String(s.name) : null, deg: s ? Math.round(+s.deg) : 0 }));
  if (!list.length || list.some(s => !(s.deg > 0) || s.deg % S.step) || list.reduce((t, s) => t + s.deg, 0) !== 360) return [];
  const seen = {}; list.forEach(s => { if (s.name != null) { if (seen[s.name]) s.name = null; else seen[s.name] = 1; } });
  return list.length === 1 && list[0].name == null ? [] : list;
}
const empty = (p, a) => norm(p, a).length === 0;
/* answered, for the pager's map and Finish: a line drawn and every sector named */
const done = (p, a) => { const g = norm(p, a); return g.length > 0 && g.every(s => s.name != null); };
/* the lines drawn (0 first) and back */
function linesOf(p, a) { const L = [0]; let t = 0; norm(p, a).forEach((s, i, all) => { t += s.deg; if (i < all.length - 1) L.push(t); }); return L; }
function sectors(p, a) { let t = 0; return norm(p, a).map((s, i) => { const o = { i, from: t, to: t + s.deg, deg: s.deg, name: s.name }; t += s.deg; return o; }); }
function fromLines(lines, names) {
  const L = Array.from(new Set(lines.concat([0]))).filter(d => d >= 0 && d < 360).sort((x, y) => x - y);
  if (L.length < 2) return [];
  return L.map((d, i) => ({ name: names && names[d] != null ? names[d] : null, deg: (i < L.length - 1 ? L[i + 1] : 360) - d }));
}
const namesOf = (p, a) => { const m = {}; sectors(p, a).forEach(s => { m[s.from] = s.name; }); return m; };
/* the edits ui.js makes: a line drawn or erased at a mark (never the 0° line), a line moved, a sector named, all cleared */
function toggle(p, a, d) {
  const S = spec(p); d = ((Math.round(d / S.step) * S.step) % 360 + 360) % 360; if (d === 0) return norm(p, a);
  const L = linesOf(p, a), nm = namesOf(p, a), i = L.indexOf(d);
  if (i >= 0) { L.splice(i, 1); delete nm[d]; } else L.push(d);
  return fromLines(L, nm);
}
function move(p, a, from, to) {
  const L = linesOf(p, a), nm = namesOf(p, a);
  if (from === 0 || to === 0 || from === to || L.indexOf(from) < 0 || L.indexOf(to) >= 0) return norm(p, a);
  const n = nm[from]; L.splice(L.indexOf(from), 1); delete nm[from]; L.push(to); nm[to] = n;
  return fromLines(L, nm);
}
function name(p, a, i, nmv) {
  const list = norm(p, a).map(s => ({ name: s.name, deg: s.deg })); if (!list[i]) return list;
  list.forEach(s => { if (s.name === nmv) s.name = null; }); list[i].name = nmv == null ? null : String(nmv);
  return norm(p, list);
}
const sectorAt = (p, a, ang) => { const s = sectors(p, a); ang = ((ang % 360) + 360) % 360; for (const x of s) if (ang >= x.from && ang < x.to) return x.i; return s.length ? s.length - 1 : -1; };
const markAt = (p, ang) => { const S = spec(p); return ((Math.round(ang / S.step) * S.step) % 360 + 360) % 360; };
/* a point of the drawing (its own units) → {r, ang, mark, zone: 'ring' (the lines) | 'sector'} */
function hit(p, x, y) {
  const dx = x - CX, dy = y - CY, r = Math.sqrt(dx * dx + dy * dy); let ang = Math.atan2(dx, -dy) * 180 / Math.PI; if (ang < 0) ang += 360;
  return { r, ang, mark: markAt(p, ang), zone: r >= RING0 && r <= RING1 ? 'ring' : 'sector' };
}

/* ---------------------------------------------------------------- words */
const sectorWords = s => 'The sector from ' + deg(s.from) + ' to ' + deg(s.to) + (s.name ? ' is ' + s.name + '.' : ' has no name yet.');
function say(p, a) {                                   /* "4 lines: 0°, 160°, 250°, 320°. The sector from 0° to 160° is Fruit. …" */
  const L = linesOf(p, a);
  if (L.length < 2) return 'A circle marked every ' + spec(p).step + '°, with a line from the center to 0°. No other lines yet.';
  return L.length + ' lines: ' + L.map(deg).join(', ') + '. ' + sectors(p, a).map(sectorWords).join(' ');
}
const listWords = g => g.map(s => s.name + ' ' + deg(s.deg)).join(', ');
const ANY = 'Any order of sectors earns the point.';
const keyWords = p => listWords(graphOf(p)) + '. ' + ANY;

/* ---------------------------------------------------------------- the picture
   o: {mode: 'live' (the student's widget) | 'key' (a graph drawn: the key, an answer, a choice) | 'blank' (paper: the circle
   alone), degs: the sizes beside the names (key mode; default true), focus: the mark the keyboard is on, ghost: the mark a
   pointer is at, sel: the sector selected, cls} */
const tw = (s, fs) => String(s).length * fs * 0.58 + 4;           /* a label's width, near enough for Lexend at that size */
function inSector(s, x, y) { const h = hit(null, x, y); if (h.r > R - 4 || h.r < 6) return false; const d = s.to - s.from; let a = h.ang - s.from; if (a < 0) a += 360; return a > 2 && a < d - 2; }
function boxIn(s, x, y, w, h) { return [[-w / 2, -h / 2], [w / 2, -h / 2], [-w / 2, h / 2], [w / 2, h / 2], [0, -h / 2], [0, h / 2], [-w / 2, 0], [w / 2, 0]].every(c => inSector(s, x + c[0], y + c[1])); }
function layout(secs, degs) {
  const out = [], side = [];
  secs.forEach(s => {
    if (!s.name) return;
    const t = [s.name].concat(degs ? [deg(s.deg)] : []), w = Math.max.apply(null, t.map(z => tw(z, FS))), h = t.length * (FS + 2), mid = s.from + s.deg / 2;
    for (const rr of [0.56 * R, 0.5 * R, 0.44 * R, 0.62 * R, 0.68 * R, 0.38 * R]) { const c = pt(mid, rr); if (s.deg >= 180 || boxIn(s, c[0], c[1], w, h)) { out.push({ s, t, x: c[0], y: c[1], w, h, inside: true }); return; } }
    /* beside the circle, with a short leader from the rim: to the right of a sector on the right, to the left on the left */
    const sn = Math.sin(rad(mid)), cs = -Math.cos(rad(mid)), anchor = Math.abs(sn) < 0.06 ? 'middle' : sn > 0 ? 'start' : 'end';
    const o = { s, t, w, h, inside: false, anchor, mid, e: pt(mid, R), x: CX + RL * sn, y: CY + RL * cs + (anchor === 'middle' ? (cs > 0 ? 1 : -1) * h / 2 : 0) };
    side.push(o); out.push(o);
  });
  const x0 = o => o.anchor === 'start' ? o.x : o.anchor === 'end' ? o.x - o.w : o.x - o.w / 2;
  const boxOf = o => [x0(o), o.y - o.h / 2, o.w, o.h];
  const meets = (a, b2) => a[0] < b2[0] + b2[2] && b2[0] < a[0] + a[2] && a[1] < b2[1] + b2[3] && b2[1] < a[1] + a[3];
  const nums = []; for (let d = 0; d < 360; d += 30) { const c = pt(d, RN), w = tw(d + '°', FN); nums.push([c[0] - w / 2, c[1] - FN * 0.62, w, FN * 1.15]); }
  /* on each side, top to bottom, a label never sits on the one above it (it moves down), nor on a number (it moves out) */
  ['start', 'end', 'middle'].forEach(a => { const L = side.filter(o => o.anchor === a).sort((u, v) => u.y - v.y);
    L.forEach((o, i) => { for (let j = 0; j < i; j++) if (meets(boxOf(L[j]), boxOf(o))) o.y = L[j].y + (L[j].h + o.h) / 2 + 2;
      const out1 = a === 'start' ? 1 : a === 'end' ? -1 : 0;
      for (let k = 0; k < 8 && nums.some(nb => meets(boxOf(o), nb)); k++) { if (out1) o.x += out1 * 5; else o.y += (o.y > CY ? 5 : -5); } }); });
  side.forEach(o => { const lo = x0(o); if (lo < 2) o.x += 2 - lo; if (lo + o.w > W - 2) o.x -= lo + o.w - (W - 2); o.y = Math.max(o.h / 2 + 1, Math.min(H - o.h / 2 - 1, o.y));
    o.l = o.anchor === 'start' ? [x0(o) - 3, o.y] : o.anchor === 'end' ? [x0(o) + o.w + 3, o.y] : [o.x, o.y + (o.y > CY ? -o.h / 2 - 1 : o.h / 2 + 1)]; });
  return out;
}
function sectorPath(s) {
  if (s.deg >= 360) return 'M' + f1(CX) + ' ' + f1(CY - R) + 'A' + R + ' ' + R + ' 0 1 1 ' + f1(CX - 0.01) + ' ' + f1(CY - R) + 'z';
  const a = pt(s.from, R), b = pt(s.to, R);
  return 'M' + CX + ' ' + CY + 'L' + f1(a[0]) + ' ' + f1(a[1]) + 'A' + R + ' ' + R + ' 0 ' + (s.deg > 180 ? 1 : 0) + ' 1 ' + f1(b[0]) + ' ' + f1(b[1]) + 'z';
}
function textEl(o) {
  const n = o.t.length, y0 = o.y - (n - 1) * (FS + 2) / 2 + FS * 0.35, anchor = o.inside ? 'middle' : o.anchor;   /* o.y is the label's middle */
  return o.t.map((t, k) => '<text class="' + (k ? 'cgd' : 'cgn') + '" x="' + f1(o.x) + '" y="' + f1(y0 + k * (FS + 2)) + '" text-anchor="' + anchor + '">' + esc(t) + '</text>').join('');
}
function svg(p, a, o) {
  o = o || {}; const S = spec(p), mode = o.mode || 'key', els = [], list = mode === 'blank' ? [] : norm(p, a), L = linesOf(p, list), secs = sectors(p, list);
  if (mode === 'live' && o.sel != null && secs[o.sel]) els.push('<path class="cgsel" d="' + sectorPath(secs[o.sel]) + '"/>');
  els.push('<circle class="cgo" cx="' + CX + '" cy="' + CY + '" r="' + R + '"/>');
  for (let d = 0; d < 360; d += S.step) { const big = d % 30 === 0, a0 = pt(d, R), a1 = pt(d, R - (big ? 11 : 7));
    els.push('<line class="' + (big ? 'cgk' : 'cgk2') + '" x1="' + f1(a0[0]) + '" y1="' + f1(a0[1]) + '" x2="' + f1(a1[0]) + '" y2="' + f1(a1[1]) + '"/>');
    if (big) { const t = pt(d, RN); els.push('<text class="cgb" x="' + f1(t[0]) + '" y="' + f1(t[1] + FN * 0.36) + '">' + d + '°</text>'); } }
  if (mode === 'live' && o.focus != null) { const c = pt(o.focus, R); els.push('<g class="cgcur"><line x1="' + CX + '" y1="' + CY + '" x2="' + f1(c[0]) + '" y2="' + f1(c[1]) + '"/><circle cx="' + f1(c[0]) + '" cy="' + f1(c[1]) + '" r="9"/></g>'); }
  L.forEach(d => { const e = pt(d, R); els.push('<line class="' + (d === 0 ? 'cgz' : 'cgl') + '" data-d="' + d + '" x1="' + CX + '" y1="' + CY + '" x2="' + f1(e[0]) + '" y2="' + f1(e[1]) + '"/>'); });
  if (mode === 'live' && o.ghost != null) { const e = pt(o.ghost, R + 4); els.push('<line class="cggh0" x1="' + CX + '" y1="' + CY + '" x2="' + f1(e[0]) + '" y2="' + f1(e[1]) + '"/><line class="cggh" x1="' + CX + '" y1="' + CY + '" x2="' + f1(e[0]) + '" y2="' + f1(e[1]) + '"/>'); }
  els.push('<circle class="cgc0" cx="' + CX + '" cy="' + CY + '" r="2.6"/>');
  if (mode !== 'blank') layout(secs, mode === 'key' && o.degs !== false).forEach(lb => {
    if (!lb.inside) els.push('<line class="cgld" x1="' + f1(lb.e[0]) + '" y1="' + f1(lb.e[1]) + '" x2="' + f1(lb.l[0]) + '" y2="' + f1(lb.l[1]) + '"/>');
    els.push(textEl(lb)); });
  if (mode === 'live') {
    /* the lines' ring (a touch there draws, so it does not scroll the page) and a handle on every mark, for the pointer and the checks */
    const ring = (r0, r1) => 'M' + CX + ' ' + f1(CY - r1) + 'A' + r1 + ' ' + r1 + ' 0 1 1 ' + CX + ' ' + f1(CY + r1) + 'A' + r1 + ' ' + r1 + ' 0 1 1 ' + CX + ' ' + f1(CY - r1) + 'z' +
      'M' + CX + ' ' + f1(CY - r0) + 'A' + r0 + ' ' + r0 + ' 0 1 0 ' + CX + ' ' + f1(CY + r0) + 'A' + r0 + ' ' + r0 + ' 0 1 0 ' + CX + ' ' + f1(CY - r0) + 'z';
    els.push('<path class="cgring" d="' + ring(RING0, RING1) + '"/>');
    for (let d = 0; d < 360; d += S.step) { const c = pt(d, R); els.push('<circle class="cgm" data-d="' + d + '" cx="' + f1(c[0]) + '" cy="' + f1(c[1]) + '" r="8"/>'); }
  }
  const alt = mode === 'blank' ? 'A blank circle marked every ' + S.step + '°, numbered every 30°, with a line from the center to 0°.' : list.length ? 'Circle graph: ' + listWords(list.map(s => ({ name: s.name || 'no name', deg: s.deg }))) + '.' : say(p, list);
  return '<svg class="cgg cg-' + mode + (o.cls ? ' ' + o.cls : '') + '" viewBox="0 0 ' + W + ' ' + H + '"' + (mode === 'live' ? ' aria-hidden="true" focusable="false"' : ' role="img" aria-label="' + esc(alt) + '"') + '>' + els.join('') + '</svg>';
}
/* the key, drawn, with its words under it (the teacher reads both; a screen reader the label) */
function keyHtml(p) { return '<span class="cgkey">' + svg(p, graphOf(p), { mode: 'key' }) + '<span class="cgkw">' + esc(keyWords(p)) + '</span></span>'; }
const keyText = g => 'cgraph:' + (Array.isArray(g) ? g : graphOf(g)).map(s => s.name + '=' + s.deg).join('|');

/* ---------------------------------------------------------------- the widget (ui.js draws it, wires it and repaints it) */
function namesHtml(id, p, a, sel) {
  const S = spec(p), secs = sectors(p, a), cur = secs[sel] ? secs[sel].name : null, on = secs.length >= 2 && secs[sel];
  const where = {}; secs.forEach(s => { if (s.name) where[s.name] = s; });
  return S.cats.map((c, k) => { const ch = c === cur, at = where[c];
    return '<button type="button" role="radio" data-cg="' + id + '" data-cgn="' + esc(c) + '" aria-checked="' + ch + '" tabindex="' + (ch || (cur == null && k === 0) ? 0 : -1) + '"' + (on ? '' : ' disabled') +
      ' class="' + (at && !ch ? 'used' : '') + '" aria-label="' + esc(c + (at && !ch ? ', now on the sector from ' + deg(at.from) + ' to ' + deg(at.to) : '')) + '">' + esc(c) + '</button>'; }).join('');
}
function pickText(p, a, sel) {
  const secs = sectors(p, a), s = secs[sel];
  if (secs.length < 2) return 'Draw a line to make sectors';
  return 'Sector ' + (sel + 1) + ' of ' + secs.length + ': ' + deg(s.from) + ' to ' + deg(s.to) + (s.name ? ', ' + s.name : '');
}
function widget(id, p, a, o) {
  o = o || {}; const S = spec(p), sel = o.sel || 0, secs = sectors(p, a), ok = secs.length >= 2, cur = o.focus || 0, lineAt = linesOf(p, a).indexOf(cur) >= 0;
  return '<div class="cgw" data-cgw="' + id + '"><div class="cgrd" id="cgr' + id + '" aria-hidden="true"></div>' +
    '<div class="cgc" id="cgc' + id + '" role="slider" tabindex="0" data-cg="' + id + '" aria-label="' + esc(o.label || 'Lines on the circle') + '. Arrow keys move ' + S.step + '°, Space draws or erases a line." aria-valuemin="0" aria-valuemax="' + (360 - S.step) + '" aria-valuenow="' + cur + '" aria-valuetext="' + esc(markWords(p, a, cur)) + '"' + (o.describedby ? ' aria-describedby="' + o.describedby + '"' : '') + '>' +
    svg(p, a, { mode: 'live', focus: cur, sel: ok ? sel : null }) + '</div>' +
    '<p class="cghow" aria-hidden="true">' + HOW + '</p>' +
    '<div class="cgctl"><div class="cgrow"><button type="button" class="cgpv" data-cg="' + id + '" data-cgstep="-1" tabindex="-1" aria-hidden="true"' + (ok ? '' : ' disabled') + '>‹</button>' +
    '<div class="cgpk" id="cgp' + id + '" role="slider" tabindex="0" data-cg="' + id + '" aria-label="Sector to name" aria-valuemin="1" aria-valuemax="' + Math.max(1, secs.length) + '" aria-valuenow="' + (ok ? sel + 1 : 1) + '" aria-valuetext="' + esc(pickText(p, a, sel)) + '"' + (ok ? '' : ' aria-disabled="true"') + '>' + esc(pickText(p, a, sel)) + '</div>' +
    '<button type="button" class="cgnx" data-cg="' + id + '" data-cgstep="1" tabindex="-1" aria-hidden="true"' + (ok ? '' : ' disabled') + '>›</button></div>' +
    '<div class="nseg cgseg" role="radiogroup" aria-label="Name for the sector" id="cgs' + id + '"><span class="nsl" aria-hidden="true">Name</span><span class="nsb cgnb">' + namesHtml(id, p, a, sel) + '</span></div>' +
    '<div class="cgacts"><button type="button" class="cgclr" data-cg="' + id + '" data-cgclr="1">Start over</button></div></div>' +
    '<div class="nsay" id="cgy' + id + '" aria-live="polite">' + esc(say(p, a)) + '</div></div>';
}
/* what to do, in a line under the circle (a screen reader hears the circle's own label instead) */
const HOW = 'Tap a mark to draw a line from the center. Tap it again to erase it. Then choose each sector and tap its name.';
function markWords(p, a, d) { return d === 0 ? '0°: the line to 0° is drawn' : deg(d) + (linesOf(p, a).indexOf(d) >= 0 ? ': a line is drawn' : ': no line'); }

/* ---------------------------------------------------------------- paper */
const INSTR = 'Draw and label the circle graph.';
const MC_LINE = 'Which graph shows the data?';
function blankHtml(p) { return '<div class="pcg">' + svg(p, null, { mode: 'blank', cls: 'cg-paper' }) + '</div>'; }

/* ---------------------------------------------------------------- the four graphs of an all-multiple-choice paper
   the key and three wrong graphs: the unit's (its graphs, each a named mistake) first, then the kit's — the names of the largest
   and the smallest sector traded; every sector the same size; the sizes in the reverse order against the names; then, if one of
   those is the key or another choice, the names turned one sector on, the two largest traded, the two smallest traded */
const canon = g => g.map(s => s.name + '=' + s.deg).sort().join('|');
function okGraph(p, g) { const S = spec(p); return Array.isArray(g) && g.length === S.key.length && canon(g.map(s => ({ name: s.name, deg: 0 }))) === canon(S.key.map(s => ({ name: s.name, deg: 0 }))) && Math.abs(g.reduce((t, s) => t + +s.deg, 0) - 360) < 1e-9 && g.every(s => +s.deg > 0); }
function defaults(p) {
  const k = graphOf(p), n = k.length, by = k.map((s, i) => i).sort((x, y) => k[y].deg - k[x].deg || x - y), big = by[0], small = by[n - 1];
  const trade = (i, j) => k.map((s, m) => ({ name: m === i ? k[j].name : m === j ? k[i].name : s.name, deg: s.deg }));
  return [trade(big, small), k.map(s => ({ name: s.name, deg: 360 / n })), k.map((s, m) => ({ name: s.name, deg: k[n - 1 - m].deg })),
    k.map((s, m) => ({ name: k[(m + 1) % n].name, deg: s.deg })), trade(by[0], by[1]), trade(by[n - 2], by[n - 1])];
}
function choices(p, unitGraphs) {
  const key = graphOf(p), seen = [canon(key)], wrong = [];
  (unitGraphs || []).map(g => Array.isArray(g) ? g : g && Array.isArray(g.graph) ? g.graph : null).concat(defaults(p)).forEach(g => {
    if (wrong.length >= 3 || !okGraph(p, g)) return; const c = canon(g); if (seen.indexOf(c) >= 0) return; seen.push(c); wrong.push(g.map(s => ({ name: String(s.name), deg: +s.deg }))); });
  return wrong.length === 3 ? [key].concat(wrong) : null;
}

/* ---------------------------------------------------------------- judging
   → {v: right | wrong | unread | blank, what, which: 'size' | 'names' | null, rule}
   lines(part, which, answer, ctx) may give the unit's own words for the one thing that is off; else the kit's */
function defaultLine(p, which) {
  if (which === 'size') return 'Each sector is its category’s fraction of the whole, times 360°. Find every angle first: together they make 360°. Then draw each sector from the line before it.';
  return 'The sizes are right, but a name is on the wrong sector. Match each name to the sector with its own angle.';
}
function judge(p, a, ctx, lines) {
  const k = graphOf(p), g = norm(p, a), n = k.length;
  if (!g.length) return { v: 'blank', what: [] };
  if (g.length !== n) return { v: 'unread', what: ['Draw one sector for each category: ' + n + ' sectors.'] };
  if (g.some(s => s.name == null)) return { v: 'unread', what: ['Name every sector.'] };
  const sz = l => l.map(s => s.deg).sort((x, y) => x - y).join(',');
  const which = sz(g) !== sz(k) ? 'size' : k.some(s => !g.some(t => t.name === s.name && t.deg === s.deg)) ? 'names' : null;
  if (!which) return { v: 'right', what: [] };
  let w = ''; try { w = lines ? lines(p, which, g, ctx || {}) || '' : ''; } catch (e) { w = ''; }
  return { v: 'wrong', what: [w || defaultLine(p, which)], which, rule: defaultLine(p, 'size') };
}
/* the three rungs a part without its own: the sizes, the first line, then every sector in turn — Hint 3 ends on the graph drawn */
function rungs(p) {
  const k = graphOf(p); let t = 0;
  const run = k.map(s => { const o = s.name + ' from ' + deg(t) + ' to ' + deg(t + s.deg); t += s.deg; return o; }).join(', ');
  const first = 'Start at the 0° line. Count ' + k[0].deg / spec(p).step + ' marks clockwise for ' + k[0].name + ' (' + deg(k[0].deg) + ') and draw its line there.';
  return { notice: defaultLine(p, 'size'), first: { say: first, ex: null },
    steps: [{ say: 'The angles: ' + listWords(k) + '. They add to 360°.', ex: null }, { say: 'Go clockwise from 0°, each sector starting at the line before it: ' + run + '.', ex: null }, { say: 'Label each sector with its category. Any order of sectors is fine, as long as each is its own size.', ex: null }] };
}

const api = { W, H, CX, CY, R, RING0, RING1, spec, check, graphOf, norm, empty, done, linesOf, sectors, fromLines, toggle, move, name, sectorAt, markAt, hit, pt, say, svg, keyHtml, keyText, keyWords, listWords, widget, namesHtml, pickText, markWords, blankHtml, INSTR, MC_LINE, choices, defaults, canon, judge, rungs, defaultLine, ANY };
if (typeof module !== 'undefined' && module.exports) module.exports = api;
else { const K = root.Kit = root.Kit || {}; K.CG = api; }
})(this);
