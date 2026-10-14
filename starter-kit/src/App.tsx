/**
 * HDS Starter Kit — demo page
 *
 * Imports HDS primitives from the parent package (@hirobius/design-system)
 * and renders them on a single page with a light/dark toggle.
 *
 * Theme: toggled by flipping `data-theme` and `.dark` on <html> (matching
 * the pattern in ThemeContext.tsx of the parent repo).
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Button, Card, Badge, Tag, Divider, Alert, Input } from '@hirobius/design-system';
import { Moon, Sun, Layers } from 'lucide-react';

// ── Theme helpers ─────────────────────────────────────────────────────────────

function getInitialDark(): boolean {
  try {
    const stored = localStorage.getItem('hds-starter-theme');
    if (stored === 'dark') return true;
    if (stored === 'light') return false;
  } catch {}
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

function applyTheme(dark: boolean) {
  const html = document.documentElement;
  if (dark) {
    html.setAttribute('data-theme', 'dark');
    html.classList.add('dark');
  } else {
    html.setAttribute('data-theme', 'light');
    html.classList.remove('dark');
  }
  try {
    localStorage.setItem('hds-starter-theme', dark ? 'dark' : 'light');
  } catch {}
}

// ── App ───────────────────────────────────────────────────────────────────────

export function App() {
  const [isDark, setIsDark] = useState<boolean>(getInitialDark);

  // Apply theme on mount and on change
  useEffect(() => {
    applyTheme(isDark);
  }, [isDark]);

  const toggleTheme = useCallback(() => setIsDark((prev) => !prev), []);

  // Tag filter demo state
  const [activeTags, setActiveTags] = useState<Set<string>>(new Set(['React']));
  const toggleTag = (tag: string) =>
    setActiveTags((prev) => {
      const next = new Set(prev);
      next.has(tag) ? next.delete(tag) : next.add(tag);
      return next;
    });

  // Input demo state
  const [inputValue, setInputValue] = useState('');

  const tags = ['React', 'TypeScript', 'Vite', 'Tailwind', 'CSS'];

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--semantic-color-surface-page)',
        color: 'var(--semantic-color-content-primary)',
        fontFamily: 'var(--hds-font-body, system-ui, sans-serif)',
        transition: 'background-color 0.3s ease, color 0.3s ease',
      }}
    >
      {/* ── Header ── */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 32px',
          borderBottom: '1px solid var(--semantic-color-border-default)',
          backgroundColor: 'var(--semantic-color-surface-raised)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Layers
            size={20}
            style={{
              color: 'var(--semantic-color-brand-primary, var(--hds-color-brand-500, #6366f1))',
            }}
          />
          <span style={{ fontWeight: 600, fontSize: '16px', letterSpacing: '-0.01em' }}>
            HDS Starter Kit
          </span>
          <Badge tone="info">demo</Badge>
        </div>

        <Button
          variant="tertiary"
          size="sm"
          iconOnly
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          onClick={toggleTheme}
          iconLeft={isDark ? <Sun size={16} /> : <Moon size={16} />}
        />
      </header>

      {/* ── Main ── */}
      <main
        style={{
          maxWidth: '720px',
          margin: '0 auto',
          padding: '48px 32px',
          display: 'flex',
          flexDirection: 'column',
          gap: '40px',
        }}
      >
        {/* Section: Intro */}
        <section>
          <h1
            style={{
              fontSize: '28px',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              margin: '0 0 8px',
              color: 'var(--semantic-color-content-primary)',
            }}
          >
            Hirobius Design System
          </h1>
          <p
            style={{
              fontSize: '15px',
              color: 'var(--semantic-color-content-secondary)',
              margin: 0,
              lineHeight: 1.6,
            }}
          >
            External consumer demo — install{' '}
            <code style={{ fontFamily: 'var(--hds-font-mono, monospace)', fontSize: '13px' }}>
              @hirobius/design-system
            </code>{' '}
            and import components directly. Tokens flow through CSS custom properties; dark mode is
            a single attribute flip on{' '}
            <code style={{ fontFamily: 'var(--hds-font-mono, monospace)', fontSize: '13px' }}>
              &lt;html&gt;
            </code>
            .
          </p>
        </section>

        <Divider />

        {/* Section: Buttons */}
        <section>
          <SectionHeading label="Button" />
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px' }}>
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="tertiary">Tertiary</Button>
            <Button variant="primary" size="sm">
              Small
            </Button>
            <Button variant="secondary" size="lg">
              Large
            </Button>
            <Button variant="primary" loading>
              Loading
            </Button>
            <Button variant="secondary" disabled>
              Disabled
            </Button>
          </div>
        </section>

        <Divider />

        {/* Section: Badges */}
        <section>
          <SectionHeading label="Badge" />
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
            <Badge tone="neutral">neutral</Badge>
            <Badge tone="info">info</Badge>
            <Badge tone="success">success</Badge>
            <Badge tone="warning">warning</Badge>
            <Badge tone="danger">danger</Badge>
          </div>
        </section>

        <Divider />

        {/* Section: Tags */}
        <section>
          <SectionHeading label="Tag" subtitle="Click to toggle active state" />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {tags.map((tag) => (
              <Tag key={tag} active={activeTags.has(tag)} onClick={() => toggleTag(tag)}>
                {tag}
              </Tag>
            ))}
          </div>
        </section>

        <Divider />

        {/* Section: Input */}
        <section>
          <SectionHeading label="Input" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '360px' }}>
            <Input
              label="Label"
              placeholder="Default input…"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
            />
            <Input label="Disabled" placeholder="Cannot edit" disabled />
            <Input
              label="Error state"
              placeholder="Something went wrong"
              error
              errorMessage="This field is required"
            />
          </div>
        </section>

        <Divider />

        {/* Section: Alerts */}
        <section>
          <SectionHeading label="Alert" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <Alert tone="info" title="Token architecture">
              Design tokens flow from <code>hirobius.tokens.json</code> through CSS custom
              properties — no runtime theming library required.
            </Alert>
            <Alert tone="success">Build passed. All visual regression snapshots match.</Alert>
            <Alert tone="warning">A new token path was added; regenerate the manifest.</Alert>
            <Alert tone="danger">Typecheck failed — 3 errors in 2 files.</Alert>
          </div>
        </section>

        <Divider />

        {/* Section: Card */}
        <section>
          <SectionHeading label="Card" />
          <Card padding="none" style={{ maxWidth: '360px' }}>
            <Card.Header>
              <Card.Title>Component card</Card.Title>
              <Card.Description>
                Compound-parts pattern — Header, Body, Footer compose independently.
              </Card.Description>
            </Card.Header>
            <Card.Body>
              <p
                style={{
                  margin: 0,
                  fontSize: '14px',
                  color: 'var(--semantic-color-content-secondary)',
                  lineHeight: 1.6,
                }}
              >
                All visual decisions resolve through CSS custom properties. Dark mode is handled by{' '}
                <code style={{ fontFamily: 'var(--hds-font-mono, monospace)', fontSize: '13px' }}>
                  [data-theme="dark"]
                </code>{' '}
                on{' '}
                <code style={{ fontFamily: 'var(--hds-font-mono, monospace)', fontSize: '13px' }}>
                  &lt;html&gt;
                </code>
                .
              </p>
            </Card.Body>
            <Card.Footer>
              <div style={{ display: 'flex', gap: '8px' }}>
                <Button variant="primary" size="sm">
                  Accept
                </Button>
                <Button variant="tertiary" size="sm">
                  Cancel
                </Button>
              </div>
            </Card.Footer>
          </Card>
        </section>

        {/* Footer */}
        <Divider />
        <footer
          style={{
            fontSize: '12px',
            color:
              'var(--semantic-color-content-tertiary, var(--semantic-color-content-secondary))',
            textAlign: 'center',
          }}
        >
          @hirobius/design-system — starter-kit demo
        </footer>
      </main>
    </div>
  );
}

// ── SectionHeading ─────────────────────────────────────────────────────────────

function SectionHeading({ label, subtitle }: { label: string; subtitle?: string }) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <h2
        style={{
          fontSize: '13px',
          fontWeight: 600,
          color: 'var(--semantic-color-content-secondary)',
          margin: 0,
        }}
      >
        {label}
      </h2>
      {subtitle && (
        <p
          style={{
            fontSize: '12px',
            color:
              'var(--semantic-color-content-tertiary, var(--semantic-color-content-secondary))',
            margin: '2px 0 0',
          }}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}
