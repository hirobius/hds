#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Lists every consumer-facing place a STAGING-file Figma URL appears, so none is
 * forgotten when Adrian promotes staging to the library (ADR-026). Staging node
 * ids do not survive promotion, and the staging file is an editable duplicate
 * other designers may not be able to open.
 *
 *   WARN   manifest        public/hds-manifest.json figmaUrl (feeds Storybook's
 *                          Design tab through designParameters)
 *   WARN   design-links    docs/DESIGN_LINKS.md
 *   ERROR  code-connect    src/app/components/*.figma.ts and figma/code-connect.json:
 *                          publishing a template would ship the link to Dev Mode
 *
 * Each finding names the component to re-point; `components` is the de-duplicated
 * sorted list. Exit 1 only on an ERROR, 0 otherwise.
 *
 * Run: node scripts/check-figma-staging-urls.mjs [--json]
 * Or:  pnpm check:figma-staging-urls
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => (existsSync(file) ? readFileSync(file, 'utf8') : '');

/** @returns {{errors: object[], warnings: object[], components: string[], stagingFileKey: string}} */
export function scanStagingUrls({ root = DEFAULT_ROOT } = {}) {
  const links = JSON.parse(read(path.join(root, 'figma/links.json')) || '{}');
  const key = links.stagingFileKey;
  if (!key) throw new Error('figma/links.json has no stagingFileKey; nothing to scan for');
  const isStaging = (text) => typeof text === 'string' && text.includes(`/design/${key}/`);

  const errors = [];
  const warnings = [];

  const manifest = JSON.parse(read(path.join(root, 'public/hds-manifest.json')) || '{}');
  for (const [component, spec] of Object.entries(manifest.componentSpecs ?? {})) {
    if (isStaging(spec?.figmaUrl)) {
      warnings.push({ surface: 'manifest', component, url: spec.figmaUrl });
    }
  }

  read(path.join(root, 'docs/DESIGN_LINKS.md'))
    .split('\n')
    .forEach((line, i) => {
      if (!isStaging(line)) return;
      const component = /`([A-Za-z0-9.]+)`/.exec(line)?.[1] ?? `line ${i + 1}`;
      warnings.push({ surface: 'design-links', component, line: i + 1 });
    });

  const dir = path.join(root, 'src/app/components');
  const templates = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.figma.ts')) : [];
  for (const file of templates.sort()) {
    if (isStaging(read(path.join(dir, file)))) {
      errors.push({ surface: 'code-connect', component: file.replace(/\.figma\.ts$/, ''), file });
    }
  }
  if (isStaging(read(path.join(root, 'figma/code-connect.json')))) {
    errors.push({
      surface: 'code-connect',
      component: 'figma/code-connect.json',
      file: 'figma/code-connect.json',
    });
  }

  const components = [
    ...new Set([...warnings, ...errors].map((f) => f.component).filter((c) => !/[ /]/.test(c))),
  ].sort();
  return { errors, warnings, components, stagingFileKey: key };
}

function main() {
  const json = process.argv.includes('--json');
  const r = scanStagingUrls({});
  if (json) {
    console.log(JSON.stringify(r, null, 2));
  } else {
    for (const w of r.warnings)
      console.log(`  warn   ${w.surface}: ${w.component} links the staging file`);
    for (const e of r.errors)
      console.error(`  error  ${e.surface}: ${e.file} links the staging file`);
    if (r.components.length) {
      console.log(
        `  re-point after promotion (${r.components.length}): ${r.components.join(', ')}`,
      );
    }
    console.log(
      r.errors.length
        ? `✗ check-figma-staging-urls — ${r.errors.length} Code Connect link(s) point at staging; publishing would ship them`
        : `✓ check-figma-staging-urls — 0 errors, ${r.warnings.length} warning(s)`,
    );
  }
  process.exit(r.errors.length ? 1 : 0);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
