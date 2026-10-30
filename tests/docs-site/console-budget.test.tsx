/**
 * Console budget gate (hds#959): mount every docs demo (the DEMOS registry in
 * docs-site/components/component-demos.tsx) with console.warn and
 * console.error spied, and fail on any code not in
 * docs/guardrails/baselines/console-allowlist.json. Rules and the fixture that
 * proves them: tests/console-budget.test.tsx.
 *
 * To allowlist a warning you cannot fix yet: run
 *   HDS_UPDATE_CONSOLE_ALLOWLIST=1 pnpm exec vitest run tests/docs-site/console-budget.test.tsx
 * then fill the new entry's issue and upgrade (an upgrade/pending note, from
 * `pnpm upgrade:note`, or a release step id).
 */
import { afterAll, describe, expect, it, vi } from 'vitest';
import * as React from 'react';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { act, cleanup, render } from '@testing-library/react';
import {
  budgetProblems,
  record,
  renderAllowlist,
  type Allowlist,
  type Seen,
} from '../helpers/console-budget';

// Spied for the whole file, from before the demos load, so a warning at module
// load, or one a timer prints after its demo unmounted, still counts.
const seen: Seen = new Map();
let current = '(module load)';
const warn = vi
  .spyOn(console, 'warn')
  .mockImplementation((...a) => record(seen, current, 'warn', a));
const error = vi
  .spyOn(console, 'error')
  .mockImplementation((...a) => record(seen, current, 'error', a));

const { DEMOS } = await import('../../docs-site/components/component-demos');

const ROOT = path.resolve(__dirname, '../..');
const ALLOWLIST = path.join(ROOT, 'docs/guardrails/baselines/console-allowlist.json');

const readJson = (file: string) => JSON.parse(readFileSync(file, 'utf8')) as unknown;

/** A pending note, the same note moved to upgrade/sources/<version>/notes at release, or a release step id. */
function ledgerHas(ref: string): boolean {
  if (existsSync(path.join(ROOT, 'upgrade/pending', `${ref}.json`))) return true;
  const sources = path.join(ROOT, 'upgrade/sources');
  if (readdirSync(sources).some((v) => existsSync(path.join(sources, v, 'notes', `${ref}.json`)))) {
    return true;
  }
  const releases = path.join(ROOT, 'upgrade/releases');
  return readdirSync(releases).some((f) => {
    const ledger = readJson(path.join(releases, f)) as { steps?: { id: string }[] };
    return (ledger.steps ?? []).some((s) => s.id === ref);
  });
}

describe('docs demos console budget', () => {
  for (const [name, Demo] of Object.entries(DEMOS) as [string, () => React.ReactNode][]) {
    it(`${name} mounts and unmounts`, async () => {
      current = name;
      // act flushes effects, so warnings from useEffect count too.
      await act(async () => {
        render(<div data-hds="">{React.createElement(Demo)}</div>);
      });
      cleanup();
      current = `${name} (after unmount)`;
    });
  }

  afterAll(() => {
    warn.mockRestore();
    error.mockRestore();
    const allowlist = readJson(ALLOWLIST) as Allowlist;
    if (process.env.HDS_UPDATE_CONSOLE_ALLOWLIST === '1') {
      writeFileSync(ALLOWLIST, `${JSON.stringify(renderAllowlist(seen, allowlist), null, 2)}\n`);
      return;
    }
    expect(budgetProblems(seen, allowlist, ledgerHas)).toEqual([]);
  });
});
