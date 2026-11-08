"""Practice-test kit: run every check for a unit, then build it.   python3 <kit>/check/run.py <unit folder>

0. the kit's own arithmetic hints never state their answer (check/hints.js); the answer normaliser's cases (check/norm.js);
1. the unit's own checks (unit.json "checks": exact answers, keys typed back, mistake models, the clean rule, solution and
   walkthrough chains, claims in sentences, pictures and figures, test-form avoidance, planted errors, the sympy oracle);
2. the stability lock (check/lock.js): set numbers keep their questions unless contentVersion is bumped; and the variety
   floor (check/variety.js, ruling 49): every question part comes in enough versions for a random set to be a test;
3. a look-only build, then the page in a real browser (check/page.js), and a unit's lesson bank from Cadence (check/bank.js);
4. CHECKED is written with the hash of the sources, and the real build runs (build.py refuses without it)."""
import json, os, subprocess, sys
KIT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UD = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else ".")
cfg = json.load(open(os.path.join(UD, "unit.json"), encoding="utf-8"))
env = dict(os.environ)
if "NODE_PATH" not in env:
    env["NODE_PATH"] = subprocess.run(["npm", "root", "-g"], capture_output=True, text=True).stdout.strip()
def run(cmd, cwd):
    print("\n$ " + cmd, flush=True)
    r = subprocess.run(cmd, shell=True, cwd=cwd, env=env)
    if r.returncode: sys.exit("CHECK FAILED: " + cmd)
run("node " + os.path.join(KIT, "check", "hints.js"), UD)
run("node " + os.path.join(KIT, "check", "norm.js"), UD)          # the answer normaliser, case by case (7 Nov 2026)
for c in cfg.get("checks", []): run(c, UD)
run("node " + os.path.join(KIT, "check", "lock.js") + " .", UD)
if not any(x.endswith("teacher.js") for x in cfg["scripts"]):    # a teacher copy is its unit's questions: counted there
    run("node " + os.path.join(KIT, "check", "variety.js") + " .", UD)
run("python3 " + os.path.join(KIT, "build.py") + " . --force", UD)
run("node " + os.path.join(KIT, "check", "page.js") + " .", UD)
# a lesson bank from Cadence (7 Nov 2026): its schema, its map against the plan, every item drawn, 30 answered through the page
if any(os.path.exists(os.path.join(d, "cadence.json")) for d in (os.path.join(UD, "bank"), os.path.join(os.path.dirname(UD), "bank"))) and not any(x.endswith("teacher.js") for x in cfg["scripts"]):
    run("node " + os.path.join(KIT, "check", "bank.js") + " .", UD)
# the same hash build.py checks
import hashlib
h = hashlib.sha256()
for f in ["core.js", "nline.js", "bilingual.js", "ui.js", "tex.js", "kit.css", "vendor/katex/katex.min.js", "vendor/katex/katex.min.css", "bank.js"] + (["lang/" + cfg["second"] + ".js"] if cfg.get("second") else []): h.update(open(os.path.join(KIT, f), encoding="utf-8").read().encode())   # the same list as build.py
for f in cfg["scripts"] + cfg.get("css", []): h.update(open(os.path.join(UD, f), encoding="utf-8").read().encode())
for f in ["lexend-regular.woff2", "lexend-bold.woff2", "dm-sans.woff2", "dm-serif-display.woff2"]: h.update(open(os.path.join(KIT, "vendor", "fonts", f), "rb").read())   # the page's fonts (7 Nov 2026), as build.py's FONTS
BANKD = next((d for d in (os.path.join(UD, "bank"), os.path.join(os.path.dirname(UD), "bank")) if all(os.path.exists(os.path.join(d, f)) for f in ("cadence.json", "map.json", "BANK.sha256"))), None)
for f in (["cadence.json", "map.json"] if BANKD else []): h.update(open(os.path.join(BANKD, f), "rb").read())   # the lesson bank (7 Nov 2026), as build.py's bank_files
open(os.path.join(UD, "CHECKED"), "w").write(h.hexdigest()[:16] + "\n")
run("python3 " + os.path.join(KIT, "build.py") + " .", UD)
print("\nALL CHECKS PASSED — " + cfg["file"] + " built")
