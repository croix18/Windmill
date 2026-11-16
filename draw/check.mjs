#!/usr/bin/env node
/* Drawings held to the pictures they were drawn from (15 Nov 2026, Croix, on the pictures of the state's released tests: "I
   would rather redraw everything so we have the skills to do it. … So probably better if we learn how to rebuild it
   exactly."). A folder of drawings is draw.json — { name: spec }, what draw.js draws — with state/ beside it: the state's
   own picture of each one, cut from its page at 4 pixels a point (state/<name>.png), and state/index.json: where the
   drawing's (0, 0) is in that picture and the text the state set there (measure/make.py writes all three). This lays every
   drawing over its picture, with no dump of the PDFs at hand, and stops when one has moved off it:

     the lines   each drawing's ink within 0.75 pt of the state's and the state's within 0.75 pt of the drawing's: at most 1%
                 of either may be farther. Ink is what is darker than the paper or the tint around it, so a shaded half-plane
                 is not ink and the grid lines under it are; a filled sector or bar is. Text is left out of this.
     the tints   where one is shaded and the other is not: at most 1% of the picture
     once        nothing in a drawing is drawn twice (a stroke laid on itself is the same ink: the overlay cannot see it)
     the text    every string the state set is in the drawing, the same string, set within 0.75 pt of the state's
                 (the kit's own widths place a string; the font the browser draws it in is not measured, so this is the
                 same on a machine without Verdana); the drawing has no string the state does not. Where the state's
                 page has none of a picture's text (it set that picture's text as outlines), each string's ink is held
                 to the state's ink there instead: the middles of the two within 1 pt

     node draw/check.mjs [--root <folder>] [name ...] [--over <dir>] [--all]
   --root is the folder searched for draw.json files, at any depth (the folder this is run from, without it); a name is a
   draw.json's folder under it ("a7/fast-2025"). --over writes <name>.png overlays there: the state's ink red, the drawing's
   blue, black where they agree. --all prints every drawing's numbers. measure/make.py prints the same numbers from the pages
   themselves. Needs Playwright's Chromium (skipped, saying so, without it). The kit is the draw.js beside this file. */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const KIT = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2), opt = k => args.includes(k) ? path.resolve(args[args.indexOf(k) + 1]) : null;
const OVER = opt("--over"), ALL = args.includes("--all"), REL = opt("--root") || process.cwd();
const only = args.filter((a, i) => !a.startsWith("--") && args[i - 1] !== "--over" && args[i - 1] !== "--root");
const S = 4;                                   // pixels a point: the scale of the state's pictures
const LIMIT = { ink: 1.0, tint: 1.0, text: 0.75, outlined: 1.0 };
const DRAW = (() => { const w = {}; new Function("window", fs.readFileSync(path.join(KIT, "draw.js"), "utf8"))(w); return w.Draw; })();
const fails = [], ok = (c, m) => { if (!c) fails.push(m); };
const said = [];
function finish() {
  console.log(said.join("\n"));
  if (fails.length) { console.log("FAILURES (" + fails.length + "):\n" + fails.join("\n")); process.exit(1); }
  console.log("DRAWING CHECKS PASS"); process.exit(0);
}

/* the folders that have drawings: every draw.json under the root (not in the kit's own folder, a .git or a node_modules) */
const tests = [];
(function find(dir, rel) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name < b.name ? -1 : 1)) {
    if (e.isFile() && e.name === "draw.json") tests.push(rel || ".");
    else if (e.isDirectory() && e.name !== ".git" && e.name !== "node_modules" && path.join(dir, e.name) !== KIT) find(path.join(dir, e.name), rel ? rel + "/" + e.name : e.name);
  }
})(REL, "");
for (const t of only) ok(tests.includes(t), `DC: no ${t}/draw.json under ${REL}`);
const run = tests.filter(t => !only.length || only.includes(t));
ok(run.length > 0, `DC: no draw.json under ${REL}`);

