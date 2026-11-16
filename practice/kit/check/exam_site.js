/* Practice-test kit: a stand-in for the site's side of a test (check/exam_site.js, 15 Nov 2026). In memory, on exam/server.js,
   with a pool it is handed or sent. NOT FOR PRODUCTION: no store, no signature, no encryption, no time limits on a day. It is
   the reference the real site is built from (practice/exam/DESIGN.md, "2. Site"), so its requests and responses are exactly
   these. JSON both ways; a test's routes take its token as `Authorization: Bearer <token>`; the teacher's take
   `X-Teacher: <password>` (on the site, its password session). Times are milliseconds since 1970 (the site's clock).

   GET  /api/test/status?course=&unit=   → {open, pin}   pin: a start code is asked for (a boolean, never the code; 16 Nov 2026)
   POST /api/test/start {course, unit, pin, dev} → {test, token, started, now, ends, rule, show, form, pub}
                                           dev: the browser's id (32 hex); missing or malformed → 400 {error: 'body'}; a second start
                                           from the same dev in the same opening → 403 {error: 'again'} (16 Nov 2026, §10);
                                           ends: when this test stops being live (ms, this clock): the opening's until, or null
                                           403 {error: 'closed'} when not open; 409 {error: 'empty'} when no test is left;
                                           with cfg.startCode on: 403 {error: 'pin'} for a missing, wrong or lapsed code (compared
                                           upper-cased, spaces stripped; a code lives 15 minutes on this clock); the code is checked
                                           first: a right one is always taken, and past 60 wrong codes a minute from one address a
                                           wrong one is 429 {error: 'wait'}
        A test belongs to its opening (16 Nov 2026): it is live only while the opening it began in is open and before its until;
        a test that is not live: save, read, unlock → 403 {error: 'closed'}; finish commits the last saved answers, ended
        'teacher'.
        rule: {leave: 'count' | 'lock' | 'end', after: N}   show: 'parts' | 'score'   form: the pre-filled link with CODE, or null
        pub: the drawn test's public half (exam_pool.js)
   GET  /api/test/<id>                   → the same again (no token in it, ends the newest), with {answers, flags, n, status}
        status: 'open' | 'finished' (committed, not sealed yet) | 'sealed'
   PUT  /api/test/<id>/save {answers, flags, n}  → {ok: true, ends}   (the newest n is kept; an older one changes nothing)
   POST /api/test/<id>/read {part, text, a?}     → {ok, pretty}   a: the part's part (a) answer as it now stands on the device
                                                                  (else the last saved); never right or wrong
   POST /api/test/<id>/unlock {code}             → {ok}   five tries a minute (429 {error: 'wait'} after)
   POST /api/test/<id>/finish {answers, log, ended?} → {steps}   once; again → 409 {error: 'finished', steps}
   POST /api/test/<id>/grade {step}              → {done, steps}  step k judges parts 2k and 2k+1; the same step again is
                                                                  answered again; a step out of order → 409 {error: 'order', next}
   POST /api/test/<id>/seal                      → {code, points, of, parts?: [{id, v}], seconds}   (parts only with show
                                                                  'parts'); again → the same answer
   GET  /api/test/result/<code>                  → {code, record}   CORS *; here the record is base64 JSON, not locked
   GET  /api/test/key                            → {key: null}      CORS *; the stand-in signs nothing
   GET  /teacher/api/test/config                 → {rule, show, form, unlock: bool, hidden: [fams]}
   PUT  /teacher/api/test/config {rule?, show?, form?, unlock?, hidden?, startCode?} → the config (unlock: the code, kept hashed;
                                                   startCode: true | false, a start code asked for at Start; default true)
   PUT  /teacher/api/test/pool/<course>/<unit> {forms: [{seed, pub, priv, fams}]} → {n}   (5 a request on the site)
   POST /teacher/api/test/open {course, unit, until?} → {ok, opened}  (a new opening, with its first start code)
   POST /teacher/api/test/close {course, unit} → {ok}
   POST /teacher/api/test/extend {course, unit, until} → {ok, until}   moves an open test's until (ends follows)
   POST /teacher/api/test/pin {course, unit}     → {pin, until}   a new start code, 4 of 23456789ABCDEFGHJKMNPQRSTVWXYZ, 15 minutes
   GET  /teacher/api/test/board                  → {tests: [{course, unit, open, started, finished, pin, pinUntil}]}
   GET  /teacher/api/test/results?course=&unit=&day= → {results: [{code, points, of, seconds, away, finished}]}
   Any other path under /api/ or /teacher/api/ → 404 {error}. Anything else is a file the caller handed in (opts.files).

   The record's site block carries opened, the opening's id (ms).
   const S = require('./exam_site.js').create({units: {'m7/10': U}, password, files: {'/path': file or {type, body}}});
   S.listen(port) → Promise<port>; S.state (the store, for the checks); S.log (every response's body, for the checks). */
