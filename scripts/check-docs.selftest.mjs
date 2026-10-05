/**
 * Self-test for scripts/check-docs.mjs — proves the gate actually fires.
 *
 * Builds a complete, valid content/docs tree in a temp dir (one page per
 * core component, generated from scripts/lib/core-components.mjs), then
 * applies one violation at a time and asserts the checker fails with the
 * right class of error. This is the DoD proof for hds#497: a planted
 * deprecated page, a hex value in prose, a missing core page, broken
 * frontmatter, and a dead link are each caught mechanically.
 *
 * Run: node --test scripts/check-docs.selftest.mjs
 *
 * Deliberately NOT a vitest file: vitest collects scripts/__tests__/**,
 * and this proof drives the checker as a subprocess (the real CLI surface).
 * The docs workflow runs it; the repo suite never sees it.
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { CORE_COMPONENTS } from './lib/core-components.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const checker = join(here, 'check-docs.mjs');
const PROVIDERS = ['HdsRouterProvider', 'HdsThemeProvider', 'ToastProvider'];

const kebab = (name) => name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

function componentPage(name) {
  return `---
title: "${name}"
description: "The ${name} component."
component: "${name}"
status: "stable"
since: "0.20.0"
related: ["Button"]
---

# ${name}

Overview prose. See [Button](/docs/components/button).

## Live Preview

{/* preview: ${name} */}

## Props & API

{/* props: ${name} */}

## Tokens Used

{/* generated: tokens */}
`;
}

function guidePage(title, extra = '') {
  return `---
title: "${title}"
description: "A guide page."
status: "stable"
---

# ${title}

${extra}
`;
}

/** Creates a complete valid tree; returns its root dir. */
function buildValidTree() {
  const rootDir = mkdtempSync(join(tmpdir(), 'docs-check-'));
  const docs = join(rootDir, 'content', 'docs');
  mkdirSync(join(docs, 'components'), { recursive: true });
  mkdirSync(join(docs, 'guides'), { recursive: true });
  mkdirSync(join(docs, 'foundations'), { recursive: true });
  for (const name of CORE_COMPONENTS) {
    if (PROVIDERS.includes(name)) continue;
    writeFileSync(join(docs, 'components', `${kebab(name)}.mdx`), componentPage(name));
  }
  writeFileSync(join(docs, 'guides', 'providers.mdx'), guidePage('Providers & setup'));
  // Removed/deprecated names are fine as prose in the deprecation guide.
  writeFileSync(
    join(docs, 'guides', 'deprecation.mdx'),
    guidePage('Deprecation', 'StatusDot was folded into Badge. AppShell was removed in 0.20.0.'),
  );
  writeFileSync(
    join(docs, 'foundations', 'color.mdx'),
    `---\ntitle: "Color"\ndescription: "Color foundation."\nstatus: "stable"\nsince: "0.20.0"\n---\n\n# Color\n\n## Token Reference\n\n{/* generated: tokens */}\n`,
  );
  return rootDir;
}

function run(rootDir) {
  const res = spawnSync(process.execPath, [checker, '--root', rootDir], { encoding: 'utf8' });
  return { status: res.status, out: `${res.stdout}\n${res.stderr}` };
}

function mutate(fn) {
  const rootDir = buildValidTree();
  fn(join(rootDir, 'content', 'docs'));
  return rootDir;
}

test('a complete, valid tree passes', () => {
  const rootDir = buildValidTree();
  try {
    const { status, out } = run(rootDir);
    assert.equal(status, 0, out);
    assert.match(out, /OK/);
  } finally {
    rmSync(rootDir, { recursive: true, force: true });
  }
});

test('no content yet passes with the armed notice (gate lands before content)', () => {
  const rootDir = mkdtempSync(join(tmpdir(), 'docs-check-empty-'));
  try {
    const { status, out } = run(rootDir);
    assert.equal(status, 0, out);
    assert.match(out, /not present yet/);
  } finally {
    rmSync(rootDir, { recursive: true, force: true });
  }
});

