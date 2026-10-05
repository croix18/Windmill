#!/usr/bin/env python3
"""The check suite for a built unit directory. Every check prints its denominator (what it
looked at) and its findings; any finding fails the run (exit 1). §13c: a check that reports a
finding and exits 0 is worse than no check.

  docscan    student surfaces carry no benchmark code, calculator line, 'homework', partner work
  keycheck   student papers carry no ANSWER KEY mark and no red (answer-colour) run
  gdoccheck  Docs-native fonts only, no nested tables, every table pinned, no touching tables
  glyph      every non-ASCII character in a run has a glyph in the font that will draw it
  pagecheck  no shipped PDF page is blank
  offpage    every word of every PDF lies inside its page box
  pdftwin    every .docx/.pptx has a .pdf twin newer than it whose text contains the source text
  telength   ruling 26: no teacher's edition runs past four printed pages
  markup     no slide or page shows markup a renderer failed to consume (**, $, LaTeX, a slot mark)
  footer     nothing but the footer itself renders below a slide's footer rule
  plancheck  every deck side-car totals the period with a whiteboard remainder inside its range
  slidefit   no text box or picture in a deck crosses the footer rule or the slide edge
  overlap    on a rendered slide, no two lines of text collide and no figure sits on any words
  imagedrift every image embedded in a .docx or .pptx is a file in the figure library, byte for byte
  slotgeometry  colour moves no ink: every coloured expression, rendered black and in colour, agrees
  htmlcheck  the HTML decks and the unit console, opened in a real browser
  kitcheck   the build kit in this repository is the one Windmill published, byte for byte
  suitecheck the rulebook's suite tables name every check this file and the build run, and only those

This file is part of the shared build kit (croix18/Windmill, kit/). It is the same in both course
repositories; what differs between the courses is in build/course.py. Edit it in Windmill.
"""
import os, re, sys, glob, json, zipfile, subprocess, collections, hashlib
from xml.etree import ElementTree as ET
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from lib.profile import C
from lib import slotmark, names

W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
A = "{http://schemas.openxmlformats.org/drawingml/2006/main}"
P = "{http://schemas.openxmlformats.org/presentationml/2006/main}"
NATIVE_DOC_FONTS = {"Times New Roman", "Georgia", "FreeSerif", "Arial"}
DECK_FONTS = {"Lexend", "DejaVu Sans"}          # the slide font (ruling 40) and the face its missing signs are set in
FONT_FILES = {"Times New Roman": "/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf",
              "Georgia": "/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf",
              "FreeSerif": "/usr/share/fonts/truetype/freefont/FreeSerif.ttf",
              "Century Schoolbook": "/usr/share/texmf/fonts/opentype/public/tex-gyre/texgyreschola-regular.otf",
              "Lexend": os.path.join(os.path.dirname(os.path.abspath(__file__)), "assets", "Lexend-Regular.ttf"),
              "DejaVu Sans": "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"}


def is_student(name):
    # Teacher surfaces: keys, the Teacher Edition, and (ruling 25) the Lesson Plan, which carries
    # benchmark codes, the calculator note and the answers in red by design. What a file IS is read
    # from the tail of its name (lib/names.py), never from the lesson's title — a lesson called
    # "Key Features of a Graph" is not an answer key.
    if name.endswith(".notes.json"):
        return False
    return not names.is_key(name) and not names.is_teacher_page(name)


LESSON_EYEBROW = re.compile(re.escape(C.COURSE.upper()) + r"\s+·\s+UNIT \d+\s+·\s+\S")


def is_title_slide(text):
    """A lesson's title slide — the one slide of a lesson that may carry its benchmark code
    (HOUSE STYLE: 'the deck title slide ... carries them'). Found by its eyebrow, so a lesson
    inside the whole-unit deck is recognised wherever it starts."""
    return bool(LESSON_EYEBROW.search(text))


def docx_text(path):
    z = zipfile.ZipFile(path)
    x = z.read("word/document.xml").decode()
    return " ".join(re.findall(r"<w:t[^>]*>([^<]*)</w:t>", x))


def pptx_texts(path):
    z = zipfile.ZipFile(path)
    out = {}
    for n in sorted(z.namelist()):
        m = re.match(r"ppt/slides/slide(\d+)\.xml$", n)
        if m:
            x = z.read(n).decode()
            out[int(m.group(1))] = " ".join(re.findall(r"<a:t>([^<]*)</a:t>", x))
    return out


def check_docscan(files):
    findings = []; n = 0
    for f in files:
        base = os.path.basename(f)
        if f.endswith(".docx"):
            texts = {0: docx_text(f)}
        elif f.endswith(".pptx"):
            texts = pptx_texts(f)
        else:
            continue
        student = is_student(base)
        n += 1
        for k, t in texts.items():
            where = f"{base}" + (f" slide {k}" if k else "")
            if student and not (f.endswith(".pptx") and (k == 1 or is_title_slide(t))):
                if re.search(r"MA\.\d+\.[A-Z]+\.\d+\.\d+", t):
                    findings.append(f"docscan: benchmark code on student surface — {where}")
            if student:
                # HOUSE STYLE §13b: "describing what the FAST platform provides is a different thing and
                # belongs on the reference sheet" — the Reference Sheet may name the on-screen calculator.
                if re.search(r"\bcalculators?\b", t, re.I) and not names.is_kind(base, "Reference Sheet"):
                    findings.append(f"docscan: calculator line on student surface — {where}")
                if re.search(r"\bhomework\b", t, re.I):
                    findings.append(f"docscan: 'homework' on student surface — {where}")
            if re.search(r"with your partner|\bpartners?\b|group work|in teams", t, re.I) and not re.search(r"no partner|never for pairs|written for pairs|not partner|partner work anywhere", t, re.I):
                findings.append(f"docscan: partner/group work wording — {where}")
    print(f"docscan: {n} documents scanned, {len(findings)} findings")
    return findings


