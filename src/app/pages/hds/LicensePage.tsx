import { useTheme } from '../../context/ThemeContext';
import hds from '../../design-system/tokens';
import { InlineLink } from '../../components/inline-link';
import { Surface } from '../../components/surface';
import { Table } from '../../components/table';
import { DocPageHeader, DocSection } from './HdsDocPrimitives';

// -- Credits data --------------------------------------------------------------

const CREDITS = [
  {
    name: 'Satoshi',
    href: undefined as string | undefined,
    role: 'Body, UI, and heading typeface - the single voice of the system (500 body / UI, 700 headings)',
    license: 'OFL (Fontshare)',
  }, // security-ok: font credit only, no self-hosted equivalent available
  {
    name: 'Geist Mono',
    href: undefined as string | undefined,
    role: 'Monospace typeface - code, token names, technical metadata',
    license: 'SIL OFL',
  },
  {
    name: 'Lucide',
    href: 'https://lucide.dev',
    role: 'Icon library - all iconography throughout the DS',
    license: 'ISC',
  },
  {
    name: 'Radix UI',
    href: 'https://www.radix-ui.com/',
    role: 'Accessible primitives - the behavioral foundation of components',
    license: 'MIT',
  },
  {
    name: 'shadcn/ui',
    href: 'https://ui.shadcn.com/',
    role: 'Component patterns - structural reference for several components',
    license: 'MIT',
  },
  {
    name: 'Motion',
    href: 'https://motion.dev/',
    role: 'Animation library - all transitions and motion in the DS',
    license: 'MIT',
  },
];

// -- Page ----------------------------------------------------------------------
// Two licenses, one rationale: code and design have different reuse norms.
// MIT for the implementation (unrestricted). CC BY 4.0 for the design language
// (reuse allowed, attribution required - same expectation as Material or Carbon).

const YEAR = new Date().getFullYear();

export default function LicensePage() {
  const { isDark } = useTheme();

  return (
    <article>
      <DocPageHeader
        group="About"
        title="License"
        isDark={isDark}
        intro="Code is open to use. The design language is open too, but it asks for attribution."
      />

      {/* -- Code - MIT ------------------------------------------------- */}
      <DocSection title="Code" isDark={isDark}>
        <p
          className="text-secondary"
          style={{
            ...hds.typeStyles.body,
            maxWidth: 560,
            marginBottom: hds.semantic.space.section.stack,
          }}
        >
          Component code, build scripts, the token compiler, and CI configuration are all under MIT.
        </p>
        <Surface padding="component" style={{ marginBottom: hds.semantic.space.subgrid.gap }}>
          <p style={{ ...hds.typeStyles.caption }} className="text-secondary">
            MIT License
            <br />
            <br />
            Copyright (c) {YEAR} Adrian Milsap
            <br />
            <br />
            Permission is hereby granted, free of charge, to any person obtaining a copy of this
            software and associated documentation files (the &quot;Software&quot;), to deal in the
            Software without restriction, including without limitation the rights to use, copy,
            modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and
            to permit persons to whom the Software is furnished to do so, subject to the following
            conditions:
            <br />
            <br />
            The above copyright notice and this permission notice shall be included in all copies or
            substantial portions of the Software.
            <br />
            <br />
            THE SOFTWARE IS PROVIDED &quot;AS IS&quot;, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
            IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
            PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
            HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF
            CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR
            THE USE OR OTHER DEALINGS IN THE SOFTWARE.
          </p>
        </Surface>
      </DocSection>

      {/* -- Design - CC BY 4.0 ----------------------------------------- */}
      <DocSection title="Design language" isDark={isDark}>
        <p
          className="text-secondary"
          style={{
            ...hds.typeStyles.body,
            maxWidth: 560,
            marginBottom: hds.semantic.space.section.stack,
          }}
        >
          The token values, visual rules, component patterns, and documentation are under CC BY 4.0.
        </p>
        <Surface padding="component" style={{ marginBottom: hds.semantic.space.component.gap }}>
          <p style={{ ...hds.typeStyles.caption }} className="text-secondary">
            Hirobius Design System (c) {YEAR} Adrian Milsap
            <br />
            Licensed under CC BY 4.0
            <br />
            <br />
            You are free to:
            <br />
            / Share - copy and redistribute in any medium or format
            <br />
            / Adapt - remix, transform, and build upon the material
            <br />
            <br />
            Under the following terms:
            <br />
            / Attribution - credit &quot;Hirobius Design System by Adrian Milsap&quot;
            <br />/ No additional restrictions beyond what the license permits
          </p>
        </Surface>
        <p className="text-secondary" style={{ ...hds.typeStyles.caption }}>
          Full license text at{' '}
          <InlineLink href="https://creativecommons.org/licenses/by/4.0/">
            creativecommons.org/licenses/by/4.0
          </InlineLink>
        </p>
      </DocSection>

      {/* -- Why two licenses ------------------------------------------- */}
      <DocSection title="Why two licenses" isDark={isDark}>
        <p className="text-secondary" style={{ ...hds.typeStyles.body, maxWidth: 560 }}>
          Code and design have different reuse norms. MIT fits the implementation. CC BY fits the
          design system language. This split is the same pattern used by{' '}
          <InlineLink href="https://m3.material.io/">Material Design</InlineLink>,{' '}
          <InlineLink href="https://carbondesignsystem.com/">IBM Carbon</InlineLink>, and{' '}
          <InlineLink href="https://spectrum.adobe.com/">Adobe Spectrum</InlineLink>.
        </p>
        <p
          className="text-secondary"
          style={{
            ...hds.typeStyles.body,
            maxWidth: 560,
            marginBottom: 0,
            marginTop: hds.semantic.space.component.gap,
          }}
        >
          In practice, that means the implementation can be reused freely, while the design language
          asks for attribution when it is copied or adapted. The repo stays easy to build on without
          losing credit for the visual system itself.
        </p>
      </DocSection>

      {/* -- Credits ---------------------------------------------------- */}
      <DocSection title="Credits" isDark={isDark} noBorder>
        <p
          className="text-secondary"
          style={{
            ...hds.typeStyles.body,
            maxWidth: 560,
            marginBottom: hds.semantic.space.section.stack,
          }}
        >
          HDS is built on the shoulders of excellent open source work. The following projects are
          directly visible in the interface and deserve explicit recognition. The full tech stack is
          documented on the{' '}
          <InlineLink href="/tech-stack" externalIcon={false}>
            Tech Stack
          </InlineLink>{' '}
          page.
        </p>

        <Table
          caption="Credits"
          columns={[
            { key: 'name', label: 'Name', width: '20%' },
            { key: 'role', label: 'Role', width: '58%' },
            { key: 'license', label: 'License', width: '22%' },
          ]}
          rows={CREDITS.map(({ name, href, role, license }) => ({
            key: name,
            cells: [
              { slot: 'label', content: href ? <InlineLink href={href}>{name}</InlineLink> : name },
              { slot: 'description', content: role },
              { slot: 'code', content: license },
            ],
          }))}
        />
      </DocSection>
    </article>
  );
}