test('a deprecated component as a live page fails (membership)', () => {
  const rootDir = mutate((docs) => {
    writeFileSync(join(docs, 'components', 'status-dot.mdx'), componentPage('StatusDot'));
  });
  try {
    const { status, out } = run(rootDir);
    assert.equal(status, 1, out);
    assert.match(out, /StatusDot/);
    assert.match(out, /not in CORE_COMPONENTS/);
  } finally {
    rmSync(rootDir, { recursive: true, force: true });
  }
});

test('a hand-written hex value in prose fails (colors)', () => {
  const rootDir = mutate((docs) => {
    const file = join(docs, 'components', 'button.mdx');
    writeFileSync(file, `${componentPage('Button')}\nBrand color is #1a73e8 here.\n`);
  });
  try {
    const { status, out } = run(rootDir);
    assert.equal(status, 1, out);
    assert.match(out, /hex color/);
  } finally {
    rmSync(rootDir, { recursive: true, force: true });
  }
});

test('issue references like #497 are not hex colors, but short hex still fails (colors)', () => {
  const rootDir = mutate((docs) => {
    const file = join(docs, 'components', 'button.mdx');
    writeFileSync(file, `${componentPage('Button')}\nTracked in #497 and hds#1234.\n`);
  });
  try {
    const { status, out } = run(rootDir);
    assert.equal(status, 0, out);
  } finally {
    rmSync(rootDir, { recursive: true, force: true });
  }
  const shortHex = mutate((docs) => {
    const file = join(docs, 'components', 'button.mdx');
    writeFileSync(file, `${componentPage('Button')}\nBorder is #fa0 here.\n`);
  });
  try {
    const { status, out } = run(shortHex);
    assert.equal(status, 1, out);
    assert.match(out, /hex color/);
  } finally {
    rmSync(shortHex, { recursive: true, force: true });
  }
});

test('a missing core component page fails (completeness)', () => {
  const rootDir = mutate((docs) => {
    rmSync(join(docs, 'components', 'alert.mdx'));
  });
  try {
    const { status, out } = run(rootDir);
    assert.equal(status, 1, out);
    assert.match(out, /"Alert" has no page/);
  } finally {
    rmSync(rootDir, { recursive: true, force: true });
  }
});

test('missing providers guide fails (completeness)', () => {
  const rootDir = mutate((docs) => {
    rmSync(join(docs, 'guides', 'providers.mdx'));
  });
  try {
    const { status, out } = run(rootDir);
    assert.equal(status, 1, out);
    assert.match(out, /providers\.mdx/);
  } finally {
    rmSync(rootDir, { recursive: true, force: true });
  }
});

test('broken frontmatter and a stale related name fail', () => {
  const rootDir = mutate((docs) => {
    const file = join(docs, 'components', 'badge.mdx');
    const broken = componentPage('Badge')
      .replace('status: "stable"\n', '')
      .replace('related: ["Button"]', 'related: ["IconButton"]');
    writeFileSync(file, broken);
  });
  try {
    const { status, out } = run(rootDir);
    assert.equal(status, 1, out);
    assert.match(out, /missing required frontmatter key: status/);
    assert.match(out, /IconButton/);
  } finally {
    rmSync(rootDir, { recursive: true, force: true });
  }
});

test('a dead internal link fails', () => {
  const rootDir = mutate((docs) => {
    const file = join(docs, 'components', 'card.mdx');
    writeFileSync(file, `${componentPage('Card')}\nSee [Nope](/docs/components/nope).\n`);
  });
  try {
    const { status, out } = run(rootDir);
    assert.equal(status, 1, out);
    assert.match(out, /\/docs\/components\/nope/);
  } finally {
    rmSync(rootDir, { recursive: true, force: true });
  }
});

test('a component page without its props marker fails', () => {
  const rootDir = mutate((docs) => {
    const file = join(docs, 'components', 'card.mdx');
    writeFileSync(file, componentPage('Card').replace('{/* props: Card */}\n', ''));
  });
  try {
    const { status, out } = run(rootDir);
    assert.equal(status, 1, out);
    assert.match(out, /missing props marker/);
  } finally {
    rmSync(rootDir, { recursive: true, force: true });
  }
});

// Keep cpSync imported for future fixture-copy cases without lint noise.
void cpSync;
