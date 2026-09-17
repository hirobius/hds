/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Tests for the Code Connect template generator (B2) and the local template
 * runtime it is verified with.
 *
 * Unit tests inject a fake code model, so the registry → template rules are
 * exercised without a TypeScript program. The round-trip tests transpile the
 * generated template exactly as `figma connect parse` does (TypeScript
 * transpileModule + the `figma` import rewrite) and execute it against the
 * local runtime, so they assert on the snippet Dev Mode would show.
 */

import { describe, it, expect } from 'vitest';
import {
  buildTemplateSource,
  classifyFigmaUrl,
  templatePathFor,
  unmappedUrlFor,
  validateTemplateEntry,
} from '../lib/code-connect-template.mjs';
import {
  compileTemplate,
  enumerateCombinations,
  renderTemplate,
  transpileLikeCli,
} from '../lib/code-connect-runtime.mjs';
import { generateTemplates } from '../generate-code-connect.mjs';

// ── Fixtures ─────────────────────────────────────────────────────────────────

const req = { optional: false };
const opt = { optional: true };

const BUTTON_CODE = {
  props: {
    variant: opt,
    tone: opt,
    size: opt,
    disabled: opt,
    loading: opt,
    iconLeft: opt,
    iconRight: opt,
    children: opt,
    label: opt,
  },
  members: {},
  cva: {
    axes: {
      variant: ['primary', 'secondary', 'tertiary'],
      tone: ['neutral', 'danger', 'success', 'warning', 'info'],
      size: ['sm', 'md', 'lg'],
    },
    defaults: { variant: 'secondary', tone: 'neutral', size: 'md' },
  },
};

function buttonEntry() {
  return {
    source: 'src/app/components/button.tsx',
    evidence: 'hds#73',
    properties: {
      Variant: {
        type: 'VARIANT',
        options: ['Primary', 'Secondary', 'Tertiary'],
        default: 'Primary',
        prop: 'variant',
        values: { Primary: 'primary', Secondary: 'secondary', Tertiary: 'tertiary' },
      },
      Tone: {
        type: 'VARIANT',
        options: ['neutral', 'danger', 'success', 'warning', 'info'],
        prop: 'tone',
      },
      Size: { type: 'VARIANT', options: ['sm', 'md', 'lg'], default: 'md', prop: 'size' },
      State: {
        type: 'VARIANT',
        options: ['Default', 'Hover', 'Disabled', 'Loading'],
        set: { Default: {}, Hover: {}, Disabled: { disabled: true }, Loading: { loading: true } },
      },
      Label: { type: 'TEXT', default: 'Button', prop: 'children' },
      'Show icon': { type: 'BOOLEAN', default: false },
      Icon: { type: 'INSTANCE_SWAP', prop: 'iconLeft', visibleWhen: 'Show icon' },
    },
  };
}

const CHECKBOX_CODE = {
  props: {
    label: req,
    checked: req,
    onChange: req,
    indeterminate: opt,
    disabled: opt,
    'aria-description': opt,
  },
  members: {},
  cva: { axes: { state: ['rest', 'hover'] }, defaults: { state: 'rest' } },
};

function checkboxEntry() {
  return {
    source: 'src/app/components/checkbox.tsx',
    properties: {
      Label: { type: 'TEXT', default: 'Label', prop: 'label' },
      State: {
        type: 'VARIANT',
        options: ['unchecked', 'checked', 'indeterminate'],
        set: {
          unchecked: { checked: false },
          checked: { checked: true },
          indeterminate: { checked: false, indeterminate: true },
        },
      },
      'Show hint': { type: 'BOOLEAN', default: true },
      Hint: { type: 'TEXT', default: 'Hint', prop: 'aria-description', visibleWhen: 'Show hint' },
    },
    staticProps: { onChange: '{setChecked}' },
  };
}

function render(name, entry, code, values, figmaUrl = null) {
  const source = buildTemplateSource({
    name,
    exportName: entry.export ?? name,
    entry,
    code,
    figmaUrl,
    importFrom: '@hirobius/design-system',
  });
  const compiled = compileTemplate(transpileLikeCli(source));
  return renderTemplate(compiled, { properties: entry.properties, values });
}

// ── validateTemplateEntry ────────────────────────────────────────────────────

