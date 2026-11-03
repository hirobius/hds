/**
 * Resolve a token in hirobius.tokens.json to its colour string in one Figma
 * mode, following `{alias}` references through each node's mode value (or its
 * `$value` when the node has no per-mode value). Shared by the contrast suites
 * (dark-surface, soft-surfaces) so they resolve tokens the same way (hds#1011).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export type FigmaMode = 'Light' | 'Dark';

const tokens = JSON.parse(readFileSync(resolve(process.cwd(), 'hirobius.tokens.json'), 'utf8'));

function at(path: string) {
  return path.split('.').reduce((node, key) => node?.[key], tokens);
}

/** Resolve a token to a hex colour in the given Figma mode; throws when it is not a string. */
export function tokenHex(path: string, mode: FigmaMode): string {
  const node = at(path);
  let value: unknown = node?.$extensions?.['com.figma.variables']?.modes?.[mode] ?? node?.$value;
  while (typeof value === 'string' && value.startsWith('{')) {
    const ref = at(value.slice(1, -1));
    value = ref?.$extensions?.['com.figma.variables']?.modes?.[mode] ?? ref?.$value;
  }
  if (typeof value !== 'string') throw new Error(`${path} (${mode}) does not resolve to a colour`);
  return value;
}
