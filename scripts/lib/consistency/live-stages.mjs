/** @internal — live stages for scripts/eval-consistency.mjs and scripts/eval-refs.mjs. Launches a browser; not imported by `pnpm test`. */
import { rmSync } from 'node:fs';
import path from 'node:path';

/**
 * The real stages (pack, prepare, build, render, axe), shared by every mode that
 * builds: the consistency run, the explorations option and the design refs.
 * `close()` always; `cleanup()` only after a run that finished, so a failed one
 * keeps its scratch directory. `browser()` hands the same Chromium to callers
 * that need it for other work (scaling images).
 * @param {{ root:string, log:(line:string)=>void }} opts
 */
export async function liveStages({ root, log }) {
  const [{ launch }, pack, { buildApp }, { renderApp }, { scanApp }] = await Promise.all([
    import('./browser.mjs'),
    import('./pack.mjs'),
    import('./build.mjs'),
    import('./render.mjs'),
    import('./axe-run.mjs'),
  ]);
  const scratch = pack.makeScratch();
  const templateDir = path.join(root, 'eval/consistency/template');
  const packDir = path.join(root, 'reports/consistency/pack');
  let browser = null;
  const getBrowser = async () => (browser ??= await launch());
  log(`scratch directory ${scratch}`);
  const stages = {
    pack: async ({ skipBuild }) => pack.packLibrary({ root, packDir, skipBuild }),
    prepare: async (app, packed) => {
      const r = pack.prepareApp({ templateDir, scratch, app, packed });
      for (const f of r.ignored) log(`[${app.id}] ${f} ignored: the template owns it`);
      return { dir: r.dir };
    },
    build: async (app) => buildApp(app.dir),
    render: async (app, o) => renderApp(await getBrowser(), app.dir, o),
    axe: async (app, o) => scanApp(await getBrowser(), root, app, o),
  };
  return {
    stages,
    browser: getBrowser,
    close: async () => {
      await browser?.close();
    },
    cleanup: () => rmSync(scratch, { recursive: true, force: true }),
  };
}
