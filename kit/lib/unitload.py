"""Load a spec file (a lesson, `unit.py`, `review.py`, `manifest.py`) with ITS unit's own modules.

A unit folder may carry modules of its own beside its specs — `figs.py`, `data.py`, anything a spec
imports from its folder. Python keeps every imported module in `sys.modules` by name, so a process
that loads several units (gates.py, figure_sheets.py, a course's tools/master_sheet.py) handed the
second unit's `import figs` the first unit's `figs` — A7's gates crashed on `figs.strips`, and
Unit 11's module had to be named `figs11` to get round it (14 Nov 2026). Here a unit-local module is
loaded fresh for each spec: before the spec runs, any cached module that answers to the name of a
file in the spec's folder but was loaded from somewhere else is put aside; after it runs, every
module it loaded from its own folder is dropped, so the next unit cannot be handed it either.
Kit modules (`lib.*`) and installed packages are never touched.

    from lib.unitload import load
    L = load("u11/l05.py").L
(Part of the shared build kit — edit it in croix18/Windmill, kit/.)"""
import importlib.util, os, sys


def _inside(mod, folder):
    f = getattr(mod, "__file__", None)
    if not f:
        return False
    try:
        return os.path.commonpath([os.path.abspath(f), folder]) == folder
    except ValueError:
        return False


def local_names(folder):
    """The module names a spec in `folder` could import from it: its .py files and its packages."""
    out = set()
    for f in os.listdir(folder):
        p = os.path.join(folder, f)
        if f.endswith(".py"):
            out.add(f[:-3])
        elif os.path.isdir(p) and os.path.exists(os.path.join(p, "__init__.py")):
            out.add(f)
    return out


def forget(folder):
    """Drop every cached module loaded from `folder` (and below it)."""
    folder = os.path.abspath(folder)
    for k in [k for k, m in list(sys.modules.items()) if _inside(m, folder)]:
        del sys.modules[k]


def load(path, name="spec"):
    """Execute the spec at `path` as a fresh module named `name`, with its folder first on the path
    and every module it imports from that folder loaded from that folder. Returns the module."""
    path = os.path.abspath(path)
    folder = os.path.dirname(path)
    for k in local_names(folder):
        m = sys.modules.get(k)
        if m is not None and not _inside(m, folder):
            del sys.modules[k]                  # another unit's figs (or data, …): not this unit's
            for sub in [s for s in sys.modules if s.startswith(k + ".")]:
                del sys.modules[sub]
    sys.path.insert(0, folder)
    try:
        sp = importlib.util.spec_from_file_location(name, path)
        m = importlib.util.module_from_spec(sp)
        sp.loader.exec_module(m)
    finally:
        try:
            sys.path.remove(folder)
        except ValueError:
            pass
        forget(folder)
    return m
