#!/usr/bin/env bash
# Everything that must be green before a push. Run from anywhere.
#   A7, M7 and Deckhand checkouts are expected beside this repo (../croix18-windy-hill-a7, ../windy-hill-m7,
#   ../Deckhand) or named in A7_DIR / M7_DIR / DECKHAND_DIR. Without them the spine is validated as committed
#   but not regenerated (CI does that).
set -euo pipefail
cd "$(dirname "$0")/.."
echo "== secrets"
if git ls-files -z | xargs -0 grep -l -E 'github_pat_[A-Za-z0-9_]{20,}|ghp_[A-Za-z0-9]{30,}' 2>/dev/null; then
  echo "a tracked file contains a GitHub token" >&2; exit 1; fi
git check-ignore -q .github-token || { echo ".github-token is not git-ignored" >&2; exit 1; }
echo "== names (the fixtures may carry synthetic first names in the roster part only)"
if git ls-files -z 'room/fixtures/*' 'tests/*' | xargs -0 grep -l -E '"(lastName|studentId|email|last)"\s*:\s*"[A-Za-z]' 2>/dev/null; then
  echo "a committed room carries a last name, student id or email" >&2; exit 1; fi
A7=${A7_DIR:-../croix18-windy-hill-a7}; M7=${M7_DIR:-../windy-hill-m7}; DH=${DECKHAND_DIR:-../Deckhand}
if [ -d "$A7" ] && [ -d "$M7" ] && [ -d "$DH" ]; then
  echo "== spine (regenerated from $A7, $M7, $DH)"
  python3 spine/spine.py --a7 "$A7" --m7 "$M7" --deckhand "$DH"
  if ! git diff --quiet -- spine/spine.json room/benchmarks.json; then
    echo "   spine.json changed — the sources moved; review the diff and commit it"; fi
else
  echo "== spine (sources not beside this repo: validating the committed file)"
fi
python3 spine/validate.py spine/spine.json
echo "== the plan's engine (Python against its rules, JavaScript against Python)"
python3 plan/test_flow.py
echo "== the phone's plan page (built from the spine, held to it)"
python3 plan/make_page.py
node plan/test_page.js
echo "== the Drive script (run end to end against stand-ins for Google and GitHub)"
if [ -d "$A7/.git" ] && [ -d "$M7/.git" ]; then node drive/test_windyhill.js "$A7" "$M7"; else node drive/test_windyhill.js; fi
echo "== room"
python3 tools/check_fixtures.py
node room/test.js
echo "== kit (the build kit both courses vendor)"
python3 tools/kit_manifest.py --check
if python3 -c "import sympy, docx, pptx, matplotlib, PIL" 2>/dev/null; then
  for prof in course_on course_acc; do
    KIT_COURSE=kit/tests/$prof.py python3 kit/tests/test_kit.py | tail -1
  done
else
  echo "   kit tests skipped: sympy, python-docx, python-pptx, matplotlib and Pillow are needed (CI installs them)"
fi
echo "all checks passed"
