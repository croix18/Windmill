"""The HTML deck: the same lesson, from the same spec, as ONE self-contained .html file.

Why it exists (Croix, 3 Oct 2026): the pptx decks paste math in as images, and every spacing fault
of the month — bars on denominators, small fractions, drifting numbers — came from that. In the
browser KaTeX typesets the math live, the slide is a real layout, and the colour code is applied
to the typeset structure rather than read off pixels.

Same interface as deckkit.Deck (lessonbuild._fill_deck drives both), flow layout instead of
coordinates: the y/x/w/h arguments are accepted and ignored. One file carries KaTeX, its fonts and
the house face inline (assets/), so it opens from a download, a USB stick or a Drive download with
no network. Arrow keys / space / click advance; ← goes back; Home/End; the URL hash is the slide;
Ctrl-P prints one slide per page.
"""
import os, re, json, html, base64
from . import figkit    # geometry figures, drawn from the numbers, embedded as data URIs
from . import slotmark
from .profile import C

AUTO_SLOTS = C.SLOTS == "exponent"   # base blue / exponent orange, painted by the page off KaTeX's structure

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(HERE, "..", "assets")
INK, VOCAB, RED, GRAY, LT, FILL = "1A1A1A", "0B5394", "9E1B32", "6B6B6B", "D9D9D9", "F2F2F0"
W, H = 1333.33, 750           # the slide's logical size in CSS px (13.333 × 7.5 in at 100 px/in)
SUP = dict(zip("⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺ᵐⁿ", "0123456789-+mn"))


def _read(name, binary=False):
    with open(os.path.join(ASSETS, name), "rb" if binary else "r", **({} if binary else {"encoding": "utf-8"})) as f:
        return f.read()


def _font_face(style, weight, italic):
    data = base64.b64encode(_read(f"schola-{style}.woff2", True)).decode()
    return (f"@font-face{{font-family:'Schola';font-weight:{weight};font-style:{'italic' if italic else 'normal'};"
            f"src:url(data:font/woff2;base64,{data}) format('woff2')}}")


def esc(t):
    return html.escape(t, quote=False)


def _tex(latex, slots):
    """The LaTeX KaTeX is handed: a named slot becomes \\textcolor where the teacher shows, and is
    dropped (its body kept) everywhere else."""
    return slotmark.textcolor(latex) if slots else slotmark.strip(latex)


def rich(text, size=None, slots=False):
    """Plain spec text → HTML: $…$ becomes a KaTeX span (display style, so fractions stay
    full-size), unicode superscripts become <sup>, **…** becomes bold, and — with slots — a named
    slot (\\sA{} \\sB{} \\sH{}) becomes a span in its colour."""
    out = []
    text = text.replace("\\$", "\ue000")                       # \$ = a literal dollar sign (money), never math
    for part in re.split(r"(\$[^$]+\$)", text):
        if not part:
            continue
        if part.startswith("$") and part.endswith("$") and len(part) > 2:
            out.append(f'<span class="k" data-tex="{esc(_tex(part[1:-1].replace(chr(0xe000), chr(92) + "$"), slots))}"></span>')
        else:
            part = part.replace("\ue000", "$")
            part = re.sub(r" {3,}", lambda m: f"\x00{len(m.group(0))}\x00", part)   # wide gaps survive as spans
            for piece, slot in (slotmark.pieces(part) if slots else [(slotmark.strip(part), None)]):
                run = []
                for pc in re.split(r"(\*\*[^*]+\*\*)", piece):                  # bold runs
                    if pc.startswith("**") and pc.endswith("**") and len(pc) > 4:
                        run.append("<b>" + _sups(pc[2:-2]) + "</b>")
                    else:
                        run.append(_sups(pc))
                out.append(f'<span class="slot" style="color:#{slot}">{"".join(run)}</span>' if slot else "".join(run))
    h = "".join(out)
    return re.sub(r"\x00(\d+)\x00", lambda m: f'<span class="gap" style="display:inline-block;width:{min(int(m.group(1)), 10) * 0.55}em"></span>', h)


def _sups(t):
    out, buf, insup = [], "", False
    for ch in t:
        s = ch in SUP
        if s != insup:
            out.append(esc(buf) if not insup else f"<sup>{esc(buf)}</sup>"); buf = ""; insup = s
        buf += SUP[ch] if s else ch
    out.append(esc(buf) if not insup else f"<sup>{esc(buf)}</sup>")
    return "".join(out)


