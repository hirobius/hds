/**
 * Vitest global setup: put a gitleaks binary on PATH in CI.
 *
 * Several suites exercise the secrets gates end to end (secret-pii-scan,
 * check-secrets fixtures) and, by design, fail in CI when gitleaks is missing
 * instead of skipping (hds#263). The unit shards run on a bare runner, so this
 * installs the same pinned, checksum-verified release the secrets-scan job uses
 * (scripts/install-gitleaks.sh). Outside CI, or where gitleaks already runs, it
 * does nothing.
 */
import { spawnSync } from 'node:child_process';
import { delimiter, dirname, join } from 'node:path';

export default function setup(): void {
  if (!process.env.CI) return;
  if (spawnSync('gitleaks', ['version'], { stdio: 'ignore' }).status === 0) return;

  const r = spawnSync('bash', [join(__dirname, '..', '..', 'scripts', 'install-gitleaks.sh')], {
    encoding: 'utf8',
  });
  if (r.status !== 0)
    throw new Error(`could not install gitleaks for the unit tests:\n${r.stderr}`);
  process.env.PATH = `${dirname(r.stdout.trim())}${delimiter}${process.env.PATH ?? ''}`;
}
