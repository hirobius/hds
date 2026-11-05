/**
 * InlineLink ” inline navigation and external-link primitive for body copy.
 * @category Navigation
 * @tier primitive
 * @usage Link to a route or external URL from inside body copy.
 * @whenNot An action that changes something, or a control that needs button styling.
 * @useInstead Button an action or a link that needs button styling
 * @useInstead Text unlinked body copy
 * @a11y component required a11y:inline-link.real-anchor Every href renders a real link (<a href>), so keyboard, middle-click and screen-reader link lists work.
 * @a11y component required a11y:inline-link.keyboard-reach Tab reaches each link in document order.
 * @a11y component required a11y:inline-link.new-tab-notice An external link opens a new tab and says so in text (visually hidden), and its icon is decorative.
 * @a11y component required a11y:inline-link.focus-ring A focused link draws the shared focus ring.
 * @a11y component required a11y:inline-link.not-colour-only Links are underlined at rest, so they are not told apart from body text by colour alone (WCAG 1.4.1).
 * @a11y consumer required Write link text that says where it goes, without relying on the surrounding sentence (WCAG 2.4.4).
 * @figma https://www.figma.com/design/2VgBbVpKiDnu0aftJEVyBQ/HDS-Tokens-Components?node-id=89-161
 */
import React from 'react';
import { SquareArrowOutUpRight as ExternalLinkIcon } from 'lucide-react';
import { useHdsRouter } from '../context/RouterContext';
import { safeHref } from '../../lib/safe-href';
import { Icon } from './icon';

export interface InlineLinkProps {
  /** Destination route or URL. */
  href: string;
  /** Inline label or content to render inside the link. */
  children: React.ReactNode;
  /** Append the external-link icon for non-internal URLs. */
  externalIcon?: boolean;
  /** The link stands on its own, outside running text (such as "Back to companies"): it gets a 24px hit area, 44px tall on touch, without moving the layout. */
  standalone?: boolean;
  /**
   * Set the link's own type role: `sm` = ui, `md` = body, `lg` = title. Leave it unset inside
   * running text so the link inherits the surrounding size. The external icon follows either way.
   */
  size?: InlineLinkSize;
}

/** @public */
export type InlineLinkSize = 'sm' | 'md' | 'lg';

/** Each size's type role (`.hds-type-<role>`, semantic.typography.<role>). */
const SIZE_ROLE: Record<InlineLinkSize, 'ui' | 'body' | 'title'> = {
  sm: 'ui',
  md: 'body',
  lg: 'title',
};

// ── InlineLink ─────────────────────────────────────────────────────────────────
// Single source of truth for all inline body text links in HDS docs.
//
// Internal links (one leading "/", not "//") → router <Link> (client-side nav)
// Plain links (#hash, mailto:, tel:, other relative/non-http hrefs)
//                                            → <a> in the same tab, no external icon
// External links (http(s):// and //host)     → <a target="_blank" rel="noopener noreferrer">
//                                         + optional ExternalLink icon after the label, sized and
//                                           spaced in em (component.inlineLink.iconSize / iconGap)
//                                           so it scales with the text at any font size
//                                         + visually-hidden "(opens in new tab)"
//
// Visual contract (C2): text and underline are both content.primary at rest and turn
// content.secondary together on hover; always underlined (links must not rely on colour
// alone). A standalone link gets a 24px hit area (44px tall on touch).
//
// To change link styling site-wide: edit .hds-link in theme.css. The hover colour
// transition lives there (productive motion token).
//
// Motion (hds#751): an external link's icon nudges 0.125em up-right on hover and
// keyboard focus, a CSS translate on the productive motion token. theme.css zeroes
// that duration under prefers-reduced-motion, so the icon then stays still.
// group-hover only applies on hover-capable pointers (Tailwind v4), so touch
// never leaves the icon stuck nudged.
const EXTERNAL_ICON_NUDGE =
  'transition-[translate] duration-[var(--hds-motion-productive-duration)] ease-[var(--hds-motion-productive-easing)] group-hover:translate-x-[0.125em] group-hover:-translate-y-[0.125em] group-focus-visible:translate-x-[0.125em] group-focus-visible:-translate-y-[0.125em]';

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
export function InlineLink({
  href,
  children,
  externalIcon = true,
  standalone = false,
  size,
}: InlineLinkProps) {
  const { LinkComponent } = useHdsRouter();
  const kind = classifyHref(href);
  const safe = safeHref(href);
  const modifierClass =
    (standalone ? ' hds-link-standalone' : '') + (size ? ` hds-type-${SIZE_ROLE[size]}` : '');

  if (kind === 'internal') {
    return (
      <LinkComponent to={safe} className={`hds-focus hds-link${modifierClass}`}>
        {children}
      </LinkComponent>
    );
  }

  if (kind === 'plain') {
    return (
      <a href={safe} className={`hds-focus hds-link${modifierClass}`}>
        {children}
      </a>
    );
  }

  return (
    <a
      href={safe}
      target="_blank"
      rel="noopener noreferrer"
      className={`group hds-focus hds-link${modifierClass}`}
    >
      {children}
      <span className="sr-only"> (opens in new tab)</span>
      {externalIcon && (
        <Icon
          icon={ExternalLinkIcon}
          size="var(--component-inlineLink-iconSize)"
          color="currentColor"
          aria-hidden
          className={EXTERNAL_ICON_NUDGE}
          style={{
            display: 'inline',
            verticalAlign: 'middle',
            marginLeft: 'var(--component-inlineLink-iconGap)',
          }}
        />
      )}
    </a>
  );
}
