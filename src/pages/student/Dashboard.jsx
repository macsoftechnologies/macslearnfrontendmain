import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Library, Award, TrendingUp, PlayCircle, GraduationCap } from 'lucide-react';
import { StatCard } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import PageLoader from '../../components/ui/PageLoader';
import * as studentsApi from '../../api/students';
import { useAuth } from '../../contexts/AuthContext';
import client, { buildStaticUrl } from '../../api/client';
import './CourseGrid.css';

export default function StudentDashboard() {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState([]);
  const [programEnrollments, setProgramEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = user?.id || user?._id;
    if (!id) return;
    Promise.all([
      studentsApi.getEnrollments(id),
      client.get(`/students/${id}/programs`)
    ]).then(([enrRes, progRes]) => {
      setEnrollments(enrRes.data?.data || []);
      const progs = progRes.data?.data || progRes.data;
      setProgramEnrollments(Array.isArray(progs) ? progs : []);
    }).finally(() => setLoading(false));
  }, [user]);

  if (loading) return <PageLoader />;

  const inProgress = enrollments.filter((e) => (e.progressPercentage ?? 0) < 100);
  const completed = enrollments.filter((e) => (e.progressPercentage ?? 0) >= 100);
  
  // Filter for standalone courses (not tied to a program)
  const standaloneInProgress = inProgress.filter((e) => !e.programId);
  const standaloneCompleted = completed.filter((e) => !e.programId);

  const avgProgress = enrollments.length
    ? Math.round(enrollments.reduce((s, e) => s + (e.progressPercentage || 0), 0) / enrollments.length)
    : 0;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="page-eyebrow">Welcome back</span>
          <h1 className="page-title">Hi {user?.fullName?.split(' ')[0] || 'there'} 👋</h1>
          <p className="page-subtitle">Pick up where you left off.</p>
        </div>
        <Link to="/student/programs"><Button>Browse Programs</Button></Link>
      </div>

      <div className="grid-stats">
        <StatCard label="Enrolled Courses" value={enrollments.length} icon={Library} tone="ink" />
        <StatCard label="In Progress" value={inProgress.length} icon={PlayCircle} tone="amber" />
        <StatCard label="Completed" value={completed.length} icon={Award} tone="sage" />
        <StatCard label="Avg. Progress" value={`${avgProgress}%`} icon={TrendingUp} tone="sky" />
      </div>

      <h2 className="section-title">My Programs</h2>
      {programEnrollments.length === 0 ? (
        <EmptyState icon={GraduationCap} title="No programs" description="You are not enrolled in any programs." action={<Link to="/student/programs"><Button size="sm">Browse Programs</Button></Link>} />
      ) : (
        <div className="course-grid" style={{ marginBottom: '2rem' }}>
          {programEnrollments.map((p) => {
            const progId = p.programId || p.program?.id || p.program_id;
            const progName = p.program?.name || p.program_name || 'Program';
            const progDegree = p.program?.degreeTitle || p.program_degreeTitle || 'Degree';
            const totalSubjects = p.program?.totalSubjects || p.program_totalSubjects || 30;
            const completedCount = p.completedCourses || 0;
            const progress = totalSubjects > 0 ? Math.round((completedCount / totalSubjects) * 100) : (p.progressPercentage || 0);

            return (
              <Link to={`/student/programs/${progId}`} key={p.id || progId} className="course-card">
                <div className="course-card__thumb">
                  <GraduationCap size={32} />
                </div>
                <div className="course-card__body">
                  <h3>{progName}</h3>
                  <p className="text-muted" style={{ margin: '4px 0 8px 0', fontSize: '0.85rem' }}>{progDegree}</p>
                  <div className="course-card__progress">
                    <div className="course-card__progress-bar"><span style={{ width: `${progress}%` }} /></div>
                    <span className="text-muted" style={{ fontSize: 'var(--fs-2xs)' }}>{completedCount} / {totalSubjects} Courses ({progress}%)</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <h2 className="section-title">Standalone Courses</h2>
      {standaloneInProgress.length === 0 ? (
        <EmptyState icon={Library} title="Nothing in progress" description="Enroll in a standalone course to start your learning journey." action={<Link to="/student/programs"><Button size="sm">Browse Programs</Button></Link>} />
      ) : (
        <div className="course-grid">
          {standaloneInProgress.slice(0, 6).map((e) => (
            <Link to={`/student/my-courses/${e.courseId?._id || e.courseId?.id || e.courseId}/learn`} key={e._id || e.id} className="course-card">
              <div className="course-card__thumb" style={{ backgroundImage: e.courseId?.thumbnailUrl ? `url('${buildStaticUrl(e.courseId.thumbnailUrl)}')` : undefined }}>
                {!e.courseId?.thumbnailUrl && <Library size={28} />}
              </div>
              <div className="course-card__body">
                <h3>{e.courseId?.title || 'Course'}</h3>
                <div className="course-card__progress">
                  <div className="course-card__progress-bar"><span style={{ width: `${e.progressPercentage || 0}%` }} /></div>
                  <span className="text-muted" style={{ fontSize: 'var(--fs-2xs)' }}>{e.progressPercentage || 0}% complete</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
