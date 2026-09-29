/** @internal — not part of @hirobius/design-system public API surface. */
import { readFileSync } from 'fs';
import { fromDtcg } from './token-dialect.mjs';

/**
 * Reads a token file (hirobius.tokens.json) into the HDS form the build
 * scripts use. See token-dialect.mjs for what differs from the file on disk.
 * @param {string} file absolute path
 */
export function readTokenSource(file) {
  return fromDtcg(JSON.parse(readFileSync(file, 'utf8')));
}
