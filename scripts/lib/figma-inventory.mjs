/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * figma-inventory.mjs — what the Figma library actually contains, as data.
 *
 * WHY THIS EXISTS. Before this, nothing in the repo knew what was in the Figma
 * file, and neither of the obvious ways to find out works on the Pro plan:
 *
 *   - `list_file_components_for_code_connect` (the MCP tool built for exactly
 *     this) refuses: "you need a Dev or Full seat on an Organization plan".
 *   - `get_metadata` with no node id is documented to list the document's
 *     top-level pages, but returns only `Cover` however many pages exist,
 *     because it reports the *loaded* page rather than the document.
 *
 * What is left is `GET /v1/files/:key`, which is not plan-gated (only the
 * *variables* REST endpoints are Enterprise-only, per ADR-025's capability
 * table). One authenticated call returns every page and every component set,
 * so the walk is a function of the response rather than a person clicking
 * through the Figma sidebar and reading ids aloud.
 *
 * The parse is pure and the coverage diff is pure. Only `fetchFile` touches the
 * network, so both are tested against a fixture with no token and no Figma.
 */

import { TOKEN_VARS, missingTokenMessage } from './figma-token.mjs';

/** Figma node types that count as a mappable design-system asset. */
const ASSET_TYPES = new Set(['COMPONENT_SET', 'COMPONENT']);

/**
 * Pages that hold specimens and documentation rather than components. They
 * carry no component sets, so they never produce coverage findings, but naming
 * them keeps the inventory honest about what a page is for.
 */
const DOC_PAGE_NAMES = new Set(['Cover', 'Color', 'Typography', 'ColorDoc', 'TypographyDoc']);

/**
 * Reduce a `GET /v1/files/:key` response to the inventory we keep in the repo.
 *
 * A page contributes its top-level component sets and any bare components that
 * are not already inside one (a variant inside a set is not a separate asset).
 * `depth=2` is enough: Figma nests every variant under its COMPONENT_SET, and
 * a set is always a direct child of the page or of one wrapper frame.
 *
 * @param {object} file parsed `GET /v1/files/:key` body
 * @param {string} fileKey the key the body was fetched with (not in the body)
 * @returns {{ fileKey: string, fileName: string, pages: Array<{id: string, name: string, kind: string, assets: Array<{id: string, name: string, type: string, variantCount: number}>}> }}
 */
export function parseDocument(file, fileKey) {
  if (!file || typeof file !== 'object' || !file.document) {
    throw new Error(
      'Figma returned a body with no `document`. Expected a GET /v1/files/:key response.',
    );
  }

  const pages = [];
  for (const canvas of file.document.children ?? []) {
    if (canvas.type !== 'CANVAS') continue;
    const assets = collectAssets(canvas);
    pages.push({ id: canvas.id, name: canvas.name, kind: classifyPage(canvas, assets), assets });
  }

  return { fileKey, fileName: file.name ?? null, pages };
}

/**
 * What a page is for, which decides whether coverage applies to it.
 *
 *   doc        specimens and documentation; carries no components.
 *   icons      an icon sheet. Every asset is a bare `Icon/<name>` component
 *              used as an INSTANCE_SWAP inside other components, not a React
 *              component of its own — code has one `Icon` plus sync-icons.mjs,
 *              so demanding an @figma tag per glyph would report ~70 gaps that
 *              nobody should ever close.
 *   components the real surface: sets and standalone components that a React
 *              component is expected to correspond to.
 */
function classifyPage(canvas, assets) {
  if (assets.length === 0) return DOC_PAGE_NAMES.has(canvas.name) ? 'doc' : 'empty';
  const allIcons = assets.every(
    (asset) => asset.type === 'COMPONENT' && asset.name.startsWith('Icon/'),
  );
  return allIcons ? 'icons' : 'components';
}

/**
 * Component sets and standalone components reachable from a page, skipping
 * anything already inside a set. Recurses through plain frames/groups because
 * several HDS pages wrap their set in a titled frame (Button lives in a frame
 * called "Button" on a page called "Button").
 */
function collectAssets(node, out = [], depth = 0) {
  // 6 is well past the deepest wrapper seen (page → frame → set) and stops a
  // malformed or cyclic response from running away.
  if (depth > 6) return out;

  for (const child of node.children ?? []) {
    if (ASSET_TYPES.has(child.type)) {
      out.push({
        id: child.id,
        name: child.name,
        type: child.type,
        // Variants only exist under a set; a bare component counts as itself.
        variantCount: child.type === 'COMPONENT_SET' ? (child.children ?? []).length : 1,
      });
      // Do not descend: a set's children are its variants, not assets.
      continue;
    }
    collectAssets(child, out, depth + 1);
  }
  return out;
}

/**
 * Every Figma node id a component in the code claims, keyed by node id.
 * Reads `figmaUrl` exactly as the manifest stores it — the `@figma` JSDoc tag
 * is the single source, so this measures the tags without re-parsing source.
 *
 * Figma writes node ids as `28-138` in a URL and `28:138` everywhere else;
 * normalise to the colon form so the two sides can be compared at all.
 *
 * @param {object} manifest parsed public/hds-manifest.json
 * @returns {Map<string, string>} node id → component name
 */
export function mappedNodes(manifest) {
  const byNode = new Map();
  for (const [name, spec] of Object.entries(manifest.componentSpecs ?? {})) {
    const url = spec?.figmaUrl;
    if (typeof url !== 'string') continue;
    const match = url.match(/[?&]node-id=([0-9]+[:-][0-9]+)/);
    if (!match) continue;
    byNode.set(match[1].replace('-', ':'), name);
  }
  return byNode;
}

