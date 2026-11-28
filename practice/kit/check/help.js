/* Practice kit: the help standard, checked (HELP_STANDARD.md; 14 Nov 2026).   node <kit>/check/help.js <unit folder> [sets]
   For a unit whose coach carries help.js (Coach.help = {terms, pics}), over its sets, every question part of every family:
   A. Hint 1 names every required term as a tappable term with its card behind the tap (never spelled out inline: Croix,
      14 Nov 2026, "Don't spell it out first"; a card since 27 Nov 2026), and no [[token]] is left
      anywhere a student reads (Hints 1–3, the walkthrough's questions, options and reasons, the coach's lines);
   B. every move that is a property or theorem step (Undo, Distribute, Divide/Multiply both sides, Add/Subtract … both sides,
      reverse) carries its Why:, and Hint 3 has at least one Why:;
   C. every family the unit marks as needing a picture has one in Hints 1–3, with a caption and an aria-label;
   E. what a student reads is whole sentences: no space before a period or comma, no empty parentheses, no doubled space, no
      Why: sentence under five words;
   D. Hint 1 is short: at most 3 sentences, none over 25 words, outside the math and the definitions behind a tap;
   K. the cards (27 Nov 2026; Croix: "I would like a card to pop up that's the definition and everything else in depth about
      the word"): every term a student can meet — in Hints 1–3, the walkthrough and the coach's lines — opens a card, and every
      entry of the glossary is a card or names one (card: another id, never itself): its def at most 15 words; more (what it
      means) 1–3 sentences, at most 60 words, Flesch–Kincaid at most grade 6.5 with the math taken out (the math spans, every
      word with a digit or a symbol, and the glossary's own words, which the standard exempts); watch (the Watch out, the lead's
      standard of 27 Nov 2026, HELP_STANDARD §3) the same reading level, at most two items (two are one <ul> of two <li>), each
      at most 25 words (a piece of math, a written point too, one word), each with a sentence that puts the right result right
      before "not" and the wrong one (or the result, "because" and its arithmetic; or an instruction that names the wrong move
      after ", not", the result then shown in math), no "goes in", "comes along", "carries" or "applies", no "it" and no "this"
      or "that" standing alone, no colon; ex present; every see id real and never the card itself; say only a respelling (letters, hyphens,
      a stressed syllable in capitals); no × anywhere (a multiplication is a dot or parentheses), no [[token]], every tag
      closed; and Kit.X.card(id) renders every entry, with its def, its sections in order and a chip per related word.
   It prints each failure once per family and exits 1 on any. */
const path = require('path');
const dir = path.resolve(process.argv[2] || '.'), N = +(process.argv[3] || 200);
global.window = global;
const U = require(path.join(dir, 'unit.js')), C = require(path.join(dir, 'coach.js'));
if (!C.help) { console.log('help: this unit has no help.js; nothing to check'); process.exit(0); }
const X = require(path.join(__dirname, '..', 'explain.js')), GL = X.glossary(), met = {};
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
      terms.forEach(id => { const m = new RegExp('data-xterm="' + id + '" aria-haspopup="dialog">[^<]+</span>').exec(R.notice), k = X.cardOf(id); if (!m || !k || String(GL[id].def || '').length < 3) fail(fam, 'Hint 1 does not name the term "' + id + '" as a tappable term with its card'); });
      if (/xdefn|xfirst|class="xdef"/.test(texts.join(' '))) fail(fam, 'a definition is spelled out inline (it shows only in its card)');
      /* K. every term met here opens a card (the coach's lines are read from the unit's sources, below) */
      texts.concat([R.first && R.first.say]).forEach(t => String(t || '').replace(/data-xterm="([^"]+)"/g, (m0, id) => { met[id] = met[id] || fam; }));
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
/* K. the cards: every term met opens one — in the sets' help above, and every [[term]] the unit's scripts can print (the coach's
   named mistakes among them); every entry is one, or names one */
