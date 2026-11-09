'use client';

/**
 * The Icons foundation visuals. hds#1396 removed the full gallery: the glyphs are Lucide's
 * (ISC), so the page shows a short sample and links to the Lucide site for the full set.
 */
import { Icon } from '@hirobius/design-system';
import * as Icons from '@hirobius/design-system/icons';
import type { LucideIcon } from 'lucide-react';

const ICONS = Icons as unknown as Record<string, LucideIcon>;

/** Icons HDS components draw themselves (hds#1396): a short sample, not the whole set. */
export const SAMPLE_ICONS = ['X', 'Check', 'ChevronDown', 'Copy', 'Search', 'Info'] as const;

/**
 * A row of the icons HDS components use internally. The full set lives on the Lucide site;
 * HDS re-exports a curated subset and does not own the glyphs.
 */
export function IconSample() {
  return (
    <ul className="hds-icon-grid not-prose" aria-label="Icons HDS components use">
      {SAMPLE_ICONS.map((name) => (
        <li key={name} className="hds-icon-tile">
          <Icon icon={ICONS[name]!} size="large" />
          <code className="hds-step-name">{name}</code>
        </li>
      ))}
    </ul>
  );
}

/** The three icon boxes, drawn with the Icon `size` value that maps to each token. */
export function IconSizes({
  steps,
}: {
  steps: { token: string; name: string; value: string; prop: string | null }[];
}) {
  return (
    <div className="hds-radius-grid">
      {steps.map((s) => (
        <div key={s.token} className="hds-radius-item">
          <span className="hds-icon-size-box">
            <Icon icon={Icons.Star} size={s.prop ?? s.value} />
          </span>
          <code className="hds-step-name">{s.name}</code>
          <span className="hds-step-value">{s.value}</span>
          {s.prop ? <span className="hds-step-value">size=&quot;{s.prop}&quot;</span> : null}
        </div>
      ))}
    </div>
  );
}
