/**
 * CodeBlock - code display with copy button and optional collapsible toggle.
 * @category Display
 * @tier primitive
 */
/* eslint-disable jsx-a11y/no-noninteractive-tabindex -- scrollable code region requires tabIndex for keyboard navigation */

import { useId, useRef, useState, type ReactNode } from 'react';
import { cva } from 'class-variance-authority';
import { Copy, Check, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Icon } from './icon';

// ── Variants ───────────────────────────────────────────────────────────────────
// `variant` here mirrors CodeBlockProps.variant 1:1 — it is only used on the
// copy button, the one piece of chrome shared verbatim between the `block`
// and `inline` render trees (the rest of the two modes have no structural
// overlap, so there is no single root `cva` to key off `variant`).

// semantic.typography.mono composite (formerly hds.typeStyles.technical) — var()-based, no matching Tailwind-theme utility.
const TECHNICAL_TYPE_CLASSES =
  '[font-family:var(--semantic-typography-mono-font-family)] [font-size:var(--semantic-typography-mono-font-size)] [font-weight:var(--semantic-typography-mono-font-weight)] [letter-spacing:var(--semantic-typography-mono-letter-spacing)] [line-height:var(--semantic-typography-mono-line-height)] max-w-[var(--semantic-typography-mono-max-width)]';

// eslint-disable-next-line tailwindcss/no-arbitrary-value -- border-default/surface-raised/radius-action tokens have no matching Tailwind-theme utility; var()-based so still token-driven
const blockContainerVariants = cva(
  'overflow-hidden rounded-[var(--semantic-radius-action)] border border-solid border-[var(--semantic-color-border-default)] bg-[var(--semantic-color-surface-raised)]',
);

// eslint-disable-next-line tailwindcss/no-arbitrary-value -- subgrid-gap/component-gap spacing + size-32 + border/surface/radius tokens have no matching Tailwind-theme utility; var()-based so still token-driven
const inlineWrapperVariants = cva(
  'flex w-full min-w-0 min-h-[var(--primitive-size-32)] items-center justify-between gap-[var(--semantic-space-subgrid-gap)] overflow-hidden rounded-[var(--semantic-radius-action)] border border-solid border-[var(--semantic-color-border-default)] bg-[var(--semantic-color-surface-raised)] py-[var(--semantic-space-subgrid-gap)] pl-[var(--semantic-space-component-gap)] pr-[var(--semantic-space-subgrid-gap)]',
);

// eslint-disable-next-line tailwindcss/no-arbitrary-value -- component-padding/subgrid-gap spacing + border-default token have no matching Tailwind-theme utility; var()-based so still token-driven
const blockHeaderVariants = cva(
  'flex items-center justify-between border-b border-solid border-[var(--semantic-color-border-default)] py-[var(--semantic-space-subgrid-gap)] pl-[var(--semantic-space-component-padding)] pr-[var(--semantic-space-subgrid-gap)]',
);

// eslint-disable-next-line tailwindcss/no-arbitrary-value -- component-gap spacing token has no matching Tailwind-theme utility; var()-based so still token-driven
const headerGroupVariants = cva('flex items-center gap-[var(--semantic-space-component-gap)]');

// eslint-disable-next-line tailwindcss/no-arbitrary-value -- component-padding/component-gap spacing + content-primary token + mono typography composite have no matching Tailwind-theme utility; var()-based so still token-driven
const collapsibleToggleVariants = cva(
  `flex w-full cursor-pointer items-center justify-between border-0 bg-transparent px-[var(--semantic-space-component-padding)] py-[var(--semantic-space-component-gap)] text-[var(--semantic-color-content-primary)] ${TECHNICAL_TYPE_CLASSES}`,
);

// eslint-disable-next-line tailwindcss/no-arbitrary-value -- border-default token has no matching Tailwind-theme utility; var()-based so still token-driven
const collapsiblePanelVariants = cva(
  'border-t border-solid border-[var(--semantic-color-border-default)]',
);

