// violating: each line below leaves the 5-role-plus-mono type ramp (hds#483).
import * as React from 'react';
import { hds } from '../../src/app/design-system/tokens';
import { Text } from '../../src/app/components/text';

export function ViolatingTypography() {
  return (
    <div>
      <p className="text-lg font-bold leading-loose">raw Tailwind size, weight and leading</p>
      <p style={{ fontSize: '17px', fontWeight: 300, lineHeight: 1.7 }}>raw inline values</p>
      <p style={hds.typeStyles.heading2}>deprecated composite</p>
      <Text variant="heading1">deprecated variant</Text>
      <p className="[font-size:15px]">arbitrary property</p>
    </div>
  );
}
