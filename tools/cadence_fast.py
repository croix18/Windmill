#!/usr/bin/env python3
"""Cadence → the bank of a generated practice FAST test (14 Nov 2026).

Croix, of the state's released FAST test on the site: "I want a fast test question regeneration engine similar to my practice
tests. Where I can build tons of practice fast tests, similar questions, etc." Asked how: a blueprint mix (each test follows
the FAST's reporting categories and question types and draws from a larger pool, so which benchmarks appear changes from test
to test), Grade 8 for A7 first, for students online and for him on paper — and "Use cadence. It generates graphs and pictures."

    python3 tools/cadence_fast.py --cadence ../cadence --site ../mrshaffer-site [--course a7] [--per-level 8] [--check] [--report FILE]

It opens Cadence (its one file, cadence.html) in headless Chrome, as tools/cadence_bank.py does and with that tool's own
reader of Cadence's keys, and for every benchmark of the grade's FAST draws Cadence's own items — drawItem(code, rigor, seed)
for G and H and drawLevelItem(code, level, generator, seed) for the level banks, seeds walked from 0, so the same Cadence
commit gives the same bank, byte for byte. It writes, in the site's repository:

    released/<course>/fast-practice/bank.json     the blueprint and every item, in the shapes the site's FAST screen already
                                                  shows and checks (released/kit/fast.js): mc, ms, grid, numeric
    released/<course>/fast-practice/BANK.sha256   the bank's hash (the site's build checks it)
    released/<course>/fast-practice/README.md     how and when it was made, from which Cadence commit, what was left out and why

THE BLUEPRINT is FLDOE's Test Design Summary and Blueprint: FAST Mathematics and B.E.S.T. EOCs (updated February 5, 2025),
Grade 8: four reporting categories — Number Sense and Operations and Probability 22–28%, Algebraic Reasoning 22–28%, Linear
Relationships, Data Analysis, and Functions 25–31%, Geometric Reasoning 22–28% — and 36–40 items. A generated test has 36
questions, 9 in each category (25%: inside every range, and what the 2025 released test has), each of the nine on a different
benchmark of its category. The benchmarks of each category are the summary's (BLUEPRINT below).

WHAT IS KEPT. Only what the FAST screen can show and check, which is also how the FAST itself asks:
    a choice (Cadence's mc, and its "etc" choices) with exactly four options  → mc
    a select-all with four to six options and two or more keys                → ms
    a matching table of up to five rows and five columns                      → grid
    a free answer of one or two numbers (each read by cadence_bank's read_key as a number: an integer, a decimal, a
    fraction, a mixed number, a percent), or one number in scientific notation → numeric (boxes; a percent sign or a unit
    after its box; scientific notation as two boxes, the second raised, as the released test's own item 24)
    an equation the stem asks for "in slope-intercept form" → numeric, as the FAST's fill-in: y = ☐x + ☐ (15 Nov 2026)
A numeric box takes "any equivalent value", as FLDOE's keys say: the key's value, and each other form Cadence's key accepts.
LEFT OUT, and counted in the README: an answer that is an expression, an equation or an inequality to type, a graph to
build, an explanation in words, a number with a drop-down, a choice without four options, an item with markup the page
will not carry. Ruling 43 (a practice problem never repeats a lesson's own numbers) is not applied: this is a test over the
year, not a lesson's practice.

LEVELS (15 Nov 2026, evening; Croix: "We did all this work on cadence, let's put it into practice. Update the fast practice
to have the latest engine of cadence, so I should actually see graphs and inequalities on number lines instead of them just
being described."). The bank made on 14 Nov walked drawItem(code, rigor, seed) from seed 0 and took the first 30 items that
fit a mix of kinds. Three things were wrong with that once Cadence had its state levels (29.18 to 29.28):
  - drawItem draws from G and H only. The 108 Grade 8 generators written for the state's achievement levels (Cadence's level
    banks, L2…L5: most of its graphs to read, tables, figures) are drawn by drawLevelItem, and none was in the bank;
  - taking items in seed order gave a benchmark's bank to whichever generators the first seeds happened to pick: MA.8.AR.3.3
    ("write y = mx + b from a graph, a table or a description") was 30 copies of "A line has a slope of −2 and a y-intercept
    of 1": a graph described;
  - an item's level was a band of Cadence's own percent estimate. Croix, 14 Nov: the state's levels replace those bands.
So, for every benchmark: EVERY GENERATOR Cadence has for it — G, H and the level banks, as Cadence's own level chooser lists
them — is drawn by itself, each item with THE STATE ACHIEVEMENT LEVEL (2 to 5) it was read at (Cadence's itemLevel: data/
ald_levels_g8.json for G and H, the bank's own level for a level bank). A benchmark's bank is at most --per-level items
(8) for each level it has, taken ONE GENERATOR AT A TIME, in turn, so every generator the FAST screen can ask is in it
and none crowds the others out. `d`, Cadence's percent estimate, is still carried, as the second number; nothing on the
site adapts by it. The site's test starts at Level 3 and goes one level up or down at each answer; a place asks its
benchmark's question of that level, or of the nearest level the benchmark has (the state wrote no Level 1 bullets: a
student below Level 2 is given Level 2 questions and misses them, as on the FAST).

PICTURES AS CHOICES (the same evening). Cadence draws a "which graph?" question as one figure of four small coordinate
planes lettered A to D with the choices "Graph A" … "Graph D", and (since 29.28) a "which number line?" question as four
number lines lettered A to D with "Number line A" … "Number line D". On the FAST each choice IS its graph. So when an
item's four choices are those words and its figure can be cut into its four parts exactly (split_choices: the lettered
label that opens each part, in order; a part's box measured from its own drawing, so the framed planes and the unframed
line graphs of MA.8.DP.1.1 come apart alike; anything it cannot measure and the figure stays whole), each choice is its
own picture ({svg, alt}) and the question has no other figure. The words ("Graph B") stay in choicesPlain: they are what
Cadence's printed answer names, and what the site's check reads the key against.

--check rebuilds in memory and exits 1 if the committed bank differs (a Cadence change, or this tool's)."""
import argparse, collections, datetime as dt, hashlib, importlib.util, json, os, re, sys
from fractions import Fraction

