/* Practice kit: the help in a real browser (HELP_STANDARD.md; 14 Nov 2026; the card, 27 Nov 2026).   node <kit>/check/help_page.js <unit folder>
   Opens the unit's look-only build (preview.html, written by run.py), opens Hints 1–3 on every question part, and checks:
   F. the pictures, at 390 × 844 in light and in dark: every picture in the help (figure.xfig, and Hint 3's own picture) drawn at the
      width of the line that holds it (at least 85% of it), every label at least 12.5 px (an axis's tick numbers are exempt) on the
      screen, and every label's contrast with the picture's own background at least 4.5:1.
   K. the card a term opens (Croix, 27 Nov 2026: "When I click on a vocab word, instead of opening in parentheses on the line, I
      would like a card to pop up that's the definition and everything else in depth about the word"), in light and in dark:
      at 390 × 844 (a phone, by touch) and 1280 × 800 (a Chromebook, by mouse), on a term in Hint 3 whose card has related words —
      a tap opens one <dialog>, modal, the focus on its title, named by the title (the entry's word) and described by the
      definition, the term marked aria-haspopup="dialog"; a bottom sheet at 390 (the screen's width, on its bottom edge, rounded
      top corners, at most 85% of the screen's height), centered at 1280 (at most 520 px wide and 80% of the height); Esc, the ×,
      and a tap on the backdrop each close it, the focus back on the term; Enter and Space on the term open it; arrow keys, Enter,
      Page Up and Down, Home and End inside it reach none of the page's own key handlers (listeners on the document and the window
      hear nothing) and leave the page where it was; the wheel over the backdrop or the card does not scroll the page; a related
      chip swaps the card, "Back to …" appears and walks back. And every card of the glossary, opened in turn at 360 × 780, 390 and
      1280, light and dark: nothing past the screen's edge or wider than the card (no example cut off inside its box); the × at
      the text's inset from the card's right edge (the lead, 27 Nov 2026), at least 44 px, and every chip and Back at least 44 px
      tall; every text at least 4.5:1 on the background behind it (the math as KaTeX draws it, once tex.js has drawn it), and a
      picture's labels at least 12.5 px and 4.5:1.
   L. a label drawn on a box (rect.xlabbg and the text right after it: a point's coordinates, a zoomed reading), in every card and
      every Hint opened above, at 360, 390 and 1280, light and dark: the box hugs the text, centered on it — the centers within 1.5
      px across (2 up and down), the padding left and right within 2 px of each other, each side 2 to 14 px (the lead, 27 Nov 2026).
   KIT_X_SHOTS=<folder> saves the card at each size and theme as a student sees it, and again after a related chip. */
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
const dir = path.resolve(process.argv[2] || '.'), page0 = path.join(dir, 'preview.html');
const SHOTS = process.env.KIT_X_SHOTS ? path.resolve(process.env.KIT_X_SHOTS) : null;
if (!fs.existsSync(page0)) { console.log('help_page: no preview.html — run run.py'); process.exit(1); }
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
let bad = 0;
const fail = (where, what) => { bad++; console.log('FAIL ' + where + ': ' + what); };
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* in the page: every label drawn on a box (rect.xlabbg, then its text) under sel, measured on the screen (the lead, 27 Nov 2026:
   the box of "(3, 6)" ran far past the text). The box hugs the text, centered on it: the centers within 1.5 px across (2 up and
   down), the padding left and right within 2 px of each other, and each side 2 to 14 px */
function measureLabels(sel) {
  const out = [];
  document.querySelectorAll(sel).forEach(r => { if (sel.indexOf('dialog') < 0 && r.closest('dialog')) return;
    const t = r.nextElementSibling; if (!t || t.tagName.toLowerCase() !== 'text') { out.push({ errs: ['a label box with no text right after it'] }); return; }
    const a = r.getBoundingClientRect(), b = t.getBoundingClientRect(); if (!a.width || !b.width) return;
    const padL = b.left - a.left, padR = a.right - b.right, dx = (a.left + a.right - b.left - b.right) / 2, dy = (a.top + a.bottom - b.top - b.bottom) / 2, s = t.textContent;
    const o = { s, padL, padR, dx, dy, errs: [] };
    if (Math.abs(dx) > 1.5 || Math.abs(dy) > 2) o.errs.push('the label "' + s + '" is off its box\'s center by ' + dx.toFixed(1) + ' px across, ' + dy.toFixed(1) + ' px up and down');
    if (Math.abs(padL - padR) > 2) o.errs.push('the label "' + s + '" has ' + padL.toFixed(1) + ' px of box on its left and ' + padR.toFixed(1) + ' px on its right');
    if (Math.min(padL, padR) < 2 || Math.max(padL, padR) > 14) o.errs.push('the box of "' + s + '" does not hug it: ' + padL.toFixed(1) + ' and ' + padR.toFixed(1) + ' px each side (2 to 14)');
    out.push(o); });
  return out;
}

