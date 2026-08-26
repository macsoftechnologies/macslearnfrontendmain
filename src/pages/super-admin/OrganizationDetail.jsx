import { useEffect, useState } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { ArrowLeft, Power, Copy, Edit2, Plus, Settings } from 'lucide-react';
import toast from 'react-hot-toast';
import * as organizationsApi from '../../api/organizations';
import * as usersApi from '../../api/users';
import * as subscriptionPlansApi from '../../api/subscriptionPlans';
import { extractErrorMessages } from '../../api/client';
import StatusBadge from '../../components/ui/StatusBadge';
import Button from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import DataTable from '../../components/ui/DataTable';
import PageLoader from '../../components/ui/PageLoader';
import Modal from '../../components/ui/Modal';
import Input, { Field, Select, Textarea } from '../../components/ui/Input';
import FileUploader from '../../components/ui/FileUploader';

export default function OrganizationDetail() {
  const { id } = useParams();
  const location = useLocation();
  const [org, setOrg] = useState(location.state?.org || null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(!location.state?.org);
  const [storage, setStorage] = useState(null);
  const [storageLoading, setStorageLoading] = useState(false);

  // Modals state
  const [editOrgOpen, setEditOrgOpen] = useState(false);
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [extendModalOpen, setExtendModalOpen] = useState(false);
  // adminModalOpen can be false, true (for 'add'), or a user object (for 'edit')

  const fetchUsers = () => {
    usersApi.list({ limit: 200 }).then((res) => {
      const allUsers = res.data?.data || [];
      setUsers(allUsers.filter((u) => u.organizationId === id));
    }).catch(() => { });
  };

  const fetchStorage = () => {
    setStorageLoading(true);
    organizationsApi.getStorage(id)
      .then(res => setStorage(res.data?.data || res.data))
      .catch(() => setStorage({ usedMB: 0, usedGB: 0, usedBytes: 0 }))
      .finally(() => setStorageLoading(false));
  };

  useEffect(() => {
    // Always fetch fresh data in case it was updated elsewhere, even if we have initial state
    organizationsApi.list({ page: 1, limit: 100 }).then((res) => {
      const found = (res.data?.data || []).find((o) => (o._id || o.id) === id);
      if (found) {
        setOrg(found);
      }
      setLoading(false);
    }).catch(() => setLoading(false));

    fetchUsers();
    fetchStorage();
  }, [id]);

  const toggleStatus = async () => {
    const next = org.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await organizationsApi.updateStatus(org._id || org.id, next);
      setOrg((o) => ({ ...o, status: next }));
      toast.success(`Organization ${next.toLowerCase()}`);
    } catch (err) {
      extractErrorMessages(err).forEach((m) => toast.error(m));
    }
  };

  if (loading) return <PageLoader />;
  if (!org) return <div className="page"><p>Organization not found.</p></div>;

  const baseUrl = window.location.origin + '/macslearnfrontend';
  const loginUrl = org.slug ? `${baseUrl}/${org.slug}/login` : '—';
  const registerUrl = org.slug ? `${baseUrl}/${org.slug}/register` : '—';

  const copyToClipboard = (text, label) => {
    if (text === '—') return;
    navigator.clipboard.writeText(text);
    toast.success(`${label} URL copied to clipboard!`);
  };

  return (
    <div className="page">
      <Link to="/super-admin/organizations" className="row text-muted" style={{ marginBottom: 'var(--sp-4)', fontSize: 'var(--fs-xs)', fontWeight: 600 }}>
        <ArrowLeft size={14} /> Back to organizations
      </Link>

      <div className="page-head">
        <div className="row" style={{ gap: 'var(--sp-4)', alignItems: 'center' }}>
          {org.logoUrl && (
            <img 
              src={org.logoUrl} 
              alt={`${org.name} logo`} 
              style={{ width: 64, height: 64, objectFit: 'contain', borderRadius: 'var(--r-md)', background: 'var(--c-bg-subtle)' }} 
            />
          )}
          <div>
            <span className="page-eyebrow">Organization</span>
            <div className="row">
              <h1 className="page-title">{org.name}</h1>
              <StatusBadge status={org.status} />
            </div>
            {org.status === 'REJECTED' && org.rejectionReason && (
              <p className="text-muted" style={{ fontSize: '14px', marginTop: '4px', color: 'var(--c-danger)' }}>
                <strong>Rejection Reason:</strong> {org.rejectionReason}
              </p>
            )}
          </div>
        </div>
        {org.status !== 'REJECTED' && (
          <div className="row" style={{ gap: '12px' }}>
            <Button variant="outline" icon={Settings} onClick={() => setEditOrgOpen(true)}>
              Edit Organization
            </Button>
            <Button variant="outline" icon={Power} onClick={toggleStatus}>
              {org.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
            </Button>
          </div>
        )}
      </div>

      <div className="card" style={{ marginBottom: 'var(--sp-8)', padding: '20px' }}>
        <h3 style={{ margin: '0 0 var(--sp-4) 0', fontSize: 'var(--fs-sm)', color: 'var(--c-text-muted)' }}>Quick Share Links</h3>
        <div className="stack" style={{ gap: 'var(--sp-4)' }}>
          <div className="row" style={{ alignItems: 'center', gap: 'var(--sp-4)' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--c-text-muted)' }}>Student Registration URL</label>
              <div style={{ padding: '8px 12px', background: 'var(--c-bg-subtle)', borderRadius: 'var(--r-md)', fontSize: '13px', fontFamily: 'monospace', color: 'var(--c-text)', wordBreak: 'break-all' }}>
                {registerUrl}
              </div>
            </div>
            <Button variant="outline" size="sm" icon={Copy} onClick={() => copyToClipboard(registerUrl, 'Registration')}>Copy</Button>
          </div>
          <div className="row" style={{ alignItems: 'center', gap: 'var(--sp-4)' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--c-text-muted)' }}>Organization Login URL</label>
              <div style={{ padding: '8px 12px', background: 'var(--c-bg-subtle)', borderRadius: 'var(--r-md)', fontSize: '13px', fontFamily: 'monospace', color: 'var(--c-text)', wordBreak: 'break-all' }}>
                {loginUrl}
              </div>
            </div>
            <Button variant="outline" size="sm" icon={Copy} onClick={() => copyToClipboard(loginUrl, 'Login')}>Copy</Button>
          </div>
        </div>
      </div>

      <div className="form-grid" style={{ marginBottom: 'var(--sp-8)' }}>
        <Card style={{ padding: 'var(--sp-5)' }}>
          <p className="section-title">Organization Info</p>
          <div className="stack" style={{ gap: 8 }}>
            <Row label="Code" value={org.code} />
            <Row label="Slug" value={org.slug || '—'} />
            <Row label="Contact Email" value={org.contactInfo?.email || '—'} />
            <Row label="Contact Phone" value={org.contactInfo?.phone || '—'} />
            <Row label="Address" value={org.contactInfo?.address || '—'} />
          </div>
        </Card>

        {org.status !== 'REJECTED' && (
          <Card style={{ padding: 'var(--sp-5)' }}>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <p className="section-title" style={{ margin: 0 }}>Subscription</p>
              <Button size="sm" variant="outline" onClick={() => setExtendModalOpen(true)}>Renew / Extend Plan</Button>
            </div>
            <div className="stack" style={{ gap: 8 }}>
              <Row label="Plan Type" value={org.subscriptionConfig?.planType || '—'} />
              <Row label="Max Students" value={org.subscriptionConfig?.maxStudents ?? '—'} />
              <Row label="Expires At" value={org.subscriptionConfig?.expiresAt ? new Date(org.subscriptionConfig.expiresAt).toLocaleDateString() : '—'} />
              <div style={{ height: 1, background: 'var(--border-subtle)', margin: '8px 0' }} />
              <Row label="Allocated Storage" value={org.subscriptionConfig?.maxStorageGB ? `${org.subscriptionConfig.maxStorageGB} GB` : '—'} />
              <Row
                label="Used Storage (Vimeo)"
                value={storageLoading ? 'Calculating...' : storage ? `${storage.usedGB} GB (${storage.usedMB} MB)` : '—'}
              />
            </div>
          </Card>
        )}

        {org.status !== 'REJECTED' && (
          <Card style={{ padding: 'var(--sp-5)' }}>
            <p className="section-title">Payment Info</p>
            <div className="stack" style={{ gap: 8 }}>
              <div className="row" style={{ justifyContent: 'space-between', fontSize: 'var(--fs-sm)' }}>
                <span className="text-muted">Status</span>
                <StatusBadge status={org.subscriptionConfig?.paymentStatus || 'PENDING'} />
              </div>
              <Row label="Last Payment" value={org.subscriptionConfig?.lastPaymentDate ? new Date(org.subscriptionConfig.lastPaymentDate).toLocaleDateString() : '—'} />
              <Row label="Transaction ID" value={org.subscriptionConfig?.paymentReferenceId || '—'} />
            </div>
          </Card>
        )}
      </div>

      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-4)' }}>
        <p className="section-title" style={{ margin: 0 }}>Admin Users</p>
        <Button size="sm" icon={Plus} onClick={() => setAdminModalOpen(true)}>Add Admin</Button>
      </div>
      <DataTable
        columns={[
          { key: 'fullName', header: 'Name' },
          { key: 'email', header: 'Email' },
          { key: 'userType', header: 'Role' },
          { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status || 'ACTIVE'} /> },
          {
            key: 'actions', header: 'Actions', render: (r) => (
              <Button size="sm" variant="outline" icon={Edit2} onClick={() => setAdminModalOpen(r)}>
                Edit
              </Button>
            ),
          },
        ]}
        rows={users}
        emptyLabel="No users found for this organization."
      />

      <EditOrganizationModal
        open={editOrgOpen}
        onClose={() => setEditOrgOpen(false)}
        org={org}
        onSaved={(updatedOrg) => setOrg(updatedOrg)}
      />

      <AdminUserModal
        open={!!adminModalOpen}
        onClose={() => setAdminModalOpen(false)}
        user={typeof adminModalOpen === 'object' ? adminModalOpen : null}
        orgId={org._id || org.id}
        onSaved={() => {
          setAdminModalOpen(false);
          fetchUsers();
        }}
      />

      <ExtendSubscriptionModal
        open={extendModalOpen}
        onClose={() => setExtendModalOpen(false)}
        org={org}
        onSaved={(updatedOrg) => setOrg(updatedOrg)}
      />
    </div>
  );
}

function EditOrganizationModal({ open, onClose, org, onSaved }) {
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [plans, setPlans] = useState([]);
  const [regions, setRegions] = useState([]);

  useEffect(() => {
    Promise.all([
      import('../../api/subscriptionPlans').then(m => m.list()),
      import('../../api/regions').then(m => m.list({ globalOnly: true }))
    ]).then(([resPlans, resRegions]) => {
      setPlans(resPlans.data?.data || resPlans.data || []);
      setRegions(resRegions.data?.data || resRegions.data || []);
    }).catch(() => { });
  }, []);

  useEffect(() => {
    if (open && org) {
      setForm({
        name: org.name || '',
        logoUrl: org.logoUrl || '',
        contactInfo: {
          email: org.contactInfo?.email || '',
          phone: org.contactInfo?.phone || '',
          address: org.contactInfo?.address || '',
        },
        subscriptionConfig: {
          planType: org.subscriptionConfig?.planType || '',
          maxStudents: org.subscriptionConfig?.maxStudents ?? 0,
          maxStorageGB: org.subscriptionConfig?.maxStorageGB ?? 0,
        },
        regionId: org.regionId || '',
        paymentStatus: org.subscriptionConfig?.paymentStatus || 'PENDING',
        lastPaymentDate: org.subscriptionConfig?.lastPaymentDate ? new Date(org.subscriptionConfig.lastPaymentDate).toISOString().split('T')[0] : '',
        paymentReferenceId: org.subscriptionConfig?.paymentReferenceId || '',
        receiptUrl: org.subscriptionConfig?.receiptUrl || '',
      });
    }
  }, [open, org]);

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target?.value ?? e }));
  const updateContact = (k) => (e) => setForm((f) => ({ ...f, contactInfo: { ...f.contactInfo, [k]: e.target?.value ?? e } }));

  const handlePlanChange = (e) => {
    const selectedCode = e.target.value;
    const selectedPlan = plans.find(p => p.code === selectedCode);

    setForm(f => ({
      ...f,
      subscriptionConfig: {
        ...f.subscriptionConfig,
        planType: selectedCode,
        maxStudents: selectedPlan ? (selectedPlan.maxUsers ?? 0) : 0,
        maxStorageGB: selectedPlan ? (selectedPlan.storageGB ?? 0) : 0,
      }
    }));
  };

  const updateSub = (k) => (e) => setForm((f) => ({ ...f, subscriptionConfig: { ...f.subscriptionConfig, [k]: e.target?.value ?? e } }));

  const handleRegionChange = (e) => {
    const newRegionId = e.target.value;
    setForm(f => ({
      ...f,
      regionId: newRegionId,
      subscriptionConfig: {
        ...f.subscriptionConfig,
        planType: '',
        maxStudents: 0,
        maxStorageGB: 0
      }
    }));
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        logoUrl: form.logoUrl,
        contactInfo: form.contactInfo,
        subscriptionConfig: {
          ...org.subscriptionConfig,
          planType: form.subscriptionConfig.planType,
          maxStudents: Number(form.subscriptionConfig.maxStudents),
          maxStorageGB: Number(form.subscriptionConfig.maxStorageGB),
        },
        regionId: form.regionId,
        paymentStatus: form.paymentStatus,
        lastPaymentDate: form.lastPaymentDate || null,
        paymentReferenceId: form.paymentReferenceId,
      };
      const res = await organizationsApi.update(org._id || org.id, payload);
      toast.success('Organization updated successfully');
      onSaved(res.data?.data || res.data);
      onClose();
    } catch (err) {
      extractErrorMessages(err).forEach((m) => toast.error(m));
    } finally {
      setSaving(false);
    }
  };

  if (!form) return null;

  return (
    <Modal open={open} onClose={onClose} title="Edit Organization" width={600}>
      <form className="stack" onSubmit={handleSubmit}>
        <div className="form-grid">
          <Field label="Organization Name" required>
            <Input value={form.name} onChange={update('name')} required />
          </Field>
          <Field label="Code"><Input value={org?.code || ''} disabled /></Field>
        </div>
        <Field label="Slug / Domain"><Input value={org?.slug || ''} disabled /></Field>
        
        <div style={{ marginTop: 'var(--sp-4)' }}>
          <Field label="Organization Logo (PNG)">
            <FileUploader 
              accept="image/png,image/jpeg"
              onUpload={(url) => setForm(f => ({ ...f, logoUrl: url }))}
              defaultPreview={form.logoUrl}
            />
          </Field>
        </div>
        
        <div className="form-grid" style={{ marginTop: 'var(--sp-4)' }}>
          <Field label="Contact Email"><Input type="email" value={form.contactInfo.email} onChange={updateContact('email')} /></Field>
          <Field label="Contact Phone"><Input type="tel" value={form.contactInfo.phone} onChange={updateContact('phone')} /></Field>
        </div>
        <Field label="Address"><Textarea rows={2} value={form.contactInfo.address} onChange={updateContact('address')} /></Field>

        <p className="section-title" style={{ fontSize: 'var(--fs-sm)', marginBottom: 0, marginTop: 'var(--sp-4)' }}>Subscription & Region</p>
        <div className="form-grid" style={{ marginTop: 'var(--sp-2)' }}>
          <Field label="Global Region">
            <Select value={form.regionId} onChange={handleRegionChange}>
              <option value="">Select a region</option>
              {regions.map(r => (
                <option key={r.id || r._id} value={r.id || r._id}>{r.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Plan Type">
            <Select value={form.subscriptionConfig.planType} onChange={handlePlanChange} disabled={!form.regionId}>
              <option value="">Select a plan</option>
              {plans.filter(p => {
                if (!form.regionId) return false;
                if (p.regionalPrices && Array.isArray(p.regionalPrices)) {
                  return p.regionalPrices.some(rp => rp.regionId === form.regionId);
                }
                return false;
              }).map(p => (
                <option key={p.id || p._id} value={p.code}>{p.name}</option>
              ))}
              {!plans.some(p => p.code === form.subscriptionConfig.planType) && form.subscriptionConfig.planType && (
                <option value={form.subscriptionConfig.planType}>{form.subscriptionConfig.planType} (Custom)</option>
              )}
            </Select>
          </Field>
          <Field label="Max Students (0 for unlimited)">
            <Input type="number" min="0" value={form.subscriptionConfig.maxStudents} onChange={updateSub('maxStudents')} disabled />
          </Field>
          <Field label="Max Storage (GB)">
            <Input type="number" min="0" value={form.subscriptionConfig.maxStorageGB} onChange={updateSub('maxStorageGB')} disabled />
          </Field>
        </div>


        <p className="section-title" style={{ fontSize: 'var(--fs-sm)', marginBottom: 0, marginTop: 'var(--sp-4)' }}>Payment Details (Manual)</p>
        <div className="form-grid" style={{ marginTop: 'var(--sp-2)' }}>
          <Field label="Payment Status">
            <Select value={form.paymentStatus} onChange={update('paymentStatus')}>
              <option value="PENDING">Pending</option>
              <option value="PAID">Paid</option>
              <option value="OVERDUE">Overdue</option>
            </Select>
          </Field>
          <Field label="Payment Date">
            <Input type="date" value={form.lastPaymentDate} onChange={update('lastPaymentDate')} />
          </Field>
        </div>
        <Field label="Transaction ID / Check Number">
          <Input value={form.paymentReferenceId} onChange={update('paymentReferenceId')} />
        </Field>

        <div className="row" style={{ justifyContent: 'flex-end', marginTop: 'var(--sp-6)' }}>
          <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={saving}>Save Changes</Button>
        </div>
      </form>
    </Modal>
  );
}

function AdminUserModal({ open, onClose, user, orgId, onSaved }) {
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (user) {
        setForm({
          fullName: user.fullName || '',
          email: user.email || '',
          mobile: user.mobile || '',
          password: '',
        });
      } else {
        setForm({ fullName: '', email: '', mobile: '', password: '' });
      }
    }
  }, [open, user]);

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (user) {
        const updateData = { fullName: form.fullName, mobile: form.mobile, email: form.email };
        await usersApi.update(user._id || user.id, updateData);
        toast.success('User updated successfully');
      } else {
        if (!form.password) return toast.error('Password is required for new admins');
        await usersApi.create({ ...form, organizationId: orgId, userType: 'ORG_USER' });
        toast.success('Admin user created successfully');
      }
      onSaved();
    } catch (err) {
      extractErrorMessages(err).forEach((m) => toast.error(m));
    } finally {
      setSaving(false);
    }
  };

  if (!form) return null;

  return (
    <Modal open={open} onClose={onClose} title={user ? "Edit Admin User" : "Add Admin User"} width={480}>
      <form onSubmit={handleSubmit} className="stack">
        <Field label="Full Name" required>
          <Input name="fullName" value={form.fullName} onChange={handleChange} required placeholder="e.g. Jane Doe" />
        </Field>
        <Field label="Email Address" required>
          <Input type="email" name="email" value={form.email} onChange={handleChange} required placeholder="jane@example.com" />
        </Field>
        <Field label="Mobile Number">
          <Input type="tel" name="mobile" value={form.mobile} onChange={handleChange} placeholder="+1234567890" />
        </Field>
        {!user && (
          <Field label="Temporary Password" required>
            <Input type="text" name="password" value={form.password} onChange={handleChange} required placeholder="Min. 8 characters" />
          </Field>
        )}
        <div className="row" style={{ justifyContent: 'flex-end', marginTop: 'var(--sp-6)' }}>
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={saving}>{user ? 'Save Changes' : 'Create Admin'}</Button>
        </div>
      </form>
    </Modal>
  );
}

