# nextra docs-site proof of concept (placeholder)

The real app lives on branch `claude/docs-poc-nextra`, deployed by the Vercel
project `hds-docs-nextra` (Root Directory `docs-poc/nextra`).

This placeholder exists on `main` only so that Root Directory resolves on every
other branch. The project's Ignored Build Step then skips those builds, instead
of each hds PR getting a red "Root Directory does not exist" status.

Delete this folder when the POC is dropped or promoted.
