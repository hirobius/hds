---
'@hirobius/design-system': patch
---

Smaller Button: the `./button` graph drops from 5.79 kB to 3.8 kB gzip. Motion timing read the whole primitive token tree to get four durations; it now imports only the duration group, so bundlers drop the rest. No API or visual change.
