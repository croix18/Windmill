/* check/page.js part N — the calculators in a real browser (calc.js, 8 Nov 2026; Croix: "if you can get it to load inside the
   practices and practice tests that would be a dream come true", and "I would also like this t130xa calculator embedded as well
   … it should be the same as the desmos"). Both addresses are answered here (page.route) by small stand-in pages, so the panel
   is filled and nothing leaves the machine:
     - before a calculator is picked: no iframe, no request to its host, nothing in the page's markup that could fetch it;
     - the button in the top bar: 44 px, aria-expanded, the icon and the word on a wide screen, the icon alone on a phone;
     - opening: focus on the panel's header; the FAST frame at the exact address, referrerpolicy no-referrer, its title,
       360 × 560, asked once and with no Referer; docked at the right, under the bar; the new-tab link to the same address;
     - Escape closes it and gives focus back to the button; opened again it is the same frame, not loaded again, and what was
       typed in it is still there; Tab goes header → Close → the switch → the link;
     - the switch: TI-30Xa makes its frame (exact address, no-referrer, its title) only then, with its credit line; the link
       follows the calculator shown; back to FAST, both frames kept and neither loaded again; the pick survives a reload;
     - dragged by its header it moves, never over the bar; the place survives closing and a reload; a smaller window keeps it
       inside;
     - a phone (390 × 844): a full-height sheet, the page behind inert, Close 44 px gives focus back, no sideways scroll;
     - offline: the line beside the link, gone again online;
     - print: the button and the panel never print; a worksheet prints the same pages with the panel open as without it;
       the panel is not over a print preview;
     - dark: the panel's chrome is true dark (a neutral near-black, white words — never navy);
     - a lesson set (#lesson-…) when the unit has a bank: the same button and panel.
   The same on a teacher copy (page.js runs every part on it). */
const path = require('path'), fs = require('fs');
const FAST = 'https://desmosforassessment.cambiumtds.com/TDSCalculator.html?mode=tds_dc_scirestricted';
const TI = 'https://aldenbradford.com/calculator_emulator/';
const HOSTS = /^https:\/\/(desmosforassessment\.cambiumtds\.com|aldenbradford\.com)(\/|$)/;
const STAND = who => '<!doctype html><html lang="en"><meta charset="utf-8"><title>' + who + ' stand-in</title><body style="margin:0;font:16px sans-serif;background:#fff;color:#000">' +
  '<p id="who" style="margin:12px">' + who + ' (a stand-in for the checks)</p><input id="work" aria-label="work" style="margin:0 12px;font-size:16px"></body></html>';

