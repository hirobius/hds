---
'@hirobius/design-system': minor
---

New `Composer`: a prompt and capture box built from Textarea, Button, Tag, Dialog and Kbd. It grows with its text, folds a paste longer than `pasteFoldThreshold` characters into an editable attachment card, shows `attachments`, submits on Cmd/Ctrl+Enter through `onSubmit({ text, attachments })`, and honours `placeholder`, `disabled` and `pending`. `<Composer placeholder="Drop a thought" onSubmit={save} />`.
