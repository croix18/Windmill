#!/usr/bin/env python3
"""The fixture rooms against room.schema.json: the well-formed ones must pass, the planted ones must fail."""
import json, os, sys, jsonschema
HERE = os.path.dirname(os.path.abspath(__file__)); ROOM = os.path.join(HERE, "..", "room")
schema = json.load(open(os.path.join(ROOM, "room.schema.json")))
V = jsonschema.Draft7Validator(schema)
MUST_FAIL = {"newer-version", "planted-name", "planted-score"}
bad = 0
for f in sorted(os.listdir(os.path.join(ROOM, "fixtures"))):
    name = f[:-5]; room = json.load(open(os.path.join(ROOM, "fixtures", f)))
    errs = [e.message for e in V.iter_errors(room)]
    if (name in MUST_FAIL) == bool(errs):
        print(f"  ok   {name}: {'rejected — ' + errs[0][:70] if errs else 'valid'}")
    else:
        print(f"  BAD  {name}: {'should have been rejected' if not errs else 'should be valid: ' + errs[0]}"); bad += 1
print(f"fixtures: {len(os.listdir(os.path.join(ROOM, 'fixtures')))} checked, {bad} wrong")
sys.exit(1 if bad else 0)
