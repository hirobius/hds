# Anti-slop skills: routing (F7)

Two review skills, pinned in `skills-lock.json` and committed unmodified.

| Skill                   | Source (licence)                                                                  | Pin       | Issue   |
| ----------------------- | --------------------------------------------------------------------------------- | --------- | ------- |
| `web-design-guidelines` | [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills) (MIT, per its README) | `063bee9` | hds#764 |
| `humanizer`             | [blader/humanizer](https://github.com/blader/humanizer) (MIT, `LICENSE-humanizer` here)       | `8c307f3` | hds#765 |

## When to use

- **Docs or README copy → `humanizer`.** Run it in file mode on prose you wrote or
  edited. It changes wording, never meaning, code, commands or link targets.
- **UI code review → `web-design-guidelines`**, as a second pass after
  `/design-review`. It reports `file:line` findings against Vercel's Web Interface
  Guidelines (accessibility, forms, focus, motion, copy).

## Limits

- Both are prose rules an agent applies, not deterministic checks. Neither gates
  CI. The deterministic anti-slop detector is impeccable (hds#553).
- `web-design-guidelines` fetches its rules at run time from
  `vercel-labs/web-interface-guidelines` on `main`. The lock pins the wrapper only,
  so the rule text can change between runs, and it needs network access.

## Overlaps

- `/design-review` stays the mandatory review for design-touching UI. It scores
  against the HDS rubric; `web-design-guidelines` adds generic web-interface rules.
- impeccable (hds#553) and `web-design-guidelines` both flag UI slop. Prefer
  impeccable's detector where a rule exists there; use this skill for what a
  detector cannot judge.
- `writing-for-agents` covers skills and agent docs; `humanizer` covers prose
  for people.
