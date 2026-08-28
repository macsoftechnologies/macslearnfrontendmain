import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { GraduationCap, Clock, BookOpen, Users, ClipboardList, Wallet, UserPlus, Plus, Copy, AlertTriangle, Video, Calendar, CheckSquare, Square, CheckCircle2, Trash2 } from 'lucide-react';
import Modal from '../../components/ui/Modal';
import Input, { Field, Select, Textarea } from '../../components/ui/Input';
import * as liveSessionsApi from '../../api/liveSessions';
import * as programsApi from '../../api/programs';
import * as academicBatchesApi from '../../api/academicBatches';
import * as organizationsApi from '../../api/organizations';
import { useAuth } from '../../contexts/AuthContext';
import { StatCard } from '../../components/ui/Card';
import DataTable from '../../components/ui/DataTable';
import StatusBadge from '../../components/ui/StatusBadge';
import Button from '../../components/ui/Button';
import PageLoader from '../../components/ui/PageLoader';
import * as reportsApi from '../../api/reports';
import * as studentsApi from '../../api/students';
import * as coursesApi from '../../api/courses';
import * as enrollmentsApi from '../../api/enrollments';

export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [pending, setPending] = useState([]);
  const [recentCourses, setRecentCourses] = useState([]);
  const [nearingExpiryCount, setNearingExpiryCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [liveSessions, setLiveSessions] = useState([]);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [programs, setPrograms] = useState([]);
  const [batches, setBatches] = useState([]);
  const [allCourses, setAllCourses] = useState([]);
  const [orgZoomDefault, setOrgZoomDefault] = useState('');

  const [scheduleForm, setScheduleForm] = useState({
    programId: '',
    batchId: '',
    courseId: '',
    sessionNumber: 1,
    scheduledDate: new Date().toISOString().split('T')[0],
    scheduledTime: '07:00 PM',
    meetingUrl: '',
    agenda: '',
  });
  const [savingSession, setSavingSession] = useState(false);

  // Attendance modal state
  const [attendanceModal, setAttendanceModal] = useState({
    open: false,
    session: null,
    roster: [],
    selectedStudentIds: new Set(),
    loading: false,
    saving: false,
  });

  const orgSlug = user?.organizationSlug || user?.organizationCode || localStorage.getItem('orgSlug') || '';
  const baseUrl = window.location.origin + '/macslearnfrontend';
  const loginUrl = `${baseUrl}/${orgSlug}/login`;
  const registerUrl = `${baseUrl}/${orgSlug}/register`;

  
  const openScheduleModal = () => {
    setScheduleForm({
      programId: programs[0]?.id || programs[0]?._id || '',
      batchId: batches[0]?.id || batches[0]?._id || '',
      courseId: allCourses[0]?.id || allCourses[0]?._id || '',
      sessionNumber: 1,
      scheduledDate: new Date().toISOString().split('T')[0],
      scheduledTime: '07:00 PM',
      meetingUrl: orgZoomDefault || '',
      agenda: '',
    });
    setScheduleModalOpen(true);
  };

  const handleCreateSession = async (e) => {
    e.preventDefault();
    setSavingSession(true);
    try {
      await liveSessionsApi.create(scheduleForm);
      toast.success('Live call session scheduled successfully for batch!');
      setScheduleModalOpen(false);
      const res = await liveSessionsApi.list();
      setLiveSessions(res.data?.data || res.data || res || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to schedule session');
    } finally {
      setSavingSession(false);
    }
  };

  const openAttendanceModal = async (session) => {
    setAttendanceModal({
      open: true,
      session,
      roster: [],
      selectedStudentIds: new Set(session.attendees || []),
      loading: true,
      saving: false,
    });
    try {
      const res = await liveSessionsApi.getBatchRoster(session.batchId);
      const roster = res.data?.data || res.data || res || [];
      setAttendanceModal(prev => ({
        ...prev,
        roster,
        loading: false,
      }));
    } catch (err) {
      toast.error('Failed to load batch roster');
      setAttendanceModal(prev => ({ ...prev, loading: false }));
    }
  };

  const toggleStudentAttendance = (studentId) => {
    setAttendanceModal(prev => {
      const nextSet = new Set(prev.selectedStudentIds);
      if (nextSet.has(studentId)) nextSet.delete(studentId);
      else nextSet.add(studentId);
      return { ...prev, selectedStudentIds: nextSet };
    });
  };

  const handleSaveAttendance = async () => {
    if (!attendanceModal.session) return;
    setAttendanceModal(prev => ({ ...prev, saving: true }));
    try {
      const studentIds = Array.from(attendanceModal.selectedStudentIds);
      await liveSessionsApi.markAttendance(attendanceModal.session.id, studentIds);
      toast.success(`Attendance saved! ${studentIds.length} student(s) marked present.`);
      setAttendanceModal(prev => ({ ...prev, open: false, saving: false }));
      const res = await liveSessionsApi.list();
      setLiveSessions(res.data?.data || res.data || res || []);
    } catch (err) {
      toast.error('Failed to save attendance');
      setAttendanceModal(prev => ({ ...prev, saving: false }));
    }
  };

  const handleDeleteSession = async (id) => {
    if (!window.confirm('Are you sure you want to delete this scheduled live call?')) return;
    try {
      await liveSessionsApi.remove(id);
      toast.success('Session deleted');
      setLiveSessions(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      toast.error('Failed to delete session');
    }
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} URL copied to clipboard!`);
  };

  const fetchData = async () => {
    try {
      const results = await Promise.allSettled([
        reportsApi.overview(),
        studentsApi.listPending({ page: 1, limit: 5 }),
        coursesApi.list({ page: 1, limit: 5 }),
        enrollmentsApi.list({ limit: 500 }),
        liveSessionsApi.list().catch(() => ({ data: [] })),
        programsApi.list().catch(() => ({ data: [] })),
        academicBatchesApi.list().catch(() => ({ data: [] })),
        coursesApi.list({ limit: 200 }).catch(() => ({ data: [] })),
        organizationsApi.getMe().catch(() => null),
      ]);
      if (results[0].status === 'fulfilled') setStats(results[0].value.data?.data || {});
      if (results[1].status === 'fulfilled') setPending(results[1].value.data?.data || []);
      if (results[2].status === 'fulfilled') setRecentCourses(results[2].value.data?.data || []);
      if (results[4]?.status === 'fulfilled') setLiveSessions(results[4].value.data?.data || results[4].value.data || results[4].value || []);
      if (results[5]?.status === 'fulfilled') setPrograms(results[5].value.data?.data || results[5].value.data || results[5].value || []);
      if (results[6]?.status === 'fulfilled') setBatches(results[6].value.data?.data || results[6].value.data || results[6].value || []);
      if (results[7]?.status === 'fulfilled') setAllCourses(results[7].value.data?.data || results[7].value.data || results[7].value || []);
      if (results[8]?.status === 'fulfilled') {
        const orgData = results[8].value?.data?.data || results[8].value?.data;
        const defaultZoom = orgData?.zoomConfig?.defaultMeetingUrl || '';
        setOrgZoomDefault(defaultZoom);
        setScheduleForm(f => ({ ...f, meetingUrl: f.meetingUrl || defaultZoom }));
      }
      
      if (results[3].status === 'fulfilled') {
        const list = results[3].value.data?.data || results[3].value.data || [];
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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Auto-sync when switching back to dashboard tab
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

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="page-eyebrow">Overview</span>
          <h1 className="page-title">Admin Dashboard</h1>
          <p className="page-subtitle">Everything happening in your organization, at a glance.</p>
        </div>
        <div className="row">
          <Link to="/admin/students"><Button variant="outline" icon={UserPlus} size="sm">Add Student</Button></Link>
          <Link to="/admin/faculty"><Button variant="outline" icon={UserPlus} size="sm">Add Faculty</Button></Link>
          <Button icon={Video} size="sm" onClick={openScheduleModal} style={{ background: '#2563eb', borderColor: '#1d4ed8' }}>Schedule Live Call</Button>
          <Link to="/admin/courses/create"><Button icon={Plus} size="sm">Create Course</Button></Link>
        </div>
      </div>

      <div className="grid-stats">
        <StatCard label="Total Students" value={stats?.totalStudents ?? '—'} icon={GraduationCap} tone="ink" />
        <StatCard label="Pending Approvals" value={stats?.pendingApprovals ?? pending.length} icon={Clock} tone="amber" onClick={() => navigate('/admin/students')} style={{ cursor: 'pointer' }} />
        <StatCard label="Active Courses" value={stats?.activeCourses ?? '—'} icon={BookOpen} tone="sky" onClick={() => navigate('/admin/courses')} style={{ cursor: 'pointer' }} />
        <StatCard label="Nearing Expiry (≤10d)" value={nearingExpiryCount} icon={AlertTriangle} tone={nearingExpiryCount > 0 ? "crimson" : "sage"} onClick={() => navigate('/admin/program-expiry')} style={{ cursor: 'pointer' }} />
        <StatCard label="Total Enrollments" value={stats?.totalEnrollments ?? '—'} icon={ClipboardList} tone="ink" onClick={() => navigate('/admin/enrollments')} style={{ cursor: 'pointer' }} />
      </div>

      <div className="card" style={{ marginBottom: 'var(--sp-8)', padding: 'var(--sp-5)' }}>
        <h3 style={{ margin: '0 0 var(--sp-4) 0', fontSize: 'var(--fs-sm)', color: 'var(--text-muted)' }}>Quick Share Links</h3>
        <div className="stack" style={{ gap: 'var(--sp-4)' }}>
          <div className="row" style={{ alignItems: 'center', gap: 'var(--sp-4)' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>Student Registration URL</label>
              <div style={{ padding: '10px 14px', background: 'var(--bg-surface-muted)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', fontSize: '13px', fontFamily: 'monospace', color: 'var(--text-primary)', wordBreak: 'break-all' }}>
                {registerUrl}
              </div>
            </div>
            <Button variant="outline" size="sm" icon={Copy} onClick={() => copyToClipboard(registerUrl, 'Registration')}>Copy</Button>
          </div>
          <div className="row" style={{ alignItems: 'center', gap: 'var(--sp-4)' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>Organization Login URL</label>
              <div style={{ padding: '10px 14px', background: 'var(--bg-surface-muted)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', fontSize: '13px', fontFamily: 'monospace', color: 'var(--text-primary)', wordBreak: 'break-all' }}>
                {loginUrl}
              </div>
            </div>
            <Button variant="outline" size="sm" icon={Copy} onClick={() => copyToClipboard(loginUrl, 'Login')}>Copy</Button>
          </div>
        </div>
      </div>

      <div className="stack" style={{ gap: 'var(--sp-8)' }}>
        
        <section>
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 'var(--sp-4)', alignItems: 'center' }}>
            <div>
              <h2 className="section-title" style={{ margin: 0 }}>Scheduled Batch Live Calls & Attendance (5 Calls / Subject)</h2>
              <p className="text-muted" style={{ margin: '2px 0 0', fontSize: '13px' }}>Manage batch meeting links and record student attendance</p>
            </div>
            <Button size="sm" variant="primary" icon={Video} onClick={openScheduleModal} style={{ background: '#2563eb' }}>
              Schedule Call
            </Button>
          </div>
          <DataTable
            columns={[
              { key: 'batchName', header: 'Batch / Cohort', render: (r) => <span style={{ fontWeight: 700, color: '#1e293b' }}>{r.batchName}</span> },
              { key: 'courseTitle', header: 'Subject / Course', render: (r) => <span style={{ fontWeight: 600, color: '#2563eb' }}>{r.courseTitle}</span> },
              { 
                key: 'sessionNumber', 
                header: 'Call Slot', 
                render: (r) => <span style={{ padding: '3px 8px', background: '#eff6ff', color: '#1d4ed8', borderRadius: '4px', fontWeight: 700, fontSize: '11px' }}>Call {r.sessionNumber} of 5</span> 
              },
              { 
                key: 'dateTime', 
                header: 'Scheduled Date & Time', 
                render: (r) => (
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '13px' }}>{new Date(r.scheduledDate).toLocaleDateString()}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{r.scheduledTime}</div>
                  </div>
                ) 
              },
              {
                key: 'attendees',
                header: 'Attendance',
                render: (r) => (
                  <span style={{ padding: '3px 8px', background: r.status === 'COMPLETED' ? '#dcfce7' : '#fef3c7', color: r.status === 'COMPLETED' ? '#15803d' : '#b45309', borderRadius: '4px', fontWeight: 700, fontSize: '11px' }}>
                    {r.status === 'COMPLETED' ? `${r.attendeeCount} Present (Completed)` : 'Scheduled (Pending Call)'}
                  </span>
                )
              },
              {
                key: 'actions',
                header: 'Actions',
                render: (r) => (
                  <div className="row" style={{ gap: '6px' }}>
                    <Button size="xs" variant="primary" icon={CheckSquare} onClick={() => openAttendanceModal(r)} style={{ background: '#16a34a' }}>
                      Mark Attendance
                    </Button>
                    {r.meetingUrl && (
                      <a href={r.meetingUrl} target="_blank" rel="noreferrer">
                        <Button size="xs" variant="outline" icon={Video}>Join</Button>
                      </a>
                    )}
                    <Button size="xs" variant="ghost" icon={Trash2} onClick={() => handleDeleteSession(r.id)} style={{ color: '#dc2626' }} />
                  </div>
                )
              }
            ]}
            rows={liveSessions}
            emptyLabel="No live call sessions scheduled yet. Click 'Schedule Live Call' above to create one."
          />
        </section>

        <section>
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 'var(--sp-4)' }}>
            <h2 className="section-title" style={{ margin: 0 }}>Pending Students</h2>
            <Link to="/admin/students" className="text-muted" style={{ fontSize: 'var(--fs-xs)', fontWeight: 600 }}>Review all →</Link>
          </div>
          <DataTable
            columns={[
              { key: 'fullName', header: 'Full Name' },
              { key: 'email', header: 'Email' },
              { key: 'mobile', header: 'Mobile', render: (r) => r.mobile || '—' },
              { key: 'createdAt', header: 'Registered On', render: (r) => (r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '—') },
            ]}
            rows={pending}
            emptyLabel="No pending approvals. You're all caught up."
          />
        </section>

        <section>
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 'var(--sp-4)' }}>
            <h2 className="section-title" style={{ margin: 0 }}>Recent Courses</h2>
            <Link to="/admin/courses" className="text-muted" style={{ fontSize: 'var(--fs-xs)', fontWeight: 600 }}>View all →</Link>
          </div>
          <DataTable
            columns={[
              { key: 'title', header: 'Title' },
              { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
              { key: 'price', header: 'Price', render: (r) => {
                const hasBasePrice = r.pricing?.isPaid || r.price;
                const hasRegional = r.regionalPrices?.length > 0;
                if (hasBasePrice) return r.pricing?.isPaid ? `${r.pricing.currency || 'USD'} ${r.pricing.amount}` : `$${r.price}`;
                if (hasRegional) return `${r.regionalPrices.length} Regional Price(s)`;
                return 'Free';
              }},
              { key: 'enrolledCount', header: 'Enrolled', render: (r) => r.enrolledCount ?? 0 },
            ]}
            rows={recentCourses}
            emptyLabel="No courses created yet."
          />
        </section>
      </div>

      {/* SCHEDULE LIVE CALL MODAL */}
      <Modal
        open={scheduleModalOpen}
        onClose={() => setScheduleModalOpen(false)}
        title="Schedule Live Subject Call (5 Calls Policy)"
        subtitle="Set date & time for interactive batch session"
        width={560}
      >
        <form className="stack" style={{ gap: '1.25rem' }} onSubmit={handleCreateSession}>
          <div className="form-grid">
            <Field label="Program / Degree" required>
              <Select 
                value={scheduleForm.programId} 
                onChange={(e) => setScheduleForm(f => ({ ...f, programId: e.target.value }))}
                required
              >
                <option value="">-- Select Program --</option>
                {programs.map(p => <option key={p.id || p._id} value={p.id || p._id}>{p.name}</option>)}
              </Select>
            </Field>

            <Field label="Target Batch / Cohort" required>
              <Select 
                value={scheduleForm.batchId} 
                onChange={(e) => setScheduleForm(f => ({ ...f, batchId: e.target.value }))}
                required
              >
                <option value="">-- Select Batch --</option>
                {batches
                  .filter(b => !scheduleForm.programId || b.programId === scheduleForm.programId)
                  .map(b => <option key={b.id || b._id} value={b.id || b._id}>{b.name || b.batchCode}</option>)}
              </Select>
            </Field>
          </div>

          <div className="form-grid">
            <Field label="Subject / Course" required>
              <Select 
                value={scheduleForm.courseId} 
                onChange={(e) => setScheduleForm(f => ({ ...f, courseId: e.target.value }))}
                required
              >
                <option value="">-- Select Subject --</option>
                {allCourses.map(c => <option key={c.id || c._id} value={c.id || c._id}>{c.title}</option>)}
              </Select>
            </Field>

            <Field label="Call Slot (5 Calls / Course)" required>
              <Select 
                value={scheduleForm.sessionNumber} 
                onChange={(e) => setScheduleForm(f => ({ ...f, sessionNumber: e.target.value }))}
                required
              >
                <option value="1">Call 1 of 5 (Intro & Modules 1-8)</option>
                <option value="2">Call 2 of 5 (Modules 9-16)</option>
                <option value="3">Call 3 of 5 (Modules 17-24 Midterm Review)</option>
                <option value="4">Call 4 of 5 (Modules 25-32)</option>
                <option value="5">Call 5 of 5 (Final Exam Prep & Review)</option>
              </Select>
            </Field>
          </div>

          <div className="form-grid">
            <Field label="Scheduled Date" required>
              <Input 
                type="date" 
                value={scheduleForm.scheduledDate} 
                onChange={(e) => setScheduleForm(f => ({ ...f, scheduledDate: e.target.value }))}
                required 
              />
            </Field>

            <Field label="Scheduled Time" required>
              <Input 
                type="text" 
                placeholder="e.g. 07:00 PM IST"
                value={scheduleForm.scheduledTime} 
                onChange={(e) => setScheduleForm(f => ({ ...f, scheduledTime: e.target.value }))}
                required 
              />
            </Field>
          </div>

          <Field label="Zoom / Meeting URL">
            <Input 
              type="url" 
              placeholder="https://zoom.us/j/..."
              value={scheduleForm.meetingUrl} 
              onChange={(e) => setScheduleForm(f => ({ ...f, meetingUrl: e.target.value }))}
            />
          </Field>

          <Field label="Session Agenda / Discussion Topic">
            <Textarea 
              rows={2}
              placeholder="e.g. Syllabus Q&A, Case study analysis..."
              value={scheduleForm.agenda} 
              onChange={(e) => setScheduleForm(f => ({ ...f, agenda: e.target.value }))}
            />
          </Field>

          <div className="row" style={{ justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <Button type="button" variant="outline" onClick={() => setScheduleModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" loading={savingSession}>Schedule Call for Batch</Button>
          </div>
        </form>
      </Modal>

      {/* MARK ATTENDANCE MODAL */}
      <Modal
        open={attendanceModal.open}
        onClose={() => setAttendanceModal(prev => ({ ...prev, open: false }))}
        title={'Batch Attendance Roster — ' + (attendanceModal.session?.courseTitle || 'Live Call')}
        subtitle={`Call ${attendanceModal.session?.sessionNumber || 1} of 5 • ${attendanceModal.session?.batchName || ''}`}
        width={600}
      >
        {attendanceModal.loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading batch students...</div>
        ) : (
          <div className="stack" style={{ gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                Total Students in Batch: <strong>{attendanceModal.roster.length}</strong> | Marked Present: <strong>{attendanceModal.selectedStudentIds.size}</strong>
              </span>
              <div className="row" style={{ gap: '8px' }}>
                <Button 
                  size="xs" 
                  variant="outline" 
                  onClick={() => setAttendanceModal(prev => ({ ...prev, selectedStudentIds: new Set(prev.roster.map(s => s.id)) }))}
                >
                  Select All
                </Button>
                <Button 
                  size="xs" 
                  variant="ghost" 
                  onClick={() => setAttendanceModal(prev => ({ ...prev, selectedStudentIds: new Set() }))}
                >
                  Clear
                </Button>
              </div>
            </div>

            {attendanceModal.roster.length === 0 ? (
              <p className="text-muted" style={{ padding: '1rem', textAlign: 'center' }}>No students enrolled in this batch.</p>
            ) : (
              <div style={{ maxHeight: 320, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '4px' }}>
                {attendanceModal.roster.map(student => {
                  const isPresent = attendanceModal.selectedStudentIds.has(student.id);
                  return (
                    <div 
                      key={student.id}
                      onClick={() => toggleStudentAttendance(student.id)}
                      style={{ 
                        padding: '10px 14px', 
                        borderRadius: '6px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        background: isPresent ? '#f0fdf4' : 'transparent',
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background 0.15s'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ color: isPresent ? '#16a34a' : '#cbd5e1' }}>
                          {isPresent ? <CheckSquare size={18} /> : <Square size={18} />}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '13px', color: isPresent ? '#15803d' : '#1e293b' }}>
                            {student.fullName}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>{student.email}</div>
                        </div>
                      </div>
                      <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, background: isPresent ? '#dcfce7' : '#f1f5f9', color: isPresent ? '#15803d' : '#94a3b8' }}>
                        {isPresent ? 'PRESENT' : 'ABSENT'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="row" style={{ justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <Button variant="outline" onClick={() => setAttendanceModal(prev => ({ ...prev, open: false }))}>Cancel</Button>
              <Button variant="primary" loading={attendanceModal.saving} onClick={handleSaveAttendance} style={{ background: '#16a34a', borderColor: '#15803d' }}>
                Save Attendance ({attendanceModal.selectedStudentIds.size} Present)
              </Button>
            </div>
          </div>
        )}
      </Modal>

    </div >
  );
}
