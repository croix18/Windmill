/* Practice kit: the help's pictures in a real browser (HELP_STANDARD.md; 14 Nov 2026).   node <kit>/check/help_page.js <unit folder>
   Opens the unit's look-only build (preview.html, written by run.py) at 390 × 844 in light and in dark, opens Hints 1–3 on every
   question part, and checks every picture in the help (figure.xfig, and Hint 3's own picture): drawn at the width of the line that holds it (at least 85% of it), every
   label at least 12.5 px (an axis's tick numbers are exempt) on the screen, and every label's contrast with the picture's own background at least 4.5:1. */
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
const dir = path.resolve(process.argv[2] || '.'), page0 = path.join(dir, 'preview.html');
if (!fs.existsSync(page0)) { console.log('help_page: no preview.html — run run.py'); process.exit(1); }
(async () => {
  const b = await chromium.launch(); let bad = 0, figs = 0, labels = 0, worst = { px: 99, cr: 99 };
  for (const scheme of ['light', 'dark']) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, colorScheme: scheme });
    await ctx.addInitScript(() => { window.KIT_PAGER_OFF = true; });
    const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', e => errs.push(e.message));
    await pg.goto('file://' + page0 + '#set-7'); await pg.waitForTimeout(500);
    const ids = await pg.$$eval('[data-rung][data-to="1"]', bs => bs.map(x => x.getAttribute('data-rung')));
    for (const id of ids) for (const to of [1, 2, 3]) { const el = await pg.$('[data-rung="' + id + '"][data-to="' + to + '"]'); if (el) { await el.click(); } }
    await pg.waitForTimeout(300);
    const r = await pg.evaluate(() => {
      const lum = c => { const m = c.match(/[\d.]+/g).map(Number); const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(m[0]) + 0.7152 * f(m[1]) + 0.0722 * f(m[2]); };
      const solid = el => { let e = el; while (e) { const c = getComputedStyle(e).backgroundColor; const m = c.match(/[\d.]+/g); if (m && (m.length < 4 || +m[3] > 0.5)) return c; e = e.parentElement; } return 'rgb(255,255,255)'; };
      const out = [];
      document.querySelectorAll('.rung figure.xfig, .rung .vis').forEach(fg => {
        const svg = fg.querySelector('svg'); if (!svg) return; const host = fg.parentElement, W = host.clientWidth, w = svg.getBoundingClientRect().width;
        const vb = svg.viewBox.baseVal, k = vb && vb.width ? w / vb.width : 1, bg = solid(fg);
        const o = { w, W, labels: [] };
        svg.querySelectorAll('text').forEach(t => { if (!t.textContent.trim() || t.closest('.tick') || /\btick\b/.test(t.getAttribute('class') || '')) return; const cs = getComputedStyle(t), px = parseFloat(cs.fontSize) * k;
          const L1 = lum(cs.fill.startsWith('rgb') ? cs.fill : 'rgb(0,0,0)'), L2 = lum(bg), cr = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
          o.labels.push({ s: t.textContent.trim().slice(0, 20), px, cr }); });
        out.push(o); });
      return out; });
    for (const f of r) { figs++; if (f.w < 0.85 * Math.min(f.W, 460) - 2) { bad++; console.log('FAIL ' + scheme + ': a picture is ' + Math.round(f.w) + ' px wide in a ' + f.W + ' px panel'); }
      for (const l of f.labels) { labels++; worst.px = Math.min(worst.px, l.px); worst.cr = Math.min(worst.cr, l.cr);
        if (l.px < 12.5) { bad++; console.log('FAIL ' + scheme + ': label "' + l.s + '" is ' + l.px.toFixed(1) + ' px'); }
        if (l.cr < 4.5) { bad++; console.log('FAIL ' + scheme + ': label "' + l.s + '" has contrast ' + l.cr.toFixed(2)); } } }
    if (errs.length) { bad++; console.log('FAIL ' + scheme + ': page errors: ' + errs.slice(0, 3).join(' | ')); }
    await ctx.close();
  }
  await b.close();
  console.log('help_page: ' + figs + ' pictures, ' + labels + ' labels at 390 px, light and dark; smallest label ' + worst.px.toFixed(1) + ' px, lowest contrast ' + worst.cr.toFixed(2) + ' — ' + (bad ? bad + ' problems' : 'all readable'));
  process.exit(bad ? 1 : 0);
})();
