/** @internal — the explorations option of scripts/eval-consistency.mjs (hds#628). */
/**
 * Runs the explorations gates over the directions of one run directory.
 *
 * The same stages the consistency harness runs are passed in (pack, prepare,
 * build, render, axe), so this orchestration is tested without a network, a
 * browser or a build, and no second runner exists. With `stages` null it is the
 * offline half: layout, lint, gap logs and PII from source only.
 *
 * Differences from the consistency run (scripts/lib/consistency/live.mjs), all
 * because the question differs: that run asks whether three agents built ONE
 * screen the same way; this one asks whether each of three deliberately
 * different directions is fit to show.
 *   - no Jaccard and no pixel diff: A, B and C are meant to differ;
 *   - no ledger entry: nothing here is a measurement over time;
 *   - each direction is judged on its own, by its letter;
 *   - 390 wide is captured in dark as well as light, and axe scans every
 *     viewport in both themes (the rule set is the harness's, unchanged);
 *   - a direction renders under the demo tenant its refs.json declares.
 *
 *   pack     -> { tarball, sha256, version, commit, dirty }   once per run
 *   prepare  -> { dir }
 *   build    -> { typechecked, built, log }
 *   render   -> (app, { viewports, tenant }) => { [viewportKey]: Buffer }
 *   axe      -> (app, { viewports, tenant }) => scan rows, one per viewport and theme
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { evaluateScan } from '../axe-gate.mjs';
import { failedStages, trimBuildLog } from '../consistency/live-plan.mjs';
import { formatChecks, judgeStatic } from './gates.mjs';
import { EXPLORATION_VIEWPORTS } from './spec.mjs';

const plural = (n, one) => `${n} ${one}${n === 1 ? '' : 's'}`;

const builds = (log) => ({ name: 'builds', status: 'fail', text: log[0], detail: log });
const notMeasured = (name) => ({
  name,
  status: 'not-measured',
  text: 'not measured',
  detail: [],
});

/** The row label axe-run gives each viewport: `<theme>@<width>`. */
const axeLabel = (v) => `${v.theme}@${v.width}`;

/**
 * Called only after a build, when every viewport must have been scanned: a
 * viewport with no scan (or a skipped one) fails, so a stage that returned
 * nothing can never read as clean.
 */
function axeCheck(rows, viewports) {
  const scanned = new Set(rows.filter((r) => !r.skipped).map((r) => r.theme));
  const missing = viewports.map(axeLabel).filter((label) => !scanned.has(label));
  const scan = evaluateScan(rows, []);
  const detail = [
    ...missing.map((label) => `no scan for ${label}`),
    ...scan.blocking.map(
      (b) => `${b.theme}: ${b.ruleId} (${b.impact}), ${plural(b.nodes, 'node')}`,
    ),
    ...scan.errored.map((e) => `${e.theme}: scan errored (${e.error})`),
  ];
  return {
    name: 'axe',
    status: detail.length ? 'fail' : 'pass',
    text: detail.length
      ? [
          missing.length && `${plural(missing.length, 'viewport')} not scanned`,
          detail.length > missing.length &&
            plural(detail.length - missing.length, 'serious or critical finding'),
        ]
          .filter(Boolean)
          .join('; ')
      : `0 serious or critical, ${plural(rows.length, 'scan')} (light and dark, every viewport)`,
    detail,
  };
}

/**
 * @param {{ root:string, date:string, run:string, outDir:string, directions:object[],
 *   tenants:Record<string,{demo:boolean}>, denylist:string[],
 *   fixtureFindings:{file:string,line:number,kind:string,match:string}[],
 *   skipBuild:boolean, log:(line:string)=>void }} input
 *   `directions` are readDirection() results; `fixtureFindings` are PII findings in the screens' fixture data.
 * @param {object|null} stages
 * @returns {Promise<{ code:number, report:object }>}
 */
