# Screen spec: Client detail

The one screen every agent builds for the consistency harness (hds#343). Build
it exactly as described, using only `@hirobius/design-system`. Where this spec
says nothing about how something looks or which component to use, choose from
the public documentation; that choice is what the harness measures.

## Allowed inputs

Read only these, from the repository checkout at the recorded commit (most are
not in the published tarball):

- `public/llms.txt`
- `DESIGN.md`
- `CONSUMING.md` and `docs/CONSUMING.md`
- `public/hds-manifest.json`
- `src/app/data/component-api.json`
- the shipped `.d.ts` files of `@hirobius/design-system`

Not allowed: component source, stories, tests, or another agent's app.

## Output contract

- The app is a directory with `src/App.tsx` plus any extra files under `src/`.
- Do not edit `main.tsx`, `index.html` or the `<html>` element. The template
  owns the `data-hds` / `data-theme` scope wrapper.
- Import design-system components only from `@hirobius/design-system` or its
  subpaths (for example `@hirobius/design-system/patterns`).
- No raw hex or rgb colours, no raw `px` values, no Tailwind utility classes, no
  raw `button` / `input` / `select` / `textarea` elements, no custom CSS files.
- Use static data written inline in `src/`. No network calls.

## The screen

A single page for one client, "Northwind Studio". Top to bottom:

1. **Breadcrumb.** `Clients` > `Northwind Studio`. `Clients` is a link.
2. **Title and status.** The client name as the page title, with a status
   indicator reading `Active`.
3. **Three stat tiles.** `Open projects` (5), `Outstanding invoices` (2),
   `Lifetime value` ($48,200). Each tile has a label and a value.
4. **Tabs.** `Projects` (selected on load), `Notes`, `Activity`. Only the
   `Projects` panel needs content; the other two may be empty.
5. **Projects table** inside the `Projects` panel. Five rows, columns `Project`,
   `Status`, `Due` and an actions column. Every row has a `View` and an
   `Archive` action.

   | Project        | Status      | Due        |
   | -------------- | ----------- | ---------- |
   | Brand refresh  | In progress | 2026-10-14 |
   | Marketing site | In review   | 2026-10-28 |
   | Client portal  | Planned     | 2026-11-18 |
   | Annual report  | In progress | 2026-12-02 |
   | Packaging      | On hold     | 2027-01-20 |

6. **Notes form.** A labelled multi-line `Notes` field and a `Save note` button.
   Saving clears the field and shows a short confirmation.
7. **Archive confirmation dialog.** Choosing `Archive` on a row opens a modal
   dialog titled `Archive project?` naming the project, with `Cancel` and
   `Archive` buttons. `Cancel` closes it; `Archive` closes it and removes the
   row.

## Accessibility

Keyboard reachable end to end, focus moves into the dialog and returns to the
row action on close, every control has an accessible name.
