/** @internal — the live half of scripts/eval-consistency.mjs (hds#344). */
/**
 * Runs every stage for every app and judges the result against the ledger
 * thresholds. The stages are passed in (pack, prepare, build, render, axe,
 * commit) so this orchestration can be tested without a network, a browser or a
 * build; scripts/eval-consistency.mjs wires the real ones.
 *
 *   pack     -> { tarball, sha256, version }      once per run
 *   prepare  -> { dir }                            template + app src + tarball installed
 *   build    -> { typechecked, built, log }        tsc --noEmit, then vite build
 *   render   -> { [viewportKey]: Buffer }          full-page PNG per viewport
 *   axe      -> scan rows (light and dark)
 *   commit   -> git sha the tarball was built from
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { formatCheck } from './evaluate.mjs';
import { pairwiseJaccard } from './jaccard.mjs';
import { appendEntry, readLedger } from './ledger.mjs';
import { VIEWPORTS, buildEntry, pairwiseDiffs, shotName } from './live-plan.mjs';
import { scanApp } from './violations.mjs';

/**
 * @param {{ root:string, ledgerFile:string, reportsDir:string, date:string,
 *   apps:{id:string, dir:string, files:Record<string,string>}[],
 *   skipBuild:boolean, writeLedger:boolean, notes?:string, log:(line:string)=>void }} input
 * @returns {Promise<{ code:number, report:object, entry:object|null }>}
 */
export async function runLive(input, stages) {
  const { apps, log } = input;
  const thresholds = readLedger(input.ledgerFile).thresholds;
  const ids = apps.map((a) => a.id);

  log(
    `packing the library (${input.skipBuild ? 'reusing the existing tarball' : 'build:lib + npm pack'})...`,
  );
  const packed = await stages.pack({ skipBuild: input.skipBuild });
  log(`tarball ${path.basename(packed.tarball)}`);
  log(`tarball sha256 ${packed.sha256}`);

  const builds = {};
  const buildLogs = {};
  const shots = {};
  const axeRows = [];
  for (const app of apps) {
    log(`[${app.id}] installing the tarball and peers into a copy of the template...`);
    const prepared = { ...app, ...(await stages.prepare(app, packed)) };
    log(`[${app.id}] tsc --noEmit, vite build...`);
    const b = await stages.build(prepared);
    builds[app.id] = b.built === true && b.typechecked === true;
    buildLogs[app.id] = b.log;
    if (!builds[app.id]) {
      log(
        `[${app.id}] did not build: ${b.typechecked ? 'vite build failed' : 'type check failed'}`,
      );
      if (b.log)
        log(
          b.log
            .trim()
            .split('\n')
            .slice(-12)
            .map((l) => `    ${l}`)
            .join('\n'),
        );
      continue;
    }
    log(`[${app.id}] rendering ${VIEWPORTS.map((v) => v.key).join(', ')}...`);
    shots[app.id] = await stages.render(prepared);
    log(`[${app.id}] axe (light, dark)...`);
    axeRows.push(...(await stages.axe(prepared)));
  }

  const outDir = path.join(input.reportsDir, input.date);
  mkdirSync(outDir, { recursive: true });
  for (const [id, byViewport] of Object.entries(shots)) {
    for (const v of VIEWPORTS) writeFileSync(path.join(outDir, shotName(id, v)), byViewport[v.key]);
  }

  const hits = Object.fromEntries(apps.map((a) => [a.id, scanApp(a.files)]));
  const sources = Object.fromEntries(apps.map((a) => [a.id, Object.values(a.files).join('\n')]));
  const allRendered = ids.every((id) => shots[id]);
  const diffAt = (key) =>
    allRendered
      ? pairwiseDiffs(Object.fromEntries(ids.map((id) => [id, shots[id][key]])))
      : { pairs: [] };

  const results = {
    apps: ids,
    builds,
    violations: Object.fromEntries(ids.map((id) => [id, hits[id].length])),
    axe: axeRows.length ? axeRows : undefined,
    jaccard: pairwiseJaccard(sources),
    lightDiff: diffAt('1280-light'),
    darkDiff: diffAt('1280-dark'),
  };
  const { entry, report } = buildEntry({
    date: input.date,
    packageVersion: packed.version,
    tarballSha256: packed.sha256,
    commit: stages.commit(),
    apps: ids,
    results,
    thresholds,
    notes: input.notes,
  });

  log(`apps (${ids.length}): ${ids.join(', ')}`);
  for (const c of report.checks) log(formatCheck(c));
  for (const id of ids)
    for (const h of hits[id]) log(`  ${id} ${h.file}:${h.line} ${h.kind} ${h.match}`);
  for (const p of results.jaccard.pairs)
    log(`  jaccard ${p.a}~${p.b}: ${Number(p.value.toFixed(4))}`);
  for (const p of results.lightDiff.pairs)
    log(`  light diff ${p.a}~${p.b}: ${Number(p.pct.toFixed(4))}%`);
  for (const p of results.darkDiff.pairs)
    log(`  dark diff ${p.a}~${p.b}: ${Number(p.pct.toFixed(4))}% (not gated)`);
  log(`screenshots: ${outDir}`);

  if (!entry) {
    log(
      'ledger entry NOT written: the run could not measure every threshold (see the builds line).',
    );
  } else if (input.writeLedger) {
    appendEntry(input.ledgerFile, entry);
    log(`ledger entry appended: ${input.date} harness, pass ${entry.pass}`);
  } else {
    log('ledger entry NOT written: fixture input.');
  }
  log(report.pass ? 'RESULT: PASS' : 'RESULT: FAIL');
  return { code: report.pass ? 0 : 1, report, entry };
}
