// violating: tone spells the destructive red 'error' (should be 'danger') and
// size uses the vague 'default'/'compact' names off the sm | md | lg ramp.
type ToastTone = 'info' | 'success' | 'error' | 'warning';

export interface ViolatingProps {
  tone?: ToastTone;
  size?: 'default' | 'compact';
}

export function ViolatingVocabulary(_props: ViolatingProps) {
  return null;
}
