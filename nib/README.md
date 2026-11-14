# Nib — the handwriting engine, as the kit carries it

`nib.js` is the built engine from [croix18/Nib](https://github.com/croix18/Nib) (`dist/nib.js`, about 1.3 MB: the
recognizer, its models, the solver, the in-place views, the `<nib-pad>` element — since 1.6 an endless canvas with pens,
markers, highlighters, shapes, text, pictures and papers — its PDF writer and the typeset fonts). It is copied here
unchanged on each Nib release; `VERSION` names the release and the Nib commit it came from. Nib's own repository is the
source of truth — its training pipeline, tests and handoff live there — and nothing in this folder is edited by hand.

## Taking it into a tool

A tool that reads handwriting or works out answers pastes the engine in at build time, the way Nib Board does:

```html
<script>/*ENGINE*/</script>
```

and its build replaces the marker with the file (`python3 ../Windmill/tools/vendor_nib.py <tool repo>` copies `nib.js` and
`VERSION` into the tool's `vendor/nib/`; the tool's build reads them from there). A tool never fetches the engine at run time:
the Chromebox opens files from Drive with no network.

What it gives: `Nib.recognize(strokes, options)` → LaTeX and a reading tree; `Nib.solve(input, options)` → the answer after
an "=" or "x =" (exact fractions, letters, equations, quadratics, formulas); `<nib-pad>` → a writing surface with the views,
answers and the training log; `Nib.neaten` / `Nib.typeset` → a reading drawn in place; `Nib.canvas` (1.6) → the canvas's parts for a page that holds
a board: named colors, the papers and their thumbnails, shapes (number lines, coordinate planes), `pdf(pages)`, stroke
packing and the picture store. Options the classroom tools share:
`times: false` (x is always a letter; multiply with · or brackets — Croix's class convention), `symbols: 'school'`.

Inside a tool that has its own drawing (1.6.3; Deckhand's Sketch Pad and its pen over the slides use both — Deckhand's
`tools/vendor_nib.py` takes the engine from here): `<nib-pad page="1280 960">` is a fixed page shown whole and centred,
and `<nib-pad draw="answers">` draws only the answers over the tool's own ink, which it hands over with
`pad.syncStrokes(list, moved)` (`answerAt` / `showAnswer` / `hideAnswer` for its taps). For a tool whose old pad wrote
with every touch: `palm="false"` and `single`; `keep` keeps a pad alive while its card is rebuilt. With `reveal`, an
answer waiting for a tap is drawn blurred where it goes. Nib's README, "Inside another tool", has the details.

Scribbling out (1.6.5): on a `<nib-pad>`, a pen or marker stroke scribbled back and forth (or round and round) over writing
rubs out what it lies over, as one step of Undo, and fires `nib:scribble` (`{erased, hidden, step}`; `pad.undoScribble(step)`
is a note's Undo); `scribble="false"` turns it off. A tool with its own ink asks the engine: `Nib.scribble.of(points, z)`
(is this stroke a scribble) and `Nib.scribble.erase(scribble, items, z)` (which of its strokes it takes) — Deckhand's pen
over the slides does. An answer keeps the look it was first drawn with: `getState()` carries it (`looks`), so a tool that
saves the pad's state draws each answer as it was when it is opened again.

## What it stores in the browser (per origin; Chrome's file:// pages share one)

| key | written by | read by |
| --- | --- | --- |
| `nib-memory-v1` | corrections (Fix) and the Replicator's Teach Nib | every tool with the engine, to lean toward this writer's shapes; kept per network (`Nib.memory.model`), so a new engine starts empty — Nib Board teaches it again from the training log's corrections (1.5.3) |
| `nib-hand-v1` | a Replicator file opened in a tool (My handwriting) | the "My hand" view |
| `replicator-v1` | the Replicator's own saved work (`avg`: the averaged letters) | the "My hand" view, newest of the two wins |
| `nib-board-v3` | Nib Board 1.6: pages (each with its paper and view), corrections, settings | Nib Board |
| `nib-board-v1` | Nib Board 1.5 and before | Nib Board 1.6 reads it once when there is no `nib-board-v3`, and leaves it as it was |
| IndexedDB `nib-board` (store `images`) | Nib Board: the pictures on its pages, by id | Nib Board |
| `nib-train-v1` | Nib Board: the training log (strokes, readings, corrections, drill labels) | Save training → a file for fine-tuning |
| `nib-drill-v1` | Nib Board: the drill's position | Nib Board |

A tool of its own that embeds the engine must not write these keys, nor take the Web Lock `nib-board` (with it Nib Board
lets only one tab save); it keeps its own (`<tool>-v<n>`), and the engine's memory stays shared.

## Updating

In Nib: build, test, push, then copy `dist/nib.js` here, write `VERSION`, run `tools/check.sh`, push. Tools re-vendor when
they next rebuild; `vendor/nib/VERSION` in each says which release it carries.
