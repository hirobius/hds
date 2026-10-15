'use client';

/**
 * Live demo of the HDS motion recipes (hds#751) for the Motion foundations page.
 * Each tile plays its recipe on demand; under reduced motion the tiles show the
 * reduced version (no movement), which is what users with that setting get.
 */
import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Button, Text, useMotionRecipe, type MotionRecipeName } from '@hirobius/design-system';
import { DemoFrame } from './component-demos';

const TILES: { name: MotionRecipeName; label: string; use: string }[] = [
  { name: 'openMenu', label: 'Open menu', use: 'Menus, popovers, selects' },
  { name: 'openDialog', label: 'Open dialog', use: 'Dialogs, alert dialogs' },
  { name: 'openTooltip', label: 'Open tooltip', use: 'Tooltips' },
  { name: 'toast', label: 'Toast', use: 'Toasts arriving in the stack' },
  { name: 'reveal', label: 'Reveal', use: 'Content replacing a skeleton' },
  { name: 'swap', label: 'Swap', use: 'A label or icon changing in place' },
  { name: 'arrive', label: 'Arrive', use: 'Saved, sent, done' },
  { name: 'shake', label: 'Shake', use: 'A field with an error' },
];

const surface = {
  padding: 'var(--semantic-space-scale-sm)',
  borderRadius: 'var(--semantic-radius-action)',
  background: 'var(--semantic-color-surface-raised)',
  boxShadow: 'var(--semantic-shadow-floating)',
};

function Stage({ name, run }: { name: MotionRecipeName; run: number }) {
  const recipe = useMotionRecipe(name);
  const keyed = name === 'swap' || name === 'shake' || name === 'arrive' || name === 'reveal';
  const body: string = name === 'swap' ? (run % 2 ? 'Copied' : 'Copy') : 'Sample';
  return (
    <div style={{ minHeight: 64, display: 'grid', placeItems: 'center' }}>
      <AnimatePresence mode="wait" initial={false}>
        {(keyed || run % 2 === 1) && (
          <motion.div key={keyed ? run : 'item'} style={surface} {...recipe}>
            <Text variant="ui">{body}</Text>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Tile({ name, label, use }: (typeof TILES)[number]) {
  const [run, setRun] = useState(0);
  return (
    <div style={{ display: 'grid', gap: 'var(--semantic-space-scale-xs)' }}>
      <Stage name={name} run={run} />
      <Button variant="secondary" onClick={() => setRun((r) => r + 1)}>
        {label}
      </Button>
      <Text variant="caption" style={{ color: 'var(--semantic-color-content-secondary)' }}>
        <code>{name}</code>: {use}
      </Text>
    </div>
  );
}

export function MotionRecipesDemo() {
  return (
    <DemoFrame>
      <div
        style={{
          display: 'grid',
          gap: 'var(--semantic-space-scale-md)',
          gridTemplateColumns: 'repeat(auto-fill, minmax(10rem, 1fr))',
        }}
      >
        {TILES.map((t) => (
          <Tile key={t.name} {...t} />
        ))}
      </div>
    </DemoFrame>
  );
}