def check_keycheck(files):
    """A blank student paper carries no answers. A WORKED ANSWERS copy (ruling 32) is the one
    exception — it is handed back to the class after the test, so it is answered on purpose; it
    is still a student page for every other rule (no benchmark codes, no calculator line)."""
    findings = []; n = 0
    for f in files:
        base = os.path.basename(f)
        if not f.endswith(".docx") or not is_student(base):
            continue
        n += 1
        x = zipfile.ZipFile(f).read("word/document.xml").decode()
        answered = names.is_worked(base)
        if "ANSWER KEY" in x:
            findings.append(f"keycheck: ANSWER KEY mark on student paper — {base}")
        if not answered and re.search(r'w:color w:val="9E1B32"', x):
            findings.append(f"keycheck: answer-colour run on student paper — {base}")
        if answered and not re.search(r'w:color w:val="9E1B32"', x):
            findings.append(f"keycheck: WORKED ANSWERS copy has no answers on it — {base}")
        if answered and ("TRANSFER" in x or "BONUS" in x):
            findings.append(f"keycheck: ruling 32 — TRANSFER/BONUS printed on a student copy — {base}")
    print(f"keycheck: {n} student papers, {len(findings)} findings")
    return findings


def check_gdoc(files):
    findings = []; n = 0; tables = 0
    for f in files:
        if not f.endswith(".docx"):
            continue
        n += 1
        base = os.path.basename(f)
        z = zipfile.ZipFile(f)
        x = z.read("word/document.xml").decode()
        fonts = set(re.findall(r'w:ascii="([^"]+)"', x))
        bad = fonts - NATIVE_DOC_FONTS
        if bad:
            findings.append(f"gdoccheck: non-native fonts {sorted(bad)} — {base}")
        root = ET.fromstring(z.read("word/document.xml"))
        body = root.find(W + "body")
        for tbl in root.iter(W + "tbl"):
            tables += 1
            if tbl.find(W + "tblPr/" + W + "tblLayout") is None:
                findings.append(f"gdoccheck: table without pinned layout — {base}")
            for tc in tbl.iter(W + "tc"):
                if tc.find(W + "tbl") is not None:
                    findings.append(f"gdoccheck: nested table — {base}")
                    break
        kids = list(body)
        for i in range(len(kids) - 1):
            if kids[i].tag == W + "tbl" and kids[i + 1].tag == W + "tbl":
                findings.append(f"gdoccheck: two tables touch (Docs will weld them) — {base}")
    print(f"gdoccheck: {n} documents, {tables} tables, {len(findings)} findings")
    return findings


def check_glyph(files):
    try:
        from fontTools.ttLib import TTFont
    except ImportError:
        print("glyph: fontTools missing — UNCHECKED"); return ["glyph: fontTools not installed"]
    cmaps = {}
    for name, path in FONT_FILES.items():
        if os.path.exists(path):
            cmaps[name] = set(TTFont(path).getBestCmap().keys())
    findings = []; n = 0; chars = 0
    for f in files:
        if not (f.endswith(".docx") or f.endswith(".pptx")):
            continue
        n += 1
        base = os.path.basename(f)
        z = zipfile.ZipFile(f)
        parts = [p for p in z.namelist() if p.endswith(".xml") and ("document" in p or "slides/slide" in p)]
        for part in parts:
            x = z.read(part).decode()
            if f.endswith(".docx"):
                default = "Times New Roman"
                m = re.search(r'w:rFonts[^>]*w:ascii="([^"]+)"', z.read("word/styles.xml").decode())
                if m: default = m.group(1)
                for run in re.findall(r"<w:r>(.*?)</w:r>|<w:r [^>]*>(.*?)</w:r>", x, re.S):
                    r = run[0] or run[1]
                    fm = re.search(r'w:ascii="([^"]+)"', r)
                    font = fm.group(1) if fm else default
                    for t in re.findall(r"<w:t[^>]*>([^<]*)</w:t>", r):
                        for ch in t:
                            if ord(ch) > 127:
                                chars += 1
                                if font in cmaps and ord(ch) not in cmaps[font]:
                                    findings.append(f"glyph: U+{ord(ch):04X} '{ch}' not in {font} — {base}")
            else:
                for run in re.findall(r"<a:r>(.*?)</a:r>", x, re.S):
                    fm = re.search(r'typeface="([^"]+)"', run)
                    font = fm.group(1) if fm else "Lexend"
                    if font not in DECK_FONTS:          # ruling 40: every word on a slide is in the slide font
                        findings.append(f"glyph: a slide's text is set in {font}, not the slide font — {base}")
                    if '<a:rPr' in run and re.search(r'<a:rPr[^>]*\bi="1"', run):
                        findings.append(f"glyph: italic type on a slide (the slide font has none, so it would be slanted by machine) — {base}")
                    for t in re.findall(r"<a:t>([^<]*)</a:t>", run):
                        for ch in t:
                            if ord(ch) > 127:
                                chars += 1
                                if font in cmaps and ord(ch) not in cmaps[font]:
                                    findings.append(f"glyph: U+{ord(ch):04X} '{ch}' not in {font} — {base}")
    # and what LibreOffice actually drew: a deck's PDF carries the slide font itself, not a
    # substitute picked because the font was not installed on the machine that built it
    decks_pdf = 0
    for f in files:
        base = os.path.basename(f)
        if not (f.endswith(".pdf") and (names.is_kind(base, "Slides") or "All Slides" in base)):
            continue
        decks_pdf += 1
        try:
            out = subprocess.run(["pdffonts", f], capture_output=True, text=True, timeout=60).stdout.split("\n")[2:]
        except Exception:
            findings.append(f"glyph: pdffonts could not read {base}"); continue
        used = {re.sub(r"^[A-Z]{6}\+", "", ln.split()[0]) for ln in out if ln.strip()}
        if not any(u.startswith("Lexend") for u in used):
            findings.append(f"glyph: the PDF does not carry Lexend (fonts drawn: {', '.join(sorted(used)) or 'none'}) — {base}")
        odd = sorted(u for u in used if not u.startswith(("Lexend", "DejaVuSans")))
        if odd:
            findings.append(f"glyph: the PDF draws text in {', '.join(odd)} — {base}")
    findings = sorted(set(findings))
    print(f"glyph: {n} documents, {chars} non-ASCII characters, {decks_pdf} deck PDFs' fonts read, {len(findings)} findings")
    return findings


