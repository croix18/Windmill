#!/usr/bin/env python3
"""Cadence → the bank of a generated practice FAST test (14 Nov 2026).

Croix, of the state's released FAST test on the site: "I want a fast test question regeneration engine similar to my practice
tests. Where I can build tons of practice fast tests, similar questions, etc." Asked how: a blueprint mix (each test follows
the FAST's reporting categories and question types and draws from a larger pool, so which benchmarks appear changes from test
to test), Grade 8 for A7 first, for students online and for him on paper — and "Use cadence. It generates graphs and pictures."

    python3 tools/cadence_fast.py --cadence ../cadence --site ../mrshaffer-site [--course a7] [--per 30] [--check] [--report FILE]

It opens Cadence (its one file, cadence.html) in headless Chrome, as tools/cadence_bank.py does and with that tool's own
reader of Cadence's keys, and for every benchmark of the grade's FAST draws Cadence's own items — drawItem(code, rigor, seed),
seeds walked from 0, so the same Cadence commit gives the same bank, byte for byte. It writes, in the site's repository:

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
A numeric box takes "any equivalent value", as FLDOE's keys say: the key's value, and each other form Cadence's key accepts.
LEFT OUT, and counted in the README: an answer that is an expression, an equation or an inequality to type, a graph to
build, an explanation in words, a number with a drop-down, a choice without four options, an item with markup the page
will not carry. Ruling 43 (a practice problem never repeats a lesson's own numbers) is not applied: this is a test over the
year, not a lesson's practice.

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
# of a benchmark's items, at most this share of each kind (the 2025 released test: 20 mc, 8 numeric, 4 grid, 3 select-all, 1 drop-down)
SHARE = {"mc": 0.50, "numeric": 0.25, "ms": 0.125, "grid": 0.125}

EXPORT_JS = r'''([course, codes, cap, budget]) => {
  setCourseFilter(course);
  const keyOf = (c, p) => `${c}::${p.q}::${p.ft || ""}::${p.opts ? [...p.opts].sort().join("|") : p.rows ? p.rows.join("|") : ""}`;
  const seg = (s, o) => CTEX.segments(String(s == null ? "" : s), o || {}).map(g => g.math ? [g.tex, g.display ? 1 : 0] : g.text);
  const out = {};
  for (const c of codes) {
    const R = {label: (STD[c] && STD[c].l) || "", rigor: !!hasRigor(c), items: []};
    for (const hr of [false, true]) {
      if (hr && !hasRigor(c)) continue;
      const seen = new Set(); let n = 0;
      for (let s = 0; s < budget && n < cap; s++) {
        const p = drawItem(c, hr, s); if (!p) continue;
        const k = keyOf(c, p); if (seen.has(k)) continue; seen.add(k); n++;
        const it = {c, hr, s, gi: p._genIdx, k, rt: p.rt || "ee", q: p.q, a: p.a, sol: p.s || "", fig: p.fig || null, ft: p.ft || "",
          qS: seg(String(p.q).replace(/\n/g, "<br>"), {display: true}), qP: plain(p.q), aP: plain(p.a), aS: seg(p.a),
          solS: String(p.s || "").split("\n").filter(x => x.trim()).map(x => seg(x))};
        if (p.inst) it.instS = seg(p.inst);
        if (p.opts) { it.opts = p.opts; it.optsS = p.opts.map(o => seg(o)); it.optsP = p.opts.map(o => plain(o)); it.key = p.key; }
        if (p.rt === "match") { it.cols = p.cols; it.rows = p.rows; it.key = p.key; it.colsS = p.cols.map(x => seg(x)); it.rowsS = p.rows.map(x => seg(x)); it.colsP = p.cols.map(x => plain(x)); it.rowsP = p.rows.map(x => plain(x)); }
        R.items.push(it);
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


def choose(pool, per):
    """Of a benchmark's kept items (regular first, then rigor, each in seed order): at most `per`, each kind up to its share,
    the room a kind leaves unused given to the others in the order mc, numeric, ms, grid."""
    by = collections.OrderedDict((t, [x for x in pool if x["type"] == t]) for t in ("mc", "numeric", "ms", "grid"))
    take = {t: min(len(by[t]), round(per * SHARE[t])) for t in by}
    room = per - sum(take.values())
    while room > 0:
        grew = False
        for t in by:
            if room > 0 and take[t] < len(by[t]):
                take[t] += 1; room -= 1; grew = True
        if not grew:
            break
    picked = [x for t in by for x in by[t][:take[t]]]
    return sorted(picked, key=lambda x: (x["rigor"], x["seed"], x["gen"]))


def build(args):
    bp = BLUEPRINT[args.course]
    codes = [b for c in bp["categories"] for b in c["benchmarks"]]
    cat_of = {b: c["id"] for c in bp["categories"] for b in c["benchmarks"]}
    C = cb.Cadence(os.path.join(args.cadence, "cadence.html"))
    meta = C.meta()
    raw = C.p.evaluate(EXPORT_JS, [bp["tier"], codes, args.cap, args.budget])
    C.close()
    if C.errors:
        sys.exit("cadence_fast: Cadence's page threw: " + C.errors[0])
    items, stats, problems = [], {}, []
    for code in codes:
        R = raw.get(code) or {"items": [], "label": ""}
        out = collections.Counter(); pool = []
        for it in R["items"]:
            try:
                o = convert(it)
            except Out as e:
                out[str(e)] += 1; continue
            x = {"id": hashlib.sha1(f"fast|{args.course}|{it['c']}|{int(it['hr'])}|{it['s']}|{it['k']}".encode()).hexdigest()[:10],
                 "b": code, "c": cat_of[code], "rigor": bool(it["hr"]), "gen": it["gi"], "seed": it["s"], "type": o["type"],
                 "stem": it["qS"], "plain": it["qP"]}
            if it.get("instS"):
                x["inst"] = it["instS"]
            if it["fig"]:
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
        # two levels (14 Nov 2026: the test adapts, as the FAST does — a right answer brings a harder question): Cadence's
        # regular items and its high-rigor ones. Up to 2/5 of a benchmark's items are high rigor; what a level cannot fill, the other does.
        reg, rig = [x for x in pool if not x["rigor"]], [x for x in pool if x["rigor"]]
        n_rig = min(len(rig), round(args.per * 0.4)); n_reg = min(len(reg), args.per - n_rig); n_rig = min(len(rig), args.per - n_reg)
        picked = choose(reg, n_reg) + choose(rig, n_rig)
        kinds = collections.Counter(x["type"] for x in picked)
        stats[code] = {"label": R["label"], "drawn": len(R["items"]), "kept": len(pool), "banked": len(picked), "kinds": dict(kinds), "rigor": sum(1 for x in picked if x["rigor"]), "hasRigor": bool(R.get("rigor")),
                       "figures": sum(1 for x in picked if x.get("fig")), "out": dict(out)}
        if len(picked) < args.least:
            problems.append(f"{code}: {len(picked)} items, fewer than {args.least}")
        items += picked
    ids = [x["id"] for x in items]
    if len(set(ids)) != len(ids):
        problems.append("two items share an id")
    bank = {"v": 1, "course": args.course, "grade": bp["grade"], "tier": bp["tier"],
            "blueprint": {"source": TDS, "items": bp["items"], "categories": bp["categories"]},
            "source": {"cadence": cb.git_head(args.cadence), "build": meta.get("build"), "windmill": cb.git_head(os.path.dirname(HERE)), "per": args.per},
            "n": len(items), "items": items}
    return bank, stats, problems


def readme(bank, stats, sha):
    L = [f"# The generated practice FAST test's bank — {bank['course'].upper()}, Grade {bank['grade']}", "",
         "Made by Windmill `tools/cadence_fast.py` from Cadence. **Do not edit by hand**: make it again.", "",
         f"- Cadence commit `{bank['source']['cadence']}` (build {bank['source']['build']}); Windmill `{bank['source']['windmill']}`",
         f"- {bank['n']} items, at most {bank['source']['per']} a benchmark; `bank.json` sha256 `{sha}`",
         f"- The blueprint: {bank['blueprint']['source']}. A test has {bank['blueprint']['items']} questions: "
         + ", ".join(f"{c['count']} of {c['name']} ({c['range'][0]}–{c['range'][1]}% of the test)" for c in bank["blueprint"]["categories"]) + ".", "",
         "| Benchmark | Cadence's name | Drawn | Could be asked | Banked | High rigor | mc | numeric | select-all | grid | With a picture | Left out |",
         "|---|---|---|---|---|---|---|---|---|---|---|---|"]
    for code, s in stats.items():
        k = s["kinds"]
        L.append(f"| {code} | {s['label']} | {s['drawn']} | {s['kept']} | {s['banked']} | {s['rigor'] if s['rigor'] else ('none in Cadence' if not s['hasRigor'] else 'none the screen can ask')} | {k.get('mc', 0)} | {k.get('numeric', 0)} | {k.get('ms', 0)} | {k.get('grid', 0)} | {s['figures']} | "
                 + ("; ".join(f"{n} {w}" for w, n in sorted(s["out"].items(), key=lambda kv: -kv[1])) or "none") + " |")
    L += ["", "High rigor: Cadence's own harder items for the benchmark. The test adapts with them: a right answer brings the next benchmark's high-rigor question.",
          "Left out means Cadence drew it and the FAST screen cannot show or check it (see the tool's own notes)."]
    return "\n".join(L) + "\n"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--cadence", required=True); ap.add_argument("--site", required=True)
    ap.add_argument("--course", default="a7", choices=sorted(BLUEPRINT))
    ap.add_argument("--per", type=int, default=30, help="items banked for a benchmark, at most")
    ap.add_argument("--least", type=int, default=8, help="fewer than this for a benchmark is a failure")
    ap.add_argument("--cap", type=int, default=150); ap.add_argument("--budget", type=int, default=1500)
    ap.add_argument("--check", action="store_true"); ap.add_argument("--report")
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
        strip = lambda t: re.sub(r'"source":\{.*?\},"n"', '"n"', t)
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
    print(f"cadence_fast: {bank['n']} items for {len(stats)} benchmarks ({dict(kinds)}), {sum(1 for x in bank['items'] if x.get('fig'))} with a picture; "
          f"{len(text) // 1024} KB → {d}")


if __name__ == "__main__":
    main()
