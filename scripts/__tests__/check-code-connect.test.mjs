/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Tests for scripts/check-code-connect.mjs (B3), the CI-safe Code Connect gate.
 *
 * Unit tests feed checkCodeConnect() in-memory inputs (parsed docs, a fake
 * code model, the public cva module list) so each rule is proven to fire.
 * Integration tests run the real `figma connect parse` CLI (no token, no
 * network, GIT_* stripped from the child env) and the full gate against the
 * repository, and snapshot the locally rendered snippets.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  checkCodeConnect,
  childEnv,
  publicCvaModules,
  renderPreviewReport,
  runCodeConnectGate,
  runParse,
} from '../check-code-connect.mjs';
import { buildTemplateSource } from '../lib/code-connect-template.mjs';
import { transpileLikeCli } from '../lib/code-connect-runtime.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

// ── Fixtures ─────────────────────────────────────────────────────────────────

const opt = { optional: true };
const BADGE_CODE = {
  props: { tone: opt, children: opt, className: opt },
  members: {},
  cva: {
    axes: { tone: ['neutral', 'info', 'danger'] },
    defaults: { tone: 'neutral' },
  },
};
const badgeEntry = () => ({
  source: 'src/app/components/badge.tsx',
  properties: {
    Tone: { type: 'VARIANT', options: ['neutral', 'info', 'danger'], prop: 'tone' },
    Label: { type: 'TEXT', default: 'Badge', prop: 'children' },
  },
});
const registryWith = (overrides = {}) => ({
  importFrom: '@hirobius/design-system',
  templates: { Badge: badgeEntry() },
  exempt: {},
  ...overrides,
});

function docFor(name, entry, code, { template, figmaNode } = {}) {
  const source = buildTemplateSource({
    name,
    exportName: name,
    entry,
    code,
    figmaUrl: null,
    importFrom: '@hirobius/design-system',
  });
  return {
    component: name,
    source: entry.source,
    figmaNode: figmaNode ?? `https://www.figma.com/design/UNMAPPED/${name}`,
    template: template ?? transpileLikeCli(source),
    _codeConnectFilePath: `/repo/${entry.source.replace('.tsx', '.figma.ts')}`,
  };
}

const NODE_URL =
  'https://www.figma.com/design/c8MaVgwxOlxm4wr8wnH0Z4/HDS-Tokens-Components?node-id=9-9';

function modelWith(badgeCode = BADGE_CODE, extra = {}) {
  return {
    component: (file, name) => (name === 'Badge' ? badgeCode : null),
    typecheckSnippets: () => [],
    ...extra,
  };
}

function gate(overrides = {}) {
  const registry = overrides.registry ?? registryWith();
  return checkCodeConnect({
    registry,
    codeModel: overrides.codeModel ?? modelWith(),
    parsed: overrides.parsed ?? {
      status: 0,
      docs: [docFor('Badge', registry.templates.Badge ?? badgeEntry(), BADGE_CODE)],
      output: '',
    },
    generatorErrors: overrides.generatorErrors ?? [],
    generatorDrift: overrides.generatorDrift ?? [],
    cvaModules: overrides.cvaModules ?? ['src/app/components/badge.tsx'],
    exists: overrides.exists ?? (() => true),
  });
}

const rules = (result) => result.errors.map((e) => e.rule);

// ── checkCodeConnect: rules ──────────────────────────────────────────────────

