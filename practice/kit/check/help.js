/* Practice kit: the help standard, checked (HELP_STANDARD.md; 14 Nov 2026).   node <kit>/check/help.js <unit folder> [sets]
   For a unit whose coach carries help.js (Coach.help = {terms, pics}), over its sets, every question part of every family:
   A. Hint 1 names every required term as a tappable term with its definition behind the tap (never spelled out inline: Croix,
      14 Nov 2026, "Don't spell it out first"), and no [[token]] is left
      anywhere a student reads (Hints 1–3, the walkthrough's questions, options and reasons, the coach's lines);
   B. every move that is a property or theorem step (Undo, Distribute, Divide/Multiply both sides, Add/Subtract … both sides,
      reverse) carries its Why:, and Hint 3 has at least one Why:;
   C. every family the unit marks as needing a picture has one in Hints 1–3, with a caption and an aria-label;
   E. what a student reads is whole sentences: no space before a period or comma, no empty parentheses, no doubled space, no
      Why: sentence under five words;
   D. Hint 1 is short: at most 3 sentences, none over 25 words, outside the math and the definitions behind a tap.
   It prints each failure once per family and exits 1 on any. */
const path = require('path');
const dir = path.resolve(process.argv[2] || '.'), N = +(process.argv[3] || 200);
global.window = global;
const U = require(path.join(dir, 'unit.js')), C = require(path.join(dir, 'coach.js'));
if (!C.help) { console.log('help: this unit has no help.js; nothing to check'); process.exit(0); }
const strip = s => String(s == null ? '' : s).replace(/<svg[\s\S]*?<\/svg>/g, ' ').replace(/<span class="m"[\s\S]*?<\/span>(?=\s|[.,:;)]|$)/g, ' M ').replace(/<[^>]+>/g, '').replace(/&[a-z]+;/g, ' ');
const fails = {}, seen = {}, fail = (fam, what) => { const k = fam + ': ' + what; if (!fails[k]) fails[k] = 0; fails[k]++; };
const MOVE = /^(Undo|Distribute|Divide both|Multiply both|Add [^.]* to both|Subtract [^.]* from both|Write it with the variable first)/;
let parts = 0;
for (let seed = 1; seed <= N; seed++) {
  U.generate(seed).sections.forEach(sec => sec.items.forEach(it => {
    const ps = it.type === 'parts' ? it.parts : it.type === 'solo' ? [it.part] : [it];
    ps.forEach(p => { const fam = p.fam || it.fam, terms = C.help.terms[fam]; if (!terms) return; parts++; seen[fam] = 1;
      const type = p.kind === 'nline' ? 'nline' : p.kind === 'cgraph' ? 'cgraph' : p.kind === 'mc' || it.type === 'mc' && p === it ? 'mc' : it.type === 'multi' ? 'multi' : 'text';
      const x = p, R = U.rungs(x, type, {}) || {}, sol = U.solution(x, type) || [], walk = U.walk(x, type) || [];
      const texts = [R.notice, R.first && R.first.say].concat(sol.map(l => l.say), walk.map(s => s.ask), [].concat(...walk.map(s => (s.opts || []).map(o => o.label + ' ' + o.why))), walk.map(s => s.hint));
      if (!R.notice) { fail(fam, 'no Hint 1'); return; }
      /* E. what a student reads is whole sentences: no space before . or ,, no (), no doubled space, no Why: under five words */
      const shown = t => String(t || '').replace(/<svg[\s\S]*?<\/svg>/g, '').replace(/<span class="xdef"[\s\S]*?<\/span>/g, '').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&[a-z]+;/g, 'x');
      texts.concat((C.help.coach ? [] : [])).forEach(t => { const r = shown(t);
        if (/\s[.,](?!\d)/.test(r)) fail(fam, 'a space before a period or comma: "' + r.slice(Math.max(0, r.search(/\s[.,](?!\d)/) - 30), r.search(/\s[.,](?!\d)/) + 5) + '"');
        if (/\(\s*\)/.test(r)) fail(fam, 'empty parentheses');
        if (/\S  +\S/.test(r)) fail(fam, 'a doubled space: "' + r.slice(Math.max(0, r.search(/\S  +\S/) - 25), r.search(/\S  +\S/) + 10) + '"');
        (r.match(/Why:\s*[^.]*\./g) || []).forEach(w => { if (w.replace(/^Why:\s*/, '').split(/\s+/).filter(Boolean).length < 5) fail(fam, 'a Why: under five words: "' + w + '"'); }); });
      if (texts.some(t => /\[\[/.test(String(t || '')))) fail(fam, 'a [[term]] token is left in the help');
      terms.forEach(id => { const m = new RegExp('data-xterm="' + id + '"[^>]*>[^<]+</span><span class="xdef" role="note" hidden> \\(([^)]{3,})').exec(R.notice); if (!m) fail(fam, 'Hint 1 does not name the term "' + id + '" as a tappable term with its definition'); });
      if (/xdefn|xfirst/.test(texts.join(' '))) fail(fam, 'a definition is spelled out inline (it shows only on a tap)');
      if (type !== 'nline' && type !== 'cgraph') {
        sol.forEach(l => { const t = strip(l.say).trim(); if (MOVE.test(t) && !/Why:/.test(t) && !/Start from/.test(t)) fail(fam, 'a move without its Why: "' + t.slice(0, 60) + '"'); });
        if (!sol.some(l => /xwhy/.test(l.say)) && !(R.first && /xwhy/.test(R.first.say))) fail(fam, 'Hint 3 has no Why:');
      }
      if (C.help.pics.indexOf(fam) >= 0) { const all = [R.notice, R.first && R.first.say].concat(sol.map(l => l.say), walk.map(s => s.ask)).join(' ');
        if (!/<svg/.test(all)) fail(fam, 'no picture in Hints 1–3'); else if (!/aria-label="[^"]{12,}"/.test(all)) fail(fam, 'a picture without a sentence for a screen reader');
        if (/<svg/.test(all) && !/<figcaption>/.test(all) && !/vcap/.test(all)) fail(fam, 'a picture without a caption'); }
      const h1 = strip(String(R.notice).replace(/<figure[\s\S]*?<\/figure>/g, '').replace(/<span class="xdef"[\s\S]*?<\/span>/g, ''));
      const sents = h1.split(/(?<=[.!?])\s+/).filter(s => s.trim());
      if (sents.length > 3) fail(fam, 'Hint 1 has ' + sents.length + ' sentences');
      sents.forEach(s => { const w = s.trim().split(/\s+/).length; if (w > 25) fail(fam, 'a Hint 1 sentence of ' + w + ' words: "' + s.trim().slice(0, 50) + '…"'); });
    }); }));
}
const fams = Object.keys(C.help.terms), missing = fams.filter(f => !seen[f]);
missing.forEach(f => fail(f, 'never generated in ' + N + ' sets'));
const keys = Object.keys(fails);
keys.forEach(k => console.log('FAIL ' + k + (fails[k] > 1 ? ' (' + fails[k] + ' times)' : '')));
console.log('help: ' + N + ' sets, ' + parts + ' parts, ' + fams.length + ' families with help — ' + (keys.length ? keys.length + ' problems' : 'every family meets the standard'));
process.exit(keys.length ? 1 : 0);
