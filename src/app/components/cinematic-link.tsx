/**
 * CinematicLink - cinematic editorial link treatment for portfolio surfaces.
 * @category Branding
 * @tier primitive
 */
// motion-ok: CinematicLink uses custom CSS transition timing (cubic-bezier expo-out).
  // The 0.5s theatrical slide is intentional design direction — semantic motion tokens
  // are too short for this specific cinematic micro-interaction.
import React from 'react';
import hds from '../design-system/tokens';

interface CinematicLinkProps extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'children'> {
  href: string;
  children: string;
}

/** @public */
export function CinematicLink({ href, children, style, className, ...rest }: CinematicLinkProps) {
  return (
    <a
      href={href}
      className={['group relative inline-flex overflow-hidden no-underline hds-focus', className].filter(Boolean).join(' ')}
      style={{
        ...hds.typeStyles.ui,
        color: 'var(--semantic-color-content-primary)',
        height: '1.2em',
        ...style,
      }}
      {...rest}
    >
      {/* The text that slides up */}
      <span
        className="relative inline-block transition-transform duration-500 group-hover:-translate-y-full"
        style={{ transitionTimingFunction: 'cubic-bezier(0.19, 1, 0.22, 1)' }}
      >
        {children}
        {/* Duplicate underneath — invisible until the parent slides it into view on hover */}
        <span className="absolute left-0 top-full w-full h-full invisible group-hover:visible" aria-hidden="true">
          {children}
        </span>
      </span>

      {/* Animated underline */}
      <span
        className="absolute bottom-0 left-0 w-full h-px bg-current origin-right scale-x-0 transition-transform duration-500 group-hover:scale-x-100 group-hover:origin-left"
        style={{ transitionTimingFunction: 'cubic-bezier(0.19, 1, 0.22, 1)' }}
      />
    </a>
  );
}
