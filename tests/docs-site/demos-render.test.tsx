/**
 * Demo render gates: every live demo on the docs site (the DEMOS registry in
 * docs-site/components/component-demos.tsx) mounts in jsdom without throwing,
 * and server-renders without an HTML-escaped entity inside a <style> element.
 * They replace the per-story render and SSR gates that went with Storybook:
 * the demos are now what the docs site, the axe gate and Chromatic render.
 *
 * Why the SSR half exists (hds#284): React's server renderer HTML-escapes a JSX
 * `<style>{css}</style>` text child (`"` becomes `&quot;`), but browsers read
 * `<style>` as raw text, so the selector stays broken until hydration. Use
 * `<style dangerouslySetInnerHTML={{ __html: css }} />` (security-ok: quoted in
 * prose, not rendered).
 *
 * The demos import the published package; here it resolves to the source, so
 * the gate tests this commit's components rather than a stale dist.
 */
import { describe, expect, it } from 'vitest';
import * as React from 'react';
import { render } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';

const { DEMOS } = await import('../../docs-site/components/component-demos');

const STYLE_WITH_ENTITY = /<style[^>]*>[^<]*&(?:quot|amp|lt|gt|#39|#x27);[^<]*<\/style>/;

describe('docs demos', () => {
  const entries = Object.entries(DEMOS) as [string, () => React.ReactNode][];

  it('cover at least the 40 core components and 12 patterns', () => {
    expect(entries.length).toBeGreaterThanOrEqual(52);
  });

  for (const [name, Demo] of entries) {
    it(`${name} mounts`, () => {
      render(<div data-hds="">{React.createElement(Demo)}</div>);
    });

    it(`${name} server-renders with no escaped entity in a <style>`, () => {
      const html = renderToStaticMarkup(<div data-hds="">{React.createElement(Demo)}</div>);
      expect(html).not.toMatch(STYLE_WITH_ENTITY);
    });
  }
});
