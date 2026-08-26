import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import Modal from '../../components/ui/Modal';
import Input, { Field, Select } from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import * as organizationsApi from '../../api/organizations';
import { extractErrorMessages } from '../../api/client';

export default function ApproveOrganizationModal({ open, onClose, org, onApproved }) {
  const [form, setForm] = useState({
    paymentStatus: 'PAID',
    lastPaymentDate: '',
    paymentReferenceId: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && org) {
      setForm({
        paymentStatus: 'PAID',
        lastPaymentDate: new Date().toISOString().split('T')[0],
        paymentReferenceId: ''
      });
    }
  }, [open, org]);

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // 1. Extend subscription to set the start/end dates correctly and save payment reference
      await organizationsApi.extendSubscription(org._id || org.id, {
        planId: org.subscriptionConfig?.planId,
        paymentReferenceId: form.paymentReferenceId,
        paymentStatus: form.paymentStatus,
        lastPaymentDate: form.lastPaymentDate
      });
      // 2. Set the organization to ACTIVE
      await organizationsApi.updateStatus(org._id || org.id, 'ACTIVE');
      
      toast.success('Organization approved successfully');
      window.dispatchEvent(new Event('refresh-sidebar-counts'));
      onApproved();
    } catch (err) {
      extractErrorMessages(err).forEach((m) => toast.error(m));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Approve Organization" subtitle={`Confirm registration details for ${org?.name}`} width={540}>
      <form className="stack" onSubmit={submit} id="approve-org-form">
        
        <div style={{ padding: '16px', background: 'var(--c-bg-subtle)', borderRadius: 'var(--r-md)', border: '1px solid var(--c-border)', marginBottom: '16px' }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: 'var(--fs-md)' }}>Selected Plan</h4>
          <div className="row" style={{ justifyContent: 'space-between', fontSize: '14px' }}>
            <span>{org?.subscriptionConfig?.planType || 'Unknown'}</span>
            <strong>{org?.subscriptionConfig?.currency || 'USD'} {org?.subscriptionConfig?.price ?? 0}</strong>
          </div>
        </div>

        <p className="section-title" style={{ fontSize: 'var(--fs-sm)', marginBottom: 0 }}>Payment Details</p>
        <div className="form-grid">
          <Field label="Payment Status" required>
            <Select value={form.paymentStatus} onChange={update('paymentStatus')} required>
              <option value="PAID">Paid (Upfront)</option>
              <option value="NET30">Net 30 / Invoiced</option>
            </Select>
          </Field>
          <Field label="Date Paid / Date Start" required>
            <Input type="date" value={form.lastPaymentDate} onChange={update('lastPaymentDate')} required />
          </Field>
        </div>
        <Field label="Transaction Reference or Invoice ID">
          <Input value={form.paymentReferenceId} onChange={update('paymentReferenceId')} placeholder="e.g. Wire Transfer ID or PO Number" />
        </Field>
      </form>
      <div className="modal-panel__foot" style={{ margin: '16px -24px -24px', padding: '16px 24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
        <Button variant="outline" onClick={onClose} type="button">Cancel</Button>
        <Button type="submit" form="approve-org-form" loading={loading}>Confirm & Approve</Button>
      </div>
    </Modal>
  );
}