describe('checkCodeConnect', () => {
  it('passes a parsed, generated, parity-complete template and reports it unmapped', () => {
    const result = gate();
    expect(result.errors).toEqual([]);
    expect(result.summary.templates).toBe(1);
    expect(result.summary.unmapped).toEqual(['Badge']);
    expect(result.warnings.map((w) => w.rule)).toEqual(['unmapped']);
    expect(result.summary.combinations).toBe(3);
  });

  it('fails when the CLI could not parse the templates', () => {
    const result = gate({
      parsed: { status: 1, docs: [], output: 'Exiting due to unreadable files' },
    });
    expect(rules(result)).toContain('parse-failed');
  });

  it('fails when a registry template is missing from the parse output', () => {
    expect(rules(gate({ parsed: { status: 0, docs: [], output: '' } }))).toContain('parse-missing');
  });

  it('surfaces generator errors and drift', () => {
    const result = gate({
      generatorErrors: ['Badge: bad'],
      generatorDrift: ['x.figma.ts: missing'],
    });
    expect(rules(result)).toEqual(expect.arrayContaining(['registry-invalid', 'template-drift']));
  });

  it('fails when // source= points at a file that does not exist', () => {
    const result = gate({ exists: (file) => file !== 'src/app/components/badge.tsx' });
    expect(rules(result)).toContain('source-missing');
  });

  it('requires every public cva module to have a template or an exemption', () => {
    const result = gate({
      cvaModules: ['src/app/components/badge.tsx', 'src/app/components/kbd.tsx'],
    });
    expect(rules(result)).toContain('parity-missing-template');
    const exempted = gate({
      cvaModules: ['src/app/components/badge.tsx', 'src/app/components/kbd.tsx'],
      registry: registryWith({
        exempt: {
          'src/app/components/kbd.tsx': { kind: 'no-figma-component', reason: 'code-only' },
        },
      }),
    });
    expect(exempted.errors).toEqual([]);
    expect(exempted.summary.exempt).toEqual({ 'no-figma-component': 1 });
  });

  it('flags stale or malformed exemptions', () => {
    const result = gate({
      registry: registryWith({
        exempt: {
          'src/app/components/gone.tsx': { kind: 'queued', reason: 'x' },
          'src/app/components/badge.tsx': { kind: 'nope' },
        },
      }),
    });
    expect(rules(result)).toEqual(
      expect.arrayContaining(['parity-stale-exemption', 'exemption-invalid']),
    );
  });

  it('fails when a getEnum maps onto a value that is not a cva key', () => {
    const doc = docFor('Badge', badgeEntry(), BADGE_CODE);
    doc.template = doc.template.replace("danger: 'danger'", "danger: 'error'");
    const result = gate({ parsed: { status: 0, docs: [doc], output: '' } });
    expect(rules(result)).toContain('enum-map-values');
    expect(rules(result)).toContain('render-cva-value');
  });

  it('fails when a getEnum map does not cover the Figma options exactly', () => {
    const doc = docFor('Badge', badgeEntry(), BADGE_CODE);
    doc.template = doc.template.replace("info: 'info',", '');
    expect(rules(gate({ parsed: { status: 0, docs: [doc], output: '' } }))).toContain(
      'enum-map-keys',
    );
  });

  it('fails when a rendered snippet uses a prop the component does not accept', () => {
    const doc = docFor('Badge', badgeEntry(), BADGE_CODE);
    doc.template = doc.template.replace('<Badge', '<Badge variant="x"');
    expect(rules(gate({ parsed: { status: 0, docs: [doc], output: '' } }))).toContain(
      'render-unknown-prop',
    );
  });

  it('fails on invalid JSX and on render errors', () => {
    const broken = docFor('Badge', badgeEntry(), BADGE_CODE);
    broken.template = broken.template.replace('</Badge>', '</Badg>');
    expect(rules(gate({ parsed: { status: 0, docs: [broken], output: '' } }))).toContain(
      'render-syntax',
    );
    const throwing = docFor('Badge', badgeEntry(), BADGE_CODE);
    throwing.template = throwing.template.replace("getString('Label')", "getString('Text')");
    expect(rules(gate({ parsed: { status: 0, docs: [throwing], output: '' } }))).toContain(
      'render-error',
    );
  });

  it('rejects a url that is neither a node URL nor the unmapped placeholder', () => {
    const doc = docFor('Badge', badgeEntry(), BADGE_CODE, { figmaNode: 'FIGMA_NODE_URL' });
    expect(rules(gate({ parsed: { status: 0, docs: [doc], output: '' } }))).toContain(
      'url-invalid',
    );
  });

  it('fails when the source has an @figma tag the template does not carry (manifest not regenerated)', () => {
    const result = gate({ codeModel: modelWith({ ...BADGE_CODE, figmaUrl: NODE_URL }) });
    expect(rules(result)).toContain('url-source-drift');
    expect(result.errors.find((e) => e.rule === 'url-source-drift').message).toMatch(
      /pnpm manifest:generate && pnpm figma:connect:generate/,
    );
  });

  it('fails when the template keeps a node URL whose @figma tag was removed from the source', () => {
    const doc = docFor('Badge', badgeEntry(), BADGE_CODE, { figmaNode: NODE_URL });
    const result = gate({ parsed: { status: 0, docs: [doc], output: '' } });
    expect(rules(result)).toContain('url-source-drift');
  });

  it('passes when the template URL matches the source @figma tag', () => {
    const doc = docFor('Badge', badgeEntry(), BADGE_CODE, { figmaNode: NODE_URL });
    const result = gate({
      codeModel: modelWith({ ...BADGE_CODE, figmaUrl: NODE_URL }),
      parsed: { status: 0, docs: [doc], output: '' },
    });
    expect(result.errors).toEqual([]);
    expect(result.summary.mapped).toEqual(['Badge']);
  });
});

