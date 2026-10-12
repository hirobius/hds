// passing: sentence case everywhere; a first-letter capital is sentence case.
import * as React from 'react';

const sentence = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const first = (s: string) => s[0].toUpperCase() + s.slice(1);

export function PassingCaps({ name }: { name: string }) {
  // The word uppercase in a comment, or in prose, is not a transform.
  return (
    <div>
      <p className="hds-type-caption text-muted-foreground">Sentence case eyebrow</p>
      <p>Names must not be uppercase in the UI.</p>
      <p style={{ textTransform: 'none' }}>{sentence(name)}</p>
      <span>{first(name)}</span>
      {/* uppercase-ok: the user's own string is shown in the case they typed it */}
      <code>{name.toUpperCase()}</code>
    </div>
  );
}
