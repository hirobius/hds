/** @internal — not part of @hirobius/design-system public API surface. */
import fs from 'node:fs';
import path from 'node:path';
import { buildStoryIndex, findStoryFiles } from './lib/story-link.mjs';
import { deriveRequiredProps, refreshSpecProps } from './lib/manifest-props.mjs';

const repoRoot = process.cwd();
const manifestPath = path.join(repoRoot, 'public', 'hds-manifest.json');
const componentApiPath = path.join(repoRoot, 'src', 'app', 'data', 'component-api.json');

const targets = new Set([
  'Button',
  'Alert',
  'Callout',
  'Stack',
  'Input',
  'SegmentedControl',
  'Card',
  'Dialog',
  'Badge',
  'Surface',
  'Grid',
  'Icon',
  'Tag',
  'Divider',
  'InlineLink',
  'AssetImg',
  'Table',
  'Field',
  'Stat',
  'StatusListItem',
]);

const allowedChildrenDefaults = {
  Stack: ['*'],
  Grid: ['*'],
  Surface: ['*'],
  Card: ['*'],
  Dialog: ['*'],
  Button: [],
  Tag: [],
  Badge: [],
  Icon: [],
  Divider: [],
  Alert: ['*'],
  Callout: ['*'],
  Input: [],
  Field: ['*'],
  Stat: [],
  StatusListItem: [],
};

const a11yDefaults = {
  // ── Actions ──────────────────────────────────────────────────────────────────
  Button: [
    { rule: 'Must have accessible name via label prop or aria-label', required: true },
    { rule: 'Focus ring visible in all interactive states (uses hds-focus class)', required: true },
  ],
  // ── Inputs ───────────────────────────────────────────────────────────────────
  Input: [
    { rule: 'Must have associated label via label prop or aria-labelledby', required: true },
    {
      rule: 'Error state must be communicated via aria-describedby or aria-invalid',
      required: true,
    },
  ],
  SegmentedControl: [
    {
      rule: 'Must have accessible group label (aria-label or aria-labelledby on the container)',
      required: true,
    },
    {
      rule: 'Selected option must be communicated via aria-pressed or aria-selected',
      required: true,
    },
  ],
  Tag: [
    {
      rule: 'When used as interactive chip (onClick), must have role="button" and keyboard activation',
      required: true,
    },
    {
      rule: 'When used as status indicator (no onClick), role should be "status" or omitted',
      required: false,
    },
  ],
  // ── Navigation ───────────────────────────────────────────────────────────────
  InlineLink: [
    { rule: 'Link text must be descriptive — avoid "click here" or "read more"', required: true },
    {
      rule: 'External links must signal new-tab behavior via aria-label or visually hidden text',
      required: false,
    },
  ],
  // ── Display / Media ──────────────────────────────────────────────────────────
  AssetImg: [
    { rule: 'Must have alt text (decorative images use alt="")', required: true },
    {
      rule: 'Caption or description should be associated via aria-describedby when present',
      required: false,
    },
  ],
  Table: [
    {
      rule: 'Column headers must use <th> with scope="col", row headers with scope="row"',
      required: true,
    },
    { rule: 'Table must have caption or aria-label describing its contents', required: false },
  ],
  // ── Overlays ─────────────────────────────────────────────────────────────────
  Icon: [
    { rule: 'Must have aria-label when used without adjacent text', required: true },
    { rule: 'Decorative icons must have aria-hidden="true"', required: true },
  ],
  Alert: [{ rule: 'role=alert is set by the component — do not override', required: false }],
  Callout: [
    {
      rule: 'Callout is decorative; tone is signaled visually — pair with semantic role when meaning matters',
      required: false,
    },
  ],
  // ── Display ──────────────────────────────────────────────────────────────────
  Field: [
    {
      rule: 'Label must describe the value; pair with aria-describedby when value is non-trivial',
      required: false,
    },
  ],
  Stat: [
    {
      rule: 'Provide an accessible name for the stat when value is symbolic (—, ✓, etc.)',
      required: false,
    },
  ],
  StatusListItem: [
    {
      rule: 'Status dot is decorative (aria-hidden); convey status meaning via title or trailing badge',
      required: true,
    },
  ],
  Dialog: [
    { rule: 'Must have an accessible name via Dialog.Title or aria-label', required: true },
    {
      rule: 'Description should be associated via Dialog.Description when present',
      required: false,
    },
    { rule: 'Focus must be trapped within dialog while open', required: true },
    { rule: 'Escape key must close the dialog', required: true },
  ],
};

