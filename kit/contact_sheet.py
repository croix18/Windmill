#!/usr/bin/env python3
"""Render a PDF's pages into one PNG grid so a worker can LOOK at every slide and page.
    python3 contact_sheet.py "out/u3/A7 3.04  Slides.pdf" [dpi] [cols]      → /tmp/sheets/<name>.png
    python3 contact_sheet.py "out/u3/A7 3.04  Slides.pdf" 80 1 --pages 5-7   → those pages, large
Viewing is a required step (BUILDING A UNIT.md §6): the checks catch overflow and glyphs, not ugliness.
"""
import os, sys, glob, subprocess, tempfile, shutil
from PIL import Image

args = [a for a in sys.argv[1:] if not a.startswith("--")]
pdf = args[0]
dpi = int(args[1]) if len(args) > 1 else 40
cols = int(args[2]) if len(args) > 2 else 6
pages = None
if "--pages" in sys.argv:
    pages = sys.argv[sys.argv.index("--pages") + 1]
    if pages in args:
        args.remove(pages)
tmp = tempfile.mkdtemp()
cmd = ["pdftoppm", "-r", str(dpi), "-png"]
if pages:
    a, _, b = pages.partition("-")
    cmd += ["-f", a, "-l", b or a]
subprocess.run(cmd + [pdf, os.path.join(tmp, "p")], check=True)
files = sorted(glob.glob(os.path.join(tmp, "p-*.png")))
ims = [Image.open(f) for f in files]
w = max(i.size[0] for i in ims); h = max(i.size[1] for i in ims)
rows = (len(ims) + cols - 1) // cols
sheet = Image.new("RGB", (w * cols, h * rows), "white")
for i, im in enumerate(ims):
    sheet.paste(im, ((i % cols) * w, (i // cols) * h))
os.makedirs("/tmp/sheets", exist_ok=True)
out = os.path.join("/tmp/sheets", os.path.basename(pdf).rsplit(".", 1)[0].replace("  ", " ") + (f" p{pages}" if pages else "") + ".png")
sheet.save(out)
shutil.rmtree(tmp)
print(f"{len(ims)} pages → {out}  ({sheet.size[0]}×{sheet.size[1]})")
