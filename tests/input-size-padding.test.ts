// @vitest-environment node
/**
 * Input horizontal padding per size (hds#1323): component.input.paddingX is
 * the md (default) value, 12px; sm draws 8px and lg 16px, which had no token,
 * so Figma's sm Input had nothing to bind. Each size now has its own token, and
 * check-component-token-binding proves code draws each value.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(__dirname, '..');
const tokens = JSON.parse(readFileSync(join(ROOT, 'hirobius.tokens.json'), 'utf8'));
const report = JSON.parse(
  execFileSync('node', ['scripts/check-component-token-binding.mjs', '--json'], {
    cwd: ROOT,
    encoding: 'utf8',
  }),
);
const leaf = (id: string) => report.results.find((r: { id: string }) => r.id === id);

describe('Input paddingX per size', () => {
  it.each([
    ['sm', '{semantic.space.scale.xs}'],
    ['lg', '{semantic.space.fixed.sm}'],
  ])('component.input.size.%s.paddingX is %s', (size, value) => {
    expect(tokens.component.input.size[size].paddingX.$value).toBe(value);
  });

  it('keeps component.input.paddingX as the md value and says so', () => {
    expect(tokens.component.input.paddingX.$value).toBe('{primitive.space.3}');
    expect(tokens.component.input.paddingX.$description).toMatch(/medium|md/i);
  });

  it.each(['input.paddingX', 'input.size.sm.paddingX', 'input.size.lg.paddingX'])(
    '%s matches what the code draws',
    (path) => {
      expect(leaf(path)?.class).toMatch(/^(BOUND|LITERAL-MATCH)$/);
    },
  );
});
