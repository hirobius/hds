/**
 * InlineLink ” inline navigation and external-link primitive for body copy.
 * @category Navigation
 * @tier primitive
 * @usage Link to a route or external URL from inside body copy.
 * @whenNot An action that changes something, or a control that needs button styling.
 * @useInstead Button an action or a link that needs button styling
 * @useInstead Text unlinked body copy
 * @figma https://www.figma.com/design/2VgBbVpKiDnu0aftJEVyBQ/HDS-Tokens-Components?node-id=89-161
 */
import React from 'react';
import { SquareArrowOutUpRight as ExternalLinkIcon } from 'lucide-react';
import hds from '../design-system/tokens';
import { useHdsRouter } from '../context/RouterContext';
import { Icon } from './icon';

export interface InlineLinkProps {
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
// Internal links (one leading "/", not "//") → router <Link> (client-side nav)
// Plain links (#hash, mailto:, tel:, other relative/non-http hrefs)
//                                            → <a> in the same tab, no external icon
// External links (http(s):// and //host)     → <a target="_blank" rel="noopener noreferrer">
//                                         + optional small ExternalLink icon after the label
//                                         + visually-hidden "(opens in new tab)"
//
// Visual contract: semantic accent-content token (mode-aware lightness), always underlined
// (accessibility requirement — links must not rely on color alone), underline
// fades to 40% tint at rest and steps up to full on hover.
//
// To change link styling site-wide: edit .hds-link in theme.css.
// Hover state handled by CSS .hds-link class — no JS state needed.
// motion-ok: transitions handled by .hds-link CSS class (color + underline, primitive-duration-fast via CSS)

type LinkKind = 'internal' | 'external' | 'plain';

/**
 * Classify an href. Only a same-origin absolute path (a single leading "/") goes
 * to the router; "//host" and "/\host" are protocol-relative, so they are external.
 * Only http(s) and protocol-relative URLs open a new tab; #hash, mailto:, tel: and
 * anything else stay in the current tab as plain anchors.
 */
function classifyHref(href: string): LinkKind {
  const value = href.trim();
  if (value.startsWith('//') || value.startsWith('/\\')) return 'external';
  if (value.startsWith('/')) return 'internal';
  if (/^https?:/i.test(value)) return 'external';
  return 'plain';
}

/** @public */
export function InlineLink({ href, children, externalIcon = true }: InlineLinkProps) {
  const { LinkComponent } = useHdsRouter();
  const kind = classifyHref(href);

  if (kind === 'internal') {
    return (
      <LinkComponent to={href} className="hds-focus hds-link">
        {children}
      </LinkComponent>
    );
  }

  if (kind === 'plain') {
    return (
      <a href={href} className="hds-focus hds-link">
        {children}
      </a>
    );
  }

  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="hds-focus hds-link">
      {children}
      <span className="sr-only"> (opens in new tab)</span>
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
