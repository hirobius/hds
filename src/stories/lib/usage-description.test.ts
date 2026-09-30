import { describe, expect, it } from 'vitest';
import type { ComponentApiManifest } from '../../app/data/manifest-types';
import { extractUsageDescription, withUsageBlock } from './usage-description';

const api: ComponentApiManifest = {
  components: {
    Button: {
      description: 'Triggers an action when activated.',
      usage: {
        when: 'Trigger an action.',
        whenNot: 'Navigating to another page.',
        useInstead: [
          { component: 'InlineLink', reason: 'navigation' },
          { component: 'IconButton' },
        ],
      },
    },
    Plain: { description: 'No tags.' },
  },
};

describe('withUsageBlock', () => {
  it('appends when, when not and use instead after the docgen description', () => {
    const out = withUsageBlock('Triggers an action when activated.', api.components!.Button.usage);
    expect(out.startsWith('Triggers an action when activated.')).toBe(true);
    expect(out).toContain('**When to use:** Trigger an action.');
    expect(out).toContain('**When not:** Navigating to another page.');
    expect(out).toContain('**Use instead:** `InlineLink` (navigation), `IconButton`');
  });

  it('returns the description untouched when there is no usage', () => {
    expect(withUsageBlock('Plain.', undefined)).toBe('Plain.');
    expect(withUsageBlock('Plain.', {})).toBe('Plain.');
  });

  it('works when the docgen description is empty', () => {
    expect(withUsageBlock('', { when: 'Do it.' })).toBe('**When to use:** Do it.');
  });
});

describe('extractUsageDescription', () => {
  it('reads the docgen description off the component and appends its usage block', () => {
    const component = { displayName: 'Button', __docgenInfo: { description: 'From docgen.' } };
    expect(extractUsageDescription(component, api)).toBe(
      'From docgen.\n\n**When to use:** Trigger an action.\n\n**When not:** Navigating to another page.\n\n**Use instead:** `InlineLink` (navigation), `IconButton`',
    );
  });

  it('falls back to the docgen displayName when the component has none', () => {
    const component = { __docgenInfo: { displayName: 'Button', description: 'D.' } };
    expect(extractUsageDescription(component, api)).toContain('**When to use:**');
  });

  it('leaves an untagged or unknown component with its docgen description', () => {
    expect(
      extractUsageDescription({ displayName: 'Plain', __docgenInfo: { description: 'X.' } }, api),
    ).toBe('X.');
    expect(extractUsageDescription({ displayName: 'Nope' }, api)).toBe('');
    expect(extractUsageDescription(undefined, api)).toBe('');
  });
});
