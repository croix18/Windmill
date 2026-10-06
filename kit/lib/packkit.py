"""Packaging: one layout for both courses, read from the names the build writes (lib/names.py).

Croix, 28 September (M7): the unit as FOLDERS for Google Drive, lesson by lesson. Croix, 4 October:
the same in both courses. So a unit's package is

    <COURSE> Unit N - <Unit Title>/
        00 - START HERE.md                          written by the course's own install_unit.py
        All Slides/                                 the whole unit in one deck (and, where a course builds HTML, its console)
        Lessons/<N.NN>/                             everything for that day; docx/pptx and pdf together
        Lessons/<N.NN>/Keys/                        that lesson's answer keys — never beside a student page
        Review Day/                                 a review day built as a lesson (deck, TE, plan)
        Review/                                     a review that is a paper, with its key
        Assessment/                                 one paper and its key; or
        Assessment/Form A | Form B | Practice Test/ each form's paper, key and worked answers
        Handouts/                                   the Reference Sheet
        Reference/                                  the unit's Question Bank file, and what the course adds

    <packages>/zips/     git-ignored, regenerable: the folder as "<COURSE> Unit N - Complete.zip" (and
                         in parts when it is over the upload limit), one zip per lesson,
                         "<COURSE> Unit N - Lessons.zip", "<COURSE> Unit N - Review and Assessment.zip"

A lesson's folder is its NUMBER only, and the zips of a unit carry no title: the title is already in
the unit's folder and in every file name, and a path that says it three times does not fit in
Windows' 260 characters once a zip is extracted into Downloads (Croix, 4 October: asked, he chose
number-only lesson folders). install() refuses a package whose longest path would not fit.

A course's install_unit.py calls install() and zips() and writes its own START HERE; everything a
file's place depends on is its name, so a file the kit cannot place stops the install.
"""
import os, re, glob, json, shutil, zipfile, filecmp, subprocess, datetime as dt
from . import names
from .profile import C
from .tekit import plan_from_sidecar

PART_LIMIT = 27 * 2 ** 20            # a zip over this is also written in parts (uploads stop at 30 MiB)
MAX_PATH_IN_PACKAGES = 180           # "<unit folder>/…/<file>": leaves 80 of Windows' 260 for where a zip is extracted


def lesson_folder(L):
    return os.path.join("Lessons", L["code"])


def place(name, specs):
    """The package subfolder for a built file, from its name alone; None if it has no place."""
    stem, p = names.stem(name), names.parts(name)
    if not p:
        return None
    m = re.match(rf"{re.escape(C.PREFIX)} (\d+\.\w+) ", stem + " ")
    if m:
        L = next((s for s in specs if s["code"] == m.group(1)), None)
        if L is None:
            raise SystemExit(f"{name}: no spec for lesson {m.group(1)}")
        if stem != names.lesson_stem(L):
            raise SystemExit(f"{name}: not the name this lesson's spec gives ({names.lesson_stem(L)}) — a stale file")
        return os.path.join(lesson_folder(L), "Keys") if names.KEY in p else lesson_folder(L)
    if not stem.startswith(f"{C.PREFIX} Unit "):
        return None
    head = p[0]
    form = re.fullmatch(r"Test Form ([A-Z])", head)
    return ("All Slides" if head == "All Slides" else
            names.REVIEW_DAY if head == names.REVIEW_DAY else
            "Review" if head == "Review" else
            os.path.join("Assessment", "Practice Test") if head == "Practice Test" else
            os.path.join("Assessment", f"Form {form.group(1)}") if form else
            "Assessment" if head == "Test" else
            "Handouts" if head == "Reference Sheet" else
            "Reference" if head == "Question Bank" else None)


def built(out):
    return sorted(f for f in os.listdir(out)
                  if not f.endswith((".json", ".tmp")) and not f.startswith(".~lock")
                  and os.path.isfile(os.path.join(out, f)))


