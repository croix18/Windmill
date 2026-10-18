"""Practice-test kit: run every check for a unit, then build it.   python3 <kit>/check/run.py <unit folder>

1. the unit's own checks (unit.json "checks": exact answers, keys typed back, mistake models, the clean rule, solution and
   walkthrough chains, claims in sentences, pictures and figures, test-form avoidance, planted errors, the sympy oracle);
2. the stability lock (check/lock.js): set numbers keep their questions unless contentVersion is bumped;
3. a look-only build, then the page in a real browser (check/page.js);
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
for c in cfg.get("checks", []): run(c, UD)
run("node " + os.path.join(KIT, "check", "lock.js") + " .", UD)
run("python3 " + os.path.join(KIT, "build.py") + " . --force", UD)
run("node " + os.path.join(KIT, "check", "page.js") + " .", UD)
# the same hash build.py checks
import hashlib
h = hashlib.sha256()
for f in ["core.js", "bilingual.js", "ui.js", "tex.js", "kit.css", "vendor/katex/katex.min.js", "vendor/katex/katex.min.css"] + (["lang/" + cfg["second"] + ".js"] if cfg.get("second") else []): h.update(open(os.path.join(KIT, f), encoding="utf-8").read().encode())   # the same list as build.py
for f in cfg["scripts"] + cfg.get("css", []): h.update(open(os.path.join(UD, f), encoding="utf-8").read().encode())
open(os.path.join(UD, "CHECKED"), "w").write(h.hexdigest()[:16] + "\n")
run("python3 " + os.path.join(KIT, "build.py") + " .", UD)
print("\nALL CHECKS PASSED — " + cfg["file"] + " built")
