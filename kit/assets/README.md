# Vendored assets: the slide font, and what the HTML decks inline (htmlkit.py)

**Since ruling 41 (5 October 2026) no course builds HTML** — a deck is its PowerPoint, run as Google
Slides. What the PowerPoint uses from here is `Lexend-Regular.ttf` and `Lexend-Bold.ttf` (measuring
every line, and installed for LibreOffice so the PDF is drawn in Lexend). Everything else below is
the HTML path, kept and still tested, and switched on by `HTML = True` in a course's `course.py`.

Every `<course> <code>  Slides.html` inlines all of these, so a deck is ONE file that needs no network.
Regenerate everything with `python3 make_assets.py <katex dist folder>` (the folder from
`npm pack katex@0.19.0`); without the argument only the fonts are rebuilt.

- `katex.min.js`, `katex.inline.css` — KaTeX 0.19.0 (MIT, see KATEX-LICENSE). The CSS is the shipped
  `katex.min.css` with every `@font-face` source replaced by its `.woff2` inlined as a data URI.
- `Lexend-Regular.ttf`, `Lexend-Bold.ttf` — Lexend, the slide font (ruling 40; SIL Open Font
  License, `LEXEND-OFL.txt`; from github.com/googlefonts/lexend). `deckkit` measures every line of
  slide text with these files and installs them for LibreOffice (`~/.local/share/fonts/windy-hill`)
  the first time it is loaded, so a new machine renders the PDFs in Lexend without being told.
- `lexend-regular.woff2`, `lexend-bold.woff2` — the same two faces for the HTML decks, whole.
- `lexend-fallback.woff2` — the signs of the block list that Lexend has no glyph for (arrows, the
  angle and triangle signs, the tick), cut from DejaVu Sans, so none of them falls back to
  whatever the browser happens to have. The PowerPoint sets those signs in DejaVu Sans by name.
- `WindyPi.ttf`, `windypi.woff2` — a face of ONE glyph: π, cut from STIX General Bold as matplotlib
  ships it (SIL Open Font License, `STIX-OFL.txt`; renamed, as the licence asks). A slide never
  uses Lexend's own π (a flat-topped box): `deckkit` names WindyPi for a π in a run of words and
  installs it for LibreOffice beside Lexend, the HTML decks list it first in every font stack, and
  `mathimg` sets the same glyph in an expression. Rebuilt by `make_assets.py` (`make_pi`).
