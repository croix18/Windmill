"""Practice-test kit: build one unit's test (15 Nov 2026; practice/exam/DESIGN.md).
    NODE_PATH=$(npm root -g) python3 <kit>/exam/build_exam.py <unit folder> [--no-check] [--shots DIR] [--form URL|none]

Refuses unless kit/check/pack.js passes for the unit (every part judges the same after it is sent as text). Then writes, beside
the unit's page (never touching the practice page, the teacher copy or their outputs):
  <Course> Unit N Test.html   the test page: one self-contained file like the practice page — the kit's CSS and the unit's own,
              the fonts, KaTeX, tex.js, core.js, nline.js, cgraph.js, judge.js (ui.js makes its judge at load; exam_unit.js takes
              the judging out of it), pager.js, ui.js, calc.js, scratch.js, exam_unit.js, exam.js, and the keypad's key list.
              NONE of the unit's scripts. pager.js, scratch.js, ui.js and calc.js are held inert (<script type="text/x-kit-held">)
              until exam.js has the test from the site; then it makes the stub unit and runs them, in their order.
  test_bundle/   the site's bundle, for a bundler that follows static require()s: the unit's scripts and the kit files they
              require, in the same relative layout (<unit>/…, kit/…), with kit/judge.js, kit/pack.js, kit/exam/server.js;
              index.js → {course, unit, cv, kit, U, server}; sample.json, one drawn test's priv (with its keys as answers) for
              the site to judge once at start-up.
Then runs kit/check/exam_page.js on the unit (--no-check skips it, for a look only). The page itself is made by kit/build.py
(--body-to), so the test page and the practice page are one page: the same markup, the same kit, in the same order."""
import json, os, re, shutil, subprocess, sys, hashlib
KIT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if len(sys.argv) < 2: sys.exit(__doc__)
UD = os.path.abspath(sys.argv[1])
cfg = json.load(open(os.path.join(UD, "unit.json"), encoding="utf-8"))
if any(s.endswith("teacher.js") for s in cfg["scripts"]): sys.exit("build_exam: a test is built from the student unit, not its teacher copy")
rk = lambda f: open(os.path.join(KIT, f), encoding="utf-8").read()
ru = lambda f: open(os.path.join(UD, f), encoding="utf-8").read()

# 1. the gate: a unit whose parts do not survive pack.js has no test
r = subprocess.run(["node", os.path.join(KIT, "check", "pack.js"), UD], capture_output=True, text=True)
print(r.stdout.strip())
if r.returncode: sys.exit("REFUSED: check/pack.js fails for this unit — no test page and no bundle until every part survives pack()")

# 2. what the unit is, under Node (as the site will load it)
info = json.loads(subprocess.run(["node", "-e", "const U=require(process.argv[1]);process.stdout.write(JSON.stringify({id:U.id,cv:U.contentVersion,title:U.title,h1:U.h1,eyebrow:U.eyebrow}))", os.path.join(UD, "unit.js")], capture_output=True, text=True, check=True).stdout)
m = re.match(r"^([a-z]+\d+)u(\d+)$", info["id"] or "")
if not m: sys.exit("build_exam: the unit's id is not <course>u<N>: " + str(info["id"]))
COURSE, UNIT = m.group(1), int(m.group(2))
KITV = hashlib.sha256(open(os.path.join(KIT, "KIT.sha256"), "rb").read()).hexdigest()[:12] if os.path.exists(os.path.join(KIT, "KIT.sha256")) else ""
TITLE = re.sub(r"\s*Practice Test\s*$", " Test", cfg["title"]) if re.search(r"Practice Test\s*$", cfg["title"]) else cfg["title"] + " Test"
FILE = re.sub(r"\s*Practice Test(\.html)$", r" Test\1", cfg["download"]) if "Practice Test" in cfg["download"] else TITLE + ".html"

# 3. the test page: the practice page's body, as build.py makes it, with the unit taken out
tmp = os.path.join(UD, ".exam_body.html")
subprocess.run([sys.executable, os.path.join(KIT, "build.py"), UD, "--force", "--body-to", tmp], check=True)
body = open(tmp, encoding="utf-8").read(); os.remove(tmp)
def cut(text, what):
    if what not in body_ref[0]: sys.exit("build_exam: the page does not hold " + text + " as build.py writes it")
    body_ref[0] = body_ref[0].replace(what, "", 1)
