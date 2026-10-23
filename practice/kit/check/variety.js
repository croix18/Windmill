/* Practice-test kit: the variety floor.  node variety.js <unit folder> [--all]

   Ruling 49 (Croix, 22 Oct 2026): "the test will just pick a random set" — and then: "Is there a way I can add in that
   variation factor? I really love the current method … Get the exact copy of the test and slam the problems til it becomes
   easy." A unit test is a set drawn from the practice page, and a student who practises ten sets must not have met the
   test's own questions already. So every question part has to come in many versions: over set numbers 1 … seeds, each part
   needs at least `floor` different versions.

   A version is what the student works with: the numbers and symbols of the question as the page shows it (the item's stem,
   its figure, the part's line, and the choices in any order), with the words taken out. So a new name or object, other
   letters for the variable, or the same choices shuffled is not a new version; new numbers are. (Without a view, the unit's
   key is used.)

   unit.json may set  "variety": {"floor": 100, "seeds": 20000, "allow": {"3.2b": "why this part cannot be wider"}}
   (defaults: floor 100, seeds 20000 — a sample of the 99,999 set numbers; a part that clears the floor on the sample clears
   it on all of them). `--all` counts all 99,999. A part is named section.question[letter], as on the page. An allowed part
   is reported, never failed; its reason is the record of why. */
const path = require('path'), fs = require('fs');
const dir = path.resolve(process.argv[2] || '.'), U = require(path.join(dir, 'unit.js'));
const cfg = JSON.parse(fs.readFileSync(path.join(dir, 'unit.json'), 'utf8')).variety || {};
const FLOOR = cfg.floor || 100, SEEDS = process.argv.includes('--all') ? 99999 : (cfg.seeds || 20000), ALLOW = cfg.allow || {};
const partsOf = it => it.type === 'parts' ? it.parts : it.type === 'solo' ? [it.part] : [it];
const V = U.view || null, call = (f, ...a) => { try { return f ? String(f(...a) || '') : ''; } catch (e) { return ''; } };
/* the page's text without its words: tags and entities out, letters out (a space each, so 5.6E8 stays 5.6 8), spaces squeezed */
const bare = h => String(h || '').replace(/<[^>]*>/g, ' ').replace(/&[a-z]+;|&#\d+;/gi, ' ').replace(/[A-Za-zÀ-ÖØ-öø-ÿ]+/g, ' ').replace(/\s+/g, ' ').trim();
function version(it, p) {
  if (!V) return U.key(p);
  const own = it.type === 'parts' || it.type === 'solo';
  const head = [call(V.stem, it), call(V.figure, it), own ? call(V.line, p) : ''].map(bare).join(' | ');
  const opts = Array.isArray(p.opts) ? p.opts.map((o, k) => bare(V.opt ? call(V.opt, p, k) : o)).sort().join(' ; ') : '';
  return head + ' || ' + opts;
}
const seen = new Map(), t0 = Date.now();
for (let seed = 1; seed <= SEEDS; seed++) {
  U.generate(seed).sections.forEach((s, si) => s.items.forEach((it, ii) => {
    const ps = partsOf(it);
    ps.forEach((p, pi) => {
      const lab = (si + 1) + '.' + (ii + 1) + (ps.length > 1 ? String.fromCharCode(97 + pi) : '');
      (seen.get(lab) || seen.set(lab, new Set()).get(lab)).add(version(it, p));
    });
  }));
}
const rows = [...seen].map(([lab, s]) => [lab, s.size]);
const thin = rows.filter(([lab, n]) => n < FLOOR && !ALLOW[lab]), allowed = rows.filter(([lab, n]) => n < FLOOR && ALLOW[lab]);
const fewest = rows.slice().sort((a, b) => a[1] - b[1]).slice(0, 5).map(([l, n]) => l + ' ' + n).join(', ');
console.log(`variety: ${U.id}, ${rows.length} parts over set numbers 1–${SEEDS} (${Math.round((Date.now() - t0) / 1000)} s); fewest: ${fewest}`);
for (const [lab, n] of allowed) console.log(`  allowed under the floor: ${lab} (${n} versions) — ${ALLOW[lab]}`);
if (process.argv.includes('--list')) for (const [lab, n] of rows) console.log(`  ${lab} ${n}`);
if (thin.length) {
  console.log(`VARIETY: ${thin.length} part(s) under the floor of ${FLOOR}: ` + thin.map(([l, n]) => `${l} has ${n}`).join(', ') +
    '. Widen their numbers (the same question, more versions), or allow one in unit.json "variety" with the reason it cannot be wider.');
  process.exit(1);
}
console.log(`variety: every part has at least ${FLOOR} versions`);
