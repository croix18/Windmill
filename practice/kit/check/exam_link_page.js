/* Practice-test kit: page.js part X (15 Nov 2026; practice/exam/DESIGN.md) — the test's two touches on the pages that are not
   the test. A student page: on the site's address (/<course>/practice/unit-N/), its start screen has Test, a link to
   ../../test/unit-N/, only while GET /api/test/status says {open: true}; {open: false}, an error, a failed request or any other
   address shows nothing (and off the site nothing is asked). A teacher copy at #exam-pool, in a frame of a page on its own
   origin that plays the cockpit: it says ready (course, unit, contentVersion, the kit's version), draws what it is asked in
   batches of 5, each test a 128-bit seed with pub, priv and fams, priv unpacking to the page's ITEMS with their keys; a
   message from itself (not its parent) is not obeyed; without #exam-pool it says nothing. */
'use strict';
const path = require('path'), fs = require('fs');
module.exports = async function (newContext, url, U, dir, fail) {   /* contexts as students have the page (the pager on) */
  if (newContext && typeof newContext.newContext === 'function') newContext = newContext.newContext.bind(newContext);   /* a browser will do */
  const F = m => fail('X. ' + m), file = path.join(dir, 'preview.html'), teacher = /^teacher$/.test(path.basename(dir));
  const m = /^([a-z]+\d+)u(\d+)$/.exec(U.id || ''); if (!m) return;
  const origin = new URL(url).origin, at = origin + '/' + m[1] + '/practice/unit-' + m[2] + '/';
  if (!teacher) {
    const one = async (answer, onSite) => {
      const c = await newContext({ viewport: { width: 1280, height: 900 } }), asked = [];
      await c.route(at, r => r.fulfill({ path: file, contentType: 'text/html; charset=utf-8' }));
      await c.route('**/api/test/status**', r => { asked.push(r.request().url()); return answer === 'abort' ? r.abort() : r.fulfill({ status: answer === 500 ? 500 : 200, contentType: 'application/json', body: answer === 500 ? '{}' : JSON.stringify({ open: answer }) }); });
      const p = await c.newPage(); await p.goto(onSite ? at : url); await p.waitForSelector('#pgStart');
      if (answer === true && onSite) await p.waitForSelector('#pgTest', { timeout: 5000 }).catch(() => {}); else await p.waitForTimeout(1200);
      const a = await p.evaluate(() => { const e = document.getElementById('pgTest'); return e ? { text: e.textContent, href: e.href, vis: !!e.offsetParent } : null; });
      await c.close(); return { a, asked };
    };
    const yes = await one(true, true);
    if (!yes.a || yes.a.text !== 'Test' || !yes.a.vis || yes.a.href !== origin + '/' + m[1] + '/test/unit-' + m[2] + '/') F('the Test link while open: ' + JSON.stringify(yes.a));
    if (!yes.asked.length || !/\?course=[a-z]+\d+&unit=\d+$/.test(yes.asked[0])) F('the status was asked as ' + yes.asked[0]);
    for (const ans of [false, 500, 'abort']) { const r = await one(ans, true); if (r.a) F('a Test link with the status answered ' + ans); }
    const off = await one(true, false); if (off.a || off.asked.length) F('off the site the page asked for the status or showed Test');
    console.log('X. the practice page: Test while the site says open, nothing otherwise, nothing asked off the site');
    return;
  }
  const c = await newContext({ viewport: { width: 1280, height: 900 } });
  await c.route(origin + '/cockpit.html', r => r.fulfill({ contentType: 'text/html', body: '<!doctype html><title>cockpit</title><iframe id="f" src="' + url + '#exam-pool" style="display:none"></iframe><script>' +
    'window.msgs=[];addEventListener("message",function(e){if(e.origin!==location.origin||e.source!==document.getElementById("f").contentWindow||!e.data||e.data.kit!=="exam-pool")return;msgs.push(e.data);' +
    'if(e.data.ready)e.source.postMessage({kit:"exam-pool",draw:6},location.origin);});</script>' }));
  const p = await c.newPage(); await p.goto(origin + '/cockpit.html');
  await p.waitForFunction(() => window.msgs.some(x => x.error) || window.msgs.filter(x => x.forms).reduce((t, x) => t + x.forms.length, 0) >= 6, null, { timeout: 120000 }).catch(() => F('no tests came'));
  const got = await p.evaluate(() => window.msgs);
  const ready = got[0] || {}, batches = got.filter(x => x.forms), forms = [].concat(...batches.map(x => x.forms));
  if (!ready.ready || ready.course !== m[1] || ready.unit !== +m[2] || ready.cv !== U.contentVersion || !/^[0-9a-f]{12}$/.test(ready.kitv || '')) F('the ready message: ' + JSON.stringify(ready));
  if (got.some(x => x.error)) F('the copy said: ' + got.find(x => x.error).error);
  if (batches.map(x => x.forms.length).join() !== '5,1' || batches[1].done !== 6 || batches[1].of !== 6) F('the batches: ' + batches.map(x => x.forms.length + '@' + x.done + '/' + x.of).join(' '));
  const P = require(path.join(__dirname, '..', 'pack.js'));
  forms.forEach(f => {
    if (!/^[0-9a-f]{32}$/.test(f.seed) || !f.pub || !f.pub.skel || !Array.isArray(f.priv) || !Array.isArray(f.fams) || !f.fams.length) F('a test is not {seed, pub, priv, fams}');
    const items = f.priv.map(t => P.unpack(t));
    if (items.some(it => it.keyText == null || !it.id || !it.x)) F('a priv item without its keyText');
    items.forEach(it => { if (it.sib && !items.some(x => x.id === it.sib)) F(it.id + ': its part (a) is not in priv'); });
    if (JSON.stringify(f.pub).indexOf('"keyText"') >= 0) F('a pub holds keyText');
  });
  if (new Set(forms.map(f => f.seed)).size !== forms.length) F('a seed twice');
  /* a message the copy sends itself is not from its parent: nothing is drawn */
  const fr = p.frames().find(x => x !== p.mainFrame()), n0 = got.length;   /* the copy's address is its set's own by now (openSet) */
  await fr.evaluate(() => window.postMessage({ kit: 'exam-pool', draw: 1 }, location.origin)); await p.waitForTimeout(800);
  if ((await p.evaluate(() => window.msgs.length)) !== n0) F('the copy obeyed a message that was not its parent\'s');
  await c.close();
  /* without #exam-pool, in a frame: no word */
  const c2 = await newContext(); await c2.route(origin + '/cockpit2.html', r => r.fulfill({ contentType: 'text/html', body: '<!doctype html><iframe id="f" src="' + url + '"></iframe><script>window.msgs=[];addEventListener("message",function(e){msgs.push(e.data)})</script>' }));
  const p2 = await c2.newPage(); await p2.goto(origin + '/cockpit2.html'); await p2.waitForTimeout(2500);
  if ((await p2.evaluate(() => window.msgs.length))) F('a teacher copy without #exam-pool spoke to its parent');
  await c2.close();
  console.log('X. the teacher copy at #exam-pool: ready, ' + forms.length + ' tests in batches of 5, each proved and packed; a message not from its parent ignored; silent without #exam-pool');
};
