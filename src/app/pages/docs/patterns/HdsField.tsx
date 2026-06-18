/**
 * HdsField pattern doc (8t-1)
 * @doc-ignore — this is a doc *page*, not a component. It documents the
 *   HdsField pattern; the pattern itself is governed via the patternInventory
 *   path, not as a manifest component entry.
 *
 * Reference example for the pattern doc shape defined in _template.tsx.
 *
 * HdsField is the canonical "labelled text input with helper / error" recipe.
 * Today it composes via Input's built-in label / helperText / errorMessage
 * props (8s-5 retained those slots so existing call sites keep working). A
 * future 8t pass may extract the pieces into their own primitives, at which
 * point this page's composition diagram updates accordingly.
 */

import { useTheme } from '../../../context/ThemeContext';
import { Input } from '../../../components/input';
import { PatternDocPage } from './_template';

const BASIC_FIELD_SOURCE = `<Input
  label="Email"
  type="email"
  placeholder="you@hirobius.com"
/>`;

const FIELD_WITH_HELPER_SOURCE = `<Input
  label="Workspace slug"
  helperText="Lowercase letters, numbers, and dashes only."
  placeholder="acme-design"
/>`;

const FIELD_WITH_ERROR_SOURCE = `<Input
  label="Workspace slug"
  error
  errorMessage="That slug is already taken."
  value="acme"
  onChange={() => {}}
/>`;

export default function HdsFieldPatternPage() {
  const { isDark } = useTheme();

  return (
    <PatternDocPage
      title="HdsField"
      intro="Labelled text input with helper text and error messaging."
      isDark={isDark}
      whenToUse={[
        'A form value needs a visible label tied to the input via aria.',
        'You want progressive disclosure of guidance (helper text) without crowding the placeholder.',
        'You need an error state that screen readers and sighted users both pick up.',
        'The input is single-line text; for longer prose use HdsTextarea once it lands.',
      ]}
      composition="HdsField = HdsLabel + Input + HdsHelperText (currently provided in-place by Input's label / helperText / errorMessage props)"
      examples={[
        {
          title: 'Basic field',
          description:
            'Just the label and input. The label is rendered above and tied to the input by id.',
          source: BASIC_FIELD_SOURCE,
          preview: <Input label="Email" type="email" placeholder="you@hirobius.com" />,
        },
        {
          title: 'Field with helper text',
          description:
            'Helper text fills the space below the input when there is no error. Use it to explain constraints, not to repeat the label.',
          source: FIELD_WITH_HELPER_SOURCE,
          preview: (
            <Input
              label="Workspace slug"
              helperText="Lowercase letters, numbers, and dashes only."
              placeholder="acme-design"
            />
          ),
        },
        {
          title: 'Field with error',
          description:
            'Error mode swaps the helper text for a destructive-toned error message and flips the border / focus ring to destructive.',
          source: FIELD_WITH_ERROR_SOURCE,
          preview: (
            <Input
              label="Workspace slug"
              error
              errorMessage="That slug is already taken."
              value="acme"
              onChange={() => undefined}
            />
          ),
        },
      ]}
      primitives={[
        { label: 'Input — text input primitive', href: '/components/inputs#hdsinput' },
      ]}
    />
  );
}
