import { useState, useEffect } from 'react';
import { Download } from 'lucide-react';
import Button from '../../components/ui/Button';
import DataTable from '../../components/ui/DataTable';
import StatusBadge from '../../components/ui/StatusBadge';
import Input from '../../components/ui/Input';
import usePagination from '../../hooks/usePagination';
import useDebounce from '../../hooks/useDebounce';
import * as usersApi from '../../api/users';
import * as organizationsApi from '../../api/organizations';
import { exportToCSV } from '../../utils/export';

export default function GlobalStudents() {
  const [search, setSearch] = useState('');
  const [organizationId, setOrganizationId] = useState('');
  const [organizations, setOrganizations] = useState([]);
  const debouncedSearch = useDebounce(search, 500);

  useEffect(() => {
    organizationsApi.list({ limit: 1000 }).then((res) => {
      setOrganizations(res.data.items || []);
    }).catch(err => console.error("Failed to load organizations:", err));
  }, []);

  const { items, page, setPage, meta, loading } = usePagination(
    usersApi.list,
    { search: debouncedSearch, userType: 'STUDENT', organizationId }
  );

  const handleExport = () => {
    const data = items.map(u => ({
      'Name': u.fullName,
      'Email': u.email,
      'Mobile': u.mobile || 'N/A',
      'Status': u.status,
      'Organization': u.organizationName || 'N/A',
      'Created': new Date(u.createdAt).toLocaleDateString()
    }));
    exportToCSV(data, 'global_students');
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="page-eyebrow">Directory</span>
          <h1 className="page-title">Global Students</h1>
          <p className="page-subtitle">View all students registered across all organizations.</p>
        </div>
        <div className="page-actions">
          <Button variant="outline" onClick={handleExport} icon={Download}>Export CSV</Button>
        </div>
      </div>

      <div className="card">
        <div className="filters" style={{ display: 'flex', gap: 'var(--sp-3)', flexWrap: 'wrap' }}>
          <Input
            placeholder="Search students..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ maxWidth: 300, flex: 1 }}
          />
          
          <select 
            className="input" 
            style={{ maxWidth: 200 }}
            value={organizationId}
            onChange={(e) => setOrganizationId(e.target.value)}
          >
            <option value="">All Organizations</option>
            {organizations.map(org => (
              <option key={org.id} value={org.id}>{org.name}</option>
            ))}
          </select>
        </div>

        <DataTable
          columns={[
            { 
              key: 'user', 
              header: 'Student',
              render: (r) => (
                <div className="row" style={{ gap: 'var(--sp-3)' }}>
                  <div className="avatar" style={{ background: 'var(--brand-light)', color: 'var(--brand)' }}>
                    {r.fullName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600 }}>{r.fullName}</div>
                    <div className="text-muted" style={{ fontSize: 'var(--fs-xs)' }}>{r.email}</div>
                  </div>
                </div>
              )
            },
            { key: 'mobile', header: 'Mobile', render: r => r.mobile || '—' },
            { key: 'status', header: 'Status', render: r => <StatusBadge status={r.status} /> },
            { key: 'org', header: 'Organization', render: r => r.organizationName || <span className="text-muted">N/A</span> },
            { key: 'createdAt', header: 'Enrolled', render: r => new Date(r.createdAt).toLocaleDateString() }
          ]}
          rows={items}
          loading={loading}
          pagination={{
            page,
            totalPages: meta.totalPages,
            totalItems: meta.totalItems,
            onPageChange: setPage
          }}
          emptyLabel="No students found."
        />
      </div>
    </div>
  );
}