HERE = os.path.dirname(os.path.abspath(__file__))
_spec = importlib.util.spec_from_file_location("cadence_bank", os.path.join(HERE, "cadence_bank.py"))
cb = importlib.util.module_from_spec(_spec); _spec.loader.exec_module(cb)

TDS = "Test Design Summary and Blueprint: FAST Mathematics and B.E.S.T. EOCs, Florida Department of Education (updated February 5, 2025)"
BLUEPRINT = {
    "a7": {"grade": 8, "tier": "acc", "items": 36, "categories": [
        {"id": "NSO", "name": "Number Sense and Operations and Probability", "range": [22, 28], "count": 9,
         "benchmarks": ["MA.8.NSO.1.1", "MA.8.NSO.1.2", "MA.8.NSO.1.3", "MA.8.NSO.1.4", "MA.8.NSO.1.5", "MA.8.NSO.1.6", "MA.8.NSO.1.7",
                        "MA.8.DP.2.1", "MA.8.DP.2.2", "MA.8.DP.2.3"]},
        {"id": "AR", "name": "Algebraic Reasoning", "range": [22, 28], "count": 9,
         "benchmarks": ["MA.8.AR.1.1", "MA.8.AR.1.2", "MA.8.AR.1.3", "MA.8.AR.2.1", "MA.8.AR.2.2", "MA.8.AR.2.3", "MA.8.AR.4.1", "MA.8.AR.4.2", "MA.8.AR.4.3"]},
        {"id": "LF", "name": "Linear Relationships, Data Analysis and Functions", "range": [25, 31], "count": 9,
         "benchmarks": ["MA.8.F.1.1", "MA.8.F.1.2", "MA.8.F.1.3", "MA.8.AR.3.1", "MA.8.AR.3.2", "MA.8.AR.3.3", "MA.8.AR.3.4", "MA.8.AR.3.5",
                        "MA.8.DP.1.1", "MA.8.DP.1.2", "MA.8.DP.1.3"]},
        {"id": "GR", "name": "Geometric Reasoning", "range": [22, 28], "count": 9,
         "benchmarks": ["MA.8.GR.1.1", "MA.8.GR.1.2", "MA.8.GR.1.3", "MA.8.GR.1.4", "MA.8.GR.1.5", "MA.8.GR.1.6",
                        "MA.8.GR.2.1", "MA.8.GR.2.2", "MA.8.GR.2.3", "MA.8.GR.2.4"]}]},
}
EXPORT_JS = r'''([course, codes, per, budget, DIFF]) => {
  setCourseFilter(course);
  const CD = window.CadenceDifficulty;
  const keyOf = (c, p) => `${c}::${p.q}::${p.ft || ""}::${p.opts ? [...p.opts].sort().join("|") : p.rows ? p.rows.join("|") : ""}`;
  const seg = (s, o) => CTEX.segments(String(s == null ? "" : s), o || {}).map(g => g.math ? [g.tex, g.display ? 1 : 0] : g.text);
  // one item: its generator (src: G, H or L2…L5; gi), the seed that draws it again, and its state level (Cadence's itemLevel)
  const pack = (c, p, src, hr, s, lv) => {
    const it = {c, src, gi: p._genIdx, hr, s, lv, k: keyOf(c, p), rt: p.rt || "ee", q: p.q, a: p.a, sol: p.s || "", fig: p.fig || null, ft: p.ft || "",
      qS: seg(String(p.q).replace(/\n/g, "<br>"), {display: true}), qP: plain(p.q), aP: plain(p.a), aS: seg(p.a),
      solS: String(p.s || "").split("\n").filter(x => x.trim()).map(x => seg(x))};
    // Cadence's own percent estimate for this very item (cadence tools/difficulty_model.js): the second number
    if (CD && DIFF[c]) { const f = CD.features(p, plain(p.q), hr); it.d = CD.estimate(DIFF[c].anchor, DIFF[c].center, f); }
    if (p.inst) it.instS = seg(p.inst);
    if (p.opts) { it.opts = p.opts; it.optsS = p.opts.map(o => seg(o)); it.optsP = p.opts.map(o => plain(o)); it.key = p.key; }
    if (p.rt === "match") { it.cols = p.cols; it.rows = p.rows; it.key = p.key; it.colsS = p.cols.map(x => seg(x)); it.rowsS = p.rows.map(x => seg(x)); it.colsP = p.cols.map(x => plain(x)); it.rowsP = p.rows.map(x => plain(x)); }
    return it;
  };
  const out = {};
  for (const c of codes) {
    const R = {label: (STD[c] && STD[c].l) || "", items: [], unread: 0};
    // G and H: every seed once; each item goes to its own generator and its own level, `per` at most for each pair
    for (const hr of [false, true]) {
      if (hr && !hasRigor(c)) continue;
      const seen = new Set(), n = {};
      for (let s = 0; s < budget; s++) {
        const p = drawItem(c, hr, s); if (!p) continue;
        const lv = itemLevel(p); if (!lv) { R.unread++; continue; }
        const g = p._genIdx + "|" + lv; if ((n[g] || 0) >= per) continue;
        const k = keyOf(c, p); if (seen.has(k)) continue; seen.add(k); n[g] = (n[g] || 0) + 1;
        R.items.push(pack(c, p, hr ? "H" : "G", hr, s, lv));
      }
    }
    // the level banks: every generator a new draw may pick (lvLive), by itself
    for (const lv of [2, 3, 4, 5]) for (const gi of lvLive(c, lv)) {
      const seen = new Set(); let n = 0;
      for (let s = 0; s < 2048 && s < budget && n < per; s++) {
        const p = drawLevelItem(c, lv, gi, s); if (!p) continue;
        const k = keyOf(c, p); if (seen.has(k)) continue; seen.add(k); n++;
        R.items.push(pack(c, p, "L" + lv, lv === 5, s, lv));
      }
    }
    out[c] = R;
  }
  return out;
}'''


