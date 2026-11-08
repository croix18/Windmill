#!/usr/bin/env python3
"""Cadence → the practice pages' lesson banks (7 Nov 2026).

Croix: "instead of having the entire practice test, the days should have practice questions directly from that day's
lessons" and "have it pull Cadence questions … Cadence already tracks by unit and lesson"; told the figures need rendering
support: "Can you provide rendering support?"

    python3 tools/cadence_bank.py --cadence ../cadence --m7 ../windy-hill-m7 --a7 ../croix18-windy-hill-a7 \
        [--units m7:4,8,9,10 a7:3,4,5,6] [--n 60] [--raw-cache DIR] [--check] [--report FILE]

For every published unit of each course it opens Cadence (its one file, cadence.html) in headless Chrome and calls its own
functions in the page: MNU (the Math Nation units and lessons of the course's tier — "Grade 7" is `on`, "Grade 7
Accelerated" is `acc`), upCodes / upFocus / upPred (a lesson's benchmarks and its focus inside them, data/lesson_focus.json,
exactly as Cadence's own "Print unit" worksheets use them), hasRigor, and drawItem(code, hr, seed) — one item: the seed picks
the generator and every number in it, so the same three values always give the same item. Seeds are walked from 0, so the
same Cadence commit gives the same bank, byte for byte. Every string is cut into prose and math by Cadence's own converter
(CTEX.segments, tools/tex/tex.js) — the math as the TeX Cadence hands KaTeX, the prose and tables as Cadence's HTML — and
every figure is Cadence's SVG, verbatim. It writes, in the course repository:

    <course>/practice/uN/bank/cadence.json   per Cadence lesson of the unit's plan days, N distinct items (target 60: 45 regular
                                             then 15 high rigor where the lesson's skill has a rigor bank; regular items fill a
                                             short rigor bank). Fewer than 20 is a FAILURE: reported, exit 1, never silent.
    <course>/practice/uN/bank/map.json       every lesson code of the unit on the plan (Windmill's spine) → its Cadence lessons,
                                             status `cadence` or `whole-unit` with the reason (a review day, a test day, a day
                                             without a lesson, a title that does not agree, too few items); the days without a
                                             code; and Cadence's lessons of the unit that no day of the plan teaches.
    <course>/practice/uN/bank/BANK.sha256    the two files' hashes (the kit's build checks them)
    <course>/practice/uN/bank/README.md      how and when it was made, from which Cadence commit, what was left out and why

What is added to Cadence's item is only how a page CHECKS an answer. A choice item keeps Cadence's options and key; a
select-all its keys; a matching grid becomes one choice per row. A free answer is read into parts — one box per claim the key
makes ("shorter base 11 cm; longer base 16 cm" is two boxes; "Step 3; the correct expression is …" is a choice of step and
a box) — each with its type (number / expression / equation / inequality / sci / select), the key as a student would type it,
the other forms Cadence's key itself accepts ("(or 4.75)", "(28.00 also accepted)"), the unit after the box, the precision the
stem names, and whether "an equivalent equation / inequality / expression" is allowed. A key the page cannot check — an
explanation in words, a graph to draw — is left out and counted by kind in the report and the bank's README; the walk then
draws further seeds, so the lesson still gets its N.

Ruling 43 (a practice problem never repeats what a lesson already showed, nor the paper test): an item whose stem holds a
piece of mathematics — an expression with an operation, or a number of three or more significant digits — that the unit's
lessons show (warm-ups, notes, examples, vocabulary, questions asked aloud) or its paper test prints (build/uN/*.py) is left
out and counted.

--check rebuilds in memory and exits 1 if a committed bank differs (a Cadence change, or this tool's)."""
import argparse, datetime as dt, difflib, hashlib, importlib.util, json, os, re, subprocess, sys

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
COURSES = {"m7": {"tier": "on", "tierName": "Grade 7", "spine": "on", "dir": "m7", "code": "M7", "repoArg": "m7"},
           "a7": {"tier": "acc", "tierName": "Grade 7 Accelerated", "spine": "acc", "dir": "a7", "code": "A7", "repoArg": "a7"}}
DEFAULT_UNITS = {"m7": [4, 8, 9, 10], "a7": [3, 4, 5, 6]}
FLOOR = 20
SCHEMA = 1

# ------------------------------------------------------------------------------------------------ the page side
# Cadence's own functions, called in its page. keyOf is Cadence's own sameness key (upLessonSet / buildProblem).
EXPORT_JS = r'''([course, ids, cap, budget]) => {
  setCourseFilter(course);
  const byId = {};
  for (const u of MNU[course].units) for (const l of u.l) byId[l[0]] = {u: u.u, l};
  const keyOf = (c, p) => `${c}::${p.q}::${p.ft || ""}::${p.opts ? [...p.opts].sort().join("|") : p.rows ? p.rows.join("|") : ""}`;
  const seg = (s, o) => CTEX.segments(String(s == null ? "" : s), o || {}).map(g => g.math ? [g.tex, g.display ? 1 : 0] : g.text);
  const out = {};
  for (const id of ids) {
    const rec = byId[id]; if (!rec) { out[id] = null; continue; }
    const l = rec.l, codes = upCodes(l), focus = upFocus(id);
    const R = {id, unit: rec.u, title: l[1], codes, why: focus ? (focus.why || "") : "", labels: {}, rigor: {}, items: []};
    codes.forEach(c => { R.labels[c] = (STD[c] && STD[c].l) || ""; R.rigor[c] = !!hasRigor(c); });
    for (const hr of [false, true]) for (const c of codes) {
      if (hr && !hasRigor(c)) continue;
      const pred = upPred(focus, c), seen = new Set(); let n = 0;
      for (let s = 0; s < budget && n < cap; s++) {
        const p = drawItem(c, hr, s); if (!p) continue;
        if (pred && !pred(p)) continue;
        const k = keyOf(c, p); if (seen.has(k)) continue; seen.add(k); n++;
        const it = {c, hr, s, gi: p._genIdx, k, rt: p.rt || "ee", q: p.q, a: p.a, sol: p.s || "", fig: p.fig || null, ft: p.ft || "",
          qS: seg(String(p.q).replace(/\n/g, "<br>"), {display: true}), qP: plain(p.q), aP: plain(p.a),
          solS: String(p.s || "").split("\n").filter(x => x.trim()).map(x => seg(x))};
        if (p.inst) it.instS = seg(p.inst);
        if (p.opts) { it.opts = p.opts; it.optsS = p.opts.map(o => seg(o)); it.optsP = p.opts.map(o => plain(o)); it.key = p.key; }
        if (p.rt === "match") { it.cols = p.cols; it.rows = p.rows; it.key = p.key; it.colsS = p.cols.map(x => seg(x)); it.rowsS = p.rows.map(x => seg(x)); }
        R.items.push(it);
      }
    }
    out[id] = R;
  }
  return out;
}'''
SEG_JS = r'''(list) => list.map(s => CTEX.segments(String(s), {}).map(g => g.math ? [g.tex, g.display ? 1 : 0] : g.text))'''
META_JS = r'''() => ({build: typeof BUILD !== "undefined" ? BUILD : null, units: MNU})'''


class Cadence:
    """Cadence's own page, in headless Chrome. Nothing is fetched: every request off file: and data: is refused."""
    def __init__(self, path):
        from playwright.sync_api import sync_playwright
        self.pw = sync_playwright().start()
        self.b = self.pw.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
        self.p = self.b.new_page()
        self.errors = []
        self.p.on("pageerror", lambda e: self.errors.append(str(e)))
        self.p.route("**/*", lambda r: r.continue_() if r.request.url.startswith(("file:", "data:")) else r.abort())
        self.p.goto("file://" + os.path.abspath(path))
        self.p.wait_for_function("typeof drawItem === 'function' && typeof CTEX === 'object' && typeof MNU === 'object' && typeof upLessonSet === 'function'")
        if self.errors:
            sys.exit("cadence_bank: Cadence's page threw on load: " + self.errors[0])

    def export(self, course, ids, cap, budget):
        return self.p.evaluate(EXPORT_JS, [course, ids, cap, budget])

    def segs(self, strings):
        out = []
        for i in range(0, len(strings), 2000):
            out += self.p.evaluate(SEG_JS, strings[i:i + 2000])
        return out

    def meta(self):
        return self.p.evaluate(META_JS)

    def close(self):
        self.b.close(); self.pw.stop()


