/* Practice kit: explain.js — the help's words and pictures (14 Nov 2026, the help proofs; see kit/HELP_STANDARD in the
   course plan). A small module of its own, so ui.js and kit.css stay untouched: everything here returns HTML that a unit's
   rungs, solution lines, walkthrough steps and coach lines carry in their own strings.
     Kit.X.gloss({id: {word, def}})      a unit's glossary (the lesson decks' own terms and words)
     Kit.X.def(id[, shown])              a term the first time: highlighted, with its plain definition right after it
     Kit.X.term(id[, shown])             a term after that: highlighted, tap to show its definition inline (tap again to hide)
     Kit.X.c(n, html)                    signaling: words in colour n (1–3) with a matching underline style, so the link from a
                                         word to its part of the picture never rests on colour alone
     Kit.X.fig(svg, caption)             a picture with its caption, sized for a phone
     Kit.X.balance({left, right, note})  an equation as a balance: chips on two pans (the decks' "algebra tiles on a balance")
     Kit.X.tape({rows, w})               a tape (bar) diagram: rows of segments on one scale, braces under segments
     Kit.X.mirror({a, b})                why a negative multiplier reverses the symbol: a < b, then −a > −b, on one number line
     Kit.X.rightTri({a, b, c, ...})      a right triangle with its right angle marked, the hypotenuse and the legs in colour
   Pure string builders: they run under Node too (a unit's checks can read what they print). */