body_ref = [body]
for s in cfg["scripts"]: cut(s, "<script>" + ru(s) + "</script>\n")
if cfg.get("second"): cut("lang/" + cfg["second"], "<script>" + rk("lang/" + cfg["second"] + ".js") + "</script>\n")
for f in ("bilingual.js", "explain.js", "approvals.js", "exam_link.js"): cut(f, "<script>" + rk(f) + "</script>\n")
body = body_ref[0]
# the lesson bank goes; its key list (what the keypad may show) stays
bank = re.search(r"<script>window\.CADENCE_BANK=.*?;window\.CADENCE_MAP=.*?;window\.KIT_KEYSET=(.*?);</script>\n", body, re.S)
if bank:
    body = body.replace(bank.group(0), "<script>window.KIT_KEYSET=" + bank.group(1) + ";</script>\n")
    body = body.replace("<script>" + rk("bank.js") + "</script>\n", "", 1)
# the page's own scripts wait for the test
for f in ("pager.js", "scratch.js", "ui.js", "calc.js"):
    w = "<script>" + rk(f) + "</script>"
    if w not in body: sys.exit("build_exam: the page does not hold " + f)
    body = body.replace(w, '<script type="text/x-kit-held" data-kit="' + f + '">' + rk(f) + "</script>", 1)
