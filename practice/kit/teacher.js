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
    var sub = [formWord(f), T.total + ' points', key ? 'ANSWER KEY' : T.two_day ? 'two class periods' : ''].filter(Boolean).join(' · ');   /* ruling 51: an empty two_day is a one-period test, which says nothing about its length (Croix, 25 Oct 2026: "I don't need that text at all") */
    return '<div class="phead"><div class="pt1 ptest">' + esc(T.course + ' Unit ' + T.unit + ' Test') + '</div><div class="pt2">' + esc(T.title) + ' · ' + esc(sub) + '</div>' +
      (key ? '' : '<div class="pname">Name:<span class="pline"></span>Date:<span class="pline short"></span></div>') + '</div>';
  }
  function work(inches){ return '<div class="pwork" style="height:' + (Math.max(0.4, +inches || 0.6) * 0.9).toFixed(2) + 'in"></div>'; }
  function choices(it){
    return '<div class="pchoices">' + it.choices.map(function(c, k){ return '<div class="pch"><span class="pbox' + (it.multi ? ' sq' : '') + '"></span><span class="cl">' + LET[k] + '.</span><span class="cv">' + tex(c) + '</span></div>'; }).join('') + '</div>';
  }
  function testHtml(f){
    var secs = T.forms[f], h = [head(f, false)], qn = 0;
    h.push('<p class="pnotes">' + (T.two_day ? '<span class="pinote">' + esc(T.two_day) + '</span>' : '') + (T.notes || []).map(function(n){ return '<span class="pinote">' + esc(n) + '</span>'; }).join('') + '</p>');
    secs.forEach(function(sec, si){
      h.push('<h2 class="psec">' + (si + 1) + '.&nbsp; ' + esc(sec.title) + '<span class="ppts">' + sec.points + ' points</span></h2>');
      if (sec.items.some(function(it){ return it.parts; })) h.push('<p class="pft">' + esc(T.follow_through_student) + '</p>');
      sec.items.forEach(function(it){
        qn++;
        var q = '<div class="pq"><div class="pqh"><div class="stem"><b class="num">' + qn + '.</b><span class="st">' + tex(it.stem) + '</span>' + (it.parts ? '' : '<span class="pt">1 pt</span>') + '</div>' + (it.fig || '') + '</div>';
        /* work space and no answer line, as the paper (house rule 2; the docx test has none — 25 Oct 2026) */
        if (it.parts) it.parts.forEach(function(p){ q += '<div class="ppart"><div class="line"><b class="lab">' + esc(p.label) + '.</b><span class="st">' + tex(p.stem) + '</span><span class="pt">1 pt</span></div>' + work(p.space) + '</div>'; });
        else if (it.choices) q += '<div class="ppart">' + choices(it) + '</div>';
        else q += '<div class="ppart">' + work(it.space) + '</div>';
        h.push(q + '</div>');
      });
    });
    return h.join('');
  }
  function keyHtml(f){
    var rows = [], qn = 0, byBm = {};
    T.forms[f].forEach(function(sec){ sec.items.forEach(function(it){
      qn++; var units = it.parts || [it];
      byBm[sec.benchmark] = byBm[sec.benchmark] || {qs: [], pts: 0}; byBm[sec.benchmark].qs.push(qn); byBm[sec.benchmark].pts += units.length;
      units.forEach(function(p, pi){
        var lab = qn + (it.parts ? p.label : '');
        var ans = it.choices ? it.correct.map(function(c){ return '<b>' + LET[c] + '.</b> ' + tex(it.choices[c]); }).join('&nbsp;&nbsp; ') : tex(p.answer);
        var why = (it.transfer && pi === 0 ? '<div class="kflag">' + esc(T.transfer_flag) + '</div>' : '') + (p.why ? '<div class="kwhy">' + tex(p.why) + '</div>' : '') +
          (it.errors && Object.keys(it.errors).length ? '<div class="kerr">' + Object.keys(it.errors).map(function(L){ return '<b>' + L + '</b> ' + tex(it.errors[L]); }).join('<br>') + '</div>' : '');
        rows.push('<tr><td class="pk">' + lab + '</td><td class="kv">' + ans + why + '</td></tr>');
      });
    }); });
    var tracker = '<h2 class="psec">Score tracker</h2><table class="ptab ptrack"><thead><tr><th>Benchmark</th><th>Questions</th><th>Possible</th><th>Earned</th></tr></thead><tbody>' +
      (T.tracker_order || Object.keys(T.tracker)).map(function(bm){ var b = byBm[bm] || {qs: [], pts: 0}; return '<tr><td>' + esc(bm) + '</td><td>' + b.qs.join(', ') + '</td><td>' + b.pts + '</td><td></td></tr>'; }).join('') +
      '<tr><td><b>Total</b></td><td></td><td><b>' + T.total + '</b></td><td></td></tr></tbody></table>' +
      '<p class="pft">' + esc(T.follow_through_student) + ' Nothing is weighed and nothing is arguable: apply the part’s operation to the student’s own earlier value and tick if that is what is written.</p>';
    return '<div class="pkey">' + head(f, true) + (T.follow_through_key ? '<p class="pmeta kft">' + esc(T.follow_through_key) + '</p>' : '') + '<table class="ptab"><tbody>' + rows.join('') + '</tbody></table>' + tracker + '</div>';
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
    '<button type="button" class="go" data-tprint="test">Test</button><button type="button" class="go" data-tprint="tk">Test + key</button><button type="button" data-tprint="key">Key only</button></div>';
  var sheet = document.querySelector('.sheet'); if (sheet) sheet.insertBefore(bar, sheet.firstChild);
  bar.addEventListener('click', function(e){ var b = e.target.closest('[data-tprint]'); if (b) show(b.dataset.tprint); });
  var sel = bar.querySelector('#tform'); if (sel) sel.addEventListener('change', function(){ form = sel.value; });
  document.title = T.course + ' Unit ' + T.unit + ' — Teacher copy';
  window.TEACHER = {testHtml: testHtml, keyHtml: keyHtml, errors: errors, show: show, forms: FORMS, setForm: function(f){ form = f; if (sel) sel.value = f; }};
})(0);
