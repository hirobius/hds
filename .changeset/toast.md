---
"@hirobius/design-system": minor
---

Add **Toast** — transient feedback notifications backed by Radix Toast. Wrap the app once in `<ToastProvider>`, then call `useToast().toast({ title, description, tone })` imperatively from anywhere. Tones (`neutral`/`info`/`success`/`danger`/`warning`) tint the leading icon via the feedback tokens; auto-dismiss, swipe-to-dismiss, the a11y live region, and the viewport portal come from Radix. Adds `@radix-ui/react-toast`.
