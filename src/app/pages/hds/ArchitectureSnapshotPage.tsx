/* hds-bypass: internal architecture-snapshot audit page. Intentionally renders code/terminal excerpts and tabular status with raw inline typography to mirror the diagnostic shape of the source it documents. Not user-facing canon. */
import { useTheme } from '../../context/ThemeContext';
import hds from '../../design-system/tokens';
import { Surface } from '../../components/surface';

const archStyles = {
  listBase: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    lineHeight: 1.8,
    color: 'var(--semantic-color-content-secondary)',
  } satisfies React.CSSProperties,
} as const;

const _CLAUDE_MD_GUARDRAILS = `## Spacing & Typography Guardrails

**Typography Ramp (9-style system, non-negotiable):**

| Token        | Size / Line-Height | Role                                          |
|--------------|--------------------|-----------------------------------------------|
| \`display\`    | 48px / 1.0         | Hero headlines and landing-page displays      |
| \`heading1\`   | 36px / 1.25        | Primary section headings (h1)                 |
| \`heading2\`   | 30px / 1.25        | Secondary section headings (h2)               |
| \`heading3\`   | 24px / 1.25        | Component and card headers (h3)               |
| \`body\`       | 16px / 1.5         | Body text for long-form prose — default       |
| \`ui\`         | 14px / 1.5         | Standard interface text: sidebars, nav, inputs|
| \`caption\`    | 12px / 1.5         | Helper text, errors, and secondary metadata   |
| \`technical\`  | 12px / 1.0         | Monospace: token keys, code blocks, metadata  |
| \`badge\`      | 10px / 1.0         | Status badges and tags — space-constrained    |

Deprecated styles are **forbidden**: do not use \`label\`, \`labelTechnical\`,
\`micro\`, \`monoXs\`, \`monoSm\`, \`body2\`, \`displayXl\`, \`display2\`, or \`title\`.
If a UI element feels "small," use \`ui\` (14px) — never drop to \`technical\` or \`badge\`.

**Spacing Hierarchy (breathable layout):**
- **Component padding:**     always 24px (\`space.6\`) — internal padding for cards and containers
- **Internal component gap:** always 16px (\`space.4\`) — gap between child items inside a component
- **Layout / grid gap:**     always 48px (\`space.12\`) — gap between major layout blocks
- **Sidebar / nav item padding:** 20px — keep nav open and readable
- Nested groupings (e.g. label + input) may use 8px (\`space.2\`) internally;
  parent container gap stays at 16px.

**Forbidden Patterns:**
- **No \`<Divider>\`** — use \`gap: space.12\` (48px) between major sections instead.
- **No hardcoded pixels** — use semantic tokens (\`semantic.space.component.gap\`, etc.).
- **No tight line-heights** — body and UI text must have line-height 1.5.
- **No font overload** — never use \`technical\` or \`badge\` for standard interface text.

**Component Generation Logic:**
1. Default to \`<Stack gap="tight">\` for any vertical or horizontal group of elements.
2. Use \`<Card>\` (24px padding) as the standard container surface.
3. If sub-elements feel visually detached, wrap in \`<Stack gap="component">\` — parent stays 16px.
4. If the UI looks busy, **increase gap first** before adding a background or border.

---

## Code Architecture Rules

**No Monolith (150–200 line limit):**
- No React file should exceed ~200 lines. Extract sub-components by responsibility.
- A page with a form and table becomes: \`Form.tsx\`, \`Table.tsx\`, \`Page.tsx\`.

**No Stubbing — production-ready or nothing:**
- Never write \`// TODO\` or empty handler bodies.
- Define typed mock data at the top of the file if real data is unavailable.
- All props must be typed and wired. No \`any\`, no unused props.

**Smart vs. Dumb component split:**
- **Pages (smart):** own state, data fetching, and event handlers. Pass everything down.
- **Components (dumb):** receive props, render UI. No \`useEffect\` for data fetching.

---

## Component Recipes

**Data Table / List View:**
\`\`\`tsx
<Card padding="none">
  <Stack direction="row" gap="tight" style={{ padding: hds.space.px16 }}>
    {/* ui token, content-secondary color, semibold — header row */}
  </Stack>
  {rows.map(row => (
    <Stack direction="row" gap="tight" style={{ padding: hds.space.px16 }}>
      {/* body or technical token. Hover state required. No vertical dividers. */}
    </Stack>
  ))}
</Card>
\`\`\`

**Modal / Dialog:**
\`\`\`tsx
<Card padding="none" style={{ maxWidth: 'var(--semantic-layout-content-maxWidth)', width: '100%' }}>
  <Stack direction="row" align="center" style={{ padding: hds.space.px24 }}>
    {/* heading2 title */}
  </Stack>
  <Stack direction="column" gap="tight" style={{ padding: hds.space.px24, overflowY: 'auto' }}>
    {/* body content — only this area scrolls */}
  </Stack>
  <Stack direction="row" gap="tight" justify="flex-end" style={{ padding: hds.space.px24 }}>
    {/* footer actions */}
  </Stack>
</Card>
\`\`\`

**Dashboard Widget / Metric Card:**
\`\`\`tsx
<Card padding="component">
  <Stack direction="row" gap="tight" justify="space-between">
    {/* heading3 title + optional icon/action */}
  </Stack>
  <Stack direction="row" align="baseline" gap="component">
    {/* display token for number, ui (muted) for unit/label */}
  </Stack>
</Card>
\`\`\`

**Empty State:**
\`\`\`tsx
<Stack direction="column" gap="tight" align="center" justify="center"
  style={{ padding: hds.space.px48 }}>
  {/* heading3 title */}
  {/* body description — maxWidth: '50ch', color: content-secondary */}
  <Button variant="primary">Create first item</Button>
</Stack>
\`\`\`

---

## Visual Hierarchy & Polish

**Text color hierarchy — never render all text at the same contrast level.**
- Primary ink (\`heading*\`, \`body\`): \`var(--semantic-color-content-primary)\`
- Secondary ink (\`ui\`, \`technical\`, metadata): \`var(--semantic-color-content-secondary)\`
- Never flatten hierarchy by applying primary color to everything.

**Optical alignment — icons next to text:**
- Single-line: \`<Stack direction="row" align="center" gap="component">\`
- Multi-line: \`align="flex-start"\` + \`style={{ marginTop: hds.space.px2 }}\` on the icon.

**Prose line length:** apply \`maxWidth: 'var(--semantic-layout-prose-maxWidth)'\` (50ch)
to any \`body\`-style text block. Never allow full-width prose on large screens.

**Elevation & borders — default to flat.**
- No \`box-shadow\` unless using a named token (\`var(--semantic-shadow-subtle)\` etc.).
- Use \`border: 1px solid var(--semantic-color-border-default)\` for distinction, not shadow.

---

## Text Alignment & Layout Flow

**The Compound Block Rule — never render compound text elements inline side-by-side.**

- **Always explicit direction:** Always declare \`direction\` on \`<Stack>\`.
  - Text blocks: \`<Stack direction="column">\`
  - Avatar + content rows: \`<Stack direction="row">\`

- **Avatar/Content pattern:**
\`\`\`tsx
<Stack direction="row" gap="tight" align="flex-start">
  <Avatar />
  <Stack direction="column" gap="tight" style={{ flex: 1, minWidth: 0 }}>
    {/* title, description, metadata */}
  </Stack>
</Stack>
\`\`\`
  Inner column MUST have \`flex: 1\` + \`minWidth: 0\` to prevent flex overflow.

- Only inline grouping permitted: tightly coupled pairs (icon + label, status + timestamp)
  using \`direction="row"\` with \`gap="component"\` and \`align="center"\` or \`align="baseline"\`.

---

## Responsiveness & Fluidity

**Fluid tokens (use CSS vars, never hardcode breakpoint overrides):**
- Layout gap: \`var(--semantic-space-layout-inset)\` → \`32px\`
- Display type: \`var(--semantic-typography-display-font-size)\` → \`clamp(40px, 8vw, 72px)\`
- Component padding: \`var(--semantic-space-component-padding)\` → 24px

**Auto-stacking rows:**
- Add \`stackOnMobile\` to any row that should collapse to column at ≤ 599px.
- \`<Stack direction="row" gap="tight" stackOnMobile>\`

**Smart grids:**
- Use \`className="hds-grid-auto"\` — resolves to \`repeat(auto-fit, minmax(min(300px, 100%), 1fr))\`.
- Never write \`grid-template-columns: repeat(3, 1fr)\` or similar fixed layouts.

**Width constraints:**
- All containers: \`max-width: 100%\`.
- Page-level cap: \`var(--semantic-layout-container-maxWidth)\` (1200px).
- Prose width: \`var(--semantic-layout-content-maxWidth)\` (760px).`;

