import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import * as programsApi from '../../api/programs';
import * as studentsApi from '../../api/students';
import * as academicBatchesApi from '../../api/academicBatches';
import * as coursesApi from '../../api/courses';
import * as examsApi from '../../api/exams';
import * as contentApi from '../../api/content';
import client from '../../api/client';
import toast from 'react-hot-toast';
import Button from '../../components/ui/Button';
import PageLoader from '../../components/ui/PageLoader';
import Modal from '../../components/ui/Modal';
import { GraduationCap, CheckCircle2, BookOpen, FileText, PlayCircle, Clock, Award, AlertTriangle, AlertOctagon, FileDown } from 'lucide-react';
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

  const fetchData = async () => {
    const userId = user?.id || user?._id;
    try {
      const [progRes, batchRes, enrollRes, progEnrollRes, cRes] = await Promise.all([
        programsApi.getById(id),
        academicBatchesApi.list(id),
        userId ? studentsApi.getEnrollments(userId) : Promise.resolve({ data: { data: [] } }),
        userId ? studentsApi.getPrograms(userId) : Promise.resolve({ data: { data: [] } }),
        coursesApi.list({ programId: id, limit: 100 })
      ]);
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
      <div className="page-head" style={{ marginBottom: 'var(--sp-4)' }}>
        <div>
          <span className="page-eyebrow">Program Overview</span>
          <h1 className="page-title" style={{ fontSize: 'var(--fs-3xl)' }}>{program.name}</h1>
          <p className="page-subtitle" style={{ fontSize: 'var(--fs-base)', marginTop: '4px' }}>
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
            disabled={selectedCourses.size === 0}
            onClick={() => setEnrollModalOpen(true)}
          >
            {isProgramExpired ? 'Re-Enroll / Add Courses' : 'Join Program'}
          </Button>
        )}
        {isProgramCompleted && (
          <div className="row" style={{ gap: '8px' }}>
            <Link to="/student/results">
              <Button icon={Award}>View Grades & Results</Button>
            </Link>
            {(program?.certificateTemplateId || programEnrollment?.certificateUrl) && (
              <Link to="/student/certificates">
                <Button variant="outline" icon={FileDown}>Download Certificate</Button>
              </Link>
            )}
          </div>
        )}
      </div>

      {/* PROGRAM COMPLETED / REQUIREMENTS MET BANNER */}
      {isProgramCompleted && bannerVisible && (
        <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #22c55e', padding: '1.25rem 1.5rem', borderRadius: 'var(--radius-md)', color: '#166534', display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: 'var(--sp-6)', position: 'relative' }}>
          <GraduationCap size={32} color="#16a34a" />
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>🎓 All Program Requirements Completed!</h3>
            <p style={{ margin: '4px 0 0', fontSize: '0.9rem', color: '#14532d' }}>
              You have successfully completed all <strong>{completedCoursesCount} / {program.totalSubjects}</strong> courses for <strong>{program.name}</strong>. You can review your complete academic grades and results below.
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
            style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', color: '#166534', opacity: 0.7 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* EXPIRED BANNER */}
      {isProgramExpired && bannerVisible && (
        <div style={{ backgroundColor: '#fef2f2', border: '1px solid #f87171', padding: '1.25rem 1.5rem', borderRadius: 'var(--radius-md)', color: '#991b1b', display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: 'var(--sp-6)', position: 'relative' }}>
          <AlertOctagon size={28} color="#dc2626" />
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>Program Access Expired</h3>
            <p style={{ margin: '4px 0 0', fontSize: '0.9rem', color: '#7f1d1d' }}>
              Your academic duration for this program ended on <strong>{expDate?.toLocaleDateString() || 'the deadline'}</strong>. To continue your learning journey and complete remaining courses, please select courses below to re-enroll.
            </p>
          </div>
          <button 
            onClick={() => setBannerVisible(false)}
            style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', color: '#991b1b', opacity: 0.7 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* NEARING EXPIRY BANNER */}
      {!isProgramExpired && isProgramNearingExpiry && bannerVisible && (
        <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fcd34d', padding: '1.25rem 1.5rem', borderRadius: 'var(--radius-md)', color: '#92400e', display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: 'var(--sp-6)', position: 'relative' }}>
          <AlertTriangle size={28} color="#d97706" />
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>Attention: Program Access Expiring Soon</h3>
            <p style={{ margin: '4px 0 0', fontSize: '0.9rem', color: '#78350f' }}>
              You have <strong>{daysRemaining === 0 ? 'today only' : `${daysRemaining} days remaining`}</strong> (deadline: {expDate?.toLocaleDateString() || 'soon'}) to complete all subjects in this program. Please finish your lessons and exams.
            </p>
          </div>
          <button 
            onClick={() => setBannerVisible(false)}
            style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', color: '#92400e', opacity: 0.7 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* REGULAR ENROLLED BANNER */}
      {isEnrolled && !isProgramExpired && !isProgramNearingExpiry && !isProgramCompleted && bannerVisible && (
        <div style={{ backgroundColor: '#ecfdf5', border: '1px solid #34d399', padding: '1rem 1.5rem', borderRadius: 'var(--radius-md)', color: '#065f46', display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: 'var(--sp-6)', position: 'relative' }}>
          <CheckCircle2 size={24} />
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: 0, fontSize: '1rem' }}>You are enrolled in this Program!</h3>
            <p style={{ margin: 0, fontSize: '0.85rem' }}>Select additional courses below to purchase and add to your curriculum.</p>
          </div>
          <button 
            onClick={() => setBannerVisible(false)}
            style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', color: '#065f46', opacity: 0.7 }}
          >
            ✕
          </button>
        </div>
      )}

      <div>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0 }}>Select Courses to Enroll</h2>
          {selectedCourses.size > 0 && (
            <div className="row" style={{ gap: '1rem', alignItems: 'center', backgroundColor: 'var(--brand-surface)', padding: '0.5rem 1rem', borderRadius: '100px' }}>
              <span style={{ fontWeight: 600, color: 'var(--brand)' }}>{selectedCourses.size} Selected</span>
              <Button size="sm" onClick={() => setEnrollModalOpen(true)}>Proceed to Enroll</Button>
            </div>
          )}
        </div>
        
        {coursesList.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', background: '#f8fafc', borderRadius: '8px' }}>
            No courses available yet.
          </div>
        ) : (
          <div className="course-grid">
            {coursesList.map(course => {
              
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
              
              if (amount === null) {
                if (course.pricing?.isPaid) {
                  amount = course.pricing.amount;
                  currency = course.pricing.currency || 'USD';
                } else if (course.price) {
                  amount = course.price;
                }
              }
              
              if (amount !== null && amount > 0) {
                displayPrice = `${currency} ${Number(amount).toFixed(2)}`;
              }

              const courseId = course.id || course._id;
              const isSelected = selectedCourses.has(courseId);
              const isAlreadyEnrolled = enrolledCourseIds.has(courseId);
              const myEnrollment = enrollmentsMap[courseId];

              return (
                <div 
                  key={courseId} 
                  className="course-card" 
                  onClick={() => {
                    if (isAlreadyEnrolled) return;
                    const newSet = new Set(selectedCourses);
                    if (isSelected) newSet.delete(courseId);
                    else newSet.add(courseId);
                    setSelectedCourses(newSet);
                  }} 
                  style={{ 
                    cursor: isAlreadyEnrolled ? 'default' : 'pointer',
                    border: isSelected ? '2px solid var(--brand)' : isAlreadyEnrolled ? '2px solid #22c55e' : undefined,
                    boxShadow: isSelected ? '0 4px 12px rgba(0,0,0,0.08)' : undefined,
                    backgroundColor: isAlreadyEnrolled ? '#f0fdf4' : undefined,
                    opacity: isAlreadyEnrolled ? 0.9 : 1,
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div className="course-card__thumb" style={{ backgroundImage: (course.thumbnailUrl || course.thumbnail) ? `url('${buildStaticUrl(course.thumbnailUrl || course.thumbnail)}')` : undefined, backgroundColor: isAlreadyEnrolled ? '#22c55e' : isSelected ? 'var(--brand)' : 'var(--brand-surface)' }}>
                    {!(course.thumbnailUrl || course.thumbnail) && <BookOpen size={48} color={(isSelected || isAlreadyEnrolled) ? '#fff' : 'var(--brand)'} />}
                  </div>
                  <div className="course-card__body">
                    <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <h3>{course.title}</h3>
                      <div style={{
                        width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                        border: isSelected || isAlreadyEnrolled ? 'none' : '2px solid #94a3b8',
                        backgroundColor: isAlreadyEnrolled ? '#22c55e' : isSelected ? '#7c3aed' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        {(isSelected || isAlreadyEnrolled) && <CheckCircle2 size={14} color="#fff" />}
                      </div>
                    </div>

                    <div className="course-card__meta">
                      <div className="row" style={{ gap: 'var(--sp-2)', fontSize: 'var(--fs-xs)' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>{course.credits || 0} Credits</span>
                        <span style={{ color: 'var(--border)' }}>|</span>
                        <span style={{ color: 'var(--color-primary-600)' }}>{course.examsCount || 0} Exams</span>
                      </div>
                      
                      {!isAlreadyEnrolled ? (
                        <span className="course-card__price" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {displayPrice}
                        </span>
                      ) : (
                        <div style={{ marginTop: 'var(--sp-2)', fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{ fontWeight: 600, color: '#166534' }}>Enrolled</span>
                          {myEnrollment?.curriculum?.videos && (
                            <div style={{ color: 'var(--brand)', fontWeight: 600 }}>
                              Videos Left: {Math.max(0, myEnrollment.curriculum.videos.total - myEnrollment.curriculum.videos.completed)}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div style={{ marginTop: 'var(--sp-3)' }}>
                      <Button full size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); navigate(`/student/programs/${id}/courses/${courseId}`); }}>
                        Preview Course Details
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