// ── Child process env ────────────────────────────────────────────────────────

describe('childEnv', () => {
  it('strips GIT_* variables and any Figma token before spawning the CLI', () => {
    const env = childEnv({
      PATH: '/bin',
      GIT_DIR: '/x',
      GIT_INDEX_FILE: 'i',
      FIGMA_ACCESS_TOKEN: 't',
    });
    expect(env).toEqual({ PATH: '/bin' });
  });
});

// ── Real CLI ─────────────────────────────────────────────────────────────────

describe('runParse (real figma connect CLI)', () => {
  let dir;
  beforeAll(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hds-code-connect-'));
    fs.mkdirSync(path.join(dir, 'src'));
    fs.writeFileSync(
      path.join(dir, 'figma.config.json'),
      JSON.stringify({
        codeConnect: { include: ['src/*.figma.ts'], label: 'React', language: 'jsx' },
      }),
    );
  });
  afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

  it('exits non-zero on an unreadable template (--exit-on-unreadable-files)', () => {
    fs.writeFileSync(
      path.join(dir, 'src', 'broken.figma.ts'),
      "// url=https://www.figma.com/design/UNMAPPED/Broken\nimport figma from 'figma';\nimport React from 'react';\nexport default { example: figma.code`<Broken />`, id: 'broken' };\n",
    );
    const result = runParse({
      root: dir,
      cli: path.join(ROOT, 'node_modules/@figma/code-connect/bin/figma'),
    });
    expect(result.status).not.toBe(0);
    expect(result.output).toMatch(/unreadable/i);
  }, 60_000);
});

// ── Repository ───────────────────────────────────────────────────────────────

describe('check-code-connect — repository', () => {
  let result;
  beforeAll(async () => {
    result = await runCodeConnectGate({ root: ROOT });
    // Unmapped templates pass the gate but are never silent.
    if (result.summary.unmapped.length > 0) {
      console.warn(
        `[code-connect] unmapped (no Figma node URL, publish would fail): ${result.summary.unmapped.join(', ')}`,
      );
    }
  }, 120_000);

  it('lists the 52 public cva modules the parity rule covers', () => {
    expect(publicCvaModules(ROOT)).toHaveLength(52);
  });

  it('passes: parse, generator drift, parity, and every rendered combination', () => {
    expect(result.errors.map((e) => `${e.rule} ${e.component ?? ''}: ${e.message}`)).toEqual([]);
  });

  it('reports what is and is not mapped', () => {
    expect(result.summary).toMatchObject({
      templates: 8,
      mapped: ['Alert'],
      unmapped: ['Avatar', 'Badge', 'Button', 'HdsCheckbox', 'HdsRadio', 'Input', 'Tag'],
      exempt: { queued: 22, 'no-figma-component': 22 },
    });
  });

  it('matches the committed local preview snapshot', async () => {
    await expect(renderPreviewReport(result)).toMatchFileSnapshot(
      '../../figma/code-connect-preview.txt',
    );
  });
});