# ------------------------------------------------------------------------------------------------ reading a key
MINUS = "−"
SUPMAP = str.maketrans("⁰¹²³⁴⁵⁶⁷⁸⁹⁻", "0123456789-")


def typed(s):
    """Cadence's key text → what a student types: <sup>n</sup> → ^n, √<span class="rad">72</span> → √72, the repeating bar
    dropped (never a typed key), tags gone, U+2212 → -, × kept (the normaliser reads it), spaces collapsed."""
    s = str(s)
    s = re.sub(r"<sup>(.*?)</sup>", lambda m: "^" + (m.group(1) if re.fullmatch(r"\d+", m.group(1)) else "(" + m.group(1) + ")"), s)
    s = re.sub(r'√<span class="rad">(.*?)</span>', lambda m: "√" + (m.group(1) if re.fullmatch(r"\d+", m.group(1)) else "(" + m.group(1) + ")"), s)
    s = re.sub(r"<[^>]+>", "", s)
    s = s.replace("&lt;", "<").replace("&gt;", ">").replace("&amp;", "&").replace("&nbsp;", " ")
    s = s.replace(MINUS, "-").replace(" ", " ").replace(" ", " ")
    return re.sub(r"\s+", " ", s).strip()


UNIT_WORDS = r"(?:square |cubic )?(?:centimeters?|meters?|millimeters?|kilometers?|inches|inch|feet|foot|yards?|miles?|units?|grams?|kilograms?|pounds?|ounces?|liters?|milliliters?|gallons?|quarts?|cups?|seconds?|minutes?|hours?|days?|weeks?|years?|degrees?|people|students|times|complete turns|turns|boxes|rounds|bags|tickets|laps|pages|cars|rides|games|songs|shirts|rows|trips|fills|batches|servings|calories|points|dollars|cents|pesos|euros|yen|pounds sterling)(?: per (?:hour|minute|second|day|week|pound|ounce|gallon|liter|meter|foot|yard|mile|kilogram|gram|person))?"
UNIT_ABBR = r"(?:cm|mm|km|m|in\.|in|ft|yd|mi|g|kg|mg|lb|oz|L|mL|mph|km/h|°F|°C|°)(?:²|³|\^2|\^3)?"
NUMRE = r"-?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?(?: \d+/\d+)?(?:/\d+)?"
EXPR_CH = r"[0-9A-Za-zπ√^()+\-*/×÷·. ]"


def precision_of(stem):
    m = re.search(r"nearest (whole number|one|tenth|hundredth|thousandth|cent|dollar|whole|percent|degree|inch|foot|centimeter|meter)", stem, re.I)
    if not m:
        return None
    return {"whole number": 1, "one": 1, "whole": 1, "dollar": 1, "percent": 1, "degree": 1, "inch": 1, "foot": 1, "centimeter": 1,
            "meter": 1, "tenth": 0.1, "hundredth": 0.01, "cent": 0.01, "thousandth": 0.001}[m.group(1).lower()]


def strip_unit(s, stem=""):
    """'100.53 feet' → ('100.53', 'feet'); '45 m²' → ('45', 'm²'); '$14.70' → ('$14.70', ''); '2 packs' → ('2', 'packs') when the
    stem says packs"""
    s = s.strip()
    if not re.search(r"\bin\.$", s):
        s = s.rstrip(".")
    m = re.match(r"^(\$?" + NUMRE + r"|[\dπ.]+π|\d[\d.]*\s*[×x]\s*10\^\(?-?\d+\)?)\s+([A-Za-z][A-Za-z\-]*(?: [A-Za-z][A-Za-z\-]*){0,3})$", s)
    if m and stem:
        w = m.group(2)
        stem_l = stem.lower()
        root = lambda x: re.sub(r"(es|s)$", "", x.lower())
        if all(root(x) in stem_l for x in w.split(" ")) or re.fullmatch(UNIT_WORDS, w):
            return m.group(1), w
    m = re.match(r"^(.*?\S)\s+(" + UNIT_WORDS + r")$", s)
    if m and not re.search(r"[A-Za-z]{2,}", m.group(1).replace("π", "")):
        return m.group(1), m.group(2)
    m = re.match(r"^(.*?[\dπ)])\s*(" + UNIT_ABBR + r")$", s)
    if m and not re.search(r"[A-Za-z]{2,}", m.group(1)):
        u = m.group(2).replace("^2", "²").replace("^3", "³")
        return m.group(1), u
    return s, ""


def classify(v):
    """the type of one value a student types"""
    t = v.replace(" ", "")
    if re.fullmatch(r"\$?-?[\d,]*\.?\d+(?: ?\d+/\d+)?%?", v.replace(" ", "", 0)) or re.fullmatch(r"\$?" + NUMRE + "%?", v):
        return "number"
    if re.fullmatch(r"-?\d+(\.\d+)?\s*[×x*]\s*10\^\(?-?\d+\)?", v):
        return "sci"
    if re.search(r"(<=|>=|<|>|≤|≥)", v):
        return "inequality"
    if "=" in v:
        return "equation"
    if re.fullmatch(EXPR_CH + "+", t.replace("×", "*")):
        return "expression"
    return None


class Unreadable(Exception):
    pass


def value_part(v, stem, label="", pre=""):
    """one claim that is a value: '28 feet', 'about 23.9 miles per hour', 'x = 3.9', '(3/2)x − 13', '$14.70', '42°'"""
    v = v.strip().rstrip(".").strip()
    alts = []
    m = re.match(r"^(.*?\S)\s+\((?:or (.+?)|(.+?) also accepted)\)$", v)      # "4 3/4 (or 4.75)", "28 (28.00 also accepted)"
    if m and not re.search(r"equivalent", m.group(2) or m.group(3)):
        v, alt = m.group(1).strip(), (m.group(2) or m.group(3)).strip()
        if re.fullmatch(r"[-\d., /]+", alt):
            alts.append(alt)
        elif not re.fullmatch(r"-?\d+\.\d+", alt):                                     # a repeating decimal written out: not a key
            pass
    about = False
    if v.lower().startswith("about "):
        v, about = v[6:].strip(), True
    v, unit = strip_unit(v, stem)
    money = v.startswith("$") or v.startswith("-$")
    percent = v.endswith("%")
    deg = False
    if re.search(r"\d°$", v):
        v, unit, deg = v[:-1], "°", True
    if unit and unit.endswith("°") and unit != "°":
        pass
    vv = v.replace("$", "")
    var = ""
    mv = re.fullmatch(r"([A-Za-z])\s*=\s*(.+)", vv)
    if mv and classify(mv.group(2)) in ("number", "sci", "expression") and not re.search(r"[A-Za-z]", mv.group(2).replace("π", "")):
        var, vv = mv.group(1), mv.group(2)
    ty = classify(vv)
    if ty is None:
        raise Unreadable("words")
    if ty == "number" and re.search(r"[A-Za-z]", vv):
        raise Unreadable("words")
    if ty in ("expression", "equation", "inequality") and re.search(r"[A-Za-z]{2,}", vv.replace("π", "").replace("√", "")):
        raise Unreadable("words")
    if ty == "expression" and "π" in vv and re.fullmatch(r"[\d.,/ ]*π", vv.replace(" ", "")):
        ty = "number" if False else "expression"
    part = {"type": ty, "key": vv, "alts": alts}
    if var:
        part["pre"] = var + " ="
    if pre:
        part["pre"] = pre
    if unit:
        part["unit"] = unit
    if money:
        part["money"] = True
    if percent:
        part["percent"] = True
    p = precision_of(stem)
    if p and ty == "number" and not re.search(r"/", vv):
        part["precision"] = p
    elif about and ty == "number" and re.search(r"\.\d", vv):
        part["precision"] = 10 ** -len(vv.split(".")[1])
    elif about and ty == "number" and not re.search(r"\.", vv):
        part["precision"] = None
    if label:
        part["label"] = label
    if money and not part.get("pre"):
        part["pre"] = "$"
    part["form"] = form_label(part, stem)
    # a monomial over a monomial, "3/a^5b^4": the key as written binds left to right, so the grouped form is the key
    if ty == "expression" and re.fullmatch(r"-?\d+/[A-Za-z](\^\(?-?\d+\)?)?([A-Za-z](\^\(?-?\d+\)?)?)+", vv.replace(" ", "")):
        num, den = vv.replace(" ", "").split("/", 1)
        part["key"] = num + "/(" + den + ")"
        part["alts"] = part["alts"] + [vv]
    return part