def _pages(pdf):
    out = subprocess.run(["pdfinfo", pdf], capture_output=True, text=True).stdout
    m = re.search(r"Pages:\s+(\d+)", out)
    return int(m.group(1)) if m else 0


def check_pages(files):
    findings = []; n = 0
    for f in files:
        if not f.endswith(".pdf"):
            continue
        base = os.path.basename(f)
        pages = _pages(f)
        imgs = subprocess.run(["pdfimages", "-list", f], capture_output=True, text=True).stdout
        img_pages = set(int(l.split()[0]) for l in imgs.splitlines()[2:] if l.strip() and l.split()[0].isdigit())
        for p in range(1, pages + 1):
            n += 1
            t = subprocess.run(["pdftotext", "-f", str(p), "-l", str(p), f, "-"], capture_output=True, text=True).stdout
            if not t.strip() and p not in img_pages:
                findings.append(f"pagecheck: blank page {p} — {base}")
    print(f"pagecheck: {n} pages, {len(findings)} findings")
    return findings


def check_offpage(files):
    findings = []; n = 0
    for f in files:
        if not f.endswith(".pdf"):
            continue
        base = os.path.basename(f)
        html = subprocess.run(["pdftotext", "-bbox", f, "-"], capture_output=True, text=True).stdout
        for pm in re.finditer(r'<page width="([\d.]+)" height="([\d.]+)">(.*?)</page>', html, re.S):
            pw, ph = float(pm.group(1)), float(pm.group(2))
            for wm in re.finditer(r'<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">([^<]*)</word>', pm.group(3)):
                n += 1
                x0, y0, x1, y1 = map(float, wm.groups()[:4])
                if x0 < 0 or y0 < 0 or x1 > pw + 0.5 or y1 > ph + 0.5:
                    findings.append(f"offpage: '{wm.group(5)}' outside page — {base}")
    print(f"offpage: {n} words measured, {len(findings)} findings")
    return findings


def check_pdftwin(files):
    findings = []; n = 0
    for f in files:
        if not (f.endswith(".docx") or f.endswith(".pptx")):
            continue
        n += 1
        pdf = f.rsplit(".", 1)[0] + ".pdf"
        base = os.path.basename(f)
        if not os.path.exists(pdf):
            findings.append(f"pdftwin: no PDF for {base}"); continue
        if os.path.getmtime(pdf) < os.path.getmtime(f):
            findings.append(f"pdftwin: PDF older than its source — {base}"); continue
        src = docx_text(f) if f.endswith(".docx") else " ".join(pptx_texts(f).values())
        pdft = subprocess.run(["pdftotext", pdf, "-"], capture_output=True, text=True).stdout
        words = [w.lower() for w in re.findall(r"[A-Za-z]{4,}", src)]
        pw = set(w.lower() for w in re.findall(r"[A-Za-z]{4,}", pdft))
        missing = [w for w in words if w not in pw]
        if words and len(missing) / len(words) > 0.02:
            findings.append(f"pdftwin: {len(missing)}/{len(words)} words of the source not in the PDF — {base}: {missing[:5]}")
    # The whole-unit deck is a second copy of the lesson decks: after its cover and contents, it
    # must match them slide for slide (each lesson numbers from 1 in both). A lesson rebuilt on its
    # own leaves the unit deck stale until build_unit.py runs again — this is where that shows.
    unit_decks = [f for f in files if f.endswith(".pptx") and names.is_unit_deck(f)]
    lessons = {}
    for f in files:
        if f.endswith(".pptx") and names.is_lesson_deck(f):
            t = pptx_texts(f)
            lessons[t[1]] = (os.path.basename(f), [t[k] for k in sorted(t)])
    for u in unit_decks:
        t = pptx_texts(u)
        seq = [t[k] for k in sorted(t)]
        i, used = 2, set()
        while i < len(seq):
            if seq[i] not in lessons:
                findings.append(f"pdftwin: {os.path.basename(u)} slide {i + 1} opens no lesson deck — the unit deck is stale or out of order")
                break
            name, lt = lessons[seq[i]]
            if seq[i:i + len(lt)] != lt:
                bad = next(k for k in range(len(lt)) if i + k >= len(seq) or seq[i + k] != lt[k])
                findings.append(f"pdftwin: {os.path.basename(u)} differs from {name} at its slide {bad + 1} — rebuild the unit deck (build_unit.py)")
                break
            used.add(name); i += len(lt)
        left = sorted(v[0] for v in lessons.values() if v[0] not in used)
        if left and i >= len(seq):
            findings.append(f"pdftwin: {os.path.basename(u)} is missing {left}")
    print(f"pdftwin: {n} sources, {len(findings)} findings")
    return findings


def check_telength(files):
    """Ruling 26: the teacher's edition is four pages or fewer, printed. A longer one is cut,
    not shrunk — so this is a content finding, never a reason to change the font."""
    findings = []; n = 0
    for f in files:
        base = os.path.basename(f)
        if not (base.endswith(".pdf") and names.is_kind(base, "Teacher Edition")):
            continue
        n += 1
        pp = _pages(f)
        if pp > C.TE_MAX_PAGES:
            findings.append(f"telength: {base} runs {pp} pages; ruling 26 caps the teacher's edition at {C.TE_MAX_PAGES} — cut it, do not shrink it")
    print(f"telength: {n} teacher's editions measured, {len(findings)} findings")
    return findings


def check_plan(files):
    findings = []; n = 0
    for f in files:
        if not f.endswith(".notes.json"):
            continue
        n += 1
        side = json.load(open(f))["slides"]
        fixed = sum(s["min"] for s in side if s["kind"] != "wb")
        wb = C.PERIOD - fixed
        lo, hi = C.WB_RANGE
        if not (lo <= wb <= hi):
            findings.append(f"plancheck: whiteboard remainder {wb} outside {lo}–{hi} — {os.path.basename(f)}")
        for s in side:
            if s["kind"] != "wb" and s["kind"] != "title" and not s["note"]:
                findings.append(f"plancheck: slide {s['n']} has no teaching note — {os.path.basename(f)}")
    print(f"plancheck: {n} decks, {len(findings)} findings")
    return findings


