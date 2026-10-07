#!/usr/bin/env node
/* The conformance test. Every repo that embeds room-reader.js runs this against ITS copy:
 *     node room/test.js [path/to/room-reader.js]
 * It loads the fixture rooms and asserts the answers below; a copy that drifts fails here. */
'use strict';
const fs = require('fs'), path = require('path'), assert = require('assert');
const here = __dirname;
const Room = require(path.resolve(process.argv[2] || path.join(here, 'room-reader.js')));
const list = JSON.parse(fs.readFileSync(path.join(here, 'benchmarks.json'), 'utf8'));
const spine = JSON.parse(fs.readFileSync(path.join(here, '..', 'spine', 'spine.json'), 'utf8'));
const fx = n => JSON.parse(fs.readFileSync(path.join(here, 'fixtures', n + '.json'), 'utf8'));
const NOW = Date.parse('2026-10-05T09:30:00-04:00');
let n = 0; const ok = (name, f) => { try { f(); n++; } catch (e) { console.error('FAIL', name, '\n  ', e.message); process.exitCode = 1; } };

ok('empty room: nothing known, nothing refused', () => {
  const r = Room.load({ extra: [{ name: 'x', room: fx('empty') }] });
  assert.strictEqual(r.unit('acc'), null); assert.strictEqual(r.bookmark(1), null); assert.strictEqual(r.age('tally'), Infinity);
});
ok('plan only: the plan answers the lesson', () => {
  const r = Room.load({ extra: [{ name: 'x', room: fx('plan-only') }] });
  const L = r.lessonFor('acc', '2026-10-05', 1, spine);
  // the plan moves with the class (4 Oct 2026), so what 5 October holds is read from the spine, not typed here
  const day = spine.days['2026-10-05'];
  assert.strictEqual(L.from, 'plan'); assert.strictEqual(L.lesson, day.acc.code); assert.deepStrictEqual(L.plan.benchmarks, day.acc.benchmarks);
  assert.ok(day.acc.code && day.on.code, 'the spine has a lesson for both courses on 5 October');
  assert.strictEqual(r.lessonFor('on', '2026-10-05', 2, spine).lesson, day.on.code);
  assert.strictEqual(r.plan(spine, '2026-10-12', 'acc').kind, 'holiday');
  assert.strictEqual(Room.nextSchoolDay(spine, '2026-10-09'), '2026-10-13');
});
ok('tally: unit and weakest in order', () => {
  const r = Room.load({ extra: [{ name: 'x', room: fx('tally') }] });
  assert.strictEqual(r.unit('acc'), 3); assert.strictEqual(r.unit('on'), 4);
  assert.deepStrictEqual(r.weak('acc', 2).map(w => w.benchmark), ['MA.8.NSO.1.3', 'MA.8.NSO.1.4']);
});
ok('panel: the bookmark beats the plan for that period only', () => {
  const r = Room.load({ extra: [{ name: 'x', room: fx('panel') }] });
  const L1 = r.lessonFor('acc', '2026-10-05', 1, spine), L3 = r.lessonFor('acc', '2026-10-05', 3, spine), L5 = r.lessonFor('on', '2026-10-05', 5, spine);
  assert.deepStrictEqual([L1.lesson, L1.stop, L1.from], ['3.06', 'ex2', 'panel']);
  assert.deepStrictEqual([L3.lesson, L3.stop], ['3.05', 'wb7']);
  assert.deepStrictEqual([L5.lesson, L5.from], [spine.days['2026-10-05'].on.code, 'plan']);
});
ok('panel: what each period actually did, oldest first, one course and one period at a time', () => {
  const r = Room.load({ extra: [{ name: 'x', room: fx('panel') }] });
  assert.deepStrictEqual(r.asRun('acc', 1).map(x => [x.on, x.did, x.lesson || null]), [['2026-09-30', 'lesson', '3.06'], ['2026-10-02', 'review', null], ['2026-10-05', 'lesson', '3.T1']]);
  assert.strictEqual(r.asRun('acc').length, 4); assert.strictEqual(r.asRun('on', 2).length, 1); assert.deepStrictEqual(r.asRun('on', 4), []);
  assert.deepStrictEqual(Room.load({ extra: [{ name: 'x', room: fx('empty') }] }).asRun('acc', 1), []);
});
ok('merge: newest copy per part, parts from different copies', () => {
  const r = Room.load({ extra: [{ name: 'a', room: fx('conflict-older') }, { name: 'b', room: fx('tally') }, { name: 'c', room: fx('panel') }] });
  assert.strictEqual(r.unit('acc'), 3);                      // tally from b (newer than a)
  assert.strictEqual(r.source.tally, 'b');
  assert.strictEqual(r.bookmark(1).stop, 'wb1');             // panel from a (15:00 beats 13:02)
  assert.strictEqual(r.source.panel, 'a');
  assert.strictEqual(r.bookmark(3), null);                   // never merged across copies
});
ok('stale: age is reported, nothing is hidden', () => {
  const r = Room.load({ extra: [{ name: 'x', room: fx('stale') }] });
  // measured against the clock the reader itself reads. This used the fixed NOW above, so the check began to fail on its own
  // two days after that date (7 October 2026) with nothing changed — a check with a date in it is a check with a fuse.
  const days = (Date.now() - Date.parse('2026-09-01T08:00:00-04:00')) / 864e5;
  assert.ok(Math.abs(r.age('tally') - days) < 2 && r.age('tally') > 30);
});
ok('newer version: refused unless allowed, then only known fields', () => {
  assert.throws(() => Room.load({ extra: [{ name: 'x', room: fx('newer-version') }] }), /newer than this reader/);
  const r = Room.load({ extra: [{ name: 'x', room: fx('newer-version') }], allowProblems: true });
  assert.strictEqual(r.unit('acc'), 3); assert.strictEqual(r.room.future, undefined);
});
ok('tier guard: a name in an open part is refused', () => {
  assert.throws(() => Room.load({ extra: [{ name: 'x', room: fx('planted-name') }] }), /person-shaped key in an open part/);
});
ok('tier guard: a score in the roster part is refused', () => {
  assert.throws(() => Room.load({ extra: [{ name: 'x', room: fx('planted-score') }] }), /standing-shaped key in the roster part/);
});
ok('roster: names allowed in the roster part', () => {
  const r = Room.load({ extra: [{ name: 'x', room: fx('roster') }] });
  assert.strictEqual(r.room.roster.periods['1'].students[1].nick, 'B'); assert.deepStrictEqual(r.problems, []);
});
ok('readable code: round trip, order kept', () => {
  const t = fx('tally').tally, line = Room.code.toReadable(t);
  assert.strictEqual(line, 'A3 W 8NSO13 8NSO14 7NSO11 O4 W 7GR13 7GR11');
  const back = Room.code.fromReadable(line);
  assert.strictEqual(back.courses.acc.unit, 3); assert.strictEqual(back.courses.on.unit, 4);
  assert.strictEqual(Room.weakest(back, 'acc', 1)[0].benchmark, 'MA.8.NSO.1.3');
  assert.strictEqual(Room.weakest(back, 'on', 1)[0].benchmark, 'MA.7.GR.1.3');
  assert.throws(() => Room.code.fromReadable('A3 O4 W 9ZZ99'), /cannot read/);
  assert.strictEqual(Room.weakest(Room.code.fromReadable('A3 W 7NSO11 O4 W 7GR13'), 'acc', 1)[0].benchmark, 'MA.7.NSO.1.1');
});
ok('compact code: round trip, check character, list version', () => {
  const t = fx('tally').tally, code = Room.code.toCompact(t, list);
  assert.ok(/^[0-9A-Z*~$=-]+$/.test(code) && code.length >= 16, code);
  const back = Room.code.fromCompact(code, list);
  assert.strictEqual(back.courses.acc.unit, 3); assert.strictEqual(back.courses.on.unit, 4); assert.strictEqual(back.listVersion, list.version);
  assert.strictEqual(Room.weakest(back, 'acc', 1)[0].benchmark, 'MA.8.NSO.1.3');
  assert.strictEqual(back.courses.acc.benchmarks['MA.8.NSO.1.3'].bucket, 1);        // 0.40 → bucket 1
  assert.strictEqual(back.courses.acc.benchmarks['MA.7.NSO.1.1'].bucket, 3);        // 0.81 → bucket 3
  // a typo is caught by the check character; a lower-case, O-for-0 entry is forgiven
  const typo = code.slice(0, 3) + (code[3] === 'A' ? 'B' : 'A') + code.slice(4);
  assert.throws(() => Room.code.fromCompact(typo, list), /check character/);
  assert.strictEqual(Room.code.fromCompact(code.toLowerCase().replace(/0/g, 'o'), list).courses.acc.unit, 3);
  // a code made against another list version decodes units but refuses to place benchmarks
  const other = Room.code.fromCompact(code, { version: list.version + 1, codes: list.codes });
  assert.ok(other.listMismatch); assert.deepStrictEqual(other.courses.acc.benchmarks, {});
  // the reader loads it as the tally part
  const r = Room.load({ code: code, list: list });
  assert.strictEqual(r.unit('on'), 4); assert.strictEqual(r.source.tally, 'code');
  assert.strictEqual(Room.code.parse('A5 O6').courses.on.unit, 6);
});
ok('window sources: drive file + panel file + spine', () => {
  const win = { ROOM: fx('tally'), ROOM_PANEL: fx('panel'), SPINE: spine };
  const r = Room.load({ win });
  assert.strictEqual(r.source.tally, 'drive'); assert.strictEqual(r.source.panel, 'drive.panel'); assert.strictEqual(r.source.plan, 'build');
  assert.strictEqual(r.lessonFor('acc', '2026-10-05', 1, spine).lesson, '3.06');
});
ok('spine: every period on the bell maps to a course or planning', () => {
  const d = spine.days['2026-10-05'];
  d.periods.forEach(p => assert.ok(String(p.period) in spine.periods, 'period ' + p.period));
  assert.strictEqual(spine.periods['1'], 'acc'); assert.strictEqual(spine.periods['2'], 'on');
  assert.strictEqual(spine.benchmarkList.version, list.version); assert.strictEqual(spine.benchmarkList.count, list.codes.length);
});
console.log(`room conformance: ${n} checks passed, reader v${Room.VERSION}, benchmark list v${list.version}, spine of ${Object.keys(spine.days).length} days`);
