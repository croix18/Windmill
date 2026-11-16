/* Practice-test kit: the lock on a test's record holds (check/seal.js, 16 Nov 2026; exam/seal.js, practice/exam/DESIGN.md).
     node check/seal.js            every claim below, and the record locked on 16 Nov 2026 still opens (check/seal_vector.json)
     node check/seal.js --make     writes that vector (once; a new one only if the format's version byte changes)
   Claims: a record comes back as it went in; no byte of a locked record can change, and none can be cut off or added; another
   Tally's key opens nothing; a record the site did not sign is not shown, whoever locked it; a record answers only to its own
   code; a site key made again keeps the old records readable; the code and the four-word check are what the design says. */
'use strict';
const fs = require('fs'), path = require('path'), assert = require('assert');
const S = require(path.join(__dirname, '..', 'exam', 'seal.js'));
const VEC = path.join(__dirname, 'seal_vector.json');
let n = 0; const ok = (c, what) => { n++; if (!c) { console.error('FAILED: ' + what); process.exit(1); } };
const why = async (p) => { try { await p; return null; } catch (e) { return e.why || ('(no why) ' + e.message); } };
const rnd = (k) => Math.floor(Math.random() * k);

/* written before the log's shape was pinned (16 Nov 2026): its log is not in the pinned shape — a stand-in for size; the lock does not care what a record holds */
function record(code, big) {
  const parts = [];
  for (let q = 1; q <= (big ? 40 : 6); q++) parts.push({ id: q + (q % 3 ? '' : 'a'), type: q % 5 ? 'text' : 'mc', typed: q % 4 ? '3/' + q : null, v: ['right', 'wrong', 'blank', 'unread'][q % 4], almost: q % 7 === 0, key: '−' + q + ' ½ x²' });
  const log = { q: {}, visits: [], away: [{ at: 311, for: 65, kind: 'tab', q: '4' }], scratch: { '3': { notes: 'é — “quoted” ✓ 12 × 3', grid: [[1, 2], [3, -4]] } }, device: { w: 1366, h: 768, touch: false, dark: true } };
  for (let i = 0; i < (big ? 300 : 12); i++) log.visits.push([String(1 + i % 18), 10 * i, 7 + (i * 37) % 90]);
  if (big) for (let q = 1; q <= 40; q++) log.q[q] = { sec: 30 + q, visits: 2, first: 11, flagged: q % 9 === 0, values: Array.from({ length: 12 }, (_, k) => [k * 13, String(Math.random()).slice(2, 12), 'typed']) };
  return { v: 1, id: 'a3f09c2d5b7e1f60', code, course: 'm7', unit: 10, cv: 2, kit: '0123456789ab', seed: 'f'.repeat(32),
    site: { started: 1794835200000, finished: 1794837667000, saves: 41, timeline: [[12, '1'], [40, '2a'], [41, '2b']] },
    rule: { leave: 'lock', after: 3 }, ended: null, unlocks: 1, parts, points: 4, of: parts.length, log };
}

