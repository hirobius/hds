import { CheckCircle2, AlertCircle } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { Stack } from '../../components/stack';
import { Text } from '../../components/text';
import { InlineCode } from '../../components/inline-code';
import { Surface } from '../../components/surface';
import hds from '../../design-system/tokens';
import { Icon } from '../../components/icon';
import { DocPageHeader, DocSection } from './HdsDocPrimitives';

const contributionStyles = {
  stepNumberBubble: {
    flexShrink: 0,
    width: hds.size[24],
    height: hds.size[24],
    borderRadius: hds.borderRadius.full,
    background: 'var(--semantic-color-accent-primary)',
    color: 'var(--semantic-color-content-on-accent)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  } satisfies React.CSSProperties,
  checklistItemRow: {
    display: 'flex',
    gap: hds.semantic.space.subgrid.gap,
    alignItems: 'flex-start',
    paddingTop: hds.semantic.space.subgrid.gap,
    paddingBottom: hds.semantic.space.subgrid.gap,
    borderBottom: `${hds.borderWidth.default} solid var(--semantic-color-border-default)`,
  } satisfies React.CSSProperties,
  gateOrderRow: {
    display: 'flex',
    gap: hds.semantic.space.layout.gap,
    alignItems: 'baseline',
    paddingTop: hds.semantic.space.subgrid.gap,
    paddingBottom: hds.semantic.space.subgrid.gap,
    borderBottom: `${hds.borderWidth.default} solid var(--semantic-color-border-default)`,
  } satisfies React.CSSProperties,
} as const;

// ── Step list helpers ─────────────────────────────────────────────────────────

type Step = { label: string; detail: string };

function StepList({ steps }: { steps: Step[] }) {
  return (
    <ol
      style={{
        listStyle: 'none',
        margin: 0,
        padding: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: hds.semantic.space.component.padding,
      }}
    >
      {steps.map((step, idx) => (
        <li
          key={idx}
          style={{
            display: 'flex',
            gap: hds.semantic.space.layout.gap,
            alignItems: 'flex-start',
          }}
        >
          <div
            style={{
              ...contributionStyles.stepNumberBubble,
              ...hds.typeStyles.eyebrow,
              marginTop: 2,
            }}
          >
            {idx + 1}
          </div>
          <div style={{ flex: 1 }}>
            <Text
              variant="body"
              as="span"
              style={{
                color: 'var(--semantic-color-content-primary)',
                display: 'block',
                marginBottom: hds.semantic.space.subgrid.hairline,
              }}
            >
              {step.label}
            </Text>
            <Text
              variant="body"
              as="span"
              style={{ color: 'var(--semantic-color-content-secondary)' }}
            >
              {step.detail}
            </Text>
          </div>
        </li>
      ))}
    </ol>
  );
}

// ── Checklist helper ──────────────────────────────────────────────────────────

type CheckItem = { label: string; required?: boolean };

function Checklist({ items }: { items: CheckItem[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {items.map((item, idx) => (
        <div key={idx} style={contributionStyles.checklistItemRow}>
          <div style={{ flexShrink: 0, marginTop: hds.semantic.space.subgrid.hairline }}>
            <Icon
              icon={item.required !== false ? CheckCircle2 : AlertCircle}
              size="small"
              color={
                item.required !== false
                  ? 'var(--semantic-color-feedback-success)'
                  : 'var(--semantic-color-feedback-warning)'
              }
            />
          </div>
          <Text
            variant="body"
            as="span"
            style={{ color: 'var(--semantic-color-content-secondary)' }}
          >
            {item.label}
          </Text>
        </div>
      ))}
    </div>
  );
}

// ── Page data ─────────────────────────────────────────────────────────────────

const TOKEN_STEPS: Step[] = [
  {
    label: 'Find the right tier',
    detail:
      'Primitives hold raw values (hex colors, px sizes). Semantics are aliases that give them meaning (surface-page, content-primary). Components are slot-specific overrides. Add new values at the correct tier — never define a semantic token at the primitive tier.',
  },
  {
    label: 'Follow the naming convention',
    detail:
      'Paths use kebab-case segments separated by dots in hirobius.tokens.json. Color: primitive.color.<palette>.<step>. Spacing: primitive.space.<scale>. Semantic aliases mirror the DTCG spec: $value references the primitive path.',
  },
  {
    label: 'Write a short $description',
    detail:
      'Every leaf token needs a $description of 1–20 words. The check:token-descriptions gate rejects blank descriptions and ones exceeding 20 words. Be precise, not verbose.',
  },
  {
    label: 'Regenerate tokens',
    detail:
      'Run pnpm tokens:generate after editing hirobius.tokens.json. This writes src/styles/tokens.generated.css and src/app/design-system/tokens.ts. Commit all three files together.',
  },
  {
    label: 'Run the token gates',
    detail:
      'pnpm check:tokens runs the full token pipeline: hardcoded-colors, audit-tokens, tier-bypass, hardcoded-spacing, hardcoded-fonts, token-descriptions. All must pass before merging.',
  },
];

const COMPONENT_STEPS: Step[] = [
  {
    label: 'Create the component file',
    detail:
      "New components live in src/app/components/Hds<Name>.tsx. Use the HDS token object (import hds from '../../design-system/tokens') for all values. Never hardcode hex, px, or font strings — use semantic tokens first, primitive tokens only in documented SVG/canvas exceptions.",
  },
  {
    label: 'Follow the component rules',
    detail:
      'Read docs/ai/rules/REACT_COMPONENTS.md for naming, prop conventions, token usage tier rules, and the tier-ok exemption pattern for SVG/canvas contexts. The rules exist to keep AI output correct and human review fast.',
  },
  {
    label: 'Export from the barrel',
    detail:
      'Add the export to src/app/components/index.ts so consumers can tree-shake it cleanly. Mark internal utilities with /** @internal */ JSDoc so they stay out of the public API surface.',
  },
  {
    label: 'Add to the manifest',
    detail:
      'Run pnpm manifest:generate to add the component to public/hds-manifest.json. The manifest drives docs-page inventory, Figma metadata, and the component health dashboard. Never hand-edit the manifest.',
  },
  {
    label: 'Write a doc section',
    detail:
      "Each component family has a docs page in src/app/pages/hds/components/. Add a section using HdsComponentDoc with the component's props from src/app/data/component-api.json. The prop table is generated — do not hand-edit component-api.json.",
  },
  {
    label: 'Run type and layout gates',
    detail:
      'Run pnpm typecheck && pnpm test:layout before submitting. The layout test suite catches box-model regressions. Type errors in components propagate to consumers.',
  },
];

const DOC_CHECKLIST: CheckItem[] = [
  { label: 'DocPageHeader with group label, title, and a one-sentence intro' },
  { label: 'At least one DocSection with a descriptive title' },
  { label: 'Lazy-loaded in src/app/routes.tsx under the correct path' },
  {
    label: 'Route path added to SIDEBAR_PAGER_PAGES if it belongs in the prev/next sequence',
    required: false,
  },
  {
    label: 'Nav entry added to HDS_NAV in HDSLayout.tsx if it should appear in the sidebar',
    required: false,
  },
  { label: 'pnpm typecheck passes with zero errors' },
  { label: 'No hardcoded colors, font strings, or pixel values outside tier-ok exemptions' },
];

const GATE_ORDER = [
  { cmd: 'pnpm typecheck', note: 'TypeScript — zero errors required' },
  {
    cmd: 'pnpm check:tokens',
    note: 'Token pipeline — hardcoded values, tier violations, missing descriptions',
  },
  {
    cmd: 'node scripts/validate-manifest.mjs',
    note: 'Manifest sync — inventory, descriptions, categories',
  },
  {
    cmd: 'node scripts/validate-orchestration.mjs',
    note: 'Orchestration — unit schema, dep cycles, stale claims',
  },
  { cmd: 'pnpm test:layout', note: 'Layout suite — box-model regression tests' },
];

// ── Page component ────────────────────────────────────────────────────────────

export default function ContributionGuidePage() {
  const { isDark: _isDark } = useTheme();
  const isDark = _isDark;

  return (
    <article>
      <DocPageHeader
        group="HDS"
        title="Contribution Guide"
        isDark={isDark}
        intro="How to add tokens, components, and docs without breaking the system. The external contributor contract."
      />

      <DocSection title="Adding a Token" isDark={isDark}>
        <Stack gap="normal">
          <Text
            variant="body"
            as="p"
            style={{ color: 'var(--semantic-color-content-secondary)', maxWidth: 720 }}
          >
            Tokens are the shared language between Figma and code. Every visual value in the system
            resolves through the three-tier cascade: primitive → semantic → component. Adding a
            token means choosing the right tier, following the naming convention, and keeping the
            pipeline in sync.
          </Text>
          <StepList steps={TOKEN_STEPS} />
        </Stack>
      </DocSection>

      <DocSection title="Adding a Component" isDark={isDark}>
        <Stack gap="normal">
          <Text
            variant="body"
            as="p"
            style={{ color: 'var(--semantic-color-content-secondary)', maxWidth: 720 }}
          >
            Components are production primitives. They must consume tokens correctly, export
            cleanly, appear in the manifest, and have a corresponding doc section. Skipping any step
            leaves the system partially documented or partially tested.
          </Text>
          <StepList steps={COMPONENT_STEPS} />
        </Stack>
      </DocSection>

      <DocSection title="Adding a Doc Page" isDark={isDark}>
        <Stack gap="normal">
          <Text
            variant="body"
            as="p"
            style={{ color: 'var(--semantic-color-content-secondary)', maxWidth: 720 }}
          >
            Doc pages live in <InlineCode>src/app/pages/hds/</InlineCode>. Use{' '}
            <InlineCode>DocPageHeader</InlineCode> and <InlineCode>DocSection</InlineCode> from{' '}
            <InlineCode>./HdsDocPrimitives</InlineCode> for consistent layout. All pages must be
            lazy-loaded in <InlineCode>src/app/routes.tsx</InlineCode>.
          </Text>
          <Checklist items={DOC_CHECKLIST} />
        </Stack>
      </DocSection>

      <DocSection title="Quality Gates" isDark={isDark}>
        <Stack gap="normal">
          <Text
            variant="body"
            as="p"
            style={{ color: 'var(--semantic-color-content-secondary)', maxWidth: 720 }}
          >
            Every contribution must pass these gates in order. A failure at any step is a blocker —
            do not merge until all pass.
          </Text>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {GATE_ORDER.map((gate, idx) => (
              <div key={idx} style={contributionStyles.gateOrderRow}>
                <InlineCode style={{ flexShrink: 0 }}>{gate.cmd}</InlineCode>
                <Text
                  variant="body"
                  as="span"
                  style={{ color: 'var(--semantic-color-content-secondary)' }}
                >
                  {gate.note}
                </Text>
              </div>
            ))}
          </div>
        </Stack>
      </DocSection>

      <DocSection title="Token Naming Rules" isDark={isDark}>
        <Stack gap="normal">
          <Text
            variant="body"
            as="p"
            style={{ color: 'var(--semantic-color-content-secondary)', maxWidth: 720 }}
          >
            Naming is governance. Bad names break the alias chain and make AI output inconsistent.
            Follow these rules without exception.
          </Text>
          <Surface padding="component" style={{ maxWidth: 720 }}>
            <Stack gap="gap">
              {[
                [
                  'kebab-case only',
                  'No camelCase, no underscores, no uppercase in token path segments.',
                ],
                [
                  'Tier prefix',
                  'Primitive tokens start with primitive.. Semantic tokens start with semantic.. Component tokens start with component..',
                ],
                [
                  'Color palette segments',
                  'primitive.color.<palette>.<step> — e.g. primitive.color.blue.500. Step is always a numeric string.',
                ],
                [
                  'Semantic color roles',
                  'semantic.color.<role>.<variant> — e.g. semantic.color.content.primary. Role is a noun; variant qualifies it.',
                ],
                [
                  'Space scale',
                  'primitive.space.<n> — where <n> is the numeric index in the spacing scale. semantic.space.<context>.<slot> for named roles.',
                ],
                [
                  'No vendor prefixes',
                  'Do not embed brand or product names in token paths. Tenant overrides happen at runtime, not at the token definition layer.',
                ],
              ].map(([rule, desc], idx) => (
                <div key={idx}>
                  <Text
                    variant="body"
                    as="span"
                    style={{ color: 'var(--semantic-color-content-primary)', display: 'block' }}
                  >
                    {rule}
                  </Text>
                  <Text
                    variant="body"
                    as="span"
                    style={{ color: 'var(--semantic-color-content-secondary)' }}
                  >
                    {desc}
                  </Text>
                </div>
              ))}
            </Stack>
          </Surface>
        </Stack>
      </DocSection>

      <DocSection title="Governance Reference" isDark={isDark} noBorder>
        <Stack gap="gap">
          <Text
            variant="body"
            as="p"
            style={{ color: 'var(--semantic-color-content-secondary)', maxWidth: 720 }}
          >
            The full set of architectural rules lives in <InlineCode>docs/ai/rules/</InlineCode>.
            When in doubt about a decision, check the rules file for the relevant domain before
            writing code. The rules exist to keep AI output correct and human review fast — do not
            bypass them without recording a decision.
          </Text>
          <Text
            variant="body"
            as="p"
            style={{ color: 'var(--semantic-color-content-secondary)', maxWidth: 720 }}
          >
            Scope questions (what belongs in HDS vs. in a consuming app) are answered in the{' '}
            <InlineCode>/hds/scope</InlineCode> page. The system contract is strict: tokens are the
            single source of truth, components stay declarative and testable, and Figma masters
            reflect live code.
          </Text>
        </Stack>
      </DocSection>
    </article>
  );
}

// ADR-017 nav metadata — drives the generated nav-model.json (see scripts/generate-nav-model.mjs).
export const meta = {
  path: '/contribution-guide',
  title: 'ContributionGuide',
  section: 'Foundations',
  order: 8,
} satisfies import('../../data/nav-model').HdsPageMeta;
