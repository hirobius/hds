const SCALE = [
  ['Display', 'display', 'The quick brown fox'],
  ['Heading 1', 'h1', 'The quick brown fox'],
  ['Heading 2', 'h2', 'The quick brown fox'],
  ['Heading 3', 'h3', 'The quick brown fox'],
  ['Body', 'body', 'The quick brown fox jumps over the lazy dog.'],
  ['UI', 'ui', 'The quick brown fox jumps over the lazy dog.'],
  ['Caption', 'caption', 'The quick brown fox jumps over the lazy dog.'],
  ['Eyebrow', 'eyebrow', 'THE QUICK BROWN FOX'],
] as const;

export function TypeScale() {
  return (
    <div>
      {SCALE.map(([label, token, sample]) => (
        <div
          key={token}
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 24,
            padding: '16px 0',
            borderBottom: '1px solid var(--semantic-color-border-subtle)',
          }}
        >
          <div
            style={{
              width: 96,
              flexShrink: 0,
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--semantic-color-content-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            {label}
          </div>
          <div
            style={{
              fontFamily: `var(--semantic-typography-${token}-font-family)`,
              fontSize: `var(--semantic-typography-${token}-font-size)`,
              fontWeight: `var(--semantic-typography-${token}-font-weight)`,
              letterSpacing: `var(--semantic-typography-${token}-letter-spacing)`,
              lineHeight: `var(--semantic-typography-${token}-line-height)`,
            }}
          >
            {sample}
          </div>
        </div>
      ))}
    </div>
  );
}
