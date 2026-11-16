/* Draw — the drawing kit: a picture from a short description of it. A spec (JSON) goes in and an SVG string comes out.
   Croix, 15 Nov 2026, asked whether to copy the pictures of the state's released tests or draw them again: "I would rather
   redraw everything so we have the skills to do it. Because I'm going to want to build a bunch of banks and generators. So
   probably better if we learn how to rebuild it exactly." So it draws the way the state draws the pictures of its tests
   (FLDOE's released FAST and EOC booklets): the weights, arrowheads, ticks, dashes, greys and tints below were measured on
   those pages at 288 dpi, the text is set by Verdana's own advance widths (the state's face), and a graph's numbers sit
   behind its plotted lines. Nothing here knows one test from another: a bank, a generator or a page calls it with a spec of
   its own. A browser script or a Node module (new Function("window", source)(w)), with no dependencies.

   Lengths are points, as on a page. A grid's own things (its lines, points, shading) are in the graph's units.
   A drawing's scale is its label size over 12: an 8-point graph has every stroke two thirds as heavy.

   window.Draw = { svg(spec, { alt, px, pad }), lay(spec, o), text(s, size, bold), widths, kinds }
     svg:  the picture. alt is its aria-label (role="img"; without one it is aria-hidden). px is the CSS pixels a point of a
           full-size drawing is shown at (1.64: a 12-point label is the size of the FAST's on screen; a drawing at a smaller
           scale is shown that much larger, so its labels are that size too). pad is the air round the ink, in points (1.5).
     lay:  { svg, x, y, w, h, texts } — the drawing with its box in its own points and every string it set, each with where
           (x, baseline y, width, size; id names it: "x:3", "ytitle", "plot:2", "item:5"), for a tool that measures a drawing
           against a picture (measure/, check.mjs).
     text: the width of a string in points;  widths: the tables it is set on.

   The kinds of picture (spec.kind); each one's fields are listed where it is drawn, below:
     "grid"        a coordinate grid: axes, ticks, numbers, titles; lines, rays, segments, curves, points, shaded half-planes
                   and their unions and intersections, text
     "numberline"  a number line with rays and segments, open and closed ends
     "pie"         a circle graph
     "bars"        bars split into stacked parts, in a frame, with a key
     "shape"       free drawing
   Every kind takes items: free drawing in points (lines, polygons, circles, ellipses, measures, right-angle marks, text),
   for what its own rules do not place.

   The face: a drawing asks for Verdana and then for Draw Sans (fonts/: DejaVu Sans set on Verdana's widths by face.py), which
   a page that shows drawings carries for the devices that have no Verdana; a page can name another face in --drawf.
   README.md has how a tool takes the kit in and how a picture is read off a page (measure/) and held to it (check.mjs). */
