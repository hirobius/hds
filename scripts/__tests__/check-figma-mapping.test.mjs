/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Tests for scripts/check-figma-mapping.mjs (A9 — component parity contract).
 *
 * The unit tests inject a fake code model (the port the real TypeScript-backed
 * model implements), so every rule is proven to fire on a minimal manifest
 * without touching the filesystem. The integration test at the bottom runs the
 * real check against the committed manifest + source.
 */

import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkFigmaMapping, runFigmaMappingCheck } from '../check-figma-mapping.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

// ── Fake code model ──────────────────────────────────────────────────────────
function props(...names) {
  return Object.fromEntries(names.map((name) => [name, { optional: true }]));
}

function fakeModel(components) {
  return {
    component(filePath, exportName) {
      return components[`${filePath}#${exportName}`] ?? null;
    },
  };
}

const BUTTON_CODE = {
  props: props('variant', 'tone', 'size', 'disabled', 'loading', 'label', 'iconLeft', 'iconOnly'),
  members: {},
  cva: {
    axes: {
      variant: ['primary', 'secondary', 'tertiary'],
      tone: ['neutral', 'danger', 'success', 'warning', 'info'],
      size: ['sm', 'md', 'lg'],
      iconOnly: ['true', 'false'],
    },
    defaults: { variant: 'secondary', tone: 'neutral', size: 'md', iconOnly: 'false' },
  },
};

function buttonSpec(overrides = {}) {
  return {
    filePath: 'src/app/components/button.tsx',
    sourceExport: 'Button',
    props: {
      variant: { type: 'enum', values: ['primary', 'secondary', 'tertiary'] },
      tone: { type: 'enum', values: ['neutral', 'danger', 'success', 'warning', 'info'] },
      size: { type: 'enum', values: ['sm', 'md', 'lg'] },
    },
    variantAxes: ['variant', 'tone', 'size', 'state'],
    componentProperties: [
      { name: 'Label', type: 'TEXT', sourceProp: 'label' },
      { name: 'Show Label', type: 'BOOLEAN', sourceProp: 'iconOnly', invert: true },
    ],
    figmaPropertyMapping: { variant: 'Variant', iconOnly: 'Show Label' },
    ...overrides,
  };
}

function run(specs, components = { 'src/app/components/button.tsx#Button': BUTTON_CODE }) {
  return checkFigmaMapping({
    manifest: { componentSpecs: specs },
    codeModel: fakeModel(components),
  });
}

const rules = (result, key = 'errors') => result[key].map((v) => `${v.component}:${v.rule}`);

