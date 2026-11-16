#!/usr/bin/env python3
"""tools/cadence_fast.py's own reading, without Cadence or a browser (15 Nov 2026): a slope-intercept key read as (m, b),
and Cadence's two four-part choice figures cut into their four pictures — or left whole when they do not come apart exactly.
    python3 tools/test_cadence_fast.py"""
import importlib.util, os, re, sys
from fractions import Fraction as F
HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location("cadence_fast", os.path.join(HERE, "cadence_fast.py")); cf = importlib.util.module_from_spec(spec); spec.loader.exec_module(cf)
bad = []
def ok(c, m):
    if not c: bad.append(m)

# ---- y = mx + b
for key, want in {"y = 2x + 1": (2, 1), "y = −3x − 6": (-3, -6), "y = x": (1, 0), "y = −2x": (-2, 0), "y = (1/4)x − 2": (F(1, 4), -2), "y = 15x + 40": (15, 40),
                  "y = −x + 3": (-1, 3), "y = −(1/2)x + 3": (F(-1, 2), 3), "y = (−3/4)x": (F(-3, 4), 0), "y = 2.5x + 10": (F(5, 2), 10), "y = 1/3x − 2": (F(1, 3), -2),
                  "y = 2x² + 1": None, "x = 3": None, "y = 3": None, "2y = 4x + 2": None, "y = 2(x + 1)": None, "y = −(−2)x": None, "y = (1/0)x": None}.items():
    ok(cf.slope_intercept(key) == want, f"slope_intercept({key!r}) = {cf.slope_intercept(key)}, wanted {want}")