/* with no browser: every drawing has the state's picture and its text record, and nothing else is in state/ */
const work = [];
for (const t of run) {
  const dir = path.join(REL, t), specs = JSON.parse(fs.readFileSync(path.join(dir, "draw.json"), "utf8")), sd = path.join(dir, "state");
  const index = fs.existsSync(path.join(sd, "index.json")) ? JSON.parse(fs.readFileSync(path.join(sd, "index.json"), "utf8")) : null;
  ok(!!index, `DC ${t}: no state/index.json (measure/make.py makes it from a dump)`);
  if (!index) continue;
  const names = Object.keys(specs), files = fs.readdirSync(sd).filter(f => f !== "index.json").sort();
  ok(files.join() === names.map(n => n + ".png").sort().join() && Object.keys(index).sort().join() === names.slice().sort().join(), `DC ${t}: state/ is not the state's picture of each drawing in draw.json, and only those`);
  for (const n of names) {
    if (!index[n] || !fs.existsSync(path.join(sd, n + ".png"))) continue;
    let lay; try { lay = DRAW.lay(specs[n]); } catch (e) { ok(false, `DC ${t} ${n}: the kit does not draw it (${e.message})`); continue; }
    // nothing drawn twice: a stroke or a string laid on itself is the same ink, so the overlay would not see it
    const parts = lay.svg.match(/<(?:path|circle|ellipse|polygon|polyline|rect|line|text)\b[^>]*>(?:[^<]*<\/text>)?/g) || [], twice = parts.filter((e, i) => parts.indexOf(e) !== i);
    ok(!twice.length, `DC ${t} ${n}: drawn twice: ${twice.slice(0, 2).join(" ").slice(0, 160)}`);
    for (const d of (lay.svg.match(/ d="[^"]*"/g) || [])) { const sub = d.slice(4, -1).match(/M[^M]*/g) || [], again = sub.filter((e, i) => sub.indexOf(e) !== i);      // and no stroke twice inside one path
      ok(!again.length, `DC ${t} ${n}: a stroke is drawn twice: ${again[0]}`); }
    work.push({ t, n, lay, st: index[n], png: fs.readFileSync(path.join(sd, n + ".png")) });
  }
}

/* ---- where the text is: the state's strings against the drawing's, the nearest pairs first (measure/compare.py's rule) */
const norm = s => s.replace(/[–−]/g, "-").replace(/’/g, "'").trim();
function texts(lay, theirs) {
  const ours = lay.texts, cands = [];
  theirs.forEach(([lx, ly, w, , text], j) => ours.forEach((u, i) => {
    if (norm(u.s) !== norm(text)) return;
    // text turned a quarter back: the state gives its baseline's x and the y where the string starts
    const dx = u.rot ? u.ax - lx : u.x + u.w / 2 - lx - w / 2, dy = u.rot ? u.y + (u.ax - u.x) - ly : u.y - ly;
    if (Math.abs(dx) + Math.abs(dy) < 30) cands.push([Math.abs(dx) + Math.abs(dy), j, i, dx, dy]);
  }));
  const used = new Set(), done = new Set(), pairs = [];
  for (const [, j, i, dx, dy] of cands.sort((a, b) => a[0] - b[0])) { if (used.has(i) || done.has(j)) continue; used.add(i); done.add(j); pairs.push({ u: ours[i], th: theirs[j], dx, dy }); }
  // the state's page has some numbers twice, one on the other: not a difference
  const lone = theirs.filter((th, j) => !done.has(j) && !theirs.some((o, k) => done.has(k) && o[4] === th[4] && Math.abs(o[0] - th[0]) < 0.6 && Math.abs(o[1] - th[1]) < 0.6));
  return { pairs, lone, extra: ours.filter((_, i) => !used.has(i)) };
}
/* the boxes of text, in pixels of the drawing's own box: ink inside them is not compared */
function boxes(lay, T, theirs) {
  const out = [], turned = new Map(T.pairs.filter(p => p.u.rot).map(p => [p.th, p.u]));
  const put = (x0, y0, x1, y1) => out.push([Math.max(0, Math.floor((x0 - lay.x) * S)), Math.max(0, Math.floor((y0 - lay.y) * S)), Math.max(0, Math.floor((x1 - lay.x) * S)) + 1, Math.max(0, Math.floor((y1 - lay.y) * S)) + 1]);
  const up = (ax, y0, w, size) => put(ax - 0.85 * size - 1.2, y0 - w - 1.2, ax + 0.3 * size + 1.2, y0 + 1.2);          // it runs up from y0
  const flat = (x, y, w, size) => put(x - 1.2, y - 0.8 * size - 1.2, x + w + 1.2, y + 0.25 * size + 1.2);
  for (const th of theirs) turned.has(th) ? up(th[0], th[1], th[2], th[3]) : flat(th[0], th[1], th[2], th[3]);
  for (const u of lay.texts) u.rot ? up(u.ax, u.y + (u.ax - u.x), u.w, u.size) : flat(u.x, u.y, u.w, u.size);
  return out;
}

/* each of the drawing's strings as [x0, y0, x1, y1, its own box] in pixels: its box grown 2.5 pt, for the ink of a string */
function strings(lay) {
  const px = (x0, y0, x1, y1) => [Math.floor((x0 - lay.x) * S), Math.floor((y0 - lay.y) * S), Math.ceil((x1 - lay.x) * S), Math.ceil((y1 - lay.y) * S)];
  return lay.texts.map(u => { const y0 = u.y + (u.ax - u.x);
    const b = u.rot ? [u.ax - 0.8 * u.size, y0 - u.w, u.ax + 0.25 * u.size, y0] : [u.x, u.y - 0.8 * u.size, u.x + u.w, u.y + 0.25 * u.size];
    return [...px(b[0] - 2.5, b[1] - 2.5, b[2] + 2.5, b[3] + 2.5), px(...b)]; });
}

/* ---- in the page: two pictures of one size, as greys; their ink, their tints, how far apart */
function compare({ mine, state, W, H, X0, Y0, masks, over, strings }) {
  const load = src => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error("a picture did not load")); i.src = src; });
  const closing = (a, w, h, r) => {              // a 17 by 17 grey closing: the paper or the tint around each pixel
    const pass = (src, max) => {
      const out = new Uint8Array(w * h), q = new Int32Array(Math.max(w, h) + 2 * r + 2), line = new Uint8Array(Math.max(w, h)), res = new Uint8Array(Math.max(w, h));
      const slide = n => { let hd = 0, tl = 0;
        for (let i = 0; i < n + r; i++) {
          if (i < n) { const v = line[i]; while (tl > hd && (max ? line[q[tl - 1]] <= v : line[q[tl - 1]] >= v)) tl--; q[tl++] = i; }
          const c = i - r; if (c < 0) continue;
          while (q[hd] < c - r) hd++;
          res[c] = line[q[hd]];
        } };
      const tmp = new Uint8Array(w * h);
      for (let y = 0; y < h; y++) { for (let x = 0; x < w; x++) line[x] = src[y * w + x]; slide(w); for (let x = 0; x < w; x++) tmp[y * w + x] = res[x]; }
      for (let x = 0; x < w; x++) { for (let y = 0; y < h; y++) line[y] = tmp[y * w + x]; slide(h); for (let y = 0; y < h; y++) out[y * w + x] = res[y]; }
      return out;
    };
    return pass(pass(a, true), false);
  };
  const near = (ink, w, h, r2) => {              // every pixel within sqrt(r2) pixels of ink
    const out = new Uint8Array(w * h), offs = [], R = Math.ceil(Math.sqrt(r2));
    for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) if (dx * dx + dy * dy <= r2) offs.push([dx, dy]);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (ink[y * w + x]) for (const [dx, dy] of offs) { const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < w && yy < h) out[yy * w + xx] = 1; }
    return out;
  };
  return (async () => {
    const [im, st] = await Promise.all([load(mine), load(state)]), n = W * H;
    const c = new OffscreenCanvas(W, H), g = c.getContext("2d", { willReadFrequently: true });
    const grey = (img, sx, sy, unmap) => { g.fillStyle = "#fff"; g.fillRect(0, 0, W, H); g.imageSmoothingEnabled = false; g.drawImage(img, -sx, -sy);
      const d = g.getImageData(0, 0, W, H).data, a = new Uint8Array(n);
      for (let i = 0; i < n; i++) { const v = (d[4 * i] * 299 + d[4 * i + 1] * 587 + d[4 * i + 2] * 114) / 1000; a[i] = unmap ? Math.round(v * 210 / 255 + 40) : Math.round(v); }   // the state's picture was stretched from 40..250 to 0..255
      return a; };
    const B = grey(im, 0, 0, false), A = grey(st, X0, Y0, true), bgA = closing(A, W, H, 8), bgB = closing(B, W, H, 8);
    const inkA = new Uint8Array(n), inkB = new Uint8Array(n); let tint = 0;
    for (let i = 0; i < n; i++) { inkA[i] = A[i] < bgA[i] - 22 || A[i] < 150 ? 1 : 0; inkB[i] = B[i] < bgB[i] - 22 || B[i] < 150 ? 1 : 0; if (Math.abs(bgA[i] - bgB[i]) > 26) tint++; }
    const text = new Uint8Array(n);
    for (const [x0, y0, x1, y1] of masks) for (let y = y0; y < Math.min(H, y1); y++) for (let x = x0; x < Math.min(W, x1); x++) text[y * W + x] = 1;
    const nearA = near(inkA, W, H, 9), nearB = near(inkB, W, H, 9), fineA = near(inkA, W, H, 2.56), fineB = near(inkB, W, H, 2.56);      // 0.75 pt; 0.4 pt
    let a = 0, b = 0, ma = 0, mb = 0, fa = 0, fb = 0; const miss = over ? new Uint8Array(n) : null;
    for (let i = 0; i < n; i++) {
      if (text[i]) continue;
      if (inkA[i]) { a++; if (!nearB[i]) { ma++; if (miss) miss[i] = 1; } if (!fineB[i]) fa++; }
      if (inkB[i]) { b++; if (!nearA[i]) { mb++; if (miss) miss[i] = 1; } if (!fineA[i]) fb++; }
    }
    let png = null;
    if (over) { const d = g.createImageData(W, H);
      for (let i = 0; i < n; i++) { const x = inkA[i] && !text[i], y = inkB[i] && !text[i]; d.data[4 * i] = y ? 0 : 255; d.data[4 * i + 1] = x && y ? 0 : x || y ? 110 : text[i] ? 244 : 255; d.data[4 * i + 2] = x ? 0 : 255; d.data[4 * i + 3] = 255; }
      g.putImageData(d, 0, 0); const blob = await c.convertToBlob({ type: "image/png" }), buf = new Uint8Array(await blob.arrayBuffer()); let s = ""; for (let i = 0; i < buf.length; i += 32768) s += String.fromCharCode(...buf.subarray(i, i + 32768)); png = btoa(s); }
    /* a picture whose text the state set as outlines: for each of the drawing's strings, the middle of the state's ink in its
       box (grown a little, the other strings' boxes left out) and the middle of the drawing's own, in pixels */
    const inks = (strings || []).map(([x0, y0, x1, y1], k) => {
      const mid = ink => { let a0 = 1e9, b0 = 1e9, a1 = -1, b1 = -1;
        for (let y = Math.max(0, y0); y < Math.min(H, y1); y++) for (let x = Math.max(0, x0); x < Math.min(W, x1); x++) {
          if (!ink[y * W + x] || strings.some(([p0, q0, p1, q1, core], j) => j !== k && x >= core[0] && x < core[2] && y >= core[1] && y < core[3])) continue;
          if (x < a0) a0 = x; if (x > a1) a1 = x; if (y < b0) b0 = y; if (y > b1) b1 = y; }
        return a1 < 0 ? null : [(a0 + a1 + 1) / 2, (b0 + b1 + 1) / 2]; };
      return [mid(inkA), mid(inkB)]; });
    return { state: 100 * ma / Math.max(1, a), drawn: 100 * mb / Math.max(1, b), fine: 100 * (fa + fb) / Math.max(1, a + b), tint: 100 * tint / n, png, inks };
  })();
}