'use strict';
const http = require('http'), crypto = require('crypto'), fs = require('fs'), path = require('path');
const P = require(path.join(__dirname, '..', 'pack.js')), SV = require(path.join(__dirname, '..', 'exam', 'server.js'));
const ABC = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';                 /* Crockford base 32 */
const rnd = n => crypto.randomBytes(n).toString('hex'), sha = t => crypto.createHash('sha256').update(String(t)).digest('hex');
const PINS = '23456789ABCDEFGHJKMNPQRSTVWXYZ', START_WINDOW_MS = 15 * 60000;
const pin4 = () => { const b = crypto.randomBytes(4); let s = ''; for (let i = 0; i < 4; i++) s += PINS[b[i] % PINS.length]; return s; };
const code12 = () => { const b = crypto.randomBytes(12); let s = ''; for (let i = 0; i < 12; i++) s += ABC[b[i] & 31]; return s; };

function create(o) {
  const units = o.units || {}, files = o.files || {}, password = o.password || 'teacher';
  const state = { cfg: { rule: { leave: 'count', after: 3 }, show: 'parts', form: null, unlock: null, hidden: [], startCode: true }, pools: {}, open: {}, tests: {}, results: {}, now: o.now || (() => Date.now()) };
  const log = [];
  const ukey = (c, u) => c + '/' + (+u), wrongPins = {};
  const live = t => { const o = state.open[ukey(t.course, t.unit)]; return !!o && o.opened === t.opened && (!o.until || state.now() < o.until); };
  function itemsOf(t) { return t.items || (t.items = t.priv.map(x => P.unpack(x))); }
  const endsOf = t => { const o = state.open[ukey(t.course, t.unit)]; return o && o.opened === t.opened && o.until ? o.until : null; };
  function pubStart(t) { return { test: t.id, started: t.started, now: state.now(), ends: endsOf(t), rule: state.cfg.rule, show: state.cfg.show, form: state.cfg.form, pub: t.pub }; }
  const routes = [
    ['GET', /^\/api\/test\/status$/, (q) => { const open = !!state.open[ukey(q.query.course, q.query.unit)]; return { open, pin: open && !!state.cfg.startCode }; }],
    ['POST', /^\/api\/test\/start$/, (q) => {
      const k = ukey(q.body.course, q.body.unit);
      if (!state.open[k]) return [403, { error: 'closed' }];
      if (!/^[0-9a-f]{32}$/.test(String(q.body.dev || ''))) return [400, { error: 'body' }];
      if (state.cfg.startCode) {
        const now = state.now(), ip = q.ip || '', w = (wrongPins[ip] || []).filter(x => now - x < 60000); wrongPins[ip] = w;
        const o = state.open[k], pin = String(q.body.pin == null ? '' : q.body.pin).toUpperCase().replace(/\s+/g, '');
        if (!o.pin || pin !== o.pin || now >= o.pinUntil) { if (w.length >= 60) return [429, { error: 'wait' }]; w.push(now); return [403, { error: 'pin' }]; }
      }
      const dh = sha(q.body.dev); if (Object.values(state.tests).some(x => x.course === q.body.course && x.unit === +q.body.unit && x.opened === state.open[k].opened && x.dev === dh)) return [403, { error: 'again' }];
      const pool = state.pools[k] || [], i = pool.findIndex(f => !f.used && !(f.fams || []).some(x => state.cfg.hidden.indexOf(x) >= 0));
      if (i < 0) return [409, { error: 'empty' }];
      const f = pool[i]; f.used = true;
      const id = rnd(8), token = rnd(16);
      const t = state.tests[id] = { id, tok: sha(token), dev: dh, opened: state.open[k].opened, course: q.body.course, unit: +q.body.unit, seed: f.seed, pub: f.pub, priv: f.priv, answers: {}, flags: {}, n: 0, saves: 0, timeline: [],
        parts: f.priv.length, started: state.now(), finished: null, status: 'open', verdicts: [], log: null, ended: null, unlocks: 0, tries: [], sealed: null };
      return Object.assign(pubStart(t), { token });
    }],
    ['GET', /^\/api\/test\/key$/, () => ({ key: null }), 'cors'],
    ['GET', /^\/api\/test\/result\/([0-9A-Z]{12})$/, (q, m) => { const r = state.results[m[1]]; return r ? { code: m[1], record: Buffer.from(JSON.stringify(r.record)).toString('base64') } : [404, { error: 'none' }]; }, 'cors'],
    ['GET', /^\/api\/test\/([0-9a-f]{16})$/, (q, m, t) => Object.assign(pubStart(t), { answers: t.answers, flags: t.flags, n: t.n, status: t.status }), 'token'],
    ['PUT', /^\/api\/test\/([0-9a-f]{16})\/save$/, (q, m, t) => {
      if (t.status !== 'open') return [409, { error: 'finished' }];
      if (!live(t)) return [403, { error: 'closed' }];
      const b = q.body; if (!(+b.n > t.n)) return { ok: true, ends: endsOf(t) };
      const was = t.answers || {}, now = b.answers || {}, sec = Math.round((state.now() - t.started) / 1000);
      itemsOf(t).forEach(it => { if (JSON.stringify(was[it.id]) !== JSON.stringify(now[it.id])) t.timeline.push([sec, it.id]); });
      t.answers = now; t.flags = b.flags || {}; t.n = +b.n; t.saves++;
      return { ok: true, ends: endsOf(t) };
    }, 'token'],
    ['POST', /^\/api\/test\/([0-9a-f]{16})\/read$/, (q, m, t) => {
      if (t.status !== 'open') return [409, { error: 'finished' }];
      if (!live(t)) return [403, { error: 'closed' }];
      const it = itemsOf(t).find(x => x.id === q.body.part); if (!it || it.type !== 'text') return [404, { error: 'part' }];
      const a = Object.prototype.hasOwnProperty.call(q.body, 'a') ? q.body.a : (it.sib ? t.answers[it.sib] : undefined);
      const r = SV.read(units[ukey(t.course, t.unit)], it, q.body.text == null ? '' : q.body.text, a);
      return { ok: r.ok, pretty: r.pretty };
    }, 'token'],
    ['POST', /^\/api\/test\/([0-9a-f]{16})\/unlock$/, (q, m, t) => {
      if (!live(t)) return [403, { error: 'closed' }];
      const now = state.now(); t.tries = t.tries.filter(x => now - x < 60000);
      if (t.tries.length >= 5) return [429, { error: 'wait' }];
      t.tries.push(now); const ok = !!state.cfg.unlock && sha(String(q.body.code || '')) === state.cfg.unlock; if (ok) t.unlocks++;
      return { ok };
    }, 'token'],
    ['POST', /^\/api\/test\/([0-9a-f]{16})\/finish$/, (q, m, t) => {
      const steps = Math.ceil(t.parts / 2);
      if (t.status !== 'open') return [409, { error: 'finished', steps }];
      if (!live(t)) { t.log = q.body.log == null ? null : q.body.log; t.ended = 'teacher'; }   /* the opening is over: the last saved answers */
      else { t.answers = q.body.answers || t.answers; t.log = q.body.log == null ? null : q.body.log; t.ended = q.body.ended || null; }
      t.finished = state.now(); t.status = 'finished';
      return { steps };
    }, 'token'],
    ['POST', /^\/api\/test\/([0-9a-f]{16})\/grade$/, (q, m, t) => {
      if (t.status === 'open') return [409, { error: 'open' }];
      if (t.status === 'sealed') return { done: true, steps: Math.ceil(t.parts / 2) };
      const items = itemsOf(t), steps = Math.ceil(items.length / 2), k = +q.body.step, from = 2 * k;
      if (!(k >= 0) || from > t.verdicts.length) return [409, { error: 'order', next: Math.floor(t.verdicts.length / 2) }];
      if (from === t.verdicts.length && from < items.length) t.verdicts = t.verdicts.concat(SV.grade(units[ukey(t.course, t.unit)], items, t.answers, t.verdicts, from, 2));
      return { done: t.verdicts.length >= items.length, steps };
    }, 'token'],
    ['POST', /^\/api\/test\/([0-9a-f]{16})\/seal$/, (q, m, t) => {
      if (t.status === 'open' || (!t.sealed && t.verdicts.length < t.parts)) return [409, { error: 'grading' }];
      if (!t.sealed) {
        const items = itemsOf(t), code = code12(), sm = SV.summary(items, t.verdicts), seconds = Math.round((t.finished - t.started) / 1000);
        const record = { v: 1, id: t.id, code, course: t.course, unit: t.unit, cv: t.pub.cv, kit: t.pub.kit, seed: t.seed,
          site: { opened: t.opened, started: t.started, finished: t.finished, saves: t.saves, timeline: t.timeline }, rule: state.cfg.rule, ended: t.ended, unlocks: t.unlocks,
          parts: items.map((it, i) => ({ id: it.id, type: it.type, typed: t.answers[it.id] == null ? null : t.answers[it.id], v: t.verdicts[i].v, almost: !!t.verdicts[i].almost, key: it.keyText })),
          points: sm.points, of: sm.of, log: t.log };
        state.results[code] = { record, course: t.course, unit: t.unit, finished: t.finished, points: sm.points, of: sm.of, seconds, away: t.log && t.log.away ? t.log.away.length : 0 };
        t.sealed = { code, points: sm.points, of: sm.of, seconds, parts: items.map((it, i) => ({ id: it.id, v: t.verdicts[i].v })) };
        t.status = 'sealed'; delete t.priv; delete t.items; delete t.pub;            /* a test's halves go when it is sealed */
      }
      const r = { code: t.sealed.code, points: t.sealed.points, of: t.sealed.of, seconds: t.sealed.seconds };
      if (state.cfg.show === 'parts') r.parts = t.sealed.parts;
      return r;
    }, 'token'],
    ['GET', /^\/teacher\/api\/test\/config$/, () => cfgOut(), 'teacher'],
    ['PUT', /^\/teacher\/api\/test\/config$/, (q) => { const b = q.body;
      ['rule', 'show', 'form', 'hidden', 'startCode'].forEach(k => { if (b[k] !== undefined) state.cfg[k] = b[k]; }); if (b.unlock !== undefined) state.cfg.unlock = b.unlock ? sha(String(b.unlock)) : null; return cfgOut(); }, 'teacher'],
    ['PUT', /^\/teacher\/api\/test\/pool\/([a-z0-9]+)\/(\d+)$/, (q, m) => { const k = ukey(m[1], m[2]); (state.pools[k] = state.pools[k] || []).push(...(q.body.forms || [])); return { n: state.pools[k].length }; }, 'teacher'],
    ['POST', /^\/teacher\/api\/test\/open$/, (q) => { const k = ukey(q.body.course, q.body.unit); if (!(state.pools[k] || []).length) return [409, { error: 'no pool' }];
      const now = state.now(); state.open[k] = { until: q.body.until || null, opened: now, pin: pin4(), pinUntil: now + START_WINDOW_MS }; return { ok: true, opened: now }; }, 'teacher'],
    ['POST', /^\/teacher\/api\/test\/extend$/, (q) => { const o = state.open[ukey(q.body.course, q.body.unit)]; if (!o) return [409, { error: 'closed' }];
      if (!(+q.body.until > state.now())) return [400, { error: 'until' }]; o.until = +q.body.until; return { ok: true, until: o.until }; }, 'teacher'],
    ['POST', /^\/teacher\/api\/test\/pin$/, (q) => { const o = state.open[ukey(q.body.course, q.body.unit)]; if (!o) return [409, { error: 'closed' }];
      o.pin = pin4(); o.pinUntil = state.now() + START_WINDOW_MS; return { pin: o.pin, until: o.pinUntil }; }, 'teacher'],
    ['POST', /^\/teacher\/api\/test\/close$/, (q) => { const k = ukey(q.body.course, q.body.unit); delete state.open[k]; delete state.pools[k]; return { ok: true }; }, 'teacher'],
    ['GET', /^\/teacher\/api\/test\/board$/, () => ({ tests: Object.keys(state.open).map(k => { const [c, u] = k.split('/'), ts = Object.values(state.tests).filter(t => t.course === c && t.unit === +u);
      return { course: c, unit: +u, open: true, pin: state.open[k].pin, pinUntil: state.open[k].pinUntil, started: ts.length, finished: ts.filter(t => t.status !== 'open').length }; }) }), 'teacher'],
    ['GET', /^\/teacher\/api\/test\/results$/, (q) => ({ results: Object.keys(state.results).map(code => Object.assign({ code }, state.results[code])).filter(r => (!q.query.course || r.course === q.query.course) && (!q.query.unit || r.unit === +q.query.unit))
      .map(r => ({ code: r.code, points: r.points, of: r.of, seconds: r.seconds, away: r.away, finished: r.finished })) }), 'teacher']
  ];
  function cfgOut() { return { rule: state.cfg.rule, show: state.cfg.show, form: state.cfg.form, unlock: !!state.cfg.unlock, hidden: state.cfg.hidden, startCode: !!state.cfg.startCode }; }
  const server = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x'), send = (st, body, cors) => {
      const h = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }; if (cors) h['Access-Control-Allow-Origin'] = '*';
      const txt = JSON.stringify(body); log.push({ method: req.method, path: u.pathname, status: st, body: txt }); res.writeHead(st, h); res.end(txt);
    };
    if (!/^\/(teacher\/)?api\//.test(u.pathname)) {
      const f = files[u.pathname]; if (!f) { res.writeHead(404); return res.end('not here'); }
      const body = typeof f === 'string' ? fs.readFileSync(f) : f.body, type = (typeof f === 'string' ? '' : f.type) || 'text/html; charset=utf-8';
      res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' }); return res.end(body);
    }
    const chunks = []; let size = 0; req.on('data', c => { chunks.push(c); size += c.length; if (size > 8e6) req.destroy(); });   /* bytes, decoded once: a chunk may end inside a character (16 Nov 2026: a ° split in a pool's chunk) */
    req.on('end', () => { const raw = Buffer.concat(chunks).toString('utf8');
      const r = routes.find(x => x[0] === req.method && x[1].test(u.pathname));
      if (!r) return send(404, { error: 'no route' });
      let body = {}; if (raw) { try { body = JSON.parse(raw); } catch (e) { return send(400, { error: 'json' }); } }
      const m = r[1].exec(u.pathname), q = { body, query: Object.fromEntries(u.searchParams), headers: req.headers, ip: req.socket.remoteAddress };
      let t = null;
      if (r[3] === 'token') { t = state.tests[m[1]]; const a = /^Bearer\s+([0-9a-f]+)$/.exec(req.headers.authorization || '');
        if (!t) return send(404, { error: 'no test' }); if (!a || sha(a[1]) !== t.tok) return send(401, { error: 'token' }); }
      if (r[3] === 'teacher' && req.headers['x-teacher'] !== password) return send(401, { error: 'password' });
      try { const out = r[2](q, m, t); return Array.isArray(out) ? send(out[0], out[1], r[3] === 'cors') : send(200, out, r[3] === 'cors'); }
      catch (e) { return send(500, { error: String(e.message || e) }); }
    });
  });
  return { server, state, log, listen: port => new Promise(res => server.listen(port || 0, '127.0.0.1', () => res(server.address().port))), close: () => new Promise(res => server.close(res)) };
}
module.exports = { create };