// eslint-disable-next-line tailwindcss/no-arbitrary-value -- motion.productive.duration token has no matching Tailwind-theme utility; var()-based so still token-driven
const chevronVariants = cva(
  'inline-flex transition-transform duration-[var(--hds-motion-productive-duration)] ease',
  {
    variants: {
      expanded: {
        true: 'rotate-180',
        false: 'rotate-0',
      },
    },
    defaultVariants: { expanded: false },
  },
);

// eslint-disable-next-line tailwindcss/no-arbitrary-value -- subgrid-gap/component-gap spacing + radius-action + border-default/surface-raised tokens + motion.productive.duration have no matching Tailwind-theme utility; var()-based so still token-driven
const copyButtonVariants = cva(
  'flex cursor-pointer items-center gap-[var(--semantic-space-subgrid-gap)]',
  {
    variants: {
      variant: {
        inline:
          'shrink-0 border-0 bg-transparent py-[var(--semantic-space-subgrid-gap)] pl-[var(--semantic-space-component-gap)] pr-[var(--semantic-space-subgrid-gap)] transition-[background-color,color,transform] duration-[var(--hds-motion-productive-duration)] ease',
        block:
          'absolute right-[var(--semantic-space-subgrid-gap)] top-[var(--semantic-space-subgrid-gap)] rounded-[var(--semantic-radius-action)] border border-solid border-[var(--semantic-color-border-default)] bg-[var(--semantic-color-surface-raised)] px-[var(--semantic-space-component-gap)] py-[var(--semantic-space-subgrid-gap)] transition-[background-color,color] duration-[var(--hds-motion-productive-duration)] ease',
      },
    },
    defaultVariants: { variant: 'block' },
  },
);

// eslint-disable-next-line tailwindcss/no-arbitrary-value -- mono typography composite + content-primary token have no matching Tailwind-theme utility; var()-based so still token-driven
const inlineCodeTextVariants = cva(
  `block min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap not-italic text-[var(--semantic-color-content-primary)] ${TECHNICAL_TYPE_CLASSES}`,
  {
    variants: {
      truncateFromStart: {
        true: '[direction:rtl] [text-align:left]',
        false: '[direction:ltr] [text-align:inherit]',
      },
    },
    defaultVariants: { truncateFromStart: false },
  },
);

// eslint-disable-next-line tailwindcss/no-arbitrary-value -- mono typography composite + content-primary token have no matching Tailwind-theme utility; var()-based so still token-driven
const blockCodeTextVariants = cva(
  `whitespace-pre text-[var(--semantic-color-content-primary)] ${TECHNICAL_TYPE_CLASSES}`,
);

// eslint-disable-next-line tailwindcss/no-arbitrary-value -- section-stack/size-32 spacing + role-muted/surface-raised tokens have no matching Tailwind-theme utility; var()-based so still token-driven
const prePanelVariants = cva(
  'm-0 overflow-x-auto p-[var(--semantic-space-section-stack)] pr-[calc(var(--semantic-space-section-stack)_+_var(--primitive-size-32))]',
  {
    variants: {
      panelBackground: {
        true: 'bg-[var(--role-muted,var(--semantic-color-surface-raised))]',
        false: '',
      },
    },
    defaultVariants: { panelBackground: false },
  },
);

interface CodeBlockProps {
  /** Code string displayed in the block. */
  code: string;
  /** Visual presentation mode for block snippets vs inline single-line code. */
  variant?: 'block' | 'inline';
  /** When true, inline code truncates from the start rather than the end. */
  truncateFromStart?: boolean;
  /** Optional language label shown in the header (also drives syntax coloring). */
  language?: string;
  /** Optional filename label shown in the header. */
  filename?: string;
  /**
   * When true (block variant only), code is hidden behind a "Show code" toggle.
   * Off by default to preserve backward compatibility for existing consumers.
   */
  collapsible?: boolean;
  /** When `collapsible`, controls the initial state. Defaults to collapsed. */
  defaultExpanded?: boolean;
  /** Optional class hook for layout-specific styling. */
  className?: string;
}