let chromium;
try { ({ chromium } = createRequire(import.meta.url)("playwright")); } catch (e) { said.push(`drawings: ${work.length} in ${run.length} folders have the state's picture beside them; Playwright is not here, so they are not laid over it`); finish(); }
const browser = await chromium.launch({ args: ["--no-sandbox"] }).catch(e => { said.push(`drawings: Chromium did not start (${e.message.split("\n")[0]}); the drawings are not laid over the state's`); finish(); });
if (OVER) fs.mkdirSync(OVER, { recursive: true });
try {
  const pg = await browser.newPage({ viewport: { width: 2400, height: 2400 }, deviceScaleFactor: 1 });
  /* the kit's own face, so a drawing is the same on every machine (one with Verdana draws in Verdana: the same widths) */
  const FACE = [["draw-sans.woff2", "normal", 400], ["draw-sans-bold.woff2", "normal", 700], ["draw-sans-oblique.woff2", "italic", 400]]
    .map(([f, st, wt]) => `@font-face{font-family:"Draw Sans";font-style:${st};font-weight:${wt};src:url(data:font/woff2;base64,${fs.readFileSync(path.join(KIT, "fonts", f)).toString("base64")}) format("woff2")}`).join("");
  await pg.setContent(`<!doctype html><style>${FACE}html,body{margin:0;background:#fff}#b svg{width:100%;height:100%;display:block}</style><div id="b"></div>`);
  const by = {};
  for (const { t, n, lay, st, png } of work) {
    const W = Math.round(lay.w * S), H = Math.round(lay.h * S), T = texts(lay, st.texts), outlined = !st.texts.length && lay.texts.length > 0;
    await pg.evaluate(([W, H, svg]) => { const b = document.getElementById("b"); b.style.width = W + "px"; b.style.height = H + "px"; b.innerHTML = svg; return document.fonts.ready; }, [W, H, lay.svg]);
    const mine = (await pg.locator("#b").screenshot()).toString("base64");
    const r = await pg.evaluate(compare, { mine: "data:image/png;base64," + mine, state: "data:image/png;base64," + png.toString("base64"), W, H,
      X0: Math.round((st.o[0] + lay.x) * S), Y0: Math.round((st.o[1] + lay.y) * S), masks: boxes(lay, T, st.texts), over: !!OVER, strings: outlined ? strings(lay) : null });
    if (OVER) fs.writeFileSync(path.join(OVER, `${t.replace("/", "-")}-${n}.png`), Buffer.from(r.png, "base64"));
    const worst = Math.max(0, ...T.pairs.map(p => Math.max(Math.abs(p.dx), Math.abs(p.dy)))), w = `DC ${t} ${n}`;
    ok(r.state <= LIMIT.ink, `${w}: ${r.state.toFixed(1)}% of the state's ink is more than 0.75 pt from the drawing's`);
    ok(r.drawn <= LIMIT.ink, `${w}: ${r.drawn.toFixed(1)}% of the drawing's ink is more than 0.75 pt from the state's`);
    ok(r.tint <= LIMIT.tint, `${w}: the tints differ over ${r.tint.toFixed(1)}% of the picture`);
    for (const p of T.pairs) {
      ok(Math.abs(p.dx) <= LIMIT.text && Math.abs(p.dy) <= LIMIT.text, `${w}: "${p.th[4]}" is set ${p.dx.toFixed(2)}, ${p.dy.toFixed(2)} pt from the state's`);
      ok(Math.abs(p.u.size - p.th[3]) <= 0.15, `${w}: "${p.th[4]}" is ${p.u.size} pt; the state's is ${p.th[3]}`);
    }
    ok(!T.lone.length, `${w}: the state's ${T.lone.map(th => `"${th[4]}"`).join(", ")} ${T.lone.length > 1 ? "are" : "is"} not in the drawing`);
    ok(!T.extra.length || outlined, `${w}: the drawing's ${T.extra.map(u => `"${u.s}"`).join(", ")} ${T.extra.length > 1 ? "are" : "is"} not in the state's`);
    let inkWorst = 0;
    if (outlined) r.inks.forEach(([a, b], k) => { const u = lay.texts[k];
      ok(!!a && !!b, `${w}: "${u.s}" has no ink in the ${a ? "drawing" : "state's picture"}`);
      if (!a || !b) return;
      const dx = (b[0] - a[0]) / S, dy = (b[1] - a[1]) / S; inkWorst = Math.max(inkWorst, Math.abs(dx), Math.abs(dy));
      ok(Math.abs(dx) <= LIMIT.outlined && Math.abs(dy) <= LIMIT.outlined, `${w}: the ink of "${u.s}" is ${dx.toFixed(2)}, ${dy.toFixed(2)} pt from the state's`); });
    (by[t] = by[t] || []).push({ n, ...r, worst, texts: T.pairs.length, outlined: outlined ? lay.texts.length : 0, inkWorst });
    if (ALL) console.log(`${t} ${n}: state's ink ${r.state.toFixed(1)}%, drawing's ${r.drawn.toFixed(1)}% (over 0.4 pt: ${r.fine.toFixed(1)}%), tints ${r.tint.toFixed(1)}%, ` +
      (outlined ? `${lay.texts.length} strings, set as outlines in the state's, by their ink within ${inkWorst.toFixed(2)} pt` : `${T.pairs.length} strings within ${worst.toFixed(2)} pt`));
  }
  for (const [t, rs] of Object.entries(by)) { const m = k => Math.max(...rs.map(r => r[k])).toFixed(1), un = rs.filter(r => r.outlined);
    said.push(`drawings: ${t}: ${rs.length} drawings over the state's; ink more than 0.75 pt from the other's: the state's ${m("state")}%, the drawing's ${m("drawn")}% at worst; more than 0.4 pt, ${m("fine")}%; tints ${m("tint")}%; ${rs.reduce((s, r) => s + r.texts, 0)} strings within ${Math.max(...rs.map(r => r.worst)).toFixed(2)} pt` +
      (un.length ? `; ${un.reduce((s, r) => s + r.outlined, 0)} more (${un.map(r => r.n).join(", ")}: set as outlines in the state's) by their ink within ${Math.max(...un.map(r => r.inkWorst)).toFixed(2)} pt` : "")); }
} finally { await browser.close(); }
finish();
