/**
 * The doc page title's weight comes from the semantic h1 token (bold, 700 —
 * a face fonts.css actually ships), never a hard-coded utility. Adrian's call
 * on #289: titles stay bold.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { DocPageHeader } from './doc-page-header';

afterEach(cleanup);

describe('DocPageHeader title', () => {
  it('takes its weight from the h1 token, not a fixed utility', () => {
    const { getByRole } = render(<DocPageHeader spec={{ name: 'Button', tier: 'primitive' }} />);
    const title = getByRole('heading', { level: 1 });
    expect(title.className).toContain('[font-weight:var(--semantic-typography-h1-font-weight)]');
    expect(title.className).not.toMatch(/\bfont-(medium|semibold|bold)\b/);
  });
});
