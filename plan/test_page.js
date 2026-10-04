/* The phone's plan page, held to the spine: what plan/pagecore.js shows for the built plan is the
 * spine's own days and due dates, and a day logged on the page moves the year as the engine says.
 *
 *   node plan/test_page.js        (after python3 plan/make_page.py; tools/check.sh runs both)
 */
'use strict';
const fs = require('fs'), path = require('path');
const Flow = require(path.join(__dirname, '..', 'kit', 'lib', 'flow.js'));
const applyLog = require(path.join(__dirname, 'applylog.js'));
const Core = require(path.join(__dirname, 'pagecore.js'));
const DATA = JSON.parse(fs.readFileSync(path.join(__dirname, 'out', 'data.json'), 'utf8'));
const SPINE = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'spine', 'spine.json'), 'utf8'));
let ran = 0; const fails = [];
const check = (ok, what) => { ran++; if (!ok) fails.push(what); };
const view = (c, entries, today) => Core.view(DATA, c, entries || [], today || '2026-10-05', Flow, applyLog);

for (const c of ['on', 'acc']) {
  const v = view(c);
  check(!v.error && v.pending.length === 0, `${c}: the built plan shows with nothing pending`);
  // every day the page shows is the spine's day, and every due date is the spine's
  let days = 0, dues = 0;
  for (const r of v.rows) {
    const s = SPINE.days[r.date] && SPINE.days[r.date][c]; days++;
    check(s && s.kind === r.kind && (s.code || null) === r.code && s.title === r.title, `${c} ${r.date}: page ${r.kind} ${r.code}, spine ${s && s.kind} ${s && s.code}`);
    if (s && s.ixl.length) {
      dues++;
      check(JSON.stringify(s.ixl.map(x => x.code)) === JSON.stringify(r.x.map(x => x[1])), `${c} ${r.date} ${r.code}: the page's IXL skills are not the spine's`);
      check(s.ixl.every(x => x.due === r.due), `${c} ${r.date} ${r.code}: page says due ${r.due}, spine says ${s.ixl.map(x => x.due)}`);
    } else if (s) check(r.x.length === 0, `${c} ${r.date}: the page lists IXL the spine does not`);
  }
  check(days === DATA.courses[c].flow.days.length && dues > 30, `${c}: ${days} days and ${dues} assignments compared`);
  // the tests: one per unit, both days, in order
  check(v.exams.length >= 9 && v.exams.every(x => x.d2 && Flow.nextDay(DATA.courses[c].flow, x.d1) === x.d2), `${c}: every test has its two days`);
  check(v.next && v.next.date === '2026-10-05' && v.behind === 2, `${c}: Monday 5 October is the next lesson, two school days behind — got ${v.next && v.next.code} on ${v.next && v.next.date}, behind ${v.behind}`);
  // a review day logged for Tuesday: everything after it moves, and the page says one day is pending
  const tue = '2026-10-06', was = v.rows.find(r => r.date === tue);
  const w = view(c, [{ course: c, on: tue, what: 'review', note: 'Catch-up' }]);
  const now = w.rows.find(r => r.date === tue), moved = w.rows.find(r => r.code === was.code);
  check(!w.error && w.pending.length === 1 && now.kind === 'extra' && now.title === 'Catch-up' && now.logged && moved.date > tue, `${c}: a review day logged for ${tue} pushes ${was.code} on`);
  // the same day logged for the OTHER course changes nothing here
  const other = c === 'on' ? 'acc' : 'on';
  check(view(c, [{ course: other, on: tue, what: 'off' }]).pending.length === 0, `${c}: the other course's log is not this course's`);
  // a day the build already has is not pending
  const built = Object.keys(DATA.courses[c].flow.blocked)[0];
  const b = view(c, [{ course: c, on: built, what: 'off' }]);
  check(b.pending.length === 0 && b.baked.length === 1 && !b.error, `${c}: a day already in the build is not pending`);
  // "we began this lesson" a day late: the lesson is on that day, and the year is behind by one more
  const L = v.next, late = Flow.nextDay(DATA.courses[c].flow, L.date);
  const a = view(c, [{ course: c, on: late, what: 'lesson', lesson: L.code }]);
  check(!a.error && a.rows.find(r => r.code === L.code).date === late && a.rows.find(r => r.date === L.date).kind === 'extra', `${c}: ${L.code} begun on ${late} is laid there`);
  // a day that cannot be honoured: the built plan stands and the reason is given
  const bad = view(c, [{ course: c, on: '2026-10-10', what: 'review' }]);
  check(bad.error && /not a school day/.test(bad.error) && bad.rows.length === v.rows.length && bad.rows.every(r => !r.logged), `${c}: a Saturday is refused with its reason`);
  // the weeks: Monday-headed, coloured, holidays in place
  const ws = Core.weeks(DATA, v, '2026-10-05');
  check(ws[0].monday === '2026-10-05' && /Teal/.test(ws[0].colour) && ws[0].days.length === 5, `${c}: the week of 5 October`);
  check(ws[1].days[0].holiday && ws[1].days[0].date === '2026-10-12', `${c}: 12 October is a holiday in its week`);
}
console.log(`plan page: ${ran} checks against the spine, ${fails.length} failed`);
fails.slice(0, 15).forEach(f => console.log('  FAIL', f));
process.exit(fails.length ? 1 : 0);
