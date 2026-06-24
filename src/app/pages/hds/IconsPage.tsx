import React from 'react';
import {
  ArrowRight,
  CircleCheck,
  Info,
  Search,
  LayoutGrid,
  TriangleAlert,
  CircleX,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import hds from '../../design-system/tokens';
import { Alert } from '../../components/alert';
import { Token } from '../../components/token';
import { Icon } from '../../components/icon';
import { Stack } from '../../components/stack';
import { Surface } from '../../components/surface';
import { Text } from '../../components/text';
import { DocPageHeader, DocSection } from './HdsDocPrimitives';

const supportingTextStyle = hds.typeStyles.caption;

const iconSemanticColorItemStyle = {
  display: 'flex' as const,
  flexDirection: 'column' as const,
  alignItems: 'center' as const,
  gap: hds.semantic.space.component.gap,
  borderTop: `${hds.borderWidth.default} solid var(--semantic-color-border-subdued)`,
};

export default function IconsPage() {
  const { isDark } = useTheme();

  const iconSizes = [
    {
      token: 'iconSize.small',
      pixelValue: 16,
      desc: 'Default icon size. Navigation items, inline actions, alert icons, anchor indicators.',
    },
    {
      token: 'iconSize.medium',
      pixelValue: 20,
      desc: 'Prominent actions, section headers, callouts.',
    },
    {
      token: 'iconSize.large',
      pixelValue: 24,
      desc: 'Hero moments, large empty states, feature illustrations.',
    },
  ];

  return (
    <div className="hds-page-enter">
      <article>
        <DocPageHeader
          group="Components"
          title="Icons"
          hasTokens
          isDark={isDark}
          intro={
            <>
              Icons stay monochrome and consistent. Use the wrapper for the canonical sizes, and
              keep color neutral unless the icon is showing state.
            </>
          }
        />

        <DocSection title="Icon wrapper" isDark={isDark}>
          <Stack gap="px24">
            <Text variant="body" as="p" style={{ color: 'var(--semantic-color-content-primary)' }}>
              Use the HDS <code>&lt;Icon /&gt;</code> wrapper instead of styling icons ad hoc.
            </Text>
            <Surface padding="component">
              <div
                style={{
                  display: 'flex',
                  gap: hds.semantic.space.layout.gap,
                  alignItems: 'flex-end',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: hds.semantic.space.subgrid.gap,
                  }}
                >
                  <div
                    style={{ height: hds.iconSize.large, display: 'flex', alignItems: 'flex-end' }}
                  >
                    <Icon
                      icon={LayoutGrid}
                      size="small"
                      color="var(--semantic-color-content-primary)"
                    />
                  </div>
                  <Token variant="node">small</Token>
                  <span
                    style={{
                      ...hds.typeStyles.caption,
                      color: 'var(--semantic-color-content-secondary)',
                    }}
                  >
                    16px
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: hds.semantic.space.subgrid.gap,
                  }}
                >
                  <div
                    style={{ height: hds.iconSize.large, display: 'flex', alignItems: 'flex-end' }}
                  >
                    <Icon
                      icon={LayoutGrid}
                      size="medium"
                      color="var(--semantic-color-content-primary)"
                    />
                  </div>
                  <Token variant="node">medium</Token>
                  <span
                    style={{
                      ...hds.typeStyles.caption,
                      color: 'var(--semantic-color-content-secondary)',
                    }}
                  >
                    20px
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: hds.semantic.space.subgrid.gap,
                  }}
                >
                  <div
                    style={{ height: hds.iconSize.large, display: 'flex', alignItems: 'flex-end' }}
                  >
                    <Icon
                      icon={LayoutGrid}
                      size="large"
                      color="var(--semantic-color-content-primary)"
                    />
                  </div>
                  <Token variant="node">large</Token>
                  <span
                    style={{
                      ...hds.typeStyles.caption,
                      color: 'var(--semantic-color-content-secondary)',
                    }}
                  >
                    24px
                  </span>
                </div>
              </div>
            </Surface>

            <Stack gap="px24">
              {iconSizes.map((size) => (
                <Stack key={size.token} gap="xs">
                  <div>
                    <Token variant="node">{size.token}</Token>{' '}
                    <span
                      style={{
                        ...hds.typeStyles.ui,
                        color: 'var(--semantic-color-content-secondary)',
                      }}
                    >
                      {size.pixelValue}px
                    </span>
                  </div>
                  <div
                    style={{
                      ...supportingTextStyle,
                      color: 'var(--semantic-color-content-secondary)',
                    }}
                  >
                    {size.desc}
                  </div>
                </Stack>
              ))}
            </Stack>
          </Stack>
        </DocSection>

        <DocSection title="Semantic colors" isDark={isDark}>
          <Stack gap="px24">
            {[
              {
                icon: CircleCheck,
                color: 'var(--semantic-color-feedback-success)',
                label: 'Success',
              },
              {
                icon: TriangleAlert,
                color: 'var(--semantic-color-feedback-warning)',
                label: 'Warning',
              },
              { icon: CircleX, color: 'var(--semantic-color-feedback-error)', label: 'Danger' },
              { icon: Info, color: 'var(--semantic-color-feedback-info)', label: 'Info' },
              { icon: Search, color: 'var(--semantic-color-content-secondary)', label: 'Dim' },
              {
                icon: ArrowRight,
                color: 'var(--semantic-color-content-accent)',
                label: 'Link accent',
              },
            ].map((item, i) => (
              <div key={i} style={iconSemanticColorItemStyle}>
                <Icon icon={item.icon} size="small" color={item.color} />
                <Text
                  variant="caption"
                  as="span"
                  style={{ color: 'var(--semantic-color-content-secondary)' }}
                >
                  {item.label}
                </Text>
              </div>
            ))}
          </Stack>
        </DocSection>

        <Stack gap="px24">
          <Alert tone="info">
            Do not use colored icons for primary actions unless they communicate state. Rely on size
            and neutral contrast to establish visual hierarchy.
          </Alert>
        </Stack>
      </article>
    </div>
  );
}
