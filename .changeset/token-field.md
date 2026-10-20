---
'@hirobius/design-system': minor
---

New `TokenField`: a multi-line text field in which each token, such as `[Name]`, is an atomic chip, announced as one unit ("Name variable") and stepped over and deleted whole. The value stays a plain string (`value`, `onChange`). `tokenPattern`, `getTokenLabel` and `tokenNoun` set what a token is and how it reads. A ref handle (`insertAt`, `getSelection`, `setSelection`, `focus`) inserts at the caret. Same label, helper, error and disabled shell as `Textarea`, with its own undo (hds#826).