describe('validateTemplateEntry', () => {
  const errorsFor = (entry, code = BUTTON_CODE) => validateTemplateEntry('Button', entry, code);

  it('accepts a well-formed entry', () => {
    expect(errorsFor(buttonEntry())).toEqual([]);
  });

  it('rejects a mapping onto a prop the component does not accept', () => {
    const entry = buttonEntry();
    entry.properties.Size.prop = 'scale';
    expect(errorsFor(entry).join('\n')).toMatch(/"scale" is not a prop of Button/);
  });

  it('rejects VARIANT values outside the cva keys (getEnum values ⊆ cva)', () => {
    const entry = buttonEntry();
    entry.properties.Tone.values = { neutral: 'neutral', danger: 'error' };
    entry.properties.Tone.options = ['neutral', 'danger'];
    expect(errorsFor(entry).join('\n')).toMatch(/"error" is not a cva value of tone/);
  });

  it('requires a values map to cover every Figma option exactly', () => {
    const entry = buttonEntry();
    delete entry.properties.Variant.values.Tertiary;
    expect(errorsFor(entry).join('\n')).toMatch(/Variant.*Tertiary/);
  });

  it('rejects a Figma property that is neither mapped nor referenced', () => {
    const entry = buttonEntry();
    entry.properties['Show trail icon'] = { type: 'BOOLEAN', default: false };
    expect(errorsFor(entry).join('\n')).toMatch(/"Show trail icon" is not mapped/);
  });

  it('rejects visibleWhen pointing at a missing or non-BOOLEAN property', () => {
    const entry = buttonEntry();
    entry.properties.Icon.visibleWhen = 'Size';
    expect(errorsFor(entry).join('\n')).toMatch(/visibleWhen "Size" must name a BOOLEAN/);
  });

  it('rejects set / staticProps entries for unknown props', () => {
    const entry = buttonEntry();
    entry.properties.State.set.Loading = { busy: true };
    entry.staticProps = { onPress: '{handle}' };
    const joined = errorsFor(entry).join('\n');
    expect(joined).toMatch(/"busy" is not a prop of Button/);
    expect(joined).toMatch(/"onPress" is not a prop of Button/);
  });

  it('requires every required prop to be mapped or given a static value', () => {
    const entry = checkboxEntry();
    delete entry.staticProps;
    expect(validateTemplateEntry('HdsCheckbox', entry, CHECKBOX_CODE).join('\n')).toMatch(
      /required prop "onChange"/,
    );
  });

  it('rejects a missing source component', () => {
    expect(validateTemplateEntry('Button', buttonEntry(), null).join('\n')).toMatch(/not found/);
  });
});

// ── URLs + paths ─────────────────────────────────────────────────────────────

describe('Figma node URLs', () => {
  it('classifies a design URL with a node-id as mapped', () => {
    expect(classifyFigmaUrl('https://www.figma.com/design/abc123/HDS-Tokens?node-id=33-34')).toBe(
      'mapped',
    );
  });

  it('classifies null and the placeholder as unmapped', () => {
    expect(classifyFigmaUrl(null)).toBe('unmapped');
    expect(classifyFigmaUrl(unmappedUrlFor('Badge'))).toBe('unmapped');
  });

  it('classifies anything else as invalid', () => {
    expect(classifyFigmaUrl('https://www.figma.com/design/abc123/HDS')).toBe('invalid');
    expect(classifyFigmaUrl('TODO:hds-master:Button')).toBe('invalid');
  });

  it('places the template next to its source module', () => {
    expect(templatePathFor({ source: 'src/app/components/checkbox.tsx' })).toBe(
      'src/app/components/checkbox.figma.ts',
    );
  });
});

// ── buildTemplateSource ──────────────────────────────────────────────────────