(async () => {
  /* the words and the code */
  ok(S.WORDS.length === 256 && new Set(S.WORDS).size === 256 && S.WORDS.every(w => /^[a-z]{3,7}$/.test(w)), 'the four-word check has 256 different plain words');
  const seen = new Set();
  for (let i = 0; i < 5000; i++) { const c = S.newCode(); ok(/^[0-9A-HJKMNP-TV-Z]{12}$/.test(c) && /[0-9]/.test(c), 'a code is 12 Crockford characters with a digit: ' + c); seen.add(c); }
  ok(seen.size === 5000, '5000 codes, none twice');
  const c0 = 'K7QF2M9DX4TB';
  ok(S.showCode(c0) === 'K7QF-2M9D-X4TB' && S.readCode('K7QF-2M9D-X4TB') === c0 && S.readCode(' k7qf 2m9d x4tb ') === c0 && S.readCode('K7QF–2M9D—X4TB') === c0, 'a code reads back however it is spaced or cased');
  ok(S.readCode('O0Il-1LoO-iI0o') === '001111001100', 'O is 0, I and L are 1');
  ok(S.readCode('K7QF-2M9D-X4T') === null && S.readCode('K7QF-2M9D-X4TBB') === null && S.readCode('K7QF-2M9D-X4TU') === null && S.readCode('') === null && S.readCode(null) === null, 'what is not a code is not read as one');
  const found = S.findCodes('3:14 PM\tAda L.\tk7qf-2m9d-x4tb\n3:15 PM\tGrace H.\t9ZZZ0AAA1BBB\nrelationship, K7QF 2M9D X4TB again');
  ok(found.length === 2 && found[0] === c0 && found[1] === '9ZZZ0AAA1BBB', 'codes are found in a pasted sheet, each once, and a twelve-letter word is not one: ' + found.join(' '));

  /* a record comes back as it went in */
  const site = await S.makeSiteKey(), tally = await S.makeTallyKey(), other = await S.makeTallyKey(), site2 = await S.makeSiteKey();
  ok(/^TALLY1\.[A-Za-z0-9_-]{87}$/.test(tally.pub) && /^[A-Za-z0-9_-]{87}$/.test(site.pub) && tally.priv.kty === 'EC' && tally.priv.d && site.priv.d, 'the keys are in the forms the design names');
  for (const big of [false, true]) {
    const code = S.newCode(), rec = record(code, big), L = await S.seal(rec, site.priv, tally.pub), back = await S.open(L, tally.priv, site.pub, { code });
    assert.deepStrictEqual(back, rec); ok(true, 'round trip');
    ok(/^[A-Za-z0-9_-]+$/.test(L), 'a locked record is base64url text');
    const raw = S.unb64u(L); ok(raw[0] === 1 && raw[1] === 4, 'version byte, then the fresh public key');
    ok(!Buffer.from(raw).toString('latin1').includes(code) && !Buffer.from(raw).toString('latin1').includes('"parts"'), 'nothing of the record is readable in it');
    const L2 = await S.seal(rec, site.priv, tally.pub); ok(L2 !== L && L2.slice(2, 60) !== L.slice(2, 60), 'the same record locks differently each time');
  }

  /* no byte can change; none can be cut or added */
  const code = S.newCode(), rec = record(code, false), L = await S.seal(rec, site.priv, tally.pub), raw = S.unb64u(L);
  let changed = 0;
  for (let i = 0; i < raw.length; i++) {
    const b = raw.slice(); b[i] ^= 1 << rnd(8);
    const w = await why(S.open(b, tally.priv, site.pub, { code })); ok(w === 'format' || w === 'key', 'byte ' + i + ' changed and the record still opened (' + w + ')'); changed++;
  }
  for (const cut of [1, 2, 16, 17, 64, 200, raw.length - 78, raw.length - 1]) ok(['format', 'key'].includes(await why(S.open(raw.slice(0, raw.length - cut), tally.priv, site.pub))), cut + ' bytes cut off and it still opened');
  const longer = new Uint8Array(raw.length + 1); longer.set(raw); ok((await why(S.open(longer, tally.priv, site.pub))) === 'key', 'a byte added and it still opened');
  ok((await why(S.open('', tally.priv, site.pub))) === 'format' && (await why(S.open('not a record!', tally.priv, site.pub))) === 'format' && (await why(S.open(S.b64u(new Uint8Array(300)), tally.priv, site.pub))) === 'format', 'what is not a locked record is refused as such');

  /* the wrong keys */
  ok((await why(S.open(L, other.priv, site.pub))) === 'key', "another Tally's key opened it");
  ok((await why(S.open(L, tally.priv, site2.pub))) === 'signature', "a record passed with another site's key");
  ok((await why(S.open(L, tally.priv, site.pub, { code: S.newCode() }))) === 'code', "a record answered to another code");
  assert.deepStrictEqual(await S.open(L, tally.priv, [site2.pub, site.pub], { code }), rec); ok(true, 'a site key made again: the old key still opens the old records');
  /* a record a student made: they may know Tally's public key, never the site's private one */
  const fake = record(code, false); fake.points = fake.of; fake.parts.forEach(p => { p.v = 'right'; });
  const forged = await S.seal(fake, (await S.makeSiteKey()).priv, tally.pub);
  ok((await why(S.open(forged, tally.priv, site.pub, { code }))) === 'signature', 'a record locked by someone else was shown');
  ok((await why(S.seal(rec, site.priv, 'TALLY1.AAAA'))) === 'tally-key' && (await why(S.seal(rec, site.priv, site.pub))) === 'tally-key' && (await why(S.seal(rec, site.priv, 'TALLY1.' + S.b64u(new Uint8Array(65).fill(4))))) === 'tally-key', "what is not Tally's key is refused");

  /* the four-word check */
  const tr = S.newTrial(code, 1794835200000), w1 = await S.words(tr.nonce, site.pub, tally.pub);
  ok(tr.trial === true && tr.code === code && S.unb64u(tr.nonce).length === 16 && /^[a-z]+ [a-z]+ [a-z]+ [a-z]+$/.test(w1), 'a trial record and its four words');
  ok(w1 === await S.words(tr.nonce, site.pub, tally.pub), 'the same at both ends');
  ok(w1 !== await S.words(S.newTrial(code, 1).nonce, site.pub, tally.pub) && w1 !== await S.words(tr.nonce, site2.pub, tally.pub) && w1 !== await S.words(tr.nonce, site.pub, other.pub), 'different for another trial, another site key, another Tally');
  const LT = await S.seal(tr, site.priv, tally.pub), bt = await S.open(LT, tally.priv, site.pub, { code });
  ok(bt.trial === true && (await S.words(bt.nonce, site.pub, tally.pub)) === w1, 'Tally reads the words out of the trial it opened');

  /* the vector: a record locked once, that must open for as long as there are records */
  if (process.argv.includes('--make')) {
    const vs = await S.makeSiteKey(), vt = await S.makeTallyKey(), vc = 'K7QF2M9DX4TB', vr = record(vc, false), vtr = { v: 1, trial: true, code: '0TR1A1C0DE00', nonce: S.b64u(new Uint8Array(16).map((_, i) => i * 17)), made: 1794835200000 };
    fs.writeFileSync(VEC, JSON.stringify({ note: 'exam/seal.js, format 01, locked 16 Nov 2026. These keys were made for this file and lock nothing else.', sitePub: vs.pub, tallyPub: vt.pub, tallyPriv: vt.priv,
      code: vc, record: vr, locked: await S.seal(vr, vs.priv, vt.pub), trial: vtr, trialLocked: await S.seal(vtr, vs.priv, vt.pub), words: await S.words(vtr.nonce, vs.pub, vt.pub) }, null, 1) + '\n');
    console.log('seal: wrote ' + path.basename(VEC));
  }
  ok(fs.existsSync(VEC), 'check/seal_vector.json is missing (node check/seal.js --make, once)');
  const V = JSON.parse(fs.readFileSync(VEC, 'utf8'));
  assert.deepStrictEqual(await S.open(V.locked, V.tallyPriv, V.sitePub, { code: V.code }), V.record); ok(true, 'the vector opens');
  const vt = await S.open(V.trialLocked, V.tallyPriv, V.sitePub);
  ok(vt.trial === true && (await S.words(vt.nonce, V.sitePub, V.tallyPub)) === V.words, "the vector's trial gives its four words: " + V.words);

  /* how long, warm, on a record of the largest size the log allows */
  const bigRec = record(S.newCode(), true), size = JSON.stringify(bigRec).length; let t = process.hrtime.bigint(), LB;
  for (let i = 0; i < 30; i++) LB = await S.seal(bigRec, site.priv, tally.pub);
  const sealMs = Number(process.hrtime.bigint() - t) / 30e6; t = process.hrtime.bigint();
  for (let i = 0; i < 30; i++) await S.open(LB, tally.priv, site.pub);
  const openMs = Number(process.hrtime.bigint() - t) / 30e6;
  console.log('seal: ' + n + ' claims held; ' + changed + ' bytes of a locked record each changed, none opened; a ' + Math.round(size / 1024) + ' KB record locks to ' + Math.round(LB.length / 1024) + ' KB of text in ' + sealMs.toFixed(2) + ' ms and opens in ' + openMs.toFixed(2) + ' ms (this machine, warm)');
  console.log('seal: ALL SOUND');
})().catch(e => { console.error('FAILED: ' + (e && e.stack || e)); process.exit(1); });
