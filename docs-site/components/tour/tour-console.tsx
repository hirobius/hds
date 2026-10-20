'use client';

/**
 * /tour, "HDS Console" (hds#795): a mock product screen built from the design
 * system's own data, using every public component. Layout, type, colour, corners
 * and shadows all come from tokens, so the page-level switches (theme, density)
 * apply to all of it. The section list and its captions live in
 * lib/tour-sections.ts; tests/docs-site/tour.test.tsx fails if a public component
 * is not rendered here.
 */
import { forwardRef, useEffect, useState, type AnchorHTMLAttributes, type ReactNode } from 'react';
import {
  Avatar,
  AvatarGroup,
  Badge,
  Box,
  Breadcrumb,
  Button,
  Container,
  Divider,
  Grid,
  HdsRouterProvider,
  HdsThemeProvider,
  Icon,
  InlineLink,
  Kbd,
  NavList,
  Pin,
  Sidebar,
  Stack,
  Surface,
  Switcher,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Text,
  ThemeToggle,
  ToastProvider,
  VisuallyHidden,
} from '@hirobius/design-system';
import { Page, PageHeader } from '@hirobius/design-system/patterns';
import { Search } from '@hirobius/design-system/icons';
import type { TourData } from '../../lib/tour-data';
import { TOUR_SECTIONS } from '../../lib/tour-sections';
import { TourBlock } from './tour-caption';
import { TourMetrics } from './tour-metrics';
import { TourTable } from './tour-table';
import { TourReleases } from './tour-releases';
import { TourSettings } from './tour-settings';
import { TourOverlays } from './tour-overlays';

const TourLink = forwardRef<
  HTMLAnchorElement,
  { to: string; children?: ReactNode } & AnchorHTMLAttributes<HTMLAnchorElement>
>(function TourLink({ to, children, ...rest }, ref) {
  return (
    <a ref={ref} href={to} {...rest}>
      {children}
    </a>
  );
});

const adapter = {
  navigate: (href: string) => window.location.assign(href),
  currentPath: '/tour',
  LinkComponent: TourLink,
};

/** Flip the docs theme the way the visual specs do: the attributes next-themes also writes. */
function useDocsTheme() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    setDark(document.documentElement.getAttribute('data-theme') === 'dark');
  }, []);
  const toggle = () => {
    const next = !dark;
    const el = document.documentElement;
    el.setAttribute('data-theme', next ? 'dark' : 'light');
    el.classList.toggle('dark', next);
    el.classList.toggle('light', !next);
    setDark(next);
  };
  return { dark, toggle };
}