def form_label(part, stem):
    """the quiet line over a box: what form the stem asks for, only where the stem or the key says it"""
    t, key = part["type"], part["key"]
    if t == "sci":
        return "In scientific notation"
    if "π" in key and t == "expression":
        return "In terms of π"
    m = re.search(r"nearest (whole number|tenth|hundredth|thousandth|cent)", stem, re.I)
    if part.get("precision") and m:
        return "To the nearest " + m.group(1).lower()
    if re.search(r"\bas a mixed number\b", stem, re.I) and re.fullmatch(r"-?\d+ \d+/\d+", key):
        return "As a mixed number"
    if re.search(r"\bas a fraction\b", stem, re.I) and re.fullmatch(r"-?\d+/\d+", key):
        return "As a fraction"
    if re.search(r"\bas a (single )?power\b", stem, re.I) and "^" in key:
        return "As a single power" if re.search(r"single power", stem, re.I) else "As a power"
    if t == "inequality":
        return "As an inequality"
    return ""


def select_part(answer, options, label):
    if answer not in options:
        raise Unreadable("select")
    return {"type": "select", "opts": options, "key": options.index(answer), "label": label}


STEPRE = re.compile(r"\bStep (\d+)\b")


def steps_in(stem):
    n = [int(x) for x in STEPRE.findall(stem)]
    if not n:
        raise Unreadable("select")
    return ["Step %d" % i for i in range(1, max(n) + 1)]


def read_key(item):
    """Cadence's key → {parts, dropped} or raise Unreadable(kind). Each part: type, key (typed form), alts, unit, pre,
    precision, money, percent, equiv ('equation'|'inequality'|'expression' when Cadence allows an equivalent one), label."""
    a = typed(item["a"])
    stem = item["qP"]
    a = re.sub(r"\s*Score:.*$", "", a).strip()
    dropped = []
    # an explanation is not a key a page can check
    if re.search(r"\b(because|which is an approximation|any correct|explain|description|graph of|straight line through|reason)\b", a, re.I):
        raise Unreadable("explanation")
    claims = [c.strip() for c in re.split(r";\s+", a) if c.strip()]
    claims = [c if re.search(r"\bin\.$", c) else c.rstrip(".").strip() for c in claims]
    parts = []

    def eqv(c):
        e = "equation" if re.search(r"\(or an equivalent equation\)", c) else "inequality" if re.search(r"\(or an equivalent inequality", c) else ""
        c = re.sub(r"\s*\(or an equivalent (equation|inequality)[^)]*\)", "", c).strip()
        return c, e

    for i, c in enumerate(claims):
        c0 = c
        m = re.match(r"^(.*?),\s+so\s+(.*)$", c)                      # "c = −1.3, so the diver went down 1.3 meters each minute"
        if m:
            c = m.group(1); dropped.append(m.group(2))
        c, e = eqv(c)
        if re.match(r"(it simplifies to|its price per \w+ is (lower|higher)|the (ride|trip|walk|job|plan|rental) (was|is) )", c):
            dropped.append(c); continue                          # a reason or a restatement of a box already asked for
        m = re.fullmatch(r"rewrite it as (.+?)(?: \(or any expression equivalent to .*\))?", c)
        if m:
            p = value_part(m.group(1), stem, label="Rewrite it as"); p["equiv"] = "expression"; parts.append(p); continue
        m = re.fullmatch(r"(Expression [1-9])", c)
        if m:
            opts = sorted(set(re.findall(r"\bExpression [1-9]\b", stem)))
            parts.append(select_part(m.group(1), opts, "Which expression?")); continue
        m = re.fullmatch(r"((?:One|Two|Three|Four) \d+-inch pizzas?), by (.+)", c)
        if m:
            opts = [x[0].upper() + x[1:] for x in re.findall(r"\b((?:one|two|three|four) \d+-inch pizzas?)\b", stem)]
            parts.append(select_part(m.group(1), opts, "Which choice has more pizza?"))
            parts.append(value_part(m.group(2), stem, label="How many more square inches?")); continue
        m = re.fullmatch(r"(lower|higher|cheaper|more) by (.+)", c)
        if m:
            parts.append(value_part(m.group(2), stem, label=m.group(1).capitalize() + " by")); continue
        m = re.fullmatch(r"(Yes|No)", c)
        if m:
            parts.append(select_part(m.group(1), ["Yes", "No"], "Yes or no?")); continue
        m = re.fullmatch(r"(Step \d+)", c)
        if m:
            parts.append(select_part(m.group(1), steps_in(stem), "Which step has the first error?")); continue
        m = re.fullmatch(r"the first error is in (Step \d+)", c)
        if m:
            parts.append(select_part(m.group(1), steps_in(stem), "Which step has the first error?")); continue
        m = re.fullmatch(r"the correct (value|expression|answer|single power|equation|sum|difference|product|quotient) is (.+)", c)
        if m:
            parts.append(value_part(m.group(2), stem, label="The correct " + m.group(1))); continue
        m = re.fullmatch(r"((?:Plot|Store|Gym|Plan|Option|Company|Shop|Garden|Pool|Box|Tank|Rug|Room|Expression|Card|Phone|Bakery|Brand|Pizza|Team|Class|Car|Truck|Bike|Map|Model|Photo|Print|Poster|Field|Park|Lot|Path|Table|Graph|Equation|Student|Machine|Pump|Printer|Runner|Bus|Train|Plane|Recipe|Account|Bank|Job|School|Club|Farm|Factory|Tile) [A-Z1-9])(?:,| has the lower price\.?|)(?: by (.+))?", c)
        if m:
            nm = m.group(1).split(" ")[0]
            opts = sorted(set(re.findall(r"\b" + nm + r" [A-Z1-9]\b", stem)))
            if len(opts) < 2:
                raise Unreadable("select")
            parts.append(select_part(m.group(1), opts, "Which " + nm.lower() + "?"))
            if m.group(2):
                parts.append(value_part(m.group(2), stem, label="By how much?"))
            continue
        m = re.fullmatch(r"(.+?) \((" + "|".join(["Plot", "Store", "Gym", "Plan", "Option", "Company", "Shop"]) + r") ([A-Z1-9]) has the lower price\)", c)
        if m:
            nm = m.group(2)
            opts = sorted(set(re.findall(r"\b" + nm + r" [A-Z1-9]\b", stem)))
            if len(opts) < 2:
                raise Unreadable("select")
            parts.append(select_part(nm + " " + m.group(3), opts, "Which " + nm.lower() + " has the lower price?"))
            parts.append(value_part(m.group(1), stem, label="How much is saved?"))
            continue
        m = re.fullmatch(r"graph: (open|closed) circle at (\S+), shaded to the (left|right)", c)
        if m:
            at = m.group(2)
            # 7 Nov 2026 (Croix: "make them graph inequalities with an open or closed dot and an arrow instead of just
            # describing them"): the student builds the graph on Cadence's own blank number line (kit kind nline) — when that
            # line can be read exactly from Cadence's figure; otherwise the four described graphs stay a choice, counted
            nl = nline_part(item, m.group(1) == "closed", at, m.group(3), parts)
            if nl:
                parts.append(nl); continue
            NLINE_KEPT[0] += 1
            opts = [f"{oc} circle at {at}, shaded to the {lr}" for oc in ("Open", "Closed") for lr in ("left", "right")]
            parts.append(select_part(f"{m.group(1).capitalize()} circle at {at}, shaded to the {m.group(3)}", opts, "Which graph?")); continue
        m = re.fullmatch(r"(?:the )?(?:longest straight line inside the box|distance|length|answer) is about (.+)", c)
        if m:
            parts.append(value_part("about " + m.group(1), stem, label=c.split(" is about")[0][0].upper() + c.split(" is about")[0][1:])); continue
        m = re.fullmatch(r"simplified: (.+)", c)
        if m:
            if parts and parts[-1]["type"] == "expression" and not parts[-1].get("label"):
                parts[-1].update(label="Expression", equiv="expression")    # "a correct … expression": any equivalent form
            parts.append(value_part(m.group(1), stem, label="Simplified")); continue
        m = re.fullmatch(r"both expressions simplify to (.+)", c)
        if m:
            parts.append(value_part(m.group(1), stem, label="Both simplify to")); continue
        m = re.fullmatch(r"the first expression simplifies to (.+) and the second to (.+)", c)
        if m:
            parts.append(value_part(m.group(1), stem, label="The first simplifies to"))
            parts.append(value_part(m.group(2), stem, label="The second simplifies to")); continue
        m = re.fullmatch(r"the (least|greatest) number of (\w+) (?:is|that \w+ is) (\d+)", c)
        if m:
            parts.append(value_part(m.group(3), stem, label=f"The {m.group(1)} number of {m.group(2)}")); continue
        m = re.fullmatch(r"([a-z]{3,}(?: [a-z\-]{2,}){0,3}) (\$?" + NUMRE + r"(?: [A-Za-z²³.]+(?: [a-z]+)*)?(?: \([\d.]+ also accepted\))?)", c)   # "shorter base 11 cm", "area 100.48 square feet"
        if m and not re.match(r"^(about|or|and|the)$", m.group(1)):
            parts.append(value_part(m.group(2), stem, label=m.group(1)[0].upper() + m.group(1)[1:])); continue
        m = re.fullmatch(r"(\$?" + NUMRE + r") left", c)
        if m:
            parts.append(value_part(m.group(1), stem, label="Left over"))
            if len(parts) == 2 and not parts[0].get("label"):
                parts[0]["label"] = "Cost"
            continue
        m = re.fullmatch(r"(.+?) and (.+?)", c)                        # "42° and 30°"
        if m and len(claims) == 1 and classify(typed(m.group(1)).rstrip("°")) == "number" and classify(m.group(2).rstrip("°")) == "number":
            p1 = value_part(m.group(1), stem); p2 = value_part(m.group(2), stem)
            parts += [dict(p1, label="First"), dict(p2, label="Second")]; continue
        p = value_part(c, stem)
        if e:
            p["equiv"] = e
            if p["type"] not in ("equation", "inequality"):
                raise Unreadable("words")
            if e == "equation":
                p["form"] = "An equation"
        parts.append(p)
    if not parts:
        raise Unreadable("empty")
    # a lone value with "(or an equivalent …)" handled above; "the expression (or any expression equivalent to …)"
    if re.search(r"any expression equivalent", item["a"]):
        for p in parts:
            if p["type"] == "expression":
                p["equiv"] = "expression"
    # several boxes need a line each: number them the way the stem names them, or by what they are
    if len(parts) > 1:
        names = {"equation": "Equation", "inequality": "Inequality", "expression": "Expression", "number": "Value", "sci": "Value"}
        seen_eq = False
        for p in parts:
            if p.get("label"):
                continue
            k = parts.index(p)
            if k and parts[k - 1].get("label") == "Which step has the first error?":
                p["label"] = "The correct " + ("power" if p["type"] == "expression" and "^" in p["key"] else "value" if p["type"] in ("number", "sci") else p["type"]); continue
            if p["type"] == "equation" and p.get("equiv"):
                p["label"] = "Equation"; seen_eq = True
            elif p["type"] == "inequality" and p.get("equiv"):
                p["label"] = "Inequality"
            elif p.get("pre"):
                p["label"] = "Solution"
            elif p["type"] == "inequality":
                p["label"] = "Solution"
            elif p.get("unit"):
                p["label"] = "Answer"
            else:
                p["label"] = names.get(p["type"], "Answer")
    return {"parts": parts, "dropped": dropped}