/**
 * Which assets in the Figma library no component in the code points at.
 *
 * Deliberately one-directional. A Figma asset with no `@figma` tag is a real
 * gap — the design exists and the code cannot find it. The reverse (a tag whose
 * node is gone from Figma) is a different failure with a different fix, and
 * `check-code-connect` already reports url-source drift, so folding both into
 * one number would hide which one fired.
 *
 * Overrides cover the one honest exception: a Figma asset whose code
 * counterpart is a compound member (`Card.Progress`) rather than a top-level
 * component, so no `@figma` tag can name it. They are counted as mapped and
 * reported separately, never hidden — an override is an admission that Figma
 * and code model the same thing differently.
 *
 * @param {ReturnType<typeof parseDocument>} inventory
 * @param {object} manifest parsed public/hds-manifest.json
 * @param {{ overrides?: Array<{nodeId: string, mapsTo: string}> }} [overrideFile]
 * @returns {{ total: number, mapped: number, overridden: Array<{page: string, name: string, id: string, mapsTo: string}>, unmapped: Array<{page: string, name: string, id: string, type: string}> }}
 */
export function coverage(inventory, manifest, overrideFile = {}) {
  const byNode = mappedNodes(manifest);
  const byOverride = new Map(
    (overrideFile.overrides ?? []).map((o) => [String(o.nodeId).replace('-', ':'), o.mapsTo]),
  );
  const unmapped = [];
  const overridden = [];
  let total = 0;
  let mapped = 0;

  for (const page of inventory.pages ?? []) {
    // Only 'components' pages carry a one-to-one code obligation; see
    // classifyPage. Icon sheets and doc pages are inventoried, not policed.
    if (page.kind !== 'components') continue;
    for (const asset of page.assets ?? []) {
      total += 1;
      if (byNode.has(asset.id)) {
        mapped += 1;
        continue;
      }
      if (byOverride.has(asset.id)) {
        mapped += 1;
        overridden.push({
          page: page.name,
          name: asset.name,
          id: asset.id,
          mapsTo: byOverride.get(asset.id),
        });
        continue;
      }
      unmapped.push({ page: page.name, name: asset.name, id: asset.id, type: asset.type });
    }
  }

  return { total, mapped, overridden, unmapped };
}

/**
 * One authenticated read of the whole document. The only function here that
 * touches the network.
 *
 * @param {{ fileKey: string, token: string, fetchImpl?: typeof fetch, baseUrl?: string, depth?: number }} options
 */
export async function fetchFile({
  fileKey,
  token,
  fetchImpl = globalThis.fetch,
  baseUrl = 'https://api.figma.com',
  depth = 2,
}) {
  if (!token) {
    throw new Error(missingTokenMessage('pnpm figma:inventory --fetch'));
  }

  const path = `/v1/files/${fileKey}?depth=${depth}`;
  const response = await fetchImpl(`${baseUrl}${path}`, {
    headers: { 'X-Figma-Token': token },
  });

  if (!response.ok) {
    throw new Error(explainStatus(response.status, path));
  }
  return response.json();
}

/** Name the variable and the fix, never a bare status code. */
function explainStatus(status, path) {
  const tokenHelp =
    'Create or rotate a personal access token at https://www.figma.com/settings ' +
    '(Security → Personal access tokens) with the `file_content:read` scope, then re-run. ' +
    `The token is read from ${TOKEN_VARS.join(' or ')}.`;

  if (status === 403 || status === 401) {
    return `Figma refused the token (HTTP ${status}) on GET ${path}. It is expired, revoked, or lacks the \`file_content:read\` scope. ${tokenHelp}`;
  }
  if (status === 404) {
    return `Figma found no such file (HTTP 404) on GET ${path}. Check libraryFileKey in figma/links.json: this needs the key of a main file, not a branch.`;
  }
  if (status === 429) {
    return `Figma rate-limited the request (HTTP 429) on GET ${path}. This is one call per run, so a 429 means the day's budget is already spent elsewhere — wait rather than retry.`;
  }
  return `Figma returned HTTP ${status} on GET ${path}.`;
}

/**
 * The file to read, and where that choice came from.
 *
 * Defaults to the published library. `--file <key>` points at another file
 * WITHOUT writing figma/inventory.json, which is what makes a staging
 * duplicate checkable: ADR-026 says agents may only write to the duplicate
 * named by `stagingFileKey`, but nothing could tell you whether that
 * duplicate was a faithful copy or a near-empty file with a Cover page.
 * Figma's MCP `get_metadata` cannot answer it either — it lists one page for
 * the real library too — so REST is the only honest check, and it was
 * hardcoded to `libraryFileKey`.
 *
 * `--file staging` resolves `stagingFileKey` by name, so the common case
 * needs no copy-pasted key.
 *
 * @param {object} links - figma/links.json
 * @returns {{ fileKey: string, label: string, isDefault: boolean }}
 */
export function resolveTarget(args, links) {
  const index = args.indexOf('--file');
  if (index === -1) {
    return { fileKey: links.libraryFileKey, label: 'libraryFileKey', isDefault: true };
  }

  const value = args[index + 1];
  if (!value || value.startsWith('--')) {
    throw new Error('--file needs a Figma file key, or the word `staging`.');
  }
  if (value === 'staging') {
    if (!links.stagingFileKey) {
      throw new Error(
        'stagingFileKey is null in figma/links.json, so there is no staging file to read. ' +
          "Duplicate the library in Figma, then set it to the new file's key (the segment after /design/ in its URL).",
      );
    }
    return { fileKey: links.stagingFileKey, label: 'stagingFileKey', isDefault: false };
  }
  return { fileKey: value, label: 'the key passed to --file', isDefault: false };
}
