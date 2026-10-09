#!/usr/bin/env node
/**
 * check-docs.mjs — deterministic guardrails for the Fumadocs MDX surface.
 *
 * content-model.md states the rules in prose ("NEVER hand-write token
 * tables", "MUST adhere to the frontmatter schema"). Prose can be
 * disobeyed; this checker cannot. It enforces, mechanically:
 *
 *   1. Component membership — every page under components/ names a member
 *      of CORE_COMPONENTS (scripts/lib/core-components.mjs), and every page
 *      under patterns/ a module src/patterns.ts re-exports. Removed and
 *      deprecated names (StatusDot, AppShell, …) are not in that list, so
 *      they can never become live pages; they belong only in
 *      guides/deprecation.mdx. (content-model Rule 4)
 *   2. No hand-written color values — hex/rgb/hsl literals in MDX prose
 *      (outside code fences and inline code) fail. Token tables are
 *      generated behind the generated-tokens marker. (Rule 1)
 *   3. Frontmatter schema — required keys, status enum, semver `since`,
 *      no unknown keys. `related` entries must be core component names
 *      or resolvable /docs routes — stale names (IconButton, Callout)
 *      fail here instead of rotting. (§1)
 *   4. Completeness — every core component has a page, and the three
 *      providers are accounted for by guides/providers.mdx. Armed once
 *      content/docs/components/ exists; skipped with a notice before
 *      that, so this gate can land ahead of the content.
 *   5. Internal links resolve — /docs/** routes and relative links must
 *      point at real pages.
 *   6. Build markers — component pages carry a preview marker and a
 *      props marker (or the explicit props-TODO marker); component and
 *      foundation pages carry the generated-tokens marker. (Rules 1–3)
 *
 * Generation still beats validation where the build generates for real
 * (token tables, llms.txt); this checker guards the seams.
 *
 * Usage: node scripts/check-docs.mjs [--root <dir>] [--json]
 *   --root  Directory holding content/docs (default: repo root).
 * Zero dependencies. Exit 1 on any violation.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const rootFlag = args.indexOf('--root');
const root = rootFlag >= 0 ? resolve(args[rootFlag + 1]) : resolve(scriptDir, '..');
const asJson = args.includes('--json');

const rules = JSON.parse(readFileSync(join(scriptDir, 'docs-rules.json'), 'utf8'));
const { CORE_COMPONENTS } = await import(
  pathToFileURL(join(scriptDir, 'lib', 'core-components.mjs')).href
);
const core = new Set(CORE_COMPONENTS);
// Pattern pages (content/docs/patterns/) document the modules the /patterns
// entry re-exports, read from the repo's own src/patterns.ts.
const { patternComponents } = await import(
  pathToFileURL(join(scriptDir, 'lib', 'docs-component-pages.mjs')).href
);
const patterns = new Set(
  patternComponents(readFileSync(join(scriptDir, '..', 'src', 'patterns.ts'), 'utf8')),
);
const documented = new Set([...core, ...patterns]);
const providers = new Set(rules.providerComponents);

const errors = [];
const err = (file, line, check, message) => errors.push({ file, line, check, message });

const slugToName = (slug) =>
  rules.slugExceptions[slug] ??
  slug
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.mdx?$/.test(entry)) out.push(full);
  }
  return out;
}

/** Minimal YAML-subset frontmatter parser: scalars + string lists. */
function parseFrontmatter(source, file) {
  if (!source.startsWith('---\n') && !source.startsWith('---\r\n')) {
    err(file, 1, 'frontmatter', 'missing frontmatter block');
    return null;
  }
  const end = source.indexOf('\n---', 3);
  if (end === -1) {
    err(file, 1, 'frontmatter', 'unterminated frontmatter block');
    return null;
  }
  const body = source.slice(0, end + 4);
  const data = {};
  let listKey = null;
  for (const rawLine of body.split('\n').slice(1, -1)) {
    const line = rawLine.replace(/\s+#.*$/, '');
    if (!line.trim()) continue;
    const item = line.match(/^\s+-\s+(.+)$/);
    if (item && listKey) {
      data[listKey].push(unquote(item[1].trim()));
      continue;
    }
    const field = line.match(/^([A-Za-z][A-Za-z0-9_-]*):\s*(.*)$/);
    if (!field) {
      err(file, 1, 'frontmatter', `unparseable frontmatter line: ${rawLine.trim()}`);
      continue;
    }
    const [, key, value] = field;
    listKey = null;
    if (value.startsWith('[') && value.endsWith(']')) {
      data[key] = value
        .slice(1, -1)
        .split(',')
        .map((v) => unquote(v.trim()))
        .filter(Boolean);
    } else if (value === '') {
      data[key] = [];
      listKey = key;
    } else {
      data[key] = unquote(value);
    }
  }
  return { data, bodyLines: body.split('\n').length };
}

const unquote = (v) =>
  (v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))
    ? v.slice(1, -1)
    : v;

