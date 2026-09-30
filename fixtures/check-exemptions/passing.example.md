# Passing exemption example

This file uses only known, well-reasoned exemption markers.

Some inline style: `// inline-ok: this is a known exemption with a valid reason`

A spacing exemption: `// spacing-ok: viewport-scale value, not a component spacing token`

Markers that other gates define and document must be known here too, or the two
gates disagree about one vocabulary:

- check-spacing-vocabulary.mjs: `// spacing-vocab-ok: intentional legacy exception`
- no-css-var-in-motion-animate.test.ts: `// motion-animate-var-ok: colour driven by a cva variant instead`
