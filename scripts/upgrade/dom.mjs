/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * dom.mjs — the DOM and accessibility baseline (hds#468).
 *
 * docs/baselines/dom-a11y.json records, for each docs demo (the DEMOS registry
 * in docs-site/components/component-demos.tsx, which replaced the Storybook
 * stories), the element outline (tag, role, aria states, data-*; no classes or
 * ids) and what @guidepup/virtual-screen-reader speaks walking it (role,
 * accessible name, states). tests/dom-a11y-baseline.test.tsx renders the
 * demos in jsdom and fails when the file is stale; `pnpm dom:baseline` writes it.
 *
 * snapshotFromSource takes the release snapshot's `dom` section from this
 * file, so diff.mjs reports a demo whose outline changed since the release as
 * a dom-changed fact, and check-upgrade-ledger.mjs asks for a behavior step
 * with a detect regex for it.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const DOM_BASELINE = 'docs/baselines/dom-a11y.json';

/** The committed docs/baselines/dom-a11y.json under `root`, or null. */
export function readDomBaseline(root) {
  const file = join(root, DOM_BASELINE);
  return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null;
}
