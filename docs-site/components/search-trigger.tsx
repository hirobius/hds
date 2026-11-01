'use client';

import type {
  FullSearchTriggerProps,
  SearchTriggerProps,
} from 'fumadocs-ui/layouts/shared/slots/search-trigger';
import { useSearchContext } from 'fumadocs-ui/contexts/search';
import { Kbd } from '@hirobius/design-system';

function SearchIcon() {
  return (
    <svg
      aria-hidden="true"
      className="hds-docs-search-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

/**
 * The docs search triggers, in place of Fumadocs' defaults, which draw the shortcut as plain
 * <kbd> boxes (hds#903). Same behaviour (opens Fumadocs' dialog, hotkeys stay on the provider);
 * the shortcut is the HDS Kbd. The hotkey's display is "Ctrl" on Windows and Linux and "⌘"
 * elsewhere, so the platform switch stays Fumadocs'.
 */
export function SearchTriggerFull({ hideIfDisabled, className, ...props }: FullSearchTriggerProps) {
  const { enabled, hotKey, setOpenSearch } = useSearchContext();
  if (hideIfDisabled && !enabled) return null;
  return (
    <button
      type="button"
      data-search-full=""
      {...props}
      className={`hds-docs-search ${className ?? ''}`.trim()}
      onClick={() => setOpenSearch(true)}
    >
      <SearchIcon />
      <span className="hds-docs-search-label">Search</span>
      <span className="hds-docs-search-keys" aria-hidden="true">
        {hotKey.map((k, i) => (
          <Kbd key={i} size="sm">
            <>{k.display}</>
          </Kbd>
        ))}
      </span>
    </button>
  );
}

export function SearchTriggerSmall({
  hideIfDisabled,
  className,
  // Fumadocs' button-variant props: unused, but kept off the DOM button.
  size: _size,
  color: _color,
  variant: _variant,
  ...props
}: SearchTriggerProps) {
  const { enabled, setOpenSearch } = useSearchContext();
  if (hideIfDisabled && !enabled) return null;
  return (
    <button
      type="button"
      data-search=""
      aria-label="Search"
      {...props}
      className={`hds-docs-search hds-docs-search-icon-only ${className ?? ''}`.trim()}
      onClick={() => setOpenSearch(true)}
    >
      <SearchIcon />
    </button>
  );
}
