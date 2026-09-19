---
'@hirobius/design-system': patch
---

**chore(pkg):** the package now declares its own front door. `license` is
`SEE LICENSE IN NOTICE.md` — the code is MIT (root `LICENSE`), but the embedded
fonts ship under their own terms, which no single SPDX expression covers — and
`NOTICE.md` is added to `files` so the published tarball carries those terms.
`repository`, `homepage`, `bugs` and `keywords` are set, so npm and GitHub link
back to the repo instead of showing nothing.
