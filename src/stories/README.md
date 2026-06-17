# HDS Stories — Storybook 8

Component isolation and visual documentation for the Hirobius Design System primitives.

## Tool selection ledger

**Storybook 8** was selected over Histoire and Ladle per Adrian directive 2026-05-02:

| Tool | Decision | Reason |
|------|----------|--------|
| **Storybook 8** | **Selected** | Largest ecosystem, first-class `@storybook/addon-a11y`, Chromatic visual-regression integration, MDX docs support, React 18 + Vite 6 compatibility |
| Histoire | Rejected | Vue-first origin with a thin React adapter; narrower addon ecosystem; no Chromatic out of the box |
| Ladle | Rejected | Fastest setup but lacks a11y addon, MDX doc pages, and Chromatic integration — all required for the 29-primitive external API surface |

## Running stories

```bash
pnpm stories          # Start the dev server on port 6006
pnpm stories:build    # Build static Storybook to storybook-static/
```

## Adding a new story

1. Create `src/stories/HdsYourComponent.stories.tsx`
2. Follow the existing pattern — use `Meta` and `StoryObj` from `@storybook/react`
3. Add `tags: ["autodocs"]` to get the auto-generated docs tab
4. Every story gets the `ThemeProvider` wrapper automatically (via `.storybook/preview.tsx`)

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { HdsYourComponent } from "../app/components/HdsYourComponent";

const meta = {
  title: "Primitives/HdsYourComponent",
  component: HdsYourComponent,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
} satisfies Meta<typeof HdsYourComponent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { /* your props */ },
};
```

## Story coverage

| Component | Stories file | Status |
|-----------|-------------|--------|
| HdsButton | HdsButton.stories.tsx | done |
| Badge | Badge.stories.tsx | done |
| Alert | Alert.stories.tsx | done |
| Text | Text.stories.tsx | done |
| Divider | Divider.stories.tsx | done |
| Stack | Stack.stories.tsx | done |
| Input | Input.stories.tsx | done |
| Tag | Tag.stories.tsx | done |
| Icon | Icon.stories.tsx | done |
| IconButton | IconButton.stories.tsx | done |
| Disclosure | Disclosure.stories.tsx | done |
| Surface | surface.stories.tsx | done |
| InlineCode | InlineCode.stories.tsx | done |
| SegmentedControl | SegmentedControl.stories.tsx | done |
| HdsButtonGroup | HdsButtonGroup.stories.tsx | done |
| Container | Container.stories.tsx | done |
| Grid | Grid.stories.tsx | done |
| TextLockup | TextLockup.stories.tsx | done |

## A11y

`@storybook/addon-a11y` runs axe-core on every story automatically in the
Accessibility panel. Violations appear inline alongside the rendered story.

## CI integration

To integrate into CI, add a GitHub Actions workflow step:

```yaml
- name: Build Storybook
  run: pnpm stories:build
```

For visual regression, connect the repo to [Chromatic](https://www.chromatic.com/)
and add `npx chromatic --project-token <token>` after the build step.
