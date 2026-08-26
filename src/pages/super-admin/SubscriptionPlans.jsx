import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';
import * as plansApi from '../../api/subscriptionPlans';
import * as regionsApi from '../../api/regions';
import { extractErrorMessages } from '../../api/client';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input, { Field, Select } from '../../components/ui/Input';
import Toggle from '../../components/ui/Toggle';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import PageLoader from '../../components/ui/PageLoader';

const emptyForm = { name: '', code: '', durationInDays: 30, maxUsers: '', storageGB: '', isActive: true, regionalPrices: [{ regionId: '', price: '', currency: 'USD' }] };

export default function SubscriptionPlans() {
  const [plans, setPlans] = useState([]);
  const [regions, setRegions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = () => {
    setLoading(true);
    Promise.all([
      plansApi.list(),
      regionsApi.list({ globalOnly: true })
    ]).then(([resPlans, resRegions]) => {
      setPlans(resPlans.data?.data || []);
      setRegions(resRegions.data?.data || []);
    }).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (p) => { setEditing(p); setForm({ ...emptyForm, ...p }); setModalOpen(true); };
  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target?.value ?? e }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    // Validation
    if (!form.regionalPrices || form.regionalPrices.length === 0) {
      toast.error('You must add at least one regional price');
      setSaving(false);
      return;
    }
    
    for (const rp of form.regionalPrices) {
      if (!rp.regionId || !rp.price || !rp.currency) {
        toast.error('Please fill all fields for regional prices');
        setSaving(false);
        return;
      }
    }

    const payload = { 
      ...form, 
      durationInDays: Number(form.durationInDays) || 30, 
      maxUsers: Number(form.maxUsers) || undefined, 
      storageGB: Number(form.storageGB) || undefined,
      regionalPrices: form.regionalPrices.map(rp => ({ ...rp, price: Number(rp.price) }))
    };
    try {
      if (editing) {
        await plansApi.update(editing._id || editing.id, payload);
        toast.success('Plan updated');
      } else {
        await plansApi.create(payload);
        toast.success('Plan created');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      extractErrorMessages(err).forEach((m) => toast.error(m));
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async () => {
    try {
      await plansApi.remove(deleteTarget._id || deleteTarget.id);
      toast.success('Plan deleted');
      setDeleteTarget(null);
      load();
    } catch (err) {
      extractErrorMessages(err).forEach((m) => toast.error(m));
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="page-eyebrow">Super admin</span>
          <h1 className="page-title">Subscription Plans</h1>
          <p className="page-subtitle">Pricing tiers available to organizations.</p>
        </div>
        <Button icon={Plus} onClick={openCreate}>New Plan</Button>
      </div>

      {plans.length === 0 ? (
        <EmptyState icon={CreditCard} title="No plans yet" description="Create your first subscription plan to offer organizations." />
      ) : (
        <div className="grid-stats" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
          {plans.map((p) => (
            <div key={p._id || p.id} className="card" style={{ padding: 'var(--sp-5)' }}>
              <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
                <strong style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-lg)' }}>{p.name}</strong>
                <StatusBadge status={p.isActive ? 'ACTIVE' : 'INACTIVE'} />
              </div>
              <p className="text-muted" style={{ fontSize: 'var(--fs-xs)', fontFamily: 'var(--font-mono)' }}>{p.code}</p>
              <div style={{ marginTop: '12px', fontSize: '13px', fontWeight: 500, color: 'var(--c-text-primary)' }}>
                Duration: {p.durationInDays ? `${p.durationInDays} Days` : 'N/A'}
              </div>
              <div style={{ marginTop: '16px' }}>
                <strong style={{ fontSize: '12px', display: 'block', marginBottom: '8px' }}>Regional Pricing:</strong>
                {p.regionalPrices && p.regionalPrices.length > 0 ? (
                  <div className="stack" style={{ gap: '4px' }}>
                    {p.regionalPrices.map((rp, idx) => (
                      <div key={idx} className="row" style={{ justifyContent: 'space-between', fontSize: '13px', background: 'var(--c-bg-subtle)', padding: '4px 8px', borderRadius: '4px' }}>
                        <span>{regions.find(r => r.id === rp.regionId || r._id === rp.regionId)?.name || 'Unknown'}</span>
                        <strong>{rp.currency || 'USD'} {rp.price}</strong>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-muted" style={{ fontSize: '13px' }}>No regional prices configured</div>
                )}
              </div>
              <div className="row">
                <Button size="sm" variant="outline" icon={Pencil} onClick={() => openEdit(p)}>Edit</Button>
                <Button size="sm" variant="danger" icon={Trash2} onClick={() => setDeleteTarget(p)}>Delete</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Plan' : 'New Plan'} width={480}>
        <form className="stack" id="plan-form" onSubmit={submit}>
          <div className="form-grid">
            <Field label="Plan Name" required><Input value={form.name} onChange={update('name')} required /></Field>
            <Field label="Code" required><Input value={form.code} onChange={update('code')} required /></Field>
          </div>
          <div className="form-grid" style={{ padding: '16px', background: 'var(--c-bg-subtle)', borderRadius: '8px', border: '1px solid var(--c-border)' }}>
            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Regional Pricing</h3>
                <p className="text-muted" style={{ fontSize: '12px' }}>Configure prices for each region.</p>
              </div>
              <Button 
                size="sm" 
                variant="outline" 
                type="button" 
                onClick={() => setForm(f => ({ ...f, regionalPrices: [...(f.regionalPrices || []), { regionId: '', price: '', currency: 'USD' }] }))}
              >
                Add Price
              </Button>
            </div>
            
            {form.regionalPrices?.map((rp, index) => (
              <div key={index} style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr auto', gap: '16px', alignItems: 'flex-end' }}>
                <Field label="Region">
                  <Select 
                    value={rp.regionId} 
                    onChange={e => {
                      const newArr = [...form.regionalPrices];
                      newArr[index].regionId = e.target.value;
                      setForm(f => ({ ...f, regionalPrices: newArr }));
                    }}
                    required
                  >
                    <option value="">Select region</option>
                    {regions.map(r => <option key={r.id || r._id} value={r.id || r._id}>{r.name}</option>)}
                  </Select>
                </Field>
                <Field label="Price">
                  <Input 
                    type="number" 
                    min={0} 
                    value={rp.price} 
                    onChange={e => {
                      const newArr = [...form.regionalPrices];
                      newArr[index].price = e.target.value;
                      setForm(f => ({ ...f, regionalPrices: newArr }));
                    }}
                    required 
                  />
                </Field>
                <Field label="Currency">
                  <Select 
                    value={rp.currency} 
                    onChange={e => {
                      const newArr = [...form.regionalPrices];
                      newArr[index].currency = e.target.value;
                      setForm(f => ({ ...f, regionalPrices: newArr }));
                    }}
                    required 
                  >
                    <option value="USD">USD ($)</option>
                    <option value="INR">INR (₹)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="AUD">AUD (A$)</option>
                    <option value="CAD">CAD (C$)</option>
                  </Select>
                </Field>
                <Button 
                  type="button" 
                  variant="danger" 
                  onClick={() => {
                    const newArr = form.regionalPrices.filter((_, i) => i !== index);
                    setForm(f => ({ ...f, regionalPrices: newArr }));
                  }}
                  style={{ marginBottom: '8px' }}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
          <Field label="Duration (Days)" required>
            <Input type="number" min={1} value={form.durationInDays} onChange={update('durationInDays')} required />
          </Field>
          <div className="form-grid">
            <Field label="Max Users"><Input type="number" value={form.maxUsers} onChange={update('maxUsers')} /></Field>
            <Field label="Storage (GB)"><Input type="number" value={form.storageGB} onChange={update('storageGB')} /></Field>
          </div>
          <Toggle checked={form.isActive} onChange={(v) => update('isActive')(v)} label="Active" />
        </form>
        <div className="modal-panel__foot" style={{ margin: '16px -24px -24px', padding: '16px 24px' }}>
          <Button variant="outline" type="button" onClick={() => setModalOpen(false)}>Cancel</Button>
          <Button type="submit" form="plan-form" loading={saving}>{editing ? 'Save Changes' : 'Create Plan'}</Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={doDelete}
        title="Delete this plan?"
        description={`"${deleteTarget?.name}" will be permanently removed.`}
        confirmLabel="Delete Plan"
      />
    </div>
  );
}