class HtmlDeck:
    def __init__(self, course, unit, lesson_label, title, footer):
        self.course, self.unit, self.lesson_label, self.title, self.footer = course, unit, lesson_label, title, footer
        self.page_title = title   # the file's title: the unit's, even after start_lesson() moves self.title along
        self.slides = []          # each: dict(kind, title, sub, body=[html], n, lesson)
        self.side = []
        self.lessons = []         # unit deck: [{code, label, title, first}] — the console's rail
        self.cursor = 0.0
        self._n = 0
        self.s = None

    # ---------- primitives (flow) ----------
    def _add(self, h):
        self.s["body"].append(h)

    def _new(self, title, sub, minutes, note, kind):
        self._n += 1
        self.s = {"kind": kind, "title": title, "sub": sub, "body": [], "n": self._n,
                  "footer": self.footer, "lesson": self.lesson_label}
        self.slides.append(self.s)
        self.side.append({"n": self._n, "title": title, "sub": sub, "min": minutes, "note": note, "kind": kind})
        self.cursor = 1.9
        return self.s

    def _text(self, x, y, w, h, text, size=23, bold=False, italic=False, color=INK, align="left",
              anchor="top", runs=None, wrap=True, foot=False, slots=False):
        if runs:
            inner = "".join(f'<span style="font-size:{sz}pt;{"font-weight:700;" if b else ""}{"font-style:italic;" if i else ""}color:#{c}">{rich(t, slots=slots)}</span>'
                            for (t, sz, b, i, c) in runs)
            self._add(f'<p class="t {align}" style="font-size:{size}pt">{inner}</p>')
        else:
            st = f"font-size:{size}pt;color:#{color};" + ("font-weight:700;" if bold else "") + ("font-style:italic;" if italic else "")
            self._add(f'<p class="t {align}" style="{st}">{rich(text, slots=slots)}</p>')

    def _mixed(self, text, x, y, surface="slidemid", size=26, color=INK, bold=False, align="left", width=None, slots=False):
        st = f"font-size:{size}pt;color:#{color};" + ("font-weight:700;" if bold else "")
        self._add(f'<p class="t {align} s-{surface}{" slots" if slots and AUTO_SLOTS else ""}" style="{st}">{rich(text, slots=slots)}</p>')
        return 0.0, 0.5

    def measure(self, text, surface="slidemid", size=26, bold=False):
        return 0.0

    # ---------- slide types ----------
    def title_slide(self, benchmark, target, yesterday, today, minutes=1, note=""):
        self._new(self.title, "", minutes, note, "title")
        self.s["title_slide"] = True
        eyebrow = f"{self.course}  ·  UNIT {self.unit}  ·  {self.lesson_label}".upper()
        self._add(f'<div class="cover"><p class="eyebrow">{esc(eyebrow)}</p><h2>{esc(self.title)}</h2><div class="rule"></div>'
                  f'<p class="bm">{esc(benchmark)}</p><p class="target">{rich(target)}</p>'
                  f'<div class="box"><p class="y">{esc(yesterday)}</p><p class="td">{esc(today)}</p></div></div>')

    def section(self, title, sub="", minutes=0, note="", kind="content"):
        return self._new(title, sub, minutes, note, kind)

    def head(self, text, numeral=None):
        label = (f"{numeral}.  " if numeral else "") + text
        self._add(f'<h3 class="head">{esc(label)}</h3>')

    def items(self, rows, size=23, panel=False, letters=True, x=None, w=None, gap=0.1, start=0, slots=False):
        out = [f'<ol class="items{" panel" if panel else ""}{" slots" if slots and AUTO_SLOTS else ""}" style="font-size:{size}pt" start="{start + 1}">']
        for row in rows:
            if isinstance(row, tuple):
                term, rest = row
                body = f'<span class="vocab">{esc(term)}</span>   —   {rich(rest, slots=slots)}'
            else:
                bold = row.startswith("**")
                body = rich(row.strip("*"), slots=slots)
                if bold:
                    body = f"<b>{body}</b>"
            out.append(f'<li class="{"lettered" if letters else "plain"}">{body}</li>')
        out.append("</ol>")
        self._add("".join(out))

    def numbered(self, rows, size=21, x=1.05, w=11.4, gap=0.2):
        out = [f'<ol class="numbered" style="font-size:{size}pt">']
        out += [f"<li>{rich(r)}</li>" for r in rows]
        out.append("</ol>")
        self._add("".join(out))

    def text(self, text, size=23, bold=False, italic=False, color=INK, align="left", h=None, x=None, w=None, slots=False):
        self._text(0, 0, 0, 0, text, size, bold, italic, color, align, slots=slots)
        return self.cursor

    def table(self, widths, rows, size=15, header=True, x=None, row_h=0.42):
        total = sum(widths)
        out = [f'<table class="tbl" style="font-size:{size}pt;width:{min(100, total / 11.6 * 100):.0f}%"><colgroup>']
        out += [f'<col style="width:{wd / total * 100:.1f}%">' for wd in widths]
        out.append("</colgroup>")
        for ri, r in enumerate(rows):
            tag = "th" if (header and ri == 0) else "td"
            out.append("<tr>" + "".join(f"<{tag}>{rich(str(c))}</{tag}>" for c in r) + "</tr>")
        out.append("</table>")
        self._add("".join(out))

    def math(self, latex, surface="slidebig", align="center", x=None, y=None, color=INK, gap=0.25, slots=False):
        big = surface == "slidebig"
        self._add(f'<div class="k d {"big" if big else "mid"} {align}{" slots" if slots and AUTO_SLOTS else ""}" data-tex="{esc(_tex(latex, slots))}" style="color:#{color}"></div>')
        return 0.0, 0.6

    def math_row(self, parts, surface="slidemid", y=None, gap=0.35, size=26, color=INK, bold=False, align="center", x=None, slots=False):
        self._mixed(parts, 0, 0, surface, size, color, bold, align, slots=slots)
        return 0.5

    def choices(self, opts, size=24, correct=None, two_col=True):
        mathy = any("$" in o.replace("\\$", "") for o in opts)                  # a typeset option is short however long its LaTeX is
        two = two_col and len(opts) == 4 and (mathy or all(len(o) <= 30 for o in opts))   # a long option gets the full width
        if not two:                                                             # and the type steps down as the pptx does
            total = sum(len(o) for o in opts)
            size = size if total <= 150 else 22 if total <= 210 else 20 if total <= 270 else 18
        out = [f'<ol class="choices{" two" if two else ""}{" mathy" if mathy else ""}" style="font-size:{size}pt">']
        for i, o in enumerate(opts):
            cls = "correct" if correct == i else ""
            out.append(f'<li class="{cls}"><span class="L">{chr(65 + i)}.</span> {rich(o)}</li>')
        out.append("</ol>")
        self._add("".join(out))

    def answer_line(self, text, y=5.2):
        self._add(f'<p class="answer bottom"><span class="lab">Answer:</span> {rich(text)}</p>')

    def answer_math(self, latex, y=5.1):
        self._add(f'<p class="answer bottom"><span class="lab">Answer:</span> <span class="k big" data-tex="{esc(_tex(latex, False))}"></span></p>')

    def warmup_answers(self, pairs, x=None):
        for stem, answer in pairs:
            self._add(f'<p class="t left" style="font-size:23pt">{rich(stem)}<span class="wa">{rich(answer)}</span></p>')

    def worked_row(self, latex, gloss, slots=False):
        self._add(f'<div class="worked"><span class="k d mid{" slots" if slots and AUTO_SLOTS else ""}" data-tex="{esc(_tex(latex, slots))}"></span>'
                  f'<span class="why">{rich(gloss, slots=slots)}</span></div>')

    def ask(self, text, hint=None, y=None):
        h = f'<p class="hint">{rich(hint)}</p>' if hint else ""
        self._add(f'<div class="ask bottom"><p>{esc(text)}</p>{h}</div>')

    def gloss(self, text):
        self._add(f'<p class="gloss">{rich(text, slots=True)}</p>')

    def independent(self, minutes=6):
        self.section("Independent Set", "Six questions. On your own, in silence.", minutes,
                     "Hand out the Independent Set. Silent work. Circulate and mark what you see; do not teach. "
                     "Whatever is not finished goes home.", "independent")
        self.numbered(["Six questions. Work down the page.",
                       "Show the step that does the work, not just the answer.",
                       "Silence until the six minutes are up."])

    def independent_set(self, minutes, note, questions):
        """Ruling 21 with the six questions on the slide (no handout)."""
        self.section("Independent Practice", "Six questions. On your own, in writing.", minutes, note, "set")
        size = 19 if sum(len(q) for q in questions) < 520 else 17
        self.numbered(questions, size=size, gap=0.08)

    def close(self, lines, minutes=1, note=""):
        """Before You Go — the one thing today lives on, said back to the room."""
        self.section("Before You Go", "", minutes, note, "close")
        for ln in lines:
            self.text(ln, 24)

    def ixl(self, skills, minutes=5, due="Due at the start of the next class."):
        ss = C.IXL_SMARTSCORE
        self.section("IXL", "Last five minutes.", minutes, f"IXL: every listed skill is required, SmartScore {ss}. " + due, "ixl")
        self.numbered(["Open IXL and start today's skills.",
                       "Work on paper where the question needs work. The answer box does not show it.",
                       f"Every skill listed is required, to a SmartScore of {ss}. " + due])
        self._add('<p class="t left" style="font-size:21pt;font-weight:700;margin-top:18px">Today\'s skills — all required</p>')
        self._add('<ul class="skills">' + "".join(f"<li>{esc(s)}</li>" for s in skills) + "</ul>")

    def figure(self, spec, gap=0.16):
        """A geometry figure drawn from its numbers (figkit), the same PNG the PowerPoint carries,
        embedded as a data URI at its natural size (100 px per inch of the 13.33-inch stage)."""
        path, w, h = figkit.draw(spec, spec.get("in", 4.2))
        with open(path, "rb") as f:
            b = base64.b64encode(f.read()).decode("ascii")
        # natural size at most; the figure is the slide's one flexible block, so when the text
        # around it needs the room the picture shrinks (the pptx does the same through `avail`)
        self._add(f'<div class="fig"><img src="data:image/png;base64,{b}" style="max-width:{w * 100:.0f}px" alt=""></div>')

    # ---------- the whole-unit deck ----------
    def count(self):
        return len(self.slides)

    def slide_ref(self, i):
        return i

    def start_lesson(self, lesson_label, title, footer, code=None, plan=None):
        """plan: the code the year's plan (Windmill's spine) uses for this day when it is not the
        spec's own — a thread day is 3.T1 here and T-A1 in the plan."""
        self.lesson_label, self.title, self.footer = lesson_label, title, footer
        self._n = 0
        self.lessons.append({"code": code or lesson_label, "plan": plan, "label": lesson_label, "title": title, "first": len(self.slides)})

    def tag(self, **kw):
        """Metadata on the current slide for the console (a board's kind, letters, key, error keys,
        benchmark). Nothing here is drawn; the console's JS reads it."""
        self.s.update(kw)

    def unit_cover(self, title, lines):
        self._new(title, "", 0, "", "title")
        self.s["title_slide"] = True
        self._add(f'<div class="cover"><p class="eyebrow">{esc(f"{self.course}  ·  UNIT {self.unit}".upper())}</p><h2>{esc(title)}</h2><div class="rule"></div>'
                  + "".join(f'<p class="target">{esc(ln)}</p>' for ln in lines) + "</div>")

    def link_row(self, slide, y, left, right, target, pitch=0.46):
        # target is a 0-based slide index in the html deck (build_unit_deck passes the pptx slide; see save())
        slide.setdefault("links", []).append((left[0], left[1], right, target))

    # ---------- finish ----------
    def save(self, path, sidecar=False, console=False):
        if console:                                  # the unit deck: the day wrapped around the slides
            from .consolekit import render_console
            page = render_console(self, C.COURSE_KEY)
        else:
            page = render_page(self)
        with open(path, "w", encoding="utf-8") as f:
            f.write(page)
        return path


