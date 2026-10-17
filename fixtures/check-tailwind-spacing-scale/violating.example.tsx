// Canary: every class below must be flagged by scripts/check-tailwind-spacing-scale.mjs.
export const Bad = () => <div className="gap-2 p-5 px-3 mb-6 -mt-6" />;
// A primitive var and a deprecated off-grid step are flagged too (2026-10 spacing prune).
export const Worse = () => <div className="p-[var(--primitive-space-4)] gap-px6" />;
