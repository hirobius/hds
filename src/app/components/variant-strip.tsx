/**
 * VariantStrip — horizontal strip of labeled component specimens for
 * component documentation pages. Renders each variant as a named column
 * so readers can scan the full variant family at a glance.
 *
 * Usage:
 *   <VariantStrip
 *     label="Variant"
 *     variants={[
 *       { label: 'Primary', node: <Button variant="primary">Save</Button> },
 *       { label: 'Secondary', node: <Button variant="secondary">Save</Button> },
 *     ]}
 *   />
 *
 * @category Utilities
 * @internal — documentation helper, not part of public HDS API.
 * @doc-exempt: documentation utility used to render variant family strips in component docs.
 */
import type { ReactNode } from 'react';
import hds from '../design-system/tokens';

export type VariantStripItem = {
  /** Short label displayed above the specimen (e.g. "Primary", "SM"). */
  label: string;
  /** The rendered specimen node. */
  node: ReactNode;
};

interface VariantStripProps {
  /** Section heading printed above the strip (e.g. "Variant", "Size"). */
  label?: string;
  /** Array of labeled specimen items to render in sequence. */
  variants: VariantStripItem[];
}

/**
 * VariantStrip renders a horizontal family strip of component specimens
 * with short labels. Designed for component docs to show all variants,
 * sizes, or tones in a single scannable row.
 */
export function VariantStrip({ label, variants }: VariantStripProps) {
  if (variants.length === 0) return null;

  return (
    <div style={{ marginTop: hds.semantic.space.component.gap }}>
      {label && (
        <p
          style={{
            ...hds.typeStyles.ui,
            color: 'var(--semantic-color-content-primary)',
            margin: 0,
            marginBottom: hds.semantic.space.component.gap,
          }}
        >
          {label}
        </p>
      )}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: hds.semantic.space.component.gap,
          alignItems: 'flex-end',
        }}
      >
        {variants.map((item, i) => (
          <div
            key={item.label ?? i}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: `calc(${hds.semantic.space.component.gap} / 2)`,
            }}
          >
            <span
              style={{
                ...hds.typeStyles.caption,
                color: 'var(--semantic-color-content-secondary)',
              }}
            >
              {item.label}
            </span>
            {item.node}
          </div>
        ))}
      </div>
    </div>
  );
}
