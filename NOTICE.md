# License notice

`@hirobius/design-system` is under two licenses: MIT for the code, and the SIL Open Font License 1.1 for the bundled fonts. Its icon entry re-exports Lucide (ISC), listed below.

- **HDS code** (components, compiled JavaScript, types, CSS, and token files): MIT. See [LICENSE](LICENSE).
- **Sora** (variable, weights 100 to 800, by the Sora Project Authors, [source](https://github.com/sora-xor/sora-font), Latin subset, from `@fontsource-variable/sora` 5.3.0): SIL Open Font License 1.1.
- **Lucide icons** (`@hirobius/design-system/icons` re-exports a curated subset of [`lucide-react`](https://lucide.dev), a dependency; HDS does not own the glyphs): ISC License. Copyright (c) for portions of Lucide are held by Cole Bemis 2013-2022 as part of Feather (MIT). All other copyright (c) for Lucide are held by Lucide Contributors 2022. The full licence text ships with `lucide-react`.
- **IBM Plex Mono** (weight 400, by IBM, [source](https://github.com/IBM/plex)): SIL Open Font License 1.1.

Both fonts ship as woff2 files in `dist/fonts/`, declared by the opt-in `dist/fonts.css`; each font's license text ships beside it as `dist/fonts/<family>-LICENSE.txt`. The MIT license does not cover the fonts. `dist/tokens.css`, `dist/styles.css` and `dist/variables.css` embed no fonts.
