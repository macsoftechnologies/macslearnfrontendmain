import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import * as programsApi from '../../api/programs';
import * as studentsApi from '../../api/students';
import * as academicBatchesApi from '../../api/academicBatches';
import * as coursesApi from '../../api/courses';
import * as semestersApi from '../../api/semesters';
import * as examsApi from '../../api/exams';
import * as contentApi from '../../api/content';
import client from '../../api/client';
import toast from 'react-hot-toast';
import Button from '../../components/ui/Button';
import PageLoader from '../../components/ui/PageLoader';
import Modal from '../../components/ui/Modal';
import { GraduationCap, Lock, CheckCircle2, BookOpen, FileText, PlayCircle, Clock, Award, AlertTriangle, AlertOctagon, FileDown, Layers, ChevronRight } from 'lucide-react';
import { buildStaticUrl } from '../../api/client';

export default function ProgramOverview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [program, setProgram] = useState(null);
  const [batches, setBatches] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [bannerVisible, setBannerVisible] = useState(true);
  const [programEnrollment, setProgramEnrollment] = useState(null);
  const [enrolledCourseIds, setEnrolledCourseIds] = useState(new Set());
  const [enrollmentsMap, setEnrollmentsMap] = useState({});
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [enrollModalOpen, setEnrollModalOpen] = useState(false);
  const [selectedCourses, setSelectedCourses] = useState(new Set());

  const [coursesList, setCoursesList] = useState([]);
  const [semestersList, setSemestersList] = useState([]);
  const [selectedSemesterTab, setSelectedSemesterTab] = useState('');

  const fetchData = async () => {
    const userId = user?.id || user?._id;
    try {
      const [progRes, batchRes, enrollRes, progEnrollRes, cRes, semRes] = await Promise.all([
        programsApi.getById(id),
        academicBatchesApi.list(id),
        userId ? studentsApi.getEnrollments(userId) : Promise.resolve({ data: { data: [] } }),
        userId ? studentsApi.getPrograms(userId) : Promise.resolve({ data: { data: [] } }),
        coursesApi.list({ programId: id, limit: 100 }),
        semestersApi.list({ programId: id })
      ]);
      const sArr = semRes?.data || semRes || [];
      const progSems = Array.isArray(sArr) ? sArr.filter(s => s.programId === id || !s.programId) : [];
      
      // Sort semesters chronologically: Semester 1, Semester 2, Semester 3...
      progSems.sort((a, b) => {
        const numA = parseInt((a.name || a.term || '').replace(/\D/g, '')) || 0;
        const numB = parseInt((b.name || b.term || '').replace(/\D/g, '')) || 0;
        return numA - numB;
      });

      setSemestersList(progSems);

      // Default directly to student's active semester or Semester 1 (never show all 30 mixed together)
      if (selectedSemesterTab === 'ALL' || !selectedSemesterTab) {
        const defaultSem = progSems.find(s => s.id === user?.semesterId) || progSems[0];
        if (defaultSem) {
          setSelectedSemesterTab(defaultSem.id);
        }
      }
      setProgram(progRes.data || progRes);
      
      const bArr = batchRes?.data?.data || batchRes?.data || batchRes;
      setBatches(Array.isArray(bArr) ? bArr : []);
      
      const cArr = cRes?.data?.data || [];
      const coursesWithStats = await Promise.all(cArr.map(async (c) => {
        try {
          const exRes = await examsApi.list(c.id || c._id);
          const examsArr = exRes?.data?.data || exRes?.data || exRes;
          return { ...c, examsCount: Array.isArray(examsArr) ? examsArr.length : 0 };
        } catch (e) {
          return { ...c, examsCount: 0 };
        }
      }));
      setCoursesList(coursesWithStats);
      
      const enrollmentsList = enrollRes?.data?.data || enrollRes?.data?.enrollments || enrollRes?.data || [];
      const progEnrollList = Array.isArray(progEnrollRes?.data?.data) ? progEnrollRes.data.data : (Array.isArray(progEnrollRes?.data) ? progEnrollRes.data : []);
      const matchedProgEnroll = progEnrollList.find(pe => (pe.programId === id || pe.program_id === id || pe.program?.id === id));

      const isEnrolledInProg = !!matchedProgEnroll || enrollmentsList.some(e => e.programId === id);
      setIsEnrolled(isEnrolledInProg);
      
      const pEnrollment = matchedProgEnroll || enrollmentsList.find(e => e.programId === id && e.batch) || enrollmentsList.find(e => e.programId === id);
      setProgramEnrollment(pEnrollment || null);
      
      const courseIds = new Set();
      const map = {};
      enrollmentsList.forEach(e => {
        const cId = e.courseId?._id || e.courseId?.id || e.courseId;
        if (cId) {
          courseIds.add(cId);
          map[cId] = e;
        }
      });
      setEnrolledCourseIds(courseIds);
      setEnrollmentsMap(map);
    } catch (err) {
      // silent on background polling
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Auto-sync when tab is focused
    const handleFocus = () => {
      fetchData();
    };
    window.addEventListener('focus', handleFocus);

    // Auto-refresh every 20 seconds
    const interval = setInterval(fetchData, 20000);

    return () => {
      window.removeEventListener('focus', handleFocus);
      clearInterval(interval);
    };
  }, [id, user]);

  // Auto-dismiss notification banner automatically after 4 seconds
  useEffect(() => {
    if (bannerVisible) {
      const timer = setTimeout(() => {
        setBannerVisible(false);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [bannerVisible]);

  const handleEnroll = async () => {
    if (selectedCourses.size === 0) {
      toast.error('Please select at least one course to enroll');
      return;
    }
    
    setEnrolling(true);
    try {
      await client.post(`/enrollments/student/programs/${id}/enroll`, {
        selectedCourseIds: Array.from(selectedCourses)
      });
      toast.success('Successfully enrolled in program courses!');
      setIsEnrolled(true);
      setEnrollModalOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to enroll');
    } finally {
      setEnrolling(false);
    }
  };

  if (loading) return <PageLoader />;
  if (!program) return <div>Program not found</div>;

  const getDisplayDuration = () => {
    let dur = program?.maxDurationYears;
    if (user?.region?.name && Array.isArray(program?.regionConfigs)) {
      const config = program.regionConfigs.find(c => c.regionName === user.region.name);
      if (config && config.customDurationYears) {
        dur = config.customDurationYears;
      }
    }
    if (!dur) return null;
    return `${dur} Years Max Duration`;
  };

  const displayDuration = getDisplayDuration();
  const expDateRaw = programEnrollment?.expectedGraduationDate || programEnrollment?.program?.expectedGraduationDate || programEnrollment?.batch?.endDate || programEnrollment?.expiresAt;
  const expDate = expDateRaw ? new Date(expDateRaw) : null;
  const daysRemaining = expDate ? Math.ceil((expDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null;
  const completedCoursesCount = Object.values(enrollmentsMap).filter(e => (e.progressPercentage || 0) >= 100 || e.status === 'COMPLETED').length;
  const isProgramCompleted = isEnrolled && completedCoursesCount >= (program?.totalSubjects || 30);
  const isProgramExpired = isEnrolled && !isProgramCompleted && expDate && daysRemaining < 0;
  const isProgramNearingExpiry = isEnrolled && !isProgramCompleted && expDate && daysRemaining >= 0 && daysRemaining <= 10;

  return (
    <div className="page">
      <div className="page-head" style={{ marginBottom: 'var(--sp-3)' }}>
        <div>
          <span className="page-eyebrow" style={{ fontSize: '11px' }}>Program Overview</span>
          <h1 className="page-title" style={{ fontSize: '1.45rem', fontWeight: 800, margin: '2px 0 4px' }}>{program.name}</h1>
          <p className="page-subtitle" style={{ fontSize: '0.82rem', marginTop: '2px', color: 'var(--text-muted)' }}>
            {program.totalSubjects} Subjects
            {displayDuration && ` • ${displayDuration}`}
            {programEnrollment && (
              <>
                {programEnrollment.batch && <span style={{ color: 'var(--brand)', fontWeight: 500 }}> • Batch: {programEnrollment.batch.name}</span>}
                <span style={{ color: isProgramCompleted ? '#16a34a' : 'var(--brand)', fontWeight: 600 }}>
                  {' • '}{completedCoursesCount}/{program.totalSubjects} Courses Completed
                  {isProgramCompleted && ' (100% Completed 🎉)'}
                </span>
                {expDate && (
                  <span style={{ color: isProgramCompleted ? 'var(--text-muted)' : isProgramExpired ? 'var(--color-danger-600)' : isProgramNearingExpiry ? '#b45309' : 'var(--text-muted)', fontWeight: 600 }}>
                    {' • '}Deadline: {expDate?.toLocaleDateString() || '—'}
                    {isProgramExpired && ' (Expired)'}
                    {isProgramNearingExpiry && ` (${daysRemaining} days left)`}
                  </span>
                )}
              </>
            )}
          </p>
        </div>
        {(!isEnrolled || isProgramExpired) && !isProgramCompleted && (
          <Button 
            size="sm"
            disabled={selectedCourses.size === 0}
            onClick={() => setEnrollModalOpen(true)}
          >
            {isProgramExpired ? 'Re-Enroll / Add Courses' : 'Join Program'}
          </Button>
        )}
        {isProgramCompleted && (
          <div className="row" style={{ gap: '8px' }}>
            <Link to="/student/results">
              <Button size="sm" icon={Award}>View Grades</Button>
            </Link>
            {(program?.certificateTemplateId || programEnrollment?.certificateUrl) && (
              <Link to="/student/certificates">
                <Button size="sm" variant="outline" icon={FileDown}>Certificate</Button>
              </Link>
            )}
          </div>
        )}
      </div>

      {/* PROGRAM COMPLETED / REQUIREMENTS MET BANNER */}
      {isProgramCompleted && bannerVisible && (
        <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #22c55e', padding: '10px 14px', borderRadius: '8px', color: '#166534', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px', position: 'relative' }}>
          <GraduationCap size={24} color="#16a34a" />
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700 }}>🎓 All Program Requirements Completed!</h3>
            <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#14532d' }}>
              You have successfully completed all <strong>{completedCoursesCount} / {program.totalSubjects}</strong> courses for <strong>{program.name}</strong>.
            </p>
          </div>
          <div className="row" style={{ gap: 'var(--sp-2)' }}>
            <Link to="/student/results"><Button size="sm">View Grades & Results</Button></Link>
            {(program?.certificateTemplateId || programEnrollment?.certificateUrl) && (
              <Link to="/student/certificates"><Button size="sm" variant="outline">Download Certificate</Button></Link>
            )}
          </div>
          <button 
            onClick={() => setBannerVisible(false)}
            style={{ position: 'absolute', top: '0.4rem', right: '0.4rem', background: 'none', border: 'none', cursor: 'pointer', color: '#166534', opacity: 0.7 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* EXPIRED BANNER */}
      {isProgramExpired && bannerVisible && (
        <div style={{ backgroundColor: '#fef2f2', border: '1px solid #f87171', padding: '10px 14px', borderRadius: '8px', color: '#991b1b', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px', position: 'relative' }}>
          <AlertOctagon size={24} color="#dc2626" />
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700 }}>Program Access Expired</h3>
            <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#7f1d1d' }}>
              Your academic duration for this program ended on <strong>{expDate?.toLocaleDateString() || 'the deadline'}</strong>.
            </p>
          </div>
          <button 
            onClick={() => setBannerVisible(false)}
            style={{ position: 'absolute', top: '0.4rem', right: '0.4rem', background: 'none', border: 'none', cursor: 'pointer', color: '#991b1b', opacity: 0.7 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* NEARING EXPIRY BANNER */}
      {!isProgramExpired && isProgramNearingExpiry && bannerVisible && (
        <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fcd34d', padding: '10px 14px', borderRadius: '8px', color: '#92400e', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px', position: 'relative' }}>
          <AlertTriangle size={24} color="#d97706" />
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700 }}>Attention: Program Access Expiring Soon</h3>
            <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#78350f' }}>
              You have <strong>{daysRemaining === 0 ? 'today only' : `${daysRemaining} days remaining`}</strong> to complete all subjects in this program.
            </p>
          </div>
          <button 
            onClick={() => setBannerVisible(false)}
            style={{ position: 'absolute', top: '0.4rem', right: '0.4rem', background: 'none', border: 'none', cursor: 'pointer', color: '#92400e', opacity: 0.7 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* REGULAR ENROLLED BANNER */}
      {isEnrolled && !isProgramExpired && !isProgramNearingExpiry && !isProgramCompleted && bannerVisible && (
        <div style={{ backgroundColor: '#ecfdf5', border: '1px solid #34d399', padding: '8px 14px', borderRadius: '8px', color: '#065f46', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px', position: 'relative' }}>
          <CheckCircle2 size={20} color="#059669" />
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 700 }}>You are enrolled in this Program!</h3>
            <p style={{ margin: 0, fontSize: '0.78rem', opacity: 0.9 }}>Select additional courses below to purchase and add to your curriculum.</p>
          </div>
          <button 
            onClick={() => setBannerVisible(false)}
            style={{ position: 'absolute', top: '0.4rem', right: '0.4rem', background: 'none', border: 'none', cursor: 'pointer', color: '#065f46', opacity: 0.7 }}
          >
            ✕
          </button>
        </div>
      )}

      <div>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>Academic Curriculum & Term Subjects</h2>
            <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Select courses or enroll in your active term pack (5 subjects per term).
            </p>
          </div>
          {selectedCourses.size > 0 && (
            <div className="row" style={{ gap: '8px', alignItems: 'center', backgroundColor: 'var(--brand-surface, #f5f3ff)', padding: '4px 12px', borderRadius: '100px', border: '1px solid var(--brand, #7c3aed)' }}>
              <span style={{ fontWeight: 700, color: 'var(--brand, #7c3aed)', fontSize: '0.82rem' }}>{selectedCourses.size} Courses Selected</span>
              <Button size="sm" onClick={() => setEnrollModalOpen(true)}>Proceed to Checkout</Button>
            </div>
          )}
        </div>

        {/* Left Sidebar Term Navigation + Course Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: semestersList.length > 1 ? '216px 1fr' : '1fr', gap: '24px', alignItems: 'start', marginTop: '16px' }}>
          
          {/* LEFT SIDEBAR: Academic Terms Navigation */}
          {semestersList.length > 1 && (
            <div style={{
              background: 'var(--bg-surface-card, #ffffff)',
              border: '1px solid var(--border-subtle, #e2e8f0)',
              borderRadius: 'var(--radius-lg, 14px)',
              padding: '16px',
              position: 'sticky',
              top: '16px',
              boxShadow: 'var(--shadow-sm, 0 1px 3px rgba(0,0,0,0.05))'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', paddingBottom: '10px', borderBottom: '1px solid var(--border-subtle, #e2e8f0)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Layers size={18} color="var(--brand, #7c3aed)" />
                  <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)' }}>Academic Terms</span>
                </div>
                <span style={{ fontSize: '11px', background: 'var(--brand-surface, #f5f3ff)', color: 'var(--brand, #7c3aed)', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
                  {semestersList.length} Terms
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {semestersList.map((sem, sIdx) => {
                  const semCourseIds = (sem.courseIds && sem.courseIds.length > 0)
                    ? sem.courseIds
                    : coursesList.filter(c => c.semesterId === sem.id).map(c => c.id || c._id);
                  const semCoursesCount = semCourseIds.length || 5;
                  const isTabActive = selectedSemesterTab === sem.id;
                  
                  const completedInSem = semCourseIds.filter(cid => {
                    const e = enrollmentsMap[cid];
                    return e && ((e.progressPercentage || 0) >= 100 || e.status === 'COMPLETED');
                  }).length;
                  const isSemCompleted = semCoursesCount > 0 && completedInSem === semCoursesCount;
                  const isSemEnrolled = semCourseIds.some(cid => enrolledCourseIds.has(cid));

                  const rawName = sem.name || sem.term || `Term ${sIdx + 1}`;
                  const termFormatted = rawName.replace(/semester/i, 'Term');

                  return (
                    <button
                      key={sem.id || sIdx}
                      onClick={() => setSelectedSemesterTab(sem.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        borderRadius: '10px',
                        border: isTabActive ? '1.5px solid var(--brand, #7c3aed)' : '1px solid var(--border-subtle, #e2e8f0)',
                        background: isTabActive ? 'var(--brand-surface, #f5f3ff)' : 'var(--bg-surface, #ffffff)',
                        color: isTabActive ? 'var(--brand, #7c3aed)' : 'var(--text-primary)',
                        fontWeight: isTabActive ? 700 : 500,
                        fontSize: '13px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s ease',
                        boxShadow: isTabActive ? '0 2px 8px rgba(124, 58, 237, 0.12)' : 'none'
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {isSemCompleted ? (
                            <CheckCircle2 size={15} color="#16a34a" />
                          ) : isSemEnrolled ? (
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
                          ) : (
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#cbd5e1', display: 'inline-block' }} />
                          )}
                          <span style={{ fontWeight: isTabActive ? 800 : 600 }}>{termFormatted}</span>
                        </div>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '16px' }}>
                          {isSemCompleted ? 'All Completed ✓' : `${semCoursesCount} Subjects`}
                        </span>
                      </div>
                      {isTabActive && <ChevronRight size={16} color="var(--brand, #7c3aed)" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* RIGHT SIDE: Current Term Curriculum & Course Cards */}
          <div style={{ minWidth: 0 }}>
            {/* Term Action Header */}
            {(() => {
              const activeSem = semestersList.find(s => s.id === user?.semesterId) || semestersList[0];
              const currentSem = semestersList.find(s => s.id === selectedSemesterTab) || semestersList[0];
              if (!currentSem) return null;

              const isCurrentActive = currentSem.id === activeSem?.id;
              const semCourseIds = (currentSem.courseIds && currentSem.courseIds.length > 0)
                ? currentSem.courseIds
                : coursesList.filter(c => c.semesterId === currentSem.id).map(c => c.id || c._id);
              const unenrolledSemIds = semCourseIds.filter(cid => !enrolledCourseIds.has(cid));
              const allSelected = unenrolledSemIds.length > 0 && unenrolledSemIds.every(cid => selectedCourses.has(cid));

              const rawName = currentSem.name || currentSem.term || 'Term';
              const termTitle = rawName.replace(/semester/i, 'Term');

              return (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 18px',
                  background: isCurrentActive ? 'var(--bg-surface-card, #ffffff)' : '#fffbeb',
                  border: isCurrentActive ? '1px solid var(--border-subtle, #e2e8f0)' : '1px solid #fcd34d',
                  borderRadius: '12px',
                  marginBottom: '16px',
                  flexWrap: 'wrap',
                  gap: '10px'
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>
                        {termTitle} — {semCourseIds.length} Subjects
                      </h3>
                      {isCurrentActive ? (
                        <span style={{ fontSize: '11px', fontWeight: 700, background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '10px' }}>
                          🟢 Active Term
                        </span>
                      ) : (
                        <span style={{ fontSize: '11px', fontWeight: 700, background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: '10px' }}>
                          🔒 Upcoming Term
                        </span>
                      )}
                    </div>
                    <p style={{ margin: '3px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                      {!isCurrentActive ? (
                        'This term will unlock in the next academic cycle. You can preview subjects below.'
                      ) : unenrolledSemIds.length === 0 ? (
                        '✓ You are enrolled in all subjects for this term'
                      ) : (
                        `${unenrolledSemIds.length} subjects available to enroll`
                      )}
                    </p>
                  </div>

                  {!isCurrentActive ? (
                    <span style={{ background: '#fef3c7', color: '#92400e', padding: '6px 14px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid #fde68a' }}>
                      <Lock size={14} /> Upcoming Term (Locked)
                    </span>
                  ) : unenrolledSemIds.length > 0 && (
                    <button
                      onClick={() => {
                        const newSet = new Set(selectedCourses);
                        if (allSelected) {
                          unenrolledSemIds.forEach(cid => newSet.delete(cid));
                        } else {
                          unenrolledSemIds.forEach(cid => newSet.add(cid));
                        }
                        setSelectedCourses(newSet);
                      }}
                      style={{
                        background: '#eff6ff',
                        color: '#2563eb',
                        border: '1px solid #bfdbfe',
                        borderRadius: '8px',
                        padding: '6px 14px',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      ✓ {allSelected ? 'Deselect Term Subjects' : `Select All ${unenrolledSemIds.length} Subjects in ${termTitle}`}
                    </button>
                  )}
                </div>
              );
            })()}

            {/* Course Cards Grid */}
            {coursesList.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', background: '#f8fafc', borderRadius: '8px' }}>
                No courses available yet.
              </div>
            ) : (
              <div className="course-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px', marginTop: 0 }}>
                {coursesList
                  .filter(course => {
                    if (selectedSemesterTab === 'ALL') return true;
                    const sem = semestersList.find(s => s.id === selectedSemesterTab);
                    if (sem && Array.isArray(sem.courseIds)) {
                      return sem.courseIds.includes(course.id || course._id);
                    }
                    return course.semesterId === selectedSemesterTab;
                  })
                  .map(course => {
                  
                  const activeSem = semestersList.find(s => s.id === user?.semesterId) || semestersList[0];
                  const currentSem = semestersList.find(s => s.id === selectedSemesterTab) || semestersList[0];
                  const isCurrentActive = currentSem ? (currentSem.id === activeSem?.id) : true;

                  // Calculate price based on student's region
                  let displayPrice = 'Free';
                  let amount = null;
                  let currency = 'USD';
                  
                  if (user?.regionId && Array.isArray(course.regionalPrices)) {
                    const override = course.regionalPrices.find(rp => rp.regionId === user.regionId);
                    if (override && override.price !== undefined && override.price !== null) {
                      amount = override.price;
                      currency = override.currency || 'USD';
                    }
                  }
                  
                  if (amount === null && course.basePrice !== undefined && course.basePrice !== null) {
                    amount = course.basePrice;
                    currency = course.currency || 'USD';
                  }
                  
                  if (amount !== null && amount !== undefined) {
                    const symbol = currency === 'INR' ? '₹' : '$';
                    displayPrice = `${symbol}${amount}`;
                  }
                  
                  const courseId = course.id || course._id;
                  const isCourseEnrolled = enrolledCourseIds.has(courseId);
                  const isSelected = selectedCourses.has(courseId);
                  const canSelect = isCurrentActive && !isCourseEnrolled;
                  
                  return (
                    <div 
                      key={courseId} 
                      className="course-card" 
                      onClick={() => canSelect && toggleCourseSelect(courseId)}
                      style={{ 
                        border: isSelected ? '2px solid var(--brand)' : isCourseEnrolled ? '2px solid #22c55e' : !isCurrentActive ? '1px dashed #cbd5e1' : '1px solid var(--border-subtle)',
                        boxShadow: isSelected ? '0 0 0 1px var(--brand), 0 4px 12px rgba(124, 58, 237, 0.15)' : undefined,
                        cursor: canSelect ? 'pointer' : 'default',
                        opacity: !isCurrentActive && !isCourseEnrolled ? 0.85 : 1
                      }}
                    >
                      <div 
                        className="course-card__thumb"
                        style={{
                          backgroundImage: (course.thumbnailUrl || course.thumbnail) ? `url('${buildStaticUrl(course.thumbnailUrl || course.thumbnail)}')` : undefined,
                          backgroundColor: 'var(--brand-surface)'
                        }}
                      >
                        {!(course.thumbnailUrl || course.thumbnail) && <BookOpen size={48} color="var(--brand)" />}
                        {isSelected && (
                          <div style={{ position: 'absolute', top: '10px', right: '10px', backgroundColor: 'var(--brand)', color: 'white', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            ✓
                          </div>
                        )}
                        {!isCurrentActive && !isCourseEnrolled && (
                          <div style={{ position: 'absolute', top: '10px', left: '10px', background: 'rgba(15, 23, 42, 0.75)', color: '#fef3c7', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Lock size={12} /> Upcoming
                          </div>
                        )}
                      </div>
                      <div className="course-card__body">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                          <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>{course.title}</h3>
                          {isCourseEnrolled && (
                            <span title="Enrolled" style={{ display: 'flex', alignItems: 'center', color: '#16a34a' }}>
                              <CheckCircle2 size={18} />
                            </span>
                          )}
                        </div>
                        <div className="course-card__meta" style={{ marginTop: 'auto', paddingTop: 'var(--sp-2)' }}>
                          <span>{course.credits ? `${course.credits}.00 Credits` : '3.00 Credits'}</span>
                          <span>{course.examsCount || 0} Exams</span>
                          {isCourseEnrolled ? (
                            <span style={{ color: '#16a34a', fontWeight: 700 }}>Enrolled</span>
                          ) : !isCurrentActive ? (
                            <span style={{ color: '#94a3b8', fontWeight: 600 }}>Unlocks Next Term</span>
                          ) : (
                            <span style={{ color: 'var(--brand)', fontWeight: 700 }}>{displayPrice}</span>
                          )}
                        </div>
                        <div style={{ marginTop: 'var(--sp-3)' }}>
                          {isCourseEnrolled ? (
                            <Link to={`/student/my-courses/${courseId}/learn`}>
                              <Button full size="sm">Continue Learning</Button>
                            </Link>
                          ) : !isCurrentActive ? (
                            <Button 
                              full 
                              size="sm" 
                              variant="outline" 
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/student/programs/${id}/courses/${courseId}`);
                              }}
                            >
                              Preview Course Details
                            </Button>
                          ) : (
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <Button 
                                full 
                                size="sm" 
                                variant={isSelected ? "primary" : "outline"}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleCourseSelect(courseId);
                                }}
                              >
                                {isSelected ? "Selected ✓" : "Select Course"}
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                style={{ padding: '0 10px' }}
                                title="Course Details"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/student/programs/${id}/courses/${courseId}`);
                                }}
                              >
                                Preview
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
{/* ENROLLMENT MODAL */}
      <Modal open={enrollModalOpen} onClose={() => setEnrollModalOpen(false)} title="Confirm Course Enrollment" width={700}>
        <div className="stack" style={{ gap: '2rem' }}>

          <div style={{ padding: '1.5rem', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-lg)' }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>2. Payment Summary</h3>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1rem', borderBottom: '1px solid var(--border-subtle)' }}>
              <div>
                <p style={{ margin: 0, fontWeight: 500 }}>Selected Courses</p>
                <p className="text-muted" style={{ margin: 0, fontSize: '0.9rem', marginTop: '0.25rem' }}>
                  {selectedCourses.size} courses selected for immediate access.
                </p>
              </div>
              <div style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {(() => {
                  let total = 0;
                  let currency = 'USD';
                  const allC = coursesList;
                  
                  selectedCourses.forEach(cid => {
                    const c = allC.find(c => (c.id || c._id) === cid);
                    if (!c) return;
                    let amount = null;
                    if (user?.regionId && Array.isArray(c.regionalPrices)) {
                      const override = c.regionalPrices.find(rp => rp.regionId === user?.regionId);
                      if (override && override.price !== undefined && override.price !== null) {
                        amount = override.price;
                        currency = override.currency || 'USD';
                      }
                    }
                    if (amount === null) {
                      if (c.pricing?.isPaid) { amount = c.pricing.amount; currency = c.pricing.currency || 'USD'; }
                      else if (c.price) amount = c.price;
                    }
                    total += Number(amount || 0);
                  });
                  return total > 0 ? `${currency} ${total.toFixed(2)}` : 'Free';
                })()}
              </div>
            </div>
          </div>

          <div className="row" style={{ justifyContent: 'flex-end', gap: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
            <Button variant="outline" onClick={() => setEnrollModalOpen(false)}>Cancel</Button>
            <Button 
              size="lg" 
              onClick={handleEnroll} 
              loading={enrolling}
              disabled={selectedCourses.size === 0}
            >
              Confirm & Pay
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