CSS = r"""
html,body{margin:0;height:100%;background:#2b2b2b;font-family:'Schola',Georgia,'Times New Roman',serif;color:#INK}
#stage{position:absolute;left:50%;top:50%;width:WPXpx;height:HPXpx;transform-origin:0 0;background:#fff;overflow:hidden;box-shadow:0 0 40px rgba(0,0,0,.6)}
.slide{display:none;position:absolute;inset:0;padding:40px 85px 84px 85px;box-sizing:border-box;flex-direction:column}
.slide.on{display:flex}
.slide h1{font-size:36pt;font-weight:700;margin:0;line-height:1.15}
.slide .rules{border-top:2px solid #INK;border-bottom:1px solid #INK;height:6px;margin:8px 0 6px}
.slide .sub{font-size:17pt;font-style:italic;color:#GRAY;margin:0 0 14px}
.body{flex:1 1 auto;display:flex;flex-direction:column;gap:10px;min-height:0;padding-bottom:8px;overflow:visible}
.katex-display{margin:.15em 0}
.foot{position:absolute;left:85px;right:85px;bottom:0;height:72px;border-top:1px solid #GRAY;display:flex;justify-content:space-between;align-items:flex-start;padding-top:6px;font-size:11pt;font-style:italic;color:#GRAY}
.foot .n{font-style:normal}
p.t{margin:0;line-height:1.3}
.left{text-align:left;padding-left:40px}.center{text-align:center}.right{text-align:right}
h3.head{font-size:25pt;margin:4px 0 2px;padding-bottom:4px;border-bottom:1px solid #INK}
ol.items{margin:0;padding-left:52px;line-height:1.35}
ol.items li.lettered{list-style:upper-alpha;padding-left:10px;margin:6px 0}
ol.items li.plain{list-style:none;margin:6px 0}
ol.items.panel li{background:#FILL;padding:4px 12px;margin:6px 0;border-radius:2px}
.vocab{color:#VOCAB;font-weight:700;font-size:110%}
ol.numbered{margin:0;padding-left:70px;line-height:1.35}ol.numbered li{margin:10px 0}ol.numbered li::marker{color:#VOCAB;font-weight:700}
ul.skills{margin:4px 0 0;padding-left:70px;font-size:19pt;list-style:none}ul.skills li{margin:4px 0}
table.tbl{border-collapse:collapse;margin:4px auto}table.tbl th,table.tbl td{border:1px solid #INK;padding:5px 10px;text-align:center;line-height:1.25}table.tbl th{background:#LT;font-weight:700}
.k.d{display:block;margin:4px 0}.k.d.center{text-align:center}.k.d.left{text-align:left;padding-left:115px}
.k.d.big{font-size:40pt}.k.d.mid{font-size:32pt}
.k:not(.d){font-size:1.05em}
p.s-slidemid .k:not(.d){font-size:32pt}p.s-slidebig .k:not(.d){font-size:40pt}p.s-slide .k:not(.d){font-size:26pt}
.body{gap:14px}
.katex{font-size:1em}
.worked{display:flex;align-items:center;gap:36px;padding-left:115px}.worked .k.d{display:inline-block;padding:0;margin:0}.worked .why{font-size:21pt;font-style:italic;color:#GRAY}
ol.choices{margin:6px 0 0;padding:0 0 0 40px;list-style:none;font-size:24pt}
ol.choices.two{display:grid;grid-template-columns:1fr 1fr;row-gap:12px}
ol.choices li .L{font-weight:700;display:inline-block;width:1.4em}
ol.choices li.correct{color:#RED;font-weight:700}
ol.choices.mathy{row-gap:14px}ol.choices.mathy li{display:flex;align-items:center;min-height:2.6em}ol.choices.mathy li .k{font-size:1.15em}
.bottom{margin-top:auto}
.answer{text-align:center;font-size:32pt;font-weight:700;color:#RED;margin:10px 0 0}.answer .lab{margin-right:.4em}.answer .k{font-size:40pt}
.ask{text-align:center}.ask p{margin:0;font-size:26pt;font-weight:700}.ask .hint{font-size:19pt;font-style:italic;color:#GRAY;font-weight:400;margin-top:2px}
.gloss{text-align:center;font-size:24pt;color:#GRAY;margin:0}
.wa{color:#RED;font-weight:700;margin-left:.9em}
.cover{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding-bottom:60px}
.cover .eyebrow{font-size:15pt;color:#GRAY;letter-spacing:.04em;margin:0 0 10px}.cover h2{font-size:34pt;margin:0 0 16px}
.cover .rule{width:610px;border-top:2px solid #INK;border-bottom:1px solid #INK;height:6px;margin-bottom:16px}
.cover .bm{font-size:16pt;font-weight:700;margin:0 0 8px}.cover .target{font-size:19pt;font-style:italic;margin:0 0 8px;max-width:1100px}
.cover .box{margin-top:26px;background:#FILL;border:1px solid #BFBFBF;padding:14px 30px;width:760px}
.cover .box p{margin:4px 0}.cover .y{font-size:17pt;font-style:italic;color:#GRAY}.cover .td{font-size:17pt;font-weight:700}
.contents{padding:0 40px}.contents a{display:flex;justify-content:space-between;text-decoration:none;color:#INK;font-size:22pt;padding:6px 0;border-bottom:1px solid #LT}
.contents.tight a{font-size:19pt;padding:2px 0;line-height:1.3}.contents a b{display:inline-block;width:150px}.contents a span.n{font-size:17pt;font-style:italic;color:#GRAY}
.fig{flex:1 1 0;min-height:0;display:flex;align-items:center;justify-content:center;margin:4px 0}.fig img{max-width:100%;max-height:100%;width:auto;height:auto}
sup{font-size:.62em;vertical-align:.45em;line-height:0}
#hud{position:fixed;right:14px;bottom:10px;color:#bbb;font:13px/1.2 system-ui,sans-serif;opacity:.7}
@media print{html,body{background:#fff}#stage{position:static;transform:none!important;box-shadow:none;width:WPXpx;height:HPXpx}.slide{display:flex!important;position:relative;page-break-after:always;height:HPXpx}#hud{display:none}}
@page{size:13.333in 7.5in;margin:0}
"""