class Out(Exception):
    pass


def number(s):
    """A key as Cadence writes it → its exact value, and what stands after the box ('%' for a percent)."""
    t = cb.typed(s).replace("−", "-").replace(",", "").strip()
    after = ""
    if t.endswith("%"):
        t, after = t[:-1].strip(), "%"
    m = re.fullmatch(r"(-?)(\d+) (\d+)/(\d+)", t)
    if m:
        v = int(m.group(2)) + Fraction(int(m.group(3)), int(m.group(4)))
        return (-v if m.group(1) else v), after
    m = re.fullmatch(r"-?\d+/\d+", t)
    if m:
        a, b = t.split("/")
        if int(b) == 0:
            raise Out("a number the page cannot read")
        return Fraction(int(a), int(b)), after
    if re.fullmatch(r"-?(\d+\.?\d*|\.\d+)", t):
        return Fraction(t), after
    raise Out("a number the page cannot read")


def as_json(v):
    """An exact value → the JSON number the page compares with (an integer stays one)."""
    return int(v) if v.denominator == 1 else float(v)


def sci(s):
    m = re.fullmatch(r"(-?\d+(?:\.\d+)?) ?× ?10\^\(?(-?\d+)\)?", cb.typed(s).replace("−", "-").strip())
    if not m:
        raise Out("scientific notation the page cannot read")
    return Fraction(m.group(1)), int(m.group(2))


def slope_intercept(key):
    """'y = 2x − 3', 'y = −x', 'y = (1/4)x − 2', 'y = 15x' → (m, b), exact; None for any other equation."""
    t = cb.typed(key).replace("−", "-").strip()
    m = re.fullmatch(r"y = (.*?)x(?: ([+-]) (\d+(?:\.\d+)?|\d+/\d+))?", t)
    if not m:
        return None
    c = m.group(1).strip()
    g = re.fullmatch(r"(-?)\(?(-?)(\d+(?:\.\d+)?)(?:/(\d+))?\)?", c) if c not in ("", "-") else None
    if c in ("", "-"):
        slope = Fraction(-1 if c else 1)
    elif g and not (g.group(1) and g.group(2)) and (g.group(4) is None or int(g.group(4))):
        slope = Fraction(g.group(3)) / (int(g.group(4)) if g.group(4) else 1) * (-1 if g.group(1) or g.group(2) else 1)
    else:
        return None
    b = Fraction(0)
    if m.group(2):
        n, _, d = m.group(3).partition("/")
        if d and not int(d):
            return None
        b = Fraction(n) / (int(d) if d else 1) * (-1 if m.group(2) == "-" else 1)
    return slope, b


