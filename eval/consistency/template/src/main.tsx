import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@hirobius/design-system/tokens.css';
import { App } from './App';

// The template owns the documented scope: `data-hds` opts the subtree into the
// package's base styles and `data-theme` picks the mode, read from ?theme=light|dark
// so the harness can capture and scan one build in both. The wrapper paints the
// page surface so a short screen does not leave a white strip in dark mode.
// Generated apps replace only src/, never this file.
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
