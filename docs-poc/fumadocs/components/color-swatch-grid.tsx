interface Swatch {
  name: string;
  variable: string;
}

interface ColorSwatchGridProps {
  title: string;
  swatches: Swatch[];
}

/**
 * Renders real HDS token swatches by pointing each tile at the live CSS
 * variable (via `var()`), not a hard-coded hex — so it reflects whichever
 * theme (light/dark) is active, exactly like the tokens do everywhere else.
 */
export function ColorSwatchGrid({ title, swatches }: ColorSwatchGridProps) {
  return (
    <div>
      <p className="hds-preview-row-label">{title}</p>
      <div className="hds-swatch-grid">
        {swatches.map((swatch) => (
          <div className="hds-swatch" key={swatch.variable}>
            <div className="hds-swatch-color" style={{ background: `var(${swatch.variable})` }} />
            <div className="hds-swatch-meta">
              <div className="hds-swatch-name">{swatch.name}</div>
              <div className="hds-swatch-value">{swatch.variable}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