NLINE_KEPT = [0]
GRAPH_MC_KEPT = [0]
def nline_part(item, closed, at, side, parts):
    """Cadence's "graph: open circle at 4, shaded to the right" on its blank number line → an nline part {type: 'nline', line:
    {lo, st, n}, graph: {c, closed, dir}, v, key, label}, or None when the line cannot be read exactly. The line is read from
    Cadence's figure itself: its labels (every tick labelled, as its figText says) evenly spaced in value and in x, the ends
    the figText names; the boundary must be one of its ticks."""
    ft, fig = item.get("ft") or "", item.get("fig") or ""
    m = re.fullmatch(r"a blank number line from (\S+) to (\S+) with every tick labeled", ft)
    if not m or not fig:
        return None
    num = lambda t: float(t.replace("\u2212", "-").replace("\u2013", "-"))
    try:
        lo_t, hi_t = num(m.group(1)), num(m.group(2))
        labs = sorted((float(x), num(t)) for x, t in re.findall(r'<text x="([\d.]+)"[^>]*>([^<]+)</text>', fig))
        ticks = sorted(set(float(x) for x in re.findall(r'<line x1="([\d.]+)" y1="[\d.]+" x2="\1" y2="[\d.]+"', fig)))
        c = num(at)
    except ValueError:
        return None
    if len(labs) < 5 or len(labs) > 21 or len(ticks) != len(labs):
        return None
    xs, vs = [l[0] for l in labs], [l[1] for l in labs]
    dx, dv = xs[1] - xs[0], vs[1] - vs[0]
    if dv <= 0 or any(abs((xs[i] - xs[i - 1]) - dx) > 1e-6 or abs((vs[i] - vs[i - 1]) - dv) > 1e-9 for i in range(1, len(xs))):
        return None
    if any(abs(t - x) > 1e-6 for t, x in zip(ticks, xs)) or abs(vs[0] - lo_t) > 1e-9 or abs(vs[-1] - hi_t) > 1e-9:
        return None
    k = (c - vs[0]) / dv
    if abs(k - round(k)) > 1e-9 or not (0 <= round(k) <= len(vs) - 1):
        return None
    ks = lambda v: str(int(round(v))) if abs(v - round(v)) < 1e-9 else repr(round(v, 9))
    prev = [p for p in parts if p["type"] == "inequality"]
    v = (re.match(r"\s*([a-z])\b", prev[-1]["key"]) or [None, "x"])[1] if prev else "x"
    word = ("Closed" if closed else "Open") + " dot at " + ks(c) + ", arrow " + side
    return {"type": "nline", "line": {"lo": ks(vs[0]), "st": ks(dv), "n": len(vs) - 1}, "graph": {"c": ks(c), "closed": closed, "dir": side},
            "v": v, "key": word, "label": "Graph the solution on the number line."}


GRAPH_OPT = re.compile(r"^\s*(Open|Closed) circle at (\S+?),? shaded (?:to the )?(left|right)\.?\s*$", re.I)


def q2_line(c):
    """a number line by the practice test's Q2 conventions for a boundary with no figure of Cadence's: ten steps of 1 (a whole
    number) or ½ (a half), the boundary in the middle — five steps from either end, on a tick; None for any other boundary"""
    if abs(c - round(c)) < 1e-9:
        st = 1.0
    elif abs(2 * c - round(2 * c)) < 1e-9:
        st = 0.5
    else:
        return None
    ks = lambda v: str(int(round(v))) if abs(v - round(v)) < 1e-9 else repr(round(v, 9))
    return {"lo": ks(c - 5 * st), "st": ks(st), "n": 10}


def mc_nline(item):
    """A Cadence choice item whose four options are described graphs ("Open circle at −8, shaded right" — "Which number line
    shows the solution?") → (an nline part keyed from the right option, the stem without its question), or (None, 'kept') when
    the boundary cannot sit on a tick, or (None, None) when it is not that kind of item. The line is Cadence's figure when it
    has one, else q2_line."""
    opts, key = item.get("opts") or [], item.get("key")
    if item["rt"] not in ("mc", "etc") or len(opts) < 2 or not isinstance(key, int):
        return None, None
    ms = [GRAPH_OPT.match(re.sub(r"<[^>]*>", "", o)) for o in opts]
    if not all(ms):
        return None, None
    m = ms[key]
    closed, at, side = m.group(1).lower() == "closed", m.group(2), m.group(3).lower()
    nl = nline_part(item, closed, at, side, []) if item.get("fig") else None
    if not nl:
        try:
            c = float(at.replace("\u2212", "-").replace("\u2013", "-"))
        except ValueError:
            return None, "kept"
        line = q2_line(c)
        if not line:
            return None, "kept"
        ks = lambda v: str(int(round(v))) if abs(v - round(v)) < 1e-9 else repr(round(v, 9))
        nl = {"type": "nline", "line": line, "graph": {"c": ks(c), "closed": closed, "dir": side},
              "key": ("Closed" if closed else "Open") + " dot at " + ks(c) + ", arrow " + side, "label": "Graph the solution on the number line."}
    tex = [g[0] for g in item["qS"] if isinstance(g, list)]
    v = next((x for t in tex for x in re.findall(r"(?<![a-z\\])([a-z])(?![a-z])", t)), "x")
    nl["v"] = v
    # the stem keeps what comes before its question ("Solve the inequality. −0.2d < 1.6"): the question goes, the part asks it
    qS = list(item["qS"])
    while qS and isinstance(qS[-1], str) and (re.search(r"(Which|What) (number line|graph)[^?]*\?\s*$", qS[-1], re.I) or not re.sub(r"<br\s*/?>|\s", "", qS[-1])):
        last = re.sub(r"(?:<br\s*/?>|\s)*(Which|What) (number line|graph)[^?]*\?\s*$", "", qS[-1], flags=re.I)
        last = re.sub(r"(?:<br\s*/?>|\s)+$", "", last)
        qS.pop()
        if last:
            qS.append(last); break
    qP = re.sub(r"\s*(Which|What) (number line|graph)[^?]*\?\s*$", "", item["qP"], flags=re.I).rstrip()
    return {"part": nl, "qS": qS, "qP": qP}, None