def convert(it):
    """Cadence's item → the FAST screen's item (type and what checks it), or Out(why it is left out)."""
    rt = it["rt"]
    if cb.SAFE.search(it["q"] + (it["fig"] or "") + " ".join(it.get("opts") or []) + it["a"] + it["sol"]):
        raise Out("markup the page will not carry")
    if rt in ("mc", "etc"):
        if len(it["opts"]) != 4:
            raise Out("a choice without four options")
        if not (isinstance(it["key"], int) and 0 <= it["key"] < 4):
            raise Out("a choice with no single key")
        if len(set(it["optsP"])) != 4:
            raise Out("a choice with two options alike")
        pics = split_choices(it)
        if pics:                                                # each choice is its own graph, as on the FAST
            return {"type": "mc", "choices": pics, "key": it["key"], "pictures": True}
        return {"type": "mc", "choices": it["optsS"], "key": it["key"]}
    if rt == "ms":
        key = sorted(set(it["key"]))
        if not (4 <= len(it["opts"]) <= 6) or len(key) < 2 or len(key) >= len(it["opts"]) or len(set(it["optsP"])) != len(it["opts"]):
            raise Out("a select-all the screen does not ask")
        return {"type": "ms", "choices": it["optsS"], "key": key}
    if rt == "match":
        if not (2 <= len(it["rows"]) <= 5 and 2 <= len(it["cols"]) <= 5) or len(it["key"]) != len(it["rows"]) or any(not (0 <= k < len(it["cols"])) for k in it["key"]):
            raise Out("a matching table the screen does not ask")
        return {"type": "grid", "rows": it["rowsS"], "cols": it["colsS"], "key": list(it["key"])}
    try:
        r = cb.read_key(it)
    except cb.Unreadable as e:
        raise Out(str(e))
    parts = r["parts"]
    if r.get("dropped"):
        raise Out("a key with a part the page cannot check")
    kinds = [p["type"] for p in parts]
    if kinds == ["sci"]:
        a, n = sci(parts[0]["key"])
        return {"type": "numeric", "template": [{"blank": 0}, "$\\times 10$", {"blank": 1, "raised": True}],
                "blanks": [{"accept": {"equals": [as_json(a)]}}, {"accept": {"equals": [n]}}]}
    if kinds == ["equation"] and re.search(r"\bin slope-intercept form\.\s*$", it["qP"]):
        # 15 Nov 2026: "Write an equation … in slope-intercept form" is asked as the FAST's fill-in asks it, y = ☐x + ☐ — the
        # slope and the y-intercept, each a number the screen can check (a negative y-intercept is typed with its sign). The
        # stem has already named the form, so the boxes give nothing away. Any other equation is still left out.
        mb = slope_intercept(parts[0]["key"])
        if mb:
            return {"type": "numeric", "template": ["$y=$", {"blank": 0}, "$x+{}$", {"blank": 1}],      # "+{}": the plus set as a sign between two terms, with its spaces
                    "blanks": [{"accept": {"equals": [as_json(mb[0])]}}, {"accept": {"equals": [as_json(mb[1])]}}], "equation": True}
    if not parts or len(parts) > 2 or any(k != "number" for k in kinds):
        raise Out({"expression": "an expression to type", "equation": "an equation to type", "inequality": "an inequality to type",
                   "nline": "a graph to build", "select": "a number with a drop-down", "sci": "scientific notation with another part"}
                  .get(next((k for k in kinds if k != "number"), ""), "more than two boxes"))
    tpl, blanks = [], []
    for j, p in enumerate(parts):
        v, after = number(p["key"])
        eq = [v]
        for alt in p.get("alts") or []:
            try:
                w, _ = number(alt)
            except Out:
                continue
            if w not in eq:
                eq.append(w)
        if len(parts) > 1 and not p.get("label"):
            raise Out("two boxes without labels")
        if p.get("label"):
            tpl.append(p["label"].rstrip(": ") + ": ")
        tpl.append({"blank": j})
        unit = after or (p.get("unit") or "")
        if unit:
            tpl.append(("" if unit in ("%", "°") else " ") + unit)
        if j < len(parts) - 1:
            tpl.append({"br": True})
        blanks.append({"accept": {"equals": [as_json(x) for x in eq]}})
    o = {"type": "numeric", "blanks": blanks}
    if len(tpl) > 1:
        o["template"] = tpl
    return o


# ------------------------------------------------------------------------------------------------ pictures as choices
# Cadence's four-part choice figures, each part opened by its letter (A, B, C, D, in bold):
#   the coordinate planes of a "which graph?" question ("Graph A" … "Graph D"): the letter is 11px, over its plane;
#   the number lines of a "which number line?" question (Cadence 29.28; "Number line A" … "Number line D"): the letter
#     is 13px, at the left of its line.
# A part is everything Cadence drew between its letter and the next one, and its picture is that drawing's own box
# (part_box: where its lines, circles, shapes and words are), so nothing here knows how Cadence lays a part out.
PLANE_LETTER = re.compile(r'<text x="[\d.]+" y="[\d.]+" text-anchor="middle" style="[^"]*font-size:11px;font-weight:700" fill="#222">([A-D])</text>')
LINE_LETTER = re.compile(r'<text x="14" y="[\d.]+" text-anchor="middle" style="[^"]*font-size:13px;font-weight:700" fill="#222">([A-D])</text>')
SVG_WHOLE = re.compile(r'^<svg class="fig[^"]*" width="100%" viewBox="0 0 ([\d.]+) ([\d.]+)" preserveAspectRatio="xMidYMid meet">(.*)</svg>$', re.S)
PART_NAMES = {"Graph": PLANE_LETTER, "Number line": LINE_LETTER}
_NUM = r"-?\d+(?:\.\d+)?"


