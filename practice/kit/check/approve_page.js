/* check/page.js part L — approvals in a real browser (approvals.js, 8 Nov 2026; Croix: "I just want to be able to approve or
   disapprove"). The page is told it is on the site (window.KIT_SITE_BASE = '': it asks this check's own server for
   /api/items/<course>/<unit>), and that address and the teacher's /teacher/api/items/… are answered here (page.route) by a
   little store of what is disapproved:
     - a disapproved kind is not in a new set; a set saved before it was disapproved keeps it (and is not reset); there it gets
       no "Try a similar one" when every kind of its place is disapproved, and where another kind of its place is approved a
       fresh one is always that kind;
     - a disapproved lesson item is not in a new lesson set;
     - a device's copy from 7 Nov (wordings, his own questions) is read for its hidden rows only; the address failing with no
       copy: nothing is left out;
     - on a teacher copy, Approve questions: a row per kind of question (the survey's), each Approved | Disapproved; a press
       PUTs {approved} to /teacher/api/items/<course>/<unit>/approval/<kind>/<target> and the row says it is left out; a
       failed save puts it back and says so; the lesson tab the same for a lesson item; Escape closes, focus back on the bar;
     - on a student page: none of the teacher's tools — not in the page's source, and no request under /teacher/. */
const path = require('path'), fs = require('fs');
module.exports = async function partL(b, url, U, dir, fail) {
  const teacher = /^teacher$/.test(path.basename(dir));
  const origin = url.replace(/\/preview\.html$/, '');
  const M = /^([a-z]\d+)u(\d+)$/i.exec(U.id), course = M[1].toLowerCase(), unit = +M[2];
  const partsOf = it => it.type === 'parts' ? it.parts : it.type === 'solo' ? [it.part] : [it];
  const famKey = it => { const fs2 = []; partsOf(it).forEach(p => { const f = p && (p.fam || (p === it.part ? it.fam : '')); if (typeof f === 'string' && f && fs2.indexOf(f) < 0) fs2.push(f); }); if (!fs2.length && typeof it.fam === 'string') fs2.push(it.fam); return fs2.join('/'); };
  const kindsAt = (si, ii) => { const out = new Set(); for (let s = 1; s <= 160; s++) out.add(famKey(U.generate(s).sections[si].items[ii])); return [...out]; };
  /* the store: {family: Set, bank: Set}; puts: every write the page made; writeFails: answer writes with a 500 */
  const store = { family: new Set(), bank: new Set() }, puts = [];
  let down = false, writeFails = false;
  const pub = () => ({ edits: [...store.family].map(t => ({ target_kind: 'family', target: t, hidden: true })).concat([...store.bank].map(t => ({ target_kind: 'bank', target: t, hidden: true }))), custom: [], v: 'x' + store.family.size + store.bank.size });
  async function routes(ctx) {
    /* ?fresh=1: this device's storage cleared before the page's own scripts run (not after: a live page could save over it) */
    await ctx.addInitScript(() => { window.KIT_SITE_BASE = ''; if (/[?&]fresh=1\b/.test(location.search)) { try { localStorage.clear(); } catch (e) {} } });
    await ctx.route(origin + '/api/items/**', r => down ? r.abort() : r.fulfill({ status: 200, contentType: 'application/json', headers: { 'cache-control': 'no-store' }, body: JSON.stringify(pub()) }));
    await ctx.route(origin + '/teacher/api/items/**', async r => {
      const q = r.request(), u = new URL(q.url());
      if (q.method() === 'GET') return r.fulfill({ status: 200, contentType: 'application/json', headers: { 'cache-control': 'no-store' }, body: JSON.stringify({ store: true, edits: pub().edits }) });
      const m = /\/approval\/(family|bank)\/([^/]+)$/.exec(u.pathname); let body = null; try { body = JSON.parse(q.postData() || 'null'); } catch (e) {}
      puts.push({ method: q.method(), path: u.pathname, body, ctype: q.headers()['content-type'] || '' });
      if (writeFails) return r.fulfill({ status: 500, contentType: 'application/json', headers: { 'cache-control': 'no-store' }, body: '{"error":"server"}' });
      if (!m || q.method() !== 'PUT' || !body || typeof body.approved !== 'boolean') return r.fulfill({ status: 400, contentType: 'application/json', headers: { 'cache-control': 'no-store' }, body: '{"error":"bad"}' });
      const target = decodeURIComponent(m[2]); if (body.approved) store[m[1]].delete(target); else store[m[1]].add(target);
      return r.fulfill({ status: 200, contentType: 'application/json', headers: { 'cache-control': 'no-store' }, body: JSON.stringify({ target_kind: m[1], target, approved: body.approved, updated: new Date().toISOString() }) });
    });
    await ctx.route(origin + '/teacher/api/tests/**', r => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'cache-control': 'no-store' }, body: '{"store":true,"spec":null,"updated":null}' }));
  }
  const ctx = await b.newContext({ viewport: { width: 1000, height: 900 } }); await routes(ctx);
  const p = await ctx.newPage(), errs = [], asked = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('request', r => asked.push(r.url()));
  /* every open is a new document (a query of its own): a hash change would let the page still open draw and save the set first */
  let nav = 0;
  const open = async (hash, clear) => { await p.goto(url + '?v=' + (++nav) + (clear ? '&fresh=1' : '') + '#' + hash); await p.waitForFunction(() => document.querySelectorAll('#paper .q').length > 0 || /No questions|No misses/.test(document.getElementById('paper').textContent), null, { timeout: 8000 }).catch(() => {}); await p.waitForTimeout(250); };
  const onPage = () => p.evaluate(() => Array.from(document.querySelectorAll('#paper .q[data-q]:not(.xq)')).map(q => ({ id: (q.querySelector('.qid .qn') || {}).textContent || '', stem: ((q.querySelector('.stem .st') || {}).textContent || '').replace(/\s+/g, ' ').trim() })));
  const textOf = h => p.evaluate(x => { const d = document.createElement('div'); d.innerHTML = x; return d.textContent.replace(/\s+/g, ' ').trim(); }, h);

  /* 1. a set saved with nothing disapproved, then a kind disapproved: the saved set keeps it, a new set leaves it out */
  const S0 = 777, g0 = U.generate(S0), all0 = []; g0.sections.forEach((sec, si) => sec.items.forEach((it, ii) => all0.push({ si, ii, it, fk: famKey(it) })));
  const X = all0[Math.min(2, all0.length - 1)], xs = kindsAt(X.si, X.ii);
  await open('set-' + S0, true);
  const first = await p.evaluate(() => { const i = document.querySelector('#paper input[type=text]'); return i ? i.id : null; });
  if (first) { await p.fill('#' + first, '1'); await p.evaluate(id => document.querySelector('[data-check="' + id.slice(1) + '"]').click(), first); await p.waitForTimeout(100); }
  const before = await onPage();
  store.family.add(X.fk);
  await open('set-' + S0, false);
  const kept = await onPage(), notice = await p.evaluate(() => !document.getElementById('notice').hidden);
  if (kept.length !== before.length || notice) fail('L: a set saved before a kind was disapproved did not keep its questions (' + kept.length + ' of ' + before.length + (notice ? ', reset' : '') + ')');
  /* there, the disapproved question: no fresh one where every kind of its place is disapproved */
  const xid = await p.evaluate(qn => { const q = Array.from(document.querySelectorAll('#paper .q[data-q]:not(.xq)'))[qn]; const h = q && q.querySelector('[data-host]'); return h ? h.getAttribute('data-host') : null; }, all0.indexOf(X));
  if (xid && xs.length === 1) {
    const kind = await p.evaluate(id => document.getElementById('a' + id) ? 'text' : document.querySelector('input[name="q' + id + '"]') ? 'choice' : 'nline', xid);
    if (kind === 'text') await p.fill('#a' + xid, '987654'); else if (kind === 'choice') await p.evaluate(id => document.querySelector('input[name="q' + id + '"]').click(), xid);
    if (kind !== 'nline') { await p.evaluate(id => document.querySelector('[data-check="' + id + '"]').click(), xid); await p.waitForTimeout(150);
      const st = await p.evaluate(id => ({ sim: !!document.querySelector('[data-another="' + id + '"]'), right: document.querySelector('[data-host="' + id + '"]').classList.contains('is-right') }), xid);
      if (st.sim) fail('L: a question whose every kind is disapproved offers "Try a similar one" (' + X.fk + ')'); }
  }
  const S1 = 4821; await open('set-' + S1, false);
  const g1 = U.generate(S1), want1 = []; g1.sections.forEach(sec => sec.items.forEach(it => { if (famKey(it) !== X.fk) want1.push(it); }));
  const now1 = await onPage();
  if (now1.length !== want1.length) fail('L: a new set has ' + now1.length + ' questions, not the ' + want1.length + ' left with ' + X.fk + ' disapproved');
  const xstem = await textOf(U.view.stem(g1.sections[X.si].items[X.ii]));
  if (xstem && now1.some(q => q.stem === xstem)) fail('L: the disapproved kind ' + X.fk + ' is in a new set');
  /* the IDs keep their places: the one left out leaves a gap */
  const wantIds = []; let n = 0; g1.sections.forEach(sec => sec.items.forEach(it => { n++; if (famKey(it) !== X.fk) wantIds.push('U' + unit + '·' + n); }));
  if (JSON.stringify(now1.map(q => q.id)) !== JSON.stringify(wantIds)) fail('L: the IDs of a new set are ' + now1.map(q => q.id).slice(0, 4).join(' ') + '…, not the places of the questions left');
  /* where a place has another kind, approved: a fresh one is always that kind */
  let two = null; for (const q of all0) { const ks = kindsAt(q.si, q.ii); if (ks.length > 1) { two = { q, ks }; break; } }
  if (two) {
    const Y = two.ks[0];
    store.family.clear(); store.family.add(Y);
    let s2 = 0; for (let s = 1; s < 3000 && !s2; s++) if (famKey(U.generate(s).sections[two.q.si].items[two.q.ii]) !== Y) s2 = s;
    await open('set-' + s2, true);
    const pos = U.generate(s2).sections.slice(0, two.q.si).reduce((t, sec) => t + sec.items.length, 0) + two.q.ii;
    const hid = await p.evaluate(qn => { const q = Array.from(document.querySelectorAll('#paper .q[data-q]:not(.xq)'))[qn]; const h = q && q.querySelector('[data-host]'); return h ? h.getAttribute('data-host') : null; }, pos);
    const isText = hid && await p.evaluate(id => !!document.getElementById('a' + id), hid);
    if (isText) {
      await p.fill('#a' + hid, '987654'); await p.evaluate(id => document.querySelector('[data-check="' + id + '"]').click(), hid); await p.waitForTimeout(100);
      for (let t = 0; t < 6; t++) {
        await p.evaluate(id => { const a = document.querySelector('[data-another="' + id + '"]'); if (a) a.click(); }, hid); await p.waitForTimeout(80);
        const sd = await p.evaluate(([pre, s, id]) => { const r = JSON.parse(localStorage.getItem(pre + 'set.' + s + '.all') || 'null'); return r && r.more && r.more[id] ? r.more[id].seed : 0; }, [U.id + '.', s2, hid]);
        if (sd && famKey(U.generate(sd).sections[two.q.si].items[two.q.ii]) === Y) { fail('L: "Try a similar one" brought the disapproved kind ' + Y); break; }
      }
    }
    store.family.clear(); store.family.add(X.fk);
  }

  /* 2. a lesson item disapproved is not in a new lesson set: every item of a lesson but six regular and two rigor */
  const bankDir = [path.join(dir, 'bank'), path.join(path.dirname(dir), 'bank')].find(d => fs.existsSync(path.join(d, 'cadence.json')));
  if (bankDir) {
    const B = JSON.parse(fs.readFileSync(path.join(bankDir, 'cadence.json'), 'utf8')), MAP = JSON.parse(fs.readFileSync(path.join(bankDir, 'map.json'), 'utf8'));
    const code = (MAP.order || []).find(c => { const r = MAP.lessons[c]; return r && r.status === 'cadence' && r.cadence && r.cadence.length === 1 && B.lessons[r.cadence[0]] && /^\d+\.\d+$/.test(c); });
    if (code) {
      const lid = MAP.lessons[code].cadence[0], items = B.lessons[lid].items, keep = items.filter(x => !x.rigor).slice(0, 6).concat(items.filter(x => x.rigor).slice(0, 2));
      items.forEach(x => { if (keep.indexOf(x) < 0) store.bank.add(x.id); });
      await open('lesson-' + code.toLowerCase(), true);
      const ids = (await onPage()).map(q => q.id), allowed = keep.map(x => items.indexOf(x) + 1);
      const nums = ids.map(id => +(/·(\d+)$/.exec(id) || [])[1]);
      if (!ids.length) fail('L: lesson ' + code + ' drew no set');
      if (nums.some(x => allowed.indexOf(x) < 0)) fail('L: a disapproved lesson item is in a new set of ' + code + ': ' + ids.join(' '));
      store.bank.clear();
    }
  }

  /* 3. a device's copy from 7 Nov, the address down: only its hidden rows count */
  const S3 = 31337, g3 = U.generate(S3), fl3 = []; g3.sections.forEach((sec, si) => sec.items.forEach((it, ii) => fl3.push({ si, ii, fk: famKey(it), it })));
  const Z = fl3[fl3.length - 1], W = all0[0];
  /* the copy is put on the device before the page's own scripts run (?old7=1), on storage cleared the same moment */
  const OLD7 = JSON.stringify({ edits: [{ target_kind: 'family', target: Z.fk, hidden: true, points: { '': 3 } }, { target_kind: 'family', target: W.fk, stem: { abc: { t: 'EDITED ON 7 NOV {{m1}}', ph: ['m1'] } }, coach: 'OLD HINT' }], custom: [{ id: 'aa11bb22', section: '0', stem: 'A QUESTION OF HIS OWN', type: 'number', key: { answer: '13' }, points: 1, position: 0 }], v: 'old' });
  await ctx.addInitScript(([key, val]) => { if (/[?&]old7=1\b/.test(location.search)) { try { localStorage.clear(); localStorage.setItem(key, val); } catch (e) {} } }, ['practice.edits.' + U.id, OLD7]);
  down = true; await p.goto(url + '?v=' + (++nav) + '&old7=1#set-' + S3); await p.waitForTimeout(1900);
  const old = await p.evaluate(() => ({ text: document.getElementById('paper').textContent, n: document.querySelectorAll('#paper .q[data-q]:not(.xq)').length }));
  const n3 = g3.sections.reduce((t, sec) => t + sec.items.filter(it => famKey(it) !== Z.fk).length, 0);
  if (old.n !== n3) fail('L: with 7 Nov\'s copy on the device, a new set has ' + old.n + ' questions, not ' + n3 + ' (its hidden row read)');
  if (/EDITED ON 7 NOV|A QUESTION OF HIS OWN|OLD HINT|·C1/.test(old.text)) fail('L: a 7 Nov wording or question of his own reached the page');
  await p.goto(url + '?v=' + (++nav) + '&fresh=1#set-' + (S3 + 1)); await p.waitForTimeout(1900);
  const plainN = await p.evaluate(() => document.querySelectorAll('#paper .q[data-q]:not(.xq)').length), allN = U.generate(S3 + 1).sections.reduce((t, sec) => t + sec.items.length, 0);
  if (plainN !== allN) fail('L: with the address failing and no copy on the device, ' + plainN + ' questions, not all ' + allN);
  down = false;

  /* 4. the teacher copy's Approve questions */
  if (teacher) {
    store.family.clear(); store.bank.clear();
    await open('set-12', true);
    await p.waitForFunction(() => window.TEACHER && window.TEACHER.ready && window.TEACHER.ready(), null, { timeout: 8000 }).catch(() => fail('L: the teacher copy did not get ready'));
    const bar = await p.evaluate(() => { const t = document.querySelector('.teacherbar'); return t ? { txt: t.querySelector('.tbtxt').textContent, b: Array.from(t.querySelectorAll('button')).map(x => x.textContent.trim()) } : null; });
    if (!bar) fail('L: no teacher bar');
    else {
      for (const w of ['Print test', 'Test + key', 'Key only', 'Approve questions']) if (bar.b.indexOf(w) < 0) fail('L: the teacher bar has no "' + w + '": ' + bar.b.join(' · '));
      if (!bar.b.some(x => /^(Tests A and B|Edit test)$/.test(x))) fail('L: the teacher bar has no Tests A and B');
      if (!/never share this page with students/i.test(bar.txt) || bar.txt.length > 80) fail('L: the bar\'s warning is not one short line: "' + bar.txt + '"');
      if (bar.b.some(x => /forms?$|Choose questions/.test(x))) fail('L: the bar still has the 1–5 forms or Choose questions…: ' + bar.b.join(' · '));
    }
    await p.click('.teacherbar [data-topen="approve"]'); await p.waitForTimeout(400);
    await p.waitForFunction(() => document.querySelectorAll('#printview .aprow').length > 0, null, { timeout: 8000 }).catch(() => {});
    /* the survey's kinds, as the panel takes them (sets 1–240) */
    const kinds = new Set(); for (let s = 1; s <= 240; s++) U.generate(s).sections.forEach(sec => sec.items.forEach(it => kinds.add(famKey(it))));
    const panel = await p.evaluate(() => ({ dialog: document.getElementById('printview').getAttribute('role'), rows: Array.from(document.querySelectorAll('#printview .aprow[data-fk]')).map(r => r.dataset.fk), sum: (document.querySelector('#printview .apsum') || {}).textContent || '',
      inputs: document.querySelectorAll('#printview .apq input, #printview .apq textarea').length, small: Array.from(document.querySelectorAll('#printview .apseg button, #printview .apmore, #printview [data-ap="done"]')).filter(x => x.getBoundingClientRect().height < 44).length }));
    if (panel.dialog !== 'dialog') fail('L: Approve questions is not the kit\'s #printview dialog');
    if (panel.rows.length !== kinds.size || [...kinds].some(k => panel.rows.indexOf(k) < 0)) fail('L: Approve questions shows ' + panel.rows.length + ' kinds, the unit has ' + kinds.size);
    if (!new RegExp('^' + kinds.size + ' kinds? of question · 0 disapproved').test(panel.sum)) fail('L: the summary line is "' + panel.sum + '"');
    if (panel.inputs) fail('L: a sample in Approve questions has ' + panel.inputs + ' inputs (they are drawn static)');
    if (panel.small) fail('L: ' + panel.small + ' of the panel\'s buttons are under 44 px');
    const K0 = panel.rows[Math.min(1, panel.rows.length - 1)];
    const sel = '#printview .aprow[data-fk="' + K0.replace(/"/g, '\\"') + '"]';
    const s0 = await p.evaluate(s => document.querySelector(s + ' .apq').innerHTML, sel), more = await p.$(sel + ' [data-ap="more"]');
    if (more) { await more.click(); await p.waitForTimeout(150); const s1 = await p.evaluate(s => document.querySelector(s + ' .apq').innerHTML, sel); if (s0 === s1) fail('L: Another example did not change the sample of ' + K0); }
    await p.click(sel + ' [data-ap="off"]'); await p.waitForTimeout(250);
    const put = puts[puts.length - 1];
    if (!put || put.method !== 'PUT' || put.path !== '/teacher/api/items/' + course + '/' + unit + '/approval/family/' + encodeURIComponent(K0) || !put.body || put.body.approved !== false || Object.keys(put.body).length !== 1 || !/^application\/json/.test(put.ctype)) fail('L: Disapproved did not PUT {approved: false} to the kind\'s address: ' + JSON.stringify(put));
    const row = await p.evaluate(s => ({ off: document.querySelector(s).classList.contains('off'), say: (document.querySelector(s + ' .apoff') || {}).textContent || '', pressed: document.querySelector(s + ' [data-ap="off"]').getAttribute('aria-pressed'), sum: document.querySelector('#printview .apsum').textContent, st: (document.querySelector('#printview .tvst') || {}).textContent || '' }), sel);
    if (!row.off || !/left out of new sets/i.test(row.say) || row.pressed !== 'true') fail('L: a disapproved row does not dim and say it is left out: ' + JSON.stringify(row));
    if (!/· 1 disapproved/.test(row.sum) || !/^Saved/.test(row.st)) fail('L: after Disapproved the summary says "' + row.sum + '" and the status "' + row.st + '"');
    if (!(await p.evaluate(k => Kit.Approvals.famHidden(k), K0))) fail('L: the page did not follow the approval it saved');
    await p.click(sel + ' [data-ap="on"]'); await p.waitForTimeout(250);
    const put2 = puts[puts.length - 1];
    if (!put2 || !put2.body || put2.body.approved !== true || put2.path !== put.path) fail('L: Approved did not PUT {approved: true}: ' + JSON.stringify(put2));
    writeFails = true; await p.click(sel + ' [data-ap="off"]'); await p.waitForTimeout(300); writeFails = false;
    const back = await p.evaluate(s => ({ off: document.querySelector(s).classList.contains('off'), st: document.querySelector('#printview .tvst').textContent }), sel);
    if (back.off || !/Couldn.t save — try again/.test(back.st)) fail('L: a failed save did not put the row back and say so: ' + JSON.stringify(back));
    if (bankDir) {
      await p.click('#printview [data-aptab="lessons"]'); await p.waitForTimeout(400);
      const lrow = await p.evaluate(() => { const r = document.querySelector('#printview .aprow[data-bid]'); return r ? r.dataset.bid : null; });
      if (!lrow) fail('L: the Lesson sets tab shows no lesson items');
      else {
        await p.click('#printview .aprow[data-bid="' + lrow + '"] [data-ap="off"]'); await p.waitForTimeout(250);
        const put3 = puts[puts.length - 1];
        if (!put3 || put3.path !== '/teacher/api/items/' + course + '/' + unit + '/approval/bank/' + lrow || !put3.body || put3.body.approved !== false) fail('L: a lesson item\'s Disapproved did not PUT {approved: false} to its address: ' + JSON.stringify(put3));
      }
    } else if (await p.$('#printview [data-aptab]')) fail('L: a unit with no lesson bank shows a Lesson sets tab');
    await p.keyboard.press('Escape'); await p.waitForTimeout(150);
    const closed = await p.evaluate(() => ({ hidden: document.getElementById('printview').hidden, tview: document.body.classList.contains('tview'), focus: document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.topen : '' }));
    if (!closed.hidden || closed.tview || closed.focus !== 'approve') fail('L: Escape did not close Approve questions with the focus back on its button: ' + JSON.stringify(closed));
  } else {
    /* the student page: none of the teacher's tools, in its source or on the wire */
    const html = fs.readFileSync(path.join(dir, 'preview.html'), 'utf8');
    for (const w of ['data-topen', 'tvstrip', 'apseg', '/teacher/api/', 'teacher.tests.', '>Approve questions<', 'class="teacherbar']) if (html.indexOf(w) >= 0) fail('L: the student page carries the teacher\'s "' + w + '"');
    if (await p.evaluate(() => !!(window.PracticeKit || window.TEACHER || document.querySelector('.teacherbar')))) fail('L: the student page mounts the teacher\'s tools');
    if (asked.some(u => /\/teacher\//.test(u))) fail('L: the student page asked for ' + asked.filter(u => /\/teacher\//.test(u))[0]);
  }
  if (asked.some(u => !u.startsWith(origin) && !/^(data|blob|about):/.test(u))) fail('L: the page asked off the site: ' + asked.filter(u => !u.startsWith(origin))[0]);
  if (errs.length) fail('L: page errors: ' + errs.slice(0, 3).join(' | '));
  await ctx.close();
  console.log('L. approvals checked: ' + X.fk + ' disapproved (' + now1.length + ' of ' + all0.length + ' questions in a new set)' + (two ? ', a two-kind place' : '') + (bankDir ? ', a lesson\'s items' : '') + (teacher ? ', Approve questions' : ', no teacher tools on the student page'));
};