def judgeable(item):
    """→ (answer spec, None) or (None, kind left out)"""
    rt = item["rt"]
    g, kept = mc_nline(item)
    if g:                                                        # 7 Nov 2026: a graph to build, not a description to pick
        return {"kind": "free", "parts": [g["part"]], "dropped": [], "stemS": g["qS"], "stemP": g["qP"], "fromChoice": True}, None
    if kept:
        GRAPH_MC_KEPT[0] += 1
    if rt in ("mc", "etc"):
        return {"kind": "choice", "key": item["key"]}, None
    if rt == "ms":
        return {"kind": "multi", "key": sorted(item["key"])}, None
    if rt == "match":
        return {"kind": "match", "key": item["key"]}, None
    try:
        r = read_key(item)
    except Unreadable as e:
        return None, str(e)
    return {"kind": "free", **r}, None


# ------------------------------------------------------------------------------------------------ ruling 43
def _balance(s):
    """drop the brackets that have no partner"""
    out, st = list(s), []
    for i, ch in enumerate(s):
        if ch == "(":
            st.append(i)
        elif ch == ")":
            if st:
                st.pop()
            else:
                out[i] = ""
    for i in st:
        out[i] = ""
    return "".join(out)


def pieces(text):
    """the pieces of mathematics in a string, normalised (ruling 43 A): each side of a relation, typography aside, the letters
    renamed in order (x, y → a, b, so (2y)³ is (2x)³) → {piece: number of operations}"""
    t = typed(text).replace("×", "*").replace("·", "*").replace("÷", "/").replace("_", " ")
    t = re.sub(r"[A-Za-z]{2,}", " ", t.replace("π", "p"))
    out = {}
    for m in re.finditer(r"[0-9a-zA-Z(][0-9a-zA-Z\s.^()+\-*/]*[0-9a-zA-Z)]|\d", t):
        for side in re.split(r"<=|>=|[=<>≤≥]", m.group(0)):
            s = _balance(re.sub(r"\s+", "", side))
            while s.startswith("(") and s.endswith(")") and _balance(s[1:-1]) == s[1:-1]:
                s = s[1:-1]
            if not re.search(r"\d", s):
                continue
            letters = {}
            s = re.sub(r"[A-Za-z]", lambda mm: letters.setdefault(mm.group(0), "abcdefghij"[len(letters) % 10]), s)
            ops = len(re.findall(r"(?<=[0-9a-z)])[+\-*/^]", s)) + len(re.findall(r"\d\(|\)\(", s))
            if ops:
                out[s] = max(out.get(s, 0), ops)
    return out


def sig_numbers(text):
    """the numbers of three or more significant digits in a string (ruling 43 C)"""
    t = typed(text).replace(",", "")
    out = set()
    for n in re.findall(r"\d+(?:\.\d+)?", t):
        d = n.replace(".", "").lstrip("0")
        if "." not in n:
            d = d.rstrip("0")
        if len(d) >= 3 and n != "3.14":
            out.add(n)
    return out


def r43_hit(it, shown):
    """ruling 43 against the unit's shown mathematics: A — the stem poses an expression the lessons showed (a piece of two or
    more operations, or a one-operation piece that is all the stem asks about); C — the answer has a number of three or more
    significant digits a lesson showed (not one the stem itself gives)."""
    if not shown:
        return None
    sp, ex = pieces(it["q"]), shown["ex"]
    hits = [p for p, n in sp.items() if p in ex and (n >= 2 or len(sp) == 1)]
    if hits:
        return "A " + hits[0]
    an = sig_numbers(re.sub(r"\s*Score:.*$", "", it["a"])) - sig_numbers(it["q"])
    hits = sorted(an & shown["num"])
    if hits:
        return "C " + hits[0]
    return None


SHOWN_KEYS = ("warmup", "notes", "examples", "vocab", "hoq")
TEACHER_KEYS = {"te", "differentiation", "ixl", "ixl_due", "mtr", "note", "note_q", "note_a", "warmup_note", "vocab_note", "source",
                "band", "check", "yt_check", "audit", "wrong", "errors", "why", "gloss", "ack", "space"}


def shown_strings(x, out):
    if isinstance(x, str):
        out.append(x)
    elif isinstance(x, dict):
        for k, v in x.items():
            if k not in TEACHER_KEYS:
                shown_strings(v, out)
    elif isinstance(x, (list, tuple)):
        for v in x:
            shown_strings(v, out)


def load_module(path, name):
    sp = importlib.util.spec_from_file_location(name, path)
    m = importlib.util.module_from_spec(sp)
    path = os.path.abspath(path)
    sp = importlib.util.spec_from_file_location(name, path)
    m = importlib.util.module_from_spec(sp)
    cwd = os.getcwd(); d = os.path.dirname(path)
    sys.path[:0] = [d, os.path.dirname(d)]            # the unit's own modules (figs), then the course build's (lib, …)
    try:
        os.chdir(d); sp.loader.exec_module(m)
    finally:
        os.chdir(cwd); del sys.path[:2]
    return m


def shown_pieces(build_dir):
    """what the unit's lessons show the class and what its paper test prints, as pieces (ruling 43). The decks are the
    course's own spec modules (uN/lNN.py, review.py: their warm-up, notes, examples, vocabulary and questions asked aloud)
    and the paper (uN/unit.py: the assessment and review). → (set of pieces, files read, problems)"""
    got, files, probs = {"ex": set(), "num": set()}, [], []
    if not os.path.isdir(build_dir):
        return got, files, ["no build folder " + build_dir]
    before = set(sys.modules)
    # loading a deck may draw its figures into the course's figure cache: whatever it adds is taken away again
    caches = [os.path.join(os.path.dirname(os.path.abspath(build_dir)), "figs"), os.path.join(os.path.abspath(build_dir), "figs")]
    had = {c: set(os.listdir(c)) for c in caches if os.path.isdir(c)}
    kept = {os.path.join(c, n): open(os.path.join(c, n), "rb").read() for c in had for n in had[c] if n.endswith(".json")}
    for f in sorted(os.listdir(build_dir)):
        if not re.fullmatch(r"(l\d+|review|unit)\.py", f):
            continue
        try:
            m = load_module(os.path.join(build_dir, f), "cb_" + os.path.basename(build_dir) + "_" + f[:-3])
        except Exception as e:                                   # a deck that does not load is reported, not silently skipped
            probs.append(f"{f}: {type(e).__name__}: {e}")
            continue
        strs = []
        for name in dir(m):
            v = getattr(m, name)
            if name.startswith("_") or callable(v) or isinstance(v, type(sys)):
                continue
            if isinstance(v, dict):
                if f == "unit.py":
                    shown_strings(v, strs)
                else:
                    for k in SHOWN_KEYS:
                        if k in v:
                            shown_strings(v[k], strs)
            elif isinstance(v, (list, tuple)) and f == "unit.py":
                shown_strings(v, strs)
        for s in strs:
            got["ex"] |= set(pieces(s)); got["num"] |= sig_numbers(s)
        files.append(f)
    for k in [k for k in sys.modules if k not in before]:      # a course's helper modules (figs, …) belong to this unit only
        del sys.modules[k]
    for p, data in kept.items():                             # and an index it rewrote is put back as it was
        if open(p, "rb").read() != data:
            open(p, "wb").write(data)
    for c, names in had.items():
        for n in set(os.listdir(c)) - names:
            p = os.path.join(c, n)
            if os.path.isfile(p):
                os.remove(p)
    return got, files, probs


