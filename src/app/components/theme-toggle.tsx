/** @internal — utility-tier component; not part of @hirobius/design-system public API. */
/**
 * ThemeToggle — System / Light / Dark theme dropdown for the doc shell.
 *
 * @category Layout
 * @tier utility
 *
 * 9d-3 baseline: a header-slot dropdown with three options:
 *
 *   - System — follow `prefers-color-scheme`, react live to OS changes.
 *   - Light  — force light mode.
 *   - Dark   — force dark mode.
 *
 * Persistence:
 *   - Stored in localStorage under `hds-theme-mode` ('system' | 'light' | 'dark').
 *   - Mirrored to the legacy `hds-theme` key ('light' | 'dark') so the existing
 *     ThemeContext binary toggle (if mounted) stays in sync without a hard
 *     dependency between the two.
 *
 * Application:
 *   - Sets `data-theme="light"` or `data-theme="dark"` on `<html>` so the
 *     8e-2 `role.*` alias layer (theme-aware CSS vars) flips automatically.
 *   - Also toggles `<html>.dark` for parity with Tailwind's class-based dark
 *     variant (matching the convention already used in ThemeContext).
 *
 * Dependencies:
 *   - Uses motion/react for icon swap animation (AnimatePresence + MotionConfig).
 *   - SVG icons inlined (Sun / Moon / Monitor) — no icon-library dep added.
 *
 * Motion:
 *   - MotionConfig reducedMotion="user" honours prefers-reduced-motion at OS level.
 *   - AnimatePresence on the trigger icon gives a scale/fade swap on mode change.
 *   - The dropdown panel fades + slides in on open.
 *
 * Slot:
 *   - Renders into the `data-hds-slot="theme-toggle"` zone in DocShell.
 *
 * @doc-exempt — internal doc-shell scaffolding, not a public authoring primitive.
 */

import * as React from 'react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { cn } from '../../lib/utils';
import { useDropdown } from '../hooks/useDropdown';

// ── Types ──────────────────────────────────────────────────────────────────────

export type ThemeMode = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'hds-theme-mode';
const LEGACY_STORAGE_KEY = 'hds-theme';
const VALID_MODES: readonly ThemeMode[] = ['system', 'light', 'dark'];

// ── Pure helpers (testable, SSR-safe) ──────────────────────────────────────────

function readStoredMode(): ThemeMode {
  if (typeof window === 'undefined') return 'system';
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw && (VALID_MODES as readonly string[]).includes(raw)) {
      return raw as ThemeMode;
    }
  } catch {
    // localStorage may be blocked (private browsing) — fall through to default.
  }
  return 'system';
}

function readSystemPreference(): ResolvedTheme {
  if (typeof window === 'undefined' || !window.matchMedia) return 'dark';
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function resolveTheme(mode: ThemeMode): ResolvedTheme {
  if (mode === 'light') return 'light';
  if (mode === 'dark') return 'dark';
  return readSystemPreference();
}

function applyTheme(resolved: ResolvedTheme): void {
  if (typeof document === 'undefined') return;
  const html = document.documentElement;
  html.setAttribute('data-theme', resolved);
  html.classList.toggle('dark', resolved === 'dark');
}

function persistMode(mode: ThemeMode, resolved: ResolvedTheme): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, mode);
    // Mirror to the legacy binary key so the existing ThemeContext stays in
    // sync if it's mounted alongside (it reads 'hds-theme' on init).
    window.localStorage.setItem(LEGACY_STORAGE_KEY, resolved);
  } catch {
    // localStorage blocked — theme still applies in-memory for the session.
  }
}

// ── Inline icons (no new dep) ──────────────────────────────────────────────────

function SunIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 16 16"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <circle cx="8" cy="8" r="3" />
      <path d="M8 1.5v1.5M8 13v1.5M14.5 8H13M3 8H1.5M12.6 3.4l-1 1M5.4 10.6l-1 1M12.6 12.6l-1-1M5.4 5.4l-1-1" />
    </svg>
  );
}

function MoonIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 16 16"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M13.5 9.5A6 6 0 1 1 6.5 2.5a4.5 4.5 0 0 0 7 7Z" />
    </svg>
  );
}

function MonitorIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 16 16"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <rect x="2" y="3" width="12" height="9" rx="1" />
      <path d="M5.5 14.5h5M8 12.5v2" />
    </svg>
  );
}

const MODE_META: Record<
  ThemeMode,
  { label: string; Icon: React.FC<React.SVGProps<SVGSVGElement>> }
> = {
  system: { label: 'System', Icon: MonitorIcon },
  light: { label: 'Light', Icon: SunIcon },
  dark: { label: 'Dark', Icon: MoonIcon },
};

// ── Component ──────────────────────────────────────────────────────────────────

export interface ThemeToggleProps {
  /** Optional className escape hatch on the trigger button. */
  className?: string;
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const [mode, setMode] = React.useState<ThemeMode>(() => readStoredMode());
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);
  // Dropdown owns open-state + dismissal; Escape restores focus to the trigger
  // (this menu's items are real tab-order buttons). (ADR-015 scope.)
  const { open, setOpen, toggle, containerRef } = useDropdown<HTMLDivElement>({
    restoreFocusRef: triggerRef,
  });

  // Apply the resolved theme on mount + whenever `mode` changes. When mode is
  // 'system', also subscribe to OS preference changes so the surface flips
  // live without a manual reload.
  React.useEffect(() => {
    const resolved = resolveTheme(mode);
    applyTheme(resolved);
    persistMode(mode, resolved);

    if (mode !== 'system') return;
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const onChange = () => applyTheme(resolveTheme('system'));
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else mq.addListener(onChange); // Safari < 14 fallback (zero-cost).
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', onChange);
      else mq.removeListener(onChange);
    };
  }, [mode]);

  const onSelect = (next: ThemeMode) => {
    setMode(next);
    setOpen(false);
    triggerRef.current?.focus();
  };

  return (
    // MotionConfig reducedMotion="user" defers to the OS prefers-reduced-motion setting.
    <MotionConfig reducedMotion="user">
      <div ref={containerRef} className="relative inline-flex">
        <button
          ref={triggerRef}
          type="button"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={`Theme: ${MODE_META[mode].label}`}
          data-hds-component="ThemeToggle"
          data-mode={mode}
          onClick={toggle}
          className={cn(
            'relative inline-flex h-8 w-8 items-center justify-center overflow-hidden rounded-md',
            'border border-border bg-muted text-muted-foreground',
            'hover:bg-accent hover:text-foreground',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            'transition-colors',
            className,
          )}
        >
          {/* AnimatePresence swaps icons with a scale+fade on mode change */}
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={mode}
              initial={{ opacity: 0, scale: 0.6, rotate: -15 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.6, rotate: 15 }}
              transition={{ duration: 0.15, ease: 'easeInOut' }}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              {React.createElement(MODE_META[mode].Icon)}
            </motion.span>
          </AnimatePresence>
        </button>

        <AnimatePresence>
          {open ? (
            <motion.div
              role="menu"
              aria-label="Theme"
              initial={{ opacity: 0, y: -4, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.97 }}
              transition={{ duration: 0.12, ease: 'easeOut' }}
              className={cn(
                'absolute right-0 top-full z-40 mt-1 min-w-32',
                'rounded-md border border-border bg-popover p-1 text-popover-foreground',
                'shadow-md',
              )}
            >
              {VALID_MODES.map((option) => {
                const { label, Icon } = MODE_META[option];
                const selected = option === mode;
                return (
                  <button
                    key={option}
                    role="menuitemradio"
                    aria-checked={selected}
                    onClick={() => onSelect(option)}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm',
                      'text-muted-foreground hover:bg-accent hover:text-foreground',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      selected && 'bg-accent text-foreground',
                    )}
                  >
                    <Icon />
                    <span className="flex-1">{label}</span>
                    {selected ? (
                      <span aria-hidden="true" className="text-xs">
                        ✓
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}
