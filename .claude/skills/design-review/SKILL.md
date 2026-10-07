---
name: design-review
description: Review the visual quality of an HDS screen, component or screenshot against one fixed rubric. Use for a URL, HTML file or screenshot set.
---

A visual review that every agent runs the same way: capture, score every rule on every capture, report a ranked list, hand mechanical findings to the gates.

## Input

A URL, an HTML file, or a screenshot set. Four captures per screen: **light 1280, dark 1280, light 390, dark 390**. A screenshot set missing a cell is incomplete; capture the rest or mark that cell `n/a` with the reason.

## Steps

### 1. Capture

Playwright with Chromium at `/opt/pw-browsers/chromium`. Run the script from the repo root as a temporary dotfile (`.capture.mjs`) and delete it afterwards.

```js
import { chromium } from 'playwright';
const [url, out = 'shots'] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
for (const scheme of ['light', 'dark'])
  for (const [w, h] of [[1280, 800], [390, 844]]) {
    const p = await b.newPage({ viewport: { width: w, height: h }, colorScheme: scheme });
    await p.goto(url, { waitUntil: 'networkidle' });
    await p.evaluate((s) => document.documentElement.setAttribute('data-theme', s), scheme);
    await p.screenshot({ path: `${out}/${scheme}-${w}.png`, fullPage: true });
  }
await b.close();
```

If the browser path differs, `ls -l /opt/pw-browsers/`. Read every screenshot (tall pages: crop into viewport-height slices so small type stays legible). For a live page, also probe computed styles (font sizes, widths, heights, paddings) to confirm what the pixels suggest.

### 2. Score

Apply every rule of the rubric to every capture. Each cell gets `pass`, `fail` or `n/a` (with the reason `n/a` applies).

### 3. Report

A ranked list, worst first (rank by how much a user would notice, then by how many captures show it). Each finding has:

- **Rule**: the rubric leading word
- **Where**: capture, region, element
- **Fix**: the concrete change
- **Use**: the HDS component or token (look it up in `public/hds-manifest.json` and `hirobius.tokens.json`)

Close with the score grid: rules as rows, captures as columns.

### 4. Hand off

Findings a script can decide go to the deterministic gates; the finding names the gate and the fix and leaves the check to it. Gates: `pnpm check:layout-contract` (fill/hug, padding ownership), `pnpm check:spacing-scale` (rhythm, gaps), and the type-ramp gate (type ramp). Where the gate is not yet on `main`, name it in the finding anyway.

**Done** when the grid has a pass, fail or n/a for every rule on every capture and every `fail` appears in the ranked list.

## Rubric

Flat list. Each rule: leading word, then the test.

- **hierarchy**: one `display` per page. Pass: exactly one `h1` and one element on the display step per page (a component specimen sheet scores each specimen as its own page), and it is the first thing the eye lands on.
- **type ramp**: text sits on `display`, `title`, `body`, `ui`, `caption` or `mono` (decision 2026-10-07, hds#483 / hds#520). Pass: list the distinct computed `font-size / weight` pairs (a `getComputedStyle` sweep over text nodes); each maps to one of the six steps and the page uses at most six pairs besides `mono`. Uppercase or tracked variants of a step count as a separate pair.
- **lockups**: label/value pairs and eyebrow-plus-heading pairs come from one pattern (`MetadataList`, `Field`, `PageHeader` eyebrow). Pass: every instance of a pair looks identical, and an uppercase tracked label is at most half the size of the heading or value it sits against (a 12px label over a 60px headline reads as two unrelated objects).
- **rhythm**: every gap is an `xs`–`xl` step (8 / 16 / 24 / 32 / 48). Pass: the computed `gap` of every layout container between components is 8, 16, 24, 32 or 48 (sweep `row-gap`/`column-gap`; 4, 6, 12 and 20 are off-scale), sibling sections share one gap, and the gap grows with the level of the grouping (tighter inside a group, looser between groups). Sub-8 spacing inside one component belongs to the component and scores `n/a`.
- **fill vs hug**: leaves hug; text inputs, selects, tables and dividers fill up to a max width; height always hugs. Pass: buttons, badges, tags and toggles are as wide as their content, an input never spans a wide viewport edge to edge (it sits in a form column), and cards in a row end at their own content height.
- **padding**: containers pad (`Card`, `Surface`, `Alert`, `Dialog`, `Page`) and their parts do not. Pass: measure the x-distance from the container's outer edge to its first text (`getBoundingClientRect` on both); it equals one scale step (16 or 24), not their sum. A `Card` with a header measures one inset, not two. Without a live page, score from pixels at 1280 only.
- **alignment**: repeated items share left edges and baselines. Pass: in a list, row or grid of like items, the same field starts at the same x and the same text line sits on the same y.
- **density**: repeated items use the same spacing and size. Pass: sibling rows, tiles and cards have equal padding and equal control size.
- **color**: semantic tokens (`--semantic-*`), accent used once per view. Pass: no off-palette color, one accent focus of attention, and dark mode keeps surfaces distinct from the page (a `Surface` is visibly lifted from the background in both themes).
- **states**: hover, focus and disabled each look different from rest. Pass: press Tab to the control, hover it, and render it disabled; each state differs from rest (focus ring visible in both themes). A static screenshot with no state evidence scores `n/a`; a live page gets the Tab and hover captures.
- **empty**: a list or table with no data shows an `EmptyState` with a next action.
- **loading**: pending content shows `Skeleton` or `Spinner` with a visible size.
- **error**: failures show an `Alert` or field error that names the problem and the fix.
- **motion**: transitions stop under `prefers-reduced-motion: reduce`. Pass: re-probe with `reducedMotion: 'reduce'` and count elements with a nonzero `transitionDuration` or a running `animationName`; the count falls to the loading indicators (`Spinner`, `Skeleton`) alone.

`empty`, `loading` and `error` score `n/a` on a capture that cannot show them; say so rather than skipping the cell.