def part_box(body):
    """Where a piece of Cadence's drawing is: (x0, y0, x1, y1) around its lines, circles, rectangles, polygons, polylines,
    paths (absolute M and L only) and words (a word's width is reckoned at 0.62 of its size for each character, generously);
    None when it holds anything else (a group, a transform, a curve command), so that a part is never cut by guesswork."""
    xs, ys, seen = [], [], 0
    def add(x, y):
        xs.append(float(x)); ys.append(float(y))
    for m in re.finditer(r"<(\w+)\b([^>]*?)/?>(?:([^<]*)</\1>)?", body):
        tag, at, inner = m.group(1), m.group(2), m.group(3)
        A = dict(re.findall(r'([\w:-]+)="([^"]*)"', at))
        seen += 1
        if "transform" in A:
            return None
        try:
            if tag == "line":
                add(A["x1"], A["y1"]); add(A["x2"], A["y2"])
            elif tag == "circle":
                r = float(A["r"]); add(float(A["cx"]) - r, float(A["cy"]) - r); add(float(A["cx"]) + r, float(A["cy"]) + r)
            elif tag == "rect":
                add(A["x"], A["y"]); add(float(A["x"]) + float(A["width"]), float(A["y"]) + float(A["height"]))
            elif tag in ("polygon", "polyline"):
                pts = re.findall(rf"({_NUM})[ ,]({_NUM})", A["points"])
                if not pts:
                    return None
                for x, y in pts:
                    add(x, y)
            elif tag == "path":
                d = A["d"]
                if re.search(r"[^MLZ\d\s.,-]", d):
                    return None
                for x, y in re.findall(rf"({_NUM})[ ,]({_NUM})", d):
                    add(x, y)
            elif tag == "text":
                size = float(re.search(r"font-size:([\d.]+)px", A.get("style", "")).group(1))
                x, y, w = float(A["x"]), float(A["y"]), 0.62 * size * len(re.sub(r"&\w+;", "x", inner or ""))
                x0 = x - w / 2 if A.get("text-anchor") == "middle" else x - w if A.get("text-anchor") == "end" else x
                add(x0, y - 0.85 * size); add(x0 + w, y + 0.3 * size)
            else:
                return None
        except (KeyError, ValueError, AttributeError):
            return None
    if not seen or re.sub(r"<(\w+)\b[^>]*?/?>(?:[^<]*</\1>)?", "", body).strip():
        return None                                             # something between the elements that is not one of them
    return min(xs), min(ys), max(xs), max(ys)


def _box(x0, y0, x1, y1, body):
    g = lambda v: ("%.2f" % v).rstrip("0").rstrip(".")
    return f'<svg class="fig" width="100%" viewBox="{g(x0)} {g(y0)} {g(x1 - x0)} {g(y1 - y0)}" preserveAspectRatio="xMidYMid meet">{body}</svg>'


def split_choices(it):
    """A choice item whose options are "Graph A" … "Graph D" or "Number line A" … "Number line D" and whose figure is one
    of Cadence's four-part figures → the four parts, each its own picture: [{"svg", "alt"} × 4]. None when the item is not
    one of those, or its figure does not come apart exactly: the letters A, B, C, D in order, each opening a part; every
    part's drawing measured (part_box) and clear of the others; the four pictures of one size, each holding its own part
    whole and nothing of another. Then the figure stays whole and the choices stay words."""
    opts, fig, ft = it.get("optsP") or [], it.get("fig") or "", it.get("ft") or ""
    name = next((n for n in PART_NAMES if opts == [f"{n} {L}" for L in "ABCD"]), None)
    m = SVG_WHOLE.match(fig)
    if not name or not m:
        return None
    W, H, body = float(m.group(1)), float(m.group(2)), m.group(3)
    marks = list(PART_NAMES[name].finditer(body))
    if [x.group(1) for x in marks] != list("ABCD") or marks[0].start() != 0:
        return None
    parts = [body[marks[i].end(): marks[i + 1].start() if i < 3 else len(body)] for i in range(4)]
    if any(PLANE_LETTER.search(c) or LINE_LETTER.search(c) for c in parts):
        return None
    drawn = [part_box(c) for c in parts]
    if not all(drawn):
        return None
    over = lambda a, b, lo, hi: min(a[hi], b[hi]) - max(a[lo], b[lo])       # how far two boxes share a direction
    clear = lambda a, b: over(a, b, 0, 2) <= 0.01 or over(a, b, 1, 3) <= 0.01
    if not all(clear(drawn[i], drawn[j]) for i in range(4) for j in range(i)):
        return None                                             # two parts' drawings run into each other
    # parts in one column take that column's left and right, parts in one row that row's top and bottom: four number
    # lines' tick marks stay under one another, four planes stay one size
    def with_mates(i, lo, hi):
        mates = [b for b in drawn if over(b, drawn[i], lo, hi) > 0.5 * min(b[hi] - b[lo], drawn[i][hi] - drawn[i][lo])]
        return min(b[lo] for b in mates), max(b[hi] for b in mates)
    held = []
    for i in range(4):
        (x0, x1), (y0, y1) = with_mates(i, 0, 2), with_mates(i, 1, 3)
        held.append((x0, y0, x1, y1))
    if any(d[0] < -2 or d[1] < -2 or d[2] > W + 2 or d[3] > H + 2 for d in drawn):
        return None                                             # a part Cadence's own figure cuts off: not to be shown further
    # a margin of 4 where there is room, never more than half the way to the nearest other part (a picture's box may pass
    # the figure's own edge by that margin: nothing is drawn there)
    gaps = [g for i in range(4) for j in range(i) for g in (-over(held[i], held[j], 0, 2), -over(held[i], held[j], 1, 3)) if g > 0.01]
    pad = max(0.0, min([4.0] + [g / 2 for g in gaps]))
    w, h = max(b[2] - b[0] for b in held) + 2 * pad, max(b[3] - b[1] for b in held) + 2 * pad
    if w < 60 or h < 20:
        return None
    # one size for the four, each part in the middle of its own
    boxes = [((b[0] + b[2] - w) / 2, (b[1] + b[3] - h) / 2, (b[0] + b[2] + w) / 2, (b[1] + b[3] + h) / 2) for b in held]
    for i in range(4):
        if not all(clear(boxes[i], drawn[j]) for j in range(4) if j != i):
            return None                                         # a picture that would show some of another part
    out = [_box(b[0], b[1], b[2], b[3], c) for b, c in zip(boxes, parts)]
    # what each part shows, in the figure's own words: "…: Graph A is …; Graph B is …" (or the choice's name alone)
    said = ft.split(": ", 1)[1].split("; ") if ": " in ft else []
    alts = [said[i] if len(said) == 4 and re.search(r"\b%s %s\b" % (name, L), said[i]) else f"{name} {L}" for i, L in enumerate("ABCD")]
    return [{"svg": svg, "alt": alt[0].upper() + alt[1:]} for svg, alt in zip(out, alts)]


