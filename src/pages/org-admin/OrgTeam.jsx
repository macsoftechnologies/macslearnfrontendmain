import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Ban, Eye, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import usePagination from '../../hooks/usePagination';
import useDebounce from '../../hooks/useDebounce';
import * as usersApi from '../../api/users';
import { extractErrorMessages } from '../../api/client';
import DataTable from '../../components/ui/DataTable';
import Pagination from '../../components/ui/Pagination';
import SearchBar from '../../components/ui/SearchBar';
import StatusBadge from '../../components/ui/StatusBadge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input, { Field } from '../../components/ui/Input';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

const listOrgUsers = (params) => usersApi.list({ ...params, userType: 'ORG_USER,FINANCE' });

export default function OrgTeam() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const { items, page, setPage, meta, loading, refresh } = usePagination(listOrgUsers, { search: debouncedSearch });

  const filteredItems = items;
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ fullName: '', email: '', password: '', mobile: '', role: 'ORG_USER', manageContent: false, manageUsers: false });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState([]);
  const [toggleTarget, setToggleTarget] = useState(null);

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setErrors([]);
    setSaving(true);
    try {
      const modulePermissions = [];
      if (form.manageContent) modulePermissions.push('MANAGE_CONTENT');
      if (form.manageUsers) modulePermissions.push('MANAGE_USERS');
      if (modulePermissions.length === 0) modulePermissions.push('VIEW_ONLY');

      await usersApi.create({ 
        fullName: form.fullName,
        email: form.email,
        password: form.password,
        mobile: form.mobile,
        userType: form.role,
        modulePermissions: form.role === 'FINANCE' ? ['VIEW_ONLY'] : modulePermissions
      });
      toast.success('Team member created');
      setModalOpen(false);
      setForm({ fullName: '', email: '', password: '', mobile: '', role: 'ORG_USER', manageContent: false, manageUsers: false });
      refresh();
    } catch (err) {
      setErrors(extractErrorMessages(err));
    } finally {
      setSaving(false);
    }
  };

  const doToggle = async () => {
    try {
      await usersApi.updateStatus(toggleTarget._id || toggleTarget.id, toggleTarget.status === 'INACTIVE' ? 'ACTIVE' : 'INACTIVE');
      toast.success('Status updated');
      setToggleTarget(null);
      refresh();
    } catch (err) {
      extractErrorMessages(err).forEach((m) => toast.error(m));
    }
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="page-eyebrow">People</span>
          <h1 className="page-title">Admins & Team</h1>
          <p className="page-subtitle">Manage sub-admins, content managers, and finance staff.</p>
        </div>
        <Button icon={Plus} onClick={() => setModalOpen(true)}>Add Team Member</Button>
      </div>

      <div className="row" style={{ marginBottom: 'var(--sp-4)' }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search team members…" />
      </div>

      <DataTable
        loading={loading}
        emptyLabel="No team members yet."
        columns={[
          { key: 'fullName', header: 'Full Name' },
          { key: 'email', header: 'Email' },
          { key: 'role', header: 'Role', render: (r) => (
            <span style={{ fontSize: '10px', padding: '2px 6px', background: 'var(--color-surface)', border: '1px solid var(--border-subtle)', borderRadius: '4px', fontWeight: 600 }}>
              {r.userType === 'FINANCE' ? 'FINANCE' : 'ADMIN'}
            </span>
          )},
          { key: 'permissions', header: 'Access', render: (r) => (
            <div className="row" style={{ gap: '4px', flexWrap: 'wrap' }}>
              {r.userType === 'FINANCE' ? (
                <span style={{ fontSize: '10px', padding: '2px 6px', background: 'var(--color-surface)', border: '1px solid var(--border-subtle)', borderRadius: '4px' }}>
                  FINANCE DASHBOARD
                </span>
              ) : (
                <>
                  {(r.modulePermissions || []).map(p => (
                    <span key={p} style={{ fontSize: '10px', padding: '2px 6px', background: 'var(--color-surface)', border: '1px solid var(--border-subtle)', borderRadius: '4px' }}>
                      {p.replace('MANAGE_', '')}
                    </span>
                  ))}
                  {(!r.modulePermissions || r.modulePermissions.length === 0) && (
                    <span style={{ fontSize: '10px', padding: '2px 6px', background: 'var(--color-primary-100)', color: 'var(--color-primary-700)', borderRadius: '4px' }}>
                      ALL ACCESS
                    </span>
                  )}
                </>
              )}
            </div>
          )},
          { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status || 'ACTIVE'} /> },
          {
            key: 'actions', header: 'Actions', render: (r) => (
              <div className="row" style={{ gap: 6 }}>
                <Button size="sm" variant="outline" icon={Ban} onClick={() => setToggleTarget(r)}>
                  {r.status === 'INACTIVE' ? 'Activate' : 'Deactivate'}
                </Button>
              </div>
            ),
          },
        ]}
        rows={filteredItems}
      />

      <Pagination currentPage={page} totalPages={meta.totalPages} totalItems={meta.totalItems} onChange={setPage} />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Team Member" width={440}>
        <form className="stack" id="team-form" onSubmit={submit}>
          {errors.length > 0 && <div className="auth-error-box"><ul>{errors.map((m, i) => <li key={i}>{m}</li>)}</ul></div>}
          <Field label="Full Name" required><Input value={form.fullName} onChange={update('fullName')} required /></Field>
          <Field label="Email" required><Input type="email" value={form.email} onChange={update('email')} required /></Field>
          <Field label="Mobile"><Input type="tel" value={form.mobile} onChange={update('mobile')} /></Field>
          <Field label="Temporary Password" required><Input type="password" value={form.password} onChange={update('password')} required /></Field>
          
          <Field label="System Role" required>
            <select className="input" value={form.role} onChange={update('role')}>
              <option value="ORG_USER">Administrator</option>
              <option value="FINANCE">Finance Team</option>
            </select>
          </Field>
          
          {form.role === 'ORG_USER' && (
            <div style={{ marginTop: '16px', padding: '16px', background: 'var(--color-surface)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: 'var(--fs-sm)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ShieldCheck size={16} className="text-primary" /> Admin Permissions
              </h4>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: 'var(--fs-sm)' }}>
                <input type="checkbox" checked={form.manageContent} onChange={update('manageContent')} />
                <span>Content Management (Approve Courses, Edit Content)</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: 'var(--fs-sm)' }}>
                <input type="checkbox" checked={form.manageUsers} onChange={update('manageUsers')} />
                <span>User Management (Manage Students/Faculty)</span>
              </label>
            </div>
          )}
          {form.role === 'FINANCE' && (
            <div style={{ marginTop: '16px', padding: '16px', background: 'var(--color-surface)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
               <h4 style={{ margin: '0 0 8px 0', fontSize: 'var(--fs-sm)' }}>Finance Access</h4>
               <p style={{ margin: 0, fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>This user will only have access to the Finance dashboard, payments, and financial reports.</p>
            </div>
          )}
        </form>
        <div className="modal-panel__foot" style={{ margin: '16px -24px -24px', padding: '16px 24px' }}>
          <Button variant="outline" type="button" onClick={() => setModalOpen(false)}>Cancel</Button>
          <Button type="submit" form="team-form" loading={saving}>Create User</Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!toggleTarget}
        onClose={() => setToggleTarget(null)}
        onConfirm={doToggle}
        title={toggleTarget?.status === 'INACTIVE' ? 'Activate this user?' : 'Deactivate this user?'}
        description={`${toggleTarget?.fullName} will ${toggleTarget?.status === 'INACTIVE' ? 'regain' : 'lose'} access.`}
        confirmLabel={toggleTarget?.status === 'INACTIVE' ? 'Activate' : 'Deactivate'}
        danger={toggleTarget?.status !== 'INACTIVE'}
      />
    </div>
  );
}
