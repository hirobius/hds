import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, copyFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

// Public seam: the CLI. The script derives its repo root from its own location,
// so each test copies it into a throwaway `<tmp>/scripts/` and runs it against a
// synthetic registry + fixtures — nothing here touches the real repo tree.
const SCRIPT = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'validate-fixture-proof-of-firing.mjs',
);

let cleanup = [];
afterEach(() => {
  for (const dir of cleanup) rmSync(dir, { recursive: true, force: true });
  cleanup = [];
});

function write(root, rel, content) {
  const abs = join(root, rel);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, content);
}

/**
 * @param {Array<{id: string, channel: string, exit?: 'content'|78|1, fixtures?: boolean}>} gates
 *   exit 'content' (default): exits 1 when the fixture says "bad", else 0 (a gate that fires).
 */
function run(gates) {
  const root = mkdtempSync(join(tmpdir(), 'proof-of-firing-'));
  cleanup.push(root);
  mkdirSync(join(root, 'scripts'), { recursive: true });
  copyFileSync(SCRIPT, join(root, 'scripts', 'validate-fixture-proof-of-firing.mjs'));
  mkdirSync(join(root, 'fixtures'), { recursive: true });

  const registry = { version: '1.0.0', gates: [] };
  for (const g of gates) {
    const exit = g.exit ?? 'content';
    const body =
      exit === 'content'
        ? "import { readFileSync } from 'node:fs';\n" +
          "process.exit(readFileSync(process.env.FIXTURE_FILE, 'utf8').includes('bad') ? 1 : 0);\n"
        : `process.exit(${exit});\n`;
    write(root, `scripts/${g.id}.mjs`, body);
    registry.gates.push({
      id: g.id,
      gateScript: `scripts/${g.id}.mjs`,
      firingChannel: g.channel,
      severity: 'error',
    });
    if (g.fixtures !== false) {
      write(root, `fixtures/${g.id}/violating.example.json`, '{"verdict":"bad"}\n');
      write(root, `fixtures/${g.id}/passing.example.json`, '{"verdict":"ok"}\n');
    }
  }
  write(root, 'docs/guardrails/registry.json', JSON.stringify(registry));

  const r = spawnSync(
    process.execPath,
    [join(root, 'scripts', 'validate-fixture-proof-of-firing.mjs'), '--no-cache', '--json'],
    { cwd: root, encoding: 'utf8' },
  );
  let json = null;
  try {
    json = JSON.parse(r.stdout);
  } catch {
    /* non-JSON output: surfaced through r.stdout / r.stderr in the assertion */
  }
  return { status: r.status, json, out: r.stdout + r.stderr };
}

/** Error-severity violations as `<rule>:<gate>` — the contract a caller acts on. */
const rules = (r) =>
  r.json.violations.filter((v) => v.severity === 'error').map((v) => `${v.rule}:${v.gateId}`);

describe('validate-fixture-proof-of-firing', () => {
  it('passes a gate that fires on the violating fixture and is quiet on the passing one', () => {
    const r = run([{ id: 'fires', channel: 'ci-pr' }]);
    expect(r.status).toBe(0);
    expect(r.json.ok).toBe(true);
    expect(rules(r)).toEqual([]);
  });

  it('fails a gate that also fires on the passing fixture (false positive)', () => {
    const r = run([{ id: 'always-red', channel: 'ci-pr', exit: 1 }]);
    expect(r.status).toBe(1);
    expect(rules(r)).toEqual(['fixture-proof-of-firing-failure:always-red']);
  });

  it('treats exit 78 as "gate skipped itself", not as a firing or a false positive', () => {
    // check-secrets exits 78 when gitleaks is absent. Exit 78 on the violating
    // fixture is non-zero, so without the explicit skip the passing run's 78
    // would be reported as a false positive.
    const r = run([{ id: 'needs-binary', channel: 'pre-commit', exit: 78 }]);
    expect(r.status).toBe(0);
    expect(rules(r)).toEqual([]);
  });

  it('exempts hand-run channels (manual, on-demand, ci-dispatch) that have no fixtures', () => {
    const r = run([
      { id: 'by-hand', channel: 'manual', fixtures: false },
      { id: 'on-request', channel: 'on-demand', fixtures: false },
      { id: 'workflow-button', channel: 'ci-dispatch', fixtures: false },
    ]);
    expect(r.status).toBe(0);
    expect(rules(r)).toEqual([]);
  });

  it('still demands fixtures for an auto-firing channel', () => {
    const r = run([{ id: 'hook-gate', channel: 'pre-commit', fixtures: false }]);
    expect(r.status).toBe(1);
    expect(rules(r)).toEqual(['fixture-missing:hook-gate']);
  });
});