/** Blank out fenced code blocks and inline code so prose checks skip them. */
function stripCode(source) {
  const lines = source.split('\n');
  let inFence = false;
  return lines
    .map((line) => {
      if (/^\s*(```|~~~)/.test(line)) {
        inFence = !inFence;
        return '';
      }
      if (inFence) return '';
      return line.replace(/`[^`]*`/g, (m) => ' '.repeat(m.length));
    })
    .join('\n');
}

const contentDir = join(root, rules.contentRoot);
const files = walk(contentDir);
const rel = (f) => relative(root, f).split(sep).join('/');

// Route set for link resolution: content/docs/a/b.mdx -> /docs/a/b
const routes = new Set(['/docs']);
for (const f of files) {
  let route =
    '/docs/' +
    relative(contentDir, f)
      .split(sep)
      .join('/')
      .replace(/\.mdx?$/, '');
  if (route.endsWith('/index')) route = route.slice(0, -'/index'.length);
  routes.add(route);
}

function checkFrontmatter(file, fm) {
  const { data } = fm;
  for (const key of rules.requiredFrontmatterKeys) {
    if (
      data[key] === undefined ||
      data[key] === '' ||
      (Array.isArray(data[key]) && data[key].length === 0)
    ) {
      err(file, 1, 'frontmatter', `missing required frontmatter key: ${key}`);
    }
  }
  for (const key of Object.keys(data)) {
    if (!rules.allowedFrontmatterKeys.includes(key)) {
      err(
        file,
        1,
        'frontmatter',
        `unknown frontmatter key: ${key} (allowed: ${rules.allowedFrontmatterKeys.join(', ')})`,
      );
    }
  }
  if (data.status !== undefined && !rules.statusEnum.includes(data.status)) {
    err(
      file,
      1,
      'frontmatter',
      `status "${data.status}" not in enum: ${rules.statusEnum.join(' | ')}`,
    );
  }
  if (data.since !== undefined && !/^\d+\.\d+\.\d+$/.test(String(data.since))) {
    err(file, 1, 'frontmatter', `since "${data.since}" is not a semver (x.y.z)`);
  }
  if (data.component !== undefined && !documented.has(String(data.component))) {
    err(
      file,
      1,
      'membership',
      `frontmatter component "${data.component}" is not in CORE_COMPONENTS or the /patterns entry — removed/deprecated names live only in ${rules.deprecationGuide}`,
    );
  }
  if (Array.isArray(data.related)) {
    for (const entry of data.related) {
      const name = String(entry);
      if (name.startsWith('/')) {
        if (!routes.has(name.replace(/\/$/, ''))) {
          err(file, 1, 'links', `related route "${name}" does not resolve to a docs page`);
        }
      } else if (!documented.has(name)) {
        err(
          file,
          1,
          'membership',
          `related "${name}" is not a core component, a pattern or a /docs route (stale name?)`,
        );
      }
    }
  }
}

function checkColors(file, proseLines, lineOffset) {
  const patterns = [
    { re: /#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{8}\b/, label: 'hex color' },
    // Short hex needs a letter: all-digit #497 is an issue reference, not a color.
    { re: /[:\s(=]#(?=[0-9]*[a-fA-F])[0-9a-fA-F]{3,4}\b/, label: 'hex color' },
    { re: /\brgba?\s*\(/, label: 'rgb() color' },
    { re: /\bhsla?\s*\(/, label: 'hsl() color' },
  ];
  proseLines.forEach((line, i) => {
    // Blank link destinations so URL anchors (e.g. #decade) don't false-positive.
    const scanned = line.replace(/\]\([^)]*\)/g, (m) => ' '.repeat(m.length));
    for (const { re, label } of patterns) {
      if (re.test(scanned)) {
        err(
          file,
          i + lineOffset + 1,
          'colors',
          `hand-written ${label} in prose — token tables are generated (${rules.markers.tokens}); see content-model Rule 1`,
        );
        break;
      }
    }
  });
}

function checkLinks(file, prose) {
  const linkRe = /\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
  let m;
  while ((m = linkRe.exec(prose)) !== null) {
    const target = m[1];
    if (/^(https?:|mailto:|tel:)/.test(target)) continue;
    const [pathPart] = target.split('#');
    if (pathPart === '') continue;
    if (pathPart.startsWith('/docs')) {
      if (!routes.has(pathPart.replace(/\/$/, '') || '/docs')) {
        err(file, null, 'links', `internal link "${target}" does not resolve to a docs page`);
      }
    } else if (!pathPart.startsWith('/')) {
      const base = resolve(dirname(file), pathPart);
      const candidates = [
        `${base}.mdx`,
        `${base}.md`,
        join(base, 'index.mdx'),
        join(base, 'index.md'),
      ];
      if (!candidates.some((c) => existsSync(c))) {
        err(file, null, 'links', `relative link "${target}" does not resolve to a file`);
      }
    }
  }
}

const componentsDir = join(contentDir, 'components');
const componentsArmed = existsSync(componentsDir);
const seenComponentPages = new Set();

for (const file of files) {
  const r = rel(file);
  const source = readFileSync(file, 'utf8');
  const fm = parseFrontmatter(source, r);
  if (fm) checkFrontmatter(r, fm);

  const proseSource = stripCode(source);
  const proseLines = proseSource.split('\n');
  // Skip the frontmatter block for prose checks.
  const bodyStart = fm ? fm.bodyLines : 0;
  checkColors(r, proseLines.slice(bodyStart), bodyStart);
  checkLinks(r, proseSource);

  const inDir = (d) => r.startsWith(`${rules.contentRoot}/${d}/`);
  if (inDir('patterns')) {
    const name = slugToName(
      r
        .split('/')
        .pop()
        .replace(/\.mdx?$/, ''),
    );
    if (!patterns.has(name)) {
      err(
        r,
        1,
        'membership',
        `pattern page maps to "${name}", which src/patterns.ts does not export`,
      );
    } else if (!source.includes(`{/* preview: ${name} */}`)) {
      err(r, null, 'markers', `missing live preview marker {/* preview: ${name} */}`);
    }
  }
  if (inDir('components')) {
    const slug = r
      .split('/')
      .pop()
      .replace(/\.mdx?$/, '');
    const name = slugToName(slug);
    seenComponentPages.add(name);
    if (!core.has(name)) {
      err(
        r,
        1,
        'membership',
        `component page "${slug}" maps to "${name}", which is not in CORE_COMPONENTS — removed/deprecated components are documented only in ${rules.deprecationGuide} (content-model Rule 4)`,
      );
    } else if (fm && String(fm.data.component ?? '') !== name) {
      err(
        r,
        1,
        'membership',
        `frontmatter component must be "${name}" on its page (found: ${fm?.data.component ?? 'missing'})`,
      );
    }
    if (!source.includes(`{/* preview: ${name} */}`)) {
      err(
        r,
        null,
        'markers',
        `missing live preview marker {/* preview: ${name} */} (content-model Rule 3)`,
      );
    }
    if (
      !source.includes(`{/* props: ${name} */}`) &&
      !source.includes(rules.markers.propsTodoPrefix)
    ) {
      err(
        r,
        null,
        'markers',
        `missing props marker {/* props: ${name} */} or the explicit ${rules.markers.propsTodoPrefix} … */} (content-model Rule 2 — never invent props)`,
      );
    }
    if (!source.includes(rules.markers.tokens)) {
      err(
        r,
        null,
        'markers',
        `missing generated tokens marker ${rules.markers.tokens} (content-model Rule 1)`,
      );
    }
  }
  if (inDir('foundations') && !source.includes(rules.markers.tokens)) {
    err(
      r,
      null,
      'markers',
      `foundation page missing generated tokens marker ${rules.markers.tokens} (content-model Rule 1)`,
    );
  }
}

if (componentsArmed) {
  const expected = CORE_COMPONENTS.filter((n) => !providers.has(n));
  const missing = expected.filter((n) => !seenComponentPages.has(n));
  for (const name of missing) {
    err(
      `${rules.contentRoot}/components/`,
      null,
      'completeness',
      `core component "${name}" has no page (expected components/${name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()}.mdx)`,
    );
  }
  const providerGuidePath = join(contentDir, rules.providerGuide);
  if (!existsSync(providerGuidePath)) {
    err(
      `${rules.contentRoot}/${rules.providerGuide}`,
      null,
      'completeness',
      `providers (${[...providers].join(', ')}) must be accounted for by ${rules.providerGuide} — one shared providers guide, not separate pages`,
    );
  }
}

if (asJson) {
  console.log(
    JSON.stringify({ ok: errors.length === 0, filesChecked: files.length, errors }, null, 2),
  );
} else if (errors.length === 0) {
  console.log(
    `check-docs: OK — ${files.length} MDX file(s) under ${rules.contentRoot}` +
      (componentsArmed ? '' : ' (components/ not present yet — completeness armed when it lands)'),
  );
} else {
  console.error(`check-docs: ${errors.length} violation(s):`);
  for (const e of errors) {
    console.error(`  ${e.file}${e.line ? `:${e.line}` : ''} [${e.check}] ${e.message}`);
  }
}
process.exit(errors.length === 0 ? 0 : 1);
