/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * docs-component-pages — turns the component data into Fumadocs MDX (hds#506).
 *
 * One page per core component, generated from data that already exists:
 *   - props            src/app/data/component-api.json
 *   - usage contract   public/hds-manifest.json componentSpecs[].usage
 *   - keyboard + a11y  public/hds-manifest.json componentSpecs[].keyboard / a11yRules
 *   - live preview,    resolved at render time by the docs-site (remark plugin
 *     token mapping    swaps the content-model markers for components)
 *
 * Nothing here is hand-written per component: adding a component to
 * scripts/lib/core-components.mjs and regenerating produces its page. The
 * markers follow content-model.md (Template A) so scripts/check-docs.mjs
 * accepts the output unchanged.
 */

/** `SegmentedControl` -> `segmented-control` (the inverse of check-docs' slugToName). */
export const componentSlug = (name) => name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

/**
 * Maintainer references a reader can't follow: issue numbers, ADR numbers and
 * script names, with the parentheses or "per …" clause that carries them.
 */
export function readerText(text) {
  return String(text ?? '')
    .replace(/\s*\((?:[^()]*?\b(?:hds|ops)#\d+|[^()]*?\bADR-\d+|[^()]*?\.mjs)[^()]*\)/g, '')
    .replace(/\s*[,;]?\s*(?:per|see)\s+(?:ADR-\d+|(?:hds|ops)#\d+)[^.;]*/gi, '')
    .replace(/\s*\b(?:hds|ops)#\d+\b/g, '')
    .replace(/\s+([.,;])/g, '$1')
    .trim();
}

/** One line, MDX-safe. Inline-code spans pass through; braces/angles outside them are escaped. */
function prose(text) {
  const oneLine = readerText(text)
    .replace(/\s*\n\s*/g, ' ')
    .trim();
  return oneLine
    .split(/(`[^`]*`)/)
    .map((part, i) => (i % 2 === 1 ? part : part.replace(/([{}<])/g, '\\$1')))
    .join('');
}

/** Table-cell safe: prose + escaped pipes (also inside code spans, which GFM requires). */
const cell = (text) => prose(text).replace(/\|/g, '\\|');

/** Inline code that survives a table cell. */
const code = (text) =>
  `\`${String(text)
    .replace(/\s*\n\s*/g, ' ')
    .replace(/\|/g, '\\|')}\``;

function propsSection(name, api) {
  const props = api?.components?.[name]?.props;
  if (!Array.isArray(props) || props.length === 0) {
    return '{/* props: TODO — source missing */}';
  }
  // Deprecated props still work for old code but are documented in the
  // upgrade guide, not offered to new code here.
  const live = props.filter((p) => !/^@?deprecated\b/i.test(String(p.description ?? '').trim()));
  const hasDefault = live.some((p) => p.default !== undefined && p.default !== null);
  const rows = live.map((p) => {
    const label = p.required ? `${code(p.name)} (required)` : code(p.name);
    const def = p.default === undefined || p.default === null ? '—' : code(p.default);
    const desc = p.description ? cell(p.description) : '—';
    return hasDefault
      ? `| ${label} | ${code(p.type)} | ${def} | ${desc} |`
      : `| ${label} | ${code(p.type)} | ${desc} |`;
  });
  return [
    `{/* props: ${name} */}`,
    '',
    hasDefault ? '| Prop | Type | Default | Description |' : '| Prop | Type | Description |',
    hasDefault ? '| --- | --- | --- | --- |' : '| --- | --- | --- |',
    ...rows,
  ].join('\n');
}

function usageSection(name, spec, isLinkable, entry, section, description) {
  const u = spec?.usage;
  const lines = [`\`\`\`tsx\nimport { ${name} } from '${entry}';\n\`\`\``];
  // The page subtitle falls back to usage.when; don't print it twice.
  if (u?.when && readerText(u.when) !== description) lines.push(`**Use when:** ${prose(u.when)}`);
  if (u?.whenNot) lines.push(`**Not when:** ${prose(u.whenNot)}`);
  if (Array.isArray(u?.useInstead) && u.useInstead.length) {
    const items = u.useInstead.map((i) => {
      const ref = isLinkable(i.component)
        ? `[${i.component}](/docs/${section}/${componentSlug(i.component)})`
        : `\`${i.component}\``;
      return `- ${ref}: ${prose(i.reason)}`;
    });
    lines.push(`**Use instead:**\n\n${items.join('\n')}`);
  }
  return lines.join('\n\n');
}

function accessibilitySection(spec) {
  const parts = [];
  if (Array.isArray(spec?.keyboard) && spec.keyboard.length) {
    parts.push(
      [
        '### Keyboard',
        '',
        '| Keys | Effect |',
        '| --- | --- |',
        ...spec.keyboard.map((k) => `| ${code(k.keys)} | ${cell(k.effect)} |`),
      ].join('\n'),
    );
  }
  if (Array.isArray(spec?.a11yRules) && spec.a11yRules.length) {
    parts.push(
      [
        '### Requirements',
        '',
        ...spec.a11yRules.map((r) => `- ${prose(r.rule)}${r.required ? '' : ' (recommended)'}`),
      ].join('\n'),
    );
  }
  return parts.length ? parts.join('\n\n') : null;
}

/** Code notes that reach the manifest from JSDoc but say nothing to a reader. */
const INTERNAL_NOTE = /^tagged\b|\btagged here\b|\broot \+ parts\b|^\S+ root\./i;

/**
 * The page's one-line summary: the first sentence of the spec description,
 * minus a leading "Name —" prefix, capitalised. A JSDoc note written for
 * maintainers (Figma tagging, "root + parts") falls back to usage.when.
 * @param {string} name
 * @param {any} spec
 */
export function pageDescription(name, spec) {
  const clean = (text) =>
    String(text ?? '')
      .replace(/`/g, '')
      .replace(/\s*\n\s*/g, ' ')
      .trim();
  let text = clean(readerText(spec?.description))
    .replace(/<\/?[A-Za-z][^>]*>/g, '')
    .replace(/\s*\([^()]*\b(?:Tailwind|Radix|cva|sr-only)\b[^()]*\)/g, '')
    .replace(new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+[^\\w\\s]+\\s+`), '');
  if (!text || INTERNAL_NOTE.test(text)) text = clean(spec?.usage?.when);
  if (!text) return `${name} component.`;
  const [first] = text.split(
    /(?<!\b[eE]\.g\.|\b[iI]\.e\.|\betc\.|\bvs\.)(?<=[.!?])\s+(?=[A-Za-z])/,
  );
  return first.charAt(0).toUpperCase() + first.slice(1);
}

/**
 * @param {{ manifest: any, api: any, core: string[], providers?: string[], section?: string, entry?: string }} input
 *   section: the docs folder the pages live in (links between pages stay inside it);
 *   entry: the import specifier the Usage snippet shows.
 * @returns {Map<string, string>} slug -> MDX source
 */
export function buildComponentPages({
  manifest,
  api,
  core,
  providers = [],
  utilities = [],
  utilityPage = 'utilities',
  section = 'components',
  entry = '@hirobius/design-system',
}) {
  const specs = manifest?.componentSpecs ?? {};
  const shared = core.filter((n) => utilities.includes(n));
  const names = core.filter((n) => !providers.includes(n) && !utilities.includes(n));
  const pageSet = new Set(names);
  const isLinkable = (n) => pageSet.has(n);
  const pages = new Map();

  for (const name of names) {
    const spec = specs[name] ?? {};
    const description = pageDescription(name, spec);
    const related = [
      ...new Set((spec.usage?.useInstead ?? []).map((i) => i.component).filter(isLinkable)),
    ];
    const fm = [
      '---',
      `title: ${JSON.stringify(name)}`,
      `description: ${JSON.stringify(description)}`,
      `component: ${JSON.stringify(name)}`,
      'status: "stable"',
      ...(/^\d+\.\d+\.\d+$/.test(spec.since ?? '') ? [`since: ${JSON.stringify(spec.since)}`] : []),
      ...(related.length ? ['related:', ...related.map((r) => `  - ${JSON.stringify(r)}`)] : []),
      '---',
    ].join('\n');

    const a11y = accessibilitySection(spec);
    const sections = [
      fm,
      `## Live Preview\n\n{/* preview: ${name} */}`,
      `## Usage\n\n${usageSection(name, spec, isLinkable, entry, section, description)}`,
      `## Props & API\n\n${propsSection(name, api)}`,
      ...(a11y ? [`## Accessibility\n\n${a11y}`] : []),
      ...(spec.tokenMapping && Object.keys(spec.tokenMapping).length
        ? ['## Tokens Used\n\n{/* generated: tokens */}']
        : []),
      ...(related.length
        ? [
            `## Related Components\n\n${related
              .map((r) => `- [${r}](/docs/${section}/${componentSlug(r)})`)
              .join('\n')}`,
          ]
        : []),
    ];
    pages.set(componentSlug(name), `${sections.join('\n\n')}\n`);
  }
  if (shared.length) {
    const body = shared.map((name) => {
      const spec = specs[name] ?? {};
      const description = pageDescription(name, spec);
      return [
        `## ${name}`,
        prose(description),
        `{/* preview: ${name} */}`,
        usageSection(name, spec, isLinkable, entry, section, description),
        `### Props\n\n${propsSection(name, api)}`,
      ].join('\n\n');
    });
    const fm = [
      '---',
      'title: "Utilities"',
      `description: ${JSON.stringify(`Small helpers for layout and accessibility: ${shared.join(', ')}.`)}`,
      'status: "stable"',
      '---',
    ].join('\n');
    pages.set(utilityPage, `${[fm, ...body].join('\n\n')}\n`);
  }
  return pages;
}

/**
 * One pattern page per module the `/patterns` entry re-exports: the module's
 * PascalCase name is its primary component (`metric-tiles` -> MetricTiles), so
 * a new pattern module gets a page with no list to keep in sync.
 * @param {string} patternsSource  contents of src/patterns.ts
 * @returns {string[]}
 */
export function patternComponents(patternsSource) {
  return [...String(patternsSource).matchAll(/export \* from '\.\/app\/components\/([^']+)'/g)].map(
    ([, mod]) => mod.replace(/(^|-)([a-z])/g, (_, __, c) => c.toUpperCase()),
  );
}

/** The shared providers guide check-docs requires once components/ exists. */
export function buildProvidersGuide({ manifest, providers }) {
  const specs = manifest?.componentSpecs ?? {};
  const items = providers.map((n) => {
    const d = String(specs[n]?.description ?? '')
      .replace(new RegExp(`^${n}\\s+[-—–]\\s+`), '')
      .replace(/\s*\n\s*/g, ' ');
    return `### ${n}\n\n${prose(d || 'Provider.')}\n`;
  });
  return [
    '---',
    'title: "Providers"',
    'description: "Context providers an app mounts once: theme, router and toasts."',
    'status: "stable"',
    '---',
    '',
    ...items,
  ].join('\n');
}
