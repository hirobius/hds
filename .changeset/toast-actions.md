---
'@hirobius/design-system': minor
---

Toast takes up to two `actions` (`{ label, onSelect, altText? }`): small secondary buttons under the message, such as Open and Undo. Choosing one runs `onSelect` and closes the toast. Each is a Radix `Toast.Action`, so screen readers hear its `altText` (defaults to the label) since a toast never takes focus. A toast without `actions` renders as before. Replaces the hand-built action toast job-hunt kept for "Saved to Pipeline · Open · Undo".
