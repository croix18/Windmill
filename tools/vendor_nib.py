#!/usr/bin/env python3
"""Put the Nib engine the kit carries into a tool's repository:

    python3 tools/vendor_nib.py /path/to/tool-repo [dest-folder]

copies nib/nib.js and nib/VERSION into <tool-repo>/<dest-folder> (default vendor/nib). The tool's build pastes the file
over its <script>/*ENGINE*/</script> marker. Nothing copied is edited by hand afterwards: update it here, vendor again.
"""
import os, shutil, sys
ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
if len(sys.argv) < 2 or not os.path.isdir(sys.argv[1]):
    sys.exit("usage: vendor_nib.py <tool repository> [dest folder]")
dest = os.path.join(os.path.abspath(sys.argv[1]), sys.argv[2] if len(sys.argv) > 2 else os.path.join("vendor", "nib"))
os.makedirs(dest, exist_ok=True)
for f in ("nib.js", "VERSION"):
    shutil.copyfile(os.path.join(ROOT, "nib", f), os.path.join(dest, f))
print("vendored", open(os.path.join(ROOT, "nib", "VERSION"), encoding="utf-8").readline().strip(), "into", dest)
