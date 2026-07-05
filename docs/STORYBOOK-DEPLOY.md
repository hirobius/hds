# Deploying Storybook (component preview)

Publishes the built Storybook as an **isolated, preview-only static site** on
Vercel — a component gallery for reviewing the library. It is **not** a package
release and **not** the production `/ops` app.

## Why it's isolated

`scripts/deploy-storybook.mjs` deploys the `storybook-static/` folder **directly**
(`vercel deploy storybook-static`). The repo-root `vercel.json` — which builds the
production app to `dist` — is never consulted, so this has **zero blast radius**
on the production project. It lands as its own Vercel project.

## Prerequisites

- **`VERCEL_TOKEN`** set in the environment. Create one at
  <https://vercel.com/account/tokens> (scope it to your team) and add it to the
  remote environment's config. Environment variables only load into a
  **freshly-started** session/container — set it, then start a new session.

## Run it

```bash
pnpm install            # fresh clone only
pnpm storybook:deploy   # builds Storybook, deploys, prints the URL
```

Promote to the project's stable production alias:

```bash
pnpm storybook:deploy -- --prod
```

Any args after `--` are forwarded to `vercel deploy`.

## Notes

- A brand-new Vercel project may have **Deployment Protection** (Vercel
  Authentication) on by default — you can view it while signed in to Vercel; to
  share it publicly, turn protection off in the project's settings.
- The token is read from `process.env.VERCEL_TOKEN` only — it is never written to
  the repo. Do not commit tokens; `.env*` files are off-limits per `CLAUDE.md`.
- Re-running redeploys; each run prints the deployment URL as its last line.
