/* The JavaScript half of plan/test_flow.py: kit/lib/flow.js must lay every scenario exactly as
 * kit/lib/flow.py did, and answer the console's questions about a period.
 *
 *   node plan/test_flow.js <cases.json>     (written and run by plan/test_flow.py)
 */
'use strict';
const fs = require('fs'), path = require('path');
const Flow = require(path.join(__dirname, '..', 'kit', 'lib', 'flow.js'));
const data = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
let ran = 0; const fails = [];
function check(ok, what) { ran++; if (!ok) fails.push(what); }
function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }

// ---- 1. the same scenarios as Python ------------------------------------------------------------
data.cases.forEach(function (c, n) {
  const flow = c.flow || data.flows[c.course];
  const got = Flow.project(Flow.lay(flow, { start: c.start || undefined, blocked: c.blocked, limit: c.limit }));
  if (!same(got, c.expect)) {
    let i = 0; while (i < got.length && i < c.expect.length && same(got[i], c.expect[i])) i++;
    check(false, `case ${n} (${c.name || c.course}, start ${JSON.stringify(c.start)}, limit ${c.limit}): first difference at row ${i}: JS ${JSON.stringify(got[i])} · Python ${JSON.stringify(c.expect[i])}`);
  } else check(true, '');
});
const laid = ran;

// ---- 1b. the as-run log, applied here as Python applies it -----------------------------------------
const applyLog = require(path.join(__dirname, 'applylog.js'));
(data.logcases || []).forEach(function (c, n) {
  const F = data.flows[c.course];
  const before = JSON.stringify(F);
  let G = null, err = null;
  try { G = applyLog(Flow, F, c.log); } catch (e) { err = e.message; }
  check(JSON.stringify(F) === before, `log ${n}: applyLog changed the flow it was given`);
  if (!c.ok) { check(err !== null, `log ${n} (${c.course}): Python refuses this log, JavaScript accepted it — ${JSON.stringify(c.log)}`); return; }
  if (err) { check(false, `log ${n} (${c.course}): Python honours this log, JavaScript refused it: ${err} — ${JSON.stringify(c.log)}`); return; }
  const got = Flow.project(Flow.lay(G));
  const blocked = Object.keys(G.blocked).sort().map(d => [d, G.blocked[d].kind, !!G.blocked[d].unrecorded]);
  const gone = [], free = []; G.items.forEach((it, k) => { if (it.gone) gone.push(k); if (it.free) free.push(k); });
  let i = 0; while (i < got.length && same(got[i], c.expect[i])) i++;
  check(same(got, c.expect), `log ${n} (${c.course}): the year differs at row ${i}: JS ${JSON.stringify(got[i])} · Python ${JSON.stringify(c.expect[i])} — ${JSON.stringify(c.log)}`);
  check(same(blocked, c.blocked) && same(gone, c.gone) && same(free, c.free), `log ${n} (${c.course}): days off, gone or free differ`);
});
const logged = ran - laid;

