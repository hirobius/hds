// passing: type comes from the six roles only (hds#483).
import * as React from 'react';
import { hds } from '../../src/app/design-system/tokens';
import { Text } from '../../src/app/components/text';

export function PassingTypography() {
  return (
    <div>
      <Text variant="title">A role variant</Text>
      <p className="hds-type-ui text-muted-foreground">A role class</p>
      <p style={hds.typeStyles.caption}>A role composite</p>
      <p style={{ fontSize: 'var(--semantic-typography-body-font-size)' }}>A role var</p>
      <p style={{ fontWeight: 'inherit' }}>Inherit is not a size</p>
      <span className="leading-none">{/* type-ramp-ok: icon box, not text */}</span>
    </div>
  );
}
