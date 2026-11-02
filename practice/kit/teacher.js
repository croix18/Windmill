/* Practice-test kit — the TEACHER copy (Croix, 19 Oct 2026: "I want to be able to print the test as well, not just make up
   tests" → "Separate teacher page"; "and the m7 one too").

   Loaded after the unit's scripts on a teacher build only. It adds a bar at the top of the student page that prints THE
   REAL UNIT TEST — window.TEACHER_TEST, written by teacher_gen.py from the course's unit.py — as the paper: Form A / Form B
   (ruling 33) where the unit has them, the test, the test with its key, or the key alone. Stems and answers are TeX,
   drawn by KaTeX (inlined by the build); figures are the paper's own shape specs drawn as SVG. A teacher page carries
   the answer key in its source, so it is never linked for students — they get the student page (the class website, or
   Google Sites); on the website a teacher copy is behind the teacher password (/teacher/). */
(function boot(tries){
  var T = window.TEACHER_TEST; if (!T) return;
  if (T.random){                                          /* ruling 49 (22 Oct 2026): the unit test IS a random set of this page */
    if (!window.PracticePrint){ if ((tries || 0) < 200) setTimeout(function(){ boot((tries || 0) + 1); }, 25); return; }
    var rbar = document.createElement('div'); rbar.className = 'teacherbar'; rbar.setAttribute('translate', 'no'); rbar.setAttribute('role', 'region'); rbar.setAttribute('aria-label', 'Teacher copy');
    rbar.innerHTML = '<div class="tbtxt"><b>Teacher copy.</b> The Unit ' + T.unit + ' test is a random set of this page: every form below is a different set, headed as a test, ' +
      'with its answer key on its own page. Do not share this link or file with students — they use the student page, on the class website or Google Sites.</div>' +
      '<div class="tbbtns"><span class="tblab">Print the test:</span>' + [1, 2, 3, 4, 5].map(function(n){ return '<button type="button"' + (n === 1 ? ' class="go"' : '') + ' data-tforms="' + n + '">' + n + (n === 1 ? ' form' : ' forms') + '</button>'; }).join('') + '</div>';
    var rsheet = document.querySelector('.sheet'); if (rsheet) rsheet.insertBefore(rbar, rsheet.firstChild);
    rbar.addEventListener('click', function(e){ var b = e.target.closest('[data-tforms]'); if (b) window.PracticePrint.forms(+b.dataset.tforms, 'Test'); });
    document.title = T.course + ' Unit ' + T.unit + ' — Teacher copy';
    window.TEACHER = {random: true, forms: [], errors: [], print: function(n){ window.PracticePrint.forms(n, 'Test'); }};
    return;
  }
  if (!window.katex){ if ((tries || 0) < 200) setTimeout(function(){ boot((tries || 0) + 1); }, 25); return; }   /* KaTeX is inlined after the unit scripts */
  var LET = 'ABCDEFGH', FORMS = Object.keys(T.forms), form = FORMS[0];
  /* Which questions get printed (Croix, 2 Nov 2026, the morning of the Unit 9 test: "Can I get the opportunity to edit
     which test questions get printed on the test"). The questions are numbered through the paper; a left-out question is
     left out of every form, the test and the key, the ones kept are renumbered in order, and the points follow. The choice is
     kept on this browser (localStorage) until it is changed. */
  var PICK_KEY = 'teacher.pick.' + T.course + '.' + T.unit, picked = null;
  function allQ(){ var out = []; T.forms[FORMS[0]].forEach(function(sec, si){ sec.items.forEach(function(it, ii){ out.push({si: si, ii: ii, it: it, sec: sec}); }); }); return out; }
  function loadPick(){ try { var v = JSON.parse(localStorage.getItem(PICK_KEY) || 'null'); if (v && v.length === allQ().length) return v; } catch(e){} return allQ().map(function(){ return true; }); }
  picked = loadPick();
  function savePick(){ try { localStorage.setItem(PICK_KEY, JSON.stringify(picked)); } catch(e){} }
  function keptForms(f){                                  /* the form with the left-out questions removed */
    var k = 0, secs = [];
    T.forms[f].forEach(function(sec){ var items = sec.items.filter(function(){ return picked[k++]; }); if (items.length) secs.push({title: sec.title, benchmark: sec.benchmark, items: items, points: items.reduce(function(t, it){ return t + (it.parts ? it.parts.length : 1); }, 0)}); });
    return secs;
  }
  function total(f){ return keptForms(f).reduce(function(t, s){ return t + s.points; }, 0); }
  function nLeftOut(){ return picked.filter(function(x){ return !x; }).length; }
  function esc(s){ return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  var errors = [];
  function tex(s){                                        /* "text $math$ text" → html; the math by KaTeX */
    return String(s).split('$').map(function(seg, k){
      if (!(k % 2)) return esc(seg).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
      try { return katex.renderToString('\\displaystyle ' + seg, {throwOnError: true, strict: 'ignore', output: 'html'}); }
      catch(e){ errors.push([seg, String(e.message || e)]); return '<code>' + esc(seg) + '</code>'; }
    }).join('');
  }
  function formWord(f){ return f === 'test' ? '' : 'Form ' + f; }
  function head(f, key){
    var sub = [formWord(f), total(f) + ' points', key ? 'ANSWER KEY' : T.two_day ? 'two class periods' : ''].filter(Boolean).join(' · ');   /* ruling 51: an empty two_day is a one-period test, which says nothing about its length (Croix, 25 Oct 2026: "I don't need that text at all") */
    return '<div class="phead"><div class="pt1 ptest">' + esc(T.course + ' Unit ' + T.unit + ' Test') + '</div><div class="pt2">' + esc(T.title) + ' · ' + esc(sub) + '</div>' +
      (key ? '' : '<div class="pname">Name:<span class="pline"></span>Date:<span class="pline short"></span>Period:<span class="pline short"></span></div>') + '</div>';   /* the paper's Name, Date and Period (ruling 54) */
  }
  function work(inches){ return '<div class="pwork" style="height:' + (Math.max(0.4, +inches || 0.6) * 0.9).toFixed(2) + 'in"></div>'; }
  function choices(it){
    return '<div class="pchoices">' + it.choices.map(function(c, k){ return '<div class="pch"><span class="pbox' + (it.multi ? ' sq' : '') + '"></span><span class="cl">' + LET[k] + '.</span><span class="cv">' + tex(c) + '</span></div>'; }).join('') + '</div>';
  }
  function testHtml(f){
    var secs = keptForms(f), h = [head(f, false)], qn = 0;
    h.push('<p class="pnotes">' + (T.two_day ? '<span class="pinote">' + esc(T.two_day) + '</span>' : '') + (T.notes || []).map(function(n){ return '<span class="pinote">' + esc(n) + '</span>'; }).join('') + '</p>');
    secs.forEach(function(sec, si){
      h.push('<h2 class="psec">' + esc(sec.title) + '<span class="ppts">' + sec.points + ' points</span></h2>');   /* ruling 54: named, never numbered */
      if (sec.items.some(function(it){ return it.parts; })) h.push('<p class="pft">' + esc(T.follow_through_student) + '</p>');
      sec.items.forEach(function(it){
        qn++;
        var q = '<div class="pq"><div class="pqh"><div class="stem"><b class="num">' + qn + '.</b><span class="st">' + tex(it.stem) + '</span>' + (it.parts ? '' : '<span class="pt">1 pt</span>') + '</div>' + (it.fig || '') + '</div>';
        /* work space and no answer line, as the paper (house rule 2; the docx test has none — 25 Oct 2026) */
        if (it.parts) it.parts.forEach(function(p){ q += '<div class="ppart"><div class="line"><b class="lab">' + esc(p.label) + '.</b><span class="st">' + tex(p.stem) + '</span><span class="pt">1 pt</span></div>' + (p.choices ? choices(p) : work(p.space)) + '</div>'; });   /* a part may have choices (2 Nov 2026) */
        else if (it.choices) q += '<div class="ppart">' + choices(it) + '</div>';
        else q += '<div class="ppart">' + work(it.space) + '</div>';
        h.push(q + '</div>');
      });
    });
    return h.join('');
  }
  function keyHtml(f){
    var rows = [], qn = 0, byBm = {};
    keptForms(f).forEach(function(sec){ sec.items.forEach(function(it){
      qn++; var units = it.parts || [it];
      byBm[sec.benchmark] = byBm[sec.benchmark] || {qs: [], pts: 0}; byBm[sec.benchmark].qs.push(qn); byBm[sec.benchmark].pts += units.length;
      units.forEach(function(p, pi){
        var lab = qn + (it.parts ? p.label : '');
        var ch = it.choices ? it : p.choices ? p : null;
        var ans = ch ? ch.correct.map(function(c){ return '<b>' + LET[c] + '.</b> ' + tex(ch.choices[c]); }).join('&nbsp;&nbsp; ') : tex(p.answer);
        var why = (it.transfer && pi === 0 ? '<div class="kflag">' + esc(T.transfer_flag) + '</div>' : '') + (p.why ? '<div class="kwhy">' + tex(p.why) + '</div>' : '') +
          (it.errors && Object.keys(it.errors).length ? '<div class="kerr">' + Object.keys(it.errors).map(function(L){ return '<b>' + L + '</b> ' + tex(it.errors[L]); }).join('<br>') + '</div>' : '');
        rows.push('<tr><td class="pk">' + lab + '</td><td class="kv">' + ans + why + '</td></tr>');
      });
    }); });
    var tracker = '<h2 class="psec">Score tracker</h2><table class="ptab ptrack"><thead><tr><th>Benchmark</th><th>Questions</th><th>Possible</th><th>Earned</th></tr></thead><tbody>' +
      (T.tracker_order || Object.keys(T.tracker)).map(function(bm){ var b = byBm[bm] || {qs: [], pts: 0}; return '<tr><td>' + esc(bm) + '</td><td>' + b.qs.join(', ') + '</td><td>' + b.pts + '</td><td></td></tr>'; }).join('') +
      '<tr><td><b>Total</b></td><td></td><td><b>' + total(f) + '</b></td><td></td></tr></tbody></table>' +
      '<p class="pft">' + esc(T.follow_through_student) + ' Nothing is weighed and nothing is arguable: apply the part’s operation to the student’s own earlier value and tick if that is what is written.</p>';
    return '<div class="pkey">' + head(f, true) + (T.follow_through_key ? '<p class="pmeta kft">' + esc(T.follow_through_key) + '</p>' : '') + '<table class="ptab"><tbody>' + rows.join('') + '</tbody></table>' + tracker + '</div>';
  }
  function plainStem(s0){ return String(s0).replace(/\$[^$]*\$/g, function(m){ return m.slice(1, -1).replace(/\\(text|mathrm)\{([^}]*)\}/g, '$2').replace(/(\d)\\frac\{(\d+)\}\{(\d+)\}/g, '$1 $2/$3').replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, '$1/$2').replace(/\\left|\\right/g, '').replace(/\\(times|cdot)/g, '×').replace(/\\[a-zA-Z]+/g, ' ').replace(/[{}]/g, '').replace(/\s*,\s*/g, ', '); }).replace(/\*\*/g, '').replace(/\s+/g, ' ').replace(/\( /g, '(').replace(/ \)/g, ')').trim(); }
  function pickPanel(){
    var pv = document.getElementById('printview');
    if (!pv){ pv = document.createElement('div'); pv.id = 'printview'; pv.setAttribute('role', 'dialog'); pv.setAttribute('translate', 'no'); pv.setAttribute('aria-label', 'Choose the questions'); document.body.appendChild(pv); }
    var qs = allQ(), rows = [], qn = 0, lastSec = -1;
    qs.forEach(function(q, i){
      if (q.si !== lastSec){ lastSec = q.si; rows.push('<h3 class="tpsec">' + esc(q.sec.title) + '</h3>'); }
      qn++; var pts = q.it.parts ? q.it.parts.length : 1, st = plainStem(q.it.stem);
      rows.push('<label class="tpq' + (picked[i] ? '' : ' off') + '"><input type="checkbox" data-pick="' + i + '"' + (picked[i] ? ' checked' : '') + '><b class="tpn">' + qn + '.</b><span class="tps">' + esc(st.length > 110 ? st.slice(0, 108) + '…' : st) + (FORMS.length > 1 ? ' <i class="tpf">(Form ' + FORMS[0] + ')</i>' : '') + '</span><span class="tpp">' + pts + (pts === 1 ? ' pt' : ' pts') + '</span></label>');
    });
    pv.innerHTML = '<div class="pbar"><button type="button" class="go" id="tpDone">Done</button><button type="button" id="tpAll">Keep every question</button><span class="pvhint" id="tpSum"></span></div>' +
      '<div class="ppage tpage tpick"><h2 class="psec">Questions to print</h2><p class="pnotes"><span class="pinote">Untick a question to leave it off the test and the key' + (FORMS.length > 1 ? ' on every form (the forms share their question order; the words shown are Form ' + FORMS[0] + '\u2019s)' : '') + '. The ones you keep are renumbered in order, and the points follow. The choice is kept on this computer until you change it.</span></p>' + rows.join('') + '</div>';
    pv.hidden = false; document.body.classList.add('printing'); window.scrollTo(0, 0);
    function sum(){ var n = nLeftOut(); document.getElementById('tpSum').textContent = (n ? n + ' left out · ' : 'every question · ') + total(form) + ' points'; var bb = document.querySelector('[data-tprint="test"]'); if (bb) bb.textContent = n ? 'Test (' + (qs.length - n) + ' of ' + qs.length + ')' : 'Test'; }
    pv.addEventListener('change', function(e){ var c = e.target.closest('[data-pick]'); if (!c) return; picked[+c.dataset.pick] = c.checked; c.closest('.tpq').classList.toggle('off', !c.checked); savePick(); sum(); });
    document.getElementById('tpAll').onclick = function(){ picked = picked.map(function(){ return true; }); savePick(); pickPanel(); };
    document.getElementById('tpDone').onclick = function(){ pv.hidden = true; pv.innerHTML = ''; document.body.classList.remove('printing'); var b = document.getElementById('tpick'); if (b) b.focus(); };
    sum(); document.getElementById('tpDone').focus();
  }
  function show(kind){
    var pv = document.getElementById('printview');
    if (!pv){ pv = document.createElement('div'); pv.id = 'printview'; pv.setAttribute('role', 'dialog'); pv.setAttribute('translate', 'no'); pv.setAttribute('aria-label', 'Print preview'); document.body.appendChild(pv); }
    var body = kind === 'key' ? keyHtml(form) : testHtml(form) + (kind === 'tk' ? '<div class="pbreak"></div>' + keyHtml(form) : '');
    pv.innerHTML = '<div class="pbar"><button type="button" class="go" id="pvPrint">Print</button><button type="button" id="pvClose">Close</button><span class="pvhint">If nothing happens, use your browser’s Print (Ctrl + P).</span></div><div class="ppage tpage">' + body + '</div>';
    pv.hidden = false; document.body.classList.add('printing'); window.scrollTo(0, 0);
    document.getElementById('pvPrint').onclick = function(){ try { window.print(); } catch(e){} };
    document.getElementById('pvClose').onclick = function(){ pv.hidden = true; pv.innerHTML = ''; document.body.classList.remove('printing'); var b = document.querySelector('.teacherbar button'); if (b) b.focus(); };
    document.getElementById('pvPrint').focus();
  }
  var bar = document.createElement('div'); bar.className = 'teacherbar'; bar.setAttribute('translate', 'no'); bar.setAttribute('role', 'region'); bar.setAttribute('aria-label', 'Teacher copy');
  var pick = FORMS.length > 1 ? '<label class="tbform">Form <select id="tform" aria-label="Which form">' + FORMS.map(function(f){ return '<option value="' + f + '">' + f + '</option>'; }).join('') + '</select></label>' : '';
  bar.innerHTML = '<div class="tbtxt"><b>Teacher copy.</b> This page holds the real Unit ' + T.unit + ' test' + (FORMS.length > 1 ? ' (Forms ' + FORMS.join(' and ') + ')' : '') + ' and its answer key — do not share this link or file with students. ' +
    'Students use the student page, on the class website or Google Sites.</div><div class="tbbtns"><span class="tblab">Print the real test:</span>' + pick +
    '<button type="button" class="go" data-tprint="test">' + (nLeftOut() ? 'Test (' + (picked.length - nLeftOut()) + ' of ' + picked.length + ')' : 'Test') + '</button><button type="button" class="go" data-tprint="tk">Test + key</button><button type="button" data-tprint="key">Key only</button>' +
    '<button type="button" id="tpick" aria-haspopup="dialog">Choose questions…</button></div>';
  var sheet = document.querySelector('.sheet'); if (sheet) sheet.insertBefore(bar, sheet.firstChild);
  bar.addEventListener('click', function(e){ var b = e.target.closest('[data-tprint]'); if (b) show(b.dataset.tprint); if (e.target.closest('#tpick')) pickPanel(); });
  var sel = bar.querySelector('#tform'); if (sel) sel.addEventListener('change', function(){ form = sel.value; });
  document.title = T.course + ' Unit ' + T.unit + ' — Teacher copy';
  window.TEACHER = {testHtml: testHtml, keyHtml: keyHtml, errors: errors, show: show, forms: FORMS, setForm: function(f){ form = f; if (sel) sel.value = f; },
    pick: function(v){ if (v) { picked = v.slice(); savePick(); } return picked.slice(); }, total: total, pickPanel: pickPanel};
})(0);
