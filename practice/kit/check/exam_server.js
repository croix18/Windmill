/* Practice-test kit: the site's verdicts are the page's own (exam/server.js, 15 Nov 2026).
     NODE_PATH=$(npm root -g) node check/exam_server.js <unit folder> [sets]      (after a build: it opens preview.html)
   In Chromium, on "Like the real test", 30 sets (or [sets]): every part answered — its key, a wrong answer, an equivalent form,
   an unreadable string or a blank, in turn — then Finish; the page's verdicts and score are read. Then in Node the page's own
   parts (Kit.items(), packed in the page with pack.js and unpacked here) are judged by exam/server.js, three parts a call, and
   every verdict and the score must be the page's. Before Finish, server.read must say "can't read" exactly where the page did,
   and give the page's preview. Last, the CPU time under Node of one grade call of three parts (cold, in a fresh process, and
   warm) and of one read, against the site's 10 ms a request. A unit that fails check/pack.js cannot be checked here. */
'use strict';
const path = require('path'), fs = require('fs'), http = require('http'), { execFileSync } = require('child_process');
const KIT = path.join(__dirname, '..');
const P = require(path.join(KIT, 'pack.js')), SV = require(path.join(KIT, 'exam', 'server.js'));
const cpu = () => { const c = process.cpuUsage(); return c.user + c.system; };

/* --cold <unit folder> <file>: a fresh process — load, then time the first grade of three parts and the first read */
if (process.argv[2] === '--cold') {
  const U = require(path.join(path.resolve(process.argv[3]), 'unit.js')), T = JSON.parse(fs.readFileSync(process.argv[4], 'utf8'));
  const items = P.unpack(T.items);
  let c0 = cpu(); SV.grade(U, items, T.ans, [], 0, 3); const g = cpu() - c0;
  const t = items.findIndex(it => it.type === 'text'); c0 = cpu(); if (t >= 0) SV.read(U, items[t], T.ans[items[t].id] == null ? '' : T.ans[items[t].id]); const r = cpu() - c0;
  process.stdout.write(JSON.stringify({ grade: g, read: r })); process.exit(0);
}

