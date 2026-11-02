True crossfades (hds#938): toggle Button label swaps and AsyncState status changes keep the old node mounted, overlapped and aria-hidden/inert, while the new one fades in; instant swap under prefers-reduced-motion.
Gate-fix follow-up: shared crossfadeFade + stubReducedMotion helpers (check-dupes) and refreshed dom-a11y baseline.