# ------------------------------------------------------------------------------------------------ the plan
def words(t):
    stop = {"the", "a", "an", "of", "and", "with", "in", "to", "for", "on", "using", "part", "parts", "–", "-", "&"}
    t = re.sub(r"\(.*?\)", " ", t.lower())
    ws = re.findall(r"[a-z0-9²]+", t)
    norm = lambda w: re.sub(r"(ies|es|s|ing|al)$", "", w) if len(w) > 4 else w
    return {norm(w) for w in ws if w not in stop}


def title_sim(a, b):
    A, B = words(a), words(b)
    if not A or not B:
        return 0.0
    return len(A & B) / min(len(A), len(B))


def spine_unit(S, spine_key, unit):
    """the unit's days on the plan: [(date, entry)] in order"""
    out = []
    for d in sorted(S["days"]):
        e = (S["days"][d] or {}).get(spine_key)
        if e and e.get("unit") == unit:
            out.append((d, e))
    return out


def cad_id(code_part, lead):
    """'9.03' → '9.3'; '04' (the second half of 9.03+04) → '9.4'; '10' → '10.10'"""
    if "." in code_part:
        u, n = code_part.split(".")
        return f"{int(u)}.{int(n)}"
    return f"{lead}.{int(code_part)}"


def map_unit(S, course, unit, MNU):
    """→ map.json for one unit (without the item counts, added after the bank is drawn)"""
    c = COURSES[course]
    tier = MNU[c["tier"]]
    cad = {l[0]: (u["u"], l) for u in tier["units"] for l in u["l"]}
    days = spine_unit(S, c["spine"], unit)
    lessons, other, order = {}, [], []
    for d, e in days:
        code = e.get("code")
        kind = e["kind"]
        if not code or code in ("extra", "spiral", "off", "flex"):
            other.append({"date": d, "kind": kind, "title": e["title"], "status": "whole-unit",
                          "reason": {"extra": "a day off the plan or a review and catch-up day: no lesson",
                                     "off": "no class", "spiral": "a spiral day: no lesson of its own",
                                     "flex": "a flex day: no lesson"}.get(kind, "no lesson")})
            continue
        if code in lessons:
            lessons[code]["dates"].append(d); continue
        order.append(code)
        rec = {"title": e["title"], "kind": kind, "dates": [d], "benchmarks": e.get("benchmarks") or []}
        lessons[code] = rec
        if kind == "review":
            rec.update(status="whole-unit", reason="a review day: the whole practice test"); continue
        if kind == "exam":
            rec.update(status="whole-unit", reason="a test day: the whole practice test"); continue
        ids, why = [], []
        if kind == "thread":
            m = re.search(r"\((\d+)\.(\d+)(?:–(\d+)\.(\d+))?\)\s*$", e["title"])
            if m:
                a, b = int(m.group(2)), int(m.group(4) or m.group(2))
                ids = [f"{m.group(1)}.{k}" for k in range(a, b + 1)]
                why.append("a thread day: the title names Math Nation lessons " + ", ".join(ids))
            else:
                # no lesson numbers in the title: the plan's benchmarks, matched to the Cadence lessons that teach exactly them,
                # confirmed by title
                bm = set(e.get("benchmarks") or [])
                cands = [(title_sim(e["title"], l[1]), lid) for lid, (u, l) in cad.items() if bm and set(l[2]) <= bm and set(l[2])]
                cands = sorted(cands, reverse=True)
                if cands and cands[0][0] >= 0.34:
                    ids = [cands[0][1]]
                    why.append(f"a thread day: no lesson number in its title; matched by benchmark and title to {ids[0]}")
        elif kind == "lesson":
            m = re.fullmatch(r"(\d+)\.(\d+)(?:\+(\d+))?", code)
            if m:
                ids = [cad_id(f"{m.group(1)}.{m.group(2)}", m.group(1))] + ([cad_id(m.group(3), m.group(1))] if m.group(3) else [])
        if not ids:
            rec.update(status="whole-unit", reason="no Cadence lesson for this code"); continue
        missing = [x for x in ids if x not in cad]
        if missing:
            rec.update(status="whole-unit", reason="Cadence has no lesson " + ", ".join(missing)); continue
        # confirm by title: the plan's title (split at ";" for a two-lesson day) against Cadence's, and by benchmark
        ptitles = [t.strip() for t in re.split(r";", re.sub(r"\s*\(as run\)$", "", e["title"]))]
        checks = []
        for k, lid in enumerate(ids):
            ct = cad[lid][1][1]
            pt = ptitles[k] if len(ptitles) == len(ids) else e["title"]
            sim = max(title_sim(pt, ct), title_sim(e["title"], ct))
            bm_ok = not e.get("benchmarks") or bool(set(cad[lid][1][2]) & set(e.get("benchmarks") or []))
            checks.append({"cadence": lid, "cadenceTitle": ct, "cadenceUnit": cad[lid][0], "planTitle": pt,
                           "similarity": round(sim, 2), "benchmarksAgree": bm_ok})
        rec["match"] = checks
        bad = [x for x in checks if x["similarity"] < 0.34 and not x["benchmarksAgree"]]
        if bad:
            rec.update(status="whole-unit", reason="title mismatch: " + "; ".join(f"{x['planTitle']!r} vs Cadence {x['cadence']} {x['cadenceTitle']!r}" for x in bad))
            continue
        weak = [x for x in checks if x["similarity"] < 0.5 or not x["benchmarksAgree"]]
        rec.update(status="cadence", cadence=ids)
        if why:
            rec["note"] = "; ".join(why)
        if weak:
            rec["disagree"] = "; ".join(
                f"{x['planTitle']!r} vs Cadence {x['cadence']} {x['cadenceTitle']!r} (title {x['similarity']}, benchmarks {'agree' if x['benchmarksAgree'] else 'differ'})" for x in weak)
    # Cadence's lessons of this unit that no day teaches
    used = {x for r in lessons.values() for x in r.get("cadence", [])}
    unit_l = next((u for u in tier["units"] if u["u"] == unit), None)
    unused = [{"cadence": l[0], "title": l[1]} for l in (unit_l["l"] if unit_l else []) if l[0] not in used]
    return {"order": order, "lessons": lessons, "otherDays": other, "cadenceUnused": unused}


# ------------------------------------------------------------------------------------------------ the bank
def hid(course, lid, it):
    return hashlib.sha1(f"{course}|{lid}|{it['c']}|{int(it['hr'])}|{it['s']}|{it['k']}".encode()).hexdigest()[:10]


SAFE = re.compile(r"<script|\son\w+\s*=|javascript:|<iframe|<object|<embed|https?://", re.I)


def build_lesson(course, lid, raw, n_target, taken, shown, stats):
    """N distinct items for one Cadence lesson: 3/4 regular then 1/4 rigor (regular fill a short rigor bank, rigor fills a short
    regular one). `taken` — Cadence keys already in another lesson of the unit — keeps two lessons that share a benchmark
    from sharing items."""
    reg_t = round(n_target * 0.75)
    pools = {False: [], True: []}
    for it in raw["items"]:
        pools[it["hr"]].append(it)
    # round robin over the lesson's benchmarks, in seed order (as upLessonSet draws "in turn from the lesson's benchmarks")
    def ordered(pool):
        by = {}
        for it in pool:
            by.setdefault(it["c"], []).append(it)
        out, k = [], 0
        lists = [by[c] for c in raw["codes"] if c in by]
        while any(lists):
            for L in lists:
                if L:
                    out.append(L.pop(0))
            k += 1
        return out
    picked = {False: [], True: []}
    spare = {False: [], True: []}                    # items another lesson of the unit already has: used only to reach N
    for hr in (False, True):
        for it in ordered(pools[hr]):
            shared = it["k"] in taken
            if SAFE.search(it["q"] + (it["fig"] or "") + " ".join(it.get("opts") or [])):
                stats["excluded"]["unsafe markup"] = stats["excluded"].get("unsafe markup", 0) + 1; continue
            spec, why = judgeable(it)
            if why:
                stats["excluded"][why] = stats["excluded"].get(why, 0) + 1
                if why == "explanation" and re.search(r"number line|circle at|shaded", it["a"], re.I):
                    stats.setdefault("graphExplained", []).append(it["a"][:160])   # a number-line graph described in words: reported
                continue
            hit = r43_hit(it, shown)
            if hit:
                stats["excluded"]["ruling 43"] = stats["excluded"].get("ruling 43", 0) + 1
                stats["r43"].append(hit)
                continue
            (spare if shared else picked)[hr].append((it, spec))
    for hr in (False, True):
        need = (reg_t if not hr else n_target - reg_t) - len(picked[hr])
        if need > 0 and spare[hr]:
            stats["shared"] += min(need, len(spare[hr]))
            picked[hr] += spare[hr][:need]
    rig_t = n_target - reg_t
    reg = picked[False][:reg_t]
    rig = picked[True][:rig_t]
    if len(rig) < rig_t:
        reg = picked[False][:reg_t + (rig_t - len(rig))]
    if len(reg) < reg_t:
        rig = picked[True][:rig_t + (reg_t - len(reg))]
    chosen = reg + rig
    for it, _ in chosen:
        taken.add(it["k"])
    return chosen


