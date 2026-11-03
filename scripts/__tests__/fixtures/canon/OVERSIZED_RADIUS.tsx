/** Canon fixture: OVERSIZED_RADIUS — triggers rounded-full on a structural element */
import React from 'react';

export function OversizedRadiusFixture() {
  return (
    <div>
      {/* HdsCard is in STRUCTURAL_COMPONENTS, so fileNearStructural returns true */}
      <HdsCard className="rounded-full p-6">
        <p>This card uses rounded-full which is an oversized radius.</p>
      </HdsCard>
    </div>
  );
}
