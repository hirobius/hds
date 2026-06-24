/**
 * Story-render smoke gate — renders every Storybook story export through jsdom
 * and fails if any throws on mount. Catches the "component error" class of
 * Chromatic build failure (a story that throws during render) in plain `pnpm
 * test`, without needing a browser or network access to chromatic.com.
 *
 * Stories are wrapped in the SAME providers as .storybook/preview.tsx
 * (MemoryRouter + ThemeProvider) so this gate stays faithful to how Chromatic
 * actually renders them. If you add a provider to the preview, mirror it here.
 */
import { describe, it } from 'vitest';
import * as React from 'react';
import { render } from '@testing-library/react';
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

for (const [path, mod] of Object.entries(modules)) {
  const name = path.replace('./', '').replace('.stories.tsx', '');
  describe(name, () => {
    for (const [exportName, story] of Object.entries(mod)) {
      if (exportName === 'default' || exportName === '__esModule') continue;
      if (!story || typeof story !== 'object') continue;
      const s = story as StoryObj;
      it(`renders ${exportName}`, () => {
        const meta = mod.default ?? {};
        const Comp = s.render
          ? () => s.render!(s.args ?? {}, { args: s.args ?? {} })
          : () => {
              const C = meta.component;
              return C ? <C {...(s.args ?? {})} /> : null;
            };
        render(
          <MemoryRouter>
            <ThemeProvider>
              <Comp />
            </ThemeProvider>
          </MemoryRouter>,
        );
      });
    }
  });
}
