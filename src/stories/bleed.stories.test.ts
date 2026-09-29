import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';

const source = readFileSync(resolve(process.cwd(), 'src/stories/bleed.stories.tsx'), 'utf8');

describe('bleed stories tokens', () => {
  it('hardcodes no colour literals', () => {
    expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(source).not.toMatch(/color:\s*'(white|black)'/);
  });

  it('only references semantic tokens that exist', () => {
    const css = readFileSync(resolve(process.cwd(), 'src/styles/tokens.generated.css'), 'utf8');
    for (const [, name] of source.matchAll(/var\((--[a-zA-Z0-9-]+)/g)) {
      expect(css, name).toContain(`${name}:`);
    }
  });
});
