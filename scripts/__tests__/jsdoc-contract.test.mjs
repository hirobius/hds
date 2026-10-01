/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Tests for scripts/lib/jsdoc-contract.mjs: the pure parser for the component
 * contract tags (@usage, @whenNot, @useInstead, @slot, @keyboard, @ai-rules).
 */
import { describe, it, expect } from 'vitest';
import {
  compactContract,
  mergeSlots,
  parseDeprecation,
  parseJsdocContract,
  stripJsdocTags,
} from '../lib/jsdoc-contract.mjs';

const block = (...lines) => `/**\n${lines.map((l) => ` * ${l}`).join('\n')}\n */`;

describe('parseJsdocContract', () => {
  it('returns the empty contract for a block with no tags', () => {
    expect(parseJsdocContract(block('Just a description.'))).toEqual({
      usage: { when: null, whenNot: null, useInstead: [] },
      slots: [],
      keyboard: [],
      aiRules: null,
    });
  });

  it('returns the empty contract for an empty string', () => {
    expect(parseJsdocContract('').usage.when).toBeNull();
  });

  it('reads @usage and @whenNot', () => {
    const out = parseJsdocContract(
      block('Desc.', '@usage Trigger an action.', '@whenNot Navigating between pages.'),
    );
    expect(out.usage.when).toBe('Trigger an action.');
    expect(out.usage.whenNot).toBe('Navigating between pages.');
  });

  it('reads repeated @useInstead into component + optional reason', () => {
    const out = parseJsdocContract(
      block('@useInstead Card.Metric a single KPI figure', '@useInstead InlineLink'),
    );
    expect(out.usage.useInstead).toEqual([
      { component: 'Card.Metric', reason: 'a single KPI figure' },
      { component: 'InlineLink', reason: null },
    ]);
  });

  it('reads repeated @slot into name + description', () => {
    const out = parseJsdocContract(
      block('@slot trigger The element that opens the menu.', '@slot content The popup.'),
    );
    expect(out.slots).toEqual([
      { name: 'trigger', description: 'The element that opens the menu.' },
      { name: 'content', description: 'The popup.' },
    ]);
  });

  it('reads repeated @keyboard into keys + effect', () => {
    const out = parseJsdocContract(
      block(
        '@keyboard ArrowDown Moves focus to the next item.',
        '@keyboard Escape Closes the menu.',
      ),
    );
    expect(out.keyboard).toEqual([
      { keys: 'ArrowDown', effect: 'Moves focus to the next item.' },
      { keys: 'Escape', effect: 'Closes the menu.' },
    ]);
  });

  it('reads @ai-rules, now parsed', () => {
    const out = parseJsdocContract(block('@ai-rules sx colors MUST use token keys.'));
    expect(out.aiRules).toBe('sx colors MUST use token keys.');
  });

  it('runs a tag body across continuation lines until the next tag', () => {
    const out = parseJsdocContract(
      block(
        'Desc.',
        '@usage First line of the sentence',
        '  and its second line.',
        '@whenNot Something else',
        'over two lines.',
      ),
    );
    expect(out.usage.when).toBe('First line of the sentence and its second line.');
    expect(out.usage.whenNot).toBe('Something else over two lines.');
  });

  it('runs the last tag body to the end of the block when no blank line intervenes', () => {
    const out = parseJsdocContract(block('@ai-rules Rule one.', 'Rule two.', 'Rule three.'));
    expect(out.aiRules).toBe('Rule one. Rule two. Rule three.');
  });

  it('closes a tag body at a blank line so a later paragraph stays prose', () => {
    const b = block('Intro.', '@ai-rules Rule one', 'wrapped.', '', 'Second paragraph.');
    expect(parseJsdocContract(b).aiRules).toBe('Rule one wrapped.');
    expect(stripJsdocTags(b)).toBe('Intro. Second paragraph.');
  });

  it('ignores tags it does not own and empty bodies', () => {
    const out = parseJsdocContract(block('@category Actions', '@usage', '@tier primitive'));
    expect(out.usage.when).toBeNull();
  });
});

