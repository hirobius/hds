/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Shared scaffolding for the agent-sync test families (figma-agent-sync,
 * figma-agent-sync-parts): the links fixture, model editing helpers, the
 * temp-repo factory, and the `--from-receipt` ingest. Behavior-preserving
 * extraction (hds#1011); each test file still owns its own scenarios.
 */
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { ingestReceipt } from '../../figma-snapshot.mjs';
import { FIXTURE_TOKENS_PATH } from './figma-fixture.mjs';

export const LINKS = Object.freeze({
  docsUrl: 'https://hirobius-design-system.vercel.app',
  libraryFileKey: 'LIBRARYKEY000000000000',
  libraryFileName: 'HDS Tokens & Components',
  retiredFiles: [{ fileKey: 'RETIREDKEY000000000000', fileName: 'HDS Tokens & Components (old)' }],
  // HDS Staging, the draft workbench (ADR-026, A4): in links.json, and never a target.
  stagingFileKey: 'STAGINGKEY000000000000',
  stagingFileName: 'HDS Staging',
});
export const COMMIT = '0123456789abcdef0123456789abcdef01234567';

export const copy = (value) => JSON.parse(JSON.stringify(value));
export const variableOf = (model, path) =>
  model.collections.flatMap((c) => c.variables).find((v) => v.path === path);

/** A new variable like `from`, at `path`, named `name`, with `valuesByMode`. */
export const newVariable = (model, from, path, name, valuesByMode) => ({
  ...copy(variableOf(model, from)),
  path,
  name,
  codeSyntax: { WEB: `var(--${path.replaceAll('.', '-')})` },
  valuesByMode,
});

/** Temp repo roots seeded with the fixture tokens and links.json; call `cleanup` in afterEach. */
export function tempRoots(prefix) {
  let dirs = [];
  return {
    tempRoot() {
      const root = mkdtempSync(join(tmpdir(), prefix));
      dirs.push(root);
      copyFileSync(FIXTURE_TOKENS_PATH, join(root, 'hirobius.tokens.json'));
      mkdirSync(join(root, 'figma'), { recursive: true });
      writeFileSync(join(root, 'figma', 'links.json'), JSON.stringify(LINKS, null, 2));
      return root;
    },
    cleanup() {
      dirs.forEach((dir) => rmSync(dir, { recursive: true, force: true }));
      dirs = [];
    },
  };
}

/** Saves what use_figma returned, as an agent does, and ingests it with --from-receipt. */
export const ingest = (root, reads) =>
  ingestReceipt({
    root,
    files: reads.map((read, i) => {
      const path = join(root, `result-${i}.json`);
      writeFileSync(path, JSON.stringify(read));
      return path;
    }),
  });

/** An edit that applies a `renames` map (path -> path) to variables, their aliases and text-style bindings. */
export const spaceRenamer = (renames) => (model) => {
  const to = (path) => renames[path] || path;
  model.collections.forEach((c) =>
    c.variables.forEach((v) => {
      if (renames[v.path]) {
        v.path = to(v.path);
        v.name = v.path.replace('primitive.space-px.', 'space-px/');
        v.codeSyntax = { WEB: `var(--${v.path.replaceAll('.', '-')})` };
      }
      Object.values(v.valuesByMode).forEach(
        (entry) => 'alias' in entry && (entry.alias = to(entry.alias)),
      );
    }),
  );
  model.textStyles.forEach((style) =>
    Object.keys(style.boundVariables).forEach(
      (field) => (style.boundVariables[field] = to(style.boundVariables[field])),
    ),
  );
  return model;
};
