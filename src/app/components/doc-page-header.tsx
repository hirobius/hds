// motion-ok: structural page header — anchor links use CSS hover, no state-change motion
/** @internal — utility-tier component; not part of @hirobius/design-system public API. */
/**
 * DocPageHeader — standardized header zone mounted at the top of every
 * primitive / pattern / template doc page. Projected from the live HDS
 * manifest; the unit `9d-9` batch refactor wires this component into the
 * doc routes — this file only CREATES the surface.
 *
 * @category Layout
 * @tier utility
 *
 * 9d-4 contract (historical spec; the orchestration store it was tracked in
 * was removed under #50 — this comment preserves the contract as reference):
 *   - H1: component name
 *   - Lede: single-line summary derived from `componentSpec.description`
 *     (truncated at the first newline / sentence break for the header zone;
 *     the full description still flows into the doc body downstream).
 *   - Status badge: Stable / Beta — derived from a new optional
 *     `componentSpec.stability` field (additive, schema 9d-4). When absent,
 *     the default falls back to the unit-spec rule: primitives → 'stable';
 *     patterns and templates → 'beta' when they lack `slots[]` or carry
 *     propConstraints warnings, otherwise 'stable'.
 *   - Tier chip: primitive / pattern / template / utility (manifest field).
 *   - Source link: GitHub blob URL projected from `componentSpec.filePath`
 *     against the repo's origin remote (hirobius/adrian-milsap, branch
 *     `main` for canonical permalinks).
 *   - Figma link: rendered when `componentSpec.figmaUrl` is non-null.
 *
 * Surface rules (component-zone CLAUDE.md):
 *   - Heavy prop restriction — one slot, no business logic.
 *   - Theming via CSS variables / role tokens only (no inline hex).
 *   - Composes Stack rather than re-implementing layout primitives.
 *
 * Anti-goals:
 *   - Not a doc-shell — `DocShell` already owns the wordmark, search,
 *     theme-toggle, and rail nav. This component lives INSIDE the content
 *     column, not the header bar.
 *   - Does not render badges as decorative stickers next to prose; they
 *     sit in a dedicated metadata row below the H1, per CLAUDE.md.
 */

import * as React from 'react';
import {
  SquareArrowOutUpRight as ArrowSquareOut,
  Code as CodeIcon,
  Figma as FigmaLogo,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Stack } from './stack';

// ── Public types ──────────────────────────────────────────────────────────────

export type DocPageHeaderTier = 'primitive' | 'pattern' | 'template' | 'utility';
export type DocPageHeaderStability = 'stable' | 'beta';

/**
 * Subset of `componentSpec` required to project a doc-page header. Mirrors
 * the additive `stability` field landing in `manifest/schema.json` for
 * 9d-4. The `slots` and `propConstraints` fields are read for the default
 * stability computation when `stability` is absent.
 */
export interface DocPageHeaderSpec {
  /** Required — the H1. Component name as it appears in `componentSpecs`. */
  name: string;
  /** Required — projected to the lede; first line / sentence is used. */
  description?: string;
  /** Required — drives the source link target. */
  filePath?: string;
  /** Optional — drives the Figma link target. Legacy field. */
  figmaUrl?: string | null;
  /**
   * Optional — explicit Figma master link (10d-14). Either a real URL or a
   * structured `TODO:hds-master:<componentName>` marker so the Figma slot
   * still surfaces while the master file is being authored. Preferred over
   * `figmaUrl` when both are present.
   */
  figmaLink?: string | null;
  /** Required — drives the tier chip. */
  tier?: DocPageHeaderTier | string;
  /** Additive (9d-4). Explicit value overrides the computed default. */
  stability?: DocPageHeaderStability;
  /** Read-only fallback inputs for the default-stability computation. */
  slots?: unknown[];
  propConstraints?: Record<string, unknown>;
}

export interface DocPageHeaderProps {
  /** Manifest projection — the `componentSpec` entry for this doc page. */
  spec: DocPageHeaderSpec;
  /** GitHub repo owner/name. Defaults to the canonical `hirobius/adrian-milsap` repo. */
  repo?: string;
  /** Git ref used in the GitHub blob URL. Defaults to `main`. */
  ref?: string;
  /** Optional className escape hatch on the outer `<header>`. */
  className?: string;
}

