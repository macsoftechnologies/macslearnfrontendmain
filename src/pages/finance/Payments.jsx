import usePagination from '../../hooks/usePagination';
import * as paymentsApi from '../../api/payments';
import DataTable from '../../components/ui/DataTable';
import Pagination from '../../components/ui/Pagination';
import StatusBadge from '../../components/ui/StatusBadge';

export default function FinancePayments() {
  const { items, page, setPage, meta, loading } = usePagination(paymentsApi.list, {});

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="page-eyebrow">Finance</span>
          <h1 className="page-title">Payments </h1>
          <p className="page-subtitle">Read-only view of all transactions across your organization.</p>
        </div>
      </div>

      <DataTable
        loading={loading}
        emptyLabel="No payments recorded yet."
        columns={[
          { key: 'student', header: 'Payer', render: (r) => r.studentId?.fullName || r.student?.fullName || r.payerName || '—' },
          { key: 'course', header: 'Course', render: (r) => r.courseId?.title || r.course?.title || '—' },
          { key: 'amount', header: 'Amount', render: (r) => `${r.currency || 'USD'} ${r.amount}` },
          { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
          { key: 'paymentType', header: 'Type', render: (r) => r.paymentType || '—' },
          { key: 'createdAt', header: 'Date', render: (r) => (r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '—') },
        ]}
        rows={items}
      />

      <Pagination currentPage={page} totalPages={meta.totalPages} totalItems={meta.totalItems} onChange={setPage} />
    </div>
  );
}
