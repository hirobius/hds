/**
 * Run axe-core against a rendered jsdom container. axe-core is a dependency of
 * @axe-core/playwright, not a direct one, so it resolves from there (the same
 * way scripts/lib/axe-gate.mjs loads it). color-contrast needs real layout and
 * is off here; the docs-site axe gate covers it in a browser.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { AXE_TAGS } from '../../scripts/lib/axe-gate.mjs';

type AxeResults = { violations: { id: string; impact?: string; help: string }[] };
type Axe = {
  run: (context: Element, options: object) => Promise<AxeResults>;
};

const pkg = fs.realpathSync(
  path.resolve(__dirname, '../../node_modules/@axe-core/playwright/package.json'),
);
const axe = createRequire(pkg)('axe-core') as Axe;

/** The ids of every axe violation in `container`, as `id: help`. Empty when clean. */
export async function axeViolations(container: Element): Promise<string[]> {
  const results = await axe.run(container, {
    runOnly: { type: 'tag', values: AXE_TAGS },
    rules: { 'color-contrast': { enabled: false } },
  });
  return results.violations.map((v) => `${v.id}: ${v.help}`);
}
