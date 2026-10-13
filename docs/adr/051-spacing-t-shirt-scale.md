# ADR-051: Spacing uses one t-shirt scale

**Status:** Accepted, retroactive (decided 2026-09-26; recorded 2026-10-13 from commit and PR history).

## Context

hds#206 was an epic about spacing vocabulary. The commits describe several coexisting
vocabularies: raw integers on Box `sx`, the `layout.tight/normal/gutter/inset/spacious`
and `component.gap/padding` families, and `hds.density.{xs..xl4}` in `tokens.ts`, which
"has the same names and different pixels" as the new scale (density.xs 4px against
scale.xs 8px). Box `sx` also had no way to say `'md'`, so "the only fix for a raw integer
was a raw var() string". Stack and Box resolved names through two code paths that had
already drifted: compact density retuned Stack's `'tight'` but not Box's.

## Decision

Adrian's decision, 2026-09-26, quoted in `d41c65e`: "spacing uses t-shirt sizes
(xs/sm/md/lg/xl), raw integers banned on padding/gap, enforced by a gate."

- `semantic.space.scale.{xs,sm,md,lg,xl}` is 8/16/24/32/48px at the default density. The
  old families stay live and are marked deprecated, with removal waiting for a major.
- `check-spacing-vocabulary` flags raw integers on Box `sx` spacing props. It started as
  warn-only and on-demand, then was promoted to error at pre-commit (hds#405) once
  `src/` reported zero.
- Box `sx` accepts `'xs'` to `'xl'`. Stack and Box share one resolver,
  `resolveSpacingValue(value, vocabulary)`, but each passes its own vocabulary.
- The runtime-overridden tokens were renamed in a separate slice (hds#305):
  `component.padding` became `surface.padding` and `layout.gutter` became
  `region.gutter`, both defaulting to `scale.md`, with the old names kept as
  `$deprecated` aliases.
- `hds.density` was deprecated with `@removeIn 1.0.0`, and the consumer ESLint rule now
  recommends the t-shirt steps.

## Alternatives considered

None recorded at the time. The codemod below was an implementation route, not a
competing design, and it failed as described under Consequences.

## Rationale

The commits give the aim as "one spacing vocabulary" (hds#206 DoD1). Keeping aliases and
a warn-only gate first was Adrian's call for the smallest coherent slice: "no breaking
change, no removal yet". Removal was ordered as steps in `MIGRATIONS.md`, where steps 2
and 3 (a consumer codemod and a consumer run) come before step 4, a major.

## Consequences

- **The codemod damaged two live overrides (hds#299).** It rewrote `layout.gutter` and
  `component.padding` onto the fixed `scale.md` (24px) and "silently dropped two live
  runtime overrides": `theme.css` sets the gutter to 32px desktop and 16px under 639px,
  and `tenants.css` overrides padding per tenant and density. A reviewer rejected it. The
  call sites were reverted, then the codemod's four rules were deleted with a test, since
  the revert "left the codemod able to redo the damage".
- **The rename was proven by probe, then by lock (hds#305, hds#405).** Computed values
  were checked across 80 Chromium probes. The committed test matched CSS text only, so a
  Chromium lock was added over tenant, density, viewport and scope.
- **A patch moved consumers' spacing (hds#405).** The shared resolver sent Box
  `'tight'`, `'normal'`, `'inset'` and `'spacious'` to scale steps, so under compact
  they went from 16/24/32/48px to 12/20/24/40px, "in a patch". The verifier found it. The
  names were restored to the `layout-*` vars. The Chromium lock failed 31 cases before
  the fix, against a fixture captured from the earlier commit `c506c3b`. The release
  changeset was changed from patch to minor, because it adds behaviour and deprecates API.
- **The gate was easy to walk past.** It was a line scan for the literal `sx={{`. It was
  rebuilt on the TypeScript API and follows responsive maps, hoisted objects by lexical
  scope, conditionals and logical operators. Its limit is written down: an object imported
  from another file or built at runtime is not followed.
- On origin/main the scale values above, `check-spacing-vocabulary.mjs` and its line in
  `.husky/pre-commit` all exist, and `layout.tight` still carries
  `hds#206 — use semantic.space.scale.sm`. The aliases have not been removed.

## Lessons

- A rename that looks pure can drop a runtime override. Check every alias for overrides
  before codemodding it, and delete the rule, not just revert the output.
- Prove "no computed value changed" with a committed test against a fixture of the old
  behaviour, not a one-off probe.
- A change that moves any consumer's pixels is not a patch, even if the names look equal.
- A line scanner for a syntax pattern gets walked around. Parse the language.

## Evidence

- hds#206: spacing vocabulary epic (Adrian's decision, 2026-09-26; title not read)
- `d41c65e` Fleet burndown round 2 (hds): t-shirt scale and gate (#297)
- `75cf4ab` Round 3 (hds): spacing codemod, reverted and rules removed (#299)
- `643860b` Spacing rename slice (#206), lab move (#133) (#305)
- `9f9d143` feat(spacing): Box sx takes the t-shirt scale; Stack and Box share one
  resolver (#405)