// ── A clean spec ─────────────────────────────────────────────────────────────
describe('checkFigmaMapping — clean spec', () => {
  it('reports nothing for a spec whose Figma mapping matches the code', () => {
    const result = run({ Button: buttonSpec() });
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it('ignores specs that carry no Figma mapping data', () => {
    const result = run({ Kbd: { filePath: 'src/app/components/kbd.tsx', variantAxes: [] } });
    expect(result.errors).toEqual([]);
  });
});

// ── Rule: variant-axis-not-a-prop (Alert `variant` drift) ────────────────────
describe('checkFigmaMapping — variant axes must be real props', () => {
  it('flags a variant axis the component does not accept', () => {
    const alert = {
      filePath: 'src/app/components/alert.tsx',
      variantAxes: ['variant'],
      componentProperties: [],
    };
    const result = run(
      { Alert: alert },
      {
        'src/app/components/alert.tsx#Alert': {
          props: props('tone', 'title', 'children'),
          members: {},
          cva: { axes: { tone: ['success', 'danger', 'warning', 'info'] }, defaults: {} },
        },
      },
    );
    expect(rules(result)).toContain('Alert:variant-axis-not-a-prop');
  });

  it('allows the Figma-only `state` axis (interaction previews have no prop)', () => {
    const result = run({ Button: buttonSpec() });
    expect(rules(result)).not.toContain('Button:variant-axis-not-a-prop');
  });
});

// ── Rule: contract-axis-missing (Button `tone` drift) ────────────────────────
describe('checkFigmaMapping — cva contract axes must be declared', () => {
  it('flags a contract axis (variant/tone/size/density) that is a prop + cva axis but not a variant axis', () => {
    const result = run({ Button: buttonSpec({ variantAxes: ['variant', 'size', 'state'] }) });
    expect(rules(result)).toContain('Button:contract-axis-missing');
    expect(result.errors.find((v) => v.rule === 'contract-axis-missing').message).toMatch(/tone/);
  });

  it('does not require non-contract cva axes such as iconOnly', () => {
    const result = run({ Button: buttonSpec() });
    expect(rules(result)).not.toContain('Button:contract-axis-missing');
  });
});

// ── Rule: axis-prop-undocumented + enum-values-drift ─────────────────────────
describe('checkFigmaMapping — manifest enum values must match cva', () => {
  it('flags a variant axis missing from the manifest props table', () => {
    const spec = buttonSpec();
    delete spec.props.tone;
    expect(rules(run({ Button: spec }))).toContain('Button:axis-prop-undocumented');
  });

  it('flags manifest enum values that differ from the cva keys (e.g. error vs danger)', () => {
    const spec = buttonSpec();
    spec.props.tone = { type: 'enum', values: ['neutral', 'error', 'success', 'warning', 'info'] };
    const result = run({ Button: spec });
    expect(rules(result)).toContain('Button:enum-values-drift');
    expect(result.errors.find((v) => v.rule === 'enum-values-drift').message).toMatch(/error/);
  });

  it('checks propConstraints the same way as props', () => {
    const spec = buttonSpec({
      propConstraints: { size: { type: 'enum', values: ['default', 'compact'] } },
    });
    expect(rules(run({ Button: spec }))).toContain('Button:enum-values-drift');
  });
});

// ── Rule: source-prop-unknown (HeadingStack `subtext`, Dialog `title`) ───────
describe('checkFigmaMapping — componentProperties must bind to real props', () => {
  it('flags a sourceProp the component does not accept', () => {
    const spec = {
      filePath: 'src/app/components/heading-stack.tsx',
      variantAxes: [],
      componentProperties: [{ name: 'Subtext', type: 'TEXT', sourceProp: 'subtext' }],
    };
    const result = run(
      { HeadingStack: spec },
      {
        'src/app/components/heading-stack.tsx#HeadingStack': {
          props: props('heading', 'subheading', 'level'),
          members: {},
          cva: { axes: {}, defaults: {} },
        },
      },
    );
    expect(rules(result)).toContain('HeadingStack:source-prop-unknown');
  });

  it('resolves `Member.prop` against compound members (Dialog.Title children)', () => {
    const dialogCode = {
      props: props('open', 'defaultOpen', 'modal', 'children'),
      members: {
        Title: { props: props('children', 'className') },
        Content: { props: props('children', 'hideClose') },
      },
      cva: { axes: {}, defaults: {} },
    };
    const components = { 'src/app/components/dialog.tsx#Dialog': dialogCode };
    const good = {
      filePath: 'src/app/components/dialog.tsx',
      componentProperties: [
        { name: 'Title', type: 'TEXT', sourceProp: 'Title.children' },
        { name: 'Show Close', type: 'BOOLEAN', sourceProp: 'Content.hideClose', invert: true },
      ],
      figmaPropertyMapping: { 'Title.children': 'Title', 'Content.hideClose': 'Show Close' },
    };
    expect(run({ Dialog: good }, components).errors).toEqual([]);

    const bad = {
      filePath: 'src/app/components/dialog.tsx',
      componentProperties: [{ name: 'Title', type: 'TEXT', sourceProp: 'title' }],
      figmaPropertyMapping: { description: 'Description' },
    };
    const result = run({ Dialog: bad }, components);
    expect(rules(result)).toContain('Dialog:source-prop-unknown');
    expect(rules(result)).toContain('Dialog:mapping-prop-unknown');
  });
});

// ── Rule: mapping-name-conflict ──────────────────────────────────────────────
describe('checkFigmaMapping — one Figma name per prop', () => {
  it('flags a prop mapped to different Figma names by componentProperties and figmaPropertyMapping', () => {
    const spec = buttonSpec({ figmaPropertyMapping: { iconOnly: 'Icon only' } });
    expect(rules(run({ Button: spec }))).toContain('Button:mapping-name-conflict');
  });
});

// ── Rule: boolean inversion ──────────────────────────────────────────────────
describe('checkFigmaMapping — boolean inversion contract', () => {
  it('flags an inverted boolean whose Figma name is not a "Show …" visibility toggle', () => {
    const spec = buttonSpec({
      componentProperties: [
        { name: 'Hide Label', type: 'BOOLEAN', sourceProp: 'iconOnly', invert: true },
      ],
      figmaPropertyMapping: {},
    });
    expect(rules(run({ Button: spec }))).toContain('Button:inverted-boolean-name');
  });

  it('flags invert on a non-BOOLEAN property', () => {
    const spec = buttonSpec({
      componentProperties: [{ name: 'Label', type: 'TEXT', sourceProp: 'label', invert: true }],
      figmaPropertyMapping: {},
    });
    expect(rules(run({ Button: spec }))).toContain('Button:invert-non-boolean');
  });
});

// ── Rule: unknown-component ──────────────────────────────────────────────────
describe('checkFigmaMapping — source must exist', () => {
  it('flags a spec whose export cannot be found in its file', () => {
    expect(rules(run({ Button: buttonSpec() }, {}))).toContain('Button:unknown-component');
  });
});

// ── Advisory: Title Case property names ──────────────────────────────────────
describe('checkFigmaMapping — Title Case advisory', () => {
  it('warns (does not fail) on property names that are not Title Case', () => {
    const spec = buttonSpec({
      componentProperties: [{ name: 'Leading icon', type: 'BOOLEAN', sourceProp: 'iconLeft' }],
      figmaPropertyMapping: {},
    });
    const result = run({ Button: spec });
    expect(result.errors).toEqual([]);
    expect(rules(result, 'warnings')).toContain('Button:property-name-case');
  });
});

// ── Registry cross-check (Code Connect templates vs manifest axes) ───────────
describe('checkFigmaMapping — Code Connect registry agrees with manifest axes', () => {
  const registry = {
    templates: {
      Button: {
        source: 'src/app/components/button.tsx',
        properties: {
          Variant: { type: 'VARIANT', options: ['Primary'], prop: 'variant' },
          Size: { type: 'VARIANT', options: ['sm'], prop: 'size' },
        },
      },
    },
  };

  it('flags a contract axis the manifest declares but the template does not map', () => {
    const result = checkFigmaMapping({
      manifest: { componentSpecs: { Button: buttonSpec() } },
      codeModel: fakeModel({ 'src/app/components/button.tsx#Button': BUTTON_CODE }),
      registry,
    });
    expect(rules(result)).toContain('Button:registry-axis-drift');
    expect(result.errors.find((v) => v.rule === 'registry-axis-drift').message).toMatch(/tone/);
  });
});

// ── Integration: the committed manifest honours the contract ─────────────────
describe('check-figma-mapping — repository', () => {
  it('finds no parity errors in the committed manifest and source', () => {
    const result = runFigmaMappingCheck({ root: ROOT });
    expect(result.errors.map((v) => `${v.component}:${v.rule} — ${v.message}`)).toEqual([]);
  }, 60_000);
});
