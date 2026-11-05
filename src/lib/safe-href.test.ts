import { describe, expect, it } from 'vitest';
import { BLOCKED_HREF, safeHref } from './safe-href';

describe('safeHref (hds#1145)', () => {
  it.each([
    '/docs/tokens',
    '#section',
    'docs/tokens',
    '../up',
    '?q=1',
    'https://example.com/a?b=c',
    'http://example.com',
    '//cdn.example.com/x',
    'mailto:hi@example.com',
    'tel:+15555550100',
    'sms:+15555550100',
    '',
  ])('keeps a safe href unchanged: %s', (href) => {
    expect(safeHref(href)).toBe(href);
  });

  it.each([
    'javascript:alert(1)',
    'JavaScript:alert(1)',
    '  javascript:alert(1)',
    '\u0000javascript:alert(1)',
    '\u001fjavascript:alert(1)',
    'java\tscript:alert(1)',
    'java\nscript:alert(1)',
    'java\rscript:alert(1)',
    'vbscript:msgbox(1)',
    'data:text/html,<script>alert(1)</script>',
    'DATA:text/html;base64,PHNjcmlwdD4=',
  ])('blocks a script-capable href: %j', (href) => {
    expect(safeHref(href)).toBe(BLOCKED_HREF);
  });

  it('does not treat a path that holds "javascript:" later as a scheme', () => {
    expect(safeHref('/search?q=javascript:alert(1)')).toBe('/search?q=javascript:alert(1)');
  });
});
