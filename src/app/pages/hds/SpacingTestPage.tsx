// font-ok: spacing test page intentionally uses monospace demo labels during visual inspection
import { useTheme } from '../../context/ThemeContext';
import hds from '../../design-system/tokens';
import { Button } from '../../components/button';
import { ActivityFeed, defaultActivityEvents } from '../../components/activity-feed';
import { Stack } from '../../components/stack';
import { Surface } from '../../components/surface';



export default function SpacingTestPage() {
  const { isDark } = useTheme();

  const primitiveSpaces = [
    { name: 'px1', value: 1, px: '1px', usage: 'hairline offsets' },
    { name: 'px2', value: 2, px: '2px', usage: 'subgrid' },
    { name: '1', value: 4, px: '4px', usage: 'subgrid gap' },
    { name: 'px6', value: 6, px: '6px', usage: 'minimal offsets' },
    { name: '2', value: 8, px: '8px', usage: 'component gap (TOO TIGHT)' },
    { name: 'px10', value: 10, px: '10px', usage: 'uncommon' },
    { name: '3', value: 12, px: '12px', usage: 'component padding (TIGHT)' },
    { name: '4', value: 16, px: '16px', usage: 'component padding (ok)' },
    { name: '5', value: 20, px: '20px', usage: 'sidebar rail padding' },
    { name: '6', value: 24, px: '24px', usage: 'layout gutter' },
    { name: '7', value: 28, px: '28px', usage: 'middle ground (MISSING)' },
    { name: '8', value: 32, px: '32px', usage: 'layout gap' },
    { name: '10', value: 40, px: '40px', usage: 'large gap (MISSING)' },
    { name: '12', value: 48, px: '48px', usage: 'card gaps (missing)' },
    { name: '16', value: 64, px: '64px', usage: 'section rhythm' },
    { name: '20', value: 80, px: '80px', usage: 'section stack' },
    { name: '24', value: 96, px: '96px', usage: 'large section' },
    { name: '32', value: 128, px: '128px', usage: 'max section inset' },
  ];

  const problems = [
    {
      title: 'Component Gap Too Tight',
      current: '8px (primitive.space.2)',
      problem: 'With 16px/line-height text (line-height: 1.5), an 8px gap between items feels crammed.',
      solution: '12px or 16px for breathing room',
      math: 'Text line-height (24px visual) + 8px gap = 32px total = claustrophobic',
    },
    {
      title: 'Component Padding Conservative',
      current: '12px (primitive.space.3)',
      problem: 'Cards and containers feel packed. Not enough padding to frame content.',
      solution: '16px or 20px for better framing',
      math: '12px padding on all sides + 16px content width = cramped visual frame',
    },
    {
      title: 'Layout Gap Stops at 32px',
      current: '32px (primitive.space.8)',
      problem: 'No middle-ground option between layout.gap (32px) and section.stack (80px). Designers jump straight to dividers.',
      solution: 'Add 48px or 64px intermediate steps',
      math: 'Missing: (32px + 80px) / 2 = 56px ideal middle ground',
    },
    {
      title: 'Sidebar Spacing Too Tight',
      current: '16px item gap, 12px section gap',
      problem: 'Sidebar nav items (14px text + 16px gap) feel cramped when combined with underlines/active states.',
      solution: '20px or 24px between sidebar items; 16px or 20px between sections',
      math: '14px text + 1.5 line = 21px visual + 16px gap = 37px total (ok but tight)',
    },
    {
      title: 'No Divider Alternative',
      current: 'Dividers used as visual separators because space is insufficient',
      problem: 'Dividers are a crutch when spacing alone isn\'t enough to create perception of separation.',
      solution: 'Increase gap to 40-48px between card groups; remove dividers',
      math: 'Perception of separation = (font-size × line-height) + gap × 1.5',
    },
  ];

  const currentSystem = [
    { tier: 'Subgrid', range: 'px1 - px6', values: '1-6px', context: 'Hairlines, badge internals, icons' },
    { tier: 'Component', range: 'space.2 - space.4', values: '8-16px', context: 'Button padding, form gaps, card internals (DENSE)' },
    { tier: 'Layout', range: 'space.6 - space.8', values: '24-32px', context: 'Card gutters, grid gaps (NO MIDDLE GROUND)' },
    { tier: 'Section', range: 'space.16 - space.32', values: '64-128px', context: 'Page rhythm, hero spacing' },
  ];

  const proposedSystem = [
    { tier: 'Subgrid', range: 'px1 - px6', values: '1-6px', context: 'Hairlines, badge internals, icons (unchanged)' },
    { tier: 'Component', range: 'space.2 - space.6', values: '8-24px', context: 'Button padding (16px), form gaps (16px), card gaps (20px), card padding (20px)' },
    { tier: 'Layout', range: 'space.8 - space.12', values: '32-48px', context: 'Card grid gaps (40px), panel gaps (48px) ✓ breathing room' },
    { tier: 'Section', range: 'space.16 - space.32', values: '64-128px', context: 'Page rhythm, hero spacing (unchanged)' },
  ];

  return (
    <Surface padding="component">
      <h1 style={{ marginBottom: '0.5rem', fontSize: '2rem' }}>
        Spacing Audit: Density vs. Breathability
      </h1>
      <p style={{ marginBottom: '3rem', color: 'var(--semantic-color-content-secondary)', fontSize: '1rem', lineHeight: 1.5 }}>
        Analyzing the current spacing scale to understand why the system feels compressed and how to improve it.
      </p>

      <section style={{ marginBottom: '4rem' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Identified Problems</h2>
        <Stack direction="column" gap="normal">
          {problems.map((problem) => (
            <Surface key={problem.title} padding="component">
              <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem', color: 'var(--semantic-color-content-primary)' }}>
                {problem.title}
              </h3>
              <p style={{ margin: '0 0 0.5rem', fontSize: '0.875rem', color: 'var(--semantic-color-content-secondary)' }}>
                <strong>Current:</strong> {problem.current}
              </p>
              <p style={{ margin: '0 0 0.5rem', fontSize: '0.875rem', color: 'var(--semantic-color-content-secondary)' }}>
                <strong>Problem:</strong> {problem.problem}
              </p>
              <p style={{ margin: '0 0 0.5rem', fontSize: '0.875rem', color: 'var(--semantic-color-feedback-success)' }}>
                <strong>Solution:</strong> {problem.solution}
              </p>
              <code style={{ fontSize: '0.8rem', fontFamily: 'monospace', color: 'var(--semantic-color-content-secondary)' }}>
                {problem.math}
              </code>
            </Surface>
          ))}
        </Stack>
      </section>

      <section style={{ marginBottom: '4rem' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Primitive Spacing Scale</h2>
        <Stack direction="column" gap="tight">
          {primitiveSpaces.map((space) => (
            <Surface key={space.name} padding="component">
              <strong>{space.name}</strong> ({space.px}): {space.usage}
            </Surface>
          ))}
        </Stack>
      </section>

      <section style={{ marginBottom: '4rem' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Current vs. Proposed Tiers</h2>
        <Stack direction="column" gap="normal">
          {[['Current System', currentSystem], ['Proposed System', proposedSystem]].map(([title, tiers]) => (
            <Surface key={title as string} padding="component">
              <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>{title as string}</h3>
              <Stack direction="column" gap="tight">
                {(tiers as typeof currentSystem).map((tier) => (
                  <div key={`${title}-${tier.tier}`}>
                    <strong>{tier.tier}</strong> <code>{tier.range}</code> {tier.values}
                    <p style={{ margin: '0.25rem 0 0', color: 'var(--semantic-color-content-secondary)' }}>{tier.context}</p>
                  </div>
                ))}
              </Stack>
            </Surface>
          ))}
        </Stack>
      </section>

      <section style={{ marginBottom: '4rem' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
          Activity Feed Breathable Scale Live Test
        </h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--semantic-color-content-secondary)', lineHeight: 1.6, marginBottom: '2rem' }}>
          48px between items, 16px inside each item, no dividers. White space is the only separator.
        </p>
        <ActivityFeed events={defaultActivityEvents} />
      </section>

      <section style={{ marginBottom: '4rem' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Dense Settings Form</h2>
        <Surface padding="component" theme={isDark ? 'dark' : 'light'}>
          <Stack as="form" direction="column" gap="normal" style={{ width: '100%' }}>
            <Stack direction="column" gap="gap">
              <span style={{ ...hds.typeStyles.ui, color: 'var(--semantic-color-content-primary)' }}>
                Display name
              </span>
              <input type="text" defaultValue="" placeholder="e.g. Adrian Milsap" aria-invalid="true" aria-describedby="display-name-error" />
              <span id="display-name-error" role="alert" style={{ ...hds.typeStyles.caption, color: 'var(--semantic-color-feedback-error)' }}>
                Display name is required.
              </span>
            </Stack>
            <Stack direction="row" gap="tight" justify="start" align="center">
              <Button type="submit" variant="primary" size="md">Save preferences</Button>
              <Button type="button" variant="secondary" size="md">Cancel</Button>
            </Stack>
          </Stack>
        </Surface>
      </section>

      <section>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Recommendations</h2>
        <Surface padding="component">
          <ol style={{ marginLeft: '1.5rem', lineHeight: 1.8, fontSize: '0.95rem' }}>
            <li>Use 8px for label/input rhythm and 24px for separate form groups.</li>
            <li>Increase card and form padding from 12px to 24px.</li>
            <li>Add a 48px middle-ground option between layout gap and section stack.</li>
            <li>Remove dividers where space alone can create separation.</li>
          </ol>
        </Surface>
      </section>
    </Surface>
  );
}
