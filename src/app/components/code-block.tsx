/**
 * CodeBlock - code display with copy button and optional collapsible toggle.
 * @category Display
 * @tier primitive
 */
/* eslint-disable jsx-a11y/no-noninteractive-tabindex -- scrollable code region requires tabIndex for keyboard navigation */

import { useId, useState, type ReactNode } from 'react';
import { Copy, Check, ChevronDown } from 'lucide-react';
import hds from '../design-system/tokens';
import { Icon } from './icon';

const codeBlockStyles = {
  inlineWrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: hds.semantic.space.subgrid.gap,
    width: '100%',
    minWidth: 0,
    minHeight: hds.size[32],
    border: `${hds.borderWidth.default} solid var(--semantic-color-border-default)`,
    background: 'var(--semantic-color-surface-raised)',
    borderRadius: hds.borderRadius.action,
    overflow: 'hidden',
    paddingTop: hds.semantic.space.subgrid.gap,
    paddingBottom: hds.semantic.space.subgrid.gap,
    paddingLeft: hds.semantic.space.component.gap,
    paddingRight: hds.semantic.space.subgrid.gap,
  } satisfies React.CSSProperties,
  inlineCopyBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: hds.semantic.space.subgrid.gap,
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    paddingTop: hds.semantic.space.subgrid.gap,
    paddingBottom: hds.semantic.space.subgrid.gap,
    paddingLeft: hds.semantic.space.component.gap,
    paddingRight: hds.semantic.space.subgrid.gap,
    flexShrink: 0,
    transition: `background-color ${hds.motion.productive.duration}s ease, color ${hds.motion.productive.duration}s ease, transform ${hds.motion.productive.duration}s ease`,
  } satisfies React.CSSProperties,
  blockHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: hds.semantic.space.component.padding,
    paddingRight: hds.semantic.space.subgrid.gap,
    paddingTop: hds.semantic.space.subgrid.gap,
    paddingBottom: hds.semantic.space.subgrid.gap,
    borderBottom: `${hds.borderWidth.default} solid var(--semantic-color-border-default)`,
  } satisfies React.CSSProperties,
  blockCopyBtn: {
    position: 'absolute',
    top: hds.semantic.space.subgrid.gap,
    right: hds.semantic.space.subgrid.gap,
    display: 'flex',
    alignItems: 'center',
    gap: hds.semantic.space.subgrid.gap,
    background: 'var(--semantic-color-surface-raised)',
    border: `${hds.borderWidth.default} solid var(--semantic-color-border-default)`,
    borderRadius: hds.borderRadius.action,
    cursor: 'pointer',
    paddingTop: hds.semantic.space.subgrid.gap,
    paddingBottom: hds.semantic.space.subgrid.gap,
    paddingLeft: hds.semantic.space.component.gap,
    paddingRight: hds.semantic.space.component.gap,
    transition: `background-color ${hds.motion.productive.duration}s ease, color ${hds.motion.productive.duration}s ease`,
  } satisfies React.CSSProperties,
  collapsibleToggleBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    paddingLeft: hds.semantic.space.component.padding,
    paddingRight: hds.semantic.space.component.padding,
    paddingTop: hds.semantic.space.component.gap,
    paddingBottom: hds.semantic.space.component.gap,
    color: 'var(--semantic-color-content-primary)',
    ...hds.typeStyles.technical,
  } satisfies React.CSSProperties,
};

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

  function handleCopy() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (variant === 'inline') {
    return (
      <div
        className={className}
        style={codeBlockStyles.inlineWrapper}
      >
        <code
          style={{
            ...hds.typeStyles.technical,
            color: 'var(--semantic-color-content-primary)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            minWidth: 0,
            display: 'block',
            flex: 1,
            fontStyle: 'normal',
            direction: truncateFromStart ? 'rtl' : 'ltr',
            textAlign: truncateFromStart ? 'left' : 'inherit',
          }}
        >
          {copied ? 'Copied' : code}
        </code>

        <button
          onClick={handleCopy}
          aria-label={copied ? 'Copied' : 'Copy code'}
          className="hds-focus"
          style={codeBlockStyles.inlineCopyBtn}
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
      <div
        style={codeBlockStyles.blockHeader}
      >
        <div
          style={{ display: 'flex', gap: hds.semantic.space.component.gap, alignItems: 'center' }}
        >
          {filename && (
            <span
              style={{
                ...hds.typeStyles.technical,
                color: 'var(--semantic-color-content-primary)',
              }}
            >
              {filename}
            </span>
          )}
          {language && (
            <span
              style={{
                ...hds.typeStyles.technical,
                color: 'var(--semantic-color-content-secondary)',
              }}
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
      className="hds-focus"
      style={codeBlockStyles.blockCopyBtn}
    >
      {copied ? (
        <Icon icon={Check} size="small" color="var(--semantic-color-content-primary)" />
      ) : (
        <Icon icon={Copy} size="small" color="var(--semantic-color-content-primary)" />
      )}
    </button>
  );

  const codePanel = (
    <div style={{ position: 'relative' }}>
      <pre
        tabIndex={0}
        role="region"
        aria-label="Code sample"
        style={{
          margin: 0,
          padding: hds.semantic.space.section.stack,
          paddingRight: `calc(${hds.semantic.space.section.stack} + ${hds.size[32]})`,
          overflowX: 'auto',
          background: 'var(--role-muted, var(--semantic-color-surface-raised))',
        }}
      >
        <code
          style={{
            ...hds.typeStyles.technical,
            color: 'var(--semantic-color-content-primary)',
            whiteSpace: 'pre',
          }}
        >
          {renderHighlighted(code, language)}
        </code>
      </pre>
      {copyBtn}
    </div>
  );

  if (collapsible) {
    return (
      <div
        className={className}
        style={{
          border: `${hds.borderWidth.default} solid var(--semantic-color-border-default)`,
          background: 'var(--semantic-color-surface-raised)',
          borderRadius: hds.borderRadius.action,
          overflow: 'hidden',
        }}
      >
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-controls={panelId}
          className="hds-focus"
          style={codeBlockStyles.collapsibleToggleBtn}
        >
          <span
            style={{ display: 'flex', gap: hds.semantic.space.component.gap, alignItems: 'center' }}
          >
            <span>{expanded ? 'Hide code' : 'Show code'}</span>
            {filename && (
              <span style={{ color: 'var(--semantic-color-content-secondary)' }}>{filename}</span>
            )}
            {language && (
              <span style={{ color: 'var(--semantic-color-content-secondary)' }}>
                {language.toLowerCase()}
              </span>
            )}
          </span>
          <span
            style={{
              display: 'inline-flex',
              transition: `transform ${hds.motion.productive.duration}s ease`,
              transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          >
            <Icon icon={ChevronDown} size="small" color="var(--semantic-color-content-secondary)" />
          </span>
        </button>
        {expanded && (
          <div
            id={panelId}
            style={{
              borderTop: `${hds.borderWidth.default} solid var(--semantic-color-border-default)`,
            }}
          >
            {codePanel}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={className}
      style={{
        border: `${hds.borderWidth.default} solid var(--semantic-color-border-default)`,
        background: 'var(--semantic-color-surface-raised)',
        borderRadius: hds.borderRadius.action,
        overflow: 'hidden',
      }}
    >
      {headerEl}
      <div style={{ position: 'relative' }}>
        <pre
          tabIndex={0}
          role="region"
          aria-label="Code sample"
          style={{
            margin: 0,
            padding: hds.semantic.space.section.stack,
            paddingRight: `calc(${hds.semantic.space.section.stack} + ${hds.size[32]})`,
            overflowX: 'auto',
          }}
        >
          <code
            style={{
              ...hds.typeStyles.technical,
              color: 'var(--semantic-color-content-primary)',
              whiteSpace: 'pre',
            }}
          >
            {renderHighlighted(code, language)}
          </code>
        </pre>
        {copyBtn}
      </div>
    </div>
  );
}

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

function tokenColor(kind: Token['kind']): string {
  switch (kind) {
    case 'keyword':
      return 'var(--semantic-color-content-accent, var(--semantic-color-content-primary))';
    case 'string':
      return 'var(--semantic-color-feedback-success)';
    case 'comment':
      return 'var(--semantic-color-content-secondary)';
    case 'number':
      return 'var(--semantic-color-feedback-warning)';
    case 'type':
      return 'var(--semantic-color-feedback-info)';
    default:
      return 'var(--semantic-color-content-primary)';
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
      <span key={i} style={{ color: tokenColor(t.kind) }}>
        {t.value}
      </span>
    ),
  );
}
