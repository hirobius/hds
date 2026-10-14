---
'@hirobius/design-system': patch
---

Accessibility contracts for Checkbox, Radio, Toggle, Slider, SegmentedControl, Tag, Input, Textarea, Form, FormField, FormFieldShell and FormActions (hds#520): each states its rules as `@a11y` tags, and every rule the component keeps is proved by a contract test. Slider gains a `valueText` prop (exposed as `aria-valuetext`) and its visible label now focuses the range input; the compact SegmentedControl segment grows its hit area to 24px (WCAG 2.5.8) without changing its layout. The stale Tag, SegmentedControl and Input rules are replaced.
