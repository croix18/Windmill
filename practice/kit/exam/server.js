/* Practice-test kit: the site's side of a test (15 Nov 2026; practice/exam/DESIGN.md). Pure — no DOM, no clock, no store —
   so it runs under Node and in the site's Worker, where the unit's own scripts are bundled beside it. The test page holds no
   key and no judge: the site reads an answer as it is typed ("can't read this yet", the preview) and judges the test at
   Finish, three parts a request, with the kit's own judge (judge.js) — the one the practice page uses.
     read(U, item, text, sibText?)  → {ok, pretty}      ok false only when the answer cannot be read (never right or wrong)
     grade(U, items, answers, verdicts, from, n) → [{v: right|wrong|blank|unread}, …] for items from … from+n−1
     summary(items, verdicts)       → {points, of}      as the page's end panel counts them on "Like the real test"
   items: the page's ITEMS (Kit.items()), unpacked from pack.js text: {id, type, x, sib, sibPart, aShown, pos, lab}.
   answers: the page's S.ans, by item id. U: the unit (its unit.js). */
'use strict';
const K = require('../core.js'), NL = require('../nline.js'), CG = require('../cgraph.js');
const { Judge } = require('../judge.js');

const JS = new WeakMap();
function judgeOf(U) { let J = JS.get(U); if (!J) { J = Judge({ U, V: U.view, K, NL, CG }); JS.set(U, J); } return J; }
/* what the coach may know about a part (ui.js ctxOf), on "Like the real test" with nothing checked before Finish */
function ctxOf(it, prev, prevOk) {
  return it.sib ? { prev, prevPart: it.sibPart, prevOk, aShown: it.aShown, extra: false, mode: 'test' } : { aShown: it.aShown, extra: false, mode: 'test' };
}
/* as the page does on a box's change on "Like the real test": "can't read this yet" only for an answer its reader cannot read
   (a part's boxes not all filled yet is not that); the preview is the unit's view.pretty of each box (an array for boxes) */
function read(U, item, text, sibText) {
  const J = judgeOf(U), f = J.judge(item, text, ctxOf(item, sibText, false), 0);
  const ok = !(f.v === 'unread' && !f.partial);
  let pretty = '';
  if (item.type === 'text') {
    const pv = (t, kind) => { try { return U.view.pretty(t == null ? '' : String(t), kind) || ''; } catch (e) { return ''; } };
    const B = J.boxesOf(item.x);
    pretty = B ? J.boxAns(item.x, text).map((t, k) => pv(t, B[k].kind || item.x.kind)) : pv(text, item.x.kind);
  }
  return { ok, pretty };
}
function grade(U, items, answers, verdicts, from, n) {
  if (!Array.isArray(items) || !Array.isArray(verdicts)) throw new Error('grade: items and verdicts are lists');
  if (verdicts.length !== from) throw new Error('grade: called out of order (' + verdicts.length + ' judged, asked from ' + from + ')');
  const J = judgeOf(U), out = [], at = {};
  items.forEach((it, i) => { at[it.id] = i; });
  for (let i = from; i < Math.min(items.length, from + n); i++) {
    const it = items[i];
    let prevOk = null;
    if (it.sib) {
      const s = at[it.sib];
      if (s == null || s >= i) throw new Error('grade: ' + it.id + "'s part (a) " + it.sib + ' is not before it');
      const sv = s < from ? verdicts[s] : out[s - from];
      prevOk = !!(sv && sv.v === 'right');
    }
    const g = J.atFinish(it, answers[it.id], ctxOf(it, answers[it.sib], prevOk), 0);
    out.push({ v: g.v });
  }
  return out;
}
/* the end panel on "Like the real test": a point for each part right at Finish, out of every part on the sheet */
function summary(items, verdicts) {
  return { points: verdicts.filter(x => x && x.v === 'right').length, of: items.length };
}
module.exports = { read, grade, summary };