def check_markup(files):
    """No slide and no page may show markup that a renderer failed to consume: **bold** markers,
    $ signs, LaTeX commands, or a colour-slot mark. Every one of the first three shipped at least
    once in M7 Unit 5 with the rest of the suite at 0 findings (partial bold on notes rows, $^2$
    in answer lines, \\times in a gloss)."""
    findings = []; n = 0
    # a $ followed by a digit is money (\$ in a spec); a leaked delimiter is a $ before anything
    # else, or a digit closing on a $ ("$9$" leaves "9$")
    pats = [(r"\*\*", "**"), (r"\$(?!\d)|\d\$", "$"), (r"\\(frac|dfrac|times|div|cdot|text|pi|le|ge)\b", "LaTeX command"),
            (r"\^\{|\}\^", "LaTeX exponent"), (r"\\s[ABH]\{", "slot mark")]
    for f in files:
        base = os.path.basename(f)
        if f.endswith(".pptx"):
            texts = pptx_texts(f)
        elif f.endswith(".docx"):
            texts = {0: docx_text(f)}
        else:
            continue
        n += 1
        for k, t in texts.items():
            for pat, name in (pats if f.endswith(".pptx") else pats[4:]):
                if re.search(pat, t):
                    findings.append(f"markup: literal {name} on " + (f"slide {k}" if k else "the page") + f" — {base}")
                    break
    print(f"markup: {n} documents, {len(findings)} findings")
    return findings


def check_footer(files):
    """Nothing but the footer may sit below a slide's footer rule. deckkit refuses a text box
    whose DECLARED height crosses the rule, but a box sized for one line that wraps to two slips
    past that guard, so the rendered PDF is checked too. The footer's own words are the ones that
    appear below the rule on every slide of the LESSON; anything else down there is a spill. A
    lesson deck is one lesson; the whole-unit deck is cut into lessons at each title slide (and
    its cover and contents are one more run), because each lesson keeps its own running title."""
    FOOT_PT = 6.78 * 72
    findings = []; n = 0
    WORD = re.compile(r'<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">([^<]*)</word>')
    for f in files:
        base = os.path.basename(f)
        if not (f.endswith(".pdf") and names.is_slides(base)):
            continue
        html = subprocess.run(["pdftotext", "-bbox", f, "-"], capture_output=True, text=True).stdout
        pages = re.findall(r'<page width="[\d.]+" height="[\d.]+">(.*?)</page>', html, re.S)
        # yMAX, not yMin: a wrapped line hangs below the rule while its top is still above it
        below = [[m.group(5) for m in WORD.finditer(p) if float(m.group(4)) > FOOT_PT + 2] for p in pages]
        if not below:
            continue
        titles = [i for i, p in enumerate(pages) if is_title_slide(" ".join(m.group(5) for m in WORD.finditer(p)))]
        cuts = sorted(set([0] + titles + [len(pages)]))
        for a, b_ in zip(cuts, cuts[1:]):
            run = below[a:b_]
            common = set(run[0])
            for b in run[1:]:
                common &= set(b)
            for i, b in enumerate(run, start=a):
                n += len(b)
                extra = [w for w in b if w not in common and not w.strip().isdigit()]
                if extra:
                    findings.append(f"footer: {' '.join(extra)[:60]!r} sits below the footer rule — {base} slide {i + 1}")
    print(f"footer: {n} words below the rule, {len(findings)} findings")
    return findings


def check_slidefit(files):
    findings = []; n = 0
    EMU = 914400
    for f in files:
        if not f.endswith(".pptx"):
            continue
        z = zipfile.ZipFile(f)
        base = os.path.basename(f)
        for name in sorted(z.namelist()):
            m = re.match(r"ppt/slides/slide(\d+)\.xml$", name)
            if not m:
                continue
            x = z.read(name).decode()
            for sm in re.finditer(r'<a:off x="(-?\d+)" y="(-?\d+)"/><a:ext cx="(\d+)" cy="(\d+)"/>', x):
                n += 1
                x0, y0, cx, cy = (int(v) / EMU for v in sm.groups())
                if x0 < -0.01 or x0 + cx > 13.34 or y0 < -0.01 or y0 + cy > 7.51:
                    findings.append(f"slidefit: shape off the slide ({x0:.2f},{y0:.2f},{cx:.2f},{cy:.2f}) — {base} slide {m.group(1)}")
    print(f"slidefit: {n} shapes, {len(findings)} findings")
    return findings


def check_overlap(files):
    """§13 item 7: two checks the bbox and the eye both miss — text drawn over text, and a figure
    drawn over words — read from the RENDERED slide PDF. A filled panel or a drawn rule is an
    image too, and text sits on those by design; they are told apart from a figure by their
    pixels (a flat fill has no ink), and the count skipped is printed as part of the denominator.
    Thresholds: two lines collide when their boxes share more than 0.38 of the shorter line's
    height (a wrapped continuation line shares none — it sits below); a figure collides with a
    line when the shared area is more than 15% of the smaller of the two."""
    import io as _io, itertools
    try:
        import pymupdf
        from PIL import Image, ImageStat
    except ImportError as e:
        return [f"overlap: cannot run ({e})"]
    findings = []; nl = nf = npanel = 0; ndecks = 0
    for f in files:
        if not (f.endswith(".pdf") and names.is_slides(f)):
            continue
        ndecks += 1
        base = os.path.basename(f)
        d = pymupdf.open(f); flat = {}
        def is_flat(xref):
            if xref not in flat:
                try:
                    im = Image.open(_io.BytesIO(d.extract_image(xref)["image"])).convert("L")
                    flat[xref] = ImageStat.Stat(im).stddev[0] < 3.0
                except Exception:
                    flat[xref] = False
            return flat[xref]
        for pno, pg in enumerate(d, 1):
            lines = []
            for b in pg.get_text("dict")["blocks"]:
                if b["type"] != 0:
                    continue
                for ln in b["lines"]:
                    t = "".join(sp["text"] for sp in ln["spans"]).strip()
                    if t:
                        lines.append((pymupdf.Rect(ln["bbox"]), t))
            figs = []
            for im in pg.get_image_info(xrefs=True):
                if im.get("xref") and is_flat(im["xref"]):
                    npanel += 1
                    continue
                figs.append(pymupdf.Rect(im["bbox"]))
            nl += len(lines); nf += len(figs)
            for (ra, ta), (rb, tb) in itertools.combinations(lines, 2):
                x = ra & rb
                if not x.is_empty and x.height > 0.38 * min(ra.height, rb.height) and x.width > 1:
                    findings.append(f"overlap: text on text, {base} slide {pno}: {ta[:40]!r} ~ {tb[:40]!r}")
            for (ra, ta), rf in itertools.product(lines, figs):
                x = ra & rf
                if not x.is_empty and x.width > 2 and x.height > 2 and x.get_area() > 0.15 * min(ra.get_area(), rf.get_area()):
                    findings.append(f"overlap: figure on text, {base} slide {pno}: {ta[:40]!r} under a figure at {[round(v) for v in rf]}")
    if ndecks == 0:
        findings.append("overlap: examined NO decks")
    print(f"overlap: {ndecks} decks, {nl} text lines, {nf} figures ({npanel} panels and rules skipped as flat fills), {len(findings)} findings")
    return findings


