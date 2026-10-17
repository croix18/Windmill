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
import hashlib, json, os, sys
KIT = os.path.dirname(os.path.abspath(__file__))
if len(sys.argv) < 2: sys.exit(__doc__)
UD = os.path.abspath(sys.argv[1])
cfg = json.load(open(os.path.join(UD, "unit.json"), encoding="utf-8"))
rk = lambda f: open(os.path.join(KIT, f), encoding="utf-8").read()
ru = lambda f: open(os.path.join(UD, f), encoding="utf-8").read()

KITFILES = ["core.js", "bilingual.js", "ui.js", "kit.css"] + (["lang/" + cfg["second"] + ".js"] if cfg.get("second") else [])
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
""" + (f"<script>{rk('lang/' + cfg['second'] + '.js')}</script>\n" if cfg.get("second") else "") + "".join(f"<script>{ru(s)}</script>\n" for s in cfg["scripts"]) + f"<script>{rk('ui.js')}</script>\n"
open(os.path.join(UD, cfg["file"]), "w", encoding="utf-8").write(body)
title = body.split("\n", 1)[0]
full = ('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
        + title + '</head><body>' + body.split("\n", 1)[1] + "</body></html>")
for name in ["preview.html", cfg["download"]]:
    open(os.path.join(UD, name), "w", encoding="utf-8").write(full)
print(cfg["file"], len(body), "bytes;", "preview.html and", cfg["download"], "written")
