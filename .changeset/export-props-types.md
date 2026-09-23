---
'@hirobius/design-system': minor
---

Every props type behind a component the package exports is now exported too, so a
consumer can name it.

41 of them were not. `src/index.ts` re-exports each public module with `export *`, so a
type ships only if its module exports it — and for `Alert`, `Container`, `Stack`,
`Grid`, `CardHeader`, `ErrorBoundary` and 35 others it did not. The single most ordinary
thing a consumer writes,

```tsx
const Wrapped = (props: AlertProps) => <Alert {...props} />;
```

did not compile, and the author had to fall back to `React.ComponentProps<typeof Alert>`
or restate the shape by hand. Nothing here could see it: `tsc` is satisfied because the
type is in scope inside its own module, the component renders fine, and every test in
this repo imports from `src/`, where the barrel is irrelevant.

The rule is reachability, not the `Props` suffix. A type is exported iff it annotates the
props of a component the module exports — directly, through a trailing `export { … }`, or
through an `Object.assign` compound like `Grid`. That deliberately leaves internal: the 33
`VariantProps<typeof xVariants>` cva aliases (`button.tsx` sets that convention),
composition bases such as `NavNativeProps`, union arms such as `TokenBaseProps`, cast
targets such as `WiredChildProps`, and the props of sub-components the module keeps to
itself.

Purely additive — 41 symbols added, none removed, no module changed.
`scripts/check-props-exports.mjs` runs from `pretest` and holds the line.
