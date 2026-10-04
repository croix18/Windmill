/* The as-run log, applied in the browser: kit/lib/flow.py's `apply_log` in JavaScript.
 *
 *   applyLog(Flow, flow, log, titles?)  → a new flow (the one passed in is not changed), or throws
 *
 * `flow` is a course's flow as the spine publishes it (already carrying the log the build knew);
 * `log` is more of the same lines — [{date, what, note}], `what` being `review`, `off` or the code of
 * the lesson the class began that day. The phone's plan page uses it to show what a day logged
 * there does to the year before any session has put it in the course's as-run CSV; when a session
 * does, the calendar tool runs the Python and must arrive at the same year. plan/test_flow.py
 * holds the two to each other on random logs.
 *
 * It lives here and not in kit/lib/flow.js because the consoles do not need it and the kit was not
 * to change the night before its first day in class (4 Oct 2026). Move it into the kit at the next
 * kit change.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.applyLog = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  function has(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }
  function isDate(s) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(s))) return false;
    var p = s.split('-').map(Number), d = new Date(Date.UTC(p[0], p[1] - 1, p[2]));
    return d.getUTCFullYear() === p[0] && d.getUTCMonth() === p[1] - 1 && d.getUTCDate() === p[2];
  }
  return function applyLog(Flow, flow, log, titles) {
    flow = JSON.parse(JSON.stringify(flow));
    titles = titles || {};
    var T = { review: titles.review || 'Extra review day', off: titles.off || 'No class' };
    var days = {}, items = flow.items, anchors = [];
    flow.days.forEach(function (d) { days[d] = true; });
    var off = flow.blocked = flow.blocked || {};
    (log || []).map(function (e, i) { return [e, i]; })
      .sort(function (a, b) { return a[0].date < b[0].date ? -1 : a[0].date > b[0].date ? 1 : a[1] - b[1]; })
      .forEach(function (pair) {
        var e = pair[0], d = e.date, what = e.what;
        if (!isDate(d)) throw new Error('as-run log: ' + JSON.stringify(d) + ' is not a date (YYYY-MM-DD)');
        if (!has(days, d)) throw new Error('as-run log: ' + d + ' is not a school day on this calendar (a weekend, a holiday, or outside the year)');
        if (has(off, d) || anchors.some(function (a) { return a[0] === d; })) throw new Error('as-run log: ' + d + ' is listed twice');
        if (what === 'review') off[d] = { kind: 'extra', code: null, title: e.note || T.review, meets: true };
        else if (what === 'off') off[d] = { kind: 'off', code: null, title: e.note || T.off, meets: false };
        else {
          var hits = [];
          items.forEach(function (it, k) { if (it.code === what) hits.push(k); });
          if (hits.length !== 1) throw new Error('as-run log: ' + d + ': ' + JSON.stringify(what) + ' is not `review`, `off`, or one lesson\'s code in the sequence');
          anchors.push([d, hits[0]]);
        }
      });
    var prev = '';
    anchors.forEach(function (a) {
      var d = a[0], k = a[1], code = items[k].code, placed = false;
      for (var n = flow.days.length + items.length; n > 0; n--) {
        var at = {};
        Flow.lay(flow).rows.forEach(function (r) { if (r.src === 'item') at[r.index] = r.date; });
        if (at[k] === d) { placed = true; break; }
        if (has(at, k) && at[k] < d) {                        // the sequence gets there early: a day went missing before the anchor
          var free = flow.days.filter(function (x) { return prev < x && x < d && !has(off, x); });
          if (!free.length) throw new Error('as-run log: ' + code + ' cannot begin on ' + d + ': no free school day before it to account for the delay');
          off[free[free.length - 1]] = { kind: 'extra', code: null, meets: true, unrecorded: true,
            title: 'A day off the plan (the log does not say which day, or why)' };
          continue;
        }
        var pending = [];                                     // the class is ahead: what lay between was covered some other day
        for (var j = 0; j < k; j++) if (!items[j].gone && (!has(at, j) || at[j] >= d)) pending.push(j);
        pending.forEach(function (j) { items[j].gone = 'covered before ' + d + ' (doubled up or skipped; the log does not say which day)'; });
        if (!pending.length) {
          if (items[k].free || items[k].gone) throw new Error('as-run log: ' + code + ' cannot begin on ' + d + '; the sequence puts it on ' + at[k]);
          items[k].free = true;                               // the log outranks the rules: it happened on that day
        }
      }
      if (!placed) throw new Error('as-run log: could not place ' + code + ' on ' + d);
      prev = d;
    });
    return flow;
  };
});
