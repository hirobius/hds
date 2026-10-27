/** @internal — not part of @hirobius/design-system public API surface. */
// @vitest-environment node
/**
 * hds#463: the agent docs say which package version they describe, and say how
 * to upgrade. The tarball carries the exact version; the hosted copy says
 * `<last release>+main <sha>`; pretest fails when a stamp drifts.
 */
import { describe, it, expect } from 'vitest';
import { cpSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';
import { generateLlmsTxt } from '../generate-llms-txt.mjs';
import { REQUIRED } from '../check-pack-contents.mjs';
import { copyAgentContext } from '../copy-agent-context.mjs';
import { UPGRADE_COMMAND, hostedStamp, stampDrift, stampedFiles } from '../lib/version-stamp.mjs';
import { deprecatedRows, removedNameRows, replacementOf } from '../lib/upgrade-digest.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const VERSION = JSON.parse(read('package.json')).version;
const outputs = generateLlmsTxt({ write: false });

describe('llms output carries the package version (hds#463)', () => {
  it('stamps the index, the full bundle and every slice with `Version: <package.json>`', () => {
    for (const [rel, text] of Object.entries(outputs)) {
      expect(text, rel).toMatch(new RegExp(`^Version: ${VERSION.replace(/\./g, '\\.')}$`, 'm'));
    }
  });

  it('adds an upgrade slice with the command, linked from the index', () => {
    const slice = outputs['public/llms/upgrade.txt'];
    expect(slice).toContain('## Upgrading');
    expect(slice).toContain(UPGRADE_COMMAND);
    expect(outputs['public/llms.txt']).toContain('public/llms/upgrade.txt');
    expect(outputs['public/llms-full.txt']).toContain('## Upgrading');
  });

  it('lists every name 0.20.0 removed or renamed, with its replacement', () => {
    const slice = outputs['public/llms/upgrade.txt'];
    const ledger = JSON.parse(read('upgrade/releases/0.20.0.json'));
    const names = ledger.steps
      .filter((s) => ['removed', 'moved', 'renamed', 'folded'].includes(s.kind))
      .map((s) => s.id.split('/').slice(2).join('/'));
    expect(names.length).toBeGreaterThan(200);
    const missing = names.filter((n) => !slice.includes(`| \`${n}\` | `));
    expect(missing).toEqual([]);
    const row = (n) => slice.split('\n').find((l) => l.startsWith(`| \`${n}\` | `));
    expect(row('HdsCheckbox')).toMatch(/\| Checkbox \| 0\.20\.0 \|$/);
    expect(row('AssetImg')).toContain('@hirobius/design-system/patterns');
    expect(row('AspectRatio')).toContain("Box style={{ aspectRatio: '16 / 9' }}");
    expect(row('ActivityFeed')).toContain('nothing: rewrite or delete the code');
  });

  it('lists the deprecated names with the release that removes them', () => {
    const slice = outputs['public/llms/upgrade.txt'];
    const deprecated = deprecatedRows(ROOT);
    expect(deprecated.map((d) => d.name)).toContain('StatusTile');
    // Tokens stay out: agent docs never name a deprecated token.
    expect(deprecated.map((d) => d.name)).not.toContain('semantic.space.layout.tight');
    for (const d of deprecated) expect(slice, d.name).toContain(`\`${d.name}\``);
    expect(slice).toContain('hds/no-deprecated-token');
  });
});

describe('replacementOf', () => {
  const step = (kind, plain) => ({ id: `0.20.0/${kind}/X`, kind, plain });
  it('reads the "use <name>" clause of a step', () => {
    expect(
      replacementOf(
        step(
          'renamed',
          'HdsRadio is removed from the package root; use Radio, the same component under its bare name.',
        ),
        'HdsRadio',
      ),
    ).toBe('Radio');
    expect(
      replacementOf(step('folded', 'TimeInput is removed; use Input type="time" instead.'), 'X'),
    ).toBe('Input type="time"');
  });
  it('names the /patterns subpath for a moved name', () => {
    expect(replacementOf(step('moved', 'whatever'), 'Page')).toBe(
      '`Page` from `@hirobius/design-system/patterns`',
    );
  });
  it('falls back to the plain sentence, escaping table pipes', () => {
    expect(replacementOf(step('removed', 'Gone | delete it.'), 'X')).toBe('Gone \\| delete it.');
  });
  it('covers every removing step of every ledger', () => {
    const rows = removedNameRows(ROOT);
    expect(rows.every((r) => r.replacement.length > 0)).toBe(true);
    expect(rows.map((r) => r.release)).toContain('0.21.0');
  });
});

describe('consumer skill (hds#463)', () => {
  const skill = read('skills/hds-consumer/SKILL.md');
  const fm = parseYaml(skill.split('---\n')[1]);

  it('carries hds-version metadata equal to package.json', () => {
    expect(fm.metadata['hds-version']).toBe(VERSION);
  });

  it('has Upgrading and Deprecated sections', () => {
    expect(skill).toContain('## Upgrading');
    expect(skill).toContain('## Deprecated: do not use in new code');
    for (const d of deprecatedRows(ROOT)) expect(skill, d.name).toContain(`\`${d.name}\``);
  });

  it('makes the upgrade check the first step', () => {
    const steps = skill.split('## Steps')[1];
    const first = steps.split('\n').find((l) => /^1\. /.test(l));
    expect(first).toContain(`${UPGRADE_COMMAND} --check`);
  });

  it('ships in the package', () => {
    const pkg = JSON.parse(read('package.json'));
    expect(pkg.files).toContain('skills/hds-consumer/SKILL.md');
    expect(REQUIRED).toContain('skills/hds-consumer/SKILL.md');
    expect(REQUIRED).toContain('public/llms/upgrade.txt');
  });
});

describe('manifest (hds#463)', () => {
  const m = JSON.parse(read('public/hds-manifest.json'));
  it('names the package version, the upgrade command and a pinned llms.txt', () => {
    expect(m.packageVersion).toBe(VERSION);
    expect(m.upgrade.command).toBe(UPGRADE_COMMAND);
    expect(m.llmsTxt).toBe(
      `https://cdn.jsdelivr.net/npm/@hirobius/design-system@${VERSION}/llms.txt`,
    );
    // The upgrade object replaces the free-text policy (and keeps the entry in budget, hds#413).
    expect(m.breakingChangePolicy).toBeUndefined();
  });
});

describe('stampDrift', () => {
  it('is clean on the committed files', () => {
    expect(stampDrift(ROOT)).toEqual([]);
  });

  it('covers llms, every slice, the skill and the manifest', () => {
    const files = stampedFiles(ROOT);
    for (const f of readdirSync(join(ROOT, 'public/llms'))) {
      expect(files).toContain(`public/llms/${f}`);
    }
    for (const f of [
      'llms.txt',
      'public/llms.txt',
      'public/llms-full.txt',
      'skills/hds-consumer/SKILL.md',
      'public/hds-manifest.json',
    ]) {
      expect(files).toContain(f);
    }
  });

  it('names a file whose stamp differs from package.json', () => {
    const dir = mkdtempSync(join(tmpdir(), 'hds-stamps-'));
    for (const f of [...stampedFiles(ROOT), 'package.json']) {
      cpSync(join(ROOT, f), join(dir, f), { recursive: true });
    }
    const file = join(dir, 'public/llms/upgrade.txt');
    writeFileSync(
      file,
      readFileSync(file, 'utf8').replace(`Version: ${VERSION}`, 'Version: 0.0.1'),
    );
    const drift = stampDrift(dir);
    expect(drift).toEqual([{ file: 'public/llms/upgrade.txt', found: '0.0.1', expected: VERSION }]);
  });
});

describe('hosted copy (hds#463)', () => {
  it('stamps `<last release>+main <short sha>`, never a bare version', () => {
    const stamp = hostedStamp(VERSION, '0123456789abcdef');
    expect(stamp).toBe(`${VERSION}+main 0123456`);
    const out = mkdtempSync(join(tmpdir(), 'hds-hosted-'));
    copyAgentContext(ROOT, out, { stamp: { version: VERSION, hosted: stamp } });
    for (const f of ['llms.txt', 'llms-full.txt', 'llms/upgrade.txt']) {
      const text = readFileSync(join(out, f), 'utf8');
      expect(text, f).toContain(`Version: ${stamp}`);
      expect(text, f).not.toMatch(new RegExp(`^Version: ${VERSION.replace(/\./g, '\\.')}$`, 'm'));
    }
    expect(JSON.parse(readFileSync(join(out, 'hds-manifest.json'), 'utf8')).packageVersion).toBe(
      stamp,
    );
  });
});
