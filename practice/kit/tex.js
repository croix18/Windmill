/* Practice-test kit — the math set in TeX (Croix, 18 Oct 2026: "Make the math in latex").

   The units keep writing math as the kit's small HTML (<span class="m"> with .fr/.nu/.de fractions, .rad radicals, <sup>,
   <i> variables). That HTML stays in the page untouched — every check, the answer key, the Português engine and screen
   readers read it as before. This file only changes what the eye sees: each .m span gets a shadow root, the HTML inside is
   turned into a TeX string by toTex(), and KaTeX draws that string into the shadow. The light DOM is not rendered while
   the shadow has no <slot>; if KaTeX is missing (no network) or a string fails to render, the shadow gets a <slot> and
   the kit's own HTML shows, exactly as on 17 Oct.

   Rule 0 for the picture: check/page.js part E asks this file for the TeX of every math span on the page and on ~60 sets,
   renders each with throwOnError, and requires the digits and letters of the TeX (commands removed) to be, in order, the
   digits and letters of the HTML's text — so a fraction cannot flip, an exponent cannot move, a digit cannot be lost. */
(function(){
  var K = window.Kit = window.Kit || {};
  var CDN = 'https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.11/';
  var SYM = {'×': '\\times ', '·': '\\cdot ', '⋅': '\\cdot ', '÷': '\\div ', '−': '-', '–': '-', '—': '\\text{—}', '≈': '\\approx ', '≠': '\\ne ', '≤': '\\le ', '≥': '\\ge ',
    '→': '\\to ', '°': '^{\\circ}', 'π': '\\pi ', '√': '\\surd ', '∞': '\\infty ', '±': '\\pm ', '…': '\\ldots ', '$': '\\$', '%': '\\%', '&': '\\&', '#': '\\#', '_': '\\_', '{': '\\{', '}': '\\}', '~': '\\sim ', '^': '\\hat{}', '\\': '\\backslash ',
    '¢': '\\text{¢}', ' ': '\\ ', ' ': '\\,', ' ': '\\,'};
  var SUPS = {'⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁻': '-', '⁺': '+'};
  function text(s, italic){                              /* one text node → TeX */
    var out = '', i = 0, n = s.length;
    while (i < n){
      var c = s[i];
      if (SUPS[c] !== undefined){ var k = ''; while (i < n && SUPS[s[i]] !== undefined){ k += SUPS[s[i]]; i++; } out += '^{' + k + '}'; continue; }
      if (/[A-Za-z]/.test(c)){
        var j = i; while (j < n && (/[A-Za-z'’]/.test(s[j]) || (!italic && s[j] === ' ' && /[A-Za-z]/.test(s[j + 1] || '') && /[A-Za-z]/.test(s[j - 1] || '')))) j++;
        var w = s.slice(i, j);
        if (italic) out += w.replace(/[’']/g, '\\prime ');
        else out += (i > 0 && s[i - 1] === ' ' ? '\\;' : '') + '\\text{' + w.replace(/[’']/g, '’') + '}' + (j < n && s[j] === ' ' ? '\\;' : '');
        i = j; continue;
      }
      if (/\d/.test(c)){ var j2 = i; while (j2 < n && /[\d,.]/.test(s[j2])) j2++; while (/[,.]/.test(s[j2 - 1])) j2--; out += s.slice(i, j2).replace(/,/g, '{,}'); i = j2; continue; }
      if (c === ' '){ i++; continue; }                   /* TeX spaces its own */
      out += SYM[c] !== undefined ? SYM[c] : c; i++;
    }
    return out;
  }
  function has(el, cls){ return el.classList && el.classList.contains(cls); }
  function child(el, cls){ for (var i = 0; i < el.children.length; i++) if (has(el.children[i], cls)) return el.children[i]; return null; }
  function tex(node, italic){
    if (node.nodeType === 3) return text(node.nodeValue, italic);
    if (node.nodeType !== 1) return '';
    var tag = node.tagName, out = '', i;
    if (tag === 'SUP') return '^{' + kids(node, italic) + '}';
    if (tag === 'SUB') return '_{' + kids(node, italic) + '}';
    if (tag === 'I' || tag === 'EM' || tag === 'VAR') return kids(node, true);
    if (tag === 'B' || tag === 'STRONG') return '\\mathbf{' + kids(node, italic) + '}';
    if (tag === 'BR') return '\\\\ ';
    if (tag === 'SVG' || tag === 'svg') return '';
    if (has(node, 'fr')){ var nu = child(node, 'nu'), de = child(node, 'de'); if (nu && de) return '\\frac{' + kids(nu, italic) + '}{' + kids(de, italic) + '}'; }
    if (has(node, 'rad')){ var rc = child(node, 'rc'), ri = child(node, 'ri'); if (rc) return '\\sqrt' + (ri ? '[' + kids(ri, italic) + ']' : '') + '{' + kids(rc, italic) + '}'; }
    if (has(node, 'rg')) return '';
    if (has(node, 'bp')){ var t = node.textContent.trim(); if (t === '(') return '\\left('; if (t === ')') return '\\right)'; }
    if (has(node, 'rel')) return ' ' + kids(node, italic) + ' ';
    return kids(node, italic);
    function kids(el, it){ var s = ''; for (i = 0; i < el.childNodes.length; i++) s += tex(el.childNodes[i], it); return s; }
  }
  function toTex(el){
    var s = ''; for (var i = 0; i < el.childNodes.length; i++) s += tex(el.childNodes[i], false);
    /* parentheses grow to a fraction or a root inside them when every ( has its ) */
    if (/\\(frac|sqrt)/.test(s) && !/\\left/.test(s) && (s.match(/\(/g) || []).length === (s.match(/\)/g) || []).length && (s.match(/\(/g) || []).length) s = s.replace(/\(/g, '\\left(').replace(/\)/g, '\\right)');
    return '\\displaystyle ' + s.replace(/\s+$/, '');
  }

  /* what the check compares: the digits and letters, in order, with TeX commands and \text braces removed */
  function skeleton(tex){ return tex.replace(/\\[A-Za-z]+/g, ' ').replace(/[^0-9A-Za-z]/g, ''); }
  function skeletonOf(el){ return el.textContent.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, function(c){ return SUPS[c]; }).replace(/[^0-9A-Za-z]/g, ''); }

  var sheet = null, cssText = null, ready = false, failed = 0, done = 0;
  function paint(el){
    if (el.shadowRoot || !window.katex) return;
    var root; try { root = el.attachShadow({mode: 'open'}); } catch(e){ return; }
    var s = toTex(el), html = '';
    try { html = katex.renderToString(s, {throwOnError: true, strict: 'ignore', output: 'html'}); } catch(e){ html = ''; }
    if (!html){ root.innerHTML = '<slot></slot>'; failed++; el.setAttribute('data-tex-fallback', ''); return; }
    if (sheet) root.adoptedStyleSheets = [sheet]; else if (cssText) html = '<style>' + cssText + '</style>' + html;
    root.innerHTML = html; done++;
  }
  var queued = false;
  function run(){ queued = false; if (!ready) return; var all = document.querySelectorAll('.m'); for (var i = 0; i < all.length; i++) if (!all[i].shadowRoot) paint(all[i]); }
  function schedule(){ if (queued) return; queued = true; (window.requestAnimationFrame || setTimeout)(run); }
  function start(){
    ready = true; run();
    new MutationObserver(schedule).observe(document.body, {childList: true, subtree: true});
  }
  var LOCAL = '.katex{font-size:1.08em;line-height:1.2;text-indent:0;white-space:nowrap}.katex .text{font-family:"Lexend",system-ui,sans-serif}.katex .mord.text{font-family:"Lexend",system-ui,sans-serif}' +
    '@media print{.katex{color:#000}}';
  function boot(){
    if (!document.body) return setTimeout(boot, 10);
    if (!window.MutationObserver || !Element.prototype.attachShadow) return;   /* an old browser keeps the kit's HTML */
    var inl = document.getElementById('katex-css');
    if (window.katex && inl){                               /* the build inlines KaTeX and its fonts: no network at all */
      var css0 = inl.textContent + LOCAL;
      try { sheet = new CSSStyleSheet(); sheet.replaceSync(css0); } catch(e){ sheet = null; cssText = css0; }
      return start();
    }
    if (!window.fetch) return;
    fetch(CDN + 'katex.min.css').then(function(r){ return r.ok ? r.text() : Promise.reject(r.status); }).then(function(css){
      css = css.replace(/url\((['"]?)fonts\//g, 'url($1' + CDN + 'fonts/') + LOCAL;
      try { sheet = new CSSStyleSheet(); sheet.replaceSync(css); } catch(e){ sheet = null; cssText = css; }
      var sc = document.createElement('script'); sc.src = CDN + 'katex.min.js'; sc.async = true;
      sc.onload = start; sc.onerror = function(){};
      document.head.appendChild(sc);
    }).catch(function(){});
  }
  K.Tex = {toTex: toTex, skeleton: skeleton, skeletonOf: skeletonOf, isReady: function(){ return ready; }, stats: function(){ return {done: done, failed: failed}; }, CDN: CDN};
  boot();
})();
