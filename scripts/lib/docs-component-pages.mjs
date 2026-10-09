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

/** One line, MDX-safe. Inline-code spans pass through; braces/angles outside them are escaped. */
function prose(text) {
  const oneLine = String(text ?? '')
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
  const rows = props.map((p) => {
    const label = p.required ? `${code(p.name)} (required)` : code(p.name);
    const def = p.default === undefined || p.default === null ? '—' : code(p.default);
    const desc = p.description ? cell(p.description) : '—';
    return `| ${label} | ${code(p.type)} | ${def} | ${desc} |`;
  });
  return [
    `{/* props: ${name} */}`,
    '',
    '| Prop | Type | Default | Description |',
    '| --- | --- | --- | --- |',
    ...rows,
  ].join('\n');
}

function usageSection(name, spec, isLinkable) {
  const u = spec?.usage;
  const lines = [`\`\`\`tsx\nimport { ${name} } from '@hirobius/design-system';\n\`\`\``];
  if (u?.when) lines.push(`**Use when:** ${prose(u.when)}`);
  if (u?.whenNot) lines.push(`**Not when:** ${prose(u.whenNot)}`);
  if (Array.isArray(u?.useInstead) && u.useInstead.length) {
    const items = u.useInstead.map((i) => {
      const ref = isLinkable(i.component)
        ? `[${i.component}](/docs/components/${componentSlug(i.component)})`
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
  let text = clean(spec?.description).replace(
    new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+[^\\w\\s]+\\s+`),
    '',
  );
  if (!text || INTERNAL_NOTE.test(text)) text = clean(spec?.usage?.when);
  if (!text) return `${name} component.`;
  const [first] = text.split(
    /(?<!\b[eE]\.g\.|\b[iI]\.e\.|\betc\.|\bvs\.)(?<=[.!?])\s+(?=[A-Za-z])/,
  );
  return first.charAt(0).toUpperCase() + first.slice(1);
}

/**
 * @param {{ manifest: any, api: any, core: string[], providers?: string[] }} input
 * @returns {Map<string, string>} slug -> MDX source
 */
export function buildComponentPages({ manifest, api, core, providers = [] }) {
  const specs = manifest?.componentSpecs ?? {};
  const names = core.filter((n) => !providers.includes(n));
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
      `## Usage\n\n${usageSection(name, spec, isLinkable)}`,
      `## Props & API\n\n${propsSection(name, api)}`,
      ...(a11y ? [`## Accessibility\n\n${a11y}`] : []),
      '## Tokens Used\n\n{/* generated: tokens */}',
      ...(related.length
        ? [
            `## Related Components\n\n${related
              .map((r) => `- [${r}](/docs/components/${componentSlug(r)})`)
              .join('\n')}`,
          ]
        : []),
    ];
    pages.set(componentSlug(name), `${sections.join('\n\n')}\n`);
  }
  return pages;
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
