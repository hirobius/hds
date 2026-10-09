import { Button, Stack } from '@hirobius/design-system';

/** The row under a component page's subtitle: its Figma node and its source file. */
export function PageLinks({ figma, source }: { figma?: string; source?: string }) {
  const links = [
    { href: figma, label: 'Figma' },
    { href: source, label: 'Source' },
  ].filter((l): l is { href: string; label: string } => Boolean(l.href));
  if (!links.length) return null;
  return (
    <Stack direction="row" gap="tight" className="not-prose">
      {links.map((l) => (
        <Button key={l.label} asChild size="sm" variant="secondary">
          <a href={l.href} target="_blank" rel="noreferrer">
            {l.label}
          </a>
        </Button>
      ))}
    </Stack>
  );
}
