'use client';

import { useState } from 'react';
import { Button, Stack, Text } from '@hirobius/design-system';
import { NumberValue } from '@hirobius/design-system/number';

/**
 * The ./number subpath live (hds#751): each press moves the value, and the
 * digits roll with the productive motion token. With reduced motion on, the
 * new value shows at once.
 */
export function NumberValueDemo() {
  const [value, setValue] = useState(1284);
  return (
    <Stack gap="normal" align="start">
      <Text variant="title" as="p" aria-live="polite">
        <NumberValue value={value} />
      </Text>
      <Stack direction="row" gap="tight">
        <Button variant="secondary" onClick={() => setValue((n) => n - 137)}>
          Decrease
        </Button>
        <Button variant="secondary" onClick={() => setValue((n) => n + 512)}>
          Increase
        </Button>
      </Stack>
    </Stack>
  );
}
