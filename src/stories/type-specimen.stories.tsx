/**
 * Type specimen — the surface that renders the type scale.
 *
 * It did not exist. `foundation-swatch.stories.tsx` exports colour stories only,
 * `src/app/data/foundations/typography.json` is imported by zero files, and the
 * Playwright spec that once screenshotted /hds/typography sits in tests-archive
 * and does not run. So the scale had no review surface at all — and Chromatic
 * cannot supply one either, since it runs with exitZeroOnChanges and is gated
 * off unless CHROMATIC_ENABLED. Nothing could have shown you a ramp change.
 *
 * Everything here is READ AT RUNTIME from the CSS custom properties, never
 * transcribed. A specimen that restates its own numbers is the same class of
 * artefact as a manifest that describes a layout the component does not have
 * (hds#281) — it looks like evidence and is actually a second opinion. If a
 * rung moves in hirobius.tokens.json, this page moves with it or it is broken.
 *
 * @see hds#283
 */
import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';

import hds from '../app/design-system/tokens';

const meta = {
  title: 'Foundations/Type specimen',
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'The live type scale, resolved from CSS custom properties at render time. Three views: every primitive rung, every semantic composite, and a 4px-grid overlay that makes off-grid leading visible. This is the review surface for any ramp change.',
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const GRID = 4;

/**
 * Resolve type metrics to the px the browser actually computes.
 *
 * NOT by probing element WIDTH, which was the first version of this and was
 * broken in the way that matters most here: `--primitive-typography-lineHeight-none`
 * is the unitless number `1`, and `width: 1` is invalid CSS. An invalid
 * assignment leaves the previous value in place, so reusing one probe across a
 * loop would have reported the PREVIOUS row's line-height for `display` — a
 * confident, plausible, wrong number. Exactly the failure this page exists to
 * expose, reproduced inside the page.
 *
 * Instead the declarations are applied as real type and read back through
 * getComputedStyle, which resolves unitless multipliers, em and rem alike, and
 * returns px for both properties. A metric that cannot be resolved comes back
 * null and renders as an em dash.
 */
function useMetrics(
  specs: ReadonlyArray<{ key: string; fontSize: string; lineHeight?: string }>,
): Record<string, { size: number | null; lh: number | null }> {
  const [out, setOut] = React.useState<Record<string, { size: number | null; lh: number | null }>>(
    {},
  );
  React.useEffect(() => {
    let raf = 0;
    const probe = document.createElement('div');
    probe.textContent = 'Ag';
    probe.style.cssText =
      'position:absolute;visibility:hidden;pointer-events:none;white-space:nowrap';
    document.body.appendChild(probe);

    const px = (v: string) => {
      const n = parseFloat(v);
      return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
    };

    const next: Record<string, { size: number | null; lh: number | null }> = {};
    for (const spec of specs) {
      // Cleared every pass: a declaration the browser rejects is silently
      // ignored, and without the reset the previous row's value survives.
      probe.style.fontSize = '';
      probe.style.lineHeight = '';
      probe.style.fontSize = spec.fontSize;
      if (spec.lineHeight) probe.style.lineHeight = spec.lineHeight;
      const cs = getComputedStyle(probe);
      next[spec.key] = {
        size: px(cs.fontSize),
        // `normal` is a real computed value and is not a number — report it as
        // unresolved rather than coercing it to something tidy.
        lh: spec.lineHeight ? px(cs.lineHeight) : null,
      };
    }
    probe.remove();
    // Deferred deliberately: measuring needs a painted document, and setting
    // state synchronously inside the effect cascades a render before the first
    // has committed.
    raf = requestAnimationFrame(() => setOut(next));
    return () => cancelAnimationFrame(raf);
  }, [specs]);
  return out;
}

const RUNGS = Object.entries(hds.fontSize) as Array<[string, string]>;
const RUNG_SPECS = RUNGS.map(([name, ref]) => ({ key: name, fontSize: ref }));

const shell: React.CSSProperties = {
  padding: hds.space.px32,
  background: 'var(--semantic-color-surface-page)',
  color: 'var(--semantic-color-content-primary)',
  minHeight: '100vh',
};
const eyebrow: React.CSSProperties = {
  ...hds.typeStyles.eyebrow,
  color: 'var(--semantic-color-content-secondary)',
  display: 'block',
  marginBottom: hds.space.px8,
};
const mono: React.CSSProperties = {
  ...hds.typeStyles.monoSm,
  color: 'var(--semantic-color-content-secondary)',
};
const band: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0,1fr) auto',
  gap: hds.space.px16,
  alignItems: 'baseline',
  padding: `${hds.space.px16} 0`,
  borderTop: '1px solid var(--semantic-color-border-default)',
};

