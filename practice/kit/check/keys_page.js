/* check/page.js part O — the keypad, even and tidy (8 Nov 2026; Croix, of an A7 Unit 6 lesson set on his phone: "Can you fix the
   symbols across everything so that they are even looking not like stretching across the screen. It's sloppy."). On a touch
   screen (the keypad shows nowhere else):
     - the unit's keys: a lesson item's keypad holds exactly the keys any answer of the unit can use — worked out here again, on
       its own, from the practice test's answers as a student types them (Unit.keyText, sets 1–1500) and every typed key of the
       lesson items (the page's own CADENCE_BANK) — and the page's KIT_KEYSET says the same; any of < ≤ ≥ > brings all four;
     - the order: operations (− × / a/b ^ √ π), then grouping and relations (( ) = < ≤ ≥ >), a wider gap where they meet in a row;
     - at 320, 360, 390, 412 and 768 px, on a lesson item's box and on a practice-test box with keys: rows of even length (the
       longer ones first, never more than one key apart), as few as fit beside the box (one when they fit), the block starting
       where the box starts and ending inside the box's row, no sideways scroll; every key 44 × 44 (a longer label its own
       width, the same at every width) — never stretched;
     - typing through the keypad: a lesson item's key entered with its symbols tapped from the keypad is ✓ on the first try.
   The same on a teacher copy. */
const path = require('path');
const ORDER = ['−', '×', '× 10^', '/', 'a/b', '^', 'xⁿ', '√', 'π', '.', '(', ')', '=', '<', '≤', '≥', '>'];
/* the symbols an answer uses, as keypad keys — written here apart from kit/keyset.js on purpose */
function symbols(t) {
  t = String(t); const s = new Set();
  if (/[-−–]/.test(t)) s.add('−');
  if (/[×*·]/.test(t) || /\d\s*x\s*\d/.test(t)) s.add('×');
  if (t.indexOf('/') >= 0) { s.add('/'); s.add('a/b'); }
  if (/\^/.test(t) || /[⁰¹²³⁴⁵⁶⁷⁸⁹ⁿ]/.test(t)) s.add('^');
  if (/√|sqrt/i.test(t)) s.add('√');
  if (/π|\bpi\b/i.test(t)) s.add('π');
  if (t.indexOf('.') >= 0) s.add('.');
  if (/[()]/.test(t)) { s.add('('); s.add(')'); }
  if (t.replace(/<=|>=|==|!=/g, '').indexOf('=') >= 0) s.add('=');
  if (/[<>≤≥]/.test(t)) ['<', '≤', '≥', '>'].forEach(k => s.add(k));
  return s;
}
const WIDTHS = [320, 360, 390, 412, 768];

