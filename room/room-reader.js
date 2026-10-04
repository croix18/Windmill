/* Windmill room reader — the twenty-odd lines every tool embeds, grown into one file with its tests.
 *
 *   three script tags: room.js, room.panel.js, room-reader.js (each optional but the last)
 *   const room = Room.load({ win: window, code: '<a typed room code>', scriptJson: <GET from the live road> });
 *   room.unit('acc')  room.weak('acc', 3)  room.bookmark(3)  room.lessonFor('acc', '2026-10-05', 3, SPINE)  room.age('tally')
 *   room.asRun('acc', 3)   what that period actually did, oldest first (the plan follows the class)
 *
 * The room is one object with parts (plan, tally, panel, roster, log); every writer stamps `at` on its
 * part; a reader with several copies keeps the NEWEST per part and never merges fields across copies.
 * Two code forms carry the tally part by hand: a readable line (`A3 O4 W 8NSO13 7AR41`) and a compact
 * Crockford base-32 code with a check character, which also names the benchmark-list version it used
 * (`A3 W 8NSO13 7NSO11 O4 W 7GR13`: each course's unit, then W and its weakest benchmarks in order).
 * The tier guard refuses a room whose open parts carry a name or whose roster part carries a score.
 * Works as a browser script (window.Room) and as a Node module (require). No dependencies.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Room = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var VERSION = 1;
  var PARTS = ['plan', 'tally', 'panel', 'roster', 'log'];
  var OPEN = ['plan', 'tally', 'panel'];                      // tier: open — never a person
  var ALPHA = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';              // Crockford base 32
  var CHECK = ALPHA + '*~$=U';                                 // the 37 check symbols
  var PERSON_KEYS = /^(name|names|first|firstName|last|lastName|nick|student|students|id|ids|studentId|roster|email)$/i;
  var STANDING_KEYS = /^(grade|grades|score|scores|percentile|fast|fastPct|average|letter|missing|nhi|gpa)$/i;

  // ---- time -------------------------------------------------------------------------------------
  function ts(x) { var t = x && x.at ? Date.parse(x.at) : NaN; return isNaN(t) ? -Infinity : t; }
  function ageDays(part, now) { var t = ts(part); return t === -Infinity ? Infinity : ((now || Date.now()) - t) / 864e5; }

  // ---- merge: newest copy per part -------------------------------------------------------------
  function merge(copies) {
    var out = { v: VERSION, source: {} };
    copies.forEach(function (c) {
      if (!c || !c.room || typeof c.room !== 'object') return;
      var r = c.room;
      if (typeof r.v === 'number' && r.v > VERSION) out.newer = Math.max(out.newer || 0, r.v);
      PARTS.forEach(function (p) {
        if (!r[p]) return;
        if (p === 'log') { out.log = (out.log || []).concat(r.log); return; }
        if (!out[p] || ts(r[p]) > ts(out[p])) { out[p] = r[p]; out.source[p] = c.name; }
      });
    });
    if (out.log) out.log.sort(function (a, b) { return ts(a) - ts(b); });
    return out;
  }

  // ---- the tier guard ----------------------------------------------------------------------------
  function walk(x, path, fn) {
    if (!x || typeof x !== 'object') return;
    Object.keys(x).forEach(function (k) { fn(k, x[k], path.concat(k)); walk(x[k], path.concat(k), fn); });
  }
  function check(room) {
    var bad = [];
    OPEN.forEach(function (p) {
      walk(room[p], [p], function (k, v, path) {
        if (PERSON_KEYS.test(k)) bad.push(path.join('.') + ': a person-shaped key in an open part');
        if (STANDING_KEYS.test(k)) bad.push(path.join('.') + ': a standing-shaped key in an open part');
      });
    });
    walk(room.roster, ['roster'], function (k, v, path) {
      if (STANDING_KEYS.test(k)) bad.push(path.join('.') + ': a standing-shaped key in the roster part');
    });
    if (room.newer) bad.push('room version ' + room.newer + ' is newer than this reader (' + VERSION + ')');
    return bad;
  }

  // ---- benchmark shorthand ---------------------------------------------------------------------------
  function shortBm(code) { var m = /^MA\.(\d+)\.([A-Z]+)\.(\d+)\.(\d+)$/.exec(code); return m ? m[1] + m[2] + m[3] + m[4] : null; }
  function longBm(s) { var m = /^([78])(NSO|AR|GR|DP|F)(\d)(\d+)$/.exec(s); return m ? 'MA.' + m[1] + '.' + m[2] + '.' + m[3] + '.' + m[4] : null; }

  // ---- the readable code: "A3 O4 W 8NSO13 7AR41 8NSO14" --------------------------------------------
  // each course's unit, then W and ITS weakest benchmarks in order: "A3 W 8NSO13 7NSO11 O4 W 7GR13"
  function toReadable(tally) {
    var c = tally && tally.courses || {}, parts = [];
    ['acc', 'on'].forEach(function (course) {
      if (!c[course] || c[course].unit == null) return;
      parts.push((course === 'acc' ? 'A' : 'O') + c[course].unit);
      var weak = weakest(tally, course, 4).map(function (w) { return shortBm(w.benchmark); }).filter(Boolean);
      if (weak.length) parts = parts.concat(['W'], weak);
    });
    return parts.join(' ');
  }
  function fromReadable(line) {
    var t = { at: new Date().toISOString(), courses: {}, via: 'code' }, course = null, weak = false, rank = 0;
    String(line || '').trim().toUpperCase().split(/\s+/).forEach(function (tok) {
      var m;
      if ((m = /^([AO])(\d{1,2})$/.exec(tok))) { course = m[1] === 'A' ? 'acc' : 'on'; weak = false; rank = 0; t.courses[course] = { unit: +m[2], benchmarks: {} }; }
      else if (tok === 'W' && course) weak = true;
      else if (weak && longBm(tok)) t.courses[course].benchmarks[longBm(tok)] = { atGoal: 0.25, rank: ++rank, source: 'code' };   // order, not the number
      else if (tok) throw new Error('room code: cannot read "' + tok + '"');
    });
    if (!t.courses.acc && !t.courses.on) throw new Error('room code: no unit in it');
    return t;
  }

  // ---- the compact code: Crockford base 32 + check character ------------------------------------------
  // bits: ver 3 · acc unit 5 · on unit 5 · list version 6 · n 4 · n × (course 1 + benchmark index 7 + bucket 2)
  function Bits() { this.s = ''; }
  Bits.prototype.put = function (v, n) { for (var i = n - 1; i >= 0; i--) this.s += (v >> i) & 1; return this; };
  function readBits(s, pos, n) { var v = 0; for (var i = 0; i < n; i++) v = (v << 1) | (+s[pos + i] || 0); return v; }
  function b32enc(bits) { var out = ''; for (var i = 0; i < bits.length; i += 5) out += ALPHA[parseInt((bits.slice(i, i + 5) + '0000').slice(0, 5), 2)]; return out; }
  function b32dec(str) { var bits = ''; for (var i = 0; i < str.length; i++) { var k = ALPHA.indexOf(str[i]); if (k < 0) throw new Error('room code: bad character ' + str[i]); bits += ('0000' + k.toString(2)).slice(-5); } return bits; }
  function checkChar(str) { var n = 0; for (var i = 0; i < str.length; i++) n = (n * 32 + ALPHA.indexOf(str[i])) % 37; return CHECK[n]; }
  function bucket(atGoal) { return atGoal == null ? 0 : atGoal < 0.25 ? 0 : atGoal < 0.5 ? 1 : atGoal < 0.75 ? 2 : 3; }
  function toCompact(tally, list) {
    var c = tally && tally.courses || {}, b = new Bits();
    var weak = [];
    ['acc', 'on'].forEach(function (course) { weakest(tally, course, 4).forEach(function (w) { if (list.codes.indexOf(w.benchmark) >= 0) weak.push({ course: course, w: w }); }); });
    weak = weak.slice(0, 8);
    b.put(VERSION, 3).put(c.acc && c.acc.unit || 0, 5).put(c.on && c.on.unit || 0, 5).put(list.version & 63, 6).put(weak.length, 4);
    weak.forEach(function (x) { b.put(x.course === 'on' ? 1 : 0, 1).put(list.codes.indexOf(x.w.benchmark), 7).put(bucket(x.w.atGoal), 2); });
    var body = b32enc(b.s), code = body + checkChar(body);
    return code.replace(/(.{4})(?=.)/g, '$1-');
  }
  function fromCompact(code, list) {
    var raw = String(code || '').toUpperCase().replace(/[-\s]/g, '').replace(/O/g, '0').replace(/[IL]/g, '1');
    if (raw.length < 6) throw new Error('room code: too short');
    var body = raw.slice(0, -1);
    if (checkChar(body) !== raw.slice(-1)) throw new Error('room code: check character does not match (a typo?)');
    var s = b32dec(body), p = 0, rd = function (n) { var v = readBits(s, p, n); p += n; return v; };
    var ver = rd(3); if (ver !== VERSION) throw new Error('room code: version ' + ver + ', reader knows ' + VERSION);
    var acc = rd(5), on = rd(5), lv = rd(6), n = rd(4);
    var t = { at: new Date().toISOString(), courses: {}, via: 'code', listVersion: lv };
    if (acc) t.courses.acc = { unit: acc, benchmarks: {} };
    if (on) t.courses.on = { unit: on, benchmarks: {} };
    if ((lv & 63) !== (list.version & 63)) t.listMismatch = 'the code used benchmark list v' + lv + ', this tool has v' + list.version;
    var ranks = { acc: 0, on: 0 };
    for (var i = 0; i < n; i++) {
      var course = rd(1) ? 'on' : 'acc', idx = rd(7), bk = rd(2), bm = list.codes[idx];
      if (!bm || t.listMismatch) continue;                 // never misread an index against the wrong list
      t.courses[course] = t.courses[course] || { benchmarks: {} };
      t.courses[course].benchmarks[bm] = { atGoal: [0.1, 0.4, 0.6, 0.9][bk], bucket: bk, rank: ++ranks[course], source: 'code' };
    }
    return t;
  }
  function fromCode(code, list) {
    var s = String(code || '').trim();
    if (!s) return null;
    return /^[AO]\d/i.test(s) ? fromReadable(s) : fromCompact(s, list || { version: 0, codes: [] });
  }

  // ---- questions a tool asks ------------------------------------------------------------------------
  function weakest(tally, course, k) {
    var c = tally && tally.courses && tally.courses[course], bm = c && c.benchmarks || {};
    return Object.keys(bm).map(function (code) { return { benchmark: code, atGoal: bm[code].atGoal, n: bm[code].n, rank: bm[code].rank, source: bm[code].source }; })
      .sort(function (a, b) { return (a.rank || 99) - (b.rank || 99) || (a.atGoal || 0) - (b.atGoal || 0); }).slice(0, k || 5);
  }
  function planFor(spine, dateISO, course) {
    var d = spine && spine.days && spine.days[dateISO];
    if (!d) return null;
    if (d.holiday) return { kind: 'holiday', title: d.holiday, date: dateISO };
    var e = d[course]; return e ? Object.assign({ date: dateISO, week: d.week, wednesday: d.wednesday, periods: d.periods }, e) : null;
  }
  function nextSchoolDay(spine, dateISO) {
    var keys = Object.keys(spine.days).sort(), i = keys.indexOf(dateISO);
    for (var j = (i < 0 ? 0 : i + 1); j < keys.length; j++) if (!spine.days[keys[j]].holiday) return keys[j];
    return null;
  }

  function Reader(room) { this.room = room; }
  Reader.prototype.unit = function (course) { var c = this.room.tally && this.room.tally.courses; return c && c[course] ? c[course].unit : null; };
  Reader.prototype.weak = function (course, k) { return weakest(this.room.tally, course, k); };
  Reader.prototype.bookmark = function (period) { var p = this.room.panel && this.room.panel.periods; return p ? p[String(period)] || null : null; };
  Reader.prototype.age = function (part) { return ageDays(this.room[part]); };
  /* What a period actually did, oldest first (panel.asRun): [{on, period, course, did, lesson}]. The kit's
     flow.js lays the rest of the year from the last lesson in it. */
  Reader.prototype.asRun = function (course, period) {
    var a = this.room.panel && this.room.panel.asRun || [];
    return a.filter(function (r) { return r.course === course && (period == null || r.period === period); })
      .sort(function (x, y) { return x.on < y.on ? -1 : x.on > y.on ? 1 : 0; });
  };
  Reader.prototype.plan = function (spine, dateISO, course) { return planFor(spine, dateISO, course); };
  /* Where period N is: the panel's bookmark if it is for a lesson on or before today's plan, else the plan. */
  Reader.prototype.lessonFor = function (course, dateISO, period, spine) {
    var plan = planFor(spine, dateISO, course), bm = this.bookmark(period);
    if (bm && bm.course === course && bm.lesson) return { lesson: bm.lesson, stop: bm.stop || null, from: 'panel', plan: plan };
    return plan && plan.code ? { lesson: plan.code, stop: null, from: 'plan', plan: plan } : { lesson: null, stop: null, from: 'none', plan: plan };
  };
  Reader.prototype.check = function () { return check(this.room); };

  /* load: gather every copy in reach, merge, guard. sources: {win, code, scriptJson, list, extra:[{name,room}]} */
  function load(src) {
    src = src || {};
    var copies = [];
    if (src.win) {
      if (src.win.ROOM) copies.push({ name: 'drive', room: src.win.ROOM });
      if (src.win.ROOM_PANEL) copies.push({ name: 'drive.panel', room: src.win.ROOM_PANEL });
      if (src.win.SPINE) copies.push({ name: 'build', room: { v: VERSION, plan: { at: src.win.SPINE.generatedAt, spine: true } } });
    }
    if (src.scriptJson) copies.push({ name: 'script', room: src.scriptJson });
    if (src.code) { var t = fromCode(src.code, src.list); if (t) copies.push({ name: 'code', room: { v: VERSION, tally: t } }); }
    (src.extra || []).forEach(function (c) { copies.push(c); });
    var room = merge(copies);
    var problems = check(room);
    if (problems.length && !src.allowProblems) throw new Error('room refused: ' + problems.join('; '));
    var r = new Reader(room); r.problems = problems; r.source = room.source;
    return r;
  }

  return { VERSION: VERSION, PARTS: PARTS, load: load, merge: merge, check: check, weakest: weakest, planFor: planFor, nextSchoolDay: nextSchoolDay,
           code: { toReadable: toReadable, fromReadable: fromReadable, toCompact: toCompact, fromCompact: fromCompact, parse: fromCode, shortBm: shortBm, longBm: longBm },
           Reader: Reader };
});
