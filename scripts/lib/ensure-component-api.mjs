/** @internal — not part of @hirobius/design-system public API surface. */
import { spawnSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

export const COMPONENT_API_REL = 'src/app/data/component-api.json';

/**
 * component-api.json is gitignored generated output: a fresh clone, worktree or
 * CI checkout lacks it (the SessionStart hook only runs in single-repo remote
 * sessions). Every gate that reads it calls this first, so the gate self-heals
 * instead of failing with ENOENT. Writes only gitignored files; unlike
 * `manifest:generate` it never touches the tracked manifest.
 *
 * @param {string} root repo root
 * @returns {boolean} true when the file exists afterwards
 */
export function ensureComponentApi(root) {
  const apiPath = join(root, COMPONENT_API_REL);
  if (existsSync(apiPath)) return true;
  console.error(
    `${COMPONENT_API_REL} missing (gitignored, generated) — running generate-component-api…`,
  );
  const gen = spawnSync(process.execPath, [join(root, 'scripts/generate-component-api.mjs')], {
    cwd: root,
    encoding: 'utf8',
  });
  if (gen.status !== 0 || !existsSync(apiPath)) {
    console.error(gen.stdout ?? '', gen.stderr ?? '');
    console.error(`✗ could not generate ${COMPONENT_API_REL} — run \`pnpm manifest:generate\`.`);
    return false;
  }
  return true;
}
