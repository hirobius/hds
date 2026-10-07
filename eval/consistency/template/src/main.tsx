import { StrictMode, type ComponentType } from 'react';
import { createRoot } from 'react-dom/client';
import '@hirobius/design-system/tokens.css';
import '@hirobius/design-system/fonts.css';
import * as entry from './App';

// The template owns the documented scope: `data-hds` opts the subtree into the
// package's base styles and `data-theme` picks the mode, read from ?theme=light|dark
// so the harness can capture and scan one build in both. The wrapper paints the
// page surface so a short screen does not leave a white strip in dark mode.
// Generated apps replace only src/, never this file.
// The spec asks for src/App.tsx as the entry without fixing how it exports, so
// either `export default` or `export function App` mounts.
const { default: Default, App: Named } = entry as { default?: ComponentType; App?: ComponentType };
const App = Default ?? Named;
if (!App) throw new Error('src/App.tsx must export the root component as default or as App');

const theme =
  new URLSearchParams(window.location.search).get('theme') === 'dark' ? 'dark' : 'light';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div
      data-hds
      data-theme={theme}
      style={{ minHeight: '100vh', backgroundColor: 'var(--semantic-color-surface-page)' }}
    >
      <App />
    </div>
  </StrictMode>,
);
