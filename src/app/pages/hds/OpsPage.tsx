/* eslint-disable no-restricted-syntax */
/* hds-bypass: internal workspace HQ. Not user-facing canon. */
import React from 'react';
import { ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router';
import hds from '../../design-system/tokens';
import { Stack } from '../../components/stack';
import { Surface } from '../../components/surface';
import legacyTaskArchive from '../../../../docs/ai/_archive/legacy-task-systems-2026-05-11.json';
const orchestration = legacyTaskArchive.sources.orchestration;

// ── Static data ───────────────────────────────────────────────────────────────

type OUnit = { id: string; status: string; claimedBy?: string };
const units = (orchestration as { units: OUnit[] }).units;
const statDone = units.filter((u) => u.status === 'done').length;
const statQueued = units.filter((u) => u.status === 'approved').length;
const inFlight = units.filter((u) => u.status === 'claimed');
const total = units.length;

const opsPageStyles = {
  internalToolBtn: {
    background: 'none',
    border: 'none',
    borderBottom: '1px solid var(--semantic-color-border-subtle)',
    padding: `${hds.space.px12} 0`,
    textAlign: 'left' as const,
    cursor: 'pointer',
    color: 'var(--semantic-color-content-primary)',
  } satisfies React.CSSProperties,
} as const;

const API_ACCOUNTS = [
  {
    label: 'Anthropic',
    sub: 'console.anthropic.com',
    href: 'https://console.anthropic.com/settings/usage',
  },
  { label: 'OpenRouter', sub: 'openrouter.ai', href: 'https://openrouter.ai/settings/billing' },
] as const;

const INTERNAL_TOOLS = [
  { label: 'Architecture Snapshot', href: '/ops/hds/architecture-snapshot' },
  { label: 'System Contract', href: '/ops/hds/system-contract' },
  { label: 'Contribution Guide', href: '/ops/hds/contribution-guide' },
  { label: 'Sandbox', href: '/ops/hds/sandbox' },
] as const;

// ── Sub-components ────────────────────────────────────────────────────────────

function BandLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        ...hds.typeStyles.eyebrow,
        margin: 0,
        color: 'var(--semantic-color-content-secondary)',
      }}
    >
      {children}
    </p>
  );
}

function ApiCard({ label, sub, href }: { label: string; sub: string; href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{ textDecoration: 'none' }}
      className="hds-focus"
    >
      <Surface
        padding="item"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: hds.space.px16,
          height: '100%',
        }}
      >
        <div>
          <p
            style={{
              ...hds.typeStyles.ui,
              margin: 0,
              color: 'var(--semantic-color-content-primary)',
            }}
          >
            {label}
          </p>
          <p
            style={{
              ...hds.typeStyles.ui,
              margin: 0,
              color: 'var(--semantic-color-content-secondary)',
            }}
          >
            {sub}
          </p>
        </div>
        <ExternalLink size={14} color="var(--semantic-color-content-tertiary)" />
      </Surface>
    </a>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function OpsPage() {
  const navigate = useNavigate();
  const pct = Math.round((statDone / total) * 100);

  const STATS = [
    { v: statDone, l: 'Done' },
    { v: statQueued, l: 'Queued' },
    { v: inFlight.length, l: 'In-flight' },
    { v: total, l: 'Total' },
    { v: `${pct}%`, l: 'Complete' },
  ];

  return (
    <div
      style={{
        maxWidth: 720,
        padding: `${hds.semantic.space.section.inset} ${hds.semantic.space.layout.gutter}`,
      }}
    >
      <Stack direction="column" gap="spacious">
        <Stack direction="column" gap="tight">
          <h1 style={{ ...hds.typeStyles.display, margin: 0 }}>Workspace HQ</h1>
          <p
            style={{
              ...hds.typeStyles.body,
              margin: 0,
              color: 'var(--semantic-color-content-secondary)',
            }}
          >
            Internal ops center — not public-facing.
          </p>
        </Stack>

        <Stack direction="column" gap="gap">
          <BandLabel>API Accounts</BandLabel>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: hds.semantic.space.component.gap,
            }}
          >
            {API_ACCOUNTS.map((a) => (
              <ApiCard key={a.label} {...a} />
            ))}
          </div>
        </Stack>

        <Stack direction="column" gap="gap">
          <BandLabel>Pipeline Health</BandLabel>
          <div style={{ display: 'flex', gap: hds.semantic.space.layout.gap, flexWrap: 'wrap' }}>
            {STATS.map((s) => (
              <div key={s.l}>
                <p style={{ ...hds.typeStyles.heading2, margin: 0 }}>{s.v}</p>
                <p
                  style={{
                    ...hds.typeStyles.ui,
                    margin: 0,
                    color: 'var(--semantic-color-content-secondary)',
                  }}
                >
                  {s.l}
                </p>
              </div>
            ))}
          </div>
        </Stack>

        <Stack direction="column" gap="gap">
          <BandLabel>In-Flight ({inFlight.length})</BandLabel>
          {inFlight.length === 0 ? (
            <p
              style={{
                ...hds.typeStyles.ui,
                margin: 0,
                color: 'var(--semantic-color-content-secondary)',
              }}
            >
              No units currently claimed.
            </p>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: hds.semantic.space.component.gap,
              }}
            >
              {inFlight.map((u) => (
                <div
                  key={u.id}
                  style={{
                    display: 'flex',
                    gap: hds.semantic.space.component.gap,
                    alignItems: 'baseline',
                  }}
                >
                  <code
                    style={{
                      ...hds.typeStyles.technical,
                      margin: 0,
                      color: 'var(--semantic-color-content-primary)',
                    }}
                  >
                    {u.id}
                  </code>
                  <span
                    style={{
                      ...hds.typeStyles.ui,
                      margin: 0,
                      color: 'var(--semantic-color-content-secondary)',
                    }}
                  >
                    {u.claimedBy ?? '—'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Stack>

        <Stack direction="column" gap="gap">
          <BandLabel>Internal Tools</BandLabel>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {INTERNAL_TOOLS.map((t) => (
              <button
                key={t.href}
                onClick={() => navigate(t.href)}
                className="hds-focus"
                style={{ ...hds.typeStyles.ui, ...opsPageStyles.internalToolBtn }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </Stack>
      </Stack>
    </div>
  );
}
