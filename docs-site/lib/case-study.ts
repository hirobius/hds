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
  registry: {
    gates: { id: string; gateScript?: string | null; firingChannel: string }[];
    /** Named command lists (pre-push, pretest, check:fast, …): a step is a command or { run }. */
    lanes?: Record<string, (string | { run: string })[]>;
  };
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
  /**
   * Registered gates that git hooks run with no one choosing to: the pre-commit and pre-push
   * channels, plus every gate a hook lane (pre-push, pretest, check:fast) runs. Deduped by gate.
   */
  hookGates: number;
  decisions: number;
  releases: number;
}

const HOOK_CHANNELS = new Set(['pre-commit', 'pre-push']);
/** Lanes a git hook runs: pre-push always; pretest and check:fast on a push that touches shipped code. */
const HOOK_LANES = ['pre-push', 'pretest', 'check:fast'];

function hookGateCount({ gates, lanes = {} }: CaseStudySources['registry']): number {
  const commands = HOOK_LANES.flatMap((lane) => lanes[lane] ?? []).map((step) =>
    typeof step === 'string' ? step : step.run,
  );
  const runByLane = (script: string) => commands.some((cmd) => cmd.split(/\s+/).includes(script));
  return gates.filter(
    (g) => HOOK_CHANNELS.has(g.firingChannel) || (g.gateScript ? runByLane(g.gateScript) : false),
  ).length;
}

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
    hookGates: hookGateCount(registry),
    decisions: adrFiles.filter((f) => /^\d{3}-.+\.md$/.test(f)).length,
    releases: changelog.split('\n').filter((l) => /^## \d+\.\d+\.\d+\s*$/.test(l)).length,
  };
}