// ── Defaults ──────────────────────────────────────────────────────────────────

const DEFAULT_REPO = 'hirobius/adrian-milsap';
const DEFAULT_REF = 'main';

// ── Pure helpers (also exported for tests) ────────────────────────────────────

/**
 * Figma target resolution result (10d-14). The header always renders a
 * "Figma" affordance for primitive + pattern doc pages — either as a real
 * external link or as a "TODO" pending chip when the master link is not
 * yet authored.
 */
export type DocPageHeaderFigmaTarget =
  | { kind: 'link'; href: string }
  | { kind: 'todo'; marker: string }
  | { kind: 'none' };

/**
 * Resolve the Figma target for the header's "View in Figma" slot. Prefers
 * `figmaLink` over the legacy `figmaUrl`; treats values starting with
 * `TODO:` as pending markers (rendered as a chip, not a link).
 */
export function resolveFigmaTarget(spec: DocPageHeaderSpec): DocPageHeaderFigmaTarget {
  const candidates = [spec.figmaLink, spec.figmaUrl];
  // Prefer the first concrete URL.
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.length > 0 && !candidate.startsWith('TODO:')) {
      return { kind: 'link', href: candidate };
    }
  }
  // No URL — surface a TODO marker if either field carries one.
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.startsWith('TODO:')) {
      return { kind: 'todo', marker: candidate };
    }
  }
  return { kind: 'none' };
}

/**
 * Truncate a `componentSpec.description` to a single-line lede for the
 * header zone. Splits on the first sentence break OR newline, whichever
 * comes first; falls back to the full string when neither is present.
 * Trailing punctuation is preserved.
 */
export function projectLede(description?: string): string {
  if (!description) return '';
  const trimmed = description.trim();
  const newline = trimmed.indexOf('\n');
  // Take everything up to the first newline (paragraph break) — multi-
  // sentence ledes are still allowed; only paragraph breaks split the lede.
  const single = newline >= 0 ? trimmed.slice(0, newline) : trimmed;
  return single.trim();
}

/**
 * Project a `componentSpec.filePath` (repo-relative) into a GitHub blob URL.
 * Returns null when no `filePath` is present so callers can suppress the
 * source link rather than render a broken anchor.
 */
export function projectGithubBlobUrl(
  filePath: string | undefined,
  repo: string = DEFAULT_REPO,
  ref: string = DEFAULT_REF,
): string | null {
  if (!filePath) return null;
  // Strip leading `./` and `/` so the URL stays canonical regardless of
  // how the manifest serializer wrote the path.
  const normalized = filePath.replace(/^\.?\/+/, '');
  return `https://github.com/${repo}/blob/${ref}/${normalized}`;
}

/**
 * Compute the default stability for a spec when `componentSpec.stability`
 * is absent. Mirrors the 9d-4 unit-spec rule:
 *   - primitives → 'stable'
 *   - patterns/templates → 'beta' when slots[] missing OR propConstraints
 *     have any warning entries; 'stable' otherwise
 *   - utilities → 'stable' (utilities are internal scaffolding; they
 *     don't surface a stability badge in public docs anyway)
 */
export function resolveStability(spec: DocPageHeaderSpec): DocPageHeaderStability {
  if (spec.stability === 'stable' || spec.stability === 'beta') {
    return spec.stability;
  }
  const tier = spec.tier;
  if (tier === 'pattern' || tier === 'template') {
    const hasSlots = Array.isArray(spec.slots) && spec.slots.length > 0;
    const constraints = spec.propConstraints ?? {};
    const hasConstraintWarnings = Object.values(constraints).some((entry) => {
      if (!entry || typeof entry !== 'object') return false;
      // Flag any entry carrying an explicit 'warning' / 'warn' marker. The
      // shape of propConstraints is open (`additionalProperties: true`) so
      // this is conservative: only treat documented warning fields as such.
      const record = entry as {
        warning?: unknown;
        warn?: unknown;
        severity?: unknown;
        status?: unknown;
      };
      return (
        record.warning === true ||
        record.warn === true ||
        record.severity === 'warning' ||
        record.status === 'warning'
      );
    });
    if (!hasSlots || hasConstraintWarnings) return 'beta';
    return 'stable';
  }
  // primitive | utility | (unknown) → stable
  return 'stable';
}