def check_imagedrift(files):
    """§13's imagedrift: a document embeds a COPY of each figure at build time. Every embedded image
    must be, byte for byte, a file in figs/ — otherwise the document was built from a figure the
    library no longer has (an orphan) or from an older rendering of one (drift), and rebuilding it
    would change what students see."""
    import hashlib
    figs = os.path.join(HERE, "figs")
    lib = set()
    for p in glob.glob(os.path.join(figs, "*.png")):
        with open(p, "rb") as fh:
            lib.add(hashlib.sha256(fh.read()).hexdigest())
    findings = []; ndocs = nimg = ncopied = 0
    for f in files:
        if not f.endswith((".docx", ".pptx")):
            continue
        if any(names.is_kind(f, x) for x in C.FIGURE_DOCS_EXEMPT):
            ncopied += 1                      # a document copied into the unit, not built by this kit
            continue
        ndocs += 1
        z = zipfile.ZipFile(f)
        for n in z.namelist():
            if "/media/" not in n or n.endswith("/"):
                continue
            nimg += 1
            if hashlib.sha256(z.read(n)).hexdigest() not in lib:
                findings.append(f"imagedrift: {os.path.basename(f)} embeds {n}, which is not in the figure library")
    if ndocs == 0 or nimg == 0:
        findings.append(f"imagedrift: examined {ndocs} documents and {nimg} images — a check that examined nothing cannot be clean")
    print(f"imagedrift: {ndocs} documents, {nimg} embedded images against {len(lib)} library files"
          + (f" ({ncopied} copied-in documents skipped)" if ncopied else "") + f", {len(findings)} findings")
    return findings


BUILD_GATES = ("mathcheck", "distractorcheck", "capcheck", "rulingcheck", "balancecheck")


def check_suite(files):
    """HOUSE STYLE §13c: a list of what a system does is a claim about that system, and any list a
    script could derive must be derived. The course's suite block (C.SUITE_BLOCK, in C.SUITE_DOC)
    carries two tables — the build gates and this file's checks. Each must name every check that
    runs, and only those."""
    findings = []
    if not (C.SUITE_DOC and C.SUITE_BLOCK):
        return ["suitecheck: course.py names no SUITE_DOC / SUITE_BLOCK — the rulebook must list what runs"]
    try:
        txt = open(os.path.join(HERE, C.SUITE_DOC), encoding="utf-8").read()
    except OSError as e:
        return [f"suitecheck: cannot read the rulebook ({e})"]
    m = re.search(r"<!-- " + re.escape(C.SUITE_BLOCK) + r"\b.*?-->(.*?)(?=\n## |\n<!-- suite:|\Z)", txt, re.S)
    if not m:
        return [f"suitecheck: no {C.SUITE_BLOCK} block in the rulebook"]
    block = m.group(1)
    def rows(label):
        t = re.search(r"\| *" + re.escape(label) + r" *\|.*?\n\|[-| ]+\|\n((?:\|.*\n)+)", block)
        return [] if not t else re.findall(r"^\| *`([a-z]+)`", t.group(1), re.M)
    have_build = rows(f"gate ({C.PREFIX}, at build)")
    have_docs = rows(f"check ({C.PREFIX}, checks.py)")
    want_docs = [fn.__name__.replace("check_", "") for fn in RUN_LIST]
    alias = {"gdoc": "gdoccheck", "pages": "pagecheck", "plan": "plancheck", "suite": "suitecheck", "html": "htmlcheck", "kit": "kitcheck"}
    want_docs = [alias.get(n, n) for n in want_docs]
    for missing in [n for n in BUILD_GATES if n not in have_build]:
        findings.append(f"suitecheck: build gate `{missing}` runs but has no row in the rulebook's {C.SUITE_BLOCK} table")
    for extra in [n for n in have_build if n not in BUILD_GATES]:
        findings.append(f"suitecheck: the rulebook names build gate `{extra}`, which nothing runs")
    for missing in [n for n in want_docs if n not in have_docs]:
        findings.append(f"suitecheck: `{missing}` runs in checks.py but has no row in the rulebook's {C.SUITE_BLOCK} table")
    for extra in [n for n in have_docs if n not in want_docs]:
        findings.append(f"suitecheck: the rulebook names `{extra}`, which checks.py does not run")
    cnt = re.search(r"checks\.py` \((\w+)", block)
    words = {"eleven": 11, "twelve": 12, "thirteen": 13, "fourteen": 14, "fifteen": 15, "sixteen": 16,
             "seventeen": 17, "eighteen": 18, "nineteen": 19, "twenty": 20}
    if cnt and words.get(cnt.group(1)) not in (None, len(want_docs)):
        findings.append(f"suitecheck: the rulebook says checks.py runs {cnt.group(1)}; it runs {len(want_docs)}")
    print(f"suitecheck: {len(have_build)} gate rows and {len(have_docs)} check rows read against {len(BUILD_GATES)} gates and {len(want_docs)} checks, {len(findings)} findings")
    return findings


