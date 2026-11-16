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
    var at = document.getElementById('pgStart'); if (!at || document.getElementById('pgTest')) return;
    var a = document.createElement('a'); a.id = 'pgTest'; a.className = 'pgtest'; a.href = '../../test/unit-' + m[2] + '/'; a.textContent = 'Test';
    at.parentNode.insertBefore(a, at.nextSibling);
  }).catch(function(){});
})();
