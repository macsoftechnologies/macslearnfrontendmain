import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Ban, Eye } from 'lucide-react';
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

const listFinance = (params) => usersApi.list({ ...params, userType: 'FINANCE' });

export default function FinanceTeam() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const { items, page, setPage, meta, loading, refresh } = usePagination(listFinance, { search: debouncedSearch });

  // The backend now filters by userType so we don't need to filter on the frontend.
  const filteredItems = items;
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ fullName: '', email: '', password: '', mobile: '' });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState([]);
  const [toggleTarget, setToggleTarget] = useState(null);

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setErrors([]);
    setSaving(true);
    try {
      await usersApi.create({ ...form, userType: 'FINANCE' });
      toast.success('Finance team member created');
      setModalOpen(false);
      setForm({ fullName: '', email: '', password: '', mobile: '' });
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
          <h1 className="page-title">Finance Team</h1>
          <p className="page-subtitle">Users who have access to the Finance dashboard and reports.</p>
        </div>
        <Button icon={Plus} onClick={() => setModalOpen(true)}>Add Finance User</Button>
      </div>

      <div className="row" style={{ marginBottom: 'var(--sp-4)' }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search finance team…" />
      </div>

      <DataTable
        loading={loading}
        emptyLabel="No finance team members yet."
        columns={[
          { key: 'fullName', header: 'Full Name' },
          { key: 'email', header: 'Email' },
          { key: 'mobile', header: 'Mobile', render: (r) => r.mobile || '—' },
          { key: 'userType', header: 'Role', render: (r) => (
            <span style={{ fontSize: 'var(--fs-xs)', fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: 'var(--color-sky-100)', color: 'var(--color-sky-700)' }}>
              Finance
            </span>
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Finance User" width={440}>
        <form className="stack" id="finance-form" onSubmit={submit}>
          {errors.length > 0 && <div className="auth-error-box"><ul>{errors.map((m, i) => <li key={i}>{m}</li>)}</ul></div>}
          <Field label="Full Name" required><Input value={form.fullName} onChange={update('fullName')} required /></Field>
          <Field label="Email" required><Input type="email" value={form.email} onChange={update('email')} required /></Field>
          <Field label="Mobile"><Input type="tel" value={form.mobile} onChange={update('mobile')} /></Field>
          <Field label="Temporary Password" required><Input type="password" value={form.password} onChange={update('password')} required /></Field>
        </form>
        <div className="modal-panel__foot" style={{ margin: '16px -24px -24px', padding: '16px 24px' }}>
          <Button variant="outline" type="button" onClick={() => setModalOpen(false)}>Cancel</Button>
          <Button type="submit" form="finance-form" loading={saving}>Create User</Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!toggleTarget}
        onClose={() => setToggleTarget(null)}
        onConfirm={doToggle}
        title={toggleTarget?.status === 'INACTIVE' ? 'Activate this user?' : 'Deactivate this user?'}
        description={`${toggleTarget?.fullName} will ${toggleTarget?.status === 'INACTIVE' ? 'regain' : 'lose'} access to the finance portal.`}
        confirmLabel={toggleTarget?.status === 'INACTIVE' ? 'Activate' : 'Deactivate'}
        danger={toggleTarget?.status !== 'INACTIVE'}
      />
    </div>
  );
}
