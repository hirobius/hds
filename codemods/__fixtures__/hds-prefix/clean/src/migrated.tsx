import { Checkbox, Tooltip } from '@hirobius/design-system';
import { HdsCheckbox as Legacy } from './legacy';

// HdsCheckbox in a comment of a file with no root Hds* import is left alone.
export const Ok = () => (
  <Tooltip content="x">
    <Checkbox />
    <Legacy />
  </Tooltip>
);