def check_kit(files):
    """The build kit — lib/, this file, the drivers, the assets — is shared by both courses and
    published from croix18/Windmill (kit/). Each course repository holds a copy with a manifest of
    hashes (KIT.sha256). A copy edited in place is a fork starting again: the two courses drifted
    eight hundred lines apart that way between 20 September and 4 October. Edit the kit in Windmill
    and vendor it (tools/vendor_windmill.py); this check refuses anything else."""
    man = os.path.join(HERE, "KIT.sha256")
    if not os.path.exists(man):
        return ["kitcheck: no KIT.sha256 beside checks.py — vendor the kit from Windmill (tools/vendor_windmill.py)"]
    findings = []; n = 0
    listed = set()
    for line in open(man, encoding="utf-8"):
        if not line.strip() or line.startswith("#"):
            continue
        want, rel = line.split(None, 1)
        rel = rel.strip(); listed.add(rel); n += 1
        p = os.path.join(HERE, rel)
        if not os.path.exists(p):
            findings.append(f"kitcheck: {rel} is in the kit and missing here"); continue
        with open(p, "rb") as fh:
            if hashlib.sha256(fh.read()).hexdigest() != want:
                findings.append(f"kitcheck: {rel} differs from the published kit — make the change in Windmill (kit/) and vendor it")
    for p in sorted(glob.glob(os.path.join(HERE, "lib", "*.py"))):
        rel = os.path.relpath(p, HERE).replace(os.sep, "/")
        if rel not in listed:
            findings.append(f"kitcheck: {rel} is not part of the kit — course code lives outside lib/")
    print(f"kitcheck: {n} kit files hashed against KIT.sha256, {len(findings)} findings")
    return findings


def check_slotgeometry(files):
    """HOUSE STYLE §2a: colour changes the colour of the ink and nothing else. Every expression the
    unit's decks colour is rendered black (the renderer whose geometry shipped) and in colour, and
    the ink is compared; more than 0.5% of it displaced is a finding. On 28 Sep the colour renderer
    drew fraction bars one thickness low and 1 pt too thick — on a phone the denominators ran into
    them — and this is the check that would have caught it before it shipped."""
    units = sorted({os.path.basename(os.path.dirname(os.path.abspath(f))) for f in files if f.endswith(".pptx") and names.is_slides(f)})
    findings = []; n = 0; marks = 0
    import slotaudit
    for u in units:
        flagged, worst, k = slotaudit.geometry(u)
        n += k
        marks += slotaudit.marks_in_specs(u)
        for frac, code, where, latex in flagged:
            findings.append(f"slotgeometry: {frac:.1%} of the ink moved when coloured — {code} {where}: {latex[:60]}")
    if n == 0 and (C.SLOTS == "exponent" or marks):
        findings.append("slotgeometry: examined no coloured expressions — a check that examined nothing cannot be clean")
    print(f"slotgeometry: {n} coloured expressions rendered twice and compared"
          + ("" if n or C.SLOTS == "exponent" or marks else " (no spec in this unit marks a slot)") + f", {len(findings)} findings")
    return findings


HTML_PROBE = r"""
() => {
  const out = {slides: [], exprs: [], errors: 0};
  const slides = [...document.querySelectorAll('.slide')];
  slides.forEach((sl, i) => {
    slides.forEach(x => x.classList.remove('on')); sl.classList.add('on');
    const body = sl.querySelector('.body') || sl.querySelector('.cover');
    const foot = sl.querySelector('.foot').getBoundingClientRect();
    let over = 0, wide = 0;
    sl.querySelectorAll('.body *, .cover *').forEach(el => {
      if (!el.getClientRects().length || el.closest('.katex-mathml') || el.closest('svg')) return;   // a radical's SVG path reports its unclipped canvas
      const r = el.getBoundingClientRect();
      if (r.height > 0 && r.bottom > foot.top + 1) over = Math.max(over, r.bottom - foot.top);
      const st = sl.getBoundingClientRect();
      if (r.right > st.right - 60 + 1) wide = Math.max(wide, r.right - (st.right - 60));
      if (r.left < st.left + 60 - 1 && r.width > 0) wide = Math.max(wide, (st.left + 60) - r.left);
    });
    out.slides.push({n: i + 1, over: Math.round(over), wide: Math.round(wide)});
  });
  out.errors = document.querySelectorAll('.katex-error').length;
  const B = 'rgb(30, 90, 168)', E = 'rgb(192, 90, 0)';
  document.querySelectorAll('.slots .k').forEach(k => {
    const html = k.querySelector('.katex-html'); if (!html) return;
    const walker = document.createTreeWalker(html, NodeFilter.SHOW_TEXT);
    let s = '', prev = null, node;
    while ((node = walker.nextNode())) {
      const t = node.textContent; if (!t.trim()) continue;
      const c = getComputedStyle(node.parentElement).color;
      const tag = c === B ? 'B' : (c === E ? 'E' : '');
      if (tag !== prev) { if (prev === 'B') s += ']'; if (prev === 'E') s += '}'; if (tag === 'B') s += '['; if (tag === 'E') s += '^{'; }
      s += t; prev = tag;
    }
    if (prev === 'B') s += ']'; if (prev === 'E') s += '}';
    out.exprs.push({tex: k.dataset.tex, read: s});
  });
  // named slots (\\textcolor in the source): which characters the page drew in each slot colour
  const NAMED = {'rgb(30, 90, 168)': 'A', 'rgb(192, 90, 0)': 'B', 'rgb(57, 128, 128)': 'H'};
  out.named = [];
  document.querySelectorAll('.k').forEach(k => {
    if (!/\\textcolor/.test(k.dataset.tex || '')) return;
    const html = k.querySelector('.katex-html'); if (!html) return;
    const got = {A: '', B: '', H: ''};
    const walker = document.createTreeWalker(html, NodeFilter.SHOW_TEXT); let node;
    while ((node = walker.nextNode())) { const t = node.textContent.replace(/\s/g, ''); if (!t) continue;
      const key = NAMED[getComputedStyle(node.parentElement).color]; if (key) got[key] += t; }
    out.named.push({tex: k.dataset.tex, got});
  });
  return out;
}
"""


