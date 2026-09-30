/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * The generated component page renders a "When to use" block (when, when not,
 * use instead) above the accessibility rules.
 */
import { describe, expect, it } from 'vitest';
import { renderPage } from '../lib/component-page.mjs';

const page = (spec) =>
  renderPage({
    name: 'Stat',
    spec: {
      filePath: 'src/app/components/stat.tsx',
      a11yRules: [{ rule: 'Has a label.' }],
      ...spec,
    },
    props: [],
    tokens: [],
    defects: [],
    repo: 'https://example.test/repo',
  });

describe('component page "When to use"', () => {
  const html = page({
    usage: {
      when: 'Show one headline figure.',
      whenNot: 'A figure inside a Card.',
      useInstead: [{ component: 'Card.Metric', reason: 'inside a Card' }, { component: 'Other' }],
    },
  });

  it('renders when, when not and use instead', () => {
    expect(html).toContain('When to use');
    expect(html).toContain('Show one headline figure.');
    expect(html).toContain('A figure inside a Card.');
    expect(html).toContain('<code>Card.Metric</code>');
    expect(html).toContain('inside a Card');
    expect(html).toContain('<code>Other</code>');
  });

  it('places the block above the accessibility rules', () => {
    expect(html.indexOf('When to use')).toBeLessThan(html.indexOf('Accessibility'));
  });

  it('escapes tag text', () => {
    expect(page({ usage: { when: '<b>x</b> when' } })).toContain('&lt;b&gt;x&lt;/b&gt; when');
  });

  it('renders no block for a component without usage', () => {
    expect(page({})).not.toContain('When to use');
  });
});
