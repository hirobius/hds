import type { CSSProperties, ReactNode } from 'react';

import {
  colorGalleries,
  elevationLevels,
  iconSizes,
  motionTokens,
  radiusScales,
  spaceScales,
  typeSpecimens,
  type DimensionStep,
} from '../lib/foundation-visuals';
import { loadAccentThemes, loadTokens } from '../lib/site-data';
import {
  CopyCard,
  ElevationOnComponents,
  MotionDemo,
  SoftSurfacesDemo,
  SurfaceOnComponents,
  type OnComponentsRow,
} from './foundation-visuals-client';
import { tokenRow } from '../lib/token-tables';
import { IconSizes } from './icon-gallery';

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

/**
 * A specimen's spec line. Mono is for code, token names and token values only, so the
 * names (role, family, weight, easing) read in the caption face and only the copyable
 * values stay mono.
 */
function SpecLine({ label, values }: { label: string; values: string }) {
  return (
    <p className="hds-specimen-meta">
      {label} · <span className="hds-specimen-values">{values}</span>
    </p>
  );
}

/** Hex values read in one case (lowercase), whatever case the token file stores. */
const hex = (v: string) => (v.startsWith('#') ? v.toLowerCase() : v);

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
                  const dark =
                    s.darkValue !== null && s.darkValue !== s.value ? hex(s.darkValue) : null;
                  const name = s.cssVar ?? s.token;
                  // Fills are the shipped CSS variables, not copied values (hds#846).
                  return (
                    <CopyCard key={s.token} copy={name}>
                      <span className="hds-swatch-squares" aria-hidden="true">
                        <span
                          className="hds-swatch-fill"
                          data-theme-mode="light"
                          style={{ background: s.fill ?? undefined }}
                        />
                        {dark ? (
                          <span
                            className="hds-swatch-fill"
                            data-theme-mode="dark"
                            style={{ background: s.darkFill ?? undefined }}
                          />
                        ) : null}
                      </span>
                      <span className="hds-swatch-meta">
                        <code className="hds-swatch-name">{name}</code>
                        {dark ? (
                          <>
                            <span className="hds-swatch-value">L {hex(s.value)}</span>
                            <span className="hds-swatch-value">D {dark}</span>
                          </>
                        ) : (
                          <span className="hds-swatch-value">{hex(s.value)}</span>
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
        Two squares show light, then dark. Tap a swatch to copy its CSS variable.
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
            <SpecLine
              label={`${t.role} · ${t.family} ${t.fontWeight}`}
              values={[t.fontSize, t.lineHeight, t.letterSpacing].join(' / ')}
            />
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
            {e.shadowToken ? (
              <span className="hds-step-value">{e.shadowToken}</span>
            ) : (
              <span className="hds-elevation-desc">No shadow, hairline border</span>
            )}
          </div>
        ))}
      </div>
    </Section>
  );
}

const SURFACE_STEPS = [
  'page',
  'raised',
  'muted',
  'overlay',
  'floating',
  'sunken',
  'soft',
  'softHover',
  'inverse',
];

/**
 * A token as a row on an "on components" list, with its square fills. Rows name the
 * token by its dotted path, the same format as the elevation levels and the demo captions.
 */
function swatchRow(path: string): OnComponentsRow[] {
  const r = tokenRow(loadTokens(), path);
  if (!r) return [];
  return [
    {
      token: r.token,
      name: r.token,
      note: r.description,
      fill: r.fill,
      darkFill: r.darkFill ?? r.fill,
    },
  ];
}

function ElevationPage() {
  const levels: OnComponentsRow[] = elevationLevels(loadTokens()).map((e) => ({
    token: e.token,
    name: e.token,
    note: e.description,
  }));
  return (
    <>
      <ElevationCards />
      <ElevationOnComponents rows={[...levels, ...swatchRow('semantic.color.shadow.hard')]} />
    </>
  );
}

function SoftSurfacesPage() {
  return (
    <>
      <SoftSurfacesDemo />
      <SurfaceOnComponents
        rows={SURFACE_STEPS.flatMap((s) => swatchRow(`semantic.color.surface.${s}`))}
      />
    </>
  );
}

function MotionDemos() {
  return (
    <Section title="Presets">
      <div className="hds-specimens">
        {motionTokens(loadTokens()).map((m) => (
          <div key={m.token} className="hds-specimen">
            <SpecLine
              label={[m.name, m.easingName].filter(Boolean).join(' · ')}
              values={[m.duration, m.easing].filter(Boolean).join(' · ')}
            />
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

function IconSizeBoxes() {
  return (
    <Section title="Sizes">
      <IconSizes steps={iconSizes(loadTokens())} />
    </Section>
  );
}

const VISUALS: Record<string, () => ReactNode> = {
  color: ColorGallery,
  typography: TypeSpecimens,
  spacing: SpacingBars,
  radius: RadiusBoxes,
  elevation: ElevationPage,
  motion: MotionDemos,
  'soft-surfaces': SoftSurfacesPage,
  icons: IconSizeBoxes,
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
