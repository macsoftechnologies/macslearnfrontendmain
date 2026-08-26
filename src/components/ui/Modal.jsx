import { Dialog } from '@headlessui/react';
import { X } from 'lucide-react';
import './Modal.css';

export default function Modal({ open, onClose, title, subtitle, children, width = 520, footer, position = 'center' }) {
  const isRight = position === 'right';
  return (
    <Dialog open={open} onClose={() => {}} className="modal-root">
      <div className="modal-backdrop" aria-hidden="true" />
      <div className={`modal-scrollwrap ${isRight ? 'modal-scrollwrap--right' : ''}`}>
        <Dialog.Panel className={`modal-panel ${isRight ? 'modal-panel--right' : ''}`} style={{ maxWidth: width, width: '100%' }}>
          <div className="modal-panel__head">
            <div>
              <Dialog.Title className="modal-panel__title">{title}</Dialog.Title>
              {subtitle && <p className="modal-panel__subtitle">{subtitle}</p>}
            </div>
            <button className="modal-panel__close" onClick={onClose} aria-label="Close">
              <X size={18} />
            </button>
          </div>
          <div className="modal-panel__body">{children}</div>
          {footer && <div className="modal-panel__foot">{footer}</div>}
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
