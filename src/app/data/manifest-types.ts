/**
 * manifest-types.ts — canonical TypeScript types for the HDS manifest contracts.
 *
 * Single source of truth for:
 *   - SystemManifest / ManifestComponentSpec (virtual:hds-manifest)
 *   - ComponentApiManifest / ManifestApiComponent (component-api.json)
 *   - Supporting building-block types
 *
 * All fields are OPTIONAL (broad superset) — the generated manifest JSON is
 * the runtime source of truth; consumers that need a field to be required
 * should derive a local narrowed type via intersection, e.g.:
 *
 *   type DocSpec = ManifestComponentSpec & { category: string; figmaUrl: string | null };
 *
 * IMPORTANT: `props` means two different things across the two manifests:
 *   - ManifestComponentSpec.props  → Record<string, ManifestPropSpec>   (shape metadata)
 *   - ManifestApiComponent.props   → ManifestApiPropRow[]               (documentation rows)
 * Keep them as DISTINCT types — do not merge.
 */

// ── Building-block types ───────────────────────────────────────────────────────

/** Shape metadata for a single prop as stored in componentSpecs[name].props. */
export type ManifestPropSpec = {
  type?: string;
  values?: Array<string | number | boolean>;
  default?: string | number | boolean;
  optional?: boolean;
};

/** Contract parsed from the @usage / @whenNot / @useInstead JSDoc tags (hds#339). */
export type ManifestUsage = {
  when?: string;
  whenNot?: string;
  useInstead?: Array<{ component: string; reason?: string }>;
};

/** One @keyboard JSDoc line: the keys and what they do. */
export type ManifestKeyboardEntry = { keys: string; effect: string };

/** A named slot declared on a component spec. */
export type ManifestSlot = {
  name?: string;
  description?: string;
  source?: 'jsdoc';
  figmaSlotName?: string;
  tokenBinding?: Record<string, string>;
};

/**
 * A documentation row for a single prop as stored in
 * ComponentApiManifest.components[name].props (array, not Record).
 */
export type ManifestApiPropRow = {
  name: string;
  type?: string;
  default?: string;
  required?: boolean;
  description?: string;
};

/** A role token entry from manifest.tokens.role. */
export type RoleToken = {
  path?: string;
  cssVar?: string;
  description?: string;
  alias?: string;
};

// ── SystemManifest types ───────────────────────────────────────────────────────

/**
 * A single entry in SystemManifest.componentSpecs (or .utilities).
 * Superset of every field any consumer declares — all fields are optional.
 */
export type ManifestComponentSpec = {
  category?: string;
  description?: string;
  figmaUrl?: string | null;
  figmaId?: string | null;
  figmaLink?: string | null;
  filePath?: string;
  hidden?: boolean;
  docExempt?: boolean;
  tier?: string;
  /** In the ratified core set (hds#254, ADR-031). Present only as `true`; independent of `tier`. */
  core?: true;
  stability?: 'stable' | 'beta';
  consumers?: string[];
  tokenMapping?: Record<string, string>;
  preview?: {
    exportName?: string;
    sizing?: 'compact' | 'panel' | 'full';
  };
  /** Shape metadata keyed by prop name. Distinct from API manifest prop rows. */
  props?: Record<string, ManifestPropSpec>;
  propConstraints?: Record<string, ManifestPropSpec | Record<string, unknown>>;
  requiredProps?: string[];
  slots?: ManifestSlot[];
  usage?: ManifestUsage;
  keyboard?: ManifestKeyboardEntry[];
  aiRules?: string;
};

/**
 * Alias of ManifestComponentSpec for hds-search.ts back-compat.
 * @deprecated Use ManifestComponentSpec directly in new code.
 */
export type ManifestSpec = ManifestComponentSpec;

/** The root SystemManifest shape (virtual:hds-manifest). */
export type SystemManifest = {
  name?: string;
  version?: string;
  systemSpecs?: {
    engine?: string;
    icons?: string;
    tokens?: string;
    styling?: string;
    [key: string]: string | undefined;
  };
  componentInventory?: string[];
  componentSpecs?: Record<string, ManifestComponentSpec>;
  utilities?: Record<string, ManifestComponentSpec>;
  tokens?: {
    role?: Record<string, RoleToken> | RoleToken[];
    [key: string]: unknown;
  };
};

// ── ComponentApiManifest types ─────────────────────────────────────────────────

/**
 * A single entry in ComponentApiManifest.components.
 * Uses ManifestApiPropRow[] (array) — distinct from ManifestComponentSpec.props (Record).
 */
export type ManifestApiComponent = {
  filePath?: string;
  category?: string;
  hidden?: boolean;
  figmaUrl?: string | null;
  description?: string;
  /** In the ratified core set (hds#254, ADR-031). Present only as `true`. */
  core?: true;
  usage?: ManifestUsage;
  keyboard?: ManifestKeyboardEntry[];
  aiRules?: string;
  /** Documentation prop rows — array, not a Record. */
  props?: ManifestApiPropRow[];
  /** Table only: what each `TableCellSlot` value renders. */
  cellSlots?: Array<{ name: string; description: string }>;
  guides?: Array<{
    label: string;
    text: string;
  }>;
  observedTokens?: Array<{
    raw: string;
    tokenPath?: string;
  }>;
};

/** The root ComponentApiManifest shape (component-api.json). */
export type ComponentApiManifest = {
  generatedAt?: string;
  source?: string;
  components?: Record<string, ManifestApiComponent>;
};
