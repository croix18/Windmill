"""What a student sees of each picture on each slide of a deck, measured on the BUILT slide.
    python3 WINDMILL/briefs/lean/look/slidefigs.py "out/u10/A7 10.06 ... - Slides.pptx" [slide numbers...]
For every figure-sized picture: where it is, its size, the size of its lettering (pt, from the height of its digits)
and the size of each coordinate plane inside it (grid edge to grid edge, in inches). Lines marked !! fall short of the
unit's sizes (RULINGS.md, "Holds for every section"). It measures pictures only: text on the footer rule it does not see — look."""
import sys, os, io, glob, subprocess, tempfile
import numpy as np
from pptx import Presentation
from PIL import Image
from scipy import ndimage
DPI = 200
FOOT = 6.78


def runs(mask, gap):
    idx = np.nonzero(mask)[0]
    if not len(idx):
        return []
    out, a, p = [], idx[0], idx[0]
    for i in idx[1:]:
        if i - p > gap:
            out.append((a, p)); a = i
        p = i
    out.append((a, p))
    return out


def measure(pptx, only=()):
    pdf = pptx[:-5] + ".pdf"
    prs = Presentation(pptx)
    tmp = tempfile.mkdtemp()
    rows = []
    for n, sl in enumerate(prs.slides, 1):
        if only and n not in only:
            continue
        pics = [sh for sh in sl.shapes if sh.shape_type == 13 and (sh.height / 914400 >= 0.75 or sh.width / 914400 >= 4)]
        if not pics:
            continue
        texts = sorted((sh.top, sh.left, sh.text_frame.text.strip().replace("\n", " / ")[:34]) for sh in sl.shapes if sh.has_text_frame and sh.text_frame.text.strip())
        title = " | ".join(t[2] for t in texts[:2])
        if any("Answer:" in t[2] for t in texts):
            title = "(reveal) " + title
        subprocess.run(["pdftoppm", "-r", str(DPI), "-png", "-f", str(n), "-l", str(n), pdf, os.path.join(tmp, f"s{n}")], check=True)
        rgb = np.asarray(Image.open(glob.glob(os.path.join(tmp, f"s{n}*.png"))[0]).convert("RGB")).astype(int)
        gray = rgb.mean(axis=2)
        pale = (abs(rgb[..., 0] - rgb[..., 1]) < 8) & (abs(rgb[..., 1] - rgb[..., 2]) < 8) & (gray > 175) & (gray < 236)
        pale &= ~ndimage.binary_dilation(gray < 110, iterations=3)          # not the soft edge of a black rule or a digit
        grid = ndimage.binary_opening(pale, structure=np.ones((1, 40))) | ndimage.binary_opening(pale, structure=np.ones((40, 1)))
        for sh in pics:
            x0, y0 = sh.left / 914400, sh.top / 914400
            w, h = sh.width / 914400, sh.height / 914400
            a, b, c, d = int(y0 * DPI), int((y0 + h) * DPI), int(x0 * DPI), int((x0 + w) * DPI)
            box = gray[a:b, c:d]
            # lettering: dark glyph-sized components that are not dots
            lab, k = ndimage.label(box < 120)
            hs = []
            for o in ndimage.find_objects(lab):
                gh, gw = o[0].stop - o[0].start, o[1].stop - o[1].start
                if not (14 <= gh <= 90 and 4 <= gw <= 70):
                    continue
                fill = (lab[o] > 0).mean()
                if abs(gh - gw) <= 3 and fill > 0.7:        # a plotted dot
                    continue
                hs.append(gh)
            # digits and capitals share one height; take the commonest tall height
            pt = None
            if hs:
                hs = np.array(hs)
                top = np.percentile(hs, 80)
                pt = top / DPI * 72 / 0.70
            # planes: inside a plane every column crosses a pale horizontal grid line, and between planes none does
            g = grid[a:b, c:d]
            planes = []
            for (ca, cb) in runs(g.any(axis=0), int(0.14 * DPI)):
                rr = runs(g[:, ca:cb + 1].any(axis=1), int(0.3 * DPI))
                if rr:
                    pw, ph = (cb - ca) / DPI, (rr[-1][1] - rr[0][0]) / DPI
                    if pw >= 0.5 and ph >= 0.5:
                        planes.append((pw, ph))
            rows.append((n, title, w, h, y0 + h, pt, planes))
    return rows


if __name__ == "__main__":
    only = tuple(int(a) for a in sys.argv[2:])
    for pptx in sorted(glob.glob(sys.argv[1])):
        print("==", os.path.basename(pptx))
        for n, title, w, h, bottom, pt, planes in measure(pptx, only):
            bad = []
            reveal = title.startswith("(reveal)")
            if pt is not None and pt < (14.5 if reveal else 16.0):
                bad.append(f"lettering {pt:.0f} pt (an 18-pt label reads as about 17.5 here)")
            notes = title.startswith("Notes") or reveal
            if len(planes) >= 4:
                for pw, ph in planes:
                    if pw < 1.4 or ph < 1.8:
                        bad.append(f"one of four planes is {pw:.1f} x {ph:.1f} in (floor 1.4 wide, 1.8 tall)"); break
            else:
                for pw, ph in planes:
                    floor = 2.0 if notes else 2.2
                    if max(pw, ph) < floor or min(pw, ph) < 1.3:
                        bad.append(f"plane {pw:.1f} x {ph:.1f} in (floor: longer side {floor}, shorter side 1.3)")
            if bottom > FOOT - 0.12:
                bad.append("the picture is at the footer")
            pl = "  planes " + ", ".join(f"{pw:.1f}x{ph:.1f}" for pw, ph in planes) if planes else ""
            print(f"  s{n:02d}  picture {w:4.1f} x {h:3.1f} in  lettering {pt:4.1f} pt{pl}   {'!! ' + '; '.join(bad) if bad else ''}   [{title}]")