# ---- the four planes of a "which graph?" figure, as Cadence's figChoicePlanes writes them (a letter, then its plane)
T = lambda x, y, s, size, w: f'<text x="{x}" y="{y}" text-anchor="middle" style="font-family:var(--figf,Arial),Arial,sans-serif;font-size:{size}px;font-weight:{w}" fill="#222">{s}</text>'
def plane(i):
    ox, oy = 12 + (i % 2) * 148, 28 + (i // 2) * 164
    return T(ox + 63, oy - 5, "ABCD"[i], 11, 700) + f'<line x1="{ox + 10}" y1="{oy}" x2="{ox + 10}" y2="{oy + 126}" stroke="#d8d5cd" stroke-width="0.8"/>' \
        + f'<rect x="{ox}" y="{oy}" width="126" height="126" fill="none" stroke="#d8d5cd" stroke-width="1"/>' + T(ox + 20, oy + 70, "2", 9, 400) \
        + f'<line x1="{ox}" y1="{oy + 100 - i}" x2="{ox + 126}" y2="{oy + 20 + i}" stroke="#222" stroke-width="1.8"/>'
quad = '<svg class="fig quad" width="100%" viewBox="0 0 298 340" preserveAspectRatio="xMidYMid meet">' + "".join(plane(i) for i in range(4)) + "</svg>"
item = {"optsP": [f"Graph {L}" for L in "ABCD"], "fig": quad,
        "ft": "four coordinate planes labeled A through D: Graph A is a line through (0, 4) with slope −3; Graph B is a line through (0, −4) with slope −3; Graph C is a line through (0, 4) with slope 3; Graph D is a line through (0, −3) with slope 4"}
pics = cf.split_choices(item)
ok(pics and len(pics) == 4, "four planes are not cut into four pictures")
if pics:
    ok(all(p["svg"].startswith('<svg class="fig" width="100%" viewBox="') and p["svg"].endswith("</svg>") for p in pics), "a part is not an SVG of its own")
    ok([re.search(r'viewBox="(-?[\d.]+) (-?[\d.]+) ([\d.]+) ([\d.]+)"', p["svg"]).groups() for p in pics] == [("8", "24", "134", "134"), ("156", "24", "134", "134"), ("8", "188", "134", "134"), ("156", "188", "134", "134")], "a part's box is not its plane and a margin of 4")
    ok(all(p["svg"].count("<rect") == 1 and "font-weight:700" not in p["svg"] for p in pics), "a part holds another plane, or its letter")
    ok(len({p["svg"] for p in pics}) == 4, "two parts are the same picture")
    ok([p["alt"] for p in pics] == ["Graph A is a line through (0, 4) with slope −3", "Graph B is a line through (0, −4) with slope −3", "Graph C is a line through (0, 4) with slope 3", "Graph D is a line through (0, −3) with slope 4"], "the parts' words are not the figure's own")
    ok("".join(re.sub(r"^<svg[^>]*>|</svg>$", "", p["svg"]) for p in pics) == re.sub(r'<text[^>]*font-weight:700"[^>]*>[A-D]</text>', "", re.sub(r"^<svg[^>]*>|</svg>$", "", quad)), "something of the figure is lost or added by the cut")

# ---- the four number lines of a "which number line?" figure, as Cadence's figNumberLineChoice writes them
def row(i):
    y = 17 + 56 * i
    return T(14, y + 4.5, "ABCD"[i], 13, 700) + f'<line x1="{46 + 24 * i}" y1="{y}" x2="286" y2="{y}" stroke="#b9b4a6" stroke-width="5"/><polygon points="286,{y - 6} 295,{y} 286,{y + 6}" fill="#222"/>' \
        + f'<line x1="46" y1="{y}" x2="286" y2="{y}" stroke="#222" stroke-width="1.5"/>' + T(46, y + 18, "−5", 9, 400) + f'<circle cx="{46 + 24 * i}" cy="{y}" r="5" fill="#fff" stroke="#222" stroke-width="1.8"/>'
nl = '<svg class="fig quad nl" width="100%" viewBox="0 0 312 212" preserveAspectRatio="xMidYMid meet">' + "".join(row(i) for i in range(4)) + "</svg>"
item = {"optsP": [f"Number line {L}" for L in "ABCD"], "fig": nl,
        "ft": "four number lines labeled A through D, each numbered from −5 to 5: Number line A has an open circle at −5 and is shaded to the right; Number line B has an open circle at −4 and is shaded to the right; Number line C has an open circle at −3 and is shaded to the right; Number line D has an open circle at −2 and is shaded to the right"}
pics = cf.split_choices(item)
ok(pics and len(pics) == 4, "four number lines are not cut into four pictures")
if pics:
    ok([re.search(r'viewBox="(-?[\d.]+) (-?[\d.]+) ([\d.]+) ([\d.]+)"', p["svg"]).groups() for p in pics] == [("36.42", "7", "262.58", "34.7"), ("36.42", "63", "262.58", "34.7"), ("36.42", "119", "262.58", "34.7"), ("36.42", "175", "262.58", "34.7")], "a number line's box is not its own row, with the four rows' left and right edges the same")
    ok(all(p["svg"].count("<circle") == 1 and "font-weight:700" not in p["svg"] for p in pics), "a part holds another number line, or its letter")
    ok(pics[2]["alt"] == "Number line C has an open circle at −3 and is shaded to the right", "a number line's words are not the figure's own")

# ---- number lines whose rows reach different ways (an arrow at the left of one, at the right of another): the four
#      pictures still share their left edge and their width, so the tick marks stand under one another
def row2(i):
    y = 17 + 56 * i
    arrow = f'<polygon points="46,{y - 6} 37,{y} 46,{y + 6}" fill="#222"/>' if i % 2 else f'<polygon points="286,{y - 6} 295,{y} 286,{y + 6}" fill="#222"/>'
    return T(14, y + 4.5, "ABCD"[i], 13, 700) + arrow + f'<line x1="46" y1="{y}" x2="286" y2="{y}" stroke="#222" stroke-width="1.5"/>' + T(46, y + 18, "0", 9, 400) + T(286, y + 18, "10", 9, 400) \
        + f'<circle cx="{142 + 24 * i}" cy="{y}" r="5" fill="#222"/>'
nl2 = '<svg class="fig quad nl" width="100%" viewBox="0 0 312 212" preserveAspectRatio="xMidYMid meet">' + "".join(row2(i) for i in range(4)) + "</svg>"
pics2 = cf.split_choices({"optsP": [f"Number line {L}" for L in "ABCD"], "fig": nl2, "ft": ""})
ok(pics2 and len({re.search(r'viewBox="([\d.]+) [\d.]+ ([\d.]+) ([\d.]+)"', p["svg"]).groups() for p in pics2}) == 1, "number lines that reach different ways are not cut to one left edge and one size")
ok(pics2 and re.search(r'viewBox="([\d.]+) ', pics2[0]["svg"]).group(1) == "33", "the shared left edge is not the farthest arrow's, less the margin")

# ---- parts that stand close together (line graphs with their axis numbers outside): a smaller margin, never the neighbor
def graph(i, gap):
    ox, oy = 14 + (i % 2) * (130 + gap), 30 + (i // 2) * 160
    return T(ox + 60, oy - 6, "ABCD"[i], 11, 700) + f'<line x1="{ox}" y1="{oy}" x2="{ox}" y2="{oy + 120}" stroke="#222" stroke-width="1.2"/><line x1="{ox}" y1="{oy + 120}" x2="{ox + 120}" y2="{oy + 120}" stroke="#222" stroke-width="1.2"/>' \
        + f'<text x="{ox - 3}" y="{oy + 4}" text-anchor="end" style="font-family:Arial;font-size:9px" fill="#222">10</text>' + T(ox + 125, oy + 123, "x", 9, 400) \
        + f'<polyline points="{ox + 10},{oy + 100 - 10 * i} {ox + 60},{oy + 40} {ox + 110},{oy + 20 + 10 * i}" fill="none" stroke="#222" stroke-width="1.8"/>'
close = lambda gap: {"optsP": [f"Graph {L}" for L in "ABCD"], "ft": "", "fig": '<svg class="fig quad" width="100%" viewBox="0 0 300 330" preserveAspectRatio="xMidYMid meet">' + "".join(graph(i, gap) for i in range(4)) + "</svg>"}
near = cf.split_choices(close(16))
ok(near and len(near) == 4, "four graphs standing close together are not cut")
if near:
    vb = [tuple(float(v) for v in re.search(r'viewBox="(-?[\d.]+) (-?[\d.]+) ([\d.]+) ([\d.]+)"', p["svg"]).groups()) for p in near]
    ok(len({(v[2], v[3]) for v in vb}) == 1, "close graphs are not one size")
    ok(vb[0][0] + vb[0][2] <= 14 + 146 - 3 - 0.62 * 18 + 0.01 and vb[1][0] >= 14 + 125 + 0.31 * 9 - 0.01, "a close graph's picture reaches into its neighbor's numbers, or loses its own x")
    ok(vb[0][0] < 0 and vb[0][0] > -4.2, "a part at the figure's edge does not keep its margin")
    ok(abs(vb[0][0] + vb[0][2] - vb[1][0]) < 0.011, "close graphs' pictures do not meet half way between them")
ok(cf.split_choices(close(2)) is None, "graphs whose drawings run into each other were cut")
# parts of two sizes: the four pictures take the larger size, and a smaller part's picture then reaches its neighbor
uneven = close(16)["fig"]
for L in "BD":      # the right-hand graphs carry a long word at their left, so they are wider than the left-hand ones
    k = uneven.index(f">{L}</text>"); k2 = uneven.index("<line", k)
    x = float(re.search(r'<line x1="([\d.]+)"', uneven[k2:]).group(1)); y = float(re.search(r'<line x1="[\d.]+" y1="([\d.]+)"', uneven[k2:]).group(1))
    uneven = uneven[:k2] + f'<text x="{x - 3}" y="{y + 60}" text-anchor="end" style="font-family:Arial;font-size:9px" fill="#222">10</text>' + uneven[k2:]
ok(cf.split_choices({**close(16), "fig": uneven}) is not None, "graphs with one more number at the left are not cut")
wide = uneven
for L in "BD":
    k = wide.index(f">{L}</text>"); k2 = wide.index("<polyline", k)
    x = float(re.search(r'<polyline points="([\d.]+),', wide[k2:]).group(1)); y = float(re.search(r'<polyline points="[\d.]+,([\d.]+)', wide[k2:]).group(1))
    wide = wide[:k2] + f'<line x1="{x + 100}" y1="{y}" x2="{x + 140}" y2="{y}" stroke="#222" stroke-width="1"/>' + wide[k2:]
wide = wide.replace('viewBox="0 0 300 330"', 'viewBox="0 0 340 330"')
ok(cf.split_choices({**close(16), "fig": wide}) is None, "pictures of the larger part's size were cut though a smaller part's picture then shows its neighbor")
ok(cf.split_choices({**close(16), "fig": close(16)["fig"].replace('viewBox="0 0 300 330"', 'viewBox="0 0 280 330"')}) is None, "a part that Cadence's own figure cuts off was shown further")
ok(cf.split_choices({**close(16), "fig": close(16)["fig"].replace("<polyline", '<g transform="translate(2,0)"></g><polyline', 1)}) is None, "a part with a group or a transform was cut by guesswork")
ok(cf.split_choices({**close(16), "fig": close(16)["fig"].replace("<polyline", '<path d="M 20 40 C 30 10, 60 10, 70 40" fill="none" stroke="#222"/><polyline', 1)}) is None, "a part with a curve command was cut by guesswork")
ok(cf.part_box('<line x1="1" y1="2" x2="30" y2="40" stroke="#222"/><circle cx="50" cy="50" r="5" fill="#222"/>') == (1.0, 2.0, 55.0, 55.0) and cf.part_box("") is None and cf.part_box('<line x1="1" y1="2" x2="3" y2="4"/>stray') is None, "part_box does not measure plain shapes, or measures what is not one")

# ---- what must stay whole: other choices, a figure whose letters are not A B C D in order, a figure with a part missing
ok(cf.split_choices({"optsP": ["4", "5", "6", "7"], "fig": quad, "ft": ""}) is None, "a choice of numbers was cut")
ok(cf.split_choices({"optsP": [f"Graph {L}" for L in "ABCD"], "fig": quad.replace(">B</text>", ">D</text>", 1), "ft": ""}) is None, "a figure lettered A D C D was cut")
ok(cf.split_choices({"optsP": [f"Graph {L}" for L in "ABCD"], "fig": quad.replace('<rect x="160"', '<circle x="160"'), "ft": ""}) is None, "a figure with a shape that cannot be measured was cut")
ok(cf.split_choices({"optsP": [f"Graph {L}" for L in "ABCD"], "fig": nl, "ft": ""}) is None, "number lines were cut as graphs")
ok(cf.split_choices({"optsP": [f"Number line {L}" for L in "ABCD"], "fig": None, "ft": ""}) is None, "an item with no figure was cut")
no_words = cf.split_choices({"optsP": [f"Graph {L}" for L in "ABCD"], "fig": quad, "ft": "four graphs"})
ok(no_words and [p["alt"] for p in no_words] == ["Graph A", "Graph B", "Graph C", "Graph D"], "a figure whose description has no four parts does not fall back to the choices' names")

# ---- one generator at a time
pool = [{"src": s, "gen": g, "seed": k, "lv": 3} for s, g, n in (("G", 0, 9), ("G", 2, 1), ("H", 1, 5), ("L3", 0, 9)) for k in range(n)]
got = cf.choose(pool, 8)
ok([(x["src"], x["gen"]) for x in got] == [("G", 0), ("G", 2), ("H", 1), ("L3", 0), ("G", 0), ("H", 1), ("L3", 0), ("G", 0)], "choose does not take one generator at a time: " + str([(x["src"], x["gen"], x["seed"]) for x in got]))
ok(len(cf.choose(pool[:3], 8)) == 3, "choose invents items")

# ---- tools/cadence_bank.py: Cadence 29.28's drawn "which number line?" choice becomes a graph the student builds
cb = cf.cb
drawn = {"rt": "mc", "key": 2, "opts": [f"Number line {L}" for L in "ABCD"], "fig": nl, "ft": item["ft"],
         "qS": ["Solve the inequality.<br><br>", ["-0.75t \\le 1.5", 1], "<br><br>Which number line shows the solution?"], "qP": "Solve the inequality.\n\n−0.75t ≤ 1.5\n\nWhich number line shows the solution?"}
g, kept = cb.mc_nline(drawn)
ok(g and not kept and g["part"] == {"type": "nline", "line": {"lo": "-5", "st": "1", "n": 10}, "graph": {"c": "-3", "closed": False, "dir": "right"}, "key": "Open dot at -3, arrow right", "label": "Graph the solution on the number line.", "v": "t"},
   "a drawn number-line choice is not read as the graph to build: " + str(g))
ok(g and g["qP"] == "Solve the inequality.\n\n−0.75t ≤ 1.5" and not any("Which number line" in x for x in g["qS"] if isinstance(x, str)), "the stem keeps its question")
ok(cb.choice_lines(drawn)[2][3] == (False, "−2", "right") and cb.choice_lines({**drawn, "opts": ["A", "B", "C", "D"]}) is None and cb.choice_lines({**drawn, "ft": "four number lines"}) is None, "choice_lines reads something that is not a drawn choice")
old_form = {"rt": "mc", "key": 1, "opts": ["Open circle at 7, shaded to the right", "Open circle at 7, shaded to the left", "Closed circle at 7, shaded to the left", "Open circle at 8, shaded to the left"], "fig": None, "ft": "",
            "qS": ["Solve the inequality.<br><br>", ["3x - 5 < 16", 1], "<br><br>Which number line shows the solution set?"], "qP": "Solve the inequality.\n\n3x − 5 < 16\n\nWhich number line shows the solution set?"}
g2, _ = cb.mc_nline(old_form)
ok(g2 and g2["part"]["graph"] == {"c": "7", "closed": False, "dir": "left"} and g2["part"]["line"] == {"lo": "2", "st": "1", "n": 10}, "the described choices of Cadence 29.27 and earlier are no longer read")
ok(cb.mc_nline({**drawn, "opts": ["4", "5", "6", "7"]}) == (None, None), "a choice of numbers is read as a graph")
ok(cb.strip_choice_letter([["Divide both sides by −0.75."], ["A closed circle at −2 shows that −2 is included, and the shading goes to the right. That is number line D."]]) == [["Divide both sides by −0.75."], ["A closed circle at −2 shows that −2 is included, and the shading goes to the right."]], "the solution keeps its number line's letter")
ok(cb.strip_choice_letter([[["x \\le 2", 0], " That is number line B."]]) == [[["x \\le 2", 0]]], "a last sentence that is only the letter is not dropped")

if bad:
    print("test_cadence_fast: FAILED\n  " + "\n  ".join(bad)); sys.exit(1)
print("test_cadence_fast: the slope-intercept reader (18 keys), pictures as choices (planes, number lines, close graphs, what stays whole), one generator at a time, a drawn choice built as a graph (cadence_bank): all pass")
