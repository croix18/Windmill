/* The plan's engine, for the panel: lay a course's sequence onto the school days it actually has.
 *
 * This is lib/flow.py's `lay` in JavaScript — the same rules, read from the same data (the `flow`
 * each course publishes in Windmill's spine) — plus what the console asks of it: where a period
 * really is, and what the rest of the year looks like from there. Windmill's plan/test_flow.py
 * holds the two engines to each other; change one, change the other, run the test.
 *
 *   Flow.lay(flow, {start: {index, date, tail}, blocked: {...}, limit: n})  → {rows, dropped, left}
 *   Flow.where(flow, records, today, {decks: [...]})                        → where a period is
 *
 * Works as a browser script (window.Flow) and as a Node module. No dependencies.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Flow = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var V = 1;
  var DECK_KINDS = ['lesson', 'thread', 'review'];           // days taught from a deck; a test or a spiral day is not

  function utc(iso) { var p = iso.split('-'); return Date.UTC(+p[0], +p[1] - 1, +p[2]); }
  function weekday(iso) { return (new Date(utc(iso)).getUTCDay() + 6) % 7; }   // Monday 0 … Friday 4
  function gap(a, b) { return Math.round((utc(b) - utc(a)) / 864e5); }
  function has(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }
  function copy(o) { var c = {}; Object.keys(o).forEach(function (k) { c[k] = o[k]; }); return c; }

  function lay(flow, opts) {
    opts = opts || {};
    var days = flow.days, items = flow.items, rules = flow.rules, start = opts.start || {};
    var off = copy(flow.blocked || {});
    Object.keys(opts.blocked || {}).forEach(function (d) { off[d] = opts.blocked[d]; });
    var k = start.index || 0, tailN = start.tail || 0, first = start.date || null;
    var span = days.filter(function (d) { return !first || d >= first; });
    var avail = span.filter(function (d) { return !has(off, d); });
    var breaks = (flow.breaks || []).slice().sort();
    var ex = rules.exam || {}, examDays = ex.weekdays || [0, 3], minBefore = ex.minBeforeBreak || 0, fill = rules.filler;

    function beforeBreak(a) {                                 // teaching days from avail[a] to the next break
      var b = null, i;
      for (i = 0; i < breaks.length; i++) if (avail[a] < breaks[i]) { b = breaks[i]; break; }
      if (b === null) return 99;
      var n = 0;
      while (a + n < avail.length && avail[a + n] < b) n++;
      return n;
    }
    function examOk(a) {
      if (a + 1 >= avail.length) return false;
      return examDays.indexOf(weekday(avail[a])) >= 0 && gap(avail[a], avail[a + 1]) === 1 && beforeBreak(a) >= minBefore;
    }
    var placed = {}, dropped = [], a = 0, ranOut = false;
    var limit = (opts.limit === undefined || opts.limit === null) ? null : opts.limit;
    var stop = limit === null ? avail.length : Math.min(avail.length, limit);
    function filler(it) {
      var e = copy(fill.entry);
      if (fill.unit === 'next') e.unit = it.unit === undefined ? null : it.unit;
      placed[avail[a]] = { src: 'filler', index: null, entry: e };
    }
    while (k < items.length) {
      var it = items[k];
      if (it.gone) { k++; continue; }
      if (a >= stop) { ranOut = a >= avail.length; break; }
      if (it.absorb && it.base && avail[a] > it.base) { dropped.push(k); k++; continue; }
      if (!it.free) {                                         // `free`: the log put this item on its day
        if (it.need && beforeBreak(a) < it.need) { filler(it); a++; continue; }
        if (has(it, 'examIn')) {
          var j = a + it.examIn;
          while (j < avail.length && !examOk(j)) j++;
          if (j >= avail.length) { ranOut = true; break; }
          if (j - it.examIn > a) { filler(it); a++; continue; }
        }
      }
      placed[avail[a]] = { src: 'item', index: k, entry: it };
      a++; k++;
    }
    var left = [];
    if (ranOut) for (var q = k; q < items.length; q++) if (!items[q].gone) left.push(q);
    if (k >= items.length) {
      var tail = flow.tail || [];
      while (a < stop) {
        var seg = null;
        for (var s = 0; s < tail.length; s++) if (!has(tail[s], 'before') || avail[a] < tail[s].before) { seg = tail[s]; break; }
        if (!seg) break;
        var e = copy(seg.entry);
        if (seg.count) {
          tailN++;
          var titles = seg.titles || [], t = tailN <= titles.length ? titles[tailN - 1] : (seg.titleRest || '');
          e.code = seg.code.split('{n}').join(String(tailN));
          e.title = seg.title.split('{n}').join(String(tailN)).split('{t}').join(t);
        }
        placed[avail[a]] = { src: 'tail', index: null, entry: e };
        a++;
      }
    }
    var rows = [], last = a ? avail[a - 1] : null;
    span.forEach(function (d) {
      if (has(placed, d)) { var r = placed[d]; rows.push({ date: d, src: r.src, index: r.index, entry: r.entry }); }
      else if (has(off, d) && (limit === null || (last !== null && d <= last))) rows.push({ date: d, src: 'blocked', index: null, entry: copy(off[d]) });
    });
    var unit = null;                                          // a day off belongs to the unit that is waiting
    for (var n = rows.length - 1; n >= 0; n--) {
      if (rows[n].src === 'blocked') rows[n].entry.unit = unit;
      else unit = rows[n].entry.unit === undefined ? null : rows[n].entry.unit;
    }
    return { rows: rows, dropped: dropped, left: left };
  }

  function nul(x) { return x === undefined ? null : x; }
  /* The part of a layout the two engines must agree on (lib/flow.py project). */
  function project(result) {
    return result.rows.map(function (r) { return [r.date, r.src, r.index, nul(r.entry.kind), nul(r.entry.code), nul(r.entry.unit), nul(r.entry.title)]; })
      .concat([['dropped'].concat(result.dropped), ['left'].concat(result.left)]);
  }

  // ---- what the console asks ---------------------------------------------------------------------
  /* The item a deck's lesson is: by its own code (4.06), by the plan's name for it (T-A1 for the
     deck's 3.T1), or as the first half of a merged day (the deck's 4.02 is the plan's 4.02+03). */
  function indexOf(flow, code, plan) {
    var items = flow.items, i;
    for (i = 0; i < items.length; i++) if (items[i].code === code && !items[i].gone) return i;
    if (plan) for (i = 0; i < items.length; i++) if (items[i].code === plan && !items[i].gone) return i;
    for (i = 0; i < items.length; i++) if (items[i].code && String(items[i].code).indexOf(code + '+') === 0 && !items[i].gone) return i;
    for (i = 0; i < items.length; i++) if (items[i].code && String(items[i].code).indexOf(code + '–') === 0 && !items[i].gone) return i;
    return -1;
  }
  function isDeck(e) { return !!e && DECK_KINDS.indexOf(e.kind) >= 0; }
  function nextDay(flow, d) { for (var i = 0; i < flow.days.length; i++) if (flow.days[i] > d) return flow.days[i]; return null; }
  function schoolDays(flow, a, b) {                           // b − a in school days (negative when b is earlier)
    var ia = -1, ib = -1, i;
    for (i = 0; i < flow.days.length; i++) { if (ia < 0 && flow.days[i] >= a) ia = i; if (ib < 0 && flow.days[i] >= b) ib = i; }
    if (ia < 0) ia = flow.days.length; if (ib < 0) ib = flow.days.length;
    return ib - ia;
  }

  /* Where a period is, and the year from there.
       records  this period's as-run records for this course: [{on, did: 'lesson'|'review'|'none', index}],
                `index` being the item (Flow.indexOf) for a lesson. Empty: the built plan stands.
       today    'YYYY-MM-DD'
     → { from: 'panel' | 'plan', last: {index, on} | null, today: row | null, next: row | null (the next
         day taught from a deck, today or later), exam: [row, row] | null (the next test's two days),
         behind: school days `next` is later than in the plan with nothing lost, inferred: [dates a
         deck lesson was planned and nobody opened it], rows, dropped, left }
     Between the last record and today: a day with no deck (a test, a spiral or flex day) is taken as
     run; a deck lesson nobody opened is taken as not taught, and the day as lost — up to opts.maxGap
     such days (default 2). More than that and the panel has simply not been used: it does not know
     where the period is, so the built plan stands (`from: 'plan'`, `unseen`: the days it missed, and
     `last` still says what it last saw). Teaching any lesson from the deck puts it right again. */
  function where(flow, records, today, opts) {
    opts = opts || {};
    var extra = {}, taught = [], inferred = [], marks = {}, maxGap = opts.maxGap === undefined ? 2 : opts.maxGap, unseen = 0;
    (records || []).forEach(function (r) {
      if (r.did === 'lesson') { if (r.index >= 0) taught.push(r); }
      else {
        extra[r.on] = { kind: r.did === 'none' ? 'off' : 'extra', code: null, title: r.did === 'none' ? 'No class (marked on the panel)' : 'Extra review day (marked on the panel)', meets: r.did !== 'none' };
        if (r.on >= today) marks[r.on] = extra[r.on];
      }
    });
    var res, from = 'plan', last = null, startRow = null;
    if (taught.length) {
      taught.sort(function (x, y) { return x.on < y.on ? -1 : x.on > y.on ? 1 : x.index - y.index; });
      last = taught[taught.length - 1];
      from = 'panel';
      var k = last.index + 1, d = nextDay(flow, last.on), guard = 0;
      while (d !== null && d < today && guard++ < 400) {
        if (!has(extra, d) && !has(flow.blocked || {}, d)) {
          var one = lay(flow, { start: { index: k, date: d }, blocked: extra, limit: 1 }).rows.filter(function (r) { return r.date === d; })[0];
          if (!one) break;
          if (one.src === 'item' && !isDeck(one.entry)) k = one.index + 1;
          else if (one.src === 'item') { inferred.push(d); extra[d] = { kind: 'extra', code: null, title: 'A day the deck was not opened', meets: true, unrecorded: true }; }
        }
        d = nextDay(flow, d);
      }
      if (inferred.length > maxGap) { unseen = inferred.length; inferred = []; from = 'plan'; }
    }
    if (from === 'panel') {
      if (last.on >= today) {                                 // already taught today: the year goes on tomorrow
        startRow = { date: last.on, src: 'item', index: last.index, entry: flow.items[last.index] };
        d = nextDay(flow, last.on);
      } else d = today;
      res = d === null ? { rows: [], dropped: [], left: [] } : lay(flow, { start: { index: k, date: d }, blocked: extra });
    } else {                                                  // the built plan, with only the marks made for today or later
      res = lay(flow, { blocked: marks });
      res = { rows: res.rows.filter(function (r) { return r.date >= today; }), dropped: res.dropped, left: res.left };
    }
    var rows = res.rows, tdy = startRow && startRow.date === today ? startRow : (rows.filter(function (r) { return r.date === today; })[0] || null);
    var next = null, exam = null, i;
    for (i = 0; i < rows.length; i++) if (rows[i].src === 'item' && isDeck(rows[i].entry)) { next = rows[i]; break; }
    for (i = 0; i < rows.length; i++) if (rows[i].src === 'item' && rows[i].entry.examIn === 0 && rows[i].date >= today) {
      var second = null;
      for (var j = i + 1; j < rows.length; j++) if (rows[j].src === 'item') { second = rows[j]; break; }
      exam = [rows[i], second]; break;
    }
    var behind = next && next.entry.base ? schoolDays(flow, next.entry.base, next.date) : 0;
    return { from: from, last: last, today: tdy, next: next, exam: exam, behind: behind, inferred: inferred, unseen: unseen, rows: rows, dropped: res.dropped, left: res.left };
  }

  return { V: V, lay: lay, project: project, indexOf: indexOf, isDeck: isDeck, nextDay: nextDay, schoolDays: schoolDays, where: where, DECK_KINDS: DECK_KINDS };
});
