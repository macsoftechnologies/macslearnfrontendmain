import Modal from './Modal';
import Button from './Button';
import { AlertTriangle } from 'lucide-react';
import './ConfirmDialog.css';

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  description,
  confirmLabel = 'Confirm',
  danger = true,
  loading = false,
}) {
  return (
    <Modal open={open} onClose={onClose} title="" width={420}>
      <div className="confirm-dialog">
        <div className={`confirm-dialog__icon ${danger ? 'confirm-dialog__icon--danger' : ''}`}>
          <AlertTriangle size={20} />
        </div>
        <h3>{title}</h3>
        {description && <p>{description}</p>}
        <div className="confirm-dialog__actions">
          <Button variant="outline" onClick={onClose} full>
            Cancel
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} loading={loading} full>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
