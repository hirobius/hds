#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Hirobius Design System — `pnpm figma:links`
 *
 * Projects each component's one Figma source, `componentSpecs[].figmaUrl` in
 * public/hds-manifest.json (set from its `@figma` JSDoc tag), everywhere a
 * designer or engineer looks for it (scripts/lib/design-links.mjs):
 *
 *   README.md "Design ↔ Code links"        the section between the design-links markers
 *   figma/links/dev-resources.json          POST /v1/dev_resources body, for review
 *   figma/links/use-figma/descriptions-<file>[.dry-run].js
 *                                           component descriptions + documentation links
 *
 * Storybook reads the same field at run time (src/stories/design-parameters.ts).
 * figma/links/ is generated and gitignored. Nothing here talks to Figma except
 * --dev-resources, which a person runs with a token.
 *
 * Usage:
 *   pnpm figma:links                                  write the README section and carriers
 *   pnpm figma:links --check                          exit 1 when stale or broken; writes nothing
 *   FIGMA_ACCESS_TOKEN=… pnpm figma:links --dev-resources [--dry-run]
 *                                                     add "HDS source" / "HDS story" dev resources
 *                                                     to every linked node (never deletes)
 *
 * FIGMA_ACCESS_TOKEN: a Figma personal access token with the
 * file_dev_resources:read and file_dev_resources:write scopes, created at
 * https://www.figma.com/settings (Security → Personal access tokens). Pass it
 * for one run; never store it in the repo.
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'fs';
import { dirname, join, relative } from 'path';
import { fileURLToPath } from 'url';
import { format, resolveConfig } from 'prettier';
import {
  buildDescriptionsScript,
  collectDesignLinks,
  planDevResources,
  renderReadmeSection,
  syncDevResources,
  upsertReadmeSection,
} from './lib/design-links.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const LINKS_CONFIG = 'figma/links.json';

const MISSING_HELP = {
  [LINKS_CONFIG]:
    'pnpm figma:links needs it for the repository URL, branch and Storybook URL (see figma/README.md).',
  'public/hds-manifest.json': 'Run pnpm manifest:generate.',
};

const readJson = (root, path) => {
  const file = join(root, path);
  if (!existsSync(file)) {
    throw new Error([`${path} is missing.`, MISSING_HELP[path]].filter(Boolean).join(' '));
  }
  return JSON.parse(readFileSync(file, 'utf8'));
};

function storyFiles(root) {
  const found = [];
  const walk = (dir) => {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.name.endsWith('.stories.tsx') || entry.name.endsWith('.stories.ts')) {
        found.push({
          path: relative(root, path).replaceAll('\\', '/'),
          source: readFileSync(path, 'utf8'),
        });
      }
    }
  };
  walk(join(root, 'src', 'stories'));
  return found.sort((a, b) => a.path.localeCompare(b.path));
}

/**
 * @param {string} root  Repo root (or a mini-root with the same layout).
 * @returns {{ links: object[], problems: string[], total: number }}
 */
export function computeDesignLinks(root) {
  const config = readJson(root, LINKS_CONFIG);
  return collectDesignLinks({
    manifest: readJson(root, 'public/hds-manifest.json'),
    stories: storyFiles(root),
    config,
    packageName: readJson(root, 'package.json').name,
  });
}

/** README.md with a current, Prettier-formatted section. */
async function nextReadme(root, collected) {
  const readmePath = join(root, 'README.md');
  const current = readFileSync(readmePath, 'utf8');
  const options = (await resolveConfig(readmePath)) ?? {};
  const section = await format(renderReadmeSection(collected), {
    ...options,
    parser: 'markdown',
  });
  return { readmePath, current, next: upsertReadmeSection(current, section) };
}

/**
 * @param {string} root
 * @returns {Promise<{ problems: string[], readmeUpToDate: boolean, links: number, total: number }>}
 */
