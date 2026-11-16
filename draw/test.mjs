#!/usr/bin/env node
/* The drawing kit on its own: no browser, nothing to install.

     node draw/test.mjs            check
     node draw/test.mjs --write    write the pictures again (tests/<name>.svg), after a change that is meant

   tests/<name>.json is a spec with its words ({ alt, spec }) — a dozen examples of our own, one or two of each kind — and
   tests/<name>.svg the picture the kit drew of it when it was last looked at. This holds:
     the same picture   the kit draws each spec to the same bytes as its picture: a change to the kit that moves a line, a
                        number or a default shows here first, and is either a mistake or is written again on purpose
     plain SVG          only shapes and text; no script, link, image, style sheet or outside reference; its words as its
                        aria-label; nothing drawn twice
     the text           set on the widths the kit states (Verdana's): digits, a dash for a minus, an accent on its letter
     the rules          numbers every second step where every step's would collide, both axes alike; numbers under the
                        plotted line; a title clear of its axis's numbers however wide; a measure's number in a gap its
                        own width; shading only where every condition holds; a small graph drawn two thirds as heavy
   The fonts are held to these widths by face.py --check; drawings are held to the pictures they were drawn from by
   check.mjs, in a repository that has such pictures. */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const KIT = path.dirname(fileURLToPath(import.meta.url)), TESTS = path.join(KIT, "tests"), WRITE = process.argv.includes("--write");
const src = fs.readFileSync(path.join(KIT, "draw.js"), "utf8");
const fails = [], ok = (c, m) => { if (!c) fails.push(m); };

