# TurboLists website

Static landing page. A single `index.html` with inline CSS and JS and no build
step, so it can be dropped on any static host (GitHub Pages, Cloudflare Pages,
Netlify) as-is.

Preview locally from the repo root:

    deno task website

The hero demo mirrors `tripChecklist` in `packages/core/src/views.ts`: kits are
merged in trip order and each item is kept at its first occurrence.
