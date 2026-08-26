import { FileDown } from 'lucide-react';
import toast from 'react-hot-toast';
import usePagination from '../../hooks/usePagination';
import * as paymentsApi from '../../api/payments';
import { buildStaticUrl, extractErrorMessages } from '../../api/client';
import DataTable from '../../components/ui/DataTable';
import Pagination from '../../components/ui/Pagination';
import StatusBadge from '../../components/ui/StatusBadge';
import Button from '../../components/ui/Button';

export default function Payments() {
  const { items, page, setPage, meta, loading } = usePagination(paymentsApi.list, {});

  const downloadInvoice = async (id) => {
    try {
      const res = await paymentsApi.generateInvoice(id);
      const invoicePath = res.data?.data?.invoicePath || res.data?.invoicePath;
      if (invoicePath) {
        window.open(buildStaticUrl(invoicePath), '_blank');
        toast.success('Invoice generated');
      } else {
        toast.error('Failed to generate invoice');
      }
    } catch (err) {
      extractErrorMessages(err).forEach((m) => toast.error(m));
    }
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="page-eyebrow">Finance</span>
          <h1 className="page-title">Payments</h1>
          <p className="page-subtitle">All transactions across your organization.</p>
        </div>
      </div>

      <DataTable
        loading={loading}
        emptyLabel="No payments recorded yet."
        columns={[
          { key: 'student', header: 'Student', render: (r) => r.studentId?.fullName || r.student?.fullName || r.payerName || '—' },
          { key: 'course', header: 'Course', render: (r) => r.courseId?.title || r.course?.title || r.programId?.name || r.program?.name || '—' },
          { key: 'amount', header: 'Amount', render: (r) => `${r.currency || 'USD'} ${r.amount}` },
          { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
          { key: 'paymentType', header: 'Type', render: (r) => r.paymentType || '—' },
          { key: 'createdAt', header: 'Date', render: (r) => (r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '—') },
          {
            key: 'actions', header: 'Invoice', render: (r) => (
              <Button size="sm" variant="ghost" icon={FileDown} onClick={() => downloadInvoice(r._id || r.id)}>Invoice</Button>
            ),
          },
        ]}
        rows={items}
      />

      <Pagination currentPage={page} totalPages={meta.totalPages} totalItems={meta.totalItems} onChange={setPage} />
    </div>
  );
}
