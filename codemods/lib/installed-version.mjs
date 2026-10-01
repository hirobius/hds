/**
 * installed-version — which @hirobius/design-system each importer has installed
 * (hds#453; the upgrade command in hds#452 reuses it).
 *
 * Everything here takes lockfile TEXT and returns plain data, so the same code
 * reads a lockfile from disk, from `git show HEAD:<lockfile>` or from the GitHub
 * contents API. Node builtins only: it runs on consumer machines.
 *
 *   readLockfile('pnpm-lock.yaml', text)
 *   → { kind: 'pnpm', version: '9.0',
 *       importers: { '.': '0.16.0', 'apps/site': '0.20.0' },
 *       versions: ['0.16.0', '0.20.0'] }
 *
 * `importers` maps each importer that declares the package (the repo root is
 * '.', a workspace is its directory) to the version the lockfile resolves for
 * it. `versions` is every distinct version the lockfile holds, transitive
 * copies included, oldest first: more than one means two copies of HDS.
 */

export const HDS_PACKAGE = '@hirobius/design-system';

// ── tiny YAML subset ─────────────────────────────────────────────────────────
// pnpm lockfiles are block mappings of scalars. List items, flow collections
// and comments are kept as plain strings or skipped; nothing here needs them.

function unquote(value) {
  const v = value.trim();
  if (v.length >= 2 && (v[0] === "'" || v[0] === '"') && v.at(-1) === v[0]) {
    return v[0] === "'" ? v.slice(1, -1).replace(/''/g, "'") : v.slice(1, -1);
  }
  return v;
}

/** Split `key: value` (the key may be quoted and contain colons). */
function splitKey(line) {
  if (line[0] === "'" || line[0] === '"') {
    const quote = line[0];
    let i = 1;
    while (i < line.length) {
      if (line[i] === quote) {
        if (quote === "'" && line[i + 1] === "'") {
          i += 2;
          continue;
        }
        break;
      }
      i += 1;
    }
    if (line[i + 1] !== ':') return null;
    return { key: unquote(line.slice(0, i + 1)), rest: line.slice(i + 2).trim() };
  }
  const m = /^([^:]+?):(?:\s+(.*))?$/.exec(line);
  return m ? { key: m[1].trim(), rest: (m[2] ?? '').trim() } : null;
}

/** Nested plain objects from an indentation-structured YAML mapping. */
function parseYamlMap(text) {
  const root = {};
  const stack = [{ indent: -1, node: root }];
  for (const raw of text.split(/\r?\n/)) {
    const content = raw.trimStart();
    if (!content || content.startsWith('#') || content.startsWith('- ')) continue;
    const indent = raw.length - content.length;
    const kv = splitKey(content);
    if (!kv) continue;
    while (stack.length > 1 && stack.at(-1).indent >= indent) stack.pop();
    const parent = stack.at(-1).node;
    if (kv.rest === '') {
      const child = {};
      parent[kv.key] = child;
      stack.push({ indent, node: child });
    } else {
      parent[kv.key] = unquote(kv.rest);
    }
  }
  return root;
}

// ── versions ─────────────────────────────────────────────────────────────────

const SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

function compareVersions(a, b) {
  const [coreA, preA = ''] = a.split('-');
  const [coreB, preB = ''] = b.split('-');
  const na = coreA.split('.').map(Number);
  const nb = coreB.split('.').map(Number);
  for (let i = 0; i < 3; i += 1) if (na[i] !== nb[i]) return na[i] - nb[i];
  if (preA === preB) return 0;
  if (!preA) return 1;
  if (!preB) return -1;
  return preA < preB ? -1 : 1;
}

function distinctSorted(list) {
  return [...new Set(list.filter((v) => v && SEMVER.test(v)))].sort(compareVersions);
}

// ── pnpm (lockfile v6 and v9) ────────────────────────────────────────────────

const IMPORTER_FIELDS = ['dependencies', 'devDependencies', 'optionalDependencies'];

