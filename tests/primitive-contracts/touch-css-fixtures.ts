/**
 * Stylesheet helpers shared by the contract suites that read theme.css's touch
 * block (phone width or a coarse pointer): jsdom has no layout or media
 * queries, so the rules are read from the source.
 *
 * Not a test file (no `.test.` in the name), so vitest does not collect it.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { expect } from 'vitest';

export const theme = readFileSync(resolve(__dirname, '../../src/styles/theme.css'), 'utf8');
export const TOUCH_QUERY = '@media (max-width: 639px), (pointer: coarse)';

/** The text from `from` to the end of the first `{ ... }` block after it. */
export function block(css: string, from: number): string {
  let depth = 0;
  for (let i = css.indexOf('{', from); i < css.length; i++) {
    if (css[i] === '{') depth++;
    if (css[i] === '}' && --depth === 0) return css.slice(from, i + 1);
  }
  throw new Error('unbalanced block');
}

/** theme.css's touch block. */
export const touchBlock = () => block(theme, theme.indexOf(TOUCH_QUERY));

/** The declarations of `selector` inside the touch block. */
export function touchRule(selector: string): string {
  const media = touchBlock();
  const at = media.indexOf(`${selector} {`);
  expect(at, `${selector} inside ${TOUCH_QUERY}`).toBeGreaterThan(-1);
  return block(media, at);
}
