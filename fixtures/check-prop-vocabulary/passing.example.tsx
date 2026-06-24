// passing: tone uses the canonical feedback vocabulary ('danger', not 'error')
// and size stays on the sm | md | lg ramp.
type ToastTone = 'info' | 'success' | 'danger' | 'warning';

export interface PassingProps {
  tone?: ToastTone;
  variant?: 'primary' | 'secondary' | 'tertiary';
  size?: 'sm' | 'md' | 'lg';
}

export function PassingVocabulary(_props: PassingProps) {
  return null;
}
