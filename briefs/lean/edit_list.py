"""Builds a reword.py EDITS file without an old string being typed by hand (A7 Unit 11, 22 Nov 2026: 319 strings).

    import sys; sys.path.insert(0, "<windmill>/briefs/lean"); from edit_list import F, write
    F.ROOT = "<course>/build"             # the folder the files are relative to, as reword.py's --root
    f = F("u11/l01.py")
    f.lit('closure="', r'New text as it stands in the source (\" and \\$ written as the source writes them).')
    f.sub('old exact text', 'new exact text')            # a plain exact edit; count=N for more than one
    f.blk('**Undo the number added', r'**Isolate x.**  …')   # the whole literal that begins with these words
    write("/path/e_l01.py", [f])
    # then: python3 reword.py /path/e_l01.py --dry, and without --dry

lit() takes the double-quoted literal that follows the anchor (the anchor ends with the literal's opening quote) and
replaces all of it. The old string is read from the file as it is on disk, so the list that reword.py checks is exact.
Every list for one file is generated before any of them is applied: a generator run after an edit reads the edited file.
"""
import os


class F:
    ROOT = "."

    def __init__(self, rel):
        self.rel = rel
        self.src = open(os.path.join(F.ROOT, rel), encoding="utf-8").read()
        self.edits = []

    def lit(self, anchor, new, nth=1):
        assert anchor.endswith('"'), anchor
        n = self.src.count(anchor)
        assert n >= nth and (n == 1 or nth > 1 or n == 1), f"{self.rel}: anchor found {n} times: {anchor!r}"
        i = -1
        for _ in range(nth):
            i = self.src.index(anchor, i + 1)
        k = i + len(anchor)
        while self.src[k] != '"':
            k += 2 if self.src[k] == "\\" else 1
        old = self.src[i:k + 1]
        assert "\n" not in old, f"{self.rel}: literal runs over a line: {anchor!r}"
        newfull = anchor + new + '"'
        assert old != newfull, f"{self.rel}: nothing changes: {anchor!r}"
        assert self.src.count(old) == 1, f"{self.rel}: old literal found {self.src.count(old)} times: {old[:80]!r}"
        self.edits.append((self.rel, old, newfull))

    def blk(self, start, new):
        """Replace the whole double-quoted literal that begins with `start`."""
        anchor = '"' + start
        assert self.src.count(anchor) == 1, f"{self.rel}: literal start found {self.src.count(anchor)} times: {start!r}"
        i = self.src.index(anchor)
        k = i + 1
        while self.src[k] != '"':
            k += 2 if self.src[k] == "\\" else 1
        old = self.src[i:k + 1]
        assert "\n" not in old, f"{self.rel}: literal runs over a line: {start!r}"
        newfull = '"' + new + '"'
        assert old != newfull, f"{self.rel}: nothing changes: {start!r}"
        assert self.src.count(old) == 1
        self.edits.append((self.rel, old, newfull))

    def sub(self, old, new, count=1):
        got = self.src.count(old)
        assert (count == "all" and got >= 1) or got == count, f"{self.rel}: found {got}, wanted {count}: {old[:90]!r}"
        self.edits.append((self.rel, old, new) if count == 1 else (self.rel, old, new, count))


def write(path, files):
    n = 0
    with open(path, "w", encoding="utf-8") as fh:
        fh.write("EDITS = [\n")
        for f in files:
            for e in f.edits:
                fh.write("    " + repr(e) + ",\n")
                n += 1
        fh.write("]\n")
    print(f"{path}: {n} edits")
