'use client';

/**
 * /stress/<screen> (hds#520): one real app screen per route, built from the
 * public package only. Gaps the build hit are marked `GAP:<id>` and listed in
 * lib/stress-gaps.ts; tests/docs-site/stress.test.tsx keeps both honest.
 */
import { Badge, HdsThemeProvider, Stack, ToastProvider } from '@hirobius/design-system';
import { Page, PageHeader } from '@hirobius/design-system/patterns';
import { STRESS_GAPS, STRESS_SCREENS } from '../../lib/stress-gaps';
import { StressSettings } from './stress-settings';
import { StressDashboard } from './stress-dashboard';
import { StressInbox } from './stress-inbox';

const BODY = { settings: StressSettings, dashboard: StressDashboard, inbox: StressInbox };

export function StressScreen({ id }: { id: string }) {
  const screen = STRESS_SCREENS.find((s) => s.id === id) ?? STRESS_SCREENS[0];
  const Body = BODY[screen.id];
  const gaps = STRESS_GAPS.filter((g) => g.screens.includes(screen.id)).length;
  return (
    <HdsThemeProvider>
      <ToastProvider>
        <Page maxWidth="max" paddingY="compact">
          <Stack gap="spacious">
            <PageHeader
              level={1}
              title={screen.title}
              description={screen.summary}
              status={<Badge tone={gaps ? 'warning' : 'success'}>{`${gaps} gaps`}</Badge>}
            />
            <Body />
          </Stack>
        </Page>
      </ToastProvider>
    </HdsThemeProvider>
  );
}
