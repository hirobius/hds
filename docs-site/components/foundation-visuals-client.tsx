'use client';

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Dialog,
  Kbd,
  Menu,
  Popover,
  Progress,
  SegmentedControl,
  Tag,
  Text,
  Tooltip,
} from '@hirobius/design-system';
import { MotionSample } from './motion-sample';

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

/**
 * The motion sample on a track, moved by one motion token's duration and curve (hds#1397).
 * The button is a direction toggle: each press sends the tile to the other end, so both
 * directions show. Under reduced motion the token durations are zero, so the tile jumps.
 */
export function MotionDemo({ duration, easing }: { duration: string; easing: string }) {
  const [atEnd, setAtEnd] = useState(false);
  return (
    <div className="hds-motion-demo">
      <div className="hds-motion-track">
        <MotionSample
          className="hds-motion-tile"
          style={
            {
              '--hds-demo-duration': duration,
              '--hds-demo-easing': easing,
              left: atEnd ? 'calc(100% - var(--hds-motion-tile-size) - 0.5rem)' : '0.5rem',
            } as CSSProperties
          }
        />
      </div>
      <button
        type="button"
        className="hds-motion-replay"
        aria-pressed={atEnd}
        onClick={() => setAtEnd((v) => !v)}
      >
        {atEnd ? '← Play' : 'Play →'}
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

/** One token on the "… on components" lists: its swatch data and its note. */
export interface OnComponentsRow {
  token: string;
  name: string;
  note: string;
  /** Light and dark fills for the square swatches; omitted for a level with no single fill. */
  fill?: string | null;
  darkFill?: string | null;
}

function OnComponentsList({
  id,
  title,
  note,
  rows,
  live,
}: {
  id: string;
  title: string;
  note: string;
  rows: OnComponentsRow[];
  live: Record<string, ReactNode>;
}) {
  return (
    <section className="hds-visual" id={id} data-section={id}>
      <h3 className="hds-visual-title">{title}</h3>
      <p className="hds-visual-note">{note}</p>
      <div className="hds-oncomp" data-hds>
        {rows.map((r) => (
          <div key={r.token} className="hds-oncomp-row" data-token={r.token}>
            <div className="hds-oncomp-label">
              {r.fill !== undefined ? (
                <span className="hds-swatch-squares" aria-hidden="true">
                  <span
                    className="hds-swatch-fill"
                    data-theme-mode="light"
                    style={{ background: r.fill ?? undefined }}
                  />
                  <span
                    className="hds-swatch-fill"
                    data-theme-mode="dark"
                    style={{ background: r.darkFill ?? r.fill ?? undefined }}
                  />
                </span>
              ) : null}
              <span className="hds-swatch-meta">
                <code className="hds-swatch-name">{r.name}</code>
                <span className="hds-oncomp-note">{r.note}</span>
              </span>
            </div>
            <div className="hds-oncomp-live">{live[r.token]}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function MenuTrigger() {
  return (
    <Menu>
      <Menu.Trigger asChild>
        <Button variant="secondary">Open menu</Button>
      </Menu.Trigger>
      <Menu.Content>
        <Menu.Item onSelect={() => {}}>Edit</Menu.Item>
        <Menu.Item onSelect={() => {}}>Duplicate</Menu.Item>
        <Menu.Separator />
        <Menu.Item onSelect={() => {}}>Archive</Menu.Item>
      </Menu.Content>
    </Menu>
  );
}

function PopoverTrigger() {
  return (
    <Popover>
      <Popover.Trigger asChild>
        <Button variant="secondary">Open popover</Button>
      </Popover.Trigger>
      <Popover.Content>Popovers hold short, interactive content.</Popover.Content>
    </Popover>
  );
}

function DialogTrigger() {
  return (
    <Dialog>
      <Dialog.Trigger asChild>
        <Button variant="secondary">Open dialog</Button>
      </Dialog.Trigger>
      <Dialog.Content>
        <Dialog.Header>
          <Dialog.Title>Archive this project?</Dialog.Title>
          <Dialog.Description>You can restore it from the archive later.</Dialog.Description>
        </Dialog.Header>
        <Dialog.Footer>
          <Dialog.Close asChild>
            <Button variant="secondary">Cancel</Button>
          </Dialog.Close>
          <Dialog.Close asChild>
            <Button variant="primary">Archive</Button>
          </Dialog.Close>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog>
  );
}

function TooltipTrigger() {
  return (
    <Tooltip>
      <Tooltip.Trigger asChild>
        <Button variant="secondary">Hover or focus me</Button>
      </Tooltip.Trigger>
      <Tooltip.Content>Saved to your library</Tooltip.Content>
    </Tooltip>
  );
}

const cardBody = (title: string, body: string) => (
  <>
    <Text variant="titleSm">{title}</Text>
    <Text variant="caption" tone="secondary">
      {body}
    </Text>
  </>
);

/** Each elevation level, and the hard shadow, on the live components that use it. */
export function ElevationOnComponents({ rows }: { rows: OnComponentsRow[] }) {
  return (
    <OnComponentsList
      id="elevation-on-components"
      title="Elevation on components"
      note="Live components. Hover the interactive card and the buttons, and open the overlays, to see each level as it ships."
      rows={rows}
      live={{
        'semantic.elevation.flat': (
          <Card bordered className="hds-oncomp-card">
            {cardBody('Bordered card', 'Embedded panel: hairline, no shadow')}
          </Card>
        ),
        'semantic.elevation.raised': (
          <Card asChild className="hds-oncomp-card">
            <button type="button">{cardBody('Interactive card', 'Hover to lift to raised')}</button>
          </Card>
        ),
        'semantic.elevation.floating': <TooltipTrigger />,
        'semantic.elevation.overlay': (
          <>
            <MenuTrigger />
            <PopoverTrigger />
            <DialogTrigger />
          </>
        ),
        'semantic.color.shadow.hard': (
          <>
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
          </>
        ),
      }}
    />
  );
}

/** Each surface step on the live components that fill with it. */
export function SurfaceOnComponents({ rows }: { rows: OnComponentsRow[] }) {
  const [view, setView] = useState('grid');
  return (
    <OnComponentsList
      id="surface-on-components"
      title="Surface steps on components"
      note="Each step: two squares (light, then dark), then the live components that fill with it."
      rows={rows}
      live={{
        'semantic.color.surface.page': (
          <Text variant="caption" tone="secondary">
            The page behind everything here
          </Text>
        ),
        'semantic.color.surface.raised': (
          <Card className="hds-oncomp-card">{cardBody('Card', 'Resting card on the page')}</Card>
        ),
        'semantic.color.surface.muted': (
          <SegmentedControl
            label="View"
            value={view}
            onChange={setView}
            options={[
              { value: 'grid', label: 'Grid' },
              { value: 'list', label: 'List' },
            ]}
          />
        ),
        'semantic.color.surface.overlay': (
          <>
            <Badge tone="neutral">Draft</Badge>
            <Progress label="Upload" value={64} />
          </>
        ),
        'semantic.color.surface.floating': (
          <>
            <PopoverTrigger />
            <MenuTrigger />
          </>
        ),
        'semantic.color.surface.sunken': (
          <>
            <Kbd>K</Kbd>
            <Avatar alt="Ada Lovelace" initials="AL" size="sm" />
          </>
        ),
        'semantic.color.surface.soft': <Button variant="secondary">Save draft</Button>,
        'semantic.color.surface.softHover': <Button variant="secondary">Hover or press me</Button>,
        'semantic.color.surface.inverse': <TooltipTrigger />,
      }}
    />
  );
}
