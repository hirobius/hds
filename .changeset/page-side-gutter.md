---
'@hirobius/design-system': patch
---

Page now pads its sides with the responsive region gutter (`--semantic-space-region-gutter`: 16px below 640px, then 24px, then 32px), as layout contract rule 2 says it should. Before, Page set only vertical padding, so every page touched the screen edge below its 1200px max width. A page that wants full bleed passes `style={{ paddingInline: 0 }}`. If you added your own side padding inside a Page to work around this, remove it or you get a double gutter.
