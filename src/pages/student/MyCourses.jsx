import { Link } from 'react-router-dom';
import { Library, Folder, BookOpen, Clock, PlayCircle, GraduationCap, CheckCircle2, Sparkles, Layers, ChevronRight } from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import * as studentsApi from '../../api/students';
import { useAuth } from '../../contexts/AuthContext';
import { buildStaticUrl } from '../../api/client';
import EmptyState from '../../components/ui/EmptyState';
import PageLoader from '../../components/ui/PageLoader';
import Button from '../../components/ui/Button';
import SearchBar from '../../components/ui/SearchBar';
import './CourseGrid.css';

export default function MyCourses() {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSemester, setSelectedSemester] = useState('ALL');
  const [selectedProgram, setSelectedProgram] = useState('ALL');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const id = user?.id || user?._id;
    if (!id) return;
    studentsApi.getEnrollments(id)
      .then((res) => {
        const data = res.data?.data || res.data;
        setEnrollments(Array.isArray(data) ? data : (data?.enrollments || []));
      })
      .finally(() => setLoading(false));
  }, [user]);

  // Unique programs enrolled
  const uniquePrograms = useMemo(() => {
    const map = new Map();
    enrollments.forEach((e) => {
      const p = e.program;
      if (p && (p.id || p._id)) {
        map.set(p.id || p._id, p.name || p.degreeTitle || 'Degree Program');
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [enrollments]);

  // Group enrollments semester-wise
  const semesterGroups = useMemo(() => {
    const groups = {};
    const unassigned = [];

    enrollments.forEach((e) => {
      // Filter out pure program-level enrollment records without course
      const courseObj = (typeof e.courseId === 'object' && e.courseId !== null) ? e.courseId : (e.course || null);
      if (!courseObj && !e.courseId) return;

      // Filter by selected program if active
      const progId = e.programId || e.program?.id || e.program?._id;
      if (selectedProgram !== 'ALL' && progId && progId !== selectedProgram) {
        return;
      }

      const semObj = e.semester || courseObj?.semester || null;
      const semNum = semObj?.semesterNumber ?? (courseObj?.semesterNumber ?? null);
      const semName = semObj?.name || (semNum ? `Semester ${semNum}` : null);
      const semId = semObj?.id || (semNum ? `sem-${semNum}` : null);

      if (semId) {
        if (!groups[semId]) {
          groups[semId] = {
            id: semId,
            semesterNumber: semNum ?? 999,
            name: semName || `Semester ${semNum}`,
            programName: e.program?.name || e.program?.degreeTitle || '',
            items: [],
          };
        }
        groups[semId].items.push(e);
      } else {
        unassigned.push(e);
      }
    });

    const sorted = Object.values(groups).sort((a, b) => a.semesterNumber - b.semesterNumber);

    if (unassigned.length > 0) {
      sorted.push({
        id: 'unassigned',
        semesterNumber: 9999,
        name: 'Additional Courses',
        programName: '',
        items: unassigned,
      });
    }

    return sorted;
  }, [enrollments, selectedProgram]);

  // Filtered groups based on search & active tab
  const displayedGroups = useMemo(() => {
    return semesterGroups
      .filter((grp) => selectedSemester === 'ALL' || grp.id === selectedSemester)
      .map((grp) => {
        const filteredItems = grp.items.filter((e) => {
          const courseObj = (typeof e.courseId === 'object' && e.courseId !== null) ? e.courseId : (e.course || {});
          const title = (courseObj.title || e.courseTitle || '').toLowerCase();
          const code = (courseObj.courseCode || '').toLowerCase();
          const q = search.toLowerCase();
          return title.includes(q) || code.includes(q);
        });
        return { ...grp, items: filteredItems };
      })
      .filter((grp) => grp.items.length > 0);
  }, [semesterGroups, selectedSemester, search]);

  if (loading) return <PageLoader />;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="page-eyebrow">Curriculum</span>
          <h1 className="page-title">My Courses</h1>
          <p className="page-subtitle">Your enrolled subjects organized semester-wise.</p>
        </div>
      </div>

      {semesterGroups.length === 0 ? (
        <EmptyState 
          icon={Library} 
          title="No courses yet" 
          description="Browse your program curriculum and enroll in your first semester subjects." 
          action={
            <Link to={user?.programId ? `/student/programs/${user.programId}` : "/student/programs"}>
              <Button size="sm">View Degree Curriculum</Button>
            </Link>
          } 
        />
      ) : (
        <>
          {/* Top Controls: Search Bar & Program Switcher */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: 'var(--sp-6)' }}>
            <div style={{ maxWidth: 420 }}>
              <SearchBar value={search} onChange={setSearch} placeholder="Search your courses…" />
            </div>

            {uniquePrograms.length > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted, #64748b)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Degree Program:
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  <button
                    onClick={() => { setSelectedProgram('ALL'); setSelectedSemester('ALL'); }}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '16px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: '1px solid',
                      transition: 'all 0.2s ease',
                      background: selectedProgram === 'ALL' ? 'var(--brand, #7c3aed)' : 'var(--bg-surface, #fff)',
                      color: selectedProgram === 'ALL' ? '#fff' : 'var(--text-secondary, #64748b)',
                      borderColor: selectedProgram === 'ALL' ? 'var(--brand, #7c3aed)' : 'var(--border-subtle, #e2e8f0)',
                    }}
                  >
                    All Programs
                  </button>
                  {uniquePrograms.map((prog) => (
                    <button
                      key={prog.id}
                      onClick={() => { setSelectedProgram(prog.id); setSelectedSemester('ALL'); }}
                      style={{
                        padding: '5px 12px',
                        borderRadius: '16px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        border: '1px solid',
                        transition: 'all 0.2s ease',
                        background: selectedProgram === prog.id ? 'var(--brand, #7c3aed)' : 'var(--bg-surface, #fff)',
                        color: selectedProgram === prog.id ? '#fff' : 'var(--text-secondary, #64748b)',
                        borderColor: selectedProgram === prog.id ? 'var(--brand, #7c3aed)' : 'var(--border-subtle, #e2e8f0)',
                      }}
                    >
                      <GraduationCap size={13} style={{ display: 'inline', marginRight: 4 }} />
                      {prog.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Left Sidebar Semester Navigation + Course Sections */}
          <div style={{ display: 'grid', gridTemplateColumns: semesterGroups.length > 1 ? '240px 1fr' : '1fr', gap: '24px', alignItems: 'start' }}>
            
            {/* LEFT SIDEBAR: Semester Filter */}
            {semesterGroups.length > 1 && (
              <div style={{
                background: 'var(--bg-surface-card, #ffffff)',
                border: '1px solid var(--border-subtle, #e2e8f0)',
                borderRadius: 'var(--radius-lg, 14px)',
                padding: '16px',
                position: 'sticky',
                top: '16px',
                boxShadow: 'var(--shadow-sm, 0 1px 3px rgba(0,0,0,0.05))'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', paddingBottom: '10px', borderBottom: '1px solid var(--border-subtle, #e2e8f0)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Layers size={18} color="var(--primary, #3b82f6)" />
                    <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)' }}>Semesters</span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <button
                    onClick={() => setSelectedSemester('ALL')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: selectedSemester === 'ALL' ? '1.5px solid var(--primary, #3b82f6)' : '1px solid var(--border-subtle, #e2e8f0)',
                      background: selectedSemester === 'ALL' ? 'rgba(59, 130, 246, 0.08)' : 'var(--bg-surface, #ffffff)',
                      color: selectedSemester === 'ALL' ? 'var(--primary, #3b82f6)' : 'var(--text-primary)',
                      fontWeight: selectedSemester === 'ALL' ? 700 : 500,
                      fontSize: '13px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span>All Semesters</span>
                    <span style={{ fontSize: '11px', background: selectedSemester === 'ALL' ? 'var(--primary, #3b82f6)' : 'var(--bg-surface-muted, #f1f5f9)', color: selectedSemester === 'ALL' ? '#ffffff' : 'var(--text-muted)', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>
                      {enrollments.filter(e => e.courseId || e.course).length}
                    </span>
                  </button>

                  {semesterGroups.map((grp) => {
                    const isSelected = selectedSemester === grp.id;
                    return (
                      <button
                        key={grp.id}
                        onClick={() => setSelectedSemester(grp.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 12px',
                          borderRadius: '10px',
                          border: isSelected ? '1.5px solid var(--primary, #3b82f6)' : '1px solid var(--border-subtle, #e2e8f0)',
                          background: isSelected ? 'rgba(59, 130, 246, 0.08)' : 'var(--bg-surface, #ffffff)',
                          color: isSelected ? 'var(--primary, #3b82f6)' : 'var(--text-primary)',
                          fontWeight: isSelected ? 700 : 500,
                          fontSize: '13px',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <span>{grp.name}</span>
                        <span style={{ fontSize: '11px', background: isSelected ? 'var(--primary, #3b82f6)' : 'var(--bg-surface-muted, #f1f5f9)', color: isSelected ? '#ffffff' : 'var(--text-muted)', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>
                          {grp.items.length}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* RIGHT SIDE: Enrolled Courses Grid */}
            <div style={{ minWidth: 0 }}>
              {displayedGroups.length === 0 ? (
                <EmptyState icon={Library} title="No matching courses" description="Try a different search or semester filter." />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                  {displayedGroups.map((grp) => {
                    const totalInSem = grp.items.length;
                    const completedInSem = grp.items.filter(e => (e.progressPercentage ?? 0) >= 100).length;
                    const semAvg = totalInSem > 0 
                      ? Math.round(grp.items.reduce((sum, e) => sum + (e.progressPercentage || 0), 0) / totalInSem)
                      : 0;

                    return (
                      <section key={grp.id} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 16px',
                          background: 'linear-gradient(135deg, rgba(59,130,246,0.06), rgba(99,102,241,0.04))',
                          borderRadius: '12px',
                          border: '1px solid rgba(59,130,246,0.15)',
                          flexWrap: 'wrap',
                          gap: '10px'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                              width: 32,
                              height: 32,
                              borderRadius: '8px',
                              background: 'var(--primary, #3b82f6)',
                              color: '#fff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              <Layers size={18} />
                            </div>
                            <div>
                              <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                                {grp.name}
                              </h3>
                              <p style={{ fontSize: '11px', margin: '2px 0 0', color: 'var(--text-muted)' }}>
                                {completedInSem}/{totalInSem} Subjects Completed ({semAvg}% avg progress)
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="course-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px', marginTop: 0 }}>
                          {grp.items.map((enrollment) => {
                            const course = (typeof enrollment.courseId === 'object' && enrollment.courseId !== null)
                              ? enrollment.courseId
                              : (enrollment.course || {});
                            const courseId = course._id || course.id || enrollment.courseId;
                            const progress = enrollment.progressPercentage ?? 0;
                            const isComplete = progress >= 100;
                            const thumb = course.thumbnailUrl || course.thumbnail;

                            return (
                              <div key={enrollment.id || enrollment._id} className="course-card">
                                <div
                                  className="course-card__thumb"
                                  style={{
                                    backgroundImage: thumb ? `url('${buildStaticUrl(thumb)}')` : undefined,
                                    backgroundColor: 'var(--brand-surface)'
                                  }}
                                >
                                  {!thumb && <BookOpen size={48} color="var(--brand)" />}
                                  <div className="course-card__play">
                                    <PlayCircle size={44} />
                                  </div>
                                  {isComplete && (
                                    <div className="course-card__completed-badge">
                                      <CheckCircle2 size={13} style={{ marginRight: 4 }} /> Completed
                                    </div>
                                  )}
                                </div>
                                <div className="course-card__body">
                                  <h3>{course.title || enrollment.courseTitle}</h3>
                                  <div className="course-card__meta">
                                    <span>{course.credits ? `${course.credits}.00 Credits` : '3.00 Credits'}</span>
                                    <span>{course.examsCount || 0} Exams</span>
                                  </div>
                                  
                                  <div style={{ margin: 'var(--sp-2) 0' }}>
                                    <div className="progress-bar" style={{ height: 6 }}>
                                      <div
                                        className="progress-bar__fill"
                                        style={{
                                          width: `${progress}%`,
                                          backgroundColor: isComplete ? 'var(--color-success-500, #22c55e)' : 'var(--brand, #7c3aed)'
                                        }}
                                      />
                                    </div>
                                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 2, display: 'inline-block' }}>
                                      {progress}% Complete
                                    </span>
                                  </div>

                                  <div style={{ marginTop: 'auto', paddingTop: 'var(--sp-2)' }}>
                                    <Link to={`/student/my-courses/${courseId}/learn`}>
                                      <Button full size="sm" variant={isComplete ? "outline" : "primary"}>
                                        {isComplete ? "Review Course" : "Continue Learning"}
                                      </Button>
                                    </Link>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </section>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
