# Hirobius Design System

[![npm](https://img.shields.io/npm/v/@hirobius/design-system)](https://www.npmjs.com/package/@hirobius/design-system) [![Docs](https://img.shields.io/badge/Docs-live-000000)](https://hirobius-design-system.vercel.app/docs) [![License](https://img.shields.io/badge/license-MIT%20%2B%20OFL--1.1-blue)](LICENSE) [![CI](https://github.com/hirobius/hds/actions/workflows/ci.yml/badge.svg)](https://github.com/hirobius/hds/actions/workflows/ci.yml)

Token-first React components with checked contrast and focus.

[![Buttons under the Brand and Theme dials: base and accent-lilac, light and dark](docs/images/brand-theme-dials.png)](https://hirobius-design-system.vercel.app/docs)

## Table of Contents

- [Background](#background)
- [Install](#install)
- [Usage](#usage)
- [Docs](#docs)
- [For AI agents](#for-ai-agents)
- [Contributing](#contributing)
- [License](#license)

## Background

HDS (Hirobius Design System) is a React component library on a DTCG token pipeline. The tokens compile to CSS variables and TypeScript constants. Four root attributes re-skin every component, with no JavaScript.

AI agents design and build HDS. Automated checks gate their work: typecheck, lint, token and WCAG contrast checks, tests and a consumer build.

<!-- auto:start:front-door-counts -->

- **64** public component modules, exported from `src/index.ts`
- **581** DTCG tokens in `hirobius.tokens.json`, compiled to CSS variables and TypeScript constants

<!-- auto:end:front-door-counts -->

The long form (core set, adoption, theming, Figma sync, accessibility) is in [docs/OVERVIEW.md](docs/OVERVIEW.md).

## Install

```bash
pnpm add @hirobius/design-system react react-dom
```

npm and yarn work too. `react-router` is an optional peer. To upgrade, follow [UPGRADING.md](UPGRADING.md).

## Usage

```tsx
import '@hirobius/design-system/tokens.css';
import '@hirobius/design-system/fonts.css'; // optional brand fonts
import { Button } from '@hirobius/design-system';

// data-hds scopes the base styles
export const App = () => (
  <div data-hds>
    <Button>Get started</Button>
  </div>
);
```

Theming, scoping and the router seam: [docs/CONSUMING.md](docs/CONSUMING.md).

## Docs

Components, tokens and live demos: <https://hirobius-design-system.vercel.app/docs>

## For AI agents

- **MCP server:** the package ships `hds-mcp` (stdio, no network). Add it to your MCP client from an app that has the package installed: `{ "mcpServers": { "hds": { "command": "npx", "args": ["hds-mcp"] } } }`
- **llms.txt:** [llms.txt](llms.txt) ships in the package. It is also online at <https://hirobius-design-system.vercel.app/llms.txt>.
- **AGENTS.md:** [AGENTS.md](AGENTS.md) has the rules for agents that build with HDS.
- **Skill:** `npx skills add hirobius/hds --skill hds-consumer`

## Contributing

Issues and pull requests are welcome. [CONTRIBUTING.md](CONTRIBUTING.md) has the setup and the gates. Agents that work in this repo start at [docs/ai/FRONT-DOOR.md](docs/ai/FRONT-DOOR.md).

## License

[MIT](LICENSE) © Adrian Milsap. The embedded Sora and IBM Plex Mono fonts use the SIL Open Font License 1.1 ([NOTICE.md](NOTICE.md)).