/* in the page: what one open card looks like (every card is measured with this) */
function measureCard() {
  const d = document.querySelector('dialog.xdlg'), w = d && d.firstChild, out = { errs: [] };
  if (!d || !d.open) { out.errs.push('no open card'); return out; }
  const W = innerWidth, H = innerHeight, r = d.getBoundingClientRect(), cs = getComputedStyle(d);
  const x = d.querySelector('.xcx'), def = d.querySelector('.xcdef'), t = d.querySelector('#xcard-t');
  out.rect = { l: r.left, r: r.right, t: r.top, b: r.bottom, w: r.width, h: r.height }; out.W = W; out.H = H;
  out.radius = { tl: parseFloat(cs.borderTopLeftRadius), bl: parseFloat(cs.borderBottomLeftRadius) };
  out.word = t ? t.textContent.trim() : '';
  /* nothing past the screen's edge or wider than the card; no example cut off inside its box */
  if (r.left < -0.5 || r.right > W + 0.5 || r.bottom > H + 0.5) out.errs.push('the card is past the screen edge: ' + Math.round(r.left) + '–' + Math.round(r.right) + ' on a ' + W + ' px screen');
  if (w.scrollWidth > w.clientWidth + 1) out.errs.push('the card scrolls sideways: ' + w.scrollWidth + ' px of content in ' + w.clientWidth);
  d.querySelectorAll('.xcex').forEach(e => { if (e.scrollWidth > e.clientWidth + 1) out.errs.push('an example is cut off: ' + e.scrollWidth + ' px in a ' + e.clientWidth + ' px box'); });
  d.querySelectorAll('*').forEach(e => { if (e.closest('svg') && e.tagName.toLowerCase() !== 'svg') return; const q = e.getBoundingClientRect();
    if (q.width && (q.right > r.right + 0.5 || q.left < r.left - 0.5) && !(e.closest('.xcex') && e.closest('.xcex') !== e)) out.errs.push('"' + (e.textContent || e.tagName).trim().slice(0, 30) + '" reaches past the card (' + Math.round(q.left) + '–' + Math.round(q.right) + ')'); });
  /* the × at the text's inset; 44 px targets */
  if (x && def) { const xr = x.getBoundingClientRect(), dr = def.getBoundingClientRect(); out.xInset = r.right - xr.right; out.textInset = r.right - dr.right;
    if (Math.abs(out.xInset - out.textInset) > 1) out.errs.push('the × is ' + out.xInset.toFixed(1) + ' px from the card\'s right edge, the text ' + out.textInset.toFixed(1));
    if (xr.width < 44 || xr.height < 44) out.errs.push('the × is ' + xr.width + ' × ' + xr.height + ' px'); } else out.errs.push('no × or no definition');
  d.querySelectorAll('.xcchip,.xcback').forEach(c => { const q = c.getBoundingClientRect(); if (q.height < 44 || q.width < 44) out.errs.push('"' + c.textContent.trim() + '" is ' + Math.round(q.width) + ' × ' + Math.round(q.height) + ' px'); });
  /* contrast: every text on the background behind it (translucent fills laid over the card), a picture's labels too */
  const col = c => { let m = /^color\(srgb ([\d.]+) ([\d.]+) ([\d.]+)(?: \/ ([\d.]+))?\)/.exec(c); if (m) return { r: m[1] * 255, g: m[2] * 255, b: m[3] * 255, a: m[4] == null ? 1 : +m[4] };
    m = c.match(/[\d.]+/g); return m ? { r: +m[0], g: +m[1], b: +m[2], a: m.length > 3 ? +m[3] : 1 } : null; };
  const over = (a, b) => ({ r: a.r * a.a + b.r * (1 - a.a), g: a.g * a.a + b.g * (1 - a.a), b: a.b * a.a + b.b * (1 - a.a), a: 1 });
  const bgOf = el => { const L = []; for (let e = el; e; e = e.parentElement) { const c = col(getComputedStyle(e).backgroundColor); if (c && c.a > 0) { L.push(c); if (c.a >= 0.999) break; } }
    let base = L.length && L[L.length - 1].a >= 0.999 ? L.pop() : { r: 255, g: 255, b: 255, a: 1 }; while (L.length) base = over(L.pop(), base); return base; };
  const lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const ratio = (a, b) => { const A = lum(a), B = lum(b); return (Math.max(A, B) + 0.05) / (Math.min(A, B) + 0.05); };
  out.minCR = 99; out.minLabel = 99; out.texts = 0;
  d.querySelectorAll('*').forEach(e => { const tag = e.tagName.toLowerCase();
    if (tag === 'text') { if (!e.textContent.trim() || /\btick\b/.test(e.getAttribute('class') || '') || e.closest('.tick')) return;
      const svg = e.ownerSVGElement, vb = svg && svg.viewBox.baseVal, k = vb && vb.width ? svg.getBoundingClientRect().width / vb.width : 1, px = parseFloat(getComputedStyle(e).fontSize) * k;
      const fill = col(getComputedStyle(e).fill.startsWith('rgb') || getComputedStyle(e).fill.startsWith('color(') ? getComputedStyle(e).fill : 'rgb(0,0,0)'), cr = ratio(over(fill, bgOf(svg.parentElement)), bgOf(svg.parentElement));
      out.texts++; out.minCR = Math.min(out.minCR, cr); out.minLabel = Math.min(out.minLabel, px);
      if (cr < 4.5) out.errs.push('a picture\'s label "' + e.textContent.trim().slice(0, 20) + '" is ' + cr.toFixed(2) + ':1');
      if (px < 12.5) out.errs.push('a picture\'s label "' + e.textContent.trim().slice(0, 20) + '" is ' + px.toFixed(1) + ' px'); return; }
    const drawn = e.matches('.m') && e.shadowRoot && !e.hasAttribute('data-tex-fallback');   /* tex.js's KaTeX, in the span's shadow: it inherits the span's color */
    if (e.closest('svg') || !drawn && ![...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) return;
    const st = getComputedStyle(e); if (st.visibility === 'hidden' || !e.getClientRects().length) return;
    if (st.overflow === 'hidden' && Math.abs(parseFloat(st.textIndent) || 0) >= e.getBoundingClientRect().width) return;   /* its text pushed out of its own clipped box (a radical's √, drawn by a mask) */
    const bg = bgOf(e), fg = over(col(st.color), bg), cr = ratio(fg, bg); out.texts++; out.minCR = Math.min(out.minCR, cr);
    if (cr < 4.5) out.errs.push('"' + e.textContent.trim().slice(0, 30) + '" is ' + cr.toFixed(2) + ':1 on its background'); });
  return out;
}

/* tex.js draws each math span in KaTeX on the next animation frame after it appears (later on a busy machine): wait for it */
const settle = pg => pg.waitForFunction(() => { const d = document.querySelector('dialog.xdlg'); return !window.katex || !d || [...d.querySelectorAll('.m')].every(m => m.shadowRoot || (m.closest && m.closest('[data-tex-off]'))); }, null, { timeout: 5000 })
  .then(() => true, () => false);
async function openRungs(pg) {
  const ids = await pg.$$eval('[data-rung][data-to="1"]', bs => bs.map(x => x.getAttribute('data-rung')));
  for (const id of ids) for (const to of [1, 2, 3]) { const el = await pg.$('[data-rung="' + id + '"][data-to="' + to + '"]'); if (el) { await el.click(); } }
  await sleep(300);
}

(async () => {
  const b = await chromium.launch(); let figs = 0, labels = 0, worst = { px: 99, cr: 99 }, cardsSeen = 0, cardWorst = { cr: 99, label: 99 }, flows = 0, labelsSeen = 0, labWorst = { dx: 0, pad: 0 };
  for (const scheme of ['light', 'dark']) for (const [W, H] of [[390, 844], [1280, 800], [360, 780]]) {
    const where = scheme + ' ' + W, touch = W < 900;
    const ctx = await b.newContext({ viewport: { width: W, height: H }, colorScheme: scheme, hasTouch: touch, reducedMotion: 'reduce' });
    await ctx.addInitScript(() => { window.KIT_PAGER_OFF = true; });
    const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', e => errs.push(e.message));
    await pg.goto('file://' + page0 + '#set-7'); await sleep(500);
    await openRungs(pg);
    /* L. the labels on boxes in the Hints, Hint 3 and the walkthroughs opened above */
    const noteLabels = (where2, ls) => ls.forEach(l => { (l.errs || []).forEach(e => fail(where2, e)); if (l.dx != null) { labelsSeen++; labWorst.dx = Math.max(labWorst.dx, Math.abs(l.dx)); labWorst.pad = Math.max(labWorst.pad, Math.abs(l.padL - l.padR)); } });
    noteLabels(where + ' (help)', await pg.evaluate(measureLabels, 'rect.xlabbg'));

    /* F. the pictures (at 390, as since 14 Nov 2026) */
    if (W === 390) {
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
      for (const f of r) { figs++; if (f.w < 0.85 * Math.min(f.W, 460) - 2) fail(scheme, 'a picture is ' + Math.round(f.w) + ' px wide in a ' + f.W + ' px panel');
        for (const l of f.labels) { labels++; worst.px = Math.min(worst.px, l.px); worst.cr = Math.min(worst.cr, l.cr);
          if (l.px < 12.5) fail(scheme, 'label "' + l.s + '" is ' + l.px.toFixed(1) + ' px');
          if (l.cr < 4.5) fail(scheme, 'label "' + l.s + '" has contrast ' + l.cr.toFixed(2)); } }
    }

    /* K. the card: a term in Hint 3 whose card has related words, opened as a student opens it */
    const has = await pg.evaluate(() => !!(window.Kit && Kit.X && Kit.X.open));
    const tid = has && await pg.evaluate(() => { const GL = Kit.X.glossary(), ok = t => { const k = Kit.X.cardOf(t.dataset.xterm); return k && (GL[k].see || []).some(s => Kit.X.cardOf(s) && Kit.X.cardOf(s) !== k); };
      const t = [...document.querySelectorAll('.rung.r3 [data-xterm]')].find(t => t.offsetParent && ok(t)) || [...document.querySelectorAll('[data-xterm]')].find(t => t.offsetParent && ok(t));
      if (!t) return null; t.setAttribute('data-xtest', '1'); return t.dataset.xterm; });
    if (!tid) { if (has) fail(where, 'no term with related words found in the help'); else fail(where, 'the page has no Kit.X'); await ctx.close(); continue; }
    const term = pg.locator('[data-xtest="1"]');
    const state = () => pg.evaluate(() => { const d = document.querySelector('dialog.xdlg'), a = document.activeElement;
      return { open: !!(d && d.open), modal: !!(d && d.open && d.matches(':modal')), focus: a ? (a.id || (a.getAttribute('data-xtest') ? 'TERM' : a.tagName)) : null, title: (document.getElementById('xcard-t') || {}).textContent || '',
        lab: d && d.getAttribute('aria-labelledby'), desc: d && d.getAttribute('aria-describedby'), dtext: ((document.getElementById((d && d.getAttribute('aria-describedby')) || 'x') || {}).textContent || '').trim(),
        haspopup: (document.querySelector('[data-xtest="1"]') || {}).getAttribute ? document.querySelector('[data-xtest="1"]').getAttribute('aria-haspopup') : null,
        back: (document.querySelector('dialog.xdlg .xcback') || {}).textContent || '', y: scrollY, hash: location.hash, lock: getComputedStyle(document.documentElement).overflowY }; });
    const word = await pg.evaluate(id => Kit.X.glossary()[Kit.X.cardOf(id)].word.replace(/<[^>]+>/g, ''), tid);
    const tapTerm = async () => { await term.scrollIntoViewIfNeeded(); await sleep(60); if (touch) await term.tap(); else await term.click(); await sleep(250); if (!await settle(pg)) fail(where, 'the card\'s math was not drawn within 5 s'); };
    if (W !== 360) {
      flows++;
      await tapTerm(); let s = await state();
      if (!s.open || !s.modal) fail(where, 'a ' + (touch ? 'tap' : 'click') + ' on "' + word + '" opened no modal card');
      if (s.focus !== 'xcard-t') fail(where, 'the focus is on ' + s.focus + ', not the card\'s title');
      if (s.lab !== 'xcard-t' || s.title.trim() !== word) fail(where, 'the card is not named by its title "' + word + '" (' + s.lab + ': "' + s.title + '")');
      if (s.desc !== 'xcard-d' || s.dtext.length < 3) fail(where, 'the card is not described by its definition');
      if (s.haspopup !== 'dialog') fail(where, 'the term is not marked aria-haspopup="dialog"');
      const m = await pg.evaluate(measureCard);
      if (W <= 560) { if (Math.abs(m.rect.l) > 0.5 || Math.abs(m.rect.r - m.W) > 0.5 || Math.abs(m.rect.b - m.H) > 0.5) fail(where, 'not a bottom sheet: ' + JSON.stringify(m.rect));
        if (m.rect.h > 0.85 * m.H + 1) fail(where, 'the sheet is ' + Math.round(m.rect.h) + ' px tall on an ' + m.H + ' px screen (85% at most)');
        if (!(m.radius.tl >= 8) || m.radius.bl > 0.5) fail(where, 'the sheet\'s corners: top ' + m.radius.tl + ', bottom ' + m.radius.bl); }
      else { if (Math.abs(m.rect.l - (m.W - m.rect.r)) > 1 || Math.abs(m.rect.t - (m.H - m.rect.b)) > 1) fail(where, 'the card is not centered: ' + JSON.stringify(m.rect));
        if (m.rect.w > 520.5 || m.rect.h > 0.8 * m.H + 1) fail(where, 'the card is ' + Math.round(m.rect.w) + ' × ' + Math.round(m.rect.h) + ' (520 wide and 80% tall at most)'); }
      if (SHOTS) await pg.screenshot({ path: path.join(SHOTS, 'card-' + W + '-' + scheme + '.png') });
      /* the page under it stays put: the wheel over the backdrop and over the card */
      const y0 = s.y; if (s.lock !== 'hidden') fail(where, 'the page under the card can scroll (overflow ' + s.lock + ')');
      const bx = W <= 560 ? [W / 2, 8] : [8, H / 2];
      await pg.mouse.move(bx[0], bx[1]); await pg.mouse.wheel(0, 900); await sleep(200);
      await pg.mouse.move((m.rect.l + m.rect.r) / 2, (m.rect.t + m.rect.b) / 2); await pg.mouse.wheel(0, 900); await sleep(250);
      s = await state(); if (Math.abs(s.y - y0) > 0.5) fail(where, 'the page scrolled under the card, ' + y0 + ' → ' + s.y);
      /* keys inside the card reach none of the page's handlers */
      await pg.evaluate(() => { window.__xheard = []; const f = e => window.__xheard.push(e.type + ':' + e.key); ['keydown', 'keyup', 'keypress'].forEach(t => { document.addEventListener(t, f, true); document.addEventListener(t, f); window.addEventListener(t, f); }); });
      await pg.evaluate(() => document.getElementById('xcard-t').focus());
      for (const k of ['ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft', 'Enter', 'PageDown', 'PageUp', 'Home', 'End']) { await pg.keyboard.press(k); await sleep(30); }
      const heard = await pg.evaluate(() => window.__xheard.slice(0, 5)); s = await state();
      if (heard.length) fail(where, 'keys pressed inside the card reached the page: ' + heard.join(', '));
      if (!s.open) fail(where, 'a key inside the card closed it'); if (Math.abs(s.y - y0) > 0.5 || s.hash !== '#set-7') fail(where, 'keys inside the card moved the page (' + y0 + ' → ' + s.y + ', ' + s.hash + ')');
      /* Esc closes it, the focus back on the term */
      await pg.keyboard.press('Escape'); await sleep(150); s = await state();
      if (s.open) fail(where, 'Esc did not close the card'); if (s.focus !== 'TERM') fail(where, 'after Esc the focus is on ' + s.focus + ', not the term');
      if (s.lock === 'hidden') fail(where, 'the page stays locked after the card closed');
      /* Enter and Space on the term open it */
      for (const k of ['Enter', ' ']) { await term.focus(); await pg.keyboard.press(k); await sleep(200); s = await state();
        if (!s.open || s.focus !== 'xcard-t') fail(where, (k === ' ' ? 'Space' : 'Enter') + ' on the term did not open its card with the focus on its title');
        if (k === 'Enter') { await pg.keyboard.press('Escape'); await sleep(120); } }
      /* the × closes it */
      await pg.click('dialog.xdlg .xcx'); await sleep(150); s = await state();
      if (s.open) fail(where, 'the × did not close the card'); if (s.focus !== 'TERM') fail(where, 'after the × the focus is on ' + s.focus);
      /* a tap on the backdrop closes it */
      await tapTerm(); if (touch) await pg.touchscreen.tap(bx[0], bx[1]); else await pg.mouse.click(bx[0], bx[1]); await sleep(150); s = await state();
      if (s.open) fail(where, 'a tap on the backdrop did not close the card'); if (s.focus !== 'TERM') fail(where, 'after the backdrop the focus is on ' + s.focus);
      /* a related chip swaps it; Back walks back */
      await tapTerm(); const chip = await pg.evaluate(() => { const c = document.querySelector('dialog.xdlg .xcchip'); return c ? c.textContent.trim() : null; });
      if (!chip) fail(where, 'the card of "' + word + '" has no related chip');
      else { if (touch) await pg.tap('dialog.xdlg .xcchip'); else await pg.click('dialog.xdlg .xcchip'); await sleep(200); await settle(pg); s = await state();
        if (s.title.trim() !== chip) fail(where, 'the chip "' + chip + '" opened "' + s.title + '"');
        if (s.back.replace(/^←\s*/, '').trim() !== 'Back to ' + word) fail(where, 'no "Back to ' + word + '" after a related chip ("' + s.back + '")');
        if (s.focus !== 'xcard-t') fail(where, 'after a related chip the focus is on ' + s.focus);
        const mb = await pg.evaluate(measureCard); mb.errs.forEach(e => fail(where + ' (' + chip + ')', e));
        if (SHOTS) await pg.screenshot({ path: path.join(SHOTS, 'card-' + W + '-' + scheme + '-back.png') });
        if (touch) await pg.tap('dialog.xdlg .xcback'); else await pg.click('dialog.xdlg .xcback'); await sleep(200); s = await state();
        if (s.title.trim() !== word || s.back) fail(where, 'Back did not return to "' + word + '" ("' + s.title + '", back "' + s.back + '")'); }
      await pg.keyboard.press('Escape'); await sleep(120); s = await state(); if (s.open || s.focus !== 'TERM') fail(where, 'the card did not close back to the term');
    }
    /* every card of the glossary, opened in turn */
    const ids = await pg.evaluate(() => Object.keys(Kit.X.glossary()).filter(k => !Kit.X.glossary()[k].card));
    for (const id of ids) {
      await pg.evaluate(id => Kit.X.open(id, null), id); await sleep(60);
      if (!await settle(pg)) fail(where + ' card ' + id, 'its math was not drawn within 5 s');
      const m = await pg.evaluate(measureCard); cardsSeen++; noteLabels(where + ' card ' + id, await pg.evaluate(measureLabels, 'dialog.xdlg rect.xlabbg'));
      m.errs.forEach(e => fail(where + ' card ' + id, e)); if (m.texts) { cardWorst.cr = Math.min(cardWorst.cr, m.minCR); cardWorst.label = Math.min(cardWorst.label, m.minLabel); }
      await pg.evaluate(() => Kit.X.close()); await sleep(30);
    }
    if (errs.length) fail(where, 'page errors: ' + errs.slice(0, 3).join(' | '));
    await ctx.close();
  }
  await b.close();
  console.log('help_page: ' + figs + ' pictures, ' + labels + ' labels at 390 px, light and dark; smallest label ' + worst.px.toFixed(1) + ' px, lowest contrast ' + worst.cr.toFixed(2) +
    '; the card: ' + flows + ' runs of tap, keys, Esc, ×, backdrop, a related chip and Back, and ' + cardsSeen + ' cards opened at 360, 390 and 1280 (lowest contrast of a text or a picture\'s label ' + cardWorst.cr.toFixed(2) + ', smallest picture label ' + cardWorst.label.toFixed(1) + ' px); ' + labelsSeen + ' labels on boxes in the cards and the Hints, each centered (at most ' + labWorst.dx.toFixed(1) + ' px off) with even padding (at most ' + labWorst.pad.toFixed(1) + ' px apart) — ' + (bad ? bad + ' problems' : 'all readable'));
  process.exit(bad ? 1 : 0);
})();
