import { CircleCheck, CircleX } from 'lucide-react';
import { Icon } from '../../components/icon';
import { useTheme } from '../../context/ThemeContext';
import hds from '../../design-system/tokens';
import { GUIDANCE_DATA } from '../../data/hdsEditorial';
import { DocPageHeader, DocSection } from './HdsDocPrimitives';

export default function GuidancePage() {
  const { isDark } = useTheme();

  return (
    <article>
      <DocPageHeader
        group="Usage"
        title="Guidance"
        isDark={isDark}
        intro="Each rule is a simple do or don't. The technical reason lives in the tokens and contrast rules behind it."
      />

      {GUIDANCE_DATA.map((group, gi) => (
        <DocSection
          key={group.group}
          title={group.group}
          isDark={isDark}
          noBorder={gi === GUIDANCE_DATA.length - 1}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {group.rules.map((rule, i) => {
              const ruleRowStyle = {
                display: 'flex',
                gap: hds.semantic.space.subgrid.gap,
                alignItems: 'flex-start' as const,
                paddingTop: hds.semantic.space.subgrid.gap,
                paddingBottom: hds.semantic.space.subgrid.gap,
                borderBottom: i < group.rules.length - 1 ? `${hds.borderWidth.default} solid var(--semantic-color-border-default)` : 'none',
              };
              return (
              <div
                key={i}
                style={ruleRowStyle}
              >
                <div style={{ flexShrink: 0, marginTop: hds.semantic.space.subgrid.hairline }}>
                  {rule.type === 'do'
                    ? <Icon icon={CircleCheck} size="small" color="var(--semantic-color-feedback-success)" />
                    : <Icon icon={CircleX} size="small" color="var(--semantic-color-feedback-error)" />
                  }
                </div>
                <div style={{ flex: 1 }}>
                  <span
                    style={{
                      ...hds.typeStyles.caption,
                      color:         rule.type === 'do' ? 'var(--semantic-color-feedback-success)' : 'var(--semantic-color-feedback-error)',
                      display:       'block',
                      marginBottom:  hds.semantic.space.subgrid.hairline,
                    }}
                  >
                    {rule.type === 'do' ? 'DO' : "DON'T"}
                  </span>
                  <span style={{ ...hds.typeStyles.body, color: 'var(--semantic-color-content-secondary)' }}>
                    {rule.rule}
                  </span>
                </div>
              </div>
              );
            })}
          </div>
        </DocSection>
      ))}
    </article>
  );
}
