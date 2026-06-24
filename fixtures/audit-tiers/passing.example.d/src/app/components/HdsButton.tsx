/**
 * HdsButton
 *
 * @tier primitive
 */
export interface HdsButtonProps {
  label: string;
  variant?: 'primary' | 'secondary';
}

export function HdsButton({ label }: HdsButtonProps) {
  return <button>{label}</button>;
}
