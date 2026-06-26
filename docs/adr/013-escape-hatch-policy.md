# ADR-013: Escape-Hatch Policy — className-Only Feedback Primitives

**Status:** Accepted (2026-06-26, documenting a decision settled earlier)

> Retroactive ADR: this policy was decided and implemented in prior work (the
> escape-hatch tasks tracked as #10/#12/#14) but never recorded as an ADR.

## Context

Some primitives own their entire visual surface through governed tokens/CVA variants,
and letting a consumer pass an inline `style` prop would silently override governed
tone/background/radius — defeating the design system. Other primitives legitimately need
an inline `style` escape hatch for dynamic layout or transforms.

The question was whether to ban the `style` prop broadly (a strict codemod across all
components) or apply the ban surgically where it actually matters.

## Decision

Apply the ban **targeted, not blanket**:

- **Non-interactive feedback primitives — `Badge`, `Alert`, `Callout` — are
  className-only.** Their props `Omit<…HTMLAttributes…, 'style'>`; they expose no `style`
  prop. Visual surface is owned by `cva()` variants. Enforced by the
  **`check-no-style-prop`** gate (escape via `// style-prop-ok: <reason>`).
- **`Surface`, `Icon`, `Card` intentionally keep the `style` prop** as a documented escape
  hatch — their style usage is legitimate layout / dynamic transform.

The strict-ban codemod across all components was **explicitly declined**: it only added
wrapper-div soup and lint-disable debt for ~0 real leaks.

## Rationale

- The risk (silently overriding governed visuals) is concentrated in the feedback
  primitives where tone/background is the whole point; that's where enforcement belongs.
- A blanket ban trades a real, enforced guarantee on 3 components for noise and debt on
  the rest.

## Consequences

- `Badge`/`Alert`/`Callout` cannot be visually overridden via `style`; tone is the only
  styling input. Enforced, with an auditable exemption comment.
- `Surface`/`Icon`/`Card` retain flexibility; their `style` use is reviewed, not banned.
- The policy is "targeted" and should not be reopened toward a blanket ban without new
  evidence of real leaks.
