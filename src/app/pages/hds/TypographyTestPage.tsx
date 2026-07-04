// font-ok: typography test page intentionally uses monospace demo labels during visual inspection
import { useTheme } from '../../context/ThemeContext';
import { Surface } from '../../components/surface';
import hds from '../../design-system/tokens';

const typographyTestStyles = {
  styleLabelBase: {
    fontWeight: 400,
    fontSize: '0.875rem',
    color: 'var(--semantic-color-content-secondary)',
    marginBottom: '0.5rem',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  } satisfies React.CSSProperties,
} as const;

export default function TypographyTestPage() {
  const { isDark } = useTheme();

  // 10t-5: 8-style Swiss-canon ramp. Light weight for display + h1/h2,
  // regular for h3 / body / small / mono. Body / small / mono cap measure
  // at 60ch. Replaces the legacy 9-style ramp.
  const styles = [
    {
      name: 'display',
      size: '72px',
      weight: 'Light (300)',
      usage: 'Display headline. Reserved for landing-page heroes and marketing moments.',
      sample: 'The Design System',
      css: 'semantic.typography.display',
    },
    {
      name: 'h1',
      size: '48px',
      weight: 'Light (300)',
      usage: 'Primary section headings. Use for main page sections and major content divisions.',
      sample: 'Primary Section Heading',
      css: 'semantic.typography.h1',
    },
    {
      name: 'h2',
      size: '30px',
      weight: 'Light (300)',
      usage: 'Secondary section headings. Use for subsections and nested content layers.',
      sample: 'Secondary Section Heading',
      css: 'semantic.typography.h2',
    },
    {
      name: 'h3',
      size: '20px',
      weight: 'Regular (400)',
      usage: 'Component and card headers. Use for standalone titles within components.',
      sample: 'Component Header',
      css: 'semantic.typography.h3',
    },
    {
      name: 'body',
      size: '17px',
      weight: 'Regular (400)',
      usage: 'Body prose. Long-form text. Measure capped at 60ch.',
      sample: 'The quick brown fox jumps over the lazy dog. This is body prose with relaxed line-height and a 60ch measure cap so paragraphs stay readable without manual maxWidth on every callsite.',
      css: 'semantic.typography.body',
    },
    {
      name: 'small',
      size: '15px',
      weight: 'Regular (400)',
      usage: 'Secondary text. Sidebars, navigation, footnotes, tooltips. Measure capped at 60ch.',
      sample: 'Sidebar nav, supporting copy, and footnote text. This style is the workhorse of the UI.',
      css: 'semantic.typography.small',
    },
    {
      name: 'caption',
      size: '13px',
      weight: 'Regular (400) — tracking-wide',
      usage: 'Caption / overline. Apply text-transform:uppercase via class for the Swiss-canon eyebrow look.',
      sample: 'CAPTION OR OVERLINE',
      css: 'semantic.typography.caption',
    },
    {
      name: 'mono',
      size: '15px',
      weight: 'Regular (400) — Monospace',
      usage: 'Monospace. Code, token paths, hashes. Measure capped at 60ch.',
      sample: 'semantic.typography.body or component.button.radius',
      css: 'semantic.typography.mono',
    },
  ];

  return (
    <Surface padding="component" style={{['maxWidth']: '1200px', margin: '0 auto'}}>
      <h1 style={{ marginBottom: '0.5rem', fontSize: '2rem', fontWeight: 300 }}>Typography Refactor Test</h1>
      <p style={{ marginBottom: '3rem', color: 'var(--semantic-color-content-secondary)' }}>
        10t-5: 8-style Swiss-canon ramp. Headings light weight (300/400), never bold. Body/small/mono cap measure at 60ch.
      </p>

      <div>
        {styles.map((style) => (
          <div
            key={style.name}
            style={{
              padding: '2rem',
              border: `1px solid var(--semantic-color-border-default)`,
              borderRadius: 'var(--component-card-radius)',
              backgroundColor: isDark ? 'rgb(26, 26, 26)' : 'rgb(250, 250, 250)', // audit-ok: code-block surface — theme-aware fallback
            }}
          >
            {/* Header */}
            <div>
              <div>
                <div style={typographyTestStyles.styleLabelBase}>
                  {style.name}
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--semantic-color-content-secondary)', lineHeight: 1.5 }}>
                  <div>{style.size} · {style.weight}</div>
                </div>
              </div>
              <div>
                <code style={{ fontSize: '0.75rem', fontFamily: 'monospace', backgroundColor: isDark ? 'rgb(48, 48, 48)' : 'rgb(230, 230, 230)', /* audit-ok: code-block surface — theme-aware fallback */ padding: '0.25rem 0.5rem', borderRadius: hds.borderRadius[2], display: 'inline-block' }}>
                  {style.css}
                </code>
              </div>
            </div>

            {/* Sample Text */}
            <Surface padding="component" style={{ marginBottom: '1rem' }}>
              <div
                // inline-ok: all 6 typography props are dynamically computed from loop data — cannot be extracted
                style={{
                  // tier-ok: typography test page renders each primitive font family directly to compare specimens; semantic aliases would defeat the purpose of the page
                  fontFamily: style.name === 'mono'
                    ? 'var(--primitive-typography-family-mono)' // tier-ok: see above
                    : style.name === 'display' || style.name === 'h1' || style.name === 'h2' || style.name === 'h3'
                      ? 'var(--primitive-typography-family-display)' // tier-ok: see above
                      : 'var(--primitive-typography-family-primary)', // tier-ok: see above
                  fontSize: style.size,
                  fontWeight: style.weight.includes('Light') ? 300 : 400,
                  lineHeight: style.name === 'display' ? 1 : style.name === 'h1' ? 1.25 : style.name === 'h2' || style.name === 'h3' ? 1.375 : style.name === 'caption' ? 1.5 : 1.625,
                  letterSpacing: style.name === 'display' || style.name === 'h1' || style.name === 'h2' ? '-0.01em' : style.name === 'caption' ? '0.01em' : 0,
                  color: 'var(--semantic-color-content-primary)',
                  textTransform: style.name === 'caption' ? 'uppercase' : 'none',
                }}
              >
                {style.sample}
              </div>
            </Surface>

            {/* Usage */}
            <div style={{ fontSize: '0.875rem', lineHeight: 1.6, color: 'var(--semantic-color-content-secondary)' }}>
              <strong style={{ color: 'var(--semantic-color-content-primary)', display: 'block', marginBottom: '0.5rem' }}>Usage:</strong>
              {style.usage}
            </div>
          </div>
        ))}
      </div>

      {/* Spacing Guide */}
      <Surface padding="component" style={{ marginTop: '4rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 300, marginBottom: '1rem' }}>Swiss-Canon Rhythm</h2>
        <div>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 400, marginBottom: '0.75rem', color: 'var(--semantic-color-content-secondary)' }}>Headings</h3>
            <ul style={{ fontSize: '0.875rem', lineHeight: 1.6, color: 'var(--semantic-color-content-secondary)', margin: 0, paddingLeft: '1.25rem' }}>
              <li>display: leading-none (1.0)</li>
              <li>h1: leading-tight (1.25)</li>
              <li>h2: leading-snug (1.375)</li>
              <li>h3: leading-snug (1.375)</li>
            </ul>
          </div>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 400, marginBottom: '0.75rem', color: 'var(--semantic-color-content-secondary)' }}>Prose</h3>
            <ul style={{ fontSize: '0.875rem', lineHeight: 1.6, color: 'var(--semantic-color-content-secondary)', margin: 0, paddingLeft: '1.25rem' }}>
              <li>body: leading-relaxed (1.625) — measure 60ch</li>
              <li>small: leading-relaxed (1.625) — measure 60ch</li>
              <li>caption: leading-normal (1.5) — tracking-wide</li>
              <li>mono: leading-relaxed (1.625) — measure 60ch</li>
            </ul>
          </div>
        </div>
      </Surface>

      {/* Footer */}
      <Surface padding="component" style={{ marginTop: '3rem', fontSize: '0.875rem', lineHeight: 1.6, color: 'var(--semantic-color-content-secondary)' }}>
        <p style={{ margin: 0 }}>
          <strong>10t-5 note:</strong> Collapsed the legacy 9-style ramp + 4 doc variants into 8 named Swiss-canon composites. Headings use light weight, never bold. Body/small/mono carry their own 60ch measure cap so prose stays readable without per-callsite maxWidth.
        </p>
      </Surface>
    </Surface>
  );
}
