/**
 * InlineLink ” inline navigation and external-link primitive for body copy.
 * @category Navigation
 * @tier primitive
 */
import React from 'react';
import { SquareArrowOutUpRight as ExternalLinkIcon } from 'lucide-react';
import { useHdsRouter } from '../context/RouterContext';
import hds from '../design-system/tokens';
import { Icon } from './icon';

interface InlineLinkProps {
  /** Destination route or URL. */
  href: string;
  /** Inline label or content to render inside the link. */
  children: React.ReactNode;
  /** Append the external-link icon for non-internal URLs. */
  externalIcon?: boolean;
}

// ── InlineLink ─────────────────────────────────────────────────────────────────
// Single source of truth for all inline body text links in HDS docs.
//
// Internal links (href starts with "/") → React Router <Link> (client-side nav)
// External links (everything else)      → <a target="_blank" rel="noopener noreferrer">
//                                         + optional small ExternalLink icon after the label
//
// Visual contract: semantic accent-content token (mode-aware lightness), always underlined
// (accessibility requirement — links must not rely on color alone), underline
// fades to 40% tint at rest and steps up to full on hover.
//
// To change link styling site-wide: edit .hds-link in theme.css.
// Hover state handled by CSS .hds-link class — no JS state needed.
// motion-ok: transitions handled by .hds-link CSS class (color + underline, primitive-duration-fast via CSS)

/** @public */
export function InlineLink({ href, children, externalIcon = true }: InlineLinkProps) {
  const { LinkComponent } = useHdsRouter();
  if (href.startsWith('/')) {
    return (
      <LinkComponent to={href} className="hds-link">
        {children}
      </LinkComponent>
    );
  }

  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="hds-focus hds-link">
      {children}
      {externalIcon && (
        <Icon
          icon={ExternalLinkIcon}
          size={11}
          color="currentColor"
          aria-hidden
          style={{
            display: 'inline',
            verticalAlign: 'middle',
            marginLeft: hds.semantic.space.subgrid.xs,
            marginBottom: hds.semantic.space.subgrid.hairline,
          }}
        />
      )}
    </a>
  );
}
