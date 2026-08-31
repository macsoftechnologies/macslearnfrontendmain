import { Link } from 'react-router-dom';
import { Library, Folder, BookOpen, Clock, PlayCircle, GraduationCap, CheckCircle2, Sparkles, Layers } from 'lucide-react';
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
        name: 'Additional / Independent Courses',
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
          {/* Controls Bar: Search & Program/Semester Filter Pills */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: 'var(--sp-6)' }}>
            <div style={{ maxWidth: 420 }}>
              <SearchBar value={search} onChange={setSearch} placeholder="Search your courses…" />
            </div>

            {/* Program Switcher (if student has 2+ programs) */}
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

            {/* Semester Switcher */}
            {semesterGroups.length > 1 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                <button
                  onClick={() => setSelectedSemester('ALL')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '20px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: '1px solid',
                    transition: 'all 0.2s ease',
                    background: selectedSemester === 'ALL' ? 'var(--primary, #3b82f6)' : 'var(--bg-surface, #fff)',
                    color: selectedSemester === 'ALL' ? '#fff' : 'var(--text-secondary, #64748b)',
                    borderColor: selectedSemester === 'ALL' ? 'var(--primary, #3b82f6)' : 'var(--border-subtle, #e2e8f0)',
                  }}
                >
                  All Semesters ({enrollments.filter(e => e.courseId || e.course).length})
                </button>
                {semesterGroups.map((grp) => (
                  <button
                    key={grp.id}
                    onClick={() => setSelectedSemester(grp.id)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '20px',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: '1px solid',
                      transition: 'all 0.2s ease',
                      background: selectedSemester === grp.id ? 'var(--primary, #3b82f6)' : 'var(--bg-surface, #fff)',
                      color: selectedSemester === grp.id ? '#fff' : 'var(--text-secondary, #64748b)',
                      borderColor: selectedSemester === grp.id ? 'var(--primary, #3b82f6)' : 'var(--border-subtle, #e2e8f0)',
                    }}
                  >
                    {grp.name} ({grp.items.length})
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Semester Sections */}
          {displayedGroups.length === 0 ? (
            <EmptyState icon={Library} title="No matching courses" description="Try a different search or semester filter." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '36px' }}>
              {displayedGroups.map((grp) => {
                const totalInSem = grp.items.length;
                const completedInSem = grp.items.filter(e => (e.progressPercentage ?? 0) >= 100).length;
                const semAvg = totalInSem > 0 
                  ? Math.round(grp.items.reduce((sum, e) => sum + (e.progressPercentage || 0), 0) / totalInSem)
                  : 0;

                return (
                  <section key={grp.id} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    
                    {/* Semester Header */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 18px',
                      background: 'linear-gradient(135deg, rgba(59,130,246,0.06), rgba(99,102,241,0.04))',
                      borderRadius: '12px',
                      border: '1px solid rgba(59,130,246,0.15)',
                      flexWrap: 'wrap',
                      gap: '10px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: 36,
                          height: 36,
                          borderRadius: '8px',
                          background: 'var(--primary, #3b82f6)',
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <Layers size={20} />
                        </div>
                        <div>
                          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                            {grp.name}
                          </h2>
                          {grp.programName && (
                            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted, #64748b)' }}>
                              {grp.programName}
                            </p>
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.85rem' }}>
                        <span style={{ color: 'var(--text-secondary, #64748b)' }}>
                          <strong>{totalInSem}</strong> Subjects
                        </span>
                        <span style={{
                          padding: '4px 10px',
                          background: semAvg === 100 ? 'rgba(34,197,94,0.15)' : 'rgba(59,130,246,0.12)',
                          color: semAvg === 100 ? '#15803d' : '#1d4ed8',
                          borderRadius: '12px',
                          fontWeight: 700,
                          fontSize: '12px'
                        }}>
                          {completedInSem}/{totalInSem} Completed ({semAvg}%)
                        </span>
                      </div>
                    </div>

                    {/* Courses Grid for this Semester */}
                    <div className="course-grid">
                      {grp.items.map((e) => {
                        const courseObj = (typeof e.courseId === 'object' && e.courseId !== null) ? e.courseId : (e.course || {});
                        const thumb = courseObj.thumbnailUrl || courseObj.thumbnail || e.thumbnailUrl;
                        const title = courseObj.title || e.courseTitle || 'Course';
                        const courseId = courseObj.id || courseObj._id || e.courseId;

                        return (
                          <Link 
                            to={e.status === 'EXPIRED' ? '#' : `/student/my-courses/${courseId}/learn`} 
                            key={e._id || e.id} 
                            className="course-card" 
                            style={e.status === 'EXPIRED' ? { opacity: 0.7 } : {}}
                          >
                            <div 
                              className="course-card__thumb" 
                              style={{ 
                                aspectRatio: '16/9', 
                                backgroundColor: '#0f172a', 
                                position: 'relative', 
                                overflow: 'hidden', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center' 
                              }}
                            >
                              {thumb ? (
                                <img 
                                  src={buildStaticUrl(thumb)} 
                                  alt={title}
                                  style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                    objectPosition: 'center',
                                    display: 'block'
                                  }}
                                />
                              ) : (
                                <Library size={36} color="#a5b4fc" />
                              )}
                              {e.status === 'EXPIRED' && (
                                <span style={{ position: 'absolute', top: 8, right: 8, background: 'var(--danger, #ef4444)', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                                  Expired
                                </span>
                              )}
                              {e.progressPercentage >= 100 && (
                                <span style={{ position: 'absolute', top: 8, left: 8, background: '#10b981', color: 'white', padding: '3px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 3 }}>
                                  <CheckCircle2 size={12} /> Completed
                                </span>
                              )}
                            </div>
                            <div className="course-card__body">
                              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 6px', color: 'var(--text-primary)' }}>{title}</h3>
                              {e.expiresAt && <p className="text-muted" style={{ fontSize: 'var(--fs-xs)', marginBottom: 'var(--sp-2)' }}>Expires: {new Date(e.expiresAt).toLocaleDateString()}</p>}
                              <div className="course-card__progress">
                                <div className="course-card__progress-bar"><span style={{ width: `${e.progressPercentage || 0}%` }} /></div>
                                <span className="text-muted" style={{ fontSize: 'var(--fs-2xs)', fontWeight: 600 }}>{e.progressPercentage || 0}% complete</span>
                              </div>
                              {e.grade && (
                                <div style={{ marginTop: 'var(--sp-2)' }}>
                                  <span style={{ fontSize: 'var(--fs-xs)', fontWeight: 600, color: 'var(--color-primary-600)', background: 'var(--color-primary-50)', padding: '2px 6px', borderRadius: 4 }}>
                                    Grade: {e.grade.grade} ({e.grade.totalScore})
                                  </span>
                                </div>
                              )}
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
