/* Practice-test kit — a unit's lesson bank from Cadence, checked (7 Nov 2026).   NODE_PATH=$(npm root -g) node bank.js <unit folder>
   run.py runs it after page.js on a unit with a bank/ (Windmill tools/cadence_bank.py). It fails on any of:
   A. the bank: BANK.sha256 matches; every item has an id, a lesson, a stem, a solution and an answer of a known kind whose key
      fits its choices or parts; ids are unique; every `cadence` lesson has at least 20 items;
   B. the map: every lesson code of the unit on the plan (the course's own copy of Windmill's spine, build/assets/windmill/
      spine.js) is in map.json, `cadence` with its Cadence lessons (each in the bank) or `whole-unit` with a reason;
   C. in a real browser at 390 × 844 (a phone), light and dark: every item of every lesson choice drawn on the page — no page
      error, no console error, no request off the page, no sideways scroll, every TeX run drawn by KaTeX (none fallen back),
      a figure wherever the item has one (in the page, at least 60 px wide, inside its box, light-on-dark in the dark theme),
      the card's ID "U9·L3·7";
   D. answers through the page: 30 items at random (seeded) — the key typed into the box (or the keyed choices ticked) and
      Check pressed is ✓ on the first try; a wrong number is not; the help ladder opens its three rungs and Hint 3 is
      Cadence's worked solution; "Try a similar one" mounts another item of the same lesson; the end panel offers "Another set
      from this lesson" and "The whole practice test";
   E. print: the worksheet and its key keep every card's ID;
   F. on a touch screen a lesson item's keypad has = < ≤ ≥ > (44 px keys, two rows at 390 px), "<" goes in at the caret, and
      an inequality's key typed without spaces with its sign tapped ("c<-16.5" for U10·L4·58) is ✓ first try.
   The page is set to a chosen set of items through the device's own memory (bank.js remembers a set's items per device), so
   every item can be drawn without anything on the page that is there for the check. */
const path = require('path'), fs = require('fs'), crypto = require('crypto');
const { chromium } = require('playwright');
const dir = path.resolve(process.argv[2] || '.');
const bankDir = [path.join(dir, 'bank'), path.join(dir, '..', 'bank')].find(d => fs.existsSync(path.join(d, 'cadence.json')));
const fails = []; const fail = m => { fails.push(m); if (fails.length < 60) console.log('  FAIL ' + m); };
if (!bankDir) { console.log('bank: no bank/ — nothing to check'); process.exit(0); }
const cfg = JSON.parse(fs.readFileSync(path.join(dir, 'unit.json'), 'utf8'));
const raw = f => fs.readFileSync(path.join(bankDir, f));
const BANK = JSON.parse(raw('cadence.json')), MAP = JSON.parse(raw('map.json'));
const U = require(path.join(dir, 'unit.js'));
/* a graph to build (kit kind nline, 7 Nov 2026): its line read from Cadence's figure, the boundary on one of its ticks */
const NLK = require('../nline.js');
const nlOk = p => { if (!p.line || !p.graph || typeof p.graph.closed !== 'boolean' || !['left', 'right'].includes(p.graph.dir)) return false; const S = NLK.spec(p); return S.n >= 4 && S.st > 0 && NLK.idx(S, p.graph.c) >= 0; };
const hasNl = x => !!(x.answer && x.answer.parts && x.answer.parts.some(p => p.type === 'nline'));

