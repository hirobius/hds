'use client';

/**
 * The Icons foundation gallery (hds#1229): every icon the
 * `@hirobius/design-system/icons` entry exports, with a search field. The list is
 * read from the export at build time, so it cannot drift from the package.
 */
import { useId, useMemo, useState } from 'react';
import { Icon, Input } from '@hirobius/design-system';
import * as Icons from '@hirobius/design-system/icons';
import type { LucideIcon } from 'lucide-react';

import { filterIconNames, iconNames } from '../lib/icon-gallery';

const ICONS = Icons as unknown as Record<string, LucideIcon>;
const NAMES = iconNames(ICONS);

export function IconGallery() {
  const [query, setQuery] = useState('');
  const shown = useMemo(() => filterIconNames(NAMES, query), [query]);
  const listId = useId();

  return (
    <div className="hds-icon-gallery not-prose">
      <Input
        type="search"
        label="Search icons"
        placeholder="Search by name, such as arrow or check"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-controls={listId}
        autoComplete="off"
      />
      <p role="status" className="hds-visual-note">
        {shown.length} of {NAMES.length} icons
      </p>
      {shown.length ? (
        <ul id={listId} className="hds-icon-grid" aria-label="Icons">
          {shown.map((name) => (
            <li key={name} className="hds-icon-tile">
              <Icon icon={ICONS[name]!} size="large" />
              <code className="hds-step-name">{name}</code>
            </li>
          ))}
        </ul>
      ) : (
        <p id={listId} className="hds-visual-note">
          No icon matches “{query.trim()}”. Ask for a new icon in an issue.
        </p>
      )}
    </div>
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