const dir = path.resolve(process.argv[2] || '.'), SETS = +process.argv[3] || 30;
const U = require(path.join(dir, 'unit.js'));
const NLK = require(path.join(KIT, 'nline.js')), CGF = require('./cgraph.js'), CG = CGF.CG;
const boxesOf = p => { try { const b = U.view && U.view.boxes ? U.view.boxes(p) : null; return Array.isArray(b) && b.length >= 2 ? b : null; } catch (e) { return null; } };
if (!fs.existsSync(path.join(dir, 'preview.html'))) { console.error('exam_server: build the page first (python3 kit/build.py . --force)'); process.exit(1); }
const server = http.createServer((q, r) => { if (/^\/api\//.test(q.url)) { r.writeHead(200, { 'Content-Type': 'application/json' }); return r.end('{"edits":[],"custom":[],"v":""}'); }
  if (/^\/teacher\/api\//.test(q.url)) { r.writeHead(200, { 'Content-Type': 'application/json' }); return r.end('{"store":false,"spec":null,"updated":null,"edits":[]}'); }
  const f = path.join(dir, 'preview.html'); r.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); fs.createReadStream(f).pipe(r); });

/* the five answers, in turn */
const VARS = ['key', 'wrong', 'equiv', 'unread', 'blank'], REL = { '=': '=', '<': '>', '>': '<', '<=': '>=', '>=': '<=', '≤': '≥', '≥': '≤' };
function eqForm(k) {            /* the key written another way (check/norm.js's forms): sides swapped, a unicode minus, 2/4 for 1/2, … */
  k = String(k); let m = /^([^=<>≤≥]+?)\s*(<=|>=|=|<|>|≤|≥)\s*([^=<>≤≥]+)$/.exec(k);
  if (m) return m[3] + ' ' + REL[m[2]] + ' ' + m[1];
  if (/^-\d/.test(k)) return '−' + k.slice(1);
  if ((m = /^(\d+)\/(\d+)$/.exec(k))) return (2 * m[1]) + '/' + (2 * m[2]);
  if (/^\d*\.\d+$/.test(k)) return k + '0';
  if (/^\d+$/.test(k)) return '+' + k;
  return /\s/.test(k) ? k.replace(/\s+/g, '') : k.replace(/-/g, '−');
}
async function nlFill(p, id, part, g, pointOnly) {
  const Sp = NLK.spec(part), i = NLK.idx(Sp, g.c);
  await p.focus('#nlp' + id); await p.keyboard.press('Home'); for (let k = 0; k < i; k++) await p.keyboard.press('ArrowRight');
  if (pointOnly) return;
  if (g.closed != null) await p.click('[data-nl="' + id + '"][data-nld="' + (g.closed ? 'closed' : 'open') + '"]');
  if (g.dir) await p.click('[data-nl="' + id + '"][data-nla="' + g.dir + '"]');
}
async function answer(p, it, vr) {
  if (vr === 'blank') return;
  const x = it.x;
  if (it.type === 'text') {
    const B = boxesOf(x), k = U.keyText(x), one = f => B ? (Array.isArray(k) ? k : [k]).map(f) : f(k);
    await p.fill('#a' + it.id, vr === 'key' ? one(String) : vr === 'wrong' ? one(() => '987654') : vr === 'equiv' ? one(eqForm) : one(() => '((3'));
    return p.evaluate(id => { const e = document.getElementById('a' + id); (e && e.hasAttribute('data-part') ? Array.from(document.querySelectorAll('[data-part="' + id + '"]')) : e ? [e] : []).forEach(b => b.dispatchEvent(new Event('change', { bubbles: true }))); }, it.id);
  }
  if (it.type === 'nline') { const g = NLK.graphOf(x), Sp = NLK.spec(x), i = NLK.idx(Sp, g.c);
    return vr === 'wrong' ? nlFill(p, it.id, x, { c: NLK.kstr(NLK.val(Sp, i < Sp.n ? i + 1 : i - 1)), closed: g.closed, dir: g.dir }) : nlFill(p, it.id, x, g, vr === 'unread'); }
  if (it.type === 'cgraph') { const k = CG.graphOf(x);
    return CGF.fill(p, it.id, x, vr === 'wrong' ? CGF.wrong(x) : vr === 'unread' ? k.map(s => ({ name: null, deg: s.deg })) : vr === 'equiv' ? k.slice().reverse() : k); }
  const n = (x.opts || x.choices || []).length || 4, C = it.type === 'multi' ? x.correct : [x.correct], bad = [];
  for (let k = 0; k < n; k++) if (C.indexOf(k) < 0) bad.push(k);
  for (const k of (vr === 'key' || vr === 'equiv' ? C : [bad[0] != null ? bad[0] : 0])) await p.evaluate(([q, k]) => { const e = document.querySelector('input[name="q' + q + '"][value="' + k + '"]'); if (e) e.click(); }, [it.id, k]);
}

const fails = []; const fail = m => { if (fails.length < 40) console.log('  FAIL ' + m); fails.push(m); };
(async () => {
  const { chromium } = require('playwright');
  await new Promise(res => server.listen(0, '127.0.0.1', res)); const url = 'http://127.0.0.1:' + server.address().port + '/preview.html';
  const b = await chromium.launch(); require('./boxes.js').wireBrowser(b);
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } }); await ctx.addInitScript(() => { window.KIT_PAGER_OFF = true; });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  const packSrc = fs.readFileSync(path.join(KIT, 'pack.js'), 'utf8');
  let parts = 0, steps = 0, warm = 0, warmN = 0, rd = 0, rdN = 0, rdMax = 0, gMax = 0, first = null; const tally = { right: 0, wrong: 0, blank: 0, unread: 0 };
  for (let s = 0; s < SETS; s++) {
    const seed = 1 + (s * 3203) % 99999;
    await p.goto(url + '#set-' + seed); await p.evaluate(() => { try { localStorage.clear(); } catch (e) {} }); await p.goto(url + '#set-' + seed); await p.reload(); await p.waitForTimeout(60);
    await p.click('.mode button[data-mode="test"]'); if (await p.isVisible('#cy')) await p.click('#cy');
    await p.addScriptTag({ content: packSrc });
    const text = await p.evaluate(() => window.Kit.pack(window.Kit.items()));
    const items = P.unpack(text);
    for (let j = 0; j < items.length; j++) await answer(p, items[j], VARS[(j + s) % 5]);
    /* before Finish: what the page says as the student types */
    const seen = await p.evaluate(ids => ids.map(id => { const r = document.getElementById('rd' + id), e = document.getElementById('a' + id);
      const pv = e && e.hasAttribute('data-part') ? Array.from(document.querySelectorAll('[data-part="' + id + '"]')).map(b => b.parentNode.querySelector('.pv').innerHTML) : e ? e.parentNode.querySelector('.pv').innerHTML : null;
      return { rd: r ? r.innerHTML : '', pv }; }), items.map(it => it.id));
    await p.click('#bFinish'); if (await p.isVisible('#cy')) await p.click('#cy'); await p.waitForTimeout(60);
    const pg = await p.evaluate(pre => { const S = JSON.parse(localStorage.getItem(pre + 'set.' + location.hash.replace(/^#set-/, '') + '.all'));
      const big = document.querySelector('#result .big b'); return { S, score: big ? big.textContent : '' }; }, U.id + '.');
    const ans = pg.S.ans || {};
    if (!first) first = { items: text, ans };
    items.forEach((it, j) => { if (it.type !== 'text') return; const a = ans[it.id] == null ? '' : ans[it.id];
      const c0 = cpu(); const r = SV.read(U, it, a, it.sib ? ans[it.sib] : undefined); const dt = cpu() - c0; rd += dt; rdN++; if (dt > rdMax) rdMax = dt;
      if (r.ok !== !seen[j].rd) fail('set ' + seed + ' ' + it.id + ': read ok ' + r.ok + ', the page ' + (seen[j].rd ? 'said “' + seen[j].rd.replace(/<[^>]+>/g, '') + '”' : 'said nothing'));
      if (JSON.stringify(r.pretty) !== JSON.stringify(seen[j].pv)) fail('set ' + seed + ' ' + it.id + ': the preview differs'); });
    const pageV = items.map(it => { const R = pg.S.res[it.id] || {}; return R.v === 'right' ? 'right' : R.unreadMsg === 'Left blank.' ? 'blank' : R.unreadMsg ? 'unread' : 'wrong'; });
    const once = () => { const v = []; for (let f = 0; f < items.length; f += 3) { const c0 = cpu(); v.push(...SV.grade(U, items, ans, v, f, 3)); const dt = cpu() - c0; if (dt > gMax) gMax = dt; if (s || f) { warm += dt; warmN++; } steps++; } return v; };
    const V = once(); for (let k = 0; k < 4; k++) once();
    items.forEach((it, j) => { parts++; tally[V[j].v]++; if (V[j].v !== pageV[j]) fail('set ' + seed + ' ' + it.id + ' (' + it.type + ', ' + VARS[(j + s) % 5] + '): the site says ' + V[j].v + ', the page ' + pageV[j]); });
    const sm = SV.summary(items, V), want = pg.score.replace(/\s+/g, ' ').trim();
    if (sm.points + ' / ' + sm.of !== want) fail('set ' + seed + ': the site scores ' + sm.points + ' / ' + sm.of + ', the page ' + want);
  }
  try { SV.grade(U, P.unpack(first.items), first.ans, [], 3, 3); fail('grade out of order did not refuse'); } catch (e) { if (!/out of order/.test(e.message)) fail('grade out of order: ' + e.message); }
  if (errs.length) fail('page errors: ' + errs.slice(0, 3).join(' | '));
  await b.close(); server.close();
  const tmp = path.join(require('os').tmpdir(), 'exam_server_' + process.pid + '.json'); fs.writeFileSync(tmp, JSON.stringify(first));
  const colds = []; for (let k = 0; k < 3; k++) colds.push(JSON.parse(execFileSync(process.execPath, [__filename, '--cold', dir, tmp], { encoding: 'utf8' }))); fs.unlinkSync(tmp);
  const ms = us => (us / 1000).toFixed(2) + ' ms', cg = Math.max(...colds.map(c => c.grade)), cr = Math.max(...colds.map(c => c.read));
  console.log('exam server: ' + parts + ' parts over ' + SETS + ' sets (' + Object.keys(tally).map(k => tally[k] + ' ' + k).join(', ') + '), ' + steps + ' grade calls' + (fails.length ? ' — ' + fails.length + ' FAILED' : ' — every verdict and score the page’s'));
  console.log('  CPU under Node: grade of 3 parts cold ' + ms(cg) + ' (worst of 3 fresh processes), warm ' + ms(warm / warmN) + ' average, ' + ms(gMax) + ' worst; read cold ' + ms(cr) + ', warm ' + ms(rd / rdN) + ' average, ' + ms(rdMax) + ' worst (the site: 10 ms a request)');
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