function ExtendSubscriptionModal({ open, onClose, org, onSaved }) {
  const [paymentRef, setPaymentRef] = useState('');
  const [planId, setPlanId] = useState('');
  const [saving, setSaving] = useState(false);
  const [plans, setPlans] = useState([]);
  const [plansLoading, setPlansLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setPaymentRef('');
      setPlanId(org.subscriptionConfig?.planId || '');
      loadPlans();
    }
  }, [open, org]);

  const loadPlans = async () => {
    setPlansLoading(true);
    try {
      const res = await subscriptionPlansApi.list();
      setPlans(res.data?.data || res.data || []);
    } catch (err) {
      toast.error('Failed to load subscription plans');
    } finally {
      setPlansLoading(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        paymentReferenceId: paymentRef,
        paymentStatus: 'PAID'
      };
      if (planId) payload.planId = planId;

      const res = await organizationsApi.extendSubscription(org.id || org._id, payload);
      toast.success('Subscription extended successfully');
      onSaved(res.data?.data || res.data);
      onClose();
    } catch (err) {
      extractErrorMessages(err).forEach((m) => toast.error(m));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Renew / Extend Subscription" width={400}>
      <form onSubmit={submit} className="stack">
        <p className="text-muted" style={{ fontSize: '14px', marginBottom: '16px' }}>
          Manually extend the subscription for <strong>{org.name}</strong>.
          This will also log a transaction record in the system.
        </p>

        <Field label="Subscription Plan">
          {plansLoading ? (
            <p style={{ fontSize: '13px' }}>Loading plans...</p>
          ) : (
            <Select value={planId} onChange={(e) => setPlanId(e.target.value)}>
              {plans.map(p => (
                <option key={p.id || p._id} value={p.id || p._id}>{p.name || p.code}</option>
              ))}
            </Select>
          )}
        </Field>

        <Field label="Payment Reference ID" required>
          <Input
            value={paymentRef}
            onChange={(e) => setPaymentRef(e.target.value)}
            required
            placeholder="e.g. TXN-123456"
          />
        </Field>
        <div className="row" style={{ justifyContent: 'flex-end', marginTop: 'var(--sp-6)' }}>
          <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={saving}>Extend Plan</Button>
        </div>
      </form>
    </Modal>
  );
}

function Row({ label, value }) {
  return (
    <div className="row" style={{ justifyContent: 'space-between', fontSize: 'var(--fs-sm)' }}>
      <span className="text-muted">{label}</span>
      <span style={{ fontWeight: 500 }}>{value}</span>
    </div>
  );
}
