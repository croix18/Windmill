"""Every file name the build writes, in one place.

Croix, 4 October 2026: "Can you normalize all of the naming conventions in a7 and m7. I have file
names with all sorts of stuff. It's tough to find what I need sometimes." He chose: the lesson's
title in every name, one pattern for both courses, and unit folders organised by lesson.

    <COURSE> <unit>.<lesson> <Lesson Title> - <What it is>[ - Key | - Worked Answers].<ext>
    <COURSE> Unit <N> <Unit Title> - <What it is>[ - Key | - Worked Answers].<ext>

    M7 4.06 Finding Circumference - Slides.pptx
    M7 4.06 Finding Circumference - Teacher Edition.pdf
    A7 3.08 Writing Large Numbers in Scientific Notation - Question Bank - Key.docx
    M7 Unit 4 Area - All Slides.html                      (the .html is the console)
    M7 Unit 4 Area - Test Form A - Worked Answers.pdf
    M7 Unit 4 Area - Review Day - Slides.pptx             (a review day built as a lesson)
    A7 Unit 3 Exponents and Scientific Notation - Test - Key.docx

The rules that make it one convention instead of a habit:
  * single spaces; the pieces are joined by " - " and by nothing else;
  * the STEM (everything before the first " - ") is the course, the number and the title, and a
    title is cleaned so it can never contain " - " or a character Windows or Drive refuses;
  * what a file IS — slides, a key, a teacher's edition — is read from the TAIL (after the first
    " - "), never from the title: a lesson called "Key Features of a Graph" is not an answer key;
  * lesson numbers keep two digits (4.06, never 4.6), so names sort in teaching order;
  * the words after the stem come from the lists below and from nowhere else.
"""
import os, re
from .profile import C

SEP = " - "

# ---- what a file can be: the only words that may follow the stem
LESSON_KINDS = ("Slides", "Teacher Edition", "Lesson Plan", "Question Bank", "Additional Question Bank",
                "Independent Set", "Handout")
UNIT_KINDS = ("All Slides", "Reference Sheet", "Review", "Test", "Test Form A", "Test Form B", "Practice Test",
              "Question Bank")
REVIEW_DAY = "Review Day"                 # "<unit stem> - Review Day - Slides"
KEY, WORKED = "Key", "Worked Answers"


def clean(title):
    """A title as it may stand in a file name: "Scale Factors — Perimeter" → "Scale Factors (Perimeter)",
    "Circumference or Area?" → "Circumference or Area". Never contains " - "."""
    t = title.strip()
    m = re.match(r"^(.*?)\s+[—–-]\s+(.*)$", t)
    if m:
        t = f"{m.group(1).strip()} ({m.group(2).strip()})"
    t = re.sub(r"\s+[—–-]\s+", " ", t)                    # a second dash, if a title has one
    t = re.sub(r'[\\/:*?"<>|]', "", t)
    t = re.sub(r"\s+", " ", t).strip().rstrip(".")
    if not t or SEP in t:
        raise ValueError(f"title cannot be made into a file name: {title!r}")
    return t


def unit_title(unit):
    """The unit's title, from the course profile (course.py UNITS) — one home, so a lesson, the
    review day and the unit's papers cannot name the unit three ways."""
    try:
        return C.UNITS[int(unit)]
    except (KeyError, TypeError, ValueError):
        raise ValueError(f"course.py UNITS has no title for unit {unit!r} — add it before building the unit")


def unit_stem(unit):
    return f"{C.PREFIX} Unit {unit} {clean(unit_title(unit))}"


def lesson_stem(L):
    """"M7 4.06 Finding Circumference"; for a review day built as a lesson, "M7 Unit 4 Area - Review Day"."""
    if L.get("review"):
        return unit_stem(L["unit"]) + SEP + REVIEW_DAY
    return f"{C.PREFIX} {L['code']} {clean(L['title'])}"


def lesson(L, kind, ext, key=False):
    if kind not in LESSON_KINDS:
        raise ValueError(f"not a lesson document: {kind!r}")
    return lesson_stem(L) + SEP + kind + (SEP + KEY if key else "") + "." + ext


def unit(unit_no, kind, ext, key=False, worked=False):
    if kind not in UNIT_KINDS and not re.fullmatch(r"Test Form [A-Z]", kind):
        raise ValueError(f"not a unit document: {kind!r}")
    return unit_stem(unit_no) + SEP + kind + (SEP + KEY if key else "") + (SEP + WORKED if worked else "") + "." + ext


def stale_glob(L):
    """Every file an earlier build of this lesson wrote (build_lesson.py clears them first)."""
    return re.sub(r"([\[\]*?])", r"[\1]", lesson_stem(L)) + SEP + "*"


# ---- reading a name back -------------------------------------------------------------------------
def tail(name):
    """What follows the stem, without the extension: "Slides", "Question Bank - Key",
    "Review Day - Slides", "Test Form A - Worked Answers". A name with no " - " has no tail."""
    base = os.path.basename(name)
    for ext in (".notes.json",):
        if base.endswith(ext):
            base = base[:-len(ext)]
            break
    else:
        base = os.path.splitext(base)[0]
    return base.split(SEP, 1)[1] if SEP in base else ""


def stem(name):
    base = os.path.basename(name)
    return base.split(SEP, 1)[0] if SEP in base else os.path.splitext(base)[0]


def parts(name):
    return tail(name).split(SEP) if tail(name) else []


def is_key(name):
    return KEY in parts(name)


def is_worked(name):
    return WORKED in parts(name)


def is_kind(name, kind):
    """Is this file a `kind` (ignoring Key / Worked Answers and the Review Day prefix)?"""
    return kind in parts(name)


def is_lesson_deck(name):
    """A lesson's own deck (or the review day's) — not the whole-unit deck."""
    p = parts(name)
    return bool(p) and p[-1] == "Slides"


def is_unit_deck(name):
    return parts(name) == ["All Slides"]


def is_slides(name):
    return is_lesson_deck(name) or is_unit_deck(name)


def is_teacher_page(name):
    """Pages a student never holds: keys, worked answers are for the class but carry answers — see
    is_key / is_worked; teacher's editions and lesson plans are teacher pages."""
    p = parts(name)
    return "Teacher Edition" in p or "Lesson Plan" in p
