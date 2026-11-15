/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Tests for the Code Connect template generator (B2) and the local template
 * runtime it is verified with.
 *
 * Unit tests inject a fake code model, so the registry → template rules are
 * exercised without a TypeScript program. The round-trip tests transpile the
 * generated template exactly as `figma connect parse` does (TypeScript
 * transpileModule + the `figma` import rewrite) and execute it against the
 * local runtime (scripts/lib/code-connect-runtime.mjs, an emulator of Figma's
 * template runtime, not Figma itself). Nothing here is published, so these
 * snippets are not what Dev Mode shows today.
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
import { generateTemplates, partNodeUrls } from '../generate-code-connect.mjs';

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
    expect(validateTemplateEntry('Checkbox', entry, CHECKBOX_CODE).join('\n')).toMatch(
      /required prop "onChange"/,
    );
  });

  it('rejects a missing source component', () => {
    expect(validateTemplateEntry('Button', buttonEntry(), null).join('\n')).toMatch(/not found/);
  });

  describe('codeOnly (cva keys with no Figma option)', () => {
    const withGhost = {
      ...BUTTON_CODE,
      cva: {
        ...BUTTON_CODE.cva,
        axes: { ...BUTTON_CODE.cva.axes, variant: ['primary', 'secondary', 'tertiary', 'ghost'] },
      },
    };

    it('accepts a cva key listed with a reason', () => {
      const entry = buttonEntry();
      entry.properties.Variant.codeOnly = { ghost: 'Code-only style; no Figma option yet.' };
      expect(errorsFor(entry, withGhost)).toEqual([]);
    });

    it('rejects a key that is not a cva key of the prop', () => {
      const entry = buttonEntry();
      entry.properties.Variant.codeOnly = { outline: 'reason' };
      expect(errorsFor(entry, withGhost).join('\n')).toMatch(
        /codeOnly "outline" is not a cva value of variant/,
      );
    });

    it('rejects a key a Figma option already maps to (stale)', () => {
      const entry = buttonEntry();
      entry.properties.Variant.codeOnly = { primary: 'reason' };
      expect(errorsFor(entry, withGhost).join('\n')).toMatch(
        /codeOnly "primary" is mapped from a Figma option/,
      );
    });

    it('requires a reason, and a VARIANT mapped with prop', () => {
      const entry = buttonEntry();
      entry.properties.Variant.codeOnly = { ghost: '' };
      entry.properties.State.codeOnly = { x: 'reason' };
      const joined = errorsFor(entry, withGhost).join('\n');
      expect(joined).toMatch(/codeOnly "ghost" needs a reason/);
      expect(joined).toMatch(/"State": codeOnly needs a VARIANT mapped with prop/);
    });
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

  it('names a second template of the same module after its export', () => {
    expect(templatePathFor({ source: 'src/app/components/tabs.tsx' }, 'TabsTrigger')).toBe(
      'src/app/components/tabs-trigger.figma.ts',
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

  it('tells the reader both commands that carry an @figma tag into the template', () => {
    // The URL flows tag → manifest figmaUrl → template, so regenerating the
    // templates alone leaves the template unmapped.
    expect(build(null).replace(/\n\/\/ /g, ' ')).toMatch(
      /pnpm manifest:generate && pnpm figma:connect:generate/,
    );
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

// ── Round trip: generated template → locally rendered snippet ────────────────

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
    expect(render('Checkbox', checkboxEntry(), CHECKBOX_CODE, values).snippet).toBe(
      '<Checkbox label="Accept" checked={false} onChange={setChecked} />',
    );
    expect(
      render('Checkbox', checkboxEntry(), CHECKBOX_CODE, {
        ...values,
        State: 'indeterminate',
        'Show hint': true,
      }).snippet,
    ).toBe(
      '<Checkbox label="Accept" checked={false} indeterminate aria-description="x" onChange={setChecked} />',
    );
  });

  it('maps a BOOLEAN onto props per state with set', () => {
    const code = { props: { label: req, showLabel: opt, status: opt }, members: {}, cva: null };
    const entry = {
      source: 'src/app/components/select.tsx',
      properties: {
        Label: { type: 'TEXT', default: 'Label', prop: 'label' },
        'Show label': {
          type: 'BOOLEAN',
          default: true,
          set: { true: {}, false: { showLabel: { $expr: 'false' } } },
        },
        'Show status': {
          type: 'BOOLEAN',
          default: false,
          set: { true: { status: 'success' }, false: {} },
        },
      },
    };
    expect(validateTemplateEntry('Select', entry, code)).toEqual([]);
    const values = { Label: 'Role', 'Show label': true, 'Show status': false };
    expect(render('Select', entry, code, values).snippet).toBe('<Select label="Role" />');
    expect(
      render('Select', entry, code, { ...values, 'Show label': false, 'Show status': true })
        .snippet,
    ).toBe('<Select label="Role" showLabel={false} status="success" />');
  });

  it('rejects a BOOLEAN set that names an unknown prop or misses a state', () => {
    const code = { props: { label: req }, members: {}, cva: null };
    const entry = (set) => ({
      source: 'src/app/components/select.tsx',
      properties: {
        Label: { type: 'TEXT', prop: 'label' },
        'Show label': { type: 'BOOLEAN', set },
      },
    });
    expect(
      validateTemplateEntry('Select', entry({ true: {}, false: { nope: false } }), code),
    ).toEqual([expect.stringContaining('"nope" is not a prop of Select')]);
    expect(validateTemplateEntry('Select', entry({ true: {} }), code)).toEqual([
      expect.stringContaining('set must map exactly [true, false]'),
    ]);
  });

  it('renders entry children, with TEXT properties interpolated', () => {
    const code = { props: { tone: opt, children: req }, members: {}, cva: null };
    const entry = {
      source: 'src/app/components/card.tsx',
      properties: {
        Title: { type: 'TEXT', default: 'Card title' },
        Tone: {
          type: 'VARIANT',
          options: ['neutral', 'danger'],
          set: { neutral: {}, danger: { tone: 'danger' } },
        },
      },
      children: '<Card.Title>{{Title}}</Card.Title>',
    };
    expect(validateTemplateEntry('Card', entry, code)).toEqual([]);
    expect(render('Card', entry, code, { Title: 'Plan', Tone: 'danger' }).snippet).toBe(
      '<Card tone="danger"><Card.Title>Plan</Card.Title></Card>',
    );
  });

  it('rejects children that name a missing property or compete with a TEXT child', () => {
    const code = { props: { children: req }, members: {}, cva: null };
    const base = { source: 'src/app/components/card.tsx' };
    expect(
      validateTemplateEntry(
        'Card',
        { ...base, properties: { Title: { type: 'TEXT' } }, children: '{{Heading}}' },
        code,
      ),
    ).toEqual(expect.arrayContaining([expect.stringContaining('children names "Heading"')]));
    expect(
      validateTemplateEntry(
        'Card',
        { ...base, properties: { Title: { type: 'TEXT', prop: 'children' } }, children: 'x' },
        code,
      ),
    ).toEqual([expect.stringContaining('children is set twice')]);
  });

  it('interpolates a VARIANT into children through its values map', () => {
    const code = { props: { children: opt }, members: {}, cva: null };
    const entry = {
      source: 'src/app/components/hds-tooltip.tsx',
      properties: {
        Label: { type: 'TEXT', default: 'Tip' },
        Side: { type: 'VARIANT', options: ['Top', 'Left'], values: { Top: 'top', Left: 'left' } },
      },
      children: '<Tooltip.Content side="{{Side}}">{{Label}}</Tooltip.Content>',
    };
    expect(validateTemplateEntry('Tooltip', entry, code)).toEqual([]);
    expect(render('Tooltip', entry, code, { Label: 'Copy', Side: 'Left' }).snippet).toBe(
      '<Tooltip><Tooltip.Content side="left">Copy</Tooltip.Content></Tooltip>',
    );
  });

  it('accepts a component whose Figma node has no properties', () => {
    const code = { props: { children: req }, members: {}, cva: null };
    const entry = { source: 'src/app/components/dock.tsx', properties: {}, children: 'Actions' };
    expect(validateTemplateEntry('Dock', entry, code)).toEqual([]);
    expect(render('Dock', entry, code, {}).snippet).toBe('<Dock>Actions</Dock>');
    const source = buildTemplateSource({
      name: 'Dock',
      exportName: 'Dock',
      entry,
      code,
      figmaUrl: null,
      importFrom: '@hirobius/design-system',
    });
    expect(source).not.toContain('selectedInstance');
  });

  it('imports from the entry module and adds the extra names children use', () => {
    const code = { props: { children: req }, members: {}, cva: null };
    const entry = {
      source: 'src/app/components/page-header.tsx',
      importFrom: '@hirobius/design-system/patterns',
      imports: { '@hirobius/design-system': ['Button'], 'lucide-react': ['Plus'] },
      properties: {},
      children: '<Button iconLeft={<Plus />}>New</Button>',
    };
    expect(validateTemplateEntry('PageHeader', entry, code)).toEqual([]);
    expect(render('PageHeader', entry, code, {}).imports).toEqual([
      "import { PageHeader } from '@hirobius/design-system/patterns'",
      "import { Button } from '@hirobius/design-system'",
      "import { Plus } from 'lucide-react'",
    ]);
    const same = {
      ...entry,
      importFrom: undefined,
      imports: { '@hirobius/design-system': ['Button'] },
    };
    expect(render('PageHeader', same, code, {}).imports).toEqual([
      "import { PageHeader, Button } from '@hirobius/design-system'",
    ]);
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

  it('writes one template per export when two entries share a module', async () => {
    const entry = { ...checkboxEntry() };
    const { files, errors } = await generateTemplates({
      registry: {
        importFrom: '@hirobius/design-system',
        templates: { Checkbox: entry, CheckboxCard: { ...entry, export: 'CheckboxCard' } },
      },
      manifest: {},
      codeModel: { component: () => CHECKBOX_CODE },
    });
    expect(errors).toEqual([]);
    expect(files.map((file) => file.path)).toEqual([
      'src/app/components/checkbox.figma.ts',
      'src/app/components/checkbox-card.figma.ts',
    ]);
  });

  it('takes the node of a compound part from the mapping overrides', () => {
    const urls = partNodeUrls({
      registry: {
        templates: {
          Tabs: { source: 'src/app/components/tabs.tsx' },
          TabsTrigger: { source: 'src/app/components/tabs.tsx' },
        },
      },
      overrides: {
        overrides: [
          {
            nodeId: '86:52',
            name: 'TabTrigger',
            mapsTo: 'TabsTrigger',
            source: 'src/app/components/tabs.tsx',
          },
        ],
      },
      links: { libraryFileKey: 'LIB' },
    });
    expect(urls).toEqual({
      TabsTrigger: 'https://www.figma.com/design/LIB/HDS-Tokens-Components?node-id=86-52',
    });
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
