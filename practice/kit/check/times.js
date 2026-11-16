/* Practice-test kit — no × for multiplication (15 Nov 2026).   node <kit>/check/times.js <unit folder> [sets]
   Croix's classroom rule: x is always a variable, so multiplication is written with a dot or parentheses, never ×. The kit's
   division hint wrote "Think: 3 × ? = 12" into every unit that used it (the A7 Unit 11 and M7 Unit 5 and 13 builders turned it
   into a dot in their own coaches). Now it is the kit's rule, checked here for everything a student reads:
   1. THE KIT'S OWN WORDS: every string the kit's scripts can put on a page (ui.js, pager.js, teacher.js, bank.js, nline.js, cgraph.js,
      explain.js, core.js, calc.js, approvals.js, bilingual.js, tex.js, keyset.js, the page build.py writes), comments left out,
      holds no × — except where the kit READS a student's × (a reader's character class, the TeX map, the keypad's vocabulary).
      check/hints.js reads the arithmetic hints themselves, over every kind and 296,000 cases.
   2. THE UNIT'S WORDS, through the unit interface over the sets (300 by default): every stem, part line, choice, named
      distractor, key, worked line (say and ex), Hint rung, walkthrough step (ask, options, reasons, hints, then), the coach's
      words for the key, for a wrong answer and for each wrong choice, and a typed part's paper choices.
   A unit built before the rule (core.js LEGACY_TIMES) is reported with its count and first example and passes; every other unit fails
   on one ×. Take a unit off LEGACY when it is rebuilt without ×. run.py runs this for every student page. */
const path = require('path'), fs = require('fs');
const KIT = path.join(__dirname, '..');
const dir = path.resolve(process.argv[2] || '.'), N = +(process.argv[3] || 300);
const TIMES = /[×✕✖]/;
const fails = [];
/* units whose own words used × before the rule (15 Nov 2026, found by this check): reported, not failed */
const LEGACY_IDS = require(path.join(KIT, 'core.js')).LEGACY_TIMES;   /* core.js keeps the list: those units' hints keep × too */
const LEGACY = {}; LEGACY_IDS.forEach(id => { LEGACY[id] = 'its own words use × (counted 15 Nov 2026)'; });

/* 1. the kit's own words */
const strip = src => src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:\\'"])\/\/[^\n]*/g, '$1');
const READS = [
  /\/(?:[^\/\n\\]|\\.)*\[[^\]\n]*[×✕✖][^\]\n]*\](?:[^\/\n\\]|\\.)*\/[gimsuy]*/g,      /* a regular expression that reads × */
  /'\\\\times'\s*:\s*'×'/g,                                                          /* bank.js: Cadence's TeX read as plain text */
  /'×'\s*:\s*'\\\\times '/g,                                                         /* tex.js: × typed by a unit, drawn by KaTeX */
  /LEGACY_TIMES\.indexOf\(UNIT_SEEN\) >= 0 \? ' × ' : ' · '/g,                       /* core.js: a unit built before the rule keeps its × hints */
  /label: '×'/g, /KSHOW = \{'×': '·'\}/g,                                            /* a key NAMED × (it types *), shown as · (ui.js KSHOW) */
  /\[\s*'−'\s*,\s*'×'\s*,/g, /\['×'\]/g, /label === '× 10\^'/g, /'× 10\^'/g, /'×'\s*,\s*'× 10\^'/g, /KORDER|KNOWN/g   /* the keypad's vocabulary: names of keys a unit may bring */
];
const KITFILES = ['ui.js', 'judge.js', 'pager.js', 'teacher.js', 'bank.js', 'nline.js', 'cgraph.js', 'explain.js', 'core.js', 'calc.js', 'approvals.js', 'bilingual.js', 'tex.js', 'keyset.js', 'build.py', 'lang/pt-BR.js'];
let kitN = 0;
for (const f of KITFILES) {
  const fp = path.join(KIT, f); if (!fs.existsSync(fp)) continue;
  let src = fs.readFileSync(fp, 'utf8');
  src = f.endsWith('.py') ? src.replace(/#[^\n]*/g, '').replace(/"""[\s\S]*?"""/g, '') : strip(src);
  src.split('\n').forEach((line, i) => {
    let l = line; READS.forEach(r => { l = l.replace(r, ''); });
    if (/KORDER|KNOWN|VOCAB/.test(line)) return;                                       /* the keypad's own list of key names */
    if (TIMES.test(l)) { kitN++; fails.push('the kit writes × — ' + f + ': ' + line.trim().slice(0, 160)); }
  });
}

/* 2. the unit's words */
const U = require(path.join(dir, 'unit.js')), V = U.view || {};
let NL = null; try { NL = require(path.join(KIT, 'nline.js')); } catch (e) {}
let CG = null; try { CG = require(path.join(KIT, 'cgraph.js')); } catch (e) {}
const partsOf = it => it.type === 'parts' ? it.parts : it.type === 'solo' ? [it.part] : [];
const tt = p => p.kind === 'mc' ? 'mc' : p.kind === 'nline' ? 'nline' : p.kind === 'cgraph' ? 'cgraph' : 'text';
let seen = 0, hits = 0; const ex = [];
const read = (where, h) => { if (h == null) return; if (typeof h === 'object') { try { h = JSON.stringify(h); } catch (e) { return; } } h = String(h); seen++;
  if (TIMES.test(h)) { hits++; if (ex.length < 6) ex.push(where + ': ' + h.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, 150)); } };
