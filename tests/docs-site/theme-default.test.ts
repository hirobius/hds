/**
 * The docs site follows the reader's OS light/dark setting until they pick one:
 * next-themes' defaultTheme is 'system', not a fixed 'light'.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const layout = readFileSync(path.resolve(__dirname, '../../docs-site/app/layout.tsx'), 'utf8');

describe('docs site theme', () => {
  it('defaults to the OS setting', () => {
    expect(layout).toMatch(/defaultTheme:\s*'system'/);
    expect(layout).not.toMatch(/enableSystem:\s*false/);
  });
});
