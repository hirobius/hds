// A pre-push hook (above all from a worktree) exports GIT_DIR, GIT_INDEX_FILE
// and friends. Any test that runs git in a tmp fixture would then write into
// the real repo: junk commits on the pushed branch, core.bare=true (#546).
// tests/setup/strip-git-env.ts drops them before every test file.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { stripGitEnv } from '../../tests/setup/strip-git-env.ts';

describe('strip-git-env setup', () => {
  it('drops every GIT_* variable and keeps the rest', () => {
    const env = {
      GIT_DIR: '/x/.git',
      GIT_INDEX_FILE: 'i',
      GIT_WORK_TREE: '/x',
      PATH: '/bin',
      HOME: '/h',
    };
    stripGitEnv(env);
    expect(env).toEqual({ PATH: '/bin', HOME: '/h' });
  });

  it('is registered first in vitest setupFiles', () => {
    const config = readFileSync(join(process.cwd(), 'vitest.config.ts'), 'utf8');
    expect(config).toMatch(/setupFiles:\s*\[\s*'\.\/tests\/setup\/strip-git-env\.ts'/);
  });

  it('leaves a repo named by an inherited GIT_DIR untouched when a test file runs git', () => {
    const decoy = mkdtempSync(join(tmpdir(), 'hds-decoy-'));
    const probeDir = mkdtempSync(join(tmpdir(), 'hds-probe-'));
    try {
      spawnSync('git', ['init', '-q', decoy]);
      spawnSync('git', ['-C', decoy, 'commit', '-q', '--allow-empty', '-m', 'decoy']);
      const head = () =>
        spawnSync('git', ['-C', decoy, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).stdout.trim();
      const before = head();
      // Hook-shaped env reaches a child vitest run of a file that commits in a fixture.
      const probe = join(probeDir, 'probe.test.mjs');
      writeFileSync(
        probe,
        `import { spawnSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs'; import { tmpdir } from 'node:os'; import { join } from 'node:path';
import { it } from 'vitest';
it('commits in a fixture', () => {
  const root = mkdtempSync(join(tmpdir(), 'hds-fx-'));
  spawnSync('git', ['init', '-q'], { cwd: root });
  spawnSync('git', ['-c', 'core.hooksPath=/dev/null', 'commit', '-q', '--allow-empty', '-m', 'fixture'], { cwd: root });
});
`,
      );
      // The repo's own config (so its setupFiles run), with only the probe included.
      const config = join(probeDir, 'probe.config.mjs');
      writeFileSync(
        config,
        `import base from ${JSON.stringify(join(process.cwd(), 'vitest.config.ts'))};
export default { ...base, test: { ...base.test, include: [${JSON.stringify(probe)}] } };
`,
      );
      const res = spawnSync(
        process.execPath,
        ['node_modules/vitest/vitest.mjs', 'run', '--root', process.cwd(), '--config', config],
        { encoding: 'utf8', env: { ...process.env, GIT_DIR: join(decoy, '.git') } },
      );
      expect(res.status, res.stdout + res.stderr).toBe(0);
      expect(head()).toBe(before);
    } finally {
      rmSync(decoy, { recursive: true, force: true });
      rmSync(probeDir, { recursive: true, force: true });
    }
  }, 60_000);
});