export async function runExplorations(input, stages) {
  const { directions, log } = input;
  const ids = directions.map((d) => d.id);
  log(`directions (${ids.length}): ${ids.join(', ')}`);

  const judged = directions.map((d) =>
    judgeStatic(d, { tenants: input.tenants, denylist: input.denylist }),
  );

  let packed = null;
  if (stages) {
    log(
      `packing the library (${input.skipBuild ? 'reusing the existing tarball' : 'build:lib + npm pack'})...`,
    );
    packed = await stages.pack({ skipBuild: input.skipBuild });
    log(`tarball ${path.basename(packed.tarball)}`);
    log(`tarball sha256 ${packed.sha256}`);
    log(`commit ${packed.commit}${packed.dirty ? ' (uncommitted changes)' : ''}`);
    if (packed.dirty) {
      log('warning: the tree has uncommitted changes, so the commit above is approximate.');
    }
  }

  const shots = {};
  for (const [i, d] of directions.entries()) {
    const j = judged[i];
    shots[d.id] = {};
    if (!stages) {
      j.checks.push(notMeasured('builds'), notMeasured('axe'));
      continue;
    }
    if (!d.files['src/App.tsx']) {
      j.checks.push(
        builds(['src/App.tsx is missing, so there is nothing to build']),
        notMeasured('axe'),
      );
      continue;
    }
    log(`[${d.id}] installing the tarball and peers into a copy of the template...`);
    const prepared = { id: d.id, dir: d.dir, files: d.files, ...(await stages.prepare(d, packed)) };
    log(`[${d.id}] tsc --noEmit, vite build...`);
    const b = await stages.build(prepared);
    if (b.built !== true || b.typechecked !== true) {
      j.checks.push(
        builds([failedStages(b), ...(b.log ? trimBuildLog(b.log).split('\n') : [])]),
        notMeasured('axe'),
      );
      continue;
    }
    j.checks.push({ name: 'builds', status: 'pass', text: 'type-checks and builds', detail: [] });
    const opts = { viewports: EXPLORATION_VIEWPORTS, tenant: j.tenant };
    const where = j.tenant ? `tenant ${j.tenant}` : 'the HDS default';
    log(`[${d.id}] rendering ${EXPLORATION_VIEWPORTS.map((v) => v.key).join(', ')} at ${where}...`);
    shots[d.id] = await stages.render(prepared, opts);
    log(`[${d.id}] axe (light and dark, 1280 and 390)...`);
    j.checks.push(axeCheck(await stages.axe(prepared, opts), EXPLORATION_VIEWPORTS));
  }

  const fixtures = {
    name: 'fixtures',
    status: input.fixtureFindings.length ? 'fail' : 'pass',
    text: input.fixtureFindings.length
      ? plural(input.fixtureFindings.length, 'PII finding')
      : 'fixture data has nothing that looks like real personal data',
    detail: input.fixtureFindings.map((f) => `${f.file}:${f.line} ${f.kind} ${f.match}`),
  };

  const outFile = (id, v) => `${id}-${v.key}.png`;
  if (stages) {
    mkdirSync(input.outDir, { recursive: true });
    for (const id of ids) {
      for (const v of EXPLORATION_VIEWPORTS) {
        if (shots[id][v.key])
          writeFileSync(path.join(input.outDir, outFile(id, v)), shots[id][v.key]);
      }
    }
  }

  const report = {
    date: input.date,
    run: input.run,
    mode: stages ? 'full' : 'offline',
    pack: packed
      ? {
          tarballSha256: packed.sha256,
          commit: packed.commit,
          dirty: packed.dirty,
          version: packed.version,
        }
      : null,
    pass: false,
    fixtures: { status: fixtures.status, detail: fixtures.detail },
    directions: {},
  };
  directions.forEach((d, i) => {
    const j = judged[i];
    j.pass = j.checks.every((c) => c.status !== 'fail');
    report.directions[d.id] = {
      screen: d.screen,
      direction: d.letter,
      tenant: j.tenant,
      pass: j.pass,
      checks: j.checks,
      screenshots: Object.fromEntries(
        EXPLORATION_VIEWPORTS.filter((v) => shots[d.id][v.key]).map((v) => [
          v.key,
          outFile(d.id, v),
        ]),
      ),
    };
  });
  report.pass = fixtures.status === 'pass' && judged.every((j) => j.pass);

  for (const [i, d] of directions.entries()) {
    for (const line of formatChecks(
      d.id,
      judged[i].checks.filter((c) => c.status !== 'not-measured'),
    )) {
      log(line);
    }
  }
  for (const line of formatChecks('', [fixtures])) log(line);

  if (stages) {
    writeFileSync(path.join(input.outDir, 'gates.json'), `${JSON.stringify(report, null, 2)}\n`);
    log(`screenshots and gates.json: ${input.outDir}`);
  } else {
    log('not measured (offline): builds, axe, screenshots');
  }
  log(
    report.pass
      ? `RESULT: PASS${stages ? '' : ' (offline: builds, axe and screenshots not measured)'}`
      : 'RESULT: FAIL',
  );
  return { code: report.pass ? 0 : 1, report };
}
