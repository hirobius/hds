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

/** Resolve a `var(--x)` (or a bare custom-property name) to the px the browser computes. */
function usePx(varRefs: readonly string[]): Record<string, number | null> {
  const [resolved, setResolved] = React.useState<Record<string, number | null>>({});
  React.useEffect(() => {
    let raf = 0;
    const probe = document.createElement('div');
    // Absolute px is the only honest read: a unitless line-height or an em
    // tracking resolves against a font size, so measure it in place rather than
    // parsing the declaration and doing the multiplication ourselves.
    probe.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none';
    document.body.appendChild(probe);
    const out: Record<string, number | null> = {};
    for (const ref of varRefs) {
      probe.style.width = ref.startsWith('var(') ? ref : `var(${ref})`;
      const w = parseFloat(getComputedStyle(probe).width);
      out[ref] = Number.isFinite(w) ? Math.round(w * 100) / 100 : null;
    }
    probe.remove();
    // Deferred deliberately: measuring needs a painted document, and setting
    // state synchronously inside the effect cascades a second render before
    // the first has committed.
    raf = requestAnimationFrame(() => setResolved(out));
    return () => cancelAnimationFrame(raf);
  }, [varRefs]);
  return resolved;
}

const RUNGS = Object.entries(hds.fontSize) as Array<[string, string]>;
const RUNG_REFS = RUNGS.map(([, ref]) => ref);

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
  const px = usePx(RUNG_REFS);
  return (
    <div style={shell}>
      <span style={eyebrow}>primitive.typography.size</span>
      <div>
        {RUNGS.map(([name, ref], i) => {
          const here = px[ref];
          const below = i > 0 ? px[RUNGS[i - 1][1]] : null;
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

function CompositesView() {
  const refs = React.useMemo(
    () =>
      COMPOSITES.flatMap((c) => [
        `--semantic-typography-${c}-font-size`,
        `--semantic-typography-${c}-line-height`,
      ]),
    [],
  );
  const px = usePx(refs);
  return (
    <div style={shell}>
      <span style={eyebrow}>semantic.typography</span>
      <div>
        {COMPOSITES.map((c) => {
          const size = px[`--semantic-typography-${c}-font-size`];
          const lh = px[`--semantic-typography-${c}-line-height`];
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
  const refs = React.useMemo(
    () => COMPOSITES.map((c) => `--semantic-typography-${c}-line-height`),
    [],
  );
  const px = usePx(refs);
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
          const lh = px[`--semantic-typography-${c}-line-height`];
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