// ── Inline chip + badge surfaces (component-local; not exported) ──────────────

// vocab-ok: 'beta' predates the #60 fixed tone vocabulary (neutral | danger |
// success | warning | info) — this internal utility-tier chip names a
// stability marker, not feedback intent. Tracked for a future rollout phase
// rather than force-renamed here.
interface ChipProps {
  children: React.ReactNode;
  tone?: 'neutral' | 'beta';
  className?: string;
}

function Chip({ children, tone = 'neutral', className }: ChipProps) {
  return (
    <span
      className={cn(
        'inline-flex h-5 items-center rounded-md border px-1.5',
        'text-xs font-medium uppercase tracking-wide',
        tone === 'neutral' && 'border-border bg-muted text-muted-foreground',
        // Beta uses the warning role tokens already established by 8e-2.
        tone === 'beta' &&
          'border-[color:var(--semantic-color-feedback-warning)]/40 bg-[color:var(--semantic-color-feedback-bg-warning)] text-[color:var(--semantic-color-feedback-warning)]',
        className,
      )}
    >
      {children}
    </span>
  );
}

interface MetaLinkProps {
  href: string;
  icon: React.ReactNode;
  label: string;
}

function MetaLink({ href, icon, label }: MetaLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'inline-flex items-center gap-1.5 rounded-sm text-xs',
        'text-muted-foreground hover:text-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      )}
    >
      <span aria-hidden="true" className="inline-flex h-3.5 w-3.5 items-center justify-center">
        {icon}
      </span>
      <span>{label}</span>
      <ArrowSquareOut aria-hidden="true" size={12} />
    </a>
  );
}

// ── Header root ───────────────────────────────────────────────────────────────

export function DocPageHeader({
  spec,
  repo = DEFAULT_REPO,
  ref = DEFAULT_REF,
  className,
}: DocPageHeaderProps) {
  const lede = projectLede(spec.description);
  const stability = resolveStability(spec);
  // eslint-disable-next-line react-hooks/refs -- `ref` is a string prop (git branch), not a React ref
  const sourceUrl = projectGithubBlobUrl(spec.filePath, repo, ref);
  const figmaTarget = resolveFigmaTarget(spec);
  const tier = spec.tier ?? null;

  return (
    <header
      data-hds-component="DocPageHeader"
      className={cn('border-b border-border pb-8', className)}
    >
      <Stack gap="tight">
        {/* Title row */}
        <h1
          className={cn('m-0 text-3xl font-semibold tracking-tight text-foreground', 'sm:text-4xl')}
        >
          {spec.name}
        </h1>

        {/* Lede — single line / paragraph derived from componentSpec.description */}
        {lede ? (
          <p className="m-0 max-w-2xl text-base leading-relaxed text-muted-foreground">{lede}</p>
        ) : null}

        {/* Metadata row — chips + external links. Sits in a dedicated zone
            below the lede per CLAUDE.md (no decorative stickers in prose). */}
        <div data-hds-slot="metadata" className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1">
          <Chip tone={stability === 'beta' ? 'beta' : 'neutral'}>
            {stability === 'beta' ? 'Beta' : 'Stable'}
          </Chip>
          {tier ? <Chip tone="neutral">{tier}</Chip> : null}
          {sourceUrl || figmaTarget.kind !== 'none' ? (
            <span aria-hidden="true" className="hidden h-3 w-px bg-border sm:inline-block" />
          ) : null}
          {sourceUrl ? (
            <MetaLink href={sourceUrl} icon={<CodeIcon size={14} />} label="Source" />
          ) : null}
          {figmaTarget.kind === 'link' ? (
            <MetaLink
              href={figmaTarget.href}
              icon={<FigmaLogo size={14} />}
              label="View in Figma"
            />
          ) : null}
          {figmaTarget.kind === 'todo' ? (
            <span
              data-hds-slot="figma-todo"
              title={figmaTarget.marker}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-sm text-xs',
                'text-muted-foreground/70',
              )}
            >
              <span
                aria-hidden="true"
                className="inline-flex h-3.5 w-3.5 items-center justify-center"
              >
                <FigmaLogo size={14} />
              </span>
              <span>Figma — TODO</span>
            </span>
          ) : null}
        </div>
      </Stack>
    </header>
  );
}

export default DocPageHeader;
