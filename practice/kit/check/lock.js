/* Practice-test kit: the stability lock (Apple review W-2).  node lock.js <unit folder>
   Set numbers are promises ("everyone do set 4821"; the number on a key reopens that paper and its answers): the questions of
   every set are hashed and compared with <unit>/sets.lock.json. Any change fails unless the unit's contentVersion was bumped —
   then the lock is written again, and the page clears saved answers for changed sets itself (each saved record carries its
   set's hash).
   Which sets: 1–300, and since 14 Nov 2026 (Croix: "ensure all the test codes are valid and accurate. Harden that system across
   the whole project") 300 more spread evenly from 301 to 99999 (`wide`) — a make-up's set is any number up to 99999, and a
   change that only moved high numbers went unseen. A lock from before is checked on its 300 first, then given its `wide`.
   check/set_page.js holds a real browser to the same file, so a set is the same set on every device. */
const path = require('path'), fs = require('fs');
const dir = path.resolve(process.argv[2] || '.'), U = require(path.join(dir, 'unit.js')), K = require('../core.js');
const partsOf = it => it.type === 'parts' ? it.parts : it.type === 'solo' ? [it.part] : [it];
const hash = seed => K.fnv1a(U.generate(seed).sections.map(s => s.items.map(it => partsOf(it).map(U.key).join(',')).join(';')).join('|')).toString(36);
const WIDE = Array.from({ length: 300 }, (_, i) => 301 + Math.round(i * (99999 - 301) / 299));
const sets = {}, wide = {};
for (let seed = 1; seed <= 300; seed++) sets[seed] = hash(seed);
WIDE.forEach(seed => { wide[seed] = hash(seed); });
/* the same set twice is the same set: nothing a generator reads may change between two calls */
for (const seed of [1, 37, 4821, 99999]) if (hash(seed) !== hash(seed)) { console.log('LOCK: set ' + seed + ' is not the same set when it is made twice'); process.exit(1); }
const file = path.join(dir, 'sets.lock.json');
const write = () => fs.writeFileSync(file, JSON.stringify({ unit: U.id, contentVersion: U.contentVersion, sets, wide }, null, 0) + '\n');
const old = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;
if (!old || old.contentVersion !== U.contentVersion) {
  write();
  console.log('lock written for ' + U.id + ' contentVersion ' + U.contentVersion + (old ? ' (was ' + old.contentVersion + ')' : ''));
  process.exit(0);
}
const changed = Object.keys(sets).filter(k => sets[k] !== old.sets[k]);
if (changed.length) { console.log('LOCK: ' + changed.length + ' of 300 sets changed (e.g. set ' + changed.slice(0, 5).join(', ') + ') but contentVersion is still ' + U.contentVersion + '. Bump it in unit.js if the change is meant.'); process.exit(1); }
if (!old.wide) { write(); console.log('lock: 300 sets unchanged; 300 more from 301 to 99999 now held (' + U.id + ' contentVersion ' + U.contentVersion + ')'); process.exit(0); }
const changedW = Object.keys(wide).filter(k => wide[k] !== old.wide[k]);
if (changedW.length) { console.log('LOCK: ' + changedW.length + ' of the 300 sets from 301 to 99999 changed (e.g. set ' + changedW.slice(0, 5).join(', ') + ') but contentVersion is still ' + U.contentVersion + '. Bump it in unit.js if the change is meant.'); process.exit(1); }
console.log('lock: 600 sets unchanged, 1–300 and 300 from 301 to 99999 (' + U.id + ' contentVersion ' + U.contentVersion + ')');
