/**
 * Tests for scripts/lib/knowledge-classify.mjs — client detection rules are
 * loaded from a gitignored local file (example file as fallback), never
 * hard-coded in this public repo. Approach credited to draft PR #210.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  classify,
  loadClientRules,
  CLIENT_RULES_FILE,
  CLIENT_RULES_EXAMPLE_FILE,
} from '../lib/knowledge-classify.mjs';

const RULES = [
  { slug: 'client-a', anyOf: [['\\bacme\\s+widgets\\b'], ['\\bacme\\b', '\\bwidget\\b']] },
  { slug: 'client-b', anyOf: [['\\bexample\\s+org\\b']] },
];

let dir;
const tmp = () => (dir = mkdtempSync(join(tmpdir(), 'kc-')));
afterEach(() => {
  if (dir) rmSync(dir, { recursive: true, force: true });
  dir = undefined;
});

describe('classify against the checked-in example rules', () => {
  it('detects a placeholder client and tags it', () => {
    const r = classify({ title: 'Kickoff', text: 'Acme Widgets scope notes' });
    expect(r.client).toBe('client-a');
    expect(r.tags).toContain('client:client-a');
  });

  it('returns null client and still scores pillars when nothing matches', () => {
    const r = classify({ text: 'design tokens and storybook' });
    expect(r.client).toBeNull();
    expect(r.pillar).toBe('build');
  });
});

describe('classify — client detection semantics', () => {
  it('matches when every pattern in one anyOf group matches', () => {
    expect(classify({ text: 'Acme Widgets kickoff' }, { clientRules: RULES }).client).toBe(
      'client-a',
    );
    expect(classify({ text: 'acme asked about the widget' }, { clientRules: RULES }).client).toBe(
      'client-a',
    );
  });

  it('does not match when only part of a multi-pattern group matches', () => {
    expect(classify({ text: 'acme only' }, { clientRules: RULES }).client).toBeNull();
  });

  it('first matching rule in file order wins', () => {
    expect(classify({ text: 'example org and acme widgets' }, { clientRules: RULES }).client).toBe(
      'client-a',
    );
  });
});

describe('loadClientRules', () => {
  it('points at a gitignored local file with a checked-in example beside it', () => {
    expect(CLIENT_RULES_FILE).toMatch(/knowledge-clients\.local\.json$/);
    expect(CLIENT_RULES_EXAMPLE_FILE).toMatch(/knowledge-clients\.example\.json$/);
  });

  it('local file overrides the example when present', () => {
    const d = tmp();
    const local = join(d, 'local.json');
    const example = join(d, 'example.json');
    writeFileSync(local, JSON.stringify({ clients: RULES }));
    writeFileSync(example, JSON.stringify({ clients: [{ slug: 'x', anyOf: [['x']] }] }));
    expect(loadClientRules({ localFile: local, exampleFile: example })).toEqual(RULES);
  });

  it('falls back to the example when the local file is absent', () => {
    const d = tmp();
    const example = join(d, 'example.json');
    writeFileSync(example, JSON.stringify({ clients: RULES }));
    expect(loadClientRules({ localFile: join(d, 'absent.json'), exampleFile: example })).toEqual(
      RULES,
    );
  });

  it('a local override changes what classify detects', () => {
    const d = tmp();
    const local = join(d, 'local.json');
    writeFileSync(
      local,
      JSON.stringify({ clients: [{ slug: 'override', anyOf: [['\\bfoo\\b']] }] }),
    );
    const rules = loadClientRules({ localFile: local });
    expect(classify({ text: 'foo' }, { clientRules: rules }).client).toBe('override');
    expect(classify({ text: 'acme widgets' }, { clientRules: rules }).client).toBeNull();
  });

  it('fails loud naming the file when neither file exists', () => {
    const d = tmp();
    const a = join(d, 'nope-local.json');
    const b = join(d, 'nope-example.json');
    expect(() => loadClientRules({ localFile: a, exampleFile: b })).toThrow(/nope-example\.json/);
  });

  it('malformed file: error names the file and never echoes contents', () => {
    const d = tmp();
    const bad = join(d, 'bad.json');
    writeFileSync(bad, JSON.stringify({ clients: [{ slug: 'SECRET-VALUE' }] }));
    let msg = '';
    try {
      loadClientRules({ localFile: bad });
    } catch (e) {
      msg = e.message;
    }
    expect(msg).toMatch(/bad\.json/);
    expect(msg).not.toMatch(/SECRET-VALUE/);
  });

  it('invalid JSON: error names the file, not the parse detail', () => {
    const d = tmp();
    const bad = join(d, 'broken.json');
    writeFileSync(bad, '{ SECRET-VALUE');
    let msg = '';
    try {
      loadClientRules({ localFile: bad });
    } catch (e) {
      msg = e.message;
    }
    expect(msg).toMatch(/broken\.json/);
    expect(msg).not.toMatch(/SECRET-VALUE/);
  });

  it('rejects an invalid regex source, naming the file', () => {
    const d = tmp();
    const bad = join(d, 're.json');
    writeFileSync(bad, JSON.stringify({ clients: [{ slug: 'a', anyOf: [['(']] }] }));
    expect(() => loadClientRules({ localFile: bad })).toThrow(/re\.json/);
  });
});