def item_out(course, lid, it, spec, partsegs):
    o = {"id": hid(course, lid, it), "lesson": lid, "codes": [it["c"]], "gen": it["gi"], "seed": it["s"], "rigor": bool(it["hr"]),
         "rt": it["rt"], "stem": spec.get("stemS", it["qS"]), "plain": spec.get("stemP", it["qP"])}
    if it["fig"]:
        o["fig"] = it["fig"]; o["figText"] = it["ft"]
    if it.get("instS"):
        o["inst"] = it["instS"]
    if it["rt"] in ("mc", "etc", "ms") and spec["kind"] != "free":
        o["choices"] = [{"t": s, "ok": (k in it["key"]) if isinstance(it["key"], list) else k == it["key"]} for k, s in enumerate(it["optsS"])]
        o["choicesPlain"] = it["optsP"]
    if it["rt"] == "match":
        o["cols"] = it["colsS"]; o["rows"] = it["rowsS"]; o["colsPlain"] = it["cols"]; o["rowsPlain"] = it["rows"]
    ans = {"kind": spec["kind"]}
    if spec.get("fromChoice"):
        o["fromChoice"] = it["optsP"]                             # Cadence's described graphs, kept for the record (not shown)
    if spec["kind"] in ("choice", "multi", "match"):
        ans["key"] = spec["key"]
    else:
        ps = []
        for p in spec["parts"]:
            q = {k: v for k, v in p.items() if not (v is None or v is False or v == "" or v == [])}   # a key of 0 stays
            if p["type"] != "select":
                q["keyS"] = partsegs[p["key"]]
            else:
                q["optsS"] = [partsegs[x] for x in p["opts"]]
            if p.get("label"):
                q["labelS"] = partsegs[p["label"]]
            ps.append(q)
        ans["parts"] = ps
        if spec.get("dropped"):
            ans["also"] = spec["dropped"]
    o["answer"] = ans
    o["keyS"] = partsegs["\x00a" + it["a"]]
    o["solution"] = it["solS"]
    return o


# ------------------------------------------------------------------------------------------------ main
def git_head(path):
    try:
        return subprocess.check_output(["git", "-C", path, "rev-parse", "HEAD"], text=True).strip()
    except Exception:
        return "unknown"


def dumps(x):
    return json.dumps(x, ensure_ascii=False, separators=(",", ":"), sort_keys=False)


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--cadence", required=True)
    ap.add_argument("--m7"); ap.add_argument("--a7")
    ap.add_argument("--windmill", default=ROOT)
    ap.add_argument("--units", nargs="*", help="m7:4,8,9,10 a7:3,4,5,6")
    ap.add_argument("--n", type=int, default=60)
    ap.add_argument("--raw-cache", help="a folder for Cadence's raw draws (reused when the Cadence commit matches)")
    ap.add_argument("--check", action="store_true", help="exit 1 if a committed bank differs from a fresh build")
    ap.add_argument("--report", help="write the run's report (JSON) here")
    a = ap.parse_args()
    units = dict(DEFAULT_UNITS)
    if a.units:
        units = {}
        for spec in a.units:
            k, v = spec.split(":"); units[k] = [int(x) for x in v.split(",") if x]
    repos = {"m7": a.m7, "a7": a.a7}
    S = json.load(open(os.path.join(a.windmill, "spine", "spine.json"), encoding="utf-8"))
    cad_head = git_head(a.cadence)
    cad_path = os.path.join(a.cadence, "cadence.html")
    cad_sha = hashlib.sha256(open(cad_path, "rb").read()).hexdigest()
    tool_sha = hashlib.sha256(open(os.path.abspath(__file__), "rb").read()).hexdigest()[:12]
    C = None
    def page():
        nonlocal C
        if C is None:
            C = Cadence(cad_path)
        return C
    meta_cache = os.path.join(a.raw_cache, f"meta-{cad_sha[:12]}.json") if a.raw_cache else None
    if meta_cache and os.path.exists(meta_cache):
        meta = json.load(open(meta_cache))
    else:
        meta = page().meta()
        if meta_cache:
            os.makedirs(a.raw_cache, exist_ok=True); json.dump(meta, open(meta_cache, "w"))
    MNU = meta["units"]
    report = {"cadence": cad_head, "cadenceBuild": meta.get("build"), "units": {}, "failures": []}
    failed = False
    for course, ulist in units.items():
        repo = repos.get(course)
        if not repo:
            continue
        c = COURSES[course]
        for u in ulist:
            M = map_unit(S, course, u, MNU)
            ids = []
            for code in M["order"]:
                for lid in M["lessons"][code].get("cadence", []):
                    if lid not in ids:
                        ids.append(lid)
            # Cadence's draws for the unit's lessons (cached by Cadence's file hash)
            rc = os.path.join(a.raw_cache, f"raw-{cad_sha[:12]}-{course}-u{u}.json") if a.raw_cache else None
            if rc and os.path.exists(rc):
                raw = json.load(open(rc))
            else:
                raw = page().export(c["tier"], ids, 220, 4000)
                if rc:
                    json.dump(raw, open(rc, "w"), ensure_ascii=False)
            build_dir = os.path.join(repo, c["dir"], "build", f"u{u}")
            shown, r43files, r43probs = shown_pieces(build_dir)
            taken, lessons_out, stats_all = set(), {}, {}
            chosen_all = {}
            for lid in ids:
                st = {"excluded": {}, "shared": 0, "r43": []}
                chosen_all[lid] = build_lesson(course, lid, raw[lid], a.n, taken, shown, st)
                stats_all[lid] = st
            # TeX segments for every part key, label and option, and every Cadence key, in one pass
            strs = set()
            for lid, ch in chosen_all.items():
                for it, spec in ch:
                    strs.add("\x00a" + it["a"])
                    for p in spec.get("parts", []):
                        if p["type"] != "select":
                            strs.add(p["key"])
                        else:
                            strs.update(p["opts"])
                        if p.get("label"):
                            strs.add(p["label"])
            strs = sorted(strs)
            def pretty(s):
                if s.startswith("\x00a"):
                    return re.sub(r"\s*Score:.*$", "", s[2:]).strip()
                return s.replace("-", MINUS).replace("*", "×") if re.search(r"\d|[a-z]\^", s) and not re.search(r"[A-Za-z]{3,}", s) else s
            def pretty_html(s):
                p = pretty(s)
                p = re.sub(r"\^\((-?[^()]*)\)", r"<sup>\1</sup>", p)
                p = re.sub(r"\^(" + MINUS + r"?\d+)", r"<sup>\1</sup>", p)
                p = re.sub(r"√\(([^()]*)\)", r'√<span class="rad">\1</span>', p)
                p = re.sub(r"√(\d+)", r'√<span class="rad">\1</span>', p)
                return p
            segs = dict(zip(strs, (page().segs([pretty_html(s) for s in strs]) if strs else [])))
            for lid, ch in chosen_all.items():
                R = raw[lid]
                items = [item_out(course, lid, it, spec, segs) for it, spec in ch]
                st = stats_all[lid]
                nreg = sum(1 for x in items if not x["rigor"]); nrig = len(items) - nreg
                lessons_out[lid] = {"id": lid, "title": R["title"], "unit": R["unit"], "codes": R["codes"], "labels": R["labels"],
                                    "focus": R["why"], "rigorBank": any(R["rigor"].values()), "count": len(items),
                                    "regular": nreg, "rigor": nrig, "items": items}
                rep = {"items": len(items), "regular": nreg, "rigor": nrig, "excluded": st["excluded"], "sharedWithAnotherLesson": st["shared"],
                       "graphs": graph_counts(items)}
                if st.get("graphExplained"):
                    rep["graphExplainedSample"] = st["graphExplained"][:5]
                if st["r43"]:
                    rep["ruling43Sample"] = st["r43"][:5]
                report["units"].setdefault(f"{course}:u{u}", {}).setdefault("lessons", {})[lid] = rep
                if len(items) < FLOOR:
                    report["failures"].append(f"{c['code']} Unit {u} lesson {lid}: {len(items)} items (floor {FLOOR})")
            # a lesson code with a lesson under the floor is whole-unit, with the reason
            for code, rec in M["lessons"].items():
                if rec.get("status") == "cadence":
                    low = [x for x in rec["cadence"] if lessons_out[x]["count"] < FLOOR]
                    if low:
                        rec.update(status="whole-unit", reason="too few Cadence items: " + ", ".join(f"{x} has {lessons_out[x]['count']}" for x in low))
                        rec.pop("cadence", None)
                    else:
                        rec["items"] = sum(lessons_out[x]["count"] for x in rec["cadence"])
            mp = {"v": SCHEMA, "course": course, "code": c["code"], "tier": c["tierName"], "unit": u, "cadence": cad_head,
                  "spine": S["generatedAt"], "lessons": M["lessons"], "order": M["order"], "otherDays": M["otherDays"],
                  "cadenceUnused": M["cadenceUnused"]}
            bank = {"v": SCHEMA, "course": course, "code": c["code"], "tier": c["tierName"], "unit": u,
                    "source": {"cadence": cad_head, "build": meta.get("build"), "file": "cadence.html", "sha256": cad_sha, "tool": tool_sha},
                    "n": a.n, "lessons": lessons_out}
            out_dir = os.path.join(repo, c["dir"], "practice", f"u{u}", "bank")
            texts = {"cadence.json": dumps(bank) + "\n", "map.json": json.dumps(mp, ensure_ascii=False, indent=1) + "\n"}
            sha = "".join(f"{hashlib.sha256(texts[f].encode()).hexdigest()}  {f}\n" for f in ("cadence.json", "map.json"))
            ex_tot = {}
            for lid, st in stats_all.items():
                for k, v in st["excluded"].items():
                    ex_tot[k] = ex_tot.get(k, 0) + v
            readme = readme_text(c, u, cad_head, meta.get("build"), mp, lessons_out, ex_tot, r43files, r43probs, a.n)
            texts["BANK.sha256"] = sha
            texts["README.md"] = readme
            report["units"][f"{course}:u{u}"].update(map={k: {x: v.get(x) for x in ("status", "cadence", "reason", "disagree", "note", "items")} for k, v in M["lessons"].items()},
                                                    otherDays=M["otherDays"], unused=M["cadenceUnused"], ruling43=r43files, ruling43Problems=r43probs,
                                                    bytes=len(texts["cadence.json"].encode()))
            if a.check:
                for f in ("cadence.json", "map.json"):
                    p = os.path.join(out_dir, f)
                    old = open(p, encoding="utf-8").read() if os.path.exists(p) else ""
                    if old != texts[f]:
                        failed = True
                        print(f"cadence_bank --check: {c['code']} Unit {u} {f} differs from a fresh build")
            else:
                os.makedirs(out_dir, exist_ok=True)
                for f, t in texts.items():
                    open(os.path.join(out_dir, f), "w", encoding="utf-8").write(t)
            print(f"{c['code']} Unit {u}: " + ", ".join(f"{lid} {lessons_out[lid]['count']}" for lid in lessons_out)
                  + f"; {len(texts['cadence.json'].encode()) // 1024} KB; codes " + ", ".join(f"{k}:{v['status']}" for k, v in M["lessons"].items()))
    if C:
        C.close()
    if a.report:
        json.dump(report, open(a.report, "w"), ensure_ascii=False, indent=1)
    for f in report["failures"]:
        print("FAILURE:", f)
    sys.exit(1 if failed or report["failures"] else 0)


