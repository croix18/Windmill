"""Rows of an equation being solved, lined up on their relation signs (15 Nov 2026).

A7 Unit 11's review (a Barton audit): "Worked equations are not laid out to be followed. In every deck the
equals signs are not aligned" — a Notes slide's rows were each centered and a worked slide's rows began at
one left edge, so in

    3(2x - 5) + 4 = 25
    6x - 15 + 4 = 25
    6x - 11 = 25

each "=" stood somewhere else. A lesson that says `align="="` (and a block that does not say `align=False`)
has each run of consecutive rows that are each ONE relation — an expression, one top-level =, <, >, ≤, ≥,
≈ or ≠, an expression — set with the signs in one column: the left sides end at it and the right sides
start from it, and the block is placed as it was (centered where it was centered; where it was
left-aligned, its leftmost ink at the same left edge). Any other row — words, words beside the
mathematics, two relations, a check, a false ending with its words — is set as before and starts a new
run. A run of one row is set as before.

This module decides; deckkit (pictures placed by each row's measured sign, mathimg.sign_offset) and htmlkit
(a two-column grid: the left sides right-aligned, the sign and right sides left-aligned) draw the same plan,
so the PowerPoint and the HTML deck agree. Nothing here changes what a row says.
"""
import re
from . import slotmark

VALUES = ("=",)                 # what a lesson's or a block's `align` may say (False turns a block off)
# the relation signs a row may be lined up on, as a spec writes them
REL_CMDS = {"le", "leq", "ge", "geq", "approx", "ne", "neq", "lt", "gt", "leqslant", "geqslant"}
REL_CHARS = "=<>≤≥≈≠"
# a row with any of these is words, or more than one statement: never lined up
WORDY = {"text", "textbf", "textrm", "mathrm", "mbox", "operatorname", "quad", "qquad", "hspace", "textit", "mathbf"}
OPEN, CLOSE = "{([", "})]"
# A run is set as before when lining it up makes it this much wider than its widest row: one row with a
# long left side and another with a long right side push every other row far to one side (worse than
# before, not better). The PowerPoint and the HTML deck read the same number.
SPREAD = 1.25
STEP_DOWN = (1.0, 0.92, 0.85)  # an aligned run too wide for its room is set this much smaller before it falls back


def setting(block, lesson):
    """Whether this block's rows are lined up: the block's own `align`, else the lesson's."""
    v = block.get("align", lesson.get("align")) if isinstance(block, dict) else lesson.get("align")
    return v in VALUES


def bad_values(L):
    """Findings for an `align` that says anything but "=" (or False on a block)."""
    out = []
    code = L.get("code", "?")
    if "align" in L and L["align"] not in VALUES + (None, False):
        out.append(f"{code}: align={L['align']!r} — a lesson lines its equations up with align=\"=\" (or leaves the field out)")
    blocks = [("notes", n) for n in L.get("notes", [])] + [("whiteboard", q) for q in L.get("whiteboard", [])]
    for ex in L.get("examples", []):
        blocks += [("worked", w) for w in ex.get("worked", [])] + ([("your_turn", ex["your_turn"])] if ex.get("your_turn") else [])
    for where, b in blocks:
        if isinstance(b, dict) and "align" in b and b["align"] not in VALUES + (None, False):
            out.append(f"{code} {where}: align={b['align']!r} — a block says align=False (or align=\"=\")")
    return out


def split(latex):
    """(left, sign, right) where `latex` is one relation at its top level, else None. Top level: outside
    braces, parentheses and brackets. A row of words or of two statements is None."""
    if latex is None:
        return None
    depth, i, n, hits = 0, 0, len(latex), []
    while i < n:
        c = latex[i]
        if c == "\\":
            m = re.match(r"\\([A-Za-z]+|.)", latex[i:], re.S)
            name = m.group(1) if m else ""
            if name in WORDY:
                return None
            if name in ("{", "(", "["):
                depth += 1
            elif name in ("}", ")", "]"):
                depth -= 1
            elif name in REL_CMDS and depth == 0:
                hits.append((i, i + m.end()))
            i += m.end() if m else 1
            continue
        if c in OPEN:
            depth += 1
        elif c in CLOSE:
            depth -= 1
        elif depth == 0 and c in ",;":
            return None                          # two statements on one line
        elif depth == 0 and c in REL_CHARS:
            hits.append((i, i + 1))
        i += 1
    if len(hits) != 1:
        return None
    a, b = hits[0]
    left, sign, right = latex[:a].strip(), latex[a:b], latex[b:].strip()
    if not slotmark.strip(left).strip() or not slotmark.strip(right).strip():
        return None
    return left, sign, right                     # (a colored slot round the sign puts it inside braces: never top level)


def latex_of(row, kind):
    """The expression a row IS, or None when it is anything else. `kind`: "worked" (a (latex, gloss) tuple, or a
    plain string of words) or "row" (a string; one `$…$` and nothing else)."""
    if kind == "worked":
        return row[0] if isinstance(row, tuple) else None
    if not isinstance(row, str):
        return None
    r = row.strip()
    if not (r.startswith("$") and r.endswith("$") and r.replace("\\$", "").count("$") == 2 and len(r) > 2):
        return None
    return r[1:-1]


def runs(rows, kind="row"):
    """[(start, end)] — each run of two or more consecutive rows that are each one relation."""
    ok = [split(latex_of(r, kind)) is not None for r in rows]
    out, i = [], 0
    while i < len(rows):
        if not ok[i]:
            i += 1
            continue
        j = i
        while j + 1 < len(rows) and ok[j + 1]:
            j += 1
        if j > i:
            out.append((i, j + 1))
        i = j + 1
    return out


def geometry(latexes, surface):
    """Each row's (picture width, sign offset) in inches at its natural size, measured (mathimg), or None when a
    row's picture has no single sign on its main line."""
    from . import mathimg
    out = []
    for t in latexes:
        _, w, _ = mathimg.m(t, surface, slots=True)      # the very picture the slide places (no other file is drawn)
        s = mathimg.sign_offset(t, surface)
        if s is None:
            return None
        out.append((w, s))
    return out


def extent(geo, k=1.0):
    """(left of the sign, right of the sign) of the aligned rows, in inches, at scale k."""
    return max(s for _, s in geo) * k, max(w - s for w, s in geo) * k


def plan(rows, kind, surface, room, quiet=True, where=""):
    """{start: (end, scale, geometry)} — the runs of `rows` that are lined up, each at the largest scale of STEP_DOWN
    at which it fits `room` inches; a run that fits at none, or that lining up spreads by more than SPREAD, is left
    out (set as before) and, unless `quiet`, said on the console."""
    out = {}
    for a, b in runs(rows, kind):
        tex = [latex_of(r, kind) for r in rows[a:b]]
        geo = geometry(tex, surface)
        if geo is None:
            continue
        L, R = extent(geo)
        widest = max(w for w, _ in geo)
        if L + R > SPREAD * widest + 1e-6:
            if not quiet:
                print(f"   align{where}: {b - a} rows not lined up — lined up they would be {L + R:.2f} in wide, "
                      f"their widest row is {widest:.2f} in (more than {SPREAD:g} times): {tex[0][:50]}")
            continue
        for k in STEP_DOWN:
            if (L + R) * k <= room + 1e-6:
                out[a] = (b, k, geo)
                break
        else:
            if not quiet:
                print(f"   align{where}: {b - a} rows not lined up — lined up they would be {L + R:.2f} in wide and the "
                      f"room is {room:.2f} in, even at {STEP_DOWN[-1]:.0%}: {tex[0][:50]}")
    return out
