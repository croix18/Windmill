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

KITFILES = ["core.js", "bilingual.js", "ui.js", "tex.js", "kit.css", "vendor/katex/katex.min.js", "vendor/katex/katex.min.css", "bank.js"] + (["lang/" + cfg["second"] + ".js"] if cfg.get("second") else [])

# a lesson's practice from Cadence (7 Nov 2026): the unit's bank/ (Windmill tools/cadence_bank.py) — the student page's own
# folder, or for a teacher copy its unit's — is inlined, as everything is: the page loads nothing
def bank_dir():
    for d in (os.path.join(UD, "bank"), os.path.join(os.path.dirname(UD), "bank")):
        if all(os.path.exists(os.path.join(d, f)) for f in ("cadence.json", "map.json", "BANK.sha256")): return d
    return None
BANK = bank_dir()
def bank_files():
    return [os.path.join(BANK, f) for f in ("cadence.json", "map.json")] if BANK else []
def bank_script():
    """the bank as the page reads it: what bank.js uses and nothing else — no benchmark codes (they stay off student pages),
    no plain-text copies. BANK.sha256 must match the two files (a hand-edited bank is refused)."""
    if not BANK: return ""
    want = {}
    for line in open(os.path.join(BANK, "BANK.sha256"), encoding="utf-8"):
        if line.strip(): h, f = line.split(); want[f] = h
    for f in ("cadence.json", "map.json"):
        got = hashlib.sha256(open(os.path.join(BANK, f), "rb").read()).hexdigest()
        if want.get(f) != got: sys.exit(f"REFUSED: bank/{f} does not match bank/BANK.sha256 — re-make the bank with Windmill tools/cadence_bank.py")
    bank = json.load(open(os.path.join(BANK, "cadence.json"), encoding="utf-8")); mp = json.load(open(os.path.join(BANK, "map.json"), encoding="utf-8"))
    les = {}
    for lid, L in bank["lessons"].items():
        codes = L["codes"]
        items = []
        for it in L["items"]:
            o = {k: it[k] for k in ("id", "lesson", "rigor", "rt", "stem", "solution", "gen") if k in it}
            o["sk"] = codes.index(it["codes"][0]) if it["codes"][0] in codes else 0
            for k in ("fig", "figText", "inst", "cols", "rows"):
                if k in it: o[k] = it[k]
            if "choices" in it: o["choices"] = [{"t": c["t"]} for c in it["choices"]]
            A = dict(it["answer"])
            if "parts" in A:
                A["parts"] = [{k: v for k, v in p.items() if not (k == "label" and "labelS" in p)} for p in A["parts"]]
            A.pop("also", None)
            o["answer"] = A
            items.append(o)
        les[lid] = {"title": L["title"], "skills": [L["labels"].get(c, "") for c in codes], "items": items}
    m = {"order": mp["order"], "lessons": {c: {k: r[k] for k in ("status", "cadence", "title") if k in r} for c, r in mp["lessons"].items()}}
    dump = lambda x: json.dumps(x, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
    return f"<script>window.CADENCE_BANK={dump({'unit': bank['unit'], 'lessons': les})};window.CADENCE_MAP={dump(m)};</script>\n"
# the page's own fonts (7 Nov 2026, the site review: the page joins mrshaffer.org's family — Croix: "Ok sounds well thought
# out. Proceed."): Lexend for the sheet (ruling 46), DM Serif Display for the title, DM Sans for the bar and the eyebrow.
# Inlined as data URIs, never a <link>: the page is a claude.ai artifact and a Google Sites download too, and loads nothing.
FONTS = [("Lexend", "400", "lexend-regular.woff2", "100 549"), ("Lexend", "700", "lexend-bold.woff2", "550 900"),
         ("DM Sans", "400 700", "dm-sans.woff2", "400 700"), ("DM Serif Display", "400", "dm-serif-display.woff2", "400")]
def fonts_css():
    """@font-face rules for the four faces in vendor/fonts (SIL OFL 1.1, the licences beside them). Lexend has two real
    weights; 500 draws as Regular and 600 as Bold (the ranges below), so nothing is ever a faux bold."""
    import base64
    out = ["/* Lexend, DM Sans, DM Serif Display: SIL Open Font License 1.1 (practice/kit/vendor/fonts/OFL-*.txt) */"]
    for fam, _w, f, rng in FONTS:
        b64 = base64.b64encode(open(os.path.join(KIT, "vendor", "fonts", f), "rb").read()).decode()
        out.append('@font-face{font-family:"' + fam + '";font-style:normal;font-weight:' + rng + ';font-display:swap;src:url(data:font/woff2;base64,' + b64 + ') format("woff2")}')
    return "\n".join(out)
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
    for _fam, _w, f, _r in FONTS: h.update(open(os.path.join(KIT, "vendor", "fonts", f), "rb").read())
    for f in bank_files(): h.update(open(f, "rb").read())
    return h.hexdigest()[:16]
if "--force" not in sys.argv:
    ok = os.path.exists(os.path.join(UD, "CHECKED")) and open(os.path.join(UD, "CHECKED")).read().split()[0] == source_hash()
    if not ok: sys.exit("build: the checks have not passed for these sources — run the unit's checks first (or --force for a look only)")

esc = lambda s: s.replace("&", "&amp;").replace("<", "&lt;")
# the Appearance choice (7 Nov 2026, Croix: "I want it to be based on the system, also give me an option"): ui.js keeps it under
# practice.theme; this runs before any style or content, first in <head> (on the first line, with the title), so a Light or
# Dark choice is on <html> before the first paint and nothing flashes. Storage refused: nothing is set and the page follows the device.
THEME_JS = "try{var t=localStorage.getItem('practice.theme');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t)}catch(e){}"
body = f"""<title>{esc(cfg['title'])}</title><script>{THEME_JS}</script>
<style id="kit-fonts">{fonts_css()}</style>
<style>{rk('kit.css')}{''.join(ru(c) for c in cfg.get('css', []))}</style>
<div class="watch" role="region" aria-label="Stopwatch and score"><div class="in">
  <a class="back" id="back" href="#" hidden><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg><span id="backl">Unit</span></a>
  <div class="time" id="time" aria-label="Time on the clock">0:00</div>
  <div class="score" id="score"></div>
  <div class="btns"><button type="button" id="bPause" hidden>Pause</button><button type="button" class="go" id="bResume" hidden>Resume</button><button type="button" id="bFinish">Finish</button></div>
  <div class="confirm" id="confirm" role="alertdialog" aria-live="assertive" hidden></div>
</div><div class="qbar"><span class="qof" id="qof"></span><span class="bar" aria-hidden="true"><i id="prog"></i></span></div></div>
<div class="result" id="result" hidden></div>
<main class="sheet">
  <div class="head"><div><div class="eyebrow" id="eyebrow"></div><h1 id="h1"></h1><div class="total"><span id="total"></span></div></div></div>
  <p class="intro" id="intro"></p>
  <div class="ctl"><div class="mode" role="group" aria-label="How to practice"><button type="button" data-mode="practice" aria-pressed="true">Check as I go</button><button type="button" data-mode="test" aria-pressed="false">Like the real test</button></div>
  <div class="tools"><div class="mwrap"><button type="button" id="bMore" aria-haspopup="dialog" aria-expanded="false" aria-controls="mMenu" aria-label="More: what to practice, print, set number" title="More"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.9"/><circle cx="12" cy="12" r="1.9"/><circle cx="19" cy="12" r="1.9"/></svg></button>
  <div class="menu" id="mMenu" role="dialog" aria-label="More" hidden>
    <label class="mlab" for="scope">What to practice</label><select id="scope"></select>
    <div class="mprint"></div>
    <details class="setbox"><summary>Set <b id="setno"></b> · <span class="chg">Change</span></summary>
    <div class="setrow"><label for="setin">Set number</label><input type="text" inputmode="numeric" id="setin" autocomplete="off"><button type="button" id="setgo">Go</button><button type="button" class="go" id="bNew">New set</button><button type="button" id="bAgain">Start this set over</button></div></details>
  </div></div></div></div>
  <p class="notice" id="notice" role="status" hidden></p>
  <div id="paper"></div>
</main>
<script>{rk('core.js')}</script>
<script>{rk('bilingual.js')}</script>
""" + (f"<script>{rk('lang/' + cfg['second'] + '.js')}</script>\n" if cfg.get("second") else "") + "".join(f"<script>{ru(s)}</script>\n" for s in cfg["scripts"]) + (bank_script() + f"<script>{rk('bank.js')}</script>\n" if BANK else "") + f"<script>{rk('ui.js')}</script>\n<style id=\"katex-css\">{katex_css()}</style>\n<script>{rk('vendor/katex/katex.min.js')}</script>\n<script>{rk('tex.js')}</script>\n"
# the test's own numbers never ship (24 Oct 2026): a unit keeps them in test_forms.js, loaded by its checks alone. A page that
# holds that file's name, or any line of its data, is refused — on the student page and the teacher copy alike.
tf = os.path.join(UD, "test_forms.js")
if not os.path.exists(tf) and os.path.basename(UD) == "teacher": tf = os.path.join(os.path.dirname(UD), "test_forms.js")
if os.path.exists(tf):
    if re.search(r"TEST_FORMS\s*=\s*\{", body): sys.exit("REFUSED: the page defines TEST_FORMS — the test's numbers must not ship")
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