(function (root) {
'use strict';
const esc = s => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
const GL = {};
const X = {};
X.gloss = o => { Object.assign(GL, o); return GL; };
X.has = id => Object.prototype.hasOwnProperty.call(GL, id);
const g = id => GL[id] || { word: id, def: '' };
X.def = (id, shown) => '<span class="xterm xfirst">' + (shown || g(id).word) + '</span><span class="xdefn"> (' + g(id).def + ')</span>';
X.term = (id, shown) => '<button type="button" class="xterm" data-xterm="' + esc(id) + '" aria-expanded="false" title="' + esc(g(id).def) + '">' + (shown || g(id).word) +
  '</button><span class="xdef" role="note" hidden> — ' + g(id).def + '</span>';
X.c = (n, html) => '<span class="xc xc' + n + '">' + html + '</span>';
X.fig = (svg, cap) => '<figure class="xfig">' + svg + (cap ? '<figcaption>' + cap + '</figcaption>' : '') + '</figure>';

/* ---- SVG pieces: text is plain (no tags), numbers already formatted by the unit */
const T = (x, y, s, cls, anchor) => '<text x="' + r1(x) + '" y="' + r1(y) + '" class="' + (cls || 'xt') + '"' + (anchor ? ' text-anchor="' + anchor + '"' : '') + '>' + esc(s) + '</text>';
const r1 = v => Math.round(v * 10) / 10;
const tw = s => String(s).length * 7.4 + 14;                         /* a chip's width for its text at 13px */
const svgOpen = (w, h, label) => '<svg class="xsvg" viewBox="0 0 ' + r1(w) + ' ' + r1(h) + '" style="max-width:' + Math.ceil(w) + 'px" role="img" aria-label="' + esc(label) + '">';

/* a balance: left and right are lists of chips {t, c (colour 1–3, optional), add (a chip just put on: dashed edge), gone (a
   chip that cancels: struck through)} */
X.balance = ({ left, right, label, tag }) => {
  const W = 340, cx = W / 2, beamY = 66, pan = 132, chipsW = cs => cs.reduce((s, c) => s + tw(c.t) + 6, -6);
  const row = (cs, mid) => { let x = mid - chipsW(cs) / 2, out = '';
    cs.forEach(c => { const w = tw(c.t);
      out += '<rect x="' + r1(x) + '" y="' + (beamY - 34) + '" width="' + r1(w) + '" height="28" rx="6" class="xchip' + (c.c ? ' xs' + c.c : '') + (c.add ? ' xadd' : '') + (c.gone ? ' xgone' : '') + '"/>' +
        T(x + w / 2, beamY - 15, c.t, 'xt', 'middle') + (c.gone ? '<line x1="' + r1(x + 4) + '" y1="' + (beamY - 8) + '" x2="' + r1(x + w - 4) + '" y2="' + (beamY - 30) + '" class="xstrike"/>' : '');
      x += w + 6; });
    return out; };
  const lm = cx - 84, rm = cx + 84;
  return svgOpen(W, 112, label || 'A balance: the left side equals the right side') +
    '<line x1="' + (lm - pan / 2) + '" y1="' + beamY + '" x2="' + (rm + pan / 2) + '" y2="' + beamY + '" class="xbeam"/>' +
    '<path d="M' + cx + ' ' + beamY + ' L' + (cx - 16) + ' ' + (beamY + 30) + ' L' + (cx + 16) + ' ' + (beamY + 30) + ' Z" class="xpivot"/>' +
    T(cx, beamY + 44, tag || 'equal', 'xt xmut', 'middle') + row(left, lm) + row(right, rm) + T(cx, beamY - 20, '=', 'xt xeq', 'middle') + '</svg>';
};

/* a tape diagram: rows [{segs: [{w, t, c, dash, brace}], x0}] on one scale; w in units, the whole drawing fits W */
X.tape = ({ rows, label, unitW }) => {
  const W = 340, H = 30, gap = 22, L = rows.some(r => r.lab) ? 30 : 2, RM = rows.some(r => r.mark) ? 58 : 2; let y = 6, out = '', maxU = 0;
  rows.forEach(r => { maxU = Math.max(maxU, (r.x0 || 0) + r.segs.reduce((s, z) => s + z.w, 0)); });
  const k = unitW || (W - L - RM) / maxU;
  rows.forEach(r => { let x = L + (r.x0 || 0) * k;
    if (r.lab) out += T(4, y + H / 2 + 1, r.lab, 'xt', 'start');
    if (r.mark) out += T(W - RM + 8, y + H / 2 + 1, r.mark, 'xt', 'start');
    r.segs.forEach(z => { const w = z.w * k;
      out += '<rect x="' + r1(x) + '" y="' + y + '" width="' + r1(w) + '" height="' + H + '" class="xseg' + (z.c ? ' xs' + z.c : '') + (z.dash ? ' xdash' : '') + '"/>' + (z.t ? T(x + w / 2, y + H / 2 + 1, z.t, 'xt', 'middle') : '');
      if (z.cells) { const cw = w / z.cells.length;                  /* equal cells inside one segment: "10.50 | 10.50 | … | 10.50" */
        z.cells.forEach((t, i) => { if (i) out += '<line x1="' + r1(x + i * cw) + '" y1="' + y + '" x2="' + r1(x + i * cw) + '" y2="' + (y + H) + '" class="xseg' + (z.c ? ' xs' + z.c : '') + '"/>';
          out += T(x + (i + 0.5) * cw, y + H / 2 + 1, t, 'xt xsm', 'middle'); }); }
      if (z.brace) out += '<path d="M' + r1(x + 2) + ' ' + (y + H + 4) + ' q0 6 6 6 L' + r1(x + w / 2 - 5) + ' ' + (y + H + 10) + ' l5 5 l5 -5 L' + r1(x + w - 8) + ' ' + (y + H + 10) + ' q6 0 6 -6" class="xbrace"/>' + T(x + w / 2, y + H + 26, z.brace, 'xt xsm', 'middle');
      x += w; });
    y += H + (r.segs.some(z => z.brace) ? gap + 14 : 10) + (r.after || 0); });
  return svgOpen(W, y, label || 'A tape diagram') + out + '</svg>';
};

/* why the symbol reverses: a and b (0 < a < b) and their opposites on one number line */
X.mirror = ({ a, b, label }) => {
  const W = 340, y = 46, m = Math.max(Math.abs(a), Math.abs(b)) + 1, k = (W / 2 - 20) / m, X0 = W / 2, px = v => X0 + v * k;
  let out = '<line x1="10" y1="' + y + '" x2="' + (W - 10) + '" y2="' + y + '" class="xaxis"/>';
  for (let v = -m; v <= m; v++) out += '<line x1="' + r1(px(v)) + '" y1="' + (y - 4) + '" x2="' + r1(px(v)) + '" y2="' + (y + 4) + '" class="xaxis"/>' + (v === 0 ? T(px(0), y + 18, '0', 'xt xsm', 'middle') : '');
  const dot = (v, cls, lab, up) => '<circle cx="' + r1(px(v)) + '" cy="' + y + '" r="5.5" class="xdot ' + cls + '"/>' + T(px(v), up ? y - 14 : y + 20, lab, 'xt', 'middle');
  const arc = (v1, v2, cls) => { const x1 = px(v1), x2 = px(v2); return '<path d="M' + r1(x1) + ' ' + (y - 8) + ' Q' + r1((x1 + x2) / 2) + ' ' + (y - 40) + ' ' + r1(x2) + ' ' + (y - 8) + '" class="xarc ' + cls + '"/>'; };
  out += arc(a, -a, 'xs1') + arc(b, -b, 'xs2') + dot(a, 'xs1', String(a), false) + dot(b, 'xs2', String(b), false) + dot(-a, 'xs1', '−' + a, false) + dot(-b, 'xs2', '−' + b, false);
  return svgOpen(W, 76, label || 'Opposites on a number line') + out + '</svg>';
};

/* a right triangle: legs a (along the bottom) and b (up the side), hypotenuse c; each {t (its label), c (colour)}; the
   proportions come from the real lengths when both legs are known (la, lb), else a 4:3 shape */
X.rightTri = ({ a, b, c, la, lb, label, notes }) => {
  const W = 300, H0 = 170, ratio = la && lb ? lb / la : 0.75, w = Math.min(190, 150 / Math.max(ratio, 0.4)), h = Math.min(140, w * ratio);
  const x0 = 60, y0 = 16 + h, P = [x0, y0], Q = [x0 + w, y0], R = [x0, y0 - h];        /* P the right angle; R up the side */
  const L = (p, q, cls) => '<line x1="' + r1(p[0]) + '" y1="' + r1(p[1]) + '" x2="' + r1(q[0]) + '" y2="' + r1(q[1]) + '" class="xside ' + cls + '"/>';
  let out = '<path d="M' + x0 + ' ' + (y0 - 12) + ' h12 v12" class="xra"/>' +
    L(P, Q, 'xs' + (a.c || 2)) + L(P, R, 'xs' + (b.c || 2)) + L(Q, R, 'xs' + (c.c || 1) + ' xthick');
  out += T(x0 + w / 2, y0 + 20, a.t, 'xt', 'middle') + T(x0 - 8, y0 - h / 2 + 4, b.t, 'xt', 'end') + T(x0 + w / 2 + 12, y0 - h / 2 - 8, c.t, 'xt', 'start');
  if (notes) out += T(x0 + 18, y0 - 18, notes, 'xt xsm', 'start');
  return svgOpen(W, Math.max(H0, y0 + 30), label || 'A right triangle') + out + '</svg>';
};

/* the inline definition of a tapped term (delegated, so it survives every repaint of a card) */
if (typeof document !== 'undefined') document.addEventListener('click', e => {
  const b = e.target && e.target.closest ? e.target.closest('[data-xterm]') : null; if (!b) return;
  const d = b.nextElementSibling; if (!d || !d.classList.contains('xdef')) return;
  const open = d.hidden; d.hidden = !open; b.setAttribute('aria-expanded', open ? 'true' : 'false');
});
root.Kit = root.Kit || {}; root.Kit.X = X;
if (typeof module !== 'undefined' && module.exports) module.exports = X;
})(typeof window !== 'undefined' ? window : this);
