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

/**
 * The props a page documents. Deprecated props still work for old code but are
 * documented in the upgrade guide, not offered to new code here.
 */
function liveProps(name, api) {
  const props = api?.components?.[name]?.props;
  if (!Array.isArray(props)) return [];
  return props.filter((p) => !/^@?deprecated\b/i.test(String(p.description ?? '').trim()));
}

/**
 * A collapsed section (`<details>`): one click away, still in the page for
 * search and for agents reading the Markdown. Markdown inside needs the blank
 * lines around it.
 */
const fold = (summary, body, variant = '') =>
  `<details className="hds-fold${variant ? ` hds-fold--${variant}` : ''}">\n<summary>${summary}</summary>\n\n${body}\n\n</details>`;

/** The import a reader copies, folded under the example as "Show code". */
const showCode = (name, entry) =>
  fold('Show code', `\`\`\`tsx\nimport { ${name} } from '${entry}';\n\`\`\``, 'code');

function propsSection(name, api) {
  const props = api?.components?.[name]?.props;
  if (!Array.isArray(props) || props.length === 0) {
    return '{/* props: TODO — source missing */}';
  }
  const live = liveProps(name, api);
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

/**
 * One short "Best practices" list from the usage contract: when to reach for
 * it, when not, and what to use instead. A `when` that the subtitle already
 * says is left out.
 */
function bestPractices(spec, isLinkable, section, description) {
  const u = spec?.usage;
  const items = [];
  if (u?.when && !readerText(u.when).startsWith(description)) items.push(prose(u.when));
  if (u?.whenNot) {
    const not = prose(u.whenNot);
    // "Not for navigating…", keeping a leading acronym or code span as written.
    items.push(`Not for ${/^[A-Z][a-z]/.test(not) ? not[0].toLowerCase() + not.slice(1) : not}`);
  }
  for (const i of Array.isArray(u?.useInstead) ? u.useInstead : []) {
    const ref = isLinkable(i.component)
      ? `[${i.component}](/docs/${section}/${componentSlug(i.component)})`
      : `\`${i.component}\``;
    items.push(`For ${prose(i.reason)}, use ${ref}.`);
  }
  return items.length ? items.map((t) => `- ${t}`).join('\n') : null;
}

function accessibilitySection(spec) {
  const parts = [];
  if (Array.isArray(spec?.keyboard) && spec.keyboard.length) {
    parts.push(
      [
        '**Keyboard**',
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
        '**Requirements**',
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
  // usage.when is written for readers; the JSDoc description is a code note.
  let text = clean(spec?.usage?.when);
  if (!text) {
    text = clean(readerText(spec?.description))
      .replace(/<\/?[A-Za-z][^>]*>/g, '')
      .replace(/\s*\([^()]*\b(?:Tailwind|Radix|cva|sr-only)\b[^()]*\)/g, '')
      .replace(new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+[^\\w\\s]+\\s+`), '');
    if (INTERNAL_NOTE.test(text)) text = '';
  }
  if (!text) return `${name} component.`;
  const [first] = text.split(
    /(?<!\b[eE]\.g\.|\b[iI]\.e\.|\betc\.|\bvs\.)(?<=[.!?])\s+(?=[A-Za-z])/,
  );
  return first.charAt(0).toUpperCase() + first.slice(1);
}

/**
 * @param {{ manifest: any, api: any, core: string[], providers?: string[], section?: string, entry?: string, sourceBase?: string }} input
 *   section: the docs folder the pages live in (links between pages stay inside it);
 *   entry: the import specifier the Usage snippet shows;
 *   sourceBase: blob URL a component's filePath is appended to for its Source link.
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
  sourceBase = '',
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
      // The status row under the subtitle: design and code, one click each.
      ...(spec.figmaUrl ? [`figma: ${JSON.stringify(spec.figmaUrl)}`] : []),
      ...(sourceBase && spec.filePath
        ? [`source: ${JSON.stringify(`${sourceBase}/${spec.filePath}`)}`]
        : []),
      '---',
    ].join('\n');

    const a11y = accessibilitySection(spec);
    const practices = bestPractices(spec, isLinkable, section, description);
    const propCount = liveProps(name, api).length;
    const sections = [
      fm,
      // Geist order: the example sits right under the subtitle, its code one click away.
      `{/* preview: ${name} */}`,
      showCode(name, entry),
      ...(practices ? [`## Best practices\n\n${practices}`] : []),
      fold(
        propCount ? `API · ${propCount} ${propCount === 1 ? 'prop' : 'props'}` : 'API',
        propsSection(name, api),
      ),
      ...(a11y ? [fold('Accessibility', a11y)] : []),
      ...(spec.tokenMapping && Object.keys(spec.tokenMapping).length
        ? [fold('Design tokens', '{/* generated: tokens */}')]
        : []),
    ];
    pages.set(componentSlug(name), `${sections.join('\n\n')}\n`);
  }
  if (shared.length) {
    const body = shared.map((name) => {
      const spec = specs[name] ?? {};
      const description = pageDescription(name, spec);
      const practices = bestPractices(spec, isLinkable, section, description);
      const propCount = liveProps(name, api).length;
      return [
        `## ${name}`,
        prose(description),
        `{/* preview: ${name} */}`,
        showCode(name, entry),
        ...(practices ? [practices] : []),
        fold(`API · ${propCount} ${propCount === 1 ? 'prop' : 'props'}`, propsSection(name, api)),
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
    const d = String(specs[n]?.usage?.when ?? specs[n]?.description ?? '')
      .replace(new RegExp(`^${n}\\s+[-—–]\\s+`), '')
      .replace(/\s*\n\s*/g, ' ');
    return `### ${n}\n\n${prose(d || 'Provider.')}\n`;
  });
  return [
    '---',
    'title: "Providers"',
    'description: "Wrappers an app adds once, near the root: theme, router and toasts."',
    'status: "stable"',
    '---',
    '',
    ...items,
  ].join('\n');
}
