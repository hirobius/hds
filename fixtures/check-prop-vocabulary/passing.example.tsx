// passing: tone uses the canonical feedback vocabulary ('danger', not 'error'),
// size stays on the sm | md | lg ramp, tone stays inside the fixed feedback
// set, and density stays on comfortable | compact.
type ToastTone = 'info' | 'success' | 'danger' | 'warning';

export interface PassingProps {
  tone?: ToastTone;
  variant?: 'primary' | 'secondary' | 'tertiary';
  size?: 'sm' | 'md' | 'lg';
  density?: 'comfortable' | 'compact';
}

export function PassingVocabulary(_props: PassingProps) {
  return null;
}
