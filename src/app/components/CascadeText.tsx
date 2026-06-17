/** @internal — utility-tier component; not part of @hirobius/design-system public API. */
// @doc-exempt: internal animation helper, not a consumer-facing HDS component
import React, { useEffect, useState } from 'react';

interface CascadeTextProps {
  text: string;
  className?: string;
  delay?: number; // Delay per character in seconds
  isVisible?: boolean; // Control when animation triggers
  tag?: 'h1' | 'h2' | 'h3' | 'p' | 'span';
}

export default function CascadeText({ 
  text, 
  className = '', 
  delay = 0.03,
  isVisible = true,
  tag = 'span'
}: CascadeTextProps) {
  const [shouldAnimate, setShouldAnimate] = useState(false);

  useEffect(() => {
    if (!text || typeof text !== 'string') return;
    if (isVisible) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => setShouldAnimate(true), 50);
      return () => clearTimeout(timer);
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShouldAnimate(false);
    }
  }, [isVisible, text]);
  
  // Safety check: return null if text is undefined or empty
  if (!text || typeof text !== 'string') {
    return null;
  }
  
  const words = text.trim().split(/\s+/);
  let charIndex = 0;

  const _tag = tag;

  return (
    <span
      className={className}
      aria-label={text}
      style={{ display: 'inline-block' }}
    >
      {words.map((word, wordIndex) => {
        const wordChars = word.split('');
        
        return (
          // Use a real element instead of React.Fragment — Figma's inspector
          // injects data-* props that Fragment cannot accept (only key + children).
          // display:contents makes the wrapper invisible to layout.
          <span key={wordIndex} style={{ display: 'contents' }}>
            <span
              style={{
                display: 'inline-flex',
                overflow: 'hidden',
                verticalAlign: 'bottom',
                paddingBottom: '0.1em',
                marginBottom: '-0.1em',
              }}
            >
              {wordChars.map((char, charIdx) => {
                const currentCharIndex = charIndex++;
                return (
                  <span
                    key={charIdx}
                    aria-hidden="true"
                    style={{
                      display: 'inline-block',
                      transform: shouldAnimate ? 'translateY(0)' : 'translateY(100%)',
                      transition: `transform 0.8s cubic-bezier(0.19, 1, 0.22, 1) ${currentCharIndex * delay}s`, // audit-ok: orchestrated stagger — custom cubic-bezier + computed per-char delay; semantic motion tokens do not cover this easing curve
                    }}
                  >
                    {char}
                  </span>
                );
              })}
            </span>
            {wordIndex < words.length - 1 && (
              <span aria-hidden="true">&nbsp;</span>
            )}
          </span>
        );
      })}
    </span>
  );
}

