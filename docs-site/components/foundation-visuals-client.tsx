'use client';

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

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
    <button type="button" className="hds-swatch" onClick={onClick} title={`Copy ${copy}`}>
      {children}
      <span className="hds-swatch-copied" role="status">
        {copied ? 'Copied' : ''}
      </span>
    </button>
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
