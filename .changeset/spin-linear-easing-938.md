---
'@hirobius/design-system': patch
---

fix(tokens): --hds-anim-spin now uses a linear easing instead of the expressive spring. A continuous rotation on the overshooting elastic easing sped up, slowed down and overshot each turn; spin now rotates at constant speed, matching hds-utility-spin.
