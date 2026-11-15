# Sub-agent dispatch

When you dispatch parallel sub-agents, pick the cheapest model that can do the job.
Give the reason for the model and the effort in one line in the dispatch description.

## Model

- `sonnet` is the default for any source-code dispatch.
  - Use it for: schema extensions, new components that touch primitives or tokens, bridge endpoints, component refactors, validator additions, visual work where pixel quality matters.
  - It is required for any task with deletions: file removals, dead-code pruning, dependency removal, manifest entry cleanup.
- `opus` is for cross-cutting architecture reasoning, ambiguous scope that needs judgment, or a new validator with subtle logic.
  - Use it rarely. It is the most expensive option.
- Decision rule: if the task asks "what is idiomatic in this codebase?" (a primitive, a token path, a framework import, a slot vocabulary), the answer is `sonnet`.

## Effort and isolation

- Default to minimum effort. Keep high effort for `opus`-class problems.
- Use `isolation: "worktree"` when two agents can touch the same file.
