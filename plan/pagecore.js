/* What the phone's plan page shows, worked out from the spine's flow and the days logged on the page.
 * Pure functions, so plan/test_page.js can hold them to the spine without a browser.
 *
 *   PlanCore.view(DATA, course, entries, today, Flow, applyLog) → the year for one course
 *
 * DATA is what plan/make_page.py writes into the page (the flows, each lesson's benchmarks and IXL
 * skills, the school days' week colours, holidays, quarter ends). `entries` are the days logged on
 * the page: [{course, on, what: 'review' | 'off' | 'lesson', lesson, note}].
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PlanCore = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var DECK = ['lesson', 'thread', 'review'];
  function has(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }
  function quarter(DATA, d) { for (var i = 0; i < DATA.quarters.length; i++) if (d <= DATA.quarters[i].end) return DATA.quarters[i].name; return DATA.quarters[DATA.quarters.length - 1].name; }
  function codes(x) { return (x || []).map(function (s) { return s[1]; }).join(' '); }

  /* Is a logged day already in the plan the page was built from? */
  function inBuild(flow, laidAt, e) {
    if (e.what === 'lesson') return laidAt[e.lesson] === e.on;
    return has(flow.blocked || {}, e.on);
  }

  function view(DATA, course, entries, today, Flow, applyLog) {
    var C = DATA.courses[course], built = C.flow, out = { course: course, error: null };
    var builtAt = {};
    Flow.lay(built).rows.forEach(function (r) { if (r.src === 'item' && r.entry.code) builtAt[r.entry.code] = r.date; });
    var mine = (entries || []).filter(function (e) { return e.course === course; });
    out.baked = mine.filter(function (e) { return inBuild(built, builtAt, e); });
    out.pending = mine.filter(function (e) { return !inBuild(built, builtAt, e); });
    var flow = built;
    if (out.pending.length) {
      try {
        flow = applyLog(Flow, built, out.pending.map(function (e) {
          return { date: e.on, what: e.what === 'lesson' ? e.lesson : e.what, note: e.note || (e.what === 'review' ? 'Extra review day' : e.what === 'off' ? 'No class' : '') };
        }));
      } catch (err) { out.error = String(err.message || err).replace(/^as-run log: /, ''); flow = built; }
    }
    var res = Flow.lay(flow), byDate = {};
    out.pending.forEach(function (e) { byDate[e.on] = e; });
    var rows = res.rows.map(function (r) {
      var e = r.entry, d = (e.code && C.detail[e.code]) || {};
      return { date: r.date, src: r.src, index: r.index, kind: e.kind, code: e.code || null, title: e.title || '', unit: e.unit === undefined ? null : e.unit,
        base: r.src === 'item' ? (e.base || null) : null, moved: r.src === 'item' && e.base ? Flow.schoolDays(flow, e.base, r.date) : 0,
        deck: r.src === 'item' && DECK.indexOf(e.kind) >= 0, exam: r.src === 'item' && e.examIn === 0,
        meets: !(r.src === 'blocked' && e.meets === false), unrecorded: !!e.unrecorded,
        b: d.b || [], x: d.x || [], due: null, logged: !out.error && has(byDate, r.date) ? byDate[r.date] : null };
    });
    // IXL: lessons in a row with the same skills are one assignment, due the first day the class meets after the last of them
    var seq = rows.filter(function (r) { return r.src !== 'blocked'; });
    seq.forEach(function (r, i) {
      if (!r.x.length) return;
      var end = i;
      while (end + 1 < seq.length && codes(seq[end + 1].x) === codes(r.x)) end++;
      var after = rows.indexOf(seq[end]) + 1;
      for (var j = after; j < rows.length; j++) if (rows[j].meets && rows[j].code !== 'PM3') { r.due = rows[j].date; break; }
    });
    out.rows = rows;
    out.next = rows.filter(function (r) { return r.date >= today && r.deck; })[0] || null;
    out.today = rows.filter(function (r) { return r.date === today; })[0] || null;
    out.behind = out.next ? out.next.moved : 0;
    out.exams = [];
    rows.forEach(function (r, i) {
      if (!r.exam) return;
      var second = null;
      for (var j = i + 1; j < rows.length; j++) if (rows[j].src === 'item') { second = rows[j]; break; }
      var q = quarter(DATA, r.date), q0 = r.base ? quarter(DATA, r.base) : q;
      out.exams.push({ unit: r.unit, title: r.title, d1: r.date, d2: second ? second.date : null, base: r.base, moved: r.moved, quarter: q, baseQuarter: q0, crossed: q !== q0, past: r.date < today });
    });
    var content = rows.filter(function (r) { return r.src === 'item' && (r.deck || r.kind === 'exam'); });
    out.lastContent = content.length ? content[content.length - 1].date : null;
    out.pastEnd = out.lastContent ? flow.days.filter(function (d) { return d > DATA.contentEnds && d <= out.lastContent; }).length : 0;
    out.flexLeft = flow.items.filter(function (it, k) { return it.absorb && !it.gone && res.dropped.indexOf(k) < 0; }).length;
    out.flexUsed = res.dropped.length;
    out.left = res.left.length;
    out.lessons = flow.items.map(function (it, k) { return { index: k, code: it.code, title: it.title, kind: it.kind, unit: it.unit, gone: !!it.gone }; })
      .filter(function (it) { return (it.kind === 'lesson' || it.kind === 'thread') && it.code; });
    return out;
  }

  /* The weeks of the year, for the list: [{monday, colour, days: [{date, holiday | row}]}] from `from` on. */
  function weeks(DATA, v, from) {
    var byDate = {}, out = [], cur = null;
    v.rows.forEach(function (r) { byDate[r.date] = r; });
    var all = Object.keys(DATA.days).concat(Object.keys(DATA.holidays)).sort().filter(function (d, i, a) { return a.indexOf(d) === i && d >= from; });
    all.forEach(function (d) {
      var p = d.split('-').map(Number), dt = new Date(Date.UTC(p[0], p[1] - 1, p[2])), wd = (dt.getUTCDay() + 6) % 7;
      var mon = new Date(dt.getTime() - wd * 864e5).toISOString().slice(0, 10);
      if (!cur || cur.monday !== mon) { cur = { monday: mon, colour: null, days: [] }; out.push(cur); }
      if (has(DATA.holidays, d)) cur.days.push({ date: d, holiday: DATA.holidays[d] });
      else if (has(byDate, d)) { cur.days.push({ date: d, row: byDate[d], wed: !!(DATA.days[d] && DATA.days[d].wed) }); if (DATA.days[d]) cur.colour = DATA.days[d].week; }
    });
    return out.filter(function (w) { return w.days.length; });
  }

  return { view: view, weeks: weeks, quarter: quarter };
});
