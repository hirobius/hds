# Accessibility conformance

How HDS proves accessibility **per component** — not just "we care about a11y,"
but a documented, testable record a reviewer (or auditor) can read. Target:
**WCAG 2.2 AA** + Section 508.

> Distilled from a portfolio-gap review. The recurring note: *"it's accessible"
> is invisible until you say what you tested and how.* This file is where we say
> it.

## What's already enforced (automated)

These run today and gate changes — cite them, don't rebuild them:

| Surface | Mechanism | Scope |
|---|---|---|
| axe-core | `tests/a11y.spec.ts` (`@axe-core/playwright`), CI `.github/workflows/a11y.yml` | every major route, fails on critical/serious |
| Contrast | `scripts/check-contrast.mjs` (`pnpm check:contrast`) | token pairings |
| Focus states | `scripts/check-focus-states.mjs` (`pnpm check:focus`) | interactive components |
| Reduced motion | `scripts/check-reduced-motion.mjs` (`pnpm check:motion`) | WCAG 2.3.3 |
| Lint a11y | `pnpm check:a11y` (`jsx-a11y`) | alt-text, redundant-alt |
| Visual regression | `.github/workflows/visual.yml` | layout/contrast drift |
| Performance | `.github/workflows/perf.yml` (Lighthouse CI) | Core Web Vitals budgets |

**Gap automation can't close:** per-component criteria mapping, ARIA-pattern
intent, keyboard maps, and **screen-reader behavior** (axe can't judge whether a
live region announces correctly). Those are documented below, per component.

## Per-component conformance record

One row block per component. Keep it honest — mark untested cells `⏳ pending`,
never assert a screen-reader pass you didn't run.

### Template

```md
#### <ComponentName>
- **Role / pattern:** <native element or ARIA APG pattern, e.g. "native <button>" / "APG Dialog">
- **WCAG 2.2 AA criteria addressed:** <e.g. 1.4.3 Contrast, 2.1.1 Keyboard, 2.4.7 Focus Visible, 2.5.8 Target Size>
- **Keyboard map:** <Tab/Shift+Tab, Enter/Space, Esc, Arrow keys — what each does>
- **Focus management:** <focus ring source, trap/restore on open/close, initial focus>
- **Screen-reader notes:** NVDA ⏳ · JAWS ⏳ · VoiceOver ⏳ <one line per SR once tested: what was announced>
- **Known gaps / tradeoffs:** <honest one-liner>
```

### Worked example (structural facts verified; SR passes pending)

#### Button
- **Role / pattern:** native `<button>` (Radix `Slot` for `asChild` polymorphism)
- **WCAG 2.2 AA criteria addressed:** 1.4.3 Contrast (token-governed accent/onAccent
  pairing), 2.1.1 Keyboard (native activation), 2.4.7 Focus Visible
  (`.hds-focus` ring, keyboard-modality gated), 2.5.8 Target Size (sm bumped to
  44px min on touch — see `theme.css` mobile block)
- **Keyboard map:** `Tab`/`Shift+Tab` to move, `Enter`/`Space` to activate
  (native); `disabled` removes from tab order
- **Focus management:** `.hds-focus:focus-visible` outline via
  `--semantic-color-border-accent`, shown only under
  `[data-input-modality="keyboard"]`
- **Screen-reader notes:** NVDA ⏳ · JAWS ⏳ · VoiceOver ⏳ — manual pass not yet recorded
- **Known gaps / tradeoffs:** icon-only usage relies on the consumer supplying an
  `aria-label`; not yet lint-enforced

> Fill the remaining primitives (`Input`, `Dialog`, `Tabs`, `SegmentedControl`,
> `Alert`, …) using the template. `Dialog`/`Tabs` are Radix-backed, so the
> APG pattern + focus-trap behavior come from Radix — document which, and record
> the SR pass.

## Screen-reader test protocol

For each interactive component, run and write up:
- **NVDA** (Windows/Firefox), **JAWS** (Windows/Chrome), **VoiceOver** (macOS/Safari).
- Record: name, role, state announced; whether keyboard ops match the map; whether
  dynamic changes (open/close, validation, selection) announce.
- Keep notes in the component's conformance block above — even "VoiceOver: announces
  'Get started, button'" is worth more than an unproven "accessible" claim.

## Context-framing convention (the "why does this exist" gap)

Automation proves correctness; it doesn't explain intent. Every component doc /
sample README carries, at minimum:
1. **Problem statement** — one line: what this is and why it exists.
2. **Orientation** — what it does / how to run it / what's notable (30-second read).
3. **A hard decision** — one tradeoff you made (signals senior-level thinking).
4. **A11y note** — what you tested and how (ties back to the record above).

No invented metrics. The craft is the proof; this is just the label on it.
