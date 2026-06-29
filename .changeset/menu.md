---
"@hirobius/design-system": minor
---

Add **Menu** — a Radix-backed dropdown-menu primitive (compound parts: `Menu`, `Menu.Trigger`, `Menu.Content`, `Menu.Item`, `Menu.CheckboxItem`, `Menu.RadioGroup`/`RadioItem`, `Menu.Label`, `Menu.Separator`, `Menu.Group`, `Menu.Sub`/`SubTrigger`/`SubContent`) themed with the overlay role tokens to match Dialog/Popover. Roving focus, type-ahead, checkbox/radio items, submenus, and dismissal come from Radix. Promotes the dropdown that previously lived privately inside the theme-toggle into a public component (no new dependency — `@radix-ui/react-dropdown-menu` was already present).
