---
'@hirobius/design-system': patch
---

Box: on React 19, `sx` rules now render as a hoisted `<style href precedence="hds-sx">`, so they ship in server HTML and a server-rendered Box no longer changes size when the page hydrates (hds#770). React 18 keeps the existing client-side injection.
