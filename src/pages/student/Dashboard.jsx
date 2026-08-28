import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Library, Award, TrendingUp, PlayCircle, GraduationCap, Video, Calendar, Clock, CheckCircle2 } from 'lucide-react';
import * as liveSessionsApi from '../../api/liveSessions';
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
  const [upcomingCalls, setUpcomingCalls] = useState([]);

  useEffect(() => {
    const id = user?.id || user?._id;
    if (!id) return;
    Promise.all([
      studentsApi.getEnrollments(id),
      client.get(`/students/${id}/programs`),
      liveSessionsApi.getUpcomingForStudent().catch(() => ({ data: [] }))
    ]).then(([enrRes, progRes]) => {
      setEnrollments(enrRes.data?.data || []);
      const progs = progRes.data?.data || progRes.data;
      setProgramEnrollments(Array.isArray(progs) ? progs : []);
      if (arguments[0] && arguments[0][2]) {
        const calls = arguments[0][2]?.data?.data || arguments[0][2]?.data || arguments[0][2] || [];
        setUpcomingCalls(Array.isArray(calls) ? calls : []);
      }
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

      
      {/* UPCOMING BATCH LIVE CALLS BANNER */}
      {upcomingCalls.length > 0 && (
        <div style={{ background: '#f8faff', border: '1.5px solid #c7d2fe', borderRadius: 'var(--radius-lg)', padding: 'var(--sp-6)', marginBottom: 'var(--sp-6)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: 40, height: 40, borderRadius: '10px', background: '#4338ca', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Video size={22} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#1e1b4b' }}>Upcoming Live Interactive Sessions</h3>
                <p style={{ margin: 0, fontSize: '13px', color: '#6366f1' }}>Scheduled by administration for your batch (5 mandatory calls / subject)</p>
              </div>
            </div>
            <span style={{ padding: '4px 12px', background: '#e0e7ff', color: '#3730a3', borderRadius: '20px', fontSize: '12px', fontWeight: 700 }}>
              {upcomingCalls.length} Scheduled Call(s)
            </span>
          </div>

          <div className="stack" style={{ gap: '10px' }}>
            {upcomingCalls.map((call, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e0e7ff', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ padding: '2px 8px', background: '#eff6ff', color: '#1d4ed8', borderRadius: '4px', fontWeight: 700, fontSize: '11px' }}>
                      Call {call.sessionNumber} of 5
                    </span>
                    <strong style={{ fontSize: '14px', color: '#1e293b' }}>{call.courseTitle}</strong>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '12px', color: '#64748b' }}>
                    <span>📅 {new Date(call.scheduledDate).toLocaleDateString()}</span>
                    <span>⏰ {call.scheduledTime}</span>
                    {call.agenda && <span>📝 {call.agenda}</span>}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {call.hasAttended ? (
                    <span style={{ padding: '4px 10px', background: '#dcfce7', color: '#15803d', borderRadius: '6px', fontSize: '12px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <CheckCircle2 size={14} /> Attendance Marked
                    </span>
                  ) : call.meetingUrl ? (
                    <a href={call.meetingUrl} target="_blank" rel="noreferrer">
                      <Button size="sm" variant="primary" icon={Video} style={{ background: '#2563eb' }}>
                        Join Live Call
                      </Button>
                    </a>
                  ) : (
                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>Link will activate at call time</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
