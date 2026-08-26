import { useState } from 'react';
import usePagination from '../../hooks/usePagination';
import useDebounce from '../../hooks/useDebounce';
import * as auditApi from '../../api/audit';
import DataTable from '../../components/ui/DataTable';
import Pagination from '../../components/ui/Pagination';
import SearchBar from '../../components/ui/SearchBar';

export default function AuditLogs() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const { items, page, setPage, meta, loading } = usePagination(auditApi.list, { search: debouncedSearch });

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="page-eyebrow">Super admin</span>
          <h1 className="page-title">Audit Logs</h1>
          <p className="page-subtitle">Read-only trail of platform activity.</p>
        </div>
      </div>

      <div className="row" style={{ marginBottom: 'var(--sp-4)' }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search logs…" />
      </div>

      <DataTable
        loading={loading}
        emptyLabel="No audit entries found."
        columns={[
          { key: 'createdAt', header: 'Timestamp', render: (r) => (r.createdAt ? new Date(r.createdAt).toLocaleString() : '—') },
          { key: 'user', header: 'User', render: (r) => r.actorId?.fullName || r.actorId?.email || r.actorId?.id || '—' },
          { key: 'action', header: 'Action' },
          { 
            key: 'resource', 
            header: 'Resource', 
            render: (r) => {
              let metaName;
              try {
                const parsed = typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata;
                metaName = parsed?.name;
              } catch (e) {}
              return r.organizationId?.name || metaName || r.targetId || '—';
            }
          },
          { 
            key: 'details', 
            header: 'Details', 
            render: (r) => {
              let parsedMetadata = r.metadata;
              if (typeof r.metadata === 'string') {
                try {
                  parsedMetadata = JSON.parse(r.metadata);
                } catch (e) {
                  return <span className="text-muted">{r.metadata}</span>;
                }
              }
              if (!parsedMetadata || typeof parsedMetadata !== 'object' || Object.keys(parsedMetadata).length === 0) {
                if (typeof parsedMetadata === 'string') return <span className="text-muted">{parsedMetadata}</span>;
                return <span className="text-muted">—</span>;
              }
              return (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {Object.entries(parsedMetadata).map(([k, v]) => {
                    const displayValue = typeof v === 'object' ? JSON.stringify(v) : String(v);
                    return (
                      <span key={k} style={{ 
                        fontSize: '11px', 
                        background: 'var(--c-bg-subtle)', 
                        border: '1px solid var(--c-border)', 
                        padding: '2px 6px', 
                        borderRadius: '4px',
                        color: 'var(--c-text-muted)'
                      }}>
                        <strong style={{ color: 'var(--c-text)' }}>{k}:</strong> {displayValue}
                      </span>
                    )
                  })}
                </div>
              );
            }
          },
        ]}
        rows={items}
      />

      <Pagination currentPage={page} totalPages={meta.totalPages} totalItems={meta.totalItems} onChange={setPage} />
    </div>
  );
}