try { const cfg = JSON.parse(require('fs').readFileSync(path.join(dir, 'unit.json'), 'utf8'));
  cfg.scripts.filter(f => !/kit\//.test(f)).forEach(f => { const src = require('fs').readFileSync(path.join(dir, f), 'utf8');
    src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:\\'"])\/\/[^\n]*/g, '$1')                          /* comments out */
      .replace(/\[\[([A-Za-z0-9]+)(?:\||\]\])/g, (m0, id) => { met[id] = met[id] || 'source ' + f; }); }); } catch (e) { fail('sources', 'unit.json could not be read: ' + e.message); }
/* the glossary's own terms, whole (a plural too), longest first: the standard exempts them from the reading level */
const TERMS = Object.keys(GL).map(k => String(GL[k].word || '').toLowerCase()).filter(Boolean).sort((a, b) => b.length - a.length)
  .map(w => new RegExp('(^|[^a-z])' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?:s|es)?(?=$|[^a-z])', 'gi'));
const unterm = t => TERMS.reduce((a, re) => a.replace(re, '$1 '), t);
const syl = w => { w = w.toLowerCase().replace(/[^a-z]/g, ''); if (!w) return 0; if (w.length <= 3) return 1;
  w = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, ''); const m = w.match(/[aeiouy]{1,2}/g); return m ? m.length : 1; };
const plain = h => String(h || '').replace(/<svg[\s\S]*?<\/svg>/g, ' ').replace(/<figure[\s\S]*?<\/figure>/g, ' ').replace(/<div class="vis">[\s\S]*?<\/div>/g, ' ');
const mathOut = h => { let t = plain(h), k;                                  /* the math spans out, whole (a span may hold a fraction's spans) */
  while ((k = t.indexOf('<span class="m"')) >= 0) { let d = 0, j = k; const re = /<span\b|<\/span>/g; re.lastIndex = k; let m; while ((m = re.exec(t))) { if (m[0] === '</span>') { d--; if (!d) { j = re.lastIndex; break; } } else d++; } t = t.slice(0, k) + ' M ' + t.slice(j); }
  return t.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim(); };
