---
'@hirobius/design-system': patch
---

Graphite primary fill reads at full strength (hds#887): the default accent rest is near-black (`graphite.950`) in light and near-white (`graphite.50`) in dark, so a primary Button no longer looks washed-out or disabled. Hover and pressed step from it (light `800`/`900`, dark `100`/`200`); on-accent text stays AAA in every state.
