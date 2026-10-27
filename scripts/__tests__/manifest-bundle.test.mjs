/**
 * Tests for scripts/lib/manifest-bundle.mjs — the fields the bundled
 * `@hirobius/design-system/manifest` entry leaves out of public/hds-manifest.json
 * to stay under its size budget (hds#413).
 */

import { describe, it, expect } from 'vitest';
import { slimManifestForBundle } from '../lib/manifest-bundle.mjs';

const URL = 'https://www.figma.com/design/AbC123/HDS?node-id=1-2';

function fixture() {
  return {
    name: 'HDS',
    componentSpecs: {
      Button: {
        description: 'A button.',
        figmaUrl: URL,
        figmaLink: URL,
        consumers: ['src/app/components/card.tsx'],
        a11yRules: [
          {
            rule: 'Enter activates it.',
            required: true,
            owner: 'component',
            testId: 'a11y:button.enter',
          },
        ],
      },
    },
    utilities: { Spacer: { description: 'Space.', figmaLink: null, consumers: [] } },
  };
}

describe('slimManifestForBundle', () => {
  it('drops the duplicate figmaLink, repo-internal consumers and a11y testIds', () => {
    const slim = slimManifestForBundle(fixture());
    expect(slim.componentSpecs.Button).toEqual({
      description: 'A button.',
      figmaUrl: URL,
      a11yRules: [{ rule: 'Enter activates it.', required: true, owner: 'component' }],
    });
    expect(slim.utilities.Spacer).toEqual({ description: 'Space.' });
    expect(slim.name).toBe('HDS');
  });

  it('leaves its input untouched (public/hds-manifest.json keeps every field)', () => {
    const input = fixture();
    slimManifestForBundle(input);
    expect(input).toEqual(fixture());
  });

  it('only drops figmaLink where figmaUrl carries the same link', () => {
    const input = fixture();
    input.componentSpecs.Button.figmaUrl = null;
    expect(slimManifestForBundle(input).componentSpecs.Button.figmaLink).toBe(URL);
  });
});
