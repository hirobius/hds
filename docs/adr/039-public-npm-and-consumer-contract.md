# ADR-039: Publish to Public npm, and the C1-C4 Consumer Contract

**Status:** Accepted, retroactive (decided 2026-07-01 for npm, 2026-07-06 for the contract; recorded 2026-10-13 from commit and PR history). The `data-brand` and `data-tenant` pair was later ratified in ADR-023.

## Context

Through 0.8.0 the package lived on GitHub Packages. Consumers needed an `.npmrc` and a
token to install it. hds#39 describes the P0.2 consumer-readiness item as "previously
human-gated pending the decision to make the package publicly readable". Its body says
"Adrian authorized it and provisioned the `hirobius` npm org + `NPM_TOKEN` secret."

On 2026-07-06 the first external consumer, `hirobius/lilac-bonds`, proposed a
consumption contract. The aim was to make token-namespace collisions between the
design system and its consumers "structurally impossible".

## Decision

1. **Distribute on public npm** (hds#39, merged 2026-07-01). `publishConfig` points at
   `registry.npmjs.org` with `access: public`, and the changeset config moved from
   `restricted` to `public`. A patch changeset cut the first public version, 0.8.1.
   Exports, build output and API were unchanged. Versions 0.1.0 to 0.8.0 stay on
   GitHub Packages. Nothing was unpublished.
2. **Document the C1-C4 contract** in `docs/CONSUMING.md` (hds#82):
   - **C1.** The DS owns `--primitive-*`, `--semantic-*`, `--component-*`, `--role-*`,
     `--hds-*` and the `data-hds`, `data-theme` and `data-tenant` attributes. Consumers
     never declare there.
   - **C2.** Consumers extend under their own prefix (for example `--lb-*`) and may
     reference DS tokens freely.
   - **C3.** Brand through a tenant overlay on the semantic tier only, per rule R1.
   - **C4.** Gaps go upstream as issues or PRs. Alias targets must exist in the base
     tokens (rule R5), so a new ramp lands upstream first.
3. **`data-brand` is primary, `data-tenant` is an alias** (hds#88). Overlays compile to
   `[data-brand="slug"], [data-tenant="slug"]`. "No breaking change: existing
   data-tenant consumers (incl. the lilac-bonds tenant) keep working."

## Alternatives considered

None recorded at the time.

## Rationale

The commits give the install reason as a plain `npm install` with no `.npmrc` or token
setup. For the contract, the reason is the one above: one invariant, DS-owned names are
never declared by consumers, removes the need for a shared registry or coordination.
The same hds#82 change added the `primitive.color.lilac` ramp and a `lilac-bonds`
overlay, so C4 was exercised on day one.

## Consequences

- The GitHub Packages listing became "a frozen relic". hds#82 added a README callout
  so that page would not mislead readers.
- Release auth changed later. hds#39 used an `NPM_TOKEN` secret. The 2026-09-30 0.17.0
  publish "failed on an expired Automation token", and `1996d78` (hds#346) moved
  `release.yml` to npm Trusted Publishing (OIDC), with no token in the workflow.
- hds#111 added the `/brand` bridge (palette to HDS semantic variables) and tests that
  the brand dial writes both `data-brand` and `data-tenant`.
- ADR-023 (2026-07-10) ratified the four theming dials as public API, including
  `data-brand` with `data-tenant` as an alias. It does not mention C1-C4.
- Still in force on origin/main: `publishConfig.registry` is `registry.npmjs.org`,
  changeset `access` is `public`, and `docs/CONSUMING.md` still carries C1 to C4.

## Lessons

- Decide the consumer-facing install path first. Registry auth is friction before any
  API is judged.
- Write down which names the package owns. A prefix rule is cheaper than coordination.
- When an alias keeps old consumers working, say so in the commit. That is what made
  the attribute change non-breaking.
- A long-lived publish token expires. Prefer short-lived OIDC credentials.

## Evidence

- `ab78052` Publish to public npm instead of GitHub Packages (P0.2) (#39)
- `c611e3b` Implement the lilac-bonds consumption proposal + npm README note (#82)
- `a98714b` feat(tokens): data-brand primary attribute + data-tenant alias (#88)
- `0b3738f` Astro consumption bridge (#64) + multi-brand switch tests (#62) (#111)
- `1996d78` ci(release): publish to npm with Trusted Publishing (OIDC) (#346)
- hds#39: Publish to public npm instead of GitHub Packages (P0.2)
