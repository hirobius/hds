'use client';

import { useEffect, useState } from 'react';
import { Button, Popover, SegmentedControl, Stack, Tooltip } from '@hirobius/design-system';
import { Settings } from '@hirobius/design-system/icons';
import {
  ACCENTS,
  DENSITIES,
  DEFAULT_SWITCHES,
  applySwitches,
  readSwitches,
  writeSwitches,
  type Accent,
  type Density,
  type Switches,
} from '../lib/preview-switches';

const options = <T extends string>(values: readonly T[]) =>
  values.map((v) => ({ value: v, label: v[0].toUpperCase() + v.slice(1) }));

/**
 * Display settings for the docs nav (hds#794): one icon button beside the theme switcher that
 * opens a Popover with the Accent and Density switches, the package's own dials. Persists per viewer. The saved
 * choice is applied on mount, so it holds whether or not the popover is ever opened.
 */
export function PreviewSwitches() {
  const [s, setS] = useState<Switches>(DEFAULT_SWITCHES);

  useEffect(() => {
    const stored = readSwitches();
    setS(stored);
    applySwitches(stored);
  }, []);

  const update = (patch: Partial<Switches>) => {
    const next = { ...s, ...patch };
    setS(next);
    applySwitches(next);
    writeSwitches(next);
  };

  return (
    <Popover>
      <Tooltip>
        <Tooltip.Trigger asChild>
          <Popover.Trigger asChild>
            <Button
              variant="tertiary"
              size="sm"
              iconOnly
              label="Display settings"
              iconLeft={<Settings aria-hidden />}
              data-docs-switch-trigger
            />
          </Popover.Trigger>
        </Tooltip.Trigger>
        <Tooltip.Content>Display settings</Tooltip.Content>
      </Tooltip>
      <Popover.Content align="end" aria-label="Display settings" className="w-auto">
        <Stack gap="gap">
          <SegmentedControl
            label="Accent"
            options={options(ACCENTS)}
            value={s.accent}
            onChange={(v) => update({ accent: v as Accent })}
          />
          <SegmentedControl
            label="Density"
            options={options(DENSITIES)}
            value={s.density}
            onChange={(v) => update({ density: v as Density })}
          />
        </Stack>
      </Popover.Content>
    </Popover>
  );
}
