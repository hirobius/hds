/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * The llms.txt "Which one when" section: one line per component that has
 * usage.when, in the form `Name: when. Use instead: X`.
 */
import { describe, expect, it } from 'vitest';
import { buildWhichOneWhen } from '../lib/which-one-when.mjs';

describe('buildWhichOneWhen', () => {
  const specs = {
    Zed: { usage: { when: 'Last one.' } },
    Stat: {
      usage: {
        when: 'Show one headline figure.',
        useInstead: [{ component: 'Card.Metric', reason: 'inside a Card' }, { component: 'Other' }],
      },
    },
    Hidden: { hidden: true, usage: { when: 'Should not appear.' } },
    Untagged: {},
    Button: { usage: { when: 'Trigger an action', useInstead: [{ component: 'InlineLink' }] } },
  };

  it('emits one sorted line per visible component with usage.when', () => {
    expect(buildWhichOneWhen(specs).split('\n')).toEqual([
      'Button: Trigger an action. Use instead: InlineLink',
      'Stat: Show one headline figure. Use instead: Card.Metric, Other',
      'Zed: Last one.',
    ]);
  });

  it('names the use-instead target and never repeats a closing period', () => {
    const line = buildWhichOneWhen(specs).split('\n')[1];
    expect(line).not.toContain('..');
    expect(line).toContain('Card.Metric');
  });

  it('marks core components with [core] after the name (hds#374)', () => {
    const lines = buildWhichOneWhen({
      Button: { core: true, usage: { when: 'Trigger an action' } },
      Stat: { usage: { when: 'Show one figure.' } },
    }).split('\n');
    expect(lines).toEqual(['Button: [core] Trigger an action.', 'Stat: Show one figure.']);
  });

  it('leaves out a deprecated component (hds#390)', () => {
    const lines = buildWhichOneWhen({
      ...specs,
      Old: { deprecated: 'Use Zed.', removeIn: '1.0.0', usage: { when: 'Old way.' } },
    });
    expect(lines).not.toContain('Old:');
    expect(lines).toContain('Zed: Last one.');
  });

  it('returns an empty string when nothing is tagged', () => {
    expect(buildWhichOneWhen({ A: {} })).toBe('');
  });
});