export default function ArchitectureSnapshotPage() {
  const { isDark } = useTheme();

  return (
    <Surface padding="component">
      <h1 style={{ marginBottom: '0.5rem', fontSize: '2rem' }}>🏗️ Hirobius Design System — Architectural Snapshot</h1>
      <p style={{ marginBottom: '3rem', color: 'var(--semantic-color-content-secondary)', fontSize: '1rem', lineHeight: 1.5 }}>
        System architecture, token definitions, and refactor reference. For comprehensive spec, see DESIGN.md and hirobius.tokens.json.
      </p>

      {/* SECTION 1: SYSTEM OVERVIEW */}
      <section style={{ marginBottom: hds.semantic.space.layout.gap }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', borderBottom: '2px solid var(--semantic-color-border-default)', paddingBottom: '1rem' }}>
          1. System Overview
        </h2>

        <div>
          <div>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Core Stats</h3>
            <ul style={{ ...archStyles.listBase, fontSize: '0.9rem' }}>
              <li>• <strong>Typography:</strong> 9 active styles, including caption for helper and error metadata</li>
              <li>• <strong>Spacing Scale:</strong> 12-value primitive ramp</li>
              <li>• <strong>Color Palette:</strong> 32 semantic tokens (light + dark)</li>
              <li>• <strong>Components:</strong> 45+ UI elements</li>
              <li>• <strong>Token Architecture:</strong> W3C DTCG (3-tier)</li>
            </ul>
          </div>

          <div>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Files & Structure</h3>
            <ul style={{ ...archStyles.listBase, fontSize: '0.9rem' }}>
              <li>• <code style={{ fontSize: '0.85rem' }}>hirobius.tokens.json</code> — Token source</li>
              <li>• <code style={{ fontSize: '0.85rem' }}>public/hds-manifest.json</code> — Component inventory</li>
              <li>• <code style={{ fontSize: '0.85rem' }}>src/app/design-system/</code> — TS bridge</li>
              <li>• <code style={{ fontSize: '0.85rem' }}>src/app/components/</code> — HDS elements</li>
              <li>• <code style={{ fontSize: '0.85rem' }}>src/app/styles/tokens.generated.css</code> — CSS vars</li>
            </ul>
          </div>
        </div>
      </section>

      {/* SECTION 2: TYPOGRAPHY CONSOLIDATION */}
      <section style={{ marginBottom: hds.semantic.space.layout.gap }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', borderBottom: '2px solid var(--semantic-color-border-default)', paddingBottom: '1rem' }}>
          2. Typography Refactor (15 → 9)
        </h2>

        <Surface style={{ marginBottom: hds.semantic.space.layout.gap }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '1rem', color: 'var(--semantic-color-content-primary)' }}>New 9-Style Ramp</h3>
          <div>
            <div>
              <div style={{ color: 'var(--semantic-color-content-accent)', marginBottom: '0.5rem' }}>display</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--semantic-color-content-secondary)' }}>48px Bold — Hero titles</div>
            </div>
            <div>
              <div style={{ color: 'var(--semantic-color-content-accent)', marginBottom: '0.5rem' }}>heading1</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--semantic-color-content-secondary)' }}>36px Bold — H1</div>
            </div>
            <div>
              <div style={{ color: 'var(--semantic-color-content-accent)', marginBottom: '0.5rem' }}>heading2</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--semantic-color-content-secondary)' }}>30px Bold — H2</div>
            </div>
            <div>
              <div style={{ color: 'var(--semantic-color-content-accent)', marginBottom: '0.5rem' }}>heading3</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--semantic-color-content-secondary)' }}>24px Semibold — H3</div>
            </div>
            <div>
              <div style={{ color: 'var(--semantic-color-content-accent)', marginBottom: '0.5rem' }}>body</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--semantic-color-content-secondary)' }}>16px Regular — Long-form</div>
            </div>
            <div>
              <div style={{ color: 'var(--semantic-color-content-accent)', marginBottom: '0.5rem' }}>ui</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--semantic-color-content-secondary)' }}>14px Regular — Workhorse</div>
            </div>
            <div>
              <div style={{ color: 'var(--semantic-color-content-accent)', marginBottom: '0.5rem' }}>caption</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--semantic-color-content-secondary)' }}>12px Regular — Helpers, errors, metadata</div>
            </div>
            <div>
              <div style={{ color: 'var(--semantic-color-content-accent)', marginBottom: '0.5rem' }}>technical</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--semantic-color-content-secondary)' }}>12px Mono — Code</div>
            </div>
            <div>
              <div style={{ color: 'var(--semantic-color-content-accent)', marginBottom: '0.5rem' }}>badge</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--semantic-color-content-secondary)' }}>10px Medium — Tags</div>
            </div>
          </div>
        </Surface>

        <div>
          <Surface padding="component">
            <h3 style={{ fontSize: '0.9rem', marginBottom: '1rem', color: 'var(--semantic-color-content-primary)' }}>Removed Styles</h3>
            <ul style={{ ...archStyles.listBase, fontSize: '0.8rem' }}>
              <li>• displayXl (duplicate hero)</li>
              <li>• display2 (redundant)</li>
              <li>• title (replaced by heading3)</li>
              <li>• body2 (unnecessary variant)</li>
              <li>• label (merged to ui)</li>
              <li>• labelTechnical (merged to technical)</li>
              <li>• micro (rare, use badge)</li>
            </ul>
          </Surface>

          <Surface padding="component">
            <h3 style={{ fontSize: '0.9rem', marginBottom: '1rem', color: 'var(--semantic-color-content-primary)' }}>Benefits</h3>
            <ul style={{ ...archStyles.listBase, fontSize: '0.8rem' }}>
              <li>✓ Reduced cognitive load</li>
              <li>✓ Clear functional hierarchy</li>
              <li>✓ Eliminated false choices</li>
              <li>✓ Improved consistency</li>
              <li>✓ Easier onboarding</li>
              <li>✓ Better design coverage</li>
              <li>✓ Faster implementation</li>
            </ul>
          </Surface>
        </div>
      </section>

      {/* SECTION 3: SPACING REFACTOR */}
      <section style={{ marginBottom: hds.semantic.space.layout.gap }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', borderBottom: '2px solid var(--semantic-color-border-default)', paddingBottom: '1rem' }}>
          3. Spacing Architecture (V1 → V2)
        </h2>

        <div>
          <Surface padding="component">
            <h3 style={{ fontSize: '0.95rem', marginBottom: '1rem', color: 'var(--semantic-color-content-primary)' }}>V1: Dense (Legacy)</h3>
            <ul style={{ ...archStyles.listBase, fontSize: '0.85rem' }}>
              <li>Component gap: px8</li>
              <li>Component padding: px12</li>
              <li>Layout gap: px24</li>
              <li>Stack default: px12 gap</li>
              <li className="hds-bypass" style={{ color: 'var(--semantic-color-feedback-error)' }}>⚠️ Causes visual cramping</li>
            </ul>
          </Surface>

          <Surface padding="component">
            <h3 style={{ fontSize: '0.95rem', marginBottom: '1rem', color: 'var(--semantic-color-content-accent)' }}>V2: Breathable (New)</h3>
            <ul style={{ ...archStyles.listBase, fontSize: '0.85rem' }}>
              <li>Component gap: px16</li>
              <li>Component padding: px24</li>
              <li>Layout gap: px48</li>
              <li>Stack default: px16 gap</li>
              <li style={{ color: 'var(--semantic-color-feedback-success)' }}>✓ Improved visual breathing</li>
            </ul>
          </Surface>
        </div>

        <Surface padding="component" style={{ marginTop: hds.semantic.space.layout.gap }}>
          <h3 style={{ fontSize: '0.95rem', marginBottom: '1rem', color: 'var(--semantic-color-content-primary)' }}>Vertical Rhythm Formula</h3>
          <div style={{ fontSize: '0.85rem', color: 'var(--semantic-color-content-secondary)', lineHeight: 1.8 }}>
            <p style={{ margin: '0 0 0.75rem 0' }}>
              <strong>Breathing Room</strong> = (text baseline × line-height) + gap
            </p>
            <p style={{ margin: 0 }}>
              <strong>Example:</strong> body text (16px × 1.5) + 16px gap = <strong>40px total breathing</strong> (from baseline to next item&apos;s baseline)
            </p>
          </div>
        </Surface>
      </section>

      {/* SECTION 4: TOKEN REFERENCE */}
      <section style={{ marginBottom: hds.semantic.space.layout.gap }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', borderBottom: '2px solid var(--semantic-color-border-default)', paddingBottom: '1rem' }}>
          4. Token Definitions
        </h2>

        <Surface padding="component">
          <h3 style={{ fontSize: '0.95rem', marginBottom: '1rem', color: 'var(--semantic-color-content-primary)' }}>Spacing Scale (Primitive Tier)</h3>
          <div>
            {[
              { name: 'px2', value: '2px' },
              { name: 'px4', value: '4px' },
              { name: 'px6', value: '6px' },
              { name: 'px8', value: '8px' },
              { name: 'px12', value: '12px' },
              { name: 'px16', value: '16px' },
              { name: 'px20', value: '20px' },
              { name: 'px24', value: '24px' },
              { name: 'px32', value: '32px' },
              { name: 'px40', value: '40px' },
              { name: 'px48', value: '48px' },
              { name: 'px64', value: '64px' },
            ].map((token) => (
              <div key={token.name} style={{ color: 'var(--semantic-color-content-secondary)' }}>
                <div style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>{token.name}</div>
                <div style={{ fontSize: '0.7rem' }}>{token.value}</div>
              </div>
            ))}
          </div>
        </Surface>

        <Surface padding="component" style={{ marginTop: hds.semantic.space.layout.gap }}>
          <h3 style={{ fontSize: '0.95rem', marginBottom: '1rem', color: 'var(--semantic-color-content-primary)' }}>Semantic Spacing Tokens</h3>
          <div style={{ fontSize: '0.8rem', lineHeight: 1.8, color: 'var(--semantic-color-content-secondary)' }}>
            <div style={{ marginBottom: '0.75rem' }}>
              <code style={{ display: 'block', fontSize: '0.75rem', color: 'var(--semantic-color-content-accent)', marginBottom: '0.25rem' }}>--semantic-space-component-gap</code>
              <div>8px — Gap between child items in components</div>
            </div>
            <div style={{ marginBottom: '0.75rem' }}>
              <code style={{ display: 'block', fontSize: '0.75rem', color: 'var(--semantic-color-content-accent)', marginBottom: '0.25rem' }}>--semantic-space-component-padding</code>
              <div>24px — Internal padding of card/container surfaces</div>
            </div>
            <div>
              <code style={{ display: 'block', fontSize: '0.75rem', color: 'var(--semantic-color-content-accent)', marginBottom: '0.25rem' }}>--semantic-space-layout-inset</code>
              <div>32px — Gap between major layout sections</div>
            </div>
          </div>
        </Surface>
      </section>

      {/* SECTION 5: COMPONENT DEFAULTS */}
      <section style={{ marginBottom: hds.semantic.space.layout.gap }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', borderBottom: '2px solid var(--semantic-color-border-default)', paddingBottom: '1rem' }}>
          5. Component Defaults (V2)
        </h2>

        <div>
          <Surface padding="component">
            <h3 style={{ fontSize: '0.95rem', marginBottom: '1rem', color: 'var(--semantic-color-content-primary)' }}>Stack</h3>
            <div style={{ fontSize: '0.8rem', lineHeight: 1.8, color: 'var(--semantic-color-content-secondary)', fontFamily: hds.monoFamily }}>
              <div>direction: &apos;column&apos;</div>
              <div style={{ color: 'var(--semantic-color-content-accent)' }}>gap: &apos;px16&apos; ← NEW</div>
              <div>align: undefined</div>
              <div>justify: undefined</div>
            </div>
          </Surface>

          <Surface padding="component">
            <h3 style={{ fontSize: '0.95rem', marginBottom: '1rem', color: 'var(--semantic-color-content-primary)' }}>Card</h3>
            <div style={{ fontSize: '0.8rem', lineHeight: 1.8, color: 'var(--semantic-color-content-secondary)', fontFamily: hds.monoFamily }}>
              <div>padding: px24 (24px)</div>
              <div style={{ color: 'var(--semantic-color-content-accent)' }}>gap: px16 ← NEW</div>
              <div>border: 1px solid border-default</div>
              {/* tier-ok: text content displaying the actual primitive token name for documentation purposes */}
              <div>borderRadius: var(--primitive-radius-8)</div>
            </div>
          </Surface>
        </div>
      </section>

      {/* SECTION 5: TOKEN SYSTEM AUDIT */}
      <section style={{ marginBottom: hds.semantic.space.layout.gap }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', borderBottom: '2px solid var(--semantic-color-border-default)', paddingBottom: '1rem' }}>
          5. Token System Audit — Colors, Radii, Shadows, Transitions
        </h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--semantic-color-content-secondary)', lineHeight: 1.6, marginBottom: 'hds.semantic.space.component.gap' }}>
          Raw definitions extracted from <code>hirobius.tokens.json</code>, <code>tokens.generated.css</code>, and <code>theme.css</code>. Machine-readable for assistant ingestion.
        </p>

        {/* 5a: Color Semantics */}
        <div style={{ marginBottom: hds.semantic.space.layout.gap }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '1rem', color: 'var(--semantic-color-content-primary)' }}>5a. Color Semantics</h3>
          <pre style={{ backgroundColor: isDark ? 'rgb(20, 20, 20)' : 'rgb(245, 245, 245)', /* audit-ok: code-block surface — theme-aware fallback */ padding: hds.semantic.space.component.padding, borderRadius: 'var(--component-card-radius)' /* tier-ok: internal audit page pre-block — uses card radius */, border: '1px solid var(--semantic-color-border-default)', overflow: 'auto', fontSize: '0.75rem', fontFamily: hds.monoFamily, lineHeight: 1.7, margin: 0 }}>
            <code>{`/* ── Text / Content ─────────────────────────────────────────── */
--semantic-color-content-primary     → neutral.900  (Light) / neutral.100 (Dark)
--semantic-color-content-secondary   → neutral.500  (Light) / neutral.400 (Dark)
--semantic-color-content-disabled    → neutral.300  (Light) / neutral.600 (Dark)
--semantic-color-content-inverse     → neutral.100  (Light) / neutral.900 (Dark)
--semantic-color-content-accent      → blue.500     (Light) / blue.400   (Dark)
--semantic-color-content-onAccent    → neutral.white (both modes)

/* ── Surfaces / Backgrounds ─────────────────────────────────── */
--semantic-color-surface-page        → neutral.white (Light) / neutral.black (Dark)
--semantic-color-surface-raised      → neutral.50    (Light) / neutral.900  (Dark)
--semantic-color-surface-overlay     → neutral.100   (Light) / neutral.850  (Dark)
--semantic-color-surface-inverse     → neutral.black (Light) / neutral.white (Dark)
--semantic-color-surface-accent      → blue.500      (both modes)
--semantic-color-surface-accentSubtle→ blue.50       (Light) / blue.900   (Dark)

/* ── Borders ────────────────────────────────────────────────── */
--semantic-color-border-default      → neutral.200  (Light) / neutral.700 (Dark)
--semantic-color-border-subdued      → neutral.200  (Light) / neutral.800 (Dark)
--semantic-color-border-strong       → neutral.300  (Light) / neutral.600 (Dark)
--semantic-color-border-accent       → blue.500     (both modes)

/* ── Accent Scale ───────────────────────────────────────────── */
--semantic-accent-rest               → blue.500
--semantic-accent-hover              → blue.600
--semantic-accent-pressed            → blue.700
--semantic-accent-inactive           → blue.300
--semantic-accent-disabled           → blue.100
--semantic-accent-subtle             → blue.50

/* ── Feedback ───────────────────────────────────────────────── */
--semantic-color-feedback-error      → red.700   (Light) / red.400   (Dark)
--semantic-color-feedback-success    → green.700 (Light) / green.400 (Dark)
--semantic-color-feedback-warning    → amber.800 (Light) / amber.400 (Dark)
--semantic-color-feedback-info       → blue.500  (Light) / blue.400  (Dark)
--semantic-color-feedback-bg-error   → red.50    (Light) / red.950   (Dark)
--semantic-color-feedback-bg-success → green.50  (Light) / green.950 (Dark)
--semantic-color-feedback-bg-warning → amber.50  (Light) / amber.950 (Dark)
--semantic-color-feedback-bg-info    → blue.50   (Light) / blue.900  (Dark)`}</code>
          </pre>
        </div>

        {/* 5b: Border Radii */}
        <div style={{ marginBottom: hds.semantic.space.layout.gap }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '1rem', color: 'var(--semantic-color-content-primary)' }}>5b. Border Radii</h3>
          <pre style={{ backgroundColor: isDark ? 'rgb(20, 20, 20)' : 'rgb(245, 245, 245)', /* audit-ok: code-block surface — theme-aware fallback */ padding: hds.semantic.space.component.padding, borderRadius: 'var(--component-card-radius)' /* tier-ok: internal audit page pre-block — uses card radius */, border: '1px solid var(--semantic-color-border-default)', overflow: 'auto', fontSize: '0.75rem', fontFamily: hds.monoFamily, lineHeight: 1.7, margin: 0 }}>
            <code>{`/* ── Primitive Scale ────────────────────────────────────────── */
--primitive-radius-0    → 0px    (flush / substrate boundaries)
--primitive-radius-2    → 2px    (subtle rounding, tags)
--primitive-radius-4    → 4px    (action radius — buttons, inputs)
--primitive-radius-8    → 8px    (cards, containers)
--primitive-radius-full → 9999px (pills, avatars, circular forms)

/* ── Semantic ───────────────────────────────────────────────── */
/* tier-ok: educational token anatomy snippet intentionally shows primitive ancestry */
--semantic-radius-action → var(--primitive-radius-4)  (4px)

/* ── Component Tokens ───────────────────────────────────────── */
/* tier-ok: educational token anatomy snippet intentionally shows primitive ancestry */
--component-button-radius → var(--semantic-radius-action)  (4px)
--component-input-radius  → var(--semantic-radius-action)  (4px)
/* tier-ok: educational token anatomy snippet intentionally shows primitive ancestry */
--component-card-radius   → var(--primitive-radius-8)      (8px)

/* ── Policy ─────────────────────────────────────────────────── */
// Interactive controls (button, input, disclosure): 4px
// Containers (card, panel, modal):                  8px
// Pills / avatars / circular icons:                 full (9999px)
// Intentional flush edges (canvas, substrate):      0px`}</code>
          </pre>
        </div>

        {/* 5c: Elevation */}
        <div style={{ marginBottom: hds.semantic.space.layout.gap }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '1rem', color: 'var(--semantic-color-content-primary)' }}>5c. Elevation (Shadows & Z-Index)</h3>
          <pre style={{ backgroundColor: isDark ? 'rgb(20, 20, 20)' : 'rgb(245, 245, 245)', /* audit-ok: code-block surface — theme-aware fallback */ padding: hds.semantic.space.component.padding, borderRadius: 'var(--component-card-radius)' /* tier-ok: internal audit page pre-block — uses card radius */, border: '1px solid var(--semantic-color-border-default)', overflow: 'auto', fontSize: '0.75rem', fontFamily: hds.monoFamily, lineHeight: 1.7, margin: 0 }}>
            <code>{`/* ── Box Shadows (light / dark defined separately in theme.css) */
--hds-shadow-sm   → 0 1px 2px rgba(0,0,0,0.08)                              [light]
                  → 0 1px 2px rgba(0,0,0,0.32)                              [dark]
--hds-shadow-md   → 0 2px 8px rgba(0,0,0,0.10), 0 1px 2px rgba(0,0,0,0.06) [light]
                  → 0 2px 8px rgba(0,0,0,0.40), 0 1px 2px rgba(0,0,0,0.24) [dark]
--hds-shadow-lg   → 0 4px 24px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)[light]
                  → 0 4px 24px rgba(0,0,0,0.56), 0 2px 8px rgba(0,0,0,0.36)[dark]
--hds-shadow-card → 0 1px 3px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.04) [light]
                  → 0 1px 3px rgba(0,0,0,0.30), 0 2px 6px rgba(0,0,0,0.20) [dark]

/* ── Z-Index Scale ──────────────────────────────────────────── */
--hds-z-base:     0    (default document flow)
--hds-z-raised:   10   (sticky headers, floating elements)
--hds-z-dropdown: 100  (menus, comboboxes)
--hds-z-sticky:   200  (persistent UI chrome)
--hds-z-overlay:  300  (drawer backdrops)
--hds-z-modal:    400  (dialog / modal)
--hds-z-popover:  500  (tooltips anchored to modal content)
--hds-z-toast:    600  (notification toasts)
--hds-z-tooltip:  700  (always-on-top tooltips)

/* ── Policy ─────────────────────────────────────────────────── */
// Default to flat (no shadow). Use border-default for distinction.
// shadow-card → cards that need lift (use sparingly)
// shadow-md / lg → modals, popovers only
// Never invent box-shadow values — always reference a named token.`}</code>
          </pre>
        </div>

        {/* 5d: Transitions */}
        <div>
          <h3 style={{ fontSize: '1rem', marginBottom: '1rem', color: 'var(--semantic-color-content-primary)' }}>5d. Transitions & Motion</h3>
          <pre style={{ backgroundColor: isDark ? 'rgb(20, 20, 20)' : 'rgb(245, 245, 245)', /* audit-ok: code-block surface — theme-aware fallback */ padding: hds.semantic.space.component.padding, borderRadius: 'var(--component-card-radius)' /* tier-ok: internal audit page pre-block — uses card radius */, border: '1px solid var(--semantic-color-border-default)', overflow: 'auto', fontSize: '0.75rem', fontFamily: hds.monoFamily, lineHeight: 1.7, margin: 0 }}>
            <code>{`/* ── Primitive Durations ────────────────────────────────────── */
--hds-motion-exit-duration      → 100ms  (exit, dismiss)
--hds-motion-productive-duration→ 150ms  (hover, status, micro-interactions)
--hds-motion-expressive-duration→ 250ms  (entry, teaching moments)
--hds-motion-spatial-duration   → 400ms  (long-distance travel, page transitions)

/* ── Primitive Easing ───────────────────────────────────────── */
--hds-motion-productive-easing  → cubic-bezier(0, 0, 0.2, 1)    (decelerate)
--hds-motion-spatial-easing     → cubic-bezier(0.4, 0, 0.2, 1)  (emphasized)
--hds-motion-exit-easing        → cubic-bezier(0.4, 0, 1, 1)    (accelerate)
--hds-motion-expressive-easing  → spring { stiffness:300, damping:20, mass:1 }

/* ── Semantic Motion Roles ──────────────────────────────────── */
productive  → 150ms / decelerate  — hover, active, status changes (no deformation)
expressive  → 250ms / spring      — entry points, significant UI moments
spatial     → 400ms / emphasized  — elements crossing long viewport distances
exit        → 100ms / accelerate  — DOM removal, dismiss, collapse

/* ── Composite Animation Vars ───────────────────────────────── */
--hds-motion-productive   → 150ms cubic-bezier(0, 0, 0.2, 1)
--hds-anim-appear         → 150ms expressive-easing           (fade in)
--hds-anim-enter          → 400ms spatial-easing              (slide in)
--hds-anim-entrance       → 250ms expressive-easing           (bounce entry)
--hds-anim-skeleton       → 400ms ease-in-out infinite        (loading pulse)

/* ── Policy ─────────────────────────────────────────────────── */
// hover/active states: always productive (150ms / decelerate)
// No whileTap scale transforms — use color/border state changes instead
// Respect prefers-reduced-motion: durations collapse to 0s automatically`}</code>
          </pre>
        </div>
      </section>

      {/* SECTION 6: IMPLEMENTATION CHECKLIST */}
      <section style={{ marginBottom: hds.semantic.space.layout.gap }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', borderBottom: '2px solid var(--semantic-color-border-default)', paddingBottom: '1rem' }}>
          6. Rollout Status
        </h2>

        <Surface padding="component">
          <div>
            <div>
              <h3 style={{ fontSize: '0.95rem', marginBottom: '0.75rem', color: 'var(--semantic-color-content-primary)' }}>✓ Complete</h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, color: 'var(--semantic-color-content-secondary)' }}>
                <li>• hirobius.tokens.json updated</li>
                <li>• CSS variables generated</li>
                <li>• Stack defaults → px16</li>
                <li>• Card defaults → px24/px16</li>
                <li>• CLAUDE.md guardrails added</li>
              </ul>
            </div>
            <div>
              <h3 style={{ fontSize: '0.95rem', marginBottom: '0.75rem', color: 'var(--semantic-color-content-primary)' }}>→ Next Phase</h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, color: 'var(--semantic-color-content-secondary)' }}>
                <li>• Page components updated</li>
                <li>• Form inputs refreshed</li>
                <li>• Navigation pacing</li>
                <li>• Data table density</li>
                <li>• Portfolio asset slots</li>
              </ul>
            </div>
          </div>
        </Surface>
      </section>
      {/* SECTION 7: CODEBASE TOKEN AUDIT */}
      <section style={{ marginTop: hds.semantic.space.layout.gap }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', borderBottom: '2px solid var(--semantic-color-border-default)', paddingBottom: '1rem' }}>
          7. Codebase Token Audit — Scatter Report
        </h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--semantic-color-content-secondary)', lineHeight: 1.6, marginBottom: hds.semantic.space.layout.gap }}>
          Scan of all component and page files for values defined outside canonical token files. Updated 2026-04-22 after the shell blur tokenization pass.
        </p>

        {/* Verdict banner */}
        <Surface padding="component" style={{ marginBottom: hds.semantic.space.layout.gap }}>
          <p style={{ margin: 0, fontSize: '0.875rem', lineHeight: 1.6, color: 'var(--semantic-color-content-primary)' }}>
            <strong>Verdict:</strong> Shell blur now resolves through <code>hds.effect.blur.lightboxBackdrop</code>. Remaining overrides are intentionally documented exceptions or unavoidable CSS patterns. No rogue color palette, no scattered shadow system, no parallel radius scale.
          </p>
        </Surface>

        {/* Issue: blur mismatch */}
        <div style={{ marginBottom: hds.semantic.space.layout.gap }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '1rem', color: 'var(--semantic-color-content-primary)' }}>
            ✓ Resolved — Blur Token Alignment
          </h3>
          <pre style={{ backgroundColor: isDark ? 'rgb(20, 20, 20)' : 'rgb(245, 245, 245)', /* audit-ok: code-block surface — theme-aware fallback */ padding: hds.semantic.space.component.padding, borderRadius: 'var(--component-card-radius)' /* tier-ok: internal audit page pre-block — uses card radius */, border: `1px solid var(--semantic-color-feedback-warning)`, overflow: 'auto', fontSize: '0.75rem', fontFamily: hds.monoFamily, lineHeight: 1.7, margin: 0 }}>
            <code>{`ShellControls.tsx : mobile top bar
  backdropFilter: blur(hds.effect.blur.lightboxBackdrop)
  WebkitBackdropFilter: blur(hds.effect.blur.lightboxBackdrop)
  ↳ Resolves through the canonical fullscreen overlay blur token.`}</code>
          </pre>
        </div>

        {/* Intentional exceptions */}
        <div style={{ marginBottom: hds.semantic.space.layout.gap }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '1rem', color: 'var(--semantic-color-content-primary)' }}>
            ✓ Documented Exceptions (intentional, not violations)
          </h3>
          <pre style={{ backgroundColor: isDark ? 'rgb(20, 20, 20)' : 'rgb(245, 245, 245)', /* audit-ok: code-block surface — theme-aware fallback */ padding: hds.semantic.space.component.padding, borderRadius: 'var(--component-card-radius)' /* tier-ok: internal audit page pre-block — uses card radius */, border: '1px solid var(--semantic-color-border-default)', overflow: 'auto', fontSize: '0.75rem', fontFamily: hds.monoFamily, lineHeight: 1.7, margin: 0 }}>
            <code>{`/* ── Custom Easing (branding, marked motion-ok) ─────────────── */
AnimatedLabel.tsx  : lines 39, 51  → cubic-bezier(0.19, 1, 0.22, 1)  (expo-out)
CinematicLink.tsx  : lines 32, 44  → cubic-bezier(0.19, 1, 0.22, 1)  (expo-out)
↳ No canonical token for this specific expo-out curve. Intentional brand motion.

/* ── SVG Fill Transition (too fast at productive 150ms) ─────── */
MorphCard.tsx : line 412  → transition: 'fill 0.35s ease' // audit-ok: SVG sweep — 350ms intentional, inside template-literal doc block
↳ Intentional: SVG path sweep needs 350ms. Documented override.

/* ── Tailwind Duration Utilities (animation choreography) ───── */
InfoPage.tsx    : line 20   → duration-300  (300ms)
CinematicLink.tsx: lines 31, 43 → duration-500  (500ms)
AnimatedLabel.tsx: lines 38, 50 → duration-500  (500ms)
↳ Outside HDS token system by design. Specific animation choreography.

/* ── Geometric CSS (not a token concern) ────────────────────── */
8 instances of '50%' across components → used for transform: translate(-50%,-50%)
and border-radius: 50% for circles. Unavoidable CSS geometry pattern.

/* ── Token.module.css ────────────────────────────────────────── */
line 58 → transition: background-color 150ms ease // audit-ok: inside template-literal doc block, canonical-aligned value (150ms = --primitive-duration-short)
↳ 150ms maps exactly to --primitive-duration-short. Canonical-aligned.`}</code>
          </pre>
        </div>

        {/* Action items */}
        <div>
          <h3 style={{ fontSize: '1rem', marginBottom: '1rem', color: 'var(--semantic-color-content-primary)' }}>
            Action Items
          </h3>
          <div>
            <Surface padding="component">
              <div style={{ marginBottom: '0.5rem', color: 'var(--semantic-color-content-primary)' }}>Fixed</div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, color: 'var(--semantic-color-content-secondary)' }}>
                <li>• ShellControls blur → lightboxBackdrop token</li>
                <li>• Retired geometry playground removed from the app surface</li>
              </ul>
            </Surface>
            <Surface padding="component">
              <div style={{ marginBottom: '0.5rem', color: 'var(--semantic-color-content-primary)' }}>Monitor</div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, color: 'var(--semantic-color-content-secondary)' }}>
                <li>• Expo-out easing — add token if reused elsewhere</li>
                <li>• Tailwind durations — consolidate if count grows</li>
              </ul>
            </Surface>
          </div>
        </div>
      </section>

    </Surface>
  );
}
