/**
 * Tests for codemods/lib/installed-version.mjs (hds#453, reused by hds#452):
 * which @hirobius/design-system version each importer of a repo has installed,
 * read from the lockfile text alone. Fixtures are inline and tiny, and their
 * file names are never real lockfile names on disk, so the dependency graph
 * and update bots never mistake them for a project.
 */
import { describe, expect, it } from 'vitest';
import { pickLockfile, readLockfile } from '../../codemods/lib/installed-version.mjs';

const PNPM_V9_TWO_COPIES = `lockfileVersion: '9.0'

settings:
  autoInstallPeers: true
  excludeLinksFromLockfile: false

importers:

  .:
    dependencies:
      '@hirobius/design-system':
        specifier: ^0.16.0
        version: 0.16.0(react@18.3.1)
      react:
        specifier: ^18.3.1
        version: 18.3.1

  apps/site:
    devDependencies:
      '@hirobius/design-system':
        specifier: ^0.20.0
        version: 0.20.0(react@18.3.1)

  packages/util:
    dependencies:
      clsx:
        specifier: ^2.1.1
        version: 2.1.1

packages:

  '@hirobius/design-system@0.16.0':
    resolution: {integrity: sha512-aaa}
    peerDependencies:
      react: '>=18'

  '@hirobius/design-system@0.20.0':
    resolution: {integrity: sha512-bbb}

  clsx@2.1.1:
    resolution: {integrity: sha512-ccc}

snapshots:

  '@hirobius/design-system@0.16.0(react@18.3.1)':
    dependencies:
      react: 18.3.1
`;

describe('readLockfile — pnpm', () => {
  it('resolves each importer of a v9 lockfile, and lists both copies when two versions resolve', () => {
    expect(readLockfile('pnpm-lock.yaml', PNPM_V9_TWO_COPIES)).toEqual({
      kind: 'pnpm',
      version: '9.0',
      importers: { '.': '0.16.0', 'apps/site': '0.20.0' },
      versions: ['0.16.0', '0.20.0'],
    });
  });
});

describe('readLockfile — pnpm transitive copy', () => {
  it('lists a second HDS copy that only another package pulls in (packages/snapshots only)', () => {
    const text = `lockfileVersion: '9.0'

importers:

  .:
    dependencies:
      '@hirobius/design-system':
        specifier: ^0.20.0
        version: 0.20.0(react@18.3.1)
      '@hirobius/widgets':
        specifier: ^1.0.0
        version: 1.0.0

packages:

  '@hirobius/design-system@0.20.0':
    resolution: {integrity: sha512-bbb}

  '@hirobius/widgets@1.0.0':
    resolution: {integrity: sha512-ddd}

snapshots:

  '@hirobius/design-system@0.16.0(react@18.3.1)':
    dependencies:
      react: 18.3.1

  '@hirobius/widgets@1.0.0':
    dependencies:
      '@hirobius/design-system': 0.16.0(react@18.3.1)
`;
    expect(readLockfile('pnpm-lock.yaml', text)).toEqual({
      kind: 'pnpm',
      version: '9.0',
      importers: { '.': '0.20.0' },
      versions: ['0.16.0', '0.20.0'],
    });
  });
});

const PNPM_V6_SINGLE = `lockfileVersion: '6.0'

settings:
  autoInstallPeers: true
  excludeLinksFromLockfile: false

dependencies:
  '@hirobius/design-system':
    specifier: ^0.15.0
    version: 0.15.2(react@18.2.0)
  react:
    specifier: ^18.2.0
    version: 18.2.0

packages:

  /@hirobius/design-system@0.15.2(react@18.2.0):
    resolution: {integrity: sha512-xyz}
    dev: false

  /react@18.2.0:
    resolution: {integrity: sha512-rrr}
    dev: false
`;

describe('readLockfile — pnpm v6', () => {
  it('reads a single-package lockfile whose dependencies sit at the top level', () => {
    expect(readLockfile('pnpm-lock.yaml', PNPM_V6_SINGLE)).toEqual({
      kind: 'pnpm',
      version: '6.0',
      importers: { '.': '0.15.2' },
      versions: ['0.15.2'],
    });
  });
});

const NPM_V3_WORKSPACES = JSON.stringify({
  name: 'fleet-app',
  lockfileVersion: 3,
  requires: true,
  packages: {
    '': {
      name: 'fleet-app',
      workspaces: ['apps/*'],
      dependencies: { '@hirobius/design-system': '^0.16.0' },
    },
    'apps/site': { name: 'site', devDependencies: { '@hirobius/design-system': '^0.19.0' } },
    'apps/docs': { name: 'docs', dependencies: { '@hirobius/design-system': '^0.16.0' } },
    'apps/tools': { name: 'tools', dependencies: { clsx: '^2.1.1' } },
    'node_modules/@hirobius/design-system': { version: '0.16.0' },
    'apps/site/node_modules/@hirobius/design-system': { version: '0.19.1' },
    'node_modules/site': { resolved: 'apps/site', link: true },
    'node_modules/clsx': { version: '2.1.1' },
  },
});

describe('readLockfile — npm', () => {
  it('resolves a workspace to its nested copy and falls back to the hoisted one (v3)', () => {
    expect(readLockfile('package-lock.json', NPM_V3_WORKSPACES)).toEqual({
      kind: 'npm',
      version: '3',
      importers: { '.': '0.16.0', 'apps/site': '0.19.1', 'apps/docs': '0.16.0' },
      versions: ['0.16.0', '0.19.1'],
    });
  });

  it('reads a v2 lockfile and an npm-shrinkwrap.json the same way', () => {
    const v2 = JSON.stringify({
      name: 'folio-like',
      lockfileVersion: 2,
      packages: {
        '': { dependencies: { '@hirobius/design-system': '^0.16.0' } },
        'node_modules/@hirobius/design-system': { version: '0.16.0' },
      },
      dependencies: { '@hirobius/design-system': { version: '0.16.0' } },
    });
    const expected = {
      kind: 'npm',
      version: '2',
      importers: { '.': '0.16.0' },
      versions: ['0.16.0'],
    };
    expect(readLockfile('package-lock.json', v2)).toEqual(expected);
    expect(readLockfile('npm-shrinkwrap.json', v2)).toEqual(expected);
  });
});