export async function checkDesignLinks(root) {
  const collected = computeDesignLinks(root);
  const { current, next } = await nextReadme(root, collected);
  return {
    problems: collected.problems,
    readmeUpToDate: current === next,
    links: collected.links.length,
    total: collected.total,
  };
}

/**
 * Writes the README section and regenerates every carrier under outDir.
 *
 * @param {{ root: string, outDir: string }} options
 */
export async function writeDesignLinks({ root, outDir }) {
  const collected = computeDesignLinks(root);
  const { readmePath, current, next } = await nextReadme(root, collected);
  if (next !== current) writeFileSync(readmePath, next);

  const outputs = [
    [
      'dev-resources.json',
      `${JSON.stringify(
        {
          dev_resources: planDevResources(collected.links, []).create.map(
            ({ component: _component, ...resource }) => resource,
          ),
        },
        null,
        2,
      )}\n`,
    ],
  ];
  for (const fileKey of [...new Set(collected.links.map((link) => link.fileKey))].sort()) {
    outputs.push(
      [
        `use-figma/descriptions-${fileKey}.dry-run.js`,
        buildDescriptionsScript(collected.links, fileKey, { dryRun: true }),
      ],
      [`use-figma/descriptions-${fileKey}.js`, buildDescriptionsScript(collected.links, fileKey)],
    );
  }
  rmSync(outDir, { recursive: true, force: true });
  for (const [path, text] of outputs) {
    mkdirSync(dirname(join(outDir, path)), { recursive: true });
    writeFileSync(join(outDir, path), text);
  }
  return { ...collected, readmeChanged: next !== current, files: outputs.map(([path]) => path) };
}

function printProblems(problems) {
  if (problems.length === 0) return;
  console.error(`\n✗ ${problems.length} problem(s) with the Figma links:`);
  for (const problem of problems) console.error(`  • ${problem}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const outDir = join(ROOT, 'figma', 'links');
  try {
    if (args.includes('--check')) {
      const check = await checkDesignLinks(ROOT);
      printProblems(check.problems);
      if (!check.readmeUpToDate) {
        console.error(
          '✗ README.md "Design ↔ Code links" is stale. Run: pnpm manifest:generate && pnpm figma:links',
        );
      }
      if (check.problems.length > 0 || !check.readmeUpToDate) process.exit(1);
      console.log(
        `✓ figma:links — ${check.links} of ${check.total} components link a Figma node; README current`,
      );
    } else if (args.includes('--dev-resources')) {
      const { links, problems } = computeDesignLinks(ROOT);
      printProblems(problems);
      const result = await syncDevResources({
        links,
        token: process.env.FIGMA_ACCESS_TOKEN,
        dryRun: args.includes('--dry-run'),
      });
      console.log(`figma:links — ${result.line}`);
      for (const item of [...result.plan.create, ...result.plan.update]) {
        console.log(`  ${item.component}: ${item.name} → ${item.url}`);
      }
      for (const error of result.errors) console.error(`  ✗ ${error}`);
      if (result.errors.length > 0) process.exit(1);
    } else {
      const result = await writeDesignLinks({ root: ROOT, outDir });
      const rel = relative(ROOT, outDir).replaceAll('\\', '/');
      console.log(
        [
          `figma:links — ${result.links.length} of ${result.total} components link a Figma node`,
          `  README.md "Design ↔ Code links" ${result.readmeChanged ? 'updated' : 'already current'}`,
          ...result.files.map((file) => `  ${rel}/${file}`),
          '',
          '  Dev resources:  FIGMA_ACCESS_TOKEN=<token> pnpm figma:links --dev-resources --dry-run',
          `  Descriptions:   run ${rel}/use-figma/descriptions-<file>.dry-run.js through use_figma, then the .js`,
        ].join('\n'),
      );
      printProblems(result.problems);
      if (result.problems.length > 0) process.exit(1);
    }
  } catch (error) {
    console.error(`✗ figma:links — ${error.message}`);
    process.exit(1);
  }
}
