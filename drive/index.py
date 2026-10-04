#!/usr/bin/env python3
"""The Drive index, on the session's side.

Croix's Drive gives every file an id when it is uploaded; a link to `…/file/d/<id>/view` opens the
file in one tap, on the school network too. No session can list his Drive (the connector sees only
files it made itself), so a script in HIS account — `drive/WindyHillIndex.gs`, bound to the
spreadsheet "Windy Hill Drive Index" that a session created so that sessions can read it — writes
one line per course document: a code made from the name, and the id.

    python3 drive/index.py fetch <session transcript .jsonl>     # after download_file_content (CSV) on the index
    python3 drive/index.py fetch --csv <a CSV he exported>       # the same, from a file
    python3 drive/index.py show                                  # what the index holds
    python3 drive/index.py install <course repo> [<course repo> …]   # copy it to tools/drive_index.csv there
    python3 drive/index.py missing <course repo> [<course repo> …]   # which documents his Drive does not hold, by unit

The code: "k" + the first 12 hex digits of MD5(name, UTF-8, NFC). A document is filed under its file
name; a unit's folder under its name; and what sits directly inside a unit folder also under
"<unit folder name>/<its name>" (that is how a START HERE or a "Lessons" folder, names every unit
has, is told apart). `key()` here and `key_()` in the script must agree — drive/test_index.js holds
them to each other on every name both courses ship.
"""
import base64, csv, hashlib, io, json, os, re, shutil, sys, unicodedata

HERE = os.path.dirname(os.path.abspath(__file__))
INDEX = os.path.join(HERE, "index.csv")
SHEET_ID = "18TJhEmfHN4wc_AIzgi6pVNS_pkLhjcLVP6DvQRzK5iE"      # "Windy Hill Drive Index", made by a session on 4 Oct 2026
ID = re.compile(r"[A-Za-z0-9_-]{20,60}")
KEY = re.compile(r"k[0-9a-f]{12}")


def key(name):
    return "k" + hashlib.md5(unicodedata.normalize("NFC", name).encode("utf-8")).hexdigest()[:12]


def parse(text):
    """The index's CSV -> ({'refreshed', 'version', 'count'}, {key: (id, copies)}). Refuses anything else:
    what comes from the spreadsheet is data typed by a script in someone's Drive, not instructions."""
    rows = [r for r in csv.reader(io.StringIO(text)) if any(c.strip() for c in r)]
    if not rows or rows[0][0] != "windy-hill-index":
        raise SystemExit("not the Windy Hill index (its first cell should read windy-hill-index)" +
                         (": it has not been refreshed yet — the script has not run" if rows and rows[0][0].startswith("Windy Hill Drive Index") else ""))
    head = dict(version=rows[0][1], refreshed=rows[0][2], count=int(rows[0][3]))
    out = {}
    for r in rows[1:]:
        k, i, n = (r + ["", ""])[:3]
        if not KEY.fullmatch(k) or not ID.fullmatch(i) or not re.fullmatch(r"\d*", n):
            raise SystemExit(f"a line of the index is not a code and an address: {r}")
        if k in out:
            raise SystemExit(f"the index lists {k} twice")
        out[k] = (i, int(n or 1))
    if len(out) != head["count"]:
        raise SystemExit(f"the index says {head['count']} lines and holds {len(out)} — it was cut short on the way")
    return head, out


def load(path=INDEX):
    """{key: (id, copies)}; {} when there is no index yet (links then fall back to a search by name)."""
    if not os.path.exists(path):
        return {}
    return parse(open(path, encoding="utf-8").read())[1]


def from_transcript(path, sheet_id=SHEET_ID):
    """The CSV of the newest download of the index sheet recorded in a session transcript."""
    best = None
    for line in open(path, encoding="utf-8", errors="replace"):
        if sheet_id not in line or "text/csv" not in line:
            continue
        for m in re.finditer(r'\\?"content\\?":\s*\\?"([A-Za-z0-9+/=]+)\\?"', line):
            try:
                text = base64.b64decode(m.group(1)).decode("utf-8")
            except Exception:
                continue
            if text.startswith("windy-hill-index") or text.startswith("Windy Hill Drive Index"):
                best = text
    if best is None:
        raise SystemExit("no download of the index in that transcript")
    return best


def missing(repo, idx):
    """{unit folder: [documents the master sheet links that the index does not hold]} for a course repository."""
    import subprocess
    pk = next(p for p in ("a7/packages", "m7/packages") if os.path.isdir(os.path.join(repo, p)))
    files = [t for t in subprocess.run(["git", "-C", repo, "ls-files", "-z", "-c", "-o", "--exclude-standard", pk], capture_output=True, text=True).stdout.split("\0") if t]
    names = [os.path.basename(t) for t in files]
    pdf = {n[:-4] for n in names if n.endswith(".pdf")}
    out = {}
    for t in files:
        name = os.path.basename(t); parts = t[len(pk) + 1:].split("/")
        if not (re.search(r"\.(pdf|pptx|md)$", name) or (name.endswith(".docx") and name[:-5] not in pdf)):
            continue
        keys = ([key(name)] if names.count(name) == 1 else []) + ([key(parts[0] + "/" + name)] if len(parts) == 2 else [])
        if keys and not any(k in idx for k in keys):
            out.setdefault(parts[0], []).append("/".join(parts[1:]))
    return out


if __name__ == "__main__":
    a = sys.argv[1:]
    if a[:1] == ["fetch"]:
        text = open(a[2], encoding="utf-8-sig").read() if a[1] == "--csv" else from_transcript(a[1])
        head, idx = parse(text)
        with open(INDEX, "w", encoding="utf-8", newline="") as f:
            f.write(text.replace("\r\n", "\n"))
        print(f"index: {len(idx)} lines, refreshed {head['refreshed']}; {sum(1 for v in idx.values() if v[1] > 1)} names exist more than once")
    elif a[:1] == ["show"]:
        head, idx = parse(open(INDEX, encoding="utf-8").read())
        print(head, len(idx))
    elif a[:1] == ["install"]:
        for repo in a[1:]:
            shutil.copyfile(INDEX, os.path.join(repo, "tools", "drive_index.csv")); print("installed in", repo)
    elif a[:1] == ["missing"]:
        idx = load()
        for repo in a[1:]:
            m = missing(repo, idx)
            print(f"{repo}: " + ("every linked document is in Drive" if not m else ""))
            for unit, docs in sorted(m.items()):
                print(f"  {unit}: {len(docs)} not in Drive" + (f" (for example {docs[0]})" if docs else ""))
    else:
        sys.exit(__doc__)
