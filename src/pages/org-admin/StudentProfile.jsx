import * as programsApi from '../../api/programs';
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, BookOpen, Clock, FileText, ChevronDown, ChevronUp, PlayCircle, FileSignature, CheckCircle2, FileDown, Award } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import toast from 'react-hot-toast';
import * as studentsApi from '../../api/students';
import * as contentApi from '../../api/content';
import * as transcriptsApi from '../../api/transcripts';
import * as certificatesApi from '../../api/certificates';
import * as semestersApi from '../../api/semesters';
import Button from '../../components/ui/Button';
import StatusBadge from '../../components/ui/StatusBadge';
import { Card } from '../../components/ui/Card';
import DataTable from '../../components/ui/DataTable';
import PageLoader from '../../components/ui/PageLoader';
import Modal from '../../components/ui/Modal';
import { buildStaticUrl } from '../../api/client';

const PROGRESS_COLORS = ['url(#colorProgress)', '#f1f5f9']; 
const SCORE_COLORS = ['url(#colorPass)', 'url(#colorFail)', '#f1f5f9'];

const Row = ({ label, value }) => (
  <div className="row" style={{ justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
    <span className="text-muted" style={{ fontSize: 'var(--fs-sm)' }}>{label}</span>
    <span style={{ fontWeight: 500, fontSize: 'var(--fs-sm)' }}>{value}</span>
  </div>
);

const getProgramStats = (program) => {
  const courses = Object.values(program?.batches || {}).flatMap(b => Object.values(b?.semesters || {}).flatMap(s => s?.courses || []));
  const completed = courses.filter(c => (c.progressPercentage || 0) >= 100).length;
  const total = program?.totalSubjects || program?.program?.totalSubjects || courses.length || 0;
  return { total, completed, coursesAttached: courses.length };
};

export default function StudentProfile() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [programsList, setProgramsList] = useState([]);
  const [cyclicStatus, setCyclicStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedCourseId, setExpandedCourseId] = useState(null);
  const [generatingCert, setGeneratingCert] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ open: false, type: null, programId: null, batchId: null, courseId: null });
  const [previewPdfData, setPreviewPdfData] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [viewPdfUrl, setViewPdfUrl] = useState(null);
  const [regModal, setRegModal] = useState(false);
  const [newRegId, setNewRegId] = useState('');
  const [savingReg, setSavingReg] = useState(false);
  
  // For lazy loading lessons
  const [lessonsMap, setLessonsMap] = useState({});
  const [lessonsLoading, setLessonsLoading] = useState({});

  useEffect(() => {
    Promise.all([
      studentsApi.getStudentDetails(id),
      import('../../api/client').then(client => client.default.get('/form-questions')),
      programsApi.list({ limit: 100 }).catch(() => ({ data: [] })),
      semestersApi.getStudentCyclicStatus(id).catch(() => null)
    ]).then(([studentRes, questionsRes, programsRes, cyclicRes]) => {
      if (cyclicRes) setCyclicStatus(cyclicRes.data || cyclicRes);
      setData(studentRes.data?.data || studentRes.data);
      setQuestions(questionsRes.data?.data || questionsRes.data || []);
      setProgramsList(programsRes.data?.data || programsRes.data || []);
      
    }).catch((err) => {
      console.error('Failed to load student profile', err);
    }).finally(() => {
      setLoading(false);
    });
  }, [id]);

  useEffect(() => {
    if (confirmModal.open) {
      setPreviewPdfData(null);
      setPreviewLoading(true);
      
      const fetchPreview = async () => {
        try {
          let res;
          if (confirmModal.type === 'degree') {
            res = await certificatesApi.previewDegree({ studentId: id, programId: confirmModal.programId });
          } else {
            res = await certificatesApi.preview({ studentId: id, courseId: confirmModal.courseId });
          }
          setPreviewPdfData(res.data?.data?.base64Pdf);
        } catch (err) {
          toast.error('Failed to load certificate preview');
        } finally {
          setPreviewLoading(false);
        }
      };
      
      fetchPreview();
    }
  }, [confirmModal.open, confirmModal.type, confirmModal.programId, confirmModal.courseId, id]);

  if (loading) return <PageLoader />;
  if (!data || !data.profile) return <div className="page"><p>Student not found.</p></div>;

  const { profile, enrollments, examResults, stats } = data;

  const toggleCourse = async (enrollmentId, targetCourseId) => {
    const courseId = (typeof targetCourseId === 'object' && targetCourseId !== null) 
      ? (targetCourseId.id || targetCourseId._id) 
      : (targetCourseId || enrollmentId);
    const isExpanding = expandedCourseId !== enrollmentId;
    setExpandedCourseId(isExpanding ? enrollmentId : null);
    
    if (isExpanding && courseId && !lessonsMap[courseId] && !lessonsLoading[courseId]) {
      setLessonsLoading(prev => ({ ...prev, [courseId]: true }));
      try {
        // Fetch modules
        const res = await contentApi.listModules(courseId);
        let modules = res.data?.data || res.data || [];

        // For each module, ensure its lessons are loaded
        modules = await Promise.all(modules.map(async (mod) => {
          const modId = mod.id || mod._id;
          if (!mod.lessons || mod.lessons.length === 0) {
            try {
              const lRes = await contentApi.listLessons(courseId, modId);
              mod.lessons = lRes.data?.data || lRes.data || [];
            } catch (e) {
              mod.lessons = [];
            }
          }
          return mod;
        }));
        
        // Populate completed lessons set from enrollment
        const currEnrollment = enrollments.find(e => e.id === enrollmentId || e.courseId === courseId);
        const completedMap = new Set(currEnrollment?.completedLessonIds || []);

        setLessonsMap(prev => ({ 
          ...prev, 
          [courseId]: { modules, completedMap } 
        }));
      } catch (err) {
        console.error(err);
      } finally {
        setLessonsLoading(prev => ({ ...prev, [courseId]: false }));
      }
    }
  };


  const handleUpdateRegistrationId = async (e) => {
    if (e) e.preventDefault();
    setSavingReg(true);
    try {
      await studentsApi.update(id, { registrationId: newRegId.trim() });
      setData(prev => ({
        ...prev,
        profile: { ...prev.profile, registrationId: newRegId.trim() }
      }));
      setRegModal(false);
      toast.success('Registration ID updated successfully!');
    } catch (err) {
      toast.error('Failed to update Registration ID');
    } finally {
      setSavingReg(false);
    }
  };
  const handleDownloadTranscript = async () => {
    const toastId = toast.loading('Generating official semester transcript...');
    try {
      const blob = await transcriptsApi.generate(id, { conduct: 'Satisfactory', awards: 'None' });
      const url = window.URL.createObjectURL(new Blob([blob?.data || blob], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `official-transcript-${(profile.fullName || 'student').replace(/\s+/g, '_')}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      toast.success('Official transcript downloaded successfully!', { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error('Failed to download transcript', { id: toastId });
    }
  };

  const handleIssueDegree = async (programId, batchId) => {
    setConfirmModal({ open: false, type: null, programId: null, batchId: null, courseId: null });
    const toastId = toast.loading('Issuing degree certificate...');
    try {
      const res = await certificatesApi.generateDegree({ studentId: id, programId, batchId });
      toast.success('Degree certificate issued!', { id: toastId });
      if (res.data?.data?.certificateUrl) {
        window.open(res.data.data.certificateUrl, '_blank');
      }
    } catch (err) {
      toast.error('Failed to issue degree certificate', { id: toastId });
    }
  };

  const handleIssueCourseCertificate = async (courseId) => {
    setConfirmModal({ open: false, type: null, programId: null, batchId: null, courseId: null });
    setGeneratingCert(courseId);
    const toastId = toast.loading('Issuing course certificate...');
    try {
      const res = await certificatesApi.generate({ studentId: id, courseId, override: true });
      toast.success('Course certificate issued!', { id: toastId });
      if (res.data?.data?.certificateUrl) {
        window.open(res.data.data.certificateUrl, '_blank');
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to issue course certificate', { id: toastId });
    } finally {
      setGeneratingCert(null);
    }
  };

  // Build Hierarchy
  const programsMap = {};
  enrollments.forEach(e => {
    const pId = e.program?.id || 'standalone';
    const pName = e.program?.name || 'Standalone Courses';
    const bId = e.batch?.id || 'no-batch';
    const bName = e.batch?.name || 'No Batch';
    const sId = e.semester?.id || 'no-semester';
    const sName = e.semester?.term || 'Unassigned Semester';

    // Per user feedback, we don't need standalone courses, but if they exist, group them under "Standalone".
    if (!programsMap[pId]) programsMap[pId] = { name: pName, totalSubjects: e.program?.totalSubjects, program: e.program, batches: {} };
    if (!programsMap[pId].batches[bId]) programsMap[pId].batches[bId] = { name: bName, semesters: {} };
    if (!programsMap[pId].batches[bId].semesters[sId]) programsMap[pId].batches[bId].semesters[sId] = { name: sName, courses: [] };

    programsMap[pId].batches[bId].semesters[sId].courses.push(e);
  });

  return (
    <div className="page">
      <Link to=".." className="row text-muted" style={{ marginBottom: 'var(--sp-4)', fontSize: 'var(--fs-xs)', fontWeight: 600 }}>
        <ArrowLeft size={14} /> Back to students
      </Link>

      <div className="page-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <span className="page-eyebrow">Student Profile</span>
          <div className="row">
            <h1 className="page-title">{profile.fullName}</h1>
            <StatusBadge status={profile.status || 'ACTIVE'} />
          </div>
          <p className="page-subtitle">{profile.email}</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Button
            icon={FileDown}
            variant="primary"
            onClick={handleDownloadTranscript}
            style={{ fontWeight: 700, background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)', color: '#ffffff', boxShadow: '0 4px 14px rgba(79, 70, 229, 0.3)' }}
          >
            Download Official Transcript
          </Button>
        </div>
      </div>

      <div className="form-grid" style={{ marginBottom: 'var(--sp-4)' }}>
        <Card style={{ padding: 'var(--sp-5)' }}>
          <p className="section-title">Personal Details</p>
          <div className="stack" style={{ gap: 8 }}>
            <Row label="Registration ID" value={
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <strong style={{ color: '#4338ca', fontSize: '13px' }}>{profile.registrationId || 'Not Assigned'}</strong>
                <button
                  type="button"
                  onClick={() => { setNewRegId(profile.registrationId || ''); setRegModal(true); }}
                  style={{ background: 'none', border: 'none', color: 'var(--color-primary-600)', cursor: 'pointer', fontSize: '11px', textDecoration: 'underline', fontWeight: 700 }}
                >
                  {profile.registrationId ? 'Edit' : '+ Set ID'}
                </button>
              </div>
            } />
            <Row label="Mobile" value={profile.mobile || '—'} />
            <Row label="Region" value={profile.regionId?.name || profile.regionId || '—'} />
            {questions.slice(0, Math.ceil(questions.length/2)).map(q => {
               let val = profile.customProfile?.[q.key];
               if (q.type === 'CHECKBOX') val = val ? 'Yes' : 'No';
               if (q.key === 'interestedCourse' || /course.*interested|program/i.test(q.label || '')) {
                 const matched = programsList.find(p => p.id === val || p._id === val);
                 if (matched) val = matched.name;
               }
               return <Row key={q.id} label={q.label} value={val || '—'} />
            })}
          </div>
        </Card>
        <Card style={{ padding: 'var(--sp-5)' }}>
          <p className="section-title">Additional Details</p>
          <div className="stack" style={{ gap: 8 }}>
            {questions.slice(Math.ceil(questions.length/2)).map(q => {
               let val = profile.customProfile?.[q.key];
               if (q.type === 'CHECKBOX') val = val ? 'Yes' : 'No';
               if (q.key === 'interestedCourse' || /course.*interested|program/i.test(q.label || '')) {
                 const matched = programsList.find(p => p.id === val || p._id === val);
                 if (matched) val = matched.name;
               }
               return <Row key={q.id} label={q.label} value={val || '—'} />
            })}
          </div>
        </Card>
      </div>

      {/* Overall Course Completion Metrics */}
      {(() => {
        const globalCompleted = (enrollments || []).filter(e => (e.progressPercentage || 0) >= 100).length;
        const globalTotal = enrollments?.[0]?.program?.totalSubjects || enrollments?.length || 0;
        return (
          <div className="form-grid" style={{ marginBottom: 'var(--sp-8)' }}>
            <Card style={{ padding: 'var(--sp-5)' }}>
              <p className="section-title">Education & Submitted Documents</p>
              <div className="stack" style={{ gap: 8 }}>
                <Row label="Track" value={
                  <span style={{ padding: '3px 8px', borderRadius: '4px', background: profile.ataStatus === 'ATA' ? '#e0e7ff' : '#f1f5f9', color: profile.ataStatus === 'ATA' ? '#4338ca' : '#475569', fontWeight: 700, fontSize: '12px' }}>
                    {profile.ataStatus === 'ATA' ? 'ATA (Asia Theological Association)' : 'NON-ATA'}
                  </span>
                } />
                <Row label="Citizenship" value={profile.customProfile?.countryOfCitizenship || '—'} />
                <Row label="Country Living In" value={profile.customProfile?.countryLivingIn || '—'} />
                <Row label="Photo" value={profile.customProfile?.documents?.photo ? <img src={buildStaticUrl(profile.customProfile.documents.photo)} alt="Student Photo" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 'var(--radius-md)' }} /> : '—'} />
                
                {/* Aadhaar Front & Back */}
                {profile.customProfile?.documents?.aadhaarFront && (
                  <Row label="Aadhaar Front" value={
                    <button type="button" onClick={() => { const t = profile.customProfile.documents.aadhaarFront; setViewPdfUrl(typeof t === 'object' && t ? t.url : t); }} style={{ background: 'none', border: 'none', color: 'var(--color-primary-600)', cursor: 'pointer', fontWeight: 600 }}>
                      📄 View Aadhaar Front
                    </button>
                  } />
                )}
                {profile.customProfile?.documents?.aadhaarBack && (
                  <Row label="Aadhaar Back" value={
                    <button type="button" onClick={() => { const t = profile.customProfile.documents.aadhaarBack; setViewPdfUrl(typeof t === 'object' && t ? t.url : t); }} style={{ background: 'none', border: 'none', color: 'var(--color-primary-600)', cursor: 'pointer', fontWeight: 600 }}>
                      📄 View Aadhaar Back
                    </button>
                  } />
                )}

                {/* 10th, Inter, Degree, Transcript */}
                {profile.customProfile?.documents?.tenthCert && (
                  <Row label="10th / SSC" value={
                    <button type="button" onClick={() => { const t = profile.customProfile.documents.tenthCert; setViewPdfUrl(typeof t === 'object' && t ? t.url : t); }} style={{ background: 'none', border: 'none', color: 'var(--color-primary-600)', cursor: 'pointer', fontWeight: 600 }}>
                      📄 View 10th Certificate
                    </button>
                  } />
                )}
                {profile.customProfile?.documents?.interCert && (
                  <Row label="Inter / 12th" value={
                    <button type="button" onClick={() => { const t = profile.customProfile.documents.interCert; setViewPdfUrl(typeof t === 'object' && t ? t.url : t); }} style={{ background: 'none', border: 'none', color: 'var(--color-primary-600)', cursor: 'pointer', fontWeight: 600 }}>
                      📄 View Inter Certificate
                    </button>
                  } />
                )}
                {profile.customProfile?.documents?.degreeCert && (
                  <Row label="Degree Cert" value={
                    <button type="button" onClick={() => { const t = profile.customProfile.documents.degreeCert; setViewPdfUrl(typeof t === 'object' && t ? t.url : t); }} style={{ background: 'none', border: 'none', color: 'var(--color-primary-600)', cursor: 'pointer', fontWeight: 600 }}>
                      📄 View Degree Certificate
                    </button>
                  } />
                )}
                {profile.customProfile?.documents?.degreeTranscript && (
                  <Row label="Transcript" value={
                    <button type="button" onClick={() => { const t = profile.customProfile.documents.degreeTranscript; setViewPdfUrl(typeof t === 'object' && t ? t.url : t); }} style={{ background: 'none', border: 'none', color: '#b45309', cursor: 'pointer', fontWeight: 700 }}>
                      📜 View Degree Transcript
                    </button>
                  } />
                )}
                {profile.customProfile?.documents?.referenceLetter && (
                  <Row label="Reference" value={
                    <button type="button" onClick={() => { const t = profile.customProfile.documents.referenceLetter; setViewPdfUrl(typeof t === 'object' && t ? t.url : t); }} style={{ background: 'none', border: 'none', color: 'var(--color-primary-600)', cursor: 'pointer', fontWeight: 600 }}>
                      📄 View Reference Letter
                    </button>
                  } />
                )}

                {/* Other Certificates */}
                {profile.customProfile?.documents?.otherCertificates?.length > 0 && (
                  <Row label="Other Docs" value={
                    <div className="stack" style={{ gap: 4 }}>
                      {profile.customProfile.documents.otherCertificates.map((doc, idx) => (
                        <button key={idx} type="button" onClick={() => { const t = doc; setViewPdfUrl(typeof t === 'object' && t ? t.url : t); }} style={{ background: 'none', border: 'none', color: 'var(--color-primary-600)', cursor: 'pointer', fontWeight: 500, textAlign: 'left' }}>
                          📄 {typeof doc === 'object' && doc.name ? doc.name : `Certificate ${idx + 1}`}
                        </button>
                      ))}
                    </div>
                  } />
                )}
              </div>
            </Card>
            <Card style={{ padding: 'var(--sp-5)' }}>
              <p className="section-title">Academic Summary</p>
              <div className="stack" style={{ gap: 8 }}>
                <Row label="Courses Completed" value={
                  <span style={{ fontWeight: 800, color: '#15803d', background: '#dcfce7', padding: '3px 10px', borderRadius: '6px', fontSize: '13px' }}>
                    {globalCompleted} / {globalTotal}
                  </span>
                } />
                <Row label="Enrolled Courses" value={stats.totalCourses} />
                <Row label="Exams Taken" value={stats.totalExamsAttempted} />
                <Row label="Registered On" value={profile.createdAt ? new Date(profile.createdAt).toLocaleDateString() : '—'} />
                <Row label="Account Status" value={profile.status || 'ACTIVE'} />
              </div>
            </Card>
          </div>
        );
      })()}

      
      {/* ATA ACADEMIC CAROUSEL & BACKLOG QUEUE */}
      {cyclicStatus && (
        <Card style={{ padding: 'var(--sp-6)', marginBottom: 'var(--sp-6)', border: '1.5px solid #c7d2fe', background: 'linear-gradient(135deg, #f8faff 0%, #eef2ff 100%)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ width: 36, height: 36, borderRadius: '10px', background: '#4338ca', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
                🔄
              </span>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#1e1b4b' }}>ATA Academic Carousel & Backlog Queue</h3>
                <p style={{ margin: 0, fontSize: '13px', color: '#6366f1' }}>Single-attempt exam cycle & semester rollover tracking</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <span style={{ padding: '4px 12px', background: '#4338ca', color: '#fff', borderRadius: '20px', fontSize: '12px', fontWeight: 700 }}>
                Cycle Round {cyclicStatus.cyclicProgress?.currentCycleRound || 1}
              </span>
              <span style={{ padding: '4px 12px', background: '#e0e7ff', color: '#3730a3', borderRadius: '20px', fontSize: '12px', fontWeight: 700 }}>
                Active: Semester {cyclicStatus.currentSemesterIndex || 1}
              </span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '16px' }}>
            <div style={{ padding: '12px 16px', background: '#fff', borderRadius: '8px', border: '1px solid #e0e7ff' }}>
              <span style={{ fontSize: '12px', color: '#64748b' }}>Passed Subjects</span>
              <h4 style={{ margin: '4px 0 0', fontSize: '20px', fontWeight: 800, color: '#15803d' }}>
                {cyclicStatus.passedCount || 0} / {cyclicStatus.totalSubjects || 30}
              </h4>
            </div>
            <div style={{ padding: '12px 16px', background: '#fff', borderRadius: '8px', border: '1px solid #e0e7ff' }}>
              <span style={{ fontSize: '12px', color: '#64748b' }}>Queued Backlogs</span>
              <h4 style={{ margin: '4px 0 0', fontSize: '20px', fontWeight: 800, color: (cyclicStatus.backlogCount > 0 ? '#b91c1c' : '#64748b') }}>
                {cyclicStatus.backlogCount || 0} Subjects
              </h4>
            </div>
            <div style={{ padding: '12px 16px', background: '#fff', borderRadius: '8px', border: '1px solid #e0e7ff' }}>
              <span style={{ fontSize: '12px', color: '#64748b' }}>Next Retake Window</span>
              <h4 style={{ margin: '4px 0 0', fontSize: '14px', fontWeight: 700, color: '#4338ca' }}>
                {cyclicStatus.backlogCount > 0 ? 'On Cycle Return to Sem 1' : 'No Active Backlogs'}
              </h4>
            </div>
          </div>

          {cyclicStatus.backlogCourses && cyclicStatus.backlogCourses.length > 0 && (
            <div style={{ padding: '12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px' }}>
              <strong style={{ fontSize: '13px', color: '#991b1b' }}>Queued Backlog Subjects (Retake on Cycle Return):</strong>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                {cyclicStatus.backlogCourses.map((c, i) => (
                  <span key={i} style={{ padding: '3px 10px', background: '#fff', border: '1px solid #fca5a5', borderRadius: '6px', fontSize: '12px', color: '#b91c1c', fontWeight: 600 }}>
                    ⚠️ {c.title || c.id}
                  </span>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {Object.keys(programsMap).length === 0 ? (
        <Card style={{ padding: 'var(--sp-8)', textAlign: 'center', color: 'var(--text-muted)' }}>
          <BookOpen size={32} style={{ margin: '0 auto var(--sp-4)', opacity: 0.5 }} />
          <p>No courses enrolled yet.</p>
        </Card>
      ) : (
        <div className="stack" style={{ gap: 'var(--sp-12)' }}>
          {Object.entries(programsMap).map(([pId, program]) => (
            <div key={pId}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-6)', borderBottom: '2px solid var(--border)', paddingBottom: 'var(--sp-2)', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <h1 style={{ fontSize: 'var(--fs-3xl)', fontWeight: 800, color: 'var(--color-primary-800)', margin: 0 }}>
                    {program.name}
                  </h1>
                  {(() => {
                    if (!program.expectedGraduationDate) return null;
                    const expDate = new Date(program.expectedGraduationDate);
                    const now = new Date();
                    const diffDays = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                    const isCompleted = getProgramStats(program).completed >= getProgramStats(program).total;
                    
                    if (isCompleted) {
                      return (
                        <span style={{ padding: '6px 14px', borderRadius: '20px', background: '#dcfce7', border: '1px solid #86efac', color: '#15803d', fontWeight: 800, fontSize: '13px' }}>
                          🎓 Program Requirements Completed
                        </span>
                      );
                    }
                    
                    if (diffDays < 0) {
                      return (
                        <span style={{ padding: '6px 14px', borderRadius: '20px', background: '#fee2e2', border: '1px solid #f87171', color: '#991b1b', fontWeight: 800, fontSize: '13px' }}>
                          ⚠️ Expired on: {expDate.toLocaleDateString()} ({Math.abs(diffDays)}d overdue)
                        </span>
                      );
                    }
                    
                    if (diffDays <= 10) {
                      return (
                        <span style={{ padding: '6px 14px', borderRadius: '20px', background: '#fef3c7', border: '1px solid #fcd34d', color: '#92400e', fontWeight: 800, fontSize: '13px' }}>
                          ⚠️ Deadline in {diffDays === 0 ? 'Today!' : `${diffDays} days`} ({expDate.toLocaleDateString()})
                        </span>
                      );
                    }
                    
                    return (
                      <span style={{ padding: '6px 14px', borderRadius: '20px', background: '#fef3c7', border: '1px solid #fde68a', color: '#92400e', fontWeight: 700, fontSize: '13px' }}>
                        <Clock size={12} style={{ display: 'inline', marginBottom: 2, marginRight: 4 }} /> 
                        Expected Graduation: {expDate.toLocaleDateString()}
                      </span>
                    );
                  })()}
                  <span style={{ padding: '6px 14px', borderRadius: '20px', background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', fontWeight: 800, fontSize: '13px' }}>
                    Degree Progress: {getProgramStats(program).completed} / {getProgramStats(program).total} Subjects Completed
                  </span>
                  <span style={{ padding: '6px 14px', borderRadius: '20px', background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', fontWeight: 700, fontSize: '13px' }}>
                    Enrolled: {getProgramStats(program).coursesAttached} Courses
                  </span>
                </div>
                  {/* <div className="row" style={{ gap: '8px' }}>
                    <Button icon={FileDown} size="sm" onClick={handleDownloadTranscript}>
                      Download Transcript
                    </Button>
                  </div> */}
                </div>

              {/* Official Academic Grades & Transcript Summary Table */}
              {(() => {
                const programCourses = [];
                Object.values(program.batches).forEach(b => {
                  Object.values(b.semesters).forEach(s => {
                    s.courses.forEach(c => programCourses.push(c));
                  });
                });

                if (programCourses.length === 0) return null;

                let totalCredits = 0;
                let totalMarks = 0;
                let totalPoints = 0;
                let gradedCredits = 0;

                const GRADE_POINTS = { 'A+': 4.3, 'A': 4.0, 'A-': 3.7, 'B+': 3.3, 'B': 3.0, 'B-': 2.7, 'C+': 2.3, 'C': 2.0, 'C-': 1.7, 'D+': 1.3, 'D': 1.0, 'D-': 0.7, 'F': 0.0 };

                programCourses.forEach(c => {
                  const credits = Number(c.course?.credits || 0);
                  totalCredits += credits;
                  if (c.grade?.totalScore !== undefined && c.grade?.totalScore !== null) {
                    totalMarks += Number(c.grade.totalScore || 0);
                    const pts = (GRADE_POINTS[c.grade.grade] ?? 0);
                    totalPoints += pts * (credits || 1);
                    gradedCredits += (credits || 1);
                  }
                });

                const cumulativeGpa = gradedCredits > 0 ? (totalPoints / gradedCredits).toFixed(2) : '—';

                return (
                  <div style={{ marginBottom: 'var(--sp-6)', background: 'var(--bg-surface-card)', padding: '20px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
                    <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                      <div>
                        <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Award size={18} color="var(--accent)" />
                          Academic Grades & Cumulative Transcript
                        </h3>
                        <p className="text-muted" style={{ fontSize: '13px', margin: '4px 0 0' }}>Comprehensive course-by-course grading, credit hours, and GPA breakdown.</p>
                      </div>
                      <div className="row" style={{ gap: '10px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 700, background: '#eff6ff', color: '#1e40af', padding: '6px 14px', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                          Cumulative GPA: {cumulativeGpa}
                        </span>
                      </div>
                    </div>

                    <DataTable
                      columns={[
                        { key: 'course', header: 'Course Name', render: (r) => <span style={{ fontWeight: 600 }}>{r.courseTitle || r.course?.title || '—'}</span> },
                        { key: 'credits', header: 'Credit Earned', render: (r) => Number(r.course?.credits || 0).toFixed(0) },
                        { key: 'assignment', header: 'CIA (65)', render: (r) => r.grade ? `${r.grade.assignmentScore ?? '—'} / 65` : '—' },
                        { key: 'attendance', header: 'Attendance (5)', render: (r) => r.grade ? `${r.grade.attendanceScore ?? 5} / 5` : '—' },
                        { key: 'exam', header: 'Final Exam (30)', render: (r) => r.grade ? `${r.grade.finalExamScore ?? '—'} / 30` : '—' },
                        { key: 'marks', header: 'Marks (100)', render: (r) => r.grade ? <strong>{r.grade.totalScore ?? '—'}</strong> : '—' },
                        { key: 'grade', header: 'Grade', render: (r) => r.grade?.grade ? <StatusBadge status={r.grade.grade === 'F' ? 'FAILED' : 'SUCCESS'} label={r.grade.grade} /> : <span className="text-muted">—</span> },
                        { key: 'points', header: 'GPA Points', render: (r) => r.grade?.grade ? (GRADE_POINTS[r.grade.grade] ?? 0).toFixed(1) : '—' },
                        { 
                          key: 'status', 
                          header: 'Status', 
                          render: (r) => {
                            if (r.grade?.grade === 'F') return <StatusBadge status="FAILED" label="FAILED" tone="crimson" />;
                            if (r.grade?.grade) return <StatusBadge status="COMPLETED" label="GRADED" tone="success" />;
                            if ((r.progressPercentage || 0) >= 100) return <StatusBadge status="COMPLETED" label="COMPLETED" tone="amber" />;
                            return <StatusBadge status={r.status || 'ACTIVE'} label={`${r.progressPercentage || 0}% In Progress`} tone="info" />;
                          } 
                        }
                      ]}
                      rows={programCourses}
                      footerRow={{
                        course: 'Cumulative Total',
                        credits: totalCredits,
                        assignment: '',
                        exam: '',
                        marks: totalMarks,
                        grade: '',
                        points: `GPA: ${cumulativeGpa}`,
                        status: ''
                      }}
                    />
                  </div>
                );
              })()}

              <div className="stack" style={{ gap: 'var(--sp-10)' }}>
                {Object.entries(program.batches).map(([bId, batch]) => (
                  <div key={bId} style={{ paddingLeft: 'var(--sp-4)', borderLeft: '3px solid var(--border)' }}>
                    {/* Batch Header */}
                    {bId !== 'no-batch' && (
                      <h2 style={{ fontSize: 'var(--fs-xl)', fontWeight: 700, marginBottom: 'var(--sp-6)', color: 'var(--text)' }}>
                        {batch.name}
                      </h2>
                    )}

                    <div className="stack" style={{ gap: 'var(--sp-8)' }}>
                      {Object.entries(batch.semesters).map(([sId, semester]) => (
                        <div key={sId}>
                          {/* Semester Header */}
                          {sId !== 'no-semester' && semester.name !== 'Unassigned Semester' && semester.name && (
                            <h3 style={{ fontSize: 'var(--fs-lg)', fontWeight: 600, marginBottom: 'var(--sp-4)', color: 'var(--text-muted)' }}>
                              {semester.name}
                            </h3>
                          )}

                          {/* Courses Grid */}
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--sp-5)', alignItems: 'start' }}>
                            {semester.courses.map(enrollment => {
                              const courseIdObj = (typeof enrollment.courseId === 'object' && enrollment.courseId !== null) ? enrollment.courseId : (enrollment.course || {});
                              const actualCourseId = courseIdObj.id || courseIdObj._id || enrollment.courseId;
                              const courseExams = (examResults || []).filter(e => (e.exam?.courseId === actualCourseId || e.courseId === actualCourseId || e.course_id === actualCourseId));
                              let progress = enrollment.progressPercentage || 0;
                              
                              if (progress === 0 && enrollment.curriculum) {
                                const c = enrollment.curriculum;
                                const totalItems = (c.videos?.total || 0) + (c.exams?.total || 0) + (c.assignments?.total || 0);
                                const completedItems = (c.videos?.completed || 0) + (c.exams?.completed || 0) + (c.assignments?.completed || 0);
                                if (totalItems > 0) {
                                  progress = Math.round((completedItems / totalItems) * 100);
                                }
                              }

                              const progressData = [
                                { name: 'Completed', value: progress },
                                { name: 'Remaining', value: 100 - progress }
                              ];
                              const isExpanded = expandedCourseId === enrollment.id;

                              return (
                                <Card 
                                  key={enrollment.id} 
                                  style={{ 
                                    overflow: 'hidden', 
                                    gridColumn: isExpanded ? '1 / -1' : 'auto',
                                    transition: 'all 0.2s ease-in-out',
                                    border: isExpanded ? '2px solid var(--color-primary-500)' : '1px solid var(--border)',
                                    cursor: 'pointer'
                                  }}
                                  onClick={() => !isExpanded && toggleCourse(enrollment.id, actualCourseId)}
                                >
                                  {/* CARD HEADER (Always Visible) */}
                                  <div style={{ padding: 'var(--sp-5)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                      <h3 style={{ fontSize: 'var(--fs-md)', fontWeight: 600, marginBottom: 'var(--sp-2)', color: isExpanded ? 'var(--color-primary-700)' : 'inherit' }}>
                                        {enrollment.courseTitle || enrollment.course?.title || 'Unknown Course'}
                                      </h3>
                                      <div className="row text-muted" style={{ fontSize: 'var(--fs-xs)', gap: 'var(--sp-3)' }}>
                                        <span className="row"><Clock size={12} style={{ marginRight: 4 }} /> {new Date(enrollment.createdAt).toLocaleDateString()}</span>
                                        <StatusBadge status={enrollment.status} />
                                      </div>
                                    </div>
                                    
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-4)' }}>
                                      {!isExpanded && (
                                        <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center' }}>
                                          {enrollment.grade && (
                                            <span style={{ marginRight: 16, fontSize: 'var(--fs-sm)', fontWeight: 600, color: 'var(--color-primary-600)', background: 'var(--color-primary-50)', padding: '4px 8px', borderRadius: 4 }}>
                                              Grade: {enrollment.grade.grade} ({enrollment.grade.totalScore})
                                            </span>
                                          )}
                                          <p style={{ fontSize: 'var(--fs-lg)', fontWeight: 700, color: 'var(--color-primary-600)', margin: 0 }}>{progress}%</p>
                                        </div>
                                      )}
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); toggleCourse(enrollment.id, actualCourseId); }}
                                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}
                                      >
                                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                      </button>
                                    </div>
                                  </div>

                                  {/* Actions Row */}
                                  {/* {isExpanded && (
                                    <div style={{ padding: '8px 16px', background: 'var(--color-primary-50)', borderTop: '1px solid var(--color-primary-100)', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                        <Button 
                                          size="sm" 
                                          variant="primary" 
                                          icon={FileSignature} 
                                          loading={generatingCert === enrollment.courseId}
                                          onClick={(e) => { e.stopPropagation(); setConfirmModal({ open: true, type: 'course', courseId: enrollment.courseId }); }}
                                        >
                                          Issue Certificate
                                        </Button>
                                    </div>
                                  )} */}

                                  {/* EXPANDED CONTENT */}
                                  {isExpanded && (
                                    <div style={{ borderTop: '1px solid var(--border)', cursor: 'default' }} onClick={(e) => e.stopPropagation()}>
                                      
                                      {/* Infographic Section */}
                                      <div style={{ padding: 'var(--sp-6)', display: 'flex', gap: 'var(--sp-8)', alignItems: 'center', flexWrap: 'wrap', backgroundColor: '#f8fafc' }}>
                                        <div style={{ width: 160, height: 160, position: 'relative' }}>
                                          <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                              <defs>
                                                <linearGradient id="colorProgress" x1="0" y1="0" x2="1" y2="1">
                                                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={1}/>
                                                  <stop offset="95%" stopColor="#ec4899" stopOpacity={1}/>
                                                </linearGradient>
                                              </defs>
                                              <Pie
                                                data={progressData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={55}
                                                outerRadius={75}
                                                paddingAngle={0}
                                                dataKey="value"
                                                stroke="none"
                                                cornerRadius={progress > 0 ? 10 : 0}
                                              >
                                                {progressData.map((entry, index) => (
                                                  <Cell key={`cell-${index}`} fill={PROGRESS_COLORS[index]} />
                                                ))}
                                              </Pie>
                                              <Tooltip formatter={(value) => `${value}%`} />
                                            </PieChart>
                                          </ResponsiveContainer>
                                          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', pointerEvents: 'none' }}>
                                            <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>Progress</span>
                                            <span style={{ fontSize: 'var(--fs-2xl)', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{progress}%</span>
                                          </div>
                                        </div>

                                        <div style={{ flex: 1, minWidth: 200 }}>
                                          <h4 style={{ fontSize: 'var(--fs-md)', fontWeight: 600, marginBottom: 'var(--sp-2)' }}>Course Insights</h4>
                                          <p style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-sm)', marginBottom: 'var(--sp-4)' }}>
                                            This student has completed {progress}% of the required material.
                                          </p>
                                          <div style={{ display: 'flex', gap: 'var(--sp-4)', marginBottom: 'var(--sp-4)' }}>
                                            <div style={{ padding: 'var(--sp-3)', backgroundColor: 'white', borderRadius: 8, border: '1px solid var(--border)', flex: 1 }}>
                                              <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>Highest Score</p>
                                              <p style={{ fontSize: 'var(--fs-lg)', fontWeight: 600 }}>{courseExams.length > 0 ? Math.max(...courseExams.map(e => e.marksObtained ?? e.score ?? 0)) : 0}</p>
                                            </div>
                                            <div style={{ padding: 'var(--sp-3)', backgroundColor: 'white', borderRadius: 8, border: '1px solid var(--border)', flex: 1 }}>
                                              <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>Exams Passed</p>
                                              <p style={{ fontSize: 'var(--fs-lg)', fontWeight: 600 }}>{courseExams.filter(e => e.isPassed).length}</p>
                                            </div>
                                          </div>
                                          
                                          {(() => {
                                            const vqExams = courseExams.filter(e => !e.exam?.isFinalExam);
                                            const finalExams = courseExams.filter(e => e.exam?.isFinalExam);
                                            const vqPassedCount = vqExams.filter(e => e.isPassed).length;
                                            const vqTotalCount = vqExams.length;

                                            const isDminProg = /ministry|dmin/i.test(student?.program?.name || student?.degree || student?.department || '');
                                            const ciaW = isDminProg ? 55 : 65;
                                            const attW = 5;
                                            const examW = isDminProg ? 40 : 30;

                                            // Calculate live score
                                            let autoAssessment = enrollment.grade?.assignmentScore !== undefined && enrollment.grade?.assignmentScore !== null
                                              ? Number(enrollment.grade.assignmentScore)
                                              : (vqTotalCount > 0 ? Math.round(((vqPassedCount / vqTotalCount) * ciaW * 100)) / 100 : 0);

                                            let finalExamScoreWeighted = enrollment.grade?.finalExamScore !== undefined && enrollment.grade?.finalExamScore !== null
                                              ? Number(enrollment.grade.finalExamScore)
                                              : (finalExams.length > 0 && finalExams[0].marksObtained !== undefined ? Math.round((Number(finalExams[0].marksObtained) / (finalExams[0].exam?.totalMarks || 100)) * examW * 100) / 100 : 0);

                                            const compTotal = Math.min(100, Math.round((autoAssessment + attW + finalExamScoreWeighted) * 100) / 100);
                                            const getGradeLetter = (s) => s >= 80 ? 'A+' : s >= 75 ? 'A' : s >= 70 ? 'A-' : s >= 65 ? 'B+' : s >= 60 ? 'B' : s >= 55 ? 'B-' : s >= 50 ? 'C+' : s >= 45 ? 'C' : s >= 40 ? 'C-' : 'F';
                                            const compGrade = getGradeLetter(compTotal);

                                            return (
                                              <div>
                                                <h5 style={{ fontSize: 'var(--fs-sm)', fontWeight: 600, marginBottom: 'var(--sp-2)' }}>Curriculum Breakdown</h5>
                                                <div className="stack" style={{ gap: 'var(--sp-2)' }}>
                                                  <div className="row" style={{ justifyContent: 'space-between', fontSize: 'var(--fs-xs)' }}>
                                                    <span className="row" style={{ color: 'var(--text-muted)' }}><PlayCircle size={14} style={{ marginRight: 6, color: '#3b82f6' }} /> Videos Watched</span>
                                                    <span style={{ fontWeight: 600 }}>{enrollment.curriculum?.videos?.completed || 0} / {enrollment.curriculum?.videos?.total || 0}</span>
                                                  </div>
                                                  <div className="row" style={{ justifyContent: 'space-between', fontSize: 'var(--fs-xs)' }}>
                                                    <span className="row" style={{ color: 'var(--text-muted)' }}><FileText size={14} style={{ marginRight: 6, color: '#8b5cf6' }} /> Internal Assessments (Video Quizzes & Checkpoints)</span>
                                                    <span style={{ fontWeight: 600 }}>{vqPassedCount} / {vqTotalCount} Questions Passed</span>
                                                  </div>
                                                  <div className="row" style={{ justifyContent: 'space-between', fontSize: 'var(--fs-xs)' }}>
                                                    <span className="row" style={{ color: 'var(--text-muted)' }}><CheckCircle2 size={14} style={{ marginRight: 6, color: '#f59e0b' }} /> Final Exam</span>
                                                    <span style={{ fontWeight: 600 }}>{finalExams.length > 0 ? (finalExams[0].isPassed ? 'Completed (Passed)' : 'Submitted') : 'Not Attempted Yet'}</span>
                                                  </div>
                                                </div>

                                                <div style={{ marginTop: 'var(--sp-4)', padding: 'var(--sp-3)', backgroundColor: '#f0f9ff', borderRadius: 8, border: '1px solid #bae6fd' }}>
                                                  <h5 style={{ fontSize: 'var(--fs-sm)', fontWeight: 600, color: '#0369a1', marginBottom: 'var(--sp-2)' }}>{ciaW} / {attW} / {examW} Academic Grade Weightage</h5>
                                                  <div className="row" style={{ justifyContent: 'space-between', fontSize: 'var(--fs-xs)', marginBottom: 4 }}>
                                                    <span>Internal Continuous Assessment ({ciaW}%):</span>
                                                    <strong style={{ color: '#4f46e5' }}>{enrollment.grade?.assignmentScore ?? autoAssessment} / {ciaW}</strong>
                                                  </div>
                                                  <div className="row" style={{ justifyContent: 'space-between', fontSize: 'var(--fs-xs)', marginBottom: 4 }}>
                                                    <span>Live Session Attendance ({attW}%):</span>
                                                    <strong style={{ color: '#059669' }}>{enrollment.grade?.attendanceScore ?? attW} / {attW}</strong>
                                                  </div>
                                                  <div className="row" style={{ justifyContent: 'space-between', fontSize: 'var(--fs-xs)', marginBottom: 4 }}>
                                                    <span>Course Final Exam ({examW}%):</span>
                                                    <strong>{finalExamScoreWeighted} / {examW}</strong>
                                                  </div>
                                                  <div className="row" style={{ justifyContent: 'space-between', fontSize: 'var(--fs-xs)', fontWeight: 700, borderTop: '1px dashed #7dd3fc', paddingTop: 4 }}>
                                                    <span>Total Composite Score:</span>
                                                    <strong style={{ color: '#0284c7' }}>{compTotal} / 100 ({compGrade})</strong>
                                                  </div>
                                                </div>
                                              </div>
                                            );
                                          })()}

                                          {enrollment.grade && (
                                            <div style={{ marginTop: 'var(--sp-4)', padding: 'var(--sp-3)', backgroundColor: '#f0f9ff', borderRadius: 8, border: '1px solid #bae6fd' }}>
                                              <h5 style={{ fontSize: 'var(--fs-sm)', fontWeight: 600, color: '#0369a1', marginBottom: 'var(--sp-2)' }}>70/30 Composite Grade</h5>
                                              <div className="row" style={{ justifyContent: 'space-between', fontSize: 'var(--fs-xs)', marginBottom: 4 }}>
                                                <span>Automated Assessment (70%):</span>
                                                <strong>{enrollment.grade.assignmentScore} / 70</strong>
                                              </div>
                                              <div className="row" style={{ justifyContent: 'space-between', fontSize: 'var(--fs-xs)', marginBottom: 4 }}>
                                                <span>Faculty Manual Entry (30%):</span>
                                                <strong>{enrollment.grade.finalExamScore} / 30</strong>
                                              </div>
                                              <div className="row" style={{ justifyContent: 'space-between', fontSize: 'var(--fs-xs)', fontWeight: 700, borderTop: '1px dashed #7dd3fc', paddingTop: 4 }}>
                                                <span>Total Score & Letter Grade:</span>
                                                <strong style={{ color: '#0284c7' }}>{enrollment.grade.totalScore} / 100 ({enrollment.grade.grade})</strong>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      </div>

                                      {/* Curriculum Details (Lessons & Exams) */}
                                      <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                                        {/* Lessons Section */}
                                        <div style={{ flex: 1, minWidth: 300, padding: 'var(--sp-5)', borderRight: '1px solid var(--border)' }}>
                                          <h4 style={{ fontSize: 'var(--fs-sm)', fontWeight: 600, marginBottom: 'var(--sp-4)' }} className="row">
                                            <PlayCircle size={14} style={{ marginRight: 6 }} /> Detailed Lessons List
                                          </h4>
                                          {lessonsLoading[actualCourseId] ? (
                                            <div style={{ padding: 'var(--sp-4)', textAlign: 'center' }}><PageLoader /></div>
                                          ) : lessonsMap[actualCourseId]?.modules?.length > 0 ? (
                                            <div className="stack" style={{ gap: 'var(--sp-4)' }}>
                                              {lessonsMap[actualCourseId].modules.map(module => (
                                                <div key={module.id || module._id} style={{ border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
                                                  <div style={{ backgroundColor: '#f1f5f9', padding: 'var(--sp-2) var(--sp-3)', fontSize: 'var(--fs-sm)', fontWeight: 600 }}>
                                                    {module.title}
                                                  </div>
                                                  <div className="stack">
                                                    {(module.lessons || []).map(lesson => {
                                                      const isDone = lessonsMap[actualCourseId].completedMap.has(lesson.id || lesson._id);
                                                      return (
                                                        <div key={lesson.id || lesson._id} className="row" style={{ padding: 'var(--sp-2) var(--sp-3)', borderTop: '1px solid var(--border)', fontSize: 'var(--fs-sm)', justifyContent: 'space-between' }}>
                                                          <span className="row" style={{ color: isDone ? 'var(--text)' : 'var(--text-muted)' }}>
                                                            <PlayCircle size={14} style={{ marginRight: 8, opacity: 0.7 }} /> {lesson.title}
                                                          </span>
                                                          {isDone && <CheckCircle2 size={16} color="#10b981" />}
                                                        </div>
                                                      );
                                                    })}
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          ) : (
                                            <p className="text-muted" style={{ fontSize: 'var(--fs-sm)' }}>No lessons available for this course.</p>
                                          )}
                                        </div>

                                        {/* Exams Section */}
                                        <div style={{ flex: 1, minWidth: 300, padding: 'var(--sp-5)' }}>
                                          <h4 style={{ fontSize: 'var(--fs-sm)', fontWeight: 600, marginBottom: 'var(--sp-4)' }} className="row">
                                            <FileText size={14} style={{ marginRight: 6 }} /> Detailed Exam History
                                          </h4>
                                          {courseExams.length > 0 ? (
                                            <DataTable
                                              columns={[
                                                { key: 'exam', header: 'Exam Name', render: (r) => (
                                                  <div>
                                                    <span style={{ fontWeight: 500 }}>{r.exam?.title || '—'} {r.attemptNumber ? `(Attempt ${r.attemptNumber})` : ''}</span>
                                                    {r.exam?.isFinalExam && <StatusBadge status="FINAL" style={{ marginLeft: 8 }} />}
                                                  </div>
                                                )},
                                                { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
                                                { key: 'score', header: 'Score', render: (r) => {
                                                  const max = r.exam?.totalMarks || 100;
                                                  const score = r.marksObtained ?? r.score ?? 0;
                                                  const pass = r.isPassed;
                                                  return (
                                                    <div className="row" style={{ gap: 'var(--sp-3)' }}>
                                                      <span style={{ fontWeight: 600, fontSize: 'var(--fs-md)', color: pass ? '#10b981' : (r.status === 'SUBMITTED' ? '#ef4444' : 'inherit') }}>
                                                        {r.status === 'SUBMITTED' ? `${score}/${max}` : '—'}
                                                      </span>
                                                    </div>
                                                  );
                                                }}
                                              ]}
                                              rows={courseExams}
                                            />
                                          ) : (
                                            <p className="text-muted" style={{ fontSize: 'var(--fs-sm)' }}>No exams attempted yet.</p>
                                          )}
                                        </div>
                                      </div>

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
            </div>
          ))}
        </div>
      )}
      
      <Modal open={confirmModal.open} onClose={() => setConfirmModal({ open: false, type: null })} title="Preview & Publish Certificate">
        <div className="stack" style={{ gap: 'var(--sp-4)', width: '100%', minWidth: '600px' }}>
          
          {previewLoading ? (
            <div style={{ padding: 'var(--sp-8)', display: 'flex', justifyContent: 'center' }}>
              <PageLoader />
            </div>
          ) : previewPdfData ? (
            <div style={{ height: '400px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
              <object 
                data={`data:application/pdf;base64,${previewPdfData}`} 
                type="application/pdf" 
                width="100%" 
                height="100%"
              >
                <p>Preview not available. PDF failed to render.</p>
              </object>
            </div>
          ) : (
            <p>Failed to load preview.</p>
          )}

          <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)' }}>
            Please review the generated certificate above. 
            If a certificate has already been issued, clicking publish will overwrite the existing certificate and update its issue date.
          </p>

          <div className="row" style={{ justifyContent: 'flex-end', gap: 'var(--sp-2)', marginTop: 'var(--sp-4)' }}>
            <Button variant="outline" onClick={() => setConfirmModal({ open: false, type: null })}>Cancel</Button>
            <Button 
              variant="primary" 
              disabled={previewLoading || !previewPdfData}
              onClick={() => confirmModal.type === 'degree' ? handleIssueDegree(confirmModal.programId, confirmModal.batchId) : handleIssueCourseCertificate(confirmModal.courseId)}
            >
              Publish Certificate
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!viewPdfUrl} onClose={() => setViewPdfUrl(null)} title="Document Viewer" width={800}>
        {viewPdfUrl && (
          <div style={{ height: '600px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
            <object 
              data={buildStaticUrl(viewPdfUrl)} 
              type={viewPdfUrl.toLowerCase().match(/\.(jpeg|jpg|gif|png)$/) != null ? undefined : "application/pdf"}
              width="100%" 
              height="100%"
            >
              {viewPdfUrl.toLowerCase().match(/\.(jpeg|jpg|gif|png)$/) != null ? (
                <img src={buildStaticUrl(viewPdfUrl)} alt="Document Viewer" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              ) : (
                <p>Preview not available. PDF failed to render.</p>
              )}
            </object>
          </div>
        )}
      </Modal>

      {/* EDIT REGISTRATION ID MODAL */}
      <Modal
        open={regModal}
        onClose={() => setRegModal(false)}
        title="Student Registration ID / Roll Number"
      >
        <form onSubmit={handleUpdateRegistrationId} className="stack" style={{ gap: '1rem' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
              Registration ID / Roll No *
            </label>
            <input
              type="text"
              className="input"
              placeholder="e.g. 2026/ATA/0042 or REG-1049"
              value={newRegId}
              onChange={(e) => setNewRegId(e.target.value)}
              required
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', fontWeight: 700 }}
            />
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
              This registration number appears on the official academic transcript, grade sheets, and degree certificates.
            </p>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <Button variant="outline" type="button" onClick={() => setRegModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={savingReg} style={{ fontWeight: 700 }}>
              Save Registration ID
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
