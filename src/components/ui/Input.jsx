import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import './Input.css';

export function Field({ label, required, error, hint, children }) {
  return (
    <div className={`field ${error ? 'field--error' : ''}`}>
      {label && (
        <label className="field__label">
          {label} {required && <span className="field__req">*</span>}
        </label>
      )}
      {children}
      {error && <span className="field__error">{error}</span>}
      {!error && hint && <span className="field__hint">{hint}</span>}
    </div>
  );
}

export default function Input({ type = 'text', numbersOnly = false, className = '', ...rest }) {
  const [show, setShow] = useState(false);
  if (type === 'password') {
    return (
      <div className="input-wrap">
        <input type={show ? 'text' : 'password'} className={`input ${className}`} {...rest} />
        <button type="button" className="input-wrap__toggle" onClick={() => setShow((s) => !s)} tabIndex={-1}>
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    );
  }

  const isTel = type === 'tel';
  const isNumericOnly = numbersOnly || type === 'number';

  const handleKeyDown = (e) => {
    if (isTel) {
      // Allow control keys (Backspace, Tab, Delete, Arrows, Home, End, etc), Ctrl/Cmd combos
      if (e.key.length > 1 || e.ctrlKey || e.metaKey || e.altKey) return;
      // Block any character that isn't a digit, space, plus, parenthesis, or hyphen
      if (!/[0-9() +\-]/.test(e.key)) {
        e.preventDefault();
      }
    } else if (isNumericOnly) {
      if (e.key.length > 1 || e.ctrlKey || e.metaKey || e.altKey) return;
      if (!/[0-9]/.test(e.key)) {
        e.preventDefault();
      }
    }
    if (rest.onKeyDown) rest.onKeyDown(e);
  };

  const handleChange = (e) => {
    if (isTel) {
      const sanitized = e.target.value.replace(/[^0-9() +\-]/g, '');
      if (e.target.value !== sanitized) {
        e.target.value = sanitized;
      }
    } else if (isNumericOnly) {
      const sanitized = e.target.value.replace(/\D/g, '');
      if (e.target.value !== sanitized) {
        e.target.value = sanitized;
      }
    }
    if (rest.onChange) {
      rest.onChange(e);
    }
  };

  return <input type={type} className={`input ${className}`} onKeyDown={handleKeyDown} onChange={handleChange} {...rest} />;
}

export function Textarea({ className = '', ...rest }) {
  return <textarea className={`input textarea ${className}`} {...rest} />;
}

export function Select({ className = '', children, ...rest }) {
  return (
    <select className={`input select ${className}`} {...rest}>
      {children}
    </select>
  );
}
