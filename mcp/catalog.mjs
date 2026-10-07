/**
 * The `hds` MCP server's tools, built from the data the package already ships.
 *
 * Interface: `loadCatalog(packageRoot)` returns `{ instructions, tools }`, where
 * each tool is `{ name, description, inputSchema, run(args) }` and `run` returns
 * a plain object the server serialises. Every result is kept under RESULT_BUDGET
 * bytes as it travels (the JSON text, escaped again inside the JSON-RPC
 * response line): an agent asks a narrow question and gets a narrow answer, never
 * the 400 KB manifest.
 *
 * Sources, all inside the installed package:
 *   src/app/data/component-api.json      props, descriptions, usage contracts
 *   public/hds-manifest.json             compound parts, keyboard, tokens (cssVar, light/dark values)
 *   codemods/patterns-subpath.names.json which names import from /patterns
 *   mcp/guide.mjs                        which component answers which need
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { HOOKS, INTENTS, coreComponents } from './guide.mjs';

export const RESULT_BUDGET = 1900;

/** Bytes a result costs inside a tools/call response: its JSON, escaped as a string. */
const bytes = (value) => Buffer.byteLength(JSON.stringify(JSON.stringify(value)));

const ROOT_IMPORT = '@hirobius/design-system';

const STOPWORDS = new Set(
  'a an and as at by for from in into is it of on or the to with without show use'.split(' '),
);

const readJson = (root, rel) => JSON.parse(readFileSync(join(root, rel), 'utf8'));

const words = (text) =>
  String(text ?? '')
    .toLowerCase()
    .split(/[^a-z0-9.]+/)
    .filter((w) => w && !STOPWORDS.has(w));