JS = r"""
(function(){
  const W=WPX,H=HPX, stage=document.getElementById('stage');
  const slides=[...document.querySelectorAll('.slide')];
  let i=0;
  function fit(){const s=Math.min(innerWidth/W,innerHeight/H);stage.style.transform=`translate(-50%,-50%) scale(${s})`;stage.style.transformOrigin='center';}
  function show(n){n=Math.max(0,Math.min(slides.length-1,n));slides.forEach((s,k)=>s.classList.toggle('on',k===n));i=n;history.replaceState(null,'','#'+(n+1));
    document.getElementById('hud').textContent=(n+1)+' / '+slides.length;}
  const CONSOLE=document.body.classList.contains('console');   // the unit console (consolekit) drives navigation itself
  if(!CONSOLE){
  addEventListener('resize',fit);fit();
  addEventListener('keydown',e=>{if(['ArrowRight','PageDown',' '].includes(e.key)){e.preventDefault();show(i+1)}
    else if(['ArrowLeft','PageUp','Backspace'].includes(e.key)){e.preventDefault();show(i-1)}
    else if(e.key==='Home')show(0);else if(e.key==='End')show(slides.length-1)});
  stage.addEventListener('click',e=>{if(e.target.closest('a'))return;show(e.clientX<innerWidth*0.25?i-1:i+1)});
  document.querySelectorAll('a[data-go]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();show(+a.dataset.go)}));
  }
  // ---- math: KaTeX, display style everywhere so fractions stay full-size on a projector
  document.querySelectorAll('.k').forEach(el=>{
    try{const d=el.classList.contains('d');katex.render(d?el.dataset.tex:'\\displaystyle '+el.dataset.tex,el,{displayMode:d,throwOnError:true,strict:'ignore'});}
    catch(err){el.textContent='[math error] '+el.dataset.tex;el.classList.add('katex-error');console.error(err);}
  });
  // ---- the slot colour code (HOUSE STYLE 2a): base blue, exponent orange, on .slots surfaces.
  // Read off KaTeX's structure: a superscript lives in .msupsub; its base is the sibling before it
  // inside the same wrapper — a numeral, one letter, or a bracketed group walked back to its opener.
  const CB1='#1E5AA8', CB2='#C05A00';
  function paint(el,c){el.style.color=c;}
  function openerOf(close){ // close = the .mclose span holding ')' ; walk back over previous siblings
    let depth=0,n=close;const got=[];
    while(n){const t=n.textContent;const isClose=n.classList.contains('mclose')||/[)\]]/.test(t)&&n.classList.contains('mclose');
      if(n!==close){got.push(n)}
      if(n.classList.contains('mclose'))depth++;
      if(n.classList.contains('mopen')){depth--;if(depth===0)return got;}
      n=n.previousElementSibling;}
    return null;}
  // KaTeX breaks a long expression into several .katex-base runs at its + and = signs; a base
  // walked back to its '(' has to cross them, so "previous" means previous in reading order
  function prevEl(n){ if(n.previousElementSibling) return n.previousElementSibling;
    const p=n.parentElement; if(!p||!/\bkatex-base\b|\bbase\b/.test(p.className)) return null;
    let pb=p.previousElementSibling; while(pb&&!/\bkatex-base\b|\bbase\b/.test(pb.className)) pb=pb.previousElementSibling;
    return pb?pb.lastElementChild:null; }
  document.querySelectorAll('.slots .katex').forEach(k=>{
    k.querySelectorAll('.msupsub').forEach(ms=>{
      const wrap=ms.parentElement; const base=ms.previousElementSibling; if(!base)return;
      if(wrap.classList.contains('minner')||base.classList.contains('minner')){paint(base,CB1);}
      else if(base.classList.contains('mclose')){
        // the whole bracketed group: ')' plus everything back to the matching '('
        paint(base,CB1);
        let depth=0,n=prevEl(wrap);
        while(n){ if(n.classList.contains('mclose'))depth++;
          if(n.classList.contains('mopen')){ if(depth===0){paint(n,CB1);break;} depth--; }
          if(n.classList.contains('katex-strut')){n=prevEl(n);continue;}
          n.querySelectorAll('.msupsub').length? n.childNodes.forEach(c=>{if(c.nodeType===1&&!c.classList.contains('msupsub')&&!c.querySelector('.msupsub'))paint(c,CB1)}) : paint(n,CB1);
          n=prevEl(n); }
      } else if(base.classList.contains('sqrt')){ /* a root is structure, not a base */ }
      else {
        paint(base,CB1);
        // a numeral is the WHOLE numeral (10^5, 2.5^2): KaTeX sets each digit as its own .mord and
        // hangs the superscript on the last one, so walk back over touching digit siblings — an
        // operator, a space or a letter between them ends the numeral (mathimg's rule, slide-side)
        if(/^[0-9.]+$/.test(base.textContent)){
          let n=prevEl(wrap);
          while(n&&n.classList.contains('mord')&&/^[0-9.]+$/.test(n.textContent)&&!n.querySelector('.msupsub')){paint(n,CB1);n=prevEl(n);}
        }
      }
    });
    k.querySelectorAll('.msupsub').forEach(ms=>paint(ms,CB2));
    k.querySelectorAll('.root').forEach(r=>paint(r,getComputedStyle(k).color)); // root index: never an exponent
  });
  if(!CONSOLE)show(Math.max(0,(parseInt(location.hash.slice(1))||1)-1));
})();
"""


