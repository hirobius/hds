'use client';

import { useEffect, useState } from 'react';
import {
  CORNERS,
  SHADOWS,
  DEFAULT_SWITCHES,
  applySwitches,
  readSwitches,
  writeSwitches,
  type Switches,
} from '../lib/preview-switches';

function Group<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div role="group" aria-label={label} className="hds-docs-switch">
      <span className="hds-docs-switch-label">{label}</span>
      {options.map((o) => (
        <button
          key={o}
          type="button"
          aria-pressed={value === o}
          data-docs-switch={`${label.toLowerCase()}-${o}`}
          onClick={() => onChange(o)}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

/** Corners + Shadow preview switches for the docs nav (hds#794). Persist per viewer. */
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
    <div className="hds-docs-switches">
      <Group
        label="Corners"
        options={CORNERS}
        value={s.corners}
        onChange={(corners) => update({ corners })}
      />
      <Group
        label="Shadow"
        options={SHADOWS}
        value={s.shadow}
        onChange={(shadow) => update({ shadow })}
      />
    </div>
  );
}
