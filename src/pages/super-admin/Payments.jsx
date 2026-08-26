import { useState, useEffect } from 'react';
import { Download } from 'lucide-react';
import Button from '../../components/ui/Button';
import DataTable from '../../components/ui/DataTable';
import StatusBadge from '../../components/ui/StatusBadge';
import Input from '../../components/ui/Input';
import usePagination from '../../hooks/usePagination';
import useDebounce from '../../hooks/useDebounce';
import * as transactionsApi from '../../api/transactions';
import { exportToCSV } from '../../utils/export';

export default function GlobalPayments() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 500);

  const { items, page, setPage, meta, loading } = usePagination(
    transactionsApi.list,
    { search: debouncedSearch }
  );

  const handleExport = () => {
    const data = items.map(tx => {
      return {
        'Transaction ID': tx.id,
        'Payment Reference': tx.referenceId || 'N/A',
        'Organization': tx.organization?.name || 'Unknown',
        'Plan': tx.planName || 'N/A',
        'Amount': `${tx.currency || 'USD'} ${tx.amount}`,
        'Status': tx.status,
        'Date': new Date(tx.createdAt).toLocaleString()
      };
    });
    exportToCSV(data, 'organization_transactions');
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="page-eyebrow">Finance</span>
          <h1 className="page-title">Global Payments</h1>
          <p className="page-subtitle">Track SaaS subscription payments across all organizations.</p>
        </div>
        <div className="page-actions">
          <Button variant="outline" onClick={handleExport} icon={Download}>Export CSV</Button>
        </div>
      </div>

      <div className="card">
        <div className="filters">
          <Input
            placeholder="Search organizations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ maxWidth: 300 }}
          />
        </div>

        <DataTable
          columns={[
            { key: 'ref', header: 'Reference ID', render: r => <span style={{ fontFamily: 'monospace' }}>{r.referenceId || 'N/A'}</span> },
            { key: 'org', header: 'Organization', render: r => <strong>{r.organization?.name || 'Unknown'}</strong> },
            { key: 'plan', header: 'Plan', render: r => r.planName || '—' },
            { key: 'amount', header: 'Amount', render: r => <strong>{r.currency} {r.amount}</strong> },
            { key: 'status', header: 'Status', render: r => <StatusBadge status={r.status} /> },
            { key: 'date', header: 'Date', render: r => new Date(r.createdAt).toLocaleString() }
          ]}
          rows={items}
          loading={loading}
          pagination={{
            page,
            totalPages: meta.totalPages,
            totalItems: meta.totalItems,
            onPageChange: setPage
          }}
          emptyLabel="No organization subscription payments found."
        />
      </div>
    </div>
  );
}
