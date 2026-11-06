/**
 * Seam under test: `consumerChecklist(specs)` and `contractIndex(specs)` — the
 * build-time generators behind the Accessibility foundation page (hds#1228). The
 * page lists the `@a11y` contracts from the manifest, never hand-written prose.
 * Expected values below are worked examples, not recomputed from the code.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  consumerChecklist,
  contractIndex,
  contractTotals,
} from '../../docs-site/lib/a11y-contracts';
// @ts-expect-error — plain .mjs module, no types
import { AXE_TAGS } from '../../scripts/lib/axe-gate.mjs';

const specs = {
  Button: {
    docsPage: '/docs/components/button',
    a11yRules: [
      { rule: 'Enter activates.', required: true, owner: 'component', testId: 'a11y:button.key' },
      { rule: 'Give an icon-only Button a label.', required: true, owner: 'consumer' },
    ],
  },
  Alert: {
    a11yRules: [
      { rule: 'Mount it when the condition appears.', required: false, owner: 'consumer' },
      { rule: 'No owner stated.', required: true },
    ],
  },
  Stat: {
    deprecated: 'Use a Card.',
    a11yRules: [{ rule: 'Name the value.', required: true, owner: 'consumer' }],
  },
  Box: {},
};

describe('consumerChecklist', () => {
  it('groups consumer-owned rules by component, skipping deprecated components', () => {
    expect(consumerChecklist(specs)).toEqual([
      {
        component: 'Alert',
        href: null,
        rules: [{ rule: 'Mount it when the condition appears.', required: false }],
      },
      {
        component: 'Button',
        href: '/docs/components/button',
        rules: [{ rule: 'Give an icon-only Button a label.', required: true }],
      },
    ]);
  });
});

describe('contractIndex', () => {
  it('counts the rules HDS keeps, the rules the consumer keeps and the unassigned ones', () => {
    expect(contractIndex(specs)).toEqual([
      { component: 'Alert', href: null, hds: 0, consumer: 1, unassigned: 1 },
      { component: 'Button', href: '/docs/components/button', hds: 1, consumer: 1, unassigned: 0 },
    ]);
  });

  it('totals the index', () => {
    expect(contractTotals(specs)).toEqual({ components: 2, hds: 1, consumer: 2, unassigned: 1 });
  });
});

describe('content/docs/foundations/accessibility.mdx', () => {
  const body = readFileSync('content/docs/foundations/accessibility.mdx', 'utf8');

  it('states the WCAG level the axe gate actually scans for', () => {
    // check-docs-axe runs AXE_TAGS; the page's claim must move with them.
    expect(AXE_TAGS).toContain('wcag22aa');
    expect(body).toContain('WCAG 2.2 level AA');
  });

  it('builds its lists from the manifest, not hand-written rows', () => {
    expect(body.trimStart()).toMatch(/^---/);
    for (const tag of [
      '<A11yGuarantees />',
      '<A11yConsumerChecklist />',
      '<A11yContractIndex />',
    ]) {
      expect(body).toContain(tag);
    }
    expect(body).toContain('{/* generated: tokens */}');
  });
});
