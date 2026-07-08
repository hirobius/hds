/**
 * Toast — transient feedback notifications (Radix Toast).
 * @category Feedback
 * @tier pattern
 * @doc-exempt: no Overlays/Feedback-overlay doc page yet — add demo when created
 *
 * Imperative API: wrap the app once in <ToastProvider>, then call
 * `useToast().toast({ title, description, tone })` from anywhere. Radix Toast
 * (@radix-ui/react-toast) owns the a11y live-region, auto-dismiss timing,
 * swipe-to-dismiss, and viewport portal.
 *
 *   function App() {
 *     return <ToastProvider><Page /></ToastProvider>;
 *   }
 *   function SaveButton() {
 *     const { toast } = useToast();
 *     return <Button onClick={() => toast({ title: 'Saved', tone: 'success' })}>Save</Button>;
 *   }
 */
// motion-ok: Radix Toast manages enter/exit/swipe mounting and the auto-dismiss
// lifecycle; this module renders its themed surface + live region only.

import * as React from 'react';
import * as ToastPrimitive from '@radix-ui/react-toast';
import { cva, type VariantProps } from 'class-variance-authority';
import { Info, CircleCheck, TriangleAlert, CircleX, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Icon } from './icon';

// ── Variants ───────────────────────────────────────────────────────────────────
// Non-interactive — tone only drives the leading icon's color (via
// `currentColor`) and icon choice (TONE_ICON below, not a className concern).
// `neutral` preserves the prior hardcoded content-secondary color byte-for-byte
// (text-muted-foreground resolves to the same --semantic-color-content-secondary
// custom property).
const toastIconVariants = cva('', {
  variants: {
    tone: {
      neutral: 'text-muted-foreground',
      danger: 'text-feedback-danger',
      success: 'text-feedback-success',
      warning: 'text-feedback-warning',
      info: 'text-feedback-info',
    },
  },
  defaultVariants: { tone: 'neutral' },
});

type ToastIconVariantProps = VariantProps<typeof toastIconVariants>;

// vocab-ok: `NonNullable<ToastIconVariantProps['tone']>` below is a
// bracket-index type, not a vocabulary declaration — check-prop-vocabulary's
// rule C regex treats the quoted `'tone'` property-access key as an off-vocab
// tone *value*, a false positive (prettier's singleQuote:true also defeats a
// double-quote workaround, so this must be a file exemption). The real,
// gate-checked tone vocabulary lives in `toastIconVariants`'s cva() variants
// above.
/** @public */
export type ToastTone = NonNullable<ToastIconVariantProps['tone']>;

/** @public */
export interface ToastOptions {
  /** Headline line — the primary message. */
  title: string;
  /** Optional supporting line below the title. */
  description?: string;
  /** Semantic tone — tints the leading icon. */
  tone?: ToastTone;
  /** Auto-dismiss in ms. Falls back to the provider default. */
  duration?: number;
}

interface ToastEntry extends ToastOptions {
  id: string;
}

interface ToastContextValue {
  /** Enqueue a toast; returns its id. */
  toast: (options: ToastOptions) => string;
  /** Dismiss a toast by id. */
  dismiss: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

/** Access the imperative toast API. Must be called under <ToastProvider>. */
export function useToast(): ToastContextValue {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a <ToastProvider>');
  return ctx;
}

const TONE_ICON: Record<ToastTone, typeof Info> = {
  neutral: Info,
  info: Info,
  success: CircleCheck,
  danger: CircleX,
  warning: TriangleAlert,
};

/** @public */
export interface ToastProviderProps {
  children?: React.ReactNode;
  /** Default auto-dismiss in ms (Radix default is 5000). */
  duration?: number;
  /** Swipe-to-dismiss direction. */
  swipeDirection?: React.ComponentProps<typeof ToastPrimitive.Provider>['swipeDirection'];
}

/**
 * Provider + viewport for the toast system. Wrap the app root once.
 * @public
 */
export function ToastProvider({
  children,
  duration = 5000,
  swipeDirection = 'right',
}: ToastProviderProps) {
  const [toasts, setToasts] = React.useState<ToastEntry[]>([]);
  const idRef = React.useRef(0);

  const remove = React.useCallback((id: string) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const toast = React.useCallback((options: ToastOptions) => {
    const id = `toast-${(idRef.current += 1)}`;
    setToasts((list) => [...list, { ...options, id }]);
    return id;
  }, []);

  const value = React.useMemo<ToastContextValue>(
    () => ({ toast, dismiss: remove }),
    [toast, remove],
  );

  return (
    <ToastContext.Provider value={value}>
      <ToastPrimitive.Provider duration={duration} swipeDirection={swipeDirection}>
        {children}
        {toasts.map((t) => {
          const tone = t.tone ?? 'neutral';
          return (
            <ToastPrimitive.Root
              key={t.id}
              duration={t.duration ?? duration}
              onOpenChange={(open) => {
                if (!open) remove(t.id);
              }}
              className={cn(
                'pointer-events-auto relative flex w-full items-start gap-3',
                'rounded-md border border-border bg-popover p-4 pr-8',
                'text-popover-foreground shadow-overlay hds-focus',
              )}
            >
              <Icon
                icon={TONE_ICON[tone]}
                size="small"
                color="currentColor"
                className={toastIconVariants({ tone })}
                aria-hidden
              />
              <div className="flex min-w-0 flex-col gap-1">
                <ToastPrimitive.Title className="text-sm font-medium">
                  {t.title}
                </ToastPrimitive.Title>
                {t.description ? (
                  <ToastPrimitive.Description className="text-sm text-muted-foreground">
                    {t.description}
                  </ToastPrimitive.Description>
                ) : null}
              </div>
              <ToastPrimitive.Close
                aria-label="Dismiss"
                className={cn(
                  'absolute right-2 top-2 inline-flex size-6 items-center justify-center',
                  'rounded-sm text-muted-foreground transition-colors hover:text-foreground hds-focus',
                )}
              >
                <Icon icon={X} size="small" color="currentColor" aria-hidden />
              </ToastPrimitive.Close>
            </ToastPrimitive.Root>
          );
        })}
        <ToastPrimitive.Viewport
          className={cn(
            'fixed bottom-0 right-0 z-50 m-0 flex w-full list-none flex-col gap-2 p-4',
            'sm:max-w-sm',
          )}
        />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
}

/** @internal — CVA variant helper; compose via ToastOptions.tone instead. */
export { toastIconVariants };