/* it loads as a page's script and as a module, and says what it draws */
const win = {}; new Function("window", src)(win); const D = win.Draw;
ok(D && typeof D.svg === "function" && typeof D.lay === "function" && typeof D.text === "function", "the kit does not load as a script (window.Draw)");
ok(createRequire(import.meta.url)("./draw.js").Draw.kinds.join() === D.kinds.join(), "the kit does not load as a module");
ok(D.kinds.join() === "grid,numberline,pie,bars,shape", `the kinds are ${D.kinds.join()}`);
ok(Object.keys(win).join() === "Draw", `the kit leaves ${Object.keys(win).join()} on the window`);
ok(!/\b(?:fetch|XMLHttpRequest|localStorage|document|eval|import)\s*\(/.test(src.replace(/\/\*[\s\S]*?\*\//g, "")), "the kit reaches outside itself");

/* ---- the pictures */
const names = fs.readdirSync(TESTS).filter(f => f.endsWith(".json")).map(f => f.slice(0, -5)).sort();
ok(names.length >= 12 && D.kinds.every(k => names.some(n => JSON.parse(fs.readFileSync(path.join(TESTS, n + ".json"), "utf8")).spec.kind === k)), "tests/ does not have an example of every kind");
ok(fs.readdirSync(TESTS).filter(f => f.endsWith(".svg")).map(f => f.slice(0, -4)).sort().join() === names.join() || WRITE, "tests/ is not a picture for each spec, and only those");
const esc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const F = {};
for (const n of names) {
  const { alt, spec } = JSON.parse(fs.readFileSync(path.join(TESTS, n + ".json"), "utf8")), svg = D.svg(spec, { alt }), file = path.join(TESTS, n + ".svg");
  F[n] = { alt, spec, svg, lay: D.lay(spec, { alt }) };
  if (WRITE) { fs.writeFileSync(file, svg + "\n"); continue; }
  ok(fs.existsSync(file) && fs.readFileSync(file, "utf8") === svg + "\n", `${n}: the kit no longer draws tests/${n}.svg (node draw/test.mjs --write, if the change is meant)`);
  /* plain SVG with its words */
  const head = /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" class="draw" viewBox="(-?[\d.]+) (-?[\d.]+) ([\d.]+) ([\d.]+)" width="(\d+)" height="(\d+)" role="img" aria-label="([^"]*)" font-size="[\d.]+" fill="#2e2e2e" style="font-family:var\(--drawf,Verdana\),Verdana,'Draw Sans','DejaVu Sans',sans-serif;font-kerning:none">/.exec(svg);
  ok(!!head && head[7] === esc(alt) && alt.length >= 20, `${n}: not an <svg> with its box, its size and its words`);
  ok(svg.endsWith("</svg>") && (svg.match(/<svg\b/g) || []).length === 1, `${n}: not one <svg>`);
  const tags = [...new Set((svg.match(/<(\w+)/g) || []).map(t => t.slice(1)))].filter(t => !["svg", "path", "circle", "ellipse", "polygon", "polyline", "rect", "line", "text", "g"].includes(t));
  ok(!tags.length && !/\son\w+\s*=|href|url\(|javascript:|<!|&#/i.test(svg), `${n}: not plain SVG (${tags.join(", ")})`);
  if (head) { const k = (spec.scale || (spec.font || 12) / 12);
    ok(Math.abs(+head[5] - Math.round(+head[3] * 1.64 / k)) <= 1 && Math.abs(+head[6] - Math.round(+head[4] * 1.64 / k)) <= 1, `${n}: its size on the screen is not 1.64 px a point of a 12-point drawing`); }
  /* nothing drawn twice: an element, or a stroke inside one path */
  const parts = svg.match(/<(?:path|circle|ellipse|polygon|polyline|rect|line|text)\b[^>]*>(?:[^<]*<\/text>)?/g) || [];
  ok(parts.every((e, i) => parts.indexOf(e) === i), `${n}: something is drawn twice`);
  for (const d of svg.match(/ d="[^"]*"/g) || []) { const sub = d.slice(4, -1).match(/M[^M]*/g) || []; ok(sub.every((e, i) => sub.indexOf(e) === i), `${n}: a stroke is drawn twice`); }
  /* lay(): the same drawing, with every string inside its box and the width the kit says */
  const L = F[n].lay;
  ok(L.svg === svg && head && Math.abs(L.x - +head[1]) < 0.011 && Math.abs(L.w - +head[3]) < 0.011, `${n}: lay() is not the drawing`);
  ok(L.texts.length === (svg.match(/<text\b/g) || []).length, `${n}: lay() has ${L.texts.length} strings; the drawing has ${(svg.match(/<text\b/g) || []).length}`);
  for (const u of L.texts) {
    ok(Math.abs(u.w - D.text(u.s, u.size, u.b)) < 0.011, `${n}: "${u.s}" is ${u.w} wide in lay(); text() says ${D.text(u.s, u.size, u.b)}`);
    // its baseline, end to end, is inside the box (a string turned a quarter back runs up from where it starts)
    const x0 = u.rot ? u.ax : u.x, x1 = u.rot ? u.ax : u.x + u.w, y1 = u.rot ? u.y + (u.ax - u.x) : u.y, y0 = u.rot ? y1 - u.w : u.y;
    ok(x0 >= L.x - 0.01 && x1 <= L.x + L.w + 0.01 && y0 >= L.y - 0.01 && y1 <= L.y + L.h + 0.01, `${n}: "${u.s}" is not inside the drawing's box`);
  }
}
if (WRITE) { console.log(`draw: ${names.length} pictures written to draw/tests/`); process.exit(0); }

/* ---- the text: Verdana's widths, thousandths of an em */
ok(D.text("0", 1000) === 636 && D.text("1234567890", 1000) === 6360 && D.text("0", 1000, true) === 711, "a digit is not 636 (711 bold) thousandths wide");
ok(D.text("–", 1000) === 636 && D.text("−", 1000) === 818 && D.text(" ", 1000) === 352, "the dash a negative is printed with is not a digit wide");
ok(D.text("é", 1000) === D.text("e", 1000) && D.text("Ñ", 1000, true) === D.text("N", 1000, true), "a letter with an accent is not as wide as the letter");
ok(D.text("x = 12", 12) === (592 + 352 + 818 + 352 + 636 + 636) * 12 / 1000, "a string is not the sum of its characters");
ok(D.text("\u4e2d", 1000) === 600 && D.text("\u4e2d", 1000, true) === 700, "a character the kit has no width for is not 600 (700 bold)");
for (const t of ["regular", "bold", "more", "moreBold"]) ok(Object.values(D.widths[t]).every(v => Number.isInteger(v) && v > 100 && v < 1400), `widths.${t} is not thousandths of an em`);
ok(Object.keys(D.widths.more).every(c => !(c in D.widths.regular)) && "0123456789".split("").every(c => D.widths.regular[c] === 636), "Draw Sans's own widths overlap Verdana's");

/* ---- the rules a generator leans on */
const ids = (n, re) => F[n].lay.texts.filter(u => re.test(u.id));
{ // tight cells: every second number, both axes alike, none at the crossing or under an arrow; roomy cells: every one
  const xs = ids("grid-line", /^x:/).map(u => u.s).join(" "), ys = ids("grid-line", /^y:/).map(u => u.s).join(" ");
  ok(xs === "–4 –2 2 4" && ys === "–4 –2 2 4", `grid-line: the numbers are ${xs} and ${ys}`);
  ok(ids("grid-line", /^zero$/).length === 1 && ids("grid-line", /^[xy]name$/).map(u => u.s).join() === "x,y", "grid-line: no 0 at the origin, or no x and y");
  ok(ids("grid-rate", /^x:/).map(u => u.s).join(" ") === "1 2 3 4 5 6 7" && ids("grid-rate", /^y:/).map(u => u.s).join(" ") === "50 100 150 200 250 300 350", "grid-rate: not every step is numbered where every step fits");
  const tight = D.lay({ kind: "grid", x: [-10, 10], y: [-10, 10], cell: 7.45, font: 8, axes: { x: {}, y: {} } }).texts.filter(u => /^x:/.test(u.id));
  ok(tight.map(u => u.s).join(" ") === "–8 –6 –4 –2 2 4 6 8" && tight.every((u, i) => !i || u.x >= tight[i - 1].x + tight[i - 1].w + 1), "an 8-point grid's numbers collide");
}
{ // numbers behind the plotted line (Croix, 15 Nov 2026: "Leave the numbers behind the line"): every number is drawn before the first plotted stroke
  for (const n of ["grid-line", "grid-system", "grid-parabola", "grid-rate"]) { const s = F[n].svg, plot = s.search(/<path[^>]*stroke-width="(?:2|1\.33)"[^>]*\/><polygon|<path d="M[^"]*"[^>]*stroke-width="2"/);
    ok(plot > 0 && s.lastIndexOf("</text>") < s.indexOf('stroke-width="2"', plot) || s.lastIndexOf("</text>") < plot, `${n}: a number is drawn over the plotted line`); }
  // and a white box behind each number takes the grid lines out from under it
  ok((F["grid-line"].svg.match(/<rect[^>]*fill="#fff"/g) || []).length >= 8, "grid-line: no white box behind the numbers");
}
{ // a title clears its axis's numbers, however wide they are; a second line is nearer the axis
  const yt = ids("grid-rate", /^ytitle/), yn = ids("grid-rate", /^y:/), left = Math.min(...yn.map(u => u.x));
  ok(yt.length === 1 && yt[0].rot && yt[0].ax + 0.25 * yt[0].size <= left - 3, `grid-rate: the y title (at ${yt[0] && yt[0].ax}) is not clear of its numbers (from ${left})`);
  const xt = ids("grid-rate", /^xtitle/), xn = ids("grid-rate", /^x:/);
  ok(xt.length === 1 && xt[0].y - xt[0].size >= Math.max(...xn.map(u => u.y)) + 3, "grid-rate: the x title is not clear of its numbers");
  const two = ids("grid-scatter", /^ytitle/), sn = ids("grid-scatter", /^y:/);
  ok(two.length === 2 && two[0].ax < two[1].ax - 12 && two[1].ax + 0.25 * two[1].size <= Math.min(...sn.map(u => u.x)) - 3, "grid-scatter: the two lines of the y title are not one beside the other, clear of the numbers");
  ok(ids("grid-rate", /^title$/).length === 1 && ids("grid-rate", /^title$/)[0].b, "grid-rate: no bold title over the graph");
}
{ // a measure's number sits in a gap its own width
  const s = F["shape-trapezoid"].svg, t = F["shape-trapezoid"].lay.texts.find(u => u.s === "12 cm");
  ok(!!t && Math.abs(t.x + t.w / 2 - 100) < 0.011 && /M40 -70H[\d.]+M[\d.]+ -70H160/.test(s), "shape-trapezoid: the 12 cm is not in the middle of its measure");
  const m = /M40 -70H([\d.]+)M([\d.]+) -70H160/.exec(s);
  ok(!!m && +m[1] <= t.x - 2 && +m[2] >= t.x + t.w + 2 && +m[2] - +m[1] < t.w + 10, "shape-trapezoid: the measure's gap is not its number's width");
}
{ // shading only where every condition holds: grid-system's region is inside both half-planes and inside the grid
  const m = /<path d="M([^"]*)Z" fill="#000" fill-opacity="[\d.]+"\/>/.exec(F["grid-system"].svg), c = 7.45, pts = m ? m[1].split("L").map(p => p.trim().split(" ").map(Number)) : [];
  const val = ([X, Y]) => [X / c - 10, 10 - Y / c];
  ok(pts.length >= 3 && pts.every(p => { const [x, y] = val(p); return x >= -4 - 1e-6 && x + y <= 6 + 1e-6 && x <= 10 + 1e-6 && y >= -10 - 1e-6; }), `grid-system: the shading is not where both conditions hold (${JSON.stringify(pts.map(val))})`);
  ok((F["grid-either"].svg.match(/fill-opacity/g) || []).length >= 1 && !/fill-opacity/.test(F["grid-line"].svg), "grid-either: no shading, or shading where none was asked for");
}
{ // a small graph is drawn that much lighter: an 8-point graph's strokes are two thirds of a 12-point graph's, its dashes too
  ok(/stroke-width="1\.33" stroke-dasharray="3\.33 2"/.test(F["grid-system"].svg), "grid-system: an 8-point graph's dashed line is not 1.33 wide with dashes of 3.33 and 2");
  const big = D.svg({ kind: "grid", x: [-3, 3], y: [-3, 3], cell: 22, axes: { x: {}, y: {} }, plots: [{ line: [[-3, 1], [3, 1]], dash: true }] });
  ok(/stroke-width="2" stroke-dasharray="5 3"/.test(big), "a 12-point graph's dashed line is not 2 wide with dashes of 5 and 3");
}
{ // the options, and what the kit refuses
  const s = D.svg(F["numberline-rays"].spec);
  ok(/ aria-hidden="true"/.test(s) && !/role="img"/.test(s), "a drawing without words is not hidden from a screen reader");
  const w = px => +/ width="(\d+)"/.exec(D.svg(F["numberline-rays"].spec, { px }))[1];
  ok(Math.abs(w(3.28) - 2 * w(1.64)) <= 1, "px does not set the drawing's size on the screen");
  let threw = ""; try { D.svg({ kind: "spiral" }); } catch (e) { threw = e.message; }
  ok(threw === "draw: no kind spiral", `an unknown kind gives "${threw}"`);
  ok(D.svg(F["pie"].spec, { alt: 'a "b" <c> & d' }).includes('aria-label="a &quot;b&quot; &lt;c&gt; &amp; d"'), "the words are not escaped");
  ok(D.svg({ kind: "shape", items: [{ text: "a < b & c", at: [0, 0] }] }).includes(">a &lt; b &amp; c</text>"), "a string is not escaped");
}

if (fails.length) { console.log("FAILURES (" + fails.length + "):\n" + fails.join("\n")); process.exit(1); }
console.log(`draw: ${names.length} pictures drawn to the same bytes; plain SVG, nothing drawn twice; the text on its widths; the numbering, title, measure, shading and scale rules`);
