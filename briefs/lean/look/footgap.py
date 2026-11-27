"""The gap between the lowest ink above the footer rule and the rule, per slide:  footgap.py DECK.pdf [pages]"""
import sys, subprocess, tempfile, os, glob
import numpy as np
from PIL import Image
pdf = sys.argv[1]; pages = [int(p) for p in sys.argv[2:]]
if not pages:
    n = int([l for l in subprocess.run(["pdfinfo", pdf], capture_output=True, text=True).stdout.splitlines() if l.startswith("Pages:")][0].split()[1])
    pages = list(range(1, n + 1))
d = tempfile.mkdtemp()
DPI = 100
for p in pages:
    subprocess.run(["pdftoppm", "-r", str(DPI), "-f", str(p), "-l", str(p), "-png", pdf, f"{d}/s"], check=True)
    f = sorted(glob.glob(f"{d}/s*.png"))[-1]
    a = np.asarray(Image.open(f).convert("L")).astype(int); os.remove(f)
    H, W = a.shape
    # the footer rule: the lowest long horizontal run of mid-grey/dark pixels in the bottom fifth
    rule = None
    for y in range(H - 1, int(H * 0.8), -1):
        if (a[y, int(W * 0.05):int(W * 0.95)] < 200).mean() > 0.9:
            rule = y; break
    if rule is None:
        print(p, "no rule found"); continue
    # the band of the rule itself (it may be a few px thick)
    top = rule
    while (a[top - 1, int(W * 0.05):int(W * 0.95)] < 200).mean() > 0.9:
        top -= 1
    ink = None
    for y in range(top - 2, int(H * 0.3), -1):
        if (a[y, int(W * 0.03):int(W * 0.97)] < 140).sum() > 2:
            ink = y; break
    g = (top - ink) / DPI
    if len(sys.argv) > 2 or g < 0.15:
        print(f"p{p}: lowest ink {g:.2f} in above the footer rule" + ("   !!" if g < 0.15 else ""))
