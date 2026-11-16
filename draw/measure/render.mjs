// Draw each spec of a specs file with the kit (../draw.js) and rasterise it at 4 pixels a point (the scale of the state's
// pages): node draw/measure/render.mjs <specs.json> <outdir> [name,name,...]   → <name>.svg, <name>.png, <name>.json (where
// the drawing's own (0, 0) and its text are). make.py calls this; Playwright.
import fs from "node:fs"; import path from "node:path"; import { createRequire } from "node:module"; import { fileURLToPath } from "node:url";
const KIT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { chromium } = createRequire(import.meta.url)("playwright");
const [file, out, only] = process.argv.slice(2), S = 4;
const win = {}; new Function("window", fs.readFileSync(path.join(KIT, "draw.js"), "utf8"))(win);
const specs = JSON.parse(fs.readFileSync(file, "utf8")); fs.mkdirSync(out, { recursive: true });
const names = Object.keys(specs).filter(n => !only || only.split(",").includes(n));
/* the kit's own face, so a drawing is the same on every machine (one with Verdana draws in Verdana: the same widths) */
const FACE = [["draw-sans.woff2", "normal", 400], ["draw-sans-bold.woff2", "normal", 700], ["draw-sans-oblique.woff2", "italic", 400]]
  .map(([f, st, wt]) => `@font-face{font-family:"Draw Sans";font-style:${st};font-weight:${wt};src:url(data:font/woff2;base64,${fs.readFileSync(path.join(KIT, "fonts", f)).toString("base64")}) format("woff2")}`).join("");
const browser = await chromium.launch({ args: ["--no-sandbox"] }), pg = await browser.newPage({ viewport: { width: 2400, height: 2400 }, deviceScaleFactor: 1 });
await pg.setContent(`<!doctype html><style>${FACE}html,body{margin:0;background:#fff}#b svg{width:100%;height:100%;display:block}</style><div id="b"></div>`);
let bad = 0;
for (const n of names) {
  let lay; try { lay = win.Draw.lay(specs[n].spec || specs[n]); } catch (e) { console.log(n, "FAILED:", e.message); bad++; continue; }
  fs.writeFileSync(path.join(out, n + ".svg"), lay.svg);
  fs.writeFileSync(path.join(out, n + ".json"), JSON.stringify({ x: lay.x, y: lay.y, w: lay.w, h: lay.h, texts: lay.texts, ref: specs[n].ref || null }));
  await pg.evaluate(([W, H, svg]) => { const b = document.getElementById("b"); b.style.width = W + "px"; b.style.height = H + "px"; b.innerHTML = svg; return document.fonts.ready; }, [Math.round(lay.w * S), Math.round(lay.h * S), lay.svg]);
  await pg.locator("#b").screenshot({ path: path.join(out, n + ".png") });
}
await browser.close(); process.exit(bad ? 1 : 0);
