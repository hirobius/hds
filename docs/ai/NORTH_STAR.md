# HDS — North Star

The focus contract for the Hirobius Design System. Every roadmap call, every
agent, every PR anchors here. If a change doesn't serve this, it's drift.

_Set 2026-10-09 (Adrian + Claude). Revisit when the answers below stop being true._

## Identity (one line)

**HDS is a token-first React product foundation: one opinionated, re-themeable
system that lets Adrian ship any dashboard or app fast — and stands as
portfolio-grade proof of design-system _engineering_, not just styling.**

## Who it serves, in priority order

1. **Adrian, first and always.** The default consumer is Adrian's own work —
   the ops dashboard today, personal apps and React-on-ServiceNow tools next.
   Optimise for _his_ velocity before anyone else's hypothetical needs.
2. **Future-Adrian's career.** The system is a standing portfolio artifact for
   design-systems / frontend-platform roles.
3. **Downstream consumers — a named _stretch_ goal, not a mandate.** Keep the
   system clean and decoupled enough that "clone it and go" stays reachable, but
   do not spend effort on stranger-facing polish, broad framework support, or
   community-support obligations _yet_. (See "Stretch goal" below.)

## What it's for (primary purposes)

- **Velocity.** Never re-decide spacing, color, type, or component behaviour per
  project. Start an app, consume `@hirobius/design-system`, ship.
- **Proof of craft (the career lever).** The components are table stakes —
  everyone has a Button. The differentiator, and the thing worth investing in,
  is the **system around them**: the token architecture + per-tenant knob, the
  guardrail / proof-of-firing gates, the upgrade ledger + CSS contract, Figma
  sync, the generated docs site, the a11y rigor. That machinery _is_ the
  portfolio. Keep raising that ceiling.

## Non-goals (say no to these)

- **Not a public OSS library (now).** No semver promises to strangers, no issue
  triage for outside users, no "support every framework." That's the stretch
  goal, deliberately deferred.
- **Not native ServiceNow UI.** HDS is React; ServiceNow's UI Builder / Now
  Experience is web-components + SCSS with its own design system. Do not force
  HDS components into native SN surfaces — that fights the platform and teaches
  neither skill well. (See ServiceNow stance.)
- **Not a do-everything, opinion-free kit.** A system flexible enough for
  "anything" has no spine. HDS's strength is a committed monochromatic,
  high-contrast identity. Flex via the token knob, not by diluting the opinion.
- **Not a per-project component fork.** New visual needs are met by tokens /
  tenants, or a schema-fitting new component — never by copying a component and
  editing it for one app.

## The flexibility model: one structure, many themes

HDS is **one opinionated component structure** re-skinned per project through the
token layer (`hirobius.tokens.json` → CSS vars; `data-brand` / `data-theme` /
`data-density`). A new project changes _tokens_, not _components_. This is the
whole answer to "flexible enough for whatever I build" without becoming mush:
the structure is fixed and governed; the surface is a knob.

## ServiceNow stance

- **Supported path — React SPA on ServiceNow data.** Standalone React apps that
  read/write ServiceNow via its REST / Table API, with HDS as the UI layer. HDS
  fits natively; this is the recommended way to use HDS with SN and the best
  skill combo (React + design-system craft + SN integration).
- **Not supported — HDS components inside native SN UI.** Learn SN's own
  framework as a separate skill track.
- **Optional future bridge — token export.** If visual consistency inside native
  SN is ever wanted, export the token layer (CSS vars → SCSS / SN theme vars).
  The tokens are portable even where the React components are not. Optional,
  later, only if a concrete need appears.

## What this means day to day

- **Keep investing in the system machinery** (tokens, gates, versioning, docs,
  Figma sync, a11y). It serves velocity _and_ the career lever at once.
- **Don't gold-plate for strangers.** Consumer docs, starter templates, and
  broad theming wait for the stretch goal.
- **Guard the opinion.** Push back on changes that make HDS blander to serve a
  hypothetical downstream user.
- **Measure "done" by: can Adrian build his next app faster, and does this make
  the system more defensibly well-engineered?**

## Stretch goal — "clone it and go"

Someday, a solid grab-and-go: a starter (`create-hirobius-app` or a cloneable
boilerplate), consumer docs, and a clean public surface. **Reachable, not
scheduled.** The bar to pursue it: Adrian's own needs are comfortably met, and
the system is stable enough that a public surface won't become a maintenance
tax. Until then, every decision keeps that door open — nothing more.
