/**
 * The facts on the Start here page (a two-minute tour for a hiring manager), read when the site
 * builds: public/hds-stats.json for the numbers, and the repo's own token, CSS, Figma snapshot and
 * component files for the worked example. The page holds no hand-typed counts or values.
 *
 * Fields that a later stats generator adds (codeConnect, figmaParity) may not be in the file
 * yet. Each row is built only from the fields that exist and are complete; a missing one is
 * left out, never printed as "undefined".
 */

export interface StatRow {
  id: string;
  label: string;
  value: string;
  detail?: string;
}

type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj | undefined =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Obj) : undefined;
const num = (v: unknown): number | undefined =>
  typeof v === 'number' && Number.isFinite(v) ? v : undefined;
const str = (v: unknown): string | undefined => (typeof v === 'string' && v ? v : undefined);
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export function startHereStats(stats: unknown): StatRow[] {
  const s = obj(stats) ?? {};
  const rows: StatRow[] = [];
  const add = (row: StatRow | undefined) => row && rows.push(row);

  const version = str(s.version);
  add(version ? { id: 'version', label: 'Version', value: version } : undefined);

  const components = obj(s.components);
  const core = num(components?.core);
  const patterns = num(components?.patterns);
  add(
    core !== undefined && patterns !== undefined
      ? {
          id: 'components',
          label: 'Components',
          value: `${plural(core, 'core component')}, ${plural(patterns, 'pattern')}`,
        }
      : undefined,
  );

  const tokens = num(obj(s.tokens)?.total);
  add(
    tokens !== undefined ? { id: 'tokens', label: 'Design tokens', value: `${tokens}` } : undefined,
  );

  const contrast = obj(s.contrast);
  const text = num(contrast?.textPairs);
  const nonText = num(contrast?.nonTextPairs);
  add(
    text !== undefined && nonText !== undefined
      ? {
          id: 'contrast',
          label: 'Contrast pairs checked',
          value: plural(text + nonText, 'pair'),
          detail: 'Light and dark, against WCAG AA',
        }
      : undefined,
  );

  const sync = obj(s.figmaSync);
  const synced = num(sync?.synced);
  const total = num(sync?.total);
  add(
    synced !== undefined && total !== undefined
      ? {
          id: 'figmaSync',
          label: 'Components in sync with Figma',
          value: `${synced} of ${total}`,
        }
      : undefined,
  );

  const templates = num(obj(s.codeConnect)?.templates);
  add(
    templates !== undefined
      ? {
          id: 'codeConnect',
          label: 'Code Connect templates',
          value: plural(templates, 'template'),
        }
      : undefined,
  );

  const parity = obj(s.figmaParity);
  const percent = num(parity?.percent);
  const passed = num(parity?.passed);
  const checked = num(parity?.total);
  const readOn = str(parity?.readOn);
  add(
    percent !== undefined && passed !== undefined && checked !== undefined
      ? {
          id: 'figmaParity',
          label: 'Figma and code parity',
          value: `${percent}% (${passed} of ${checked} checks)`,
          detail: readOn ? `Read on ${readOn}` : undefined,
        }
      : undefined,
  );

  const consumers = obj(s.consumers);
  const apps = num(consumers?.productApps);
  const sites = num(consumers?.tokenLevelSites);
  add(
    apps !== undefined && sites !== undefined
      ? {
          id: 'consumers',
          label: 'In use',
          value: `${plural(apps, 'product app')}, ${plural(sites, 'site')} on the tokens only`,
        }
      : undefined,
  );

  return rows;
}

export interface TokenFlowSources {
  /** hirobius.tokens.json */
  tokens: unknown;
  /** src/styles/tokens.generated.css */
  generatedCss: string;
  /** figma/snapshot.json */
  snapshot: unknown;
  /** Component source files, for finding one that reads the token. */
  components: { file: string; text: string }[];
}

export interface TokenFlow {
  path: string;
  cssVar: string;
  light: string;
  dark: string;
  cssLight: string;
  cssDark: string;
  reactFile: string;
  figma: string;
}

/**
 * One token followed through the pipeline: its entry in the source file, the CSS variable lines
 * generated from it (light, then dark), a component that reads the variable, and its variable in
 * the committed Figma snapshot. Throws when any hop is missing, so the build fails instead of the
 * page describing a flow the repo no longer has.
 */
export function tokenFlow(sources: TokenFlowSources, path: string): TokenFlow {
  const fail = (what: string): never => {
    throw new Error(`Start here: ${path} ${what}`);
  };

  const node = path.split('.').reduce<unknown>((n, key) => obj(n)?.[key], sources.tokens);
  const entry = obj(node) ?? fail('is not in hirobius.tokens.json');
  const modes = obj(obj(obj(entry.$extensions)?.['com.figma.variables'])?.modes);
  const light = str(modes?.Light) ?? str(entry.$value) ?? fail('has no light value');
  const dark = str(modes?.Dark) ?? fail('has no dark value');

  const cssVar = `--${path.replace(/\./g, '-')}`;
  const lines = sources.generatedCss
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith(`${cssVar}:`));
  const cssLight = lines[0] ?? fail('has no CSS variable in tokens.generated.css');
  const cssDark = lines[1] ?? fail('has no dark CSS variable in tokens.generated.css');

  const reactFile =
    sources.components.find((c) => c.text.includes(`var(${cssVar})`))?.file ??
    fail('is read by no component');

  const snap = obj(sources.snapshot);
  const collections = (obj(snap?.snapshot) ?? snap)?.collections;
  let figma: string | undefined;
  for (const c of Array.isArray(collections) ? collections : []) {
    const variables = obj(c)?.variables;
    const hit = (Array.isArray(variables) ? variables : []).map(obj).find((v) => v?.path === path);
    if (hit) figma = `${str(obj(c)?.name)}: ${str(hit.name)}`;
  }

  return {
    path,
    cssVar,
    light,
    dark,
    cssLight,
    cssDark,
    reactFile,
    figma: figma ?? fail('is not in figma/snapshot.json'),
  };
}
