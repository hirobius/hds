import { Button, Stack } from '@hirobius/design-system';

/**
 * The Overview page's two calls to action, moved from the removed /tour page (Adrian,
 * 2026-11-05). Each href must be a live docs page: tests/docs-site/overview-actions.test.tsx.
 */
export function OverviewActions() {
  // not-prose: the page body's link underline must not reach the buttons' labels.
  return (
    <div className="not-prose">
      <Stack direction="row" gap="tight" wrap="wrap">
        <Button variant="secondary" asChild>
          <a href="/docs/components">Components</a>
        </Button>
        <Button variant="primary" asChild>
          <a href="/docs/guides/upgrade">Upgrade guide</a>
        </Button>
      </Stack>
    </div>
  );
}
