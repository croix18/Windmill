/* check/page.js part Q — set numbers are valid and accurate (ui.js, teacher.js, check/lock.js; Croix, 14 Nov 2026: "ensure all
   the test codes are valid and accurate. Harden that system across the whole project"). On every page:
     - a set is the same set in this browser as in the lock (sets.lock.json: 1–300 and 300 from 301 to 99999);
     - a link that names no set (#set-0, #set-123456, #set-12x) opens a real set and says the link was not one; on an open
       page it leaves the set where it was and says so;
     - the set box takes 1 to 99999 in digits and nothing else: "48.5", "4.8e3", "0", "100000" and "abc" say so and go nowhere;
     - a printed key carries its set number, the unit's version and a check code, and the code is the one worked out again
       here, in Node, from that set's questions and answers.
   On a teacher copy as well:
     - each of three make-ups: its key's number is 1–99999, its code is its set's, and that number opened on the page shows
       the printed questions, the printed answers and the same code beside "Set number";
     - a random-test unit's pinned form: untouched, its key's code is its set's; a question left off is named on the key and
       the code is no longer the set's; a question drawn from another set is named with that set, and the code changes. */
const path = require('path'), fs = require('fs');
module.exports = async function partQ(b, url, U, dir, fail) {
  const K = require('../core.js'), NLk = require('../nline.js'), teacher = /^teacher$/.test(path.basename(dir));
  const ABC = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  const code = s => { let n = K.fnv1a(s), o = ''; for (let i = 0; i < 5; i++) { o += ABC.charAt(n % 32); n = Math.floor(n / 32); } return o; };
  const ansOf = (it, p) => p.kind === 'nline' ? NLk.keyText(NLk.graphOf(p)) : it.type === 'multi' ? 'm:' + it.correct.map(k => U.view.opt(it, k)).join('|')
    : it.type === 'mc' || p.kind === 'mc' ? 'c:' + U.view.opt(p, p.correct) : U.view.key(p);
  const checkOf = seed => { const rows = []; U.generate(seed).sections.forEach(sec => sec.items.forEach(it => (it.type === 'parts' ? it.parts : it.type === 'solo' ? [it.part] : [it]).forEach(p => rows.push(U.key(p) + '=' + ansOf(it, p)))));
    return code(U.id + '#' + U.contentVersion + '#' + rows.join(';')); };
  const ctx = await b.newContext({ viewport: { width: 1000, height: 900 } }), p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(String(e.message || e)));
  const ready = async () => { await p.waitForSelector('#paper .q'); if (teacher) await p.waitForFunction(() => window.TEACHER && window.TEACHER.ready && window.TEACHER.ready(), null, { timeout: 8000 }).catch(() => fail('Q: the teacher copy did not get ready')); };
  await p.goto(url + '#set-37'); await ready();
  /* 1. the lock, in this browser */
  const lockFile = path.join(dir, 'sets.lock.json'); let held = 0;
  if (!fs.existsSync(lockFile)) fail('Q: no sets.lock.json');
  else { const L = JSON.parse(fs.readFileSync(lockFile, 'utf8')), all = Object.assign({}, L.sets, L.wide || {}); held = Object.keys(all).length;
    if (!L.wide) fail('Q: the lock holds no sets above 300');
    const off = await p.evaluate(all2 => { const Un = window.Unit, fn = window.Kit.fnv1a, parts = it => it.type === 'parts' ? it.parts : it.type === 'solo' ? [it.part] : [it];
      return Object.keys(all2).filter(s => fn(Un.generate(+s).sections.map(x => x.items.map(it => parts(it).map(Un.key).join(',')).join(';')).join('|')).toString(36) !== all2[s]); }, all);
    if (off.length) fail('Q: ' + off.length + ' sets are not the lock\'s sets in this browser (e.g. set ' + off.slice(0, 4).join(', ') + ')'); }
  /* 2. links that name no set */
  for (const h of ['#set-0', '#set-123456', '#set-12x', '#set-']) {
    const q = await ctx.newPage(); await q.goto(url + h); await q.waitForSelector('#paper .q');
    const r = await q.evaluate(() => ({ hash: location.hash, note: document.getElementById('notice').hidden ? '' : document.getElementById('notice').textContent, no: document.getElementById('setno').textContent }));
    if (!/^#set-[1-9]\d{0,4}$/.test(r.hash) || r.hash !== '#set-' + r.no) fail('Q: the link ' + h + ' left the page at "' + r.hash + '" (set ' + r.no + ')');
    if (!/is not a set/.test(r.note) || r.note.indexOf('set ' + r.no) < 0) fail('Q: the link ' + h + ' opened set ' + r.no + ' and said "' + r.note + '"');
    await q.close();
  }
  await p.evaluate(() => { location.hash = '#set-999999'; }); await p.waitForTimeout(150);
  const live = await p.evaluate(() => ({ hash: location.hash, note: document.getElementById('notice').hidden ? '' : document.getElementById('notice').textContent, no: document.getElementById('setno').textContent }));
  if (live.no !== '37' || live.hash !== '#set-37' || !/is not a set/.test(live.note)) fail('Q: a bad link on an open page: set ' + live.no + ', ' + live.hash + ', "' + live.note + '"');
  /* 3. the set box */
  const box = async v => { if (await p.isHidden('#mMenu')) await p.click('#bMore'); await p.evaluate(() => { document.querySelector('.setbox').open = true; }); await p.fill('#setin', v); await p.click('#setgo'); await p.waitForTimeout(120);
    return p.evaluate(() => ({ hash: location.hash, bad: (document.getElementById('setbad') || {}).hidden === false ? document.getElementById('setbad').textContent : '' })); };
  for (const v of ['48.5', '4.8e3', '0', '100000', 'abc', '-5', '']) { const r = await box(v); if (r.hash !== '#set-37' || !/1 to 99999/.test(r.bad)) fail('Q: the set box, given "' + v + '", went to ' + r.hash + ' and said "' + r.bad + '"'); }
  const ok = await box(' 4821 '); if (ok.hash !== '#set-4821' || ok.bad) fail('Q: the set box, given 4821, went to ' + ok.hash + (ok.bad ? ' and said "' + ok.bad + '"' : ''));
  /* 4. a printed key: number, version, check */
  if (await p.isHidden('#mMenu')) await p.click('#bMore'); await p.click('#bPrint'); await p.click('[data-print="wk"]'); await p.waitForTimeout(150);
  const wk = await p.evaluate(() => document.querySelector('#printview .pkey .pmeta').textContent.replace(/\s+/g, ' ').trim());
  const want = 'Set 4821 · ', tail = ' · version ' + U.contentVersion + ' · check ' + checkOf(4821);
  if (wk.indexOf(want) !== 0 || wk.slice(-tail.length) !== tail) fail('Q: the worksheet\'s key is headed "' + wk + '", not "Set 4821 · …' + tail + '"');
  await p.click('#pvClose');
  let said = held + ' sets as the lock in this browser; bad links and numbers said; the key\'s check code is its set\'s';
  if (teacher) {
    const txt = () => { const n = s => s.replace(/\s+/g, ' ').trim();
      return Array.from(document.querySelectorAll('#printview .pform:not(.pkeyform)')).map((f, k) => { const key = document.querySelectorAll('#printview .pform.pkeyform')[k];
        return { meta: n(key.querySelector('.pmeta').textContent), stems: Array.from(f.querySelectorAll('.pq')).map(q => n(q.querySelector('.stem .st').textContent) + '||' + Array.from(q.querySelectorAll('.ppart .line .st')).map(e => n(e.textContent)).join('|')),
          keys: Array.from(key.querySelectorAll('table.pkrows tr')).map(r => n(r.cells[1].textContent)) }; }); };
    if (await p.isHidden('#mMenu')) await p.click('#bMore'); await p.click('#bPrint'); await p.click('[data-print="mk"]'); await p.click('[data-print="mk3"]'); await p.waitForTimeout(200);
    const forms = await p.evaluate(txt); await p.click('#pvClose');
    if (forms.length !== 3) fail('Q: ' + forms.length + ' make-ups for 3');
    for (const [k, f] of forms.entries()) {
      const F = 'make-up ' + 'ABC'[k], m = /^Set (\d+) · Whole test( · .*)? · version (\S+) · check ([2-9A-HJ-NP-Z]{5})$/.exec(f.meta), seed = m ? +m[1] : 0;
      if (!m || !(seed >= 1 && seed <= 99999)) { fail('Q: ' + F + '\'s key is headed "' + f.meta + '"'); continue; }
      if (m[3] !== String(U.contentVersion)) fail('Q: ' + F + ' says version ' + m[3] + ' for ' + U.contentVersion);
      if (m[4] !== checkOf(seed)) fail('Q: ' + F + ' (set ' + seed + ') prints check ' + m[4] + '; the set\'s is ' + checkOf(seed));
      const q = await ctx.newPage(); await q.goto(url + '#set-' + seed); await q.waitForSelector('#paper .q');
      const o = await q.evaluate(() => { const n = s => s.replace(/\s+/g, ' ').trim();
        return { chk: (document.getElementById('setchk') || { textContent: '' }).textContent, stems: Array.from(document.querySelectorAll('#paper .q')).filter(e => e.querySelector('.stem .st')).map(e => n(e.querySelector('.stem .st').textContent) + '||' + Array.from(e.querySelectorAll('.line .st')).map(x => n(x.textContent)).join('|')) }; });
      if (JSON.stringify(o.stems) !== JSON.stringify(f.stems)) fail('Q: ' + F + ': set ' + seed + ' opened on the page is not the printed paper');
      if (o.chk !== 'Set ' + seed + ' · version ' + U.contentVersion + ' · check ' + m[4]) fail('Q: ' + F + ': set ' + seed + ' opened on the page shows "' + o.chk + '", the key says check ' + m[4]);
      await q.click('#bMore'); await q.click('#bPrint'); await q.click('[data-print="wk"]'); await q.waitForTimeout(150);
      const keys = await q.evaluate(() => Array.from(document.querySelectorAll('#printview .pkey table.ptab tr')).map(t => t.cells[1].textContent.replace(/\s+/g, ' ').trim()));
      if (JSON.stringify(keys) !== JSON.stringify(f.keys)) fail('Q: ' + F + ': set ' + seed + ' opened on the page has other answers than the printed key');
      await q.close();
    }
    said += '; 3 make-ups reopened by their numbers: the same questions, answers and code';
    if (await p.evaluate(() => !!(window.TEACHER_TEST && window.TEACHER_TEST.random && window.TEACHER.spec))) {
      const pin = await p.evaluate(() => { const T = window.TEACHER, f = T.forms[0], S = T.spec(), F = S.forms[f], n = s => s.replace(/\s+/g, ' ').trim();
        const meta = () => { const d = document.createElement('div'); d.innerHTML = T.draw(f).key; return n(d.querySelector('.pmeta').textContent); };
        const keepPick = T.pick(), keepQ = JSON.stringify(F.q), keepBase = JSON.stringify(F.base), out = { seed: F.seed };
        F.q = {}; F.base = {}; T.pick(keepPick.map(() => true)); out.plain = meta();
        T.pick(keepPick.map((x, i) => i !== 1)); out.off = meta(); T.pick(keepPick.map(() => true));
        out.other = F.seed === 99999 ? 1 : F.seed + 1; F.q = { 2: { seed: out.other } }; out.from = meta();
        F.q = JSON.parse(keepQ); F.base = JSON.parse(keepBase); T.pick(keepPick); return out; });
      const c0 = checkOf(pin.seed), chk = s => (/ · check ([2-9A-HJ-NP-Z]{5})$/.exec(s) || [])[1];
      if (pin.plain !== 'Set ' + pin.seed + ' · Whole test · version ' + U.contentVersion + ' · check ' + c0) fail('Q: the pinned form, untouched, is headed "' + pin.plain + '" (its set\'s check is ' + c0 + ')');
      if (!/ · left off: U\d+·2 /.test(pin.off) || !chk(pin.off) || chk(pin.off) === c0) fail('Q: the pinned form with question 2 left off is headed "' + pin.off + '"');
      if (pin.from.indexOf(' · 1 question changed (Q3 from set ' + pin.other + ')') < 0 || !chk(pin.from)) fail('Q: the pinned form with question 3 from set ' + pin.other + ' is headed "' + pin.from + '"');
      said += '; a pinned form says what was left off and which set a changed question came from';
    }
  }
  if (errs.length) fail('Q: page errors: ' + errs.slice(0, 3).join(' | '));
  await ctx.close();
  console.log('Q. set numbers: ' + said);
};
