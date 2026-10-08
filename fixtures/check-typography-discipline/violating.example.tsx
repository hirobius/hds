// violating: hardcoded font family string and fontWeight override
export function ViolatingTypography() {
  return (
    <div
      style={{
        fontFamily: 'IBM Plex Mono',
        fontWeight: '700',
      }}
    >
      Raw font values
    </div>
  );
}
