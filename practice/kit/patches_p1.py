#!/usr/bin/env python3
"""The practice point comes from a problem solved on your own (24 Oct 2026). One-off patch of ui.js and lang/pt-BR.js; kept
beside the kit as the record of the change, re-runnable on the 23 Oct ui.js.

Croix, 24 Oct 2026, from a ChatGPT review of the A7 Unit 4 page he brought ("Let's take a look at the practice tests"): help is
unlimited and never shamed, but the point for a question is earned only by solving it right on the first check with no Hint and
no Show me how — on the question itself, or on a fresh one of the same kind ("Try another like this"). What a student did on the
original first check is kept as its own measure and never rewritten.

Old → new, by function:
  record     right on the first check counted, help or not (R.first, R.helped)  →  R.earned = right on the first check with no
             help; an "another" right on its first check with no help earns the base question's point (practice mode only);
             the miss streak is one rule for the base question and its "anothers" (streakStep): two in a row clear a miss, any
             other first check adds it and resets the streak. (Before: one unhelped first try on the base question cleared a
             miss; an "another" needed two.)
  walkStart  Hint counted as help only before the first check  →  before the question is right (closing it changes nothing)
  paintItem  "Try another" after a miss  →  also whenever the point is not earned yet, as the primary button; on an "another",
             after any check or Show me how (so a wrong one leads to the next), not only after a right one
  tally      first / helped / done  →  + earned, per part too
  paintScore the bar's "N right first try"  →  "N earned"; the end panel and the printed results lead with the points earned
             and keep "right on the first try" as the second line; the history line compares points earned
  cardHtml   a right first check with the Hint: "✓ Correct on the first try" + bulb  →  "✓ Correct" + bulb + "One on your own
             earns the point."; the base question, once its point came from an "another": "· point earned"
  finish     a blank in Check-as-I-go: "not done"  →  skipped: on My misses, the streak reset (R.skipped for the record)
  openSet    older saved sets get R.earned from R.first and R.helped, so nothing is lost or rewritten
Test mode ("Like the real test"): no Hint before Finish, so earned = right at Finish, as before; after Finish an "another"
never changes the set's score.
"""
import sys, os
HERE = os.path.dirname(os.path.abspath(__file__))

def patch(path, pairs):
    s = open(path, encoding="utf-8").read()
    for old, new in pairs:
        assert s.count(old) == 1, (path, old[:70])
        s = s.replace(old, new)
    open(path, "w", encoding="utf-8").write(s)

