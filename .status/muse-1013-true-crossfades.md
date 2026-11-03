True crossfades (hds#938): toggle Button label swaps and AsyncState status changes keep the old node mounted, overlapped and aria-hidden/inert, while the new one fades in; instant swap under prefers-reduced-motion.
Gate-fix follow-up: shared crossfadeFade + stubReducedMotion helpers (check-dupes) and refreshed dom-a11y baseline.
Gate-fix follow-up 2: declare data-crossfade-view / data-crossfade-label / Button data-slot in PUBLIC_DATA_ATTRIBUTES; manifest + consumer skill regenerated.
