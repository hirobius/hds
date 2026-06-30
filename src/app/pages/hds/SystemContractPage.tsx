import type { LucideIcon } from 'lucide-react';
import { CheckCircle2, FlaskConical, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Stack } from '../../components/stack';
import { Text } from '../../components/text';
import { InlineCode } from '../../components/inline-code';
import { Surface } from '../../components/surface';
import hds from '../../design-system/tokens';
import { useTheme } from '../../context/ThemeContext';
import { Icon } from '../../components/icon';
import { DocPageHeader, DocSection } from './HdsDocPrimitives';

const systemContractStyles = {
  tableRow: {
    display: 'flex',
    gap: hds.semantic.space.layout.gap,
    alignItems: 'flex-start',
    paddingTop: hds.semantic.space.subgrid.gap,
    paddingBottom: hds.semantic.space.subgrid.gap,
    borderBottom: `${hds.borderWidth.default} solid var(--semantic-color-border-default)`,
  } satisfies React.CSSProperties,
} as const;

type ContractRow = { label: string; description: string };

function ContractTable({
  rows,
  iconEl,
  iconColor,
}: {
  rows: ContractRow[];
  iconEl: LucideIcon;
  iconColor: string;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {rows.map((row, idx) => (
        <div key={idx} style={systemContractStyles.tableRow}>
          <div style={{ flexShrink: 0, marginTop: hds.semantic.space.subgrid.hairline }}>
            <Icon icon={iconEl} size="small" color={iconColor} />
          </div>
          <div style={{ flex: 1 }}>
            <Text
              variant="body"
              as="span"
              style={{ color: 'var(--semantic-color-content-primary)', display: 'block' }}
            >
              {row.label}
            </Text>
            <Text
              variant="body"
              as="span"
              style={{ color: 'var(--semantic-color-content-secondary)' }}
            >
              {row.description}
            </Text>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Page data ─────────────────────────────────────────────────────────────────

const STABLE: ContractRow[] = [
  {
    label: 'Token paths (semantic tier)',
    description:
      'All semantic.color.*, semantic.space.*, semantic.typography.* paths are stable. Renames require a major version bump and a documented migration path.',
  },
  {
    label: 'Component prop interfaces',
    description:
      'Public prop names, their accepted types, and default values are stable once a component exits beta. Required props may not be added in a minor release.',
  },
  {
    label: 'DOM structure guarantees',
    description:
      'Root element tag and the presence of data-* attributes that are documented in component-api.json are stable. Internal wrapper markup is not.',
  },
  {
    label: 'Token cascade direction',
    description:
      'Primitive → semantic → component is a one-way chain. Semantic tokens never reference component tokens. Component tokens reference semantic tokens, not primitives directly.',
  },
];

const EXPERIMENTAL: ContractRow[] = [
  {
    label: 'Component tokens (component.*)',
    description:
      'Component-tier token paths may be renamed, merged, or removed as the component matures. Do not build stable selectors against them in consuming code.',
  },
  {
    label: 'Primitive token values',
    description:
      'Numeric steps in the primitive palette (e.g. primitive.color.blue.500) may be re-scaled. Consuming code should always alias through a semantic token.',
  },
  {
    label: 'Internal utilities',
    description:
      'Anything tagged /** @internal */ in JSDoc or exported only from internal barrel files is not part of the public contract. It may change or be removed without notice.',
  },
  {
    label: 'Doc page content',
    description:
      'Doc page URLs and section headings are convenience navigation, not versioned API surfaces. They may change without a major version bump.',
  },
];

const BREAKING_CHANGE_POLICY: { label: string; body: string }[] = [
  {
    label: 'What counts as a breaking change',
    body: 'Removing a stable export, renaming a stable token path, changing a prop type to be more restrictive, or altering a DOM structure guarantee. Adding a new required prop also counts.',
  },
  {
    label: 'How breaking changes are handled',
    body: 'Breaking changes require a major version bump in package.json, a migration guide entry in CHANGELOG.md, and a deprecation period of at least one sprint where both the old and new forms work.',
  },
  {
    label: 'Deprecation pattern',
    body: 'Stable exports slated for removal are marked with /** @deprecated — use X instead */ JSDoc. The deprecation is announced in the release notes. They are removed in the next major release.',
  },
];

// ── Page component ────────────────────────────────────────────────────────────

export default function SystemContractPage() {
  const { isDark } = useTheme();

  return (
    <article>
      <DocPageHeader
        group="HDS"
        title="System Contract"
        isDark={isDark}
        intro="What is stable, what is experimental, how breaking changes are managed, and who can merge changes into HDS."
      />

      <DocSection title="Stable API Surface" isDark={isDark}>
        <Stack gap="normal">
          <Text
            variant="body"
            as="p"
            style={{ color: 'var(--semantic-color-content-secondary)', maxWidth: 720 }}
          >
            The stable API surface is what consuming code — other pages in this site, and eventually
            external tenant applications — can rely on across minor and patch releases. Changes to
            this surface trigger the breaking-change policy below.
          </Text>
          <ContractTable
            rows={STABLE}
            iconEl={CheckCircle2}
            iconColor="var(--semantic-color-feedback-success)"
          />
        </Stack>
      </DocSection>

      <DocSection title="Experimental Surface" isDark={isDark}>
        <Stack gap="normal">
          <Text
            variant="body"
            as="p"
            style={{ color: 'var(--semantic-color-content-secondary)', maxWidth: 720 }}
          >
            Experimental surfaces are in active design. They exist in the codebase and may be used
            internally, but they carry no stability promise. Treat them as implementation details
            until they are explicitly promoted to stable.
          </Text>
          <ContractTable
            rows={EXPERIMENTAL}
            iconEl={FlaskConical}
            iconColor="var(--semantic-color-feedback-warning)"
          />
        </Stack>
      </DocSection>

      <DocSection title="Breaking-Change Policy" isDark={isDark}>
        <Stack gap="normal">
          <Text
            variant="body"
            as="p"
            style={{ color: 'var(--semantic-color-content-secondary)', maxWidth: 720 }}
          >
            HDS follows semantic versioning. The policy below defines what triggers a major version
            bump and how the transition is managed.
          </Text>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {BREAKING_CHANGE_POLICY.map((item, idx) => (
              <div key={idx} style={systemContractStyles.tableRow}>
                <div style={{ flexShrink: 0, marginTop: hds.semantic.space.subgrid.hairline }}>
                  <Icon
                    icon={AlertTriangle}
                    size="small"
                    color="var(--semantic-color-feedback-warning)"
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <Text
                    variant="body"
                    as="span"
                    style={{ color: 'var(--semantic-color-content-primary)', display: 'block' }}
                  >
                    {item.label}
                  </Text>
                  <Text
                    variant="body"
                    as="span"
                    style={{ color: 'var(--semantic-color-content-secondary)' }}
                  >
                    {item.body}
                  </Text>
                </div>
              </div>
            ))}
          </div>
        </Stack>
      </DocSection>

      <DocSection title="Who Can Merge" isDark={isDark} noBorder>
        <Stack gap="normal">
          <Text
            variant="body"
            as="p"
            style={{ color: 'var(--semantic-color-content-secondary)', maxWidth: 720 }}
          >
            HDS is a solo-maintained system. All merges to <InlineCode>fix/ui-pipeline</InlineCode>{' '}
            and <InlineCode>main</InlineCode> go through Adrian Milsap or an autonomous agent
            operating under an approved orchestration unit.
          </Text>
          <Surface padding="component" style={{ maxWidth: 720 }}>
            <Stack gap="gap">
              <div
                style={{
                  display: 'flex',
                  gap: hds.semantic.space.subgrid.gap,
                  alignItems: 'flex-start',
                }}
              >
                <Icon
                  icon={ShieldCheck}
                  size="small"
                  color="var(--semantic-color-feedback-success)"
                />
                <div>
                  <Text
                    variant="body"
                    as="span"
                    style={{ color: 'var(--semantic-color-content-primary)', display: 'block' }}
                  >
                    Additive changes (new tokens, new components, new doc pages)
                  </Text>
                  <Text
                    variant="body"
                    as="span"
                    style={{ color: 'var(--semantic-color-content-secondary)' }}
                  >
                    May be merged by any autonomous agent operating on an approved orchestration
                    unit, provided all quality gates pass.
                  </Text>
                </div>
              </div>
              <div
                style={{
                  display: 'flex',
                  gap: hds.semantic.space.subgrid.gap,
                  alignItems: 'flex-start',
                }}
              >
                <Icon
                  icon={ShieldCheck}
                  size="small"
                  color="var(--semantic-color-feedback-warning)"
                />
                <div>
                  <Text
                    variant="body"
                    as="span"
                    style={{ color: 'var(--semantic-color-content-primary)', display: 'block' }}
                  >
                    Deletions and renames
                  </Text>
                  <Text
                    variant="body"
                    as="span"
                    style={{ color: 'var(--semantic-color-content-secondary)' }}
                  >
                    Require a Sonnet-class agent (or Adrian directly) to audit live consumers before
                    the deletion lands. Haiku agents are not permitted to delete stable exports.
                  </Text>
                </div>
              </div>
              <div
                style={{
                  display: 'flex',
                  gap: hds.semantic.space.subgrid.gap,
                  alignItems: 'flex-start',
                }}
              >
                <Icon
                  icon={ShieldCheck}
                  size="small"
                  color="var(--semantic-color-feedback-error)"
                />
                <div>
                  <Text
                    variant="body"
                    as="span"
                    style={{ color: 'var(--semantic-color-content-primary)', display: 'block' }}
                  >
                    Breaking changes to the stable API surface
                  </Text>
                  <Text
                    variant="body"
                    as="span"
                    style={{ color: 'var(--semantic-color-content-secondary)' }}
                  >
                    Require Adrian&apos;s explicit sign-off. Autonomous agents must stop and report
                    when they detect a proposed change would break the stable contract.
                  </Text>
                </div>
              </div>
            </Stack>
          </Surface>
          <Text
            variant="body"
            as="p"
            style={{ color: 'var(--semantic-color-content-secondary)', maxWidth: 720 }}
          >
            Quality gates are non-negotiable for every merge:{' '}
            <InlineCode>pnpm typecheck</InlineCode>, <InlineCode>pnpm check:tokens</InlineCode>, and
            the validate scripts must all pass. A failing gate is a merge blocker regardless of who
            is merging.
          </Text>
        </Stack>
      </DocSection>
    </article>
  );
}

// ADR-017 nav metadata — drives the generated nav-model.json (see scripts/generate-nav-model.mjs).
export const meta = {
  path: '/system-contract',
  title: 'SystemContract',
  section: 'Foundations',
  order: 9,
} satisfies import('../../data/nav-model').HdsPageMeta;
