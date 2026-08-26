import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import Modal from '../../components/ui/Modal';
import Input, { Field, Textarea, Select } from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import * as organizationsApi from '../../api/organizations';
import * as plansApi from '../../api/subscriptionPlans';
import * as regionsApi from '../../api/regions';
import { extractErrorMessages } from '../../api/client';

const initial = {
  name: '', code: '', contactEmail: '', contactPhone: '', address: '',
  regionId: '', subscriptionPlanId: '',
  paymentStatus: 'PENDING', lastPaymentDate: '', paymentReferenceId: '', receiptUrl: '',
  adminFullName: '', adminEmail: '', adminPassword: '', adminMobile: '',
};

export default function CreateOrganizationModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState(initial);
  const [plans, setPlans] = useState([]);
  const [regions, setRegions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  useEffect(() => {
    if (open) {
      Promise.all([
        plansApi.list(),
        regionsApi.list({ globalOnly: true })
      ]).then(([resPlans, resRegions]) => {
        setPlans(resPlans.data?.data || []);
        setRegions(resRegions.data?.data || []);
      }).catch(() => {});
      setForm(initial);
      setStep(1);
    }
  }, [open]);

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submitStep1 = (e) => {
    e.preventDefault();
    if (!form.subscriptionPlanId) {
      toast.error('Please select a subscription plan');
      return;
    }
    setStep(2);
  };

  const submitFinal = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await organizationsApi.create({
        ...form,
      });
      toast.success('Organization created');
      onCreated();
    } catch (err) {
      extractErrorMessages(err).forEach((m) => toast.error(m));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={step === 1 ? "Create Organization" : "Checkout & Payment"} subtitle={step === 1 ? "Set up a new institution and its first admin." : "Confirm plan details and log the payment."} width={640}>
      
      {step === 1 && (
        <form className="stack" onSubmit={submitStep1} id="create-org-form">

          <div className="form-grid">
            <Field label="Organization Name" required>
              <Input value={form.name} onChange={update('name')} required />
            </Field>
            <Field label="Organization Code" required hint="Unique identifier, e.g. ACME">
              <Input value={form.code} onChange={update('code')} required />
            </Field>
          </div>

          <p className="section-title" style={{ fontSize: 'var(--fs-sm)', marginBottom: 0, marginTop: 4 }}>Contact Info</p>
          <div className="form-grid">
            <Field label="Contact Email">
              <Input type="email" value={form.contactEmail} onChange={update('contactEmail')} />
            </Field>
            <Field label="Contact Phone">
              <Input type="tel" value={form.contactPhone} onChange={update('contactPhone')} />
            </Field>
          </div>
          <Field label="Address">
            <Textarea value={form.address} onChange={update('address')} rows={2} />
          </Field>

          <p className="section-title" style={{ fontSize: 'var(--fs-sm)', marginBottom: 0, marginTop: 4 }}>Subscription & Region</p>
          <div className="form-grid">
            <Field label="Global Region" required>
              <Select value={form.regionId} onChange={update('regionId')} required>
                <option value="">Select a region</option>
                {regions.map(r => <option key={r.id || r._id} value={r.id || r._id}>{r.name}</option>)}
              </Select>
            </Field>
            <Field label="Plan" required>
              <Select value={form.subscriptionPlanId} onChange={update('subscriptionPlanId')} required disabled={!form.regionId}>
                <option value="">Select a plan</option>
                {plans.filter(p => {
                  if (!form.regionId) return false;
                  // Only show plan if it has a price configured for this region
                  if (p.regionalPrices && Array.isArray(p.regionalPrices)) {
                    return p.regionalPrices.some(rp => rp.regionId === form.regionId);
                  }
                  return false;
                }).map((p) => <option key={p.id || p._id} value={p.id || p._id}>{p.name}</option>)}
              </Select>
            </Field>
          </div>
          
          {(() => {
            const selectedPlan = plans.find(p => (p.id || p._id) === form.subscriptionPlanId);
            if (!selectedPlan) return null;
            return (
              <div className="form-grid">
                <Field label="Max Students">
                  <Input type="number" value={selectedPlan.maxUsers ?? 0} disabled />
                </Field>
                <Field label="Max Storage (GB)">
                  <Input type="number" value={selectedPlan.storageGB ?? 0} disabled />
                </Field>
              </div>
            );
          })()}

          <p className="section-title" style={{ fontSize: 'var(--fs-sm)', marginBottom: 0, marginTop: 4 }}>Admin User</p>
          <div className="form-grid">
            <Field label="Admin Full Name" required>
              <Input value={form.adminFullName} onChange={update('adminFullName')} required />
            </Field>
            <Field label="Admin Email" required>
              <Input type="email" value={form.adminEmail} onChange={update('adminEmail')} required />
            </Field>
          </div>
          <div className="form-grid">
            <Field label="Admin Password" required>
              <Input type="password" value={form.adminPassword} onChange={update('adminPassword')} required />
            </Field>
            <Field label="Admin Mobile">
              <Input type="tel" value={form.adminMobile} onChange={update('adminMobile')} />
            </Field>
          </div>
        </form>
      )}

      {step === 2 && (
        <form className="stack" onSubmit={submitFinal} id="create-org-form-step2">
          {(() => {
            const p = plans.find(p => (p.id || p._id) === form.subscriptionPlanId);
            const calculatedExp = p?.durationInDays ? new Date(Date.now() + p.durationInDays * 24 * 60 * 60 * 1000) : null;
            
            // Extract regional price
            let regionalPrice = 0;
            let regionalCurrency = 'USD';
            if (p?.regionalPrices && Array.isArray(p.regionalPrices)) {
              const rp = p.regionalPrices.find(rp => rp.regionId === form.regionId);
              if (rp) {
                regionalPrice = rp.price;
                regionalCurrency = rp.currency;
              }
            }

            return (
              <div style={{ padding: '20px', background: 'var(--c-bg-subtle)', borderRadius: 'var(--r-md)', border: '1px solid var(--c-border)' }}>
                <h4 style={{ margin: '0 0 16px 0', fontSize: 'var(--fs-md)' }}>Order Summary</h4>
                <div className="stack" style={{ gap: '12px', fontSize: '14px' }}>
                  <div className="row" style={{ justifyContent: 'space-between' }}>
                    <span className="text-muted">Selected Plan</span>
                    <strong>{p?.name}</strong>
                  </div>
                  <div className="row" style={{ justifyContent: 'space-between' }}>
                    <span className="text-muted">Max Students</span>
                    <strong>{p?.maxUsers || 'Unlimited'}</strong>
                  </div>
                  <div className="row" style={{ justifyContent: 'space-between' }}>
                    <span className="text-muted">Storage</span>
                    <strong>{p?.storageGB ? `${p?.storageGB} GB` : 'Unlimited'}</strong>
                  </div>
                  <div className="row" style={{ justifyContent: 'space-between' }}>
                    <span className="text-muted">Expiration Date</span>
                    <strong>{calculatedExp ? calculatedExp.toLocaleDateString() : 'Lifetime'}</strong>
                  </div>
                  <hr style={{ margin: '8px 0', borderColor: 'var(--c-border)' }} />
                  <div className="row" style={{ justifyContent: 'space-between', fontSize: '18px', fontWeight: 'bold' }}>
                    <span>Total Due</span>
                    <span>{regionalCurrency} {regionalPrice}</span>
                  </div>
                </div>
              </div>
            );
          })()}

          <p className="section-title" style={{ fontSize: 'var(--fs-sm)', marginBottom: 0, marginTop: 12 }}>Payment Details (Manual)</p>
          <div className="form-grid">
            <Field label="Payment Status / Terms" required>
              <Select value={form.paymentStatus} onChange={update('paymentStatus')} required>
                <option value="PENDING">Pending (Awaiting Payment)</option>
                <option value="PAID">Paid (Upfront)</option>
                <option value="OVERDUE">Overdue / Extension</option>
              </Select>
            </Field>
            <Field label="Date Paid / Date Due" required>
              <Input type="date" value={form.lastPaymentDate} onChange={update('lastPaymentDate')} required />
            </Field>
          </div>
          <Field label="Transaction Reference or Invoice Note">
            <Input value={form.paymentReferenceId} onChange={update('paymentReferenceId')} placeholder="e.g. Wire Transfer ID or 'Net 30 Invoice'" />
          </Field>
        </form>
      )}

      <div className="modal-panel__foot" style={{ margin: '0 -24px -24px', padding: '16px 24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
        {step === 1 ? (
          <>
            <Button variant="outline" onClick={onClose} type="button">Cancel</Button>
            <Button type="submit" form="create-org-form">Continue to Payment</Button>
          </>
        ) : (
          <>
            <Button variant="outline" onClick={() => setStep(1)} type="button">Back</Button>
            <Button type="submit" form="create-org-form-step2" loading={loading}>Confirm & Create</Button>
          </>
        )}
      </div>
    </Modal>
  );
}
