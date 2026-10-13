# ADR-062: Keep client names out of the public repo

**Status:** Accepted, retroactive (decided 2026-09-29; recorded 2026-10-13 from commit and PR history). Extended on 2026-10-11 to shipped files.

## Context

HDS is a public repo and a public npm package. A review on 2026-09-28 (the parent of
hds#314 is the "Hiring-readiness burndown") found "the one real privacy exposure":
`scripts/lib/knowledge-classify.mjs` hardcoded client slugs and a regex matching a
named individual. The commit counts them: four client slugs and one named-individual
regex. A draft PR, #210, had proposed a fix earlier. hds#314 says it "targets files
that #248 already handled", so the issue says to close it with a comment and not merge it.

A second kind of leak turned up in shipped files. hds#545 (2026-10-08) found that the
README "In use" section named the one private consumer repo and one of its commits,
and "README ships in every tarball". Two JSDoc comments that land in `dist/types` named
a consumer, and a doc in the tarball named a private clients repo.

This ADR deliberately repeats none of those names.

## Decision

- **Rules move out of source.** The client slugs and the person regex load from
  `scripts/lib/knowledge-clients.local.json`, which is gitignored. If it is absent, the
  loader falls back to the checked-in placeholder `knowledge-clients.example.json`
  (`676e023`, PR #323, closes hds#314).
- **Errors never carry values.** They "name the file, never a rule value". Invalid
  JSON, a malformed shape and bad regexes fail loudly. The default loader warns once
  when it falls back to placeholders.
- **No rewrite of git history.** hds#314 says: "Rewrite git history? **No.**" The
  commit says: "The removed values remain in git history; whether to rewrite it is
  Adrian's call." A rewrite needs a force-push that Adrian does himself.
- **Shipped files carry no private names.** The JSDoc comments and the CONSUMING doc
  now describe the consumer generically, and a test fails if the README names the
  consumer repo or its commit (`d0100ad`, PR #614, hds#545). For hds#545 the default
  was to neutralize if Adrian did not answer by 2026-10-21. The issue closed on
  2026-10-12.

## Alternatives considered

- Rewrite git history. Declined for now; the decision is left to Adrian.
- Merge draft PR #210, which "loaded local-only and threw when absent". Its loader
  design was reused, with an example-file fallback and value-free errors added.
- For hds#545, keep the named showcase as a front-door signal (hds#306). The default
  was to neutralize, and the final choice is not stated in the commits read here.

## Rationale

The recorded reason is that a public repo and a public tarball must not carry client
identities or a named person. Rules that classify private content need the real values,
so the values move to a file that never leaves a machine. Test fixtures were swapped
for placeholders for the same reason: a review "found two removed client slugs still in
sales-pipeline fixtures".

## Consequences

- Still in force on origin/main. `.gitignore` carries `knowledge-clients.local.json`,
  and only `knowledge-clients.example.json` is tracked.
- A machine without the local file classifies with placeholder rules and warns once.
  Real classification needs the file to be supplied by hand.
- The values stay in git history. As far as the commits show, no history rewrite has
  been decided.
- Public docs describe consumers by kind ("one product app", "a static-site factory").
  Machine-readable consumer lists use `redact()` (see ADR-057).

## Lessons

- Never hardcode private identities in a rules file in a public repo. Load them from an
  ignored file with a placeholder fallback.
- Error messages are output too. Name the file, not the value.
- A grep done by hand finds the first copy. Review found fixture copies the grep
  missed, so give the rule a test, as PR #614 did for the README.
- Removing a value does not remove it from history. Say so in the PR and leave the
  rewrite decision to the owner.

## Evidence

- `676e023` fix(privacy): move client and person rules out of knowledge-classify.mjs (PR #323, hds#314)
- `d0100ad` docs: no private consumer or repo names in shipped files (PR #614, hds#545)
- hds#314: Privacy: move client and named-individual rules out of knowledge-classify.mjs
- hds#545: README "In use" names a private consumer repo and one of its commits
- Draft PR #210, which hds#314 says not to merge
