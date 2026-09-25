const SURFACE = [
  ['surface-page', '--semantic-color-surface-page'],
  ['surface-raised', '--semantic-color-surface-raised'],
  ['surface-overlay', '--semantic-color-surface-overlay'],
  ['surface-accent', '--semantic-color-surface-accent'],
  ['surface-accentSubtle', '--semantic-color-surface-accentSubtle'],
  ['surface-hover', '--semantic-color-surface-hover'],
  ['surface-pressed', '--semantic-color-surface-pressed'],
  ['surface-selected', '--semantic-color-surface-selected'],
  ['surface-muted', '--semantic-color-surface-muted'],
  ['surface-sunken', '--semantic-color-surface-sunken'],
] as const;

const CONTENT = [
  ['content-primary', '--semantic-color-content-primary'],
  ['content-secondary', '--semantic-color-content-secondary'],
  ['content-disabled', '--semantic-color-content-disabled'],
  ['content-accent', '--semantic-color-content-accent'],
  ['content-success', '--semantic-color-content-success'],
  ['content-warning', '--semantic-color-content-warning'],
  ['content-danger', '--semantic-color-content-danger'],
] as const;

const FEEDBACK = [
  ['feedback-error', '--semantic-color-feedback-error'],
  ['feedback-success', '--semantic-color-feedback-success'],
  ['feedback-warning', '--semantic-color-feedback-warning'],
  ['feedback-info', '--semantic-color-feedback-info'],
  ['feedback-inProgress', '--semantic-color-feedback-inProgress'],
] as const;

const BORDER = [
  ['border-default', '--semantic-color-border-default'],
  ['border-interactive', '--semantic-color-border-interactive'],
  ['border-subdued', '--semantic-color-border-subdued'],
  ['border-strong', '--semantic-color-border-strong'],
  ['border-accent', '--semantic-color-border-accent'],
] as const;

function Swatch({ name, varName }: { name: string; varName: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '8px 4px',
        borderBottom: '1px solid var(--semantic-color-border-subtle)',
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 8,
          border: '1px solid var(--semantic-color-border-default)',
          background: `var(${varName})`,
          flexShrink: 0,
        }}
      />
      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <span style={{ fontSize: 14, fontWeight: 600 }}>{name}</span>
        <code style={{ fontSize: 12, color: 'var(--semantic-color-content-secondary)' }}>
          {varName}
        </code>
      </div>
    </div>
  );
}

function Group({ title, tokens }: { title: string; tokens: readonly (readonly [string, string])[] }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <h3 style={{ marginBottom: 4 }}>{title}</h3>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: '0 24px',
        }}
      >
        {tokens.map(([name, varName]) => (
          <Swatch key={name} name={name} varName={varName} />
        ))}
      </div>
    </div>
  );
}

export function ColorSwatches() {
  return (
    <div>
      <Group title="Surface" tokens={SURFACE} />
      <Group title="Content" tokens={CONTENT} />
      <Group title="Feedback" tokens={FEEDBACK} />
      <Group title="Border" tokens={BORDER} />
    </div>
  );
}
