/* Practice-test kit: the stability lock (Apple review W-2).  node lock.js <unit folder>
   Set numbers are promises ("everyone do set 4821"): for seeds 1–300 the questions of every set are hashed and compared with
   <unit>/sets.lock.json. Any change fails unless the unit's contentVersion was bumped — then the lock is written again, and
   the page clears saved answers for changed sets itself (each saved record carries its set's hash). */
const path = require('path'), fs = require('fs');
const dir = path.resolve(process.argv[2] || '.'), U = require(path.join(dir, 'unit.js')), K = require('../core.js');
const partsOf = it => it.type === 'parts' ? it.parts : it.type === 'solo' ? [it.part] : [it];
const sets = {};
for (let seed = 1; seed <= 300; seed++) {
  const g = U.generate(seed);
  sets[seed] = K.fnv1a(g.sections.map(s => s.items.map(it => partsOf(it).map(U.key).join(',')).join(';')).join('|')).toString(36);
}
const file = path.join(dir, 'sets.lock.json');
const old = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;
if (!old || old.contentVersion !== U.contentVersion) {
  fs.writeFileSync(file, JSON.stringify({ unit: U.id, contentVersion: U.contentVersion, sets }, null, 0) + '\n');
  console.log('lock written for ' + U.id + ' contentVersion ' + U.contentVersion + (old ? ' (was ' + old.contentVersion + ')' : ''));
  process.exit(0);
}
const changed = Object.keys(sets).filter(k => sets[k] !== old.sets[k]);
if (changed.length) { console.log('LOCK: ' + changed.length + ' of 300 sets changed (e.g. set ' + changed.slice(0, 5).join(', ') + ') but contentVersion is still ' + U.contentVersion + '. Bump it in unit.js if the change is meant.'); process.exit(1); }
console.log('lock: 300 sets unchanged (' + U.id + ' contentVersion ' + U.contentVersion + ')');