(function (root) {
  "use strict";
  var INK = "#2e2e2e", GRID = "#959595", PAPER = "#fff";
  /* the state's face; where a device has no Verdana, the kit's own (Draw Sans: fonts/, made by face.py — DejaVu Sans set
     on Verdana's widths), which a page carries; a page can name another in --drawf. The state's text has no kerning. */
  var FACE = "font-family:var(--drawf,Verdana),Verdana,'Draw Sans','DejaVu Sans',sans-serif;font-kerning:none";
  var PX = 1.64;

  /* ---- Verdana's advance widths, thousandths of an em (regular; bold). Italic is set on the regular widths. */
  var WR = { " ": 352, "!": 394, "\"": 459, "#": 818, "$": 636, "%": 1076, "&": 727, "'": 269, "(": 454, ")": 454, "*": 636, "+": 818, ",": 364, "-": 454, ".": 364, "/": 454,
    "0": 636, "1": 636, "2": 636, "3": 636, "4": 636, "5": 636, "6": 636, "7": 636, "8": 636, "9": 636, ":": 454, ";": 454, "<": 818, "=": 818, ">": 818, "?": 545, "@": 1000,
    A: 684, B: 686, C: 698, D: 771, E: 632, F: 575, G: 775, H: 751, I: 421, J: 455, K: 693, L: 557, M: 843, N: 748, O: 787, P: 603, Q: 787, R: 695, S: 684, T: 616, U: 732, V: 684, W: 989, X: 685, Y: 615, Z: 685,
    a: 601, b: 623, c: 521, d: 623, e: 596, f: 352, g: 623, h: 633, i: 274, j: 344, k: 592, l: 274, m: 973, n: 633, o: 607, p: 623, q: 623, r: 427, s: 521, t: 394, u: 633, v: 592, w: 818, x: 592, y: 592, z: 525,
    "–": 636, "—": 1000, "−": 818, "’": 269, "‘": 269, "°": 542, "π": 633 };
  var WB = { " ": 342, "!": 402, "%": 1271, "(": 543, ")": 543, ",": 361, "-": 480, ".": 361, "/": 689, ":": 402,
    "0": 711, "1": 711, "2": 711, "3": 711, "4": 711, "5": 711, "6": 711, "7": 711, "8": 711, "9": 711,
    A: 776, B: 762, C: 724, D: 830, E: 683, F: 650, G: 811, H: 837, I: 546, J: 555, K: 771, L: 637, M: 948, N: 847, O: 850, P: 733, Q: 850, R: 782, S: 710, T: 682, U: 812, V: 764, W: 1128, X: 764, Y: 737, Z: 692,
    a: 668, b: 699, c: 588, d: 699, e: 664, f: 422, g: 699, h: 712, i: 342, j: 403, k: 671, l: 342, m: 1058, n: 712, o: 687, p: 699, q: 699, r: 497, s: 593, t: 456, u: 712, v: 650, w: 979, x: 669, y: 651, z: 597,
    "–": 711, "’": 332, "‘": 332 };
  /* ---- and Draw Sans's own, for the characters no page of the state's gave a width for (face.py --tables prints these) */
  var XR = { "[": 390, "\\": 337, "]": 390, "^": 838, "_": 500, "`": 500, "{": 636, "|": 337, "}": 636, "~": 838, " ": 318, "¡": 401, "¢": 636, "£": 636, "¤": 636, "¥": 636, "¦": 337, "§": 500,
    "¨": 500, "©": 1000, "ª": 471, "«": 612, "¬": 838, "­": 361, "®": 1000, "¯": 500, "±": 838, "²": 401, "³": 401, "´": 500, "µ": 636, "¶": 636, "·": 318, "¸": 500, "¹": 401, "º": 471,
    "»": 612, "¼": 969, "½": 969, "¾": 969, "¿": 531, "Æ": 974, "Ð": 775, "×": 838, "Ø": 787, "Þ": 605, "ß": 630, "æ": 982, "ð": 612, "÷": 838, "ø": 612, "þ": 635, "“": 518, "”": 518,
    "•": 590, "…": 1000, "′": 227, "″": 374, "≈": 838, "≤": 838, "≥": 838, "√": 637, "∞": 833, "θ": 612, "Δ": 684, "∠": 896, "⊥": 871, "∥": 500, "△": 769, "≅": 838, "∼": 838 };
  var XB = { "\"": 521, "#": 838, "$": 696, "&": 872, "'": 306, "*": 523, "+": 838, ";": 400, "<": 838, "=": 838, ">": 838, "?": 580, "@": 1000, "[": 457, "\\": 365, "]": 457, "^": 838, "_": 500,
    "`": 500, "{": 712, "|": 365, "}": 712, "~": 838, " ": 348, "¡": 456, "¢": 696, "£": 696, "¤": 636, "¥": 696, "¦": 365, "§": 500, "¨": 500, "©": 1000, "ª": 564, "«": 646, "¬": 838,
    "­": 415, "®": 1000, "¯": 500, "°": 500, "±": 838, "²": 438, "³": 438, "´": 500, "µ": 736, "¶": 636, "·": 380, "¸": 500, "¹": 438, "º": 564, "»": 646, "¼": 1035, "½": 1035, "¾": 1035,
    "¿": 580, "Æ": 1085, "Ð": 838, "×": 838, "Ø": 850, "Þ": 738, "ß": 719, "æ": 1048, "ð": 687, "÷": 838, "ø": 687, "þ": 716, "—": 1000, "“": 657, "”": 657, "•": 639, "…": 1000, "′": 264,
    "″": 447, "−": 838, "≈": 838, "≠": 838, "≤": 838, "≥": 838, "√": 667, "∞": 833, "π": 791, "θ": 687, "Δ": 774, "∠": 896, "⊥": 914, "∥": 500, "△": 769, "≅": 838, "∼": 838 };
  /* a string's width in points; a letter with an accent is as wide as the letter */
  function tw(s, size, bold) {
    var t = bold ? WB : WR, x = bold ? XB : XR, w = 0; s = String(s);
    for (var i = 0; i < s.length; i++) { var c = s.charAt(i); w += t[c] || x[c] || t[c.normalize("NFD").charAt(0)] || (bold ? 700 : 600); }
    return w * size / 1000;
  }

  function r2(v) { return +(+v).toFixed(2); }
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function arr(v, n) { return Array.isArray(v) ? v : (function () { var a = []; for (var i = 0; i < n; i++) a.push(v); return a; })(); }
  /* a number as the state prints it: an en dash for the minus, as wide as a digit */
  function num(v) { return typeof v === "string" ? v : (v < 0 ? "–" : "") + String(Math.abs(+(+v).toFixed(6))); }
  /* a list: [..] as written, or { from, to, by } */
  function list(v, dflt) {
    if (v == null) v = dflt;
    if (v == null || v === false) return [];
    if (Array.isArray(v)) return v;
    var out = [], n = Math.round((v.to - v.from) / v.by);
    for (var i = 0; i <= n; i++) { var t = +(v.from + i * v.by).toFixed(9); if (!(v.skip && v.skip.indexOf(t) >= 0)) out.push(t); }
    return out;
  }

  /* ---- a drawing: layers, bottom to top, and the box of everything in it.
     The state's order: the grid; a white box behind each number (it takes the grid lines away and nothing else); the numbers;
     the shading, which is see-through; the axes; then what is plotted, on top of the numbers. */
  var LAYERS = ["grid", "knock", "label", "shade", "axes", "plot", "top"];
  function Fig(k) { this.k = k; this.runs = {}; this.L = {}; for (var i = 0; i < LAYERS.length; i++) this.L[LAYERS[i]] = []; this.bb = [1e9, 1e9, -1e9, -1e9]; this.texts = []; }
  Fig.prototype.grow = function (x0, y0, x1, y1) { var b = this.bb; b[0] = Math.min(b[0], x0, x1); b[1] = Math.min(b[1], y0, y1); b[2] = Math.max(b[2], x0, x1); b[3] = Math.max(b[3], y0, y1); };
  function paint(o, w) {
    o = o || {};
    return (o.fill === undefined ? ' fill="none"' : ' fill="' + o.fill + '"') + (o.op ? ' fill-opacity="' + o.op + '"' : "") +
      (w ? ' stroke="' + (o.c || INK) + '" stroke-width="' + r2(w) + '"' : "") + (o.dash ? ' stroke-dasharray="' + o.dash.map(r2).join(" ") + '"' + (o.off ? ' stroke-dashoffset="' + r2(o.off) + '"' : "") : "") +
      (o.cap ? ' stroke-linecap="' + o.cap + '"' : "") + (o.join ? ' stroke-linejoin="' + o.join + '"' : "");
  }
  Fig.prototype.line = function (layer, x1, y1, x2, y2, w, o) {
    this.grow(Math.min(x1, x2) - w / 2, Math.min(y1, y2) - w / 2, Math.max(x1, x2) + w / 2, Math.max(y1, y2) + w / 2);
    var d = "M" + r2(x1) + " " + r2(y1) + (y1 === y2 ? "H" + r2(x2) : x1 === x2 ? "V" + r2(y2) : "L" + r2(x2) + " " + r2(y2));
    if (o && (o.dash || o.cap)) { this.L[layer].push('<path d="' + d + '"' + paint(o, w) + "/>"); return; }
    /* plain strokes of one colour and weight in a layer are one path (a grid is 40 lines) */
    var key = (o && o.c || INK) + " " + r2(w), run = this.runs[layer + key];
    if (!run) { run = this.runs[layer + key] = { at: this.L[layer].length, d: "", paint: paint(o, w) }; this.L[layer].push(run); }
    run.d += d;
  };
  Fig.prototype.poly = function (layer, pts, o, w, open) {
    var h = (w || 0) / 2, me = this;
    pts.forEach(function (p) { me.grow(p[0] - h, p[1] - h, p[0] + h, p[1] + h); });
    this.L[layer].push("<" + (open ? "polyline" : "polygon") + ' points="' + pts.map(function (p) { return r2(p[0]) + "," + r2(p[1]); }).join(" ") + '"' + paint(o, w) + "/>");
  };
  Fig.prototype.path = function (layer, d, box, o, w) { var h = (w || 0) / 2; this.grow(box[0] - h, box[1] - h, box[2] + h, box[3] + h); this.L[layer].push('<path d="' + d + '"' + paint(o, w) + "/>"); };
  Fig.prototype.circle = function (layer, cx, cy, r, o, w) { var h = r + (w || 0) / 2; this.grow(cx - h, cy - h, cx + h, cy + h); this.L[layer].push('<circle cx="' + r2(cx) + '" cy="' + r2(cy) + '" r="' + r2(r) + '"' + paint(o, w) + "/>"); };
  Fig.prototype.ellipse = function (layer, cx, cy, rx, ry, o, w) { var h = (w || 0) / 2; this.grow(cx - rx - h, cy - ry - h, cx + rx + h, cy + ry + h); this.L[layer].push('<ellipse cx="' + r2(cx) + '" cy="' + r2(cy) + '" rx="' + r2(rx) + '" ry="' + r2(ry) + '"' + paint(o, w) + "/>"); };
  /* text: (x, y) is the baseline at the start, middle or end of the string. knock puts the white box behind it. */
  Fig.prototype.text = function (layer, x, y, s, o) {
    o = o || {}; s = String(s);
    var size = o.size || 12 * this.k, w = tw(s, size, o.b), left = o.anchor === "start" ? x : o.anchor === "end" ? x - w : x - w / 2;
    var up = /^[acemnorsuvwxz–+=.,:<> ]+$/.test(s) ? 0.56 : 0.76, down = /[gjpqy(),;]/.test(s) ? 0.21 : 0.01;
    var box = [left, y - up * size, left + w, y + down * size], tf = "";
    if (o.rot) {                                            // turned about (x, y): the box turns with it
      var c = Math.cos(o.rot * Math.PI / 180), sn = Math.sin(o.rot * Math.PI / 180), X = [], Y = [];
      [[box[0], box[1]], [box[2], box[1]], [box[2], box[3]], [box[0], box[3]]].forEach(function (p) { X.push(x + (p[0] - x) * c - (p[1] - y) * sn); Y.push(y + (p[0] - x) * sn + (p[1] - y) * c); });
      box = [Math.min.apply(0, X), Math.min.apply(0, Y), Math.max.apply(0, X), Math.max.apply(0, Y)]; tf = ' transform="rotate(' + r2(o.rot) + " " + r2(x) + " " + r2(y) + ')"';
    }
    this.grow(box[0], box[1], box[2], box[3]);
    if (o.knock) { var p = 0.6 * this.k, q = 1.1 * this.k; this.L.knock.push('<rect x="' + r2(left - p) + '" y="' + r2(y - 0.727 * size - q) + '" width="' + r2(w + 2 * p) + '" height="' + r2(0.727 * size + 2 * q) + '" fill="' + PAPER + '"/>'); }
    this.texts.push({ id: o.id || "", s: s, x: r2(left), y: r2(y), w: r2(w), size: size, b: !!o.b, i: !!o.i, rot: o.rot || 0, ax: r2(x) });
    this.L[layer].push('<text x="' + r2(x) + '" y="' + r2(y) + '"' + (o.anchor === "start" ? "" : ' text-anchor="' + (o.anchor || "middle") + '"') + tf + (r2(size) === r2(12 * this.k) ? "" : ' font-size="' + r2(size) + '"') +
      (o.b ? ' font-weight="700"' : "") + (o.i ? ' font-style="italic"' : "") + (o.c && o.c !== INK ? ' fill="' + o.c + '"' : "") + ">" + esc(s) + "</text>");
  };
  /* an arrowhead: a plain triangle, its tip at (x, y), pointing along (ux, uy) */
  Fig.prototype.head = function (layer, x, y, ux, uy, len, wid, c) {
    var n = Math.hypot(ux, uy) || 1; ux /= n; uy /= n;
    var bx = x - ux * len, by = y - uy * len;
    this.poly(layer, [[x, y], [bx - uy * wid / 2, by + ux * wid / 2], [bx + uy * wid / 2, by - ux * wid / 2]], { fill: c || INK });
  };
  /* a stroke from a to b with an arrowhead at the ends that have one; the stroke stops inside each head */
  Fig.prototype.arrow = function (layer, a, b, w, ends, len, wid, o) {
    var ux = b[0] - a[0], uy = b[1] - a[1], n = Math.hypot(ux, uy) || 1; ux /= n; uy /= n;
    var s = ends === "both" || ends === "start", e = ends === "both" || ends === "end", cut = len * 0.7;
    if (o && o.dash && o.phase != null) {      // phase: how far from a the first dash starts; the dashes then keep their places whatever the head hides
      var per = o.dash[0] + o.dash[1], off = ((s ? cut : 0) - o.phase) % per; o = { dash: o.dash, c: o.c, off: off < 0 ? off + per : off };
    }
    this.line(layer, a[0] + (s ? ux * cut : 0), a[1] + (s ? uy * cut : 0), b[0] - (e ? ux * cut : 0), b[1] - (e ? uy * cut : 0), w, o);
    if (s) this.head(layer, a[0], a[1], -ux, -uy, len, wid, o && o.c);
    if (e) this.head(layer, b[0], b[1], ux, uy, len, wid, o && o.c);
  };
  Fig.prototype.svg = function (o) {
    o = o || {};
    /* its size on the screen: a 12-point label shows at the FAST's label size, and a picture the booklet printed smaller
       (8-point labels on a grid of 22 squares) shows its labels at that size too */
    var pad = o.pad == null ? 1.5 : o.pad, b = this.bb, x = b[0] - pad, y = b[1] - pad, w = b[2] - b[0] + 2 * pad, h = b[3] - b[1] + 2 * pad, px = (o.px || PX) / this.k, body = "";
    for (var i = 0; i < LAYERS.length; i++) body += this.L[LAYERS[i]].map(function (e) { return typeof e === "string" ? e : '<path d="' + e.d + '"' + e.paint + "/>"; }).join("");
    return '<svg xmlns="http://www.w3.org/2000/svg" class="draw" viewBox="' + r2(x) + " " + r2(y) + " " + r2(w) + " " + r2(h) + '" width="' + Math.round(w * px) + '" height="' + Math.round(h * px) + '"' +
      (o.alt ? ' role="img" aria-label="' + esc(o.alt) + '"' : ' aria-hidden="true"') + ' font-size="' + r2(12 * this.k) + '" fill="' + INK + '" style="' + FACE + '">' + body + "</svg>";
  };

  /* ---- polygons: what is left of one on a side of a line */
  function clip(poly, a, b, side) {      // keep the part of poly on the side of line a-b where `side` is
    var nx = -(b[1] - a[1]), ny = b[0] - a[0], d = function (p) { return (p[0] - a[0]) * nx + (p[1] - a[1]) * ny; }, sg = d(side) >= 0 ? 1 : -1, out = [];
    for (var i = 0; i < poly.length; i++) {
      var p = poly[i], q = poly[(i + 1) % poly.length], dp = d(p) * sg, dq = d(q) * sg;
      if (dp >= 0) out.push(p);
      if (dp >= 0 !== dq >= 0) { var t = dp / (dp - dq); out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]); }
    }
    return out;
  }
  function area(p) { var a = 0; for (var i = 0; i < p.length; i++) { var q = p[(i + 1) % p.length]; a += p[i][0] * q[1] - q[0] * p[i][1]; } return a / 2; }

  /* ---- a coordinate grid. Everything a default covers can be left out; the defaults are the state's 12-point graph.
     { kind: "grid",
       x: [first, last], y: [first, last]   the values at the grid's first and last lines
       step: 1 | [sx, sy]                   the value from one grid line to the next
       cell: 15 | [cx, cy]                  points from one grid line to the next (xs, ys: every line's place, for an uneven grid)
       font: 12                             the labels' size; scale (font / 12) scales every weight, tick and arrowhead with it
       lines: false                         no grid lines;  gridw, gridc: their weight and grey;  axc: the axes' ink
       title, titled: [dx, dy], titlesize   the graph's title above it, bold
       zero: false | { d: [dx, dy] }        the 0 at the origin
       axes: { x: axis, y: axis }           an axis is false (none) or
         { at                               where it crosses the other axis (0 when 0 is on the grid, else the first value)
           span: [from, to]                 how far its line runs (the grid's ends)
           arrows: "both" | "end" | "none"  (both when the grid goes below zero, else end);  head: [length, width];  w: weight
           ticks, nums: [v, ...] | { from, to, by, skip }     (every step but the crossing and the ends with arrows; the
                                            numbers every 2nd, 5th or 10th step instead where every step's would not fit)
                                            a number can be [v, dx, dy, size]: moved, or set in its own size;  numd: [dx, dy] moves all
           tick                             a tick's half-length
           name: "x", named: [dx, dy]       the italic letter at its arrow
           title: "Hours" | [line, line]    the bold title along it (a line can be [text, dx, dy]);  titled, titlesize
           brk: true | [[dx, dy] × 4]       a break in the scale: the zigzag at the corner }
       plots: [                             in the graph's units, drawn in this order, on top of the numbers
         { line | ray | seg: [[x, y], [x, y]], arrows, dash: true | [on, off], phase, w, head, headw, c }
         { curve: [[x, y], ...], arrows }   a curve through its points (give enough of them to look smooth)
         { dots: [[x, y], ...], r, open, ring, ow }
         { shade: [[x, y], ...] | { half: [[x, y], [x, y]], side: [x, y] } | { and: [half, ...] } | { or: [region, ...] }, alpha }
         { text, at: [x, y], d: [dx, dy], anchor, i, b, size, rot, knock: false, top } ]
       items: [...] }                       free drawing in points, from the grid's top left corner */
  function grid(S) {
    var font = S.font || 12, k = S.scale || font / 12, f = new Fig(k);
    var cell = arr(S.cell || 15, 2), step = arr(S.step || 1, 2), x0 = S.x[0], x1 = S.x[1], y0 = S.y[0], y1 = S.y[1], i;
    /* where the grid's lines are: evenly spaced by `cell`, or as listed (xs, ys: points from the first line) for a grid
       the state drew unevenly. Between two lines a value sits in proportion; beyond the last, the last cell carries on. */
    var xs = S.xs || [], ys = S.ys || [], nx = Math.round((x1 - x0) / step[0]), ny = Math.round((y1 - y0) / step[1]);
    if (!S.xs) for (i = 0; i <= nx; i++) xs.push(i * cell[0]);
    if (!S.ys) for (i = 0; i <= ny; i++) ys.push(i * cell[1]);
    var at = function (L, t) { var n = L.length - 1, j = Math.max(0, Math.min(n - 1, Math.floor(t))); return L[j] + (t - j) * (L[j + 1] - L[j]); };
    var X = function (x) { return at(xs, (x - x0) / step[0]); }, Y = function (y) { return at(ys, (y1 - y) / step[1]); };
    var P = function (p) { return [X(p[0]), Y(p[1])]; }, PW = xs[nx], PH = ys[ny], gw = S.gridw || 0.62 * k, AXC = S.axc || INK;
    if (S.lines !== false) {
      for (i = 0; i <= nx; i++) f.line("grid", xs[i], 0, xs[i], PH, gw, { c: S.gridc || GRID });
      for (i = 0; i <= ny; i++) f.line("grid", 0, ys[i], PW, ys[i], gw, { c: S.gridc || GRID });
    }
    var AX = S.axes || {}, ax = AX.x || {}, ay = AX.y || {};
    var atY = ax.at != null ? ax.at : (y0 <= 0 && y1 >= 0 ? 0 : y0), atX = ay.at != null ? ay.at : (x0 <= 0 && x1 >= 0 ? 0 : x0);
    var AL = 7.6 * k, AB = 4 * k, TL = 3.2 * k;

    function axis(A, horiz) {
      if (A === false) return;
      var lo = horiz ? x0 : y0, hi = horiz ? x1 : y1, st = horiz ? step[0] : step[1], cross = horiz ? atX : atY, w = (A.w || 1.33) * k;
      var span = A.span || [lo, hi], ends = A.arrows || (lo < 0 ? "both" : "end"), T = horiz ? function (v) { return [X(v), Y(atY)]; } : function (v) { return [X(atX), Y(v)]; };
      var inner = { from: lo + (ends === "both" ? st : lo === cross ? st : 0), to: hi - (ends === "none" ? 0 : st), by: st, skip: [cross] };
      if (pass === 0) {          // the first pass draws nothing: it asks how often this axis can be numbered — its widest number, with air, in its cells
        var room = horiz ? cell[0] : cell[1], need = horiz ? Math.max.apply(0, list(null, inner).map(function (v) { return tw(num(v), font); }).concat(0)) + 3 * k : 1.05 * font, m = 1;
        [1, 2, 5, 10, 20, 50].some(function (c) { m = c; return need <= c * room; });
        if (A.nums == null) every = Math.max(every, m);
        return;
      }
      f.arrow("axes", T(span[0]), T(span[1]), w, ends, A.head ? A.head[0] * k : AL, A.head ? A.head[1] * k : AB, { c: AXC });
      if (A.brk) {            // a break in the scale: the zigzag between where the axis's line stops and the corner it starts from
        var c0 = T(lo), bk = A.brk === true ? (horiz ? [[0.73, 0], [0.6, 0.37], [0.35, -0.385], [0.23, 0]] : [[0, -0.73], [-0.37, -0.6], [0.385, -0.35], [0, -0.23]]).map(function (q) { return [q[0] * cell[0], q[1] * cell[1]]; }) : A.brk;
        f.poly("axes", bk.concat([[0, 0]]).map(function (q) { return [c0[0] + q[0], c0[1] + q[1]]; }), { c: AXC, join: "miter" }, w, true);
      }
      var tl = A.tick == null ? TL : A.tick * k;
      list(A.ticks, inner).forEach(function (v) { var p = T(v); if (horiz) f.line("axes", p[0], p[1] - tl, p[0], p[1] + tl, w, { c: AXC }); else f.line("axes", p[0] - tl, p[1], p[0] + tl, p[1], w, { c: AXC }); });
      var nd = A.numd || [0, 0], reach = horiz ? PH : 0;        // how far the numbers reach: the lowest baseline (x), the leftmost edge (y)
      /* numbers not listed: every step where they fit, else every 2nd, 5th, 10th from the crossing — both axes alike, as the state numbers them */
      list(A.nums, every === 1 ? inner : list(null, inner).filter(function (v) { return Math.round(Math.abs(v - cross) / st) % every === 0; })).forEach(function (e) {
        var v = Array.isArray(e) ? e[0] : e, dx = nd[0] + (Array.isArray(e) ? e[1] || 0 : 0), dy = nd[1] + (Array.isArray(e) ? e[2] || 0 : 0), p = T(typeof v === "string" ? +v.replace("–", "-") : v), s = num(v);
        var fs = Array.isArray(e) && e[3] || font;          // [value, dx, dy, size]: one number moved, or set in its own size
        if (horiz) { f.text("label", p[0] + dx + (s.charAt(0) === "–" ? -(tw("–", font) / 2 + 1.37 * k) : 0), p[1] + 13.45 * k + dy, s, { size: fs, knock: true, id: "x:" + v, c: AXC }); reach = Math.max(reach, p[1] + 13.45 * k + dy); }
        else { f.text("label", p[0] - 4.04 * k + dx, p[1] + 3.37 * k + dy, s, { size: fs, anchor: "end", knock: true, id: "y:" + v, c: AXC }); reach = Math.min(reach, p[0] - 4.04 * k + dx - tw(s, fs)); }
      });
      var tip = T(span[1]), nm = A.named || [0, 0];
      if (A.name) {
        if (horiz) f.text("label", tip[0] + 3.98 * k + nm[0], tip[1] + 3.35 * k + nm[1], A.name, { size: font, i: true, anchor: "start", id: "xname", c: AXC });
        else f.text("label", tip[0] - 0.2 * k + nm[0], tip[1] - 7.43 * k + nm[1], A.name, { size: font, i: true, id: "yname", c: AXC });
      }
      if (A.title) {
        /* a title clears its axis's numbers, however wide they are: under the lowest of the x numbers (or the grid), to the
           left of the leftmost of the y numbers (or the grid) — a second line under the first, or nearer the axis */
        var td = A.titled || [0, 0], ts = A.titlesize || font, lines = [].concat(A.title);
        lines.forEach(function (t, j) {       // a title of two lines is a list; a line moved on its own is [text, dx, dy]
          var e = Array.isArray(t) ? t : [t, 0, 0];
          if (horiz) f.text("label", PW / 2 + td[0] + e[1], reach + 20.55 * k + td[1] + j * 14.5 * k + e[2], e[0], { size: ts, b: true, id: "xtitle" + (j || "") });
          else f.text("label", reach - 7.5 * k + td[0] - (lines.length - 1 - j) * 14.5 * k + e[1], PH / 2 + td[1] + e[2], e[0], { size: ts, b: true, rot: -90, id: "ytitle" + (j || "") });
        });
      }
    }
    var every = 1, pass = 0;
    axis(ax, true); axis(ay, false); pass = 1;
    axis(ax, true); axis(ay, false);
    if (S.title) { var gt = S.titled || [0, 0]; f.text("label", PW / 2 + gt[0], -14 * k + gt[1], S.title, { size: S.titlesize || 14 * k, b: true, id: "title" }); }
    if (S.zero !== false) { var z = S.zero && S.zero.d || [0, 0]; f.text("label", X(atX) - 1.88 * k + z[0], Y(atY) + 10.3 * k + z[1], "0", { size: font, anchor: "end", knock: true, id: "zero", c: AXC }); }

    var rect = [[0, 0], [PW, 0], [PW, PH], [0, PH]];
    function region(R) {          // a list of polygons, in points, inside the plot
      if (Array.isArray(R)) { var g = R.map(P); return [clip(clip(clip(clip(g, [0, 0], [PW, 0], [0, 1]), [PW, 0], [PW, PH], [0, 0]), [PW, PH], [0, PH], [0, 0]), [0, PH], [0, 0], [1, 0])]; }
      if (R.half) return [clip(rect, P(R.half[0]), P(R.half[1]), P(R.side))];
      if (R.and) { var p = rect; R.and.forEach(function (h) { p = clip(p, P(h.half[0]), P(h.half[1]), P(h.side)); }); return [p]; }
      if (R.or) return [].concat.apply([], R.or.map(region));
      return [];
    }
    (S.plots || []).forEach(function (p, pi) {
      var w = (p.w || 2) * k, HL = (p.head || 11) * k, HB = (p.headw || 6.1) * k, dash = p.dash ? (Array.isArray(p.dash) ? p.dash : [5 * k, 3 * k]) : null;
      if (p.shade) {
        var polys = region(p.shade).filter(function (g) { return g.length > 2; }).map(function (g) { return area(g) < 0 ? g.slice().reverse() : g; });
        var d = polys.map(function (g) { return "M" + g.map(function (q) { return r2(q[0]) + " " + r2(q[1]); }).join("L") + "Z"; }).join("");
        if (d) f.path("shade", d, [0, 0, PW, PH], { fill: "#000", op: p.alpha || 0.2 });
      }
      var seg = p.line || p.ray || p.seg;
      if (seg) f.arrow("plot", P(seg[0]), P(seg[1]), w, p.arrows || (p.line ? "both" : p.ray ? "end" : "none"), HL, HB, { dash: dash, c: p.c, phase: p.phase });
      if (p.curve) {
        var pts = p.curve.map(P), n = pts.length, ends = p.arrows || "both", cut = HL * 0.7, trim = function (a, b) { var u = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return [a[0] + (b[0] - a[0]) * cut / u, a[1] + (b[1] - a[1]) * cut / u]; };
        var body = pts.slice();
        if (ends === "both" || ends === "start") body[0] = trim(pts[0], pts[1]);
        if (ends === "both" || ends === "end") body[n - 1] = trim(pts[n - 1], pts[n - 2]);
        f.poly("plot", body, { dash: dash, join: "round" }, w, true);
        if (ends === "both" || ends === "start") f.head("plot", pts[0][0], pts[0][1], pts[0][0] - pts[1][0], pts[0][1] - pts[1][1], HL, HB);
        if (ends === "both" || ends === "end") f.head("plot", pts[n - 1][0], pts[n - 1][1], pts[n - 1][0] - pts[n - 2][0], pts[n - 1][1] - pts[n - 2][1], HL, HB);
      }
      /* dots: filled; open: paper inside a ring; ring: only the ring, so what is under it shows */
      if (p.dots) p.dots.forEach(function (q) { var c = P(q), r = (p.r || 2.9), ow = p.ow || 1; if (p.open || p.ring) f.circle("plot", c[0], c[1], r - ow / 2, p.ring ? {} : { fill: PAPER }, ow); else f.circle("plot", c[0], c[1], r, { fill: INK }); });
      if (p.text != null) { var c = P(p.at), d2 = p.d || [0, 0]; f.text(p.top ? "top" : "label", c[0] + d2[0], c[1] + d2[1], p.text, { size: p.size || font, anchor: p.anchor || "start", i: p.i, b: p.b, knock: p.knock !== false, rot: p.rot, id: "plot:" + pi }); }
    });
    free(f, S.items, font, 1.5 * k);
    return f;
  }

  /* ---- a number line: { from, to, by, cell, rays: [{ from, dir: "left" | "right", closed } | { from, to, closed: [bool, bool] }] }.
     A ray runs to the end of the line and a little past it, heavier, with its own arrowhead; closed is a filled end. */
  function numberline(S) {
    var font = S.font || 12, k = S.scale || font / 12, f = new Fig(k), cell = S.cell || 21.68 * k, by = S.by || 1, X = function (v) { return (v - S.from) / by * cell; };
    var over = arr(S.over == null ? 15.9 * k : S.over, 2), w = (S.w || 1.25) * k, a = -over[0], b = X(S.to) + over[1], tl = (S.tick || 3.5) * k;
    f.arrow("axes", [a, 0], [b, 0], w, S.arrows || "both", (S.head || 8.5) * k, (S.headw || 5) * k);
    list(S.ticks, { from: S.from, to: S.to, by: by }).forEach(function (v) { f.line("axes", X(v), -tl, X(v), tl, w); });
    list(S.nums, { from: S.from, to: S.to, by: by }).forEach(function (v) { f.text("label", X(v), (S.numy || 18.15) * k, num(v), { size: font, id: "n:" + v }); });
    var rw = (S.rayw || 2.6) * k, r = (S.r || 3.4) * k, ow = (S.ow || 1.2) * k, ro = (S.rayover == null ? 0.5 : S.rayover) * k;
    (S.rays || []).forEach(function (q) {
      var from = X(q.from), to = q.to != null ? X(q.to) : q.dir === "left" ? a - ro : b + ro, closed = arr(q.closed, 2);
      if (q.to != null) f.line("plot", from, 0, to, 0, rw); else f.arrow("plot", [from, 0], [to, 0], rw, "end", (S.rayhead || 12.5) * k, (S.rayheadw || 7) * k);
      [[from, closed[0]], [to, closed[1]]].forEach(function (e, j) { if (j === 1 && q.to == null) return; if (e[1]) f.circle("top", e[0], 0, r, { fill: INK }); else f.circle("top", e[0], 0, r - ow / 2, { fill: PAPER }, ow); });
    });
    free(f, S.items, font, w);
    return f;
  }

  /* ---- free drawing, in points: what a spec's `items` hold. Every kind takes them, for what its own rules do not place:
     { poly: [[x, y], ...], open, fill }   { line: [[x, y], [x, y]], dash }   { circle: [cx, cy, r] }
     { ellipse: [cx, cy, rx, ry], half: "top" | "bottom" }   { dot: [x, y], r }
     { sq: [corner, leg, leg] }           the mark of a right angle
     { dim: [a, b], gap: [from, to] }     a measure: a line with a cap across each end, broken for its number; with text
                                          and no at, its number sits in the middle and the gap is the number's width
                                          (caps: "start" | "end" | "none" where a cap is another measure's: nothing is drawn twice)
     { text, at: [x, y], anchor, b, i, rot, size, knock }
     w is a stroke's weight; a text can ride on any item. */
  function free(f, items, font, W) {
    var k = f.k;
    (items || []).forEach(function (it, n) {
      var w = it.w != null ? it.w * k : W, o = { fill: it.fill, dash: it.dash, join: it.join || "miter", cap: it.cap, c: it.c, off: it.off }, L = it.layer || "plot";
      var at = it.at, anchor = it.anchor || "start";             // where its text goes, when it has text
      if (it.poly) f.poly(L, it.poly, o, w, it.open);
      else if (it.line) f.line(L, it.line[0][0], it.line[0][1], it.line[1][0], it.line[1][1], w, o);
      else if (it.circle) f.circle(L, it.circle[0], it.circle[1], it.circle[2], o, w);
      else if (it.ellipse) {
        var e = it.ellipse;
        if (!it.half) f.ellipse(L, e[0], e[1], e[2], e[3], o, w);
        else f.path(L, "M" + r2(e[0] - e[2]) + " " + r2(e[1]) + "A" + r2(e[2]) + " " + r2(e[3]) + " 0 0 " + (it.half === "top" ? 1 : 0) + " " + r2(e[0] + e[2]) + " " + r2(e[1]), [e[0] - e[2], it.half === "top" ? e[1] - e[3] : e[1], e[0] + e[2], it.half === "top" ? e[1] : e[1] + e[3]], o, w);
      }
      else if (it.dot) f.circle("top", it.dot[0], it.dot[1], it.r || 2.2 * k, { fill: INK });
      else if (it.sq) {
        var c = it.sq[0], u = it.sq[1], v = it.sq[2];
        f.poly(L, [[c[0] + u[0], c[1] + u[1]], [c[0] + u[0] + v[0], c[1] + u[1] + v[1]], [c[0] + v[0], c[1] + v[1]]], { join: "miter" }, it.w != null ? it.w * k : W, true);
      }
      else if (it.dim) {
        var a = it.dim[0], b = it.dim[1], len = Math.hypot(b[0] - a[0], b[1] - a[1]), ux = (b[0] - a[0]) / len, uy = (b[1] - a[1]) / len, c2 = (it.capl == null ? 2.65 : it.capl) * k, g = it.gap;
        if (it.text != null && !it.at) {      // its number, not placed: in the middle of the measure, the line broken for it
          var ts = it.size || font, tW = tw(it.text, ts, it.b), tH = 0.9 * ts, half = (Math.abs(ux) * (it.rot ? tH : tW) + Math.abs(uy) * (it.rot ? tW : tH)) / 2 + 3 * k;
          if (!g) g = [len / 2 - half, len / 2 + half];
          at = it.rot ? [(a[0] + b[0]) / 2 + 0.36 * ts, (a[1] + b[1]) / 2] : [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + 0.36 * ts]; anchor = it.anchor || "middle";
        }
        if (g) { f.line(L, a[0], a[1], a[0] + ux * g[0], a[1] + uy * g[0], w); f.line(L, a[0] + ux * g[1], a[1] + uy * g[1], b[0], b[1], w); }
        else f.line(L, a[0], a[1], b[0], b[1], w);
        (it.caps === "end" ? [b] : it.caps === "start" ? [a] : it.caps === "none" ? [] : [a, b]).forEach(function (p) { f.line(L, p[0] - uy * c2, p[1] + ux * c2, p[0] + uy * c2, p[1] - ux * c2, it.capw != null ? it.capw * k : w); });
      }
      if (it.text != null) f.text(it.dot || it.tlayer ? "top" : "label", at[0], at[1], it.text, { size: it.size || font, anchor: anchor, b: it.b, i: it.i, rot: it.rot, knock: it.knock, id: "item:" + n });
    });
  }

  /* ---- a circle graph: { r, start, sectors: [{ share, fill }], items }. Shares are percents, laid clockwise from twelve
     o'clock (or from `start` degrees); the names, the leaders to them and the title are items, from the circle's centre. */
  function pie(S) {
    var font = S.font || 12, k = S.scale || font / 12, f = new Fig(k), r = S.r, w = (S.w || 1.5) * k, a = S.start || 0;
    var pt = function (deg, rad) { var t = deg * Math.PI / 180; return [rad * Math.sin(t), -rad * Math.cos(t)]; };
    S.sectors.forEach(function (s) {
      var b = a + s.share * 3.6, p = pt(a, r), q = pt(b, r);
      f.path("grid", "M0 0L" + r2(p[0]) + " " + r2(p[1]) + "A" + r2(r) + " " + r2(r) + " 0 " + (b - a > 180 ? 1 : 0) + " 1 " + r2(q[0]) + " " + r2(q[1]) + "Z", [-r, -r, r, r], { fill: s.fill || "none", join: "round" }, w);
      a = b;
    });
    free(f, S.items, font, w);
    return f;
  }

  /* ---- bars, each split into parts stacked from the bottom, in a frame: { w, h, top, y: [lo, hi], lines: [values], at: [x, ...],
     bw, bars: [[part, part], ...], fills, key: { box: [x, y, w, h], at: [[x, y], ...], s }, items }.
     top is how far below the frame's top the highest value sits; lines are the values with a rule across; the numbers, names,
     titles and the key's words are items, from the frame's top-left corner. */
  function bars(S) {
    var font = S.font || 12, k = S.scale || font / 12, f = new Fig(k), W = S.w, H = S.h, w = (S.fw || 1.3) * k, bs = (S.bs || 1.25) * k;
    var Y = function (v) { return H - (v - S.y[0]) / (S.y[1] - S.y[0]) * (H - S.top); };
    (S.lines || []).forEach(function (v) { f.line("grid", 0, Y(v), W, Y(v), (S.gridw || 0.63) * k, { c: S.gridc || GRID }); });
    S.bars.forEach(function (b, i) {
      var x = S.at[i], y = S.y[0];
      b.forEach(function (v, j) { f.poly("plot", [[x, Y(y)], [x + S.bw, Y(y)], [x + S.bw, Y(y + v)], [x, Y(y + v)]], { fill: S.fills[j], join: "miter" }, bs); y += v; });
    });
    f.poly("axes", [[0, 0], [W, 0], [W, H], [0, H]], { join: "miter" }, w);
    var K = S.key;
    if (K) {
      f.poly("axes", [[K.box[0], K.box[1]], [K.box[0] + K.box[2], K.box[1]], [K.box[0] + K.box[2], K.box[1] + K.box[3]], [K.box[0], K.box[1] + K.box[3]]], { join: "miter" }, (K.w || 1.25) * k);
      K.at.forEach(function (p, i) { f.poly("plot", [[p[0], p[1]], [p[0] + K.s, p[1]], [p[0] + K.s, p[1] + K.s], [p[0], p[1] + K.s]], { fill: S.fills[i], join: "miter" }, (K.sw || 1.2) * k); });
    }
    free(f, S.items, font, w);
    return f;
  }

  function shape(S) { var font = S.font || 12, k = S.scale || font / 12, f = new Fig(k); free(f, S.items, font, (S.w || 1.5) * k); return f; }

  var KINDS = { grid: grid, numberline: numberline, pie: pie, bars: bars, shape: shape };
  function fig(spec) { var m = KINDS[spec.kind]; if (!m) throw new Error("draw: no kind " + spec.kind); return m(spec); }
  root.Draw = {
    svg: function (spec, o) { return fig(spec).svg(o); },
    kinds: Object.keys(KINDS),
    text: tw,
    /* the widths text is set on, thousandths of an em: Verdana's as measured on the state's pages, and the rest of Draw Sans's */
    widths: { regular: WR, bold: WB, more: XR, moreBold: XB },
    /* for a tool that measures a drawing: the drawing with where its box and its text are, in its own points */
    lay: function (spec, o) { var f = fig(spec), pad = o && o.pad != null ? o.pad : 1.5; return { svg: f.svg(o), x: r2(f.bb[0] - pad), y: r2(f.bb[1] - pad), w: r2(f.bb[2] - f.bb[0] + 2 * pad), h: r2(f.bb[3] - f.bb[1] + 2 * pad), texts: f.texts }; }
  };
})(typeof window !== "undefined" ? window : this);
