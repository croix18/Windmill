"""Ruling 44 — the words of a question and its picture agree.

Croix, 6 October 2026, of M7 4.05 board 3: "The question says 30 but the graphic shows 20 for the
diameter. I told you to make sure there were never errors like that."

The board read "A plate sits on a placemat 30 cm wide. Find the circumference of the plate." over a
circle labelled 20 cm. The 30 was the number nobody needs (ruling 22) and the 20 was the plate —
so every number was true, the answer was right, and the slide still read as a mistake: the only
length in the words was not on the picture, and the only length on the picture was not in the
words. A reader takes two unexplained lengths beside one circle for the same length, and so does
a twelve-year-old. Two more boards did the same (4.06 board 4: a 12 cm card and d = 10 cm; 4.07
board 5: a 20 in card and 18π in). Ruling 38 had the figure checked for true labels and for one
unit with the words; nothing compared the NUMBERS.

THE RULE. In an item that carries a figure:
  * a length the words give (a number with a unit of length) is on the figure, or
  * every number on the figure is in the words.
The item is refused when both fail at once — the words give a length the figure does not show
AND the figure shows a number the words never mention. That is exactly the shape of the three
boards above, and it is not the shape of an ordinary board ("Find the area. Use 3.14." over
r = 5 cm — the words give no length; "A pizza 14 in across is cut into 8 slices" over 14 in —
the length is on the picture).

THE FIX is not to drop the extra number. Say BOTH lengths in the words, each with the thing it
measures ("A plate 20 cm across sits on a placemat 30 cm wide"), and draw both, to scale, each on
the thing it measures (M7 `figs.with_card`).

`figwords_ok=True` on the item, with a comment beside it, where the difference is the point and
the slide says so. Nothing in either course carries it now: M7 4.03 Example 1, whose picture is the
SECOND cut of an octagon and carries that cut's lengths, says them in its words instead ("24.14 cm
across, 7.07 cm at each end") — the better fix wherever it is possible.

WHAT THIS CANNOT SEE: a label beside the wrong side, a picture that leaves off a length the answer
needs, a sentence about the picture that is not true. Those are read, not computed — the
look-through, `figure_sheets.py` (SPEC SCHEMA.md, "The look-through").

What is read as "the words": `text`, `prompt`, `stem`, `latex`, `ask`, `items`, `items2`, `math`
and the stems of `parts`. A number written straight after an equals sign is a result, not a given
(Deshawn's "= 160 m" in an error analysis), and is not counted as a length the words give.
Teacher's prose (`note`, `wrong`, `gloss`, `hint`, `sub`, …) is not the words.
"""
import re
from . import repeatcheck as rc

WORDS = ("text", "prompt", "stem", "latex", "ask", "items", "items2", "math")
_UNIT = (r"(?:cm|mm|km|in\.?|ft|yd|mi|m|units?|squares?|inch(?:es)?|feet|foot|meters?|metres?|"
         r"centimeters?|centimetres?|millimeters?|kilometers?|miles?|yards?)")
_MEAS = re.compile(r"(?<![\w.])(\d[\d,]*(?:\.\d+)?(?:\s?[½¼¾]|\s\d+/\d+)?)\s*(π?)\s*(?:-\s*)?" + _UNIT + r"(?![a-zA-Z²³^])")
_RESULT = re.compile(r"(?:=|≈|\\approx)\s*\$?\s*$")


def _clean(s):
    return s.replace("{,}", ",").replace("\\pi", "π").replace("\\,", " ").replace("$", " ")


def lengths(strs):
    """The lengths the words GIVE: a number with a unit of length, not one that follows an equals sign."""
    out = set()
    for s in strs:
        s = _clean(s)
        for m in _MEAS.finditer(s):
            if _RESULT.search(s[:m.start()]):
                continue
            out.add(m.group(1).replace(",", "").strip())
    return out


def _numbers(strs):
    out = set()
    for s in strs:
        out |= rc.numbers(_clean(s))
    return out


def _words(o):
    out = []
    for k in WORDS:
        out += list(rc._strs(o.get(k)))
    for p in o.get("parts") or []:
        if isinstance(p, dict):
            out += list(rc._strs(p.get("stem")))
    return out


def _walk(o, path, found):
    if isinstance(o, dict):
        for k in ("fig", "fig_a"):
            if isinstance(o.get(k), dict) and not o.get("figwords_ok"):
                found.append((path, k, _words(o), rc.figtext(o[k])))
        for k, v in o.items():
            if k not in ("fig", "fig_a"):
                _walk(v, f"{path}.{k}" if path else str(k), found)
    elif isinstance(o, (list, tuple)):
        for i, v in enumerate(o):
            _walk(v, f"{path}[{i + 1}]", found)


def disagreements(spec):
    """[(where, which figure, lengths only in the words, numbers only on the figure)] for a lesson or unit spec."""
    found, out = [], []
    _walk(spec, "", found)
    for path, k, words, labels in found:
        on_fig, in_words = _numbers(labels), _numbers(words)
        only_words = sorted(lengths(words) - on_fig)
        only_fig = sorted(on_fig - in_words)
        if only_words and only_fig:
            out.append((path, k, only_words, only_fig))
    return out


def check(spec, code):
    """Ruling 44 as a refusal, for a lesson spec or a unit spec."""
    out = []
    for path, k, only_words, only_fig in disagreements(spec):
        out.append(f"{code} {path}: ruling 44 — the words give {', '.join(only_words)}, which is not on the "
                   f"{'answer figure' if k == 'fig_a' else 'figure'}, and the figure shows {', '.join(only_fig)}, which is not "
                   f"in the words. A reader takes them for the same length. Say both in the words, each with the thing it "
                   f"measures, and draw both on the figure — or tag the item figwords_ok=True with a comment saying why "
                   f"the difference is the point.")
    return out
