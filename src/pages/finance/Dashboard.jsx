import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Wallet, ClipboardList, BookOpen, Clock, Activity, TrendingUp } from 'lucide-react';
import { StatCard } from '../../components/ui/Card';
import DataTable from '../../components/ui/DataTable';
import StatusBadge from '../../components/ui/StatusBadge';
import Button from '../../components/ui/Button';
import PageLoader from '../../components/ui/PageLoader';
import * as reportsApi from '../../api/reports';
import * as paymentsApi from '../../api/payments';

export default function FinanceDashboard() {
  const [stats, setStats] = useState(null);
  const [recentPayments, setRecentPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const results = await Promise.allSettled([
          reportsApi.overview(),
          paymentsApi.list({ page: 1, limit: 10 }),
        ]);
        if (results[0].status === 'fulfilled') setStats(results[0].value.data?.data || {});
        if (results[1].status === 'fulfilled') setRecentPayments(results[1].value.data?.data || []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <PageLoader />;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="page-eyebrow">Overview</span>
          <h1 className="page-title">Finance Dashboard</h1>
          <p className="page-subtitle">Real-time financial metrics and recent transactions.</p>
        </div>
        <div className="row">
          <Link to="/finance/reports/overview">
            <Button icon={TrendingUp} variant="outline" size="sm">View Detailed Reports</Button>
          </Link>
        </div>
      </div>

      <div className="grid-stats">
        <StatCard label="Total Revenue" value={stats?.revenue != null ? `$${stats.revenue}` : '—'} icon={Wallet} tone="emerald" />
        <StatCard label="Active Courses" value={stats?.activeCourses ?? '—'} icon={BookOpen} tone="sky" />
        <StatCard label="Total Enrollments" value={stats?.totalEnrollments ?? '—'} icon={ClipboardList} tone="ink" />
        <StatCard label="Total Students" value={stats?.totalStudents ?? '—'} icon={Activity} tone="amber" />
      </div>

      <div className="stack" style={{ gap: 'var(--sp-8)' }}>
        <section>
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 'var(--sp-4)' }}>
            <h2 className="section-title" style={{ margin: 0 }}>Recent Transactions</h2>
            <Link to="/finance/payments" className="text-muted" style={{ fontSize: 'var(--fs-xs)', fontWeight: 600 }}>View all payments →</Link>
          </div>
          <DataTable
            columns={[
              { key: 'student', header: 'Payer', render: (r) => r.studentId?.fullName || r.student?.fullName || r.payerName || '—' },
              { key: 'course', header: 'Course', render: (r) => r.courseId?.title || r.course?.title || '—' },
              { key: 'amount', header: 'Amount', render: (r) => `${r.currency || 'USD'} ${r.amount}` },
              { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
              { key: 'date', header: 'Date', render: (r) => (r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '—') },
            ]}
            rows={recentPayments}
            emptyLabel="No recent transactions found."
          />
        </section>
      </div>
    </div>
  );
}
