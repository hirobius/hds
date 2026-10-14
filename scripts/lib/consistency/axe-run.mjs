/** @internal — live stage for scripts/eval-consistency.mjs (hds#344). Launches a browser; not imported by `pnpm test`. */
import path from 'node:path';
import { AXE_TAGS, loadAxeSource } from '../axe-gate.mjs';
import { AXE_THEMES, VIEWPORTS, axeScanRow } from './live-plan.mjs';
import { openApp, serve } from './browser.mjs';

/**
 * axe-core over a built app in light and dark at 1280 wide, the same engine,
 * rule sets and injection as scripts/check-docs-axe.mjs. Returns scan rows
 * for evaluateScan; a scan that could not run becomes an error row, which
 * counts against the axe threshold.
 * @param {import('playwright').Browser} browser
 * @param {string} root repository root (where axe-core is resolved from)
 * @param {{id:string, dir:string}} app a prepared app
 * @param {{ viewports?: {key:string,width:number,height:number,theme:string}[], tenant?: string|null }} [opts]
 *   Without `viewports`: 1280 wide, in AXE_THEMES (the consistency run). With them (the
 *   explorations option): one scan per viewport, its rows labelled `<theme>@<width>`.
 *   The rule set is the same either way.
 */
export async function scanApp(browser, root, app, { viewports, tenant = null } = {}) {
  const axeSource = loadAxeSource(root);
  const plan = viewports
    ? viewports.map((v) => ({ viewport: v, theme: v.theme, label: `${v.theme}@${v.width}` }))
    : AXE_THEMES.map((theme) => ({ viewport: VIEWPORTS[0], theme, label: theme }));
  const site = await serve(path.join(app.dir, 'dist'));
  try {
    const rows = [];
    for (const { viewport, theme, label } of plan) {
      let context;
      try {
        const opened = await openApp(browser, site.base, viewport, theme, tenant);
        context = opened.context;
        await opened.page.evaluate(axeSource);
        const result = await opened.page.evaluate(
          (tags) =>
            window.axe.run(document, {
              runOnly: { type: 'tag', values: tags },
              resultTypes: ['violations'],
            }),
          AXE_TAGS,
        );
        rows.push(axeScanRow(app.id, label, result));
      } catch (error) {
        rows.push(axeScanRow(app.id, label, { error }));
      } finally {
        await context?.close();
      }
    }
    return rows;
  } finally {
    site.close();
  }
}
