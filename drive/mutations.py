#!/usr/bin/env python3
"""Does drive/test_windyhill.js notice when drive/WindyHill.gs is wrong?

    python3 drive/mutations.py [<a7 repo> <m7 repo>]      # about ten minutes on two cores

Each entry below breaks the script in one way — one piece of text replaced — and the test is run
on the broken copy (WINDYHILL_GS). The test must fail every time. An entry whose text is no longer
in the script exactly once is reported too: the script moved on and the entry must follow.

Run it after changing the script or the test. It is not part of tools/check.sh (too slow); what
it protects is the claim "the test would have noticed".
"""
import concurrent.futures as cf, os, subprocess, sys, tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = open(os.path.join(HERE, "WindyHill.gs"), encoding="utf-8").read()
REPOS = sys.argv[1:3] if len(sys.argv) >= 3 else [os.path.join(HERE, "..", "..", "croix18-windy-hill-a7"), os.path.join(HERE, "..", "..", "windy-hill-m7")]
OUT = tempfile.mkdtemp(prefix="windyhill_mut_")

# (what goes wrong, the script's text, what it is replaced with)
M = [
 ("download not held to its git name", "if (gitSha_(body) !== want[p].sha) {", "if (false) {"),
 ("git name without the NUL", "'blob ' + bytes.length + '\\u0000'", "'blob ' + bytes.length"),
 ("a touched file counts as edited", "if (now !== null && now === s.md5) { s.changed = t; return false; }", ""),
 ("an edited file counts as untouched", "  if (now !== null && now === s.md5) { s.changed = t; return false; }        // touched — renamed, described — but the same contents\n  return true;", "  return false;"),
 ("edit time ignored", "if (t <= s.changed + 2000) return false;", "return false;"),
 ("his file identical: not re-examined", "      if (!same_(known, w)) return false;                                     // your own file, in the published one's place\n      adopt_(p, known, w, state, R, cx); return false;", "      return false;"),
 ("lost copy not taken on", "if (m.sha === w.sha && !got) {", "if (false) {"),
 ("stale labelled copy not binned", "if (untouched) { bin_(f, note); return; }", ""),
 ("unlabelled exact copy not taken on", "if (his && same_(his, w)) {", "if (false) {"),
 ("taking on does not bin the copy on record", "    adopt_(p, his, w, state, R, cx);\n    if (before) bin_(before, note);", "    adopt_(p, his, w, state, R, cx);"),
 ("his file in place: ours put beside it", "if (his && !known) { state[p] = row_('', his.getId(), 'theirs', 0, 0, 'yours', R.repo, ''); return false; }", ""),
 ("replaced copy not binned", "  if (old) bin_(old, cx.note);\n  cx.note.put++; cx.unsaved++;", "  cx.note.put++; cx.unsaved++;"),
 ("no rename when the bin refuses", "    if (name.indexOf('OLD - ') !== 0) f.setName('OLD - ' + name);", ""),
 ("empty folders not binned", "if (empty) f.setTrashed(true);", ""),
 ("folders binned with his file in them", "while (empty && it.hasNext()) if (!it.next().isTrashed()) empty = false;", ""),
 ("forgotten folders stay on record", "    } catch (e) { /* gone already, or not this account's to bin */ }\n    delete state[d];", "    } catch (e) { /* gone already, or not this account's to bin */ }"),
 ("check everything checks only some", "var limit = cx.full ? paths.length - at : Math.min(AUDIT, paths.length), n = 0;", "var limit = Math.min(AUDIT, paths.length), n = 0;"),
 ("full check never ends", "if (n >= limit) { props.deleteProperty('full'); props.deleteProperty('full-at');", "if (false) { props.deleteProperty('full'); props.deleteProperty('full-at');"),
 ("never replaced in place", "if (cur && safe && props.getProperty('inplace') !== 'no') {", "if (false) {"),
 ("in-place failure not remembered", "else { cur.sha = ''; cur.state = 'ok'; props.setProperty('inplace', 'no');", "else { cur.sha = ''; cur.state = 'ok';"),
 ("not flagged before replacing", "      flag_(SpreadsheetApp.openById(cur.id));\n", ""),
 ("Drive tab written while new contents are awaited", "if (!m || m.filling) return;", "if (!m) return;"),
 ("ticks not put by before replacing", "if (cur && cur.state !== 'ticks') safe = keep_(R, cur, cx);", ""),
 ("ticks not written back", "      ticksWrite_(open_(cur.id), kept).forEach(function (t) {", "      [].forEach(function (t) {"),
 ("ticks keyed by lesson only", "if (r[7] !== '' || r[8] !== '' || r[10] !== '') out.push([l + ' #' + seen[l], String(r[7]), String(r[8]), String(r[10])]);", "if (r[7] !== '' || r[8] !== '' || r[10] !== '') out.push([l + ' #1', String(r[7]), String(r[8]), String(r[10])]);"),
 ("lost ticks not logged", "cx.note.log.push(R.course + ': a tick has no row", "void (R.course + ': a tick has no row"),
 ("live sheet not found again by name", "    if (found) { cur = state[key] = row_('', found.getId(), 'live', 0, 0, 'ok', R.repo, ''); curFile = found; }", ""),
 ("a deleted live sheet is not noticed", "if (cur && !curFile) { delete state[key]; cur = null; }", ""),
 ("v2 update without convert", "else Drive.Files.update({ mimeType: SHEETS }, id, blob, { convert: true });", "else Drive.Files.update({ mimeType: SHEETS }, id, blob);"),
 ("Google copy does not stand for the Office file", "if (!(tab[k] && tab[k].what === f.name) && NATIVE[f.mime]) stands = f.name + NATIVE[f.mime];", ""),
 ("Drive tab rewritten every run", "var changed = props.getProperty('tab') !== digest || !props.getProperty('tab-at') || !ss.getSheetByName('Index');", "var changed = true;"),
 ("an emptied Drive tab is not noticed", "if (top[0] === rows[0][0] && top[1] === FORMAT && top[2] === stamp && top[3] === rows[0][3] && sh.getLastRow() === rows.length) return;", "if (!changed) return;"),
 ("token's date never a DO SOON", "if (days <= 14) note.soon.push", "if (days <= -1) note.soon.push"),
 ("emails at first sight", "if (!since) { props.setProperty('trouble', String(now)); return; }", "if (!since) { props.setProperty('trouble', String(now)); since = now - 3600000; }"),
 ("no six-hour floor", "if (ago < 6 * 3600000) return;", ""),
 ("same thing mailed every time", "if (last[0] === digest && ago < (note.errors.length ? 24 : 72) * 3600000) return;", ""),
 ("no all-clear", "if (props.getProperty('mailed') && to) {", "if (false) {"),
 ("trouble never cleared", "    props.deleteProperty('trouble'); props.deleteProperty('mailed');\n    return;", "    return;"),
 ("no retry", "if (n >= 2) { if (res) return meter_(res);", "if (n >= 0) { if (res) return meter_(res);"),
 ("batch failure not retried singly", "try { out = UrlFetchApp.fetchAll(reqs); } catch (e) { out = null; }", "out = UrlFetchApp.fetchAll(reqs);"),
 ("5xx in a batch not retried", "if (r && r.getResponseCode() < 500) return meter_(r);", "if (r) return meter_(r);"),
 ("no pause on GitHub's allowance", "if (GH_.left !== null && GH_.left < 30) { note.paused = 'GitHub\\'s hourly allowance of requests is used up'; return false; }", ""),
 ("Google's allowance is a PROBLEM", "if (quota_(e)) {", "if (false) {"),
 ("a pause still chains", "var goOn = (note.todo > 0 || note.again) && !note.paused && !!token;", "var goOn = (note.todo > 0 || note.again) && !!token;"),
 ("running flag never cleared", "try { props.deleteProperty('running'); } catch (e4)", "try { } catch (e4)"),
 ("record never written mid-copy", "if (cx.unsaved >= SAVE_EVERY) cx.save();", ""),
 ("headers read case-sensitively", "low[k.toLowerCase()] = h[k];", "low[k] = h[k];"),
 ("time-zone offset ignored", "if (z && z !== 'UTC' && z !== 'Z') {", "if (false) {"),
 ("no bytes fallback for the fingerprint", "try { return f.getSize() <= HASH_MAX ? hex_(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, f.getBlob().getBytes())) : null; } catch (e2) { return null; }", "return null;"),
 ("master folder made when it cannot be seen", "  throw new Error('This account cannot see \"' + HOME", "  return DriveApp.getFoldersByName(HOME).hasNext() ? null : child_(DriveApp.getFolderById(Object.keys({})[0] || HOME_ID), HOME); throw new Error('This account cannot see \"' + HOME"),
 ("too-large files tried", "if (want[p].size > MAX_BYTES) {", "if (false) {"),
 ("description without the fingerprint", "return 'From Claude (' + R.repo + ' ' + sha + ' ' + md5 + ').", "return 'From Claude (' + R.repo + ' ' + sha.slice(0, 10) + ').")
 ,("head marked done despite a failure", "if (j.i >= j.todo.length && !j.failed && !cx.note.paused) cx.props.setProperty", "if (j.i >= j.todo.length && !cx.note.paused) cx.props.setProperty"),
 ("withdrawn file he edited is binned", "if (f && (s.state.indexOf('yours') === 0 || edited_(s, f))) { s.state = 'yours-unpublished'; return; }", ""),
 ("My versions ignored", "tab[k].id = newest[name].id;", ""),
 ("no warning when a newer one is published", "if (published[name] > newest[name].changed) note.behind.push(name);", ""),
 ("Status not dressed", "  dress_(st, s, cx);\n}", "}"),
 ("workings tabs in view", "if (hidden) { try { sh.hideSheet(); }", "if (false) { try { sh.hideSheet(); }"),
 ("log grows without end", ".slice(0, LOG_LINES + 1);", ";"),
 ("problems logged every run", "if (trouble !== (props.getProperty('logged') || '')) {", "if (true) {"),
 ("email address not checked", "if (!/^[^\\s@,;]+@[^\\s@,;]+\\.[^\\s@,;]+$/.test(a)) {", "if (false) {"),
 ("token shown in the dialog", "ui.alert('Saved.\\n\\n' + seen", "ui.alert('Saved ' + t + '.\\n\\n' + seen"),
 ("hourly-off not said", "if (!note.hourly) note.soon.push", "if (false) note.soon.push"),
 ("space not said", "if (used / limit > 0.85) note.soon.push", "if (false) note.soon.push"),
 ("moved file binned on a new edition", "if (known && !inPlace_(known, folder.getId())) { delete state[p]; s = null; known = null; }", ""),
 ("moved file binned when withdrawn", "if (f && !inPlace_(f, placeId_(p, state, cx))) f = null;", ""),
 ("full account called a pause", "if (/storage/i.test(String(e && e.message))) {", "if (false) {"),
 ("his file kept when ours is withdrawn too", "if (s.kind === 'theirs' && !want[p]) { delete state[p]; return; }", "if (false) { return; }"),
 ("state lost on a read error", "save: function () { if (!loaded) return;", "save: function () {"),
 ("naming a file's contents leaves them changed", "  finally { bytes.splice(0, head.length); }", "  finally { }"),
 ("consoles and master sheets not fetched first", "var rank = function (p) { return p.indexOf('Apps:') === 0 ? 0 : p.indexOf('/') < 0 ? 1 : 2; };", "var rank = function (p) { return 2; };"),
 ("one course fetched to the end before the next begins", "    jobs.forEach(function (j) { if (step(j)) going = true; });", "    jobs.forEach(function (j) { while (step(j)) going = true; });"),
 ("an unexpected error in one course stops the run", "try { return batch_(j, state, cx); } catch (e) { j.failed++; j.stop = true; cx.note.errors.push(j.R.course + ': ' + e.message); return false; }", "return batch_(j, state, cx);"),
 ("any account may run it", "return !!mark && PropertiesService.getUserProperties().getProperty('account') === mark;", "return true;"),
 ("an account that no longer runs it keeps its trigger", "{ clear_('sync'); clear_('syncMore'); }", "{ }"),
 ("a second account may set it up", "if (mark && !mine_()) throw new Error(", "if (false) throw new Error("),
 ("another account may set a token", "  if (!allowed_()) return;\n  var ui = SpreadsheetApp.getUi();\n  var r = ui.prompt('GitHub token'", "  var ui = SpreadsheetApp.getUi();\n  var r = ui.prompt('GitHub token'"),
 ("another account may turn the hourly sync on", "  if (mine_()) ScriptApp.newTrigger('sync').timeBased().everyHours(1).create();\n  else SpreadsheetApp.getUi().alert(whose_());", "  ScriptApp.newTrigger('sync').timeBased().everyHours(1).create();"),
]


