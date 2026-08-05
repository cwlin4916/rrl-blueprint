# Vendored assets

[KaTeX](https://katex.org) 0.16.11 — `katex.min.js`, `katex.min.css`, `fonts/*.woff2`,
MIT licensed (`LICENSE-katex.txt`).

Vendored rather than loaded from a CDN so that `blueprint_site/dag.html` makes no external requests:
it opens from `file://`, works offline, and cannot break when someone else's host changes.
The CSS ships woff2 only; the `woff`/`ttf` fallbacks were stripped, and every browser that
runs the page supports woff2.

To upgrade: replace `katex.min.js`, `katex.min.css` and `fonts/*.woff2` from a KaTeX release,
re-strip the non-woff2 `src:` entries from the CSS, and re-run `python3 tools/build_dag_site.py`.
