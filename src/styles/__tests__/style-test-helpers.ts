/**
 * Shared setup for the src/styles contract tests (hds#1009): one copy of the
 * token-source walk and the generated-CSS block parsing that the dark-surface,
 * divider, overlay, accent, pressed-overlay and scrim tests each used to
 * re-implement. Local to this folder — test support, not a library surface.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { resolveAlias } from '../../../scripts/lib/token-tree.mjs';

/** The committed token source every styles contract test pins against. */
export const TOKENS = JSON.parse(
  readFileSync(resolve(__dirname, '../../../hirobius.tokens.json'), 'utf8'),
) as Record<string, unknown>;

export type TokenMode = 'Light' | 'Dark';

export type TokenLeaf = {
  $value: unknown;
  $extensions?: Record<string, { modes?: Record<string, unknown> }>;
};

/** The token leaf at a dotted path, in the base tree unless one is passed. */
export function tokenLeaf(path: string, tree: Record<string, unknown> = TOKENS): TokenLeaf {
  const node = path.split('.').reduce<unknown>((n, k) => (n as Record<string, unknown>)?.[k], tree);
  if (!node || typeof node !== 'object' || !('$value' in node))
    throw new Error(`no token at ${path}`);
  return node as TokenLeaf;
}

/** A token's hex in a mode, following aliases (role → semantic → primitive). */
export function tokenHex(path: string, mode: TokenMode): string {
  const t = tokenLeaf(path);
  const raw = t.$extensions?.['com.figma.variables']?.modes?.[mode] ?? t.$value;
  if (typeof raw === 'string' && /^\{.+\}$/.test(raw)) {
    const target = raw.slice(1, -1);
    if (tokenLeaf(target).$extensions?.['com.figma.variables']) return tokenHex(target, mode);
  }
  return resolveAlias(raw, TOKENS) as string;
}

/** Body of the first top-level block whose selector list is exactly `selector`. */
export function blockBody(css: string, selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s*');
  const match = css.match(new RegExp(`(?:^|\\n)${escaped}\\s*\\{([^}]*)\\}`));
  if (!match) throw new Error(`Block not found: ${selector}`);
  return match[1];
}

/** The value of one declaration inside a block body, or null when absent. */
export function declaration(body: string, prop: string): string | null {
  const match = body.match(new RegExp(`${prop}:\\s*([^;]+);`));
  return match ? match[1].trim() : null;
}
