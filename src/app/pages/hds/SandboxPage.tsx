/**
 * SandboxPage — isolated component renderer for programmatic Figma capture.
 *
 * No nav, no sidebar, no layout chrome. Renders a single HDS component
 * by name from ?component=Name&variant=variantKey query params.
 *
 * Legacy isolated preview route for HDS components. The active Figma path is
 * the JSONL streaming renderer in scripts/llm-stream-bridge.mjs.
 *
 * URL: /hds/sandbox?component=Button&variant=primary
 */
/* hds-bypass: error-fallback path renders raw monospace 12px when the design-system context is unavailable — defensive on purpose so registry diagnostics still surface. Not user-facing canon. */

import { useSearchParams } from 'react-router';
import type { ReactNode } from 'react';
import { Button } from '../../components/button';
import { Badge } from '../../components/badge';
import { Tag } from '../../components/tag';
import { Alert } from '../../components/alert';
import { Surface } from '../../components/surface';
import { Stack } from '../../components/stack';
import { TextLockup } from '../../components/text-lockup';
import { Input } from '../../components/input';

// ── Sandbox Registry ───────────────────────────────────────────────────────────
// Each entry: a render function that returns the component with demo props.
// Variants allow the CLI to request a specific visual state.

type RenderFn = () => ReactNode;
type ComponentEntry = { default: RenderFn; [variant: string]: RenderFn };

const REGISTRY: Record<string, ComponentEntry> = {
  Button: {
    default:   () => <Button variant="primary">Label</Button>,
    primary:   () => <Button variant="primary">Label</Button>,
    secondary: () => <Button variant="secondary">Label</Button>,
    tertiary:  () => <Button variant="tertiary">Label</Button>,
    sm:        () => <Button variant="primary" size="sm">Label</Button>,
    lg:        () => <Button variant="primary" size="lg">Label</Button>,
  },

  Badge: {
    default: () => <Badge>Ready</Badge>,
    neutral: () => <Badge tone="neutral">Neutral</Badge>,
    info:    () => <Badge tone="info">Info</Badge>,
    success: () => <Badge tone="success">Success</Badge>,
    danger:  () => <Badge tone="danger">Danger</Badge>,
    warning: () => <Badge tone="warning">Warning</Badge>,
  },

  Tag: {
    default:  () => <Tag>Category</Tag>,
    active:   () => <Tag active>Active</Tag>,
    inactive: () => <Tag>Inactive</Tag>,
  },

  Alert: {
    default: () => <Alert variant="info" title="Heads up">This is an informational alert.</Alert>,
    info:    () => <Alert variant="info" title="Info">Informational message here.</Alert>,
    success: () => <Alert variant="success" title="Done">Action completed successfully.</Alert>,
    error:   () => <Alert variant="error" title="Error">Something went wrong.</Alert>,
    warning: () => <Alert variant="warning" title="Warning">Proceed with caution.</Alert>,
  },

  Surface: {
    default: () => (
      <Surface style={{ width: 320 }}>
        <TextLockup size="section" title="Surface Card" description="Content inside a governed Surface." />
      </Surface>
    ),
    shadow: () => (
      <Surface shadow style={{ width: 320 }}>
        <TextLockup size="section" title="Elevated Card" description="Lifted with the shadow prop." />
      </Surface>
    ),
  },

  TextLockup: {
    default:  () => <TextLockup size="section" title="Section Heading" description="Supporting description text." />,
    section:  () => <TextLockup size="section" title="Section" description="Section-level lockup." />,
    metric:   () => <TextLockup size="metric" title="42" description="Metric value lockup." />,
    detail:   () => <TextLockup size="detail" title="Detail" description="Compact detail lockup." />,
  },

  Input: {
    default:  () => <Input label="Email address" placeholder="you@example.com" style={{ width: 280 }} />,
    error:    () => <Input label="Email address" placeholder="you@example.com" error errorMessage="Enter a valid email." style={{ width: 280 }} />,
    disabled: () => <Input label="Email address" placeholder="you@example.com" disabled style={{ width: 280 }} />,
  },

  Stack: {
    default:    () => (
      <Stack gap="px16" style={{ width: 240 }}>
        <Badge tone="success">Active</Badge>
        <Badge tone="neutral">Draft</Badge>
        <Badge tone="danger">Archived</Badge>
      </Stack>
    ),
    horizontal: () => (
      <Stack direction="row" gap="px8">
        <Button variant="primary" size="sm">Save</Button>
        <Button variant="secondary" size="sm">Cancel</Button>
      </Stack>
    ),
  },
};

// ── Page ───────────────────────────────────────────────────────────────────────

const srOnly = {
  position: 'absolute' as const,
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap' as const,
  border: 0,
};

export default function SandboxPage() {
  const [params] = useSearchParams();
  const componentName = params.get('component') ?? '';
  const variantKey    = params.get('variant') ?? 'default';

  const entry = REGISTRY[componentName];
  const available = Object.keys(REGISTRY).join(', ');
  const renderFn = entry ? (entry[variantKey] ?? entry.default) : null;

  return (
    <div id="sandbox-root" style={{ position: 'absolute', top: 0, left: 0 }}>
      <h1 style={srOnly}>Component Sandbox</h1>
      <h2 style={srOnly}>
        {componentName || 'Unknown component'}
        {entry ? ` — ${variantKey}` : ''}
      </h2>
      {!entry ? (
        // font-ok: sandbox error fallback intentionally uses raw monospace so registry diagnostics render even when the design-system context is unavailable
        // spacing-ok: error boundary fallback — hds context may be unavailable; raw 24px preserves diagnostic legibility
        <div
          style={{ padding: 24, fontFamily: 'monospace', fontSize: 12, color: 'var(--semantic-color-content-secondary)' }}
        >
          <strong>Unknown component:</strong> {componentName || '(none)'}
          <br />
          <strong>Available:</strong> {available}
        </div>
      ) : (
        renderFn()
      )}
    </div>
  );
}
