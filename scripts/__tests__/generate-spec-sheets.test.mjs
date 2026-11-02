/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * hds#598: spec-sheet data is generated from code (manifest, component-api,
 * token tree), never typed by hand.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { buildSpecSheet, buildSpecSheets, resolveToken } from '../generate-spec-sheets.mjs';

const tokens = {
  primitive: {
    size: {
      36: { $type: 'dimension', $value: { value: 36, unit: 'px' } },
      16: { $value: { value: 16, unit: 'px' } },
    },
    space: { 3: { $value: { value: 12, unit: 'px' } } },
    color: { ink: { $type: 'color', $value: '#111111' } },
  },
  semantic: { accent: { $type: 'color', $value: '{primitive.color.ink}' } },
  component: {
    button: {
      bg: { $type: 'color', $value: '{semantic.accent}', $description: 'Fill.' },
      bgHover: { $type: 'color', $value: '{semantic.accent}' },
      size: {
        md: {
          height: { $type: 'dimension', $value: '{primitive.size.36}' },
          paddingX: { $type: 'dimension', $value: '{primitive.space.3}' },
          iconSize: { $type: 'dimension', $value: '{primitive.size.16}' },
        },
      },
    },
  },
};

const spec = {
  description: 'Button.',
  core: true,
  docsPage: '/docs/components/button',
  figmaLink: 'https://figma.example/button',
  states: ['default', 'hover', 'disabled'],
  props: { size: { type: 'enum', values: ['md'] }, label: { type: 'string', optional: true } },
  figmaPropertyMapping: { size: 'Size', label: 'Label' },
  componentProperties: [
    { name: 'Label', type: 'TEXT', sourceProp: 'label', targetSelector: 'Label' },
  ],
  tokens: { focusRing: 'role.ring' },
  usage: {
    when: 'Run an action.',
    whenNot: 'Navigate.',
    useInstead: [{ component: 'InlineLink', reason: 'navigation' }],
  },
};

describe('resolveToken', () => {
  it('follows references to the final value', () => {
    expect(resolveToken(tokens, 'component.button.bg')).toEqual({
      ref: '{semantic.accent}',
      value: '#111111',
    });
    expect(resolveToken(tokens, 'component.button.size.md.height').value).toBe('36px');
  });
  it('throws on a dangling reference', () => {
    expect(() => resolveToken({ a: { $value: '{b.c}' } }, 'a')).toThrow(/b\.c/);
  });
});

describe('buildSpecSheet', () => {
  const sheet = buildSpecSheet('Button', spec, tokens);
  it('lists each size with its value and token', () => {
    expect(sheet.sizes).toEqual([
      {
        size: 'md',
        values: {
          height: { token: 'component.button.size.md.height', value: '36px' },
          paddingX: { token: 'component.button.size.md.paddingX', value: '12px' },
          iconSize: { token: 'component.button.size.md.iconSize', value: '16px' },
        },
      },
    ]);
  });
  it('maps states to colour tokens', () => {
    const hover = sheet.states.find((s) => s.state === 'hover');
    expect(hover.tokens).toEqual([
      { name: 'bgHover', token: 'component.button.bgHover', value: '#111111' },
    ]);
    expect(sheet.states.find((s) => s.state === 'default').tokens[0].name).toBe('bg');
    expect(sheet.states.map((s) => s.state)).toEqual(['default', 'hover', 'disabled']);
  });
  it('carries anatomy, props→Figma, usage and docs', () => {
    expect(sheet.anatomy.map((p) => p.part)).toEqual(['Root', 'Label']);
    expect(sheet.props.find((p) => p.name === 'size')).toMatchObject({
      figmaProperty: 'Size',
      values: ['md'],
    });
    expect(sheet.usage.useInstead[0].component).toBe('InlineLink');
    expect(sheet.docsPage).toBe('/docs/components/button');
    expect(sheet.roleTokens).toEqual({ focusRing: 'role.ring' });
  });
  it('prefers component-api props rows when given', () => {
    const s = buildSpecSheet('Button', spec, tokens, [
      { name: 'size', type: "'md'", required: false },
    ]);
    expect(s.props).toEqual([
      { name: 'size', type: "'md'", required: false, figmaProperty: 'Size' },
    ]);
  });
  it('has empty sizes when no component token group exists', () => {
    expect(buildSpecSheet('Alert', spec, tokens).sizes).toEqual([]);
  });
});

describe('buildSpecSheets (real repo data)', () => {
  const manifest = JSON.parse(readFileSync('public/hds-manifest.json', 'utf8'));
  const tree = JSON.parse(readFileSync('hirobius.tokens.json', 'utf8'));
  const sheets = buildSpecSheets(manifest, tree);
  it('builds one sheet per core component', () => {
    const core = Object.entries(manifest.componentSpecs)
      .filter(([, s]) => s.core)
      .map(([n]) => n);
    expect(Object.keys(sheets).sort()).toEqual(core.sort());
  });
  it('Button has sm, md, lg with resolved heights', () => {
    const sizes = sheets.Button.sizes.map((s) => s.size);
    expect(sizes).toEqual(expect.arrayContaining(['sm', 'md', 'lg']));
    for (const s of sheets.Button.sizes)
      expect(s.values.height.value).toMatch(/^\d+(\.\d+)?(px|rem)$/);
  });
});

describe('committed figma/spec-sheets', () => {
  it('match the generated data (no drift from tokens)', () => {
    const manifest = JSON.parse(readFileSync('public/hds-manifest.json', 'utf8'));
    const tree = JSON.parse(readFileSync('hirobius.tokens.json', 'utf8'));
    for (const [name, sheet] of Object.entries(buildSpecSheets(manifest, tree))) {
      const committed = readFileSync(`figma/spec-sheets/${name}.json`, 'utf8');
      expect(committed, `${name}: run node scripts/generate-spec-sheets.mjs`).toBe(
        `${JSON.stringify(sheet, null, 2)}\n`,
      );
    }
  });
});
