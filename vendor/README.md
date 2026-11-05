# Vendored dependency

`marked.esm.js` is the unmodified distribution file from **marked 17.0.5**, copied from the locally installed bundled runtime. Upstream: https://github.com/markedjs/marked . Its MIT license is preserved as `marked.LICENSE.md`.

The renderer is vendored so content builds require only Node.js, without an install step or CDN. Upgrade deliberately, retain the upstream license, and rerun the build and link checks. Markdown is trusted author-written repository content, not arbitrary visitor input.

## KaTeX 0.19.1 (2026-11-05)

`katex.mjs` and `katex.LICENSE` are unmodified files from the official npm package https://registry.npmjs.org/katex/-/katex-0.19.1.tgz (tarball SHA-256: `24da5a599eb2fcede2e270b99a6ff48bca816beecc95feeb84e8cccbd1bb34fd`). Its unmodified `dist/katex.min.css` and `dist/fonts/*` are served from `assets/katex/`. Upstream: https://github.com/KaTeX/KaTeX . The MIT license is retained.

`templates/math.mjs` adds math tokens to Marked and renders HTML/MathML during the build. Browser-side KaTeX JavaScript is unnecessary. Styles are linked only on pages containing rendered math. Keep the renderer, CSS and fonts on the same pinned release when upgrading.
