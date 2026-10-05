# HDS MDX Content Model & Page Templates (`content-model.md`)

This document defines the content model, frontmatter schema, page layout templates, and strict placeholder rules for converting the HDS documentation surface into Fumadocs MDX files.

---

## 1. Frontmatter Schema

Every `.mdx` page in `content/docs/` MUST start with a YAML frontmatter block adhering to this schema:

```yaml
---
title: "Button"
description: "Trigger actions, submit forms, or navigate through application flows."
component: "Button"
status: "stable" # "stable" | "deprecated" | "experimental"
since: "0.1.0"
related:
  - "Callout"
  - "FormActions"
---
```

### Frontmatter Field Specifications

| Field | Type | Required | Description | Example |
| :--- | :--- | :--- | :--- | :--- |
| `title` | `string` | **Yes** | Display title for header and sidebar navigation. | `"Button"` |
| `description` | `string` | **Yes** | One-sentence summary for SEO, page header, and `llms.txt`. | `"Interactive action trigger."` |
| `component` | `string` | No | Primary export name from `@hirobius/design-system`. | `"Button"` |
| `status` | `enum` | **Yes** | System maturity status: `"stable"`, `"deprecated"`, or `"experimental"`. | `"stable"` |
| `since` | `string` | No | Package version in which the component or feature was introduced. | `"0.1.0"` |
| `related` | `string[]` | No | Array of related component names or page routes. | `["Callout", "FormActions"]` |

---

## 2. Placeholder & Rules Specification

To preserve accuracy, zero-debt architecture, and maintainability across automated build tools, the following rules apply to ALL MDX files:

### Rule 1: Generated Token Tables (NEVER Hand-Written)
- **DO NOT** hand-write hex values, pixel tables, or CSS variable mappings in MDX files.
- Token tables and swatch grids are re-baked dynamically at build time from `hirobius.tokens.json`.
- Place the following marker in the MDX source where token mappings should render:
  ```mdx
  {/* generated: tokens */}
  ```

### Rule 2: Props & API Integrity (NEVER Invent Props)
- Prop tables MUST be transcribed strictly from TypeScript interfaces and `src/app/data/component-api.json`.
- If prop information is incomplete or missing, **DO NOT** invent props or guess types.
- Mark missing prop definitions with the explicit TODO marker:
  ```mdx
  {/* props: TODO — source missing */}
  ```

### Rule 3: Component Live Previews
- Previews are rendered by the Fumadocs component registry seam.
- Include a live preview placeholder tag naming the primary component or story:
  ```mdx
  {/* preview: <ComponentName> */}
  ```

### Rule 4: Exclude 32 Removed Components & Deprecated Variants
- Do not create component pages for the 32 components removed in v0.20.0 (e.g. `AppShell`, `Calendar`, `SideNav`, `TopNav`, `ContextMenu`, etc.) or deprecated primitives like `StatusDot`.
- Deprecated and removed components are documented exclusively in `guides/deprecation.mdx`.
- Ground truth for core components is `scripts/lib/core-components.mjs`.

---

## 3. Page Templates

### Template A: Component Page Template (`components/*.mdx`)

```mdx
---
title: "<ComponentName>"
description: "<One sentence describing purpose and role in UI.>"
component: "<ComponentName>"
status: "stable"
since: "0.1.0"
related:
  - "<RelatedComponent1>"
  - "<RelatedComponent2>"
---

# <ComponentName>

<One to two paragraphs giving editorial overview and design rationale.>

## Live Preview

{/* preview: <ComponentName> */}

## Usage & Examples

### Basic Example

```tsx
import { <ComponentName> } from '@hirobius/design-system';

export function Example() {
  return <<ComponentName> />
}
```

### Variants & States

<Guidance on key variants, sizes, and interactive states.>

## Props & API

{/* props: <ComponentName> */}

## Accessibility

- **Keyboard:** <Focus and keypress interaction rules.>
- **ARIA:** <Roles, states, and properties applied.>
- **Screen Reader:** <Announcements and accessible label expectations.>

## Tokens Used

{/* generated: tokens */}

## Related Components

- [<RelatedComponent1>](/docs/components/<related-1>)
- [<RelatedComponent2>](/docs/components/<related-2>)
```

---

### Template B: Foundation Page Template (`foundations/*.mdx`)

```mdx
---
title: "<FoundationName>"
description: "<One sentence description of the foundation principle.>"
status: "stable"
since: "0.1.0"
---

# <FoundationName>

<Editorial description of foundation principles and visual language.>

## Principle

<Design principles governing usage across themes and products.>

## Token Reference

{/* generated: tokens */}

## Usage Guidance

- Do <Best practice 1>.
- Do <Best practice 2>.

## Don'ts

- Don't <Anti-pattern 1>.
- Don't <Anti-pattern 2>.
```

---

### Template C: Pattern Page Template (`patterns/*.mdx`)

```mdx
---
title: "<PatternName>"
description: "<One sentence description of the composite pattern.>"
status: "stable"
since: "0.13.0"
related:
  - "<Primitive1>"
  - "<Primitive2>"
---

# <PatternName>

<Editorial introduction to the composite pattern.>

## Live Example

{/* preview: <PatternName> */}

## When to Use

- Use when <Scenario 1>.
- Use when <Scenario 2>.

## When Not to Use

- Do not use when <Counter-scenario 1>. Use [<Alternative>](/docs/components/<alternative>) instead.

## Composition & Code

```tsx
import { <PatternName> } from '@hirobius/design-system/patterns';

export function PatternDemo() {
  return <<PatternName> />;
}
```

## Related Primitives

- [<Primitive1>](/docs/components/<primitive-1>)
- [<Primitive2>](/docs/components/<primitive-2>)
```

---

### Template D: Guide Page Template (`guides/*.mdx`)

```mdx
---
title: "<GuideTitle>"
description: "<One sentence summary of the guide.>"
status: "stable"
---

# <GuideTitle>

<Overview section explaining purpose and applicability.>

## Overview

<Detailed guidance, step-by-step instructions, or policy rationale.>

## Examples & Code

```bash
# Example command or setup code
```

## Best Practices

- <Recommendation 1>
- <Recommendation 2>
```
