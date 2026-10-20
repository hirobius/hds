/**
 * Tests for the TokenField edit model (hds#826): value + caret in, value +
 * caret out. Expected strings are spelled out, not derived.
 */
import { describe, it, expect } from 'vitest';
import {
  defaultTokenLabel,
  insertAt,
  removeTokenAt,
  snapOutOfToken,
  splitTokens,
  stepOver,
} from './token-field-model';

describe('splitTokens', () => {
  it('joins back to the value exactly', () => {
    const value = 'Hi [Name],\n[Company][Role] thanks';
    const segs = splitTokens(value);
    expect(segs.map((s) => (s.kind === 'text' ? s.text : s.token)).join('')).toBe(value);
    expect(segs.filter((s) => s.kind === 'token').map((s) => s.token)).toEqual([
      '[Name]',
      '[Company]',
      '[Role]',
    ]);
  });

  it('leaves blank brackets and multi-line brackets as text', () => {
    expect(splitTokens('[ ] and [a\nb]')).toEqual([{ kind: 'text', text: '[ ] and [a\nb]' }]);
  });

  it('takes a custom pattern, global or not', () => {
    expect(splitTokens('Hi {{name}}!', /\{\{\w+\}\}/)).toEqual([
      { kind: 'text', text: 'Hi ' },
      { kind: 'token', token: '{{name}}' },
      { kind: 'text', text: '!' },
    ]);
  });
});

describe('insertAt', () => {
  it('replaces the selection and puts the caret after the text', () => {
    expect(insertAt('Hello world', 6, 11, '[Name]')).toEqual({ value: 'Hello [Name]', caret: 12 });
  });

  it('clamps offsets past the end', () => {
    expect(insertAt('Hi', 9, 9, '!')).toEqual({ value: 'Hi!', caret: 3 });
  });
});

describe('removeTokenAt', () => {
  it.each([
    ['back, just after a token', 'a [Name] b', 8, 'back', { value: 'a  b', caret: 2 }],
    ['forward, just before a token', 'a [Name] b', 2, 'forward', { value: 'a  b', caret: 2 }],
    ['back at the end', 'Hi [Name]', 9, 'back', { value: 'Hi ', caret: 3 }],
    ['forward at the start', '[Name] hi', 0, 'forward', { value: ' hi', caret: 0 }],
    ['back between two tokens takes the first', '[A][B]', 3, 'back', { value: '[B]', caret: 0 }],
    [
      'forward between two tokens takes the second',
      '[A][B]',
      3,
      'forward',
      { value: '[A]', caret: 3 },
    ],
  ] as const)('%s', (_name, value, caret, dir, expected) => {
    expect(removeTokenAt(value, caret, dir)).toEqual(expected);
  });

  it('returns null away from a token, so the browser deletes one character', () => {
    expect(removeTokenAt('a [Name] b', 1, 'back')).toBeNull();
    expect(removeTokenAt('a [Name] b', 9, 'forward')).toBeNull();
  });

  it('uses the custom pattern', () => {
    expect(removeTokenAt('x {{n}}', 7, 'back', /\{\{\w+\}\}/g)).toEqual({ value: 'x ', caret: 2 });
  });
});

describe('stepOver and snapOutOfToken', () => {
  it('steps over a whole token in either direction', () => {
    expect(stepOver('a [Name] b', 2, 'forward')).toBe(8);
    expect(stepOver('a [Name] b', 8, 'back')).toBe(2);
    expect(stepOver('a [Name] b', 1, 'forward')).toBeNull();
  });

  it('moves a caret inside a token to its end', () => {
    expect(snapOutOfToken('a [Name] b', 4)).toBe(8);
    expect(snapOutOfToken('a [Name] b', 2)).toBe(2);
  });
});

it('labels a token by its trimmed name', () => {
  expect(defaultTokenLabel('[ Hiring manager ]')).toBe('Hiring manager');
});
