/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * isDocCommentLine (scripts/check-link-integrity.mjs): the route-links gate
 * flagged `<a href="/ops/leads">` inside card.tsx's JSDoc usage example. A
 * docblock example shows a consumer's markup; it is not a link this app renders.
 */
import { describe, it, expect } from 'vitest';
import { isDocCommentLine } from '../check-link-integrity.mjs';

describe('isDocCommentLine', () => {
  it('treats a JSDoc body line as documentation', () => {
    expect(isDocCommentLine(' *     <a href="/ops/leads"><Card.Title>Leads</Card.Title></a>')).toBe(
      true,
    );
    expect(isDocCommentLine('/** <a href="/x"> */')).toBe(true);
  });

  it('still scans live JSX', () => {
    expect(isDocCommentLine('      <a href="/ops/leads">Leads</a>')).toBe(false);
    expect(isDocCommentLine('  const x = a * b; <Link to="/y" />')).toBe(false);
  });
});
