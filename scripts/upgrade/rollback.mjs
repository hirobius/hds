/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * rollback.mjs — what a consumer does when a release they took is yanked
 * (hds#472). One text, two places: the "If a release is bad" section of
 * UPGRADING.md (compile.mjs) and the comment release:yank posts on each
 * standing upgrade issue (yank.mjs). The upgrade command refuses downgrades
 * and codemods only run forward, so the way back is git, not the tool.
 */
import { HDS_PACKAGE as PACKAGE } from '../../codemods/lib/installed-version.mjs';

/**
 * The numbered steps, as markdown lines.
 * @param {string} [good] the last good version; a placeholder when unknown
 */
export function rollbackLines(good = '<last good version>') {
  return [
    '1. Revert the upgrade PR (`git revert -m 1 <merge commit>`), so the code, package.json and lockfile go back together.',
    `2. Pin the exact last good version, with no \`^\`: \`"${PACKAGE}": "${good}"\`, then install.`,
    `3. Once a fixed version ships, run \`npx ${PACKAGE}@latest upgrade\` again; it skips versions npm marks deprecated.`,
  ];
}

/** The policy line that follows the steps. */
export const NO_BACKPORTS =
  'There are no backports before 1.0: a fix ships as a new release, never as a patch to an older line.';