// ---- 2. where a period is -----------------------------------------------------------------------
['acc', 'on'].forEach(function (course) {
  const F = data.flows[course];
  const year = Flow.lay(F).rows;
  const decks = year.filter(r => r.src === 'item' && Flow.isDeck(r.entry));
  const exams = year.filter(r => r.src === 'item' && r.entry.examIn === 0);
  const rec = (row, did) => ({ on: row.date, did: did || 'lesson', index: row.index });
  // nothing recorded: the built plan stands
  decks.slice(0, 40).forEach(function (row) {
    const w = Flow.where(F, [], row.date);
    check(w.from === 'plan' && w.next && w.next.index === row.index && w.next.date === row.date && w.today.index === row.index,
      `${course}: with nothing recorded, ${row.date} is the plan's ${row.entry.code}`);
  });
  // taught on plan yesterday: today is the plan's next day, and nothing has moved
  for (let n = 0; n + 1 < Math.min(decks.length, 60); n++) {
    const a = decks[n], today = Flow.nextDay(F, a.date);
    const w = Flow.where(F, [rec(a)], today);
    const planToday = year.filter(r => r.date === today)[0];
    check(w.from === 'panel' && same(Flow.project({ rows: [w.today], dropped: [], left: [] })[0], Flow.project({ rows: [planToday], dropped: [], left: [] })[0]),
      `${course}: taught ${a.entry.code} on plan; the next day (${today}) should be the plan's`);
    check(w.inferred.length === 0, `${course}: a day inferred lost after ${a.entry.code} taught on plan`);
  }
  // taught today: the next lesson is not offered for today, and today reads as that lesson
  const a = decks[3], b = decks[4];
  let w = Flow.where(F, [rec(a)], a.date);
  check(w.today && w.today.index === a.index && w.next && w.next.index === b.index && w.next.date > a.date, `${course}: taught today — next is tomorrow's`);
  // a lesson the plan had yesterday and nobody opened: it is still next, the day counts as lost
  const c0 = decks[5], c1 = decks[6], c2 = decks[7];
  if (Flow.nextDay(F, c0.date) === c1.date && Flow.nextDay(F, c1.date) === c2.date) {
    w = Flow.where(F, [rec(c0)], c2.date);
    check(w.next && w.next.index === c1.index && w.next.date === c2.date && same(w.inferred, [c1.date]) && w.behind >= 1,
      `${course}: a planned lesson nobody opened stays next, one day behind — got ${w.next && w.next.entry.code} on ${w.next && w.next.date}, inferred ${w.inferred}, behind ${w.behind}`);
  }
  // three lesson days with nothing opened: the panel has not been used, so the built plan stands — and says what it last saw
  const far = decks[12];
  w = Flow.where(F, [rec(decks[5])], far.date);
  check(w.from === 'plan' && w.unseen > 2 && w.inferred.length === 0 && w.last.index === decks[5].index && w.next.index === far.index && w.next.date === far.date,
    `${course}: a panel unused for days falls back to the built plan — from ${w.from}, unseen ${w.unseen}, next ${w.next && w.next.entry.code}`);
  w = Flow.where(F, [rec(decks[5])], far.date, { maxGap: 99 });
  check(w.from === 'panel' && w.next.index === decks[6].index, `${course}: maxGap is the caller's to set`);
  // marked on the panel as a review day: today carries no lesson, the lesson is tomorrow's
  w = Flow.where(F, [rec(a), { on: b.date, did: 'review', index: -1 }], b.date);
  check(w.today && w.today.src === 'blocked' && w.today.entry.kind === 'extra' && w.next && w.next.index === b.index && w.next.date > b.date,
    `${course}: a day marked review on the panel pushes the lesson to the next day`);
  w = Flow.where(F, [rec(a), { on: b.date, did: 'none', index: -1 }], b.date);
  check(w.today && w.today.entry.kind === 'off' && w.today.entry.meets === false, `${course}: a day marked no class`);
  // marked with nothing else recorded: the plan, pushed by a day
  w = Flow.where(F, [{ on: b.date, did: 'review', index: -1 }], b.date);
  check(w.from === 'plan' && w.today.src === 'blocked' && w.next.index === b.index && w.next.date > b.date, `${course}: a marked day over the built plan`);
  // the days of a test have no deck: they are taken as run, and the next unit starts where the plan has it
  const x = exams[0];
  const lastBefore = decks.filter(r => r.date < x.date).pop();
  const firstAfter = decks.filter(r => r.date > x.date)[0];
  w = Flow.where(F, [rec(lastBefore)], firstAfter.date);
  check(w.next && w.next.index === firstAfter.index && w.next.date === firstAfter.date && w.inferred.length === 0,
    `${course}: test days between two decks are taken as run — next ${w.next && w.next.entry.code} on ${w.next && w.next.date}, wanted ${firstAfter.entry.code} on ${firstAfter.date}`);
  // the next test, with both its days
  w = Flow.where(F, [], year[0].date);
  check(w.exam && w.exam[0].index === x.index && w.exam[1] && Flow.nextDay(F, w.exam[0].date) === w.exam[1].date, `${course}: the next test and its second day`);
  // ahead: a lesson recorded before its plan day pulls everything after it earlier, never past a rule
  const e0 = decks[8], e1 = decks[10];
  w = Flow.where(F, [rec({ date: e0.date, index: e1.index })], Flow.nextDay(F, e0.date));
  check(w.next && w.next.index > e1.index && w.behind <= 0, `${course}: a class ahead of the plan is offered what follows, and is not behind`);
  // codes: a deck's own code, the plan's name for it, a merged day
  check(Flow.indexOf(F, decks[0].entry.code) === decks[0].index, `${course}: indexOf by code`);
});
const A = data.flows.acc;
const ta1 = A.items.findIndex(it => it.code === 'T-A1');
check(Flow.indexOf(A, '3.T1', 'T-A1') === ta1 && ta1 >= 0, 'acc: the deck\'s 3.T1 is the plan\'s T-A1');
check(Flow.indexOf(A, '4.02') === A.items.findIndex(it => it.code === '4.02+03'), 'acc: the deck\'s 4.02 is the plan\'s 4.02+03');
check(Flow.indexOf(A, '9.99') === -1, 'acc: an unknown code');
check(Flow.schoolDays(A, A.days[3], A.days[8]) === 5 && Flow.schoolDays(A, A.days[8], A.days[3]) === -5, 'schoolDays');

console.log(`flow.js: ${laid} scenarios laid as Python lays them, ${logged} log checks against Python, ${ran - laid - logged} console checks; ${fails.length} failed`);
fails.slice(0, 20).forEach(f => console.log('  FAIL', f));
process.exit(fails.length ? 1 : 0);
