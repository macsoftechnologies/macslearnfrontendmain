import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import * as reportsApi from '../../api/reports';
import DataTable from '../../components/ui/DataTable';
import PageLoader from '../../components/ui/PageLoader';
import ReportTabs from './ReportTabs';

export default function CoursePerformance() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      reportsApi.coursePerformance(),
    ]).then(([perf]) => {
      if (perf.status === 'fulfilled') setRows(perf.value.data?.data?.courses || []);
      setLoading(false);
    });
  }, []);

  if (loading) return <PageLoader />;

  const chartData = rows.slice(0, 8).map((r) => ({ name: r.title?.slice(0, 14) || 'Course', enrolled: r.enrolledCount || 0 }));

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="page-eyebrow">Analytics</span>
          <h1 className="page-title">Course Performance</h1>
          <p className="page-subtitle">Enrollment and completion by course.</p>
        </div>
      </div>

      <ReportTabs />

      <div className="card" style={{ padding: 'var(--sp-5)', marginBottom: 'var(--sp-6)' }}>
        <p className="section-title">Top Courses by Enrollment</p>
        {chartData.length === 0 ? (
          <p className="text-muted">No course data available yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="enrolled" fill="var(--color-ink-900)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <DataTable
        emptyLabel="No course performance data available."
        columns={[
          { key: 'title', header: 'Course' },
          { key: 'enrolledCount', header: 'Enrolled', render: (r) => r.enrolledCount ?? 0 },
          { key: 'completionRate', header: 'Completion Rate', render: (r) => `${r.completionRate ?? 0}%` },
          { key: 'avgScore', header: 'Avg. Score', render: (r) => r.avgScore ?? '—' },
        ]}
        rows={rows}
      />
    </div>
  );
}
