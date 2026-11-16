/* The page makes room for a docked panel (15 Nov 2026; calc.js and scratch.js through window.KitDock, kit.css's calculator
   block), for page.js parts N and W. At 1366 × 657: with the given panels docked, the question card's controls (Back, Next,
   Flag for review, Check, the first answer) are not under a panel, the bar's buttons end where the sheet ends, and nothing
   scrolls sideways; both panels leave a sheet about 500 px wide. At 1280 × 800 both reserve nothing (under 520 px would be
   left). Dragged away from the edge, a panel reserves nothing. A print preview, a teacher's view and print reserve nothing. */
const HOSTS = /^https:\/\/(desmosforassessment\.cambiumtds\.com|aldenbradford\.com)(\/|$)/;
module.exports = async function dock(newContext, url, which, teacher, F) {
  const ids = { scratch: '#bScratch', calc: '#bCalc' }, panel = { scratch: '#kscr', calc: '#kcalc' }, title = { scratch: '#kscrT', calc: '#kcalcT' };
  async function opened(w, h, list) {
    const ctx = await newContext({ viewport: { width: w, height: h } });
    await ctx.route(HOSTS, r => r.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>calculator</title><p>calculator</p>' }));
    const p = await ctx.newPage();
    await p.goto(url + '#set-4821'); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForSelector('#pgStart:visible', { timeout: 8000 });
    await p.click('#pgStart'); for (const k of list) await p.click(ids[k]); await p.waitForTimeout(200);
    return { ctx, p };
  }
  const state = p => p.evaluate(() => {
    const de = getComputedStyle(document.documentElement), sh = document.querySelector('.sheet').getBoundingClientRect(), bt = document.querySelector('.watch .btns').getBoundingClientRect();
    const sels = ['#pgPrev', '#pgNext', '#pgFlag', '.q.pg-on [data-check]', '.q.pg-on input:not([type=hidden]), .q.pg-on textarea, .q.pg-on .nlw, .q.pg-on svg'];
    const covered = [];
    sels.forEach(s => { const e = document.querySelector(s); if (!e || !e.getClientRects().length) return; e.scrollIntoView({ block: 'center' });
      const r = e.getBoundingClientRect(); [[r.left + 3, r.top + r.height / 2], [r.right - 3, r.top + r.height / 2]].forEach(([x, y]) => { const t = document.elementFromPoint(x, y); if (t && t.closest('#kscr,#kcalc')) covered.push(s); }); });
    return { L: de.getPropertyValue('--dockL').trim(), R: de.getPropertyValue('--dockR').trim(), w: Math.round(sh.width), right: Math.round(sh.right), btn: Math.round(bt.right),
      sw: document.documentElement.scrollWidth - document.documentElement.clientWidth, covered: [...new Set(covered)], pad: getComputedStyle(document.body).paddingLeft + ' ' + getComputedStyle(document.body).paddingRight };
  });
  for (const list of [[which], ...(which === 'scratch' ? [['scratch', 'calc']] : [])]) {
    const { ctx, p } = await opened(1366, 657, list), s = await state(p), name = list.join(' and ');
    if (s.covered.length) F('dock: at 1366 × 657 with ' + name + ' open, under a panel: ' + s.covered.join(', '));
    if (!(s.L || s.R) || Math.abs(s.btn - s.right) > 1 || s.sw > 0) F('dock: at 1366 × 657 with ' + name + ' open: ' + JSON.stringify(s));
    if (list.length === 2 && (s.w < 460 || s.w > 600)) F('dock: both panels leave a sheet ' + s.w + ' px wide');
    if (list.length === 1) {
      for (const c of teacher ? ['printing', 'tview'] : ['printing']) { const pad = await p.evaluate(c => { document.body.classList.add(c); const v = getComputedStyle(document.body).paddingLeft + ' ' + getComputedStyle(document.body).paddingRight; document.body.classList.remove(c); return v; }, c);
        if (pad !== '16px 16px') F('dock: ' + c + ' keeps a reservation: ' + pad); }
      await p.emulateMedia({ media: 'print' }); const pp = await p.evaluate(() => getComputedStyle(document.body).paddingLeft + ' ' + getComputedStyle(document.body).paddingRight); await p.emulateMedia({ media: 'screen' });
      if (/^(\d+)px/.exec(pp)[1] > 16) F('dock: print keeps a reservation: ' + pp);
      await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(100);
      const h = await p.evaluate(t => { const r = document.querySelector(t).getBoundingClientRect(); return [r.left + 4, r.top + r.height / 2]; }, title[which]);
      await p.mouse.move(h[0], h[1]); await p.mouse.down(); await p.mouse.move(h[0] + (which === 'scratch' ? 300 : -300), h[1] + 20, { steps: 6 }); await p.mouse.up(); await p.waitForTimeout(80);
      const d = await state(p), at = await p.evaluate(s => Math.round(document.querySelector(s).getBoundingClientRect().left), panel[which]);
      if (d.L || d.R) F('dock: dragged away from the edge (to x ' + at + '), ' + which + ' still reserves ' + (d.L || d.R));
      await p.click(panel[which] + ' ' + (which === 'scratch' ? '#kscrX' : '#kcalcX')); await p.waitForTimeout(60);
      const c2 = await state(p); if (c2.L || c2.R) F('dock: closed, ' + which + ' still reserves');
    }
    await ctx.close();
  }
  if (which === 'scratch') { const { ctx, p } = await opened(1280, 800, ['scratch', 'calc']), s = await state(p);
    if (s.L || s.R || s.w !== 736) F('dock: at 1280 × 800 both panels reserve room (under 520 px would be left): ' + JSON.stringify(s)); await ctx.close(); }
};