def render_page(D):
    css = (CSS.replace("WPX", f"{W:.2f}").replace("HPX", f"{H:.0f}").replace("#INK", "#" + INK).replace("#GRAY", "#" + GRAY)
           .replace("#VOCAB", "#" + VOCAB).replace("#RED", "#" + RED).replace("#LT", "#" + LT).replace("#FILL", "#" + FILL))
    js = JS.replace("WPX", f"{W:.2f}").replace("HPX", f"{H:.0f}")
    fonts = _font_face("regular", 400, False) + _font_face("bold", 700, False) + _font_face("italic", 400, True) + _font_face("bolditalic", 700, True)
    out = ['<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">',
           f"<title>{esc(getattr(D, 'page_title', D.title))}</title>", "<style>", fonts, _read("katex.inline.css"), css, "</style></head><body>",
           '<div id="stage">']
    for k, s in enumerate(D.slides):
        attrs = f' data-n="{s["n"]}" data-kind="{esc(s["kind"])}"'
        if s.get("wb"):
            attrs += " data-wb='" + json.dumps(s["wb"], ensure_ascii=True).replace("'", "&#39;") + "'"
        body = "".join(s["body"])
        if s.get("links"):
            body += '<div class="contents' + (' tight' if len(s["links"]) > 8 else '') + '">' + "".join(
                f'<a href="#{t + 1}" data-go="{t}"><span><b>{esc(a)}</b>{esc(b)}</span><span class="n">{esc(r)}</span></a>'
                for (a, b, r, t) in s["links"]) + "</div>"
        if s.get("title_slide"):
            out.append(f'<section class="slide title"{attrs}>{body}<div class="foot"><span>{esc(s["footer"])}</span><span class="n">{s["n"]}</span></div></section>')
        else:
            sub = f'<p class="sub">{esc(s["sub"])}</p>' if s["sub"] else '<p class="sub"></p>'
            out.append(f'<section class="slide"{attrs}><h1>{esc(s["title"])}</h1><div class="rules"></div>{sub}'
                       f'<div class="body">{body}</div><div class="foot"><span>{esc(s["footer"])}</span><span class="n">{s["n"]}</span></div></section>')
    out.append('</div><div id="hud"></div><script>')
    out.append(_read("katex.min.js"))
    out.append("</script><script>" + js + "</script></body></html>")
    return "\n".join(out)
