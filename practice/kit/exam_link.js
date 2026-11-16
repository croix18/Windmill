/* Practice-test kit: the way to the unit's test from its practice page (exam_link.js, 15 Nov 2026; practice/exam/DESIGN.md).
   On mrshaffer.org only (/<course>/practice/unit-N/): while the site says the unit's test is open (GET /api/test/status), the
   start screen has a third choice, Test, a link to /<course>/test/unit-N/. A failed or missing answer shows nothing. Student
   pages only (build.py); the page makes no other request. */
(function(){
'use strict';
var m = /^\/(m7|a7)\/practice\/unit-(\d+)\/(index\.html)?$/.exec(location.pathname || ''), U = window.Unit;
if (!m || !U || !window.fetch || (/u(\d+)$/.exec(U.id || '') || [])[1] !== m[2]) return;
fetch('/api/test/status?course=' + m[1] + '&unit=' + m[2], {credentials: 'same-origin', cache: 'no-store'})
  .then(function(r){ return r.ok ? r.json() : null; })
  .then(function(j){
    if (!j || j.open !== true) return;
    /* on the site ui.js draws only once the approvals have come (approvals.js), so the start screen may not be there yet (16 Nov
       2026: on a busy machine the status came first and the link was never shown): wait for it */
    var put = function(){
      var at = document.getElementById('pgStart'); if (!at) return false; if (document.getElementById('pgTest')) return true;
      var a = document.createElement('a'); a.id = 'pgTest'; a.className = 'pgtest'; a.href = '../../test/unit-' + m[2] + '/'; a.textContent = 'Test';
      at.parentNode.insertBefore(a, at.nextSibling); return true;
    };
    if (put() || !window.MutationObserver) return;
    var ob = new MutationObserver(function(){ if (put()) ob.disconnect(); }); ob.observe(document.body, {childList: true, subtree: true});
    setTimeout(function(){ ob.disconnect(); }, 30000);
  }).catch(function(){});
})();