describe('stripJsdocTags', () => {
  it('keeps only the prose above the first tag', () => {
    const b = block('Line one.', 'Line two.', '@category Actions', '@tier primitive');
    expect(stripJsdocTags(b)).toBe('Line one. Line two.');
  });

  it('does not leak continuation lines of any tag into the description', () => {
    const b = block(
      'Container.',
      '@ai-rules sx colors MUST use token keys',
      'not raw values.',
      '@usage When to use.',
      'Second line of usage.',
    );
    const out = stripJsdocTags(b);
    expect(out).toBe('Container.');
    expect(out).not.toContain('token keys');
    expect(out).not.toContain('Second line');
  });

  it('returns the whole text when there are no tags', () => {
    expect(stripJsdocTags(block('Only  prose', 'here.'))).toBe('Only prose here.');
  });
});

describe('compactContract', () => {
  it('drops every empty field so untagged components add nothing to the output', () => {
    expect(compactContract(parseJsdocContract(block('Just prose.')))).toEqual({});
  });

  it('omits a null reason from useInstead entries', () => {
    const out = compactContract(
      parseJsdocContract(block('@useInstead Card.Metric a KPI', '@useInstead InlineLink')),
    );
    expect(out.usage.useInstead).toEqual([
      { component: 'Card.Metric', reason: 'a KPI' },
      { component: 'InlineLink' },
    ]);
  });

  it('keeps populated fields only', () => {
    const out = compactContract(
      parseJsdocContract(block('@usage Do it.', '@keyboard Enter Activates.')),
    );
    expect(out).toEqual({
      usage: { when: 'Do it.' },
      keyboard: [{ keys: 'Enter', effect: 'Activates.' }],
    });
  });
});

describe('mergeSlots', () => {
  const hand = [
    { name: 'root', figmaSlotName: 'Root', tokenBinding: { gap: 'semantic.space.layout.gap' } },
  ];

  it('never overwrites a hand-kept slot of the same name', () => {
    const out = mergeSlots(hand, [{ name: 'root', description: 'Tag text.' }]);
    expect(out).toEqual(hand);
  });

  it('appends tagged slots the manifest does not have yet, marked as jsdoc-sourced', () => {
    const out = mergeSlots(hand, [{ name: 'trigger', description: 'Opens it.' }]);
    expect(out).toEqual([...hand, { name: 'trigger', description: 'Opens it.', source: 'jsdoc' }]);
  });

  it('is idempotent and drops jsdoc-sourced slots whose tag was removed', () => {
    const once = mergeSlots(hand, [{ name: 'trigger', description: 'Opens it.' }]);
    expect(mergeSlots(once, [{ name: 'trigger', description: 'Opens it.' }])).toEqual(once);
    expect(mergeSlots(once, [])).toEqual(hand);
  });

  it('returns undefined when there is nothing to keep', () => {
    expect(mergeSlots(undefined, [])).toBeUndefined();
  });
});

describe('parseDeprecation (hds#390)', () => {
  it('is null for a block with no @deprecated tag, even if it has @removeIn or @useInstead', () => {
    expect(
      parseDeprecation(block('Card.', '@useInstead Stat a KPI', '@removeIn 1.0.0')),
    ).toBeNull();
    expect(parseDeprecation('')).toBeNull();
  });

  it('reads the notice, the removal version and the replacement', () => {
    const out = parseDeprecation(
      block(
        'Cluster.',
        '@deprecated Use Stack with wrap; the gap map is the same.',
        '@removeIn 1.0.0',
        '@useInstead Stack wrapping rows',
      ),
    );
    expect(out).toEqual({
      deprecated: 'Use Stack with wrap; the gap map is the same.',
      removeIn: '1.0.0',
      useInstead: 'Stack',
    });
  });

  it('joins a notice wrapped over several lines and leaves out absent fields', () => {
    const out = parseDeprecation(block('@deprecated Sketch is a docs/lab', 'internal.'));
    expect(out).toEqual({ deprecated: 'Sketch is a docs/lab internal.' });
  });

  it('gives a bare @deprecated tag a notice, so the field is never empty', () => {
    expect(parseDeprecation(block('@deprecated', '@removeIn 2.0.0'))).toEqual({
      deprecated: 'Deprecated.',
      removeIn: '2.0.0',
    });
  });

  it('ignores an @deprecated word inside prose', () => {
    expect(parseDeprecation(block('variant="diagram" is a @deprecated alias.'))).toBeNull();
  });
});
