import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, Users, ClipboardCheck, FileCheck2, Calendar, AlertTriangle } from 'lucide-react';
import { StatCard } from '../../components/ui/Card';
import DataTable from '../../components/ui/DataTable';
import StatusBadge from '../../components/ui/StatusBadge';
import PageLoader from '../../components/ui/PageLoader';
import * as facultyApi from '../../api/faculty';
import * as enrollmentsApi from '../../api/enrollments';

export default function FacultyDashboard() {
  const [stats, setStats] = useState(null);
  const [nearingExpiryCount, setNearingExpiryCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      const [statsRes, enrollRes] = await Promise.allSettled([
        facultyApi.getDashboardStats(),
        enrollmentsApi.list({ limit: 500 }),
      ]);
      if (statsRes.status === 'fulfilled') {
        setStats(statsRes.value.data?.data || statsRes.value.data);
      }
      if (enrollRes.status === 'fulfilled') {
        const list = enrollRes.value.data?.data || enrollRes.value.data || [];
        const now = new Date();
        const nearing = list.filter(e => {
          if (!e.programId || e.courseId) return false;
          const expRaw = e.expectedGraduationDate || e.batch?.endDate || e.expiresAt;
          if (!expRaw) return false;
          const days = Math.ceil((new Date(expRaw).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          return days >= 0 && days <= 10;
        });
        setNearingExpiryCount(nearing.length);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Auto-sync when switching back to faculty dashboard
    const handleFocus = () => {
      fetchData();
    };
    window.addEventListener('focus', handleFocus);

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);

    return () => {
      window.removeEventListener('focus', handleFocus);
      clearInterval(interval);
    };
  }, []);

  if (loading) return <PageLoader />;

  const {
    courses = [],
    totalStudents = 0,
    pendingGrading = 0,
    publishedCourses = 0,
    upcomingDeadlines = []
  } = stats || {};

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="page-eyebrow">Overview</span>
          <h1 className="page-title">Faculty Dashboard</h1>
          <p className="page-subtitle">Your courses and students at a glance.</p>
        </div>
      </div>

      <div className="grid-stats">
        <StatCard label="My Courses" value={courses.length} icon={BookOpen} tone="ink" onClick={() => navigate('/faculty/courses')} style={{ cursor: 'pointer' }} />
        <StatCard label="Total Students" value={totalStudents} icon={Users} tone="sky" />
        <StatCard label="Pending Grading" value={pendingGrading} icon={ClipboardCheck} tone="amber" onClick={() => navigate('/faculty/grading-queue')} style={{ cursor: 'pointer' }} />
        <StatCard label="Nearing Expiry (≤10d)" value={nearingExpiryCount} icon={AlertTriangle} tone={nearingExpiryCount > 0 ? "crimson" : "sage"} onClick={() => navigate('/faculty/program-expiry')} style={{ cursor: 'pointer' }} />
        <StatCard label="Published Courses" value={publishedCourses} icon={FileCheck2} tone="sage" />
      </div>

      <div className="row" style={{ gap: 'var(--sp-6)', alignItems: 'flex-start' }}>
        <div style={{ flex: 2 }}>
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 'var(--sp-4)' }}>
            <h2 className="section-title" style={{ margin: 0 }}>My Courses</h2>
            <Link to="/faculty/courses" className="text-muted" style={{ fontSize: 'var(--fs-xs)', fontWeight: 600 }}>View all →</Link>
          </div>
          <DataTable
            columns={[
              { key: 'title', header: 'Title', render: (r) => <Link to={`/faculty/courses/${r._id || r.id}`} style={{ fontWeight: 600 }}>{r.title}</Link> },
              { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
              { key: 'enrolledCount', header: 'Students', render: (r) => r.enrolledCount ?? 0 },
            ]}
            rows={courses}
            emptyLabel="You haven't been assigned any courses yet."
          />
        </div>

        <div style={{ flex: 1 }}>
           <h2 className="section-title" style={{ marginBottom: 'var(--sp-4)' }}>Upcoming Deadlines</h2>
           {upcomingDeadlines.length > 0 ? (
             <div className="card" style={{ padding: 0 }}>
               {upcomingDeadlines.map((deadline, idx) => (
                 <div key={idx} style={{ padding: 'var(--sp-4)', borderBottom: idx < upcomingDeadlines.length - 1 ? '1px solid var(--border)' : 'none' }}>
                   <div className="row" style={{ alignItems: 'flex-start', gap: 'var(--sp-3)' }}>
                     <Calendar size={18} className="text-muted" style={{ marginTop: 2 }} />
                     <div>
                       <div style={{ fontWeight: 500 }}>{deadline.title}</div>
                       <div className="text-muted" style={{ fontSize: 'var(--fs-xs)' }}>
                         Due: {new Date(deadline.dueDate).toLocaleDateString()}
                       </div>
                     </div>
                   </div>
                 </div>
               ))}
             </div>
           ) : (
             <div className="card text-center text-muted" style={{ padding: 'var(--sp-6)' }}>
               No upcoming deadlines.
             </div>
           )}
        </div>
      </div>
    </div>
  );
}
