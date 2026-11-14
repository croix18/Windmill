/* Practice-test kit, page.js part S: every choice of a question in the same type (14 Nov 2026; M7 Unit 10 question 6 had
   "m > −16.5" as plain text beside "m > −4/3" typeset). A choice that is only math (no word once its markup is taken out) and
   carries math markup — a variable, a fraction, a power, a root — must be one math span (<span class="m">, which tex.js sets in
   KaTeX), and the math-only choices of one question are all math spans or none (plain numbers like "8 ft, 14 ft, 7 ft" stay
   text, every choice alike); a choice that is a sentence may carry math spans inside it. Over sets 1–300 of the unit's own generate(), with its own view.opt.
   Usage (from page.js): require('./mctype.js')(U, fail) */
'use strict';
module.exports = function (U, fail) {
  const ent = s => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ');
  const words = h => /[A-Za-z]{2,}/.test(ent(h.replace(/<[^>]*>/g, ' ')).replace(/\b(?:cm|mm|km|ft|in|yd|mi|oz|lb|kg|mL|sec|min)\b/g, ''));
  const whole = h => /^\s*<span class="m"[^>]*>[\s\S]*<\/span>\s*$/.test(h) && !/<\/span>\s*[^<\s][\s\S]*<span class="m"/.test(h);
  const bad = {}; let n = 0;
  for (let s = 1; s <= 300; s++) U.generate(s).sections.forEach(sec => sec.items.forEach(it => {
    const xs = it.type === 'parts' ? it.parts.filter(p => p.kind === 'mc') : it.type === 'mc' || it.type === 'multi' ? [it] : [];
    xs.forEach(x => { const os = x.opts.map((o, k) => String(U.view.opt(x, k)));
      if (os.some(o => /<svg|<table|<img/.test(o))) return; n++;
      const f = x.fam || it.fam || '?', mo = os.map((o, k) => [o, k]).filter(([o]) => !words(o) && /[0-9A-Za-z]/.test(ent(o.replace(/<[^>]*>/g, ''))));
      mo.forEach(([o, k]) => { if (!whole(o) && /<i>|class="fr"|<sup>|class="rad"/.test(o) && !bad[f]) bad[f] = 'set ' + s + ', choice ' + 'ABCDEFGH'[k] + ' is math markup outside a math span: ' + o.slice(0, 90); });
      const w = mo.filter(([o]) => whole(o)).length; if (w && w < mo.length && !bad[f]) bad[f] = 'set ' + s + ': ' + w + ' of ' + mo.length + ' math-only choices typeset, the rest plain'; });
  }));
  for (const f of Object.keys(bad)) fail('S. a choice that is only math is not typeset as math (' + f + '): ' + bad[f]);
  console.log('S. choices in one type: ' + n + ' multiple-choice questions over 300 sets');
};
