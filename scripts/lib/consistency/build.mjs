/** @internal — live stage for scripts/eval-consistency.mjs (hds#344). Runs the app's own toolchain; not imported by `pnpm test`. */
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const run = (appDir, script, args) =>
  spawnSync(process.execPath, [path.join(appDir, 'node_modules', script), ...args], {
    cwd: appDir,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });

/**
 * `tsc --noEmit` then `vite build` in a prepared app directory. Both are run
 * even when the first fails, so the log shows every problem, and `built` is
 * true only when vite produced dist/.
 * @returns {{ typechecked: boolean, built: boolean, log: string }}
 */
export function buildApp(appDir) {
  const tsc = run(appDir, 'typescript/bin/tsc', ['--noEmit', '-p', '.']);
  const vite = run(appDir, 'vite/bin/vite.js', ['build']);
  return {
    typechecked: tsc.status === 0,
    built: vite.status === 0,
    log: [
      tsc.status === 0 ? '' : `tsc --noEmit:\n${tsc.stdout}${tsc.stderr}`,
      vite.status === 0 ? '' : `vite build:\n${vite.stdout}${vite.stderr}`,
    ]
      .filter(Boolean)
      .join('\n'),
  };
}