const compilerStubSpecs = {
  HdsPhosphor: {
    category: 'Compiler',
    filePath: 'scripts/hds-jsx-compiler.mjs',
    description: 'Compiler-recognized icon alias stub for JSX normalization.',
    hidden: true,
    tier: 'utility',
  },
  HdsFrame: {
    category: 'Compiler',
    filePath: 'scripts/hds-jsx-compiler.mjs',
    description: 'Compiler-internal frame primitive stub for generated JSX validation.',
    hidden: true,
    tier: 'utility',
  },
  Text: {
    category: 'Compiler',
    filePath: 'scripts/hds-jsx-compiler.mjs',
    description: 'Compiler-internal text primitive stub for generated JSX validation.',
    hidden: true,
    tier: 'utility',
  },
  HdsHeading: {
    category: 'Compiler',
    filePath: 'scripts/hds-jsx-compiler.mjs',
    description: 'Compiler-recognized heading primitive stub for generated JSX validation.',
    hidden: true,
    tier: 'utility',
  },
  HdsLabel: {
    category: 'Compiler',
    filePath: 'scripts/hds-jsx-compiler.mjs',
    description: 'Compiler-recognized label primitive stub for generated JSX validation.',
    hidden: true,
    tier: 'utility',
  },
  HdsCaption: {
    category: 'Compiler',
    filePath: 'scripts/hds-jsx-compiler.mjs',
    description: 'Compiler-recognized caption primitive stub for generated JSX validation.',
    hidden: true,
    tier: 'utility',
  },
  HdsCheckbox: {
    category: 'Compiler',
    filePath: 'scripts/hds-jsx-compiler.mjs',
    description: 'Compiler-recognized checkbox instance stub for generated JSX validation.',
    hidden: true,
    tier: 'utility',
  },
  HdsChip: {
    category: 'Compiler',
    filePath: 'scripts/hds-jsx-compiler.mjs',
    description: 'Compiler-recognized chip instance stub for generated JSX validation.',
    hidden: true,
    tier: 'utility',
  },
  HdsAvatar: {
    category: 'Compiler',
    filePath: 'scripts/hds-jsx-compiler.mjs',
    description: 'Compiler-recognized avatar instance stub for generated JSX validation.',
    hidden: true,
    tier: 'utility',
  },
};

const legacyFilePaths = {
  AssetImg: 'src/app/components/AssetImg.tsx',
  ComponentDocPage: 'src/app/components/ComponentDocPage.tsx',
  ReflectiveTokenTable: '',
};

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

const manifest = readJson(manifestPath);
const componentApi = readJson(componentApiPath);
const componentSpecs = manifest.componentSpecs ?? {};
const apiComponents = componentApi.components ?? {};

for (const [name, stubSpec] of Object.entries(compilerStubSpecs)) {
  if (!componentSpecs[name]) {
    componentSpecs[name] = { ...stubSpec };
  }
}

for (const [name, spec] of Object.entries(componentSpecs)) {
  const apiComponent = apiComponents[name];

  if (typeof spec.filePath !== 'string') {
    spec.filePath = spec.sourcePath ?? apiComponent?.filePath ?? legacyFilePaths[name] ?? '';
  }

  // hds#390: props and propConstraints follow component-api.json on every
  // run. They used to be filled only when absent, so Stack.wrap stayed
  // `boolean` after the code moved to FlexWrap.
  const { props, propConstraints } = refreshSpecProps(spec, apiComponent, {
    derive: targets.has(name),
  });
  spec.props = props;

  if (!('allowedChildren' in spec)) {
    spec.allowedChildren = targets.has(name) ? [...(allowedChildrenDefaults[name] ?? [])] : ['*'];
  }

  spec.propConstraints = propConstraints;

  if (!('requiredProps' in spec)) {
    spec.requiredProps = targets.has(name) ? deriveRequiredProps(props) : [];
  }

  // Apply a11yRules: set if not present, or if empty and we have defaults for this component
  if (
    !('a11yRules' in spec) ||
    (spec.a11yRules.length === 0 && targets.has(name) && a11yDefaults[name])
  ) {
    spec.a11yRules = targets.has(name) ? [...(a11yDefaults[name] ?? [])] : (spec.a11yRules ?? []);
  }
}

// Join each component to the stories that exercise it. The manifest is the
// declared source of truth for inventory and Figma links and could not answer
// "where is Button's story", though the link was derivable from source all
// along -- so nothing could gate it and an agent looking for an editing target
// had to grep. Ids are derived rather than read from storybook-static, so this
// needs no build; scripts/__tests__/story-link.test.mjs asserts the derivation
// against the real index.json whenever one is present.
const storyFiles = findStoryFiles(repoRoot);
const { byFilePath: storiesByFilePath } = buildStoryIndex(
  storyFiles.map((p) => ({ path: p, source: fs.readFileSync(path.join(repoRoot, p), 'utf8') })),
  new Set(
    Object.values(componentSpecs)
      .map((spec) => spec.filePath)
      .filter(Boolean),
  ),
);

for (const [, spec] of Object.entries(componentSpecs)) {
  const link = spec.filePath ? storiesByFilePath.get(spec.filePath) : undefined;
  // Always written, including as empty arrays: a component with no story is a
  // fact worth recording, and an absent field reads as "not yet computed".
  spec.storyFiles = link?.storyFiles ?? [];
  spec.storyIds = link?.storyIds ?? [];
}

manifest.componentSpecs = componentSpecs;
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
