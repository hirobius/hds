/**
 * The numbers on the case study page (hds#1148), computed from repo files when the
 * site builds: the stats file, the guardrail registry, the decision records and the
 * changelog. The page holds no hand-typed counts, so the story cannot drift from the code.
 */

export interface CaseStudySources {
  stats: {
    version: string;
    components: { core: number; patterns: number };
    tokens: { total: number };
    consumers: { productApps: number; tokenLevelSites: number };
  };
  registry: { gates: { firingChannel: string }[] };
  /** File names in docs/adr. */
  adrFiles: string[];
  /** CHANGELOG.md text. */
  changelog: string;
}

export interface CaseStudyFacts {
  version: string;
  coreComponents: number;
  patterns: number;
  tokens: number;
  productApps: number;
  tokenSites: number;
  gates: number;
  /** Gates that run on every commit or push, with no one choosing to run them. */
  hookGates: number;
  decisions: number;
  releases: number;
}

const HOOK_CHANNELS = new Set(['pre-commit', 'pre-push']);

export function caseStudyFacts({
  stats,
  registry,
  adrFiles,
  changelog,
}: CaseStudySources): CaseStudyFacts {
  return {
    version: stats.version,
    coreComponents: stats.components.core,
    patterns: stats.components.patterns,
    tokens: stats.tokens.total,
    productApps: stats.consumers.productApps,
    tokenSites: stats.consumers.tokenLevelSites,
    gates: registry.gates.length,
    hookGates: registry.gates.filter((g) => HOOK_CHANNELS.has(g.firingChannel)).length,
    decisions: adrFiles.filter((f) => /^\d{3}-.+\.md$/.test(f)).length,
    releases: changelog.split('\n').filter((l) => /^## \d+\.\d+\.\d+\s*$/.test(l)).length,
  };
}
