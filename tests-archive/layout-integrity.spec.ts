/**
 * Layout Integrity — Playwright Collision Detection (Task 27)
 *
 * Focused guardrail for core foundation pages at desktop width.
 * Enforces the core hard constraints from the UI Integrity Constitution:
 *
 *   Trigger 1 — Gap Mandate:
 *     Fail if sibling grid items overlap each other.
 *     Error: "UI COLLISION DETECTED: Sibling grid items are overlapping."
 *
 *   Trigger 2 — Containment Rule:
 *     Fail if content/text bleeds outside its parent surface or lands within 4px of its edge.
 *     Error: "OVERFLOW DETECTED: Content is bleeding out of or touching its container."
 *
 *   Trigger 3 — Stretch Rule:
 *     Fail if sibling swatch surfaces in the same grid row diverge vertically.
 *     Error: "ALIGNMENT DETECTED: Grid siblings have mismatched vertical horizons."
 *
 * Run:  pnpm test:layout
 * CI:   included in check:release (pnpm test:collision covers the full matrix)
 */

import { test, expect } from '@playwright/test';
import { auditPageLayout } from './helpers/layout-audit';

const DESKTOP = { width: 1440, height: 900 };

/**
 * Every page in the app must appear in this list. Standing directive
 * (Adrian, 2026-05-04): no exceptions, even for internal/experimental pages.
 * The lab sketchbook (/vibe-sketchbook/*) is the only exempt surface and is
 * tested separately. Parameterized routes (/ops/clients/:slug,
 * /admin/approvals/:id) are pinned to known-good fixtures.
 */
// Standalone HDS site: every page is served at ROOT (see src/app/route-tree.tsx).
// The legacy /ops/hds/*, /hds/*, /ops/* prefixes are redirect-only, and the old
// portfolio / ops-dashboard / admin / client routes were removed in the strip —
// so this mirrors the real, non-redirect page routes in the route tree.
const ALL_ROUTES = [
  // ── Root + info ─────────────────────────────────────────────────────────────
  '/',
  '/info',

  // ── Getting started / system ────────────────────────────────────────────────
  '/getting-started',
  '/guidance',
  '/scope',
  '/tech-stack',
  '/license',
  '/contribution-guide',
  '/system-contract',
  '/brand-theming',
  '/sandbox',

  // ── Foundations ─────────────────────────────────────────────────────────────
  '/color',
  '/typography',
  '/spacing',
  '/shape',
  '/elevation',
  '/motion',
  '/breakpoints',
  '/tokens',
  '/icons',

  // ── Components ──────────────────────────────────────────────────────────────
  '/components/actions',
  '/components/inputs',
  '/components/display',
  '/components/feedback',
  '/components/navigation',
  '/components/layout',
  '/components/doc-utilities',

  // ── Tests / WIP ─────────────────────────────────────────────────────────────
  '/typography-test',
  '/spacing-test',
] as const;

for (const route of ALL_ROUTES) {
  test(`layout-integrity [desktop] ${route}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize(DESKTOP);
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(`${e.message}`));
    await page.goto(route);
    await page.waitForLoadState('networkidle');
    // Allow one animation frame for layout to settle after hydration.
    await page.waitForTimeout(300);

    // Trigger 0 — Render Health: page must not have crashed into the recovery
    // surface, and must not have surfaced a runtime page-error during render.
    const renderedErrorRecovery = await page.locator('[data-role="error-recovery"]').count();
    expect(
      renderedErrorRecovery,
      [
        `RENDER FAILED: Route resolved to the ErrorPage recovery surface.`,
        `Route: ${route}`,
        ...(pageErrors.length ? ['Page errors:', ...pageErrors.map((e) => `  ↳ ${e}`)] : []),
      ].join('\n'),
    ).toBe(0);
    expect(
      pageErrors,
      [
        `RUNTIME ERROR: Uncaught exception during render.`,
        `Route: ${route}`,
        ...pageErrors.map((e) => `  ↳ ${e}`),
      ].join('\n'),
    ).toEqual([]);

    const report = await page.evaluate(auditPageLayout);

    expect(
      report.gridCollisions,
      [
        `UI COLLISION DETECTED: Sibling grid items are overlapping.`,
        `Route: ${route}`,
        ...report.gridCollisions.map((i) => `  ↳ ${i.target}: ${i.detail}`),
      ].join('\n'),
    ).toEqual([]);

    expect(
      report.textOverflows,
      [
        `OVERFLOW DETECTED: Content is bleeding out of or touching its container.`,
        `Route: ${route}`,
        ...report.textOverflows.map((i) => `  ↳ ${i.target}: ${i.detail}`),
      ].join('\n'),
    ).toEqual([]);

    expect(
      report.stretchMismatches,
      [
        `ALIGNMENT DETECTED: Grid siblings have mismatched vertical horizons.`,
        `Route: ${route}`,
        ...report.stretchMismatches.map((i) => `  ↳ ${i.target}: ${i.detail}`),
      ].join('\n'),
    ).toEqual([]);
  });
}
