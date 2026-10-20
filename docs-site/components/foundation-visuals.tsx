import type { CSSProperties, ReactNode } from 'react';

import {
  colorGalleries,
  elevationLevels,
  motionTokens,
  radiusScales,
  spaceScales,
  typeSpecimens,
  type DimensionStep,
} from '../lib/foundation-visuals';
import { loadAccentThemes, loadTokens } from '../lib/site-data';
import { CopyCard, MotionDemo } from './foundation-visuals-client';

/** Sample text per role: long enough to show the leading, short enough for a phone. */
const SAMPLES: Record<string, string> = {
  display: 'Design that holds its shape',
  title: 'Every token, one source of truth',
  titleSm: 'Danger zone',
  body: 'Plain grays, one accent and a 4px grid. The system stays quiet so the content can speak, in light and dark.',
  ui: 'Save changes · Cancel · Settings',
  caption: 'Updated 2 minutes ago',
  mono: 'semantic.color.surface.page',
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="hds-visual">
      <h3 className="hds-visual-title">{title}</h3>
      {children}
    </section>
  );
}

function ColorGallery() {
  return (
    <>
      {colorGalleries(loadTokens(), loadAccentThemes()).map((gallery) => (
        <Section key={gallery.title} title={gallery.title}>
          {gallery.groups.map((group) => (
            <div key={group.title} className="hds-swatch-group">
              <p className="hds-visual-label">{group.title}</p>
              <div className={`hds-swatch-grid${gallery.dense ? ' hds-swatch-grid--dense' : ''}`}>
                {group.swatches.map((s) => {
                  const dark = s.darkValue !== null && s.darkValue !== s.value ? s.darkValue : null;
                  const name = s.cssVar ?? s.token;
                  return (
                    <CopyCard key={s.token} copy={s.token}>
                      <span className="hds-swatch-block" aria-hidden="true">
                        <span style={{ background: s.value }} />
                        {dark ? <span style={{ background: dark }} /> : null}
                      </span>
                      <span className="hds-swatch-meta">
                        <code className="hds-swatch-name">
                          {name.replace(/^--(primitive|semantic)-(color-)?/, '')}
                        </code>
                        {dark ? (
                          <>
                            <span className="hds-swatch-value">L {s.value}</span>
                            <span className="hds-swatch-value">D {dark}</span>
                          </>
                        ) : (
                          <span className="hds-swatch-value">{s.value}</span>
                        )}
                      </span>
                    </CopyCard>
                  );
                })}
              </div>
            </div>
          ))}
        </Section>
      ))}
      <p className="hds-visual-note">
        Split blocks show light (left) and dark (right). Tap a card to copy its token name.
      </p>
    </>
  );
}

function TypeSpecimens() {
  return (
    <Section title="Type ramp">
      <div className="hds-specimens">
        {typeSpecimens(loadTokens()).map((t) => (
          <div key={t.role} className="hds-specimen">
            <p className="hds-specimen-meta">
              {[t.role, t.family, t.fontWeight, t.fontSize, t.lineHeight, t.letterSpacing].join(
                ' · ',
              )}
            </p>
            <p
              className="hds-specimen-sample"
              style={{
                fontFamily: t.fontFamily,
                fontWeight: Number(t.fontWeight) || t.fontWeight,
                fontSize: t.fontSize,
                lineHeight: t.lineHeight,
                letterSpacing: t.letterSpacing,
              }}
            >
              {SAMPLES[t.role] ?? 'The quick brown fox jumps over the lazy dog'}
            </p>
          </div>
        ))}
      </div>
    </Section>
  );
}

function StepRows({
  steps,
  draw,
}: {
  steps: DimensionStep[];
  draw: (s: DimensionStep) => ReactNode;
}) {
  return (
    <div className="hds-steps">
      {steps.map((s) => (
        <div key={s.token} className="hds-step">
          <code className="hds-step-name">{s.name}</code>
          <span className="hds-step-value">{s.value}</span>
          <div className="hds-step-draw">{draw(s)}</div>
        </div>
      ))}
    </div>
  );
}

function SpacingBars() {
  return (
    <>
      {spaceScales(loadTokens()).map((scale) => (
        <Section key={scale.title} title={scale.title}>
          <StepRows
            steps={scale.steps}
            draw={(s) => <span className="hds-space-bar" style={{ width: `var(${s.cssVar})` }} />}
          />
        </Section>
      ))}
    </>
  );
}

function RadiusBoxes() {
  return (
    <>
      {radiusScales(loadTokens()).map((scale) => (
        <Section key={scale.title} title={scale.title}>
          <div className="hds-radius-grid">
            {scale.steps.map((s) => (
              <div key={s.token} className="hds-radius-item">
                <span className="hds-radius-box" style={{ borderRadius: `var(${s.cssVar})` }} />
                <code className="hds-step-name">{s.name}</code>
                <span className="hds-step-value">{s.value}</span>
              </div>
            ))}
          </div>
        </Section>
      ))}
    </>
  );
}

function ElevationCards() {
  return (
    <Section title="Levels">
      <div className="hds-elevation-grid">
        {elevationLevels(loadTokens()).map((e) => (
          <div
            key={e.token}
            className="hds-elevation-card"
            style={
              {
                background: e.surface ?? undefined,
                boxShadow: e.shadow ?? 'none',
                border: e.border ? `1px solid ${e.border}` : '1px solid transparent',
              } as CSSProperties
            }
          >
            <code className="hds-step-name">{e.name}</code>
            <span className="hds-elevation-desc">{e.description}</span>
            <span className="hds-step-value">{e.shadowToken ?? 'No shadow, hairline border'}</span>
          </div>
        ))}
      </div>
    </Section>
  );
}

function MotionDemos() {
  return (
    <Section title="Presets">
      <div className="hds-specimens">
        {motionTokens(loadTokens()).map((m) => (
          <div key={m.token} className="hds-specimen">
            <p className="hds-specimen-meta">
              {[m.name, m.duration, m.easingName, m.easing].filter(Boolean).join(' · ')}
            </p>
            <p className="hds-elevation-desc">{m.description}</p>
            <MotionDemo
              duration={m.durationVar ? `var(${m.durationVar})` : m.duration}
              easing={m.easing}
            />
          </div>
        ))}
      </div>
      <p className="hds-visual-note">
        Durations drop to zero when your system asks for reduced motion.
      </p>
    </Section>
  );
}

const VISUALS: Record<string, () => ReactNode> = {
  color: ColorGallery,
  typography: TypeSpecimens,
  spacing: SpacingBars,
  radius: RadiusBoxes,
  elevation: ElevationCards,
  motion: MotionDemos,
};

/** The visual gallery for a Foundations page, or nothing for a page without one. */
export function FoundationVisual({ page }: { page: string }) {
  const Visual = VISUALS[page];
  return Visual ? (
    <div className="hds-visuals">
      <Visual />
    </div>
  ) : null;
}
