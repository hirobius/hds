/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * public-data-attributes.mjs — the data-* attributes each component promises
 * consumers may select on (hds#960, split from hds#468).
 *
 * PUBLIC_DATA_ATTRIBUTES is the declaration, by hand, keyed by the component
 * whose docs demo proves it. scripts/generate-manifest.mjs copies each list
 * into its componentSpecs (or utilities) entry as `publicDataAttributes`, and
 * scripts/generate-consumer-skill.mjs lists them in the consumer skill.
 *
 * checkPublicDataAttributes holds the declaration to what the components
 * render, as docs/baselines/dom-a11y.json records it (one entry per demo):
 *   - not-in-demo: a declared attribute must appear in that component's demo;
 *     a component with no demo cannot declare one.
 *   - undeclared: a public attribute a demo renders that its component's
 *     source writes (`data-x=`, `'data-x':`, `dataset.x`) must be declared by
 *     that component.
 *   - unclaimed: every public attribute any demo renders must be declared by
 *     some component (Radix's data-state, or one a nested component renders).
 *
 * Public means data-* other than data-hds-* (HDS-internal markers),
 * data-radix-* (Radix's) and data-testid. The dom baseline already leaves out
 * the last two.
 *
 * scripts/__tests__/public-data-attributes.test.mjs runs the check on the repo
 * in `pnpm test`.
 */

/** The data-* attributes consumers may select on, per component. */
export const PUBLIC_DATA_ATTRIBUTES = {
  AsyncState: ['data-slot', 'data-status'],
  Avatar: ['data-size'],
  Badge: ['data-tone'],
  Button: ['data-hover-effect', 'data-pressed', 'data-tone', 'data-variant'],
  Card: [
    'data-bordered',
    'data-format',
    'data-interactive',
    'data-padding',
    'data-slot',
    'data-tone',
    'data-variant',
  ],
  DataTableSection: ['data-slot'],
  DestructiveSection: ['data-slot'],
  Dialog: ['data-state'],
  Disclosure: ['data-state'],
  Divider: ['data-variant'],
  ErrorPattern: ['data-role'],
  Field: ['data-tone'],
  FormActions: ['data-slot'],
  Input: ['data-size', 'data-state'],
  Kbd: ['data-size'],
  Menu: ['data-state'],
  MetaLine: ['data-meta-separator'],
  MetricTiles: ['data-tone'],
  PageHeader: ['data-slot'],
  Popover: ['data-state'],
  Progress: ['data-state', 'data-tone', 'data-variant'],
  Reveal: ['data-reveal'],
  SegmentedControl: ['data-state'],
  Select: ['data-state'],
  Sheet: ['data-state'],
  Skeleton: ['data-variant'],
  Spinner: ['data-size'],
  Table: ['data-slot'],
  Tabs: ['data-orientation', 'data-state'],
  Tag: ['data-active', 'data-dismissible'],
  Textarea: ['data-state'],
  ThemeToggle: ['data-theme-state'],
  Timeline: ['data-format', 'data-timeline-marker', 'data-tone'],
  TokenField: ['data-state', 'data-token'],
  Tooltip: ['data-state'],
};

/** True for a data-* attribute consumers may select on. */
export function isPublicDataAttribute(name) {
  return (
    name.startsWith('data-') &&
    name !== 'data-testid' &&
    !name.startsWith('data-hds-') &&
    !name.startsWith('data-radix-')
  );
}

const sorted = (values) => [...new Set(values)].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

/** The public data-* attributes in a demo's dom lines, sorted. */
export function demoDataAttributes(domLines) {
  const names = [];
  for (const line of domLines) {
    // Values are JSON strings: drop them so a value cannot read as a name.
    const bare = line.replace(/="(?:[^"\\]|\\.)*"/g, '=');
    for (const m of bare.matchAll(/(?:^|\s)(data-[a-z0-9-]+)(?==|\s|$)/g)) names.push(m[1]);
  }
  return sorted(names.filter(isPublicDataAttribute));
}

const kebab = (camel) => camel.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

/** The data-* attributes a source file writes, sorted, public or not. */
export function sourceDataAttributes(source) {
  // Comments can name attributes the code never writes.
  source = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
  const names = [];
  for (const m of source.matchAll(/['"]?(data-[a-z][a-z0-9-]*)['"]?\s*[=:]/g)) names.push(m[1]);
  for (const m of source.matchAll(/dataset(?:\.([A-Za-z]\w*)|\[['"]([A-Za-z]\w*)['"]\])/g)) {
    names.push(`data-${kebab(m[1] ?? m[2])}`);
  }
  return sorted(names);
}

/**
 * @param {{
 *   declared: Record<string, string[]>,
 *   baseline: Record<string, { dom: string[] }>,
 *   sources: Record<string, string>,
 * }} input  `sources`: each demo's component source, by component name
 * @returns {{ component: string, attribute: string, rule: 'not-in-demo' | 'undeclared' | 'unclaimed' }[]}
 */
export function checkPublicDataAttributes({ declared, baseline, sources }) {
  const violations = [];
  const claimed = new Set(Object.values(declared).flat());
  for (const component of Object.keys(declared).sort()) {
    const rendered = new Set(
      baseline[component] ? demoDataAttributes(baseline[component].dom) : [],
    );
    for (const attribute of declared[component]) {
      if (!rendered.has(attribute)) violations.push({ component, attribute, rule: 'not-in-demo' });
    }
  }
  for (const component of Object.keys(baseline).sort()) {
    const own = new Set(declared[component] ?? []);
    const written = new Set(sourceDataAttributes(sources[component] ?? ''));
    for (const attribute of demoDataAttributes(baseline[component].dom)) {
      if (written.has(attribute) && !own.has(attribute)) {
        violations.push({ component, attribute, rule: 'undeclared' });
      } else if (!claimed.has(attribute)) {
        violations.push({ component, attribute, rule: 'unclaimed' });
      }
    }
  }
  return violations;
}

const MESSAGES = {
  'not-in-demo': 'is declared but its docs demo does not render it (docs/baselines/dom-a11y.json)',
  undeclared: 'renders it from its own source but does not declare it',
  unclaimed: 'renders it in its demo but no component declares it',
};

/** One line per violation, naming where to fix it. */
export function formatViolation({ component, attribute, rule }) {
  return `${component}: \`${attribute}\` ${MESSAGES[rule]}. Fix PUBLIC_DATA_ATTRIBUTES in scripts/lib/public-data-attributes.mjs, then pnpm manifest:generate && pnpm skill:generate.`;
}
