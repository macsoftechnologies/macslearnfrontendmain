import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Plus, Edit, Trash2, ArrowLeft, BookOpen, Layers, CheckCircle2, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../../../components/ui/Button';
import DataTable from '../../../components/ui/DataTable';
import StatusBadge from '../../../components/ui/StatusBadge';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import * as programsApi from '../../../api/programs';
import * as coursesApi from '../../../api/courses';
import * as semestersApi from '../../../api/semesters';

const ProgramDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [program, setProgram] = useState(null);
  const [courses, setCourses] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [removeTarget, setRemoveTarget] = useState(null);

  const fetchProgramData = async () => {
    setLoading(true);
    try {
      const [progRes, coursesRes, semsRes] = await Promise.all([
        programsApi.getById(id),
        coursesApi.list({ programId: id, limit: 100 }),
        semestersApi.list()
      ]);
      setProgram(progRes.data || progRes);
      setCourses(coursesRes.data?.data || coursesRes.data || []);
      
      // Sort semesters by term/name in ascending order (Semester 1, Semester 2...)
      const progSemesters = (semsRes.data || [])
        .filter(s => s.programId === id)
        .sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { numeric: true }));
      setSemesters(progSemesters);
    } catch (err) {
      toast.error('Failed to load program details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProgramData();
  }, [id]);

  const handleRemoveCourse = async () => {
    if (!removeTarget) return;
    try {
      const courseId = removeTarget.id || removeTarget._id;
      const targetSemId = removeTarget.semesterId || removeTarget.semester?.id || '';
      await semestersApi.unlinkCourse(targetSemId, courseId, id);
      toast.success('Course removed from curriculum');
      setRemoveTarget(null);
      fetchProgramData();
    } catch (err) {
      toast.error('Failed to remove course from curriculum');
    }
  };

  if (!program) return <div className="page">Loading...</div>;

  return (
    <div className="page stack" style={{ gap: 'var(--sp-6)' }}>
      <div>
        <Link to="/admin/programs" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.88rem', marginBottom: '0.75rem' }}>
          <ArrowLeft size={16} /> Back to Programs
        </Link>
        
        <div className="page-head" style={{ marginBottom: 0 }}>
          <div>
            <span className="page-eyebrow">Program Curriculum</span>
            <h1 className="page-title">{program.name}</h1>
            <p className="page-subtitle">Semester-wise structured curriculum breakdown and subject list.</p>
          </div>
          <div className="row" style={{ gap: '0.75rem' }}>
            <Button variant="outline" icon={Layers} onClick={() => navigate('/admin/semesters')}>
              Manage Semesters
            </Button>
            <Button icon={Plus} onClick={() => navigate('/admin/courses/create?programId=' + id)}>
              Add New Course
            </Button>
          </div>
        </div>
      </div>

      {/* STATS OVERVIEW CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <div style={{ padding: '1.25rem 1.5rem', background: 'var(--bg-surface-card)', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Semesters</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-primary)' }}>{program.totalSemesters || semesters.length} Terms</div>
        </div>
        <div style={{ padding: '1.25rem 1.5rem', background: 'var(--bg-surface-card)', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Subjects Required</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-primary)' }}>{program.totalSubjects || 30} Subjects</div>
        </div>
        <div style={{ padding: '1.25rem 1.5rem', background: 'var(--bg-surface-card)', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Courses Attached</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: courses.length >= (program.totalSubjects || 30) ? 'var(--success, #16a34a)' : 'var(--primary)' }}>
            {courses.length} Courses
          </div>
        </div>
        <div style={{ padding: '1.25rem 1.5rem', background: 'var(--bg-surface-card)', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Passing Standard</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--success, #16a34a)' }}>70% Required</div>
        </div>
      </div>

      {/* SEMESTER-WISE CURRICULUM SECTIONS */}
      <div className="stack" style={{ gap: '2rem' }}>
        {semesters.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', background: 'var(--bg-surface-card)', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
            <h3 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>No Semesters Configured Yet</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              Create the semesters and assign courses in the Semesters configuration page.
            </p>
            <Button icon={Layers} onClick={() => navigate('/admin/semesters')}>Go to Semesters Page</Button>
          </div>
        ) : (
          semesters.map((sem, semIdx) => {
            const semCourses = courses.filter(c => {
              const cId = c.id || c._id;
              return (sem.courseIds && sem.courseIds.includes(cId)) || c.semesterId === sem.id;
            });

            return (
              <div 
                key={sem.id || semIdx} 
                style={{ 
                  background: 'var(--bg-surface-card)', 
                  borderRadius: '12px', 
                  border: '1px solid var(--border-subtle)', 
                  overflow: 'hidden',
                  boxShadow: 'var(--shadow-sm)'
                }}
              >
                {/* SEMESTER HEADER */}
                <div style={{ 
                  padding: '1rem 1.5rem', 
                  background: 'var(--bg-surface-muted)', 
                  borderBottom: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '0.75rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ 
                      padding: '4px 10px', 
                      background: 'var(--primary)', 
                      color: '#ffffff', 
                      borderRadius: '6px', 
                      fontWeight: 700, 
                      fontSize: '0.85rem' 
                    }}>
                      {sem.name}
                    </span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      <strong>{semCourses.length}</strong> of {sem.totalSubjects || 5} Subjects Configured
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    <span><strong>Pass Mark:</strong> {sem.passingPercentage || 70}%</span>
                    <span><strong>Split:</strong> {sem.internalWeightage || 65}% Int / {sem.attendanceWeightage || 5}% Att / {sem.finalExamWeightage || 30}% Final</span>
                  </div>
                </div>

                {/* SEMESTER COURSES TABLE */}
                {semCourses.length === 0 ? (
                  <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                    No subjects assigned to {sem.name} yet.{' '}
                    <button 
                      onClick={() => navigate('/admin/semesters')} 
                      style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: 600, textDecoration: 'underline' }}
                    >
                      Assign courses in Semesters page
                    </button>
                  </div>
                ) : (
                  <DataTable
                    loading={false}
                    columns={[
                      { 
                        key: 'title', 
                        header: 'Course Title', 
                        render: (r) => {
                          const courseIndex = semCourses.indexOf(r) + 1;
                          return (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <span style={{ color: 'var(--primary)', fontSize: '0.85rem', fontWeight: 700, minWidth: 24 }}>
                                {courseIndex > 0 ? `${courseIndex}.` : '•'}
                              </span>
                              <div>
                                <strong style={{ color: 'var(--text-primary)', fontSize: '0.92rem' }}>{r.title}</strong>
                                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                  Instructor: {r.faculty?.fullName || r.instructor?.fullName || 'Assigned'}
                                </div>
                              </div>
                            </div>
                          );
                        } 
                      },
                      { key: 'credits', header: 'Credits', render: (r) => (r.credits || 3) + ' Credits' },
                      { 
                        key: 'fee', 
                        header: 'Fee', 
                        render: (r) => 'INR ' + (r.pricing?.amount || 6000) 
                      },
                      { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status || 'DRAFT'} /> },
                      {
                        key: 'actions', 
                        header: 'Actions', 
                        render: (r) => (
                          <div className="row" style={{ gap: 6 }}>
                            <Button size="sm" variant="outline" icon={BookOpen} onClick={() => navigate('/admin/courses/' + (r.id || r._id))}>
                              Manage Content
                            </Button>
                            <Button size="sm" variant="outline" icon={Edit} onClick={() => navigate('/admin/courses/' + (r.id || r._id) + '/edit?programId=' + id)}>
                              Edit
                            </Button>
                            <Button size="sm" variant="outline" icon={Trash2} onClick={() => setRemoveTarget(r)} style={{ color: 'var(--danger, #ef4444)' }}>
                              Remove
                            </Button>
                          </div>
                        ),
                      },
                    ]}
                    rows={semCourses}
                  />
                )}
              </div>
            );
          })
        )}
      </div>

      <ConfirmDialog
        open={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        onConfirm={handleRemoveCourse}
        title="Remove Course from Program?"
        description={'Are you sure you want to remove "' + (removeTarget?.title || '') + '" from ' + program.name + '?'}
        confirmLabel="Remove"
        danger={true}
      />
    </div>
  );
};

export default ProgramDetail;