module.exports = async function partO(b, url, U, dir, fail) {
  try { await run(b, url, U, dir, fail); } catch (e) { fail('O: the check stopped: ' + String(e && e.message || e).split('\n')[0]); }
};
async function run(b, url, U, dir, fail) {
  const teacher = /^teacher$/.test(path.basename(dir)), F = m => fail('O' + (teacher ? ' (teacher copy)' : '') + ': ' + m);
  /* the practice test's answers */
  const want = new Set();
  for (let s = 1; s <= 1500; s++) U.generate(s).sections.forEach(sec => sec.items.forEach(it => {
    (it.type === 'parts' ? it.parts : it.type === 'solo' ? [it.part] : []).forEach(p => { if (!p || p.kind === 'mc' || p.kind === 'nline') return; let k; try { k = U.keyText(p); } catch (e) { return; } if (k != null) symbols(k).forEach(x => want.add(x)); }); }));
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }), p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(url + '#set-1'); await p.waitForTimeout(200);
  const bank = await p.evaluate(() => { const B = window.CADENCE_BANK; if (!B) return null; const out = [];
    Object.keys(B.lessons).forEach(l => B.lessons[l].items.forEach(it => ((it.answer || {}).parts || []).forEach((q, i) => { if (q && typeof q.key === 'string' && q.type !== 'select' && q.type !== 'nline') out.push({ id: it.id, lesson: l, i, n: it.answer.parts.length, key: q.key, type: q.type }); })));
    return { keys: out, set: window.KIT_KEYSET || null, scopes: window.Kit && Kit.Bank ? Kit.Bank.keys().map(k => [k, Kit.Bank._scopes[k].lessons]) : [] }; });
  if (!bank) { await ctx.close(); console.log('O. the keypad: no lesson items'); return; }
  bank.keys.forEach(k => symbols(k.key).forEach(x => want.add(x)));
  const KNOWN = ['−', '×', '/', 'a/b', '^', '√', 'π', '.', '(', ')', '=', '<', '≤', '≥', '>'];
  const wantAll = ORDER.filter(k => want.has(k) && KNOWN.indexOf(k) >= 0), wantList = wantAll.filter(k => k !== '.');   /* the decimal point is no lesson item's key */
  if (JSON.stringify(bank.set) !== JSON.stringify(wantAll)) F('the page\'s KIT_KEYSET is ' + JSON.stringify(bank.set) + '; the unit\'s answers use ' + JSON.stringify(wantAll));
  /* a practice-test key is one an answer of the unit uses ("× 10^" both × and ^, "xⁿ" a power); a key the list does not know is kept */
  const usedKey = k => (k === '× 10^' ? ['×', '^'] : k === 'xⁿ' ? ['^'] : [k]).every(x => KNOWN.indexOf(x) < 0 || want.has(x));
  /* a lesson item's box: the one item whose key uses the most of the unit's keys (an inequality where there is one) */
  const scopeOf = lesson => (bank.scopes.find(s => s[1].indexOf(lesson) >= 0) || [])[0];
  const pick = bank.keys.filter(k => k.n === 1 && scopeOf(k.lesson)).sort((x, y) => symbols(y.key).size - symbols(x.key).size || (/[<>≤≥]/.test(y.key) ? 1 : 0) - (/[<>≤≥]/.test(x.key) ? 1 : 0))[0];
  const look = () => p.evaluate(() => { const k = document.querySelector('.keys'), a = document.activeElement; if (!k || k.hidden || !k.offsetParent || !a || a.tagName !== 'INPUT') return null;
    const rows = [...k.querySelectorAll('.krow')].map(r => [...r.children].filter(b => !b.hidden && b.offsetParent)).filter(r => r.length);
    const R = e => e.getBoundingClientRect(), row = a.closest('.ans') || a.parentNode, kr = R(k), ir = R(a), rr = R(row);
    let gaps = [];
    rows.forEach(r => r.forEach((b, i) => { if (i) gaps.push([b.dataset.g !== r[i - 1].dataset.g, Math.round(R(b).left - R(r[i - 1]).right)]); }));
    return { rows: rows.map(r => r.map(b => b.dataset.k)), w: rows.flat().map(b => [b.dataset.k, Math.round(R(b).width * 10) / 10, Math.round(R(b).height * 10) / 10, b.dataset.g]),
      right: Math.max(...rows.flat().map(b => R(b).right)), left: Math.min(...rows.flat().map(b => R(b).left)), il: ir.left, ir: ir.right, rr: Math.max(rr.right, ir.right), gaps,
      tops: rows.map(r => Math.round(R(r[0]).top)), sw: document.documentElement.scrollWidth, vw: innerWidth, oneRow: rows.flat().reduce((s, b, i, all) => s + R(b).width + (i ? (b.dataset.g !== all[i - 1].dataset.g ? 14 : 6) : 0), 0) }; });
  const fixed = {};
  const judge = (L, where) => {
    if (!L) { F(where + ': no keypad'); return; }
    const sz = L.rows.map(r => r.length);
    if (sz.some((n, i) => i && n > sz[i - 1]) || Math.max(...sz) - Math.min(...sz) > 1) F(where + ': ragged rows ' + JSON.stringify(L.rows));
    if (L.oneRow <= L.rr - L.il + 0.5 && sz.length > 1) F(where + ': ' + sz.length + ' rows where one fits (' + Math.round(L.oneRow) + ' of ' + Math.round(L.rr - L.il) + ' px)');
    if (sz.length > 1) { /* as few rows as fit: one row fewer, split evenly, does not fit */
      const r = sz.length - 1, n = L.w.length, q = Math.floor(n / r), ex = n % r; let a = 0, fitsFewer = true;
      for (let j = 0; j < r; j++) { const m = q + (j < ex ? 1 : 0); let s = 0; for (let i = a; i < a + m; i++) s += L.w[i][1] + (i > a ? (L.w[i][3] !== L.w[i - 1][3] ? 14 : 6) : 0); a += m; if (s > L.rr - L.il + 0.5) fitsFewer = false; }
      if (fitsFewer) F(where + ': ' + sz.length + ' rows where ' + r + ' even rows fit: ' + JSON.stringify(L.rows)); }
    if (Math.abs(L.left - L.il) > 1) F(where + ': the keys start at ' + Math.round(L.left) + ', the box at ' + Math.round(L.il));
    if (L.right > L.rr + 0.5) F(where + ': the keys run past the box\'s row (' + Math.round(L.right) + ' > ' + Math.round(L.rr) + ')');
    if (L.sw > L.vw + 1) F(where + ': the page scrolls sideways (' + L.sw + ')');
    L.w.forEach(([k, w, h]) => { if (h !== 44 || (k.length <= 3 && w !== 44)) F(where + ': the "' + k + '" key is ' + w + ' × ' + h + ', not 44 × 44');
      if (fixed[k] == null) fixed[k] = w; else if (Math.abs(fixed[k] - w) > 0.5) F(where + ': the "' + k + '" key is ' + w + ' px here and ' + fixed[k] + ' px elsewhere — stretched'); });
    const flat = L.rows.flat(), rank = k => { const i = ORDER.indexOf(k); return i < 0 ? ORDER.indexOf('(') - 0.5 : i; };
    if (flat.some((k, i) => i && rank(k) < rank(flat[i - 1]))) F(where + ': the keys are not in the keypad\'s order: ' + flat.join(' '));
    L.gaps.forEach(([between, g]) => { if (between ? g < 12 : (g < 5 || g > 7)) F(where + ': a gap of ' + g + ' px ' + (between ? 'between the two groups' : 'between two keys')); });
  };
  let typedOk = '';
  if (!pick) F('no lesson item with a typed answer');
  else {
    const scope = scopeOf(pick.lesson);
    await p.evaluate(([pre, k, v]) => { try { localStorage.clear(); localStorage.setItem(pre + 'bank.sets', JSON.stringify({ [k]: v })); } catch (e) {} }, [U.id + '.', scope + '|33', [pick.id]]);
    await p.goto(url + '#set-33-' + scope); await p.reload(); await p.waitForTimeout(300);
    const id = await p.evaluate(() => { const h = document.querySelector('#paper [data-host]'); return h && h.dataset.host; });
    const focusBox = async () => { await p.evaluate(id => { const e = document.getElementById('a' + id); e.scrollIntoView({ block: 'center' }); e.blur(); e.focus(); }, id); await p.waitForTimeout(80); };
    await focusBox(); let L = await look();
    const shown = L ? L.rows.flat() : [];
    if (wantList.length && JSON.stringify(shown) !== JSON.stringify(wantList)) F('a lesson item\'s keypad (' + pick.id + ') is ' + JSON.stringify(shown) + ', not the unit\'s keys ' + JSON.stringify(wantList));
    if (!wantList.length && L) F('the unit\'s answers use no keypad key, yet a lesson item shows ' + JSON.stringify(shown));
    if (want.has('<') && ['<', '≤', '≥', '>'].some(k => shown.indexOf(k) < 0)) F('the unit has inequalities, and a lesson item\'s keypad has ' + shown.join(' '));
    if (wantList.length) {
      for (const w of WIDTHS) { await p.setViewportSize({ width: w, height: 844 }); await p.waitForTimeout(120); judge(await look(), 'a lesson item\'s box at ' + w + ' px'); }
      await p.setViewportSize({ width: 390, height: 844 }); await focusBox(); judge(await look(), 'a lesson item\'s box at 390 px, focused');
      /* typing through the keypad: the key, its symbols tapped */
      const tight = String(pick.key).replace(/\s*([<>≤≥=+−\-×*\/^()])\s*/g, '$1').replace(/\s+/g, ' ').trim().replace('<=', '≤').replace('>=', '≥');   /* no space beside a sign; a mixed number's space kept */
      const tap = { '-': '−', '−': '−', '*': '×', '×': '×', '/': '/', '^': '^', '√': '√', 'π': 'π', '(': '(', ')': ')', '=': '=', '<': '<', '≤': '≤', '≥': '≥', '>': '>' };
      await p.fill('#a' + id, ''); await focusBox(); let tapped = 0;
      for (const ch of tight) { const kk = tap[ch]; if (kk && shown.indexOf(kk) >= 0) { await p.tap('.keys button[data-k="' + kk + '"]:not([hidden])'); tapped++; } else await p.keyboard.type(ch); }
      const typed = await p.$eval('#a' + id, e => e.value), norm = s => s.replace(/−/g, '-').replace(/\*/g, '×');
      if (norm(typed) !== norm(tight)) F('typed through the keypad "' + typed + '", not "' + tight + '"');
      await p.evaluate(id => document.querySelector('[data-check="' + id + '"]').click(), id); await p.waitForTimeout(80);
      const ok = await p.evaluate(id => { const h = document.querySelector('[data-host="' + id + '"]'); return h.classList.contains('is-right') && /first try/.test(h.querySelector('.fb').textContent); }, id);
      if (!ok) F('"' + typed + '" typed through the keypad for ' + pick.id + ' (key "' + pick.key + '") is not ✓ first try: ' + (await p.$eval('#fb' + id, e => e.textContent).catch(() => '')).slice(0, 120));
      else typedOk = '"' + typed + '" (' + tapped + ' key' + (tapped === 1 ? '' : 's') + ' tapped) ✓';
    }
  }
  /* a practice-test box with keys, at every width */
  let native = 0;
  await p.setViewportSize({ width: 390, height: 844 }); await p.goto(url + '#set-4821'); await p.reload(); await p.waitForTimeout(250);
  const ids = await p.$$eval('#paper input[type=text]', es => es.map(e => e.id));
  for (const aid of ids) {
    await p.evaluate(aid => { const e = document.getElementById(aid); e.scrollIntoView({ block: 'center' }); e.focus(); }, aid); await p.waitForTimeout(60);
    const L0 = await look(); if (!L0) continue;
    native++;
    L0.rows.flat().forEach(k => { if (!usedKey(k)) F('the practice test\'s ' + aid + ' shows "' + k + '", which no answer of the unit uses'); });
    for (const w of WIDTHS) { await p.setViewportSize({ width: w, height: 844 }); await p.waitForTimeout(120); judge(await look(), 'the practice test\'s ' + aid + ' at ' + w + ' px'); }
    await p.setViewportSize({ width: 390, height: 844 }); if (native >= 2) break;
  }
  if ((U.keypad || []).length && !native) F('the unit has a keypad, and no practice-test box on set 4821 shows it');
  if (errs.length) F('page errors: ' + errs.slice(0, 3).join(' | '));
  await ctx.close();
  console.log('O. the keypad' + (teacher ? ' (teacher copy)' : '') + ': the unit\'s keys ' + (wantAll.join(' ') || 'none') + '; even rows at ' + WIDTHS.join(', ') + ' px on a lesson item' + (native ? ' and ' + native + ' practice-test boxes' : '') + (typedOk ? '; ' + typedOk : ''));
}
