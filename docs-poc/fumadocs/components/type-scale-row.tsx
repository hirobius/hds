interface TypeScaleRowProps {
  name: string;
  token: string;
  sample?: string;
}

export function TypeScaleRow({
  name,
  token,
  sample = 'Hirobius Design System',
}: TypeScaleRowProps) {
  return (
    <div className="hds-type-row">
      <span
        style={{
          fontFamily: `var(--semantic-typography-${token}-font-family)`,
          fontSize: `var(--semantic-typography-${token}-font-size)`,
          fontWeight: `var(--semantic-typography-${token}-font-weight)` as never,
          lineHeight: `var(--semantic-typography-${token}-line-height)`,
          color: 'var(--semantic-color-content-primary)',
        }}
      >
        {sample}
      </span>
      <span className="hds-type-row-meta">
        {name} · --semantic-typography-{token}-*
      </span>
    </div>
  );
}