/** `0.16.0(react@18.3.1)`, `/@x/y@0.16.0(…)` or v5's `0.16.0_react@18` → `0.16.0`. */
function pnpmVersion(ref, name) {
  if (typeof ref !== 'string') return null;
  let v = ref.replace(/^\//, '');
  if (v.startsWith(`${name}@`)) v = v.slice(name.length + 1);
  v = v.replace(/\(.*$/, '').replace(/_.*$/, '');
  return SEMVER.test(v) ? v : null;
}

function parsePnpm(text, name) {
  const doc = parseYamlMap(text);
  // v9 (and multi-package v6) list importers; a single-package v6 lockfile
  // keeps the root's dependencies at the top level.
  const importerMap =
    doc.importers && typeof doc.importers === 'object' ? doc.importers : { '.': doc };
  const importers = {};
  for (const [dir, entry] of Object.entries(importerMap)) {
    for (const field of IMPORTER_FIELDS) {
      const dep = entry?.[field]?.[name];
      if (dep === undefined) continue;
      importers[dir] = pnpmVersion(typeof dep === 'object' ? dep.version : dep, name);
      break;
    }
  }
  const found = [];
  for (const section of ['packages', 'snapshots']) {
    for (const key of Object.keys(doc[section] ?? {})) {
      const bare = key.replace(/^\//, '');
      if (bare.startsWith(`${name}@`)) found.push(pnpmVersion(bare, name));
    }
  }
  found.push(...Object.values(importers));
  return {
    kind: 'pnpm',
    version: String(doc.lockfileVersion ?? ''),
    importers,
    versions: distinctSorted(found),
  };
}

// ── npm (package-lock.json / npm-shrinkwrap.json v2 and v3) ──────────────────

const DECLARING_FIELDS = [...IMPORTER_FIELDS, 'peerDependencies'];

const declares = (entry, name) => DECLARING_FIELDS.some((f) => entry?.[f]?.[name] !== undefined);

/** Node's lookup from `dir` upward: dir/node_modules/<name>, then each parent's. */
function npmLookup(packages, dir, name) {
  const parts = dir ? dir.split('/') : [];
  for (let i = parts.length; i >= 0; i -= 1) {
    const base = parts.slice(0, i).join('/');
    let entry = packages[`${base ? `${base}/` : ''}node_modules/${name}`];
    if (entry?.link && typeof entry.resolved === 'string') entry = packages[entry.resolved];
    if (entry?.version) return entry.version;
  }
  return null;
}

function parseNpm(text, name) {
  const doc = JSON.parse(text);
  const packages = doc.packages ?? {};
  const importers = {};
  const found = [];
  for (const [key, entry] of Object.entries(packages)) {
    if (key === `node_modules/${name}` || key.endsWith(`/node_modules/${name}`)) {
      found.push(entry?.version);
    } else if (!key.split('/').includes('node_modules') && declares(entry, name)) {
      importers[key || '.'] = npmLookup(packages, key, name);
    }
  }
  return {
    kind: 'npm',
    version: String(doc.lockfileVersion ?? ''),
    importers,
    versions: distinctSorted(found),
  };
}

// ── yarn (v1 and berry) ──────────────────────────────────────────────────────

const descriptorsOf = (key) => key.split(/,\s*/).map(unquote);

/** v1 is not YAML: `"a@^1", a@~1.2:` headers over `  version "1.2.3"` bodies. */
function yarnV1Entries(text) {
  const entries = [];
  let current = null;
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim() || line.startsWith('#')) continue;
    if (!/^\s/.test(line) && line.trimEnd().endsWith(':')) {
      current = { descriptors: descriptorsOf(line.trimEnd().slice(0, -1)), version: null };
      entries.push(current);
    } else if (current && /^ {2}version /.test(line)) {
      current.version = unquote(line.trim().slice('version '.length));
    }
  }
  return entries;
}

function berryEntries(doc) {
  return Object.entries(doc)
    .filter(([key]) => key !== '__metadata')
    .map(([key, entry]) => ({ descriptors: descriptorsOf(key), ...entry }));
}

function parseYarn(text, name, ranges) {
  const berry = /^__metadata:/m.test(text);
  const doc = berry ? parseYamlMap(text) : null;
  const entries = berry ? berryEntries(doc) : yarnV1Entries(text);
  const resolve = (range) => {
    const wanted = [`${name}@${range}`, `${name}@npm:${range}`];
    return entries.find((e) => wanted.some((d) => e.descriptors.includes(d)))?.version ?? null;
  };
  const importers = {};
  if (berry) {
    // Berry records each workspace as `<name>@workspace:<dir>` with its own deps.
    for (const entry of entries) {
      const ws = /@workspace:(.*)$/.exec(entry.resolution ?? '');
      if (!ws) continue;
      const range = DECLARING_FIELDS.map((f) => entry[f]?.[name]).find((r) => r !== undefined);
      if (range !== undefined) importers[ws[1] || '.'] = resolve(range);
    }
  } else {
    // v1 records no workspaces, so each importer's declared range is the key.
    for (const [dir, range] of Object.entries(ranges)) importers[dir] = resolve(range);
  }
  const found = entries
    .filter((e) => e.descriptors.some((d) => d.startsWith(`${name}@`)))
    .map((e) => e.version);
  return {
    kind: 'yarn',
    version: berry ? String(doc.__metadata?.version ?? '') : 'v1',
    importers,
    versions: distinctSorted(found),
  };
}

// ── bun (text bun.lock; the binary bun.lockb is not readable here) ───────────

/** JSON.parse after dropping the trailing commas bun writes (strings left alone). */
function parseTrailingCommaJson(text) {
  const closes = /\s*[}\]]/y;
  const kept = [];
  let from = 0;
  let inString = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (inString) {
      if (ch === '\\') i += 1;
      else if (ch === '"') inString = false;
    } else if (ch === '"') {
      inString = true;
    } else if (ch === ',') {
      closes.lastIndex = i + 1;
      if (closes.test(text)) {
        kept.push(text.slice(from, i));
        from = i + 1;
      }
    }
  }
  kept.push(text.slice(from));
  return JSON.parse(kept.join(''));
}