/** @public */
export function CodeBlock({
  code,
  variant = 'block',
  truncateFromStart = false,
  language,
  filename,
  collapsible = false,
  defaultExpanded = false,
  className,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(defaultExpanded);
  const panelId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  function handleToggle() {
    const next = !expanded;
    // Returning focus to the toggle when collapsing prevents focus from falling
    // to <body> if the code <pre> (or copy button) inside the panel was focused.
    if (!next && panelRef.current?.contains(document.activeElement)) {
      toggleRef.current?.focus();
    }
    setExpanded(next);
  }

  function handleCopy() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (variant === 'inline') {
    return (
      <div className={cn(inlineWrapperVariants(), className)}>
        <code className={inlineCodeTextVariants({ truncateFromStart })}>
          {copied ? 'Copied' : code}
        </code>

        <button
          onClick={handleCopy}
          aria-label={copied ? 'Copied' : 'Copy code'}
          className={cn('hds-focus', copyButtonVariants({ variant: 'inline' }))}
        >
          {copied ? (
            <Icon icon={Check} size="small" color="var(--semantic-color-content-primary)" />
          ) : (
            <Icon icon={Copy} size="small" color="var(--semantic-color-content-primary)" />
          )}
        </button>
      </div>
    );
  }

  // Block variant
  const headerEl =
    filename || language ? (
      <div className={blockHeaderVariants()}>
        <div className={headerGroupVariants()}>
          {filename && (
            <span
              className={cn(TECHNICAL_TYPE_CLASSES, 'text-[var(--semantic-color-content-primary)]')}
            >
              {filename}
            </span>
          )}
          {language && (
            <span
              className={cn(
                TECHNICAL_TYPE_CLASSES,
                'text-[var(--semantic-color-content-secondary)]',
              )}
            >
              {language.toLowerCase()}
            </span>
          )}
        </div>
      </div>
    ) : null;

  const copyBtn = (
    <button
      onClick={handleCopy}
      aria-label={copied ? 'Copied' : 'Copy code'}
      className={cn('hds-focus', copyButtonVariants({ variant: 'block' }))}
    >
      {copied ? (
        <Icon icon={Check} size="small" color="var(--semantic-color-content-primary)" />
      ) : (
        <Icon icon={Copy} size="small" color="var(--semantic-color-content-primary)" />
      )}
    </button>
  );

  const codePanel = (
    <div className="relative">
      <pre
        tabIndex={0}
        role="region"
        aria-label="Code sample"
        className={prePanelVariants({ panelBackground: true })}
      >
        <code className={blockCodeTextVariants()}>{renderHighlighted(code, language)}</code>
      </pre>
      {copyBtn}
    </div>
  );

  if (collapsible) {
    return (
      <div className={cn(blockContainerVariants(), className)}>
        <button
          ref={toggleRef}
          type="button"
          onClick={handleToggle}
          aria-expanded={expanded}
          aria-controls={panelId}
          className={cn('hds-focus', collapsibleToggleVariants())}
        >
          <span className={headerGroupVariants()}>
            <span>{expanded ? 'Hide code' : 'Show code'}</span>
            {filename && (
              // eslint-disable-next-line tailwindcss/no-arbitrary-value -- content-secondary token has no matching Tailwind-theme utility; var()-based so still token-driven
              <span className="text-[var(--semantic-color-content-secondary)]">{filename}</span>
            )}
            {language && (
              // eslint-disable-next-line tailwindcss/no-arbitrary-value -- content-secondary token has no matching Tailwind-theme utility; var()-based so still token-driven
              <span className="text-[var(--semantic-color-content-secondary)]">
                {language.toLowerCase()}
              </span>
            )}
          </span>
          <span className={chevronVariants({ expanded })}>
            <Icon icon={ChevronDown} size="small" color="var(--semantic-color-content-secondary)" />
          </span>
        </button>
        {expanded && (
          <div ref={panelRef} id={panelId} className={collapsiblePanelVariants()}>
            {codePanel}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn(blockContainerVariants(), className)}>
      {headerEl}
      <div className="relative">
        <pre
          tabIndex={0}
          role="region"
          aria-label="Code sample"
          className={prePanelVariants({ panelBackground: false })}
        >
          <code className={blockCodeTextVariants()}>{renderHighlighted(code, language)}</code>
        </pre>
        {copyBtn}
      </div>
    </div>
  );
}

/** @internal — CVA variant helpers; compose via CodeBlock props instead. */
export {
  blockContainerVariants,
  inlineWrapperVariants,
  blockHeaderVariants,
  collapsibleToggleVariants,
  copyButtonVariants,
  inlineCodeTextVariants,
  blockCodeTextVariants,
  prePanelVariants,
  chevronVariants,
};

// ---------------------------------------------------------------------------
// Regex-based syntax coloring (no new dep). Returns either a string (no lang
// match) or an array of <span> nodes. Token semantic colors map to existing
// content tokens to stay theme-aware.
// ---------------------------------------------------------------------------

const TS_KEYWORDS = new Set([
  'import',
  'export',
  'from',
  'as',
  'default',
  'const',
  'let',
  'var',
  'function',
  'return',
  'if',
  'else',
  'for',
  'while',
  'switch',
  'case',
  'break',
  'continue',
  'new',
  'class',
  'extends',
  'implements',
  'interface',
  'type',
  'enum',
  'public',
  'private',
  'protected',
  'readonly',
  'static',
  'async',
  'await',
  'try',
  'catch',
  'finally',
  'throw',
  'typeof',
  'instanceof',
  'true',
  'false',
  'null',
  'undefined',
  'void',
  'this',
  'super',
  'in',
  'of',
]);

const CSS_KEYWORDS = new Set(['important', 'inherit', 'initial', 'unset', 'auto', 'none']);

type Token = {
  kind: 'plain' | 'keyword' | 'string' | 'comment' | 'number' | 'type';
  value: string;
};

// feedback/content tokens for syntax-highlight coloring — var()-based, no matching Tailwind-theme utility.
function tokenColorClassName(kind: Token['kind']): string {
  switch (kind) {
    case 'keyword':
      return 'text-[var(--semantic-color-content-accent,var(--semantic-color-content-primary))]';
    case 'string':
      return 'text-[var(--semantic-color-feedback-success)]';
    case 'comment':
      return 'text-[var(--semantic-color-content-secondary)]';
    case 'number':
      return 'text-[var(--semantic-color-feedback-warning)]';
    case 'type':
      return 'text-[var(--semantic-color-feedback-info)]';
    default:
      return 'text-[var(--semantic-color-content-primary)]';
  }
}

function normaliseLang(lang?: string): string | undefined {
  if (!lang) return undefined;
  const l = lang.trim().toLowerCase();
  if (['ts', 'tsx', 'typescript', 'js', 'jsx', 'javascript'].includes(l)) return 'ts';
  if (l === 'json') return 'json';
  if (l === 'css') return 'css';
  if (['html', 'xml', 'svg'].includes(l)) return 'html';
  return undefined;
}

function tokenizeTs(src: string): Token[] {
  const tokens: Token[] = [];
  // Combined regex: comments, strings, numbers, identifiers
  const re =
    /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|('(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|`(?:\\.|[^`\\])*`)|(\b\d[\d_.eE+-]*\b)|([A-Za-z_$][\w$]*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    if (m.index > last) tokens.push({ kind: 'plain', value: src.slice(last, m.index) });
    if (m[1]) tokens.push({ kind: 'comment', value: m[1] });
    else if (m[2]) tokens.push({ kind: 'string', value: m[2] });
    else if (m[3]) tokens.push({ kind: 'number', value: m[3] });
    else if (m[4]) {
      const word = m[4];
      if (TS_KEYWORDS.has(word)) tokens.push({ kind: 'keyword', value: word });
      else if (/^[A-Z]/.test(word)) tokens.push({ kind: 'type', value: word });
      else tokens.push({ kind: 'plain', value: word });
    }
    last = re.lastIndex;
  }
  if (last < src.length) tokens.push({ kind: 'plain', value: src.slice(last) });
  return tokens;
}

function tokenizeJson(src: string): Token[] {
  const tokens: Token[] = [];
  const re = /("(?:\\.|[^"\\])*")(\s*:)?|(\b-?\d[\d.eE+-]*\b)|\b(true|false|null)\b/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    if (m.index > last) tokens.push({ kind: 'plain', value: src.slice(last, m.index) });
    if (m[1]) {
      tokens.push({ kind: m[2] ? 'type' : 'string', value: m[1] });
      if (m[2]) tokens.push({ kind: 'plain', value: m[2] });
    } else if (m[3]) tokens.push({ kind: 'number', value: m[3] });
    else if (m[4]) tokens.push({ kind: 'keyword', value: m[4] });
    last = re.lastIndex;
  }
  if (last < src.length) tokens.push({ kind: 'plain', value: src.slice(last) });
  return tokens;
}

function tokenizeCss(src: string): Token[] {
  const tokens: Token[] = [];
  const re =
    /(\/\*[\s\S]*?\*\/)|('(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*")|(--[A-Za-z_-][\w-]*)|(#[0-9a-fA-F]{3,8}\b|\b\d[\d.]*(?:px|rem|em|%|vh|vw|s|ms)?\b)|([A-Za-z_-][\w-]*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    if (m.index > last) tokens.push({ kind: 'plain', value: src.slice(last, m.index) });
    if (m[1]) tokens.push({ kind: 'comment', value: m[1] });
    else if (m[2]) tokens.push({ kind: 'string', value: m[2] });
    else if (m[3]) tokens.push({ kind: 'type', value: m[3] });
    else if (m[4]) tokens.push({ kind: 'number', value: m[4] });
    else if (m[5]) {
      tokens.push({
        kind: CSS_KEYWORDS.has(m[5].toLowerCase()) ? 'keyword' : 'plain',
        value: m[5],
      });
    }
    last = re.lastIndex;
  }
  if (last < src.length) tokens.push({ kind: 'plain', value: src.slice(last) });
  return tokens;
}

function tokenizeHtml(src: string): Token[] {
  const tokens: Token[] = [];
  const re =
    /(<!--[\s\S]*?-->)|(<\/?)([A-Za-z][\w-]*)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|([A-Za-z_-][\w-]*)(=)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    if (m.index > last) tokens.push({ kind: 'plain', value: src.slice(last, m.index) });
    if (m[1]) tokens.push({ kind: 'comment', value: m[1] });
    else if (m[2] && m[3]) {
      tokens.push({ kind: 'plain', value: m[2] });
      tokens.push({ kind: 'keyword', value: m[3] });
    } else if (m[4]) tokens.push({ kind: 'string', value: m[4] });
    else if (m[5]) {
      tokens.push({ kind: 'type', value: m[5] });
      tokens.push({ kind: 'plain', value: m[6] });
    }
    last = re.lastIndex;
  }
  if (last < src.length) tokens.push({ kind: 'plain', value: src.slice(last) });
  return tokens;
}

function renderHighlighted(code: string, language?: string): ReactNode {
  const lang = normaliseLang(language);
  if (!lang) return code;
  let tokens: Token[];
  try {
    if (lang === 'ts') tokens = tokenizeTs(code);
    else if (lang === 'json') tokens = tokenizeJson(code);
    else if (lang === 'css') tokens = tokenizeCss(code);
    else if (lang === 'html') tokens = tokenizeHtml(code);
    else return code;
  } catch {
    return code;
  }
  return tokens.map((t, i) =>
    t.kind === 'plain' ? (
      <span key={i}>{t.value}</span>
    ) : (
      <span key={i} className={tokenColorClassName(t.kind)}>
        {t.value}
      </span>
    ),
  );
}