function RampView() {
  const m = useMetrics(RUNG_SPECS);
  return (
    <div style={shell}>
      <span style={eyebrow}>primitive.typography.size</span>
      <div>
        {RUNGS.map(([name, ref], i) => {
          const here = m[name]?.size ?? null;
          const below = i > 0 ? (m[RUNGS[i - 1][0]]?.size ?? null) : null;
          const ratio = here && below ? here / below : null;
          return (
            <div key={name} style={band}>
              <span style={{ fontSize: ref, lineHeight: 1.1, minWidth: 0 }}>Ag</span>
              <span style={{ ...mono, whiteSpace: 'nowrap' }}>
                {name} · {here === null ? '—' : `${here}px`}
                {ratio ? ` · ×${ratio.toFixed(3)}` : ''}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Every primitive rung, rendered at its own size, with the ratio to the rung below. */
export const Ramp: Story = { render: () => <RampView /> };

const COMPOSITES = [
  'display',
  'h1',
  'h2',
  'h3',
  'body',
  'ui',
  'caption',
  'eyebrow',
  'mono',
] as const;

/** Stable identity so useMetrics' effect does not re-run every render. */
const COMPOSITE_SPECS = COMPOSITES.map((c) => ({
  key: c,
  fontSize: `var(--semantic-typography-${c}-font-size)`,
  lineHeight: `var(--semantic-typography-${c}-line-height)`,
}));

function CompositesView() {
  const m = useMetrics(COMPOSITE_SPECS);
  return (
    <div style={shell}>
      <span style={eyebrow}>semantic.typography</span>
      <div>
        {COMPOSITES.map((c) => {
          const size = m[c]?.size ?? null;
          const lh = m[c]?.lh ?? null;
          const onGrid = lh !== null && lh !== undefined && lh % GRID === 0;
          return (
            <div key={c} style={band}>
              <span
                style={{
                  fontFamily: `var(--semantic-typography-${c}-font-family)`,
                  fontSize: `var(--semantic-typography-${c}-font-size)`,
                  fontWeight: `var(--semantic-typography-${c}-font-weight)` as never,
                  letterSpacing: `var(--semantic-typography-${c}-letter-spacing)`,
                  lineHeight: `var(--semantic-typography-${c}-line-height)`,
                  textTransform: c === 'eyebrow' ? 'uppercase' : undefined,
                  minWidth: 0,
                }}
              >
                {c === 'body' || c === 'ui'
                  ? 'The quick brown fox jumps over the lazy dog'
                  : 'Ag — The quick brown fox'}
              </span>
              <span style={{ ...mono, whiteSpace: 'nowrap' }}>
                {c} · {size ?? '—'}/{lh ?? '—'}
                {lh === null || lh === undefined ? '' : onGrid ? '' : ' ⚠ off 4px grid'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Each semantic style rendered with its real composite, and its resolved metrics. */
export const Composites: Story = { render: () => <CompositesView /> };

/**
 * The rhythm view. A 4px grid behind real line boxes — the only way to SEE
 * whether leading sits on the spacing scale, which is what actually makes
 * vertical rhythm hold. Sizes never need to be on the grid; line boxes do.
 */
function RhythmView() {
  const m = useMetrics(COMPOSITE_SPECS);
  return (
    <div style={shell}>
      <span style={eyebrow}>line boxes against the 4px spacing grid</span>
      <p
        style={{
          ...hds.typeStyles.ui,
          color: 'var(--semantic-color-content-secondary)',
          maxWidth: '64ch',
        }}
      >
        Every stripe is {GRID}px. A line box that ends mid-stripe does not sit on the spacing scale,
        so text in it will never align with padding or gaps built from the same scale. Font sizes
        are not expected to land on the grid — line boxes are.
      </p>
      <div
        style={{
          marginTop: hds.space.px24,
          backgroundImage: `repeating-linear-gradient(to bottom, var(--semantic-color-border-subtle) 0 1px, transparent 1px ${GRID}px)`,
        }}
      >
        {COMPOSITES.map((c) => {
          const lh = m[c]?.lh ?? null;
          const onGrid = lh !== null && lh !== undefined && lh % GRID === 0;
          return (
            <div
              key={c}
              style={{
                display: 'flex',
                gap: hds.space.px16,
                alignItems: 'baseline',
                outline: onGrid ? 'none' : '1px solid var(--semantic-color-feedback-warning)',
              }}
            >
              <span
                style={{
                  fontFamily: `var(--semantic-typography-${c}-font-family)`,
                  fontSize: `var(--semantic-typography-${c}-font-size)`,
                  fontWeight: `var(--semantic-typography-${c}-font-weight)` as never,
                  letterSpacing: `var(--semantic-typography-${c}-letter-spacing)`,
                  lineHeight: `var(--semantic-typography-${c}-line-height)`,
                  textTransform: c === 'eyebrow' ? 'uppercase' : undefined,
                }}
              >
                Hamburgefonstiv
              </span>
              <span style={{ ...mono, whiteSpace: 'nowrap' }}>
                {c} · {lh ?? '—'}px {onGrid ? '' : '⚠'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const Rhythm: Story = { render: () => <RhythmView /> };
