// violating: a surface (a banner, like Callout) on the action radius — tighter
// than Card — and a raw radius value.
const banner = 'rounded-md bg-feedback-bg-info p-4';
export const Violating = () => (
  <div className={banner} style={{ borderRadius: 6 }}>
    Tracker is now Pipeline
  </div>
);