const YARN_V1 = `# THIS IS AN AUTOGENERATED FILE. DO NOT EDIT THIS FILE DIRECTLY.
# yarn lockfile v1


"@hirobius/design-system@^0.12.0", "@hirobius/design-system@~0.12.1":
  version "0.12.3"
  resolved "https://registry.yarnpkg.com/@hirobius/design-system/-/design-system-0.12.3.tgz#aaa"
  integrity sha512-aaa

"@hirobius/design-system@^0.16.0":
  version "0.16.0"
  resolved "https://registry.yarnpkg.com/@hirobius/design-system/-/design-system-0.16.0.tgz#bbb"
  integrity sha512-bbb
  dependencies:
    clsx "^2.1.1"

clsx@^2.1.1:
  version "2.1.1"
  resolved "https://registry.yarnpkg.com/clsx/-/clsx-2.1.1.tgz#ccc"
`;

const YARN_BERRY = `# This file is generated by running "yarn install" inside your project.
# Manual changes might be lost - proceed with caution!

__metadata:
  version: 8
  cacheKey: 10c0

"@hirobius/design-system@npm:^0.18.0":
  version: 0.18.0
  resolution: "@hirobius/design-system@npm:0.18.0"
  dependencies:
    clsx: "npm:^2.1.1"
  checksum: 10c0/aaa
  languageName: node
  linkType: hard

"clsx@npm:^2.1.1":
  version: 2.1.1
  resolution: "clsx@npm:2.1.1"
  languageName: node
  linkType: hard

"fleet-app@workspace:.":
  version: 0.0.0-use.local
  resolution: "fleet-app@workspace:."
  dependencies:
    "@hirobius/design-system": "npm:^0.18.0"
  languageName: unknown
  linkType: soft

"web@workspace:apps/web":
  version: 0.0.0-use.local
  resolution: "web@workspace:apps/web"
  dependencies:
    "@hirobius/design-system": "npm:^0.18.0"
    clsx: "npm:^2.1.1"
  languageName: unknown
  linkType: soft
`;

describe('readLockfile — yarn', () => {
  it('resolves a v1 lockfile through the ranges each importer declares', () => {
    const ranges = { '.': '^0.16.0', 'packages/legacy': '~0.12.1' };
    expect(readLockfile('yarn.lock', YARN_V1, { ranges })).toEqual({
      kind: 'yarn',
      version: 'v1',
      importers: { '.': '0.16.0', 'packages/legacy': '0.12.3' },
      versions: ['0.12.3', '0.16.0'],
    });
  });

  it('resolves a berry lockfile through its workspace entries', () => {
    expect(readLockfile('yarn.lock', YARN_BERRY)).toEqual({
      kind: 'yarn',
      version: '8',
      importers: { '.': '0.18.0', 'apps/web': '0.18.0' },
      versions: ['0.18.0'],
    });
  });
});

// bun.lock is JSON with trailing commas. A copy hoisted for one workspace only
// is keyed under that workspace's package name.
const BUN_LOCK = `{
  "lockfileVersion": 1,
  "workspaces": {
    "": {
      "name": "fleet-app",
      "dependencies": {
        "@hirobius/design-system": "^0.17.0",
      },
    },
    "apps/web": {
      "name": "web",
      "devDependencies": {
        "@hirobius/design-system": "^0.19.0",
      },
    },
    "apps/api": {
      "name": "api",
      "dependencies": {
        "clsx": "^2.1.1",
      },
    },
  },
  "packages": {
    "@hirobius/design-system": ["@hirobius/design-system@0.17.0", "", { "dependencies": { "clsx": "^2.1.1" } }, "sha512-aaa"],

    "clsx": ["clsx@2.1.1", "", {}, "sha512-ccc"],

    "web/@hirobius/design-system": ["@hirobius/design-system@0.19.1", "", {}, "sha512-bbb"],
  }
}
`;

describe('readLockfile — bun', () => {
  it('resolves each workspace of a text bun.lock, preferring its own copy', () => {
    expect(readLockfile('bun.lock', BUN_LOCK)).toEqual({
      kind: 'bun',
      version: '1',
      importers: { '.': '0.17.0', 'apps/web': '0.19.1' },
      versions: ['0.17.0', '0.19.1'],
    });
  });
});

describe('pickLockfile', () => {
  it('picks the lockfile the package manager would read, from the files at a root', () => {
    expect(pickLockfile(['README.md', 'package.json'])).toBeNull();
    expect(pickLockfile(['package.json', 'yarn.lock', 'pnpm-lock.yaml'])).toBe('pnpm-lock.yaml');
    expect(pickLockfile(['package-lock.json', 'npm-shrinkwrap.json'])).toBe('npm-shrinkwrap.json');
    expect(pickLockfile(['bun.lockb', 'bun.lock'])).toBe('bun.lock');
  });

  it('follows the packageManager field when more than one lockfile is present', () => {
    const files = ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml'];
    expect(pickLockfile(files, 'yarn@4.5.0')).toBe('yarn.lock');
    expect(pickLockfile(files, 'npm@10.8.2')).toBe('package-lock.json');
    expect(pickLockfile(['package-lock.json'], 'pnpm@9.0.0')).toBe('package-lock.json');
  });
});
