"""Mosaic of chosen slides at reading size.  python3 mosaic.py OUT.png COLS  "deck.pdf:4,5,6" "deck2.pdf:3" ..."""
import sys, os, subprocess, tempfile, glob
from PIL import Image
out, cols = sys.argv[1], int(sys.argv[2])
ims = []
for arg in sys.argv[3:]:
    pdf, _, pages = arg.rpartition(":")
    for p in pages.split(","):
        tmp = tempfile.mkdtemp()
        subprocess.run(["pdftoppm", "-r", "60", "-png", "-f", p, "-l", p, pdf, os.path.join(tmp, "p")], check=True)
        ims.append(Image.open(glob.glob(os.path.join(tmp, "p*.png"))[0]).convert("RGB"))
w, h = ims[0].size
rows = (len(ims) + cols - 1) // cols
s = Image.new("RGB", (w * cols + 4 * (cols - 1), h * rows + 4 * (rows - 1)), "#888")
for i, im in enumerate(ims):
    s.paste(im, ((i % cols) * (w + 4), (i // cols) * (h + 4)))
s.save(out); print(out, s.size)