def one(k):
    name, a, b = M[k]
    if SRC.count(a) != 1:
        return name, f"NOT IN THE SCRIPT ONCE (found {SRC.count(a)} times): update this entry"
    path = os.path.join(OUT, f"m{k}.gs")
    open(path, "w", encoding="utf-8").write(SRC.replace(a, b))
    r = subprocess.run(["node", os.path.join(HERE, "test_windyhill.js")] + REPOS, env=dict(os.environ, WINDYHILL_GS=path), capture_output=True, text=True, timeout=900)
    os.remove(path)
    if not r.returncode:
        return name, "MISSED: the test passed"
    said = (r.stdout.strip().split("\n") or [""])[0] or "the test crashed: " + (r.stderr.strip().split("\n") or [""])[-1]
    return name, "noticed: " + said[:140]


if __name__ == "__main__":
    with cf.ThreadPoolExecutor(os.cpu_count() or 2) as ex:
        res = list(ex.map(one, range(len(M))))
    for name, r in res:
        print(("   " if r.startswith("noticed") else "!! ") + name + " -> " + r)
    bad = [x for x in res if not x[1].startswith("noticed")]
    print(f"{len(res) - len(bad)} of {len(res)} ways of breaking the script were noticed" + (f"; {len(bad)} were not" if bad else ""))
    sys.exit(1 if bad else 0)
