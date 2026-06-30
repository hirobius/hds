/* hds-bypass: BG_WHITE_BLACK, DATA_TENANT, INLINE_STRUCTURAL_BORDER */
/**
 * MultiBrandThemingPage — side-by-side multi-tenant token override demo.
 * @unit 10n-6-multi-brand-theming-demo
 *
 * hds-bypass codes: this file IS the canonical demo of token + tenant overrides,
 * so it intentionally contains raw hex (per-brand spec values are how tenants
 * pin their identity colors), `[data-tenant=...]` selectors (the override
 * mechanism the page is documenting), and an inline border on the swatch
 * preview cell. Each is part of what the page teaches.
 *
 * Renders the same set of HDS components (button, card/surface, input, header)
 * under three brand token scopes simultaneously:
 *   - Hirobius   (default HDS tokens — no overrides)
 *   - Lilac      (Lilac Insurance Group: indigo-violet brand)
 *   - Ranch      (The Ranch Foundation: forest-green brand)
 *
 * Strategy: ADR-0001 compliant CSS custom property overrides scoped to a
 * container element via a CSS class (not data-tenant on <html>).
 * Components resolve var() chains through their normal cascade; the override
 * class simply shadows the accent-tier vars at container specificity.
 *
 * No new dependencies. No inline style branching on the components themselves.
 */

import { useTheme } from '../../context/ThemeContext';
import { Button } from '../../components/button';
import { Surface } from '../../components/surface';
import { Stack } from '../../components/stack';
import { Input } from '../../components/input';
import { Text } from '../../components/text';
import { Divider } from '../../components/divider';
import hds from '../../design-system/tokens';
import { DocPageHeader, DocSection } from './HdsDocPrimitives';

const multiBrandStyles = {
  tokenSwatchCell: {
    width: 16,
    height: 16,
    borderRadius: 3,
    flexShrink: 0,
    border: '1px solid var(--semantic-color-border-default)',
  } satisfies React.CSSProperties,
  codeBlock: {
    background: 'var(--semantic-color-surface-raised)',
    borderRadius: hds.borderRadius[8],
    padding: hds.semantic.space.component.padding,
    border: `1px solid var(--semantic-color-border-default)`,
    fontFamily: 'var(--hds-font-family-mono)',
    fontSize: 13,
    lineHeight: 1.6,
    color: 'var(--semantic-color-content-primary)',
    maxWidth: 640,
    overflowX: 'auto' as const,
  } satisfies React.CSSProperties,
} as const;

// ── Brand definitions ─────────────────────────────────────────────────────────
//
// Each brand overrides only the accent-tier and surface-accent CSS vars.
// The neutral content/border palette stays untouched — identical to how
// per-tenant theming works in tenants.css (concrete-creations reference).

interface BrandOverrides {
  /** Maps CSS var name (without --) to value */
  vars: Record<string, string>;
}

const BRANDS: { id: string; name: string; tagline: string; overrides: BrandOverrides }[] = [
  {
    id: 'hirobius',
    name: 'Hirobius',
    tagline: 'Design Systems & Automation',
    overrides: {
      // No overrides — Hirobius IS the default token set.
      vars: {},
    },
  },
  {
    id: 'lilac',
    name: 'Lilac Insurance',
    tagline: 'Independent Insurance Agency',
    overrides: {
      // Lilac Insurance Group: violet/indigo brand palette
      vars: {
        '--semantic-accent-rest': '#7C3AED', // audit-ok: brand palette demo content
        '--semantic-accent-hover': '#6D28D9', // audit-ok: brand palette demo content
        '--semantic-accent-pressed': '#5B21B6', // audit-ok: brand palette demo content
        '--semantic-accent-inactive': '#C4B5FD', // audit-ok: brand palette demo content
        '--semantic-accent-disabled': '#EDE9FE', // audit-ok: brand palette demo content
        '--semantic-accent-content': '#7C3AED', // audit-ok: brand palette demo content
        '--semantic-accent-contentHover': '#6D28D9', // audit-ok: brand palette demo content
        '--semantic-accent-subtle': '#EDE9FE', // audit-ok: brand palette demo content
        '--semantic-color-surface-accent': '#7C3AED', // audit-ok: brand palette demo content
        '--semantic-color-surface-accentSubtle': '#EDE9FE', // audit-ok: brand palette demo content
        '--semantic-color-border-accent': '#7C3AED', // audit-ok: brand palette demo content
        '--semantic-color-content-accent': '#7C3AED', // audit-ok: brand palette demo content
        '--component-button-bg': '#7C3AED', // audit-ok: brand palette demo content
        '--component-button-bgHover': '#6D28D9', // audit-ok: brand palette demo content
        '--role-primary': '#7C3AED', // audit-ok: brand palette demo content
        '--role-primary-foreground': '#FFFFFF', // audit-ok: brand palette demo content
      },
    },
  },
  {
    id: 'ranch',
    name: 'The Ranch Foundation',
    tagline: 'Veteran Holistic Healing Center',
    overrides: {
      // The Ranch Foundation: forest-green, earthy palette
      vars: {
        '--semantic-accent-rest': '#166534', // audit-ok: brand palette demo content
        '--semantic-accent-hover': '#14532D', // audit-ok: brand palette demo content
        '--semantic-accent-pressed': '#052E16', // audit-ok: brand palette demo content
        '--semantic-accent-inactive': '#86EFAC', // audit-ok: brand palette demo content
        '--semantic-accent-disabled': '#DCFCE7', // audit-ok: brand palette demo content
        '--semantic-accent-content': '#166534', // audit-ok: brand palette demo content
        '--semantic-accent-contentHover': '#14532D', // audit-ok: brand palette demo content
        '--semantic-accent-subtle': '#DCFCE7', // audit-ok: brand palette demo content
        '--semantic-color-surface-accent': '#166534', // audit-ok: brand palette demo content
        '--semantic-color-surface-accentSubtle': '#DCFCE7', // audit-ok: brand palette demo content
        '--semantic-color-border-accent': '#166534', // audit-ok: brand palette demo content
        '--semantic-color-content-accent': '#166534', // audit-ok: brand palette demo content
        '--component-button-bg': '#166534', // audit-ok: brand palette demo content
        '--component-button-bgHover': '#14532D', // audit-ok: brand palette demo content
        '--role-primary': '#166534', // audit-ok: brand palette demo content
        '--role-primary-foreground': '#FFFFFF', // audit-ok: brand palette demo content
      },
    },
  },
];