CONSOLE_PROBE = r"""
() => {
  if (!window.UNIT) return null;
  const out = {lessons: UNIT.lessons.length, problems: []};
  const titles = [...document.querySelectorAll('.slide.title')].length - 1;      // minus the unit cover
  if (titles !== UNIT.lessons.length) out.problems.push(`${UNIT.lessons.length} lessons indexed, ${titles} lesson title slides`);
  UNIT.lessons.forEach(L => {
    const sum = L.segments.reduce((a, s) => a + s.min, 0);
    if (sum !== UNIT.periodMin) out.problems.push(`${L.code}: segments total ${sum} min, not ${UNIT.periodMin}`);
    const wb = L.segments.find(s => s.kind === 'wb');
    if (!wb || wb.min < 10 || wb.min > 20) out.problems.push(`${L.code}: whiteboard block ${wb ? wb.min : 'missing'} min (need 10–20)`);
    if (L.boards.length !== 18) out.problems.push(`${L.code}: ${L.boards.length} board slides, not 18`);
    L.boards.forEach(b => { const d = document.querySelectorAll('.slide')[b.slide].dataset.wb; if (!d) out.problems.push(`${L.code} board ${b.i}: no data-wb`);
      else { const w = JSON.parse(d); if (w.kind === 'mc' && (!w.letters || !w.key)) out.problems.push(`${L.code} board ${b.i}: mc without letters/key`);
             if (!/^MA\.[78]\./.test(w.benchmark)) out.problems.push(`${L.code} board ${b.i}: benchmark ${w.benchmark}`); } });
  });
  try { const r = Room.load({win: window, list: window.BENCHMARKS, allowProblems: true}); if (r.problems.length) out.problems.push('room: ' + r.problems[0]);
        if (!r.plan(SPINE, Object.keys(SPINE.days)[0], UNIT.course)) out.problems.push('room: the plan answers nothing for the first day'); }
  catch (e) { out.problems.push('room: ' + e.message); }
  if (typeof Console !== 'object' || typeof Console.show !== 'function') out.problems.push('console API missing');
  // the plan follows the class: the engine in this page lays the year exactly as the spine has it, and
  // every lesson in the deck is a day of that sequence
  const F = window.SPINE && SPINE.flow && SPINE.flow[UNIT.course];
  if (!window.Flow || !F) out.problems.push('flow: the engine or the course\'s sequence is missing');
  else {
    const res = Flow.lay(F); let bad = 0;
    res.rows.forEach(r => { const d = SPINE.days[r.date] && SPINE.days[r.date][UNIT.course];
      if (!d || d.kind !== r.entry.kind || (d.code || null) !== (r.entry.code || null)) bad++; });
    if (bad || res.left.length) out.problems.push(`flow: the engine lays ${bad} day(s) differently from the spine, ${res.left.length} item(s) with no day`);
    UNIT.lessons.forEach(L => { if (Flow.indexOf(F, L.code, L.plan) < 0) out.problems.push(`flow: ${L.code} is not a day of the year's sequence`); });
    if (typeof Console.flow !== 'function') out.problems.push('flow: the console does not answer where a period is');
  }
  return out;
}
"""


STAGE_PROBE = r"""
() => {
  const st = document.getElementById('stage'); if (!st) return null;
  const r = st.getBoundingClientRect(), con = document.body.classList.contains('console');
  const left = con && !document.body.classList.contains('norail') ? 300 : 0, top = con ? 40 : 0;
  return {l: r.left, t: r.top, r: r.right, b: r.bottom, left, top, iw: innerWidth, ih: innerHeight};
}
"""
SCREENS = ((1920, 1080), (1366, 768), (1024, 768), (2560, 1440))     # the panel, a laptop, a tablet, a large monitor
TOUCH = ((800, 1280), (1280, 800), (412, 915))                        # a tablet upright, on its side, and a phone


def _placed(g):
    """Is the slide inside the room the page leaves it (all of the window; in the console, what
    the bar and the rail leave), centred there, and as large as fits? None if so, else what is wrong.
    (The consoles of 4 October 2026 scaled the slide about its corner and moved it by half its
    unscaled size: right only at one window size, cut off at the panel's. No check opened them at
    another size, so no check saw it.)"""
    if not (g["l"] >= g["left"] - 1 and g["t"] >= g["top"] - 1 and g["r"] <= g["iw"] + 1 and g["b"] <= g["ih"] + 1):
        return f"the slide runs outside its space ({g['l']:.0f}–{g['r']:.0f} across, {g['t']:.0f}–{g['b']:.0f} down, in a {g['iw']}×{g['ih']} window)"
    if abs((g["l"] - g["left"]) - (g["iw"] - g["r"])) > 2 or abs((g["t"] - g["top"]) - (g["ih"] - g["b"])) > 2:
        return f"the slide is not centred in its space ({g['l']:.0f}–{g['r']:.0f} across, {g['t']:.0f}–{g['b']:.0f} down, in a {g['iw']}×{g['ih']} window)"
    if abs((g["r"] - g["l"]) - (g["iw"] - g["left"])) > 2 and abs((g["b"] - g["t"]) - (g["ih"] - g["top"])) > 2:
        return f"the slide does not fill its space either way ({g['r'] - g['l']:.0f}×{g['b'] - g['t']:.0f} in a {g['iw']}×{g['ih']} window)"
    return None


def _norm(s):
    """The reading as an order-free bag of (glyph, colour): KaTeX lays a fraction's denominator
    before its numerator in the DOM and splits a bracketed base around an inner exponent, so
    neither order nor run boundaries are compared — only which colour every glyph received, which
    is what the slot rule decides."""
    s = re.sub(r"[\s√\u200b\ue000-\uf8ff]", "", s).replace("\u2212", "−").replace("{,}", ",").replace("≠", "=")
    bag = []
    for run in re.findall(r"\[[^\]]*\]|\^\{[^}]*\}|.", s):
        if run.startswith("["):
            bag += [f"[{c}]" for c in run[1:-1]]
        elif run.startswith("^{"):
            bag += [f"^{c}" for c in run[2:-1]]
        else:
            bag.append(run)
    return "".join(sorted(bag))


