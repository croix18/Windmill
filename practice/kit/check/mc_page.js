/* check/page.js part P — an all-multiple-choice test on a teacher copy (ui.js mcOf, teacher.js; Croix, 14 Nov 2026: "I'd like
   the retakes that I print up to be all multiple choice"). On a unit that gives its wrong answers (Unit.choices):
     - Print → "Make-up tests, all multiple choice" → 3: on every form every part is a choice — none keeps a work space alone
       or a blank number line; a typed part has four choices, all different, and a number line four graphs, all different;
     - each key row is a letter and the answer, and that letter's choice on the paper is the answer of that form's own set,
       worked out again here from the set number on the key (the unit's key for a typed part, the kit's graph for a line);
       the other three are among the unit's own wrong answers (a line: the arrow turned, the dot changed, both);
     - the key says "All multiple choice" beside its set number; the student's sheet says neither;
     - the same set printed again has the same choices in the same order (the paper and its key agree a week apart);
     - the plain make-ups are untouched: no part of them is made a choice;
     - the bar's switch (a random-test unit): on, Test + key prints the pinned form that way and the key says so; the
       editor's paper is as written; off, the form prints as written again. */
module.exports = async function partP(b, url, U, dir, fail) {
  const ctx = await b.newContext({ viewport: { width: 1000, height: 900 } }), p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(String(e.message || e)));
  await p.goto(url + '#set-37'); await p.waitForSelector('.q');
  await p.waitForFunction(() => window.TEACHER && window.TEACHER.ready && window.TEACHER.ready(), null, { timeout: 8000 }).catch(() => fail('P: the teacher copy did not get ready'));
  const open = async kind => { await p.click('#bMore'); await p.click('#bPrint'); await p.click('[data-print="' + kind.slice(0, 2) + '"]'); await p.click('[data-print="' + kind + '"]'); await p.waitForTimeout(150); };
  /* what the printout holds, and what each form's own set says it should */
  const read = () => {
    const txt = e => e.textContent.replace(/\s+/g, '').replace(/−/g, '-');
    const plain = h => { const d = document.createElement('div'); d.innerHTML = h; return txt(d); };
    const NL = window.Kit.NL, Un = window.Unit, LET = 'ABCDEFGH';
    const forms = Array.from(document.querySelectorAll('#printview .pform:not(.pkeyform)')), keys = Array.from(document.querySelectorAll('#printview .pform.pkeyform'));
    return forms.map((f, k) => {
      const key = keys[k], meta = key.querySelector('.pmeta').textContent, seed = +(/Set (\d+)/.exec(meta) || [])[1];
      const rows = Array.from(key.querySelectorAll('table.pkrows tr')).map(r => r.cells[1]);
      const parts = Array.from(f.querySelectorAll('.ppart')), want = [];
      Un.generate(seed).sections.forEach(sec => sec.items.forEach(it => (it.type === 'parts' ? it.parts : it.type === 'solo' ? [it.part] : [it]).forEach(pt => want.push({ it, pt }))));
      const out = { seed, meta, sheet: /All multiple choice|\bSet \d/.test(f.textContent), n: parts.length, rows: rows.length, want: want.length, bad: [], made: 0, graphs: 0, html: f.innerHTML };
      if (parts.length !== want.length || rows.length !== want.length) return out;
      want.forEach((w, i) => {
        const el = parts[i], pt = w.pt, native = w.it.type === 'mc' || w.it.type === 'multi' || pt.kind === 'mc', chs = Array.from(el.querySelectorAll('.pchoices .pch'));
        if (!chs.length) { out.bad.push((i + 1) + ': not a choice'); return; }
        if (native) { if (el.querySelector('.pmc')) out.bad.push((i + 1) + ': a choice question was rebuilt'); return; }
        if (el.querySelector('.pnl') || el.querySelector('.pwork:not(.pwmc)')) out.bad.push((i + 1) + ': the blank it had is still there');
        const letter = (/^\s*([A-H])\./.exec(rows[i].textContent) || [])[1], at = LET.indexOf(letter);
        if (chs.length !== 4 || at < 0 || at > 3) { out.bad.push((i + 1) + ': ' + chs.length + ' choices, key letter "' + letter + '"'); return; }
        if (pt.kind === 'nline') {
          out.graphs++;
          const g = NL.graphOf(pt), turn = g.dir === 'left' ? 'right' : 'left', say = x => NL.say(pt, x);
          const got = chs.map(c => { const s = c.querySelector('svg.nlg'); return s ? s.getAttribute('aria-label') : ''; });
          const others = [{ c: g.c, closed: g.closed, dir: turn }, { c: g.c, closed: !g.closed, dir: g.dir }, { c: g.c, closed: !g.closed, dir: turn }].map(say).sort();
          if (got[at] !== say(g)) out.bad.push((i + 1) + ': choice ' + letter + ' is "' + got[at] + '", the key graph is "' + say(g) + '"');
          if (JSON.stringify(got.filter((x, j) => j !== at).sort()) !== JSON.stringify(others)) out.bad.push((i + 1) + ': the other graphs are ' + got.join(' | '));
          const ks = rows[i].querySelector('svg.nlg'); if (!ks || ks.getAttribute('aria-label') !== say(g)) out.bad.push((i + 1) + ': the key row does not draw the key graph');
        } else {
          out.made++;
          const got = chs.map(c => txt(c.querySelector('.cv'))), keyT = plain(Un.view.key(pt)), wrongs = (Un.choices(pt) || []).map(plain);
          if (new Set(got).size !== 4) out.bad.push((i + 1) + ': two choices read the same: ' + got.join(' | '));
          if (got[at] !== keyT) out.bad.push((i + 1) + ': choice ' + letter + ' is "' + got[at] + '", the set\'s answer is "' + keyT + '"');
          if (txt(rows[i]) !== letter + '.' + keyT) out.bad.push((i + 1) + ': the key row is "' + txt(rows[i]) + '"');
          got.forEach((x, j) => { if (j !== at && (x === keyT || wrongs.indexOf(x) < 0)) out.bad.push((i + 1) + ': choice ' + LET[j] + ' "' + x + '" is not one of the unit\'s wrong answers'); });
          if (!el.querySelector('.pwork.pwmc')) out.bad.push((i + 1) + ': no room to work');
        }
      });
      return out;
    });
  };
  if (!(await p.evaluate(() => { document.getElementById('bMore').click(); document.getElementById('bPrint').click(); const ok = !!document.querySelector('[data-print="mc"]'); document.getElementById('cn').click(); return ok; }))) fail('P: the print menu has no "Make-up tests, all multiple choice"');
  await open('mc3');
  const A = await p.evaluate(read); let made = 0, graphs = 0, letters = {};
  if (A.length !== 3) fail('P: ' + A.length + ' forms for 3');
  A.forEach((f, k) => {
    const F = 'form ' + 'ABC'[k] + ' (set ' + f.seed + ')';
    if (f.n !== f.want || f.rows !== f.want) fail('P: ' + F + ' has ' + f.n + ' parts and ' + f.rows + ' key rows for ' + f.want);
    f.bad.forEach(x => fail('P: ' + F + ' part ' + x));
    if (f.sheet) fail('P: ' + F + ': the student\'s sheet carries a set number or "All multiple choice"');
    if (!/All multiple choice/.test(f.meta)) fail('P: ' + F + ': the key does not say "All multiple choice" (' + f.meta + ')');
    made += f.made; graphs += f.graphs;
  });
  if (!made) fail('P: no typed part was made a choice');
  await p.click('#pvClose');
  await open('mc1');
  const A2 = await p.evaluate(read);
  if (!A2[0] || !A[0] || A2[0].seed !== A[0].seed || A2[0].html !== A[0].html) fail('P: the same set printed again is not the same paper');
  await p.click('#pvClose');
  await open('mk1');
  if (await p.evaluate(() => !!document.querySelector('#printview .pmc') || /All multiple choice/.test(document.getElementById('printview').textContent))) fail('P: a plain make-up was made multiple choice');
  await p.click('#pvClose');
  /* the bar's switch */
  let bar = 'no switch (a fixed paper)';
  if (await p.evaluate(() => !!(window.TEACHER_TEST && window.TEACHER_TEST.random))) {
    const sw = '.teacherbar [data-tmc]';
    if (!(await p.isVisible(sw))) fail('P: the bar has no "All multiple choice" switch');
    else {
      if (await p.getAttribute(sw, 'aria-pressed') !== 'false') fail('P: the switch is on when the page opens');
      await p.click(sw);
      if (await p.getAttribute(sw, 'aria-pressed') !== 'true' || !/^✓ /.test(await p.textContent(sw))) fail('P: the switch, pressed, does not say it is on');
      await p.click('.teacherbar [data-tprint="tk"]'); await p.waitForTimeout(200);
      const B = await p.evaluate(read);
      if (B.length !== 1) fail('P: the bar printed ' + B.length + ' forms');
      else { B[0].bad.forEach(x => fail('P: the pinned form, part ' + x)); if (!B[0].made) fail('P: the pinned form has no part made a choice'); if (!/All multiple choice/.test(B[0].meta)) fail('P: the pinned form\'s key does not say "All multiple choice"'); if (B[0].sheet) fail('P: the pinned form\'s sheet carries a set number or "All multiple choice"'); }
      await p.click('#pvClose');
      await p.click('.teacherbar [data-topen="tests"]'); await p.waitForTimeout(250);
      if (await p.evaluate(() => !!document.querySelector('#printview .pmc'))) fail('P: the editor\'s paper was made multiple choice');
      await p.keyboard.press('Escape'); await p.waitForTimeout(100);
      await p.click(sw);
      await p.click('.teacherbar [data-tprint="tk"]'); await p.waitForTimeout(200);
      if (await p.evaluate(() => !!document.querySelector('#printview .pmc') || /All multiple choice/.test(document.getElementById('printview').textContent))) fail('P: with the switch off the pinned form still prints multiple choice');
      await p.click('#pvClose');
      bar = 'the bar\'s switch on and off';
    }
  }
  if (errs.length) fail('P: page errors: ' + errs.slice(0, 3).join(' | '));
  await ctx.close();
  console.log('P. all multiple choice: 3 forms, ' + made + ' typed parts and ' + graphs + ' number lines made choices, each key letter the set\'s own answer; ' + bar);
};