/* ---------------------------------------------------------------- A. the bank */
const want = {}; raw('BANK.sha256').toString().split('\n').filter(Boolean).forEach(l => { const [h, f] = l.trim().split(/\s+/); want[f] = h; });
['cadence.json', 'map.json'].forEach(f => { if (crypto.createHash('sha256').update(raw(f)).digest('hex') !== want[f]) fail('A: ' + f + ' does not match BANK.sha256'); });
const ids = new Set(); let nItems = 0;
const seg = s => Array.isArray(s) && s.every(g => typeof g === 'string' || (Array.isArray(g) && typeof g[0] === 'string'));
Object.entries(BANK.lessons).forEach(([lid, L]) => {
  if (!Array.isArray(L.items)) return fail('A: lesson ' + lid + ' has no items');
  L.items.forEach((b, k) => { nItems++;
    const w = 'A: ' + lid + ' item ' + (k + 1) + ' (' + b.id + ')';
    if (!b.id || ids.has(b.id)) fail(w + ': no id, or not unique'); ids.add(b.id);
    if (b.lesson !== lid) fail(w + ': lesson ' + b.lesson);
    if (!seg(b.stem) || !b.stem.length) fail(w + ': no stem');
    if (!Array.isArray(b.solution) || !b.solution.length || !b.solution.every(seg)) fail(w + ': no worked solution');
    if (b.fig && !/^<svg[\s\S]*<\/svg>$/.test(b.fig)) fail(w + ': the figure is not an SVG');
    if (/<script|\son\w+\s*=|javascript:|https?:\/\//i.test(JSON.stringify([b.stem, b.fig || '', b.choices || []]))) fail(w + ': markup that runs or loads something');
    const A = b.answer || {};
    if (A.kind === 'choice') { if (!(b.choices && b.choices[A.key])) fail(w + ': the key is not a choice'); }
    else if (A.kind === 'multi') { if (!(b.choices && A.key.length >= 2 && A.key.every(k => b.choices[k]))) fail(w + ': a select-all key outside its choices'); }
    else if (A.kind === 'match') { if (!(b.rows && b.cols && A.key.length === b.rows.length && A.key.every(k => b.cols[k]))) fail(w + ': a matching key outside its grid'); }
    else if (A.kind === 'free') { if (!(A.parts && A.parts.length) || A.parts.some(p => p.type === 'select' ? !(p.optsS && p.optsS[p.key]) : p.type === 'nline' ? !nlOk(p) : !(p.key && seg(p.keyS) && ['number', 'expression', 'equation', 'inequality', 'sci'].includes(p.type)))) fail(w + ': a part without a key of a known type'); }
    else fail(w + ': answer kind ' + A.kind);
  });
});

/* ---------------------------------------------------------------- B. the map against the plan */
const spineFile = [path.join(dir, '..', '..', 'build', 'assets', 'windmill', 'spine.js'), path.join(dir, '..', '..', '..', 'build', 'assets', 'windmill', 'spine.js')].find(f => fs.existsSync(f));
const unitNo = BANK.unit, spineKey = BANK.course === 'a7' ? 'acc' : 'on';
if (!spineFile) fail('B: no build/assets/windmill/spine.js to read the plan from');
else {
  const S = JSON.parse(fs.readFileSync(spineFile, 'utf8').replace(/^[\s\S]*?=\s*/, '').replace(/;\s*$/, ''));
  const codes = new Set();
  Object.values(S.days).forEach(v => { const e = v && v[spineKey]; if (e && e.unit === unitNo && e.code && !['extra', 'spiral', 'off', 'flex'].includes(e.code)) codes.add(e.code); });
  codes.forEach(c => { const r = MAP.lessons[c];
    if (!r) return fail('B: plan code ' + c + ' is not in map.json');
    if (r.status === 'cadence') { if (!(r.cadence && r.cadence.length && r.cadence.every(l => BANK.lessons[l] && BANK.lessons[l].items.length >= 20))) fail('B: ' + c + ' is cadence but a lesson of it is missing or under 20 items'); }
    else if (r.status === 'whole-unit') { if (!r.reason) fail('B: ' + c + ' is whole-unit without a reason'); }
    else fail('B: ' + c + ' has status ' + r.status); });
  Object.keys(MAP.lessons).forEach(c => { if (!codes.has(c)) fail('B: map.json has ' + c + ', which the plan does not'); });
}
Object.entries(MAP.lessons).forEach(([c, r]) => { if (r.status === 'cadence') (r.cadence || []).forEach(l => { if ((BANK.lessons[l] || {items: []}).items.length < 20) fail('A: lesson ' + l + ' (' + c + ') has fewer than 20 items'); }); });
console.log('bank: ' + nItems + ' items in ' + Object.keys(BANK.lessons).length + ' lessons; ' + Object.values(MAP.lessons).filter(r => r.status === 'cadence').length + ' plan codes from Cadence, ' + Object.values(MAP.lessons).filter(r => r.status !== 'cadence').length + ' the whole test');

/* ---------------------------------------------------------------- C–E. in the browser */
const http = require('http');
const server = http.createServer((q, r) => { let f = path.join(dir, decodeURIComponent(q.url.split('?')[0].split('#')[0])); if (!f.startsWith(dir) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); fs.createReadStream(f).pipe(r); });
let url = '';
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
/* a set of the given items for a lesson choice, through the device's memory; returns the page */
async function open(ctx, scope, seed, itemIds) {
  const p = await ctx.newPage(), errs = [];
  p.on('pageerror', e => errs.push('page error: ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  p.on('request', r => { if (!r.url().startsWith(url.replace(/\/[^/]*$/, '')) && !r.url().startsWith('data:')) errs.push('request off the page: ' + r.url()); });
  await p.goto(url + '#set-1');
  await p.evaluate(([pre, k, v]) => { try { localStorage.clear(); localStorage.setItem(pre + 'bank.sets', JSON.stringify({[k]: v})); } catch (e) {} }, [U.id + '.', scope + '|' + seed, itemIds]);
  await p.goto(url + '#set-' + seed + '-' + scope); await p.reload(); await p.waitForTimeout(250);
  await p.waitForFunction(() => !document.querySelector('.m[data-tex]:not([data-tex-fallback])') || [...document.querySelectorAll('.m[data-tex]')].every(m => m.shadowRoot), null, { timeout: 15000 }).catch(() => {});
  p._errs = errs; return p;
}
const scopesOf = () => { const out = []; MAP.order.forEach(c => { const r = MAP.lessons[c]; if (r.status === 'cadence' && r.cadence) r.cadence.forEach(l => { if (!out.some(o => o.lid === l)) out.push({ code: c, lid: l }); }); }); return out; };

(async () => {
  await new Promise(res => server.listen(0, '127.0.0.1', res)); url = 'http://127.0.0.1:' + server.address().port + '/preview.html';
  const b = await chromium.launch();
  const scopeKeys = await (async () => { const ctx = await b.newContext(); const p = await ctx.newPage(); await p.goto(url); const k = await p.evaluate(() => Kit.Bank ? Kit.Bank.keys().map(k => [k, Kit.Bank._scopes[k].lessons]) : []); await ctx.close(); return k; })();
  if (!scopeKeys.length) fail('C: the page has no lesson choices (was it built with the bank?)');
  const scopeFor = lid => (scopeKeys.find(([k, ls]) => ls.length === 1 && ls[0] === lid) || scopeKeys.find(([k, ls]) => ls.includes(lid)) || [null])[0];
  /* C: every item, light and dark */
  let drawn = 0, figs = 0, nls = 0;
  for (const scheme of ['light', 'dark']) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, colorScheme: scheme });
    for (const { lid } of scopesOf()) {
      const sc = scopeFor(lid); if (!sc) { fail('C: no lesson choice draws ' + lid); continue; }
      const L = BANK.lessons[lid], ids = L.items.map(x => x.id);
      const p = await open(ctx, sc, 777, ids);
      const r = await p.evaluate(([n]) => {
        const cards = [...document.querySelectorAll('#paper .q[data-q]:not(.xq)')], out = { cards: cards.length, ids: [], bad: [] };
        out.sw = document.documentElement.scrollWidth; out.fb = document.querySelectorAll('[data-tex-fallback]').length;
        out.unpainted = [...document.querySelectorAll('.m[data-tex]')].filter(m => !m.shadowRoot).length;
        cards.forEach(c => { const q = c.querySelector('.qid .qn'); out.ids.push(q ? q.textContent : '');
          if (c.querySelector(':scope .nlw svg.nlg')) out.ids[out.ids.length - 1] += '|nl';
          const f = c.querySelector(':scope > .bkfig svg'); if (f) { const r = f.getBoundingClientRect(), box = f.closest('.bkfig').getBoundingClientRect();
            out.ids[out.ids.length - 1] += '|fig'; if (r.width < 60 || r.height < 20) out.bad.push(q.textContent + ' figure ' + Math.round(r.width) + '×' + Math.round(r.height));
            if (box.right > document.documentElement.clientWidth + 1) out.bad.push(q.textContent + ' figure box past the page');
            out.filter = getComputedStyle(f).filter; } });
        return out;
      }, [ids.length]);
      drawn += r.cards;
      if (r.cards !== ids.length) fail(`C ${scheme}: ${lid}: ${r.cards} cards drawn of ${ids.length}`);
      if (r.sw > 390) fail(`C ${scheme}: ${lid}: the page scrolls sideways (${r.sw} px)`);
      if (r.fb || r.unpainted) fail(`C ${scheme}: ${lid}: ${r.fb} TeX runs fell back, ${r.unpainted} not drawn`);
      r.bad.forEach(x => fail(`C ${scheme}: ${lid}: ${x}`));
      L.items.forEach((x, k) => { const got = r.ids.find(s => s.split('|')[0] === idOf(x)); if (!got) return fail(`C ${scheme}: ${lid}: no card with ID ${idOf(x)}`);
        if (hasNl(x)) { if (!/\|nl/.test(got) || /\|fig/.test(got)) fail(`C ${scheme}: ${lid}: ${idOf(x)} is a graph to build: ${/\|nl/.test(got) ? 'Cadence\'s blank line is drawn too' : 'no number line to build on'}`); else nls++; }
        else if (!!x.fig !== /\|fig/.test(got)) fail(`C ${scheme}: ${lid}: ${idOf(x)} figure ${x.fig ? 'missing' : 'unexpected'}`); else if (x.fig) figs++; });
      if (scheme === 'dark' && L.items.some(x => x.fig && !hasNl(x)) && !/invert/.test(r.filter || '')) fail(`C dark: ${lid}: the figures are not drawn light on dark`);
      p._errs.forEach(e => fail(`C ${scheme}: ${lid}: ${e}`));
      await p.close();
    }
    await ctx.close();
  }
  console.log('bank: drawn ' + drawn + ' cards (light and dark), ' + figs + ' figures, ' + nls + ' graphs to build');
  /* D: 30 items through the page */
  const R = rng(4243 + unitNo), all = []; Object.values(BANK.lessons).forEach(L => L.items.forEach(x => all.push(x)));
  const pick = []; while (pick.length < Math.min(30, all.length)) { const x = all[Math.floor(R() * all.length)]; if (!pick.includes(x) && scopeFor(x.lesson)) pick.push(x); }
  const byLesson = {};
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  let typed = 0, nlBuilt = 0, ladder = false, similar = false, end = false;
  /* graphs to build are among them: six of a bank's, answered through the page */
  all.filter(hasNl).slice(0, 6).forEach(x => { if (!pick.includes(x) && scopeFor(x.lesson)) pick.push(x); });
  pick.forEach(x => (byLesson[x.lesson] = byLesson[x.lesson] || []).push(x));
  for (const [lid, xs] of Object.entries(byLesson)) {
    const sc = scopeFor(lid), p = await open(ctx, sc, 31, xs.map(x => x.id));
    /* the key per box: from the bank, by card ID and part */
    const plan = await p.evaluate(() => {
      const out = []; document.querySelectorAll('#paper .q[data-q]:not(.xq)').forEach(card => {
        const qid = (card.querySelector('.qid .qn') || {}).textContent; card.querySelectorAll('[data-host]').forEach((h, i) => out.push({ qid, id: h.dataset.host, i, text: !!document.getElementById('a' + h.dataset.host), nl: !!h.querySelector('.nlw'), multi: !!h.querySelector('input[type=checkbox]') })); });
      return out; });
    for (const s of plan) {
      const x = xs.find(y => idOf(y) === s.qid); if (!x) { fail('D: ' + lid + ': no item for card ' + s.qid); continue; }
      const A = x.answer;
      let ok;
      if (s.nl) { const part = A.kind === 'free' ? A.parts[partIndex(s.id)] : null; if (!part || part.type !== 'nline') { fail('D: ' + s.qid + ': a number line with no graph key'); continue; }
        const Sp = NLK.spec(part), i = NLK.idx(Sp, part.graph.c);
        await p.focus('#nlp' + s.id); await p.keyboard.press('Home'); for (let k = 0; k < i; k++) await p.keyboard.press('ArrowRight');
        await p.click('[data-nl="' + s.id + '"][data-nld="' + (part.graph.closed ? 'closed' : 'open') + '"]'); await p.click('[data-nl="' + s.id + '"][data-nla="' + part.graph.dir + '"]'); nlBuilt++; }
      else if (s.text) { const part = A.kind === 'free' ? A.parts[partIndex(s.id)] : null;
        const k = part && part.type !== 'select' ? String(part.key) : null; if (k == null) { fail('D: ' + s.qid + ': a box with no typed key'); continue; }
        await p.fill('#a' + s.id, k); typed++; }
      else {
        const keys = A.kind === 'choice' ? [A.key] : A.kind === 'multi' ? A.key : A.kind === 'match' ? [A.key[partIndex(s.id)]] : [A.parts[partIndex(s.id)].key];
        let missing = false;
        for (const k of keys) missing = (await p.evaluate(([q, k]) => { const i = document.querySelector('input[name="q' + q + '"][value="' + k + '"]'); if (!i) return true; i.click(); return false; }, [s.id, k])) || missing;
        if (missing) { fail('D: ' + s.qid + ' part ' + s.id + ': the keyed choice is not on the page'); continue; }
      }
      await p.evaluate(id => document.querySelector('[data-check="' + id + '"]').click(), s.id);
      ok = await p.evaluate(id => { const h = document.querySelector('[data-host="' + id + '"]'); return h.classList.contains('is-right') && /first try/.test(h.querySelector('.fb').textContent); }, s.id);
      if (!ok) fail('D: ' + s.qid + ' part ' + s.id + ': the keyed answer is not ✓ on the first try (' + (await p.evaluate(id => document.querySelector('#fb' + id).textContent, s.id)).slice(0, 120) + ')');
    }
    p._errs.forEach(e => fail('D: ' + lid + ': ' + e));
    await p.close();
  }
  /* the ladder, a similar one, a wrong number, the end panel and print: on the first lesson with a typed box */
  const solo = x => x.answer.kind === 'free' && x.answer.parts.length === 1 && x.answer.parts[0].type !== 'select';
  const x0 = all.find(x => solo(x) && scopeFor(x.lesson) && BANK.lessons[x.lesson].items.filter(solo).length > 1) || pick[0], lid0 = x0.lesson;
  { const p = await open(ctx, scopeFor(lid0), 32, [x0.id]);
    const id = await p.evaluate(() => document.querySelector('#paper [data-host]').dataset.host);
    if (x0.answer.kind === 'free' && x0.answer.parts[0].type !== 'select') {
      await p.fill('#a' + id, '987654.5'); await p.evaluate(id => document.querySelector('[data-check="' + id + '"]').click(), id);
      if (await p.evaluate(id => document.querySelector('[data-host="' + id + '"]').classList.contains('is-right'), id)) fail('D: a wrong answer was marked right');
      if (!(await p.evaluate(id => !!document.querySelector('[data-another="' + id + '"]'), id))) fail('D: no "Try a similar one" after a miss');
      else { await p.evaluate(id => document.querySelector('[data-another="' + id + '"]').click(), id);
        const sim = await p.evaluate(id => { const x = document.querySelector('#ag' + id + ' .xq'); return x ? x.textContent.length : 0; }, id);
        if (!sim) fail('D: "Try a similar one" mounted nothing'); else similar = true; }
    }
    for (const k of [1, 2, 3]) await p.evaluate(([id, k]) => { const b = document.querySelector('[data-rung="' + id + '"][data-to="' + k + '"]'); if (b) b.click(); }, [id, k]);
    const lad = await p.evaluate(id => ({ r1: !!document.getElementById('rg' + id + '-1'), r2: !!document.getElementById('rg' + id + '-2'), r3: document.querySelectorAll('#rg' + id + '-3 ol.sol li').length }), id);
    if (!lad.r1 || !lad.r2 || lad.r3 !== x0.solution.length) fail('D: the ladder: Hint 1 ' + lad.r1 + ', Hint 2 ' + lad.r2 + ', Hint 3 lines ' + lad.r3 + ' of ' + x0.solution.length); else ladder = true;
    /* print keeps the IDs */
    await p.evaluate(() => { document.getElementById('bMore').click(); document.getElementById('bPrint').click(); });
    await p.evaluate(() => { const b = document.querySelector('[data-print="wk"]'); if (b) b.click(); });
    const pr = await p.evaluate(() => ({ q: [...document.querySelectorAll('#printview .pqid .qn')].map(x => x.textContent), k: [...document.querySelectorAll('#printview td.pid')].map(x => x.textContent) }));
    if (!(pr.q.length && pr.q[0] === idOf(x0) && pr.k[0] === idOf(x0))) fail('E: print lost the ID: ' + JSON.stringify(pr));
    await p.evaluate(() => { const c = document.getElementById('pvClose'); if (c) c.click(); });
    /* the end panel in a lesson choice */
    await p.evaluate(() => document.getElementById('bFinish').click()); await p.evaluate(() => { const y = document.getElementById('cy'); if (y) y.click(); });
    const btn = await p.evaluate(() => [...document.querySelectorAll('#result .btns button')].map(b => b.textContent));
    if (!(btn.includes('Another set from this lesson') && btn.includes('The whole practice test'))) fail('D: the end panel offers ' + JSON.stringify(btn)); else end = true;
    p._errs.forEach(e => fail('D: ' + e));
    await p.close(); }
  /* F. the keypad of a lesson item on a touch screen (7 Nov 2026, Croix on his phone at U10·L4·58 "c/−5 > 3.3": "I can't
     answer that" — the keys had ≤ ≥ but no < or >). Since 8 Nov 2026 (Croix: "Can you fix the symbols across everything so that
     they are even looking not like stretching across the screen. It's sloppy.") a lesson item's keys are the unit's (kit/keyset.js,
     the page's KIT_KEYSET; check/keys_page.js works them out again): exactly those, 44 px, in even rows at 390 px; a key taps in
     at the caret; and where the unit has them, an inequality's (or an equation's) key typed with its sign tapped from the keypad
     is ✓ first try (= < ≤ ≥ > are on the keypad of a unit with inequalities) */
  let kpad = '';
  { const one = x => x.answer.kind === 'free' && x.answer.parts.length === 1 && scopeFor(x.lesson);
    const rel = x => (/(<=|>=|≤|≥|<|>|=)/.exec(String(x.answer.parts[0].key)) || [])[1];
    const xk = all.find(x => x.id === '73ae9fb22b' && one(x)) || all.find(x => one(x) && x.answer.parts[0].type === 'inequality' && rel(x) === '<') || all.find(x => one(x) && x.answer.parts[0].type === 'inequality')
      || all.find(x => one(x) && x.answer.parts[0].type === 'equation') || all.find(x => one(x) && x.answer.parts[0].type !== 'select');
    if (xk) { const p = await open(ctx, scopeFor(xk.lesson), 33, [xk.id]);
      if (!(await p.evaluate(() => matchMedia('(pointer: coarse)').matches))) fail('F: the touch context is not pointer: coarse');
      const id = await p.evaluate(() => document.querySelector('#paper [data-host]').dataset.host);
      await p.evaluate(id => { const e = document.getElementById('a' + id); e.scrollIntoView({ block: 'center' }); e.focus(); }, id); await p.waitForTimeout(60);
      const k = await p.evaluate(() => { const kk = document.querySelector('.keys'); if (!kk || kk.hidden || !kk.offsetParent) return null;
        const v = [...kk.querySelectorAll('button')].filter(b => !b.hidden && b.offsetParent), rows = {};
        v.forEach(b => { const t = Math.round(b.getBoundingClientRect().top); rows[t] = (rows[t] || 0) + 1; });
        return { labels: v.map(b => b.dataset.k), small: v.filter(b => b.getBoundingClientRect().width < 44 || b.getBoundingClientRect().height < 44).length,
          rows: Object.keys(rows).sort((a, b) => a - b).map(t => rows[t]), sw: document.documentElement.scrollWidth, set: window.KIT_KEYSET || null }; });
      const set = await p.evaluate(() => window.KIT_KEYSET ? window.KIT_KEYSET.filter(k => k !== '.') : null);   /* the decimal point is no lesson item's key */
      if (!set) fail('F: the page has no KIT_KEYSET (the unit\'s keys, build.py)');
      else if (!set.length) { if (k) fail('F: the unit\'s answers use no keypad key, yet ' + idOf(xk) + ' shows ' + k.labels.join(' ')); else kpad = '(none: the unit\'s answers need no keypad key)'; }
      else if (!k) fail('F: no keypad on ' + idOf(xk) + ' on a touch screen');
      else { kpad = k.labels.join(' ');
        if (JSON.stringify([...k.labels].sort()) !== JSON.stringify([...set].sort())) fail('F: the keypad of ' + idOf(xk) + ' is ' + kpad + ', not the unit\'s keys ' + set.join(' '));
        if (set.indexOf('<') >= 0) ['=', '<', '≤', '≥', '>'].forEach(l => { if (set.indexOf(l) >= 0 && k.labels.indexOf(l) < 0) fail('F: the keypad of ' + idOf(xk) + ' has no "' + l + '" (' + kpad + ')'); });
        if (k.labels.indexOf('<') > k.labels.indexOf('≤') || k.labels.indexOf('≥') > k.labels.indexOf('>')) fail('F: the keys are not in the order < ≤ ≥ > (' + kpad + ')');
        if (k.small) fail('F: ' + k.small + ' keys under 44 px'); if (Math.max(...k.rows) - Math.min(...k.rows) > 1 || k.rows.some((n, i) => i && n > k.rows[i - 1])) fail('F: the keypad\'s rows are uneven at 390 px: ' + k.rows.join(' + ')); if (k.sw > 390) fail('F: the keypad makes the page scroll sideways (' + k.sw + ' px)');
        const lab = k.labels.find(l => l !== 'a/b'), ins = lab === '−' ? '-' : lab === '×' ? '*' : lab;
        if (lab) { await p.evaluate(id => { const e = document.getElementById('a' + id); e.value = 'ab'; e.setSelectionRange(1, 1); }, id);
          await p.click('.keys button[data-k="' + lab + '"]:not([hidden])'); const got = await p.$eval('#a' + id, e => [e.value, e.selectionStart, document.activeElement === e]);
          if (got[0] !== 'a' + ins + 'b' || got[1] !== 1 + ins.length || !got[2]) fail('F: "' + lab + '" at the caret gave ' + JSON.stringify(got) + ', not ' + JSON.stringify(['a' + ins + 'b', 1 + ins.length, true])); }
        /* the key without its spaces ("c<-16.5"), its sign tapped from the keypad */
        const key = String(xk.answer.parts[0].key), r = rel(xk), tight = key.replace(/\s+/g, '').replace('<=', '≤').replace('>=', '≥');
        if (r && set.indexOf(r === '<=' ? '≤' : r === '>=' ? '≥' : r) >= 0) { const sign = r === '<=' ? '≤' : r === '>=' ? '≥' : r, at = tight.indexOf(sign);
          await p.fill('#a' + id, tight.slice(0, at)); await p.evaluate(id => { const e = document.getElementById('a' + id); e.setSelectionRange(e.value.length, e.value.length); }, id);
          await p.click('.keys button[data-k="' + sign + '"]:not([hidden])'); await p.type('#a' + id, tight.slice(at + 1));
          const typed = await p.$eval('#a' + id, e => e.value); if (typed !== tight) fail('F: typed "' + typed + '", not "' + tight + '"');
          await p.evaluate(id => document.querySelector('[data-check="' + id + '"]').click(), id);
          const ok = await p.evaluate(id => { const h = document.querySelector('[data-host="' + id + '"]'); return h.classList.contains('is-right') && /first try/.test(h.querySelector('.fb').textContent); }, id);
          if (!ok) fail('F: "' + tight + '" for ' + idOf(xk) + ' (key "' + key + '") is not ✓ first try: ' + (await p.$eval('#fb' + id, e => e.textContent)).slice(0, 120));
          else kpad += '; ' + idOf(xk) + ' "' + tight + '" ✓'; } }
      p._errs.forEach(e => fail('F: ' + e)); await p.close(); } }
  await ctx.close(); await b.close(); server.close();
  if (kpad) console.log('bank: keypad ' + kpad);
  console.log('bank: ' + pick.length + ' items answered through the page (' + typed + ' typed boxes, ' + nlBuilt + ' graphs built); ladder ' + ladder + ', similar ' + similar + ', end panel ' + end);
  if (fails.length) { console.log('BANK CHECK FAILED: ' + fails.length); process.exit(1); }
  console.log('BANK CHECK PASSED');
})().catch(e => { console.error(e); process.exit(1); });

function idOf(x) { const m = /^(\d+)\.(\d+)$/.exec(x.lesson); const n = BANK.lessons[x.lesson].items.indexOf(x) + 1; return 'U' + unitNo + '·L' + (m && +m[1] === unitNo ? m[2] : x.lesson) + '·' + n; }
function partIndex(hostId) { const m = /([a-h])$/.exec(hostId); return m ? 'abcdefgh'.indexOf(m[1]) : 0; }