def install(out, pkg, specs, handouts=None):
    """Delete and rebuild the package folder from out/: every file placed by its name and compared
    byte for byte with the build. handouts: {lesson code: [(source path, kind, is_key)]} — pages the
    build does not make (a measuring sheet), copied in under the lesson's own name with a PDF.
    Returns [(subfolder, file name)]."""
    if os.path.exists(pkg):
        shutil.rmtree(pkg)
    placed = []
    for name in built(out):
        sub = place(name, specs)
        if sub is None:
            raise SystemExit(f"unplaced file: {name}")
        d = os.path.join(pkg, sub); os.makedirs(d, exist_ok=True)
        shutil.copy2(os.path.join(out, name), os.path.join(d, name))
        if not filecmp.cmp(os.path.join(out, name), os.path.join(d, name), shallow=False):
            raise SystemExit(f"{name}: the installed copy differs from the build")
        placed.append((sub, name))
    for code, pages in (handouts or {}).items():
        L = next(s for s in specs if s["code"] == code)
        for src, kind, is_key in pages:
            if not os.path.exists(src):
                raise SystemExit(f"handout missing: {src}")
            ext = os.path.splitext(src)[1].lstrip(".")
            name = names.lesson(L, kind, ext, key=is_key)
            sub = place(name, specs)
            d = os.path.join(pkg, sub); os.makedirs(d, exist_ok=True)
            shutil.copy2(src, os.path.join(d, name))
            subprocess.run(["soffice", "--headless", "--convert-to", "pdf", "--outdir", d, os.path.join(d, name)],
                           check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            pdf = os.path.splitext(name)[0] + ".pdf"
            if not os.path.exists(os.path.join(d, pdf)):
                raise SystemExit(f"{name}: no PDF was made")
            placed += [(sub, name), (sub, pdf)]
    longest = max((os.path.join(os.path.basename(pkg), sub, name) for sub, name in placed), key=len)
    if len(longest) > MAX_PATH_IN_PACKAGES:
        raise SystemExit(f"a path of {len(longest)} characters will not unzip on Windows (limit {MAX_PATH_IN_PACKAGES} "
                         f"inside packages/): {longest} — shorten the lesson's title")
    return placed


# ---- the zips -------------------------------------------------------------------------------------
def _zip(path, pairs):
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as z:
        for full, arc in pairs:
            z.write(full, arc)


def _tree(root, arcroot):
    out = []
    for d, dirs, fs in os.walk(root):
        dirs.sort()
        for f in sorted(fs):
            full = os.path.join(d, f)
            out.append((full, os.path.join(arcroot, os.path.relpath(full, root))))
    return out


def zips(pkg, zdir, unit):
    """Write the unit's zips into zdir; returns their names. Every zip of this unit there is replaced."""
    os.makedirs(zdir, exist_ok=True)
    ustem = f"{C.PREFIX} Unit {unit}"         # no title: "Extract all" makes a folder of the zip's name
    for z in glob.glob(os.path.join(glob.escape(zdir), glob.escape(ustem) + " *.zip")) + \
            glob.glob(os.path.join(glob.escape(zdir), f"{C.PREFIX} {unit}.*.zip")):
        os.remove(z)
    made = []
    folder = os.path.basename(pkg)
    everything = _tree(pkg, folder)
    whole = os.path.join(zdir, f"{ustem} - Complete.zip")
    _zip(whole, everything); made.append(os.path.basename(whole))
    if os.path.getsize(whole) > PART_LIMIT:
        # split where a person would: a lesson's folder, or another top-level folder, never mid-folder
        def group(arc):
            rel = os.path.relpath(arc, folder).split(os.sep)
            return os.sep.join(rel[:2]) if rel[0] == "Lessons" else rel[0]
        sizes = {}
        for full, arc in everything:
            sizes[group(arc)] = sizes.get(group(arc), 0) + os.path.getsize(full)
        n = -(-sum(sizes.values()) // PART_LIMIT)                    # as few parts as the limit allows …
        target = sum(sizes.values()) / n                              # … and about the same size each
        parts, size, last = [[]], 0, None
        for full, arc in everything:
            g = group(arc)
            if g != last and size and len(parts) < n and size + sizes[g] / 2 > target:
                parts.append([]); size = 0
            parts[-1].append((full, arc)); size += os.path.getsize(full); last = g
        for i, pairs in enumerate(parts, 1):
            p = os.path.join(zdir, f"{ustem} - Complete (part {i} of {len(parts)}).zip")
            _zip(p, pairs); made.append(os.path.basename(p))
            if os.path.getsize(p) > 30 * 2 ** 20:
                raise SystemExit(f"{os.path.basename(p)} is still over the upload limit")
    lessons = sorted(glob.glob(os.path.join(glob.escape(pkg), "Lessons", "*")))
    every = []
    for d in lessons:
        pairs = [(full, os.path.basename(full)) for full, _ in _tree(d, "")]
        if not pairs:
            continue
        p = os.path.join(zdir, names.stem(pairs[0][1]) + ".zip")      # "M7 4.06 Finding Circumference.zip", flat
        _zip(p, pairs); made.append(os.path.basename(p)); every += pairs
    if every:
        p = os.path.join(zdir, f"{ustem} - Lessons.zip"); _zip(p, every); made.append(os.path.basename(p))
    rest = [(full, os.path.basename(full)) for sub in (names.REVIEW_DAY, "Review", "Assessment")
            for full, _ in _tree(os.path.join(pkg, sub), "") if os.path.isdir(os.path.join(pkg, sub))]
    if rest:
        p = os.path.join(zdir, f"{ustem} - Review and Assessment.zip"); _zip(p, rest); made.append(os.path.basename(p))
    return made


# ---- what START HERE derives ---------------------------------------------------------------------
def calendar(unit, build_dir):
    """The unit's dates, read from the plan the console reads (Windmill's spine, vendored into
    assets/windmill/): ({lesson code: date}, review day, [assessment days], the plan's date).
    A merged day ('4.02+03') is filed under the code of the spec that teaches it ('4.02')."""
    path = os.path.join(build_dir, "assets", "windmill", "spine.js")
    if not os.path.exists(path):
        return {}, None, [], None
    txt = open(path, encoding="utf-8").read().strip()
    S = json.loads(txt[txt.index("=") + 1:].strip().rstrip(";"))
    lessons, review, exams = {}, None, []
    for iso, d in sorted(S["days"].items()):
        o = (d or {}).get(C.COURSE_KEY)
        if not o or o.get("unit") != unit:
            continue
        day = dt.date.fromisoformat(iso)
        if o["kind"] == "lesson":
            lessons.setdefault(o["code"].split("+")[0], day)
        elif o["kind"] == "review":
            review = day
        elif o["kind"] == "exam":
            exams.append(day)
    return lessons, review, exams, S["generatedAt"][:10]


def day(d, weekday=True):
    return d.strftime("%a %-d %b" if weekday else "%-d %b")


def timing_rows(specs, out):
    """[(code, everything but the boards and IXL, whiteboard round, IXL, total)] from the deck
    side-cars; a plan that does not total the period stops the install."""
    rows = []
    for L in specs:
        side = os.path.join(out, names.lesson(L, "Slides", "notes.json"))
        plan, wb = plan_from_sidecar(side)[:2]
        other = sum(m for seg, rng, m in plan if seg not in ("Whiteboards", "IXL"))
        ixl = sum(m for seg, rng, m in plan if seg == "IXL")
        if other + wb + ixl != C.PERIOD:
            raise SystemExit(f"{L['code']}: the plan totals {other + wb + ixl}, not {C.PERIOD}")
        rows.append((L["code"], other, wb, ixl, other + wb + ixl))
    return rows


def package_folder(unit):
    """"M7 Unit 4 - Area": the unit's folder, in packages/ and on Drive."""
    return f"{C.PREFIX} Unit {unit} - {names.clean(names.unit_title(unit))}"
