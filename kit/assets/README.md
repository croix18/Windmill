# Vendored assets for the HTML decks (htmlkit.py)

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
