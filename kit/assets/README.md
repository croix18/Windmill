# Vendored assets for the HTML decks (htmlkit.py)

Every `<course> <code>  Slides.html` inlines all of these, so a deck is ONE file that needs no network.
Regenerate everything with `python3 make_assets.py <katex dist folder>` (the folder from
`npm pack katex@0.19.0`); without the argument only the fonts are rebuilt.

- `katex.min.js`, `katex.inline.css` — KaTeX 0.19.0 (MIT, see KATEX-LICENSE). The CSS is the shipped
  `katex.min.css` with every `@font-face` source replaced by its `.woff2` inlined as a data URI.
- `schola-*.woff2` — TeX Gyre Schola (GUST font licence), the free Century Schoolbook clone the pptx
  decks already render with under LibreOffice, subset to a fixed generous block list (Latin-1 and
  Extended-A, punctuation, currency, letterlike, arrows, mathematical operators, Greek: 442 code
  points), not to the characters today's specs happen to use.
