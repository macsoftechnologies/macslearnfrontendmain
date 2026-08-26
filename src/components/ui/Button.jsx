import { Loader2 } from 'lucide-react';
import './Button.css';

export default function Button({
  children,
  variant = 'primary', // primary | secondary | ghost | danger | outline
  size = 'md', // sm | md | lg
  loading = false,
  disabled = false,
  icon: Icon,
  iconRight: IconRight,
  full = false,
  type = 'button',
  className = '',
  ...rest
}) {
  return (
    <button
      type={type}
      className={`btn btn--${variant} btn--${size} ${full ? 'btn--full' : ''} ${className}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <Loader2 size={16} className="btn__spin" /> : Icon ? <Icon size={16} /> : null}
      {children && <span>{children}</span>}
      {!loading && IconRight ? <IconRight size={16} /> : null}
    </button>
  );
}
