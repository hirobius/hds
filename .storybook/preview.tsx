/**
 * Storybook 8 global preview — wraps every story with HDS providers and styles.
 */
import type { Preview } from '@storybook/react';
import React from 'react';
import { MemoryRouter } from 'react-router';
import { ThemeProvider } from '../src/app/context/ThemeContext';
import '../src/styles/index.css';

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      // Run axe-core on every story automatically.
      config: {},
    },
  },
  decorators: [
    // MemoryRouter mirrors the app shell: primitives such as Token call
    // react-router hooks (useNavigate/useLocation), which throw outside a
    // Router. Without this, any story rendering a Token (e.g. FoundationSwatch
    // with a tokenPath) errors in Chromatic. See src/app/components/token.tsx.
    (Story) => (
      <MemoryRouter>
        <ThemeProvider>
          <div style={{ padding: '24px', minHeight: '100vh' }}>
            <Story />
          </div>
        </ThemeProvider>
      </MemoryRouter>
    ),
  ],
};

export default preview;
