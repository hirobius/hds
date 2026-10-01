import { Checkbox } from './local-checkbox';
import { HdsCheckbox, HdsSelect as Pick, type HdsTooltip } from '@hirobius/design-system';

export const Bound = (p: { tip: typeof HdsTooltip }) => (
  <>
    <Checkbox />
    <HdsCheckbox />
    <Pick />
  </>
);
