import { useEffect, useState } from 'react';
import { Receipt, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import * as paymentsApi from '../../api/payments';
import { buildStaticUrl, extractErrorMessages } from '../../api/client';
import DataTable from '../../components/ui/DataTable';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import PageLoader from '../../components/ui/PageLoader';
import Button from '../../components/ui/Button';

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(null);

  const fetchPayments = () => {
    paymentsApi.myPayments().then((res) => setPayments(res.data?.data || [])).finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const handleDownloadInvoice = async (id) => {
    try {
      setGenerating(id);
      const res = await paymentsApi.generateInvoice(id);
      const invoicePath = res.data?.data?.invoicePath || res.data?.invoicePath;
      if (invoicePath) {
        window.open(buildStaticUrl(invoicePath), '_blank');
        fetchPayments();
      } else {
        toast.error('Failed to generate invoice');
      }
    } catch (err) {
      extractErrorMessages(err).forEach((msg) => toast.error(msg));
    } finally {
      setGenerating(null);
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="page-eyebrow">Billing</span>
          <h1 className="page-title">My Payments</h1>
          <p className="page-subtitle">Your course purchase history.</p>
        </div>
      </div>

      {payments.length === 0 ? (
        <EmptyState icon={Receipt} title="No payments yet" description="Your purchase history will appear here." />
      ) : (
        <DataTable
          columns={[
            { key: 'course', header: 'Course / Program', render: (r) => r.course?.title || r.courseId?.title || r.program?.name || r.programId?.name || '—' },
            { key: 'amount', header: 'Amount', render: (r) => `${r.currency || 'USD'} ${r.amount}` },
            { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
            { key: 'createdAt', header: 'Date', render: (r) => (r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '—') },
            { 
              key: 'actions', 
              header: 'Actions', 
              render: (r) => (
                <Button 
                  size="sm" 
                  variant="outline" 
                  loading={generating === (r._id || r.id)}
                  onClick={() => handleDownloadInvoice(r._id || r.id)}
                >
                  <Download size={14} style={{ marginRight: 6 }} /> Invoice
                </Button>
              ) 
            }
          ]}
          rows={payments}
        />
      )}
    </div>
  );
}
