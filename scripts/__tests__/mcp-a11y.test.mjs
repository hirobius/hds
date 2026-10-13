// @vitest-environment node
/**
 * mcp/catalog.mjs get_component serves a11yRules (hds#520, user story 9): the
 * caller's rules first ("you: ..."), the component's own after ("built in: ..."),
 * and the component's own are the first to go when the answer outgrows
 * RESULT_BUDGET. Runs against a temp package root whose Menu carries tagged rules.
 */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';
import { loadCatalog, RESULT_BUDGET } from '../../mcp/catalog.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel) => JSON.parse(readFileSync(join(ROOT, rel), 'utf8'));
const tmp = mkdtempSync(join(tmpdir(), 'mcp-a11y-'));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));

function catalogWith(rules) {
  const root = mkdtempSync(join(tmp, 'root-'));
  const manifest = read('public/hds-manifest.json');
  manifest.componentSpecs.Menu.a11yRules = rules;
  mkdirSync(join(root, 'src/app/data'), { recursive: true });
  mkdirSync(join(root, 'public'));
  mkdirSync(join(root, 'codemods'));
  writeFileSync(join(root, 'public/hds-manifest.json'), JSON.stringify(manifest));
  // Menu carries real @a11y tags now, so the API copy must not hand them back.
  const api = read('src/app/data/component-api.json');
  api.components.Menu.a11yRules = rules;
  writeFileSync(join(root, 'src/app/data/component-api.json'), JSON.stringify(api));
  writeFileSync(
    join(root, 'codemods/patterns-subpath.names.json'),
    JSON.stringify(read('codemods/patterns-subpath.names.json')),
  );
  const tool = loadCatalog(root).tools.find((t) => t.name === 'get_component');
  return (name) => tool.run({ name });
}

const consumer = {
  rule: 'Give an icon-only Menu.Trigger an aria-label.',
  required: true,
  owner: 'consumer',
};
const builtIn = {
  rule: 'Escape closes the menu and returns focus to the trigger.',
  required: true,
  owner: 'component',
  testId: 'a11y:menu.escape-returns-focus',
};
const soft = { rule: 'Keep labels short.', required: false, owner: 'consumer' };

describe('get_component a11y', () => {
  it('lists what the caller must do before what is built in', () => {
    const out = catalogWith([builtIn, consumer])('Menu');
    expect(out.a11y).toEqual([
      'you: Give an icon-only Menu.Trigger an aria-label.',
      'built in: Escape closes the menu and returns focus to the trigger.',
    ]);
  });

  it('marks a recommended rule and omits the key when a component has none', () => {
    expect(catalogWith([soft])('Menu').a11y).toEqual(['you (recommended): Keep labels short.']);
    expect(catalogWith([])('Menu')).not.toHaveProperty('a11y');
  });

  it('drops the component-owned rules first, keeping every consumer rule, to stay in budget', () => {
    const many = Array.from({ length: 40 }, (_, i) => ({
      rule: `Built in behaviour number ${i} that the component keeps for the caller.`,
      required: true,
      owner: 'component',
      testId: `a11y:menu.b${i}`,
    }));
    const out = catalogWith([...many, consumer])('Menu');
    expect(Buffer.byteLength(JSON.stringify(JSON.stringify(out)))).toBeLessThanOrEqual(
      RESULT_BUDGET,
    );
    expect(out.a11y).toEqual(['you: Give an icon-only Menu.Trigger an aria-label.']);
  });
});