def check_html(files):
    """The HTML decks, opened in a real browser: KaTeX typeset every expression (no .katex-error);
    nothing on any slide reaches below the footer rule or past the side margins; and the colour
    code the page applies to KaTeX's structure reads every expression exactly as mathimg reads
    the mathtext layout for the pptx — [base]^{exponent}, compared string for string."""
    findings = []; n = 0; nex = 0; ncon = 0; nnamed = 0; nplaced = 0; ntouch = 0
    decks = [f for f in files if f.endswith(".html")]
    if not decks:
        return ["htmlcheck: examined no HTML decks — a check that examined nothing cannot be clean"]
    import slotaudit
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page(viewport={"width": 1333, "height": 750})
        for f in decks:
            base = os.path.basename(f); n += 1
            pg.goto("file://" + os.path.abspath(f)); pg.wait_for_timeout(400)
            r = pg.evaluate(HTML_PROBE)
            c = pg.evaluate(CONSOLE_PROBE)
            if c:
                ncon += 1
                for prob in c["problems"]:
                    findings.append(f"htmlcheck: console — {prob} — {base}")
            # where the slide sits, at the sizes of screen it will meet (the console: rail open, then hidden)
            for (vw, vh) in SCREENS:
                pg.set_viewport_size({"width": vw, "height": vh}); pg.wait_for_timeout(60)
                for hide in ((False, True) if c else (False,)):
                    if hide:
                        pg.evaluate("document.getElementById('railBtn').click()")
                    wrong = _placed(pg.evaluate(STAGE_PROBE))
                    if wrong:
                        findings.append(f"htmlcheck: {wrong}{' with the rail hidden' if hide else ''} — {base}")
                    if hide:
                        pg.evaluate("document.getElementById('railBtn').click()")
                    nplaced += 1
            pg.set_viewport_size({"width": 1333, "height": 750}); pg.wait_for_timeout(60)
            # and held in the hand: a tablet upright and on its side, laid out the way a touch browser
            # lays a page out. A page wider than the screen is shown zoomed out there, and the console
            # once sized its slide by that zoomed-out width and so stayed wide (4 October).
            for (vw, vh) in TOUCH:
                ctx = b.new_context(viewport={"width": vw, "height": vh}, is_mobile=True, has_touch=True)
                tp = ctx.new_page()
                tp.goto("file://" + os.path.abspath(f)); tp.wait_for_timeout(350)
                at_open = tp.evaluate("innerWidth - document.documentElement.clientWidth")
                tp.keyboard.press("Escape"); tp.keyboard.press("ArrowRight"); tp.wait_for_timeout(150)
                on_slide = tp.evaluate("innerWidth - document.documentElement.clientWidth")
                wrong = _placed(tp.evaluate(STAGE_PROBE))
                ctx.close(); ntouch += 1
                if max(at_open, on_slide) > 2:
                    findings.append(f"htmlcheck: on a {vw}×{vh} touch screen the page is laid out {max(at_open, on_slide)} px wider than the screen (it opens zoomed out) — {base}")
                elif wrong:
                    findings.append(f"htmlcheck: on a {vw}×{vh} touch screen {wrong} — {base}")
            if r["errors"]:
                findings.append(f"htmlcheck: {r['errors']} expression(s) KaTeX could not typeset — {base}")
            for sl in r["slides"]:
                if sl["over"] > 2:
                    findings.append(f"htmlcheck: content runs {sl['over']} px below the footer rule — {base} slide {sl['n']}")
                if sl["wide"] > 2:
                    findings.append(f"htmlcheck: content runs {sl['wide']} px past the side margin — {base} slide {sl['n']}")
            seen = set()
            for e in r["exprs"]:
                nex += 1
                if e["tex"] in seen:
                    continue
                seen.add(e["tex"])
                try:
                    want = slotaudit.show(e["tex"], 32)
                except Exception as ex:
                    findings.append(f"htmlcheck: mathtext refuses an expression the page coloured: {e['tex'][:50]} — {base}")
                    continue
                if _norm(want) != _norm(e["read"]):
                    findings.append(f"htmlcheck: colour reading differs — page {_norm(e['read'])!r} vs mathtext {_norm(want)!r} — {base}")
            for e in r.get("named", []):
                nnamed += 1
                if e["tex"] in seen:
                    continue
                seen.add(e["tex"])
                # the spec's marks, read back from the \textcolor the page was handed
                want = {"A": "", "B": "", "H": ""}
                for hexc, body in re.findall(r"\\textcolor\{#([0-9A-F]{6})\}\{((?:[^{}]|\{[^{}]*\})*)\}", e["tex"]):
                    key = {v: k for k, v in slotmark.SLOT.items()}.get(hexc)
                    if key:
                        want[key] += re.sub(r"\\[a-zA-Z]+|[{}\s^_,]", "", body)
                for key in "ABH":
                    g = "".join(sorted(re.sub(r"[\s\u200b\ue000-\uf8ff,]", "", e["got"][key]).replace("\u2212", "-")))
                    w = "".join(sorted(want[key].replace("\u2212", "-")))
                    if g != w:
                        findings.append(f"htmlcheck: slot {key} — the page coloured {g!r}, the spec marked {w!r}: {e['tex'][:60]} — {base}")
        b.close()
    if ncon == 0:
        findings.append(f"htmlcheck: no unit console found — the All Slides .html should carry window.UNIT")
    print(f"htmlcheck: {n} HTML decks opened ({ncon} console), {nex + nnamed} coloured expressions compared, the slide's place measured {nplaced} times at {len(SCREENS)} screen sizes and {ntouch} times on {len(TOUCH)} touch screens, {len(findings)} findings")
    return findings


RUN_LIST = (check_docscan, check_keycheck, check_gdoc, check_glyph, check_pages, check_offpage, check_pdftwin,
            check_telength, check_markup, check_footer, check_plan, check_slidefit, check_overlap, check_imagedrift,
            check_slotgeometry, check_html, check_kit, check_suite)


def run(outdir):
    files = sorted(glob.glob(os.path.join(outdir, "*")))
    print(f"checks over {outdir}: {len(files)} files — " + ", ".join(f"{k} {v}" for k, v in collections.Counter(os.path.splitext(f)[1] for f in files).items()))
    findings = []
    for chk in RUN_LIST:
        findings += chk(files)
    for f in findings:
        print("  FINDING", f)
    print(f"checks: {len(findings)} findings")
    return findings


if __name__ == "__main__":
    fs = run(sys.argv[1])
    sys.exit(1 if fs else 0)
