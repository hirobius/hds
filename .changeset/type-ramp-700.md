---
'@hirobius/design-system': minor
---

Two-weight type ramp (Adrian, 2026-10-20, hds#847). Headings (`display`, `title`, `titleSm`, and the deprecated `h1`-`h3`) set in Sora 700, down from 800, and heading levels now differ by size: `display` 48→56px, `title` 24→28px, `titleSm` 18→20px. Two new size primitives carry them: `primitive.typography.size.display` (56px) and `primitive.typography.size.title` (28px); `titleSm` reads `size.xl`. `primitive.typography.weight.display` is 700. Body text goes from 450 to 400 (`primitive.typography.weight.regular`); ui, captions and labels stay at 500 and bold at 700.

The opt-in `fonts.css` now ships `fonts/sora-700.woff2` in place of `fonts/sora-800.woff2` (SIL OFL 1.1, licence alongside, overlaps flattened like before). If you load Sora yourself, load the 700 weight.

Alert titles now use the `titleSm` role (Sora 20px / 700) instead of `ui`, so they read as headings; the message stays in `caption`.
