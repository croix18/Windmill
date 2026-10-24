"""Practice-test kit: build one unit's page.   python3 <kit>/build.py <unit folder>

Reads <unit>/unit.json:
  {"title": "...", "file": "m7-unit-4-practice-test.html", "download": "M7 Unit 4 Practice Test.html",
   "css": ["fig.css", "unit.css"], "scripts": ["engine.js", "fig.js", "coach.js", "pt.js", "unit.js"],
   "second": "pt-BR"}                      ← optional: the second-language toggle, with kit/lang/pt-BR.js
and writes, in the unit folder:
  <file>      the artifact body (the claude.ai publisher adds the document skeleton)
  preview.html and <download>   the same page as a complete document (doctype, lang, charset): for Google Sites,
              Netlify Drop, or opening locally.
Order: kit/core.js, kit/bilingual.js, kit/lang/<second>.js (if any), the unit's scripts (their last one sets window.Unit), kit/ui.js. Refuses to build when the unit's
checks have not passed since its sources last changed (run its check script; it writes CHECKED with the source hash)."""
import re
import hashlib, json, os, sys
KIT = os.path.dirname(os.path.abspath(__file__))
if len(sys.argv) < 2: sys.exit(__doc__)
UD = os.path.abspath(sys.argv[1])
cfg = json.load(open(os.path.join(UD, "unit.json"), encoding="utf-8"))
rk = lambda f: open(os.path.join(KIT, f), encoding="utf-8").read()
ru = lambda f: open(os.path.join(UD, f), encoding="utf-8").read()

KITFILES = ["core.js", "bilingual.js", "ui.js", "tex.js", "kit.css", "vendor/katex/katex.min.js", "vendor/katex/katex.min.css"] + (["lang/" + cfg["second"] + ".js"] if cfg.get("second") else [])
def katex_css():
    """KaTeX's stylesheet with the shipped fonts inlined (woff2 only); faces not shipped fall back to KaTeX_Main."""
    import base64
    css = open(os.path.join(KIT, "vendor", "katex", "katex.min.css"), encoding="utf-8").read()
    fdir = os.path.join(KIT, "vendor", "katex", "fonts")
    def face(m):
        block = m.group(0); name = re.search(r"url\(fonts/(KaTeX_[A-Za-z0-9-]+)\.woff2\)", block)
        if not name: return block
        fp = os.path.join(fdir, name.group(1) + ".woff2")
        if not os.path.exists(fp): return ""
        b64 = base64.b64encode(open(fp, "rb").read()).decode()
        return re.sub(r"src:[^;}]*", 'src:url(data:font/woff2;base64,' + b64 + ') format("woff2")', block)
    return re.sub(r"@font-face\{[^}]*\}", face, css)

def source_hash():
    h = hashlib.sha256()
    for f in KITFILES: h.update(rk(f).encode())
    for f in cfg["scripts"] + cfg.get("css", []): h.update(ru(f).encode())
    return h.hexdigest()[:16]
if "--force" not in sys.argv:
    ok = os.path.exists(os.path.join(UD, "CHECKED")) and open(os.path.join(UD, "CHECKED")).read().split()[0] == source_hash()
    if not ok: sys.exit("build: the checks have not passed for these sources — run the unit's checks first (or --force for a look only)")

esc = lambda s: s.replace("&", "&amp;").replace("<", "&lt;")
body = f"""<title>{esc(cfg['title'])}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Lexend:wght@400;500;600;700&display=swap">
<style>{rk('kit.css')}{''.join(ru(c) for c in cfg.get('css', []))}</style>
<div class="watch" role="region" aria-label="Stopwatch and score"><div class="in">
  <div class="time" id="time" aria-label="Time on the clock">0:00</div>
  <div class="score" id="score"></div>
  <div class="btns"><button type="button" id="bPause" hidden>Pause</button><button type="button" class="go" id="bResume" hidden>Resume</button><button type="button" id="bFinish">Finish</button></div>
  <div class="confirm" id="confirm" role="alertdialog" aria-live="assertive" hidden></div>
</div><div class="bar"><i id="prog"></i></div></div>
<div class="result" id="result" hidden></div>
<main class="sheet">
  <div class="head"><div><div class="eyebrow" id="eyebrow"></div><h1 id="h1"></h1><div class="total"><span id="total"></span></div></div></div>
  <p class="intro" id="intro"></p>
  <div class="ctl"><div class="mode" role="group" aria-label="How to practice"><button type="button" data-mode="practice" aria-pressed="true">Check as I go</button><button type="button" data-mode="test" aria-pressed="false">Like the real test</button></div><select id="scope" aria-label="What to practice"></select></div>
  <details class="setbox"><summary>Set <b id="setno"></b> · <span class="chg">Change</span></summary>
    <div class="setrow"><label for="setin">Set number</label><input type="text" inputmode="numeric" id="setin" autocomplete="off"><button type="button" id="setgo">Go</button><button type="button" class="go" id="bNew">New set</button><button type="button" id="bAgain">Start this set over</button></div></details>
  <p class="notice" id="notice" role="status" hidden></p>
  <div id="paper"></div>
</main>
<script>{rk('core.js')}</script>
<script>{rk('bilingual.js')}</script>
""" + (f"<script>{rk('lang/' + cfg['second'] + '.js')}</script>\n" if cfg.get("second") else "") + "".join(f"<script>{ru(s)}</script>\n" for s in cfg["scripts"]) + f"<script>{rk('ui.js')}</script>\n<style id=\"katex-css\">{katex_css()}</style>\n<script>{rk('vendor/katex/katex.min.js')}</script>\n<script>{rk('tex.js')}</script>\n"
# the test's own numbers never ship (24 Oct 2026): a unit keeps them in test_forms.js, loaded by its checks alone. A page that
# holds that file's name, or any line of its data, is refused — on the student page and the teacher copy alike.
tf = os.path.join(UD, "test_forms.js")
if not os.path.exists(tf) and os.path.basename(UD) == "teacher": tf = os.path.join(os.path.dirname(UD), "test_forms.js")
if os.path.exists(tf):
    if "TEST_FORMS" in body: sys.exit("REFUSED: the page names TEST_FORMS — the test's numbers must not ship")
    for line in open(tf, encoding="utf-8"):
        line = line.strip()
        if line.startswith("//") or line.startswith("/*") or line.startswith("*") or len(line) < 12 or line.startswith("const ") or line.startswith("if ("): continue
        if line.rstrip(",") in body: sys.exit("REFUSED: the page holds a line of test_forms.js: " + line[:60])
open(os.path.join(UD, cfg["file"]), "w", encoding="utf-8").write(body)
title = body.split("\n", 1)[0]
full = ('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
        + title + '</head><body>' + body.split("\n", 1)[1] + "</body></html>")
for name in ["preview.html", cfg["download"]]:
    open(os.path.join(UD, name), "w", encoding="utf-8").write(full)
print(cfg["file"], len(body), "bytes;", "preview.html and", cfg["download"], "written")
