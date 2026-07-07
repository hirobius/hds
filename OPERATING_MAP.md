# OPERATING_MAP

Short guide for where information should go.

## Use This File For

- deciding which canonical doc to update
- understanding the project's information flow

Do not use it as a second policy file.

## Where Things Go

| If you have...                           | Put it in...                                                        |
| ---------------------------------------- | ------------------------------------------------------------------- |
| a new task or follow-up                  | a GitHub Issue in this repo (fleet-hub convention, see `CLAUDE.md`) |
| a token-rule change                      | `TOKEN_GOVERNANCE.md`                                               |
| a visual/brand rule change               | `DESIGN.md`                                                         |
| a scripts/checks inventory update        | `SYSTEMS_REGISTRY.md`                                               |
| a long-term memory or cross-project item | the ops repo's HANDOFF doc (fleet hub, see `CLAUDE.md`)             |

## Typical Flow

```text
task or finding
  -> implementation
  -> verification
  -> update the one canonical doc that owns the result
```

## Read Order

Default:

1. `CLAUDE.md`
2. open only the canon the task actually needs

Archived helper docs are not part of normal startup context.

## Drift Rule

If this file starts restating detailed policy, trim it and move the real rule back to the owning document.

## Surfaces

The docs surface has one front door: the design-system reference (foundation
pages — typography, color, spacing, shape, elevation, motion, breakpoints —
and the component catalog), served at root with legacy `/hds/*` deep-links
redirected. The gated `/ops` operator surface was removed (ADR-018 §6).
