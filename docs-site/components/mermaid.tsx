'use client';

import { useEffect, useId, useState } from 'react';

/** Mermaid theme variables -> the HDS semantic token each one reads. */
const THEME_TOKENS = {
  background: '--semantic-color-surface-page',
  primaryColor: '--semantic-color-surface-raised',
  secondaryColor: '--semantic-color-surface-muted',
  tertiaryColor: '--semantic-color-surface-raised',
  primaryTextColor: '--semantic-color-content-primary',
  secondaryTextColor: '--semantic-color-content-primary',
  tertiaryTextColor: '--semantic-color-content-primary',
  textColor: '--semantic-color-content-primary',
  primaryBorderColor: '--semantic-color-border-default',
  secondaryBorderColor: '--semantic-color-border-default',
  tertiaryBorderColor: '--semantic-color-border-default',
  lineColor: '--semantic-color-content-secondary',
  edgeLabelBackground: '--semantic-color-surface-page',
} as const;

function themeVariables() {
  const style = getComputedStyle(document.documentElement);
  const vars: Record<string, string> = {
    fontFamily: style.getPropertyValue('--primitive-typography-family-primary').trim(),
    // Mermaid lays out at this size and the SVG then scales to the column, so
    // a larger base keeps labels readable once a wide chart is scaled down.
    fontSize: '18px',
  };
  for (const [key, token] of Object.entries(THEME_TOKENS)) {
    const value = style.getPropertyValue(token).trim();
    if (value) vars[key] = value;
  }
  return vars;
}

/** <html data-theme>, which the RootProvider flips with the theme toggle. */
function useHtmlTheme() {
  const [theme, setTheme] = useState<string | null>(null);
  useEffect(() => {
    const html = document.documentElement;
    const read = () => setTheme(html.getAttribute('data-theme') ?? 'light');
    read();
    const observer = new MutationObserver(read);
    observer.observe(html, { attributes: true, attributeFilter: ['data-theme', 'class'] });
    return () => observer.disconnect();
  }, []);
  return theme;
}

/**
 * A Mermaid diagram drawn with HDS token colors, redrawn when the theme
 * changes. Mermaid loads only on pages that have a diagram; until it renders
 * (or if it fails) the diagram source shows as a code block.
 */
export function Mermaid({ chart }: { chart: string }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const theme = useHtmlTheme();
  const [svg, setSvg] = useState<string | null>(null);

  useEffect(() => {
    if (!theme) return;
    let cancelled = false;
    (async () => {
      try {
        const { default: mermaid } = await import('mermaid');
        mermaid.initialize({
          startOnLoad: false,
          theme: 'base',
          themeVariables: themeVariables(),
          securityLevel: 'strict',
        });
        const { svg: out } = await mermaid.render(`mermaid-${id}-${theme}`, chart);
        if (!cancelled) setSvg(out);
      } catch {
        if (!cancelled) setSvg(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [chart, id, theme]);

  if (!svg) {
    return (
      <pre>
        <code>{chart}</code>
      </pre>
    );
  }
  return (
    <figure
      className="hds-mermaid"
      // Scrolls sideways on a narrow screen, so it must take keyboard focus.
      tabIndex={0}
      role="group"
      aria-label="Diagram, scrolls sideways on narrow screens"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
