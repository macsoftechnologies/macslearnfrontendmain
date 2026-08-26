import { useEffect, useState } from 'react';
import * as reportsApi from '../../api/reports';
import DataTable from '../../components/ui/DataTable';
import PageLoader from '../../components/ui/PageLoader';
import ReportTabs from './ReportTabs';

export default function StudentActivity() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    reportsApi.studentActivity().then((res) => setRows(res.data?.data || [])).finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoader />;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="page-eyebrow">Analytics</span>
          <h1 className="page-title">Student Activity</h1>
          <p className="page-subtitle">Engagement and progress by student.</p>
        </div>
      </div>

      <ReportTabs />

      <DataTable
        emptyLabel="No student activity recorded yet."
        columns={[
          { key: 'fullName', header: 'Student', render: (r) => r.student?.fullName || r.fullName },
          { key: 'coursesEnrolled', header: 'Courses Enrolled', render: (r) => r.coursesEnrolled ?? 0 },
          { key: 'lessonsCompleted', header: 'Lessons Completed', render: (r) => r.lessonsCompleted ?? 0 },
          { key: 'lastActive', header: 'Last Active', render: (r) => (r.lastActive ? new Date(r.lastActive).toLocaleDateString() : '—') },
        ]}
        rows={rows}
      />
    </div>
  );
}