def graph_counts(items):
    """the number-line graphs to draw among a lesson's items: built by the student (nline), or kept as a choice of four"""
    built = sum(1 for x in items for p in x["answer"].get("parts", []) if p["type"] == "nline")
    kept = sum(1 for x in items for p in x["answer"].get("parts", []) if p["type"] == "select" and p.get("label") == "Which graph?")
    kept += sum(1 for x in items if x["answer"]["kind"] == "choice" and x.get("choicesPlain") and all(GRAPH_OPT.match(c) for c in x["choicesPlain"]))
    fromc = sum(1 for x in items if x.get("fromChoice"))
    return {"nline": built, "choice": kept, "fromChoice": fromc}


def readme_text(c, u, head, build, mp, lessons, ex_tot, r43files, r43probs, n):
    L = [f"# {c['code']} Unit {u} — the lesson bank from Cadence", "",
         f"Made by Windmill `tools/cadence_bank.py` from Cadence `{head[:12]}` (build {build}), tier \"{c['tierName']}\", on "
         f"{dt.date.today().isoformat()}. Re-make it whenever Cadence or the plan changes; `--check` says whether this copy is current.", "",
         "`cadence.json` — per Cadence lesson, the items a lesson practice set draws from (the page draws 8: 6 regular, 2 high rigor",
         "when the lesson has them, never repeating on a device until the bank is used up). Every stem, choice, key and solution",
         "line is Cadence's own, cut into prose and TeX by Cadence's converter; every figure is Cadence's SVG. `map.json` — every",
         "lesson code of the unit on the plan, `cadence` or `whole-unit` with the reason. `BANK.sha256` — the two files' hashes.", "",
         "| Plan code | Status | Cadence lessons | Items | Note |", "|---|---|---|---|---|"]
    for code in mp["order"]:
        r = mp["lessons"][code]
        L.append(f"| {code} | {r['status']} | {', '.join(r.get('cadence', [])) or '—'} | {r.get('items', '—')} | "
                 + "; ".join(x for x in (r.get("reason"), r.get("note"), ("titles differ: " + r["disagree"]) if r.get("disagree") else None) if x) + " |")
    L += ["", "| Cadence lesson | Title | Items | Regular | Rigor |", "|---|---|---|---|---|"]
    for lid, x in lessons.items():
        L.append(f"| {lid} | {x['title']} | {x['count']} | {x['regular']} | {x['rigor']} |")
    if mp["otherDays"]:
        L += ["", "Days without a lesson code (the whole practice test): " + "; ".join(f"{d['date']} {d['kind']}" for d in mp["otherDays"]) + "."]
    if mp["cadenceUnused"]:
        L += ["", "Cadence lessons of this unit no day of the plan teaches: " + "; ".join(f"{x['cadence']} {x['title']}" for x in mp["cadenceUnused"]) + "."]
    L += ["", "Left out while drawing (counted over every seed walked, so a lesson still reaches its N): "
          + (", ".join(f"{k} {v}" for k, v in sorted(ex_tot.items())) or "nothing") + ".",
          "`explanation` — a key that is an explanation in words or a graph to draw (the page cannot check it); `words` — a key",
          "whose value is a word or phrase; `select` — a choice the key names that the stem does not list; `ruling 43` — the stem",
          "repeats a piece of mathematics the unit's lessons show or its paper test prints.",
          ""] + ([f"Graphs to draw (Cadence's \"graph: open circle at …, shaded to the …\" keys): {sum(graph_counts(x['items'])['nline'] for x in lessons.values())} "
          "built by the student on the number line (the kit's `nline` part: the point, an open or closed dot, the arrow), "
          f"{sum(graph_counts(x['items'])['choice'] for x in lessons.values())} kept as a choice of described graphs (no tick for the boundary). "
          f"Of those built, {sum(graph_counts(x['items'])['fromChoice'] for x in lessons.values())} were Cadence choice items (\"Which number line shows the solution?\" with four described graphs): "
          "the question goes from the stem, the part asks it, and the line is Cadence's figure or, with none, ten steps of 1 or ½ with the boundary in the middle.", ""]
          if any(sum(graph_counts(x['items']).values()) for x in lessons.values()) else []) + ["Ruling 43 read: " + (", ".join(r43files) or "nothing") + (". Not readable: " + "; ".join(r43probs) if r43probs else "") + "."]
    return "\n".join(L) + "\n"


if __name__ == "__main__":
    main()
