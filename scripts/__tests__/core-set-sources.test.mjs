// @vitest-environment node
/**
 * One source for the core set (hds#374 follow-up to hds#519).
 *
 * Two NAMED sets come from mcp/core-set.mjs, the only file that lists names:
 * - ratified core (CORE_COMPONENTS, hds#254): the manifest `core` flag,
 *   component-api.json, llms.txt, SKILL.md, the README and get_component `core`.
 * - recommended (recommendedComponents()): the ratified core plus every component
 *   mcp/guide.mjs names for a need: list_core and the AGENTS.md imports.
 * This test fails when any surface disagrees, and has a canary proving it can.
 */
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { CORE_COMPONENTS } from '../../mcp/core-set.mjs';
import { CORE_COMPONENTS as SCRIPT_CORE } from '../lib/core-components.mjs';
import { HOOKS, INTENTS, recommendedComponents } from '../../mcp/guide.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const readJson = (rel) => JSON.parse(readFileSync(join(ROOT, rel), 'utf8'));
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

/** Names present in one list and not the other, or [] when they agree. */
export const disagreement = (expected, actual) => {
  const a = new Set(expected);
  const b = new Set(actual);
  return [
    ...[...a].filter((n) => !b.has(n)).map((n) => `-${n}`),
    ...[...b].filter((n) => !a.has(n)).map((n) => `+${n}`),
  ].sort();
};

const flagged = (entries) =>
  Object.entries(entries)
    .filter(([, spec]) => spec.core === true)
    .map(([name]) => name);

const backticked = (line) => [...line.matchAll(/`([A-Za-z]+)`/g)].map((m) => m[1]);

function ask(method, params = {}) {
  const child = spawn(process.execPath, [join(ROOT, 'mcp/hds-mcp.mjs')], {
    cwd: ROOT,
    stdio: ['pipe', 'pipe', 'inherit'],
  });
  return new Promise((resolve, reject) => {
    let buf = '';
    child.stdout.on('data', (d) => {
      buf += d;
      const line = buf.split('\n').find((l) => l.includes('"id":2'));
      if (line) {
        child.kill();
        resolve(JSON.parse(line));
      }
    });
    child.on('error', reject);
    const send = (m) => child.stdin.write(`${JSON.stringify(m)}\n`);
    send({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2025-06-18',
        capabilities: {},
        clientInfo: { name: 't', version: '0' },
      },
    });
    send({ jsonrpc: '2.0', method: 'notifications/initialized' });
    send({ jsonrpc: '2.0', id: 2, method, params });
  });
}
const callTool = async (name, args) =>
  JSON.parse((await ask('tools/call', { name, arguments: args })).result.content[0].text);

describe('one source for the core set', () => {
  const api = readJson('src/app/data/component-api.json').components;
  const manifest = readJson('public/hds-manifest.json');
  const patternNames = new Set(readJson('codemods/patterns-subpath.names.json').names);
  const recommended = recommendedComponents();

  it('scripts/lib/core-components.mjs is the same list, not a copy', () => {
    expect(SCRIPT_CORE).toBe(CORE_COMPONENTS);
  });

  it('keeps ratified core and recommended as two sets, the first inside the second', () => {
    expect(
      disagreement(
        CORE_COMPONENTS,
        recommended.filter((n) => CORE_COMPONENTS.includes(n)),
      ),
    ).toEqual([]);
    expect(recommended.length).toBeGreaterThan(CORE_COMPONENTS.length);
    const named = INTENTS.flatMap((i) => i.use).filter((n) => !HOOKS[n]);
    expect(disagreement(recommended, [...CORE_COMPONENTS, ...named])).toEqual([]);
  });

  it('manifest and component-api.json flag exactly the ratified core', () => {
    expect(disagreement(CORE_COMPONENTS, flagged(manifest.componentSpecs))).toEqual([]);
    expect(disagreement(CORE_COMPONENTS, flagged(api))).toEqual([]);
  });

  it('list_core serves exactly the recommended set, and says so', async () => {
    const data = await callTool('list_core', {});
    expect(
      disagreement(
        recommended.filter((n) => api[n]),
        [...data.root, ...data.patterns],
      ),
    ).toEqual([]);
    expect(data.set).toMatch(/recommended/i);
  });

  it('get_component marks `core` for the ratified set only, `recommended` for the rest', async () => {
    const button = await callTool('get_component', { name: 'Button' });
    expect(button.core).toBe(true);
    expect(button.recommended).toBeUndefined();
    const tiles = await callTool('get_component', { name: 'MetricTiles' });
    expect(tiles.core).toBeUndefined();
    expect(tiles.recommended).toBe(true);
  });

  it('AGENTS.md imports are the recommended set and the header names it', () => {
    const agents = read('AGENTS.md');
    const imports = agents.split('## Imports')[1].split('\n## ')[0];
    const listed = imports
      .split('\n')
      .filter((l) => l.startsWith('- `@hirobius'))
      .flatMap(backticked)
      .filter((n) => /^[A-Z]|^use/.test(n) && !n.startsWith('@'));
    expect(
      disagreement([...recommended.filter((n) => api[n]), ...Object.keys(HOOKS)], listed),
    ).toEqual([]);
    expect(imports).toMatch(/recommended/i);
    expect(imports).toMatch(/ratified core/i);
    expect(patternNames.size).toBeGreaterThan(0);
  });

  it('llms.txt and SKILL.md list exactly the ratified core', () => {
    const section = (text) => (text.split('\n## Core set\n')[1] ?? '').split(/\n## /)[0];
    const llms = [...section(read('llms.txt')).matchAll(/^- ([A-Za-z]+) \(/gm)].map((m) => m[1]);
    const skill = section(read('skills/hds-consumer/SKILL.md'))
      .split('\n')
      .filter((l) => l.startsWith('- **'))
      .flatMap(backticked);
    expect(disagreement(CORE_COMPONENTS, llms)).toEqual([]);
    expect(disagreement(CORE_COMPONENTS, skill)).toEqual([]);
  });

  it('canary: a name added to or dropped from one surface is reported', () => {
    expect(disagreement(CORE_COMPONENTS, [...CORE_COMPONENTS, 'Stat'])).toEqual(['+Stat']);
    expect(
      disagreement(
        CORE_COMPONENTS,
        CORE_COMPONENTS.filter((n) => n !== 'Menu'),
      ),
    ).toEqual(['-Menu']);
    const bad = { ...manifest.componentSpecs, Stat: { core: true } };
    expect(disagreement(CORE_COMPONENTS, flagged(bad))).toEqual(['+Stat']);
  });
});
