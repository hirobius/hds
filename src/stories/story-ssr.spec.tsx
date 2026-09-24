/**
 * Story SSR gate — server-renders every Storybook story export through
 * `renderToStaticMarkup` and fails if any produces an HTML-escaped entity
 * inside a `<style>` element.
 *
 * Why this exists (hds#284): a JSX `<style>{STYLES}</style>` text child is
 * HTML-entity-escaped by React's server renderer (`"` → `&quot;`), but
 * browsers parse `<style>` as raw text, so the entity is never decoded and
 * the CSS selector is invalid until hydration replaces the subtree. Nothing
 * previously exercised this codebase's own SSR path — Storybook and
 * `story-render.spec.tsx` (the jsdom mount gate) both only ever client-render,
 * so this class of bug is invisible to every other gate.
 *
 * Canary: reverting the hds#284 fix (`<style>{STYLES}</style>` instead of
 * `<style dangerouslySetInnerHTML={{ __html: STYLES }} />` in
 * stacked-card-rail.tsx) makes this test fail, naming
 * "stacked-card-rail › Default" (or whichever exported story renders first).
 *
 * Stories are wrapped in the SAME providers as .storybook/preview.tsx
 * (MemoryRouter + ThemeProvider) so this gate stays faithful to how the
 * component actually renders, mirroring story-render.spec.tsx.
 */
import { describe, expect, it } from 'vitest';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { ThemeProvider } from '../app/context/ThemeContext';

type Args = Record<string, unknown>;
interface StoryObj {
  args?: Args;
  render?: (args: Args, ctx: { args: Args }) => React.ReactNode;
}
interface StoryModule {
  default?: { component?: React.ComponentType<Args> };
  [exportName: string]: unknown;
}

const modules = import.meta.glob<StoryModule>('./*.stories.tsx', { eager: true });

/** HTML entities that must never appear inside a `<style>...</style>` region:
 * browsers parse `<style>` content as raw text, so an entity written there by
 * React's server renderer is never decoded and the CSS is broken. */
const ENTITY_IN_STYLE_RE = /<style[^>]*>([\s\S]*?)<\/style>/g;
const ESCAPED_ENTITY_RE = /&quot;|&#39;|&apos;|&amp;lt;|&amp;gt;/;

function findEscapedStyleEntities(html: string): string[] {
  const hits: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = ENTITY_IN_STYLE_RE.exec(html)) !== null) {
    if (ESCAPED_ENTITY_RE.test(m[1])) {
      hits.push(m[1].slice(0, 120));
    }
  }
  return hits;
}

for (const [path, mod] of Object.entries(modules)) {
  const name = path.replace('./', '').replace('.stories.tsx', '');
  describe(name, () => {
    for (const [exportName, story] of Object.entries(mod)) {
      if (exportName === 'default' || exportName === '__esModule') continue;
      if (!story || typeof story !== 'object') continue;
      const s = story as StoryObj;
      it(`server-renders ${exportName} with no escaped entities inside <style>`, () => {
        const meta = mod.default ?? {};
        const Comp = s.render
          ? () => s.render!(s.args ?? {}, { args: s.args ?? {} })
          : () => {
              const C = meta.component;
              return C ? <C {...(s.args ?? {})} /> : null;
            };
        const html = renderToStaticMarkup(
          <MemoryRouter>
            <ThemeProvider>
              <Comp />
            </ThemeProvider>
          </MemoryRouter>,
        );
        const hits = findEscapedStyleEntities(html);
        expect(
          hits,
          `${name} › ${exportName}: server-rendered <style> content contains an ` +
            'HTML-escaped entity (e.g. &quot;). Browsers parse <style> as raw text, so ' +
            'the entity is never decoded and the CSS is broken until hydration replaces ' +
            'the subtree (hds#284). Use <style dangerouslySetInnerHTML={{ __html: ... }} /> ' +
            'instead of <style>{cssString}</style>.',
        ).toEqual([]);
      });
    }
  });
}