def choose(pool, per):
    """Of the items a benchmark has at ONE level: at most `per`, one generator at a time, in turn — its generators in
    the order G, H, the level bank, each by its place in its bank; a generator's own items in seed order — so every
    generator the screen can ask is in the bank, and none crowds the others out."""
    order = {"G": 0, "H": 1}
    gens = collections.OrderedDict()
    for x in sorted(pool, key=lambda x: (order.get(x["src"], 2), x["gen"], x["seed"])):
        gens.setdefault((x["src"], x["gen"]), []).append(x)
    picked, k = [], 0
    while len(picked) < per and any(k < len(v) for v in gens.values()):
        for v in gens.values():
            if k < len(v) and len(picked) < per:
                picked.append(v[k])
        k += 1
    return picked


def build(args):
    bp = BLUEPRINT[args.course]
    codes = [b for c in bp["categories"] for b in c["benchmarks"]]
    cat_of = {b: c["id"] for c in bp["categories"] for b in c["benchmarks"]}
    cad_path = os.path.join(args.cadence, "cadence.html")
    # Cadence's draws can be kept between runs (--raw-cache: by Cadence's own file, the benchmarks and the walk), so that
    # work on this tool's reading does not open Cadence again; --check never reads them
    rc = None
    if getattr(args, "raw_cache", None) and not args.check:
        cad_sha = hashlib.sha256(open(cad_path, "rb").read()).hexdigest()[:12]
        rc = os.path.join(args.raw_cache, f"fast-{cad_sha}-{args.course}-{args.cap}-{args.budget}.json")
    kept = json.load(open(rc, encoding="utf-8")) if rc and os.path.exists(rc) else None
    C = None if kept else cb.Cadence(cad_path)
    meta = kept["meta"] if kept else C.meta()
    # Cadence's percent estimate (the second number): its model, from its own table, which must be the page's build
    dtable = json.load(open(os.path.join(args.cadence, "data", "difficulty_g8.json"), encoding="utf-8"))
    if dtable.get("build") != meta.get("build"):
        sys.exit(f"cadence_fast: Cadence's difficulty table is for build {dtable.get('build')}, the page is build {meta.get('build')}: run node tools/difficulty.js in Cadence")
    # the state levels: Cadence's page knows them (itemLevel); its table must be the page's build too, or a new generator is unread
    ltable = json.load(open(os.path.join(args.cadence, "data", "ald_levels_g8.json"), encoding="utf-8"))
    if ltable.get("build") != meta.get("build"):
        sys.exit(f"cadence_fast: Cadence's level table is for build {ltable.get('build')}, the page is build {meta.get('build')}: read the new generators in Cadence (tools/ald_levels.py)")
    if C and not C.p.evaluate("typeof itemLevel === 'function' && typeof drawLevelItem === 'function' && typeof lvLive === 'function'"):
        sys.exit("cadence_fast: this Cadence has no state levels (itemLevel, drawLevelItem, lvLive): 29.27 or later is needed")
    DIFF = {c: {"anchor": b["anchor"], "center": b["center"]} for c, b in dtable["benchmarks"].items()}
    missing = [c for c in codes if c not in DIFF]
    if missing:
        sys.exit("cadence_fast: no difficulty anchor for " + ", ".join(missing))
    if kept:
        raw = kept["raw"]
    else:
        C.p.add_script_tag(path=os.path.join(args.cadence, "tools", "difficulty_model.js"))
        raw = C.p.evaluate(EXPORT_JS, [bp["tier"], codes, args.cap, args.budget, DIFF])
        C.close()
        if C.errors:
            sys.exit("cadence_fast: Cadence's page threw: " + C.errors[0])
        if rc:
            os.makedirs(args.raw_cache, exist_ok=True)
            json.dump({"meta": meta, "raw": raw}, open(rc, "w", encoding="utf-8"), ensure_ascii=False)
    items, stats, problems = [], {}, []
    for code in codes:
        R = raw.get(code) or {"items": [], "label": "", "unread": 0}
        out = collections.Counter(); pool = []; gens_all = set(); gens_kept = set()
        if R.get("unread"):
            problems.append(f"{code}: {R['unread']} draws of a generator with no state level")
        for it in R["items"]:
            gens_all.add((it["src"], it["gi"], it["lv"]))
            try:
                o = convert(it)
            except Out as e:
                out[str(e)] += 1; continue
            gens_kept.add((it["src"], it["gi"], it["lv"]))
            x = {"id": hashlib.sha1(f"fast|{args.course}|{it['c']}|{it['src']}|{it['gi']}|{it['s']}|{it['k']}".encode()).hexdigest()[:10],
                 "b": code, "c": cat_of[code], "src": it["src"], "gen": it["gi"], "seed": it["s"], "rigor": bool(it["hr"]), "lv": it["lv"], "d": it["d"], "type": o["type"],
                 "stem": it["qS"], "plain": it["qP"]}
            if it.get("instS") and not o.get("pictures"):
                x["inst"] = it["instS"]
            if it["fig"] and not o.get("pictures"):
                x["fig"] = it["fig"]; x["figText"] = it["ft"]
            for k in ("choices", "rows", "cols", "key", "template", "blanks"):
                if k in o:
                    x[k] = o[k]
            # the words as Cadence's plain() gives them: what the site's check reads Cadence's printed answer against
            if o["type"] in ("mc", "ms"):
                x["choicesPlain"] = it["optsP"]
            elif o["type"] == "grid":
                x["rowsPlain"] = it["rowsP"]; x["colsPlain"] = it["colsP"]
            x["answer"] = it["aS"]; x["answerPlain"] = it["aP"]; x["solution"] = it["solS"]
            pool.append(x)
        picked = []
        for lv in (2, 3, 4, 5):
            picked += choose([x for x in pool if x["lv"] == lv], args.per_level)
        picked.sort(key=lambda x: (x["lv"], {"G": 0, "H": 1}.get(x["src"], 2), x["gen"], x["seed"]))
        kinds = collections.Counter(x["type"] for x in picked)
        in_bank = {(x["src"], x["gen"], x["lv"]) for x in picked}
        stats[code] = {"label": R["label"], "drawn": len(R["items"]), "kept": len(pool), "banked": len(picked), "kinds": dict(kinds),
                       "levels": [sum(1 for x in picked if x["lv"] == k) for k in (2, 3, 4, 5)], "anchor": DIFF[code]["anchor"],
                       "generators": len({g[:2] for g in gens_all}), "asked": len({g[:2] for g in in_bank}),
                       "leftGens": sorted(f"{g[0]}{g[1]}" if g[0] in ("G", "H") else f"{g[0]}[{g[1]}]" for g in {g[:2] for g in gens_all} - {g[:2] for g in gens_kept}),
                       "figures": sum(1 for x in picked if x.get("fig")), "pictures": sum(1 for x in picked if x["type"] == "mc" and isinstance(x["choices"][0], dict)), "out": dict(out)}
        if len(picked) < args.least:
            problems.append(f"{code}: {len(picked)} items, fewer than {args.least}")
        if len({x["lv"] for x in picked}) < 2:
            problems.append(f"{code}: its items are all of one level")
        items += picked
    ids = [x["id"] for x in items]
    if len(set(ids)) != len(ids):
        problems.append("two items share an id")
    bank = {"v": 2, "course": args.course, "grade": bp["grade"], "tier": bp["tier"],
            "blueprint": {"source": TDS, "items": bp["items"], "categories": bp["categories"]},
            "levels": {"what": "lv: the state achievement level, 2 to 5, of FLDOE's Achievement Level Descriptions that the item's generator was read at in Cadence. A reading, not a measurement: Cadence has no student data.",
                       "source": "cadence data/ald_levels_g8.json (itemLevel); the level banks carry their own"},
            "difficulty": {"what": "d: Cadence's starting estimate of the percent of Florida Grade 8 students who would answer the item correctly. An estimate, not a measurement; nothing adapts by it.",
                           "model": "cadence tools/difficulty_model.js", "anchoredTo": dtable["released"]},
            "source": {"cadence": cb.git_head(args.cadence), "build": meta.get("build"), "windmill": cb.git_head(os.path.dirname(HERE)), "perLevel": args.per_level},
            "n": len(items), "items": items}
    return bank, stats, problems