export function TourConsole({ data }: { data: TourData }) {
  const { dark, toggle } = useDocsTheme();
  const [tab, setTab] = useState('overview');
  const section = (id: string) => TOUR_SECTIONS.find((s) => s.id === id)!;
  const documented = data.components.filter((c) => c.href !== '/docs/components').length;

  return (
    <HdsThemeProvider className="hds-tour">
      <HdsRouterProvider adapter={adapter}>
        <ToastProvider>
          <Surface padding="none" overflow="visible">
            <Pin>
              <Surface padding="item">
                <Switcher gap="tight">
                  <Stack direction="row" gap="tight" align="center">
                    <Icon icon={Search} size="small" aria-hidden="true" />
                    <Text variant="ui" as="span">
                      HDS Console
                    </Text>
                    <Badge tone="info">{data.version}</Badge>
                  </Stack>
                  <Stack direction="row" gap="tight" align="center" justify="end">
                    <Text variant="caption" tone="secondary" as="span">
                      Press <Kbd>/</Kbd> to search
                    </Text>
                    <AvatarGroup max={2}>
                      <Avatar alt="Design" initials="DS" />
                      <Avatar alt="Engineering" initials="EN" />
                      <Avatar alt="Research" initials="RS" />
                    </AvatarGroup>
                    <ThemeToggle isDark={dark} onToggle={toggle} />
                  </Stack>
                </Switcher>
              </Surface>
              <Divider />
            </Pin>
            <Sidebar sideWidth="14rem" gap="spacious">
              <Box as="nav" aria-label="Console sections" sx={{ p: 'md' }}>
                <Stack gap="tight">
                  <Text variant="caption" tone="secondary">
                    Sections
                  </Text>
                  {TOUR_SECTIONS.map((s) => (
                    <Text key={s.id} variant="ui" as="span">
                      <InlineLink href={`#${s.id}`}>{s.title}</InlineLink>
                    </Text>
                  ))}
                  <Divider />
                  <Text variant="caption" tone="secondary">
                    <InlineLink href="/docs/components" externalIcon={false}>
                      All {data.components.length} components
                    </InlineLink>
                  </Text>
                </Stack>
              </Box>
              <Container maxWidth="max" padding="0">
                <Page maxWidth="max" paddingY="compact">
                  <Stack gap="spacious">
                    <PageHeader
                      level={1}
                      breadcrumb={
                        <Breadcrumb
                          items={[{ label: 'Docs', href: '/docs' }, { label: 'System tour' }]}
                        />
                      }
                      title="HDS Console"
                      description={`A dashboard about the design system itself. ${data.components.length} components, ${data.tokenGroups.reduce((n, g) => n + g.count, 0)} tokens, built from the repo at ${data.version}.`}
                      status={<Badge tone="success">Live data</Badge>}
                      actions={
                        <>
                          <Button variant="secondary" asChild>
                            <a href="/docs/components">Components</a>
                          </Button>
                          <Button variant="primary" asChild>
                            <a href="/docs/guides/upgrading">Upgrade guide</a>
                          </Button>
                        </>
                      }
                    />
                    <Tabs value={tab} onValueChange={setTab}>
                      <TabsList aria-label="Console views">
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="coverage">Coverage</TabsTrigger>
                        <TabsTrigger value="release">Latest release</TabsTrigger>
                      </TabsList>
                      <TabsContent value="overview">
                        <Text variant="body">
                          Every number on this page is read from the registry, the token file or the
                          changelog when the docs build.
                        </Text>
                      </TabsContent>
                      <TabsContent value="coverage">
                        <Text variant="body">
                          {documented} of {data.components.length} components have their own docs
                          page; the rest are parts of one that does.
                        </Text>
                      </TabsContent>
                      <TabsContent value="release">
                        <Text variant="body">
                          Version {data.version}: {data.releases[0]?.changes[0] ?? 'no notes'}
                        </Text>
                      </TabsContent>
                    </Tabs>
                    <TourBlock section={section('header')} links={data.links}>
                      <Grid columns={2} gap="normal">
                        <Surface padding="component" shadow>
                          <Text variant="ui">
                            Page header, breadcrumb, status badge and actions are above; this
                            section's tabs switch the summary line.
                          </Text>
                        </Surface>
                        <Surface padding="component">
                          <NavList aria-label="Tour links">
                            <NavList.Item href="/docs/components" current>
                              Component index
                            </NavList.Item>
                            <NavList.Item href="/docs/components/nav-list">NavList</NavList.Item>
                          </NavList>
                          <Text variant="ui">
                            Search the{' '}
                            <InlineLink href="/docs/components">component index</InlineLink>
                            <VisuallyHidden> (opens the components page)</VisuallyHidden>.
                          </Text>
                        </Surface>
                      </Grid>
                    </TourBlock>
                    <TourBlock section={section('metrics')} links={data.links}>
                      <TourMetrics data={data} />
                    </TourBlock>
                    <TourBlock section={section('components')} links={data.links}>
                      <TourTable data={data} />
                    </TourBlock>
                    <TourBlock section={section('releases')} links={data.links}>
                      <TourReleases data={data} />
                    </TourBlock>
                    <TourBlock section={section('settings')} links={data.links}>
                      <TourSettings version={data.version} />
                    </TourBlock>
                    <TourBlock section={section('overlays')} links={data.links}>
                      <TourOverlays />
                    </TourBlock>
                    <TourBlock section={section('shell')} links={data.links}>
                      <Text variant="ui">
                        The bar above stays pinned while you scroll. The rail on the left collapses
                        under the content on a phone.
                      </Text>
                    </TourBlock>
                  </Stack>
                </Page>
              </Container>
            </Sidebar>
          </Surface>
        </ToastProvider>
      </HdsRouterProvider>
    </HdsThemeProvider>
  );
}
