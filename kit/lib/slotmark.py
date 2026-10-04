r"""Named colour slots (HOUSE STYLE §2a): one colour per slot in a formula, so that a letter and
the number that fills it carry the same colour and the match is seen before it is explained.

A spec marks a slot where it stands, in LaTeX and in plain text alike:

    \sA{...}   the first slot   — b, b₁, d₁, the circumference     blue    1E5AA8
    \sB{...}   the second slot  — b₂, d₂, the radius or diameter    orange  C05A00
    \sH{...}   the height       — h                                 teal    398080

    ("A = \\frac{1}{2}(\\sH{9})(\\sA{18.7} + \\sB{16.3})", "h = 9, the bases 18.7 and 16.3")
    gloss="A = ½ \\sH{h} (\\sA{a} + \\sB{b}) = ½ (\\sH{4})(\\sA{9} + \\sB{6})"

The marks are honoured only where the teacher shows (Notes, worked examples, every reveal) and
only on slides; everywhere else — question slides, every printed page, the console's metadata —
they are stripped and the text reads as if they were never there (rules 1 and 4: the letter is
always printed, and colour is withheld wherever the student is the one who has to decide).
Marks do not nest.
"""
import re

SLOT = {"A": "1E5AA8", "B": "C05A00", "H": "398080"}
NAME = {"A": "first slot (blue)", "B": "second slot (orange)", "H": "height (teal)"}
_OPEN = re.compile(r"\\s([ABH])\{")


def has(s):
    return bool(s) and "\\s" in s and bool(_OPEN.search(s))


def spans(s):
    """[(start, end, key, body)] for every mark, in order; end is one past the closing brace."""
    out, i = [], 0
    while True:
        m = _OPEN.search(s, i)
        if not m:
            return out
        depth, j = 1, m.end()
        while j < len(s) and depth:
            depth += (s[j] == "{") - (s[j] == "}")
            j += 1
        if depth:
            raise ValueError(f"slot mark never closes: {s[m.start():m.start() + 40]!r}")
        body = s[m.end():j - 1]
        if _OPEN.search(body):
            raise ValueError(f"slot marks do not nest: {s[m.start():j]!r}")
        out.append((m.start(), j, m.group(1), body))
        i = j


def _sub(s, fn):
    if not has(s):
        return s
    out, i = [], 0
    for a, b, key, body in spans(s):
        out.append(s[i:a]); out.append(fn(key, body)); i = b
    out.append(s[i:])
    return "".join(out)


def strip(s):
    """The text with every mark removed and its body kept."""
    return _sub(s, lambda key, body: body)


def strip_deep(obj):
    """strip() over every string inside lists, tuples and dicts — for a whole spec block."""
    if isinstance(obj, str):
        return strip(obj)
    if isinstance(obj, list):
        return [strip_deep(v) for v in obj]
    if isinstance(obj, tuple):
        return tuple(strip_deep(v) for v in obj)
    if isinstance(obj, dict):
        return {k: strip_deep(v) for k, v in obj.items()}
    return obj


def textcolor(s):
    """LaTeX for KaTeX: each mark becomes \\textcolor{#hex}{body}."""
    return _sub(s, lambda key, body: "\\textcolor{#" + SLOT[key] + "}{" + body + "}")


def isolate(s, key):
    """LaTeX in which the bodies of `key` marks are raised into a superscript and every other mark
    is stripped. mathimg parses this beside the plain expression: the glyphs that came out smaller
    are the slot's glyphs (the renderer's own layout decides, never a guess at the source)."""
    # the raised body sits in its own group, so an exponent written after the mark (\\sB{6}^2)
    # still has something to stand on
    return _sub(s, lambda k, body: ("{{}^{" + body + "}}") if k == key else body)


def pieces(s):
    """Plain text as [(piece, hex or None)] — for a slide's text runs."""
    if not has(s):
        return [(s, None)]
    out, i = [], 0
    for a, b, key, body in spans(s):
        if s[i:a]:
            out.append((s[i:a], None))
        out.append((body, SLOT[key]))
        i = b
    if s[i:]:
        out.append((s[i:], None))
    return out


def read(s):
    """The marks as a reader sees them, for the audit list: ⟨H:9⟩(⟨A:18.7⟩ + ⟨B:16.3⟩)."""
    return _sub(s, lambda key, body: f"⟨{key}:{body}⟩")
