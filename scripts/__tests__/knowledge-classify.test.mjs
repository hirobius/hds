/**
 * Tests for scripts/lib/knowledge-classify.mjs — client detection rules are
 * loaded from a gitignored local file, never hard-coded in this public repo.
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
afterEach(() => {
  if (dir) rmSync(dir, { recursive: true, force: true });
  dir = undefined;
});

describe('classify — client detection', () => {
  it('matches a client when every pattern in one anyOf group matches', () => {
    expect(classify({ text: 'Acme Widgets kickoff notes' }, { clientRules: RULES }).client).toBe(
      'client-a',
    );
    expect(classify({ text: 'acme asked about the widget' }, { clientRules: RULES }).client).toBe(
      'client-a',
    );
  });

  it('does not match when only part of a multi-pattern group matches', () => {
    expect(classify({ text: 'acme only' }, { clientRules: RULES }).client).toBeNull();
  });

  it('returns the first matching rule in file order and tags it', () => {
    const r = classify({ text: 'acme widgets and example org' }, { clientRules: RULES });
    expect(r.client).toBe('client-a');
    expect(r.tags).toContain('client:client-a');
  });
});

describe('loadClientRules', () => {
  it('reads rules from a JSON file', () => {
    dir = mkdtempSync(join(tmpdir(), 'kc-'));
    const file = join(dir, 'rules.json');
    writeFileSync(file, JSON.stringify({ clients: RULES }));
    expect(loadClientRules(file)).toEqual(RULES);
  });

  it('fails loud, naming the missing file and the example to copy', () => {
    dir = mkdtempSync(join(tmpdir(), 'kc-'));
    const missing = join(dir, 'nope.json');
    expect(() => loadClientRules(missing)).toThrow(/nope\.json/);
    expect(() => loadClientRules(missing)).toThrow(/knowledge-clients\.example\.json/);
  });

  it('fails loud on a malformed rules file', () => {
    dir = mkdtempSync(join(tmpdir(), 'kc-'));
    const file = join(dir, 'bad.json');
    writeFileSync(file, JSON.stringify({ clients: [{ slug: 'x' }] }));
    expect(() => loadClientRules(file)).toThrow(/bad\.json/);
  });

  it('points at a gitignored local file with a checked-in example beside it', () => {
    expect(CLIENT_RULES_FILE).toMatch(/knowledge-clients\.local\.json$/);
    expect(CLIENT_RULES_EXAMPLE_FILE).toMatch(/knowledge-clients\.example\.json$/);
  });
});
