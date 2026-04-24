# abaret.github.io

A modern, single-page academic CV / portfolio for **Amaury Baret** — condensed-matter physicist working on stochastic media, metallic nanowire networks, and thermochromic coatings.

The site is a hand-rolled departure from the usual academic-pages template: one long editorial page, dark by default, with a custom three-circle Venn diagram that cross-links research themes with experimental and computational skills.

## Design

- **Editorial layout.** Hairline rules, small-caps labels, EB Garamond for display, Inter for body, JetBrains Mono for metadata.
- **Dark / light theme.** Persisted in `localStorage`, system preference as fallback on desktop, dark forced on phones.
- **Ambient particle network.** Canvas-rendered drifting nodes in the background; repels from the cursor, thinned and dimmed on mobile.
- **Interactive Venn.** Hover or tap a circle / legend pill / card to pin a side; ribbons re-draw from rim anchors to the active cards. Collapses to a plain grouped list on phones.
- **Publications.** Source-of-truth array in `portfolio.js`; selected/all toggle, topic filter chips derived from the data, reverse numbering.
- **Mobile-first polish.** Long lists become scrollable windows with a fade mask and a "scroll ↓" cue so the content-beyond-the-fold is discoverable.

## Stack

- [Jekyll](https://jekyllrb.com/) + GitHub Pages (fork of [academicpages](https://academicpages.github.io/), most of which is now unused — the portfolio page is self-contained).
- Vanilla JS, no build step, no framework.
- Single CSS file scoped under `#portfolio-root`.

## Layout

```
index.html                          → the portfolio page (all content)
assets/
  css/portfolio.css                 → scoped styles + mobile adaptation
  js/portfolio.js                   → theme toggle, particles, Venn, publications
files/                              → PDFs (CV, reprints, BibTeX)
_config.yml                         → Jekyll config (mostly unused)
```

Everything user-facing lives in those three files. The rest is Jekyll scaffolding inherited from the template.

## Running locally

```bash
bundle install
bundle exec jekyll serve -l -H localhost
```

Then open `http://localhost:4000`. `portfolio.css` / `portfolio.js` are plain static assets — editing them and refreshing is enough, no rebuild needed.

## Editing content

- **Publications, talks, news:** inline in `index.html`, except publications which are a data array at the top of `portfolio.js` (ORBi is the source of truth).
- **Research Venn cards:** inline in `index.html`, one `<article class="pf-card">` per card; `data-id` / `data-side` drive the interactive behaviour.
- **Theme tokens:** CSS custom properties on `#portfolio-root` and `#portfolio-root[data-theme="light"]` in `portfolio.css`.

## License

Template scaffolding inherited from [academicpages](https://github.com/academicpages/academicpages.github.io) under its original MIT license. Content (text, figures, styling) © Amaury Baret.