dump = lambda x: json.dumps(x, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
excfg = {"course": COURSE, "unit": UNIT, "title": TITLE, "h1": info["h1"], "eyebrow": re.sub(r"(\s|&nbsp;)*·(\s|&nbsp;)*Practice(\s+Test)?\s*$", "", info["eyebrow"] or ""), "api": "/api/test", "kit": KITV}
body = body.replace("</style>\n<div class=\"watch\"", rk("exam.css") + "</style>\n<div class=\"watch\"", 1) if "</style>\n<div class=\"watch\"" in body else sys.exit("build_exam: no place for exam.css")
body += "<script>window.KIT_EXAM_CFG=" + dump(excfg) + ";</script>\n<script>" + rk("exam_unit.js") + "</script>\n<script>" + rk("exam.js") + "</script>\n"
first, rest = body.split("\n", 1)
first = re.sub(r"<title>.*?</title>", "<title>" + TITLE.replace("&", "&amp;").replace("<", "&lt;") + "</title>", first, count=1)
# nothing of the unit: a long distinctive line of each of its scripts (one the kit's own files do not have) must not be on the page
KITTEXT = "".join(rk(f) for f in ("core.js", "nline.js", "cgraph.js", "judge.js", "pager.js", "scratch.js", "ui.js", "calc.js", "tex.js", "exam_unit.js", "exam.js"))
for s in cfg["scripts"]:
    for line in ru(s).splitlines():
        t = line.strip()
        if len(t) >= 40 and not t.startswith(("/*", "*", "//")) and t not in KITTEXT and t in rest: sys.exit("REFUSED: the test page holds a line of " + s + ": " + t[:60])
full = ('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
        + first + '</head><body>' + rest + "</body></html>")
open(os.path.join(UD, FILE), "w", encoding="utf-8").write(full)
print(FILE, len(full), "bytes written")

# 4. the site's bundle: the unit's scripts and what they require, in the same layout
B = os.path.join(UD, "test_bundle"); shutil.rmtree(B, ignore_errors=True)
UNAME, ROOT = os.path.basename(UD), os.path.dirname(UD)
REQ = re.compile(r"require\(\s*['\"](\.{1,2}/[^'\"]+)['\"]\s*\)")
seen, todo = set(), [os.path.join(UD, "unit.js"), os.path.join(KIT, "judge.js"), os.path.join(KIT, "pack.js"), os.path.join(KIT, "exam", "server.js")]
def rel(p):
    p = os.path.abspath(p)
    if p.startswith(KIT + os.sep): return os.path.join("kit", os.path.relpath(p, KIT))
    if p.startswith(UD + os.sep): return os.path.join(UNAME, os.path.relpath(p, UD))
    sys.exit("build_exam: " + p + " is outside the unit and the kit")
while todo:
    f = os.path.abspath(todo.pop())
    if f in seen: continue
    seen.add(f)
    for r_ in REQ.findall(open(f, encoding="utf-8").read()):
        t = os.path.normpath(os.path.join(os.path.dirname(f), r_)); t = t if t.endswith(".js") or t.endswith(".json") else t + ".js"
        if not os.path.exists(t): sys.exit("build_exam: " + os.path.relpath(f, ROOT) + " requires " + r_ + ", which is not there")
        todo.append(t)
for f in sorted(seen):
    d = os.path.join(B, rel(f)); os.makedirs(os.path.dirname(d), exist_ok=True); shutil.copyfile(f, d)
open(os.path.join(B, "index.js"), "w", encoding="utf-8").write(
    "/* " + TITLE + ": the site's bundle (practice/kit/exam/build_exam.py; do not edit — build it again). */\n'use strict';\n"
    "module.exports = { course: " + json.dumps(COURSE) + ", unit: " + str(UNIT) + ", cv: " + json.dumps(info["cv"]) + ", kit: " + json.dumps(KITV) + ",\n"
    "  U: require('./" + UNAME + "/unit.js'), server: require('./kit/exam/server.js'), pack: require('./kit/pack.js') };\n")
# one drawn test, as the page draws its ITEMS (ui.js render: the whole test), packed, with its keys as the answers
SAMPLE = r"""
const path = require('path'), B = process.argv[1], U = require(path.join(B, process.argv[2], 'unit.js')), P = require(path.join(B, 'kit', 'pack.js'));
const NL = require(path.join(B, 'kit', 'nline.js')), CG = require(path.join(B, 'kit', 'cgraph.js')), LET = 'ABCDEFGH';
const seed = require('crypto').randomBytes(16).toString('hex'), g = U.generate(seed), out = [], ans = {}; let qn = 0;
const tt = p => p.kind === 'mc' ? 'mc' : p.kind === 'nline' ? 'nline' : p.kind === 'cgraph' ? 'cgraph' : 'text';
const kt = it => it.type === 'nline' ? NL.keyText(NL.graphOf(it.x)) : it.type === 'cgraph' ? CG.keyText(CG.graphOf(it.x)) : it.type === 'mc' ? LET[it.x.correct] : it.type === 'multi' ? it.x.correct.map(k => LET[k]).join(',') : U.keyText(it.x);
const ka = it => it.type === 'nline' ? NL.graphOf(it.x) : it.type === 'cgraph' ? CG.graphOf(it.x) : it.type === 'mc' ? it.x.correct : it.type === 'multi' ? it.x.correct.slice() : U.keyText(it.x);
g.sections.forEach((sec, si) => sec.items.forEach((it, ii) => { qn++;
  if (it.type === 'parts') it.parts.forEach((p, pi) => out.push({ id: qn + p.label, type: tt(p), x: p, sib: pi > 0 ? qn + it.parts[0].label : null, sibPart: pi > 0 ? it.parts[0] : null, aShown: true, pos: si + '.' + ii + '.' + pi, lab: qn + p.label }));
  else if (it.type === 'solo') out.push({ id: String(qn), type: tt(it.part), x: it.part, sib: null, sibPart: null, aShown: true, pos: si + '.' + ii + '.-1', lab: String(qn) });
  else out.push({ id: String(qn), type: it.type === 'multi' ? 'multi' : 'mc', x: it, sib: null, sibPart: null, aShown: true, pos: si + '.' + ii + '.-1', lab: String(qn) }); }));
out.forEach(it => { ans[it.id] = ka(it); it.keyText = kt(it); });
process.stdout.write(JSON.stringify({ seed, priv: out.map(it => P.pack(it)), answers: ans }));
"""
r = subprocess.run(["node", "-e", SAMPLE, B, UNAME], capture_output=True, text=True)
if r.returncode: sys.exit("build_exam: the sample test could not be drawn: " + r.stderr[-400:])
open(os.path.join(B, "sample.json"), "w", encoding="utf-8").write(r.stdout)
# the bundle loads on its own, and judges its sample every part right
r = subprocess.run(["node", "-e", "const b=require(process.argv[1]),s=require(process.argv[1]+'/sample.json'),it=s.priv.map(t=>b.pack.unpack(t));let v=[];for(let i=0;i<it.length;i+=2)v=v.concat(b.server.grade(b.U,it,s.answers,v,i,2));const m=b.server.summary(it,v);if(m.points!==m.of){console.error(m);process.exit(1)}console.log('bundle: '+Object.keys(require.cache).length+' modules, the sample '+m.points+' / '+m.of)", B], capture_output=True, text=True)
print(r.stdout.strip() or r.stderr.strip()[-400:])
if r.returncode: sys.exit("REFUSED: the bundle does not judge its own sample right")
print("test_bundle/:", len(seen), "files")

# 5. the checks
if "--no-check" not in sys.argv:
    extra = sys.argv[sys.argv.index("--shots"):sys.argv.index("--shots") + 2] if "--shots" in sys.argv else []   # screenshots, for a look
    if "--form" in sys.argv: extra += sys.argv[sys.argv.index("--form"):sys.argv.index("--form") + 2]
    r = subprocess.run(["node", os.path.join(KIT, "check", "exam_page.js"), UD] + extra, env=dict(os.environ))
    if r.returncode: sys.exit("FAILED: check/exam_page.js")
    print("TEST BUILT AND CHECKED — " + FILE)
