#!/usr/bin/env bash
# mkcopy.sh NAME [SRC]  → /home/claude/lean/b-NAME/build : an isolated copy of the course's build folder
# (the kit, course.py, the models, every unit's specs; no out/, no figs/ cache), ../reference beside it
# (checks.py's suitecheck reads the rulebook there) and /home/claude/lean/home-NAME for LibreOffice.
set -euo pipefail
NAME=$1; SRC=${2:-/home/claude/croix18-windy-hill-a7/a7/build}
DST=/home/claude/lean/b-$NAME/build
mkdir -p "$DST" /home/claude/lean/home-$NAME
(cd "$SRC" && tar cf - --exclude=./out --exclude=./figs --exclude=__pycache__ .) | (cd "$DST" && tar xf -)
ln -sfn "$(cd "$SRC/../reference" && pwd)" "/home/claude/lean/b-$NAME/reference"
echo "$DST"