def readme(bank, stats, sha):
    L = [f"# The generated practice FAST test's bank — {bank['course'].upper()}, Grade {bank['grade']}", "",
         "Made by Windmill `tools/cadence_fast.py` from Cadence. **Do not edit by hand**: make it again.", "",
         f"- Cadence commit `{bank['source']['cadence']}` (build {bank['source']['build']}); Windmill `{bank['source']['windmill']}`",
         f"- {bank['n']} items, at most {bank['source']['perLevel']} for each level of a benchmark; `bank.json` sha256 `{sha}`",
         f"- The blueprint: {bank['blueprint']['source']}. A test has {bank['blueprint']['items']} questions: "
         + ", ".join(f"{c['count']} of {c['name']} ({c['range'][0]}–{c['range'][1]}% of the test)" for c in bank["blueprint"]["categories"]) + ".", "",
         "| Benchmark | Cadence's name | Generators | In the bank | Drawn | Could be asked | Banked | Levels 2 · 3 · 4 · 5 | mc | numeric | select-all | grid | With a figure | Pictures as choices | Left out |",
         "|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|"]
    for code, s in stats.items():
        k = s["kinds"]
        L.append(f"| {code} | {s['label']} | {s['generators']} | {s['asked']} | {s['drawn']} | {s['kept']} | {s['banked']} | {' · '.join(str(n) for n in s['levels'])} | {k.get('mc', 0)} | {k.get('numeric', 0)} | {k.get('ms', 0)} | {k.get('grid', 0)} | {s['figures']} | {s['pictures']} | "
                 + ("; ".join(f"{n} {w}" for w, n in sorted(s["out"].items(), key=lambda kv: -kv[1])) or "none") + (f" (no item of {', '.join(s['leftGens'])} can be asked)" if s["leftGens"] else "") + " |")
    tot = lambda key: sum(s[key] for s in stats.values())
    L += ["", f"Totals: {tot('generators')} generators, {tot('asked')} in the bank; {tot('figures')} items with a figure and {tot('pictures')} whose four choices are pictures.", "",
          "Generators: every generator Cadence has for the benchmark — its regular bank (G), its high-rigor bank (H) and its level banks (L2 to L5). In the bank: those with an item the FAST screen can ask.",
          "Levels: the state achievement level (2 to 5) each item's generator was read at in Cadence (`data/ald_levels_g8.json`, `notes/ALD_LEVELS_G8.md`). A reading, not a measurement. The test adapts by level; a level a benchmark lacks gives its nearest.",
          "Pictures as choices: a \"which graph?\" or \"which number line?\" question whose four choices are each their own picture, cut from Cadence's one figure.",
          "Left out means Cadence drew it and the FAST screen cannot show or check it (see the tool's own notes)."]
    return "\n".join(L) + "\n"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--cadence", required=True); ap.add_argument("--site", required=True)
    ap.add_argument("--course", default="a7", choices=sorted(BLUEPRINT))
    ap.add_argument("--per-level", type=int, default=8, help="items banked for each level of a benchmark, at most")
    ap.add_argument("--least", type=int, default=8, help="fewer than this for a benchmark is a failure")
    ap.add_argument("--cap", type=int, default=12, help="distinct items drawn from one generator at one level, at most")
    ap.add_argument("--budget", type=int, default=1500, help="seeds walked for each of G and H of a benchmark")
    ap.add_argument("--check", action="store_true"); ap.add_argument("--report")
    ap.add_argument("--raw-cache", help="a folder for Cadence's raw draws (reused while Cadence's file and the walk are the same; never by --check)")
    args = ap.parse_args()
    bank, stats, problems = build(args)
    text = json.dumps(bank, ensure_ascii=False, separators=(",", ":")) + "\n"
    sha = hashlib.sha256(text.encode()).hexdigest()
    d = os.path.join(args.site, "released", args.course, "fast-practice")
    if args.report:
        with open(args.report, "w") as f:
            json.dump(stats, f, indent=1)
    for p in problems:
        print("cadence_fast: " + p)
    if problems:
        sys.exit(1)
    if args.check:
        f = os.path.join(d, "bank.json")
        old = open(f, encoding="utf-8").read() if os.path.exists(f) else ""
        # the bank names the commits it was made from; a check compares everything else
        strip = lambda t: re.sub(r'"source":\{"cadence".*?\},"n"', '"n"', t)
        if strip(old) != strip(text):
            sys.exit("cadence_fast --check: the committed bank is not what Cadence gives now")
        print(f"cadence_fast --check: the bank is what Cadence gives ({bank['n']} items)")
        return
    os.makedirs(d, exist_ok=True)
    with open(os.path.join(d, "bank.json"), "w", encoding="utf-8") as f:
        f.write(text)
    with open(os.path.join(d, "BANK.sha256"), "w") as f:
        f.write(f"{sha}  bank.json\n")
    with open(os.path.join(d, "README.md"), "w", encoding="utf-8") as f:
        f.write(readme(bank, stats, sha))
    kinds = collections.Counter(x["type"] for x in bank["items"])
    print(f"cadence_fast: {bank['n']} items for {len(stats)} benchmarks ({dict(kinds)}), {sum(1 for x in bank['items'] if x.get('fig'))} with a figure, "
          f"{sum(1 for x in bank['items'] if x['type'] == 'mc' and isinstance(x['choices'][0], dict))} with pictures as choices; "
          f"{len(text) // 1024} KB → {d}")


if __name__ == "__main__":
    main()