UI = [
# --- the one miss rule
("""function misses(){ return load('misses') || {}; }""",
"""function misses(){ return load('misses') || {}; }
function streaks(){ return load('streaks') || {}; }
/* The one rule for clearing a miss (24 Oct 2026): a first check right with no help is one in a row; two in a row clear the
   miss. Any other first check — wrong, or right after the Hint or Show me how — adds the miss and starts the count over. The
   base question and every "Try another like this" of it count alike. */
function streakStep(pos, fam, indep){
  var st = streaks(), ms = misses(), n = indep ? (st[pos] || 0) + 1 : 0;
  if (n >= 2){ delete ms[pos]; n = 0; } else if (!indep) ms[pos] = fam;
  if (n) st[pos] = n; else delete st[pos];
  store('streaks', st); store('misses', ms); return n;
}"""),
# --- the streak line reads the persistent count
("""function streakHtml(M0){ return M0.streak >= 2 ? ' <span class="streak">✓✓ ' + M0.streak + ' in a row — you’ve got this one</span>' : M0.streak === 1 ? ' <span class="streak">✓ one in a row</span>' : ''; }""",
"""function streakHtml(M0){ return M0.streak >= 2 ? ' <span class="streak">✓✓ ' + M0.streak + ' in a row — you’ve got this one</span>' : M0.streak === 1 ? ' <span class="streak">✓ one in a row</span>' : M0.earned ? ' <span class="streak">✓ point earned</span>' : ''; }"""),
# --- record
("""  R.tries++; R.v = f.v; R.lastAns = S.ans[it.id];
  if (R.first === null){ R.first = (f.v === 'right'); R.helped = R.first && !!R.hinted; if (late) R.late = true; }   /* right on the first check counts, help or not; help is tallied */
  if (it.extra){
    var M0 = S.more[it.base];
    if (f.v === 'right'){ M0.streak = (R.first && !R.hinted) ? M0.streak + 1 : 0; if (M0.streak >= 2){ var ms = misses(); delete ms[it.pos]; store('misses', ms); } }
    else if (R.tries === 1) M0.streak = 0;
  } else if (R.tries === 1){
    var ms2 = misses();
    if (R.first === true && !R.hinted) delete ms2[it.pos]; else ms2[it.pos] = famOf(it);
    store('misses', ms2);
  }
  return R;""",
"""  R.tries++; R.v = f.v; R.lastAns = S.ans[it.id];
  var indep = f.v === 'right' && R.tries === 1 && !R.hinted && !R.shown;            /* right on the first check, on your own */
  if (R.first === null){ R.first = (f.v === 'right'); R.helped = R.first && !!(R.hinted || R.shown); if (late) R.late = true; }   /* what happened on the first check: kept, never rewritten */
  if (R.tries === 1){
    var n = streakStep(it.pos, famOf(it), indep);                                    /* the one miss rule, base question or "another" */
    if (it.extra){ var M0 = S.more[it.base], B = res(byId(it.base)); M0.streak = n; if (indep && S.mode !== 'test' && !B.earned){ B.earned = true; M0.earned = true; B.earnedBy = it.id; } }
    else R.earned = indep;                                                           /* the point: right on the first check with no help, or on a fresh one (above) */
  }
  return R;"""),
# --- Hint counts as help until the question is right; closing it changes nothing
("""function walkStart(it){ var R = res(it); if (R.tries === 0 && R.v !== 'right' && (!S.done || it.extra)) R.hinted = true;""",
"""function walkStart(it){ var R = res(it); if (R.v !== 'right') R.hinted = true;                  /* help before the point: the point then comes from one on your own */"""),
# --- the right card
("""    var line = R.late ? '✓ Correct — checked at Finish' : R.first ? '✓ Correct on the first try' : R.shown ? '✓ Correct after seeing the steps' : '✓ Correct on try ' + R.tries;   /* [J-5] */
    var note = f && f.v === 'right' && f.what && f.what.length ? '<p class="note2">' + f.what.join(' ') + '</p>' : '';
    return '<div class="fbx"><p><span class="tag ok">' + line + '</span>' + (R.first && R.hinted && !R.late ? ' ' + bulb() : '') + '</p>' + note + '</div>';""",
"""    var own = R.first && !R.helped, line = R.late ? '✓ Correct — checked at Finish' : own ? (it.extra ? '✓ Correct on your own' : '✓ Correct on the first try') : R.first ? '✓ Correct' : R.shown ? '✓ Correct after seeing the steps' : '✓ Correct on try ' + R.tries;   /* [J-5] */
    var note = f && f.v === 'right' && f.what && f.what.length ? '<p class="note2">' + f.what.join(' ') + '</p>' : '';
    var pt = S.mode === 'test' ? '' : !it.extra && R.earned && !own ? ' <span class="tag ok">point earned</span>' : '';
    var next = S.mode === 'test' || own || R.earned || (it.extra && res(byId(it.base)).earned) ? '' : '<p class="note2">One on your own earns the point.</p>';
    return '<div class="fbx"><p><span class="tag ok">' + line + '</span>' + (R.first && R.helped && !R.late ? ' ' + bulb() : '') + pt + '</p>' + note + next + '</div>';"""),
# --- the buttons
("""  var missed = (R.v && R.v !== 'right') || R.shown || (R.v === 'right' && R.first === false);
  if (!it.extra && missed && !S.more[it.id]) b.push('<button type="button" class="' + (R.v === 'right' || all ? 'go' : '') + '" data-another="' + it.id + '">Try another like this</button>');
  if (it.extra && R.v === 'right') b.push('<button type="button" class="go" data-another="' + it.base + '">Try another like this</button>');""",
"""  var missed = (R.v && R.v !== 'right') || R.shown || (R.v === 'right' && R.first === false);
  var owed = S.mode !== 'test' && !R.earned && (R.v || R.shown || R.hinted);            /* the point is not earned yet: a fresh one is the way (24 Oct 2026) */
  if (!it.extra && (missed || owed) && !S.more[it.id]) b.push('<button type="button" class="' + (R.v === 'right' || all || owed ? 'go' : '') + '" data-another="' + it.id + '">Try another like this</button>');
  if (it.extra && (R.v || R.shown)) b.push('<button type="button" class="' + (R.v === 'right' || !res(byId(it.base)).earned ? 'go' : '') + '" data-another="' + it.base + '">Try another like this</button>');"""),
# --- tally
("""  var first = 0, helped = 0, done = 0, bySec = DS.map(function(){ return {got: 0, of: 0, help: 0}; });
  ITEMS.forEach(function(it){ var R = S.res[it.id]; bySec[it.sec].of++; if (R && R.first === true){ first++; bySec[it.sec].got++; if (R.helped){ helped++; bySec[it.sec].help++; } } if (R && R.v === 'right') done++; });
  return {first: first, helped: helped, done: done, bySec: bySec};""",
"""  var first = 0, helped = 0, done = 0, earned = 0, bySec = DS.map(function(){ return {got: 0, of: 0, help: 0, earned: 0}; });
  ITEMS.forEach(function(it){ var R = S.res[it.id]; bySec[it.sec].of++; if (R && R.first === true){ first++; bySec[it.sec].got++; if (R.helped){ helped++; bySec[it.sec].help++; } } if (R && R.earned){ earned++; bySec[it.sec].earned++; } if (R && R.v === 'right') done++; });
  return {first: first, helped: helped, done: done, earned: earned, bySec: bySec};"""),
# --- the bar
("""  else sc.innerHTML = nb('<b>' + t.first + '</b> right first try') + (t.helped ? bulb(t.helped) : '') + ' · ' + nb('<b>' + t.done + '</b> of ' + N + ' done');   /* [J-2] */""",
"""  else sc.innerHTML = nb('<b>' + t.earned + '</b> ' + (S.mode === 'test' ? 'right' : 'earned')) + (t.helped ? bulb(t.helped) : '') + ' · ' + nb('<b>' + t.done + '</b> of ' + N + ' done');   /* [J-2]; the points earned on your own (24 Oct 2026) */"""),
# --- the end panel
("""  var rows = DS.map(function(s, k){ return '<tr><td>' + s.title + '</td><td class="r">' + t.bySec[k].got + ' / ' + t.bySec[k].of + '</td>' + (test ? '' : '<td class="r">' + t.bySec[k].help + '</td>') + '</tr>'; }).join('');""",
"""  var rows = DS.map(function(s, k){ return '<tr><td>' + s.title + '</td><td class="r">' + (test ? t.bySec[k].got : t.bySec[k].earned) + ' / ' + t.bySec[k].of + '</td>' + (test ? '' : '<td class="r">' + t.bySec[k].got + '</td><td class="r">' + t.bySec[k].help + '</td>') + '</tr>'; }).join('');"""),
("""  var nm = Object.keys(misses()).length, perfect = t.first === N && N > 0, alone = perfect && !t.helped;""",
"""  var nm = Object.keys(misses()).length, perfect = t.earned === N && N > 0, alone = perfect && t.first === N && !t.helped;"""),
("""  var lastLine = prev ? '<p class="last">Last time: ' + prev.first + ' / ' + prev.of + ' in ' + fmt(prev.time) + '. Today: ' + t.first + ' / ' + N + (prev.of === N ? ' (' + (t.first - prev.first >= 0 ? '+' : '−') + Math.abs(t.first - prev.first) + ')' : '') + '.</p>' : '';   /* [J-10] */""",
"""  var pe = prev ? (prev.earned == null ? prev.first : prev.earned) : 0;
  var lastLine = prev ? '<p class="last">Last time: ' + pe + ' / ' + prev.of + ' in ' + fmt(prev.time) + '. Today: ' + t.earned + ' / ' + N + (prev.of === N ? ' (' + (t.earned - pe >= 0 ? '+' : '−') + Math.abs(t.earned - pe) + ')' : '') + '.</p>' : '';   /* [J-10] */
  var firstLine = test ? '' : '<p class="last">Right on the first try: ' + t.first + ' / ' + N + (t.helped ? ' ' + bulb(t.helped) : '') + '</p>';"""),
("""    '<div class="big"><div><b>' + t.first + '<small> / ' + N + '</small></b><span>' + (test ? 'right' : 'right on the first try') + (t.helped ? ' ' + bulb(t.helped) : '') + '</span></div><div><b>' + fmt(S.acc) + '</b><span>time on the clock</span></div></div>' +
    lastLine +
    (alone ? '<p class="perfect">Every one on the first try.</p>' : perfect ? '<p class="perfect">Every one right on the first check.</p>' : '') +
    '<div class="tw"><table><thead><tr><th>Part</th><th class="r">' + (test ? 'Right' : 'First try') + '</th>' + (test ? '' : '<th class="r">' + bulb() + '</th>') + '</tr></thead><tbody>' + rows + '</tbody></table></div>' +""",
"""    '<div class="big"><div><b>' + t.earned + '<small> / ' + N + '</small></b><span>' + (test ? 'right' : 'points earned on your own') + '</span></div><div><b>' + fmt(S.acc) + '</b><span>time on the clock</span></div></div>' +
    firstLine + lastLine +
    (alone ? '<p class="perfect">Every one on the first try.</p>' : perfect ? '<p class="perfect">Every point earned.</p>' : '') +
    '<div class="tw"><table><thead><tr><th>Part</th><th class="r">' + (test ? 'Right' : 'Earned') + '</th>' + (test ? '' : '<th class="r">First try</th><th class="r">' + bulb() + '</th>') + '</tr></thead><tbody>' + rows + '</tbody></table></div>' +"""),
# --- finish: a blank is skipped, on My misses
("""    } else if (R.first === null) R.first = false;                                       /* skipped in practice: not a miss, just not done */""",
"""    } else if (R.first === null){ R.first = false; R.skipped = true; streakStep(it.pos, famOf(it), false); }   /* skipped in practice: on My misses, like a miss (24 Oct 2026) */"""),
("""  H[hk] = [{seed: seed, first: t.first, of: ITEMS.length, time: S.acc, at: S.finishedAt}].concat(H[hk] || []).slice(0, 5); store('hist', H);""",
"""  H[hk] = [{seed: seed, first: t.first, earned: t.earned, of: ITEMS.length, time: S.acc, at: S.finishedAt}].concat(H[hk] || []).slice(0, 5); store('hist', H);"""),
# --- older saved sets
("""  var loaded = !!(saved && saved.res && saved.schema === SCHEMA); if (loaded) S = saved;""",
"""  var loaded = !!(saved && saved.res && saved.schema === SCHEMA); if (loaded) S = earnedOf(saved);"""),
("""  S = rec; S.running = false; S.startedAt = null; FLASH = {};""",
"""  S = earnedOf(rec); S.running = false; S.startedAt = null; FLASH = {};"""),
("""function restoreOne(it){""",
"""function earnedOf(rec){                                   /* a set saved before 24 Oct 2026: the point as it was then scored, never rewritten */
  Object.keys(rec.res || {}).forEach(function(k){ var R = rec.res[k]; if (R && R.earned === undefined && !/x\\d+$/.test(k)) R.earned = R.first === true && !R.helped; });
  return rec;
}
function restoreOne(it){"""),
# --- the printed results
("""  if (R.v === 'right') return R.late ? '✓ Right at Finish' : R.first ? '✓ First try' + (R.helped ? ' ' + bulb() : '') : R.shown ? '✓ After seeing the steps' : '✓ On try ' + R.tries;""",
"""  if (R.v === 'right') return (R.late ? '✓ Right at Finish' : R.first && !R.helped ? '✓ First try' : R.first ? '✓ First check ' + bulb() : R.shown ? '✓ After seeing the steps' : '✓ On try ' + R.tries) + (R.earned && !(R.first && !R.helped) && S.mode !== 'test' ? ' · point earned' : '');"""),
("""  h += '<p class="pscore"><span class="bt"><b>' + t.first + ' / ' + N + '</b> right on the first try' + (t.helped ? ' ' + bulb(t.helped) : '') + '</span><span class="bt">' + t.done + ' of ' + N + ' done · time on the clock ' + fmt(elapsed()) + '</span>' +""",
"""  h += '<p class="pscore"><span class="bt"><b>' + t.earned + ' / ' + N + '</b> ' + (test ? 'right' : 'points earned on your own') + '</span>' + (test ? '' : '<span class="bt">' + t.first + ' / ' + N + ' right on the first try' + (t.helped ? ' ' + bulb(t.helped) : '') + '</span>') + '<span class="bt">' + t.done + ' of ' + N + ' done · time on the clock ' + fmt(elapsed()) + '</span>' +"""),
("""  h += '<table class="ptab pres"><thead><tr><th><span class="bt">Part</span></th><th class="r"><span class="bt">' + (test ? 'Right' : 'First try') + '</span></th></tr></thead><tbody>' +
    DS.map(function(s, k){ return '<tr><td><span class="bt">' + s.title + '</span></td><td class="r">' + t.bySec[k].got + ' / ' + t.bySec[k].of + '</td></tr>'; }).join('') + '</tbody></table>';""",
"""  h += '<table class="ptab pres"><thead><tr><th><span class="bt">Part</span></th><th class="r"><span class="bt">' + (test ? 'Right' : 'Earned') + '</span></th></tr></thead><tbody>' +
    DS.map(function(s, k){ return '<tr><td><span class="bt">' + s.title + '</span></td><td class="r">' + (test ? t.bySec[k].got : t.bySec[k].earned) + ' / ' + t.bySec[k].of + '</td></tr>'; }).join('') + '</tbody></table>';"""),
]

