import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { GraduationCap, BookOpen, Wallet, TrendingUp } from 'lucide-react';
import * as reportsApi from '../../api/reports';
import { StatCard } from '../../components/ui/Card';
import PageLoader from '../../components/ui/PageLoader';

const COLORS = ['#10192E', '#EFB35C', '#4C7A63', '#3E76A6', '#B4503F'];

export default function FinanceReportsOverview() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    reportsApi.overview().then((res) => setData(res.data?.data || {})).finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoader />;

  const enrollmentTrend = data?.enrollmentTrend || [];
  const statusBreakdown = data?.statusBreakdown || [
    { name: 'Active', value: data?.activeStudents || 0 },
    { name: 'Pending', value: data?.pendingApprovals || 0 },
  ];

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="page-eyebrow">Analytics</span>
          <h1 className="page-title">Financial Reports</h1>
          <p className="page-subtitle">Organization performance and revenue overview.</p>
        </div>
      </div>

      <div className="grid-stats">
        <StatCard label="Total Students" value={data?.totalStudents ?? '—'} icon={GraduationCap} tone="ink" />
        <StatCard label="Total Courses" value={data?.totalCourses ?? '—'} icon={BookOpen} tone="sky" />
        <StatCard label="Revenue" value={data?.revenue != null ? `$${data.revenue}` : '—'} icon={Wallet} tone="emerald" />
        <StatCard label="Completion Rate" value={data?.completionRate != null ? `${data.completionRate}%` : '—'} icon={TrendingUp} tone="sage" />
      </div>

      <div className="form-grid">
        <div className="card" style={{ padding: 'var(--sp-5)' }}>
          <p className="section-title">Enrollment Trend</p>
          {enrollmentTrend.length === 0 ? (
            <p className="text-muted">No trend data available yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={enrollmentTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="var(--color-amber-500)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card" style={{ padding: 'var(--sp-5)' }}>
          <p className="section-title">Student Status</p>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={statusBreakdown} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={3}>
                {statusBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