function firstSentence(text = '', max = 160) {
  const flat = String(text).replace(/\s+/g, ' ').trim();
  const m = /^(.+?[.!?])(?=\s|$)/.exec(flat);
  const s = m ? m[1] : flat;
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

/** Levenshtein distance, for "did you mean" on a misspelt component name. */
function editDistance(a, b) {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i += 1) {
    const cur = [i];
    for (let j = 1; j <= b.length; j += 1) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

/** Drops the entries of `list` from the end until `make(list)` fits the budget. */
function fitList(list, make) {
  let n = list.length;
  let out = make(list, 0);
  while (n > 0 && bytes(out) > RESULT_BUDGET) {
    n -= 1;
    out = make(list.slice(0, n), list.length - n);
  }
  return out;
}

export function loadCatalog(root) {
  const api = readJson(root, 'src/app/data/component-api.json').components;
  const manifest = readJson(root, 'public/hds-manifest.json');
  const patternNames = new Set(readJson(root, 'codemods/patterns-subpath.names.json').names);

  /**
   * The flags both search_components and get_component put on a component:
   * `core` when the guide prefers it, `insteadFor` for each need it is the
   * wrong answer to (the guide names `use` instead).
   */
  const steer = (name) => {
    const insteadFor = INTENTS.filter((i) => i.avoid.includes(name)).map((i) => ({
      need: i.need,
      use: i.use[0],
    }));
    return {
      ...(core.has(name) ? { core: true } : {}),
      ...(insteadFor.length ? { insteadFor } : {}),
    };
  };
  const core = new Set(coreComponents());
  const components = Object.keys(api)
    .filter((name) => !api[name].hidden)
    .sort();
  const byLower = new Map(components.map((n) => [n.toLowerCase(), n]));
  const importOf = (name) => (patternNames.has(name) ? `${ROOT_IMPORT}/patterns` : ROOT_IMPORT);

  const tokens = Object.values(manifest.tokens ?? {}).flat();

  // Flat aliases of compound parts (DialogContent for Dialog.Content): searchable by
  // exact name only, so a purpose search returns the root component, not its parts.
  const partAliases = new Set();
  for (const [name, spec] of Object.entries(manifest.componentSpecs ?? {})) {
    for (const m of spec.compoundMembers ?? [])
      partAliases.add(`${name}${typeof m === 'string' ? m : m.name}`);
  }

  // ── search_components ───────────────────────────────────────────────────
  function rankComponents(query) {
    const q = String(query ?? '').trim();
    const qWords = words(q);
    const compact = q.toLowerCase().replace(/[^a-z0-9]/g, '');
    const scores = new Map(components.map((n) => [n, 0]));
    const add = (name, n) => scores.has(name) && scores.set(name, scores.get(name) + n);

    const matchedIntents = [];
    for (const intent of INTENTS) {
      const hits =
        q.toLowerCase() === intent.id
          ? 3
          : qWords.filter((w) => intent.keywords.includes(w)).length;
      if (!hits) continue;
      matchedIntents.push({ intent, hits });
      intent.use.forEach((name, i) => add(name, 10 * hits + (i === 0 ? 5 : 0)));
    }
    for (const name of components) {
      const lower = name.toLowerCase();
      if (lower === compact) add(name, 100);
      else if (partAliases.has(name) && !core.has(name)) continue;
      else if (qWords.some((w) => w.length > 2 && (lower.includes(w) || w.includes(lower))))
        add(name, 20);
      const entry = api[name];
      const text = words(`${entry.description} ${entry.usage?.when ?? ''}`);
      add(name, 2 * qWords.filter((w) => text.includes(w)).length);
      if (scores.get(name) > 0) {
        if (core.has(name)) add(name, 1);
      }
    }
    const ranked = components
      .filter((n) => scores.get(n) > 0)
      .sort((a, b) => scores.get(b) - scores.get(a) || (a < b ? -1 : 1));
    matchedIntents.sort((a, b) => b.hits - a.hits);
    return { ranked, intents: matchedIntents.map((m) => m.intent) };
  }

  function searchComponents({ query, limit = 8 }) {
    if (!String(query ?? '').trim()) throw new Error('query is required, e.g. "confirm delete"');
    const { ranked, intents } = rankComponents(query);
    const top = ranked.slice(0, Math.min(Math.max(1, limit), 8)).map((name) => ({
      name,
      import: importOf(name),
      summary: firstSentence(api[name].usage?.when || api[name].description, 120),
      ...steer(name),
    }));
    return fitList(top, (results) => ({
      results,
      needs: intents.slice(0, 2).map((i) => ({ need: i.need, use: i.use })),
    }));
  }

  // ── get_component ───────────────────────────────────────────────────────
  function getComponent({ name }) {
    const base = String(name ?? '')
      .trim()
      .split('.')[0];
    const canonical = byLower.get(base.toLowerCase()) ?? (HOOKS[base] ? base : null);
    if (!canonical) {
      const target = base.toLowerCase();
      const close = components
        .map((n) => ({ n, d: editDistance(n.toLowerCase(), target) }))
        .filter((c) => c.d <= Math.max(2, Math.floor(target.length / 3)))
        .sort((a, b) => a.d - b.d || (a.n < b.n ? -1 : 1))
        .slice(0, 3)
        .map((c) => c.n);
      throw new Error(
        `No component named "${name}".${close.length ? ` Did you mean: ${close.join(', ')}?` : ''} Use search_components to find one.`,
      );
    }
    if (HOOKS[canonical]) return { name: canonical, kind: 'hook', ...HOOKS[canonical] };

    const entry = api[canonical];
    const spec = manifest.componentSpecs?.[canonical] ?? {};
    const guide = INTENTS.filter((i) => i.use.includes(canonical)).map((i) => ({
      need: i.need,
      how: i.how,
    }));
    const propLine = (p, withDesc, typeMax) => {
      const type = p.type.length > typeMax ? `${p.type.slice(0, typeMax - 1)}…` : p.type;
      const def = p.default !== undefined ? ` = ${p.default}` : '';
      const desc = withDesc && p.description ? ` — ${firstSentence(p.description, 90)}` : '';
      return `${p.name}${p.required ? '' : '?'}: ${type}${def}${desc}`;
    };
    const build = (withDesc, typeMax, withHow) => ({
      name: canonical,
      import: importOf(canonical),
      category: entry.category,
      summary: firstSentence(entry.description, 200),
      ...steer(canonical),
      ...(entry.usage?.when ? { when: entry.usage.when } : {}),
      ...(entry.usage?.whenNot ? { whenNot: entry.usage.whenNot } : {}),
      ...(entry.usage?.useInstead?.length
        ? { useInstead: entry.usage.useInstead.map((u) => `${u.component}: ${u.reason}`) }
        : {}),
      ...(spec.compoundMembers?.length
        ? {
            parts: spec.compoundMembers.map(
              (m) => `${canonical}.${typeof m === 'string' ? m : m.name}`,
            ),
          }
        : {}),
      props: (entry.props ?? []).map((p) => propLine(p, withDesc, typeMax)),
      ...(guide.length ? { guide: withHow ? guide : guide.map((g) => ({ need: g.need })) } : {}),
    });
    for (const [withDesc, typeMax, withHow] of [
      [true, 80, true],
      [false, 80, true],
      [false, 48, true],
      [false, 48, false],
    ]) {
      const out = build(withDesc, typeMax, withHow);
      if (bytes(out) <= RESULT_BUDGET) return out;
    }
    const out = build(false, 32, false);
    return fitList(out.props, (props, dropped) => ({
      ...out,
      props,
      ...(dropped ? { propsOmitted: dropped, propsSource: 'src/app/data/component-api.json' } : {}),
    }));
  }

  // ── search_tokens ───────────────────────────────────────────────────────
  const tokenRow = (t) => ({
    path: t.path,
    cssVar: t.cssVar,
    value: t.resolvedValue ?? t.value ?? t.composite ?? null,
    ...(t.dark ? { dark: t.dark.resolvedValue ?? t.dark.value } : {}),
  });

  function searchTokens({ query, limit = 25 }) {
    const q = String(query ?? '')
      .trim()
      .toLowerCase()
      .replace(/^--/, '')
      .replace(/^var\(--|\)$/g, '');
    if (!q)
      throw new Error(
        'query is required: a path, a prefix ("semantic.space") or a word ("surface")',
      );
    const exact = tokens.find(
      (t) => t.path.toLowerCase() === q || t.cssVar?.toLowerCase() === `--${q}`,
    );
    if (exact) {
      return {
        token: {
          ...tokenRow(exact),
          type: exact.type,
          ...(exact.alias ? { alias: exact.alias } : {}),
          description: firstSentence(exact.description, 300),
        },
      };
    }
    const tierRank = { semantic: 0, role: 1, component: 2, primitive: 3 };
    const qWords = q.split(/[\s,]+/).filter(Boolean);
    const matches = tokens
      .map((t) => {
        const path = t.path.toLowerCase();
        let score = 0;
        if (path.startsWith(`${q}.`) || path.startsWith(q)) score = 3;
        else if (qWords.every((w) => path.includes(w))) score = 2;
        else if (qWords.every((w) => `${path} ${t.description ?? ''}`.toLowerCase().includes(w)))
          score = 1;
        return { t, score };
      })
      .filter((m) => m.score > 0)
      .sort(
        (a, b) =>
          b.score - a.score ||
          (tierRank[a.t.path.split('.')[0]] ?? 9) - (tierRank[b.t.path.split('.')[0]] ?? 9) ||
          (a.t.path < b.t.path ? -1 : 1),
      );
    const cap = Math.min(Math.max(1, limit), 40);
    const rows = matches.slice(0, cap).map((m) => tokenRow(m.t));
    return fitList(rows, (results) => ({
      total: matches.length,
      results,
      ...(matches.length > results.length ? { more: matches.length - results.length } : {}),
    }));
  }

  // ── list_core ───────────────────────────────────────────────────────────
  function listCore() {
    const names = [...core].filter((n) => api[n]);
    // `id → use`: short enough that every need fits; search_components takes the id.
    const needs = INTENTS.map((i) => `${i.id} → ${i.use.join(', ')}`);
    // Needs are ordered most common first; what does not fit is one search_components away.
    return fitList(needs, (shown, dropped) => ({
      root: names.filter((n) => !patternNames.has(n)),
      patterns: names.filter((n) => patternNames.has(n)),
      hooks: Object.keys(HOOKS),
      needs: shown,
      ...(dropped ? { moreNeeds: dropped, forMore: 'search_components with the need' } : {}),
    }));
  }

  const tools = [
    {
      name: 'search_components',
      description:
        'Find HDS components by name or by what you need ("row of headline numbers", "confirm delete"). Returns up to 8 matches with their import path, and the guide entry for the need.',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'A component name or a plain-language need.' },
          limit: { type: 'integer', minimum: 1, maximum: 8 },
        },
        required: ['query'],
      },
      run: searchComponents,
    },
    {
      name: 'get_component',
      description:
        "One component's import path, usage contract (when, when not, use instead), props and compound parts, plus how the guide says to use it. Call before using a component.",
      inputSchema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Component name, e.g. "MetricTiles" or "AlertDialog".',
          },
        },
        required: ['name'],
      },
      run: getComponent,
    },
    {
      name: 'search_tokens',
      description:
        'Look up design tokens. An exact path or CSS variable returns that token with its description; a prefix ("semantic.space") or words ("surface page") return matching tokens, semantic tier first, with CSS variable and light/dark values.',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Token path, prefix, CSS variable or words.' },
          limit: { type: 'integer', minimum: 1, maximum: 40 },
        },
        required: ['query'],
      },
      run: searchTokens,
    },
    {
      name: 'list_core',
      description:
        'The core components to prefer, split by import path, the hooks, and one line per screen need (`id → components`; pass an id to search_components for its usage line). Call this first.',
      inputSchema: { type: 'object', properties: {} },
      run: listCore,
    },
  ];

  const instructions = [
    'Lookups for @hirobius/design-system (HDS). Call list_core first, then get_component for each component before you use it.',
    'Import pattern-tier components (Page, PageHeader, MetricTiles, DataTableSection, Form, FormActions) from @hirobius/design-system/patterns, everything else from @hirobius/design-system.',
    'Style with component props and semantic tokens only (search_tokens); no raw hex, px or Tailwind classes. The package AGENTS.md has the full rules.',
  ].join(' ');

  return { instructions, tools };
}