const sentences = t => t.split(/(?<=[.!?])\s+(?=[A-Z0-9(“"−\u2212])/).filter(x => /[A-Za-z]/.test(x));
const wordsOf = t => t.split(/\s+/).filter(w => /[A-Za-z0-9]/.test(w));
/* Flesch–Kincaid grade with the math taken out: the math spans, every word with a digit or a symbol, and the glossary's own words */
const grade = h => { const t0 = mathOut(h), S = sentences(t0).length || 1, t = unterm(t0), ws = wordsOf(t).filter(w => !/[0-9=<>≤≥+−·÷√²]/.test(w) && w !== 'M').map(w => w.replace(/[^A-Za-z’'-]/g, '')).filter(Boolean);
  if (!ws.length) return 0; const sy = ws.reduce((a, w) => a + syl(w), 0); return 0.39 * (ws.length / S) + 11.8 * (sy / ws.length) - 15.59; };
const tagsOk = h => { const st = [], re = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*?(\/?)>/g, VOID = /^(br|img|input|hr|meta|link|path|line|rect|circle|polygon|polyline|ellipse|use|stop)$/i; let m;
  const s0 = String(h || ''); while ((m = re.exec(s0))) { const tag = m[1].toLowerCase(); if (m[0][1] === '/') { if (st.pop() !== tag) return false; } else if (!m[2] && !VOID.test(tag)) st.push(tag); } return !st.length; };
const TIMES = /[×✕✖]/;
/* the Watch out (27 Nov 2026; HELP_STANDARD §3): its items — one, or two as <ul><li>…</li><li>…</li></ul> — and the words it never uses */
/* the right result next to the wrong one, joined by "not": a piece of math (or a number, or a pair) right before "not"; or the
   result, then "because" and its arithmetic (the lead's own second Distributive Property item: "−2(y − 5) = −2y + 10, because
   −2 · (−5) = +10") */
const SHOWS = s => /(?:\bM|\d|\))\s*,?\s+not\b/.test(s) || /(?:\bM\b|\d)[^.]*\bbecause\b[^.]*(?:\bM\b|\d)/.test(s);
/* or, where the mistake is a move rather than a result, the instruction itself names the right move and the wrong one, joined by
   ", not", and the item then shows the result in math (the lead's intersect, 27 Nov 2026: "Draw each line on to the edge of the
   grid, not only between your points. y = x + 3 and y = 6x − 12 cross at (3, 6), past your points.") */
const POINT = /\(\s*[−-]?\d+(?:\.\d+)?\s*,\s*[−-]?\d+(?:\.\d+)?\s*\)/g;     /* a written point, (3, −1): one piece of math */
const MOVE_SHOWN = (t, html) => /,\s+not\b/.test(sentences(t)[0] || '') && /[=<>≤≥≈]|\(\s*[−-]?\d/.test(String(html).replace(/<[^>]+>/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>'));
const watchItems = h => /<li\b/.test(h) ? (String(h).match(/<li>[\s\S]*?<\/li>/g) || []).map(x => x.slice(4, -5)) : [String(h)];
const WATCH_VERBS = /\b(?:go(?:es)? in|went in|comes? along|came along|carr(?:y|ies|ied)|appl(?:y|ies|ied))\b/i;
const BARE = /(?:^|[.!?]\s+)(?:this|that)\s+(?:is|was|are|means|makes|gives|does|works|says|will|would|can)\b|\b(?:this|that)\s*(?:[.,;:!?]|$)/i;   /* "That is…" opening a sentence, or a dangling "that."; not "that negative number" or "the point that is on both lines" */
let cards = 0, aliases = 0, worstFK = { g: -99, id: '' }, worstMore = 0, worstWatch = 0, nWatch = 0;
Object.keys(GL).forEach(id => { const e = GL[id], w = 'card ' + id;
  if (!e.word || !e.def) { fail(w, 'no word or no def'); return; }
  const fields = ['word', 'def', 'say', 'more', 'sym', 'ex', 'watch'].filter(f => e[f] != null);
  fields.forEach(f => { const v = String(e[f]);
    if (TIMES.test(v.replace(/<svg[\s\S]*?<\/svg>/g, (sv) => sv.replace(/aria-label="[^"]*"/g, '')) ) || TIMES.test(v)) fail(w, f + ' writes × (a multiplication is a dot or parentheses)');
    if (/\[\[/.test(v)) fail(w, f + ' holds a [[token]]');
    if (!tagsOk(v)) fail(w, f + ' has a tag left open or closed twice'); });
  const dw = wordsOf(mathOut(e.def)).length; if (dw > 15) fail(w, 'def is ' + dw + ' words (15 at most)');
  if (e.card) { aliases++; const k = X.cardOf(id); if (!k || k === id || !GL[e.card]) fail(w, 'card "' + e.card + '" is not another entry'); else if (GL[k].card) fail(w, 'card "' + e.card + '" is only a name for another'); return; }
  cards++;
  if (!e.more) fail(w, 'no more (what it means)'); else { const t = mathOut(e.more), n = wordsOf(t).length, ns = sentences(t).length, g = grade(e.more);
    worstMore = Math.max(worstMore, n); if (g > worstFK.g) worstFK = { g, id };
    if (n > 60) fail(w, 'more is ' + n + ' words (60 at most)'); if (ns < 1 || ns > 3) fail(w, 'more is ' + ns + ' sentences (1 to 3)');
    if (g > 6.5) fail(w, 'more reads at grade ' + g.toFixed(1) + ' (6.5 at most, the math taken out): "' + t.slice(0, 90) + '…"'); }
  if (!e.ex || !mathOut(e.ex).length && !/<svg/.test(e.ex)) fail(w, 'no ex (a worked example)');
  if (e.watch) { const v = String(e.watch), its = watchItems(v), g = grade(v); nWatch += its.length;
    if (/<li\b/.test(v) && (!/^\s*<ul>(?:\s*<li>[\s\S]*?<\/li>)+\s*<\/ul>\s*$/.test(v) || its.length < 2)) fail(w, 'watch: two mistakes are one <ul> of two <li>, with nothing outside it');
    if (its.length > 2) fail(w, 'watch has ' + its.length + ' items (2 at most)');
    its.forEach((it, i) => { const t = mathOut(it).replace(POINT, ' M '), n = wordsOf(t).length, k = 'watch item ' + (i + 1) + ' ("' + t.slice(0, 48) + '…")';
      worstWatch = Math.max(worstWatch, n);
      if (n > 25) fail(w, k + ' is ' + n + ' words (25 at most, a piece of math one word)');
      if (!sentences(t).some(SHOWS) && !MOVE_SHOWN(t, it)) fail(w, k + ' shows no result: no sentence puts the right result, then "not" and the wrong one ("= 4x + 12, not 4x + 3"), or the result and "because" with its arithmetic; nor does its instruction name the wrong move after ", not" with the result then shown in math');
      if (WATCH_VERBS.test(t)) fail(w, k + ' uses "' + t.match(WATCH_VERBS)[0] + '" (a verb a student can act on, not "goes in", "comes along", "carries", "applies")');
      if (/\bit\b/i.test(t) || BARE.test(t)) fail(w, k + ' has an "it", "this" or "that" that does not name its thing: "' + (t.match(/\bit\b/i) || t.match(BARE))[0] + '"');
      if (/:/.test(t)) fail(w, k + ' has a colon (one instruction, then the result, never "X: Y")'); });
    if (g > 6.5) fail(w, 'watch reads at grade ' + g.toFixed(1) + ': "' + mathOut(v).slice(0, 90) + '…"'); if (g > worstFK.g) worstFK = { g, id: id + ' (watch)' }; }
  if (e.say && !/^[A-Za-z]+(?:[- ][A-Za-z]+)*$/.test(e.say.replace(/<\/?i>/g, '')) || e.say && !/[A-Z]{2,}/.test(e.say)) fail(w, 'say is not a respelling with its stressed syllable in capitals: "' + e.say + '"');
  (e.see || []).forEach(s => { const k = X.cardOf(s); if (!GL[s] || !k) fail(w, 'see "' + s + '" is not in the glossary'); else if (k === id) fail(w, 'see "' + s + '" is the card itself'); });
  const h = X.card(id);
  if (!h || !tagsOk(h)) fail(w, 'X.card does not render whole');
  else { if (h.indexOf(e.word) < 0 || h.indexOf('id="xcard-t"') < 0 || h.indexOf('id="xcard-d"') < 0) fail(w, 'X.card has no title or no definition');
    const order = ['xc-more', 'xc-sym', 'xc-ex', 'xc-watch', 'xc-see'].filter(c => h.indexOf(c) >= 0).map(c => h.indexOf(c)); if (order.some((v, i) => i && v < order[i - 1])) fail(w, 'X.card has its sections out of order');
    const chips = (h.match(/data-xsee="/g) || []).length, want = (e.see || []).map(s => X.cardOf(s)).filter((s, i, a) => s && s !== id && a.indexOf(s) === i).length; if (chips !== want) fail(w, 'X.card has ' + chips + ' related chips for ' + want + ' related words');
    if (TIMES.test(h)) fail(w, 'X.card writes ×'); }
});
Object.keys(met).forEach(id => { if (!GL[id]) fail(met[id], 'the term "' + id + '" is met in the help but is not in the glossary'); else if (!X.cardOf(id) || !GL[X.cardOf(id)].more) fail(met[id], 'the term "' + id + '" opens no card'); });
const fams = Object.keys(C.help.terms), missing = fams.filter(f => !seen[f]);
missing.forEach(f => fail(f, 'never generated in ' + N + ' sets'));
const keys = Object.keys(fails);
keys.forEach(k => console.log('FAIL ' + k + (fails[k] > 1 ? ' (' + fails[k] + ' times)' : '')));
console.log('help: ' + N + ' sets, ' + parts + ' parts, ' + fams.length + ' families with help; ' + Object.keys(met).length + ' terms met, ' + cards + ' cards and ' + aliases + ' names for another card (the longest What it means ' + worstMore + ' words; ' + nWatch + ' Watch out items, the longest ' + worstWatch + ' words; the hardest reading grade ' + worstFK.g.toFixed(1) + ', ' + worstFK.id + ') — ' + (keys.length ? keys.length + ' problems' : 'every family meets the standard'));
process.exit(keys.length ? 1 : 0);
