import { useState, useMemo } from 'react';
import { Plus, Eye, Power, Download, CheckCircle, XCircle } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import usePagination from '../../hooks/usePagination';
import useDebounce from '../../hooks/useDebounce';
import * as organizationsApi from '../../api/organizations';
import { extractErrorMessages } from '../../api/client';
import { exportToCSV } from '../../utils/export';
import DataTable from '../../components/ui/DataTable';
import Pagination from '../../components/ui/Pagination';
import SearchBar from '../../components/ui/SearchBar';
import StatusBadge from '../../components/ui/StatusBadge';
import Button from '../../components/ui/Button';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Modal from '../../components/ui/Modal';
import CreateOrganizationModal from './CreateOrganizationModal';
import ApproveOrganizationModal from './ApproveOrganizationModal';

export default function Organizations() {
  const [searchParams] = useSearchParams();
  const filter = searchParams.get('filter');
  
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [toggleTarget, setToggleTarget] = useState(null);
  const [approveTarget, setApproveTarget] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const debouncedSearch = useDebounce(search, 500);
  
  const { items, page, setPage, meta, loading, refresh } = usePagination(
    organizationsApi.list,
    { search: debouncedSearch, filter }
  );

  const toggleStatus = async () => {
    if (!toggleTarget) return;
    const next = toggleTarget.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await organizationsApi.updateStatus(toggleTarget._id || toggleTarget.id, next);
      toast.success(`Organization ${next.toLowerCase()}`);
      setToggleTarget(null);
      refresh();
      window.dispatchEvent(new Event('refresh-sidebar-counts'));
    } catch (err) {
      extractErrorMessages(err).forEach((m) => toast.error(m));
    }
  };

  const rejectOrganization = async (e) => {
    if (e) e.preventDefault();
    if (!rejectTarget) return;
    try {
      await organizationsApi.reject(rejectTarget._id || rejectTarget.id, rejectionReason);
      toast.success('Organization application rejected.');
      setRejectTarget(null);
      setRejectionReason('');
      refresh();
      window.dispatchEvent(new Event('refresh-sidebar-counts'));
    } catch (err) {
      extractErrorMessages(err).forEach(m => toast.error(m));
    }
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="page-eyebrow">Super admin</span>
          <h1 className="page-title">
            {filter === 'pending' ? 'Pending Approvals' : filter === 'expiring' ? 'Expired / Expiring Organizations' : filter === 'rejected' ? 'Rejected Applications' : 'Organizations'}
          </h1>
          <p className="page-subtitle">Every institution running on  LMS.</p>
        </div>
        <div className="page-actions">
          <Button variant="outline" icon={Download} onClick={() => exportToCSV(items, 'Organizations')}>
            Export CSV
          </Button>
          <Button icon={Plus} onClick={() => setModalOpen(true)}>
            Create Organization
          </Button>
        </div>
      </div>

      <div className="row" style={{ marginBottom: 'var(--sp-4)', justifyContent: 'flex-end', alignItems: 'center' }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search organizations…" />
      </div>

      <DataTable
        loading={loading}
        emptyLabel="No organizations found."
        columns={[
          { key: 'name', header: 'Name' },
          { key: 'code', header: 'Code' },
          { key: 'slug', header: 'Slug', render: (r) => r.slug || '—' },
          { key: 'planType', header: 'Plan', render: (r) => r.subscriptionConfig?.planType || '—' },
          { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
          { key: 'maxStudents', header: 'Max Students', render: (r) => r.subscriptionConfig?.maxStudents ?? '—' },
          { key: 'createdAt', header: 'Created', render: (r) => (r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '—') },
          { 
            key: 'endDate', 
            header: 'End Date', 
            render: (r) => {
              const expiresAt = r.subscriptionConfig?.expiresAt;
              if (!expiresAt) return '—';
              const date = new Date(expiresAt);
              const diffDays = Math.ceil((date - new Date()) / (1000 * 60 * 60 * 24));
              
              if (diffDays <= 10) {
                return (
                  <span style={{ 
                    backgroundColor: 'var(--danger-bg)', 
                    color: 'var(--danger)', 
                    padding: '2px 8px', 
                    borderRadius: 'var(--radius-sm)', 
                    fontWeight: 600,
                    fontSize: 'var(--fs-xs)'
                  }}>
                    {date.toLocaleDateString()}
                  </span>
                );
              }
              return date.toLocaleDateString();
            }
          },
          {
            key: 'actions',
            header: 'Actions',
            render: (r) => (
              <div className="row" style={{ gap: 6 }}>
                <Link to={`/super-admin/organizations/${r._id || r.id}`} state={{ org: r }}>
                  <Button size="sm" variant="ghost" icon={Eye}>View</Button>
                </Link>
                {filter === 'pending' && r.status === 'INACTIVE' ? (
                  <>
                    <Button size="sm" variant="primary" icon={CheckCircle} onClick={() => setApproveTarget(r)}>
                      Approve
                    </Button>
                    <Button size="sm" variant="outline" tone="critical" icon={XCircle} onClick={() => setRejectTarget(r)}>
                      Reject
                    </Button>
                  </>
                ) : (
                  <Button size="sm" variant="outline" icon={Power} onClick={() => setToggleTarget(r)}>
                    {r.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                  </Button>
                )}
              </div>
            ),
          },
        ]}
        rows={items}
      />

      <Pagination currentPage={page} totalPages={meta.totalPages} totalItems={meta.totalItems} onChange={setPage} />

      <CreateOrganizationModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={() => {
          setModalOpen(false);
          refresh();
        }}
      />

      <ApproveOrganizationModal
        open={!!approveTarget}
        org={approveTarget}
        onClose={() => setApproveTarget(null)}
        onApproved={() => {
          setApproveTarget(null);
          refresh();
        }}
      />

      <ConfirmDialog
        open={!!toggleTarget}
        onClose={() => setToggleTarget(null)}
        onConfirm={toggleStatus}
        title={`${toggleTarget?.status === 'ACTIVE' ? 'Deactivate' : 'Activate'} Organization?`}
        description={`Are you sure you want to ${toggleTarget?.status === 'ACTIVE' ? 'deactivate' : 'activate'} "${toggleTarget?.name}"?`}
        confirmLabel="Confirm"
      />

      <Modal 
        open={!!rejectTarget} 
        onClose={() => { setRejectTarget(null); setRejectionReason(''); }} 
        title="Reject Organization Application" 
        subtitle={`Are you sure you want to reject the application for "${rejectTarget?.name}"?`}
      >
        <form onSubmit={rejectOrganization} className="stack">
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>
              Rejection Reason (Optional)
            </label>
            <textarea 
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g., Domain is not verified, payment details missing..."
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '6px',
                border: '1px solid var(--c-border)',
                background: 'var(--c-bg)',
                color: 'var(--c-text-primary)',
                minHeight: '80px',
                resize: 'vertical',
                fontFamily: 'inherit',
                fontSize: '14px'
              }}
            />
          </div>
          <div className="row" style={{ justifyContent: 'flex-end', gap: '12px' }}>
            <Button type="button" variant="outline" onClick={() => { setRejectTarget(null); setRejectionReason(''); }}>Cancel</Button>
            <Button type="submit" variant="danger">Reject Application</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
