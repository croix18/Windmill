#!/usr/bin/env python3
"""Every build gate over a unit's specs, without building anything — the layer of the suite that
needs no LibreOffice and no browser, so it runs before every push (tools/check.sh) and in CI.

    python3 gates.py            every unit folder (uN/) beside this file
    python3 gates.py u4 u5      the units named

What it runs is exactly what build_lesson and build_unit run before they draw a page — mathcheck,
distractorcheck, capcheck, rulingcheck (the IXL plan among its rules), balancecheck by lesson and
across the unit, and for the unit's papers unitcheck with the parallel-forms and shared-answer
checks — and it first holds this copy of the kit to KIT.sha256, the rule checks.py calls kitcheck.
A unit with no specs, or a run that examined nothing, is a finding. Exit 1 on any finding.
(Part of the shared build kit — edit it in croix18/Windmill, kit/.)"""
import os, sys, glob, hashlib, importlib.util
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)


def kit_findings():
    man = os.path.join(HERE, "KIT.sha256")
    if not os.path.exists(man):
        return ["kit: no KIT.sha256 beside gates.py — vendor the kit from Windmill"], 0
    out, n, listed = [], 0, set()
    for line in open(man, encoding="utf-8"):
        if not line.strip() or line.startswith("#"):
            continue
        want, rel = line.split(None, 1); rel = rel.strip(); listed.add(rel); n += 1
        p = os.path.join(HERE, rel)
        if not os.path.exists(p):
            out.append(f"kit: {rel} is in the kit and missing here")
        elif hashlib.sha256(open(p, "rb").read()).hexdigest() != want:
            out.append(f"kit: {rel} differs from the published kit — make the change in Windmill (kit/) and vendor it")
    for p in sorted(glob.glob(os.path.join(HERE, "lib", "*.py"))):
        rel = os.path.relpath(p, HERE).replace(os.sep, "/")
        if rel not in listed:
            out.append(f"kit: {rel} is not part of the kit — course code lives outside lib/")
    return out, n


def load(path, name):
    sys.path.insert(0, os.path.dirname(path))          # a spec may import its unit's figs.py
    try:
        sp = importlib.util.spec_from_file_location(name, path)
        m = importlib.util.module_from_spec(sp); sp.loader.exec_module(m)
    finally:
        sys.path.pop(0)
    return m


def unit_findings(unit):
    from lib import lessonbuild as lb, slotmark, unitbuild
    from lib.profile import C
    specs = sorted(glob.glob(os.path.join(HERE, unit, "l[0-9][0-9].py")))
    review = os.path.join(HERE, unit, "review.py")
    if C.REVIEW_IN_DECK and os.path.exists(review):
        specs.append(review)
    if not specs:
        return [f"{unit}: no lesson specs"], 0
    out, items, lessons = [], 0, []
    for f in specs:
        P = slotmark.strip_deep(load(f, "l").L); lessons.append(P)
        fnd, n = lb.mathcheck_lesson(P); items += n
        out += (fnd + lb.distractorcheck_lesson(P) + lb.capcheck_lesson(P)
                + lb.rulingcheck_lesson(P) + lb.balancecheck_lesson(P))
    out += lb.balancecheck_unit(lessons)
    uf = os.path.join(HERE, unit, "unit.py")
    if os.path.exists(uf):
        U = slotmark.strip_deep(load(uf, "u").U)
        fnd, n = unitbuild.check_unit(U); items += n; out += fnd
        if unitbuild.has_forms(U["assessment"]):
            out += unitbuild.check_forms(U["assessment"]) + unitbuild.check_distinct(U["assessment"])
    print(f"gates {unit}: {len(specs)} specs{' and unit.py' if os.path.exists(uf) else ''}, "
          f"{items} items re-derived, {len(out)} findings")
    if not items:
        out.append(f"{unit}: nothing was re-derived")
    return out, items


if __name__ == "__main__":
    units = [a.rstrip("/") for a in sys.argv[1:]] or sorted(
        os.path.basename(d) for d in glob.glob(os.path.join(HERE, "u[0-9]*")) if os.path.isdir(d))
    findings, n = kit_findings()
    print(f"kit: {n} files hashed against KIT.sha256, {len(findings)} findings")
    if not units:
        findings.append("gates: no unit folders")
    for u in units:
        f, _ = unit_findings(u); findings += f
    for f in findings:
        print("  FINDING", f)
    print(f"gates: {len(findings)} findings")
    sys.exit(1 if findings else 0)
