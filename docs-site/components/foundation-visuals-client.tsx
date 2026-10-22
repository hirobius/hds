'use client';

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Button, Kbd, Tag, Text } from '@hirobius/design-system';

/**
 * A swatch card that copies its token name on tap. The whole card is the
 * button, so the target is large on a phone; the status line is announced.
 */
export function CopyCard({ copy, children }: { copy: string; children: ReactNode }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const onClick = async () => {
    try {
      await navigator.clipboard.writeText(copy);
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1200);
    } catch {
      // Clipboard blocked (insecure context, permissions): the name is on the card to select.
    }
  };
  return (
    <div className="hds-swatch-cell">
      <button type="button" className="hds-swatch" onClick={onClick} title={`Copy ${copy}`}>
        {children}
      </button>
      {/* A sibling, not a child: a live region inside the button is read as its name. */}
      <span className="hds-swatch-copied" role="status">
        {copied ? 'Copied' : ''}
      </span>
    </div>
  );
}

/** A dot that travels its track with one motion token's duration and curve; replays on demand. */
export function MotionDemo({ duration, easing }: { duration: string; easing: string }) {
  const [run, setRun] = useState(0);
  return (
    <div className="hds-motion-demo">
      <div className="hds-motion-track">
        <span
          key={run}
          className={run ? 'hds-motion-dot hds-motion-dot--run' : 'hds-motion-dot'}
          style={{ '--hds-demo-duration': duration, '--hds-demo-easing': easing } as CSSProperties}
        />
      </div>
      <button type="button" className="hds-motion-replay" onClick={() => setRun((n) => n + 1)}>
        {run ? 'Replay' : 'Play'}
      </button>
    </div>
  );
}

/**
 * Soft surfaces (hds#891): one specimen per surface step, each holding the same
 * controls, so the tonal separation, the soft secondary fill and the hard shadow
 * read together in light and dark. Built only from HDS parts and tokens.
 */
export function SoftSurfacesDemo() {
  const steps = [
    ['page', 'semantic.color.surface.page'],
    ['raised', 'semantic.color.surface.raised'],
    ['muted', 'semantic.color.surface.muted'],
  ] as const;
  return (
    <div
      style={{
        display: 'grid',
        gap: 'var(--semantic-space-scale-sm)',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 15rem), 1fr))',
      }}
    >
      {steps.map(([name, path]) => (
        <div
          key={name}
          data-hds
          style={{
            display: 'grid',
            gap: 'var(--semantic-space-scale-xs)',
            padding: 'var(--semantic-space-surface-padding)',
            borderRadius: 'var(--semantic-radius-action)',
            background: `var(--${path.replace(/\./g, '-')})`,
            color: 'var(--semantic-color-content-primary)',
          }}
        >
          <Text variant="caption" tone="secondary">
            {path}
          </Text>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 'var(--semantic-space-scale-xs)',
              alignItems: 'center',
            }}
          >
            <Button variant="primary" size="sm">
              Save
            </Button>
            <Button size="sm">Cancel</Button>
            <Button variant="tertiary" size="sm">
              More
            </Button>
          </div>
          <div
            style={{ display: 'flex', gap: 'var(--semantic-space-scale-xs)', alignItems: 'center' }}
          >
            <Tag>Remote</Tag>
            <Kbd>K</Kbd>
          </div>
        </div>
      ))}
    </div>
  );
}