module.exports = async function partN(b, url, U, dir, fail) {
  try { await run(b, url, U, dir, fail); } catch (e) { fail('N: the check stopped: ' + String(e && e.message || e).split('\n')[0]); }
};
async function run(b, url, U, dir, fail) {
  const teacher = /^teacher$/.test(path.basename(dir)), where = teacher ? 'N (teacher copy): ' : 'N: ';
  const F = m => fail(where + m);
  const asked = [], errs = [];
  async function context(opts) {
    const ctx = await b.newContext(Object.assign({ viewport: { width: 1280, height: 800 } }, opts || {}));
    ctx.on('request', r => { if (HOSTS.test(r.url())) asked.push({ url: r.url(), referer: r.headers().referer || '', nav: r.isNavigationRequest() }); });
    await ctx.route(HOSTS, r => r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: STAND(/aldenbradford/.test(r.request().url()) ? 'TI-30Xa' : 'FAST') }));
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
    return { ctx, p };
  }
  const navs = host => asked.filter(a => a.nav && a.url.indexOf(host) === 0);
  const look = p => p.evaluate(() => {
    const k = document.getElementById('kcalc'), b = document.getElementById('bCalc'), r = e => { const x = e.getBoundingClientRect(); return { l: x.left, t: x.top, w: x.width, h: x.height, r: x.right, b: x.bottom }; };
    const fr = Array.from(document.querySelectorAll('iframe')).map(f => ({ src: f.getAttribute('src'), title: f.getAttribute('title'), rp: f.getAttribute('referrerpolicy'), shown: !!f.offsetParent, box: r(f.parentNode), mark: f.__kcheck || 0 }));
    const a = document.getElementById('kcalcN'), cr = document.querySelector('#kcalc .kccr a'), act = document.activeElement;
    return { open: !!k && !k.hidden && getComputedStyle(k).display !== 'none', panel: k && r(k), bar: document.querySelector('.watch').getBoundingClientRect().bottom,
      exp: b.getAttribute('aria-expanded'), ctl: b.getAttribute('aria-controls'), frames: fr, vw: document.documentElement.clientWidth, vh: innerHeight, sw: document.documentElement.scrollWidth,
      link: a && { href: a.getAttribute('href'), target: a.target, rel: a.rel, shown: !!a.offsetParent, h: r(a).h },
      credit: cr && { href: cr.getAttribute('href'), text: cr.textContent.trim(), shown: !!cr.offsetParent, target: cr.target, rel: cr.rel },
      radios: Array.from(document.querySelectorAll('#kcalc .kcsw [role=radio]')).map(x => ({ k: x.getAttribute('data-calc'), on: x.getAttribute('aria-checked'), t: x.textContent, h: r(x).h, tab: x.tabIndex })),
      off: (() => { const o = document.getElementById('kcalcO'); return o && { shown: !!o.offsetParent, text: o.textContent.trim(), box: r(o) }; })(),
      focus: act ? (act.id || act.tagName) : '', inHeader: !!(act && act.closest && act.closest('#kcalcH')) };
  });
  const near = (a, b, d) => Math.abs(a - b) <= (d || 1.5);
  /* the built page itself: the two addresses are calc.js's strings and nothing else — no iframe, no link, no prefetch */
  { const src = fs.readFileSync(path.join(dir, 'preview.html'), 'utf8'), n = s => src.split(s).length - 1;
    if (n(FAST) !== 1 || n(TI) !== 1) F('the built page holds the FAST address ' + n(FAST) + ' times and the TI-30Xa\'s ' + n(TI) + ' times (once each, in calc.js)');
    if (/<iframe\b/i.test(src) || /<link[^>]+(cambiumtds|aldenbradford)/i.test(src) || /rel=["']?(preconnect|dns-prefetch|prefetch|preload|prerender)/i.test(src)) F('the built page could fetch a calculator before it is opened (an iframe, a link or a prefetch in its markup)'); }

  /* ---- a wide screen */
  { const { ctx, p } = await context();
    await p.goto(url); await p.waitForTimeout(400);
    let L = await look(p);
    if (L.frames.length || asked.length) F('before the calculator is opened: ' + L.frames.length + ' iframes, ' + asked.length + ' requests to its hosts');
    const bt = await p.evaluate(() => { const b = document.getElementById('bCalc'), w = b && b.querySelector('.cw'), r = b && b.getBoundingClientRect();
      return b && { inBar: !!b.closest('.watch .btns'), first: document.querySelector('.watch .in').firstElementChild === b, h: r.height, w: r.width, word: w && getComputedStyle(w).display !== 'none' ? w.textContent : '', icon: !!b.querySelector('svg'), label: b.getAttribute('aria-label'), type: b.type, tr: b.getAttribute('translate') }; });
    if (!bt || !bt.inBar || bt.first || bt.h < 44 || bt.word !== 'Calculator' || !bt.icon || bt.label !== 'Calculator' || bt.type !== 'button' || bt.tr !== 'no') F('the bar\'s Calculator button: ' + JSON.stringify(bt));
    if (L.exp !== 'false') F('the button says aria-expanded="' + L.exp + '" before it is opened');
    await p.click('#bCalc'); await p.waitForTimeout(500); L = await look(p);
    if (!L.open || L.exp !== 'true' || L.ctl !== 'kcalc') F('the button did not open the panel: ' + JSON.stringify({ open: L.open, exp: L.exp, ctl: L.ctl }));
    if (!L.inHeader || L.focus !== 'kcalcT') F('on opening, focus is on ' + L.focus + ', not the panel\'s header');
    const t = await p.evaluate(() => { const k = document.getElementById('kcalc'); return { role: k.getAttribute('role'), lab: (document.getElementById(k.getAttribute('aria-labelledby')) || {}).textContent, tr: k.getAttribute('translate') }; });
    if (t.role !== 'dialog' || t.lab !== 'Calculator' || t.tr !== 'no') F('the panel: ' + JSON.stringify(t));
    const f0 = L.frames[0];
    if (L.frames.length !== 1 || !f0 || f0.src !== FAST || f0.rp !== 'no-referrer' || f0.title !== 'FAST calculator (Desmos scientific)' || !f0.shown) F('the FAST frame: ' + JSON.stringify(L.frames));
    else if (!near(f0.box.w, 360) || !near(f0.box.h, 560)) F('the FAST frame is ' + Math.round(f0.box.w) + ' × ' + Math.round(f0.box.h) + ', not 360 × 560, in a 1280 × 800 window');
    if (navs(FAST).length !== 1 || navs(TI).length || asked.some(a => a.referer)) F('opening asked ' + JSON.stringify(asked));
    if (L.panel.t < L.bar + 1 || L.vw - L.panel.r > 24 || L.panel.r > L.vw || L.panel.b > L.vh) F('the panel is not docked at the right under the bar: ' + JSON.stringify({ panel: L.panel, bar: L.bar, vw: L.vw, vh: L.vh }));
    if (!L.link || L.link.href !== FAST || L.link.target !== '_blank' || !/\bnoopener\b/.test(L.link.rel) || !/\bnoreferrer\b/.test(L.link.rel) || !L.link.shown || L.link.h < 44) F('Open in a new tab: ' + JSON.stringify(L.link));
    if (!L.off || L.off.shown) F('online, the offline line shows');
    if (L.radios.length !== 2 || L.radios[0].t !== 'FAST (Desmos)' || L.radios[1].t !== 'TI-30Xa' || L.radios[0].on !== 'true' || L.radios[1].on !== 'false' || L.radios.some(r => r.h < 44) || L.radios[0].tab !== 0 || L.radios[1].tab !== -1) F('the switch: ' + JSON.stringify(L.radios));
    const cx = await p.$eval('#kcalcX', e => ({ t: e.textContent, h: e.getBoundingClientRect().height, w: e.getBoundingClientRect().width })); if (cx.t !== 'Close' || cx.h < 44 || cx.w < 44) F('Close: ' + JSON.stringify(cx));
    /* Tab: the header, Close, the switch's chosen calculator, the link */
    { const seq = []; for (let i = 0; i < 3; i++) { await p.keyboard.press('Tab'); seq.push(await p.evaluate(() => document.activeElement.id || document.activeElement.getAttribute('data-calc') || document.activeElement.tagName)); }
      if (seq.join(' ') !== 'kcalcX fast kcalcN') F('Tab from the header goes ' + seq.join(' → ') + ', not Close → FAST (Desmos) → Open in a new tab'); }
    /* work in the calculator; Escape; the same frame again */
    await p.frameLocator('#kcalc iframe[title="FAST calculator (Desmos scientific)"]').locator('#work').fill('12+3');
    await p.evaluate(() => { document.querySelector('#kcalc iframe').__kcheck = 7; });
    await p.focus('#kcalcN'); await p.keyboard.press('Escape'); await p.waitForTimeout(80); L = await look(p);
    if (L.open || L.exp !== 'false' || L.focus !== 'bCalc') F('Escape: ' + JSON.stringify({ open: L.open, exp: L.exp, focus: L.focus }));
    await p.keyboard.press('Enter'); await p.waitForTimeout(250); L = await look(p);
    const kept = await p.frameLocator('#kcalc iframe[title="FAST calculator (Desmos scientific)"]').locator('#work').inputValue().catch(() => '');
    if (!L.open || L.frames.length !== 1 || L.frames[0].mark !== 7 || navs(FAST).length !== 1 || kept !== '12+3') F('opened again, it is not the same frame with the work in it: ' + JSON.stringify({ open: L.open, frames: L.frames.length, mark: L.frames[0] && L.frames[0].mark, loads: navs(FAST).length, kept }));
    await p.focus('#bCalc'); await p.keyboard.press('Escape'); await p.waitForTimeout(60); L = await look(p); if (L.open) F('Escape on the button did not close the panel');
    await p.click('#bCalc'); await p.waitForTimeout(150);
    /* the switch: the TI-30Xa only now; the link follows; both kept */
    await p.click('#kcalc .kcsw [data-calc="ti"]'); await p.waitForTimeout(400); L = await look(p);
    const tf = L.frames.find(f => f.src === TI), ff = L.frames.find(f => f.src === FAST);
    if (L.frames.length !== 2 || !tf || tf.rp !== 'no-referrer' || tf.title !== 'TI-30Xa calculator' || !tf.shown || !ff || ff.shown || ff.mark !== 7) F('TI-30Xa picked: ' + JSON.stringify(L.frames));
    if (navs(TI).length !== 1 || navs(FAST).length !== 1 || asked.some(a => a.referer)) F('the TI-30Xa asked ' + JSON.stringify(asked));
    if (!L.link || L.link.href !== TI) F('with the TI-30Xa shown, Open in a new tab goes to ' + (L.link && L.link.href));
    if (!L.credit || !L.credit.shown || L.credit.text !== 'TI-30Xa emulator by Alden Bradford' || L.credit.href !== TI || L.credit.target !== '_blank' || !/noopener/.test(L.credit.rel) || !/noreferrer/.test(L.credit.rel)) F('the TI-30Xa\'s credit line: ' + JSON.stringify(L.credit));
    if (L.radios[1].on !== 'true' || L.radios[0].on !== 'false') F('the switch after picking the TI-30Xa: ' + JSON.stringify(L.radios));
    if (tf && (tf.box.w > 389 + 1 || tf.box.h > 636 + 1 || Math.abs(tf.box.w / tf.box.h - 389 / 636) > 0.01)) F('the TI-30Xa is ' + Math.round(tf.box.w) + ' × ' + Math.round(tf.box.h) + ': not its own shape (389 × 636, or smaller)');
    if (L.panel.t < L.bar + 1 || L.panel.b > L.vh || L.panel.r > L.vw || L.panel.l < 0) F('with the TI-30Xa the panel leaves the window or covers the bar: ' + JSON.stringify({ panel: L.panel, bar: L.bar }));
    if (await p.evaluate(() => localStorage.getItem('practice.calc.pick')) !== 'ti') F('the pick is not remembered');
    await p.focus('#kcalc .kcsw [data-calc="ti"]'); await p.keyboard.press('ArrowLeft'); await p.waitForTimeout(150); L = await look(p);
    { const f1 = L.frames.find(f => f.src === FAST), f2 = L.frames.find(f => f.src === TI); const kept2 = await p.frameLocator('#kcalc iframe[title="FAST calculator (Desmos scientific)"]').locator('#work').inputValue().catch(() => '');
      if (L.frames.length !== 2 || !f1 || !f1.shown || f1.mark !== 7 || !f2 || f2.shown || kept2 !== '12+3' || navs(FAST).length !== 1 || navs(TI).length !== 1) F('back to FAST by the arrow: ' + JSON.stringify({ frames: L.frames, kept2, asked: asked.length }));
      if (!L.link || L.link.href !== FAST || (L.credit && L.credit.shown)) F('back to FAST, the link goes to ' + (L.link && L.link.href) + (L.credit && L.credit.shown ? ' and the TI-30Xa\'s credit shows' : '')); }
    await p.click('#kcalc .kcsw [data-calc="ti"]'); await p.waitForTimeout(100);
    /* the pick after a reload: nothing until it is opened, then the TI-30Xa first */
    asked.length = 0; await p.reload(); await p.waitForTimeout(300); L = await look(p);
    if (L.frames.length || asked.length) F('after a reload, before opening: ' + L.frames.length + ' iframes, ' + asked.length + ' requests');
    await p.click('#bCalc'); await p.waitForTimeout(300); L = await look(p);
    if (L.frames.length !== 1 || L.frames[0].src !== TI || L.radios[1].on !== 'true' || !L.link || L.link.href !== TI || navs(FAST).length) F('after a reload the pick is not the TI-30Xa: ' + JSON.stringify({ frames: L.frames.map(f => f.src), radios: L.radios, asked: asked.map(a => a.url) }));
    /* dragging: by the header, never over the bar, remembered, kept inside a smaller window */
    const drag = async (dx, dy) => { const h = await p.$eval('#kcalcT', e => { const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
      await p.mouse.move(h[0], h[1]); await p.mouse.down(); await p.mouse.move(h[0] + dx / 2, h[1] + dy / 2, { steps: 4 }); await p.mouse.move(h[0] + dx, h[1] + dy, { steps: 4 }); await p.mouse.up(); await p.waitForTimeout(60); return look(p); };
    const a0 = L.panel; L = await drag(-500, 30);
    if (!near(L.panel.l, a0.l - 500, 2) || L.panel.t < L.bar + 1) F('dragged 500 px left and 30 down, the panel moved from ' + JSON.stringify(a0) + ' to ' + JSON.stringify(L.panel));
    L = await drag(0, -600); if (L.panel.t < L.bar + 1 || L.panel.t > L.bar + 12) F('dragged up, the panel\'s top is ' + Math.round(L.panel.t) + ' with the bar ending at ' + Math.round(L.bar));
    L = await drag(40, 20); const a1 = L.panel;
    await p.click('#kcalcX'); await p.click('#bCalc'); await p.waitForTimeout(100); L = await look(p);
    if (!near(L.panel.l, a1.l) || !near(L.panel.t, a1.t)) F('closed and opened, the panel moved from ' + JSON.stringify(a1) + ' to ' + JSON.stringify(L.panel));
    await p.reload(); await p.waitForTimeout(250); await p.click('#bCalc'); await p.waitForTimeout(250); L = await look(p);
    if (!near(L.panel.l, a1.l) || !near(L.panel.t, a1.t)) F('after a reload the panel is at ' + JSON.stringify(L.panel) + ', not where it was dragged ' + JSON.stringify(a1));
    for (const [w, h] of [[900, 600], [700, 520]]) { await p.setViewportSize({ width: w, height: h }); await p.waitForTimeout(150); L = await look(p);
      if (L.panel.l < 0 || L.panel.r > L.vw + 0.5 || L.panel.t < L.bar + 1 || L.panel.b > L.vh + 0.5) F('in a ' + w + ' × ' + h + ' window the panel is ' + JSON.stringify(L.panel) + ' (bar ' + Math.round(L.bar) + ')'); }
    await p.setViewportSize({ width: 1280, height: 800 }); await p.waitForTimeout(100);
    /* print: never the button or the panel; a worksheet's pages the same with the panel open; not over a print preview */
    { await p.click('#kcalc .kcsw [data-calc="fast"]'); await p.waitForTimeout(80);
      await p.emulateMedia({ media: 'print' });
      const pr = await p.evaluate(() => ({ b: getComputedStyle(document.getElementById('bCalc')).display, k: getComputedStyle(document.getElementById('kcalc')).display }));
      if (pr.b !== 'none' || pr.k !== 'none') F('printed, the page shows the calculator: ' + JSON.stringify(pr));
      await p.emulateMedia({ media: 'screen' });
      const pages = async () => { await p.evaluate(() => { const m = document.getElementById('mMenu'); if (m.hidden) document.getElementById('bMore').click(); });
        await p.click('#bPrint'); await p.click('[data-print="ws"]'); await p.waitForTimeout(120);
        const v = await p.evaluate(() => getComputedStyle(document.getElementById('kcalc') || document.body).display);
        await p.emulateMedia({ media: 'print' }); const pdf = await p.pdf({ format: 'Letter' }); await p.emulateMedia({ media: 'screen' });
        await p.click('#pvClose'); await p.waitForTimeout(60);
        return { n: (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length, over: v }; };
      const open1 = await pages(); if (open1.over !== 'none') F('the panel shows over the print preview');
      await p.click('#kcalcX'); await p.waitForTimeout(60);
      const shut = await pages();
      if (open1.n !== shut.n || !shut.n) F('the worksheet prints ' + open1.n + ' pages with the calculator open and ' + shut.n + ' with it closed'); }
    /* offline: one line beside the link, gone when back online */
    { await ctx.setOffline(true); await p.waitForTimeout(80); await p.click('#bCalc'); await p.waitForTimeout(150); L = await look(p);
      const lk = await p.$eval('#kcalcN', e => e.getBoundingClientRect().toJSON());
      if (!L.off || !L.off.shown || L.off.text !== 'The calculator needs the internet.') F('offline, the line: ' + JSON.stringify(L.off));
      else if (Math.abs((L.off.box.t + L.off.box.h / 2) - (lk.top + lk.height / 2)) > 6 || L.off.box.r > lk.left + 1) F('offline, the line is not beside the link: ' + JSON.stringify({ line: L.off.box, link: lk }));
      if (L.panel.b > L.vh || L.panel.t < L.bar + 1) F('offline, the panel leaves the window: ' + JSON.stringify(L.panel));
      await ctx.setOffline(false); await p.waitForTimeout(120); L = await look(p); if (!L.off || L.off.shown) F('back online, the offline line still shows'); }
    /* dark: true dark chrome */
    { await p.emulateMedia({ colorScheme: 'dark' }); await p.waitForTimeout(60);
      const d = await p.evaluate(() => { const k = document.getElementById('kcalc'); return { bg: getComputedStyle(k).backgroundColor, ink: getComputedStyle(document.getElementById('kcalcT')).color }; });
      const c = (d.bg.match(/\d+/g) || []).map(Number);
      if (c.length < 3 || Math.max(...c.slice(0, 3)) > 40 || Math.max(...c.slice(0, 3)) - Math.min(...c.slice(0, 3)) > 14 || d.ink.replace(/\s/g, '') !== 'rgb(255,255,255)') F('dark: the panel is ' + d.bg + ' with ' + d.ink + ' words, not true dark');
      await p.emulateMedia({ colorScheme: 'light' }); }
    await ctx.close(); }

  /* ---- a phone: a full-height sheet */
  { const { ctx, p } = await context({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    await p.goto(url); await p.waitForTimeout(300);
    const bt = await p.evaluate(() => { const b = document.getElementById('bCalc'), r = b.getBoundingClientRect(), w = b.querySelector('.cw'); return { w: r.width, h: r.height, word: getComputedStyle(w).display, label: b.getAttribute('aria-label') }; });
    if (bt.h < 44 || bt.w < 44 || bt.w > 48 || bt.word !== 'none' || bt.label !== 'Calculator') F('on a phone the button is not the icon alone, 44 px: ' + JSON.stringify(bt));
    await p.tap('#bCalc'); await p.waitForTimeout(300); let L = await look(p);
    const inert = await p.evaluate(() => ({ sheet: document.querySelector('main.sheet').inert, watch: document.querySelector('.watch').inert, panel: document.getElementById('kcalc').inert, modal: document.getElementById('kcalc').getAttribute('aria-modal') }));
    if (!L.open || !near(L.panel.t, 0) || !near(L.panel.l, 0) || !near(L.panel.w, 390) || !near(L.panel.h, 844)) F('on a phone the panel is not the whole screen: ' + JSON.stringify(L.panel));
    if (!inert.sheet || !inert.watch || inert.panel || inert.modal !== 'true') F('on a phone the page behind the sheet is not inert: ' + JSON.stringify(inert));
    if (L.sw > 391) F('on a phone the open calculator scrolls the page sideways (' + L.sw + ')');
    { const f = L.frames[0]; if (!f || f.src !== FAST || f.box.w < 300 || f.box.l < 0 || f.box.r > 390 || f.box.b > 844) F('on a phone the FAST frame: ' + JSON.stringify(f)); }
    await p.tap('#kcalc .kcsw [data-calc="ti"]'); await p.waitForTimeout(300); L = await look(p);
    { const f = L.frames.find(x => x.src === TI); if (!f || !f.shown || f.box.l < 0 || f.box.r > 390 || f.box.b > 844 || !L.credit || !L.credit.shown) F('on a phone the TI-30Xa: ' + JSON.stringify({ f, credit: L.credit })); }
    const cx = await p.$eval('#kcalcX', e => { const r = e.getBoundingClientRect(); return { w: r.width, h: r.height, t: e.textContent, top: r.top }; });
    if (cx.h < 44 || cx.w < 44 || cx.t !== 'Close' || cx.top > 80) F('on a phone Close: ' + JSON.stringify(cx));
    await p.tap('#kcalcX'); await p.waitForTimeout(120); L = await look(p);
    const back = await p.evaluate(() => ({ sheet: document.querySelector('main.sheet').inert, watch: document.querySelector('.watch').inert, lock: document.documentElement.classList.contains('kcalc-lock') }));
    if (L.open || L.focus !== 'bCalc' || back.sheet || back.watch || back.lock) F('on a phone Close: ' + JSON.stringify({ open: L.open, focus: L.focus, back }));
    await ctx.close(); }

  /* ---- a lesson set, when the unit has a bank */
  { const { ctx, p } = await context(); await p.goto(url); await p.waitForTimeout(250);
    const les = await p.evaluate(() => window.Kit && Kit.Bank ? Kit.Bank.keys().filter(k => Kit.Bank.shown(k)).slice(0, 1) : []);
    if (les.length) { await p.goto(url + '#' + les[0]); await p.reload(); await p.waitForTimeout(300); asked.length = 0;
      if (await p.$$eval('iframe', x => x.length)) F('a lesson set (' + les[0] + ') has an iframe before the calculator is opened');
      await p.click('#bCalc'); await p.waitForTimeout(300); const L = await look(p);
      if (!L.open || L.frames.length !== 1 || L.frames[0].src !== FAST || navs(FAST).length !== 1) F('a lesson set (' + les[0] + '): ' + JSON.stringify({ open: L.open, frames: L.frames }));
      if (!(await p.evaluate(() => location.hash)).includes(les[0])) F('opening the calculator left the lesson set'); }
    console.log('N. the calculators' + (teacher ? ' (teacher copy)' : '') + ': nothing asked before a pick; FAST and TI-30Xa frames exact, kept, switched, remembered; dragged, clamped; phone sheet; offline; print; dark' + (les.length ? '; ' + les[0] : ''));
    await ctx.close(); }
  if (errs.length) F('page errors: ' + errs.slice(0, 3).join(' | '));
}
