/* Practice kit: explain.js — the help's words and pictures (14 Nov 2026, the help proofs; see kit/HELP_STANDARD in the
   course plan). A small module of its own, so ui.js and kit.css stay untouched: everything here returns HTML that a unit's
   rungs, solution lines, walkthrough steps and coach lines carry in their own strings.
     Kit.X.gloss({id: {word, def, say, more, sym, ex, watch, see}})   a unit's glossary (the lesson decks' own terms and words);
                                         {word, def, card: 'otherId'} is a singular or plural that opens another entry's card
     Kit.X.term(id[, shown])             a term: bold, a dotted underline; a tap, a click, Enter or Space opens its card
                                         (27 Nov 2026; X.def is the same since the inline definition went)
     Kit.X.card(id[, from])              the card's HTML, pure (Node checks read it): the word, the definition, What it
                                         means, In symbols, Example, Watch out (one item, or two as <ul><li>…</li><li>…</li></ul>),
                                         Related words; from: the card a Back button returns to
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
/* a term is inline text (role button), not a <button>: a <button> is an inline block, so a line could break between it and the
   period after it ("Equality\n."), 15 Nov 2026. Since 27 Nov 2026 it opens its card (Croix, on A7 Unit 11's live page: "When I
   click on a vocab word, instead of opening in parentheses on the line, I would like a card to pop up that's the definition
   and everything else in depth about the word."): no inline definition, no title tooltip — the card holds the definition. */
X.term = (id, shown) => '<span role="button" tabindex="0" class="xterm" data-xterm="' + esc(id) + '" aria-haspopup="dialog">' + (shown || g(id).word) + '</span>';
X.def = X.term;                                                         /* it spelled the definition out inline: gone (14 Nov, then 27 Nov 2026) */
/* [[id]] or [[id|shown words]] in a help string: 'def' and 'tap' make every term tappable (bold, its card on a tap — Croix,
   14 Nov 2026: "Don't spell it out first"); 'plain' (inside an option button, which can't hold a button) leaves the word, bold.
   seen is kept for the units' calls (it carried the ids already spelled out across the strings of one rung). */
X.teach = (html, mode, seen) => String(html == null ? '' : html).replace(/\[\[([A-Za-z0-9]+)(?:\|([^\]]+))?\]\]/g, (m0, id, shown) => {
  if (mode === 'plain') return '<b>' + (shown || g(id).word) + '</b>';
  return X.term(id, shown); });

