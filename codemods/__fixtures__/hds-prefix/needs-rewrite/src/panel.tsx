import {
  Stack,
  Button,
  HdsCheckbox,
  Text,
} from '@hirobius/design-system';

export const Panel = ({ on }: { on: boolean }) => (
  <Stack>
    <HdsCheckbox checked={on} />
    <Button />
    <Text>Pick one</Text>
  </Stack>
);
