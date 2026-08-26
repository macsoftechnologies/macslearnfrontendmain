import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, GraduationCap, BookOpen, CheckCircle2, Copy } from 'lucide-react';
import { StatCard } from '../../components/ui/Card';
import DataTable from '../../components/ui/DataTable';
import StatusBadge from '../../components/ui/StatusBadge';
import PageLoader from '../../components/ui/PageLoader';

import * as organizationsApi from '../../api/organizations';
import * as plansApi from '../../api/subscriptionPlans';
import * as reportsApi from '../../api/reports';
import * as notificationsApi from '../../api/notifications';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input, { Field, Textarea } from '../../components/ui/Input';
import toast from 'react-hot-toast';

export default function SuperAdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [orgs, setOrgs] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [broadcastModalOpen, setBroadcastModalOpen] = useState(false);
  const [broadcastForm, setBroadcastForm] = useState({ title: '', message: '' });
  const [sendingBroadcast, setSendingBroadcast] = useState(false);

  const hasAccess = (perms) => {
    if (!user.permissions || user.permissions.length === 0) return true; // Root Admin
    return perms.some(p => user.permissions.includes(p));
  };

  const canSeeOrganizations = hasAccess(['TRACK_ORGANIZATIONS']);

  useEffect(() => {
    (async () => {
      const promises = [reportsApi.superAdminOverview()];
      
      if (canSeeOrganizations) {
        promises.push(organizationsApi.list({ page: 1, limit: 5 }));
        promises.push(plansApi.list());
      }

      const results = await Promise.allSettled(promises);
      
      if (results[0].status === 'fulfilled') setStats(results[0].value.data?.data || {});
      
      if (canSeeOrganizations) {
        if (results[1]?.status === 'fulfilled') setOrgs(results[1].value.data?.data || []);
        if (results[2]?.status === 'fulfilled') setPlans(results[2].value.data?.data || []);
      }
      
      setLoading(false);
    })();
  }, [canSeeOrganizations]);

  if (loading) return <PageLoader />;

  const handleBroadcast = async (e) => {
    e.preventDefault();
    setSendingBroadcast(true);
    try {
      const res = await notificationsApi.broadcast(broadcastForm);
      toast.success(`Broadcast sent successfully to ${res.data?.count || 0} users!`);
      setBroadcastModalOpen(false);
      setBroadcastForm({ title: '', message: '' });
    } catch (err) {
      toast.error('Failed to send broadcast');
    } finally {
      setSendingBroadcast(false);
    }
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="page-eyebrow">Overview</span>
          <h1 className="page-title">Platform Dashboard</h1>
          <p className="page-subtitle">A bird's-eye view of every organization on LMS.</p>
        </div>
        <div className="page-actions">
          <Button onClick={() => setBroadcastModalOpen(true)}>Send Global Broadcast</Button>
        </div>
      </div>

      <div className="grid-stats">
        <StatCard label="Total Organizations" value={stats?.totalOrganizations || 0} icon={Building2} tone="ink" />
        {stats?.revenueByCurrency && Object.keys(stats.revenueByCurrency).length > 0 ? (
          Object.entries(stats.revenueByCurrency).map(([currency, amount]) => (
            <StatCard key={currency} label={`Total Revenue (${currency})`} value={`${currency} ${amount.toLocaleString()}`} icon={CheckCircle2} tone="sage" />
          ))
        ) : (
          <StatCard label="Total SaaS Revenue" value={`${(stats?.totalRevenue || 0).toLocaleString()}`} icon={CheckCircle2} tone="sage" />
        )}
      </div>

      <div style={{ padding: '16px', background: 'var(--c-bg-subtle)', borderRadius: '8px', border: '1px solid var(--c-border)', marginBottom: 'var(--sp-6)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <strong style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>Public Registration Link</strong>
          <span className="text-muted" style={{ fontSize: '13px', fontFamily: 'var(--font-mono)' }}>{window.location.origin}/macslearnfrontend/register-organization</span>
        </div>
        <Button size="sm" variant="outline" icon={Copy} onClick={() => {
          navigator.clipboard.writeText(`${window.location.origin}/macslearnfrontend/register-organization`);
          toast.success('Registration link copied!');
        }}>Copy Link</Button>
      </div>

      {canSeeOrganizations && (
        <div className="stack" style={{ gap: 'var(--sp-8)' }}>
          <section>
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: 'var(--sp-4)' }}>
              <h2 className="section-title" style={{ margin: 0 }}>Recent Organizations</h2>
              <Link to="/super-admin/organizations" className="text-muted" style={{ fontSize: 'var(--fs-xs)', fontWeight: 600 }}>
                View all →
              </Link>
            </div>
            <DataTable
              columns={[
                { key: 'name', header: 'Name' },
                { key: 'code', header: 'Code' },
                { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
                { key: 'createdAt', header: 'Created', render: (r) => r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '—' },
              ]}
              rows={orgs}
              emptyLabel="No organizations yet."
            />
          </section>

          <section>
            <h2 className="section-title">Subscription Plans</h2>
            <div className="grid-stats" style={{ marginBottom: 0 }}>
              {plans.length === 0 && <p className="text-muted">No plans configured yet.</p>}
              {plans.map((p) => (
                <div key={p._id || p.id} className="card" style={{ padding: 'var(--sp-4)' }}>
                  <div className="row" style={{ justifyContent: 'space-between' }}>
                    <strong>{p.name}</strong>
                    <StatusBadge status={p.isActive ? 'ACTIVE' : 'INACTIVE'} />
                  </div>
                  <p className="text-muted" style={{ fontSize: 'var(--fs-sm)', marginTop: 6 }}>
                    {p.currency || p.regionalPrices?.[0]?.currency || 'USD'} {p.price ?? p.regionalPrices?.[0]?.price ?? 0} / {p.billingCycle || `${p.durationInDays || 30} Days`}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      <Modal open={broadcastModalOpen} onClose={() => setBroadcastModalOpen(false)} title="Send Global Broadcast" subtitle="This will send an in-app notification to ALL active users across ALL organizations.">
        <form onSubmit={handleBroadcast} className="stack">
          <Field label="Notification Title" required>
            <Input 
              value={broadcastForm.title} 
              onChange={e => setBroadcastForm({ ...broadcastForm, title: e.target.value })} 
              placeholder="e.g. Scheduled System Maintenance" 
              required 
            />
          </Field>
          <Field label="Message" required>
            <Textarea 
              rows={4}
              value={broadcastForm.message} 
              onChange={e => setBroadcastForm({ ...broadcastForm, message: e.target.value })} 
              placeholder="Enter the broadcast message..." 
              required 
            />
          </Field>
          <div className="row" style={{ justifyContent: 'flex-end', marginTop: 'var(--sp-4)' }}>
            <Button type="button" variant="ghost" onClick={() => setBroadcastModalOpen(false)}>Cancel</Button>
            <Button type="submit" loading={sendingBroadcast}>Send Broadcast</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