/* ---- the card (27 Nov 2026): X.card(id) is the HTML, pure; the dialog below only opens, swaps and closes it */
X.cardOf = id => { let k = id, n = 0; while (GL[k] && GL[k].card && n++ < 4) k = GL[k].card; return GL[k] ? k : null; };   /* a singular or plural opens its pair's card */
const lead = s => { s = String(s || '').trim(); if (/^[a-z]/.test(s)) s = s.charAt(0).toUpperCase() + s.slice(1); return s && !/[.?!:]$/.test(s.replace(/<[^>]*>/g, '').trim()) ? s + '.' : s; };
const SEC = [['more', 'What it means'], ['sym', 'In symbols'], ['ex', 'Example'], ['watch', 'Watch out']];
const XSVG = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 6L18 18M18 6L6 18"/></svg>';   /* the close mark drawn, never a multiplication sign */
X.card = (id, from) => {
  const k = X.cardOf(id); if (!k) return '';
  const e = GL[k], back = from && X.cardOf(from);
  let h = '<div class="xcard" data-xcard="' + esc(k) + '"><div class="xchead">' +
    (back ? '<button type="button" class="xcback" data-xback="' + esc(back) + '"><span aria-hidden="true">← </span>Back to ' + GL[back].word + '</button>' : '') +
    '<div class="xctop"><h2 class="xcword" id="xcard-t" tabindex="-1">' + e.word + '</h2>' +
    '<button type="button" class="xcx" data-xclose aria-label="Close">' + XSVG + '</button></div></div>';
  if (e.say) h += '<p class="xcsay"><i>Say it:</i> ' + e.say + '</p>';
  h += '<p class="xcdef" id="xcard-d">' + lead(e.def) + '</p>';
  /* a Watch out of two mistakes is two short items, <ul><li>…</li><li>…</li></ul> in the entry (27 Nov 2026, the lead's
     standard: HELP_STANDARD §3); the card shows them as two separate points, a quiet bar beside each, no bullets */
  SEC.forEach(([f, lab]) => { if (!e[f]) return; const v = String(e[f]);
    h += '<section class="xcsec xc-' + f + '"><h3 class="xclab">' + lab + '</h3>' + (f === 'ex' ? '<div class="xcex">' + v + '</div>' : f === 'sym' ? '<p class="xcsym">' + v + '</p>' :
      f === 'watch' && /^\s*<ul>/.test(v) ? v.replace(/^\s*<ul>/, '<ul class="xcwl">') : '<p>' + v + '</p>') + '</section>'; });
  const see = (e.see || []).map(s => X.cardOf(s)).filter((s, i, a) => s && s !== k && a.indexOf(s) === i);
  if (see.length) h += '<section class="xcsec xc-see"><h3 class="xclab">Related words</h3><div class="xcsee">' +
    see.map(s => '<button type="button" class="xcchip" data-xsee="' + esc(s) + '">' + GL[s].word + '</button>').join('') + '</div></section>';
  return h + '</div>';
};
X.glossary = () => GL;
X.ids = html => { const out = []; String(html || '').replace(/\[\[([A-Za-z0-9]+)/g, (m0, id) => { if (out.indexOf(id) < 0) out.push(id); }); return out; };
/* a unit's own figure, drawn at the help panel's width: its fixed max-width goes, so the labels grow with the drawing */
X.big = svg => String(svg || '').replace(/ style="max-width:\d+px"/, '').replace('<svg class="', '<svg class="xbig ');
X.c = (n, html) => '<span class="xc xc' + n + '">' + html + '</span>';
X.fig = (svg, cap) => '<figure class="xfig">' + svg + (cap ? '<figcaption>' + cap + '</figcaption>' : '') + '</figure>';

/* ---- SVG pieces: text is plain (no tags), numbers already formatted by the unit */
const T = (x, y, s, cls, anchor) => '<text x="' + r1(x) + '" y="' + r1(y) + '" class="' + (cls || 'xt') + '"' + (anchor ? ' text-anchor="' + anchor + '"' : '') + '>' + esc(s) + '</text>';
const r1 = v => Math.round(v * 10) / 10;
const tw = s => String(s).length * 9.6 + 14;                          /* a chip's width for its text at 15px */                         /* a chip's width for its text at 13px */
const svgOpen = (w, h, label) => '<svg class="xsvg" viewBox="0 0 ' + r1(w) + ' ' + r1(h) + '" role="img" aria-label="' + esc(label) + '">';

/* a balance: left and right are lists of chips {t, c (colour 1–3, optional), add (a chip just put on: dashed edge), gone (a
   chip that cancels: struck through)} */
X.balance = ({ left, right, label, tag }) => {
  /* chips sit on the pans two to a row (a third goes on a row above), so the drawing keeps the panel's width and its labels their size */
  const rows = cs => [cs.slice(0, 2), cs.slice(2)].filter(r => r.length), rw = r => r.reduce((t, c) => t + tw(c.t) + 6, -6);
  const half = Math.max(...rows(left).map(rw), ...rows(right).map(rw)) + 20, up = Math.max(rows(left).length, rows(right).length) > 1 ? 40 : 0;
  const W = Math.max(280, 2 * half + 24), cx = W / 2, beamY = 70 + up, lm = cx - 16 - half / 2, rm = cx + 16 + half / 2;
  const row = (cs, mid) => { let out = '';
    rows(cs).forEach((r, j) => { let x = mid - rw(r) / 2; const y0 = beamY - 40 - j * 40;
      r.forEach(c => { const w = tw(c.t);
        out += '<rect x="' + r1(x) + '" y="' + y0 + '" width="' + r1(w) + '" height="34" rx="7" class="xchip' + (c.c ? ' xs' + c.c : '') + (c.add ? ' xadd' : '') + (c.gone ? ' xgone' : '') + '"/>' +
          T(x + w / 2, y0 + 18, c.t, 'xt', 'middle') + (c.gone ? '<line x1="' + r1(x + 4) + '" y1="' + (y0 + 31) + '" x2="' + r1(x + w - 4) + '" y2="' + (y0 + 3) + '" class="xstrike"/>' : '');
        x += w + 6; }); });
    return out; };
  return svgOpen(W, 120 + up, label || 'A balance: the left side equals the right side') +
    '<line x1="' + r1(lm - half / 2) + '" y1="' + beamY + '" x2="' + r1(rm + half / 2) + '" y2="' + beamY + '" class="xbeam"/>' +
    '<path d="M' + cx + ' ' + beamY + ' L' + (cx - 18) + ' ' + (beamY + 32) + ' L' + (cx + 18) + ' ' + (beamY + 32) + ' Z" class="xpivot"/>' +
    T(cx, beamY + 44, tag || 'equal', 'xt xmut', 'middle') + row(left, lm) + row(right, rm) + T(cx, beamY - 22, '=', 'xt xeq', 'middle') + '</svg>';
};

/* a tape diagram: rows [{segs: [{w, t, c, dash, brace}], x0}] on one scale; w in units, the whole drawing fits W */
X.tape = ({ rows, label, unitW }) => {
  const W = 280, H = 32, gap = 22, L = rows.some(r => r.lab) ? 24 : 2, RM = rows.some(r => r.mark) ? 46 : 2; let y = 6, out = '', maxU = 0;
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
  const W = 280, y = 46, m = Math.max(Math.abs(a), Math.abs(b)) + 1, k = (W / 2 - 20) / m, X0 = W / 2, px = v => X0 + v * k;
  let out = '<line x1="10" y1="' + y + '" x2="' + (W - 10) + '" y2="' + y + '" class="xaxis"/>';
  for (let v = -m; v <= m; v++) out += '<line x1="' + r1(px(v)) + '" y1="' + (y - 4) + '" x2="' + r1(px(v)) + '" y2="' + (y + 4) + '" class="xaxis"/>' + (v === 0 ? T(px(0), y + 18, '0', 'xt xsm', 'middle') : '');
  const dot = (v, cls, lab, up) => '<circle cx="' + r1(px(v)) + '" cy="' + y + '" r="5.5" class="xdot ' + cls + '"/>' + T(px(v), up ? y - 14 : y + 20, lab, 'xt', 'middle');
  const arc = (v1, v2, cls) => { const x1 = px(v1), x2 = px(v2); return '<path d="M' + r1(x1) + ' ' + (y - 8) + ' Q' + r1((x1 + x2) / 2) + ' ' + (y - 40) + ' ' + r1(x2) + ' ' + (y - 8) + '" class="xarc ' + cls + '"/>'; };
  out += arc(a, -a, 'xs1') + arc(b, -b, 'xs2') + dot(a, 'xs1', String(a), false) + dot(b, 'xs2', String(b), false) + dot(-a, 'xs1', '−' + a, false) + dot(-b, 'xs2', '−' + b, false);
  return svgOpen(W, 76, label || 'Opposites on a number line') + out + '</svg>';
};

/* a right triangle: legs a (along the bottom) and b (up the side), hypotenuse c; each {t (its label), c (colour)}; the
   proportions come from the real lengths when both legs are known (la, lb), else a 4:3 shape */
X.rightTri = ({ a, b, c, la, lb, label }) => {
  const W = 280, ratio = la && lb ? lb / la : 0.75, w = Math.max(70, Math.min(150, 150 / ratio)), h = Math.max(60, Math.min(150, w * ratio));
  const x0 = 100, y0 = 14 + h, P = [x0, y0], Q = [x0 + w, y0], R = [x0, y0 - h];
  const L = (p, q, cls) => '<line x1="' + r1(p[0]) + '" y1="' + r1(p[1]) + '" x2="' + r1(q[0]) + '" y2="' + r1(q[1]) + '" class="xside ' + cls + '"/>';
  let out = '<path d="M' + x0 + ' ' + (y0 - 14) + ' h14 v14" class="xra"/>' + L(P, Q, 'xs' + (a.c || 2)) + L(P, R, 'xs' + (b.c || 2)) + L(Q, R, 'xs' + (c.c || 1) + ' xthick');
  const lines = (t, x, y, anchor) => String(t).split('\n').map((ln, i) => T(x, y + i * 18, ln, 'xt', anchor)).join('');
  out += lines(a.t, x0 + w / 2, y0 + 20, 'middle') + lines(b.t, x0 - 10, y0 - h / 2 - 8, 'end') + lines(c.t, x0 + w / 2 + 14, y0 - h / 2 - 16, 'start');
  return svgOpen(W, y0 + 52, label || 'A right triangle') + out + '</svg>';
};

/* two similar triangles, one above the other, at the panel's width: A and B are {s: [p, q, r] side lengths, lab: [p, q, r]
   labels, nm: [3 corner letters]}; side p runs between corners 0 and 2, q between 1 and 2, r between 0 and 1 (as the units'
   figures do); col: {p, q, r} → signal colour 1–3 (or 0 for plain); turn: 'flip' mirrors the second, '180' turns it */
X.simPair = ({ A, B, col, turn, label }) => {
  const pts = s => { const [p, q, r] = s.map(Number), x = (p * p - q * q + r * r) / (2 * r), y = Math.sqrt(Math.max(0, p * p - x * x)); return [[0, 0], [r, 0], [x, y]]; };
  const PA = pts(A.s), PB = pts(B.s), box = P => { const xs = P.map(v => v[0]), ys = P.map(v => v[1]); return [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]; };
  const ba = box(PA), bb = box(PB), sc = Math.min(210 / Math.max(ba[1] - ba[0], bb[1] - bb[0]), 130 / Math.max(ba[3] - ba[2], bb[3] - bb[2]));
  const W = 280; let out = '', y = 30;
  [[A, PA, ba, ''], [B, PB, bb, turn]].forEach(([T0, P, bx, tn]) => {
    const wpx = (bx[1] - bx[0]) * sc, hpx = (bx[3] - bx[2]) * sc, ox = (W - wpx) / 2;
    let Q = P.map(v => [ox + (v[0] - bx[0]) * sc, y + hpx - (v[1] - bx[2]) * sc]);
    if (tn === 'flip') Q = Q.map(v => [2 * ox + wpx - v[0], v[1]]); else if (tn === '180') Q = Q.map(v => [2 * ox + wpx - v[0], 2 * y + hpx - v[1]]);
    const cen = [(Q[0][0] + Q[1][0] + Q[2][0]) / 3, (Q[0][1] + Q[1][1] + Q[2][1]) / 3], E = { p: [0, 2], q: [1, 2], r: [0, 1] };
    out += '<polygon points="' + Q.map(v => r1(v[0]) + ',' + r1(v[1])).join(' ') + '" class="xtri"/>';
    ['p', 'q', 'r'].forEach((sd, i) => { const a = Q[E[sd][0]], b = Q[E[sd][1]], k = col && col[sd];
      out += '<line x1="' + r1(a[0]) + '" y1="' + r1(a[1]) + '" x2="' + r1(b[0]) + '" y2="' + r1(b[1]) + '" class="xside ' + (k ? 'xs' + k : 'xplain') + '"/>';
      const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], d = [m[0] - cen[0], m[1] - cen[1]], L = Math.hypot(d[0], d[1]) || 1;
      out += T(m[0] + d[0] / L * 16, m[1] + d[1] / L * 16, T0.lab[i], 'xt' + (k ? ' xf' + k : ''), 'middle'); });
    if (T0.nm) Q.forEach((v, i) => { const d = [v[0] - cen[0], v[1] - cen[1]], L = Math.hypot(d[0], d[1]) || 1; out += T(v[0] + d[0] / L * 15, v[1] + d[1] / L * 15, T0.nm[i], 'xt xmut', 'middle'); });
    y += hpx + 58; });
  return svgOpen(W, y - 20, label || 'Two similar triangles') + out + '</svg>';
};

/* ---- the card's dialog (27 Nov 2026): one <dialog>, made on first use, modal, reused. A tap, a click, Enter or Space on a
   term opens it (delegated, so it survives every repaint of a question); a related word swaps it and Back walks the trail;
   ×, Esc and the backdrop close it, and the focus goes back to the term. Every key pressed inside it stops at the window
   (capture), so the page's own handlers never see it; the page under it does not scroll. A modal <dialog> is a close request's
   target, so Android's back gesture closes it (Chrome 120 and later) without a history entry: the page's #set-… is untouched. */
if (typeof document !== 'undefined') {
  const D = { el: null, opener: null, trail: [], cur: null, down: false };
  const title = () => document.getElementById('xcard-t');
  const make = () => { if (D.el) return D.el;
    const d = document.createElement('dialog'); d.className = 'xdlg'; d.setAttribute('aria-labelledby', 'xcard-t'); d.setAttribute('aria-describedby', 'xcard-d');
    d.innerHTML = '<div class="xcwrap"></div>'; document.body.appendChild(d);
    d.firstChild.addEventListener('scroll', () => { const w = d.firstChild; w.classList.toggle('xsc', w.scrollTop > 2); }, { passive: true });   /* a hairline under the header once the card scrolls under it */
    d.addEventListener('pointerdown', e => { D.down = e.target === d; });
    d.addEventListener('click', e => { const t = e.target;
      if (t === d) { const r = d.firstChild.getBoundingClientRect(), out = e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
        if (out && D.down) shut(); D.down = false; return; }                 /* the backdrop: a press and a release both outside the card */
      const b = t.closest ? t.closest('[data-xclose],[data-xsee],[data-xback]') : null; if (!b) return;
      if (b.hasAttribute('data-xclose')) shut();
      else if (b.hasAttribute('data-xsee')) { D.trail.push(D.cur); show(b.getAttribute('data-xsee')); }
      else { D.trail.pop(); show(b.getAttribute('data-xback')); } });
    d.addEventListener('close', () => { document.documentElement.classList.remove('xlock', 'xlockg'); D.trail = []; D.cur = null;
      const o = D.opener; D.opener = null; if (o && o.isConnected) o.focus(); });
    return (D.el = d); };
  const show = id => { const w = D.el.firstChild; D.cur = X.cardOf(id); w.innerHTML = X.card(D.cur, D.trail.length ? D.trail[D.trail.length - 1] : null); w.scrollTop = 0;
    const t = title(); if (t) t.focus({ preventScroll: true }); };
  const open = (id, from) => { if (!X.cardOf(id)) return; const d = make(); D.opener = from; D.trail = [];
    const r = document.documentElement; if (window.innerWidth > r.clientWidth) r.classList.add('xlockg'); r.classList.add('xlock');   /* the page stays put, its scrollbar's room kept */
    if (!d.open) d.showModal(); show(id); };
  const shut = () => { if (D.el && D.el.open) D.el.close(); };
  X.open = open; X.close = shut; X.dialog = () => D.el;
  document.addEventListener('click', e => { const b = e.target && e.target.closest ? e.target.closest('[data-xterm]') : null; if (b && !(D.el && D.el.contains(b))) open(b.getAttribute('data-xterm'), b); });
  document.addEventListener('keydown', e => { const b = e.target && e.target.closest ? e.target.closest('[data-xterm]') : null;
    if (b && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); open(b.getAttribute('data-xterm'), b); } });
  ['keydown', 'keyup', 'keypress'].forEach(type => window.addEventListener(type, e => {
    const d = D.el; if (!d || !d.open || !e.target || !(e.target === d || d.contains(e.target))) return;
    e.stopImmediatePropagation();                                        /* the card's keys are its own: the page behind never hears them */
    if (type === 'keydown' && (e.key === 'Escape' || e.key === 'Esc')) { e.preventDefault(); shut(); } }, true));
}
/* a Why: that only names a property or theorem gets what it lets you do, so it is a sentence (15 Nov 2026) */
const DOES = { addProp: 'lets you add the same number to both sides and keep them equal', subProp: 'lets you subtract the same number from both sides and keep them equal',
  mulProp: 'lets you multiply both sides by the same number and keep them equal', divProp: 'lets you divide both sides by the same number and keep them equal',
  addPropI: 'lets you add the same number to both sides and keep the inequality true', subPropI: 'lets you subtract the same number from both sides and keep the inequality true',
  mulPropI: 'lets you multiply both sides by the same number, but a negative number reverses the symbol', distProp: 'says the number outside multiplies every term inside the parentheses',
  pyth: 'says a² + b² = c² in every right triangle, where c is the hypotenuse' };
X.whyOf = w => String(w || '').replace(/^the \[\[(\w+)\]\](?:\.|:)?\s*(.*)$/, (m0, id, rest) => { if (!DOES[id]) return m0; if (/^(keeps|undoes|lets|says)\b/.test(rest) || /^[a-c]²/.test(rest)) rest = '';   /* a rest that only restates the property */
  return 'the [[' + id + ']] ' + DOES[id] + '.' + (rest ? ' ' + rest.charAt(0).toUpperCase() + rest.slice(1) : ''); });
root.Kit = root.Kit || {}; root.Kit.X = X;
if (typeof module !== 'undefined' && module.exports) module.exports = X;
})(typeof window !== 'undefined' ? window : this);
