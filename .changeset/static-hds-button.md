---
'@hirobius/design-system': patch
---

`static.css` gains `.hds-button`: style an `<a>` (or a `<button>`) as a Button without the JS root entry. Variants `--primary`, `--secondary` (the default), `--tertiary` and `--link`; sizes `--sm`, `--md` (the default) and `--lg`; the focus ring; and a disabled state through `disabled` or `aria-disabled="true"`. Every value is a `--component-button-*` token, held in parity with the Button component by a test. The hard edge, hover wipe and status tones stay in the React `Button`.