describe('buildTemplateSource', () => {
  const build = (figmaUrl) =>
    buildTemplateSource({
      name: 'Button',
      exportName: 'Button',
      entry: buttonEntry(),
      code: BUTTON_CODE,
      figmaUrl,
      importFrom: '@hirobius/design-system',
    });

  it('starts with the url / source / component directives the CLI reads', () => {
    const lines = build(null).split('\n');
    expect(lines[0]).toBe(`// url=${unmappedUrlFor('Button')}`);
    expect(lines[1]).toBe('// source=src/app/components/button.tsx');
    expect(lines[2]).toBe('// component=Button');
  });

  it('flags an unmapped template in its header', () => {
    expect(build(null)).toMatch(/UNMAPPED: no Figma node URL/);
  });

  it('uses a real node URL without the UNMAPPED flag', () => {
    const url = 'https://www.figma.com/design/abc123/HDS?node-id=1-2';
    const source = build(url);
    expect(source.split('\n')[0]).toBe(`// url=${url}`);
    expect(source).not.toMatch(/UNMAPPED/);
  });

  it('only imports the figma module and exports the parserless template shape', () => {
    const source = build(null);
    expect(source).toMatch(/^import figma from 'figma';$/m);
    expect(source).not.toMatch(/figma\.connect\(/);
    expect(source).toMatch(/imports: \["import \{ Button \} from '@hirobius\/design-system'"\]/);
    expect(source).toMatch(/id: 'button'/);
  });

  it('writes exhaustive getEnum maps (identity for cva-named options)', () => {
    const source = build(null);
    expect(source).toMatch(
      /getEnum\('Tone', \{\s*neutral: 'neutral',\s*danger: 'danger',\s*success: 'success',\s*warning: 'warning',\s*info: 'info',?\s*\}\)/,
    );
    expect(source).toMatch(/Primary: 'primary'/);
  });
});

// ── Round trip: generated template → rendered Dev Mode snippet ───────────────

describe('generated template renders the HDS snippet', () => {
  const base = {
    Variant: 'Secondary',
    Tone: 'neutral',
    Size: 'md',
    State: 'Default',
    Label: 'Save',
    'Show icon': false,
    Icon: '<Plus />',
  };

  it('omits props that equal the cva defaults', () => {
    const { snippet, error } = render('Button', buttonEntry(), BUTTON_CODE, base);
    expect(error).toBeUndefined();
    expect(snippet).toBe('<Button>Save</Button>');
  });

  it('maps legacy Figma option names onto cva values', () => {
    const { snippet } = render('Button', buttonEntry(), BUTTON_CODE, {
      ...base,
      Variant: 'Primary',
      Tone: 'danger',
      Size: 'lg',
    });
    expect(snippet).toBe('<Button variant="primary" tone="danger" size="lg">Save</Button>');
  });

  it('turns state options into boolean props', () => {
    expect(
      render('Button', buttonEntry(), BUTTON_CODE, { ...base, State: 'Disabled' }).snippet,
    ).toBe('<Button disabled>Save</Button>');
    expect(render('Button', buttonEntry(), BUTTON_CODE, { ...base, State: 'Hover' }).snippet).toBe(
      '<Button>Save</Button>',
    );
  });

  it('renders the swapped icon instance only when its toggle is on', () => {
    const { snippet } = render('Button', buttonEntry(), BUTTON_CODE, {
      ...base,
      'Show icon': true,
    });
    expect(snippet).toBe('<Button iconLeft={<Plus />}>Save</Button>');
  });

  it('emits required props even when false, gated text, and static props', () => {
    const values = { Label: 'Accept', State: 'unchecked', 'Show hint': false, Hint: 'x' };
    expect(render('HdsCheckbox', checkboxEntry(), CHECKBOX_CODE, values).snippet).toBe(
      '<HdsCheckbox label="Accept" checked={false} onChange={setChecked} />',
    );
    expect(
      render('HdsCheckbox', checkboxEntry(), CHECKBOX_CODE, {
        ...values,
        State: 'indeterminate',
        'Show hint': true,
      }).snippet,
    ).toBe(
      '<HdsCheckbox label="Accept" checked={false} indeterminate aria-description="x" onChange={setChecked} />',
    );
  });

  it('records every getEnum mapping it used', () => {
    const { enumCalls } = render('Button', buttonEntry(), BUTTON_CODE, base);
    expect(enumCalls.map((call) => call.property)).toEqual(['Variant', 'Tone', 'Size', 'State']);
    expect(enumCalls[0].mapping).toEqual({
      Primary: 'primary',
      Secondary: 'secondary',
      Tertiary: 'tertiary',
    });
  });
});

// ── generateTemplates (registry + manifest + code model → files) ─────────────

describe('generateTemplates', () => {
  const fakeModel = (components) => ({
    component: (filePath, exportName) => components[`${filePath}#${exportName}`] ?? null,
  });
  const registry = { importFrom: '@hirobius/design-system', templates: { Button: buttonEntry() } };

  it('writes one formatted template per registry entry, URL taken from the manifest', async () => {
    const url = 'https://www.figma.com/design/abc123/HDS?node-id=9-9';
    const { files, errors } = await generateTemplates({
      root: process.cwd(),
      registry,
      manifest: { componentSpecs: { Button: { figmaUrl: url } } },
      codeModel: fakeModel({ 'src/app/components/button.tsx#Button': BUTTON_CODE }),
    });
    expect(errors).toEqual([]);
    expect(files).toHaveLength(1);
    expect(files[0].path).toBe('src/app/components/button.figma.ts');
    expect(files[0].status).toBe('mapped');
    expect(files[0].content.startsWith(`// url=${url}\n`)).toBe(true);
    expect(files[0].content).toMatch(/;\n$/); // prettier-formatted (semi: true)
  });

  it('reports invalid entries instead of writing a broken template', async () => {
    const broken = {
      ...registry,
      templates: { Button: { ...buttonEntry(), staticProps: { nope: '{x}' } } },
    };
    const { files, errors } = await generateTemplates({
      root: process.cwd(),
      registry: broken,
      manifest: { componentSpecs: {} },
      codeModel: fakeModel({ 'src/app/components/button.tsx#Button': BUTTON_CODE }),
    });
    expect(files).toEqual([]);
    expect(errors.join('\n')).toMatch(/"nope" is not a prop of Button/);
  });

  it('rejects a manifest figmaUrl that is neither a node URL nor empty', async () => {
    const { errors } = await generateTemplates({
      root: process.cwd(),
      registry,
      manifest: { componentSpecs: { Button: { figmaUrl: 'TODO:hds-master:Button' } } },
      codeModel: fakeModel({ 'src/app/components/button.tsx#Button': BUTTON_CODE }),
    });
    expect(errors.join('\n')).toMatch(/figmaUrl .* is not a Figma node URL/);
  });
});

// ── Local runtime guards ─────────────────────────────────────────────────────

describe('local template runtime', () => {
  const properties = { Label: { type: 'TEXT' }, Flag: { type: 'BOOLEAN' } };

  it('fails like Figma on an unknown property', () => {
    const compiled = compileTemplate(
      transpileLikeCli(
        "// url=x\nimport figma from 'figma';\nconst v = figma.selectedInstance.getString('Nope');\nexport default { example: figma.code`<X>${v}</X>`, id: 'x' };\n",
      ),
    );
    expect(renderTemplate(compiled, { properties, values: { Label: 'a' } }).error).toMatch(
      /property "Nope" not found/,
    );
  });

  it('fails on a property read with the wrong type', () => {
    const compiled = compileTemplate(
      transpileLikeCli(
        "// url=x\nimport figma from 'figma';\nconst v = figma.selectedInstance.getBoolean('Label');\nexport default { example: figma.code`<X a={${String(v)}} />`, id: 'x' };\n",
      ),
    );
    expect(renderTemplate(compiled, { properties, values: { Label: 'a' } }).error).toMatch(
      /"Label" is TEXT, not BOOLEAN/,
    );
  });

  it('fails when a template interpolates undefined', () => {
    const compiled = compileTemplate(
      transpileLikeCli(
        "// url=x\nimport figma from 'figma';\nconst v = undefined;\nexport default { example: figma.code`<X>${v}</X>`, id: 'x' };\n",
      ),
    );
    expect(renderTemplate(compiled, { properties, values: {} }).error).toMatch(/undefined/);
  });

  it('enumerates every VARIANT × BOOLEAN combination', () => {
    const combos = enumerateCombinations({
      Size: { type: 'VARIANT', options: ['sm', 'md'] },
      On: { type: 'BOOLEAN', default: false },
      Label: { type: 'TEXT', default: 'L' },
    });
    expect(combos).toHaveLength(4);
    expect(combos).toContainEqual({ Size: 'md', On: true, Label: 'L' });
  });
});
