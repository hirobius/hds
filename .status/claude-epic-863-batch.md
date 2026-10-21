# claude/epic-863-batch

Integration branch for epic #863: merges the five finished branches (NavList select #868, PageHeader metadata #870, Disclosure row #873, Card.Source/Facts #872, Combobox creatable #871) in that order.

- Only the first merge conflicted (DESIGN.source.md hand-written line: kept both sides' additions; DESIGN.md and public/llms-full.txt regenerated). Later merges were clean; generators re-run after each and produced no diff.
- Combined manifest went 150 B gzip over its 65 kB budget (hds#413); fixed by dropping the duplicated JSX example from the Card doc comment (Card.Source/Card.Facts docs keep it). Budget not raised.
