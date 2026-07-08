// violating: tone spells the destructive red 'error' (should be 'danger'),
// size uses the vague 'default'/'compact' names off the sm | md | lg ramp,
// tone strays outside the fixed feedback set with 'accent', and density
// strays outside comfortable | compact with 'roomy'.
type ToastTone = 'info' | 'success' | 'error' | 'warning';

export interface ViolatingProps {
  tone?: ToastTone;
  size?: 'default' | 'compact';
}

type BadgeTone = 'neutral' | 'accent' | 'danger';

export interface OtherViolatingProps {
  tone?: BadgeTone;
  density?: 'roomy' | 'compact';
}

export function ViolatingVocabulary(_props: ViolatingProps) {
  return null;
}
