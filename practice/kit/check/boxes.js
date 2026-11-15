/* Practice-test kit checks — typing into a part with several boxes (15 Nov 2026; ui.js "several boxes in one part").
   A part's boxes are #a<id>, #a<id>_1, #a<id>_2 …; Unit.keyText gives one string per box. The page checks were written for one
   box a part, and type with page.fill('#a<id>', text) everywhere. wire(page) makes that one call fill every box of such a part:
   an array, one string per box (a key); one string, the same in every box (987654 for a wrong answer, '((3' for an unreadable
   one). A one-box part, and every other selector, is filled exactly as before. wireBrowser(b) wires every page of every context
   the checks open. */
const boxesOf = (U, p) => { try { const b = U && U.view && U.view.boxes ? U.view.boxes(p) : null; return Array.isArray(b) && b.length >= 2 ? b : null; } catch (e) { return null; } };
const boxSel = (id, k) => '#a' + id + (k ? '_' + k : '');
function wire(page) {
  if (!page || page.__boxes) return page;
  const raw = page.fill.bind(page); page.__boxes = true;
  page.fill = async (sel, v, o) => {
    const m = typeof sel === 'string' && /^#a([\w.]+)$/.exec(sel);
    if (m) {
      const n = await page.evaluate(id => { const e = document.getElementById('a' + id); if (!e || !e.hasAttribute('data-part')) return 0; let k = 1; while (document.getElementById('a' + id + '_' + k)) k++; return k; }, m[1]).catch(() => 0);
      if (n > 1) { const vs = Array.isArray(v) ? v : Array(n).fill(String(v)); for (let k = 0; k < n; k++) await raw(boxSel(m[1], k), vs[k] == null ? '' : String(vs[k]), o); return; }
    }
    return raw(sel, Array.isArray(v) ? v.join(', ') : v, o);
  };
  return page;
}
function wireContext(c) { if (!c || c.__boxes) return c; const np = c.newPage.bind(c); c.newPage = async (...a) => wire(await np(...a)); c.__boxes = true; c.on('page', pg => wire(pg)); return c; }
function wireBrowser(b) { const nc = b.newContext.bind(b); b.newContext = async o => wireContext(await nc(o)); return b; }
module.exports = { boxesOf, boxSel, wire, wireContext, wireBrowser };
