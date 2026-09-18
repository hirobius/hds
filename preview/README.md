# Preview bench

A single-page harness that renders the real HDS components under the real token
layer, with the system's knobs exposed as live controls and a readout measured
from the rendered DOM.

```sh
pnpm preview:build      # -> preview/dist
```

It exists because the repo's ~60 `check-*` validators are all textual: they read
source and tokens and never render a pixel. A whole class of defect is invisible
to them — a control that computes `width: 8px` but lays out at 0 because its span
is `display: inline`, foreground text on a surface that isn't there, a radius
utility that disagrees with the token it is supposed to resolve to. The bench
renders those, and prints the numbers beside them.

## Why it is built separately from the library

- **Per-file imports, not `src/index.ts`.** The barrel pulls `command-palette`,
  which needs the `virtual:hds-manifest` plugin. The bench stubs that module and
  imports each component directly.
- **One inlined chunk.** When published as an Artifact there is no import map,
  and the CSP's CDN allowlist does not cover the 14 Radix packages the library
  depends on. Everything is bundled.
- **The chrome is not token-driven.** The rail and the readout use their own
  `--pv-*` variables. If they reskinned along with the stage you could not tell
  what the knob changed.
- **The stage carries `data-theme`, the document does not.** When published, the
  host stamps the viewer's theme on the root element; writing there too would
  fight it.

## Publishing it

`preview/dist` is a static bundle. Published as an Artifact it needs `app.js`,
`app.css` and `public/fonts/**` alongside `index.html`, with the font URLs in
`app.css` rewritten from `/fonts/…` to `./fonts/…` — the bundled CSS emits them
absolute, and an artifact serves its files relative to its own root.
