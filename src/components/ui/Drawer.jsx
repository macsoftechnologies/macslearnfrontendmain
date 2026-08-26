import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import './Drawer.css';

/**
 * A sleek right-side drawer component for complex forms and settings.
 * @param {boolean} open - Whether the drawer is open
 * @param {function} onClose - Callback when drawer is closed
 * @param {string} title - Main header title
 * @param {string} subtitle - Optional subtitle text below title
 * @param {number|string} width - Width of the drawer (default: 500px)
 * @param {React.ReactNode} footer - Optional sticky footer content (usually buttons)
 */
export default function Drawer({
  open,
  onClose,
  title,
  subtitle,
  width = 500,
  children,
  footer
}) {
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      setClosing(false);
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [open]);

  // Handle escape key
  useEffect(() => {
    if (!open) return;
    const handleEsc = (e) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [open]);

  const handleClose = () => {
    setClosing(true);
    setTimeout(() => {
      onClose();
      setClosing(false);
    }, 250); // wait for exit animation
  };

  if (!open && !closing) return null;

  return createPortal(
    <div
      className={`drawer-overlay ${closing ? 'closing' : ''}`}
    >
      <div 
        className="drawer-container"
        style={{ '--drawer-width': typeof width === 'number' ? `${width}px` : width }}
      >
        <div className="drawer-header">
          <div>
            <h2 className="drawer-title">{title}</h2>
            {subtitle && <p className="drawer-subtitle">{subtitle}</p>}
          </div>
          <button className="drawer-close" onClick={handleClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>
        
        <div className="drawer-body">
          {children}
        </div>

        {footer && (
          <div className="drawer-footer">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