// ── Token legend entries shown beneath each panel ─────────────────────────────

const LEGEND_TOKENS = [
  { label: 'accent-rest', varName: '--semantic-accent-rest' },
  { label: 'accent-subtle', varName: '--semantic-accent-subtle' },
  { label: 'surface-accent', varName: '--semantic-color-surface-accent' },
];

// ── BrandPanel ────────────────────────────────────────────────────────────────

function BrandPanel({ brand }: { brand: (typeof BRANDS)[number] }) {
  const cssVarStyle = brand.overrides.vars as React.CSSProperties;

  return (
    <div
      className="hds-brand-scope"
      style={{
        ...cssVarStyle,
        flex: '1 1 280px',
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: hds.semantic.space.layout.gap,
      }}
    >
      {/* ── Brand header ── */}
      <div>
        <Text
          variant="heading3"
          as="h3"
          style={{
            color: 'var(--semantic-color-content-primary)',
            marginBottom: hds.semantic.space.subgrid.gap,
          }}
        >
          {brand.name}
        </Text>
        <Text variant="caption" as="p" style={{ color: 'var(--semantic-color-content-secondary)' }}>
          {brand.tagline}
        </Text>
      </div>

      <Divider />

      {/* ── Components ── */}
      <Stack gap="normal">
        {/* Buttons */}
        <div>
          <Text
            variant="eyebrow"
            as="p"
            style={{
              color: 'var(--semantic-color-content-secondary)',
              marginBottom: hds.semantic.space.component.gap,
            }}
          >
            Buttons
          </Text>
          <div style={{ display: 'flex', gap: hds.semantic.space.component.gap, flexWrap: 'wrap' }}>
            <Button variant="primary" size="md">
              Get started
            </Button>
            <Button variant="secondary" size="md">
              Learn more
            </Button>
          </div>
        </div>

        {/* Input */}
        <div>
          <Text
            variant="eyebrow"
            as="p"
            style={{
              color: 'var(--semantic-color-content-secondary)',
              marginBottom: hds.semantic.space.component.gap,
            }}
          >
            Input
          </Text>
          <Input label="Email address" placeholder="you@example.com" type="email" />
        </div>

        {/* Surface card */}
        <div>
          <Text
            variant="eyebrow"
            as="p"
            style={{
              color: 'var(--semantic-color-content-secondary)',
              marginBottom: hds.semantic.space.component.gap,
            }}
          >
            Card
          </Text>
          <Surface style={{ padding: hds.semantic.space.component.padding }}>
            <Stack gap="gap">
              <Text
                variant="heading3"
                as="h4"
                style={{ color: 'var(--semantic-color-content-primary)' }}
              >
                Service package
              </Text>
              <Text
                variant="body"
                as="p"
                style={{ color: 'var(--semantic-color-content-secondary)' }}
              >
                Full-service plan with quarterly reviews and dedicated support.
              </Text>
              <Button variant="primary" size="sm">
                View details
              </Button>
            </Stack>
          </Surface>
        </div>

        {/* Accent swatch strip */}
        <div>
          <Text
            variant="eyebrow"
            as="p"
            style={{
              color: 'var(--semantic-color-content-secondary)',
              marginBottom: hds.semantic.space.component.gap,
            }}
          >
            Token values
          </Text>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: hds.semantic.space.subgrid.gap,
            }}
          >
            {LEGEND_TOKENS.map((t) => (
              <div
                key={t.varName}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: hds.semantic.space.component.gap,
                }}
              >
                <div
                  style={{ ...multiBrandStyles.tokenSwatchCell, background: `var(${t.varName})` }}
                />
                <Text
                  variant="caption"
                  as="span"
                  style={{
                    color: 'var(--semantic-color-content-secondary)',
                    fontFamily: 'var(--hds-font-family-mono)',
                    fontSize: 11,
                  }}
                >
                  {t.label}
                </Text>
              </div>
            ))}
          </div>
        </div>
      </Stack>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MultiBrandThemingPage() {
  const { isDark } = useTheme();

  return (
    <article>
      <DocPageHeader
        group="HDS"
        title="Multi-brand theming"
        isDark={isDark}
        intro={
          <>
            The same HDS components rendered under three brand token sets simultaneously. Overrides
            are applied via CSS custom properties scoped to a container element — no component-level
            logic required.
          </>
        }
      />

      <DocSection title="Side-by-side comparison" isDark={isDark}>
        <Stack gap="normal">
          <Text
            variant="body"
            as="p"
            style={{ color: 'var(--semantic-color-content-secondary)', maxWidth: 720 }}
          >
            Each panel scopes its brand token overrides to a container div via inline CSS custom
            properties. The components themselves are identical; only the accent-tier vars change.
            The neutral content and border palette is untouched.
          </Text>

          {/* Panels */}
          <div
            style={{
              display: 'flex',
              gap: hds.semantic.space.layout.gutter,
              flexWrap: 'wrap',
              alignItems: 'flex-start',
            }}
          >
            {BRANDS.map((brand) => (
              <BrandPanel key={brand.id} brand={brand} />
            ))}
          </div>
        </Stack>
      </DocSection>

      <DocSection title="How it works" isDark={isDark}>
        <Stack gap="normal">
          <Text
            variant="body"
            as="p"
            style={{ color: 'var(--semantic-color-content-secondary)', maxWidth: 720 }}
          >
            Token overrides follow the same cascade pattern documented in ADR-0001. Setting CSS
            custom properties on any ancestor element shadows the root defaults for all descendants.
            The vars used here are the semantic accent tier:
          </Text>
          <div style={multiBrandStyles.codeBlock}>
            <pre
              style={{ margin: 0, whiteSpace: 'pre-wrap' }}
            >{`/* Scoped to a container, not <html> */
.brand-scope {
  --semantic-accent-rest:               #7C3AED;
  --semantic-accent-hover:              #6D28D9;
  --semantic-accent-subtle:             #EDE9FE;
  --semantic-color-surface-accent:      #7C3AED;
  --semantic-color-surface-accentSubtle: #EDE9FE;
  --semantic-color-border-accent:       #7C3AED;
  --role-primary:                       #7C3AED;
  --role-primary-foreground:            #FFFFFF;
}`}</pre>
          </div>
          <Text
            variant="body"
            as="p"
            style={{ color: 'var(--semantic-color-content-secondary)', maxWidth: 720 }}
          >
            For site-wide tenant theming, use{' '}
            <code
              style={{
                fontFamily: 'var(--hds-font-family-mono)',
                fontSize: 13,
                background: 'var(--semantic-color-surface-raised)',
                padding: '1px 5px',
                borderRadius: 3,
              }}
            >
              [data-tenant=&quot;slug&quot;]
            </code>{' '}
            on the root element, which is generated automatically by{' '}
            <code
              style={{
                fontFamily: 'var(--hds-font-family-mono)',
                fontSize: 13,
                background: 'var(--semantic-color-surface-raised)',
                padding: '1px 5px',
                borderRadius: 3,
              }}
            >
              scripts/build-tokens.mjs
            </code>{' '}
            from a tenant&apos;s{' '}
            <code
              style={{
                fontFamily: 'var(--hds-font-family-mono)',
                fontSize: 13,
                background: 'var(--semantic-color-surface-raised)',
                padding: '1px 5px',
                borderRadius: 3,
              }}
            >
              tokens.json
            </code>{' '}
            overlay file. The concrete-creations tenant in{' '}
            <code
              style={{
                fontFamily: 'var(--hds-font-family-mono)',
                fontSize: 13,
                background: 'var(--semantic-color-surface-raised)',
                padding: '1px 5px',
                borderRadius: 3,
              }}
            >
              src/styles/tenants.css
            </code>{' '}
            is the live production example.
          </Text>
        </Stack>
      </DocSection>
    </article>
  );
}

// ADR-017 nav metadata — drives the generated nav-model.json (see scripts/generate-nav-model.mjs).
export const meta = {
  path: '/brand-theming',
  title: 'Brand Theming',
  section: 'Internal',
  order: 99,
} satisfies import('../../data/nav-model').HdsPageMeta;