const tryRead = (where, f) => { let v; try { v = f(); } catch (e) { return; } if (Array.isArray(v)) v.forEach((x, i) => read(where, x)); else read(where, v); };
const steps = (where, list) => (list || []).forEach(s => { if (!s) return; read(where, s.say); read(where, s.ex); read(where, s.ask); read(where, s.hint); read(where, s.then);
  (s.opts || []).forEach(o => { read(where, o && o.label); read(where, o && o.why); }); });
const fb = (where, f) => { if (!f) return; (f.what || []).forEach(w => read(where, w)); read(where, f.rule); };
const ctx = { aShown: true, extra: false, mode: 'practice' };
for (let seed = 1; seed <= N; seed++) {
  let g; try { g = U.generate(seed); } catch (e) { continue; }
  g.sections.forEach((sec, si) => sec.items.forEach((it, ii) => {
    const W = 'set ' + seed + ' U·' + (si + 1) + '.' + (ii + 1);
    tryRead(W + ' stem', () => V.stem(it)); read(W + ' title', sec.title);
    const xs = it.type === 'mc' || it.type === 'multi' ? [{ x: it, type: it.type === 'multi' ? 'multi' : 'mc' }] : partsOf(it).map(p => ({ x: p, type: tt(p) }));
    xs.forEach(({ x, type }) => {
      if (type !== 'mc' && type !== 'multi' || x !== it) tryRead(W + ' line', () => V.line(x));
      if (x.opts) x.opts.forEach((o, k) => { tryRead(W + ' choice', () => V.opt(x, k)); tryRead(W + ' why', () => V.why ? V.why(x, k) : ''); });
      if (type === 'nline' && NL) { tryRead(W + ' key', () => NL.keyHtml(x)); tryRead(W + ' graph words', () => NL.say(x, NL.graphOf(x))); }
      else if (type === 'cgraph' && CG) { tryRead(W + ' key', () => CG.keyHtml(x)); tryRead(W + ' graph words', () => CG.say(x, CG.graphOf(x))); tryRead(W + ' kit rungs', () => JSON.stringify(CG.rungs(x))); }
      else tryRead(W + ' key', () => V.key(x));
      tryRead(W + ' start', () => V.start ? V.start(x, type) : '');
      try { steps(W + ' worked line', (U.solution(x, type, ctx) || []).map(s => s && Object.assign({}, s, { ex: s.ex != null && V.ex ? V.ex(x, s.ex, type) : s.ex }))); } catch (e) {}
      try { steps(W + ' walkthrough', U.walk(x, type, ctx)); } catch (e) {}
      try { const r = U.rungs ? U.rungs(x, type, ctx) : null; if (r) { read(W + ' Hint 1', r.notice); steps(W + ' Hint 2', [r.first]); steps(W + ' Hint 3', r.steps); } } catch (e) {}
      try {
        if (type === 'text') { const k = U.keyText(x), wrong = Array.isArray(k) ? k.map(() => '987654') : '987654';
          fb(W + ' coach', U.judge.text(x, k, ctx)); fb(W + ' coach', U.judge.text(x, wrong, ctx));
          if (U.choices) tryRead(W + ' paper choice', () => U.choices(x)); }
        else if (type === 'mc') x.opts.forEach((o, k) => fb(W + ' coach', U.judge.mc(x, k)));
        else if (type === 'multi') { fb(W + ' coach', U.judge.multi(x, [], 1)); x.opts.forEach((o, k) => fb(W + ' coach', U.judge.multi(x, [String(k)], 1))); }
      } catch (e) {}
    });
  }));
}
const legacy = LEGACY[U.id];
if (hits && !legacy) fails.push(U.id + ': ' + hits + ' of ' + seen + ' strings a student reads write × (write a dot or parentheses), e.g.\n  ' + ex.join('\n  '));
if (fails.length) { console.log('TIMES CHECK FAILED\n' + fails.slice(0, 30).join('\n')); process.exit(1); }
console.log('times: the kit writes no ×; ' + U.id + ' over ' + N + ' sets: ' + seen + ' strings read, ' + (hits ? hits + ' with × — ' + U.id + ' is on the kit\'s list of units built before the rule (' + legacy + '); reported, not failed. e.g. ' + ex[0] : 'none with ×'));