function parseBun(text, name) {
  const doc = parseTrailingCommaJson(text);
  const packages = doc.packages ?? {};
  const versionAt = (key) => {
    const ident = Array.isArray(packages[key]) ? packages[key][0] : null;
    return typeof ident === 'string' && ident.startsWith(`${name}@`)
      ? ident.slice(name.length + 1)
      : null;
  };
  const importers = {};
  for (const [dir, ws] of Object.entries(doc.workspaces ?? {})) {
    if (!declares(ws, name)) continue;
    // A copy only this workspace uses is keyed under its package name.
    const keys = [ws.name && `${ws.name}/${name}`, dir && `${dir}/${name}`, name].filter(Boolean);
    importers[dir || '.'] = keys.map(versionAt).find(Boolean) ?? null;
  }
  const found = Object.keys(packages)
    .filter((key) => key === name || key.endsWith(`/${name}`))
    .map(versionAt);
  return {
    kind: 'bun',
    version: String(doc.lockfileVersion ?? ''),
    importers,
    versions: distinctSorted(found),
  };
}

// ── which lockfile ───────────────────────────────────────────────────────────

/** Readable lockfiles by package manager, in the order each manager reads them. */
const LOCKFILES_BY_MANAGER = {
  pnpm: ['pnpm-lock.yaml'],
  npm: ['npm-shrinkwrap.json', 'package-lock.json'],
  yarn: ['yarn.lock'],
  bun: ['bun.lock'],
};

/** The package manager that writes a lockfile name, or null for any other file. */
export function lockfileKind(fileName) {
  const entry = Object.entries(LOCKFILES_BY_MANAGER).find(([, files]) => files.includes(fileName));
  return entry ? entry[0] : null;
}

/**
 * The lockfile to read among the files at a project root, or null. With more
 * than one present, package.json's `packageManager` (`yarn@4.5.0`) decides;
 * otherwise pnpm, then npm, then yarn, then bun.
 *
 * @param {Iterable<string>} fileNames base names of the files at the root
 * @param {string} [packageManager] package.json `packageManager`, if any
 * @returns {string|null}
 */
export function pickLockfile(fileNames, packageManager) {
  const present = new Set(fileNames);
  const preferred = String(packageManager ?? '').split('@')[0];
  const order = [
    ...(LOCKFILES_BY_MANAGER[preferred] ?? []),
    ...Object.values(LOCKFILES_BY_MANAGER).flat(),
  ];
  return order.find((file) => present.has(file)) ?? null;
}

// ── dispatch ─────────────────────────────────────────────────────────────────

const READERS = {
  'bun.lock': parseBun,
  'pnpm-lock.yaml': parsePnpm,
  'package-lock.json': parseNpm,
  'npm-shrinkwrap.json': parseNpm,
  'yarn.lock': parseYarn,
};

/**
 * Read one lockfile.
 *
 * @param {string} fileName the lockfile's base name (pnpm-lock.yaml, …)
 * @param {string} text the lockfile's contents
 * @param {{ name?: string, ranges?: Record<string, string> }} [options]
 *   `name`: the package to resolve (default HDS). `ranges`: importer directory
 *   → the range its package.json declares. Only yarn v1 needs it, because that
 *   lockfile records no importers; every other format ignores it.
 * @returns {{ kind: string, version: string, importers: Record<string, string|null>, versions: string[] }}
 */
export function readLockfile(fileName, text, { name = HDS_PACKAGE, ranges = {} } = {}) {
  const reader = READERS[fileName];
  if (!reader) throw new Error(`Unsupported lockfile: ${fileName}`);
  return reader(String(text), name, ranges);
}
