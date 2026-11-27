"""Text that was given room for more lines than it takes on the built slide (a blank line under it).
    python3 WINDMILL/briefs/lean/look/phantom.py "out/u10/A7 10.10 ... - Slides.pptx"
The kit measures a line a little long on purpose; a line that just fits is then given a second line's room, and the
slide shows a gap under it. For every text box: the lines its height was cut for, against the lines it takes in the PDF."""
import sys, glob, os, re, subprocess, html
from pptx import Presentation


def pdf_lines(pdf):
    """page -> list of (ymin, ymax, text) for every rendered line."""
    out = subprocess.run(["pdftotext", "-bbox-layout", pdf, "-"], capture_output=True, text=True).stdout
    pages = []
    for pg in re.split(r"<page ", out)[1:]:
        lines = []
        for ln in re.finditer(r"<line xMin=\"([\d.]+)\" yMin=\"([\d.]+)\" xMax=\"([\d.]+)\" yMax=\"([\d.]+)\">(.*?)</line>", pg, re.S):
            words = [html.unescape(w) for w in re.findall(r"<word [^>]*>(.*?)</word>", ln.group(5), re.S)]
            lines.append((float(ln.group(2)), float(ln.group(4)), float(ln.group(1)), " ".join(words)))
        pages.append(lines)
    return pages


def norm(s):
    return re.sub(r"[^A-Za-z0-9]", "", s)


for pptx in sorted(glob.glob(sys.argv[1])):
    pdf = pptx[:-5] + ".pdf"
    pages = pdf_lines(pdf)
    prs = Presentation(pptx)
    print("==", os.path.basename(pptx))
    for n, sl in enumerate(prs.slides, 1):
        lines = pages[n - 1] if n - 1 < len(pages) else []
        for sh in sl.shapes:
            if not sh.has_text_frame:
                continue
            tf = sh.text_frame
            paras = [p for p in tf.paragraphs if p.text.strip()]
            if len(paras) != 1:
                continue
            text = paras[0].text.strip()
            runs = [r for r in paras[0].runs if r.font.size]
            if not runs or len(text) < 40:
                continue
            size = runs[0].font.size.pt
            h = sh.height / 914400
            cut_for = round(h / (0.45 * size / 23))
            if cut_for < 2:
                continue
            top, bot = sh.top / 914400 * 72, (sh.top + sh.height) / 914400 * 72
            key = norm(text)
            took = [l for l in lines if top - 6 <= l[0] <= bot + 2 and norm(l[3]) and norm(l[3]) in key]
            # merge pieces on one baseline
            rows = sorted({round(l[0] / 4) for l in took})
            if rows and len(rows) < cut_for:
                print(f"  s{n:02d}  room for {cut_for} lines, takes {len(rows)}:  {text[:88]}")
