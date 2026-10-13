/** @internal — not part of @hirobius/design-system public API surface. */
import fs from 'node:fs';
import path from 'node:path';
import { docsPagePath, loadDocsRouting } from './lib/docs-routing.mjs';
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

// Hand-kept rules for components that have no @a11y tags (hds#520). A
// component with @a11y JSDoc tags gets its a11yRules from those tags
// (scripts/generate-manifest.mjs), so it has no entry here: the interactive
// roots (scripts/lib/a11y-interactive.mjs) all carry tags, and
// check-a11y-contracts fails the commit if one loses them.
const a11yDefaults = {
  Icon: [
    { rule: 'Must have aria-label when used without adjacent text', required: true },
    { rule: 'Decorative icons must have aria-hidden="true"', required: true },
  ],
  Callout: [
    {
      rule: 'Callout is decorative; tone is signaled visually — pair with semantic role when meaning matters',
      required: false,
    },
  ],
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

// Join each component to the docs-site page that documents it (hds#506). The
// docs site is the place a component is shown, so the manifest answers
// "where is Button documented" with a site-relative path
// (`/docs/components/button`). Always written, null when
// the component has no page: an absent field reads as "not yet computed". The
// public origin is figma/links.json docsUrl, so a moved site never touches the
// manifest. Routing rules: docsPageFor() in scripts/lib/docs-component-pages.mjs.
const docsRouting = loadDocsRouting(repoRoot);
for (const [name, spec] of Object.entries(componentSpecs)) {
  spec.docsPage = docsPagePath(name, docsRouting);
}

manifest.componentSpecs = componentSpecs;
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
