import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, BookOpen, Clock, Users, ChevronDown, ChevronUp, PlayCircle, FileText, FileSignature } from 'lucide-react';
import * as usersApi from '../../api/users';
import StatusBadge from '../../components/ui/StatusBadge';
import { Card } from '../../components/ui/Card';
import DataTable from '../../components/ui/DataTable';
import PageLoader from '../../components/ui/PageLoader';

export default function FacultyProfile() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedCourseId, setExpandedCourseId] = useState(null);

  useEffect(() => {
    usersApi.getFacultyDetails(id)
      .then((res) => {
        setData(res.data?.data || res.data);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  if (loading) return <PageLoader />;
  if (!data || !data.profile) return <div className="page"><p>Faculty member not found.</p></div>;

  const { profile, courses, stats } = data;

  const toggleCourse = (courseId) => {
    setExpandedCourseId(prev => prev === courseId ? null : courseId);
  };

  return (
    <div className="page">
      <Link to="/admin/faculty" className="row text-muted" style={{ marginBottom: 'var(--sp-4)', fontSize: 'var(--fs-xs)', fontWeight: 600 }}>
        <ArrowLeft size={14} /> Back to faculty
      </Link>

      <div className="page-head">
        <div>
          <span className="page-eyebrow">Faculty</span>
          <div className="row">
            <h1 className="page-title">{profile.fullName}</h1>
            <StatusBadge status={profile.status || 'ACTIVE'} />
          </div>
          <p className="page-subtitle">{profile.email}</p>
        </div>
      </div>

      <div className="form-grid" style={{ marginBottom: 'var(--sp-8)' }}>
        <Card style={{ padding: 'var(--sp-5)' }}>
          <p className="section-title">Contact Info</p>
          <div className="stack" style={{ gap: 8 }}>
            <Row label="Mobile" value={profile.mobile || '—'} />
            <Row label="Joined" value={profile.createdAt ? new Date(profile.createdAt).toLocaleDateString() : '—'} />
            <Row label="Email Verified" value={profile.emailVerified ? 'Yes' : 'No'} />
          </div>
        </Card>
        <Card style={{ padding: 'var(--sp-5)' }}>
          <p className="section-title">Summary Stats</p>
          <div className="stack" style={{ gap: 8 }}>
            <Row label="Total Courses" value={stats.totalCourses} />
            <Row label="Total Students" value={stats.totalStudents} />
            <Row label="Status" value={profile.status || 'ACTIVE'} />
          </div>
        </Card>
      </div>

      <h2 style={{ fontSize: 'var(--fs-lg)', fontWeight: 600, marginBottom: 'var(--sp-5)' }}>Assigned Courses</h2>

      {(!courses || courses.length === 0) ? (
        <Card style={{ padding: 'var(--sp-8)', textAlign: 'center', color: 'var(--text-muted)' }}>
          <BookOpen size={32} style={{ margin: '0 auto var(--sp-4)', opacity: 0.5 }} />
          <p>No courses assigned to this faculty member.</p>
        </Card>
      ) : (() => {
        // Build Hierarchy
        const programsMap = {};
        courses.forEach(c => {
          const pId = c.program?.id || 'standalone';
          const pName = c.program?.name || 'Standalone Courses';
          const sId = c.semester?.id || 'no-semester';
          const sName = c.semester?.term || 'Unassigned Semester';

          if (!programsMap[pId]) programsMap[pId] = { name: pName, semesters: {} };
          if (!programsMap[pId].semesters[sId]) programsMap[pId].semesters[sId] = { name: sName, courses: [] };

          programsMap[pId].semesters[sId].courses.push(c);
        });

        return (
          <div className="stack" style={{ gap: 'var(--sp-8)' }}>
            {Object.entries(programsMap).map(([pId, pData]) => (
              <div key={pId} style={{ backgroundColor: 'white', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
                <div style={{ padding: 'var(--sp-4) var(--sp-6)', borderBottom: '1px solid var(--border)', backgroundColor: '#f8fafc' }}>
                  <h2 style={{ fontSize: 'var(--fs-xl)', fontWeight: 800, color: '#0f172a' }}>{pData.name}</h2>
                </div>
                
                <div className="stack" style={{ padding: 'var(--sp-6)', gap: 'var(--sp-8)' }}>
                  {Object.entries(pData.semesters).map(([sId, sData]) => (
                    <div key={sId} className="stack" style={{ gap: 'var(--sp-4)' }}>
                      {sId !== 'no-semester' && sData.name !== 'Unassigned Semester' && sData.name && (
                        <div className="row" style={{ gap: 'var(--sp-2)' }}>
                          <h3 style={{ fontSize: 'var(--fs-lg)', fontWeight: 700, color: '#334155' }}>
                            {sData.name}
                          </h3>
                        </div>
                      )}
                      
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--sp-5)', alignItems: 'start' }}>
                        {sData.courses.map(course => {
                          const isExpanded = expandedCourseId === course.id;
                          const students = course.students || [];

                          return (
                            <Card 
                              key={course.id} 
                              style={{ 
                                overflow: 'hidden', 
                                gridColumn: isExpanded ? '1 / -1' : 'auto',
                                transition: 'all 0.2s ease-in-out',
                                border: isExpanded ? '2px solid var(--color-primary-500)' : '1px solid var(--border)',
                                cursor: 'pointer'
                              }}
                              onClick={() => !isExpanded && toggleCourse(course.id)}
                            >
                              {/* CARD HEADER */}
                              <div style={{ padding: 'var(--sp-5)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                  <h3 style={{ fontSize: 'var(--fs-md)', fontWeight: 600, marginBottom: 'var(--sp-2)', color: isExpanded ? 'var(--color-primary-700)' : 'inherit' }}>
                                    {course.title}
                                  </h3>
                                  <div className="row text-muted" style={{ fontSize: 'var(--fs-xs)', gap: 'var(--sp-3)', marginBottom: 'var(--sp-2)' }}>
                                    <span className="row"><Clock size={12} style={{ marginRight: 4 }} /> Created {new Date(course.createdAt).toLocaleDateString()}</span>
                                    <StatusBadge status={course.status} />
                                  </div>
                                  
                                  <div className="row" style={{ gap: 'var(--sp-3)', fontSize: 'var(--fs-xs)' }}>
                                    <span className="row" style={{ color: 'var(--text-muted)' }}><PlayCircle size={14} style={{ marginRight: 4, color: '#3b82f6' }} /> {course.curriculum?.videos || 0} Videos</span>
                                    <span className="row" style={{ color: 'var(--text-muted)' }}><FileText size={14} style={{ marginRight: 4, color: '#f59e0b' }} /> {course.curriculum?.exams || 0} Exams</span>
                                    <span className="row" style={{ color: 'var(--text-muted)' }}><FileSignature size={14} style={{ marginRight: 4, color: '#10b981' }} /> {course.curriculum?.assignments || 0} Assignments</span>
                                  </div>
                                </div>
                                
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-4)' }}>
                                  {!isExpanded && (
                                    <div style={{ textAlign: 'right' }}>
                                      <p style={{ fontSize: 'var(--fs-lg)', fontWeight: 700, color: 'var(--color-primary-600)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <Users size={16} /> {course.studentCount}
                                      </p>
                                    </div>
                                  )}
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); toggleCourse(course.id); }}
                                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}
                                  >
                                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                  </button>
                                </div>
                              </div>

                              {/* EXPANDED CONTENT: STUDENTS LIST */}
                              {isExpanded && (
                                <div style={{ borderTop: '1px solid var(--border)', padding: 'var(--sp-5)', background: 'var(--bg-muted)' }}>
                                  <h4 style={{ fontSize: 'var(--fs-sm)', fontWeight: 600, marginBottom: 'var(--sp-4)' }} className="row">
                                    <Users size={14} style={{ marginRight: 6 }} /> Enrolled Students ({students.length})
                                  </h4>
                                  
                                  {students.length > 0 ? (
                                    <DataTable
                                      columns={[
                                        { key: 'name', header: 'Student Name', render: (s) => (
                                          <Link to={`/admin/students/${s.id}`} style={{ fontWeight: 500, color: 'var(--color-primary-600)', textDecoration: 'none' }}>
                                            {s.fullName}
                                          </Link>
                                        )},
                                        { key: 'email', header: 'Email', render: (s) => s.email },
                                        { 
                                          key: 'status', 
                                          header: 'Status', 
                                          render: (s) => {
                                            const isCompleted = s.status === 'COMPLETED' || (s.progressPercentage || 0) >= 100;
                                            if (isCompleted) {
                                              return <StatusBadge status="COMPLETED" label="COMPLETED" tone="success" />;
                                            }
                                            return <StatusBadge status={s.status || 'ACTIVE'} label={s.status || 'ACTIVE'} tone="info" />;
                                          } 
                                        },
                                        { key: 'enrolledAt', header: 'Enrolled', render: (s) => s.enrolledAt ? new Date(s.enrolledAt).toLocaleDateString() : '—' },
                                      ]}
                                      rows={students}
                                      emptyLabel="No students enrolled in this course yet."
                                    />
                                  ) : (
                                    <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)' }}>No students enrolled in this course yet.</p>
                                  )}
                                </div>
                              )}
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        );
      })()}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="row" style={{ justifyContent: 'space-between', fontSize: 'var(--fs-sm)' }}>
      <span className="text-muted">{label}</span>
      <span style={{ fontWeight: 500 }}>{value}</span>
    </div>
  );
}