PT = [
("""  '<b>#</b> right first try': '<b>#</b> certos de primeira',""",
"""  '<b>#</b> right first try': '<b>#</b> certos de primeira',
  '<b>#</b> earned': '<b>#</b> ganhos',
  '<b>#</b> right': '<b>#</b> certos',
  'point earned': 'ponto ganho',
  '✓ point earned': '✓ ponto ganho',
  'One on your own earns the point.': 'Uma sozinho ganha o ponto.',
  '✓ Correct on your own': '✓ Correto sozinho',
  '✓ Correct': '✓ Correto',"""),
("""  'right on the first try': 'certos de primeira',""",
"""  'right on the first try': 'certos de primeira',
  'points earned on your own': 'pontos ganhos sozinho',
  'Right on the first try: # / #': 'Certos de primeira: # / #',
  'Every point earned.': 'Todos os pontos ganhos.',
  'Earned': 'Ganhos',"""),
("""  '<b># / #</b> right on the first try': '<b># / #</b> certos de primeira',""",
"""  '<b># / #</b> right on the first try': '<b># / #</b> certos de primeira',
  '<b># / #</b> points earned on your own': '<b># / #</b> pontos ganhos sozinho',
  '<b># / #</b> right': '<b># / #</b> certos',
  '# / # right on the first try': '# / # certos de primeira',
  '✓ First check': '✓ Na primeira conferida',
  '✓ First try · point earned': '✓ De primeira · ponto ganho',
  '✓ First check · point earned': '✓ Na primeira conferida · ponto ganho',
  '✓ After seeing the steps · point earned': '✓ Depois de ver os passos · ponto ganho',
  '✓ On try # · point earned': '✓ Na tentativa # · ponto ganho',"""),
]

if __name__ == "__main__":
    patch(os.path.join(HERE, "ui.js"), UI)
    patch(os.path.join(HERE, "lang", "pt-BR.js"), PT)
    print("patched ui.js and lang/pt-BR.js")
