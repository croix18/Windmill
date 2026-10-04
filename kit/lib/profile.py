"""The course profile. One build kit serves both courses; everything a course may differ on is a
name in `build/course.py`, read here once and handed to the kit as `C`.

A name the course file leaves out takes the family default below, so `course.py` lists only what
that course settles for itself. `python3 -m lib.profile` prints the profile and marks every name
the course set — that list IS "where the courses deliberately differ" for the build, derived, not
typed (HOUSE STYLE §13c: any list a script could derive must be derived).
"""
import os, sys, types, importlib.util

HERE = os.path.dirname(os.path.abspath(__file__))
# build/course.py beside lib/ — or, for the kit's own tests in Windmill, the file KIT_COURSE names
COURSE_FILE = os.environ.get("KIT_COURSE") or os.path.normpath(os.path.join(HERE, "..", "course.py"))

REQUIRED = ("COURSE", "PREFIX", "COURSE_CODE", "COURSE_KEY", "IXL_SMARTSCORE")

DEFAULTS = dict(
    # ---- the period (rulings 10, 21, 26, 28)
    PERIOD=53,                 # minutes; Wednesdays are 43 and the cut is the teacher's
    IXL_MIN=5,
    SET_MIN=6,                 # the six-question independent set
    WB_COUNT=9,                # nine boards, the ninth written
    WB_RANGE=(10, 20),         # the whiteboard round is the remainder and must land here
    TE_MAX_PAGES=4,            # ruling 26 — a longer teacher's edition is cut, not shrunk
    # ---- the shape of a lesson's deliverables
    SET="handout",             # "handout": the six questions are a printed page and its key
                               # "slide":   the six questions are on a slide; no handout
    CLOSE=False,               # True: a "Before You Go" slide before IXL
    BANK="docx",               # "docx": Question Bank + Additional, each with a key
                               # "md":    one BANK - Unit N.md per unit, no per-lesson bank files
    TE_STYLE="lines",          # "lines": one line per slide, the boards inline
                               # "table": one line per slide, then the boards as a table
    PLAN_STYLE="sections",     # "sections": ten numbered sections with tables
                               # "labels":   headed paragraphs, the plan Croix approved for M7
    UNIT_DECK="Unit Slides",   # the whole-unit deck's name: "<PREFIX> <unit>  <UNIT_DECK>"
    REVIEW_IN_DECK=False,      # True: uN/review.py is built like a lesson and joins the unit deck
    # ---- the colour code (HOUSE STYLE §2a)
    SLOTS="exponent",          # "exponent": base blue / exponent orange, read off the layout
                               # "named":    only what a spec marks with \sA{} \sB{} \sH{}
    # ---- what the capcheck gate enforces (ruling 13; benchmark boundaries)
    CAPS=("fracexp", "sci"),   # + "gap", "radicand" where MA.8.NSO.1.5 / 1.7 are taught
    # ---- where the course's rulebook names its checks (suitecheck)
    SUITE_DOC=None,            # path, relative to build/, of the file carrying the suite block
    SUITE_BLOCK=None,          # e.g. "suite:a7"
    TRUTH=None,
    FIGURE_DOCS_EXEMPT=(),     # file-name fragments of documents copied in, not built (imagedrift)
)


def load(path=COURSE_FILE):
    if not os.path.exists(path):
        raise SystemExit(f"no course profile at {path} — every build needs build/course.py")
    spec = importlib.util.spec_from_file_location("course", path)
    mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)
    own = {k: v for k, v in vars(mod).items() if k.isupper()}
    missing = [k for k in REQUIRED if k not in own]
    if missing:
        raise SystemExit(f"course.py is missing {missing}")
    ns = types.SimpleNamespace(**{**DEFAULTS, **own})
    ns._own = sorted(own)
    return ns


C = load()

if __name__ == "__main__":
    for k in sorted(set(DEFAULTS) | set(C._own)):
        v = getattr(C, k)
        if isinstance(v, (dict,)) or (isinstance(v, str) and len(v) > 70):
            v = f"<{type(v).__name__}, {len(v)}>"
        mark = "course" if k in C._own and (k not in DEFAULTS or DEFAULTS[k] != getattr(C, k)) else "family"
        print(f"{mark:7} {k:20} {v!r}")
