import { InlineLink, Stack } from '@hirobius/design-system';

/** The row under a component page's subtitle: links to its Figma node and its source file. */
export function PageLinks({ figma, source }: { figma?: string; source?: string }) {
  const links = [
    { href: figma, label: 'Figma' },
    { href: source, label: 'Source' },
  ].filter((l): l is { href: string; label: string } => Boolean(l.href));
  if (!links.length) return null;
  return (
    <Stack direction="row" gap="normal" className="not-prose">
      {links.map((l) => (
        <InlineLink key={l.label} href={l.href} externalIcon>
          {l.label}
        </InlineLink>
      ))}
    </Stack>
  );
}
